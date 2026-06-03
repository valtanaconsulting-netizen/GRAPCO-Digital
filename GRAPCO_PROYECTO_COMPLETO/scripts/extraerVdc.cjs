// Extrae las Métricas VDC (hoja "OP" del GP-GCA-FOR-F13) → src/data/vdcMetricas.js
// Objetivos VDC (OP/ICE/PPM/FC) con su evolución de 6 reportes vs meta.
// Uso: node scripts/extraerVdc.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILE = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/1. Métricas VDC Cronograma/GP-GCA-FOR-F13_Metricas VDC Cronograma.xlsx';
const FAMILIAS = {
  OP:  'Objetivos de Producción',
  ICE: 'Integrated Concurrent Engineering',
  PPM: 'Production Planning Metrics',
  FC:  'Factores Controlables',
};
const txt = (v) => (v == null ? '' : String(v).trim());
const parseVal = (v) => {
  const s = txt(v); if (!s) return null;
  const esPct = s.includes('%');
  const n = parseFloat(s.replace('%', '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? { n, pct: esPct } : null;
};

const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['OP'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
const hdr = rows.findIndex(r => txt(r[0]).toUpperCase() === 'VDC' && /m[eé]trica/i.test(txt(r[2])));
if (hdr < 0) { console.error('No se encontró cabecera VDC'); process.exit(1); }

const metricas = [];
let famActual = null;
for (let r = hdr + 1; r < rows.length; r++) {
  const row = rows[r] || [];
  const A = txt(row[0]).toUpperCase();
  const C = txt(row[2]);
  if (A && FAMILIAS[A]) famActual = A;
  if (!C) continue;
  const mc = C.match(/^([A-Z]{2,}-?\d+'?)\s*:?\s*(.*)$/);
  if (!mc) continue;   // solo filas con código de métrica (OP-01, OPR-03, FC-04…)
  const codigo = mc[1];
  const nombre = mc[2] || C;
  const reportesRaw = [3, 4, 5, 6, 7, 8].map(i => parseVal(row[i]));    // D..I
  const valores = reportesRaw.map(x => x ? x.n : null);
  const esPct = reportesRaw.some(x => x && x.pct);
  const noNull = valores.filter(v => v != null);
  const final = noNull.length ? noNull[noNull.length - 1] : null;
  const metaStr = txt(row[10]) || txt(row[9]);   // K, fallback J
  const metaNum = parseVal(metaStr) ? parseVal(metaStr).n : null;
  const cumple = (final != null && metaNum != null) ? final >= metaNum - 0.001 : null;
  metricas.push({ familia: famActual, familiaLabel: FAMILIAS[famActual] || famActual, codigo, nombre, valores, esPct, final, meta: metaStr, metaNum, cumple });
}

const replacer = (k, v) => (v === null || v === '') ? undefined : v;
const out = `// src/data/vdcMetricas.js
// MÉTRICAS VDC del cronograma (GP-GCA-FOR-F13, hoja OP) — PTARI CREDITEX.
// Objetivos VDC (OP/ICE/PPM/FC) con su evolución de 6 reportes vs meta.
// Re-generar con scripts/extraerVdc.cjs.
export const VDC_METRICAS = ${JSON.stringify(metricas, replacer)};
export const VDC_FAMILIAS = ${JSON.stringify(FAMILIAS)};
export default VDC_METRICAS;
`;
const dest = path.join(__dirname, '..', 'src', 'data', 'vdcMetricas.js');
fs.writeFileSync(dest, out, 'utf8');
const cumplen = metricas.filter(m => m.cumple === true).length;
console.error(`>>> ${metricas.length} métricas VDC | ${cumplen} cumplen meta`);
metricas.forEach(m => console.error(`  · [${m.familia}] ${m.codigo}: ${m.nombre.slice(0, 32)} → final ${m.final}${m.esPct ? '%' : ''} (meta ${m.meta}) ${m.cumple === true ? '✓' : m.cumple === false ? '✗' : ''}`));
