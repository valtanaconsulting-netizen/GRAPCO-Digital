// scripts/extraerPlanVaciado.cjs
// Extrae el "Plan de Vaciado" (GP-GCR-FOR-F17) del tanque de homogenización, hoja "4. Pull".
// Matriz tipo LAP: actividades × días con marcas (X, C1, S1A1, ...) + KPIs (HH, MO, metrado).
// Detecta la fila de cabecera por CONTENIDO (columna A == "ID"), limpia números
//   (usa el valor RAW numérico cuando existe; si llega como texto es-PE -> normaliza),
//   trata #DIV/0!/#REF!/'' como null. Lee la grilla por columnas de día detectadas por contenido.
// Escribe src/data/planVaciadoCreditex.js con `export const PLANVACIADO = {...}` + default.
//
// Uso (desde GRAPCO_PROYECTO_COMPLETO):
//   node scripts/extraerPlanVaciado.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FUENTE = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/6. Productividad/9. Plan de Vaciado/GP-GCR-FOR-F17_P. Vaciado F1_Muros_2026.01.02.xlsx';
const SALIDA = path.join(__dirname, '..', 'src', 'data', 'planVaciadoCreditex.js');

const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12 };
const ERR_RE = /^#(DIV\/0!|REF!|VALUE!|N\/A|NAME\?|NUM!|NULL!)/i;

// Lector por celda: devuelve {raw, txt} donde raw = valor numérico/fecha si la celda es numérica.
function makeGrid(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const cell = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cl = ws[addr];
    if (!cl) return { raw: null, txt: '', isNum: false };
    if (cl.t === 'n') return { raw: cl.v, txt: (cl.w != null ? String(cl.w) : String(cl.v)), isNum: true };
    if (cl.t === 'd') return { raw: cl.v, txt: (cl.w != null ? String(cl.w) : String(cl.v)), isNum: false };
    if (cl.t === 'e') return { raw: null, txt: '#ERR', isNum: false }; // celda de error (#DIV/0! etc.)
    return { raw: null, txt: (cl.w != null ? String(cl.w) : String(cl.v)), isNum: false };
  };
  return { range, cell, maxR: range.e.r, maxC: range.e.c };
}

// parsea un texto es-PE (miles '.', decimal ',') a número, o null.
function parseEsPe(s) {
  s = String(s == null ? '' : s).trim();
  if (s === '' || s === '-' || s === '·' || ERR_RE.test(s) || s === '#ERR') return null;
  const norm = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,/g, '.').replace(/[^\d.\-]/g, '');
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}
// número robusto.
//  - Celda NUMÉRICA: por defecto el valor verdadero es el RAW (v) — trae precisión completa
//    (hoja "5. Metr": v=88.831293 / w="88.831", y v=212.577 con punto decimal real).
//    EXCEPCIÓN (hoja Pull, IP/HH con formato raro): el texto mostrado lleva COMA decimal
//    ("12,963") pero el raw es un artefacto (v=12963 = 1000×). Si w tiene coma decimal y el
//    raw difiere del valor con coma, confiamos en el formateado con coma.
//  - Celda de TEXTO: parseamos es-PE (miles '.', decimal ',').
function num(c) {
  if (!c) return null;
  if (c.isNum && Number.isFinite(c.raw)) {
    const w = String(c.txt || '');
    if (w.includes(',')) {
      // formato es-PE con coma decimal -> "12,963" = 12.963
      const fmtComma = Number(w.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,/g, '.').replace(/[^\d.\-]/g, ''));
      if (Number.isFinite(fmtComma) && Math.abs(fmtComma - c.raw) > 1e-6) return fmtComma;
    }
    return c.raw;
  }
  return parseEsPe(c.txt);
}
function txt(c) {
  if (!c) return '';
  const s = String(c.txt || '').trim();
  return (s === '·' || s === '#ERR') ? '' : s;
}
// marca de grilla: string limpio (X, C1, S1A1) o null
function mark(c) {
  const s = txt(c);
  return s === '' ? null : s.toUpperCase();
}
const colLetter = (i) => XLSX.utils.encode_col(i);

