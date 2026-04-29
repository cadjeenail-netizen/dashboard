/* ════════════════════════════════════════════════════════
   SYNC.JS — Synchronisation cloud via Supabase
   Activé uniquement si SUPABASE_URL + SUPABASE_ANON_KEY
   sont configurés dans Paramètres → Intégrations
   ════════════════════════════════════════════════════════ */

const USER_ID = 'default'; /* Pas de multi-compte pour l'instant */

/* ── Config Supabase hardcodée (clé anon publique, OK en frontend) ── */
const DEFAULT_CFG = {
  url: 'https://ueduodyudfvuiskpjzyy.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZHVvZHl1ZGZ2dWlza3Bqenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODUwMjksImV4cCI6MjA5Mjk2MTAyOX0.7TqJREgzTT6cMgxQvemvVsZjtqwg35XPrU82xhvyE5s',
};

/* ── Toujours utiliser la config hardcodée (override désactivé) ── */
function getCfg() {
  /* Nettoie une éventuelle vieille config locale qui pourrait poser problème */
  try { localStorage.removeItem('dashboard_vie_supabase_config'); } catch {}
  return DEFAULT_CFG;
}

function isConfigured() {
  const cfg = getCfg();
  return !!(cfg?.url && cfg?.key);
}

/* ── Collecte toutes les clés dashboard du localStorage ── */
function collectLocalData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('dashboard_vie_')) {
      data[k] = localStorage.getItem(k);
    }
  }
  return data;
}

/* ── Headers communs pour Supabase REST ── */
function headers(cfg, extra = {}) {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.key}`,
    ...extra,
  };
  /* Ancienne clé anon (jwt) → apikey header requis */
  if (!cfg.key.startsWith('sb_publishable_')) h['apikey'] = cfg.key;
  return h;
}

/* ── Pousse vers Supabase (upsert) ── */
export async function pushToCloud() {
  if (!isConfigured()) return;
  const cfg = getCfg();
  const payload = {
    user_id: USER_ID,
    data: collectLocalData(),
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/dashboard_sync`, {
      method: 'POST',
      headers: headers(cfg, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn('[sync] Push erreur', res.status, await res.text());
  } catch (err) {
    console.warn('[sync] Push échoué :', err.message);
  }
}

/* ── Tire depuis Supabase et écrase le localStorage ── */
export async function pullFromCloud() {
  if (!isConfigured()) return false;
  const cfg = getCfg();

  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/dashboard_sync?user_id=eq.${USER_ID}&select=data`,
      { headers: headers(cfg) }
    );
    if (!res.ok) { console.warn('[sync] Pull erreur', res.status); return false; }
    const rows = await res.json();
    if (!rows.length || !rows[0].data) return false;

    Object.entries(rows[0].data).forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });
    return true;
  } catch (err) {
    console.warn('[sync] Pull échoué :', err.message);
    return false;
  }
}

/* ── Sync automatique : pull au démarrage, push à chaque modif ── */
export async function initSync() {
  if (!isConfigured()) return;

  /* Pull au chargement */
  const pulled = await pullFromCloud();
  if (pulled) console.log('[sync] ✅ Données restaurées depuis Supabase');

  /* Push automatique à chaque changement localStorage */
  let pushTimer = null;
  window.addEventListener('storage-changed', () => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToCloud, 1500); /* débounce 1.5s */
  });

  /* Push toutes les 5 min de toute façon */
  setInterval(pushToCloud, 5 * 60 * 1000);
}

/* ── SQL à exécuter une seule fois dans Supabase SQL Editor ──
   CREATE TABLE IF NOT EXISTS dashboard_sync (
     user_id   TEXT PRIMARY KEY,
     data      JSONB,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE dashboard_sync ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow all anon" ON dashboard_sync
     FOR ALL USING (true) WITH CHECK (true);
*/
