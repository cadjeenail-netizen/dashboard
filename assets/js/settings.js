/* ════════════════════════════════════════════════════════
   SETTINGS.JS — Panneau de paramètres complet
   Slide-in depuis la droite avec 8 sections
   ════════════════════════════════════════════════════════ */

import { get, set, remove } from './storage.js';
import { isConnected as withingsConnected, startOAuth, disconnect as withingsDisconnect } from './withings.js';
import { lockDashboard } from './lock.js';
import { pushToCloud, pullFromCloud } from './sync.js';
import { signOut, getUserEmail } from './auth.js';

/* ── Constantes ── */
const VERSION = '1.2.0';
const GITHUB_URL = 'https://github.com/cadjeenail-netizen/dashboard';

const THEMES = [
  { id: 'cosmos',   name: 'Cosmos',   color: '#7c4dff' },
  { id: 'cyan',     name: 'Cyan',     color: '#00bcd4' },
  { id: 'gold',     name: 'Or',       color: '#ffd54f' },
  { id: 'ruby',     name: 'Rubis',    color: '#e53935' },
  { id: 'forest',   name: 'Forêt',    color: '#43a047' },
  { id: 'midnight', name: 'Nuit',     color: '#1565c0' },
  { id: 'neon',     name: 'Néon',     color: '#e91e63' },
  { id: 'fire',     name: 'Feu',      color: '#ff6d00' },
  { id: 'silver',   name: 'Argent',   color: '#90a4ae' },
  { id: 'lavender', name: 'Lavande',  color: '#9575cd' },
];

const SECTIONS = [
  { id: 'weather',  name: 'Météo',     selector: '.dashboard-grid > article:nth-child(1)' },
  { id: 'mood',     name: 'Humeur',    selector: '#mood-card' },
  { id: 'agenda',   name: 'Agenda',    selector: '.dashboard-grid > article:nth-child(3)' },
  { id: 'habits',   name: 'Habitudes', selector: '#habits-card' },
  { id: 'goals',    name: 'Objectifs', selector: '#goals-card' },
  { id: 'finance',  name: 'Finances',  selector: '#finance-card' },
  { id: 'todo',     name: 'Tâches',    selector: '#todo-card' },
  { id: 'health',   name: 'Santé',     selector: '#health-section' },
  { id: 'quote',    name: 'Citation',  selector: '#quote-card' },
];

const DEFAULT_PROFILE = {
  name: 'N',
  avatar: 'N',
  location: 'Le Tampon',
  dailyRate: 80,
  currency: '€',
};

/* ════════════════════════════════════════════════════════
   APPLIQUER LE THÈME (à appeler très tôt)
   ════════════════════════════════════════════════════════ */
export function applyTheme(themeId) {
  const valid = THEMES.find(t => t.id === themeId) ? themeId : 'cosmos';
  document.documentElement.setAttribute('data-theme', valid);
  set('settings_theme', valid);
}

/* ── Mode clair / sombre ── */
export function applyLightMode(enabled) {
  document.documentElement.classList.toggle('light-mode', !!enabled);
  set('settings_light_mode', !!enabled);
}

/* ════════════════════════════════════════════════════════
   APPLIQUER LE PROFIL (header)
   ════════════════════════════════════════════════════════ */
function applyProfile() {
  const p = get('settings_profile', DEFAULT_PROFILE);
  const avatar = document.querySelector('.avatar');
  if (!avatar) return;
  if (p.picture) {
    avatar.style.backgroundImage = `url(${p.picture})`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.textContent = '';
  } else {
    avatar.style.backgroundImage = '';
    avatar.textContent = p.avatar || 'N';
  }
  /* Avatar de l'écran de verrouillage */
  const lockAvatar = document.querySelector('.lock-avatar');
  if (lockAvatar) {
    if (p.picture) {
      lockAvatar.style.backgroundImage = `url(${p.picture})`;
      lockAvatar.style.backgroundSize = 'cover';
      lockAvatar.style.backgroundPosition = 'center';
      lockAvatar.textContent = '';
    } else {
      lockAvatar.style.backgroundImage = '';
      lockAvatar.textContent = p.avatar || 'N';
    }
  }
}

/* ════════════════════════════════════════════════════════
   APPLIQUER LA VISIBILITÉ DES SECTIONS
   ════════════════════════════════════════════════════════ */
