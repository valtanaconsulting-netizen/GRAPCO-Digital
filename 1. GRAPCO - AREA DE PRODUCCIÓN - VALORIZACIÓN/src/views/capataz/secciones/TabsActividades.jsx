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
  // Tocar la tarjeta YA activa pide cambiar su actividad. No se ofrece en las
  // que vienen del Plan Diario: esas las programó el ingeniero.
  onCambiarActividad = null,
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
          Si el ingeniero te asignó el plan del día, sus actividades aparecen aquí solas.
          <br />
          Si no, usa <strong>➕ Añadir otra actividad</strong> {isMobile ? 'arriba' : 'del panel lateral'} o busca en el catálogo.
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
        // UNA SOLA FILA que se desliza en horizontal. Antes era una rejilla que
        // bajaba de línea: con 6-8 actividades el bloque crecía hacia abajo y
        // empujaba el tareo fuera de la pantalla. Ahora las actividades caben a
        // lo ancho —la fila se arrastra con el dedo— y el alto no cambia nunca.
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        overflowY: 'hidden',
        // Anclaje suave: al soltar, la tarjeta queda alineada y no a medias.
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '4px',
      }}>
        {actividades.map((a, i) => {
          const esActiva = a.id === actActivaId;
          const totalHHAct = a.detalleTareo.reduce((s, t) => s + (t.hn || 0) + (t.he || 0), 0);
          const definida = !!a.actividad;
          // Editable = la añadió el capataz. Las del Plan Diario quedan fijas…
          // SALVO que les falte la clasificación (partida o subpartida): sin
          // ella el envío se bloquea, y si además no se pudieran tocar, el día
          // quedaría sin salida. En ese caso se permite corregirla.
          const incompleta = !a.partida || !a.subpartida;
          const editable = (!a._delPlan || incompleta) && !!onCambiarActividad;
          return (
            <button key={a.id} type="button"
              title={esActiva && editable ? 'Tocar otra vez para cambiar la actividad' : (a.actividad || 'Sin definir')}
              onClick={() => {
                // Primer toque: la selecciona. Segundo toque sobre la que ya está
                // activa: abre los selectores para cambiarla.
                if (esActiva && editable) onCambiarActividad(a.id);
                else onSetActActivaId(a.id);
              }}
              style={{
              position: 'relative',
              padding: '9px 9px', borderRadius: '12px',
              border: esActiva ? `2px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
              background: esActiva ? BASE.navy : BASE.white,
              color: esActiva ? '#fff' : BASE.text,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: '7px',
              // Mitad de ancho que antes → caben el doble de actividades a la
              // vista. El nombre ya no va en una tira: se parte en varias líneas
              // («COLOCADO / DE / ACERO»), que es como se lee de un vistazo.
              flex: `0 0 ${isMobile ? '92px' : '108px'}`,
              scrollSnapAlign: 'start',
              boxSizing: 'border-box', textAlign: 'left',
              transition: 'all 0.15s',
              boxShadow: esActiva ? '0 4px 14px -3px rgba(15,42,71,0.35)' : BASE.shadowSm,
              minHeight: '104px',
            }}>
              {/* Fila superior: nº de orden, sello «PLAN» y check de subido.
                  Todo reducido para caber en la tarjeta estrecha sin apretarse. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span style={{
                    fontSize: '9px', fontWeight: '800', flexShrink: 0,
                    background: esActiva ? BASE.gold : BASE.bgSoft,
                    color: esActiva ? BASE.navy : BASE.muted,
                    padding: '1px 6px', borderRadius: '5px',
                  }}>{i + 1}</span>
                  {/* Deja claro que la actividad la programó el ingeniero y no
                      hay que volver a crearla: solo completar sus horas. */}
                  {a._delPlan && (
                    <span title="Programada por el ingeniero en el Plan Diario" style={{
                      fontSize: '7.5px', fontWeight: '800', letterSpacing: '0.2px', flexShrink: 0,
                      background: esActiva ? 'rgba(255,255,255,0.20)' : BASE.goldLight,
                      color: esActiva ? '#fff' : BASE.goldDark,
                      padding: '1px 4px', borderRadius: '4px', whiteSpace: 'nowrap',
                    }}>PLAN</span>
                  )}
                </span>
                {/* El lápiz también aparece en la tarjeta activa y editable: es
                    la pista de que otro toque permite cambiar la actividad. */}
                {a._registroExistenteId
                  ? <span title="Ya subido" style={{ fontSize: '11px', flexShrink: 0 }}>✅</span>
                  : (!definida || (esActiva && editable))
                    ? <span title={definida ? 'Tocar otra vez para cambiarla' : 'Falta definir'}
                        style={{ fontSize: '11px', flexShrink: 0 }}>✏️</span>
                    : null}
              </div>
              {/* Nombre repartido en hasta 4 líneas. `anywhere` parte también una
                  palabra sola muy larga (p. ej. IMPERMEABILIZACIÓN), que en una
                  tarjeta estrecha no cabría de otro modo. */}
              <span style={{
                flex: 1, fontSize: '10.5px', fontWeight: '700', lineHeight: 1.22,
                color: esActiva ? '#fff' : (definida ? BASE.text : BASE.mutedSoft),
                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                overflowWrap: 'anywhere',
              }}>
                {a.actividad || 'Sin definir'}
              </span>
              {/* HH del día */}
              <span style={{
                alignSelf: 'flex-start',
                fontSize: '9.5px', fontWeight: '800', whiteSpace: 'nowrap',
                background: esActiva ? 'rgba(255,255,255,0.18)' : BASE.bgSoft,
                color: esActiva ? '#fff' : BASE.navy,
                padding: '2px 7px', borderRadius: '999px',
              }}>{totalHHAct.toFixed(1)} h</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
