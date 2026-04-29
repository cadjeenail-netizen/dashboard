/* ════════════════════════════════════════════════════════
   APP.JS — Orchestrateur principal
   Initialise tous les modules et gère le score global
   ════════════════════════════════════════════════════════ */

import { initLock }    from './lock.js';
import { initHealth }  from './health.js';
import { initClock }   from './clock.js';
import { initHabits, getHabitsScore } from './habits.js';
import { initTodo }    from './todo.js';
import { initGoals, getGoalsScore }   from './goals.js';
import { initFinance } from './finance.js';
import { initQuote }   from './quote.js';
import { initWeather } from './weather.js';
import { initAgenda }  from './agenda.js';
import { initSettings, applyTheme, applyLightMode } from './settings.js';
import { initSync } from './sync.js';
import { get } from './storage.js';

/* ── Gradient SVG pour le score ring ── */
function injectRingGradient() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.querySelector('.score-ring');
  if (!svg) return;

  const defs = document.createElementNS(svgNS, 'defs');
  const grad = document.createElementNS(svgNS, 'linearGradient');
  grad.setAttribute('id', 'ring-gradient');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');

  const s1 = document.createElementNS(svgNS, 'stop');
  s1.setAttribute('offset', '0%');   s1.setAttribute('stop-color', '#7c4dff');
  const s2 = document.createElementNS(svgNS, 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#64b5f6');

  grad.append(s1, s2);
  defs.append(grad);
  svg.prepend(defs);
}

/* ── Calcul du score global (0-100) ── */
function computeScore() {
  const habits = getHabitsScore();  // 0-100
  const goals  = getGoalsScore();   // 0-100

  /* Pondération : habitudes 50%, objectifs 50% */
  const score = Math.round(habits * 0.50 + goals * 0.50);
  return Math.max(0, Math.min(100, score));
}

/* ── Mise à jour du ring SVG ── */
function updateScoreRing(score) {
  const ringFill  = document.getElementById('score-ring-fill');
  const scoreText = document.getElementById('score-value');
  if (!ringFill || !scoreText) return;

  const circumference = 2 * Math.PI * 50; // r=50 → ~314
  const offset        = circumference * (1 - score / 100);

  ringFill.style.strokeDasharray  = circumference;
  ringFill.style.strokeDashoffset = offset;
  scoreText.textContent           = score;
}

/* ── Init ── */
async function init() {
  /* Pull cloud AVANT d'initialiser les modules pour avoir les bonnes données */
  await initSync();

  injectRingGradient();
  initClock();
  initHealth();
  initHabits();
  initTodo();
  initGoals();
  initFinance();
  initQuote();
  initWeather();
  initAgenda();
  initSettings();

  /* Score initial */
  updateScoreRing(computeScore());

  /* Recalcul du score quand humeur ou habitudes changent */
  window.addEventListener('habits-changed',  () => updateScoreRing(computeScore()));
}

/* Lance quand le DOM est prêt */
document.addEventListener('DOMContentLoaded', () => {
  /* Applique le thème avant tout pour éviter le flash visuel */
  applyTheme(get('settings_theme', 'cosmos'));
  applyLightMode(get('settings_light_mode', false));

  /* L'écran de verrouillage s'affiche en premier.
     Le dashboard ne s'initialise qu'après déverrouillage. */
  initLock(init);
});
