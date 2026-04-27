/* ════════════════════════════════════════════════════════
   MOOD.JS — Humeur du jour + journaling
   Sauvegarde : clé "mood" et "journal" via storage.js
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const TODAY = new Date().toISOString().slice(0, 10); // "2026-04-27"

/**
 * Calcule le score d'humeur pour le score ring
 * mood 1-5 → 20%-100%
 */
export function getMoodScore() {
  const saved = get('mood', null);
  if (!saved || saved.date !== TODAY) return null;
  return saved.value; // 1 à 5
}

/**
 * Initialise le module humeur
 */
export function initMood() {
  const picker    = document.getElementById('mood-picker');
  const journalEl = document.getElementById('journal-input');
  const saveBtn   = document.getElementById('journal-save-btn');
  const savedLbl  = document.getElementById('mood-saved-label');

  if (!picker) return;

  /* ── Restaurer l'état sauvegardé ── */
  const savedMood    = get('mood',    null);
  const savedJournal = get('journal', null);

  if (savedMood && savedMood.date === TODAY) {
    setActiveMood(savedMood.value);
    if (savedLbl) savedLbl.textContent = `Humeur du jour : ${savedMood.label}`;
  }
  if (savedJournal && savedJournal.date === TODAY && journalEl) {
    journalEl.value = savedJournal.text;
  }

  /* ── Clic sur un emoji ── */
  picker.addEventListener('click', e => {
    const btn = e.target.closest('.mood-btn');
    if (!btn) return;

    const value = Number(btn.dataset.mood);
    const label = btn.dataset.label;

    setActiveMood(value);
    set('mood', { value, label, date: TODAY });
    if (savedLbl) savedLbl.textContent = `Humeur du jour : ${label}`;

    /* Notifie app.js pour recalculer le score */
    window.dispatchEvent(new CustomEvent('mood-changed', { detail: { value } }));
  });

  /* ── Sauvegarde du journal ── */
  function saveJournal() {
    if (!journalEl) return;
    set('journal', { text: journalEl.value, date: TODAY });
    if (saveBtn) {
      saveBtn.textContent = '✓ Sauvegardé';
      setTimeout(() => { saveBtn.textContent = 'Sauvegarder'; }, 1800);
    }
  }

  if (saveBtn)   saveBtn.addEventListener('click', saveJournal);
  if (journalEl) {
    journalEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveJournal();
    });
  }
}

/* ── Helpers ── */
function setActiveMood(value) {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.mood) === value);
  });
}
