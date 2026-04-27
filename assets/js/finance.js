/* ════════════════════════════════════════════════════════
   FINANCE.JS — Solde, revenus, dépenses, transactions
   Données mockées — modifiables directement ici
   ════════════════════════════════════════════════════════ */

/* ── Données financières ── */
const FINANCE = {
  solde:   1_842.50,
  revenus:   950.00,
  depenses:  307.50,
};

const TRANSACTIONS = [
  { icon: '💼', name: 'Freelance — Client A',  date: '26 avr.',  amount: +500.00 },
  { icon: '🛒', name: 'Courses alimentaires',  date: '25 avr.',  amount:  -67.30 },
  { icon: '⚡', name: 'Facture EDF',           date: '24 avr.',  amount: -112.00 },
  { icon: '🎓', name: 'Formation Udemy',        date: '22 avr.',  amount:  -29.99 },
];

/**
 * Initialise le module finances
 */
export function initFinance() {
  renderBoxes();
  renderTransactions();
}

function renderBoxes() {
  const el = document.getElementById('finance-boxes');
  if (!el) return;

  el.innerHTML = `
    <div class="finance-box">
      <span class="fb-label">Solde</span>
      <span class="fb-val fb-white mono">${fmt(FINANCE.solde)}</span>
    </div>
    <div class="finance-box">
      <span class="fb-label">Revenus</span>
      <span class="fb-val fb-mint mono">${fmt(FINANCE.revenus)}</span>
    </div>
    <div class="finance-box">
      <span class="fb-label">Dépenses</span>
      <span class="fb-val fb-pink mono">${fmt(FINANCE.depenses)}</span>
    </div>
  `;
}

function renderTransactions() {
  const el = document.getElementById('transactions-list');
  if (!el) return;

  el.innerHTML = TRANSACTIONS.map(tx => {
    const positive = tx.amount >= 0;
    const amountStr = `${positive ? '+' : ''}${fmt(tx.amount)}`;
    return `
      <div class="tx-item">
        <span class="tx-icon">${tx.icon}</span>
        <div class="tx-info">
          <span class="tx-name">${tx.name}</span>
          <span class="tx-date">${tx.date}</span>
        </div>
        <span class="tx-amount ${positive ? 'tx-pos' : 'tx-neg'}">${amountStr}</span>
      </div>
    `;
  }).join('');
}

/* ── Formatage montant ── */
function fmt(val) {
  return Math.abs(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}
