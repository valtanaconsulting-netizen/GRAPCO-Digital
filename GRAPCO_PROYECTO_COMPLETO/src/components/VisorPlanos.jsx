// src/components/VisorPlanos.jsx
// ════════════════════════════════════════════════════════════════
// Biblioteca de planos por FRENTE + visor embebido (PDF e imágenes).
// Sube planos (PDF/PNG/JPG) que quedan guardados en Storage por proyecto+frente
// y los muestra. Costo $0 (Firebase Storage).
//
// Ruta Storage:  planos/{proyectoId}/{frenteCodigo}/{archivo}
// Reglas: el catch-all ya permite read (autenticado) + write (≤15MB, image/* o pdf).
//
// Exporta:
//   • BibliotecaPlanos  → contenido reutilizable (lista + subir + visor), SIN Modal.
//                          Úsalo embebido (p.ej. pestaña "Planos").
//   • VisorPlanos (default) → BibliotecaPlanos envuelto en Modal, para abrir desde
//                          un protocolo con un botón "Ver plano".
//
// CAD: .dwg nativo NO se puede ver gratis en el navegador (solo Autodesk/APS, con
// costo). Lo gratis y recomendado: exportar el plano a PDF desde el CAD y verlo aquí.
// ════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { ref, listAll, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import Modal from './Modal';

const tipoDeArchivo = (name = '') => {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'img';
  if (['dwg', 'dxf'].includes(ext)) return 'cad';
  return 'otro';
};

