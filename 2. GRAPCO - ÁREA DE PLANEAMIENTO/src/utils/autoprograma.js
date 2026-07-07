// src/utils/autoprograma.js
// AUTO-PROGRAMACIÓN: convierte el catálogo WBS (con metrados ya capturados →
// HH = metrado × IP) en un CRONOGRAMA listo para CronogramaPro / CPM.
//
// Modelo elegido por el usuario:
//   · Cuadrilla POR ACTIVIDAD  → duración(días) = HH ÷ (nº obreros × horas/día)
//     El nº de obreros sale de la sectorización real de CREDITEX (campo `mo`)
//     cuando la actividad coincide; si no, de una tabla por TIPO de trabajo;
//     si tampoco, de un valor por defecto configurable.
//   · TREN DE ACTIVIDADES (Lean, flujo continuo) → cada actividad arranca con un
//     pequeño solape sobre la anterior (dependencia SS+lag). El lag (ritmo) es
//     una fracción de la duración previa. El motor CPM (cpm.js) ya entiende
//     "idSS+lag" y produce la cascada diagonal característica del tren.
//
// Salida: { tareas, resumen } donde cada tarea respeta el esquema de
// Cronogramas/{proyectoId}: { id, nombre, nivel, duracion, predecesoras, avance, inicioManual }.

import { calcActividad } from './catalogoWbs';
import { SECTORIZACION } from '../data/sectorizacionCreditex';
import { normActividad } from './normalizacion';

// Idioma común: misma normalización que usa el cruce tareo↔catálogo↔cronograma.
export const normNombre = normActividad;

// Cuadrillas REALES de la sectorización de CREDITEX (nº obreros = campo `mo`).
const CUADRILLA_SECTORIZACION = (() => {
  const m = {};
  (SECTORIZACION?.actividades || []).forEach((a) => {
    if (a && a.mo) m[normNombre(a.actividad)] = a.mo;
  });
  return m;
})();

// Cuadrilla típica por TIPO de trabajo (nº de obreros). Cubre las actividades que
// no están en la sectorización. Patrones SIN acentos (porque normNombre los quita).
const CUADRILLA_POR_TIPO = [
  [/EXCAVAC/, 6],
  [/ACARREO|ELIMINAC|DESMONTE|DESPERDICIO/, 3],
  [/HABILITAD|ACERO|ARMADUR/, 4],
  [/DESENCOFRAD/, 4],
  [/ENCOFRAD/, 8],
  [/CONCRETO|VACIAD|SOLADO|ZAPATA|LOSA|VIGA|VERTICAL|COLUMNA|MURO DE CONCRETO/, 8],
  [/CURAD/, 1],
  [/TOPOGRAF|TRAZO|REPLANTE/, 2],
  [/ALBANIL|LADRILLO|ASENTAD|TABIQUE/, 4],
  [/TARRAJE|REVOQUE|ENLUCID|EMPAST/, 3],
  [/PINTUR/, 3],
  [/IMPERMEABILIZ|MEDIA CANA|JUNTA/, 3],
  [/INSTALAC|TUBERIA|SANITAR|ELECTRIC|MECANIC/, 3],
  [/PERFILAD|NIVELAC|COMPACTAC|SUBRASANTE|TALUD/, 4],
  [/MOVILIZAC|DESMOVILIZAC|MITIGAC|SENALIZAC|ILUMINAC/, 2],
  [/PRUEBA HIDRAULICA|PRUEBA/, 2],
];

// Devuelve el nº de obreros de la cuadrilla para una actividad.
export const cuadrillaDe = (nombre, porDefecto = 4) => {
  const n = normNombre(nombre);
  if (CUADRILLA_SECTORIZACION[n]) return CUADRILLA_SECTORIZACION[n];
  for (const [re, c] of CUADRILLA_POR_TIPO) if (re.test(n)) return c;
  return Math.max(1, porDefecto);
};

// Días laborables por mes (semanas de 6 días) — para convertir "meses objetivo" a días.
export const DIAS_LAB_POR_MES = 26;

// Escala el lag ("+N"/"-N") de una cadena de predecesoras por un factor.
// Ej: "5SS+10" con f=0.5 → "5SS+5";  "3FS+2,7SS+4" → "3FS+1,7SS+2".
const escalarLag = (pred, f) => (pred || '')
  .split(',')
  .map(tok => tok.trim().replace(/([+-])(\d+)/g, (_, s, n) => s + Math.max(0, Math.round(Number(n) * f))))
  .filter(Boolean)
  .join(',');

/**
 * Comprime (o estira) un cronograma YA EXISTENTE para que su duración se acerque a
 * `objetivoDias`, escalando las duraciones de las hojas y los lags de las predecesoras por
 * un mismo factor = objetivoDias / duracionActual. Sirve para "ajustar al plazo del proyecto"
 * sin re-generar desde el catálogo. `duracionActual` = duración del proyecto según el CPM vivo.
 */
export function comprimirCronograma(tareas, objetivoDias, duracionActual) {
  const obj = Number(objetivoDias) || 0;
  const dur = Number(duracionActual) || 0;
  if (!Array.isArray(tareas) || !tareas.length || obj <= 0 || dur <= 0) return tareas || [];
  const f = Math.max(0.02, obj / dur);          // factor de escala (permite estirar si f>1)
  return tareas.map(t => {
    const esHoja = (t.duracion || 0) > 0;        // las fases/resumen tienen duración 0
    return {
      ...t,
      duracion: esHoja ? Math.max(1, Math.round(t.duracion * f)) : t.duracion,
      predecesoras: escalarLag(t.predecesoras, f),
    };
  });
}

