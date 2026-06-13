// src/views/calidad/NoConformidadesView.jsx — CRUD de No Conformidades (B20)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { ESTADOS_NC, SEVERIDADES_NC, ELEMENTOS_TIPO } from '../../utils/calidadOTAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import FotoUploader from '../../components/FotoUploader';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';

const FORM_INICIAL = {
  titulo: '', descripcion: '', severidad: 'media',
  elementoTipo: 'columna', elementoId: '', partidaWBS: '',
  causaRaiz: '', accionCorrectiva: '', accionPreventiva: '',
  fechaCompromiso: '',
  fotos: [],
};

export default function NoConformidadesView({ showToast }) {
  const { user } = useAuth();
  const [ncs, setNCs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState('');

  const { filtrarPorContexto } = useProyectoActivo();
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'NoConformidades'), orderBy('fechaApertura', 'desc')),
      (snap) => {
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setNCs(filtrarPorContexto(todos));
        setLoading(false);
      },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, [filtrarPorContexto]);

  const filtradas = useMemo(() => {
    return ncs.filter(n => {
      if (filtroEstado && n.estado !== filtroEstado) return false;
      if (filtroSeveridad && n.severidad !== filtroSeveridad) return false;
      return true;
    });
  }, [ncs, filtroEstado, filtroSeveridad]);

  const guardar = async () => {
    if (!form.titulo || !form.descripcion) {
      showToast?.('Titulo y descripcion obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const codigo = `NC-${new Date().getFullYear()}-${String(ncs.length + 1).padStart(3, '0')}`;
      const data = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        severidad: form.severidad,
        elementoTipo: form.elementoTipo,
        elementoId: form.elementoId?.trim() || null,
        partidaWBS: form.partidaWBS?.trim() || null,
        causaRaiz: form.causaRaiz?.trim() || null,
        accionCorrectiva: form.accionCorrectiva?.trim() || null,
        accionPreventiva: form.accionPreventiva?.trim() || null,
        fechaCompromiso: form.fechaCompromiso ? new Date(form.fechaCompromiso) : null,
        fotos: Array.isArray(form.fotos) ? form.fotos : [],
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.codigo = codigo;
        data.estado = 'abierta';
        data.fechaApertura = serverTimestamp();
        data.fechaCierre = null;
        data.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, 'NoConformidades'), data);
        showToast?.(`✅ NC ${codigo} creada`, 'success');
      } else {
        await updateDoc(doc(db, 'NoConformidades', editando), data);
        showToast?.('✅ NC actualizada', 'success');
      }
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const updateData = {
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (nuevoEstado === 'cerrada') updateData.fechaCierre = serverTimestamp();
      await updateDoc(doc(db, 'NoConformidades', id), updateData);
      showToast?.(`✅ NC actualizada a ${nuevoEstado}`, 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando NCs...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>No Conformidades</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {ncs.length} total · {filtradas.length} mostradas
            </p>
          </div>
          <button onClick={() => { setForm(FORM_INICIAL); setEditando('NUEVO'); }} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.red}, #b91c1c)`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: `0 4px 12px ${BASE.red}55`,
          }}>
            ➕ NUEVA NC
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginTop: '12px' }}>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selS}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_NC).map(([k, e]) => <option key={k} value={k}>{e.icono} {e.label}</option>)}
          </select>
          <select value={filtroSeveridad} onChange={e => setFiltroSeveridad(e.target.value)} style={selS}>
            <option value="">Todas las severidades</option>
            {Object.entries(SEVERIDADES_NC).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icono="🚨" titulo="Sin No Conformidades"
          descripcion="Excelente! O crea una si encontraste algo no conforme." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
          {filtradas.map(n => {
            const sev = SEVERIDADES_NC[n.severidad] || SEVERIDADES_NC.media;
            const est = ESTADOS_NC[n.estado] || ESTADOS_NC.abierta;
            return (
              <div key={n.id} style={{
                background: BASE.white, border: `1px solid ${BASE.border}`,
                borderLeft: `5px solid ${sev.color}`,
                borderRadius: '14px', padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, fontFamily: 'monospace' }}>
                      {n.codigo}
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
                      {n.titulo}
                    </p>
                  </div>
                  <span style={{
                    background: sev.color, color: '#fff',
                    padding: '3px 9px', borderRadius: '10px',
                    fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                  }}>{sev.label}</span>
                </div>

                <p style={{ fontSize: '12px', color: BASE.text, marginTop: '8px', lineHeight: 1.5 }}>
                  {n.descripcion}
                </p>

                {n.partidaWBS && (
                  <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '6px', fontFamily: 'monospace' }}>
                    Partida: {n.partidaWBS}
                  </p>
                )}

                {n.fotos?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px', overflowX: 'auto' }}>
                    {n.fotos.slice(0, 4).map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                        <img src={f.url} alt={`Foto ${i+1}`} style={{
                          width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover',
                          border: `1px solid ${BASE.border}`,
                        }} />
                      </a>
                    ))}
                    {n.fotos.length > 4 && (
                      <span style={{
                        width: '52px', height: '52px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '6px', background: BASE.bgSoft,
                        color: BASE.muted, fontSize: '11px', fontWeight: 700,
                      }}>+{n.fotos.length - 4}</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    background: est.color, color: '#fff',
                    padding: '4px 10px', borderRadius: '10px',
                    fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                  }}>{est.icono} {est.label}</span>

                  <button onClick={() => { setForm({ ...FORM_INICIAL, ...n,
                    fechaCompromiso: n.fechaCompromiso?.toDate ? n.fechaCompromiso.toDate().toISOString().split('T')[0] : ''
                  }); setEditando(n.id); }} style={btnAction(BASE.navy)}>
                    ✏️ Editar
                  </button>

                  {n.estado === 'abierta' && (
                    <button onClick={() => cambiarEstado(n.id, 'tratamiento')} style={btnAction('#f59e0b')}>
                      ▶ Tratamiento
                    </button>
                  )}
                  {n.estado === 'tratamiento' && (
                    <button onClick={() => cambiarEstado(n.id, 'cerrada')} style={btnAction(BASE.navy)}>
                      ✓ Cerrar
                    </button>
                  )}
                  {n.estado === 'cerrada' && (
                    <button onClick={() => cambiarEstado(n.id, 'verificada')} style={btnAction('#16a34a')}>
                      ✅ Verificar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? 'Nueva No Conformidad' : 'Editar NC'}
          </h3>

          <Field label="Titulo *">
            <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
              placeholder="Ej: Resistencia bajo en columna eje 3" style={inpS} />
          </Field>

          <Field label="Descripcion *">
            <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
              rows={3} placeholder="Detalle de la no conformidad..."
              style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Severidad">
              <select value={form.severidad} onChange={e => setForm({...form, severidad: e.target.value})} style={selS}>
                {Object.entries(SEVERIDADES_NC).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo elemento">
              <select value={form.elementoTipo} onChange={e => setForm({...form, elementoTipo: e.target.value})} style={selS}>
                {ELEMENTOS_TIPO.map(e => <option key={e.id} value={e.id}>{e.icono} {e.label}</option>)}
              </select>
            </Field>
            <Field label="Codigo elemento">
              <input type="text" value={form.elementoId} onChange={e => setForm({...form, elementoId: e.target.value})}
                placeholder="EJE3-N1" style={inpS} />
            </Field>
          </div>

          <Field label="Partida WBS">
            <input type="text" value={form.partidaWBS} onChange={e => setForm({...form, partidaWBS: e.target.value})}
              placeholder="ENC-COL-EJE3" style={inpS} />
          </Field>

          <Field label="Causa raiz">
            <textarea value={form.causaRaiz} onChange={e => setForm({...form, causaRaiz: e.target.value})} rows={2}
              placeholder="Por que ocurrio?" style={{ ...inpS, fontFamily: 'inherit' }} />
          </Field>

          <Field label="Accion correctiva">
            <textarea value={form.accionCorrectiva} onChange={e => setForm({...form, accionCorrectiva: e.target.value})} rows={2}
              placeholder="Que se hara para corregir?" style={{ ...inpS, fontFamily: 'inherit' }} />
          </Field>

          <Field label="Accion preventiva">
            <textarea value={form.accionPreventiva} onChange={e => setForm({...form, accionPreventiva: e.target.value})} rows={2}
              placeholder="Como evitar que se repita?" style={{ ...inpS, fontFamily: 'inherit' }} />
          </Field>

          <Field label="Fecha compromiso de cierre">
            <input type="date" value={form.fechaCompromiso} onChange={e => setForm({...form, fechaCompromiso: e.target.value})} style={inpS} />
          </Field>

          <Field label={`Evidencia fotográfica (${form.fotos?.length || 0})`}>
            <FotoUploader
              fotos={form.fotos || []}
              onChange={(fotos) => setForm({ ...form, fotos })}
              ruta={`NCs/${form.elementoId || 'sin-elemento'}/${Date.now()}`}
              max={10}
              showToast={showToast}
            />
          </Field>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setEditando(null)} style={btnCancel}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnSave}>
              {guardando ? '⏳ Guardando...' : '💾 GUARDAR NC'}
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
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.red}, #b91c1c)`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: `0 4px 12px ${BASE.red}55` };
const btnAction = (color) => ({
  padding: '5px 11px', borderRadius: '6px',
  background: color, color: '#fff', border: 'none',
  fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
});
