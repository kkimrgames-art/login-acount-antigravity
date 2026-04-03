import { checkSupabaseHealth } from '@/lib/supabase';

// Keep-alive mechanism to prevent Render from sleeping
let keepAliveInterval = null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Check Supabase connection
    const supabaseHealthy = await Promise.race([
      checkSupabaseHealth(),
      new Promise((resolve) => setTimeout(() => resolve(false), 5000))
    ]);
    
    const responseTime = Date.now() - startTime;
    
    // Start keep-alive if not already running
    if (!keepAliveInterval && process.env.NODE_ENV === 'production') {
      keepAliveInterval = setInterval(() => {
        // Self-ping every 10 minutes to prevent sleep
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health`)
          .catch(() => {}); // Ignore errors
      }, 10 * 60 * 1000);
    }
    
    const health = {
      status: supabaseHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'antigravity-auth-manager',
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      checks: {
        supabase: supabaseHealthy ? 'ok' : 'degraded',
        memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? 'ok' : 'warning'
      }
    };
    
    res.status(supabaseHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'antigravity-auth-manager',
      version: '1.0.0',
      error: error.message
    });
  }
}
