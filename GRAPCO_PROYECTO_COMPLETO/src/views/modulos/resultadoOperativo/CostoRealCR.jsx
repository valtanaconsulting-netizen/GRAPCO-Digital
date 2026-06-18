// src/views/modulos/resultadoOperativo/CostoRealCR.jsx
// CR · Costo Real por partida — DESDE LA DATA VIVA (los mismos tareos que el ISP/
// Producción y el CHH). NO se sube ningún Excel. Diseño COMPACTO al estilo del
// CPI (CpiEac): navy + gold, fila Σ TOTAL, partidas expandibles.
//
// «Conversa» con Producción: agrupa por PARTIDA CANÓNICA (_partidaCanonica, el
// mismo cruce al catálogo que usa el ISP) y ordena las partidas según el árbol
// `wbs` de Producción. Reusa el motor `calcularReporteTareos` (HH = Σ r.totalHH,
// COSTO = HH × S/25.5). Selector «hasta la semana N» = acumulado r.semana ≤ N.

import React, { useMemo, useState } from 'react';
import { BASE } from '../../../utils/styles';
import { calcularReporteTareos, COSTO_HORA_PROMEDIO, fmt1 } from '../../../utils/helpers';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';

const NAVY = '#0F2A47', NAVY2 = '#15314F', GOLD = BASE.gold;
const MONO = 'var(--grapco-font-mono, monospace)';

const esZero = (n) => n == null || (typeof n === 'number' && Math.abs(n) < 0.005);
const S = (n, muted = true) => {
  if (n == null || n === '') return '—';
  if (esZero(n) && muted) return <span style={{ color: '#cbd5e1' }}>S/ 0</span>;
  return `S/ ${Math.round(n).toLocaleString('es-PE')}`;
};
const HH = (n, muted = true) => {
  if (typeof n !== 'number') return '—';
  if (esZero(n) && muted) return <span style={{ color: '#cbd5e1' }}>0.0</span>;
  return fmt1(n);
};

const up = (s) => (s || '').toString().toUpperCase().trim();

