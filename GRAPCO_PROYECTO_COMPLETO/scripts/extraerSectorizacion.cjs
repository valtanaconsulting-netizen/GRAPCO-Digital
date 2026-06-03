// Extrae la Sectorización (tren de actividades por sector) del Excel de calzadura.
// Cada celda de la grilla = sector (A1S1 = Anillo1 Sector1). → src/data/sectorizacionCreditex.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILE = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/6. Productividad/2. Sectorización/2. Calzadura/Sectorización Calzadura_2025-11-29.xlsx';
const txt = (v) => (v == null ? '' : String(v).trim());
const num = (v) => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null; };

const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sectorización'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

const GRID0 = 11;   // primera columna de la grilla de sectores (col M)
const actividades = [];
let maxCols = 0;
for (const row of rows) {
  const cod = txt(row[0]);
  if (!cod || /^N\d/i.test(cod)) continue;          // saltar encabezados de nivel
  const metrado = num(row[4]);
  const actividad = txt(row[1]);
  if (!actividad || metrado == null) continue;       // solo filas de actividad reales
  const grid = [];
  for (let c = GRID0; c < row.length; c++) grid.push(txt(row[c]) || null);
  while (grid.length && !grid[grid.length - 1]) grid.pop();   // recortar vacíos finales
  maxCols = Math.max(maxCols, grid.length);
  actividades.push({
    cod, actividad,
    metrado, und: txt(row[5]) || null, sectores: num(row[6]),
    metSec: num(row[7]), ip: num(row[8]), hh: num(row[9]), mo: num(row[10]),
    grid,
  });
}
// sectores únicos (A1S1…) y anillos
const sectores = [...new Set(actividades.flatMap(a => a.grid).filter(Boolean))].sort();
const anillos = [...new Set(sectores.map(s => (s.match(/^A(\d+)/) || [])[1]).filter(Boolean))];

const replacer = (k, v) => (v === null || v === '') ? undefined : v;
const out = `// src/data/sectorizacionCreditex.js
// SECTORIZACIÓN (tren de actividades por sector) — Calzaduras PTARI CREDITEX.
// Extraído de "Sectorización Calzadura_2025-11-29.xlsx". Cada celda de 'grid' = sector
// (A1S1 = Anillo 1, Sector 1). Re-generar con scripts/extraerSectorizacion.cjs.
export const SECTORIZACION = {
  titulo: 'Calzaduras de Muro Vecino',
  sectores: ${sectores.length}, anillos: ${anillos.length}, dias: ${maxCols},
  actividades: ${JSON.stringify(actividades, replacer)},
};
export default SECTORIZACION;
`;
const dest = path.join(__dirname, '..', 'src', 'data', 'sectorizacionCreditex.js');
fs.writeFileSync(dest, out, 'utf8');
console.error(`>>> ${actividades.length} actividades | ${sectores.length} sectores (${anillos.length} anillos) | ${maxCols} columnas`);
actividades.forEach(a => console.error(`  · ${a.cod} ${a.actividad.slice(0, 26)} | ${a.metrado} ${a.und} | ${a.sectores} sec | ${a.hh} HH | grid ${a.grid.filter(Boolean).length}`));
