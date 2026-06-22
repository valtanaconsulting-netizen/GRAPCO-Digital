// src/nativo.js — Arranque de la app NATIVA (Capacitor)
// =============================================================================
// Cuando GRAPCO corre dentro del contenedor nativo (APK de Android o app de
// iOS), aquí configuramos lo que la web no puede:
//   - Ocultar la barra de estado del sistema (hora / WiFi / batería) para que el
//     navy de GRAPCO cubra TODA la pantalla. Esto es exactamente lo que se pidió
//     y en nativo SÍ funciona en iPhone (a diferencia de la web).
//   - Ocultar el splash nativo en cuanto React ya montó (sin pantallazo blanco).
//
// En el navegador / PWA esta función no hace nada: Capacitor.isNativePlatform()
// devuelve false y salimos de inmediato.
// =============================================================================

import { Capacitor } from '@capacitor/core';

export async function inicializarNativo() {
  // Solo en la app nativa real. En web/PWA: no tocar nada.
  if (!Capacitor?.isNativePlatform?.()) return;

  // ── Barra de estado: ocultarla (pantalla 100% completa) ──
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    // El WebView pinta detrás de la barra (edge-to-edge) y luego la ocultamos:
    // el navy queda pegado al borde superior sin franja.
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    await StatusBar.hide();
  } catch {
    /* plugin ausente o sin soporte: la app sigue funcionando igual */
  }

  // ── Splash nativo: ocultarlo ahora que la UI ya está lista ──
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* sin splash: ignorar */
  }
}
