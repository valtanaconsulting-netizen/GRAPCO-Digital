// src/components/GateProyectoLegacy.jsx
// AISLAMIENTO MULTI-PROYECTO: algunos módulos de Planeamiento muestran el
// plan BASE de CREDITEX importado del Excel (datos estáticos). Este gate
// evita que esa información se "fugue" a otros proyectos: si el proyecto
// activo NO es CREDITEX, muestra un estado vacío honesto en su lugar.
import React from 'react';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { LEGACY_CREDITEX_IDS } from '../hooks/useCatalogoWBS';
import { BASE } from '../utils/styles';
import Icon from './Icon';

export default function GateProyectoLegacy({ modulo = 'Este módulo', icono = 'fileText', children }) {
  const { proyectoActivoId, proyectoActivo } = useProyectoActivo();
  if (LEGACY_CREDITEX_IDS.includes(proyectoActivoId)) return children;

  const nombre = proyectoActivo?.nombre || 'este proyecto';
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px',
      borderTop: `3px solid ${BASE.navy}`,
      padding: '48px 32px', textAlign: 'center', boxShadow: BASE.shadowMd,
    }}>
      <Icon name={icono} size={38} color={BASE.gold} strokeWidth={1.6} />
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: BASE.navy, margin: '14px 0 6px', letterSpacing: '0.6px' }}>
        SIN PLAN PROPIO TODAVÍA
      </h3>
      <p style={{ fontSize: '12.5px', color: BASE.muted, maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
        {modulo} muestra el plan base importado del Excel de <strong>CREDITEX</strong> — esa
        información pertenece a ese proyecto y no se mezcla con <strong>{nombre}</strong>.
        Para planificar aquí, usa el <strong>Cronograma de Obra (Pro)</strong> y el{' '}
        <strong>Last Planner</strong>, que sí son por proyecto.
      </p>
    </div>
  );
}
