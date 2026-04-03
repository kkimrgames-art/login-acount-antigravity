import { initBot } from '@/lib/telegram';

export default function handler(req, res) {
  // Allow both GET and POST for easier initialization
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initBot();
    res.status(200).json({ success: true, message: 'Bot initialized successfully' });
  } catch (error) {
    console.error('Error initializing bot:', error);
    res.status(500).json({ error: error.message });
  }
}
