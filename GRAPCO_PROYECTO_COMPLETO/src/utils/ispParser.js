// src/utils/ispParser.js
// Parser del ISP (Informe Semanal de Producción) → datos para CR y CHH.
//
// El workbook trae:
//   - "PARTIDAS CONTROL"  → esqueleto: partidas (col B = nº, col C = nombre) > subpartidas
//     (solo col C) > actividades (col C + col D = UND).
//   - "ISP-SEM01".."ISP-SEM08" → valores ACUMULADOS hasta esa semana, una fila por actividad.
//     Columnas (0-index): C=2 nombre · D=3 UND · E=4 metrado ppto · F=5 HH ppto ·
//     AY=50 metrado acum · AZ=51 HH REAL acum · BB=53 HH META acum · BD=55 CPI.
//   - "CR" → reporte oficial; H2 trae el costo MO promedio ("Costo MO prom:" / 25).
//
// "Filtrar hasta la semana N" = usar la hoja ISP-SEM{N} (ya viene acumulada).
// VAR = meta − real ; CPI = meta / real (se calculan por nivel, no se suman).
//
// Es framework-agnóstico: recibe el módulo XLSX y el workbook ya leído, para poder
// testearlo en Node y usarlo en el navegador (import dinámico de xlsx) con la misma lógica.

// Índices de columna (0-based)
const COL = { C: 2, D: 3, E: 4, F: 5, AY: 50, AZ: 51, BB: 53 };

// Normaliza un nombre para cruzar: sin tildes, mayúsculas, solo alfanumérico.
const norm = (s) => (s ?? '').toString()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9]/g, '');

const limpiar = (s) => (s ?? '').toString().trim().replace(/\s+/g, ' ').replace(/\.+$/, '').trim();

const toNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const esNum = (v) => typeof v === 'number' ? Number.isFinite(v) : (v != null && v !== '' && !Number.isNaN(parseFloat(String(v).replace(/[^0-9.\-]/g, ''))));

function makeReader(XLSX, ws) {
  const cell = (r, c) => {
    const a = XLSX.utils.encode_cell({ r, c });
    const cl = ws[a];
    return cl ? cl.v : undefined;
  };
  const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  return { cell, range };
}

// Tarifa MO desde la hoja CR (celda H2). Fallback al valor dado.
function leerTarifa(XLSX, wb, fallback) {
  const ws = wb.Sheets['CR'];
  if (!ws) return fallback;
  const { cell, range } = makeReader(XLSX, ws);
  // Buscar en las primeras filas un número plausible junto a "Costo MO".
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 5); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = cell(r, c);
      if (typeof v === 'string' && /costo\s*mo/i.test(v)) {
        // tomar el primer número a la derecha en la misma fila
        for (let cc = c + 1; cc <= range.e.c; cc++) {
          const n = cell(r, cc);
          if (esNum(n)) { const t = toNum(n); if (t > 0 && t < 1000) return t; }
        }
      }
    }
  }
  return fallback;
}

// ¿La fila C es una cabecera de cierre de partida ("TOTAL")?
const esCierre = (nC) => nC === 'TOTAL' || nC === 'SUBTOTAL';

