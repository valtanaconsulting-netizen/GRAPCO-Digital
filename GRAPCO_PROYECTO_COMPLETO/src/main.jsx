// src/main.jsx — Punto de entrada
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Fuentes AUTO-HOSPEDADAS (offline-first, sin Google Fonts ni cascada @import render-blocking).
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-700.css';
import './styles/animatedBg.css';
import './styles/global.css';

// ── Auto-recuperación tras un deploy ──
// Si hubo un deploy mientras la app estaba abierta, los chunks viejos (hash
// distinto) ya no existen en el hosting y el lazy-load falla con "Failed to
// fetch dynamically imported module". Vite emite vite:preloadError justo para
// esto: recargamos UNA vez para tomar el index nuevo (guard en sessionStorage
// evita bucles de recarga si el problema persiste).
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'grapco_chunk_reload';
  const ultimo = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - ultimo < 30000) return; // ya recargamos hace <30 s → que actúe el ErrorBoundary
  sessionStorage.setItem(KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

// ── Detector de versión nueva (rompe el caché viejo de la PWA) ──
// Al arrancar y al volver a la pestaña, compara el bundle que ESTÁ corriendo
// contra el index.html FRESCO del servidor. Si el hosting tiene una versión
// nueva, purga caches + service worker y recarga UNA vez. Se ejecuta al inicio
// (antes de que el usuario trabaje), así nunca queda atascado en una build vieja.
async function verificarVersion() {
  try {
    const corriendo = document.querySelector('script[type="module"][src*="/assets/index-"]')?.src || '';
    const hashLocal = (corriendo.match(/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    if (!hashLocal) return;
    const html = await fetch('/index.html', { cache: 'no-store' }).then(r => r.text());
    const hashServidor = (html.match(/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    if (hashServidor && hashServidor !== hashLocal) {
      const KEY = 'grapco_version_reload';
      if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 20000) return; // anti-bucle
      sessionStorage.setItem(KEY, String(Date.now()));
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
        await Promise.all(regs.map(r => r.unregister()));
        const keys = await caches?.keys?.() || [];
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch { /* sin SW/caches: igual recargamos */ }
      window.location.reload();
    }
  } catch { /* offline o sin red: no forzar nada */ }
}
verificarVersion();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificarVersion(); });
// Chequeo PERIÓDICO (cada 5 min): una PWA instalada en escritorio/kiosko puede
// quedar horas abierta y enfocada → 'visibilitychange' nunca dispara y no se
// enteraría de un deploy nuevo. Este intervalo garantiza que tome la última
// versión sin que nadie tenga que cerrar/reabrir ni limpiar caché.
setInterval(verificarVersion, 5 * 60 * 1000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Service Worker para PWA instalable ──
// /sw.js cachea el app-shell y permite uso offline + install prompt en Chrome/Edge.
// El query ?v=BUILD_ID cambia en CADA build → el navegador detecta un SW nuevo,
// lo instala y, al tomar control, recarga la página una sola vez para que el
// usuario reciba SIEMPRE la última versión sin limpiar caché manualmente.
// Solo se registra en HTTPS o localhost (requisito PWA).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

  // Solo recargar si YA había un SW controlando (es una actualización real,
  // no la primera instalación). Evita un reload innecesario en la 1ª visita.
  const hadController = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || recargando) return;
    recargando = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`, { scope: '/' })
      .then(reg => {
        console.log('[PWA] Service Worker registrado:', reg.scope, 'build', BUILD_ID);
        // Si hay un SW esperando, pídele que active ya.
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
        // Revisar actualizaciones al volver a la pestaña.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(err => console.warn('[PWA] Registro de SW falló:', err));
  });
}