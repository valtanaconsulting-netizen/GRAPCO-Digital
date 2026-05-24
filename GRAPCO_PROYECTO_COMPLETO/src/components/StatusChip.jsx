// src/components/StatusChip.jsx
// Chip/badge reutilizable con variantes semánticas y tamaños.
// Reemplaza badges hardcodeados en distintas vistas.

import React from 'react';
import { BASE, RADIUS, TYPOGRAPHY } from '../utils/styles';

/**
 * @param {string} variante  success | danger | warning | info | neutral | gold | navy
 * @param {string} tamano    sm | md | lg
 * @param {string} icono     emoji opcional al inicio
 * @param {boolean} solido   true = fondo lleno, false = fondo translúcido (default)
 */
export default function StatusChip({
  variante = 'neutral',
  tamano = 'md',
  icono = null,
  solido = false,
  children,
  style = {},
  onClick,
}) {
  const colores = {
    success: { color: BASE.greenDark, bg: BASE.greenLight, hard: BASE.green },
    danger:  { color: BASE.red,       bg: '#fee2e2',       hard: BASE.red },
    warning: { color: BASE.goldDark,  bg: BASE.goldLight,  hard: BASE.gold },
    info:    { color: BASE.navy,      bg: '#eff6ff',       hard: BASE.navy },
    neutral: { color: BASE.muted,     bg: BASE.bgSoft,     hard: '#cbd5e1' },
    gold:    { color: BASE.goldDark,  bg: BASE.goldLight,  hard: BASE.gold },
    navy:    { color: BASE.navy,      bg: BASE.bgSoft,     hard: BASE.navy },
  };
  const tamanos = {
    sm: { padding: '2px 8px',  fontSize: '10px', gap: '4px' },
    md: { padding: '3px 10px', fontSize: '11px', gap: '5px' },
    lg: { padding: '5px 14px', fontSize: '12px', gap: '6px' },
  };
  const c = colores[variante] || colores.neutral;
  const t = tamanos[tamano] || tamanos.md;

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.gap,
        padding: t.padding,
        borderRadius: RADIUS.full,
        background: solido ? c.hard : c.bg,
        color: solido ? '#fff' : c.color,
        fontSize: t.fontSize,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: '0.4px',
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        ...style,
      }}>
      {icono && <span style={{ fontSize: '12px' }}>{icono}</span>}
      {children}
    </span>
  );
}