function applyVisibility() {
  const hidden = get('settings_hidden_sections', []);
  SECTIONS.forEach(s => {
    const el = document.querySelector(s.selector);
    if (!el) return;
    if (hidden.includes(s.id)) el.classList.add('hidden-by-settings');
    else el.classList.remove('hidden-by-settings');
  });
}

/* ════════════════════════════════════════════════════════
   CONSTRUCTION DU DOM DU PANNEAU
   ════════════════════════════════════════════════════════ */
function buildPanel() {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.id = 'settings-overlay';

  const panel = document.createElement('aside');
  panel.className = 'settings-panel';
  panel.id = 'settings-panel';
  panel.innerHTML = `
    <div class="settings-header">
      <h2>Paramètres</h2>
      <button class="settings-close" id="settings-close" title="Fermer">×</button>
    </div>
    <div class="settings-body">

      <!-- 1. APPARENCE -->
      <div class="settings-section">
        <h3><span class="icon">🎨</span> Apparence</h3>

        <div class="settings-row">
          <span class="label">Mode clair</span>
          <div class="toggle-switch" id="light-mode-toggle"></div>
        </div>

        <p class="hint" style="margin-top:.75rem">Choisis ton thème de couleurs.</p>
        <div class="theme-grid" id="theme-grid"></div>
      </div>

      <!-- 2. WITHINGS -->
      <div class="settings-section">
        <h3><span class="icon">❤️</span> Withings</h3>
        <div class="settings-row">
          <span class="label">Statut</span>
          <span id="withings-status"></span>
        </div>
        <div class="settings-row">
          <span class="label">Dernière sync</span>
          <span class="value" id="withings-last-sync">—</span>
        </div>
        <div class="settings-row">
          <span class="label">Fréquence</span>
          <select class="settings-select" id="withings-freq" style="max-width:140px">
            <option value="5">5 min</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 h</option>
          </select>
        </div>
        <div class="settings-btn-row">
          <button class="settings-btn ghost" id="withings-sync">Synchroniser</button>
          <button class="settings-btn" id="withings-toggle-btn">Connecter</button>
        </div>
      </div>

      <!-- 3. PROFIL -->
      <div class="settings-section">
        <h3><span class="icon">👤</span> Profil</h3>
        <div class="settings-row">
          <span class="label">Nom</span>
          <input class="settings-input" id="profile-name" style="max-width:200px" />
        </div>
        <div class="settings-row">
          <span class="label">Avatar (lettre)</span>
          <input class="settings-input" id="profile-avatar" maxlength="2" style="max-width:80px;text-align:center" />
        </div>
        <div class="settings-row">
          <span class="label">Photo de profil</span>
          <div style="display:flex;gap:.5rem;align-items:center">
            <img id="profile-pic-preview" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;display:none;border:1px solid var(--glass-border)"/>
            <input type="file" accept="image/*" id="profile-pic-input" style="display:none"/>
            <button type="button" class="settings-btn ghost" id="profile-pic-btn" style="padding:.4rem .7rem;font-size:.8rem">Choisir</button>
            <button type="button" class="settings-btn ghost" id="profile-pic-clear" style="padding:.4rem .7rem;font-size:.8rem;display:none">×</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="label">Localisation</span>
          <input class="settings-input" id="profile-location" style="max-width:200px" />
        </div>
        <div class="settings-row">
          <span class="label">Taux journalier</span>
          <input class="settings-input" id="profile-rate" type="number" style="max-width:100px" />
        </div>
        <div class="settings-row">
          <span class="label">Devise</span>
          <select class="settings-select" id="profile-currency" style="max-width:100px">
            <option value="€">€</option>
            <option value="$">$</option>
            <option value="£">£</option>
            <option value="XPF">XPF</option>
          </select>
        </div>
        <button class="settings-btn full" id="profile-save">Enregistrer</button>
      </div>

      <!-- 4. DASHBOARD -->
      <div class="settings-section">
        <h3><span class="icon">📊</span> Dashboard</h3>
        <p class="hint">Affiche, masque ou réordonne les sections (glisser-déposer).</p>
        <div class="section-toggle-list" id="section-toggle-list"></div>
      </div>

      <!-- 5. NOTIFICATIONS -->
      <div class="settings-section">
        <h3><span class="icon">🔔</span> Notifications</h3>
        <div class="settings-row">
          <span class="label">Rappel humeur</span>
          <input class="settings-input" id="notif-mood" type="time" style="max-width:120px" />
        </div>
        <div class="settings-row">
          <span class="label">Rappel habitudes</span>
          <input class="settings-input" id="notif-habits" type="time" style="max-width:120px" />
        </div>
        <div class="settings-row">
          <span class="label">Résumé journalier</span>
          <span class="toggle-switch" id="notif-summary"></span>
        </div>
        <p class="hint">Les notifications nécessitent l'autorisation du navigateur.</p>
        <button class="settings-btn ghost full" id="notif-permission">Autoriser les notifications</button>
      </div>

      <!-- 6. DONNÉES -->
      <div class="settings-section">
        <h3><span class="icon">🗄️</span> Données</h3>
        <div class="settings-btn-row">
          <button class="settings-btn ghost" id="data-export">Exporter JSON</button>
          <button class="settings-btn ghost" id="data-import">Importer JSON</button>
        </div>
        <button class="settings-btn ghost full" id="data-clear-cache">Vider le cache</button>
        <button class="settings-btn danger full" id="data-reset">Réinitialiser le dashboard</button>
        <input type="file" id="data-import-file" accept="application/json" hidden />
      </div>

      <!-- 7. INTÉGRATIONS -->
      <div class="settings-section">
        <h3><span class="icon">🔗</span> Intégrations</h3>
        <div class="settings-row">
          <span class="label">Withings</span>
          <span id="integ-withings"></span>
        </div>
        <div class="settings-row">
          <span class="label">Supabase Sync</span>
          <span id="integ-supabase"></span>
        </div>
        <div class="settings-row">
          <span class="label">Météo</span>
          <span class="value">Open-Meteo (gratuit)</span>
        </div>
        <button class="settings-btn ghost full" id="supabase-config">Configurer Supabase</button>
        <div class="settings-btn-row" style="margin-top:.5rem">
          <button class="settings-btn ghost" id="supabase-pull">⬇ Restaurer depuis cloud</button>
          <button class="settings-btn ghost" id="supabase-push">⬆ Sauver vers cloud</button>
        </div>
      </div>

      <!-- VERROUILLER / DÉCONNEXION -->
      <div class="settings-section">
        <h3><span class="icon">🔒</span> Sécurité</h3>
        <div class="settings-row">
          <span class="label">Compte</span>
          <span class="value" id="auth-account-email" style="font-size:.78rem;max-width:160px;overflow:hidden;text-overflow:ellipsis">—</span>
        </div>
        <button class="settings-btn full" id="lock-now-btn">Verrouiller le dashboard</button>
        <button class="settings-btn danger full" id="signout-btn" style="margin-top:.5rem">Se déconnecter</button>
      </div>

      <!-- 8. À PROPOS -->
      <div class="settings-section">
        <h3><span class="icon">ℹ️</span> À propos</h3>
        <div class="settings-row">
          <span class="label">Version</span>
          <span class="value">${VERSION}</span>
        </div>
        <div class="settings-row">
          <span class="label">Mise à jour</span>
          <span class="value">${new Date().toISOString().slice(0,10)}</span>
        </div>
        <a class="settings-btn ghost full" href="${GITHUB_URL}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;display:block">Voir sur GitHub ↗</a>
      </div>

    </div>
  `;

  /* Modal de confirmation */
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.id = 'confirm-modal';
  modal.innerHTML = `
    <div class="confirm-box">
      <h4 id="confirm-title">Confirmer</h4>
      <p id="confirm-text">Êtes-vous sûr ?</p>
      <div class="row">
        <button class="settings-btn ghost" id="confirm-cancel">Annuler</button>
        <button class="settings-btn danger" id="confirm-ok">Confirmer</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.body.appendChild(modal);
}

/* ════════════════════════════════════════════════════════
   MODAL DE CONFIRMATION
   ════════════════════════════════════════════════════════ */
function confirm(title, text, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  modal.classList.add('open');

  const ok = document.getElementById('confirm-ok');
  const cancel = document.getElementById('confirm-cancel');
  const close = () => modal.classList.remove('open');
  const okHandler = () => { close(); onConfirm(); cleanup(); };
  const cancelHandler = () => { close(); cleanup(); };
  const cleanup = () => {
    ok.removeEventListener('click', okHandler);
    cancel.removeEventListener('click', cancelHandler);
  };
  ok.addEventListener('click', okHandler);
  cancel.addEventListener('click', cancelHandler);
}

/* ════════════════════════════════════════════════════════
   POPULATION & EVENTS
   ════════════════════════════════════════════════════════ */
function populateThemes() {
  const grid = document.getElementById('theme-grid');
  const current = get('settings_theme', 'cosmos');
  grid.innerHTML = THEMES.map(t => `
    <div>
      <div class="theme-circle ${t.id === current ? 'active' : ''}"
           style="background:${t.color}"
           data-theme="${t.id}"
           title="${t.name}"></div>
      <span class="theme-name">${t.name}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.theme-circle').forEach(c => {
    c.addEventListener('click', () => {
      grid.querySelectorAll('.theme-circle').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      applyTheme(c.dataset.theme);
    });
  });

  /* Toggle mode clair */
  const toggle = document.getElementById('light-mode-toggle');
  if (toggle) {
    const isLight = get('settings_light_mode', false);
    toggle.classList.toggle('on', isLight);
    toggle.addEventListener('click', () => {
      const newState = !toggle.classList.contains('on');
      toggle.classList.toggle('on', newState);
      applyLightMode(newState);
    });
  }
}

