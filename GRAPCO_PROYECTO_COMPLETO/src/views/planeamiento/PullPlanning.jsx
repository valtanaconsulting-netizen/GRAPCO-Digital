// src/views/planeamiento/PullPlanning.jsx
// PULL PLANNING (GP-GCR-FOR-F14) — PTARI CREDITEX.
// Dos paneles: (1) DECISIÓN DE PLAZO (alternativa elegida: inicio/fin/laborales/meses)
// y (2) TREN DE ACTIVIDADES (matriz tipo LAP: actividades × días, cada celda = "X"
// avance o el código de sector A1/S1/A1S1/C1...). Data: src/data/pullPlanningCreditex.js
// Estilo GRAPCO premium (header navy + gold, matriz cebra con cabecera sticky).

import React from 'react';
import { BASE } from '../../utils/styles';
import { PULLPLANNING } from '../../data/pullPlanningCreditex';

// ---- color por código de celda ----
// Sector "S#", anillo "A#", combinado "A#S#" / "S#A#", concreto "C#", avance "X".
const PALETA = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626'];
function colorDe(v) {
  if (!v) return null;
  const s = String(v).toUpperCase();
  if (s === 'X') return BASE.gold;
  const mA = s.match(/A(\d+)/);
  const mS = s.match(/S(\d+)/);
  const mC = s.match(/^C(\d+)/);
  let idx = 0;
  if (mC) return '#475569';
  if (mA) idx = (parseInt(mA[1], 10) - 1) % PALETA.length;
  else if (mS) idx = (parseInt(mS[1], 10) - 1) % PALETA.length;
  else return BASE.muted;
  return PALETA[idx];
}

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${m[3]} ${meses[+m[2] - 1]} ${m[1]}`;
};
const nf = (n, d = 0) => (n == null ? '' : Number(n).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }));

export default function PullPlanning() {
  const P = PULLPLANNING;
  const dias = P.dias || [];
  const cols = dias.length;
  const filas = P.actividades || [];
  const reales = filas.filter(a => a.tipo === 'actividad');
  const secciones = filas.filter(a => a.tipo === 'seccion');
  const totHH = reales.reduce((s, a) => s + (a.hh || 0), 0);
  const totMO = reales.reduce((s, a) => s + (a.mo || 0), 0);
  const totMarcas = filas.reduce((s, a) => s + (a.grid ? a.grid.filter(x => x != null).length : 0), 0);
  const dec = (P.decision && P.decision[0]) || null;

  const LW = 300, DW = 26;
  const td = { padding: '4px 6px', fontSize: '10px' };
  const tn = { ...td, textAlign: 'right', fontFamily: 'ui-monospace, monospace' };

  const kpis = [
    ['ACTIVIDADES', reales.length],
    ['DÍAS PLAZO', P.diasPlazo ?? cols],
    ['LABORALES', dec ? dec.laborales : '—'],
    ['MESES', P.meses ?? (dec ? dec.meses : '—')],
    ['HH TOTAL', Math.round(totHH).toLocaleString('es-PE')],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ===== HEADER ===== */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff', borderRadius: '14px', padding: '18px 24px', borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 12px 32px -20px rgba(8,26,46,0.8)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.6px', margin: 0 }}>📅 PULL PLANNING · TREN DE ACTIVIDADES (GP-GCR-FOR-F14)</p>
        <h1 style={{ fontSize: '21px', fontWeight: 900, marginTop: '4px', marginBottom: 0 }}>{P.titulo}</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px', marginBottom: 0 }}>
          {P.cliente} · {P.ubicacion} · Plan colaborativo del último responsable: cada celda es el <strong>avance del día</strong> ({'"X"'} o el código de sector). El desfase en diagonal es el <strong>tren Lean</strong>.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {kpis.map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 16px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.8px', margin: 0 }}>{l}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, marginTop: '1px', marginBottom: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== DECISIÓN DE PLAZO ===== */}
      {dec && (
        <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '14px 18px', boxShadow: BASE.shadowSm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.5px' }}>DECISIÓN DE PLAZO</span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', background: BASE.gold, borderRadius: '999px', padding: '2px 10px' }}>{dec.alternativa}</span>
            <span style={{ fontSize: '10px', color: BASE.muted, marginLeft: 'auto' }}>Jornada {P.jornadaHHdia || 8} HH/día · Elab. {P.elaboradoPor || '—'} · Rev. {P.revisadoPor || '—'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            {[
              ['Fecha inicio', fmtFecha(dec.inicio), BASE.navy],
              ['Fecha fin', fmtFecha(dec.fin), BASE.navy],
              ['Días laborales', nf(dec.laborales), '#0d9488'],
              ['Domingos', nf(dec.domingos), BASE.muted],
              ['Feriados', nf(dec.feriados), BASE.muted],
              ['Calendario', nf(dec.calendario) + ' d', '#7c3aed'],
              ['Meses de plazo', nf(dec.meses, 1), BASE.gold],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: '#f8fbff', border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '8px 12px' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', margin: 0, textTransform: 'uppercase' }}>{l}</p>
                <p style={{ fontSize: '15px', fontWeight: 900, color: c, marginTop: '2px', marginBottom: 0, fontFamily: /\d{4}/.test(String(v)) ? 'ui-monospace, monospace' : 'inherit' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== LEYENDA ===== */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: BASE.muted, padding: '0 4px', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: BASE.navy }}>Leyenda:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '3px', background: BASE.gold }} /> Avance (X)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '3px', background: PALETA[0] }} /> Anillo / Sector
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#475569' }} /> Concreto (C#)
        </span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>{totMarcas.toLocaleString('es-PE')} marcas · {cols} columnas · scroll horizontal →</span>
      </div>

      {/* ===== MATRIZ DEL TREN ===== */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
          <div style={{ minWidth: LW + cols * DW }}>
            {/* cabecera sticky */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: BASE.navy, color: '#fff', borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '9px', fontWeight: 900, borderRight: `2px solid ${BASE.navyDark}`, height: 30, position: 'sticky', left: 0, zIndex: 1, background: BASE.navy }}>
                <span style={{ flex: 1 }}>ACTIVIDAD</span>
                {['MET', 'UND', 'SEC', 'IP', 'HH', 'MO'].map(h => <span key={h} style={{ width: 30, textAlign: 'right', flexShrink: 0 }}>{h}</span>)}
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {dias.map((d, i) => (
                  <div key={i} style={{ flex: 1, minWidth: DW, textAlign: 'center', fontSize: '7.5px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', color: d == null ? BASE.gold : '#fff' }}>
                    {d == null ? '·' : d}
                  </div>
                ))}
              </div>
            </div>

            {/* filas */}
            {filas.map((a, ai) => {
              const esSeccion = a.tipo === 'seccion';
              const zebra = ai % 2 ? '#f8fbff' : '#fff';
              if (esSeccion) {
                return (
                  <div key={ai} style={{ display: 'flex', borderBottom: '1px solid #e3e9f2', minHeight: 24, background: '#eef3fb' }}>
                    <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px', borderRight: `2px solid ${BASE.border}`, position: 'sticky', left: 0, zIndex: 1, background: '#eef3fb' }}>
                      <span style={{ fontSize: '8px', fontWeight: 900, color: '#fff', background: BASE.navy, borderRadius: '4px', padding: '1px 5px' }}>{a.nivel || a.cod}</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: BASE.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.actividad}>{a.actividad}</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {dias.map((d, i) => {
                        const v = a.grid ? a.grid[i] : null;
                        const c = colorDe(v);
                        return (
                          <div key={i} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e3e9f2', background: v ? `${c}26` : 'transparent' }}>
                            {v && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <div key={ai} style={{ display: 'flex', borderBottom: '1px solid #eef2f6', minHeight: 26, background: zebra }}>
                  <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', borderRight: `2px solid ${BASE.border}`, position: 'sticky', left: 0, zIndex: 1, background: zebra }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '10px', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.actividad || a.seccion}>
                      {a.cod && <b style={{ color: BASE.navy }}>{a.cod} </b>}
                      {a.actividad || <span style={{ color: BASE.muted, fontStyle: 'italic' }}>↳ {a.seccion}</span>}
                    </span>
                    <span style={tn}>{a.metrado != null ? nf(a.metrado, a.metrado < 100 ? 1 : 0) : ''}</span>
                    <span style={{ ...td, width: 30, textAlign: 'right', color: BASE.muted }}>{a.und || ''}</span>
                    <span style={tn}>{a.sectores != null ? a.sectores : ''}</span>
                    <span style={tn}>{a.ip != null ? Number(a.ip).toFixed(2) : ''}</span>
                    <span style={{ ...tn, fontWeight: 800, color: BASE.navy }}>{a.hh != null ? Math.round(a.hh) : ''}</span>
                    <span style={tn}>{a.mo != null ? a.mo : ''}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {dias.map((d, i) => {
                      const v = a.grid ? a.grid[i] : null;
                      const c = colorDe(v);
                      const esX = v && String(v).toUpperCase() === 'X';
                      return (
                        <div key={i} title={v ? `${a.actividad || a.seccion || ''} · día ${d ?? '·'} · ${v}` : ''} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #eef2f6', background: v ? `${c}1f` : 'transparent' }}>
                          {v && (esX
                            ? <span style={{ width: 9, height: 9, borderRadius: '2px', background: c }} />
                            : <span style={{ fontSize: '6.5px', fontWeight: 800, color: c, background: '#fff', border: `1px solid ${c}77`, borderRadius: '3px', padding: '0 1px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>{v}</span>)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic', marginTop: '2px' }}>
        Importado del Excel de Pull Planning (GP-GCR-FOR-F14) · alternativa {dec ? dec.alternativa : '—'} · {reales.length} actividades en {secciones.length} secciones, {cols} días de horizonte.
      </p>
    </div>
  );
}
