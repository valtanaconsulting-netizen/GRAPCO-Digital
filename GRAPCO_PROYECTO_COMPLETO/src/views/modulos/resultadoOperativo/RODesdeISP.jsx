// src/views/modulos/resultadoOperativo/RODesdeISP.jsx
// CR (Costo Real) y CHH (Control HH) del Resultado Operativo, alimentados
// DIRECTAMENTE desde el ISP que sube el usuario (botón in-app, sin Firestore).
// Filtro "hasta la semana N" = usa la hoja ISP-SEM{N} (HH acumulado). El CR usa
// COSTO = HH × tarifa MO; el CHH muestra HH Meta/Real/VAR/CPI. Mismo formato
// (jerarquía partida > subpartida) para ambos.

import React, { useMemo, useRef, useState } from 'react';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import useISP from './useISP';

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
const CPI = (v) => {
  if (v == null) return <span style={{ color: '#cbd5e1' }}>—</span>;
  const c = v >= 1 ? '#16a34a' : v >= 0.9 ? '#d97706' : '#dc2626';
  return <span style={{ color: c, fontWeight: 800 }}>{v.toFixed(2)}</span>;
};
const VAR = (v) => {
  if (typeof v !== 'number' || esZero(v)) return <span style={{ color: '#cbd5e1' }}>0.0</span>;
  const c = v >= 0 ? '#16a34a' : '#dc2626';
  return <span style={{ color: c, fontWeight: 700 }}>{v > 0 ? '+' : ''}{v.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>;
};

const th = { padding: '11px 12px', color: '#cbd5e1', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.7, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `3px solid ${BASE.gold}` };
const tdNum = { padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--grapco-font-mono, monospace)', whiteSpace: 'nowrap', fontSize: 11.5 };

export default function RODesdeISP() {
  const { isp, cargando, error, cargarISP, limpiarISP } = useISP();
  const { proyectoActivo } = useProyectoActivo();
  const fileRef = useRef(null);

  const [modo, setModo] = useState('CR');           // 'CR' | 'CHH'
  const [semanaUser, setSemanaUser] = useState(null); // selección manual (o null = total)
  const [ocultarCeros, setOcultarCeros] = useState(true);

  // Semana activa: la elegida si es válida, si no la más alta (total) — derivada,
  // sin efecto, para que al subir el ISP no parpadee "sin partidas".
  const semana = (semanaUser != null && isp?.semanas?.includes(semanaUser))
    ? semanaUser
    : (isp?.semanas?.length ? isp.semanas[isp.semanas.length - 1] : null);

  const tarifa = isp?.tarifa ?? 25.5;
  const data = (isp && semana != null) ? isp.porSemana[semana] : null;

  const partidas = useMemo(() => {
    if (!data) return [];
    return ocultarCeros ? data.partidas.filter((p) => !esZero(p.hhReal)) : data.partidas;
  }, [data, ocultarCeros]);

  const total = data?.total;
  const totAbs = total && Math.abs(total.hhReal) > 0.005 ? total.hhReal : 1;

  const subirArchivo = (e) => {
    const f = e.target.files?.[0];
    if (f) cargarISP(f).catch(() => {});
    e.target.value = '';
  };

  // ── Estado vacío: aún no se subió el ISP ──
  if (!isp) {
    return (
      <div style={{ background: BASE.white, border: `1px dashed ${BASE.gold}`, borderRadius: 16, padding: '40px 28px', textAlign: 'center', boxShadow: BASE.shadowMd }}>
        <p style={{ fontSize: 40, marginBottom: 6 }}>🧾</p>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: BASE.navy }}>Sube el ISP para ver el CR y el CHH</h3>
        <p style={{ fontSize: 12.5, color: BASE.muted, maxWidth: 560, margin: '8px auto 18px', lineHeight: 1.6 }}>
          El Costo Real (CR) y el Control de HH (CHH) se arman <strong>directamente del ISP</strong> que ya tienes
          (hojas ISP-SEM01…08). Podrás <strong>filtrar hasta cierta semana</strong> y el total se actualiza solo.
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={subirArchivo} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={cargando}
          style={{ padding: '12px 26px', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: `0 6px 16px ${BASE.gold}55` }}>
          {cargando ? '⏳ Leyendo…' : '📤 Subir ISP (.xlsx)'}
        </button>
        {error && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 14, fontWeight: 700 }}>⚠️ {error}</p>}
      </div>
    );
  }

  const esCR = modo === 'CR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera */}
      <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #075985)', color: '#fff', borderRadius: 16, padding: '16px 22px', boxShadow: '0 10px 30px -8px rgba(8,47,73,0.55)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: `6px solid ${BASE.gold}` }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.6, color: '#7dd3fc' }}>🧾 RESULTADO OPERATIVO · DESDE EL ISP</p>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 3 }}>{esCR ? 'CR · Costo Real por Partida' : 'CHH · Control de Horas-Hombre'}</h2>
          <p style={{ fontSize: 11.5, opacity: 0.88, marginTop: 3 }}>
            {proyectoActivo?.nombre || 'Proyecto activo'} · acumulado <strong>hasta SEM {semana}</strong>
            {isp._archivo ? ` · ${isp._archivo}` : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>COSTO MO PROMEDIO</p>
          <p style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: BASE.gold }}>S/ {tarifa.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}<span style={{ fontSize: 12, opacity: 0.85 }}> /h</span></p>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '10px 14px' }}>
        {/* Toggle CR / CHH */}
        <div style={{ display: 'inline-flex', background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
          {[['CR', 'CR · Costo'], ['CHH', 'CHH · Horas']].map(([id, lbl]) => (
            <button key={id} onClick={() => setModo(id)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, background: modo === id ? BASE.navy : 'transparent', color: modo === id ? '#fff' : BASE.muted }}>{lbl}</button>
          ))}
        </div>

        {/* Selector de semana */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: BASE.navy }}>
          Hasta la semana
          <select value={semana ?? ''} onChange={(e) => setSemanaUser(parseInt(e.target.value, 10))}
            style={{ padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 800, color: BASE.navy, background: BASE.white, cursor: 'pointer' }}>
            {isp.semanas.map((n) => <option key={n} value={n}>SEM {n}{n === isp.semanas[isp.semanas.length - 1] ? ' (total)' : ''}</option>)}
          </select>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: BASE.muted, fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={ocultarCeros} onChange={(e) => setOcultarCeros(e.target.checked)} />
          Ocultar partidas en cero
        </label>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={subirArchivo} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} disabled={cargando}
            style={{ padding: '7px 14px', background: BASE.white, color: BASE.navy, border: `1.5px solid ${BASE.border}`, borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
            {cargando ? '⏳…' : '🔄 Reemplazar ISP'}
          </button>
          <button onClick={limpiarISP} title="Quitar el ISP cargado"
            style={{ padding: '7px 12px', background: 'transparent', color: '#dc2626', border: `1px solid #dc262640`, borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 11 }}>
        {(esCR
          ? [
              { l: 'HH Total', v: HH(total?.hhReal || 0), c: '#6366f1', ico: '⏱️' },
              { l: 'Costo Real Total', v: S((total?.hhReal || 0) * tarifa), c: '#16a34a', ico: '💰' },
              { l: 'Partidas con costo', v: data ? data.partidas.filter((p) => !esZero(p.hhReal)).length : 0, c: BASE.navy, ico: '📋' },
              { l: 'Semana', v: `SEM ${semana}`, c: BASE.gold, ico: '📅' },
            ]
          : [
              { l: 'HH Meta', v: HH(total?.hhMeta || 0), c: '#0ea5e9', ico: '🎯' },
              { l: 'HH Real', v: HH(total?.hhReal || 0), c: '#6366f1', ico: '⏱️' },
              { l: 'Variación', v: VAR(total?.var ?? 0), c: (total?.var ?? 0) >= 0 ? '#16a34a' : '#dc2626', ico: '±' },
              { l: 'CPI Global', v: CPI(total?.cpi), c: BASE.navy, ico: '📈' },
            ]
        ).map((k) => (
          <div key={k.l} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `4px solid ${k.c}`, borderRadius: 12, padding: '12px 15px', boxShadow: '0 4px 14px -6px rgba(15,23,42,0.12)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.ico} {k.l}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: k.c, marginTop: 3, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 26px -10px rgba(15,23,42,0.18)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11.5, width: '100%', minWidth: 760 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr style={{ background: 'linear-gradient(180deg, #0f1f3a, #0b1729)' }}>
                <th style={{ ...th, textAlign: 'left', minWidth: 300, paddingLeft: 16 }}>PARTIDA</th>
                {esCR ? (
                  <>
                    <th style={th}>HH</th>
                    <th style={th}>COSTO (S/)</th>
                    <th style={{ ...th, minWidth: 130 }}>% DEL COSTO</th>
                  </>
                ) : (
                  <>
                    <th style={th}>HH META</th>
                    <th style={th}>HH REAL</th>
                    <th style={th}>VAR</th>
                    <th style={th}>CPI</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* TOTAL */}
              <tr style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderTop: `3px solid ${BASE.gold}`, borderBottom: `3px solid ${BASE.gold}` }}>
                <td style={{ padding: '9px 16px', color: '#fff', fontWeight: 900, fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', borderLeft: `4px solid ${BASE.gold}` }}>TOTAL {esCR ? 'COSTO REAL' : 'HORAS-HOMBRE'}</td>
                {esCR ? (
                  <>
                    <td style={{ ...tdNum, color: '#fff', fontWeight: 800 }}>{HH(total?.hhReal || 0)}</td>
                    <td style={{ ...tdNum, color: BASE.gold, fontWeight: 900 }}>{S((total?.hhReal || 0) * tarifa)}</td>
                    <td style={{ padding: '6px 12px', color: '#fff', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}>100%</td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdNum, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{HH(total?.hhMeta || 0)}</td>
                    <td style={{ ...tdNum, color: '#fff', fontWeight: 800 }}>{HH(total?.hhReal || 0)}</td>
                    <td style={{ ...tdNum, fontWeight: 800 }}>{VAR(total?.var ?? 0)}</td>
                    <td style={{ ...tdNum }}>{CPI(total?.cpi)}</td>
                  </>
                )}
              </tr>

              {partidas.map((p) => {
                const pct = (p.hhReal || 0) / totAbs;
                const barColor = pct >= 0.15 ? BASE.navy : pct >= 0.06 ? BASE.gold : '#94a3b8';
                return (
                  <React.Fragment key={p.codigo}>
                    {/* Fila PARTIDA */}
                    <tr style={{ background: '#eef2f7', borderTop: `1px solid ${BASE.border}` }}>
                      <td style={{ padding: '8px 12px', borderLeft: `4px solid ${barColor}` }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: barColor, borderRadius: 5, padding: '2px 6px', fontFamily: 'monospace', marginRight: 8 }}>{p.codigo}</span>
                        <span style={{ fontWeight: 800, fontSize: 12, color: BASE.navy }}>{p.nombre}</span>
                      </td>
                      {esCR ? (
                        <>
                          <td style={{ ...tdNum, fontWeight: 800, color: BASE.text }}>{HH(p.hhReal)}</td>
                          <td style={{ ...tdNum, fontWeight: 900, color: BASE.navy }}>{S(p.hhReal * tarifa)}</td>
                          <td style={{ padding: '6px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ flex: 1, height: 7, borderRadius: 999, background: '#dde5ef', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, height: '100%', borderRadius: 999, background: barColor }} />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 800, color: BASE.navy, minWidth: 30, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(pct * 100)}%</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ ...tdNum, color: BASE.muted, fontWeight: 700 }}>{HH(p.hhMeta)}</td>
                          <td style={{ ...tdNum, color: BASE.navy, fontWeight: 800 }}>{HH(p.hhReal)}</td>
                          <td style={{ ...tdNum, fontWeight: 800 }}>{VAR(p.var)}</td>
                          <td style={{ ...tdNum }}>{CPI(p.cpi)}</td>
                        </>
                      )}
                    </tr>
                    {/* Subpartidas */}
                    {p.subpartidas.filter((s) => !ocultarCeros || !esZero(s.hhReal)).map((s) => (
                      <tr key={s.codigo} style={{ background: BASE.white, borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 12px 6px 30px', color: BASE.text, fontSize: 11 }}>
                          <span style={{ fontSize: 9, color: BASE.muted, fontFamily: 'monospace', marginRight: 7 }}>{s.codigo}</span>{s.nombre}
                        </td>
                        {esCR ? (
                          <>
                            <td style={{ ...tdNum, color: BASE.text, fontSize: 11 }}>{HH(s.hhReal)}</td>
                            <td style={{ ...tdNum, color: BASE.muted, fontSize: 11 }}>{S(s.hhReal * tarifa)}</td>
                            <td style={{ padding: '6px 12px', color: BASE.muted, fontSize: 10, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(((s.hhReal || 0) / totAbs) * 100)}%</td>
                          </>
                        ) : (
                          <>
                            <td style={{ ...tdNum, color: BASE.muted, fontSize: 11 }}>{HH(s.hhMeta)}</td>
                            <td style={{ ...tdNum, color: BASE.text, fontSize: 11 }}>{HH(s.hhReal)}</td>
                            <td style={{ ...tdNum, fontSize: 11 }}>{VAR(s.var)}</td>
                            <td style={{ ...tdNum, fontSize: 11 }}>{CPI(s.cpi)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {partidas.length === 0 && (
                <tr><td colSpan={esCR ? 4 : 5} style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Sin partidas con HH hasta la SEM {semana}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 10.5, color: BASE.mutedSoft, lineHeight: 1.5 }}>
        Fuente: ISP subido · «hasta SEM N» usa la hoja ISP-SEM{semana} (HH acumulado). CR: COSTO = HH × S/{tarifa}. CHH: VAR = Meta − Real · CPI = Meta / Real (≥1 favorable).
      </p>
    </div>
  );
}
