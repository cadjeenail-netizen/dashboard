/* ════════════════════════════════════════════════════════
   FINANCE.JS — Finances éditables, persistées en localStorage
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';
import { escHtml, escAttr } from './esc.js';

const KEY_FINANCE = 'finance';
const KEY_TX      = 'transactions';

const DEFAULT_FINANCE = { solde: 0, revenus: 0, depenses: 0 };
const DEFAULT_TX = [];

const ICONS = ['💼','🛒','⚡','🎓','🏠','🚗','🍔','💊','🎮','✈️','💰','📱'];

function loadFinance() { return get(KEY_FINANCE, DEFAULT_FINANCE); }
function loadTx()      { return get(KEY_TX, DEFAULT_TX); }
function saveFinance(f){ set(KEY_FINANCE, f); }
function saveTx(tx)    { set(KEY_TX, tx); }

function fmt(val) {
  const currency = get('settings_profile', {}).currency || '€';
  if (currency === '€') return Math.abs(val).toLocaleString('fr-FR', { style:'currency', currency:'EUR' });
  if (currency === '$') return Math.abs(val).toLocaleString('fr-FR', { style:'currency', currency:'USD' });
  if (currency === '£') return Math.abs(val).toLocaleString('fr-FR', { style:'currency', currency:'GBP' });
  return Math.abs(val).toLocaleString('fr-FR') + ' ' + currency;
}

export function initFinance() {
  renderBoxes();
  renderTransactions();
}

/* ── Boîtes solde/revenus/dépenses ── */
function renderBoxes() {
  const el = document.getElementById('finance-boxes');
  if (!el) return;
  const f = loadFinance();

  el.innerHTML = `
    <div class="finance-box" style="cursor:pointer" id="fb-solde">
      <span class="fb-label">Solde</span>
      <span class="fb-val fb-white mono">${fmt(f.solde)}</span>
      <span class="fb-edit-hint">✏️ modifier</span>
    </div>
    <div class="finance-box" style="cursor:pointer" id="fb-revenus">
      <span class="fb-label">Revenus</span>
      <span class="fb-val fb-mint mono">${fmt(f.revenus)}</span>
      <span class="fb-edit-hint">✏️ modifier</span>
    </div>
    <div class="finance-box" style="cursor:pointer" id="fb-depenses">
      <span class="fb-label">Dépenses</span>
      <span class="fb-val fb-pink mono">${fmt(f.depenses)}</span>
      <span class="fb-edit-hint">✏️ modifier</span>
    </div>
  `;

  document.getElementById('fb-solde').onclick   = () => editField('Solde',    'solde');
  document.getElementById('fb-revenus').onclick  = () => editField('Revenus',  'revenus');
  document.getElementById('fb-depenses').onclick = () => editField('Dépenses', 'depenses');
}

function editField(label, key) {
  const f = loadFinance();
  const val = prompt(`${label} actuel : ${fmt(f[key])}\nNouveau montant :`, f[key]);
  if (val === null) return;
  const num = parseFloat(val.replace(',', '.'));
  if (isNaN(num)) return;
  f[key] = num;
  saveFinance(f);
  renderBoxes();
}

