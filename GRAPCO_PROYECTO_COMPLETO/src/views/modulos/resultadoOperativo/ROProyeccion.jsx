// src/views/modulos/resultadoOperativo/ROProyeccion.jsx — Proyección EAC al cierre (B21)

import React from 'react';
import { BASE } from '../../../utils/styles';
import { fmtSoles, fmtPct, colorMargen } from '../../../utils/planMaestroAnalytics';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

export default function ROProyeccion() {
  const { ro, loading } = useRO();

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando proyección...</p>;
  if (!ro) return <EmptyState icono="🎯" titulo="Sin datos para proyectar" descripcion="Crea actividades y registra avance." />;

  const { totales, indicadoresGlobales } = ro;
  const margenAdverso = indicadoresGlobales.margenProyectadoCierre < indicadoresGlobales.margenMeta;
  const colorVAC = indicadoresGlobales.VAC >= 0 ? BASE.green : BASE.red;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Banner ejecutivo */}
      <div style={{
        background: margenAdverso
          ? 'linear-gradient(135deg, #dc2626, #991b1b)'
          : 'linear-gradient(135deg, #16a34a, #15803d)',
        borderRadius: '14px', padding: '24px 28px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          🎯 PROYECCIÓN AL CIERRE DE OBRA
        </p>
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginTop: '8px', letterSpacing: '-0.5px' }}>
          {margenAdverso ? `🔴 Cerrarías con ${fmtPct(indicadoresGlobales.margenProyectadoCierre)} margen` :
                          `🟢 Cerrarías con ${fmtPct(indicadoresGlobales.margenProyectadoCierre)} margen`}
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '6px' }}>
          {margenAdverso
            ? `Por debajo de la meta del ${indicadoresGlobales.margenMeta}%. Acción urgente requerida.`
            : `Por encima de la meta del ${indicadoresGlobales.margenMeta}%. Buen ritmo.`}
        </p>
      </div>

      {/* Detalle proyección */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        <Big label="EAC" titulo="Costo Total Proyectado al Cierre" valor={fmtSoles(indicadoresGlobales.EAC)}
          color={indicadoresGlobales.EAC > totales.BAC ? BASE.red : BASE.green}
          formula="EAC = BAC / CPI"
          interpretacion={
            indicadoresGlobales.EAC > totales.BAC
              ? `+${fmtSoles(indicadoresGlobales.EAC - totales.BAC)} sobre presupuesto`
              : 'Dentro del presupuesto'
          } />

        <Big label="ETC" titulo="Costo Pendiente por Ejecutar" valor={fmtSoles(indicadoresGlobales.EAC - totales.AC)}
          color="#7c3aed" formula="ETC = EAC − AC"
          interpretacion={`Falta gastar ${fmtSoles(indicadoresGlobales.EAC - totales.AC)}`} />

        <Big label="VAC" titulo="Margen Final Proyectado (S/.)" valor={fmtSoles(indicadoresGlobales.VAC)}
          color={colorVAC} formula="VAC = BAC − EAC"
          interpretacion={
            indicadoresGlobales.VAC >= 0
              ? `🟢 Ganancia proyectada: ${fmtSoles(indicadoresGlobales.VAC)}`
              : `🔴 Pérdida proyectada: ${fmtSoles(Math.abs(indicadoresGlobales.VAC))}`
          } />
      </div>

      {/* Comparativa BAC vs EAC */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '20px 24px' }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '14px' }}>
          📊 COMPARATIVA BAC vs EAC vs AC
        </p>

        <Bar label="BAC (Presupuesto contractual)" valor={totales.BAC} max={Math.max(totales.BAC, indicadoresGlobales.EAC)} color={BASE.gold} />
        <Bar label="EAC (Proyección al cierre)" valor={indicadoresGlobales.EAC} max={Math.max(totales.BAC, indicadoresGlobales.EAC)} color={indicadoresGlobales.EAC > totales.BAC ? BASE.red : BASE.green} />
        <Bar label="AC (Costo real a la fecha)" valor={totales.AC} max={Math.max(totales.BAC, indicadoresGlobales.EAC)} color={BASE.navy} />
      </div>

      {/* Análisis combinado de Resultado Pendiente (Costos Perú) */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '20px 24px',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '6px' }}>
          🧠 ANÁLISIS COMBINADO (Metodología Costos Perú)
        </p>
        <p style={{ fontSize: '12.5px', color: BASE.muted, marginBottom: '14px', lineHeight: 1.6 }}>
          Resultado pendiente = (Costo Aplicado − Costo Real ejecutado) + Margen del saldo por ejecutar.
          Es lo que SE PUEDE recuperar si se mejora la gestión.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${BASE.border}` }}>
              <td style={{ padding: '10px 0', fontWeight: '700' }}>Resultado a la fecha (Costo Aplicado − Real)</td>
              <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900',
                color: (totales.costoAplicado - totales.costoReal) >= 0 ? BASE.green : BASE.red }}>
                {(totales.costoAplicado - totales.costoReal) >= 0 ? '+' : ''}{fmtSoles(totales.costoAplicado - totales.costoReal)}
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${BASE.border}` }}>
              <td style={{ padding: '10px 0', fontWeight: '700' }}>Venta saldo por ejecutar</td>
              <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                {fmtSoles(totales.ventaSaldo)}
              </td>
            </tr>
            <tr style={{ borderBottom: `2px solid ${BASE.navy}` }}>
              <td style={{ padding: '10px 0', fontWeight: '900' }}>Margen Real Actual (a la fecha)</td>
              <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900',
                color: colorMargen(indicadoresGlobales.margenReal, indicadoresGlobales.margenMeta) }}>
                {fmtPct(indicadoresGlobales.margenReal)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', fontSize: '14px', fontWeight: '900', color: BASE.navy }}>
                Margen Proyectado al Cierre
              </td>
              <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '17px', fontFamily: 'monospace', fontWeight: '900',
                color: colorMargen(indicadoresGlobales.margenProyectadoCierre, indicadoresGlobales.margenMeta) }}>
                {fmtPct(indicadoresGlobales.margenProyectadoCierre)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Big({ label, titulo, valor, color, formula, interpretacion }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '18px 22px',
      borderLeft: `5px solid ${color}`,
    }}>
      <p style={{ fontSize: '10px', fontWeight: '900', color, letterSpacing: '1.4px' }}>{label}</p>
      <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>{titulo}</p>
      <p style={{ fontSize: '24px', fontWeight: '900', color, marginTop: '8px', letterSpacing: '-0.5px' }}>
        {valor}
      </p>
      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: BASE.muted, marginTop: '6px' }}>{formula}</p>
      <p style={{ fontSize: '11px', fontWeight: '700', color: BASE.text, marginTop: '6px' }}>{interpretacion}</p>
    </div>
  );
}

function Bar({ label, valor, max, color }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: BASE.text }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '900', color, fontFamily: 'monospace' }}>{fmtSoles(valor)}</span>
      </div>
      <div style={{ background: BASE.bgSoft, height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{
          background: color, height: '100%', width: `${pct}%`,
          transition: 'width 0.6s ease',
          boxShadow: `0 1px 4px ${color}55`,
        }} />
      </div>
    </div>
  );
}
