// src/views/capataz/secciones/StepperCapataz.jsx
// Barra de pasos del capataz: Paso 1 (Tareo) → Paso 2 (Metrado).
// Permite volver al inicio y saltar entre pasos. El Paso 2 queda bloqueado
// hasta que el tareo tenga al menos una actividad con horas (tieneTareo).
import React from 'react';
import { BASE } from '../../../utils/styles';

function Paso({ n, label, icon, activo, bloqueado, onClick }) {
  return (
    <button
      type="button"
      onClick={bloqueado ? undefined : onClick}
      disabled={bloqueado}
      style={{
        flex: 1, minWidth: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '10px 12px', borderRadius: '10px',
        border: activo ? `2px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
        background: activo ? BASE.navy : BASE.white,
        color: activo ? '#fff' : bloqueado ? BASE.muted : BASE.navy,
        cursor: bloqueado ? 'not-allowed' : 'pointer',
        opacity: bloqueado ? 0.6 : 1,
        fontSize: '12px', fontWeight: '800',
        transition: 'all 0.12s',
      }}
    >
      <span style={{
        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
        background: activo ? BASE.gold : BASE.bgSoft,
        color: activo ? BASE.navy : BASE.muted,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: '900',
      }}>{bloqueado ? '🔒' : n}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {icon} {label}
      </span>
    </button>
  );
}

export default function StepperCapataz({ vista, tieneTareo, onIrInicio, onIr }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '14px',
    }}>
      <button
        type="button"
        onClick={onIrInicio}
        title="Volver al inicio"
        style={{
          flexShrink: 0,
          width: '38px', height: '38px', borderRadius: '10px',
          border: `1.5px solid ${BASE.border}`, background: BASE.white,
          color: BASE.navy, fontSize: '16px', fontWeight: '800', cursor: 'pointer',
        }}
      >‹</button>
      <Paso
        n={1} label="Tareo" icon="👷"
        activo={vista === 'tareo'}
        bloqueado={false}
        onClick={() => onIr('tareo')}
      />
      <span style={{ color: BASE.muted, fontSize: '14px', flexShrink: 0 }}>→</span>
      <Paso
        n={2} label="Metrado" icon="📏"
        activo={vista === 'metrado'}
        bloqueado={!tieneTareo}
        onClick={() => onIr('metrado')}
      />
    </div>
  );
}
