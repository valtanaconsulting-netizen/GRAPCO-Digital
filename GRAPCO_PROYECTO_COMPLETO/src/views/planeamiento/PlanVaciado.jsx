// src/views/planeamiento/PlanVaciado.jsx
// PLAN DE VACIADO (GP-GCR-FOR-F17) — Tanque de Homogenización · PTARI CREDITEX.
// Matriz tipo LAP "tal cual el Excel" pero premium: actividades × días con marcas de
// vaciado (X = avance de fase; C1/C2 = colada; S1A1 = Sector 1 · Anillo 1). Agrupa por fase
// (ESTRUCTURAS / ZAPATAS / MUROS / ...) con columnas METRADO/UND/SEC/IP/HH/MO. KPIs arriba.
// Data: src/data/planVaciadoCreditex.js (regenerar con scripts/extraerPlanVaciado.cjs).

import React from 'react';
import { BASE } from '../../utils/styles';
import { PLANVACIADO } from '../../data/planVaciadoCreditex';

// ── Paleta de marcas: tipo de marca → color (colada / sector-anillo / hito) ──
const COLOR_HITO = '#94a3b8';                 // "X" = avance/planificación de la fase
const COLOR_COLADA = BASE.gold;               // C1, C2, ... = coladas de concreto simple
const ANILLO_COLOR = { '1': '#2563eb', '2': '#0d9488', '3': '#7c3aed', '4': '#db2777' };
const COLOR_SECTOR = '#0d9488';               // S1, S2 sin anillo

function tipoMarca(m) {
  if (!m || m === 0) return null;
  const s = String(m);
  if (/^X$/i.test(s)) return { kind: 'hito', color: COLOR_HITO, label: s };
  if (/^C\d+$/i.test(s)) return { kind: 'colada', color: COLOR_COLADA, label: s };
  const an = (s.match(/A(\d+)/) || [])[1];           // S1A1 → anillo 1
  if (an) return { kind: 'sector', color: ANILLO_COLOR[an] || COLOR_SECTOR, label: s };
  return { kind: 'sector', color: COLOR_SECTOR, label: s };
}

const nf = (n, d = 0) => (n == null ? '' : Number(n).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }));
const fmtFecha = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

