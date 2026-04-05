import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, checkIPBlacklist, sanitizeInput, logError, retryWithBackoff, supabaseCircuitBreaker } from '@/lib/security';

const limiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: 'Too many authentication attempts'
});

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(b64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

export default async function handler(req, res) {
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state: linkId, error: oauthError } = req.query;
  const sanitizedLinkId = sanitizeInput(linkId);
  const sanitizedCode = sanitizeInput(code);

  if (!supabaseAdmin) {
    logError(new Error('SUPABASE_SERVICE_KEY is not configured'), { context: 'startup', endpoint: 'gpt-callback' });
    return res.redirect(`/auth/${sanitizedLinkId || 'invalid'}?error=server_misconfigured`);
  }

  const clientId = process.env.OPENAI_CLIENT_ID || 'app_EMoamEEZ73f0CkXaXp7hrann';
  const clientSecret = process.env.OPENAI_CLIENT_SECRET;
  const redirectUriManual = process.env.OPENAI_REDIRECT_URI;

  if (!clientId) {
    logError(new Error('OPENAI_CLIENT_ID is not configured'), { context: 'oauth-env', endpoint: 'gpt-callback', linkId: sanitizedLinkId });
    return res.redirect(`/auth/${sanitizedLinkId || 'invalid'}?error=server_misconfigured`);
  }

  if (oauthError) {
    logError(new Error(`OAuth error: ${oauthError}`), { context: 'oauth-provider', linkId: sanitizedLinkId });
    return res.redirect(`/auth/${sanitizedLinkId || 'invalid'}?error=${encodeURIComponent(oauthError)}`);
  }

  if (!sanitizedCode || !sanitizedLinkId) {
    return res.redirect(`/auth/${sanitizedLinkId || 'invalid'}?error=missing_params`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitizedLinkId)) {
    return res.redirect(`/auth/invalid?error=invalid_link_format`);
  }

  try {
    const loadSession = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        const { data, error } = await supabaseAdmin
          .from('oauth_sessions')
          .select('*')
          .eq('provider', 'openai')
          .eq('link_id', sanitizedLinkId)
          .single();
        if (error) throw error;
        return data;
      });
    };

    const session = await retryWithBackoff(loadSession, { maxRetries: 3, initialDelay: 500 });

    if (!session || !session.code_verifier) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=missing_oauth_session`);
    }

    if (session.used) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=link_already_used`);
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=link_expired`);
    }

    const redirectUri = session.redirect_uri || redirectUriManual;
    if (!redirectUri) {
      logError(new Error('Missing redirect URI for token exchange'), { context: 'token-exchange', linkId: sanitizedLinkId });
      return res.redirect(`/auth/${sanitizedLinkId}?error=server_misconfigured`);
    }

    const tokenResponse = await Promise.race([
      fetch('https://auth.openai.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
          code: sanitizedCode,
          redirect_uri: redirectUri,
          code_verifier: session.code_verifier,
        }),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Token exchange timeout')), 10000)),
    ]);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logError(new Error('Token exchange failed'), { context: 'token-exchange', linkId: sanitizedLinkId, status: tokenResponse.status, error: errorText.substring(0, 200) });
      return res.redirect(`/auth/${sanitizedLinkId}?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      logError(new Error('Invalid tokens received'), { context: 'token-validate', linkId: sanitizedLinkId });
      return res.redirect(`/auth/${sanitizedLinkId}?error=invalid_tokens`);
    }

    let email = '';
    if (tokens.id_token) {
      try {
        const payload = decodeJwtPayload(tokens.id_token);
        email = payload?.email || '';
      } catch (e) {
        logError(e, { context: 'id-token-decode', linkId: sanitizedLinkId });
      }
    }

    if (!email || !email.includes('@')) {
      email = `openai_${sanitizedLinkId}@local.invalid`;
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;

    const store = async () => {
      return await supabaseCircuitBreaker.execute(async () => {
        const { error: markUsedError } = await supabaseAdmin
          .from('oauth_sessions')
          .update({ used: true, used_at: new Date().toISOString(), used_by_ip: ipAddress })
          .eq('provider', 'openai')
          .eq('link_id', sanitizedLinkId)
          .eq('used', false);

        if (markUsedError) throw markUsedError;

        const accountData = {
          email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          id_token: tokens.id_token || null,
          expires_at: expiresAt.toISOString(),
          scope: tokens.scope || 'openid profile email offline_access',
          expires_in: tokens.expires_in || 3599,
          token_type: tokens.token_type || 'Bearer',
          updated_at: new Date().toISOString(),
          last_login_ip: ipAddress,
          synced_to_local: false,
        };

        const { error: upsertError } = await supabaseAdmin
          .from('codex_accounts')
          .upsert(accountData, { onConflict: 'email' });

        if (upsertError) throw upsertError;

        try {
          await supabaseAdmin.rpc('log_audit_event', {
            p_event_type: 'codex_account_registered',
            p_user_email: email,
            p_ip_address: ipAddress,
            p_success: true,
            p_metadata: { link_id: sanitizedLinkId }
          });
        } catch (auditError) {
          // Ignore audit log errors
          console.warn('Audit log failed:', auditError.message);
        }
      });
    };

    await retryWithBackoff(store, {
      maxRetries: 3,
      initialDelay: 1000,
      onRetry: (error, attempt) => {
        logError(error, { context: 'store-account', attempt, email, linkId: sanitizedLinkId });
      }
    });

    return res.redirect(`/auth/${sanitizedLinkId}?success=true&email=${encodeURIComponent(email)}`);
  } catch (error) {
    const errorMsg = error?.message || 'Unknown server error';
    logError(error, { context: 'gpt-callback', linkId: sanitizedLinkId });

    if (error.message === 'Circuit breaker is OPEN') {
      return res.redirect(`/auth/${sanitizedLinkId}?error=service_busy`);
    }

    if (error.message.includes('timeout')) {
      return res.redirect(`/auth/${sanitizedLinkId}?error=timeout`);
    }

    return res.redirect(`/auth/${sanitizedLinkId}?error=server_error&error_description=${encodeURIComponent(errorMsg)}`);
  }
}
