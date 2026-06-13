// src/views/ingeniero/BIM.jsx
// Módulo BIM — IMPLEMENTADO con 3 usos (tabs): Costo (incluye metrado) ·
// Sectorización (zonas 3D) · Plazos 4D, vía los módulos Nexus (BimNexusModulos)
// + visor 3D embebido (BimViewerAPS, Autodesk Platform Services) + carga de
// modelos (BimUploader). Cada Nexus maneja el caso "sin modelos/sin partes" con guía.
//
// Datos en Firestore: colecciones `BIM_Vinculos`, `BIM_Modelos`, `LPS_Plazos`.
//   BIM_Vinculos: { id, partida, subpartida, actividad, bimGuids: [string], comentario, fechas }

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { BASE, inp } from '../utils/styles';
import { CATALOGO_MASTER } from '../utils/constants';
import {
  BIM_ESTADO_VINCULO, calcularKPIBim, bimVinculoId, validarBimGuid,
} from '../utils/helpers';
import Modal from '../components/Modal';
import BimUploader, { ESPECIALIDADES } from './BimUploader';
import BimViewerAPS from './BimViewerAPS';
import { CostoNexus, SectorizacionNexus, PlazosNexus } from './BimNexusModulos';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';

export default function BIM({ historialEnriquecido = [], showToast }) {
  const [tab, setTab] = useState('costo');  // costo | sectorizacion | plazos
  const [urnSeleccionado, setUrnSeleccionado] = useState('');
  // Federación: lista de URNs cargados simultáneamente en el visor
  const [urnsFederacion, setUrnsFederacion] = useState([]);
  // Lista de modelos disponibles (BIM_Modelos status=success) para el selector de federación
  const [modelosDisponibles, setModelosDisponibles] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'BIM_Modelos'), orderBy('subidoEn', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setModelosDisponibles(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.urn && (m.traduccionStatus === 'success' || m.traduccionStatus === 'inprogress'))
      );
    });
    return () => unsub();
  }, []);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);
  const [vinculos, setVinculos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado del modal de vinculación
  const [modalVinculo, setModalVinculo] = useState(null);
  const [formVin, setFormVin] = useState({
    partida: '', subpartida: '', actividad: '',
    bimGuids: [], guidNuevo: '', comentario: '',
  });

  // Filtros tabla
  const [fPartida, setFPartida] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [busq, setBusq] = useState('');

  // ── CARGAR VÍNCULOS ──
  // Filtra por proyecto/frente activo: cada proyecto tiene sus propios modelos BIM y vínculos
  const { filtrarPorContexto } = useProyectoActivo();
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'BIM_Vinculos'), orderBy('actualizadoEn', 'desc'));
    const unsub = onSnapshot(q,
      snap => {
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setVinculos(filtrarPorContexto(todos));
        setLoading(false);
      },
      err => { console.error('[BIM]', err); setLoading(false); }
    );
    return () => unsub();
  }, [filtrarPorContexto]);

  // ── ESTADÍSTICAS ──
  const totalActividades = useMemo(() => {
    let n = 0;
    Object.values(CATALOGO_MASTER || {}).forEach(sub => {
      Object.values(sub).forEach(actArr => { n += actArr.length; });
    });
    return n;
  }, []);
  const kpi = useMemo(() => calcularKPIBim(vinculos, totalActividades), [vinculos, totalActividades]);

  // ── FILTRADO ──
  const vinculosFiltrados = useMemo(() => {
    return vinculos.filter(v => {
      if (fPartida && v.partida !== fPartida) return false;
      const cantGuids = (v.bimGuids || []).length;
      if (fEstado === 'vinculado' && cantGuids === 0) return false;
      if (fEstado === 'sin_vincular' && cantGuids > 0) return false;
      if (busq) {
        const q = busq.toLowerCase();
        const txt = `${v.partida || ''} ${v.subpartida || ''} ${v.actividad || ''} ${(v.bimGuids || []).join(' ')}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [vinculos, fPartida, fEstado, busq]);

  // ── GUARDAR VÍNCULO ──
  const guardarVinculo = async () => {
    if (!formVin.partida || !formVin.subpartida || !formVin.actividad) {
      showToast?.('Completa partida, subpartida y actividad', 'warning');
      return;
    }
    const payload = {
      partida: formVin.partida,
      subpartida: formVin.subpartida,
      actividad: formVin.actividad,
      bimGuids: formVin.bimGuids,
      comentario: formVin.comentario || '',
      actualizadoEn: new Date(),
    };
    try {
      if (modalVinculo === 'editar' && formVin._id) {
        await updateDoc(doc(db, 'BIM_Vinculos', formVin._id), payload);
        showToast?.('✏️ Vínculo BIM actualizado', 'success');
      } else {
        await addDoc(collection(db, 'BIM_Vinculos'), { ...payload, creadoEn: new Date() });
        showToast?.('✅ Vínculo BIM creado', 'success');
      }
      cerrarModal();
    } catch (err) {
      showToast?.(`Error: ${err.message}`, 'error');
    }
  };

  // ── ELIMINAR VÍNCULO ──
  const eliminarVinculo = async (v) => {
    if (!window.confirm(`Eliminar vínculo:\n${v.actividad}\nGUIDs: ${(v.bimGuids || []).length}`)) return;
    try {
      await deleteDoc(doc(db, 'BIM_Vinculos', v.id));
      showToast?.('🗑️ Vínculo eliminado', 'info');
    } catch (err) {
      showToast?.(`Error: ${err.message}`, 'error');
    }
  };

  // ── HELPERS MODAL ──
  const abrirNuevo = () => {
    setFormVin({ partida: '', subpartida: '', actividad: '', bimGuids: [], guidNuevo: '', comentario: '' });
    setModalVinculo('nuevo');
  };
  const abrirEditar = (v) => {
    setFormVin({
      _id: v.id,
      partida: v.partida || '', subpartida: v.subpartida || '', actividad: v.actividad || '',
      bimGuids: v.bimGuids || [], guidNuevo: '', comentario: v.comentario || '',
    });
    setModalVinculo('editar');
  };
  const cerrarModal = () => { setModalVinculo(null); setFormVin({ partida: '', subpartida: '', actividad: '', bimGuids: [], guidNuevo: '', comentario: '' }); };

  const agregarGuid = () => {
    const g = formVin.guidNuevo.trim();
    if (!g) return;
    if (!validarBimGuid(g)) { showToast?.('GUID inválido (solo alfanumérico, guiones, $)', 'warning'); return; }
    if (formVin.bimGuids.includes(g)) { showToast?.('Este GUID ya está agregado', 'warning'); return; }
    setFormVin({ ...formVin, bimGuids: [...formVin.bimGuids, g], guidNuevo: '' });
  };
  const quitarGuid = (g) => setFormVin({ ...formVin, bimGuids: formVin.bimGuids.filter(x => x !== g) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header BIM — compacto */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        borderRadius: '12px',
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '12px 18px', color: '#fff',
        display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap',
        boxShadow: BASE.shadowMd,
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '900' }}>Módulo BIM</h2>
        <p style={{ fontSize: '11px', opacity: 0.85 }}>
          3 usos: <strong>Costo</strong> (incluye metrado) · <strong>Sectorización</strong> · <strong>Plazos (4D)</strong>
        </p>
      </div>

      {/* Tabs principales */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { id: 'costo',         l: '💰 Costo (incluye metrado)' },
          { id: 'sectorizacion', l: '🧱 Sectorización (zonas 3D)' },
          { id: 'plazos',        l: '📅 Plazos (4D)' },
        ].map(t => {
          const activo = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px',
              background: activo ? `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})` : BASE.bgSoft,
              color: activo ? '#fff' : BASE.muted,
              border: 'none', borderRadius: '8px',
              fontSize: '12px', fontWeight: '800', cursor: 'pointer',
              boxShadow: activo ? `0 4px 12px ${BASE.gold}55` : 'none',
            }}>{t.l}</button>
          );
        })}
      </div>

      {/* === 1 · COSTO (incluye metrado) === */}
      {tab === 'costo' && (
        <CostoNexus modelosDisponibles={modelosDisponibles} showToast={showToast} />
      )}

      {/* === 2 · SECTORIZACIÓN (zonas 3D) === */}
      {tab === 'sectorizacion' && (
        <SectorizacionNexus modelosDisponibles={modelosDisponibles} showToast={showToast} />
      )}

      {/* === 3 · PLAZOS (4D) === */}
      {tab === 'plazos' && (
        <PlazosNexus modelosDisponibles={modelosDisponibles} showToast={showToast} />
      )}

    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: Panel lateral con detalle del elemento clickeado en el visor.
// Cruza el externalId (GUID Revit) con los vínculos GRAPCO para mostrar
// la actividad asociada y datos operativos.
// ════════════════════════════════════════════════════════════════
function PanelElementoBIM({ elemento, vinculos, onCerrar }) {
  const guid = elemento?.externalId;
  // Buscar vínculo GRAPCO que contenga este GUID
  const vinculo = (vinculos || []).find(v => (v.bimGuids || []).includes(guid));
  // Top 8 propiedades más relevantes (filtra ruido)
  const propsRelevantes = (elemento?.properties || [])
    .filter(p => p.displayValue !== '' && p.displayValue != null && !p.hidden)
    .slice(0, 8);

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '16px 18px',
      maxHeight: '700px', overflowY: 'auto',
      position: 'sticky', top: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '0.6px' }}>
            ELEMENTO BIM SELECCIONADO
          </p>
          <h4 style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, marginTop: '4px', lineHeight: 1.3 }}>
            {elemento?.name || 'Sin nombre'}
          </h4>
        </div>
        <button onClick={onCerrar} style={{
          padding: '4px 8px', background: BASE.bgSoft, color: BASE.muted,
          border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
        }}>✕</button>
      </div>

      <div style={{ background: BASE.bgSoft, padding: '8px 10px', borderRadius: '6px', fontSize: '10px', fontFamily: 'monospace', color: BASE.muted, marginBottom: '12px', wordBreak: 'break-all' }}>
        <strong style={{ color: BASE.navy }}>GUID:</strong> {guid || '—'}
      </div>

      {/* Vínculo GRAPCO */}
      {vinculo ? (
        <div style={{ background: BASE.greenLight, border: `1px solid ${BASE.green}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.greenDark, letterSpacing: '0.5px', marginBottom: '6px' }}>
            ✅ VINCULADO A GRAPCO
          </p>
          <p style={{ fontSize: '12px', fontWeight: '800', color: BASE.navy, marginBottom: '4px' }}>
            {vinculo.actividad}
          </p>
          <p style={{ fontSize: '10px', color: BASE.muted }}>
            {vinculo.partida} · {vinculo.subpartida}
          </p>
          {vinculo.comentario && (
            <p style={{ fontSize: '10px', color: BASE.text, fontStyle: 'italic', marginTop: '6px' }}>
              💬 {vinculo.comentario}
            </p>
          )}
        </div>
      ) : (
        <div style={{ background: BASE.goldLight, border: `1px solid ${BASE.gold}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.goldDark, letterSpacing: '0.5px', marginBottom: '6px' }}>
            ⚠️ SIN VINCULAR
          </p>
          <p style={{ fontSize: '11px', color: BASE.text }}>
            Este elemento no tiene actividad GRAPCO asociada. Crea un vínculo en Fase 1 usando el GUID de arriba.
          </p>
        </div>
      )}

      {/* Propiedades del modelo */}
      {propsRelevantes.length > 0 && (
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '8px' }}>
            📐 PROPIEDADES DEL MODELO
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {propsRelevantes.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: BASE.bgSoft, borderRadius: '6px', fontSize: '10px' }}>
                <span style={{ color: BASE.muted, fontWeight: '700' }}>{p.displayName}</span>
                <span style={{ color: BASE.text, fontWeight: '800', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.displayValue}>
                  {String(p.displayValue).slice(0, 30)}{String(p.displayValue).length > 30 ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
