// src/components/Icon.jsx
// Iconos SVG line-style (inspirados en Lucide / Feather) usados a través del sistema.
// Reemplazan los emojis para dar consistencia visual y feel enterprise.
//
// Uso: <Icon name="dashboard" size={16} color="#fff" strokeWidth={2} />

import React from 'react';

const PATHS = {
  // Producción
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  chartBars: (
    <>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </>
  ),
  trendingUp: (
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <circle cx="17" cy="6" r="2.5" />
      <path d="M22 19v-.5a4 4 0 0 0-4-4h-1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </>
  ),
  tree: (
    <>
      <circle cx="12" cy="4" r="2" />
      <circle cx="6"  cy="20" r="2" />
      <circle cx="18" cy="20" r="2" />
      <path d="M12 6v3a3 3 0 0 1-3 3H6v6" />
      <path d="M12 6v3a3 3 0 0 0 3 3h3v6" />
    </>
  ),
  registro: (
    <>
      <rect x="8" y="4" width="8" height="4" rx="1" />
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <line x1="8"  y1="12" x2="16" y2="12" />
      <line x1="8"  y1="16" x2="13" y2="16" />
    </>
  ),
  balance: (
    <>
      <path d="M12 3v18" />
      <path d="M5 21h14" />
      <path d="M5 7l4 7h-8l4-7z" />
      <path d="M19 7l4 7h-8l4-7z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  // Planificación
  branch: (
    <>
      <circle cx="6"  cy="6"  r="2" />
      <circle cx="18" cy="6"  r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M6 8v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8" />
      <path d="M12 13v3" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="9"  y1="7"  x2="15" y2="7" />
      <line x1="9"  y1="12" x2="9"  y2="12.01" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
      <line x1="15" y1="12" x2="15" y2="12.01" />
      <line x1="9"  y1="16" x2="9"  y2="16.01" />
      <line x1="12" y1="16" x2="12" y2="16.01" />
      <line x1="15" y1="16" x2="15" y2="16.01" />
    </>
  ),
  // Recursos
  package: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  cart: (
    <>
      <circle cx="9"  cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 12h11l2-8H6" />
    </>
  ),
  // Técnico
  cube: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5" />
      <path d="M12 12L4 7.5" />
      <path d="M12 12v9" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  fileText: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <line x1="9"  y1="13" x2="15" y2="13" />
      <line x1="9"  y1="17" x2="15" y2="17" />
    </>
  ),
  // Gerencia
  building: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="1" />
      <line x1="9"  y1="8"  x2="9"  y2="8.01" />
      <line x1="12" y1="8"  x2="12" y2="8.01" />
      <line x1="15" y1="8"  x2="15" y2="8.01" />
      <line x1="9"  y1="12" x2="9"  y2="12.01" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
      <line x1="15" y1="12" x2="15" y2="12.01" />
      <line x1="9"  y1="16" x2="9"  y2="16.01" />
      <line x1="15" y1="16" x2="15" y2="16.01" />
      <line x1="11" y1="21" x2="11" y2="17" />
      <line x1="13" y1="21" x2="13" y2="17" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" />
      <path d="M6 4H4v2a3 3 0 0 0 3 3" />
      <path d="M18 4h2v2a3 3 0 0 1-3 3" />
      <path d="M10 14v3h4v-3" />
      <path d="M8 21h8" />
    </>
  ),
  // Admin
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  shieldAdmin: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </>
  ),
  // Capataz
  hardhat: (
    <>
      <path d="M3 18h18v-2a8 8 0 0 0-16 0v2z" />
      <path d="M12 6v8" />
      <line x1="3"  y1="18" x2="3"  y2="20" />
      <line x1="21" y1="18" x2="21" y2="20" />
    </>
  ),
  // SOMMA / Seguridad
  alert: (
    <>
      <path d="M10.3 3.5L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9"  x2="12" y2="13" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </>
  ),
  // Planeamiento
  map: (
    <>
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
      <line x1="9"  y1="3"  x2="9"  y2="18" />
      <line x1="15" y1="6"  x2="15" y2="21" />
    </>
  ),
  // Genéricos extra
  user:  (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </>
  ),
  // === NUEVOS — mejor representación por área ===
  // Compras y Logística: camión de reparto (más específico que carrito)
  truck: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7.5"  cy="18" r="1.8" />
      <circle cx="17.5" cy="18" r="1.8" />
    </>
  ),
  // APU - Análisis de Precios Unitarios: monedas apiladas
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="6" ry="2.5" />
      <path d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" />
      <path d="M3 11v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" />
      <ellipse cx="17" cy="15" rx="4.5" ry="2" />
      <path d="M12.5 15v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-3" />
    </>
  ),
  // Plan Maestro / WBS: compás de planificación
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </>
  ),
  // Tablero Ejecutivo: pulso/activity (signos vitales del negocio)
  pulse: (
    <>
      <path d="M22 12h-4l-3 9-6-18-3 9H2" />
    </>
  ),
  // Portafolio Estratégico: línea de tendencia con marcadores
  lineChart: (
    <>
      <path d="M3 3v18h18" />
      <polyline points="7 14 11 9 14 12 20 5" />
      <circle cx="7"  cy="14" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="11" cy="9"  r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="5"  r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // Tablero Analítico: barras + KPI (más rico que grid simple)
  barChart3: (
    <>
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="5"  y="12" width="3" height="8" rx="0.5" />
      <rect x="10.5" y="7"  width="3" height="13" rx="0.5" />
      <rect x="16" y="14" width="3" height="6" rx="0.5" />
    </>
  ),
  // Coordinación BIM: capas 3D apiladas
  layers: (
    <>
      <polygon points="12 3 21 7 12 11 3 7 12 3" />
      <polyline points="3 12 12 16 21 12" />
      <polyline points="3 17 12 21 21 17" />
    </>
  ),
  // Control de Calidad: checklist con verificación
  checkSquare: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="8 12 11 15 16 9" />
    </>
  ),
  // Oficina Técnica: regla + compás (planos)
  ruler: (
    <>
      <path d="M5 19L19 5a2 2 0 0 0-2.8-2.8L2.2 16.2a2 2 0 0 0 2.8 2.8z" />
      <line x1="7"  y1="15" x2="9"  y2="13" />
      <line x1="10" y1="12" x2="12" y2="10" />
      <line x1="13" y1="9"  x2="15" y2="7" />
    </>
  ),
  // Cartera de Proyectos: pin de mapa con multi-proyecto
  mapPin: (
    <>
      <path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  // Gestión de Materiales: caja abierta con check
  boxes: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v9l9 4 9-4V7" />
      <path d="M12 11v9" />
      <path d="M7.5 9.2v4.5" />
      <path d="M16.5 9.2v4.5" />
    </>
  ),
  // Filtros: funnel
  filter: (
    <path d="M3 4h18l-7 9v6l-4-2v-4z" />
  ),
  // Estrella (alertas / favoritos)
  zap: (
    <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 15 2" />
  ),
};

export default function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.75, style = {}, ...rest }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      {...rest}
    >
      {path}
    </svg>
  );
}
