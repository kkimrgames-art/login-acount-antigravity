// Rate limiting middleware
const rateLimitStore = new Map();

export function rateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 10, // max requests per window
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => {
      // Use IP or a combination of IP and user agent
      const forwarded = req.headers['x-forwarded-for'];
      const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
      return ip;
    }
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now - v.resetTime > windowMs) {
        rateLimitStore.delete(k);
      }
    }

    const record = rateLimitStore.get(key);
    
    if (!record) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now
      });
      return next ? next() : true;
    }

    if (now - record.resetTime > windowMs) {
      record.count = 1;
      record.resetTime = now;
      return next ? next() : true;
    }

    if (record.count >= max) {
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((record.resetTime + windowMs - now) / 1000)
      });
      return false;
    }

    record.count++;
    return next ? next() : true;
  };
}

// IP whitelist/blacklist
const blacklistedIPs = new Set();
const whitelistedIPs = new Set();

export function checkIPBlacklist(req, res, next) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
  
  if (blacklistedIPs.has(ip)) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }
  
  return next ? next() : true;
}

// Request validation
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      if (schema.body && req.method !== 'GET') {
        const body = req.body;
        for (const [key, validator] of Object.entries(schema.body)) {
          if (validator.required && !body[key]) {
            res.status(400).json({ error: `Missing required field: ${key}` });
            return false;
          }
          if (body[key] && validator.type && typeof body[key] !== validator.type) {
            res.status(400).json({ error: `Invalid type for field: ${key}` });
            return false;
          }
          if (body[key] && validator.maxLength && body[key].length > validator.maxLength) {
            res.status(400).json({ error: `Field ${key} exceeds maximum length` });
            return false;
          }
        }
      }
      
      if (schema.query) {
        const query = req.query;
        for (const [key, validator] of Object.entries(schema.query)) {
          if (validator.required && !query[key]) {
            res.status(400).json({ error: `Missing required query parameter: ${key}` });
            return false;
          }
        }
      }
      
      return next ? next() : true;
    } catch (error) {
      res.status(400).json({ error: 'Invalid request format' });
      return false;
    }
  };
}

// CSRF protection
export function csrfProtection(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next ? next() : true;
  }
  
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://accounts.google.com'
  ];
  
  if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    res.status(403).json({ error: 'Invalid origin' });
    return false;
  }
  
  return next ? next() : true;
}

// SQL injection prevention
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potential SQL injection patterns
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

// XSS prevention
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Error logger with rate limiting to prevent log flooding
const errorLogCache = new Map();
const ERROR_LOG_WINDOW = 60000; // 1 minute
const MAX_SAME_ERRORS = 5;

export function logError(error, context = {}) {
  const errorKey = `${error.message}-${error.stack?.split('\n')[0]}`;
  const now = Date.now();
  
  const cached = errorLogCache.get(errorKey);
  if (cached && now - cached.lastLog < ERROR_LOG_WINDOW) {
    cached.count++;
    if (cached.count <= MAX_SAME_ERRORS) {
      console.error(`[${new Date().toISOString()}] Error (${cached.count}x):`, {
        message: error.message,
        context,
        stack: error.stack
      });
    } else if (cached.count === MAX_SAME_ERRORS + 1) {
      console.error(`[${new Date().toISOString()}] Error repeated too many times, suppressing further logs for this error`);
    }
  } else {
    errorLogCache.set(errorKey, { count: 1, lastLog: now });
    console.error(`[${new Date().toISOString()}] Error:`, {
      message: error.message,
      context,
      stack: error.stack
    });
  }
  
  // Clean old cache entries
  for (const [key, value] of errorLogCache.entries()) {
    if (now - value.lastLog > ERROR_LOG_WINDOW) {
      errorLogCache.delete(key);
    }
  }
}

// Retry logic with exponential backoff
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(factor, i), maxDelay);
        
        if (onRetry) {
          onRetry(error, i + 1, delay);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Circuit breaker pattern
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

export const supabaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000
});

export const telegramCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000
});
