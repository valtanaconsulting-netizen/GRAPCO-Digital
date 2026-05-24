// src/views/capataz/secciones/HeaderCapataz.jsx
// Banda corporativa compacta arriba del editor:
//   izquierda → fecha + semana + nombre del capataz
//   derecha   → píldoras de KPIs del día (ACTS / HN / HE / TOTAL)
// Las píldoras solo aparecen si hay al menos una actividad cargada.
import React from 'react';
import { BASE } from '../../../utils/styles';
import { fmtFecha } from '../../../utils/helpers';

export default function HeaderCapataz({
  fecha,
  capataz,
  actividadesCount,
  totalHHActivas,
  obtenerSemana,
}) {
  return (
    <div style={{
      background: BASE.white,
      borderRadius: '10px',
      border: `1px solid ${BASE.border}`,
      borderLeft: `4px solid ${BASE.gold}`,
      padding: '10px 16px',
      marginBottom: '14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
          {fmtFecha(fecha)} · Sem {obtenerSemana(fecha)}
        </span>
        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
          {capataz}
        </span>
      </div>
      {actividadesCount > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { l: 'ACTS',  v: actividadesCount,                  c: BASE.navy },
            { l: 'HN',    v: totalHHActivas.hn.toFixed(1),      c: BASE.navy },
            { l: 'HE',    v: totalHHActivas.he.toFixed(1),      c: totalHHActivas.he > 0 ? BASE.gold : BASE.muted },
            { l: 'TOTAL', v: totalHHActivas.total.toFixed(1),   c: BASE.gold },
          ].map(s => (
            <div key={s.l} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#f1f5f9', padding: '4px 10px', borderRadius: '999px',
              border: `1px solid ${BASE.border}`,
            }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px' }}>{s.l}</span>
              <span style={{ fontSize: '12px', fontWeight: '900', color: s.c, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{s.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
