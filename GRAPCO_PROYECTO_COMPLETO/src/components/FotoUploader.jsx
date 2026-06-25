// src/components/FotoUploader.jsx
// Componente para subir fotos desde Capataz al Firebase Storage
// Soporta: captura directa con cámara móvil + selección de galería + preview

import React, { useState, useRef } from 'react';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { BASE } from '../utils/styles';
import { useConfirm } from '../contexts/NotificationContext';

/**
 * Comprime una imagen reduciendo su tamaño máximo y calidad antes de subir.
 * Importante para no consumir mucho ancho de banda en obra.
 */
const _drawToBlob = (bitmap, w, h, calidad) => new Promise((resolve, reject) => {
  let { width, height } = bitmap;
  if (width > w) { height = (height * w) / width; width = w; }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  canvas.toBlob(b => b ? resolve(b) : reject(new Error('Error al comprimir')), 'image/jpeg', calidad);
});

// Decodifica con createImageBitmap (rápido, bajo consumo de RAM en móviles).
// Fallback a FileReader+Image si el navegador no lo soporta.
const comprimirImagen = async (file, maxAncho = 1280, calidad = 0.75) => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      const blob = await _drawToBlob(bmp, maxAncho, calidad);
      bmp.close?.();
      return blob;
    } catch (_) { /* cae al fallback */ }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => _drawToBlob(img, maxAncho, calidad).then(resolve, reject);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// `actividadId` y `fecha` (yyyy-mm-dd) son opcionales pero recomendados:
