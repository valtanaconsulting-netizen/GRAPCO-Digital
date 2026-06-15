// src/components/EmptyState.jsx
// Placeholder amigable cuando una sección no tiene datos.
// Ofrece una llamada a la acción opcional.

import React from 'react';
import { BASE, font, SPACING, RADIUS } from '../utils/styles';

export default function EmptyState({
  icono = '📋',
  titulo = 'No hay datos aún',
  descripcion = '',
  accion = null,        // { label, onClick }
  altura = '280px',
  variante = 'default', // default | success | warning | bim
}) {
  const variantes = {
    default: { color: BASE.muted,    accent: BASE.gold,    bg: BASE.bgSoft },
    success: { color: BASE.greenDark, accent: BASE.green,   bg: BASE.greenLight },
    warning: { color: BASE.goldDark,  accent: BASE.gold,    bg: BASE.goldLight },
    bim:     { color: BASE.navy,      accent: BASE.gold,    bg: BASE.bgSoft },
  };
  const v = variantes[variante];

  return (
    <div className="anim-fade-in" style={{
      background: BASE.white,
      borderRadius: RADIUS.xl,
      border: `2px dashed ${BASE.border}`,
      padding: SPACING['3xl'],
      minHeight: altura,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px',
        borderRadius: RADIUS.full,
        background: v.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.lg,
        fontSize: '32px',
      }}>
        {icono}
      </div>
      <p style={{ ...font('lg', 'bold', BASE.navy), marginBottom: SPACING.sm }}>
        {titulo}
      </p>
      {descripcion && (
        <p style={{
          ...font('sm', 'normal', BASE.muted),
          maxWidth: '440px',
          lineHeight: 1.6,
          marginBottom: accion ? SPACING.lg : 0,
        }}>
          {descripcion}
        </p>
      )}
      {accion && (
        <button onClick={accion.onClick} className="btn-feedback" style={{
          padding: '10px 20px',
          background: `linear-gradient(135deg, ${v.accent}, ${v.accent}dd)`,
          color: '#fff', border: 'none',
          borderRadius: RADIUS.lg,
          ...font('sm', 'bold', '#fff'),
          cursor: 'pointer',
          boxShadow: `0 4px 12px ${v.accent}55`,
        }}>
          {accion.label}
        </button>
      )}
    </div>
  );
}
