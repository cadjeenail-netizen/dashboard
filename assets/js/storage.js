/* ════════════════════════════════════════════════════════
   STORAGE.JS — Persistance localStorage (module ES6)
   Tous les autres modules importent get/set depuis ici
   ════════════════════════════════════════════════════════ */

const PREFIX = 'dashboard_vie_';

/**
 * Lire une valeur depuis localStorage
 * @param {string} key
 * @param {*} fallback — valeur par défaut si absent
 */
export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Écrire une valeur dans localStorage
 * @param {string} key
 * @param {*} value — doit être sérialisable en JSON
 */
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    /* Notifie le module sync qu'une donnée a changé */
    window.dispatchEvent(new Event('storage-changed'));
  } catch (e) {
    console.warn('[storage] Écriture échouée :', e);
  }
}

/**
 * Supprimer une entrée
 * @param {string} key
 */
export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

/**
 * Vider toutes les données du dashboard
 */
export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k));
}
