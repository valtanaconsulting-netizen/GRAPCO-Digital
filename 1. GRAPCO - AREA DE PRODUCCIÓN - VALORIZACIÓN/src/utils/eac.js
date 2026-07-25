// src/utils/eac.js — FUENTE ÚNICA de la proyección al cierre y del ranking de pérdidas.
//
// Por qué existe: la proyección de cierre estaba escrita dos veces con dos
// métodos distintos (CPI+EAC la calculaba actividad por actividad; el Cockpit
// con una sola eficiencia global), así que las dos pantallas daban cifras
// distintas para lo mismo. El ranking de "dónde se pierde el dinero" estaba
// escrito tres veces con criterios distintos.
//
// Criterio adoptado (decisión del usuario, 2026-07-25): manda el método
// DETALLADO POR ACTIVIDAD, que es el estándar de control de obra: cada
// actividad se proyecta con SU propio rendimiento real, y recién después se
// suma. Con el método global una actividad muy mala se diluye en el promedio.

// Nombre de actividad comparable entre el catálogo y los partes de campo.
export const normAct = (s) => String(s || '')
  .trim().toUpperCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sin tildes
  .replace(/\s*\([^)]*\)\s*$/, '')                    // sin sufijo de frente: "(F1-PTARI)"
  .replace(/\s+/g, ' ');

const num = (v) => parseFloat(v) || 0;

/**
 * Ejecutado por actividad a partir de los partes de campo ya filtrados.
 * Usa el metrado VALIDADO por Oficina Técnica cuando existe (misma prioridad
 * que el resto de la plataforma) y cae al reportado por el capataz si no.
 */
export function ejecutadoPorActividad(filtrados = []) {
  const acc = new Map();
  filtrados.forEach(r => {
    const clave = normAct(r._actividadCanonica || r.actividad);
    if (!clave) return;
    const met = num(r.metradoValidado ?? r.metradoReportado ?? r.metrado);
    const hh = num(r.totalHH);
    const cur = acc.get(clave) || { actividad: r._actividadCanonica || r.actividad, met: 0, hhR: 0, hhM: 0, ipMeta: 0 };
    cur.met += met;
    cur.hhR += hh;
    if (r._ipMeta && met > 0) { cur.hhM += met * r._ipMeta; cur.ipMeta = r._ipMeta; }
    acc.set(clave, cur);
  });
  return acc;
}

/** Metrado de referencia y rendimiento meta de cada actividad del catálogo WBS. */
export function referenciaPorActividad(wbs = {}) {
  const ref = new Map();
  Object.values(wbs || {}).forEach(p =>
    Object.values(p?.subs || {}).forEach(s =>
      Object.entries(s?.acts || {}).forEach(([nombre, a]) => {
        const metRef = num(a?._info?.metP ?? a?.metP);
        const ipMeta = num(a?._info?.ipM ?? a?.ipM);
        if (metRef > 0 || ipMeta > 0) ref.set(normAct(nombre), { nombre, metRef, ipMeta });
      })));
  return ref;
}

/**
 * PROYECCIÓN AL CIERRE (EAC), actividad por actividad.
 *
 *   Por cada actividad:  EAC = HH ya gastadas + saldo de metrado × rendimiento REAL
 *                        Meta = metrado de referencia × rendimiento meta
 *   Total obra: la suma de todas.
 *
 * El saldo nunca es negativo: si el avance ya superó el metrado de referencia,
 * el saldo es cero (misma regla que la tabla de CPI+EAC).
 */
export function proyectarCierre(filtrados = [], wbs = {}, costoHora = 0) {
  const eje = ejecutadoPorActividad(filtrados);
  const ref = referenciaPorActividad(wbs);

  let hhEAC = 0, hhMetaTotal = 0, hhReal = 0, hhGanadas = 0, actividadesProyectadas = 0;

  // Todas las actividades: las del catálogo más las que solo aparecen en campo.
  const claves = new Set([...ref.keys(), ...eje.keys()]);

  claves.forEach(clave => {
    const e = eje.get(clave) || { met: 0, hhR: 0, hhM: 0, ipMeta: 0 };
    const r = ref.get(clave) || { metRef: 0, ipMeta: 0 };

    hhReal += e.hhR;
    hhGanadas += e.hhM;

    const ipMeta = r.ipMeta || e.ipMeta || 0;
    const metRef = r.metRef || 0;
    if (metRef > 0 && ipMeta > 0) hhMetaTotal += metRef * ipMeta;

    // Rendimiento REAL de esta actividad; si aún no tiene avance, se proyecta con la meta.
    const ipReal = e.met > 0 ? e.hhR / e.met : ipMeta;
    const saldo = Math.max(0, metRef - e.met);
    hhEAC += e.hhR + saldo * ipReal;
    if (saldo > 0 || e.hhR > 0) actividadesProyectadas++;
  });

  const cpi = hhReal > 0 ? hhGanadas / hhReal : null;
  const desvioHH = hhEAC - hhMetaTotal;          // + = se cierra por encima de lo previsto

  return {
    metodo: 'por-actividad',
    hhReal, hhGanadas, cpi,
    hhEAC, hhMetaTotal, desvioHH,
    costoEAC: hhEAC * costoHora,
    costoMeta: hhMetaTotal * costoHora,
    desvioCosto: desvioHH * costoHora,
    desvioPct: hhMetaTotal > 0 ? (desvioHH / hhMetaTotal) * 100 : null,
    actividadesProyectadas,
  };
}

/**
 * RANKING ÚNICO de dónde se pierde: ordena por HORAS PERDIDAS (volumen), no por
 * porcentaje. Antes cada pantalla usaba su propio criterio y una actividad al
 * 86% que perdía mucha plata quedaba fuera por no bajar del umbral.
 *
 * Entra toda actividad que tenga meta y esté perdiendo horas (hhR > hhM).
 */
export function rankearPerdidas(filtrados = [], { costoHora = 0, top = 5 } = {}) {
  const eje = ejecutadoPorActividad(filtrados);
  return [...eje.values()]
    .filter(x => x.hhM > 0 && x.hhR > x.hhM)
    .map(x => ({
      actividad: x.actividad,
      hhR: x.hhR,
      hhM: x.hhM,
      cpi: x.hhR > 0 ? x.hhM / x.hhR : null,
      hhPerdidas: x.hhR - x.hhM,
      perdida: (x.hhR - x.hhM) * costoHora,
    }))
    .sort((a, b) => b.hhPerdidas - a.hhPerdidas)
    .slice(0, top);
}
