// src/views/modulos/portfolio/PortfolioDashboard.jsx — Dashboard ejecutivo Multi-Proyecto (B24)
// Rediseño compacto: hero slim + KPIs densos + estado en barra apilada. Sin tarjetones vacíos.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import {
  calcularROMensual, CATEGORIAS_MO,
  fmtSoles, fmtPct, colorMargen, colorCPI,
} from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

const ESTADOS = {
  planificado:  { l: 'Planificado',   c: '#2563eb', i: '📅' },
  en_ejecucion: { l: 'En ejecución',  c: '#f59e0b', i: '🟡' },
  suspendido:   { l: 'Suspendido',    c: '#dc2626', i: '⏸️' },
  completado:   { l: 'Completado',    c: '#16a34a', i: '✅' },
};

export default function PortfolioDashboard() {
  const { proyectos, frentes, setProyectoActivoId } = useProyectoActivo();
  const [actividades, setActividades] = useState([]);
  const [apus, setApus] = useState([]);
  const [tareos, setTareos] = useState([]);
  const [kardex, setKardex] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pending = 4;
    const dec = () => { pending -= 1; if (pending <= 0) setLoading(false); };
    const cb = (setter) => (snap) => { setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dec(); };
    const errCb = (e) => { console.warn(e); dec(); };
    const unsubs = [
      onSnapshot(collection(db, 'PlanMaestro'), cb(setActividades), errCb),
      onSnapshot(collection(db, 'APUs'), cb(setApus), errCb),
      onSnapshot(collection(db, 'Tareos'), cb(setTareos), errCb),
      onSnapshot(collection(db, 'KardexMovimientos'), cb(setKardex), errCb),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const salariosMap = useMemo(() => {
    const m = new Map();
    CATEGORIAS_MO.forEach(c => m.set(c.id, c.salarioBase));
    return m;
  }, []);

  // Calcular RO POR PROYECTO
  const rosPorProyecto = useMemo(() => {
    if (loading) return [];
    return proyectos.map(p => {
      const actsP = actividades.filter(a => a.proyectoId === p.id);
      const tareosP = tareos.filter(t => t.proyectoId === p.id);
      const kardexP = kardex.filter(k => k.proyectoId === p.id);
      const ro = calcularROMensual({
        actividades: actsP, apus,
        tareos: tareosP,
        kardexMovimientos: kardexP,
        valorizaciones: [],
        salariosPorCategoria: salariosMap,
        margenMeta: p.margenMetaPct || 15,
        fechaActual: new Date(),
      });
      const frentesP = frentes.filter(f => f.proyectoId === p.id);
      return { proyecto: p, ro, frentes: frentesP, nActividades: actsP.length };
    });
  }, [loading, proyectos, frentes, actividades, apus, tareos, kardex, salariosMap]);

  // Totales empresa
  const totalesEmpresa = useMemo(() => {
    if (!rosPorProyecto.length) return null;
    const t = rosPorProyecto.reduce((acc, { ro }) => ({
      BAC: acc.BAC + ro.totales.BAC,
      EV: acc.EV + ro.totales.EV,
      AC: acc.AC + ro.totales.AC,
      vendido: acc.vendido + ro.totales.vendido,
      costoReal: acc.costoReal + ro.totales.costoReal,
    }), { BAC: 0, EV: 0, AC: 0, vendido: 0, costoReal: 0 });
    const CPI = t.AC > 0 ? t.EV / t.AC : 0;
    const margenReal = t.vendido > 0 ? ((t.vendido - t.costoReal) / t.vendido) * 100 : 0;
    const avancePct = t.BAC > 0 ? (t.EV / t.BAC) * 100 : 0;
    return { ...t, CPI, margenReal, avancePct };
  }, [rosPorProyecto]);

  // Conteo por estado
  const porEstado = useMemo(() => {
    const m = {};
    Object.keys(ESTADOS).forEach(k => { m[k] = 0; });
    proyectos.forEach(p => {
      const k = p.estado || 'planificado';
      if (m[k] !== undefined) m[k] += 1;
    });
    return m;
  }, [proyectos]);

  // Alertas globales
  const alertas = useMemo(() => {
    const lst = [];
    rosPorProyecto.forEach(({ proyecto, ro }) => {
      const meta = proyecto.margenMetaPct || 15;
      if (ro.indicadoresGlobales.margenReal < 0) {
        lst.push({ nivel: 'CRITICO', proyecto, mensaje: `Margen NEGATIVO: ${fmtPct(ro.indicadoresGlobales.margenReal)}` });
      } else if (ro.indicadoresGlobales.margenReal < meta * 0.5) {
        lst.push({ nivel: 'ALTO', proyecto, mensaje: `Margen muy bajo: ${fmtPct(ro.indicadoresGlobales.margenReal)} (meta ${meta}%)` });
      }
      if (ro.indicadoresGlobales.CPI > 0 && ro.indicadoresGlobales.CPI < 0.85) {
        lst.push({ nivel: 'ALTO', proyecto, mensaje: `CPI = ${ro.indicadoresGlobales.CPI?.toFixed(2)} sobrecosto crítico` });
      }
      if (ro.indicadoresGlobales.SPI > 0 && ro.indicadoresGlobales.SPI < 0.85) {
        lst.push({ nivel: 'ALTO', proyecto, mensaje: `SPI = ${ro.indicadoresGlobales.SPI?.toFixed(2)} atraso crítico` });
      }
    });
    return lst.slice(0, 12);
  }, [rosPorProyecto]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando portfolio...</p>;
  if (proyectos.length === 0) {
    return <EmptyState icono="🌎" titulo="Sin proyectos" descripcion="Crea proyectos en la pestaña Proyectos para ver el dashboard ejecutivo." />;
  }

  const totalEstados = Object.values(porEstado).reduce((s, n) => s + n, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── HERO slim ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1a2e, #1e3a5f)',
        borderRadius: '12px', padding: '14px 20px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '10px',
      }}>
        <div>
          <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            🌎 PORTFOLIO EJECUTIVO · DIRECCIÓN GENERAL
          </p>
          <h2 style={{ fontSize: '19px', fontWeight: '900', marginTop: '3px', letterSpacing: '-0.3px' }}>
            {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'} en cartera
            <span style={{ opacity: 0.6, fontWeight: '700' }}> · {frentes.length} frentes activos</span>
          </h2>
        </div>
        <span style={{ fontSize: '10.5px', opacity: 0.7, maxWidth: '320px', textAlign: 'right' }}>
          Vista consolidada GRAPCO SAC — KPIs, alertas y ranking de rentabilidad.
        </span>
      </div>

      {/* ── KPIs consolidados ── */}
      {totalesEmpresa && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
          <KPI icono="💼" color={BASE.gold} label="CARTERA TOTAL"
            valor={fmtSoles(totalesEmpresa.BAC)}
            sub="Valor contractual (BAC)" />
          <KPI icono="✅" color={BASE.green} label="VENDIDO ACUMULADO"
            valor={fmtSoles(totalesEmpresa.vendido)}
            sub={`${fmtPct(totalesEmpresa.avancePct)} de la cartera ejecutado`} />
          <KPI icono="💸" color="#dc2626" label="COSTO REAL TOTAL"
            valor={fmtSoles(totalesEmpresa.costoReal)}
            sub="Acumulado de tareos + kardex" />
          <KPI icono={totalesEmpresa.margenReal >= 15 ? '🟢' : '⚠️'}
            color={colorMargen(totalesEmpresa.margenReal, 15)} label="MARGEN GLOBAL"
            valor={fmtPct(totalesEmpresa.margenReal)}
            sub={`CPI global: ${totalesEmpresa.CPI?.toFixed(2)}`} />
        </div>
      )}

      {/* ── Estado de la cartera — barra apilada + leyenda ── */}
      <Seccion titulo="ESTADO DE LA CARTERA" icono="📊"
        extra={`${proyectos.length} proyectos`}>
        <div style={{
          display: 'flex', height: '16px', borderRadius: '8px',
          overflow: 'hidden', background: BASE.bgSoft, marginTop: '2px',
        }}>
          {Object.entries(ESTADOS).map(([k, e]) => {
            const n = porEstado[k] || 0;
            if (!n) return null;
            return (
              <div key={k} title={`${e.l}: ${n}`}
                style={{ width: `${(n / totalEstados) * 100}%`, background: e.c }} />
            );
          })}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '6px', marginTop: '10px',
        }}>
          {Object.entries(ESTADOS).map(([k, e]) => {
            const n = porEstado[k] || 0;
            return (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '6px 9px', borderRadius: '7px',
                background: n ? e.c + '12' : 'transparent', opacity: n ? 1 : 0.5,
              }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: e.c, flexShrink: 0 }} />
                <span style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: '700', flex: 1 }}>{e.l}</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: e.c }}>{n}</span>
              </div>
            );
          })}
        </div>
      </Seccion>

      {/* ── RANKING DE PROYECTOS ── */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BASE.border}`, background: BASE.bgSoft }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            🏆 RANKING DE PROYECTOS POR RENTABILIDAD (CPI / MARGEN REAL)
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1100px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th}>#</th>
                <th style={th}>Proyecto</th>
                <th style={{ ...th, textAlign: 'center' }}>Estado</th>
                <th style={{ ...th, textAlign: 'right' }}>BAC</th>
                <th style={{ ...th, textAlign: 'right' }}>EV (Ganado)</th>
                <th style={{ ...th, textAlign: 'right' }}>AC (Real)</th>
                <th style={{ ...th, textAlign: 'right' }}>%Avance</th>
                <th style={{ ...th, textAlign: 'right' }}>CPI</th>
                <th style={{ ...th, textAlign: 'right' }}>Margen Real</th>
                <th style={{ ...th, textAlign: 'center' }}>Frentes</th>
                <th style={{ ...th, textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {[...rosPorProyecto]
                .sort((a, b) => (b.ro.indicadoresGlobales.margenReal || 0) - (a.ro.indicadoresGlobales.margenReal || 0))
                .map(({ proyecto, ro, frentes: fs, nActividades }, i) => {
                  const meta = proyecto.margenMetaPct || 15;
                  const ind = ro.indicadoresGlobales;
                  const cMargen = colorMargen(ind.margenReal, meta);
                  const cCPI = colorCPI(ind.CPI);
                  const estado = ESTADOS[proyecto.estado] || ESTADOS.planificado;
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                  return (
                    <tr key={proyecto.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td, fontSize: '15px', fontWeight: '900', textAlign: 'center', width: '46px' }}>{medal}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: proyecto.color || BASE.navy }} />
                          <div>
                            <p style={{ fontSize: '10px', fontWeight: '900', color: proyecto.color, fontFamily: 'monospace' }}>{proyecto.codigo}</p>
                            <p style={{ fontSize: '12px', color: BASE.text, fontWeight: '700' }}>{proyecto.nombre}</p>
                            <p style={{ fontSize: '10px', color: BASE.muted }}>📍 {proyecto.ubicacion?.ciudad || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{
                          background: estado.c + '22', color: estado.c,
                          padding: '3px 8px', borderRadius: '8px',
                          fontSize: '9.5px', fontWeight: '900',
                        }}>{estado.i} {estado.l}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(ro.totales.BAC)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(ro.totales.vendido)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(ro.totales.costoReal)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtPct(ind.pctAvanceFisico)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cCPI }}>{ind.CPI?.toFixed(2) || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cMargen }}>
                        {fmtPct(ind.margenReal)}
                      </td>
                      <td style={{ ...td, textAlign: 'center', fontFamily: 'monospace', fontWeight: '700' }}>
                        {fs.length} ({nActividades} act.)
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button onClick={() => setProyectoActivoId(proyecto.id)} style={{
                          padding: '5px 11px', borderRadius: '6px',
                          background: proyecto.color || BASE.navy, color: '#fff', border: 'none',
                          fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                        }}>📍 Activar</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ALERTAS GLOBALES ── */}
      {alertas.length > 0 && (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BASE.border}`, background: '#fee2e2', borderLeft: `4px solid ${BASE.red}` }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: '#991b1b', letterSpacing: '0.5px' }}>
              🚨 ALERTAS DE PORTFOLIO ({alertas.length})
            </p>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {alertas.map((a, i) => {
              const c = a.nivel === 'CRITICO' ? BASE.red : '#f59e0b';
              return (
                <div key={i} style={{
                  background: c + '12', border: `1px solid ${c}55`,
                  borderLeft: `4px solid ${c}`, borderRadius: '8px',
                  padding: '9px 12px',
                  display: 'flex', gap: '10px', alignItems: 'center',
                }}>
                  <span style={{ background: c, color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: '900' }}>
                    {a.nivel}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: a.proyecto.color || BASE.navy, fontFamily: 'monospace' }}>
                    {a.proyecto.codigo}
                  </span>
                  <span style={{ fontSize: '12px', color: BASE.text, flex: 1 }}>{a.mensaje}</span>
                  <button onClick={() => setProyectoActivoId(a.proyecto.id)} style={{
                    padding: '4px 10px', borderRadius: '6px', background: BASE.navy, color: '#fff', border: 'none',
                    fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                  }}>Investigar →</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
        {extra && <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{extra}</span>}
      </div>
      {children}
    </div>
  );
}

const th = { padding: '11px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', fontSize: '11.5px', color: BASE.text, verticalAlign: 'top' };
