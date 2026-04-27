/* ════════════════════════════════════════════════════════
   HABITS.JS — Habitudes + cases cliquables (lun→dim)
   Sauvegarde : clé "habits" via storage.js
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

/* Semaine courante : lundi→dimanche */
const JOURS_COURT = ['L','M','M','J','V','S','D'];

/* Habitudes par défaut */
const HABITS_DEFAULT = [
  { id: 'sport',    icon: '🏃', name: 'Sport',          days: [0,0,0,0,0,0,0] },
  { id: 'lecture',  icon: '📚', name: 'Lecture',         days: [0,0,0,0,0,0,0] },
  { id: 'eau',      icon: '💧', name: '2L d\'eau',        days: [0,0,0,0,0,0,0] },
  { id: 'mediter',  icon: '🧘', name: 'Méditation',      days: [0,0,0,0,0,0,0] },
  { id: 'code',     icon: '💻', name: 'Coder 1h',        days: [0,0,0,0,0,0,0] },
];

/**
 * Calcule le taux de complétion global (0-100)
 * Utilisé par app.js pour le score ring
 */
export function getHabitsScore() {
  const habits = get('habits', HABITS_DEFAULT);
  const total  = habits.length * 7;
  const done   = habits.reduce((acc, h) => acc + h.days.filter(Boolean).length, 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/**
 * Initialise le module habitudes
 */
export function initHabits() {
  const listEl    = document.getElementById('habits-list');
  const scoreEl   = document.getElementById('habits-score-label');
  const globalBar = document.getElementById('habits-global-fill');

  if (!listEl) return;

  let habits = get('habits', HABITS_DEFAULT);

  /* ── Rendu ── */
  function render() {
    listEl.innerHTML = '';
    let totalDone = 0;
    const total   = habits.length * 7;

    habits.forEach(habit => {
      const done = habit.days.filter(Boolean).length;
      totalDone += done;

      const row = document.createElement('div');
      row.className = 'habit-row';
      row.innerHTML = `
        <span class="habit-icon">${habit.icon}</span>
        <span class="habit-name">${habit.name}</span>
        <div class="habit-days" data-id="${habit.id}">
          ${JOURS_COURT.map((j, i) => `
            <button
              class="habit-day${habit.days[i] ? ' done' : ''}"
              data-day="${i}"
              title="${['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][i]}"
            >${j}</button>
          `).join('')}
        </div>
      `;
      listEl.appendChild(row);
    });

    /* Mise à jour score global */
    const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0;
    if (scoreEl)   scoreEl.textContent  = `${totalDone} / ${total}`;
    if (globalBar) globalBar.style.width = pct + '%';

    /* Notifie app.js */
    window.dispatchEvent(new CustomEvent('habits-changed', { detail: { pct } }));
  }

  /* ── Délégation d'événements ── */
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.habit-day');
    if (!btn) return;

    const habitId = btn.closest('.habit-days').dataset.id;
    const dayIdx  = Number(btn.dataset.day);
    const habit   = habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.days[dayIdx] = habit.days[dayIdx] ? 0 : 1;
    set('habits', habits);
    render();
  });

  render();
}
