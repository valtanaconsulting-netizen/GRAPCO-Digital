// src/utils/valorizacionF07Pdf.js
// Genera el PDF del formato oficial GP-GCE-FOR-F07 "4. VAL": cabecera tipo Excel
// (Obra/Cliente/…) + grilla por ítem con Presupuesto y los bloques Acum.Anterior /
// Actual / Acumulado / Saldo (Cantidad·%·Total) + fila de TOTALES. A4 horizontal.
import { cargarJsPDF } from './pdfExport';

const NAVY = [30, 58, 95];
const GOLD = [217, 159, 41];
const GOLD_LIGHT = [253, 246, 227];
const GRIS = [51, 65, 85];
const VERDE = [21, 128, 61];
const AZUL = [3, 105, 161];
const soles = (n) => (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cant = (n) => (Number(n) || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
const pct = (q, base) => (base > 0 ? Math.round((q / base) * 100) : 0) + '%';

// Construye las 3 celdas (cant·%·total) de un bloque; '—' si no hay cantidad.
const blo = (q, base, pu) => {
  const v = Number(q) || 0;
  return v ? [cant(v), pct(v, base), soles(v * pu)] : ['—', '—', '—'];
};

/**
 * @param {Object} o
 * @param {Array}  o.presu        filas del presupuesto F07 (esPartida, item, descripcion, und, cant, pu, mkey, nivel)
 * @param {Object} o.ejecPorItem  mkey → { ant, act, acum }
 * @param {Object} o.tot          { parcial, ant, act, acum, saldo }
 * @param {Object} o.meta         { tituloPeriodo, obra, cliente, contratista, supervision, ubicacion, fuente, fecha }
 */
export async function generarPDFValorizacionF07({ presu, ejecPorItem, tot, meta = {} }) {
  const { jsPDF } = await cargarJsPDF();
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // ── Cabecera GRAPCO ──
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 20, 'F');
  doc.setFillColor(...GOLD); doc.rect(0, 20, W, 1.2, 'F');
  doc.setTextColor(...GOLD); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('GRAPCO SAC', 12, 9);
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('GP-GCE-FOR-F07 · Valorización de Obra', 12, 14.5);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(meta.tituloPeriodo || 'VALORIZACIÓN', W / 2, 11, { align: 'center' });
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text(meta.fecha || new Date().toLocaleDateString('es-PE'), W - 12, 13, { align: 'right' });

  // ── Datos de obra (2 columnas) ──
  const datos = [
    ['OBRA', meta.obra || ''], ['CLIENTE', meta.cliente || ''],
    ['CONTRATISTA', meta.contratista || 'GRAPCO SAC'], ['SUPERVISIÓN', meta.supervision || ''],
    ['UBICACIÓN', meta.ubicacion || ''], ['FUENTE', meta.fuente === 'vivo' ? 'Metrado en vivo (producción)' : 'F07 oficial (ISP)'],
  ];
  doc.setFontSize(7); let y = 27;
  datos.forEach(([k, v], i) => {
    const x = i % 2 === 0 ? 12 : W / 2 + 2;
    doc.setTextColor(120, 130, 145); doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, x, y);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
    doc.text(String(v).slice(0, 70), x + 24, y);
    if (i % 2 === 1) y += 4.6;
  });

  // ── Cabecera de tabla (2 filas con colores) ──
  const head = [
    [
      { content: 'ITEM', rowSpan: 2, styles: { fillColor: NAVY, valign: 'middle', halign: 'center' } },
      { content: 'DESCRIPCIÓN', rowSpan: 2, styles: { fillColor: NAVY, valign: 'middle', halign: 'left' } },
      { content: 'PRESUPUESTO', colSpan: 4, styles: { fillColor: NAVY } },
      { content: 'ACUM. ANTERIOR', colSpan: 3, styles: { fillColor: GRIS } },
      { content: 'ACTUAL', colSpan: 3, styles: { fillColor: GOLD } },
      { content: 'ACUMULADO', colSpan: 3, styles: { fillColor: VERDE } },
      { content: 'SALDO REF.', colSpan: 3, styles: { fillColor: AZUL } },
    ],
    ['UND', 'CANT', 'P.U.', 'PARCIAL', 'CANT', '%', 'TOTAL', 'CANT', '%', 'TOTAL', 'CANT', '%', 'TOTAL', 'CANT', '%', 'TOTAL']
      .map((t, i) => ({ content: t, styles: { fillColor: NAVY, halign: i === 0 ? 'center' : 'right' } })),
  ];

  // ── Cuerpo ──
  const body = [];
  presu.forEach(p => {
    if (!p.esPartida) {
      const tit = (p.nivel || 1) <= 1;
      body.push([{ content: `${p.item}   ${p.descripcion}`, colSpan: 18,
        styles: { fillColor: tit ? GOLD : GOLD_LIGHT, textColor: tit ? [255, 255, 255] : NAVY, fontStyle: 'bold', halign: 'left' } }]);
      return;
    }
    const pu = p.pu || 0, c = p.cant || 0, e = ejecPorItem[p.mkey] || { ant: 0, act: 0, acum: 0 };
    body.push([
      p.item, p.descripcion, p.und, cant(c), soles(pu), soles(c * pu),
      ...blo(e.ant, c, pu), ...blo(e.act, c, pu), ...blo(e.acum, c, pu), ...blo(c - e.acum, c, pu),
    ]);
  });

  const foot = [[
    { content: 'TOTALES (S/.)', colSpan: 5, styles: { halign: 'right', fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: soles(tot.parcial), styles: { halign: 'right', fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: '', colSpan: 2, styles: { fillColor: NAVY } }, { content: soles(tot.ant), styles: { halign: 'right', fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: '', colSpan: 2, styles: { fillColor: NAVY } }, { content: soles(tot.act), styles: { halign: 'right', fillColor: NAVY, textColor: [255, 230, 150], fontStyle: 'bold' } },
    { content: '', colSpan: 2, styles: { fillColor: NAVY } }, { content: soles(tot.acum), styles: { halign: 'right', fillColor: NAVY, textColor: [150, 240, 170], fontStyle: 'bold' } },
    { content: '', colSpan: 2, styles: { fillColor: NAVY } }, { content: soles(tot.saldo), styles: { halign: 'right', fillColor: NAVY, textColor: [140, 210, 250], fontStyle: 'bold' } },
  ]];

  doc.autoTable({
    head, body, foot, startY: y + 2,
    margin: { left: 8, right: 8, bottom: 12 },
    theme: 'grid',
    styles: { fontSize: 5.6, cellPadding: 0.9, lineColor: [210, 220, 232], lineWidth: 0.1, textColor: [30, 41, 59], halign: 'right', overflow: 'linebreak' },
    headStyles: { textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5.6, halign: 'center', valign: 'middle', lineColor: [255, 255, 255], lineWidth: 0.1 },
    footStyles: { fontSize: 6 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 },
      1: { halign: 'left', cellWidth: 46 },
      2: { halign: 'center', cellWidth: 9 },
    },
    didDrawPage: (data) => {
      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(120, 130, 145); doc.setFont('helvetica', 'normal');
      doc.text(`Página ${data.pageNumber}`, W / 2, ph - 6, { align: 'center' });
      doc.text('GRAPCO · Valorización F07 · generado automáticamente', 8, ph - 6);
    },
  });

  const nombre = `Valorizacion_F07_${(meta.tituloPeriodo || 'val').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;
  doc.save(nombre);
  return { ok: true, nombre };
}
