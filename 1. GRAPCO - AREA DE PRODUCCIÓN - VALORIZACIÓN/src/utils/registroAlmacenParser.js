// src/utils/registroAlmacenParser.js
// Parser puro del "GP-GCE-FOR-F07 · REGISTRO DE ALMACÉN" (S10) para el importador
// in-app del módulo Almacén. NO importa xlsx: recibe el workbook ya leído por el
// componente (que hace el `import('xlsx')` perezoso) y trabaja sobre él.
//
// Cada maestro mensual es ACUMULADO (mayo ya contiene dic→may). Por eso el importador
// recibe varios meses y aquí calculamos los DELTAS mensuales: el movimiento de cada
// mes = acumulado(mes) − acumulado(mes anterior), conservando la línea de tiempo.
//
// Hoja autoritativa: "Data" → columnas:
//   Código (S10 insumo) | Recurso | Unidad | Cantidad Atendida | Costo |
//   Valorizado (Secuandaira) | Recurso N1 (clase) | COMENTARIO 1 (partida) | COMENTARIO 2 (subgrupo)
// Las hojas/archivos por categoría (ACERO_AL_*, OP_AL_*…) traen "PARTIDACONTROLCONSULTA"
// con Valorizado (Principal) y SIN partida por fila (la partida es el nombre del archivo);
// también los soportamos como respaldo.

export const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

