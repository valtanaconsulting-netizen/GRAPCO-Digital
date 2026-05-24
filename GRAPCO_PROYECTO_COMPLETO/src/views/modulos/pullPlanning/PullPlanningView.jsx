// src/views/modulos/pullPlanning/PullPlanningView.jsx — Phase Pull Planning LCI (B25)
//
// METODOLOGÍA: Pull Planning (Last Planner System fase 2 — Phase Planning)
// El equipo de obra define HITOS finales (milestones), y desde ahí
// "tiran hacia atrás" las actividades necesarias para llegar (reverse scheduling).
// Cada actividad tiene predecesoras (lo que debe estar listo antes).
// El resultado es un plan de FASE (4-12 semanas) muy realista y colaborativo.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import EmptyState from '../../../components/EmptyState';
import Modal from '../../../components/Modal';

const TIPOS_HITO = {
  contractual:  { l: 'Contractual',  c: '#dc2626', i: '📜', desc: 'Fecha del contrato — no negociable' },
  fase:         { l: 'Fase',         c: '#7c3aed', i: '🏗️', desc: 'Fin de una fase mayor' },
  intermedio:   { l: 'Intermedio',   c: '#0d9488', i: '🎯', desc: 'Hito acordado por el equipo' },
};

const COLOR_TAREAS = ['#1e3a5f', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#6366f1', '#ec4899', '#15803d'];

export default function PullPlanningView({ showToast }) {
  const { user, rol } = useAuth();
  const { proyectoActivo, frentesDelProyecto } = useProyectoActivo();
  const [hitos, setHitos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoHito, setEditandoHito] = useState(null);
  const [editandoTarea, setEditandoTarea] = useState(null);
  const [hitoSeleccionado, setHitoSeleccionado] = useState(null);

  useEffect(() => {
    if (!proyectoActivo) { setLoading(false); return; }
    let pending = 2;
    const dec = () => { pending -= 1; if (pending <= 0) setLoading(false); };

    const unsubH = onSnapshot(query(collection(db, 'PullPlanningHitos'),
      where('proyectoId', '==', proyectoActivo.id)),
      (snap) => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => {
          const fa = a.fechaHito?.toDate?.() || new Date(a.fechaHito || 0);
          const fb = b.fechaHito?.toDate?.() || new Date(b.fechaHito || 0);
          return fa - fb;
        });
        setHitos(arr); dec();
      },
      (e) => { console.warn(e); dec(); });

    const unsubT = onSnapshot(query(collection(db, 'PullPlanningTareas'),
      where('proyectoId', '==', proyectoActivo.id)),
      (snap) => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => (a.diasAntesDelHito || 0) - (b.diasAntesDelHito || 0));
        setTareas(arr); dec();
      },
      (e) => { console.warn(e); dec(); });

    return () => { unsubH(); unsubT(); };
  }, [proyectoActivo]);

  const tareasPorHito = useMemo(() => {
    const m = new Map();
    for (const t of tareas) {
      const arr = m.get(t.hitoId) || [];
      arr.push(t);
      m.set(t.hitoId, arr);
    }
    return m;
  }, [tareas]);

  // Para una tarea, calcular fecha programada = fecha hito - diasAntesDelHito
  const fechaTarea = (tarea, hito) => {
    if (!hito?.fechaHito || tarea.diasAntesDelHito == null) return null;
    const fH = hito.fechaHito.toDate ? hito.fechaHito.toDate() : new Date(hito.fechaHito);
    return new Date(fH.getTime() - tarea.diasAntesDelHito * 24 * 60 * 60 * 1000);
  };

  const guardarHito = async (data) => {
    try {
      const payload = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || '',
        tipo: data.tipo || 'intermedio',
        fechaHito: data.fechaHito ? new Date(data.fechaHito) : null,
        proyectoId: proyectoActivo.id,
        frenteId: data.frenteId || null,
        responsable: data.responsable?.trim() || '',
        cumplido: data.cumplido || false,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editandoHito === 'NUEVO') {
        payload.creadoEn = serverTimestamp();
        payload.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, 'PullPlanningHitos'), payload);
        showToast?.('🎯 Hito creado', 'success');
      } else {
        await updateDoc(doc(db, 'PullPlanningHitos', editandoHito.id), payload);
        showToast?.('✅ Hito actualizado', 'success');
      }
      setEditandoHito(null);
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const eliminarHito = async (h) => {
    if (!confirm(`¿Eliminar hito "${h.nombre}"? También se eliminarán las ${tareasPorHito.get(h.id)?.length || 0} tareas asociadas.`)) return;
    try {
      const tareasH = tareasPorHito.get(h.id) || [];
      for (const t of tareasH) await deleteDoc(doc(db, 'PullPlanningTareas', t.id));
      await deleteDoc(doc(db, 'PullPlanningHitos', h.id));
      showToast?.('🗑️ Hito eliminado', 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const guardarTarea = async (data) => {
    try {
      const payload = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || '',
        hitoId: data.hitoId || hitoSeleccionado?.id,
        proyectoId: proyectoActivo.id,
        diasAntesDelHito: parseInt(data.diasAntesDelHito) || 0,
        duracionDias: parseInt(data.duracionDias) || 1,
        responsableEmpresa: data.responsableEmpresa?.trim() || '',
        cuadrilla: data.cuadrilla?.trim() || '',
        prerequisitos: data.prerequisitos?.trim() || '',
        color: data.color || COLOR_TAREAS[0],
        completada: data.completada || false,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editandoTarea === 'NUEVA') {
        payload.creadoEn = serverTimestamp();
        payload.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, 'PullPlanningTareas'), payload);
        showToast?.('📌 Tarea agregada', 'success');
      } else {
        await updateDoc(doc(db, 'PullPlanningTareas', editandoTarea.id), payload);
        showToast?.('✅ Tarea actualizada', 'success');
      }
      setEditandoTarea(null);
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const eliminarTarea = async (t) => {
    if (!confirm(`¿Eliminar tarea "${t.nombre}"?`)) return;
    try { await deleteDoc(doc(db, 'PullPlanningTareas', t.id)); showToast?.('🗑️ Tarea eliminada', 'success'); }
    catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const toggleCumplido = async (h) => {
    try { await updateDoc(doc(db, 'PullPlanningHitos', h.id), { cumplido: !h.cumplido, cumplidoEn: !h.cumplido ? serverTimestamp() : null }); }
    catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const toggleTareaCompleta = async (t) => {
    try { await updateDoc(doc(db, 'PullPlanningTareas', t.id), { completada: !t.completada, completadaEn: !t.completada ? serverTimestamp() : null }); }
    catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  if (!proyectoActivo) {
    return <EmptyState icono="🌎" titulo="Sin proyecto activo" descripcion="Selecciona un proyecto para hacer Pull Planning." />;
  }

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando hitos...</p>;

  const puedeEditar = rol === 'admin' || rol === 'ingeniero';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
        borderRadius: '14px', padding: '20px 26px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          🎯 LAST PLANNER FASE 2 · PHASE PULL PLANNING
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
          Reverse Scheduling Colaborativo
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
          Define hitos (milestones) y "jala" hacia atrás las tareas necesarias. Esta es la sesión LCI donde el equipo se compromete colaborativamente con los hitos del proyecto.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>🎯 Hitos del proyecto</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {hitos.length} hitos · {tareas.length} tareas pull · {hitos.filter(h => h.cumplido).length} hitos cumplidos
            </p>
          </div>
          {puedeEditar && (
            <button onClick={() => setEditandoHito('NUEVO')} style={btnPrim}>
              ➕ NUEVO HITO
            </button>
          )}
        </div>
      </div>

      {/* Hitos como columnas Kanban */}
      {hitos.length === 0 ? (
        <EmptyState icono="🎯" titulo="Sin hitos definidos"
          descripcion="Crea el primer hito del proyecto. Por ejemplo: 'Fin de estructuras', 'Entrega obra gruesa', 'Recepción final del cliente'." />
      ) : (
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {hitos.map(h => {
            const tipoH = TIPOS_HITO[h.tipo] || TIPOS_HITO.intermedio;
            const tareasH = tareasPorHito.get(h.id) || [];
            const completadas = tareasH.filter(t => t.completada).length;
            const fechaH = h.fechaHito?.toDate?.() || new Date(h.fechaHito || 0);
            const diasFaltan = Math.round((fechaH - new Date()) / (1000 * 60 * 60 * 24));

            return (
              <div key={h.id} style={{
                minWidth: '320px', maxWidth: '340px',
                background: BASE.white,
                border: `1.5px solid ${tipoH.c}33`,
                borderRadius: '14px',
                display: 'flex', flexDirection: 'column',
                opacity: h.cumplido ? 0.65 : 1,
              }}>
                {/* Header del hito */}
                <div style={{
                  padding: '14px 18px',
                  background: `linear-gradient(135deg, ${tipoH.c}, ${tipoH.c}dd)`,
                  color: '#fff',
                  borderRadius: '13px 13px 0 0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px', opacity: 0.92 }}>
                      {tipoH.i} {tipoH.l.toUpperCase()}
                    </span>
                    {h.cumplido && <span style={{
                      background: 'rgba(255,255,255,0.25)', padding: '3px 8px', borderRadius: '6px',
                      fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                    }}>✓ CUMPLIDO</span>}
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '900', lineHeight: 1.3 }}>{h.nombre}</p>
                  {h.fechaHito && (
                    <p style={{ fontSize: '11px', opacity: 0.92, marginTop: '4px' }}>
                      📅 {fechaH.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {!h.cumplido && (
                        <span style={{ marginLeft: '8px', fontWeight: '900' }}>
                          {diasFaltan > 0 ? `· faltan ${diasFaltan} días` : `· VENCIDO ${Math.abs(diasFaltan)} días`}
                        </span>
                      )}
                    </p>
                  )}
                  <p style={{ fontSize: '10.5px', opacity: 0.85, marginTop: '4px' }}>
                    👤 {h.responsable || 'Sin responsable'}
                  </p>
                  {/* Progress bar */}
                  {tareasH.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9.5px', fontWeight: '900', opacity: 0.9 }}>PROGRESO TAREAS</span>
                        <span style={{ fontSize: '10px', fontWeight: '900' }}>{completadas}/{tareasH.length}</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.25)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          background: '#fff', height: '100%',
                          width: `${tareasH.length > 0 ? (completadas / tareasH.length) * 100 : 0}%`,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tareas pull */}
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {tareasH.length === 0 ? (
                    <p style={{ fontSize: '11px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic', padding: '12px' }}>
                      Sin tareas. Agrega tareas que deben completarse antes del hito.
                    </p>
                  ) : (
                    tareasH.map(t => {
                      const fT = fechaTarea(t, h);
                      return (
                        <div key={t.id} style={{
                          background: t.completada ? '#dcfce7' : BASE.white,
                          border: `1px solid ${BASE.border}`,
                          borderLeft: `4px solid ${t.color || BASE.navy}`,
                          borderRadius: '8px', padding: '10px 12px',
                          opacity: t.completada ? 0.7 : 1,
                          textDecoration: t.completada ? 'line-through' : 'none',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '12.5px', fontWeight: '900', color: BASE.text }}>
                                {t.nombre}
                              </p>
                              <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '4px' }}>
                                ⏰ {t.diasAntesDelHito} días antes · ⏱️ {t.duracionDias} días duración
                              </p>
                              {fT && (
                                <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
                                  📅 Inicio: {fT.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                </p>
                              )}
                              {t.responsableEmpresa && (
                                <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
                                  👥 {t.responsableEmpresa}
                                </p>
                              )}
                              {t.prerequisitos && (
                                <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
                                  📋 Prerequisitos: {t.prerequisitos}
                                </p>
                              )}
                            </div>
                            <input type="checkbox" checked={t.completada || false}
                              onChange={() => toggleTareaCompleta(t)}
                              style={{ accentColor: '#16a34a', width: '16px', height: '16px', cursor: 'pointer', marginTop: '2px' }} />
                          </div>
                          {puedeEditar && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                              <button onClick={() => setEditandoTarea(t)} style={btnXS}>✏️</button>
                              <button onClick={() => eliminarTarea(t)} style={{ ...btnXS, color: '#991b1b' }}>×</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {puedeEditar && (
                    <button onClick={() => { setHitoSeleccionado(h); setEditandoTarea('NUEVA'); }} style={{
                      padding: '10px',
                      background: tipoH.c + '15', color: tipoH.c,
                      border: `2px dashed ${tipoH.c}`,
                      borderRadius: '8px',
                      fontSize: '11px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
                    }}>
                      ➕ Tirar tarea
                    </button>
                  )}
                </div>

                {/* Footer del hito */}
                {puedeEditar && (
                  <div style={{ padding: '10px 12px', borderTop: `1px solid ${BASE.border}`, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleCumplido(h)} style={{
                      ...btnXS,
                      background: h.cumplido ? '#fef3c7' : '#dcfce7',
                      color: h.cumplido ? BASE.goldDark : '#15803d',
                    }}>
                      {h.cumplido ? '↺ Reabrir' : '✓ Cumplir'}
                    </button>
                    <button onClick={() => setEditandoHito(h)} style={btnXS}>✏️ Editar</button>
                    <button onClick={() => eliminarHito(h)} style={{ ...btnXS, color: '#991b1b' }}>🗑️</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Hito */}
      {editandoHito && (
        <Modal onClose={() => setEditandoHito(null)}>
          <HitoForm hito={editandoHito === 'NUEVO' ? null : editandoHito}
            frentesDelProyecto={frentesDelProyecto}
            onSave={guardarHito}
            onCancel={() => setEditandoHito(null)} />
        </Modal>
      )}

      {/* Modal Tarea */}
      {editandoTarea && (
        <Modal onClose={() => setEditandoTarea(null)}>
          <TareaForm tarea={editandoTarea === 'NUEVA' ? null : editandoTarea}
            hito={hitoSeleccionado || hitos.find(h => h.id === editandoTarea?.hitoId)}
            onSave={guardarTarea}
            onCancel={() => setEditandoTarea(null)} />
        </Modal>
      )}
    </div>
  );
}

function HitoForm({ hito, frentesDelProyecto, onSave, onCancel }) {
  const [form, setForm] = useState({
    nombre: hito?.nombre || '',
    descripcion: hito?.descripcion || '',
    tipo: hito?.tipo || 'intermedio',
    fechaHito: hito?.fechaHito ? (hito.fechaHito.toDate?.() || new Date(hito.fechaHito)).toISOString().split('T')[0] : '',
    frenteId: hito?.frenteId || '',
    responsable: hito?.responsable || '',
  });

  return (
    <div>
      <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
        {hito ? '✏️ Editar Hito' : '🎯 Nuevo Hito'}
      </h3>

      <Field label="Nombre del hito *">
        <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Fin de estructuras edificio A" style={inpS} />
      </Field>

      <Field label="Tipo de hito">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(TIPOS_HITO).map(([k, t]) => {
            const sel = form.tipo === k;
            return (
              <button key={k} type="button" onClick={() => setForm({ ...form, tipo: k })} style={{
                flex: '1 1 100px',
                padding: '10px',
                background: sel ? `linear-gradient(135deg, ${t.c}, ${t.c}dd)` : BASE.bgSoft,
                color: sel ? '#fff' : BASE.text,
                border: sel ? 'none' : `1.5px solid ${BASE.border}`,
                borderRadius: '8px',
                fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                textAlign: 'left',
              }}>
                <p>{t.i} {t.l}</p>
                <p style={{ fontSize: '9.5px', fontWeight: '600', marginTop: '2px', opacity: sel ? 0.92 : 0.7 }}>{t.desc}</p>
              </button>
            );
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Field label="Fecha del hito *">
          <input type="date" value={form.fechaHito} onChange={e => setForm({ ...form, fechaHito: e.target.value })} style={inpS} />
        </Field>
        <Field label="Frente (opcional)">
          <select value={form.frenteId} onChange={e => setForm({ ...form, frenteId: e.target.value })} style={selS}>
            <option value="">— general del proyecto —</option>
            {frentesDelProyecto.map(f => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Responsable">
        <input type="text" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })}
          placeholder="Ing. Juan Pérez" style={inpS} />
      </Field>

      <Field label="Descripción">
        <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
          rows={2} placeholder="Detalle del hito..."
          style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
      </Field>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={onCancel} style={btnSec}>Cancelar</button>
        <button onClick={() => {
          if (!form.nombre || !form.fechaHito) { alert('Nombre y fecha obligatorios'); return; }
          onSave(form);
        }} style={btnSave}>💾 GUARDAR HITO</button>
      </div>
    </div>
  );
}

function TareaForm({ tarea, hito, onSave, onCancel }) {
  const [form, setForm] = useState({
    nombre: tarea?.nombre || '',
    descripcion: tarea?.descripcion || '',
    diasAntesDelHito: tarea?.diasAntesDelHito || 7,
    duracionDias: tarea?.duracionDias || 1,
    responsableEmpresa: tarea?.responsableEmpresa || '',
    cuadrilla: tarea?.cuadrilla || '',
    prerequisitos: tarea?.prerequisitos || '',
    color: tarea?.color || COLOR_TAREAS[0],
    hitoId: tarea?.hitoId || hito?.id,
  });

  return (
    <div>
      <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '6px' }}>
        {tarea ? '✏️ Editar Tarea' : '📌 Tirar Tarea (Pull)'}
      </h3>
      {hito && (
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px' }}>
          🎯 Para hito: <strong style={{ color: BASE.navy }}>{hito.nombre}</strong>
        </p>
      )}

      <Field label="Nombre de la tarea *">
        <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Vaciado de losa techo edificio A" style={inpS} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Field label="Días ANTES del hito *" hint="Cuántos días antes debe ESTAR LISTA">
          <input type="number" min="0" value={form.diasAntesDelHito} onChange={e => setForm({ ...form, diasAntesDelHito: e.target.value })} style={inpS} />
        </Field>
        <Field label="Duración (días)">
          <input type="number" min="1" value={form.duracionDias} onChange={e => setForm({ ...form, duracionDias: e.target.value })} style={inpS} />
        </Field>
      </div>

      <Field label="Responsable / Subcontratista">
        <input type="text" value={form.responsableEmpresa} onChange={e => setForm({ ...form, responsableEmpresa: e.target.value })}
          placeholder="GRAPCO / Cuadrilla 2 / Subcon X" style={inpS} />
      </Field>

      <Field label="Prerequisitos (qué debe estar listo antes)">
        <textarea value={form.prerequisitos} onChange={e => setForm({ ...form, prerequisitos: e.target.value })}
          rows={2} placeholder="Ej: Encofrado terminado, acero verificado, materiales en obra"
          style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
      </Field>

      <Field label="Color">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {COLOR_TAREAS.map(c => (
            <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
              width: '28px', height: '28px', background: c, borderRadius: '50%',
              border: form.color === c ? `3px solid ${BASE.gold}` : '2px solid #fff',
              cursor: 'pointer',
            }} />
          ))}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={onCancel} style={btnSec}>Cancelar</button>
        <button onClick={() => {
          if (!form.nombre) { alert('Nombre obligatorio'); return; }
          onSave(form);
        }} style={btnSave}>💾 GUARDAR TAREA</button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
      {hint && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '3px', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnXS = { padding: '4px 10px', borderRadius: '5px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`, color: BASE.text, fontSize: '10px', fontWeight: '900', cursor: 'pointer' };
const btnPrim = { padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' };
const btnSec = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' };
