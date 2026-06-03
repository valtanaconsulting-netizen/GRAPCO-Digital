// src/views/planeamiento/NormalTecnologica.jsx
// NORMAL TECNOLÓGICA (GP-GCR-FOR-F08) — PTARI CREDITEX.
// Matriz secuencia constructiva "tal cual el Excel" pero premium: actividades agrupadas
// por fase WBS (Mov. de tierras, Calzadura, Cimentación, Placas, Vigas y Losas, Relleno)
// × días; cada celda marcada indica el día en que se ejecuta la actividad. El desfase
// diagonal entre filas es la PRECEDENCIA / tren constructivo.
// Data: src/data/normalTecnologicaCreditex.js  (re-generar: scripts/extraerNormalTec.cjs)

import React from 'react';
import { BASE } from '../../utils/styles';
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

const LW = 360; // ancho columna izquierda (actividad)
const DW = 32;  // ancho columna de día

export default function NormalTecnologica() {
  const NT = NORMAL_TECNOLOGICA;
  const bloques = NT.bloques || [];

  // Especialidades realmente presentes (para la leyenda)
  const codigosUsados = [];
  bloques.forEach((b) => b.fases.forEach((f) => f.actividades.forEach((a) => {
    if (!codigosUsados.includes(a.cod)) codigosUsados.push(a.cod);
  })));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: 1240, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff', borderRadius: '16px', padding: '20px 26px', borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 14px 36px -20px rgba(8,26,46,0.8)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.8px' }}>📐 NORMAL TECNOLÓGICA · SECUENCIA CONSTRUCTIVA ({NT.formato || 'GP-GCR-FOR-F08'})</p>
        <h1 style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>{NT.titulo || 'PTARI CREDITEX'}</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
          Cada celda marcada = el <strong>día</strong> en que toca la actividad. El desfase en diagonal entre filas es la <strong>precedencia</strong> (el tren constructivo: excavación adelante, curado atrás).
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {[
            ['ACTIVIDADES', NT.totActividades, BASE.gold],
            ['FASES WBS', NT.totFases, '#93c5fd'],
            ['BLOQUES', bloques.length, '#86efac'],
            ['DÍAS (MÁX)', NT.maxDias, '#fca5a5'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 16px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: c, letterSpacing: '0.8px' }}>{l}</p>
              <p style={{ fontSize: '17px', fontWeight: 900, marginTop: '1px' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LEYENDA especialidades */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: BASE.muted, padding: '0 4px', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: BASE.navy }}>Especialidades:</span>
        {codigosUsados.map((cod) => (
          <span key={cod} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: colorEsp(cod) }} />
            <b style={{ color: BASE.navy }}>{cod}</b> {(ESPEC[cod] && ESPEC[cod].n) || ''}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Tal cual el Excel · scroll horizontal →</span>
      </div>

      {/* BLOQUES (una matriz por hoja del Excel) */}
      {bloques.map((b, bi) => {
        const cols = b.dias || [];
        const nAct = b.fases.reduce((s, f) => s + f.actividades.length, 0);
        const dur = cols.length;
        return (
          <div key={bi} style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
            {/* sub-cabecera del bloque */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', background: `linear-gradient(90deg, ${BASE.navySoft}, transparent)`, borderBottom: `1px solid ${BASE.border}` }}>
              <span style={{ width: 26, height: 26, borderRadius: '7px', background: BASE.navy, color: BASE.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px', flexShrink: 0 }}>{bi + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: BASE.navy }}>{b.bloque}</h3>
                <p style={{ fontSize: '10.5px', color: BASE.muted }}>{b.fases.length} fases · {nAct} actividades · {dur} días</p>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: BASE.muted, background: BASE.bg, border: `1px solid ${BASE.border}`, borderRadius: '6px', padding: '3px 9px', fontFamily: 'monospace' }}>{b.sheet}</span>
            </div>

            {/* matriz actividad × día */}
            <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
              <div style={{ minWidth: LW + dur * DW }}>
                {/* cabecera de días (sticky) */}
                <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: BASE.navy, color: '#fff', borderBottom: `2px solid ${BASE.gold}` }}>
                  <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.6px', borderRight: `2px solid ${BASE.navyDark}`, height: 32 }}>
                    <span style={{ width: 44, flexShrink: 0 }}>CÓD</span>
                    <span style={{ flex: 1 }}>ACTIVIDAD</span>
                    <span style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>DUR</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {cols.map((d) => (
                      <div key={d} style={{ flex: 1, minWidth: DW, textAlign: 'center', fontSize: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', fontFamily: 'monospace' }}>D{d}</div>
                    ))}
                  </div>
                </div>

                {/* fases + actividades */}
                {b.fases.map((f, fi) => (
                  <React.Fragment key={fi}>
                    {/* banda de fase */}
                    <div style={{ display: 'flex', background: BASE.goldSoft, borderBottom: `1px solid ${BASE.border}`, borderTop: fi === 0 ? 'none' : `1px solid ${BASE.border}` }}>
                      <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 10px', borderRight: `2px solid ${BASE.border}` }}>
                        <span style={{ width: 8, height: 8, borderRadius: '2px', background: BASE.gold }} />
                        <span style={{ fontSize: '10.5px', fontWeight: 900, color: BASE.navy, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.fase}>{f.fase}</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex' }}>
                        {cols.map((d) => <div key={d} style={{ flex: 1, minWidth: DW, borderRight: '1px solid #eef2f6' }} />)}
                      </div>
                    </div>

                    {/* actividades de la fase */}
                    {f.actividades.map((a, ai) => {
                      const col = colorEsp(a.cod);
                      return (
                        <div key={ai} style={{ display: 'flex', borderBottom: '1px solid #eef2f6', minHeight: 28, background: ai % 2 ? '#f8fbff' : '#fff' }}>
                          <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderRight: `2px solid ${BASE.border}` }}>
                            <span style={{ width: 44, flexShrink: 0, fontSize: '8.5px', fontWeight: 900, color: col, background: `${col}16`, border: `1px solid ${col}40`, borderRadius: '5px', padding: '2px 0', textAlign: 'center' }}>{a.cod}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: '10.5px', color: BASE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.actividad}>{a.actividad}</span>
                            <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: '9.5px', fontWeight: 800, color: BASE.muted, fontFamily: 'monospace' }}>{a.dur || ''}</span>
                          </div>
                          <div style={{ flex: 1, display: 'flex' }}>
                            {cols.map((d, i) => {
                              const on = !!(a.grid && a.grid[i]);
                              const dentro = a.inicio != null && d >= a.inicio && d <= a.fin;
                              return (
                                <div key={i} title={on ? `${a.cod} · ${a.actividad} · D${d}` : ''} style={{ flex: 1, minWidth: DW, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #eef2f6', background: on ? `${col}26` : dentro ? `${col}0a` : 'transparent' }}>
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

      {/* SALARIO MO (referencia, tal cual el Excel) */}
      {NT.salarioMO && NT.salarioMO.length > 0 && (
        <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
          <div style={{ padding: '10px 18px', background: `linear-gradient(90deg, ${BASE.navySoft}, transparent)`, borderBottom: `1px solid ${BASE.border}` }}>
            <h3 style={{ fontSize: '13px', fontWeight: 900, color: BASE.navy }}>Salario MO de referencia</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '14px 18px' }}>
            {NT.salarioMO.map((s) => (
              <div key={s.cargo} style={{ border: `1px solid ${BASE.border}`, borderTop: `3px solid ${BASE.gold}`, borderRadius: '10px', padding: '8px 16px', minWidth: 130 }}>
                <p style={{ fontSize: '9px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.6px' }}>{s.cargo}</p>
                <p style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy, fontFamily: 'monospace', marginTop: '2px' }}>S/ {Number(s.salario).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importado del Excel de Normal Tecnológica ({NT.formato || 'GP-GCR-FOR-F08'}). La marca de color indica el día programado de cada actividad; el desfase diagonal entre fases es la secuencia / precedencia constructiva del PTARI CREDITEX.
      </p>
    </div>
  );
}
