import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { checkIPBlacklist, rateLimit, logError, sanitizeInput } from '@/lib/security';

const limiter = rateLimit({
  windowMs: 60000,
  max: 20,
  message: 'Too many authorization attempts'
});

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest();
}

export default async function handler(req, res) {
  if (!checkIPBlacklist(req, res)) return;
  if (!limiter(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkId } = req.query;
  const sanitizedLinkId = sanitizeInput(linkId);

  if (!sanitizedLinkId) {
    return res.status(400).json({ error: 'Missing linkId' });
  }

  if (!supabaseAdmin) {
    logError(new Error('SUPABASE_SERVICE_KEY is not configured'), { context: 'startup', endpoint: 'gpt-authorize' });
    return res.redirect(`/auth/${sanitizedLinkId}?error=server_misconfigured`);
  }

  const missingEnv = [];
  if (!process.env.OPENAI_CLIENT_ID) missingEnv.push('OPENAI_CLIENT_ID');
  if (missingEnv.length) {
    logError(new Error('Missing required OAuth environment variables'), { context: 'oauth-env', endpoint: 'gpt-authorize', missing: missingEnv, linkId: sanitizedLinkId });
    return res.redirect(`/auth/${sanitizedLinkId}?error=server_misconfigured`);
  }

  try {
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(sha256(codeVerifier));

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.headers.host;
    const proto = forwardedProto || 'https';
    const origin = `${proto}://${host}`;
    const redirectUri = process.env.OPENAI_REDIRECT_URI || `${origin}/api/gpt/callback`;

    const { error: sessionError } = await supabaseAdmin
      .from('oauth_sessions')
      .upsert({
        provider: 'openai',
        link_id: sanitizedLinkId,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        expires_at: expiresAt,
        used: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider,link_id' });

    if (sessionError) throw sessionError;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.OPENAI_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: sanitizedLinkId,
      id_token_add_organizations: 'true',
      codex_cli_simplified_flow: 'true',
      originator: 'codex_cli_rs',
    });

    const authUrl = `https://auth.openai.com/oauth/authorize?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (error) {
    logError(error, { context: 'gpt-authorize', linkId: sanitizedLinkId });
    return res.redirect(`/auth/${sanitizedLinkId}?error=server_error`);
  }
}
