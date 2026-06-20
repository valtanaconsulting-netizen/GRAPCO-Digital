// src/views/modulos/resultadoOperativo/CurvaSFinanciera.jsx — Curva S programada vs real (B21)

import React, { useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { calcularCurvaS, fmtSoles } from '../../../utils/planMaestroAnalytics';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

export default function CurvaSFinanciera() {
  const { actividades, historial, loading } = useRO();

  // Determinar fechas del proyecto (min y max de las actividades)
  const rangoFechas = useMemo(() => {
    if (!actividades.length) return null;
    let ini = null, fin = null;
    for (const a of actividades) {
      const fIni = a.fechaInicioProgramada?.toDate ? a.fechaInicioProgramada.toDate() : (a.fechaInicioProgramada ? new Date(a.fechaInicioProgramada) : null);
      const fFin = a.fechaFinProgramada?.toDate ? a.fechaFinProgramada.toDate() : (a.fechaFinProgramada ? new Date(a.fechaFinProgramada) : null);
      if (fIni && (!ini || fIni < ini)) ini = fIni;
      if (fFin && (!fin || fFin > fin)) fin = fFin;
    }
    return ini && fin ? { ini, fin } : null;
  }, [actividades]);

  const curva = useMemo(() => {
    if (!rangoFechas) return null;
    return calcularCurvaS({
      actividades, historial,
      fechaInicio: rangoFechas.ini,
      fechaFin: rangoFechas.fin,
      granularidad: 'mensual',
    });
  }, [actividades, historial, rangoFechas]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando curva S...</p>;

  if (!rangoFechas || !curva || curva.puntos.length === 0) {
    return <EmptyState icono="📈" titulo="Sin datos para curva S"
      descripcion="Asigna fechas de inicio y fin programadas a las actividades del Plan Maestro." />;
  }

  // Calcular escala
  const maxValor = Math.max(
    ...curva.curvaProgramada.map(p => p.valor),
    ...curva.curvaReal.map(p => p.valor),
    1
  );

  const W = 760, H = 400, padX = 60, padY = 30;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const xStep = curva.puntos.length > 1 ? innerW / (curva.puntos.length - 1) : 0;

  const toY = (val) => H - padY - (val / maxValor) * innerH;
  const toX = (idx) => padX + idx * xStep;

  const pathProg = curva.curvaProgramada.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.valor)}`).join(' ');
  const pathReal = curva.curvaReal.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.valor)}`).join(' ');

  // Punto actual sobre real
  const ultimoIdxReal = curva.curvaReal.findLastIndex(p => p.valor > 0);
  const ultimoReal = ultimoIdxReal >= 0 ? curva.curvaReal[ultimoIdxReal] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '13px 16px' }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '4px' }}>
          📈 CURVA S FINANCIERA — PROGRAMADA vs REAL
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px' }}>
          {rangoFechas.ini.toLocaleDateString('es-PE')} — {rangoFechas.fin.toLocaleDateString('es-PE')}
          {' · '}
          {curva.puntos.length} puntos mensuales
        </p>

        <div style={{ overflowX: 'auto' }}>
          <svg width={W} height={H} style={{ background: BASE.bgSoft, borderRadius: '8px', minWidth: '700px' }}>
            {/* Grid horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map(p => (
              <g key={p}>
                <line x1={padX} y1={padY + p * innerH} x2={W - padX} y2={padY + p * innerH}
                  stroke={BASE.border} strokeWidth="1" strokeDasharray="3 3" />
                <text x={padX - 6} y={padY + p * innerH + 4}
                  textAnchor="end" fontSize="9" fill={BASE.muted}>
                  {fmtSoles(maxValor * (1 - p))}
                </text>
              </g>
            ))}

            {/* Eje X */}
            <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke={BASE.navy} strokeWidth="2" />
            {/* Eje Y */}
            <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke={BASE.navy} strokeWidth="2" />

            {/* Etiquetas X (fechas) */}
            {curva.puntos.map((p, i) => {
              if (i % Math.max(1, Math.floor(curva.puntos.length / 8)) !== 0 && i !== curva.puntos.length - 1) return null;
              const fecha = p.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
              return (
                <text key={i} x={toX(i)} y={H - padY + 16}
                  textAnchor="middle" fontSize="9" fill={BASE.muted}>{fecha}</text>
              );
            })}

            {/* Curva programada (línea punteada azul) */}
            <path d={pathProg} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="6 4" />

            {/* Curva real (línea sólida verde) */}
            <path d={pathReal} fill="none" stroke={BASE.green} strokeWidth="3" />

            {/* Puntos curva real */}
            {curva.curvaReal.map((p, i) => p.valor > 0 ? (
              <circle key={i} cx={toX(i)} cy={toY(p.valor)} r="4" fill={BASE.green} stroke="#fff" strokeWidth="1.5" />
            ) : null)}

            {/* Punto actual (último real) */}
            {ultimoReal && (
              <g>
                <circle cx={toX(ultimoIdxReal)} cy={toY(ultimoReal.valor)} r="8"
                  fill={BASE.gold} stroke="#fff" strokeWidth="2" />
                <text x={toX(ultimoIdxReal)} y={toY(ultimoReal.valor) - 14}
                  textAnchor="middle" fontSize="10" fontWeight="900" fill={BASE.navy}>
                  HOY
                </text>
              </g>
            )}
          </svg>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
          <Legend color="#7c3aed" label="Programada (PV)" dashed />
          <Legend color={BASE.green} label="Real ejecutada (EV)" />
          <Legend color={BASE.gold} label="Punto actual" dot />
        </div>
      </div>

      {/* Tabla de valores mensuales */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th}>Mes</th>
                <th style={{ ...th, textAlign: 'right' }}>PV (Programado)</th>
                <th style={{ ...th, textAlign: 'right' }}>EV (Ejecutado)</th>
                <th style={{ ...th, textAlign: 'right' }}>Δ Atraso/Adelanto</th>
              </tr>
            </thead>
            <tbody>
              {curva.puntos.map((punto, i) => {
                const pv = curva.curvaProgramada[i].valor;
                const ev = curva.curvaReal[i].valor;
                const delta = ev - pv;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: '700' }}>
                      {punto.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(pv)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{fmtSoles(ev)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900',
                      color: delta >= 0 ? BASE.green : BASE.red }}>
                      {delta >= 0 ? '+' : ''}{fmtSoles(delta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed, dot }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {dot ? (
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '2px solid #fff', display: 'inline-block', boxShadow: '0 0 0 1px ' + color }} />
      ) : (
        <span style={{
          width: 24, height: 3, background: color,
          ...(dashed ? { background: 'transparent', borderTop: `3px dashed ${color}` } : {}),
        }} />
      )}
      <span style={{ fontSize: '11.5px', fontWeight: '700', color: BASE.text }}>{label}</span>
    </div>
  );
}

const th = { padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '9px 14px', fontSize: '11.5px', color: BASE.text };