// ── Contenido reutilizable (sin Modal) ──────────────────────────
export function BibliotecaPlanos({ proyectoId, frenteCodigo, showToast }) {
  const [planos, setPlanos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const fileRef = useRef(null);

  const faltaFrente = !proyectoId || !frenteCodigo;
  const carpeta = faltaFrente ? null : `planos/${proyectoId}/${frenteCodigo}`;

  const cargar = async () => {
    if (!carpeta) { setCargando(false); return; }
    setCargando(true);
    try {
      const res = await listAll(ref(storage, carpeta));
      const items = await Promise.all(
        res.items.map(async (it) => ({
          name: it.name,
          url: await getDownloadURL(it),
          tipo: tipoDeArchivo(it.name),
          fullPath: it.fullPath,
        }))
      );
      items.sort((a, b) => a.name.localeCompare(b.name));
      setPlanos(items);
      setSel((prev) => (prev && items.some((i) => i.fullPath === prev.fullPath) ? prev : items[0] || null));
    } catch (e) {
      console.warn('[BibliotecaPlanos]', e);
      showToast?.('No se pudieron cargar los planos: ' + (e.message || e), 'error');
    } finally {
      setCargando(false);
    }
  };

  // Recargar al cambiar de frente/proyecto (y reset de selección).
  useEffect(() => { setSel(null); cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [proyectoId, frenteCodigo]);

  const subir = async (file) => {
    if (!file || !carpeta) return;
    const tipo = tipoDeArchivo(file.name);
    if (tipo !== 'pdf' && tipo !== 'img') {
      showToast?.('Por ahora solo PDF e imágenes. ¿Tienes .dwg/.dxf? Expórtalo a PDF desde tu CAD (es gratis).', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast?.('El archivo supera 15 MB.', 'error');
      return;
    }
    setSubiendo(true); setProgreso(0);
    try {
      const r = ref(storage, `${carpeta}/${file.name}`);
      const task = uploadBytesResumable(r, file, {
        contentType: file.type || (tipo === 'pdf' ? 'application/pdf' : 'image/jpeg'),
      });
      await new Promise((resolve, reject) => task.on('state_changed',
        (s) => setProgreso(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
        reject, resolve));
      const url = await getDownloadURL(task.snapshot.ref);
      showToast?.('✅ Plano subido', 'success');
      setSel({ name: file.name, url, tipo, fullPath: task.snapshot.ref.fullPath });
      cargar();
    } catch (e) {
      showToast?.('Error al subir el plano: ' + (e.message || e), 'error');
    } finally {
      setSubiendo(false); setProgreso(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (faltaFrente) {
    return (
      <p style={{ color: BASE.muted, fontSize: 13, padding: 12 }}>
        Selecciona un <b>frente</b> para ver y subir sus planos.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 14, minHeight: '60vh', flexWrap: 'wrap' }}>
      {/* Sidebar: subir + lista */}
      <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => fileRef.current?.click()} disabled={subiendo} style={btnSubir}>
          {subiendo ? `⏳ Subiendo ${progreso}%` : '⬆️ Subir plano (PDF/imagen)'}
        </button>
        <input ref={fileRef} type="file" hidden
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          onChange={(e) => subir(e.target.files?.[0])} />
        <div style={{ fontSize: 10.5, color: BASE.muted }}>
          Frente: <b style={{ color: BASE.text }}>{frenteCodigo}</b>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, borderTop: `1px solid ${BASE.border}`, paddingTop: 8, maxHeight: '60vh' }}>
          {cargando ? (
            <p style={{ fontSize: 12, color: BASE.muted }}>Cargando…</p>
          ) : planos.length === 0 ? (
            <p style={{ fontSize: 12, color: BASE.muted }}>Aún no hay planos en este frente. Sube el primero ⬆️</p>
          ) : planos.map((p) => (
            <button key={p.fullPath} onClick={() => setSel(p)} title={p.name}
              style={{ ...itemPlano, ...(sel?.fullPath === p.fullPath ? itemPlanoSel : {}) }}>
              <span>{p.tipo === 'pdf' ? '📄' : p.tipo === 'img' ? '🖼️' : '📐'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Visor */}
      <div style={{ flex: 1, minWidth: 280, border: `1px solid ${BASE.border}`, borderRadius: 10, overflow: 'hidden', background: '#0b1220', display: 'flex', flexDirection: 'column' }}>
        {!sel ? (
          <div style={visorVacio}>Selecciona un plano de la lista 👈</div>
        ) : sel.tipo === 'pdf' ? (
          <iframe title={sel.name} src={sel.url} style={{ width: '100%', height: '72vh', border: 0, background: '#fff' }} />
        ) : sel.tipo === 'img' ? (
          <div style={{ height: '72vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={sel.url} alt={sel.name} style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={visorVacio}>
            Este formato no se previsualiza aquí.&nbsp;
            <a href={sel.url} target="_blank" rel="noopener noreferrer" style={{ color: BASE.gold }}>Abrir / descargar ↗</a>
          </div>
        )}
        {sel && (
          <div style={barraVisor}>
            <span style={{ fontSize: 11, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.name}</span>
            <a href={sel.url} target="_blank" rel="noopener noreferrer" style={linkAbrir}>Abrir en pestaña ↗</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Envoltorio Modal (para abrir desde un protocolo) ────────────
export default function VisorPlanos({ proyectoId, frenteCodigo, onClose, showToast }) {
  return (
    <Modal title="📐 Planos del frente" onClose={onClose} maxW="1100px">
      <BibliotecaPlanos proyectoId={proyectoId} frenteCodigo={frenteCodigo} showToast={showToast} />
    </Modal>
  );
}

const btnSubir = {
  padding: '9px 12px', borderRadius: 8, background: BASE.navy, color: '#fff',
  border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.2,
};
const itemPlano = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
  padding: '8px 10px', borderRadius: 8, border: '1px solid transparent',
  background: 'transparent', cursor: 'pointer', fontSize: 12, color: BASE.text, marginBottom: 4,
};
const itemPlanoSel = { background: BASE.navySoft, border: `1px solid ${BASE.navy}`, fontWeight: 800 };
const visorVacio = {
  height: '72vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#cbd5e1', fontSize: 13, textAlign: 'center', padding: 20,
};
const barraVisor = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  padding: '8px 10px', background: '#111827', borderTop: '1px solid #1f2937',
};
const linkAbrir = { fontSize: 11, color: BASE.gold, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' };
