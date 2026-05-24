// src/views/calidad/DashboardCalidad.jsx — KPIs ejecutivos de Calidad (B20)
// Rediseño compacto: KPI chip-icono + Seccion, sin banners vacíos.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import {
  dashboardCalidad, ESTADOS_PROTOCOLO, ESTADOS_NC, SEVERIDADES_NC,
  fmtSoles,
} from '../../utils/calidadOTAnalytics';

export default function DashboardCalidad() {
  const [protocolos, setProtocolos] = useState([]);
  const [ncs, setNCs] = useState([]);
  const [ensayos, setEnsayos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'Protocolos'), orderBy('fechaCreacion', 'desc'), limit(500)),
        (snap) => { setProtocolos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (e) => { console.error('[Prot]', e); setLoading(false); }),
      onSnapshot(query(collection(db, 'NoConformidades'), orderBy('fechaApertura', 'desc'), limit(500)),
        (snap) => setNCs(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (e) => console.error('[NC]', e)),
      onSnapshot(query(collection(db, 'Ensayos'), orderBy('fechaToma', 'desc'), limit(500)),
        (snap) => setEnsayos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (e) => console.error('[Ens]', e)),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const dash = useMemo(() => dashboardCalidad(protocolos, ncs, ensayos), [protocolos, ncs, ensayos]);

  const ncsRecientes = useMemo(() =>
    ncs.filter(n => n.estado === 'abierta' || n.estado === 'tratamiento').slice(0, 6),
    [ncs]
  );

  const protocolosPendientes = useMemo(() =>
    protocolos.filter(p => p.estado === 'pendiente' || p.estado === 'llenado' || p.estado === 'firmado_residente').slice(0, 8),
    [protocolos]
  );

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando indicadores...</p>;

  const totalProtocolos = dash.protocolos.total || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── KPIs principales ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
        <KPI label="% LIBERACIÓN" icono="✅"
          color={dash.protocolos.pctLiberacion >= 80 ? BASE.green : dash.protocolos.pctLiberacion >= 50 ? '#f59e0b' : BASE.red}
          valor={`${dash.protocolos.pctLiberacion}%`}
          sub={`${dash.protocolos.liberados} de ${dash.protocolos.total}`} />
        <KPI label="PROTOCOLOS PENDIENTES" icono="📋"
          color={dash.protocolos.pendientes > 10 ? BASE.red : '#f59e0b'}
          valor={dash.protocolos.pendientes}
          sub="Requieren acción" />
        <KPI label="PROTOCOLOS OBSERVADOS" icono="⚠️"
          color={dash.protocolos.observados > 0 ? BASE.red : BASE.green}
          valor={dash.protocolos.observados}
          sub="Por corregir" />
        <KPI label="NCs ABIERTAS" icono="🚨"
          color={dash.ncs.criticas > 0 ? BASE.red : dash.ncs.abiertas > 0 ? '#f59e0b' : BASE.green}
          valor={dash.ncs.abiertas}
          sub={dash.ncs.criticas > 0 ? `🚨 ${dash.ncs.criticas} críticas` : 'Sin críticas'} />
        <KPI label="ENSAYOS CUMPLEN" icono="🧪"
          color={dash.ensayos.pctCumplimiento >= 95 ? BASE.green : dash.ensayos.pctCumplimiento >= 80 ? '#f59e0b' : BASE.red}
          valor={`${dash.ensayos.pctCumplimiento}%`}
          sub={`${dash.ensayos.cumplen} de ${dash.ensayos.total}`} />
      </div>

      {/* ── Layout 2 columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '12px' }}>

        {/* Protocolos pendientes */}
        <Seccion titulo="PROTOCOLOS PENDIENTES (TOP 8)" icono="📋">
          {protocolosPendientes.length === 0 ? (
            <p style={{ padding: '12px 0', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
              ✅ No hay protocolos pendientes
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {protocolosPendientes.map(p => {
                const estado = ESTADOS_PROTOCOLO[p.estado] || ESTADOS_PROTOCOLO.pendiente;
                return (
                  <div key={p.id} style={{
                    background: estado.color + '12',
                    border: `1px solid ${estado.color}55`,
                    borderRadius: '9px', padding: '9px 12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{estado.icono}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy }}>
                        {p.codigo || 'Sin codigo'}
                      </p>
                      <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                        {p.elementoTipo} · {p.tipo}
                      </p>
                    </div>
                    <span style={{
                      background: estado.color, color: '#fff',
                      padding: '3px 8px', borderRadius: '9px',
                      fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px', flexShrink: 0,
                    }}>{estado.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Seccion>

        {/* NCs recientes */}
        <Seccion titulo="NO CONFORMIDADES ACTIVAS" icono="🚨">
          {ncsRecientes.length === 0 ? (
            <p style={{ padding: '12px 0', textAlign: 'center', color: BASE.green, fontSize: '12px', fontWeight: '700' }}>
              ✅ Sin NCs abiertas. ¡Excelente!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {ncsRecientes.map(n => {
                const sev = SEVERIDADES_NC[n.severidad] || SEVERIDADES_NC.media;
                const est = ESTADOS_NC[n.estado] || ESTADOS_NC.abierta;
                return (
                  <div key={n.id} style={{
                    background: sev.color + '0d',
                    border: `1px solid ${sev.color}55`,
                    borderLeft: `4px solid ${sev.color}`,
                    borderRadius: '9px', padding: '9px 12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy }}>{n.titulo || 'Sin titulo'}</p>
                        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                          {n.codigo} · {n.partidaWBS || 'Sin partida'}
                        </p>
                      </div>
                      <span style={{
                        background: sev.color, color: '#fff',
                        padding: '2px 8px', borderRadius: '9px',
                        fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px', flexShrink: 0,
                      }}>{sev.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Seccion>
      </div>

      {/* ── Resumen ejecutivo ── */}
      <Seccion titulo="RESUMEN EJECUTIVO" icono="📊">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>

          {/* Protocolos por estado — barra apilada + leyenda */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '8px' }}>
              📋 PROTOCOLOS POR ESTADO
            </p>
            <div style={{
              display: 'flex', height: '14px', borderRadius: '7px',
              overflow: 'hidden', background: BASE.bgSoft, marginBottom: '8px',
            }}>
              {Object.entries(ESTADOS_PROTOCOLO).map(([key, e]) => {
                const count = protocolos.filter(p => p.estado === key).length;
                if (!count) return null;
                const pct = (count / totalProtocolos) * 100;
                return (
                  <div key={key} title={`${e.label}: ${count}`}
                    style={{ width: `${pct}%`, background: e.color }} />
                );
              })}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '5px',
            }}>
              {Object.entries(ESTADOS_PROTOCOLO).map(([key, e]) => {
                const count = protocolos.filter(p => p.estado === key).length;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 7px', borderRadius: '6px',
                    background: count ? e.color + '12' : 'transparent',
                    opacity: count ? 1 : 0.5,
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700', flex: 1 }}>{e.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: e.color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NCs por severidad */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '8px' }}>
              🚨 NCs POR SEVERIDAD
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {Object.entries(SEVERIDADES_NC).map(([key, sev]) => {
                const count = ncs.filter(n => n.severidad === key && (n.estado === 'abierta' || n.estado === 'tratamiento')).length;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '5px 7px', borderRadius: '6px',
                    background: count ? sev.color + '12' : 'transparent',
                    opacity: count ? 1 : 0.5,
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{sev.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: sev.color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ensayos del mes */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '8px' }}>
              🧪 ENSAYOS DEL MES
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px', fontWeight: '900', color: BASE.navy, lineHeight: 1.2 }}>
                {dash.ensayos.total}
              </span>
              <div>
                <p style={{ fontSize: '10px', color: BASE.green, fontWeight: '700' }}>✅ {dash.ensayos.cumplen} cumplen</p>
                <p style={{ fontSize: '10px', color: BASE.red, fontWeight: '700' }}>✗ {dash.ensayos.noCumplen} no cumplen</p>
              </div>
            </div>
          </div>
        </div>
      </Seccion>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────

function KPI({ label, valor, color, sub, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '10px', padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: '11px',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
        background: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>{icono}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{label}</p>
        <p style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {valor}
        </p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>
      </div>
    </div>
  );
}

function Seccion({ titulo, icono, extra, children }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: '8px', marginBottom: '12px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
          {icono} {titulo}
        </p>
        {extra && (
          <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{extra}</span>
        )}
      </div>
      {children}
    </div>
  );
}
