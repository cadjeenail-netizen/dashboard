/* ════════════════════════════════════════════════════════
   SERVICE WORKER — Nebula Dashboard PWA
   Stratégie : cache-first pour assets, network-first pour API
   ════════════════════════════════════════════════════════ */

const CACHE_NAME = 'nebula-v3';

/* Assets à mettre en cache immédiatement (app shell) */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/assets/css/design.css',
  '/assets/js/design/bridge.js',
  '/assets/js/design/icons.jsx',
  '/assets/js/design/charts.jsx',
  '/assets/js/design/app.jsx',
  '/assets/js/design/tweaks-panel.jsx',
  '/assets/js/storage.js',
  '/assets/js/scoring.js',
  '/assets/js/notifications.js',
  '/assets/js/habits.js',
  '/assets/js/auth.js',
  '/assets/js/sync.js',
  '/assets/img/nebula-logo.svg',
  '/manifest.json',
];

/* Domaines qui ne doivent JAMAIS être mis en cache */
const NETWORK_ONLY = [
  'supabase.co',
  'wbsapi.withings.net',
  'account.withings.com',
  'googleapis.com',
  'accounts.google.com',
  'open-meteo.com',
];

function isNetworkOnly(url) {
  return NETWORK_ONLY.some(domain => url.includes(domain));
}

function isAsset(url) {
  return url.match(/\.(css|js|jsx|svg|png|jpg|ico|woff2?)(\?.*)?$/) ||
         url.endsWith('/') || url.endsWith('.html');
}

/* ── Install : mettre le shell en cache ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(err => {
        console.warn('[SW] Certains assets non mis en cache:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate : nettoyer les anciens caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch : cache-first pour assets, network-first pour API ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  /* Ignorer les méthodes non-GET */
  if (request.method !== 'GET') return;

  /* Network-only pour les APIs externes */
  if (isNetworkOnly(url)) return;

  /* CDN (React, Babel, Chart.js) : cache-first avec fallback réseau */
  if (url.includes('jsdelivr.net') || url.includes('unpkg.com') || url.includes('fonts.g')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  /* Assets locaux : cache-first, mise à jour en arrière-plan */
  if (isAsset(url) || url.startsWith(self.registration.scope)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});
