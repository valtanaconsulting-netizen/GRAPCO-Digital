// src/views/planeamiento/PullPlanning.jsx
// PULL PLANNING (GP-GCR-FOR-F14) — PTARI CREDITEX.
// Dos paneles: (1) DECISIÓN DE PLAZO (alternativa elegida: inicio/fin/laborales/meses)
// y (2) TREN DE ACTIVIDADES (matriz tipo LAP: actividades × días, cada celda = "X"
// avance o el código de sector A1/S1/A1S1/C1...). Data: src/data/pullPlanningCreditex.js
// Estilo GRAPCO formal: VistaHeader navy + gold, KPIs en franja compacta,
// matriz cebra con cabecera sticky navy y marcas sobrias (gold suave / navy suave).

import React from 'react';
import { BASE } from '../../utils/styles';
import VistaHeader from '../../components/VistaHeader';
import { PULLPLANNING } from '../../data/pullPlanningCreditex';

// ---- estilo sobrio por código de celda (paleta GRAPCO) ----
// Programado ("X" o sector A#/S#/A#S#): gold suave. Hito de concreto (C#): navy suave.
const MARCA = {
  programado: { bg: '#FCEFC9', borde: '#EFD9A0' },
  hito:       { bg: '#E3EAF3', borde: '#C9D5E4' },
};
function estiloMarca(v) {
  if (!v) return null;
  const s = String(v).toUpperCase();
  return /^C\d+/.test(s) ? MARCA.hito : MARCA.programado;
}

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${m[3]} ${meses[+m[2] - 1]} ${m[1]}`;
};
const nf = (n, d = 0) => (n == null ? '' : Number(n).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }));

// ---- tipografía formal GRAPCO ----
const TITULO_SEC = { fontSize: '13px', fontWeight: 800, color: BASE.navy, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 };
const LABEL = { fontSize: '10.5px', fontWeight: 700, color: BASE.muted, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 };

function ChipLeyenda({ marca, codigo, texto }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        minWidth: 18, height: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: marca.bg, border: `1px solid ${marca.borde}`, borderRadius: '3px',
        fontSize: '8px', fontWeight: 800, color: BASE.navy, padding: '0 3px', lineHeight: 1,
      }}>{codigo}</span>
      <span style={{ fontSize: '10px', fontWeight: 600, color: BASE.muted }}>{texto}</span>
    </span>
  );
}

export default function PullPlanning() {
  const P = PULLPLANNING;
  const dias = P.dias || [];
  const cols = dias.length;
  const filas = P.actividades || [];
  const reales = filas.filter(a => a.tipo === 'actividad');
  const secciones = filas.filter(a => a.tipo === 'seccion');
  const totHH = reales.reduce((s, a) => s + (a.hh || 0), 0);
  const totMO = reales.reduce((s, a) => s + (a.mo || 0), 0);
  const totMarcas = filas.reduce((s, a) => s + (a.grid ? a.grid.filter(x => x != null).length : 0), 0);
  const dec = (P.decision && P.decision[0]) || null;

  const LW = 430, DW = 26;
  const td = { padding: '4px 6px', fontSize: '10px' };
  const tn = { ...td, textAlign: 'right', fontFamily: 'ui-monospace, monospace', width: 30, flexShrink: 0, color: BASE.text };
  const bandaSeccion = '#EDF2F8';

  const kpis = [
    ['Actividades', reales.length],
    ['Días plazo', P.diasPlazo ?? cols],
    ['Laborales', dec ? dec.laborales : '—'],
    ['Meses', P.meses ?? (dec ? dec.meses : '—')],
    ['HH total', Math.round(totHH).toLocaleString('es-PE')],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ===== HEADER ===== */}
      <VistaHeader
        icono="layers"
        eyebrow="Planeamiento · Pull Planning · GP-GCR-FOR-F14"
        titulo={P.titulo}
        subtitulo={`${P.cliente} · ${P.ubicacion} · Plan colaborativo del último responsable: cada celda es el avance del día ("X" o código de sector); el desfase en diagonal es el tren Lean.`}
      />

      {/* ===== KPIs (franja compacta) ===== */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '8px 6px', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', boxShadow: BASE.shadowMd }}>
        {kpis.map(([l, v], i) => (
          <div key={l} style={{ padding: '2px 18px', borderLeft: i ? `1px solid ${BASE.border}` : 'none' }}>
            <p style={LABEL}>{l}</p>
            <p style={{ fontSize: '15px', fontWeight: 800, color: BASE.navy, fontFamily: 'ui-monospace, monospace', margin: '2px 0 0' }}>{v}</p>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', padding: '2px 12px', alignSelf: 'center', textAlign: 'right' }}>
          <p style={{ fontSize: '10px', color: BASE.muted, margin: 0 }}>Jornada {P.jornadaHHdia || 8} HH/día</p>
          <p style={{ fontSize: '10px', color: BASE.muted, margin: '1px 0 0' }}>Elab. {P.elaboradoPor || '—'} · Rev. {P.revisadoPor || '—'}</p>
        </div>
      </div>

      {/* ===== DECISIÓN DE PLAZO ===== */}
      {dec && (
        <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, padding: '14px 18px', boxShadow: BASE.shadowMd }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h2 style={TITULO_SEC}>Decisión de plazo</h2>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: BASE.white, background: BASE.navy, borderRadius: '999px', padding: '3px 12px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{dec.alternativa}</span>
            <span style={{ ...LABEL, marginLeft: 'auto', letterSpacing: '0.5px' }}>Alternativa seleccionada</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 118px), 1fr))', gap: '8px' }}>
            {[
              ['Fecha inicio', fmtFecha(dec.inicio), BASE.navy],
              ['Fecha fin', fmtFecha(dec.fin), BASE.navy],
              ['Días laborales', nf(dec.laborales), BASE.navy],
              ['Domingos', nf(dec.domingos), BASE.muted],
              ['Feriados', nf(dec.feriados), BASE.muted],
              ['Calendario', nf(dec.calendario) + ' d', BASE.navy],
              ['Meses de plazo', nf(dec.meses, 1), '#B07D1B'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '8px 12px' }}>
                <p style={{ ...LABEL, fontSize: '9.5px', letterSpacing: '0.7px' }}>{l}</p>
                <p style={{ fontSize: '14px', fontWeight: 800, color: c, marginTop: '3px', marginBottom: 0, fontFamily: 'ui-monospace, monospace' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== LEYENDA ===== */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ ...LABEL, color: BASE.navy }}>Leyenda</span>
        <ChipLeyenda marca={MARCA.programado} codigo="X" texto="Avance programado" />
        <ChipLeyenda marca={MARCA.programado} codigo="A1" texto="Sector / anillo (A#, S#)" />
        <ChipLeyenda marca={MARCA.hito} codigo="C1" texto="Hito de concreto (C#)" />
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: BASE.muted }}>
          {totMarcas.toLocaleString('es-PE')} marcas · {cols} columnas · desplazamiento horizontal →
        </span>
      </div>

      {/* ===== MATRIZ DEL TREN ===== */}
      <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowMd }}>
        <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
          <div style={{ minWidth: LW + cols * DW }}>
            {/* cabecera sticky */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: BASE.navy, color: BASE.white, borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', borderRight: `2px solid ${BASE.navyDark}`, height: 32, position: 'sticky', left: 0, zIndex: 1, background: BASE.navy }}>
                <span style={{ flex: 1 }}>ACTIVIDAD</span>
                {['MET', 'UND', 'SEC', 'IP', 'HH', 'MO'].map(h => <span key={h} style={{ width: 30, textAlign: 'right', flexShrink: 0, fontSize: '9px' }}>{h}</span>)}
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {dias.map((d, i) => (
                  <div key={i} style={{ flex: 1, minWidth: DW, textAlign: 'center', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', color: d == null ? BASE.gold : BASE.white }}>
                    {d == null ? '·' : d}
                  </div>
                ))}
              </div>
            </div>

            {/* filas */}
            {filas.map((a, ai) => {
              const esSeccion = a.tipo === 'seccion';
              const zebra = ai % 2 ? BASE.bgSoft : BASE.white;
              if (esSeccion) {
                return (
                  <div key={ai} style={{ display: 'flex', borderBottom: `1px solid ${BASE.border}`, minHeight: 24, background: bandaSeccion }}>
                    <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px', borderRight: `2px solid ${BASE.border}`, position: 'sticky', left: 0, zIndex: 1, background: bandaSeccion }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: BASE.white, background: BASE.navy, borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.4px' }}>{a.nivel || a.cod}</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: BASE.navy, letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.actividad}>{a.actividad}</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {dias.map((d, i) => {
                        const v = a.grid ? a.grid[i] : null;
                        const m = estiloMarca(v);
                        return (
                          <div key={i} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BASE.border}`, background: m ? m.bg : 'transparent' }}>
                            {v && <span style={{ width: 5, height: 5, borderRadius: '50%', background: BASE.navy }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <div key={ai} style={{ display: 'flex', borderBottom: `1px solid ${BASE.borderSoft}`, minHeight: 26, background: zebra }}>
                  <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRight: `2px solid ${BASE.border}`, position: 'sticky', left: 0, zIndex: 1, background: zebra }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '11px', color: BASE.text, whiteSpace: 'normal', lineHeight: 1.2, wordBreak: 'break-word' }} title={a.actividad || a.seccion}>
                      {a.cod && <b style={{ color: BASE.navy }}>{a.cod} </b>}
                      {a.actividad || <span style={{ color: BASE.muted, fontStyle: 'italic' }}>↳ {a.seccion}</span>}
                    </span>
                    <span style={tn}>{a.metrado != null ? nf(a.metrado, a.metrado < 100 ? 1 : 0) : ''}</span>
                    <span style={{ ...td, width: 30, flexShrink: 0, textAlign: 'right', color: BASE.muted }}>{a.und || ''}</span>
                    <span style={tn}>{a.sectores != null ? a.sectores : ''}</span>
                    <span style={tn}>{a.ip != null ? Number(a.ip).toFixed(2) : ''}</span>
                    <span style={{ ...tn, fontWeight: 800, color: BASE.navy }}>{a.hh != null ? Math.round(a.hh) : ''}</span>
                    <span style={tn}>{a.mo != null ? a.mo : ''}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {dias.map((d, i) => {
                      const v = a.grid ? a.grid[i] : null;
                      const m = estiloMarca(v);
                      return (
                        <div key={i} title={v ? `${a.actividad || a.seccion || ''} · día ${d ?? '·'} · ${v}` : ''} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BASE.borderSoft}`, background: m ? m.bg : 'transparent', boxShadow: m ? `inset 0 0 0 1px ${m.borde}` : 'none' }}>
                          {v && <span style={{ fontSize: '7px', fontWeight: 800, color: BASE.navy, lineHeight: 1, whiteSpace: 'nowrap' }}>{String(v).toUpperCase()}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic', marginTop: '2px' }}>
        Importado del Excel de Pull Planning (GP-GCR-FOR-F14) · alternativa {dec ? dec.alternativa : '—'} · {reales.length} actividades en {secciones.length} secciones, {cols} días de horizonte.
      </p>
    </div>
  );
}
