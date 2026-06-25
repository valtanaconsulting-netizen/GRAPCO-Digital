// src/components/BimUploader.jsx
// Componente UI para subir modelos Revit/IFC/DWG a Autodesk Platform Services.
// Maneja: drag&drop, validación, barra de progreso de subida, polling de traducción.

import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { BASE, CHART, CHART_PALETTE } from '../utils/styles';
import { subirModeloAPS, esperarTraduccion, eliminarModeloAPS } from '../utils/apsClient';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { useConfirm } from '../contexts/NotificationContext';

const FORMATOS_ACEPTADOS = '.rvt,.rfa,.ifc,.dwg,.dwfx,.nwd,.nwc,.3dm,.skp';

// Especialidades estándar BIM (ISO 19650 simplificado para construcción Perú)
export const ESPECIALIDADES = [
  { id: 'ARQ',      label: 'Arquitectura',          color: BASE.navyLight },
  { id: 'EST',      label: 'Estructuras',           color: BASE.navy },
  { id: 'MEP-IISS', label: 'MEP - Inst. Sanitarias',color: CHART.forecast },
  { id: 'MEP-IIEE', label: 'MEP - Inst. Eléctricas',color: BASE.gold },
  { id: 'MEP-HVAC', label: 'MEP - HVAC',            color: CHART_PALETTE[8] },
  { id: 'CIV',      label: 'Obras Civiles',         color: BASE.muted },
  { id: 'FED',      label: 'Federado (combinado)',  color: CHART_PALETTE[3] },
];

