// Dump detallado de una hoja: mapea columnas (letra) -> valor en filas clave.
// Uso: node scripts/inspeccionarLap2.cjs "<ruta>" "<hoja>" <filaIni> <filaFin>
const XLSX = require('xlsx');
const file = process.argv[2];
const hoja = process.argv[3] || '2. LAP';
const ini = parseInt(process.argv[4] || '11', 10);
const fin = parseInt(process.argv[5] || '40', 10);

const wb = XLSX.readFile(file, { cellDates: true });
const ws = wb.Sheets[hoja];
if (!ws) { console.error('No existe hoja:', hoja, '| hay:', wb.SheetNames.join(' | ')); process.exit(1); }
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
const colL = (i) => XLSX.utils.encode_col(i);

console.log('ARCHIVO:', file.split(/[\\/]/).pop(), '| HOJA:', hoja, '| rango:', ws['!ref']);
console.log('Merges:', (ws['!merges'] || []).length);
for (let r = ini; r <= Math.min(fin, rows.length - 1); r++) {
  const row = rows[r] || [];
  const pares = [];
  for (let c = 0; c < row.length; c++) {
    const v = row[c];
    if (v !== '' && v != null) pares.push(colL(c) + '=' + String(v).slice(0, 18));
  }
  if (pares.length) console.log('F' + String(r + 1).padStart(2, '0'), pares.join('  '));
}