function populateWithings() {
  const connected = withingsConnected();
  const statusEl = document.getElementById('withings-status');
  const integEl = document.getElementById('integ-withings');
  const toggleBtn = document.getElementById('withings-toggle-btn');
  const lastSyncEl = document.getElementById('withings-last-sync');

  const pill = connected
    ? `<span class="status-pill connected">● Connecté</span>`
    : `<span class="status-pill disconnected">● Déconnecté</span>`;
  statusEl.innerHTML = pill;
  integEl.innerHTML = pill;
  toggleBtn.textContent = connected ? 'Déconnecter' : 'Connecter';
  toggleBtn.className = connected ? 'settings-btn danger' : 'settings-btn';

  const lastSync = get('withings_last_sync', null);
  lastSyncEl.textContent = lastSync ? new Date(lastSync).toLocaleString('fr-FR') : '—';

  toggleBtn.onclick = () => {
    if (connected) {
      confirm('Déconnecter Withings ?', 'Tes tokens locaux seront supprimés.', () => {
        withingsDisconnect();
        populateWithings();
      });
    } else {
      startOAuth();
    }
  };

  document.getElementById('withings-sync').onclick = () => {
    set('withings_last_sync', Date.now());
    populateWithings();
    location.reload();
  };

  const freq = document.getElementById('withings-freq');
  freq.value = get('withings_sync_freq', '30');
  freq.onchange = () => set('withings_sync_freq', freq.value);
}

