// src/views/PlanDiario.jsx — PROGRAMACIÓN DIARIA (alineado al formato GP-GCR-FOR-F06)
//
// Estructura del formato real (Excel "PD"):
//   Cabecera: OBRA · SEMANA · DÍA · RESIDENTE · ING. PRODUCCIÓN
//   "TREN DE ACTIVIDADES" agrupado por RUBRO - RESPONSABLE (ej. "ACERO - SOTO")
//   PROGRAMADO:  Zona · Ubicación · Fases · Actividad ISP · Categoría ·
//                Total Obreros · Obreros Actividad · Horario · HH/jornada ·
//                Metrado · Und · IP · HH (= Metrado × IP)
//   EJECUTADO:   HH · Premio · Metrado · Rend.(IP real) · Rend. GRAPCO
//   CUMPLIMIENTO: % Avance (= Metrado ejec / Metrado prog) · Causas no cumplimiento
//   Pie: HORAS PROGRAMADAS · HORAS CONSUMIDAS · TOTAL OBREROS

import React, { useState, useEffect, useMemo } from 'react';
import { loadXLSX } from '../utils/xlsxLazy';
import { db } from '../firebaseConfig';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onSnapshot, collection, query } from 'firebase/firestore';
import ConfirmModal from '../components/ConfirmModal';
import { FECHA_INICIO_PROYECTO, CATALOGO_MASTER, INFO_MAP } from '../utils/constants';
import { BASE, inp } from '../utils/styles';
import { hoy, fmtFecha, obtenerSemana as obtSem, mismaActividad } from '../utils/helpers';
import DateInput from '../components/DateInput';
import SelectPremium from '../components/SelectPremium';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';

// Catálogo base del proyecto (estático) → { ACTIVIDAD: { ip, und, partida } }
const CAT_BASE = (() => {
  const m = {};
  Object.entries(CATALOGO_MASTER || {}).forEach(([partida, subs]) => {
    Object.values(subs || {}).forEach(acts => {
      (acts || []).forEach(a => {
        const k = (a || '').trim().toUpperCase();
        if (!k || m[k]) return;
        const info = INFO_MAP[k] || {};
        m[k] = { nombre: a.trim(), ip: info.ipM || info.ipP || 0, und: info.un || 'UND', partida };
      });
    });
  });
  return m;
})();

const CATEGORIAS = ['OPERARIO', 'OFICIAL', 'AYUDANTE', 'CAPATAZ'];
const UNIDADES = ['GLB', 'M2', 'M3', 'ML', 'KG', 'UND', 'PZA'];

const newItem = () => ({
  zona: '', ubicacion: 'PTARI', fases: '', actividad: '', categoria: 'OPERARIO',
  totalObreros: 0, obrerosAct: 0, trabajadores: [], horario: '7:30 - 17:00', hhJornada: 8.5,
  metrado: 0, und: 'GLB', ip: 0,
  // Ejecutado (se llena al cierre del día o se autocompleta desde registros)
  ejHH: 0, ejPremio: 0, ejMetrado: 0, rendGrapco: 0,
  causas: '',
});

// Descriptor de columnas. band: P=Programado, E=Ejecutado, C=Cumplimiento.
// grp: id de toggle (null = siempre visible).
const COLS = [
  { k: 'idx',          h: '#',                     band: 'P', grp: null },
  { k: 'zona',         h: 'ZONA',                  band: 'P', grp: null },
  { k: 'ubicacion',    h: 'UBICACIÓN',             band: 'P', grp: null },
  { k: 'fases',        h: 'FASES',                 band: 'P', grp: null },
  { k: 'actividad',    h: 'ACTIVIDAD ISP',         band: 'P', grp: null },
  { k: 'categoria',    h: 'CATEG.',                band: 'P', grp: 'cat' },
  { k: 'totalObreros', h: 'TOT.OBR',               band: 'P', grp: 'obr' },
  { k: 'obrerosAct',   h: 'OBR.ACT',               band: 'P', grp: 'obr' },
  { k: 'trabajadores', h: 'TRABAJADORES',          band: 'P', grp: 'trab' },
  { k: 'horario',      h: 'HORARIO',               band: 'P', grp: 'hor' },
  { k: 'hhJornada',    h: 'HH/JORN',               band: 'P', grp: 'hor' },
  { k: 'metrado',      h: 'METRADO',               band: 'P', grp: null },
  { k: 'und',          h: 'UND',                   band: 'P', grp: null },
  { k: 'ip',           h: 'IP',                    band: 'P', grp: null },
  { k: 'hhProg',       h: 'HH PROG',               band: 'P', grp: null },
  { k: 'ejHH',         h: 'HH EJEC',               band: 'E', grp: 'ej' },
  { k: 'ejPremio',     h: 'PREMIO',                band: 'E', grp: 'ej' },
  { k: 'ejMetrado',    h: 'MET.EJEC',              band: 'E', grp: 'ej' },
  { k: 'rend',         h: 'REND',                  band: 'E', grp: 'rend' },
  { k: 'rendGrapco',   h: 'REND GRAPCO',           band: 'E', grp: 'rend' },
  { k: 'pctAvance',    h: '% AVANCE',              band: 'C', grp: 'av' },
  { k: 'causas',       h: 'CAUSAS NO CUMPLIMIENTO', band: 'C', grp: null },
  { k: 'del',          h: '',                      band: 'C', grp: null },
];
const TOGGLES = [
  { id: 'cat',  l: 'Categoría' },
  { id: 'obr',  l: 'Obreros' },
  { id: 'trab', l: 'Trabajadores' },
  { id: 'hor',  l: 'Horario / HH' },
  { id: 'ej',   l: 'Ejecutado' },
  { id: 'rend', l: 'Rendimiento' },
  { id: 'av',   l: '% Avance' },
];
const BANDS = { P: { l: 'PROGRAMADO', c: BASE.navy }, E: { l: 'EJECUTADO', c: '#15803d' }, C: { l: 'CUMPLIMIENTO', c: '#b45309' } };

