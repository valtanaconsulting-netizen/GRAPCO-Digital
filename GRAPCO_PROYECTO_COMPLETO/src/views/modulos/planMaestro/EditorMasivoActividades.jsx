// src/views/modulos/planMaestro/EditorMasivoActividades.jsx — CRUD masivo estilo Excel (B24)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, where, writeBatch, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { fmtSoles, fmtNumero } from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

const UNIDADES = ['', 'm3', 'm2', 'ml', 'kg', 'tn', 'und', 'glb', 'pza', 'par', 'jgo', 'pto'];

export default function EditorMasivoActividades({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivo, frentesDelProyecto, frenteActivoId, modoTodosFrentes } = useProyectoActivo();
  const [actividadesDB, setActividadesDB] = useState([]);
  const [edits, setEdits] = useState(new Map());      // id → cambios pendientes
  const [nuevas, setNuevas] = useState([]);            // filas recién agregadas
  const [eliminadas, setEliminadas] = useState(new Set()); // ids marcados para eliminar
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtroFrente, setFiltroFrente] = useState(modoTodosFrentes ? '' : (frenteActivoId || ''));

  const filtrosLimitan = !!proyectoActivo;

  useEffect(() => {
    if (!proyectoActivo) { setLoading(false); return; }
    const q = query(collection(db, 'PlanMaestro'), where('proyectoId', '==', proyectoActivo.id));
    const unsub = onSnapshot(q,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true }));
        setActividadesDB(list);
        setLoading(false);
      },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, [proyectoActivo]);

  // Filtrar por frente seleccionado
  const visibles = useMemo(() => {
    if (!filtroFrente) return actividadesDB;
    return actividadesDB.filter(a => a.frenteId === filtroFrente);
  }, [actividadesDB, filtroFrente]);

  // Aplicar edits sobre las visibles
  const filasMostradas = useMemo(() => {
    return visibles.map(a => {
      const edit = edits.get(a.id);
      return edit ? { ...a, ...edit, _modificada: true } : a;
    });
  }, [visibles, edits]);

  const updEdit = (id, field, value) => {
    const nuevo = new Map(edits);
    const actual = nuevo.get(id) || {};
    nuevo.set(id, { ...actual, [field]: value });
    setEdits(nuevo);
  };

  const updNueva = (idx, field, value) => {
    const arr = [...nuevas];
    arr[idx] = { ...arr[idx], [field]: value };
    setNuevas(arr);
  };

  const agregarFila = () => {
    setNuevas([...nuevas, {
      _temp: true,
      codigo: '',
      descripcion: '',
      unidad: '',
      metradoContractual: 0,
      precioUnitario: 0,
      hhTotalPresupuestado: 0,
      estado: 'no_iniciada',
      proyectoId: proyectoActivo?.id,
      frenteId: filtroFrente || frentesDelProyecto[0]?.id || null,
    }]);
  };

  const quitarFilaNueva = (idx) => {
    setNuevas(nuevas.filter((_, i) => i !== idx));
  };

  const toggleEliminar = (id) => {
    const ne = new Set(eliminadas);
    if (ne.has(id)) ne.delete(id); else ne.add(id);
    setEliminadas(ne);
  };

  const cambiosPendientes = edits.size + nuevas.length + eliminadas.size;

  const guardarTodo = async () => {
    if (cambiosPendientes === 0) {
      showToast?.('No hay cambios pendientes', 'info');
      return;
    }
    setGuardando(true);
    try {
      const batches = [];
      let currentBatch = writeBatch(db);
      let opsInBatch = 0;
      const flush = () => { if (opsInBatch > 0) { batches.push(currentBatch); currentBatch = writeBatch(db); opsInBatch = 0; } };
      const op = () => { opsInBatch += 1; if (opsInBatch >= 400) flush(); };

      // 1. Updates
      for (const [id, cambios] of edits.entries()) {
        if (eliminadas.has(id)) continue; // si va a eliminarse, ignorar update
        const ref = doc(db, 'PlanMaestro', id);
        const data = {
          ...cambios,
          metradoContractual: parseFloat(cambios.metradoContractual ?? actividadesDB.find(a => a.id === id)?.metradoContractual) || 0,
          precioUnitario: parseFloat(cambios.precioUnitario ?? actividadesDB.find(a => a.id === id)?.precioUnitario) || 0,
          hhTotalPresupuestado: parseFloat(cambios.hhTotalPresupuestado ?? actividadesDB.find(a => a.id === id)?.hhTotalPresupuestado) || 0,
          actualizadoEn: serverTimestamp(),
          actualizadoPor: user?.email || 'desconocido',
        };
        currentBatch.update(ref, data);
        op();
      }

      // 2. Inserts
      for (const n of nuevas) {
        if (!n.codigo || !n.descripcion) continue; // skip filas vacías
        const ref = doc(collection(db, 'PlanMaestro'));
        currentBatch.set(ref, {
          codigo: n.codigo.trim(),
          descripcion: n.descripcion.trim(),
          unidad: n.unidad || null,
          metradoContractual: parseFloat(n.metradoContractual) || 0,
          precioUnitario: parseFloat(n.precioUnitario) || 0,
          hhTotalPresupuestado: parseFloat(n.hhTotalPresupuestado) || 0,
          estado: n.estado || 'no_iniciada',
          proyectoId: n.proyectoId || proyectoActivo?.id,
          frenteId: n.frenteId,
          avanceMetradoAcum: 0,
          hhAcumReal: 0,
          costoRealAcum: 0,
          predecesoras: [],
          creadoEn: serverTimestamp(),
          creadoPor: user?.email || 'desconocido',
        });
        op();
      }

      // 3. Deletes
      for (const id of eliminadas) {
        currentBatch.delete(doc(db, 'PlanMaestro', id));
        op();
      }

      flush();
      for (const b of batches) await b.commit();

      showToast?.(`✅ Guardado · ${edits.size} editadas, ${nuevas.length} nuevas, ${eliminadas.size} eliminadas`, 'success');
      setEdits(new Map());
      setNuevas([]);
      setEliminadas(new Set());
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const descartar = () => {
    if (cambiosPendientes === 0) return;
    if (!confirm(`¿Descartar ${cambiosPendientes} cambios pendientes?`)) return;
    setEdits(new Map());
    setNuevas([]);
    setEliminadas(new Set());
  };

  // Total presupuesto en pantalla
  const totalPresupuesto = useMemo(() => {
    return filasMostradas.reduce((s, a) => {
      if (eliminadas.has(a.id)) return s;
      return s + (parseFloat(a.metradoContractual) || 0) * (parseFloat(a.precioUnitario) || 0);
    }, 0) + nuevas.reduce((s, n) => s + (parseFloat(n.metradoContractual) || 0) * (parseFloat(n.precioUnitario) || 0), 0);
  }, [filasMostradas, nuevas, eliminadas]);

  if (!proyectoActivo) {
    return <EmptyState icono="🌎" titulo="Sin proyecto activo" descripcion="Selecciona un proyecto para editar su Plan Maestro." />;
  }

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando actividades...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Toolbar */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Editor Masivo (estilo Excel)</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {filasMostradas.length} actividades visibles · Total: <strong style={{ color: BASE.navy }}>{fmtSoles(totalPresupuesto)}</strong>
            </p>
          </div>

          <select value={filtroFrente} onChange={e => setFiltroFrente(e.target.value)} style={{ ...selS, minWidth: '180px' }}>
            <option value="">Todos los frentes</option>
            {frentesDelProyecto.map(f => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
          </select>

          <button onClick={agregarFila} style={btnAdd}>➕ Agregar fila</button>

          {cambiosPendientes > 0 && (
            <>
              <span style={{
                background: '#fef3c7', color: BASE.goldDark,
                padding: '6px 12px', borderRadius: '8px',
                fontSize: '11px', fontWeight: '900', letterSpacing: '0.4px',
                border: '1.5px solid #f59e0b55',
              }}>
                ⚠️ {cambiosPendientes} cambios pendientes
              </span>
              <button onClick={descartar} style={btnDesc}>↺ Descartar</button>
              <button onClick={guardarTodo} disabled={guardando} style={btnSave}>
                {guardando ? '⏳ Guardando...' : `💾 GUARDAR ${cambiosPendientes}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabla editable */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '1100px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={{ ...th, width: '40px' }}></th>
                <th style={{ ...th, width: '120px' }}>Código *</th>
                <th style={th}>Descripción *</th>
                <th style={{ ...th, width: '70px' }}>Frente</th>
                <th style={{ ...th, width: '70px', textAlign: 'center' }}>Und</th>
                <th style={{ ...th, width: '110px', textAlign: 'right' }}>Metrado</th>
                <th style={{ ...th, width: '110px', textAlign: 'right' }}>P.U.</th>
                <th style={{ ...th, width: '120px', textAlign: 'right' }}>Subtotal</th>
                <th style={{ ...th, width: '90px', textAlign: 'right' }}>HH</th>
                <th style={{ ...th, width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {/* Filas existentes */}
              {filasMostradas.map((a) => {
                const m = parseFloat(a.metradoContractual) || 0;
                const p = parseFloat(a.precioUnitario) || 0;
                const sub = m * p;
                const eliminar = eliminadas.has(a.id);
                const modificada = a._modificada;
                const frente = frentesDelProyecto.find(f => f.id === a.frenteId);
                return (
                  <tr key={a.id} style={{
                    background: eliminar ? '#fee2e2' : modificada ? '#fef3c7' : BASE.white,
                    borderBottom: `1px solid ${BASE.border}`,
                    textDecoration: eliminar ? 'line-through' : 'none',
                    opacity: eliminar ? 0.6 : 1,
                  }}>
                    <td style={tdCell}>
                      <input type="checkbox" checked={eliminar}
                        onChange={() => toggleEliminar(a.id)}
                        style={{ accentColor: BASE.red, cursor: 'pointer' }} />
                    </td>
                    <td style={tdCell}>
                      <input value={a.codigo || ''} onChange={e => updEdit(a.id, 'codigo', e.target.value)}
                        style={inpCell} disabled={eliminar} />
                    </td>
                    <td style={tdCell}>
                      <input value={a.descripcion || ''} onChange={e => updEdit(a.id, 'descripcion', e.target.value)}
                        style={inpCell} disabled={eliminar} />
                    </td>
                    <td style={tdCell}>
                      <span style={{
                        background: frente?.color + '22' || BASE.bgSoft,
                        color: frente?.color || BASE.muted,
                        padding: '2px 6px', borderRadius: '5px',
                        fontSize: '10px', fontWeight: '900', fontFamily: 'monospace',
                      }}>{frente?.codigo || '—'}</span>
                    </td>
                    <td style={tdCell}>
                      <select value={a.unidad || ''} onChange={e => updEdit(a.id, 'unidad', e.target.value)}
                        style={{ ...inpCell, fontFamily: 'monospace', textAlign: 'center' }} disabled={eliminar}>
                        {UNIDADES.map(u => <option key={u} value={u}>{u || '—'}</option>)}
                      </select>
                    </td>
                    <td style={tdCell}>
                      <input type="number" step="0.01" value={a.metradoContractual ?? 0}
                        onChange={e => updEdit(a.id, 'metradoContractual', e.target.value)}
                        style={{ ...inpCell, textAlign: 'right', fontFamily: 'monospace' }} disabled={eliminar} />
                    </td>
                    <td style={tdCell}>
                      <input type="number" step="0.01" value={a.precioUnitario ?? 0}
                        onChange={e => updEdit(a.id, 'precioUnitario', e.target.value)}
                        style={{ ...inpCell, textAlign: 'right', fontFamily: 'monospace' }} disabled={eliminar} />
                    </td>
                    <td style={{ ...tdCell, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.navy, padding: '4px 10px' }}>
                      {sub > 0 ? fmtSoles(sub) : ''}
                    </td>
                    <td style={tdCell}>
                      <input type="number" step="0.1" value={a.hhTotalPresupuestado ?? 0}
                        onChange={e => updEdit(a.id, 'hhTotalPresupuestado', e.target.value)}
                        style={{ ...inpCell, textAlign: 'right', fontFamily: 'monospace' }} disabled={eliminar} />
                    </td>
                    <td style={{ ...tdCell, textAlign: 'center', padding: '4px' }}>
                      {modificada && !eliminar && <span style={{ color: BASE.gold, fontWeight: '900' }}>✏️</span>}
                    </td>
                  </tr>
                );
              })}

              {/* Filas nuevas */}
              {nuevas.map((n, i) => (
                <tr key={`new-${i}`} style={{ background: '#dcfce7', borderBottom: `1px solid ${BASE.border}` }}>
                  <td style={{ ...tdCell, color: BASE.green, fontWeight: '900', textAlign: 'center', padding: '4px' }}>+</td>
                  <td style={tdCell}>
                    <input value={n.codigo} onChange={e => updNueva(i, 'codigo', e.target.value)}
                      placeholder="02.01.001" style={inpCell} />
                  </td>
                  <td style={tdCell}>
                    <input value={n.descripcion} onChange={e => updNueva(i, 'descripcion', e.target.value)}
                      placeholder="Descripción..." style={inpCell} />
                  </td>
                  <td style={tdCell}>
                    <select value={n.frenteId || ''} onChange={e => updNueva(i, 'frenteId', e.target.value)} style={{ ...inpCell, fontFamily: 'monospace' }}>
                      {frentesDelProyecto.map(f => <option key={f.id} value={f.id}>{f.codigo}</option>)}
                    </select>
                  </td>
                  <td style={tdCell}>
                    <select value={n.unidad} onChange={e => updNueva(i, 'unidad', e.target.value)} style={{ ...inpCell, fontFamily: 'monospace', textAlign: 'center' }}>
                      {UNIDADES.map(u => <option key={u} value={u}>{u || '—'}</option>)}
                    </select>
                  </td>
                  <td style={tdCell}>
                    <input type="number" step="0.01" value={n.metradoContractual}
                      onChange={e => updNueva(i, 'metradoContractual', e.target.value)}
                      style={{ ...inpCell, textAlign: 'right', fontFamily: 'monospace' }} />
                  </td>
                  <td style={tdCell}>
                    <input type="number" step="0.01" value={n.precioUnitario}
                      onChange={e => updNueva(i, 'precioUnitario', e.target.value)}
                      style={{ ...inpCell, textAlign: 'right', fontFamily: 'monospace' }} />
                  </td>
                  <td style={{ ...tdCell, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.green, padding: '4px 10px' }}>
                    {((parseFloat(n.metradoContractual) || 0) * (parseFloat(n.precioUnitario) || 0)) > 0
                      ? fmtSoles((parseFloat(n.metradoContractual) || 0) * (parseFloat(n.precioUnitario) || 0))
                      : ''}
                  </td>
                  <td style={tdCell}>
                    <input type="number" step="0.1" value={n.hhTotalPresupuestado}
                      onChange={e => updNueva(i, 'hhTotalPresupuestado', e.target.value)}
                      style={{ ...inpCell, textAlign: 'right', fontFamily: 'monospace' }} />
                  </td>
                  <td style={{ ...tdCell, textAlign: 'center', padding: '4px' }}>
                    <button onClick={() => quitarFilaNueva(i)} style={{
                      width: '24px', height: '24px', borderRadius: '4px',
                      background: '#fee2e2', color: '#991b1b', border: 'none',
                      fontSize: '14px', fontWeight: '900', cursor: 'pointer',
                    }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filasMostradas.length === 0 && nuevas.length === 0 && (
        <EmptyState icono="📝" titulo="Sin actividades" descripcion="Usa el wizard de plantillas o agrega filas manualmente." />
      )}
    </div>
  );
}

const inpS = { padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const inpCell = { width: '100%', padding: '5px 8px', borderRadius: '4px', border: `1px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: '600', background: '#fff', outline: 'none' };
const tdCell = { padding: '4px 6px', verticalAlign: 'middle' };
const th = { padding: '10px 8px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const btnAdd = { padding: '8px 14px', borderRadius: '8px', background: BASE.navy, color: '#fff', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px' };
const btnSave = { padding: '9px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', fontSize: '11.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' };
const btnDesc = { padding: '8px 14px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: `1.5px solid ${BASE.border}`, fontSize: '11px', fontWeight: '900', cursor: 'pointer' };
