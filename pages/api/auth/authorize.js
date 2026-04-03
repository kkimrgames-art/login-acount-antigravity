export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkId } = req.query;

  if (!linkId) {
    return res.status(400).json({ error: 'Missing linkId' });
  }

  // Build Antigravity OAuth URL
  const params = new URLSearchParams({
    client_id: process.env.ANTIGRAVITY_CLIENT_ID,
    redirect_uri: process.env.ANTIGRAVITY_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/cclog https://www.googleapis.com/auth/experimentsandconfigs',
    access_type: 'offline',
    prompt: 'consent',
    state: linkId, // Pass linkId as state
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.redirect(authUrl);
}
