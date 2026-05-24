// src/components/SkeletonLoader.jsx
// Placeholders animados (shimmer effect) mientras se cargan datos.
// Mejor experiencia que un spinner solitario.

import React from 'react';
import { BASE, SPACING, RADIUS } from '../utils/styles';

/**
 * Bloque skeleton genérico con shimmer.
 *
 * @param {string} width  ancho (default 100%)
 * @param {string} height altura (default 16px)
 * @param {string} radius border-radius (default 8px)
 */
export function Skeleton({ width = '100%', height = '16px', radius = RADIUS.md, style = {} }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
  );
}

/**
 * Card skeleton — para reemplazar tarjetas mientras cargan.
 */
export function SkeletonCard({ filas = 3 }) {
  return (
    <div style={{
      background: BASE.white,
      borderRadius: RADIUS.xl,
      border: `1px solid ${BASE.border}`,
      padding: SPACING.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING.md,
    }}>
      <Skeleton width="40%" height="14px" />
      <Skeleton width="80%" height="20px" />
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} height="12px" width={`${60 + Math.random() * 40}%`} />
      ))}
    </div>
  );
}

/**
 * Tabla skeleton — para reemplazar tablas mientras cargan.
 */
export function SkeletonTabla({ filas = 5, columnas = 4 }) {
  return (
    <div style={{
      background: BASE.white,
      borderRadius: RADIUS.xl,
      border: `1px solid ${BASE.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: BASE.navy, padding: SPACING.md, display: 'flex', gap: SPACING.md }}>
        {Array.from({ length: columnas }).map((_, i) => (
          <div key={i} style={{ flex: 1 }}>
            <Skeleton height="12px" width="60%" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </div>
        ))}
      </div>
      {/* Filas */}
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} style={{
          padding: SPACING.md,
          borderBottom: `1px solid ${BASE.borderSoft}`,
          display: 'flex', gap: SPACING.md, alignItems: 'center',
        }}>
          {Array.from({ length: columnas }).map((_, j) => (
            <div key={j} style={{ flex: 1 }}>
              <Skeleton height="14px" width={`${50 + Math.random() * 50}%`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * KPI skeleton — para reemplazar grids de KPIs.
 */
export function SkeletonKPIs({ cantidad = 4 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
      gap: SPACING.md,
    }}>
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} style={{
          background: BASE.white,
          borderRadius: RADIUS.lg,
          border: `1px solid ${BASE.border}`,
          padding: SPACING.md,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.sm,
        }}>
          <Skeleton width="50%" height="10px" />
          <Skeleton width="70%" height="22px" />
          <Skeleton width="40%" height="10px" />
        </div>
      ))}
    </div>
  );
}
