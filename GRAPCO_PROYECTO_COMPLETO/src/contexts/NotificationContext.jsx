// src/context/NotificationContext.jsx
// Sistema de notificaciones rico:
//   - 4 tipos: success | error | warning | info
//   - Acción inline opcional (ej. "Deshacer", "Ver más")
//   - Auto-dismiss configurable
//   - Apilamiento (múltiples notificaciones simultáneas)
//   - Centro de notificaciones (historial)
//
// Uso:
//   const { notify } = useNotifications();
//   notify({ tipo: 'success', titulo: '✅ Guardado', mensaje: 'Cambios persistidos' });
//   notify({ tipo: 'error', titulo: 'Falló', accion: { label: 'Reintentar', onClick: ... } });

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useTheme } from './ThemeContext';

const NotificationContext = createContext(null);

let nextId = 1;

const TIPOS = {
  success: { color: '#16a34a', bg: '#dcfce7', icon: '✅', textColor: '#15803d' },
  error:   { color: '#dc2626', bg: '#fee2e2', icon: '❌', textColor: '#991b1b' },
  warning: { color: '#d97706', bg: '#fef3c7', icon: '⚠️', textColor: '#92400e' },
  info:    { color: '#1e3a5f', bg: '#eff6ff', icon: 'ℹ️', textColor: '#1e3a5f' },
};

export function NotificationProvider({ children }) {
  const [activas, setActivas] = useState([]);
  const [historial, setHistorial] = useState([]);

  const remove = useCallback((id) => {
    setActivas((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((opts) => {
    const id = nextId++;
    const notif = {
      id,
      tipo: opts.tipo || 'info',
      titulo: opts.titulo || '',
      mensaje: opts.mensaje || '',
      accion: opts.accion || null,  // { label, onClick }
      duracion: opts.duracion ?? 4500,
      timestamp: Date.now(),
    };
    setActivas((prev) => [...prev, notif].slice(-5));  // máx 5 visibles
    setHistorial((prev) => [notif, ...prev].slice(0, 50));  // últimas 50

    if (notif.duracion > 0) {
      setTimeout(() => remove(id), notif.duracion);
    }
    return id;
  }, [remove]);

  const limpiarHistorial = useCallback(() => setHistorial([]), []);

  const valor = useMemo(() => ({
    notify, remove, activas, historial, limpiarHistorial,
  }), [notify, remove, activas, historial, limpiarHistorial]);

  return (
    <NotificationContext.Provider value={valor}>
      {children}
      <NotificationStack activas={activas} onClose={remove} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications dentro de <NotificationProvider>');
  return ctx;
}

// ── Stack de notificaciones ──
function NotificationStack({ activas, onClose }) {
  const { esDark } = useTheme();
  if (activas.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '80px', right: '16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 9000,
        maxWidth: '380px',
        pointerEvents: 'none',
      }}>
      {activas.map((n) => (
        <NotificationCard key={n.id} notif={n} onClose={() => onClose(n.id)} esDark={esDark} />
      ))}
    </div>
  );
}

function NotificationCard({ notif, onClose, esDark }) {
  const cfg = TIPOS[notif.tipo] || TIPOS.info;

  return (
    <div
      role="alert"
      className="anim-slide-up"
      style={{
        background: esDark ? '#1e293b' : '#fff',
        color: esDark ? '#e2e8f0' : '#1e293b',
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        border: `1px solid ${cfg.color}33`,
        borderLeft: `5px solid ${cfg.color}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        pointerEvents: 'auto',
        minWidth: '280px',
      }}>
      <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {notif.titulo && (
          <p style={{ fontSize: '12px', fontWeight: '900', color: cfg.color, marginBottom: '3px', letterSpacing: '0.3px' }}>
            {notif.titulo}
          </p>
        )}
        {notif.mensaje && (
          <p style={{ fontSize: '11px', lineHeight: 1.5, opacity: 0.85 }}>
            {notif.mensaje}
          </p>
        )}
        {notif.accion && (
          <button
            onClick={() => { notif.accion.onClick(); onClose(); }}
            className="btn-feedback"
            style={{
              marginTop: '8px',
              padding: '5px 12px',
              background: cfg.color, color: '#fff',
              border: 'none', borderRadius: '6px',
              fontSize: '10px', fontWeight: '800',
              cursor: 'pointer', letterSpacing: '0.4px',
            }}>
            {notif.accion.label}
          </button>
        )}
      </div>
      <button onClick={onClose} aria-label="Cerrar notificación" style={{
        background: 'transparent', border: 'none',
        color: esDark ? '#94a3b8' : '#64748b',
        fontSize: '14px', fontWeight: '900', cursor: 'pointer',
        padding: '0 4px', lineHeight: 1,
      }}>×</button>
    </div>
  );
}
