// src/utils/indicadoresEjecutivos.js — Cálculo de indicadores diarios para el
// Dashboard Ejecutivo (snapshots persistidos en Firestore / Indicadores_Ejecutivos).
//
// Funciones PURAS (sin React ni Firebase). Reutilizan los mismos helpers que
// Ingeniero.jsx para que el CPI/avance coincidan exactamente con el resto de la app.
// El catálogo WBS es la ÚNICA fuente de verdad del IP Meta (memoria del proyecto).

import { buscarActividadCanonica, resolverIP, obtenerSemana } from './helpers';
import { dashboardCalidad } from './calidadOTAnalytics';
import { FECHA_INICIO_PROYECTO } from './constants';

const num = (v) => parseFloat(v) || 0;

// Igual que en Ingeniero.jsx: normaliza el nombre de una actividad para cruzarla
// de forma tolerante con el catálogo WBS (ignora frente, mayúsc., puntos, espacios).
const FRENTE_RE_ACT = /\s*\([^()]*(?:F\s*\d|PTAR|NAVE|DECANTAD)[^()]*\)\s*$/i;
export const normActividad = (s) => {
  let t = String(s || '').trim(), prev;
  do { prev = t; t = t.replace(FRENTE_RE_ACT, ''); } while (t !== prev);
  return t.toUpperCase().trim().replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
};

// ── Enriquece el historial con _ipMeta (réplica exacta de Ingeniero.jsx) ──
// El catálogo WBS (infoMap) manda sobre el respaldo de resolverIP.
export function enriquecerHistorial(historialProyecto, infoMap) {
  const base = (historialProyecto || []).map((r) => {
    if (!r) return r;
    const semanaRecalc = r.fecha ? obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO) : r.semana;
    const txt = (r.actividad || '').trim();
    const canonica = buscarActividadCanonica(txt);
    if (canonica) {
      return {
        ...r, semana: semanaRecalc,
        _actividadCanonica: canonica.actividad,
        _partidaCanonica: canonica.partida,
        _subpartidaCanonica: canonica.subpartida,
        _matched: true,
      };
    }
    return { ...r, semana: semanaRecalc, _actividadCanonica: txt, _matched: false };
  });

  const catIP = {};
  Object.keys(infoMap || {}).forEach((k) => {
    const info = infoMap[k] || {};
    catIP[normActividad(k)] = { ipM: info.ipM || 0, ipP: info.ipP || 0 };
  });

  return base.map((r) => {
    if (!r) return r;
    const ipDatos = resolverIP(r, base);
    const cat = catIP[normActividad(r._actividadCanonica || r.actividad)];
    const ipMcat = cat && cat.ipM ? cat.ipM : null;
    const ipPcat = cat && cat.ipP ? cat.ipP : null;
    return {
      ...r,
      _ipMeta: ipMcat || ipDatos.ipM,
      _ipPpto: ipPcat || ipDatos.ipP,
      _ipReal: ipDatos.ipReal,
    };
  });
}

// HH meta total del proyecto = Σ (metrado contractual × IP meta) del catálogo.
export function calcularHHMetaTotal(infoMap) {
  let total = 0;
  Object.values(infoMap || {}).forEach((info) => {
    const metP = num(info && info.metP);
    const ipM = num(info && info.ipM);
    if (metP > 0 && ipM > 0) total += metP * ipM;
  });
  return total;
}

// PPC global acumulado = compromisos cumplidos / compromisos totales.
export function calcularPPCGlobal(compromisos = []) {
  const arr = Array.isArray(compromisos) ? compromisos : [];
  if (arr.length === 0) return null;
  const cumplidos = arr.filter((c) => c && c.cumplido === true).length;
  return Math.round((cumplidos / arr.length) * 100);
}

// Hallazgos SSOMA del día = observaciones + críticos de las inspecciones de la fecha.
export function calcularHallazgosSSOMADia(inspecciones = [], fecha) {
  let obs = 0, crit = 0;
  (inspecciones || []).forEach((i) => {
    if (!i || i.fecha !== fecha) return;
    obs += num(i.resumen && i.resumen.obs);
    crit += num(i.resumen && i.resumen.crit);
  });
  return { obs, crit, total: obs + crit };
}

