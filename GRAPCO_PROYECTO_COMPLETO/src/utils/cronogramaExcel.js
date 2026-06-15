// src/utils/cronogramaExcel.js
// Exporta el cronograma (CPM) a un Excel PREMIUM estilo MS Project: tabla con EDT
// indentado + Gantt visual de celdas a color por semana, y lo re-importa (round-trip).
// El round-trip es fiable porque las predecesoras referencian el `id` de la tarea y el
// Excel lleva la columna ID; el nivel se deriva del EDT (1.2.3 → nivel 3).
// ExcelJS se carga PEREZOSO (solo al exportar/importar).

const NAVY = 'FF0B1F39', NAVY2 = 'FF16386A', NAVYSOFT = 'FFEAF0F7', GOLD = 'FFE5A82F',
  GOLDSOFT = 'FFFCEFC9', TEAL = 'FF0E8AA0', RED = 'FFC0392B', GREEN = 'FF1F9D57',
  GRIS = 'FF8A94A3', INK = 'FF44506A', SOFT = 'FFF5F8FC', WHITE = 'FFFFFFFF';

const thin = (c) => ({ style: 'thin', color: { argb: c || 'FFE3E9F0' } });
const borde = { top: thin(), bottom: thin(), left: thin(), right: thin() };
const colLetter = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const num = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};

