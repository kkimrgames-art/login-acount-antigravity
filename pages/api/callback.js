import { supabaseAdmin } from '@/lib/supabase';
import { 
  rateLimit, 
  checkIPBlacklist,
  validateRequest,
  sanitizeInput,
  logError,
  retryWithBackoff,
  supabaseCircuitBreaker
} from '@/lib/security';

// Stricter rate limit for callback: 10 per minute per IP
const limiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: 'Too many authentication attempts'
});

function classifySupabaseError(err) {
  const msg = (err?.message || String(err || '')).toLowerCase();
  const code = (err?.code || err?.details || '').toString().toLowerCase();

  // PostgREST "single()" errors
  // PGRST116: "JSON object requested, multiple (or no) rows returned"
  if (code.includes('pgrst116') || msg.includes('pgrst116')) {
    return 'invalid_link';
  }

  if (
    msg.includes('json object requested') ||
    msg.includes('multiple (or no) rows returned') ||
    msg.includes('results contain 0 rows')
  ) {
    return 'invalid_link';
  }

  if (msg.includes('permission denied') || msg.includes('row level security') || msg.includes('rls')) {
    return 'db_permission_denied';
  }

  if (code.includes('42501') || msg.includes('42501')) {
    return 'db_permission_denied';
  }

  if (msg.includes('invalid api key') || msg.includes('jwt')) {
    return 'db_invalid_key';
  }

  if (msg.includes('failed to fetch') || msg.includes('enotfound') || msg.includes('econnrefused') || msg.includes('timeout')) {
    return 'db_network_error';
  }

  return null;
}

