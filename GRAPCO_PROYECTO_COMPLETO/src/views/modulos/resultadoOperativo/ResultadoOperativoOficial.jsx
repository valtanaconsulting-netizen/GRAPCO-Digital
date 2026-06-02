// src/views/modulos/resultadoOperativo/ResultadoOperativoOficial.jsx
// Resultado Operativo OFICIAL importado tal cual del Excel GP-GCE-FOR-F06.
// Muestra la tabla EVM completa (Presupuesto/PV/EV/AC/CPI/EAC/VAC/SPI) con sus
// valores y la fórmula original de cada celda (toggle "ver fórmulas").

import React, { useState, useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { RO_CREDITEX } from '../../../data/resultadoOperativoCreditex';

const S = (n) => (n == null || n === '') ? '—' : (typeof n === 'number' ? `S/ ${Math.round(n).toLocaleString('es-PE')}` : String(n));
const P = (n) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : (n || '—'));
const cpiCol = (v) => (typeof v !== 'number') ? BASE.muted : v >= 1 ? '#16a34a' : v >= 0.9 ? '#d97706' : '#dc2626';
const varCol = (v) => (typeof v !== 'number' || v === 0) ? BASE.muted : v > 0 ? '#16a34a' : '#dc2626';

// columnas numéricas a mostrar (en orden, agrupadas)
const COLS = [
  { k: 'pptoF1', l: 'Ppto F1', g: 'ppt' },
  { k: 'pptoF2', l: 'Ppto F2', g: 'ppt' },
  { k: 'deductivos', l: 'Deduct.', g: 'ppt' },
  { k: 'adicionales', l: 'Adic.', g: 'ppt' },
  { k: 'bac', l: 'BAC', g: 'ppt', bold: true },
  { k: 'pv', l: 'Plan Value', g: 'pv' },
  { k: 'ev', l: 'Earned Value', g: 'ev', bold: true },
  { k: 'ac', l: 'Costo Real', g: 'ac', bold: true },
  { k: 'cv', l: 'Margen (CV)', g: 'mar', tipo: 'var' },
  { k: 'cpi', l: 'CPI', g: 'mar', tipo: 'cpi' },
  { k: 'eac', l: 'EAC', g: 'eac' },
  { k: 'vac', l: 'VAC', g: 'eac', tipo: 'var' },
  { k: 'cpiEac', l: 'CPI fin', g: 'eac', tipo: 'cpi' },
  { k: 'spi', l: 'SPI', g: 'cro', tipo: 'cpi' },
];
const GRP = {
  ppt: { l: 'PRESUPUESTO', c: '#f59e0b' }, pv: { l: 'PROGRAMADO', c: '#6366f1' },
  ev: { l: 'VALORIZADO', c: '#10b981' }, ac: { l: 'COSTO REAL', c: '#0ea5e9' },
  mar: { l: 'MARGEN', c: '#7c3aed' }, eac: { l: 'AL TÉRMINO', c: '#06b6d4' }, cro: { l: 'CRONOG.', c: '#ec4899' },
};

