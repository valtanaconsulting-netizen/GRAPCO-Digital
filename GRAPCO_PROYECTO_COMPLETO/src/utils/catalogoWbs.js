// src/utils/catalogoWbs.js
// Catálogo WBS editable por proyecto — modelo de PRESUPUESTO POR FUENTES.
//
// Lo que se INGRESA por actividad: METRADO e IP. El HH SIEMPRE se calcula (HH = Metrado × IP).
//   ofertas:   { [frenteId]: { met, ip } }   ← PPTO OFERTA, uno por frente (F1, F2…)
//   adicional: { met, ip }                   ← PPTO ADICIONALES
//   ipMeta:    número                         ← IP META (rendimiento, fijo)
//
// Y se CALCULAN solos:
//   CONTRACTUAL = suma de todas las ofertas + adicional   (metrado, HH, IP)
//   META        = metrado copiado del contractual · HH = metrado × ipMeta

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const calcIP = (hh, met) => {
  const m = num(met);
  return m > 0 ? +(num(hh) / m).toFixed(4) : 0;
};

export const FRENTE_BASE = 'base';
export const KEY_ADICIONAL = 'ADICIONAL';

// HH de una fuente = metrado × IP
const hhFuente = (o) => num(o && o.met) * num(o && o.ip);

// ── Cálculo contractual + meta de una actividad ───────────────────
export function calcActividad(a) {
  let cMet = 0, cHH = 0;
  Object.values((a && a.ofertas) || {}).forEach((o) => {
    cMet += num(o && o.met);
    cHH += hhFuente(o);
  });
  cMet += num(a && a.adicional && a.adicional.met);
  cHH += hhFuente(a && a.adicional);
  cHH = +cHH.toFixed(2);
  const ipMeta = num(a && a.ipMeta);
  const metaMet = cMet;                          // el metrado meta copia al contractual
  const metaHH = +(metaMet * ipMeta).toFixed(2); // HH meta se recalcula con el IP fijo
  return {
    contractualMet: cMet,
    contractualHH: cHH,
    contractualIP: calcIP(cHH, cMet),
    metaMet, metaHH, ipMeta,
  };
}

// HH de una oferta concreta (para mostrar en la celda)
export const hhDe = (o) => +hhFuente(o).toFixed(2);

export const actividadVacia = () => ({
  nombre: '', un: 'UND',
  ofertas: {}, adicional: { met: 0, ip: 0 }, ipMeta: 0,
});

export const normalizarActividad = (a = {}) => {
  const ofertas = {};
  Object.entries(a.ofertas || {}).forEach(([k, o]) => {
    ofertas[k] = { met: num(o && o.met), ip: num(o && o.ip) };
  });
  return {
    nombre: (a.nombre || '').trim(),
    un: (a.un || 'UND').trim().toUpperCase() || 'UND',
    ofertas,
    adicional: { met: num(a.adicional && a.adicional.met), ip: num(a.adicional && a.adicional.ip) },
    ipMeta: num(a.ipMeta),
    // Flags de control del CPI (gestionados desde la tabla CPI):
    //  - terminada:     actividad finalizada → saldo = 0
    //  - saldoOverride: solo cuando el metrado actual supera al contractual,
    //                   el ingeniero define manualmente el saldo restante.
    terminada: !!a.terminada,
    saldoOverride:
      a.saldoOverride === null || a.saldoOverride === undefined || a.saldoOverride === ''
        ? null
        : num(a.saldoOverride),
  };
};

// ── Árbol → estructuras que consume el ISP ────────────────────────
export function arbolACatalogoMaster(arbol) {
  const cm = {};
  (arbol || []).forEach((p) => {
    if (!p || !p.nombre) return;
    cm[p.nombre] = {};
    (p.subpartidas || []).forEach((s) => {
      if (!s || !s.nombre) return;
      cm[p.nombre][s.nombre] = (s.actividades || []).map((a) => a && a.nombre).filter(Boolean);
    });
  });
  return cm;
}

