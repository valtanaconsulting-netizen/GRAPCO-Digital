// src/views/planeamiento/SectorizacionTren.jsx
// SECTORIZACIÓN · TREN DE ACTIVIDADES — tal cual el Excel de calzaduras.
// Actividades × días; cada celda = el sector (A1S1 = Anillo 1, Sector 1) que la
// cuadrilla avanza ese día. Data: src/data/sectorizacionCreditex.js

import React from 'react';
import { BASE } from '../../utils/styles';
import { SECTORIZACION } from '../../data/sectorizacionCreditex';

// Anillos con la paleta premium GRAPCO armonizada (azul real · teal · dorado · violeta).
const ANILLO_COLOR = { '1': '#1D4ED8', '2': '#0E7490', '3': '#E5A82F', '4': '#7E22CE' };
const colorDe = (cod) => ANILLO_COLOR[(cod && cod.match(/^A(\d+)/) || [])[1]] || BASE.muted;
const nf = (n, d = 0) => (n == null ? '' : Number(n).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }));

export default function SectorizacionTren() {
  const S = SECTORIZACION;
  const cols = S.dias || Math.max(0, ...S.actividades.map(a => a.grid.length));
  const dias = Array.from({ length: cols }, (_, i) => i + 1);
  const totHH = S.actividades.reduce((s, a) => s + (a.hh || 0), 0);
  const LW = 320, DW = 34;

  const td = { padding: '5px 6px', borderRight: '1px solid #eef2f6', fontSize: '10px' };
  const tn = { ...td, textAlign: 'right', fontFamily: 'monospace' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff', borderRadius: '14px', padding: '18px 24px', borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 12px 32px -20px rgba(8,26,46,0.8)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.6px' }}>🧩 SECTORIZACIÓN · TREN DE ACTIVIDADES (GP-GCR-FOR-F09)</p>
        <h1 style={{ fontSize: '21px', fontWeight: 900, marginTop: '4px' }}>{S.titulo}</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
          Cada celda = el <strong>sector</strong> que avanza la cuadrilla ese día (A1S1 = Anillo 1, Sector 1). El flujo en diagonal es el <strong>tren</strong>.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {[['ACTIVIDADES', S.actividades.length], ['SECTORES', S.sectores], ['ANILLOS', S.anillos], ['HH TOTAL', Math.round(totHH)]].map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 16px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.8px' }}>{l}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, marginTop: '1px' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* leyenda anillos */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: BASE.muted, padding: '0 4px', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: BASE.navy }}>Anillos:</span>
        {S.anillos && Array.from({ length: S.anillos }, (_, i) => String(i + 1)).map(a => (
          <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: ANILLO_COLOR[a] }} /> Anillo {a}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Tal cual el Excel · scroll horizontal →</span>
      </div>

      {/* MATRIZ */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
          <div style={{ minWidth: LW + cols * DW }}>
            {/* cabecera */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: BASE.navy, color: '#fff', borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '9px', fontWeight: 900, borderRight: `2px solid ${BASE.navyDark}`, height: 30 }}>
                <span style={{ flex: 1 }}>ACTIVIDAD</span>
                {['MET', 'UND', 'SEC', 'IP', 'HH', 'MO'].map(h => <span key={h} style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>{h}</span>)}
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {dias.map(d => <div key={d} style={{ flex: 1, minWidth: DW, textAlign: 'center', fontSize: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)' }}>D{d}</div>)}
              </div>
            </div>
            {/* filas */}
            {S.actividades.map((a, ai) => (
              <div key={ai} style={{ display: 'flex', borderBottom: '1px solid #eef2f6', minHeight: 28, background: ai % 2 ? '#f8fbff' : '#fff' }}>
                <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', borderRight: `2px solid ${BASE.border}` }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '10px', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.actividad}>
                    <b style={{ color: BASE.navy }}>{a.cod} </b>{a.actividad}
                  </span>
                  <span style={tn}>{nf(a.metrado, a.metrado < 100 ? 1 : 0)}</span>
                  <span style={{ ...td, width: 32, textAlign: 'right', color: BASE.muted }}>{a.und || ''}</span>
                  <span style={tn}>{a.sectores != null ? a.sectores : ''}</span>
                  <span style={tn}>{a.ip != null ? Number(a.ip).toFixed(2) : ''}</span>
                  <span style={{ ...tn, fontWeight: 800, color: BASE.navy }}>{a.hh != null ? Math.round(a.hh) : ''}</span>
                  <span style={tn}>{a.mo != null ? a.mo : ''}</span>
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {dias.map((d, i) => {
                    const sec = a.grid[i];
                    const col = sec ? colorDe(sec) : null;
                    return (
                      <div key={i} title={sec ? `${a.cod} · ${sec}` : ''} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #eef2f6', background: sec ? `${col}20` : 'transparent' }}>
                        {sec && <span style={{ fontSize: '7.5px', fontWeight: 800, color: col, background: '#fff', border: `1px solid ${col}66`, borderRadius: '3px', padding: '1px 2px', whiteSpace: 'nowrap' }}>{sec}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importado del Excel de sectorización (GP-GCR-FOR-F09). El sector recorre A#S1→A#S6 por anillo; el desfase entre actividades es el tren Lean (excavación adelante, curado atrás).
      </p>
    </div>
  );
}
