// src/views/asistencia/AsistenciaDiaria.jsx
// Captura manual de entrada/salida por obrero (bootstrap antes del biométrico).
// Es la fuente "oficial" de HH del admin. Se compara con lo que reporta el capataz.

import React, { useState, useMemo, useEffect } from 'react';
import {
  collection, doc, setDoc, onSnapshot, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE, RADIUS, SPACING } from '../../utils/styles';
import { JORNADA_LEGAL } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { usePersonal } from '../../hooks/useFirebaseData';
import DatePickerPremium from '../../components/DatePickerPremium';

const fmt2 = (n) => Math.round(n * 100) / 100;

// Convierte 'HH:MM' a horas decimales
function timeToHours(t) {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

// Puntualidad vs la entrada meta del proyecto (07:30). Compara la hora REAL de
// llegada (la del marcador facial) — independiente de lo que va al tareo (07:30
// fijo). Sirve para reconocer a quién llega más temprano / más puntual.
const META_ENTRADA_MIN = 7 * 60 + 30; // 07:30
const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
function puntualidad(real) {
  if (!real || !/^\d{2}:\d{2}$/.test(real)) return null;
  const delta = toMin(real) - META_ENTRADA_MIN;
  if (delta < 0)  return { txt: `${-delta} min antes`, color: '#15803d', bg: '#dcfce7' };
  if (delta === 0) return { txt: 'Puntual', color: '#15803d', bg: '#dcfce7' };
  if (delta <= 10) return { txt: `+${delta} min`, color: '#b45309', bg: '#fef3c7' };
  return { txt: `Tarde +${delta} min`, color: '#b91c1c', bg: '#fee2e2' };
}

function calcularHHDelDia(entrada, salida, descansoMin = 60) {
  const e = timeToHours(entrada);
  const s = timeToHours(salida);
  if (e === null || s === null || s <= e) return { hn: 0, he: 0, total: 0 };
  const total = (s - e) - (descansoMin / 60);
  if (total <= 0) return { hn: 0, he: 0, total: 0 };
  const hn = Math.min(total, JORNADA_LEGAL);
  const he = Math.max(0, total - JORNADA_LEGAL);
  return { hn: fmt2(hn), he: fmt2(he), total: fmt2(total) };
}

export default function AsistenciaDiaria({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes, filtrarPorContexto } = useProyectoActivo();
  const personalDB = usePersonal();
  const personalFrente = useMemo(() => {
    if (!Array.isArray(personalDB)) return [];
    return filtrarPorContexto(personalDB).filter(p => p.activo !== false);
  }, [personalDB, filtrarPorContexto]);

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [registros, setRegistros] = useState({}); // { personalId: { entrada, salida, descanso } }
  const [guardando, setGuardando] = useState(false);

  // Suscribirse a la asistencia de la fecha seleccionada
  useEffect(() => {
    if (!proyectoActivoId) return;
    const q = query(
      collection(db, 'Asistencia_Diaria'),
      where('fecha', '==', fecha),
      where('proyectoId', '==', proyectoActivoId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.forEach(d => {
        const data = d.data();
        if (data.personalId) {
          map[data.personalId] = {
            entrada:  data.entrada || '',
            salida:   data.salida  || '',
            entradaReal: data.entradaReal || '',
            salidaReal:  data.salidaReal  || '',
            descanso: data.descanso ?? 60,
            observacion: data.observacion || '',
            docId: d.id,
          };
        }
      });
      setRegistros(map);
    }, err => console.warn('[Asistencia onSnapshot]', err));
    return unsub;
  }, [fecha, proyectoActivoId]);

  const actualizar = (id, campo, valor) => {
    setRegistros(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { entrada:'', salida:'', descanso:60 }), [campo]: valor },
    }));
  };

  const guardar = async () => {
    if (!proyectoActivoId) {
      showToast?.('Selecciona un proyecto activo', 'warning');
      return;
    }
    setGuardando(true);
    const frenteId = modoTodosFrentes ? null : frenteActivoId;
    let n = 0;
    try {
      for (const p of personalFrente) {
        const r = registros[p.id];
        if (!r || (!r.entrada && !r.salida)) continue;
        const { hn, he, total } = calcularHHDelDia(r.entrada, r.salida, r.descanso ?? 60);
        const docId = `${fecha}_${proyectoActivoId}_${p.id}`;
        await setDoc(doc(db, 'Asistencia_Diaria', docId), {
          fecha,
          proyectoId: proyectoActivoId,
          frenteId,
          personalId: p.id,
          nombre: p.nombre || '',
          categoria: p.categoria || '',
          entrada: r.entrada || '',
          salida:  r.salida  || '',
          descanso: r.descanso ?? 60,
          hn, he, totalHH: total,
          observacion: r.observacion || '',
          fuente: 'admin-manual',
          registradoPor: user?.email || '',
          actualizadoEn: serverTimestamp(),
        }, { merge: true });
        n++;
      }
      showToast?.(`✅ Asistencia guardada (${n} obreros)`, 'success');
    } catch (e) {
      console.error('[Asistencia guardar]', e);
      showToast?.('Error guardando: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    let hn = 0, he = 0, total = 0, asistieron = 0;
    personalFrente.forEach(p => {
      const r = registros[p.id];
      if (!r) return;
      const { hn: h1, he: h2, total: ttotal } = calcularHHDelDia(r.entrada, r.salida, r.descanso ?? 60);
      if (ttotal > 0) asistieron++;
      hn += h1; he += h2; total += ttotal;
    });
    return { hn: fmt2(hn), he: fmt2(he), total: fmt2(total), asistieron, total_obreros: personalFrente.length };
  }, [registros, personalFrente]);

  // ── Estilos ──
  const card = {
    background: BASE.white,
    border: `1px solid ${BASE.border}`,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    boxShadow: BASE.shadowSm,
  };
  const th = { background: BASE.navy, color: '#fff', padding: '8px 10px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', textAlign: 'center' };
  const tdC = { padding: '8px 10px', borderBottom: `1px solid ${BASE.border}`, fontSize: '11.5px', textAlign: 'center', color: BASE.text };
  const tdL = { ...tdC, textAlign: 'left' };
  const inp = { width: '90px', padding: '5px 8px', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '11px', textAlign: 'center', fontFamily: BASE.font };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
      {/* Header compacto */}
      <div style={{
        background: BASE.white,
        borderRadius: '10px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
          Asistencia Diaria · Control de Marcaje
        </span>
        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
          Fuente oficial de HH (admin) · Compara automáticamente vs tareo del capataz
        </span>
      </div>

      {/* Selector de fecha + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: SPACING.md, alignItems: 'stretch' }}>
        <div style={card}>
          <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>FECHA</p>
          <div style={{ marginTop: '6px' }}>
            <DatePickerPremium value={fecha || ''} onChange={iso => setFecha(iso)}/>
          </div>
        </div>
        {[
          { l: 'Obreros con marcaje', v: `${kpis.asistieron} / ${kpis.total_obreros}` },
          { l: 'HH Normales', v: kpis.hn },
          { l: 'HH Extras', v: kpis.he, color: BASE.gold },
          { l: 'HH Total día', v: kpis.total, color: BASE.green },
        ].map((k, i) => (
          <div key={i} style={card}>
            <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{k.l}</p>
            <p style={{ fontSize: '22px', fontWeight: '900', color: k.color || BASE.navy, marginTop: '4px' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {personalFrente.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted }}>
              <p style={{ fontSize: '13px', fontWeight: '700' }}>No hay personal en el frente activo</p>
              <p style={{ fontSize: '11px', marginTop: '6px' }}>Ve a Admin → Gestión → Personal para añadir obreros</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left', paddingLeft: '14px' }}>OBRERO</th>
                  <th style={th}>CATEGORÍA</th>
                  <th style={th}>ENTRADA</th>
                  <th style={th}>PUNTUALIDAD<br/><span style={{ fontWeight: 600, opacity: 0.7 }}>(llegada real)</span></th>
                  <th style={th}>SALIDA</th>
                  <th style={th}>DESCANSO (min)</th>
                  <th style={th}>HN</th>
                  <th style={th}>HE</th>
                  <th style={th}>TOTAL</th>
                  <th style={{ ...th, textAlign: 'left' }}>OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {personalFrente.map((p, i) => {
                  const r = registros[p.id] || { entrada: '', salida: '', descanso: 60, observacion: '' };
                  const calc = calcularHHDelDia(r.entrada, r.salida, r.descanso ?? 60);
                  const bg = i % 2 === 0 ? BASE.white : BASE.bgSoft;
                  return (
                    <tr key={p.id} style={{ background: bg }}>
                      <td style={{ ...tdL, fontWeight: '700' }}>{p.nombre}</td>
                      <td style={tdC}>
                        <span style={{
                          fontSize: '10px', fontWeight: '700',
                          padding: '2px 8px', borderRadius: '20px',
                          background: BASE.bgSoft, border: `1px solid ${BASE.border}`, color: BASE.muted,
                        }}>{p.categoria || '—'}</span>
                      </td>
                      <td style={tdC}>
                        <input type="time" value={r.entrada} style={inp}
                          onChange={e => actualizar(p.id, 'entrada', e.target.value)} />
                      </td>
                      <td style={tdC}>
                        {(() => {
                          const pu = puntualidad(r.entradaReal);
                          if (!pu) return <span style={{ color: BASE.mutedSoft }}>—</span>;
                          return (
                            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '11px', color: BASE.text }}>{r.entradaReal}</span>
                              <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '1px 7px', borderRadius: '20px', background: pu.bg, color: pu.color }}>{pu.txt}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td style={tdC}>
                        <input type="time" value={r.salida} style={inp}
                          onChange={e => actualizar(p.id, 'salida', e.target.value)} />
                        {r.salidaReal && r.salidaReal !== r.salida && (
                          <div style={{ fontSize: '9.5px', color: BASE.mutedSoft, fontWeight: 700, marginTop: '2px' }}>
                            real {r.salidaReal}
                          </div>
                        )}
                      </td>
                      <td style={tdC}>
                        <input type="number" min="0" max="120" value={r.descanso ?? 60} style={{ ...inp, width: '60px' }}
                          onChange={e => actualizar(p.id, 'descanso', parseInt(e.target.value || '0', 10))} />
                      </td>
                      <td style={{ ...tdC, fontWeight: '800', color: BASE.green }}>{calc.hn || '—'}</td>
                      <td style={{ ...tdC, fontWeight: '800', color: BASE.gold }}>{calc.he || '—'}</td>
                      <td style={{ ...tdC, fontWeight: '900', color: BASE.navy }}>{calc.total || '—'}</td>
                      <td style={tdL}>
                        <input type="text" placeholder="—" value={r.observacion || ''}
                          onChange={e => actualizar(p.id, 'observacion', e.target.value)}
                          style={{ ...inp, width: '160px', textAlign: 'left' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Botón guardar */}
        {personalFrente.length > 0 && (
          <div style={{ padding: SPACING.md, borderTop: `1px solid ${BASE.border}`, background: BASE.bgSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md }}>
            <p style={{ fontSize: '11px', color: BASE.muted }}>
              📌 Solo se guardan filas con al menos hora de entrada. La fuente queda marcada como <strong>admin-manual</strong>.
            </p>
            <button onClick={guardar} disabled={guardando}
              style={{
                padding: '10px 22px',
                background: guardando ? BASE.muted : `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
                color: '#fff', border: 'none', borderRadius: RADIUS.md,
                fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px',
                cursor: guardando ? 'wait' : 'pointer',
                boxShadow: BASE.shadowMd,
              }}>
              {guardando ? 'Guardando…' : '💾 GUARDAR ASISTENCIA DEL DÍA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
