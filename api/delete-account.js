// ════════════════════════════════════════════════════════
// /api/delete-account — Supprime le compte Supabase de l'utilisateur
// Utilise la service role key (secret, côté serveur uniquement)
// ════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://ueduodyudfvuiskpjzyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZHVvZHl1ZGZ2dWlza3Bqenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODUwMjksImV4cCI6MjA5Mjk2MTAyOX0.7TqJREgzTT6cMgxQvemvVsZjtqwg35XPrU82xhvyE5s';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  /* 1. Récupère le JWT depuis le header Authorization */
  const authHeader = req.headers.authorization || '';
  const userToken  = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Token manquant.' });

  /* 2. Vérifie le token et récupère l'ID utilisateur */
  let userId;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (!r.ok) return res.status(401).json({ error: 'Token invalide ou expiré.' });
    const user = await r.json();
    userId = user.id;
  } catch {
    return res.status(500).json({ error: 'Impossible de vérifier le token.' });
  }

  /* 3. Service role key (variable d'environnement Vercel) */
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY).' });
  }

  /* 4. Supprime l'utilisateur via l'admin API */
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method:  'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey':        serviceKey,
      },
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: 'Suppression échouée.', details: body });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.', message: err.message });
  }
}