function populateProfile() {
  const p = get('settings_profile', DEFAULT_PROFILE);
  document.getElementById('profile-name').value = p.name;
  document.getElementById('profile-avatar').value = p.avatar;
  document.getElementById('profile-location').value = p.location;
  document.getElementById('profile-rate').value = p.dailyRate;
  document.getElementById('profile-currency').value = p.currency;

  /* Aperçu photo de profil */
  const preview = document.getElementById('profile-pic-preview');
  const clearBtn = document.getElementById('profile-pic-clear');
  if (p.picture) {
    preview.src = p.picture;
    preview.style.display = '';
    clearBtn.style.display = '';
  }

  /* Bouton "Choisir" → ouvre file picker */
  document.getElementById('profile-pic-btn').onclick = () => {
    document.getElementById('profile-pic-input').click();
  };

  /* Lecture du fichier en base64 */
  document.getElementById('profile-pic-input').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      flash('Image trop grande (max 800 Ko)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = '';
      clearBtn.style.display = '';
      preview.dataset.pending = reader.result;
    };
    reader.readAsDataURL(file);
  };

  /* Bouton × → supprime la photo */
  clearBtn.onclick = () => {
    preview.src = '';
    preview.style.display = 'none';
    clearBtn.style.display = 'none';
    preview.dataset.pending = '';
    delete preview.dataset.removed;
    preview.dataset.removed = '1';
  };

  document.getElementById('profile-save').onclick = () => {
    const current = get('settings_profile', DEFAULT_PROFILE);
    let picture = current.picture || null;
    if (preview.dataset.pending) picture = preview.dataset.pending;
    if (preview.dataset.removed === '1') picture = null;

    const newP = {
      name: document.getElementById('profile-name').value || 'N',
      avatar: document.getElementById('profile-avatar').value || 'N',
      location: document.getElementById('profile-location').value || 'Le Tampon',
      dailyRate: Number(document.getElementById('profile-rate').value) || 80,
      currency: document.getElementById('profile-currency').value,
      picture,
    };
    set('settings_profile', newP);
    applyProfile();
    flash('Profil enregistré ✓');
  };
}

