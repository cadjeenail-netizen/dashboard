/* ════════════════════════════════════════════════════════
   NOTIFICATIONS.JS — Web Notifications API
   Rappels d'habitudes, alertes streak, messages dynamiques
   ════════════════════════════════════════════════════════ */

import { get } from './storage.js';
import { getTodayHabitsIndex, getStreak } from './scoring.js';

const ICON = 'assets/img/nebula-logo.svg';

/* IDs des timers pour éviter les doublons */
let _scheduledTimers = [];

function clearScheduled() {
  _scheduledTimers.forEach(id => clearTimeout(id));
  _scheduledTimers = [];
}

/* ── Demander la permission (une seule fois) ── */
export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/* ── Envoyer une notification immédiate ── */
export function sendNotification(title, body, icon = ICON) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, icon, badge: icon, vibrate: [200, 100, 200] });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) {
    console.warn('[Nebula] Notification erreur:', e);
  }
}

/* ── Planifier les rappels de la journée ── */
export function scheduleReminders(habits) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  clearScheduled();

  const now      = new Date();
  const todayIdx = getTodayHabitsIndex();
  const streak   = getStreak();

  const habitsDoneNow   = habits.filter(h => h.days[todayIdx]).length;
  const habitsTotal     = habits.length;
  const remaining       = habitsTotal - habitsDoneNow;

  /* ── Rappel 20h : si habitudes non complètes ── */
  const reminder20h = new Date(now);
  reminder20h.setHours(20, 0, 0, 0);
  const delay20h = reminder20h - now;

  if (delay20h > 0 && remaining > 0) {
    const id = setTimeout(() => {
      /* Relire les habitudes au moment du déclenchement */
      const freshHabits   = get('habits', []);
      const freshDone     = freshHabits.filter(h => h.days[todayIdx]).length;
      const freshRemaining = freshHabits.length - freshDone;

      if (freshRemaining > 0) {
        const streakMsg = streak.current > 0
          ? `⚠️ Streak ${streak.current} jours en danger !`
          : '';

        sendNotification(
          'Nebula — Rappel habitudes',
          freshRemaining === 1
            ? `Encore 1 habitude pour finir ta journée 💪 ${streakMsg}`
            : `${freshRemaining} habitudes restantes aujourd'hui 📋 ${streakMsg}`
        );
      }
    }, delay20h);
    _scheduledTimers.push(id);
  }

  /* ── Rappel 22h : alerte streak si rien de fait ── */
  if (streak.current >= 3) {
    const reminder22h = new Date(now);
    reminder22h.setHours(22, 0, 0, 0);
    const delay22h = reminder22h - now;

    if (delay22h > 0) {
      const id = setTimeout(() => {
        const freshHabits = get('habits', []);
        const freshDone   = freshHabits.filter(h => h.days[todayIdx]).length;
        if (freshDone === 0) {
          sendNotification(
            '🔥 Streak en danger !',
            `Tu vas casser ton streak de ${streak.current} jours. Il reste encore le temps !`
          );
        }
      }, delay22h);
      _scheduledTimers.push(id);
    }
  }

  /* ── Notification de bienvenue au matin (8h) si pas encore vue ── */
  const reminder8h = new Date(now);
  reminder8h.setHours(8, 0, 0, 0);
  const delay8h = reminder8h - now;

  if (delay8h > 0 && habitsTotal > 0) {
    const id = setTimeout(() => {
      const pts = habitsTotal * 10 + (streak.current >= 5 ? 20 : 0);
      sendNotification(
        `Bonjour 👋 ${streak.current > 0 ? `Streak ${streak.current} jours 🔥` : ''}`,
        `Tu peux gagner jusqu'à +${pts} pts aujourd'hui. C'est parti !`
      );
    }, delay8h);
    _scheduledTimers.push(id);
  }
}

/* ── Notification immédiate après completion d'habitude ── */
export function notifyHabitCompleted(habitsDone, habitsTotal, points) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (habitsTotal === 0) return;

  if (habitsDone === habitsTotal) {
    sendNotification(
      '🎉 Journée parfaite !',
      `Toutes les habitudes complètes — +${points} pts aujourd'hui !`
    );
  }
}
