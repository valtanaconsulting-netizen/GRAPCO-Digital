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
  compromisoId, obtenerSemana as obtSem,
  RESTRICCION_TIPOS, RESTRICCION_TIPOS_MAP, RESTRICCION_ESTADOS,
  calcularEstadoRestriccion, calcularKPIRestricciones,
  sugerirLecciones, calcularKPILecciones,
  restriccionId, leccionId, diasEntre, fmtFechaCorta,
  DIAS_SEMANA, NIVELES_PROG, TIPOS_CUMPLIMIENTO,
  fechasDeSemana, generarLookahead, calcularPPCDiario, construirJerarquiaLPS,
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

  const [modalNuevo, setModalNuevo] = useState(null);
  const [modalCierre, setModalCierre] = useState(null);
  const [modalRestriccion, setModalRestriccion] = useState(null);   // { editando } | null
  const [modalLeccion, setModalLeccion] = useState(null);           // { editando, fromSugerencia? } | null
  const [formNuevo, setFormNuevo] = useState({ actividad: '', metradoComprometido: '', observacion: '' });
  const [formCierre, setFormCierre] = useState({ metradoEjecutado: '', cumplido: true, rncCategoria: '', rncDescripcion: '' });
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
  const { proyectoActivoId: proyIdVDC } = useProyectoActivo();
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

  // ── Datos calculados ──
  const ppcSemanal = useMemo(() => calcularPPCSemanal(compromisos), [compromisos]);
  const pareto = useMemo(() => calcularParetoRNC(compromisos), [compromisos]);
  const diag = useMemo(() => diagnosticarPPC(ppcSemanal, 4), [ppcSemanal]);

  const compromisosSemanaActiva = useMemo(
    () => compromisos.filter(c => c.semana === semanaActiva),
    [compromisos, semanaActiva]
  );

  const semanasDisponibles = useMemo(() => {
    const set = new Set();
    compromisos.forEach(c => set.add(c.semana));
    set.add(semanaActiva);
    set.add(semanaActiva + 1);
    return Array.from(set).sort((a, b) => b - a);
  }, [compromisos, semanaActiva]);

  // ── CRUD compromisos ──
  const guardarNuevo = async () => {
    if (!modalNuevo) return;
    if (!formNuevo.actividad.trim()) return showToast('Ingresa la actividad', 'warning');
    const met = parseFloat(formNuevo.metradoComprometido);
    if (isNaN(met) || met <= 0) return showToast('Metrado inválido', 'warning');

    try {
      await addDoc(collection(db, 'PPC_Compromisos'), {
        semana: modalNuevo.semana,
        capataz: modalNuevo.capataz,
        actividad: formNuevo.actividad.trim().toUpperCase(),
        metradoComprometido: met,
        metradoEjecutado: null,
        cumplido: null,
        rncCategoria: null,
        rncDescripcion: null,
        observacion: formNuevo.observacion || '',
        creadoEn: new Date(),
        cerradoEn: null,
      });
      setModalNuevo(null);
      setFormNuevo({ actividad: '', metradoComprometido: '', observacion: '' });
      showToast('✅ Compromiso registrado', 'success');
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const guardarCierre = async () => {
    if (!modalCierre) return;
    const ejec = parseFloat(formCierre.metradoEjecutado);
    if (isNaN(ejec) || ejec < 0) return showToast('Metrado ejecutado inválido', 'warning');
    if (!formCierre.cumplido && !formCierre.rncCategoria)
      return showToast('Selecciona la razón de no cumplimiento', 'warning');

    try {
      await updateDoc(doc(db, 'PPC_Compromisos', modalCierre.id), {
        metradoEjecutado: ejec,
        cumplido: formCierre.cumplido,
        rncCategoria: formCierre.cumplido ? null : formCierre.rncCategoria,
        rncDescripcion: formCierre.cumplido ? null : formCierre.rncDescripcion,
        cerradoEn: new Date(),
      });
      setModalCierre(null);
      setFormCierre({ metradoEjecutado: '', cumplido: true, rncCategoria: '', rncDescripcion: '' });
      showToast(formCierre.cumplido ? '✅ Cumplido registrado' : '⚠️ Incumplimiento registrado', 'success');
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const eliminarCompromiso = async (id) => {
    if (!window.confirm('¿Eliminar este compromiso? No se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'PPC_Compromisos', id));
      showToast('Compromiso eliminado', 'info');
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const abrirCierre = (c) => {
    setFormCierre({
      metradoEjecutado: c.metradoEjecutado != null ? String(c.metradoEjecutado) : String(c.metradoComprometido),
      cumplido: c.cumplido != null ? c.cumplido : true,
      rncCategoria: c.rncCategoria || '',
      rncDescripcion: c.rncDescripcion || '',
    });
    setModalCierre(c);
  };

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
            { id: 'ejecdia',       l: '🏗️ Ejecución Diaria',       group: 'exec' },
            { id: 'dashboard',     l: '📊 PPC Dashboard',          group: 'ctrl' },
            { id: 'rnc',           l: '🔍 RNC Pareto',             group: 'ctrl' },
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
        />
      )}

      {/* === PROGRAMACIÓN SEMANAL (formato Excel S0/S1/S2) === */}
      {tab === 'progsem' && (
        <ProgramacionSemanalLPS
          semanaActiva={semanaActiva}
          setSemanaActiva={setSemanaActiva}
          semanasDisponibles={semanasDisponibles}
          restricciones={restricciones}
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

      {/* === EJECUCIÓN DIARIA (replica imagen 1: SI/NO + PPC%) === */}
      {tab === 'ejecdia' && (
        <EjecucionDiariaLPS
          semanaActiva={semanaActiva}
          setSemanaActiva={setSemanaActiva}
          semanasDisponibles={semanasDisponibles}
          compromisos={compromisos}
        />
      )}

      {/* === DASHBOARD PPC (conectado al LAP) === */}
      {tab === 'dashboard' && (
        <PPCLap semanaActiva={semanaActiva} setSemanaActiva={setSemanaActiva} />
      )}

      {/* === PLAN SEMANAL === */}
      {tab === 'plan' && (
        <PlanSemanal
          semanaActiva={semanaActiva}
          setSemanaActiva={setSemanaActiva}
          semanasDisponibles={semanasDisponibles}
          compromisosSemana={compromisosSemanaActiva}
          cuadrillasActivas={cuadrillasActivas}
          onAgregar={(capataz) => setModalNuevo({ semana: semanaActiva, capataz })}
          onCerrar={abrirCierre}
          onEliminar={eliminarCompromiso}
          isMobile={isMobile}
        />
      )}

      {/* === RNC === */}
      {tab === 'rnc' && (
        <AnalisisRNC pareto={pareto} compromisos={compromisos} />
      )}

      {/* === RESTRICCIONES === */}
      {tab === 'restricciones' && (
        <Restricciones
          restricciones={restricciones}
          onEstado={cambiarEstadoAR}
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

      {/* MODAL: Nuevo compromiso */}
      {modalNuevo && (
        <Modal title={`➕ Nuevo compromiso · Semana ${modalNuevo.semana} · ${modalNuevo.capataz}`}
          onClose={() => setModalNuevo(null)} maxW="500px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>ACTIVIDAD</label>
              <input type="text" value={formNuevo.actividad}
                onChange={e => setFormNuevo(p => ({ ...p, actividad: e.target.value }))}
                placeholder="Ej: ENCOFRADO COLUMNAS EJE A"
                style={inp({ marginTop: '4px' })} />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>METRADO COMPROMETIDO</label>
              <input type="number" step="0.01" min="0" value={formNuevo.metradoComprometido}
                onChange={e => setFormNuevo(p => ({ ...p, metradoComprometido: e.target.value }))}
                placeholder="Ej: 25.5" inputMode="decimal"
                style={inp({ marginTop: '4px', fontSize: '16px', fontWeight: '700' })} />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>OBSERVACIÓN (opcional)</label>
              <textarea value={formNuevo.observacion}
                onChange={e => setFormNuevo(p => ({ ...p, observacion: e.target.value }))}
                placeholder="Restricciones identificadas, materiales requeridos..."
                style={inp({ marginTop: '4px', height: '60px', resize: 'vertical' })} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModalNuevo(null)} style={{
                flex: 1, padding: '12px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
                color: BASE.muted, borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px',
              }}>Cancelar</button>
              <button onClick={guardarNuevo} style={{
                flex: 2, padding: '12px',
                background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
                color: '#fff', border: 'none', borderRadius: '10px',
                fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                boxShadow: `0 4px 12px ${BASE.green}55`,
              }}>💾 Guardar compromiso</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Cierre de compromiso */}
      {modalCierre && (
        <Modal title={`🏁 Cerrar compromiso · ${modalCierre.actividad}`}
          onClose={() => setModalCierre(null)} maxW="520px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: BASE.bgSoft, borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ fontSize: '11px', color: BASE.muted }}>
                <strong>Capataz:</strong> {modalCierre.capataz} · <strong>Comprometido:</strong> {modalCierre.metradoComprometido}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>
                METRADO EJECUTADO REAL
              </label>
              <input type="number" step="0.01" min="0" value={formCierre.metradoEjecutado}
                onChange={e => setFormCierre(p => ({ ...p, metradoEjecutado: e.target.value }))}
                inputMode="decimal"
                style={inp({ marginTop: '4px', fontSize: '16px', fontWeight: '700' })} />
            </div>

            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '6px', display: 'block' }}>
                ¿SE CUMPLIÓ EL COMPROMISO?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => setFormCierre(p => ({ ...p, cumplido: true }))}
                  style={{
                    padding: '14px',
                    background: formCierre.cumplido ? BASE.green : '#fff',
                    color: formCierre.cumplido ? '#fff' : BASE.muted,
                    border: `2px solid ${formCierre.cumplido ? BASE.green : BASE.border}`,
                    borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                  }}>
                  ✅ Sí, cumplido
                </button>
                <button onClick={() => setFormCierre(p => ({ ...p, cumplido: false }))}
                  style={{
                    padding: '14px',
                    background: !formCierre.cumplido ? BASE.red : '#fff',
                    color: !formCierre.cumplido ? '#fff' : BASE.muted,
                    border: `2px solid ${!formCierre.cumplido ? BASE.red : BASE.border}`,
                    borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                  }}>
                  ❌ No cumplido
                </button>
              </div>
            </div>

            {!formCierre.cumplido && (
              <>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '6px', display: 'block' }}>
                    RAZÓN DE NO CUMPLIMIENTO (RNC)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
                    {RNC_CATEGORIAS.map(cat => {
                      const sel = formCierre.rncCategoria === cat.id;
                      return (
                        <button key={cat.id} onClick={() => setFormCierre(p => ({ ...p, rncCategoria: cat.id }))}
                          style={{
                            padding: '10px 12px',
                            background: sel ? cat.color + '22' : '#fff',
                            color: sel ? cat.color : BASE.muted,
                            border: `1.5px solid ${sel ? cat.color : BASE.border}`,
                            borderRadius: '8px', fontWeight: sel ? '800' : '600', fontSize: '11px',
                            cursor: 'pointer', textAlign: 'left',
                          }}>
                          <span style={{ fontSize: '14px', marginRight: '4px' }}>{cat.icon}</span>
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>
                    DESCRIPCIÓN DETALLADA (opcional)
                  </label>
                  <textarea value={formCierre.rncDescripcion}
                    onChange={e => setFormCierre(p => ({ ...p, rncDescripcion: e.target.value }))}
                    placeholder="Ej: El acero llegó el martes en lugar del lunes por demora del proveedor"
                    style={inp({ marginTop: '4px', height: '60px', resize: 'vertical', fontSize: '12px' })} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setModalCierre(null)} style={{
                flex: 1, padding: '12px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
                color: BASE.muted, borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px',
              }}>Cancelar</button>
              <button onClick={guardarCierre} style={{
                flex: 2, padding: '12px',
                background: formCierre.cumplido
                  ? `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`
                  : `linear-gradient(135deg, ${BASE.red}, #b91c1c)`,
                color: '#fff', border: 'none', borderRadius: '10px',
                fontWeight: '800', cursor: 'pointer', fontSize: '13px',
              }}>🏁 Cerrar compromiso</button>
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

function DashboardPPC({ ppcSemanal, pareto, diag, compromisos }) {
  if (ppcSemanal.length === 0) {
    return (
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `2px dashed ${BASE.border}`, padding: '60px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>📊</p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>
          Sin compromisos registrados aún
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
          Empieza creando un Plan Semanal en la pestaña <strong>📅 Plan Semanal</strong>.
        </p>
      </div>
    );
  }

  const ultimos8 = ppcSemanal.slice(-8);
  const cumplidos = compromisos.filter(c => c.cumplido === true).length;
  const incumplidos = compromisos.filter(c => c.cumplido === false).length;
  const pendientes = compromisos.filter(c => c.cumplido === null).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Diagnóstico */}
      <div style={{
        background: diag.color + '12',
        border: `1px solid ${diag.color}55`,
        borderLeft: `5px solid ${diag.color}`,
        borderRadius: '12px',
        padding: '14px 18px',
      }}>
        <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.8px', marginBottom: '4px' }}>
          DIAGNÓSTICO LEAN
        </p>
        <p style={{ fontSize: '15px', fontWeight: '800', color: diag.color }}>
          {diag.diagnostico}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        {[
          { l: 'COMPROMISOS', v: compromisos.length, c: BASE.navy, sub: 'Total registrados' },
          { l: 'CUMPLIDOS', v: cumplidos, c: BASE.greenDark, sub: `${compromisos.length > 0 ? Math.round((cumplidos / compromisos.length) * 100) : 0}% del total` },
          { l: 'NO CUMPLIDOS', v: incumplidos, c: BASE.red, sub: 'Generaron RNC' },
          { l: 'PENDIENTES', v: pendientes, c: BASE.gold, sub: 'Por cerrar' },
        ].map(k => (
          <div key={k.l} style={{
            background: BASE.white, borderRadius: '12px',
            border: `1px solid ${BASE.border}`, padding: '14px 16px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>{k.l}</p>
            <p style={{ fontSize: '24px', fontWeight: '900', color: k.c, marginTop: '4px' }}>{k.v}</p>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Curva PPC */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
            EVOLUCIÓN PPC POR SEMANA
          </h3>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginLeft: '14px', marginBottom: '14px' }}>
          % Plan Cumplido. Meta benchmark Lean: ≥ 80%
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={ultimos8} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: BASE.muted, fontWeight: 600 }}
              tickFormatter={v => `S${v}`} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: BASE.muted }}
              tickFormatter={v => `${v}%`} />
            <Tooltip
              contentStyle={{ background: '#fff', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px' }}
              formatter={(v, name) => name === 'PPC' ? [`${v}%`, 'PPC'] : [v, name]}
            />
            <ReferenceLine y={80} stroke={BASE.green} strokeDasharray="5 3"
              label={{ value: 'Meta 80%', fill: BASE.green, fontSize: 10, position: 'right' }} />
            <Line type="monotone" dataKey="ppcPct" name="PPC"
              stroke={BASE.gold} strokeWidth={3}
              dot={{ r: 5, fill: BASE.gold, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Pareto RNC */}
      {pareto.items.length > 0 && (
        <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '20px', background: BASE.red, borderRadius: '2px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
              TOP CAUSAS DE NO CUMPLIMIENTO
            </h3>
          </div>
          <p style={{ fontSize: '11px', color: BASE.muted, marginLeft: '14px', marginBottom: '14px' }}>
            Top 3 causas representan el {Math.round(pareto.top3Pct)}% del total
            {pareto.top3Pct > 60 && <span style={{ color: BASE.red, fontWeight: '700' }}> · ⚠️ Concentración alta, atacar estas causas primero</span>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pareto.items.slice(0, 5).map((item, i) => (
              <div key={item.categoria} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: BASE.text, minWidth: '120px' }}>
                  {item.label}
                </span>
                <div style={{ flex: 1, height: '20px', background: BASE.bgSoft, borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${item.pct}%`,
                    background: item.color, borderRadius: '4px',
                    transition: 'width 0.4s',
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: item.color, minWidth: '50px', textAlign: 'right' }}>
                  {item.count} · {Math.round(item.pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanSemanal({ semanaActiva, setSemanaActiva, semanasDisponibles, compromisosSemana, cuadrillasActivas, onAgregar, onCerrar, onEliminar, isMobile }) {
  const capataces = Object.keys(cuadrillasActivas || {});
  const compromisosPorCapataz = useMemo(() => {
    const m = {};
    capataces.forEach(c => { m[c] = []; });
    compromisosSemana.forEach(c => {
      if (!m[c.capataz]) m[c.capataz] = [];
      m[c.capataz].push(c);
    });
    return m;
  }, [compromisosSemana, capataces]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Selector de semana */}
      <div style={{
        background: BASE.white, borderRadius: '12px',
        border: `1px solid ${BASE.border}`, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>SEMANA ACTIVA</p>
          <p style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '2px' }}>
            Semana {semanaActiva}
          </p>
        </div>
        <select value={semanaActiva} onChange={e => setSemanaActiva(parseInt(e.target.value))}
          style={inp({ width: 'auto', fontSize: '13px', fontWeight: '700' })}>
          {semanasDisponibles.map(s => <option key={s} value={s}>Semana {s}</option>)}
        </select>
      </div>

      {capataces.length === 0 ? (
        <div style={{ background: BASE.white, borderRadius: '14px', padding: '40px', textAlign: 'center', border: `2px dashed ${BASE.border}` }}>
          <p style={{ fontSize: '13px', color: BASE.muted }}>No hay cuadrillas registradas. Crea cuadrillas en Personal.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(380px, 1fr))', gap: '12px' }}>
          {capataces.map(capataz => {
            const lista = compromisosPorCapataz[capataz] || [];
            const cumplidos = lista.filter(c => c.cumplido === true).length;
            const incumplidos = lista.filter(c => c.cumplido === false).length;
            const pendientes = lista.filter(c => c.cumplido === null).length;
            const ppc = (cumplidos + incumplidos) > 0 ? cumplidos / (cumplidos + incumplidos) : null;

            return (
              <div key={capataz} style={{
                background: BASE.white, borderRadius: '12px',
                border: `1px solid ${BASE.border}`, padding: '14px 16px',
              }}>
                {/* Header capataz */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${BASE.border}` }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy }}>{capataz}</p>
                    <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                      {lista.length} compromiso{lista.length !== 1 ? 's' : ''}
                      {ppc !== null && <> · PPC <strong style={{ color: ppc >= 0.8 ? BASE.greenDark : BASE.red }}>{Math.round(ppc * 100)}%</strong></>}
                    </p>
                  </div>
                  <button onClick={() => onAgregar(capataz)} style={{
                    padding: '7px 12px', background: BASE.gold, color: '#fff',
                    border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                    cursor: 'pointer', boxShadow: `0 2px 6px ${BASE.gold}55`,
                  }}>+ Compromiso</button>
                </div>

                {/* Lista */}
                {lista.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px 10px', fontSize: '12px', color: BASE.muted, fontStyle: 'italic' }}>
                    Sin compromisos para esta semana
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {lista.map(c => {
                      const estado = c.cumplido === true ? 'cumplido'
                        : c.cumplido === false ? 'incumplido' : 'pendiente';
                      const bgEstado = estado === 'cumplido' ? BASE.greenLight
                        : estado === 'incumplido' ? BASE.redLight : BASE.bgSoft;
                      const colorEstado = estado === 'cumplido' ? BASE.greenDark
                        : estado === 'incumplido' ? BASE.red : BASE.muted;
                      const iconEstado = estado === 'cumplido' ? '✅' : estado === 'incumplido' ? '❌' : '⏳';

                      return (
                        <div key={c.id} style={{
                          background: bgEstado, borderRadius: '8px', padding: '10px 12px',
                          border: `1px solid ${colorEstado}33`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px' }}>{iconEstado}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '12px', fontWeight: '700', color: BASE.text, lineHeight: 1.3 }}>
                                {c.actividad}
                              </p>
                              <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                                Comp.: <strong>{c.metradoComprometido}</strong>
                                {c.metradoEjecutado != null && <> · Ejec.: <strong>{c.metradoEjecutado}</strong></>}
                                {c.rncCategoria && <> · {RNC_ICONS[c.rncCategoria]} {RNC_LABELS[c.rncCategoria]}</>}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => onCerrar(c)} style={{
                                padding: '5px 10px', background: '#fff', border: `1px solid ${BASE.border}`,
                                borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                color: BASE.navy,
                              }}>{estado === 'pendiente' ? 'Cerrar' : 'Editar'}</button>
                              <button onClick={() => onEliminar(c.id)} style={{
                                padding: '5px 8px', background: BASE.redLight, border: 'none',
                                borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                color: BASE.red,
                              }}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalisisRNC({ pareto, compromisos }) {
  if (pareto.items.length === 0) {
    return (
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `2px dashed ${BASE.border}`, padding: '60px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>
          ¡Sin razones de no cumplimiento registradas!
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
          Esto es excelente noticia o aún no se han cerrado compromisos no cumplidos.
        </p>
      </div>
    );
  }

  // Datos para gráfico Pareto (combo)
  const datosGrafico = pareto.items.map(i => ({
    label: i.label,
    count: i.count,
    acum: Math.round(i.acumPct),
    color: i.color,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Pareto chart */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.red, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
            DIAGRAMA DE PARETO · CAUSAS DE NO CUMPLIMIENTO
          </h3>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginLeft: '14px', marginBottom: '14px' }}>
          Total {pareto.total} incumplimientos. Top 3 causas: {Math.round(pareto.top3Pct)}% del problema.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={datosGrafico} margin={{ top: 10, right: 40, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: BASE.muted, fontWeight: 600 }}
              angle={-25} textAnchor="end" interval={0} height={80} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: BASE.muted }}
              label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: BASE.muted } }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]}
              tick={{ fontSize: 11, fill: BASE.muted }} tickFormatter={v => `${v}%`}
              label={{ value: '% Acum.', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: BASE.muted } }} />
            <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="count" radius={[6, 6, 0, 0]}>
              {datosGrafico.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="acum" name="% Acumulado"
              stroke={BASE.navy} strokeWidth={3}
              dot={{ r: 5, fill: BASE.navy, strokeWidth: 2, stroke: '#fff' }} />
            <ReferenceLine yAxisId="right" y={80} stroke={BASE.green} strokeDasharray="5 3"
              label={{ value: '80%', fill: BASE.green, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Detalle textual de incumplimientos recientes */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
            INCUMPLIMIENTOS RECIENTES
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {compromisos
            .filter(c => c.cumplido === false)
            .sort((a, b) => (b.cerradoEn?.seconds || 0) - (a.cerradoEn?.seconds || 0))
            .slice(0, 8)
            .map(c => (
              <div key={c.id} style={{ background: BASE.bgSoft, borderRadius: '10px', padding: '10px 14px', borderLeft: `4px solid ${RNC_COLORS[c.rncCategoria] || BASE.muted}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px' }}>{RNC_ICONS[c.rncCategoria] || '📌'}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: RNC_COLORS[c.rncCategoria] || BASE.muted, letterSpacing: '0.3px' }}>
                    {RNC_LABELS[c.rncCategoria] || 'Sin categoría'}
                  </span>
                  <span style={{ fontSize: '10px', color: BASE.muted }}>·</span>
                  <span style={{ fontSize: '11px', color: BASE.muted }}>S{c.semana} · {c.capataz}</span>
                </div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: BASE.text }}>
                  {c.actividad}
                </p>
                {c.rncDescripcion && (
                  <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '3px', fontStyle: 'italic' }}>
                    "{c.rncDescripcion}"
                  </p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
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

function Restricciones({ restricciones, onNueva, onEditar, onLiberar, onEliminar, onEstado }) {
  const kpi = useMemo(() => calcularKPIRestricciones(restricciones), [restricciones]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [semanaAR, setSemanaAR] = useState(() => obtenerSemana(new Date().toISOString().slice(0, 10)));
  const [verTodasSem, setVerTodasSem] = useState(false);
  const reqW = (r) => r.fechaCompromisoLiberacion ? obtenerSemana(r.fechaCompromisoLiberacion) : null;
  const cicloEstado = { pendiente: 'en_proceso', en_proceso: 'liberada', liberada: 'pendiente', vencida: 'liberada' };

  const filtradas = useMemo(() => {
    let lista = kpi.lista;
    if (filtroEstado !== 'todos') lista = lista.filter(r => r._estado === filtroEstado);
    if (!verTodasSem) lista = lista.filter(r => reqW(r) === semanaAR);
    return lista;
  }, [kpi.lista, filtroEstado, semanaAR, verTodasSem]);

  // Al cargar, posiciónate en la semana con más restricciones (no en una vacía).
  const [autoSem, setAutoSem] = useState(false);
  useEffect(() => {
    if (autoSem || !kpi.lista.length) return;
    const c = {}; kpi.lista.forEach(r => { const w = reqW(r); if (w) c[w] = (c[w] || 0) + 1; });
    const ent = Object.entries(c);
    if (ent.length) { setSemanaAR(parseInt(ent.sort((a, b) => b[1] - a[1])[0][0], 10)); setAutoSem(true); }
  }, [kpi.lista, autoSem]);

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

  // Rango de semanas para la grilla (como el Excel AR): cada restricción se ve a lo
  // largo de las SEMANAS desde su fecha requerida hasta que se libera.
  const curWeek = obtenerSemana(new Date().toISOString().slice(0, 10));
  const semGrid = useMemo(() => {
    let maxW = curWeek;
    filtradas.forEach(r => { [r.fechaCompromisoLiberacion, r.fechaConciliada].forEach(f => { if (f) maxW = Math.max(maxW, obtenerSemana(f)); }); });
    maxW = Math.min(Math.max(maxW, 6), 34);
    const arr = [];
    for (let n = 1; n <= maxW; n++) { const d = fechasDeSemana(n, INICIO_PROYECTO)[0]; arr.push({ n, dia: d ? d.dia : '', mes: d ? d.mes : '' }); }
    return arr;
  }, [filtradas, curWeek]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.6px' }}>📋 ANÁLISIS DE RESTRICCIONES</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => { setVerTodasSem(false); setSemanaAR(Math.max(1, semanaAR - 1)); }} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '7px', padding: '5px 9px', fontWeight: 800, cursor: 'pointer' }}>‹</button>
            <select value={verTodasSem ? 'todas' : semanaAR} onChange={e => { if (e.target.value === 'todas') setVerTodasSem(true); else { setVerTodasSem(false); setSemanaAR(parseInt(e.target.value, 10)); } }}
              style={{ background: '#fff', color: BASE.navy, border: 'none', borderRadius: '7px', padding: '6px 10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
              <option value="todas">Todas las semanas</option>
              {Array.from({ length: Math.max(semGrid.length, 1) }, (_, i) => i + 1).map(s => <option key={s} value={s}>Semana {s}</option>)}
            </select>
            <button onClick={() => { setVerTodasSem(false); setSemanaAR(semanaAR + 1); }} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '7px', padding: '5px 9px', fontWeight: 800, cursor: 'pointer' }}>›</button>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.85 }}>{ordenadas.length} de {kpi.total} · clic en ESTADO para cambiarlo</span>
        </div>
        {grupos.length === 0 ? (
          <div style={{ padding: '44px', textAlign: 'center', color: BASE.muted, fontSize: '13px' }}>
            🚧 {kpi.total === 0 ? 'No hay restricciones aún. Regístralas desde el lookahead.' : 'Ninguna coincide con el filtro.'}
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

function Lecciones({ lecciones, sugerencias, onNueva, onEditar, onEliminar }) {
  const kpi = useMemo(() => calcularKPILecciones(lecciones), [lecciones]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

// Indexa restricciones por nombre de actividad (AR ↔ LAP).
function restriccionesPorActividad(restricciones) {
  const m = {};
  (restricciones || []).forEach(r => {
    const k = (r.actividad || '').toUpperCase().trim();
    if (!k) return;
    if (!m[k]) m[k] = { pend: 0, total: 0 };
    m[k].total++;
    if (r.estado !== 'liberada') m[k].pend++;
  });
  return m;
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
// SUB-COMPONENTE: LAP · LOOKAHEAD A 6 SEMANAS
// Muestra ventana móvil de 6 semanas con actividades planificadas
// ════════════════════════════════════════════════════════════════
function LookaheadView({ compromisos, restricciones, semanaActiva }) {
  const INICIO = INICIO_PROYECTO;
  // Ventana móvil NAVEGABLE de 6 semanas: arranca en la semana actual pero se puede
  // mover atrás/adelante para revisar (o construir) cualquier tramo del lookahead.
  const [winStart, setWinStart] = useState(semanaActiva);
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
  const irA = (n) => setWinStart(Math.max(1, Math.min(60, n)));
  const fmtN = (n) => n == null ? '' : Number(n).toLocaleString('es-PE', { maximumFractionDigits: n < 100 ? 1 : 0 });
  const navBtn = { padding: '8px 12px', background: BASE.white, color: BASE.navy, border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' };
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
            Programación intermedia tal cual el <strong style={{ color: BASE.gold }}>LAP oficial</strong>. Se ven TODAS las partidas;
            <strong> clic/arrastra</strong> para pintar, <strong>Ctrl+Z</strong> deshace y puedes elegir el color.
          </p>
        </div>
        <BotonImprimir titulo="Lookahead 6 semanas" />
      </div>

      {/* Barra de navegación */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '10px 14px', boxShadow: BASE.shadowSm }}>
        <button onClick={() => irA(winStart - 6)} style={navBtn} title="6 semanas atrás">«</button>
        <button onClick={() => irA(winStart - 1)} style={navBtn}>‹ Anterior</button>
        <div style={{ textAlign: 'center', minWidth: '230px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>SEMANAS {winStart} – {winStart + 5}</p>
          <p style={{ fontSize: '10.5px', color: BASE.muted }}>
            {dias[0] && `${dias[0].dia}/${dias[0].mes}`} – {dias[41] && `${dias[41].dia}/${dias[41].mes}`}
            {winStart !== semanaActiva && (
              <button onClick={() => setWinStart(semanaActiva)} style={{ marginLeft: '8px', padding: '2px 8px', background: BASE.gold, color: BASE.navy, border: 'none', borderRadius: '999px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>⭐ Ir a hoy</button>
            )}
          </p>
        </div>
        <button onClick={() => irA(winStart + 1)} style={navBtn}>Siguiente ›</button>
        <button onClick={() => irA(winStart + 6)} style={navBtn} title="6 semanas adelante">»</button>
      </div>

      {/* Herramientas: ocultar no programadas + color de pintado + conteo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: BASE.navy, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideUnmarked} onChange={e => setHideUnmarked(e.target.checked)} />
          Ocultar actividades sin programar en la ventana
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <SelectorColor colorPaint={colorPaint} setColorPaint={setColorPaint} />
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
                      <div key={wi} style={{
                        flex: 1, minWidth: 0, overflow: 'hidden',
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
                    const rr = restrPorAct[(a.actividad || '').toUpperCase().trim()];
                    return (
                      <div key={a.actKey} style={{ display: 'flex', borderBottom: `1px solid #eef2f6`, minHeight: ROW_H, background: bgRow }}>
                        <div style={{ ...leftColsStyle, background: bgRow, borderLeft: esSub ? `3px solid ${sec.color}` : `3px solid transparent` }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: esSub ? '9px' : '9.5px', paddingLeft: pad, color: esSub ? BASE.navy : BASE.text, fontWeight: esSub ? 900 : 600, textTransform: esSub ? 'uppercase' : 'none', letterSpacing: esSub ? '0.3px' : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.actividad}>
                            {rr && rr.pend > 0 ? <span title={`${rr.pend} restricción(es) pendiente(s)`}>🚧 </span> : (rr && rr.total > 0 ? <span title="Restricciones liberadas">✅ </span> : '')}
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
                                {on && <span style={{ width: '86%', height: 14, background: color || sec.color, borderRadius: '2px', boxShadow: `0 1px 2px ${(color || sec.color)}66`, pointerEvents: 'none' }} />}
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
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: PROGRAMACIÓN SEMANAL (formato Excel S0/S1/S2)
// Replica imagen 2: tabla con días lun-dom + colores S0/S1/S2 por celda
// ════════════════════════════════════════════════════════════════
function ProgramacionSemanalLPS({ semanaActiva, setSemanaActiva, semanasDisponibles, restricciones = [] }) {
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
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const navBtn = { padding: '7px 11px', background: BASE.white, color: BASE.navy, border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' };

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
      {/* Cabecera + navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy }}>📋 PROGRAMACIÓN SEMANAL · Semana {semanaActiva}</h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Plan semanal (Lun–Dom) tal cual el Excel F05, alimentado por el LAP. <strong>Clic/arrastra</strong> para pintar o borrar días; se sincroniza con el Lookahead.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => setSemanaActiva(Math.max(1, semanaActiva - 1))} style={navBtn} title="Semana anterior">‹</button>
          <select value={semanaActiva} onChange={e => setSemanaActiva(parseInt(e.target.value))}
            style={inp({ width: 'auto', fontSize: '12px', fontWeight: 700, padding: '8px 12px' })}>
            {Array.from(new Set([...(semanasDisponibles || []), semanaActiva])).sort((a, b) => a - b).map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <button onClick={() => setSemanaActiva(semanaActiva + 1)} style={navBtn} title="Semana siguiente">›</button>
          <BotonImprimir titulo={`Programación Semana ${semanaActiva}`} />
        </div>
      </div>

      {/* Herramientas: ocultar no programadas + color + conteo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: BASE.navy, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideUnmarked} onChange={e => setHideUnmarked(e.target.checked)} />
          Ocultar actividades sin programar esta semana
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <SelectorColor colorPaint={colorPaint} setColorPaint={setColorPaint} />
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
                    const rr = restrPorAct[(a.actividad || '').toUpperCase().trim()];
                    return (
                      <div key={a.actKey} style={{ display: 'flex', borderBottom: `1px solid #eef2f6`, minHeight: 26, alignItems: 'stretch', background: bgRow }}>
                        <div style={{ ...cCod, ...pc, justifyContent: 'center', fontWeight: 800, color: sec.color, fontSize: '9px', borderLeft: esSub ? `3px solid ${sec.color}` : '3px solid transparent' }}>{a.id || ''}</div>
                        <div style={{ ...cAct, ...pc, paddingLeft: 6 + pad }}>
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: esSub ? 900 : 600, color: esSub ? BASE.navy : BASE.text, textTransform: esSub ? 'uppercase' : 'none', fontSize: esSub ? '9.5px' : '10px' }} title={a.actividad}>
                            {rr && rr.pend > 0 ? <span title={`${rr.pend} restricción(es) pendiente(s)`}>🚧 </span> : (rr && rr.total > 0 ? '✅ ' : '')}{a.actividad}
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
                              {on && <span style={{ width: '78%', height: 14, background: color || sec.color, borderRadius: '2px', boxShadow: `0 1px 2px ${(color || sec.color)}66`, pointerEvents: 'none' }} />}
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
        <strong style={{ color: BASE.navy }}>📖 Programación Semanal (F05):</strong> una semana (Lun–Dom) con las actividades del LAP. Cada celda de color = día programado; <strong>clic/arrastra</strong> para editar. Comparte marcas con el Lookahead; la columna roja es hoy.
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
function PPCLap({ semanaActiva, setSemanaActiva }) {
  const { proyectoActivoId } = useProyectoActivo();
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
  const totalSemanas = Math.max(36, ...(ppcOficial.sem || []).map(s => s.semana || 0));
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
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => setSemanaActiva(Math.max(1, sem - 1))} style={{ padding: '7px 11px', background: BASE.white, color: BASE.navy, border: `1px solid ${BASE.border}`, borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>‹</button>
          <select value={sem} onChange={e => setSemanaActiva(parseInt(e.target.value, 10))}
            style={inp({ width: 'auto', fontSize: '12px', fontWeight: 800, padding: '8px 12px' })}>
            {Array.from({ length: totalSemanas }, (_, i) => i + 1).map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <button onClick={() => setSemanaActiva(sem + 1)} style={{ padding: '7px 11px', background: BASE.white, color: BASE.navy, border: `1px solid ${BASE.border}`, borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>›</button>
          <BotonImprimir titulo={`PPC Semana ${sem}`} />
        </div>
      </div>

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
        {[['Cumplidas', (ok + no > 0) ? ok : (ppcOf ? ppcOf.realizadas : 0), BASE.greenDark], ['No cumplidas', (ok + no > 0) ? no : (ppcOf ? ppcOf.noCumplidas : 0), BASE.red], ['Planificadas (LAP)', planif.length, BASE.navy]].map(([l, v, c]) => (
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
          return (
            <div key={a.actKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderBottom: `1px solid #eef2f6`, background: i % 2 ? '#f8fbff' : '#fff' }}>
              <span style={{ flex: 1, fontSize: '11px', color: BASE.text }}>{a.id ? <b style={{ color: BASE.navy }}>{a.id} </b> : ''}{a.actividad}</span>
              {a.hh != null && <span style={{ fontSize: '9.5px', color: BASE.muted, flexShrink: 0 }}>{Math.round(a.hh)} HH</span>}
              <button onClick={() => setEstado(a.actKey, sem, est === 'ok' ? null : 'ok')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '11px', background: est === 'ok' ? BASE.greenDark : '#e8f5ee', color: est === 'ok' ? '#fff' : BASE.greenDark }}>✓</button>
              <button onClick={() => setEstado(a.actKey, sem, esNo ? null : 'otros')}
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
        PPC = cumplidas / planificadas. El programa viene del LAP (pestaña 🔭 / 📋); aquí solo cierras lo ejecutado. Todo conversa por proyecto.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: EJECUCIÓN DIARIA (replica imagen 1)
// Tabla con SI/NO/TIPO + columna PPC% por actividad
// ════════════════════════════════════════════════════════════════
function EjecucionDiariaLPS({ semanaActiva, setSemanaActiva, semanasDisponibles, compromisos }) {
  const dias = useMemo(() => fechasDeSemana(semanaActiva, INICIO_PROYECTO), [semanaActiva]);
  const compromisosSem = useMemo(
    () => compromisos.filter(c => c.semana === semanaActiva),
    [compromisos, semanaActiva]
  );
  const jerarquia = useMemo(() => construirJerarquiaLPS(compromisosSem), [compromisosSem]);

  // PPC global de la semana
  const cumplidos = compromisosSem.filter(c => c.cumplido === true).length;
  const cerrados = compromisosSem.filter(c => c.cumplido !== null).length;
  const ppcSemanal = cerrados > 0 ? cumplidos / cerrados : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '900', color: BASE.navy }}>
            📅 EJECUCIÓN DIARIA · Semana {semanaActiva}
          </h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Análisis de cumplimiento día a día con % de avance ejecutado (PPC).
            {ppcSemanal !== null && (
              <span style={{ marginLeft: '8px', color: ppcSemanal >= 0.8 ? BASE.greenDark : BASE.red, fontWeight: '900' }}>
                · PPC semana: {Math.round(ppcSemanal * 100)}%
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={semanaActiva} onChange={e => setSemanaActiva(parseInt(e.target.value))}
            style={inp({ width: 'auto', fontSize: '12px', fontWeight: '700', padding: '8px 12px' })}>
            {semanasDisponibles.map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <BotonImprimir titulo={`Ejecución Diaria Semana ${semanaActiva}`} />
        </div>
      </div>

      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `1px solid ${BASE.border}`, overflow: 'hidden',
        boxShadow: BASE.shadowSm,
      }}>
        {/* Header LPS dorado */}
        <div style={{
          background: BASE.lpsHeader, padding: '12px 18px',
          borderBottom: `2px solid ${BASE.gold}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '1px' }}>
            PROGRAMACION DE PLAN CUMPLIDO — Semana {semanaActiva}
          </p>
          <p style={{ fontSize: '11px', fontWeight: '700', color: BASE.navy }}>
            INICIO {dias[0]?.fecha}
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '1100px' }}>
            <thead>
              <tr style={{ background: BASE.navy }}>
                <th style={{ padding: '10px 8px', color: '#fff', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px', textAlign: 'left', width: '60px' }}>COD</th>
                <th style={{ padding: '10px 8px', color: '#fff', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px', textAlign: 'left', minWidth: '260px' }}>ACTIVIDAD</th>
                {dias.map(d => (
                  <th key={d.id} style={{
                    padding: '8px 6px', background: BASE.gold, color: '#fff',
                    fontSize: '10px', fontWeight: '900',
                    textAlign: 'center', borderLeft: `1px solid ${BASE.goldDark}`,
                    width: '50px',
                  }}>
                    <p>{d.mes}</p>
                    <p style={{ fontSize: '13px', fontWeight: '900', marginTop: '2px' }}>{d.dia}</p>
                    <p style={{ fontSize: '9px', opacity: 0.9 }}>{d.label}</p>
                  </th>
                ))}
                {/* Análisis de cumplimiento */}
                <th colSpan="3" style={{
                  padding: '8px', background: BASE.lpsHeader, color: BASE.navy,
                  fontSize: '10px', fontWeight: '900', textAlign: 'center',
                  borderLeft: `2px solid ${BASE.navy}`,
                }}>
                  ANALISIS DE<br/>CUMPLIMIENTO
                </th>
                <th style={{
                  padding: '8px', background: BASE.lpsHeader, color: BASE.navy,
                  fontSize: '10px', fontWeight: '900', textAlign: 'center',
                  borderLeft: `1px solid ${BASE.navy}`,
                  minWidth: '90px',
                }}>
                  PORCENTAJE<br/>AVANCE (PPC%)
                </th>
              </tr>
              <tr style={{ background: BASE.bgSoft }}>
                <th colSpan={2 + dias.length}></th>
                <th style={{ padding: '6px', fontSize: '9px', fontWeight: '900', color: BASE.greenDark, textAlign: 'center', borderLeft: `2px solid ${BASE.navy}` }}>SI</th>
                <th style={{ padding: '6px', fontSize: '9px', fontWeight: '900', color: BASE.red, textAlign: 'center' }}>NO</th>
                <th style={{ padding: '6px', fontSize: '9px', fontWeight: '900', color: BASE.muted, textAlign: 'center' }}>TIPO</th>
                <th style={{ padding: '6px', borderLeft: `1px solid ${BASE.border}` }}></th>
              </tr>
            </thead>
            <tbody>
              {jerarquia.length === 0 ? (
                <tr>
                  <td colSpan={2 + dias.length + 4} style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
                    Sin compromisos. Crea uno en <strong>✏️ Compromisos (CRUD)</strong>.
                  </td>
                </tr>
              ) : (
                jerarquia.map((fila, idx) => {
                  const colTotal = 2 + dias.length + 4;
                  if (fila.tipo === 'frente') {
                    return (
                      <tr key={`${idx}_${fila.nombre}`} style={{ background: BASE.lpsBand }}>
                        <td colSpan={colTotal} style={{ padding: '8px 10px', color: BASE.gold, fontSize: '10px', fontWeight: '900', letterSpacing: '0.6px' }}>
                          [{fila.nivel}] {fila.nombre}
                        </td>
                      </tr>
                    );
                  }
                  if (fila.tipo === 'partida') {
                    return (
                      <tr key={`${idx}_${fila.nombre}`} style={{ background: BASE.lpsBandSoft }}>
                        <td colSpan={colTotal} style={{ padding: '6px 14px', color: BASE.navy, fontSize: '10px', fontWeight: '800' }}>
                          {fila.nivel} · {fila.nombre}
                        </td>
                      </tr>
                    );
                  }
                  if (fila.tipo === 'subpartida') {
                    return (
                      <tr key={`${idx}_${fila.nombre}`} style={{ background: BASE.lpsBandSofter }}>
                        <td colSpan={colTotal} style={{ padding: '5px 22px', color: BASE.muted, fontSize: '10px', fontWeight: '700' }}>
                          {fila.nivel} · {fila.nombre}
                        </td>
                      </tr>
                    );
                  }
                  // ACTIVIDAD
                  const c = fila.actividad;
                  // Compute PPC ratio: si cumplido, 100%; si no, 0%; si pendiente, --
                  const ppcRatio = c.cumplido === true ? 1 : c.cumplido === false ? 0 : null;
                  const ppcColor = ppcRatio === 1 ? BASE.lpsCompletado : ppcRatio === 0 ? BASE.lpsPendiente : BASE.lpsBloqueado;
                  const ppcText = ppcRatio === 1 ? '100%' : ppcRatio === 0 ? '0%' : '—';
                  // Si parcial (metradoEjecutado > 0 pero no cumplido), calcular
                  let ppcShow = ppcText;
                  if (c.metradoEjecutado != null && c.metradoComprometido > 0) {
                    const ratio = Math.min(1, c.metradoEjecutado / c.metradoComprometido);
                    ppcShow = `${Math.round(ratio * 100)}%`;
                  }
                  return (
                    <tr key={c.id} style={{ background: BASE.white, borderBottom: `1px solid ${BASE.borderSoft}` }}>
                      <td style={{ padding: '8px 8px', fontSize: '9px', fontWeight: '800', color: BASE.gold, fontFamily: 'monospace', textAlign: 'center' }}>
                        {c.cumplido === true ? '✓' : c.cumplido === false ? '✗' : '○'}
                      </td>
                      <td style={{ padding: '8px 14px 8px 28px', fontSize: '11px', color: BASE.text }}>
                        {c.actividad}
                      </td>
                      {dias.map((d, didx) => {
                        // Marcar día con color según estado del compromiso
                        const cfg = c.cumplido === true
                          ? { color: BASE.lpsS0, text: BASE.lpsS0Text, label: 'S0' }
                          : c.cumplido === false
                          ? { color: BASE.lpsS2, text: BASE.lpsS2Text, label: 'S2' }
                          : { color: 'transparent', text: 'transparent', label: '' };
                        return (
                          <td key={d.id} style={{
                            padding: '8px 0', textAlign: 'center',
                            borderLeft: `1px solid ${BASE.borderSoft}`,
                            background: cfg.color,
                            color: cfg.text,
                            fontSize: '10px', fontWeight: '900',
                          }}>
                            {cfg.label}
                          </td>
                        );
                      })}
                      {/* SI / NO / TIPO */}
                      <td style={{ padding: '8px 0', textAlign: 'center', borderLeft: `2px solid ${BASE.border}` }}>
                        {c.cumplido === true && <span style={{ color: BASE.greenDark, fontWeight: '900' }}>X</span>}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>
                        {c.cumplido === false && <span style={{ color: BASE.red, fontWeight: '900' }}>X</span>}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '9px', color: BASE.muted, fontWeight: '800' }}>
                        {c.rncCategoria ? RNC_LABELS[c.rncCategoria]?.slice(0, 4) : ''}
                      </td>
                      {/* PPC% */}
                      <td style={{
                        padding: '10px 8px', textAlign: 'center',
                        background: ppcColor,
                        color: BASE.text,
                        fontSize: '11px', fontWeight: '900',
                        borderLeft: `1px solid ${BASE.border}`,
                      }}>
                        {ppcShow}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen PPC */}
      {ppcSemanal !== null && (
        <div style={{
          background: BASE.white, borderRadius: '14px',
          border: `1px solid ${BASE.border}`, padding: '18px 22px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px',
        }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>PPC SEMANA {semanaActiva}</p>
            <p style={{ fontSize: '36px', fontWeight: '900', color: ppcSemanal >= 0.8 ? BASE.greenDark : ppcSemanal >= 0.65 ? BASE.gold : BASE.red, lineHeight: 1, marginTop: '4px' }}>
              {Math.round(ppcSemanal * 100)}%
            </p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
              {cumplidos} de {cerrados} compromisos
            </p>
          </div>
          <div style={{ borderLeft: `1px solid ${BASE.border}`, paddingLeft: '14px' }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>META BENCHMARK</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '8px' }}>≥ 80%</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>Lean Construction Institute</p>
          </div>
          <div style={{ borderLeft: `1px solid ${BASE.border}`, paddingLeft: '14px' }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>DIAGNÓSTICO</p>
            <p style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, marginTop: '8px', lineHeight: 1.4 }}>
              {ppcSemanal >= 0.85 ? '🌟 Excelente. Equipo Lean maduro.' :
               ppcSemanal >= 0.80 ? '✅ Cumple benchmark LCI.' :
               ppcSemanal >= 0.65 ? '⚠️ Margen de mejora.' :
               '🚨 Crítico — variabilidad alta.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
