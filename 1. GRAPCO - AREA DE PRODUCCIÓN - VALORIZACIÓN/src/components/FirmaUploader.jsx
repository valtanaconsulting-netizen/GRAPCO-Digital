// src/components/FirmaUploader.jsx
// Sube la firma escaneada de un obrero y la deja lista para estamparla en el tareo F13.
//
// Se guarda como dataURL PNG dentro del propio doc /Personal/{id} y no en Storage:
//  · una firma recortada pesa ~45 KB, muy por debajo del millón de bytes que admite
//    un documento de Firestore;
//  · al ir inline evita el CORS que sí daría una URL de Storage cuando html2canvas
//    rasteriza el PDF — la firma saldría en blanco justo en el papel que se archiva.
//
// El navegador hace la misma limpieza que haríamos a mano: recorta al trazo, vuelve
// transparente el papel y reescala. Así el capataz sube la foto tal como salió del
// escáner o del celular y no tiene que editar nada.

import React, { useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';

// El fondo de un escaneo nunca es blanco puro (papel, sombra, grano del JPG), así
// que el umbral va holgado: todo lo claro se vuelve transparente y el trazo sobrevive.
const UMBRAL_FONDO = 200;
const ANCHO_FINAL = 320;   // en el F13 impreso la celda mide ~90 px: 320 sobra y pesa poco
const MAX_ENTRADA = 8 * 1024 * 1024;

// Recorta al trazo, quita el fondo y reescala. Devuelve un dataURL PNG.
function limpiarFirma(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const datos = ctx.getImageData(0, 0, c.width, c.height);
  const px = datos.data;
  let minx = c.width, miny = c.height, maxx = -1, maxy = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (px[i] > UMBRAL_FONDO && px[i + 1] > UMBRAL_FONDO && px[i + 2] > UMBRAL_FONDO) {
        px[i + 3] = 0;                       // papel → transparente
      } else {
        if (x < minx) minx = x;
        if (y < miny) miny = y;
        if (x > maxx) maxx = x;
        if (y > maxy) maxy = y;
      }
    }
  }
  if (maxx < 0) throw new Error('La imagen parece estar en blanco: no encontré ningún trazo.');
  ctx.putImageData(datos, 0, 0);

  // Recorte al trazo + 2% de aire para que no quede pegada al borde de la celda.
  const mx = Math.round((maxx - minx) * 0.02) + 2;
  const my = Math.round((maxy - miny) * 0.02) + 2;
  const sx = Math.max(0, minx - mx), sy = Math.max(0, miny - my);
  const sw = Math.min(c.width, maxx + mx + 1) - sx;
  const sh = Math.min(c.height, maxy + my + 1) - sy;

  const escala = Math.min(1, ANCHO_FINAL / sw);
  const out = document.createElement('canvas');
  out.width = Math.round(sw * escala); out.height = Math.round(sh * escala);
  out.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export default function FirmaUploader({ persona, showToast, onGuardada }) {
  const inputRef = useRef(null);
  const [previa, setPrevia] = useState(persona?.firmaDataUrl || null);
  const [busy, setBusy] = useState(false);

  if (!persona?.id) return null;

  const elegir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';               // permite re-elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast?.('Eso no es una imagen.', 'warning');
    if (file.size > MAX_ENTRADA) return showToast?.('La imagen pesa más de 8 MB. Usa una foto más liviana.', 'warning');

    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((ok, err) => {
        img.onload = ok;
        img.onerror = () => err(new Error('No pude leer la imagen.'));
        img.src = url;
      });
      const dataUrl = limpiarFirma(img);
      URL.revokeObjectURL(url);

      await setDoc(doc(db, 'Personal', persona.id), {
        firmaDataUrl: dataUrl,
        firmaActualizadaEn: serverTimestamp(),
      }, { merge: true });

      setPrevia(dataUrl);
      showToast?.(`✅ Firma de ${persona.nombre} guardada`, 'success');
      onGuardada?.(dataUrl);
    } catch (err) {
      showToast?.('Error con la firma: ' + err.message, 'error');
    } finally { setBusy(false); }
  };

  const quitar = async () => {
    setBusy(true);
    try {
      await setDoc(doc(db, 'Personal', persona.id), { firmaDataUrl: '' }, { merge: true });
      setPrevia(null);
      showToast?.('Firma eliminada', 'info');
      onGuardada?.('');
    } catch (err) {
      showToast?.('Error: ' + err.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px', display: 'flex',
      flexDirection: 'column', gap: '10px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 900, color: BASE.muted, letterSpacing: '1px' }}>
        FIRMA PARA EL TAREO
      </p>

      <div style={{
        height: '70px', background: '#fff', border: `1px dashed ${BASE.border}`,
        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px',
      }}>
        {previa
          ? <img src={previa} alt="Firma" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          : <span style={{ fontSize: '11.5px', color: BASE.mutedSoft, fontWeight: 600 }}>Sin firma registrada</span>}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          style={{
            flex: 1, padding: '9px', background: BASE.navy, color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '12px', fontWeight: 800,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}>
          {busy ? 'Procesando…' : previa ? '↻ Reemplazar firma' : '＋ Subir firma'}
        </button>
        {previa && (
          <button onClick={quitar} disabled={busy}
            style={{
              padding: '9px 12px', background: 'transparent', color: '#b91c1c',
              border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px',
              fontWeight: 800, cursor: busy ? 'default' : 'pointer',
            }}>
            Quitar
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={elegir} style={{ display: 'none' }} />

      <p style={{ fontSize: '10.5px', color: BASE.muted, fontStyle: 'italic', lineHeight: 1.45 }}>
        Foto o escaneo de la firma sobre papel blanco. Se recorta y se le quita el fondo
        automáticamente. Aparece en el tareo solo en las marcas que el obrero registró de verdad.
      </p>
    </div>
  );
}
