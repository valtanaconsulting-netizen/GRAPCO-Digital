// src/views/modulos/resultadoOperativo/ResultadoOperativoOficial.jsx
// RO Oficial (formato GP-GCE-FOR-F06) — AHORA EN VIVO desde useRO.
// Ya NO importa datos estáticos: cruza Plan Maestro + APUs + Tareos + Kardex +
// Valorizaciones (las 4 patas del costo real) y arma la tabla EVM por partida.
// Se autoactualiza al llenar las colecciones; estado-vacío si aún no hay data.

import React, { useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

const S = (n) => (n == null || n === '') ? '—' : (typeof n === 'number' ? `S/ ${Math.round(n).toLocaleString('es-PE')}` : String(n));
const P = (n) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : (n || '—'));
const cpiCol = (v) => (typeof v !== 'number' || v === 0) ? BASE.muted : v >= 1 ? '#16a34a' : v >= 0.9 ? '#d97706' : '#dc2626';
const varCol = (v) => (typeof v !== 'number' || v === 0) ? BASE.muted : v > 0 ? '#16a34a' : '#dc2626';

// Columnas EVM que el motor en vivo alimenta hoy (F1/F2 · deductivos · adicionales
// llegan en olas siguientes; por eso esas columnas del Excel no se muestran aún).
const COLS = [
  { k: 'bac', l: 'Presupuesto', g: 'ppt', bold: true },
  { k: 'pv', l: 'Plan Value', g: 'pv' },
  { k: 'ev', l: 'Earned Value', g: 'ev', bold: true },
  { k: 'ac', l: 'Costo Real', g: 'ac', bold: true },
  { k: 'cv', l: 'Margen (CV)', g: 'mar', tipo: 'var' },
  { k: 'cpi', l: 'CPI', g: 'mar', tipo: 'cpi' },
  { k: 'eac', l: 'EAC', g: 'eac' },
  { k: 'vac', l: 'VAC', g: 'eac', tipo: 'var' },
  { k: 'spi', l: 'SPI', g: 'cro', tipo: 'cpi' },
];
const GRP = {
  ppt: { l: 'PRESUPUESTO', c: '#f59e0b' }, pv: { l: 'PROGRAMADO', c: '#6366f1' },
  ev: { l: 'VALORIZADO', c: '#10b981' }, ac: { l: 'COSTO REAL', c: '#0ea5e9' },
  mar: { l: 'MARGEN', c: '#7c3aed' }, eac: { l: 'AL TÉRMINO', c: '#06b6d4' }, cro: { l: 'CRONOG.', c: '#ec4899' },
};

