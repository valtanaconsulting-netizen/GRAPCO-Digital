// TareoPDFHtml — Réplica EXACTA del formato F13_MPO (Excel oficial GRAPCO).
// Todo el cuerpo es UNA SOLA tabla de 23 columnas (como la grilla del Excel):
// así las celdas de arriba (CUENTA DE COSTO / Uni / Avance / Rendim.) y los
// totales de colores del pie quedan perfectamente alineados con las columnas
// 1-10 / N / 0.6 / 1.0 / TOT de la tabla de trabajadores.
// Los datos (trabajadores sin duplicar, APELLIDOS NOMBRES, capataz primero,
// cargos desde la BD) vienen de utils/tareoDatos.js — compartidos con el Excel.
// Render: html2canvas mide y captura cada página REAL → jsPDF la centra en la
// hoja A4 landscape (horizontal y vertical) sin posibilidad de recorte.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { prepararDatosTareo, fmtFechaLargaF13 } from '../utils/tareoDatos';

const GREY = '#d9d9d9';
const PEACH = '#fde9d9';   // totales por actividad
const GREEN = '#e2efda';   // totales N / 0.6 / 1.0
const SALMON = '#f8b9b9';  // total general

// Tipografía: Calibri es la fuente del Excel original GRAPCO (limpia y
// profesional en Windows); Segoe UI / Arial como respaldo.
const FONT = `Calibri,'Segoe UI',Tahoma,Arial,sans-serif`;