const num = (v) => parseFloat(v) || 0;
const hhProg = (it) => +(num(it.metrado) * num(it.ip)).toFixed(2);          // HH programado = metrado × IP
const rendReal = (it) => num(it.ejMetrado) > 0 ? num(it.ejHH) / num(it.ejMetrado) : 0; // IP real
const pctAvance = (it) => num(it.metrado) > 0 ? (num(it.ejMetrado) / num(it.metrado)) * 100 : 0;

// Migra planes guardados con el esquema viejo (cuadrillas[].capatazNombre)
function normalizarGrupos(plan) {
  if (Array.isArray(plan?.grupos)) return plan.grupos;
  if (Array.isArray(plan?.cuadrillas)) {
    return plan.cuadrillas.map(c => ({
      titulo: c.titulo || c.capatazNombre || 'GRUPO',
      items: (c.items || []).map(it => ({
        ...newItem(),
        zona: it.zona || '', ubicacion: it.ubicacion || 'PTARI', fases: it.fases || '',
        actividad: it.actividad || '', categoria: it.categoria || 'OPERARIO',
        totalObreros: num(it.personal), obrerosAct: num(it.personal),
        horario: it.horario || '7:30 - 17:00', hhJornada: num(it.hhAct) || 8.5,
        metrado: num(it.metrado), und: it.und || 'GLB', ip: num(it.ip),
        causas: it.obs || '',
      })),
    }));
  }
  return [];
}

