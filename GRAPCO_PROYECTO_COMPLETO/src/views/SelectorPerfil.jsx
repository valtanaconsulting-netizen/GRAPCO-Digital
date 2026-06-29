// src/views/SelectorPerfil.jsx
// Pantalla de entrada en modo bypass: el usuario elige con qué perfil entrar.
// Paleta GRAPCO: navy + gold del isotipo, con tarjetas claras y acento por rol.

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { BASE, LOGO, LOGO_FALLBACK } from '../utils/styles';
import { HERO_VIDEO } from '../utils/heroVideo';
import { conexionLenta } from '../utils/connection';
import { obtenerSemana } from '../utils/helpers';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';
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
  // Calidad (PIN 5050) → app independiente CALIDAD_PLATAFORMA (2026-06-24).
  // ingeniero/admin NO entran por PIN: solo por login Firebase con su rol asignado.
};

const PERFILES = [
  {
    rol: 'almacenero',
    titulo: 'Administración',
    iconName: 'package',
    color: '#B45309',
    kicker: 'Almacén · Logística',
    descripcion: 'Control y gestión de recursos, documentación y procesos administrativos que respaldan la operación del proyecto con orden, trazabilidad y eficiencia.',
    // Etiquetas = secciones REALES del Almacén (MaterialesPanel). Cada una entra directo.
    accesos: [
      { l: 'Stock valorizado', go: 'materiales.reporteS10' },
      { l: 'Vales / Salidas',  go: 'materiales.salida' },
      { l: 'Entradas',         go: 'materiales.entrada' },
      { l: 'Kardex',           go: 'materiales.kardex' },
      { l: 'Catálogo',         go: 'materiales.catalogo' },
      { l: 'Importar S10',     go: 'materiales.importar' },
      { l: 'Compras',          go: 'compras' },
    ],
  },
  {
    rol: 'ingeniero',
    titulo: 'Producción',
    iconName: 'barChart3',
    color: '#047857',
    kicker: 'Avance · Productividad',
    descripcion: 'Control integral de avance, productividad y carta balance bajo Lean Construction, orientado a maximizar cumplimiento y desempeño operativo.',
    // Módulos REALES del área (moduloIngeniero). Planeamiento (Cronograma/Last Planner/
    // Pull Planning) → app PLANEAMIENTO_PLATAFORMA; 'Materiales' → Administración (2026-06-24).
    accesos: [
      { l: 'Plan Diario',         go: 'planDiario' },
      { l: 'Auditoría · CPI/ISP', go: 'dashboard' },
      { l: 'Carta Balance',       go: 'carta' },
      { l: 'BIM',                 go: 'bim' },
      { l: 'Registro',            go: 'registro' },
    ],
  },
  {
    rol: 'oficina_tecnica',
    titulo: 'Oficina Técnica',
    iconName: 'coins',
    color: '#1D4ED8',
    kicker: 'Costos · Valorización',
    descripcion: 'Gestión centralizada de RO, valorizaciones, adicionales, deductivos, garantizando control económico, trazabilidad y soporte para la toma de decisiones.',
    // Secciones REALES del área (moduloOT / ot.*). Entran directo vía tabExterna.
    // Orden por flujo (2026-06-25): Presupuesto → Ejecución (Registro/BIM) →
    // Valorización (+ Sustento + Informe) → RO. RDO retirado.
    accesos: [
      { l: 'Presupuesto',          go: 'ot.partidas' },
      { l: 'Registro Fotográfico', go: 'ot.fotografico' },
      { l: 'BIM',                  go: 'ot.bim' },
      { l: 'Valorización',         go: 'ot.valoriz' },
      { l: 'Sustento',             go: 'ot.sustento' },
      { l: 'Informe',              go: 'ot.informe' },
      { l: 'Resultado Operativo',  go: 'ot.ro.costoReal' },
    ],
  },
  // Gestión de Calidad (protocolos, PETs, NCs, ensayos, planos) → app independiente
  // CALIDAD_PLATAFORMA (2026-06-24). SSOMA → plataforma SIGMA (2026-06-15).
  {
    rol: 'admin',
    titulo: 'Administración del Sistema',
    iconName: 'shieldAdmin',
    color: BASE.navy,
    descripcion: 'Configuración y control global de la plataforma, gestión de usuarios, permisos y auditoría de información. Garantiza seguridad, gobernanza y trazabilidad sobre todos los procesos del sistema.',
    // Sub-pestañas REALES de AdminPanel. Entran directo vía tabInicial.
    accesos: [
      { l: 'Resumen',       go: 'resumen' },
      { l: 'Usuarios',      go: 'usuarios' },
      { l: 'Asistencia',    go: 'asistencia' },
      { l: 'Auditoría',     go: 'auditoria' },
      { l: 'Configuración', go: 'config' },
    ],
    destacado: true,
  },
];

