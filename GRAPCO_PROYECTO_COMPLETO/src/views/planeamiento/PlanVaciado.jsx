// src/views/planeamiento/PlanVaciado.jsx
// PLAN DE VACIADO (GP-GCR-FOR-F17) — Tanque de Homogenización · PTARI CREDITEX.
// Matriz tipo LAP "tal cual el Excel": actividades × días con marcas de vaciado
// (X = avance de fase; C1/C2 = colada; S1A1 = Sector 1 · Anillo 1). Agrupa por fase
// (ESTRUCTURAS / ZAPATAS / MUROS / ...) con columnas METRADO/UND/SEC/IP/HH/MO.
// Presentación formal GRAPCO: VistaHeader + franja KPI compacta + leyenda de chips
// + matriz con cabeceras sticky (top) y primera columna sticky (left).
// Data: src/data/planVaciadoCreditex.js (regenerar con scripts/extraerPlanVaciado.cjs).

import React from 'react';
import { BASE } from '../../utils/styles';
import VistaHeader from '../../components/VistaHeader';
import { PLANVACIADO } from '../../data/planVaciadoCreditex';

// ── Estilos de marca (sobrios, paleta GRAPCO): fondo suave + borde + texto navy ──
const ESTILO_HITO = { bg: BASE.navySoft, bd: '#B9C9DC', tx: BASE.navy };       // "X" = avance/planificación de la fase
const ESTILO_COLADA = { bg: BASE.goldLight, bd: BASE.gold, tx: BASE.navy };    // C1, C2, ... = coladas de concreto simple
const ESTILO_ANILLO = {                                                        // SxAy = sector · anillo (tonos apagados)
  '1': { bg: '#E8F0FA', bd: '#7FA3CC', tx: BASE.navy },
  '2': { bg: '#E2F0EE', bd: '#5E9C94', tx: '#1F4E49' },
  '3': { bg: '#ECE8F4', bd: '#9A8CC0', tx: '#4A3D73' },
  '4': { bg: '#F7E9EE', bd: '#C98BA4', tx: '#7A3B55' },
};
const ESTILO_SECTOR = { bg: '#EAEFF4', bd: '#9AA5B5', tx: '#33415C' };         // S1, S2 sin anillo