// 23 columnas de la grilla (suman 100)
const COLS = [4, 3.2, 6, 5.8, 16, 4.5, 7.5, 4.5, 7.5, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 3, 3, 3, 6];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function cargarLogo() {
  try {
    const resp = await fetch('/grapco-logo-wide.png');
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// celda genérica
const td = (content, { cs = 1, bg = '', bold = false, align = 'center', fs = 8, pad = '3px 4px', h = '' } = {}) =>
  `<td colspan="${cs}" style="border:1px solid #000;${bg ? `background:${bg};` : ''}font-size:${fs}px;${bold ? 'font-weight:bold;' : ''}text-align:${align};padding:${pad};${h ? `height:${h}px;` : ''}vertical-align:middle;letter-spacing:0;">${content}</td>`;

function paginaHTML({ fecha, capataz, trabajadores, actividades, totales, supervisor, ruc, logo, esUltima }) {
  const fechaLarga = fmtFechaLargaF13(fecha);

  // ── Filas de actividades (Act.1-7 | Act.8-14) ──
  const filasActs = [0, 1, 2, 3, 4, 5, 6].map(i => `
    <tr>
      ${td(`Act. ${i + 1}`, { cs: 1, bold: true, fs: 8.5, align: 'center' })}
      ${td(esc(actividades[i] || ''), { cs: 4, align: 'left', fs: 7 })}
      ${td(`Act. ${i + 8}`, { cs: 1, bold: true, fs: 8.5, align: 'center' })}
      ${td(esc(actividades[i + 7] || ''), { cs: 3, align: 'left', fs: 7 })}
      ${td('', { cs: 10 })}${td('', { cs: 1 })}${td('', { cs: 2 })}${td('', { cs: 1 })}
    </tr>`).join('');

  // ── Filas de trabajadores ──
  const filasTrab = trabajadores.map((t, idx) => `
    <tr>
      ${td(idx + 1, { bold: true, h: 22 })}
      ${td(esc(t.car), { bold: true, fs: 7 })}
      ${td(esc(t.ocupacion), { bold: true, fs: 6.5 })}
      ${td(esc(t.dni), { bold: true, fs: 7 })}
      ${td(esc(t.nombre), { align: 'left', bold: true, fs: 7 })}
      ${td('7:30', { fs: 7.5 })}
      ${td('')}
      ${td('17:00', { fs: 7.5 })}
      ${td('')}
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
        const act = actividades[n];
        const v = act ? (t.actividades[act] || 0) : 0;
        return td(v ? v.toFixed(1) : '', { fs: 7.5 });
      }).join('')}
      ${td(t.totHN.toFixed(1), { fs: 7.5 })}
      ${td(t.totHE60 > 0 ? t.totHE60.toFixed(1) : '', { fs: 7.5 })}
      ${td(t.totHE100 > 0 ? t.totHE100.toFixed(1) : '', { fs: 7.5 })}
      ${td((t.totHN + t.totHE).toFixed(1), { bold: true, fs: 7.5 })}
    </tr>`).join('');

  // Fila vacía de reserva (como en el formato original)
  const filaVacia = `
    <tr>
      ${td(trabajadores.length + 1, { bold: true, h: 22 })}
      ${td('')}${td('')}${td('')}${td('', { align: 'left' })}
      ${td('')}${td('')}${td('')}${td('')}
      ${[...Array(10)].map(() => td('')).join('')}
      ${td('0.0', { fs: 7.5 })}${td('')}${td('')}${td('0.0', { bold: true, fs: 7.5 })}
    </tr>`;

  // ── Fila de totales con colores (alineada bajo columnas 1-10/N/0.6/1.0/TOT) ──
  const celdasTotales = `
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => td(totales.porCol[n].toFixed(1), { bg: PEACH, bold: true, fs: 7.5 })).join('')}
    ${td(totales.hn.toFixed(1), { bg: GREEN, bold: true, fs: 7.5 })}
    ${td(totales.he60.toFixed(1), { bg: GREEN, bold: true, fs: 7.5 })}
    ${td(totales.he100.toFixed(1), { bg: GREEN, bold: true, fs: 7.5 })}
    ${td(totales.total.toFixed(1), { bg: SALMON, bold: true, fs: 7.5 })}`;

  return `
  <div class="tareo-page" style="box-sizing:border-box;width:1122px;padding:10px 14px;font-family:${FONT};color:#000;background:#fff;letter-spacing:0;">

    <!-- ENCABEZADO (sin bordes) -->
    <div style="position:relative;height:52px;margin-bottom:4px;">
      ${logo
        ? `<img src="${logo}" style="position:absolute;left:0;top:0;height:46px;" />`
        : `<span style="position:absolute;left:0;top:8px;font-weight:bold;font-size:16px;">GRAPCO <span style="font-size:9px;">S.A.C</span></span>`}
      <span style="position:absolute;left:190px;top:16px;font-weight:bold;font-size:11px;">RUC: ${esc(ruc)}</span>
      <span style="position:absolute;left:63%;top:16px;font-weight:bold;font-size:10px;">FECHA:</span>
      <span style="position:absolute;left:78%;top:16px;font-weight:bold;font-size:10px;">${esc(fechaLarga)}</span>
    </div>

    <!-- Supervisor / HORARIO DE TRABAJO (sin bordes) -->
    <div style="position:relative;height:18px;margin-bottom:2px;">
      <span style="position:absolute;left:6px;font-weight:bold;font-size:10px;">Supervisor:&nbsp;&nbsp;&nbsp;${esc(supervisor)}</span>
      <span style="position:absolute;left:76%;font-weight:bold;font-size:10px;">HORARIO DE TRABAJO</span>
    </div>

    <!-- GRILLA ÚNICA (23 columnas) — borde exterior 2px para que el marco cierre -->
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;border:2px solid #000;">
      <colgroup>${COLS.map(w => `<col style="width:${w}%;">`).join('')}</colgroup>

      <!-- Bloque info -->
      <tr>
        ${td('CUADRILLA', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8, h: 20 })}
        ${td(esc(capataz), { cs: 3, align: 'left', fs: 7.5 })}
        ${td('ZONA:', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 7 })}
        ${td('', { cs: 6, bg: GREY })}
        ${td('INICIO', { cs: 2, bg: GREY, bold: true, fs: 8 })}
        ${td('FIN', { cs: 1, bg: GREY, bold: true, fs: 8 })}
      </tr>
      <tr>
        ${td('ESPECIALIDAD', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8, h: 20 })}
        ${td('', { cs: 3 })}
        ${td('SECTOR:', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 7 })}
        ${td('Jornada:', { cs: 6, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 2 })}
        ${td('', { cs: 1 })}
      </tr>
      <tr>
        ${td('JEFE GRUPO', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8, h: 20 })}
        ${td('', { cs: 3 })}
        ${td('NIVEL:', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 7 })}
        ${td('Refrigerio:', { cs: 6, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 2 })}
        ${td('', { cs: 1 })}
      </tr>
      <tr>
        ${td('', { cs: 9, h: 20 })}
        ${td('CUENTA DE COSTO (Fase)', { cs: 10, bg: GREY, bold: true, fs: 8 })}
        ${td('Uni', { cs: 1, bg: GREY, bold: true, fs: 8 })}
        ${td('Avance', { cs: 2, bg: GREY, bold: true, fs: 8 })}
        ${td('Rendim.', { cs: 1, bg: GREY, bold: true, fs: 8 })}
      </tr>

      <!-- Actividades Act.1-7 | Act.8-14 -->
      ${filasActs}

      <!-- Cabeceras de sección -->
      <tr>
        ${td('REFERENCIAS', { cs: 9, bg: GREY, bold: true, fs: 8, h: 18 })}
        ${td('ACTIVIDADES', { cs: 10, bg: GREY, bold: true, fs: 8 })}
        ${td('HORAS REALES', { cs: 4, bg: GREY, bold: true, fs: 8 })}
      </tr>

      <!-- Cabecera tabla trabajadores -->
      <tr>
        ${td('CODIGO', { bg: GREY, bold: true, fs: 6.5, h: 24 })}
        ${td('CAR.', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('OCUPACION', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('DNI', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('TRABAJADORES', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('Hora<br>Ingreso', { bg: GREY, bold: true, fs: 6.5, pad: '1px 2px' })}
        ${td('FIRMA INGRESO', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('Hora<br>Salida', { bg: GREY, bold: true, fs: 6.5, pad: '1px 2px' })}
        ${td('FIRMA SALIDA', { bg: GREY, bold: true, fs: 6.5 })}
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => td(n, { bg: GREY, bold: true, fs: 7 })).join('')}
        ${td('N', { bg: GREY, bold: true, fs: 7 })}
        ${td('0.6', { bg: GREY, bold: true, fs: 7 })}
        ${td('1.0', { bg: GREY, bold: true, fs: 7 })}
        ${td('TOT.', { bg: GREY, bold: true, fs: 7 })}
      </tr>

      <!-- Trabajadores -->
      ${filasTrab}
      ${filaVacia}

      <!-- Pie: firmas + totales de colores (misma grilla → alineación perfecta) -->
      <tr>
        ${td('ARAYA QUISPECONDORI MARCELINO', { cs: 4, bold: true, fs: 7.5, h: 30 })}
        ${td('RAFAEL CONDORI ALEXANDER', { cs: 2, bold: true, fs: 7.5 })}
        ${td('GONZALES GUTIERREZ GUIDO', { cs: 3, bold: true, fs: 7.5 })}
        ${celdasTotales}
      </tr>
      <tr>
        ${td('MAESTRO', { cs: 4, bold: true, fs: 7.5, h: 18 })}
        ${td('INGENIERO DE PRODUCCIÓN', { cs: 2, bold: true, fs: 7.5 })}
        ${td('INGENIERO RESIDENTE', { cs: 3, bold: true, fs: 7.5 })}
        ${td('Número de Trabajadores Parte', { cs: 13, bold: true, fs: 7 })}
        ${td(trabajadores.length, { cs: 1, bold: true, fs: 8 })}
      </tr>
    </table>
  </div>`;
}

// Construye el PDF completo: monta cada página fuera de pantalla, la captura
// con html2canvas (mide el tamaño REAL → nunca se recorta) y la inserta
// CENTRADA horizontal y verticalmente en una hoja A4 landscape con jsPDF.
// Lo comparten la DESCARGA (generarPDFTareoHtml) y la VISTA (verPDFTareoHtml).
async function construirPDFTareo(registrosPorDia, personalDB, ruc, supervisor = 'DIRAC') {
  const datos = prepararDatosTareo(registrosPorDia, personalDB);
  if (!datos.length) throw new Error('Sin registros para exportar');

  const logo = await cargarLogo();

  const container = document.createElement('div');
  container.innerHTML = datos.map(d => paginaHTML({ ...d, supervisor, ruc, logo })).join('');
  // Montado fuera de pantalla: html2canvas necesita layout real para medir
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const PW = 297, PH = 210, M = 8; // A4 landscape (mm) + margen
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const paginas = [...container.querySelectorAll('.tareo-page')];

    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvas(paginas[i], {
        scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });
      const ratio = canvas.height / canvas.width;
      let w = PW - 2 * M;
      let h = w * ratio;
      if (h > PH - 2 * M) { h = PH - 2 * M; w = h / ratio; }
      const x = (PW - w) / 2;   // centrado horizontal
      const y = (PH - h) / 2;   // centrado vertical — "al medio de todo"
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
    }

    const fechas = datos.map(d => d.fecha);
    const nombre = fechas.length > 1
      ? `Tareo_${fechas[0]}_a_${fechas[fechas.length - 1]}.pdf`
      : `Tareo_${fechas[0]}.pdf`;

    return { pdf, nombre, numPaginas: datos.length };
  } finally {
    container.remove();
  }
}

// Descarga el PDF (botón de Gestión → Tareo).
export async function generarPDFTareoHtml(registrosPorDia, personalDB, ruc, supervisor = 'DIRAC') {
  const { pdf, nombre, numPaginas } = await construirPDFTareo(registrosPorDia, personalDB, ruc, supervisor);
  pdf.save(nombre);
  return numPaginas;
}

// VISUALIZA el PDF en una pestaña nueva (vista del capataz: verificar las
// horas de su gente antes de imprimir/firmar). Si el navegador bloquea la
// pestaña, cae a descarga directa.
export async function verPDFTareoHtml(registrosPorDia, personalDB, ruc, supervisor = 'DIRAC') {
  const { pdf, nombre, numPaginas } = await construirPDFTareo(registrosPorDia, personalDB, ruc, supervisor);
  const url = URL.createObjectURL(pdf.output('blob'));
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
  }
  return numPaginas;
}
