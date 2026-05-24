// src/views/admin/SaludSistema.jsx — Health check del sistema completo
import React, { useState, useEffect } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { FUNCTIONS_BASE_URL } from '../../utils/functionsClient';

export default function SaludSistema() {
  const [checks, setChecks] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    correrChecks();
  }, []);

  const correrChecks = async () => {
    setRunning(true);
    const resultados = [];

    // 1. Conectividad Firestore
    try {
      const t0 = performance.now();
      await getCountFromServer(collection(db, 'Usuarios'));
      const ms = (performance.now() - t0).toFixed(0);
      resultados.push({ id: 'firestore', label: 'Firestore (lectura)',
        ok: true, msg: `Respuesta en ${ms}ms`, latencia: parseInt(ms) });
    } catch (err) {
      resultados.push({ id: 'firestore', label: 'Firestore (lectura)',
        ok: false, msg: err.message });
    }

    // 2. Service Worker registrado
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      resultados.push({ id: 'sw', label: 'Service Worker',
        ok: !!reg,
        msg: reg ? `Activo: ${reg.active?.scriptURL?.split('/').pop() || '—'}` : 'No registrado',
      });
    } else {
      resultados.push({ id: 'sw', label: 'Service Worker', ok: false, msg: 'No soportado por navegador' });
    }

    // 3. PWA installable
    const enStandalone = window.matchMedia('(display-mode: standalone)').matches;
    resultados.push({ id: 'pwa', label: 'PWA',
      ok: true, msg: enStandalone ? 'Instalada y corriendo standalone' : 'Web (no instalada)' });

    // 4. Cuotas de almacenamiento del navegador
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const est = await navigator.storage.estimate();
        const usadoMB = (est.usage / 1024 / 1024).toFixed(1);
        const totalMB = (est.quota / 1024 / 1024).toFixed(0);
        const pct = ((est.usage / est.quota) * 100).toFixed(1);
        resultados.push({ id: 'storage', label: 'Almacenamiento navegador',
          ok: true, msg: `${usadoMB} MB usados de ${totalMB} MB (${pct}%)` });
      } catch (e) {
        resultados.push({ id: 'storage', label: 'Almacenamiento navegador', ok: false, msg: e.message });
      }
    }

    // 5. Conexión online
    resultados.push({ id: 'online', label: 'Conexión a internet',
      ok: navigator.onLine, msg: navigator.onLine ? 'Conectado' : 'Sin conexión' });

    // 6. APS Cloud Functions (ping)
    try {
      const t0 = performance.now();
      // Hacemos un fetch que devuelva 401/403 rápidamente (sin auth header)
      // Solo nos interesa que responda algo, no la respuesta en sí
      const url = `${FUNCTIONS_BASE_URL}/apsTokenViewer`;
      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), 5000);
      await fetch(url, { method: 'OPTIONS', signal: ctrl.signal });
      clearTimeout(tId);
      const ms = (performance.now() - t0).toFixed(0);
      resultados.push({ id: 'aps', label: 'Cloud Functions (APS backend)',
        ok: true, msg: `Alcanzable en ${ms}ms`, latencia: parseInt(ms) });
    } catch (err) {
      resultados.push({ id: 'aps', label: 'Cloud Functions (APS backend)',
        ok: false, msg: err.name === 'AbortError' ? 'Timeout (5s)' : err.message });
    }

    // 7. Local Storage disponible
    try {
      localStorage.setItem('__healthcheck', '1');
      localStorage.removeItem('__healthcheck');
      resultados.push({ id: 'localstorage', label: 'localStorage', ok: true, msg: 'Disponible' });
    } catch (_) {
      resultados.push({ id: 'localstorage', label: 'localStorage',
        ok: false, msg: 'Bloqueado (modo privado o restringido)' });
    }

    // 8. Notificaciones del navegador
    if ('Notification' in window) {
      const perm = Notification.permission;
      resultados.push({ id: 'notifs', label: 'Notificaciones del navegador',
        ok: perm !== 'denied',
        msg: perm === 'granted' ? 'Permitidas' : perm === 'default' ? 'No solicitadas' : 'Denegadas' });
    }

    setChecks(resultados);
    setRunning(false);
  };

  const okCount = checks.filter(c => c.ok).length;
  const totalCount = checks.length;
  const allOk = checks.length > 0 && okCount === totalCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Resumen general */}
      <div style={{
        background: allOk ? BASE.greenLight : checks.some(c => !c.ok) ? '#fef3c7' : BASE.bgSoft,
        border: `2px solid ${allOk ? BASE.green : checks.some(c => !c.ok) ? BASE.gold : BASE.border}`,
        borderRadius: '14px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <span style={{ fontSize: '40px' }}>
          {running ? '⏳' : allOk ? '💚' : '⚠️'}
        </span>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', color: BASE.navy }}>
            {running ? 'Verificando sistemas...' :
             allOk ? 'Todos los sistemas operativos' :
             `${okCount}/${totalCount} sistemas operativos`}
          </h3>
          <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '4px' }}>
            {running ? 'Corriendo health checks...' :
             allOk ? 'No se detectaron problemas. La plataforma está al 100%.' :
             'Revisa los servicios marcados con ⚠️ abajo.'}
          </p>
        </div>
        <button onClick={correrChecks} disabled={running} className="btn-feedback" style={{
          padding: '10px 18px',
          background: running ? '#94a3b8' : BASE.navy,
          color: '#fff', border: 'none', borderRadius: '9px',
          fontSize: '12px', fontWeight: '900',
          cursor: running ? 'wait' : 'pointer',
        }}>{running ? 'Corriendo...' : '🔄 Correr de nuevo'}</button>
      </div>

      {/* Lista de checks */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {checks.map((c, i) => (
          <div key={c.id} style={{
            padding: '12px 18px',
            borderBottom: i < checks.length - 1 ? `1px solid ${BASE.border}` : 'none',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <span style={{
              width: '32px', height: '32px',
              background: c.ok ? `${BASE.green}22` : '#fee2e2',
              borderRadius: '50%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>{c.ok ? '✓' : '✗'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy }}>
                {c.label}
              </p>
              <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                {c.msg}
              </p>
            </div>
            {c.latencia !== undefined && (
              <span style={{
                padding: '3px 10px', borderRadius: '12px',
                background: c.latencia < 200 ? BASE.greenLight :
                            c.latencia < 800 ? '#fef3c7' : '#fee2e2',
                color: c.latencia < 200 ? BASE.greenDark :
                       c.latencia < 800 ? BASE.goldDark : BASE.red,
                fontSize: '10px', fontWeight: '900', letterSpacing: '0.3px',
              }}>{c.latencia}ms</span>
            )}
          </div>
        ))}
      </div>

      {/* Info del navegador */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
      }}>
        <h4 style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '10px' }}>
          🖥️ INFORMACIÓN DEL NAVEGADOR
        </h4>
        <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <Info label="Plataforma" value={navigator.platform} />
          <Info label="User Agent" value={navigator.userAgent.slice(0, 80) + '...'} />
          <Info label="Idioma" value={navigator.language} />
          <Info label="Resolución" value={`${window.screen.width}×${window.screen.height}`} />
          <Info label="Viewport" value={`${window.innerWidth}×${window.innerHeight}`} />
          <Info label="DPR" value={window.devicePixelRatio.toFixed(1) + '×'} />
          <Info label="Memoria (deviceMemory)" value={navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'N/D'} />
          <Info label="Cores CPU" value={navigator.hardwareConcurrency || 'N/D'} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '6px 10px', background: BASE.bgSoft, borderRadius: '6px' }}>
      <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{label}</span>
      <span style={{ fontSize: '10px', color: BASE.text, fontWeight: '800', fontFamily: 'monospace', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
