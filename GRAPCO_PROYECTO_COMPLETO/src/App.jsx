// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProyectoActivoProvider, useProyectoActivo } from './contexts/ProyectoActivoContext';
// CUADRILLAS_MAESTRAS (defaults genéricos) ya NO se usan: las cuadrillas salen 100% del
// proyecto activo. Un proyecto nuevo arranca sin cuadrillas hasta crear las suyas.
import { BASE, LOGO } from './utils/styles';
import { hoy } from './utils/helpers';
import { leerRutaHash, escribirRutaHash } from './utils/urlNav';

import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import SelectorFrenteLateral from './components/SelectorFrenteLateral';
import AppShell from './components/AppShell';
import AreaSidebar from './components/AreaSidebar';
import Icon from './components/Icon';

// Menú lateral del área OFICINA TÉCNICA — mismas opciones que las pestañas internas
// del panel (RESUMEN → PARTIDA CONTROL → EJECUCIÓN → VALORIZACIÓN → RO), pero en el
// lado izquierdo como en "Producción y Planeamiento". Las keys mapean a KEY_TO_TAB_OT
// dentro de OficinaTecnicaPanel (tabExterna).
const OT_SIDEBAR = {
  'RESUMEN': [
    { key: 'ot.dashboard', label: 'Dashboard',          iconName: 'dashboard',  color: BASE.gold },
  ],
  'PARTIDA CONTROL': [
    { key: 'ot.partidas',  label: 'Partidas Control',    iconName: 'fileText',   color: '#a78bfa' },
  ],
  'EJECUCIÓN': [
    { key: 'ot.rdo',         label: 'RDO',                iconName: 'registro',  color: '#34d399' },
    { key: 'ot.fotografico', label: 'Registro Fotográfico', iconName: 'layers',  color: '#38bdf8' },
    { key: 'ot.bim',         label: 'Modelo BIM',         iconName: 'cube',      color: '#5eead4' },
  ],
  'VALORIZACIÓN': [
    { key: 'ot.valoriz',   label: 'Valorizaciones',      iconName: 'coins',      color: BASE.gold },
    { key: 'ot.sustento',  label: 'Sustento',            iconName: 'layers',     color: '#fbbf24' },
    { key: 'ot.informe',   label: 'Informe PDF',         iconName: 'fileText',   color: '#c4b5fd' },
  ],
  'RESULTADO OPERATIVO': [
    { key: 'ot.ro',        label: 'Resultado Operativo', iconName: 'trendingUp', color: '#fbbf24' },
  ],
};

// Menú lateral del área ALMACÉN / ADMINISTRACIÓN — mismo formato que "Producción y
// Planeamiento" y "Oficina Técnica" (sidebar navy fijo, full-screen). Las keys mapean
// a las pestañas internas de MaterialesPanel vía KEY_TO_TAB_MAT (prop tabExterna).
// El almacenero deja de ver el panel de tarjetas: ahora opera a pantalla completa.
const ALMACEN_SIDEBAR = {
  'RESUMEN': [
    { key: 'materiales.dashboard',  label: 'Dashboard',             iconName: 'dashboard',  color: BASE.gold },
  ],
  'OPERACIÓN DIARIA': [
    { key: 'materiales.salida',     label: 'Vales / Salidas',       iconName: 'truck',      color: '#f87171' },
    { key: 'materiales.entrada',    label: 'Registrar Entrada',     iconName: 'package',    color: '#34d399' },
  ],
  'INVENTARIO': [
    { key: 'materiales.reporteS10', label: 'Stock Valorizado',      iconName: 'boxes',      color: '#fbbf24' },
    { key: 'materiales.kardex',     label: 'Kardex de Movimientos', iconName: 'barChart3',  color: '#38bdf8' },
  ],
  'CONFIGURACIÓN': [
    { key: 'materiales.catalogo',   label: 'Catálogo de Materiales', iconName: 'fileText',  color: '#c4b5fd' },
    { key: 'materiales.almacenes',  label: 'Almacenes',             iconName: 'building',   color: '#a5b4fc' },
  ],
};
// Reverso tab→key: cuando MaterialesPanel navega internamente (p.ej. al guardar una
// salida salta a Kardex), traducimos el id de pestaña de vuelta a la key del sidebar.
const TAB_TO_KEY_MAT = {
  dashboard:  'materiales.dashboard',
  salida:     'materiales.salida',
  entrada:    'materiales.entrada',
  reporteS10: 'materiales.reporteS10',
  kardex:     'materiales.kardex',
  catalogo:   'materiales.catalogo',
  almacenes:  'materiales.almacenes',
};

// Items del sidebar para roles que no son admin/ingeniero (estaticos)
const ROL_ITEMS = {
  capataz:           [{ key: 'capataz',  label: 'Panel del Capataz',       iconName: 'hardhat',    color: '#16a34a', group: 'MI ÁREA' }],
  carta_balance:     [{ key: 'carta',    label: 'Carta Balance',           iconName: 'balance',    color: '#7c3aed', group: 'MI ÁREA' }],
  almacenero:        [{ key: 'almacen',  label: 'Almacén',                 iconName: 'package',    color: '#7c3aed', group: 'MI ÁREA' }],
  logistica:         [{ key: 'almacen',  label: 'Logística',               iconName: 'cart',       color: '#2563eb', group: 'MI ÁREA' }],
  calidad:           [{ key: 'calidad',  label: 'Gestión de Calidad',      iconName: 'shield',     color: '#ec4899', group: 'MI ÁREA' }],
  supervisor_cliente:[{ key: 'calidad',  label: 'Supervisión del Cliente', iconName: 'shield',     color: '#0ea5e9', group: 'MI ÁREA' }],
  oficina_tecnica:   [{ key: 'ot',       label: 'Oficina Técnica',         iconName: 'fileText',   color: '#6366f1', group: 'MI ÁREA' }],
  // SSOMA (Seguridad y Medio Ambiente) movido a la plataforma independiente SIGMA (2026-06-15).
  planeamiento:      [
    { key: 'lps',         label: 'Last Planner System',       iconName: 'target',     color: '#0d9488',    group: 'PLANEAMIENTO' },
    { key: 'dashboard',   label: 'Producción',                iconName: 'dashboard',  color: BASE.navy,    group: 'ANÁLISIS' },
    { key: 'warroom',     label: 'Sala de Operaciones',       iconName: 'target',     color: BASE.redDark, group: 'ANÁLISIS' },
    { key: 'gerencia',    label: 'Tablero Ejecutivo',         iconName: 'building',   color: '#0f1a2e',    group: 'GERENCIA' },
  ],
};

// Bloque 11 — UX Avanzada
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import CommandPalette from './components/CommandPalette';
import OfflineBanner from './components/OfflineBanner';
import GateProyectoLegacy from './components/GateProyectoLegacy';
import SkeletonPantalla from './components/SkeletonPantalla';

