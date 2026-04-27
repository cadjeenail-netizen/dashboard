/* ════════════════════════════════════════════════════════
   QUOTE.JS — Citations inspirantes avec cycle JS
   5 citations en stock, bouton ↻ pour changer
   ════════════════════════════════════════════════════════ */

const QUOTES = [
  {
    text:   'Le succès n\'est pas final, l\'échec n\'est pas fatal : c\'est le courage de continuer qui compte.',
    author: 'Winston Churchill',
  },
  {
    text:   'La discipline est le pont entre les objectifs et l\'accomplissement.',
    author: 'Jim Rohn',
  },
  {
    text:   'Ce que l\'esprit peut concevoir et croire, il peut l\'atteindre.',
    author: 'Napoleon Hill',
  },
  {
    text:   'Le seul endroit où le succès vient avant le travail, c\'est dans le dictionnaire.',
    author: 'Vidal Sassoon',
  },
  {
    text:   'Ne compte pas les jours, fais que les jours comptent.',
    author: 'Muhammad Ali',
  },
];

let currentIdx = 0;

/**
 * Initialise le module citation
 */
export function initQuote() {
  const textEl   = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  const refreshBtn = document.getElementById('quote-refresh-btn');

  if (!textEl || !authorEl || !refreshBtn) return;

  /* Affiche la première citation */
  display(QUOTES[currentIdx]);

  refreshBtn.addEventListener('click', () => {
    currentIdx = (currentIdx + 1) % QUOTES.length;

    /* Transition de sortie */
    textEl.classList.add('quote-changing');
    authorEl.classList.add('quote-changing');

    setTimeout(() => {
      display(QUOTES[currentIdx]);
      textEl.classList.remove('quote-changing');
      authorEl.classList.remove('quote-changing');
    }, 280);
  });
}

function display({ text, author }) {
  const textEl   = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  if (textEl)   textEl.textContent   = text;
  if (authorEl) authorEl.textContent = author;
}
