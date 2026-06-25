// src/components/OfflineBanner.jsx
// Indicador de conexión para contexto de obra ("cerro sin señal"). Avisa cuando
// no hay internet (la app sigue 100% usable: Firestore lee del cache y encola
// escrituras) y CONFIRMA la sincronización real al volver — waitForPendingWrites
// resuelve solo cuando todas las escrituras pendientes llegaron al servidor.
import React, { useEffect, useState } from 'react';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';

export default function OfflineBanner() {
  // mode: 'offline' | 'sync' | 'ok' | null
  const [mode, setMode] = useState(
    (typeof navigator !== 'undefined' && !navigator.onLine) ? 'offline' : null
  );

  useEffect(() => {
    let t;
    const goOffline = () => { clearTimeout(t); setMode('offline'); };
    const goOnline = () => {
      setMode('sync');
      // Espera a que TODAS las escrituras locales se confirmen en el servidor.
      Promise.resolve(waitForPendingWrites(db)).catch(() => {}).then(() => {
        setMode('ok');
        t = setTimeout(() => setMode(null), 2800);
      });
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { clearTimeout(t); window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  if (!mode) return null;
  const offline = mode === 'offline';
  const ok = mode === 'ok';
  const bg = offline ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : `linear-gradient(135deg, ${BASE.greenDark}, #065f46)`;
  const dot = offline ? BASE.gold : '#a7f3d0';

  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)',
      zIndex: 4000, display: 'inline-flex', alignItems: 'center', gap: 9,
      padding: '9px 16px', borderRadius: 999, maxWidth: 'calc(100vw - 24px)',
      background: bg, color: '#fff', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.45)',
      border: `1px solid ${offline ? BASE.gold + '66' : 'rgba(255,255,255,0.2)'}`,
      fontSize: 12, fontWeight: 700, fontFamily: BASE.font, animation: 'gp-ob-in 0.3s ease-out',
    }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: dot,
        animation: (offline || mode === 'sync') ? 'gp-ob-pulse 1.6s infinite' : 'none',
      }} />
      {offline && <span>Sin conexión · <strong style={{ color: BASE.gold }}>trabajando offline</strong> — tus cambios se sincronizarán al volver la señal.</span>}
      {mode === 'sync' && <span><strong>Sincronizando</strong> los cambios pendientes…</span>}
      {ok && <span>✓ <strong>Todo sincronizado</strong> con la nube.</span>}
      <style>{`
        @keyframes gp-ob-in { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes gp-ob-pulse { 0% { box-shadow: 0 0 0 0 ${dot}88; } 70% { box-shadow: 0 0 0 7px ${dot}00; } 100% { box-shadow: 0 0 0 0 ${dot}00; } }
      `}</style>
    </div>
  );
}
