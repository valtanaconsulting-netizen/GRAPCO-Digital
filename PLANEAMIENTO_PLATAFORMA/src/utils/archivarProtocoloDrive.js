// src/utils/archivarProtocoloDrive.js
// ════════════════════════════════════════════════════════════════
// Genera el PDF de un protocolo (capturando su contenido en pantalla con
// html2canvas + jsPDF) y lo sube a Google Drive con la cuenta del usuario
// (vía googleDriveClient → costo $0, usa el espacio del propio usuario).
//
// Estructura en Drive:  1. PROTOCOLOS / FRENTE {x} / SEMANA {y} / {numeroRegistro}.pdf
// ════════════════════════════════════════════════════════════════

import { archivarPdfEnDrive } from './googleDriveClient';

const CDN_HTML2CANVAS = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const CDN_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

const cargarScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) return res();
  const s = document.createElement('script');
  s.src = src;
  s.onload = () => res();
  s.onerror = () => rej(new Error(`No se pudo cargar ${src}`));
  document.head.appendChild(s);
});

async function cargarLibs() {
  if (!window.html2canvas) await cargarScript(CDN_HTML2CANVAS);
  if (!window.jspdf) await cargarScript(CDN_JSPDF);
  if (!window.html2canvas || !window.jspdf) throw new Error('No se cargaron las librerías de PDF');
}

// Captura un elemento del DOM y devuelve el PDF como Blob (A4, multipágina).
async function generarPdfBlob(elemento) {
  await cargarLibs();
  const canvas = await window.html2canvas(elemento, {
    scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    windowWidth: elemento.scrollWidth,
  });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const A4_W = 210, A4_H = 297;
  const mmPorPx = A4_W / canvas.width;
  const altoTotalMm = canvas.height * mmPorPx;

  if (altoTotalMm <= A4_H + 0.5) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, altoTotalMm, undefined, 'FAST');
  } else {
    const chunkAltoPx = Math.floor(A4_H / mmPorPx);
    let yPx = 0, primera = true;
    while (yPx < canvas.height) {
      const altoChunkPx = Math.min(chunkAltoPx, canvas.height - yPx);
      const temp = document.createElement('canvas');
      temp.width = canvas.width; temp.height = altoChunkPx;
      const ctx = temp.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, temp.width, temp.height);
      ctx.drawImage(canvas, 0, yPx, canvas.width, altoChunkPx, 0, 0, canvas.width, altoChunkPx);
      if (!primera) pdf.addPage();
      pdf.addImage(temp.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, altoChunkPx * mmPorPx, undefined, 'FAST');
      primera = false;
      yPx += altoChunkPx;
    }
  }
  return pdf.output('blob');
}

// Deriva la jerarquía de carpetas en Drive desde los datos del protocolo.
function rutaDrive(p) {
  // frenteCodigo (p.ej. "F-01") o, si no, lo extrae del numeroRegistro (PV-F01-557 → F01)
  const frente = p.frenteCodigo || (p.numeroRegistro || '').split('-')[1] || 'Sin frente';
  const semana = p.semanaISO || 'Sin semana';
  return ['1. PROTOCOLOS', `FRENTE ${frente}`, `SEMANA ${semana}`];
}

// Sube a Drive un Blob de PDF ya generado (p.ej. el CAL-FOR-006 oficial vía
// @react-pdf/renderer), usando la misma ruta canónica. Devuelve { url, id }.
export async function archivarBlobProtocoloEnDrive(protocolo, blob) {
  const base = (protocolo.numeroRegistro || protocolo.codigo || 'protocolo').replace(/[^\w.-]/g, '_');
  return archivarPdfEnDrive({
    rutaNombres: rutaDrive(protocolo),
    nombreArchivo: `${base}.pdf`,
    blob,
  });
}

// Genera el PDF del protocolo (desde su elemento en pantalla) y lo sube a Drive.
// Devuelve { url, id }.
export async function archivarProtocoloEnDrive(protocolo, elemento) {
  const blob = await generarPdfBlob(elemento);
  return archivarBlobProtocoloEnDrive(protocolo, blob);
}
