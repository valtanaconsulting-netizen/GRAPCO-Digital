// src/views/modulos/dashboardEjecutivo/DashboardEjecutivo.jsx
// ════════════════════════════════════════════════════════════════
// DASHBOARD EJECUTIVO · INDICADORES DIARIOS
// ════════════════════════════════════════════════════════════════
// Calcula en vivo los indicadores clave del proyecto activo (producción/costo,
// mano de obra, calidad, planeamiento y seguridad) y permite GUARDAR el cierre
// del día como un snapshot en Firestore (colección Indicadores_Ejecutivos).
// Así la gerencia construye una serie histórica diaria por proyecto, con la
// tendencia de CPI y avance físico. Costo $0: todo se calcula y guarda desde el
// cliente, sin Cloud Functions.
//
// MODO EDICIÓN (solo admin): permite reordenar (arrastrar / botones ▲▼) y
// ocultar tarjetas dentro de cada bloque. La disposición se guarda en
// Configuracion/layout_dashEjecutivo y se aplica para todos al entrar.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../../../firebaseConfig';
import {
  collection, query, where, onSnapshot, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { BASE } from '../../../utils/styles';
import { fmtCPIPct, fmt1, getEstado, COSTO_HORA_DEFAULT } from '../../../utils/helpers';
import Icon from '../../../components/Icon';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useHistorial, useConfiguracion, useAsistenciaDiaria } from '../../../hooks/useFirebaseData';
import { useCatalogoWBS } from '../../../hooks/useCatalogoWBS';
import { enriquecerHistorial, calcularIndicadoresDiarios } from '../../../utils/indicadoresEjecutivos';

const COL = 'Indicadores_Ejecutivos';
const LAYOUT_DOC = 'layout_dashEjecutivo';   // Configuracion/{LAYOUT_DOC}

// Estructura ESTÁTICA de bloques y tarjetas (los ids no cambian → sirven para
// guardar el orden/ocultos). El contenido visible se calcula aparte (display).
const BLOQUES_META = [
  { id: 'prod', titulo: 'Producción y costo (acumulado)', color: BASE.navy, cards: [
    { id: 'cpi', nombre: 'Eficiencia (CPI)' },
    { id: 'avance', nombre: 'Avance físico' },
    { id: 'sobrecosto', nombre: 'Sobrecosto / Ahorro' },
    { id: 'hhreal', nombre: 'HH reales acum.' },
  ] },
  { id: 'mo', titulo: 'Mano de obra (del día)', color: BASE.gold, cards: [
    { id: 'hhdia', nombre: 'HH ejecutadas hoy' },
    { id: 'obreros', nombre: 'Obreros presentes' },
    { id: 'asist', nombre: 'HH asistencia hoy' },
  ] },
  { id: 'cal', titulo: 'Gestión de Calidad', color: '#ec4899', cards: [
    { id: 'protlib', nombre: 'Protocolos liberados' },
    { id: 'ncs', nombre: 'NCs abiertas' },
  ] },
  { id: 'plan', titulo: 'Planeamiento y seguridad', color: '#7c3aed', cards: [
    { id: 'ppc', nombre: 'PPC acumulado' },
    { id: 'ssoma', nombre: 'Hallazgos SSOMA hoy' },
  ] },
];

// Fecha local 'YYYY-MM-DD' (zona horaria del dispositivo, no UTC).
const hoyLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const fmtS = (n) => 'S/ ' + Math.round(Number(n) || 0).toLocaleString('es-PE');
const ddmm = (f) => (f && f.length >= 10 ? f.slice(8, 10) + '/' + f.slice(5, 7) : f || '');

