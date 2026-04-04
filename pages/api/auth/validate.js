import { supabaseAdmin } from '@/lib/supabase';
import { 
  rateLimit, 
  checkIPBlacklist,
  logError,
  retryWithBackoff,
  supabaseCircuitBreaker
} from '@/lib/security';

const limiter = rateLimit({
  windowMs: 60000,
  max: 20,
  message: 'Too many validation requests'
});

export default async function handler(req, res) {
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  // Admin Supabase client is required to validate auth links
  if (!supabaseAdmin) {
    logError(new Error('SUPABASE_SERVICE_KEY is not configured'), { context: 'startup', endpoint: 'validate-link' });
    return res.status(503).json({ error: 'Server misconfigured' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkId } = req.query;

  if (!linkId) {
    return res.status(400).json({ error: 'Missing linkId' });
  }

  // Validate linkId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(linkId)) {
    return res.status(400).json({ error: 'Invalid linkId format' });
  }

  try {
    const validateLink = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        const { data: linkData, error: linkError } = await supabaseAdmin
          .from('auth_links')
          .select('*')
          .eq('link_id', linkId)
          .single();

        if (linkError) throw linkError;
        return linkData;
      });
    };

    const linkData = await retryWithBackoff(validateLink, {
      maxRetries: 2,
      initialDelay: 500
    });

    if (!linkData) {
      return res.status(404).json({ error: 'رابط غير صالح' });
    }

    // Check if link is expired
    if (new Date(linkData.expires_at) < new Date()) {
      return res.status(410).json({ error: 'انتهت صلاحية الرابط' });
    }

    // Check if link is already used
    if (linkData.used) {
      return res.status(410).json({ error: 'تم استخدام هذا الرابط من قبل' });
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    logError(error, { context: 'validate-link', linkId });
    
    if (error.message === 'Circuit breaker is OPEN') {
      return res.status(503).json({ 
        error: 'الخدمة مشغولة حالياً',
        retryAfter: 30
      });
    }
    
    res.status(500).json({ error: 'خطأ في التحقق من الرابط' });
  }
}
