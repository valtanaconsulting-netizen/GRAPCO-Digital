// src/components/ConfirmModal.jsx
// Modal de confirmación premium (reemplaza window.confirm): overlay oscuro con
// blur, tarjeta blanca centrada, barra de acento dorada y botones de marca.

import React from 'react';
import { BASE } from '../utils/styles';

export default function ConfirmModal({
  abierto,
  titulo = '¿Confirmar?',
  mensaje,
  detalle,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  tono = 'navy', // 'navy' | 'peligro'
  icono = '❓',
  onConfirmar,
  onCancelar,
}) {
  if (!abierto) return null;
  const acento = tono === 'peligro' ? BASE.red : BASE.navy;
  const acentoFin = tono === 'peligro' ? BASE.redDark : BASE.navyDark;
  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8,18,34,0.55)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
        style={{
          background: '#fff', borderRadius: '18px', maxWidth: '440px', width: '100%',
          boxShadow: '0 32px 64px -16px rgba(8,18,34,0.55), inset 0 1px 0 rgba(255,255,255,0.6)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '5px', background: `linear-gradient(90deg, ${BASE.gold}, ${BASE.goldDark})` }} />
        <div style={{ padding: '22px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: `${acento}12`, border: `1px solid ${acento}2A`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>{icono}</span>
            <p style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy, lineHeight: 1.25 }}>{titulo}</p>
          </div>
          {mensaje && <p style={{ fontSize: '13.5px', color: BASE.text, lineHeight: 1.55, margin: 0 }}>{mensaje}</p>}
          {detalle && <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.5, marginTop: '6px' }}>{detalle}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={onCancelar} style={{
              padding: '10px 18px', borderRadius: '10px', border: `1.5px solid ${BASE.border}`,
              background: BASE.white, color: BASE.muted, fontSize: '13px', fontWeight: 800, cursor: 'pointer',
            }}>{textoCancelar}</button>
            <button onClick={onConfirmar} style={{
              padding: '10px 22px', borderRadius: '10px', border: 'none',
              background: `linear-gradient(135deg, ${acento}, ${acentoFin})`, color: '#fff',
              fontSize: '13px', fontWeight: 900, cursor: 'pointer',
              boxShadow: `0 8px 18px -5px ${acento}99`,
            }}>{textoConfirmar}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
