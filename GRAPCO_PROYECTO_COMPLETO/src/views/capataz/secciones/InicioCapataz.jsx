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
import SelectorCapataz from './SelectorCapataz';

// "ARAYA QUISPE CONDORI MARCELINO" → "Araya Quispe Condori Marcelino"
const titulteCase = (s) => String(s || '').trim().toLowerCase()
  .split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');

// Tarjeta de ÁREA — versión COMPACTA y centrada (rediseño jun-2026).
// Muestra SOLO: etiqueta de área (ÁREA 1/2) · ícono · título (TAREO/METRADO).
// Sin descripción, sin chips, sin botón "Entrar": el cuadro entero es el botón.
// A media anchura (2 columnas también en móvil) y con buen alto → contenido
// distribuido verticalmente pero centrado. El estado BLOQUEADO conserva su
// función (el metrado exige tareo previo): atenúa, marca el candado y deja un
// hint de una línea para que el capataz sepa por qué no puede entrar todavía.
function AreaCard({ icon, area, titulo, color, bloqueada, motivo, onClick, isMobile }) {
  const sombra = `inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 46px -24px rgba(7,16,30,0.75), 0 5px 14px -10px rgba(7,16,30,0.45)`;
  return (
    <button
      type="button"
      onClick={bloqueada ? undefined : onClick}
      disabled={bloqueada}
      style={{
        cursor: bloqueada ? 'not-allowed' : 'pointer',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
        background: bloqueada ? 'linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%)',
        border: `1px solid ${bloqueada ? 'rgba(15,42,71,0.10)' : color + '55'}`,
        borderRadius: '18px', padding: isMobile ? '20px 10px' : '26px 18px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: isMobile ? '11px' : '14px',
        opacity: bloqueada ? 0.72 : 1,
        boxShadow: bloqueada ? 'none' : sombra,
        transition: 'transform 0.24s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.24s, border-color 0.24s',
        minHeight: isMobile ? '172px' : '210px',
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

      {/* Etiqueta de área (la "parte superior que dice ÁREA 1 / ÁREA 2") */}
      <span style={{
        fontSize: isMobile ? '9.5px' : '10px', fontWeight: 900, letterSpacing: '1.6px',
        color: bloqueada ? BASE.muted : color,
      }}>{area}</span>

      {/* Ícono (la "figura") */}
      <span style={{
        position: 'relative',
        width: isMobile ? '62px' : '72px', height: isMobile ? '62px' : '72px', borderRadius: '18px',
        background: bloqueada ? '#eef2f7' : `linear-gradient(145deg, ${color}22, ${color}0A)`,
        border: `1px solid ${bloqueada ? BASE.border : color + '33'}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isMobile ? '32px' : '38px',
        boxShadow: bloqueada ? 'none' : `inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 14px -5px ${color}55`,
      }}>
        {icon}
        {bloqueada && (
          <span style={{
            position: 'absolute', bottom: '-5px', right: '-5px',
            width: '24px', height: '24px', borderRadius: '999px',
            background: '#fff', border: `1px solid ${BASE.border}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
            boxShadow: '0 2px 6px rgba(7,16,30,0.18)',
          }}>🔒</span>
        )}
      </span>

      {/* Título (TAREO / METRADO) */}
      <span style={{
        fontSize: isMobile ? '18px' : '21px', fontWeight: 900, color: BASE.navy,
        letterSpacing: '0.4px', lineHeight: 1.1,
      }}>{titulo}</span>

      {/* Hint de una línea SOLO si está bloqueada (mantiene la lógica metrado←tareo) */}
      {bloqueada && motivo && (
        <span style={{
          fontSize: '9.5px', fontWeight: 600, color: BASE.muted, lineHeight: 1.35,
          maxWidth: '94%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{motivo}</span>
      )}
    </button>
  );
}

export default function InicioCapataz({
  fecha, capataz, proyectoNombre, clienteNombre,
  cuadrillasParaSelect, miembrosCuadrilla, setCapataz, rol, esCapatazReal, cargandoCuadrilla, obtenerSemana, isMobile,
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
  // Mientras un CAPATAZ real carga sus cuadrillas mostramos un loader (no el
  // selector ni las tarjetas bloqueadas) → sin parpadeo al cargar. Ojo: ya NO
  // se asume que "1 cuadrilla = la suya"; la auto-selección la decide Capataz.jsx
  // por vínculo/nombre. Si no resuelve, cae al selector de abajo.
  const resolviendo = !capataz && esCapatazReal && cargandoCuadrilla;
  // Se pide elegir cuadrilla cuando NO se resolvió sola y hay opciones: admin/
  // ingeniero (que previsualizan el área) o un capataz aún no vinculado que debe
  // CONFIRMAR cuál es la suya.
  const necesitaElegir = !capataz && !resolviendo && opcionesCapataz.length > 0;
  // Capataz real sin ninguna cuadrilla en su proyecto → aviso claro (no inventamos identidad).
  const sinCuadrilla = !capataz && esCapatazReal && !cargandoCuadrilla && opcionesCapataz.length === 0;

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
      {/* Fondo NAVY SÓLIDO con profundidad sutil (solo CSS, sin foto ni video). */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background:
          'radial-gradient(60% 40% at 50% 0%, rgba(40,74,118,0.45) 0%, transparent 60%),'
          + 'radial-gradient(130% 110% at 50% 45%, transparent 50%, rgba(4,11,22,0.6) 100%)',
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

      <div className="anim-fade-in" style={{
        position: 'relative', zIndex: 2, maxWidth: '760px', width: '100%',
        marginLeft: 'auto', marginRight: 'auto',
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>

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
          letterSpacing: '0.4px', lineHeight: 1.18, textAlign: 'center',
        }}>
          {/* El nombre del capataz solo personaliza el saludo cuando es un capataz
              REAL. Un admin/ingeniero que previsualiza el área no "es" ese capataz:
              ve la cuadrilla que escogió como contexto, sin suplantar la identidad. */}
          {saludo}{capataz && esCapatazReal ? <>, <span style={{ color: BASE.gold }}>{titulteCase(capataz)}</span></> : ''}
        </p>
        {/* Para admin/ingeniero: deja claro que está VIENDO una cuadrilla, no que la "es". */}
        {capataz && !esCapatazReal && (
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, textAlign: 'center' }}>
            Viendo la cuadrilla de <span style={{ color: BASE.gold }}>{titulteCase(capataz)}</span>
          </p>
        )}

        {/* Fecha + Semana */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '9px' }}>
          {fechaLarga && (
            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.66)', fontWeight: 600 }}>{fechaLarga}</span>
          )}
          <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>·</span>
          <span style={{
            border: `1px solid ${BASE.gold}66`, color: BASE.gold, borderRadius: '999px',
            padding: '3px 12px', fontSize: '11.5px', fontWeight: 800,
          }}>Semana {obtenerSemana(fecha)} del proyecto</span>
        </div>

        {/* Mini-selector SOLO si no se pudo resolver su cuadrilla */}
        {necesitaElegir && (
          <div style={{
            marginTop: '16px', padding: '12px',
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${BASE.gold}44`,
            borderRadius: '14px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.6px', marginBottom: '8px' }}>
              {esCapatazReal ? 'Confirma tu cuadrilla' : 'Elige una cuadrilla para ver'}
            </p>
            <SelectorCapataz value={capataz} opciones={opcionesCapataz} onChange={setCapataz} />
          </div>
        )}

        {/* Capataz real sin cuadrilla en su proyecto: aviso claro, NO se inventa identidad. */}
        {sinCuadrilla && (
          <div style={{
            marginTop: '16px', padding: '14px 16px',
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${BASE.gold}44`,
            borderRadius: '14px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
              Tu cuenta aún no está vinculada a una cuadrilla
            </p>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.66)', margin: 0, lineHeight: 1.5 }}>
              Pídele al administrador que asigne tu cuadrilla en este proyecto para poder registrar el tareo.
            </p>
          </div>
        )}

        {/* Áreas — los 2 módulos son el foco. A MEDIA ANCHURA (2 columnas incluso en
            móvil): tarjetas compactas, lado a lado, con solo ÁREA · ícono · título. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '12px' : '14px', marginTop: isMobile ? '16px' : '22px' }}>
          <AreaCard
            icon="👷" area="ÁREA 1" titulo="TAREO"
            color={BASE.navy} isMobile={isMobile}
            bloqueada={!capataz}
            motivo="Confirma tu cuadrilla arriba para empezar."
            onClick={onAbrirTareo}
          />
          <AreaCard
            icon="📏" area="ÁREA 2" titulo="METRADO"
            color={BASE.gold} isMobile={isMobile}
            bloqueada={!tieneTareo}
            motivo="Primero registra el tareo."
            onClick={onAbrirMetrado}
          />
        </div>

        {/* Mini-resumen del día */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginTop: isMobile ? '14px' : '18px' }}>
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
