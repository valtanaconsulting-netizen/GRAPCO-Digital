// src/utils/alertasPredictivas.js — Radar de Producción (alertas PREDICTIVAS)
//
// A diferencia de detectarAlertas() (que detecta lo que YA pasó), aquí se
// PROYECTA el futuro a partir de la tendencia de la data de producción:
//   • Proyección de cierre (sobrecosto/ahorro de MO al ritmo actual)
//   • CPI en caída (semanas hasta cruzar el umbral crítico)
//   • Actividades que excederán su presupuesto de HH
//   • Cuadrillas con tendencia negativa (aviso temprano)
//   • Plazo: semana de cierre proyectada según el ritmo de avance
//
// Funciones PURAS. Reutilizan el motor de tendencia ponderada por recencia y la
// proyección con bandas de confianza que ya existen en helpers.js.

import { calcularTendenciaPond } from './helpers';
import { normActividad } from './indicadoresEjecutivos';

const num = (v) => parseFloat(v) || 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const COL = { alta: '#dc2626', media: '#d97706', baja: '#0d9488', ok: '#16a34a' };
const sevRank = { alta: 0, media: 1, baja: 2, ok: 3 };

// ── Serie de CPI por semana (global) ──
export function serieCpiSemanal(hist) {
  const bySem = {};
  (hist || []).forEach((r) => {
    if (!r || !r.semana) return;
    const met = num(r.metrado), hh = num(r.totalHH);
    if (!bySem[r.semana]) bySem[r.semana] = { sem: r.semana, hhM: 0, hhR: 0, met: 0 };
    if (r._ipMeta && met > 0) bySem[r.semana].hhM += met * r._ipMeta;
    bySem[r.semana].hhR += hh;
    bySem[r.semana].met += met;
  });
  return Object.values(bySem)
    .filter((s) => s.hhR > 0)
    .map((s) => ({ x: s.sem, y: s.hhM / s.hhR, hhM: s.hhM, hhR: s.hhR, met: s.met }))
    .sort((a, b) => a.x - b.x);
}

// Presupuesto del catálogo: HH meta total y HH contractual total + por actividad.
function presupuestoDeCatalogo(infoMap) {
  let hhMetaTotal = 0, hhPptoTotal = 0;
  const porAct = {}; // normNombre → { metP, ipM, ipP }
  Object.entries(infoMap || {}).forEach(([nombre, i]) => {
    const metP = num(i && i.metP), ipM = num(i && i.ipM), ipP = num(i && i.ipP);
    if (metP > 0 && ipM > 0) hhMetaTotal += metP * ipM;
    if (metP > 0 && ipP > 0) hhPptoTotal += metP * ipP;
    porAct[normActividad(nombre)] = { metP, ipM, ipP };
  });
  return { hhMetaTotal, hhPptoTotal, porAct };
}

/**
 * Analiza la producción y devuelve { resumen, alertas, serie, proyeccionCpi }.
 * @param {Array}  hist     historial enriquecido (con _ipMeta/_ipPpto/semana)
 * @param {Object} infoMap  catálogo WBS (metP/ipM/ipP por actividad)
 * @param {number} costoHH  costo S/. por HH
 * @param {Object} opts     { umbralCpi=0.85, horizonte=4 }
 */
