// src/views/capataz/secciones/InicioCapataz.jsx
// PANTALLA DE ENTRADA del capataz, con el MISMO lenguaje que el selector de áreas
// del ingeniero (SelectorPerfil): fondo navy inmersivo, saludo por hora + nombre
// del CAPATAZ, fecha + semana del proyecto + proyecto, y luego sus 2 ÁREAS
// (Tareo / Metrado) como tarjetas premium "Entrar →".
//
// No se pregunta "qué capataz eres": al entrar con su cuenta su cuadrilla ya
// viene autoseleccionada. (Solo si por datos hubiera varias cuadrillas sin poder
// resolver cuál es la suya, aparece un mini-selector de respaldo.)
import React from 'react';
import { BASE, LOGO, LOGO_FALLBACK } from '../../../utils/styles';
import { HERO_VIDEO } from '../../../utils/heroVideo';
import { conexionLenta } from '../../../utils/connection';
import SelectorCapataz from './SelectorCapataz';

// "ARAYA QUISPE CONDORI MARCELINO" → "Araya Quispe Condori Marcelino"
const titulteCase = (s) => String(s || '').trim().toLowerCase()
  .split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');

function AreaCard({ icon, paso, titulo, descripcion, tags, color, bloqueada, motivo, onClick, isMobile }) {
  const sombra = `inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 46px -24px rgba(7,16,30,0.75), 0 5px 14px -10px rgba(7,16,30,0.45)`;
  return (
    <button
      type="button"
      onClick={bloqueada ? undefined : onClick}
      disabled={bloqueada}
      style={{
        cursor: bloqueada ? 'not-allowed' : 'pointer',
        position: 'relative', overflow: 'hidden', textAlign: 'left',
        background: bloqueada ? 'linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%)',
        border: `1px solid ${bloqueada ? 'rgba(15,42,71,0.10)' : color + '55'}`,
        borderRadius: '18px', padding: isMobile ? '12px 14px 11px' : '18px 18px 15px',
        display: 'flex', flexDirection: 'column', gap: isMobile ? '7px' : '10px',
        opacity: bloqueada ? 0.72 : 1,
        boxShadow: bloqueada ? 'none' : sombra,
        transition: 'transform 0.24s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.24s, border-color 0.24s',
        minHeight: isMobile ? 'auto' : '210px',
      }}
      onMouseEnter={e => { if (!bloqueada) { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.9), 0 30px 60px -20px ${color}5C, 0 0 0 1.5px ${color}`; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = bloqueada ? 'none' : sombra; }}
    >
      {/* barra de acento superior */}
      {!bloqueada && (
        <span style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 12px ${color}99`,
        }} />
      )}
      {bloqueada && (
        <span style={{
          position: 'absolute', top: '14px', right: '14px',
          background: '#eef2f7', color: BASE.muted,
          fontSize: '9px', fontWeight: 900, letterSpacing: '0.6px',
          padding: '4px 10px', borderRadius: '999px', border: `1px solid ${BASE.border}`,
        }}>🔒 BLOQUEADO</span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
        <span style={{
          width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
          background: bloqueada ? '#eef2f7' : `linear-gradient(145deg, ${color}22, ${color}0A)`,
          border: `1px solid ${bloqueada ? BASE.border : color + '33'}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          boxShadow: bloqueada ? 'none' : `inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 10px -4px ${color}55`,
        }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '9.5px', fontWeight: 900, letterSpacing: '1.2px', color: bloqueada ? BASE.muted : color }}>{paso}</p>
          <p style={{ fontSize: isMobile ? '17px' : '18px', fontWeight: 900, color: BASE.navy, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{titulo}</p>
        </div>
      </div>

      <p style={{
        fontSize: isMobile ? '11px' : '11.5px', color: BASE.muted, lineHeight: 1.45, margin: 0, flex: 1,
        minHeight: isMobile ? '31px' : 0,
        ...(isMobile ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
      }}>
        {bloqueada ? motivo : descripcion}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {tags.map(t => (
          <span key={t} style={{
            background: BASE.bg, color: BASE.muted, border: `1px solid ${BASE.border}`,
            padding: '3px 9px', borderRadius: '999px', fontSize: '9.5px', fontWeight: 700,
          }}>{t}</span>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${BASE.borderSoft || BASE.border}`, paddingTop: '9px', marginTop: '1px',
      }}>
        <span style={{ fontSize: '10.5px', fontWeight: 900, color: bloqueada ? BASE.muted : color, letterSpacing: '1px', textTransform: 'uppercase' }}>
          {bloqueada ? 'Completa el tareo' : 'Entrar'}
        </span>
        <span style={{
          width: '28px', height: '28px', borderRadius: '999px',
          background: bloqueada ? '#e2e8f0' : `linear-gradient(145deg, ${color}, ${color}cc)`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: bloqueada ? BASE.muted : '#fff', fontSize: '14px', fontWeight: 900,
          boxShadow: bloqueada ? 'none' : `0 4px 10px -3px ${color}88`,
        }}>{bloqueada ? '🔒' : '→'}</span>
      </div>
    </button>
  );
}

