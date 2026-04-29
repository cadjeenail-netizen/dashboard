/* ════════════════════════════════════════════════════════
   ESC.JS — Échappement HTML pour prévenir les XSS
   À utiliser dès qu'on injecte une donnée utilisateur dans innerHTML
   ════════════════════════════════════════════════════════ */

/**
 * Échappe les caractères HTML dangereux dans une string.
 * Usage : `<span>${escHtml(userInput)}</span>`
 */
export function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Version pour les attributs HTML (échape aussi backtick et =).
 * Usage : `<input value="${escAttr(userInput)}">`
 */
export function escAttr(str) {
  return escHtml(str).replace(/`/g, '&#96;');
}
