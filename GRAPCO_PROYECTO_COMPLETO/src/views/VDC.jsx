// src/views/ingeniero/VDC.jsx
// Módulo VDC · Last Planner System
// - Plan Semanal: registrar compromisos por capataz
// - Cierre semanal: marcar cumplido / no cumplido + razón (RNC)
// - Dashboard: PPC tendencia + Pareto RNC + diagnóstico

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebaseConfig';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc,
} from 'firebase/firestore';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, BarChart, Bar, Cell, ComposedChart,
} from 'recharts';
import { BASE, inp } from '../utils/styles';
import {
  RNC_CATEGORIAS, RNC_LABELS, RNC_COLORS, RNC_ICONS,
  calcularPPCSemanal, calcularParetoRNC, diagnosticarPPC,
  obtenerSemana as obtSem,
  RESTRICCION_TIPOS, RESTRICCION_TIPOS_MAP,
  calcularKPIRestricciones,
  sugerirLecciones, calcularKPILecciones,
  fmtFechaCorta,
  fechasDeSemana, generarLookahead,
} from '../utils/helpers';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';
// Inicio real del proyecto como ISO 'YYYY-MM-DD' — base ÚNICA de semanas en todo el
// LPS (Lookahead, Prog. Semanal, Ejecución). Debe coincidir con obtenerSemana para
// que la "semana actual" y las fechas conversen entre sí y con el LAP oficial.
const INICIO_PROYECTO = FECHA_INICIO_PROYECTO.toISOString().slice(0, 10);
// Paleta para colorear secciones/frentes del LAP en la matriz Lookahead.
const PALETA_LAP = ['#0ea5e9', '#7c3aed', '#0d9488', '#f59e0b', '#e11d48', '#2563eb', '#65a30d', '#c026d3'];
import Modal from '../components/Modal';
import PlanDiario from './PlanDiario';
import TableroLPS from './TableroLPS';
import Sectorizacion from './Sectorizacion';
import SectorizacionTren from './planeamiento/SectorizacionTren';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';

const obtenerSemana = (f) => obtSem(f, FECHA_INICIO_PROYECTO);

