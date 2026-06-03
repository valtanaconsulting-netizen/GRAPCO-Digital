// Extrae el PPC oficial (hoja "Acumulado" del Excel GP-GCR-FOR-F07, semana más
// reciente) → src/data/ppcCreditex.js : PPC por semana + Pareto de CNC.
// Uso: node scripts/extraerPpc.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const RAIZ = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/5. Last Planner System/5. PPC';
function ultimo() {
  const cands = [];
  for (const dir of [RAIZ, path.join(RAIZ, '2. Superado')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/PPC\s*SEM\s*0*(\d+)/i);
      if (m && /\.xlsx$/i.test(f)) cands.push({ sem: +m[1], file: path.join(dir, f) });
    }
  }
  cands.sort((a, b) => b.sem - a.sem);
  return cands[0];
}
const txt = (v) => (v == null ? '' : String(v).trim());
const pct = (v) => { const n = parseFloat(txt(v).replace('%', '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n) : null; };
const int = (v) => { const n = parseInt(txt(v).replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : 0; };

const CNC_LABELS = { PROG: 'Programación', LOG: 'Logística', 'QA/QC': 'Calidad', EXT: 'Externos', 'SUP/CLI': 'Supervisión/Cliente', EJEC: 'Ejecución', SC: 'Subcontrata', EQ: 'Equipos', ADM: 'Administración', BR: 'Buena práctica', MO: 'Mano de obra', PARO: 'Paro' };

const sel = ultimo();
if (!sel) { console.error('No se encontró archivo PPC'); process.exit(1); }
console.error('PPC fuente:', path.basename(sel.file), '(SEM', sel.sem + ')');
const wb = XLSX.readFile(sel.file, { cellDates: false });
const ws = wb.Sheets['Acumulado'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

// 1) Tabla PPC por semana
const hdrPpc = rows.findIndex(r => /semanas/i.test(txt(r[1])) && /ppc/i.test(txt(r[4])));
const porSemana = [];
if (hdrPpc >= 0) {
  for (let r = hdrPpc + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const m = txt(row[1]).match(/semana\s*(\d+)/i);
    if (!m) { if (porSemana.length) break; else continue; }
    const ppc = pct(row[4]);
    porSemana.push({ semana: +m[1], realizadas: int(row[2]), noCumplidas: int(row[3]), ppc: ppc == null ? 0 : ppc, ppcAcum: pct(row[5]) ?? null });
  }
}

// 2) Análisis de incumplimiento (CNC) — header con PROG..PARO
const hdrCnc = rows.findIndex(r => /PROG/i.test(txt(r[2])) && r.some(c => /PARO/i.test(txt(c))));
const cnc = [];
if (hdrCnc >= 0) {
  const cats = [];
  (rows[hdrCnc] || []).forEach((c, i) => { const t = txt(c); if (t && i >= 2 && CNC_LABELS[t.toUpperCase()] || CNC_LABELS[t]) cats.push({ i, code: t }); });
  // sumar por categoría en filas Semana N
  const tot = {};
  for (let r = hdrCnc + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    if (!/semana\s*\d/i.test(txt(row[1]))) { if (Object.keys(tot).length) break; else continue; }
    cats.forEach(({ i, code }) => { tot[code] = (tot[code] || 0) + int(row[i]); });
  }
  Object.entries(tot).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
    .forEach(([code, n]) => cnc.push({ cat: CNC_LABELS[code.toUpperCase()] || CNC_LABELS[code] || code, n }));
}

const ppcGlobal = porSemana.length ? Math.round(porSemana.reduce((s, x) => s + x.realizadas, 0) / Math.max(1, porSemana.reduce((s, x) => s + x.realizadas + x.noCumplidas, 0)) * 100) : null;
const out = `// src/data/ppcCreditex.js
// PPC OFICIAL (Percent Plan Complete) — Last Planner System · PTARI CREDITEX.
// Extraído de ${path.basename(sel.file)} (hoja "Acumulado"). Re-generar con scripts/extraerPpc.cjs.
export const PPC_SEMANAL = ${JSON.stringify(porSemana)};
export const PPC_CNC = ${JSON.stringify(cnc)};
export const PPC_GLOBAL = ${ppcGlobal};
export default PPC_SEMANAL;
`;
const dest = path.join(__dirname, '..', 'src', 'data', 'ppcCreditex.js');
fs.writeFileSync(dest, out, 'utf8');
console.error(`>>> ${porSemana.length} semanas | PPC global ${ppcGlobal}% | CNC ${cnc.length} categorias`);
console.error('PPC:', porSemana.slice(0, 6).map(x => `S${x.semana}:${x.ppc}%`).join(' '), '...');
console.error('CNC:', cnc.slice(0, 6).map(x => `${x.cat}:${x.n}`).join(' '));