// Núcleo: árbol WBS (con metrados) → tareas de cronograma (tren de actividades).
//   opts: { horasDia=8, cuadrillaDefault=4, ritmoFrac=0.5, duracionObjetivoDias=null }
//   ritmoFrac = solape del tren: lag(días) = round(duración_previa × ritmoFrac).
//   duracionObjetivoDias = si se da, COMPRIME el plan para que termine en ~esos días:
//     primero solapa más las actividades (reduce los lags → más paralelo, manteniendo
//     las duraciones realistas); si aún no cabe (objetivo < actividad más larga), también
//     acorta las duraciones. Así "4 meses" sale en 4 meses sin re-digitar nada.
export function generarCronogramaDesdeCatalogo(arbol, opts = {}) {
  const horasDia = Math.max(1, opts.horasDia || 8);
  const cuadrillaDefault = Math.max(1, opts.cuadrillaDefault || 4);
  const ritmoFrac = opts.ritmoFrac != null ? opts.ritmoFrac : 0.5;
  const objetivo = (opts.duracionObjetivoDias && opts.duracionObjetivoDias > 0) ? opts.duracionObjetivoDias : null;

  // ── Pass 1: estructura plana ordenada + duración/lag NATURALES + timeline serial ──
  const items = []; // { kind:'partida'|'sub'|'leaf', nombre, nivel, dur?, lagNat? }
  let prevDur = null, runStart = 0, naturalEnd = 0, maxDur = 0;
  let nHojas = 0, hhTotal = 0;
  const detalleCuadrillas = {};

  (arbol || []).forEach((p) => {
    const subs = (p.subpartidas || []).map((s) => {
      const acts = (s.actividades || []).map((a) => ({ a, hh: calcActividad(a).contractualHH || 0 }))
        .filter((x) => x.hh > 0.0001);
      return { s, acts };
    }).filter((x) => x.acts.length);
    if (!subs.length) return; // partida sin metrados → fuera del cronograma

    items.push({ kind: 'partida', nombre: (p.nombre || 'PARTIDA').trim(), nivel: 1 });
    subs.forEach(({ s, acts }) => {
      items.push({ kind: 'sub', nombre: (s.nombre || 'SUB-PARTIDA').trim(), nivel: 2 });
      acts.forEach(({ a, hh }) => {
        const crew = cuadrillaDe(a.nombre, cuadrillaDefault);
        const dur = Math.max(1, Math.ceil(hh / (crew * horasDia)));
        const lagNat = prevDur != null ? Math.max(1, Math.round(prevDur * ritmoFrac)) : null;
        const start = lagNat != null ? runStart + lagNat : 0; // tren serial natural
        const end = start + dur;
        runStart = start;
        if (end > naturalEnd) naturalEnd = end;
        if (dur > maxDur) maxDur = dur;
        items.push({ kind: 'leaf', nombre: (a.nombre || 'ACTIVIDAD').trim(), nivel: 3, dur, lagNat });
        prevDur = dur;
        nHojas++; hhTotal += hh;
        detalleCuadrillas[crew] = (detalleCuadrillas[crew] || 0) + 1;
      });
    });
  });

  // ── Compresión a la duración objetivo ──
  let lagFactor = 1, durFactor = 1;
  if (objetivo && naturalEnd > 0) {
    if (objetivo >= maxDur) {
      // Cabe acortando solapes (más paralelo); duraciones intactas (realistas).
      lagFactor = Math.max(0, Math.min(1, objetivo / naturalEnd));
    } else {
      // Ni todo en paralelo cabe → además acorta las duraciones a escala.
      durFactor = Math.max(0.1, objetivo / maxDur);
      lagFactor = 0;
    }
  }

  // ── Pass 2: emite tareas con ids, duraciones (×durFactor) y lags (×lagFactor) ──
  const tareas = [];
  let id = 0, prevLeafId = null;
  items.forEach((it) => {
    const tid = String(++id);
    if (it.kind !== 'leaf') {
      tareas.push({ id: tid, nombre: it.nombre, nivel: it.nivel, duracion: 0, predecesoras: '', avance: 0, inicioManual: null });
      return;
    }
    const dur = durFactor === 1 ? it.dur : Math.max(1, Math.round(it.dur * durFactor));
    let pred = '';
    if (prevLeafId != null && it.lagNat != null) {
      const lag = Math.max(0, Math.round(it.lagNat * lagFactor));
      pred = lag > 0 ? `${prevLeafId}SS+${lag}` : `${prevLeafId}SS`; // SS = arranca junto a la previa (paralelo)
    }
    tareas.push({ id: tid, nombre: it.nombre, nivel: 3, duracion: dur, predecesoras: pred, avance: 0, inicioManual: null });
    prevLeafId = tid;
  });

  return {
    tareas,
    resumen: {
      tareas: tareas.length,
      actividades: nHojas,
      hhTotal: Math.round(hhTotal),
      cuadrillas: detalleCuadrillas, // { tamañoCuadrilla: nActividades }
      naturalDias: naturalEnd,       // duración "natural" (sin comprimir)
      objetivoDias: objetivo,
    },
  };
}