export default function BimUploader({ onModeloListo, showToast }) {
  // Aislamiento por proyecto: solo se listan/suben modelos del proyecto activo.
  const { filtrarPorContexto, proyectoActivoId } = useProyectoActivo();
  const confirmar = useConfirm();
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState('');
  const [modelos, setModelos] = useState([]);
  const [traduciendo, setTraduciendo] = useState({});
  // Metadatos de upload — el usuario los rellena ANTES de subir
  const [especialidad, setEspecialidad] = useState('ARQ');
  const [revision, setRevision] = useState('R0');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');

  // Listado de modelos en tiempo real desde Firestore
  useEffect(() => {
    const q = query(collection(db, 'BIM_Modelos'), orderBy('subidoEn', 'desc'));
    const unsub = onSnapshot(q,
      snap => setModelos(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      err => console.error('[BIM_Modelos]', err)
    );
    return () => unsub();
  }, [filtrarPorContexto]);

  // ── HANDLERS DE DRAG&DROP ──
  const onDragOver = (e) => { e.preventDefault(); setArrastrando(true); };
  const onDragLeave = (e) => { e.preventDefault(); setArrastrando(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  };

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  // ── PROCESAR ARCHIVO ──
  const procesarArchivo = async (file) => {
    setSubiendo(true);
    setProgreso(0);
    setEstado(`📤 Preparando subida de ${file.name}...`);

    try {
      // 1) Subir a APS — incluye especialidad + revisión para federación
      const { urn } = await subirModeloAPS(file, (p) => {
        setProgreso(p);
        if (p < 95) setEstado(`⬆️ Subiendo a Autodesk... ${Math.round(p)}%`);
        else setEstado('🔄 Iniciando traducción a SVF2...');
      }, { especialidad, revision, proyectoActivoId });  // sella el modelo con el proyecto activo

      setEstado('✅ Subida completa. Traduciendo modelo (esto toma 5-30 min)...');
      setProgreso(100);
      showToast?.(`📦 ${file.name} subido. Traducción iniciada.`, 'success');

      // 2) Iniciar polling de traducción (no bloqueante)
      setTraduciendo(prev => ({ ...prev, [urn]: { status: 'pending', progress: '0%' } }));
      esperarTraduccion(urn,
        (data) => {
          setTraduciendo(prev => ({ ...prev, [urn]: data }));
        }
      ).then(() => {
        showToast?.(`🎉 Modelo ${file.name} listo para visualizar`, 'success');
        setTraduciendo(prev => {
          const next = { ...prev };
          delete next[urn];
          return next;
        });
        if (onModeloListo) onModeloListo(urn);
      }).catch(err => {
        showToast?.(`❌ Traducción falló: ${err.message}`, 'error');
        setTraduciendo(prev => {
          const next = { ...prev };
          delete next[urn];
          return next;
        });
      });

      // Limpiar UI de subida
      setTimeout(() => {
        setSubiendo(false);
        setProgreso(0);
        setEstado('');
      }, 2000);

    } catch (err) {
      console.error('[BimUploader]', err);
      showToast?.(`❌ Error: ${err.message}`, 'error');
      setEstado(`❌ ${err.message}`);
      setProgreso(0);
      setTimeout(() => { setSubiendo(false); setEstado(''); }, 4000);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // ── ELIMINAR MODELO ──
  const eliminar = async (m) => {
    const ok = await confirmar({
      tono: 'peligro',
      icono: '🗑️',
      titulo: `¿Eliminar definitivamente "${m.nombreOriginal}"?`,
      mensaje: 'Se borra de APS y de la lista.',
    });
    if (!ok) return;
    try {
      await eliminarModeloAPS(m.id, m.objectKey);
      showToast?.('🗑️ Modelo eliminado', 'info');
    } catch (err) {
      showToast?.(`Error: ${err.message}`, 'error');
    }
  };

  // ── COPIAR URN AL PORTAPAPELES ──
  const copiarUrn = (urn) => {
    navigator.clipboard.writeText(urn);
    showToast?.('📋 URN copiado al portapapeles', 'success');
  };

  // Lista filtrada según chip activo
  const modelosVistos = filtroEspecialidad
    ? modelos.filter(m => (m.especialidad || 'ARQ') === filtroEspecialidad)
    : modelos;

  // Conteo por especialidad para los chips
  const conteoPorEsp = {};
  modelos.forEach(m => {
    const esp = m.especialidad || 'ARQ';
    conteoPorEsp[esp] = (conteoPorEsp[esp] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* === Selector de Especialidad + Revisión === */}
      <div style={{
        background: BASE.white,
        border: `1px solid ${BASE.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
            ESPECIALIDAD
          </label>
          <select value={especialidad} onChange={e => setEspecialidad(e.target.value)}
            disabled={subiendo}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: `1.5px solid ${BASE.border}`, fontSize: '12.5px',
              fontWeight: '700', color: BASE.navy, background: '#fff',
              boxSizing: 'border-box', cursor: subiendo ? 'not-allowed' : 'pointer',
            }}>
            {ESPECIALIDADES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div style={{ width: '120px' }}>
          <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
            REVISIÓN
          </label>
          <input value={revision} onChange={e => setRevision(e.target.value.toUpperCase())}
            disabled={subiendo}
            placeholder="R0, R1, R2…"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: `1.5px solid ${BASE.border}`, fontSize: '12.5px',
              fontWeight: '700', color: BASE.navy, background: '#fff',
              boxSizing: 'border-box',
              fontFamily: 'var(--grapco-font-mono, monospace)',
            }}/>
        </div>
        <div style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600', maxWidth: '320px' }}>
          💡 Selecciona la disciplina antes de subir. Esto permite federar modelos
          (ver Arquitectura + Estructuras + MEP superpuestos) y filtrar la coordinación.
        </div>
      </div>

      {/* Zona drag&drop */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !subiendo && inputRef.current?.click()}
        style={{
          background: arrastrando ? BASE.goldLight : BASE.white,
          border: `3px dashed ${arrastrando ? BASE.gold : BASE.border}`,
          borderRadius: '14px',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: subiendo ? 'wait' : 'pointer',
          transition: '0.2s',
          opacity: subiendo ? 0.6 : 1,
        }}>
        <input
          ref={inputRef}
          type="file"
          accept={FORMATOS_ACEPTADOS}
          onChange={onFileSelect}
          disabled={subiendo}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.7 }}>
          {subiendo ? '⏳' : '📤'}
        </div>
        <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy, marginBottom: '6px' }}>
          {subiendo ? 'Subiendo modelo a Autodesk...' : 'Arrastra tu archivo .rvt aquí o haz clic'}
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted }}>
          Formatos: Revit (.rvt, .rfa) · IFC (.ifc) · AutoCAD (.dwg) · Navisworks (.nwd, .nwc) · 500 MB máx
        </p>

        {subiendo && (
          <div style={{ marginTop: '20px', maxWidth: '400px', margin: '20px auto 0' }}>
            <div style={{
              background: BASE.bg, borderRadius: '20px', height: '12px',
              overflow: 'hidden', border: `1px solid ${BASE.border}`,
            }}>
              <div style={{
                width: `${progreso}%`, height: '100%',
                background: `linear-gradient(90deg, ${BASE.gold}, ${BASE.goldDark})`,
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '8px', fontWeight: '700' }}>
              {estado}
            </p>
          </div>
        )}
      </div>

      {/* Lista de modelos subidos */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{
          padding: '12px 18px', background: BASE.bgSoft,
          borderBottom: `1px solid ${BASE.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
        }}>
          <h4 style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
            MODELOS SUBIDOS A APS
          </h4>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '700' }}>
            {modelosVistos.length} de {modelos.length} {modelos.length === 1 ? 'modelo' : 'modelos'}
          </span>
        </div>

        {/* Chips filtro por especialidad */}
        {modelos.length > 0 && (
          <div style={{
            padding: '10px 18px', background: '#fcfdfe',
            borderBottom: `1px solid ${BASE.border}`,
            display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: '9.5px', color: BASE.muted, fontWeight: '800', letterSpacing: '0.5px', marginRight: '4px' }}>
              FILTRAR:
            </span>
            <button onClick={() => setFiltroEspecialidad('')} style={{
              padding: '4px 10px', borderRadius: '999px',
              background: !filtroEspecialidad ? BASE.navy : '#fff',
              color: !filtroEspecialidad ? '#fff' : BASE.muted,
              border: `1px solid ${!filtroEspecialidad ? BASE.navy : BASE.border}`,
              fontSize: '10.5px', fontWeight: '800', cursor: 'pointer',
              letterSpacing: '0.3px',
            }}>
              Todos ({modelos.length})
            </button>
            {ESPECIALIDADES.filter(e => conteoPorEsp[e.id]).map(e => {
              const activo = filtroEspecialidad === e.id;
              return (
                <button key={e.id} onClick={() => setFiltroEspecialidad(activo ? '' : e.id)} style={{
                  padding: '4px 10px', borderRadius: '999px',
                  background: activo ? `${e.color}15` : '#fff',
                  color: activo ? e.color : BASE.muted,
                  border: `1px solid ${activo ? `${e.color}66` : BASE.border}`,
                  fontSize: '10.5px', fontWeight: '800', cursor: 'pointer',
                  letterSpacing: '0.3px',
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: e.color }}/>
                  {e.id} <span style={{ opacity: 0.65 }}>({conteoPorEsp[e.id]})</span>
                </button>
              );
            })}
          </div>
        )}

        {modelosVistos.length === 0 ? (
          <p style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '12px', fontStyle: 'italic' }}>
            {modelos.length === 0
              ? 'Aún no subiste ningún modelo. Arrastra un archivo .rvt arriba para empezar.'
              : `Sin modelos de ${filtroEspecialidad}. Cambia el filtro.`}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy }}>
                  {['Especialidad', 'Archivo', 'Rev.', 'Subido por', 'Estado', 'Progreso', 'Fecha', 'Acciones'].map((h, i) => (
                    <th key={i} style={{ padding: '11px 12px', color: '#fff', fontSize: '10px', fontWeight: '900', textAlign: 'left', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelosVistos.map((m, idx) => {
                  const trad = traduciendo[m.urn];
                  const status = trad?.status || m.traduccionStatus || 'pending';
                  const progress = trad?.progress || m.progreso || '0%';
                  const cfg = ESTADO_CFG[status] || ESTADO_CFG.pending;
                  const esp = ESPECIALIDADES.find(e => e.id === (m.especialidad || 'ARQ')) || ESPECIALIDADES[0];
                  return (
                    <tr key={m.id} style={{ background: idx % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ padding: '12px', borderLeft: `4px solid ${esp.color}` }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: `${esp.color}15`, color: esp.color,
                          padding: '3px 9px', borderRadius: '6px',
                          fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                          border: `1px solid ${esp.color}44`,
                        }}>{esp.id}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', fontWeight: '700', color: BASE.navy, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.nombreOriginal}>
                        {m.nombreOriginal}
                      </td>
                      <td style={{ padding: '12px', fontSize: '10.5px', color: BASE.muted, fontWeight: '800', fontFamily: 'var(--grapco-font-mono, monospace)' }}>
                        {m.revision || 'R0'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '11px', color: BASE.muted }}>
                        {m.subidoPorEmail || m.subidoPor?.slice(0, 10) || '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px',
                          background: `${cfg.color}22`, color: cfg.color,
                          fontSize: '10px', fontWeight: '900',
                        }}>{cfg.icon} {cfg.label}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '11px', color: BASE.text, fontWeight: '700' }}>
                        {progress}
                      </td>
                      <td style={{ padding: '12px', fontSize: '10px', color: BASE.muted }}>
                        {m.subidoEn?.toDate?.()?.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => copiarUrn(m.urn)} style={{
                          padding: '5px 10px', background: BASE.bgSoft, color: BASE.navy,
                          border: `1px solid ${BASE.border}`, borderRadius: '6px',
                          fontSize: '10px', fontWeight: '800', cursor: 'pointer', marginRight: '4px',
                        }} title="Copiar URN">📋</button>
                        {status === 'success' && onModeloListo && (
                          <button onClick={() => onModeloListo(m.urn)} style={{
                            padding: '5px 10px',
                            background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
                            color: '#fff', border: 'none', borderRadius: '6px',
                            fontSize: '10px', fontWeight: '800', cursor: 'pointer', marginRight: '4px',
                          }} title="Ver en visor">👁️</button>
                        )}
                        <button onClick={() => eliminar(m)} style={{
                          padding: '5px 10px', background: '#fee2e2', color: '#dc2626',
                          border: 'none', borderRadius: '6px',
                          fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                        }} title="Eliminar">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ background: BASE.bgSoft, borderRadius: '10px', padding: '12px 16px', fontSize: '11px', color: BASE.muted, lineHeight: 1.6 }}>
        <strong style={{ color: BASE.navy }}>💡 Cómo funciona:</strong>{' '}
        Tu archivo se sube a un bucket privado de Autodesk APS (Platform Services). APS lo traduce
        automáticamente a SVF2 (formato del visor web) en 5–30 min según el tamaño. Una vez listo,
        click en 👁️ para verlo en el visor 3D embebido. El URN puedes copiarlo (📋) para usar
        manualmente en otros visores.
      </div>
    </div>
  );
}

const ESTADO_CFG = {
  pending:    { label: 'En cola',     color: '#94a3b8', icon: '⏳' },
  inprogress: { label: 'Traduciendo', color: '#d97706', icon: '🔄' },
  success:    { label: 'Listo',       color: '#16a34a', icon: '✅' },
  failed:     { label: 'Error',       color: '#dc2626', icon: '❌' },
  timeout:    { label: 'Timeout',     color: '#dc2626', icon: '⏱️' },
};
