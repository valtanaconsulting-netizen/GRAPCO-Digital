// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProyectoActivoProvider, useProyectoActivo } from './contexts/ProyectoActivoContext';
import { CUADRILLAS_MAESTRAS as CUADRILLAS_DEFAULT } from './utils/constants';
import { BASE, LOGO } from './utils/styles';
import { hoy } from './utils/helpers';

import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AppShell from './components/AppShell';
import Icon from './components/Icon';

// Items del sidebar para roles que no son admin/ingeniero (estaticos)
const ROL_ITEMS = {
  capataz:           [{ key: 'capataz',  label: 'Panel del Capataz',       iconName: 'hardhat',    color: '#16a34a', group: 'MI ÁREA' }],
  carta_balance:     [{ key: 'carta',    label: 'Carta Balance',           iconName: 'balance',    color: '#7c3aed', group: 'MI ÁREA' }],
  almacenero:        [{ key: 'almacen',  label: 'Almacén',                 iconName: 'package',    color: '#7c3aed', group: 'MI ÁREA' }],
  logistica:         [{ key: 'almacen',  label: 'Logística',               iconName: 'cart',       color: '#2563eb', group: 'MI ÁREA' }],
  calidad:           [{ key: 'calidad',  label: 'Gestión de Calidad',      iconName: 'shield',     color: '#ec4899', group: 'MI ÁREA' }],
  supervisor_cliente:[{ key: 'calidad',  label: 'Supervisión del Cliente', iconName: 'shield',     color: '#0ea5e9', group: 'MI ÁREA' }],
  oficina_tecnica:   [{ key: 'ot',       label: 'Oficina Técnica',         iconName: 'fileText',   color: '#6366f1', group: 'MI ÁREA' }],
  seguridad:         [{ key: 'seguridad',label: 'Seguridad y Medio Ambiente', iconName: 'alert',   color: '#dc2626', group: 'MI ÁREA' }],
  planeamiento:      [
    { key: 'planMaestro', label: 'Plan Maestro (WBS)',        iconName: 'tree',       color: '#1e3a5f',    group: 'PLANEAMIENTO' },
    { key: 'apus',        label: 'Análisis de Precios (APU)', iconName: 'calculator', color: '#6366f1',    group: 'PLANEAMIENTO' },
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

import {
  useHistorial, useCuadrillas, usePersonal,
  usePlanesDiarios, useConfiguracion, useAsistenciaDiaria,
} from './hooks/useFirebaseData';

// Login y SelectorPerfil son la puerta de entrada → carga eager.
import Login from './views/Login';
import SelectorPerfil from './views/SelectorPerfil';
import SelectorProyectoFrente from './components/SelectorProyectoFrente';
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
  apus:        () => import('./views/modulos/apus/APUsPanel'),
  gerencia:    () => import('./views/modulos/panelGerencia/PanelGerencia'),
  proyectos:   () => import('./views/modulos/proyectos/ProyectosPanel'),
  portfolio:   () => import('./views/modulos/portfolio/PortfolioPanel'),
  bim:         () => import('./views/BIM'),
  capataz:     () => import('./views/capataz/CapatazPanel'),
  seguridad:   () => import('./views/seguridad/SeguridadPanel'),
  lps:         () => import('./views/Ingeniero'),
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
const APUsPanel           = lazy(() => import('./views/modulos/apus/APUsPanel'));
const LookaheadLAP        = lazy(() => import('./views/planeamiento/LookaheadLAP'));
const PanelGerencia       = lazy(() => import('./views/modulos/panelGerencia/PanelGerencia'));
const ProyectosPanel      = lazy(() => import('./views/modulos/proyectos/ProyectosPanel'));
const PortfolioPanel      = lazy(() => import('./views/modulos/portfolio/PortfolioPanel'));
const DashboardEjecutivo  = lazy(() => import('./views/modulos/dashboardEjecutivo/DashboardEjecutivo'));
const RadarProduccion     = lazy(() => import('./views/modulos/radarProduccion/RadarProduccion'));
const BIM                 = lazy(() => import('./views/BIM'));
const CapatazPanel        = lazy(() => import('./views/capataz/CapatazPanel'));
const SeguridadPanel      = lazy(() => import('./views/seguridad/SeguridadPanel'));

// ── Alcance de módulos por ÁREA (sidebar del shell ingeniero/admin/planeamiento) ──
// Cada área ve SOLO sus módulos. Únicamente Administración (admin) ve todos.
//   - ingeniero  → Producción: avance, registro, carta balance, sala de operaciones, materiales, BIM
//   - planeamiento → WBS, APU, Last Planner
//   - admin      → null = TODOS los módulos (acceso completo)
// Ingeniería de Producción ahora ABSORBE Planeamiento (Plan Maestro, APU, Last Planner).
const KEYS_PRODUCCION  = ['dashboard', 'radarProd', 'registro', 'carta', 'warroom', 'planMaestro', 'apus', 'lps', 'lookahead', 'materiales', 'bim'];
const KEYS_PLANEAMIENTO = ['planMaestro', 'apus', 'lps', 'lookahead'];
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
            <AppInner />
            <PwaInstallPrompt />
          </ErrorBoundary>
        </NotificationProvider>
        </ThemeProvider>
      </ProyectoActivoProvider>
    </AuthProvider>
  );
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
    const tasks = [
      () => import('./views/Ingeniero'),
      () => import('./views/CartaBalanceWrapper'),
      () => import('./views/WarRoomCuadrillas'),
      () => import('./views/modulos/planMaestro/PlanMaestroPanel'),
      () => import('./views/modulos/apus/APUsPanel'),
      () => import('./views/ComprasPanel'),
      () => import('./views/MaterialesPanel'),
      () => import('./views/BIM'),
      () => import('./views/CalidadPanel'),
      () => import('./views/OficinaTecnicaPanel'),
      () => import('./views/seguridad/SeguridadPanel'),
    ];
    const ids = [];
    tasks.forEach((t, i) => {
      const id = idle(() => { t().catch(() => {}); }, { timeout: 4000 + i * 600 });
      ids.push(id);
    });
    return () => ids.forEach(id => { try { cancel(id); } catch { /* noop */ } });
  }, [rol]);
  const { notify } = useNotifications();

  const [moduloIngeniero, setModuloIngeniero] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false); // menú móvil (hamburguesa)

  // Si el módulo activo no está permitido para el área actual, salta al primero permitido.
  // (Ej.: Planeamiento no incluye "Producción" → arranca en Plan Maestro.)
  useEffect(() => {
    const keys = keysPermitidasPorRol(rol);
    if (keys && keys.length && !keys.includes(moduloIngeniero)) {
      setModuloIngeniero(keys[0]);
    }
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
      // 1) Cuadrillas del proyecto activo (filtradas por contexto).
      let r = construir(cuadrillasDBFiltrado);
      if (Object.keys(r).length > 0) return r;
      // 2) Si el filtro no devolvió nada pero SÍ hay cuadrillas reales
      //    (ej. cuadrillas legacy sin proyectoId), las usamos igual — así
      //    el capataz aparece para todos sin tener que re-editar la cuadrilla.
      r = construir(cuadrillasDB);
      if (Object.keys(r).length > 0) return r;
    } catch (e) {
      console.warn('[cuadrillasActivas] error', e);
    }
    // 3) Último recurso: defaults genéricos (solo si no hay NINGUNA cuadrilla).
    return CUADRILLAS_DEFAULT || {};
  }, [cuadrillasDBFiltrado, cuadrillasDB]);

  // ── Pantalla de carga inicial (acabado premium navy) ──
  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '22px',
        background: 'radial-gradient(120% 90% at 50% 28%, #143256 0%, #0B1F39 46%, #061226 100%)',
        fontFamily: BASE.font, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        {/* Viñeta para profundidad */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(130% 110% at 50% 40%, transparent 52%, rgba(3,9,18,0.72) 100%)' }} />

        {/* Logo con anillos dorados + halo */}
        <div style={{ position: 'relative', width: 108, height: 108, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <span style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%',
            background: `radial-gradient(circle, ${BASE.gold}26 0%, transparent 68%)` }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid transparent', borderTopColor: BASE.gold, borderRightColor: BASE.gold,
            animation: 'spin 1.05s cubic-bezier(0.5,0.1,0.5,0.9) infinite',
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid transparent',
            borderBottomColor: 'rgba(229,168,47,0.25)', borderLeftColor: 'rgba(229,168,47,0.25)',
            animation: 'spin 2.4s linear infinite reverse',
          }} />
          <img src={LOGO} alt="GRAPCO" style={{ width: 66, height: 66, borderRadius: 16, background: '#fff', padding: 5, boxShadow: '0 12px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)', objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3 }}>
            GRAPCO <span style={{ color: BASE.gold }}>S.A.C.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ height: 1, width: 26, background: `linear-gradient(90deg, transparent, ${BASE.gold}aa)` }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2.6, color: BASE.gold, textTransform: 'uppercase' }}>
              Plataforma Integral de Gestión de Obra
            </span>
            <span style={{ height: 1, width: 26, background: `linear-gradient(90deg, ${BASE.gold}aa, transparent)` }} />
          </div>
        </div>

        {/* Barra de progreso indeterminada */}
        <div style={{ width: 210, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden', zIndex: 1 }}>
          <div style={{ height: '100%', width: '40%', borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${BASE.gold}, transparent)`,
            animation: 'gp-load 1.3s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5, color: '#8198b3', textTransform: 'uppercase', zIndex: 1 }}>
          Cargando plataforma…
        </div>

        <style>{'@keyframes gp-load { 0% { transform: translateX(-160%); } 100% { transform: translateX(420%); } }'}</style>
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

      {/* Bloque 23 - Selector global Proyecto + Frente — paddingTop compensa el navbar
          fixed (60px) + paddingLeft compensa el sidebar fixed (dinámico). */}
      {(rol === 'admin' || rol === 'ingeniero') && (
        <div style={{
          paddingTop: '70px',
          paddingLeft: isMobile ? '16px' : CONTENT_PAD_LEFT,
          paddingRight: '16px',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'padding-left 0.22s ease',
        }}>
          <SelectorProyectoFrente />
        </div>
      )}

      {/* Contenido principal — compensa navbar fixed (60px arriba) y sidebar fixed (dinámico). */}
      <main id="main-content" style={{
        flex: 1,
        padding: '14px 16px',
        paddingTop: (rol === 'admin' || rol === 'ingeniero') ? '14px' : '74px',
        paddingLeft: isMobile ? '16px' : CONTENT_PAD_LEFT,
        width: '100%',
        boxSizing: 'border-box',
        transition: 'padding-left 0.22s ease',
      }}>
      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12, color: BASE.muted }}>
          <span style={{ position: 'relative', display: 'inline-block', width: 38, height: 38 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2.5px solid transparent`, borderTopColor: BASE.gold, borderRightColor: BASE.gold, animation: 'spin 1s cubic-bezier(0.5,0.1,0.5,0.9) infinite' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2.5px solid transparent`, borderBottomColor: BASE.gold + '40', borderLeftColor: BASE.gold + '40', animation: 'spin 2s linear infinite reverse' }} />
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Cargando módulo…</span>
        </div>
      }>

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
            // PLANEAMIENTO — WBS, costos unitarios, cronograma (va primero)
            { key: 'planMaestro', label: 'Plan Maestro (WBS)',      iconName: 'compass',     color: '#60a5fa',    group: 'PLANEAMIENTO' },
            { key: 'apus',        label: 'Análisis de Precios (APU)', iconName: 'coins',     color: '#a5b4fc',    group: 'PLANEAMIENTO' },
            { key: 'lps',         label: 'Last Planner System',     iconName: 'target',      color: '#34d399',    group: 'PLANEAMIENTO' },
            { key: 'lookahead',   label: 'Lookahead (LAP)',         iconName: 'clock',       color: '#2dd4bf',    group: 'PLANEAMIENTO' },
            // PRODUCCIÓN — control de avance, productividad y carta balance
            { key: 'dashboard',   label: 'Producción',              iconName: 'barChart3',   color: BASE.gold,    group: 'PRODUCCIÓN' },
            { key: 'radarProd',   label: 'Radar de Producción',     iconName: 'target',      color: '#f87171',    group: 'PRODUCCIÓN' },
            { key: 'registro',    label: 'Registro de Producción',  iconName: 'registro',    color: BASE.green,   group: 'PRODUCCIÓN' },
            { key: 'carta',       label: 'Carta Balance',           iconName: 'balance',     color: BASE.orange,  group: 'PRODUCCIÓN' },
            { key: 'warroom',     label: 'Sala de Operaciones',     iconName: 'target',      color: '#f87171',    group: 'PRODUCCIÓN' },
            // RECURSOS — abastecimiento y logística
            { key: 'materiales',  label: 'Gestión de Materiales',   iconName: 'boxes',       color: '#c4b5fd',    group: 'RECURSOS' },
            { key: 'compras',     label: 'Compras y Logística',     iconName: 'truck',       color: '#93c5fd',    group: 'RECURSOS' },
            // BIM
            { key: 'bim',         label: 'Coordinación BIM',        iconName: 'layers',      color: '#38bdf8',    group: 'BIM' },
            { key: 'calidad',     label: 'Gestión de Calidad',      iconName: 'checkSquare', color: '#f9a8d4',    group: 'GESTIÓN DE CALIDAD' },
            { key: 'ot',          label: 'Oficina Técnica',         iconName: 'ruler',       color: '#a5b4fc',    group: 'OFICINA TÉCNICA' },
            // SSOMA — seguridad y medio ambiente
            { key: 'seguridad',   label: 'Seguridad y Medio Ambiente', iconName: 'alert',    color: '#f87171',    group: 'SSOMA' },
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
                            onMouseEnter={() => preloadModulo(it.key)}
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
                            onMouseEnter={e => { if (!activo) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
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

            {/* Planeamiento — Last Planner System (módulo lateral propio) */}
            {moduloIngeniero === 'lps' && (
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
                vistaInicial="vdc"
                soloPlaneamiento
              />
            )}

            {/* Planeamiento — Lookahead Planning (LAP), las 28 semanas del LAP oficial */}
            {moduloIngeniero === 'lookahead' && <LookaheadLAP />}

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

            {/* Bloque 21 - APUs */}
            {moduloIngeniero === 'apus' && (
              <APUsPanel showToast={showToast} />
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

            {/* SSOMA — Seguridad y Medio Ambiente */}
            {moduloIngeniero === 'seguridad' && (
              <SeguridadPanel showToast={showToast} isMobile={isMobile} />
            )}

            {/* Panel Admin (solo si rol === admin) */}
            {moduloIngeniero === 'admin' && rol === 'admin' && (
              <AdminPanel showToast={showToast} />
            )}
              </div>
            </div>
          );
        })()}

        {/* ── ROL: ALMACENERO / LOGISTICA (Bloque 19) ── */}
        {(rol === 'almacenero' || rol === 'logistica') && (
          <Almacenero showToast={showToast} isMobile={isMobile} />
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
        {rol === 'oficina_tecnica' && (
          <OficinaTecnicaPanel showToast={showToast} isMobile={isMobile} />
        )}

        {/* ── ROL: SEGURIDAD / SSOMA ── */}
        {rol === 'seguridad' && (
          <SeguridadPanel showToast={showToast} isMobile={isMobile} />
        )}

        {/* ── ROL NO RECONOCIDO ── */}
        {rol && !['capataz', 'carta_balance', 'ingeniero', 'admin', 'almacenero', 'logistica', 'calidad', 'supervisor_cliente', 'oficina_tecnica', 'seguridad'].includes(rol) && (
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
