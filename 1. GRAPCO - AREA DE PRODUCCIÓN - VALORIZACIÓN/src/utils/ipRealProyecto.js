// src/utils/ipRealProyecto.js
// IP REAL de un proyecto = ΣtotalHH ÷ Σmetrado por actividad, desde su Historial
// (mismo cruce que el CPI vía normActividad). Lo usan: "Importar de proyecto" con
// rendimiento real y el comparador de rendimientos entre proyectos.

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { normActividad } from './normalizacion';

/**
 * @param {string} projId
 * @param {{ proyectoDefaultId?: string }} opts  proyectoDefaultId: en el proyecto
 *        default cuentan también los registros legacy sin proyectoId (aislamiento).
 * @returns {Promise<{ ip: Record<string, number>, detalle: Record<string, {nombre, met, hh, ip}> }>}
 *          ip: clave normActividad → IP real (solo actividades con avance).
 */
export async function calcularIPRealProyecto(projId, { proyectoDefaultId } = {}) {
  // Fuente real de tareos = Registros_Campo (igual que useHistorial / el CPI).
  let docs = [];
  if (projId && projId === proyectoDefaultId) {
    const snap = await getDocs(collection(db, 'Registros_Campo'));
    docs = snap.docs.map(d => d.data()).filter(r => r.proyectoId === projId || !r.proyectoId);
  } else {
    const snap = await getDocs(query(collection(db, 'Registros_Campo'), where('proyectoId', '==', projId)));
    docs = snap.docs.map(d => d.data());
  }
  const agg = {};
  docs.forEach(r => {
    const a = (r._actividadCanonica || r.actividad || '').trim();
    if (!a) return;
    const k = normActividad(a);
    const met = parseFloat(r.metrado) || 0;
    const hh = parseFloat(r.totalHH) || 0;
    if (!agg[k]) agg[k] = { nombre: a, met: 0, hh: 0 };
    agg[k].met += met; agg[k].hh += hh;
  });
  const ip = {};
  const detalle = {};
  Object.entries(agg).forEach(([k, v]) => {
    const val = v.met > 0 ? +(v.hh / v.met).toFixed(4) : null;
    detalle[k] = { nombre: v.nombre, met: +v.met.toFixed(2), hh: +v.hh.toFixed(1), ip: val };
    if (val != null) ip[k] = val;
  });
  return { ip, detalle };
}
