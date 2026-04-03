import { supabaseAdmin } from '@/lib/supabase';
import { 
  rateLimit, 
  checkIPBlacklist, 
  validateRequest,
  logError,
  retryWithBackoff,
  supabaseCircuitBreaker
} from '@/lib/security';

// Rate limiter: 5 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة'
});

export default async function handler(req, res) {
  // Security checks
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate request
  const validation = validateRequest({
    body: {
      chatId: { required: true, type: 'number' }
    }
  });
  
  if (!validation(req, res)) return;

  try {
    const { chatId } = req.body;

    // Validate chatId is a valid Telegram ID
    if (chatId <= 0 || chatId > 9999999999) {
      return res.status(400).json({ error: 'Invalid chatId format' });
    }

    // Generate unique link ID with crypto-random UUID
    const crypto = require('crypto');
    const linkId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store in database with retry logic
    const insertLink = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        const { data, error } = await supabaseAdmin
          .from('auth_links')
          .insert({
            link_id: linkId,
            created_by_chat_id: chatId,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    };

    await retryWithBackoff(insertLink, {
      maxRetries: 3,
      initialDelay: 1000,
      onRetry: (error, attempt, delay) => {
        logError(error, { 
          context: 'create-link', 
          attempt, 
          chatId,
          retryDelay: delay 
        });
      }
    });

    const link = `${process.env.NEXT_PUBLIC_APP_URL}/auth/${linkId}`;

    res.status(200).json({
      success: true,
      link,
      linkId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logError(error, { context: 'create-link', chatId: req.body.chatId });
    
    // Return user-friendly error
    if (error.message === 'Circuit breaker is OPEN') {
      return res.status(503).json({ 
        error: 'الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل',
        retryAfter: 30
      });
    }
    
    res.status(500).json({ 
      error: 'فشل في إنشاء الرابط. يرجى المحاولة مرة أخرى' 
    });
  }
}
