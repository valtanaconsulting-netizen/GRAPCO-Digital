// src/components/SkeletonPantalla.jsx
// Skeleton de carga elegante (shimmer) — reemplaza los "Cargando..." de texto.
// Patrón de las grandes plataformas: la estructura de la página aparece al
// instante en gris animado y el contenido la "rellena" — la app se siente
// rápida aunque el chunk/datos aún estén bajando.
import React from 'react';
import { BASE } from '../utils/styles';

const shimmerCss = `
@keyframes grapco-shimmer {
  0%   { background-position: -460px 0; }
  100% { background-position: 460px 0; }
}
.grapco-skel {
  background: linear-gradient(90deg, #EDF1F6 0%, #F7FAFD 40%, #EDF1F6 80%);
  background-size: 920px 100%;
  animation: grapco-shimmer 1.3s ease-in-out infinite;
  border-radius: 8px;
}
@media (prefers-reduced-motion: reduce) { .grapco-skel { animation: none; } }
`;

const B = ({ w = '100%', h = 14, r = 8, style = {} }) => (
  <div className="grapco-skel" style={{ width: w, height: `${h}px`, borderRadius: `${r}px`, ...style }} />
);

// Skeleton de página completa (para Suspense fallback de los módulos)
export default function SkeletonPantalla({ titulo = 'Cargando módulo' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }} aria-busy="true" aria-label={titulo}>
      <style>{shimmerCss}</style>

      {/* Header del módulo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <B w="46px" h={46} r={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <B w="220px" h={18} />
          <B w="340px" h={11} />
        </div>
        <B w="120px" h={34} r={9} />
      </div>

      {/* Franja de KPIs */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px',
        padding: '16px 18px', display: 'flex', gap: '26px', flexWrap: 'wrap',
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <B w="76px" h={9} />
            <B w="58px" h={20} />
          </div>
        ))}
      </div>

      {/* Cuerpo: tabla/cards */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px',
        padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px',
      }}>
        <B w="40%" h={13} />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <B w="26px" h={26} r={6} />
            <B w={`${78 - i * 6}%`} h={12} />
            <B w="64px" h={12} style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>

      <p style={{ fontSize: '11px', color: BASE.mutedSoft, textAlign: 'center', fontWeight: 600, letterSpacing: '0.6px' }}>
        {titulo}…
      </p>
    </div>
  );
}

// Variante compacta (para secciones internas que cargan datos)
export function SkeletonBloque({ filas = 4 }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px',
    }} aria-busy="true">
      <style>{shimmerCss}</style>
      <B w="36%" h={13} />
      {Array.from({ length: filas }).map((_, i) => <B key={i} w={`${92 - i * 9}%`} h={12} />)}
    </div>
  );
}
