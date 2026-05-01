/* ════════════════════════════════════════════════════════
   BRIDGE.JS — Expose les modules existants à React/Babel
   Babel standalone ne gère pas import/export → on passe par window.Nebula
   ════════════════════════════════════════════════════════ */

import * as withings from '../withings.js';
import * as storage  from '../storage.js';
import * as auth     from '../auth.js';
import * as sync     from '../sync.js';

window.Nebula = { withings, storage, auth, sync };

/* Flag + event pour que React puisse attendre si besoin */
window.NebulaReady = true;
window.dispatchEvent(new Event('nebula-ready'));

/* ── Gère le callback OAuth Withings dès le chargement ──
   Si l'URL contient ?code=… , on échange le code contre un token
   AVANT que React monte (sinon React nettoierait l'URL trop tôt). */
(async () => {
  try {
    const handled = await withings.handleCallback();
    if (handled) {
      console.log('[Nebula] Withings OAuth callback traité avec succès');
      window.dispatchEvent(new Event('withings-connected'));
    }
  } catch (e) {
    console.error('[Nebula] OAuth callback erreur:', e);
  }
})();
