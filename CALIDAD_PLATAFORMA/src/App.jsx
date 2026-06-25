// src/App.jsx — GESTIÓN DE CALIDAD (plataforma independiente)
// Extraído de GRAPCO (24/06/2026). App enfocada en el Bloque 20 de Calidad:
// Protocolos (Pre-Vaciado CAL-FOR-006, por elemento, CAL-FOR), PETs, No
// Conformidades, Ensayos, Planos, Archivo de PDFs firmados (sync a Drive) y BIM.
// Reusa el mismo chasis (contexts, login) con su propio Firebase y su Cloud
// Function de archivado a Google Drive (functions/protocolosArchivado.js).

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProyectoActivoProvider, useProyectoActivo } from './contexts/ProyectoActivoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import ActualizacionBanner from './components/ActualizacionBanner';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import SkeletonPantalla from './components/SkeletonPantalla';
import Login from './views/Login';
import { BASE } from './utils/styles';

const CalidadPanel = lazy(() => import('./views/CalidadPanel'));

// Roles que el RoleGuard de CalidadPanel acepta. Un usuario cuyo rolPermitido
// es 'oficina_tecnica' entra como 'calidad' (lo permite ROLES_PERMITIDOS).
const ROLES_GUARD = ['admin', 'ingeniero', 'calidad', 'supervisor_cliente'];

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

function AppInnerKeyed() {
  const { proyectoActivoId } = useProyectoActivo();
  return <AppInner key={proyectoActivoId || 'default'} />;
}

function AppInner() {
  const { user, rol, rolPermitido, loading, logout, esDemo, entrarComoRol, areaAuto } = useAuth();
  const { notify } = useNotifications();
  const [ww, setWw] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = ww < 880;

  const showToast = useCallback((msg, type = 'success') => {
    notify({ tipo: type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'success', titulo: msg });
  }, [notify]);

  // La app ES Calidad: en cuanto hay sesión, activamos el rol adecuado para que
  // el RoleGuard del panel deje pasar. supervisor_cliente ya entra solo (areaAuto).
  useEffect(() => {
    if (!user || rol || areaAuto) return;
    const destino = ROLES_GUARD.includes(rolPermitido) ? rolPermitido
                  : (rolPermitido === 'oficina_tecnica' ? 'calidad' : rolPermitido);
    if (destino) entrarComoRol(destino);
  }, [user, rol, rolPermitido, areaAuto, entrarComoRol]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BASE.bg, color: BASE.muted, fontSize: 13 }}>
        Cargando…
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%', maxWidth: '100vw', background: BASE.bg, fontFamily: BASE.font, boxSizing: 'border-box' }}>
      {esDemo && (
        <div style={{ background: 'linear-gradient(90deg,#1e3a5f,#152a47)', borderBottom: '2px solid #f59e0b', padding: '7px 16px', fontSize: 11, fontWeight: 700, color: '#fbbf24', textAlign: 'center', flexShrink: 0, letterSpacing: '0.3px' }}>
          MODO DEMO · Solo lectura, los cambios no se guardan
        </div>
      )}

      <Navbar rol={rol || rolPermitido || 'calidad'} isMobile={isMobile} onSalir={() => logout()} />

      <OfflineBanner />

      <main id="main-content" style={{
        flex: 1, padding: '14px 16px',
        paddingTop: 'calc(74px + env(safe-area-inset-top))',
        width: '100%', boxSizing: 'border-box',
      }}>
        <Suspense fallback={<SkeletonPantalla titulo="Cargando Gestión de Calidad" />}>
          <CalidadPanel showToast={showToast} isMobile={isMobile} />
        </Suspense>
      </main>
    </div>
  );
}
