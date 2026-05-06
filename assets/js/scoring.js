/* ════════════════════════════════════════════════════════
   SCORING.JS — Score intelligent, streak, feedback
   Exposé via window.Nebula.scoring (bridge.js)
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

/* ── Constantes ── */
const POINTS_PER_HABIT   = 10;
const BONUS_PERFECT_DAY  = 20;

/* ── Date helpers ── */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

/* ── Quel index de jour est aujourd'hui (0=lun … 6=dim) ── */
export function getTodayHabitsIndex() {
  const day = new Date().getDay(); // 0=dim, 1=lun…6=sam
  return day === 0 ? 6 : day - 1;  // convertit en lun=0…dim=6
}

/* ── Multiplicateur streak ── */
export function getStreakMultiplier(streak) {
  if (streak >= 20) return 2.0;
  if (streak >= 10) return 1.5;
  if (streak >= 5)  return 1.2;
  return 1.0;
}

/* ── Calcul du score du jour ── */
export function calculateTodayScore(habits) {
  const todayIdx   = getTodayHabitsIndex();
  const habitsDone = habits.filter(h => h.days[todayIdx]).length;
  const total      = habits.length;
  const streak     = getStreak().current;
  const multiplier = getStreakMultiplier(streak);

  const habitsPoints = habitsDone * POINTS_PER_HABIT;
  const bonusPoints  = (total > 0 && habitsDone === total) ? BONUS_PERFECT_DAY : 0;
  const rawPoints    = habitsPoints + bonusPoints;
  const points       = Math.round(rawPoints * multiplier);

  return {
    points,
    breakdown: {
      habits:     habitsPoints,
      bonus:      bonusPoints,
      multiplier,
      streak,
      habitsDone,
      habitsTotal: total,
    },
  };
}

/* ── Lire le streak actuel ── */
export function getStreak() {
  return get('streak', { current: 0, best: 0, lastDate: null, history: [] });
}

/* ── Mettre à jour le streak selon les habitudes faites aujourd'hui ── */
export function updateStreak(habitsCompletedToday) {
  const today     = todayStr();
  const yesterday = yesterdayStr();
  const data      = getStreak();

  if (habitsCompletedToday > 0) {
    /* Déjà compté aujourd'hui → rien à faire */
    if (data.lastDate === today) {
      set('streak', data);
      return data;
    }

    /* Continuation du streak */
    if (data.lastDate === yesterday) {
      data.current += 1;
    } else {
      /* Rupture ou premier jour */
      data.current = 1;
    }

    data.best     = Math.max(data.best, data.current);
    data.lastDate = today;
    if (!data.history.includes(today)) {
      data.history.push(today);
      /* Garder seulement les 90 derniers jours */
      if (data.history.length > 90) data.history = data.history.slice(-90);
    }
  } else {
    /* Aucune habitude faite aujourd'hui — pas de reset si lastDate est hier ou aujourd'hui */
    /* On ne casse le streak qu'au lendemain (géré côté affichage) */
  }

  set('streak', data);
  return data;
}

/* ── Sauvegarder le score du jour ── */
export function saveScore(scoreData) {
  const today  = todayStr();
  const stored = get('score_today', null);

  /* Si c'est un nouveau jour, archiver l'ancien score */
  if (stored && stored.date !== today) {
    const history = get('score_history', []);
    history.push(stored);
    if (history.length > 90) history.shift();
    set('score_history', history);

    /* Ajouter à total */
    const prev = get('score_total', 0);
    set('score_total', prev + (stored.points || 0));
  }

  set('score_today', { date: today, ...scoreData });
}

/* ── Score total cumulé ── */
export function getTotalScore() {
  return get('score_total', 0);
}

/* ── Messages de feedback dynamiques ── */
export function getDynamicFeedback(score, streak, habitsDone, habitsTotal) {
  const remaining = habitsTotal - habitsDone;
  const multiplier = getStreakMultiplier(streak);

  if (habitsTotal === 0) {
    return "Ajoute ta première habitude pour commencer 🚀";
  }

  if (habitsDone === 0) {
    return "Lance-toi, chaque habitude compte 💪";
  }

  if (habitsDone === habitsTotal) {
    if (streak >= 10) return `Journée parfaite 🔥 Streak ${streak} jours — tu es en feu !`;
    if (streak >= 5)  return `Journée parfaite ✨ +${BONUS_PERFECT_DAY} bonus streak x${multiplier}`;
    return `Journée parfaite ! +${BONUS_PERFECT_DAY} pts bonus 🎉`;
  }

  if (remaining === 1) {
    return `Encore 1 habitude pour la journée parfaite (+${BONUS_PERFECT_DAY} pts) ✨`;
  }

  if (streak >= 10) return `x${multiplier} multiplicateur actif — streak ${streak} jours 🔥`;
  if (streak >= 5)  return `Streak ${streak} jours — multiplicateur x${multiplier} actif`;
  if (streak >= 2)  return `${streak} jours de suite — continue comme ça !`;

  if (habitsDone >= Math.ceil(habitsTotal / 2)) {
    return `Tu es plus régulier que 75% des utilisateurs 📈`;
  }

  return `+${habitsDone * POINTS_PER_HABIT} pts discipline aujourd'hui 💡`;
}

/* ── Données de test (appel console : window.Nebula.scoring.seedTestData()) ── */
export function seedTestData() {
  const today = new Date();
  const history = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    history.push(dateStr(d));
  }

  set('streak', {
    current:  6,
    best:     14,
    lastDate: history[history.length - 1],
    history,
  });

  const scoreHistory = history.map((date, i) => ({
    date,
    points: 60 + Math.floor(Math.random() * 60),
    breakdown: { habits: 40, bonus: 20, multiplier: 1.2, habitsDone: 4, habitsTotal: 5 },
  }));
  set('score_history', scoreHistory);
  set('score_total', scoreHistory.reduce((s, e) => s + e.points, 0));

  console.log('[Nebula] Données de test insérées ✅');
}