import {
  useHistorial, useCuadrillas, usePersonal,
  usePlanesDiarios, useConfiguracion, useAsistenciaDiaria,
} from './hooks/useFirebaseData';

// Login y SelectorPerfil son la puerta de entrada → carga eager.
import Login from './views/Login';
import SelectorPerfil from './views/SelectorPerfil';
// ── LAZY: todos los paneles/módulos cargan SOLO cuando se abren ───────────
// Esto baja el bundle inicial del app: el usuario solo descarga el módulo en
// el que entra (Producción, BIM, Plan Maestro, etc.); el resto queda como
// chunks separados que se traen on-demand y luego se cachean.
// Mapa key→loader para preload al hacer hover/touch sobre un módulo del menú.
// Cuando el usuario apunta a un módulo, ya se descarga su chunk → cuando hace
// clic, el render es prácticamente instantáneo.
const PRELOAD_BY_KEY = {
  dashboard:   () => import('./views/Ingeniero'),
  registro:    () => import('./views/Capataz'),
  carta:       () => import('./views/CartaBalanceWrapper'),
  warroom:     () => import('./views/WarRoomCuadrillas'),
  admin:       () => import('./views/admin/AdminPanel'),
  materiales:  () => import('./views/MaterialesPanel'),
  compras:     () => import('./views/ComprasPanel'),
  almacen:     () => import('./views/Almacenero'),
  calidad:     () => import('./views/CalidadPanel'),
  ot:          () => import('./views/OficinaTecnicaPanel'),
  planMaestro: () => import('./views/modulos/planMaestro/PlanMaestroPanel'),
  gerencia:    () => import('./views/modulos/panelGerencia/PanelGerencia'),
  proyectos:   () => import('./views/modulos/proyectos/ProyectosPanel'),
  portfolio:   () => import('./views/modulos/portfolio/PortfolioPanel'),
  bim:         () => import('./views/BIM'),
  capataz:     () => import('./views/capataz/CapatazPanel'),
  lps:         () => import('./views/planeamiento/LastPlannerPro'),
  // Planeamiento (faltaban → por eso se demoraban al cambiar de módulo)
  flujo:          () => import('./views/planeamiento/FlujoPlaneamiento'),
  pullplanning:   () => import('./views/planeamiento/PullPlanning'),
  planvaciado:    () => import('./views/planeamiento/PlanVaciado'),
  cronogramaobra: () => import('./views/planeamiento/CronogramaPro'),
  normaltec:      () => import('./views/planeamiento/NormalTecnologica'),
  radarProd:      () => import('./views/modulos/radarProduccion/RadarProduccion'),
  dashEjecutivo:  () => import('./views/modulos/dashboardEjecutivo/DashboardEjecutivo'),
  estadoObra:     () => import('./views/modulos/estadoObra/EstadoObra'),
};
const preloadModulo = (k) => { try { PRELOAD_BY_KEY[k]?.(); } catch { /* noop */ } };
const Capataz             = lazy(() => import('./views/Capataz'));
const Ingeniero           = lazy(() => import('./views/Ingeniero'));
const CartaBalance        = lazy(() => import('./views/CartaBalanceWrapper'));
const WarRoomCuadrillas   = lazy(() => import('./views/WarRoomCuadrillas'));
const AdminPanel          = lazy(() => import('./views/admin/AdminPanel'));
const MaterialesPanel     = lazy(() => import('./views/MaterialesPanel'));
const ComprasPanel        = lazy(() => import('./views/ComprasPanel'));
const Almacenero          = lazy(() => import('./views/Almacenero'));
const CalidadPanel        = lazy(() => import('./views/CalidadPanel'));
const OficinaTecnicaPanel = lazy(() => import('./views/OficinaTecnicaPanel'));
const PlanMaestroPanel    = lazy(() => import('./views/modulos/planMaestro/PlanMaestroPanel'));
const FlujoPlaneamiento   = lazy(() => import('./views/planeamiento/FlujoPlaneamiento'));
const PullPlanning        = lazy(() => import('./views/planeamiento/PullPlanning'));
const PlanVaciado         = lazy(() => import('./views/planeamiento/PlanVaciado'));
const CronogramaPro       = lazy(() => import('./views/planeamiento/CronogramaPro'));
const LastPlannerPro      = lazy(() => import('./views/planeamiento/LastPlannerPro'));
const NormalTecnologica   = lazy(() => import('./views/planeamiento/NormalTecnologica'));
const PanelGerencia       = lazy(() => import('./views/modulos/panelGerencia/PanelGerencia'));
const ProyectosPanel      = lazy(() => import('./views/modulos/proyectos/ProyectosPanel'));
const PortfolioPanel      = lazy(() => import('./views/modulos/portfolio/PortfolioPanel'));
const DashboardEjecutivo  = lazy(() => import('./views/modulos/dashboardEjecutivo/DashboardEjecutivo'));
const RadarProduccion     = lazy(() => import('./views/modulos/radarProduccion/RadarProduccion'));
const BIM                 = lazy(() => import('./views/BIM'));
const CapatazPanel        = lazy(() => import('./views/capataz/CapatazPanel'));
const EstadoObra          = lazy(() => import('./views/modulos/estadoObra/EstadoObra'));

// ── Alcance de módulos por ÁREA (sidebar del shell ingeniero/admin/planeamiento) ──
// Cada área ve SOLO sus módulos. Únicamente Administración (admin) ve todos.
//   - ingeniero  → Producción: avance, registro, carta balance, sala de operaciones, materiales, BIM
//   - planeamiento → WBS, Last Planner
//   - admin      → null = TODOS los módulos (acceso completo)
// Ingeniería de Producción ahora ABSORBE Planeamiento (Plan Maestro, Last Planner).
// El APU (Análisis de Precios Unitarios) ya NO está en GRAPCO: es costos y vive en la plataforma de Costos aparte.
const KEYS_PRODUCCION  = ['estadoObra', 'flujo', 'dashboard', 'radarProd', 'registro', 'carta', 'warroom', 'lps', 'cronogramaobra', 'normaltec', 'pullplanning', 'planvaciado', 'materiales', 'bim'];
const KEYS_PLANEAMIENTO = ['flujo', 'cronogramaobra', 'normaltec', 'pullplanning', 'lps', 'planvaciado'];
// Devuelve la lista de keys permitidas para el rol, o null si ve todo (admin).
const keysPermitidasPorRol = (rol) => {
  if (rol === 'admin') return null;            // acceso total
  if (rol === 'planeamiento') return KEYS_PLANEAMIENTO;
  if (rol === 'ingeniero') return KEYS_PRODUCCION;
  return null;
};