function populateSectionToggles() {
  const list = document.getElementById('section-toggle-list');
  const hidden = get('settings_hidden_sections', []);
  const order = get('settings_section_order', SECTIONS.map(s => s.id));

  /* Tri selon l'ordre sauvé */
  const ordered = order
    .map(id => SECTIONS.find(s => s.id === id))
    .filter(Boolean)
    .concat(SECTIONS.filter(s => !order.includes(s.id)));

  list.innerHTML = ordered.map(s => `
    <div class="section-toggle-item" draggable="true" data-id="${s.id}">
      <span class="drag-handle">≡</span>
      <span class="name">${s.name}</span>
      <span class="toggle-switch ${hidden.includes(s.id) ? '' : 'on'}" data-toggle="${s.id}"></span>
    </div>
  `).join('');

  /* Toggles */
  list.querySelectorAll('[data-toggle]').forEach(t => {
    t.addEventListener('click', () => {
      const id = t.dataset.toggle;
      const cur = get('settings_hidden_sections', []);
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      set('settings_hidden_sections', next);
      t.classList.toggle('on');
      applyVisibility();
    });
  });

  /* Drag & drop */
  let dragSrc = null;
  list.querySelectorAll('.section-toggle-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      saveOrder();
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      const tgt = e.currentTarget;
      if (!dragSrc || tgt === dragSrc) return;
      const rect = tgt.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      tgt.parentNode.insertBefore(dragSrc, after ? tgt.nextSibling : tgt);
    });
  });

  function saveOrder() {
    const newOrder = [...list.querySelectorAll('.section-toggle-item')].map(el => el.dataset.id);
    set('settings_section_order', newOrder);
    /* Réordonne réellement le DOM */
    applyDomOrder(newOrder);
  }
}

/* ════════════════════════════════════════════════════════
   APPLIQUE L'ORDRE DES SECTIONS DANS LA GRID
   ════════════════════════════════════════════════════════ */
function applyDomOrder(order) {
  const grid = document.querySelector('.dashboard-grid');
  if (!grid) return;
  order.forEach(id => {
    const def = SECTIONS.find(s => s.id === id);
    if (!def) return;
    const el = document.querySelector(def.selector);
    if (el && el.parentNode === grid) grid.appendChild(el);
  });
}

function populateNotifications() {
  document.getElementById('notif-mood').value = get('notif_mood_time', '20:00');
  document.getElementById('notif-habits').value = get('notif_habits_time', '08:00');
  const summaryToggle = document.getElementById('notif-summary');
  if (get('notif_summary', false)) summaryToggle.classList.add('on');

  document.getElementById('notif-mood').onchange = e => set('notif_mood_time', e.target.value);
  document.getElementById('notif-habits').onchange = e => set('notif_habits_time', e.target.value);
  summaryToggle.onclick = () => {
    const next = !summaryToggle.classList.contains('on');
    summaryToggle.classList.toggle('on');
    set('notif_summary', next);
  };

  document.getElementById('notif-permission').onclick = async () => {
    if (!('Notification' in window)) return flash('Non supporté', 'error');
    const p = await Notification.requestPermission();
    flash(p === 'granted' ? 'Autorisé ✓' : 'Refusé');
  };
}

function populateData() {
  document.getElementById('data-export').onclick = () => {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('dashboard_vie_')) dump[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Export téléchargé ✓');
  };

  const fileInput = document.getElementById('data-import-file');
  document.getElementById('data-import').onclick = () => fileInput.click();
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target.result);
        Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, v));
        flash('Importé ✓ — Rechargement…');
        setTimeout(() => location.reload(), 700);
      } catch (err) {
        flash('Erreur import', 'error');
      }
    };
    reader.readAsText(file);
  };

  document.getElementById('data-clear-cache').onclick = () => {
    confirm('Vider le cache ?', 'Cela rechargera la page.', () => {
      sessionStorage.clear();
      location.reload();
    });
  };

  document.getElementById('data-reset').onclick = () => {
    confirm('Réinitialiser le dashboard ?',
      'Toutes tes données locales seront supprimées. Action irréversible.',
      () => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith('dashboard_vie_')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        location.reload();
      });
  };
}

