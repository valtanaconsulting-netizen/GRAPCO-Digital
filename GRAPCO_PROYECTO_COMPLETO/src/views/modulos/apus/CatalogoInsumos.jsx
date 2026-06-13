// src/views/modulos/apus/CatalogoInsumos.jsx — Maestro de insumos para APUs (B21)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import {
  CATEGORIAS_INSUMO, CATEGORIAS_MO,
  fmtSoles,
} from '../../../utils/planMaestroAnalytics';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';

const FORM_INICIAL = {
  codigo: '', descripcion: '', categoria: 'MAT', unidad: 'und', precioReferencia: 0, observaciones: '',
};

export default function CatalogoInsumos({ showToast }) {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [filtroCat, setFiltroCat] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'Insumos'), orderBy('codigo')),
      (snap) => { setInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const filtrados = useMemo(() => insumos.filter(i => {
    if (filtroCat && i.categoria !== filtroCat) return false;
    if (busqueda) {
      const b = busqueda.toLowerCase();
      return (i.codigo || '').toLowerCase().includes(b) ||
             (i.descripcion || '').toLowerCase().includes(b);
    }
    return true;
  }), [insumos, filtroCat, busqueda]);

  const guardar = async () => {
    if (!form.codigo || !form.descripcion) {
      showToast?.('Código y descripción obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.trim().toUpperCase(),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
        unidad: form.unidad,
        precioReferencia: parseFloat(form.precioReferencia) || 0,
        observaciones: form.observaciones?.trim() || null,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        await addDoc(collection(db, 'Insumos'), data);
        showToast?.(`✅ Insumo ${form.codigo} creado`, 'success');
      } else {
        await updateDoc(doc(db, 'Insumos', editando), data);
        showToast?.('✅ Insumo actualizado', 'success');
      }
      setEditando(null); setForm(FORM_INICIAL);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const eliminar = async (id, codigo) => {
    if (!confirm(`¿Eliminar insumo ${codigo}?`)) return;
    try {
      await deleteDoc(doc(db, 'Insumos', id));
      showToast?.('🗑️ Insumo eliminado', 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando insumos...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Maestro de Insumos</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {insumos.length} insumos · MO, Materiales, Equipos, Subcontratos
            </p>
          </div>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar..." style={{ ...inpS, minWidth: '180px' }} />
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ ...selS, minWidth: '160px' }}>
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORIAS_INSUMO).map(([k, c]) =>
              <option key={k} value={k}>{c.icono} {c.label}</option>)}
          </select>
          <button onClick={() => { setForm(FORM_INICIAL); setEditando('NUEVO'); }} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: BASE.shadowMd,
          }}>➕ NUEVO INSUMO</button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icono="🧱" titulo="Sin insumos"
          descripcion="Crea el maestro de insumos: mano de obra (operario, oficial, ayudante), materiales (cemento, fierro), equipos (mezcladora, vibrador), subcontratos." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th}>Código</th>
                  <th style={th}>Categoría</th>
                  <th style={th}>Descripción</th>
                  <th style={{ ...th, textAlign: 'center' }}>Unidad</th>
                  <th style={{ ...th, textAlign: 'right' }}>Precio Ref.</th>
                  <th style={{ ...th, textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((ins, i) => {
                  const cat = CATEGORIAS_INSUMO[ins.categoria] || CATEGORIAS_INSUMO.MAT;
                  return (
                    <tr key={ins.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: '900', color: BASE.navy }}>{ins.codigo}</td>
                      <td style={td}>
                        <span style={{
                          background: cat.color + '22', color: cat.color,
                          padding: '3px 10px', borderRadius: '10px',
                          fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                        }}>{cat.icono} {cat.label}</span>
                      </td>
                      <td style={td}>{ins.descripcion}</td>
                      <td style={{ ...td, textAlign: 'center', fontFamily: 'monospace' }}>{ins.unidad}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(ins.precioReferencia)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => { setForm({ ...FORM_INICIAL, ...ins }); setEditando(ins.id); }}
                            style={{ ...btnAct, background: BASE.navy }}>EDITAR</button>
                          <button onClick={() => eliminar(ins.id, ins.codigo)}
                            style={{ ...btnAct, background: BASE.red }}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? 'Nuevo Insumo' : 'Editar Insumo'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <Field label="Código *">
              <input type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
                placeholder="MAT-CEM-T1" style={inpS} />
            </Field>
            <Field label="Descripción *">
              <input type="text" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                placeholder="Cemento Portland Tipo I" style={inpS} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Categoría">
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} style={selS}>
                {Object.entries(CATEGORIAS_INSUMO).map(([k, c]) =>
                  <option key={k} value={k}>{c.icono} {c.label}</option>)}
              </select>
            </Field>
            <Field label="Unidad">
              <input type="text" value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})}
                placeholder="bol, kg, m3..." style={inpS} />
            </Field>
            <Field label="Precio referencia (S/.)">
              <input type="number" step="0.01" value={form.precioReferencia}
                onChange={e => setForm({...form, precioReferencia: e.target.value})} style={inpS} />
            </Field>
          </div>

          <Field label="Observaciones">
            <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} rows={2}
              placeholder="Notas, proveedor, marca..." style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setEditando(null)} style={btnCancel}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnSave}>
              {guardando ? '⏳' : '💾 GUARDAR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: BASE.shadowMd };
const btnAct = { padding: '5px 11px', borderRadius: '6px', color: '#fff', border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px' };
const th = { padding: '12px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: '12px', color: BASE.text, verticalAlign: 'top' };
