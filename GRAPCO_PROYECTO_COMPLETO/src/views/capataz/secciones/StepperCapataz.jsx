// src/views/capataz/secciones/StepperCapataz.jsx
// Cabecera MINIMALISTA del módulo del capataz (uso en terreno, una mano, bajo el sol):
// solo un botón "‹ Volver" arriba a la izquierda (estándar móvil premium) + el título
// del módulo en texto plano. Sin tarjetón "PASO 1", sin icono grande, sin ruido visual.
import React from 'react';
import { BASE } from '../../../utils/styles';

const TITULO = {
  tareo:   'Tareo',
  metrado: 'Metrado y observaciones',
};

export default function StepperCapataz({ vista, onIrInicio, isMobile, onAbrirMenu, onAgregarActividad }) {
  const titulo = TITULO[vista] || TITULO.tareo;
  const esTareo = vista === 'tareo';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <button
        type="button"
        onClick={onIrInicio}
        aria-label="Volver a los módulos"
        className="btn-feedback"
        style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          height: '40px', padding: '0 15px 0 10px', borderRadius: '11px',
          border: `1px solid ${BASE.border}`, background: BASE.white,
          color: BASE.navy, fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '-2px' }}>‹</span> Volver
      </button>
      {/* Móvil: abre el menú lateral (drawer) con todas las opciones — a la IZQUIERDA,
          junto a "Volver", coherente con el drawer que entra por la izquierda. */}
      {isMobile && onAbrirMenu && (
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir opciones"
          className="btn-feedback"
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            height: '40px', padding: '0 15px', borderRadius: '11px',
            border: `1px solid ${BASE.border}`, background: BASE.white,
            color: BASE.navy, fontSize: '13px', fontWeight: '800', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '17px', lineHeight: 1 }}>☰</span> Opciones
        </button>
      )}
      {/* En el PASO de tareo, el lugar del título es un acceso directo para
          añadir otra actividad (letras más chicas). En metrado se mantiene el
          título plano del módulo. */}
      {esTareo && onAgregarActividad ? (
        <button
          type="button"
          onClick={onAgregarActividad}
          aria-label="Agregar otra actividad"
          className="btn-feedback"
          style={{
            marginLeft: 'auto', minWidth: 0, flexShrink: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            height: '40px', padding: '0 14px', borderRadius: '11px',
            border: 'none', background: BASE.green, color: '#fff',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer',
            boxShadow: `0 2px 8px ${BASE.green}55`,
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>➕</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Agregar otra actividad</span>
        </button>
      ) : (
        <h2 style={{ flex: 1, fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '-0.2px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {titulo}
        </h2>
      )}
    </div>
  );
}
