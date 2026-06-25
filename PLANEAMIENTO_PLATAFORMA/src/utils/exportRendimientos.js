// src/utils/exportRendimientos.js
// Excel de rendimientos por WBS (cierre de obra), 4 columnas:
//   1) WBS  → Partida ▸ Subpartida ▸ Actividad (jerarquía con bandas de color)
//   2) Rend. PRESUPUESTO (IP contractual del catálogo: HH/unidad)
//   3) Rend. REAL en obra (ΣHH ÷ Σmetrado). Si la actividad NO tiene avance,
//      se muestra el rendimiento del PRESUPUESTO (en gris) para que no quede
//      vacío — pedido del usuario.
//   4) % VARIACIÓN = real ÷ presupuesto × 100 (105% = 5% más HH que lo previsto).
// Color: verde si rindió igual o mejor (≤100%), rojo si rindió peor (>100%),
// gris si no hubo avance (se asume el presupuesto). exceljs lazy.

import { normActividad as norm } from './normalizacion'; // idioma común (cruce con el catálogo)

const NAVY = 'FF0F2A47', GOLDSOFT = 'FFFCEFC9';
const VERDE = 'FF1E7A46', VERDEBG = 'FFE6F4EA', ROJO = 'FFB42318', ROJOBG = 'FFFBE9E7';
const GRISTXT = 'FF8A94A3', GRISBG = 'FFF1F4F8';

export async function exportarRendimientosWBS({ wbs, infoMap, proyectoNombre = 'Proyecto' }) {
  const ExcelJSmod = await import('exceljs');
  const ExcelJS = ExcelJSmod.default || ExcelJSmod;

  // Índice de catálogo INSENSIBLE A ACENTOS (antes "RECTIFICACIÓN" no cruzaba
  // con la clave del infoMap y salía "—" aunque sí estaba en el WBS).
  const infoNorm = {};
  Object.keys(infoMap || {}).forEach((k) => { infoNorm[norm(k)] = infoMap[k]; });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rendimientos');
  ws.columns = [{ width: 60 }, { width: 22 }, { width: 22 }, { width: 16 }];

  const borde = { top: { style: 'thin', color: { argb: 'FFE5E9F0' } }, bottom: { style: 'thin', color: { argb: 'FFE5E9F0' } }, left: { style: 'thin', color: { argb: 'FFE5E9F0' } }, right: { style: 'thin', color: { argb: 'FFE5E9F0' } } };

  ws.mergeCells('A1:D1');
  const t = ws.getCell('A1');
  t.value = 'RENDIMIENTOS POR WBS — PRESUPUESTO vs REAL';
  t.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;
  ws.mergeCells('A2:D2');
  const sub = ws.getCell('A2');
  sub.value = `${proyectoNombre}  ·  Rendimiento = HH por unidad (menor es mejor)  ·  % = real ÷ presupuesto`;
  sub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF5B6878' } };
  sub.alignment = { horizontal: 'center' };

  const head = ws.getRow(4);
  ['WBS — PARTIDA / SUBPARTIDA / ACTIVIDAD', 'REND. PRESUPUESTO', 'REND. REAL (OBRA)', '% VARIACIÓN'].forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    c.border = borde;
  });
  head.height = 20;

  let fila = 5;
  const banda = (txt, navy) => {
    ws.mergeCells(`A${fila}:D${fila}`);
    const c = ws.getCell(`A${fila}`);
    c.value = txt;
    c.font = { name: 'Calibri', size: navy ? 11 : 10, bold: true, color: { argb: navy ? 'FFFFFFFF' : NAVY } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy ? NAVY : GOLDSOFT } };
    c.alignment = { horizontal: 'left', vertical: 'middle', indent: navy ? 1 : 2 };
    if (navy) ws.getRow(fila).height = 18;
    fila++;
  };

  let nAct = 0, nConReal = 0, zebra = 0;
  Object.keys(wbs || {}).forEach((partida) => {
    banda(`▣  ${partida}`, true);
    const subs = (wbs[partida] && wbs[partida].subs) || {};
    Object.keys(subs).forEach((subN) => {
      banda(`▸  ${subN}`, false);
      const acts = (subs[subN] && subs[subN].acts) || {};
      Object.keys(acts).forEach((actN) => {
        const act = acts[actN] || {};
        const info = infoNorm[norm(actN)] || {};
        const un = info.un || 'UND';
        const ipPpto = (info.ipP != null && info.ipP !== '') ? +Number(info.ipP).toFixed(4) : null;
        const ipRealMedido = (act.met > 0) ? +(act.hhR / act.met).toFixed(4) : null;
        const conAvance = ipRealMedido != null;
        // Si NO hay avance → se asume el rendimiento del presupuesto.
        const ipReal = conAvance ? ipRealMedido : ipPpto;
        const pct = (ipPpto != null && ipPpto > 0 && ipReal != null) ? Math.round((ipReal / ipPpto) * 100) : null;

        const row = ws.getRow(fila);
        const c1 = row.getCell(1);
        c1.value = `      ${actN}`;
        c1.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2A37' } };
        c1.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        c1.border = borde;

        const c2 = row.getCell(2);
        c2.value = ipPpto != null ? `${ipPpto} ${un}/u` : '—';
        c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: ipPpto != null ? 'FF1F2A37' : GRISTXT } };
        c2.alignment = { horizontal: 'center', vertical: 'middle' };
        c2.border = borde;

        // Color por desempeño (solo si hubo avance real medido)
        let bg = GRISBG, txt = GRISTXT;
        if (conAvance && ipPpto != null) {
          const mejor = ipReal <= ipPpto;
          bg = mejor ? VERDEBG : ROJOBG;
          txt = mejor ? VERDE : ROJO;
          nConReal++;
        } else if (conAvance) { bg = null; txt = 'FF1F2A37'; nConReal++; }

        const c3 = row.getCell(3);
        c3.value = ipReal != null ? `${ipReal} ${un}/u${conAvance ? '' : ' (ppto)'}` : '—';
        c3.font = { name: 'Calibri', size: 10, bold: true, color: { argb: txt } };
        c3.alignment = { horizontal: 'center', vertical: 'middle' };
        c3.border = borde;
        if (bg) c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };

        const c4 = row.getCell(4);
        c4.value = pct != null ? `${pct}%` : '—';
        c4.font = { name: 'Calibri', size: 10, bold: true, color: { argb: !conAvance ? GRISTXT : (pct > 100 ? ROJO : VERDE) } };
        c4.alignment = { horizontal: 'center', vertical: 'middle' };
        c4.border = borde;
        if (conAvance && bg) c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };

        if (!bg && zebra % 2) { c1.fill = c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFD' } }; }
        zebra++; nAct++;
        fila++;
      });
    });
  });

  fila++;
  ws.mergeCells(`A${fila}:D${fila}`);
  const leg = ws.getCell(`A${fila}`);
  leg.value = `${nAct} actividades · ${nConReal} con avance real.   Verde = rindió igual o mejor (≤100%) · Rojo = rindió peor (>100%) · Gris = sin avance (se muestra el presupuesto).`;
  leg.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF5B6878' } };
  leg.alignment = { horizontal: 'left' };

  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.autoFilter = { from: 'A4', to: 'D4' };

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
