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
      background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
      borderRadius: '14px',
      padding: '13px 18px',
      color: '#fff',
      boxShadow: BASE.shadowMd,
      display: 'flex', alignItems: 'center', gap: '13px', flexWrap: 'wrap',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: '11px', padding: '9px', display: 'inline-flex', flexShrink: 0 }}>
          <Icon name={icono} size={21} color={acento} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '1.6px', color: acento, opacity: 0.95, textTransform: 'uppercase', margin: 0 }}>
              {eyebrow}
            </p>
          )}
          <p style={{ fontSize: '16.5px', fontWeight: 900, lineHeight: 1.15, margin: '1px 0 0' }}>{titulo}</p>
          {subtitulo && <p style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '2px', margin: '2px 0 0' }}>{subtitulo}</p>}
        </div>
      </div>
      {derecha && <div style={{ flexShrink: 0 }}>{derecha}</div>}
    </div>
  );
}
