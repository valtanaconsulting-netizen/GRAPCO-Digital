import React from 'react';
import { AreaSidebar } from 'vite-react-starter';

const grupos = {
  'RESUMEN': [{ key: 'dash', label: 'Dashboard', iconName: 'dashboard', color: '#E5A82F' }],
  'PARTIDA CONTROL': [{ key: 'part', label: 'Partidas Control', iconName: 'fileText', color: '#a78bfa' }],
  'EJECUCIÓN': [
    { key: 'rdo', label: 'RDO', iconName: 'registro', color: '#34d399' },
    { key: 'foto', label: 'Registro Fotográfico', iconName: 'layers', color: '#38bdf8' },
    { key: 'bim', label: 'Modelo BIM', iconName: 'cube', color: '#5eead4' },
  ],
  'VALORIZACIÓN': [
    { key: 'val', label: 'Valorizaciones', iconName: 'coins', color: '#E5A82F' },
    { key: 'inf', label: 'Informe PDF', iconName: 'fileText', color: '#c4b5fd' },
  ],
  'RESULTADO OPERATIVO': [{ key: 'ro', label: 'Resultado Operativo', iconName: 'trendingUp', color: '#fbbf24' }],
};

// El menú lateral navy del área (mismo patrón que Producción y Planeamiento).
// El componente es position:fixed; el `transform` del contenedor crea un bloque
// contenedor para que el sidebar quede DENTRO del card (no escape al viewport).
// El fondo navy del contenedor empata con el del sidebar para un borde limpio.
export const MenuLateral = () => (
  <div style={{ position: 'relative', width: 220, height: 560, overflow: 'hidden', transform: 'translateZ(0)', borderRadius: 10, background: '#0F2A47' }}>
    <AreaSidebar grupos={grupos} activeKey="ro" onSelect={() => {}} sidebarWidth={220} />
  </div>
);
