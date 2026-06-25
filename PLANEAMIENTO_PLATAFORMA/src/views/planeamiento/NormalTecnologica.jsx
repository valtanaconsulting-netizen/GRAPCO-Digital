// src/views/planeamiento/NormalTecnologica.jsx
// NORMAL TECNOLÓGICA (GP-GCR-FOR-F08) — PTARI CREDITEX.
// Matriz secuencia constructiva "tal cual el Excel" pero premium: actividades agrupadas
// por fase WBS (Mov. de tierras, Calzadura, Cimentación, Placas, Vigas y Losas, Relleno)
// × días; cada celda marcada indica el día en que se ejecuta la actividad. El desfase
// diagonal entre filas es la PRECEDENCIA / tren constructivo.
// Data: src/data/normalTecnologicaCreditex.js  (re-generar: scripts/extraerNormalTec.cjs)

import React from 'react';
import { BASE } from '../../utils/styles';
import VistaHeader from '../../components/VistaHeader';
import { NORMAL_TECNOLOGICA } from '../../data/normalTecnologicaCreditex';

// Color por especialidad (código de la columna izquierda del Excel)
const ESPEC = {
  TOP: { c: '#0891b2', n: 'Topografía' },
  MOV: { c: '#b45309', n: 'Mov. de tierras' },
  ENC: { c: '#7c3aed', n: 'Encofrado' },
  CON: { c: '#0f766e', n: 'Concreto' },
  CUR: { c: '#2563eb', n: 'Curado' },
  ACE: { c: '#dc2626', n: 'Acero' },
  VAR: { c: '#9333ea', n: 'Cordón bentonítico' },
  BIT: { c: '#475569', n: 'Pintura bituminosa' },
  PRU: { c: '#15803d', n: 'Prueba estanqueidad' },
};
const colorEsp = (cod) => (ESPEC[cod] && ESPEC[cod].c) || BASE.muted;

const LW = 460; // ancho columna izquierda (actividad)
const DW = 32;  // ancho columna de día