export default function DashboardEjecutivo({ showToast, isMobile }) {
  const fecha = useMemo(() => hoyLocal(), []);
  const { user, isAdmin } = useAuth();
  const {
    proyectoActivoId, proyectoActivo, filtrarPorContexto,
  } = useProyectoActivo();

  // ── Fuentes de datos (mismos hooks que el resto de la app) ──
  const { historial } = useHistorial(fecha);
  const configuracion = useConfiguracion();
  const asistencia = useAsistenciaDiaria(proyectoActivoId);
  const { infoMap } = useCatalogoWBS(proyectoActivoId);

  // Colecciones de calidad / planeamiento / seguridad (snapshot completo, se
  // filtran por proyecto en cliente para no exigir índices compuestos).
  const [protocolos, setProtocolos] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [compromisos, setCompromisos] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'Protocolos'),
        (s) => setProtocolos(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.warn('[DashEjec Protocolos]', e)),
      onSnapshot(collection(db, 'NoConformidades'),
        (s) => setNcs(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.warn('[DashEjec NCs]', e)),
      onSnapshot(collection(db, 'PPC_Compromisos'),
        (s) => setCompromisos(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.warn('[DashEjec PPC]', e)),
      onSnapshot(collection(db, 'InspeccionesSeguridad'),
        (s) => setInspecciones(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.warn('[DashEjec Inspecciones]', e)),
    ];
    return () => unsubs.forEach((u) => { try { u(); } catch { /* noop */ } });
  }, []);

  // ── Snapshots históricos del proyecto (sin orderBy → no requiere índice) ──
  const [snapshots, setSnapshots] = useState([]);
  useEffect(() => {
    if (!proyectoActivoId) return;
    const q = query(collection(db, COL), where('proyectoId', '==', proyectoActivoId));
    return onSnapshot(q, (s) => {
      const arr = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
      setSnapshots(arr);
    }, (e) => console.warn('[DashEjec snapshots]', e));
  }, [proyectoActivoId]);

  // ── Disposición guardada (orden / ocultos por bloque) ──
  const [layout, setLayout] = useState({});
  useEffect(() => {
    return onSnapshot(doc(db, 'Configuracion', LAYOUT_DOC), (s) => {
      setLayout(s.exists() ? (s.data()?.bloques || {}) : {});
    }, (e) => console.warn('[DashEjec layout]', e));
  }, []);

  // ── Costo S/./HH representativo (promedio de los 4 cargos) ──
  const costoHH = useMemo(() => {
    const map = { ...COSTO_HORA_DEFAULT };
    const tarifas = configuracion?.tarifas || {};
    Object.entries(tarifas).forEach(([cargo, val]) => {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0) map[cargo] = n;
    });
    const cargos = ['Capataz', 'Operario', 'Oficial', 'Ayudante'];
    const vals = cargos.map((c) => parseFloat(map[c]) || 0).filter((v) => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 14;
  }, [configuracion]);

  // ── Historial del proyecto activo, enriquecido con IP meta del catálogo ──
  const historialEnriquecido = useMemo(() => {
    const delProyecto = filtrarPorContexto(historial || [], { ignorarFrente: true });
    return enriquecerHistorial(delProyecto, infoMap);
  }, [historial, filtrarPorContexto, infoMap]);

  // ── Indicadores del día (en vivo) ──
  const ind = useMemo(() => calcularIndicadoresDiarios({
    historialEnriquecido,
    infoMap,
    asistencia,
    protocolos: filtrarPorContexto(protocolos, { ignorarFrente: true }),
    ncs: filtrarPorContexto(ncs, { ignorarFrente: true }),
    compromisos: filtrarPorContexto(compromisos, { ignorarFrente: true }),
    inspecciones: filtrarPorContexto(inspecciones, { ignorarFrente: true }),
    costoHH,
    fecha,
  }), [historialEnriquecido, infoMap, asistencia, protocolos, ncs, compromisos, inspecciones, costoHH, fecha, filtrarPorContexto]);

  // ── Contenido visible de cada tarjeta (id → {label, valor, sub, color}) ──
  const est = getEstado(ind.cpi);
  const display = useMemo(() => ({
    cpi: { label: 'Eficiencia (CPI)', valor: fmtCPIPct(ind.cpi), color: est.color,
      sub: !ind.cpi ? 'sin datos' : ind.cpi >= 1 ? 'bajo presupuesto' : ind.cpi >= 0.85 ? 'en alerta' : 'sobrecosto' },
    avance: { label: 'Avance físico', valor: ind.avancePct != null ? Math.round(ind.avancePct) + '%' : '—',
      color: BASE.navy, sub: `${fmt1(ind.hhMeta)} / ${fmt1(ind.hhMetaTotal)} HH meta` },
    sobrecosto: { label: ind.sobrecosto >= 0 ? 'Sobrecosto acum.' : 'Ahorro acum.', valor: fmtS(Math.abs(ind.sobrecosto)),
      color: ind.sobrecosto >= 0 ? BASE.red : BASE.greenDark, sub: `${fmt1(Math.abs(ind.sobrecostoHH))} HH · S/ ${costoHH.toFixed(1)}/HH` },
    hhreal: { label: 'HH reales acum.', valor: fmt1(ind.hhReal), color: BASE.goldDark, sub: `meta ${fmt1(ind.hhMeta)} HH` },
    hhdia: { label: 'HH ejecutadas hoy', valor: fmt1(ind.hhDia), color: BASE.navy, sub: fecha },
    obreros: { label: 'Obreros presentes', valor: ind.obrerosDia || 0, color: BASE.greenDark, sub: 'según asistencia' },
    asist: { label: 'HH asistencia hoy', valor: fmt1(ind.asistenciaHHDia), color: BASE.navyLight, sub: 'entrada/salida' },
    protlib: { label: 'Protocolos liberados', valor: ind.protocolosLiberados, color: BASE.greenDark, sub: `${ind.pctLiberacion}% de ${ind.protocolosTotal}` },
    ncs: { label: 'NCs abiertas', valor: ind.ncsAbiertas, color: ind.ncsAbiertas > 0 ? BASE.red : BASE.greenDark, sub: `${ind.ncsCriticas} críticas` },
    ppc: { label: 'PPC acumulado', valor: ind.ppcPct != null ? ind.ppcPct + '%' : '—',
      color: ind.ppcPct == null ? BASE.muted : ind.ppcPct >= 80 ? BASE.greenDark : ind.ppcPct >= 60 ? BASE.goldDark : BASE.red, sub: 'plan cumplido (LPS)' },
    ssoma: { label: 'Hallazgos SSOMA hoy', valor: ind.ssomaHallazgos, color: ind.ssomaCrit > 0 ? BASE.red : BASE.navy, sub: `${ind.ssomaCrit} críticos · ${ind.ssomaObs} obs.` },
  }), [ind, est, costoHH, fecha]);

  // ── Cierre del día ──
  const yaGuardadoHoy = useMemo(() => snapshots.some((s) => s.fecha === fecha), [snapshots, fecha]);
  const [guardando, setGuardando] = useState(false);
  const guardarCierre = useCallback(async () => {
    if (!proyectoActivoId) { showToast?.('Sin proyecto activo', 'warning'); return; }
    setGuardando(true);
    try {
      const docId = `${proyectoActivoId}__${fecha}`;
      await setDoc(doc(db, COL, docId), {
        ...ind,
        proyectoId: proyectoActivoId,
        proyectoNombre: proyectoActivo?.nombre || proyectoActivoId,
        guardadoEn: serverTimestamp(),
        guardadoPor: user?.email || user?.uid || 'desconocido',
      }, { merge: true });
      showToast?.(yaGuardadoHoy ? 'Cierre del día actualizado ✓' : 'Cierre del día guardado ✓', 'success');
    } catch (e) {
      console.error('[guardarCierre]', e);
      showToast?.('Error al guardar: ' + (e?.message || e), 'error');
    } finally {
      setGuardando(false);
    }
  }, [proyectoActivoId, proyectoActivo, fecha, ind, user, yaGuardadoHoy, showToast]);

  // ════════════════════════════════════════════════════════════════
  // MODO EDICIÓN (solo admin)
  // ════════════════════════════════════════════════════════════════
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({});       // { bloqueId: { order:[ids], hidden:[ids] } }
  const [guardandoLayout, setGuardandoLayout] = useState(false);
  const dragRef = useRef(null);

  // Orden + ocultos efectivos de un bloque, a partir de una fuente (layout o draft).
  const efectivo = useCallback((bloque, src) => {
    const cfg = (src || {})[bloque.id] || {};
    const ids = bloque.cards.map((c) => c.id);
    const order = Array.isArray(cfg.order) ? cfg.order.filter((id) => ids.includes(id)) : [];
    const ordered = [...order, ...ids.filter((id) => !order.includes(id))];
    const hidden = new Set(Array.isArray(cfg.hidden) ? cfg.hidden : []);
    return { ordered, hidden };
  }, []);

  const entrarEdicion = useCallback(() => {
    const d = {};
    BLOQUES_META.forEach((b) => {
      const { ordered, hidden } = efectivo(b, layout);
      d[b.id] = { order: ordered, hidden: [...hidden] };
    });
    setDraft(d);
    setEditMode(true);
  }, [efectivo, layout]);

  const cancelarEdicion = useCallback(() => { setEditMode(false); setDraft({}); }, []);

  const guardarLayout = useCallback(async () => {
    setGuardandoLayout(true);
    try {
      await setDoc(doc(db, 'Configuracion', LAYOUT_DOC), {
        bloques: draft,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || user?.uid || 'admin',
      }, { merge: true });
      showToast?.('Disposición guardada ✓', 'success');
      setEditMode(false);
    } catch (e) {
      console.error('[guardarLayout]', e);
      showToast?.('Error al guardar disposición: ' + (e?.message || e), 'error');
    } finally {
      setGuardandoLayout(false);
    }
  }, [draft, user, showToast]);

  // Operaciones sobre el draft
  const moverCard = useCallback((bloqueId, id, dir) => {
    setDraft((prev) => {
      const cfg = prev[bloqueId] || { order: [], hidden: [] };
      const order = [...cfg.order];
      const i = order.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return prev;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...prev, [bloqueId]: { ...cfg, order } };
    });
  }, []);

  const soltarSobre = useCallback((bloqueId, targetId) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.bloque !== bloqueId || d.id === targetId) return;
    setDraft((prev) => {
      const cfg = prev[bloqueId] || { order: [], hidden: [] };
      const order = [...cfg.order];
      const from = order.indexOf(d.id);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      order.splice(from, 1);
      order.splice(to, 0, d.id);
      return { ...prev, [bloqueId]: { ...cfg, order } };
    });
  }, []);

  const alternarOculto = useCallback((bloqueId, id) => {
    setDraft((prev) => {
      const cfg = prev[bloqueId] || { order: [], hidden: [] };
      const hidden = new Set(cfg.hidden || []);
      if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
      return { ...prev, [bloqueId]: { ...cfg, hidden: [...hidden] } };
    });
  }, []);

  const grid = (min) => `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`;

  // Serie para la tendencia (últimos 30 cierres guardados).
  const serie = useMemo(
    () => snapshots.slice(-30).map((s) => ({
      fecha: ddmm(s.fecha),
      CPI: s.cpi != null ? +(s.cpi * 100).toFixed(0) : null,
      'Avance %': s.avancePct != null ? +s.avancePct.toFixed(0) : null,
      PPC: s.ppcPct != null ? s.ppcPct : null,
    })),
    [snapshots],
  );

  const fuente = editMode ? draft : layout;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Encabezado + acciones ── */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        borderRadius: '14px', padding: isMobile ? '16px' : '18px 22px', color: '#fff',
        boxShadow: BASE.shadowMd, display: 'flex', flexWrap: 'wrap', gap: '14px',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px' }}>
            <Icon name="trendingUp" size={24} color={BASE.gold} strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.6px', opacity: 0.8 }}>
              DASHBOARD EJECUTIVO · INDICADORES DIARIOS
            </p>
            <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 900, marginTop: '2px' }}>
              {proyectoActivo?.nombre || 'Proyecto activo'}
            </p>
            <p style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
              📅 {fecha}{yaGuardadoHoy && ' · cierre ya guardado hoy'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Botón de edición (solo admin) */}
          {isAdmin && !editMode && (
            <button onClick={entrarEdicion} style={btnHero('rgba(255,255,255,0.16)')}>
              <Icon name="settings" size={15} color="#fff" strokeWidth={2.2} /> Editar
            </button>
          )}
          {editMode && (
            <>
              <button onClick={guardarLayout} disabled={guardandoLayout}
                style={btnHero(`linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`)}>
                <Icon name="checkSquare" size={15} color="#fff" strokeWidth={2.2} />
                {guardandoLayout ? 'Guardando…' : 'Guardar disposición'}
              </button>
              <button onClick={cancelarEdicion} style={btnHero('rgba(220,38,38,0.30)')}>✖ Cancelar</button>
            </>
          )}
          {!editMode && (
            <button onClick={guardarCierre} disabled={guardando}
              style={btnHero(guardando ? 'rgba(255,255,255,0.25)' : `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`)}>
              <Icon name="registro" size={16} color="#fff" strokeWidth={2.2} />
              {guardando ? 'Guardando…' : yaGuardadoHoy ? 'Actualizar cierre' : 'Guardar cierre del día'}
            </button>
          )}
        </div>
      </div>

      {editMode && (
        <div style={{
          background: BASE.goldSoft, border: `1px dashed ${BASE.gold}`, borderRadius: '10px',
          padding: '10px 14px', fontSize: '12px', color: BASE.goldDark, fontWeight: 700,
        }}>
          ✏️ Modo edición — arrastra las tarjetas (o usa ▲▼) para reordenar y el 👁 para mostrar/ocultar. Luego «Guardar disposición».
        </div>
      )}

      {/* ── Bloques de indicadores (editables) ── */}
      {BLOQUES_META.map((bloque) => {
        const { ordered, hidden } = efectivo(bloque, fuente);
        const lista = ordered.filter((id) => display[id]);
        const visibles = editMode ? lista : lista.filter((id) => !hidden.has(id));
        if (!editMode && visibles.length === 0) return null;
        return (
          <Bloque key={bloque.id} titulo={bloque.titulo} color={bloque.color}>
            <div style={{ display: 'grid', gridTemplateColumns: grid(180), gap: '10px' }}>
              {visibles.map((id, idx) => {
                const d = display[id];
                const oculto = hidden.has(id);
                const meta = bloque.cards.find((c) => c.id === id);
                if (!editMode) return <Kpi key={id} {...d} />;
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => { dragRef.current = { bloque: bloque.id, id }; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => soltarSobre(bloque.id, id)}
                    style={{
                      border: `2px dashed ${oculto ? BASE.border : bloque.color}`,
                      borderRadius: '12px', padding: '6px', background: oculto ? BASE.bgSoft : '#fff',
                      opacity: oculto ? 0.5 : 1, cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <span title="Arrastra para mover" style={{ cursor: 'grab', color: BASE.muted, fontWeight: 900, fontSize: '13px', userSelect: 'none' }}>⠿</span>
                      <span style={{ flex: 1, fontSize: '10px', fontWeight: 800, color: BASE.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meta?.nombre || id}
                      </span>
                      <button onClick={() => moverCard(bloque.id, id, -1)} disabled={idx === 0} style={btnMini} title="Subir">▲</button>
                      <button onClick={() => moverCard(bloque.id, id, +1)} disabled={idx === visibles.length - 1} style={btnMini} title="Bajar">▼</button>
                      <button onClick={() => alternarOculto(bloque.id, id)} style={{ ...btnMini, color: oculto ? BASE.muted : bloque.color }} title={oculto ? 'Mostrar' : 'Ocultar'}>
                        {oculto ? '🚫' : '👁'}
                      </button>
                    </div>
                    <Kpi {...d} />
                  </div>
                );
              })}
            </div>
          </Bloque>
        );
      })}

      {/* ── Tendencia histórica (snapshots guardados) ── */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '16px 18px', boxShadow: BASE.shadowSm }}>
        <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.6px', marginBottom: '12px' }}>
          📈 TENDENCIA DIARIA · CPI, AVANCE Y PPC
        </p>
        {serie.length === 0 ? (
          <p style={{ padding: '28px', textAlign: 'center', color: BASE.muted, fontSize: '13px', fontWeight: 700 }}>
            Aún no hay cierres guardados. Pulsa «Guardar cierre del día» para empezar la serie histórica.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: BASE.muted }} />
              <YAxis tick={{ fontSize: 11, fill: BASE.muted }} domain={[0, 'auto']} />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: `1px solid ${BASE.border}` }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="CPI" stroke={BASE.navy} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="Avance %" stroke={BASE.gold} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="PPC" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Tabla de cierres recientes ── */}
      {snapshots.length > 0 && (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', overflow: 'hidden', boxShadow: BASE.shadowSm }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${BASE.border}`, background: BASE.bgSoft }}>
            <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy }}>🗂️ CIERRES GUARDADOS ({snapshots.length})</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: BASE.navySoft, color: BASE.navy, textAlign: 'right' }}>
                  {['Fecha', 'CPI', 'Avance', 'Sobrecosto', 'HH día', 'Prot. lib.', 'NCs ab.', 'PPC'].map((h, i) => (
                    <th key={h} style={{ padding: '8px 12px', fontWeight: 800, textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.slice().reverse().slice(0, 30).map((s, i) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${BASE.border}`, background: i % 2 ? BASE.bgSoft : BASE.white }}>
                    <td style={{ padding: '7px 12px', fontWeight: 700, color: BASE.text }}>{s.fecha}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 800, color: getEstado(s.cpi).color }}>{fmtCPIPct(s.cpi)}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}>{s.avancePct != null ? Math.round(s.avancePct) + '%' : '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: (s.sobrecosto || 0) >= 0 ? BASE.red : BASE.greenDark }}>{fmtS(Math.abs(s.sobrecosto || 0))}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}>{fmt1(s.hhDia || 0)}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}>{s.protocolosLiberados ?? '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: (s.ncsAbiertas || 0) > 0 ? BASE.red : BASE.text }}>{s.ncsAbiertas ?? '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}>{s.ppcPct != null ? s.ppcPct + '%' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Indicadores del proyecto activo. El cierre del día guarda un snapshot en Firebase (Indicadores_Ejecutivos) — uno por día y proyecto; volver a guardar el mismo día lo actualiza.
        {isAdmin && ' La disposición de tarjetas es configurable (botón Editar) y se guarda para todos.'}
      </p>
    </div>
  );
}

// ── Estilos de botones ──
const btnHero = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: '10px',
  padding: '11px 16px', fontSize: '12.5px', fontWeight: 900, cursor: 'pointer',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '7px',
});
const btnMini = {
  background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px',
  padding: '2px 4px', color: BASE.muted, lineHeight: 1,
};

// ── Sub-componentes de presentación ──
function Bloque({ titulo, color, children }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '14px 16px', boxShadow: BASE.shadowSm, borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: '11px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.8px', marginBottom: '10px', textTransform: 'uppercase' }}>{titulo}</p>
      {children}
    </div>
  );
}

function Kpi({ label, valor, sub, color }) {
  return (
    <div style={{ background: color + '0F', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: '10px', padding: '11px 13px' }}>
      <p style={{ fontSize: '9.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: '21px', fontWeight: 900, color, marginTop: '3px', fontFamily: 'monospace', lineHeight: 1.1 }}>{valor}</p>
      {sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{sub}</p>}
    </div>
  );
}
