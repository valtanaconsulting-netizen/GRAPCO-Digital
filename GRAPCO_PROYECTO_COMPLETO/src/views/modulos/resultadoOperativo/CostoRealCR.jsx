// src/views/modulos/resultadoOperativo/CostoRealCR.jsx
// CR · Costo Real por partida — DESDE LA DATA VIVA de la plataforma (los mismos
// tareos que alimentan el ISP/Producción y el CHH). NO se sube ningún Excel.
// Reusa el motor existente `calcularReporteTareos` (HH = Σ r.totalHH · COSTO =
// HH × S/25.5), con un selector "hasta la semana N" que filtra r.semana ≤ N
// (acumulado). El total se actualiza solo al registrar más tareos.

import React, { useMemo, useState } from 'react';
import { BASE } from '../../../utils/styles';
import { calcularReporteTareos, COSTO_HORA_PROMEDIO } from '../../../utils/helpers';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';

const esZero = (n) => n == null || (typeof n === 'number' && Math.abs(n) < 0.005);
const S = (n) => {
  if (n == null || n === '') return '—';
  if (esZero(n)) return <span style={{ color: '#cbd5e1' }}>S/ 0</span>;
  return `S/ ${Math.round(n).toLocaleString('es-PE')}`;
};
const HH = (n) => {
  if (typeof n !== 'number') return '—';
  if (esZero(n)) return <span style={{ color: '#cbd5e1' }}>0.0</span>;
  return n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const th = { padding: '11px 12px', color: '#cbd5e1', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.7, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `3px solid ${BASE.gold}` };
const tdNum = { padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--grapco-font-mono, monospace)', whiteSpace: 'nowrap', fontSize: 11.5 };

export default function CostoRealCR({ historial = [] }) {
  const { proyectoActivo } = useProyectoActivo();
  const [semanaTope, setSemanaTope] = useState(null);     // null = total (semana más alta)
  const [ocultarCeros, setOcultarCeros] = useState(true);

  // Semanas presentes en la data viva
  const semanas = useMemo(
    () => [...new Set((historial || []).map((r) => parseInt(r?.semana, 10)).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b),
    [historial],
  );
  const maxSem = semanas.length ? semanas[semanas.length - 1] : null;
  const semana = (semanaTope != null && semanas.includes(semanaTope)) ? semanaTope : maxSem;

  // Registros acumulados HASTA la semana N (r.semana ≤ N)
  const registros = useMemo(
    () => (historial || []).filter((r) => {
      const s = parseInt(r?.semana, 10);
      return Number.isFinite(s) && s > 0 && (semana == null || s <= semana);
    }),
    [historial, semana],
  );

  const reporte = useMemo(() => calcularReporteTareos(registros, COSTO_HORA_PROMEDIO), [registros]);

  const partidas = useMemo(
    () => (ocultarCeros ? reporte.partidas.filter((p) => !esZero(p.hh)) : reporte.partidas),
    [reporte, ocultarCeros],
  );
  const totAbs = Math.abs(reporte.totalHH) > 0.005 ? reporte.totalHH : 1;

  // ── Estado vacío: aún no hay tareos para el frente/proyecto activo ──
  if (!semanas.length || reporte.totalHH < 0.005) {
    return (
      <div style={{ background: BASE.white, border: `1px dashed ${BASE.border}`, borderRadius: 16, padding: '36px 28px', textAlign: 'center', boxShadow: BASE.shadowMd }}>
        <p style={{ fontSize: 40, marginBottom: 6 }}>🧾</p>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: BASE.navy }}>El Costo Real se calcula en vivo</h3>
        <p style={{ fontSize: 12.5, color: BASE.muted, maxWidth: 560, margin: '8px auto 0', lineHeight: 1.6 }}>
          Suma los tareos del proyecto (HH × S/{COSTO_HORA_PROMEDIO}) — la misma data que alimenta el ISP/Producción y el Control de HH.
          En cuanto haya tareos registrados para este frente, el CR se llena solo.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera */}
      <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #075985)', color: '#fff', borderRadius: 16, padding: '16px 22px', boxShadow: '0 10px 30px -8px rgba(8,47,73,0.55)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: `6px solid ${BASE.gold}` }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.6, color: '#7dd3fc' }}>🧾 CR · COSTO REAL · EN VIVO</p>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 3 }}>Costo Real por Partida</h2>
          <p style={{ fontSize: 11.5, opacity: 0.88, marginTop: 3 }}>
            {proyectoActivo?.nombre || 'Proyecto activo'} · acumulado <strong>hasta SEM {semana}</strong> · desde los tareos del proyecto
          </p>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>COSTO MO PROMEDIO</p>
          <p style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: BASE.gold }}>S/ {COSTO_HORA_PROMEDIO.toLocaleString('es-PE', { minimumFractionDigits: 2 })}<span style={{ fontSize: 12, opacity: 0.85 }}> /h</span></p>
        </div>
      </div>

      {/* Controles: selector de semana + ocultar ceros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '10px 14px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: BASE.navy }}>
          Hasta la semana
          <select value={semana ?? ''} onChange={(e) => setSemanaTope(parseInt(e.target.value, 10))}
            style={{ padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 800, color: BASE.navy, background: BASE.white, cursor: 'pointer' }}>
            {semanas.map((n) => <option key={n} value={n}>SEM {n}{n === maxSem ? ' (total)' : ''}</option>)}
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: BASE.muted, fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={ocultarCeros} onChange={(e) => setOcultarCeros(e.target.checked)} />
          Ocultar partidas en cero
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: BASE.mutedSoft }}>{registros.length} tareos · {partidas.length} partidas con costo</span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 11 }}>
        {[
          { l: 'HH Total', v: HH(reporte.totalHH), c: '#6366f1', ico: '⏱️' },
          { l: 'Costo Real Total', v: S(reporte.totalCosto), c: '#16a34a', ico: '💰' },
          { l: 'Hasta semana', v: `SEM ${semana}`, c: BASE.gold, ico: '📅' },
          { l: 'Partidas con costo', v: reporte.partidas.filter((p) => !esZero(p.hh)).length, c: BASE.navy, ico: '📋' },
        ].map((k) => (
          <div key={k.l} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `4px solid ${k.c}`, borderRadius: 12, padding: '12px 15px', boxShadow: '0 4px 14px -6px rgba(15,23,42,0.12)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.ico} {k.l}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: k.c, marginTop: 3, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabla CR */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 26px -10px rgba(15,23,42,0.18)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11.5, width: '100%', minWidth: 720 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr style={{ background: 'linear-gradient(180deg, #0f1f3a, #0b1729)' }}>
                <th style={{ ...th, textAlign: 'left', minWidth: 320, paddingLeft: 16 }}>PARTIDA</th>
                <th style={th}>HH</th>
                <th style={th}>COSTO (S/)</th>
                <th style={{ ...th, minWidth: 140 }}>% DEL COSTO</th>
              </tr>
            </thead>
            <tbody>
              {/* TOTAL */}
              <tr style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderTop: `3px solid ${BASE.gold}`, borderBottom: `3px solid ${BASE.gold}` }}>
                <td style={{ padding: '9px 16px', color: '#fff', fontWeight: 900, fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', borderLeft: `4px solid ${BASE.gold}` }}>TOTAL COSTO REAL</td>
                <td style={{ ...tdNum, color: '#fff', fontWeight: 800 }}>{HH(reporte.totalHH)}</td>
                <td style={{ ...tdNum, color: BASE.gold, fontWeight: 900 }}>{S(reporte.totalCosto)}</td>
                <td style={{ padding: '6px 12px', color: '#fff', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}>100%</td>
              </tr>

              {partidas.map((p, idx) => {
                const pct = (p.hh || 0) / totAbs;
                const barColor = pct >= 0.15 ? BASE.navy : pct >= 0.06 ? BASE.gold : '#94a3b8';
                const subs = (p.subpartidas || []).filter((s) => !ocultarCeros || !esZero(s.hh));
                return (
                  <React.Fragment key={p.codigo || p.nombre || idx}>
                    <tr style={{ background: '#eef2f7', borderTop: `1px solid ${BASE.border}` }}>
                      <td style={{ padding: '8px 12px', borderLeft: `4px solid ${barColor}` }}>
                        {p.codigo ? <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: barColor, borderRadius: 5, padding: '2px 6px', fontFamily: 'monospace', marginRight: 8 }}>{p.codigo}</span> : null}
                        <span style={{ fontWeight: 800, fontSize: 12, color: BASE.navy }}>{p.nombre}</span>
                      </td>
                      <td style={{ ...tdNum, fontWeight: 800, color: BASE.text }}>{HH(p.hh)}</td>
                      <td style={{ ...tdNum, fontWeight: 900, color: BASE.navy }}>{S(p.costo)}</td>
                      <td style={{ padding: '6px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ flex: 1, height: 7, borderRadius: 999, background: '#dde5ef', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, height: '100%', borderRadius: 999, background: barColor }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: BASE.navy, minWidth: 30, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(pct * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                    {subs.map((s, j) => (
                      <tr key={`${p.codigo || idx}-${j}`} style={{ background: BASE.white, borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 12px 6px 30px', color: BASE.text, fontSize: 11 }}>{s.nombre}</td>
                        <td style={{ ...tdNum, color: BASE.text, fontSize: 11 }}>{HH(s.hh)}</td>
                        <td style={{ ...tdNum, color: BASE.muted, fontSize: 11 }}>{S(s.costo)}</td>
                        <td style={{ padding: '6px 12px', color: BASE.muted, fontSize: 10, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(((s.hh || 0) / totAbs) * 100)}%</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 10.5, color: BASE.mutedSoft, lineHeight: 1.5 }}>
        Fuente: tareos del proyecto (la misma data del ISP/Producción y el Control de HH). «Hasta SEM N» acumula r.semana ≤ N. COSTO = HH × S/{COSTO_HORA_PROMEDIO}.
      </p>
    </div>
  );
}
