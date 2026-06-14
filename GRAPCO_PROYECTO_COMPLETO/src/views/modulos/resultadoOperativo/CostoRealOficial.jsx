// src/views/modulos/resultadoOperativo/CostoRealOficial.jsx
// CR · Costo Real — AHORA EN VIVO desde useRO. Ya NO importa datos estáticos.
// Descompone el AC del RO en sus patas: MO (Tareos HH × S/25.5) + Materiales (Almacén)
// + Otros (Facturas + Subcontratos). HH se deriva del costo MO / costo-hora único.
// Se autoactualiza con la data del proyecto; estado-vacío si aún no hay costo real.

import React, { useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { COSTO_HORA_RO } from '../../../utils/planMaestroAnalytics';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

const esZero = (n) => n == null || n === '' || (typeof n === 'number' && Math.abs(n) < 0.005);
const S = (n, mutedZero = true) => {
  if (n == null || n === '') return <span style={{ color: '#cbd5e1' }}>—</span>;
  if (typeof n !== 'number') return String(n);
  if (esZero(n) && mutedZero) return <span style={{ color: '#cbd5e1' }}>S/ 0</span>;
  return `S/ ${Math.round(n).toLocaleString('es-PE')}`;
};
const HH = (n) => {
  if (typeof n !== 'number') return n || <span style={{ color: '#cbd5e1' }}>—</span>;
  if (esZero(n)) return <span style={{ color: '#cbd5e1' }}>0.0</span>;
  return n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

export default function CostoRealOficial() {
  const { ro, loading } = useRO();
  const { proyectoActivo } = useProyectoActivo();

  // Una fila por partida con costo real incurrido, descompuesto en patas.
  const filas = useMemo(() => {
    if (!ro?.detallePartidas) return [];
    return ro.detallePartidas
      .map((p) => {
        const mo = p.costoMORealAct || 0;
        const mat = p.costoMatRealAct || 0;
        const total = p.costoReal || 0;
        const otros = Math.max(0, total - mo - mat); // Facturas + Subcontratos + Equipos
        return {
          codigo: p.codigo,
          descripcion: p.descripcion,
          hh: mo / COSTO_HORA_RO,
          mo, mat, otros, total,
        };
      })
      .filter((f) => Math.abs(f.total) > 0.005 || Math.abs(f.hh) > 0.005)
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true }));
  }, [ro]);

  const totalRow = useMemo(() => filas.reduce((acc, f) => ({
    hh: acc.hh + f.hh, mo: acc.mo + f.mo, mat: acc.mat + f.mat, otros: acc.otros + f.otros, total: acc.total + f.total,
  }), { hh: 0, mo: 0, mat: 0, otros: 0, total: 0 }), [filas]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando el Costo Real…</p>;
  if (!ro || filas.length === 0) {
    return (
      <EmptyState
        icono="🧾"
        variante="bim"
        titulo="El Costo Real se calcula en vivo — aún no hay movimientos"
        descripcion="El AC (Actual Cost) del RO ya NO se carga a mano: suma Tareos (HH × S/25.5) + salidas de Almacén + Facturas + Subcontratos por partida. En cuanto se registren tareos y costos, este reporte se llena solo."
      />
    );
  }

  const totAbs = Math.abs(totalRow.total) > 0.005 ? totalRow.total : 1;
  const acento = (p) => p >= 0.15 ? BASE.navy : p >= 0.06 ? BASE.gold : p >= 0.01 ? '#94a3b8' : '#e2e8f0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera ejecutiva */}
      <div style={{ background: `linear-gradient(135deg, #0c4a6e, #075985)`, color: '#fff', borderRadius: 16, padding: '18px 24px', boxShadow: '0 10px 30px -8px rgba(8,47,73,0.55)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: `6px solid ${BASE.gold}` }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.6, color: '#7dd3fc' }}>🧾 CR · COSTO REAL · EN VIVO</p>
          <h2 style={{ fontSize: 21, fontWeight: 900, marginTop: 3, letterSpacing: 0.2 }}>Costo Real por Partida (AC del RO)</h2>
          <p style={{ fontSize: 11.5, opacity: 0.88, marginTop: 3 }}>{proyectoActivo?.nombre || 'Proyecto activo'} · MO + Almacén + Facturas + Subcontratos</p>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>COSTO MO PROMEDIO</p>
          <p style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: BASE.gold }}>S/ {HH(COSTO_HORA_RO)}<span style={{ fontSize: 13, opacity: 0.85 }}> /h</span></p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 11 }}>
        {[
          { l: 'HH Total', v: HH(totalRow.hh), c: '#6366f1', ico: '⏱️' },
          { l: 'Costo MO', v: S(totalRow.mo, false), c: '#7c3aed', ico: '👷' },
          { l: 'Materiales', v: S(totalRow.mat, false), c: '#f59e0b', ico: '📦' },
          { l: 'Costo Real Total', v: S(totalRow.total, false), c: '#16a34a', ico: '📊' },
        ].map((k) => (
          <div key={k.l} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `4px solid ${k.c}`, borderRadius: 12, padding: '12px 15px', boxShadow: '0 4px 14px -6px rgba(15,23,42,0.12)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.ico} {k.l}</p>
            <p style={{ fontSize: 21, fontWeight: 900, color: k.c, marginTop: 3, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Nota */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 'auto' }}>HH × S/{HH(COSTO_HORA_RO)}/h · la barra = % del costo real total · «Otros» = Facturas + Subcontratos</span>
      </div>

      {/* Tabla ejecutiva */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 26px -10px rgba(15,23,42,0.18)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11.5, width: '100%', minWidth: 880 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr style={{ background: `linear-gradient(180deg, #0f1f3a, #0b1729)` }}>
                <th style={{ ...th, textAlign: 'left', minWidth: 280, paddingLeft: 16 }}>PARTIDA</th>
                <th style={th}>HH</th>
                <th style={th}>COSTO MO</th>
                <th style={th}>MATERIALES</th>
                <th style={th}>OTROS</th>
                <th style={th}>COSTO REAL</th>
                <th style={{ ...th, minWidth: 150 }}>% DEL COSTO</th>
              </tr>
            </thead>
            <tbody>
              {/* TOTAL arriba */}
              <tr style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderTop: `3px solid ${BASE.gold}`, borderBottom: `3px solid ${BASE.gold}` }}>
                <td style={{ padding: '9px 16px', color: '#fff', fontWeight: 900, fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', borderLeft: `4px solid ${BASE.gold}` }}>TOTAL COSTO REAL</td>
                <td style={{ ...tdNum, color: '#fff', fontWeight: 800 }}>{HH(totalRow.hh)}</td>
                <td style={{ ...tdNum, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{S(totalRow.mo, false)}</td>
                <td style={{ ...tdNum, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{S(totalRow.mat, false)}</td>
                <td style={{ ...tdNum, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{S(totalRow.otros, false)}</td>
                <td style={{ ...tdNum, color: BASE.gold, fontWeight: 900 }}>{S(totalRow.total, false)}</td>
                <td style={{ padding: '6px 12px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>100%</span>
                </td>
              </tr>
              {filas.map((f, idx) => {
                const p = f.total / totAbs;
                const barColor = acento(p);
                const rowBg = idx % 2 ? '#fcfdfe' : BASE.white;
                return (
                  <tr key={f.codigo || idx}
                    style={{ background: rowBg, borderTop: `1px solid #eef2f7`, transition: 'background 0.12s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eef5ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                  >
                    <td style={{ padding: 0, borderLeft: `4px solid ${barColor}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                        {f.codigo ? (
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: barColor, borderRadius: 5, padding: '2px 6px', minWidth: 30, textAlign: 'center', fontFamily: 'monospace' }}>{f.codigo}</span>
                        ) : null}
                        <span style={{ fontWeight: 700, fontSize: 11.5, color: BASE.navy, whiteSpace: 'nowrap' }}>{f.descripcion}</span>
                      </div>
                    </td>
                    <td style={{ ...tdNum, color: BASE.text, fontWeight: 800 }}>{HH(f.hh)}</td>
                    <td style={{ ...tdNum, color: BASE.muted, fontWeight: 600, fontSize: 11 }}>{S(f.mo)}</td>
                    <td style={{ ...tdNum, color: BASE.muted, fontWeight: 600, fontSize: 11 }}>{S(f.mat)}</td>
                    <td style={{ ...tdNum, color: BASE.muted, fontWeight: 600, fontSize: 11 }}>{S(f.otros)}</td>
                    <td style={{ ...tdNum, color: BASE.navy, fontWeight: 900 }}>{S(f.total)}</td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ flex: 1, height: 7, borderRadius: 999, background: '#eef2f7', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.round(p * 100))}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${barColor}, ${barColor}bb)` }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: p >= 0.06 ? BASE.navy : BASE.muted, minWidth: 30, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(p * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '11px 12px', color: '#cbd5e1', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.7, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `3px solid ${BASE.gold}` };
const tdNum = { padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--grapco-font-mono, monospace)', whiteSpace: 'nowrap' };
