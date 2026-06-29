// src/views/Ingeniero.jsx — V3 con Alertas, Ranking, CPI%, Costos HE
import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect, lazy, Suspense } from 'react';
import { db } from '../firebaseConfig';
import { doc, deleteDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CATALOGO_MASTER, INFO_MAP, FECHA_INICIO_PROYECTO } from '../utils/constants';
import { BASE, inp } from '../utils/styles';
import {
  calcCPI, fmtCPIPct, fmt1, fmtMoney, getEstado,
  getActivityOrder, buscarActividadCanonica, resolverIP,
  calcularHHPorSemana, calcularHHTotales, metradoEsHomogeneo,
  detectarAlertas, calcularCostosHEPorTrabajador,
  obtenerSemana,
  COSTO_HORA_DEFAULT,
} from '../utils/helpers';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/NotificationContext';
import { diagnosticarMigracionProyectoId, migrarProyectoId } from '../utils/migracionProyectoId';
import AlertasPanel from '../components/AlertasPanel';
import Tooltip from '../components/Tooltip';
import Icon from '../components/Icon';
import GateProyectoLegacy from '../components/GateProyectoLegacy';
import Auditoria from './Auditoria';
import SelectPremium from '../components/SelectPremium';
import DatePickerPremium from '../components/DatePickerPremium';
import CpiEac from './CpiEac';
import Graficos from './Graficos';
import Tendencias from './Tendencias';
import AnalisisHHCross from './AnalisisHHCross';
import PagoObreros from './PagoObreros';
import Tareo from './Tareo';
import Personal from './Personal';
import ImpactoTesis from './ImpactoTesis';
// VDC/LAP, Programación Diaria (PlanDiario), Curva S y Tablero LPS se movieron a la
// app independiente PLANEAMIENTO_PLATAFORMA (2026-06-24). CPI/EAC (el ISP) volvió a
// vivir COMPLETAMENTE en Producción/GRAPCO (2026-06-25, decisión del usuario).
import ControlGerencial from './ControlGerencial';
import CockpitEjecutivo from './CockpitEjecutivo';
// BIM (visor 3D + vendor-charts) cargado SOLO al abrir la pestaña, no dentro del chunk de Ingeniero.
const BIM = lazy(() => import('./BIM'));
import EditorWbsIsp from './modulos/wbsEditor/EditorWbsIsp';
import { useCatalogoWBS } from '../hooks/useCatalogoWBS';
import { ALIAS_ACTIVIDADES } from '../data/aliasesActividades';
import { normActividad } from '../utils/normalizacion'; // idioma común (cruce tareo↔catálogo)
import { crearResolverNombre } from '../utils/nombresCanonicos'; // nombres canónicos (filtro por persona)

