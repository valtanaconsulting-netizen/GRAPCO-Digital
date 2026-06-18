// Uso: node scripts/_costos_dump.cjs "<ruta .xlsx>" [maxFilas=25] [filtroHoja]
// Vuelca estructura de un Excel: hojas, nº filas/cols y primeras filas (no vacias).
const XLSX = require('xlsx');
const { readFileSync } = require('fs');

const path = process.argv[2];
const maxRows = parseInt(process.argv[3] || '25', 10);
const sheetFilter = process.argv[4] || null;
if (!path) { console.error('Pasa el path del .xlsx'); process.exit(1); }

const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

console.log(`ARCHIVO: ${path}`);
console.log(`HOJAS (${wb.SheetNames.length}): ${wb.SheetNames.join(' | ')}`);

for (const name of wb.SheetNames) {
  if (sheetFilter && !name.toLowerCase().includes(sheetFilter.toLowerCase())) continue;
  const ws = wb.Sheets[name];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  const maxCols = json.reduce((m, r) => Math.max(m, r ? r.length : 0), 0);
  console.log(`\n=== HOJA: "${name}"  (${json.length} filas x ${maxCols} cols) ===`);
  let shown = 0;
  for (let i = 0; i < json.length && shown < maxRows; i++) {
    const row = json[i];
    if (!row || row.every(c => c === '' || c == null)) continue;
    const cells = row.map(c => String(c).slice(0, 45)).join(' | ');
    console.log(`  ${String(i + 1).padStart(3)}: ${cells.slice(0, 320)}`);
    shown++;
  }
  if (json.length > maxRows) console.log(`  ... (${json.length} filas en total)`);
}
