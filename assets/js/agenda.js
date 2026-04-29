/* ════════════════════════════════════════════════════════
   AGENDA.JS — Événements éditables, persistés en localStorage
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';
import { escHtml, escAttr } from './esc.js';

const KEY = 'agenda_events';
const COLORS = ['dot-cyan','dot-violet','dot-pink','dot-mint'];

const DEFAULTS = [
  { id:1, time:'09:00', title:'Révision des objectifs', sub:'Planification hebdomadaire', color:'dot-cyan' },
  { id:2, time:'14:30', title:'Session de travail',     sub:'Projet principal · 2h',      color:'dot-violet' },
  { id:3, time:'19:00', title:'Sport & récupération',   sub:'Running · 5 km',             color:'dot-pink' },
];

function load() { return get(KEY, DEFAULTS); }
function save(events) { set(KEY, events); }

export function initAgenda() {
  render();
  document.getElementById('agenda-add-btn')?.addEventListener('click', () => openModal(null));
}

function render() {
  const tl = document.getElementById('agenda-timeline');
  if (!tl) return;
  const events = load().sort((a, b) => a.time.localeCompare(b.time));

  if (!events.length) {
    tl.innerHTML = `<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:.5rem 0">Aucun événement — clique sur + Ajouter</p>`;
    return;
  }

  tl.innerHTML = events.map((ev, i) => {
    const isLast = i === events.length - 1;
    return `
      <div class="tl-item" data-id="${escAttr(ev.id)}">
        <div class="tl-dot ${escAttr(ev.color)}"></div>
        ${isLast ? '' : '<div class="tl-line"></div>'}
        <div class="tl-content" style="flex:1">
          <span class="tl-time mono">${escHtml(ev.time)}</span>
          <span class="tl-title">${escHtml(ev.title)}</span>
          ${ev.sub ? `<span class="tl-sub">${escHtml(ev.sub)}</span>` : ''}
        </div>
        <div class="tl-actions">
          <button class="tl-btn-edit" data-id="${escAttr(ev.id)}" title="Modifier">✏️</button>
          <button class="tl-btn-del"  data-id="${escAttr(ev.id)}" title="Supprimer">🗑</button>
        </div>
      </div>
    `;
  }).join('');

  tl.querySelectorAll('.tl-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      save(load().filter(e => e.id !== Number(btn.dataset.id)));
      render();
    });
  });

  tl.querySelectorAll('.tl-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openModal(Number(btn.dataset.id)));
  });
}

function openModal(id) {
  const events = load();
  const ev = id ? events.find(e => e.id === id) : null;

  let modal = document.getElementById('agenda-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'agenda-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)`;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--bg-2);border:1px solid var(--glass-border);border-radius:16px;padding:1.5rem;width:340px;max-width:90%">
      <h3 style="color:var(--white);margin-bottom:1rem">${ev ? 'Modifier' : 'Nouvel événement'}</h3>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Heure</label>
      <input id="am-time" type="time" value="${escAttr(ev?.time||'09:00')}" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--white);padding:.55rem .8rem;font-family:var(--font-mono);font-size:.9rem;margin-bottom:.75rem;outline:none"/>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Titre</label>
      <input id="am-title" value="${escAttr(ev?.title||'')}" placeholder="Ex: Réunion client" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--white);padding:.55rem .8rem;font-family:var(--font-ui);font-size:.9rem;margin-bottom:.75rem;outline:none"/>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Sous-titre (optionnel)</label>
      <input id="am-sub" value="${escAttr(ev?.sub||'')}" placeholder="Ex: Zoom · 1h" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--white);padding:.55rem .8rem;font-family:var(--font-ui);font-size:.9rem;margin-bottom:.75rem;outline:none"/>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.5rem">Couleur</label>
      <div style="display:flex;gap:.5rem;margin-bottom:1.25rem">
        ${COLORS.map(c => {
          const cssColor = c.replace('dot-','');
          return `<div data-color="${c}" style="width:26px;height:26px;border-radius:50%;background:var(--${cssColor});cursor:pointer;border:2px solid ${(ev?.color||'dot-cyan')===c?'var(--white)':'transparent'};transition:border .2s"></div>`;
        }).join('')}
      </div>

      <div style="display:flex;gap:.5rem">
        <button id="am-cancel" style="flex:1;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--white);padding:.6rem;border-radius:10px;cursor:pointer;font-family:var(--font-ui)">Annuler</button>
        <button id="am-save"   style="flex:1;background:var(--violet);border:none;color:#fff;padding:.6rem;border-radius:10px;cursor:pointer;font-weight:600;font-family:var(--font-ui)">Enregistrer</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  let selectedColor = ev?.color || 'dot-cyan';
  modal.querySelectorAll('[data-color]').forEach(dot => {
    dot.addEventListener('click', () => {
      modal.querySelectorAll('[data-color]').forEach(d => d.style.borderColor = 'transparent');
      dot.style.borderColor = 'var(--white)';
      selectedColor = dot.dataset.color;
    });
  });

  document.getElementById('am-cancel').onclick = () => { modal.style.display = 'none'; };
  document.getElementById('am-save').onclick = () => {
    const time  = document.getElementById('am-time').value;
    const title = document.getElementById('am-title').value.trim();
    const sub   = document.getElementById('am-sub').value.trim();
    if (!title) return;
    const all = load();
    if (id) {
      const idx = all.findIndex(e => e.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], time, title, sub, color: selectedColor };
    } else {
      all.push({ id: Date.now(), time, title, sub, color: selectedColor });
    }
    save(all);
    modal.style.display = 'none';
    render();
  };
}
