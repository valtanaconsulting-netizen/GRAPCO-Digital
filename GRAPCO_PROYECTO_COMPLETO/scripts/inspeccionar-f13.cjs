// Inspecciona la estructura del Excel de referencia F13_MPO para replicarla.
const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'F13_MPO SEM32_PTARI CREDITEX ATE.xlsx');
const wb = XLSX.readFile(file, { cellStyles: true });

console.log('Hojas:', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
console.log('Rango:', ws['!ref']);
console.log('\nMerges:');
(ws['!merges'] || []).forEach(m => {
  console.log(`  ${XLSX.utils.encode_range(m)}`);
});
console.log('\nAnchos de columna:');
(ws['!cols'] || []).forEach((c, i) => {
  if (c) console.log(`  Col ${XLSX.utils.encode_col(i)}: wch=${c.wch ?? c.width ?? '?'}`);
});
console.log('\nAltos de fila:');
(ws['!rows'] || []).forEach((r, i) => {
  if (r) console.log(`  Fila ${i + 1}: hpt=${r.hpt ?? '?'}`);
});
console.log('\nCeldas con valor:');
const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = range.s.r; R <= Math.min(range.e.r, 60); R++) {
  const fila = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = ws[addr];
    if (cell && cell.v !== undefined && cell.v !== '') {
      fila.push(`${addr}="${String(cell.v).slice(0, 50)}"`);
    }
  }
  if (fila.length) console.log(`  F${R + 1}: ${fila.join(' | ')}`);
}
