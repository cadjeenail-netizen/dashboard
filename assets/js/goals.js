/* ════════════════════════════════════════════════════════
   GOALS.JS — Objectifs éditables, persistés en localStorage
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const KEY = 'goals';
const COLORS = ['goal-violet','goal-cyan','goal-mint','goal-pink'];
const COLOR_VARS = { 'goal-violet':'violet','goal-cyan':'cyan','goal-mint':'mint','goal-pink':'pink' };

const DEFAULTS = [
  { id:1, name:'Économies annuelles', pct:42, color:'goal-violet' },
  { id:2, name:'Projet freelance',    pct:68, color:'goal-cyan'   },
  { id:3, name:'Forme physique',      pct:75, color:'goal-mint'   },
  { id:4, name:'Formation en ligne',  pct:31, color:'goal-pink'   },
];

function load() { return get(KEY, DEFAULTS); }
function save(goals) { set(KEY, goals); window.dispatchEvent(new Event('goals-changed')); }

export function getGoalsScore() {
  const goals = load();
  if (!goals.length) return 0;
  return Math.round(goals.reduce((a, g) => a + g.pct, 0) / goals.length);
}

export function initGoals() {
  render();
}

function render() {
  const listEl = document.getElementById('goals-list');
  if (!listEl) return;
  const goals = load();

  listEl.innerHTML = `
    ${goals.map(g => `
      <div class="goal-item" data-id="${g.id}">
        <div class="goal-header">
          <span class="goal-name">${g.name}</span>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="goal-pct" style="color:var(--${COLOR_VARS[g.color]||'violet'})">${g.pct}%</span>
            <button class="goal-edit-btn" data-id="${g.id}" title="Modifier">✏️</button>
            <button class="goal-del-btn"  data-id="${g.id}" title="Supprimer">🗑</button>
          </div>
        </div>
        <div class="goal-track">
          <div class="goal-fill ${g.color}" style="width:0%"></div>
        </div>
      </div>
    `).join('')}
    <button class="goal-add-btn" id="goal-add-btn">+ Ajouter un objectif</button>
  `;

  /* Animate fills */
  listEl.querySelectorAll('.goal-fill').forEach((fill, i) => {
    requestAnimationFrame(() => setTimeout(() => { fill.style.width = goals[i].pct + '%'; }, 80));
  });

  /* Supprimer */
  listEl.querySelectorAll('.goal-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      save(load().filter(g => g.id !== id));
      render();
    });
  });

  /* Modifier */
  listEl.querySelectorAll('.goal-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      openModal(id);
    });
  });

  /* Ajouter */
  document.getElementById('goal-add-btn').addEventListener('click', () => openModal(null));
}

function openModal(id) {
  const goals = load();
  const goal = id ? goals.find(g => g.id === id) : null;

  let modal = document.getElementById('goal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'goal-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)`;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--bg-2);border:1px solid var(--glass-border);border-radius:16px;padding:1.5rem;width:340px;max-width:90%">
      <h3 style="color:var(--white);margin-bottom:1rem">${goal ? 'Modifier' : 'Nouvel objectif'}</h3>
      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Nom</label>
      <input id="gm-name" value="${goal?.name||''}" placeholder="Ex: Économies" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:#fff;padding:.55rem .8rem;font-family:var(--font-ui);font-size:.9rem;margin-bottom:.75rem;outline:none"/>
      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Progression : <span id="gm-pct-label">${goal?.pct||0}%</span></label>
      <input id="gm-pct" type="range" min="0" max="100" value="${goal?.pct||0}" style="width:100%;margin-bottom:.75rem;accent-color:var(--violet)"/>
      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.5rem">Couleur</label>
      <div style="display:flex;gap:.5rem;margin-bottom:1.25rem">
        ${COLORS.map(c => `<div data-color="${c}" style="width:28px;height:28px;border-radius:50%;background:var(--${COLOR_VARS[c]});cursor:pointer;border:2px solid ${(goal?.color||'goal-violet')===c?'#fff':'transparent'};transition:border .2s"></div>`).join('')}
      </div>
      <div style="display:flex;gap:.5rem">
        <button id="gm-cancel" style="flex:1;background:var(--glass-bg);border:1px solid var(--glass-border);color:#fff;padding:.6rem;border-radius:10px;cursor:pointer;font-family:var(--font-ui)">Annuler</button>
        <button id="gm-save"   style="flex:1;background:var(--violet);border:none;color:#fff;padding:.6rem;border-radius:10px;cursor:pointer;font-weight:600;font-family:var(--font-ui)">Enregistrer</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  /* Slider label */
  const slider = document.getElementById('gm-pct');
  slider.oninput = () => document.getElementById('gm-pct-label').textContent = slider.value + '%';

  /* Sélection couleur */
  let selectedColor = goal?.color || 'goal-violet';
  modal.querySelectorAll('[data-color]').forEach(dot => {
    dot.addEventListener('click', () => {
      modal.querySelectorAll('[data-color]').forEach(d => d.style.borderColor = 'transparent');
      dot.style.borderColor = '#fff';
      selectedColor = dot.dataset.color;
    });
  });

  document.getElementById('gm-cancel').onclick = () => { modal.style.display = 'none'; };
  document.getElementById('gm-save').onclick = () => {
    const name = document.getElementById('gm-name').value.trim();
    if (!name) return;
    const pct = Number(slider.value);
    const all = load();
    if (id) {
      const idx = all.findIndex(g => g.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], name, pct, color: selectedColor };
    } else {
      all.push({ id: Date.now(), name, pct, color: selectedColor });
    }
    save(all);
    modal.style.display = 'none';
    render();
  };
}
