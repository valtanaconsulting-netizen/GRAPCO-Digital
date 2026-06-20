// src/views/capataz/secciones/InicioCapataz.jsx
// Landing del capataz: dos módulos para el día.
//   1) TAREO   → coloca a la gente y sus HH en las actividades del día.
//   2) METRADO → en esas MISMAS actividades, llena metrado + observación + fotos.
// El METRADO queda BLOQUEADO hasta que el tareo tenga al menos una actividad con
// horas (HH). El metrado "deriva" del tareo: las actividades ya vienen escogidas.
import React from 'react';
import { BASE } from '../../../utils/styles';

function Tarjeta({ icon, titulo, subtitulo, detalle, cta, color, bloqueada, motivo, onClick }) {
  return (
    <button
      type="button"
      onClick={bloqueada ? undefined : onClick}
      disabled={bloqueada}
      style={{
        textAlign: 'left',
        background: BASE.white,
        border: `1.5px solid ${bloqueada ? BASE.border : color + '55'}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: bloqueada ? 'not-allowed' : 'pointer',
        opacity: bloqueada ? 0.62 : 1,
        boxShadow: bloqueada ? 'none' : BASE.shadowSm,
        display: 'flex', flexDirection: 'column', gap: '12px',
        transition: 'transform 0.12s, box-shadow 0.12s',
        position: 'relative', minHeight: '180px',
      }}
    >
      {bloqueada && (
        <span style={{
          position: 'absolute', top: '12px', right: '12px',
          background: BASE.bgSoft, color: BASE.muted,
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px',
          padding: '4px 9px', borderRadius: '999px',
          border: `1px solid ${BASE.border}`,
        }}>🔒 BLOQUEADO</span>
      )}
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px',
        background: bloqueada ? BASE.bgSoft : `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '26px', flexShrink: 0,
        boxShadow: bloqueada ? 'none' : `0 4px 12px ${color}44`,
      }}>{icon}</div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: bloqueada ? BASE.muted : color, letterSpacing: '1.2px' }}>
          {subtitulo}
        </p>
        <h3 style={{ fontSize: '19px', fontWeight: '900', color: BASE.navy, marginTop: '2px' }}>
          {titulo}
        </h3>
        <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '6px', lineHeight: 1.45 }}>
          {bloqueada ? motivo : detalle}
        </p>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        alignSelf: 'flex-start',
        padding: '9px 16px', borderRadius: '10px',
        background: bloqueada ? BASE.bgSoft : color,
        color: bloqueada ? BASE.muted : '#fff',
        fontSize: '12px', fontWeight: '800',
      }}>
        {bloqueada ? 'Completa el tareo primero' : cta} {!bloqueada && '▶'}
      </div>
    </button>
  );
}

export default function InicioCapataz({
  fecha,
  capataz,
  obtenerSemana,
  isMobile,
  actividadesCount,
  actividadesConHHCount,
  totalHH,
  tieneTareo,
  onAbrirTareo,
  onAbrirMetrado,
}) {
  return (
    <div className="anim-fade-in" style={{ maxWidth: '760px', margin: '0 auto', width: '100%' }}>
      {/* Resumen del día — compacto, sin tarjetones */}
      <div style={{
        background: BASE.white,
        borderRadius: '12px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy }}>{capataz}</p>
          <p style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
            {fecha} · Sem {obtenerSemana(fecha)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { l: 'ACTS', v: actividadesCount, c: BASE.navy },
            { l: 'CON HH', v: actividadesConHHCount, c: actividadesConHHCount > 0 ? BASE.green : BASE.muted },
            { l: 'HH', v: totalHH.toFixed(1), c: BASE.gold },
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
      </div>

      <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.gold, letterSpacing: '1px', marginBottom: '12px' }}>
        ¿QUÉ VAS A REGISTRAR?
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '14px',
      }}>
        <Tarjeta
          icon="👷"
          subtitulo="PASO 1"
          titulo="Tareo"
          detalle="Escoge las actividades del día y coloca a tu gente con sus horas (HN/HE). Puedes importar las horas del marcador facial."
          cta="Empezar tareo"
          color={BASE.navy}
          bloqueada={false}
          onClick={onAbrirTareo}
        />
        <Tarjeta
          icon="📏"
          subtitulo="PASO 2"
          titulo="Metrado y observaciones"
          detalle="En las actividades de tu tareo, registra el metrado avanzado, observaciones y fotos. Luego súbelo a la oficina técnica."
          cta="Ir al metrado"
          color={BASE.gold}
          bloqueada={!tieneTareo}
          motivo="Primero coloca al menos una actividad con horas en el TAREO. El metrado se llena sobre esas mismas actividades."
          onClick={onAbrirMetrado}
        />
      </div>
    </div>
  );
}
