// src/views/capataz/secciones/StepperCapataz.jsx
// Cabecera de MÓDULO del capataz. Los 2 módulos (Tareo y Metrado) son ahora
// 100% independientes: cada uno se entra desde la pantalla de inicio y se sale
// con "‹ Volver". Esta cabecera solo muestra el botón de volver + el título del
// módulo activo (sin toggle de pasos, para que cada módulo se sienta aparte).
import React from 'react';
import { BASE } from '../../../utils/styles';

const META = {
  tareo:   { n: 'PASO 1', icon: '👷', titulo: 'Tareo',   color: BASE.navy, sub: 'Coloca a tu gente y sus horas' },
  metrado: { n: 'PASO 2', icon: '📏', titulo: 'Metrado y observaciones', color: BASE.gold, sub: 'Metrado de las actividades del tareo' },
};

export default function StepperCapataz({ vista, onIrInicio }) {
  const m = META[vista] || META.tareo;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      marginBottom: '14px',
    }}>
      <button
        type="button"
        onClick={onIrInicio}
        title="Volver a los módulos"
        style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          height: '40px', padding: '0 14px 0 11px', borderRadius: '11px',
          border: `1.5px solid ${BASE.border}`, background: BASE.white,
          color: BASE.navy, fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          boxShadow: BASE.shadowSm,
        }}
      >
        <span style={{ fontSize: '17px', lineHeight: 1 }}>‹</span> Volver
      </button>

      <div style={{
        flex: 1, minWidth: 0,
        display: 'flex', alignItems: 'center', gap: '11px',
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${m.color}`,
        borderRadius: '11px', padding: '8px 14px', boxShadow: BASE.shadowSm,
      }}>
        <span style={{
          width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
          background: `${m.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
        }}>{m.icon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '1px', color: m.color }}>{m.n}</p>
          <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.titulo}
          </p>
        </div>
      </div>
    </div>
  );
}
