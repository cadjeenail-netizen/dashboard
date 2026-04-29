/* ════════════════════════════════════════════════════════
   LOCK.JS — Écran de verrouillage PIN 4 chiffres
   Sécurité : SHA-256 via Web Crypto API (natif, irréversible)
   Le hash du PIN est stocké dans localStorage — jamais le PIN brut
   PIN par défaut : 1234
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const DEFAULT_PIN    = '1234';
const SESSION_FLAG   = 'dashboard_vie_unlocked'; // clé localStorage (persiste entre les sessions)

/* ── SHA-256 via Web Crypto (async, natif, aucune dépendance) ── */
async function sha256(text) {
  const buf    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ── Session déverrouillée ? ── */
function isUnlocked() {
  return localStorage.getItem(SESSION_FLAG) === '1';
}
function markUnlocked() {
  localStorage.setItem(SESSION_FLAG, '1');
}
/* Permet de verrouiller manuellement depuis les paramètres */
export function lockDashboard() {
  localStorage.removeItem(SESSION_FLAG);
  location.reload();
}

/* ── Initialisation du hash par défaut au premier lancement ── */
async function ensurePinStored() {
  if (!get('pin_h2', null)) {
    const h = await sha256(DEFAULT_PIN);
    set('pin_h2', h);
  }
}

/* ── Construction de l'écran ── */
function buildLockScreen() {
  const el = document.createElement('div');
  el.id = 'lock-screen';
  el.innerHTML = `
    <div class="lock-inner">
      <div class="lock-avatar">N</div>
      <p class="lock-title">Nebula</p>
      <p class="lock-sub">Entrez votre code PIN</p>

      <div class="lock-dots" id="lock-dots">
        <span class="ldot"></span>
        <span class="ldot"></span>
        <span class="ldot"></span>
        <span class="ldot"></span>
      </div>

      <p class="lock-error" id="lock-error"></p>

      <div class="lock-pad" id="lock-pad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button class="lkey${k==='' ? ' lkey-empty' : ''}" data-key="${k}">${k}</button>
        `).join('')}
      </div>
    </div>
  `;
  return el;
}

/* ── Mise à jour des points ── */
function updateDots(n) {
  document.querySelectorAll('.ldot').forEach((d, i) => {
    d.classList.toggle('filled', i < n);
  });
}

/* ── Animation shake ── */
function shake() {
  const dots = document.getElementById('lock-dots');
  dots.classList.add('shake');
  setTimeout(() => dots.classList.remove('shake'), 500);
}

/* ════════════════════════════════════════════════════════
   EXPORT PRINCIPAL
   onUnlocked : callback appelé quand le PIN est correct
   ════════════════════════════════════════════════════════ */
export async function initLock(onUnlocked) {
  /* Déjà déverrouillé dans cet onglet → dashboard direct */
  if (isUnlocked()) { onUnlocked(); return; }

  await ensurePinStored();

  const lockEl = buildLockScreen();
  document.body.appendChild(lockEl);
  document.body.style.overflow = 'hidden';

  let entry   = '';
  let busy    = false; // évite les doubles soumissions pendant l'async
  const pad   = document.getElementById('lock-pad');
  const errEl = document.getElementById('lock-error');

  /* ── Traitement d'une touche ── */
  async function handleKey(key) {
    if (busy) return;

    if (key === '⌫') {
      entry = entry.slice(0, -1);
      updateDots(entry.length);
      errEl.textContent = '';
      return;
    }

    if (entry.length >= 4) return;
    entry += key;
    updateDots(entry.length);

    if (entry.length === 4) {
      busy = true;
      const inputHash  = await sha256(entry);
      const storedHash = get('pin_h2', null);

      if (inputHash === storedHash) {
        /* ✅ PIN correct */
        markUnlocked();
        lockEl.classList.add('lock-exit');
        setTimeout(() => {
          lockEl.remove();
          document.body.style.overflow = '';
          onUnlocked();
        }, 380);
      } else {
        /* ❌ PIN incorrect */
        shake();
        errEl.textContent = 'Code incorrect';
        entry = '';
        setTimeout(() => {
          updateDots(0);
          errEl.textContent = '';
          busy = false;
        }, 700);
      }
    }
  }

  /* ── Clic pavé ── */
  pad.addEventListener('click', e => {
    const btn = e.target.closest('.lkey');
    if (!btn || btn.classList.contains('lkey-empty')) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 140);
    handleKey(btn.dataset.key);
  });

  /* ── Support clavier ── */
  function keyHandler(e) {
    if (!document.getElementById('lock-screen')) {
      document.removeEventListener('keydown', keyHandler);
      return;
    }
    if (e.key >= '0' && e.key <= '9') handleKey(e.key);
    if (e.key === 'Backspace') handleKey('⌫');
  }
  document.addEventListener('keydown', keyHandler);
}

/* ════════════════════════════════════════════════════════
   UTILITAIRE PUBLIQUE — Changer le PIN depuis la console
   Usage : await window.changePin('0000', '5847')
   ════════════════════════════════════════════════════════ */
window.changePin = async (ancienPin, nouveauPin) => {
  const { get: _get, set: _set } = await import('./storage.js');
  const storedHash = _get('pin_h2', null);
  const inputHash  = await sha256(ancienPin);

  if (inputHash !== storedHash) {
    console.warn('❌ Ancien PIN incorrect.');
    return false;
  }
  if (!/^\d{4}$/.test(nouveauPin)) {
    console.warn('❌ Le nouveau PIN doit être 4 chiffres.');
    return false;
  }
  _set('pin_h2', await sha256(nouveauPin));
  console.log('✅ PIN changé avec succès.');
  return true;
};
