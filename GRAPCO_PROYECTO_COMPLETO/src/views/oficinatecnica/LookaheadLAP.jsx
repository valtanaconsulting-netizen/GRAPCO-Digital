// src/views/oficinatecnica/LookaheadLAP.jsx
// LOOKAHEAD PLANNING (LAP) · Last Planner System — visor de las 28 semanas LAP
// del proyecto PTARI CREDITEX. Selector de semana + Gantt de programación + curva
// de evolución de HH planificadas. Data: src/data/lapCreditex.js (generada del Excel).

import React, { useEffect, useMemo, useState } from 'react';
import { BASE } from '../../utils/styles';
// La data LAP (~667 KB) se carga bajo demanda al abrir esta vista, para no inflar
// el chunk de Oficina Técnica de quienes nunca abren el Lookahead.

// ── utilidades de fecha (ISO 'YYYY-MM-DD' sin desfases de zona) ──
const parseISO = (s) => { const [y, m, d] = (s || '').split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const dayDiff = (a, b) => Math.round((b - a) / 86400000);
const fmtDM = (s) => { const d = parseISO(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
const MES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const nf = (n, dec = 0) => (n == null ? '—' : Number(n).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec }));

const PALETA = ['#0ea5e9', '#7c3aed', '#0d9488', '#f59e0b', '#e11d48', '#2563eb', '#65a30d', '#c026d3'];
const DAY_W = 11;       // px por día en el Gantt
const LEFT_W = 372;     // ancho del bloque fijo de columnas

export default function LookaheadLAP() {
  const [lap, setLap] = useState(null);
  const [sel, setSel] = useState(null);
  useEffect(() => {
    let vivo = true;
    import('../../data/lapCreditex').then(m => {
      if (!vivo) return;
      const arr = [...m.LAP_CREDITEX].sort((a, b) => (a.semana || 0) - (b.semana || 0));
      setLap(arr);
      setSel(arr[arr.length - 1]?.semana ?? null);
    });
    return () => { vivo = false; };
  }, []);

  const semanasDisp = lap || [];
  const data = useMemo(() => semanasDisp.find(s => s.semana === sel) || semanasDisp[semanasDisp.length - 1], [semanasDisp, sel]);
  const maxHH = useMemo(() => Math.max(1, ...semanasDisp.map(s => s.kpis?.totalHH || 0)), [semanasDisp]);

  if (!lap) return <div style={{ ...card, padding: '40px', textAlign: 'center', color: BASE.muted }}>Cargando programación LAP…</div>;
  if (!data) return <div style={{ ...card, padding: '40px', textAlign: 'center', color: BASE.muted }}>Sin datos LAP.</div>;

  // ── Geometría del Gantt para la semana seleccionada ──
  const start = parseISO(data.fechaIni), end = parseISO(data.fechaFin);
  const span = Math.max(1, dayDiff(start, end) + 1);
  const totalW = span * DAY_W;
  const xDe = (iso) => dayDiff(start, parseISO(iso)) * DAY_W;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyX = (hoy >= start && hoy <= end) ? dayDiff(start, hoy) * DAY_W : null;

  // Límites de mes (para rótulos del eje).
  const meses = [];
  { let cur = new Date(start); while (cur <= end) { const x = dayDiff(start, cur) * DAY_W; meses.push({ x, label: `${MES_ES[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}` }); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); } }

  // Asignar color de sección a cada actividad (por grupo N1/N2).
  let ci = -1, colorSec = PALETA[0];
  const filas = data.actividades.map((a) => {
    if (a.tipo === 'grupo' && (a.nivel === 'N1' || a.nivel === 'N2')) { ci = (ci + 1) % PALETA.length; colorSec = PALETA[ci]; }
    return { ...a, color: colorSec };
  });

  const k = data.kpis || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff',
        borderRadius: '14px', padding: '16px 22px', borderLeft: `5px solid ${BASE.gold}`,
        boxShadow: '0 10px 28px -16px rgba(8,26,46,0.8)',
      }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.6px' }}>
          📆 LAST PLANNER SYSTEM · LOOKAHEAD PLANNING
        </p>
        <h2 style={{ fontSize: '20px', fontWeight: 900, marginTop: '3px' }}>Programación intermedia (LAP) — {data.proyecto}</h2>
        <p style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '3px' }}>
          {semanasDisp.length} semanas importadas del Excel oficial · cada barra = ventana programada de la actividad.
        </p>
      </div>

      {/* EVOLUCIÓN HH por semana (mini barras clicables) */}
      <div style={{ ...card, padding: '12px 14px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.6px', marginBottom: '8px' }}>
          HH PLANIFICADAS POR SEMANA LAP · <span style={{ color: BASE.navy }}>clic para abrir una semana</span>
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px' }}>
          {semanasDisp.map(s => {
            const h = Math.max(3, Math.round((s.kpis?.totalHH || 0) / maxHH * 60));
            const activo = s.semana === sel;
            return (
              <button key={s.semana} onClick={() => setSel(s.semana)} title={`SEM${s.semana} · ${nf(s.kpis?.totalHH)} HH`}
                style={{
                  flex: 1, minWidth: '8px', height: `${h}px`, border: 'none', cursor: 'pointer', borderRadius: '3px 3px 0 0',
                  background: activo ? BASE.gold : '#cbd5e1', transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!activo) e.currentTarget.style.background = BASE.navy; }}
                onMouseLeave={e => { if (!activo) e.currentTarget.style.background = '#cbd5e1'; }} />
            );
          })}
        </div>
      </div>

      {/* SELECTOR DE SEMANA */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {semanasDisp.map(s => {
          const activo = s.semana === sel;
          return (
            <button key={s.semana} onClick={() => setSel(s.semana)} style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: activo ? 900 : 700,
              background: activo ? BASE.navy : BASE.white, color: activo ? '#fff' : BASE.muted,
              border: `1px solid ${activo ? BASE.navy : BASE.border}`,
            }}>SEM{String(s.semana).padStart(2, '0')}</button>
          );
        })}
      </div>

      {/* KPIs de la semana */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <Kpi l="Periodo" v={`${fmtDM(data.fechaIni)} → ${fmtDM(data.fechaFin)}`} />
        <Kpi l="HH planificadas" v={nf(k.totalHH)} acc={BASE.gold} />
        <Kpi l="Cuadrilla (MO)" v={nf(k.totalMO)} />
        <Kpi l="Tareas programadas" v={`${k.nProgramadas} / ${k.nTareas}`} />
        <Kpi l="Elaboró" v={data.elaboradoPor || '—'} />
        <Kpi l="Revisó" v={data.revisadoPor || '—'} />
      </div>

      {/* GANTT */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
          <div style={{ minWidth: LEFT_W + totalW }}>

            {/* Cabecera del eje */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: BASE.white, borderBottom: `2px solid ${BASE.border}` }}>
              <div style={{ ...leftHead, width: LEFT_W }}>
                <span style={{ flex: 1 }}>ACTIVIDAD</span>
                <span style={colNum}>MET.</span><span style={colNum}>IP</span><span style={colNum}>HH</span><span style={colNum}>MO</span>
              </div>
              <div style={{ position: 'relative', width: totalW, height: '38px' }}>
                {/* bloques SEMANA */}
                {(data.semanas || []).map((b, i) => {
                  const x = xDe(b.ini); const w = (dayDiff(parseISO(b.ini), parseISO(b.fin)) + 1) * DAY_W;
                  return (
                    <div key={i} style={{
                      position: 'absolute', left: x, width: w, top: 0, bottom: 0,
                      borderLeft: `1px solid ${BASE.border}`, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      background: i % 2 ? '#f8fafc' : '#fff',
                    }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: BASE.navy, whiteSpace: 'nowrap' }}>{(b.label || '').replace('SEMANA', 'S')}</span>
                      <span style={{ fontSize: '8px', color: BASE.muted }}>{fmtDM(b.ini)}</span>
                    </div>
                  );
                })}
                {meses.map((mz, i) => (
                  <span key={'m' + i} style={{ position: 'absolute', left: mz.x + 2, top: 1, fontSize: '8px', fontWeight: 800, color: '#94a3b8' }}>{mz.label}</span>
                ))}
              </div>
            </div>

            {/* Filas */}
            <div>
              {filas.map((a, idx) => {
                if (a.tipo === 'grupo') {
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${BASE.border}` }}>
                      <div style={{
                        width: LEFT_W, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px',
                        position: 'sticky', left: 0, zIndex: 2, background: '#f1f5f9',
                        borderLeft: `4px solid ${a.color}`,
                      }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.2px', textTransform: 'uppercase' }}>
                          {a.nivel ? a.nivel + ' · ' : ''}{a.actividad}
                        </span>
                      </div>
                      <div style={{ width: totalW, background: '#f1f5f9' }} />
                    </div>
                  );
                }
                const left = xDe(a.fechaIni);
                const w = a.fechaIni ? Math.max(DAY_W, (dayDiff(parseISO(a.fechaIni), parseISO(a.fechaFin)) + 1) * DAY_W) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid #eef2f6`, minHeight: '26px' }}>
                    <div style={{
                      width: LEFT_W, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px',
                      position: 'sticky', left: 0, zIndex: 2, background: BASE.white,
                    }}>
                      <span style={{ flex: 1, fontSize: '11px', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: a.nivel ? '10px' : 0 }}
                        title={a.actividad}>
                        {a.id ? <b style={{ color: a.color }}>{a.id} </b> : ''}{a.actividad}
                      </span>
                      <span style={colNum}>{a.metrado != null ? nf(a.metrado, a.metrado < 100 ? 1 : 0) : ''}{a.und ? <i style={{ color: BASE.muted, fontStyle: 'normal', fontSize: '8.5px' }}> {a.und}</i> : ''}</span>
                      <span style={colNum}>{a.ip != null ? nf(a.ip, 2) : ''}</span>
                      <span style={{ ...colNum, fontWeight: 800, color: BASE.navy }}>{a.hh != null ? nf(a.hh, 1) : ''}</span>
                      <span style={colNum}>{a.mo != null ? nf(a.mo) : ''}</span>
                    </div>
                    <div style={{ position: 'relative', width: totalW }}>
                      {/* divisores de semana */}
                      {(data.semanas || []).map((b, i) => (
                        <div key={i} style={{ position: 'absolute', left: xDe(b.ini), top: 0, bottom: 0, borderLeft: `1px solid #f1f5f9` }} />
                      ))}
                      {hoyX != null && <div style={{ position: 'absolute', left: hoyX, top: 0, bottom: 0, borderLeft: `1.5px dashed ${BASE.red}` }} />}
                      {a.fechaIni && (
                        <div title={`${fmtDM(a.fechaIni)} → ${fmtDM(a.fechaFin)} · ${a.nDias} día(s)`} style={{
                          position: 'absolute', left, width: w, top: '5px', height: '15px',
                          background: `linear-gradient(180deg, ${a.color}, ${a.color}cc)`,
                          borderRadius: '4px', boxShadow: `0 1px 3px ${a.color}66`,
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      <p style={{ fontSize: '10px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importado tal cual del LAP oficial (GP-GCR-FOR-F03). La barra abarca del primer al último día programado de cada actividad · línea roja punteada = hoy.
      </p>
    </div>
  );
}

function Kpi({ l, v, acc }) {
  return (
    <div style={{
      flex: '1 1 140px', minWidth: '130px', background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '10px', padding: '9px 12px', borderTop: `3px solid ${acc || BASE.navy}`,
    }}>
      <p style={{ fontSize: '9.5px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{l}</p>
      <p style={{ fontSize: '15px', fontWeight: 900, color: BASE.navy, marginTop: '2px' }}>{v}</p>
    </div>
  );
}

const card = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' };
const leftHead = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', fontSize: '9.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.4px', position: 'sticky', left: 0, zIndex: 2, background: BASE.white };
const colNum = { width: '40px', textAlign: 'right', fontSize: '10px', color: BASE.text, flexShrink: 0 };
