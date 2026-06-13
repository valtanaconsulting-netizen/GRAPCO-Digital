// src/views/compras/PartidasView.jsx — CRUD de partidas presupuestales (Fase 6 prereq)

import React, { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { fmtMoneda } from '../../utils/tipoCambioClient';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const FORM_INICIAL = {
  codigo: '', descripcion: '', unidad: 'GLB',
  metrado: 0, precioUnit: 0, montoPresupuestado: 0,
  proyectoId: '', partidaPadreId: '', activo: true,
};

export default function PartidasView({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, proyectos } = useProyectoActivo();
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'Partidas'), orderBy('codigo')),
      (snap) => { setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.warn('[Partidas]', e); setLoading(false); });
    return () => unsub();
  }, []);

  const partidasProyecto = useMemo(() => {
    return partidas.filter(p => !p.proyectoId || p.proyectoId === proyectoActivoId);
  }, [partidas, proyectoActivoId]);

  const filtradas = useMemo(() => {
    if (!busqueda) return partidasProyecto;
    const q = busqueda.toLowerCase();
    return partidasProyecto.filter(p =>
      (p.codigo || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    );
  }, [partidasProyecto, busqueda]);

  const guardar = async () => {
    if (!form.codigo || !form.descripcion) {
      showToast?.('Codigo y descripcion obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const metrado = parseFloat(form.metrado) || 0;
      const precio = parseFloat(form.precioUnit) || 0;
      const data = {
        codigo: form.codigo.toUpperCase().trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad || 'GLB',
        metrado,
        precioUnit: precio,
        montoPresupuestado: parseFloat(form.montoPresupuestado) || (metrado * precio),
        proyectoId: form.proyectoId || proyectoActivoId,
        partidaPadreId: form.partidaPadreId || null,
        activo: !!form.activo,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        await addDoc(collection(db, 'Partidas'), data);
        showToast?.('✅ Partida creada', 'success');
      } else {
        await updateDoc(doc(db, 'Partidas', editando), data);
        showToast?.('✅ Partida actualizada', 'success');
      }
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando partidas...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Partidas Presupuestales</p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {filtradas.length} de {partidasProyecto.length} en este proyecto
          </p>
        </div>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', minWidth: '180px' }} />
        <button onClick={() => { setForm({ ...FORM_INICIAL, proyectoId: proyectoActivoId }); setEditando('NUEVO'); }} style={{
          padding: '10px 20px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
        }}>➕ NUEVA PARTIDA</button>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icono="📑" titulo="Sin partidas" descripcion="Crea la primera partida del presupuesto del proyecto." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Codigo</th>
                  <th style={th()}>Descripcion</th>
                  <th style={th()}>Und</th>
                  <th style={th({ textAlign: 'right' })}>Metrado</th>
                  <th style={th({ textAlign: 'right' })}>P. Unit</th>
                  <th style={th({ textAlign: 'right' })}>Presupuesto</th>
                  <th style={th({ textAlign: 'center' })}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontFamily: 'monospace', fontWeight: '800', color: BASE.navy }}>{p.codigo}</td>
                    <td style={{ ...td(), fontWeight: '700' }}>{p.descripcion}</td>
                    <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px' }}>{p.unidad}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{p.metrado || '—'}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{fmtMoneda(p.precioUnit || 0, 'PEN')}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: '#16a34a' }}>
                      {fmtMoneda(p.montoPresupuestado || 0, 'PEN')}
                    </td>
                    <td style={{ ...td(), textAlign: 'center' }}>
                      <button onClick={() => { setForm({ ...FORM_INICIAL, ...p }); setEditando(p.id); }} style={{
                        padding: '5px 12px', borderRadius: '6px', background: BASE.navy, color: '#fff',
                        border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                      }}>EDITAR</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? '➕ Nueva Partida' : '✏️ Editar Partida'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <Inp label="Codigo *" value={form.codigo} onChange={v => setForm({...form, codigo: v.toUpperCase()})} placeholder="01.01.001" />
            <Inp label="Descripcion *" value={form.descripcion} onChange={v => setForm({...form, descripcion: v})} placeholder="Concreto fc=210" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <Inp label="Unidad" value={form.unidad} onChange={v => setForm({...form, unidad: v})} />
            <Inp label="Metrado" type="number" value={form.metrado} onChange={v => setForm({...form, metrado: v})} />
            <Inp label="P. Unit (S/.)" type="number" value={form.precioUnit} onChange={v => setForm({...form, precioUnit: v})} />
            <Inp label="Presupuesto" type="number" value={form.montoPresupuestado} onChange={v => setForm({...form, montoPresupuestado: v})} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={lblS}>PROYECTO</label>
            <select value={form.proyectoId} onChange={e => setForm({...form, proyectoId: e.target.value})} style={selS}>
              <option value="">— Selecciona —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
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

function Inp({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={lblS}>{label.toUpperCase()}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inpS} />
    </div>
  );
}

const lblS = { fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '13px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer' };
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, ...extra });
