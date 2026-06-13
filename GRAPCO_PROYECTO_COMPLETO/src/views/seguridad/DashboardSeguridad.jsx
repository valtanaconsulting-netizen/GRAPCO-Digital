// src/views/seguridad/DashboardSeguridad.jsx
// KPIs ejecutivos del módulo SSOMA: NCs por severidad, % cierre,
// hallazgos por frente, tendencia OK/Obs/Crítico de inspecciones.
// Rediseño compacto: KPI chip-icono + Seccion, sin banners vacíos.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import EmptyState from '../../components/EmptyState';

const SEV_COLOR = { baja: BASE.green, media: BASE.gold, alta: BASE.red, critica: '#7f1d1d' };
const EST_COLOR = { abierta: BASE.red, tratamiento: BASE.gold, enProceso: BASE.gold, cerrada: BASE.green, verificada: '#16a34a' };

export default function DashboardSeguridad() {
  const { proyectoActivoId } = useProyectoActivo();
  const [ncs, setNcs] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aislamiento por proyecto: se filtra en cliente por proyectoId para no
    // requerir índice compuesto (where + orderBy). Docs sin proyectoId no se
    // mezclan entre obras.
    const delProyecto = (arr) => arr.filter(d => d.proyectoId === proyectoActivoId);
    const unsubs = [
      onSnapshot(query(collection(db, 'NoConformidades'), orderBy('detectadoEn', 'desc'), limit(200)),
        (snap) => { setNcs(delProyecto(snap.docs.map(d => ({ id: d.id, ...d.data() })))); setLoading(false); },
        () => setLoading(false)),
      onSnapshot(query(collection(db, 'InspeccionesSeguridad'), orderBy('creadoEn', 'desc'), limit(60)),
        (snap) => setInspecciones(delProyecto(snap.docs.map(d => ({ id: d.id, ...d.data() }))))),
    ];
    return () => unsubs.forEach(u => u());
  }, [proyectoActivoId]);

  const stats = useMemo(() => {
    const porSev = { baja: 0, media: 0, alta: 0, critica: 0 };
    const porEstado = { abierta: 0, tratamiento: 0, enProceso: 0, cerrada: 0, verificada: 0 };
    ncs.forEach(n => {
      if (porSev[n.severidad] !== undefined) porSev[n.severidad]++;
      if (porEstado[n.estado] !== undefined) porEstado[n.estado]++;
    });
    const cerradas = porEstado.cerrada + porEstado.verificada;
    const totalNCs = ncs.length;
    const pctCierre = totalNCs ? Math.round((cerradas / totalNCs) * 100) : 0;

    // Hallazgos por frente (top 5)
    const porFrente = new Map();
    ncs.forEach(n => {
      const k = n.ubicacion || 'Sin frente';
      porFrente.set(k, (porFrente.get(k) || 0) + 1);
    });
    inspecciones.forEach(i => {
      const k = i.frente || 'Sin frente';
      const c = (i.resumen?.crit || 0) + (i.resumen?.obs || 0);
      if (c > 0) porFrente.set(k, (porFrente.get(k) || 0) + c);
    });
    const topFrentes = Array.from(porFrente.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Tendencia inspecciones (últimos 14 días)
    const hoy = new Date();
    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dias.push({ key, label: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) });
    }
    const tendencia = dias.map(d => {
      const ins = inspecciones.filter(i => i.fecha === d.key);
      const ok = ins.reduce((a, i) => a + (i.resumen?.ok || 0), 0);
      const obs = ins.reduce((a, i) => a + (i.resumen?.obs || 0), 0);
      const crit = ins.reduce((a, i) => a + (i.resumen?.crit || 0), 0);
      return { ...d, ok, obs, crit };
    });
    const maxTendencia = Math.max(1, ...tendencia.map(t => t.ok + t.obs + t.crit));

    // Días sin incidente crítico
    const ultCritica = ncs.find(n => n.severidad === 'critica' || n.severidad === 'alta');
    let diasSinCritica = 999;
    if (ultCritica?.detectadoEn?.seconds) {
      const ms = ultCritica.detectadoEn.seconds * 1000;
      diasSinCritica = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    }

    return { porSev, porEstado, cerradas, totalNCs, pctCierre, topFrentes, tendencia, maxTendencia, diasSinCritica };
  }, [ncs, inspecciones]);

  if (loading) return <p style={{ padding: 30, color: BASE.muted }}>Cargando…</p>;
  if (!ncs.length && !inspecciones.length) {
    return <EmptyState icono="📊" titulo="Sin datos aún" descripcion="Comienza creando reportes e inspecciones para ver KPIs aquí." />;
  }

  const totalSev = Object.values(stats.porSev).reduce((s, n) => s + n, 0) || 1;
  const totalEst = Object.values(stats.porEstado).reduce((s, n) => s + n, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── KPIs principales ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
        <KPI titulo="Total NCs" valor={stats.totalNCs}
          subtitulo={`${stats.cerradas} cerradas`} color={BASE.navy} icono="🚨" />
        <KPI titulo="% de cierre" valor={`${stats.pctCierre}%`}
          subtitulo="del histórico"
          color={stats.pctCierre >= 80 ? BASE.green : stats.pctCierre >= 50 ? BASE.gold : BASE.red} icono="✅" />
        <KPI titulo="Críticas abiertas"
          valor={ncs.filter(n => n.severidad === 'critica' && n.estado !== 'cerrada' && n.estado !== 'verificada').length}
          subtitulo="requieren acción inmediata" color={BASE.red} icono="🔴" />
        <KPI titulo="Inspecciones" valor={inspecciones.length}
          subtitulo="últimas registradas" color="#0ea5e9" icono="✅" />
        <KPI titulo="Días s/ alta-crítica"
          valor={stats.diasSinCritica < 999 ? stats.diasSinCritica : '—'}
          subtitulo="récord actual" color={BASE.green} icono="🛡️" />
      </div>

      {/* ── Distribución y Estado lado a lado ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>

        {/* Distribución por severidad — barra apilada + leyenda */}
        <Seccion titulo="DISTRIBUCIÓN POR SEVERIDAD" icono="📊" extra={`${stats.totalNCs} NCs`}>
          <div style={{
            display: 'flex', height: '16px', borderRadius: '8px',
            overflow: 'hidden', background: BASE.bgSoft, marginTop: '2px',
          }}>
            {Object.entries(stats.porSev).map(([sev, n]) => {
              const pct = stats.totalNCs ? (n / stats.totalNCs) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div key={sev} title={`${sev}: ${n}`}
                  style={{ width: `${pct}%`, background: SEV_COLOR[sev] }} />
              );
            })}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '5px', marginTop: '10px',
          }}>
            {Object.entries(stats.porSev).map(([sev, n]) => (
              <div key={sev} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 7px', borderRadius: '6px',
                background: n ? SEV_COLOR[sev] + '12' : 'transparent',
                opacity: n ? 1 : 0.5,
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEV_COLOR[sev], flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700', flex: 1, textTransform: 'capitalize' }}>{sev}</span>
                <span style={{ fontSize: '12px', fontWeight: '900', color: SEV_COLOR[sev] }}>{n}</span>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Estado de NCs — barra apilada + leyenda */}
        <Seccion titulo="ESTADO DE LAS NCs" icono="📋" extra={`${stats.totalNCs} total`}>
          <div style={{
            display: 'flex', height: '16px', borderRadius: '8px',
            overflow: 'hidden', background: BASE.bgSoft, marginTop: '2px',
          }}>
            {Object.entries(stats.porEstado).map(([est, n]) => {
              if (!n) return null;
              const pct = (n / totalEst) * 100;
              return (
                <div key={est} title={`${est}: ${n}`}
                  style={{ width: `${pct}%`, background: EST_COLOR[est] || BASE.muted }} />
              );
            })}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '5px', marginTop: '10px',
          }}>
            {Object.entries(stats.porEstado).map(([est, n]) => (
              <div key={est} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 7px', borderRadius: '6px',
                background: n ? (EST_COLOR[est] || BASE.muted) + '12' : 'transparent',
                opacity: n ? 1 : 0.5,
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: EST_COLOR[est] || BASE.muted, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700', flex: 1, textTransform: 'capitalize' }}>{est}</span>
                <span style={{ fontSize: '12px', fontWeight: '900', color: EST_COLOR[est] || BASE.muted }}>{n}</span>
              </div>
            ))}
          </div>
        </Seccion>
      </div>

      {/* ── Top frentes + Tendencia inspecciones ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>

        {/* Top frentes */}
        <Seccion titulo="TOP FRENTES CON MÁS HALLAZGOS" icono="🎯">
          {!stats.topFrentes.length ? (
            <p style={{ fontSize: '11px', color: BASE.muted }}>Sin datos.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.topFrentes.map(([f, n], i) => {
                const max = stats.topFrentes[0][1];
                const pct = (n / max) * 100;
                return (
                  <div key={f}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '3px' }}>
                      <span style={{ color: BASE.navy, fontWeight: '700' }}>{i + 1}. {f}</span>
                      <span style={{ color: BASE.muted, fontWeight: '700' }}>{n}</span>
                    </div>
                    <div style={{ height: '8px', background: BASE.bgSoft, borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${BASE.red}, ${BASE.gold})`, borderRadius: '5px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Seccion>

        {/* Tendencia inspecciones */}
        <Seccion titulo="TENDENCIA INSPECCIONES (14 DÍAS)" icono="📈">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {stats.tendencia.map((t, i) => {
              const tot = t.ok + t.obs + t.crit;
              const h = (tot / stats.maxTendencia) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                  title={`${t.label}: OK ${t.ok} · Obs ${t.obs} · Crit ${t.crit}`}>
                  <div style={{ height: `${h}%`, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '2px' }}>
                    {t.crit > 0 && <div style={{ background: BASE.red, height: `${(t.crit / tot) * 100}%`, minHeight: '2px' }} />}
                    {t.obs > 0 && <div style={{ background: BASE.gold, height: `${(t.obs / tot) * 100}%`, minHeight: '2px' }} />}
                    {t.ok > 0 && <div style={{ background: BASE.green, height: `${(t.ok / tot) * 100}%`, minHeight: '2px' }} />}
                  </div>
                  <span style={{ fontSize: '7.5px', color: BASE.muted, fontWeight: '700' }}>{t.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: BASE.green, borderRadius: '2px', marginRight: '4px' }} />OK</span>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: BASE.gold, borderRadius: '2px', marginRight: '4px' }} />Observado</span>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: BASE.red, borderRadius: '2px', marginRight: '4px' }} />Crítico</span>
          </div>
        </Seccion>
      </div>

      {/* ── Últimas críticas abiertas ── */}
      <Seccion titulo="ÚLTIMAS NCs CRÍTICAS / ALTAS ABIERTAS" icono="🔴">
        {(() => {
          const abiertas = ncs.filter(n => (n.severidad === 'critica' || n.severidad === 'alta') &&
            n.estado !== 'cerrada' && n.estado !== 'verificada').slice(0, 5);
          if (!abiertas.length) {
            return <p style={{ fontSize: '11.5px', color: BASE.green, fontWeight: '700' }}>✅ Sin NCs críticas/altas abiertas.</p>;
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {abiertas.map(n => (
                <div key={n.id} style={{
                  borderLeft: `4px solid ${SEV_COLOR[n.severidad]}`,
                  background: SEV_COLOR[n.severidad] + '0d',
                  borderRadius: '8px', padding: '9px 12px',
                  display: 'flex', gap: '10px',
                }}>
                  {n.fotos?.[0]?.url && (
                    <img src={n.fotos[0].url} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '10.5px', fontWeight: '800', color: BASE.red, letterSpacing: '0.3px' }}>
                      {n.codigo} · {(n.severidad || '').toUpperCase()}
                    </p>
                    <p style={{ fontSize: '12px', color: BASE.navy, fontWeight: '700', marginTop: '2px' }}>
                      {n.titulo || n.descripcion?.slice(0, 80)}
                    </p>
                    <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>
                      {n.ubicacion || 'Sin ubicación'} · estado: {n.estado || 'abierta'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Seccion>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────

function KPI({ titulo, valor, subtitulo, color, icono }) {
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
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>
          {titulo.toUpperCase()}
        </p>
        <p style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {valor}
        </p>
        {subtitulo && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{subtitulo}</p>}
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
