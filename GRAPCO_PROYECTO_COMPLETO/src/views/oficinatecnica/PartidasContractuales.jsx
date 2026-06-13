// src/views/oficinatecnica/PartidasContractuales.jsx — Presupuesto contractual (B20)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { fmtSoles, fmtNumero } from '../../utils/calidadOTAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const FORM_INICIAL = {
  codigo: '', descripcion: '', unidad: 'm3', metradoContractual: 0, precioUnitario: 0,
  partidaPadre: '', orden: 0,
};

export default function PartidasContractuales({ showToast }) {
  const { user } = useAuth();
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'PartidasContractuales'), orderBy('orden')),
      (snap) => { setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const filtradas = useMemo(() => partidas.filter(p => {
    if (!filtro) return true;
    const f = filtro.toLowerCase();
    return p.codigo?.toLowerCase().includes(f) || p.descripcion?.toLowerCase().includes(f);
  }), [partidas, filtro]);

  const totalContractual = useMemo(() =>
    partidas.reduce((s, p) => s + (p.metradoContractual || 0) * (p.precioUnitario || 0), 0)
  , [partidas]);

  const guardar = async () => {
    if (!form.codigo || !form.descripcion) {
      showToast?.('Codigo y descripcion obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.toUpperCase().trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad,
        metradoContractual: parseFloat(form.metradoContractual) || 0,
        precioUnitario: parseFloat(form.precioUnitario) || 0,
        partidaPadre: form.partidaPadre?.trim() || null,
        orden: parseInt(form.orden) || 0,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      data.subtotal = data.metradoContractual * data.precioUnitario;

      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        await addDoc(collection(db, 'PartidasContractuales'), data);
        showToast?.('✅ Partida creada', 'success');
      } else {
        await updateDoc(doc(db, 'PartidasContractuales', editando), data);
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
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Partidas Contractuales</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {partidas.length} partidas · Presupuesto: <strong>{fmtSoles(totalContractual)}</strong>
            </p>
          </div>
          <input type="text" value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="🔍 Buscar..." style={{ ...inpS, minWidth: '180px' }} />
          <button onClick={() => { setForm(FORM_INICIAL); setEditando('NUEVO'); }} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: '0 4px 12px rgba(15,42,71,0.35)',
          }}>➕ NUEVA PARTIDA</button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icono="📋" titulo="Sin partidas contractuales"
          descripcion="Carga el presupuesto contractual del cliente. Estas partidas son la base de las valorizaciones." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Codigo</th>
                  <th style={th()}>Descripcion</th>
                  <th style={th({ textAlign: 'center' })}>Unidad</th>
                  <th style={th({ textAlign: 'right' })}>Metrado</th>
                  <th style={th({ textAlign: 'right' })}>Precio Unit.</th>
                  <th style={th({ textAlign: 'right' })}>Subtotal</th>
                  <th style={th({ textAlign: 'center' })}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => {
                  const subtotal = (p.metradoContractual || 0) * (p.precioUnitario || 0);
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px', fontWeight: '900', color: BASE.navy }}>{p.codigo}</td>
                      <td style={{ ...td(), fontWeight: '700' }}>{p.descripcion}</td>
                      <td style={{ ...td(), textAlign: 'center', fontFamily: 'monospace', fontSize: '11px' }}>{p.unidad}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtNumero(p.metradoContractual, 2)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(p.precioUnitario)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: BASE.navy }}>{fmtSoles(subtotal)}</td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <button onClick={() => { setForm({ ...FORM_INICIAL, ...p }); setEditando(p.id); }} style={{
                          padding: '5px 11px', borderRadius: '6px', background: BASE.navy, color: '#fff',
                          border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
                        }}>EDITAR</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <td colSpan={5} style={{ padding: '12px 14px', fontSize: '12px', fontWeight: '900', textAlign: 'right' }}>
                    TOTAL CONTRACTUAL:
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '900', textAlign: 'right', color: BASE.gold }}>
                    {fmtSoles(totalContractual)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? 'Nueva Partida Contractual' : 'Editar Partida'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <Field label="Codigo *">
              <input type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
                placeholder="01.01.001" style={inpS} />
            </Field>
            <Field label="Descripcion *">
              <input type="text" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                placeholder="Excavacion masiva de cimentacion" style={inpS} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Unidad">
              <select value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} style={selS}>
                {['m3','m2','ml','kg','tn','und','glb','dia','mes'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Metrado contractual">
              <input type="number" step="0.01" value={form.metradoContractual}
                onChange={e => setForm({...form, metradoContractual: e.target.value})} style={inpS} />
            </Field>
            <Field label="Precio unitario (S/.)">
              <input type="number" step="0.01" value={form.precioUnitario}
                onChange={e => setForm({...form, precioUnitario: e.target.value})} style={inpS} />
            </Field>
          </div>

          {/* Subtotal en vivo */}
          <div style={{
            background: BASE.navySoft, border: `1px solid ${BASE.navyLight}55`,
            borderLeft: `4px solid ${BASE.navy}`, borderRadius: '10px',
            padding: '12px 16px', marginBottom: '12px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navyLight, letterSpacing: '0.5px' }}>SUBTOTAL DE LA PARTIDA</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
              {fmtSoles((parseFloat(form.metradoContractual) || 0) * (parseFloat(form.precioUnitario) || 0))}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Partida padre (opcional)">
              <input type="text" value={form.partidaPadre} onChange={e => setForm({...form, partidaPadre: e.target.value})}
                placeholder="01.01" style={inpS} />
            </Field>
            <Field label="Orden visualizacion">
              <input type="number" value={form.orden} onChange={e => setForm({...form, orden: e.target.value})} style={inpS} />
            </Field>
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
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(15,42,71,0.35)' };
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, verticalAlign: 'top', ...extra });