function extraerMetrados(wb) {
  const wsM = wb.Sheets['5. Metr'];
  if (!wsM) return [];
  const G = makeGrid(wsM);
  const out = [];
  for (let r = 0; r <= G.maxR; r++) {
    for (let c = 0; c <= G.maxC - 2; c++) {
      const lbl = txt(G.cell(r, c));
      const val = num(G.cell(r, c + 1));
      const und = txt(G.cell(r, c + 2));
      if (lbl.length > 8 && val != null && /^(m2|m3|ml|kg|m)$/i.test(und) &&
          /(TOTAL|VOL|AREA|Requerir|TANQUE|HOMOG|OXIDAC|UÑA|UNA)/i.test(lbl)) {
        out.push({ label: lbl, valor: Math.round(val * 1000) / 1000, und: und.toUpperCase() });
      }
    }
  }
  const seen = new Set();
  return out.filter(m => { const k = m.label + m.und; if (seen.has(k)) return false; seen.add(k); return true; });
}

function main() {
  const wb = XLSX.readFile(FUENTE, { cellDates: true });
  const ws = wb.Sheets['4. Pull'];
  if (!ws) { console.error('No existe hoja "4. Pull". Hay:', wb.SheetNames.join(' | ')); process.exit(1); }
  const G = makeGrid(ws);

  // ── 1) Detectar fila de cabecera por CONTENIDO: celda "ID" con la de al lado conteniendo "PULL".
  //     (la hoja arranca en columna C; las coords son ABSOLUTAS, no hay que asumir col 0).
  let hdr = -1, C_ID = -1;
  for (let r = 0; r <= G.maxR && hdr < 0; r++) {
    for (let c = 0; c <= G.maxC; c++) {
      if (txt(G.cell(r, c)).toUpperCase() === 'ID' && txt(G.cell(r, c + 1)).toUpperCase().includes('PULL')) {
        hdr = r; C_ID = c; break;
      }
    }
  }
  if (hdr < 0) { console.error('No se encontró fila de cabecera ("ID" + "PULL...").'); process.exit(1); }

  // Columnas fijas detectadas por etiqueta de la cabecera
  const idxOf = (label) => {
    for (let c = C_ID; c <= G.maxC; c++) if (txt(G.cell(hdr, c)).toUpperCase() === label) return c;
    return -1;
  };
  const C_PART = C_ID + 1;
  const C_MET = idxOf('METRADO'), C_UND = idxOf('UND'), C_SEC = idxOf('SECTORES'),
        C_SECTOR = idxOf('SECTOR'), C_IP = idxOf('IP'), C_HH = idxOf('HH'), C_MO = idxOf('MO');

  // ── 2) Inicio de grilla de días: primera columna de la cabecera con un día de semana
  const DIAS_SEM = new Set(['LUN', 'MAR', 'MIÉ', 'MIE', 'JUE', 'VIE', 'SÁB', 'SAB', 'DOM']);
  let gridStart = -1;
  for (let c = Math.max(C_MO, C_HH) + 1; c <= G.maxC; c++) {
    if (DIAS_SEM.has(txt(G.cell(hdr, c)).toUpperCase())) { gridStart = c; break; }
  }
  if (gridStart < 0) gridStart = 10;
  // fin de grilla: última columna con día de semana en la cabecera
  let gridEnd = gridStart;
  for (let c = gridStart; c <= G.maxC; c++) if (DIAS_SEM.has(txt(G.cell(hdr, c)).toUpperCase())) gridEnd = c;

  // ── 3) Cabeceras de días (filas arriba de hdr): semana, nº correlativo, mes, día-mes, día-semana
  const rSemana = hdr - 4, rNum = hdr - 3, rMes = hdr - 2, rDiaMes = hdr - 1, rDow = hdr;
  const dias = [];
  let semanaActual = null, anioBase = 2025, prevMes = null;
  for (let c = gridStart; c <= gridEnd; c++) {
    const sem = txt(G.cell(rSemana, c));
    if (sem) semanaActual = sem;
    const nro = num(G.cell(rNum, c));
    const mesTxt = txt(G.cell(rMes, c)).toLowerCase().slice(0, 3);
    const mes = MESES[mesTxt] || null;
    const diaMes = num(G.cell(rDiaMes, c));
    const dow = txt(G.cell(rDow, c));
    if (mes != null) { if (prevMes != null && mes < prevMes) anioBase += 1; prevMes = mes; }
    let fecha = null;
    if (mes != null && diaMes != null) {
      fecha = `${anioBase}-${String(mes).padStart(2, '0')}-${String(diaMes).padStart(2, '0')}`;
    }
    dias.push({ col: colLetter(c), semana: semanaActual, nro, mes, diaMes, dow, fecha });
  }

  // ── 4) Filas de datos
  const NIVELES = new Set(['N1', 'N2', 'N3', 'N4']);
  const grupos = [];
  const actividades = [];
  let grupoActual = null;
  for (let r = hdr + 1; r <= G.maxR; r++) {
    const id = txt(G.cell(r, C_ID)).toUpperCase();
    const part = txt(G.cell(r, C_PART));
    if (!id && !part) {
      const nid = txt(G.cell(r + 1, C_ID)); const npart = txt(G.cell(r + 1, C_PART));
      if (!nid && !npart) break;
      continue;
    }
    const grid = [];
    for (let c = gridStart; c <= gridEnd; c++) grid.push(mark(G.cell(r, c)));

    if (NIVELES.has(id)) {
      grupoActual = { nivel: id, titulo: part, grid };
      grupos.push(grupoActual);
      continue;
    }
    actividades.push({
      cod: id || null,
      actividad: part,
      grupo: grupoActual ? grupoActual.titulo : null,
      metrado: num(G.cell(r, C_MET)),
      und: txt(G.cell(r, C_UND)) || null,
      sectores: num(G.cell(r, C_SEC)),
      sector: num(G.cell(r, C_SECTOR)),
      ip: num(G.cell(r, C_IP)),
      hh: num(G.cell(r, C_HH)),
      mo: num(G.cell(r, C_MO)),
      grid,
    });
  }

  // ── 5) KPIs
  const r2 = (n) => Math.round(n * 100) / 100;
  const totHH = actividades.reduce((s, a) => s + (a.hh || 0), 0);
  const totMO = actividades.reduce((s, a) => s + (a.mo || 0), 0);
  const conMarca = actividades.filter(a => a.grid.some(g => g)).length;

  // ── 6) Metrados volumétricos del tanque (hoja "5. Metr")
  const metrTanque = extraerMetrados(wb);

  // ── 7) Metadatos de cabecera: escanea cada fila por una celda "LABEL:" seguida de un valor.
  const meta = {};
  const setMeta = (k, v) => {
    if (!v) return;
    if (k.startsWith('OBRA')) meta.obra = v;
    else if (k.startsWith('CONTRATISTA')) meta.contratista = v;
    else if (k.startsWith('DENOMIN')) meta.denominacion = v;
    else if (k.startsWith('UBICAC')) meta.ubicacion = v;
    else if (k.startsWith('ELABORADO')) meta.elaboradoPor = v;
    else if (k.startsWith('REVISADO')) meta.revisadoPor = v;
    else if (k.startsWith('FECHA') && !meta.fecha) meta.fecha = v;
  };
  for (let r = 0; r < hdr; r++) {
    for (let c = 0; c <= Math.min(G.maxC, C_ID + 2); c++) {
      const k = txt(G.cell(r, c)).toUpperCase().replace(/[:]/g, '').trim();
      if (!k) continue;
      // valor = primera celda no vacía a la derecha (saltando ":" sueltos)
      let v = '';
      for (let cc = c + 1; cc <= c + 2 && cc <= G.maxC; cc++) {
        const t = txt(G.cell(r, cc));
        if (t && t !== ':') { v = t; break; }
      }
      setMeta(k, v);
    }
  }

  const out = {
    flujo: 'GP-GCR-FOR-F17',
    titulo: 'Plan de Vaciado · Tanque de Homogenización',
    proyecto: 'PTARI CREDITEX',
    meta,
    dias,
    numDias: dias.length,
    grupos,
    actividades,
    metrTanque,
    kpis: {
      totalActividades: actividades.length,
      totalFases: grupos.length,
      actividadesConMarca: conMarca,
      totalHH: r2(totHH),
      totalMO: totMO,
      diaInicio: (dias.find(d => d.fecha) || {}).fecha || null,
      diaFin: ([...dias].reverse().find(d => d.fecha) || {}).fecha || null,
      semanaInicio: (dias.find(d => d.semana) || {}).semana || null,
      semanaFin: ([...dias].reverse().find(d => d.semana) || {}).semana || null,
    },
  };

  // ── 8) Serializar: omite null/'' en escalares; en 'grid' mapea null->0 para conservar posición
  const clean = JSON.parse(JSON.stringify(out));
  const mapGrids = (arr) => arr.forEach(a => { if (a.grid) a.grid = a.grid.map(g => (g == null ? 0 : g)); });
  mapGrids(clean.actividades);
  mapGrids(clean.grupos);
  const replacer = (key, value) => (value === null || value === '') ? undefined : value;
  const body = JSON.stringify(clean, replacer);

  const banner = `// src/data/planVaciadoCreditex.js
// PLAN DE VACIADO (GP-GCR-FOR-F17) — Tanque de Homogenización · PTARI CREDITEX.
// Matriz tipo LAP (hoja "4. Pull"): actividades × días con marcas de vaciado (X, C1, S1A1, ...).
// IP/HH/MO con #DIV/0! (SECTORES=0) -> null. En 'grid', 0 = día sin marca (placeholder posicional).
// metrTanque = metrados volumétricos del tanque (hoja "5. Metr").
// Regenerar con: node scripts/extraerPlanVaciado.cjs   (NO editar a mano).
`;
  fs.writeFileSync(SALIDA, `${banner}export const PLANVACIADO = ${body};\n\nexport default PLANVACIADO;\n`, 'utf8');

  // ── 9) Reporte a stderr
  console.error('=== EXTRACCIÓN PLAN DE VACIADO ===');
  console.error('Hoja "4. Pull" | cabecera: fila ' + (hdr + 1) + ' (A="ID")');
  console.error('Cols -> METRADO:' + colLetter(C_MET) + ' UND:' + colLetter(C_UND) + ' SECTORES:' + colLetter(C_SEC) +
                ' SECTOR:' + colLetter(C_SECTOR) + ' IP:' + colLetter(C_IP) + ' HH:' + colLetter(C_HH) + ' MO:' + colLetter(C_MO));
  console.error('Grilla días: ' + colLetter(gridStart) + '..' + colLetter(gridEnd) + ' = ' + dias.length + ' días | ' +
                out.kpis.diaInicio + ' -> ' + out.kpis.diaFin + ' | ' + out.kpis.semanaInicio + ' -> ' + out.kpis.semanaFin);
  console.error('Fases (' + grupos.length + '): ' + grupos.map(g => g.titulo).join(', '));
  console.error('Actividades: ' + actividades.length + ' (con marca: ' + conMarca + ') | HH total: ' + out.kpis.totalHH + ' | MO total: ' + totMO);
  console.error('Metrados tanque: ' + metrTanque.length + ' -> ' + metrTanque.map(m => m.label + '=' + m.valor + m.und).join(' | '));
  console.error('Muestra:');
  actividades.slice(0, 6).forEach(a => console.error('  [' + a.cod + '] ' + a.actividad.slice(0, 38).padEnd(38) +
    ' met=' + a.metrado + a.und + ' sec=' + a.sectores + ' ip=' + a.ip + ' hh=' + a.hh + ' mo=' + a.mo +
    ' marcas=' + a.grid.filter(Boolean).length));
  const file = fs.statSync(SALIDA).size;
  console.error('Archivo: ' + SALIDA + ' (' + (file / 1024).toFixed(1) + ' KB)');
}

main();
