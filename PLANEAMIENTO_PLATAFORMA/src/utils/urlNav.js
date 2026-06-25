// src/utils/urlNav.js
// Deep-linking por hash: la URL recuerda el ÁREA y el MÓDULO activos
// (ej. #/calidad  ·  #/ingeniero/cronogramaobra). Esto permite tener
// VARIAS PESTAÑAS del navegador en áreas distintas a la vez (una en
// Calidad, otra en Planeamiento) — cada pestaña vive su propia ruta.

export function leerRutaHash() {
  const m = String(window.location.hash || '').match(/^#\/([\w-]+)(?:\/([\w-]+))?/);
  if (!m) return null;
  return { area: m[1], modulo: m[2] || null };
}

export function escribirRutaHash(area, modulo) {
  if (!area) return;
  const h = `#/${area}${modulo ? `/${modulo}` : ''}`;
  if (window.location.hash !== h) {
    try { window.history.replaceState(null, '', h); } catch { window.location.hash = h; }
  }
}

export function limpiarRutaHash() {
  if (window.location.hash) {
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { window.location.hash = ''; }
  }
}

// URL absoluta para abrir un área (y módulo) en una pestaña nueva
export function urlDeArea(area, modulo) {
  return `${window.location.pathname}#/${area}${modulo ? `/${modulo}` : ''}`;
}
