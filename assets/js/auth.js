/* ════════════════════════════════════════════════════════
   AUTH.JS — Authentification multi-utilisateurs Supabase
   Email + mot de passe via Supabase Auth REST
   Session persistée en localStorage (JWT + refresh token)
   ════════════════════════════════════════════════════════ */

import { escHtml } from './esc.js';

const SUPABASE_URL      = 'https://ueduodyudfvuiskpjzyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZHVvZHl1ZGZ2dWlza3Bqenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODUwMjksImV4cCI6MjA5Mjk2MTAyOX0.7TqJREgzTT6cMgxQvemvVsZjtqwg35XPrU82xhvyE5s';
const SESSION_KEY       = 'dashboard_vie_auth_session';

/* ════════════════════════════════════════════════════════
   LECTURE / ÉCRITURE SESSION
   ════════════════════════════════════════════════════════ */

/** Retourne la session sauvée en localStorage, ou null */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/** Retourne true si un access_token valide (non expiré) est présent */
export function isAuthenticated() {
  const s = getSession();
  if (!s?.access_token) return false;
  /* Expire dans moins de 60s → considéré comme expiré */
  if (s.expires_at && Date.now() / 1000 > s.expires_at - 60) return false;
  return true;
}

/** Bearer token à utiliser dans les requêtes Supabase REST */
export function getAccessToken() {
  return getSession()?.access_token || SUPABASE_ANON_KEY;
}

/** ID utilisateur (UUID Supabase) ou 'default' si non authentifié */
export function getUserId() {
  return getSession()?.user?.id || 'default';
}

/** Email de l'utilisateur connecté */
export function getUserEmail() {
  return getSession()?.user?.email || null;
}

function saveSession(data) {
  const s = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user:          data.user,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

/* ════════════════════════════════════════════════════════
   API SUPABASE AUTH
   ════════════════════════════════════════════════════════ */

export async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || 'Email ou mot de passe incorrect.';
    throw new Error(msg);
  }
  return saveSession(data);
}

export async function signUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || 'Erreur lors de la création du compte.';
    throw new Error(msg);
  }
  /* Supabase retourne soit data.session (si email auto-confirmé), soit data directement */
  const session = data.session ?? (data.access_token ? data : null);
  if (session) return saveSession(session);
  /* Email confirmation requise */
  return null;
}

export async function refreshSession() {
  const s = getSession();
  if (!s?.refresh_token) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { localStorage.removeItem(SESSION_KEY); return null; }
    return saveSession(await res.json());
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('dashboard_vie_unlocked');
  location.reload();
}

/* ════════════════════════════════════════════════════════
   MISE À JOUR PROFIL — user_metadata Supabase
   ════════════════════════════════════════════════════════ */
export async function updateProfile(data) {
  const token = getAccessToken();
  if (!token) throw new Error('Non authentifié');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error('Mise à jour profil échouée');
  return res.json();
}

/* ════════════════════════════════════════════════════════
   OAUTH (Google, Apple, etc.)
   Redirection vers Supabase qui gère le flow OAuth
   ════════════════════════════════════════════════════════ */
export function signInWithProvider(provider) {
  const redirectTo = encodeURIComponent(location.origin + location.pathname);
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
  location.href = url;
}

/* ── Recupere l'utilisateur verifie cote serveur via /auth/v1/user ──
   Au lieu de decoder le JWT en clair (non verifie cryptographiquement),
   on demande a Supabase qui valide la signature et renvoie l'user reel. */
async function fetchVerifiedUser(access_token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'apikey':        SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return { id: u.id, email: u.email };
  } catch {
    return null;
  }
}

/* ── Récupère access_token + refresh_token depuis l'URL hash après callback OAuth ── */
async function captureOAuthCallback() {
  if (!location.hash || !location.hash.includes('access_token=')) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  const access_token  = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in    = parseInt(params.get('expires_in') || '3600', 10);
  if (!access_token) return null;

  /* Nettoie l'URL pour pas garder les tokens visibles */
  history.replaceState(null, '', location.pathname + location.search);

  /* Recupere l'user via Supabase (signature JWT validee cote serveur) */
  const user = await fetchVerifiedUser(access_token);
  if (!user) return null; /* Token invalide → on ignore le callback */

  return saveSession({ access_token, refresh_token, expires_in, user });
}

/* ════════════════════════════════════════════════════════
   ÉCRAN DE CONNEXION
   ════════════════════════════════════════════════════════ */