// si vienen, las fotos se nombran `actividad_<id>_<fecha>_<n>.jpg` (formato spec).
export default function FotoUploader({ fotos = [], onChange, ruta = 'Fotos_Generales', max = 5, showToast, permitirBimGuid = true, actividadId = null, fecha = null }) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [previewModal, setPreviewModal] = useState(null);
  const [editandoIdx, setEditandoIdx] = useState(null);  // índice de foto en edición de metadata
  const inputRef = useRef(null);     // cámara
  const galeriaRef = useRef(null);   // galería / archivos del teléfono
  const confirmar = useConfirm();

  // Intenta obtener geolocalización (no bloquea si el usuario rechaza)
  const obtenerGeo = () => new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    const tid = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(tid);
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision: pos.coords.accuracy,
        });
      },
      () => { clearTimeout(tid); resolve(null); },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  });

  const handleSubir = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (fotos.length + files.length > max) {
      showToast?.(`Máximo ${max} fotos por registro`, 'warning');
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      // Una sola lectura de geolocalización por lote (más rápido y batería-friendly)
      const geo = await obtenerGeo();
      const validos = files.filter(f => f.type.startsWith('image/'));
      if (validos.length !== files.length) showToast?.('Se omitieron archivos no-imagen', 'warning');

      const lote = Date.now();
      let hechas = 0;
      // Comprime + sube TODAS en paralelo (antes era una por una → ahora ~N× más rápido)
      const nuevas = await Promise.all(validos.map(async (file, i) => {
        const blob = await comprimirImagen(file);
        const fechaSlug = (fecha || '').replace(/-/g, '');
        const nombre = (actividadId && fechaSlug)
          ? `${ruta}/actividad_${actividadId}_${fechaSlug}_${lote}_${i}.jpg`
          : `${ruta}/${lote}_${i}.jpg`;
        const fileRef = ref(storage, nombre);
        await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(fileRef);
        hechas++;
        setProgreso(Math.round((hechas / validos.length) * 100));
        return { url, path: nombre, subidaEn: new Date().toISOString(), ...(geo ? { geo } : {}) };
      }));

      onChange?.([...fotos, ...nuevas]);
      showToast?.(`✅ ${nuevas.length} foto${nuevas.length === 1 ? '' : 's'} subida${nuevas.length === 1 ? '' : 's'}`, 'success');
    } catch (err) {
      console.error(err);
      showToast?.(`Error al subir foto: ${err.message}`, 'error');
    } finally {
      setSubiendo(false);
      setProgreso(0);
      if (inputRef.current) inputRef.current.value = '';
      if (galeriaRef.current) galeriaRef.current.value = '';
    }
  };

  // Estilo común de los tiles para agregar foto
  const tileSt = {
    aspectRatio: '1', borderRadius: '8px',
    border: `2px dashed ${BASE.gold}`,
    background: BASE.goldSoft || '#fef9e7',
    color: BASE.goldDark, fontWeight: '800', cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '4px',
  };

  const handleEliminar = async (foto, idx) => {
    const ok = await confirmar({
      tono: 'peligro',
      icono: '🗑️',
      titulo: '¿Eliminar esta foto?',
      detalle: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      // Borrar de Storage si tiene path
      if (foto.path) {
        try { await deleteObject(ref(storage, foto.path)); } catch(_) { /* puede ya no existir */ }
      }
      const nuevas = fotos.filter((_, i) => i !== idx);
      onChange?.(nuevas);
      showToast?.('🗑️ Foto eliminada', 'info');
    } catch (err) {
      showToast?.(`Error: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      {/* Galería de miniaturas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 80px), 1fr))',
        gap: '6px',
        marginBottom: fotos.length > 0 ? '10px' : 0,
      }}>
        {fotos.map((foto, idx) => {
          const fechaCorta = foto.subidaEn
            ? new Date(foto.subidaEn).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : null;
          return (
          <div key={idx} style={{
            position: 'relative',
            aspectRatio: '1',
            borderRadius: '8px',
            overflow: 'hidden',
            background: BASE.bgSoft,
            border: `1.5px solid ${BASE.border}`,
            cursor: 'pointer',
          }}>
            <img
              src={foto.url || foto}
              alt={`Foto ${idx + 1}`}
              onClick={() => setPreviewModal(foto.url || foto)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
            {fechaCorta && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                color: '#fff', padding: '14px 6px 4px',
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.2px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px',
                pointerEvents: 'none',
              }}>
                <span>{fechaCorta}</span>
                {foto.geo && <span title={`GPS ${foto.geo.lat?.toFixed(4)}, ${foto.geo.lon?.toFixed(4)}`}>📍</span>}
              </div>
            )}
            {permitirBimGuid && (
              <button onClick={(e) => { e.stopPropagation(); setEditandoIdx(idx); }}
                title={foto.bimGuid ? `Vinculada a BIM: ${foto.bimGuid}` : 'Vincular a elemento BIM'}
                style={{
                  position: 'absolute', top: '4px', left: '4px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: foto.bimGuid ? '#0ea5e9' : 'rgba(255,255,255,0.85)',
                  color: foto.bimGuid ? '#fff' : BASE.navy,
                  border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '900',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>🏗️</button>
            )}
            <button onClick={() => handleEliminar(foto, idx)} title="Eliminar foto" style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.9)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '900',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}>×</button>
          </div>
          );
        })}

        {/* Tiles para agregar foto: Cámara o Galería */}
        {fotos.length < max && subiendo && (
          <div style={{ ...tileSt, cursor: 'wait' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <span style={{ fontSize: '10px' }}>{progreso}%</span>
          </div>
        )}
        {fotos.length < max && !subiendo && (
          <>
            <button onClick={() => inputRef.current?.click()} style={tileSt}
              title="Tomar una foto con la cámara">
              <span style={{ fontSize: '23px' }}>📷</span>
              <span style={{ fontSize: '8.5px' }}>CÁMARA</span>
            </button>
            <button onClick={() => galeriaRef.current?.click()} style={tileSt}
              title="Subir una foto desde la galería o el teléfono">
              <span style={{ fontSize: '23px' }}>🖼️</span>
              <span style={{ fontSize: '8.5px' }}>GALERÍA</span>
            </button>
          </>
        )}
      </div>

      {/* Inputs ocultos: cámara (capture) y galería (sin capture → elige de Fotos/Archivos) */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        multiple onChange={handleSubir} style={{ display: 'none' }} />
      <input ref={galeriaRef} type="file" accept="image/*"
        multiple onChange={handleSubir} style={{ display: 'none' }} />

      {fotos.length === 0 && (
        <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic', marginTop: '4px' }}>
          Sin fotos · máximo {max} fotos por registro
        </p>
      )}

      {/* Modal preview */}
      {previewModal && (
        <div onClick={() => setPreviewModal(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.92)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', cursor: 'pointer',
        }}>
          <img src={previewModal} alt="Foto" style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
            borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }} />
          <button onClick={(e) => { e.stopPropagation(); setPreviewModal(null); }} style={{
            position: 'absolute', top: '20px', right: '20px',
            width: '44px', height: '44px', borderRadius: '50%',
            background: '#fff', color: BASE.navy,
            border: 'none', cursor: 'pointer',
            fontSize: '20px', fontWeight: '900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
      )}

      {/* Modal vinculación BIM (foto ↔ elemento) */}
      {editandoIdx !== null && fotos[editandoIdx] && (
        <div onClick={() => setEditandoIdx(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '14px', padding: '20px',
            width: '100%', maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 900, color: BASE.navy, marginBottom: '4px' }}>
              🏗️ Vincular foto al modelo BIM
            </p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px' }}>
              Pega el GUID del elemento (Revit/IFC) que la foto documenta. Si más adelante alguien selecciona ese elemento en el visor, verá esta foto.
            </p>
            <img src={fotos[editandoIdx].url} alt="" style={{
              width: '100%', aspectRatio: '4/3', objectFit: 'cover',
              borderRadius: '8px', marginBottom: '12px',
            }} />
            <label style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px' }}>
              GUID DEL ELEMENTO BIM
            </label>
            <input
              defaultValue={fotos[editandoIdx].bimGuid || ''}
              placeholder="Ej: 1a4b9c8d-3f2e-4b5a-..."
              id="bim-guid-input"
              style={{
                width: '100%', padding: '9px 12px',
                border: `1px solid ${BASE.border}`, borderRadius: '8px',
                fontSize: '12px', fontFamily: 'monospace',
                marginTop: '4px', marginBottom: '10px',
              }}
            />
            <label style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px' }}>
              COMENTARIO (OPCIONAL)
            </label>
            <input
              defaultValue={fotos[editandoIdx].bimComentario || ''}
              placeholder="Ej: Vaciado completo, sin segregación"
              id="bim-coment-input"
              style={{
                width: '100%', padding: '9px 12px',
                border: `1px solid ${BASE.border}`, borderRadius: '8px',
                fontSize: '12px', marginTop: '4px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button onClick={() => setEditandoIdx(null)} style={{
                padding: '9px 16px', borderRadius: '8px', border: 'none',
                background: '#f1f5f9', color: BASE.muted,
                fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => {
                const g = document.getElementById('bim-guid-input')?.value?.trim() || '';
                const c = document.getElementById('bim-coment-input')?.value?.trim() || '';
                const next = [...fotos];
                next[editandoIdx] = { ...next[editandoIdx], bimGuid: g || null, bimComentario: c || null };
                onChange?.(next);
                setEditandoIdx(null);
                showToast?.(g ? '🏗️ Foto vinculada al BIM' : 'Vínculo BIM removido', 'success');
              }} style={{
                padding: '9px 16px', borderRadius: '8px', border: 'none',
                background: '#0ea5e9', color: '#fff',
                fontSize: '11.5px', fontWeight: 900, cursor: 'pointer',
              }}>Guardar vínculo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente compacto para MOSTRAR fotos (sin permisos de subir).
 * En la celda: solo UNA miniatura con un badge "1/N" si hay varias.
 * Al abrirla: visor a pantalla completa con flechas ← → para navegar.
 * Para usar en Auditoría / vistas del Ingeniero.
 */
export function FotoGaleriaCompacta({ fotos = [], meta = null }) {
  // Índice de la foto actual en el visor. null = cerrado.
  const [idx, setIdx] = React.useState(null);

  // Lista normalizada de URLs (acepta tanto {url} como string).
  const urls = React.useMemo(
    () => (fotos || []).map(f => f && (f.url || f)).filter(Boolean),
    [fotos],
  );
  const total = urls.length;

  // Navegación por teclado mientras el modal está abierto.
  React.useEffect(() => {
    if (idx === null) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  setIdx(i => i === null ? null : (i - 1 + total) % total);
      if (e.key === 'ArrowRight') setIdx(i => i === null ? null : (i + 1) % total);
      if (e.key === 'Escape')     setIdx(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, total]);

  if (total === 0) return null;
  const obs = (meta?.observacion || '').trim();
  const urlActual = idx !== null ? urls[idx] : null;
  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + total) % total); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % total); };

  return (
    <>
      {/* Miniatura compacta: una sola, con badge "1/N" si hay varias */}
      <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
           onClick={() => setIdx(0)} title={total > 1 ? `${total} fotos — click para ver` : 'Ver foto'}>
        <img src={urls[0]} alt="Foto 1" loading="lazy" style={{
          width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px',
          border: `1px solid ${BASE.border}`, display: 'block',
        }}/>
        {total > 1 && (
          <span style={{
            position: 'absolute', bottom: '-3px', right: '-3px',
            background: BASE.navy, color: '#fff',
            fontSize: '9px', fontWeight: '900', letterSpacing: '0.3px',
            padding: '2px 5px', borderRadius: '10px',
            border: '1.5px solid #fff', minWidth: '18px', textAlign: 'center',
            fontFamily: 'var(--grapco-font-mono, monospace)',
          }}>1/{total}</span>
        )}
      </div>

      {/* Visor a pantalla completa — UN foto a la vez + flechas */}
      {urlActual && (
        <div onClick={() => setIdx(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.92)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', cursor: 'pointer',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            maxWidth: '95vw', maxHeight: '95dvh', cursor: 'default', position: 'relative',
          }}>
            {/* Contador "X / N" arriba del visor */}
            {total > 1 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)',
                padding: '5px 14px', borderRadius: '999px',
                color: '#fff', fontWeight: '800', fontSize: '12px',
                fontFamily: 'var(--grapco-font-mono, monospace)', letterSpacing: '0.5px',
              }}>
                <span>{idx + 1}</span><span style={{ opacity: 0.55 }}>/</span><span style={{ opacity: 0.55 }}>{total}</span>
              </div>
            )}

            <img src={urlActual} alt={`Foto ${idx + 1}`} style={{
              maxWidth: '100%', maxHeight: 'calc(95dvh - 200px)', objectFit: 'contain',
              borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}/>

            {/* Caption: contexto + observación del capataz */}
            {meta && (
              <div style={{
                width: 'min(100%, 720px)',
                background: 'rgba(15,42,71,0.92)', borderLeft: `4px solid ${BASE.gold}`,
                borderRadius: '10px', padding: '12px 16px', color: '#fff',
                boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
              }}>
                {(meta.actividad || meta.partida || meta.fecha) && (
                  <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {meta.partida && <>{meta.partida} · </>}{meta.actividad}{meta.fecha && <span style={{ opacity: 0.7, fontWeight: 600 }}> · {meta.fecha}</span>}
                  </p>
                )}
                <p style={{ fontSize: '10.5px', fontWeight: 800, color: '#fcd34d', letterSpacing: '0.6px', marginBottom: '4px' }}>
                  ⚠️ RESTRICCIÓN / OBSERVACIÓN DEL CAPATAZ
                </p>
                <p style={{ fontSize: '13.5px', fontWeight: 600, lineHeight: 1.5, color: obs ? '#fff' : 'rgba(255,255,255,0.55)', fontStyle: obs ? 'normal' : 'italic' }}>
                  {obs || 'Sin observación registrada en este parte.'}
                </p>
              </div>
            )}

            {/* Tira de miniaturas — click directo para saltar a una foto específica */}
            {total > 1 && (
              <div style={{
                display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center',
                padding: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.10)', maxWidth: '95vw',
              }}>
                {urls.map((u, i) => (
                  <img key={i} src={u} alt={`Foto ${i + 1}`} loading="lazy"
                    onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                    style={{
                      width: '44px', height: '44px', objectFit: 'cover',
                      borderRadius: '6px', cursor: 'pointer',
                      border: i === idx ? `2px solid ${BASE.gold}` : '2px solid rgba(255,255,255,0.20)',
                      opacity: i === idx ? 1 : 0.55,
                      transition: 'all 0.15s',
                    }}/>
                ))}
              </div>
            )}
          </div>

          {/* Flecha izquierda */}
          {total > 1 && (
            <button onClick={prev} aria-label="Anterior" style={{
              position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
              width: '54px', height: '54px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.20)',
              color: '#fff', cursor: 'pointer',
              fontSize: '26px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >‹</button>
          )}
          {/* Flecha derecha */}
          {total > 1 && (
            <button onClick={next} aria-label="Siguiente" style={{
              position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
              width: '54px', height: '54px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.20)',
              color: '#fff', cursor: 'pointer',
              fontSize: '26px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >›</button>
          )}

          {/* Cerrar */}
          <button onClick={(e) => { e.stopPropagation(); setIdx(null); }} aria-label="Cerrar" style={{
            position: 'absolute', top: '20px', right: '20px',
            width: '44px', height: '44px', borderRadius: '50%',
            background: '#fff', color: BASE.navy,
            border: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: '900',
          }}>×</button>
        </div>
      )}
    </>
  );
}
