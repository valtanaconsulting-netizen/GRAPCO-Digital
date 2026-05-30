// src/components/PdfFirmadoUploader.jsx
// Sube el PDF firmado escaneado (5 firmas hechas a mano) directamente a la ruta
// canónica de Firebase Storage:
//   protocolos-firmados/{tipo}/{frenteCodigo}/{semanaISO}/{numeroRegistro}.pdf
//
// Actualiza el doc Firestore con el bloque `archivado.storage`. Las capas de
// Drive y Sheets se conectarán después (Fase 5, Cloud Function).
//
// Drag&drop + file picker. Acepta solo PDF. Muestra progreso y permite reemplazar.

import React, { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebaseConfig';
import { BASE } from '../utils/styles';

export default function PdfFirmadoUploader({ protocolo, onUploaded, showToast }) {
  const fileRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const yaSubido = !!protocolo?.archivado?.storage?.url;
  const incompleto = !protocolo?.numeroRegistro || !protocolo?.tipo
                  || !protocolo?.frenteCodigo  || !protocolo?.semanaISO;

  const rutaCanonica = !incompleto
    ? `protocolos-firmados/${protocolo.tipo}/${protocolo.frenteCodigo}/${protocolo.semanaISO}/${protocolo.numeroRegistro}.pdf`
    : null;

  const subir = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast?.('Solo se aceptan archivos PDF', 'error');
      return;
    }
    if (incompleto) {
      showToast?.('Falta data (frente, semana o N° Registro). Guarda el protocolo primero.', 'error');
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      const r = ref(storage, rutaCanonica);
      const task = uploadBytesResumable(r, file, {
        contentType: 'application/pdf',
        customMetadata: {
          numeroRegistro: protocolo.numeroRegistro,
          tipo: protocolo.tipo,
          frenteCodigo: protocolo.frenteCodigo,
          semanaISO: protocolo.semanaISO,
          proyectoId: protocolo.proyectoId || '',
        },
      });

      await new Promise((resolve, reject) => {
        task.on('state_changed',
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgreso(pct);
          },
          (err) => reject(err),
          () => resolve(),
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);
      const path = task.snapshot.ref.fullPath;

      // Actualizar Firestore — bloque `archivado.storage` listo.
      // El bloque `archivado.drive` y `archivado.sheet` los llenará la Cloud Function (Fase 5).
      await updateDoc(doc(db, 'Protocolos', protocolo.id), {
        'archivado.storage': {
          url,
          path,
          tamanoBytes: task.snapshot.totalBytes,
          fechaCargado: new Date().toISOString(),
        },
        pdfFirmadoUrl: url,        // shortcut para listas/búsquedas
        pdfFirmadoEn:  serverTimestamp(),
        estado: 'liberado',         // 5 firmas físicas implican liberación
        actualizadoEn: serverTimestamp(),
      });

      showToast?.(`✅ PDF archivado en Storage · ${protocolo.numeroRegistro}`, 'success');
      onUploaded?.({ url, path });
    } catch (e) {
      console.error('[PdfFirmadoUploader]', e);
      showToast?.('Error al subir: ' + e.message, 'error');
    } finally {
      setSubiendo(false);
      setProgreso(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) subir(f);
  };

  // ── Render: si ya está subido, muestra confirmación + opción reemplazar
  if (yaSubido && !subiendo) {
    const arch = protocolo.archivado.storage;
    const error = protocolo.archivado?.error;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && (
          <div style={cardError}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 900, color: BASE.red, letterSpacing: 0.5 }}>
                ERROR EN SINCRONIZACIÓN DRIVE / SHEETS
              </p>
              <p style={{ fontSize: 11.5, color: BASE.text, marginTop: 2 }}>{error.mensaje}</p>
              <p style={{ fontSize: 10, color: BASE.muted, marginTop: 2 }}>
                {error.paso ? `Paso: ${error.paso} · ` : ''}{new Date(error.fecha).toLocaleString('es-PE')}
              </p>
              <p style={{ fontSize: 10.5, color: BASE.muted, marginTop: 4 }}>
                💡 Vuelve a arrastrar el PDF para reintentar manualmente.
              </p>
            </div>
          </div>
        )}
        <div style={cardOk}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>✅</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 900, color: BASE.green, letterSpacing: 0.5 }}>
                PDF FIRMADO ARCHIVADO
              </p>
              <p style={{ fontSize: 12, color: BASE.text, marginTop: 2 }}>
                <a href={arch.url} target="_blank" rel="noopener noreferrer" style={linkA}>
                  {protocolo.numeroRegistro}.pdf
                </a>{' '}
                · {(arch.tamanoBytes / 1024).toFixed(0)} KB
              </p>
              <p style={{ fontSize: 10, color: BASE.muted, marginTop: 2, fontFamily: 'monospace' }}>
                {arch.path}
              </p>
              <SyncStatus protocolo={protocolo} />
            </div>
            <button onClick={() => fileRef.current?.click()} style={btnGhost}>
              🔄 Reemplazar
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" hidden
            onChange={e => subir(e.target.files?.[0])} />
        </div>
      </div>
    );
  }

  // ── Render: zona drag&drop
  return (
    <div
      onDragEnter={e => { e.preventDefault(); setArrastrando(true); }}
      onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={onDrop}
      onClick={() => !subiendo && fileRef.current?.click()}
      style={{
        ...dropZone,
        borderColor: arrastrando ? BASE.gold : BASE.border,
        background: arrastrando ? BASE.goldSoft : BASE.bgSoft,
        cursor: subiendo ? 'wait' : 'pointer',
      }}
    >
      <input ref={fileRef} type="file" accept="application/pdf" hidden
        onChange={e => subir(e.target.files?.[0])} />

      {subiendo ? (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: BASE.navy, marginBottom: 8 }}>
            ⏳ Subiendo PDF firmado...
          </p>
          <div style={{ height: 8, background: BASE.bgSoft, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progreso}%`,
              background: `linear-gradient(90deg, ${BASE.gold}, ${BASE.goldDark})`,
              transition: 'width 0.2s',
            }} />
          </div>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 4 }}>{progreso}%</p>
        </div>
      ) : (
        <>
          <span style={{ fontSize: 32, marginBottom: 6 }}>📤</span>
          <p style={{ fontSize: 13, fontWeight: 800, color: BASE.navy }}>
            Arrastra el PDF firmado aquí
          </p>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            o haz click para seleccionar · solo PDF
          </p>
          {!incompleto && rutaCanonica && (
            <p style={{ fontSize: 9.5, color: BASE.muted, marginTop: 8, fontFamily: 'monospace' }}>
              Se archivará en: <b>{rutaCanonica}</b>
            </p>
          )}
          {incompleto && (
            <p style={{ fontSize: 10.5, color: BASE.red, marginTop: 6, fontWeight: 700 }}>
              ⚠️ Guarda el protocolo (frente + semana + N° Registro) antes de subir
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Muestra el estado del archivado en cada destino (Storage / Drive / Sheets).
function SyncStatus({ protocolo }) {
  const arch = protocolo?.archivado || {};
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
      <Pill ok={!!arch.storage?.url} label="Firebase Storage" />
      <Pill ok={!!arch.drive?.url}   label="Google Drive"     pending="Esperando Cloud Function" />
      <Pill ok={!!arch.sheet?.row}   label="Google Sheets"    pending="Esperando Cloud Function" />
    </div>
  );
}
function Pill({ ok, label, pending }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 10,
      fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
      background: ok ? '#dcfce7' : BASE.bgSoft,
      color: ok ? '#15803d' : BASE.muted,
      border: `1px solid ${ok ? '#16a34a55' : BASE.border}`,
    }} title={!ok && pending ? pending : ''}>
      {ok ? '✓' : '○'} {label}
    </span>
  );
}

const dropZone = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  border: `2px dashed ${BASE.border}`, borderRadius: 12,
  padding: '24px 16px', textAlign: 'center', minHeight: 130,
  transition: 'all 0.15s',
};
const cardOk = {
  background: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: 12,
  padding: 14,
};
const cardError = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
};
const linkA = { color: BASE.navy, fontWeight: 700, textDecoration: 'underline' };
const btnGhost = {
  padding: '8px 12px', borderRadius: 8, background: BASE.white,
  color: BASE.muted, border: `1px solid ${BASE.border}`,
  fontSize: 11, fontWeight: 800, cursor: 'pointer',
  whiteSpace: 'nowrap',
};
