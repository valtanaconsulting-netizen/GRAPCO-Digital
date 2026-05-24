// src/views/Ingeniero.jsx — V3 con Alertas, Ranking, CPI%, Costos HE
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CATALOGO_MASTER, INFO_MAP, FECHA_INICIO_PROYECTO } from '../utils/constants';
import { BASE, inp } from '../utils/styles';
import {
  calcCPI, fmtCPIPct, fmt1, fmtMoney, getEstado,
  getActivityOrder, buscarActividadCanonica, resolverIP,
  calcularHHPorSemana, calcularHHTotales, metradoEsHomogeneo,
  detectarAlertas, rankingCuadrillas, calcularCostosHEPorTrabajador,
  costoHoraDeTrabajador, calcularCostoTrabajador,
  obtenerSemana,
  COSTO_HORA_DEFAULT,
} from '../utils/helpers';
import { exportarValorizacion, exportarHHSemanal, exportarCostosHE } from '../utils/excelExport';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { useAuth } from '../contexts/AuthContext';
import { diagnosticarMigracionProyectoId, migrarProyectoId } from '../utils/migracionProyectoId';
import AlertasPanel from '../components/AlertasPanel';
import Tooltip from '../components/Tooltip';
import Icon from '../components/Icon';
import RankingCuadrillas from './RankingCuadrillas';
import Auditoria from './Auditoria';
import CpiEac from './CpiEac';
import Graficos from './Graficos';
import Tendencias from './Tendencias';
import AnalisisHHCross from './AnalisisHHCross';
import PagoObreros from './PagoObreros';
import Tareo from './Tareo';
import PlanDiario from './PlanDiario';
import Personal from './Personal';
import ImpactoTesis from './ImpactoTesis';
import VDC from './VDC';
import ControlGerencial from './ControlGerencial';
import CockpitEjecutivo from './CockpitEjecutivo';
import BIM from './BIM';
import EditorWbsIsp from './modulos/wbsEditor/EditorWbsIsp';
import { useCatalogoWBS } from '../hooks/useCatalogoWBS';
import { ALIAS_ACTIVIDADES } from '../data/aliasesActividades';

// Normaliza el nombre de una actividad para cruzarla de forma tolerante con el
// catálogo WBS: ignora mayúsc/minúsc, espacios dobles, puntos finales y los
// sufijos de frente «(F1-PTARI)», «(F2 - NAVE)», «(DECANTADOR)».
const FRENTE_RE_ACT = /\s*\([^()]*(?:F\s*\d|PTAR|NAVE|DECANTAD)[^()]*\)\s*$/i;
const normActividad = (s) => {
  let t = String(s || '').trim(), prev;
  do { prev = t; t = t.replace(FRENTE_RE_ACT, ''); } while (t !== prev);
  return t.toUpperCase().trim().replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
};

