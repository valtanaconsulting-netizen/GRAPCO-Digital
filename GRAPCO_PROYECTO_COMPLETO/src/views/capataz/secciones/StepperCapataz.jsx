// src/views/capataz/secciones/StepperCapataz.jsx
// Cabecera MINIMALISTA del módulo del capataz (uso en terreno, una mano, bajo el sol):
// solo un botón "‹ Volver" arriba a la izquierda (estándar móvil premium) + el título
// del módulo en texto plano. Sin tarjetón "PASO 1", sin icono grande, sin ruido visual.
import React from 'react';
import { BASE } from '../../../utils/styles';

const TITULO = {
  tareo:   'Tareo',
  metrado: 'Metrado y observaciones',
};

export default function StepperCapataz({ vista, onIrInicio }) {
  const titulo = TITULO[vista] || TITULO.tareo;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <button
        type="button"
        onClick={onIrInicio}
        aria-label="Volver a los módulos"
        className="btn-feedback"
        style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          height: '40px', padding: '0 15px 0 10px', borderRadius: '11px',
          border: `1px solid ${BASE.border}`, background: BASE.white,
          color: BASE.navy, fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '-2px' }}>‹</span> Volver
      </button>
      <h2 style={{ fontSize: '15px', fontWeight: '800', color: BASE.navy, letterSpacing: '-0.2px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {titulo}
      </h2>
    </div>
  );
}
