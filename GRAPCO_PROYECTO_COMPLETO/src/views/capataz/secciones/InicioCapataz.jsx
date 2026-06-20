// src/views/capataz/secciones/InicioCapataz.jsx
// PANTALLA DE ENTRADA del capataz = selector de ÁREAS a pantalla completa.
// Apenas ingresa con su cuenta ve esto PRIMERO: escoge un área (Tareo o Metrado)
// y recién entra. Su cuadrilla se autoselecciona (si hace falta, puede cambiarla
// aquí mismo). El METRADO queda bloqueado hasta que el tareo tenga horas.
import React from 'react';
import { BASE } from '../../../utils/styles';
import { hoy } from '../../../utils/helpers';
import DateInput from '../../../components/DateInput';
import SelectorCapataz from './SelectorCapataz';

const ayer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

function AreaCard({ icon, paso, titulo, detalle, cta, color, bloqueada, motivo, onClick, isMobile }) {
  return (
    <button
      type="button"
      onClick={bloqueada ? undefined : onClick}
      disabled={bloqueada}
      style={{
        textAlign: 'left',
        background: BASE.white,
        border: `1.5px solid ${bloqueada ? BASE.border : color + '55'}`,
        borderRadius: '18px',
        padding: isMobile ? '20px' : '26px',
        cursor: bloqueada ? 'not-allowed' : 'pointer',
        opacity: bloqueada ? 0.6 : 1,
        boxShadow: bloqueada ? 'none' : BASE.shadowMd,
        display: 'flex', flexDirection: 'column', gap: '14px',
        position: 'relative', minHeight: isMobile ? 'auto' : '230px',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => { if (!bloqueada) e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
    >
      {bloqueada && (
        <span style={{
          position: 'absolute', top: '14px', right: '14px',
          background: BASE.bgSoft, color: BASE.muted,
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px',
          padding: '4px 10px', borderRadius: '999px', border: `1px solid ${BASE.border}`,
        }}>🔒 BLOQUEADO</span>
      )}
      <div style={{
        width: '60px', height: '60px', borderRadius: '16px',
        background: bloqueada ? BASE.bgSoft : `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '30px', flexShrink: 0,
        boxShadow: bloqueada ? 'none' : `0 6px 16px ${color}44`,
      }}>{icon}</div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: bloqueada ? BASE.muted : color, letterSpacing: '1.4px' }}>
          {paso}
        </p>
        <h3 style={{ fontSize: isMobile ? '20px' : '23px', fontWeight: '900', color: BASE.navy, marginTop: '3px' }}>
          {titulo}
        </h3>
        <p style={{ fontSize: '12.5px', color: BASE.muted, marginTop: '8px', lineHeight: 1.5 }}>
          {bloqueada ? motivo : detalle}
        </p>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start',
        padding: '11px 20px', borderRadius: '12px',
        background: bloqueada ? BASE.bgSoft : color,
        color: bloqueada ? BASE.muted : '#fff',
        fontSize: '13px', fontWeight: '800', letterSpacing: '0.3px',
      }}>
        {bloqueada ? 'Completa el tareo primero' : <>{cta} ▶</>}
      </div>
    </button>
  );
}

export default function InicioCapataz({
  fecha, capataz, fechaLimitada, cuadrillasParaSelect, miembrosCuadrilla,
  setFecha, setCapataz, obtenerSemana, showToast, isMobile,
  actividadesCount, actividadesConHHCount, totalHH, tieneTareo,
  onAbrirTareo, onAbrirMetrado,
}) {
  const opcionesCapataz = Object.entries(cuadrillasParaSelect || {}).map(([nombre, miembros]) => ({
    nombre, miembros: Array.isArray(miembros) ? miembros.length : null,
  }));

  return (
    <div className="anim-fade-in" style={{
      maxWidth: '880px', margin: '0 auto', width: '100%',
      padding: isMobile ? '6px 0 24px' : '14px 0 32px',
    }}>
      {/* Saludo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '15px', flexShrink: 0,
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', boxShadow: BASE.shadowMd,
        }}>👷</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.gold, letterSpacing: '1px' }}>
            PANEL DEL CAPATAZ
          </p>
          <h2 style={{ fontSize: isMobile ? '19px' : '23px', fontWeight: '900', color: BASE.navy, lineHeight: 1.15 }}>
            {capataz ? `Hola, ${capataz}` : 'Elige tu cuadrilla'}
          </h2>
        </div>
      </div>

      {/* Fecha + Capataz (compacto) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr',
        gap: '12px', marginBottom: '14px',
      }}>
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px',
          padding: '10px 12px', boxShadow: BASE.shadowSm,
        }}>
          <p style={{ fontSize: '9px', fontWeight: '800', color: BASE.gold, letterSpacing: '1px', marginBottom: '6px' }}>
            📅 FECHA DE TRABAJO
          </p>
          <DateInput
            label=""
            value={fecha}
            onChange={(d) => {
              if (!fechaLimitada) { setFecha(d); return; }
              if (d === hoy() || d === ayer()) setFecha(d);
              else showToast('Solo puedes editar el tareo de hoy o de ayer.', 'warning');
            }}
            getSemana={obtenerSemana}
            min={fechaLimitada ? ayer() : null}
            max={hoy()}
          />
        </div>
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px',
          padding: '10px 12px', boxShadow: BASE.shadowSm,
        }}>
          <p style={{ fontSize: '9px', fontWeight: '800', color: BASE.gold, letterSpacing: '1px', marginBottom: '6px' }}>
            👷 CAPATAZ {opcionesCapataz.length <= 1 && '(tu cuadrilla)'}
          </p>
          <SelectorCapataz
            value={capataz}
            opciones={opcionesCapataz}
            onChange={setCapataz}
          />
          {capataz && miembrosCuadrilla?.length > 0 && (
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '6px', fontWeight: '600' }}>
              👥 {miembrosCuadrilla.length} en cuadrilla · Sem {obtenerSemana(fecha)}
            </p>
          )}
        </div>
      </div>

      {/* Mini-resumen del día */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { l: 'ACTIVIDADES', v: actividadesCount, c: BASE.navy },
          { l: 'CON HORAS', v: actividadesConHHCount, c: actividadesConHHCount > 0 ? BASE.green : BASE.muted },
          { l: 'HH TOTAL', v: totalHH.toFixed(1), c: BASE.gold },
        ].map(s => (
          <div key={s.l} style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: BASE.white, padding: '6px 12px', borderRadius: '999px',
            border: `1px solid ${BASE.border}`, boxShadow: BASE.shadowSm,
          }}>
            <span style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px' }}>{s.l}</span>
            <span style={{ fontSize: '13px', fontWeight: '900', color: s.c, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{s.v}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.2px', marginBottom: '14px' }}>
        ¿QUÉ VAS A REGISTRAR? ELIGE UN MÓDULO
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        <AreaCard
          icon="👷" paso="PASO 1 · ÁREA" titulo="Tareo"
          detalle="Escoge las actividades del día y coloca a tu gente con sus horas (HN/HE). Puedes importar las horas del marcador facial."
          cta="Empezar tareo" color={BASE.navy} isMobile={isMobile}
          bloqueada={!capataz}
          motivo="Primero elige tu cuadrilla arriba."
          onClick={onAbrirTareo}
        />
        <AreaCard
          icon="📏" paso="PASO 2 · ÁREA" titulo="Metrado y observaciones"
          detalle="En las actividades de tu tareo, registra el metrado avanzado, observaciones y fotos. Luego súbelo a la oficina técnica."
          cta="Ir al metrado" color={BASE.gold} isMobile={isMobile}
          bloqueada={!tieneTareo}
          motivo="Primero coloca al menos una actividad con horas en el TAREO. El metrado se llena sobre esas mismas actividades."
          onClick={onAbrirMetrado}
        />
      </div>
    </div>
  );
}
