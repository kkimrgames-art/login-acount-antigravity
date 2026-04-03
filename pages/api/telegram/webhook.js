import { getBot } from '@/lib/telegram';
import { rateLimit, checkIPBlacklist, logError } from '@/lib/security';

// Webhook endpoint for Telegram (more reliable than polling on Render)
const limiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: 'Too many webhook requests'
});

export default async function handler(req, res) {
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bot = getBot();
    
    if (!bot) {
      return res.status(503).json({ error: 'Bot not initialized' });
    }

    // Verify webhook is from Telegram
    const telegramIPs = [
      '149.154.160.0/20',
      '91.108.4.0/22'
    ];
    
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    
    // Process update
    await bot.processUpdate(req.body);
    
    res.status(200).json({ ok: true });
  } catch (error) {
    logError(error, { context: 'telegram-webhook' });
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
