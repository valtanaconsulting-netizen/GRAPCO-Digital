// public/sw.js — Service Worker GRAPCO PWA
// Estrategia simple, segura y suficiente para que Chrome/Edge marque la app como
// instalable y permita uso offline básico:
//   - Pre-cachea el app-shell (index.html + íconos críticos)
//   - Network-first para navegación HTML (siempre prefiere fresco, cache como fallback)
//   - Cache-first para assets fingerprinted de Vite (/assets/*.js, *.css)

// La versión sale del query ?v=BUILD_ID con que se registra el SW (main.jsx).
// Cada build trae un BUILD_ID distinto → cache nuevo y purga del anterior.
const BUILD_ID = new URL(self.location).searchParams.get('v') || '2026-05-17';
const CACHE_VERSION = `grapco-${BUILD_ID}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/brand/grapco-192.png',
  '/brand/grapco-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Cachea sin abortar si alguno falla
    await Promise.all(APP_SHELL.map(u => cache.add(u).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Limpiar versiones viejas de cache
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('grapco-') && k !== CACHE_VERSION).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Sólo same-origin (no interceptar Firebase, Google APIs, etc.)
  if (url.origin !== self.location.origin) return;

  // Navegación HTML → network-first
  if (request.mode === 'navigate' || (request.destination === 'document')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match(request) || await caches.match('/index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Assets de Vite y otros estáticos → cache-first
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.match(/\.(png|jpe?g|svg|webp|css|js|woff2?|mp4|webm)$/)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (e) {
        return new Response('', { status: 504 });
      }
    })());
  }
});
