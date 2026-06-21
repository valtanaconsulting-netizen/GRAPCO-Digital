// src/views/Login.jsx — v3 · layout 2 columnas (hero + tarjeta) con footer Valtana neón
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { BASE, LOGO, LOGO_FALLBACK, inp } from '../utils/styles';
import { HERO_VIDEO } from '../utils/heroVideo';
import { conexionLenta } from '../utils/connection';

const STORAGE_INTENTOS = 'grapco_login_intentos';
const MAX_INTENTOS = 5;
const COOLDOWN_MS = 30 * 1000;  // 30 segundos (antes eran 5 minutos)

// Ícono SVG ver/ocultar contraseña (reemplaza los emojis 🙈/👁️ por algo profesional).
// off=true → contraseña visible (ojo tachado = "clic para ocultar"); off=false → ojo abierto.
function IconoOjo({ off = false, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
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
  // Layout responsivo: ≥900px → dos columnas (hero + tarjeta); móvil → solo tarjeta
  const [isWide,       setIsWide]       = useState(false);
  // Video hero: fundido suave cuando puede reproducir
  const [videoReady,   setVideoReady]   = useState(false);

  // Detectar ancho para alternar entre layout de 1 o 2 columnas
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setIsWide(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
  }, []);

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

  // En móvil (1 columna) la tarjeta va más compacta para no ocupar tanto alto.
  const compact = !isWide;

  // Campo "glass": translúcido oscuro con texto claro (para el card glassmorphism).
  const inpGlass = (extra = {}) => ({
    width: '100%', boxSizing: 'border-box',
    padding: compact ? '13px 14px' : '14px 16px',
    borderRadius: '14px',
    background: 'rgba(7,15,28,0.6)',
    border: '1px solid rgba(255,255,255,0.28)',
    color: '#fff', caretColor: '#fff', fontSize: '14px', fontWeight: 600, outline: 'none',
    transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
    ...extra,
  });

  // ── Bloque reutilizable: la tarjeta de login (header + cuerpo + footer Valtana) ──
  const tarjeta = (
    <div style={{
      // Caja OSCURA densa (vidrio esmerilado) — ancla el formulario, sin dejar ver
      // el video a través del texto. Más denso que el overlay general.
      background: 'rgba(8,16,30,0.82)',
      backdropFilter: 'blur(20px) saturate(125%)',
      WebkitBackdropFilter: 'blur(20px) saturate(125%)',
      borderRadius: '20px',
      padding: '0',
      width: '100%', maxWidth: compact ? '92vw' : '410px',
      textAlign: 'center',
      // Borde 1px blanco muy fino + sombras suaves en capas = profundidad 3D real.
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 24px 60px -12px rgba(0,0,0,0.65), 0 10px 28px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14)',
      position: 'relative', zIndex: 5,
      animation: 'grapco-card-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      overflow: 'hidden',
    }}>

      {/* Header con identidad GRAPCO (navy + acento dorado) */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy} 0%, ${BASE.navyDark || '#0f1a2e'} 100%)`,
        padding: compact ? '18px 24px 14px' : '28px 32px 22px',
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
          width: compact ? '54px' : '74px', height: compact ? '54px' : '74px',
          margin: compact ? '0 auto 8px' : '0 auto 12px',
          borderRadius: '16px',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 20px rgba(0,0,0,0.35), 0 0 0 1px ${BASE.gold}`,
          padding: '2px', overflow: 'hidden',
        }}>
          <img
            src={LOGO}
            alt="GRAPCO"
            onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = LOGO_FALLBACK; } }}
            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.25)' }}
          />
        </div>

        <h1 style={{
          fontSize: compact ? '20px' : '24px', fontWeight: '900',
          color: '#fff', marginBottom: '4px',
          letterSpacing: compact ? '1.5px' : '2px',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          GRAPCO <span style={{ color: BASE.gold }}>S.A.C.</span>
        </h1>
        <p style={{
          fontSize: compact ? '9px' : '10px', color: BASE.gold,
          fontWeight: '800', letterSpacing: compact ? '2px' : '2.4px',
        }}>
          GESTIÓN DE PROYECTOS VDC
        </p>
      </div>

      {/* Cuerpo del card */}
      <div style={{ padding: compact ? '16px 22px 16px' : '24px 32px 22px' }}>

      {/* El aviso "Instala la app" se movió a un badge minimalista en la esquina
          inferior izquierda de la pantalla (ver layout), para no recargar el card. */}

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: compact ? '14px' : '20px', fontWeight: '700', letterSpacing: '2px' }}>
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
                style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', padding:'4px', color: BASE.muted, display:'flex' }}>
                <IconoOjo off={verPassword} size={16} />
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '14px' }}>
        <input
          type="email" placeholder="Correo electrónico"
          autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="login-glass-input"
          style={inpGlass()} required
        />
        <div style={{ position: 'relative' }}>
          <input
            type={verPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="login-glass-input"
            style={inpGlass({ paddingRight: '46px' })}
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
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <IconoOjo off={verPassword} size={18} />
          </button>
        </div>

        {view === 'register' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.72)', display: 'block', marginBottom: '6px', textAlign: 'left' }}>
              ROL
            </label>
            <select value={rolRegistro} onChange={e => setRolRegistro(e.target.value)}
              style={{ ...inpGlass(), background: 'rgba(18,30,50,0.92)', color: '#fff' }}>
              <option value="capataz" style={{ color: '#0f1f3a' }}>Capataz</option>
              <option value="carta_balance" style={{ color: '#0f1f3a' }}>Carta Balance</option>
            </select>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '6px', textAlign: 'left' }}>
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
          className="btn-ingresar"
          style={{
            width: '100%', padding: '15px',
            background: loginExitoso
              ? '#16a34a'
              : (loading || bloqueadoHasta > Date.now()) ? '#64748b'
              : 'linear-gradient(135deg, #f3c14e 0%, #d99a3a 45%, #b87333 100%)',
            color: '#fff', border: 'none', borderRadius: '14px',
            fontWeight: '800', fontSize: '14px', letterSpacing: '0.6px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            cursor: (loading || bloqueadoHasta > Date.now()) ? 'not-allowed' : 'pointer',
            marginTop: '6px',
            transition: 'transform 0.18s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.18s ease',
            boxShadow: loginExitoso ? '0 8px 22px rgba(22,163,74,0.5)' : '0 8px 20px rgba(216,154,58,0.4)',
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
            'INGRESAR'
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
          .login-glass-input::placeholder { color: rgba(255,255,255,0.55); }
          .login-glass-input:focus {
            border-color: rgba(243,193,78,0.85);
            background: rgba(7,15,28,0.8);
            box-shadow: 0 0 0 3px rgba(243,193,78,0.18);
          }
          /* Autofill de Chrome: forzar texto claro + fondo oscuro (si no, queda blanco/blanco) */
          .login-glass-input:-webkit-autofill,
          .login-glass-input:-webkit-autofill:hover,
          .login-glass-input:-webkit-autofill:focus {
            -webkit-text-fill-color: #fff !important;
            -webkit-box-shadow: 0 0 0 1000px rgba(7,15,28,0.95) inset !important;
            caret-color: #fff !important;
            border-radius: 14px;
          }
          .btn-ingresar:not(:disabled):hover { transform: scale(1.02); box-shadow: 0 12px 30px rgba(216,154,58,0.55); }
          .btn-ingresar:not(:disabled):active { transform: scale(0.99); }
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
              color: BASE.gold, fontSize: '11.5px', fontWeight: '700',
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
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            ¿No tienes cuenta?{' '}
            <button
              onClick={() => { setView('register'); setError(''); }}
              style={{ background: 'none', border: 'none', color: BASE.gold, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
            >Regístrate aquí</button>
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => { setView('login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: BASE.gold, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
            >Inicia sesión</button>
          </p>
        )}
      </div>

      </div>{/* === fin cuerpo del card === */}

      {/* === FOOTER VALTANA · luces neón verticales + logo translúcido === */}
      <div className="vt-foot" aria-label="Valtana Consultoría y Construcción">
        {/* Logo Valtana translúcido de fondo (sin su fondo blanco) */}
        <div
          className="vt-foot__logo"
          style={{ backgroundImage: "url('/brand/valtana-logo.png')" }}
          aria-hidden="true"
        />
        {/* Haces de luz neón que descienden, en los colores del logo */}
        <span className="vt-beam vt-beam--navy"   style={{ left: '12%' }} aria-hidden="true" />
        <span className="vt-beam vt-beam--yellow" style={{ left: '34%' }} aria-hidden="true" />
        <span className="vt-beam vt-beam--orange" style={{ left: '58%' }} aria-hidden="true" />
        <span className="vt-beam vt-beam--yellow" style={{ left: '78%' }} aria-hidden="true" />
        <span className="vt-beam vt-beam--navy"   style={{ left: '90%' }} aria-hidden="true" />
        {/* Texto con neón que cambia de color — marca Valtana destacada */}
        <p className="vt-foot__txt">
          <span className="vt-foot__copy">© {new Date().getFullYear()}</span>
          <strong className="vt-foot__brand">VALTANA</strong>
          <span className="vt-foot__sub">Consultoría &amp; Construcción</span>
        </p>

        <style>{`
          .vt-foot {
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 78px;
            padding: 20px 24px;
            background:
              radial-gradient(120% 140% at 50% -20%, rgba(248,149,29,0.14) 0%, transparent 60%),
              linear-gradient(180deg, #0b1733 0%, #11254D 55%, #0a142b 100%);
            border-top: 2px solid rgba(248,149,29,0.45);
          }
          /* Logo Valtana translúcido, respirando suavemente */
          .vt-foot__logo {
            position: absolute; inset: 0;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 150px auto;
            opacity: 0.12;
            pointer-events: none;
            animation: vt-logo-breathe 6s ease-in-out infinite;
          }
          @keyframes vt-logo-breathe {
            0%, 100% { opacity: 0.09; transform: scale(1); }
            50%      { opacity: 0.18; transform: scale(1.05); }
          }
          /* Haces de neón verticales (arriba -> abajo) */
          .vt-beam {
            position: absolute; top: -45%;
            width: 2px; height: 45%;
            border-radius: 2px;
            pointer-events: none;
            animation: vt-beam-fall 3.4s linear infinite;
          }
          .vt-beam--navy {
            background: linear-gradient(180deg, transparent, #5b8af0);
            box-shadow: 0 0 10px 2px rgba(91,138,240,0.85), 0 0 18px 4px rgba(91,138,240,0.4);
            animation-delay: 0s;
          }
          .vt-beam--yellow {
            background: linear-gradient(180deg, transparent, #F1CA16);
            box-shadow: 0 0 10px 2px rgba(241,202,22,0.9), 0 0 18px 4px rgba(241,202,22,0.45);
            animation-delay: 1.1s;
          }
          .vt-beam--orange {
            background: linear-gradient(180deg, transparent, #F8951D);
            box-shadow: 0 0 10px 2px rgba(248,149,29,0.9), 0 0 18px 4px rgba(248,149,29,0.45);
            animation-delay: 2.1s;
          }
          @keyframes vt-beam-fall {
            0%   { transform: translateY(0);    opacity: 0; }
            12%  { opacity: 1; }
            82%  { opacity: 1; }
            100% { transform: translateY(360%); opacity: 0; }
          }
          /* Texto del copyright: más grande, resaltado + neón que cambia de color */
          .vt-foot__txt {
            position: relative; z-index: 2; margin: 0;
            display: inline-flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
            justify-content: center;
            white-space: nowrap;
          }
          .vt-foot__copy {
            font-size: 12px; font-weight: 700; color: #9db4e0;
            letter-spacing: 0.4px;
          }
          /* Marca VALTANA: el elemento más prominente, neón intenso que pulsa */
          .vt-foot__brand {
            font-size: 19px; font-weight: 900;
            letter-spacing: 2.6px;
            animation: vt-text-neon 6s ease-in-out infinite;
          }
          .vt-foot__sub {
            font-size: 12.5px; font-weight: 700; color: #cdd9f2;
            letter-spacing: 0.6px;
            text-shadow: 0 0 6px rgba(91,138,240,0.4);
          }
          @keyframes vt-text-neon {
            0%, 100% { color: #eaf1ff; text-shadow: 0 0 8px rgba(91,138,240,0.9),  0 0 20px rgba(91,138,240,0.6),  0 0 34px rgba(91,138,240,0.35); }
            33%      { color: #fff3a8; text-shadow: 0 0 8px rgba(241,202,22,1),    0 0 22px rgba(241,202,22,0.65), 0 0 36px rgba(241,202,22,0.4); }
            66%      { color: #ffd29a; text-shadow: 0 0 8px rgba(248,149,29,1),    0 0 22px rgba(248,149,29,0.65), 0 0 36px rgba(248,149,29,0.4); }
          }
          @media (max-width: 640px) {
            .vt-foot__txt { gap: 6px; }
            .vt-foot__brand { font-size: 16px; letter-spacing: 1.8px; }
            .vt-foot__copy, .vt-foot__sub { font-size: 11px; }
            .vt-foot__logo { background-size: 120px auto; }
          }
          @media (prefers-reduced-motion: reduce) {
            .vt-foot__logo, .vt-beam, .vt-foot__brand { animation: none !important; }
            .vt-foot__brand { color: #ffe87a; text-shadow: 0 0 10px rgba(241,202,22,0.7); }
          }
        `}</style>
      </div>
    </div>
  );

  return (
    <div className="grapco-login-bg" style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: isWide ? 'flex-start' : 'center',
      padding: 0,
      fontFamily: BASE.font,
      position: 'relative',
      overflow: 'hidden',
      background: '#0a1628',
    }}>
      {/* === FONDO: degradado profundo + grilla técnica enmascarada === */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(125% 100% at 78% 18%, #1a3c63 0%, #0d2748 42%, #060f1f 100%)',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.55,
        backgroundImage: 'linear-gradient(rgba(229,168,47,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(229,168,47,0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(circle at 30% 45%, #000 0%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(circle at 30% 45%, #000 0%, transparent 78%)',
      }} />
      {/* Auras de color (dorado + azul) que respiran */}
      <div aria-hidden="true" style={{
        position: 'absolute', zIndex: 0, width: 600, height: 600, top: '-14%', left: '-10%',
        borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${BASE.gold}22 0%, transparent 60%)`,
        filter: 'blur(26px)', animation: 'grapco-aur1 16s ease-in-out infinite',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', zIndex: 0, width: 520, height: 520, bottom: '-16%', right: '12%',
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(30,70,116,0.40) 0%, transparent 62%)',
        filter: 'blur(28px)', animation: 'grapco-aur2 20s ease-in-out infinite',
      }} />
      {/* Brillo diagonal sutil */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `linear-gradient(115deg, transparent 40%, ${BASE.gold}0e 50%, transparent 60%)`,
      }} />
      {/* Video hero PTARI (fundido suave) — omitido en conexiones lentas / ahorro de datos */}
      {!conexionLenta() && <video
        className="grapco-hero-video"
        autoPlay muted loop playsInline preload="metadata"
        onCanPlay={(e) => { setVideoReady(true); e.currentTarget.play?.().catch(() => {}); }}
        onPlaying={() => setVideoReady(true)}
        aria-hidden="true"
        style={{ opacity: videoReady ? 0.62 : 0, transition: 'opacity 1.1s ease' }}
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>}
      {/* Overlay oscuro (degradado horizontal en desktop, radial en móvil) */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: isWide
          ? 'linear-gradient(90deg, rgba(8,16,30,0.74) 0%, rgba(8,16,30,0.34) 48%, rgba(8,16,30,0.40) 100%)'
          : 'linear-gradient(180deg, rgba(8,16,30,0.42) 0%, rgba(8,16,30,0.64) 100%)',
      }} />
      {/* Línea dorada superior */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px', zIndex: 8,
        background: `linear-gradient(90deg, transparent, ${BASE.gold}, transparent)`,
      }} />

      {/* === COLUMNA IZQUIERDA · HERO (solo en desktop ≥900px) === */}
      {isWide && (
        <div style={{
          position: 'relative', zIndex: 5, flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
          padding: '44px 60px 36px',
          animation: 'grapco-card-in 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Marca superior izquierda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px',
              boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1.5px ${BASE.gold}`,
            }}>
              <img src="/brand/valtana-logo.png" alt="Valtana Consultoría & Construcción"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '0.4px', lineHeight: 1.15 }}>
                Valtana Consultoría &amp; Construcción <span style={{ color: BASE.gold }}>S.A.C.</span>
              </p>
              <p style={{ fontSize: '9px', fontWeight: 800, color: BASE.gold, letterSpacing: '2.2px', marginTop: '3px' }}>
                GESTIÓN DE PROYECTOS VDC
              </p>
            </div>
          </div>

          {/* Titular + bullets (centrado vertical en el espacio disponible) */}
          <div style={{ maxWidth: '560px', marginTop: 'auto', marginBottom: 'auto' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '3px', marginBottom: '14px' }}>
              PLATAFORMA VDC · LEAN CONSTRUCTION
            </p>
            <h2 style={{
              fontSize: 'clamp(30px, 3.6vw, 46px)', fontWeight: 900, color: '#fff',
              lineHeight: 1.12, letterSpacing: '-0.5px', marginBottom: '16px',
              textShadow: '0 2px 24px rgba(0,0,0,0.45)',
            }}>
              La obra bajo control,<br />en <span style={{ color: BASE.gold }}>tiempo real</span>.
            </h2>
            <p style={{
              fontSize: '14.5px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.65,
              marginBottom: '26px', maxWidth: '470px',
            }}>
              Centraliza la gestión integral del proyecto VDC a tu medida, conectando personas, procesos e información para maximizar la eficiencia operativa y el control del negocio.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Registro de ingreso por reconocimiento facial.',
                'Tareo digital e ISP en tiempo real.',
                'Control de Costos, RO y valorizaciones.',
                'Administración y Almacén conectados a la operación.',
                'Calidad y trazabilidad digital.',
              ].map((t) => (
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
        </div>
      )}

      {/* === COLUMNA DERECHA · tarjeta con AURA NEÓN VALTANA de fondo === */}
      <div style={{
        position: 'relative', zIndex: 5,
        width: isWide ? '480px' : '100%', flexShrink: 0,
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: compact ? '18px 16px' : '28px 28px',
        // Zona derecha: cobertura oscura densa que separa el panel del video (escritorio).
        background: isWide ? 'rgba(7,14,26,0.62)' : 'transparent',
        backdropFilter: isWide ? 'blur(6px)' : undefined,
        WebkitBackdropFilter: isWide ? 'blur(6px)' : undefined,
        borderLeft: isWide ? '1px solid rgba(255,255,255,0.08)' : 'none',
        overflowY: 'auto',
      }}>
        {/* Luces neón de fondo en los colores del logo Valtana (navy · amarillo · naranja) */}
        <div className="vt-neon-aura" aria-hidden="true">
          <span className="vt-aura vt-aura--navy" />
          <span className="vt-aura vt-aura--yellow" />
          <span className="vt-aura vt-aura--orange" />
          <span className="vt-aura-ring" />
        </div>

        {tarjeta}
      </div>

      {/* === BADGE "Instalar app" — esquina inferior izquierda, minimalista (glass) === */}
      {!pwaInstalada && (
        <button
          type="button"
          onClick={instalarApp}
          className="btn-feedback"
          title="Instalar GRAPCO como aplicación"
          style={{
            position: 'fixed', left: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 9,
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '9px 16px 9px 10px', borderRadius: '999px',
            background: 'rgba(12,22,40,0.55)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer',
            boxShadow: '0 10px 28px -10px rgba(0,0,0,0.7)',
          }}
        >
          <span style={{
            width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0,
            background: 'linear-gradient(135deg, #f3c14e, #b87333)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: '#0f1f3a', fontWeight: 900,
          }}>↓</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.2px' }}>Instalar app</span>
            <span style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>Acceso directo · offline</span>
          </span>
        </button>
      )}

      {/* === ESTILOS GLOBALES DEL LOGIN === */}
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

        @keyframes grapco-aur1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(46px,32px); } }
        @keyframes grapco-aur2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-40px,-28px); } }

        /* Foco DORADO en los inputs del login (scopeado: no afecta otros forms) */
        .grapco-login-bg input,
        .grapco-login-bg select {
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .grapco-login-bg input:focus,
        .grapco-login-bg select:focus {
          border-color: ${BASE.gold} !important;
          box-shadow: 0 0 0 3px rgba(229,168,47,0.20) !important;
          background: #ffffff !important;
        }
        .grapco-login-bg input::placeholder { color: #9aa7b8; }

        /* === Aura neón Valtana: orbes de luz que laten detrás del card (navy/amarillo/naranja) === */
        .vt-neon-aura {
          position: absolute; inset: 0; z-index: 3;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; overflow: hidden;
        }
        .vt-aura {
          position: absolute;
          border-radius: 50%;
          filter: blur(64px);
          mix-blend-mode: screen;
          opacity: 0.55;
          will-change: transform, opacity;
        }
        /* Navy del logo */
        .vt-aura--navy {
          width: 460px; height: 460px;
          background: radial-gradient(circle, #11254D 0%, #1d4ed8 35%, transparent 70%);
          transform: translate(-150px, -120px);
          animation: vt-aura-navy 14s ease-in-out infinite;
        }
        /* Amarillo del logo */
        .vt-aura--yellow {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #F1CA16 0%, transparent 68%);
          transform: translate(170px, -90px);
          animation: vt-aura-yellow 12s ease-in-out infinite;
          opacity: 0.45;
        }
        /* Naranja del logo */
        .vt-aura--orange {
          width: 440px; height: 440px;
          background: radial-gradient(circle, #F8951D 0%, transparent 68%);
          transform: translate(120px, 160px);
          animation: vt-aura-orange 16s ease-in-out infinite;
          opacity: 0.5;
        }
        /* Anillo neón tenue que encuadra la tarjeta */
        .vt-aura-ring {
          position: absolute;
          width: 440px; height: 560px;
          max-width: 90%;
          border-radius: 28px;
          box-shadow:
            0 0 60px 8px rgba(248,149,29,0.30),
            0 0 120px 24px rgba(29,78,216,0.22),
            inset 0 0 60px rgba(241,202,22,0.10);
          animation: vt-ring-pulse 5s ease-in-out infinite;
        }
        @keyframes vt-aura-navy {
          0%, 100% { transform: translate(-150px, -120px) scale(1);   opacity: 0.50; }
          50%      { transform: translate(-90px, -60px)  scale(1.15); opacity: 0.65; }
        }
        @keyframes vt-aura-yellow {
          0%, 100% { transform: translate(170px, -90px) scale(1);    opacity: 0.40; }
          50%      { transform: translate(110px, -30px) scale(1.18); opacity: 0.58; }
        }
        @keyframes vt-aura-orange {
          0%, 100% { transform: translate(120px, 160px) scale(1);    opacity: 0.45; }
          50%      { transform: translate(60px, 90px)   scale(1.16); opacity: 0.62; }
        }
        @keyframes vt-ring-pulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }

        @media (max-width: 900px) {
          .vt-aura { filter: blur(48px); }
          .vt-aura--navy, .vt-aura--yellow, .vt-aura--orange {
            width: 300px !important; height: 300px !important;
          }
          .vt-aura-ring { width: 88%; height: 460px; }
        }

        @media (prefers-reduced-motion: reduce) {
          [style*="grapco-aur"], .vt-aura, .vt-aura-ring {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
