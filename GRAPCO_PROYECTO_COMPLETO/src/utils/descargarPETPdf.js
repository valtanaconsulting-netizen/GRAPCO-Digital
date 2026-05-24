// src/utils/descargarPETPdf.js
// Descarga directa de un PET como PDF A4, sin pasar por el diálogo de impresión.
// Si una sección excede una página A4, se divide en MÚLTIPLES páginas A4
// manteniendo el tamaño de letra constante (no se comprime).

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

const cargarLibs = async () => {
  if (!window.html2canvas) await cargarScript(CDN_HTML2CANVAS);
  if (!window.jspdf) await cargarScript(CDN_JSPDF);
  if (!window.html2canvas) throw new Error('html2canvas no se inicializó');
  if (!window.jspdf) throw new Error('jsPDF no se inicializó');
};

// Crea una imagen JPEG dataURL de un fragmento vertical de un canvas grande.
const recortarVertical = (canvasOrig, yPx, altoPx) => {
  const temp = document.createElement('canvas');
  temp.width = canvasOrig.width;
  temp.height = altoPx;
  const ctx = temp.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, temp.width, temp.height);
  ctx.drawImage(canvasOrig, 0, yPx, canvasOrig.width, altoPx, 0, 0, canvasOrig.width, altoPx);
  return temp.toDataURL('image/jpeg', 0.95);
};

/**
 * Descarga un PET como PDF A4. Cada .pet-page se renderiza preservando su tamaño
 * de letra original. Si una página tiene más contenido que una A4, se divide en
 * múltiples A4 (sin comprimir el contenido).
 */
export async function descargarPETPdf(pet, opts = {}) {
  const contenedorSelector = opts.contenedorSelector || '.pet-print-root';
  await cargarLibs();

  const root = document.querySelector(contenedorSelector);
  if (!root) throw new Error('No se encontró el contenedor del PET');
  const paginas = Array.from(root.querySelectorAll('.pet-page'));
  if (paginas.length === 0) throw new Error('No se encontraron páginas para exportar');

  const { jsPDF } = window.jspdf;
  // A4 portrait
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const A4_W = 210;  // mm
  const A4_H = 297;  // mm

  let pageIndex = 0;

  for (let i = 0; i < paginas.length; i++) {
    const pagina = paginas[i];
    // Captura la página completa a alta resolución
    const canvas = await window.html2canvas(pagina, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: pagina.scrollWidth,
      windowHeight: pagina.scrollHeight,
    });

    // mm por pixel — basado en que el ancho del canvas equivale a A4_W
    const mmPorPx = A4_W / canvas.width;
    const altoTotalMm = canvas.height * mmPorPx;

    // Si la página entera cabe en una A4, agregarla tal cual
    if (altoTotalMm <= A4_H + 0.5) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, A4_W, altoTotalMm, undefined, 'FAST');
      pageIndex++;
      continue;
    }

    // Página más grande que A4 → dividir en chunks verticales
    // Cada chunk equivale a A4_H mm = (A4_H / mmPorPx) px de alto
    const chunkAltoPx = Math.floor(A4_H / mmPorPx);
    let yPx = 0;
    while (yPx < canvas.height) {
      const restoPx = canvas.height - yPx;
      const altoChunkPx = Math.min(chunkAltoPx, restoPx);
      const imgData = recortarVertical(canvas, yPx, altoChunkPx);
      const altoChunkMm = altoChunkPx * mmPorPx;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, altoChunkMm, undefined, 'FAST');
      pageIndex++;
      yPx += altoChunkPx;
    }
  }

  const nombreLimpio = (s) => (s || '').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  const filename = `${nombreLimpio(pet.codigo) || 'PET'}_${nombreLimpio(pet.titulo)}.pdf`;
  pdf.save(filename);
}
