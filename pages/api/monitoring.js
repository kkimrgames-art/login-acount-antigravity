import { monitor, checkMemoryUsage, trackError } from '@/lib/monitoring';
import { rateLimit, checkIPBlacklist } from '@/lib/security';

const limiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: 'Too many monitoring requests'
});

export default async function handler(req, res) {
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metrics = monitor.getMetrics();
    const alerts = monitor.getAlerts();
    const memory = checkMemoryUsage();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      alerts,
      memory,
      uptime: process.uptime(),
      nodeVersion: process.version
    });
  } catch (error) {
    trackError('monitoring', error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
}