function populateSupabase() {
  const integEl = document.getElementById('integ-supabase');
  if (!integEl) return;
  const cfg = get('supabase_config', null);
  const connected = !!(cfg?.url && cfg?.key);
  integEl.innerHTML = connected
    ? `<span class="status-pill connected">● Connecté</span>`
    : `<span class="status-pill disconnected">● Non configuré</span>`;

  document.getElementById('supabase-config')?.addEventListener('click', () => {
    const url = prompt('URL Supabase (ex: https://xxx.supabase.co)', cfg?.url || '');
    if (url === null) return;
    if (!url.trim()) {
      remove('supabase_config');
      populateSupabase();
      flash('Supabase déconnecté');
      return;
    }
    const key = prompt('Anon Key Supabase', cfg?.key || '');
    if (!key) return;
    set('supabase_config', { url: url.trim(), key: key.trim() });
    populateSupabase();
    flash('Supabase configuré ✓');
  }, { once: true });

  document.getElementById('supabase-push')?.addEventListener('click', async () => {
    flash('Sauvegarde…');
    await pushToCloud();
    flash('Sauvé dans le cloud ✓');
  }, { once: true });

  document.getElementById('supabase-pull')?.addEventListener('click', async () => {
    flash('Restauration…');
    const ok = await pullFromCloud();
    if (ok) { flash('Restauré ✓ — Rechargement…'); setTimeout(() => location.reload(), 800); }
    else flash('Aucune donnée cloud trouvée', 'error');
  }, { once: true });
}

/* ════════════════════════════════════════════════════════
   FLASH MESSAGE
   ════════════════════════════════════════════════════════ */
function flash(msg, kind = 'info') {
  let toast = document.getElementById('settings-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'settings-toast';
    toast.style.cssText = `
      position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:rgba(20,17,41,0.95);color:#fff;padding:0.8rem 1.2rem;
      border-radius:12px;border:1px solid var(--glass-border);
      font-size:0.85rem;z-index:1100;backdrop-filter:blur(8px);
      transition:opacity 0.3s;font-family:var(--font-ui);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.color = kind === 'error' ? '#e57373' : '#fff';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

/* ════════════════════════════════════════════════════════
   OUVERTURE / FERMETURE
   ════════════════════════════════════════════════════════ */
function openPanel() {
  document.getElementById('settings-overlay').classList.add('open');
  document.getElementById('settings-panel').classList.add('open');
  /* Re-populer les infos dynamiques (Withings) */
  populateWithings();
}
function closePanel() {
  document.getElementById('settings-overlay').classList.remove('open');
  document.getElementById('settings-panel').classList.remove('open');
}

/* ════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════ */
export function initSettings() {
  /* Applique le thème dès le chargement */
  applyTheme(get('settings_theme', 'cosmos'));
  applyProfile();

  /* Construit le panneau */
  buildPanel();

  /* Bouton ⚙️ dans le header */
  const headerRight = document.querySelector('.header-right');
  if (headerRight) {
    const btn = document.createElement('button');
    btn.className = 'settings-trigger';
    btn.id = 'settings-trigger';
    btn.title = 'Paramètres';
    btn.innerHTML = '⚙';
    headerRight.insertBefore(btn, headerRight.firstChild);
    btn.addEventListener('click', openPanel);
  }

  /* Events panneau */
  document.getElementById('settings-close').addEventListener('click', closePanel);
  document.getElementById('settings-overlay').addEventListener('click', closePanel);

  /* Populate sections */
  populateThemes();
  populateWithings();
  populateProfile();
  populateSectionToggles();
  populateNotifications();
  populateData();
  populateSupabase();

  /* Email du compte connecté */
  const emailDisplay = document.getElementById('auth-account-email');
  if (emailDisplay) emailDisplay.textContent = getUserEmail() || '—';

  /* Bouton verrouiller */
  document.getElementById('lock-now-btn')?.addEventListener('click', () => {
    confirm('Verrouiller ?', 'Tu devras saisir ton PIN pour revenir.', lockDashboard);
  });

  /* Bouton déconnexion */
  document.getElementById('signout-btn')?.addEventListener('click', () => {
    confirm(
      'Se déconnecter ?',
      'Tu devras te reconnecter avec ton email et mot de passe.',
      signOut
    );
  });

  /* Applique préférences dashboard */
  applyVisibility();
  const order = get('settings_section_order', null);
  if (order) applyDomOrder(order);

  /* Esc pour fermer */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
  });
}
