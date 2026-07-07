// src/utils/cartaBalanceProductividad.js
// Agregaciones de productividad sobre el histórico de Cartas Balance, para
// MEDIR la productividad en serio (no solo el día):
//   • Tendencia semanal de TP/TC/TNC/LUF (¿mejora o empeora?)
//   • Comparación por actividad (¿dónde se rinde mejor/peor?)
//   • Evaluación contra metas configurables (semáforo)
//
// Funciones PURAS. Reutilizan calcularKPIs() del motor existente — el % TP/TC/TNC
// se calcula combinando las observaciones de varias cartas.

import { calcularKPIs } from './cartaBalanceAnalytics';

// Metas por defecto (estándares de la industria; configurables en Configuracion).
export const METAS_CB_DEFAULT = { tpMin: 60, tncMax: 15, lufObjetivo: 65 };

// Clave de semana ISO a partir de 'YYYY-MM-DD' → 'YYYY-Sxx'.
export function semanaISO(fecha) {
  if (!fecha || typeof fecha !== 'string' || fecha.length < 10) return null;
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((dt - ys) / 86400000) + 1) / 7);
  return `${dt.getUTCFullYear()}-S${String(week).padStart(2, '0')}`;
}

// Combina las observaciones de un grupo de cartas y devuelve sus KPIs + metadatos.
function kpisDeCartas(cartas) {
  const obs = [];
  cartas.forEach((cb) => { (cb.observaciones || []).forEach((o) => obs.push(o)); });
  const k = calcularKPIs(obs);
  return { ...k, sesiones: cartas.length, totalObs: obs.length };
}

// ── Tendencia semanal de TP/TC/TNC/LUF ──
// Devuelve [{ periodo, tp, tc, tnc, luf, n, sesiones }] ordenado cronológicamente.
export function tendenciaSemanal(cartas = []) {
  const grupos = {};
  (cartas || []).forEach((cb) => {
    if (!cb || !cb.fecha || !(cb.observaciones || []).length) return;
    const k = semanaISO(cb.fecha);
    if (!k) return;
    (grupos[k] = grupos[k] || []).push(cb);
  });
  return Object.entries(grupos)
    .map(([periodo, cs]) => ({ periodo, ...kpisDeCartas(cs) }))
    .sort((a, b) => (a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0));
}

// ── Comparación por actividad ──
// Devuelve [{ actividad, tp, tc, tnc, luf, sesiones, totalObs }] ordenado por LUF desc.
export function compararPorActividad(cartas = []) {
  const grupos = {};
  (cartas || []).forEach((cb) => {
    if (!cb || !(cb.observaciones || []).length) return;
    const act = (cb.actividad || 'Sin actividad').toString().trim() || 'Sin actividad';
    (grupos[act] = grupos[act] || []).push(cb);
  });
  return Object.entries(grupos)
    .map(([actividad, cs]) => ({ actividad, ...kpisDeCartas(cs) }))
    .sort((a, b) => b.luf - a.luf);
}

// ── Evaluación contra metas → semáforo ──
// estado: 'ok' (cumple TP y TNC) | 'alerta' (uno fuera) | 'critico' (ambos fuera)
export function evaluarMetas(kpis, metas = METAS_CB_DEFAULT) {
  const tpOk = kpis.tp >= (metas.tpMin ?? 60);
  const tncOk = kpis.tnc <= (metas.tncMax ?? 15);
  if (tpOk && tncOk) return { estado: 'ok', color: '#16a34a', label: 'Cumple' };
  if (!tpOk && !tncOk) return { estado: 'critico', color: '#dc2626', label: 'Crítico' };
  return { estado: 'alerta', color: '#d97706', label: 'Atención' };
}
