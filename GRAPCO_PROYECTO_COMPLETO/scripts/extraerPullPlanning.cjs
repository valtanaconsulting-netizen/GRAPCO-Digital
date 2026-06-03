// scripts/extraerPullPlanning.cjs
// Extrae el PULL PLANNING (F14) del Excel de PTARI CREDITEX:
//   1) Hoja "Análisis": tabla de decisión de plazo (alternativa, fechas, domingos,
//      feriados, laborales, calendario, meses).
//   2) Hoja "Pull_2AC_2AM+Grúa (3)": TREN de actividades (matriz tipo LAP):
//      ITEM / ACTIVIDADES / METRADO / UND / SECTOR / MET.SEC / IP / HH / MO + grilla de días.
// Detecta la fila de cabecera POR CONTENIDO (no por posición fija) y la grilla de días
// por la fila con números 1..N. Escribe src/data/pullPlanningCreditex.js
// Ejecutar:  node scripts/extraerPullPlanning.cjs   (desde GRAPCO_PROYECTO_COMPLETO)

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SRC = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/4. Pull Planning FC-01/2. PTARI/GP-GCR-FOR-F14_CREDITEX Pull Planning_2025.12.09.xlsx';
const OUT = path.join(__dirname, '..', 'src', 'data', 'pullPlanningCreditex.js');

// ---------- helpers ----------
const norm = (v) => (v == null ? '' : String(v).trim());
const up = (v) => norm(v).toUpperCase();

