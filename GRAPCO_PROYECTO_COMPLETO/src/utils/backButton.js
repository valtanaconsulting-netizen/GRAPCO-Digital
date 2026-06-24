// src/utils/backButton.js — Botón ATRÁS de Android (app nativa Capacitor)
// =============================================================================
// PROBLEMA que resuelve:
//   Sin esto, al pulsar ATRÁS en la pantalla raíz, Android CIERRA la Activity
//   (sale de la app). Al volver, el WebView se relanza y RECARGA TODO desde
//   cero → el capataz pierde el tareo que estaba llenando y aterriza al inicio.
//
// SOLUCIÓN:
//   Interceptamos el botón atrás con @capacitor/app. Cada pantalla puede
//   registrar un "handler" que consume el atrás (cerrar un modal, retroceder
//   un paso, etc.). Si nadie lo consume (estamos en la raíz), usamos el patrón
//   estándar "presiona atrás de nuevo para salir" en vez de cerrar de golpe.
//   Mientras la app NO se cierra, el WebView sigue vivo y el estado se conserva.
//
// En web/PWA esto no aplica (no hay botón atrás físico que cierre el proceso):
// initBackButton() sale de inmediato si no es plataforma nativa.
// =============================================================================

// Pila LIFO de handlers. Cada handler es () => boolean: devuelve true si
// "consumió" el atrás (entonces NO se propaga ni se sale de la app).
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

/**
 * Inicializa el listener del botón atrás UNA sola vez. `showToast` se usa para
 * el aviso "presiona atrás de nuevo para salir".
 */
export async function initBackButton(showToast) {
  if (typeof showToast === 'function') toastFn = showToast;
  if (initHecho) return;
  if (typeof window === 'undefined') return;
  if (!window.Capacitor?.isNativePlatform?.()) return;
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      // 1) ¿Alguna pantalla consume el atrás? (de la más reciente a la más vieja)
      for (let i = pila.length - 1; i >= 0; i--) {
        try { if (pila[i]()) return; } catch (_) { /* handler roto: seguir */ }
      }
      // 2) Nadie lo consumió → estamos en la raíz. Patrón "atrás de nuevo".
      const ahora = Date.now();
      if (ahora - ultimoAtras < 2000) {
        App.exitApp();
        return;
      }
      ultimoAtras = ahora;
      try { toastFn?.('Presiona ATRÁS de nuevo para salir', 'info'); } catch (_) {}
    });
    initHecho = true;
  } catch (_) {
    /* plugin ausente o sin soporte: la app sigue funcionando igual */
  }
}