export default function Ingeniero({ historial, cuadrillasActivas, cuadrillasDB, personalDB, planesDiarios, configuracion, asistencia, isMobile, showToast, vistaInicial, soloPlaneamiento }) {
  const [view, setView] = useState(vistaInicial || 'auditoria');
  const [grupoActivo, setGrupoActivo] = useState(soloPlaneamiento ? 'planificacion' : 'produccion');
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [rankingAbierto, setRankingAbierto] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [fPartida,    setFPartida]    = useState('');
  const [fSubpartida, setFSubpartida] = useState('');
  const [fActividad,  setFActividad]  = useState('');
  const [fSemana,     setFSemana]     = useState('');
  const [fDesde,      setFDesde]      = useState('');
  const [fHasta,      setFHasta]      = useState('');
  const [fCapataz,    setFCapataz]    = useState('');
  const [modoAcum,    setModoAcum]    = useState(false);

  // Mapeo vista → grupo (para auto-seleccionar grupo si llega por deep-link)
  const VIEW_TO_GRUPO = {
    cockpit: 'ejecutivo',
    auditoria: 'produccion', analisis: 'produccion', control: 'produccion', 'wbs-editor': 'produccion',
    vdc: 'planificacion',
    graficos: 'analisis', hhcross: 'analisis', tendencias: 'analisis', bim: 'analisis',
    tareo: 'gestion', gestion: 'gestion',
    'pago-obreros': 'gestion',
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

  const eliminar = async r => {
    if (!window.confirm(`🗑️ Eliminar registro?\n📅 ${r.fecha} | ${r.actividad}\nEsta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'Registros_Campo', r.id));
      showToast('Registro eliminado', 'info');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
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

  // Vista de ingeniero = supervisión integral: ve TODO lo que registre cualquier
  // capataz, sin importar a qué proyecto/frente quedó etiquetado el registro.
  // (ignorarProyecto: así no se "pierde" data cuando el capataz y el ingeniero
  //  estaban en proyectos distintos al momento de guardar — pedido del usuario.)
  const { filtrarPorContexto, proyectoActivoId, frenteActivoId, modoTodosFrentes, FRENTE_DEFAULT_ID } = useProyectoActivo();
  const historialProyecto = useMemo(
    () => filtrarPorContexto(historial || [], { ignorarProyecto: true, ignorarFrente: true }),
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
  const { rol: rolUsuario } = useAuth();
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

  // Filtrados — orden DESCENDENTE
  const filtrados = useMemo(() => {
    const res = historialEnriquecido.filter(r => {
      const actCanon  = r._actividadCanonica || r.actividad;
      const partCanon = (r._partidaCanonica || r.partida || '').toUpperCase();
      const subCanon  = (r._subpartidaCanonica || r.subpartida || '').toUpperCase();
      const mA  = fActividad  ? actCanon === fActividad                  : true;
      const mP  = fPartida    ? partCanon === fPartida.toUpperCase()     : true;
      const mSP = fSubpartida ? subCanon === fSubpartida.toUpperCase()   : true;
      const mC  = fCapataz    ? r.capataz === fCapataz                   : true;
      const mD  = fDesde      ? r.fecha >= fDesde                        : true;
      const mH  = fHasta      ? r.fecha <= fHasta                        : true;
      let   mS  = true;
      if (fSemana) mS = modoAcum ? r.semana <= parseInt(fSemana) : r.semana === parseInt(fSemana);
      return mP && mSP && mA && mS && mC && mD && mH;
    });
    res.sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
      return getActivityOrder(a._actividadCanonica || a.actividad) -
             getActivityOrder(b._actividadCanonica || b.actividad);
    });
    return res;
  }, [historialEnriquecido, fPartida, fSubpartida, fActividad, fSemana, fCapataz, fDesde, fHasta, modoAcum]);

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
    const max = Math.max(24, ...(set.size ? Array.from(set) : [0]));
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [historialEnriquecido]);

  // ── Ranking de cuadrillas ──
  const ranking = useMemo(() => rankingCuadrillas(historialEnriquecido), [historialEnriquecido]);

  // WBS
  const wbs = useMemo(() => {
    // Normalización para cruzar registros con el catálogo de forma tolerante:
    // ignora mayúsc/minúsc, espacios dobles, puntos finales y —en actividades—
    // los sufijos de frente «(F1-PTARI)», «(F2 - NAVE)», «(DECANTADOR)» etc.,
    // porque "PLACAS A DOBLE CARA" y "PLACAS A DOBLE CARA (F1-PTARI)" son lo mismo.
    const normTxt = (s) => String(s || '').toUpperCase().trim()
      .replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
    const FRENTE_RE = /\s*\([^()]*(?:F\s*\d|PTAR|NAVE|DECANTAD)[^()]*\)\s*$/i;
    const normAct = (s) => {
      let t = String(s || '').trim(), prev;
      do { prev = t; t = t.replace(FRENTE_RE, ''); } while (t !== prev);
      return normTxt(t);
    };

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
        const met = parseFloat(r.metrado) || 0, hR = parseFloat(r.totalHH) || 0;
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
      const met = parseFloat(r.metrado) || 0;
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
      const met = parseFloat(r.metrado) || 0;
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
  const handleExportValorizacion = () => {
    if (!filtrados.length) return showToast('Sin datos para exportar', 'warning');
    try {
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

  const handleExportHH = () => {
    if (!hhPorSemana.length) return showToast('Sin datos de HH', 'warning');
    try {
      const fname = exportarHHSemanal(hhPorSemana, hhTotales, filtrados.length);
      showToast(`✅ ${fname} exportado`, 'success');
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleExportCostosHE = () => {
    if (!filtrados.length) return showToast('Sin datos para exportar', 'warning');
    try {
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
    let costoReal = 0, costoMeta = 0;
    (filtrados || []).forEach(r => {
      if (!r) return;
      const ipMeta = r._ipMeta || 0;
      const met = parseFloat(r.metrado) || 0;
      const hhMeta = met * ipMeta;

      // Costo real: por trabajador con sus HE 60/100
      (r.detalleTareo || []).forEach(t => {
        const cargoFull = ['Capataz','Operario','Oficial','Ayudante'].includes(t.cargo)
          ? t.cargo
          : (Object.entries({Capataz:'CAP',Operario:'OP',Oficial:'OF',Ayudante:'AY'}).find(([_, s]) => s === t.cargo) || ['Operario'])[0];
        const trabajadorObj = { cargo: cargoFull, costoHora: null };
        const ch = costoHoraDeTrabajador(trabajadorObj, costosCustomMap);
        const calc = calcularCostoTrabajador(t.hn || 0, t.he || 0, ch);
        costoReal += calc.costoTotal;
      });

      // Costo meta: HH meta × tarifa promedio (asume mix similar de cargos)
      const tarifaPromedio = Object.values(costosCustomMap).reduce((s, v) => s + v, 0) /
        Math.max(1, Object.keys(costosCustomMap).length);
      costoMeta += hhMeta * tarifaPromedio;
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
      label: 'ISP',
      iconName: 'barChart3',
      color: BASE.navy,
      tagline: 'Auditoría · CPI/EAC · Control Gerencial',
      items: [
        { id: 'auditoria',  l: 'Auditoría',         iconName: 'registro' },
        { id: 'analisis',   l: 'CPI + EAC',         iconName: 'chartBars' },
        { id: 'control',    l: 'Control Gerencial', iconName: 'fileText' },
        { id: 'wbs-editor', l: 'Editar WBS',        iconName: 'ruler' },
      ],
    },
    planificacion: {
      label: 'PLANEAMIENTO',
      iconName: 'compass',
      color: BASE.gold,
      tagline: 'Last Planner System: LAP, programación, plan diario, restricciones',
      items: [
        { id: 'vdc', l: 'Last Planner System', iconName: 'target' },
      ],
    },
    analisis: {
      label: 'ANÁLISIS',
      iconName: 'trendingUp',
      color: '#16a34a',
      tagline: 'Tendencias, proyecciones y modelo BIM',
      items: [
        { id: 'graficos',   l: 'Gráficos',     iconName: 'barChart3' },
        { id: 'tendencias', l: 'Tendencias',   iconName: 'pulse' },
        { id: 'bim',        l: 'Modelo BIM',   iconName: 'cube' },
        { id: 'hhcross',    l: 'Cuadrillas',   iconName: 'users' },
      ],
    },
    gestion: {
      label: 'GESTIÓN',
      iconName: 'users',
      color: '#7c3aed',
      tagline: 'Personal, tareo, exportaciones y configuración',
      items: [
        { id: 'tareo',          l: 'Tareo',                  iconName: 'clock' },
        { id: 'gestion',        l: 'Personal',               iconName: 'users' },
        { id: 'pago-obreros',   l: 'Pago a Obreros',         iconName: 'coins' },
        { id: 'export',         l: 'Exportar Excel',         iconName: 'coins' },
      ],
    },
  };

  const grupoCfg = GRUPOS[grupoActivo] || GRUPOS.produccion;
  const tieneFiltrosActivos = !!(fPartida || fSubpartida || fActividad || fSemana || fDesde || fHasta || fCapataz);
  const cpiEstado = getEstado(stats.cpi);
  const totalAlertas = (alertas || []).length;

  return (
    <>
      {/* === BARRA DE COMANDO — premium minimal ===
          KPIs CPI/EF como segmentos en lugar de chip + botones colapsables con SVG icons. */}
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
        minWidth: 0,
      }}>
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 0 }}>
          {[
            { open: filtrosAbiertos, setOpen: setFiltrosAbiertos, icon: 'filter',    label: 'Filtros',  active: tieneFiltrosActivos, activeBg: BASE.gold },
            { open: resumenAbierto,  setOpen: setResumenAbierto,  icon: 'barChart3', label: 'Resumen' },
            ...(ranking.length > 0 ? [{ open: rankingAbierto, setOpen: setRankingAbierto, icon: 'trophy', label: 'Ranking', badge: ranking.length }] : []),
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
      </div>

      {/* === FILTROS (colapsable) === */}
      {filtrosAbiertos && (
        <div style={{
          background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`,
          padding: '16px 18px', marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
          animation: 'slideDown 0.2s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.5px' }}>🔍 FILTROS DEL DASHBOARD</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: modoAcum ? '#94a3b8' : BASE.navy }}>SEMANAL</span>
              <div onClick={() => setModoAcum(!modoAcum)} style={{ width: '40px', height: '22px', background: modoAcum ? BASE.green : '#cbd5e1', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: '0.2s' }}>
                <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: modoAcum ? '21px' : '3px', transition: '0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: modoAcum ? BASE.green : '#94a3b8' }}>ACUMULADO</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' }}>
            {[
              { label: 'PARTIDA',    val: fPartida,    set: v => { setFPartida(v); setFSubpartida(''); setFActividad(''); }, opts: Object.keys(catWbs).map(p => ({ v: p, l: p })) },
              { label: 'SUBPARTIDA', val: fSubpartida, set: v => { setFSubpartida(v); setFActividad(''); }, opts: fPartida ? Object.keys(catWbs[fPartida] || {}).map(s => ({ v: s, l: s })) : [] },
              { label: 'ACTIVIDAD',  val: fActividad,  set: setFActividad, opts: fPartida && fSubpartida ? (catWbs[fPartida]?.[fSubpartida]?.map(a => ({ v: a, l: a })) || []) : [] },
              { label: 'SEMANA',     val: fSemana,     set: setFSemana,    opts: semanasFiltro.map(n => ({ v: n, l: `Semana ${n}` })) },
              { label: 'CAPATAZ',    val: fCapataz,    set: setFCapataz,   opts: Object.keys(cuadrillasActivas).map(c => ({ v: c, l: c })) },
            ].map((f, i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                <select value={f.val} onChange={e => f.set(e.target.value)} style={inp({ padding: '8px 10px', fontSize: '12px', width: '100%' })}>
                  <option value="">Todos...</option>
                  {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            {[['DESDE', fDesde, setFDesde], ['HASTA', fHasta, setFHasta]].map(([lab, val, set], i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>{lab}</label>
                <input type="date" value={val} onChange={e => set(e.target.value)} style={inp({ padding: '8px 10px', fontSize: '11px', width: '100%' })} />
              </div>
            ))}
          </div>

          {tieneFiltrosActivos && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => { setFPartida(''); setFSubpartida(''); setFActividad(''); setFSemana(''); setFDesde(''); setFHasta(''); setFCapataz(''); }}
                style={{ padding: '9px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✕ Limpiar filtros
              </button>
              <p style={{ fontSize: '10.5px', color: BASE.muted, lineHeight: 1.4, flex: '1 1 240px', minWidth: 0 }}>
                💡 Las exportaciones de COSTOS HE y HH SEMANAL están en GESTIÓN. La de VALORIZACIÓN en Oficina Técnica.
              </p>
            </div>
          )}
        </div>
      )}

      {/* === RESUMEN EJECUTIVO (colapsable) — 8 KPIs === */}
      {resumenAbierto && (
        <div style={{
          background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`,
          padding: '18px', marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
              📊 RESUMEN EJECUTIVO — Indicadores clave del proyecto
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' }}>
            {kpis.map((s, i) => (
              <div key={i} style={{
                background: BASE.bgSoft, borderRadius: '10px',
                border: `1px solid ${BASE.border}`, padding: '12px',
              }}>
                <small style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.8px', display: 'block', marginBottom: '4px' }}>{s.l}</small>
                <strong style={{ fontSize: '20px', fontWeight: '900', color: s.c }}>{s.v}</strong>
                {s.sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontWeight: '600' }}>{s.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === RANKING (colapsable) === */}
      {rankingAbierto && ranking.length > 0 && (
        <div style={{
          background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`,
          padding: '18px', marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
              🏆 RANKING DE CUADRILLAS — Top 5 por desempeño
            </h3>
          </div>
          <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px', marginLeft: '14px' }}>
            Score = CPI × consistencia × cumplimiento. Más alto = mejor productividad sostenida.
          </p>
          <RankingCuadrillas ranking={ranking} compact={true}/>
        </div>
      )}

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

      {/* === SUBTABS DEL GRUPO ACTIVO (Nivel 2) — chips refinados === */}
      <div style={{
        background: BASE.white,
        borderRadius: '0 0 12px 12px',
        border: `1px solid ${BASE.border}`,
        borderTop: 'none',
        padding: '12px 16px',
        marginBottom: '14px',
      }}>
        <p style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: '600', marginBottom: '10px', letterSpacing: '0.2px' }}>
          <span style={{ color: grupoCfg.color, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{grupoCfg.label}</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {grupoCfg.tagline}
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
      </div>

      {/* === VISTAS === */}
      {view==='cockpit'    && <CockpitEjecutivo historial={historialEnriquecido} wbs={wbs} filtrados={filtrados} costosCustomMap={costosCustomMap} isMobile={isMobile}/>}
      {view==='auditoria'  && <Auditoria filtrados={filtrados} eliminar={eliminar} hhPorSemana={hhPorSemana} hhTotales={hhTotales} totalBaseDatos={(historial||[]).length}/>}
      {view==='analisis'   && <CpiEac wbs={wbs} historial={historialEnriquecido} infoMap={infoWbs} onModificarWBS={() => handleSetView('wbs-editor')} onActualizarFlags={actualizarFlagsActividad}/>}
      {view==='wbs-editor' && <EditorWbsIsp showToast={showToast}/>}
      {view==='control'    && <ControlGerencial historialEnriquecido={historialEnriquecido} personalDB={personalDB} configuracion={configuracion} asistencia={asistencia} isMobile={isMobile}/>}
      {view==='vdc'        && <VDC
                                cuadrillasActivas={cuadrillasActivas}
                                cuadrillasDB={cuadrillasDB}
                                planesDiarios={planesDiarios}
                                historial={historialEnriquecido}
                                isMobile={isMobile}
                                showToast={showToast}/>}
      {view==='graficos'   && <Graficos grafData={grafData} filtrados={filtrados} wbs={wbs}/>}
      {view==='hhcross'    && <AnalisisHHCross filtrados={filtrados} personalDB={personalDB}/>}
      {view==='tendencias' && <Tendencias filtrados={filtrados} historial={historialEnriquecido} wbs={wbs}/>}
      {view==='bim'        && <BIM historialEnriquecido={historialEnriquecido} showToast={showToast}/>}
      {view==='tareo'      && <Tareo historial={historialEnriquecido} personalDB={personalDB} cuadrillasActivas={cuadrillasActivas} cuadrillasDB={cuadrillasDB} costosCustomMap={costosCustomMap} isMobile={isMobile} showToast={showToast}/>}
      {view==='gestion'    && <Personal cuadrillasDB={cuadrillasDB} personalDB={personalDB} configuracion={configuracion} showToast={showToast}/>}
      {view==='pago-obreros' && <PagoObreros historial={historialEnriquecido} cuadrillasActivas={cuadrillasActivas} configuracion={configuracion} personalDB={personalDB} showToast={showToast}/>}
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
    </>
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
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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