// arbol → INFO_MAP  { NOMBRE_MAYUS: { un, metP, metM, ipP, ipM, terminada, saldoOverride } }
export function arbolAInfoMap(arbol) {
  const im = {};
  (arbol || []).forEach((p) =>
    (p?.subpartidas || []).forEach((s) =>
      (s?.actividades || []).forEach((a) => {
        if (!a || !a.nombre) return;
        const c = calcActividad(a);
        im[a.nombre.trim().toUpperCase()] = {
          un: a.un || 'UND',
          metP: c.contractualMet, ipP: c.contractualIP,
          metM: c.metaMet, ipM: c.ipMeta,
          terminada: !!a.terminada,
          saldoOverride:
            a.saldoOverride === null || a.saldoOverride === undefined || a.saldoOverride === ''
              ? null
              : num(a.saldoOverride),
        };
      })
    )
  );
  return im;
}

// ── Catálogo fijo (hardcoded) → árbol editable ────────────────────
export function hardcodedAArbol(catalogoMaster, infoMap, frenteIdBase = FRENTE_BASE) {
  return Object.keys(catalogoMaster || {}).map((pN) => ({
    nombre: pN,
    subpartidas: Object.keys(catalogoMaster[pN] || {}).map((sN) => ({
      nombre: sN,
      actividades: (catalogoMaster[pN][sN] || []).map((aN) => {
        const d = (infoMap || {})[aN.trim().toUpperCase()] || {};
        return {
          nombre: aN, un: d.un || 'UND',
          ofertas: { [frenteIdBase]: { met: num(d.metP), ip: num(d.ipP) } },
          adicional: { met: 0, ip: 0 },
          ipMeta: num(d.ipM),
        };
      }),
    })),
  }));
}

// ── Totales ───────────────────────────────────────────────────────
export function totalesArbol(arbol) {
  let partidas = 0, subpartidas = 0, actividades = 0;
  let hhContractual = 0, hhMeta = 0, sinDatos = 0;
  (arbol || []).forEach((p) => {
    partidas += 1;
    (p.subpartidas || []).forEach((s) => {
      subpartidas += 1;
      (s.actividades || []).forEach((a) => {
        actividades += 1;
        const c = calcActividad(a);
        hhContractual += c.contractualHH;
        hhMeta += c.metaHH;
        if (c.contractualMet === 0 && c.contractualHH === 0) sinDatos += 1;
      });
    });
  });
  return { partidas, subpartidas, actividades, hhContractual, hhMeta, sinDatos };
}

// ── Excel: plantilla formato LARGO (una fila por actividad·frente) ──
export const COLUMNAS_PLANTILLA = [
  'Partida', 'Subpartida', 'Actividad', 'Unidad',
  'Frente', 'Metrado', 'IP', 'IP Meta',
];

export function arbolAFilas(arbol, frentes = []) {
  const nombreFrente = (fid) => (frentes.find((f) => f.id === fid) || {}).nombre || fid;
  const filas = [];
  (arbol || []).forEach((p) =>
    (p.subpartidas || []).forEach((s) =>
      (s.actividades || []).forEach((a) => {
        const base = {
          'Partida': p.nombre, 'Subpartida': s.nombre,
          'Actividad': a.nombre, 'Unidad': a.un || 'UND',
          'IP Meta': num(a.ipMeta),
        };
        let emitido = false;
        Object.entries(a.ofertas || {}).forEach(([fid, o]) => {
          filas.push({ ...base, 'Frente': nombreFrente(fid), 'Metrado': num(o.met), 'IP': num(o.ip) });
          emitido = true;
        });
        if (num(a.adicional?.met) || num(a.adicional?.ip)) {
          filas.push({ ...base, 'Frente': 'ADICIONAL', 'Metrado': num(a.adicional.met), 'IP': num(a.adicional.ip) });
          emitido = true;
        }
        if (!emitido) filas.push({ ...base, 'Frente': (frentes[0]?.nombre) || 'F1', 'Metrado': 0, 'IP': 0 });
      })
    )
  );
  return filas;
}

