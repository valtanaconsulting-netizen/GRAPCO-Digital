// src/views/asistencia/EnrolamientoFacial.jsx
// Enrolamiento facial 1× por obrero: tomamos 3 fotos de referencia, calculamos
// descriptores (128 floats c/u) y los guardamos en /Personal/{id}.faceDescriptors.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE, RADIUS, SPACING } from '../../utils/styles';
import { usePersonal } from '../../hooks/useFirebaseData';
import { cargarModelos, obtenerDescriptor, descriptorToArray } from '../../utils/faceapi';
import { CARGOS_STAFF } from '../../utils/styles';

export default function EnrolamientoFacial({ showToast }) {
  const personalDB = usePersonal();
  // Enrolamiento es identidad biométrica (global, no por proyecto).
  // Mostramos TODO el personal activo y luego lo separamos en Obreros / Staff.
  const personalFiltrado = useMemo(() => {
    if (!Array.isArray(personalDB)) return [];
    return personalDB.filter(p => p.activo !== false);
  }, [personalDB]);
  const grupos = useMemo(() => ({
    obreros: personalFiltrado.filter(p => !CARGOS_STAFF.includes(p.cargo)),
    staff:   personalFiltrado.filter(p => CARGOS_STAFF.includes(p.cargo)),
  }), [personalFiltrado]);

  const [seleccionado, setSeleccionado] = useState(null); // obrero
  const [modelosOK, setModelosOK] = useState(false);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturas, setCapturas] = useState([]); // [{ dataUrl, descriptor }]
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);

  // Cargar modelos al montar
  useEffect(() => {
    setCargandoModelos(true);
    cargarModelos()
      .then(() => setModelosOK(true))
      .catch(() => showToast?.('No se pudieron cargar los modelos de IA. Verifica tu conexión.', 'error'))
      .finally(() => setCargandoModelos(false));
  }, []);

  // Cuando hay stream, conectar al <video>
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  // Abrir cámara cuando se selecciona obrero
  const abrirCamara = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(s);
    } catch (e) {
      showToast?.('No se pudo acceder a la cámara: ' + e.message, 'error');
    }
  };

  const cerrarCamara = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const capturar = async () => {
    if (!videoRef.current || !modelosOK) return;
    setBusy(true);
    try {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

      const detection = await obtenerDescriptor(canvas);
      if (!detection) {
        showToast?.('No se detectó ninguna cara. Acércate bien al centro.', 'warning');
        return;
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturas(prev => [...prev, { dataUrl, descriptor: detection.descriptor }]);
    } catch (e) {
      showToast?.('Error capturando: ' + e.message, 'error');
    } finally { setBusy(false); }
  };

  const guardar = async () => {
    if (!seleccionado || capturas.length < 3) {
      showToast?.('Necesitas las 3 capturas antes de guardar', 'warning');
      return;
    }
    setBusy(true);
    try {
      // 1. Subir las 3 fotos de referencia a Storage
      const fotosUrls = [];
      for (let i = 0; i < capturas.length; i++) {
        const blob = await (await fetch(capturas[i].dataUrl)).blob();
        const path = `Personal/${seleccionado.id}/ref_${i + 1}.jpg`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(ref);
        fotosUrls.push(url);
      }
      // 2. Guardar descriptores en el doc /Personal/{id}
      // Firestore NO permite arrays anidados → guardamos como mapa {d0, d1, d2}
      const descriptorsMap = {};
      capturas.forEach((c, i) => {
        descriptorsMap['d' + i] = descriptorToArray(c.descriptor);
      });
      await setDoc(doc(db, 'Personal', seleccionado.id), {
        faceDescriptors: descriptorsMap,
        faceFotosRef: fotosUrls,
        faceEnroladoEn: serverTimestamp(),
      }, { merge: true });
      showToast?.(`✅ ${seleccionado.nombre} enrolado con 3 fotos`, 'success');
      setCapturas([]);
      setSeleccionado(null);
      cerrarCamara();
    } catch (e) {
      showToast?.('Error guardando: ' + e.message, 'error');
    } finally { setBusy(false); }
  };

  const cancelar = () => {
    setCapturas([]);
    setSeleccionado(null);
    cerrarCamara();
  };

  // Estilo card
  const card = {
    background: BASE.white, border: `1px solid ${BASE.border}`,
    borderRadius: RADIUS.xl, boxShadow: BASE.shadowSm,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
      {/* Header compacto */}
      <div style={{
        background: BASE.white,
        borderRadius: '10px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
          Enrolamiento Facial · Identidad Biométrica
        </span>
        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
          3 fotos por obrero · descriptores en /Personal para reconocer al marcar asistencia
        </span>
      </div>

      {cargandoModelos && (
        <div style={{ ...card, padding: SPACING.lg, textAlign: 'center', color: BASE.muted }}>
          Cargando modelos de IA (~7 MB, primera vez)…
        </div>
      )}

      {/* Vista A: lista por grupos (Obreros + Staff) */}
      {!seleccionado && (
        personalFiltrado.length === 0 ? (
          <div style={{ ...card, padding: SPACING['2xl'], textAlign: 'center', color: BASE.muted }}>
            No hay personal activo
          </div>
        ) : (
          <>
            <GrupoEnrol titulo="👷 OBREROS · cuadrillas" descripcion="Capataz, Operario, Oficial, Ayudante"
              items={grupos.obreros} onPick={(p) => { setSeleccionado(p); abrirCamara(); }} acentoColor="#1e3a5f" />
            <GrupoEnrol titulo="👔 STAFF TÉCNICO · ingenieros" descripcion="Residente, Oficina Técnica, Producción, Calidad"
              items={grupos.staff} onPick={(p) => { setSeleccionado(p); abrirCamara(); }} acentoColor="#7c3aed" />
          </>
        )
      )}

      {/* Vista B: cámara + capturas */}
      {seleccionado && (
        <div style={{ ...card, padding: SPACING.lg, display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md }}>
            <div>
              <p style={{ fontSize: '10px', color: BASE.muted, fontWeight: '800', letterSpacing: '0.6px' }}>ENROLANDO</p>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, marginTop: '2px' }}>{seleccionado.nombre}</h3>
              <p style={{ fontSize: '11.5px', color: BASE.muted }}>Capturas: <strong>{capturas.length} / 3</strong></p>
            </div>
            <button onClick={cancelar}
              style={{ padding: '8px 14px', background: 'transparent', color: BASE.muted, border: `1px solid ${BASE.border}`, borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
              ← Volver al listado
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(280px,1fr)', gap: SPACING.md }}>
            {/* Cámara */}
            <div style={{ background: '#000', borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              {!stream && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', flexDirection: 'column', gap: '12px' }}>
                  <p>Cámara apagada</p>
                  <button onClick={abrirCamara} style={{ padding: '8px 16px', background: BASE.gold, color: BASE.navy, border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>Abrir cámara</button>
                </div>
              )}
              {/* Overlay guía */}
              {stream && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  width: '60%', aspectRatio: '3/4', border: '2px dashed rgba(229,168,47,0.7)',
                  borderRadius: '50%', pointerEvents: 'none',
                }}/>
              )}
            </div>

            {/* Galería de capturas */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[0,1,2].map(i => {
                  const c = capturas[i];
                  return (
                    <div key={i} style={{
                      aspectRatio: '1/1', borderRadius: RADIUS.md,
                      background: c ? `url(${c.dataUrl}) center/cover` : BASE.bgSoft,
                      border: c ? `2px solid ${BASE.green}` : `2px dashed ${BASE.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: BASE.muted, fontSize: '11px', fontWeight: '700',
                    }}>{c ? '' : i + 1}</div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: SPACING.md }}>
                <button onClick={capturar} disabled={!stream || !modelosOK || busy || capturas.length >= 3}
                  style={{
                    flex: 1, padding: '12px',
                    background: !stream || !modelosOK || busy || capturas.length >= 3 ? BASE.muted : BASE.gold,
                    color: !stream || !modelosOK || busy || capturas.length >= 3 ? '#fff' : BASE.navy,
                    border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '900',
                    cursor: capturas.length >= 3 ? 'default' : 'pointer',
                  }}>📸 Capturar ({capturas.length}/3)</button>
                {capturas.length > 0 && (
                  <button onClick={() => setCapturas(prev => prev.slice(0, -1))}
                    style={{ padding: '12px 14px', background: '#fff', color: BASE.red, border: `1px solid ${BASE.red}55`, borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    ↶ Quitar última
                  </button>
                )}
              </div>

              {capturas.length === 3 && (
                <button onClick={guardar} disabled={busy}
                  style={{ marginTop: SPACING.md, width: '100%', padding: '12px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}>
                  {busy ? 'Guardando…' : `💾 Guardar enrolamiento de ${seleccionado.nombre}`}
                </button>
              )}
            </div>
          </div>

          <div style={{ background: BASE.bgSoft, padding: '10px 14px', borderRadius: RADIUS.md, fontSize: '11px', color: BASE.muted }}>
            💡 <strong>Tip:</strong> toma las 3 fotos desde ángulos ligeramente distintos (frontal, mirando un poco a la izquierda, un poco a la derecha) para mejor reconocimiento luego.
          </div>
        </div>
      )}
    </div>
  );
}

// Sección plegable de tarjetas de personal por grupo (Obreros / Staff).
function GrupoEnrol({ titulo, descripcion, items, onPick, acentoColor }) {
  const total = items.length;
  const enrolados = items.filter(p => {
    const fd = p.faceDescriptors;
    return fd && (Array.isArray(fd) ? fd.length : Object.keys(fd).length) > 0;
  }).length;
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.xl, marginBottom: SPACING.md, overflow: 'hidden' }}>
      <div style={{
        background: `linear-gradient(135deg, ${acentoColor} 0%, ${acentoColor}cc 100%)`,
        padding: '12px 18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.4px' }}>{titulo}</p>
          <p style={{ fontSize: '10.5px', opacity: 0.85, marginTop: '2px' }}>{descripcion}</p>
        </div>
        <span style={{
          background: 'rgba(255,255,255,0.16)', padding: '4px 10px', borderRadius: '999px',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px',
        }}>
          {enrolados}/{total} enrolados
        </span>
      </div>
      {total === 0 ? (
        <p style={{ padding: '24px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
          Sin personal en este grupo. Registra trabajadores en <b>Personal → Nuevo Trabajador</b>.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: SPACING.md, padding: SPACING.md }}>
          {items.map(p => {
            const numDescs = p.faceDescriptors
              ? (Array.isArray(p.faceDescriptors) ? p.faceDescriptors.length : Object.keys(p.faceDescriptors).length)
              : 0;
            const enrolado = numDescs > 0;
            return (
              <button key={p.id} onClick={() => onPick(p)}
                style={{
                  padding: '14px', background: BASE.bgSoft,
                  border: `1.5px solid ${enrolado ? BASE.green : BASE.border}`,
                  borderRadius: RADIUS.lg, textAlign: 'left', cursor: 'pointer',
                  fontFamily: BASE.font, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = BASE.gold; e.currentTarget.style.background = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = enrolado ? BASE.green : BASE.border; e.currentTarget.style.background = BASE.bgSoft; }}
              >
                <span style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: enrolado ? BASE.greenLight : BASE.bgSoft,
                  color: enrolado ? BASE.greenDark : BASE.muted,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 900, flexShrink: 0,
                  border: `2px solid ${enrolado ? BASE.green : BASE.border}`,
                }}>{(p.nombre || '?').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: BASE.navy }}>{p.nombre}</p>
                  <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
                    {p.cargo || '—'} · {enrolado ? `✓ Enrolado (${numDescs} fotos)` : 'Sin enrolar'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
