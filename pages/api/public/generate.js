import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, checkIPBlacklist, logError, supabaseCircuitBreaker, retryWithBackoff } from '@/lib/security';
import crypto from 'crypto';

// Rate limit for public generation: 3 requests per IP per hour to prevent spam
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many requests. Please try again later.'
});

export default async function handler(req, res) {
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const linkId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiry for public links

    const generatePublicLink = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        const { data, error } = await supabaseAdmin
          .from('auth_links')
          .insert({
            link_id: linkId,
            created_by_chat_id: 0, // 0 indicates a public web generation
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    };

    await retryWithBackoff(generatePublicLink, {
      maxRetries: 3,
      initialDelay: 1000
    });

    res.status(200).json({
      success: true,
      linkId: linkId
    });

  } catch (error) {
    logError(error, { context: 'public-generate-link' });
    res.status(500).json({ error: 'Failed to generate link. Please try again.' });
  }
}
