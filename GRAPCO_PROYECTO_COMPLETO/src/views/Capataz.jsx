// src/views/Capataz.jsx — V2
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebaseConfig';
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc, deleteDoc, writeBatch,
} from 'firebase/firestore';
import {
  INFO_MAP, FECHA_INICIO_PROYECTO,
} from '../utils/constants';
import { BASE } from '../utils/styles';
import {
  hoy, obtenerSemana as obtSem,
  borradorId,
} from '../utils/helpers';

// Capataz solo puede tocar tareo de HOY o AYER. Mas atras es informacion ya cerrada.
const ayer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};
import WbsExplorer from './WbsExplorer';
import TrabajadorCard from './capataz/secciones/TrabajadorCard';
import ModalHistorial from './capataz/secciones/ModalHistorial';
import BarraInferior from './capataz/secciones/BarraInferior';
import HeaderCapataz from './capataz/secciones/HeaderCapataz';
import TabsActividades from './capataz/secciones/TabsActividades';
import SidebarCapataz from './capataz/secciones/SidebarCapataz';
import EditorActividad from './capataz/secciones/EditorActividad';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';

const newActividadItem = () => ({
  id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  partida: '', subpartida: '', actividad: '',
  unidad: 'UND', metrado: '', observacion: '',
  detalleTareo: [],
  fotos: [],  // Bloque 8: array de {url, path, subidaEn}
});

