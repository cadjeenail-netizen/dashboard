/* ════════════════════════════════════════════════════════
   LOCK.JS — Écran de verrouillage PIN 4 chiffres
   Le PIN est stocké hashé (simple) dans localStorage
   PIN par défaut : 1234  (modifiable au premier lancement)
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const DEFAULT_PIN = '1234';
const SESSION_KEY = 'unlocked_session'; // clé sessionStorage

/* ── Hash simple (non cryptographique, usage local uniquement) ── */
function hashPin(pin) {
  let h = 0;
  for (const c of pin) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return String(h);
}

/* ── Vérifie si déjà déverrouillé dans cette session ── */
function isUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function unlock() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

/* ── HTML de l'écran de verrouillage ── */
function buildLockScreen() {
  const el = document.createElement('div');
  el.id = 'lock-screen';
  el.innerHTML = `
    <div class="lock-inner">
      <div class="lock-avatar">N</div>
      <p class="lock-title">Mon Univers</p>
      <p class="lock-sub">Entrez votre code</p>

      <div class="lock-dots" id="lock-dots">
        <span class="ldot"></span>
        <span class="ldot"></span>
        <span class="ldot"></span>
        <span class="ldot"></span>
      </div>

      <p class="lock-error" id="lock-error"></p>

      <div class="lock-pad" id="lock-pad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button class="lkey${k === '' ? ' lkey-empty' : ''}" data-key="${k}">${k}</button>
        `).join('')}
      </div>
    </div>
  `;
  return el;
}

/* ── Animation shake ── */
function shake() {
  const dots = document.getElementById('lock-dots');
  dots.classList.add('shake');
  setTimeout(() => dots.classList.remove('shake'), 500);
}

/* ── Met à jour les points visuels ── */
function updateDots(entry) {
  document.querySelectorAll('.ldot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < entry.length);
  });
}

/* ── Init de l'écran ── */
export function initLock(onUnlocked) {
  /* Si déjà déverrouillé dans cette session → passe directement */
  if (isUnlocked()) { onUnlocked(); return; }

  /* Vérifie que le PIN existe, sinon crée-le */
  if (!get('pin_hash', null)) {
    set('pin_hash', hashPin(DEFAULT_PIN));
  }

  const lockEl = buildLockScreen();
  document.body.appendChild(lockEl);
  document.body.style.overflow = 'hidden';

  let entry = '';

  const pad    = document.getElementById('lock-pad');
  const errEl  = document.getElementById('lock-error');

  pad.addEventListener('click', e => {
    const btn = e.target.closest('.lkey');
    if (!btn || btn.classList.contains('lkey-empty')) return;

    const key = btn.dataset.key;

    if (key === '⌫') {
      entry = entry.slice(0, -1);
      updateDots(entry);
      errEl.textContent = '';
      return;
    }

    if (entry.length >= 4) return;
    entry += key;
    updateDots(entry);

    /* Animation press */
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 150);

    if (entry.length === 4) {
      const stored = get('pin_hash', hashPin(DEFAULT_PIN));
      if (hashPin(entry) === stored) {
        /* ✅ Correct */
        lockEl.classList.add('lock-exit');
        unlock();
        setTimeout(() => {
          lockEl.remove();
          document.body.style.overflow = '';
          onUnlocked();
        }, 400);
      } else {
        /* ❌ Mauvais PIN */
        shake();
        errEl.textContent = 'Code incorrect';
        entry = '';
        setTimeout(() => {
          updateDots(entry);
          errEl.textContent = '';
        }, 700);
      }
    }
  });

  /* Support clavier */
  document.addEventListener('keydown', function handler(e) {
    if (!document.getElementById('lock-screen')) {
      document.removeEventListener('keydown', handler);
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      pad.querySelector(`[data-key="${e.key}"]`)?.click();
    }
    if (e.key === 'Backspace') {
      pad.querySelector('[data-key="⌫"]')?.click();
    }
  });
}
