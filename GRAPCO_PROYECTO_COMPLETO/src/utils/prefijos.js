// src/utils/prefijos.js — Motor de PREFIJOS (la LLAVE que une ISP ↔ Valorización ↔ RO).
//
// El prefijo clasifica cada actividad por FAMILIA de trabajo (CON=Concreto, ENC=Encofrado,
// ACE=Acero…). Es el puente que hace "conversar" las tres fuentes:
//   • ISP (Catalogo_WBS) — la producción se organiza por familia → prefijo por familia/descr.
//   • Valorización F07 (PresupuestoF07) — el código de ítem == `wbs` del diccionario → match exacto.
//   • RO — agrupa HH y costo por prefijo/familia.
//
// Fuente del diccionario: src/data/prefijosActividades.json (volcado FIEL del presupuesto
// CREDITEX-PTAR). Aquí se completa con las familias del ISP que el Excel no traía.
import data from '../data/prefijosActividades.json';
import { BASE } from './styles';

// ── Familias del ISP que no estaban en el Excel de prefijos (se añaden como base) ──
const EXTRA = {
  IIEE: { tipo: 'actividad', nombre: 'Instalaciones eléctricas', familia: 'INSTALACIONES ELECTRICAS' },
  EMT:  { tipo: 'actividad', nombre: 'Estructura metálica',      familia: 'ESTRUCTURA METALICA' },
  CTP:  { tipo: 'actividad', nombre: 'Contrapisos',              familia: 'CONTRAPISOS' },
  PIN:  { tipo: 'actividad', nombre: 'Pintura',                  familia: 'PINTURA' },
  IND:  { tipo: 'actividad', nombre: 'Indirectos / Otros',       familia: 'OTROS' },
};

// Diccionario COMPLETO (incluye niveles N2/N3/N4 del presupuesto — se filtran al elegir).
export const PREFIJOS_DICT = { ...data.prefijos, ...EXTRA };

// Solo los prefijos de tipo "actividad" (los asignables a una partida del ISP/Valorización).
export const PREFIJOS_ACTIVIDAD = Object.fromEntries(
  Object.entries(PREFIJOS_DICT).filter(([, p]) => p.tipo === 'actividad'),
);

// ── Normalizadores (idénticos a useAvanceF07Vivo para que el join sea consistente) ──
export const normTxt = (s) => String(s || '').toUpperCase()
  .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
  .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N')
  .replace(/[^A-Z0-9]/g, '');
// "01.01.01" o "1.1.1" → "1.1.1" (sin ceros a la izquierda)
export const itemNorm = (c) => String(c || '').trim().split('.').map(s => String(parseInt(s, 10) || 0)).join('.');

// ── Índices de auto-sugerencia ──
const byWbs = {};   // código de partida (== item F07) → prefijo
const byDesc = {};  // descripción normalizada → prefijo
data.actividades.forEach((a) => {
  if (a.tipo !== 'actividad') return;
  byWbs[itemNorm(a.wbs)] = a.prefijo;
  const d = normTxt(a.descripcion);
  if (d && !byDesc[d]) byDesc[d] = a.prefijo;
});
const famToPref = {}; // familia normalizada → prefijo representativo (1º que aparece)
Object.entries(PREFIJOS_DICT).forEach(([cod, p]) => {
  if (p.familia && !famToPref[normTxt(p.familia)]) famToPref[normTxt(p.familia)] = cod;
});

// Sugiere el prefijo de una actividad. `via` indica con qué confianza se obtuvo:
//   'codigo'  → match exacto por código WBS (alta confianza, Valorización F07)
//   'desc'    → descripción idéntica · 'desc~' → descripción contenida (parcial)
//   'familia' → solo por la familia/partida (baja confianza, revisar)
//   'sin'     → sin sugerencia
export function sugerirPrefijo({ codigo, descripcion, familia } = {}) {
  const c = itemNorm(codigo);
  if (c && byWbs[c]) return { prefijo: byWbs[c], via: 'codigo' };
  const d = normTxt(descripcion);
  if (d && byDesc[d]) return { prefijo: byDesc[d], via: 'desc' };
  if (d.length > 8) {
    for (const k of Object.keys(byDesc)) {
      if (k.length > 8 && (d.includes(k) || k.includes(d))) return { prefijo: byDesc[k], via: 'desc~' };
    }
  }
  const f = normTxt(familia);
  if (f && famToPref[f]) return { prefijo: famToPref[f], via: 'familia' };
  return { prefijo: null, via: 'sin' };
}

export const familiaDe = (cod) => PREFIJOS_DICT[cod]?.familia || PREFIJOS_DICT[cod]?.nombre || cod || '';
export const nombrePrefijo = (cod) => PREFIJOS_DICT[cod]?.nombre || cod || '';

// Color por FAMILIA — paleta FORMAL y RESTRINGIDA (5 tonos de marca, no arcoíris).
// El color agrupa por familia (no por hash del código): varios prefijos de la misma
// familia comparten tono → menos ruido visual, más significado. El diferenciador fino
// sigue siendo el CÓDIGO en monoespaciado, no el color.
export const PALETA_FAMILIA = [
  BASE.navy,      // #0F2A47
  BASE.goldDark,  // #B07D1B  (bronce; el gold puro se reserva para "selección")
  '#0E7490',      // teal sobrio (info/proyección)
  '#475569',      // slate sobrio
  BASE.navyLight, // #1E4674
];
// Mapa familia → tono fijo, asignado de forma determinista (orden estable del diccionario).
const FAMILIA_TOKEN = {};
let _famIdx = 0;
Object.values(PREFIJOS_DICT).forEach((p) => {
  const k = normTxt(p?.familia || p?.nombre || '');
  if (k && !(k in FAMILIA_TOKEN)) FAMILIA_TOKEN[k] = PALETA_FAMILIA[_famIdx++ % PALETA_FAMILIA.length];
});

export function colorPrefijo(cod) {
  const p = PREFIJOS_DICT[String(cod || '')];
  const fam = normTxt(p?.familia || p?.nombre || '');
  return FAMILIA_TOKEN[fam] || BASE.muted;
}
