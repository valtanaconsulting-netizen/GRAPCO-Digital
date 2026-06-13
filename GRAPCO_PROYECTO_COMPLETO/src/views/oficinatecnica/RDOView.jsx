// src/views/oficinatecnica/RDOView.jsx — Reporte Diario de Obra (B20)
// Autogenera desde tareos + LPS + cuadrillas

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { autogenerarRDOdesdeProduccion, fmtNumero } from '../../utils/calidadOTAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

export default function RDOView({ showToast }) {
  const { user, rol } = useAuth();
  const [rdos, setRDOs] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [tareos, setTareos] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const canvasFirmaRef = useRef(null);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'RDO'), orderBy('fecha', 'desc')),
        (snap) => { setRDOs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(query(collection(db, 'Historial'), orderBy('fecha', 'desc')),
        (snap) => setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'Registros_Campo'),
        (snap) => setTareos(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'CuadrillasActivas'),
        (snap) => setCuadrillas(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const generarRDOHoy = async () => {
    const hoy = new Date();
    const yaExiste = rdos.find(r => {
      const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      return f.toDateString() === hoy.toDateString();
    });
    if (yaExiste) {
      showToast?.('Ya existe RDO para hoy. Editalo en su lugar.', 'error');
      setEditando(yaExiste);
      return;
    }

    setGenerando(true);
    try {
      const borrador = autogenerarRDOdesdeProduccion({
        historial, tareos, cuadrillasActivas: cuadrillas, fecha: hoy,
      });
      const docRef = await addDoc(collection(db, 'RDO'), {
        ...borrador,
        fecha: hoy,
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'desconocido',
      });
      showToast?.(`✅ RDO ${borrador.numero} generado automaticamente`, 'success');
      setEditando({ id: docRef.id, ...borrador, fecha: hoy });
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGenerando(false); }
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      const { id, fecha, ...rest } = editando;
      await updateDoc(doc(db, 'RDO', id), {
        ...rest,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      });
      showToast?.('✅ RDO actualizado', 'success');
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const firmar = async () => {
    if (!editando) return;
    if (!['ingeniero', 'admin'].includes(rol)) {
      showToast?.('Solo el residente puede firmar el RDO', 'error');
      return;
    }
    setGuardando(true);
    try {
      const dataUrl = canvasFirmaRef.current?.toDataURL('image/png');
      let firmaUrl = null;
      if (dataUrl && dataUrl.length > 1000) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const r = ref(storage, `rdo/firmas/${editando.id}_${Date.now()}.png`);
          await uploadBytes(r, blob);
          firmaUrl = await getDownloadURL(r);
        } catch (e) { console.warn('[Firma]', e); }
      }
      const firma = {
        uid: user?.uid || 'desconocido',
        email: user?.email || 'desconocido',
        fecha: serverTimestamp(),
        firmaUrl,
      };
      await updateDoc(doc(db, 'RDO', editando.id), {
        firmaResidente: firma, estado: 'firmado',
      });
      showToast?.('✅ RDO firmado', 'success');
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const startDraw = (e) => {
    setFirmando(true);
    const ctx = canvasFirmaRef.current.getContext('2d');
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = BASE.navy;
    const rect = canvasFirmaRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = (e) => {
    if (!firmando) return;
    e.preventDefault();
    const ctx = canvasFirmaRef.current.getContext('2d');
    const rect = canvasFirmaRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };
  const limpiarFirma = () => {
    if (canvasFirmaRef.current) {
      const ctx = canvasFirmaRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasFirmaRef.current.width, canvasFirmaRef.current.height);
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando RDOs...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>📅 Reportes Diarios de Obra</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {rdos.length} RDOs · {rdos.filter(r => r.estado === 'firmado').length} firmados
            </p>
          </div>
          <button onClick={generarRDOHoy} disabled={generando} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, #0d9488, #0f766e)`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: generando ? 'not-allowed' : 'pointer', letterSpacing: '0.5px',
            opacity: generando ? 0.5 : 1,
            boxShadow: '0 4px 12px rgba(13,148,136,0.4)',
          }}>
            {generando ? '⏳ Generando...' : '🤖 GENERAR RDO HOY'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '8px', fontStyle: 'italic' }}>
          🤖 La autogeneracion toma datos de Tareos + LPS + Cuadrillas del dia. Solo necesitas revisar y firmar.
        </p>
      </div>

      {rdos.length === 0 ? (
        <EmptyState icono="📅" titulo="Sin RDOs"
          descripcion="Genera el RDO de hoy con un click. La plataforma agrega automaticamente personal, actividades, cuadrillas." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {rdos.slice(0, 30).map(r => {
            const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
            const estadoColor = r.estado === 'firmado' ? BASE.green : r.estado === 'enviado_cliente' ? '#2563eb' : '#f59e0b';
            return (
              <div key={r.id} style={{
                background: BASE.white, border: `1px solid ${BASE.border}`,
                borderLeft: `5px solid ${estadoColor}`,
                borderRadius: '12px', padding: '14px 18px',
                cursor: 'pointer',
              }}
              onClick={() => setEditando({ id: r.id, ...r })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
                      {r.numero || 'Sin numero'}
                    </p>
                    <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                      {f.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </p>
                  </div>
                  <span style={{
                    background: estadoColor, color: '#fff',
                    padding: '3px 9px', borderRadius: '10px',
                    fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                  }}>{(r.estado || 'borrador').toUpperCase()}</span>
                </div>
                {r.personal && (
                  <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '8px' }}>
                    👷 {r.personal.total || 0} personas · {r.actividadesEjecutadas?.length || 0} actividades
                  </p>
                )}
                {r.autogenerado && (
                  <p style={{ fontSize: '9.5px', color: '#0d9488', fontWeight: '900', marginTop: '4px', letterSpacing: '0.5px' }}>
                    🤖 AUTOGENERADO
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edicion del RDO */}
      {editando && (
        <Modal onClose={() => setEditando(null)} maxWidth="700px">
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            📅 RDO {editando.numero}
          </h3>

          {/* Personal */}
          <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
            <p style={lblSec}>👷 PERSONAL EN OBRA</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
              <Field label="Obreros">
                <input type="number" value={editando.personal?.obreros || 0}
                  onChange={e => setEditando({...editando, personal: { ...editando.personal, obreros: parseInt(e.target.value) || 0 }})}
                  style={inpS} />
              </Field>
              <Field label="Tecnicos">
                <input type="number" value={editando.personal?.tecnicos || 0}
                  onChange={e => setEditando({...editando, personal: { ...editando.personal, tecnicos: parseInt(e.target.value) || 0 }})}
                  style={inpS} />
              </Field>
              <Field label="Administrativos">
                <input type="number" value={editando.personal?.administrativos || 0}
                  onChange={e => setEditando({...editando, personal: { ...editando.personal, administrativos: parseInt(e.target.value) || 0 }})}
                  style={inpS} />
              </Field>
            </div>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px', fontWeight: '800' }}>
              TOTAL: {(editando.personal?.obreros || 0) + (editando.personal?.tecnicos || 0) + (editando.personal?.administrativos || 0)} personas
            </p>
          </div>

          {/* Clima */}
          <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
            <p style={lblSec}>🌤️ CLIMA</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="Mañana">
                <input type="text" value={editando.clima?.manana || ''}
                  onChange={e => setEditando({...editando, clima: { ...editando.clima, manana: e.target.value }})}
                  placeholder="Soleado / Nublado / Lluvia" style={inpS} />
              </Field>
              <Field label="Tarde">
                <input type="text" value={editando.clima?.tarde || ''}
                  onChange={e => setEditando({...editando, clima: { ...editando.clima, tarde: e.target.value }})}
                  placeholder="Soleado / Nublado / Lluvia" style={inpS} />
              </Field>
            </div>
          </div>

          {/* Actividades ejecutadas */}
          <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
            <p style={lblSec}>📋 ACTIVIDADES EJECUTADAS ({editando.actividadesEjecutadas?.length || 0})</p>
            {(editando.actividadesEjecutadas || []).map((a, i) => (
              <div key={i} style={{
                background: BASE.white, padding: '10px 14px', borderRadius: '8px',
                marginBottom: '6px', fontSize: '12px',
              }}>
                <p style={{ fontWeight: '900', color: BASE.navy }}>{a.partida || a.actividad}</p>
                <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                  Avance: {fmtNumero(a.avance, 2)} {a.unidad} · Cuadrilla: {a.cuadrilla} · HH: {fmtNumero(a.horasHombre, 1)}
                </p>
              </div>
            ))}
            {!editando.actividadesEjecutadas?.length && (
              <p style={{ fontSize: '12px', color: BASE.muted, fontStyle: 'italic', textAlign: 'center', padding: '14px' }}>
                Sin actividades registradas en producción para este día
              </p>
            )}
          </div>

          {/* Observaciones */}
          <Field label="📝 Observaciones">
            <textarea value={editando.observaciones || ''}
              onChange={e => setEditando({...editando, observaciones: e.target.value})}
              rows={3} placeholder="Eventos del dia, cambios, atrasos, decisiones..."
              style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          {/* Firma */}
          {editando.firmaResidente?.uid ? (
            <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', textAlign: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>✓ FIRMADO POR</p>
              {editando.firmaResidente.firmaUrl && (
                <img src={editando.firmaResidente.firmaUrl} alt="Firma" style={{ maxHeight: '60px', marginTop: '6px' }} />
              )}
              <p style={{ fontSize: '12px', fontWeight: '700', color: BASE.text, marginTop: '4px' }}>
                {editando.firmaResidente.email}
              </p>
            </div>
          ) : (
            <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '6px' }}>
                ✍️ FIRMA DEL RESIDENTE
              </p>
              <canvas ref={canvasFirmaRef} width={500} height={100}
                onMouseDown={startDraw} onMouseMove={draw}
                onMouseUp={() => setFirmando(false)} onMouseLeave={() => setFirmando(false)}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setFirmando(false)}
                style={{ background: BASE.white, border: `2px dashed ${BASE.border}`, borderRadius: '8px', cursor: 'crosshair', maxWidth: '100%', display: 'block', touchAction: 'none' }} />
              <button onClick={limpiarFirma} style={{
                marginTop: '6px', padding: '4px 10px', borderRadius: '6px',
                background: BASE.bgSoft, color: BASE.muted, border: `1px solid ${BASE.border}`,
                fontSize: '10px', fontWeight: '800', cursor: 'pointer',
              }}>🗑️ Limpiar</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={() => setEditando(null)} style={btnCancel}>Cerrar</button>
            <button onClick={guardar} disabled={guardando} style={btnSave('navy')}>
              {guardando ? '⏳' : '💾 Guardar'}
            </button>
            {!editando.firmaResidente?.uid && (
              <button onClick={firmar} disabled={guardando} style={btnSave('green')}>
                {guardando ? '⏳' : '✍️ Firmar RDO'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const lblSec = { fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.6px', marginBottom: '8px' };
const inpS = { width: '100%', padding: '8px 11px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '600', background: '#fff' };
const btnCancel = { padding: '10px 18px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' };
const btnSave = (variant) => {
  const colors = {
    navy: { bg: BASE.navy, shadow: BASE.navy + '55' },
    green: { bg: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`, shadow: BASE.green + '55' },
  };
  const c = colors[variant] || colors.navy;
  return {
    padding: '10px 18px', borderRadius: '8px',
    background: c.bg, color: '#fff', border: 'none',
    fontSize: '11.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
    boxShadow: `0 4px 12px ${c.shadow}`,
  };
};
