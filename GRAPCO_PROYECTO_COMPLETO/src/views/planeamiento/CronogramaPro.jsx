// src/views/planeamiento/CronogramaPro.jsx
// CRONOGRAMA PRO — planificador estilo MS Project / Primavera P6:
//   · Grilla editable tipo Excel (doble clic o clic en celda → editar)
//   · Dependencias FS/SS/FF/SF con lag ("3", "3FS+2", "5SS") → AUTO-SCHEDULING:
//     al cambiar una duración o predecesora se recalculan TODAS las fechas
//   · RUTA CRÍTICA en rojo (CPM: forward/backward pass + holguras)
//   · Gantt sincronizado con la grilla: barras, % avance, hitos, línea HOY
//   · Roll-up: las fases resumen suman fechas/duración/avance de sus hijas
//   · Persistencia por proyecto en Firestore (Cronogramas/{proyectoId})
//   · Pestaña "Plan base" con el Excel CREDITEX original de referencia
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import Icon from '../../components/Icon';
import VistaHeader from '../../components/VistaHeader';
import { calcularCPM, renumerarEDT, nuevoId, fechaDeIso, isoDeFecha, indiceDeFecha } from '../../utils/cpm';
import { CRONOGRAMAOBRA } from '../../data/cronogramaObraCreditex';
import CronogramaObra from './CronogramaObra';

const MONO = 'var(--grapco-font-mono, ui-monospace, monospace)';
const ROJO = '#DC2626';
const TEAL = '#0E7490';
const ALTO_FILA = 30;

