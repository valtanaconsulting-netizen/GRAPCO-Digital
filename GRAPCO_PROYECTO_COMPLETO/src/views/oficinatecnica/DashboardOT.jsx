// src/views/oficinatecnica/DashboardOT.jsx — KPIs ejecutivos OT (B20)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { fmtSoles, fmtNumero } from '../../utils/calidadOTAnalytics';

export default function DashboardOT() {
  const [rdos, setRDOs] = useState([]);
  const [valorizaciones, setValorizaciones] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'RDO'), orderBy('fecha', 'desc'), limit(60)),
        (snap) => { setRDOs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (e) => { console.error('[RDO]', e); setLoading(false); }),
      onSnapshot(query(collection(db, 'ValorizacionesContractuales'), orderBy('numeroValorizacion', 'desc')),
        (snap) => setValorizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (e) => console.error('[Val]', e)),
      onSnapshot(collection(db, 'PartidasContractuales'),
        (snap) => setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (e) => console.error('[Part]', e)),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const stats = useMemo(() => {
    const presupuestoContractual = partidas.reduce((s, p) => s + (p.metradoContractual || 0) * (p.precioUnitario || 0), 0);
    const totalValorizado = valorizaciones.reduce((s, v) => s + (v.subtotalBruto || 0), 0);
    const pctEjecutado = presupuestoContractual > 0 ? (totalValorizado / presupuestoContractual) * 100 : 0;
    const totalCobrado = valorizaciones.filter(v => v.estado === 'pagada').reduce((s, v) => s + (v.total || 0), 0);
    const valorizacionesPendientes = valorizaciones.filter(v => v.estado === 'borrador' || v.estado === 'enviada').length;
    const rdosFirmados = rdos.filter(r => r.estado === 'firmado' || r.estado === 'enviado_cliente').length;
    const rdosBorrador = rdos.filter(r => r.estado === 'borrador').length;

    return {
      presupuestoContractual,
      totalValorizado,
      pctEjecutado,
      totalCobrado,
      valorizacionesPendientes,
      totalValorizaciones: valorizaciones.length,
      rdosFirmados,
      rdosBorrador,
      totalRDOs: rdos.length,
      totalPartidas: partidas.length,
    };
  }, [rdos, valorizaciones, partidas]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando indicadores...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* KPIs financieros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
        <KPI label="PRESUPUESTO CONTRACTUAL" valor={fmtSoles(stats.presupuestoContractual)}
          color="#6366f1" sub={`${stats.totalPartidas} partidas`} icono="📋" />
        <KPI label="VALORIZADO ACUMULADO" valor={fmtSoles(stats.totalValorizado)}
          color="#f59e0b" sub={`${fmtNumero(stats.pctEjecutado, 1)}% del contrato`} icono="💰" />
        <KPI label="COBRADO" valor={fmtSoles(stats.totalCobrado)}
          color={BASE.green} sub={`${stats.totalValorizaciones} valorizaciones`} icono="✅" />
        <KPI label="VALORIZACIONES PENDIENTES" valor={stats.valorizacionesPendientes}
          color={stats.valorizacionesPendientes > 0 ? '#f59e0b' : BASE.green}
          sub="Borrador o enviadas" icono="📤" />
      </div>

      {/* Avance ejecucion — barra compacta */}
      <Seccion titulo="% AVANCE EJECUTADO VS CONTRATO" icono="📊">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.5px', lineHeight: 1 }}>
            {fmtNumero(stats.pctEjecutado, 1)}%
          </span>
          <span style={{ fontSize: '11px', color: BASE.muted }}>
            {fmtSoles(stats.totalValorizado)} de {fmtSoles(stats.presupuestoContractual)}
          </span>
        </div>
        <div style={{ background: BASE.bgSoft, height: '14px', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            background: `linear-gradient(90deg, #6366f1, #4338ca)`,
            height: '100%', width: `${Math.min(100, stats.pctEjecutado)}%`,
            transition: 'width 0.6s ease',
            borderRadius: '8px',
          }} />
        </div>
      </Seccion>

      {/* RDOs y Valorizaciones recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '12px' }}>
        <Seccion titulo={`RDOs RECIENTES (${stats.totalRDOs})`} icono="📅">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {rdos.slice(0, 7).length === 0 ? (
              <p style={{ padding: '16px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
                Sin RDOs aun. Genera uno desde la pestaña RDO.
              </p>
            ) : rdos.slice(0, 7).map(r => {
              const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
              const estadoColor = r.estado === 'firmado' ? BASE.green : r.estado === 'enviado_cliente' ? '#2563eb' : '#f59e0b';
              return (
                <div key={r.id} style={{
                  background: estadoColor + '0d',
                  border: `1px solid ${estadoColor}33`,
                  borderLeft: `3px solid ${estadoColor}`,
                  padding: '7px 10px', borderRadius: '8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>{r.numero}</p>
                    <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                      {fecha.toLocaleDateString('es-PE')}
                    </p>
                  </div>
                  <span style={{
                    background: estadoColor, color: '#fff',
                    padding: '2px 7px', borderRadius: '10px',
                    fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px',
                  }}>{(r.estado || 'borrador').replace('_', ' ').toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </Seccion>

        <Seccion titulo={`VALORIZACIONES (${stats.totalValorizaciones})`} icono="💰">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {valorizaciones.slice(0, 7).length === 0 ? (
              <p style={{ padding: '16px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
                Sin valorizaciones. Crea la primera desde Valorizaciones.
              </p>
            ) : valorizaciones.slice(0, 7).map(v => {
              const estadoColor = v.estado === 'pagada' ? BASE.green : v.estado === 'aprobada' ? '#2563eb' : v.estado === 'enviada' ? '#7c3aed' : '#f59e0b';
              return (
                <div key={v.id} style={{
                  background: estadoColor + '0d',
                  border: `1px solid ${estadoColor}33`,
                  borderLeft: `3px solid ${estadoColor}`,
                  padding: '7px 10px', borderRadius: '8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy }}>V-{v.numeroValorizacion}</p>
                    <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                      {fmtSoles(v.total)}
                    </p>
                  </div>
                  <span style={{
                    background: estadoColor, color: '#fff',
                    padding: '2px 7px', borderRadius: '10px',
                    fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px',
                  }}>{(v.estado || 'borrador').toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </Seccion>
      </div>
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
        <p style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{valor}</p>
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
