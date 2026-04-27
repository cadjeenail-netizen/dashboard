/* ════════════════════════════════════════════════════════
   TODO.JS — Tâches dynamiques avec priorité
   Sauvegarde : clé "todos" via storage.js
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

/* Priorités cycliques à chaque nouvelle tâche */
const PRIOS = ['high', 'medium', 'low'];
let prioIdx = 0;

/**
 * Initialise le module tâches
 */
export function initTodo() {
  const listEl  = document.getElementById('todo-list');
  const inputEl = document.getElementById('todo-input');
  const addBtn  = document.getElementById('todo-add-btn');
  const countEl = document.getElementById('todo-count');

  if (!listEl || !inputEl) return;

  let todos = get('todos', getDefaultTodos());

  /* ── Rendu ── */
  function render() {
    listEl.innerHTML = '';
    const remaining = todos.filter(t => !t.done).length;
    if (countEl) countEl.textContent = `${remaining} restante(s)`;

    todos.forEach((todo, idx) => {
      const li = document.createElement('li');
      li.className = `todo-item${todo.done ? ' done' : ''}`;
      li.dataset.idx = idx;
      li.innerHTML = `
        <div class="todo-cb">
          <span class="todo-cb-check">✓</span>
        </div>
        <span class="todo-prio prio-${todo.prio}"></span>
        <span class="todo-text">${escHtml(todo.text)}</span>
        <button class="todo-del" title="Supprimer" data-del="${idx}">✕</button>
      `;
      listEl.appendChild(li);
    });
  }

  /* ── Ajouter une tâche ── */
  function addTodo() {
    const text = inputEl.value.trim();
    if (!text) return;

    todos.unshift({ text, done: false, prio: PRIOS[prioIdx % PRIOS.length], id: Date.now() });
    prioIdx++;
    set('todos', todos);
    inputEl.value = '';
    render();
  }

  /* ── Événements ── */
  addBtn.addEventListener('click', addTodo);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

  listEl.addEventListener('click', e => {
    /* Supprimer */
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      e.stopPropagation();
      todos.splice(Number(delBtn.dataset.del), 1);
      set('todos', todos);
      render();
      return;
    }

    /* Cocher / décocher */
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const idx = Number(item.dataset.idx);
    todos[idx].done = !todos[idx].done;
    set('todos', todos);
    render();
  });

  render();
}

/* ── Tâches par défaut ── */
function getDefaultTodos() {
  return [
    { text: 'Planifier la semaine',      done: false, prio: 'high',   id: 1 },
    { text: 'Lire 30 minutes',           done: false, prio: 'medium', id: 2 },
    { text: 'Vérifier les finances',     done: false, prio: 'high',   id: 3 },
    { text: 'Faire du sport',            done: true,  prio: 'low',    id: 4 },
  ];
}

/* ── Sécurité XSS ── */
function escHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}