// Recorre una hoja ISP-SEM y agrega HH real/meta por partida > subpartida.
// Estructura del ISP: PARTIDA (cabecera sin datos) > SUBPARTIDA (cabecera sin
// datos) > actividades (con UND/HH) > fila subtotal sin nombre; cada PARTIDA
// cierra con una fila "TOTAL". Esa fila "TOTAL" delimita las partidas: la primera
// cabecera-sin-datos tras un TOTAL es PARTIDA; las siguientes son SUBPARTIDAS.
function leerHojaSemana(XLSX, ws) {
  const { cell, range } = makeReader(XLSX, ws);
  const partidas = [];
  let partidaActual = null;
  let subActual = null;
  let trasCierre = true;   // antes de la 1ª partida = como tras un TOTAL
  let nPartida = 0;

  const tieneDato = (r) => {
    const und = cell(r, COL.D);
    return (und != null && String(und).trim() !== '')
      || esNum(cell(r, COL.AZ)) || esNum(cell(r, COL.E)) || esNum(cell(r, COL.F))
      || esNum(cell(r, COL.AY)) || esNum(cell(r, COL.BB));
  };

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cRaw = cell(r, COL.C);
    if (cRaw == null || String(cRaw).trim() === '') continue; // subtotales sin nombre → ignorar
    const nC = norm(cRaw);
    if (!nC) continue;

    if (esCierre(nC)) { trasCierre = true; partidaActual = null; subActual = null; continue; }

    if (!tieneDato(r)) {
      // Cabecera: partida (si viene tras un cierre) o subpartida
      if (trasCierre) {
        nPartida += 1;
        partidaActual = { codigo: String(nPartida), nombre: limpiar(cRaw), subpartidas: [], hhReal: 0, hhMeta: 0, metrado: 0 };
        partidas.push(partidaActual);
        trasCierre = false; subActual = null;
      } else if (partidaActual) {
        subActual = { codigo: `${partidaActual.codigo}.${String(partidaActual.subpartidas.length + 1).padStart(2, '0')}`, nombre: limpiar(cRaw), hhReal: 0, hhMeta: 0, metrado: 0 };
        partidaActual.subpartidas.push(subActual);
      }
      continue;
    }

    // Actividad con datos
    if (!partidaActual) continue;
    if (!subActual) {
      subActual = { codigo: `${partidaActual.codigo}.01`, nombre: partidaActual.nombre, hhReal: 0, hhMeta: 0, metrado: 0 };
      partidaActual.subpartidas.push(subActual);
    }
    const hhR = toNum(cell(r, COL.AZ));
    const hhM = toNum(cell(r, COL.BB));
    const met = toNum(cell(r, COL.AY));
    subActual.hhReal += hhR; subActual.hhMeta += hhM; subActual.metrado += met;
    partidaActual.hhReal += hhR; partidaActual.hhMeta += hhM; partidaActual.metrado += met;
  }

  // var/cpi por nivel + total general
  let totReal = 0, totMeta = 0;
  partidas.forEach(p => {
    p.subpartidas.forEach(s => { s.var = s.hhMeta - s.hhReal; s.cpi = s.hhReal > 0 ? s.hhMeta / s.hhReal : null; });
    p.var = p.hhMeta - p.hhReal; p.cpi = p.hhReal > 0 ? p.hhMeta / p.hhReal : null;
    totReal += p.hhReal; totMeta += p.hhMeta;
  });

  return {
    partidas,
    total: { hhReal: totReal, hhMeta: totMeta, var: totMeta - totReal, cpi: totReal > 0 ? totMeta / totReal : null },
  };
}

/**
 * Parser principal. Recibe el módulo XLSX y el workbook ya leído.
 * @returns { semanas:number[], tarifa:number, porSemana:{ [N]: {partidas,total} } }
 */
export function parseISP(XLSX, workbook, { tarifaFallback = 25.5 } = {}) {
  const tarifa = leerTarifa(XLSX, workbook, tarifaFallback);

  const semanas = [];
  const porSemana = {};
  workbook.SheetNames.forEach((name) => {
    const m = /ISP[\s_-]*SEM[\s_-]*0*(\d+)/i.exec(name);
    if (!m) return;
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n)) return;
    porSemana[n] = leerHojaSemana(XLSX, workbook.Sheets[name]);
    semanas.push(n);
  });
  semanas.sort((a, b) => a - b);

  return { semanas, tarifa, porSemana };
}

/** Conveniencia para el navegador: parsea desde un ArrayBuffer (import dinámico de xlsx). */
export async function parseISPDesdeArchivo(file, opts) {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  return parseISP(XLSX, wb, opts);
}

export const _internos = { norm, limpiar, toNum, COL };
