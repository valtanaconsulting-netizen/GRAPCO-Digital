// src/components/ThemeToggle.jsx
// Toggle compacto para alternar light / dark / system.
// Se renderiza en el navbar.

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { modo, cambiarModo, esDark } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const opciones = [
    { id: 'light',  l: 'Claro',     icon: '☀️' },
    { id: 'dark',   l: 'Oscuro',    icon: '🌙' },
    { id: 'system', l: 'Sistema',   icon: '🖥️' },
  ];

  const iconoActual = modo === 'dark' ? '🌙' : modo === 'light' ? '☀️' : '🖥️';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAbierto(!abierto)}
        aria-label={`Cambiar tema (actual: ${modo})`}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="btn-feedback"
        style={{
          width: '30px', height: '30px',
          padding: 0, boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '8px',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}>
        {iconoActual}
      </button>
      {abierto && (
        <div role="menu"
          className="anim-scale-in"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: esDark ? '#1e293b' : '#fff',
            border: `1px solid ${esDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            padding: '6px',
            minWidth: '160px',
            zIndex: 200,
          }}>
          {opciones.map(o => {
            const activo = modo === o.id;
            return (
              <button key={o.id}
                role="menuitem"
                onClick={() => { cambiarModo(o.id); setAbierto(false); }}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: activo ? (esDark ? '#334155' : '#f1f5f9') : 'transparent',
                  color: esDark ? '#e2e8f0' : '#1e293b',
                  border: 'none', borderRadius: '7px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  fontSize: '13px', fontWeight: activo ? '800' : '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!activo) e.currentTarget.style.background = esDark ? '#334155' : '#f1f5f9'; }}
                onMouseLeave={e => { if (!activo) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize: '15px' }}>{o.icon}</span>
                <span style={{ flex: 1 }}>{o.l}</span>
                {activo && <span style={{ color: '#f59e0b', fontWeight: 900 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