export default function VDC({
  cuadrillasActivas,
  cuadrillasDB = {},
  planesDiarios = [],
  historial = [],
  isMobile,
  showToast,
}) {
  const [tab, setTab] = useState('tablero');
  const [compromisos, setCompromisos] = useState([]);
  const [restriccionesFS, setRestriccionesFS] = useState([]);   // de Firestore (VDC_Restricciones)
  const [lecciones, setLecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActiva, setSemanaActiva] = useState(obtenerSemana(new Date().toISOString().split('T')[0]));

  const [modalRestriccion, setModalRestriccion] = useState(null);   // { editando } | null
  const [modalLeccion, setModalLeccion] = useState(null);           // { editando, fromSugerencia? } | null
  const [formRestriccion, setFormRestriccion] = useState({
    actividad: '', tipoFlujo: 'materiales', descripcion: '',
    responsable: '', fechaCompromisoLiberacion: '', impacto: 'medio', estado: 'pendiente',
  });
  const [formLeccion, setFormLeccion] = useState({
    titulo: '', categoria: 'materiales', descripcion: '', accionRecomendada: '',
  });

  // ── Suscripción Firebase (filtradas por proyecto activo) ──
  const { filtrarPorContexto } = useProyectoActivo();
  useEffect(() => {
    try {
      const q = query(collection(db, 'PPC_Compromisos'), orderBy('semana', 'desc'));
      return onSnapshot(q, snap => {
        try {
          const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCompromisos(filtrarPorContexto(todos));
          setLoading(false);
        } catch (e) { console.warn('[snap PPC]', e); }
      });
    } catch (e) { console.warn('[useEffect PPC]', e); setLoading(false); }
  }, [filtrarPorContexto]);

  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'VDC_Restricciones'), snap => {
        try {
          const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRestriccionesFS(filtrarPorContexto(todos));
        }
        catch (e) { console.warn('[snap Restr]', e); }
      });
    } catch (e) { console.warn('[useEffect Restr]', e); }
  }, [filtrarPorContexto]);

  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'VDC_Lecciones'), snap => {
        try {
          const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setLecciones(filtrarPorContexto(todos));
        }
        catch (e) { console.warn('[snap Lecc]', e); }
      });
    } catch (e) { console.warn('[useEffect Lecc]', e); }
  }, [filtrarPorContexto]);

  // Plan LAP + marcas del usuario → para enlazar restricciones y alimentar el Power BI.
  const [lapPlan, setLapPlan] = useState([]);
  useEffect(() => {
    let vivo = true;
    import('../data/lapCreditex').then(m => { if (vivo) setLapPlan(m.LAP_PLAN || []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const lapNombres = useMemo(() => [...new Set(lapPlan.map(a => a.actividad).filter(Boolean))], [lapPlan]);
  const { proyectoActivoId: proyIdVDC } = useProyectoActivo();
  // Restricciones del Excel AR (base, 101) fusionadas con las de Firestore → así la
  // vista AR, los badges del LAP y el Power BI muestran valores reales sin tipear.
  const [arBase, setArBase] = useState([]);
  useEffect(() => { let v = true; import('../data/arCreditex').then(m => { if (v) setArBase(m.AR_CREDITEX || []); }).catch(() => {}); return () => { v = false; }; }, []);
  // Ediciones del usuario sobre las restricciones del Excel (estado, etc.) — persistentes.
  const [arEdits, setArEdits] = useState({});
  useEffect(() => {
    if (!proyIdVDC) return;
    return onSnapshot(doc(db, 'Configuracion', `arEdits_${proyIdVDC}`), s => setArEdits((s.exists() && s.data().edits) || {}), () => {});
  }, [proyIdVDC]);
  const restricciones = useMemo(() => [
    ...arBase.map(r => (arEdits[r.id] ? { ...r, ...arEdits[r.id] } : r)),
    ...restriccionesFS,
  ], [arBase, arEdits, restriccionesFS]);
  // Cambiar el estado de una restricción (modificable). AR-excel → override; Firestore → doc real.
  const cambiarEstadoAR = (r, estado) => {
    const extra = (estado === 'liberada' && !r.fechaConciliada) ? { fechaConciliada: new Date().toISOString().slice(0, 10) } : {};
    if (String(r.id).startsWith('ar-')) {
      const nuevo = { ...arEdits, [r.id]: { ...(arEdits[r.id] || {}), estado, ...extra } };
      setArEdits(nuevo);
      if (proyIdVDC) setDoc(doc(db, 'Configuracion', `arEdits_${proyIdVDC}`), { edits: nuevo }, { merge: true }).catch(() => {});
    } else {
      updateDoc(doc(db, 'VDC_Restricciones', r.id), { estado, ...extra }).catch(() => {});
    }
  };
  // PPC oficial del Excel (26 semanas + CNC) → alimenta el Power BI con valores reales.
  const [ppcOficial, setPpcOficial] = useState({ sem: [], cnc: [], global: null });
  useEffect(() => { let v = true; import('../data/ppcCreditex').then(m => { if (v) setPpcOficial({ sem: m.PPC_SEMANAL || [], cnc: m.PPC_CNC || [], global: m.PPC_GLOBAL ?? null }); }).catch(() => {}); return () => { v = false; }; }, []);
  const ppcSemanalReal = useMemo(() => ppcOficial.sem.map(s => ({ semana: s.semana, ppcPct: s.ppc })), [ppcOficial]);
  const paretoReal = useMemo(() => {
    const PAL = ['#dc2626', '#ea580c', '#d97706', '#7c3aed', '#2563eb', '#0891b2', '#16a34a', '#64748b'];
    return { items: ppcOficial.cnc.map((c, i) => ({ label: c.cat, count: c.n, color: PAL[i % PAL.length] })) };
  }, [ppcOficial]);
  const [marcasLap, setMarcasLap] = useState({});
  useEffect(() => {
    if (!proyIdVDC) return;
    return onSnapshot(doc(db, 'Configuracion', `lapMarcas_${proyIdVDC}`),
      snap => setMarcasLap((snap.exists() && snap.data().marcas) || {}), () => {});
  }, [proyIdVDC]);
  // "Compromisos" sintéticos derivados del LAP pintado (actividad × semana) → el
  // Power BI y los paneles muestran el programa real del LAP, no quedan en 0.
  const lapProgramado = useMemo(() => {
    if (!lapPlan.length) return [];
    const vistos = new Set(); const out = [];
    for (const a of lapPlan) {
      const actKey = `${a.seccion || 'OTROS'}|${a.actividad}`;
      for (const f of (a.dias || [])) {
        const ov = marcasLap[lapClave(actKey, f)];
        if (ov === false) continue;                 // día borrado por el usuario
        const sem = obtenerSemana(f);
        const id = a.actividad + '|' + sem;
        if (vistos.has(id)) continue; vistos.add(id);
        out.push({ id: 'lp-' + id, actividad: a.actividad, partida: a.seccion || 'PROYECTO', semana: sem, cumplido: null, fuente: 'LAP', metradoComprometido: Math.round(a.hh || 0) });
      }
    }
    return out;
  }, [lapPlan, marcasLap]);

  // Total de semanas del proyecto (rango del filtro de semana unificado).
  const totalSemanas = useMemo(
    () => Math.max(35, semanaActiva + 5, ...(ppcOficial.sem || []).map(s => s.semana || 0)),
    [ppcOficial, semanaActiva]
  );
  // Metadata por semana → alimenta el filtro unificado SemanaNav (PPC oficial,
  // restricciones pendientes y actividades programadas del LAP por semana).
  const semanasMeta = useMemo(() => {
    const m = {};
    const get = (n) => (m[n] || (m[n] = { ppc: null, restr: 0, prog: 0 }));
    (ppcOficial.sem || []).forEach(s => { if (s.semana) get(s.semana).ppc = s.ppc; });
    (restricciones || []).forEach(r => {
      if (r.estado === 'liberada' || !r.fechaCompromisoLiberacion) return;
      const w = obtenerSemana(r.fechaCompromisoLiberacion);
      if (w >= 1) get(w).restr += 1;
    });
    lapProgramado.forEach(c => { if (c.semana) get(c.semana).prog += 1; });
    return m;
  }, [ppcOficial, restricciones, lapProgramado]);

  // ── Datos calculados ──
  const ppcSemanal = useMemo(() => calcularPPCSemanal(compromisos), [compromisos]);
  const pareto = useMemo(() => calcularParetoRNC(compromisos), [compromisos]);
  const diag = useMemo(() => diagnosticarPPC(ppcSemanal, 4), [ppcSemanal]);

  // Salud del Sistema LPS (consolidado para el Tablero): las 4 métricas maestras
  // del Last Planner conversando — PPC (Did), PCR (Make-Ready), PPR (Can/listo) y
  // Shielding (Will: comprometido en riesgo). Todo derivado, automático.
  const saludLPS = useMemo(() => {
    const tot = restricciones.length;
    const lib = restricciones.filter(r => r.estado === 'liberada').length;
    const pcr = tot ? Math.round(lib / tot * 100) : null;
    const rpa = restriccionesPorActividad(restricciones);
    const actsR = Object.values(rpa);
    const nAct = actsR.length;
    const listas = actsR.filter(a => a.pend === 0).length;
    const ppr = nAct ? Math.round(listas / nAct * 100) : null;
    const progActs = [...new Set(lapProgramado.map(c => c.actividad).filter(Boolean))];
    const bloqProg = progActs.filter(act => readyDe(rpa[normActividad(act)]) === 'bloq').length;
    const ppc = ppcOficial.global ?? diag.promedioPct ?? null;
    return { ppc, pcr, ppr, bloqProg, progTotal: progActs.length, lib, tot, pend: tot - lib, listas, nAct };
  }, [restricciones, lapProgramado, ppcOficial, diag]);

  // Lazo Learn: retroalimentación automática (CNC + restricciones + shielding).
  const retro = useMemo(
    () => generarRetroalimentacion({ cnc: ppcOficial.cnc, restricciones, salud: saludLPS }),
    [ppcOficial, restricciones, saludLPS]
  );

  if (loading) {
    return (
      <div style={{ background: BASE.white, borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
        <p style={{ color: BASE.muted, fontSize: '13px' }}>⏳ Cargando datos VDC...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header VDC compacto */}
      <div style={{
        background: BASE.white,
        borderRadius: '10px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
            VDC · Last Planner System
          </span>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
            {compromisos.length} compromisos · {ppcSemanal.length} semanas
          </span>
        </div>
        {diag.promedio !== null && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: `${diag.color}15`, color: diag.color,
            padding: '4px 12px', borderRadius: '999px',
            border: `1px solid ${diag.color}55`,
          }}>
            <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.6px', opacity: 0.85 }}>PPC PROMEDIO</span>
            <span style={{ fontSize: '14px', fontWeight: '900', fontFamily: 'var(--grapco-font-mono, monospace)' }}>
              {diag.promedioPct}%
            </span>
          </div>
        )}
      </div>

      {/* Tabs · Flujo Last Planner System
          1) LAP (lookahead 6 sem) → 2) Análisis Restricciones → 3) Prog Semanal →
          4) Ejecución Diaria → 5) PPC global → 6) RNC → 7) Lecciones */}
      <div style={{
        background: BASE.white,
        border: `1px solid ${BASE.border}`,
        borderRadius: '12px',
        padding: '8px',
      }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'tablero',       l: '🟦 Tablero (Power BI)',     group: 'ctrl' },
            { id: 'sectorizacion', l: '🧱 Sectorización · Tren',    group: 'plan' },
            { id: 'lap',           l: '🔭 LAP · Lookahead 6 sem',  group: 'plan' },
            { id: 'restricciones', l: '🚧 Análisis Restricciones', group: 'plan' },
            { id: 'progsem',       l: '📋 Programación Semanal',   group: 'plan' },
            { id: 'plandiario',    l: '📅 Plan Diario',            group: 'exec' },
            { id: 'dashboard',     l: '📊 PPC Dashboard',          group: 'ctrl' },
            { id: 'lecciones',     l: '📚 Lecciones',              group: 'ctrl' },
          ].map(t => {
            const activo = tab === t.id;
            const colorGrp = t.group === 'plan' ? BASE.gold : t.group === 'exec' ? BASE.green : BASE.navy;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activo ? `linear-gradient(135deg, ${colorGrp}, ${colorGrp}dd)` : BASE.bgSoft,
                color: activo ? '#fff' : BASE.muted,
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: activo ? `0 4px 12px ${colorGrp}55` : 'none',
                whiteSpace: 'nowrap',
                transition: '0.15s',
              }}>{t.l}</button>
            );
          })}
        </div>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '8px', paddingLeft: '6px', fontStyle: 'italic' }}>
          🟡 PROGRAMACIÓN  ·  🟢 EJECUCIÓN  ·  🔵 CONTROL — Flujo LPS oficial Ballard 2020
        </p>
      </div>

      {/* === TABLERO CONSOLIDADO (Power BI) === */}
      {tab === 'tablero' && (
        <TableroLPS
          compromisos={[...compromisos, ...lapProgramado]}
          restricciones={restricciones}
          ppcSemanal={ppcSemanalReal.length ? ppcSemanalReal : ppcSemanal}
          pareto={paretoReal.items.length ? paretoReal : pareto}
          diag={{ ...diag, promedioPct: ppcOficial.global ?? diag.promedioPct }}
          semanaActiva={semanaActiva}
          saludLPS={saludLPS}
        />
      )}

      {/* === SECTORIZACIÓN · TREN DE ACTIVIDADES (tal cual el Excel F09) === */}
      {tab === 'sectorizacion' && (
        <SectorizacionTren />
      )}

      {/* === LAP · LOOKAHEAD 6 SEMANAS === */}
      {tab === 'lap' && (
        <LookaheadView
          compromisos={compromisos}
          restricciones={restricciones}
          semanaActiva={semanaActiva}
          setSemanaActiva={setSemanaActiva}
          semanasMeta={semanasMeta}
          total={totalSemanas}
        />
      )}

      {/* === PROGRAMACIÓN SEMANAL (formato Excel S0/S1/S2) === */}
      {tab === 'progsem' && (
        <ProgramacionSemanalLPS
          semanaActiva={semanaActiva}
          setSemanaActiva={setSemanaActiva}
          restricciones={restricciones}
          semanasMeta={semanasMeta}
          total={totalSemanas}
        />
      )}

      {/* === PLAN DIARIO (asignación día a día de cuadrillas a actividades) === */}
      {tab === 'plandiario' && (
        <PlanDiario
          planesDiarios={planesDiarios}
          cuadrillasActivas={cuadrillasActivas}
          cuadrillasDB={cuadrillasDB}
          historial={historial}
          isMobile={isMobile}
          showToast={showToast}
        />
      )}

      {/* === DASHBOARD PPC (conectado al LAP) === */}
      {tab === 'dashboard' && (
        <PPCLap semanaActiva={semanaActiva} setSemanaActiva={setSemanaActiva} semanasMeta={semanasMeta} total={totalSemanas} restricciones={restricciones} />
      )}

      {/* === RESTRICCIONES === */}
      {tab === 'restricciones' && (
        <Restricciones
          restricciones={restricciones}
          onEstado={cambiarEstadoAR}
          semanaActiva={semanaActiva}
          setSemanaActiva={setSemanaActiva}
          semanasMeta={semanasMeta}
          total={totalSemanas}
          lapNombres={lapNombres}
          onNueva={() => {
            setFormRestriccion({
              actividad: '', tipoFlujo: 'materiales', descripcion: '',
              responsable: '', fechaCompromisoLiberacion: '', impacto: 'medio', estado: 'pendiente',
            });
            setModalRestriccion({ editando: null });
          }}
          onEditar={(r) => {
            setFormRestriccion({
              actividad: r.actividad || '',
              tipoFlujo: r.tipoFlujo || 'materiales',
              descripcion: r.descripcion || '',
              responsable: r.responsable || '',
              fechaCompromisoLiberacion: r.fechaCompromisoLiberacion || '',
              impacto: r.impacto || 'medio',
              estado: r.estado || 'pendiente',
            });
            setModalRestriccion({ editando: r });
          }}
          onLiberar={async (r) => {
            try {
              await updateDoc(doc(db, 'VDC_Restricciones', r.id), {
                estado: 'liberada',
                fechaLiberacionReal: new Date().toISOString().split('T')[0],
                liberadoEn: new Date(),
              });
              showToast('✅ Restricción liberada', 'success');
            } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
          }}
          onEliminar={async (r) => {
            if (!window.confirm(`¿Eliminar la restricción "${r.actividad}"?`)) return;
            try {
              await deleteDoc(doc(db, 'VDC_Restricciones', r.id));
              showToast('🗑️ Restricción eliminada', 'info');
            } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
          }}
        />
      )}

      {/* === LECCIONES === */}
      {tab === 'lecciones' && (
        <Lecciones
          lecciones={lecciones}
          sugerencias={sugerirLecciones(compromisos, lecciones)}
          retro={retro}
          onNueva={(prefill) => {
            setFormLeccion({
              titulo: prefill?.titulo || '',
              categoria: prefill?.categoria || 'materiales',
              descripcion: prefill?.descripcion || '',
              accionRecomendada: '',
            });
            setModalLeccion({ editando: null, fromSugerencia: !!prefill });
          }}
          onEditar={(l) => {
            setFormLeccion({
              titulo: l.titulo || '',
              categoria: l.categoria || 'materiales',
              descripcion: l.descripcion || '',
              accionRecomendada: l.accionRecomendada || '',
            });
            setModalLeccion({ editando: l, fromSugerencia: false });
          }}
          onEliminar={async (l) => {
            if (!window.confirm(`¿Eliminar la lección "${l.titulo}"?`)) return;
            try {
              await deleteDoc(doc(db, 'VDC_Lecciones', l.id));
              showToast('🗑️ Lección eliminada', 'info');
            } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
          }}
        />
      )}

      {/* MODAL: Restricción nueva/editar */}
      {modalRestriccion && (
        <Modal
          title={modalRestriccion.editando ? `✏️ Editar restricción` : `🚧 Nueva restricción`}
          onClose={() => setModalRestriccion(null)} maxW="540px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>ACTIVIDAD AFECTADA</label>
              <input type="text" value={formRestriccion.actividad} list="lapActsList"
                onChange={e => setFormRestriccion(p => ({ ...p, actividad: e.target.value }))}
                placeholder="Elige una actividad del LAP o escríbela"
                style={inp({ marginTop: '4px' })} />
              <datalist id="lapActsList">
                {lapNombres.map((n, i) => <option key={i} value={n} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '6px', display: 'block' }}>
                TIPO DE FLUJO LEAN (7 flujos)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
                {RESTRICCION_TIPOS.map(t => {
                  const sel = formRestriccion.tipoFlujo === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setFormRestriccion(p => ({ ...p, tipoFlujo: t.id }))}
                      style={{
                        padding: '10px 12px',
                        background: sel ? t.color + '22' : '#fff',
                        color: sel ? t.color : BASE.muted,
                        border: `1.5px solid ${sel ? t.color : BASE.border}`,
                        borderRadius: '8px', fontWeight: sel ? '800' : '600', fontSize: '11px',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                      <span style={{ fontSize: '14px', marginRight: '4px' }}>{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>DESCRIPCIÓN DETALLADA</label>
              <textarea value={formRestriccion.descripcion}
                onChange={e => setFormRestriccion(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Detalle qué falta o qué impide ejecutar la actividad"
                style={inp({ marginTop: '4px', height: '60px', resize: 'vertical' })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>RESPONSABLE</label>
                <input type="text" value={formRestriccion.responsable}
                  onChange={e => setFormRestriccion(p => ({ ...p, responsable: e.target.value }))}
                  placeholder="Quien lo levantará"
                  style={inp({ marginTop: '4px' })} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>COMPROMISO LIBERACIÓN</label>
                <input type="date" value={formRestriccion.fechaCompromisoLiberacion}
                  onChange={e => setFormRestriccion(p => ({ ...p, fechaCompromisoLiberacion: e.target.value }))}
                  style={inp({ marginTop: '4px' })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>IMPACTO</label>
                <select value={formRestriccion.impacto}
                  onChange={e => setFormRestriccion(p => ({ ...p, impacto: e.target.value }))}
                  style={inp({ marginTop: '4px' })}>
                  <option value="bajo">🟢 Bajo</option>
                  <option value="medio">🟡 Medio</option>
                  <option value="alto">🔴 Alto</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>ESTADO</label>
                <select value={formRestriccion.estado}
                  onChange={e => setFormRestriccion(p => ({ ...p, estado: e.target.value }))}
                  style={inp({ marginTop: '4px' })}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="liberada">Liberada</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setModalRestriccion(null)} style={{
                flex: 1, padding: '12px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
                color: BASE.muted, borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px',
              }}>Cancelar</button>
              <button onClick={async () => {
                if (!formRestriccion.actividad.trim()) return showToast('Ingresa la actividad', 'warning');
                try {
                  const datos = {
                    ...formRestriccion,
                    actividad: formRestriccion.actividad.trim().toUpperCase(),
                    actualizadoEn: new Date(),
                  };
                  if (formRestriccion.estado === 'liberada' && !modalRestriccion.editando?.fechaLiberacionReal) {
                    datos.fechaLiberacionReal = new Date().toISOString().split('T')[0];
                    datos.liberadoEn = new Date();
                  }
                  if (modalRestriccion.editando) {
                    await updateDoc(doc(db, 'VDC_Restricciones', modalRestriccion.editando.id), datos);
                    showToast('✅ Restricción actualizada', 'success');
                  } else {
                    await addDoc(collection(db, 'VDC_Restricciones'), { ...datos, creadoEn: new Date() });
                    showToast('✅ Restricción registrada', 'success');
                  }
                  setModalRestriccion(null);
                } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
              }} style={{
                flex: 2, padding: '12px',
                background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
                color: '#fff', border: 'none', borderRadius: '10px',
                fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                boxShadow: `0 4px 12px ${BASE.gold}55`,
              }}>{modalRestriccion.editando ? '💾 Actualizar' : '🚧 Registrar restricción'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Lección nueva/editar */}
      {modalLeccion && (
        <Modal
          title={modalLeccion.editando ? `✏️ Editar lección` : (modalLeccion.fromSugerencia ? `💡 Crear lección desde sugerencia` : `📚 Nueva lección aprendida`)}
          onClose={() => setModalLeccion(null)} maxW="520px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>TÍTULO</label>
              <input type="text" value={formLeccion.titulo}
                onChange={e => setFormLeccion(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej: Programar entregas de cemento con 48h de anticipación"
                style={inp({ marginTop: '4px' })} />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '6px', display: 'block' }}>
                CATEGORÍA (asociada a tipo RNC)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                {RNC_CATEGORIAS.map(c => {
                  const sel = formLeccion.categoria === c.id;
                  return (
                    <button key={c.id} type="button" onClick={() => setFormLeccion(p => ({ ...p, categoria: c.id }))}
                      style={{
                        padding: '8px 10px',
                        background: sel ? c.color + '22' : '#fff',
                        color: sel ? c.color : BASE.muted,
                        border: `1.5px solid ${sel ? c.color : BASE.border}`,
                        borderRadius: '8px', fontWeight: sel ? '800' : '600', fontSize: '11px',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                      <span style={{ fontSize: '13px', marginRight: '3px' }}>{c.icon}</span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>QUÉ PASÓ (descripción del problema)</label>
              <textarea value={formLeccion.descripcion}
                onChange={e => setFormLeccion(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="El problema que se identificó y por qué ocurría"
                style={inp({ marginTop: '4px', height: '60px', resize: 'vertical' })} />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>ACCIÓN RECOMENDADA</label>
              <textarea value={formLeccion.accionRecomendada}
                onChange={e => setFormLeccion(p => ({ ...p, accionRecomendada: e.target.value }))}
                placeholder="Qué hacer en proyectos futuros para evitar este problema"
                style={inp({ marginTop: '4px', height: '70px', resize: 'vertical' })} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setModalLeccion(null)} style={{
                flex: 1, padding: '12px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
                color: BASE.muted, borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px',
              }}>Cancelar</button>
              <button onClick={async () => {
                if (!formLeccion.titulo.trim()) return showToast('Ingresa el título', 'warning');
                try {
                  const datos = { ...formLeccion, titulo: formLeccion.titulo.trim(), actualizadoEn: new Date() };
                  if (modalLeccion.editando) {
                    await updateDoc(doc(db, 'VDC_Lecciones', modalLeccion.editando.id), datos);
                    showToast('✅ Lección actualizada', 'success');
                  } else {
                    await addDoc(collection(db, 'VDC_Lecciones'), { ...datos, creadoEn: new Date() });
                    showToast('📚 Lección guardada', 'success');
                  }
                  setModalLeccion(null);
                } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
              }} style={{
                flex: 2, padding: '12px',
                background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
                color: '#fff', border: 'none', borderRadius: '10px',
                fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                boxShadow: `0 4px 12px ${BASE.green}55`,
              }}>{modalLeccion.editando ? '💾 Actualizar' : '📚 Guardar lección'}</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ════════════════════════════════════════════════
// SUB-VISTAS
// ════════════════════════════════════════════════

// SUB-COMPONENTE: RESTRICCIONES (Lookahead Lean)
// ════════════════════════════════════════════════════════════════

// Estado AR estilo Excel (REALIZADO/EN PROCESO/PENDIENTE/VENCIDA) + estilos de tabla.
const EST_EXCEL = {
  liberada:   { label: 'REALIZADO',  bg: '#dcfce7', color: '#15803d' },
  en_proceso: { label: 'EN PROCESO', bg: '#fef9c3', color: '#a16207' },
  pendiente:  { label: 'PENDIENTE',  bg: '#fee2e2', color: '#dc2626' },
  vencida:    { label: 'VENCIDA',    bg: '#fecaca', color: '#7f1d1d' },
};
const arTd = { padding: '5px 8px', borderRight: '1px solid #eef2f6', verticalAlign: 'middle' };
const arTdC = { ...arTd, textAlign: 'center', whiteSpace: 'nowrap' };
const arMini = (bg, col) => ({ padding: '4px 7px', background: bg, color: col, border: 'none', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', marginLeft: '3px' });

function Restricciones({ restricciones, onNueva, onEditar, onLiberar, onEliminar, onEstado, semanaActiva, setSemanaActiva, semanasMeta = {}, total = 35, lapNombres = [] }) {
  const kpi = useMemo(() => calcularKPIRestricciones(restricciones), [restricciones]);
  // Diagnóstico de vínculo AR↔LAP: restricciones cuya actividad no existe en el LAP
  // (no aplicarían shielding/badges). Riesgo silencioso → lo hacemos visible.
  const huerfanas = useMemo(() => restriccionesHuerfanas(restricciones, lapNombres), [restricciones, lapNombres]);
  const [verHuerfanas, setVerHuerfanas] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  // Semana COMPARTIDA con LAP / PS / PPC (un único filtro para todo el LPS).
  const semanaAR = semanaActiva;
  const setSemanaAR = setSemanaActiva;
  const [verTodasSem, setVerTodasSem] = useState(false);
  // Ventana Make-Ready (igual que el Lookahead): el AR se revisa sobre 4–6 semanas,
  // no una sola. rangoAR = nº de semanas hacia adelante desde la semana activa.
  const [rangoAR, setRangoAR] = useState(6);
  const winEnd = semanaAR + rangoAR - 1;
  const reqW = (r) => r.fechaCompromisoLiberacion ? obtenerSemana(r.fechaCompromisoLiberacion) : null;
  const cicloEstado = { pendiente: 'en_proceso', en_proceso: 'liberada', liberada: 'pendiente', vencida: 'liberada' };
  const curWeek = obtenerSemana(new Date().toISOString().slice(0, 10));

  const filtradas = useMemo(() => {
    let lista = kpi.lista;
    if (filtroEstado !== 'todos') lista = lista.filter(r => r._estado === filtroEstado);
    if (!verTodasSem) lista = lista.filter(r => { const w = reqW(r); return w != null && w >= semanaAR && w <= winEnd; });
    return lista;
  }, [kpi.lista, filtroEstado, semanaAR, winEnd, verTodasSem]);

  // KPIs Make-Ready de la VENTANA (superan al Excel): PCR = % restricciones removidas;
  // PPR = % actividades "listas" (sin restricción pendiente) → lo que SÍ se puede
  // comprometer (production shielding); En riesgo = pendientes cuya fecha-límite ya
  // venció o vence dentro de la ventana (last responsible moment).
  const makeReady = useMemo(() => {
    const lista = filtradas;
    const total = lista.length;
    const liberadas = lista.filter(r => r._estado === 'liberada').length;
    const acts = {};
    lista.forEach(r => { const k = (r.actividad || '?'); (acts[k] || (acts[k] = { pend: 0 })); if (r._estado !== 'liberada') acts[k].pend += 1; });
    const nAct = Object.keys(acts).length;
    const listas = Object.values(acts).filter(a => a.pend === 0).length;
    const enRiesgo = lista.filter(r => r._estado !== 'liberada' && reqW(r) != null && reqW(r) <= curWeek).length;
    return { total, liberadas, pcr: total ? Math.round(liberadas / total * 100) : null, nAct, listas, ppr: nAct ? Math.round(listas / nAct * 100) : null, enRiesgo };
  }, [filtradas]);

  // Semana con más restricciones (para el atajo cuando la ventana actual está vacía).
  const semanaTop = useMemo(() => {
    const c = {}; kpi.lista.forEach(r => { const w = reqW(r); if (w) c[w] = (c[w] || 0) + 1; });
    const ent = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return ent.length ? { sem: parseInt(ent[0][0], 10), n: ent[0][1] } : null;
  }, [kpi.lista]);

  const ordenadas = useMemo(
    () => [...filtradas].sort((a, b) => {
      // vencidas primero, después por fecha de compromiso ascendente
      const orden = { vencida: 0, en_proceso: 1, pendiente: 2, liberada: 3 };
      const oa = orden[a._estado] ?? 9, ob = orden[b._estado] ?? 9;
      if (oa !== ob) return oa - ob;
      return (a.fechaCompromisoLiberacion || '').localeCompare(b.fechaCompromisoLiberacion || '');
    }),
    [filtradas]
  );

  // Agrupadas por actividad (tal cual el Excel AR).
  const grupos = useMemo(() => {
    const m = {};
    filtradas.forEach(r => { const k = r.actividad || '(sin actividad)'; (m[k] || (m[k] = [])).push(r); });
    return Object.entries(m)
      .map(([act, items]) => ({ act, items: items.sort((a, b) => (a.fechaCompromisoLiberacion || '').localeCompare(b.fechaCompromisoLiberacion || '')) }))
      .sort((a, b) => (a.items[0].fechaCompromisoLiberacion || 'zzz').localeCompare(b.items[0].fechaCompromisoLiberacion || 'zzz'));
  }, [filtradas]);

  // Rango de semanas para la grilla. En modo ventana (Make-Ready) la grilla cubre
  // EXACTAMENTE las semanas de la ventana [semanaAR .. winEnd] (tal cual el Lookahead
  // del Excel a 4–6 sem). En "Todas" cubre desde la semana 1 hasta la última con datos.
  const semGrid = useMemo(() => {
    let lo = 1, hi;
    if (verTodasSem) {
      let maxW = curWeek;
      filtradas.forEach(r => { [r.fechaCompromisoLiberacion, r.fechaConciliada].forEach(f => { if (f) maxW = Math.max(maxW, obtenerSemana(f)); }); });
      hi = Math.min(Math.max(maxW, 6), 34);
    } else { lo = semanaAR; hi = winEnd; }
    const arr = [];
    for (let n = lo; n <= hi; n++) { const d = fechasDeSemana(n, INICIO_PROYECTO)[0]; arr.push({ n, dia: d ? d.dia : '', mes: d ? d.mes : '' }); }
    return arr;
  }, [filtradas, curWeek, verTodasSem, semanaAR, winEnd]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Cabecera + FILTRO DE SEMANA UNIFICADO (compartido con LAP, PS y PPC) */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy }}>🚧 ANÁLISIS DE RESTRICCIONES · {verTodasSem ? 'Todas las semanas' : `Ventana S${semanaAR}–S${winEnd} (${rangoAR} sem)`}</h3>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
          Proceso <strong>Make-Ready</strong> sobre la ventana del Lookahead (4–6 sem, tal cual el Excel F04): revisa qué actividades estarán <strong>listas</strong> y qué falta liberar y <strong>para cuándo</strong>. Elige la ventana abajo. Clic en ESTADO para cambiarlo.
        </p>
      </div>
      <SemanaNav semana={semanaAR} setSemana={setSemanaAR} total={total} meta={semanasMeta} titulo="ventana Make-Ready" rango={rangoAR} setRango={setRangoAR} rangoOpts={[1, 4, 6]} allowTodas todas={verTodasSem} setTodas={setVerTodasSem} />

      {/* PANEL MAKE-READY de la ventana (KPIs superiores al Excel: PCR, PPR, en riesgo) */}
      {!verTodasSem && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {[
            { l: 'PCR · RESTRICCIONES REMOVIDAS', v: makeReady.pcr == null ? '—' : makeReady.pcr + '%', c: BASE.greenDark, sub: `${makeReady.liberadas} de ${makeReady.total} liberadas` },
            { l: 'PPR · ACTIVIDADES LISTAS', v: makeReady.ppr == null ? '—' : makeReady.ppr + '%', c: BASE.navy, sub: `${makeReady.listas} de ${makeReady.nAct} sin pendientes` },
            { l: 'EN RIESGO (FECHA-LÍMITE)', v: makeReady.enRiesgo, c: makeReady.enRiesgo > 0 ? BASE.red : BASE.greenDark, sub: makeReady.enRiesgo > 0 ? '⚠️ Vencen o vencieron' : 'Bajo control' },
            { l: 'RESTRICCIONES EN VENTANA', v: makeReady.total, c: BASE.gold, sub: `S${semanaAR}–S${winEnd}` },
          ].map(k => (
            <div key={k.l} style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderRadius: '12px', padding: '12px 15px', borderLeft: `4px solid ${k.c}`, boxShadow: BASE.shadowSm }}>
              <p style={{ fontSize: '9px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.6px' }}>{k.l}</p>
              <p style={{ fontSize: '26px', fontWeight: 900, color: '#fff', marginTop: '2px', lineHeight: 1.05 }}>{k.v}</p>
              <p style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* DIAGNÓSTICO DE VÍNCULO AR↔LAP: restricciones que no enlazan con el LAP */}
      {lapNombres.length > 0 && huerfanas.length > 0 && (
        <div style={{ background: '#fffbeb', border: `1px solid ${BASE.gold}`, borderLeft: `4px solid ${BASE.gold}`, borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, color: BASE.goldDark }}>🔗 {huerfanas.length} restricción(es) no enlazan con el LAP</span>
            <span style={{ fontSize: '10.5px', color: BASE.muted, flex: 1, minWidth: 0 }}>su nombre de actividad no coincide con ninguna del LAP → no aplican shielding ni badges. Revisa el nombre.</span>
            <button onClick={() => setVerHuerfanas(v => !v)} style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${BASE.gold}`, background: '#fff', color: BASE.goldDark, fontSize: '10.5px', fontWeight: 800, cursor: 'pointer' }}>{verHuerfanas ? 'Ocultar' : 'Ver cuáles'}</button>
          </div>
          {verHuerfanas && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', columns: '2', fontSize: '11px', color: BASE.text }}>
              {huerfanas.map((n, i) => <li key={i} style={{ marginBottom: '2px' }}>{n}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* KPIs Restricciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        {[
          { l: 'TOTAL', v: kpi.total, c: BASE.navy, sub: 'Restricciones registradas' },
          { l: 'PENDIENTES', v: kpi.pendientes + kpi.enProceso, c: BASE.gold, sub: `${kpi.enProceso} en proceso` },
          { l: 'LIBERADAS', v: kpi.liberadas, c: BASE.greenDark, sub: kpi.pctLiberadasATiempo !== null ? `${Math.round(kpi.pctLiberadasATiempo)}% a tiempo` : '' },
          { l: 'VENCIDAS', v: kpi.vencidas, c: BASE.red, sub: kpi.vencidas > 0 ? '⚠️ Atención inmediata' : 'Sin vencidas' },
          { l: 'PRÓXIMAS A VENCER', v: kpi.proximasAVencer.length, c: BASE.gold, sub: 'En 7 días' },
        ].map(k => (
          <div key={k.l} style={{
            background: BASE.white, borderRadius: '12px',
            border: `1px solid ${BASE.border}`, padding: '14px 16px', boxShadow: BASE.shadowSm,
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>{k.l}</p>
            <p style={{ fontSize: '24px', fontWeight: '900', color: k.c, marginTop: '4px' }}>{k.v}</p>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Distribución por flujo Lean */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
            DISTRIBUCIÓN POR FLUJO LEAN
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
          {RESTRICCION_TIPOS.map(t => {
            const count = kpi.porTipo[t.id] || 0;
            const pct = kpi.total > 0 ? (count / kpi.total) * 100 : 0;
            return (
              <div key={t.id} style={{
                background: count > 0 ? t.color + '12' : BASE.bgSoft,
                border: `1px solid ${count > 0 ? t.color + '55' : BASE.border}`,
                borderRadius: '10px', padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{t.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: t.color, letterSpacing: '0.4px' }}>
                    {t.label.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '20px', fontWeight: '900', color: count > 0 ? t.color : BASE.muted, marginTop: '4px' }}>
                  {count}
                </p>
                <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '2px' }}>
                  {Math.round(pct)}% del total
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones + filtro */}
      <div style={{
        background: BASE.white, borderRadius: '12px',
        border: `1px solid ${BASE.border}`, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      }}>
        <button onClick={onNueva} style={{
          padding: '9px 16px',
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          boxShadow: `0 3px 10px ${BASE.gold}55`,
        }}>+ Nueva restricción</button>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'todos',      l: 'Todas' },
            { id: 'vencida',    l: '🔴 Vencidas' },
            { id: 'pendiente',  l: '⏳ Pendientes' },
            { id: 'en_proceso', l: '🔄 En proceso' },
            { id: 'liberada',   l: '✅ Liberadas' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltroEstado(f.id)} style={{
              padding: '7px 12px', borderRadius: '8px', border: 'none',
              background: filtroEstado === f.id ? BASE.navy : '#e2e8f0',
              color: filtroEstado === f.id ? '#fff' : BASE.muted,
              fontSize: '11px', fontWeight: '700', cursor: 'pointer',
            }}>{f.l}</button>
          ))}
        </div>

        <span style={{ fontSize: '11px', color: BASE.muted, marginLeft: 'auto' }}>
          {ordenadas.length} de {kpi.total}
        </span>
      </div>

      {/* TABLA AR — tal cual el Excel (Frente·Actividad·Restricción·Tipo·RESP·Fechas·Estado), premium */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', padding: '11px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: `3px solid ${BASE.gold}` }}>
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.6px' }}>📋 {verTodasSem ? 'TODAS LAS SEMANAS' : `VENTANA S${semanaAR}–S${winEnd}`}</span>
          <span style={{ fontSize: '11px', opacity: 0.85 }}>{ordenadas.length} de {kpi.total} · clic en ESTADO para cambiarlo</span>
        </div>
        {grupos.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '13px' }}>
            🚧 {kpi.total === 0 ? 'No hay restricciones aún. Regístralas desde el lookahead.' : `Sin restricciones en esta ventana (S${semanaAR}–S${winEnd}).`}
            {kpi.total > 0 && semanaTop && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => { setVerTodasSem(false); setSemanaAR(Math.max(1, semanaTop.sem)); }}
                  style={{ padding: '8px 14px', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 3px 10px ${BASE.gold}55` }}>
                  ⭐ Ir a la Semana {semanaTop.sem} ({semanaTop.n} restric.)
                </button>
                <button onClick={() => setVerTodasSem(true)}
                  style={{ padding: '8px 14px', background: BASE.white, color: BASE.navy, border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                  Ver todas las semanas
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: 1000 }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  {[['FRENTE', 'left'], ['ACTIVIDAD', 'left'], ['RESTRICCIÓN', 'left'], ['TIPO', 'left'], ['RESP', 'center'], ['F. REQ.', 'center'], ['F. CONCIL.', 'center'], ['LEVANTA', 'center'], ['ESTADO', 'center'], ['', 'right']].map(([h, al], i) => (
                    <th key={i} style={{ position: 'sticky', top: 0, background: BASE.navy, padding: '9px 8px', textAlign: al, fontSize: '9px', fontWeight: 900, letterSpacing: '0.4px', borderRight: `1px solid rgba(255,255,255,0.14)`, whiteSpace: 'nowrap', zIndex: 1 }}>{h}</th>
                  ))}
                  {semGrid.map(s => (
                    <th key={'w' + s.n} title={`Semana ${s.n} · ${s.dia}/${s.mes}`} style={{ position: 'sticky', top: 0, background: s.n === curWeek ? BASE.gold : BASE.navy, color: '#fff', padding: '3px 0', textAlign: 'center', fontSize: '7.5px', fontWeight: 800, width: 16, minWidth: 16, borderRight: '1px solid rgba(255,255,255,0.12)', zIndex: 1 }}>{s.n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(g => (
                  <React.Fragment key={g.act}>
                    <tr>
                      <td colSpan={10 + semGrid.length} style={{ background: '#fff7e6', borderLeft: `4px solid ${BASE.gold}`, borderTop: `1px solid ${BASE.border}`, borderBottom: `1px solid ${BASE.border}`, padding: '6px 12px', fontWeight: 900, fontSize: '10.5px', color: BASE.navy, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {g.act} <span style={{ color: BASE.muted, fontWeight: 700 }}>· {g.items.length} restric.</span>
                      </td>
                    </tr>
                    {g.items.map((r, ri) => {
                      const tipo = RESTRICCION_TIPOS_MAP[r.tipoFlujo] || { icon: '📌', label: 'Otro', color: BASE.muted };
                      const est = EST_EXCEL[r._estado] || EST_EXCEL.pendiente;
                      return (
                        <tr key={r.id} style={{ background: ri % 2 ? '#f8fbff' : '#fff', borderBottom: `1px solid #eef2f6` }}>
                          <td style={{ ...arTdC, fontWeight: 800, color: BASE.navy }}>{r.frente || ''}</td>
                          <td style={{ ...arTd, color: BASE.muted, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.actividad}>{r.actividad}</td>
                          <td style={{ ...arTd, fontWeight: 700, color: BASE.text }}>{r.descripcion}</td>
                          <td style={arTd}><span style={{ color: tipo.color, fontWeight: 800, fontSize: '10px', whiteSpace: 'nowrap' }}>{tipo.icon} {tipo.label}</span></td>
                          <td style={{ ...arTdC, fontWeight: 700 }}>{r.responsable || ''}</td>
                          <td style={{ ...arTdC, fontFamily: 'monospace', color: BASE.text }}>{r.fechaCompromisoLiberacion ? fmtFechaCorta(r.fechaCompromisoLiberacion) : ''}</td>
                          <td style={{ ...arTdC, fontFamily: 'monospace', color: r.fechaConciliada ? BASE.greenDark : BASE.muted }}>{r.fechaConciliada ? fmtFechaCorta(r.fechaConciliada) : '—'}</td>
                          <td style={{ ...arTdC, color: BASE.muted }}>{r.responsableLevanta || ''}</td>
                          <td onClick={() => onEstado && onEstado(r, cicloEstado[r._estado] || 'liberada')} title="Clic para cambiar estado (pendiente → en proceso → realizado)"
                            style={{ padding: '4px', textAlign: 'center', borderRight: `1px solid #eef2f6`, cursor: onEstado ? 'pointer' : 'default' }}>
                            <span style={{ display: 'inline-block', minWidth: 78, background: est.bg, color: est.color, padding: '4px 6px', borderRadius: '5px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.3px' }}>{est.label}</span>
                          </td>
                          <td style={{ padding: '3px 6px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                            {r._estado !== 'liberada' && <button onClick={() => onLiberar(r)} title="Liberar" style={arMini(BASE.green, '#fff')}>✅</button>}
                            <button onClick={() => onEditar(r)} title="Editar" style={arMini(BASE.bgSoft, BASE.navy)}>✏️</button>
                            <button onClick={() => onEliminar(r)} title="Eliminar" style={arMini('#fee2e2', BASE.red)}>🗑️</button>
                          </td>
                          {(() => {
                            const reqW = r.fechaCompromisoLiberacion ? obtenerSemana(r.fechaCompromisoLiberacion) : null;
                            const concW = r.fechaConciliada ? obtenerSemana(r.fechaConciliada) : null;
                            const startW = reqW || concW;
                            const endW = r._estado === 'liberada' ? (concW || reqW || 0) : Math.max(reqW || 0, concW || 0, curWeek);
                            const col = r._estado === 'liberada' ? '#22c55e' : r._estado === 'en_proceso' ? '#f59e0b' : '#ef4444';
                            return semGrid.map(s => {
                              const on = startW && s.n >= Math.min(startW, endW) && s.n <= Math.max(startW, endW);
                              const rel = concW && s.n === concW && r._estado === 'liberada';
                              return <td key={'w' + s.n} style={{ padding: 0, width: 16, minWidth: 16, borderRight: '1px solid #eef2f6', background: on ? (rel ? '#15803d' : col) : (s.n === curWeek ? 'rgba(225,29,72,0.06)' : 'transparent') }} />;
                            });
                          })()}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: LECCIONES APRENDIDAS
// ════════════════════════════════════════════════════════════════

function Lecciones({ lecciones, sugerencias, onNueva, onEditar, onEliminar, retro = [] }) {
  const kpi = useMemo(() => calcularKPILecciones(lecciones), [lecciones]);
  const sevColor = { alta: BASE.red, media: BASE.gold, info: BASE.navy };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* RETROALIMENTACIÓN AUTOMÁTICA (lazo Learn — Did→Learn) */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderRadius: '14px', padding: '16px 18px', borderTop: `3px solid ${BASE.gold}`, boxShadow: BASE.shadowMd }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff', letterSpacing: '0.4px' }}>🔄 RETROALIMENTACIÓN AUTOMÁTICA</span>
          <span style={{ fontSize: '10px', fontWeight: 800, color: BASE.gold }}>Lazo Learn · Did → Learn</span>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '12px' }}>
          Hallazgos derivados solos de las causas CNC del PPC, las restricciones y el shielding. Cada uno trae su <strong style={{ color: '#fff' }}>acción recomendada</strong> que vuelve a la planificación.
        </p>
        {retro.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>✅ Sin hallazgos críticos: el sistema no detecta causas recurrentes ni compromisos en riesgo ahora mismo.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {retro.map((r, i) => {
              const c = sevColor[r.sev] || BASE.gold;
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: `4px solid ${c}`, borderRadius: '10px', padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '15px' }}>{r.icon}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{r.titulo}</span>
                  </div>
                  <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{r.detalle}</p>
                  <p style={{ fontSize: '10.5px', color: '#fff', background: 'rgba(229,168,47,0.16)', border: `1px solid ${BASE.gold}55`, borderRadius: '7px', padding: '6px 9px', lineHeight: 1.4 }}>
                    <strong style={{ color: BASE.gold }}>Acción → </strong>{r.accion}
                  </p>
                  <button onClick={() => onNueva({ titulo: r.titulo, categoria: r.categoria, descripcion: `${r.detalle}\n\nAcción recomendada: ${r.accion}` })}
                    style={{ alignSelf: 'flex-start', padding: '5px 11px', borderRadius: '7px', border: 'none', background: BASE.gold, color: BASE.navy, fontSize: '10.5px', fontWeight: 800, cursor: 'pointer' }}>
                    ＋ Guardar como lección
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, padding: '14px 16px', boxShadow: BASE.shadowSm }}>
          <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>LECCIONES TOTALES</p>
          <p style={{ fontSize: '28px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>{kpi.total}</p>
          <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>Documentadas</p>
        </div>
        <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, padding: '14px 16px', boxShadow: BASE.shadowSm }}>
          <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>SUGERENCIAS PENDIENTES</p>
          <p style={{ fontSize: '28px', fontWeight: '900', color: sugerencias.length > 0 ? BASE.gold : BASE.greenDark, marginTop: '4px' }}>
            {sugerencias.length}
          </p>
          <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
            {sugerencias.length > 0 ? 'Categorías con ≥3 incidentes' : 'Todo documentado'}
          </p>
        </div>
        <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, padding: '14px 16px', boxShadow: BASE.shadowSm }}>
          <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>CATEGORÍA MÁS DOCUMENTADA</p>
          {kpi.masAplicada.length > 0 ? (
            <>
              <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
                {RNC_ICONS[kpi.masAplicada[0].categoria]} {RNC_LABELS[kpi.masAplicada[0].categoria]}
              </p>
              <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                {kpi.masAplicada[0].count} lecciones
              </p>
            </>
          ) : (
            <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '6px' }}>Aún sin datos</p>
          )}
        </div>
      </div>

      {/* SUGERENCIAS AUTOMÁTICAS */}
      {sugerencias.length > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${BASE.gold}10, ${BASE.gold}05)`,
          border: `1.5px solid ${BASE.gold}55`,
          borderLeft: `5px solid ${BASE.goldDark}`,
          borderRadius: '14px', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.goldDark, letterSpacing: '0.4px' }}>
              SUGERENCIAS AUTOMÁTICAS — Categorías con ≥3 incidentes RNC sin lección documentada
            </h3>
          </div>
          <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '12px', marginLeft: '26px' }}>
            El sistema detectó patrones recurrentes. Crea una lección para evitar que el problema se repita.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sugerencias.map(s => (
              <div key={s.categoria} style={{
                background: BASE.white, borderRadius: '10px', padding: '12px 14px',
                border: `1px solid ${BASE.border}`,
                display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>{RNC_ICONS[s.categoria]}</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: RNC_COLORS[s.categoria] }}>
                      {RNC_LABELS[s.categoria]}
                    </span>
                    <span style={{
                      background: BASE.red, color: '#fff',
                      padding: '2px 8px', borderRadius: '12px',
                      fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px',
                    }}>
                      {s.incidentes} incidentes
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: BASE.muted, lineHeight: 1.4 }}>
                    Últimos casos: {s.ejemplos.map(e => `${e.actividad} (S${e.semana})`).join(', ')}
                  </p>
                </div>
                <button onClick={() => onNueva({
                  titulo: `Evitar problemas de ${RNC_LABELS[s.categoria].toLowerCase()}`,
                  categoria: s.categoria,
                  descripcion: `Se detectaron ${s.incidentes} incidentes en la categoría ${RNC_LABELS[s.categoria]} en el proyecto.`,
                })} style={{
                  padding: '8px 14px',
                  background: BASE.goldDark, color: '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  📝 Crear lección
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón nueva lección manual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => onNueva()} style={{
          padding: '10px 18px',
          background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
          color: '#fff', border: 'none', borderRadius: '10px',
          fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          boxShadow: `0 3px 10px ${BASE.green}55`,
        }}>+ Nueva lección manual</button>
        <span style={{ fontSize: '11px', color: BASE.muted }}>
          Documenta aprendizajes para que el equipo los use en proyectos futuros
        </span>
      </div>

      {/* Lista de lecciones */}
      {lecciones.length === 0 ? (
        <div style={{
          background: BASE.white, borderRadius: '14px',
          border: `2px dashed ${BASE.border}`, padding: '50px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '36px', marginBottom: '10px' }}>📚</p>
          <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>
            Sin lecciones aprendidas registradas
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
            Documenta aquí los aprendizajes del proyecto para evitar repetir errores.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          {lecciones.map(l => {
            const cat = RNC_CATEGORIAS.find(c => c.id === l.categoria) || { icon: '📌', label: 'Otro', color: BASE.muted };
            return (
              <div key={l.id} style={{
                background: BASE.white, borderRadius: '12px',
                border: `1px solid ${BASE.border}`,
                borderTop: `4px solid ${cat.color}`,
                padding: '16px 18px',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                  <span style={{
                    fontSize: '9px', fontWeight: '800', letterSpacing: '0.6px',
                    color: cat.color, textTransform: 'uppercase',
                  }}>
                    {cat.label}
                  </span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, marginBottom: '8px', lineHeight: 1.3 }}>
                  {l.titulo}
                </h4>
                {l.descripcion && (
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px', marginBottom: '2px' }}>
                      ¿QUÉ PASÓ?
                    </p>
                    <p style={{ fontSize: '11px', color: BASE.text, lineHeight: 1.5 }}>
                      {l.descripcion}
                    </p>
                  </div>
                )}
                {l.accionRecomendada && (
                  <div style={{
                    background: BASE.greenLight, borderRadius: '8px',
                    padding: '8px 10px', marginTop: '8px',
                    borderLeft: `3px solid ${BASE.green}`,
                  }}>
                    <p style={{ fontSize: '9px', fontWeight: '800', color: BASE.greenDark, letterSpacing: '0.4px', marginBottom: '2px' }}>
                      ✅ ACCIÓN RECOMENDADA
                    </p>
                    <p style={{ fontSize: '11px', color: BASE.greenDark, lineHeight: 1.5, fontWeight: '600' }}>
                      {l.accionRecomendada}
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '4px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => onEditar(l)} style={{
                    padding: '5px 10px', background: BASE.bgSoft, color: BASE.navy,
                    border: `1px solid ${BASE.border}`, borderRadius: '6px',
                    fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                  }}>✏️ Editar</button>
                  <button onClick={() => onEliminar(l)} style={{
                    padding: '5px 10px', background: '#fee2e2', color: BASE.red,
                    border: 'none', borderRadius: '6px',
                    fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                  }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPER: Botón de impresión (común a todas las vistas LPS)
// ════════════════════════════════════════════════════════════════
function BotonImprimir({ titulo }) {
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const descargarPDF = async () => {
    try {
      setGenerandoPDF(true);
      const { exportarTablaDOMaPDF } = await import('../utils/pdfExport');
      // Buscar la primera tabla LPS visible en el DOM
      const tabla = document.querySelector('main table, section table, [data-lps-table]');
      if (!tabla) {
        window.print();  // fallback
        return;
      }
      await exportarTablaDOMaPDF({
        tablaSelector: 'main table, section table, [data-lps-table]',
        titulo,
        nombreArchivo: titulo.replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.pdf',
        orientacion: 'landscape',
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
      window.print();  // fallback a impresión nativa
    } finally {
      setGenerandoPDF(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', gap: '6px' }}>
      <button onClick={() => window.print()} style={{
        padding: '8px 14px',
        background: BASE.white, color: BASE.navy,
        border: `1.5px solid ${BASE.border}`, borderRadius: '8px',
        fontSize: '11px', fontWeight: '800', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
      }} title={`Imprimir: ${titulo}`}>
        🖨️ Imprimir
      </button>
      <button onClick={descargarPDF} disabled={generandoPDF} style={{
        padding: '8px 14px',
        background: generandoPDF ? BASE.bgSoft : `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
        color: generandoPDF ? BASE.muted : '#fff',
        border: `1.5px solid ${generandoPDF ? BASE.border : BASE.gold}`,
        borderRadius: '8px',
        fontSize: '11px', fontWeight: '800',
        cursor: generandoPDF ? 'wait' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        boxShadow: generandoPDF ? 'none' : `0 4px 12px ${BASE.gold}55`,
      }} title={`Descargar PDF: ${titulo}`}>
        {generandoPDF ? '⏳ Generando...' : '📥 Descargar PDF'}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Clave estable de una marca (actividad+fecha) — compartida por el hook editor
// y la lectura del Power BI, para que ambos hablen el mismo idioma.
const lapHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const lapClave = (actKey, fecha) => `a${lapHash(actKey)}_${fecha.replace(/-/g, '')}`;

// Normaliza un nombre de actividad para enlazar AR↔LAP↔PPC de forma ROBUSTA:
// quita tildes/diacríticos, mayúsculas, elimina puntuación y colapsa espacios.
// Así "Encofrado de columnas (eje A)" y "ENCOFRADO  DE COLUMNAS EJE A" enlazan.
const normActividad = (s) => (s == null ? '' : String(s))
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // tildes/diacríticos
  .toUpperCase()
  .replace(/[^A-Z0-9 ]/g, ' ')                         // puntuación → espacio
  .replace(/\s+/g, ' ')
  .trim();

// Indexa restricciones por nombre de actividad NORMALIZADO (AR ↔ LAP).
function restriccionesPorActividad(restricciones) {
  const m = {};
  (restricciones || []).forEach(r => {
    const k = normActividad(r.actividad);
    if (!k) return;
    if (!m[k]) m[k] = { pend: 0, total: 0 };
    m[k].total++;
    if (r.estado !== 'liberada') m[k].pend++;
  });
  return m;
}

// Diagnóstico de vínculo: nombres de actividad del AR que NO enlazan con ninguna
// actividad del LAP (riesgo silencioso — el shielding/badges no aplicarían).
function restriccionesHuerfanas(restricciones, actividadesLap) {
  const setLap = new Set((actividadesLap || []).map(normActividad).filter(Boolean));
  const out = []; const visto = new Set();
  (restricciones || []).forEach(r => {
    const k = normActividad(r.actividad);
    if (!k || setLap.has(k) || visto.has(k)) return;
    visto.add(k); out.push(r.actividad);
  });
  return out;
}

// ════════════════════════════════════════════════════════════════
// LAZO LEARN (RETROALIMENTACIÓN AUTOMÁTICA)
// Cierra el ciclo Ballard Did→Learn: de las causas CNC del PPC + las
// restricciones (flujo dominante, vencidas) + el shielding/PPR, genera
// hallazgos con su ACCIÓN recomendada que vuelven a la planificación.
// ════════════════════════════════════════════════════════════════
const ACCIONES_RETRO = [
  { re: /material|logist|abastec|sumin|procur/i, a: 'Adelanta la procura y confirma fechas de entrega; vuélvelo restricción con fecha-límite en el AR.' },
  { re: /mano de obra|personal|cuadrilla|rr ?hh/i, a: 'Revisa el dimensionamiento de cuadrillas y la curva de personal vs. la carga programada.' },
  { re: /equipo|maquin/i, a: 'Asegura disponibilidad y mantenimiento de equipos antes de comprometer la actividad.' },
  { re: /dise|ingenier|plano|rfi|informaci/i, a: 'Gestiona planos/RFIs con anticipación; llévalo a restricción de "información" con responsable y fecha.' },
  { re: /prerre|predeces|secuen|previa/i, a: 'Respeta la secuencia constructiva: no comprometas hasta cerrar la actividad predecesora.' },
  { re: /program|planif/i, a: 'Compromete sólo lo libre de restricciones (shielding) y ajusta el dimensionamiento semanal.' },
  { re: /clima|extern|tercero|client|munic|permis/i, a: 'Planifica holguras y escala externos/permisos con tiempo; agrégalos como restricción temprana.' },
  { re: /calidad|retrab|observ/i, a: 'Refuerza el control de calidad en proceso para evitar retrabajos y reprogramaciones.' },
];
const accionRetro = (label) => (ACCIONES_RETRO.find(x => x.re.test(label || '')) || { a: 'Analiza la causa raíz (5 porqués) y define una contramedida para el próximo lookahead.' }).a;

function generarRetroalimentacion({ cnc = [], restricciones = [], salud = {} }) {
  const out = [];
  const hoy = new Date().toISOString().slice(0, 10);
  const cncOrd = [...(cnc || [])].sort((a, b) => (b.n || 0) - (a.n || 0));
  if (cncOrd[0]) out.push({ sev: 'alta', icon: '📉', titulo: `Causa de incumplimiento #1: ${cncOrd[0].cat}`, detalle: `${cncOrd[0].n} incumplimientos atribuidos a "${cncOrd[0].cat}" en el PPC.`, accion: accionRetro(cncOrd[0].cat), categoria: 'programacion' });
  if (cncOrd[1] && cncOrd[1].n) out.push({ sev: 'media', icon: '📉', titulo: `Causa recurrente: ${cncOrd[1].cat}`, detalle: `${cncOrd[1].n} incumplimientos por "${cncOrd[1].cat}".`, accion: accionRetro(cncOrd[1].cat), categoria: 'programacion' });
  const flujo = {};
  (restricciones || []).forEach(r => { if (r.estado !== 'liberada' && r.tipoFlujo) flujo[r.tipoFlujo] = (flujo[r.tipoFlujo] || 0) + 1; });
  const fOrd = Object.entries(flujo).sort((a, b) => b[1] - a[1]);
  if (fOrd[0]) { const lab = (RESTRICCION_TIPOS_MAP[fOrd[0][0]] || {}).label || fOrd[0][0]; out.push({ sev: 'media', icon: '🚧', titulo: `Flujo que más restringe: ${lab}`, detalle: `${fOrd[0][1]} restricciones pendientes del flujo ${lab}.`, accion: accionRetro(lab), categoria: fOrd[0][0] }); }
  const venc = (restricciones || []).filter(r => r.estado !== 'liberada' && r.fechaCompromisoLiberacion && r.fechaCompromisoLiberacion < hoy).length;
  if (venc > 0) out.push({ sev: 'alta', icon: '⏰', titulo: `${venc} restricción(es) vencida(s)`, detalle: 'Su fecha-límite ya pasó y no están liberadas — riesgo inmediato para la programación.', accion: 'Libéralas hoy o re-secuencia las actividades afectadas en el lookahead.', categoria: 'programacion' });
  if (salud.bloqProg > 0) out.push({ sev: 'alta', icon: '🔒', titulo: `${salud.bloqProg} actividad(es) comprometida(s) en riesgo`, detalle: 'Están en el plan con restricciones pendientes (rompen el production shielding).', accion: 'Sácalas del plan semanal o libera sus restricciones antes de comprometer.', categoria: 'prerequisito' });
  if (salud.ppr != null && salud.ppr < 70) out.push({ sev: 'media', icon: '🛡️', titulo: `Sólo ${salud.ppr}% del plan está listo (PPR)`, detalle: 'Pocas actividades libres de restricción — la confiabilidad del plan está en riesgo.', accion: 'Refuerza el Make-Ready: prioriza liberar restricciones de las próximas semanas.', categoria: 'programacion' });
  return out;
}

// Production shielding (Last Planner): una actividad sólo está LISTA para
// comprometer cuando TODAS sus restricciones están liberadas. 'bloq' = tiene
// pendientes (NO comprometer), 'lista' = todas liberadas, 'sin' = sin restricción
// registrada. Conversa solo con el AR (al liberar en AR, LAP/PS se actualizan).
const readyDe = (rr) => (!rr || rr.total === 0) ? 'sin' : (rr.pend > 0 ? 'bloq' : 'lista');

// Mini-resumen de shielding (listas vs bloqueadas) — compartido por LAP y PS.
function BarraShielding({ listas, bloq }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '10.5px', fontWeight: 800 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: BASE.greenDark }}>
        <span style={{ width: 9, height: 9, borderRadius: '2px', background: BASE.green }} />✅ {listas} listas
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: BASE.red }}>
        <span style={{ width: 9, height: 9, borderRadius: '2px', background: BASE.red }} />🔒 {bloq} bloqueadas
      </span>
      {bloq > 0 && <span style={{ color: BASE.muted, fontWeight: 600, fontStyle: 'italic' }}>· las 🔒 tienen restricciones pendientes — no comprometer aún</span>}
    </div>
  );
}

// HOOK COMPARTIDO: marcas editables del LAP (pintar/borrar días)
// Persiste overrides del usuario en Configuracion/lapMarcas_<proyecto>. Lo usan
// TANTO el Lookahead como la Programación Semanal → comparten las mismas marcas
// (editar un día en una vista se refleja en la otra: "conversan").
// ════════════════════════════════════════════════════════════════
function useLapMarcas() {
  const { proyectoActivoId } = useProyectoActivo();
  const [edits, setEdits] = useState({});   // clave → false | true | '#hex'
  const editsRef = useRef({});
  const saveTimer = useRef(null);
  const pintando = useRef(null);            // { valor } durante un arrastre
  const trazo = useRef(null);               // [{ k, prev }] del trazo en curso (1 paso de undo)
  const undoStack = useRef([]);
  const [colorPaint, setColorPaint] = useState(null);   // null = color de la sección
  const colorRef = useRef(null);
  useEffect(() => { colorRef.current = colorPaint; }, [colorPaint]);

  useEffect(() => {
    if (!proyectoActivoId) return;
    const ref = doc(db, 'Configuracion', `lapMarcas_${proyectoActivoId}`);
    return onSnapshot(ref, snap => {
      const server = (snap.exists() && snap.data().marcas) || {};
      editsRef.current = { ...server, ...editsRef.current };
      setEdits({ ...editsRef.current });
    }, () => {});
  }, [proyectoActivoId]);

  const claveMarca = lapClave;
  const guardar = () => {
    if (!proyectoActivoId) return;
    clearTimeout(saveTimer.current);
    const mapa = { ...editsRef.current };
    saveTimer.current = setTimeout(() => {
      setDoc(doc(db, 'Configuracion', `lapMarcas_${proyectoActivoId}`),
        { marcas: mapa, actualizadoEn: new Date() }).catch(() => {});
    }, 450);
  };
  const aplicar = (mut) => { editsRef.current = mut; setEdits(mut); guardar(); };
  const setMarca = (actKey, fecha, base, valor) => {
    const k = claveMarca(actKey, fecha);
    if (trazo.current && !trazo.current.some(x => x.k === k)) trazo.current.push({ k, prev: editsRef.current[k] });
    const nuevo = { ...editsRef.current };
    const sinColor = (valor === true || valor === false);
    if (sinColor && valor === base) delete nuevo[k];   // vuelve al base sin color → sin override
    else nuevo[k] = valor;
    aplicar(nuevo);
  };
  const onCeldaDown = (actKey, fecha, base, on) => {
    const valor = on ? false : (colorRef.current || true);   // toggle; pinta con el color elegido
    pintando.current = { valor };
    trazo.current = [];
    setMarca(actKey, fecha, base, valor);
  };
  const onCeldaEnter = (actKey, fecha, base) => {
    if (pintando.current) setMarca(actKey, fecha, base, pintando.current.valor);
  };
  // fin de arrastre → consolidar el trazo como UN paso de undo
  useEffect(() => {
    const up = () => {
      pintando.current = null;
      if (trazo.current && trazo.current.length) undoStack.current.push(trazo.current);
      trazo.current = null;
    };
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); };
  }, []);
  // Ctrl+Z → deshacer el último trazo
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const paso = undoStack.current.pop();
        if (!paso) return;
        e.preventDefault();
        const nuevo = { ...editsRef.current };
        for (const { k, prev } of paso) { if (prev === undefined) delete nuevo[k]; else nuevo[k] = prev; }
        aplicar(nuevo);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const estado = (actKey, fecha, base) => {
    const k = claveMarca(actKey, fecha);
    const ov = (k in edits) ? edits[k] : undefined;
    const on = ov === undefined ? base : (ov !== false);
    const color = (typeof ov === 'string') ? ov : null;   // color custom o null (usa el de la sección)
    return { on, color };
  };
  return { estado, onCeldaDown, onCeldaEnter, colorPaint, setColorPaint };
}

// Paleta para que el usuario elija el color de los cuadritos al pintar.
const COLORES_PINTA = [
  { c: null, label: 'Sección' },
  { c: '#2563eb', label: 'Azul' },
  { c: '#0d9488', label: 'Verde' },
  { c: '#f59e0b', label: 'Ámbar' },
  { c: '#e11d48', label: 'Rojo' },
  { c: '#7c3aed', label: 'Morado' },
  { c: '#0f172a', label: 'Negro' },
];

// Selector de color de pintado (compartido por Lookahead y Prog. Semanal).
function SelectorColor({ colorPaint, setColorPaint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted }}>Color:</span>
      {COLORES_PINTA.map((o, i) => {
        const activo = colorPaint === o.c;
        return (
          <button key={i} onClick={() => setColorPaint(o.c)} title={o.label}
            style={{
              width: 20, height: 20, borderRadius: '5px', cursor: 'pointer',
              border: activo ? `2px solid ${BASE.navy}` : `1px solid ${BASE.border}`,
              background: o.c || `linear-gradient(135deg,#0ea5e9,#7c3aed)`,
              boxShadow: activo ? `0 0 0 2px ${BASE.gold}` : 'none',
            }} />
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FILTRO DE SEMANA UNIFICADO (premium, formato GRAPCO)
// Una sola "semana activa" para TODO el Last Planner: LAP, Análisis de
// Restricciones, Programación Semanal y PPC. Cambiarla aquí mueve todas las
// vistas a la vez ("conversan"). La tira muestra, por semana, su PPC, las
// restricciones pendientes 🚧 y las actividades programadas del LAP ●.
// ════════════════════════════════════════════════════════════════
const ppcTone = (p) => p == null ? BASE.mutedSoft : p >= 80 ? BASE.green : p >= 50 ? BASE.gold : BASE.red;

function SemanaNav({ semana, setSemana, total = 35, meta = {}, titulo = '', rango = 1, setRango, rangoOpts, allowTodas = false, todas = false, setTodas }) {
  const activeRef = useRef(null);
  useEffect(() => {
    const el = activeRef.current;
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [semana, todas]);

  const hoySem = obtenerSemana(new Date().toISOString().slice(0, 10));
  const semanas = useMemo(() => Array.from({ length: Math.max(total, 1) }, (_, i) => {
    const n = i + 1; const d = fechasDeSemana(n, INICIO_PROYECTO);
    return { n, ini: d[0], fin: d[6] };
  }), [total]);
  const ir = (n) => { if (isNaN(n)) return; if (setTodas) setTodas(false); setSemana(Math.max(1, Math.min(total, n))); };
  const finVentana = Math.min(total, semana + rango - 1);
  const navBtn = { width: 32, height: 32, borderRadius: '9px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '15px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

  return (
    <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderRadius: '14px', padding: '11px 14px', boxShadow: BASE.shadowMd, borderTop: `3px solid ${BASE.gold}` }}>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '9px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginRight: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1px' }}>📅 SEMANA</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>{todas ? 'Todas' : semana}{!todas && rango > 1 ? ` – ${finVentana}` : ''}</span>
          {titulo && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>· {titulo}</span>}
        </div>
        {rangoOpts && setRango && (
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '2px' }} title="Tamaño de la ventana Make-Ready">
            {rangoOpts.map(n => {
              const act = !todas && rango === n;
              return (
                <button key={n} onClick={() => { if (setTodas) setTodas(false); setRango(n); }}
                  style={{ padding: '5px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '10.5px', fontWeight: 800, background: act ? BASE.gold : 'transparent', color: act ? BASE.navy : 'rgba(255,255,255,0.85)' }}>
                  {n} sem
                </button>
              );
            })}
          </div>
        )}
        {allowTodas && (
          <button onClick={() => setTodas && setTodas(!todas)} style={{ padding: '6px 12px', borderRadius: '999px', border: `1px solid ${todas ? BASE.gold : 'rgba(255,255,255,0.2)'}`, background: todas ? BASE.gold : 'rgba(255,255,255,0.06)', color: todas ? BASE.navy : '#fff', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{todas ? '✓ ' : ''}Todas</button>
        )}
        <button onClick={() => ir(semana - 1)} style={navBtn} title="Semana anterior">‹</button>
        <select value={todas ? '' : semana} onChange={e => ir(parseInt(e.target.value, 10))}
          style={{ background: '#fff', color: BASE.navy, border: 'none', borderRadius: '9px', padding: '7px 10px', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}>
          {todas && <option value="">— Todas —</option>}
          {semanas.map(s => <option key={s.n} value={s.n}>Semana {s.n}{rango > 1 ? `–${Math.min(total, s.n + rango - 1)}` : ''}</option>)}
        </select>
        <button onClick={() => ir(semana + 1)} style={navBtn} title="Semana siguiente">›</button>
        {!todas && semana !== hoySem && (
          <button onClick={() => ir(hoySem)} style={{ padding: '7px 12px', borderRadius: '9px', border: 'none', background: BASE.gold, color: BASE.navy, fontSize: '10.5px', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>⭐ Hoy</button>
        )}
      </div>

      {/* Tira de semanas con indicadores (PPC / restricciones / programadas) */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '3px', scrollbarWidth: 'thin' }}>
        {semanas.map(s => {
          const m = meta[s.n] || {};
          const activa = !todas && s.n === semana;
          const enVentana = !todas && rango > 1 && s.n > semana && s.n <= finVentana;
          const esHoy = s.n === hoySem;
          const tono = ppcTone(m.ppc);
          return (
            <button key={s.n} ref={activa ? activeRef : null} onClick={() => ir(s.n)}
              title={`Semana ${s.n}${m.ppc != null ? ` · PPC ${m.ppc}%` : ''}${m.restr ? ` · ${m.restr} restricción(es)` : ''}${m.prog ? ` · ${m.prog} programadas` : ''}`}
              style={{
                flexShrink: 0, width: 74, borderRadius: '10px', cursor: 'pointer', padding: '6px 4px 5px', position: 'relative', transition: '0.15s',
                border: activa ? `2px solid ${BASE.gold}` : enVentana ? `1px solid ${BASE.gold}66` : '1px solid rgba(255,255,255,0.1)',
                background: activa ? `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})` : enVentana ? 'rgba(229,168,47,0.14)' : 'rgba(255,255,255,0.05)',
                color: activa ? BASE.navy : '#fff',
              }}>
              {esHoy && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '8px' }}>⭐</span>}
              <div style={{ fontSize: '13px', fontWeight: 900, lineHeight: 1 }}>S{s.n}</div>
              <div style={{ fontSize: '7.5px', opacity: activa ? 0.8 : 0.6, marginTop: '2px', whiteSpace: 'nowrap' }}>{s.ini ? `${s.ini.dia}/${s.ini.mes}` : ''}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '3px', minHeight: 11 }}>
                {m.ppc != null && <span title={`PPC ${m.ppc}%`} style={{ width: 16, height: 5, borderRadius: 3, background: tono, display: 'inline-block' }} />}
                {m.restr > 0 && <span style={{ fontSize: '8px', fontWeight: 900, color: activa ? BASE.redDark : '#fda4af' }}>🚧{m.restr}</span>}
                {m.prog > 0 && !m.restr && m.ppc == null && <span style={{ fontSize: '8px', fontWeight: 900, opacity: 0.8 }}>●{m.prog}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: LAP · LOOKAHEAD A 6 SEMANAS
// Muestra ventana móvil de 6 semanas con actividades planificadas
// ════════════════════════════════════════════════════════════════
function LookaheadView({ compromisos, restricciones, semanaActiva, setSemanaActiva, semanasMeta = {}, total = 35 }) {
  const INICIO = INICIO_PROYECTO;
  // Ventana de 6 semanas anclada en la SEMANA ACTIVA compartida: el filtro de
  // semana unificado la mueve y, con ella, la Prog. Semanal, el AR y el PPC.
  const winStart = semanaActiva;
  const semanas = useMemo(() => generarLookahead(winStart, 6, INICIO), [winStart, INICIO]);

  // Plan LAP consolidado CON días marcados (carga bajo demanda).
  const [plan, setPlan] = useState([]);
  useEffect(() => {
    let vivo = true;
    import('../data/lapCreditex').then(m => { if (vivo) setPlan(m.LAP_PLAN || []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Eje de los 42 días de la ventana (6 semanas × 7 días).
  const dias = useMemo(
    () => semanas.flatMap((s, wi) => (s.dias || []).map((d, di) => ({
      fecha: d.fecha, dia: d.dia, mes: d.mes, wi, semNum: s.numero, finde: di >= 5,
    }))),
    [semanas]
  );
  const winIni = dias[0]?.fecha, winFin = dias[dias.length - 1]?.fecha;

  // Compromisos PPC por semana (contadores ✅/❌ — para que converse con lo real).
  const compromisosPorSemana = useMemo(() => {
    const mapa = {};
    semanas.forEach(s => { mapa[s.numero] = []; });
    (compromisos || []).forEach(c => { if (mapa[c.semana]) mapa[c.semana].push(c); });
    return mapa;
  }, [compromisos, semanas]);

  // Secciones con TODAS las actividades (partidas) del LAP. NO se filtran por la
  // ventana: se ven todas para poder programarlas; un toggle oculta las no pintadas.
  const secciones = useMemo(() => {
    const grupos = {};
    (plan || []).forEach(a => { const k = a.seccion || 'OTROS'; (grupos[k] || (grupos[k] = [])).push(a); });
    return Object.keys(grupos)
      .sort((A, B) => Math.min(...grupos[A].map(x => Date.parse(x.ini || '2100-01-01')))
                    - Math.min(...grupos[B].map(x => Date.parse(x.ini || '2100-01-01'))))
      .map((sec, si) => ({
        seccion: sec, color: PALETA_LAP[si % PALETA_LAP.length],
        acts: grupos[sec].map(a => ({ ...a, set: new Set(a.dias), actKey: `${a.seccion || 'OTROS'}|${a.actividad}` }))
          .sort((x, y) => (x.ini || '9999').localeCompare(y.ini || '9999')),
      }));
  }, [plan]);

  // Edición de marcas (pintar/borrar/mover días) — compartida con Prog. Semanal.
  const { estado, onCeldaDown, onCeldaEnter, colorPaint, setColorPaint } = useLapMarcas();
  const [hideUnmarked, setHideUnmarked] = useState(false);

  // Restricciones por actividad (AR ↔ LAP): badge 🚧 si tiene pendientes.
  const restrPorAct = useMemo(() => restriccionesPorActividad(restricciones), [restricciones]);

  // Cuenta restricciones que afectan cada semana
  const restriccionesPorSemana = useMemo(() => {
    const mapa = {};
    semanas.forEach(s => { mapa[s.numero] = 0; });
    (restricciones || []).forEach(r => {
      if (!r.fechaCompromisoLiberacion) return;
      // Calcular semana aproximada de la fecha de compromiso (mismo inicio real)
      const fechaInicio = new Date(INICIO + 'T00:00:00');
      const fechaCompromiso = new Date(r.fechaCompromisoLiberacion + 'T00:00:00');
      if (isNaN(fechaCompromiso)) return;
      const semanaCompromiso = Math.ceil((fechaCompromiso - fechaInicio) / (1000 * 60 * 60 * 24 * 7)) + 1;
      if (mapa[semanaCompromiso] !== undefined && r.estado !== 'liberada') {
        mapa[semanaCompromiso] += 1;
      }
    });
    return mapa;
  }, [restricciones, semanas]);

  // ── Geometría y navegación (ancho completo; nombres en UNA línea, columna ancha) ──
  const LEFT_W = 480, ROW_H = 22, MIN_DAY = 15;
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const todasActs = secciones.flatMap(s => s.acts);
  const actMarcadaEnVentana = (a) => dias.some(d => estado(a.actKey, d.fecha, a.set.has(d.fecha)).on);
  const nAct = todasActs.filter(actMarcadaEnVentana).length;
  const totalHH = todasActs.filter(actMarcadaEnVentana).reduce((s, a) => s + (a.hh || 0), 0);
  // Shielding: de las programadas en la ventana, cuántas están bloqueadas (con
  // restricción pendiente) vs listas para comprometer. Conversa solo con el AR.
  const progBloq = todasActs.filter(a => actMarcadaEnVentana(a) && readyDe(restrPorAct[normActividad(a.actividad)]) === 'bloq').length;
  const progListas = nAct - progBloq;
  const fmtN = (n) => n == null ? '' : Number(n).toLocaleString('es-PE', { maximumFractionDigits: n < 100 ? 1 : 0 });
  const leftColsStyle = { width: LEFT_W, minWidth: LEFT_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', background: BASE.white, borderRight: `2px solid ${BASE.border}` };
  const cellWrap = { flex: 1, minWidth: 0, display: 'flex' };
  const colNum = { width: '36px', minWidth: '36px', textAlign: 'right', fontSize: '9.5px', color: BASE.text, flexShrink: 0, borderLeft: `1px solid #e5ebf1`, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '900', color: BASE.navy }}>🔭 LOOKAHEAD · 6 semanas</h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Ventana de 6 semanas desde la <strong style={{ color: BASE.gold }}>semana activa</strong> (la misma que mueve Prog. Semanal, AR y PPC).
            <strong> Clic/arrastra</strong> para pintar, <strong>Ctrl+Z</strong> deshace y eliges el color.
          </p>
        </div>
        <BotonImprimir titulo="Lookahead 6 semanas" />
      </div>

      {/* FILTRO DE SEMANA UNIFICADO — mueve también PS, AR y PPC */}
      <SemanaNav semana={semanaActiva} setSemana={setSemanaActiva} total={total} meta={semanasMeta} titulo="ventana de 6 semanas" rango={6} />

      {/* Herramientas: ocultar no programadas + color de pintado + conteo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: BASE.navy, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideUnmarked} onChange={e => setHideUnmarked(e.target.checked)} />
          Ocultar actividades sin programar en la ventana
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <SelectorColor colorPaint={colorPaint} setColorPaint={setColorPaint} />
          <BarraShielding listas={progListas} bloq={progBloq} />
          <span style={{ fontSize: '10.5px', color: BASE.muted }}>
            <strong style={{ color: BASE.navy }}>{nAct}</strong> programadas · <strong style={{ color: BASE.navy }}>{Math.round(totalHH).toLocaleString('es-PE')}</strong> HH
          </span>
        </div>
      </div>

      {/* MATRIZ tipo Excel: actividades × días — ancho completo y EDITABLE */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
          <div style={{ width: '100%', minWidth: LEFT_W + dias.length * MIN_DAY, userSelect: 'none' }}>

            {/* CABECERA sticky */}
            <div style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              {/* fila SEMANA */}
              <div style={{ display: 'flex' }}>
                <div style={{ ...leftColsStyle, background: BASE.navy, color: '#fff', borderRight: `2px solid ${BASE.navyDark}`, fontWeight: 900, fontSize: '10px', letterSpacing: '0.5px', padding: '6px 8px' }}>
                  PROGRAMACIÓN · LAP
                </div>
                <div style={cellWrap}>
                  {semanas.map((s, wi) => {
                    const esActual = s.numero === semanaActiva;
                    const rp = restriccionesPorSemana[s.numero] || 0;
                    const cmp = compromisosPorSemana[s.numero] || [];
                    const ok = cmp.filter(c => c.cumplido === true).length;
                    const no = cmp.filter(c => c.cumplido === false).length;
                    return (
                      <div key={wi} onClick={() => setSemanaActiva && setSemanaActiva(s.numero)}
                        title={`Fijar Semana ${s.numero} como activa (afecta PS, AR y PPC)`} style={{
                        flex: 1, minWidth: 0, overflow: 'hidden', cursor: 'pointer',
                        background: esActual ? `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})` : `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
                        color: '#fff', textAlign: 'center', padding: '5px 2px', borderRight: `1px solid rgba(255,255,255,0.25)`,
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap' }}>{esActual ? '⭐ ' : ''}{s.label}</div>
                        <div style={{ fontSize: '8.5px', opacity: 0.9, whiteSpace: 'nowrap' }}>{s.dias[0].dia}/{s.dias[0].mes}–{s.dias[6].dia}/{s.dias[6].mes}</div>
                        {(rp > 0 || ok > 0 || no > 0) && (
                          <div style={{ fontSize: '8px', fontWeight: 800, marginTop: '1px' }}>
                            {rp > 0 && <span>🚧{rp} </span>}{ok > 0 && <span>✅{ok} </span>}{no > 0 && <span>❌{no}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* fila columnas + día del mes */}
              <div style={{ display: 'flex', borderBottom: `2px solid ${BASE.border}` }}>
                <div style={{ ...leftColsStyle, height: '20px', fontSize: '8.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.3px', background: '#f8fafc' }}>
                  <span style={{ flex: 1 }}>ACTIVIDAD</span>
                  <span style={colNum}>MET</span><span style={colNum}>UND</span><span style={colNum}>IP</span><span style={colNum}>HH</span><span style={{ ...colNum, width: '24px', minWidth: '24px' }}>MO</span>
                </div>
                <div style={cellWrap}>
                  {dias.map((d, i) => (
                    <div key={i} style={{
                      flex: 1, minWidth: 0, height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px', fontWeight: 700, color: d.fecha === hoyISO ? '#fff' : BASE.muted,
                      background: d.fecha === hoyISO ? BASE.red : d.finde ? '#eef2f6' : '#fbfdff',
                      borderRight: `1px solid ${BASE.border}`,
                    }}>{d.dia}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* FILAS: por sección, TODAS las actividades (toggle oculta las no pintadas) */}
            {todasActs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
                {plan.length === 0 ? 'Cargando programación LAP…' : 'Sin actividades.'}
              </div>
            ) : secciones.map(sec => {
              const acts = hideUnmarked ? sec.acts.filter(actMarcadaEnVentana) : sec.acts;
              if (!acts.length) return null;
              return (
                <React.Fragment key={sec.seccion}>
                  <div style={{ display: 'flex', borderBottom: `1px solid ${BASE.border}` }}>
                    <div style={{ ...leftColsStyle, background: '#f1f5f9', borderLeft: `4px solid ${sec.color}` }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 900, color: BASE.navy, textTransform: 'uppercase' }}>
                        {sec.seccion} <span style={{ color: BASE.muted, fontWeight: 700 }}>({acts.length})</span>
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, background: '#f1f5f9' }} />
                  </div>
                  {acts.map((a, ai) => {
                    // 3 niveles visuales: sub-partida (encabezado de nivel sin COD/metrado) vs actividad.
                    const esSub = a.nivel && !a.id && a.metrado == null;
                    const pad = esSub ? (a.nivel === 'N2' ? 6 : 16) : 26;
                    const bgRow = esSub ? `${sec.color}1a` : (ai % 2 ? '#f8fbff' : '#ffffff');
                    const rr = restrPorAct[normActividad(a.actividad)];
                    const ready = esSub ? 'sub' : readyDe(rr);   // shielding: bloq | lista | sin
                    const bloq = ready === 'bloq';
                    const stripe = esSub ? sec.color : bloq ? BASE.red : ready === 'lista' ? BASE.green : 'transparent';
                    return (
                      <div key={a.actKey} style={{ display: 'flex', borderBottom: `1px solid #eef2f6`, minHeight: ROW_H, background: bloq ? 'rgba(225,29,72,0.05)' : bgRow }}>
                        <div style={{ ...leftColsStyle, background: bloq ? 'rgba(225,29,72,0.05)' : bgRow, borderLeft: `3px solid ${stripe}` }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: esSub ? '9px' : '9.5px', paddingLeft: pad, color: esSub ? BASE.navy : BASE.text, fontWeight: esSub ? 900 : 600, textTransform: esSub ? 'uppercase' : 'none', letterSpacing: esSub ? '0.3px' : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bloq ? `${rr.pend} restricción(es) pendiente(s) — NO comprometer hasta liberar` : a.actividad}>
                            {bloq ? <span style={{ color: BASE.red, fontWeight: 900 }}>🔒{rr.pend} </span> : ready === 'lista' ? <span title="Lista para comprometer" style={{ color: BASE.greenDark }}>✅ </span> : ''}
                            {a.id ? <b style={{ color: sec.color }}>{a.id} </b> : ''}{a.actividad}
                          </span>
                          <span style={colNum}>{fmtN(a.metrado)}</span>
                          <span style={{ ...colNum, color: BASE.muted }}>{a.und || ''}</span>
                          <span style={colNum}>{a.ip != null ? Number(a.ip).toFixed(2) : ''}</span>
                          <span style={{ ...colNum, fontWeight: 800, color: BASE.navy }}>{a.hh != null ? Math.round(a.hh) : ''}</span>
                          <span style={{ ...colNum, width: '26px', minWidth: '26px' }}>{a.mo != null ? a.mo : ''}</span>
                        </div>
                        <div style={cellWrap}>
                          {dias.map((d, i) => {
                            const base = a.set.has(d.fecha);
                            const { on, color } = estado(a.actKey, d.fecha, base);
                            return (
                              <div key={i}
                                onMouseDown={(e) => { e.preventDefault(); onCeldaDown(a.actKey, d.fecha, base, on); }}
                                onMouseEnter={() => onCeldaEnter(a.actKey, d.fecha, base)}
                                title={`${a.actividad} · ${d.dia}/${d.mes} — clic para ${on ? 'borrar' : 'pintar'}`}
                                style={{
                                  flex: 1, minWidth: 0, cursor: 'pointer', alignSelf: 'stretch',
                                  borderRight: `1px solid ${d.fecha === hoyISO ? BASE.red : '#eef2f6'}`,
                                  background: d.fecha === hoyISO && !on ? 'rgba(225,29,72,0.06)' : (d.finde && !on ? 'rgba(15,23,42,0.045)' : 'transparent'),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                {on && <span style={{ width: '86%', height: 14, background: color || sec.color, borderRadius: '2px', boxShadow: bloq ? `0 0 0 1.6px ${BASE.red}` : `0 1px 2px ${(color || sec.color)}66`, opacity: bloq ? 0.78 : 1, pointerEvents: 'none' }} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}

          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ background: BASE.bgSoft, borderRadius: '10px', padding: '12px 16px', fontSize: '11px', color: BASE.muted, lineHeight: 1.6 }}>
        <strong style={{ color: BASE.navy }}>📖 Cómo usar:</strong>
        <span style={{ marginLeft: '6px' }}>
          Matriz <strong>actividades × días</strong> tal cual el LAP. <strong style={{ color: BASE.navy }}>Haz clic</strong> en una celda para
          pintar/borrar un día programado; <strong>arrastra</strong> para pintar varios o moverlos. Los cambios se <strong>guardan solos</strong> por
          proyecto (no tocan el LAP oficial). El color identifica el <strong>frente/sección</strong>; la <strong style={{ color: BASE.gold }}>semana actual</strong> va
          en dorado y la columna <strong style={{ color: BASE.red }}>roja</strong> es hoy. Usa <strong>‹ Anterior / Siguiente ›</strong> para recorrer las 28 semanas.
          <br /><strong style={{ color: BASE.red }}>🔒 Shielding:</strong> las actividades con restricciones pendientes salen con franja <strong style={{ color: BASE.red }}>roja</strong> y celdas con borde rojo — están <strong>programadas pero NO listas para comprometer</strong>. Libéralas en <strong>🚧 Análisis Restricciones</strong> y aquí pasan a verde ✅ <strong>automáticamente</strong>.
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: PROGRAMACIÓN SEMANAL (formato Excel S0/S1/S2)
// Replica imagen 2: tabla con días lun-dom + colores S0/S1/S2 por celda
// ════════════════════════════════════════════════════════════════
function ProgramacionSemanalLPS({ semanaActiva, setSemanaActiva, restricciones = [], semanasMeta = {}, total = 35 }) {
  const dias = useMemo(() => fechasDeSemana(semanaActiva, INICIO_PROYECTO), [semanaActiva]);
  const semIni = dias[0]?.fecha, semFin = dias[6]?.fecha;
  const restrPorAct = useMemo(() => restriccionesPorActividad(restricciones), [restricciones]);

  // Plan LAP consolidado (carga bajo demanda) + edición compartida con el Lookahead.
  const [plan, setPlan] = useState([]);
  useEffect(() => {
    let vivo = true;
    import('../data/lapCreditex').then(m => { if (vivo) setPlan(m.LAP_PLAN || []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const { estado, onCeldaDown, onCeldaEnter, colorPaint, setColorPaint } = useLapMarcas();
  const [hideUnmarked, setHideUnmarked] = useState(false);

  // Secciones con TODAS las actividades del LAP (no se filtran por semana; el toggle oculta las no pintadas).
  const secciones = useMemo(() => {
    const grupos = {};
    (plan || []).forEach(a => { const k = a.seccion || 'OTROS'; (grupos[k] || (grupos[k] = [])).push(a); });
    return Object.keys(grupos)
      .sort((A, B) => Math.min(...grupos[A].map(x => Date.parse(x.ini || '2100-01-01'))) - Math.min(...grupos[B].map(x => Date.parse(x.ini || '2100-01-01'))))
      .map((sec, si) => ({
        seccion: sec, color: PALETA_LAP[si % PALETA_LAP.length],
        acts: grupos[sec].map(a => ({ ...a, set: new Set(a.dias), actKey: `${a.seccion || 'OTROS'}|${a.actividad}` }))
          .sort((x, y) => (x.ini || '9999').localeCompare(y.ini || '9999')),
      }));
  }, [plan]);

  const fmtN = (n) => n == null ? '' : Number(n).toLocaleString('es-PE', { maximumFractionDigits: n < 100 ? 1 : 0 });
  const todasActs = secciones.flatMap(s => s.acts);
  const actMarcadaSemana = (a) => dias.some(d => estado(a.actKey, d.fecha, a.set.has(d.fecha)).on);
  const nAct = todasActs.filter(actMarcadaSemana).length;
  const totalHH = todasActs.filter(actMarcadaSemana).reduce((s, a) => s + (a.hh || 0), 0);
  // Shielding de la semana: programadas bloqueadas (restricción pendiente) vs listas.
  const progBloq = todasActs.filter(a => actMarcadaSemana(a) && readyDe(restrPorAct[normActividad(a.actividad)]) === 'bloq').length;
  const progListas = nAct - progBloq;
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // Columnas izquierdas (fijas; ACTIVIDAD flexible para llenar el ancho).
  const sep = { borderLeft: `1px solid #e5ebf1` };
  const cCod = { width: 46, minWidth: 46, flexShrink: 0 };
  const cAct = { flex: 1, minWidth: 150, borderRight: `1px solid #e5ebf1` };
  const cSm  = { width: 42, minWidth: 42, flexShrink: 0, ...sep };
  const cMet = { width: 58, minWidth: 58, flexShrink: 0, ...sep };
  const cMo  = { width: 36, minWidth: 36, flexShrink: 0, ...sep };
  const DAY = 74;
  const celdaDia = { width: DAY, minWidth: DAY, flexShrink: 0 };
  const pc = { padding: '0 6px', fontSize: '10px', color: BASE.text, display: 'flex', alignItems: 'center' };
  const pr = { ...pc, justifyContent: 'flex-end' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy }}>📋 PROGRAMACIÓN SEMANAL · Semana {semanaActiva}</h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Plan semanal (Lun–Dom) tal cual el Excel F05, alimentado por el LAP. <strong>Clic/arrastra</strong> para pintar o borrar días; comparte semana y marcas con el Lookahead.
          </p>
        </div>
        <BotonImprimir titulo={`Programación Semana ${semanaActiva}`} />
      </div>

      {/* FILTRO DE SEMANA UNIFICADO */}
      <SemanaNav semana={semanaActiva} setSemana={setSemanaActiva} total={total} meta={semanasMeta} titulo="plan semanal F05" />

      {/* Herramientas: ocultar no programadas + color + conteo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: BASE.navy, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideUnmarked} onChange={e => setHideUnmarked(e.target.checked)} />
          Ocultar actividades sin programar esta semana
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <SelectorColor colorPaint={colorPaint} setColorPaint={setColorPaint} />
          <BarraShielding listas={progListas} bloq={progBloq} />
          <span style={{ fontSize: '10.5px', color: BASE.muted }}>
            <strong style={{ color: BASE.navy }}>{nAct}</strong> programadas · <strong style={{ color: BASE.navy }}>{Math.round(totalHH).toLocaleString('es-PE')}</strong> HH · INICIO {semIni}
          </span>
        </div>
      </div>

      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflow: 'auto', maxHeight: '72vh', userSelect: 'none' }}>
          <div style={{ width: '100%', minWidth: 860 }}>

            {/* CABECERA */}
            <div style={{ position: 'sticky', top: 0, zIndex: 3, display: 'flex', background: BASE.navy, color: '#fff', fontSize: '9px', fontWeight: 900, letterSpacing: '0.3px', borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ ...cCod, ...pc, color: '#fff', height: 36, justifyContent: 'center' }}>COD</div>
              <div style={{ ...cAct, ...pc, color: '#fff', height: 36 }}>ACTIVIDAD</div>
              <div style={{ ...cSm, ...pr, color: '#fff', height: 36 }}>RESP</div>
              <div style={{ ...cSm, ...pr, color: '#fff', height: 36 }}>UND</div>
              <div style={{ ...cSm, ...pr, color: '#fff', height: 36 }}>SEC</div>
              <div style={{ ...cMet, ...pr, color: '#fff', height: 36 }}>MET.</div>
              <div style={{ ...cSm, ...pr, color: '#fff', height: 36 }}>IP</div>
              <div style={{ ...cSm, ...pr, color: '#fff', height: 36 }}>HH</div>
              <div style={{ ...cMo, ...pr, color: '#fff', height: 36 }}>MO</div>
              {dias.map((d, i) => (
                <div key={i} style={{ ...celdaDia, height: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: d.fecha === hoyISO ? BASE.red : BASE.gold, borderLeft: `1px solid ${BASE.goldDark}` }}>
                  <span style={{ fontSize: '8px' }}>{d.label || d.mes}</span>
                  <span style={{ fontSize: '12px', fontWeight: 900 }}>{d.dia}</span>
                </div>
              ))}
            </div>

            {/* FILAS: por sección, TODAS las actividades (toggle oculta las no pintadas) */}
            {todasActs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
                {plan.length === 0 ? 'Cargando…' : 'Sin actividades.'}
              </div>
            ) : secciones.map(sec => {
              const acts = hideUnmarked ? sec.acts.filter(actMarcadaSemana) : sec.acts;
              if (!acts.length) return null;
              return (
                <React.Fragment key={sec.seccion}>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: `1px solid ${BASE.border}`, borderLeft: `4px solid ${sec.color}` }}>
                    <div style={{ ...pc, height: 26, fontSize: '10.5px', fontWeight: 900, color: BASE.navy, textTransform: 'uppercase' }}>{sec.seccion} <span style={{ color: BASE.muted, fontWeight: 700 }}>({acts.length})</span></div>
                  </div>
                  {acts.map((a, ai) => {
                    const esSub = a.nivel && !a.id && a.metrado == null;   // sub-partida (encabezado de nivel)
                    const pad = esSub ? (a.nivel === 'N2' ? 4 : 14) : 0;
                    const bgRow = esSub ? `${sec.color}1a` : (ai % 2 ? '#f8fbff' : '#ffffff');
                    const rr = restrPorAct[normActividad(a.actividad)];
                    const ready = esSub ? 'sub' : readyDe(rr);   // shielding
                    const bloq = ready === 'bloq';
                    const stripe = esSub ? sec.color : bloq ? BASE.red : ready === 'lista' ? BASE.green : 'transparent';
                    return (
                      <div key={a.actKey} style={{ display: 'flex', borderBottom: `1px solid #eef2f6`, minHeight: 26, alignItems: 'stretch', background: bloq ? 'rgba(225,29,72,0.05)' : bgRow }}>
                        <div style={{ ...cCod, ...pc, justifyContent: 'center', fontWeight: 800, color: sec.color, fontSize: '9px', borderLeft: `3px solid ${stripe}` }}>{a.id || ''}</div>
                        <div style={{ ...cAct, ...pc, paddingLeft: 6 + pad }}>
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: esSub ? 900 : 600, color: esSub ? BASE.navy : BASE.text, textTransform: esSub ? 'uppercase' : 'none', fontSize: esSub ? '9.5px' : '10px' }} title={bloq ? `${rr.pend} restricción(es) pendiente(s) — NO comprometer hasta liberar` : a.actividad}>
                            {bloq ? <span style={{ color: BASE.red, fontWeight: 900 }}>🔒{rr.pend} </span> : ready === 'lista' ? <span title="Lista para comprometer" style={{ color: BASE.greenDark }}>✅ </span> : ''}{a.actividad}
                          </span>
                        </div>
                        <div style={{ ...cSm, ...pr, color: BASE.muted }} />
                        <div style={{ ...cSm, ...pr, color: BASE.muted }}>{a.und || ''}</div>
                        <div style={{ ...cSm, ...pr, color: BASE.muted }}>{a.sectores != null ? a.sectores : ''}</div>
                        <div style={{ ...cMet, ...pr }}>{fmtN(a.metrado)}</div>
                        <div style={{ ...cSm, ...pr }}>{a.ip != null ? Number(a.ip).toFixed(2) : ''}</div>
                        <div style={{ ...cSm, ...pr, fontWeight: 800, color: BASE.navy }}>{a.hh != null ? Math.round(a.hh) : ''}</div>
                        <div style={{ ...cMo, ...pr }}>{a.mo != null ? a.mo : ''}</div>
                        {dias.map((d, i) => {
                          const base = a.set.has(d.fecha);
                          const { on, color } = estado(a.actKey, d.fecha, base);
                          return (
                            <div key={i}
                              onMouseDown={(e) => { e.preventDefault(); onCeldaDown(a.actKey, d.fecha, base, on); }}
                              onMouseEnter={() => onCeldaEnter(a.actKey, d.fecha, base)}
                              title={`${a.actividad} · ${d.dia}/${d.mes} — clic para ${on ? 'borrar' : 'pintar'}`}
                              style={{ ...celdaDia, alignSelf: 'stretch', cursor: 'pointer', borderLeft: `1px solid ${d.fecha === hoyISO ? BASE.red : '#eef2f6'}`, background: d.fecha === hoyISO && !on ? 'rgba(225,29,72,0.06)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {on && <span style={{ width: '78%', height: 14, background: color || sec.color, borderRadius: '2px', boxShadow: bloq ? `0 0 0 1.6px ${BASE.red}` : `0 1px 2px ${(color || sec.color)}66`, opacity: bloq ? 0.78 : 1, pointerEvents: 'none' }} />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}

          </div>
        </div>
      </div>

      <div style={{ background: BASE.bgSoft, borderRadius: '10px', padding: '12px 16px', fontSize: '11px', color: BASE.muted, lineHeight: 1.6 }}>
        <strong style={{ color: BASE.navy }}>📖 Programación Semanal (F05):</strong> una semana (Lun–Dom) con las actividades del LAP. Cada celda de color = día programado; <strong>clic/arrastra</strong> para editar. Comparte marcas y semana con el Lookahead; la columna roja es hoy. <strong style={{ color: BASE.red }}>🔒 Shielding:</strong> las filas con franja roja tienen restricciones pendientes — <strong>no comprometer</strong> hasta liberarlas en 🚧 Análisis Restricciones (se actualiza solo).
      </div>
    </div>
  );
}

// Causas de No Cumplimiento (CNC) para el PPC.
const CNC_CATS = [
  { k: 'materiales', l: 'Materiales' },
  { k: 'mano_obra', l: 'Mano de obra' },
  { k: 'equipos', l: 'Equipos' },
  { k: 'diseno', l: 'Diseño / Información' },
  { k: 'prerequisito', l: 'Prerrequisito (act. previa)' },
  { k: 'externos', l: 'Externos / Clima' },
  { k: 'programacion', l: 'Programación' },
  { k: 'calidad', l: 'Calidad' },
  { k: 'otros', l: 'Otros' },
];

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: PPC DASHBOARD (conectado al LAP)
// Planificado = actividades pintadas en el LAP esa semana; el usuario marca lo
// ejecutado (✓/✗+causa) y el PPC% se calcula solo. Tendencia + Pareto de CNC.
// ════════════════════════════════════════════════════════════════
function PPCLap({ semanaActiva, setSemanaActiva, semanasMeta = {}, total, restricciones = [] }) {
  const { proyectoActivoId } = useProyectoActivo();
  // Shielding: restricciones por actividad (conversa con el AR). Una comprometida
  // con restricción pendiente es "comprometida en riesgo" (no debió entrar a la semana).
  const restrPorAct = useMemo(() => restriccionesPorActividad(restricciones), [restricciones]);
  const [plan, setPlan] = useState([]);
  useEffect(() => { let v = true; import('../data/lapCreditex').then(m => { if (v) setPlan(m.LAP_PLAN || []); }).catch(() => {}); return () => { v = false; }; }, []);
  const [docData, setDocData] = useState({ marcas: {}, cumpl: {} });
  useEffect(() => {
    if (!proyectoActivoId) return;
    return onSnapshot(doc(db, 'Configuracion', `lapMarcas_${proyectoActivoId}`),
      s => setDocData(s.exists() ? { marcas: s.data().marcas || {}, cumpl: s.data().cumpl || {} } : { marcas: {}, cumpl: {} }), () => {});
  }, [proyectoActivoId]);
  const { marcas, cumpl } = docData;
  const [ppcOficial, setPpcOficial] = useState({ sem: [], cnc: [], global: null });
  useEffect(() => { let v = true; import('../data/ppcCreditex').then(m => { if (v) setPpcOficial({ sem: m.PPC_SEMANAL || [], cnc: m.PPC_CNC || [], global: m.PPC_GLOBAL ?? null }); }).catch(() => {}); return () => { v = false; }; }, []);
  const sem = semanaActiva;
  const totalSemanas = total || Math.max(36, ...(ppcOficial.sem || []).map(s => s.semana || 0));
  const cumplKey = (actKey, semana) => `c${lapHash(actKey)}_${semana}`;
  const setEstado = (actKey, semana, val) => {
    const k = cumplKey(actKey, semana);
    const nuevo = { ...cumpl };
    if (val == null) delete nuevo[k]; else nuevo[k] = val;
    setDocData(d => ({ ...d, cumpl: nuevo }));
    if (proyectoActivoId) setDoc(doc(db, 'Configuracion', `lapMarcas_${proyectoActivoId}`), { cumpl: nuevo }, { merge: true }).catch(() => {});
  };

  const planificadasDe = (semana) => {
    const fechas = fechasDeSemana(semana, INICIO_PROYECTO).map(d => d.fecha);
    return plan.filter(a => {
      const actKey = `${a.seccion || 'OTROS'}|${a.actividad}`;
      const baseSet = new Set(a.dias || []);
      return fechas.some(f => { const ov = marcas[lapClave(actKey, f)]; return ov === undefined ? baseSet.has(f) : ov !== false; });
    }).map(a => ({ ...a, actKey: `${a.seccion || 'OTROS'}|${a.actividad}` }));
  };

  const planif = useMemo(() => planificadasDe(sem), [plan, marcas, sem]);
  const bloqDe = (a) => readyDe(restrPorAct[normActividad(a.actividad)]) === 'bloq';
  const compBloq = planif.filter(bloqDe).length;   // comprometidas con restricción pendiente
  const estadoDe = (actKey) => cumpl[cumplKey(actKey, sem)];
  const ok = planif.filter(a => estadoDe(a.actKey) === 'ok').length;
  const no = planif.filter(a => { const c = estadoDe(a.actKey); return c && c !== 'ok'; }).length;
  const ppcCalc = planif.length ? Math.round(ok / planif.length * 100) : null;
  const ppcOf = (ppcOficial.sem || []).find(o => o.semana === sem);
  // PPC de la semana: si el usuario marcó ejecución, se recalcula; si no, el oficial del Excel.
  const ppc = (ok + no > 0) ? ppcCalc : (ppcOf ? ppcOf.ppc : ppcCalc);

  // Tendencia: PPC oficial del Excel; recalcula la semana donde el usuario marcó.
  const tendencia = useMemo(() => {
    const userSem = {};
    Object.keys(cumpl).forEach(k => { const m = k.match(/_(\d+)$/); if (m) userSem[+m[1]] = true; });
    return (ppcOficial.sem || []).map(o => {
      if (userSem[o.semana]) {
        const p = planificadasDe(o.semana);
        const okk = p.filter(a => cumpl[cumplKey(a.actKey, o.semana)] === 'ok').length;
        const tot = p.filter(a => { const c = cumpl[cumplKey(a.actKey, o.semana)]; return c; }).length;
        return { s: o.semana, ppc: tot ? Math.round(okk / p.length * 100) : o.ppc };
      }
      return { s: o.semana, ppc: o.ppc };
    });
  }, [ppcOficial, cumpl, plan, marcas]);

  // CNC: causas oficiales del Excel + las que el usuario marque.
  const cncPareto = useMemo(() => {
    const cont = {};
    (ppcOficial.cnc || []).forEach(c => { cont[c.cat] = (cont[c.cat] || 0) + c.n; });
    Object.values(cumpl).forEach(v => { if (v && v !== 'ok') { const l = (CNC_CATS.find(c => c.k === v) || {}).l || v; cont[l] = (cont[l] || 0) + 1; } });
    return Object.entries(cont).map(([l, n]) => ({ l, n })).sort((a, b) => b.n - a.n);
  }, [ppcOficial, cumpl]);
  const maxCnc = Math.max(1, ...cncPareto.map(c => c.n));
  const ppcColor = ppc == null ? BASE.muted : ppc >= 80 ? BASE.greenDark : ppc >= 50 ? '#d97706' : BASE.red;
  const card = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' };
  const fechas = fechasDeSemana(sem, INICIO_PROYECTO);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Encabezado + navegación de semana */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy }}>📈 PPC · Percent Plan Complete</h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Lo <strong>planificado</strong> sale del LAP que pintaste esa semana. Marca lo <strong>ejecutado</strong> (✓/✗) y el PPC% se calcula solo.
          </p>
        </div>
        <BotonImprimir titulo={`PPC Semana ${sem}`} />
      </div>

      {/* FILTRO DE SEMANA UNIFICADO */}
      <SemanaNav semana={sem} setSemana={setSemanaActiva} total={totalSemanas} meta={semanasMeta} titulo="percent plan complete" />

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ ...card, flex: '1 1 150px', textAlign: 'center', borderTop: `4px solid ${ppcColor}` }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.5px' }}>PPC SEMANA {sem}</p>
          <p style={{ fontSize: '34px', fontWeight: 900, color: ppcColor, lineHeight: 1.1 }}>{ppc == null ? '—' : ppc + '%'}</p>
          <p style={{ fontSize: '10px', color: BASE.muted }}>{fechas[0]?.dia}/{fechas[0]?.mes} – {fechas[6]?.dia}/{fechas[6]?.mes}{ok + no === 0 && ppcOf ? ' · oficial' : ''}</p>
        </div>
        <div style={{ ...card, flex: '1 1 130px', textAlign: 'center', borderTop: `4px solid ${BASE.gold}` }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.5px' }}>PPC GLOBAL</p>
          <p style={{ fontSize: '30px', fontWeight: 900, color: BASE.navy }}>{ppcOficial.global == null ? '—' : ppcOficial.global + '%'}</p>
          <p style={{ fontSize: '10px', color: BASE.muted }}>{ppcOficial.sem.length} sem · oficial</p>
        </div>
        {[['Cumplidas', (ok + no > 0) ? ok : (ppcOf ? ppcOf.realizadas : 0), BASE.greenDark], ['No cumplidas', (ok + no > 0) ? no : (ppcOf ? ppcOf.noCumplidas : 0), BASE.red], ['Planificadas (LAP)', planif.length, BASE.navy], ['🔒 Comprometidas en riesgo', compBloq, compBloq > 0 ? BASE.red : BASE.greenDark]].map(([l, v, c]) => (
          <div key={l} style={{ ...card, flex: '1 1 110px', textAlign: 'center', borderTop: `4px solid ${c}` }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.5px' }}>{l.toUpperCase()}</p>
            <p style={{ fontSize: '26px', fontWeight: 900, color: c }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Tendencia + CNC */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '12px' }}>
        <div style={card}>
          <p style={{ fontSize: '11px', fontWeight: 900, color: BASE.navy, marginBottom: '8px' }}>TENDENCIA PPC POR SEMANA</p>
          {tendencia.length === 0 ? (
            <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>Aún no hay semanas evaluadas. Marca cumplimiento abajo.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '90px' }}>
              {tendencia.map(t => (
                <div key={t.s} title={`SEM ${t.s}: ${t.ppc}%`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }} onClick={() => setSemanaActiva(t.s)}>
                  <div style={{ width: '100%', height: `${Math.max(3, t.ppc * 0.8)}px`, background: t.ppc >= 80 ? BASE.greenDark : t.ppc >= 50 ? '#d97706' : BASE.red, borderRadius: '3px 3px 0 0' }} />
                  <span style={{ fontSize: '7.5px', color: BASE.muted }}>{t.s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={card}>
          <p style={{ fontSize: '11px', fontWeight: 900, color: BASE.navy, marginBottom: '8px' }}>CAUSAS DE NO CUMPLIMIENTO (CNC)</p>
          {cncPareto.length === 0 ? (
            <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>Sin incumplimientos registrados. 👏</p>
          ) : cncPareto.map(c => (
            <div key={c.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '10px', color: BASE.text, width: 130, flexShrink: 0 }}>{c.l}</span>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '4px', height: '14px' }}>
                <div style={{ width: `${c.n / maxCnc * 100}%`, height: '100%', background: BASE.red, borderRadius: '4px' }} />
              </div>
              <b style={{ fontSize: '11px', color: BASE.red, width: 18, textAlign: 'right' }}>{c.n}</b>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de actividades planificadas + cierre de cumplimiento */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: BASE.navy, color: '#fff', fontSize: '11px', fontWeight: 900, letterSpacing: '0.4px' }}>
          ACTIVIDADES PLANIFICADAS · SEMANA {sem} ({planif.length})
        </div>
        {planif.length === 0 ? (
          <p style={{ padding: '30px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
            {plan.length === 0 ? 'Cargando…' : 'Nada programado esta semana. Pinta el LAP o cambia de semana (‹ ›).'}
          </p>
        ) : planif.map((a, i) => {
          const est = estadoDe(a.actKey);
          const esNo = est && est !== 'ok';
          const bloq = bloqDe(a);   // comprometida con restricción pendiente (shielding)
          const rr = restrPorAct[normActividad(a.actividad)];
          return (
            <div key={a.actKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderBottom: `1px solid #eef2f6`, background: bloq ? 'rgba(225,29,72,0.05)' : (i % 2 ? '#f8fbff' : '#fff'), borderLeft: `3px solid ${bloq ? BASE.red : 'transparent'}` }}>
              <span style={{ flex: 1, fontSize: '11px', color: BASE.text }}>
                {bloq ? <span title={`${rr.pend} restricción(es) pendiente(s) — no debió comprometerse`} style={{ color: BASE.red, fontWeight: 900 }}>🔒{rr.pend} </span> : ''}
                {a.id ? <b style={{ color: BASE.navy }}>{a.id} </b> : ''}{a.actividad}
              </span>
              {a.hh != null && <span style={{ fontSize: '9.5px', color: BASE.muted, flexShrink: 0 }}>{Math.round(a.hh)} HH</span>}
              <button onClick={() => setEstado(a.actKey, sem, est === 'ok' ? null : 'ok')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '11px', background: est === 'ok' ? BASE.greenDark : '#e8f5ee', color: est === 'ok' ? '#fff' : BASE.greenDark }}>✓</button>
              <button onClick={() => setEstado(a.actKey, sem, esNo ? null : (bloq ? 'prerequisito' : 'otros'))}
                title={bloq ? 'Marcar no cumplida (causa sugerida: prerrequisito/restricción)' : 'Marcar no cumplida'}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '11px', background: esNo ? BASE.red : '#fdecec', color: esNo ? '#fff' : BASE.red }}>✗</button>
              {esNo && (
                <select value={est} onChange={e => setEstado(a.actKey, sem, e.target.value)}
                  style={inp({ width: 'auto', fontSize: '10px', padding: '4px 6px' })}>
                  {CNC_CATS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        PPC = cumplidas / planificadas. El programa viene del LAP (🔭 / 📋); aquí solo cierras lo ejecutado. Las <strong style={{ color: BASE.red }}>🔒 comprometidas en riesgo</strong> tenían restricciones pendientes (conversa con el AR); al marcarlas ✗ se sugiere la causa <em>prerrequisito</em>. Todo automático por proyecto.
      </p>
    </div>
  );
}