export default function Capataz({
  cuadrillasActivas, cuadrillasDB, personalDB, isMobile, showToast,
}) {
  const { rol, user } = useAuth();
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes, FRENTE_DEFAULT_ID, filtrarPorContexto } = useProyectoActivo();

  // Override forzoso: si el usuario tiene proyectoIdAsignado en /Usuarios, ESE es el proyectoId
  // que se persiste — no el del contexto activo. Garantiza que un capataz nunca pueda escribir
  // a un proyecto que no es el suyo, aunque el contexto esté en otro lado por un instante.
  const [proyectoIdUsuario, setProyectoIdUsuario] = useState(null);
  const [nombreUsuario,     setNombreUsuario]     = useState('');
  useEffect(() => {
    if (!user?.uid) { setProyectoIdUsuario(null); setNombreUsuario(''); return; }
    getDoc(doc(db, 'Usuarios', user.uid))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setProyectoIdUsuario(d.proyectoIdAsignado || null);
          setNombreUsuario(d.nombre || d.nombreCompleto || d.displayName || '');
        } else {
          setProyectoIdUsuario(null);
          setNombreUsuario('');
        }
      })
      .catch(() => { setProyectoIdUsuario(null); setNombreUsuario(''); });
  }, [user?.uid]);
  const proyectoIdParaRegistro = proyectoIdUsuario || proyectoActivoId;

  // El frenteId que se persistirá en cada registro: si el usuario está en "todos los frentes"
  // se guarda el frente DEFAULT para que el registro tenga frenteId aunque sea genérico.
  const frenteIdParaRegistro = modoTodosFrentes ? FRENTE_DEFAULT_ID : (frenteActivoId || FRENTE_DEFAULT_ID);
  // Solo el capataz queda limitado a HOY o AYER. Ingenieros/admin pueden registrar en cualquier fecha
  // (porque a veces completan registros atrasados, regularizan dias perdidos, etc.).
  const fechaLimitada = rol === 'capataz';
  const [fecha,          setFecha]          = useState(hoy());
  const [capataz,        setCapataz]        = useState('');
  const [actividades,    setActividades]    = useState([]);
  const [actActivaId,    setActActivaId]    = useState(null);
  const [borradorDocId,  setBorradorDocId]  = useState(null);
  const [estadoBorrador, setEstadoBorrador] = useState('vacio');
  const [ultSubida,      setUltSubida]      = useState(null);
  const [buscarTrab,     setBuscarTrab]     = useState('');
  const [showWbs,        setShowWbs]        = useState(false);
  const [showHistorial,  setShowHistorial]  = useState(false);
  const [historialDelCap,setHistorialDelCap]= useState([]);
  // Jornada legal de HN por día de la semana (HE no tiene límite)
  //   lun-vie: 8.5h | sáb: SIN TOPE | dom: 0h
  const limiteHNPorFecha = (fechaStr) => {
    if (!fechaStr) return 8.5;
    const [y, m, d] = String(fechaStr).slice(0, 10).split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom, 6=sáb
    if (dow === 0) return 0;          // domingo: solo HE
    if (dow === 6) return Infinity;   // sábado: sin tope de HN
    return 8.5;                       // lunes a viernes
  };

  // ¿El día seleccionado no tiene tope de HN? (sábado)
  const sinTopeHN = !Number.isFinite(limiteHNPorFecha(fecha));

  const obtenerSemana = f => obtSem(f, FECHA_INICIO_PROYECTO);

  // ── Cuadrillas disponibles para el selector ──────────────────────────
  // Consulta DIRECTA a Firestore como respaldo: garantiza que el panel
  // tenga las cuadrillas reales aunque el snapshot de App aún no llegue.
  const [cuadrillasDirectas, setCuadrillasDirectas] = useState(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'Cuadrillas'));
        if (cancel) return;
        const map = {};
        snap.forEach(d => { map[d.id] = d.data(); });
        setCuadrillasDirectas(map);
      } catch (e) {
        if (!cancel) { console.warn('[Capataz] getDocs Cuadrillas', e); setCuadrillasDirectas(null); }
      }
    })();
    return () => { cancel = true; };
  }, []);

  // El selector de CAPATAZ se arma con los datos REALES de Firestore, pero SOLO
  // las cuadrillas del PROYECTO ACTIVO (filtrarPorContexto). Antes ignoraba el
  // filtro y mostraba cuadrillas de otros proyectos (CREDITEX en TEXTIL). Si el
  // usuario es capataz y su cuadrilla no está en este proyecto, igual se muestra
  // a sí mismo por el fallback de abajo.
  const cuadrillasParaSelect = useMemo(() => {
    // Filtra un mapa {id: cuadrilla} dejando solo las del proyecto/contexto activo.
    const soloDeEsteProyecto = (src) => {
      const lista = Object.entries(src || {}).map(([id, c]) => ({ id, ...(c || {}) }));
      return filtrarPorContexto(lista);
    };
    const construir = (src) => {
      const r = {};
      soloDeEsteProyecto(src).forEach(c => {
        if (!c) return;
        // Nombre del capataz: campo directo, o resuelto vía capatazId → Personal
        // (algunas cuadrillas se guardaron con `capataz` vacío y solo capatazId).
        let nombre = c.capataz;
        if (!nombre && c.capatazId) {
          nombre = (personalDB || []).find(p => p.id === c.capatazId)?.nombre;
        }
        if (!nombre) return;
        r[nombre] = (c.miembros || []).map(m => m?.nombre).filter(Boolean);
      });
      return r;
    };
    let r = construir(cuadrillasDB);
    if (!Object.keys(r).length) r = construir(cuadrillasDirectas);

    // Si NO hay ninguna cuadrilla real: si el usuario es capataz, mostrarlo
    // SOLO a él (con su nombre real), nunca los genéricos "Capataz 1/2/3".
    if (!Object.keys(r).length) {
      if (rol === 'capataz' && nombreUsuario) return { [nombreUsuario]: [] };
      return cuadrillasActivas || {};
    }

    // Hay cuadrillas reales: se muestran tal cual. No se inyecta el nombre del
    // usuario — eso generaba un capataz fantasma cuando su nombre de cuenta
    // (ej. "marcelinoaraya26") no coincidía con su cuadrilla real.
    return r;
  }, [cuadrillasDB, cuadrillasDirectas, cuadrillasActivas, personalDB, rol, nombreUsuario, filtrarPorContexto]);

  // ── Miembros de la cuadrilla ──
  // Incluye al capataz como primer miembro (también puede realizar actividades y registrar sus HH)
  const miembrosCuadrilla = useMemo(() => {
    if (!capataz) return [];
    const fichaCapataz = (personalDB || []).find(p => p.nombre === capataz) || {};
    const capatazComoMiembro = {
      nombre: capataz,
      cargo: fichaCapataz.cargo || 'Capataz',
      dni: fichaCapataz.dni || '',
    };
    const nombres = cuadrillasParaSelect?.[capataz] || [];
    const equipo = nombres
      .filter(n => n && n !== capataz) // evita duplicar si el capataz ya estaba listado
      .map(n => {
        const ficha = (personalDB || []).find(p => p.nombre === n) || {};
        return { nombre: n, cargo: ficha.cargo || 'Operario', dni: ficha.dni || '' };
      });
    return [capatazComoMiembro, ...equipo];
  }, [capataz, cuadrillasParaSelect, personalDB]);

  // Auto-selección: cuando el usuario logueado ES un capataz, su propia
  // cuadrilla se elige sola — "le sale su nombre" sin tener que buscarlo.
  useEffect(() => {
    if (rol !== 'capataz' || capataz) return;          // solo capataz; respeta elección manual
    if (!nombreUsuario) return;
    const opciones = Object.keys(cuadrillasParaSelect);
    if (!opciones.length) return;
    const DIACRIT = new RegExp('[\\u0300-\\u036f]', 'g');
    const norm = s => String(s || '')
      .toLowerCase().normalize('NFD').replace(DIACRIT, '').trim();
    const u = norm(nombreUsuario);
    const tokensU = u.split(/\s+/).filter(w => w.length > 3);
    const match = opciones.find(o => {
      const c = norm(o);
      if (c === u || c.includes(u) || u.includes(c)) return true;
      return tokensU.some(w => c.includes(w));
    });
    if (match) setCapataz(match);
  }, [rol, capataz, nombreUsuario, cuadrillasParaSelect]);

  const crearActividadConMiembros = useCallback(() => ({
    ...newActividadItem(),
    detalleTareo: miembrosCuadrilla.map(m => ({
      nombre: m.nombre, cargo: m.cargo, dni: m.dni, hn: 0, he: 0,
    })),
  }), [miembrosCuadrilla]);

  // ── Carga de borrador al cambiar fecha o capataz ──
  useEffect(() => {
    if (!fecha || !capataz) {
      setActividades([]); setActActivaId(null);
      setBorradorDocId(null); setEstadoBorrador('vacio'); setUltSubida(null);
      return;
    }
    let cancelado = false;
    setEstadoBorrador('cargando');

    const cargar = async () => {
      const bId = borradorId(fecha, capataz);
      try {
        const ref = doc(db, 'Borradores_Capataz', bId);
        const snap = await getDoc(ref);
        if (cancelado) return;

        if (snap.exists()) {
          const data = snap.data();
          // Las fotos viven en Registros_Campo. Si el borrador es antiguo y no
          // las guardó, se recuperan del registro subido para no perderlas al
          // re-subir (que sobrescribe el campo `fotos`).
          const fotosPorAct = {};
          try {
            const subSnap = await getDocs(query(
              collection(db, 'Registros_Campo'),
              where('fecha', '==', fecha),
              where('capataz', '==', capataz),
            ));
            if (cancelado) return;
            subSnap.docs.forEach(d => {
              const rd = d.data();
              const k = (rd.actividad || '').trim().toUpperCase();
              if (k) fotosPorAct[k] = { fotos: rd.fotos || [], regId: d.id };
            });
          } catch (e) { console.warn('[borrador: lookup fotos]', e); }
          const acts = (data.actividades || []).map(a => {
            const reg = fotosPorAct[(a.actividad || '').trim().toUpperCase()];
            return {
              ...newActividadItem(), ...a,
              // Si el borrador ya trae fotos (array), se respetan —incluso vacío
              // = borrado intencional—. Si no, se toman del registro subido.
              fotos: Array.isArray(a.fotos) ? a.fotos : (reg?.fotos || []),
              _registroExistenteId: a._registroExistenteId || reg?.regId || null,
              detalleTareo: (a.detalleTareo || []).map(t => ({
                nombre: t.nombre, cargo: t.cargo || 'Operario', dni: t.dni || '',
                hn: parseFloat(t.hn) || 0, he: parseFloat(t.he) || 0,
              })),
            };
          });
          setActividades(acts);
          setActActivaId(acts[0]?.id || null);
          setBorradorDocId(bId);
          setUltSubida(data.ultSubida || null);
          setEstadoBorrador('cargado');
          showToast(`✏️ Borrador cargado · ${acts.length} actividad${acts.length === 1 ? '' : 'es'}`, 'info');
          return;
        }

        // Sin borrador — buscar registros ya subidos (SOLO de este proyecto: un
        // mismo capataz puede existir en dos obras, no cruzar sus registros).
        const q = query(
          collection(db, 'Registros_Campo'),
          where('fecha', '==', fecha),
          where('capataz', '==', capataz),
        );
        const subidosSnapRaw = await getDocs(q);
        if (cancelado) return;
        const subidosDocs = filtrarPorContexto(subidosSnapRaw.docs.map(d => ({ id: d.id, ...d.data() })));

        if (subidosDocs.length) {
          const acts = subidosDocs.map(r => {
            return {
              ...newActividadItem(),
              _registroExistenteId: r.id,
              partida: r.partida, subpartida: r.subpartida, actividad: r.actividad,
              unidad: r.unidad || 'UND', metrado: String(r.metrado || ''),
              observacion: r.observacion || '',
              fotos: r.fotos || [],  // Bloque 8: cargar fotos guardadas
              detalleTareo: miembrosCuadrilla.map(m => {
                const t = (r.detalleTareo || []).find(x => x?.nombre === m.nombre);
                return {
                  nombre: m.nombre, cargo: m.cargo, dni: m.dni,
                  hn: parseFloat(t?.hn) || 0, he: parseFloat(t?.he) || 0,
                };
              }),
            };
          });
          setActividades(acts);
          setActActivaId(acts[0]?.id || null);
          setBorradorDocId(bId);
          setUltSubida({ ts: Date.now(), n: acts.length });
          setEstadoBorrador('cargado');
          showToast(`📅 ${acts.length} registro(s) ya subidos — puedes corregirlos`, 'info');
          return;
        }

        // Nada existente
        setActividades([]); setActActivaId(null);
        setBorradorDocId(bId); setUltSubida(null); setEstadoBorrador('vacio');
      } catch (err) {
        if (!cancelado) { console.warn('[cargar borrador]', err); setEstadoBorrador('vacio'); }
      }
    };

    cargar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, capataz, miembrosCuadrilla.length]);

  // ── HH acumuladas por trabajador (todas las actividades del día) ──
  const hhAcumPorTrab = useMemo(() => {
    const map = {};
    actividades.forEach(a => {
      (a.detalleTareo || []).forEach(t => {
        if (!t.nombre) return;
        if (!map[t.nombre]) map[t.nombre] = { hn: 0, he: 0 };
        map[t.nombre].hn += parseFloat(t.hn) || 0;
        map[t.nombre].he += parseFloat(t.he) || 0;
      });
    });
    return map;
  }, [actividades]);

  const totalHHActivas = useMemo(() => {
    let hn = 0, he = 0;
    Object.values(hhAcumPorTrab).forEach(t => { hn += t.hn; he += t.he; });
    return { hn, he, total: hn + he };
  }, [hhAcumPorTrab]);

  // ── Acciones sobre actividades ──
  const actividadActiva = actividades.find(a => a.id === actActivaId);

  const agregarActividad = () => {
    if (!capataz) return showToast('Selecciona un capataz primero', 'warning');
    if (miembrosCuadrilla.length === 0) return showToast('La cuadrilla no tiene miembros', 'warning');
    const nueva = crearActividadConMiembros();
    setActividades(prev => [...prev, nueva]);
    setActActivaId(nueva.id);
  };

  const eliminarActividad = (id) => {
    if (!window.confirm('¿Eliminar esta actividad del borrador?')) return;
    setActividades(prev => {
      const next = prev.filter(a => a.id !== id);
      if (actActivaId === id) setActActivaId(next[0]?.id || null);
      return next;
    });
  };

  const updActividad = (id, campo, valor) => {
    setActividades(prev => prev.map(a => {
      if (a.id !== id) return a;
      const nuevo = { ...a, [campo]: valor };
      if (campo === 'actividad') {
        const info = INFO_MAP[String(valor).trim().toUpperCase()];
        if (info?.un) nuevo.unidad = info.un;
      }
      if (campo === 'partida')    { nuevo.subpartida = ''; nuevo.actividad = ''; nuevo.unidad = 'UND'; }
      if (campo === 'subpartida') { nuevo.actividad = ''; nuevo.unidad = 'UND'; }
      return nuevo;
    }));
  };

  const updTareo = (actId, nombre, campo, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setActividades(prev => prev.map(a => {
      if (a.id !== actId) return a;
      return {
        ...a,
        detalleTareo: a.detalleTareo.map(t =>
          t.nombre === nombre ? { ...t, [campo]: num } : t
        ),
      };
    }));
  };

  // Importar HN/HE desde el Marcador Facial (Asistencia_Diaria del día).
  // Hace match por nombre (case-insensitive). Aplica split HN/HE por jornada legal.
  const [importandoFacial, setImportandoFacial] = useState(false);
  const importarDesdeAsistenciaFacial = async (actId) => {
    if (importandoFacial) return;
    if (!fecha || !proyectoIdParaRegistro) {
      showToast('Falta fecha o proyecto activo', 'warning');
      return;
    }
    setImportandoFacial(true);
    try {
      // Trae las asistencias del día y proyecto. Es 1 query puntual, no listener.
      const qAsis = query(
        collection(db, 'Asistencia_Diaria'),
        where('fecha', '==', fecha),
        where('proyectoId', '==', proyectoIdParaRegistro),
      );
      const snap = await getDocs(qAsis);
      const porNombre = {};
      snap.forEach(d => {
        const x = d.data();
        if (!x?.nombre) return;
        porNombre[(x.nombre || '').toUpperCase().trim()] = x;
      });

      // Parser HH:MM → minutos
      const m = (h) => {
        const [hh, mm] = (h || '0:0').split(':').map(Number);
        return (hh || 0) * 60 + (mm || 0);
      };

      const limiteHN = limiteHNPorFecha(fecha);
      const act = actividades.find(a => a.id === actId);
      if (!act) return;

      let coincidencias = 0;
      const nuevoDetalle = act.detalleTareo.map(t => {
        const key = (t.nombre || '').toUpperCase().trim();
        const asis = porNombre[key];
        if (!asis || !asis.entrada || !asis.salida) return t;
        // Horas trabajadas = (salida - entrada) - refrigerio. Si el doc trae
        // `horasTrabajadas` ya calculado por el marcador, usamos eso.
        let horas;
        if (typeof asis.horasTrabajadas === 'number' && asis.horasTrabajadas > 0) {
          horas = asis.horasTrabajadas;
        } else {
          const ref = Number(asis.descanso) || 60; // minutos
          horas = Math.max(0, (m(asis.salida) - m(asis.entrada) - ref) / 60);
        }
        horas = Math.round(horas * 4) / 4; // redondea a 0.25h
        const hn = Math.min(horas, limiteHN);
        const he = Math.max(0, horas - limiteHN);
        coincidencias++;
        return { ...t, hn, he };
      });

      setActividades(prev => prev.map(a => a.id === actId ? { ...a, detalleTareo: nuevoDetalle } : a));
      if (coincidencias === 0) {
        showToast('Sin coincidencias con el marcador facial. ¿Marcaron entrada/salida?', 'warning');
      } else {
        showToast(`✅ HH importadas del marcador facial · ${coincidencias} trabajador(es)`, 'success');
      }
    } catch (e) {
      showToast('Error importando: ' + e.message, 'error');
    } finally { setImportandoFacial(false); }
  };

  const aplicarSeleccionWbs = ({ partida, subpartida, actividad }) => {
    const info = INFO_MAP[actividad.trim().toUpperCase()] || {};
    if (!actActivaId) {
      if (miembrosCuadrilla.length === 0) {
        setShowWbs(false);
        return showToast('Selecciona un capataz primero', 'warning');
      }
      const nueva = { ...crearActividadConMiembros(), partida, subpartida, actividad, unidad: info.un || 'UND' };
      setActividades(prev => [...prev, nueva]);
      setActActivaId(nueva.id);
    } else {
      setActividades(prev => prev.map(a =>
        a.id === actActivaId
          ? { ...a, partida, subpartida, actividad, unidad: info.un || 'UND' }
          : a
      ));
    }
    setShowWbs(false);
    showToast(`✓ ${actividad}`, 'success');
  };

  // ── GUARDAR BORRADOR ──
  const guardarBorrador = async () => {
    if (!capataz || !fecha) return showToast('Falta fecha o capataz', 'warning');
    if (actividades.length === 0) return showToast('No hay actividades para guardar', 'warning');
    setEstadoBorrador('guardando');
    const bId = borradorDocId || borradorId(fecha, capataz);
    try {
      await setDoc(doc(db, 'Borradores_Capataz', bId), {
        fecha, capataz, semana: obtenerSemana(fecha),
        actividades: actividades.map(a => ({
          id: a.id, partida: a.partida, subpartida: a.subpartida,
          actividad: a.actividad, unidad: a.unidad, metrado: a.metrado,
          observacion: a.observacion,
          _registroExistenteId: a._registroExistenteId || null,
          fotos: a.fotos || [],  // el borrador conserva las fotos del avance
          detalleTareo: a.detalleTareo.filter(t => (t.hn + t.he) > 0).map(t => ({
            nombre: t.nombre, cargo: t.cargo || 'Operario', dni: t.dni || '',
            hn: t.hn, he: t.he,
          })),
        })),
        ultActualizacion: Date.now(),
        ultSubida: ultSubida || null,
      });
      setBorradorDocId(bId);
      setEstadoBorrador('cargado');
      showToast(`💾 Borrador guardado · ${actividades.length} act.`, 'success');
    } catch (err) {
      console.error('[guardarBorrador]', err);
      showToast(`Error al guardar: ${err.message}`, 'error');
      setEstadoBorrador('cargado');
    }
  };

  // ── EJECUTAR SUBIDA (sin validaciones legales — esas se hacen en subir()) ──
  const ejecutarSubida = async () => {
    setEstadoBorrador('subiendo');
    let exitos = 0, fallos = 0;

    try {
      // 1) UNA sola consulta para resolver registros existentes del día
      //    (antes era una consulta por actividad → N viajes de red).
      const existentesPorAct = {};
      const faltaResolver = actividades.some(a => !a._registroExistenteId);
      if (faltaResolver) {
        try {
          const snap = await getDocs(query(
            collection(db, 'Registros_Campo'),
            where('fecha', '==', fecha),
            where('capataz', '==', capataz),
          ));
          snap.docs.forEach(d => {
            const act = (d.data()?.actividad || '').trim().toUpperCase();
            if (act && !existentesPorAct[act]) existentesPorAct[act] = d.id;
          });
        } catch (e) { console.warn('[lookup registros]', e); }
      }

      // 2) Escribir TODO en un solo lote (un commit, no N escrituras seriadas).
      const batch = writeBatch(db);
      for (const a of actividades) {
        const metVal = parseFloat(a.metrado) || 0;
        const detalleFinal = a.detalleTareo
          .filter(t => (t.hn + t.he) > 0)
          .map(t => ({ nombre: t.nombre, cargo: t.cargo || 'Operario', dni: t.dni || '', hn: t.hn, he: t.he }));
        const totalHH = detalleFinal.reduce((s, t) => s + t.hn + t.he, 0);
        const actData = INFO_MAP[a.actividad.trim().toUpperCase()] || { un: a.unidad || 'UND', ipP: null, ipM: null };

        const payload = {
          fecha, semana: obtenerSemana(fecha),
          partida:    a.partida.toUpperCase().trim(),
          subpartida: a.subpartida.toUpperCase().trim(),
          actividad:  a.actividad.trim(),
          capataz,
          unidad:        a.unidad || actData.un,
          metrado:       metVal,
          totalHH,
          ipReal:        metVal > 0 ? parseFloat((totalHH / metVal).toFixed(3)) : null,
          ipPresupuesto: actData.ipP || null,
          ipMeta:        actData.ipM || null,
          detalleTareo:  detalleFinal,
          observacion:   a.observacion || '',
          fotos:         a.fotos || [],  // Bloque 8: fotos del avance subidas a Storage
          proyectoId:    proyectoIdParaRegistro,
          frenteId:      frenteIdParaRegistro,
          timestamp:     new Date(),
        };

        try {
          const regId = a._registroExistenteId || existentesPorAct[payload.actividad.toUpperCase()];
          if (regId) batch.update(doc(db, 'Registros_Campo', regId), payload);
          else       batch.set(doc(collection(db, 'Registros_Campo')), payload);
          exitos++;
        } catch (e) {
          console.error('[preparar act]', a.actividad, e);
          fallos++;
        }
      }
      if (exitos > 0) {
        try {
          await batch.commit();
        } catch (e) {
          console.error('[batch.commit]', e);
          fallos += exitos; exitos = 0;
        }
      }

      const ts = Date.now();
      try {
        await setDoc(
          doc(db, 'Borradores_Capataz', borradorDocId || borradorId(fecha, capataz)),
          {
            fecha, capataz, semana: obtenerSemana(fecha),
            actividades: actividades.map(a => ({
              id: a.id, partida: a.partida, subpartida: a.subpartida,
              actividad: a.actividad, unidad: a.unidad, metrado: a.metrado,
              observacion: a.observacion,
              _registroExistenteId: a._registroExistenteId || null,
              fotos: a.fotos || [],  // el borrador conserva las fotos del avance
              detalleTareo: a.detalleTareo,
            })),
            ultActualizacion: ts,
            ultSubida: { ts, n: exitos },
          }
        );
      } catch (e) { console.warn('[update borrador post-subida]', e); }

      setUltSubida({ ts, n: exitos });
      setEstadoBorrador('cargado');
      if (fallos === 0)
        showToast(`✅ ${exitos} actividad${exitos === 1 ? '' : 'es'} subida${exitos === 1 ? '' : 's'} correctamente`, 'success');
      else
        showToast(`⚠️ ${exitos} subidas, ${fallos} con error`, 'warning');
    } catch (err) {
      console.error('[subir]', err);
      showToast(`Error al subir: ${err.message}`, 'error');
      setEstadoBorrador('cargado');
    }
  };

  // ── SUBIR A REGISTROS_CAMPO (UPSERT) — con validaciones legales ──
  const subir = async () => {
    if (!capataz || !fecha) return showToast('Falta fecha o capataz', 'warning');
    if (actividades.length === 0) return showToast('No hay actividades para subir', 'warning');

    // 1) Validaciones de datos básicos + regla de bajo rendimiento (spec)
    const errores = [];
    actividades.forEach((a, i) => {
      if (!a.partida || !a.subpartida || !a.actividad)
        errores.push(`Act #${i + 1}: falta partida/subpartida/actividad`);
      const met = parseFloat(a.metrado);
      if (isNaN(met) || met < 0)
        errores.push(`Act "${a.actividad || `#${i + 1}`}": metrado inválido`);
      const totalHH = a.detalleTareo.reduce((s, t) => s + (t.hn || 0) + (t.he || 0), 0);
      if (totalHH === 0)
        errores.push(`Act "${a.actividad || `#${i + 1}`}": sin HH asignadas`);

      // SPEC: si IP real > IP meta (rendimiento peor que esperado),
      // exigir observación/restricción + al menos una foto.
      if (met > 0 && totalHH > 0) {
        const info = INFO_MAP[String(a.actividad || '').trim().toUpperCase()] || {};
        const ipReal = totalHH / met;
        const ipMeta = info.ipM;
        if (ipMeta && ipReal > ipMeta * 1.05) { // 5% tolerancia
          if (!a.observacion || !a.observacion.trim()) {
            errores.push(`Act "${a.actividad}": rendimiento bajo (IP ${ipReal.toFixed(2)} > meta ${ipMeta.toFixed(2)}) — campo OBSERVACIÓN obligatorio`);
          }
          if (!Array.isArray(a.fotos) || a.fotos.length === 0) {
            errores.push(`Act "${a.actividad}": rendimiento bajo — FOTO obligatoria del avance`);
          }
        }
      }
    });
    if (errores.length)
      return showToast(`⚠️ ${errores[0]}${errores.length > 1 ? ` (+${errores.length - 1} más)` : ''}`, 'warning');

    // 2) Validación de HN por día de semana (lun-vie 8.5h, sáb sin tope, dom 0h)
    //    Las HE no tienen límite. El exceso debe moverse a la columna de HE.
    const limiteHN = limiteHNPorFecha(fecha);
    const bloqueosHN = [];
    Object.entries(hhAcumPorTrab).forEach(([nombre, t]) => {
      if ((t.hn || 0) > limiteHN + 0.01) {
        const exceso = (t.hn - limiteHN).toFixed(1);
        bloqueosHN.push(
          `${nombre}: ${t.hn.toFixed(1)}h normales (máx ${limiteHN}h). Pasa ${exceso}h a extras (HE).`
        );
      }
    });
    if (bloqueosHN.length > 0) {
      showToast(
        `⛔ ${bloqueosHN[0]}${bloqueosHN.length > 1 ? ` (+${bloqueosHN.length - 1} más)` : ''}`,
        'error'
      );
      return;
    }

    // 3) Sin bloqueos → subir directo (HE sin límite)
    await ejecutarSubida();
  };

  // ── HISTORIAL ──
  // Capataz solo ve hoy y ayer. Mas atras es data cerrada que no puede editar.
  // Ingeniero/admin ven hasta 30 dias atras (pueden corregir o agregar registros pasados).
  const abrirHistorial = async () => {
    if (!capataz) return showToast('Selecciona un capataz primero', 'warning');
    setShowHistorial(true);
    const fechasPermitidas = fechaLimitada ? new Set([hoy(), ayer()]) : null;
    try {
      const qB = query(collection(db, 'Borradores_Capataz'), where('capataz', '==', capataz));
      const snapB = await getDocs(qB);
      const fechasMap = {};
      snapB.docs.forEach(d => {
        const b = d.data();
        if (fechasPermitidas && !fechasPermitidas.has(b.fecha)) return;
        fechasMap[b.fecha] = {
          fecha: b.fecha, tieneBorrador: true,
          actividadesBorrador: (b.actividades || []).length,
          ultSubida: b.ultSubida,
        };
      });

      const qR = query(collection(db, 'Registros_Campo'), where('capataz', '==', capataz));
      const snapR = await getDocs(qR);
      // SOLO registros de este proyecto (un capataz homónimo en otra obra no debe cruzar).
      filtrarPorContexto(snapR.docs.map(d => ({ id: d.id, ...d.data() }))).forEach(r => {
        if (fechasPermitidas && !fechasPermitidas.has(r.fecha)) return;
        if (!fechasMap[r.fecha]) fechasMap[r.fecha] = { fecha: r.fecha };
        fechasMap[r.fecha].tieneRegistro = true;
        fechasMap[r.fecha].registros = (fechasMap[r.fecha].registros || 0) + 1;
      });

      const lista = Object.values(fechasMap)
        .sort((a, b) => a.fecha < b.fecha ? 1 : -1)
        .slice(0, fechaLimitada ? 2 : 30);  // capataz max 2 dias, otros hasta 30
      setHistorialDelCap(lista);
    } catch (err) {
      console.error('[historial]', err);
      showToast('Error cargando historial', 'error');
    }
  };

  const eliminarBorrador = async () => {
    if (!borradorDocId) return;
    if (!window.confirm('¿Eliminar el borrador del día? (los registros ya subidos no se borran)')) return;
    try {
      await deleteDoc(doc(db, 'Borradores_Capataz', borradorDocId));
      setActividades([]); setActActivaId(null);
      setUltSubida(null); setEstadoBorrador('vacio');
      showToast('Borrador eliminado', 'info');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const cuadrillaInfo = capataz && (
    Object.values(cuadrillasDB || {}).find(c => c?.capataz === capataz) ||
    Object.values(cuadrillasDirectas || {}).find(c => c?.capataz === capataz)
  );

  // ════════════════════════════════════════════════════════════
  // RENDER — Layout sidebar + main + sticky actions
  // ════════════════════════════════════════════════════════════

  // ── Ver Tareo (PDF) — el capataz verifica las horas de su gente antes de
  // imprimir/firmar. Usa las actividades EN PANTALLA (incluye lo no subido);
  // el PDF se abre en una pestaña nueva con el formato oficial F13.
  const verTareoPDF = async () => {
    try {
      const conHH = (actividades || []).filter(a =>
        (a.detalleTareo || []).some(t => (parseFloat(t?.hn) || 0) + (parseFloat(t?.he) || 0) > 0));
      if (!conHH.length) return showToast('Aún no hay horas asignadas en las actividades de hoy', 'warning');
      showToast('Generando tareo en PDF...', 'info');
      const registrosPorDia = {
        [`${fecha}__${capataz}`]: conHH.map(a => ({
          fecha, capataz,
          actividad: a.actividad,
          detalleTareo: a.detalleTareo,
        })),
      };
      // Import dinámico: html2pdf solo se carga cuando el capataz lo pide
      const { verPDFTareoHtml } = await import('../components/TareoPDFHtml');
      await verPDFTareoHtml(registrosPorDia, personalDB, '20203071702');
    } catch (err) {
      console.error('[verTareoPDF]', err);
      showToast(`Error generando el tareo: ${err.message}`, 'error');
    }
  };

  const sinSeleccion = !capataz;
  const sidebarWidth = 280;

  // sidebarContent se renderiza en dos lugares (estado vacío y layout principal),
  // por eso lo guardamos en una variable JSX con las mismas props.
  const sidebarContent = (
    <SidebarCapataz
      fecha={fecha}
      capataz={capataz}
      fechaLimitada={fechaLimitada}
      cuadrillasParaSelect={cuadrillasParaSelect}
      cuadrillaInfo={cuadrillaInfo}
      miembrosCuadrilla={miembrosCuadrilla}
      actividades={actividades}
      estadoBorrador={estadoBorrador}
      ultSubida={ultSubida}
      buscarTrab={buscarTrab}
      setFecha={setFecha}
      setCapataz={setCapataz}
      setBuscarTrab={setBuscarTrab}
      obtenerSemana={obtenerSemana}
      showToast={showToast}
      onAbrirCatalogoWbs={() => setShowWbs(true)}
      onAbrirHistorial={abrirHistorial}
      onAgregarActividad={agregarActividad}
      onEliminarBorrador={eliminarBorrador}
      onVerTareo={verTareoPDF}
    />
  );

  // ── Estado vacío (sin capataz) ──
  if (sinSeleccion) {
    return (
      <div style={{
        display: 'flex', minHeight: 'calc(100dvh - 56px)',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Sidebar / panel superior móvil */}
        <aside style={{
          width: isMobile ? '100%' : `${sidebarWidth}px`,
          flexShrink: 0,
          background: BASE.white,
          borderRight: isMobile ? 'none' : `1px solid ${BASE.border}`,
          borderBottom: isMobile ? `1px solid ${BASE.border}` : 'none',
          padding: isMobile ? '14px' : '20px',
          boxShadow: isMobile ? 'none' : BASE.shadowSm,
        }}>
          {sidebarContent}
        </aside>

        {/* Estado vacío */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px',
              background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
              margin: '0 auto 20px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: BASE.shadowLg,
            }}>
              <span style={{ fontSize: '40px' }}>👷</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: BASE.navy, marginBottom: '8px' }}>
              {isMobile ? 'Selecciona arriba' : 'Selecciona un capataz'}
            </h2>
            <p style={{ fontSize: '13px', color: BASE.muted, lineHeight: 1.5 }}>
              {isMobile
                ? 'Elige fecha y capataz arriba para empezar a registrar producción.'
                : 'Usa el panel lateral para escoger fecha y capataz, luego empieza a registrar las actividades del día.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* MODALES */}
      {showWbs && (
        <WbsExplorer
          onClose={() => setShowWbs(false)}
          onSelect={aplicarSeleccionWbs}
          isMobile={isMobile}
        />
      )}

      {showHistorial && (
        <ModalHistorial
          historialDelCap={historialDelCap}
          capataz={capataz}
          onClose={() => setShowHistorial(false)}
          onSelectFecha={(f) => { setFecha(f); setShowHistorial(false); }}
        />
      )}

      {/* ── LAYOUT PRINCIPAL ── */}
      <div style={{
        display: 'flex',
        minHeight: 'calc(100dvh - 56px)',
        flexDirection: isMobile ? 'column' : 'row',
      }}>

        {/* SIDEBAR (desktop) / Panel superior (móvil) */}
        <aside style={{
          width: isMobile ? '100%' : `${sidebarWidth}px`,
          flexShrink: 0,
          background: BASE.white,
          borderRight: isMobile ? 'none' : `1px solid ${BASE.border}`,
          borderBottom: isMobile ? `1px solid ${BASE.border}` : 'none',
          padding: isMobile ? '12px 14px' : '20px',
          boxShadow: isMobile ? 'none' : BASE.shadowSm,
          position: isMobile ? 'static' : 'sticky',
          top: isMobile ? 'auto' : '56px',
          height: isMobile ? 'auto' : 'calc(100dvh - 56px)',
          overflowY: 'auto',
        }}>
          {sidebarContent}
        </aside>

        {/* MAIN */}
        <main style={{
          flex: 1,
          padding: isMobile ? '12px 14px 100px' : '20px 24px',
          overflowX: 'hidden',
        }}>

          <HeaderCapataz
            fecha={fecha}
            capataz={capataz}
            actividadesCount={actividades.length}
            totalHHActivas={totalHHActivas}
            obtenerSemana={obtenerSemana}
          />

          <TabsActividades
            actividades={actividades}
            actActivaId={actActivaId}
            isMobile={isMobile}
            onSetActActivaId={setActActivaId}
            onAgregarActividad={agregarActividad}
          />

          {actividadActiva && (
            <EditorActividad
              actividadActiva={actividadActiva}
              isMobile={isMobile}
              buscarTrab={buscarTrab}
              sinTopeHN={sinTopeHN}
              importandoFacial={importandoFacial}
              fecha={fecha}
              showToast={showToast}
              hhAcumPorTrab={hhAcumPorTrab}
              onUpdActividad={updActividad}
              onEliminarActividad={eliminarActividad}
              onAbrirCatalogoWbs={() => setShowWbs(true)}
              onImportarFacial={importarDesdeAsistenciaFacial}
              onUpdTareo={updTareo}
            />
          )}
        </main>
      </div>

      {capataz && actividades.length > 0 && (
        <BarraInferior
          isMobile={isMobile}
          estadoBorrador={estadoBorrador}
          actividadesCount={actividades.length}
          onGuardar={guardarBorrador}
          onSubir={subir}
        />
      )}
    </>
  );
}
