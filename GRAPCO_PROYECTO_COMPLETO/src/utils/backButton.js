// src/utils/backButton.js — Botón ATRÁS de Android (APK nativo Y PWA instalada)
// =============================================================================
// PROBLEMA que resuelve:
//   Al pulsar ATRÁS (◁) en la pantalla raíz, Android CIERRA la app. Al volver,
//   se relanza y RECARGA TODO desde cero (splash) → el capataz pierde el punto
//   donde estaba. Pasa tanto en el APK como en la PWA instalada.
//
// SOLUCIÓN (dos plataformas):
//   • APK nativo  → interceptamos con @capacitor/app: el atrás ya no cierra.
//   • PWA instalada → "trampa de historial" (pushState/popstate): el atrás se
//     consume dentro de la app y NUNCA cierra la PWA. Para salir, el usuario usa
//     el botón de INICIO del teléfono (así jamás pierde lo que está llenando).
//
//   En ambos casos, cada pantalla registra un handler (cerrar modal, retroceder
//   de paso, etc.) vía registrarBack(). Si nadie lo consume (raíz), el atrás no
//   cierra: en nativo pide "atrás de nuevo para salir"; en PWA se queda.
//
//   En un navegador NORMAL (pestaña, no instalada) NO atrapamos el atrás: ahí el
//   usuario espera que el atrás navegue/salga como en cualquier web.
// =============================================================================

import { Capacitor } from '@capacitor/core';

// Pila LIFO de handlers. Cada handler es () => boolean: true si "consumió" el atrás.
let pila = [];
let initHecho = false;
let ultimoAtras = 0;
let toastFn = null;

/**
 * Registra un handler de atrás. El último registrado tiene prioridad.
 * Devuelve una función para desregistrarlo (úsala en el cleanup del useEffect).
 */
export function registrarBack(handler) {
  if (typeof handler !== 'function') return () => {};
  pila.push(handler);
  return () => { pila = pila.filter(h => h !== handler); };
}

// ¿Corremos como PWA INSTALADA (no como pestaña normal del navegador)?
function esPWAInstalada() {
  try {
    return window.matchMedia?.('(display-mode: standalone)')?.matches
        || window.matchMedia?.('(display-mode: fullscreen)')?.matches
        || window.matchMedia?.('(display-mode: minimal-ui)')?.matches
        || window.navigator?.standalone === true; // iOS
  } catch { return false; }
}

// Recorre la pila (de la más reciente a la más vieja). Devuelve true si alguna consumió.
function consumir() {
  for (let i = pila.length - 1; i >= 0; i--) {
    try { if (pila[i]()) return true; } catch (_) { /* handler roto: seguir */ }
  }
  return false;
}

/**
 * Inicializa el manejo del botón atrás UNA sola vez. `showToast` se usa para el
 * aviso "presiona atrás de nuevo para salir".
 */
export async function initBackButton(showToast) {
  if (typeof showToast === 'function') toastFn = showToast;
  if (initHecho) return;
  if (typeof window === 'undefined') return;

  // ── APK nativo ──────────────────────────────────────────────────────────
  if (Capacitor?.isNativePlatform?.()) {
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('backButton', () => {
        if (consumir()) return;                 // alguna pantalla lo manejó
        const ahora = Date.now();               // raíz → atrás de nuevo para salir
        if (ahora - ultimoAtras < 2000) { App.exitApp(); return; }
        ultimoAtras = ahora;
        try { toastFn?.('Presiona ATRÁS de nuevo para salir', 'info'); } catch (_) {}
      });
      initHecho = true;
    } catch (_) { /* plugin ausente: nada */ }
    return;
  }

  // ── PWA instalada (web) ─────────────────────────────────────────────────
  // Trampa de historial: el atrás consume nuestro estado "centinela" y lo
  // re-armamos siempre → el atrás nunca cierra la PWA. Salir = botón de inicio.
  if (esPWAInstalada()) {
    initHecho = true;
    try { window.history.pushState({ gp: 1 }, ''); } catch (_) {}
    window.addEventListener('popstate', () => {
      const manejado = consumir();
      // Re-armar SIEMPRE el centinela para seguir atrapando el atrás.
      try { window.history.pushState({ gp: 1 }, ''); } catch (_) {}
      if (!manejado) {
        // Estamos en la raíz: avisar (suave) cómo salir, sin cerrar.
        const ahora = Date.now();
        if (ahora - ultimoAtras > 2000) {
          ultimoAtras = ahora;
          try { toastFn?.('Estás en el inicio · usa el botón de INICIO del teléfono para salir', 'info'); } catch (_) {}
        }
      }
    });
    return;
  }
  // Navegador normal (pestaña): no atrapamos el atrás.
}