/**
 * Calcula el conjunto completo de indicadores diarios del proyecto activo.
 * Devuelve un objeto plano listo para mostrar y para guardar en Firestore.
 *
 * @param {Object} args
 * @param {Array}  args.historialEnriquecido  Registros del proyecto ya enriquecidos
 * @param {Object} args.infoMap               Catálogo WBS (info por actividad)
 * @param {Object} args.asistencia            { porFecha: { fecha: {total, obreros} } }
 * @param {Array}  args.protocolos            Protocolos de calidad
 * @param {Array}  args.ncs                   No conformidades
 * @param {Array}  args.compromisos           Compromisos PPC (Last Planner)
 * @param {Array}  args.inspecciones          Inspecciones SSOMA
 * @param {number} args.costoHH               Costo S/. por HH (promedio cargos)
 * @param {string} args.fecha                 Fecha 'YYYY-MM-DD' del cierre
 */
export function calcularIndicadoresDiarios({
  historialEnriquecido = [],
  infoMap = {},
  asistencia = {},
  protocolos = [],
  ncs = [],
  compromisos = [],
  inspecciones = [],
  costoHH = 14,
  fecha,
}) {
  // ── Producción y costo (acumulado a la fecha) ──
  let hhReal = 0, hhMeta = 0, metW = 0;
  historialEnriquecido.forEach((r) => {
    if (!r) return;
    const met = num(r.metrado), hh = num(r.totalHH);
    hhReal += hh;
    metW += met;
    if (r._ipMeta && met > 0) hhMeta += met * r._ipMeta;
  });
  const cpi = hhReal > 0 ? hhMeta / hhReal : null;
  const sobrecostoHH = hhReal - hhMeta;          // + = pérdida · − = ahorro
  const sobrecosto = sobrecostoHH * costoHH;
  const hhMetaTotal = calcularHHMetaTotal(infoMap);
  const avancePct = hhMetaTotal > 0 ? Math.min(100, (hhMeta / hhMetaTotal) * 100) : null;

  // ── Mano de obra (del día) ──
  const regsHoy = historialEnriquecido.filter((r) => r && r.fecha === fecha);
  const hhDia = regsHoy.reduce((s, r) => s + num(r.totalHH), 0);
  const asistHoy = (asistencia && asistencia.porFecha && asistencia.porFecha[fecha]) || { total: 0, obreros: 0 };

  // ── Calidad ──
  const cal = dashboardCalidad(protocolos, ncs, []);

  // ── Planeamiento (PPC) y Seguridad (SSOMA) ──
  const ppcPct = calcularPPCGlobal(compromisos);
  const ssoma = calcularHallazgosSSOMADia(inspecciones, fecha);

  return {
    fecha,
    // Producción / costo
    cpi: cpi != null ? +cpi.toFixed(3) : null,
    avancePct: avancePct != null ? +avancePct.toFixed(1) : null,
    sobrecosto: Math.round(sobrecosto),
    sobrecostoHH: +sobrecostoHH.toFixed(1),
    hhReal: +hhReal.toFixed(1),
    hhMeta: +hhMeta.toFixed(1),
    hhMetaTotal: +hhMetaTotal.toFixed(1),
    metradoAcum: +metW.toFixed(2),
    // Mano de obra
    hhDia: +hhDia.toFixed(1),
    obrerosDia: asistHoy.obreros || 0,
    asistenciaHHDia: +num(asistHoy.total).toFixed(1),
    // Calidad
    protocolosLiberados: cal.protocolos.liberados,
    protocolosTotal: cal.protocolos.total,
    pctLiberacion: cal.protocolos.pctLiberacion,
    ncsAbiertas: cal.ncs.abiertas,
    ncsCriticas: cal.ncs.criticas,
    // Planeamiento / Seguridad
    ppcPct,
    ssomaObs: ssoma.obs,
    ssomaCrit: ssoma.crit,
    ssomaHallazgos: ssoma.total,
    // Meta
    costoHH: +num(costoHH).toFixed(2),
  };
}