// ─────────────────────────── EXPORTAR ───────────────────────────
export async function exportarCronogramaExcel({ cpm, fechaInicio, proyectoNombre = 'Proyecto', baseline = null }) {
  const ExcelJSmod = await import('exceljs');
  const ExcelJS = ExcelJSmod.default || ExcelJSmod;
  const tareas = cpm?.tareas || [];
  if (!tareas.length) throw new Error('No hay tareas para exportar.');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GRAPCO · Plataforma VDC';
  const conVar = !!baseline;
  const DATA_COLS = conVar ? 10 : 9; // +1 si hay columna VAR. vs línea base

  // Nº de semanas del Gantt (6 días laborables/semana, igual que la vista).
  const maxEf = tareas.reduce((m, t) => Math.max(m, t.ef || 0), 0);
  const nSem = Math.min(220, Math.max(1, Math.ceil(maxEf / 6)));
  const totCols = DATA_COLS + nSem;

  const ws = wb.addWorksheet('Cronograma', {
    views: [{ state: 'frozen', xSplit: DATA_COLS, ySplit: 4 }],
    properties: { defaultRowHeight: 15 },
  });

  // Anchos
  const widths = conVar ? [6, 9, 50, 7, 12, 12, 13, 6, 8, 8] : [6, 9, 52, 7, 12, 12, 14, 6, 8];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  for (let s = 0; s < nSem; s++) ws.getColumn(DATA_COLS + 1 + s).width = 3.3;

  // Título + subtítulo (bandas navy/oro)
  ws.mergeCells(`A1:${colLetter(totCols)}1`);
  const t1 = ws.getCell('A1');
  t1.value = '📅  CRONOGRAMA DE OBRA — CPM (estilo MS Project / Primavera)';
  t1.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;
  ws.mergeCells(`A2:${colLetter(totCols)}2`);
  const t2 = ws.getCell('A2');
  t2.value = `${proyectoNombre}    ·    Inicio ${fechaInicio}    ·    Fin ${cpm.finProyecto}    ·    Duración ${cpm.duracionProyecto} d    ·    Avance ${cpm.avanceGlobal}%    ·    Tareas críticas ${cpm.criticas}`;
  t2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: INK } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLDSOFT } };
  t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;

  // Cabecera (fila 4)
  const heads = ['ID', 'EDT', 'NOMBRE DE TAREA', 'DUR (d)', 'INICIO', 'FIN', 'PRED.', '%', 'HOLG.', ...(conVar ? ['VAR.'] : [])];
  const hr = ws.getRow(4);
  heads.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { vertical: 'middle', horizontal: i === 2 ? 'left' : 'center', indent: i === 2 ? 1 : 0 };
    c.border = borde;
  });
  for (let s = 0; s < nSem; s++) {
    const c = hr.getCell(DATA_COLS + 1 + s);
    c.value = `S${s + 1}`;
    c.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: GOLD } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = { left: thin('FF26405F'), bottom: thin('FF26405F') };
  }
  hr.height = 18;

  // Filas de tareas
  let r = 5;
  tareas.forEach((t, idx) => {
    const row = ws.getRow(r);
    const nivel = Math.max(1, t.nivel || 1);
    const esResumen = !!t.resumen, esHito = !!t.milestone, esCrit = !!t.critica;
    const baseFill = esResumen ? NAVYSOFT : (idx % 2 ? SOFT : WHITE);
    const set = (col, val, opt = {}) => {
      const c = row.getCell(col);
      c.value = val;
      c.font = { name: 'Segoe UI', size: 9, ...(opt.font || {}) };
      c.alignment = { vertical: 'middle', ...(opt.align || {}) };
      c.border = borde;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opt.fill || baseFill } };
    };
    set(1, t.id, { font: { color: { argb: GRIS }, size: 8 }, align: { horizontal: 'center' } });
    set(2, t.edt, { font: { color: { argb: NAVY2 }, bold: esResumen }, align: { horizontal: 'left' } });
    set(3, (esHito ? '◆ ' : '') + (t.nombre || ''), { font: { color: { argb: NAVY }, bold: esResumen }, align: { horizontal: 'left', indent: nivel - 1, wrapText: false } });
    set(4, esResumen ? Math.round((t.duracion || 0) * 10) / 10 : (t.duracion || 0), { align: { horizontal: 'center' } });
    set(5, t.inicio || '', { font: { color: { argb: INK } }, align: { horizontal: 'center' } });
    set(6, t.fin || '', { font: { color: { argb: INK } }, align: { horizontal: 'center' } });
    set(7, esResumen ? '' : (t.predecesoras || ''), { font: { color: { argb: GRIS }, size: 8 }, align: { horizontal: 'center' } });
    set(8, `${Math.round(t.avance || 0)}%`, { align: { horizontal: 'center' } });
    set(9, esResumen ? '' : (t.holgura ?? ''), { font: { color: { argb: esCrit ? RED : ((t.holgura || 0) > 0 ? GREEN : GRIS) }, bold: true }, align: { horizontal: 'center' } });
    if (conVar) {
      const b = baseline?.porId?.[t.id];
      const v = (b && !esResumen) ? Math.round((t.ef - b.ef) * 10) / 10 : null;
      set(10, esResumen ? '' : (b ? (v === 0 ? '0' : (v > 0 ? `+${v}` : `${v}`)) : 'nueva'),
        { font: { color: { argb: v > 0 ? RED : (v < 0 ? GREEN : GRIS) }, bold: true }, align: { horizontal: 'center' } });
    }

    // Gantt: pinta las celdas-semana que abarca la barra
    const sw = Math.floor((t.es || 0) / 6);
    const ew = Math.max(sw, Math.floor(((t.ef || t.es || 0) - 0.0001) / 6));
    const barColor = esResumen ? NAVY : (esCrit ? RED : TEAL);
    for (let w = 0; w < nSem; w++) {
      const c = row.getCell(DATA_COLS + 1 + w);
      c.border = { right: thin('FFEDF1F6'), bottom: thin('FFF2F5F9') };
      if (esHito && w === sw) {
        c.value = '◆';
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: GOLD } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (!esHito && w >= sw && w <= ew) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: barColor } };
      } else {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: w % 2 ? 'FFFAFCFE' : WHITE } };
      }
    }
    row.height = 14.5;
    r++;
  });

  // Pie con la leyenda
  const lr = r + 1;
  ws.mergeCells(`A${lr}:${colLetter(Math.min(totCols, 12))}${lr}`);
  const leg = ws.getCell(`A${lr}`);
  leg.value = '🟦 Tarea   🟥 Ruta crítica   ⬛ Fase resumen   ◆ Hito   ·   Editable: cambia DUR / PRED. / % y vuelve a subir el archivo para recalcular en la plataforma.';
  leg.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: GRIS } };

  const outBuf = await wb.xlsx.writeBuffer();
  const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cronograma_${(proyectoNombre || 'Proyecto').replace(/[^\w-]+/g, '_')}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { tareas: tareas.length, semanas: nSem };
}

