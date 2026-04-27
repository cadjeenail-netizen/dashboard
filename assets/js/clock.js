/* ════════════════════════════════════════════════════════
   CLOCK.JS — Heure/date live en français
   Met à jour #header-clock, #header-date, #greeting-text,
   #greeting-sub toutes les secondes
   ════════════════════════════════════════════════════════ */

/* Jours et mois en français */
const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/**
 * Retourne la salutation selon l'heure
 * @param {number} h — heure (0-23)
 */
function getSalutation(h) {
  if (h >= 5  && h < 12) return { text: 'Bonjour 👋',     sub: 'Lance bien ta matinée. Chaque début compte.' };
  if (h >= 12 && h < 18) return { text: 'Bon après-midi ☀️', sub: 'Tu es au meilleur de ta forme. Continue.' };
  if (h >= 18 && h < 22) return { text: 'Bonsoir 🌙',     sub: 'Prends le temps de souffler ce soir.' };
  return { text: 'Bonne nuit 🌟', sub: 'Le repos fait aussi partie du succès.' };
}

/**
 * Formate l'heure en HH:MM:SS
 */
function formatTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Formate la date en "Lundi 27 avril 2026"
 */
function formatDate(d) {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Initialise et démarre l'horloge live
 */
export function initClock() {
  const clockEl    = document.getElementById('header-clock');
  const dateEl     = document.getElementById('header-date');
  const greetEl    = document.getElementById('greeting-text');
  const greetSubEl = document.getElementById('greeting-sub');

  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = formatTime(now);
    if (dateEl)  dateEl.textContent  = formatDate(now);

    /* Salutation : mise à jour une fois par tick (peu coûteux) */
    const sal = getSalutation(now.getHours());
    if (greetEl    && greetEl.textContent    !== sal.text) greetEl.textContent    = sal.text;
    if (greetSubEl && greetSubEl.textContent !== sal.sub)  greetSubEl.textContent = sal.sub;
  }

  tick(); // affichage immédiat
  setInterval(tick, 1000);
}