function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (s === '' || /#(DIV\/0|REF|N\/A|VALUE|NAME)!?/i.test(s)) return null;
  s = s.replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Excel serial / texto / Date -> "YYYY-MM-DD" o null
function toISO(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const o = XLSX.SSF.parse_date_code(v);
    if (o) return `${o.y}-${String(o.m).padStart(2, '0')}-${String(o.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  // "24 November, 2025"
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (m) {
    const months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  // "11/24/25" / "4/5/26"  (m/d/yy)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let y = +m[3]; if (y < 100) y += 2000;
    return `${y}-${String(+m[1]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`;
  }
  return s; // dejar el texto tal cual si no se reconoce
}

function readGrid(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const g = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row[c] = cell ? cell.v : undefined;
    }
    g[r] = row;
  }
  return { g, range };
}

// =================================================================
const wb = XLSX.readFile(SRC);

// ---------- 1) DECISIÓN DE PLAZO (hoja Análisis) ----------
function extraerDecision() {
  const ws = wb.Sheets['Análisis'];
  if (!ws) return { titulo: '', filas: [] };
  const { g, range } = readGrid(ws);
  // Detectar fila de cabecera por contenido: busca fila que tenga "INICIO" y "LABORALES"/"CALENDARIO".
  let hr = -1, map = {};
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = g[r] || [];
    const join = row.map(up).join('|');
    if (join.includes('INICIO') && (join.includes('LABORALES') || join.includes('CALENDARIO'))) { hr = r; break; }
  }
  // Las cabeceras suelen estar repartidas en 2 filas (merge). Combinar hr-1 y hr.
  const filas = [];
  if (hr >= 0) {
    // columna de la alternativa = primera columna con texto en filas de datos
    for (let r = hr + 1; r <= range.e.r; r++) {
      const row = g[r] || [];
      // primera celda no vacía = nombre alternativa
      let alt = '';
      for (let c = range.s.c; c <= range.e.c; c++) { if (norm(row[c])) { alt = norm(row[c]); break; } }
      if (!alt || /ALTERNATIVA|FECHA|PLAZO|MES/i.test(alt)) continue;
      // recolectar valores numéricos / fechas en orden de aparición tras la alternativa
      const startCol = range.s.c;
      // En este formato: A=alt B=inicio C=fin D=domingo E=feriados F=laborales G=calendario H=meses
      const vals = [];
      for (let c = startCol; c <= range.e.c; c++) vals.push(row[c]);
      // tomar las celdas no vacías después de la alternativa
      const after = [];
      let seen = false;
      for (let c = startCol; c <= range.e.c; c++) {
        const v = row[c];
        if (!seen) { if (norm(v) === alt) seen = true; continue; }
        if (norm(v) !== '') after.push(v);
      }
      // after = [inicio, fin, domingo, feriados, laborales, calendario, meses]
      filas.push({
        alternativa: alt,
        inicio: toISO(after[0]),
        fin: toISO(after[1]),
        domingos: num(after[2]),
        feriados: num(after[3]),
        laborales: num(after[4]),
        calendario: num(after[5]),
        meses: num(after[6]),
      });
    }
  }
  return { filas };
}

// ---------- 2) TREN DE ACTIVIDADES (hoja Pull) ----------
function extraerTren() {
  const sheetName = wb.SheetNames.find(n => /^Pull_/i.test(n)) || 'Pull_2AC_2AM+Grúa (3)';
  const ws = wb.Sheets[sheetName];
  const { g, range } = readGrid(ws);

  // --- meta del proyecto (buscar etiquetas por contenido) ---
  const meta = {};
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = g[r] || [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const lab = up(row[c]);
      const valAt = (k) => { for (let cc = c + 1; cc <= range.e.c; cc++) { if (norm(row[cc]) !== '') return row[cc]; } return null; };
      if (lab === 'PROYECTO:') meta.proyecto = norm(valAt());
      else if (lab === 'UBICACIÓN:' || lab === 'UBICACION:') meta.ubicacion = norm(valAt());
      else if (lab === 'CLIENTE:') meta.cliente = norm(valAt());
      else if (lab.includes('ELABORADO')) meta.elaboradoPor = norm(valAt());
      else if (lab.includes('REVISADO')) meta.revisadoPor = norm(valAt());
      else if (lab.includes('JORNADA')) meta.jornada = num(valAt());
      else if (lab === 'FECHA INICIO') meta.fechaInicio = toISO(valAt());
      else if (lab === 'FECHA FIN') meta.fechaFin = toISO(valAt());
    }
  }
  // días/mes del banner DIAS|MES
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = g[r] || [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (up(row[c]) === 'DIAS' && up(row[c + 1]) === 'MES') {
        const nx = g[r + 1] || [];
        const d = num(nx[c]); const m = num(nx[c + 1]);
        if (d != null) { meta.diasPlazo = d; meta.meses = m; }
      }
    }
  }

  // --- detectar fila de cabecera por contenido: tiene ITEM + ACTIVIDADES + METRADO ---
  let hr = -1, col = {};
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = g[r] || [];
    const m = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const t = up(row[c]).replace(/\.$/, '').replace(/\s+/g, ' ').trim();
      if (t === 'ITEM') m.item = c;
      else if (t === 'ACTIVIDADES' || t === 'ACTIVIDAD') m.act = c;
      else if (t === 'METRADO') m.met = c;
      else if (t === 'UND') m.und = c;
      else if (t === 'SECTOR') m.sec = c;
      else if (t === 'MET. SEC' || t === 'MET SEC' || t === 'MET.SEC') m.metSec = c;
      else if (t === 'IP' || t === 'HH/UND') m.ip = c;
      else if (t === 'HH') m.hh = c;
      else if (t === 'MO') m.mo = c;
    }
    if (m.item != null && m.act != null && m.met != null) { hr = r; col = m; break; }
  }
  if (hr < 0) throw new Error('No se encontró la fila de cabecera del tren (ITEM/ACTIVIDADES/METRADO).');

  // --- detectar columnas de la grilla de días: en la fila de cabecera, celdas
  //     numéricas crecientes 1..N a la derecha de la columna MO. ---
  const dayCols = []; // {c, dia}
  const hRow = g[hr] || [];
  const firstDayMin = (col.mo != null ? col.mo : col.hh != null ? col.hh : col.metSec) + 1;
  for (let c = firstDayMin; c <= range.e.c; c++) {
    const n = num(hRow[c]);
    if (n != null && Number.isInteger(n) && n >= 1) dayCols.push({ c, dia: n });
  }
  // Anclar: el primer día numerado define el offset. Las columnas entre MO y el primer
  // día numerado pueden tener marcas "lead" (banda previa sin número): las incluimos
  // como días con número correlativo hacia atrás (0, -1, ...) NO — para fidelidad,
  // construimos la grilla SOLO sobre columnas con datos, desde la 1ª columna con marca
  // hasta la última, numerando con el header donde exista.
  const firstNumberedCol = dayCols.length ? dayCols[0].c : firstDayMin;

  // límites reales de marcas en el cuerpo
  let gridStart = firstNumberedCol, gridEnd = dayCols.length ? dayCols[dayCols.length - 1].c : firstNumberedCol;
  for (let r = hr + 1; r <= range.e.r; r++) {
    const row = g[r] || [];
    for (let c = firstDayMin; c <= range.e.c; c++) {
      if (norm(row[c]) !== '') { if (c < gridStart) gridStart = c; if (c > gridEnd) gridEnd = c; }
    }
  }
  // map col -> dia (número del header, o null para banda lead previa)
  const colToDia = {};
  dayCols.forEach(d => { colToDia[d.c] = d.dia; });
  const gridColList = [];
  for (let c = gridStart; c <= gridEnd; c++) gridColList.push(c);
  const dias = gridColList.map(c => (colToDia[c] != null ? colToDia[c] : null));

  // --- leer actividades ---
  const actividades = [];
  let lastSeccion = null;
  for (let r = hr + 1; r <= range.e.r; r++) {
    const row = g[r] || [];
    const item = norm(row[col.item]);
    const act = norm(row[col.act]);
    const grid = gridColList.map(c => {
      const v = norm(row[c]);
      return v === '' ? null : v;
    });
    const tieneGrid = grid.some(x => x != null);
    const metrado = num(row[col.met]);
    const und = norm(row[col.und]);
    const sectores = num(row[col.sec]);
    const metSec = num(row[col.metSec]);
    const ip = num(row[col.ip]);
    const hh = num(row[col.hh]);
    const mo = num(row[col.mo]);

    // fila totalmente vacía -> fin / saltar
    if (!item && !act && !tieneGrid && metrado == null && hh == null) continue;

    // Filas de sección/encabezado de nivel: item tipo N1/N2/N3/N4 y SIN metrado/HH ->
    // son títulos (CISTERNA, ESTRUCTURAS, OBRAS PRELIMINARES...).
    const esNivel = /^N\d$/i.test(item);
    const esTitulo = esNivel && metrado == null && hh == null && und === '';

    if (esTitulo) {
      lastSeccion = act;
      actividades.push({
        tipo: 'seccion',
        nivel: item,
        cod: item,
        actividad: act,
        grid: tieneGrid ? grid : undefined,
      });
      continue;
    }

    // actividad real (tiene metrado o HH o nombre + grid)
    if (act || metrado != null || hh != null || tieneGrid) {
      actividades.push({
        tipo: 'actividad',
        seccion: lastSeccion || undefined,
        cod: item || undefined,
        actividad: act || undefined,
        metrado, und: und || undefined,
        sectores, metSec, ip, hh, mo,
        grid,
      });
    }
  }

  return { sheetName, meta, dias, dayCols: dayCols.length, gridStart, gridEnd, actividades };
}

// ---------- ejecutar ----------
const decision = extraerDecision();
const tren = extraerTren();

// limpiar nulls/'' en serialización
function clean(obj) {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj && typeof obj === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === '' || v === undefined) continue;
      o[k] = clean(v);
    }
    return o;
  }
  return obj;
}

const realActs = tren.actividades.filter(a => a.tipo === 'actividad');
const secciones = tren.actividades.filter(a => a.tipo === 'seccion');

const PULLPLANNING = {
  flujo: 'F14',
  titulo: 'PTARI CREDITEX – ATE',
  cliente: tren.meta.cliente || 'CREDITEX S.A.C.',
  ubicacion: tren.meta.ubicacion || 'LIMA - ATE',
  proyecto: tren.meta.proyecto || 'PTARI CREDITEX - ATE',
  elaboradoPor: tren.meta.elaboradoPor || null,
  revisadoPor: tren.meta.revisadoPor || null,
  jornadaHHdia: tren.meta.jornada || null,
  fechaInicio: tren.meta.fechaInicio || null,
  fechaFin: tren.meta.fechaFin || null,
  diasPlazo: tren.meta.diasPlazo || null,
  meses: tren.meta.meses || null,
  // panel decisión de plazo
  decision: decision.filas,
  // grilla
  dias: tren.dias,             // array de números de día (o null en banda previa)
  totalColumnas: tren.dias.length,
  actividades: tren.actividades, // incluye secciones (tipo:'seccion') y actividades
};

// stats
const totHH = realActs.reduce((s, a) => s + (a.hh || 0), 0);
const totMO = realActs.reduce((s, a) => s + (a.mo || 0), 0);
const marcas = tren.actividades.reduce((s, a) => s + (a.grid ? a.grid.filter(x => x != null).length : 0), 0);

const cleaned = clean(PULLPLANNING);
const body =
  '// src/data/pullPlanningCreditex.js\n' +
  '// PULL PLANNING (GP-GCR-FOR-F14) — PTARI CREDITEX. AUTOGENERADO por\n' +
  '// scripts/extraerPullPlanning.cjs (no editar a mano). Contiene la decisión de plazo\n' +
  '// (hoja "Análisis") y el TREN de actividades (hoja "' + tren.sheetName + '").\n' +
  '// Cada celda de grid = "X" (avance) o el código de sector (A1, S1, A1S1, C1...).\n' +
  'export const PULLPLANNING = ' + JSON.stringify(cleaned) + ';\n\n' +
  'export default PULLPLANNING;\n';

fs.writeFileSync(OUT, body, 'utf8');

// ---------- reporte por stderr ----------
console.error('=== EXTRACCIÓN PULL PLANNING (F14) ===');
console.error('Hoja tren        :', tren.sheetName);
console.error('Decisión (filas) :', decision.filas.length, JSON.stringify(decision.filas[0] || {}));
console.error('Cabecera detect. :', JSON.stringify(tren.meta));
console.error('Días (columnas)  :', tren.dias.length, ' numeradas=', tren.dayCols, ' rango col', tren.gridStart, '..', tren.gridEnd);
console.error('Días header      :', tren.dias.filter(d => d != null)[0], '..', tren.dias.filter(d => d != null).slice(-1)[0]);
console.error('Secciones        :', secciones.length);
console.error('Actividades real :', realActs.length);
console.error('Marcas en grilla :', marcas);
console.error('HH total         :', Math.round(totHH), ' MO total', Math.round(totMO));
console.error('Escrito          :', OUT);
console.error('Tamaño KB        :', (body.length / 1024).toFixed(1));
