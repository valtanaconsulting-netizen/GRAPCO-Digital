import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = process.argv[2];
if (!path) { console.error('Pasa el path del .xlsx'); process.exit(1); }

const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer' });

console.log(`HOJAS: ${wb.SheetNames.length}`);
console.log('---');

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  console.log(`\n=== HOJA: "${name}" (${json.length} filas) ===`);
  const max = Math.min(20, json.length);
  for (let i = 0; i < max; i++) {
    const row = json[i];
    if (!row || row.every(c => c === '' || c == null)) continue;
    const cells = row.map(c => String(c).slice(0, 40)).join(' | ');
    console.log(`  ${String(i + 1).padStart(3)}: ${cells.slice(0, 280)}`);
  }
  if (json.length > 20) console.log(`  ... ${json.length - 20} filas mas`);
}
