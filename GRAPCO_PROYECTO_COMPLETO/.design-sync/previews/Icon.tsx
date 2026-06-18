import React from 'react';
import { Icon } from 'vite-react-starter';

const NAVY = '#0F2A47';
const GOLD = '#E5A82F';
const row: React.CSSProperties = { display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', padding: 12 };

// Iconos de marca en navy (uso por defecto en menús y cabeceras).
export const Navy = () => (
  <div style={row}>
    {['dashboard', 'trendingUp', 'fileText', 'coins', 'layers', 'cube', 'ruler', 'hardhat', 'truck', 'building'].map((n) => (
      <Icon key={n} name={n} size={26} color={NAVY} />
    ))}
  </div>
);

// Mismos iconos en oro de marca (estado activo / acento).
export const Oro = () => (
  <div style={row}>
    {['barChart3', 'pulse', 'lineChart', 'mapPin', 'boxes', 'shield', 'checkSquare', 'clock', 'target', 'package'].map((n) => (
      <Icon key={n} name={n} size={26} color={GOLD} />
    ))}
  </div>
);

// Escala de tamaños (14 → 44 px).
export const Tamanos = () => (
  <div style={{ ...row, gap: 16 }}>
    {[14, 18, 24, 32, 44].map((s) => (
      <Icon key={s} name="building" size={s} color={NAVY} />
    ))}
  </div>
);
