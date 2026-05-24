// src/components/UserProfileMenu.jsx
// Menú de perfil tipo Gmail/Notion en el navbar.
// Click en avatar → dropdown con: foto, nombre completo, email, rol, cambiar contraseña, salir.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { BASE, RADIUS } from '../utils/styles';
import Icon from './Icon';

const initialsOf = (s) => (s || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';

const ROL_LABEL = {
  admin: 'Administrador',
  ingeniero: 'Ingeniero de Producción',
  capataz: 'Capataz',
  calidad: 'Calidad',
  oficina_tecnica: 'Oficina Técnica',
  seguridad: 'SOMMA',
  almacenero: 'Almacenero',
  logistica: 'Logística',
  planeamiento: 'Planeamiento',
  supervisor_cliente: 'Supervisor de Cliente',
  carta_balance: 'Carta Balance',
};

export default function UserProfileMenu({ rol, onSalir }) {
  const { user, rolPermitido } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [perfil, setPerfil] = useState({ nombre: '', photoURL: '' });
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreInput, setNombreInput] = useState('');
  const [pwdSection, setPwdSection] = useState(false);
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdActual, setPwdActual] = useState('');
  const [verPwd, setVerPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {tipo:'ok'|'err', texto}
  const ref = useRef(null);
  const fileRef = useRef(null);

  // Cargar nombre + photoURL del doc /Usuarios
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'Usuarios', user.uid));
        const data = snap.exists() ? snap.data() : {};
        setPerfil({
          nombre:   data.nombre   || user.displayName || (user.email||'').split('@')[0],
          photoURL: data.photoURL || user.photoURL || '',
        });
        setNombreInput(data.nombre || user.displayName || '');
      } catch (e) {
        console.warn('[Profile] carga falló:', e.message);
      }
    })();
  }, [user?.uid]);

  // Cerrar al ESC (el click afuera lo maneja el backdrop onClick del modal)
  useEffect(() => {
    if (!abierto) return;
    const k = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', k);
    // Bloquear scroll del body cuando el modal está abierto
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [abierto]);

  const flash = (tipo, texto, ms = 3500) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), ms);
  };

  const guardarNombre = async () => {
    const nuevo = nombreInput.trim();
    if (!nuevo) return flash('err', 'El nombre no puede estar vacío');
    setBusy(true);
    try {
      await setDoc(doc(db, 'Usuarios', user.uid), { nombre: nuevo, actualizadoEn: serverTimestamp() }, { merge: true });
      try { await updateProfile(auth.currentUser, { displayName: nuevo }); } catch (_) {}
      setPerfil(p => ({ ...p, nombre: nuevo }));
      setEditandoNombre(false);
      flash('ok', 'Nombre actualizado');
    } catch (e) {
      flash('err', 'No se pudo guardar: ' + e.message);
    } finally { setBusy(false); }
  };

  const cambiarFoto = async (file) => {
    if (!file || !file.type.startsWith('image/')) return flash('err', 'Solo imágenes');
    if (file.size > 5 * 1024 * 1024) return flash('err', 'Máximo 5MB');
    setBusy(true);
    try {
      const path = `Avatars/${user.uid}.jpg`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      await setDoc(doc(db, 'Usuarios', user.uid), { photoURL: url, actualizadoEn: serverTimestamp() }, { merge: true });
      try { await updateProfile(auth.currentUser, { photoURL: url }); } catch (_) {}
      setPerfil(p => ({ ...p, photoURL: url }));
      flash('ok', 'Foto actualizada');
    } catch (e) {
      flash('err', 'Error al subir foto: ' + e.message);
    } finally { setBusy(false); }
  };

  const cambiarPassword = async () => {
    if (pwd1.length < 8) return flash('err', 'Mínimo 8 caracteres');
    if (pwd1 !== pwd2)  return flash('err', 'Las contraseñas no coinciden');
    if (!pwdActual)     return flash('err', 'Ingresa tu contraseña actual');
    setBusy(true);
    try {
      // Re-autenticación requerida por Firebase para cambio sensible
      const cred = EmailAuthProvider.credential(user.email, pwdActual);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwd1);
      setPwd1(''); setPwd2(''); setPwdActual('');
      setPwdSection(false);
      flash('ok', 'Contraseña cambiada con éxito');
    } catch (e) {
      const txt = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Contraseña actual incorrecta'
        : 'Error: ' + (e.message || e.code);
      flash('err', txt);
    } finally { setBusy(false); }
  };

  const cargoLabel = ROL_LABEL[rol] || rol || 'Sin rol activo';
  const cargoLabelMax = ROL_LABEL[rolPermitido] || rolPermitido || '—';

  // ── Render ──
  return (
    <>
      {/* TRIGGER: avatar + nombre corto */}
      <button
        ref={ref}
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Mi perfil"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
          height: '30px', padding: '0 10px 0 3px', boxSizing: 'border-box',
          background: abierto ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${abierto ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
        <Avatar nombre={perfil.nombre} url={perfil.photoURL} size={24} />
        <span style={{ fontSize: '11.5px', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {perfil.nombre || (user?.email || '').split('@')[0]}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', opacity: 0.7 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* MODAL FULL-SCREEN renderizado vía Portal (fuera del navbar) */}
      {abierto && createPortal(
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '60px 16px 24px',
            overflowY: 'auto',
            animation: 'grapco-fade-in 0.18s ease-out',
          }}>
          <div role="dialog" aria-labelledby="profile-title" onClick={e => e.stopPropagation()}
            style={{
              width: '460px', maxWidth: '100%',
              background: BASE.white,
              color: BASE.text,
              borderRadius: '16px',
              boxShadow: '0 32px 64px -16px rgba(15,23,42,0.45), 0 12px 24px -8px rgba(15,23,42,0.20)',
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
              animation: 'grapco-pop-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
          {/* HEADER con foto */}
          <div style={{
            background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
            padding: '22px 20px',
            color: '#fff',
            position: 'relative',
          }}>
            {/* Botón cerrar (X) */}
            <button onClick={() => setAbierto(false)} title="Cerrar"
              style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '28px', height: '28px',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p id="profile-title" style={{ fontSize: '10px', fontWeight: '700', color: BASE.gold, letterSpacing: '1.4px', marginBottom: '14px' }}>MI PERFIL</p>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Avatar nombre={perfil.nombre} url={perfil.photoURL} size={64} />
                <button onClick={() => fileRef.current?.click()} title="Cambiar foto" disabled={busy}
                  style={{
                    position: 'absolute', bottom: '-2px', right: '-2px',
                    width: '24px', height: '24px',
                    borderRadius: '50%',
                    background: BASE.gold,
                    border: '2px solid #fff',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: BASE.navy,
                  }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => cambiarFoto(e.target.files?.[0])} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editandoNombre ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input value={nombreInput} onChange={e => setNombreInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && guardarNombre()}
                      autoFocus
                      style={{
                        flex: 1, padding: '4px 8px', fontSize: '13px', fontWeight: '700',
                        border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px',
                        background: 'rgba(255,255,255,0.10)', color: '#fff', outline: 'none',
                      }}/>
                    <button onClick={guardarNombre} disabled={busy}
                      style={{ padding: '4px 10px', background: BASE.gold, color: BASE.navy, border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>OK</button>
                    <button onClick={() => { setEditandoNombre(false); setNombreInput(perfil.nombre); }}
                      style={{ padding: '4px 8px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.2px', lineHeight: 1.2, color: '#fff' }}>{perfil.nombre || '—'}</p>
                    <button onClick={() => setEditandoNombre(true)} title="Editar nombre"
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '2px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </button>
                  </div>
                )}
                <p style={{ fontSize: '11.5px', opacity: 0.78, marginTop: '3px', wordBreak: 'break-all' }}>{user?.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* DATOS */}
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DatoFila label="Cargo activo" value={cargoLabel} highlight />
            {rolPermitido && rolPermitido !== rol && (
              <DatoFila label="Rol asignado en /Usuarios" value={cargoLabelMax} />
            )}
            <DatoFila label="UID" value={user?.uid ? user.uid.slice(0, 12) + '…' : '—'} mono />
            <DatoFila label="Cuenta" value={user?.emailVerified ? '✓ Verificada' : 'Sin verificar'} />
          </div>

          {/* CAMBIAR PASSWORD */}
          <div style={{ borderTop: `1px solid ${BASE.border}` }}>
            <button onClick={() => setPwdSection(!pwdSection)}
              style={{
                width: '100%', padding: '12px 18px', background: 'transparent', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '12px', fontWeight: '700', color: BASE.text, cursor: 'pointer',
                fontFamily: BASE.font,
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Cambiar contraseña
              </span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: pwdSection ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {pwdSection && (
              <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <PwdInput placeholder="Contraseña actual" value={pwdActual} onChange={setPwdActual} ver={verPwd} setVer={setVerPwd} />
                <PwdInput placeholder="Nueva contraseña (mín 8)" value={pwd1} onChange={setPwd1} ver={verPwd} setVer={setVerPwd} />
                <PwdInput placeholder="Repetir nueva contraseña" value={pwd2} onChange={setPwd2} ver={verPwd} setVer={setVerPwd} />
                <button onClick={cambiarPassword} disabled={busy}
                  style={{
                    padding: '8px 14px',
                    background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
                    color: '#fff', border: 'none', borderRadius: '7px',
                    fontSize: '11.5px', fontWeight: '700', cursor: busy ? 'wait' : 'pointer',
                    fontFamily: BASE.font, marginTop: '4px',
                  }}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
              </div>
            )}
          </div>

          {/* MENSAJE OK/ERROR */}
          {msg && (
            <div style={{
              padding: '8px 18px', fontSize: '11.5px', fontWeight: '700',
              background: msg.tipo === 'ok' ? BASE.greenLight : BASE.redLight,
              color:      msg.tipo === 'ok' ? BASE.greenDark : BASE.redDark,
              borderTop: `1px solid ${BASE.border}`,
            }}>{msg.tipo === 'ok' ? '✓ ' : '⚠ '}{msg.texto}</div>
          )}

          {/* SALIR */}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${BASE.border}`, background: BASE.bgSoft }}>
            <button onClick={() => { setAbierto(false); onSalir?.(); }}
              style={{
                width: '100%', padding: '9px 14px',
                background: 'transparent',
                color: BASE.red,
                border: `1px solid ${BASE.red}55`,
                borderRadius: '8px',
                fontSize: '11.5px', fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontFamily: BASE.font,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = BASE.red; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.red; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Sub-componentes ──

function Avatar({ nombre, url, size = 32 }) {
  if (url) {
    return <img src={url} alt={nombre} style={{
      width: size, height: size, borderRadius: '50%', objectFit: 'cover',
      border: '2px solid rgba(255,255,255,0.30)', flexShrink: 0,
    }}/>;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
      color: BASE.navy,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: '800', letterSpacing: '0.5px',
      border: '2px solid rgba(255,255,255,0.30)', flexShrink: 0,
    }}>{initialsOf(nombre)}</div>
  );
}

function DatoFila({ label, value, highlight, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>{label}</span>
      <span style={{
        fontSize: '12px',
        fontWeight: highlight ? '800' : '600',
        color: highlight ? BASE.navy : BASE.text,
        fontFamily: mono ? '"IBM Plex Mono", monospace' : 'inherit',
        textAlign: 'right',
      }}>{value}</span>
    </div>
  );
}

function PwdInput({ placeholder, value, onChange, ver, setVer }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={ver ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 36px 8px 10px',
          fontSize: '12px', fontFamily: BASE.font,
          border: `1px solid ${BASE.border}`, borderRadius: '7px',
          background: BASE.bgSoft, color: BASE.text, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <button type="button" onClick={() => setVer(!ver)} title={ver ? 'Ocultar' : 'Mostrar'}
        style={{
          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px',
          color: BASE.muted,
        }}>{ver ? '🙈' : '👁️'}</button>
    </div>
  );
}
