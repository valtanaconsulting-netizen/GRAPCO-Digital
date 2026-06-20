// src/views/capataz/CapatazPanel.jsx
// Wrapper para el rol Capataz — SIMPLIFICADO.
// Una sola area: registrar su dia (avance + tareo + fotos).
// El reporte de incidencias se traslado a SSOMA — el capataz no debe complicarse.

import React from 'react';
import { BASE } from '../../utils/styles';
import Capataz from '../Capataz';

export default function CapatazPanel(props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
        borderRadius: '14px',
        padding: '20px 26px',
        color: '#fff',
        borderLeft: `5px solid ${BASE.navy}`,
        boxShadow: `0 4px 20px ${BASE.gold}55`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.navy, letterSpacing: '1.6px', opacity: 0.9 }}>
          👷 PANEL DE CAPATAZ · OBRA EN CAMPO
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
          Tu día: Tareo y Metrado
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.92, marginTop: '4px' }}>
          1° coloca a tu gente y sus horas (Tareo). 2° registra el metrado y las observaciones. Llega directo a los ingenieros.
        </p>
      </div>

      {/* CONTENIDO */}
      <div className="anim-fade-in">
        <Capataz {...props} />
      </div>
    </div>
  );
}
