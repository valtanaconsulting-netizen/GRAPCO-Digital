// src/utils/normalizacion.js
// EL IDIOMA COMÚN del sistema: una sola forma de normalizar el nombre de una
// actividad para que CRUCEN tareos ↔ catálogo WBS ↔ cronograma ↔ CPI ↔ rendimientos.
//
// Criterio (superset de todas las variantes que había dispersas):
//   · sin acentos/diacríticos (NFD)            → "RECTIFICACIÓN" === "RECTIFICACION"
//   · sin sufijo de frente «(F1-PTARI)», «(NAVE)», «(DECANTADOR)»
//   · MAYÚSCULAS, sin puntos finales, sin espacios dobles
//
// Antes esto vivía duplicado (y con criterios distintos) en autoprograma.js,
// indicadoresEjecutivos.js, exportRendimientos.js, Ingeniero.jsx y CronogramaPro.jsx.
// Si dos de esas copias divergían, el avance de un tareo dejaba de llegar al CPI.
// NOTA: VDC.jsx usa un matcher de FASE más agresivo (a propósito) — no usa esto.

export const FRENTE_RE_ACT = /\s*\([^()]*(?:F\s*\d|PTAR|NAVE|DECANTAD)[^()]*\)\s*$/i;

export const normActividad = (s) => {
  let t = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  let prev;
  do { prev = t; t = t.replace(FRENTE_RE_ACT, ''); } while (t !== prev);
  return t.toUpperCase().replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
};

// Variante que además quita CUALQUIER paréntesis (enlaces a nivel de fase/sección).
export const normActSinParen = (s) =>
  normActividad(s).replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
