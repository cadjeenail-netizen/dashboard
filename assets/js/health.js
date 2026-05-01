/* ════════════════════════════════════════════════════════
   HEALTH.JS — Section santé : graphiques Withings
   Gère la connexion OAuth + affichage des données
   ════════════════════════════════════════════════════════ */

import {
  isConnected, startOAuth, handleCallback, disconnect,
  getStepsHistory, getSleepHistory, getMeasures, getTodaySteps,
  getTodayHRHourly
} from './withings.js';

/* ── Chart.js présent via CDN dans index.html ── */

const COLORS = {
  blue:   '#7c4dff',
  green:  '#00f5a0',
  purple: '#a855f7',
  pink:   '#f472b6',
  cyan:   '#00d4ff',
  orange: '#ff6d00',
};

/* Detecte le mode clair pour adapter les couleurs des charts */
function isLight() { return document.documentElement.classList.contains('light-mode'); }

function getTooltip() {
  const light = isLight();
  return {
    backgroundColor: light ? 'rgba(255,255,255,0.97)' : 'rgba(10,12,24,0.95)',
    borderColor:     light ? 'rgba(0,0,0,0.08)'      : 'rgba(255,255,255,0.08)',
    borderWidth:     1,
    titleColor:      light ? '#1a1530'               : '#eef2ff',
    bodyColor:       light ? 'rgba(26,21,48,0.7)'    : 'rgba(255,255,255,0.6)',
    padding:         12,
    cornerRadius:    10,
    displayColors:   false,
  };
}

function getScale() {
  const light    = isLight();
  const gridCol  = light ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.04)';
  const tickCol  = light ? 'rgba(26,21,48,0.55)' : 'rgba(255,255,255,0.35)';
  return {
    x: { grid: { color: gridCol }, ticks: { color: tickCol, font:{size:10} }, border:{display:false} },
    y: { grid: { color: gridCol }, ticks: { color: tickCol, font:{size:10} }, border:{display:false}, beginAtZero:true },
  };
}

/* Garde-fous retro-compatibles (utilisees ailleurs si jamais) */
const TOOLTIP = getTooltip();
const SCALE   = getScale();

function hexGrad(id, hex, alpha=0.25) {
  const canvas = document.getElementById(id);
  if (!canvas) return 'transparent';
  const [r,g,b] = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const g2 = canvas.getContext('2d').createLinearGradient(0,0,0,160);
  g2.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
  return g2;
}

function fmtDate(str) {
  const [,m,d] = str.split('-');
  return `${d}/${m}`;
}