export default function PlanDiario({ planesDiarios, cuadrillasActivas, historial, isMobile, showToast }) {
  const { filtrarPorContexto, proyectoActivoId, proyectoActivo, frenteActivoId, modoTodosFrentes } = useProyectoActivo();
  const [pdFecha, setPdFecha] = useState(hoy());
  const [pdObra, setPdObra] = useState('');
  const [pdResidente, setPdResidente] = useState('');
  const [pdProduccion, setPdProduccion] = useState('');
  const [pdEditingId, setPdEditingId] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [pdGuardando, setPdGuardando] = useState(false);
  const [pdAsignando, setPdAsignando] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState(null);   // modal centrado (reemplaza window.confirm)
  const pedirConfirm = (cfg) => setConfirmCfg(cfg);
  // Visibilidad de columnas (los cálculos siguen corriendo aunque se oculten)
  const [cols, setCols] = useState({ cat: true, obr: true, trab: true, hor: true, ej: true, rend: true, av: true });
  const toggleCol = (k) => setCols(c => ({ ...c, [k]: !c[k] }));

  const obtenerSemana = f => obtSem(f, FECHA_INICIO_PROYECTO);

  // Cargar plan existente del día (o sembrar defaults)
  useEffect(() => {
    if (!pdFecha) return;
    const existing = planesDiarios.find(p => p.fecha === pdFecha);
    // Defaults: OBRA = proyecto activo; RESIDENTE/ING. PRODUCCIÓN = recordados del último plan.
    const ultimo = [...planesDiarios].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
    const obraDef = proyectoActivo?.nombre || ultimo?.obra || '';
    const residenteDef = ultimo?.residente || '';
    const produccionDef = ultimo?.produccion || '';
    if (existing) {
      setPdEditingId(existing.id);
      setPdObra(existing.obra || obraDef);
      setPdResidente(existing.residente || residenteDef);
      setPdProduccion(existing.produccion || produccionDef);
      setGrupos(normalizarGrupos(existing));
    } else {
      setPdEditingId(null);
      setPdObra(obraDef);
      setPdResidente(residenteDef);
      setPdProduccion(produccionDef);
      setGrupos([]);
    }
  }, [pdFecha, planesDiarios, proyectoActivo]);

  const addGrupo = (titulo, capataz = '') => {
    const t = (titulo || '').trim().toUpperCase();
    if (!t) return showToast('Escribe un nombre de grupo (RUBRO - RESPONSABLE)', 'warning');
    if (grupos.find(g => g.titulo === t)) return showToast('Ese grupo ya existe', 'warning');
    setGrupos(prev => [...prev, { titulo: t, capataz: (capataz || '').trim(), items: [newItem()] }]);
    setNuevoTitulo('');
  };

  // Capataz (llave del tareo) de un grupo: explícito o derivado del "RUBRO - RESPONSABLE".
  const capatazDeGrupo = (g) => {
    if (g?.capataz && g.capataz.trim()) return g.capataz.trim();
    const t = (g?.titulo || '').trim();
    const partes = t.split(/\s[-–]\s/);
    return (partes.length > 1 ? partes[partes.length - 1] : t).trim();
  };

  const addItem = (gi) => setGrupos(prev => {
    const n = [...prev]; n[gi] = { ...n[gi], items: [...n[gi].items, newItem()] }; return n;
  });
  // Fija explícitamente el capataz del grupo (llave robusta para enrutar el tareo).
  const setGrupoCapataz = (gi, capataz) => setGrupos(prev => {
    const n = [...prev]; n[gi] = { ...n[gi], capataz }; return n;
  });
  const removeItem = (gi, ii) => pedirConfirm({
    titulo: 'Eliminar actividad', mensaje: '¿Deseas eliminar esta actividad del plan?', tono: 'peligro', icono: '🗑️',
    onOk: () => setGrupos(prev => {
      const n = [...prev]; n[gi] = { ...n[gi], items: n[gi].items.filter((_, i) => i !== ii) }; return n;
    }),
  });
  const removeGrupo = (gi) => pedirConfirm({
    titulo: 'Eliminar grupo', mensaje: '¿Eliminar este grupo del plan?', tono: 'peligro', icono: '🗑️',
    onOk: () => setGrupos(prev => prev.filter((_, i) => i !== gi)),
  });
  const setItem = (gi, ii, field, value) => setGrupos(prev => {
    const n = [...prev];
    const it = { ...n[gi].items[ii], [field]: value };
    n[gi] = { ...n[gi], items: n[gi].items.map((x, i) => i === ii ? it : x) };
    return n;
  });
  // Setear varios campos de un item a la vez (para autollenado por actividad)
  const setItemMulti = (gi, ii, patch) => setGrupos(prev => {
    const n = [...prev];
    const it = { ...n[gi].items[ii], ...patch };
    n[gi] = { ...n[gi], items: n[gi].items.map((x, i) => i === ii ? it : x) };
    return n;
  });

  // Plan Maestro del proyecto (Firestore) — actividades reales con su IP meta
  const [pmActs, setPmActs] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'PlanMaestro')),
      // Solo las actividades del proyecto activo (no mezclar IP/metas de otra obra).
      (snap) => setPmActs(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })),
      (e) => console.warn('[PlanDiario/PlanMaestro]', e));
    return () => unsub();
  }, [filtrarPorContexto]);

  // Catálogo combinado: Plan Maestro del proyecto + catálogo base estático.
  // IP en cascada: ipMeta → (HH presup / Metrado contractual) → catálogo base.
  const catActividades = useMemo(() => {
    const m = { ...CAT_BASE };
    pmActs.forEach(a => {
      const nombre = (a.actividad || a.descripcion || '').trim();
      if (!nombre) return;
      const k = nombre.toUpperCase();
      const ipDerivado = num(a.metradoContractual) > 0
        ? +(num(a.hhTotalPresupuestado) / num(a.metradoContractual)).toFixed(4)
        : 0;
      const ip = num(a.ipMeta) || ipDerivado || (m[k] && m[k].ip) || 0;
      m[k] = {
        nombre,
        ip,
        und: a.unidad || (m[k] && m[k].und) || 'UND',
        partida: a.partida || a.subpartida || (m[k] && m[k].partida) || '',
      };
    });
    return m;
  }, [pmActs]);

  // Resuelve la actividad: match exacto y, si no, difuso (mismaActividad)
  const resolverCat = (valor) => {
    const up = (valor || '').trim().toUpperCase();
    if (!up) return null;
    if (catActividades[up]) return catActividades[up];
    const lista = Object.values(catActividades);
    return lista.find(c => mismaActividad(valor, c.nombre)) ||
           lista.find(c => c.nombre.toUpperCase().includes(up) || up.includes(c.nombre.toUpperCase())) ||
           null;
  };

  const listaActividades = useMemo(
    () => Object.values(catActividades)
      .filter(c => c.nombre)
      .sort((a, b) => (a.partida || 'ZZZ').localeCompare(b.partida || 'ZZZ') || a.nombre.localeCompare(b.nombre)),
    [catActividades]
  );
  // Opciones para el SelectPremium de actividad: nombre + metadato (IP · UND · partida) en gris sobrio.
  const opcionesActividad = useMemo(
    () => listaActividades.map(c => ({
      value: c.nombre,
      label: c.nombre,
      sub: `IP ${c.ip || 0} · ${c.und || 'UND'}${c.partida ? ' · ' + c.partida : ''}`,
    })),
    [listaActividades]
  );
  const listaFases = useMemo(() => {
    const s = new Set();
    Object.values(catActividades).forEach(c => c.partida && s.add(c.partida));
    return [...s].sort();
  }, [catActividades]);

  // Personal del proyecto: nombres de todas las cuadrillas + capataces
  const listaTrabajadores = useMemo(() => {
    const s = new Set();
    Object.entries(cuadrillasActivas || {}).forEach(([cap, miembros]) => {
      if (cap) s.add(cap);
      (miembros || []).forEach(m => m && s.add(m));
    });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [cuadrillasActivas]);

  // Agregar / quitar trabajador a una actividad; sincroniza el conteo de obreros
  const addTrabajador = (gi, ii, nombre) => {
    const n = (nombre || '').trim();
    if (!n) return;
    const it = grupos[gi]?.items[ii] || {};
    const lista = Array.isArray(it.trabajadores) ? it.trabajadores : [];
    if (lista.includes(n)) return;
    const nueva = [...lista, n];
    setItemMulti(gi, ii, {
      trabajadores: nueva,
      obrerosAct: nueva.length,
      totalObreros: Math.max(num(it.totalObreros), nueva.length),
    });
  };
  const removeTrabajador = (gi, ii, nombre) => {
    const it = grupos[gi]?.items[ii] || {};
    const nueva = (it.trabajadores || []).filter(x => x !== nombre);
    setItemMulti(gi, ii, { trabajadores: nueva, obrerosAct: nueva.length });
  };

  // Al elegir/escribir una actividad: autollenar IP, Unidad y Fase desde el catálogo
  const onActividad = (gi, ii, valor) => {
    const cat = resolverCat(valor);
    if (cat) {
      const prev = grupos[gi]?.items[ii] || {};
      setItemMulti(gi, ii, {
        actividad: cat.nombre,
        ip: cat.ip || num(prev.ip) || 0,
        und: cat.und || prev.und || 'UND',
        fases: cat.partida || prev.fases || '',
      });
    } else {
      setItem(gi, ii, 'actividad', valor);
    }
  };

  // Autocompletar EJECUTADO desde Registros_Campo del mismo día (match difuso por actividad)
  const autocompletarEjecutado = () => {
    let llenados = 0;
    setGrupos(prev => prev.map(g => ({
      ...g,
      items: g.items.map(it => {
        if (!it.actividad) return it;
        const reg = (historial || []).find(r => {
          if (r.fecha !== pdFecha) return false;
          const actReg = r._actividadCanonica || r.actividad || '';
          if (!actReg) return false;
          return actReg.toUpperCase() === it.actividad.toUpperCase() || mismaActividad(it.actividad, actReg);
        });
        if (!reg) return it;
        llenados++;
        // El "ejecutado" del plan = avance REPORTADO por el capataz en el tareo (fallback legacy).
        return { ...it, ejMetrado: num(reg.metradoReportado ?? reg.metrado), ejHH: num(reg.totalHH) };
      }),
    })));
    showToast(llenados ? `✅ ${llenados} actividad(es) autocompletadas desde registros` : 'No se encontraron registros del día que coincidan', llenados ? 'success' : 'warning');
  };

  const stats = useMemo(() => {
    let nItems = 0, totObr = 0, hhP = 0, hhE = 0, metP = 0, metE = 0;
    grupos.forEach(g => g.items.forEach(it => {
      nItems++;
      totObr += num(it.totalObreros);
      hhP += hhProg(it);
      hhE += num(it.ejHH);
      metP += num(it.metrado);
      metE += num(it.ejMetrado);
    }));
    const avanceGlobal = metP > 0 ? (metE / metP) * 100 : 0;
    return { nItems, totObr, hhP: +hhP.toFixed(1), hhE: +hhE.toFixed(1), nGrupos: grupos.length, avanceGlobal };
  }, [grupos]);

  const guardarPlan = async () => {
    if (!grupos.length) return showToast('Agrega al menos un grupo', 'warning');
    setPdGuardando(true);
    try {
      const id = pdEditingId || `plan_${pdFecha}_${Date.now()}`;
      // Cada grupo lleva su capataz (llave para enrutar el tareo) y el plan se aísla por proyecto.
      const gruposConCapataz = grupos.map(g => ({ ...g, capataz: capatazDeGrupo(g) }));
      const planPrevio = planesDiarios.find(p => p.id === id);
      await setDoc(doc(db, 'Planes_Diarios', id), {
        fecha: pdFecha, semana: obtenerSemana(pdFecha), obra: pdObra,
        residente: pdResidente, produccion: pdProduccion,
        proyectoId: proyectoActivoId || null,
        frenteId: (!modoTodosFrentes && frenteActivoId) ? frenteActivoId : null,
        grupos: gruposConCapataz, totales: stats,
        asignadoAlTareo: planPrevio?.asignadoAlTareo || false,
        asignadoEn: planPrevio?.asignadoEn || null,
        timestamp: new Date(),
      });
      showToast(pdEditingId ? 'Plan actualizado' : 'Plan guardado', 'success');
      setPdEditingId(id);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally { setPdGuardando(false); }
  };

  const eliminarPlan = async () => {
    if (!pdEditingId) return;
    try {
      await deleteDoc(doc(db, 'Planes_Diarios', pdEditingId));
      setPdEditingId(null); setGrupos([]);
      showToast('Plan eliminado', 'info');
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
  };

  // Envía las actividades de cada capataz a su TAREO del día (doc Asignacion_Tareo/{proy}_{fecha}).
  // El tareo del capataz lee ese doc y muestra SOLO sus actividades; sin asignación ve todas.
  const asignarAlTareo = async () => {
    if (!pdEditingId) { showToast('Guarda el plan primero', 'warning'); return; }
    if (!proyectoActivoId) { showToast('Selecciona un proyecto activo', 'warning'); return; }
    setPdAsignando(true);
    try {
      const porCapataz = {};
      grupos.forEach(g => {
        const cap = capatazDeGrupo(g);
        if (!cap) return;
        const acts = (g.items || []).map(it => (it.actividad || '').trim()).filter(Boolean);
        if (!acts.length) return;
        porCapataz[cap] = [...new Set([...(porCapataz[cap] || []), ...acts])];
      });
      if (!Object.keys(porCapataz).length) { showToast('No hay actividades por capataz para asignar', 'warning'); return; }
      const asigId = `${proyectoActivoId}_${pdFecha}`;
      await setDoc(doc(db, 'Asignacion_Tareo', asigId), {
        proyectoId: proyectoActivoId,
        frenteId: (!modoTodosFrentes && frenteActivoId) ? frenteActivoId : null,
        fecha: pdFecha, semana: obtenerSemana(pdFecha),
        porCapataz, planRef: pdEditingId, asignadoEn: serverTimestamp(),
      });
      await updateDoc(doc(db, 'Planes_Diarios', pdEditingId), { asignadoAlTareo: true, asignadoEn: serverTimestamp() });
      showToast(`Plan asignado al tareo ✓ · ${Object.keys(porCapataz).length} capataz(es)`, 'success');
    } catch (err) {
      showToast(`Error al asignar: ${err.message}`, 'error');
    } finally {
      setPdAsignando(false);
    }
  };

  const exportarPlan = async () => {
    try {
      if (!grupos.length) return showToast('No hay items', 'warning');
      const XLSX = await loadXLSX();
      const aoa = [];
      aoa.push(['OBRA:', pdObra, '', '', '', '', '', '', '', '', '', '', 'PROGRAMACIÓN DIARIA']);
      aoa.push(['SEMANA:', obtenerSemana(pdFecha)]);
      aoa.push(['DÍA DE PROGRAMACIÓN', pdFecha]);
      aoa.push(['RESIDENTE', pdResidente]);
      aoa.push(['ING. PRODUCCIÓN', pdProduccion]);
      aoa.push([]);
      aoa.push(['', '', '', '', '', '', '', '', '', 'PROGRAMADO', '', '', '', '', 'EJECUTADO', '', '', '', 'CUMPLIMIENTO']);
      aoa.push(['ITEM', 'ZONA', 'UBICACIÓN', 'FASES', 'ACTIVIDAD ISP', 'CATEGORÍA',
        'TOTAL OBREROS', 'OBREROS ACT.', 'HORARIO', 'HH/JORN.', 'METRADO', 'UND', 'IP', 'HH',
        'HH', 'PREMIO', 'METRADO', 'REND.', 'REND. GRAPCO', '% AVANCE', 'CAUSAS NO CUMPLIMIENTO']);

      grupos.forEach(g => {
        aoa.push([g.titulo]);
        g.items.forEach((it, ii) => {
          aoa.push([
            ii + 1, it.zona, it.ubicacion, it.fases, it.actividad, it.categoria,
            num(it.totalObreros), num(it.obrerosAct), it.horario, num(it.hhJornada),
            num(it.metrado), it.und, num(it.ip), hhProg(it),
            num(it.ejHH), num(it.ejPremio), num(it.ejMetrado),
            rendReal(it) ? +rendReal(it).toFixed(4) : '', num(it.rendGrapco) || '',
            num(it.metrado) > 0 ? `${Math.round(pctAvance(it))}%` : '', it.causas || '',
          ]);
        });
      });

      aoa.push([]);
      aoa.push(['', '', '', '', '', '', '', '', '', '', '', '', 'HH PROGRAMADAS', stats.hhP, 'HH CONSUMIDAS', stats.hhE]);
      aoa.push(['', '', '', '', '', '', 'TOTAL OBREROS', stats.totObr, 'ACTIVIDADES', stats.nItems, '% AVANCE', `${Math.round(stats.avanceGlobal)}%`]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 6 }, { wch: 13 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 11 },
        { wch: 12 }, { wch: 11 }, { wch: 13 }, { wch: 9 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 },
        { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 10 }, { wch: 34 }];
      ws['!merges'] = [{ s: { r: 6, c: 9 }, e: { r: 6, c: 13 } }, { s: { r: 6, c: 14 }, e: { r: 6, c: 17 } }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `PD`);
      XLSX.writeFile(wb, `PD_${pdObra.replace(/\s+/g, '_')}_Sem${obtenerSemana(pdFecha)}_${pdFecha}.xlsx`);
      showToast('Plan exportado a Excel', 'success');
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
  };

  // Construye los args del PDF del Plan Diario (reutilizable por export y compartir).
  const construirArgsPDF = () => {
    const headers = [['#', 'ZONA', 'UBIC.', 'FASES', 'ACTIVIDAD ISP', 'CAT', 'T.OBR', 'OBR.A',
      'HORARIO', 'HH/J', 'METR.', 'UND', 'IP', 'HH PR', 'HH EJ', 'MET.EJ', 'REND', '%AV', 'CAUSAS']];
    const NCOL = headers[0].length;
    const rows = [];
    grupos.forEach(g => {
      rows.push([{ content: g.titulo, colSpan: NCOL, styles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' } }]);
      g.items.forEach((it, ii) => {
        const av = num(it.metrado) > 0 && num(it.ejMetrado) > 0 ? `${Math.round(pctAvance(it))}%` : '';
        rows.push([
          ii + 1, it.zona || '', it.ubicacion || '', it.fases || '', it.actividad || '', it.categoria || '',
          num(it.totalObreros) || '', num(it.obrerosAct) || '', it.horario || '', num(it.hhJornada) || '',
          num(it.metrado) || '', it.und || '', num(it.ip) || '', hhProg(it) || '',
          num(it.ejHH) || '', num(it.ejMetrado) || '', rendReal(it) ? rendReal(it).toFixed(4) : '', av, it.causas || '',
        ]);
      });
      const gHHp = g.items.reduce((s, it) => s + hhProg(it), 0);
      const gHHe = g.items.reduce((s, it) => s + num(it.ejHH), 0);
      const gObr = g.items.reduce((s, it) => s + num(it.totalObreros), 0);
      rows.push([{
        content: `SUBTOTAL ${g.titulo}  —  Actividades: ${g.items.length}  ·  Obreros: ${gObr}  ·  HH Programadas: ${gHHp.toFixed(1)}  ·  HH Consumidas: ${gHHe.toFixed(1)}`,
        colSpan: NCOL, styles: { fillColor: [226, 232, 240], textColor: [30, 58, 95], fontStyle: 'bold', halign: 'right' },
      }]);
    });
    rows.push([{
      content: `TOTALES — Actividades: ${stats.nItems}  ·  Obreros: ${stats.totObr}  ·  HH Programadas: ${stats.hhP}  ·  HH Consumidas: ${stats.hhE}  ·  % Avance: ${Math.round(stats.avanceGlobal)}%`,
      colSpan: NCOL, styles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    }]);

    return {
      titulo: 'PROGRAMACIÓN DIARIA',
      subtitulo: `${pdObra}  ·  Semana ${obtenerSemana(pdFecha)}  ·  ${fmtFecha(pdFecha)}`,
      headers, rows,
      nombreArchivo: `PD_${pdObra.replace(/\s+/g, '_')}_Sem${obtenerSemana(pdFecha)}_${pdFecha}.pdf`,
      orientacion: 'l',
      metadata: {
        'OBRA': pdObra, 'SEMANA': obtenerSemana(pdFecha), 'DÍA': fmtFecha(pdFecha),
        'RESIDENTE': pdResidente || '—', 'ING. PRODUCCIÓN': pdProduccion || '—',
      },
    };
  };

  const exportarPDFPlan = async () => {
    if (!grupos.length) return showToast('No hay items', 'warning');
    const args = construirArgsPDF();
    const { exportarPDF } = await import('../utils/pdfExport');
    const r = await exportarPDF(args);
    showToast(r.ok ? '✅ PDF generado' : `Error PDF: ${r.error}`, r.ok ? 'success' : 'error');
  };

  // Compartir el PDF del Plan Diario por WhatsApp (mobile: nativo; desktop: WA Web).
  const compartirWhatsAppPlan = async () => {
    if (!grupos.length) return showToast('No hay items', 'warning');
    const args = construirArgsPDF();
    const { exportarPDF, compartirWhatsApp } = await import('../utils/pdfExport');
    const r = await exportarPDF({ ...args, soloBlob: true });
    if (!r.ok || !r.blob) { showToast('Error generando PDF', 'error'); return; }
    const mensaje =
`📋 *PROGRAMACIÓN DIARIA · GRAPCO*
Obra: ${pdObra}
Semana ${obtenerSemana(pdFecha)} · ${fmtFecha(pdFecha)}
Residente: ${pdResidente || '—'}
HH Programadas: ${stats.hhP}  ·  HH Ejecutadas: ${stats.hhE}  ·  Avance: ${Math.round(stats.avanceGlobal)}%`;
    const s = await compartirWhatsApp({ blob: r.blob, nombre: args.nombreArchivo, mensaje });
    if (s.ok) {
      showToast(s.modo === 'share-api' ? '✅ Compartido' : '✅ PDF descargado · WhatsApp Web abierto', 'success');
    } else { showToast('Error: ' + s.error, 'error'); }
  };

  const colsVis = COLS.filter(c => !c.grp || cols[c.grp]);
  const bandSpan = (b) => colsVis.filter(c => c.band === b).length;

  const renderCelda = (k, it, gi, ii) => {
    switch (k) {
      case 'idx': return <td style={{ padding: '5px 6px', textAlign: 'center', color: BASE.muted, fontWeight: '700' }}>{ii + 1}</td>;
      case 'zona': return <td style={celdaP}><input value={it.zona || ''} onChange={e => setItem(gi, ii, 'zona', e.target.value)} style={miniInp(70)} /></td>;
      case 'ubicacion': return <td style={celdaP}><input value={it.ubicacion || ''} onChange={e => setItem(gi, ii, 'ubicacion', e.target.value)} style={miniInp(80)} /></td>;
      case 'fases': return <td style={celdaP}><input list="pd-fases" value={it.fases || ''} onChange={e => setItem(gi, ii, 'fases', e.target.value)} style={miniInp(90)} /></td>;
      case 'actividad': return (
        <td style={celdaP}>
          <div style={{ minWidth: 210 }}>
            <SelectPremium
              value={it.actividad || ''}
              onChange={(v) => onActividad(gi, ii, v)}
              options={opcionesActividad}
              placeholder="▾ Elige actividad…"
              isMobile={isMobile}
              fontSize="11px"
              title="Actividad ISP"
            />
          </div>
        </td>
      );
      case 'categoria': return <td style={celdaP}><select value={it.categoria} onChange={e => setItem(gi, ii, 'categoria', e.target.value)} style={miniInp(86)}>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></td>;
      case 'totalObreros': return <td style={celdaP}><input type="number" min="0" value={it.totalObreros} onChange={e => setItem(gi, ii, 'totalObreros', e.target.value)} style={miniInp(48, 'center')} /></td>;
      case 'obrerosAct': return <td style={celdaP}><input type="number" min="0" value={it.obrerosAct} onChange={e => setItem(gi, ii, 'obrerosAct', e.target.value)} style={miniInp(48, 'center')} /></td>;
      case 'trabajadores': {
        const tr = Array.isArray(it.trabajadores) ? it.trabajadores : [];
        return (
          <td style={{ ...celdaP, minWidth: '210px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: tr.length ? '4px' : 0 }}>
              {tr.map(n => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: BASE.navySoft, color: BASE.navy, borderRadius: '999px', padding: '2px 6px 2px 8px', fontSize: '9.5px', fontWeight: '700' }}>
                  {n}
                  <button onClick={() => removeTrabajador(gi, ii, n)} title="Quitar"
                    style={{ border: 'none', background: 'transparent', color: BASE.navy, cursor: 'pointer', fontWeight: '900', fontSize: '11px', lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <input list="pd-trabajadores" placeholder="+ obrero…"
              onKeyDown={e => { if (e.key === 'Enter') { addTrabajador(gi, ii, e.target.value); e.target.value = ''; } }}
              onChange={e => { const v = e.target.value; if (listaTrabajadores.includes(v)) { addTrabajador(gi, ii, v); e.target.value = ''; } }}
              style={miniInp(195)} />
          </td>
        );
      }
      case 'horario': return <td style={celdaP}><input value={it.horario} onChange={e => setItem(gi, ii, 'horario', e.target.value)} style={miniInp(90)} /></td>;
      case 'hhJornada': return <td style={celdaP}><input type="number" step="0.5" value={it.hhJornada} onChange={e => setItem(gi, ii, 'hhJornada', e.target.value)} style={miniInp(52, 'center')} /></td>;
      case 'metrado': return <td style={celdaP}><input type="number" step="0.01" value={it.metrado} onChange={e => setItem(gi, ii, 'metrado', e.target.value)} style={miniInp(70, 'center')} /></td>;
      case 'und': return <td style={celdaP}><select value={it.und} onChange={e => setItem(gi, ii, 'und', e.target.value)} style={miniInp(56)}>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></td>;
      case 'ip': {
        const tieneIP = num(it.ip) > 0;
        return (
          <td style={celdaP}>
            <input type="number" step="0.0001" value={it.ip}
              onChange={e => setItem(gi, ii, 'ip', e.target.value)}
              title={tieneIP ? 'IP meta de la actividad' : 'Sin IP — elige la actividad o ingrésalo'}
              style={{
                ...miniInp(66, 'center'),
                fontWeight: '800',
                background: tieneIP ? '#dcfce7' : '#fef3c7',
                border: `1.5px solid ${tieneIP ? '#86efac' : '#fcd34d'}`,
                color: tieneIP ? '#15803d' : '#b45309',
              }} />
          </td>
        );
      }
      case 'hhProg': {
        const v = hhProg(it);
        return (
          <td style={{ padding: '4px', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', padding: '5px 10px', background: v > 0 ? BASE.navy : BASE.bgSoft, color: v > 0 ? '#fff' : BASE.muted, borderRadius: '6px', fontSize: '11px', fontWeight: '900', minWidth: '46px' }}>{v.toFixed(1)}</span>
          </td>
        );
      }
      case 'ejHH': return <td style={celdaE}><input type="number" step="0.1" value={it.ejHH} onChange={e => setItem(gi, ii, 'ejHH', e.target.value)} style={miniInp(56, 'center')} /></td>;
      case 'ejPremio': return <td style={celdaE}><input type="number" step="0.1" value={it.ejPremio} onChange={e => setItem(gi, ii, 'ejPremio', e.target.value)} style={miniInp(50, 'center')} /></td>;
      case 'ejMetrado': return <td style={celdaE}><input type="number" step="0.01" value={it.ejMetrado} onChange={e => setItem(gi, ii, 'ejMetrado', e.target.value)} style={miniInp(64, 'center')} /></td>;
      case 'rend': { const rr = rendReal(it); return <td style={{ padding: '4px', textAlign: 'center' }}><span style={{ fontSize: '10.5px', fontWeight: '800', color: BASE.navy, fontFamily: 'monospace' }}>{rr ? rr.toFixed(4) : '—'}</span></td>; }
      case 'rendGrapco': return <td style={celdaE}><input type="number" step="0.0001" value={it.rendGrapco} onChange={e => setItem(gi, ii, 'rendGrapco', e.target.value)} style={miniInp(64, 'center')} /></td>;
      case 'pctAvance': {
        const av = pctAvance(it);
        const c = av >= 100 ? '#15803d' : av >= 70 ? '#b45309' : '#b91c1c';
        const bg = av >= 100 ? '#dcfce7' : av >= 70 ? '#fef3c7' : '#fee2e2';
        return <td style={{ padding: '4px', textAlign: 'center' }}>{num(it.metrado) > 0 && num(it.ejMetrado) > 0 ? <span style={{ display: 'inline-block', padding: '4px 9px', background: bg, color: c, borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>{Math.round(av)}%</span> : <span style={{ color: BASE.mutedSoft, fontSize: '14px' }}>—</span>}</td>;
      }
      case 'causas': return <td style={celdaE}><input value={it.causas || ''} onChange={e => setItem(gi, ii, 'causas', e.target.value)} placeholder="Causas no cumplimiento..." style={miniInp(220)} /></td>;
      case 'del': return <td style={{ padding: '4px', textAlign: 'center' }}><button onClick={() => removeItem(gi, ii)} style={{ padding: '5px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>✕</button></td>;
      default: return <td />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Listas del proyecto para autocompletar (fases + obreros). Actividad → SelectPremium. */}
      <datalist id="pd-fases">
        {listaFases.map(f => <option key={f} value={f} />)}
      </datalist>
      <datalist id="pd-trabajadores">
        {listaTrabajadores.map(t => <option key={t} value={t} />)}
      </datalist>

      {/* Resumen compacto */}
      <div style={{
        background: BASE.white, borderRadius: '10px', border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`, padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy }}>
            Programación Diaria · {fmtFecha(pdFecha)}
          </span>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
            Sem. {obtenerSemana(pdFecha)}{pdEditingId ? ' · editando' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['GRUPOS', stats.nGrupos], ['ACTIVIDADES', stats.nItems], ['OBREROS', stats.totObr],
            ['HH PROG.', stats.hhP], ['HH EJEC.', stats.hhE], ['% AVANCE', `${Math.round(stats.avanceGlobal)}%`]].map(([l, v]) => (
            <div key={l} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: BASE.bgSoft, padding: '4px 10px', borderRadius: '999px', border: `1px solid ${BASE.border}`,
            }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px' }}>{l}</span>
              <span style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cabecera del formato */}
      <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, padding: '18px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, borderLeft: `4px solid ${BASE.green}`, paddingLeft: '10px', marginBottom: '14px' }}>
          CABECERA · PROGRAMACIÓN DIARIA
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 190px),1fr))', gap: '12px' }}>
          <DateInput label="DÍA DE PROGRAMACIÓN" value={pdFecha} onChange={setPdFecha} getSemana={obtenerSemana} />
          <Campo label="OBRA"><input type="text" value={pdObra} onChange={e => setPdObra(e.target.value)} style={inp({ fontWeight: '600' })} /></Campo>
          <Campo label="SEMANA"><input type="text" value={obtenerSemana(pdFecha)} disabled style={inp({ background: '#f1f5f9', fontWeight: '700' })} /></Campo>
          <Campo label="RESIDENTE"><input type="text" value={pdResidente} onChange={e => setPdResidente(e.target.value)} style={inp()} /></Campo>
          <Campo label="ING. PRODUCCIÓN"><input type="text" value={pdProduccion} onChange={e => setPdProduccion(e.target.value)} style={inp()} /></Campo>
        </div>
      </div>

      {/* Agregar grupo (RUBRO - RESPONSABLE) */}
      <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, padding: '14px 18px' }}>
        <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '10px' }}>
          TREN DE ACTIVIDADES · agrega un grupo «RUBRO - RESPONSABLE» (ej. «ACERO - SOTO»)
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGrupo(nuevoTitulo)}
            placeholder="Ej. ACERO - SOTO" style={{ ...inp(), maxWidth: '260px', textTransform: 'uppercase' }} />
          <button onClick={() => addGrupo(nuevoTitulo)}
            style={{ padding: '9px 16px', background: BASE.navy, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}>
            + Agregar grupo
          </button>
          {Object.keys(cuadrillasActivas || {}).filter(c => c).slice(0, 8).map(cap => (
            <button key={cap} onClick={() => addGrupo(cap, cap)}
              style={{ padding: '7px 12px', background: BASE.navySoft, color: BASE.navy, border: `1.5px solid ${BASE.navy}33`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '11.5px' }}>
              + {cap}
            </button>
          ))}
        </div>
      </div>

      {grupos.length === 0 ? (
        <div style={{ background: BASE.white, borderRadius: '12px', border: `2px dashed ${BASE.border}`, padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>📅</p>
          <p style={{ fontSize: '15px', fontWeight: '800', color: BASE.navy, marginBottom: '6px' }}>Programación diaria vacía</p>
          <p style={{ fontSize: '12px', color: BASE.muted }}>Agrega el primer grupo del tren de actividades (arriba).</p>
        </div>
      ) : (
        <>
          {/* Mostrar / ocultar columnas (los cálculos siguen actualizándose solos) */}
          <div style={{ background: BASE.white, borderRadius: '10px', border: `1px solid ${BASE.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px' }}>COLUMNAS:</span>
            {TOGGLES.map(t => {
              const on = cols[t.id];
              return (
                <button key={t.id} onClick={() => toggleCol(t.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 11px', borderRadius: '999px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: '800',
                    background: on ? BASE.navySoft : BASE.bgSoft,
                    color: on ? BASE.navy : BASE.muted,
                    border: `1.5px solid ${on ? BASE.navy + '44' : BASE.border}`,
                  }}>
                  <span>{on ? '☑' : '☐'}</span> {t.l}
                </button>
              );
            })}
            <span style={{ fontSize: '10px', color: BASE.muted, fontStyle: 'italic', marginLeft: 'auto' }}>
              HH Prog, Rend. y % Avance se calculan solos
            </span>
          </div>

          {grupos.map((g, gi) => {
            const gHHp = g.items.reduce((s, it) => s + hhProg(it), 0);
            const gHHe = g.items.reduce((s, it) => s + num(it.ejHH), 0);
            return (
              <div key={gi} style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ background: `linear-gradient(90deg, ${BASE.gold}, ${BASE.goldDark})`, padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#fff' }}>
                    <span style={{ fontSize: '14px' }}>👷</span>
                    <p style={{ fontSize: '12.5px', fontWeight: '800', letterSpacing: '0.3px' }}>{g.titulo}</p>
                    <span style={{ fontSize: '10px', opacity: 0.9, fontWeight: '600' }}>
                      · {g.items.length} act · HH prog {gHHp.toFixed(1)} · ejec {gHHe.toFixed(1)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff', opacity: 0.9, letterSpacing: '0.4px' }}>CAPATAZ</span>
                      <div style={{ width: 200 }}>
                        <SelectPremium
                          value={g.capataz || capatazDeGrupo(g)}
                          onChange={(v) => setGrupoCapataz(gi, v)}
                          options={(() => {
                            const actual = g.capataz || capatazDeGrupo(g);
                            const lista = Object.keys(cuadrillasActivas || {}).filter(Boolean).sort((a, b) => a.localeCompare(b));
                            return (!actual || lista.includes(actual)) ? lista : [actual, ...lista];
                          })()}
                          placeholder="— elige capataz —"
                          isMobile={isMobile}
                          fontSize="11px"
                          title="Capataz del grupo"
                        />
                      </div>
                    </div>
                    <button onClick={() => addItem(gi)} style={{ padding: '4px 11px', background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}>+ Actividad</button>
                    <button onClick={() => removeGrupo(gi)} style={{ padding: '4px 9px', background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}>🗑️</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: BASE.bgSoft }}>
                        {['P', 'E', 'C'].filter(b => bandSpan(b) > 0).map(b => (
                          <th key={b} colSpan={bandSpan(b)} style={grpTh(BANDS[b].c)}>{BANDS[b].l}</th>
                        ))}
                      </tr>
                      <tr style={{ background: BASE.bgSoft }}>
                        {colsVis.map(c => (
                          <th key={c.k} style={{ padding: '5px 5px', color: BASE.muted, fontSize: '9px', fontWeight: '800', textAlign: 'center', letterSpacing: '0.2px', borderBottom: `2px solid ${BASE.border}`, whiteSpace: 'nowrap' }}>{c.h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((it, ii) => (
                        <tr key={ii} style={{ borderBottom: `1px solid ${BASE.border}`, background: ii % 2 ? BASE.bgSoft : BASE.white }}>
                          {colsVis.map(c => <React.Fragment key={c.k}>{renderCelda(c.k, it, gi, ii)}</React.Fragment>)}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: BASE.navy, color: '#fff' }}>
                        <td colSpan={colsVis.length} style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '800' }}>
                          <span style={{ display: 'inline-flex', gap: '18px', flexWrap: 'wrap', letterSpacing: '0.3px' }}>
                            <span>SUBTOTAL «{g.titulo}»</span>
                            <span style={{ opacity: 0.85 }}>Actividades: <b>{g.items.length}</b></span>
                            <span style={{ opacity: 0.85 }}>Obreros: <b>{g.items.reduce((s, it) => s + num(it.totalObreros), 0)}</b></span>
                            <span style={{ color: '#fcd34d' }}>HH Programadas: <b>{gHHp.toFixed(1)}</b></span>
                            <span style={{ color: '#86efac' }}>HH Consumidas: <b>{gHHe.toFixed(1)}</b></span>
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Acciones */}
      {grupos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button onClick={guardarPlan} disabled={pdGuardando}
            style={{ flex: '2 1 200px', padding: '13px', background: pdGuardando ? BASE.mutedSoft : pdEditingId ? BASE.navyLight : BASE.green, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: pdGuardando ? 'not-allowed' : 'pointer', fontSize: '13.5px' }}>
            {pdGuardando ? '⏳ Guardando...' : pdEditingId ? '✏️ ACTUALIZAR PLAN' : '💾 GUARDAR PLAN'}
          </button>
          <button
            onClick={() => {
              if (!pdEditingId) return showToast('Guarda el plan primero', 'warning');
              pedirConfirm({
                titulo: 'Asignar plan al tareo', icono: '📨', tono: 'navy',
                mensaje: 'Cada capataz verá en su tareo SOLO las actividades que le asignaste hoy. Un capataz sin plan asignado sigue viendo todas las actividades.',
                onOk: asignarAlTareo,
              });
            }}
            disabled={pdAsignando}
            title="Envía las actividades de cada capataz a su tareo del día"
            style={{ flex: '1 1 180px', padding: '13px', background: pdAsignando ? BASE.mutedSoft : BASE.navy, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: pdAsignando ? 'not-allowed' : 'pointer', fontSize: '12.5px' }}>
            {pdAsignando ? '⏳ Asignando...' : '📨 ASIGNAR AL TAREO'}
          </button>
          <button onClick={autocompletarEjecutado}
            style={{ flex: '1 1 160px', padding: '13px', background: BASE.navy, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '12.5px' }}>
            ↻ AUTOCOMPLETAR
          </button>
          <button onClick={exportarPDFPlan}
            style={{ flex: '1 1 150px', padding: '13px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '12.5px' }}>
            📄 EXPORTAR PDF
          </button>
          <button onClick={compartirWhatsAppPlan}
            title="Comparte el PDF del plan por WhatsApp"
            style={{ flex: '1 1 150px', padding: '13px', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '12.5px' }}>
            💬 WHATSAPP
          </button>
          <button onClick={exportarPlan}
            style={{ flex: '1 1 150px', padding: '13px', background: BASE.orange, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '12.5px' }}>
            ⬇️ EXPORTAR EXCEL
          </button>
          {pdEditingId && (
            <button onClick={() => pedirConfirm({
                titulo: 'Eliminar plan', icono: '🗑️', tono: 'peligro',
                mensaje: `¿Eliminar el plan del ${fmtFecha(pdFecha)}?`,
                onOk: eliminarPlan,
              })}
              style={{ flex: '1 1 120px', padding: '13px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '12.5px' }}>
              🗑️ ELIMINAR
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        abierto={!!confirmCfg}
        titulo={confirmCfg?.titulo}
        mensaje={confirmCfg?.mensaje}
        tono={confirmCfg?.tono || 'navy'}
        icono={confirmCfg?.icono || '❓'}
        textoConfirmar="Confirmar"
        onConfirmar={async () => { await confirmCfg?.onOk?.(); setConfirmCfg(null); }}
        onCancelar={() => setConfirmCfg(null)}
      />
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>{label}</label>
      {children}
    </div>
  );
}

const grpTh = (color) => ({ padding: '4px', textAlign: 'center', fontSize: '9px', fontWeight: '900', color: '#fff', background: color, letterSpacing: '0.6px' });
const celdaP = { padding: '4px', background: 'rgba(30,58,95,0.025)' };
const celdaE = { padding: '4px', background: 'rgba(21,128,61,0.04)' };
const miniInp = (w, align = 'left') => ({ width: typeof w === 'number' ? `${w}px` : w, padding: '6px 7px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '10.5px', outline: 'none', background: '#fff', textAlign: align, fontWeight: align === 'center' ? '600' : '400' });
