// src/views/seguridad/InspeccionSeguridad.jsx
// Inspección diaria de seguridad: checklist con grupos típicos de obra GRAPCO
// (EPP, accesos, andamios, eléctrico, orden y limpieza) + fotos por hallazgo.

import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import FotoUploader from '../../components/FotoUploader';

const GRUPOS = [
  {
    id: 'epp',
    titulo: 'EPP — Equipos de Protección Personal',
    icono: '🦺',
    items: [
      'Casco con barbiquejo en uso',
      'Lentes de seguridad claros / oscuros según tarea',
      'Botas con punta de acero',
      'Guantes apropiados a la tarea',
      'Arnés con doble línea para trabajos en altura',
      'Protector auditivo cuando aplica',
    ],
  },
  {
    id: 'accesos',
    titulo: 'Accesos y señalización',
    icono: '🚧',
    items: [
      'Vías de evacuación libres',
      'Áreas de trabajo señalizadas y delimitadas',
      'Cinta de seguridad / mallas en zona de riesgo',
      'Carteles informativos visibles',
    ],
  },
  {
    id: 'andamios',
    titulo: 'Andamios y trabajos en altura',
    icono: '🏗️',
    items: [
      'Tarjeta de operatividad verde en andamios',
      'Plataformas completas, rodapiés y barandas',
      'Anclaje certificado para arnés',
      'Personal con curso de altura vigente',
    ],
  },
  {
    id: 'electrico',
    titulo: 'Riesgo eléctrico',
    icono: '⚡',
    items: [
      'Tableros con tapa y rotulados',
      'Cables sin empalmes precarios',
      'Herramientas con conexión a tierra',
      'Permiso de trabajo en caliente cuando aplica',
    ],
  },
  {
    id: 'orden',
    titulo: 'Orden y limpieza',
    icono: '🧹',
    items: [
      'Materiales apilados de forma estable',
      'Residuos segregados (RNC / metales / madera)',
      'Pasillos y escaleras libres de obstáculos',
      'Iluminación adecuada',
    ],
  },
  {
    id: 'documentacion',
    titulo: 'Documentación de campo',
    icono: '📜',
    items: [
      'ATS firmado por la cuadrilla',
      'PETs disponibles en frente',
      'Charla de 5 min registrada',
      'Permiso para trabajo en altura / caliente vigente',
    ],
  },
];

const ESTADOS = [
  { id: 'ok',         l: 'OK',            color: BASE.green, icono: '✅' },
  { id: 'observado',  l: 'Observado',     color: BASE.gold,  icono: '⚠️' },
  { id: 'critico',    l: 'Crítico',       color: BASE.red,   icono: '🚨' },
  { id: 'na',         l: 'N/A',           color: BASE.mutedSoft,  icono: '—' },
];