// Mapeo de rolPermitido (almacenado en /Usuarios) → cards visibles en el selector.
// admin / ingeniero ven TODAS las áreas (perfiles senior multi-área).
// Roles específicos solo ven su propia área (más una de soporte cuando aplica).
const TODAS = ['ingeniero','oficina_tecnica','almacenero','admin'];
const ROL_CARDS_PERMITIDAS = {
  admin:              TODAS,
  ingeniero:          TODAS,
  oficina_tecnica:    ['oficina_tecnica','ingeniero'],
  // Planeamiento → app PLANEAMIENTO_PLATAFORMA; Calidad / supervisor_cliente →
  // app CALIDAD_PLATAFORMA; SSOMA → SIGMA. Ya no son áreas de GRAPCO (2026-06-24).
  almacenero:         ['almacenero'],
  logistica:          ['almacenero'],
  capataz:            ['capataz'],
  carta_balance:      ['carta_balance'],
  subcontratista:     ['subcontratista'],
};

// Primer nombre capitalizado: "FRANKLIN ROSAS" → "Franklin".
const primerNombre = (s) => {
  const n = String(s || '').trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : '';
};

// Monograma del cliente para el respaldo cuando aún no subieron su logo.
// Ignora sufijos societarios (SAA, SAC, S.A., EIRL…) y toma 2 letras representativas:
// "CREDITEX SAA" → "CR" · "TEXTIL S.A.A" → "TE" · "ACME PERÚ" → "AP".
const monogramaCliente = (nombre) => {
  const limpio = String(nombre || '').trim();
  if (!limpio) return '—';
  const esSufijo = (w) => /^(sa|saa|sac|saac|eirl|srl|ltda|cia|ca)$/i.test(w.replace(/\./g, ''));
  const palabras = limpio.split(/\s+/).filter(w => !esSufijo(w));
  const ws = palabras.length ? palabras : limpio.split(/\s+/);
  if (ws.length >= 2) return (ws[0][0] + ws[1][0]).toUpperCase();
  return (ws[0] || limpio).slice(0, 2).toUpperCase();
};

// Logos de clientes conocidos (mientras no suban el suyo desde el editor de proyecto).
// La clave es un fragmento del nombre del cliente. El logo SUBIDO siempre tiene prioridad.
const LOGOS_CLIENTE_CONOCIDOS = {
  creditex: '/brand/creditex-logo.png',
};
const logoClienteConocido = (nombre) => {
  const k = String(nombre || '').toLowerCase();
  for (const clave in LOGOS_CLIENTE_CONOCIDOS) {
    if (k.includes(clave)) return LOGOS_CLIENTE_CONOCIDOS[clave];
  }
  return '';
};