export function analizarProduccion({ hist = [], infoMap = {}, costoHH = 14, opts = {} }) {
  const umbralCpi = opts.umbralCpi ?? 0.85;
  const horizonte = opts.horizonte ?? 4;     // semanas a futuro
  const alertas = [];

  // ── Acumulados globales ──
  let hhReal = 0, hhMeta = 0, metTotal = 0;
  (hist || []).forEach((r) => {
    if (!r) return;
    const met = num(r.metrado), hh = num(r.totalHH);
    hhReal += hh; metTotal += met;
    if (r._ipMeta && met > 0) hhMeta += met * r._ipMeta;
  });
  const cpiActual = hhReal > 0 ? hhMeta / hhReal : null;

  const { hhMetaTotal, hhPptoTotal, porAct } = presupuestoDeCatalogo(infoMap);

  // ── Serie y tendencia de CPI ──
  const serie = serieCpiSemanal(hist);
  const tend = calcularTendenciaPond(serie.map((s) => ({ x: s.x, y: s.y })));
  const ultSem = serie.length ? serie[serie.length - 1].x : 0;
  const recientes = serie.slice(-Math.min(4, serie.length));
  const cpiReciente = recientes.length
    ? recientes.reduce((s, p) => s + p.y, 0) / recientes.length
    : cpiActual;
  // CPI proyectado al final del horizonte (según tendencia)
  const cpiProyectado = tend.valido
    ? clamp(tend.intercepto + tend.pendiente * (ultSem + horizonte), 0.2, 2)
    : cpiReciente;

  // ════════════════════════════════════════════════════════════
  // 1) PROYECCIÓN DE CIERRE (sobrecosto/ahorro de MO)
  // ════════════════════════════════════════════════════════════
  let cierre = null;
  if (hhMetaTotal > 0 && hhMeta > 0 && cpiReciente) {
    const cpiRef = clamp(cpiReciente, 0.25, 2);            // ritmo reciente
    const hhMetaRest = Math.max(0, hhMetaTotal - hhMeta);
    const hhRealRest = hhMetaRest / cpiRef;
    const hhRealFinal = hhReal + hhRealRest;
    const costoFinal = hhRealFinal * costoHH;
    const costoMeta = hhMetaTotal * costoHH;
    const sobreFinal = costoFinal - costoMeta;
    const pct = costoMeta > 0 ? sobreFinal / costoMeta : 0;
    const avancePct = Math.min(100, (hhMeta / hhMetaTotal) * 100);
    cierre = { cpiRef, costoFinal, costoMeta, sobreFinal, pct, avancePct, hhRealFinal };

    if (avancePct >= 3) { // requiere algo de avance para proyectar con sentido
      const sev = pct > 0.15 ? 'alta' : pct > 0.05 ? 'media' : pct < -0.03 ? 'ok' : 'baja';
      alertas.push({
        tipo: 'cierre',
        severidad: sev,
        icono: '🎯',
        titulo: sobreFinal >= 0 ? 'Proyección de cierre: sobrecosto' : 'Proyección de cierre: ahorro',
        mensaje: sobreFinal >= 0
          ? `Al ritmo actual (CPI ${Math.round(cpiRef * 100)}%), la obra cerraría con +${(Math.abs(pct) * 100).toFixed(0)}% de sobrecosto de MO (≈ S/ ${Math.round(Math.abs(sobreFinal)).toLocaleString('es-PE')}).`
          : `Al ritmo actual (CPI ${Math.round(cpiRef * 100)}%), la obra cerraría con ${(Math.abs(pct) * 100).toFixed(0)}% de ahorro de MO (≈ S/ ${Math.round(Math.abs(sobreFinal)).toLocaleString('es-PE')}).`,
        accion: sobreFinal >= 0
          ? 'Revisar las actividades y cuadrillas en rojo para recuperar productividad.'
          : 'Mantener el ritmo; documentar buenas prácticas que están funcionando.',
        valor: `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)}%`,
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 2) CPI EN CAÍDA (tendencia)
  // ════════════════════════════════════════════════════════════
  let proyeccionCpi = null;
  if (tend.valido && serie.length >= 3) {
    const pendSemana = tend.pendiente;            // ΔCPI por semana
    const cpiHoy = clamp(tend.intercepto + pendSemana * ultSem, 0.2, 2);
    proyeccionCpi = { pendSemana, cpiHoy, cpiProyectado, r2: tend.r2 };
    const cayendo = pendSemana < -0.005 && tend.r2 >= 0.15;
    if (cayendo) {
      // semanas hasta cruzar el umbral (si aún está por encima)
      let semCruce = null;
      if (cpiHoy > umbralCpi) semCruce = Math.ceil((umbralCpi - cpiHoy) / pendSemana);
      const yaCritico = cpiHoy <= umbralCpi;
      const sev = yaCritico ? 'alta' : (semCruce != null && semCruce <= horizonte) ? 'alta' : 'media';
      alertas.push({
        tipo: 'cpi_tendencia',
        severidad: sev,
        icono: '📉',
        titulo: yaCritico ? 'CPI por debajo del umbral y cayendo' : 'CPI en caída sostenida',
        mensaje: yaCritico
          ? `La productividad viene bajando ~${Math.abs(pendSemana * 100).toFixed(1)} pts/semana y ya está en ${Math.round(cpiHoy * 100)}% (umbral ${Math.round(umbralCpi * 100)}%).`
          : `La productividad baja ~${Math.abs(pendSemana * 100).toFixed(1)} pts/semana. De seguir así, cruzaría el ${Math.round(umbralCpi * 100)}% en ${semCruce} semana${semCruce === 1 ? '' : 's'}.`,
        accion: 'Identificar la causa (frente, actividad o cuadrilla) antes de que afecte el cierre.',
        valor: `${Math.round(cpiHoy * 100)}%`,
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 3) ACTIVIDADES rumbo a exceder su presupuesto de HH
  // ════════════════════════════════════════════════════════════
  const acumAct = {};
  (hist || []).forEach((r) => {
    if (!r) return;
    const canon = r._actividadCanonica || r.actividad;
    if (!canon) return;
    const k = normActividad(canon);
    const met = num(r.metrado), hh = num(r.totalHH);
    if (!acumAct[k]) acumAct[k] = { nombre: canon, hhR: 0, hhM: 0, met: 0 };
    acumAct[k].hhR += hh;
    if (r._ipMeta && met > 0) acumAct[k].hhM += met * r._ipMeta;
    acumAct[k].met += met;
  });
  const actsRiesgo = [];
  Object.entries(acumAct).forEach(([k, a]) => {
    const cat = porAct[k];
    if (!cat || !cat.metP || !cat.ipM) return;
    const presupHH = cat.metP * (cat.ipP || cat.ipM);   // HH presupuestadas de la actividad
    if (presupHH <= 0 || a.hhR <= 0) return;
    const cpiAct = a.hhM > 0 ? a.hhM / a.hhR : null;
    if (!cpiAct || cpiAct >= 1) return;                 // solo las que rinden bajo
    const metRest = Math.max(0, cat.metP - a.met);
    const hhRest = (metRest * cat.ipM) / clamp(cpiAct, 0.25, 2);
    const hhProyTotal = a.hhR + hhRest;
    const exceso = hhProyTotal - presupHH;
    const pct = exceso / presupHH;
    if (pct > 0.05) {
      actsRiesgo.push({ nombre: a.nombre, cpiAct, exceso, pct, presupHH, hhProyTotal });
    }
  });
  actsRiesgo.sort((a, b) => b.exceso - a.exceso);
  actsRiesgo.slice(0, 5).forEach((a) => {
    alertas.push({
      tipo: 'actividad_exceso',
      severidad: a.pct > 0.25 ? 'alta' : 'media',
      icono: '💸',
      titulo: 'Actividad rumbo a exceder presupuesto',
      mensaje: `${a.nombre.slice(0, 48)} — a su ritmo (CPI ${Math.round(a.cpiAct * 100)}%) cerraría con +${(a.pct * 100).toFixed(0)}% de HH (≈ +${Math.round(a.exceso)} HH).`,
      accion: 'Reforzar la cuadrilla o revisar el método de esta partida.',
      valor: `+${(a.pct * 100).toFixed(0)}%`,
    });
  });

  // ════════════════════════════════════════════════════════════
  // 4) CUADRILLAS con tendencia negativa (aviso temprano)
  // ════════════════════════════════════════════════════════════
  const capSem = {};
  (hist || []).forEach((r) => {
    if (!r || !r.capataz || !r.semana || !r._ipMeta) return;
    const k = `${r.capataz}|${r.semana}`;
    if (!capSem[k]) capSem[k] = { capataz: r.capataz, sem: r.semana, hhM: 0, hhR: 0 };
    const met = num(r.metrado);
    if (met > 0) capSem[k].hhM += met * r._ipMeta;
    capSem[k].hhR += num(r.totalHH);
  });
  const porCap = {};
  Object.values(capSem).forEach(({ capataz, sem, hhM, hhR }) => {
    if (hhR <= 0) return;
    (porCap[capataz] = porCap[capataz] || []).push({ x: sem, y: hhM / hhR });
  });
  Object.entries(porCap).forEach(([capataz, pts]) => {
    if (pts.length < 3) return;
    pts.sort((a, b) => a.x - b.x);
    const t = calcularTendenciaPond(pts);
    const cpiHoy = t.valido ? clamp(t.intercepto + t.pendiente * pts[pts.length - 1].x, 0.2, 2) : pts[pts.length - 1].y;
    if (t.valido && t.pendiente < -0.01 && t.r2 >= 0.2 && cpiHoy > umbralCpi) {
      alertas.push({
        tipo: 'cuadrilla_tendencia',
        severidad: 'media',
        icono: '👷',
        titulo: 'Cuadrilla en deterioro (aviso temprano)',
        mensaje: `${capataz} — su CPI viene bajando ~${Math.abs(t.pendiente * 100).toFixed(1)} pts/semana (hoy ${Math.round(cpiHoy * 100)}%). Aún sobre el umbral, pero en trayectoria de riesgo.`,
        accion: 'Conversar con el capataz y revisar restricciones antes de que caiga en rojo.',
        valor: `${Math.round(cpiHoy * 100)}%`,
        capataz,
      });
    }
  });

  // ════════════════════════════════════════════════════════════
  // 5) PLAZO — semana de cierre proyectada según ritmo de avance
  // ════════════════════════════════════════════════════════════
  let plazo = null;
  if (hhMetaTotal > 0 && hhMeta > 0) {
    const hhMetaPorSem = {};
    (hist || []).forEach((r) => {
      const met = num(r.metrado);
      if (r && r._ipMeta && met > 0 && r.semana) hhMetaPorSem[r.semana] = (hhMetaPorSem[r.semana] || 0) + met * r._ipMeta;
    });
    const sems = Object.keys(hhMetaPorSem).map(Number).sort((a, b) => a - b);
    const ult4 = sems.slice(-4);
    const vel = ult4.length ? ult4.reduce((s, x) => s + hhMetaPorSem[x], 0) / ult4.length : 0;
    const hhMetaRest = Math.max(0, hhMetaTotal - hhMeta);
    const semRest = vel > 0 ? Math.ceil(hhMetaRest / vel) : null;
    const semFin = semRest != null && sems.length ? sems[sems.length - 1] + semRest : null;
    const avancePct = Math.min(100, (hhMeta / hhMetaTotal) * 100);
    plazo = { vel, semRest, semFin, avancePct };
    if (semRest != null && avancePct < 99) {
      // Tendencia de velocidad: ¿se está desacelerando?
      const ptsVel = sems.map((x) => ({ x, y: hhMetaPorSem[x] }));
      const tv = calcularTendenciaPond(ptsVel);
      const desacelera = tv.valido && tv.pendiente < 0 && tv.r2 >= 0.15;
      alertas.push({
        tipo: 'plazo',
        severidad: desacelera ? 'media' : 'baja',
        icono: '⏱️',
        titulo: 'Proyección de plazo',
        mensaje: `Faltan ≈ ${semRest} semana${semRest === 1 ? '' : 's'} de producción (cierre ≈ S${semFin}) al ritmo reciente${desacelera ? ', y la velocidad viene bajando' : ''}.`,
        accion: desacelera ? 'El avance se desacelera: revisar frentes detenidos o restricciones.' : 'Mantener el ritmo de avance para sostener el plazo.',
        valor: `S${semFin}`,
      });
    }
  }

  // Orden por severidad
  alertas.sort((a, b) => (sevRank[a.severidad] ?? 9) - (sevRank[b.severidad] ?? 9));

  const resumen = {
    cpiActual, cpiReciente, cpiProyectado,
    hhReal, hhMeta, hhMetaTotal, hhPptoTotal, metTotal,
    cierre, plazo,
    conteo: {
      alta: alertas.filter((a) => a.severidad === 'alta').length,
      media: alertas.filter((a) => a.severidad === 'media').length,
    },
  };

  return { resumen, alertas, serie, proyeccionCpi, COL };
}

export const COLORES_SEVERIDAD = COL;
