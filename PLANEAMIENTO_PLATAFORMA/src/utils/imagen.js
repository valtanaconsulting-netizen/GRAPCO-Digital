// src/utils/imagen.js
// Compresión de imágenes 100% en el cliente (canvas) — $0, sin servidor ni
// Firebase Storage. La foto comprimida se guarda como dataURL base64 dentro de un
// doc de Firestore → hereda la cola offline (IndexedDB) y se sincroniza sola al
// volver la señal. Ideal para evidencia de obra en cerro sin internet.

// Comprime un File de imagen a un JPEG dataURL reducido.
//  - maxPx: lado mayor máximo (px). 1280 ≈ buena evidencia, ~100–200 KB.
//  - calidad: 0–1 (JPEG). 0.62 equilibra nitidez/peso.
export async function comprimirImagen(file, maxPx = 1280, calidad = 0.62) {
  if (!file || !(file.type || '').startsWith('image/')) throw new Error('El archivo no es una imagen');
  const srcUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = () => rej(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo cargar la imagen'));
    i.src = srcUrl;
  });
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const mayor = Math.max(w, h);
  if (mayor > maxPx) { const k = maxPx / mayor; w = Math.round(w * k); h = Math.round(h * k); }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);   // fondo (por si PNG con alfa)
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', calidad);
}

// Peso aproximado en KB de un dataURL base64.
export const pesoKB = (dataUrl) => dataUrl ? Math.round((dataUrl.length * 0.75) / 1024) : 0;
