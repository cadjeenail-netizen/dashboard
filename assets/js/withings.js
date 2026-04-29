/* ════════════════════════════════════════════════════════
   WITHINGS.JS — OAuth via API serverless Vercel
   ✅ AUCUN secret en clair dans ce fichier
   Le CLIENT_SECRET vit dans les variables d'env Vercel
   ════════════════════════════════════════════════════════ */

import { get, set, remove } from './storage.js';

/* ── Public — pas un secret ── */
const CLIENT_ID    = '56e3a4dbeadf02b036a408d587e6db1961f2ab6b9790bfe79009fb826be8b861';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const API_PROXY    = '/api/withings';     // notre fonction serverless
const WITHINGS_API = 'https://wbsapi.withings.net';

/* ── Tokens ── */
export function getAccessToken()  { return get('w_access', null); }
export function getRefreshToken() { return get('w_refresh', null); }
function getExpiresAt() { return get('w_exp', 0); }
export function isConnected() { return !!getAccessToken(); }

function saveTokens({ access_token, refresh_token, expires_in }) {
  set('w_access',  access_token);
  set('w_refresh', refresh_token);
  set('w_exp',     Date.now() + expires_in * 1000);
}

export function disconnect() {
  remove('w_access'); remove('w_refresh'); remove('w_exp');
}

function isTokenExpired() {
  return Date.now() >= getExpiresAt() - 120_000;
}

/* ── Refresh via le proxy serverless ── */
async function refreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('Pas de refresh token');

  const res = await fetch(API_PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'refresh', refresh_token: refresh }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Refresh échoué : ' + JSON.stringify(data));
  saveTokens(data);
  return data.access_token;
}

async function validToken() {
  if (isTokenExpired()) return await refreshToken();
  return getAccessToken();
}

/* ════════════════════════════════════════════════════════
   OAUTH FLOW
   ════════════════════════════════════════════════════════ */
/* Génère un state cryptographiquement aléatoire (anti-CSRF) */
function generateState() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function startOAuth() {
  const state = generateState();
  /* sessionStorage : effacé à la fermeture de l'onglet, isolé par origine */
  sessionStorage.setItem('withings_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         'user.activity,user.sleepevents,user.metrics',
    state,
  });
  window.location.href = `https://account.withings.com/oauth2_user/authorize2?${params}`;
}

export async function handleCallback() {
  const params      = new URLSearchParams(window.location.search);
  const code        = params.get('code');
  const returnedSt  = params.get('state');
  if (!code) return false;

  /* Vérifie le state (anti-CSRF) AVANT de nettoyer l'URL */
  const expectedState = sessionStorage.getItem('withings_oauth_state');
  sessionStorage.removeItem('withings_oauth_state');
  if (!expectedState || expectedState !== returnedSt) {
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error('OAuth state invalide — tentative de CSRF bloquée.');
  }

  /* Nettoie l'URL */
  window.history.replaceState({}, document.title, window.location.pathname);

  /* Échange via le proxy (le secret n'est jamais envoyé au navigateur) */
  const res = await fetch(API_PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'exchange_code', code, redirect_uri: REDIRECT_URI }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token exchange échoué : ' + JSON.stringify(data));
  saveTokens(data);
  return true;
}

/* ════════════════════════════════════════════════════════
   APPELS API DIRECTS (avec token Bearer)
   Withings autorise CORS sur les endpoints de données,
   uniquement le token endpoint nécessite un proxy.
   ════════════════════════════════════════════════════════ */

export async function getStepsHistory(days = 7) {
  const token   = await validToken();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const fmt = d => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    action:       'getactivity',
    startdateymd: fmt(startDate),
    enddateymd:   fmt(endDate),
    data_fields:  'steps,calories,distance',
  });

  const res  = await fetch(`${WITHINGS_API}/v2/measure?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.status !== 0) throw new Error('getactivity: ' + json.status);
  return json.body.activities || [];
}

export async function getSleepHistory(days = 7) {
  const token = await validToken();
  const end   = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;

  const params = new URLSearchParams({
    action:    'getsummary',
    startdateymd: new Date(start * 1000).toISOString().slice(0,10),
    enddateymd:   new Date(end   * 1000).toISOString().slice(0,10),
    data_fields: 'nb_rem_episodes,sleep_score,deepsleepduration,lightsleepduration,remsleepduration,wakeupduration',
  });

  const res  = await fetch(`${WITHINGS_API}/v2/sleep?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.status !== 0) return [];
  return json.body.series || [];
}

