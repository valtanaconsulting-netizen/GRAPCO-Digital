// src/views/modulos/portfolio/MapaProyectosPeru.jsx — Mapa de proyectos del Perú (B24)
//
// SVG nativo del Perú con pins de cada proyecto. Cero dependencias externas.
// Coordenadas GPS reales convertidas a viewBox SVG.

import React, { useState, useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { fmtSoles } from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

// Bounding box del Perú: aprox lat -18.5 a 0, lng -81.5 a -68.5
// SVG viewBox: 0 0 800 1000
const PERU_BOUNDS = {
  latMin: -18.5, latMax: 0.0,
  lngMin: -81.5, lngMax: -68.5,
};

// Convierte (lat, lng) a (x, y) dentro de viewBox 800x1000
function latLngToXY(lat, lng) {
  const xPct = (lng - PERU_BOUNDS.lngMin) / (PERU_BOUNDS.lngMax - PERU_BOUNDS.lngMin);
  const yPct = 1 - (lat - PERU_BOUNDS.latMin) / (PERU_BOUNDS.latMax - PERU_BOUNDS.latMin);
  return { x: xPct * 800, y: yPct * 1000 };
}

// Path simplificado del Perú (silueta aproximada).
// Es un trazo continuo del contorno aproximado para visual.
const PERU_PATH = `
  M 600 60 L 700 80 L 720 150 L 700 220 L 670 280 L 660 350
  L 670 420 L 690 480 L 720 540 L 750 600 L 760 670 L 740 740
  L 700 800 L 660 860 L 600 910 L 540 950 L 480 970 L 420 960
  L 380 930 L 350 880 L 340 820 L 360 760 L 380 700 L 360 640
  L 320 590 L 280 540 L 240 490 L 200 430 L 180 360 L 200 290
  L 240 230 L 290 180 L 350 140 L 420 110 L 480 90 L 540 70 Z
`;

// Algunas ciudades importantes para referencia
const CIUDADES_REF = [
  { nombre: 'Lima',     lat: -12.0464, lng: -77.0428 },
  { nombre: 'Arequipa', lat: -16.4090, lng: -71.5375 },
  { nombre: 'Trujillo', lat: -8.1116,  lng: -79.0290 },
  { nombre: 'Cusco',    lat: -13.5319, lng: -71.9675 },
  { nombre: 'Iquitos',  lat: -3.7491,  lng: -73.2538 },
  { nombre: 'Piura',    lat: -5.1945,  lng: -80.6328 },
  { nombre: 'Chiclayo', lat: -6.7714,  lng: -79.8409 },
  { nombre: 'Huancayo', lat: -12.0651, lng: -75.2049 },
];

const ESTADOS = {
  planificado:  { l: 'Planificado',   c: '#2563eb' },
  en_ejecucion: { l: 'En ejecución',  c: '#f59e0b' },
  suspendido:   { l: 'Suspendido',    c: '#dc2626' },
  completado:   { l: 'Completado',    c: '#16a34a' },
  cancelado:    { l: 'Cancelado',     c: '#64748b' },
};

export default function MapaProyectosPeru({ onSelectProyecto }) {
  const { proyectos, setProyectoActivoId } = useProyectoActivo();
  const [hover, setHover] = useState(null);

  const proyectosConCoords = useMemo(() => {
    return proyectos
      .filter(p => p.ubicacion?.lat != null && p.ubicacion?.lng != null)
      .map(p => ({
        ...p,
        coords: latLngToXY(p.ubicacion.lat, p.ubicacion.lng),
      }));
  }, [proyectos]);

  const sinCoords = proyectos.filter(p => p.ubicacion?.lat == null || p.ubicacion?.lng == null);

  const seleccionar = (id) => {
    setProyectoActivoId(id);
    onSelectProyecto?.(id);
  };

  if (proyectos.length === 0) {
    return <EmptyState icono="🗺️" titulo="Sin proyectos" descripcion="Crea proyectos en la pestaña Proyectos para verlos en el mapa." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        borderRadius: '14px', padding: '20px 26px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          MAPA DE PORTFOLIO · GRAPCO PERÚ
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
          {proyectosConCoords.length} de {proyectos.length} proyectos en el mapa
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
          Click en un pin para activar ese proyecto en toda la plataforma. {sinCoords.length > 0 && `· ${sinCoords.length} proyectos sin coordenadas (edita el proyecto y agrega lat/lng)`}
        </p>
      </div>

      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '20px',
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px',
      }}>
        {/* MAPA SVG */}
        <div style={{
          background: `linear-gradient(180deg, ${BASE.navySoft}, ${BASE.bgSoft})`,
          borderRadius: '12px', padding: '12px', border: `1px solid ${BASE.border}`,
        }}>
          <svg viewBox="0 0 800 1000" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '70vh' }}>
            {/* Sombra del Perú */}
            <path d={PERU_PATH} fill="rgba(15,23,42,0.08)" transform="translate(6 6)" />
            {/* Silueta del Perú */}
            <path d={PERU_PATH}
              fill={BASE.goldLight}
              stroke={BASE.navy} strokeWidth="2.5" strokeLinejoin="round" />

            {/* Líneas de cuadrícula sutiles (paralelos cada 5°) */}
            {[-5, -10, -15].map(lat => {
              const { y } = latLngToXY(lat, 0);
              return (
                <g key={lat}>
                  <line x1={0} y1={y} x2={800} y2={y} stroke={BASE.mutedSoft} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
                  <text x={6} y={y - 4} fontSize="10" fill={BASE.muted}>{lat}°</text>
                </g>
              );
            })}

            {/* Ciudades de referencia */}
            {CIUDADES_REF.map(c => {
              const xy = latLngToXY(c.lat, c.lng);
              return (
                <g key={c.nombre}>
                  <circle cx={xy.x} cy={xy.y} r="3" fill={BASE.mutedSoft} stroke="#fff" strokeWidth="1" />
                  <text x={xy.x + 6} y={xy.y + 4} fontSize="9" fill={BASE.muted} fontWeight="600">{c.nombre}</text>
                </g>
              );
            })}

            {/* Pins de proyectos */}
            {proyectosConCoords.map(p => {
              const c = p.color || BASE.navy;
              const estado = ESTADOS[p.estado] || ESTADOS.planificado;
              return (
                <g key={p.id}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => seleccionar(p.id)}
                  style={{ cursor: 'pointer' }}>
                  {/* Pulse animado */}
                  <circle cx={p.coords.x} cy={p.coords.y} r="18" fill={c} opacity="0.2">
                    <animate attributeName="r" from="14" to="22" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  {/* Aro exterior */}
                  <circle cx={p.coords.x} cy={p.coords.y} r="14" fill={c} opacity="0.3" />
                  {/* Pin */}
                  <circle cx={p.coords.x} cy={p.coords.y} r="9" fill={c} stroke="#fff" strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                  {/* Indicador de estado */}
                  <circle cx={p.coords.x + 7} cy={p.coords.y - 7} r="4" fill={estado.c} stroke="#fff" strokeWidth="1.5" />
                </g>
              );
            })}

            {/* Tooltip flotante */}
            {hover && (
              <g>
                <rect x={hover.coords.x + 16} y={hover.coords.y - 30}
                  width="220" height="56" rx="6"
                  fill={BASE.navy} opacity="0.95" />
                <text x={hover.coords.x + 26} y={hover.coords.y - 12}
                  fontSize="11" fill={BASE.gold} fontWeight="900">{hover.codigo}</text>
                <text x={hover.coords.x + 26} y={hover.coords.y + 4}
                  fontSize="11" fill="#fff">{hover.nombre.substring(0, 28)}</text>
                <text x={hover.coords.x + 26} y={hover.coords.y + 18}
                  fontSize="10" fill="#cbd5e1">{hover.ubicacion?.ciudad}</text>
              </g>
            )}
          </svg>

          {/* Leyenda de estados */}
          <div style={{ display: 'flex', gap: '14px', marginTop: '12px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '10.5px' }}>
            {Object.entries(ESTADOS).map(([k, e]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: e.c, borderRadius: '50%' }} />
                <span style={{ color: BASE.muted, fontWeight: '700' }}>{e.l}</span>
              </span>
            ))}
          </div>
        </div>

        {/* LISTA LATERAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>
            PROYECTOS ({proyectosConCoords.length})
          </p>
          {proyectosConCoords.map(p => {
            const estado = ESTADOS[p.estado] || ESTADOS.planificado;
            return (
              <div key={p.id} onClick={() => seleccionar(p.id)} style={{
                background: BASE.white, border: `1px solid ${BASE.border}`,
                borderLeft: `4px solid ${p.color || BASE.navy}`,
                borderRadius: '10px', padding: '10px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${(p.color || BASE.navy)}33`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '10.5px', fontWeight: '900', color: p.color || BASE.navy, fontFamily: 'monospace' }}>
                      {p.codigo}
                    </p>
                    <p style={{ fontSize: '12.5px', fontWeight: '900', color: BASE.navy, marginTop: '2px', lineHeight: 1.2 }}>
                      {p.nombre}
                    </p>
                    <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '3px' }}>
                      📍 {p.ubicacion.ciudad}{p.ubicacion.region ? ', ' + p.ubicacion.region : ''}
                    </p>
                  </div>
                  <span style={{ width: '8px', height: '8px', background: estado.c, borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />
                </div>
                <p style={{ fontSize: '11px', fontWeight: '900', color: p.color || BASE.navy, marginTop: '6px', fontFamily: 'monospace' }}>
                  {fmtSoles(p.presupuestoContractual)}
                </p>
              </div>
            );
          })}

          {sinCoords.length > 0 && (
            <div style={{
              background: '#fef3c7', border: '1.5px solid #f59e0b55',
              borderRadius: '10px', padding: '10px 14px', marginTop: '10px',
            }}>
              <p style={{ fontSize: '10.5px', fontWeight: '900', color: BASE.goldDark, letterSpacing: '0.4px' }}>
                ⚠️ {sinCoords.length} SIN COORDENADAS
              </p>
              <p style={{ fontSize: '10.5px', color: BASE.goldDark, marginTop: '4px' }}>
                Edita los proyectos y agrega lat/lng en el wizard de ubicación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