function buildAuthScreen() {
  const el = document.createElement('div');
  el.id = 'auth-screen';
  el.innerHTML = `
    <div class="auth-inner">
      <img src="assets/img/nebula-logo.svg" class="auth-logo" alt="Nebula" />
      <h1 class="auth-brand">Nebula</h1>
      <p class="auth-tagline">Ton univers personnel</p>

      <div class="auth-oauth">
        <button class="auth-oauth-btn" id="oauth-google" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>
        <button class="auth-oauth-btn" id="oauth-github" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.17 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
          </svg>
          Continuer avec GitHub
        </button>
      </div>

      <div class="auth-divider"><span>ou</span></div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-login">Se connecter</button>
        <button class="auth-tab" id="tab-register">Créer un compte</button>
      </div>

      <div class="auth-form">
        <input class="auth-input" id="auth-email"    type="email"    placeholder="Email"         autocomplete="email" />
        <input class="auth-input" id="auth-password" type="password" placeholder="Mot de passe" autocomplete="current-password" />
        <p class="auth-error" id="auth-error"></p>
        <button class="auth-btn-primary" id="auth-submit">Se connecter</button>
      </div>

      <p class="auth-hint" id="auth-hint"></p>
    </div>
  `;
  return el;
}

/* ════════════════════════════════════════════════════════
   EXPORT PRINCIPAL
   Affiche l'écran si non connecté, refresh si expiré
   ════════════════════════════════════════════════════════ */
export async function initAuth() {
  /* Capture le retour OAuth (Google/GitHub) si présent dans l'URL */
  await captureOAuthCallback();

  /* Tente un refresh si token expiré mais refresh_token présent */
  const s = getSession();
  if (s?.refresh_token && !isAuthenticated()) {
    await refreshSession();
  }

  if (isAuthenticated()) return; /* Déjà connecté → on continue */

  /* Affiche l'écran de connexion et attend le succès */
  await new Promise(resolve => {
    const el = buildAuthScreen();
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    const emailEl    = document.getElementById('auth-email');
    const passEl     = document.getElementById('auth-password');
    const errorEl    = document.getElementById('auth-error');
    const submitBtn  = document.getElementById('auth-submit');
    const hintEl     = document.getElementById('auth-hint');
    const tabLogin   = document.getElementById('tab-login');
    const tabRegister= document.getElementById('tab-register');

    let mode = 'login'; /* 'login' | 'register' */

    function setMode(m) {
      mode = m;
      tabLogin.classList.toggle('active', m === 'login');
      tabRegister.classList.toggle('active', m === 'register');
      submitBtn.textContent = m === 'login' ? 'Se connecter' : 'Créer mon compte';
      passEl.autocomplete   = m === 'login' ? 'current-password' : 'new-password';
      errorEl.textContent = '';
      hintEl.textContent  = m === 'register' ? 'Mot de passe : 12 caractères minimum, dont chiffres et lettres.' : '';
    }

    tabLogin.addEventListener('click',    () => setMode('login'));
    tabRegister.addEventListener('click', () => setMode('register'));

    function success() {
      el.classList.add('auth-exit');
      setTimeout(() => {
        el.remove();
        document.body.style.overflow = '';
        resolve();
      }, 380);
    }

    async function handleSubmit() {
      const email    = emailEl.value.trim();
      const password = passEl.value;
      if (!email || !password) {
        errorEl.textContent = 'Remplis tous les champs.';
        return;
      }
      if (mode === 'register') {
        if (password.length < 12) {
          errorEl.textContent = 'Mot de passe : 12 caractères minimum.';
          return;
        }
        if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
          errorEl.textContent = 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
          return;
        }
      }

      submitBtn.disabled    = true;
      submitBtn.textContent = mode === 'login' ? 'Connexion…' : 'Création…';
      errorEl.textContent   = '';

      try {
        if (mode === 'login') {
          await signIn(email, password);
          success();
        } else {
          const session = await signUp(email, password);
          if (session) {
            success();
          } else {
            /* Email confirmation en attente */
            hintEl.textContent  = '';
            errorEl.textContent = '';
            submitBtn.textContent = 'Créer mon compte';
            submitBtn.disabled  = false;
            el.querySelector('.auth-form').innerHTML = `
              <div class="auth-confirm-msg">
                <span class="auth-confirm-icon">✉️</span>
                <p>Un email de confirmation a été envoyé à <strong>${escHtml(email)}</strong>.</p>
                <p>Confirme ton adresse puis reviens te connecter.</p>
                <button class="auth-btn-primary" id="auth-back-login">Se connecter</button>
              </div>
            `;
            document.getElementById('auth-back-login')?.addEventListener('click', () => {
              location.reload();
            });
          }
        }
      } catch (err) {
        errorEl.textContent   = err.message;
        submitBtn.disabled    = false;
        submitBtn.textContent = mode === 'login' ? 'Se connecter' : 'Créer mon compte';
      }
    }

    submitBtn.addEventListener('click', handleSubmit);
    [emailEl, passEl].forEach(inp => {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    });

    /* OAuth Google / Apple → redirection (la page recharge au retour) */
    document.getElementById('oauth-google')?.addEventListener('click', () => {
      signInWithProvider('google');
    });
    document.getElementById('oauth-github')?.addEventListener('click', () => {
      signInWithProvider('github');
    });

    /* Focus auto sur l'email */
    setTimeout(() => emailEl.focus(), 100);
  });
}