// ── Seed: convierte el plan CREDITEX (Excel) al formato editable ──
function seedDesdeCreditex() {
  const parseFecha = (txt) => {
    const m = String(txt || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  };
  return CRONOGRAMAOBRA.tareas.map((t, i) => ({
    id: String(i + 1),
    nombre: t.nombre,
    nivel: Math.max(1, t.nivel || 1),
    duracion: Math.max(0, Math.round(t.duracionDias || 0)),
    predecesoras: '',
    avance: 0,
    inicioManual: parseFecha(t.comienzo),
  }));
}

const seedEnBlanco = () => ([
  { id: '1', nombre: 'FASE 1 — OBRAS PRELIMINARES', nivel: 1, duracion: 0, predecesoras: '', avance: 0, inicioManual: null },
  { id: '2', nombre: 'Trazo y replanteo', nivel: 2, duracion: 3, predecesoras: '', avance: 0, inicioManual: null },
  { id: '3', nombre: 'Movilización de equipos', nivel: 2, duracion: 2, predecesoras: '2SS', avance: 0, inicioManual: null },
  { id: '4', nombre: 'FASE 2 — ESTRUCTURAS', nivel: 1, duracion: 0, predecesoras: '', avance: 0, inicioManual: null },
  { id: '5', nombre: 'Excavación masiva', nivel: 2, duracion: 5, predecesoras: '2', avance: 0, inicioManual: null },
  { id: '6', nombre: 'Cimentación', nivel: 2, duracion: 8, predecesoras: '5', avance: 0, inicioManual: null },
  { id: '7', nombre: 'Hito: fin de cimentación', nivel: 2, duracion: 0, predecesoras: '6', avance: 0, inicioManual: null },
]);

const hoyIso = () => isoDeFecha(new Date());

export default function CronogramaPro() {
  const { proyectoActivoId } = useProyectoActivo();
  const [tab, setTab] = useState('pro');
  const [tareas, setTareas] = useState(null);          // null = cargando
  const [fechaInicio, setFechaInicio] = useState('2025-12-15');
  const [pxDia, setPxDia] = useState(8);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [edit, setEdit] = useState(null);              // { idx, campo, valor }
  const [sel, setSel] = useState(null);                // fila seleccionada

  // ── Cargar de Firestore ──
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'Cronogramas', proyectoActivoId || '_'));
        if (cancel) return;
        if (snap.exists()) {
          const d = snap.data();
          setTareas(d.tareas || []);
          if (d.fechaInicio) setFechaInicio(d.fechaInicio);
        } else {
          setTareas([]); // vacío → pantalla de arranque
        }
      } catch {
        if (!cancel) setTareas([]);
      }
    })();
    return () => { cancel = true; };
  }, [proyectoActivoId]);

  // ── CPM en vivo: cada edición recalcula toda la red ──
  const cpm = useMemo(() => {
    if (!tareas || !tareas.length) return null;
    return calcularCPM(renumerarEDT(tareas), fechaInicio);
  }, [tareas, fechaInicio]);

  const mutar = useCallback((fn) => {
    setTareas(prev => fn(prev));
    setSinGuardar(true);
  }, []);

  const setCampo = (idx, campo, valor) => mutar(prev => prev.map((t, i) => i === idx ? { ...t, [campo]: valor } : t));

  const insertarDebajo = (idx) => mutar(prev => {
    const id = nuevoId(prev);
    const nueva = { id, nombre: 'Nueva tarea', nivel: prev[idx]?.nivel || 1, duracion: 1, predecesoras: '', avance: 0, inicioManual: null };
    const arr = [...prev];
    arr.splice(idx + 1, 0, nueva);
    return arr;
  });

  const eliminar = (idx) => mutar(prev => prev.filter((_, i) => i !== idx));
  const indent = (idx, delta) => mutar(prev => prev.map((t, i) => i === idx ? { ...t, nivel: Math.max(1, (t.nivel || 1) + delta) } : t));
  const mover = (idx, delta) => mutar(prev => {
    const j = idx + delta;
    if (j < 0 || j >= prev.length) return prev;
    const arr = [...prev];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    return arr;
  });

  const guardar = async () => {
    if (!proyectoActivoId) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'Cronogramas', proyectoActivoId), {
        proyectoId: proyectoActivoId,
        fechaInicio,
        tareas: tareas.map(({ id, nombre, nivel, duracion, predecesoras, avance, inicioManual }) =>
          ({ id, nombre, nivel, duracion, predecesoras: predecesoras || '', avance: avance || 0, inicioManual: inicioManual || null })),
        actualizadoEn: serverTimestamp(),
      });
      setSinGuardar(false);
    } finally {
      setGuardando(false);
    }
  };

  // ── celda editable ──
  const commitEdit = () => {
    if (!edit) return;
    const { idx, campo, valor } = edit;
    if (campo === 'duracion') setCampo(idx, campo, Math.max(0, parseFloat(valor) || 0));
    else if (campo === 'avance') setCampo(idx, campo, Math.min(100, Math.max(0, Math.round(parseFloat(valor) || 0))));
    else setCampo(idx, campo, valor);
    setEdit(null);
  };

  const Celda = ({ idx, campo, valor, ancho, mono, placeholder, tipo = 'text', alinear = 'left', negrita }) => {
    const activo = edit && edit.idx === idx && edit.campo === campo;
    if (activo) {
      return (
        <input autoFocus type={tipo} value={edit.valor}
          onChange={e => setEdit({ ...edit, valor: e.target.value })}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEdit(null); }}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '4px 6px',
            border: `2px solid ${BASE.gold}`, borderRadius: '4px', outline: 'none',
            fontSize: '11.5px', fontFamily: mono ? MONO : 'inherit', background: '#fff',
          }} />
      );
    }
    return (
      <div onClick={() => setEdit({ idx, campo, valor: valor ?? '' })}
        title="Clic para editar"
        style={{
          padding: '4px 6px', minHeight: '18px', cursor: 'text', borderRadius: '4px',
          fontSize: '11.5px', fontFamily: mono ? MONO : 'inherit',
          fontWeight: negrita ? 700 : 500, textAlign: alinear,
          color: valor === '' || valor == null ? BASE.mutedSoft : BASE.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
        {valor === '' || valor == null ? (placeholder || '—') : String(valor)}
      </div>
    );
  };

  // ── Cabecera del Gantt: semanas (cada 6 días laborables) con fecha de lunes ──
  const gantt = useMemo(() => {
    if (!cpm) return null;
    const totalDias = Math.max(cpm.duracionProyecto + 12, 30);
    const ancho = totalDias * pxDia;
    const semanas = [];
    for (let d = 0; d < totalDias; d += 6) semanas.push(d);
    const idxHoy = indiceDeFecha(fechaInicio, hoyIso());
    return { totalDias, ancho, semanas, idxHoy };
  }, [cpm, pxDia, fechaInicio]);

  if (tareas === null) {
    return <p style={{ padding: '40px', color: BASE.muted, fontSize: '13px' }}>Cargando cronograma…</p>;
  }

  // ── Pantalla de arranque (sin cronograma aún) ──
  const arranque = !tareas.length && (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px',
      padding: '48px 32px', textAlign: 'center', boxShadow: BASE.shadowMd,
    }}>
      <Icon name="clock" size={40} color={BASE.gold} strokeWidth={1.6} />
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: BASE.navy, margin: '14px 0 6px', letterSpacing: '0.5px' }}>
        ESTE PROYECTO AÚN NO TIENE CRONOGRAMA
      </h3>
      <p style={{ fontSize: '12.5px', color: BASE.muted, maxWidth: '460px', margin: '0 auto 22px', lineHeight: 1.6 }}>
        Crea el plan desde cero o importa el plan base de obra. Luego define duraciones y
        predecesoras — las fechas, la ruta crítica y las holguras se calculan solas (CPM,
        como MS Project / Primavera P6).
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => { mutar(() => seedDesdeCreditex()); }} style={{
          padding: '12px 22px', background: BASE.navy, color: '#fff', border: 'none', borderRadius: '10px',
          fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.4px',
        }}>
          IMPORTAR PLAN CREDITEX ({CRONOGRAMAOBRA.totalTareas} tareas)
        </button>
        <button onClick={() => { mutar(() => seedEnBlanco()); }} style={{
          padding: '12px 22px', background: BASE.white, color: BASE.navy, border: `1.5px solid ${BASE.border}`,
          borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
        }}>
          Empezar con plantilla en blanco
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <VistaHeader icono="clock" eyebrow="Planeamiento · CPM"
        titulo="Cronograma de Obra"
        subtitulo="Planificador con ruta crítica, dependencias y auto-scheduling — estilo MS Project / Primavera P6" />

      {/* Tabs */}
      <div style={{ display: 'inline-flex', background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '3px', gap: '2px', alignSelf: 'flex-start' }}>
        {[['pro', 'CRONOGRAMA PRO'], ['base', 'PLAN BASE (EXCEL)']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '7px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.8px',
            background: tab === k ? BASE.navy : 'transparent', color: tab === k ? '#fff' : BASE.muted,
            transition: 'all 0.15s ease',
          }}>{lbl}</button>
        ))}
      </div>

      {tab === 'base' && <CronogramaObra />}

      {tab === 'pro' && (arranque || (
        <>
          {/* KPIs + toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap',
            background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px',
            padding: '10px 16px', boxShadow: BASE.shadowSm,
          }}>
            {[
              ['FIN DE OBRA', cpm ? cpm.finProyecto : '—'],
              ['DURACIÓN', cpm ? `${cpm.duracionProyecto} d` : '—'],
              ['AVANCE', cpm ? `${cpm.avanceGlobal}%` : '—'],
              ['TAREAS CRÍTICAS', cpm ? cpm.criticas : '—', cpm && cpm.criticas > 0 ? ROJO : undefined],
              ['TAREAS', tareas.length],
            ].map(([lbl, val, color], i) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span style={{ width: '1px', height: '22px', background: BASE.border, margin: '0 14px' }} />}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: BASE.mutedSoft, letterSpacing: '1px' }}>{lbl}</p>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: color || BASE.navy, fontFamily: MONO }}>{val}</p>
                </div>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: BASE.muted, letterSpacing: '0.8px' }}>INICIO DE OBRA</label>
              <input type="date" value={fechaInicio} onChange={e => { setFechaInicio(e.target.value); setSinGuardar(true); }}
                style={{ padding: '6px 8px', border: `1.5px solid ${BASE.border}`, borderRadius: '7px', fontSize: '11.5px', fontFamily: MONO }} />
              <div style={{ display: 'inline-flex', border: `1px solid ${BASE.border}`, borderRadius: '7px', overflow: 'hidden' }}>
                {[[4, 'S'], [8, 'M'], [14, 'L']].map(([px, lbl]) => (
                  <button key={px} onClick={() => setPxDia(px)} style={{
                    padding: '6px 10px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 800,
                    background: pxDia === px ? BASE.navy : BASE.white, color: pxDia === px ? '#fff' : BASE.muted,
                  }}>{lbl}</button>
                ))}
              </div>
              <button onClick={() => insertarDebajo(tareas.length - 1)} style={{
                padding: '8px 14px', background: BASE.white, color: BASE.navy, border: `1.5px solid ${BASE.border}`,
                borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
              }}>+ Tarea</button>
              <button onClick={guardar} disabled={!sinGuardar || guardando} style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: sinGuardar ? 'pointer' : 'default',
                background: sinGuardar ? BASE.navy : BASE.bgSoft, color: sinGuardar ? BASE.gold : BASE.mutedSoft,
                fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.4px',
              }}>{guardando ? 'Guardando…' : sinGuardar ? 'GUARDAR CAMBIOS' : 'Guardado ✓'}</button>
            </div>
          </div>

          {cpm?.errores?.length > 0 && (
            <div style={{ background: '#FEF2F2', border: `1px solid ${ROJO}40`, borderRadius: '10px', padding: '9px 14px', fontSize: '11.5px', color: ROJO, fontWeight: 600 }}>
              {cpm.errores.join(' · ')}
            </div>
          )}

          {/* ══ GRILLA + GANTT (scroll vertical compartido) ══ */}
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', boxShadow: BASE.shadowMd, overflow: 'hidden' }}>
            <div style={{ display: 'flex', maxHeight: '62vh', overflowY: 'auto' }}>

              {/* ── Panel izquierdo: grilla tipo Excel ── */}
              <div style={{ flexShrink: 0, borderRight: `2px solid ${BASE.navy}22`, zIndex: 2, background: BASE.white }}>
                <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      {[['', 86], ['EDT', 52], ['NOMBRE DE TAREA', 260], ['DUR (d)', 50], ['INICIO', 78], ['FIN', 78], ['PRED.', 72], ['%', 42], ['HOLG.', 46]].map(([h, w]) => (
                        <th key={h || 'acc'} style={{
                          position: 'sticky', top: 0, zIndex: 3,
                          width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`,
                          background: BASE.navy, color: '#fff', fontSize: '9.5px', fontWeight: 800,
                          letterSpacing: '0.8px', padding: '9px 6px', textAlign: 'left',
                          borderRight: '1px solid rgba(255,255,255,0.08)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(cpm?.tareas || []).map((t, idx) => (
                      <tr key={t.id}
                        onMouseEnter={() => setSel(idx)}
                        style={{
                          height: `${ALTO_FILA}px`,
                          background: sel === idx ? BASE.goldSoft : (t.resumen ? BASE.navySoft : (idx % 2 ? BASE.bgSoft : BASE.white)),
                          borderBottom: `1px solid ${BASE.borderSoft}`,
                        }}>
                        {/* Acciones */}
                        <td style={{ padding: '0 4px', whiteSpace: 'nowrap' }}>
                          {[['+', () => insertarDebajo(idx), 'Insertar debajo'], ['◀', () => indent(idx, -1), 'Subir nivel'], ['▶', () => indent(idx, 1), 'Bajar nivel (sub-tarea)'], ['↑', () => mover(idx, -1), 'Mover arriba'], ['↓', () => mover(idx, 1), 'Mover abajo'], ['×', () => eliminar(idx), 'Eliminar']].map(([s, fn, tip]) => (
                            <button key={s} onClick={fn} title={tip} style={{
                              width: '13px', padding: 0, marginRight: '1px', border: 'none', background: 'transparent',
                              color: s === '×' ? `${ROJO}99` : BASE.mutedSoft, fontSize: '9.5px', cursor: 'pointer', fontWeight: 700,
                            }}>{s}</button>
                          ))}
                        </td>
                        <td style={{ fontFamily: MONO, fontSize: '10px', color: BASE.mutedSoft, padding: '0 6px' }}>{t.edt}</td>
                        <td style={{ padding: 0, paddingLeft: `${((t.nivel || 1) - 1) * 14}px` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {t.resumen && <span style={{ color: BASE.navy, fontSize: '8px' }}>▼</span>}
                            {t.milestone && <span style={{ color: BASE.goldDark, fontSize: '9px' }}>◆</span>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Celda idx={idx} campo="nombre" valor={t.nombre} negrita={t.resumen} />
                            </div>
                          </div>
                        </td>
                        <td>{t.resumen
                          ? <div style={{ fontSize: '11.5px', fontFamily: MONO, color: BASE.muted, textAlign: 'center', fontWeight: 700 }}>{Math.round(t.duracion * 10) / 10}</div>
                          : <Celda idx={idx} campo="duracion" valor={t.duracion} mono alinear="center" />}
                        </td>
                        <td style={{ fontFamily: MONO, fontSize: '10.5px', color: BASE.text, padding: '0 6px' }}>{t.inicio}</td>
                        <td style={{ fontFamily: MONO, fontSize: '10.5px', color: BASE.text, padding: '0 6px' }}>{t.fin}</td>
                        <td>{!t.resumen && <Celda idx={idx} campo="predecesoras" valor={t.predecesoras} mono alinear="center" placeholder="·" />}</td>
                        <td>{t.resumen
                          ? <div style={{ fontSize: '11px', fontFamily: MONO, color: BASE.muted, textAlign: 'center', fontWeight: 700 }}>{t.avance}%</div>
                          : <Celda idx={idx} campo="avance" valor={t.avance} mono alinear="center" />}
                        </td>
                        <td style={{
                          fontFamily: MONO, fontSize: '10.5px', textAlign: 'center', fontWeight: 700,
                          color: t.critica ? ROJO : (t.holgura > 0 ? BASE.green : BASE.mutedSoft),
                        }}>{t.resumen ? '' : t.holgura}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Panel derecho: GANTT ── */}
              {gantt && (
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <div style={{ width: `${gantt.ancho}px`, position: 'relative' }}>
                    {/* Cabecera semanas (sticky) */}
                    <div style={{
                      position: 'sticky', top: 0, zIndex: 2, display: 'flex',
                      background: BASE.navy, height: '32px', alignItems: 'stretch',
                    }}>
                      {gantt.semanas.map(d => (
                        <div key={d} style={{
                          width: `${6 * pxDia}px`, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.12)',
                          display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '4px',
                        }}>
                          <span style={{ fontSize: '8px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.5px' }}>S{Math.floor(d / 6) + 1}</span>
                          {pxDia >= 8 && <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontFamily: MONO }}>
                            {isoDeFecha(fechaDeIso(fechaInicio)).slice(5) && (() => { const f = new Date(fechaDeIso(fechaInicio)); f.setDate(f.getDate() + Math.floor(d * 7 / 6)); return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`; })()}
                          </span>}
                        </div>
                      ))}
                    </div>

                    {/* Cuerpo SVG */}
                    <svg width={gantt.ancho} height={(cpm.tareas.length) * ALTO_FILA} style={{ display: 'block' }}>
                      {/* Rejilla semanal + zebra */}
                      {cpm.tareas.map((t, i) => (
                        <rect key={`z${i}`} x={0} y={i * ALTO_FILA} width={gantt.ancho} height={ALTO_FILA}
                          fill={sel === i ? `${BASE.gold}1a` : (i % 2 ? BASE.bgSoft : '#fff')}
                          onMouseEnter={() => setSel(i)} />
                      ))}
                      {gantt.semanas.map(d => (
                        <line key={`g${d}`} x1={d * pxDia} y1={0} x2={d * pxDia} y2={cpm.tareas.length * ALTO_FILA}
                          stroke={BASE.borderSoft} strokeWidth={1} />
                      ))}

                      {/* Línea HOY */}
                      {gantt.idxHoy >= 0 && gantt.idxHoy <= gantt.totalDias && (
                        <line x1={gantt.idxHoy * pxDia} y1={0} x2={gantt.idxHoy * pxDia} y2={cpm.tareas.length * ALTO_FILA}
                          stroke={ROJO} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                      )}

                      {/* Barras */}
                      {cpm.tareas.map((t, i) => {
                        const y = i * ALTO_FILA;
                        const x = t.es * pxDia;
                        const w = Math.max((t.ef - t.es) * pxDia, 2);
                        if (t.milestone) {
                          const cx = x, cy = y + ALTO_FILA / 2;
                          return <path key={t.id} d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy} L ${cx} ${cy + 6} L ${cx - 6} ${cy} Z`}
                            fill={BASE.goldDark} stroke="#fff" strokeWidth={1} />;
                        }
                        if (t.resumen) {
                          return (
                            <g key={t.id}>
                              <rect x={x} y={y + 8} width={w} height={6} rx={1} fill={BASE.navy} />
                              <path d={`M ${x} ${y + 14} l 5 6 l -5 0 Z`} fill={BASE.navy} />
                              <path d={`M ${x + w} ${y + 14} l 0 6 l -5 -6 Z`} fill={BASE.navy} />
                            </g>
                          );
                        }
                        const color = t.critica ? ROJO : TEAL;
                        const wAv = w * Math.min(100, t.avance || 0) / 100;
                        return (
                          <g key={t.id}>
                            <rect x={x} y={y + 8} width={w} height={14} rx={3} fill={color} opacity={0.32} />
                            <rect x={x} y={y + 8} width={wAv} height={14} rx={3} fill={color} />
                            {pxDia >= 8 && w > 34 && (
                              <text x={x + w + 5} y={y + 19} fontSize="8.5" fill={BASE.mutedSoft} fontFamily={MONO}>
                                {Math.round(t.avance || 0)}%
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Pie: leyenda + ayuda de predecesoras */}
            <div style={{
              display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
              padding: '9px 16px', borderTop: `1px solid ${BASE.borderSoft}`, background: BASE.bgSoft,
            }}>
              {[[TEAL, 'Tarea'], [ROJO, 'Ruta crítica'], [BASE.navy, 'Fase resumen'], [BASE.goldDark, 'Hito ◆']].map(([c, l]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 600, color: BASE.muted }}>
                  <span style={{ width: '14px', height: '8px', borderRadius: '2px', background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: BASE.mutedSoft }}>
                PRED.: «3» = después de la tarea 3 · «3SS» = empiezan juntas · «3FS+2» = 2 días después · «3FF» = terminan juntas. La holgura es cuántos días puede atrasarse sin mover el fin de obra.
              </span>
            </div>
          </div>
        </>
      ))}
    </div>
  );
}
