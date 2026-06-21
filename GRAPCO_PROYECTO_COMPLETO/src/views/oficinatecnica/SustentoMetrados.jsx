// src/views/oficinatecnica/SustentoMetrados.jsx
// Sustento gráfico de metrados para Valorizaciones GRAPCO.
// Replica la estructura del Drive: "Sustento Metrados → 1.Concreto, 2.Encofrado,
// 3.Acero, 4.Acarreo con Camión Grúa, 5.Cordón Bentonítico, 6.Nave Industrial..."
// Cada entrada vincula una partida + valorización (PQ-XX) con fotos de campo.

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import FotoUploader from '../../components/FotoUploader';
import PlanillaMetrado, { TIPOS_METRADO, parcialFila } from './PlanillaMetrado';
import PlantillaCalzadura from './PlantillaCalzadura';

const PARTIDAS_DEFAULT = [
  '1. Concreto',
  '2. Encofrado',
  '3. Acero',
  '4. Acarreo con Camión Grúa',
  '5. Cordón Bentonítico',
  '6. Nave Industrial',
  '7. Demolición',
  '8. Eliminación de desmonte',
];

// Título y orden de la "carpeta" a partir del PQ-XX de la valorización.
const labelVal = (ref) => {
  if (!ref) return { titulo: 'Sin valorización asignada', sub: '', orden: 9999 };
  const m = String(ref).match(/(\d+)/);
  const num = m ? parseInt(m[1], 10) : null;
  return { titulo: num != null ? `Sustento de Valorización N°${num}` : String(ref), sub: String(ref), orden: num != null ? num : 9998 };
};

const FORM_INICIAL = {
  partida: PARTIDAS_DEFAULT[0],
  codigoPartida: '',          // código WBS (1001-1018) para alimentar la valorización
  valorizacionRef: '',
  periodoMes: new Date().toISOString().slice(0, 7),
  tipoMetrado: 'concreto',    // concreto | acero | encofrado | eliminacion | …
  detalleMetrado: [],         // filas de la planilla de cómputo
  metaMetrado: {},            // extras del cálculo (ej. factorEsponjamiento)
  metrado: 0,                 // total calculado por la planilla
  unidad: 'm3',
  descripcion: '',
  ubicacion: '',
  fotos: [],
};

