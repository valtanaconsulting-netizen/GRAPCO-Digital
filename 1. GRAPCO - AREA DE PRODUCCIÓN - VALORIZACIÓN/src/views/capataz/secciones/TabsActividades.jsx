// src/views/capataz/secciones/TabsActividades.jsx
// Si no hay actividades → empty state con CTA "Crear primera actividad".
// Si hay → rejilla de CUADROS que se reacomoda sola al ancho (auto-fill): 2
// columnas en móvil, más en tablet/desktop, sin scroll horizontal. Cada cuadro
// muestra # de orden, nombre en dos líneas (no una tira con elipsis), HH del día
// y un check si ya se subió. La activa va con borde dorado y fondo navy.
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
      padding: '11px',
      marginBottom: '18px',
      boxShadow: BASE.shadowSm,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '9px',
      }}>
        <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.6px' }}>
          📌 ACTIVIDADES DEL DÍA
        </p>
        <span style={{
          fontSize: '9px', fontWeight: '800', color: BASE.gold,
          background: BASE.goldLight, padding: '2px 9px', borderRadius: '12px',
        }}>{actividades.length}</span>
      </div>
      <div style={{
        display: 'grid',
        // Cuadros que se reacomodan al ancho: ~140px mínimo → 2 en móvil, más en
        // tablet/desktop. Sin scroll horizontal, todo a la vista.
        gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '132px' : '150px'}, 1fr))`,
        gap: '8px',
      }}>
        {actividades.map((a, i) => {
          const esActiva = a.id === actActivaId;
          const totalHHAct = a.detalleTareo.reduce((s, t) => s + (t.hn || 0) + (t.he || 0), 0);
          const definida = !!a.actividad;
          return (
            <button key={a.id} type="button" onClick={() => onSetActActivaId(a.id)} style={{
              position: 'relative',
              padding: '10px 11px', borderRadius: '12px',
              border: esActiva ? `2px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
              background: esActiva ? BASE.navy : BASE.white,
              color: esActiva ? '#fff' : BASE.text,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: '8px',
              width: '100%', boxSizing: 'border-box', textAlign: 'left',
              transition: 'all 0.15s',
              boxShadow: esActiva ? '0 4px 14px -3px rgba(15,42,71,0.35)' : BASE.shadowSm,
              minHeight: '78px',
            }}>
              {/* Fila superior: nº de orden y check de subido */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '10px', fontWeight: '800',
                  background: esActiva ? BASE.gold : BASE.bgSoft,
                  color: esActiva ? BASE.navy : BASE.muted,
                  padding: '2px 8px', borderRadius: '6px',
                }}>{i + 1}</span>
                {a._registroExistenteId
                  ? <span title="Ya subido" style={{ fontSize: '13px' }}>✅</span>
                  : !definida && <span title="Falta definir" style={{ fontSize: '13px' }}>✏️</span>}
              </div>
              {/* Nombre en dos líneas (no una tira con elipsis) */}
              <span style={{
                flex: 1, fontSize: '11.5px', fontWeight: '700', lineHeight: 1.25,
                color: esActiva ? '#fff' : (definida ? BASE.text : BASE.mutedSoft),
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {a.actividad || 'Sin definir'}
              </span>
              {/* HH del día */}
              <span style={{
                alignSelf: 'flex-start',
                fontSize: '10px', fontWeight: '800',
                background: esActiva ? 'rgba(255,255,255,0.18)' : BASE.bgSoft,
                color: esActiva ? '#fff' : BASE.navy,
                padding: '3px 9px', borderRadius: '999px',
              }}>{totalHHAct.toFixed(1)} h</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
