// Monitoring and alerting utilities

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }

  recordMetric(name, value, tags = {}) {
    const key = `${name}-${JSON.stringify(tags)}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        name,
        tags,
        values: [],
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity
      });
    }

    const metric = this.metrics.get(key);
    metric.values.push({ value, timestamp: Date.now() });
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);

    // Keep only last 1000 values
    if (metric.values.length > 1000) {
      metric.values.shift();
    }

    // Check for anomalies
    this.checkAnomalies(metric);
  }

  checkAnomalies(metric) {
    if (metric.count < 10) return;

    const avg = metric.sum / metric.count;
    const recent = metric.values.slice(-10);
    const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;

    // Alert if recent average is 3x higher than overall average
    if (recentAvg > avg * 3) {
      this.addAlert({
        type: 'performance_degradation',
        metric: metric.name,
        message: `${metric.name} is ${(recentAvg / avg).toFixed(2)}x higher than average`,
        severity: 'warning',
        timestamp: Date.now()
      });
    }
  }

  addAlert(alert) {
    this.alerts.push(alert);
    console.warn(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  getMetrics() {
    const result = {};
    
    for (const [key, metric] of this.metrics.entries()) {
      result[key] = {
        name: metric.name,
        tags: metric.tags,
        count: metric.count,
        avg: metric.sum / metric.count,
        min: metric.min,
        max: metric.max
      };
    }

    return result;
  }

  getAlerts() {
    return this.alerts;
  }

  reset() {
    this.metrics.clear();
    this.alerts = [];
  }
}

export const monitor = new PerformanceMonitor();

// Middleware to track request performance
export function trackPerformance(handler, name) {
  return async (req, res) => {
    const startTime = Date.now();
    
    try {
      const result = await handler(req, res);
      const duration = Date.now() - startTime;
      
      monitor.recordMetric('request_duration', duration, {
        endpoint: name,
        method: req.method,
        status: res.statusCode
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      monitor.recordMetric('request_duration', duration, {
        endpoint: name,
        method: req.method,
        status: 500,
        error: true
      });
      
      throw error;
    }
  };
}

// Memory monitoring
export function checkMemoryUsage() {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  
  monitor.recordMetric('memory_heap_used', heapUsedMB);
  monitor.recordMetric('memory_heap_total', heapTotalMB);
  
  // Alert if memory usage is high
  if (heapUsedMB > 400) {
    monitor.addAlert({
      type: 'high_memory_usage',
      message: `Heap memory usage is ${heapUsedMB.toFixed(2)}MB`,
      severity: 'warning',
      timestamp: Date.now()
    });
  }
  
  return {
    heapUsed: heapUsedMB,
    heapTotal: heapTotalMB,
    percentage: (heapUsedMB / heapTotalMB * 100).toFixed(2)
  };
}

// Start memory monitoring
if (typeof window === 'undefined') {
  setInterval(() => {
    checkMemoryUsage();
  }, 60000); // Every minute
}

// Error rate tracking
const errorCounts = new Map();

export function trackError(endpoint, error) {
  const key = `${endpoint}-${error.message}`;
  const count = (errorCounts.get(key) || 0) + 1;
  errorCounts.set(key, count);
  
  monitor.recordMetric('error_count', 1, {
    endpoint,
    error: error.message
  });
  
  // Alert if error rate is high
  if (count > 10) {
    monitor.addAlert({
      type: 'high_error_rate',
      message: `${endpoint} has ${count} errors: ${error.message}`,
      severity: 'critical',
      timestamp: Date.now()
    });
  }
}

// Clean old error counts every hour
setInterval(() => {
  errorCounts.clear();
}, 3600000);