// ─────────────────────────── IMPORTAR ───────────────────────────
// Lee el Excel (la hoja "Cronograma") y reconstruye las tareas crudas para setTareas().
// El nivel sale del EDT (nº de segmentos); una fila es RESUMEN si la siguiente es más
// profunda → su duración/predecesoras/avance los recalcula el CPM (van en 0/'').
export async function importarCronogramaExcel(file) {
  const ExcelJSmod = await import('exceljs');
  const ExcelJS = ExcelJSmod.default || ExcelJSmod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet('Cronograma') || wb.worksheets[0];
  if (!ws) throw new Error('El archivo no tiene hojas.');

  // Localiza la fila de cabecera (la que trae EDT + NOMBRE…) y mapea columnas.
  const col = {};
  let headRow = -1;
  for (let rr = 1; rr <= Math.min(25, ws.rowCount); rr++) {
    const vals = ws.getRow(rr).values.map(v => (v == null ? '' : String(v)).trim().toUpperCase());
    if (vals.includes('EDT') && vals.some(v => v.startsWith('NOMBRE'))) {
      headRow = rr;
      vals.forEach((v, i) => {
        if (v === 'ID') col.id = i;
        else if (v === 'EDT') col.edt = i;
        else if (v.startsWith('NOMBRE')) col.nom = i;
        else if (v.startsWith('DUR')) col.dur = i;
        else if (v.startsWith('PRED')) col.pred = i;
        else if (v === '%') col.av = i;
      });
      break;
    }
  }
  if (headRow < 0 || !col.edt || !col.nom) {
    throw new Error('No encontré la cabecera (EDT / NOMBRE DE TAREA). Sube un Cronograma exportado de la plataforma.');
  }

  const cellStr = (R, i) => i ? String(R.getCell(i).value ?? '').trim() : '';
  const filas = [];
  for (let rr = headRow + 1; rr <= ws.rowCount; rr++) {
    const R = ws.getRow(rr);
    const nombre = cellStr(R, col.nom).replace(/^◆\s*/, '');
    const edt = cellStr(R, col.edt);
    if (!nombre) continue;                              // fila vacía o leyenda
    if (!edt && /editable|leyenda|🟦/i.test(nombre)) continue;
    filas.push({
      id: cellStr(R, col.id),
      nivel: edt ? edt.split('.').filter(Boolean).length : 1,
      nombre,
      dur: num(col.dur ? R.getCell(col.dur).value : 0),
      pred: cellStr(R, col.pred),
      av: num(col.av ? R.getCell(col.av).value : 0),
    });
  }
  if (!filas.length) throw new Error('No encontré filas de tareas en el archivo.');

  let maxId = 0;
  filas.forEach(f => { const n = parseInt(f.id, 10); if (!isNaN(n) && n > maxId) maxId = n; });
  const usados = new Set();
  const tareas = filas.map((f, i) => {
    const esResumen = i + 1 < filas.length && filas[i + 1].nivel > f.nivel;
    let id = f.id && !usados.has(f.id) ? f.id : String(++maxId);
    usados.add(id);
    return {
      id,
      nombre: f.nombre,
      nivel: f.nivel,
      duracion: esResumen ? 0 : Math.max(0, f.dur || 0),
      predecesoras: esResumen ? '' : (f.pred || ''),
      avance: esResumen ? 0 : Math.max(0, Math.min(100, f.av || 0)),
      inicioManual: null,
    };
  });
  return { tareas, total: tareas.length };
}
