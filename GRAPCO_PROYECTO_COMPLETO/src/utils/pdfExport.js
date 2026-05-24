// src/utils/pdfExport.js
// Exportación a PDF nativo usando jsPDF + jspdf-autotable cargados desde CDN.
// No requiere npm install — se cargan dinámicamente la primera vez que se llama.

const CDN_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const CDN_AUTOTABLE = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

let jspdfPromise = null;

const cargarJsPDF = () => {
  if (jspdfPromise) return jspdfPromise;
  if (window.jspdf) return Promise.resolve(window.jspdf);

  jspdfPromise = new Promise((resolve, reject) => {
    const cargarScript = (src) => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(s);
    });

    cargarScript(CDN_JSPDF)
      .then(() => cargarScript(CDN_AUTOTABLE))
      .then(() => {
        if (!window.jspdf) {
          reject(new Error('jsPDF no se inicializó correctamente'));
          return;
        }
        resolve(window.jspdf);
      })
      .catch(reject);
  });

  return jspdfPromise;
};

/**
 * Exporta una vista a PDF con header GRAPCO + tabla de datos.
 *
 * @param {Object} opts
 * @param {string} opts.titulo       — Título principal del documento
 * @param {string} opts.subtitulo    — Subtítulo / contexto
 * @param {Array<Array>} opts.headers — Cabeceras de la tabla [['col1', 'col2', ...]]
 * @param {Array<Array>} opts.rows   — Filas de datos [[v1, v2, ...], ...]
 * @param {string} opts.nombreArchivo — Nombre del PDF
 * @param {string} opts.orientacion  — 'p' (portrait) o 'l' (landscape) - default 'l'
 */
export const exportarPDF = async ({
  titulo = 'GRAPCO Produc-App',
  subtitulo = '',
  headers = [],
  rows = [],
  nombreArchivo = 'reporte.pdf',
  orientacion = 'l',
  metadata = {},
  soloBlob = false, // si true, no descarga; solo retorna { blob } para compartir
}) => {
  try {
    const { jsPDF } = await cargarJsPDF();
    const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' });

    // Colores GRAPCO
    const NAVY = [30, 58, 95];
    const GOLD = [245, 158, 11];

    // === HEADER ===
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, 'F');

    // Banda dorada decorativa
    doc.setFillColor(...GOLD);
    doc.rect(0, 22, doc.internal.pageSize.getWidth(), 1.5, 'F');

    // Logo (texto GRAPCO en esquina superior izquierda)
    doc.setTextColor(...GOLD);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAPCO SAC', 14, 9);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Productividad de Obra', 14, 14);

    // Título centrado
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const wTitle = doc.getStringUnitWidth(titulo) * 13 / doc.internal.scaleFactor;
    doc.text(titulo, (doc.internal.pageSize.getWidth() - wTitle) / 2, 11);

    if (subtitulo) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const wSub = doc.getStringUnitWidth(subtitulo) * 8 / doc.internal.scaleFactor;
      doc.text(subtitulo, (doc.internal.pageSize.getWidth() - wSub) / 2, 16);
    }

    // Fecha en esquina derecha
    doc.setFontSize(8);
    const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const fechaText = `${fecha} · ${hora}`;
    const wFecha = doc.getStringUnitWidth(fechaText) * 8 / doc.internal.scaleFactor;
    doc.text(fechaText, doc.internal.pageSize.getWidth() - wFecha - 14, 14);

    // === METADATA EXTRA (si hay) ===
    let yMeta = 30;
    if (metadata && Object.keys(metadata).length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      Object.entries(metadata).forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${k}:`, 14, yMeta);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), 30, yMeta);
        yMeta += 5;
      });
      yMeta += 2;
    }

    // === TABLA con autoTable ===
    if (headers.length > 0 && rows.length > 0) {
      doc.autoTable({
        head: headers,
        body: rows,
        startY: yMeta + 2,
        margin: { left: 14, right: 14, bottom: 16 },
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          textColor: [30, 41, 59],
        },
        headStyles: {
          fillColor: NAVY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: (data) => {
          // Footer en cada página
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageWidth = doc.internal.pageSize.getWidth();
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Página ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
          doc.text(
            'GRAPCO Produc-App · Generado automáticamente',
            14,
            pageHeight - 8
          );
        },
      });
    }

    // Guardar (a menos que el caller pida solo el blob para compartir)
    if (!soloBlob) {
      doc.save(nombreArchivo);
    }
    const blob = doc.output('blob');
    return { ok: true, nombreArchivo, blob };

  } catch (err) {
    console.error('[exportarPDF]', err);
    return { ok: false, error: err.message };
  }
};

/**
 * Comparte un archivo (PDF/Excel) por WhatsApp.
 *  - Móvil con Web Share API: abre el share sheet nativo → el usuario elige WhatsApp y se adjunta el archivo.
 *  - Desktop / sin Web Share: descarga el archivo y abre WhatsApp Web con el mensaje listo (el usuario adjunta el PDF descargado).
 *
 * @param {Blob}   blob       — contenido del archivo (PDF/Excel).
 * @param {string} nombre     — nombre del archivo con extensión.
 * @param {string} mensaje    — texto a enviar.
 * @param {string} [telefono] — opcional (con código país sin '+'); si se omite abre WA sin destinatario.
 */
export const compartirWhatsApp = async ({ blob, nombre, mensaje = '', telefono = '' }) => {
  try {
    const file = new File([blob], nombre, { type: blob.type || 'application/pdf' });
    // 1) Móvil moderno: comparte el archivo directamente al chat seleccionado.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nombre, text: mensaje });
        return { ok: true, modo: 'share-api' };
      } catch (e) {
        // Si el usuario cancela el share, no es error real.
        if (e && e.name === 'AbortError') return { ok: true, modo: 'share-cancelled' };
      }
    }
    // 2) Fallback: descargar archivo + abrir WhatsApp Web con el mensaje.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    const txt = encodeURIComponent(mensaje + (mensaje ? '\n\n' : '') + `📎 Adjunta el archivo descargado: ${nombre}`);
    const waUrl = telefono
      ? `https://wa.me/${telefono.replace(/\D/g, '')}?text=${txt}`
      : `https://wa.me/?text=${txt}`;
    window.open(waUrl, '_blank', 'noopener');
    return { ok: true, modo: 'fallback-wa-web' };
  } catch (err) {
    console.error('[compartirWhatsApp]', err);
    return { ok: false, error: err.message };
  }
};

/**
 * Extrae datos de una tabla HTML del DOM y los exporta a PDF.
 * Útil para exportar las vistas LPS sin reconstruir la data.
 */
export const exportarTablaDOMaPDF = async ({
  tablaSelector,
  titulo,
  subtitulo,
  nombreArchivo,
  orientacion = 'l',
  metadata = {},
}) => {
  const tabla = document.querySelector(tablaSelector);
  if (!tabla) {
    return { ok: false, error: `No se encontró la tabla ${tablaSelector}` };
  }

  // Extraer headers
  const headers = [];
  tabla.querySelectorAll('thead tr').forEach(tr => {
    const fila = [];
    tr.querySelectorAll('th').forEach(th => fila.push(th.innerText.trim()));
    headers.push(fila);
  });

  // Extraer rows
  const rows = [];
  tabla.querySelectorAll('tbody tr').forEach(tr => {
    const fila = [];
    tr.querySelectorAll('td').forEach(td => fila.push(td.innerText.trim()));
    rows.push(fila);
  });

  return exportarPDF({ titulo, subtitulo, headers, rows, nombreArchivo, orientacion, metadata });
};
