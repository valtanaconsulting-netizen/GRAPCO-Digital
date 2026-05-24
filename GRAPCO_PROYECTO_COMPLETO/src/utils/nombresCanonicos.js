// src/utils/nombresCanonicos.js
// Helper compartido: convierte cualquier variante de un nombre de trabajador
// en SU forma canónica. Lo usan AnalisisHHCross, Tareo, PagoObreros y cualquier
// otra vista que agrupe por trabajador, para que el MISMO obrero escrito con
// distintos espacios / acentos / errores de tipeo cuente como UNA persona.
//
// Reglas:
//   1) "clave dura"     = sin espacios, sin acentos, en mayúsculas → une
//                         diferencias de espaciado (ej. QUISPECONDORI vs QUISPE CONDORI).
//   2) similitud Levenshtein → une errores de tipeo leves.
//   3) Nombre a mostrar: el del registro de Personal (oficial). Si no está
//      en Personal, se elige la variante mejor escrita del propio historial
//      (más separada por espacios, luego la más frecuente).

export const normNombreKey = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9]/g, '');

export const limpiaNombre = (s) => String(s || '').trim().replace(/\s+/g, ' ');

// Distancia de edición (Levenshtein) — detecta nombres casi idénticos.
export const levenshtein = (a, b) => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
};

// Construye un resolverNombre dado el historial y la lista de Personal.
// Devuelve: una función (nombreRaw) → nombreCanónico.
// El resolver acumula todas las variantes vistas, las agrupa por clave dura,
// luego cluster fuzzy entre claves cercanas, y elige una forma canónica por
// cluster (prioridad: Personal → mejor espaciado → más frecuente → más larga).
export function crearResolverNombre(historial = [], personalDB = []) {
  // 1) Mapa Personal: key → nombre oficial
  const personalPorKey = {};
  (personalDB || []).forEach(p => {
    const k = normNombreKey(p && p.nombre);
    if (k && !personalPorKey[k]) personalPorKey[k] = limpiaNombre(p.nombre);
  });

  // 2) Variantes vistas en el historial — incluye capataz y detalleTareo
  const variantes = {};
  const registrar = (nombre) => {
    const k = normNombreKey(nombre);
    if (!k) return;
    const nom = limpiaNombre(nombre);
    if (!variantes[k]) variantes[k] = {};
    variantes[k][nom] = (variantes[k][nom] || 0) + 1;
  };
  (historial || []).forEach(r => {
    if (!r) return;
    registrar(r.capataz);
    (r.detalleTareo || []).forEach(t => { if (t && t.nombre) registrar(t.nombre); });
  });
  // Las personas del registro de Personal cuentan como variantes (aún si nunca
  // aparecieron en un tareo, así su nombre oficial ancla el cluster).
  Object.entries(personalPorKey).forEach(([k, nom]) => {
    if (!variantes[k]) variantes[k] = {};
    variantes[k][nom] = (variantes[k][nom] || 0) + 1;
  });

  // 3) Cluster fuzzy: claves muy parecidas → un mismo "representante".
  const totalDe = (k) => Object.values(variantes[k]).reduce((s, c) => s + c, 0);
  const keysOrden = Object.keys(variantes).sort((a, b) => totalDe(b) - totalDe(a));
  const repDeKey = {};
  const reps = [];
  keysOrden.forEach(k => {
    let asignado = null;
    for (const rep of reps) {
      const minLen = Math.min(k.length, rep.length);
      const umbral = Math.min(4, Math.max(2, Math.round(minLen * 0.16)));
      if (Math.abs(k.length - rep.length) <= umbral && levenshtein(k, rep) <= umbral) {
        asignado = rep; break;
      }
    }
    if (asignado) repDeKey[k] = asignado;
    else { reps.push(k); repDeKey[k] = k; }
  });

  // 4) Nombre canónico por representante
  const variantesPorRep = {};
  Object.keys(variantes).forEach(k => {
    const rep = repDeKey[k];
    if (!variantesPorRep[rep]) variantesPorRep[rep] = {};
    Object.entries(variantes[k]).forEach(([nom, c]) => {
      variantesPorRep[rep][nom] = (variantesPorRep[rep][nom] || 0) + c;
    });
  });
  const canonicoPorRep = {};
  Object.keys(variantesPorRep).forEach(rep => {
    // Si alguna variante coincide con Personal → usar ese nombre oficial.
    let oficial = null;
    Object.keys(variantes).forEach(k => {
      if (repDeKey[k] === rep && personalPorKey[k] && !oficial) oficial = personalPorKey[k];
    });
    if (oficial) { canonicoPorRep[rep] = oficial; return; }
    const vs = Object.entries(variantesPorRep[rep]);
    vs.sort((a, b) => {
      const espA = (a[0].match(/ /g) || []).length;
      const espB = (b[0].match(/ /g) || []).length;
      if (espB !== espA) return espB - espA;   // mejor separado por espacios
      if (b[1] !== a[1]) return b[1] - a[1];   // más frecuente
      return b[0].length - a[0].length;        // más largo
    });
    canonicoPorRep[rep] = vs[0][0];
  });

  // Función resolver: (nombre) → nombre canónico.
  return function resolverNombre(nombre) {
    const k = normNombreKey(nombre);
    if (!k) return limpiaNombre(nombre) || '—';
    return canonicoPorRep[repDeKey[k] || k] || limpiaNombre(nombre) || '—';
  };
}
