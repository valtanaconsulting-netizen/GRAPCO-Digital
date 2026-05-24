// src/main.jsx — Punto de entrada
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/animatedBg.css';
import './styles/global.css';

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