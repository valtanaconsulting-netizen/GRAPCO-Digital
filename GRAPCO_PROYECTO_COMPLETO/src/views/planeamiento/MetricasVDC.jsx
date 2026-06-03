// src/views/planeamiento/MetricasVDC.jsx
// MÉTRICAS VDC del cronograma (GP-GCA-FOR-F13) — tablero ejecutivo: objetivos VDC
// (OP/ICE/PPM/FC) con su evolución de 6 reportes vs meta. Data: src/data/vdcMetricas.js

import React, { useEffect, useMemo, useState } from 'react';
import { BASE } from '../../utils/styles';

const FAM_ICON = { OP: '🏭', ICE: '🤝', PPM: '📐', FC: '🎛️' };
const FAM_COLOR = { OP: '#0ea5e9', ICE: '#7c3aed', PPM: '#0d9488', FC: '#d97706' };

export default function MetricasVDC() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let v = true;
    import('../../data/vdcMetricas').then(m => { if (v) setData({ list: m.VDC_METRICAS || [], fam: m.VDC_FAMILIAS || {} }); }).catch(() => {});
    return () => { v = false; };
  }, []);

  const grupos = useMemo(() => {
    if (!data) return [];
    const m = {};
    data.list.forEach(x => { const k = x.familia || 'OTROS'; (m[k] || (m[k] = [])).push(x); });
    return Object.keys(m).map(k => ({ fam: k, label: data.fam[k] || k, items: m[k] }));
  }, [data]);

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando métricas VDC…</div>;
  const total = data.list.length;
  const cumplen = data.list.filter(x => x.cumple === true).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: 1180, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff', borderRadius: '16px', padding: '20px 26px', borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 14px 36px -20px rgba(8,26,46,0.8)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.8px' }}>🎯 MÉTRICAS VDC · CRONOGRAMA (GP-GCA-FOR-F13)</p>
        <h1 style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>Tablero de Objetivos VDC</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Evolución de 6 reportes vs meta · cierra el aprendizaje del Last Planner.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {[['OBJETIVOS', total, BASE.gold], ['CUMPLEN META', `${cumplen}/${total}`, '#86efac'], ['FAMILIAS VDC', grupos.length, '#93c5fd']].map(([l, v, c]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 16px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: c, letterSpacing: '0.8px' }}>{l}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, marginTop: '1px' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAMILIAS */}
      {grupos.map(g => {
        const col = FAM_COLOR[g.fam] || BASE.navy;
        return (
          <div key={g.fam} style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, borderLeft: `5px solid ${col}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', background: `linear-gradient(90deg, ${col}12, transparent)` }}>
              <span style={{ fontSize: '20px' }}>{FAM_ICON[g.fam] || '📊'}</span>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: BASE.navy }}>{g.fam} · {g.label}</h3>
                <p style={{ fontSize: '10.5px', color: BASE.muted }}>{g.items.filter(i => i.cumple === true).length}/{g.items.length} cumplen meta</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '10px', padding: '4px 16px 16px' }}>
              {g.items.map((m, i) => {
                const ok = m.cumple === true;
                const finalColor = m.cumple == null ? BASE.navy : ok ? BASE.greenDark : BASE.red;
                const maxV = m.esPct ? 100 : Math.max(1, ...m.valores.filter(v => v != null));
                return (
                  <div key={i} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `3px solid ${col}`, borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: col, background: `${col}14`, borderRadius: '5px', padding: '2px 8px' }}>{m.codigo}</span>
                      <span style={{ fontSize: '8.5px', fontWeight: 900, color: ok ? '#15803d' : m.cumple === false ? '#dc2626' : BASE.muted, background: ok ? '#dcfce7' : m.cumple === false ? '#fee2e2' : '#eef2f6', borderRadius: '999px', padding: '2px 9px' }}>
                        {m.cumple == null ? '—' : ok ? '✓ CUMPLE' : '✗ NO CUMPLE'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11.5px', fontWeight: 700, color: BASE.text, marginTop: '6px', lineHeight: 1.3, minHeight: 30 }}>{m.nombre}</p>
                    {/* sparkline 6 reportes */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 38, marginTop: '8px' }}>
                      {m.valores.map((v, vi) => {
                        const h = v == null ? 0 : Math.max(3, Math.round(v / maxV * 34));
                        const ultimo = vi === m.valores.map((x, k) => x != null ? k : -1).filter(k => k >= 0).pop();
                        return (
                          <div key={vi} title={`Reporte ${vi + 1}: ${v == null ? '—' : v + (m.esPct ? '%' : '')}`} style={{ flex: 1, height: `${h}px`, background: vi === ultimo ? finalColor : '#cbd5e1', borderRadius: '2px 2px 0 0' }} />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span><b style={{ fontSize: '24px', fontWeight: 900, color: finalColor }}>{m.final == null ? '—' : m.final}{m.esPct ? '%' : ''}</b> <span style={{ fontSize: '9px', color: BASE.muted }}>actual</span></span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted }}>meta {m.meta}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importado del Excel oficial GP-GCA-FOR-F13. Barras = 6 reportes de avance; la última (color) es el valor vigente vs la meta.
      </p>
    </div>
  );
}
