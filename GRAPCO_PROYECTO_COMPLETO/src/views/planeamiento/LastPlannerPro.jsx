// src/views/planeamiento/LastPlannerPro.jsx
// LAST PLANNER SYSTEM — el ciclo Lean completo, conectado al Cronograma Pro:
//   1) LOOKAHEAD (4 semanas): se llena SOLO con las tareas del cronograma CPM
//      que caen en la ventana; el último planificador libera restricciones.
//   2) PLAN SEMANAL: compromisos de la semana (desde el lookahead o manuales).
//   3) PPC + CNC: % de Plan Completado semana a semana y pareto de causas
//      de no cumplimiento — la métrica madre del Last Planner.
// Persistencia por proyecto: LPS/{proyectoId}.
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import VistaHeader from '../../components/VistaHeader';
import { calcularCPM, renumerarEDT, isoDeFecha, fechaDeIso } from '../../utils/cpm';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend, ReferenceLine,
} from 'recharts';

const MONO = 'var(--grapco-font-mono, ui-monospace, monospace)';
const ROJO = '#DC2626';
const TEAL = '#0E7490';

// Catálogo Lean de Causas de No Cumplimiento (CNC)
export const CNC = [
  ['MO', 'Falta de mano de obra'],
  ['MAT', 'Falta de materiales'],
  ['EQ', 'Equipos / herramientas'],
  ['ING', 'Ingeniería / planos'],
  ['CLI', 'Cliente / permisos'],
  ['CLIMA', 'Clima'],
  ['PRED', 'Predecesora no terminó'],
  ['PROG', 'Mala programación'],
  ['OTRO', 'Otro'],
];

const lunesDe = (dt) => { const d = new Date(dt); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(12, 0, 0, 0); return d; };
const addDias = (dt, n) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
const fmtCorto = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;