// Celdas compactas
const thGrp = { padding: '5px 10px', background: NAVY, color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' };
const thCol = { padding: '5px 10px', background: NAVY2, color: '#cbd5e1', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `2px solid ${GOLD}` };
const num = { padding: '4px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, whiteSpace: 'nowrap' };

export default function CostoRealCR({ historial = [], wbs = null }) {
  const { proyectoActivo } = useProyectoActivo();
  const [semanaTope, setSemanaTope] = useState(null);   // null = total
  const [ocultarCeros, setOcultarCeros] = useState(true);
  const [abiertas, setAbiertas] = useState(() => new Set());

  const semanas = useMemo(
    () => [...new Set((historial || []).map((r) => parseInt(r?.semana, 10)).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b),
    [historial],
  );
  const maxSem = semanas.length ? semanas[semanas.length - 1] : null;
  const semana = (semanaTope != null && semanas.includes(semanaTope)) ? semanaTope : maxSem;

  // Registros acumulados hasta la semana N, con partida/subpartida CANÓNICAS
  // (mismo cruce al catálogo que el ISP/Producción → los números cuadran).
  const registros = useMemo(
    () => (historial || []).filter((r) => {
      const s = parseInt(r?.semana, 10);
      return Number.isFinite(s) && s > 0 && (semana == null || s <= semana);
    }).map((r) => ({ ...r, partida: r._partidaCanonica || r.partida, subpartida: r._subpartidaCanonica || r.subpartida })),
    [historial, semana],
  );

  const reporte = useMemo(() => calcularReporteTareos(registros, COSTO_HORA_PROMEDIO), [registros]);

  // Orden de partidas = el del árbol `wbs` de Producción (para que «converse»).
  const ordenPartida = useMemo(() => {
    const idx = {};
    Object.keys(wbs || {}).forEach((p, i) => { idx[up(p)] = i; });
    return idx;
  }, [wbs]);

  const partidas = useMemo(() => {
    let arr = reporte.partidas.slice();
    if (ocultarCeros) arr = arr.filter((p) => !esZero(p.hh));
    arr.sort((a, b) => {
      const ia = ordenPartida[up(a.nombre)] ?? 9999;
      const ib = ordenPartida[up(b.nombre)] ?? 9999;
      return ia !== ib ? ia - ib : b.hh - a.hh;
    });
    return arr;
  }, [reporte, ocultarCeros, ordenPartida]);

  const totAbs = Math.abs(reporte.totalHH) > 0.005 ? reporte.totalHH : 1;

  const toggle = (k) => setAbiertas((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const todasAbiertas = partidas.length > 0 && partidas.every((p) => abiertas.has(p.nombre));
  const expandirTodo = () => setAbiertas(todasAbiertas ? new Set() : new Set(partidas.map((p) => p.nombre)));

  // ── Estado vacío ──
  if (!semanas.length || reporte.totalHH < 0.005) {
    return (
      <div style={{ background: BASE.white, border: `1px dashed ${BASE.border}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', boxShadow: BASE.shadowMd }}>
        <p style={{ fontSize: 36, marginBottom: 4 }}>🧾</p>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: BASE.navy }}>El Costo Real se calcula en vivo</h3>
        <p style={{ fontSize: 12, color: BASE.muted, maxWidth: 520, margin: '6px auto 0', lineHeight: 1.55 }}>
          Suma los tareos del proyecto (HH × S/{COSTO_HORA_PROMEDIO}) — la misma data del ISP/Producción y el Control de HH. Se llena solo al registrar tareos.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Barra de control compacta */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `4px solid ${GOLD}`, borderRadius: 10, padding: '8px 14px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 900, color: BASE.navy, letterSpacing: 0.3 }}>CR · Costo Real</span>
        <span style={{ fontSize: 11, color: BASE.muted, fontWeight: 600 }}>
          {proyectoActivo?.nombre || 'Proyecto'} · Costo MO <strong style={{ color: BASE.navy, fontFamily: MONO }}>S/ {COSTO_HORA_PROMEDIO.toFixed(2)}/h</strong>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: BASE.navy }}>
            Hasta SEM
            <select value={semana ?? ''} onChange={(e) => setSemanaTope(parseInt(e.target.value, 10))}
              style={{ padding: '5px 8px', borderRadius: 7, border: `1.5px solid ${BASE.border}`, fontSize: 11.5, fontWeight: 800, color: BASE.navy, background: BASE.white, cursor: 'pointer' }}>
              {semanas.map((n) => <option key={n} value={n}>{n}{n === maxSem ? ' (total)' : ''}</option>)}
            </select>
          </label>
          <button onClick={expandirTodo} style={{ padding: '5px 10px', background: BASE.white, color: BASE.navy, border: `1.5px solid ${BASE.border}`, borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
            {todasAbiertas ? '▴ Colapsar' : '▾ Expandir'}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: BASE.muted, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={ocultarCeros} onChange={(e) => setOcultarCeros(e.target.checked)} />
            Ocultar ceros
          </label>
        </div>
      </div>

      {/* Tabla compacta */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 20px -10px rgba(15,23,42,0.18)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620, fontSize: 11.5 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thGrp, textAlign: 'left', paddingLeft: 14, minWidth: 300, borderBottom: `2px solid ${GOLD}` }}>PARTIDA</th>
                <th colSpan={3} style={{ ...thGrp, borderBottom: `3px solid ${GOLD}` }}>REPORTE TAREOS · ACUM. HASTA SEM {semana}</th>
              </tr>
              <tr>
                <th style={thCol}>HH</th>
                <th style={thCol}>COSTO (S/)</th>
                <th style={{ ...thCol, minWidth: 120 }}>% DEL TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {/* Σ TOTAL */}
              <tr style={{ background: NAVY2, borderTop: `2px solid ${GOLD}`, borderBottom: `2px solid ${GOLD}` }}>
                <td style={{ padding: '7px 14px', color: '#fff', fontWeight: 900, fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>Σ TOTAL COSTO DE OBRA</td>
                <td style={{ ...num, color: '#fff', fontWeight: 800 }}>{HH(reporte.totalHH, false)}</td>
                <td style={{ ...num, color: GOLD, fontWeight: 900 }}>{S(reporte.totalCosto, false)}</td>
                <td style={{ ...num, color: '#fff', fontWeight: 800 }}>100%</td>
              </tr>

              {partidas.map((p, idx) => {
                const pct = (p.hh || 0) / totAbs;
                const acc = pct >= 0.15 ? BASE.navy : pct >= 0.06 ? GOLD : '#94a3b8';
                const subs = (p.subpartidas || []).filter((s) => !ocultarCeros || !esZero(s.hh));
                const open = abiertas.has(p.nombre);
                const hayInfo = subs.length > 0;
                return (
                  <React.Fragment key={p.nombre || idx}>
                    <tr onClick={() => hayInfo && toggle(p.nombre)}
                      style={{ background: idx % 2 ? '#f3f6fa' : '#eef2f7', borderTop: `1px solid ${BASE.border}`, cursor: hayInfo ? 'pointer' : 'default' }}>
                      <td style={{ padding: '6px 12px', borderLeft: `4px solid ${acc}` }}>
                        <span style={{ display: 'inline-block', width: 11, color: BASE.muted, fontSize: 9, marginRight: 5 }}>{hayInfo ? (open ? '▾' : '▸') : ''}</span>
                        {p.codigo ? <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: acc, borderRadius: 4, padding: '1px 5px', fontFamily: MONO, marginRight: 7 }}>{p.codigo}</span> : null}
                        <span style={{ fontWeight: 800, fontSize: 11.5, color: BASE.navy }}>{p.nombre}</span>
                      </td>
                      <td style={{ ...num, fontWeight: 800, color: BASE.text }}>{HH(p.hh)}</td>
                      <td style={{ ...num, fontWeight: 900, color: BASE.navy }}>{S(p.costo)}</td>
                      <td style={{ padding: '4px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#dde5ef', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, height: '100%', background: acc }} />
                          </div>
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: BASE.navy, minWidth: 26, textAlign: 'right', fontFamily: MONO }}>{Math.round(pct * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                    {open && subs.map((s, j) => (
                      <tr key={`${p.nombre}-${j}`} style={{ background: BASE.white, borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 12px 4px 32px', color: BASE.text, fontSize: 10.5 }}>{s.nombre}</td>
                        <td style={{ ...num, color: BASE.text, fontSize: 10.5 }}>{HH(s.hh)}</td>
                        <td style={{ ...num, color: BASE.muted, fontSize: 10.5 }}>{S(s.costo)}</td>
                        <td style={{ ...num, color: BASE.mutedSoft, fontSize: 9.5 }}>{Math.round(((s.hh || 0) / totAbs) * 100)}%</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 10, color: BASE.mutedSoft, lineHeight: 1.45 }}>
        Fuente: tareos del proyecto (misma data del ISP/Producción y el Control de HH) · partida canónica del catálogo · COSTO = HH × S/{COSTO_HORA_PROMEDIO} · «Hasta SEM N» acumula r.semana ≤ N.
      </p>
    </div>
  );
}