export default function ResultadoOperativoOficial() {
  const { ro, loading } = useRO();
  const { proyectoActivo } = useProyectoActivo();

  // Partidas con sustancia (presupuesto, valorizado o costo real) — ordenadas por código WBS.
  const partidas = useMemo(() => {
    if (!ro?.detallePartidas) return [];
    return ro.detallePartidas
      .filter(p => Math.abs(p.BAC || 0) > 0.005 || Math.abs(p.EV || 0) > 0.005 || Math.abs(p.AC || 0) > 0.005)
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true }));
  }, [ro]);

  // Filas para la tabla: TOTAL (roll-up del motor) + una fila por partida.
  const filas = useMemo(() => {
    if (!ro) return [];
    const g = ro.indicadoresGlobales || {};
    const t = ro.totales || {};
    const total = {
      fila: 'TOTAL', tipo: 'total', codigo: null, descripcion: 'TOTAL COSTO DE OBRA',
      v: {
        bac: t.BAC, pv: t.PV, ev: t.EV, ac: t.AC,
        cv: (t.EV || 0) - (t.AC || 0), cpi: g.CPI,
        eac: g.EAC, vac: g.VAC, spi: g.SPI,
      },
    };
    const filasPart = partidas.map(p => ({
      fila: p.codigo, tipo: 'partida', codigo: p.codigo, descripcion: p.descripcion,
      v: { bac: p.BAC, pv: p.PV, ev: p.EV, ac: p.AC, cv: p.CV, cpi: p.CPI, eac: p.EAC, vac: p.VAC, spi: p.SPI },
    }));
    return [total, ...filasPart];
  }, [ro, partidas]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando el Resultado Operativo…</p>;
  if (!ro || partidas.length === 0) {
    return (
      <EmptyState
        icono="📑"
        variante="bim"
        titulo="El RO se calcula en vivo — aún no hay datos"
        descripcion="Este Resultado Operativo (formato F06) ya NO usa valores cargados a mano: se arma cruzando Plan Maestro + APUs + Tareos + Kardex + Valorizaciones. En cuanto registres avance y costos en el proyecto, la tabla EVM se llena sola."
      />
    );
  }

  const total = filas[0];
  const t = total?.v || {};

  const celda = (f, col) => {
    const v = f.v?.[col.k];
    if (col.tipo === 'cpi') return <span style={{ color: cpiCol(v), fontWeight: 800 }}>{P(v)}</span>;
    if (col.tipo === 'var') return <span style={{ color: varCol(v), fontWeight: 700 }}>{S(v)}</span>;
    return <span style={{ fontWeight: col.bold ? 800 : 600, color: BASE.text }}>{S(v)}</span>;
  };

  const fondoFila = (tipo) => tipo === 'total' ? BASE.navy : BASE.white;
  const colorTexto = (tipo) => tipo === 'total' ? '#fff' : BASE.navy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cabecera / meta */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 14, padding: '16px 22px', boxShadow: BASE.shadowMd, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.4, color: BASE.gold }}>GP-GCE-FOR-F06 · RESULTADO OPERATIVO · EN VIVO</p>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>El Estado de Resultados de la Obra</h2>
          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{proyectoActivo?.nombre || 'Proyecto activo'} · {partidas.length} partidas con movimiento</p>
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

      {/* Nota de fuente */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 'auto' }}>Calculado en vivo · Costo Real = Tareos (HH × S/25.5) + Almacén + Facturas + Subcontratos</span>
      </div>

      {/* Tabla EVM */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 1000, width: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thBase, textAlign: 'left', minWidth: 230, position: 'sticky', left: 0, background: BASE.navy, zIndex: 2 }}>PARTIDA</th>
                {Object.entries(GRP).map(([g, info]) => {
                  const span = COLS.filter((c) => c.g === g).length;
                  return <th key={g} colSpan={span} style={{ ...thBase, borderBottom: `3px solid ${info.c}` }}>{info.l}</th>;
                })}
              </tr>
              <tr>
                {COLS.map((c) => <th key={c.k} style={{ ...thCol }}>{c.l}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.fila} style={{ background: fondoFila(f.tipo), borderTop: f.tipo === 'total' ? `2px solid ${BASE.gold}` : `1px solid ${BASE.borderSoft || BASE.border}` }}>
                  <td style={{ padding: '7px 12px', position: 'sticky', left: 0, background: fondoFila(f.tipo), color: colorTexto(f.tipo), fontWeight: 900, fontSize: 11.5, whiteSpace: 'nowrap', borderRight: `1px solid ${BASE.border}` }}>
                    {f.codigo ? <span style={{ color: f.tipo === 'total' ? BASE.gold : BASE.muted, fontWeight: 700, marginRight: 6, fontSize: 9.5, fontFamily: 'monospace' }}>{f.codigo}</span> : null}
                    {f.descripcion}
                  </td>
                  {COLS.map((c) => (
                    <td key={c.k} style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--grapco-font-mono, monospace)', color: f.tipo === 'total' ? '#fff' : undefined }}>
                      {f.tipo === 'total'
                        ? <span style={{ color: c.tipo === 'cpi' ? '#fbbf24' : '#fff', fontWeight: 800 }}>{c.tipo === 'cpi' ? P(f.v?.[c.k]) : S(f.v?.[c.k])}</span>
                        : celda(f, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thBase = { padding: '8px 8px', background: BASE.navy, color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' };
const thCol = { padding: '6px 8px', background: '#1a2c4d', color: '#cbd5e1', fontSize: 9, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' };
