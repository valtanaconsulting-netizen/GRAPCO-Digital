// src/components/VistaHeader.jsx
// Cabecera "hero" reutilizable para unificar el lenguaje visual de todas las
// vistas de producción (mismo patrón que Dashboard Ejecutivo / Radar).
// Navy gradient + chip de icono dorado + título jerárquico. Compacta, para
// poder vivir bajo la navegación del shell sin recargar.

import React from 'react';
import { BASE } from '../utils/styles';
import Icon from './Icon';

export default function VistaHeader({
  icono = 'barChart3',
  titulo,
  subtitulo,
  eyebrow,
  acento = BASE.gold,
  derecha = null,
}) {
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(135deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
      borderRadius: '14px',
      padding: '14px 18px',
      color: '#fff',
      boxShadow: BASE.shadowMd,
      display: 'flex', alignItems: 'center', gap: '13px', flexWrap: 'wrap',
      justifyContent: 'space-between',
      overflow: 'hidden',
    }}>
      {/* Filo dorado superior — firma de marca */}
      <span aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, transparent, ${acento}, transparent)`,
      }} />
      {/* Glow decorativo sutil en la esquina */}
      <span aria-hidden="true" style={{
        position: 'absolute', top: '-40px', right: '-30px', width: '160px', height: '160px',
        background: `radial-gradient(circle, ${acento}1f 0%, transparent 70%)`, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, position: 'relative' }}>
        <div style={{
          background: `linear-gradient(145deg, ${acento}26, ${acento}0d)`,
          border: `1px solid ${acento}40`,
          borderRadius: '11px', padding: '9px', display: 'inline-flex', flexShrink: 0,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px -4px ${acento}55`,
        }}>
          <Icon name={icono} size={21} color={acento} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '1.6px', color: acento, opacity: 0.95, textTransform: 'uppercase', margin: 0 }}>
              {eyebrow}
            </p>
          )}
          <p style={{ fontSize: '16.5px', fontWeight: 900, lineHeight: 1.15, margin: '1px 0 0', letterSpacing: '-0.2px' }}>{titulo}</p>
          {subtitulo && <p style={{ fontSize: '11.5px', opacity: 0.8, marginTop: '2px', margin: '2px 0 0' }}>{subtitulo}</p>}
        </div>
      </div>
      {derecha && <div style={{ flexShrink: 0, position: 'relative' }}>{derecha}</div>}
    </div>
  );
}
