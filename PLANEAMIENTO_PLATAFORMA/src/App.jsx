// src/App.jsx — PLANEAMIENTO (plataforma independiente)
// Extraído de GRAPCO (24/06/2026). App enfocada en el ciclo Last Planner / VDC:
// Flujo de Planeamiento, Cronograma CPM, Normal Tecnológica, Pull Planning,
// Last Planner System y Plan de Vaciado. Reusa el mismo chasis (contexts, login,
// shell navy) pero con su propio Firebase y sin los módulos de Producción/Calidad.

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProyectoActivoProvider, useProyectoActivo } from './contexts/ProyectoActivoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AreaSidebar from './components/AreaSidebar';
import SelectorFrenteLateral from './components/SelectorFrenteLateral';
import OfflineBanner from './components/OfflineBanner';
import ActualizacionBanner from './components/ActualizacionBanner';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import SkeletonPantalla from './components/SkeletonPantalla';
import GateProyectoLegacy from './components/GateProyectoLegacy';
import Login from './views/Login';
import { BASE } from './utils/styles';

// ── Módulos de Planeamiento (lazy) ──
const FlujoPlaneamiento = lazy(() => import('./views/planeamiento/FlujoPlaneamiento'));
const CronogramaPro     = lazy(() => import('./views/planeamiento/CronogramaPro'));
const NormalTecnologica = lazy(() => import('./views/planeamiento/NormalTecnologica'));
const PullPlanning      = lazy(() => import('./views/planeamiento/PullPlanning'));
const PlanVaciado       = lazy(() => import('./views/planeamiento/PlanVaciado'));
const LastPlannerPro    = lazy(() => import('./views/planeamiento/LastPlannerPro'));
// Control LPS / EVM (movido del dashboard de Producción de GRAPCO — 2026-06-24).
const ControlObra       = lazy(() => import('./views/planeamiento/ControlObra'));

// Sidebar navy de Planeamiento.
const GRUPOS = {
  PLANEAMIENTO: [
    { key: 'flujo',          label: 'Flujo de Planeamiento', iconName: 'target',  color: '#e5a82f' },
    { key: 'cronogramaobra', label: 'Cronograma de Obra',    iconName: 'clock',   color: '#34d399' },
    { key: 'normaltec',      label: 'Normal Tecnológica',    iconName: 'layers',  color: '#fb923c' },
    { key: 'pullplanning',   label: 'Pull Planning',         iconName: 'target',  color: '#a78bfa' },
    { key: 'lps',            label: 'Last Planner System',   iconName: 'target',  color: '#34d399' },
    { key: 'planvaciado',    label: 'Plan de Vaciado',       iconName: 'target',  color: '#38bdf8' },
  ],
  'CONTROL · LPS / EVM': [
    { key: 'vdc',        label: 'VDC · Lookahead (LAP)', iconName: 'target',    color: '#22d3ee' },
    { key: 'plandiario', label: 'Programación Diaria',   iconName: 'registro',  color: '#34d399' },
    { key: 'cpieac',     label: 'CPI / EAC',             iconName: 'lineChart', color: '#fbbf24' },
    { key: 'curvas',     label: 'Curva S (EVM)',         iconName: 'lineChart', color: '#5eead4' },
  ],
};
const KEYS_VALIDAS = Object.values(GRUPOS).flat().map(i => i.key);
const KEYS_CONTROL = ['vdc', 'plandiario', 'cpieac', 'curvas'];
const PRELOAD = {
  flujo:          () => import('./views/planeamiento/FlujoPlaneamiento'),
  cronogramaobra: () => import('./views/planeamiento/CronogramaPro'),
  normaltec:      () => import('./views/planeamiento/NormalTecnologica'),
  pullplanning:   () => import('./views/planeamiento/PullPlanning'),
  lps:            () => import('./views/planeamiento/LastPlannerPro'),
  planvaciado:    () => import('./views/planeamiento/PlanVaciado'),
};

export default function App() {
  return (
    <AuthProvider>
      <ProyectoActivoProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <AppInnerKeyed />
              <PwaInstallPrompt />
              <ActualizacionBanner />
            </ErrorBoundary>
          </NotificationProvider>
        </ThemeProvider>
      </ProyectoActivoProvider>
    </AuthProvider>
  );
}

// Remonta el árbol al cambiar de proyecto → cambio instantáneo con estado limpio.
function AppInnerKeyed() {
  const { proyectoActivoId } = useProyectoActivo();
  return <AppInner key={proyectoActivoId || 'default'} />;
}