export default function InicioCapataz({
  fecha, capataz, proyectoNombre, clienteNombre,
  cuadrillasParaSelect, miembrosCuadrilla, setCapataz, rol, cargandoCuadrilla, obtenerSemana, isMobile,
  actividadesCount, actividadesConHHCount, totalHH, tieneTareo,
  onAbrirTareo, onAbrirMetrado,
}) {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fechaLargaRaw = (() => {
    try {
      const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();
  const fechaLarga = fechaLargaRaw ? fechaLargaRaw.charAt(0).toUpperCase() + fechaLargaRaw.slice(1) : '';

  const opcionesCapataz = Object.entries(cuadrillasParaSelect || {}).map(([nombre, miembros]) => ({
    nombre, miembros: Array.isArray(miembros) ? miembros.length : null,
  }));
  // Mientras un CAPATAZ real resuelve su cuadrilla (carga + auto-selección de 1 opción)
  // mostramos un loader, NO el selector ni las tarjetas bloqueadas → sin parpadeo al cargar.
  const resolviendo = !capataz && rol === 'capataz' && (cargandoCuadrilla || opcionesCapataz.length === 1);
  // Se pide elegir cuadrilla cuando NO se resuelve sola y existen opciones (admin/ingeniero,
  // o capataz con varias cuadrillas sin coincidencia de nombre).
  const necesitaElegir = !capataz && !resolviendo && opcionesCapataz.length > 0;

  return (
    <div style={{
      // Pantalla de entrada FULL-VIEWPORT (mismo lenguaje que el selector de áreas).
      // fixed inset:0 cubre TODO el ancho/alto sin dejar franjas blancas (el padding
      // del <main> y el sidebar ya no afectan). El navbar (z-index 102) queda encima.
      position: 'fixed', inset: 0, zIndex: 30,
      overflowY: 'auto',
      background: '#0a1628',
      paddingTop: 'calc(60px + env(safe-area-inset-top) + 12px)',
      paddingBottom: 'calc(34px + env(safe-area-inset-bottom))',
      paddingLeft: '16px', paddingRight: '16px',
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      fontFamily: BASE.font,
    }}>
      {/* Mismo fondo que el selector de áreas: video de la obra + lavado navy cohesivo. */}
      {!conexionLenta() && (
        <video autoPlay loop muted playsInline preload="auto" aria-hidden="true"
          poster="/brand/grapco-bg-poster.jpg"
          onCanPlay={(e) => { e.currentTarget.style.opacity = '0.82'; e.currentTarget.play?.().catch(() => {}); }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.82, filter: 'saturate(1) brightness(0.9) contrast(1.06)', transition: 'opacity 0.4s ease', zIndex: 0, pointerEvents: 'none' }}>
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      )}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background:
          'radial-gradient(55% 38% at 50% 2%, rgba(40,74,118,0.55) 0%, transparent 62%),'
          + 'linear-gradient(180deg, rgba(8,20,38,0.90) 0%, rgba(12,30,55,0.55) 46%, rgba(7,16,30,0.92) 100%),'
          + 'radial-gradient(130% 110% at 50% 42%, transparent 52%, rgba(4,11,22,0.78) 100%)',
      }} />

      {/* Loader mientras se resuelve la cuadrilla del capataz → evita el parpadeo
          del selector / tarjetas bloqueadas al cargar. */}
      {resolviendo && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px',
          background: 'linear-gradient(180deg, rgba(8,20,38,0.94), rgba(7,16,30,0.97))',
        }}>
          <div style={{
            width: '72px', height: '72px', background: 'linear-gradient(150deg,#fff,#eef3f9)',
            borderRadius: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '2px', overflow: 'hidden', boxShadow: `0 13px 30px -16px rgba(0,0,0,0.6), 0 0 0 1.5px ${BASE.gold}40`,
          }}>
            <img src={LOGO} alt="GRAPCO"
              onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px', transform: 'scale(1.25)' }} />
          </div>
          <div style={{ width: '26px', height: '26px', border: '3px solid rgba(255,255,255,0.18)', borderTopColor: BASE.gold, borderRadius: '50%', animation: 'cap-spin 0.8s linear infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 700, fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Preparando tu cuadrilla…</span>
          <style>{`@keyframes cap-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="anim-fade-in" style={{ position: 'relative', zIndex: 2, maxWidth: '760px', margin: 'auto', width: '100%' }}>

        {/* Marca GRAPCO (logo + título) — mismo header que el selector de áreas */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '12px' : '20px' }}>
          <div style={{
            width: isMobile ? '52px' : '72px', height: isMobile ? '52px' : '72px',
            background: 'linear-gradient(150deg, #ffffff 0%, #eef3f9 100%)',
            borderRadius: isMobile ? '14px' : '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: isMobile ? '8px' : '10px', padding: '2px', overflow: 'hidden',
            boxShadow: `0 13px 30px -16px rgba(0,0,0,0.6), 0 0 0 1.5px ${BASE.gold}40`,
          }}>
            <img src={LOGO} alt="GRAPCO"
              onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px', transform: 'scale(1.25)' }} />
          </div>
          <h1 style={{ color: '#fff', fontSize: isMobile ? '19px' : '25px', fontWeight: 900, margin: '0 0 6px', letterSpacing: '0.5px' }}>
            GRAPCO <span style={{ color: BASE.gold }}>S.A.C.</span>
          </h1>
          {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ height: '1px', width: '30px', background: `linear-gradient(90deg, transparent, ${BASE.gold}aa)` }} />
            <span style={{ color: BASE.gold, fontSize: '9.5px', fontWeight: 800, letterSpacing: '2.6px', textTransform: 'uppercase' }}>Gestión de Proyectos VDC</span>
            <span style={{ height: '1px', width: '30px', background: `linear-gradient(90deg, ${BASE.gold}aa, transparent)` }} />
          </div>
          )}
        </div>

        {/* Saludo */}
        <p style={{
          margin: 0, color: '#fff', fontSize: isMobile ? '18px' : '25px', fontWeight: 900,
          letterSpacing: '0.4px', lineHeight: 1.18,
        }}>
          {saludo}{capataz ? <>, <span style={{ color: BASE.gold }}>{titulteCase(capataz)}</span></> : ''}
        </p>

        {/* Fecha + Semana + Proyecto */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '9px' }}>
          {fechaLarga && (
            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.66)', fontWeight: 600 }}>{fechaLarga}</span>
          )}
          <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>·</span>
          <span style={{
            border: `1px solid ${BASE.gold}66`, color: BASE.gold, borderRadius: '999px',
            padding: '3px 12px', fontSize: '11.5px', fontWeight: 800,
          }}>Semana {obtenerSemana(fecha)} del proyecto</span>
        </div>
        {(proyectoNombre || clienteNombre) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '14px' }}>🏗️</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
              {proyectoNombre || '—'}{clienteNombre ? <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}> · {clienteNombre}</span> : null}
            </span>
          </div>
        )}
        {capataz && miembrosCuadrilla?.length > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
            👥 Tu cuadrilla: {miembrosCuadrilla.length} {miembrosCuadrilla.length === 1 ? 'persona' : 'personas'}
          </p>
        )}

        {/* Mini-selector SOLO si no se pudo resolver su cuadrilla */}
        {necesitaElegir && (
          <div style={{
            marginTop: '16px', padding: '12px',
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${BASE.gold}44`,
            borderRadius: '14px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.6px', marginBottom: '8px' }}>
              Confirma tu cuadrilla
            </p>
            <SelectorCapataz value={capataz} opciones={opcionesCapataz} onChange={setCapataz} />
          </div>
        )}

        {/* Pregunta */}
        <p style={{
          margin: isMobile ? '10px 0 8px' : '22px 0 14px', color: 'rgba(255,255,255,0.6)',
          fontSize: '12px', fontWeight: 700, letterSpacing: '0.6px',
        }}>
          ¿En qué vas a trabajar hoy? Elige un área 👇
        </p>

        {/* Áreas */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '14px' }}>
          <AreaCard
            icon="👷" paso="ÁREA 1 · TAREO" titulo="Tareo"
            descripcion="Escoge las actividades del día y coloca a tu gente con sus horas (HN/HE). Puedes importar las horas del marcador facial."
            tags={['Actividades', 'Horas', 'Marcador facial']}
            color={BASE.navy} isMobile={isMobile}
            bloqueada={!capataz}
            motivo="Confirma tu cuadrilla arriba para empezar."
            onClick={onAbrirTareo}
          />
          <AreaCard
            icon="📏" paso="ÁREA 2 · METRADO" titulo="Metrado y observaciones"
            descripcion="En las actividades de tu tareo, registra el metrado avanzado, observaciones y fotos. Luego se sube a la oficina técnica."
            tags={['Metrado', 'Observaciones', 'Fotos']}
            color={BASE.gold} isMobile={isMobile}
            bloqueada={!tieneTareo}
            motivo="Primero coloca al menos una actividad con horas en el TAREO. El metrado se llena sobre esas mismas actividades."
            onClick={onAbrirMetrado}
          />
        </div>

        {/* Mini-resumen del día */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: isMobile ? '10px' : '18px' }}>
          {[
            { l: 'ACTIVIDADES', v: actividadesCount },
            { l: 'CON HORAS', v: actividadesConHHCount },
            { l: 'HH TOTAL', v: totalHH.toFixed(1) },
          ].map(s => (
            <div key={s.l} style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.4px' }}>{s.l}</span>
              <span style={{ fontSize: '13px', fontWeight: 900, color: BASE.gold, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