/* Jour de la semaine en FR : "Mar 15", "Mer 16"... */
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
function fmtDay(str) {
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DAYS_FR[date.getUTCDay()]} ${d}`;
}

/* ════════════════════════════════════════════════════════
   INIT PRINCIPAL
   ════════════════════════════════════════════════════════ */
export async function initHealth() {
  /* 1. Gérer le callback OAuth si ?code= dans l'URL */
  const wasCallback = await handleCallback().catch(() => false);

  /* 2. Injecter la section dans le DOM */
  injectHealthSection();

  /* 3. État de connexion */
  if (!isConnected()) {
    showConnectState();
    return;
  }

  /* 4. Connecté → charger et afficher les données */
  showLoadingState();
  await loadAndRender();

  if (wasCallback) {
    showToast('✅ Withings connecté avec succès !');
  }

  /* Re-render des charts au basculement clair/sombre pour mettre a jour les couleurs */
  window.addEventListener('theme-changed', () => {
    if (isConnected()) loadAndRender(currentDays);
  });

  /* Sync forcee depuis le bouton Synchroniser des Parametres */
  window.addEventListener('withings-sync', () => {
    if (isConnected()) loadAndRender(currentDays);
  });
}

/* ════════════════════════════════════════════════════════
   INJECTION HTML
   ════════════════════════════════════════════════════════ */
function injectHealthSection() {
  /* Évite le doublon */
  if (document.getElementById('health-section')) return;

  const section = document.createElement('section');
  section.id = 'health-section';
  section.className = 'health-section fade-in';
  section.style.setProperty('--delay', '0.5s');
  section.innerHTML = `
    <div class="health-header">
      <div class="health-title-row">
        <h2 class="charts-title">Santé <span class="badge-live" id="health-badge"></span></h2>
        <div class="health-actions">
          <div class="filter-group" id="health-filters">
            <button class="filter-btn active" data-days="7">7 j</button>
            <button class="filter-btn" data-days="14">14 j</button>
            <button class="filter-btn" data-days="30">30 j</button>
          </div>
          <button class="btn btn-ghost btn-sm" id="health-disconnect-btn" style="display:none">Déconnecter</button>
        </div>
      </div>
    </div>

    <!-- État : non connecté -->
    <div class="health-connect-card" id="health-connect-card" style="display:none">
      <div class="hcc-inner">
        <span class="hcc-icon">⌚</span>
        <p class="hcc-title">Connecte ta montre Withings</p>
        <p class="hcc-sub">Visualise tes pas, ton sommeil et ta fréquence cardiaque directement ici.</p>
        <button class="btn btn-primary" id="withings-connect-btn">Connecter Withings</button>
      </div>
    </div>

    <!-- État : chargement -->
    <div class="health-loading" id="health-loading" style="display:none">
      <div class="spinner"></div>
      <p>Récupération des données…</p>
    </div>

    <!-- Grille des graphiques santé -->
    <div class="health-grid" id="health-grid" style="display:none">

      <!-- KPIs santé -->
      <div class="health-kpis" id="health-kpis"></div>

      <!-- Graphique pas -->
      <div class="chart-card health-chart-card">
        <div class="chart-header">
          <div class="chart-label"><span class="chart-dot" style="background:#4f8ef7;box-shadow:0 0 6px #4f8ef7"></span>Pas par jour</div>
          <span class="chart-stat" id="stat-steps-avg">—</span>
        </div>
        <div class="chart-wrap"><canvas id="hc-steps"></canvas></div>
      </div>

      <!-- Graphique sommeil -->
      <div class="chart-card health-chart-card">
        <div class="chart-header">
          <div class="chart-label"><span class="chart-dot" style="background:#a855f7;box-shadow:0 0 6px #a855f7"></span>Sommeil (heures)</div>
          <span class="chart-stat" id="stat-sleep-avg">—</span>
        </div>
        <div class="chart-wrap"><canvas id="hc-sleep"></canvas></div>
      </div>

      <!-- Graphique FC -->
      <div class="chart-card health-chart-card" id="hc-hr-card">
        <div class="chart-header">
          <div class="chart-label"><span class="chart-dot" style="background:#f472b6;box-shadow:0 0 6px #f472b6"></span>Fréquence cardiaque</div>
          <span class="chart-stat" id="stat-hr">—</span>
        </div>
        <div class="chart-wrap"><canvas id="hc-hr"></canvas></div>
      </div>

      <!-- Graphique poids -->
      <div class="chart-card health-chart-card" id="hc-weight-card">
        <div class="chart-header">
          <div class="chart-label"><span class="chart-dot" style="background:#34d399;box-shadow:0 0 6px #34d399"></span>Poids (kg)</div>
          <span class="chart-stat" id="stat-weight">—</span>
        </div>
        <div class="chart-wrap"><canvas id="hc-weight"></canvas></div>
      </div>

    </div><!-- /health-grid -->

    <!-- Toast -->
    <div class="health-toast" id="health-toast"></div>
  `;

  /* Insérer juste après le greeting (haut du dashboard) */
  const greeting = document.querySelector('.greeting-card');
  if (greeting && greeting.parentNode) {
    greeting.parentNode.insertBefore(section, greeting.nextSibling);
  } else {
    const main = document.querySelector('.main-content');
    if (main) main.insertBefore(section, main.firstChild);
    else document.body.appendChild(section);
  }
}

/* ════════════════════════════════════════════════════════
   ÉTATS
   ════════════════════════════════════════════════════════ */
function showConnectState() {
  document.getElementById('health-connect-card').style.display  = '';
  document.getElementById('health-loading').style.display       = 'none';
  document.getElementById('health-grid').style.display          = 'none';
  /* Cache le bouton Deconnecter (sinon etat hybride si une render fail) */
  const dis = document.getElementById('health-disconnect-btn');
  if (dis) dis.style.display = 'none';
  setBadge(false);

  document.getElementById('withings-connect-btn')?.addEventListener('click', startOAuth);
}

function showLoadingState() {
  document.getElementById('health-connect-card').style.display = 'none';
  document.getElementById('health-loading').style.display       = '';
  document.getElementById('health-grid').style.display          = 'none';
}

function showDataState() {
  document.getElementById('health-connect-card').style.display = 'none';
  document.getElementById('health-loading').style.display       = 'none';
  document.getElementById('health-grid').style.display          = '';
  document.getElementById('health-disconnect-btn').style.display = '';
  setBadge(true);

  document.getElementById('health-disconnect-btn').addEventListener('click', () => {
    disconnect();
    location.reload();
  });
}

function setBadge(connected) {
  const badge = document.getElementById('health-badge');
  if (!badge) return;
  badge.textContent = connected ? '● Connecté' : '○ Non connecté';
  badge.style.color = connected ? 'var(--positive)' : 'var(--muted)';
}

/* ════════════════════════════════════════════════════════
   CHARGEMENT ET RENDU
   ════════════════════════════════════════════════════════ */
let currentDays = 7;
let charts      = {};

async function loadAndRender(days = 7) {
  currentDays = days;
  showLoadingState();

  try {
    const [stepsData, sleepData, measures, hrHourly] = await Promise.all([
      getStepsHistory(days).catch(() => []),
      getSleepHistory(days).catch(() => []),
      getMeasures().catch(() => ({ weight: [], heartrate: [] })),
      getTodayHRHourly().catch(() => []),
    ]);
    /* On stocke la FC horaire pour le rendu (au lieu de la FC quotidienne) */
    measures.hrHourly = hrHourly;

    showDataState();

    /* Chaque render dans son propre try/catch pour ne pas casser tout l'affichage */
    try { renderKpis(stepsData, sleepData, measures); }      catch(e) { console.error('[health] renderKpis', e); }
    try { renderStepsChart(stepsData); }                     catch(e) { console.error('[health] renderStepsChart', e); }
    try { renderSleepChart(sleepData); }                     catch(e) { console.error('[health] renderSleepChart', e); }
    try { renderHRChart(measures.hrHourly?.length ? measures.hrHourly : (measures.heartrate || [])); } catch(e) { console.error('[health] renderHRChart', e); }
    try { renderWeightChart(measures.weight || []); }        catch(e) { console.error('[health] renderWeightChart', e); }
    setupFilters();

  } catch (err) {
    console.error('[health] fatal', err);
    showConnectState();
  }
}

/* ── KPIs santé ── */
function renderKpis(stepsData, sleepData, measures) {
  const el = document.getElementById('health-kpis');
  if (!el) return;

  const avgSteps = stepsData.length
    ? Math.round(stepsData.reduce((a,b) => a + (b.steps||0), 0) / stepsData.length)
    : 0;

  const todaySteps = stepsData.length ? (stepsData[stepsData.length-1].steps || 0) : 0;

  const totalSleepSec = sleepData.reduce((acc, s) => {
    return acc + (s.data?.deepsleepduration||0) + (s.data?.lightsleepduration||0) + (s.data?.remsleepduration||0);
  }, 0);
  const avgSleep = sleepData.length ? (totalSleepSec / sleepData.length / 3600).toFixed(1) : '—';

  /* FC moyenne sur la periode (au lieu de juste la derniere mesure) */
  const hrVals = measures.heartrate.map(h => h.val).filter(v => v > 0);
  const avgHR  = hrVals.length
    ? Math.round(hrVals.reduce((a,b) => a + b, 0) / hrVals.length)
    : '—';
  const lastWeight = measures.weight.slice(-1)[0]?.val ?? '—';

  el.innerHTML = `
    <div class="h-kpi"><span class="h-kpi-label">Pas aujourd'hui</span><span class="h-kpi-val" style="color:#4f8ef7">${todaySteps.toLocaleString('fr-FR')}</span></div>
    <div class="h-kpi"><span class="h-kpi-label">Moy. quotidienne</span><span class="h-kpi-val" style="color:#4f8ef7">${avgSteps.toLocaleString('fr-FR')}</span></div>
    <div class="h-kpi"><span class="h-kpi-label">Sommeil moyen</span><span class="h-kpi-val" style="color:#a855f7">${avgSleep}h</span></div>
    <div class="h-kpi"><span class="h-kpi-label">FC moyenne</span><span class="h-kpi-val" style="color:#f472b6">${avgHR}${avgHR !== '—' ? ' bpm' : ''}</span></div>
    <div class="h-kpi"><span class="h-kpi-label">Poids</span><span class="h-kpi-val" style="color:#34d399">${lastWeight}${lastWeight !== '—' ? ' kg' : ''}</span></div>
  `;

  /* Stats dans les headers de graphiques */
  const avgEl = document.getElementById('stat-steps-avg');
  if (avgEl) avgEl.textContent = `moy. ${avgSteps.toLocaleString('fr-FR')} pas`;

  const slEl = document.getElementById('stat-sleep-avg');
  if (slEl) slEl.textContent = avgSleep !== '—' ? `moy. ${avgSleep}h` : '—';

  const hrEl = document.getElementById('stat-hr');
  if (hrEl) hrEl.textContent = avgHR !== '—' ? `moy. ${avgHR} bpm` : '—';

  const wEl = document.getElementById('stat-weight');
  if (wEl) wEl.textContent = lastWeight !== '—' ? `${lastWeight} kg` : '—';
}

/* ── Créé un dégradé vertical pour les barres ── */
function barGrad(id, hex) {
  const canvas = document.getElementById(id);
  if (!canvas) return hex;
  const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  const ctx = canvas.getContext('2d');
  const h = canvas.offsetHeight || 200;
  const g2 = ctx.createLinearGradient(0, 0, 0, h);
  g2.addColorStop(0,   `rgba(${r},${g},${b},0.95)`);
  g2.addColorStop(0.6, `rgba(${r},${g},${b},0.55)`);
  g2.addColorStop(1,   `rgba(${r},${g},${b},0.1)`);
  return g2;
}

/* ── Graphique pas ── */
function renderStepsChart(data) {
  destroyChart('hc-steps');
  if (!data.length) return;
  const labels = data.map(d => fmtDay(d.date));
  const values = data.map(d => d.steps || 0);

  /* Dégradé violet → cyan selon objectif */
  const bgs = values.map(v => v >= 10000 ? barGrad('hc-steps', '#00d4ff') : barGrad('hc-steps', '#7c4dff'));

  charts['steps'] = new Chart('hc-steps', {
    type: 'bar',
    data: { labels, datasets: [{
      data: values,
      backgroundColor: bgs,
      borderColor: values.map(v => v >= 10000 ? '#00d4ff' : '#7c4dff'),
      borderWidth: 1,
      borderRadius: 12,
      borderSkipped: false,
      hoverBackgroundColor: '#a78bfa',
      barThickness: 'flex',
      maxBarThickness: 42,
    }]},
    options: chartOpts({
      y: {
        ticks: { callback: v => v >= 1000 ? (v/1000)+'k' : v }
      },
      tooltip: { callbacks: {
        label: ctx => `${ctx.parsed.y.toLocaleString('fr-FR')} pas`,
        afterLabel: ctx => ctx.parsed.y >= 10000 ? '✅ Objectif atteint' : `${(10000 - ctx.parsed.y).toLocaleString('fr-FR')} pas restants`
      }}
    }),
  });
}

/* ── Graphique sommeil ── */
function renderSleepChart(data) {
  destroyChart('hc-sleep');
  if (!data.length) {
    document.querySelector('#hc-sleep')?.closest('.health-chart-card')?.classList.add('chart-no-data');
    return;
  }

  const labels = data.map(d => fmtDate(d.startdate
    ? new Date(d.startdate*1000).toISOString().slice(0,10)
    : (d.date || '')));

  const deep  = data.map(d => +((d.data?.deepsleepduration  ||0)/3600).toFixed(2));
  const light = data.map(d => +((d.data?.lightsleepduration ||0)/3600).toFixed(2));
  const rem   = data.map(d => +((d.data?.remsleepduration   ||0)/3600).toFixed(2));

  charts['sleep'] = new Chart('hc-sleep', {
    type: 'bar',
    data: { labels, datasets: [
      { label:'Profond', data:deep,  backgroundColor:'rgba(124,77,255,0.85)', borderRadius:6, borderSkipped:false, stack:'s', maxBarThickness:40 },
      { label:'Léger',   data:light, backgroundColor:'rgba(168,85,247,0.65)', borderRadius:6, borderSkipped:false, stack:'s', maxBarThickness:40 },
      { label:'REM',     data:rem,   backgroundColor:'rgba(0,212,255,0.55)',   borderRadius:6, borderSkipped:false, stack:'s', maxBarThickness:40 },
    ]},
    options: chartOpts({
      stacked: true,
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label} : ${ctx.parsed.y}h` } },
      legend: { display: true, labels: { color:'rgba(255,255,255,0.55)', boxWidth:10, font:{size:11}, padding:12 } },
    }),
  });
}

