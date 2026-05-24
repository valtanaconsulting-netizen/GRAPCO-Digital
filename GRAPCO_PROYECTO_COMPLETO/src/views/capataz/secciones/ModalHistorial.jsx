// src/views/capataz/secciones/ModalHistorial.jsx
// Modal con el historial de borradores y registros subidos del capataz.
// Al elegir una fecha, el padre cambia la fecha activa y cierra el modal.
import React from 'react';
import Modal from '../../../components/Modal';
import { BASE } from '../../../utils/styles';
import { fmtFecha } from '../../../utils/helpers';

export default function ModalHistorial({
  historialDelCap,
  capataz,
  onClose,
  onSelectFecha,
}) {
  return (
    <Modal
      title="📅 Mis registros — Últimos 30 días"
      onClose={onClose}
      maxW="560px"
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {historialDelCap.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: BASE.muted, fontSize: '13px' }}>
            No hay registros previos para {capataz}
          </p>
        ) : historialDelCap.map(h => (
          <div
            key={h.fecha}
            onClick={() => onSelectFecha(h.fecha)}
            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            style={{
              padding: '12px 14px', borderBottom: `1px solid ${BASE.border}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '10px', transition: '0.15s',
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: BASE.navy }}>
                {fmtFecha(h.fecha)}
              </p>
              <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                {h.tieneBorrador && (
                  <span style={{ marginRight: '10px' }}>
                    📝 Borrador ({h.actividadesBorrador} act)
                  </span>
                )}
                {h.tieneRegistro && (
                  <span style={{ color: BASE.green }}>
                    ✅ {h.registros || 1} registro{h.registros > 1 ? 's' : ''} subido{h.registros > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <span style={{ fontSize: '18px', color: BASE.green }}>→</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