// Etiqueta-acceso: ahora es un BOTÓN que ENTRA directo a esa sección del área (deep-link).
// Tinte sutil del color del área (cohesión visual) + realce claro al pasar el mouse, para
// que se lea como algo clickeable y ordenado (no como texto suelto).
// `fill`: estira el chip para ocupar toda su celda de la grilla, de modo que las
// etiquetas queden alineadas en columnas (A B C / A B C), no empacadas a la izquierda.
function ChipAcceso({ label, acento, onClick, fill = false }) {
  return (
    <span
      role="button" tabIndex={0}
      title={`Ir directo a ${label}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${acento}1f`;
        e.currentTarget.style.borderColor = `${acento}99`;
        e.currentTarget.style.color = BASE.navy;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 5px 12px -7px ${acento}cc`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${acento}0d`;
        e.currentTarget.style.borderColor = `${acento}33`;
        e.currentTarget.style.color = '#33445c';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      style={{
        display: fill ? 'flex' : 'inline-flex',
        width: fill ? '100%' : undefined,
        boxSizing: 'border-box',
        alignItems: 'center', justifyContent: 'flex-start', gap: '7px',
        background: `${acento}0d`, color: '#33445c',
        border: `1px solid ${acento}33`,
        padding: '6px 10px 6px 9px', borderRadius: '9px',
        fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.1px', lineHeight: 1.2,
        cursor: 'pointer', userSelect: 'none', transition: 'all 0.16s ease',
      }}
    >
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: acento, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Rótulo "IR DIRECTO A" sobre el grupo de etiquetas — da estructura y avisa que son navegables.
const eyebrowAccesos = (acento) => ({
  fontSize: '8.5px', fontWeight: 900, letterSpacing: '1.2px',
  textTransform: 'uppercase', color: acento, opacity: 0.72,
});

export default function SelectorPerfil({ onIrASeccion }) {
  const { user, entrarComoRol, logout, rolPermitido } = useAuth();
  // Deep-link a una sección concreta del área. Si el padre no pasó el handler
  // (uso suelto del componente), cae a entrar al área sin sección específica.
  const irA = (rol, go) => (onIrASeccion ? onIrASeccion(rol, go) : entrarComoRol(rol));
  const { proyectos, proyectoActivo, frentesDelProyecto, proyectoActivoId, setProyectoActivoId, frenteActivoId, setFrenteActivoId, fechaInicioProyecto } = useProyectoActivo();
  const [modoMarcador, setModoMarcador] = useState(false);
  const [modoPin, setModoPin] = useState(false);
  const [pin, setPin] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const videoRef = useRef(null);

  // Nombre del usuario para el saludo: primero /Usuarios/{uid}.nombre; si no, displayName o email.
  useEffect(() => {
    let activo = true;
    setNombreUsuario(primerNombre(user?.displayName || (user?.email || '').split('@')[0]));
    if (!user?.uid) return;
    getDoc(doc(db, 'Usuarios', user.uid))
      .then(snap => {
        const n = snap.exists() ? snap.data()?.nombre : '';
        if (activo && n) setNombreUsuario(primerNombre(n));
      })
      .catch(() => {});
    return () => { activo = false; };
  }, [user]);

  // Saludo según hora local + datos de contexto (fecha larga y semana del proyecto).
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fechaLargaRaw = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fechaLarga = fechaLargaRaw.charAt(0).toUpperCase() + fechaLargaRaw.slice(1);
  const semanaProyecto = obtenerSemana(new Date(), fechaInicioProyecto || FECHA_INICIO_PROYECTO);

  // Cards visibles según el rol almacenado del usuario
  // Sin escalada: si el rol no está mapeado, solo ve su propia área (no TODAS).
  const permitidos = ROL_CARDS_PERMITIDAS[rolPermitido] || (rolPermitido ? [rolPermitido] : []);
  const perfilesFiltrados = PERFILES.filter(p => permitidos.includes(p.rol));

  // Cliente de cada proyecto (campo cliente/empresa).
  const clienteDe = (p) => p?.cliente || p?.clienteNombre || p?.empresa || '';
  const clientes = Array.from(new Set((proyectos || []).map(clienteDe).filter(Boolean))).sort();
  // El CLIENTE siempre refleja el del PROYECTO ACTIVO: si hay proyecto, su
  // cliente se conoce solo (no puede quedar en "Todos" mientras hay proyecto).
  const clienteActivo = clienteDe(proyectoActivo);
  // Logo del cliente activo (lo sube el admin en el editor de proyecto). Si aún no
  // existe, la barra de contexto cae a un monograma elegante con sus iniciales.
  const logoClienteUrl = proyectoActivo?.logoCliente || proyectoActivo?.logoUrl || logoClienteConocido(clienteActivo);
  // El selector de PROYECTO solo lista los proyectos del cliente activo.
  const proyectosFiltrados = clienteActivo
    ? (proyectos || []).filter(p => clienteDe(p) === clienteActivo)
    : (proyectos || []);
  // Cambiar de CLIENTE → saltar al primer proyecto de ese cliente. Eso recarga
  // el contexto y arrastra semana, datos y todo lo demás al nuevo proyecto.
  const cambiarCliente = (c) => {
    const primero = (proyectos || []).find(p => clienteDe(p) === c);
    if (primero && primero.id !== proyectoActivoId) setProyectoActivoId(primero.id);
  };

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
          width: '100%', maxWidth: '1280px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', overflow: 'hidden',
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
          width: '100%', maxWidth: '1280px',
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
          width: '100%', maxWidth: '1280px',
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
      {/* Video hero a pantalla completa, en alta nitidez (grapco-bg.mp4). Sin
          poster oscuro: aparece con fundido suave solo cuando puede reproducir,
          así nunca se ve una imagen borrosa o lageada. */}
      {!conexionLenta() && <video
        ref={videoRef}
        autoPlay loop muted playsInline preload="auto"
        poster="/brand/grapco-bg-poster.jpg"
        onCanPlay={(e) => { e.currentTarget.style.opacity = '0.82'; e.currentTarget.play?.().catch(() => {}); }}
        onError={() => { if (videoRef.current) videoRef.current.style.display = 'none'; }}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.82,
          // Nítido y vívido (sin apagar el color): el navy overlay de abajo
          // mantiene la cohesión y la legibilidad de las tarjetas.
          filter: 'saturate(1) brightness(0.9) contrast(1.06)',
          transition: 'opacity 0.4s ease',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>}
      {/* Lavado NAVY cohesivo (sin dorado) — unifica el fondo con la marca y hace
          resaltar las tarjetas. Sustituye al overlay que mezclaba dorado+verde. */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background:
          'radial-gradient(55% 38% at 50% 2%, rgba(40,74,118,0.55) 0%, transparent 62%),'
          + 'linear-gradient(180deg, rgba(8,20,38,0.90) 0%, rgba(12,30,55,0.55) 46%, rgba(7,16,30,0.92) 100%),'
          + 'radial-gradient(130% 110% at 50% 42%, transparent 52%, rgba(4,11,22,0.78) 100%)',
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
      <div className="grapco-mesh" style={{ opacity: 0.18, mixBlendMode: 'multiply' }} />
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

      {/* Header — plataforma GRAPCO (Valtana ya firma en el pie de página) */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '16px' }}>
        {/* Isotipo GRAPCO — marco slim que ABRAZA el logo (no un plafón blanco grande) */}
        <div style={{
          width: '82px', height: '82px',
          background: 'linear-gradient(150deg, #ffffff 0%, #eef3f9 100%)',
          borderRadius: '19px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '10px', padding: '2px', position: 'relative', overflow: 'hidden',
          boxShadow: `0 13px 30px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.5), 0 0 0 1.5px ${BASE.gold}40`,
        }}>
          <img
            src={LOGO}
            alt="GRAPCO"
            onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px' }}
          />
        </div>
        <h1 style={{
          color: '#fff', fontSize: '28px', fontWeight: '900',
          margin: '0 0 6px', letterSpacing: '0.5px',
        }}>
          GRAPCO <span style={{ color: BASE.gold }}>S.A.C.</span>
        </h1>
        {/* Eyebrow premium con líneas a los lados */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '0 auto' }}>
          <span style={{ height: '1px', width: '34px', background: `linear-gradient(90deg, transparent, ${BASE.gold}aa)` }} />
          <span style={{ color: BASE.gold, fontSize: '10px', fontWeight: 800, letterSpacing: '2.8px', textTransform: 'uppercase' }}>
            Gestión de Proyectos VDC
          </span>
          <span style={{ height: '1px', width: '34px', background: `linear-gradient(90deg, ${BASE.gold}aa, transparent)` }} />
        </div>
        <p style={{
          color: '#94a3b8', fontSize: '12px',
          margin: '8px auto 0', maxWidth: '520px', lineHeight: 1.4,
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

      {/* Barra de contexto con la MARCA del cliente activo + selección */}
      {!modoPin && (
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '1180px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${BASE.gold}44`,
          borderRadius: '16px', padding: '14px 18px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 34px -22px rgba(0,0,0,0.8)',
        }}>
          {/* Identidad del cliente — logo real si lo subieron, o monograma de respaldo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px', flex: '0 1 auto', minWidth: 0 }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '15px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px',
              position: 'relative', overflow: 'hidden', flexShrink: 0,
              boxShadow: `0 10px 24px -10px rgba(0,0,0,0.6), 0 0 0 1px ${BASE.gold}33`,
            }}>
              <span style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '23px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.5px',
              }}>{monogramaCliente(clienteActivo)}</span>
              {logoClienteUrl && (
                <img src={logoClienteUrl} alt={clienteActivo || 'Cliente'}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '1.6px', color: BASE.gold, textTransform: 'uppercase', margin: 0 }}>
                Cliente
              </p>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '2px 0 0', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {clienteActivo || 'Sin cliente'}
              </p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {proyectoActivo?.nombre || proyectoActivo?.codigo || '— sin proyecto —'}
              </p>
            </div>
          </div>

          {/* Separador */}
          <div style={{ width: '1px', alignSelf: 'stretch', minHeight: '48px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

          {/* Selectores CLIENTE + PROYECTO */}
          <div style={{ flex: '1 1 360px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px' }}>
            <div>
              <label style={lblKiosk}>🏢 CLIENTE</label>
              <select value={clienteActivo} onChange={e => cambiarCliente(e.target.value)} style={selKiosk}>
                {!clienteActivo && <option value="" style={optKiosk}>— Selecciona cliente —</option>}
                {clientes.map(c => <option key={c} value={c} style={optKiosk}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lblKiosk}>🏗️ PROYECTO</label>
              <select value={proyectoActivoId || ''} onChange={e => setProyectoActivoId(e.target.value)} style={selKiosk}>
                <option value="" style={optKiosk}>— Selecciona proyecto —</option>
                {proyectosFiltrados.map(p => <option key={p.id} value={p.id} style={optKiosk}>{p.nombre || p.codigo || p.id}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

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

      {/* Saludo personalizado + acceso a Registro de Personal · Facial a la derecha
          (movido aquí desde el grid: queda al extremo derecho, bajo el selector de proyecto) */}
      {!modoPin && (
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '1180px', marginBottom: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
          animation: 'anim-fade-in 0.4s ease-out',
        }}>
          {/* Izquierda — saludo + fecha + semana */}
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <p style={{
              margin: 0, color: '#fff',
              fontSize: '24px', fontWeight: 900,
              letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.2,
            }}>
              {saludo}{nombreUsuario ? <>, <span style={{ color: '#E5A82F' }}>{nombreUsuario}</span></> : null}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '7px' }}>
              <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                {fechaLarga}
              </span>
              <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>·</span>
              <span style={{
                border: '1px solid rgba(229,168,47,0.4)', color: '#E5A82F',
                borderRadius: '999px', padding: '3px 12px',
                fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px',
              }}>
                Semana {semanaProyecto} del proyecto
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              ¿En qué área vas a trabajar hoy?
            </p>
          </div>

          {/* Derecha — Registro de Personal · Facial (abre el kiosko de marcación) */}
          <button
            onClick={() => setModoMarcador(true)}
            style={{
              cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'linear-gradient(135deg, rgba(229,168,47,0.18), rgba(229,168,47,0.05))',
              border: `1px solid ${BASE.gold}77`, borderRadius: '14px', padding: '11px 14px',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 30px -18px ${BASE.gold}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = BASE.gold; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.16), 0 16px 36px -16px ${BASE.gold}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${BASE.gold}77`; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 30px -18px ${BASE.gold}`; }}
          >
            <span style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: `linear-gradient(145deg, ${BASE.gold}33, ${BASE.gold}11)`, border: `1px solid ${BASE.gold}55`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name="user" size={20} color={BASE.gold} strokeWidth={2} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <span style={{ fontSize: '8.5px', fontWeight: 900, letterSpacing: '1.1px', textTransform: 'uppercase', color: BASE.gold, opacity: 0.9 }}>
                Registro de Personal · Facial
              </span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginTop: '2px' }}>
                Marcar Entrada / Salida
              </span>
            </span>
            <span style={{
              width: '28px', height: '28px', borderRadius: '999px',
              background: `linear-gradient(145deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 900, boxShadow: `0 4px 10px -3px ${BASE.gold}88`, marginLeft: '2px',
            }}>→</span>
          </button>
        </div>
      )}

      {/* Grid de las 4 áreas (solo cuando NO está en modo PIN) — una fila, en orden:
          Administración · Producción · Oficina Técnica · Administración del Sistema.
          Las columnas las fija la clase grapco-perfil-grid (responsive por media query). */}
      {!modoPin && (
      <div className="grapco-perfil-grid" style={{
        position: 'relative', zIndex: 1,
        gap: '14px',
        width: '100%',
        maxWidth: '1180px',
        marginTop: '18px',   // ~½ cm más abajo (pedido del usuario); el contenedor es
                             // flex-start con minHeight:100dvh, así que sigue encajando.
      }}>
        {perfilesFiltrados.map((p) => {
          const acento = p.destacado ? BASE.gold : p.color;
          // Sombra por capas + brillo interior superior (look "vidrio premium").
          const sombraBase = p.destacado
            ? `inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 46px -22px rgba(229,168,47,0.45), 0 6px 16px -10px rgba(7,16,30,0.5)`
            : `inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 46px -24px rgba(7,16,30,0.75), 0 5px 14px -10px rgba(7,16,30,0.45)`;
          return (
          <button
            key={p.rol}
            onClick={() => entrarComoRol(p.rol)}
            style={{
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%)',
              border: `1px solid ${p.destacado ? BASE.gold + '88' : 'rgba(15,42,71,0.07)'}`,
              borderRadius: '16px',
              padding: '14px 15px 12px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'transform 0.24s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.24s ease, border-color 0.24s ease',
              boxShadow: sombraBase,
              minHeight: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.9), 0 30px 60px -20px ${acento}5C, 0 0 0 1.5px ${acento}`;
              e.currentTarget.style.borderColor = acento;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = sombraBase;
              e.currentTarget.style.borderColor = p.destacado ? BASE.gold + '88' : 'rgba(15,42,71,0.07)';
            }}
          >
            {/* Barra de acento superior con glow — identidad del área */}
            <span style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, transparent, ${acento}, transparent)`,
              boxShadow: `0 0 12px ${acento}99`,
              zIndex: 2,
            }} />

            {/* Cabecera con banda tintada del color del área: da "enfoque" de color a
                cada tarjeta y aloja el kicker/insignia EN FLUJO (nunca encima del título). */}
            <div style={{
              margin: '-14px -15px 0',
              padding: '14px 15px 12px',
              background: `linear-gradient(135deg, ${acento}16 0%, ${acento}07 55%, transparent 100%)`,
              borderBottom: `1px solid ${acento}1f`,
              display: 'flex', flexDirection: 'column', gap: '9px',
            }}>
              {/* Fila kicker / insignia — presente en TODAS las tarjetas para que los
                  títulos queden a la misma altura; la destacada luce ACCESO TOTAL en oro. */}
              <div style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                {p.destacado ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff',
                    padding: '3px 11px', borderRadius: '999px',
                    fontSize: '8.5px', fontWeight: 900, letterSpacing: '0.9px',
                    boxShadow: `0 3px 10px ${BASE.gold}55`,
                  }}>★ ACCESO TOTAL</span>
                ) : (
                  <span style={{
                    fontSize: '8.5px', fontWeight: 900, letterSpacing: '1.2px',
                    textTransform: 'uppercase', color: acento, opacity: 0.85,
                  }}>{p.kicker}</span>
                )}
              </div>

              {/* Icono + título — tile más grande y título más presente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <span style={{
                  width: '44px', height: '44px',
                  borderRadius: '13px',
                  background: `linear-gradient(145deg, ${acento}26, ${acento}0D)`,
                  border: `1px solid ${acento}3d`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 5px 12px -5px ${acento}66`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name={p.iconName} size={22} color={acento} strokeWidth={2} />
                </span>
                <span style={{
                  fontSize: '14.5px', fontWeight: 800,
                  color: BASE.navy, lineHeight: 1.18,
                  letterSpacing: '-0.015em',
                }}>
                  {p.titulo}
                </span>
              </div>
            </div>

            {/* Accesos directos: cada etiqueta ENTRA a esa sección del módulo (deep-link). */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <span style={eyebrowAccesos(acento)}>Ir directo a</span>
              {/* Una sola columna: cada etiqueta va en su propia fila (uno debajo del
                  otro) y todas con el MISMO ancho (full-width vía fill). Esto alarga la
                  tarjeta hacia abajo y deja los accesos como una lista pareja. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', alignContent: 'flex-start' }}>
                {p.accesos.map(a => (
                  <ChipAcceso key={a.go} label={a.l} acento={acento} fill onClick={() => irA(p.rol, a.go)} />
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${BASE.borderSoft}`,
              paddingTop: '9px', marginTop: '1px',
            }}>
              <span style={{
                fontSize: '10.5px', fontWeight: 900, color: acento,
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                Entrar
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {/* Abrir esta área en OTRA pestaña → multi-pestaña (ej. Calidad + Planeamiento) */}
                <span
                  role="button" tabIndex={0}
                  title="Abrir esta área en una pestaña nueva"
                  onClick={(e) => { e.stopPropagation(); window.open(`${window.location.pathname}#/${p.rol}`, '_blank'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); window.open(`${window.location.pathname}#/${p.rol}`, '_blank'); } }}
                  style={{
                    width: '26px', height: '26px', borderRadius: '999px',
                    border: `1.5px solid ${acento}55`, background: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: acento, fontSize: '12px', fontWeight: 900, cursor: 'alias',
                  }}>⧉</span>
                <span style={{
                  width: '26px', height: '26px', borderRadius: '999px',
                  background: `linear-gradient(145deg, ${acento}, ${acento}cc)`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '13px', fontWeight: 900,
                  boxShadow: `0 4px 10px -3px ${acento}88`,
                }}>→</span>
              </span>
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
        © {new Date().getFullYear()} Valtana Consultoría & Construcción · Todos los derechos reservados
      </p>
    </div>
  );
}