export default function App() {
  // Service Worker DESACTIVADO. La limpieza/unregister de SW viejos vive en main.jsx.
  // No re-registramos aqui para evitar caches stale que ocultaban la data al usuario.

  return (
    <AuthProvider>
      <ProyectoActivoProvider>
        <ThemeProvider>
          <NotificationProvider>
          <ErrorBoundary>
            <AppInnerKeyed />
            <PwaInstallPrompt />
          </ErrorBoundary>
        </NotificationProvider>
        </ThemeProvider>
      </ProyectoActivoProvider>
    </AuthProvider>
  );
}

// Remonta TODO el árbol autenticado cuando cambia el proyecto activo → cambio
// de proyecto instantáneo (sin recargar la página) con estado/hooks limpios.
function AppInnerKeyed() {
  const { proyectoActivoId } = useProyectoActivo();
  return <AppInner key={proyectoActivoId || 'default'} />;
}

function AppInner() {
  const { user, rol, loading, logout, esDemo, cambiarArea, areaAuto, entrarComoRol } = useAuth();

  // ── PRELOAD on-idle de módulos lazy ──
  // Después del arranque, dispara en segundo plano el download de los módulos
  // más usados. Cuando el usuario hace clic, ya están en memoria → cambio
  // instantáneo en vez de ver "Cargando módulo…".
  useEffect(() => {
    if (!rol) return; // espera a que haya sesión
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    // Precarga en segundo plano TODOS los módulos del ÁREA del usuario (vía el mapa),
    // así cualquier cambio de módulo es instantáneo. Se SALTAN los pesados que
    // arrastran vendors grandes (Calidad→PDF): esos cargan on-demand al hover/clic.
    const SKIP = new Set(['calidad', 'admin']);
    const keys = keysPermitidasPorRol(rol) || Object.keys(PRELOAD_BY_KEY);
    const tasks = [...new Set(keys)].filter(k => PRELOAD_BY_KEY[k] && !SKIP.has(k)).map(k => PRELOAD_BY_KEY[k]);
    const ids = [];
    tasks.forEach((t, i) => {
      const id = idle(() => { t().catch(() => {}); }, { timeout: 3000 + i * 400 });
      ids.push(id);
    });
    return () => ids.forEach(id => { try { cancel(id); } catch { /* noop */ } });
  }, [rol]);
  const { notify } = useNotifications();

  // Deep-link: el módulo inicial puede venir en la URL (#/area/modulo) —
  // así una pestaña nueva abre DIRECTO donde se le pidió (multi-pestaña).
  const [moduloIngeniero, setModuloIngeniero] = useState(() => leerRutaHash()?.modulo || 'dashboard');
  const [moduloOT, setModuloOT] = useState('ot.dashboard'); // sub-módulo activo del área Oficina Técnica (menú lateral)
  const [moduloAlmacen, setModuloAlmacen] = useState('materiales.dashboard'); // sub-módulo activo del área Almacén (menú lateral)
  const [drawerOpen, setDrawerOpen] = useState(false); // menú móvil (hamburguesa)

  // Si el módulo activo no está permitido para el área actual, salta al primero permitido.
  // (Ej.: Planeamiento no incluye "Producción" → arranca en Plan Maestro.)
  useEffect(() => {
    const keys = keysPermitidasPorRol(rol);
    if (keys && keys.length && !keys.includes(moduloIngeniero)) {
      setModuloIngeniero(keys[0]);
    }
  }, [rol, moduloIngeniero]);

  // La URL refleja SIEMPRE el área y módulo activos → refrescar/duplicar la
  // pestaña conserva el lugar, y dos pestañas pueden vivir en áreas distintas.
  useEffect(() => {
    if (rol) escribirRutaHash(rol, moduloIngeniero);
  }, [rol, moduloIngeniero]);

  // Sidebar colapsado (solo iconos) — persistido en localStorage para que el usuario
  // mantenga su preferencia entre sesiones.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('grapco_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const toggleSidebar = () => {
    setSidebarCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('grapco_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  const SIDEBAR_W = sidebarCollapsed ? 60 : 210;
  const CONTENT_PAD_LEFT = `${SIDEBAR_W + 16}px`; // 16px de gap entre sidebar y contenido

  const [ww, setWw] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWw(window.innerWidth);
    window.addEventListener('resize', h);
    window.addEventListener('orientationchange', h);
    return () => {
      window.removeEventListener('resize', h);
      window.removeEventListener('orientationchange', h);
    };
  }, []);

  const isMobile = ww < 768;
  const isTablet = ww >= 768 && ww < 1024;

  // showToast ahora solo dispara notify (sistema unificado de notificaciones)
  // El estado toast/setToast se mantiene por compatibilidad si algún componente
  // antiguo lo usa, pero ya no genera UI duplicada.
  const showToast = useCallback((msg, type = 'success') => {
    notify({
      tipo: type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
      titulo: msg,
    });
  }, [notify]);

  // ── COMANDOS DEL COMMAND PALETTE (Cmd+K) ──
  const comandos = useMemo(() => {
    if (!user || (rol !== 'ingeniero' && rol !== 'admin')) return [];
    return [
      // Navegación entre módulos
      { id: 'nav-dashboard', label: 'Ir a Producción', icono: '📊', grupo: 'Navegación',
        atajo: 'D', accion: () => setModuloIngeniero('dashboard') },
      { id: 'nav-registro', label: 'Ir al Registro de Producción', icono: '📋', grupo: 'Navegación',
        atajo: 'R', accion: () => setModuloIngeniero('registro') },
      { id: 'nav-carta', label: 'Ir a Carta Balance', icono: '📊', grupo: 'Navegación',
        atajo: 'C', accion: () => setModuloIngeniero('carta') },
      ...(rol === 'admin' ? [{
        id: 'nav-admin', label: 'Ir al Panel de Administración', icono: '🛡️', grupo: 'Navegación',
        atajo: 'A', accion: () => setModuloIngeniero('admin'),
      }] : []),
      // Acciones rápidas
      { id: 'reload', label: 'Recargar datos', icono: '🔄', grupo: 'Acciones',
        descripcion: 'Refrescar todos los datos desde Firestore',
        accion: () => window.location.reload() },
      { id: 'logout', label: 'Cerrar sesión', icono: '🚪', grupo: 'Acciones',
        accion: () => logout() },
      // Ayuda
      { id: 'help-cpi', label: '¿Qué es el CPI?', icono: '❓', grupo: 'Ayuda',
        descripcion: 'CPI = EV/AC. Mide eficiencia de costo. ≥1.0 está bajo presupuesto.',
        accion: () => notify({ tipo: 'info', titulo: '📊 CPI (Cost Performance Index)',
          mensaje: 'Mide eficiencia de costo. CPI = Earned Value / Actual Cost. ≥1.0 = bajo presupuesto, <1.0 = sobrecostó.',
          duracion: 8000 }) },
      { id: 'help-eac', label: '¿Qué es el EAC?', icono: '❓', grupo: 'Ayuda',
        descripcion: 'Estimación al término del proyecto basada en tendencia actual.',
        accion: () => notify({ tipo: 'info', titulo: '📊 EAC (Estimate at Completion)',
          mensaje: 'Pronóstico del costo total al terminar. EAC = BAC / CPI. Si CPI baja, EAC sube.',
          duracion: 8000 }) },
    ];
  }, [user, rol, logout, notify]);


  const fechaParaHH = hoy();
  const { historial, hhAcumuladasDia } = useHistorial(fechaParaHH);
  const cuadrillasDB  = useCuadrillas();
  const personalDB    = usePersonal();
  const planesDiarios = usePlanesDiarios();
  const configuracion = useConfiguracion();

  // Filtrar cuadrillas y personal por proyecto activo (cada proyecto tiene su propio equipo).
  // Las cuadrillas sin proyectoId quedan visibles SOLO en el proyecto default (legacy).
  const { filtrarPorContexto, proyectoActivoId } = useProyectoActivo();
  const asistencia = useAsistenciaDiaria(proyectoActivoId);
  const cuadrillasDBFiltrado = useMemo(() => {
    if (!cuadrillasDB) return {};
    const lista = Object.entries(cuadrillasDB).map(([id, c]) => ({ id, ...(c || {}) }));
    const filtradas = filtrarPorContexto(lista);
    const result = {};
    filtradas.forEach(c => { result[c.id] = c; });
    return result;
  }, [cuadrillasDB, filtrarPorContexto]);

  const personalDBFiltrado = useMemo(() => {
    if (!Array.isArray(personalDB)) return personalDB;
    return filtrarPorContexto(personalDB);
  }, [personalDB, filtrarPorContexto]);

  const cuadrillasActivas = useMemo(() => {
    const construir = (src) => {
      const result = {};
      Object.values(src || {}).forEach((c) => {
        if (!c || !c.capataz) return;
        result[c.capataz] = (c.miembros || []).map(m => m?.nombre).filter(Boolean);
      });
      return result;
    };
    try {
      // SOLO cuadrillas del proyecto activo (filtradas por contexto). Un proyecto nuevo
      // arranca SIN cuadrillas (objeto vacío) hasta que se creen las suyas — ya NO caemos
      // a un fallback con TODAS las cuadrillas (eso mostraba cuadrillas de CREDITEX en
      // TEXTIL) ni a defaults genéricos "Capataz 1/2/3".
      return construir(cuadrillasDBFiltrado);
    } catch (e) {
      console.warn('[cuadrillasActivas] error', e);
      return {};
    }
  }, [cuadrillasDBFiltrado]);

  // ── Pantalla de carga inicial (acabado ultra-premium navy + oro) ──
  if (loading) {
    const skyline = [30, 52, 22, 70, 40, 88, 34, 58, 26, 96, 44, 64, 28, 76, 38, 54, 24];
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '24px',
        background: 'radial-gradient(125% 90% at 50% 26%, #163659 0%, #0B1F39 45%, #050F1F 100%)',
        fontFamily: BASE.font, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        {/* Filo dorado superior — firma de marca */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 3,
          background: `linear-gradient(90deg, transparent, ${BASE.gold}, transparent)` }} />

        {/* Textura blueprint (grilla técnica muy sutil) */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          backgroundImage: `linear-gradient(rgba(229,168,47,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(229,168,47,0.05) 1px, transparent 1px)`,
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(circle at 50% 40%, #000 0%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 40%, #000 0%, transparent 72%)' }} />

        {/* Aurora: blobs que derivan lento → profundidad viva */}
        <div style={{ position: 'absolute', width: 540, height: 540, top: '-12%', left: '-8%', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${BASE.gold}22 0%, transparent 62%)`, filter: 'blur(22px)', animation: 'gp-aur1 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 480, height: 480, bottom: '-14%', right: '-6%', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, #1E46743a 0%, transparent 60%)', filter: 'blur(24px)', animation: 'gp-aur2 18s ease-in-out infinite' }} />
        {/* Viñeta */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(130% 110% at 50% 40%, transparent 48%, rgba(3,9,18,0.82) 100%)' }} />

        {/* Skyline que "se construye": barras suben escalonadas */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, pointerEvents: 'none', opacity: 0.55, maskImage: 'linear-gradient(to top, #000 28%, transparent)', WebkitMaskImage: 'linear-gradient(to top, #000 28%, transparent)' }}>
          {skyline.map((h, i) => (
            <span key={i} style={{
              width: 22, height: h, transformOrigin: 'bottom',
              background: i % 5 === 2 ? `linear-gradient(180deg, ${BASE.gold}cc, #16335a 70%)` : 'linear-gradient(180deg, #1b3a63, #0c2138)',
              borderRadius: '2px 2px 0 0', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
              animation: `gp-build 2.6s ease-in-out ${i * 0.08}s infinite`,
            }} />
          ))}
        </div>

        {/* Logo: anillo de barrido cónico (radar) + punto orbitando + halo + vidrio */}
        <div style={{ position: 'relative', width: 120, height: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, animation: 'gp-float 4.8s ease-in-out infinite' }}>
          <span style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%',
            background: `radial-gradient(circle, ${BASE.gold}33 0%, transparent 66%)`, animation: 'gp-halo 2.8s ease-in-out infinite' }} />
          {/* Barrido cónico dorado */}
          <span style={{ position: 'absolute', inset: -3, borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent 0deg, ${BASE.gold}00 200deg, ${BASE.gold} 320deg, #fff6e0 350deg, ${BASE.gold} 360deg)`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            animation: 'spin 1.5s linear infinite' }} />
          {/* Aro base tenue */}
          <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1.5px solid rgba(229,168,47,0.18)' }} />
          {/* Punto que orbita */}
          <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', animation: 'spin 1.5s linear infinite' }}>
            <span style={{ position: 'absolute', top: -3, left: '50%', width: 6, height: 6, marginLeft: -3, borderRadius: '50%', background: '#fff6e0', boxShadow: `0 0 10px 2px ${BASE.gold}` }} />
          </span>
          {/* Logo en tile de vidrio */}
          <span style={{ width: 74, height: 74, borderRadius: 18, background: 'linear-gradient(160deg, #ffffff, #eef3f9)', padding: 2, overflow: 'hidden',
            boxShadow: `0 14px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px ${BASE.gold}55`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={LOGO} alt="GRAPCO" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.25)' }} />
          </span>
        </div>

        <div style={{ textAlign: 'center', zIndex: 1, animation: 'gp-rise 0.6s ease-out both' }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4,
            background: `linear-gradient(180deg, #fff 38%, ${BASE.gold})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            GRAPCO <span style={{ WebkitTextFillColor: BASE.gold }}>S.A.C.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 }}>
            <span style={{ height: 1, width: 34, background: `linear-gradient(90deg, transparent, ${BASE.gold}aa)` }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 3, color: BASE.gold, textTransform: 'uppercase' }}>
              Gestión de Proyectos VDC
            </span>
            <span style={{ height: 1, width: 34, background: `linear-gradient(90deg, ${BASE.gold}aa, transparent)` }} />
          </div>
        </div>

        {/* Barra de progreso con cometa dorado */}
        <div style={{ width: 240, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden', zIndex: 1, boxShadow: `0 0 18px ${BASE.gold}22` }}>
          <div style={{ height: '100%', width: '42%', borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${BASE.gold}, #fff6e0, ${BASE.gold}, transparent)`,
            animation: 'gp-load 1.3s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5, color: '#8198b3', textTransform: 'uppercase', zIndex: 1 }}>
          Cargando plataforma<span style={{ animation: 'gp-dots 1.4s steps(4) infinite' }}>…</span>
        </div>

        <style>{`
          @keyframes gp-load { 0% { transform: translateX(-160%); } 100% { transform: translateX(440%); } }
          @keyframes gp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
          @keyframes gp-halo { 0%,100% { opacity: 0.55; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1.06); } }
          @keyframes gp-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes gp-aur1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,30px); } }
          @keyframes gp-aur2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-36px,-26px); } }
          @keyframes gp-build { 0% { transform: scaleY(0.45); opacity: 0.5; } 50% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(0.45); opacity: 0.5; } }
          @keyframes gp-dots { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
          @media (prefers-reduced-motion: reduce) { [style*="gp-"] { animation: none !important; } }
        `}</style>
      </div>
    );
  }

  // ── Sin usuario → Login ──
  if (!user) {
    return <Login />;
  }
  // ── Con usuario pero sin rol ──
  if (!rol) {
    // Rol de área única (p.ej. capataz) → entrar DIRECTO a su panel, sin selector.
    if (areaAuto) {
      entrarComoRol(areaAuto);
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B6878', fontSize: '13px' }}>
          Cargando tu área…
        </div>
      );
    }
    return <SelectorPerfil />;
  }

  const salir = () => logout();

  const cambiarModuloIngeniero = (modulo) => {
    setModuloIngeniero(modulo);
    setDrawerOpen(false); // cierra el menú móvil al elegir módulo
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      width: '100%',
      maxWidth: '100vw',
      background: BASE.bg,
      fontFamily: BASE.font,
      // No usar overflowX clip/hidden aquí — rompe position:sticky de los hijos
      // en Chromium. El bloqueo de scroll horizontal ya vive en html/body (global.css).
      boxSizing: 'border-box',
    }}>

      {/* Command Palette Cmd+K (Bloque 11) */}
      <CommandPalette comandos={comandos} />

      {/* Toast global eliminado en Bloque 14 — ahora todas las notificaciones
          van por NotificationProvider (más rico, accesible y consistente) */}

      {/* Banner modo demo — rediseñado v2 (Bloque 10) */}
      {esDemo && (
        <div style={{
          background: 'linear-gradient(90deg, #1e3a5f 0%, #152a47 100%)',
          borderBottom: '2px solid #f59e0b',
          padding: '8px 20px',
          fontSize: '11px',
          fontWeight: '700',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          flexShrink: 0,
          flexWrap: 'wrap',
          letterSpacing: '0.3px',
          animation: 'slideDown 0.3s ease-out',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              background: '#f59e0b',
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }}/>
            <span style={{ color: '#fbbf24' }}>MODO DEMO</span>
            <span style={{ opacity: 0.85 }}>· Solo lectura, cambios no se guardan</span>
          </span>
          <button
            onClick={salir}
            className="btn-feedback"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '4px 14px',
              fontSize: '10px',
              fontWeight: '800',
              color: '#fbbf24',
              cursor: 'pointer',
              letterSpacing: '0.4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(245, 158, 11, 0.3)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(245, 158, 11, 0.15)'; }}
          >
            ✕ SALIR DEL DEMO
          </button>
        </div>
      )}

      {/* Navbar */}
      <Navbar rol={rol} isMobile={isMobile} onSalir={salir} onCambiarArea={cambiarArea}
        onMenu={['admin', 'ingeniero', 'planeamiento'].includes(rol) ? () => setDrawerOpen(true) : undefined} />

      {/* Selector global Proyecto + Frente MOVIDO a la pantalla de entrada (SelectorPerfil):
          el proyecto y el frente se eligen al ingresar desde el Módulo de áreas. Aquí ya no va. */}

      {/* Indicador de conexión (offline-first para obra sin señal) */}
      <OfflineBanner />

      {/* Contenido principal — compensa navbar fixed (60px arriba) y sidebar fixed (dinámico). */}
      <main id="main-content" style={{
        flex: 1,
        padding: '14px 16px',
        paddingTop: '74px',
        paddingLeft: isMobile ? '16px' : CONTENT_PAD_LEFT,
        width: '100%',
        boxSizing: 'border-box',
        transition: 'padding-left 0.22s ease',
      }}>
      {/* Skeleton de página (shimmer): la estructura aparece al instante y el
          módulo la rellena — sensación de velocidad estilo grandes plataformas */}
      <Suspense fallback={<SkeletonPantalla titulo="Cargando módulo" />}>

        {/* ── ROL: CAPATAZ ── */}
        {rol === 'capataz' && (
          <CapatazPanel
            cuadrillasActivas={cuadrillasActivas}
            cuadrillasDB={cuadrillasDB}
            personalDB={personalDB}
            hhAcumuladasDia={hhAcumuladasDia}
            isMobile={isMobile}
            showToast={showToast}
          />
        )}

        {/* ── ROL: CARTA BALANCE ── */}
        {rol === 'carta_balance' && (
          <CartaBalance
            cuadrillasActivas={cuadrillasActivas}
            personalDB={personalDB}
            isMobile={isMobile}
            showToast={showToast}
          />
        )}

        {/* ── ROL: INGENIERO + ADMIN + PLANEAMIENTO (modo demo entra como ingeniero) ── */}
        {(rol === 'ingeniero' || rol === 'admin' || rol === 'planeamiento') && (() => {
          // Items del sidebar agrupados por área. Nomenclatura profesional alineada a la
          // gestión de obras de construcción y a estándares de control de producción.
          // Nota: paleta calibrada para el sidebar navy oscuro — todos los colores tienen
          // luminancia suficiente para contrastar contra el fondo del sidebar y se ven en
          // estado activo (background del botón) y como icono (sin tornarse invisibles).
          const ITEMS_FULL = [
            // PLANEAMIENTO — flujo de proceso, WBS, cronograma (va primero).
            // El APU (Análisis de Precios) ya NO está en GRAPCO → migra a la plataforma de Costos aparte.
            { key: 'flujo',       label: 'Flujo de Planeamiento',   iconName: 'target',      color: '#e5a82f',    group: 'PLANEAMIENTO' },
            { key: 'cronogramaobra', label: 'Cronograma de Obra',   iconName: 'clock',       color: '#34d399',    group: 'PLANEAMIENTO' },
            { key: 'normaltec',   label: 'Normal Tecnológica',      iconName: 'layers',      color: '#fb923c',    group: 'PLANEAMIENTO' },
            { key: 'pullplanning', label: 'Pull Planning',          iconName: 'target',      color: '#a78bfa',    group: 'PLANEAMIENTO' },
            { key: 'lps',         label: 'Last Planner System',     iconName: 'target',      color: '#34d399',    group: 'PLANEAMIENTO' },
            { key: 'planvaciado', label: 'Plan de Vaciado',         iconName: 'target',      color: '#38bdf8',    group: 'PLANEAMIENTO' },
            // RESUMEN — el tablero "estado de obra" que reúne todo
            { key: 'estadoObra',  label: 'Estado de Obra',          iconName: 'dashboard',   color: BASE.gold,    group: 'RESUMEN' },
            // PRODUCCIÓN — control de avance, productividad y carta balance
            { key: 'dashboard',   label: 'Producción',              iconName: 'barChart3',   color: BASE.gold,    group: 'PRODUCCIÓN' },
            { key: 'radarProd',   label: 'Radar de Producción',     iconName: 'target',      color: '#f87171',    group: 'PRODUCCIÓN' },
            { key: 'registro',    label: 'Registro de Producción',  iconName: 'registro',    color: BASE.green,   group: 'PRODUCCIÓN' },
            { key: 'carta',       label: 'Carta Balance',           iconName: 'balance',     color: BASE.orange,  group: 'PRODUCCIÓN' },
            { key: 'warroom',     label: 'Sala de Operaciones',     iconName: 'target',      color: '#f87171',    group: 'PRODUCCIÓN' },
            // ALMACÉN — abastecimiento y logística
            { key: 'materiales',  label: 'Gestión de Materiales',   iconName: 'boxes',       color: '#c4b5fd',    group: 'ALMACÉN' },
            { key: 'compras',     label: 'Compras y Logística',     iconName: 'truck',       color: '#93c5fd',    group: 'ALMACÉN' },
            // BIM
            { key: 'bim',         label: 'Coordinación BIM',        iconName: 'layers',      color: '#38bdf8',    group: 'BIM' },
            { key: 'calidad',     label: 'Gestión de Calidad',      iconName: 'checkSquare', color: '#f9a8d4',    group: 'GESTIÓN DE CALIDAD' },
            { key: 'ot',          label: 'Oficina Técnica',         iconName: 'ruler',       color: '#a5b4fc',    group: 'OFICINA TÉCNICA' },
            // SSOMA (Seguridad y Medio Ambiente) movido a la plataforma independiente SIGMA (2026-06-15).
            // GERENCIA — vista ejecutiva multi-proyecto
            { key: 'gerencia',    label: 'Tablero Ejecutivo',       iconName: 'pulse',       color: '#fbbf24',    group: 'GERENCIA' },
            { key: 'proyectos',   label: 'Cartera de Proyectos',    iconName: 'mapPin',      color: '#5eead4',    group: 'GERENCIA' },
            { key: 'portfolio',   label: 'Portafolio Estratégico',  iconName: 'lineChart',   color: '#fcd34d',    group: 'GERENCIA' },
            { key: 'dashEjecutivo', label: 'Indicadores Diarios',   iconName: 'trendingUp',  color: '#fbbf24',    group: 'GERENCIA' },
            ...(rol === 'admin' ? [
              { key: 'admin', label: 'Administración del Sistema', iconName: 'shieldAdmin', color: BASE.red, group: 'ADMINISTRACIÓN' },
            ] : []),
          ];
          // Cada área ve SOLO sus módulos; admin (Administración) ve todos.
          const keysRol = keysPermitidasPorRol(rol);
          const SIDEBAR_ITEMS = keysRol
            ? ITEMS_FULL.filter(it => keysRol.includes(it.key))
            : ITEMS_FULL;
          const grupos = {};
          SIDEBAR_ITEMS.forEach(it => {
            const g = it.group || 'Módulos';
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(it);
          });

          return (
            <div style={{
              position: 'relative',
            }}>
              {/* Sidebar FIXED — debajo del navbar (top:60). Ocupa el resto del alto del
                  viewport. El navbar (z-index 102) queda visible ENCIMA en la franja superior.
                  Soporta modo COLAPSADO (60px, solo iconos) vía toggle. */}
              {!isMobile && (
                <aside style={{
                  width: `${SIDEBAR_W}px`,
                  background: `linear-gradient(180deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
                  borderRight: `1px solid rgba(255,255,255,0.08)`,
                  padding: '0',
                  position: 'fixed',
                  top: '60px',
                  left: '0',
                  height: 'calc(100dvh - 60px)',
                  overflowY: 'visible',
                  zIndex: 101,
                  boxShadow: '2px 0 12px rgba(15,23,42,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'width 0.22s ease',
                }}>
                  {/* Toggle colapsar/expandir — botón flotante en el borde derecho del sidebar */}
                  <button
                    onClick={toggleSidebar}
                    title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '-12px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: BASE.gold,
                      color: BASE.navy,
                      border: `2px solid ${BASE.navyDark}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '900',
                      lineHeight: 1,
                      padding: 0,
                      zIndex: 102,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {sidebarCollapsed ? '›' : '‹'}
                  </button>

                  <div style={{ flex: 1, minHeight: 0, padding: sidebarCollapsed ? '12px 6px' : '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
                  {/* Selector de FRENTE — dentro del área de Planeamiento y Producción.
                      El proyecto se eligió al entrar; aquí se cambia el frente. */}
                  {(rol === 'ingeniero' || rol === 'admin') && (
                    <SelectorFrenteLateral collapsed={sidebarCollapsed} />
                  )}
                  {Object.entries(grupos).map(([grupo, lista]) => (
                    <div key={grupo} style={{ marginBottom: '8px' }}>
                      {sidebarCollapsed ? (
                        // En modo colapsado: separador horizontal sutil entre grupos
                        <div style={{
                          height: '1px',
                          background: 'rgba(255,255,255,0.08)',
                          margin: '6px 8px',
                        }} />
                      ) : (
                        <div style={{
                          fontSize: '9px',
                          fontWeight: '900',
                          color: BASE.gold,
                          letterSpacing: '1.2px',
                          padding: '2px 8px 4px',
                          textTransform: 'uppercase',
                          opacity: 0.85,
                        }}>{grupo}</div>
                      )}
                      {lista.map((it, i) => {
                        const activo = moduloIngeniero === it.key;
                        return (
                          <button
                            key={it.key}
                            onClick={() => cambiarModuloIngeniero(it.key)}
                            onFocus={() => preloadModulo(it.key)}
                            title={sidebarCollapsed ? it.label : ''}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: sidebarCollapsed ? 0 : '9px',
                              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                              padding: sidebarCollapsed ? '8px 0' : '6px 9px',
                              marginBottom: '1px',
                              borderRadius: '7px',
                              background: activo ? `${it.color}22` : 'transparent',
                              border: 'none',
                              borderLeft: `3px solid ${activo ? it.color : 'transparent'}`,
                              paddingLeft: sidebarCollapsed ? 0 : '6px',
                              color: activo ? '#fff' : 'rgba(255,255,255,0.82)',
                              fontWeight: activo ? '700' : '600',
                              fontSize: '11.5px',
                              lineHeight: 1.25,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: '0.15s',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { preloadModulo(it.key); if (!activo) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
                            onMouseLeave={e => { if (!activo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.82)'; } }}
                          >
                            {!sidebarCollapsed && (
                              <span style={{
                                minWidth: '14px',
                                fontSize: '9.5px',
                                fontWeight: '900',
                                color: activo ? it.color : 'rgba(255,255,255,0.45)',
                              }}>{i + 1}</span>
                            )}
                            <Icon name={it.iconName} size={sidebarCollapsed ? 18 : 15} color={it.color} strokeWidth={1.85} />
                            {!sidebarCollapsed && <span style={{ flex: 1 }}>{it.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  </div>

                  {/* Footer GRAPCO — al fondo del sidebar (oculto cuando está colapsado) */}
                  {!sidebarCollapsed && (
                    <div style={{
                      padding: '10px 14px 14px',
                      borderTop: `1px solid rgba(255,255,255,0.08)`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        letterSpacing: '0.6px',
                        color: 'rgba(255,255,255,0.55)',
                      }}>GRAPCO S.A.C. © {new Date().getFullYear()}</span>
                      <span style={{
                        fontSize: '8.5px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        color: 'rgba(255,255,255,0.35)',
                      }}>Gestión Integral de Obra</span>
                    </div>
                  )}
                </aside>
              )}

              {/* Contenido principal — sin marginLeft adicional (el main ya tiene paddingLeft:226px) */}
              <div style={{ minWidth: 0 }}>
                {/* Menú móvil — drawer hamburguesa (todos los roles con sidebar) */}
                {isMobile && drawerOpen && (
                  <>
                    <div
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        position: 'fixed', left: 0, right: 0, top: '60px', bottom: 0,
                        background: 'rgba(8,16,24,0.55)', zIndex: 103, backdropFilter: 'blur(2px)',
                      }}
                    />
                    <aside style={{
                      position: 'fixed', top: '60px', left: 0, bottom: 0,
                      width: 'min(84vw, 300px)', zIndex: 104,
                      background: `linear-gradient(180deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
                      boxShadow: '6px 0 28px rgba(0,0,0,0.45)',
                      display: 'flex', flexDirection: 'column',
                      animation: 'grapco-pop-in 0.2s ease-out',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <span style={{ color: BASE.gold, fontSize: '12px', fontWeight: 900, letterSpacing: '1.4px' }}>MENÚ</span>
                        <button onClick={() => setDrawerOpen(false)} style={{
                          width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)',
                          background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '15px', fontWeight: 900, cursor: 'pointer',
                        }}>✕</button>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                        {Object.entries(grupos).map(([gLabel, items]) => (
                          <div key={gLabel} style={{ marginBottom: '8px' }}>
                            <p style={{
                              fontSize: '9px', fontWeight: 900, letterSpacing: '1.2px',
                              color: 'rgba(255,255,255,0.4)', padding: '7px 12px 5px',
                            }}>{gLabel}</p>
                            {items.map(it => {
                              const activo = moduloIngeniero === it.key;
                              return (
                                <button key={it.key} onClick={() => cambiarModuloIngeniero(it.key)}
                                  onMouseEnter={() => preloadModulo(it.key)} onTouchStart={() => preloadModulo(it.key)}
                                  style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: '11px',
                                  padding: '12px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                  marginBottom: '2px', textAlign: 'left',
                                  background: activo ? `${it.color}2e` : 'transparent',
                                  color: activo ? '#fff' : 'rgba(255,255,255,0.78)',
                                  fontWeight: activo ? 800 : 600, fontSize: '13.5px',
                                  borderLeft: `3px solid ${activo ? it.color : 'transparent'}`,
                                  transition: 'background 0.15s',
                                }}>
                                  <Icon name={it.iconName} size={18} color={activo ? it.color : 'rgba(255,255,255,0.6)'} strokeWidth={1.9} />
                                  <span style={{ flex: 1 }}>{it.label}</span>
                                  {activo && <span style={{ color: it.color, fontSize: '12px', fontWeight: 900 }}>●</span>}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.45)' }}>
                          GRAPCO S.A.C. © {new Date().getFullYear()}
                        </span>
                      </div>
                    </aside>
                  </>
                )}

            {/* Estado de Obra — tablero unificado (avance, CPI, PPC, calidad, seguridad) */}
            {moduloIngeniero === 'estadoObra' && (
              <EstadoObra irA={setModuloIngeniero} />
            )}

            {/* Dashboard */}
            {moduloIngeniero === 'dashboard' && (
              <Ingeniero
                historial={historial}
                cuadrillasActivas={cuadrillasActivas}
                cuadrillasDB={cuadrillasDB}
                personalDB={personalDB}
                planesDiarios={planesDiarios}
                configuracion={configuracion}
                asistencia={asistencia}
                isMobile={isMobile}
                showToast={showToast}
              />
            )}

            {/* Radar de Producción — alertas predictivas */}
            {moduloIngeniero === 'radarProd' && (
              <RadarProduccion isMobile={isMobile} />
            )}

            {/* Planeamiento — Flujo de Planeamiento (hub del proceso Last Planner/VDC) */}
            {moduloIngeniero === 'flujo' && (
              <FlujoPlaneamiento setModuloIngeniero={setModuloIngeniero} />
            )}

            {/* Planeamiento — Métricas VDC (tablero ejecutivo de objetivos) */}

            {/* Planeamiento — secciones del cronograma importadas del Excel */}
            {moduloIngeniero === 'cronogramaobra' && <CronogramaPro />}
            {moduloIngeniero === 'normaltec' && <GateProyectoLegacy modulo='La Normal Tecnológica' icono='ruler'><NormalTecnologica /></GateProyectoLegacy>}
            {moduloIngeniero === 'pullplanning' && <GateProyectoLegacy modulo='El Pull Planning' icono='layers'><PullPlanning /></GateProyectoLegacy>}
            {moduloIngeniero === 'planvaciado' && <GateProyectoLegacy modulo='El Plan de Vaciado' icono='cube'><PlanVaciado /></GateProyectoLegacy>}

            {/* Planeamiento — Last Planner System (módulo lateral propio) */}
            {moduloIngeniero === 'lps' && <LastPlannerPro />}

            {/* Registro de producción (vista capataz para ingeniero) */}
            {moduloIngeniero === 'registro' && (
              <Capataz
                cuadrillasActivas={cuadrillasActivas}
                cuadrillasDB={cuadrillasDB}
                personalDB={personalDB}
                hhAcumuladasDia={hhAcumuladasDia}
                isMobile={isMobile}
                showToast={showToast}
              />
            )}

            {/* Carta Balance */}
            {moduloIngeniero === 'carta' && (
              <CartaBalance
                cuadrillasActivas={cuadrillasActivas}
                personalDB={personalDB}
                isMobile={isMobile}
                showToast={showToast}
              />
            )}

            {/* War Room — Estado ejecutivo de cuadrillas */}
            {moduloIngeniero === 'warroom' && (
              <WarRoomCuadrillas historial={historial} />
            )}

            {/* Materiales — Modulo del Bloque 19 */}
            {moduloIngeniero === 'materiales' && (
              <MaterialesPanel showToast={showToast} />
            )}

            {/* Compras — OC/OS/Partidas/TC (Fases 1-7) */}
            {moduloIngeniero === 'compras' && (
              <ComprasPanel showToast={showToast} />
            )}

            {/* Bloque 21 - Plan Maestro WBS */}
            {moduloIngeniero === 'planMaestro' && (
              <PlanMaestroPanel showToast={showToast} />
            )}

            {/* Modelo BIM - acceso transversal */}
            {moduloIngeniero === 'bim' && (
              <BIM showToast={showToast} />
            )}

            {/* Bloque 22 - Panel Ejecutivo Gerencia */}
            {moduloIngeniero === 'gerencia' && (
              <PanelGerencia showToast={showToast} />
            )}

            {/* Bloque 23 - Multi-Proyecto Multi-Frente */}
            {moduloIngeniero === 'proyectos' && (
              <ProyectosPanel showToast={showToast} />
            )}

            {/* Bloque 24 - Portfolio Ejecutivo */}
            {moduloIngeniero === 'portfolio' && (
              <PortfolioPanel showToast={showToast} />
            )}

            {/* Dashboard Ejecutivo · Indicadores diarios (snapshot a Firestore) */}
            {moduloIngeniero === 'dashEjecutivo' && (
              <DashboardEjecutivo showToast={showToast} isMobile={isMobile} />
            )}

            {/* Calidad — Modulo Bloque 20 */}
            {moduloIngeniero === 'calidad' && (
              <CalidadPanel showToast={showToast} isMobile={isMobile} />
            )}

            {/* Oficina Tecnica — Modulo Bloque 20 */}
            {moduloIngeniero === 'ot' && (
              <OficinaTecnicaPanel showToast={showToast} isMobile={isMobile} />
            )}

            {/* SSOMA movido a la plataforma independiente SIGMA (2026-06-15). */}

            {/* Panel Admin (solo si rol === admin) */}
            {moduloIngeniero === 'admin' && rol === 'admin' && (
              <AdminPanel showToast={showToast} />
            )}
              </div>
            </div>
          );
        })()}

        {/* ── ROL: ALMACENERO / LOGISTICA (Bloque 19) ── */}
        {/* Desktop: menú lateral navy (mismo formato que Producción/Planeamiento y
            Oficina Técnica) que maneja las opciones del almacén; MaterialesPanel
            ocupa todo el ancho restante. Móvil: panel de tarjetas mobile-first. */}
        {(rol === 'almacenero' || rol === 'logistica') && (
          isMobile ? (
            <Almacenero showToast={showToast} isMobile={isMobile} />
          ) : (
            <div style={{ position: 'relative' }}>
              <AreaSidebar
                grupos={ALMACEN_SIDEBAR}
                activeKey={moduloAlmacen}
                onSelect={setModuloAlmacen}
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebar}
                sidebarWidth={SIDEBAR_W}
              />
              <div style={{ minWidth: 0 }}>
                <MaterialesPanel
                  showToast={showToast}
                  tabExterna={moduloAlmacen}
                  onChangeTab={(t) => setModuloAlmacen(TAB_TO_KEY_MAT[t] || 'materiales.dashboard')}
                />
              </div>
            </div>
          )
        )}

        {/* ── ROL: CALIDAD (Bloque 20) ── */}
        {rol === 'calidad' && (
          <CalidadPanel showToast={showToast} isMobile={isMobile} />
        )}

        {/* ── ROL: SUPERVISOR CLIENTE (Bloque 20) ── */}
        {rol === 'supervisor_cliente' && (
          <CalidadPanel showToast={showToast} isMobile={isMobile} />
        )}

        {/* ── ROL: OFICINA TÉCNICA ── */}
        {/* Desktop: menú lateral navy (igual que Producción y Planeamiento) que maneja
            las opciones del área; el panel ocupa todo el ancho restante. Móvil: el panel
            usa sus pestañas internas (sin sidebar fijo que tape el contenido). */}
        {rol === 'oficina_tecnica' && (
          isMobile ? (
            <OficinaTecnicaPanel showToast={showToast} isMobile={isMobile} />
          ) : (
            <div style={{ position: 'relative' }}>
              <AreaSidebar
                grupos={OT_SIDEBAR}
                activeKey={moduloOT}
                onSelect={setModuloOT}
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebar}
                sidebarWidth={SIDEBAR_W}
                topSlot={<SelectorFrenteLateral collapsed={sidebarCollapsed} />}
              />
              <div style={{ minWidth: 0 }}>
                <OficinaTecnicaPanel showToast={showToast} isMobile={isMobile} tabExterna={moduloOT} />
              </div>
            </div>
          )
        )}

        {/* ── ROL: SEGURIDAD / SSOMA → movido a la plataforma independiente SIGMA (2026-06-15) ── */}

        {/* ── ROL NO RECONOCIDO ── */}
        {rol && !['capataz', 'carta_balance', 'ingeniero', 'admin', 'almacenero', 'logistica', 'calidad', 'supervisor_cliente', 'oficina_tecnica'].includes(rol) && (
          <div style={{
            maxWidth: '400px',
            margin: '60px auto',
            textAlign: 'center',
            padding: '40px 24px',
            background: BASE.white,
            borderRadius: '16px',
            border: `1px solid ${BASE.border}`,
          }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</p>
            <p style={{ fontSize: '15px', fontWeight: '700', color: BASE.navy, marginBottom: '8px' }}>
              Rol no reconocido
            </p>
            <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '20px' }}>
              Tu cuenta tiene el rol <strong>"{rol}"</strong> que aún no tiene
              una vista asignada. Contacta al administrador.
            </p>
            <button
              onClick={salir}
              style={{
                padding: '10px 24px',
                background: BASE.navy,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </Suspense>
      </main>
    </div>
  );
}
