// src/nativo.js — Arranque de la app NATIVA (Capacitor)
// =============================================================================
// Cuando GRAPCO corre dentro del contenedor nativo (APK de Android o app de
// iOS), aquí configuramos lo que la web no puede:
//   - Edge-to-edge REAL: el navy de GRAPCO se extiende hasta el borde superior,
//     DETRÁS de la barra de estado (hora / WiFi / batería), que queda
//     TRANSPARENTE y visible encima del navy. NO la ocultamos: el usuario quiere
//     ver la hora/batería y que la app ocupe ese espacio (no una franja negra).
//   - La barra de navegación inferior (los 3 botones: atrás / inicio / recientes)
//     se mantiene VISIBLE (no usamos modo inmersivo).
//   - Ocultar el splash nativo en cuanto React ya montó (sin pantallazo blanco).
//
// En el navegador / PWA esta función no hace nada: Capacitor.isNativePlatform()
// devuelve false y salimos de inmediato.
// =============================================================================

import { Capacitor } from '@capacitor/core';

export async function inicializarNativo() {
  // Solo en la app nativa real. En web/PWA: no tocar nada.
  if (!Capacitor?.isNativePlatform?.()) return;

  // ── Splash nativo: ocultarlo CUANTO ANTES (lo primero) ──
  // El WebView ya está pintando el loader inline (#gp-boot navy del index.html),
  // así que al quitar el splash de marca se ve DIRECTO el loader animado, sin la
  // pantalla previa de logo + "PLATAFORMA GRAPCO S.A.C.". No lo encadenamos detrás
  // del setup de la barra de estado (eso lo retrasaba ~1.5 s): se dispara ya, en
  // paralelo. El cold-start nativo es navy sólido (styles.xml) → empalme sin saltos.
  import('@capacitor/splash-screen')
    .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 }))
    .catch(() => { /* sin splash: ignorar */ });

  // ── Barra de estado: edge-to-edge, transparente y VISIBLE (no se oculta) ──
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // El WebView pinta DETRÁS de la barra (overlay) → el navy sube hasta arriba.
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    // Iconos claros (hora/batería en blanco) porque el fondo navy es oscuro.
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    // Fondo de la barra transparente (no franja negra). En overlay el navy del
    // header de la app se ve detrás; aquí solo nos aseguramos de no pintar negro.
    await StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});
    // Importante: NO llamamos a StatusBar.hide(). Ocultarla dejaba el área del
    // notch en negro y desaparecía la hora/batería, que es justo lo que NO se
    // quiere. Edge-to-edge con la barra visible es el comportamiento correcto.
  } catch {
    /* plugin ausente o sin soporte: la app sigue funcionando igual */
  }
}
