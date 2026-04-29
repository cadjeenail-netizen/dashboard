/* ════════════════════════════════════════════════════════
   SYNC.JS — Synchronisation cloud via Supabase
   Multi-utilisateurs : chaque user a sa propre ligne
   Utilise le JWT Supabase Auth (pas le token anon)
   ════════════════════════════════════════════════════════ */

import { getAccessToken, getUserId, isAuthenticated } from './auth.js';

/* ── Config Supabase ── */
const SUPABASE_URL      = 'https://ueduodyudfvuiskpjzyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZHVvZHl1ZGZ2dWlza3Bqenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODUwMjksImV4cCI6MjA5Mjk2MTAyOX0.7TqJREgzTT6cMgxQvemvVsZjtqwg35XPrU82xhvyE5s';

/* ── Headers communs ── */
function headers(extra = {}) {
  const token = getAccessToken(); /* JWT user ou anon key */
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': SUPABASE_ANON_KEY,   /* toujours requis par Supabase */
    ...extra,
  };
}

/* ── Collecte toutes les clés dashboard du localStorage ── */
function collectLocalData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    /* On n'exporte pas la session auth ni le flag de déverrouillage */
    if (k && k.startsWith('dashboard_vie_') &&
        k !== 'dashboard_vie_auth_session' &&
        k !== 'dashboard_vie_unlocked') {
      data[k] = localStorage.getItem(k);
    }
  }
  return data;
}

/* ════════════════════════════════════════════════════════
   PUSH — sauvegarde vers Supabase
   ════════════════════════════════════════════════════════ */
export async function pushToCloud() {
  const userId = getUserId();
  const payload = {
    user_id:    userId,
    data:       collectLocalData(),
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dashboard_sync`, {
      method:  'POST',
      headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body:    JSON.stringify(payload),
    });
    if (!res.ok) console.warn('[sync] Push erreur', res.status, await res.text());
    else console.log('[sync] ✅ Données sauvées pour', userId);
  } catch (err) {
    console.warn('[sync] Push échoué :', err.message);
  }
}

/* ════════════════════════════════════════════════════════
   PULL — restaure depuis Supabase
   ════════════════════════════════════════════════════════ */
export async function pullFromCloud() {
  const userId = getUserId();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/dashboard_sync?user_id=eq.${userId}&select=data`,
      { headers: headers() }
    );
    if (!res.ok) { console.warn('[sync] Pull erreur', res.status); return false; }
    const rows = await res.json();
    if (!rows.length || !rows[0].data) return false;

    Object.entries(rows[0].data).forEach(([k, v]) => {
      /* Ne pas écraser la session auth ni le flag unlock */
      if (k === 'dashboard_vie_auth_session' || k === 'dashboard_vie_unlocked') return;
      localStorage.setItem(k, v);
    });
    console.log('[sync] ✅ Données restaurées pour', userId);
    return true;
  } catch (err) {
    console.warn('[sync] Pull échoué :', err.message);
    return false;
  }
}

/* ════════════════════════════════════════════════════════
   INIT — pull au démarrage, push auto sur modifications
   ════════════════════════════════════════════════════════ */
export async function initSync() {
  /* Pull au chargement (seulement si authentifié) */
  const pulled = await pullFromCloud();
  if (pulled) console.log('[sync] ✅ Sync initiale terminée');

  /* Push debounce sur chaque changement de données */
  let pushTimer = null;
  window.addEventListener('storage-changed', () => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToCloud, 1500);
  });

  /* Push toutes les 5 min de toute façon */
  setInterval(pushToCloud, 5 * 60 * 1000);
}

/* ════════════════════════════════════════════════════════
   SQL À EXÉCUTER DANS SUPABASE (une seule fois)
   ════════════════════════════════════════════════════════

   -- Recréer la table si nécessaire (ne touche pas aux données)
   CREATE TABLE IF NOT EXISTS dashboard_sync (
     user_id    TEXT PRIMARY KEY,
     data       JSONB,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE dashboard_sync ENABLE ROW LEVEL SECURITY;

   -- Supprimer l'ancienne policy permissive
   DROP POLICY IF EXISTS "Allow all anon" ON dashboard_sync;

   -- Nouvelle policy : chaque utilisateur ne voit que ses données
   CREATE POLICY "Users access own data" ON dashboard_sync
     FOR ALL
     USING  (user_id = auth.uid()::text)
     WITH CHECK (user_id = auth.uid()::text);

   ════════════════════════════════════════════════════════ */