function tipoMarca(m) {
  if (!m || m === 0) return null;
  const s = String(m);
  if (/^X$/i.test(s)) return { kind: 'hito', st: ESTILO_HITO, label: s };
  if (/^C\d+$/i.test(s)) return { kind: 'colada', st: ESTILO_COLADA, label: s };
  const an = (s.match(/A(\d+)/) || [])[1];           // S1A1 → anillo 1
  if (an) return { kind: 'sector', st: ESTILO_ANILLO[an] || ESTILO_SECTOR, label: s };
  return { kind: 'sector', st: ESTILO_SECTOR, label: s };
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

  // anillos presentes en la matriz (solo para la leyenda)
  const anillosPresentes = Array.from(new Set(
    P.actividades.flatMap(a => (a.grid || []).map(m => (String(m || '').match(/A(\d+)/) || [])[1]).filter(Boolean))
  )).sort();

  const LW = 360, DW = 30;
  const totalW = LW + dias.length * DW;
  const tn = { padding: '4px 6px', fontSize: '10.5px', textAlign: 'right', fontFamily: 'monospace' };

  const FIJAS = [
    { k: 'metrado', w: 52, lbl: 'MET', fmt: (a) => nf(a.metrado, a.metrado != null && a.metrado < 100 && a.metrado % 1 ? 2 : 0) },
    { k: 'und', w: 30, lbl: 'UND', fmt: (a) => a.und || '', muted: true },
    { k: 'sectores', w: 28, lbl: 'SEC', fmt: (a) => (a.sectores != null ? a.sectores : '') },
    { k: 'ip', w: 42, lbl: 'IP', fmt: (a) => (a.ip != null ? Number(a.ip).toFixed(a.ip < 1 ? 4 : 3) : ''), muted: true },
    { k: 'hh', w: 40, lbl: 'HH', fmt: (a) => (a.hh != null ? nf(a.hh, a.hh % 1 ? 1 : 0) : ''), strong: true },
    { k: 'mo', w: 28, lbl: 'MO', fmt: (a) => (a.mo != null ? a.mo : '') },
  ];

  const KPIS = [
    ['Actividades', k.totalActividades],
    ['Fases', k.totalFases],
    ['Días', P.numDias],
    ['HH Total', nf(k.totalHH, 0)],
    ['MO Total', k.totalMO],
    ['Rango', `${fmtFecha(k.diaInicio)} – ${fmtFecha(k.diaFin)}`],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: BASE.font }}>
      {/* ── HEADER unificado GRAPCO ── */}
      <VistaHeader
        icono="layers"
        eyebrow={`Plan de Vaciado · ${P.flujo}`}
        titulo={P.titulo}
        subtitulo={`${P.proyecto}${P.meta?.obra ? ` · ${P.meta.obra}` : ''} · Matriz actividades × días del tren de vaciado (X avance · C1/C2 colada · S1A1 sector·anillo)`}
      />

      {/* ── franja KPI compacta ── */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '9px 6px', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', boxShadow: BASE.shadowSm }}>
        {KPIS.map(([l, v], i) => (
          <div key={l} style={{ flex: '1 1 auto', minWidth: '104px', padding: '2px 16px', borderLeft: i ? `1px solid ${BASE.borderSoft}` : 'none' }}>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: BASE.muted, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{l}</p>
            <p style={{ fontSize: '15px', fontWeight: 800, color: BASE.navy, margin: '1px 0 0' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* ── leyenda de marcas + metrados del tanque ── */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 700, color: BASE.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Marcas</span>
        <Leyenda st={ESTILO_HITO} chip="X" txt="Avance de fase" />
        <Leyenda st={ESTILO_COLADA} chip="C1/C2" txt="Colada" />
        {anillosPresentes.map(a => (
          <Leyenda key={a} st={ESTILO_ANILLO[a] || ESTILO_SECTOR} chip={`SxA${a}`} txt={`Anillo ${a}`} />
        ))}
        {P.metrTanque?.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {P.metrTanque.filter(m => /TOTAL|Requerir/i.test(m.label)).slice(0, 3).map((m, i) => (
              <span key={i} style={{ fontSize: '10.5px', color: BASE.muted, fontStyle: 'italic' }}>
                {m.label}: <strong style={{ color: BASE.navy, fontStyle: 'normal' }}>{nf(m.valor, 3)} {m.und.toLowerCase()}</strong>
              </span>
            ))}
          </span>
        )}
      </div>

      {/* ── MATRIZ ── */}
      <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowMd }}>
        <div style={{ overflow: 'auto', maxHeight: '74vh' }}>
          <div style={{ minWidth: totalW }}>

            {/* fila 1 cabecera: SEMANAS */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 5, background: BASE.navyDark, color: BASE.white }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 6, background: BASE.navyDark, borderRight: `2px solid ${BASE.gold}`, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', height: 24 }}>
                Pull Planning · Tren de Vaciado
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {semanas.map((s, i) => (
                  <div key={i} style={{ width: s.span * DW, minWidth: s.span * DW, flexShrink: 0, textAlign: 'center', fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px', color: BASE.gold, borderRight: '1px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, whiteSpace: 'nowrap' }}>
                    {s.semana}
                  </div>
                ))}
              </div>
            </div>

            {/* fila 2 cabecera: columnas fijas + fecha (día/mes) + día de semana */}
            <div style={{ display: 'flex', position: 'sticky', top: 24, zIndex: 5, background: BASE.navy, color: BASE.white, borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 6, background: BASE.navy, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.6px', borderRight: `2px solid ${BASE.navyDark}`, height: 34 }}>
                <span style={{ flex: 1 }}>ACTIVIDAD</span>
                {FIJAS.map(f => <span key={f.k} style={{ width: f.w, minWidth: f.w, textAlign: 'right', flexShrink: 0, fontSize: '9px' }}>{f.lbl}</span>)}
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {dias.map((d, i) => {
                  const finde = d.dow === 'sáb' || d.dow === 'dom';
                  return (
                    <div key={i} style={{ width: DW, minWidth: DW, flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', background: finde ? 'rgba(255,255,255,0.07)' : 'transparent', height: 34 }} title={d.fecha}>
                      <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1.1 }}>{fmtFecha(d.fecha)}</span>
                      <span style={{ fontSize: '7px', opacity: 0.72, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{d.dow}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* cuerpo: por fase → fila de fase + actividades */}
            {ordenFases.map((fase) => {
              const acts = porFase.get(fase) || [];
              const g = grupoByTitulo.get(fase);
              return (
                <React.Fragment key={fase}>
                  {/* fila de FASE (nivel) con su propia banda de marcas */}
                  <div style={{ display: 'flex', background: BASE.navySoft, borderTop: `1px solid ${BASE.border}`, borderBottom: `1px solid ${BASE.border}`, minHeight: 25 }}>
                    <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: BASE.navySoft, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderRight: `2px solid ${BASE.border}` }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: BASE.white, background: BASE.navy, borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.5px' }}>{g?.nivel || 'N3'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{fase}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 700, color: BASE.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{acts.length} act.</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {dias.map((d, i) => {
                        const on = g && g.grid[i] && g.grid[i] !== 0;
                        return <div key={i} style={{ width: DW, minWidth: DW, flexShrink: 0, borderRight: `1px solid ${BASE.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? `${BASE.navy}14` : 'transparent' }}>
                          {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: BASE.navy }} />}
                        </div>;
                      })}
                    </div>
                  </div>

                  {/* actividades de la fase */}
                  {acts.map((a, ai) => {
                    const rowBg = ai % 2 ? BASE.bgSoft : BASE.white;
                    return (
                      <div key={ai} style={{ display: 'flex', borderBottom: `1px solid ${BASE.borderSoft}`, minHeight: 26, background: rowBg }}>
                        <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: rowBg, display: 'flex', alignItems: 'center', padding: '0 10px', borderRight: `2px solid ${BASE.border}` }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: '11px', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${a.cod} · ${a.actividad}`}>
                            <b style={{ color: BASE.navyLight, fontSize: '9.5px' }}>{a.cod} </b>{a.actividad}
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
                              <div key={i} title={t ? `${a.cod} · ${t.label} · ${fmtFecha(d.fecha)}` : ''} style={{ width: DW, minWidth: DW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BASE.borderSoft}`, background: t ? t.st.bg : (finde ? '#F4F6FA' : 'transparent'), boxShadow: t ? `inset 0 0 0 1px ${t.st.bd}` : 'none' }}>
                                {t && (
                                  <span style={{ fontSize: '7.5px', fontWeight: 800, color: t.st.tx, whiteSpace: 'nowrap', lineHeight: 1.2, letterSpacing: '0.2px' }}>
                                    {t.label}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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

function Leyenda({ st, chip, txt }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '10px', fontWeight: 800, color: st.tx, background: st.bg, border: `1px solid ${st.bd}`, borderRadius: '4px', padding: '1px 6px', lineHeight: 1.5 }}>{chip}</span>
      <span style={{ fontSize: '10.5px', fontWeight: 600, color: BASE.muted }}>{txt}</span>
    </span>
  );
}