/**
 * Mesures sante :
 * - Poids : via /measure?action=getmeas (mesures ponctuelles balance)
 * - FC moyenne : via /v2/measure?action=getactivity (tracker continu)
 *   La FC ponctuelle (meastype=11) ne marche que pour ECG/spot, donc
 *   on prend hr_average de l'activite quotidienne, qui correspond a ce
 *   que l'app Withings affiche comme "frequence cardiaque moyenne".
 */
export async function getMeasures(days = 30) {
  const token = await validToken();

  /* ── Poids ── */
  const measParams = new URLSearchParams({
    action:    'getmeas',
    meastype:  '1',
    lastupdate: Math.floor((Date.now() - days * 86400_000) / 1000),
  });
  const measPromise = fetch(`${WITHINGS_API}/measure?${measParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).catch(() => ({ status: -1 }));

  /* ── FC quotidienne via activity ── */
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  const fmt = d => d.toISOString().slice(0,10);
  const actParams = new URLSearchParams({
    action:       'getactivity',
    startdateymd: fmt(startDate),
    enddateymd:   fmt(endDate),
    data_fields:  'hr_average,hr_min,hr_max',
  });
  const actPromise = fetch(`${WITHINGS_API}/v2/measure?${actParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).catch(() => ({ status: -1 }));

  const [measJson, actJson] = await Promise.all([measPromise, actPromise]);

  /* Parse poids */
  const weight = [];
  if (measJson.status === 0) {
    for (const group of (measJson.body?.measuregrps || [])) {
      const date = new Date(group.date * 1000).toISOString().slice(0,10);
      for (const m of group.measures) {
        const val = m.value * Math.pow(10, m.unit);
        if (m.type === 1) weight.push({ date, val: Math.round(val * 10) / 10 });
      }
    }
  }

  /* Parse FC */
  const heartrate = [];
  if (actJson.status === 0) {
    for (const a of (actJson.body?.activities || [])) {
      if (a.hr_average && a.hr_average > 0) {
        heartrate.push({
          date: a.date,
          val:  Math.round(a.hr_average),
          min:  a.hr_min || null,
          max:  a.hr_max || null,
        });
      }
    }
  }

  return { weight, heartrate };
}

/**
 * FC heure par heure pour aujourd'hui (intraday).
 * Retourne [{hour: 0..23, val: bpm}] — moyenne par heure si plusieurs points.
 */
export async function getTodayHRHourly() {
  const token = await validToken();
  const now   = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);

  const params = new URLSearchParams({
    action:      'getintradayactivity',
    startdate:   Math.floor(start.getTime() / 1000),
    enddate:     Math.floor(now.getTime()   / 1000),
    data_fields: 'heart_rate',
  });

  try {
    const res  = await fetch(`${WITHINGS_API}/v2/measure?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.status !== 0) return [];

    /* Bucket par heure (moyenne) */
    const buckets = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
    const series = json.body?.series || {};
    for (const ts in series) {
      const point = series[ts];
      const hr    = point.heart_rate;
      if (!hr || hr <= 0) continue;
      const hour  = new Date(Number(ts) * 1000).getHours();
      buckets[hour].sum += hr;
      buckets[hour].n   += 1;
    }
    return buckets.map((b, h) => ({
      hour: h,
      val:  b.n ? Math.round(b.sum / b.n) : null,
    }));
  } catch {
    return [];
  }
}

export async function getTodaySteps() {
  const data = await getStepsHistory(1);
  return data.length > 0 ? (data[0].steps || 0) : 0;
}
