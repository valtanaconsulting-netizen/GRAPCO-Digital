// src/views/modulos/resultadoOperativo/CostoRealOficial.jsx
// CR · Costo Real (Reporte de Tareos) importado tal cual del ISP CREDITEX (hoja CR).
// Costo = HH × Costo MO promedio. Alimenta el Actual Cost (AC) del RO.
// Diseño ejecutivo: jerarquía por niveles, barras de % por costo, ceros atenuados.

import React, { useState, useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { CR_CREDITEX } from '../../../data/costoRealCreditex';

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
  const { meta, filas } = CR_CREDITEX;
  const [verFormulas, setVerFormulas] = useState(false);
  const [verSubs, setVerSubs] = useState(true);
  const [abierto, setAbierto] = useState(null);

  const total = useMemo(() => filas.find((f) => f.tipo === 'total'), [filas]);
  const t = total?.v || {};
  const totAcum = (typeof t.acum === 'number' && t.acum) || 1;
  const filasVis = filas.filter((f) => verSubs || f.tipo !== 'sub');

  const pct = (f) => (typeof f.v?.acum === 'number' ? f.v.acum / totAcum : 0);
  // color de acento por magnitud (detectar los grandes costos)
  const acento = (p) => p >= 0.15 ? BASE.navy : p >= 0.06 ? BASE.gold : p >= 0.01 ? '#94a3b8' : '#e2e8f0';

  const cel = (f, k, muted) => {
    if (verFormulas && f.f?.[k]) return <span style={{ fontSize: 9, color: f.tipo === 'total' ? '#cbd5e1' : BASE.muted, fontFamily: 'monospace' }}>{f.f[k]}</span>;
    return k === 'hh' ? HH(f.v?.hh) : S(f.v?.[k]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera ejecutiva */}
      <div style={{ background: `linear-gradient(135deg, #0c4a6e, #075985)`, color: '#fff', borderRadius: 16, padding: '18px 24px', boxShadow: '0 10px 30px -8px rgba(8,47,73,0.55)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: `6px solid ${BASE.gold}` }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.6, color: '#7dd3fc' }}>🧾 {meta.fuente}</p>
          <h2 style={{ fontSize: 21, fontWeight: 900, marginTop: 3, letterSpacing: 0.2 }}>{meta.titulo}</h2>
          <p style={{ fontSize: 11.5, opacity: 0.88, marginTop: 3 }}>{meta.nota}</p>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>COSTO MO PROMEDIO</p>
          <p style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: BASE.gold }}>S/ {HH(meta.costoMOprom)}<span style={{ fontSize: 13, opacity: 0.85 }}> /h</span></p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 11 }}>
        {[
          { l: 'HH Total', v: HH(t.hh), c: '#6366f1', ico: '⏱️' },
          { l: 'Costo MO (semana)', v: S(t.costo, false), c: '#0ea5e9', ico: '💵' },
          { l: 'Acumulado S/ IGV', v: S(t.acum, false), c: '#16a34a', ico: '📊' },
        ].map((k) => (
          <div key={k.l} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `4px solid ${k.c}`, borderRadius: 12, padding: '12px 15px', boxShadow: '0 4px 14px -6px rgba(15,23,42,0.12)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.ico} {k.l}</p>
            <p style={{ fontSize: 21, fontWeight: 900, color: k.c, marginTop: 3, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setVerSubs((s) => !s)} style={btn(verSubs)}>{verSubs ? '➖ Ocultar sub-partidas' : '➕ Ver sub-partidas'}</button>
        <button onClick={() => setVerFormulas((s) => !s)} style={btn(verFormulas)}>{verFormulas ? '🔢 Ver valores' : 'ƒ Ver fórmulas'}</button>
        <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 'auto' }}>Importado tal cual del Excel · HH × S/{HH(meta.costoMOprom)}/h · la barra = % del costo total</span>
      </div>

      {/* Tabla ejecutiva */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 26px -10px rgba(15,23,42,0.18)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11.5, width: '100%', minWidth: 880 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr style={{ background: `linear-gradient(180deg, #0f1f3a, #0b1729)` }}>
                <th style={{ ...th, textAlign: 'left', minWidth: 300, paddingLeft: 16 }}>PARTIDA</th>
                <th style={th}>HH</th>
                <th style={th}>COSTO S/</th>
                <th style={th}>ACUM S/ IGV</th>
                <th style={{ ...th, minWidth: 150 }}>% DEL COSTO</th>
                <th style={{ ...th, width: 40 }}>📝</th>
              </tr>
            </thead>
            <tbody>
              {filasVis.map((f, idx) => {
                const nota = !!f.v?.comentario;
                const p = pct(f);
                const isTotal = f.tipo === 'total', isSecc = f.tipo === 'seccion', isPart = f.tipo === 'partida', isSub = f.tipo === 'sub';
                const indent = isSub ? 26 : isPart ? 14 : 0;
                const rowBg = isTotal ? 'transparent' : isSecc ? 'transparent' : isPart ? '#f8fafc' : (idx % 2 ? '#fcfdfe' : BASE.white);
                const txtColor = isTotal ? '#fff' : isSecc ? BASE.navy : BASE.navy;
                const barColor = acento(p);
                return (
                  <React.Fragment key={f.fila}>
                    <tr
                      style={{
                        background: isTotal ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : isSecc ? `linear-gradient(90deg, ${BASE.gold}22, ${BASE.gold}08)` : rowBg,
                        borderTop: isTotal ? `3px solid ${BASE.gold}` : isSecc ? `2px solid ${BASE.gold}` : `1px solid #eef2f7`,
                        borderBottom: isTotal ? `3px solid ${BASE.gold}` : 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { if (!isTotal) e.currentTarget.style.background = isSecc ? `${BASE.gold}33` : '#eef5ff'; }}
                      onMouseLeave={(e) => { if (!isTotal) e.currentTarget.style.background = isSecc ? `linear-gradient(90deg, ${BASE.gold}22, ${BASE.gold}08)` : rowBg; }}
                    >
                      {/* PARTIDA con franja de acento por nivel */}
                      <td style={{ padding: 0, borderLeft: isPart ? `4px solid ${barColor}` : isSecc ? `4px solid ${BASE.goldDark}` : isTotal ? `4px solid ${BASE.gold}` : '4px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', paddingLeft: 12 + indent }}>
                          {f.codigo ? (
                            <span style={{ fontSize: 9, fontWeight: 800, color: isTotal ? BASE.gold : '#fff', background: isTotal ? 'rgba(229,168,47,0.18)' : (isPart ? barColor : isSecc ? BASE.goldDark : '#cbd5e1'), borderRadius: 5, padding: '2px 6px', minWidth: 30, textAlign: 'center', fontFamily: 'monospace' }}>{f.codigo}</span>
                          ) : null}
                          <span style={{ fontWeight: isSub ? 600 : 900, fontSize: isTotal ? 12.5 : isSub ? 11 : 11.5, color: txtColor, letterSpacing: isSecc || isTotal ? 0.5 : 0.1, textTransform: isSecc || isTotal ? 'uppercase' : 'none', whiteSpace: 'nowrap' }}>{f.descripcion}</span>
                        </div>
                      </td>
                      {/* HH */}
                      <td style={{ ...tdNum, color: isTotal ? '#fff' : BASE.text, fontWeight: isSub ? 600 : 800 }}>{cel(f, 'hh')}</td>
                      {/* COSTO semana (secundario, atenuado) */}
                      <td style={{ ...tdNum, color: isTotal ? 'rgba(255,255,255,0.7)' : BASE.muted, fontWeight: 600, fontSize: 11 }}>{cel(f, 'costo')}</td>
                      {/* ACUM (primario) */}
                      <td style={{ ...tdNum, color: isTotal ? BASE.gold : (isSub ? BASE.text : BASE.navy), fontWeight: isSub ? 700 : 900 }}>{cel(f, 'acum')}</td>
                      {/* % del costo con barra */}
                      <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                        {verFormulas ? null : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ flex: 1, height: 7, borderRadius: 999, background: isTotal ? 'rgba(255,255,255,0.18)' : '#eef2f7', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, Math.round(p * 100))}%`, height: '100%', borderRadius: 999, background: isTotal ? BASE.gold : `linear-gradient(90deg, ${barColor}, ${barColor}bb)` }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: isTotal ? '#fff' : (p >= 0.06 ? BASE.navy : BASE.muted), minWidth: 30, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(p * 100)}%</span>
                          </div>
                        )}
                      </td>
                      {/* nota */}
                      <td style={{ textAlign: 'center', cursor: nota ? 'pointer' : 'default' }} onClick={() => nota && setAbierto(abierto === f.fila ? null : f.fila)}>
                        {nota ? <span style={{ fontSize: 13 }}>{abierto === f.fila ? '🔽' : '📝'}</span> : ''}
                      </td>
                    </tr>
                    {abierto === f.fila && nota && (
                      <tr><td colSpan={6} style={{ background: '#fffdf5', padding: '11px 18px', borderLeft: `4px solid ${BASE.gold}`, borderBottom: `1px solid ${BASE.border}` }}>
                        <p style={{ fontSize: 11.5, color: BASE.text, lineHeight: 1.55 }}><b style={{ color: BASE.navy }}>💬 Comentario:</b> {f.v.comentario}</p>
                      </td></tr>
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

const th = { padding: '11px 12px', color: '#cbd5e1', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.7, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `3px solid ${BASE.gold}` };
const tdNum = { padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--grapco-font-mono, monospace)', whiteSpace: 'nowrap' };
const btn = (on) => ({ fontSize: 11, fontWeight: 800, padding: '7px 13px', borderRadius: 9, border: `1px solid ${on ? BASE.navy : BASE.border}`, background: on ? BASE.navy : BASE.white, color: on ? '#fff' : BASE.navy, cursor: 'pointer' });
