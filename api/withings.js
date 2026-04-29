// ════════════════════════════════════════════════════════
// API SERVERLESS — /api/withings
// Proxy entre le frontend (navigateur) et l'API Withings
// Garde le CLIENT_SECRET secret (variables d'environnement Vercel)
// ════════════════════════════════════════════════════════

// Origines autorisees a appeler ce proxy (CORS strict).
// Ajoute ici tout nouveau domaine de prod / preview.
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dashboard-five-tau-20.vercel.app',
];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  // Match exact OU preview Vercel (*.vercel.app du meme projet)
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/dashboard-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/.test(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAllowed) return res.status(403).json({ error: 'Origin not allowed' });

  const CLIENT_ID     = process.env.WITHINGS_CLIENT_ID;
  const CLIENT_SECRET = process.env.WITHINGS_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Variables d\'environnement Withings manquantes côté serveur.' });
  }

  const { action, code, refresh_token, redirect_uri } = req.body || {};

  // Construction du body selon l'action demandée
  let body;
  if (action === 'exchange_code') {
    if (!code || !redirect_uri) return res.status(400).json({ error: 'code et redirect_uri requis' });
    body = new URLSearchParams({
      action:        'requesttoken',
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri,
    });
  } else if (action === 'refresh') {
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token requis' });
    body = new URLSearchParams({
      action:        'requesttoken',
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
    });
  } else {
    return res.status(400).json({ error: 'Action inconnue. Utiliser : exchange_code, refresh' });
  }

  try {
    const r = await fetch('https://wbsapi.withings.net/v2/oauth2', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const json = await r.json();

    if (json.status !== 0) {
      return res.status(400).json({ error: 'Withings error', details: json });
    }

    return res.status(200).json(json.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
}
