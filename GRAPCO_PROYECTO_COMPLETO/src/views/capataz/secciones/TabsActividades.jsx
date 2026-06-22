// src/views/capataz/secciones/TabsActividades.jsx
// Si no hay actividades → empty state con CTA "Crear primera actividad".
// Si hay → grilla compacta de 3 filas que crece en columnas (column-major):
// se ven 2 columnas (6 actividades) y se desliza horizontalmente de 3 en 3
// para ver el resto, ocupando el mismo espacio. La activa se resalta con
// borde dorado y fondo navy. Cada celda muestra # de orden, nombre, HH del
// día y check si ya se subió ese registro.
import React from 'react';
import { BASE } from '../../../utils/styles';

export default function TabsActividades({
  actividades,
  actActivaId,
  isMobile,
  onSetActActivaId,
  onAgregarActividad,
}) {
  if (actividades.length === 0) {
    return (
      <div style={{
        background: BASE.white,
        borderRadius: '14px',
        border: `2px dashed ${BASE.border}`,
        padding: '50px 24px',
        textAlign: 'center',
        boxShadow: BASE.shadowSm,
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: BASE.goldLight,
          margin: '0 auto 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '32px' }}>📋</span>
        </div>
        <p style={{ fontSize: '15px', fontWeight: '800', color: BASE.navy, marginBottom: '6px' }}>
          Aún no hay actividades
        </p>
        <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '20px', lineHeight: 1.5 }}>
          Usa el botón <strong>➕ Nueva actividad</strong> {isMobile ? 'arriba' : 'del panel lateral'} o explora el catálogo
        </p>
        <button type="button" onClick={onAgregarActividad} style={{
          padding: '12px 24px',
          background: BASE.green, color: '#fff', border: 'none', borderRadius: '10px',
          fontSize: '13px', fontWeight: '800', cursor: 'pointer',
          boxShadow: `0 4px 12px ${BASE.green}55`,
        }}>
          ➕ Crear primera actividad
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: BASE.white,
      borderRadius: '14px',
      border: `1px solid ${BASE.border}`,
      padding: '12px',
      marginBottom: '14px',
      boxShadow: BASE.shadowSm,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.6px' }}>
          📌 ACTIVIDADES DEL DÍA
        </p>
        <span style={{
          fontSize: '10px', fontWeight: '800', color: BASE.gold,
          background: BASE.goldLight, padding: '3px 10px', borderRadius: '12px',
        }}>{actividades.length}</span>
      </div>
      <div style={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridTemplateRows: 'repeat(3, auto)',
        gridAutoColumns: 'calc(50% - 3px)',
        columnGap: '6px', rowGap: '5px',
        overflowX: 'auto', overflowY: 'hidden',
        paddingBottom: '4px',
        marginRight: '-6px', paddingRight: '6px',
        scrollSnapType: 'x proximity',
      }}>
        {actividades.map((a, i) => {
          const esActiva = a.id === actActivaId;
          const totalHHAct = a.detalleTareo.reduce((s, t) => s + (t.hn || 0) + (t.he || 0), 0);
          return (
            <button key={a.id} type="button" onClick={() => onSetActActivaId(a.id)} style={{
              padding: '6px 9px', borderRadius: '8px',
              border: esActiva ? `2px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
              background: esActiva ? BASE.navy : BASE.white,
              color: esActiva ? '#fff' : BASE.text,
              fontSize: '11px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '7px',
              width: '100%', boxSizing: 'border-box', textAlign: 'left',
              transition: 'all 0.15s',
              flexShrink: 0,
              scrollSnapAlign: 'start',
            }}>
              <span style={{
                fontSize: '9px', fontWeight: '800',
                background: esActiva ? BASE.gold : BASE.bgSoft,
                color: esActiva ? BASE.navy : BASE.muted,
                padding: '2px 6px', borderRadius: '5px',
                flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {a.actividad || 'Sin definir'}
              </span>
              <span style={{
                fontSize: '9px',
                background: esActiva ? 'rgba(255,255,255,0.18)' : BASE.bgSoft,
                padding: '1px 6px', borderRadius: '4px',
                opacity: esActiva ? 1 : 0.7, flexShrink: 0,
              }}>{totalHHAct.toFixed(1)}h</span>
              {a._registroExistenteId && <span title="Ya subido" style={{ fontSize: '11px', flexShrink: 0 }}>✅</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
