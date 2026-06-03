// scripts/extraerCronogramaObra.cjs
// Extrae el CRONOGRAMA DE OBRA (GP-GCR-FOR-F02) del Excel PTARI CREDITEX (frente NAVE).
// Hoja "CRONOGRAMA": Gantt semanal.
//   - Cabecera meses : fila merged (DICIEMBRE 2025 -> JUNIO 2026), 4 SEM por mes.
//   - Columnas       : EDT | Nombre de tarea | Duración | Comienzo | Fin | <28 columnas-calendario "X">
//   - Jerarquía      : se infiere por la sangría (espacios al inicio del nombre de tarea).
//   - Barra Gantt    : primera y última celda "X" -> índice de semana (0..27).
// Detecta la fila de cabecera por CONTENIDO ("EDT" + "Nombre de tarea"), no por posición.
// Salida: src/data/cronogramaObraCreditex.js  (export const CRONOGRAMAOBRA + export default).
// La PTAR del proyecto vive en un .mpp (MS Project) no legible -> aquí solo va el frente NAVE.
//
// Uso:  node scripts/extraerCronogramaObra.cjs
'use strict';

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const SRC = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/3. Cronograma Obra/2. NAVE/GP-GCR-FOR-F02_Cronograma Obra Creditex_2026.04.17 Rvs 2.xlsx';
const OUT = path.join(__dirname, '..', 'src', 'data', 'cronogramaObraCreditex.js');

// ── helpers de parseo ────────────────────────────────────────────────
const ERR = new Set(['#DIV/0!', '#REF!', '#N/A', '#VALUE!', '#NAME?', '#NULL!', '#NUM!']);
const txt = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (ERR.has(s.trim())) return '';
  return s;
};
const clean = (v) => txt(v).trim();
// número desde "176 días", "116.13 días", "11,234.5" -> Number | null
const num = (v) => {
  const s = clean(v);
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
};
// JSON sin nulls/vacíos (replacer)
const replacer = (k, v) => (v === null || v === '' ? undefined : v);

// ── leer libro ───────────────────────────────────────────────────────
const wb = XLSX.readFile(SRC);
const sheetName = wb.SheetNames.find(n => /cronograma/i.test(n)) || wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const range = XLSX.utils.decode_range(ws['!ref']);
const cell = (r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x ? x.v : null; };

// ── 1) detectar fila de cabecera por contenido ("EDT" + "Nombre de tarea") ─
let hdrRow = -1, colEDT = -1, colNom = -1, colDur = -1, colIni = -1, colFin = -1, calStart = -1;
for (let r = range.s.r; r <= range.e.r && hdrRow < 0; r++) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    if (/^edt$/i.test(clean(cell(r, c)))) {
      // confirmar que a la derecha hay "Nombre de tarea"
      for (let cc = c + 1; cc <= range.e.c; cc++) {
        if (/nombre de tarea/i.test(clean(cell(r, cc)))) { hdrRow = r; colEDT = c; colNom = cc; break; }
      }
      if (hdrRow >= 0) break;
    }
  }
}
if (hdrRow < 0) { console.error('ERROR: no se encontró la fila de cabecera (EDT / Nombre de tarea)'); process.exit(1); }

// localizar Duración / Comienzo / Fin y donde arranca el calendario (primera "SEM N")
for (let c = colNom + 1; c <= range.e.c; c++) {
  const h = clean(cell(hdrRow, c));
  if (/duraci/i.test(h)) colDur = c;
  else if (/comienzo/i.test(h)) colIni = c;
  else if (/^fin$/i.test(h)) colFin = c;
  else if (/^sem\s*\d+/i.test(h)) { calStart = c; break; }
}
if (calStart < 0) calStart = colFin + 1;
const calEnd = range.e.c;
const NWEEKS = calEnd - calStart + 1;

// ── 2) reconstruir cabecera de calendario: meses (merges) + SEM por columna ─
const monthRow = hdrRow - 1; // los meses van una fila arriba de "SEM N"
// mapa col -> mes (resolviendo celdas combinadas)
const merges = ws['!merges'] || [];
const colMes = {};
for (let c = calStart; c <= calEnd; c++) {
  let v = clean(cell(monthRow, c));
  if (!v) { // ¿la columna está dentro de un merge horizontal?
    const m = merges.find(m => m.s.r === monthRow && c >= m.s.c && c <= m.e.c);
    if (m) v = clean(cell(m.s.r, m.s.c));
  }
  colMes[c] = v || '';
}
// columnas del calendario: { idx, mes, sem }
const AÑO = { DICIEMBRE: 2025 }; // dic -> 2025, resto -> 2026
const calCols = [];
for (let c = calStart; c <= calEnd; c++) {
  const mes = colMes[c] || '';
  const sem = clean(cell(hdrRow, c)) || `SEM ${(c - calStart) % 4 + 1}`;
  const año = AÑO[mes.toUpperCase()] || 2026;
  calCols.push({ idx: c - calStart, mes, sem, anio: año });
}
// bloques de mes (para la cabecera agrupada de la vista)
const meses = [];
for (const cc of calCols) {
  const last = meses[meses.length - 1];
  if (last && last.mes === cc.mes) last.span++;
  else meses.push({ mes: cc.mes, anio: cc.anio, span: 1, startIdx: cc.idx });
}

