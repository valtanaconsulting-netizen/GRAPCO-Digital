// src/utils/heroVideo.js
// Videos de fondo (hero) de la plataforma — viven en public/ y se sirven desde la raíz.
// Se elige UNO al azar por carga de página; Login y SelectorPerfil comparten la elección
// (consistencia dentro de la sesión, variedad entre sesiones). Para sumar otro video:
// copia el .mp4 a public/ y agrégalo a HERO_VIDEOS.
//
// Nota de rendimiento: solo se descarga el video elegido (uno por sesión), no todos.

export const HERO_VIDEOS = [
  '/grapco-bg-0723.mp4',
];

// Elegido una sola vez, cuando el módulo se importa por primera vez en la carga.
export const HERO_VIDEO = HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)];