export default function ResultadoOperativoOficial() {
  const { meta, filas } = RO_CREDITEX;
  const [verFormulas, setVerFormulas] = useState(false);
  const [verSubs, setVerSubs] = useState(true);
  const [abierto, setAbierto] = useState(null); // fila con comentario abierto

  const total = useMemo(() => filas.find((f) => f.tipo === 'total'), [filas]);
  const t = total?.v || {};

  const filasVis = filas.filter((f) => verSubs || f.tipo !== 'sub');

  const celda = (f, col) => {
    const v = f.v?.[col.k];
    const formula = f.f?.[col.k];
    if (verFormulas && formula) {
      return <span style={{ fontSize: 9, color: BASE.muted, fontFamily: 'monospace' }}>{formula}</span>;
    }
    if (col.tipo === 'cpi') return <span style={{ color: cpiCol(v), fontWeight: 800 }}>{P(v)}</span>;
    if (col.tipo === 'var') return <span style={{ color: varCol(v), fontWeight: 700 }}>{S(v)}</span>;
    return <span style={{ fontWeight: col.bold ? 800 : 600, color: BASE.text }}>{S(v)}</span>;
  };

  const fondoFila = (tipo) => tipo === 'total' ? BASE.navy : tipo === 'seccion' ? '#e2e8f0' : tipo === 'categoria' ? '#f1f5f9' : BASE.white;
  const colorTexto = (tipo) => tipo === 'total' ? '#fff' : BASE.navy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cabecera / meta */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 14, padding: '16px 22px', boxShadow: BASE.shadowMd, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.4, color: BASE.gold }}>{meta.documento} · Rev {meta.rev} · {meta.semana}</p>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{meta.titulo}</h2>
          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{meta.proyecto}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: BASE.gold }}>CPI GLOBAL</p>
          <p style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color: cpiCol(t.cpi) === '#16a34a' ? '#4ade80' : '#fbbf24' }}>{P(t.cpi)}</p>
        </div>
      </div>

      {/* KPIs del total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          { l: 'Presupuesto (BAC)', v: S(t.bac), c: '#f59e0b' },
          { l: 'Valorizado (EV)', v: S(t.ev), c: '#10b981' },
          { l: 'Costo Real (AC)', v: S(t.ac), c: '#0ea5e9' },
          { l: 'Margen (CV)', v: S(t.cv), c: varCol(t.cv) },
          { l: 'Estimado término (EAC)', v: S(t.eac), c: '#06b6d4' },
          { l: 'Variación (VAC)', v: S(t.vac), c: varCol(t.vac) },
        ].map((k) => (
          <div key={k.l} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `5px solid ${k.c}`, borderRadius: 10, padding: '10px 13px', boxShadow: BASE.shadowSm }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase' }}>{k.l}</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: k.c, marginTop: 2 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setVerSubs((s) => !s)} style={btn(verSubs)}>{verSubs ? '➖ Ocultar sub-partidas' : '➕ Ver sub-partidas'}</button>
        <button onClick={() => setVerFormulas((s) => !s)} style={btn(verFormulas)}>{verFormulas ? '🔢 Ver valores' : 'ƒ Ver fórmulas'}</button>
        <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 'auto' }}>Importado tal cual del Excel · clic en una fila con 📝 para ver comentarios/análisis</span>
      </div>

      {/* Tabla EVM */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 1200, width: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thBase, textAlign: 'left', minWidth: 230, position: 'sticky', left: 0, background: BASE.navy, zIndex: 2 }}>PARTIDA</th>
                {Object.entries(GRP).map(([g, info]) => {
                  const span = COLS.filter((c) => c.g === g).length;
                  return <th key={g} colSpan={span} style={{ ...thBase, borderBottom: `3px solid ${info.c}` }}>{info.l}</th>;
                })}
                <th rowSpan={2} style={{ ...thBase, minWidth: 36 }}>📝</th>
              </tr>
              <tr>
                {COLS.map((c) => <th key={c.k} style={{ ...thCol }}>{c.l}</th>)}
              </tr>
            </thead>
            <tbody>
              {filasVis.map((f) => {
                const tieneNota = !!(f.v?.comentario || f.v?.analisisReal || f.v?.analisisISP);
                const indent = f.tipo === 'sub' ? 22 : f.tipo === 'categoria' ? 11 : 0;
                return (
                  <React.Fragment key={f.fila}>
                    <tr style={{ background: fondoFila(f.tipo), borderTop: f.tipo === 'seccion' || f.tipo === 'total' ? `2px solid ${BASE.gold}` : `1px solid ${BASE.borderSoft || BASE.border}` }}>
                      <td style={{ padding: '7px 12px', paddingLeft: 12 + indent, position: 'sticky', left: 0, background: fondoFila(f.tipo), color: colorTexto(f.tipo), fontWeight: f.tipo === 'sub' ? 600 : 900, fontSize: f.tipo === 'sub' ? 10.5 : 11.5, whiteSpace: 'nowrap', borderRight: `1px solid ${BASE.border}` }}>
                        {f.codigo ? <span style={{ color: f.tipo === 'total' ? BASE.gold : BASE.muted, fontWeight: 700, marginRight: 6, fontSize: 9.5 }}>{f.codigo}</span> : null}
                        {f.descripcion}
                      </td>
                      {COLS.map((c) => (
                        <td key={c.k} style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--grapco-font-mono, monospace)', color: f.tipo === 'total' ? '#fff' : undefined }}>
                          {f.tipo === 'total' ? <span style={{ color: c.tipo === 'cpi' ? '#fbbf24' : '#fff', fontWeight: 800 }}>{c.tipo === 'cpi' ? P(f.v?.[c.k]) : S(f.v?.[c.k])}</span> : celda(f, c)}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', cursor: tieneNota ? 'pointer' : 'default' }} onClick={() => tieneNota && setAbierto(abierto === f.fila ? null : f.fila)}>
                        {tieneNota ? <span style={{ fontSize: 13 }}>{abierto === f.fila ? '🔽' : '📝'}</span> : ''}
                      </td>
                    </tr>
                    {abierto === f.fila && tieneNota && (
                      <tr>
                        <td colSpan={COLS.length + 2} style={{ background: BASE.bgSoft, padding: '10px 16px', borderBottom: `2px solid ${BASE.gold}` }}>
                          {f.v?.comentario && <p style={{ fontSize: 11.5, color: BASE.text, lineHeight: 1.5 }}><b style={{ color: BASE.navy }}>💬 Comentario:</b> {f.v.comentario}</p>}
                          {f.v?.analisisReal && <p style={{ fontSize: 11.5, color: BASE.text, lineHeight: 1.5, marginTop: 5 }}><b style={{ color: '#0ea5e9' }}>📊 Análisis costo real:</b> {f.v.analisisReal}</p>}
                          {f.v?.analisisISP && <p style={{ fontSize: 11.5, color: BASE.text, lineHeight: 1.5, marginTop: 5 }}><b style={{ color: '#7c3aed' }}>📈 Análisis ISP:</b> {f.v.analisisISP}</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thBase = { padding: '8px 8px', background: BASE.navy, color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' };
const thCol = { padding: '6px 8px', background: '#1a2c4d', color: '#cbd5e1', fontSize: 9, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' };
const btn = (on) => ({ fontSize: 11, fontWeight: 800, padding: '7px 13px', borderRadius: 8, border: `1px solid ${on ? BASE.navy : BASE.border}`, background: on ? BASE.navy : BASE.white, color: on ? '#fff' : BASE.navy, cursor: 'pointer' });