export default async function handler(req, res) {
  // Security checks
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  // Hard requirement: admin Supabase client must exist for link validation + account storage
  if (!supabaseAdmin) {
    logError(new Error('SUPABASE_SERVICE_KEY is not configured'), { context: 'startup', endpoint: 'callback' });
    const linkId = typeof req.query?.state === 'string' ? req.query.state : 'invalid';
    return res.redirect(`/auth/${sanitizeInput(linkId) || 'invalid'}?error=server_misconfigured`);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state: linkId, error: oauthError } = req.query;

  // Sanitize inputs
  const sanitizedLinkId = sanitizeInput(linkId);
  const sanitizedCode = sanitizeInput(code);

  // Validate required OAuth env vars (misconfiguration should be explicit)
  const missingEnv = [];
  if (!process.env.ANTIGRAVITY_CLIENT_ID) missingEnv.push('ANTIGRAVITY_CLIENT_ID');
  if (!process.env.ANTIGRAVITY_CLIENT_SECRET) missingEnv.push('ANTIGRAVITY_CLIENT_SECRET');
  if (!process.env.ANTIGRAVITY_REDIRECT_URI) missingEnv.push('ANTIGRAVITY_REDIRECT_URI');
  if (missingEnv.length) {
    logError(new Error('Missing required OAuth environment variables'), {
      context: 'oauth-env',
      endpoint: 'callback',
      missing: missingEnv,
      linkId: sanitizedLinkId,
    });
    return res.redirect(`/auth/${sanitizedLinkId || 'invalid'}?error=server_misconfigured`);
  }

  if (oauthError) {
    logError(new Error(`OAuth error: ${oauthError}`), { linkId: sanitizedLinkId });
    return res.redirect(`/auth/${sanitizedLinkId}?error=${encodeURIComponent(oauthError)}`);
  }

  if (!sanitizedCode || !sanitizedLinkId) {
    return res.redirect(`/auth/${sanitizedLinkId || 'invalid'}?error=missing_params`);
  }

  // Validate linkId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitizedLinkId)) {
    return res.redirect(`/auth/invalid?error=invalid_link_format`);
  }

  try {
    // Validate link with retry
    const validateLink = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        const { data: linkData, error: linkError } = await supabaseAdmin
          .from('auth_links')
          .select('*')
          .eq('link_id', sanitizedLinkId)
          .single();

        if (linkError) throw linkError;
        return linkData;
      });
    };

    const linkData = await retryWithBackoff(validateLink, {
      maxRetries: 3,
      initialDelay: 500
    });

    if (!linkData) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=invalid_link`);
    }

    // Check if link is expired
    if (new Date(linkData.expires_at) < new Date()) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=link_expired`);
    }

    // Check if link is already used
    if (linkData.used) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=link_already_used`);
    }

    // Exchange code for tokens with timeout
    const tokenResponse = await Promise.race([
      fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: sanitizedCode,
          client_id: process.env.ANTIGRAVITY_CLIENT_ID,
          client_secret: process.env.ANTIGRAVITY_CLIENT_SECRET,
          redirect_uri: process.env.ANTIGRAVITY_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token exchange timeout')), 10000)
      )
    ]);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logError(new Error('Token exchange failed'), { 
        context: 'token-exchange',
        linkId: sanitizedLinkId,
        status: tokenResponse.status,
        error: errorData.substring(0, 200)
      });
      return res.redirect(`/auth/${sanitizedLinkId}?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Validate tokens
    if (!tokens.access_token || !tokens.refresh_token) {
      logError(new Error('Invalid tokens received'), { context: 'token-validate', linkId: sanitizedLinkId, hasAccess: !!tokens.access_token, hasRefresh: !!tokens.refresh_token });
      return res.redirect(`/auth/${sanitizedLinkId}?error=invalid_tokens`);
    }

    // Get user info with timeout
    const userInfoResponse = await Promise.race([
      fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User info timeout')), 10000)
      )
    ]);

    if (!userInfoResponse.ok) {
      logError(new Error('Failed to get user information'), { context: 'userinfo', linkId: sanitizedLinkId, status: userInfoResponse.status });
      return res.redirect(`/auth/${sanitizedLinkId}?error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();

    // Validate email
    if (!userInfo.email || !userInfo.email.includes('@')) {
      logError(new Error('Invalid email in user info'), { context: 'userinfo-validate', linkId: sanitizedLinkId });
      return res.redirect(`/auth/${sanitizedLinkId}?error=invalid_email`);
    }

    // Calculate expiration (same as 9router format)
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // Get IP address for logging
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;

    // Store account in database with 9router-compatible format
    const storeAccount = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        // First, mark link as used
        const { error: updateError } = await supabaseAdmin
          .from('auth_links')
          .update({
            used: true,
            used_at: new Date().toISOString(),
            used_by_ip: ipAddress
          })
          .eq('link_id', sanitizedLinkId)
          .eq('used', false); // Ensure it wasn't used by another request

        if (updateError) throw updateError;

        // Then store the account in 9router-compatible format
        const accountData = {
          email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          scope: tokens.scope || 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/cclog https://www.googleapis.com/auth/experimentsandconfigs',
          project_id: '', // Will be filled by 9router
          updated_at: new Date().toISOString(),
          last_login_ip: ipAddress,
          // Additional fields for 9router compatibility
          expires_in: tokens.expires_in || 3599,
          token_type: tokens.token_type || 'Bearer'
        };

        const { error: insertError } = await supabaseAdmin
          .from('antigravity_accounts')
          .upsert(accountData, {
            onConflict: 'email',
          });

        if (insertError) throw insertError;

        // Log successful authentication
        try {
          await supabaseAdmin.rpc('log_audit_event', {
            p_event_type: 'account_registered',
            p_user_email: userInfo.email,
            p_ip_address: ipAddress,
            p_success: true,
            p_metadata: { link_id: sanitizedLinkId }
          });
        } catch (auditError) {
          // Ignore audit log errors as they are not critical to the auth flow
          console.warn('Audit log failed:', auditError.message);
        }
      });
    };

    await retryWithBackoff(storeAccount, {
      maxRetries: 3,
      initialDelay: 1000,
      onRetry: (error, attempt) => {
        logError(error, { 
          context: 'store-account', 
          attempt,
          email: userInfo.email 
        });
      }
    });

    // Redirect to success page
    res.redirect(`/auth/${sanitizedLinkId}?success=true&email=${encodeURIComponent(userInfo.email)}`);
  } catch (error) {
    const errorMsg = error?.message || 'Unknown server error';
    logError(error, {
      context: 'oauth-callback',
      linkId: sanitizedLinkId,
      errCode: error?.code,
      errHint: error?.hint,
      errDetails: error?.details,
      errStatus: error?.status,
      errName: error?.name,
    });
    
    if (error.message === 'Circuit breaker is OPEN') {
      return res.redirect(`/auth/${sanitizedLinkId}?error=service_busy`);
    }
    
    if (error.message.includes('timeout')) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=timeout`);
    }

    const classified = classifySupabaseError(error);
    if (classified) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=${classified}&error_description=${encodeURIComponent(errorMsg)}`);
    }

    res.redirect(`/auth/${sanitizedLinkId}?error=server_error&error_description=${encodeURIComponent(errorMsg)}`);
  }
}