// Semana del proyecto (LPS) correspondiente a HOY. Semana 1 = lunes de
// FECHA_INICIO_PROYECTO. Sirve para que el dashboard arranque en la semana en curso.
const semanaActualProyecto = () => {
  try {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const n = obtenerSemana(iso, FECHA_INICIO_PROYECTO);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch { return null; }
};

export default function Ingeniero({ historial, cuadrillasActivas, cuadrillasDB, personalDB, planesDiarios, configuracion, asistencia, isMobile, showToast, vistaInicial, soloPlaneamiento }) {
  const [view, setView] = useState(vistaInicial || 'auditoria');
  const [grupoActivo, setGrupoActivo] = useState(soloPlaneamiento ? 'planificacion' : 'produccion');
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [fPartida,    setFPartida]    = useState('');
  const [fSubpartida, setFSubpartida] = useState('');
  const [fActividad,  setFActividad]  = useState('');
  // Por defecto el dashboard muestra la SEMANA ACTUAL del proyecto (no "todas"):
  // el ingeniero entra y ve directamente la semana en curso. Cambiable con el filtro.
  const [fSemana,     setFSemana]     = useState(() => { const n = semanaActualProyecto(); return n ? String(n) : ''; });
  const [fDesde,      setFDesde]      = useState('');
  const [fHasta,      setFHasta]      = useState('');
  const [fCapataz,    setFCapataz]    = useState('');
  const [fPersona,    setFPersona]    = useState('');
  const [modoAcum,    setModoAcum]    = useState(false);

  // Defaults por vista: AUDITORÍA arranca en la SEMANA ACTUAL; el resto del ISP
  // (CPI+EAC, Gráficos, Tendencias, Control, Cockpit) arranca en ACUMULADO (todas las semanas).
  useEffect(() => {
    if (view === 'auditoria') {
      const n = semanaActualProyecto();
      setFSemana(n ? String(n) : '');
      setModoAcum(false);
    } else if (['analisis', 'graficos', 'tendencias', 'control', 'cockpit'].includes(view)) {
      setFSemana('');
      setModoAcum(true);
    }
  }, [view]);

  // Mapeo vista → grupo (para auto-seleccionar grupo si llega por deep-link)
  const VIEW_TO_GRUPO = {
    cockpit: 'ejecutivo',
    auditoria: 'produccion', analisis: 'produccion', control: 'produccion',
    graficos: 'produccion', tendencias: 'produccion',
    hhcross: 'gestion', // Cuadrillas vive ahora en GESTIÓN (2026-06-26)
    tareo: 'gestion', gestion: 'gestion',
    'pago-obreros': 'gestion',
    'wbs-editor': 'gestion',
    'export': 'gestion',
    impacto: null, // Vista TESIS: accesible via botón global en el topbar (no en tabs).
  };

  const handleSetView = (newView) => {
    setView(newView);
    const g = VIEW_TO_GRUPO[newView];
    if (g) setGrupoActivo(g);
  };

  // Listener para botón TESIS en el header global: cambia a la vista de Impacto Tesis
  useEffect(() => {
    // Si el flag fue puesto antes de que Ingeniero estuviese montado, lo consumimos al inicio
    try {
      if (sessionStorage.getItem('grapco_nav_tesis') === '1') {
        sessionStorage.removeItem('grapco_nav_tesis');
        setView('impacto');
      }
    } catch (e) {}
    const onGoTesis = () => setView('impacto');
    window.addEventListener('grapco:nav-tesis', onGoTesis);
    return () => window.removeEventListener('grapco:nav-tesis', onGoTesis);
  }, []);

  const confirmar = useConfirm();
  const eliminar = async r => {
    const ok = await confirmar({
      tono: 'peligro', icono: '🗑️',
      titulo: '¿Eliminar registro?',
      mensaje: `${r.fecha} · ${r.actividad}`,
      detalle: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'Registros_Campo', r.id));
      showToast('Registro eliminado', 'info');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Guarda el metrado de UN registro (desde el modal "Metrar" de Auditoría).
  // Acepta valor directo o el resultado de una planilla de cómputo (PlanillaMetrado):
  // persiste el total y, si vino de un formato, también su sustento (tipo/detalle/meta)
  // para poder re-editarlo. El IP Real y el CPI se recalculan solos (metrado vivo).
  const guardarMetrado = async (r, payload) => {
    if (!r?.id) return;
    try {
      const data = {
        // El ingeniero VALIDA el metrado sin pisar el del capataz (metrado/metradoReportado intactos).
        metradoValidado: Number(payload.metrado) || 0,
        // Sustento de la planilla (o limpio si fue valor directo)
        tipoMetrado: payload.tipoMetrado || null,
        detalleMetrado: Array.isArray(payload.detalleMetrado) ? payload.detalleMetrado : [],
        metaMetrado: payload.metaMetrado || {},
        metradoActualizadoEn: serverTimestamp(),
        metradoActualizadoPor: user?.email || 'desconocido',
      };
      if (payload.unidad) data.unidad = payload.unidad;   // el formato define la unidad
      await updateDoc(doc(db, 'Registros_Campo', r.id), data);
      showToast('Metrado actualizado ✓', 'success');
    } catch (err) {
      console.error('[guardarMetrado]', err);
      showToast(`Error al guardar metrado: ${err.message}`, 'error');
    }
  };

  // Mapa de costos custom por cargo: parte de los defaults y aplica
  // las tarifas personalizadas guardadas en Configuracion/global
  const costosCustomMap = useMemo(() => {
    const map = { ...COSTO_HORA_DEFAULT };
    const tarifasFB = configuracion?.tarifas || {};
    Object.entries(tarifasFB).forEach(([cargo, valor]) => {
      const num = parseFloat(valor);
      if (!isNaN(num) && num > 0) map[cargo] = num;
    });
    return map;
  }, [configuracion]);

  // AISLAMIENTO MULTI-PROYECTO (pedido del usuario 12/06/2026): cada proyecto
  // ve SOLO su información. El ingeniero ve los registros del PROYECTO ACTIVO
  // (el selector de frente sigue permitiendo "todos los frentes"). Un proyecto
  // nuevo (ej. TEXTIL) arranca en blanco; CREDITEX se ve solo al activarlo.
  const { filtrarPorContexto, proyectoActivoId, frenteActivoId, modoTodosFrentes, FRENTE_DEFAULT_ID } = useProyectoActivo();
  // HONRA el frente: con "Todos los frentes" es toda la obra; al elegir F1 (PTARI) o
  // F2 (NAVE) el CPI / ISP semanal / análisis se recalculan para ese frente.
  const historialProyecto = useMemo(
    () => filtrarPorContexto(historial || [], {}),
    [historial, filtrarPorContexto],
  );

  // Catálogo WBS editable del proyecto (cae al catálogo fijo si no hay uno propio).
  const { arbol: arbolWbs, catalogoMaster: catWbs, infoMap: infoWbs } = useCatalogoWBS(proyectoActivoId);

  // Actualiza los flags (terminada / saldoOverride) de UNA actividad en el
  // árbol del catálogo y persiste en Catalogo_WBS/{proyectoId}. Se usa desde el
  // CPI para que el ingeniero marque actividades terminadas o defina un saldo
  // manual cuando el metrado actual sobrepasó al contractual.
  const actualizarFlagsActividad = useCallback(async (partidaNom, subpartidaNom, actividadNom, flags) => {
    if (!proyectoActivoId) { showToast?.('Sin proyecto activo', 'warning'); return; }
    const norm = (s) => (s || '').toString().toUpperCase().trim();
    const pT = norm(partidaNom), sT = norm(subpartidaNom), aT = norm(actividadNom);
    const nuevo = (arbolWbs || []).map(p => norm(p.nombre) !== pT ? p : ({
      ...p,
      subpartidas: (p.subpartidas || []).map(s => norm(s.nombre) !== sT ? s : ({
        ...s,
        actividades: (s.actividades || []).map(a => norm(a.nombre) !== aT ? a : ({
          ...a,
          ...(flags || {}),
        })),
      })),
    }));
    try {
      await setDoc(doc(db, 'Catalogo_WBS', proyectoActivoId), {
        proyectoId: proyectoActivoId,
        arbol: nuevo,
        actualizadoEn: serverTimestamp(),
      });
      showToast?.('Ajustes de la actividad guardados ✓', 'success');
    } catch (e) {
      console.error('[actualizarFlagsActividad]', e);
      showToast?.('Error al guardar: ' + e.message, 'error');
    }
  }, [arbolWbs, proyectoActivoId, showToast]);

  // ── Auto-migración silenciosa para admin: re-asigna proyectoId a Registros_Campo huérfanos
  // usando el mapa nombre→proyectoIdAsignado de /Usuarios. Idempotente y se ejecuta una vez por sesión.
  const { rol: rolUsuario, user } = useAuth();
  const autoMigradoRef = useRef(false);
  useEffect(() => {
    if (rolUsuario !== 'admin') return;
    if (autoMigradoRef.current) return;
    autoMigradoRef.current = true;
    (async () => {
      try {
        const diag = await diagnosticarMigracionProyectoId();
        if ((diag?.registrosCampo?.sinProyecto || 0) === 0) return;
        const frenteId = modoTodosFrentes ? FRENTE_DEFAULT_ID : (frenteActivoId || FRENTE_DEFAULT_ID);
        const res = await migrarProyectoId(proyectoActivoId, undefined, frenteId);
        if (res?.registrosCampo > 0) {
          showToast?.(`✓ Auto-migrados ${res.registrosCampo} registros huérfanos a su proyecto correcto`, 'success');
        }
      } catch (e) {
        console.warn('[auto-migrate registros]', e);
      }
    })();
  }, [rolUsuario, proyectoActivoId, frenteActivoId, modoTodosFrentes, FRENTE_DEFAULT_ID, showToast]);

  // ── Enriquecer historial ──
  const historialEnriquecido = useMemo(() => {
    const base = (historialProyecto || []).map(r => {
      if (!r) return r;
      // Recalcular semana desde fecha (corrige registros antiguos guardados con bug TZ)
      const semanaRecalc = r.fecha ? obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO) : r.semana;
      const txt = (r.actividad || '').trim();
      const canonica = buscarActividadCanonica(txt);
      if (canonica) {
        return {
          ...r,
          semana: semanaRecalc,
          _actividadCanonica: canonica.actividad,
          _partidaCanonica: canonica.partida,
          _subpartidaCanonica: canonica.subpartida,
          _matched: true,
          _matchScore: canonica.score,
        };
      }
      return { ...r, semana: semanaRecalc, _actividadCanonica: txt, _matched: false };
    });
    // Índice IP del catálogo WBS editable, normalizado para cruce tolerante.
    // El catálogo es la ÚNICA fuente de verdad del IP Meta y el IP contractual.
    const catIP = {};
    Object.keys(infoWbs || {}).forEach(k => {
      const info = infoWbs[k] || {};
      catIP[normActividad(k)] = { ipM: info.ipM || 0, ipP: info.ipP || 0 };
    });
    return base.map(r => {
      if (!r) return r;
      const ipDatos = resolverIP(r, base);
      // El catálogo WBS manda: si la actividad existe ahí con IP Meta / IP
      // contractual, esos valores priman sobre el respaldo de resolverIP.
      // Así "META Act. HH", CPI, gráficos y cockpit usan el mismo IP en todos lados.
      const cat = catIP[normActividad(r._actividadCanonica || r.actividad)];
      const ipMcat = cat && cat.ipM ? cat.ipM : null;
      const ipPcat = cat && cat.ipP ? cat.ipP : null;
      return {
        ...r,
        _ipMeta:   ipMcat || ipDatos.ipM,
        _ipPpto:   ipPcat || ipDatos.ipP,
        _ipReal:   ipDatos.ipReal,
        _ipFuente: (ipMcat || ipPcat) ? 'catalogo' : ipDatos.fuente,
      };
    });
  }, [historialProyecto, infoWbs]);

  // Resolver de nombres canónicos: el MISMO obrero escrito distinto cuenta como
  // UNA sola persona (mismo criterio que el Tareo) para el filtro por persona.
  const resolverNombre = useMemo(
    () => crearResolverNombre(historial || [], personalDB || []),
    [historial, personalDB],
  );

  // Filtrados — orden DESCENDENTE
  const filtrados = useMemo(() => {
    const res = historialEnriquecido.filter(r => {
      const actCanon  = r._actividadCanonica || r.actividad;
      const partCanon = (r._partidaCanonica || r.partida || '').toUpperCase();
      // Sin subpartida ⇒ se asume subpartida = partida (mismo criterio que la
      // agregación WBS, l.410). Así las actividades sueltas bajo una partida
      // (p.ej. COLOCADO/HABILITADO DE ACERO) quedan bajo la subpartida «ACERO»
      // y se pueden filtrar; antes daban 0 registros al elegir esa subpartida.
      const subCanon  = (r._subpartidaCanonica || r.subpartida || '').toUpperCase() || partCanon;
      const mA  = fActividad  ? actCanon === fActividad                  : true;
      const mP  = fPartida    ? partCanon === fPartida.toUpperCase()     : true;
      const mSP = fSubpartida ? subCanon === fSubpartida.toUpperCase()   : true;
      const mC  = fCapataz    ? r.capataz === fCapataz                   : true;
      const mPer= fPersona    ? (r.detalleTareo || []).some(t => t?.nombre && resolverNombre(t.nombre) === fPersona) : true;
      const mD  = fDesde      ? r.fecha >= fDesde                        : true;
      const mH  = fHasta      ? r.fecha <= fHasta                        : true;
      let   mS  = true;
      if (fSemana) mS = modoAcum ? r.semana <= parseInt(fSemana) : r.semana === parseInt(fSemana);
      return mP && mSP && mA && mS && mC && mPer && mD && mH;
    });
    res.sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
      return getActivityOrder(a._actividadCanonica || a.actividad) -
             getActivityOrder(b._actividadCanonica || b.actividad);
    });
    return res;
  }, [historialEnriquecido, fPartida, fSubpartida, fActividad, fSemana, fCapataz, fPersona, fDesde, fHasta, modoAcum, resolverNombre]);

  const filtroAlcanceActivo = !!(fPartida || fSubpartida || fActividad);
  const metradoSumable = useMemo(() => metradoEsHomogeneo(filtrados, filtroAlcanceActivo), [filtrados, filtroAlcanceActivo]);

  // ── Alertas inteligentes (sobre TODO el historial, no filtrado, para no perder contexto) ──
  const alertas = useMemo(() => detectarAlertas(historialEnriquecido), [historialEnriquecido]);

  // ── Semanas disponibles para el filtro (derivadas de la data + baseline 24) ──
  const semanasFiltro = useMemo(() => {
    const set = new Set();
    (historialEnriquecido || []).forEach(r => {
      const s = parseInt(r.semana);
      if (Number.isFinite(s) && s > 0) set.add(s);
    });
    // Incluye SIEMPRE la semana actual del proyecto, aunque aún no tenga registros
    // (el filtro arranca en ella por defecto, así que debe existir como opción).
    const actual = semanaActualProyecto() || 0;
    const max = Math.max(24, actual, ...(set.size ? Array.from(set) : [0]));
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [historialEnriquecido]);

  // ── Personas disponibles para el filtro (nombres canónicos del tareo) ──
  const personasFiltro = useMemo(() => {
    const set = new Set();
    (historialEnriquecido || []).forEach(r => {
      (r.detalleTareo || []).forEach(t => {
        if (t?.nombre) set.add(resolverNombre(t.nombre));
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [historialEnriquecido, resolverNombre]);

  // WBS
  const wbs = useMemo(() => {
    // Normalización para cruzar registros con el catálogo de forma tolerante:
    // ignora mayúsc/minúsc, espacios dobles, puntos finales y —en actividades—
    // los sufijos de frente «(F1-PTARI)», «(F2 - NAVE)», «(DECANTADOR)» etc.,
    // porque "PLACAS A DOBLE CARA" y "PLACAS A DOBLE CARA (F1-PTARI)" son lo mismo.
    const normTxt = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
      .replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
    const normAct = normActividad; // idioma común (mismo criterio que el cruce CPI/cronograma)

    const j = {};
    const idxP = {};   // normTxt(partida) -> pk
    const idxS = {};   // pk -> { normTxt(sub) -> sk }
    const idxA = {};   // pk|sk -> { normAct(act) -> aTrim }
    const idxAP = {};  // pk -> { normAct(act) -> { sk, aTrim } }  (toda la partida)
    const idxGA = {};  // normAct(actividad) -> { pk, sk, aTrim }  (índice global)
    Object.keys(catWbs).forEach(p => {
      const pk = p.toUpperCase().trim();
      j[pk] = { hhR:0, hhM:0, hhP:0, subs:{} };
      idxP[normTxt(p)] = pk;
      idxS[pk] = {};
      idxAP[pk] = {};
      Object.keys(catWbs[p]).forEach(sp => {
        const sk = sp.toUpperCase().trim();
        j[pk].subs[sk] = { hhR:0, hhM:0, hhP:0, acts:{} };
        idxS[pk][normTxt(sp)] = sk;
        const aKey = pk + '|' + sk;
        idxA[aKey] = {};
        catWbs[p][sp].forEach(a => {
          const aTrim = a.trim();
          const ad = infoWbs[aTrim.toUpperCase()] || {};
          j[pk].subs[sk].acts[aTrim] = {
            hhR:0, hhM:0, hhP:0, met:0,
            metP: ad.metP || 0,
            _info: { ipM: ad.ipM || null, ipP: ad.ipP || null, metP: ad.metP || 0, un: ad.un || 'UND' },
          };
          idxA[aKey][normAct(a)] = aTrim;
          if (!idxAP[pk][normAct(a)]) idxAP[pk][normAct(a)] = { sk, aTrim };
          idxGA[normAct(a)] = { pk, sk, aTrim };
        });
      });
    });
    filtrados.forEach(r => {
      const p  = (r._partidaCanonica    || r.partida    || '').toUpperCase().trim();
      let   sp = (r._subpartidaCanonica || r.subpartida || '').toUpperCase().trim();
      const a  = (r._actividadCanonica  || r.actividad  || '').trim();
      // Resolución tolerante: exacto -> normalizado.
      let jp, js, act;
      const pk = j[p] ? p : idxP[normTxt(p)];
      if (pk && j[pk]) {
        jp = j[pk];
        // Si el registro no trae subpartida, se asume que la subpartida es la
        // propia partida: el catálogo crea una subpartida = nombre de la partida
        // para las partidas con actividades directas (p.ej. OTROS → MAESTRO).
        if (!sp) sp = pk;
        const sk = jp.subs[sp] ? sp : (idxS[pk] && idxS[pk][normTxt(sp)]);
        if (sk && jp.subs[sk]) {
          js = jp.subs[sk];
          const ak = js.acts[a] ? a : (idxA[pk + '|' + sk] && idxA[pk + '|' + sk][normAct(a)]);
          if (ak) act = js.acts[ak];
        }
        // Fallback: la actividad existe en la partida pero en otra subpartida
        // (o la subpartida del registro no coincide). Se busca en toda la partida.
        if (!act && idxAP[pk]) {
          const hit = idxAP[pk][normAct(a)];
          if (hit && jp.subs[hit.sk]) { js = jp.subs[hit.sk]; act = js.acts[hit.aTrim]; }
        }
      }
      // Si no resolvió: ALIAS — nombre que escribió la obra -> actividad real del catálogo.
      if (!act) {
        const destino = ALIAS_ACTIVIDADES[normAct(a)];
        const g = destino && idxGA[normAct(destino)];
        if (g) { jp = j[g.pk]; js = jp.subs[g.sk]; act = js.acts[g.aTrim]; }
      }
      if (act && jp && js) {
        // CPI/ISP gobierna con el metrado VALIDADO (OT); fallback a reportado/legacy.
        const met = Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0, hR = parseFloat(r.totalHH) || 0;
        // El IP de META y de PRESUPUESTO se toman del catálogo WBS editable
        // (lo que se definió en "Modificar WBS" → ipMeta / IP contractual).
        // El _ipMeta/_ipPpto del registro es solo respaldo cuando la actividad
        // no está en el catálogo. Así "META Act. HH" = metrado × IP Meta real.
        const ipM = act._info.ipM || r._ipMeta;
        const ipP = act._info.ipP || r._ipPpto;
        const hM = (ipM && met > 0) ? met * ipM : 0;
        const hP = (ipP && met > 0) ? met * ipP : 0;
        jp.hhR += hR; jp.hhM += hM; jp.hhP += hP;
        js.hhR += hR; js.hhM += hM; js.hhP += hP;
        act.hhR += hR; act.hhM += hM; act.hhP += hP; act.met += met;
        if (!act._info.ipM && ipM) act._info.ipM = ipM;
        if (!act._info.ipP && ipP) act._info.ipP = ipP;
        if (!act._info.un  && r.unidad) act._info.un = r.unidad;
      }
    });
    return j;
  }, [filtrados, catWbs, infoWbs]);

  const hhPorSemana = useMemo(() => calcularHHPorSemana(filtrados), [filtrados]);
  const hhTotales   = useMemo(() => calcularHHTotales(filtrados),   [filtrados]);

  const stats = useMemo(() => {
    if (!filtrados.length) return { ipAvg:'-', met:0, ef:0, un:'', varHH:0, cpi:null };
    let tM = 0, tH = 0, tHM = 0, tHP = 0, sumUn = '';
    filtrados.forEach(r => {
      const met = Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0;
      const hh = parseFloat(r.totalHH) || 0;
      tM += met; tH += hh;
      if (r._ipMeta && met > 0) tHM += met * r._ipMeta;
      if (r._ipPpto && met > 0) tHP += met * r._ipPpto;
      if (!sumUn && r.unidad) sumUn = r.unidad;
    });
    return {
      ipAvg: tM > 0 ? (tH / tM).toFixed(3) : '0.000',
      met: tM.toFixed(1),
      ef: tHM > 0 ? Math.round((tHM / tH) * 100) : 0,
      un: sumUn || 'UND',
      varHH: (tHP - tH).toFixed(1),
      cpi: calcCPI(tHM, tH),
    };
  }, [filtrados]);

  const grafData = useMemo(() => {
    const bySem = {};
    filtrados.forEach(r => {
      const s = r.semana;
      if (!bySem[s]) bySem[s] = { semana:s, hhR:0, hhM:0, hhP:0, met:0 };
      const met = Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0;
      bySem[s].hhR += parseFloat(r.totalHH) || 0;
      bySem[s].met += met;
      if (r._ipMeta && met > 0) bySem[s].hhM += met * r._ipMeta;
      if (r._ipPpto && met > 0) bySem[s].hhP += met * r._ipPpto;
    });
    const semanas = Object.values(bySem).sort((a,b)=>a.semana-b.semana).map(s => ({
      semana: `S${s.semana}`,
      'IP Real': s.met > 0 ? parseFloat((s.hhR / s.met).toFixed(3)) : 0,
      'HH Real': parseFloat(s.hhR.toFixed(1)),
      'HH Meta': parseFloat(s.hhM.toFixed(1)),
      'HH Ppto': parseFloat(s.hhP.toFixed(1)),
      CPI: s.hhR > 0 ? parseFloat((s.hhM / s.hhR).toFixed(2)) : 1,
    }));
    let aR = 0, aM = 0, aP = 0;
    const acumulado = semanas.map(s => {
      aR += s['HH Real']; aM += s['HH Meta']; aP += s['HH Ppto'];
      return {
        semana: s.semana,
        'HH Real Acum': parseFloat(aR.toFixed(1)),
        'HH Meta Acum': parseFloat(aM.toFixed(1)),
        'HH Ppto Acum': parseFloat(aP.toFixed(1)),
        'CPI Acum': aR > 0 ? parseFloat((aM / aR).toFixed(2)) : 1,
        'CPI Ppto': aR > 0 ? parseFloat((aP / aR).toFixed(2)) : 1,
      };
    });
    const porPartida = Object.keys(wbs).map(p => ({
      partida: p.length > 18 ? p.slice(0, 16) + '…' : p,
      'HH Real': parseFloat(wbs[p].hhR.toFixed(1)),
      'HH Meta': parseFloat(wbs[p].hhM.toFixed(1)),
      'HH Ppto': parseFloat(wbs[p].hhP.toFixed(1)),
    })).filter(d => d['HH Real'] > 0);
    return { semanas, acumulado, porPartida };
  }, [filtrados, wbs]);

  // ── Exportación: Valorización con costos HE ──
  const handleExportValorizacion = async () => {
    if (!filtrados.length) return showToast('Sin datos para exportar', 'warning');
    try {
      const { exportarValorizacion } = await import('../utils/excelExport');
      const periodo = (fDesde || fHasta) ? `${fDesde || '...'} al ${fHasta || '...'}`
                    : fSemana ? `Semana ${fSemana}${modoAcum ? ' (acumulado)' : ''}`
                    : 'Todo el proyecto';
      // Calcular costos HE para incluir como hoja extra
      const costosHE = calcularCostosHEPorTrabajador(filtrados, costosCustomMap);
      const fname = exportarValorizacion({
        wbs, periodo,
        semana: fSemana ? `Sem${fSemana}` : null,
        costosHE,
        costosCustomMap,
      });
      showToast(`✅ ${fname} (incluye hoja Costos HE)`, 'success');
    } catch (e) {
      console.error(e);
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleExportHH = async () => {
    if (!hhPorSemana.length) return showToast('Sin datos de HH', 'warning');
    try {
      const { exportarHHSemanal } = await import('../utils/excelExport');
      const fname = exportarHHSemanal(hhPorSemana, hhTotales, filtrados.length);
      showToast(`✅ ${fname} exportado`, 'success');
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleExportCostosHE = async () => {
    if (!filtrados.length) return showToast('Sin datos para exportar', 'warning');
    try {
      const { exportarCostosHE } = await import('../utils/excelExport');
      const periodo = (fDesde || fHasta) ? `${fDesde || '...'} al ${fHasta || '...'}`
                    : fSemana ? `Semana ${fSemana}${modoAcum ? ' (acumulado)' : ''}`
                    : 'Todo el proyecto';
      const costosHE = calcularCostosHEPorTrabajador(filtrados, costosCustomMap);
      if (costosHE.length === 0) return showToast('Sin trabajadores con HH para reporte', 'warning');
      const fname = exportarCostosHE(costosHE, periodo, costosCustomMap);
      showToast(`✅ ${fname} exportado`, 'success');
    } catch (e) {
      console.error(e);
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  // ── Costos en soles (real vs meta) ──
  const costos = useMemo(() => {
    // Costo REAL: agrupado por TRABAJADOR-DÍA antes del split HE 60/100 (helper
    // canónico). Antes se aplicaba el split por fila → si un obrero estaba en varias
    // actividades el mismo día, cada fila recontaba las "primeras 2h al 60%".
    const costoReal = calcularCostosHEPorTrabajador(filtrados, costosCustomMap)
      .reduce((s, w) => s + (w.costoTotal || 0), 0);
    // Costo META: HH meta × tarifa promedio (mismo mix de cargos asumido).
    const tarifaPromedio = Object.values(costosCustomMap).reduce((s, v) => s + v, 0) /
      Math.max(1, Object.keys(costosCustomMap).length);
    let costoMeta = 0;
    (filtrados || []).forEach(r => {
      if (!r) return;
      costoMeta += (Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0) * (r._ipMeta || 0) * tarifaPromedio;
    });
    return {
      real: costoReal,
      meta: costoMeta,
      diferencia: costoReal - costoMeta,  // + = sobrecosto, - = ahorro
    };
  }, [filtrados, costosCustomMap]);

  // KPIs
  const kpis = [
    { l:'IP PROMEDIO',     v: stats.ipAvg,                        c: BASE.text },
    metradoSumable && { l:'METRADO TOTAL',  v:`${stats.met} ${stats.un}`, c: BASE.text },
    { l:'EFICIENCIA META', v:`${stats.ef}%`,                      c: stats.ef >= 100 ? BASE.green : '#dc2626' },
    { l:'AHORRO/PÉRDIDA',  v:`${stats.varHH} HH`,                 c: parseFloat(stats.varHH) >= 0 ? BASE.green : '#dc2626' },
    { l:'CPI GLOBAL',      v: fmtCPIPct(stats.cpi),               c: getEstado(stats.cpi).color },
    { l:'COSTO REAL',      v: fmtMoney(costos.real),              c: BASE.navy, sub: 'HN + HE 60/100' },
    { l:'SOBRECOSTO S/',   v: fmtMoney(costos.diferencia),        c: costos.diferencia <= 0 ? BASE.green : '#dc2626', sub: costos.diferencia <= 0 ? 'Ahorro vs meta' : 'Exceso vs meta' },
    { l:'HH REAL',         v: fmt1(hhTotales.total),              c: BASE.navy,  sub: `${fmt1(hhTotales.hn)} HN + ${fmt1(hhTotales.he)} HE` },
    hhPorSemana.length > 0 && { l:'HH/SEMANA', v: fmt1(hhTotales.total / hhPorSemana.length), c: '#7c3aed', sub: `${hhPorSemana.length} sem.` },
  ].filter(Boolean);

  // ── Configuración de grupos de navegación ──
  const GRUPOS = {
    ejecutivo: {
      label: 'EJECUTIVO',
      iconName: 'target',
      color: BASE.gold,
      tagline: 'Estado de obra en soles · para directorio',
      items: [
        { id: 'cockpit', l: 'Cockpit Ejecutivo', iconName: 'target' },
      ],
    },
    produccion: {
      label: 'CONTROL CPI',
      iconName: 'barChart3',
      color: BASE.navy,
      tagline: 'Control de productividad/costo: Auditoría, CPI + EAC (ISP), Control Gerencial, Gráficos y Tendencias',
      items: [
        { id: 'auditoria',  l: 'Auditoría',         iconName: 'registro' },
        { id: 'analisis',   l: 'CPI + EAC',         iconName: 'chartBars' },
        { id: 'control',    l: 'Control Gerencial', iconName: 'fileText' },
        { id: 'graficos',   l: 'Gráficos',          iconName: 'barChart3' },
        { id: 'tendencias', l: 'Tendencias',        iconName: 'pulse' },
      ],
    },
    // Grupo PLANEAMIENTO (Last Planner System / VDC) → app PLANEAMIENTO_PLATAFORMA (2026-06-24).
    // Grupo «BIM Y CUADRILLAS» eliminado (2026-06-26): «Modelo BIM» ya es módulo propio del
    // menú lateral (Producción → Modelo BIM, no se duplica) y «Cuadrillas» se movió a GESTIÓN.
    gestion: {
      label: 'GESTIÓN',
      iconName: 'users',
      color: '#7c3aed',
      tagline: 'Tareo, cuadrillas, pagos, personal, WBS y exportaciones — todo bajo los mismos filtros del dashboard',
      // Orden con lógica de análisis: capturar HH (Tareo) → analizarlas (Cuadrillas) →
      // pagarlas (Pago) → maestro de personas (Personal) → estructura (WBS) → salida (Export).
      items: [
        { id: 'tareo',        l: 'Tareo',          iconName: 'clock', desc: 'Planilla F13 · HH por trabajador y exportación' },
        { id: 'hhcross',      l: 'Cuadrillas',     iconName: 'users', desc: 'HH cruzadas: cuadrilla · persona · actividad · día' },
        { id: 'pago-obreros', l: 'Pago a Obreros', iconName: 'coins', desc: 'Costo a pagar: HN + HE 60% / 100%' },
        { id: 'gestion',      l: 'Personal',       iconName: 'users', desc: 'Maestro de obreros y cuadrillas' },
        { id: 'wbs-editor',   l: 'Editar WBS',     iconName: 'ruler', desc: 'Estructura WBS · IP meta y presupuesto' },
        { id: 'export',       l: 'Exportar Excel', iconName: 'coins', desc: 'Excel: Costos HE 60/100 y HH semanal' },
      ],
    },
  };

  const grupoCfg = GRUPOS[grupoActivo] || GRUPOS.produccion;
  const tieneFiltrosActivos = !!(fPartida || fSubpartida || fActividad || fSemana || fDesde || fHasta || fCapataz || fPersona);
  const cpiEstado = getEstado(stats.cpi);
  const totalAlertas = (alertas || []).length;

  // Contenedor de scroll ÚNICO (vertical + horizontal) que llena la pantalla bajo el navbar.
  // Es la clave para que el encabezado de las tablas se quede fijo arriba al bajar: al haber
  // un solo contenedor de scroll, al scrollear se van los controles y el encabezado (sticky)
  // se ancla a este contenedor; la columna WBS se ancla a la izquierda y la barra de scroll
  // horizontal queda fija abajo (siempre visible). Mido la posición para llenar el alto exacto.
  const shellRef = useRef(null);
  const [shellH, setShellH] = useState('calc(100dvh - 130px)');
  useLayoutEffect(() => {
    const calc = () => {
      const el = shellRef.current;
      if (!el) return;
      const absTop = el.getBoundingClientRect().top + window.scrollY; // tope del contenedor
      setShellH(`${Math.max(360, Math.round(window.innerHeight - absTop - 8))}px`);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [soloPlaneamiento]);

  // Solo las vistas de TABLA usan el contenedor de scroll acotado (encabezado fijo + barra
  // horizontal abajo). Las demás vistas se comportan normal (scroll de página) para no alterarlas.
  const vistaTabla = view === 'analisis' || view === 'auditoria' || view === 'control';

  // Cluster de comando (CPI/EF + botones Filtros/Resumen). Se reutiliza: va a la
  // derecha de la fila de sub-tabs (espacio vacío) y, si el grupo tiene un único
  // módulo (sin sub-tabs), cae a una barra suelta propia para no perderlo.
  const comandoControles = (
    <>
      {/* KPI cluster: CPI · EF — segmentos pulidos, no chip de color */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        background: BASE.bgSoft,
        border: `1px solid ${BASE.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <Tooltip texto="CPI = Earned Value / Actual Cost. Mide eficiencia de costo. ≥1.0 = bajo presupuesto, <1.0 = sobrecostó la obra." variant="info">
          <div style={{
            padding: '6px 14px',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '7px',
            borderRight: `1px solid ${BASE.border}`,
          }}>
            <span style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.7px' }}>CPI</span>
            <span style={{
              fontSize: '15px', fontWeight: '900', color: cpiEstado.color,
              fontFamily: 'var(--grapco-font-mono, monospace)',
            }}>{fmtCPIPct(stats.cpi)}</span>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: cpiEstado.color, alignSelf: 'center',
              boxShadow: `0 0 0 2px ${cpiEstado.color}33`,
            }}/>
          </div>
        </Tooltip>
        <Tooltip texto="Eficiencia operativa: HH planificadas vs HH reales ejecutadas. ≥100% indica que se cumplió o superó la meta." variant="info">
          <div style={{
            padding: '6px 14px',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '7px',
          }}>
            <span style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.7px' }}>EF</span>
            <span style={{
              fontSize: '15px', fontWeight: '900',
              color: stats.ef >= 100 ? BASE.green : '#d97706',
              fontFamily: 'var(--grapco-font-mono, monospace)',
            }}>{stats.ef}%</span>
          </div>
        </Tooltip>
      </div>

      {/* Botones colapsables — refinados con SVG icons y altura uniforme 32px */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { open: filtrosAbiertos, setOpen: setFiltrosAbiertos, icon: 'filter',    label: 'Filtros',  active: tieneFiltrosActivos, activeBg: BASE.gold },
          { open: resumenAbierto,  setOpen: setResumenAbierto,  icon: 'barChart3', label: 'Resumen' },
        ].map((b) => (
          <button
            key={b.label}
            onClick={() => b.setOpen(!b.open)}
            style={{
              height: '32px',
              padding: '0 12px',
              background: b.open ? BASE.navy : (b.active ? `${b.activeBg}15` : BASE.white),
              color: b.open ? '#fff' : (b.active ? b.activeBg : BASE.navy),
              border: `1px solid ${b.open ? BASE.navy : (b.active ? b.activeBg : BASE.border)}`,
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
              letterSpacing: '0.2px',
            }}>
            <Icon name={b.icon} size={13} color={b.open ? '#fff' : (b.active ? b.activeBg : BASE.muted)} strokeWidth={2} />
            {b.label}
            {b.active && !b.open && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: b.activeBg }}/>}
            {b.badge != null && (
              <span style={{
                background: b.open ? 'rgba(255,255,255,0.2)' : `${BASE.gold}25`,
                color: b.open ? '#fff' : BASE.goldDark,
                padding: '1px 7px', borderRadius: '999px',
                fontSize: '9.5px', fontWeight: '900',
                fontFamily: 'var(--grapco-font-mono, monospace)',
              }}>{b.badge}</span>
            )}
            <span style={{ marginLeft: '2px', opacity: 0.55, fontSize: '9px' }}>{b.open ? '▴' : '▾'}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div ref={shellRef} style={vistaTabla ? { height: shellH, overflow: 'auto', overscrollBehavior: 'contain' } : undefined}>
      {/* === NAVEGACIÓN POR GRUPOS (Nivel 1) — tabs limpios estilo SaaS premium ===
          En modo standalone (soloPlaneamiento) se oculta: el módulo vive en el
          menú lateral, sin tabs. En modo normal se excluye 'planificacion'
          (ahora es módulo lateral propio, no pestaña de Producción). */}
      {!soloPlaneamiento && (
      <div style={{
        background: BASE.white,
        border: `1px solid ${BASE.border}`,
        borderRadius: '12px 12px 0 0',
        borderBottom: 'none',
        padding: '0',
        marginBottom: 0,
      }}>
        <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
          {Object.entries(GRUPOS).filter(([gid]) => gid !== 'planificacion' && gid !== 'ejecutivo').map(([gid, g]) => {
            const activo = grupoActivo === gid;
            return (
              <button key={gid} onClick={() => {
                setGrupoActivo(gid);
                if (VIEW_TO_GRUPO[view] !== gid) {
                  setView(g.items[0].id);
                }
              }} style={{
                flex: '1 1 0',
                minWidth: 0,
                padding: isMobile ? '11px 6px' : '14px 18px',
                background: 'transparent',
                color: activo ? g.color : BASE.muted,
                border: 'none',
                fontSize: isMobile ? '11.5px' : '12px',
                fontWeight: activo ? '800' : '600',
                letterSpacing: isMobile ? '0.2px' : '0.5px',
                cursor: 'pointer',
                transition: 'color 0.15s',
                position: 'relative',
                borderBottom: activo ? `3px solid ${g.color}` : '3px solid transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '5px' : '8px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!activo) e.currentTarget.style.color = BASE.navy; }}
              onMouseLeave={e => { if (!activo) e.currentTarget.style.color = BASE.muted; }}>
                <Icon name={g.iconName} size={15} color={activo ? g.color : BASE.muted} strokeWidth={2} />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* === SUBTABS DEL GRUPO ACTIVO (Nivel 2) — solo si el grupo tiene >1 módulo
          (en Planeamiento hay un único módulo → la barra sobra y se oculta).
          GESTIÓN NO usa sub-tabs horizontales: sus módulos viven en el menú vertical
          de la DERECHA (ver más abajo) y el contenido se carga al centro. === */}
      {grupoCfg.items.length > 1 && grupoActivo !== 'gestion' && (
      <div style={{
        background: BASE.white,
        borderRadius: !soloPlaneamiento ? '0 0 12px 12px' : '12px',
        border: `1px solid ${BASE.border}`,
        borderTop: !soloPlaneamiento ? 'none' : `1px solid ${BASE.border}`,
        padding: '12px 16px',
        marginBottom: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
          {grupoCfg.items.map(item => {
            const activa = view === item.id;
            return (
              <button key={item.id} onClick={() => handleSetView(item.id)} style={{
                padding: '8px 14px',
                background: activa ? `${grupoCfg.color}15` : 'transparent',
                color: activa ? grupoCfg.color : BASE.muted,
                border: `1px solid ${activa ? `${grupoCfg.color}55` : BASE.border}`,
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: activa ? '800' : '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                letterSpacing: '0.2px',
              }}
              onMouseEnter={e => { if (!activa) { e.currentTarget.style.background = BASE.bgSoft; e.currentTarget.style.color = BASE.navy; } }}
              onMouseLeave={e => { if (!activa) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.muted; } }}>
                <Icon name={item.iconName} size={13} color={activa ? grupoCfg.color : BASE.muted} strokeWidth={2} />
                {item.l}
              </button>
            );
          })}
        </div>
        {/* Controles de comando (CPI/EF + Filtros/Resumen) en el espacio libre a la derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {comandoControles}
        </div>
      </div>
      )}

      {/* === BARRA SLIM DE GESTIÓN === Sustituye a los sub-tabs horizontales: GESTIÓN
          navega por el menú vertical de la derecha. Aquí solo viven el título y los
          controles de comando (CPI/EF + Filtros/Resumen), que mantienen a todos los
          módulos de Gestión «conversando» bajo los mismos filtros del dashboard. */}
      {grupoActivo === 'gestion' && (
      <div style={{
        background: BASE.white,
        borderRadius: !soloPlaneamiento ? '0 0 12px 12px' : '12px',
        border: `1px solid ${BASE.border}`,
        borderTop: !soloPlaneamiento ? 'none' : `1px solid ${BASE.border}`,
        padding: '12px 16px',
        marginBottom: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          <Icon name={grupoCfg.iconName} size={16} color={grupoCfg.color} strokeWidth={2} />
          <span style={{ fontSize: '13px', fontWeight: '800', color: grupoCfg.color, letterSpacing: '0.4px' }}>{grupoCfg.label}</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: BASE.muted }}>· elige un módulo en el menú de la derecha →</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {comandoControles}
        </div>
      </div>
      )}

      {/* === BARRA DE COMANDO (fallback) === Solo cuando el grupo NO tiene sub-tabs
          (grupo de un único módulo, p. ej. Cockpit o Planeamiento standalone): ahí no
          hay fila de sub-tabs donde alojar los controles, así que CPI/EF + Filtros/
          Resumen se muestran en su propia barra. En grupos con sub-tabs, estos
          controles viven a la derecha de la fila de sub-tabs (ver arriba). */}
      {grupoCfg.items.length <= 1 && (
      <div className="anim-slide-down" style={{
        background: BASE.white,
        borderRadius: '12px',
        border: `1px solid ${BASE.border}`,
        padding: '10px 14px',
        marginBottom: '14px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        rowGap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        minWidth: 0,
      }}>
        {comandoControles}
      </div>
      )}

      {/* === FILTROS (colapsable) — panel formal GRAPCO: tipografía sobria, acento dorado === */}
      {filtrosAbiertos && (() => {
        // Campo activo: borde dorado fino + texto navy en negrita (sobrio)
        const selEstilo = (activo) => ({
          width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box',
          fontSize: '13px', fontWeight: activo ? '700' : '500', cursor: 'pointer',
          color: BASE.text,
          background: BASE.white,
          border: activo ? `1.5px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
          boxShadow: activo ? `0 0 0 3px ${BASE.gold}1f` : 'none',
          outline: 'none', transition: 'all 0.15s ease',
        });

        const labelEstilo = (activo) => ({
          fontSize: '10.5px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
          color: activo ? BASE.goldDark : BASE.muted,
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
        });
        const puntoActivo = <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: BASE.gold, display: 'inline-block' }} />;

        return (
        <div style={{
          background: BASE.white, borderRadius: '12px',
          border: `1px solid ${BASE.border}`,
          borderTop: `3px solid ${tieneFiltrosActivos ? BASE.gold : BASE.navy}`,
          padding: '18px 20px', marginBottom: '12px',
          boxShadow: BASE.shadowMd,
          animation: 'slideDown 0.2s ease-out',
        }}>
          {/* Encabezado: título + conteo + segmented SEMANAL/ACUMULADO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: '800', color: BASE.navy, letterSpacing: '1.2px' }}>
                <Icon name="filter" size={14} color={BASE.navy} strokeWidth={2.2} />
                FILTROS DEL DASHBOARD
              </span>
              <span style={{ width: '1px', height: '16px', background: BASE.border }} />
              <span style={{ fontSize: '11.5px', fontWeight: '700', color: BASE.muted, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tieneFiltrosActivos ? BASE.gold : BASE.green }} />
                <span style={{ fontFamily: 'var(--grapco-font-mono, monospace)', color: BASE.navy, fontWeight: '800' }}>{filtrados.length}</span>
                registro{filtrados.length !== 1 ? 's' : ''} en vista
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              {tieneFiltrosActivos && (
                <button onClick={() => { setFPartida(''); setFSubpartida(''); setFActividad(''); setFSemana(''); setFDesde(''); setFHasta(''); setFCapataz(''); setFPersona(''); }}
                  title="Quitar todos los filtros"
                  style={{ padding: '6px 12px', background: 'transparent', color: BASE.red, border: `1px solid ${BASE.red}40`, borderRadius: '7px', fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ✕ Limpiar
                </button>
              )}
              <div style={{ display: 'inline-flex', background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '9px', padding: '3px', gap: '2px' }}>
                {[['SEMANAL', false], ['ACUMULADO', true]].map(([lbl, val]) => (
                  <button key={lbl} onClick={() => setModoAcum(val)} style={{
                    padding: '6px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.8px', transition: 'all 0.15s ease',
                    background: modoAcum === val ? BASE.navy : 'transparent',
                    color: modoAcum === val ? '#fff' : BASE.muted,
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Filtros en una sola fila: 6 selects (incl. Persona) + Desde/Hasta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 150px),1fr))', gap: '12px', alignItems: 'end' }}>
            {[
              { label: 'Partida',    val: fPartida,    set: v => { setFPartida(v); setFSubpartida(''); setFActividad(''); }, opts: Object.keys(catWbs).map(p => ({ v: p, l: p })) },
              { label: 'Subpartida', val: fSubpartida, set: v => { setFSubpartida(v); setFActividad(''); }, opts: fPartida ? Object.keys(catWbs[fPartida] || {}).map(s => ({ v: s, l: s })) : [] },
              { label: 'Actividad',  val: fActividad,  set: setFActividad, opts: fPartida && fSubpartida ? (catWbs[fPartida]?.[fSubpartida]?.map(a => ({ v: a, l: a })) || []) : [] },
              { label: 'Semana',     val: fSemana,     set: setFSemana,    opts: semanasFiltro.map(n => ({ v: n, l: `Semana ${n}` })) },
              { label: 'Capataz',    val: fCapataz,    set: setFCapataz,   opts: Object.keys(cuadrillasActivas).map(c => ({ v: c, l: c })) },
              { label: 'Persona',    val: fPersona,    set: setFPersona,   opts: personasFiltro.map(n => ({ v: n, l: n })) },
            ].map((f, i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <label style={labelEstilo(!!f.val)}>{f.label}{f.val && puntoActivo}</label>
                <SelectPremium
                  value={f.val}
                  onChange={f.set}
                  options={[{ value: '', label: 'Todos' }, ...f.opts.map(o => ({ value: o.v, label: o.l }))]}
                  placeholder="Todos"
                  isMobile={isMobile}
                  fontSize="12.5px"
                  title={f.label}
                />
              </div>
            ))}
            {[['Desde', fDesde, setFDesde], ['Hasta', fHasta, setFHasta]].map(([lab, val, set], i) => (
              <div key={`fecha-${i}`} style={{ minWidth: 0 }}>
                <label style={labelEstilo(!!val)}>{lab}{val && puntoActivo}</label>
                <DatePickerPremium value={val} onChange={set} activo={!!val} isMobile={isMobile} />
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* === RESUMEN EJECUTIVO (colapsable) — 8 KPIs === */}
      {resumenAbierto && (() => {
        const heroKpi = kpis.find(k => k.l === 'CPI GLOBAL') || kpis[0];
        const restoKpis = kpis.filter(k => k !== heroKpi);
        const mono = 'var(--grapco-font-mono, monospace)';
        return (
          <div style={{
            background: BASE.white, borderRadius: '14px',
            border: `1px solid ${BASE.border}`, borderTop: `3px solid ${BASE.navy}`,
            padding: '16px 18px', marginBottom: '12px',
            boxShadow: BASE.shadowMd,
          }}>
            <h3 style={{
              fontSize: '12px', fontWeight: '800', color: BASE.navy,
              letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '14px',
            }}>
              Resumen Ejecutivo — Indicadores clave del proyecto
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'stretch' }}>
              {/* HERO: KPI principal (CPI) */}
              <div style={{
                paddingRight: '24px', borderRight: `1px solid ${BASE.border}`,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0,
              }}>
                <small style={{
                  fontSize: '10px', fontWeight: '800', color: BASE.mutedSoft,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  display: 'block', marginBottom: '2px',
                }}>{heroKpi.l}</small>
                <strong style={{
                  fontSize: '32px', fontWeight: '900', lineHeight: 1.1,
                  fontFamily: mono, color: heroKpi.c,
                }}>{heroKpi.v}</strong>
                {heroKpi.sub && (
                  <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px', fontWeight: '600' }}>{heroKpi.sub}</p>
                )}
              </div>
              {/* Resto de KPIs en grilla compacta */}
              <div style={{
                flex: '1 1 320px', minWidth: 0, paddingLeft: '24px',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 130px),1fr))',
                gap: '14px', alignContent: 'center',
              }}>
                {restoKpis.map((s, i) => (
                  <div key={i} style={{ minWidth: 0 }}>
                    <small style={{
                      fontSize: '9.5px', fontWeight: '700', color: BASE.mutedSoft,
                      letterSpacing: '1px', textTransform: 'uppercase',
                      display: 'block', marginBottom: '3px',
                    }}>{s.l}</small>
                    <strong style={{ fontSize: '17px', fontWeight: '800', fontFamily: mono, color: s.c, whiteSpace: 'nowrap' }}>{s.v}</strong>
                    {s.sub && <p style={{ fontSize: '9.5px', color: BASE.mutedSoft, marginTop: '2px', fontWeight: '600' }}>{s.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* === VISTAS ===
          En GESTIÓN: layout de 2 columnas → contenido al centro (flex:1) + menú
          vertical de módulos a la DERECHA (sticky, con nombre + micro-descripción).
          En el resto de grupos: el contenido ocupa todo el ancho como siempre. */}
      <div style={grupoActivo === 'gestion' ? { display: 'flex', gap: '14px', alignItems: 'flex-start' } : undefined}>
      <div style={grupoActivo === 'gestion' ? { flex: 1, minWidth: 0 } : undefined}>
      {view==='cockpit'    && <CockpitEjecutivo historial={historialEnriquecido} wbs={wbs} filtrados={filtrados} costosCustomMap={costosCustomMap} isMobile={isMobile}/>}
      {view==='auditoria'  && <Auditoria filtrados={filtrados} eliminar={eliminar} guardarMetrado={guardarMetrado} hhPorSemana={hhPorSemana} hhTotales={hhTotales} totalBaseDatos={(historial||[]).length}/>}
      {view==='wbs-editor' && <EditorWbsIsp showToast={showToast}/>}
      {view==='control'    && <ControlGerencial historialEnriquecido={historialEnriquecido} wbs={wbs} personalDB={personalDB} configuracion={configuracion} asistencia={asistencia} isMobile={isMobile}/>}
      {/* CPI/EAC (el ISP) vive en Producción/GRAPCO. VDC/LAP ('vdc') → app PLANEAMIENTO_PLATAFORMA (2026-06-24). */}
      {view==='analisis'   && <CpiEac wbs={wbs} historial={historialEnriquecido} filtrados={filtrados} infoMap={infoWbs} onModificarWBS={() => handleSetView('wbs-editor')} onActualizarFlags={actualizarFlagsActividad} showToast={showToast}/>}
      {view==='graficos'   && <Graficos grafData={grafData} filtrados={filtrados} wbs={wbs}/>}
      {view==='hhcross'    && <AnalisisHHCross filtrados={filtrados} personalDB={personalDB}/>}
      {view==='tendencias' && <Tendencias filtrados={filtrados} historial={historialEnriquecido} wbs={wbs}/>}
      {view==='bim'        && <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando visor BIM…</div>}><BIM historialEnriquecido={historialEnriquecido} showToast={showToast}/></Suspense>}
      {view==='tareo'      && <Tareo historial={historialEnriquecido} filtrados={filtrados} personalDB={personalDB} cuadrillasActivas={cuadrillasActivas} cuadrillasDB={cuadrillasDB} costosCustomMap={costosCustomMap} isMobile={isMobile} showToast={showToast} fDesde={fDesde} fHasta={fHasta} fCapataz={fCapataz} setFDesde={setFDesde} setFHasta={setFHasta} setFCapataz={setFCapataz}/>}
      {view==='gestion'    && <Personal cuadrillasDB={cuadrillasDB} personalDB={personalDB} configuracion={configuracion} showToast={showToast}/>}
      {view==='pago-obreros' && <PagoObreros historial={historialEnriquecido} cuadrillasActivas={cuadrillasActivas} configuracion={configuracion} personalDB={personalDB} showToast={showToast} fDesde={fDesde} fHasta={fHasta} fCapataz={fCapataz}/>}
      {view==='export' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '14px' }}>
          <ExportarSimple
            sinMaxW
            icono="💰" titulo="Exportar Costos HE 60/100"
            desc="Genera un Excel con el desglose de horas extras 60% y 100% por trabajador. Respeta los filtros activos del dashboard (partida, semana, capataz, fechas)."
            colorBoton="#7c3aed"
            onClick={handleExportCostosHE}
            contadores={[
              { l: 'Registros filtrados', v: filtrados.length },
              { l: 'HH total', v: fmt1(hhTotales.total) },
              { l: 'HH extras', v: fmt1(hhTotales.he) },
            ]}
          />
          <ExportarSimple
            sinMaxW
            icono="⏱️" titulo="Exportar HH Semanal"
            desc="Genera un Excel con el desglose semanal de horas hombre (HN y HE). Útil para reportes de planilla."
            colorBoton={BASE.navy}
            onClick={handleExportHH}
            contadores={[
              { l: 'Semanas', v: hhPorSemana.length },
              { l: 'HH total', v: fmt1(hhTotales.total) },
              { l: 'Registros', v: filtrados.length },
            ]}
          />
        </div>
      )}
      {view==='impacto'    && <ImpactoTesis historialEnriquecido={historialEnriquecido} configuracion={configuracion}/>}
      </div>

      {/* === MENÚ VERTICAL DE GESTIÓN (a la derecha) ===
          Tarjetas «a la vista»: nombre + micro-descripción (poco texto, se entiende de un
          vistazo). Click → carga el módulo al centro. Sticky para no perderlo al hacer scroll. */}
      {grupoActivo === 'gestion' && (
      <aside style={{
        width: '236px', flexShrink: 0, alignSelf: 'flex-start',
        position: 'sticky', top: '8px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.muted, letterSpacing: '1px', padding: '2px 4px 2px', textTransform: 'uppercase' }}>
          Módulos de Gestión
        </div>
        {grupoCfg.items.map(item => {
          const activa = view === item.id;
          return (
            <button key={item.id} onClick={() => handleSetView(item.id)} style={{
              textAlign: 'left', cursor: 'pointer', width: '100%',
              background: activa ? `${grupoCfg.color}10` : BASE.white,
              border: `1px solid ${activa ? grupoCfg.color : BASE.border}`,
              borderLeft: `3px solid ${activa ? grupoCfg.color : 'transparent'}`,
              borderRadius: '10px', padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: '3px',
              transition: 'all 0.15s ease',
              boxShadow: activa ? `0 2px 10px ${grupoCfg.color}22` : '0 1px 2px rgba(15,23,42,0.03)',
            }}
            onMouseEnter={e => { if (!activa) { e.currentTarget.style.background = BASE.bgSoft; e.currentTarget.style.borderColor = `${grupoCfg.color}55`; } }}
            onMouseLeave={e => { if (!activa) { e.currentTarget.style.background = BASE.white; e.currentTarget.style.borderColor = BASE.border; } }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: activa ? '800' : '700', color: activa ? grupoCfg.color : BASE.navy }}>
                <Icon name={item.iconName} size={14} color={activa ? grupoCfg.color : BASE.muted} strokeWidth={2} />
                {item.l}
              </span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: BASE.muted, lineHeight: 1.3, paddingLeft: '22px' }}>
                {item.desc}
              </span>
            </button>
          );
        })}
      </aside>
      )}
      </div>
    </div>
  );
}

function ExportarSimple({ icono, titulo, desc, colorBoton, onClick, contadores, sinMaxW }) {
  return (
    <div style={{
      background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`,
      padding: '32px 28px', boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
      maxWidth: sinMaxW ? 'none' : '780px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
        <span style={{ fontSize: '32px' }}>{icono}</span>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.3px' }}>{titulo}</h2>
          <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '4px' }}>{desc}</p>
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
        gap: '10px', marginTop: '20px', marginBottom: '24px',
      }}>
        {(contadores || []).map((c, i) => (
          <div key={i} style={{
            background: BASE.bgSoft, padding: '10px 14px', borderRadius: '10px',
            borderLeft: `3px solid ${colorBoton}`,
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px' }}>{c.l}</p>
            <p style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginTop: '2px' }}>{c.v}</p>
          </div>
        ))}
      </div>
      <button onClick={onClick} style={{
        padding: '14px 28px', background: colorBoton, color: '#fff',
        border: 'none', borderRadius: '10px',
        fontSize: '13px', fontWeight: '900', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        letterSpacing: '0.5px',
        boxShadow: `0 4px 14px ${colorBoton}55`,
      }}>
        <span style={{ fontSize: '16px' }}>{icono}</span>
        DESCARGAR EXCEL
      </button>
    </div>
  );
}