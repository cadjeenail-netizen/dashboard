/* ════════════════════════════════════════════════════════
   WITHINGS.JS — OAuth client-side + récupération données santé
   Compatible GitHub Pages (pas de backend)
   Tokens stockés dans localStorage via storage.js
   ════════════════════════════════════════════════════════ */

import { get, set, remove } from './storage.js';

/* ── Credentials Withings (client-side, usage personnel) ── */
const CLIENT_ID     = '56e3a4dbeadf02b036a408d587e6db1961f2ab6b9790bfe79009fb826be8b861';
const CLIENT_SECRET = '274de3e024f6312b812470ae04cd5959b078b926106e7e97bbc55e1067a28d86';
const REDIRECT_URI  = 'https://cadjeenail-netizen.github.io/dashboard/';
const TOKEN_URL     = 'https://wbsapi.withings.net/v2/oauth2';
const API_URL       = 'https://wbsapi.withings.net';

/* ── Helpers token ── */
export function getAccessToken()  { return get('w_access', null); }
export function getRefreshToken() { return get('w_refresh', null); }
function getExpiresAt()  { return get('w_exp', 0); }
export function isConnected() { return !!getAccessToken(); }

function saveTokens({ access_token, refresh_token, expires_in }) {
  set('w_access',  access_token);
  set('w_refresh', refresh_token);
  set('w_exp',     Date.now() + expires_in * 1000);
}

export function disconnect() {
  remove('w_access'); remove('w_refresh'); remove('w_exp');
}

/* ── Vérifie si le token est expiré (buffer 2 min) ── */
function isTokenExpired() {
  return Date.now() >= getExpiresAt() - 120_000;
}

/* ── Refresh du token ── */
async function refreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('Pas de refresh token');

  const body = new URLSearchParams({
    action:        'requesttoken',
    grant_type:    'refresh_token',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refresh,
  });

  const res  = await fetch(TOKEN_URL, { method: 'POST', body });
  const json = await res.json();
  if (json.status !== 0) throw new Error('Refresh échoué : ' + JSON.stringify(json));
  saveTokens(json.body);
  return json.body.access_token;
}

/* ── Obtenir un token valide ── */
async function validToken() {
  if (isTokenExpired()) return await refreshToken();
  return getAccessToken();
}

/* ════════════════════════════════════════════════════════
   OAUTH FLOW
   1. startOAuth()   → redirige vers Withings
   2. handleCallback() → échange le code contre un token
   ════════════════════════════════════════════════════════ */
export function startOAuth() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         'user.activity,user.sleepevents,user.metrics',
    state:         'dashboard-vie-' + Date.now(),
  });
  window.location.href = `https://account.withings.com/oauth2_user/authorize2?${params}`;
}

export async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  if (!code) return false;

  /* Nettoie l'URL sans recharger */
  window.history.replaceState({}, document.title, window.location.pathname);

  const body = new URLSearchParams({
    action:        'requesttoken',
    grant_type:    'authorization_code',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri:  REDIRECT_URI,
  });

  const res  = await fetch(TOKEN_URL, { method: 'POST', body });
  const json = await res.json();
  if (json.status !== 0) throw new Error('Token exchange échoué : ' + JSON.stringify(json));
  saveTokens(json.body);
  return true;
}

/* ════════════════════════════════════════════════════════
   API CALLS
   ════════════════════════════════════════════════════════ */

/* ── Activité (pas) sur N jours ── */
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

  const res  = await fetch(`${API_URL}/v2/measure?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.status !== 0) throw new Error('getactivity: ' + json.status);
  return json.body.activities || [];
}

/* ── Sommeil (durée par nuit) ── */
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

  const res  = await fetch(`${API_URL}/v2/sleep?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.status !== 0) return [];
  return json.body.series || [];
}

/* ── Mesures corporelles (poids, FC) ── */
export async function getMeasures() {
  const token = await validToken();
  const params = new URLSearchParams({
    action:   'getmeas',
    meastype: '1,11', // 1=poids, 11=FC
    lastupdate: Math.floor((Date.now() - 30 * 86400_000) / 1000),
  });

  const res  = await fetch(`${API_URL}/measure?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.status !== 0) return { weight: [], heartrate: [] };

  const weight    = [];
  const heartrate = [];

  for (const group of (json.body.measuregrps || [])) {
    const date = new Date(group.date * 1000).toISOString().slice(0,10);
    for (const m of group.measures) {
      const val = m.value * Math.pow(10, m.unit);
      if (m.type === 1)  weight.push({ date, val: Math.round(val * 10) / 10 });
      if (m.type === 11) heartrate.push({ date, val: Math.round(val) });
    }
  }
  return { weight, heartrate };
}

/* ── Aujourd'hui ── */
export async function getTodaySteps() {
  const data = await getStepsHistory(1);
  return data.length > 0 ? (data[0].steps || 0) : 0;
}
