// src/views/TableroLPS.jsx
// Tablero consolidado del Last Planner System estilo "Power BI":
// 6 paneles en una sola pantalla (read-only) — Lookahead, Restricciones,
// Plan semanal, PPC (gauge + tendencia), CNC Pareto, Indicadores.

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from 'recharts';
import { BASE } from '../utils/styles';
import { calcularEstadoRestriccion, calcularKPIRestricciones, fmtFechaCorta } from '../utils/helpers';

const panel = {
  background: BASE.white,
  border: `1px solid ${BASE.border}`,
  borderRadius: '12px',
  padding: '14px 16px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
  display: 'flex', flexDirection: 'column', gap: '10px',
};
const titulo = {
  fontSize: '12px', fontWeight: '900', color: BASE.navy,
  letterSpacing: '0.4px', textTransform: 'uppercase',
};

const EST_COMPROMISO = {
  cumplido:    { bg: '#16a34a', label: 'Completado' },
  incumplido:  { bg: '#dc2626', label: 'Incumplido' },
  pendiente:   { bg: '#d97706', label: 'En proceso' },
};
const EST_RESTRICCION = {
  liberada:   '#16a34a',
  en_proceso: '#d97706',
  pendiente:  '#64748b',
  vencida:    '#dc2626',
};

export default function TableroLPS({
  compromisos = [],
  restricciones = [],
  ppcSemanal = [],
  pareto = { items: [] },
  diag = {},
  semanaActiva,
}) {
  // ── 1. Lookahead 6 semanas (actividad × semana) ───────────────
  const lookahead = useMemo(() => {
    const semanas = Array.from({ length: 6 }, (_, i) => semanaActiva + i);
    const actividades = Array.from(new Set(compromisos.map(c => c.actividad).filter(Boolean))).slice(0, 12);
    const filas = actividades.map(act => {
      const celdas = semanas.map(sem => {
        const cs = compromisos.filter(c => c.actividad === act && c.semana === sem);
        if (cs.length === 0) return null;
        if (cs.some(c => c.cumplido === false)) return 'incumplido';
        if (cs.every(c => c.cumplido === true)) return 'cumplido';
        return 'pendiente';
      });
      return { actividad: act, celdas };
    });
    return { semanas, filas };
  }, [compromisos, semanaActiva]);

  // ── 2. Restricciones (con estado) ─────────────────────────────
  const restriccionesView = useMemo(() => {
    return (restricciones || [])
      .map(r => ({ ...r, _estado: calcularEstadoRestriccion(r) }))
      .sort((a, b) => (a._estado === 'liberada' ? 1 : 0) - (b._estado === 'liberada' ? 1 : 0))
      .slice(0, 10);
  }, [restricciones]);
  const kpiRestr = useMemo(() => calcularKPIRestricciones(restricciones), [restricciones]);

  // ── 3. Plan de trabajo semanal (compromisos de la semana) ─────
  const planSemana = useMemo(() => {
    return compromisos
      .filter(c => c.semana === semanaActiva)
      .slice(0, 12)
      .map(c => ({
        actividad: c.actividad,
        capataz: c.capataz || '—',
        estado: c.cumplido === true ? 'cumplido' : c.cumplido === false ? 'incumplido' : 'pendiente',
      }));
  }, [compromisos, semanaActiva]);

  // ── 4. PPC ─────────────────────────────────────────────────────
  const ppcTrend = useMemo(() =>
    (ppcSemanal || []).slice(-6).map(s => ({ semana: `S${s.semana}`, ppc: s.ppcPct ?? 0 })),
  [ppcSemanal]);
  const ppcActual = ppcTrend.length ? ppcTrend[ppcTrend.length - 1].ppc : (diag.promedioPct ?? 0);
  const ppcColor = ppcActual >= 80 ? '#16a34a' : ppcActual >= 65 ? '#d97706' : '#dc2626';

  // ── 5. CNC Pareto ──────────────────────────────────────────────
  const cnc = useMemo(() =>
    (pareto.items || []).map(i => ({ causa: i.label, cantidad: i.count, color: i.color || '#64748b' })),
  [pareto]);

  // ── 6. Indicadores ─────────────────────────────────────────────
  const totalComp = compromisos.length;
  const cumplidos = compromisos.filter(c => c.cumplido === true).length;
  const incumplidos = compromisos.filter(c => c.cumplido === false).length;
  const pendientes = compromisos.filter(c => c.cumplido == null).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* KPIs superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        {[
          { l: 'PPC ACTUAL', v: `${ppcActual}%`, c: ppcColor, sub: diag.diagnostico || '—' },
          { l: 'COMPROMISOS', v: totalComp, c: BASE.navy, sub: `${cumplidos} ✓ · ${incumplidos} ✕ · ${pendientes} ⏳` },
          { l: 'RESTRICCIONES', v: kpiRestr.total, c: '#7c3aed', sub: `${kpiRestr.liberadas} liberadas · ${kpiRestr.vencidas} vencidas` },
          { l: 'SEMANA ACTIVA', v: `S${semanaActiva}`, c: '#0891b2', sub: 'Lookahead 6 sem' },
        ].map(k => (
          <div key={k.l} style={{ ...panel, padding: '10px 14px', gap: '2px' }}>
            <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{k.l}</p>
            <p style={{ fontSize: '22px', fontWeight: '900', color: k.c, lineHeight: 1.1 }}>{k.v}</p>
            <p style={{ fontSize: '9.5px', color: BASE.muted, fontWeight: '600' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Fila 1: Lookahead + Restricciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '12px' }}>
        {/* 1. Lookahead */}
        <div style={panel}>
          <p style={titulo}>1 · Planificación a 6 semanas (Lookahead)</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '420px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: BASE.muted, fontSize: '10px', fontWeight: '800', borderBottom: `1px solid ${BASE.border}` }}>ACTIVIDAD</th>
                  {lookahead.semanas.map(s => (
                    <th key={s} style={{ padding: '6px 4px', color: BASE.navy, fontSize: '10px', fontWeight: '800', borderBottom: `1px solid ${BASE.border}` }}>S{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lookahead.filas.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: BASE.muted }}>Sin compromisos cargados</td></tr>
                ) : lookahead.filas.map(f => (
                  <tr key={f.actividad}>
                    <td style={{ padding: '5px 8px', fontWeight: '700', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{f.actividad}</td>
                    {f.celdas.map((c, i) => (
                      <td key={i} style={{ padding: '5px 4px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', width: '22px', height: '14px', borderRadius: '3px',
                          background: c ? EST_COMPROMISO[c].bg : BASE.bgSoft,
                          border: c ? 'none' : `1px solid ${BASE.border}`,
                        }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.values(EST_COMPROMISO).map(e => (
              <span key={e.label} style={{ fontSize: '9.5px', color: BASE.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: e.bg }} />{e.label}
              </span>
            ))}
          </div>
        </div>

        {/* 2. Restricciones */}
        <div style={panel}>
          <p style={titulo}>2 · Análisis de Restricciones</p>
          <div style={{ overflowX: 'auto', maxHeight: '260px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '380px' }}>
              <thead>
                <tr>
                  {['Restricción', 'Responsable', 'Fecha', 'Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: BASE.muted, fontSize: '10px', fontWeight: '800', borderBottom: `1px solid ${BASE.border}`, position: 'sticky', top: 0, background: BASE.white }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {restriccionesView.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: BASE.muted }}>Sin restricciones</td></tr>
                ) : restriccionesView.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: `1px solid ${BASE.borderSoft}` }}>
                    <td style={{ padding: '6px 8px', fontWeight: '600', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion || r.actividad || '—'}</td>
                    <td style={{ padding: '6px 8px', color: BASE.muted }}>{r.responsable || '—'}</td>
                    <td style={{ padding: '6px 8px', color: BASE.muted, fontFamily: 'monospace', fontSize: '10px' }}>{r.fechaCompromisoLiberacion ? fmtFechaCorta(r.fechaCompromisoLiberacion) : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '700', color: EST_RESTRICCION[r._estado] || BASE.muted }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: EST_RESTRICCION[r._estado] || BASE.muted }} />
                        {r._estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fila 2: Plan semanal + PPC */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '12px' }}>
        {/* 3. Plan de trabajo semanal */}
        <div style={panel}>
          <p style={titulo}>3 · Plan de Trabajo Semanal (S{semanaActiva})</p>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {planSemana.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>Sin compromisos para la semana {semanaActiva}</p>
            ) : planSemana.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '7px 10px', borderBottom: `1px solid ${BASE.borderSoft}`,
              }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: EST_COMPROMISO[p.estado].bg, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '11.5px', fontWeight: '600', color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.actividad}</span>
                <span style={{ fontSize: '10px', color: BASE.muted }}>👷 {p.capataz}</span>
                <span style={{ fontSize: '9.5px', fontWeight: '800', color: EST_COMPROMISO[p.estado].bg }}>{EST_COMPROMISO[p.estado].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. PPC gauge + tendencia */}
        <div style={panel}>
          <p style={titulo}>4 · PPC · Porcentaje de Plan Cumplido</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: '110px', height: '110px', borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(${ppcColor} ${ppcActual * 3.6}deg, ${BASE.bgSoft} 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '82px', height: '82px', borderRadius: '50%', background: BASE.white,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '24px', fontWeight: '900', color: ppcColor, lineHeight: 1 }}>{ppcActual}%</span>
                <span style={{ fontSize: '8.5px', color: BASE.muted, fontWeight: '700' }}>PPC ACTUAL</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px', height: '120px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ppcTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} />
                  <XAxis dataKey="semana" tick={{ fontSize: 10, fill: BASE.muted }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: BASE.muted }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'PPC']} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="ppc" stroke={ppcColor} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 3: CNC Pareto + Indicadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '12px' }}>
        {/* 5. CNC Pareto */}
        <div style={panel}>
          <p style={titulo}>5 · CNC · Causas de Incumplimiento</p>
          {cnc.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>Sin causas registradas (no hay incumplimientos con RNC)</p>
          ) : (
            <div style={{ height: `${Math.max(160, cnc.length * 34)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cnc} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: BASE.muted }} />
                  <YAxis type="category" dataKey="causa" width={130} tick={{ fontSize: 10, fill: BASE.text }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fontWeight: 800 }}>
                    {cnc.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 6. Indicadores */}
        <div style={panel}>
          <p style={titulo}>6 · Indicadores de Gestión</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { l: 'Compromisos cumplidos', v: `${cumplidos}/${totalComp}`, c: '#16a34a' },
              { l: 'Compromisos incumplidos', v: incumplidos, c: '#dc2626' },
              { l: 'Restricciones pendientes', v: kpiRestr.pendientes, c: '#d97706' },
              { l: 'Restricciones vencidas', v: kpiRestr.vencidas, c: '#dc2626' },
              { l: 'Restricciones liberadas', v: kpiRestr.liberadas, c: '#16a34a' },
              { l: 'PPC promedio (4 sem)', v: `${diag.promedioPct ?? '—'}%`, c: ppcColor },
            ].map(k => (
              <div key={k.l} style={{ background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.muted }}>{k.l.toUpperCase()}</p>
                <p style={{ fontSize: '18px', fontWeight: '900', color: k.c, marginTop: '2px' }}>{k.v}</p>
              </div>
            ))}
          </div>
          {diag.diagnostico && (
            <div style={{ background: `${ppcColor}10`, border: `1px solid ${ppcColor}40`, borderRadius: '8px', padding: '10px 12px' }}>
              <p style={{ fontSize: '10px', fontWeight: '800', color: ppcColor }}>DIAGNÓSTICO LPS</p>
              <p style={{ fontSize: '11.5px', color: BASE.text, marginTop: '3px', lineHeight: 1.4 }}>{diag.diagnostico}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
