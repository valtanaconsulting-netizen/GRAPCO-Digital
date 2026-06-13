// src/views/modulos/proyectos/FrentesView.jsx — CRUD frentes (B23)

import React, { useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';

const COLORES_FRENTE = ['#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#6366f1', '#ec4899', '#0f766e', '#be185d'];

const FORM_INI = {
  codigo: '', nombre: '', descripcion: '', responsable: '',
  presupuestoFrente: 0, color: COLORES_FRENTE[0], orden: 1, activo: true,
};

export default function FrentesView({ showToast }) {
  const { user, rol } = useAuth();
  const { proyectoActivo, frentesDelProyecto, setFrenteActivoId, FRENTE_TODOS } = useProyectoActivo();
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INI);
  const [guardando, setGuardando] = useState(false);

  const sortedFrentes = useMemo(() => {
    return [...frentesDelProyecto].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [frentesDelProyecto]);

  if (!proyectoActivo) {
    return <EmptyState icono="🌎" titulo="Sin proyecto activo"
      descripcion="Selecciona un proyecto en la barra superior para ver y gestionar sus frentes." />;
  }

  const abrirNuevo = () => {
    setForm({
      ...FORM_INI,
      orden: sortedFrentes.length + 1,
      codigo: `F-${String(sortedFrentes.length + 1).padStart(2, '0')}`,
      color: COLORES_FRENTE[sortedFrentes.length % COLORES_FRENTE.length],
    });
    setEditando('NUEVO');
  };

  const abrirEditar = (f) => {
    setForm({ ...FORM_INI, ...f });
    setEditando(f.id);
  };

  const guardar = async () => {
    if (!form.codigo || !form.nombre) {
      showToast?.('Código y nombre obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || '',
        responsable: form.responsable?.trim() || 'Sin asignar',
        proyectoId: proyectoActivo.id,
        presupuestoFrente: parseFloat(form.presupuestoFrente) || 0,
        color: form.color || COLORES_FRENTE[0],
        orden: parseInt(form.orden) || 1,
        activo: form.activo !== false,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        data.avancePctActual = 0;
        await addDoc(collection(db, 'Frentes'), data);
        showToast?.(`✅ Frente "${form.nombre}" creado`, 'success');
      } else {
        await updateDoc(doc(db, 'Frentes', editando), data);
        showToast?.('✅ Frente actualizado', 'success');
      }
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const eliminar = async (f) => {
    if (f.esDefault) {
      showToast?.('No puedes eliminar el frente default', 'error');
      return;
    }
    if (!confirm(`¿Eliminar frente "${f.nombre}"?\n\nLos datos asociados (actividades, tareos, etc) NO se borran pero quedarán huérfanos.`)) return;
    try {
      await deleteDoc(doc(db, 'Frentes', f.id));
      showToast?.('🗑️ Frente eliminado', 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const seleccionar = (id) => {
    setFrenteActivoId(id);
    showToast?.('📍 Frente activo cambiado', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${proyectoActivo.color || BASE.navy}, ${proyectoActivo.color || BASE.navy}dd)`,
        borderRadius: '14px', padding: '18px 24px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          FRENTES DEL PROYECTO
        </p>
        <h2 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>
          {proyectoActivo.nombre}
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
          {sortedFrentes.length} frente(s) · {proyectoActivo.ubicacion?.ciudad || '—'}
        </p>
      </div>

      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Frentes de Trabajo</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              Cada frente es una zona física o lógica de trabajo dentro del proyecto.
            </p>
          </div>
          {(rol === 'admin' || rol === 'ingeniero') && (
            <button onClick={abrirNuevo} style={{
              padding: '10px 18px', borderRadius: '8px',
              background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
              color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
              cursor: 'pointer', letterSpacing: '0.4px',
              boxShadow: `0 4px 12px ${BASE.navy}66`,
            }}>➕ NUEVO FRENTE</button>
          )}
        </div>
      </div>

      {sortedFrentes.length === 0 ? (
        <EmptyState icono="📍" titulo="Sin frentes en este proyecto"
          descripcion="Crea frentes para dividir el proyecto en zonas de trabajo (ej: Norte, Sur, Central). Cada frente tiene sus propios indicadores." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          {sortedFrentes.map(f => (
            <div key={f.id} style={{
              background: BASE.white, border: `1px solid ${BASE.border}`,
              borderLeft: `5px solid ${f.color}`,
              borderRadius: '14px', padding: '16px 20px',
              boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
              opacity: f.activo === false ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '11px', fontWeight: '900', color: f.color, fontFamily: 'monospace' }}>
                    📍 {f.codigo}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, marginTop: '4px', lineHeight: 1.3 }}>
                    {f.nombre}
                  </p>
                  {f.descripcion && (
                    <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px' }}>{f.descripcion}</p>
                  )}
                </div>
                {f.activo === false && (
                  <span style={{
                    background: '#fee2e2', color: '#991b1b',
                    padding: '3px 8px', borderRadius: '8px',
                    fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px',
                  }}>INACTIVO</span>
                )}
              </div>

              <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '10px' }}>
                👤 {f.responsable || 'Sin responsable'}
              </p>

              {f.presupuestoFrente > 0 && (
                <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '4px' }}>
                  💰 Presupuesto: <strong style={{ color: BASE.navy }}>S/. {Number(f.presupuestoFrente).toLocaleString('es-PE')}</strong>
                </p>
              )}

              {/* Avance bar */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>AVANCE</span>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: f.color }}>{Math.round(Number(f.avancePctActual || 0))}%</span>
                </div>
                <div style={{ background: BASE.bgSoft, height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ background: f.color, height: '100%', width: `${Math.min(100, f.avancePctActual || 0)}%`, transition: 'width 0.5s' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                <button onClick={() => seleccionar(f.id)} style={btnAct(BASE.gold)}>
                  📍 Activar
                </button>
                {(rol === 'admin' || rol === 'ingeniero') && (
                  <>
                    <button onClick={() => abrirEditar(f)} style={btnAct(BASE.navy)}>
                      ✏️ Editar
                    </button>
                    {!f.esDefault && rol === 'admin' && (
                      <button onClick={() => eliminar(f)} style={btnAct(BASE.red)}>×</button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? 'Nuevo Frente' : 'Editar Frente'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
            <Field label="Código *">
              <input type="text" value={form.codigo}
                onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="F-01" style={inpS} />
            </Field>
            <Field label="Nombre *">
              <input type="text" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Tanque de sedimentación" style={inpS} />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              placeholder="Descripción técnica del frente..."
              style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Responsable">
              <input type="text" value={form.responsable}
                onChange={e => setForm({ ...form, responsable: e.target.value })}
                placeholder="Ing. Juan Pérez" style={inpS} />
            </Field>
            <Field label="Orden">
              <input type="number" value={form.orden}
                onChange={e => setForm({ ...form, orden: e.target.value })} style={inpS} />
            </Field>
          </div>

          <Field label="Presupuesto del frente (S/.)">
            <input type="number" step="0.01" value={form.presupuestoFrente}
              onChange={e => setForm({ ...form, presupuestoFrente: e.target.value })}
              placeholder="0 (se calcula sumando actividades)" style={inpS} />
          </Field>

          <Field label="Color del frente">
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COLORES_FRENTE.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                  width: '34px', height: '34px',
                  background: c, borderRadius: '50%',
                  border: form.color === c ? `3px solid ${BASE.gold}` : '2px solid #fff',
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : '0 1px 4px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                }} />
              ))}
            </div>
          </Field>

          <Field label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo !== false}
                onChange={e => setForm({ ...form, activo: e.target.checked })}
                style={{ accentColor: BASE.gold, width: '16px', height: '16px' }} />
              <span style={{ fontSize: '12.5px', color: BASE.text, fontWeight: '700' }}>
                Frente activo (los frentes inactivos se ocultan en filtros)
              </span>
            </label>
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
      {label && <label style={lblS}>{label.toUpperCase()}</label>}
      {children}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const btnAct = (color) => ({
  padding: '6px 12px', borderRadius: '7px', background: color, color: '#fff',
  border: 'none', fontSize: '10.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
});
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: `0 4px 12px ${BASE.navy}66` };