export default function LastPlannerPro() {
  const { proyectoActivoId } = useProyectoActivo();
  const [crono, setCrono] = useState(null);        // doc Cronogramas (o false si no hay)
  const [lps, setLps] = useState(null);            // doc LPS
  const [semanaIso, setSemanaIso] = useState(isoDeFecha(lunesDe(new Date())));
  const [sinGuardar, setSinGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [manual, setManual] = useState('');

  // ── Cargar cronograma + LPS ──
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [cSnap, lSnap] = await Promise.all([
          getDoc(doc(db, 'Cronogramas', proyectoActivoId || '_')),
          getDoc(doc(db, 'LPS', proyectoActivoId || '_')),
        ]);
        if (cancel) return;
        setCrono(cSnap.exists() ? cSnap.data() : false);
        setLps(lSnap.exists() ? lSnap.data() : { restricciones: {}, semanas: {} });
      } catch {
        if (!cancel) { setCrono(false); setLps({ restricciones: {}, semanas: {} }); }
      }
    })();
    return () => { cancel = true; };
  }, [proyectoActivoId]);

  // ── CPM del cronograma (fechas reales por tarea) ──
  const cpm = useMemo(() => {
    if (!crono || !crono.tareas?.length) return null;
    return calcularCPM(renumerarEDT(crono.tareas), crono.fechaInicio || '2025-12-15');
  }, [crono]);

  // ── LOOKAHEAD: tareas hoja del cronograma en las próximas 4 semanas ──
  const lunes = useMemo(() => fechaDeIso(semanaIso), [semanaIso]);
  const lookahead = useMemo(() => {
    if (!cpm) return [];
    const ini = isoDeFecha(lunes);
    const fin = isoDeFecha(addDias(lunes, 27)); // 4 semanas
    return cpm.tareas.filter(t =>
      !t.resumen && t.duracion >= 0 && (t.avance || 0) < 100 &&
      t.inicio <= fin && t.fin >= ini
    );
  }, [cpm, lunes]);

  const semana = lps?.semanas?.[semanaIso] || { compromisos: [] };
  const restricciones = lps?.restricciones || {};

  const mutarLps = (fn) => { setLps(prev => fn(prev)); setSinGuardar(true); };

  const setRestriccion = (tareaId, causa) => mutarLps(prev => ({
    ...prev,
    restricciones: { ...prev.restricciones, [tareaId]: causa || undefined },
  }));

  const comprometer = (t) => mutarLps(prev => {
    const sem = prev.semanas?.[semanaIso] || { compromisos: [] };
    if (sem.compromisos.some(c => c.tareaId === t.id)) return prev;
    return {
      ...prev,
      semanas: {
        ...prev.semanas,
        [semanaIso]: {
          ...sem,
          compromisos: [...sem.compromisos, {
            id: `${t.id}_${Date.now()}`, tareaId: t.id, edt: t.edt,
            nombre: t.nombre, responsable: '', cumplido: null, causa: '',
          }],
        },
      },
    };
  });

  const agregarManual = () => {
    const txt = manual.trim();
    if (!txt) return;
    mutarLps(prev => {
      const sem = prev.semanas?.[semanaIso] || { compromisos: [] };
      return {
        ...prev,
        semanas: {
          ...prev.semanas,
          [semanaIso]: {
            ...sem,
            compromisos: [...sem.compromisos, {
              id: `m_${Date.now()}`, tareaId: null, edt: '—',
              nombre: txt, responsable: '', cumplido: null, causa: '',
            }],
          },
        },
      };
    });
    setManual('');
  };

  const setCompromiso = (id, campo, valor) => mutarLps(prev => {
    const sem = prev.semanas?.[semanaIso] || { compromisos: [] };
    return {
      ...prev,
      semanas: {
        ...prev.semanas,
        [semanaIso]: {
          ...sem,
          compromisos: sem.compromisos.map(c => c.id === id ? { ...c, [campo]: valor } : c),
        },
      },
    };
  });

  const quitarCompromiso = (id) => mutarLps(prev => {
    const sem = prev.semanas?.[semanaIso] || { compromisos: [] };
    return {
      ...prev,
      semanas: { ...prev.semanas, [semanaIso]: { ...sem, compromisos: sem.compromisos.filter(c => c.id !== id) } },
    };
  });

  const guardar = async () => {
    if (!proyectoActivoId || !lps) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'LPS', proyectoActivoId), {
        ...lps,
        proyectoId: proyectoActivoId,
        actualizadoEn: serverTimestamp(),
      });
      setSinGuardar(false);
    } finally {
      setGuardando(false);
    }
  };

  // ── PPC histórico + pareto CNC ──
  const ppcData = useMemo(() => {
    if (!lps?.semanas) return [];
    return Object.entries(lps.semanas)
      .map(([iso, s]) => {
        const evaluados = (s.compromisos || []).filter(c => c.cumplido != null);
        const cumplidos = evaluados.filter(c => c.cumplido === true).length;
        return {
          iso,
          sem: fmtCorto(fechaDeIso(iso)),
          PPC: evaluados.length ? Math.round(cumplidos / evaluados.length * 100) : null,
          Compromisos: (s.compromisos || []).length,
        };
      })
      .filter(d => d.Compromisos > 0)
      .sort((a, b) => a.iso.localeCompare(b.iso));
  }, [lps]);

  const pareto = useMemo(() => {
    if (!lps?.semanas) return [];
    const conteo = {};
    Object.values(lps.semanas).forEach(s => (s.compromisos || []).forEach(c => {
      if (c.cumplido === false && c.causa) conteo[c.causa] = (conteo[c.causa] || 0) + 1;
    }));
    return Object.entries(conteo)
      .map(([k, n]) => ({ causa: CNC.find(c => c[0] === k)?.[1] || k, n }))
      .sort((a, b) => b.n - a.n);
  }, [lps]);

  const ppcSemana = useMemo(() => {
    const evaluados = semana.compromisos.filter(c => c.cumplido != null);
    if (!evaluados.length) return null;
    return Math.round(evaluados.filter(c => c.cumplido === true).length / evaluados.length * 100);
  }, [semana]);

  const tit = (txt) => (
    <p style={{ fontSize: '12px', fontWeight: 800, color: BASE.navy, letterSpacing: '1.1px', marginBottom: '10px' }}>{txt}</p>
  );

  if (crono === null || lps === null) {
    return <p style={{ padding: '40px', color: BASE.muted, fontSize: '13px' }}>Cargando Last Planner…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <VistaHeader icono="target" eyebrow="Planeamiento · Lean"
        titulo="Last Planner System"
        subtitulo="Lookahead desde el cronograma, compromisos semanales, PPC y causas de no cumplimiento" />

      {/* Selector de semana + PPC + guardar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px',
        padding: '10px 16px', boxShadow: BASE.shadowSm,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setSemanaIso(isoDeFecha(addDias(lunes, -7)))} style={{
            width: '28px', height: '28px', border: `1.5px solid ${BASE.border}`, borderRadius: '7px',
            background: BASE.white, cursor: 'pointer', fontWeight: 800, color: BASE.navy,
          }}>‹</button>
          <div style={{ textAlign: 'center', minWidth: '170px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: BASE.mutedSoft, letterSpacing: '1px' }}>SEMANA DEL</p>
            <p style={{ fontSize: '13px', fontWeight: 800, color: BASE.navy, fontFamily: MONO }}>
              {fmtCorto(lunes)} — {fmtCorto(addDias(lunes, 6))}
            </p>
          </div>
          <button onClick={() => setSemanaIso(isoDeFecha(addDias(lunes, 7)))} style={{
            width: '28px', height: '28px', border: `1.5px solid ${BASE.border}`, borderRadius: '7px',
            background: BASE.white, cursor: 'pointer', fontWeight: 800, color: BASE.navy,
          }}>›</button>
        </div>
        <span style={{ width: '1px', height: '26px', background: BASE.border }} />
        {[
          ['COMPROMISOS', semana.compromisos.length],
          ['PPC SEMANA', ppcSemana == null ? '—' : `${ppcSemana}%`, ppcSemana != null && (ppcSemana >= 80 ? BASE.green : ppcSemana >= 60 ? BASE.goldDark : ROJO)],
          ['EN LOOKAHEAD', lookahead.length],
        ].map(([lbl, val, color]) => (
          <div key={lbl}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: BASE.mutedSoft, letterSpacing: '1px' }}>{lbl}</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: color || BASE.navy, fontFamily: MONO }}>{val}</p>
          </div>
        ))}
        <button onClick={guardar} disabled={!sinGuardar || guardando} style={{
          marginLeft: 'auto', padding: '9px 18px', borderRadius: '8px', border: 'none',
          cursor: sinGuardar ? 'pointer' : 'default',
          background: sinGuardar ? BASE.navy : BASE.bgSoft, color: sinGuardar ? BASE.gold : BASE.mutedSoft,
          fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.4px',
        }}>{guardando ? 'Guardando…' : sinGuardar ? 'GUARDAR CAMBIOS' : 'Guardado ✓'}</button>
      </div>

      {/* ══ 1) LOOKAHEAD 4 SEMANAS ══ */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '16px 18px', boxShadow: BASE.shadowMd }}>
        {tit('1 · LOOKAHEAD — PRÓXIMAS 4 SEMANAS (DESDE EL CRONOGRAMA)')}
        {!cpm ? (
          <p style={{ fontSize: '12.5px', color: BASE.muted }}>
            Este proyecto aún no tiene cronograma. Créalo primero en <strong>Cronograma de Obra</strong> — el lookahead se llena solo desde ahí.
          </p>
        ) : !lookahead.length ? (
          <p style={{ fontSize: '12.5px', color: BASE.muted }}>No hay tareas del cronograma en esta ventana de 4 semanas.</p>
        ) : (
          <div style={{ overflowX: 'auto', border: `1px solid ${BASE.borderSoft}`, borderRadius: '10px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '760px' }}>
              <thead>
                <tr>
                  {['EDT', 'TAREA', 'INICIO', 'FIN', 'DUR', 'AVANCE', 'RESTRICCIÓN (liberar antes de comprometer)', ''].map(h => (
                    <th key={h} style={{
                      background: BASE.navy, color: '#fff', fontSize: '9.5px', fontWeight: 800,
                      letterSpacing: '0.8px', padding: '8px 8px', textAlign: 'left', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lookahead.map((t, i) => {
                  const restr = restricciones[t.id] || '';
                  const comprometida = semana.compromisos.some(c => c.tareaId === t.id);
                  return (
                    <tr key={t.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.borderSoft}` }}>
                      <td style={{ padding: '6px 8px', fontFamily: MONO, fontSize: '10px', color: BASE.mutedSoft }}>{t.edt}</td>
                      <td style={{ padding: '6px 8px', fontSize: '11.5px', fontWeight: 600, color: BASE.text }}>
                        {t.critica && <span title="Ruta crítica" style={{ color: ROJO, marginRight: '5px', fontWeight: 900 }}>●</span>}
                        {t.nombre}
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: MONO, fontSize: '10.5px' }}>{t.inicio}</td>
                      <td style={{ padding: '6px 8px', fontFamily: MONO, fontSize: '10.5px' }}>{t.fin}</td>
                      <td style={{ padding: '6px 8px', fontFamily: MONO, fontSize: '10.5px', textAlign: 'center' }}>{t.duracion}d</td>
                      <td style={{ padding: '6px 8px', fontFamily: MONO, fontSize: '10.5px', textAlign: 'center' }}>{Math.round(t.avance || 0)}%</td>
                      <td style={{ padding: '6px 8px' }}>
                        <select value={restr} onChange={e => setRestriccion(t.id, e.target.value)} style={{
                          padding: '5px 8px', borderRadius: '7px', fontSize: '11px', cursor: 'pointer',
                          border: restr ? `1.5px solid ${ROJO}80` : `1.5px solid ${BASE.green}80`,
                          background: restr ? '#FEF2F2' : '#F0FDF4',
                          color: restr ? ROJO : BASE.greenDark, fontWeight: 700,
                        }}>
                          <option value="">LIBRE ✓</option>
                          {CNC.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <button onClick={() => comprometer(t)} disabled={!!restr || comprometida}
                          title={restr ? 'Libera la restricción primero' : comprometida ? 'Ya está en el plan semanal' : 'Agregar al plan de esta semana'}
                          style={{
                            padding: '6px 12px', borderRadius: '7px', border: 'none', whiteSpace: 'nowrap',
                            cursor: (!restr && !comprometida) ? 'pointer' : 'not-allowed',
                            background: comprometida ? BASE.greenLight : (restr ? BASE.bgSoft : BASE.navy),
                            color: comprometida ? BASE.greenDark : (restr ? BASE.mutedSoft : BASE.gold),
                            fontSize: '10.5px', fontWeight: 800,
                          }}>
                          {comprometida ? 'EN PLAN ✓' : '→ COMPROMETER'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ 2) PLAN SEMANAL ══ */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '16px 18px', boxShadow: BASE.shadowMd }}>
        {tit(`2 · PLAN SEMANAL — COMPROMISOS (${fmtCorto(lunes)} al ${fmtCorto(addDias(lunes, 6))})`)}
        {semana.compromisos.length === 0 && (
          <p style={{ fontSize: '12.5px', color: BASE.muted, marginBottom: '10px' }}>
            Aún no hay compromisos esta semana. Trae tareas LIBRES desde el lookahead o agrega un compromiso manual.
          </p>
        )}
        {semana.compromisos.map(c => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            padding: '8px 10px', borderRadius: '9px', marginBottom: '6px',
            background: c.cumplido === true ? '#F0FDF4' : c.cumplido === false ? '#FEF2F2' : BASE.bgSoft,
            border: `1px solid ${c.cumplido === true ? BASE.green + '50' : c.cumplido === false ? ROJO + '40' : BASE.borderSoft}`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: '10px', color: BASE.mutedSoft, width: '44px' }}>{c.edt}</span>
            <span style={{ flex: '2 1 240px', fontSize: '12px', fontWeight: 600, color: BASE.text }}>{c.nombre}</span>
            <input value={c.responsable} placeholder="Responsable…" onChange={e => setCompromiso(c.id, 'responsable', e.target.value)}
              style={{
                flex: '1 1 130px', minWidth: '110px', padding: '6px 8px', borderRadius: '7px',
                border: `1.5px solid ${BASE.border}`, fontSize: '11px',
              }} />
            <div style={{ display: 'inline-flex', borderRadius: '7px', overflow: 'hidden', border: `1px solid ${BASE.border}` }}>
              {[['✓', true, BASE.green], ['✗', false, ROJO], ['—', null, BASE.mutedSoft]].map(([s, v, col]) => (
                <button key={String(v)} onClick={() => setCompromiso(c.id, 'cumplido', v)} style={{
                  width: '30px', padding: '5px 0', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '11px',
                  background: c.cumplido === v ? col : BASE.white,
                  color: c.cumplido === v ? '#fff' : BASE.mutedSoft,
                }}>{s}</button>
              ))}
            </div>
            {c.cumplido === false && (
              <select value={c.causa} onChange={e => setCompromiso(c.id, 'causa', e.target.value)} style={{
                padding: '6px 8px', borderRadius: '7px', fontSize: '11px', fontWeight: 700,
                border: `1.5px solid ${ROJO}60`, background: '#FEF2F2', color: ROJO, cursor: 'pointer',
              }}>
                <option value="">¿Causa (CNC)?</option>
                {CNC.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
            <button onClick={() => quitarCompromiso(c.id)} style={{
              border: 'none', background: 'transparent', color: BASE.mutedSoft, cursor: 'pointer',
              fontSize: '14px', fontWeight: 800, padding: '0 4px',
            }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <input value={manual} placeholder="Compromiso manual (fuera del cronograma)…"
            onChange={e => setManual(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') agregarManual(); }}
            style={{ flex: 1, padding: '9px 12px', borderRadius: '9px', border: `1.5px solid ${BASE.border}`, fontSize: '12px' }} />
          <button onClick={agregarManual} style={{
            padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${BASE.border}`,
            background: BASE.white, color: BASE.navy, fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
          }}>+ Agregar</button>
        </div>
      </div>

      {/* ══ 3) PPC + PARETO CNC ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '12px' }}>
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '16px 12px', boxShadow: BASE.shadowMd }}>
          <div style={{ padding: '0 6px' }}>{tit('3 · PPC SEMANAL — % DE PLAN COMPLETADO')}</div>
          {ppcData.length === 0 ? (
            <p style={{ fontSize: '12px', color: BASE.muted, padding: '0 6px' }}>Cierra tu primera semana (marca ✓/✗ en los compromisos) para ver la tendencia.</p>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ppcData} margin={{ top: 6, right: 16, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={BASE.borderSoft} strokeDasharray="3 3" />
                  <XAxis dataKey="sem" tick={{ fontSize: 10, fill: BASE.muted }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: BASE.muted }} unit="%" />
                  <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: `1px solid ${BASE.border}` }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReferenceLine y={80} stroke={BASE.green} strokeDasharray="5 4" label={{ value: 'Meta 80%', fontSize: 9, fill: BASE.green, position: 'right' }} />
                  <Bar dataKey="PPC" fill={BASE.navy} radius={[4, 4, 0, 0]} barSize={26} />
                  <Line type="monotone" dataKey="PPC" stroke={BASE.gold} strokeWidth={2.5} dot={{ r: 3, fill: BASE.gold }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '16px 18px', boxShadow: BASE.shadowMd }}>
          {tit('4 · PARETO — CAUSAS DE NO CUMPLIMIENTO (CNC)')}
          {pareto.length === 0 ? (
            <p style={{ fontSize: '12px', color: BASE.muted }}>Sin causas registradas aún. Cuando un compromiso no se cumpla, registra su causa para atacar la raíz.</p>
          ) : (
            pareto.map((p, i) => {
              const max = pareto[0].n;
              return (
                <div key={p.causa} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: BASE.text, marginBottom: '3px' }}>
                    <span>{i + 1}. {p.causa}</span>
                    <span style={{ fontFamily: MONO, color: ROJO }}>{p.n}</span>
                  </div>
                  <div style={{ height: '8px', background: BASE.bgSoft, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${p.n / max * 100}%`, height: '100%', background: i === 0 ? ROJO : i === 1 ? BASE.goldDark : BASE.navyLight, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
