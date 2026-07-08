// src/utils/bimExcel.js — Export de la Analítica BIM a Excel (exceljs, lazy).
// Hoja 1 "Resumen": agrupado estilo presupuesto peruano (Item, Descripción,
// Elem., Volumen, Área, Costo). Hoja 2 "Elementos": data plana auditable.

const NAVY = 'FF0F2A47';
const GOLD = 'FFE5A82F';
const SOFT = 'FFF4F7FB';

export async function exportarAnaliticaExcel({ grupos, elems, agruparPor, cuDe }) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GRAPCO Plataforma';
  wb.created = new Date();

  // ── Hoja 1: Resumen ──
  const h1 = wb.addWorksheet('Resumen', { views: [{ state: 'frozen', ySplit: 2 }] });
  h1.columns = [
    { header: 'Item', key: 'item', width: 8 },
    { header: agruparPor, key: 'desc', width: 42 },
    { header: 'Elem.', key: 'n', width: 10 },
    { header: 'Volumen (m³)', key: 'vol', width: 14 },
    { header: 'Área (m²)', key: 'area', width: 14 },
    { header: 'Costo (S/)', key: 'costo', width: 16 },
  ];
  h1.insertRow(1, [`ANALÍTICA BIM — ${agruparPor.toUpperCase()} · ${new Date().toLocaleDateString('es-PE')}`]);
  h1.mergeCells('A1:F1');
  const titulo = h1.getCell('A1');
  titulo.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titulo.alignment = { vertical: 'middle' };
  h1.getRow(1).height = 24;
  const cab = h1.getRow(2);
  cab.font = { bold: true, size: 10, color: { argb: NAVY } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };

  let tVol = 0, tArea = 0, tCosto = 0, tN = 0;
  grupos.forEach((g, i) => {
    tVol += g.vol; tArea += g.area; tCosto += g.costo; tN += g.n;
    const r = h1.addRow({
      item: String(i + 1).padStart(2, '0'),
      desc: g.valor, n: g.n,
      vol: +g.vol.toFixed(2), area: +g.area.toFixed(2), costo: +g.costo.toFixed(2),
    });
    r.getCell('vol').numFmt = '#,##0.00';
    r.getCell('area').numFmt = '#,##0.00';
    r.getCell('costo').numFmt = '"S/" #,##0.00';
  });
  const tot = h1.addRow({ item: '', desc: 'TOTAL', n: tN, vol: +tVol.toFixed(2), area: +tArea.toFixed(2), costo: +tCosto.toFixed(2) });
  tot.font = { bold: true };
  tot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4DC' } };
  tot.getCell('costo').numFmt = '"S/" #,##0.00';
  tot.getCell('vol').numFmt = '#,##0.00';
  tot.getCell('area').numFmt = '#,##0.00';
  tot.border = { top: { style: 'medium', color: { argb: GOLD } } };

  // ── Hoja 2: Elementos (auditoría) ──
  const h2 = wb.addWorksheet('Elementos', { views: [{ state: 'frozen', ySplit: 1 }] });
  h2.columns = [
    { header: 'GUID Revit (externalId)', key: 'x', width: 40 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Categoría', key: 'cat', width: 24 },
    { header: 'Tipo', key: 'tipo', width: 28 },
    { header: 'Nivel', key: 'nivel', width: 16 },
    { header: 'Volumen (m³)', key: 'vol', width: 13 },
    { header: 'Área (m²)', key: 'area', width: 12 },
    { header: 'C.U. (APU)', key: 'cu', width: 12 },
    { header: 'Parcial (S/)', key: 'parcial', width: 14 },
  ];
  h2.getRow(1).font = { bold: true, size: 10, color: { argb: NAVY } };
  h2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
  elems.forEach(e => {
    const cu = cuDe ? cuDe(e.categoria) : 0;
    const metrado = e.volumen > 0 ? e.volumen : e.area;
    h2.addRow({
      x: e.externalId || '', nombre: e.nombre, cat: e.categoria, tipo: e.tipo || '',
      nivel: e.nivel, vol: e.volumen, area: e.area, cu, parcial: +(cu * metrado).toFixed(2),
    });
  });
  ['vol', 'area', 'cu', 'parcial'].forEach(k => { h2.getColumn(k).numFmt = '#,##0.00'; });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `GRAPCO_Analitica_BIM_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
