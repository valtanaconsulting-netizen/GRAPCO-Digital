// src/components/ActualizacionBanner.jsx
// Cartel global "Hay una nueva actualización". Reemplaza la recarga SILENCIOSA
// que tenía main.jsx (la app se recargaba sola y el obrero no se enteraba / se
// le cortaba la faena). Ahora:
//   - main.jsx DETECTA un deploy nuevo (hash del bundle ≠ hash del servidor, o un
//     Service Worker en espera) y dispara el evento `grapco:update-available`.
//   - Este componente muestra el aviso y deja que la persona toque "Actualizar".
//   - "Actualizar ahora" llama a window.__grapcoAplicarActualizacion(): purga
//     caché + Service Worker y recarga UNA vez con la última versión.
//   - "Después" lo oculta; vuelve a aparecer en el siguiente chequeo (cada 5 min)
//     o al volver a la pestaña, para que nadie se quede en una versión vieja.
import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ActualizacionBanner() {
  const [mostrar, setMostrar] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const { esDark } = useTheme();

  useEffect(() => {
    // Si la detección ocurrió ANTES de montar el componente, main.jsx deja una
    // bandera para que igual aparezca el aviso.
    if (window.__grapcoActualizacionPendiente) setMostrar(true);
    const onUpdate = () => setMostrar(true);
    window.addEventListener('grapco:update-available', onUpdate);
    return () => window.removeEventListener('grapco:update-available', onUpdate);
  }, []);

  const actualizar = async () => {
    if (aplicando) return;
    setAplicando(true);
    try {
      if (typeof window.__grapcoAplicarActualizacion === 'function') {
        await window.__grapcoAplicarActualizacion();
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  const despues = () => {
    window.__grapcoActualizacionPendiente = false;
    setMostrar(false);
  };

  if (!mostrar) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="upd-title"
      className="anim-slide-up"
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top))',
        left: '12px', right: '12px',
        maxWidth: '440px', margin: '0 auto',
        background: esDark ? '#0f172a' : '#0b1f3a',
        color: '#fff',
        borderRadius: '14px',
        padding: '14px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        border: '1px solid rgba(245,158,11,0.45)',
        borderLeft: '5px solid #f59e0b',
        display: 'flex', alignItems: 'flex-start', gap: '13px',
        zIndex: 10000,
      }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '11px',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '21px', flexShrink: 0,
        boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
      }}>🆕</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p id="upd-title" style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.3px', marginBottom: '3px' }}>
          Hay una nueva actualización
        </p>
        <p style={{ fontSize: '11px', opacity: 0.85, lineHeight: 1.5, marginBottom: '10px' }}>
          {aplicando
            ? 'Actualizando… la app se reiniciará en un momento.'
            : 'Toca "Actualizar ahora" para tener la última versión. Guarda lo que estés escribiendo antes.'}
        </p>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={actualizar} disabled={aplicando} className="btn-feedback" style={{
            padding: '9px 16px',
            background: aplicando ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', border: 'none', borderRadius: '9px',
            fontSize: '12px', fontWeight: '900', letterSpacing: '0.4px',
            cursor: aplicando ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
          }}>{aplicando ? '⏳ Actualizando…' : '🔄 Actualizar ahora'}</button>
          {!aplicando && (
            <button onClick={despues} aria-label="Actualizar más tarde" className="btn-feedback" style={{
              padding: '9px 14px',
              background: 'rgba(255,255,255,0.12)',
              color: '#e2e8f0', border: 'none', borderRadius: '9px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            }}>Después</button>
          )}
        </div>
      </div>
    </div>
  );
}
