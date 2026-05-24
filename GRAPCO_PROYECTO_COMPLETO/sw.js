// public/sw.js — Service Worker GRAPCO Produc-App v2 (Bloque 11)
// Estrategias:
//   1. App shell (HTML/JS/CSS) → Network First con fallback a cache
//   2. Assets estáticos (img/font) → Cache First
//   3. APIs Firebase → Network Only (no cachear datos sensibles)
//   4. Offline fallback → página de cortesía

const CACHE_VERSION = 'v4-2026-05-10-stale-while-revalidate';
const CACHE_STATIC = `grapco-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `grapco-dynamic-${CACHE_VERSION}`;

// Recursos críticos que se precachean al instalar el SW
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALACIÓN ──
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versión', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Si algún asset falla, no bloquear instalación
        console.warn('[SW] Precache parcial:', err);
      }))
      .then(() => self.skipWaiting())  // Activar inmediatamente
  );
});

// ── ACTIVACIÓN: limpiar cachés viejas ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando versión', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((n) => n.startsWith('grapco-') && !n.endsWith(CACHE_VERSION))
          .map((n) => { console.log('[SW] Borrando caché vieja:', n); return caches.delete(n); })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: estrategias por tipo de recurso ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. APIs Firebase / Firestore / APS → NUNCA cachear
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('cloudfunctions.net') ||
    url.hostname.includes('autodesk.com')
  ) {
    return;  // Deja pasar al navegador sin tocar
  }

  // 2. Solo manejar GET (skip POST/PUT/DELETE)
  if (event.request.method !== 'GET') return;

  // 3. App shell (HTML) → Network First
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_DYNAMIC).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // 4a. Assets de Vite con hash en el nombre (immutables) → Cache First sí está bien
  //     porque el hash garantiza que un cambio se sirve con otro nombre.
  const isHashedAsset = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(url.pathname);

  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const copy = response.clone();
          caches.open(CACHE_DYNAMIC).then((cache) => cache.put(event.request, copy));
          return response;
        });
      })
    );
    return;
  }

  // 4b. Resto de assets (sin hash o de root) → Stale-While-Revalidate
  //     Sirve rápido del cache pero SIEMPRE intenta refrescar en background.
  //     Evita que un bundle viejo se quede pegado.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const copy = response.clone();
        caches.open(CACHE_DYNAMIC).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => {
        // Fallback offline para imágenes
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="middle" dy=".3em">Sin conexión</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
      return cached || networkFetch;
    })
  );
});

// ── MENSAJES desde la app (ej. forzar update) ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
