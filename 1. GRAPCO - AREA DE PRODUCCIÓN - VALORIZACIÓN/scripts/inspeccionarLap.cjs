// Inspecciona la estructura de un archivo LAP (Lookahead) de Last Planner System.
// Uso: node scripts/inspeccionarLap.cjs "<ruta al .xlsx>"
const XLSX = require('xlsx');

const file = process.argv[2];
if (!file) { console.error('Falta ruta del archivo'); process.exit(1); }

const wb = XLSX.readFile(file, { cellDates: true });
console.log('ARCHIVO:', file.split(/[\\/]/).pop());
console.log('HOJAS:', wb.SheetNames.join(' | '));

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'] || 'vacía';
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  console.log('\n===== HOJA:', name, '| rango:', ref, '| filas:', rows.length, '=====');
  const maxRows = Math.min(rows.length, 45);
  for (let r = 0; r < maxRows; r++) {
    const row = (rows[r] || []).slice(0, 22).map(c => (c === '' || c == null) ? '·' : String(c).slice(0, 22));
    // Solo imprimir filas con algún contenido
    if (row.some(c => c !== '·')) console.log(String(r).padStart(2, '0'), '|', row.join(' | '));
  }
}
