// SIGMA · src/App.jsx — Shell de la plataforma independiente de Seguridad, Salud y
// Medio Ambiente (SSOMA). Provee identidad + obra activa + toasts y monta el panel SSOMA.
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { BASE } from './utils/styles';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProyectoActivoProvider, useProyectoActivo } from './contexts/ProyectoActivoContext';
import SeguridadPanel from './views/seguridad/SeguridadPanel';

const SIGMA_RED = '#C0392B', SIGMA_AMBER = '#E67E22', SIGMA_GREEN = '#1E8449';

// ── Toasts ──
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, tipo = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts(t => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  const Toasts = () => (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.tipo === 'error' ? '#fdecea' : t.tipo === 'success' ? '#eafaf1' : t.tipo === 'warning' ? '#fef9e7' : '#eef3f9',
          color: t.tipo === 'error' ? '#922b21' : t.tipo === 'success' ? '#1e8449' : t.tipo === 'warning' ? '#9a7d0a' : BASE.navy,
          border: `1px solid ${t.tipo === 'error' ? '#f5b7b1' : t.tipo === 'success' ? '#abebc6' : t.tipo === 'warning' ? '#f9e79f' : '#cdd7e6'}`,
          padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.14)', maxWidth: 360,
        }}>{t.msg}</div>
      ))}
    </div>
  );
  return { showToast, Toasts };
}

// ── Login REAL (Firebase Auth · mismas cuentas del ecosistema GRAPCO) ──
const SIGMA_BULLETS = [
  'Inspecciones de seguridad en campo, con evidencia fotográfica.',
  'ATS — Análisis de Trabajo Seguro y galería de registros.',
  'Reporte de incidentes e incidencias por el capataz.',
  'Dashboard e historial SSOMA del proyecto activo.',
  'Acceso con las MISMAS cuentas que GRAPCO, Planeamiento y Calidad.',
];
function LoginGate() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');

  const entrar = async (e) => {
    e?.preventDefault?.();
    setError(''); setAviso('');
    if (!email.trim() || !password) { setError('Completa correo y contraseña.'); return; }
    setBusy(true);
    try { await login(email, password); }
    catch (err) { setError(err?.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : (err?.message || 'No se pudo iniciar sesión.')); setBusy(false); }
  };
  const recuperar = async () => {
    if (!email.trim()) { setError('Escribe tu correo arriba para recuperar la contraseña.'); return; }
    try { await resetPassword(email); setAviso(`Si la cuenta existe, te enviamos un enlace a ${email.trim()}.`); setError(''); }
    catch { setAviso(`Si la cuenta existe, te enviamos un enlace a ${email.trim()}.`); }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: `radial-gradient(120% 90% at 50% 20%, #2c1a16 0%, #1a1410 60%, #0e0b09 100%)`, fontFamily: BASE.font }}>
      <div style={{ width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, padding: 24, flexWrap: 'wrap' }}>
        {/* Panel descripción de la plataforma */}
        <div style={{ flex: '1 1 360px', maxWidth: 520, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 40 }}>🦺</span>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 2 }}>SIGMA</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: '#f0b27a' }}>SEGURIDAD · SALUD · MEDIO AMBIENTE</div>
            </div>
          </div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 12 }}>
            La seguridad de la obra, <span style={{ color: SIGMA_AMBER }}>documentada</span>.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.82)', lineHeight: 1.6, marginBottom: 18 }}>
            Plataforma SSOMA del ecosistema GRAPCO: inspecciones, ATS, incidentes e indicadores de
            seguridad, todo con trazabilidad y con las mismas cuentas del resto de plataformas.
          </p>
          {SIGMA_BULLETS.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: SIGMA_GREEN, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.92)', fontWeight: 600 }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Tarjeta de login */}
        <form onSubmit={entrar} style={{ flex: '0 1 380px', width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, padding: '30px 28px', boxShadow: '0 30px 80px rgba(0,0,0,.5)', borderTop: `5px solid ${SIGMA_RED}` }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: BASE.muted, textAlign: 'center', marginBottom: 16 }}>— INICIA SESIÓN —</p>
          <label style={lbl}>Correo electrónico</label>
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" style={inp} />
          <label style={lbl}>Contraseña</label>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp} />
          {error && <div style={{ marginTop: 12, background: '#fdecea', color: '#922b21', border: '1px solid #f5b7b1', borderRadius: 8, padding: '9px 11px', fontSize: 12, fontWeight: 700 }}>{error}</div>}
          {aviso && <div style={{ marginTop: 12, background: '#eafaf1', color: '#1e8449', border: '1px solid #abebc6', borderRadius: 8, padding: '9px 11px', fontSize: 12, fontWeight: 700 }}>{aviso}</div>}
          <button type="submit" disabled={busy}
            style={{ width: '100%', marginTop: 16, padding: '13px', background: busy ? '#94a3b8' : SIGMA_RED, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', letterSpacing: .5 }}>
            {busy ? 'Verificando…' : 'Entrar a SIGMA →'}
          </button>
          <button type="button" onClick={recuperar} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: SIGMA_RED, fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>¿Olvidaste tu contraseña?</button>
        </form>
      </div>
    </div>
  );
}
const lbl = { fontSize: 10.5, fontWeight: 800, color: '#64748b', letterSpacing: .5, display: 'block', margin: '10px 0 5px' };
const inp = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #cdd7e6', fontSize: 14, fontWeight: 600 };

// ── Cabecera ──
function Header() {
  const { user, salir } = useAuth();
  const { proyectos, proyectoActivoId, setProyectoActivoId, proyectoActivo } = useProyectoActivo();
  return (
    <header style={{ background: `linear-gradient(120deg, ${SIGMA_RED} 0%, #97271b 60%, #5e1812 100%)`, color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', boxShadow: '0 6px 20px rgba(0,0,0,.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 26 }}>🦺</span>
        <div>
          <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: 1.5 }}>SIGMA</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, opacity: .85 }}>SEGURIDAD · SALUD · MEDIO AMBIENTE</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: .5, opacity: .85 }}>OBRA</label>
        <select value={proyectoActivoId} onChange={e => setProyectoActivoId(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700, color: BASE.navy, maxWidth: 260 }}>
          {proyectos.length === 0 && <option value={proyectoActivoId}>Obra general (SIGMA)</option>}
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre || p.id}</option>)}
        </select>
        <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,.16)', padding: '5px 12px', borderRadius: 999 }}>
          {user?.nombre || 'Operador'}
        </span>
        <button onClick={salir} title="Cambiar identidad" style={{ background: 'rgba(0,0,0,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Salir</button>
      </div>
    </header>
  );
}

function Shell() {
  const { user } = useAuth();
  const { showToast, Toasts } = useToasts();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 760);
  useEffect(() => { const f = () => setIsMobile(window.innerWidth < 760); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const [, force] = useState(0);
  if (!user) return <IdentidadGate onListo={() => force(x => x + 1)} />;
  return (
    <div style={{ minHeight: '100dvh', background: '#f4f7fb', fontFamily: BASE.font }}>
      <Header />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 18px 60px' }}>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando módulo SSOMA…</div>}>
          <SeguridadPanel showToast={showToast} isMobile={isMobile} />
        </Suspense>
      </main>
      <footer style={{ textAlign: 'center', padding: '14px', color: BASE.muted, fontSize: 11 }}>
        SIGMA · Plataforma de Seguridad, Salud y Medio Ambiente · independiente © 2026
      </footer>
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProyectoActivoProvider>
        <Shell />
      </ProyectoActivoProvider>
    </AuthProvider>
  );
}
