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
    // Overlay a pantalla completa → centra el aviso EN EL MEDIO (no arriba) y
    // oscurece el fondo para que sea un modal que pide atención. Click fuera = "Después".
    <div
      onClick={() => { if (!aplicando) despues(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px',
        background: 'rgba(8,16,30,0.58)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: 'grapco-fade-in 0.2s ease-out',
      }}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="upd-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: esDark ? '#0f172a' : '#0b1f3a',
          color: '#fff',
          borderRadius: '18px',
          padding: '24px 22px 20px',
          boxShadow: '0 28px 80px rgba(0,0,0,0.55)',
          border: '1px solid rgba(245,158,11,0.45)',
          borderTop: '4px solid #f59e0b',
          textAlign: 'center',
          animation: 'grapco-pop-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
        <div style={{
          width: '58px', height: '58px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', margin: '0 auto 14px',
          boxShadow: '0 8px 24px rgba(245,158,11,0.45)',
        }}>{aplicando ? '⏳' : '🆕'}</div>

        <p id="upd-title" style={{ fontSize: '17px', fontWeight: '900', letterSpacing: '0.2px', marginBottom: '6px' }}>
          {aplicando ? 'Actualizando…' : 'Hay una nueva actualización'}
        </p>
        <p style={{ fontSize: '12.5px', opacity: 0.82, lineHeight: 1.55, marginBottom: '18px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
          {aplicando
            ? 'La app se reiniciará en un momento con la última versión.'
            : 'Tendrás la última versión con las mejoras más recientes. Guarda lo que estés escribiendo antes de continuar.'}
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={actualizar} disabled={aplicando} className="btn-feedback" style={{
            padding: '11px 22px',
            background: aplicando ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', border: 'none', borderRadius: '11px',
            fontSize: '13px', fontWeight: '900', letterSpacing: '0.4px',
            cursor: aplicando ? 'wait' : 'pointer',
            boxShadow: '0 6px 18px rgba(245,158,11,0.4)',
          }}>{aplicando ? '⏳ Actualizando…' : '🔄 Actualizar ahora'}</button>
          {!aplicando && (
            <button onClick={despues} aria-label="Actualizar más tarde" className="btn-feedback" style={{
              padding: '11px 18px',
              background: 'rgba(255,255,255,0.10)',
              color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '11px',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>Después</button>
          )}
        </div>
      </div>
    </div>
  );
}