// Convierte "S/.1,234.56" | "1.234,56" | 1234.56 → número. Heurística: si hay coma y
// punto, el último separador es el decimal.
export function numify(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = norm(v).replace(/S\/\.?/i, '').replace(/\s/g, '');
  if (!s || s === '-' || /#.*!/.test(s)) return 0; // celdas de error de Excel (#¡REF!, #ERROR!)
  const hasComa = s.includes(','), hasPunto = s.includes('.');
  if (hasComa && hasPunto) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComa) {
    // solo coma: si parece miles (1,234) sin decimales, quita; si decimal (1,5) cambia a punto
    s = (/,\d{3}(\D|$)/.test(s) && !/,\d{1,2}$/.test(s)) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// dd.mm.aaaa / aaaa.mm.dd / dd_mm_aaaa desde el nombre del archivo → { ym, label, date }
export function cutoffFromFilename(filename = '') {
  const f = String(filename);
  let m = f.match(/(\d{4})[._-](\d{2})[._-](\d{2})/);              // 2026.05.31
  if (m) return mkCutoff(+m[1], +m[2], +m[3]);
  m = f.match(/(\d{2})[._-](\d{2})[._-](\d{4})/);                  // 31.05.2026
  if (m) return mkCutoff(+m[3], +m[2], +m[1]);
  return null;
}
function mkCutoff(y, mo, d) {
  const ym = `${y}-${String(mo).padStart(2, '0')}`;
  return { ym, year: y, month: mo, day: d, label: `${String(d).padStart(2, '0')}.${String(mo).padStart(2, '0')}.${y}` };
}

const findSheet = (wb, name) =>
  wb.SheetNames.find((n) => n.trim().toLowerCase() === name.toLowerCase());

// Localiza la fila de cabecera (contiene "Código" + "Cantidad Atendida") y mapea columnas.
function locateHeader(aoa) {
  for (let i = 0; i < Math.min(aoa.length, 20); i++) {
    const j = aoa[i].map(norm).join('|').toLowerCase();
    if ((j.includes('código') || j.includes('codigo')) && j.includes('cantidad')) return i;
  }
  return -1;
}
function colIndex(headerRow, names) {
  const H = headerRow.map((h) => norm(h).toLowerCase());
  for (const nm of names) { const i = H.indexOf(nm.toLowerCase()); if (i >= 0) return i; }
  for (const nm of names) { const i = H.findIndex((h) => h.includes(nm.toLowerCase())); if (i >= 0) return i; }
  return -1;
}

// Parsea un workbook → { tipo, cutoff, rows[] }. rows: línea de consumo acumulado.
// `XLSX` es el módulo SheetJS (lo pasa el componente). `filename` para fecha de corte.
export function parseRegistroWorkbook(wb, XLSX, filename = '') {
  const cutoff = cutoffFromFilename(filename);
  const dataSheet = findSheet(wb, 'Data');
  if (dataSheet) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[dataSheet], { header: 1, raw: true, defval: '' });
    const h = locateHeader(aoa);
    if (h < 0) return { tipo: 'desconocido', cutoff, rows: [], error: 'No se encontró la cabecera en la hoja Data' };
    const H = aoa[h];
    const ci = {
      codigo: colIndex(H, ['Código', 'Codigo']),
      recurso: colIndex(H, ['Recurso']),
      unidad: colIndex(H, ['Unidad']),
      cantidad: colIndex(H, ['Cantidad Atendida', 'Cantidad']),
      costo: colIndex(H, ['Costo', 'Valorizado (Principal)', 'Valorizado']),
      valSec: colIndex(H, ['Valorizado (Secuandaira)', 'Valorizado (Secundaria)']),
      clase: colIndex(H, ['Recurso N1']),
      partida: colIndex(H, ['COMENTARIO 1', 'Recurso N2']),
      subgrupo: colIndex(H, ['COMENTARIO 2', 'Recurso N3']),
    };
    const rows = [];
    for (let i = h + 1; i < aoa.length; i++) {
      const r = aoa[i];
      const codigo = norm(r[ci.codigo]);
      const recurso = norm(r[ci.recurso]);
      if (!codigo && !recurso) continue;
      if (/^total/i.test(recurso) || /^total/i.test(codigo)) continue;
      const costo = numify(r[ci.costo]);
      const cantidad = numify(r[ci.cantidad]);
      if (!recurso && !costo && !cantidad) continue;
      rows.push({
        codigo, recurso,
        unidad: norm(r[ci.unidad]) || 'UND',
        cantidad, costo,
        valSec: ci.valSec >= 0 ? numify(r[ci.valSec]) : 0,
        clase: ci.clase >= 0 ? (norm(r[ci.clase]) || 'MATERIALES') : 'MATERIALES',
        partida: ci.partida >= 0 ? norm(r[ci.partida]) : '',
        subgrupo: ci.subgrupo >= 0 ? norm(r[ci.subgrupo]) : '',
      });
    }
    return { tipo: 'maestro', cutoff, rows };
  }
  // Respaldo: archivo por categoría (PARTIDACONTROLCONSULTA) — partida = nombre archivo.
  const pcc = findSheet(wb, 'PARTIDACONTROLCONSULTA') || wb.SheetNames[0];
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[pcc], { header: 1, raw: true, defval: '' });
  const h = locateHeader(aoa);
  if (h < 0) return { tipo: 'desconocido', cutoff, rows: [], error: 'Formato no reconocido' };
  const H = aoa[h];
  const ci = {
    codigo: colIndex(H, ['Código', 'Codigo']),
    recurso: colIndex(H, ['Recurso']),
    unidad: colIndex(H, ['Unidad']),
    cantidad: colIndex(H, ['Cantidad Atendida', 'Cantidad']),
    costo: colIndex(H, ['Valorizado (Principal)', 'Costo', 'Valorizado']),
    valSec: colIndex(H, ['Valorizado (Secuandaira)', 'Valorizado (Secundaria)']),
    clase: colIndex(H, ['Recurso N1']),
  };
  const partidaArchivo = norm(String(filename).replace(/_AL_.*$/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' '));
  const rows = [];
  for (let i = h + 1; i < aoa.length; i++) {
    const r = aoa[i];
    const codigo = norm(r[ci.codigo]); const recurso = norm(r[ci.recurso]);
    if (!codigo && !recurso) continue;
    if (/^total/i.test(recurso) || /^total/i.test(codigo)) continue;
    const costo = numify(r[ci.costo]); const cantidad = numify(r[ci.cantidad]);
    if (!recurso && !costo && !cantidad) continue;
    rows.push({
      codigo, recurso, unidad: norm(r[ci.unidad]) || 'UND', cantidad, costo,
      valSec: ci.valSec >= 0 ? numify(r[ci.valSec]) : 0,
      clase: ci.clase >= 0 ? (norm(r[ci.clase]) || 'MATERIALES') : 'MATERIALES',
      partida: partidaArchivo, subgrupo: '',
    });
  }
  return { tipo: 'categoria', cutoff, rows };
}

// Clave única de una línea (mismo insumo, misma partida/subgrupo/clase).
export const lineKey = (r) => `${r.codigo}@@${r.partida}@@${r.subgrupo}@@${r.clase}`;

