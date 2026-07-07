// Extrae partidas 1001-10xx (F1 PTARI + F2 NAVE) y el pie comercial desde los PPTTO.
// Salida: JSON listo para volcar a src/data/presupuestoCreditex.js
const XLSX = require('xlsx');
const { readFileSync } = require('fs');

const RE = /^\s*10\d{2}\s*$/;
const aNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).replace(/s\/\.?|soles|pen|%/gi, '').replace(/\s/g, '');
  const c = s.includes(','), p = s.includes('.');
  if (c && p) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const up = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

function aoaDe(path, hoja) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });
  const nombre = wb.SheetNames.find((n) => up(n) === up(hoja)) || (hoja === 'RO' ? wb.SheetNames[0] : null);
  if (!nombre) return null;
  return XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: '', raw: true });
}

function partidas(aoa) {
  if (!aoa) return [];
  const conteo = {};
  aoa.forEach((r) => (r || []).forEach((c, i) => { if (RE.test(String(c))) conteo[i] = (conteo[i] || 0) + 1; }));
  const pCol = Object.keys(conteo).map(Number).sort((a, b) => conteo[b] - conteo[a])[0];
  if (pCol == null) return [];
  const out = [];
  for (const row of aoa) {
    if (!RE.test(String(row[pCol]))) continue;
    const resto = row.slice(pCol + 1);
    const desc = resto.find((c) => typeof c === 'string' && /[a-zA-Z]/.test(c)) || '';
    const montos = [];
    for (const c of resto) { if (typeof c === 'number' && Number.isFinite(c)) montos.push(c); }
    out.push({ codigo: String(row[pCol]).trim(), descripcion: String(desc).trim(), monto: aNum(montos[0] || 0) });
  }
  return out;
}

function pie(aoa) {
  const r = { cd: 0, gg: 0, ggPct: 0, utilidad: 0, utilidadPct: 0, subtotal: 0, igv: 0, igvPct: 0, total: 0, costoObra: 0 };
  if (!aoa) return r;
  const maxN = (row) => { let v = 0; (row || []).forEach((c) => { if (typeof c !== 'number' && !/\d/.test(String(c))) return; const n = aNum(c); if (Math.abs(n) > Math.abs(v)) v = n; }); return v; };
  const pct = (row) => { for (const c of row || []) { if (typeof c === 'string' && c.includes('%')) return aNum(c); if (typeof c === 'number' && c > 0 && c < 1) return +(c * 100).toFixed(2); } return 0; };
  for (const row of aoa) {
    const e = up((row || []).map((c) => (typeof c === 'string' ? c : '')).join(' '));
    if (!e) continue;
    if (/COSTO DIRECTO/.test(e) && !r.cd) r.cd = maxN(row);
    else if (/GASTOS GENERALES/.test(e) && !r.gg) { r.gg = maxN(row); r.ggPct = pct(row); }
    else if (/UTILIDAD/.test(e) && !r.utilidad) { r.utilidad = maxN(row); r.utilidadPct = pct(row); }
    else if (/SUB ?TOTAL/.test(e) && !r.subtotal) r.subtotal = maxN(row);
    else if (/\bIGV\b/.test(e) && !r.igv) { r.igv = maxN(row); r.igvPct = pct(row); }
    else if (/COSTO TOTAL/.test(e) && !r.total) r.total = maxN(row);
    else if (/TOTAL COSTO DE OBRA/.test(e) && !r.costoObra) r.costoObra = maxN(row);
  }
  return r;
}

const BASE = 'C:/Users/fjros/OneDrive/Escritorio/PROYECTOS_FRANKLIN2025/COSTOS PART2/1. Presupuesto';
const fPTARI = BASE + '/1. PTARI (S)/2. Contractual/PPTTO GRAPCO Rev 30.06 vr Modif x Creditex 17.07.25.xlsx';
const fNAVE = BASE + '/2. NAVE (S)/PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx';

const ptari = partidas(aoaDe(fPTARI, 'RO'));
const nave = partidas(aoaDe(fNAVE, 'RO'));
const piePTARI = pie(aoaDe(fPTARI, 'PPTO') || aoaDe(fPTARI, 'RO'));
const pieNAVE = pie(aoaDe(fNAVE, 'PPTO') || aoaDe(fNAVE, 'RO'));

console.log('===== PTARI (F1) =====');
console.log(JSON.stringify(ptari, null, 0));
console.log('TOTAL PTARI F1 =', ptari.reduce((s, p) => s + p.monto, 0).toFixed(2));
console.log('\n===== NAVE (F2) =====');
console.log(JSON.stringify(nave, null, 0));
console.log('TOTAL NAVE F2 =', nave.reduce((s, p) => s + p.monto, 0).toFixed(2));
console.log('\n===== PIE PTARI =====');
console.log(JSON.stringify(piePTARI, null, 0));
console.log('\n===== PIE NAVE =====');
console.log(JSON.stringify(pieNAVE, null, 0));
