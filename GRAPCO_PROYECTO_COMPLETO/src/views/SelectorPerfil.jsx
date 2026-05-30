// src/views/SelectorPerfil.jsx
// Pantalla de entrada en modo bypass: el usuario elige con qué perfil entrar.
// Paleta GRAPCO: navy + gold del isotipo, con tarjetas claras y acento por rol.

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { BASE, LOGO, LOGO_FALLBACK } from '../utils/styles';
import Icon from '../components/Icon';
// Lazy: face-api.js (~1 MB+) NO se carga en el arranque, solo al abrir el kiosko.
const MarcadorAsistencia = lazy(() => import('./asistencia/MarcadorAsistencia'));

const lblKiosk = { display: 'block', color: '#94a3b8', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', marginBottom: '6px' };
const selKiosk = { width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
// Las opciones del desplegable nativo se pintan sobre fondo blanco del SO:
// forzamos texto oscuro para que se lean (bug texto blanco sobre blanco).
const optKiosk = { color: '#0F2A47', background: '#ffffff', fontWeight: 700 };

// PINs de obra → entran directo al rol asignado (modo kiosk).
// Personalízalos con los códigos de tu obra. Por seguridad real esto debería
// venir de Firestore (`Configuracion/pins`), pero para campo es suficiente.
const PINS_OBRA = {
  '1234': 'capataz',
  '2025': 'seguridad',
  '5050': 'calidad',
  '7777': 'ingeniero',
  '9999': 'admin',
};

const PERFILES = [
  {
    rol: 'ingeniero',
    titulo: 'Ingeniería de Producción',
    iconName: 'dashboard',
    color: '#047857',
    descripcion: 'Producción (Auditoría + CPI/EAC + Control Gerencial), registro de producción, Carta Balance, Sala de Operaciones, materiales y coordinación BIM.',
    accesos: ['Producción', 'Registro', 'Carta Balance', 'Sala de Operaciones', 'Materiales'],
  },
  {
    rol: 'oficina_tecnica',
    titulo: 'Oficina Técnica',
    iconName: 'fileText',
    color: '#1D4ED8',
    descripcion: 'Resultado Operativo, valorizaciones, adicionales y deductivos, sustento fotográfico, partidas y BIM.',
    accesos: ['RO', 'Valorizaciones', 'Sustento', 'Partidas', 'BIM'],
  },
  {
    rol: 'planeamiento',
    titulo: 'Planeamiento y Programación',
    iconName: 'tree',
    color: '#0E7490',
    descripcion: 'Plan Maestro (WBS), Análisis de Precios Unitarios, Last Planner / Pull Planning, hitos y cronograma.',
    accesos: ['Plan Maestro', 'APU', 'Pull Planning', 'Hitos'],
  },
  {
    rol: 'calidad',
    titulo: 'Aseguramiento de Calidad',
    iconName: 'shield',
    color: '#7E22CE',
    descripcion: 'Protocolos, PETs, No Conformidades, ensayos, evidencia fotográfica y modelo BIM para liberación.',
    accesos: ['Protocolos', 'PETs', 'No Conformidades', 'Ensayos', 'BIM'],
  },
  {
    rol: 'seguridad',
    titulo: 'Seguridad, Salud y Medio Ambiente',
    iconName: 'alert',
    color: '#BE123C',
    descripcion: 'Reporte de incidencias con fotos, inspección diaria con checklist y apertura automática de No Conformidades.',
    accesos: ['Reportar', 'Inspección', 'Historial'],
  },
  {
    rol: 'almacenero',
    titulo: 'Almacén y Logística',
    iconName: 'package',
    color: '#B45309',
    descripcion: 'Kardex de materiales, ingresos y salidas, stock por almacén, requerimientos del campo y valorizado S10.',
    accesos: ['Kardex', 'Stock', 'Requerimientos', 'Materiales'],
  },
  {
    rol: 'admin',
    titulo: 'Administración del Sistema',
    iconName: 'shieldAdmin',
    color: BASE.navy,
    descripcion: 'Acceso completo a todos los módulos GRAPCO, gestión de usuarios, configuración global y auditoría.',
    accesos: ['Todos los módulos', 'Usuarios', 'Auditoría'],
    destacado: true,
  },
];

// Mapeo de rolPermitido (almacenado en /Usuarios) → cards visibles en el selector.
// admin / ingeniero ven TODAS las áreas (perfiles senior multi-área).
// Roles específicos solo ven su propia área (más una de soporte cuando aplica).
const TODAS = ['ingeniero','oficina_tecnica','planeamiento','calidad','seguridad','almacenero','admin'];
const ROL_CARDS_PERMITIDAS = {
  admin:              TODAS,
  ingeniero:          TODAS,
  oficina_tecnica:    ['oficina_tecnica','planeamiento','calidad'],
  planeamiento:       ['planeamiento','oficina_tecnica'],
  calidad:            ['calidad','seguridad'],
  seguridad:          ['seguridad','calidad'],
  almacenero:         ['almacenero'],
  logistica:          ['almacenero'],
  capataz:            ['capataz'],
  carta_balance:      ['carta_balance'],
  supervisor_cliente: ['supervisor_cliente'],
  subcontratista:     ['subcontratista'],
};

export default function SelectorPerfil() {
  const { entrarComoRol, logout, rolPermitido } = useAuth();
  const { proyectos, frentesDelProyecto, proyectoActivoId, setProyectoActivoId, frenteActivoId, setFrenteActivoId } = useProyectoActivo();
  const [modoMarcador, setModoMarcador] = useState(false);
  const [modoPin, setModoPin] = useState(false);
  const [pin, setPin] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const videoRef = useRef(null);

  // Cards visibles según el rol almacenado del usuario
  // Sin escalada: si el rol no está mapeado, solo ve su propia área (no TODAS).
  const permitidos = ROL_CARDS_PERMITIDAS[rolPermitido] || (rolPermitido ? [rolPermitido] : []);
  const perfilesFiltrados = PERFILES.filter(p => permitidos.includes(p.rol));

  // Atajo: si el usuario teclea 4 dígitos, intenta entrar por PIN.
  useEffect(() => {
    if (pin.length === 4) {
      const rolPin = PINS_OBRA[pin];
      if (rolPin) {
        entrarComoRol(rolPin);
      } else {
        setErrorPin('PIN inválido');
        setTimeout(() => { setPin(''); setErrorPin(''); }, 1500);
      }
    } else {
      setErrorPin('');
    }
  }, [pin, entrarComoRol]);

  // Al abrir el kiosko, si no hay proyecto activo y solo hay uno, lo elige solo.
  useEffect(() => {
    if (modoMarcador && !proyectoActivoId && Array.isArray(proyectos) && proyectos.length >= 1) {
      setProyectoActivoId(proyectos[0].id);
    }
  }, [modoMarcador, proyectoActivoId, proyectos, setProyectoActivoId]);

  // ── KIOSKO DE REGISTRO DE PERSONAL (reconocimiento facial) ──
  // Pantalla completa, sin necesidad de entrar como rol. El obrero solo marca.
  if (modoMarcador) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0a1628',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '18px 14px 32px', fontFamily: BASE.font,
      }}>
        {/* Cabecera kiosko */}
        <div style={{
          width: '100%', maxWidth: '760px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
            }}>
              <img src={LOGO} alt="GRAPCO"
                onError={(e) => { if (!e.target.dataset.fb) { e.target.dataset.fb = '1'; e.target.src = LOGO_FALLBACK; } }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: '17px', fontWeight: 900, letterSpacing: '0.4px' }}>
                Registro de Personal
              </p>
              <p style={{ color: BASE.gold, fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>
                RECONOCIMIENTO FACIAL · GRAPCO
              </p>
            </div>
          </div>
          <button onClick={() => setModoMarcador(false)} style={{
            background: 'rgba(255,255,255,0.08)', border: `1px solid ${BASE.gold}66`,
            color: BASE.gold, padding: '9px 18px', borderRadius: '999px',
            fontSize: '12px', fontWeight: 900, letterSpacing: '0.5px', cursor: 'pointer',
          }}>◄ Volver al selector</button>
        </div>

        {/* Selector de Proyecto / Frente */}
        <div style={{
          width: '100%', maxWidth: '760px',
          background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: '14px', padding: '14px 16px', marginBottom: '14px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px',
        }}>
          <div>
            <label style={lblKiosk}>🏗️ PROYECTO</label>
            <select value={proyectoActivoId || ''} onChange={e => setProyectoActivoId(e.target.value)} style={selKiosk}>
              <option value="" style={optKiosk}>— Selecciona proyecto —</option>
              {(proyectos || []).map(p => <option key={p.id} value={p.id} style={optKiosk}>{p.nombre || p.codigo || p.id}</option>)}
            </select>
          </div>
          <div>
            <label style={lblKiosk}>📍 FRENTE</label>
            <select value={frenteActivoId || ''} onChange={e => setFrenteActivoId(e.target.value)} style={selKiosk}>
              <option value="" style={optKiosk}>— Todos / sin frente —</option>
              {(frentesDelProyecto || []).map(f => <option key={f.id} value={f.id} style={optKiosk}>{f.codigo ? `${f.codigo} · ` : ''}{f.nombre || f.id}</option>)}
            </select>
          </div>
        </div>

        {/* Marcador facial */}
        <div style={{
          width: '100%', maxWidth: '760px',
          background: BASE.white, borderRadius: '16px', padding: '14px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}>
          {!proyectoActivoId ? (
            <p style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontWeight: 700 }}>
              👆 Selecciona un proyecto para iniciar el registro facial.
            </p>
          ) : (
            <Suspense fallback={<p style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontWeight: 700 }}>⏳ Cargando reconocimiento facial…</p>}>
              <MarcadorAsistencia showToast={(m) => console.log('[kiosko]', m)} />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '18px 20px 22px',
      background: '#0a1628',
      fontFamily: BASE.font,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* === VIDEO DE FONDO === */}
      {/* Video hero CREDITEX PTARI a pantalla completa (como en el Login).
          Si el archivo no existe en /public, queda el mesh animado debajo. */}
      <video
        ref={videoRef}
        autoPlay loop muted playsInline preload="auto"
        poster="/hero.png"
        onError={() => { if (videoRef.current) videoRef.current.style.display = 'none'; }}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.72,
          // Desaturar + enfriar para eliminar el tinte verde-amarillo del agua y
          // que todo se unifique bajo el navy de la marca (sigue visible como textura).
          filter: 'saturate(0.45) brightness(0.8) contrast(1.05)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <source src="/creditex-ptari.mp4" type="video/mp4" />
      </video>
      {/* Lavado NAVY cohesivo (sin dorado) — unifica el fondo con la marca y hace
          resaltar las tarjetas. Sustituye al overlay que mezclaba dorado+verde. */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(8,20,38,0.88) 0%, rgba(12,30,55,0.58) 45%, rgba(8,18,34,0.90) 100%),'
          + 'radial-gradient(130% 95% at 50% 6%, rgba(30,58,95,0.40) 0%, transparent 58%)',
      }} />

      {/* Botón SALIR (cierre de sesión total → vuelve al Login) */}
      <button
        onClick={() => logout?.()}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          background: 'rgba(220,38,38,0.18)',
          border: '1px solid rgba(220,38,38,0.55)',
          color: '#fecaca',
          padding: '8px 18px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '900',
          letterSpacing: '0.8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.30)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.18)'; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        CERRAR SESIÓN
      </button>

      {/* === FONDO — solo capas neutras (sin blobs de colores que rompían la armonía) === */}
      {/* Mesh muy atenuado para dar profundidad navy sin introducir color. Los blobs
          ámbar/azul/rosa/verde se retiraron a propósito: chocaban con el video. */}
      <div className="grapco-mesh" style={{ opacity: 0.2, mixBlendMode: 'multiply' }} />
      <div className="grapco-grid-bg" style={{ opacity: 0.5 }} />
      <div className="grapco-floating-icons" aria-hidden="true" style={{ opacity: 0.22 }}>
        <span className="grapco-fi grapco-fi-1">🏗️</span>
        <span className="grapco-fi grapco-fi-2">⚙️</span>
        <span className="grapco-fi grapco-fi-3">🔩</span>
        <span className="grapco-fi grapco-fi-4">🦺</span>
        <span className="grapco-fi grapco-fi-5">📐</span>
        <span className="grapco-fi grapco-fi-6">🏢</span>
        <span className="grapco-fi grapco-fi-7">🔧</span>
      </div>
      <div className="grapco-particles" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="grapco-particle" style={{
            left: `${(i * 5.55 + 7) % 100}%`,
            animationDelay: `${(i * 0.7) % 12}s`,
            animationDuration: `${12 + (i % 6) * 2}s`,
          }} />
        ))}
      </div>
      <div className="grapco-scan" />

      {/* Header — compacto para que todo entre sin scroll */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '56px', height: '56px',
          background: '#fff',
          borderRadius: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
          boxShadow: `0 8px 22px rgba(0,0,0,0.4), 0 0 0 2px ${BASE.gold}33`,
        }}>
          <img
            src={LOGO}
            alt="GRAPCO"
            onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
            style={{ width: '44px', height: '44px', objectFit: 'contain' }}
          />
        </div>
        <h1 style={{
          color: '#fff', fontSize: '22px', fontWeight: '900',
          margin: '0 0 3px', letterSpacing: '1px',
        }}>
          GRAPCO <span style={{ color: BASE.gold }}>S.A.C.</span>
        </h1>
        <p style={{
          color: '#94a3b8', fontSize: '12px',
          margin: '4px auto 0', maxWidth: '520px', lineHeight: 1.4,
        }}>
          {modoPin
            ? 'Ingresa el PIN de obra (4 dígitos). Modo kiosk para personal de campo.'
            : 'Selecciona el perfil con el que quieres entrar. Cada perfil aterriza en sus módulos.'}
        </p>
        <button onClick={() => { setModoPin(!modoPin); setPin(''); setErrorPin(''); }} style={{
          marginTop: '10px',
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${BASE.gold}88`,
          color: BASE.gold,
          padding: '6px 15px', borderRadius: '999px',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.6px',
          cursor: 'pointer',
        }}>
          {modoPin ? '◄ Volver al selector' : 'Acceso por PIN de obra'}
        </button>
      </div>

      {/* Modo PIN: teclado numérico */}
      {modoPin && (
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${BASE.gold}44`,
          borderRadius: '20px',
          padding: '24px',
          width: '100%', maxWidth: '320px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '18px',
          }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: '52px', height: '64px',
                borderRadius: '12px',
                border: `2px solid ${pin.length > i ? BASE.gold : 'rgba(255,255,255,0.18)'}`,
                background: pin.length > i ? `${BASE.gold}33` : 'transparent',
                color: '#fff', fontSize: '28px', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {pin[i] ? '●' : ''}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              d === '' ? <div key={i} /> : (
                <button key={i} onClick={() => {
                  if (d === '⌫') setPin(pin.slice(0, -1));
                  else if (pin.length < 4) setPin(pin + d);
                }} style={{
                  height: '54px',
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid rgba(255,255,255,0.15)`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '20px', fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
                  {d}
                </button>
              )
            ))}
          </div>
          {errorPin && (
            <p style={{ color: '#fecaca', fontSize: '12px', fontWeight: 800, marginTop: '12px' }}>
              ❌ {errorPin}
            </p>
          )}
        </div>
      )}

      {/* Acceso directo: REGISTRO DE PERSONAL (facial) — kiosko sin login de rol */}
      {!modoPin && (
        <button
          onClick={() => setModoMarcador(true)}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: '1100px',
            display: 'flex', alignItems: 'center', gap: '14px',
            background: 'linear-gradient(135deg, rgba(229,168,47,0.14), rgba(30,58,95,0.30))',
            border: `1.5px solid ${BASE.gold}66`,
            borderRadius: '14px', padding: '11px 18px', marginBottom: '14px',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = BASE.gold; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${BASE.gold}66`; }}
        >
          <span style={{
            width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
            background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 18px ${BASE.gold}55`, fontSize: '20px',
          }}>📷</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 900, letterSpacing: '0.3px' }}>
              Registro de Personal · Reconocimiento Facial
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '11.5px', marginTop: '2px' }}>
              Marca tu entrada/salida con la cara. Modo kiosko — no necesitas elegir perfil.
            </p>
          </div>
          <span style={{
            color: BASE.gold, fontSize: '12px', fontWeight: 900,
            letterSpacing: '0.6px', whiteSpace: 'nowrap',
          }}>ABRIR ►</span>
        </button>
      )}

      {/* Grid de perfiles (solo cuando NO está en modo PIN) */}
      {!modoPin && (
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(248px, 1fr))',
        gap: '12px',
        width: '100%',
        maxWidth: '1180px',
      }}>
        {perfilesFiltrados.map((p) => {
          const acento = p.destacado ? BASE.gold : p.color;
          const sombraBase = p.destacado
            ? '0 18px 44px -18px rgba(229,168,47,0.50), 0 6px 16px -10px rgba(8,26,46,0.45)'
            : '0 16px 40px -20px rgba(8,26,46,0.70), 0 4px 12px -8px rgba(8,26,46,0.35)';
          return (
          <button
            key={p.rol}
            onClick={() => entrarComoRol(p.rol)}
            style={{
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.98)',
              border: `1px solid ${p.destacado ? BASE.gold + '99' : 'rgba(255,255,255,0.7)'}`,
              borderRadius: '16px',
              padding: '16px 16px 13px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              transition: 'transform 0.22s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.22s ease, border-color 0.22s ease',
              boxShadow: sombraBase,
              minHeight: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = `0 26px 54px -18px ${acento}66, 0 0 0 1.5px ${acento}`;
              e.currentTarget.style.borderColor = acento;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = sombraBase;
              e.currentTarget.style.borderColor = p.destacado ? BASE.gold + '99' : 'rgba(255,255,255,0.7)';
            }}
          >
            {/* Barra de acento superior — identidad del área */}
            <span style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
              background: `linear-gradient(90deg, ${acento}, ${acento}77)`,
            }} />

            {p.destacado && (
              <span style={{
                position: 'absolute', top: '14px', right: '14px',
                background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff',
                padding: '4px 11px', borderRadius: '999px',
                fontSize: '9px', fontWeight: 900, letterSpacing: '0.8px',
                boxShadow: `0 3px 10px ${BASE.gold}55`,
              }}>★ ACCESO TOTAL</span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <span style={{
                width: '42px', height: '42px',
                borderRadius: '12px',
                background: `${p.color}12`,
                border: `1px solid ${p.color}2A`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={p.iconName} size={21} color={p.color} strokeWidth={2} />
              </span>
              <span style={{
                fontSize: '15.5px', fontWeight: '800',
                color: BASE.navy, lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}>
                {p.titulo}
              </span>
            </div>

            <p style={{
              fontSize: '11.5px', color: BASE.muted,
              lineHeight: 1.55, margin: 0, flex: 1,
            }}>
              {p.descripcion}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {p.accesos.map(a => (
                <span key={a} style={{
                  background: BASE.bg,
                  color: BASE.muted,
                  border: `1px solid ${BASE.border}`,
                  padding: '3px 9px', borderRadius: '999px',
                  fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.2px',
                }}>{a}</span>
              ))}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${BASE.borderSoft}`,
              paddingTop: '12px', marginTop: '2px',
            }}>
              <span style={{
                fontSize: '11px', fontWeight: 900, color: acento,
                letterSpacing: '0.8px', textTransform: 'uppercase',
              }}>
                Entrar
              </span>
              <span style={{
                width: '26px', height: '26px', borderRadius: '999px',
                background: `${acento}14`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: acento, fontSize: '14px', fontWeight: 900,
              }}>→</span>
            </div>
          </button>
          );
        })}
      </div>
      )}

      <p style={{
        position: 'relative', zIndex: 1,
        marginTop: '16px', color: '#94a3b8',
        fontSize: '11px', textAlign: 'center', letterSpacing: '0.4px',
      }}>
        GRAPCO SAC © {new Date().getFullYear()} · Plataforma integral de gestion de obra
      </p>
    </div>
  );
}
