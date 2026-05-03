/* ════════════════════════════════════════════════════════
   BRIDGE.JS — Expose les modules existants à React/Babel
   Babel standalone ne gère pas import/export → on passe par window.Nebula
   ════════════════════════════════════════════════════════ */

import * as withings from '../withings.js';
import * as google   from '../google.js';
import * as storage  from '../storage.js';
import * as auth     from '../auth.js';
import * as sync     from '../sync.js';

window.Nebula = { withings, google, storage, auth, sync };

/* Flag + event pour que React puisse attendre si besoin */
window.NebulaReady = true;
window.dispatchEvent(new Event('nebula-ready'));

async function initCloudSync() {
  try {
    if (!auth.isAuthenticated?.()) {
      await auth.refreshSession?.();
    }

    if (auth.isAuthenticated?.()) {
      await sync.initSync();
      window.dispatchEvent(new Event('cloud-sync-ready'));
      console.log('[Nebula] Cloud sync OK');
    } else {
      console.info('[Nebula] Cloud sync en attente: utilisateur non connecte');
    }
  } catch (e) {
    console.warn('[Nebula] Cloud sync erreur:', e);
  }
}

/* ── Gère les callbacks OAuth dès le chargement ──
   On essaie Google D'ABORD (vérifie son state en sessionStorage) puis Withings.
   Chaque module ignore le callback si ce n'est pas le sien. */
(async () => {
  /* 1. Auth Supabase — affiche l'écran de connexion si nécessaire */
  try {
    await auth.initAuth();
    window.dispatchEvent(new Event('auth-changed'));
  } catch (e) { console.warn('[Nebula] Auth init erreur:', e); }

  /* 2. Callbacks OAuth (Google Calendar, Withings) */
  try {
    const g = await google.handleCallback();
    if (g) {
      console.log('[Nebula] Google OAuth callback OK');
      window.dispatchEvent(new Event('google-connected'));
      return;
    }
  } catch (e) { console.error('[Nebula] Google callback erreur:', e); }
  try {
    const w = await withings.handleCallback();
    if (w) {
      console.log('[Nebula] Withings OAuth callback OK');
      window.dispatchEvent(new Event('withings-connected'));
    }
  } catch (e) { console.error('[Nebula] Withings callback erreur:', e); }

  /* 3. Sync cloud */
  await initCloudSync();
})();
