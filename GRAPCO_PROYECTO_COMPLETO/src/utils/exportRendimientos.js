// src/utils/exportRendimientos.js
// Exporta un Excel LIMPIO de rendimientos por WBS (3 columnas, exigido por el
// usuario al cierre de obra):
//   1) WBS  → Partida ▸ Subpartida ▸ Actividad (jerarquía con bandas de color)
//   2) Rendimiento del PRESUPUESTO (IP contractual del catálogo: HH/unidad)
//   3) Rendimiento REAL en obra (ΣHH ÷ Σmetrado de los tareos)
// Colorea la fila según desempeño: verde si el real fue ≤ presupuesto
// (rindió igual o mejor), rojo si lo superó (rindió peor). exceljs lazy.

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

const NAVY = 'FF0F2A47', GOLD = 'FFE5A82F', GOLDSOFT = 'FFFCEFC9', GREY = 'FFD9D9D9';
const VERDE = 'FF1E7A46', VERDEBG = 'FFE6F4EA', ROJO = 'FFB42318', ROJOBG = 'FFFBE9E7', GRISTXT = 'FF8A94A3';

// wbs = árbol AGREGADO del CPI: { [partida]: { subs: { [sub]: { acts: { [act]:
//   { hhR, met } } } } } }. El IP real = HH real ÷ metrado real (mismo cálculo
//   que muestra el CPI), así no hay números que se contradigan.
export async function exportarRendimientosWBS({ wbs, infoMap, proyectoNombre = 'Proyecto' }) {
  const ExcelJSmod = await import('exceljs');
  const ExcelJS = ExcelJSmod.default || ExcelJSmod;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rendimientos');
  ws.columns = [
    { width: 64 },  // WBS
    { width: 26 },  // Rend. Presupuesto
    { width: 26 },  // Rend. Real
  ];

  const borde = { top: { style: 'thin', color: { argb: 'FFE5E9F0' } }, bottom: { style: 'thin', color: { argb: 'FFE5E9F0' } }, left: { style: 'thin', color: { argb: 'FFE5E9F0' } }, right: { style: 'thin', color: { argb: 'FFE5E9F0' } } };

  // ── Título ──
  ws.mergeCells('A1:C1');
  const t = ws.getCell('A1');
  t.value = 'RENDIMIENTOS POR WBS — PRESUPUESTO vs REAL';
  t.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;
  ws.mergeCells('A2:C2');
  const sub = ws.getCell('A2');
  sub.value = `${proyectoNombre}  ·  Rendimiento = HH por unidad (menor es mejor)`;
  sub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF5B6878' } };
  sub.alignment = { horizontal: 'center' };

  // ── Cabecera de columnas ──
  const head = ws.getRow(4);
  ['WBS — PARTIDA / SUBPARTIDA / ACTIVIDAD', 'REND. PRESUPUESTO', 'REND. REAL (OBRA)'].forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    c.border = borde;
  });
  head.height = 20;

  let fila = 5;
  const bandaPartida = (txt) => {
    ws.mergeCells(`A${fila}:C${fila}`);
    const c = ws.getCell(`A${fila}`);
    c.value = txt;
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(fila).height = 18;
    fila++;
  };
  const bandaSub = (txt) => {
    ws.mergeCells(`A${fila}:C${fila}`);
    const c = ws.getCell(`A${fila}`);
    c.value = txt;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: NAVY } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLDSOFT } };
    c.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
    fila++;
  };

  let nAct = 0, nConReal = 0, zebra = 0;
  Object.keys(wbs || {}).forEach((partida) => {
    bandaPartida(`▣  ${partida}`);
    const subs = (wbs[partida] && wbs[partida].subs) || {};
    Object.keys(subs).forEach((subN) => {
      bandaSub(`▸  ${subN}`);
      const acts = (subs[subN] && subs[subN].acts) || {};
      Object.keys(acts).forEach((actN) => {
        const act = acts[actN] || {};
        const info = (infoMap || {})[norm(actN)] || {};
        const un = info.un || 'UND';
        const ipPpto = info.ipP != null ? +Number(info.ipP).toFixed(4) : null;
        const ipReal = (act.met > 0) ? +(act.hhR / act.met).toFixed(4) : null;
        const row = ws.getRow(fila);
        // Col 1 — actividad (indentada)
        const c1 = row.getCell(1);
        c1.value = `      ${actN}`;
        c1.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2A37' } };
        c1.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        c1.border = borde;
        // Col 2 — rendimiento presupuesto
        const c2 = row.getCell(2);
        c2.value = ipPpto != null ? `${ipPpto} ${un}/u` : '—';
        c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: ipPpto != null ? 'FF1F2A37' : GRISTXT } };
        c2.alignment = { horizontal: 'center', vertical: 'middle' };
        c2.border = borde;
        // Col 3 — rendimiento real (coloreado por desempeño)
        const c3 = row.getCell(3);
        let bg = null, txtColor = GRISTXT;
        if (ipReal != null) {
          nConReal++;
          if (ipPpto != null) {
            const mejor = ipReal <= ipPpto;
            bg = mejor ? VERDEBG : ROJOBG;
            txtColor = mejor ? VERDE : ROJO;
          } else txtColor = 'FF1F2A37';
        }
        c3.value = ipReal != null ? `${ipReal} ${un}/u` : 'sin avance';
        c3.font = { name: 'Calibri', size: 10, bold: true, color: { argb: txtColor } };
        c3.alignment = { horizontal: 'center', vertical: 'middle' };
        c3.border = borde;
        if (bg) c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        else if (zebra % 2) { c1.fill = c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFD' } }; }
        zebra++; nAct++;
        fila++;
      });
    });
  });

  // ── Pie / leyenda ──
  fila++;
  ws.mergeCells(`A${fila}:C${fila}`);
  const leg = ws.getCell(`A${fila}`);
  leg.value = `${nAct} actividades · ${nConReal} con rendimiento real registrado.   Verde = rindió igual o mejor que el presupuesto · Rojo = rindió por debajo.`;
  leg.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF5B6878' } };
  leg.alignment = { horizontal: 'left' };

  // Encabezado repetido al imprimir + autofiltro
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.autoFilter = { from: 'A4', to: 'C4' };

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rendimientos_WBS_${proyectoNombre.replace(/[^\w-]/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  return { actividades: nAct, conReal: nConReal };
}