export default function SustentoMetrados({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId } = useProyectoActivo();
  const [items, setItems] = useState([]);
  const [valorizaciones, setValorizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [filtroPartida, setFiltroPartida] = useState('todas');
  const [verDetalle, setVerDetalle] = useState(null);
  const [plantillaAbierta, setPlantillaAbierta] = useState(false);
  const [colapsados, setColapsados] = useState({});   // carpetas de valorización plegadas
  const [aEliminar, setAEliminar] = useState(null);   // sustento pendiente de confirmar borrado

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'SustentoMetrados'), orderBy('creadoEn', 'desc')),
        (snap) => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (err) => { console.warn('[Sustento]', err.message); setLoading(false); }),
      onSnapshot(collection(db, 'ValorizacionesContractuales'),
        (snap) => setValorizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const filtrados = useMemo(() => {
    if (filtroPartida === 'todas') return items;
    return items.filter(it => it.partida === filtroPartida);
  }, [items, filtroPartida]);

  const partidasDisponibles = useMemo(() => {
    const fromItems = items.map(i => i.partida).filter(Boolean);
    return [...new Set([...PARTIDAS_DEFAULT, ...fromItems])];
  }, [items]);

  // Agrupa los sustentos en CARPETAS por valorización (PQ-01, PQ-02, …) y los
  // ordena ascendente; "sin valorización" va al final.
  const grupos = useMemo(() => {
    const map = new Map();
    filtrados.forEach(it => { const k = it.valorizacionRef || '__sin__'; if (!map.has(k)) map.set(k, []); map.get(k).push(it); });
    return [...map.entries()]
      .map(([k, lista]) => ({ key: k, ref: k === '__sin__' ? '' : k, lista, fotos: lista.reduce((a, x) => a + (x.fotos?.length || 0), 0) }))
      .sort((a, b) => labelVal(a.ref).orden - labelVal(b.ref).orden);
  }, [filtrados]);

  const toggleGrupo = (k) => setColapsados(s => ({ ...s, [k]: !s[k] }));

  const abrirNuevo = () => { setEditando(null); setForm(FORM_INICIAL); setModalAbierto(true); };
  const abrirEdicion = (it) => {
    setEditando(it);
    setForm({
      partida: it.partida || PARTIDAS_DEFAULT[0],
      codigoPartida: it.codigoPartida || '',
      valorizacionRef: it.valorizacionRef || '',
      periodoMes: it.periodoMes || new Date().toISOString().slice(0, 7),
      tipoMetrado: it.tipoMetrado || 'concreto',
      detalleMetrado: it.detalleMetrado || [],
      metaMetrado: it.metaMetrado || {},
      metrado: it.metrado || 0,
      unidad: it.unidad || 'm3',
      descripcion: it.descripcion || '',
      ubicacion: it.ubicacion || '',
      fotos: it.fotos || [],
    });
    setModalAbierto(true);
  };
  const cerrar = () => { setModalAbierto(false); setEditando(null); setForm(FORM_INICIAL); };

  const guardar = async () => {
    if (!form.partida || !form.descripcion) {
      showToast?.('Completa partida y descripción', 'error');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        proyectoId: proyectoActivoId || null,   // aislamiento por proyecto
        metrado: Number(form.metrado) || 0,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando) {
        await updateDoc(doc(db, 'SustentoMetrados', editando.id), payload);
        showToast?.('Sustento actualizado', 'success');
      } else {
        await addDoc(collection(db, 'SustentoMetrados'), {
          ...payload, creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido',
        });
        showToast?.('Sustento creado', 'success');
      }
      cerrar();
    } catch (e) {
      showToast?.('Error al guardar: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Borrado con confirmación CENTRADA (ConfirmModal), nunca window.confirm.
  const eliminarConfirmado = async () => {
    const it = aEliminar; if (!it) return;
    try {
      await deleteDoc(doc(db, 'SustentoMetrados', it.id));
      showToast?.('Sustento eliminado', 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setAEliminar(null);
    }
  };

  // Crea por lote los sustentos generados desde una plantilla (ej. Calzadura).
  const generarDesdePlantilla = async (payloads) => {
    if (!Array.isArray(payloads) || !payloads.length) return;
    try {
      for (const p of payloads) {
        await addDoc(collection(db, 'SustentoMetrados'), {
          ...p,
          proyectoId: proyectoActivoId || null,
          metrado: Number(p.metrado) || 0,
          creadoEn: serverTimestamp(),
          creadoPor: user?.email || 'desconocido',
          actualizadoEn: serverTimestamp(),
          actualizadoPor: user?.email || 'desconocido',
        });
      }
      setPlantillaAbierta(false);
      showToast?.(`${payloads.length} sustento(s) creados desde plantilla`, 'success');
    } catch (e) {
      showToast?.('Error al generar: ' + e.message, 'error');
    }
  };

  const imprimirInforme = () => {
    window.print();
  };

  if (loading) {
    return <p style={{ color: BASE.muted, fontSize: '12px', padding: '20px' }}>Cargando sustento…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Cabecera + acciones */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            SUSTENTO DE METRADOS
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Vincula cada partida valorizada con su evidencia fotográfica de campo. Por partida y por valorización (PQ-XX).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={filtroPartida} onChange={(e) => setFiltroPartida(e.target.value)} style={{
            padding: '8px 12px', border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '12px', fontFamily: BASE.font, background: '#fff',
          }}>
            <option value="todas">Todas las partidas</option>
            {partidasDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => setPlantillaAbierta(true)} style={{
            background: BASE.white, color: BASE.navy, border: `1.5px solid ${BASE.gold}`,
            padding: '10px 16px', borderRadius: '10px', fontWeight: 800, fontSize: '12px',
            cursor: 'pointer',
          }}>📋 Desde plantilla</button>
          <button onClick={imprimirInforme} style={{
            background: BASE.navy, color: '#fff', border: 'none',
            padding: '10px 16px', borderRadius: '10px', fontWeight: 800, fontSize: '12px',
            cursor: 'pointer',
          }}>🖨️ Imprimir informe</button>
          <button onClick={abrirNuevo} style={{
            background: BASE.gold, color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: '10px', fontWeight: 800, fontSize: '12px',
            cursor: 'pointer', boxShadow: `0 4px 14px ${BASE.gold}55`,
          }}>+ Nuevo sustento</button>
        </div>
      </div>

      {/* CARPETAS por valorización (PQ-01, PQ-02, …) → tarjetas compactas */}
      {!filtrados.length ? (
        <EmptyState
          icono="📸"
          titulo="Sin sustento aún"
          descripcion='Crea un sustento por partida (Concreto, Encofrado, Acero…) con fotos de campo y descripción del trabajo realizado.'
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {grupos.map(g => {
            const meta = labelVal(g.ref);
            const abierto = !colapsados[g.key];
            return (
              <div key={g.key} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(15,23,42,0.04)' }}>
                {/* Cabecera de la carpeta */}
                <button type="button" onClick={() => toggleGrupo(g.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                  background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none',
                }}>
                  <span style={{ fontSize: '18px', transform: abierto ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>▾</span>
                  <span style={{ fontSize: '20px' }}>📁</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 900, letterSpacing: '0.2px' }}>{meta.titulo}</span>
                    {meta.sub && <span style={{ display: 'block', fontSize: '10px', color: BASE.gold, fontWeight: 700, letterSpacing: '0.5px' }}>{meta.sub}</span>}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(255,255,255,0.14)', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {g.lista.length} sustento{g.lista.length === 1 ? '' : 's'} · 📷 {g.fotos}
                  </span>
                </button>

                {/* Tarjetas compactas de la carpeta */}
                {abierto && (
                  <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {g.lista.map(it => (
                      <div key={it.id} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '11px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div onClick={() => it.fotos?.length && setVerDetalle(it)} style={{ height: '108px', background: BASE.bgSoft, position: 'relative', overflow: 'hidden', cursor: it.fotos?.length ? 'pointer' : 'default' }}>
                          {it.fotos?.length > 0 ? (
                            <img src={it.fotos[0].url} alt={it.partida} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BASE.muted, fontSize: '10.5px' }}>Sin fotos</div>
                          )}
                          {it.fotos?.length > 0 && (
                            <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 7px', borderRadius: '999px', fontSize: '9.5px', fontWeight: 700 }}>📷 {it.fotos.length}</span>
                          )}
                        </div>
                        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.partida}</p>
                          <p style={{ fontSize: '11.5px', fontWeight: 800, color: BASE.green, fontFamily: 'var(--grapco-font-mono, monospace)' }}>
                            {Number(it.metrado).toLocaleString('es-PE')} {it.unidad}
                            {it.codigoPartida && <span style={{ color: BASE.muted, fontWeight: 600, marginLeft: 6 }}>· {it.codigoPartida}</span>}
                          </p>
                          <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                            <button onClick={() => setVerDetalle(it)} style={btnSm(BASE.navyLight)}>Ver</button>
                            <button onClick={() => abrirEdicion(it)} style={btnSm(BASE.gold)}>Editar</button>
                            <button onClick={() => setAEliminar(it)}    style={btnSm(BASE.red)}>✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmación CENTRADA de borrado (reemplaza window.confirm) */}
      <ConfirmModal
        abierto={!!aEliminar}
        tono="peligro"
        icono="🗑️"
        titulo="¿Eliminar este sustento?"
        mensaje={aEliminar ? `${aEliminar.partida}` : ''}
        detalle={aEliminar ? `${aEliminar.valorizacionRef || 'Sin valorización'} · ${Number(aEliminar.metrado).toLocaleString('es-PE')} ${aEliminar.unidad} · ${(aEliminar.fotos?.length || 0)} foto(s). Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
        onConfirmar={eliminarConfirmado}
        onCancelar={() => setAEliminar(null)}
      />

      {/* Modal generador desde plantilla (Calzadura) */}
      {plantillaAbierta && (
        <Modal onClose={() => setPlantillaAbierta(false)} title="Generar sustento desde plantilla · Calzadura" maxW="820px">
          <PlantillaCalzadura
            valorizaciones={valorizaciones}
            onGenerar={generarDesdePlantilla}
            onClose={() => setPlantillaAbierta(false)}
          />
        </Modal>
      )}

      {/* Modal crear/editar */}
      {modalAbierto && (
        <Modal onClose={cerrar} title={editando ? 'Editar sustento' : 'Nuevo sustento de metrado'} maxW="760px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Campo label="Partida *">
              <input list="partidas-list" type="text" value={form.partida}
                onChange={(e) => setForm({ ...form, partida: e.target.value })} style={inp()} placeholder="1. Concreto" />
              <datalist id="partidas-list">
                {partidasDisponibles.map(p => <option key={p} value={p} />)}
              </datalist>
            </Campo>
            <Campo label="Periodo (mes)">
              <input type="month" value={form.periodoMes} onChange={(e) => setForm({ ...form, periodoMes: e.target.value })} style={inp()} />
            </Campo>
            <Campo label="Valorización (PQ-XX)">
              <select value={form.valorizacionRef} onChange={(e) => setForm({ ...form, valorizacionRef: e.target.value })} style={inp()}>
                <option value="">Sin asociar</option>
                {valorizaciones.map(v => (
                  <option key={v.id} value={`PQ-${String(v.numeroValorizacion || '').padStart(2, '0')}`}>
                    PQ-{String(v.numeroValorizacion || '').padStart(2, '0')} · {v.estado || 'borrador'}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Ubicación / Frente">
              <input type="text" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} style={inp()} placeholder="F1+F2 - PTARI" />
            </Campo>
            <Campo label="Código partida (valorización)">
              <input type="text" value={form.codigoPartida} onChange={(e) => setForm({ ...form, codigoPartida: e.target.value })} style={inp()} placeholder="Ej. 1005 (alimenta la valorización)" />
            </Campo>
          </div>

          {/* PLANILLA DE CÓMPUTO DE METRADOS — calcula el total por elemento */}
          <div style={{ marginTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.5px', marginBottom: '8px' }}>
              📐 PLANILLA DE METRADOS · {TIPOS_METRADO[form.tipoMetrado]?.label}
            </p>
            <PlanillaMetrado
              tipo={form.tipoMetrado}
              unidad={form.unidad}
              detalle={form.detalleMetrado}
              meta={form.metaMetrado}
              onChange={({ tipo, unidad, detalle, total, meta }) =>
                setForm((f) => ({ ...f, tipoMetrado: tipo, unidad, detalleMetrado: detalle, metaMetrado: meta || {}, metrado: total }))}
            />
          </div>

          <div style={{ marginTop: '14px' }}>
            <Campo label="Descripción del trabajo *">
              <textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                style={{ ...inp(), resize: 'vertical' }}
                placeholder="Ej: Vaciado de concreto en zapatas Z-1 a Z-12, fc=210 kg/cm². Bombeado, vibrado y curado conforme al protocolo CAL-FOR-003." />
            </Campo>
          </div>

          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, marginBottom: '6px', letterSpacing: '0.4px' }}>
              FOTOS DE CAMPO ({form.fotos.length})
            </p>
            <FotoUploader
              fotos={form.fotos}
              onChange={(fotos) => setForm({ ...form, fotos })}
              ruta={`Sustento/${form.partida.replace(/[^\w]/g, '_')}/${form.periodoMes}`}
              max={20}
              showToast={showToast}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button onClick={cerrar} disabled={guardando} style={btnLg(BASE.muted)}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnLg(BASE.navy)}>
              {guardando ? 'Guardando…' : (editando ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal detalle */}
      {verDetalle && (
        <Modal onClose={() => setVerDetalle(null)} title={`${verDetalle.partida} · ${verDetalle.periodoMes}`} maxW="900px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Info label="Valorización" value={verDetalle.valorizacionRef || '—'} />
              <Info label="Metrado" value={`${Number(verDetalle.metrado).toLocaleString('es-PE')} ${verDetalle.unidad}`} />
              <Info label="Código partida" value={verDetalle.codigoPartida || '—'} />
            </div>

            {/* Desglose de la planilla de metrados (read-only) */}
            {Array.isArray(verDetalle.detalleMetrado) && verDetalle.detalleMetrado.length > 0 && (
              <div>
                <p style={{ fontSize: '10.5px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', marginBottom: '4px' }}>
                  PLANILLA · {TIPOS_METRADO[verDetalle.tipoMetrado || 'concreto']?.label?.toUpperCase()} ({verDetalle.unidad})
                </p>
                <div style={{ overflowX: 'auto', border: `1px solid ${BASE.border}`, borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: 320 }}>
                    <thead><tr style={{ background: BASE.bgSoft }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9.5px', fontWeight: 900, color: BASE.muted }}>ELEMENTO</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '9.5px', fontWeight: 900, color: BASE.muted }}>PARCIAL</th>
                    </tr></thead>
                    <tbody>
                      {verDetalle.detalleMetrado.map((r, i) => (
                        <tr key={r.id || i} style={{ borderTop: `1px solid ${BASE.border}` }}>
                          <td style={{ padding: '5px 8px', color: BASE.navy }}>{r.descripcion || (r.nGuia ? `Guía ${r.nGuia}${r.placa ? ' · ' + r.placa : ''}` : `Ítem ${i + 1}`)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: BASE.text }}>
                            {parcialFila(verDetalle.tipoMetrado || 'concreto', r).toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background: BASE.goldSoft }}>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 900, color: BASE.navy }}>TOTAL</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.goldDark }}>
                        {Number(verDetalle.metrado).toLocaleString('es-PE', { maximumFractionDigits: 3 })} {verDetalle.unidad}
                      </td>
                    </tr></tfoot>
                  </table>
                </div>
              </div>
            )}
            <div>
              <p style={{ fontSize: '10.5px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', marginBottom: '4px' }}>DESCRIPCIÓN</p>
              <p style={{ fontSize: '12.5px', color: BASE.navy, lineHeight: 1.5, background: BASE.bgSoft, padding: '10px', borderRadius: '8px' }}>
                {verDetalle.descripcion || '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10.5px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', marginBottom: '6px' }}>
                FOTOS DE CAMPO ({verDetalle.fotos?.length || 0})
              </p>
              {verDetalle.fotos?.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px',
                }}>
                  {verDetalle.fotos.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{
                      display: 'block', aspectRatio: '4/3',
                      borderRadius: '8px', overflow: 'hidden',
                      border: `1px solid ${BASE.border}`,
                    }}>
                      <img src={f.url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '11px', color: BASE.muted }}>Sin fotos.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>{label}</label>
      {children}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ background: BASE.bgSoft, padding: '8px 10px', borderRadius: '8px' }}>
      <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px' }}>{label}</p>
      <p style={{ fontSize: '12.5px', fontWeight: 700, color: BASE.navy }}>{value}</p>
    </div>
  );
}

const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
const btnSm = (c) => ({ background: c, color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', flex: 1 });
const btnLg = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