export default function PlanVaciado() {
  const P = PLANVACIADO;
  const dias = P.dias || [];
  const k = P.kpis || {};

  // ── orden de filas: fases en el orden del Excel, con sus actividades dentro ──
  const ordenFases = P.grupos.map(g => g.titulo);
  const porFase = new Map();
  ordenFases.forEach(f => porFase.set(f, []));
  P.actividades.forEach(a => {
    if (!porFase.has(a.grupo)) porFase.set(a.grupo, []);
    porFase.get(a.grupo).push(a);
  });
  const grupoByTitulo = new Map(P.grupos.map(g => [g.titulo, g]));

  // ── bandas de semana (para la cabecera superior con merge visual) ──
  const semanas = [];
  dias.forEach((d, i) => {
    const prev = semanas[semanas.length - 1];
    if (prev && prev.semana === d.semana) prev.span += 1;
    else semanas.push({ semana: d.semana, span: 1, from: i });
  });

  const LW = 360, DW = 30;
  const totalW = LW + dias.length * DW;
  const td = { padding: '4px 6px', fontSize: '10px' };
  const tn = { ...td, textAlign: 'right', fontFamily: 'monospace' };

  const FIJAS = [
    { k: 'metrado', w: 52, lbl: 'MET', fmt: (a) => nf(a.metrado, a.metrado != null && a.metrado < 100 && a.metrado % 1 ? 2 : 0) },
    { k: 'und', w: 30, lbl: 'UND', fmt: (a) => a.und || '', muted: true },
    { k: 'sectores', w: 28, lbl: 'SEC', fmt: (a) => (a.sectores != null ? a.sectores : '') },
    { k: 'ip', w: 42, lbl: 'IP', fmt: (a) => (a.ip != null ? Number(a.ip).toFixed(a.ip < 1 ? 4 : 3) : ''), muted: true },
    { k: 'hh', w: 40, lbl: 'HH', fmt: (a) => (a.hh != null ? nf(a.hh, a.hh % 1 ? 1 : 0) : ''), strong: true },
    { k: 'mo', w: 28, lbl: 'MO', fmt: (a) => (a.mo != null ? a.mo : '') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: BASE.font }}>
      {/* ── HEADER navy con gradiente + chips KPI ── */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff', borderRadius: '14px', padding: '18px 24px', borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 12px 32px -20px rgba(8,26,46,0.8)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.6px', margin: 0 }}>
          🪣 PLAN DE VACIADO · {P.flujo}
        </p>
        <h1 style={{ fontSize: '21px', fontWeight: 900, marginTop: '4px', marginBottom: 0 }}>{P.titulo}</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px', marginBottom: 0 }}>
          {P.proyecto}{P.meta?.obra ? ` · ${P.meta.obra}` : ''} · matriz <strong>actividades × días</strong> del tren de vaciado.
          Cada celda es la marca del Excel: <strong>X</strong> avance de fase, <strong>C1/C2</strong> coladas, <strong>S1A1</strong> sector·anillo.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {[
            ['ACTIVIDADES', k.totalActividades],
            ['FASES', k.totalFases],
            ['DÍAS', P.numDias],
            ['HH TOTAL', nf(k.totalHH, 0)],
            ['MO TOTAL', k.totalMO],
            ['RANGO', `${fmtFecha(k.diaInicio)} – ${fmtFecha(k.diaFin)}`],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 16px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.8px', margin: 0 }}>{l}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, marginTop: '1px', marginBottom: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── leyenda de marcas + metrados del tanque ── */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px', color: BASE.muted, padding: '0 4px' }}>
        <span style={{ fontWeight: 800, color: BASE.navy }}>Marcas:</span>
        <Leyenda color={COLOR_HITO} txt="X · avance de fase" />
        <Leyenda color={COLOR_COLADA} txt="C1/C2 · colada" />
        {['1', '2', '3', '4'].map(a => <Leyenda key={a} color={ANILLO_COLOR[a]} txt={`Anillo ${a}`} />)}
        {P.metrTanque?.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {P.metrTanque.filter(m => /TOTAL|Requerir/i.test(m.label)).slice(0, 3).map((m, i) => (
              <span key={i} style={{ fontStyle: 'italic' }}>{m.label}: <strong style={{ color: BASE.navy }}>{nf(m.valor, 3)} {m.und.toLowerCase()}</strong></span>
            ))}
          </span>
        )}
      </div>

      {/* ── MATRIZ ── */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflow: 'auto', maxHeight: '74vh' }}>
          <div style={{ minWidth: totalW }}>

            {/* fila 1 cabecera: SEMANAS */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 4, background: BASE.navyDark, color: '#fff' }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, borderRight: `2px solid ${BASE.gold}`, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '9px', fontWeight: 900, letterSpacing: '1px', height: 24 }}>
                PULL PLANNING · TREN DE VACIADO
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {semanas.map((s, i) => (
                  <div key={i} style={{ width: s.span * DW, minWidth: s.span * DW, flexShrink: 0, textAlign: 'center', fontSize: '8.5px', fontWeight: 800, color: BASE.gold, borderRight: '1px solid rgba(255,255,255,0.18)', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, whiteSpace: 'nowrap' }}>
                    {s.semana}
                  </div>
                ))}
              </div>
            </div>

            {/* fila 2 cabecera: columnas fijas + fecha (día/mes) + día de semana */}
            <div style={{ display: 'flex', position: 'sticky', top: 24, zIndex: 4, background: BASE.navy, color: '#fff', borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '9px', fontWeight: 900, borderRight: `2px solid ${BASE.navyDark}`, height: 34 }}>
                <span style={{ flex: 1 }}>ACTIVIDAD</span>
                {FIJAS.map(f => <span key={f.k} style={{ width: f.w, minWidth: f.w, textAlign: 'right', flexShrink: 0 }}>{f.lbl}</span>)}
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {dias.map((d, i) => {
                  const finde = d.dow === 'sáb' || d.dow === 'dom';
                  return (
                    <div key={i} style={{ width: DW, minWidth: DW, flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', background: finde ? 'rgba(255,255,255,0.07)' : 'transparent', height: 34 }} title={d.fecha}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1.1 }}>{fmtFecha(d.fecha)}</span>
                      <span style={{ fontSize: '7px', opacity: 0.7, textTransform: 'uppercase' }}>{d.dow}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* cuerpo: por fase → fila de fase + actividades */}
            {ordenFases.map((fase, fi) => {
              const acts = porFase.get(fase) || [];
              const g = grupoByTitulo.get(fase);
              return (
                <React.Fragment key={fase}>
                  {/* fila de FASE (nivel) con su propia banda de X */}
                  <div style={{ display: 'flex', background: BASE.navySoft, borderTop: `1px solid ${BASE.border}`, borderBottom: `1px solid ${BASE.border}`, minHeight: 24 }}>
                    <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderRight: `2px solid ${BASE.border}` }}>
                      <span style={{ fontSize: '8px', fontWeight: 900, color: '#fff', background: BASE.navy, borderRadius: '4px', padding: '1px 5px' }}>{g?.nivel || 'N3'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.4px' }}>{fase}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '9px', color: BASE.muted }}>{acts.length} act.</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {dias.map((d, i) => {
                        const on = g && g.grid[i] && g.grid[i] !== 0;
                        return <div key={i} style={{ width: DW, minWidth: DW, flexShrink: 0, borderRight: '1px solid #e7edf5', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? `${BASE.navy}1a` : 'transparent' }}>
                          {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: BASE.navy }} />}
                        </div>;
                      })}
                    </div>
                  </div>

                  {/* actividades de la fase */}
                  {acts.map((a, ai) => (
                    <div key={ai} style={{ display: 'flex', borderBottom: '1px solid #eef2f6', minHeight: 26, background: ai % 2 ? '#f8fbff' : '#fff' }}>
                      <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px', borderRight: `2px solid ${BASE.border}` }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: '10px', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${a.cod} · ${a.actividad}`}>
                          <b style={{ color: BASE.navyLight, fontSize: '9px' }}>{a.cod} </b>{a.actividad}
                        </span>
                        {FIJAS.map(f => (
                          <span key={f.k} style={{ ...tn, width: f.w, minWidth: f.w, color: f.strong ? BASE.navy : (f.muted ? BASE.muted : BASE.text), fontWeight: f.strong ? 800 : 400 }}>
                            {f.fmt(a)}
                          </span>
                        ))}
                      </div>
                      <div style={{ flex: 1, display: 'flex' }}>
                        {dias.map((d, i) => {
                          const t = tipoMarca(a.grid[i]);
                          const finde = d.dow === 'sáb' || d.dow === 'dom';
                          return (
                            <div key={i} title={t ? `${a.cod} · ${t.label} · ${fmtFecha(d.fecha)}` : ''} style={{ width: DW, minWidth: DW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #eef2f6', background: t ? `${t.color}1f` : (finde ? '#f4f7fb' : 'transparent') }}>
                              {t && (
                                <span style={{ fontSize: '7px', fontWeight: 800, color: '#fff', background: t.color, borderRadius: '3px', padding: '1px 3px', whiteSpace: 'nowrap', lineHeight: 1.2, boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>
                                  {t.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic', marginTop: 0 }}>
        Importado del Excel {P.flujo} (hoja «4. Pull»). IP/HH/MO con #DIV/0! (SECTORES = 0) se muestran vacíos.
        El desfase en diagonal entre actividades es el tren Lean de vaciado · {k.semanaInicio} → {k.semanaFin}.
      </p>
    </div>
  );
}

function Leyenda({ color, txt }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: 12, height: 12, borderRadius: '3px', background: color }} /> {txt}
    </span>
  );
}
