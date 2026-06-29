// src/views/modulos/proyectos/ProyectosListView.jsx — Listado de proyectos (B23)

import React, { useState, useMemo } from 'react';
import { deleteDoc, doc, collection, query, where, getDocs, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../contexts/NotificationContext';
import EmptyState from '../../../components/EmptyState';
import Modal from '../../../components/Modal';

const ESTADOS = {
  planificado:  { l: 'Planificado',   c: '#2563eb', i: '📅' },
  en_ejecucion: { l: 'En ejecución',  c: '#f59e0b', i: '🟡' },
  suspendido:   { l: 'Suspendido',    c: '#dc2626', i: '⏸️' },
  completado:   { l: 'Terminado',     c: '#16a34a', i: '✅' },
  cancelado:    { l: 'Cancelado',     c: '#64748b', i: '❌' },
};

const TIPOS = {
  edificacion: '🏢', hidraulica: '💧', vial: '🛣️',
  mineria: '⛏️', industrial: '🏭', otro: '🔧',
};

const fmtSoles = (n, mon = 'PEN') => {
  if (n == null || isNaN(n)) return '—';
  const sym = mon === 'USD' ? '$ ' : 'S/. ';
  return sym + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function ProyectosListView({ onEdit, onNuevo, showToast }) {
  const { proyectos, frentes, setProyectoActivoId, loadingProyectos } = useProyectoActivo();
  const { rol } = useAuth();
  const confirmar = useConfirm();
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [frenteEditando, setFrenteEditando] = useState(null);

  const frentesPorProy = useMemo(() => {
    const m = new Map();
    for (const f of frentes) {
      if (!f.proyectoId) continue;
      const arr = m.get(f.proyectoId) || [];
      arr.push(f);
      m.set(f.proyectoId, arr);
    }
    return m;
  }, [frentes]);

  const filtrados = useMemo(() => proyectos.filter(p => {
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (busqueda) {
      const b = busqueda.toLowerCase();
      return (p.codigo || '').toLowerCase().includes(b) ||
             (p.nombre || '').toLowerCase().includes(b) ||
             (p.cliente || '').toLowerCase().includes(b) ||
             (p.ubicacion?.ciudad || '').toLowerCase().includes(b);
    }
    return true;
  }), [proyectos, filtroEstado, busqueda]);

  const seleccionar = (id) => {
    setProyectoActivoId(id);
    showToast?.('✅ Proyecto seleccionado · contexto cambiado', 'success');
  };

  const eliminar = async (proy) => {
    if (proy.esDefault) {
      showToast?.('No puedes eliminar el proyecto default', 'error');
      return;
    }
    const ok = await confirmar({
      tono: 'peligro',
      icono: '🗑️',
      titulo: `¿Eliminar proyecto "${proy.nombre}"?`,
      mensaje: 'Esto también eliminará sus frentes.',
      detalle: 'Los datos asociados (Plan Maestro, Tareos, etc.) NO se borran pero quedarán huérfanos.',
      textoConfirmar: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      // Borrar todos los frentes del proyecto
      const fSnap = await getDocs(query(collection(db, 'Frentes'), where('proyectoId', '==', proy.id)));
      const batch = writeBatch(db);
      fSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      // Borrar el proyecto
      await deleteDoc(doc(db, 'Proyectos', proy.id));
      showToast?.(`🗑️ Proyecto "${proy.nombre}" eliminado`, 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  if (loadingProyectos) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando proyectos...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Cartera de Proyectos</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {proyectos.length} proyectos · {frentes.length} frentes totales
            </p>
          </div>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar..." aria-label="Buscar proyecto" style={{ ...inpS, minWidth: '180px' }} />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...selS, minWidth: '160px' }}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, e]) => <option key={k} value={k}>{e.i} {e.l}</option>)}
          </select>
          {(rol === 'admin' || rol === 'ingeniero') && (
            <button onClick={onNuevo} style={btnPrimario}>➕ NUEVO PROYECTO</button>
          )}
        </div>
      </div>

      {frenteEditando && (
        <ModalEditarFrente
          frente={frenteEditando}
          proyectos={proyectos}
          onClose={() => setFrenteEditando(null)}
          showToast={showToast}
        />
      )}

      {filtrados.length === 0 ? (
        <EmptyState icono="🌎" titulo="Sin proyectos"
          descripcion="Crea tu primer proyecto. Puedes tener múltiples obras simultáneas, cada una con sus frentes." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '14px' }}>
          {filtrados.map(p => {
            const frentesProy = frentesPorProy.get(p.id) || [];
            const estadoData = ESTADOS[p.estado] || ESTADOS.planificado;
            const ubic = p.ubicacion || {};
            return (
              <div key={p.id} style={{
                background: BASE.white, border: `1px solid ${BASE.border}`,
                borderLeft: `5px solid ${p.color || BASE.navy}`,
                borderRadius: '14px', padding: '18px 22px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: '900', color: p.color || BASE.navy, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {TIPOS[p.tipoObra] || '🔧'} {p.codigo}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy, marginTop: '4px', lineHeight: 1.3 }}>
                      {p.nombre}
                    </p>
                    <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '3px' }}>
                      🏢 {p.cliente || '—'}
                    </p>
                  </div>
                  <span style={{
                    background: estadoData.c + '22', color: estadoData.c,
                    padding: '4px 10px', borderRadius: '10px',
                    fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                    flexShrink: 0,
                  }}>{estadoData.i} {estadoData.l.toUpperCase()}</span>
                </div>

                {/* Ubicación */}
                <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '8px' }}>
                  📍 {ubic.ciudad || '—'}{ubic.region ? ', ' + ubic.region : ''}
                </p>

                {/* Avance */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>
                      AVANCE FÍSICO
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: p.color || BASE.navy }}>
                      {Math.round(Number(p.avancePctActual || 0))}%
                    </span>
                  </div>
                  <div style={{ background: BASE.bgSoft, height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      background: p.color || BASE.navy,
                      height: '100%', width: `${Math.min(100, p.avancePctActual || 0)}%`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Datos clave */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))', gap: '8px', marginTop: '12px' }}>
                  <Mini label="Presupuesto" valor={fmtSoles(p.presupuestoContractual, p.moneda)} color={BASE.navy} />
                  <Mini label="CPI" valor={Number(p.cpiActual || 1).toFixed(2)}
                    color={p.cpiActual >= 0.95 ? '#16a34a' : p.cpiActual >= 0.85 ? '#f59e0b' : '#dc2626'} />
                  <Mini label="Frentes" valor={frentesProy.length} color={BASE.navy} />
                </div>

                {/* Frentes — click para editar/mover */}
                {frentesProy.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>
                      📍 FRENTES ({frentesProy.length}) — {(rol === 'admin') ? 'click para editar' : 'solo lectura'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {frentesProy.map(f => (
                        <button key={f.id}
                          onClick={(e) => { e.stopPropagation(); if (rol === 'admin') setFrenteEditando(f); }}
                          disabled={rol !== 'admin'}
                          style={{
                            background: (f.color || BASE.navy) + '18',
                            color: f.color || BASE.navy,
                            border: `1px solid ${(f.color || BASE.navy)}55`,
                            padding: '4px 9px', borderRadius: '8px',
                            fontSize: '10.5px', fontWeight: '800',
                            cursor: rol === 'admin' ? 'pointer' : 'default',
                            fontFamily: 'monospace',
                          }}
                          title={rol === 'admin' ? 'Click para editar o mover de proyecto' : f.nombre}>
                          {f.codigo} · {f.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <button onClick={() => seleccionar(p.id)} style={btnAct(BASE.gold)}>
                    📍 Activar
                  </button>
                  {(rol === 'admin' || rol === 'ingeniero') && (
                    <>
                      <button onClick={() => onEdit?.(p)} style={btnAct(BASE.navy)}>
                        ✏️ Editar
                      </button>
                      {!p.esDefault && rol === 'admin' && (
                        <button onClick={() => eliminar(p)} style={btnAct(BASE.red)}>×</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, valor, color }) {
  return (
    <div style={{
      background: color + '12', border: `1px solid ${color}33`,
      borderRadius: '8px', padding: '8px 10px',
    }}>
      <p style={{ fontSize: '8.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: '13px', fontWeight: '900', color, marginTop: '2px', fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}

const inpS = { padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnPrimario = { padding: '10px 18px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: `0 4px 12px ${BASE.gold}55` };
const btnAct = (color) => ({
  padding: '6px 12px', borderRadius: '7px', background: color, color: '#fff',
  border: 'none', fontSize: '10.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
});

// ════════════════════════════════════════════════════════════════
// MODAL: Editar frente (cambiar nombre/codigo/color, MOVER a otro proyecto, eliminar)
// ════════════════════════════════════════════════════════════════
function ModalEditarFrente({ frente, proyectos, onClose, showToast }) {
  const confirmar = useConfirm();
  const [codigo, setCodigo]   = useState(frente.codigo || '');
  const [nombre, setNombre]   = useState(frente.nombre || '');
  const [color, setColor]     = useState(frente.color || '#1e3a5f');
  const [proyectoId, setProyectoId] = useState(frente.proyectoId || '');
  const [guardando, setGuardando] = useState(false);

  const proyectoActual = proyectos.find(p => p.id === frente.proyectoId);
  const proyectoNuevo  = proyectos.find(p => p.id === proyectoId);
  const moviendo = proyectoId && proyectoId !== frente.proyectoId;

  const submit = async () => {
    if (!codigo || !nombre || !proyectoId) {
      showToast?.('Código, nombre y proyecto son obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'Frentes', frente.id), {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        color: color || null,
        proyectoId,
        actualizadoEn: serverTimestamp(),
      });
      showToast?.(moviendo
        ? `✅ Frente movido a "${proyectoNuevo?.nombre || proyectoId}"`
        : '✅ Frente actualizado', 'success');
      onClose();
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    const ok = await confirmar({
      tono: 'peligro',
      icono: '🗑️',
      titulo: `¿Eliminar frente "${frente.codigo} · ${frente.nombre}"?`,
      detalle: 'Los registros asociados quedarán huérfanos.',
      textoConfirmar: 'Sí, eliminar',
    });
    if (!ok) return;
    setGuardando(true);
    try {
      await deleteDoc(doc(db, 'Frentes', frente.id));
      showToast?.('🗑️ Frente eliminado', 'success');
      onClose();
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Editar frente ${frente.codigo}`} maxW="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
        <p style={{ fontSize: '11px', color: BASE.muted }}>
          Proyecto actual: <strong style={{ color: BASE.navy }}>{proyectoActual?.nombre || frente.proyectoId || '—'}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
          <Campo label="Código">
            <input value={codigo} onChange={e => setCodigo(e.target.value)} style={inpModal} placeholder="F-01" />
          </Campo>
          <Campo label="Nombre">
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={inpModal} placeholder="Frente Estructuras" />
          </Campo>
        </div>

        <Campo label="Color del frente">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['#1e3a5f','#7c3aed','#ec4899','#0d9488','#16a34a','#f59e0b','#dc2626','#2563eb','#6366f1'].map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: 6, background: c,
                border: color === c ? '3px solid #111' : '1px solid #ccc',
                cursor: 'pointer',
              }} />
            ))}
          </div>
        </Campo>

        <Campo label="Proyecto al que pertenece (puedes mover)">
          <select value={proyectoId} onChange={e => setProyectoId(e.target.value)} style={inpModal}>
            <option value="">— Selecciona —</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}{p.ubicacion?.ciudad ? ' · ' + p.ubicacion.ciudad : ''}{p.id === frente.proyectoId ? ' (actual)' : ''}
              </option>
            ))}
          </select>
          {moviendo && (
            <p style={{ fontSize: '10.5px', color: '#92400e', background: '#fef3c7',
              border: '1px solid #f59e0b', borderRadius: 6, padding: '6px 8px', marginTop: 6 }}>
              ⚠️ El frente será movido de <strong>{proyectoActual?.nombre}</strong> a <strong>{proyectoNuevo?.nombre}</strong>
            </p>
          )}
        </Campo>

        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button onClick={submit} disabled={guardando} style={{
            flex: 1, padding: '12px', background: guardando ? '#94a3b8' : BASE.navy,
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          }}>{guardando ? 'GUARDANDO...' : '💾 GUARDAR'}</button>
          <button onClick={eliminar} disabled={guardando} style={{
            padding: '12px 14px', background: '#fee2e2', color: BASE.red,
            border: 'none', borderRadius: '8px',
            fontSize: '11px', fontWeight: '800', cursor: 'pointer',
          }}>🗑️ Eliminar</button>
          <button onClick={onClose} style={{
            padding: '12px 18px', background: BASE.bgSoft, color: BASE.muted,
            border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          }}>Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

const inpModal = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '600',
  background: '#fff', cursor: 'pointer', fontFamily: BASE.font,
};