/* ── Liste des transactions ── */
function renderTransactions() {
  const el = document.getElementById('transactions-list');
  if (!el) return;
  const txs = loadTx();

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
      <span style="font-size:.8rem;color:var(--muted)">Transactions</span>
      <button class="tx-add-btn" id="tx-add-btn">+ Ajouter</button>
    </div>
    ${txs.length ? txs.map(tx => `
      <div class="tx-item" data-id="${escAttr(tx.id)}">
        <span class="tx-icon">${escHtml(tx.icon)}</span>
        <div class="tx-info">
          <span class="tx-name">${escHtml(tx.name)}</span>
          <span class="tx-date">${escHtml(tx.date)}</span>
        </div>
        <span class="tx-amount ${tx.amount >= 0 ? 'tx-pos' : 'tx-neg'}">${tx.amount >= 0 ? '+' : ''}${fmt(tx.amount)}</span>
        <button class="tx-del" data-id="${escAttr(tx.id)}" title="Supprimer">×</button>
      </div>
    `).join('') : `<p style="color:var(--muted);text-align:center;font-size:.85rem;padding:.5rem 0">Aucune transaction</p>`}
  `;

  document.getElementById('tx-add-btn').onclick = () => openTxModal(null);

  el.querySelectorAll('.tx-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      saveTx(loadTx().filter(t => t.id !== id));
      renderTransactions();
    });
  });
}

function openTxModal(id) {
  const txs = loadTx();
  const tx  = id ? txs.find(t => t.id === id) : null;

  let modal = document.getElementById('tx-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'tx-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)`;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--bg-2);border:1px solid var(--glass-border);border-radius:16px;padding:1.5rem;width:360px;max-width:90%">
      <h3 style="color:var(--white);margin-bottom:1rem">Nouvelle transaction</h3>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Icône</label>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem">
        ${ICONS.map(i => `<span class="tx-icon-pick" data-icon="${i}" style="font-size:1.2rem;cursor:pointer;padding:.2rem .3rem;border-radius:6px;border:1px solid transparent;transition:border .15s">${i}</span>`).join('')}
      </div>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Libellé</label>
      <input id="tm-name" value="${escAttr(tx?.name||'')}" placeholder="Ex: Courses" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--white);padding:.55rem .8rem;font-family:var(--font-ui);font-size:.9rem;margin-bottom:.75rem;outline:none"/>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Montant (négatif = dépense)</label>
      <input id="tm-amount" type="number" step="0.01" value="${escAttr(tx?.amount||'')}" placeholder="Ex: -67.30 ou +500" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--white);padding:.55rem .8rem;font-family:var(--font-mono);font-size:.9rem;margin-bottom:.75rem;outline:none"/>

      <label style="color:var(--muted);font-size:.85rem;display:block;margin-bottom:.25rem">Date</label>
      <input id="tm-date" type="date" value="${escAttr(tx?.rawDate||new Date().toISOString().slice(0,10))}" style="width:100%;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--white);padding:.55rem .8rem;font-family:var(--font-ui);font-size:.9rem;margin-bottom:1.25rem;outline:none"/>

      <div style="display:flex;gap:.5rem">
        <button id="tm-cancel" style="flex:1;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--white);padding:.6rem;border-radius:10px;cursor:pointer;font-family:var(--font-ui)">Annuler</button>
        <button id="tm-save"   style="flex:1;background:var(--violet);border:none;color:#fff;padding:.6rem;border-radius:10px;cursor:pointer;font-weight:600;font-family:var(--font-ui)">Enregistrer</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  let selectedIcon = tx?.icon || '💼';
  modal.querySelectorAll('.tx-icon-pick').forEach(s => {
    if (s.dataset.icon === selectedIcon) s.style.borderColor = 'var(--violet)';
    s.addEventListener('click', () => {
      modal.querySelectorAll('.tx-icon-pick').forEach(x => x.style.borderColor = 'transparent');
      s.style.borderColor = 'var(--violet)';
      selectedIcon = s.dataset.icon;
    });
  });

  document.getElementById('tm-cancel').onclick = () => { modal.style.display = 'none'; };
  document.getElementById('tm-save').onclick = () => {
    const name   = document.getElementById('tm-name').value.trim();
    const amount = parseFloat(document.getElementById('tm-amount').value);
    const rawDate = document.getElementById('tm-date').value;
    if (!name || isNaN(amount)) return;

    /* Format date affiché */
    const d = new Date(rawDate);
    const dateStr = d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }).replace('.','');

    const all = loadTx();
    if (id) {
      const idx = all.findIndex(t => t.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], name, amount, icon: selectedIcon, date: dateStr, rawDate };
    } else {
      all.unshift({ id: Date.now(), icon: selectedIcon, name, amount, date: dateStr, rawDate });
    }
    saveTx(all);
    modal.style.display = 'none';
    renderTransactions();
  };
}
