/* ════════════════════════════════════════════════════════
   SYNC.JS — Synchronisation cloud via Supabase
   Activé uniquement si SUPABASE_URL + SUPABASE_ANON_KEY
   sont configurés dans Paramètres → Intégrations
   ════════════════════════════════════════════════════════ */

const USER_ID = 'default'; /* Pas de multi-compte pour l'instant */

/* ── Récupère la config depuis localStorage ── */
function getCfg() {
  try {
    const raw = localStorage.getItem('dashboard_vie_supabase_config');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
    await fetch(`${cfg.url}/rest/v1/dashboard_sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
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
      {
        headers: {
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
        },
      }
    );
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
