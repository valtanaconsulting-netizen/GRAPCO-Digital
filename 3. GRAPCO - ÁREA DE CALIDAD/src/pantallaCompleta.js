// src/pantallaCompleta.js — Pantalla completa REAL en móvil
// =============================================================================
// Oculta la barra de estado del sistema (hora, WiFi, batería) usando la
// Fullscreen API en el PRIMER toque del usuario.
//
// ¿Por qué hace falta esto si el manifest ya dice "display": "fullscreen"?
//   El manifest SOLO oculta la barra en una PWA instalada DESPUÉS del cambio:
//   Android "congela" el modo de pantalla en el momento de instalar. Una PWA
//   instalada en modo "standalone" (el viejo) seguirá mostrando la barra para
//   siempre, aunque el manifest ya sea fullscreen, hasta que se reinstale.
//   En una pestaña de navegador tampoco aplica el display del manifest.
//   La Fullscreen API SÍ oculta la barra sin reinstalar nada.
//
// La API exige que la llamada ocurra dentro de un gesto del usuario (un toque),
// así que enganchamos el primer toque y pedimos pantalla completa ahí.
//
// iOS / Safari: NO soporta requestFullscreen fuera de <video>. En iPhone es
// IMPOSIBLE ocultar la barra de estado desde la web (límite de Apple); ahí esta
// función no hace nada y la app simplemente pinta bajo la barra (full-bleed).
// =============================================================================

export function activarPantallaCompletaEnPrimerToque() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ── DESACTIVADO (23/06/2026) ────────────────────────────────────────────
  // Ya NO forzamos pantalla completa. El usuario quiere que se VEAN la barra de
  // estado (hora/batería) y los 3 botones de navegación del sistema. Pedir la
  // Fullscreen API los OCULTABA, que es justo lo contrario. La PWA ahora corre
  // en modo "standalone" (manifest), que mantiene ambas barras visibles con el
  // navy de theme-color. Dejamos la función como no-op para no tocar el wiring
  // en main.jsx y conservar el historial/explicación.
  return;
  // eslint-disable-next-line no-unreachable

  // App nativa (Capacitor): la barra de estado la maneja inicializarNativo()
  // con el plugin StatusBar. No usamos la Fullscreen API web aquí.
  if (window.Capacitor?.isNativePlatform?.()) return;

  // Ya corremos como PWA instalada en modo fullscreen → el sistema ya ocultó la
  // barra; no hay nada que hacer.
  const yaEsFullscreen = window.matchMedia?.('(display-mode: fullscreen)')?.matches;
  if (yaEsFullscreen) return;

  // Solo en pantallas táctiles y "chicas" (teléfono/tablet). En un escritorio
  // forzar pantalla completa al primer clic sería molesto e inesperado.
  const esTactil = window.matchMedia?.('(pointer: coarse)')?.matches;
  const esChica = window.innerWidth <= 1024;
  if (!esTactil || !esChica) return;

  const el = document.documentElement;
  const pedirFullscreen =
    el.requestFullscreen ||
    el.webkitRequestFullscreen || // Safari/Chrome viejos
    el.mozRequestFullScreen ||    // Firefox viejo
    el.msRequestFullscreen;       // Edge viejo
  // iOS Safari entra por aquí: no existe la API → salimos sin romper nada.
  if (typeof pedirFullscreen !== 'function') return;

  let yaIntentado = false;
  const intentar = () => {
    if (yaIntentado) return;
    yaIntentado = true;
    limpiar();
    try {
      // navigationUI:'hide' pide ocultar también la UI de navegación cuando se
      // pueda. Si el navegador rechaza (gesto no válido), lo ignoramos en silencio.
      const r = pedirFullscreen.call(el, { navigationUI: 'hide' });
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch {
      /* gesto inválido o bloqueado por el navegador: no pasa nada */
    }
  };

  const limpiar = () => {
    document.removeEventListener('pointerdown', intentar);
    document.removeEventListener('touchend', intentar);
    document.removeEventListener('click', intentar);
  };

  // El primer gesto real del usuario (toque o clic) dispara la pantalla completa.
  // Si luego el usuario sale a propósito, NO insistimos: lo dejamos en paz.
  document.addEventListener('pointerdown', intentar, { passive: true });
  document.addEventListener('touchend', intentar, { passive: true });
  document.addEventListener('click', intentar);
}
