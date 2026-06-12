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
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { useCatalogoWBS } from '../../hooks/useCatalogoWBS';
import { BASE } from '../../utils/styles';
import Icon from '../../components/Icon';
import VistaHeader from '../../components/VistaHeader';
import ConfirmModal from '../../components/ConfirmModal';
import SkeletonPantalla from '../../components/SkeletonPantalla';
import { calcularCPM, renumerarEDT, nuevoId, fechaDeIso, isoDeFecha, indiceDeFecha } from '../../utils/cpm';
import { CRONOGRAMAOBRA } from '../../data/cronogramaObraCreditex';
import CronogramaObra from './CronogramaObra';
import GateProyectoLegacy from '../../components/GateProyectoLegacy';
import { LEGACY_CREDITEX_IDS } from '../../hooks/useCatalogoWBS';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend, ReferenceLine, ReferenceDot,
} from 'recharts';

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

// Normaliza nombres de actividad para cruzar cronograma ↔ tareos ↔ catálogo:
// mayúsculas, sin acentos, sin sufijo de frente «(F1-PTARI)», sin puntos
// finales ni espacios dobles. Mismo criterio tolerante que usa el ISP.
const FRENTE_RE = /\s*\([^()]*(?:F\s*\d|PTAR|NAVE|DECANTAD)[^()]*\)\s*$/i;
const normAct = (s) => {
  let t = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  let prev;
  do { prev = t; t = t.replace(FRENTE_RE, ''); } while (t !== prev);
  return t.toUpperCase().replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
};
const normActSinParen = (s) => normAct(s).replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

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
  // Línea base (como MS Project): snapshot congelado del plan para medir desvíos
  const [baseline, setBaseline] = useState(null);      // { fecha, finProyecto, duracion, porId: {id:{es,ef}} }
  const [verCurvaS, setVerCurvaS] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  // Catálogo WBS del proyecto: metrados totales por actividad (fuente única)
  const { infoMap } = useCatalogoWBS(proyectoActivoId);

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
          if (d.baseline) setBaseline(d.baseline);
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
        baseline: baseline || null,
        actualizadoEn: serverTimestamp(),
      });
      setSinGuardar(false);
    } finally {
      setGuardando(false);
    }
  };

  // ── SINCRONIZAR AVANCE DESDE LOS TAREOS (producción → planeamiento) ──
  // % real por actividad = metrado ejecutado (Registros_Campo) ÷ metrado
  // total del catálogo WBS. Las tareas del cronograma se cruzan por nombre
  // normalizado y su % de avance se actualiza SOLO (sin digitación doble).
  const sincronizarAvance = async () => {
    setSincronizando(true);
    setSyncMsg(null);
    try {
      // 1) Metrado ejecutado por actividad — SOLO del proyecto activo
      // (aislamiento multi-proyecto: TEXTIL no jala metrados de CREDITEX)
      const snap = await getDocs(query(collection(db, 'Registros_Campo'), where('proyectoId', '==', proyectoActivoId)));
      const ejecutado = {};
      snap.forEach(d => {
        const r = d.data();
        const k = normAct(r.actividad);
        if (!k) return;
        ejecutado[k] = (ejecutado[k] || 0) + (parseFloat(r.metrado) || 0);
      });

      // 2) Metrado total por actividad (catálogo WBS — fuente única)
      const totalPorAct = {};
      Object.entries(infoMap || {}).forEach(([nombre, info]) => {
        const tot = (parseFloat(info.metM) || 0) || (parseFloat(info.metP) || 0);
        if (tot > 0) {
          totalPorAct[normAct(nombre)] = tot;
          totalPorAct[normActSinParen(nombre)] = totalPorAct[normActSinParen(nombre)] || tot;
        }
      });

      // 3) Cruce con las tareas del cronograma (hojas; exacto → sin paréntesis)
      let actualizadas = 0, sinMatch = 0, sinTotal = 0;
      const tareasConResumen = calcularCPM(renumerarEDT(tareas), fechaInicio).tareas;
      const nuevas = tareas.map((t, i) => {
        if (tareasConResumen[i]?.resumen) return t;
        const k1 = normAct(t.nombre), k2 = normActSinParen(t.nombre);
        const ejec = ejecutado[k1] ?? ejecutado[k2];
        if (ejec == null) { sinMatch++; return t; }
        const total = totalPorAct[k1] ?? totalPorAct[k2];
        if (!total) { sinTotal++; return t; }
        const pct = Math.min(100, Math.round((ejec / total) * 100));
        if (pct !== (t.avance || 0)) actualizadas++;
        return { ...t, avance: pct };
      });

      if (actualizadas > 0) { setTareas(nuevas); setSinGuardar(true); }
      setSyncMsg(
        `${actualizadas} tarea(s) actualizadas con el avance real de los tareos · ` +
        `${sinMatch} sin registros de producción · ${sinTotal} sin metrado total en el catálogo WBS`
      );
    } catch (e) {
      setSyncMsg(`Error al sincronizar: ${e.message}`);
    } finally {
      setSincronizando(false);
    }
  };

  // ── Línea base: congela el plan actual (como "Set Baseline" de MS Project) ──
  const [confirmBaseline, setConfirmBaseline] = useState(false);
  const aplicarBaseline = () => {
    if (!cpm) return;
    const porId = {};
    cpm.tareas.forEach(t => { if (!t.resumen) porId[t.id] = { es: t.es, ef: t.ef }; });
    setBaseline({
      fecha: hoyIso(),
      finProyecto: cpm.finProyecto,
      duracion: cpm.duracionProyecto,
      porId,
    });
    setSinGuardar(true);
    setConfirmBaseline(false);
  };
  const fijarBaseline = () => {
    if (!cpm) return;
    if (baseline) setConfirmBaseline(true);
    else aplicarBaseline();
  };

  // Desvío del fin de obra vs línea base (en días laborables)
  const desvioDias = useMemo(() => {
    if (!cpm || !baseline) return null;
    return cpm.duracionProyecto - (baseline.duracion || 0);
  }, [cpm, baseline]);

  // ── Curva S: % programado acumulado por semana (CPM) vs línea base vs HOY ──
  const curvaS = useMemo(() => {
    if (!cpm) return null;
    const hojas = cpm.tareas.filter(t => !t.resumen && t.duracion > 0);
    const total = hojas.reduce((s, t) => s + t.duracion, 0);
    if (!total) return null;
    const durBase = baseline?.duracion || 0;
    const nSem = Math.ceil(Math.max(cpm.duracionProyecto, durBase) / 6) + 1;
    const puntos = [];
    for (let w = 0; w <= nSem; w++) {
      const corte = w * 6; // fin de la semana w (en días laborables)
      const prog = hojas.reduce((s, t) => {
        const f = t.ef <= t.es ? 1 : Math.min(1, Math.max(0, (corte - t.es) / (t.ef - t.es)));
        return s + f * t.duracion;
      }, 0) / total * 100;
      let base = null;
      if (baseline) {
        let acc = 0, totB = 0;
        hojas.forEach(t => {
          const b = baseline.porId?.[t.id];
          if (!b) return;
          const d = Math.max(0, b.ef - b.es);
          totB += d;
          const f = b.ef <= b.es ? 1 : Math.min(1, Math.max(0, (corte - b.es) / (b.ef - b.es)));
          acc += f * d;
        });
        base = totB > 0 ? acc / totB * 100 : null;
      }
      puntos.push({
        sem: `S${w}`,
        Programado: Math.round(prog),
        ...(base != null ? { 'Línea base': Math.round(base) } : {}),
      });
    }
    const semHoy = Math.min(nSem, Math.max(0, Math.floor(indiceDeFecha(fechaInicio, hoyIso()) / 6)));
    return { puntos, semHoy, avanceReal: cpm.avanceGlobal };
  }, [cpm, baseline, fechaInicio]);

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
    return <SkeletonPantalla titulo="Cargando cronograma" />;
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
        {/* El plan CREDITEX solo se ofrece en SU proyecto (aislamiento) */}
        {LEGACY_CREDITEX_IDS.includes(proyectoActivoId) && (
          <button onClick={() => { mutar(() => seedDesdeCreditex()); }} style={{
            padding: '12px 22px', background: BASE.navy, color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.4px',
          }}>
            IMPORTAR PLAN CREDITEX ({CRONOGRAMAOBRA.totalTareas} tareas)
          </button>
        )}
        <button onClick={() => { mutar(() => seedEnBlanco()); }} style={{
          padding: '12px 22px',
          background: LEGACY_CREDITEX_IDS.includes(proyectoActivoId) ? BASE.white : BASE.navy,
          color: LEGACY_CREDITEX_IDS.includes(proyectoActivoId) ? BASE.navy : '#fff',
          border: `1.5px solid ${LEGACY_CREDITEX_IDS.includes(proyectoActivoId) ? BASE.border : BASE.navy}`,
          borderRadius: '10px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer',
        }}>
          Empezar con plantilla en blanco
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ConfirmModal
        abierto={confirmBaseline}
        titulo="Reemplazar línea base"
        mensaje="Ya existe una línea base fijada. ¿Reemplazarla con el plan actual?"
        detalle={baseline ? `La línea base vigente se fijó el ${baseline.fecha}. Al reemplazarla, los desvíos se medirán contra el plan de hoy.` : ''}
        textoConfirmar="Reemplazar"
        icono="📌"
        onConfirmar={aplicarBaseline}
        onCancelar={() => setConfirmBaseline(false)}
      />
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

      {tab === 'base' && (
        <GateProyectoLegacy modulo="El plan base en Excel" icono="clock">
          <CronogramaObra />
        </GateProyectoLegacy>
      )}

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
              ...(desvioDias != null ? [[
                'VS LÍNEA BASE',
                desvioDias === 0 ? 'En plan' : `${desvioDias > 0 ? '+' : ''}${Math.round(desvioDias * 10) / 10} d`,
                desvioDias > 0 ? ROJO : BASE.green,
              ]] : []),
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
              <button onClick={fijarBaseline} title="Congela el plan actual para medir desvíos (como Set Baseline en MS Project)" style={{
                padding: '8px 14px', background: BASE.white, color: baseline ? BASE.goldDark : BASE.navy,
                border: `1.5px solid ${baseline ? BASE.gold : BASE.border}`,
                borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
              }}>{baseline ? `Línea base: ${baseline.fecha}` : 'Fijar línea base'}</button>
              <button onClick={sincronizarAvance} disabled={sincronizando}
                title="Llena el % de avance de cada tarea con el metrado real registrado por los capataces (tareos ÷ metrado total del catálogo WBS)"
                style={{
                  padding: '8px 14px', background: TEAL, color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
                  opacity: sincronizando ? 0.6 : 1, letterSpacing: '0.3px',
                }}>{sincronizando ? 'Sincronizando…' : '↻ Avance desde tareos'}</button>
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

          {syncMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#F0FDFA', border: `1px solid ${TEAL}40`, borderRadius: '10px',
              padding: '9px 14px', fontSize: '11.5px', color: TEAL, fontWeight: 600,
            }}>
              <span style={{ flex: 1 }}>{syncMsg}</span>
              <button onClick={() => setSyncMsg(null)} style={{ border: 'none', background: 'transparent', color: TEAL, cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>×</button>
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
                      {[['', 86], ['EDT', 52], ['NOMBRE DE TAREA', 260], ['DUR (d)', 50], ['INICIO', 78], ['FIN', 78], ['PRED.', 72], ['%', 42], ['HOLG.', 46], ...(baseline ? [['VAR.', 46]] : [])].map(([h, w]) => (
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
                        {baseline && (() => {
                          if (t.resumen) return <td />;
                          const b = baseline.porId?.[t.id];
                          if (!b) return <td style={{ fontSize: '10px', color: BASE.mutedSoft, textAlign: 'center' }}>nueva</td>;
                          const v = Math.round((t.ef - b.ef) * 10) / 10;
                          return (
                            <td style={{
                              fontFamily: MONO, fontSize: '10.5px', textAlign: 'center', fontWeight: 700,
                              color: v > 0 ? ROJO : (v < 0 ? BASE.green : BASE.mutedSoft),
                            }}>{v === 0 ? '0' : (v > 0 ? `+${v}` : v)}</td>
                          );
                        })()}
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
                        const b = baseline?.porId?.[t.id];
                        return (
                          <g key={t.id}>
                            {/* barra fantasma de la línea base (plan congelado) */}
                            {b && (
                              <rect x={b.es * pxDia} y={y + 23} width={Math.max((b.ef - b.es) * pxDia, 2)} height={4} rx={2}
                                fill={BASE.mutedSoft} opacity={0.55} />
                            )}
                            <rect x={x} y={y + 7} width={w} height={14} rx={3} fill={color} opacity={0.32} />
                            <rect x={x} y={y + 7} width={wAv} height={14} rx={3} fill={color} />
                            {pxDia >= 8 && w > 34 && (
                              <text x={x + w + 5} y={y + 18} fontSize="8.5" fill={BASE.mutedSoft} fontFamily={MONO}>
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
              {[[TEAL, 'Tarea'], [ROJO, 'Ruta crítica'], [BASE.navy, 'Fase resumen'], [BASE.goldDark, 'Hito ◆'], ...(baseline ? [[BASE.mutedSoft, 'Línea base (plan congelado)']] : [])].map(([c, l]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 600, color: BASE.muted }}>
                  <span style={{ width: '14px', height: '8px', borderRadius: '2px', background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: BASE.mutedSoft }}>
                PRED.: «3» = después de la tarea 3 · «3SS» = empiezan juntas · «3FS+2» = 2 días después · «3FF» = terminan juntas. La holgura es cuántos días puede atrasarse sin mover el fin de obra.
              </span>
            </div>
          </div>

          {/* ══ CURVA S — avance programado vs línea base vs avance real ══ */}
          {curvaS && (
            <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', boxShadow: BASE.shadowMd, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: verCurvaS ? `1px solid ${BASE.borderSoft}` : 'none' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: BASE.navy, letterSpacing: '1.2px' }}>
                  CURVA S — AVANCE PROGRAMADO DE OBRA
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: 600 }}>
                    Hoy (S{curvaS.semHoy}): programado {curvaS.puntos[curvaS.semHoy]?.Programado ?? '—'}% · real <strong style={{ color: (curvaS.puntos[curvaS.semHoy]?.Programado ?? 0) > curvaS.avanceReal ? ROJO : BASE.green, fontFamily: MONO }}>{curvaS.avanceReal}%</strong>
                  </span>
                  <button onClick={() => setVerCurvaS(!verCurvaS)} style={{
                    padding: '5px 12px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '7px',
                    fontSize: '10px', fontWeight: 800, color: BASE.muted, cursor: 'pointer', letterSpacing: '0.5px',
                  }}>{verCurvaS ? 'OCULTAR' : 'MOSTRAR'}</button>
                </div>
              </div>
              {verCurvaS && (
                <div style={{ padding: '12px 8px 6px', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={curvaS.puntos} margin={{ top: 6, right: 24, bottom: 0, left: -14 }}>
                      <CartesianGrid stroke={BASE.borderSoft} strokeDasharray="3 3" />
                      <XAxis dataKey="sem" tick={{ fontSize: 10, fill: BASE.muted }} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: BASE.muted }} unit="%" />
                      <RTooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: '11px', borderRadius: '8px', border: `1px solid ${BASE.border}` }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {baseline && <Line type="monotone" dataKey="Línea base" stroke={BASE.mutedSoft} strokeDasharray="6 4" strokeWidth={2} dot={false} />}
                      <Line type="monotone" dataKey="Programado" stroke={BASE.navy} strokeWidth={2.5} dot={false} />
                      <ReferenceLine x={`S${curvaS.semHoy}`} stroke={ROJO} strokeDasharray="4 3" label={{ value: 'HOY', fontSize: 9, fill: ROJO, position: 'top' }} />
                      <ReferenceDot x={`S${curvaS.semHoy}`} y={curvaS.avanceReal} r={5} fill={BASE.gold} stroke={BASE.navy} strokeWidth={2}
                        label={{ value: `Real ${curvaS.avanceReal}%`, fontSize: 10, fill: BASE.goldDark, position: 'right', fontWeight: 700 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      ))}
    </div>
  );
}