// Tipografía formal reutilizada
const LABEL = { fontSize: '10.5px', fontWeight: 700, color: BASE.muted, textTransform: 'uppercase', letterSpacing: '1px' };
const MONO_NUM = { fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace' };

export default function NormalTecnologica() {
  const NT = NORMAL_TECNOLOGICA;
  const bloques = NT.bloques || [];

  // Especialidades realmente presentes (para la leyenda)
  const codigosUsados = [];
  bloques.forEach((b) => b.fases.forEach((f) => f.actividades.forEach((a) => {
    if (!codigosUsados.includes(a.cod)) codigosUsados.push(a.cod);
  })));

  const kpis = [
    ['Actividades', NT.totActividades],
    ['Fases WBS', NT.totFases],
    ['Bloques', bloques.length],
    ['Días (máx)', NT.maxDias],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: 1240, margin: '0 auto' }}>
      {/* HEADER */}
      <VistaHeader
        icono="ruler"
        eyebrow={`Normal Tecnológica · Secuencia Constructiva · ${NT.formato || 'GP-GCR-FOR-F08'}`}
        titulo={NT.titulo || 'PTARI CREDITEX'}
        subtitulo="Cada celda marcada es el día programado de la actividad; el desfase diagonal entre filas es la precedencia del tren constructivo (excavación adelante, curado atrás)."
      />

      {/* KPIs compactos + LEYENDA de especialidades */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', boxShadow: BASE.shadowMd, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
          {kpis.map(([l, v], i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', padding: '10px 18px', borderLeft: i ? `1px solid ${BASE.border}` : 'none' }}>
              <span style={LABEL}>{l}</span>
              <span style={{ ...MONO_NUM, fontSize: '15px', fontWeight: 800, color: BASE.navy }}>{v}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '10px 18px', fontSize: '10.5px', color: BASE.mutedSoft, fontStyle: 'italic' }}>
            Tal cual el Excel · scroll horizontal
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '8px 18px', borderTop: `1px solid ${BASE.border}`, background: BASE.bgSoft }}>
          <span style={LABEL}>Especialidades</span>
          {codigosUsados.map((cod) => (
            <span key={cod} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: BASE.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: colorEsp(cod), flexShrink: 0 }} />
              <b style={{ color: BASE.navy, fontWeight: 700 }}>{cod}</b>
              {(ESPEC[cod] && ESPEC[cod].n) || ''}
            </span>
          ))}
        </div>
      </div>

      {/* BLOQUES (una matriz por hoja del Excel) */}
      {bloques.map((b, bi) => {
        const cols = b.dias || [];
        const nAct = b.fases.reduce((s, f) => s + f.actividades.length, 0);
        const dur = cols.length;
        return (
          <div key={bi} style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowMd }}>
            {/* sub-cabecera del bloque */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${BASE.border}`, background: BASE.white }}>
              <span style={{ width: 26, height: 26, borderRadius: '7px', background: BASE.navy, color: BASE.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0, ...MONO_NUM }}>{bi + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: BASE.navy, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>{b.bloque}</h3>
                <p style={{ ...LABEL, letterSpacing: '0.8px', margin: '2px 0 0' }}>{b.fases.length} fases · {nAct} actividades · {dur} días</p>
              </div>
              <span style={{ ...MONO_NUM, fontSize: '9px', fontWeight: 700, color: BASE.muted, background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '6px', padding: '3px 9px' }}>{b.sheet}</span>
            </div>

            {/* matriz actividad × día */}
            <div style={{ overflow: 'auto', maxHeight: '72vh', borderTop: `1px solid ${BASE.border}` }}>
              <div style={{ minWidth: LW + dur * DW }}>
                {/* cabecera de días (sticky top) */}
                <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: BASE.navy, color: BASE.white, borderBottom: `2px solid ${BASE.gold}` }}>
                  <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 4, background: BASE.navy, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', borderRight: `2px solid ${BASE.navyDark}`, height: 32 }}>
                    <span style={{ width: 44, flexShrink: 0 }}>Cód</span>
                    <span style={{ flex: 1 }}>Actividad</span>
                    <span style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>Dur</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {cols.map((d) => (
                      <div key={d} style={{ ...MONO_NUM, flex: 1, minWidth: DW, textAlign: 'center', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)' }}>D{d}</div>
                    ))}
                  </div>
                </div>

                {/* fases + actividades */}
                {b.fases.map((f, fi) => (
                  <React.Fragment key={fi}>
                    {/* banda de fase */}
                    <div style={{ display: 'flex', background: BASE.goldSoft, borderBottom: `1px solid ${BASE.border}`, borderTop: fi === 0 ? 'none' : `1px solid ${BASE.border}` }}>
                      <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: BASE.goldSoft, display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 10px', borderRight: `2px solid ${BASE.border}` }}>
                        <span style={{ width: 8, height: 8, borderRadius: '2px', background: BASE.gold, flexShrink: 0 }} />
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: BASE.navy, textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.fase}>{f.fase}</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex' }}>
                        {cols.map((d) => <div key={d} style={{ flex: 1, minWidth: DW, borderRight: `1px solid ${BASE.borderSoft}` }} />)}
                      </div>
                    </div>

                    {/* actividades de la fase */}
                    {f.actividades.map((a, ai) => {
                      const col = colorEsp(a.cod);
                      const filaBg = ai % 2 ? BASE.bgSoft : BASE.white;
                      return (
                        <div key={ai} style={{ display: 'flex', borderBottom: `1px solid ${BASE.borderSoft}`, minHeight: 28, background: filaBg }}>
                          <div style={{ width: LW, minWidth: LW, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: filaBg, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRight: `2px solid ${BASE.border}` }}>
                            <span style={{ width: 44, flexShrink: 0, fontSize: '8.5px', fontWeight: 800, color: col, background: `${col}14`, border: `1px solid ${col}40`, borderRadius: '5px', padding: '2px 0', textAlign: 'center', letterSpacing: '0.4px' }}>{a.cod}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: '11px', color: BASE.text, whiteSpace: 'normal', lineHeight: 1.2, wordBreak: 'break-word' }} title={a.actividad}>{a.actividad}</span>
                            <span style={{ ...MONO_NUM, width: 34, flexShrink: 0, textAlign: 'center', fontSize: '10px', fontWeight: 700, color: BASE.muted }}>{a.dur || ''}</span>
                          </div>
                          <div style={{ flex: 1, display: 'flex' }}>
                            {cols.map((d, i) => {
                              const on = !!(a.grid && a.grid[i]);
                              const dentro = a.inicio != null && d >= a.inicio && d <= a.fin;
                              return (
                                <div key={i} title={on ? `${a.cod} · ${a.actividad} · D${d}` : ''} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BASE.borderSoft}`, background: on ? `${col}26` : dentro ? `${col}0a` : 'transparent' }}>
                                  {on && <span style={{ width: 14, height: 14, borderRadius: '4px', background: col, boxShadow: `0 1px 3px ${col}66` }} />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* SALARIO MO (referencia, tal cual el Excel) — franja compacta */}
      {NT.salarioMO && NT.salarioMO.length > 0 && (
        <div style={{ background: BASE.white, borderRadius: '12px', border: `1px solid ${BASE.border}`, boxShadow: BASE.shadowMd, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderRight: `1px solid ${BASE.border}`, background: BASE.bgSoft }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, textTransform: 'uppercase', letterSpacing: '1px' }}>Salario MO de referencia</span>
          </div>
          {NT.salarioMO.map((s, i) => (
            <div key={s.cargo} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', padding: '10px 18px', borderLeft: i ? `1px solid ${BASE.border}` : 'none' }}>
              <span style={{ ...LABEL, letterSpacing: '0.8px' }}>{s.cargo}</span>
              <span style={{ ...MONO_NUM, fontSize: '14px', fontWeight: 800, color: BASE.navy }}>S/ {Number(s.salario).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importado del Excel de Normal Tecnológica ({NT.formato || 'GP-GCR-FOR-F08'}). La marca de color indica el día programado de cada actividad; el desfase diagonal entre fases es la secuencia / precedencia constructiva del PTARI CREDITEX.
      </p>
    </div>
  );
}
