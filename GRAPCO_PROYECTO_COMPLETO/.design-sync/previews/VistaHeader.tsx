import React from 'react';
import { VistaHeader } from 'vite-react-starter';

// Cabecera "hero" de una vista (eyebrow + título + subtítulo + chip de icono dorado).
export const OficinaTecnica = () => (
  <VistaHeader
    icono="ruler"
    eyebrow="Oficina Técnica"
    titulo="Contrato · Ejecución · Facturación"
    subtitulo="RDO automático desde tareos + LPS. Valorización auto-calculada desde producción."
  />
);

// Con contenido a la derecha (KPI / acciones).
export const ConKpiDerecha = () => (
  <VistaHeader
    icono="trendingUp"
    eyebrow="Resultado Operativo"
    titulo="El Estado de Resultados de la Obra"
    subtitulo="Cruza Plan Maestro + APUs + Tareos + Valorizaciones."
    derecha={
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#E5A82F', margin: 0, letterSpacing: 1 }}>CPI GLOBAL</p>
        <p style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: '#4ade80', margin: '2px 0 0' }}>111%</p>
      </div>
    }
  />
);
