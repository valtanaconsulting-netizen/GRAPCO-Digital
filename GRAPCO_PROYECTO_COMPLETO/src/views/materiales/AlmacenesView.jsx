// src/views/materiales/AlmacenesView.jsx — CRUD de almacenes (B19)

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const FORM_INICIAL = {
  codigo: '', nombre: '', tipo: 'obra', tipoInventario: 'MATERIALES',
  direccion: '', responsableEmail: '', proyectoId: '', activo: true,
};

export default function AlmacenesView({ showToast }) {
  const { user } = useAuth();
  const { proyectos, proyectoActivoId } = useProyectoActivo();
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [verTodosProyectos, setVerTodosProyectos] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'Almacenes'), orderBy('codigo')),
      (snap) => { setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const almacenesVisibles = verTodosProyectos
    ? almacenes
    : almacenes.filter(a => !a.proyectoId || a.proyectoId === proyectoActivoId);

  const guardar = async () => {
    if (!form.codigo || !form.nombre) {
      showToast?.('Codigo y nombre obligatorios', 'error');
      return;
    }
    if (!form.proyectoId) {
      showToast?.('Proyecto obligatorio', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.toUpperCase().trim(),
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        tipoInventario: form.tipoInventario || 'MATERIALES',
        proyectoId: form.proyectoId,
        direccion: form.direccion.trim(),
        responsableEmail: form.responsableEmail.trim(),
        activo: !!form.activo,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        await addDoc(collection(db, 'Almacenes'), data);
        showToast?.('✅ Almacen creado', 'success');
      } else {
        await updateDoc(doc(db, 'Almacenes', editando), data);
        showToast?.('✅ Almacen actualizado', 'success');
      }
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>🏬 Almacenes</p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {almacenesVisibles.length} de {almacenes.length} {verTodosProyectos ? '(todos los proyectos)' : '(proyecto activo)'}
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: BASE.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={verTodosProyectos} onChange={e => setVerTodosProyectos(e.target.checked)}
            style={{ width: '14px', height: '14px', accentColor: BASE.navy }} />
          Ver todos los proyectos
        </label>
        <button onClick={() => { setForm({ ...FORM_INICIAL, proyectoId: proyectoActivoId }); setEditando('NUEVO'); }} style={{
          padding: '10px 20px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(15,42,71,0.35)',
        }}>➕ NUEVO ALMACEN</button>
      </div>

      {almacenesVisibles.length === 0 ? (
        <EmptyState icono="🏬" titulo="Sin almacenes" descripcion="Crea el primer almacen del proyecto." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {almacenesVisibles.map(a => (
            <div key={a.id} style={{
              background: BASE.white, border: `1px solid ${BASE.border}`,
              borderRadius: '14px', padding: '18px 20px',
              borderLeft: `5px solid ${a.tipo === 'central' ? BASE.navy : BASE.gold}`,
              boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: a.tipo === 'central' ? BASE.navySoft : BASE.goldLight,
                      color: a.tipo === 'central' ? BASE.navy : BASE.goldDark,
                      padding: '3px 10px', borderRadius: '12px',
                      fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.6px',
                    }}>
                      {a.tipo === 'central' ? '🏛️ CENTRAL' : '🏗️ OBRA'}
                    </span>
                    <span style={{
                      background: a.tipoInventario === 'SERVICIOS' ? BASE.goldLight : BASE.navySoft,
                      color: a.tipoInventario === 'SERVICIOS' ? BASE.goldDark : BASE.navy,
                      padding: '3px 10px', borderRadius: '12px',
                      fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.6px',
                    }}>
                      {a.tipoInventario === 'SERVICIOS' ? '🔧 SERVICIOS' : '📦 MATERIALES'}
                    </span>
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy, marginTop: '8px' }}>{a.nombre}</p>
                  <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px', fontFamily: 'monospace' }}>{a.codigo}</p>
                </div>
                {a.activo === false && <span style={{ fontSize: '20px' }}>❌</span>}
              </div>
              {a.proyectoId && (
                <p style={{ fontSize: '10.5px', color: BASE.navyLight, fontWeight: '800', marginTop: '8px', letterSpacing: '0.4px' }}>
                  🏢 {proyectos.find(p => p.id === a.proyectoId)?.nombre || a.proyectoId}
                </p>
              )}
              {a.direccion && <p style={{ fontSize: '11.5px', color: BASE.text, marginTop: '10px' }}>📍 {a.direccion}</p>}
              {a.responsableEmail && <p style={{ fontSize: '11.5px', color: BASE.text, marginTop: '4px' }}>👤 {a.responsableEmail}</p>}
              <button onClick={() => { setForm({ ...FORM_INICIAL, ...a }); setEditando(a.id); }} style={{
                marginTop: '14px', padding: '6px 14px', borderRadius: '6px',
                background: BASE.navy, color: '#fff', border: 'none',
                fontSize: '10.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
              }}>✏️ EDITAR</button>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? 'Nuevo Almacen' : 'Editar Almacen'}
          </h3>
          <Inp label="Codigo *" value={form.codigo} onChange={v => setForm({...form, codigo: v.toUpperCase()})} />
          <Inp label="Nombre *" value={form.nombre} onChange={v => setForm({...form, nombre: v})} />
          <div style={{ marginBottom: '12px' }}>
            <label style={lblS}>PROYECTO *</label>
            <select value={form.proyectoId} onChange={e => setForm({...form, proyectoId: e.target.value})} style={selS}>
              <option value="">— Selecciona proyecto —</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lblS}>TIPO ALMACEN</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={selS}>
                <option value="central">🏛️ Almacen Central (empresa)</option>
                <option value="obra">🏗️ Almacen de Obra</option>
              </select>
            </div>
            <div>
              <label style={lblS}>INVENTARIO</label>
              <select value={form.tipoInventario} onChange={e => setForm({...form, tipoInventario: e.target.value})} style={selS}>
                <option value="MATERIALES">📦 Materiales</option>
                <option value="SERVICIOS">🔧 Servicios</option>
              </select>
            </div>
          </div>
          <Inp label="Direccion" value={form.direccion} onChange={v => setForm({...form, direccion: v})} />
          <Inp label="Email del responsable" type="email" value={form.responsableEmail} onChange={v => setForm({...form, responsableEmail: v})} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})}
              style={{ width: '17px', height: '17px', accentColor: BASE.navy }} />
            Almacen activo
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setEditando(null)} style={btnCancel}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnSave}>
              {guardando ? '⏳ Guardando...' : '💾 GUARDAR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inpS} />
    </div>
  );
}

const lblS = { fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '13px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(15,42,71,0.35)' };