// Recibe los archivos parseados [{ filename, cutoff, rows }], ordena por fecha y
// calcula los DELTAS mensuales (acumulado mes − acumulado mes anterior).
// Devuelve { meses:[{ ym, label, cutoff, movimientos:[{...línea, cantidad, costo}] }], avisos:[] }.
export function computeMonthlyDeltas(parsedFiles) {
  const avisos = [];
  const conFecha = parsedFiles.filter((p) => p.cutoff);
  parsedFiles.filter((p) => !p.cutoff).forEach((p) =>
    avisos.push(`Sin fecha en el nombre: "${p.filename}" — se omite del cálculo de deltas.`));
  // ordena ascendente por año-mes; si hay 2 del mismo mes, gana el de día mayor
  conFecha.sort((a, b) =>
    a.cutoff.ym === b.cutoff.ym ? a.cutoff.day - b.cutoff.day : a.cutoff.ym.localeCompare(b.cutoff.ym));
  // deduplica por ym (quédate con el último día de cada mes)
  const porMes = new Map();
  for (const p of conFecha) porMes.set(p.cutoff.ym, p);
  const ordenados = [...porMes.values()];

  // El PRIMER mes del lote no tiene mes anterior con qué comparar, así que se carga como
  // su acumulado COMPLETO. Si el usuario sube una cadena PARCIAL (omitiendo meses iniciales),
  // ese primer mes se infla. Avisamos para que suba la cadena completa desde el inicio.
  if (ordenados.length) {
    avisos.push(`El primer mes del lote (${ordenados[0].cutoff.label}) se carga como acumulado COMPLETO (no hay mes anterior en el lote). Si ya existen meses previos, sube la cadena completa desde el inicio del proyecto o sus deltas se inflarán.`);
  }

  let prev = new Map(); // key → { cantidad, costo } acumulado del mes anterior
  const meses = [];
  for (const p of ordenados) {
    const cum = new Map();
    for (const r of p.rows) {
      if (!r.codigo) continue;                 // sin código no hay insumo resoluble → se omite
      const k = lineKey(r);
      const acc = cum.get(k) || { ...r, clave: k, cantidad: 0, costo: 0, valSec: 0 };
      acc.cantidad += r.cantidad; acc.costo += r.costo; acc.valSec += r.valSec;
      cum.set(k, acc);
    }
    const movimientos = [];
    // líneas presentes este mes
    for (const [k, acc] of cum) {
      const ant = prev.get(k) || { cantidad: 0, costo: 0 };
      const dCant = round(acc.cantidad - ant.cantidad);
      const dCost = round(acc.costo - ant.costo);
      if (dCant === 0 && dCost === 0) continue;
      movimientos.push({ ...acc, cantidad: dCant, costo: dCost });
    }
    // líneas que DESAPARECIERON respecto al mes anterior (reclasificación) → delta negativo
    for (const [k, ant] of prev) {
      if (cum.has(k)) continue;
      const dCant = round(0 - (ant.cantidad || 0));
      const dCost = round(0 - (ant.costo || 0));
      if (dCant === 0 && dCost === 0) continue;
      movimientos.push({ ...ant, clave: k, cantidad: dCant, costo: dCost, reclasificado: true });
    }
    meses.push({ ym: p.cutoff.ym, label: p.cutoff.label, cutoff: p.cutoff, filename: p.filename, movimientos });
    prev = cum;
  }
  return { meses, avisos };
}

// Catálogo de insumos único (para upsert en Materiales) a partir de todas las filas.
export function buildCatalogo(parsedFiles) {
  const cat = new Map();
  for (const p of parsedFiles) {
    for (const r of p.rows) {
      if (!r.codigo) continue;
      if (!cat.has(r.codigo)) cat.set(r.codigo, { codigo: r.codigo, nombre: r.recurso, unidad: r.unidad, clase: r.clase });
    }
  }
  return [...cat.values()];
}

// Grupos de partida distintos (COMENTARIO 1) presentes — para el paso de mapeo.
export function distinctPartidaGroups(parsedFiles) {
  const m = new Map(); // grupo → { grupo, clase, costoTotal }
  for (const p of parsedFiles) {
    for (const r of p.rows) {
      const g = r.partida || '(sin partida)';
      const cur = m.get(g) || { grupo: g, clase: r.clase, costoTotal: 0 };
      cur.costoTotal += r.costo;
      m.set(g, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.costoTotal - a.costoTotal);
}

function round(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
