// src/views/SelectorPerfil.jsx
// Pantalla de entrada en modo bypass: el usuario elige con qué perfil entrar.
// Paleta GRAPCO: navy + gold del isotipo, con tarjetas claras y acento por rol.

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { BASE, LOGO, LOGO_FALLBACK, AREA_COLORS } from '../utils/styles';
import { HERO_VIDEO } from '../utils/heroVideo';
import { conexionLenta } from '../utils/connection';
import { obtenerSemana } from '../utils/helpers';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';
import Icon from '../components/Icon';
import SelectPremium from '../components/SelectPremium';
// Lazy: face-api.js (~1 MB+) NO se carga en el arranque, solo al abrir el kiosko.
const MarcadorAsistencia = lazy(() => import('./asistencia/MarcadorAsistencia'));

// Etiqueta de los selectores sobre el panel CLARO de la pantalla de entrada.
const lblCtx = { display: 'block', color: '#64748b', fontSize: '9.5px', fontWeight: 900, letterSpacing: '1px', marginBottom: '6px' };
const lblKiosk = { display: 'block', color: '#94a3b8', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', marginBottom: '6px' };
// (selKiosk/optKiosk retirados: los <select> nativos migraron a SelectPremium —
//  cohesión navy/gold + bottom-sheet en Android, regla "dropdowns = SelectPremium".)

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
    rol: 'ingeniero',
    titulo: 'Producción',
    iconName: 'barChart3',
    color: AREA_COLORS.ingeniero,
    orden: 1,
    kicker: 'Avance · Productividad',
    descripcion: 'Control integral de avance, productividad y carta balance bajo Lean Construction, orientado a maximizar cumplimiento y desempeño operativo.',
    // Módulos REALES del área (moduloIngeniero). Planeamiento (Cronograma/Last Planner/
    // Pull Planning) → app PLANEAMIENTO_PLATAFORMA; 'Materiales' → Administración (2026-06-24).
    accesos: [
      { l: 'Plan Diario',         go: 'planDiario', ic: 'registro',   d: 'Programación diaria por cuadrilla' },
      { l: 'Auditoría · CPI/ISP', go: 'dashboard',  ic: 'chartBars',  d: 'Avance, CPI, EAC, tareo y personal' },
      { l: 'Carta Balance',       go: 'carta',      ic: 'balance',    d: 'Medición de productividad en campo' },
      { l: 'Modelo BIM',          go: 'bim',        ic: 'layers',     d: 'Visor 3D, costo, sectorización y 4D' },
      { l: 'Registro',            go: 'registro',   ic: 'checkSquare', d: 'Registro de producción del día' },
    ],
  },
  {
    rol: 'oficina_tecnica',
    titulo: 'Oficina Técnica',
    iconName: 'coins',
    color: AREA_COLORS.oficina_tecnica,
    orden: 2,
    kicker: 'Costos · Valorización',
    descripcion: 'Gestión centralizada de RO, valorizaciones, adicionales, deductivos, garantizando control económico, trazabilidad y soporte para la toma de decisiones.',
    // Secciones REALES del área (moduloOT / ot.*). Entran directo vía tabExterna.
    // Orden por flujo: Presupuesto → Ejecución (Registro/BIM) → Valorización + Sustento.
    // 'Informe PDF' y 'Resultado Operativo' se retiraron de ESTOS ACCESOS DIRECTOS
    // (pedido del usuario 2026-07-25); siguen dentro del área, en su menú lateral.
    accesos: [
      { l: 'Presupuesto',          go: 'ot.partidas',      ic: 'fileText',   d: 'PPTO · CD · GG · Utilidad · IGV' },
      { l: 'Registro Fotográfico', go: 'ot.fotografico',   ic: 'layers',     d: 'Fotos de obra del capataz' },
      { l: 'Modelo BIM',           go: 'ot.bim',           ic: 'cube',       d: 'Vínculos y visor 3D' },
      { l: 'Valorización F07',     go: 'ot.valoriz',       ic: 'coins',      d: 'Formato oficial por metrado del ISP' },
      { l: 'Sustento',             go: 'ot.sustento',      ic: 'ruler',      d: 'Planilla de metrados y fotos' },
    ],
  },
  // Gestión de Calidad (protocolos, PETs, NCs, ensayos, planos) → app independiente
  // CALIDAD_PLATAFORMA (2026-06-24). SSOMA → plataforma SIGMA (2026-06-15).
  {
    rol: 'admin',
    titulo: 'Administración del Sistema',
    iconName: 'shieldAdmin',
    color: BASE.navy,
    orden: 4,
    descripcion: 'Configuración y control global de la plataforma, gestión de usuarios, permisos y auditoría de información. Garantiza seguridad, gobernanza y trazabilidad sobre todos los procesos del sistema.',
    // Sub-pestañas REALES de AdminPanel. Entran directo vía tabInicial.
    kicker: 'Gobierno · Seguridad',
    accesos: [
      { l: 'Resumen',       go: 'resumen',    ic: 'dashboard',   d: 'Vista general del sistema' },
      { l: 'Usuarios',      go: 'usuarios',   ic: 'users',       d: 'Cuentas, roles y aprobaciones' },
      { l: 'Asistencia',    go: 'asistencia', ic: 'clock',       d: 'Entrada/salida de obreros · HH' },
      { l: 'Auditoría',     go: 'auditoria',  ic: 'shield',      d: 'Log de operaciones críticas' },
      { l: 'Configuración', go: 'config',     ic: 'settings',    d: 'Tarifas y parámetros globales' },
    ],
    destacado: true,
  },
];

