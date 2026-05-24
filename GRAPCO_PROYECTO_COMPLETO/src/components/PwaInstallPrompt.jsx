// src/components/PwaInstallPrompt.jsx
// Banner flotante "Instalar GRAPCO en tu dispositivo" cuando el navegador lo permite.
// Maneja:
//   - beforeinstallprompt (Chrome/Edge desktop+mobile)
//   - Detección iOS Safari (instrucciones manuales, no soporta beforeinstallprompt)
//   - Persistencia: si el usuario rechaza, no volver a mostrar por 7 días
//   - Detección de "ya instalada" (display-mode standalone)

import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const STORAGE_KEY = 'grapco_pwa_dismissed';
const DISMISS_DAYS = 7;

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mostrar, setMostrar] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const { esDark } = useTheme();

  useEffect(() => {
    // Detectar si ya está instalada
    const yaInstalada = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (yaInstalada) return;

    // Detectar si dismissed recientemente
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const diasPasados = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (diasPasados < DISMISS_DAYS) return;
    }

    // Detectar iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsIOS(ios);

    // En iOS, mostrar instrucciones manuales después de 5s
    if (ios) {
      const timer = setTimeout(() => setMostrar(true), 5000);
      return () => clearTimeout(timer);
    }

    // Chrome/Edge: escuchar beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrar(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const instalar = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setMostrar(false);
    } else {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setMostrar(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setMostrar(false);
  };

  if (!mostrar) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-title"
      className="anim-slide-up"
      style={{
        position: 'fixed',
        bottom: '20px', left: '20px', right: '20px',
        maxWidth: '420px',
        margin: '0 auto',
        background: esDark ? '#1e293b' : '#fff',
        color: esDark ? '#e2e8f0' : '#1e293b',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        border: `2px solid ${esDark ? '#334155' : '#fef3c7'}`,
        borderLeft: `5px solid #f59e0b`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        zIndex: 9999,
      }}>
      <div style={{
        width: '44px', height: '44px',
        borderRadius: '11px',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', flexShrink: 0,
        boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
      }}>📱</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p id="pwa-title" style={{ fontSize: '13px', fontWeight: '900', marginBottom: '4px', letterSpacing: '0.3px' }}>
          Instala GRAPCO en tu {esIOS ? 'iPhone' : 'dispositivo'}
        </p>
        <p style={{ fontSize: '11px', opacity: 0.85, lineHeight: 1.5, marginBottom: '10px' }}>
          {esIOS
            ? <>Toca <strong>Compartir</strong> ⬆️ y luego <strong>"Añadir a pantalla de inicio"</strong> para usar GRAPCO como app nativa.</>
            : 'Acceso directo desde tu home, funciona offline, más rápido.'}
        </p>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!esIOS && (
            <button onClick={instalar} className="btn-feedback" style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', border: 'none',
              borderRadius: '8px',
              fontSize: '11px', fontWeight: '900',
              letterSpacing: '0.4px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
            }}>📲 INSTALAR</button>
          )}
          <button onClick={dismiss} aria-label="Cerrar invitación" className="btn-feedback" style={{
            padding: '8px 14px',
            background: esDark ? '#334155' : '#f1f5f9',
            color: esDark ? '#e2e8f0' : '#64748b',
            border: 'none', borderRadius: '8px',
            fontSize: '11px', fontWeight: '700', cursor: 'pointer',
          }}>Más tarde</button>
        </div>
      </div>
    </div>
  );
}
