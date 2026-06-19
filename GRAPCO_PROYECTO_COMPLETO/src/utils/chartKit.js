// src/utils/chartKit.js
// KIT PREMIUM DE GRÁFICOS GRAPCO — un solo lugar para que TODOS los charts
// (recharts) de la plataforma se vean de la misma familia: ejes finos, grilla
// sutil, tooltip de marca con sombra real, barras redondeadas y gradientes.
// Uso: import { EJE, GRILLA, TOOLTIP_STYLE, LEYENDA, degradado } from '../utils/chartKit';
import { BASE } from './styles';

// Ticks de ejes: pequeños, grises, sin ruido
export const EJE = {
  tick: { fontSize: 10, fill: BASE.muted, fontWeight: 600 },
  axisLine: { stroke: BASE.border },
  tickLine: false,
};

// Grilla: punteada y casi invisible (el dato es el protagonista)
export const GRILLA = {
  stroke: BASE.borderSoft,
  strokeDasharray: '3 3',
  vertical: false,
};

// Tooltip: tarjeta blanca de marca con sombra en capas y filete dorado
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff',
    border: `1px solid ${BASE.border}`,
    borderTop: `3px solid ${BASE.gold}`,
    borderRadius: '10px',
    boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18), 0 4px 12px -4px rgba(15,23,42,0.08)',
    fontSize: '11.5px',
    fontWeight: 600,
    padding: '10px 12px',
  },
  labelStyle: {
    fontSize: '10px', fontWeight: 800, color: BASE.navy,
    letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px',
  },
  itemStyle: { padding: '1.5px 0' },
  cursor: { fill: `${BASE.navy}08` },
};

// Leyenda: discreta, abajo, tipografía pequeña
export const LEYENDA = {
  wrapperStyle: { fontSize: '11px', fontWeight: 600 },
  iconType: 'circle',
  iconSize: 8,
};

// Barras premium: esquinas redondeadas arriba
export const BARRA = { radius: [5, 5, 0, 0], maxBarSize: 42 };

// Apaga la animación de recharts: se re-anima en CADA render/filtro y causa jank
// (sobre todo en móvil y dashboards con varios charts). Spread en cada serie:
//   <Line {...SIN_ANIM} ... />  <Bar {...SIN_ANIM} ... />  <Area {...SIN_ANIM} ... />  <Pie {...SIN_ANIM} ... />
export const SIN_ANIM = { isAnimationActive: false };

// Definición de gradiente vertical para <Area>/<Bar> — úsalo dentro de <defs>:
//   <defs>{degradado('gradReal', CHART.real)}</defs>
//   <Area fill="url(#gradReal)" ... />
// (se construye con React.createElement para no requerir JSX en este .js)
import React from 'react';
export const degradado = (id, color, opacidadTop = 0.32, opacidadBottom = 0.02) =>
  React.createElement(
    'linearGradient',
    { id, x1: 0, y1: 0, x2: 0, y2: 1, key: id },
    React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: opacidadTop, key: 'a' }),
    React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: opacidadBottom, key: 'b' }),
  );

// Contenedor estándar de un gráfico (tarjeta premium con título formal)
export const TARJETA_GRAFICO = {
  background: BASE.white,
  border: `1px solid ${BASE.border}`,
  borderRadius: '14px',
  boxShadow: BASE.shadowMd,
  padding: '16px 14px 8px',
};

export const TITULO_GRAFICO = {
  fontSize: '11.5px', fontWeight: 800, color: BASE.navy,
  letterSpacing: '1.1px', textTransform: 'uppercase',
  marginBottom: '10px', paddingLeft: '6px',
  borderLeft: `3px solid ${BASE.gold}`,
};
