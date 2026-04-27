/* ════════════════════════════════════════════════════════
   GOALS.JS — Objectifs avec barres de progression
   Données statiques modifiables directement ici
   ════════════════════════════════════════════════════════ */

/* Modifie ces objectifs selon tes besoins */
const GOALS = [
  { name: 'Économies annuelles', pct: 42, color: 'goal-violet' },
  { name: 'Projet freelance',    pct: 68, color: 'goal-cyan'   },
  { name: 'Forme physique',      pct: 75, color: 'goal-mint'   },
  { name: 'Formation en ligne',  pct: 31, color: 'goal-pink'   },
];

/**
 * Retourne le score moyen des objectifs (pour le ring)
 */
export function getGoalsScore() {
  return Math.round(GOALS.reduce((acc, g) => acc + g.pct, 0) / GOALS.length);
}

/**
 * Initialise le module objectifs
 */
export function initGoals() {
  const listEl = document.getElementById('goals-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  GOALS.forEach(goal => {
    const item = document.createElement('div');
    item.className = 'goal-item';
    item.innerHTML = `
      <div class="goal-header">
        <span class="goal-name">${goal.name}</span>
        <span class="goal-pct" style="color: var(--${colorVar(goal.color)})">${goal.pct}%</span>
      </div>
      <div class="goal-track">
        <div class="goal-fill ${goal.color}" style="width: 0%"></div>
      </div>
    `;
    listEl.appendChild(item);

    /* Animation décalée d'apparition */
    const fill = item.querySelector('.goal-fill');
    requestAnimationFrame(() => {
      setTimeout(() => { fill.style.width = goal.pct + '%'; }, 100);
    });
  });
}

/* Mappe class CSS → variable CSS */
function colorVar(cls) {
  const map = {
    'goal-violet': 'violet',
    'goal-cyan':   'cyan',
    'goal-mint':   'mint',
    'goal-pink':   'pink',
  };
  return map[cls] || 'violet';
}
