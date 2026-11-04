// Service Worker: caché del "app shell" para funcionamiento sin conexión.
// Cambia CACHE_VERSION en cada despliegue para que los clientes reciban la nueva versión.
const CACHE_VERSION = 'cs-v202611041611';
const SHELL = [
  './',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/icon.svg',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/tokens.css',
  './css/views.css',
  './index.html',
  './js/core/app.js',
  './js/core/db.js',
  './js/core/events.js',
  './js/core/schema.js',
  './js/core/settings.js',
  './js/core/store.js',
  './js/core/ui.js',
  './js/core/utils.js',
  './js/main.js',
  './js/services/ai.js',
  './js/services/analytics.js',
  './js/services/api.js',
  './js/services/assistant.js',
  './js/services/demo.js',
  './js/services/methodology.js',
  './js/services/prompts.js',
  './js/services/scriptkit.js',
  './js/services/sync.js',
  './js/services/workflow.js',
  './js/views/brands.js',
  './js/views/calendar.js',
  './js/views/content-production.js',
  './js/views/content-publish.js',
  './js/views/content-script.js',
  './js/views/content.js',
  './js/views/contents.js',
  './js/views/dashboard.js',
  './js/views/ideas.js',
  './js/views/method.js',
  './js/views/results.js',
  './js/views/settings.js',
  './js/views/shared.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' evita que la precarga tome copias antiguas de la caché HTTP del navegador.
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST a Apps Script / Gemini: siempre red
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // APIs externas: nunca se cachean
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'no-cache' }).catch(() => caches.match('./index.html')));
    return;
  }
  // Red primero (siempre la versión más reciente cuando hay internet); la caché solo sin conexión.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(req, { cache: 'no-cache', signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || new Response('Sin conexión', { status: 503, statusText: 'Offline' });
    }
  })());
});
