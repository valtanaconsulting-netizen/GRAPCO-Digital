// src/views/Login.jsx — v2 (Bloque 12) con protección anti-fuerza-bruta + bootstrap admin
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { BASE, LOGO, LOGO_FALLBACK, inp } from '../utils/styles';

const STORAGE_INTENTOS = 'grapco_login_intentos';
const MAX_INTENTOS = 5;
const COOLDOWN_MS = 30 * 1000;  // 30 segundos (antes eran 5 minutos)

// Ícono profesional de mostrar/ocultar contraseña (SVG line-style, no emoji).
function IconoOjo({ abierto }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: 'block', color: '#64748b' }}>
      {abierto ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.36" />
          <path d="M6.1 6.1A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 4.9-1.34" />
          <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      )}
    </svg>
  );
}

export default function Login() {
  const { login, register, registerAsBootstrapAdmin } = useAuth();
  const [bootstrapDisponible, setBootstrapDisponible] = useState(false);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [bootstrapForm, setBootstrapForm] = useState({ email: '', password: '', nombre: '' });
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');

  // Detectar si el bootstrap del primer admin sigue disponible
  useEffect(() => {
    getDoc(doc(db, 'Bootstrap', 'done'))
      .then(snap => setBootstrapDisponible(!snap.exists()))
      .catch(() => setBootstrapDisponible(false));
  }, []);

  const handleBootstrap = async (e) => {
    e.preventDefault();
    setBootstrapError('');
    if (!bootstrapForm.email || !bootstrapForm.password) {
      setBootstrapError('Email y contrasena son obligatorios');
      return;
    }
    if (bootstrapForm.password.length < 8) {
      setBootstrapError('La contrasena debe tener minimo 8 caracteres');
      return;
    }
    setBootstrapBusy(true);
    try {
      await registerAsBootstrapAdmin(bootstrapForm.email, bootstrapForm.password, bootstrapForm.nombre);
      // Login exitoso, App.jsx hace redirect automatico
    } catch (err) {
      setBootstrapError(err.message);
    } finally {
      setBootstrapBusy(false);
    }
  };

  const [view,         setView]         = useState('login');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [verPassword,  setVerPassword]  = useState(false);   // 👁️ toggle mostrar/ocultar
  const [rolRegistro,  setRolRegistro]  = useState('capataz');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  // PWA: capturar el evento beforeinstallprompt para ofrecer instalación en escritorio
  const [pwaPrompt,    setPwaPrompt]    = useState(null);
  const [pwaInstalada, setPwaInstalada] = useState(false);

  // Al montar, verificar si hay un bloqueo activo
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_INTENTOS) || '{}');
      if (data.bloqueadoHasta && data.bloqueadoHasta > Date.now()) {
        setBloqueadoHasta(data.bloqueadoHasta);
      }
    } catch (_) {}
  }, []);

  // PWA: detectar si el navegador ofrece instalación o si ya está instalada
  useEffect(() => {
    // ¿Ya está abierta como app instalada?
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setPwaInstalada(true);
      return;
    }
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setPwaInstalada(true); setPwaPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const instalarApp = async () => {
    if (!pwaPrompt) {
      // Fallback: instrucciones manuales
      alert('Para instalar GRAPCO como aplicación:\n\n' +
        '• Chrome / Edge: click en el ícono "Instalar" (⬇️) de la barra de direcciones, o menú ⋮ → Instalar PLATAFORMA GRAPCO S.A.C.\n' +
        '• Safari (iOS): botón Compartir → Añadir a pantalla de inicio\n\n' +
        'Si no ves la opción, recarga la página con Ctrl+Shift+R y vuelve a intentar.');
      return;
    }
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === 'accepted') setPwaInstalada(true);
    setPwaPrompt(null);
  };

  // Tick para countdown del cooldown
  useEffect(() => {
    if (bloqueadoHasta === 0) return;
    const tick = () => {
      const restante = bloqueadoHasta - Date.now();
      if (restante <= 0) {
        setBloqueadoHasta(0);
        setTiempoRestante(0);
        localStorage.removeItem(STORAGE_INTENTOS);
      } else {
        setTiempoRestante(Math.ceil(restante / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bloqueadoHasta]);

  const registrarIntentoFallido = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_INTENTOS) || '{}');
      const intentos = (data.intentos || 0) + 1;
      if (intentos >= MAX_INTENTOS) {
        const hasta = Date.now() + COOLDOWN_MS;
        localStorage.setItem(STORAGE_INTENTOS, JSON.stringify({ intentos, bloqueadoHasta: hasta }));
        setBloqueadoHasta(hasta);
      } else {
        localStorage.setItem(STORAGE_INTENTOS, JSON.stringify({ intentos }));
      }
    } catch (_) {}
  };

  const limpiarIntentos = () => {
    localStorage.removeItem(STORAGE_INTENTOS);
  };

  const [loginExitoso, setLoginExitoso] = useState(false);
  const [resetEnviando, setResetEnviando] = useState(false);
  const [resetExito, setResetExito] = useState('');

  const handleResetPassword = async () => {
    setError('');
    setResetExito('');
    if (!email) { setError('Escribe tu correo arriba y luego haz click aquí.'); return; }
    setResetEnviando(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetExito(`Te enviamos un enlace para restablecer tu contraseña a ${email.trim()}. Revisa tu bandeja (y spam).`);
      // Si estaba bloqueado por intentos, desbloquear
      limpiarIntentos();
      setBloqueadoHasta(0);
    } catch (err) {
      // Por seguridad, no revelar si el email existe o no
      setResetExito(`Si la cuenta existe, te enviamos un enlace a ${email.trim()}.`);
    } finally {
      setResetEnviando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (bloqueadoHasta > Date.now()) return;
    if (!email || !password) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      if (view === 'login') await login(email, password);
      else                  await register(email, password, rolRegistro);
      limpiarIntentos();
      setLoginExitoso(true);
      // Pequenia pausa para que el usuario vea el check antes de que App.jsx redirija
      await new Promise(r => setTimeout(r, 700));
    } catch (err) {
      setError(err.message);
      if (view === 'login') registrarIntentoFallido();
      setLoading(false);
    }
  };

  // Split-screen estilo Procore / Autodesk Construction Cloud:
  // video de obra + mensaje de marca a la izquierda · panel de acceso a la derecha.
  const [anchoPantalla, setAnchoPantalla] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setAnchoPantalla(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [videoListo, setVideoListo] = useState(false);
  const esEscritorio = anchoPantalla >= 1024;

  return (
    <div className="grapco-login-bg" style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: esEscritorio ? 'flex-start' : 'center',
      padding: 0,
      fontFamily: BASE.font,
      position: 'relative',
      overflow: 'hidden',
      background: '#0a1628',
    }}>
      {/* ── ESCENA PREMIUM 100% CSS (base, SIEMPRE visible → cero lag) ──
          Gradiente navy + grilla blueprint + auroras doradas que derivan +
          haz de luz diagonal. Nunca muestra una imagen oscura genérica. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(125% 100% at 78% 18%, #1a3c63 0%, #0d2748 42%, #060f1f 100%)',
      }} />
      {/* Grilla blueprint */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.55,
        backgroundImage: `linear-gradient(rgba(229,168,47,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(229,168,47,0.06) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(circle at 30% 45%, #000 0%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(circle at 30% 45%, #000 0%, transparent 78%)',
      }} />
      {/* Auroras doradas / navy que derivan lento */}
      <div aria-hidden="true" style={{ position: 'absolute', zIndex: 0, width: 600, height: 600, top: '-14%', left: '-10%', borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${BASE.gold}22 0%, transparent 60%)`, filter: 'blur(26px)', animation: 'grapco-aur1 16s ease-in-out infinite' }} />
      <div aria-hidden="true" style={{ position: 'absolute', zIndex: 0, width: 520, height: 520, bottom: '-16%', right: '12%', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(30,70,116,0.40) 0%, transparent 62%)', filter: 'blur(28px)', animation: 'grapco-aur2 20s ease-in-out infinite' }} />
      {/* Haz de luz diagonal sutil */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `linear-gradient(115deg, transparent 40%, ${BASE.gold}0e 50%, transparent 60%)` }} />

      {/* Video de obra — capa opcional: aparece SUAVE solo cuando puede
          reproducir (sin poster → nunca muestra imagen oscura si laguea). */}
      <video
        className="grapco-hero-video"
        autoPlay muted loop playsInline preload="auto"
        onCanPlay={(e) => { setVideoListo(true); e.currentTarget.play?.().catch(() => {}); }}
        onPlaying={() => setVideoListo(true)}
        aria-hidden="true"
        style={{ opacity: videoListo ? 0.5 : 0, transition: 'opacity 1.1s ease' }}
      >
        <source src="/grapco-bg.mp4" type="video/mp4" />
      </video>
      {/* Overlay sobrio: legibilidad sin matar la escena */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: esEscritorio
          ? 'linear-gradient(90deg, rgba(8,18,34,0.82) 0%, rgba(8,18,34,0.42) 52%, rgba(8,18,34,0.50) 100%)'
          : 'radial-gradient(circle at center, rgba(15,23,42,0.45) 0%, rgba(10,22,40,0.85) 78%)',
      }} />
      {/* Firma dorada superior */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px', zIndex: 8,
        background: `linear-gradient(90deg, transparent, ${BASE.gold}, transparent)`,
      }} />

      {/* ══ PANEL IZQUIERDO — la marca sobre la obra (solo escritorio) ══ */}
      {esEscritorio && (
        <div style={{
          position: 'relative', zIndex: 5, flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '44px 60px 36px',
          animation: 'grapco-card-in 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Marca arriba */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px',
              boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1.5px ${BASE.gold}`,
            }}>
              <img src={LOGO} alt="GRAPCO" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }} />
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '2px', lineHeight: 1 }}>GRAPCO <span style={{ color: BASE.gold }}>S.A.C</span></p>
              <p style={{ fontSize: '9px', fontWeight: 800, color: BASE.gold, letterSpacing: '2.2px', marginTop: '3px' }}>GESTIÓN DE PROYECTOS VDC</p>
            </div>
          </div>

          {/* Claim central */}
          <div style={{ maxWidth: '560px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '3px',
              marginBottom: '14px',
            }}>PLATAFORMA VDC · LEAN CONSTRUCTION</p>
            <h2 style={{
              fontSize: 'clamp(30px, 3.6vw, 46px)', fontWeight: 900, color: '#fff',
              lineHeight: 1.12, letterSpacing: '-0.5px', marginBottom: '16px',
              textShadow: '0 2px 24px rgba(0,0,0,0.45)',
            }}>
              La obra bajo control,<br />en <span style={{ color: BASE.gold }}>tiempo real</span>.
            </h2>
            <p style={{ fontSize: '14.5px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, marginBottom: '26px', maxWidth: '470px' }}>
              Del tareo en campo a la curva S: producción, planeamiento, calidad y costos
              conectados en una sola plataforma.
            </p>
            {/* Value props con check dorado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Producción y tareo digital desde el celular del capataz',
                'Cronograma CPM con ruta crítica y Last Planner System',
                'CPI, curva S y protocolos de calidad con firma digital',
              ].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(145deg, ${BASE.gold}, ${BASE.goldDark})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0F2A47', fontSize: '12px', fontWeight: 900,
                    boxShadow: `0 2px 10px ${BASE.gold}66`,
                  }}>✓</span>
                  <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confianza abajo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '1.6px' }}>CONFÍAN EN GRAPCO</span>
            {['CREDITEX SAA', 'TEXTIL S.A.A'].map(c => (
              <span key={c} style={{
                padding: '5px 14px', borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                fontSize: '10.5px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.8px',
              }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* ══ PANEL DERECHO — acceso (vidrio oscuro con filo dorado) ══ */}
      <div style={{
        position: 'relative', zIndex: 5,
        width: esEscritorio ? '480px' : '100%',
        flexShrink: 0,
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '28px 20px',
        background: esEscritorio ? 'rgba(8,18,34,0.45)' : 'transparent',
        backdropFilter: esEscritorio ? 'blur(16px)' : undefined,
        WebkitBackdropFilter: esEscritorio ? 'blur(16px)' : undefined,
        borderLeft: esEscritorio ? `1px solid ${BASE.gold}35` : 'none',
        overflowY: 'auto',
      }}>

      <div style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '0 0 28px 0',
        width: '100%', maxWidth: '410px',
        textAlign: 'center',
        boxShadow: `0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.30), 0 0 60px rgba(245,158,11,0.12)`,
        position: 'relative', zIndex: 5,
        animation: 'grapco-card-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}>

        {/* Header con identidad GRAPCO (navy + acento dorado) */}
        <div style={{
          background: `linear-gradient(135deg, ${BASE.navy} 0%, ${BASE.navyDark || '#0f1a2e'} 100%)`,
          padding: '28px 32px 22px',
          position: 'relative',
          borderBottom: `3px solid ${BASE.gold}`,
        }}>
          {/* Linea de acento dorada en la parte superior */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: `linear-gradient(90deg, transparent 0%, ${BASE.gold} 50%, transparent 100%)`,
          }} />

          {/* Logo en cuadro blanco con halo dorado */}
          <div style={{
            width: '74px', height: '74px',
            margin: '0 auto 12px',
            borderRadius: '16px',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 20px rgba(0,0,0,0.35), 0 0 0 2px ${BASE.gold}`,
            padding: '6px',
          }}>
            <img
              src={LOGO}
              alt="GRAPCO"
              onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{
            fontSize: '24px', fontWeight: '900',
            color: '#fff', marginBottom: '4px',
            letterSpacing: '2px',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            GRAPCO <span style={{ color: BASE.gold }}>S.A.C.</span>
          </h1>
          <p style={{
            fontSize: '10px', color: BASE.gold,
            fontWeight: '800', letterSpacing: '2.4px',
          }}>
            GESTIÓN DE PROYECTOS VDC
          </p>
        </div>

        {/* Cuerpo del card */}
        <div style={{ padding: '24px 32px 0' }}>

        {/* RECOMENDACIÓN: instalar como app de escritorio */}
        {!pwaInstalada && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flexShrink: 0,
              boxShadow: '0 3px 8px rgba(245,158,11,0.35)',
            }}>📲</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: '900', color: '#92400e', marginBottom: '2px', letterSpacing: '0.3px' }}>
                Instala GRAPCO como aplicación
              </p>
              <p style={{ fontSize: '10px', color: '#78350f', lineHeight: 1.3 }}>
                Acceso directo desde tu escritorio · más rápido · funciona offline
              </p>
            </div>
            <button
              type="button"
              onClick={instalarApp}
              className="btn-feedback"
              style={{
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '900',
                letterSpacing: '0.4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 3px 8px rgba(245,158,11,0.4)',
                flexShrink: 0,
              }}
            >
              {pwaPrompt ? '⬇ INSTALAR' : 'CÓMO ↗'}
            </button>
          </div>
        )}

        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '20px', fontWeight: '700', letterSpacing: '2px' }}>
          {view === 'login' ? '— INICIA SESIÓN —' : '— CREAR CUENTA —'}
        </p>

        {/* ── BOOTSTRAP DEL PRIMER ADMIN (solo aparece al primer despliegue) ── */}
        {bootstrapDisponible && !bootstrapOpen && (
          <button
            type="button"
            onClick={() => setBootstrapOpen(true)}
            style={{
              width: '100%', padding: '14px', marginBottom: '14px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontWeight: '900', fontSize: '13px', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(245,158,11,0.45)',
              letterSpacing: '0.4px',
            }}
          >
            🚀 CONFIGURAR PRIMER ADMINISTRADOR
            <p style={{ fontSize: '10px', fontWeight: '600', opacity: 0.9, marginTop: '3px' }}>
              Esta opcion desaparece despues del primer admin
            </p>
          </button>
        )}

        {bootstrapDisponible && bootstrapOpen && (
          <div style={{
            background: '#fffbeb', border: '2px solid #f59e0b',
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: '#92400e', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ⚙️ CONFIGURAR PRIMER ADMINISTRADOR
            </p>
            <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '12px' }}>
              Crea el unico administrador inicial. Despues podras crear mas usuarios desde el panel.
            </p>
            <form onSubmit={handleBootstrap} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="email" placeholder="tu@empresa.com" required
                value={bootstrapForm.email}
                onChange={e => setBootstrapForm({...bootstrapForm, email: e.target.value})}
                style={inp({ padding: '12px' })} />
              <input type="text" placeholder="Tu nombre completo (opcional)"
                value={bootstrapForm.nombre}
                onChange={e => setBootstrapForm({...bootstrapForm, nombre: e.target.value})}
                style={inp({ padding: '12px' })} />
              <div style={{ position: 'relative' }}>
                <input type={verPassword ? 'text' : 'password'} placeholder="Contraseña (mín 8 caracteres)" required minLength={8}
                  value={bootstrapForm.password}
                  onChange={e => setBootstrapForm({...bootstrapForm, password: e.target.value})}
                  style={inp({ padding: '12px', paddingRight: '40px', width: '100%', boxSizing: 'border-box' })} />
                <button type="button" onClick={() => setVerPassword(v => !v)}
                  title={verPassword ? 'Ocultar' : 'Mostrar'}
                  style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', padding:'4px', display:'inline-flex' }}>
                  <IconoOjo abierto={verPassword} />
                </button>
              </div>
              {bootstrapError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: '8px', padding: '8px 10px',
                  color: '#dc2626', fontSize: '11px', fontWeight: '700',
                }}>{bootstrapError}</div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setBootstrapOpen(false)}
                  style={{ flex: 1, padding: '12px', background: BASE.bgSoft, color: BASE.muted,
                    border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={bootstrapBusy}
                  style={{ flex: 2, padding: '12px',
                    background: bootstrapBusy ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontWeight: '900', fontSize: '12px', cursor: bootstrapBusy ? 'wait' : 'pointer',
                    letterSpacing: '0.4px',
                  }}>
                  {bootstrapBusy ? '⏳ Creando...' : '🛡️ CREAR ADMIN Y ENTRAR'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulario normal */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="email" placeholder="Correo electrónico"
            autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={inp({ padding: '14px' })} required
          />
          <div style={{ position: 'relative' }}>
            <input
              type={verPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              autoComplete={view === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp({ padding: '14px', paddingRight: '46px', width: '100%', boxSizing: 'border-box' })}
              required
            />
            <button
              type="button"
              onClick={() => setVerPassword(v => !v)}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '6px',
                borderRadius: '6px',
                color: BASE.muted,
                lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = BASE.bgSoft; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <IconoOjo abierto={verPassword} />
            </button>
          </div>

          {view === 'register' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: BASE.muted, display: 'block', marginBottom: '6px' }}>
                ROL
              </label>
              <select value={rolRegistro} onChange={e => setRolRegistro(e.target.value)}
                style={inp({ padding: '12px', fontWeight: '600' })}>
                <option value="capataz">Capataz</option>
                <option value="carta_balance">Carta Balance</option>
              </select>
              <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '6px' }}>
                El rol de Ingeniero es asignado por el administrador.
              </p>
            </div>
          )}

          {bloqueadoHasta > Date.now() && (
            <div style={{
              background: '#fef3c7', border: '2px solid #f59e0b',
              borderRadius: '10px', padding: '12px 14px',
              color: '#92400e', fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '20px' }}>🔒</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '900', marginBottom: '2px' }}>Demasiados intentos fallidos</p>
                <p style={{ fontSize: '11px', fontWeight: '600' }}>
                  Espera {tiempoRestante} s, o pulsa "¿Olvidaste tu contraseña?" para recuperarla por email.
                </p>
              </div>
            </div>
          )}

          {error && bloqueadoHasta <= Date.now() && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '8px', padding: '10px',
              color: '#dc2626', fontSize: '12px', fontWeight: '600',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || bloqueadoHasta > Date.now()}
            onMouseEnter={e => { if (!(loading || loginExitoso || bloqueadoHasta > Date.now())) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 30px -10px rgba(15,42,71,0.7), 0 0 0 1.5px ${BASE.gold}55`; } }}
            onMouseLeave={e => { if (!loginExitoso) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 10px 24px -10px rgba(15,42,71,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`; } }}
            style={{
              width: '100%', padding: '15px',
              background: loginExitoso
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : (loading || bloqueadoHasta > Date.now())
                  ? '#94a3b8'
                  : `linear-gradient(135deg, ${BASE.navy} 0%, ${BASE.navyDark || '#0f1a2e'} 100%)`,
              color: '#fff', border: 'none', borderRadius: '12px',
              fontWeight: '900', fontSize: '14px', letterSpacing: '0.6px',
              cursor: (loading || bloqueadoHasta > Date.now()) ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'all 0.2s ease',
              boxShadow: loginExitoso
                ? '0 4px 16px rgba(22,163,74,0.45)'
                : (loading || bloqueadoHasta > Date.now()) ? 'none' : `0 10px 24px -10px rgba(15,42,71,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transform: loginExitoso ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {loginExitoso ? (
              <>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: '#fff', color: '#16a34a',
                  fontSize: '15px', fontWeight: '900',
                  animation: 'grapco-check-pop 0.4s ease',
                }}>✓</span>
                <span style={{ letterSpacing: '0.5px' }}>BIENVENIDO</span>
              </>
            ) : loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '14px', height: '14px',
                  border: '2.5px solid rgba(255,255,255,0.35)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'grapco-spin 0.7s linear infinite',
                }} />
                <span>Verificando...</span>
              </>
            ) : bloqueadoHasta > Date.now() ? (
              '🔒 BLOQUEADO'
            ) : view === 'login' ? (
              <>INGRESAR <span style={{ fontSize: '16px', lineHeight: 1 }}>→</span></>
            ) : (
              'REGISTRARSE'
            )}
          </button>
          <style>{`
            @keyframes grapco-check-pop {
              0% { transform: scale(0); opacity: 0; }
              60% { transform: scale(1.25); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes grapco-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </form>

        {/* Mensaje de email de recuperación enviado */}
        {resetExito && (
          <div style={{
            marginTop: '12px',
            background: '#dcfce7', border: '1.5px solid #16a34a',
            borderRadius: '10px', padding: '10px 12px',
            color: '#15803d', fontSize: '11.5px', fontWeight: '700',
            textAlign: 'left',
          }}>
            ✉️ {resetExito}
          </div>
        )}

        {/* Olvidé mi contraseña (solo en vista login) */}
        {view === 'login' && (
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetEnviando}
              style={{
                background: 'none', border: 'none',
                color: BASE.navy, fontSize: '11.5px', fontWeight: '700',
                cursor: resetEnviando ? 'wait' : 'pointer',
                textDecoration: 'underline',
              }}
            >
              {resetEnviando ? '⏳ Enviando...' : '🔑 ¿Olvidaste tu contraseña?'}
            </button>
          </div>
        )}

        {/* Cambiar entre login/registro */}
        <div style={{ marginTop: '14px' }}>
          {view === 'login' ? (
            <p style={{ fontSize: '12px', color: BASE.muted }}>
              ¿No tienes cuenta?{' '}
              <button
                onClick={() => { setView('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: BASE.navy, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
              >Regístrate aquí</button>
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: BASE.muted }}>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => { setView('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: BASE.navy, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
              >Inicia sesión</button>
            </p>
          )}
        </div>

        <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '20px' }}>
          © {new Date().getFullYear()} Valtana Consultoría & Construcción
        </p>
        </div>
      </div>
      </div>

      {/* === ESTILOS DEL LOGIN === */}
      <style>{`
        @keyframes grapco-card-in {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Video hero a pantalla completa */
        .grapco-hero-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          z-index: 0;
          pointer-events: none;
        }
        /* Auroras de la escena premium (derivan lento, sin lag) */
        @keyframes grapco-aur1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(46px,32px); } }
        @keyframes grapco-aur2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-40px,-28px); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="grapco-aur"] { animation: none !important; }
        }
        /* Overlay oscuro y dorado tenue para legibilidad del card */
        .grapco-hero-overlay {
          position: absolute; inset: 0; z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(circle at center, rgba(15,23,42,0.35) 0%, rgba(10,22,40,0.78) 70%, rgba(10,22,40,0.92) 100%),
            linear-gradient(180deg, rgba(245,158,11,0.05) 0%, transparent 40%);
        }

        /* Mesh gradient base — atenuado para que el video sea protagonista */
        .grapco-mesh {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          mix-blend-mode: multiply;
          opacity: 0.35;
          background:
            radial-gradient(at 20% 30%, #1e3a5f 0%, transparent 55%),
            radial-gradient(at 80% 20%, #0f1a2e 0%, transparent 50%),
            radial-gradient(at 50% 80%, #1e1b4b 0%, transparent 60%),
            radial-gradient(at 90% 90%, #5b21b6 0%, transparent 45%),
            linear-gradient(135deg, #0a1628 0%, #0f1a2e 50%, #1e1b4b 100%);
          background-size: 200% 200%;
          animation: grapco-mesh-shift 18s ease-in-out infinite;
        }
        @keyframes grapco-mesh-shift {
          0%, 100% { background-position: 0% 0%; }
          50%      { background-position: 100% 100%; }
        }

        /* Blobs de color que se mueven */
        .grapco-blob {
          position: absolute; border-radius: 50%; filter: blur(70px);
          mix-blend-mode: screen; pointer-events: none; z-index: 1;
          will-change: transform;
        }
        .grapco-blob-1 {
          width: 480px; height: 480px;
          background: radial-gradient(circle, #f59e0b 0%, transparent 70%);
          top: -120px; left: -100px; opacity: 0.28;
          animation: grapco-blob-move-1 20s ease-in-out infinite;
        }
        .grapco-blob-2 {
          width: 540px; height: 540px;
          background: radial-gradient(circle, #2563eb 0%, transparent 70%);
          top: 50%; right: -150px; opacity: 0.22;
          animation: grapco-blob-move-2 24s ease-in-out infinite;
        }
        .grapco-blob-3 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          bottom: -120px; left: 30%; opacity: 0.18;
          animation: grapco-blob-move-3 28s ease-in-out infinite;
        }
        .grapco-blob-4 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, #16a34a 0%, transparent 70%);
          top: 20%; left: 55%; opacity: 0.16;
          animation: grapco-blob-move-4 22s ease-in-out infinite;
        }
        @keyframes grapco-blob-move-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(180px, 80px) scale(1.15); }
          66%      { transform: translate(-60px, 200px) scale(0.9); }
        }
        @keyframes grapco-blob-move-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-220px, -150px) scale(1.2); }
        }
        @keyframes grapco-blob-move-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%      { transform: translate(120px, -100px) scale(1.1); }
          70%      { transform: translate(-80px, -180px) scale(0.85); }
        }
        @keyframes grapco-blob-move-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-100px, 120px) scale(1.15); }
        }

        /* Linea de "scan" que recorre la pantalla cada 8s (efecto tecnologia) */
        .grapco-scan {
          position: absolute; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.55), transparent);
          box-shadow: 0 0 28px rgba(245,158,11,0.55);
          pointer-events: none; z-index: 2;
          animation: grapco-scan-move 9s linear infinite;
        }
        @keyframes grapco-scan-move {
          0%   { top: -10px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        /* Iconos de construccion flotando */
        .grapco-floating-icons {
          position: absolute; inset: 0; pointer-events: none; z-index: 2;
        }
        .grapco-fi {
          position: absolute; font-size: 38px; opacity: 0.10;
          filter: drop-shadow(0 4px 12px rgba(245,158,11,0.3));
          animation-name: grapco-icon-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        .grapco-fi-1 { top:  8%; left: 12%; font-size: 64px; animation-duration: 11s; animation-delay: 0s; }
        .grapco-fi-2 { top: 20%; right: 18%; animation-duration:  9s; animation-delay: 1.5s; }
        .grapco-fi-3 { top: 70%; left:  8%; animation-duration: 13s; animation-delay: 0.8s; }
        .grapco-fi-4 { bottom: 14%; right: 10%; font-size: 52px; animation-duration: 10s; animation-delay: 2.2s; }
        .grapco-fi-5 { top: 38%; left:  4%; animation-duration: 14s; animation-delay: 3s; }
        .grapco-fi-6 { top: 48%; right:  6%; font-size: 56px; animation-duration: 12s; animation-delay: 1s; }
        .grapco-fi-7 { bottom: 28%; left: 18%; animation-duration: 11s; animation-delay: 2.5s; }

        @keyframes grapco-icon-float {
          0%   { transform: translate(0, 0) rotate(0deg); }
          50%  { transform: translate(15px, -25px) rotate(8deg); }
          100% { transform: translate(-10px, 18px) rotate(-6deg); }
        }

        /* Particulas doradas que suben */
        .grapco-particles {
          position: absolute; inset: 0; pointer-events: none; z-index: 2; overflow: hidden;
        }
        .grapco-particle {
          position: absolute; bottom: -8px;
          width: 4px; height: 4px; border-radius: 50%;
          background: #fbbf24;
          box-shadow: 0 0 8px rgba(251,191,36,0.7);
          opacity: 0;
          animation-name: grapco-particle-up;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        @keyframes grapco-particle-up {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 0.8; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-110vh) translateX(40px) scale(0.4); opacity: 0; }
        }

        /* Reduce motion: respetar preferencia del usuario */
        @media (prefers-reduced-motion: reduce) {
          .grapco-mesh, .grapco-blob, .grapco-scan, .grapco-fi, .grapco-particle {
            animation: none !important;
          }
        }

        /* Mobile: aliviar carga de animacion */
        @media (max-width: 640px) {
          .grapco-fi { font-size: 28px !important; }
          .grapco-fi-1 { font-size: 40px !important; }
          .grapco-fi-4, .grapco-fi-6 { font-size: 36px !important; }
          .grapco-blob { filter: blur(50px); }
          .grapco-blob-1, .grapco-blob-2, .grapco-blob-3, .grapco-blob-4 {
            width: 280px !important; height: 280px !important;
          }
        }
      `}</style>
    </div>
  );
}