/* ── Graphique fréquence cardiaque ── */
function renderHRChart(data) {
  destroyChart('hc-hr');
  const card = document.getElementById('hc-hr-card');
  if (!data.length) { if(card) card.style.display='none'; return; }
  if(card) card.style.display='';

  /* Detecte le format : intraday {hour,val} ou journalier {date,val} */
  const isIntraday = data[0] && 'hour' in data[0];

  let labels, values;
  if (isIntraday) {
    /* Intraday : 24 points heure par heure */
    labels = data.map(d => `${String(d.hour).padStart(2,'0')}h`);
    values = data.map(d => d.val); // null pour heures sans donnees
  } else {
    /* Journalier (fallback) */
    const sorted = [...data].sort((a,b) => a.date.localeCompare(b.date)).slice(-currentDays);
    labels = sorted.map(d => fmtDate(d.date));
    values = sorted.map(d => d.val);
  }

  charts['hr'] = new Chart('hc-hr', {
    type: 'line',
    data: { labels, datasets: [{
      data: values,
      borderColor: '#f472b6',
      borderWidth: 3,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#f472b6',
      pointBorderWidth: 2,
      pointRadius: isIntraday ? 3 : 5,
      pointHoverRadius: 8,
      tension: 0.45,
      fill: true,
      spanGaps: true,
      backgroundColor: hexGrad('hc-hr', '#f472b6', 0.35),
    }]},
    options: chartOpts({ tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} bpm` } } }),
  });
}

/* ── Graphique poids ── */
function renderWeightChart(data) {
  destroyChart('hc-weight');
  const card = document.getElementById('hc-weight-card');
  if (!data.length) { if(card) card.style.display='none'; return; }
  if(card) card.style.display='';

  const sorted = [...data].sort((a,b) => a.date.localeCompare(b.date)).slice(-currentDays);
  const labels = sorted.map(d => fmtDate(d.date));
  const values = sorted.map(d => d.val);

  charts['weight'] = new Chart('hc-weight', {
    type: 'line',
    data: { labels, datasets: [{
      data: values,
      borderColor: '#00f5a0',
      borderWidth: 3,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#00f5a0',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
      tension: 0.45,
      fill: true,
      backgroundColor: hexGrad('hc-weight', '#00f5a0', 0.3),
    }]},
    options: chartOpts({ tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} kg` } } }),
  });
}

/* ── Filtres ── */
function setupFilters() {
  document.querySelectorAll('#health-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#health-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAndRender(Number(btn.dataset.days));
    });
  });
}

/* ── Helpers ── */
function destroyChart(id) {
  const key = id.replace('hc-','');
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function chartOpts({ stacked=false, tooltip={}, legend={display:false}, y={} }={}) {
  /* Recalcule les couleurs a chaque rendu pour suivre le mode clair/sombre */
  const TT = getTooltip();
  const SC = getScale();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration:700, easing:'easeOutQuart' },
    plugins: {
      legend,
      tooltip: { ...TT, ...tooltip },
    },
    scales: {
      x: { ...SC.x, stacked },
      y: {
        ...SC.y,
        stacked,
        ...y,
        ticks: { ...SC.y.ticks, ...(y.ticks || {}) },
      },
    },
  };
}

function showToast(msg) {
  const el = document.getElementById('health-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3500);
}
