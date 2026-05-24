// src/views/modulos/planMaestro/GanttPlanMaestro.jsx — Gantt visual del Plan Maestro (B22)
//
// Muestra todas las actividades en una línea de tiempo con:
//   - Barras coloreadas según estado
//   - Barra de avance real superpuesta
//   - Líneas de dependencias (predecesoras)
//   - Marcador "HOY"
//   - Tooltip al pasar mouse

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import {
  ESTADOS_ACTIVIDAD, fmtSoles, fmtNumero, fmtPct,
  obtenerActividadesHoja,
} from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

const FILA_H = 28;        // alto de cada fila
const HEAD_H = 60;        // alto del header
const SIDE_W = 280;       // ancho de la columna lateral con texto
const PAD = 14;

export default function GanttPlanMaestro({ showToast }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'PlanMaestro'), orderBy('codigo')),
      (snap) => { setActividades(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  // Normalizar fechas — sólo actividades hoja con fechas
  const conFechas = useMemo(() => {
    const hojas = obtenerActividadesHoja(actividades);
    return hojas
      .map(a => {
        const ini = a.fechaInicioProgramada?.toDate ? a.fechaInicioProgramada.toDate() :
                    (a.fechaInicioProgramada ? new Date(a.fechaInicioProgramada) : null);
        const fin = a.fechaFinProgramada?.toDate ? a.fechaFinProgramada.toDate() :
                    (a.fechaFinProgramada ? new Date(a.fechaFinProgramada) : null);
        return ini && fin ? { ...a, _ini: ini, _fin: fin } : null;
      })
      .filter(Boolean);
  }, [actividades]);

  // Rango de fechas global
  const rango = useMemo(() => {
    if (!conFechas.length) return null;
    let min = conFechas[0]._ini, max = conFechas[0]._fin;
    for (const a of conFechas) {
      if (a._ini < min) min = a._ini;
      if (a._fin > max) max = a._fin;
    }
    // Padding de 7 días a cada lado
    const padMs = 7 * 24 * 60 * 60 * 1000;
    return {
      ini: new Date(min.getTime() - padMs),
      fin: new Date(max.getTime() + padMs),
    };
  }, [conFechas]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando Gantt...</p>;

  if (!conFechas.length) {
    return <EmptyState icono="📊" titulo="Sin actividades con fechas"
      descripcion="Para ver el Gantt, las actividades del Plan Maestro deben tener fecha de inicio y fin programadas." />;
  }

  // Calcular ancho del Gantt según días del proyecto
  const totalDias = Math.ceil((rango.fin - rango.ini) / (24 * 60 * 60 * 1000));
  const PX_POR_DIA = totalDias > 90 ? 6 : totalDias > 30 ? 12 : 24;
  const ganttW = totalDias * PX_POR_DIA;
  const totalW = SIDE_W + ganttW + PAD * 2;
  const totalH = HEAD_H + conFechas.length * FILA_H + PAD * 2;

  // Función para convertir fecha a X
  const fechaAX = (fecha) => {
    const dias = (fecha - rango.ini) / (24 * 60 * 60 * 1000);
    return SIDE_W + dias * PX_POR_DIA;
  };

  // Marcador HOY
  const hoy = new Date();
  const hoyX = fechaAX(hoy);

  // Generar marcas de meses para el header
  const meses = [];
  let cursor = new Date(rango.ini.getFullYear(), rango.ini.getMonth(), 1);
  while (cursor < rango.fin) {
    meses.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Map de actividades por código para dibujar dependencias
  const mapPorCodigo = new Map(conFechas.map(a => [a.codigo, a]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>📊 Gantt del Plan Maestro</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {conFechas.length} actividades · {totalDias} días · {rango.ini.toLocaleDateString('es-PE')} → {rango.fin.toLocaleDateString('es-PE')}
            </p>
          </div>

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '10.5px' }}>
            {Object.entries(ESTADOS_ACTIVIDAD).map(([k, e]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, background: e.color, borderRadius: '3px' }} />
                <span style={{ fontWeight: '700', color: BASE.muted }}>{e.label}</span>
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 10, background: BASE.gold, borderRadius: '3px' }} />
              <span style={{ fontWeight: '700', color: BASE.muted }}>Avance real</span>
            </span>
          </div>
        </div>
      </div>

      {/* Gantt SVG */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', overflow: 'auto', maxHeight: '70vh',
      }}>
        <svg width={totalW} height={totalH} style={{ display: 'block', minWidth: '100%' }}>
          {/* Header — meses */}
          <rect x={0} y={0} width={totalW} height={HEAD_H} fill={BASE.navy} />
          <text x={PAD + 10} y={28} fill="#fff" fontSize="13" fontWeight="900">
            ACTIVIDAD
          </text>

          {meses.map((mes, i) => {
            const x = fechaAX(mes);
            const xSig = i + 1 < meses.length ? fechaAX(meses[i + 1]) : SIDE_W + ganttW;
            return (
              <g key={i}>
                <line x1={x} y1={0} x2={x} y2={totalH} stroke="#ffffff22" strokeWidth="1" />
                <text x={(x + xSig) / 2} y={28}
                  textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">
                  {mes.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }).toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Línea HOY */}
          {hoyX > SIDE_W && hoyX < SIDE_W + ganttW && (
            <g>
              <line x1={hoyX} y1={HEAD_H - 8} x2={hoyX} y2={totalH - PAD}
                stroke={BASE.red} strokeWidth="2" strokeDasharray="4 3" />
              <rect x={hoyX - 18} y={HEAD_H - 8} width={36} height={14} fill={BASE.red} rx={3} />
              <text x={hoyX} y={HEAD_H + 2}
                textAnchor="middle" fill="#fff" fontSize="9" fontWeight="900">HOY</text>
            </g>
          )}

          {/* Línea separadora SIDE */}
          <line x1={SIDE_W} y1={0} x2={SIDE_W} y2={totalH} stroke={BASE.gold} strokeWidth="2" />

          {/* Filas */}
          {conFechas.map((act, idx) => {
            const y = HEAD_H + PAD + idx * FILA_H;
            const x1 = fechaAX(act._ini);
            const x2 = fechaAX(act._fin);
            const w = Math.max(2, x2 - x1);
            const estado = ESTADOS_ACTIVIDAD[act.estado || 'no_iniciada'];
            const colorBarra = estado.color;

            // Avance real (proporcional al avanceMetradoAcum)
            const pctAvance = act.metradoContractual > 0
              ? Math.min(1, (act.avanceMetradoAcum || 0) / act.metradoContractual)
              : 0;
            const wAvance = w * pctAvance;

            return (
              <g key={act.id}
                onMouseEnter={() => setHover({ act, y, x1, w })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background fila zebra */}
                {idx % 2 === 1 && (
                  <rect x={0} y={y - PAD / 2} width={totalW} height={FILA_H} fill={BASE.bgSoft} />
                )}

                {/* Texto lateral */}
                <text x={PAD + 6} y={y + 12} fontSize="10" fill={BASE.navy} fontFamily="monospace" fontWeight="900">
                  {act.codigo}
                </text>
                <text x={PAD + 6} y={y + 24} fontSize="9.5" fill={BASE.text}>
                  {(act.descripcion || '').substring(0, 32)}{(act.descripcion || '').length > 32 ? '...' : ''}
                </text>

                {/* Barra programada */}
                <rect x={x1} y={y + 4} width={w} height={FILA_H - 12}
                  fill={colorBarra} rx={3}
                  opacity={0.4} />

                {/* Barra de avance real (encima) */}
                {wAvance > 0 && (
                  <rect x={x1} y={y + 4} width={wAvance} height={FILA_H - 12}
                    fill={BASE.gold} rx={3}
                    style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.18))' }} />
                )}

                {/* Texto de % avance al final de la barra */}
                {pctAvance > 0 && w > 35 && (
                  <text x={x1 + w + 4} y={y + 17} fontSize="9.5" fill={BASE.text} fontWeight="900">
                    {fmtPct(pctAvance * 100, 0)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Líneas de dependencias (predecesoras → sucesora) */}
          {conFechas.map((act, idx) => {
            if (!Array.isArray(act.predecesoras) || !act.predecesoras.length) return null;
            const y2 = HEAD_H + PAD + idx * FILA_H + (FILA_H - 12) / 2 + 4;
            const xSucesora = fechaAX(act._ini);

            return act.predecesoras.map((codigoPred, j) => {
              const pred = mapPorCodigo.get(codigoPred);
              if (!pred) return null;
              const idxPred = conFechas.findIndex(a => a.codigo === codigoPred);
              if (idxPred < 0) return null;
              const y1 = HEAD_H + PAD + idxPred * FILA_H + (FILA_H - 12) / 2 + 4;
              const xPred = fechaAX(pred._fin);

              // Línea L: del fin del pred → bajamos/subimos → vamos al inicio de la sucesora
              const path = `M ${xPred} ${y1} L ${xPred + 6} ${y1} L ${xPred + 6} ${y2} L ${xSucesora - 4} ${y2}`;
              return (
                <g key={`${act.id}-${j}`}>
                  <path d={path} stroke="#94a3b8" strokeWidth="1.2" fill="none" strokeDasharray="2 2" />
                  {/* Flecha al final */}
                  <polygon points={`${xSucesora - 4},${y2 - 3} ${xSucesora},${y2} ${xSucesora - 4},${y2 + 3}`} fill="#94a3b8" />
                </g>
              );
            });
          })}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div style={{
            position: 'sticky', bottom: '12px', marginLeft: '12px',
            display: 'inline-block',
            background: BASE.navy, color: '#fff',
            borderLeft: `4px solid ${BASE.gold}`,
            padding: '10px 14px', borderRadius: '8px',
            fontSize: '12px', maxWidth: '420px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            <p style={{ fontWeight: '900', color: BASE.gold, fontFamily: 'monospace' }}>{hover.act.codigo}</p>
            <p style={{ marginTop: '4px' }}>{hover.act.descripcion}</p>
            <p style={{ fontSize: '10.5px', opacity: 0.8, marginTop: '6px' }}>
              {hover.act._ini.toLocaleDateString('es-PE')} → {hover.act._fin.toLocaleDateString('es-PE')}
              {' · '}
              Metrado: {fmtNumero(hover.act.metradoContractual, 2)} {hover.act.unidad}
              {' · '}
              Avance: {fmtPct(hover.act.metradoContractual > 0 ? (hover.act.avanceMetradoAcum / hover.act.metradoContractual) * 100 : 0, 1)}
            </p>
            {hover.act.predecesoras?.length > 0 && (
              <p style={{ fontSize: '10.5px', opacity: 0.8, marginTop: '4px' }}>
                Predecesoras: {hover.act.predecesoras.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