// Mapeo de rolPermitido (almacenado en /Usuarios) → cards visibles en el selector.
// admin / ingeniero ven TODAS las áreas (perfiles senior multi-área).
// Roles específicos solo ven su propia área (más una de soporte cuando aplica).
const TODAS = ['ingeniero','oficina_tecnica','admin'];
const ROL_CARDS_PERMITIDAS = {
  admin:              TODAS,
  ingeniero:          TODAS,
  oficina_tecnica:    ['oficina_tecnica','ingeniero'],
  // Planeamiento → app PLANEAMIENTO_PLATAFORMA; Calidad / supervisor_cliente →
  // app CALIDAD_PLATAFORMA; SSOMA → SIGMA. Ya no son áreas de GRAPCO (2026-06-24).
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
  // Rate-limit del PIN: tras 5 intentos fallidos bloquea el teclado 30 s (anti fuerza bruta).
  const [pinIntentos, setPinIntentos] = useState(0);
  const [pinBloqueadoHasta, setPinBloqueadoHasta] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const videoRef = useRef(null);
  // Móvil → SelectPremium usa bottom-sheet (no dropdown anclado). App nativa/celular.
  const isMobile = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  // Nombre del usuario para el saludo: primero /Usuarios/{uid}.nombre; si no, displayName o email.
  useEffect(() => {
    let activo = true;
    setNombreUsuario(primerNombre(user?.displayName || (user?.email || '').split('@')[0]));
    if (!user?.uid) return;
    const ref = doc(db, 'Usuarios', user.uid);
    // Cache-first: arranque instantáneo (offline-first); si no hay cache, va al server.
    getDocFromCache(ref)
      .catch(() => getDoc(ref))
      .then(snap => {
        const n = snap?.exists() ? snap.data()?.nombre : '';
        if (activo && n) setNombreUsuario(primerNombre(n));
      })
      .catch(() => {});
    return () => { activo = false; };
  }, [user?.uid]);

  // Ahorro de batería en obra: pausa el video y las animaciones del fondo cuando la
  // app/pestaña pasa a segundo plano; las reanuda al volver (Capacitor / LTE variable).
  useEffect(() => {
    const onVis = () => {
      const oculto = document.hidden;
      document.body.classList.toggle('grapco-anim-paused', oculto);
      const v = videoRef.current;
      if (v) { if (oculto) v.pause?.(); else v.play?.().catch(() => {}); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); document.body.classList.remove('grapco-anim-paused'); };
  }, []);

  // A11y / kiosko: teclado FÍSICO en el modo PIN (lectores de huella/teclados de
  // obra). 0-9 escribe, Backspace borra, Escape sale del modo PIN.
  useEffect(() => {
    if (!modoPin) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setModoPin(false); setPin(''); setErrorPin(''); return; }
      if (pinBloqueadoHasta > Date.now()) return;   // bloqueado por rate-limit
      if (e.key >= '0' && e.key <= '9') setPin(p => (p.length < 4 ? p + e.key : p));
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modoPin, pinBloqueadoHasta]);

  // Saludo según hora local + datos de contexto (fecha larga y semana del proyecto).
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fechaLargaRaw = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fechaLarga = fechaLargaRaw.charAt(0).toUpperCase() + fechaLargaRaw.slice(1);
  const semanaProyecto = obtenerSemana(new Date(), fechaInicioProyecto || FECHA_INICIO_PROYECTO);

  // Cards visibles según el rol almacenado del usuario
  // Sin escalada: si el rol no está mapeado, solo ve su propia área (no TODAS).
  const permitidos = ROL_CARDS_PERMITIDAS[rolPermitido] || (rolPermitido ? [rolPermitido] : []);
  // Orden de las tarjetas por el campo `orden` (no por el orden del array): así
  // reordenar es cambiar un número. Pedido 2026-06-29: Producción · Oficina Técnica ·
  // Administración · Administración del Sistema (acceso total al final).
  const perfilesFiltrados = PERFILES.filter(p => permitidos.includes(p.rol))
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

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

  // Atajo: si el usuario teclea 4 dígitos, intenta entrar por PIN (con rate-limit).
  useEffect(() => {
    if (pin.length === 4) {
      const rolPin = PINS_OBRA[pin];
      if (rolPin) {
        entrarComoRol(rolPin);
      } else {
        const intentos = pinIntentos + 1;
        setPinIntentos(intentos);
        if (intentos >= 5) {
          // Lockout 30 s: el efecto de desbloqueo resetea pin/intentos/error al expirar.
          setPinBloqueadoHasta(Date.now() + 30000);
          setErrorPin('Demasiados intentos · espera 30 s');
        } else {
          setErrorPin(`PIN inválido (${intentos}/5)`);
          setTimeout(() => { setPin(''); setErrorPin(''); }, 2500);
        }
      }
    } else {
      setErrorPin('');
    }
    // pinIntentos se lee del cierre del render donde `pin` cambió (siempre el último
    // valor): añadirlo a deps re-dispararía el efecto y duplicaría el conteo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, entrarComoRol]);

  // Desbloqueo automático del PIN al expirar el lockout de 30 s.
  useEffect(() => {
    if (!pinBloqueadoHasta) return;
    const t = setTimeout(() => {
      setPinBloqueadoHasta(0); setPinIntentos(0); setPin(''); setErrorPin('');
    }, Math.max(0, pinBloqueadoHasta - Date.now()));
    return () => clearTimeout(t);
  }, [pinBloqueadoHasta]);

  // Al abrir el kiosko, si no hay proyecto activo y solo hay uno, lo elige solo.
  useEffect(() => {
    if (modoMarcador && !proyectoActivoId && Array.isArray(proyectos) && proyectos.length >= 1) {
      setProyectoActivoId(proyectos[0].id);
    }
  }, [modoMarcador, proyectoActivoId, proyectos, setProyectoActivoId]);

  // ¿El teclado PIN está bloqueado ahora mismo? (rate-limit activo)
  const pinBloqueado = pinBloqueadoHasta > Date.now();

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
            <SelectPremium
              title="Proyecto" isMobile={isMobile}
              value={proyectoActivoId || ''}
              onChange={v => setProyectoActivoId(v)}
              placeholder="— Selecciona proyecto —"
              options={(proyectos || []).map(p => ({ value: p.id, label: p.nombre || p.codigo || p.id }))}
            />
          </div>
          <div>
            <label style={lblKiosk}>📍 FRENTE</label>
            <SelectPremium
              title="Frente" isMobile={isMobile}
              value={frenteActivoId || ''}
              onChange={v => setFrenteActivoId(v)}
              placeholder="— Todos / sin frente —"
              options={[{ value: '', label: '— Todos / sin frente —' }, ...(frentesDelProyecto || []).map(f => ({ value: f.id, label: `${f.codigo ? f.codigo + ' · ' : ''}${f.nombre || f.id}` }))]}
            />
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

  // ── PANTALLA DE ENTRADA ──
  // Formato unificado con la app de Presupuestos (grapco-presupuestos-2026):
  // un solo panel central = cabecera navy con la marca + cuerpo claro con el
  // saludo, el contexto del proyecto y los accesos como tiles en cuadrícula.
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      // Safe-areas Capacitor: respeta notch/barra de gestos para no recortar el panel.
      padding: 'max(56px, calc(env(safe-area-inset-top) + 48px)) max(14px, env(safe-area-inset-right)) calc(22px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))',
      background: '#0a1628',
      fontFamily: BASE.font,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* === VIDEO DE FONDO === */}
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
          filter: 'saturate(1) brightness(0.9) contrast(1.06)',
          transition: 'opacity 0.4s ease',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>}
      {/* Lavado NAVY cohesivo — unifica el fondo con la marca y resalta el panel. */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background:
          'radial-gradient(55% 38% at 50% 2%, rgba(40,74,118,0.55) 0%, transparent 62%),'
          + 'linear-gradient(180deg, rgba(8,20,38,0.90) 0%, rgba(12,30,55,0.58) 46%, rgba(7,16,30,0.94) 100%),'
          + 'radial-gradient(130% 110% at 50% 42%, transparent 52%, rgba(4,11,22,0.80) 100%)',
      }} />
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

      {/* === BARRA SUPERIOR FLOTANTE: identidad de sesión + salir === */}
      <div style={{
        position: 'absolute', top: '16px', right: '18px', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap',
        justifyContent: 'flex-end', maxWidth: 'calc(100% - 36px)',
      }}>
        {proyectoActivo?.estado === 'completado' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(22,163,74,0.16)', border: '1px solid rgba(52,211,153,0.5)',
            color: '#34d399', padding: '6px 12px', borderRadius: '999px',
            fontSize: '10px', fontWeight: 900, letterSpacing: '0.6px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
            PROYECTO TERMINADO
          </span>
        )}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.82)', padding: '6px 13px', borderRadius: '999px',
          fontSize: '11px', fontWeight: 700, maxWidth: 'min(260px, 42vw)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <Icon name="user" size={13} color={BASE.gold} strokeWidth={2.2} />
          {user?.email || 'sesión activa'}
        </span>
        <button
          onClick={() => logout?.()}
          aria-label="Cerrar sesión y volver al login"
          style={{
            background: 'rgba(220,38,38,0.20)', border: '1px solid rgba(220,38,38,0.55)',
            color: '#fecaca', padding: '7px 15px', borderRadius: '999px',
            fontSize: '11px', fontWeight: 900, letterSpacing: '0.6px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.34)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.20)'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          SALIR
        </button>
      </div>

      {/* ══════════ PANEL CENTRAL ══════════ */}
      {/* zIndex 3: por encima del scan y las partículas del fondo (z-index 2), que
          si no cruzaban una línea dorada por encima de las tarjetas. */}
      <div className="vdc-card" style={{ position: 'relative', zIndex: 3, animation: 'anim-fade-in 0.35s ease-out' }}>

        {/* ── Cabecera navy con la marca ── */}
        <div className="vdc-head">
          <div style={{
            width: '58px', height: '58px', margin: '0 auto 8px',
            background: 'linear-gradient(150deg, #ffffff 0%, #eef3f9 100%)',
            borderRadius: '15px', padding: '2px', overflow: 'hidden',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 13px 30px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.5), 0 0 0 1.5px ${BASE.gold}40`,
          }}>
            <img
              src={LOGO} alt="GRAPCO"
              onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px' }}
            />
          </div>
          <h1 style={{
            margin: 0, color: '#fff', fontSize: '21px', fontWeight: 900, letterSpacing: '2.2px',
          }}>
            GRAPCO <span style={{ color: BASE.gold }}>SAC</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '7px' }}>
            <span style={{ height: '1px', width: '30px', background: `linear-gradient(90deg, transparent, ${BASE.gold}aa)` }} />
            <span style={{ color: BASE.gold, fontSize: '10px', fontWeight: 800, letterSpacing: '2.6px', textTransform: 'uppercase' }}>
              Gestión de Proyectos VDC
            </span>
            <span style={{ height: '1px', width: '30px', background: `linear-gradient(90deg, ${BASE.gold}aa, transparent)` }} />
          </div>
        </div>

        {/* ── Cuerpo claro ── */}
        <div className="vdc-body">

          {/* Modo PIN: teclado numérico centrado dentro del panel */}
          {modoPin ? (
            <div style={{ maxWidth: '340px', margin: '4px auto 8px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: BASE.navy }}>Acceso por PIN de obra</h2>
              <p style={{ margin: '6px 0 16px', fontSize: '12px', color: BASE.muted, lineHeight: 1.45 }}>
                Ingresa el PIN de 4 dígitos. Modo kiosko para personal de campo.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '52px', height: '62px', borderRadius: '12px',
                    border: `2px solid ${pin.length > i ? BASE.gold : 'rgba(15,42,71,0.16)'}`,
                    background: pin.length > i ? `${BASE.gold}1f` : '#fff',
                    color: BASE.navy, fontSize: '26px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {pin[i] ? '●' : ''}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '9px' }}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                  d === '' ? <div key={i} /> : (
                    <button key={i} disabled={pinBloqueado} onClick={() => {
                      if (pinBloqueado) return;
                      if (d === '⌫') setPin(pin.slice(0, -1));
                      else if (pin.length < 4) setPin(pin + d);
                    }} style={{
                      height: '52px', background: '#fff',
                      border: '1px solid rgba(15,42,71,0.14)', borderRadius: '12px',
                      color: BASE.navy, fontSize: '19px', fontWeight: 800,
                      cursor: pinBloqueado ? 'not-allowed' : 'pointer',
                      opacity: pinBloqueado ? 0.45 : 1,
                      boxShadow: '0 2px 8px -5px rgba(15,42,71,0.4)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!pinBloqueado) { e.currentTarget.style.background = `${BASE.gold}14`; e.currentTarget.style.borderColor = `${BASE.gold}88`; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(15,42,71,0.14)'; }}>
                      {d}
                    </button>
                  )
                ))}
              </div>
              {errorPin && (
                <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 800, marginTop: '12px' }}>❌ {errorPin}</p>
              )}
              <button onClick={() => { setModoPin(false); setPin(''); setErrorPin(''); }} style={{
                marginTop: '16px', background: 'transparent', border: `1px solid ${BASE.navy}33`,
                color: BASE.navy, padding: '8px 18px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px', cursor: 'pointer',
              }}>◄ Volver al inicio</button>
            </div>
          ) : (
          <>
            {/* Saludo */}
            <div style={{ textAlign: 'center', marginBottom: '11px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: BASE.navy, letterSpacing: '-0.01em' }}>
                {saludo}{nombreUsuario ? <>, {nombreUsuario}</> : null} <span style={{ fontSize: '19px' }}>👋</span>
              </h2>
              <p style={{ margin: '5px 0 0', fontSize: '13px', fontWeight: 600, color: BASE.muted }}>
                ¿Qué deseas hacer hoy?
              </p>
              {/* Fila de contexto: fecha · semana · cliente (equivale a los KPIs de Presupuestos) */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', flexWrap: 'wrap', marginTop: '9px',
                fontSize: '11.5px', fontWeight: 700, color: '#64748b',
              }}>
                <span>{fechaLarga}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{
                  border: `1px solid ${BASE.gold}66`, color: '#b8801a',
                  background: `${BASE.gold}12`,
                  borderRadius: '999px', padding: '3px 11px', fontWeight: 800,
                }}>
                  Semana {semanaProyecto} del proyecto
                </span>
                {clienteActivo && (
                  <>
                    {/* El separador viaja DENTRO del span del cliente: si la fila
                        se parte en móvil, no queda un "·" huérfano al final. */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.4, marginRight: '2px' }}>·</span>
                      {logoClienteUrl ? (
                        <img src={logoClienteUrl} alt={clienteActivo}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '4px', background: '#fff' }} />
                      ) : (
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '5px', background: BASE.navy, color: '#fff',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '8px', fontWeight: 900,
                        }}>{monogramaCliente(clienteActivo)}</span>
                      )}
                      <b style={{ color: BASE.navy }}>{clienteActivo}</b>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Selectores CLIENTE + PROYECTO */}
            <div style={{
              background: '#f1f5fa', border: '1px solid rgba(15,42,71,0.09)',
              borderRadius: '14px', padding: '10px 13px', marginBottom: '4px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px',
            }}>
              <div>
                <label style={lblCtx}>🏢 CLIENTE</label>
                <SelectPremium
                  title="Cliente" isMobile={isMobile}
                  value={clienteActivo}
                  onChange={v => cambiarCliente(v)}
                  placeholder="— Selecciona cliente —"
                  options={clientes.map(c => ({ value: c, label: c }))}
                />
              </div>
              <div>
                <label style={lblCtx}>🏗️ PROYECTO</label>
                <SelectPremium
                  title="Proyecto" isMobile={isMobile}
                  value={proyectoActivoId || ''}
                  onChange={v => setProyectoActivoId(v)}
                  placeholder="— Selecciona proyecto —"
                  options={proyectosFiltrados.map(p => ({ value: p.id, label: p.nombre || p.codigo || p.id }))}
                />
              </div>
            </div>

            {/* Accesos destacados: kiosko facial + PIN de obra */}
            <div className="vdc-hero" style={{ marginTop: '12px' }}>
              <button
                className="vdc-tile"
                onClick={() => setModoMarcador(true)}
                style={{
                  '--vdc-acento': BASE.gold,
                  '--vdc-sombra': `${BASE.gold}88`,
                  '--vdc-ic-bg': `linear-gradient(145deg, ${BASE.gold}2e, ${BASE.gold}0f)`,
                  '--vdc-ic-bd': `${BASE.gold}55`,
                  borderColor: `${BASE.gold}66`,
                  background: 'linear-gradient(160deg, #fffdf7 0%, #ffffff 60%)',
                }}
              >
                <span className="vdc-tile-ic"><Icon name="user" size={21} color={BASE.gold} strokeWidth={2} /></span>
                <span className="vdc-tile-txt">
                  <span className="vdc-tile-t">Marcar Entrada / Salida</span>
                  <span className="vdc-tile-s">Registro de personal por reconocimiento facial</span>
                </span>
              </button>
              <button
                className="vdc-tile"
                onClick={() => { setModoPin(true); setPin(''); setErrorPin(''); }}
                style={{
                  '--vdc-acento': BASE.navy,
                  '--vdc-sombra': `${BASE.navy}88`,
                  '--vdc-ic-bg': `linear-gradient(145deg, ${BASE.navy}22, ${BASE.navy}0a)`,
                  '--vdc-ic-bd': `${BASE.navy}33`,
                }}
              >
                <span className="vdc-tile-ic"><Icon name="shield" size={21} color={BASE.navy} strokeWidth={2} /></span>
                <span className="vdc-tile-txt">
                  <span className="vdc-tile-t">Acceso por PIN de obra</span>
                  <span className="vdc-tile-s">Entrada rápida del personal de campo</span>
                </span>
              </button>
            </div>

            {/* Estado vacío: rol sin áreas mapeadas */}
            {perfilesFiltrados.length === 0 && (
              <div style={{
                marginTop: '16px', background: '#f1f5fa', border: '1px solid rgba(15,42,71,0.09)',
                borderRadius: '14px', padding: '26px 20px', textAlign: 'center',
              }}>
                <p style={{ color: BASE.navy, fontSize: '14.5px', fontWeight: 800, margin: 0 }}>Sin áreas asignadas</p>
                <p style={{ color: BASE.muted, fontSize: '12.5px', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Tu usuario aún no tiene áreas habilitadas en este proyecto.<br />Contacta al administrador del sistema.
                </p>
              </div>
            )}

            {/* ── Las áreas, una por COLUMNA: así todo cabe en pantalla sin
                   scroll largo y se aprovecha el ancho del monitor. ── */}
            <div className="vdc-areas">
              {perfilesFiltrados.map((p) => {
                const acento = p.destacado ? BASE.gold : p.color;
                return (
                  <section key={p.rol} className="vdc-area">
                    <div className="vdc-area-head">
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                        background: `linear-gradient(145deg, ${acento}26, ${acento}0d)`,
                        border: `1px solid ${acento}3d`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={p.iconName} size={17} color={acento} strokeWidth={2.2} />
                      </span>
                      <span className="vdc-area-t" style={{ color: acento }}>
                        {p.titulo}
                        {p.kicker && <span className="vdc-area-k">{p.kicker}</span>}
                      </span>
                      {/* Abrir el área en otra pestaña (multi-pestaña) */}
                      <span
                        role="button" tabIndex={0}
                        aria-label={`Abrir ${p.titulo} en una pestaña nueva`}
                        title="Abrir esta área en una pestaña nueva"
                        onClick={() => window.open(`${window.location.pathname}#/${p.rol}`, '_blank')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(`${window.location.pathname}#/${p.rol}`, '_blank'); } }}
                        style={{
                          width: '24px', height: '24px', borderRadius: '999px', flexShrink: 0,
                          border: `1.5px solid ${acento}55`, background: '#fff', color: acento,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 900, cursor: 'alias',
                        }}>⧉</span>
                    </div>
                    <div className="vdc-area-list">
                      {p.accesos.map(a => (
                        <button
                          key={a.go}
                          className="vdc-row"
                          onClick={() => irA(p.rol, a.go)}
                          title={`Ir directo a ${a.l}`}
                          style={{
                            '--vdc-acento': acento,
                            '--vdc-sombra': `${acento}77`,
                            '--vdc-ic-bg': `linear-gradient(145deg, ${acento}22, ${acento}0a)`,
                            '--vdc-ic-bd': `${acento}33`,
                          }}
                        >
                          <span className="vdc-row-ic"><Icon name={a.ic || 'fileText'} size={17} color={acento} strokeWidth={2} /></span>
                          <span className="vdc-row-txt">
                            <span className="vdc-row-t">{a.l}</span>
                            {a.d && <span className="vdc-row-s">{a.d}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                    {/* CTA al pie de la columna: entra al área completa. */}
                    <button
                      className="vdc-enter"
                      onClick={() => entrarComoRol(p.rol)}
                      style={{ color: acento }}
                      title={`Entrar a ${p.titulo}`}
                    >
                      <span className="vdc-enter-l">ENTRAR AL ÁREA →</span>
                    </button>
                  </section>
                );
              })}
            </div>
          </>
          )}
        </div>

        {/* ── Pie: firma Valtana ── */}
        <div style={{
          borderTop: '1px solid rgba(15,42,71,0.08)',
          padding: '10px 18px 11px', textAlign: 'center',
          background: '#f6f8fc',
        }}>
          <img
            src="/brand/valtana-logo.png"
            alt="Valtana Consultoría & Construcción"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ width: '96px', height: 'auto', display: 'block', margin: '0 auto 5px', opacity: 0.9 }}
          />
          <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8' }}>
            © {new Date().getFullYear()} · Una solución de <b style={{ color: BASE.navy }}>VALTANA</b> Consultoría &amp; Construcción S.A.C.
          </span>
        </div>
      </div>
    </div>
  );
}