// ── 3) tareas: desde la fila siguiente a la cabecera hasta el final ─────
const tareas = [];
for (let r = hdrRow + 1; r <= range.e.r; r++) {
  const edt = clean(cell(r, colEDT));
  const nomRaw = txt(cell(r, colNom));
  if (!edt && !clean(nomRaw)) continue;        // fila vacía
  if (/^edt$/i.test(edt)) continue;            // cabecera repetida
  const nombre = clean(nomRaw);
  if (!nombre) continue;

  // nivel por sangría (3 espacios por nivel en este Excel) -> 1..n
  const lead = nomRaw.length - nomRaw.replace(/^\s+/, '').length;
  const nivel = Math.floor(lead / 3) + 1;

  // barra Gantt: primera/última "X"
  let first = null, last = null;
  for (let c = calStart; c <= calEnd; c++) {
    if (clean(cell(r, c)).toUpperCase() === 'X') {
      const i = c - calStart;
      if (first === null) first = i;
      last = i;
    }
  }

  tareas.push({
    edt,
    nombre,
    nivel,
    duracionTxt: clean(cell(r, colDur)) || null,
    duracionDias: num(cell(r, colDur)),
    comienzo: clean(cell(r, colIni)) || null,
    fin: clean(cell(r, colFin)) || null,
    barIni: first,                 // índice de semana (0..NWEEKS-1) o null
    barFin: last,
    barSpan: first === null ? 0 : (last - first + 1),
  });
}

// ── 4) métricas de resumen ─────────────────────────────────────────────
const root = tareas.find(t => t.nivel === 1) || tareas[0];
const hojas = tareas.filter(t => t.barSpan > 0).length;
const resumen = {
  fuente: path.basename(SRC),
  hoja: sheetName.trim(),
  flujo: 'GP-GCR-FOR-F02',
  proyecto: 'PTARI CREDITEX',
  frente: 'NAVE',
  nota: 'La PTAR del proyecto vive en un archivo .mpp (MS Project) no legible; aquí solo se importó el frente NAVE.',
  obra: root ? root.nombre : null,
  duracionTxt: root ? root.duracionTxt : null,
  comienzo: root ? root.comienzo : null,
  fin: root ? root.fin : null,
  totalTareas: tareas.length,
  totalSemanas: NWEEKS,
  totalMeses: meses.length,
};

const CRONOGRAMAOBRA = { ...resumen, meses, semanas: calCols, tareas };

// ── 5) escribir el módulo JS ───────────────────────────────────────────
const banner = `// src/data/cronogramaObraCreditex.js
// CRONOGRAMA DE OBRA (GP-GCR-FOR-F02) — PTARI CREDITEX · frente NAVE.
// Generado por scripts/extraerCronogramaObra.cjs (NO editar a mano).
// Gantt semanal: ${tareas.length} tareas · ${NWEEKS} semanas · ${meses.length} meses (${meses[0] ? meses[0].mes : ''} ${meses[0] ? meses[0].anio : ''} -> ${meses.length ? meses[meses.length - 1].mes : ''} ${meses.length ? meses[meses.length - 1].anio : ''}).
// La PTAR vive en un .mpp (MS Project) no legible: aquí solo el frente NAVE.
`;
const body = `export const CRONOGRAMAOBRA = ${JSON.stringify(CRONOGRAMAOBRA, replacer, 0)};\n\nexport default CRONOGRAMAOBRA;\n`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, banner + '\n' + body, 'utf8');

// ── 6) reporte por stderr ──────────────────────────────────────────────
console.error('HOJA            :', sheetName);
console.error('CABECERA (fila) :', hdrRow + 1, '| EDT col', XLSX.utils.encode_col(colEDT), '| Nombre col', XLSX.utils.encode_col(colNom));
console.error('CALENDARIO      :', XLSX.utils.encode_col(calStart), '->', XLSX.utils.encode_col(calEnd), '|', NWEEKS, 'semanas');
console.error('MESES           :', meses.map(m => `${m.mes}${m.anio !== 2026 ? '·' + m.anio : ''}(${m.span})`).join(' '));
console.error('TAREAS          :', tareas.length, '| con barra Gantt:', hojas);
console.error('NIVELES         :', [...new Set(tareas.map(t => t.nivel))].sort().join(','));
console.error('OBRA            :', resumen.obra, '|', resumen.duracionTxt, '|', resumen.comienzo, '->', resumen.fin);
console.error('PRIMERAS 3      :');
tareas.slice(0, 3).forEach(t => console.error('   ', t.edt, '·'.repeat(t.nivel), t.nombre, '| bar', t.barIni, '->', t.barFin));
console.error('ESCRITO         :', OUT);