function AppInner() {
  const { user, rol, rolPermitido, loading, logout, esDemo } = useAuth();
  const [modulo, setModulo] = useState('flujo');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('plan_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const [ww, setWw] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = ww < 880;

  // Precarga en segundo plano de los módulos (cambio instantáneo al hacer clic).
  useEffect(() => {
    if (!user) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    Object.values(PRELOAD).forEach((t, i) => idle(() => t().catch(() => {}), { timeout: 2500 + i * 300 }));
  }, [user]);

  const toggleSidebar = () => setCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('plan_sidebar_collapsed', next ? '1' : '0'); } catch { /* noop */ }
    return next;
  });
  const preload = useCallback((k) => { PRELOAD[k]?.().catch(() => {}); }, []);
  const irA = useCallback((k) => {
    // FlujoPlaneamiento puede pedir módulos de Producción (registro/carta) que
    // ya no viven aquí: ignoramos los que no son de Planeamiento.
    if (KEYS_VALIDAS.includes(k)) { setModulo(k); setDrawerOpen(false); }
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BASE.bg, color: BASE.muted, fontSize: 13 }}>
        Cargando…
      </div>
    );
  }
  if (!user) return <Login />;

  const SIDEBAR_W = collapsed ? 60 : 210;
  const CONTENT_PAD_LEFT = `${SIDEBAR_W + 16}px`;

  const contenido = (
    <Suspense fallback={<SkeletonPantalla titulo="Cargando módulo" />}>
      <div className="anim-fade-in" key={modulo}>
        {modulo === 'flujo'          && <FlujoPlaneamiento setModuloIngeniero={irA} />}
        {modulo === 'cronogramaobra' && <CronogramaPro />}
        {modulo === 'normaltec'      && <GateProyectoLegacy modulo="La Normal Tecnológica" icono="ruler"><NormalTecnologica /></GateProyectoLegacy>}
        {modulo === 'pullplanning'   && <GateProyectoLegacy modulo="El Pull Planning" icono="layers"><PullPlanning /></GateProyectoLegacy>}
        {modulo === 'planvaciado'    && <GateProyectoLegacy modulo="El Plan de Vaciado" icono="cube"><PlanVaciado /></GateProyectoLegacy>}
        {modulo === 'lps'            && <LastPlannerPro />}
        {KEYS_CONTROL.includes(modulo) && <ControlObra vista={modulo} isMobile={isMobile} />}
      </div>
    </Suspense>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%', maxWidth: '100vw', background: BASE.bg, fontFamily: BASE.font, boxSizing: 'border-box' }}>
      {esDemo && (
        <div style={{ background: 'linear-gradient(90deg,#1e3a5f,#152a47)', borderBottom: '2px solid #f59e0b', padding: '7px 16px', fontSize: 11, fontWeight: 700, color: '#fbbf24', textAlign: 'center', flexShrink: 0, letterSpacing: '0.3px' }}>
          MODO DEMO · Solo lectura, los cambios no se guardan
        </div>
      )}

      <Navbar rol={rol || rolPermitido || 'planeamiento'} isMobile={isMobile} onSalir={() => logout()}
        onMenu={isMobile ? () => setDrawerOpen(true) : undefined} />

      <OfflineBanner />

      {/* Sidebar desktop */}
      {!isMobile && (
        <AreaSidebar
          grupos={GRUPOS}
          activeKey={modulo}
          onSelect={irA}
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
          sidebarWidth={SIDEBAR_W}
          onHoverItem={preload}
          topSlot={<SelectorFrenteLateral collapsed={collapsed} />}
        />
      )}

      {/* Drawer móvil */}
      {isMobile && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100 }} />
          <AreaSidebar
            grupos={GRUPOS}
            activeKey={modulo}
            onSelect={irA}
            collapsed={false}
            sidebarWidth={230}
            topSlot={<SelectorFrenteLateral collapsed={false} />}
          />
        </>
      )}

      <main id="main-content" style={{
        flex: 1, padding: '14px 16px',
        paddingTop: 'calc(74px + env(safe-area-inset-top))',
        paddingLeft: isMobile ? '16px' : CONTENT_PAD_LEFT,
        width: '100%', boxSizing: 'border-box', transition: 'padding-left 0.22s ease',
      }}>
        {contenido}
      </main>
    </div>
  );
}
