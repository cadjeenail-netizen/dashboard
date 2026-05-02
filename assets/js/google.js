/* ════════════════════════════════════════════════════════
   GOOGLE.JS — OAuth 2.0 Google Calendar via proxy serverless
   ✅ AUCUN secret en clair (CLIENT_SECRET côté Vercel uniquement)
   ════════════════════════════════════════════════════════ */

import { get, set, remove } from './storage.js';

/* ── Public — pas un secret ── */
/* À renseigner : ton CLIENT_ID Google OAuth (créé sur Google Cloud Console) */
const CLIENT_ID    = ''; /* TODO : coller l'OAuth Client ID Google ici */
const REDIRECT_URI = window.location.origin + window.location.pathname;
const API_PROXY    = '/api/google';
const SCOPES       = 'https://www.googleapis.com/auth/calendar.readonly';

const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const CAL_API   = 'https://www.googleapis.com/calendar/v3';

/* ── Tokens ── */
export function getAccessToken()  { return get('g_access', null); }
export function getRefreshToken() { return get('g_refresh', null); }
function getExpiresAt() { return get('g_exp', 0); }
export function isConnected() { return !!getAccessToken(); }

function saveTokens({ access_token, refresh_token, expires_in }) {
  set('g_access', access_token);
  /* Google ne renvoie le refresh_token qu'au PREMIER échange (sauf prompt=consent) */
  if (refresh_token) set('g_refresh', refresh_token);
  set('g_exp', Date.now() + (expires_in || 3600) * 1000);
}

export function disconnect() {
  remove('g_access'); remove('g_refresh'); remove('g_exp');
}

function isTokenExpired() {
  return Date.now() >= getExpiresAt() - 120_000;
}

/* ── Refresh via le proxy ── */
async function refreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('Pas de refresh token Google');
  const res = await fetch(API_PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'refresh', refresh_token: refresh }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Refresh Google échoué : ' + JSON.stringify(data));
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
function generateState() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function startOAuth() {
  if (!CLIENT_ID) {
    alert("CLIENT_ID Google manquant. Configure-le dans assets/js/google.js puis redéploie.");
    return;
  }
  const state = generateState();
  sessionStorage.setItem('google_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
    access_type:   'offline',  /* nécessaire pour obtenir un refresh_token */
    prompt:        'consent',  /* force le retour du refresh_token à chaque connexion */
    state,
  });
  window.location.href = `${AUTH_URL}?${params}`;
}

export async function handleCallback() {
  const params      = new URLSearchParams(window.location.search);
  const code        = params.get('code');
  const returnedSt  = params.get('state');
  const scope       = params.get('scope');
  /* On filtre : le callback Withings utilise aussi ?code=, on évite les collisions
     en vérifiant le scope OU le state stocké */
  if (!code) return false;
  const expectedState = sessionStorage.getItem('google_oauth_state');
  if (!expectedState) return false;  /* pas notre callback */
  if (expectedState !== returnedSt) {
    sessionStorage.removeItem('google_oauth_state');
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error('OAuth state Google invalide — CSRF bloqué.');
  }
  sessionStorage.removeItem('google_oauth_state');
  window.history.replaceState({}, document.title, window.location.pathname);

  const res = await fetch(API_PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'exchange_code', code, redirect_uri: REDIRECT_URI }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token exchange Google échoué : ' + JSON.stringify(data));
  saveTokens(data);
  return true;
}

/* ════════════════════════════════════════════════════════
   APPELS API CALENDAR
   ════════════════════════════════════════════════════════ */

/* Liste les calendriers de l'utilisateur */
export async function listCalendars() {
  const token = await validToken();
  const res = await fetch(`${CAL_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('listCalendars: ' + res.status);
  const json = await res.json();
  return json.items || [];
}

/* Liste les événements à venir d'un calendrier (par défaut "primary") */
export async function listUpcomingEvents({ calendarId = 'primary', maxResults = 10, days = 7 } = {}) {
  const token = await validToken();
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 86400_000).toISOString();
  const params = new URLSearchParams({
    timeMin, timeMax, maxResults: String(maxResults),
    singleEvents: 'true', orderBy: 'startTime',
  });
  const res = await fetch(`${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('listEvents: ' + res.status);
  const json = await res.json();
  return json.items || [];
}

/* Événements du jour (pratique pour le dashboard Agenda) */
export async function getTodayEvents(calendarId = 'primary') {
  const token = await validToken();
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  const res = await fetch(`${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.items || [];
}
