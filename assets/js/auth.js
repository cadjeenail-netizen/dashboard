/* ════════════════════════════════════════════════════════
   AUTH.JS — Authentification multi-utilisateurs Supabase
   Email + mot de passe via Supabase Auth REST
   Session persistée en localStorage (JWT + refresh token)
   ════════════════════════════════════════════════════════ */

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
      hintEl.textContent  = m === 'register' ? 'Mot de passe : 6 caractères minimum.' : '';
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
      if (mode === 'register' && password.length < 6) {
        errorEl.textContent = 'Mot de passe : 6 caractères minimum.';
        return;
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
                <p>Un email de confirmation a été envoyé à <strong>${email}</strong>.</p>
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

    /* Focus auto sur l'email */
    setTimeout(() => emailEl.focus(), 100);
  });
}
