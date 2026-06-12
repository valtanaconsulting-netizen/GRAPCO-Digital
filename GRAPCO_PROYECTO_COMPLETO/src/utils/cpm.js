// src/utils/cpm.js
// Motor de cronograma CPM (Critical Path Method) — el mismo cálculo que hacen
// MS Project y Primavera P6 por dentro:
//   · Dependencias FS / SS / FF / SF con lag (+/- días), estilo "3FS+2;5SS"
//   · Forward pass  → ES/EF (inicio/fin más TEMPRANO posible)
//   · Backward pass → LS/LF (inicio/fin más TARDÍO sin atrasar la obra)
//   · Holgura total (LS-ES) y RUTA CRÍTICA (holgura ≤ 0)
//   · Calendario laboral configurable (obra peruana: lun-sáb)
//   · Roll-up de fases resumen: fechas/duración/avance suben solos del detalle
//   · Restricción SNET (no empezar antes de) por tarea: `inicioManual`
//
// Trabaja en ÍNDICES de días laborables (enteros, 0 = fecha de inicio del
// proyecto) y convierte a fechas reales solo para mostrar. Puro y testeable.

// ── Calendario laboral ──────────────────────────────────────────────
// dias: array de getDay() laborables (1=lun ... 6=sáb; domingo 0 NO se trabaja)
export const CALENDARIO_OBRA = [1, 2, 3, 4, 5, 6];

const esLaborable = (d, calendario) => calendario.includes(d.getDay());

