// src/views/modulos/planMaestro/WizardPlanMaestro.jsx — Carga masiva con plantillas (B24)

import React, { useState, useMemo } from 'react';
import { collection, writeBatch, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE, CHART_PALETTE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { PLANTILLAS, aplicarPlantilla } from '../../../utils/plantillas/plantillasPlanMaestro';
import { fmtSoles, fmtNumero } from '../../../utils/planMaestroAnalytics';

export default function WizardPlanMaestro({ onClose, showToast }) {
  const { user } = useAuth();
  const { proyectoActivo, frentesDelProyecto, frenteActivoId, modoTodosFrentes } = useProyectoActivo();
  const [paso, setPaso] = useState(1);
  const [plantillaId, setPlantillaId] = useState('edificacion');
  const [frenteDestino, setFrenteDestino] = useState(
    modoTodosFrentes ? (frentesDelProyecto[0]?.id || '') : frenteActivoId
  );
  const [escala, setEscala] = useState(1.0);
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [reemplazar, setReemplazar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const plantillaSel = useMemo(() => PLANTILLAS.find(p => p.id === plantillaId), [plantillaId]);

  // Preview de actividades a crear
  const actividadesPreview = useMemo(() => {
    if (!plantillaSel || !proyectoActivo) return [];
    return aplicarPlantilla(plantillaSel, {
      proyectoId: proyectoActivo.id,
      frenteId: frenteDestino,
      fechaInicio,
      escalaPresupuesto: escala,
    });
  }, [plantillaSel, proyectoActivo, frenteDestino, fechaInicio, escala]);

  // Resumen
  const resumen = useMemo(() => {
    const hojas = actividadesPreview.filter(a => a.metradoContractual > 0);
    const presupuesto = hojas.reduce((s, a) => s + (a.metradoContractual * a.precioUnitario), 0);
    const hhTotal = hojas.reduce((s, a) => s + (a.hhTotalPresupuestado || 0), 0);
    return {
      total: actividadesPreview.length,
      hojas: hojas.length,
      presupuesto,
      hhTotal,
    };
  }, [actividadesPreview]);

  if (!proyectoActivo) {
    return (
      <div style={{ padding: 30, textAlign: 'center', background: BASE.white, borderRadius: '14px', border: `2px dashed ${BASE.border}` }}>
        <p style={{ fontSize: '40px' }}>🌎</p>
        <p style={{ fontSize: '16px', fontWeight: '900', color: BASE.navy, marginTop: '10px' }}>
          Selecciona un proyecto activo
        </p>
        <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '6px' }}>
          Necesitas un proyecto activo para crear su Plan Maestro.
        </p>
      </div>
    );
  }

  const ejecutar = async () => {
    if (!frenteDestino) {
      showToast?.('Selecciona el frente destino', 'error');
      return;
    }
    if (actividadesPreview.length === 0) {
      showToast?.('Selecciona una plantilla con actividades', 'error');
      return;
    }

    setGuardando(true);
    try {
      // Si reemplazar=true, eliminar actividades existentes del proyecto+frente
      if (reemplazar) {
        const q = query(
          collection(db, 'PlanMaestro'),
          where('proyectoId', '==', proyectoActivo.id),
          where('frenteId', '==', frenteDestino)
        );
        const snap = await getDocs(q);
        if (snap.size > 0) {
          // Eliminar en lotes de 500
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 400) {
            const batch = writeBatch(db);
            docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      }

      // Insertar nuevas actividades en lotes
      const total = actividadesPreview.length;
      let creadas = 0;
      for (let i = 0; i < actividadesPreview.length; i += 400) {
        const batch = writeBatch(db);
        actividadesPreview.slice(i, i + 400).forEach(act => {
          const ref = doc(collection(db, 'PlanMaestro'));
          batch.set(ref, {
            ...act,
            creadoEn: serverTimestamp(),
            creadoPor: user?.email || 'desconocido',
          });
        });
        await batch.commit();
        creadas += Math.min(400, actividadesPreview.length - i);
      }

      showToast?.(`✅ Plan Maestro creado: ${creadas} actividades · ${fmtSoles(resumen.presupuesto)}`, 'success');
      onClose?.();
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const PASOS = [
    { num: 1, l: 'Plantilla',     icono: '📋' },
    { num: 2, l: 'Configurar',    icono: '⚙️' },
    { num: 3, l: 'Vista previa',  icono: '👁️' },
    { num: 4, l: 'Ejecutar',      icono: '🚀' },
  ];

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '22px 26px',
      borderLeft: `5px solid ${plantillaSel?.color || BASE.navy}`,
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '1px' }}>
            WIZARD · CARGA MASIVA DE PLAN MAESTRO
          </p>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
            Crea {actividadesPreview.length || '50+'} actividades en 1 click
          </h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Proyecto: <strong style={{ color: proyectoActivo.color }}>{proyectoActivo.nombre}</strong>
          </p>
        </div>
        <button onClick={onClose} style={btnGhost}>✕ Cerrar</button>
      </div>

      {/* STEP INDICATOR */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {PASOS.map(p => {
          const activo = paso === p.num;
          const completo = paso > p.num;
          const c = plantillaSel?.color || BASE.navy;
          return (
            <div key={p.num} style={{
              flex: '1 1 130px',
              padding: '10px 12px',
              background: activo ? `linear-gradient(135deg, ${c}, ${c}dd)` : completo ? '#dcfce7' : BASE.bgSoft,
              color: activo ? '#fff' : completo ? '#15803d' : BASE.muted,
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '11px', fontWeight: '900',
              border: activo ? 'none' : `1px solid ${BASE.border}`,
            }}>
              <p style={{ fontSize: '14px', marginBottom: '2px' }}>{completo ? '✓' : p.icono}</p>
              <p style={{ fontSize: '10px', letterSpacing: '0.4px' }}>PASO {p.num}</p>
              <p style={{ fontSize: '11px' }}>{p.l}</p>
            </div>
          );
        })}
      </div>

      {/* PASO 1 - SELECCIÓN DE PLANTILLA */}
      {paso === 1 && (
        <div>
          <h4 style={titH4}>Elige una plantilla según el tipo de obra</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
            {PLANTILLAS.map(p => {
              const sel = plantillaId === p.id;
              const totalAct = p.actividades.length;
              return (
                <button key={p.id} onClick={() => setPlantillaId(p.id)} style={{
                  padding: '18px 20px', textAlign: 'left',
                  background: sel ? `linear-gradient(135deg, ${p.color}, ${p.color}dd)` : BASE.white,
                  color: sel ? '#fff' : BASE.text,
                  border: sel ? 'none' : `2px solid ${BASE.border}`,
                  borderRadius: '12px', cursor: 'pointer',
                  boxShadow: sel ? `0 6px 18px ${p.color}55` : '0 1px 3px rgba(15,23,42,0.05)',
                  transition: 'all 0.18s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '32px' }}>{p.icono}</span>
                    <span style={{
                      background: sel ? 'rgba(255,255,255,0.25)' : p.color + '22',
                      color: sel ? '#fff' : p.color,
                      padding: '4px 10px', borderRadius: '8px',
                      fontSize: '10px', fontWeight: '900',
                    }}>{totalAct} actividades</span>
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: '900', marginTop: '12px' }}>{p.label}</p>
                  <p style={{ fontSize: '11.5px', opacity: sel ? 0.92 : 0.7, marginTop: '6px', lineHeight: 1.5 }}>
                    {p.descripcion}
                  </p>
                  {p.duracionEstimadaMeses > 0 && (
                    <p style={{ fontSize: '10.5px', opacity: sel ? 0.85 : 0.6, marginTop: '8px', fontWeight: '700' }}>
                      Duración estimada: {p.duracionEstimadaMeses} meses
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PASO 2 - CONFIGURAR */}
      {paso === 2 && (
        <div>
          <h4 style={titH4}>Configurar la carga</h4>

          <div style={secS}>
            <Field label="Frente destino *" hint="Las actividades se crearán dentro de este frente">
              <select value={frenteDestino} onChange={e => setFrenteDestino(e.target.value)} style={selS}>
                <option value="">— selecciona un frente —</option>
                {frentesDelProyecto.map(f => (
                  <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>
                ))}
              </select>
            </Field>

            <Field label="Fecha de inicio del proyecto" hint="Las fechas de las actividades se distribuyen automáticamente">
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inpS} />
            </Field>

            <Field label="Escala del presupuesto" hint="Multiplica los metrados de la plantilla. 1.0 = sin cambio. 0.5 = la mitad. 2.0 = el doble.">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="range" min="0.25" max="3" step="0.25" value={escala}
                  onChange={e => setEscala(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: plantillaSel?.color || BASE.gold }} />
                <span style={{
                  padding: '6px 14px', borderRadius: '8px',
                  background: plantillaSel?.color || BASE.navy,
                  color: '#fff', fontSize: '13px', fontWeight: '900',
                  minWidth: '60px', textAlign: 'center', fontFamily: 'monospace',
                }}>{escala.toFixed(2)}×</span>
              </div>
            </Field>

            <Field label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: '#fef3c7', borderRadius: '8px', border: '1.5px solid #f59e0b55' }}>
                <input type="checkbox" checked={reemplazar} onChange={e => setReemplazar(e.target.checked)}
                  style={{ accentColor: BASE.red, width: '18px', height: '18px' }} />
                <div>
                  <p style={{ fontSize: '12.5px', fontWeight: '900', color: BASE.goldDark }}>
                    ⚠️ Reemplazar actividades existentes en este frente
                  </p>
                  <p style={{ fontSize: '10.5px', color: BASE.goldDark, marginTop: '2px' }}>
                    Eliminará todo el Plan Maestro actual del frente seleccionado antes de cargar la plantilla.
                  </p>
                </div>
              </label>
            </Field>
          </div>
        </div>
      )}

      {/* PASO 3 - VISTA PREVIA */}
      {paso === 3 && (
        <div>
          <h4 style={titH4}>Vista previa de actividades a crear</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px', marginBottom: '14px' }}>
            <Stat label="Total actividades" valor={resumen.total} color={BASE.navy} />
            <Stat label="Actividades hoja" valor={resumen.hojas} color={CHART_PALETTE[3]} />
            <Stat label="Presupuesto total" valor={fmtSoles(resumen.presupuesto)} color={BASE.gold} chico />
            <Stat label="HH presupuestadas" valor={fmtNumero(resumen.hhTotal, 0)} color={CHART_PALETTE[2]} />
          </div>

          <div style={{
            background: BASE.white, border: `1px solid ${BASE.border}`,
            borderRadius: '12px', overflow: 'hidden', maxHeight: '50vh', overflowY: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead style={{ position: 'sticky', top: 0, background: BASE.navy, color: '#fff', zIndex: 1 }}>
                <tr>
                  <th style={th}>Código</th>
                  <th style={th}>Descripción</th>
                  <th style={{ ...th, textAlign: 'center' }}>Und</th>
                  <th style={{ ...th, textAlign: 'right' }}>Metrado</th>
                  <th style={{ ...th, textAlign: 'right' }}>P.U.</th>
                  <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {actividadesPreview.map((a, i) => {
                  const nivel = (a.codigo || '').split('.').length;
                  const subtotal = (a.metradoContractual || 0) * (a.precioUnitario || 0);
                  const esPadre = !a.metradoContractual;
                  return (
                    <tr key={i} style={{
                      background: esPadre ? BASE.navySoft : (i % 2 === 0 ? BASE.white : BASE.bgSoft),
                      borderBottom: `1px solid ${BASE.border}`,
                    }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: '900', color: plantillaSel?.color || BASE.navy, paddingLeft: `${10 + (nivel - 1) * 14}px` }}>
                        {a.codigo}
                      </td>
                      <td style={{ ...td, fontWeight: esPadre ? '900' : '500' }}>{a.descripcion}</td>
                      <td style={{ ...td, textAlign: 'center', fontFamily: 'monospace' }}>{a.unidad || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{a.metradoContractual ? fmtNumero(a.metradoContractual, 2) : ''}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{a.precioUnitario ? fmtSoles(a.precioUnitario) : ''}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.navy }}>
                        {subtotal > 0 ? fmtSoles(subtotal) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PASO 4 - EJECUTAR */}
      {paso === 4 && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff', borderRadius: '14px',
            padding: '24px 28px',
            borderLeft: `5px solid ${BASE.gold}`,
          }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
              LISTO PARA EJECUTAR
            </p>
            <h3 style={{ fontSize: '24px', fontWeight: '900', marginTop: '6px' }}>
              Confirma la carga del Plan Maestro
            </h3>
            <p style={{ fontSize: '13px', opacity: 0.95, marginTop: '8px', lineHeight: 1.5 }}>
              Vas a crear <strong>{resumen.total} actividades</strong> ({resumen.hojas} ejecutables) por <strong>{fmtSoles(resumen.presupuesto)}</strong> en el proyecto <strong>{proyectoActivo.nombre}</strong>.
            </p>
            {reemplazar && (
              <p style={{ fontSize: '12px', marginTop: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.18)', borderRadius: '8px' }}>
                ⚠️ Modo REEMPLAZAR activado: las actividades existentes en este frente serán eliminadas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* NAVEGACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '18px', borderTop: `1px solid ${BASE.border}` }}>
        <button onClick={() => setPaso(Math.max(1, paso - 1))} disabled={paso === 1 || guardando} style={{ ...btnSec, opacity: paso === 1 ? 0.4 : 1, cursor: paso === 1 ? 'not-allowed' : 'pointer' }}>
          ← Anterior
        </button>
        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '700' }}>
          Paso {paso} de 4
        </span>
        {paso < 4 ? (
          <button onClick={() => setPaso(paso + 1)} disabled={guardando} style={{
            ...btnPrimario,
            background: `linear-gradient(135deg, ${plantillaSel?.color || BASE.navy}, ${plantillaSel?.color || BASE.navy}dd)`,
          }}>
            Siguiente →
          </button>
        ) : (
          <button onClick={ejecutar} disabled={guardando} style={{
            ...btnPrimario,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
          }}>
            {guardando ? '⏳ Creando...' : '🚀 EJECUTAR CARGA'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      {label && <label style={lblS}>{label.toUpperCase()}</label>}
      {children}
      {hint && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  );
}

function Stat({ label, valor, color, chico }) {
  return (
    <div style={{
      background: color + '12', border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '10px', padding: '12px 14px',
    }}>
      <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: chico ? '15px' : '20px', fontWeight: '900', color, marginTop: '4px', fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}

const titH4 = { fontSize: '15px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' };
const secS = { background: BASE.bgSoft, padding: '16px 18px', borderRadius: '12px' };
const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnGhost = { padding: '8px 14px', borderRadius: '8px', background: 'transparent', color: BASE.navy, border: `1.5px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: '900', cursor: 'pointer' };
const btnSec = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.navy, border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '900', cursor: 'pointer' };
const btnPrimario = { padding: '11px 22px', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' };
const th = { padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', fontSize: '11.5px', color: BASE.text };
