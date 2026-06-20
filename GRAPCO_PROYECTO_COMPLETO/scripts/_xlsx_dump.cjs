// Lector de Excel para análisis: vuelca hojas + preview de filas no vacías.
// Uso: node scripts/_xlsx_dump.cjs "<ruta.xlsx>" [maxRowsPorHoja=50]
const XLSX = require('xlsx');
const file = process.argv[2];
const maxRows = parseInt(process.argv[3] || '50', 10);
if (!file) { console.error('falta ruta'); process.exit(1); }
let wb;
try { wb = XLSX.readFile(file, { cellDates: true, dense: false }); }
catch (e) { console.error('ERROR leyendo:', e.message); process.exit(1); }
console.log('FILE: ' + file);
console.log('HOJAS (' + wb.SheetNames.length + '): ' + wb.SheetNames.join(' | '));
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  if (!ws || !ws['!ref']) { console.log('\n===== ' + name + ' · (vacía) ====='); continue; }
  console.log('\n===== HOJA: ' + name + ' · rango ' + ws['!ref'] + ' =====');
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  rows.slice(0, maxRows).forEach((r, i) => {
    const cells = r.map(c => {
      if (c === '' || c == null) return '';
      if (typeof c === 'number') return Number.isInteger(c) ? String(c) : c.toFixed(2);
      return String(c).replace(/\s+/g, ' ').trim().slice(0, 38);
    });
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    const line = cells.join(' | ');
    if (line.trim()) console.log((i + 1) + ': ' + line.slice(0, 320));
  });
  if (rows.length > maxRows) console.log('... (+' + (rows.length - maxRows) + ' filas)');
}