export function fechaDeIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function isoDeFecha(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Índice laborable n (0-based) → fecha real, desde fechaInicio (ajustada al
// primer día laborable). Cachea por proyecto en el llamador si hace falta.
export function fechaDeIndice(fechaInicioIso, n, calendario = CALENDARIO_OBRA) {
  const d = fechaDeIso(fechaInicioIso);
  while (!esLaborable(d, calendario)) d.setDate(d.getDate() + 1);
  let restante = Math.max(0, Math.round(n));
  while (restante > 0) {
    d.setDate(d.getDate() + 1);
    if (esLaborable(d, calendario)) restante--;
  }
  return d;
}

// Fecha real → índice laborable (la fecha se ajusta al laborable anterior)
export function indiceDeFecha(fechaInicioIso, fechaIso, calendario = CALENDARIO_OBRA) {
  const ini = fechaDeIso(fechaInicioIso);
  while (!esLaborable(ini, calendario)) ini.setDate(ini.getDate() + 1);
  const obj = fechaDeIso(fechaIso);
  let n = 0;
  const cur = new Date(ini);
  if (obj <= cur) return 0;
  while (cur < obj) {
    cur.setDate(cur.getDate() + 1);
    if (esLaborable(cur, calendario)) n++;
  }
  return n;
}

// ── Predecesoras estilo MS Project: "3FS+2; 5SS; 7FF-1; 2" (2 ≡ 2FS) ──
export function parsePredecesoras(str) {
  if (!str) return [];
  return String(str).split(/[;,]/).map(s => s.trim()).filter(Boolean).map(tok => {
    const m = tok.match(/^(\w+?)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+(?:\.\d+)?)?$/i);
    if (!m) return null;
    return {
      id: m[1],
      tipo: (m[2] || 'FS').toUpperCase(),
      lag: m[3] ? parseFloat(m[3].replace(/\s/g, '')) : 0,
    };
  }).filter(Boolean);
}

export function formatPredecesoras(preds) {
  return (preds || []).map(p =>
    `${p.id}${p.tipo === 'FS' && !p.lag ? '' : p.tipo}${p.lag ? (p.lag > 0 ? `+${p.lag}` : p.lag) : ''}`
  ).join(';');
}

// ── Jerarquía: una tarea es RESUMEN si la siguiente tiene nivel mayor ──
export function marcarResumen(tareas) {
  return tareas.map((t, i) => ({
    ...t,
    resumen: i + 1 < tareas.length && (tareas[i + 1].nivel || 1) > (t.nivel || 1),
  }));
}

// Hijos directos+descendientes de un resumen (hasta volver a su nivel)
function rangoHijos(tareas, i) {
  const nivel = tareas[i].nivel || 1;
  let j = i + 1;
  while (j < tareas.length && (tareas[j].nivel || 1) > nivel) j++;
  return [i + 1, j]; // [desde, hasta)
}

// ── CPM completo ────────────────────────────────────────────────────
// tareas: [{ id, nombre, nivel, duracion, predecesoras (string), avance,
//            inicioManual (iso|null) }] en ORDEN de esquema (como MS Project).
// Devuelve tareas enriquecidas: es, ef, ls, lf, holgura, critica, resumen,
// inicio (iso), fin (iso) + { finProyecto, duracionProyecto, errores }
export function calcularCPM(tareasIn, fechaInicioIso, calendario = CALENDARIO_OBRA) {
  const errores = [];
  const tareas = marcarResumen(tareasIn.map(t => ({ ...t })));
  const porId = {};
  tareas.forEach((t, i) => { porId[String(t.id)] = i; });

  // Solo las tareas HOJA entran a la red CPM (los resúmenes se calculan por roll-up)
  const hojas = tareas.map((t, i) => ({ t, i })).filter(x => !x.t.resumen);

  // Grafo de dependencias entre hojas (las preds a resúmenes se expanden a sus hojas)
  const predsDe = {};
  const expandPred = (p) => {
    const idx = porId[String(p.id)];
    if (idx == null) { errores.push(`Predecesora "${p.id}" no existe`); return []; }
    if (!tareas[idx].resumen) return [{ ...p, idx }];
    const [a, b] = rangoHijos(tareas, idx);
    const out = [];
    for (let k = a; k < b; k++) if (!tareas[k].resumen) out.push({ ...p, idx: k });
    return out;
  };
  hojas.forEach(({ t, i }) => {
    predsDe[i] = (parsePredecesoras(t.predecesoras)).flatMap(expandPred);
  });

  // Orden topológico (Kahn) — detecta ciclos
  const gradoIn = {};
  const sucesores = {};
  hojas.forEach(({ i }) => { gradoIn[i] = 0; sucesores[i] = []; });
  hojas.forEach(({ i }) => {
    predsDe[i].forEach(p => {
      if (sucesores[p.idx]) { sucesores[p.idx].push(i); gradoIn[i]++; }
    });
  });
  const cola = hojas.filter(({ i }) => gradoIn[i] === 0).map(({ i }) => i);
  const orden = [];
  while (cola.length) {
    const i = cola.shift();
    orden.push(i);
    sucesores[i].forEach(s => { if (--gradoIn[s] === 0) cola.push(s); });
  }
  if (orden.length < hojas.length) {
    const enCiclo = hojas.filter(({ i }) => !orden.includes(i)).map(({ t }) => t.id);
    errores.push(`Dependencia circular entre: ${enCiclo.join(', ')}`);
    // Romper: las del ciclo se planifican sin preds
    hojas.forEach(({ i }) => { if (!orden.includes(i)) { predsDe[i] = []; orden.push(i); } });
  }

  // ── Forward pass: ES/EF ──
  orden.forEach(i => {
    const t = tareas[i];
    const dur = Math.max(0, parseFloat(t.duracion) || 0);
    let es = 0;
    predsDe[i].forEach(p => {
      const pre = tareas[p.idx];
      const lag = p.lag || 0;
      if (p.tipo === 'FS') es = Math.max(es, (pre._ef ?? 0) + lag);
      else if (p.tipo === 'SS') es = Math.max(es, (pre._es ?? 0) + lag);
      else if (p.tipo === 'FF') es = Math.max(es, (pre._ef ?? 0) + lag - dur);
      else if (p.tipo === 'SF') es = Math.max(es, (pre._es ?? 0) + lag - dur);
    });
    if (t.inicioManual) es = Math.max(es, indiceDeFecha(fechaInicioIso, t.inicioManual, calendario));
    t._es = es;
    t._ef = es + dur;
  });

  const finProyecto = Math.max(0, ...orden.map(i => tareas[i]._ef));

  // ── Backward pass: LS/LF ──
  [...orden].reverse().forEach(i => {
    const t = tareas[i];
    const dur = Math.max(0, parseFloat(t.duracion) || 0);
    let lf = finProyecto;
    sucesores[i].forEach(s => {
      const suc = tareas[s];
      // tipo/lag del enlace i→s está en las preds de s
      predsDe[s].filter(p => p.idx === i).forEach(p => {
        const lag = p.lag || 0;
        if (p.tipo === 'FS') lf = Math.min(lf, (suc._ls ?? finProyecto) - lag);
        else if (p.tipo === 'SS') lf = Math.min(lf, (suc._ls ?? finProyecto) - lag + dur);
        else if (p.tipo === 'FF') lf = Math.min(lf, (suc._lf ?? finProyecto) - lag);
        else if (p.tipo === 'SF') lf = Math.min(lf, (suc._lf ?? finProyecto) - lag + dur);
      });
    });
    t._lf = lf;
    t._ls = lf - dur;
  });

  // ── Roll-up de resúmenes (de abajo hacia arriba) ──
  for (let i = tareas.length - 1; i >= 0; i--) {
    if (!tareas[i].resumen) continue;
    const [a, b] = rangoHijos(tareas, i);
    let es = Infinity, ef = -Infinity, ls = Infinity, lf = -Infinity, durPon = 0, avPon = 0;
    for (let k = a; k < b; k++) {
      const h = tareas[k];
      if (h._es == null) continue;
      es = Math.min(es, h._es); ef = Math.max(ef, h._ef);
      ls = Math.min(ls, h._ls); lf = Math.max(lf, h._lf);
      const d = Math.max(0.1, parseFloat(h.duracion) || 0); // milestone pondera mínimo
      if (!h.resumen) { durPon += d; avPon += d * (parseFloat(h.avance) || 0); }
    }
    if (es !== Infinity) {
      tareas[i]._es = es; tareas[i]._ef = ef;
      tareas[i]._ls = ls; tareas[i]._lf = lf;
      tareas[i].duracion = ef - es;
      tareas[i].avance = durPon > 0 ? Math.round(avPon / durPon) : (parseFloat(tareas[i].avance) || 0);
    } else {
      tareas[i]._es = 0; tareas[i]._ef = 0; tareas[i]._ls = 0; tareas[i]._lf = 0;
    }
  }

  // ── Salida: fechas reales, holgura, crítica ──
  const out = tareas.map(t => {
    const es = t._es ?? 0, ef = t._ef ?? 0, ls = t._ls ?? 0, lf = t._lf ?? 0;
    const dur = Math.max(0, parseFloat(t.duracion) || 0);
    const holgura = Math.round((ls - es) * 10) / 10;
    const iniDt = fechaDeIndice(fechaInicioIso, es, calendario);
    // El fin visual de una tarea de N días es el día laborable N-1 (inclusive)
    const finDt = fechaDeIndice(fechaInicioIso, dur > 0 ? ef - 1 : ef, calendario);
    return {
      ...t,
      es, ef, ls, lf, holgura,
      critica: !t.resumen && holgura <= 0 && dur > 0,
      milestone: !t.resumen && dur === 0,
      inicio: isoDeFecha(iniDt),
      fin: isoDeFecha(finDt),
      _es: undefined, _ef: undefined, _ls: undefined, _lf: undefined,
    };
  });

  const avanceGlobal = (() => {
    let dp = 0, ap = 0;
    out.forEach(t => { if (!t.resumen) { const d = Math.max(0.1, t.duracion || 0); dp += d; ap += d * (parseFloat(t.avance) || 0); } });
    return dp > 0 ? Math.round(ap / dp) : 0;
  })();

  return {
    tareas: out,
    finProyecto: isoDeFecha(fechaDeIndice(fechaInicioIso, Math.max(0, finProyecto - 1), calendario)),
    duracionProyecto: finProyecto,
    avanceGlobal,
    criticas: out.filter(t => t.critica).length,
    errores,
  };
}

// ── Utilidades de edición de esquema (insertar/indentar como MS Project) ──
export function nuevoId(tareas) {
  let max = 0;
  tareas.forEach(t => { const n = parseInt(t.id, 10); if (!isNaN(n) && n > max) max = n; });
  return String(max + 1);
}

// EDT automático tipo 1.2.3 según niveles (como la columna EDT de MS Project)
export function renumerarEDT(tareas) {
  const contadores = [];
  return tareas.map(t => {
    const nivel = Math.max(1, t.nivel || 1);
    contadores.length = nivel;
    contadores[nivel - 1] = (contadores[nivel - 1] || 0) + 1;
    return { ...t, edt: contadores.slice(0, nivel).join('.') };
  });
}
