// src/views/planeamiento/CronogramaObra.jsx
// CRONOGRAMA DE OBRA · GP-GCR-FOR-F02 — PTARI CREDITEX (frente NAVE).
// Vista Gantt semanal "tal cual el Excel" pero premium: jerarquía EDT a la izquierda
// (EDT · nombre indentado · duración · comienzo→fin) + barra horizontal de duración
// (comienzo→fin) sobre el calendario mes/semana (DIC 2025 → JUN 2026).
// Data: src/data/cronogramaObraCreditex.js  ·  PTAR del proyecto en .mpp no legible.

import React from 'react';
import { BASE } from '../../utils/styles';
import { CRONOGRAMAOBRA } from '../../data/cronogramaObraCreditex';

// Color por grupo de nivel-2 (PTAR / OBRAS EXTERIORES / NAVE). Se calcula recorriendo
// las tareas: cada nivel-2 abre un grupo; sus descendientes heredan el color.
const GRUPO_COLORES = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#be123c'];

const matiz = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function CronogramaObra() {
  const C = CRONOGRAMAOBRA;
  const semanas = C.semanas || [];
  const meses = C.meses || [];
  const NW = semanas.length;

  // Asignar grupo (color) por bloque de nivel-2; nivel-1 = raíz (navy).
  let grupoIdx = -1;
  const tareas = C.tareas.map((t) => {
    if (t.nivel === 2) grupoIdx += 1;
    return { ...t, grupo: t.nivel === 1 ? -1 : grupoIdx };
  });
  const colorDe = (t) => (t.nivel === 1 ? BASE.navy : GRUPO_COLORES[t.grupo % GRUPO_COLORES.length] || BASE.muted);

  // KPIs reales
  const grupos = tareas.filter((t) => t.nivel === 2).length;
  const hitos = tareas.filter((t) => t.duracionDias === 0).length;

  // Geometría
  const LW = 470;   // ancho columna izquierda (jerarquía)
  const CW = 30;    // ancho por semana

  const td = { padding: '0 6px', fontSize: '10.5px', display: 'flex', alignItems: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: BASE.font }}>
      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, #13243c)`, color: '#fff', borderRadius: '14px', padding: '18px 24px', borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 12px 32px -20px rgba(8,26,46,0.8)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.6px' }}>📆 CRONOGRAMA DE OBRA · {C.flujo}</p>
        <h1 style={{ fontSize: '21px', fontWeight: 900, marginTop: '4px' }}>{C.obra} <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.7 }}>· {C.proyecto} · frente {C.frente}</span></h1>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
          Gantt semanal: jerarquía <strong>EDT</strong> a la izquierda + barra de duración (<strong>comienzo→fin</strong>) por mes/semana. <span style={{ fontStyle: 'italic' }}>{C.nota}</span>
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {[
            ['ACTIVIDADES', C.totalTareas],
            ['DURACIÓN', C.duracionTxt],
            ['INICIO', C.comienzo],
            ['FIN', C.fin],
            ['FASES', grupos],
            ['HITOS', hitos],
            ['SEMANAS', NW],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 16px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.8px' }}>{l}</p>
              <p style={{ fontSize: '15px', fontWeight: 900, marginTop: '1px', fontFamily: /^\d+$/.test(String(v)) ? BASE.font : 'monospace' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LEYENDA */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: BASE.muted, padding: '0 4px', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: BASE.navy }}>Fases:</span>
        {tareas.filter((t) => t.nivel === 2).map((t) => (
          <span key={t.edt + t.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 14, height: 10, borderRadius: '3px', background: colorDe(t) }} /> {t.nombre}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, transform: 'rotate(45deg)', background: BASE.gold, borderRadius: '2px' }} /> Hito (0 días)
        </span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Tal cual el Excel · scroll horizontal →</span>
      </div>

      {/* GANTT */}
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflow: 'auto', maxHeight: '74vh' }}>
          <div style={{ minWidth: LW + NW * CW }}>

            {/* CABECERA: meses (fila 1) */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: BASE.navy, color: '#fff' }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.6px', borderRight: `2px solid ${BASE.navyDark}`, height: 26 }}>
                CRONOGRAMA DE OBRA · {C.frente}
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {meses.map((m, i) => (
                  <div key={i} style={{ width: m.span * CW, minWidth: m.span * CW, flexShrink: 0, textAlign: 'center', fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.18)', borderLeft: i === 0 ? 'none' : '1px solid rgba(229,168,47,0.4)', height: 26 }}>
                    {m.mes}<span style={{ opacity: 0.55, marginLeft: 3, fontSize: '8px' }}>{String(m.anio).slice(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CABECERA: semanas (fila 2) + columnas EDT/Dur/Inicio/Fin */}
            <div style={{ display: 'flex', position: 'sticky', top: 26, zIndex: 3, background: '#13243c', color: '#fff', borderBottom: `2px solid ${BASE.gold}` }}>
              <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: '8.5px', fontWeight: 800, borderRight: `2px solid ${BASE.navyDark}`, height: 24 }}>
                <span style={{ width: 78, padding: '0 8px', flexShrink: 0 }}>EDT</span>
                <span style={{ flex: 1, padding: '0 6px' }}>NOMBRE DE TAREA</span>
                <span style={{ width: 62, textAlign: 'right', padding: '0 6px', flexShrink: 0 }}>DURAC.</span>
                <span style={{ width: 76, textAlign: 'center', flexShrink: 0 }}>COMIENZO</span>
                <span style={{ width: 76, textAlign: 'center', padding: '0 6px', flexShrink: 0 }}>FIN</span>
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {semanas.map((s, i) => (
                  <div key={i} title={`${s.mes} ${s.sem}`} style={{ width: CW, minWidth: CW, flexShrink: 0, textAlign: 'center', fontSize: '7.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: s.idx % 4 === 3 ? '1px solid rgba(229,168,47,0.35)' : '1px solid rgba(255,255,255,0.1)', height: 24, color: 'rgba(255,255,255,0.85)' }}>
                    {s.sem.replace('SEM ', 'S')}
                  </div>
                ))}
              </div>
            </div>

            {/* FILAS */}
            {tareas.map((t, ti) => {
              const col = colorDe(t);
              const esHito = t.duracionDias === 0;
              const esRaiz = t.nivel === 1;
              const zebra = ti % 2 ? '#f8fbff' : '#fff';
              const rowBg = esRaiz ? matiz(BASE.navy, 0.06) : t.nivel === 2 ? matiz(col, 0.07) : zebra;
              return (
                <div key={ti} style={{ display: 'flex', borderBottom: '1px solid #eef2f6', minHeight: 26, background: rowBg }}>
                  {/* IZQUIERDA: jerarquía */}
                  <div style={{ width: LW, minWidth: LW, flexShrink: 0, display: 'flex', alignItems: 'center', borderRight: `2px solid ${BASE.border}`, borderLeft: `3px solid ${esRaiz ? BASE.gold : col}` }}>
                    <span style={{ width: 75, padding: '0 8px', flexShrink: 0, fontFamily: 'monospace', fontSize: '9.5px', fontWeight: 800, color: BASE.navy }}>{t.edt}</span>
                    <span style={{ ...td, flex: 1, minWidth: 0 }}>
                      <span style={{ paddingLeft: (t.nivel - 1) * 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: t.nivel <= 2 ? 800 : t.nivel === 3 ? 700 : 500, color: t.nivel <= 2 ? BASE.navy : BASE.text }} title={t.nombre}>
                        {esHito && <span style={{ color: BASE.gold, marginRight: 4 }}>◆</span>}
                        {t.nombre}
                      </span>
                    </span>
                    <span style={{ width: 62, textAlign: 'right', padding: '0 6px', flexShrink: 0, fontFamily: 'monospace', fontSize: '9.5px', color: BASE.muted }}>{t.duracionTxt}</span>
                    <span style={{ width: 76, textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', fontSize: '9px', color: BASE.text }}>{t.comienzo}</span>
                    <span style={{ width: 76, textAlign: 'center', padding: '0 6px', flexShrink: 0, fontFamily: 'monospace', fontSize: '9px', color: BASE.text }}>{t.fin}</span>
                  </div>

                  {/* DERECHA: grilla + barra */}
                  <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                    {/* grilla de fondo */}
                    {semanas.map((s, i) => (
                      <div key={i} style={{ width: CW, minWidth: CW, flexShrink: 0, borderRight: s.idx % 4 === 3 ? '1px solid #e3e9f1' : '1px solid #f1f4f8' }} />
                    ))}
                    {/* barra Gantt */}
                    {t.barIni != null && t.barSpan > 0 && (
                      esHito ? (
                        <div title={`${t.nombre} · hito ${t.comienzo}`} style={{ position: 'absolute', top: 0, bottom: 0, left: t.barIni * CW + CW / 2 - 7, width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: BASE.gold, border: '1px solid #b07d1b', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                        </div>
                      ) : (
                        <div title={`${t.edt} · ${t.nombre}\n${t.comienzo} → ${t.fin} (${t.duracionTxt})`}
                          style={{
                            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                            left: t.barIni * CW + 2, width: t.barSpan * CW - 4,
                            height: esRaiz ? 12 : t.nivel === 2 ? 11 : 9,
                            borderRadius: '5px',
                            background: esRaiz
                              ? `linear-gradient(90deg, ${BASE.navy}, ${BASE.navyLight})`
                              : `linear-gradient(90deg, ${col}, ${matiz(col, 0.78)})`,
                            border: `1px solid ${matiz(esRaiz ? BASE.navy : col, 0.6)}`,
                            boxShadow: '0 1px 3px rgba(15,23,42,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4,
                          }}>
                          {t.barSpan >= 2 && (
                            <span style={{ fontSize: '7px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 1px rgba(0,0,0,0.4)' }}>
                              {t.duracionTxt}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importado del Excel {C.flujo} ({C.fuente}). Las barras marcan el tramo {C.comienzo}→{C.fin}; los hitos (◆, 0 días) se muestran como rombo. {C.nota}
      </p>
    </div>
  );
}
