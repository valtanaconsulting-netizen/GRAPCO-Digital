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

// ── Puerta de identidad ligera ──
function IdentidadGate({ onListo }) {
  const { identificarse } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(120% 90% at 50% 20%, #2c1a16 0%, #1a1410 60%, #0e0b09 100%)`, fontFamily: BASE.font, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '34px 30px', width: 'min(420px,100%)', boxShadow: '0 30px 80px rgba(0,0,0,.5)', borderTop: `5px solid ${SIGMA_RED}` }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 40 }}>🦺</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: BASE.navy, letterSpacing: 1 }}>SIGMA</h1>
          <p style={{ fontSize: 12, color: BASE.muted, fontWeight: 700, letterSpacing: 1 }}>SEGURIDAD · SALUD · MEDIO AMBIENTE</p>
        </div>
        <label style={lbl}>Tu nombre *</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" style={inp} />
        <label style={lbl}>Correo (opcional)</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@empresa.com" style={inp} />
        <button onClick={() => { if (!nombre.trim()) return; identificarse({ nombre: nombre.trim(), email: email.trim() }); onListo?.(); }}
          style={{ width: '100%', marginTop: 16, padding: '12px', background: SIGMA_RED, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Entrar a SIGMA →
        </button>
        <p style={{ fontSize: 10.5, color: BASE.muted, textAlign: 'center', marginTop: 12 }}>Plataforma independiente de SSOMA. Para login corporativo real, cablear Firebase Auth.</p>
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