// Detección FLEXIBLE de encabezados (insensible a acentos/mayúsculas + sinónimos),
// para que un Excel de otro proyecto/origen importe aunque los títulos varíen.
const SINONIMOS_COL = {
  partida:    ['partida', 'wbs', 'item', 'partida/wbs'],
  subpartida: ['subpartida', 'sub-partida', 'sub partida', 'sub'],
  actividad:  ['actividad', 'descripcion', 'nombre', 'descripcion actividad', 'partida/subpartida/actividad'],
  unidad:     ['unidad', 'und', 'um', 'u', 'un'],
  frente:     ['frente', 'fase', 'frente/fase'],
  metrado:    ['metrado', 'cantidad', 'qty', 'metrado contractual', 'met'],
  ip:         ['ip', 'rendimiento', 'ip ppto', 'ip presupuesto', 'ip contractual', 'rend', 'ip real'],
  ipMeta:     ['ip meta', 'ipmeta', 'rendimiento meta', 'ip objetivo'],
};
const normHeader = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function filasAArbol(filas, frentes = []) {
  const idDeFrente = (nombre) => {
    const raw = String(nombre || '').trim();
    const n = raw.toUpperCase();
    if (!n || n === 'ADICIONAL' || n === 'ADICIONALES') return KEY_ADICIONAL;
    const f = frentes.find(
      (x) => String(x.nombre || '').trim().toUpperCase() === n ||
             String(x.id || '').toUpperCase() === n
    );
    return f ? f.id : raw;   // sin coincidencia: el nombre ES la clave (columna nueva)
  };
  const filasArr = filas || [];
  // Mapea las cabeceras REALES del Excel a claves canónicas (una sola vez).
  const keys = filasArr.length ? Object.keys(filasArr[0]) : [];
  const colDe = {};
  Object.entries(SINONIMOS_COL).forEach(([canon, syns]) => {
    const set = new Set(syns.map(normHeader));
    const hit = keys.find((k) => set.has(normHeader(k)));
    if (hit) colDe[canon] = hit;
  });
  const val = (f, canon, fallbackKey) => {
    if (colDe[canon] != null) return f[colDe[canon]];
    return f[fallbackKey] ?? f[canon] ?? '';
  };
  const orden = [], idx = {};
  filasArr.forEach((f) => {
    const pN = String(val(f, 'partida', 'Partida')).trim();
    // Subpartida opcional: si falta, agrupa bajo "GENERAL" (no se descarta la fila).
    const sN = String(val(f, 'subpartida', 'Subpartida')).trim() || 'GENERAL';
    const aN = String(val(f, 'actividad', 'Actividad')).trim();
    if (!pN || !aN) return;
    const frente = idDeFrente(val(f, 'frente', 'Frente'));
    const met = num(val(f, 'metrado', 'Metrado'));
    const ip = num(val(f, 'ip', 'IP'));
    const un = String(val(f, 'unidad', 'Unidad') || 'UND').trim().toUpperCase() || 'UND';
    const ipMeta = num(val(f, 'ipMeta', 'IP Meta'));

    if (!idx[pN]) { idx[pN] = { subOrden: [], subs: {} }; orden.push(pN); }
    if (!idx[pN].subs[sN]) { idx[pN].subs[sN] = { actOrden: [], acts: {} }; idx[pN].subOrden.push(sN); }
    const S = idx[pN].subs[sN];
    if (!S.acts[aN]) {
      S.acts[aN] = { nombre: aN, un, ofertas: {}, adicional: { met: 0, ip: 0 }, ipMeta: 0 };
      S.actOrden.push(aN);
    }
    const A = S.acts[aN];
    if (un && un !== 'UND') A.un = un;
    if (ipMeta) A.ipMeta = ipMeta;
    if (frente === KEY_ADICIONAL) {
      A.adicional.met += met; if (ip) A.adicional.ip = ip;
    } else {
      if (!A.ofertas[frente]) A.ofertas[frente] = { met: 0, ip: 0 };
      A.ofertas[frente].met += met; if (ip) A.ofertas[frente].ip = ip;
    }
  });
  return orden.map((pN) => ({
    nombre: pN,
    subpartidas: idx[pN].subOrden.map((sN) => ({
      nombre: sN,
      actividades: idx[pN].subs[sN].actOrden.map((aN) => idx[pN].subs[sN].acts[aN]),
    })),
  }));
}
