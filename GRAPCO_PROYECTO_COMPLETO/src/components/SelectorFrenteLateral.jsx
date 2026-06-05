// src/components/SelectorFrenteLateral.jsx
// Selector de FRENTE para el sidebar izquierdo (dentro del área "Planeamiento y Producción").
// El PROYECTO se elige al entrar (Módulo de áreas); aquí solo se cambia el frente.
// Tema navy (sidebar oscuro). Maneja el modo colapsado del sidebar.

import React from 'react';
import { BASE } from '../utils/styles';
import { useProyectoActivo, FRENTE_TODOS } from '../contexts/ProyectoActivoContext';

const optDark = { color: '#0F2A47', background: '#ffffff', fontWeight: 700 };

export default function SelectorFrenteLateral({ collapsed }) {
  const {
    proyectoActivo, frentesDelProyecto,
    frenteActivoId, setFrenteActivoId, frenteActivo, modoTodosFrentes,
  } = useProyectoActivo();

  // Modo colapsado: solo un icono con tooltip (el usuario expande el sidebar para cambiarlo).
  if (collapsed) {
    return (
      <div
        title={`Frente: ${modoTodosFrentes ? 'Todos (vista agregada)' : (frenteActivo?.nombre || '—')}`}
        style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px', marginBottom: '4px' }}
      >
        <span style={{
          width: '30px', height: '30px', borderRadius: '8px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: modoTodosFrentes ? 'rgba(229,168,47,0.18)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${modoTodosFrentes ? BASE.gold + '66' : 'rgba(255,255,255,0.16)'}`,
          fontSize: '15px',
        }}>📍</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '10px',
      padding: '8px 10px',
      margin: '0 4px 12px',
    }}>
      {proyectoActivo && (
        <div style={{
          fontSize: '8.5px', fontWeight: '800', color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.5px', marginBottom: '5px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          🏗️ {proyectoActivo.nombre}
        </div>
      )}
      <label style={{
        display: 'block', fontSize: '8.5px', fontWeight: '900',
        color: BASE.gold, letterSpacing: '0.7px', marginBottom: '4px',
      }}>📍 FRENTE</label>
      <select
        value={frenteActivoId || FRENTE_TODOS}
        onChange={e => setFrenteActivoId(e.target.value)}
        style={{
          width: '100%', padding: '7px 8px', borderRadius: '8px',
          background: modoTodosFrentes ? 'rgba(229,168,47,0.18)' : 'rgba(255,255,255,0.08)',
          color: '#fff',
          border: `1px solid ${modoTodosFrentes ? BASE.gold + '66' : 'rgba(255,255,255,0.18)'}`,
          fontSize: '11px', fontWeight: '700', cursor: 'pointer', outline: 'none',
        }}
      >
        <option value={FRENTE_TODOS} style={optDark}>🌐 Todos los frentes (vista agregada)</option>
        {(frentesDelProyecto || []).length === 0 && (
          <option value="" disabled style={optDark}>— sin frentes —</option>
        )}
        {(frentesDelProyecto || []).map(f => (
          <option key={f.id} value={f.id} style={optDark}>
            {f.codigo ? `${f.codigo} · ` : ''}{f.nombre || f.id}
          </option>
        ))}
      </select>
    </div>
  );
}
