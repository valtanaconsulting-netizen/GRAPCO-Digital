// src/components/OfflineBanner.jsx
// Indicador de conexión para contexto de obra ("cerro sin señal"). Avisa cuando
// no hay internet y que los cambios se sincronizan solos al volver (Firestore
// encola las escrituras en IndexedDB). No bloquea: la app sigue 100% usable offline.
import React, { useEffect, useState } from 'react';
import { BASE } from '../utils/styles';

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOnline(false); setJustBack(false); };
    const goOnline = () => {
      setOnline(true); setJustBack(true);
      setTimeout(() => setJustBack(false), 3500);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  if (online && !justBack) return null;

  const offline = !online;
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)',
      zIndex: 4000, display: 'inline-flex', alignItems: 'center', gap: 9,
      padding: '9px 16px', borderRadius: 999, maxWidth: 'calc(100vw - 24px)',
      background: offline ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : `linear-gradient(135deg, ${BASE.greenDark}, #065f46)`,
      color: '#fff', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.45)',
      border: `1px solid ${offline ? BASE.gold + '66' : 'rgba(255,255,255,0.2)'}`,
      fontSize: 12, fontWeight: 700, fontFamily: BASE.font,
      animation: 'gp-ob-in 0.3s ease-out',
    }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
        background: offline ? BASE.gold : '#a7f3d0',
        boxShadow: `0 0 0 0 ${offline ? BASE.gold : '#a7f3d0'}`,
        animation: offline ? 'gp-ob-pulse 1.6s infinite' : 'none',
      }} />
      {offline ? (
        <span>Sin conexión · <strong style={{ color: BASE.gold }}>trabajando offline</strong> — tus cambios se sincronizarán al volver la señal.</span>
      ) : (
        <span>✓ Conexión restablecida — <strong>sincronizando</strong> los cambios…</span>
      )}
      <style>{`
        @keyframes gp-ob-in { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes gp-ob-pulse { 0% { box-shadow: 0 0 0 0 ${BASE.gold}88; } 70% { box-shadow: 0 0 0 7px ${BASE.gold}00; } 100% { box-shadow: 0 0 0 0 ${BASE.gold}00; } }
      `}</style>
    </div>
  );
}