export default function InspeccionSeguridad({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId } = useProyectoActivo();
  const [meta, setMeta] = useState({
    frente: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toTimeString().slice(0, 5),
    inspector: user?.email || '',
    observacionesGenerales: '',
  });
  const [estado, setEstado] = useState({});  // { 'epp-0': 'ok', ... }
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const setItem = (gid, idx, val) => {
    setEstado(prev => ({ ...prev, [`${gid}-${idx}`]: val }));
  };

  const resumen = (() => {
    let ok = 0, obs = 0, crit = 0, na = 0, total = 0;
    GRUPOS.forEach(g => g.items.forEach((_, idx) => {
      total++;
      const v = estado[`${g.id}-${idx}`];
      if (v === 'ok') ok++;
      else if (v === 'observado') obs++;
      else if (v === 'critico') crit++;
      else if (v === 'na') na++;
    }));
    const evaluados = ok + obs + crit + na;
    return { ok, obs, crit, na, total, evaluados, pct: total ? Math.round((evaluados / total) * 100) : 0 };
  })();

  const guardar = async () => {
    if (!meta.frente.trim()) {
      showToast?.('Indica el frente o ubicación', 'error');
      return;
    }
    if (resumen.evaluados < resumen.total / 2) {
      if (!confirm(`Solo has evaluado ${resumen.evaluados}/${resumen.total} ítems. ¿Guardar igual?`)) return;
    }
    setEnviando(true);
    try {
      const items = GRUPOS.flatMap(g => g.items.map((it, idx) => ({
        grupo: g.id,
        item: it,
        estado: estado[`${g.id}-${idx}`] || null,
      })));
      await addDoc(collection(db, 'InspeccionesSeguridad'), {
        ...meta,
        items,
        resumen,
        fotos,
        proyectoId: proyectoActivoId,
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'desconocido',
      });
      // Si hay críticos, abre automáticamente una NC para seguimiento
      if (resumen.crit > 0) {
        const itemsCriticos = items.filter(i => i.estado === 'critico');
        await addDoc(collection(db, 'NoConformidades'), {
          codigo: `NC-INSP-${Date.now()}`,
          origen: 'inspeccion_seguridad',
          tipo: 'seguridad',
          proyectoId: proyectoActivoId,
          severidad: 'alta',
          ubicacion: meta.frente,
          descripcion: `Inspección detectó ${resumen.crit} hallazgo(s) crítico(s):\n` +
            itemsCriticos.map(c => `• ${c.item}`).join('\n'),
          fotos,
          estado: 'abierta',
          detectadoEn: serverTimestamp(),
          reportadoPor: user?.email || 'seguridad',
          creadoEn: serverTimestamp(),
        });
      }
      showToast?.(`Inspección guardada${resumen.crit > 0 ? ' + NC creada por hallazgos críticos' : ''}`, 'success');
      setEstado({}); setFotos([]);
      setMeta(m => ({ ...m, observacionesGenerales: '' }));
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* META */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px 18px',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '4px' }}>
          INSPECCIÓN DIARIA DE SEGURIDAD
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px' }}>
          Recorre el frente y marca cada ítem. Los críticos abren automáticamente una NC para seguimiento.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <Campo label="Frente / ubicación *">
            <input value={meta.frente} onChange={(e) => setMeta({ ...meta, frente: e.target.value })} style={inp()}
              placeholder="Ej: F1+F2 - PTARI, Eje A-3" />
          </Campo>
          <Campo label="Fecha">
            <input type="date" value={meta.fecha} onChange={(e) => setMeta({ ...meta, fecha: e.target.value })} style={inp()} />
          </Campo>
          <Campo label="Hora">
            <input type="time" value={meta.hora} onChange={(e) => setMeta({ ...meta, hora: e.target.value })} style={inp()} />
          </Campo>
          <Campo label="Inspector">
            <input value={meta.inspector} onChange={(e) => setMeta({ ...meta, inspector: e.target.value })} style={inp()}
              placeholder="Nombre del SSOMA" />
          </Campo>
        </div>
      </div>

      {/* RESUMEN */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
      }}>
        <Tarjeta titulo="OK"        valor={resumen.ok}   color={BASE.green} />
        <Tarjeta titulo="Observado" valor={resumen.obs}  color={BASE.gold}  />
        <Tarjeta titulo="Crítico"   valor={resumen.crit} color={BASE.red}   />
        <Tarjeta titulo="N/A"       valor={resumen.na}   color={BASE.mutedSoft}     />
        <Tarjeta titulo="Avance"    valor={`${resumen.evaluados}/${resumen.total}`} color={BASE.navy} />
      </div>

      {/* GRUPOS */}
      {GRUPOS.map(g => (
        <div key={g.id} style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
        }}>
          <div style={{
            background: BASE.navy, color: '#fff',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '16px' }}>{g.icono}</span>
            <span style={{ fontSize: '12.5px', fontWeight: '900', letterSpacing: '0.4px' }}>
              {g.titulo}
            </span>
          </div>
          <div>
            {g.items.map((it, idx) => {
              const v = estado[`${g.id}-${idx}`];
              return (
                <div key={idx} style={{
                  padding: '10px 16px',
                  borderBottom: idx < g.items.length - 1 ? `1px solid ${BASE.border}` : 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: idx % 2 === 0 ? '#fff' : BASE.bgSoft,
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '12.5px', color: BASE.navy, flex: '1 1 280px' }}>
                    {it}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {ESTADOS.map(e => (
                      <button key={e.id} onClick={() => setItem(g.id, idx, e.id)} style={{
                        padding: '6px 10px', borderRadius: '8px',
                        border: `1.5px solid ${v === e.id ? e.color : BASE.border}`,
                        background: v === e.id ? e.color : '#fff',
                        color: v === e.id ? '#fff' : BASE.muted,
                        fontSize: '10.5px', fontWeight: 800, cursor: 'pointer',
                        letterSpacing: '0.3px',
                      }}>
                        {e.icono} {e.l}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* OBSERVACIONES + FOTOS */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px 18px',
      }}>
        <Campo label="Observaciones generales">
          <textarea rows={3} value={meta.observacionesGenerales}
            onChange={(e) => setMeta({ ...meta, observacionesGenerales: e.target.value })}
            style={{ ...inp(), resize: 'vertical' }}
            placeholder="Notas globales de la inspección, recomendaciones, compromisos…" />
        </Campo>
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '6px', letterSpacing: '0.4px' }}>
            FOTOS DE LA INSPECCIÓN ({fotos.length})
          </p>
          <FotoUploader
            fotos={fotos} onChange={setFotos}
            ruta={`Inspecciones/${meta.fecha}/${(meta.frente || 'sin-frente').replace(/[^\w]/g, '_')}`}
            max={20}
            showToast={showToast}
          />
        </div>
      </div>

      {/* GUARDAR */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button onClick={guardar} disabled={enviando} style={{
          background: BASE.navy, color: '#fff', border: 'none',
          padding: '12px 24px', borderRadius: '10px',
          fontSize: '12px', fontWeight: 900, letterSpacing: '0.4px',
          cursor: 'pointer', boxShadow: `0 6px 16px ${BASE.navy}55`,
        }}>
          {enviando ? 'Guardando…' : '💾 GUARDAR INSPECCIÓN'}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Tarjeta({ titulo, valor, color }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '12px 14px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px' }}>{titulo.toUpperCase()}</p>
      <p style={{ fontSize: '20px', fontWeight: 900, color, marginTop: '2px' }}>{valor}</p>
    </div>
  );
}

const inp = () => ({ width: '100%', padding: '9px 12px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
