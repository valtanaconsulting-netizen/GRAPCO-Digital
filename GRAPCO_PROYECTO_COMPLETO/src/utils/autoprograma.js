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

// Núcleo: árbol WBS (con metrados) → tareas de cronograma (tren de actividades).
//   opts: { horasDia=8, cuadrillaDefault=4, ritmoFrac=0.5 }
//   ritmoFrac = solape del tren: lag(días) = round(duración_previa × ritmoFrac).
export function generarCronogramaDesdeCatalogo(arbol, opts = {}) {
  const horasDia = Math.max(1, opts.horasDia || 8);
  const cuadrillaDefault = Math.max(1, opts.cuadrillaDefault || 4);
  const ritmoFrac = opts.ritmoFrac != null ? opts.ritmoFrac : 0.5;

  const tareas = [];
  let id = 0;
  let prevLeaf = null; // { id, dur } — la última actividad hoja, para encadenar el tren
  let nHojas = 0, hhTotal = 0;
  const detalleCuadrillas = {};

  (arbol || []).forEach((p) => {
    // Sub-partidas que tienen al menos 1 actividad con HH > 0 (metrado capturado)
    const subs = (p.subpartidas || []).map((s) => {
      const acts = (s.actividades || []).map((a) => {
        const hh = calcActividad(a).contractualHH || 0;
        return { a, hh };
      }).filter((x) => x.hh > 0.0001);
      return { s, acts };
    }).filter((x) => x.acts.length);
    if (!subs.length) return; // partida sin metrados → fuera del cronograma

    const pid = String(++id);
    tareas.push({ id: pid, nombre: (p.nombre || 'PARTIDA').trim(), nivel: 1, duracion: 0, predecesoras: '', avance: 0, inicioManual: null });

    subs.forEach(({ s, acts }) => {
      const sid = String(++id);
      tareas.push({ id: sid, nombre: (s.nombre || 'SUB-PARTIDA').trim(), nivel: 2, duracion: 0, predecesoras: '', avance: 0, inicioManual: null });

      acts.forEach(({ a, hh }) => {
        const crew = cuadrillaDe(a.nombre, cuadrillaDefault);
        const dur = Math.max(1, Math.ceil(hh / (crew * horasDia)));
        const aid = String(++id);
        let pred = '';
        if (prevLeaf) {
          const lag = Math.max(1, Math.round(prevLeaf.dur * ritmoFrac));
          pred = `${prevLeaf.id}SS+${lag}`; // tren: arranca solapado a la anterior
        }
        tareas.push({ id: aid, nombre: (a.nombre || 'ACTIVIDAD').trim(), nivel: 3, duracion: dur, predecesoras: pred, avance: 0, inicioManual: null });
        prevLeaf = { id: aid, dur };
        nHojas++; hhTotal += hh;
        detalleCuadrillas[crew] = (detalleCuadrillas[crew] || 0) + 1;
      });
    });
  });

  return {
    tareas,
    resumen: {
      tareas: tareas.length,
      actividades: nHojas,
      hhTotal: Math.round(hhTotal),
      cuadrillas: detalleCuadrillas, // { tamañoCuadrilla: nActividades }
    },
  };
}
