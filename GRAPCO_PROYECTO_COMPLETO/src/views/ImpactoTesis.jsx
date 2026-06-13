// src/views/ingeniero/ImpactoTesis.jsx
// Dashboard de impacto medible — diseñado para captura/screenshot en defensa de tesis
// Compara primer cuarto del proyecto vs último cuarto para demostrar mejora cuantitativa

import React, { useMemo } from 'react';
import { BASE, LOGO } from '../utils/styles';
import { calcularImpactoMedible, fmtCPIPct, fmt1, fmtMoney, COSTO_HORA_DEFAULT } from '../utils/helpers';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell,
} from 'recharts';
import { EJE, GRILLA, TOOLTIP_STYLE, BARRA } from '../utils/chartKit';

const TARIFA_PROMEDIO_DEFAULT = (
  Object.values(COSTO_HORA_DEFAULT).reduce((s, v) => s + v, 0) /
  Math.max(1, Object.keys(COSTO_HORA_DEFAULT).length)
);

const KpiHero = ({ icon, titulo, valor, sub, color, bg }) => (
  <div style={{
    background: bg || `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
    borderRadius: '16px',
    padding: '20px 22px',
    color: '#fff',
    position: 'relative', overflow: 'hidden',
    boxShadow: BASE.shadowMd,
  }}>
    <div style={{
      position: 'absolute', top: 0, right: 0, width: '6px', height: '100%',
      background: color || BASE.gold,
    }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <p style={{ fontSize: '10px', fontWeight: '800', color: color || BASE.gold, letterSpacing: '1px' }}>{titulo}</p>
    </div>
    <p style={{ fontSize: '32px', fontWeight: '900', lineHeight: 1, marginTop: '6px' }}>{valor}</p>
    {sub && <p style={{ fontSize: '12px', opacity: 0.75, marginTop: '8px' }}>{sub}</p>}
  </div>
);

export default function ImpactoTesis({ historialEnriquecido, configuracion }) {
  const impacto = useMemo(
    () => calcularImpactoMedible(historialEnriquecido),
    [historialEnriquecido]
  );

  // Tarifa promedio para conversión a soles
  const tarifaPromedio = useMemo(() => {
    const tarifas = configuracion?.tarifas || {};
    const valores = Object.values(tarifas).filter(v => v > 0);
    if (valores.length === 0) return TARIFA_PROMEDIO_DEFAULT;
    return valores.reduce((s, v) => s + v, 0) / valores.length;
  }, [configuracion]);

  if (!impacto.valido) {
    return (
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `2px dashed ${BASE.border}`,
        padding: '60px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>🎓</p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>
          Análisis de impacto no disponible aún
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
          {impacto.motivo}
        </p>
      </div>
    );
  }

  const {
    cpiAntes, cpiAhora, mejoraCpi,
    sumAntes, sumAhora, desperdicioTotal,
    hhAhorrablesProyeccion, semanasTotales,
    primerasSemanas, ultimasSemanas,
  } = impacto;

  // Datos para gráfico comparativo
  const dataComparativa = [
    {
      etapa: `ANTES (S${primerasSemanas[0]}–S${primerasSemanas[primerasSemanas.length - 1]})`,
      cpi: cpiAntes ? Math.round(cpiAntes * 100) : 0,
      cpiRaw: cpiAntes,
    },
    {
      etapa: `AHORA (S${ultimasSemanas[0]}–S${ultimasSemanas[ultimasSemanas.length - 1]})`,
      cpi: cpiAhora ? Math.round(cpiAhora * 100) : 0,
      cpiRaw: cpiAhora,
    },
  ];

  const mejorando = mejoraCpi !== null && mejoraCpi > 0;
  const colorMejora = mejorando ? BASE.green : BASE.red;
  const ahorroSoles = hhAhorrablesProyeccion * tarifaPromedio;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* HEADER compacto */}
      <div style={{
        background: BASE.white,
        borderRadius: '10px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
          Impacto del Sistema · Análisis Cuantitativo
        </span>
        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
          Primer cuarto vs cuarto más reciente · {semanasTotales} semanas analizadas
        </span>
      </div>

      {/* KPIs HERO — los 3 números clave para la sustentación */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px' }}>
        <KpiHero
          icon="📈"
          titulo="MEJORA EN CPI"
          valor={mejoraCpi !== null ? `${mejoraCpi >= 0 ? '+' : ''}${Math.round(mejoraCpi)}%` : '—'}
          sub={`De ${fmtCPIPct(cpiAntes)} a ${fmtCPIPct(cpiAhora)}`}
          color={colorMejora}
        />
        <KpiHero
          icon="💪"
          titulo="HH RECUPERABLES"
          valor={fmt1(hhAhorrablesProyeccion)}
          sub="Si la eficiencia actual hubiera sido la inicial"
          color={BASE.gold}
        />
        <KpiHero
          icon="💰"
          titulo="VALORIZACIÓN AHORRO"
          valor={fmtMoney(ahorroSoles)}
          sub={`@ S/ ${tarifaPromedio.toFixed(2)}/h promedio`}
          color={BASE.green}
        />
      </div>

      {/* COMPARATIVA VISUAL — Gráfico de barras ANTES vs AHORA */}
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `1px solid ${BASE.border}`,
        padding: '20px 24px',
        boxShadow: BASE.shadowSm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: BASE.navy }}>
            CPI Acumulado: ANTES vs AHORA
          </h3>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '16px', marginLeft: '14px' }}>
          Eficiencia (HH meta ÷ HH real) en los dos extremos del proyecto
        </p>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dataComparativa} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid {...GRILLA} />
            <XAxis {...EJE} dataKey="etapa" />
            <YAxis {...EJE} domain={[0, 130]} tickFormatter={v => `${v}%`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, 'CPI']} />
            <Bar {...BARRA} dataKey="cpi">
              {dataComparativa.map((d, i) => (
                <Cell
                  key={i}
                  fill={i === 0 ? BASE.muted : (cpiAhora >= cpiAntes ? BASE.green : BASE.red)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabla de números exactos */}
        <div style={{
          marginTop: '16px', padding: '12px 14px',
          background: BASE.bgSoft, borderRadius: '10px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
        }}>
          {[
            { l: 'Semanas analizadas', v: semanasTotales },
            { l: 'CPI inicial', v: fmtCPIPct(cpiAntes), c: BASE.muted },
            { l: 'CPI actual', v: fmtCPIPct(cpiAhora), c: cpiAhora >= cpiAntes ? BASE.greenDark : BASE.red },
            { l: 'Δ Mejora', v: mejoraCpi !== null ? `${mejoraCpi >= 0 ? '+' : ''}${Math.round(mejoraCpi)}%` : '—', c: colorMejora },
          ].map(item => (
            <div key={item.l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.6px' }}>{item.l}</p>
              <p style={{ fontSize: '15px', fontWeight: '900', color: item.c || BASE.navy, marginTop: '3px' }}>{item.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DESGLOSE DE HH */}
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `1px solid ${BASE.border}`,
        padding: '20px 24px',
        boxShadow: BASE.shadowSm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.green, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: BASE.navy }}>
            Desglose de Horas-Hombre
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {/* Etapa ANTES */}
          <div style={{ background: BASE.bgSoft, borderRadius: '12px', padding: '16px', border: `1.5px solid ${BASE.border}` }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '1px' }}>
              ANTES · S{primerasSemanas[0]}–S{primerasSemanas[primerasSemanas.length - 1]}
            </p>
            <table style={{ width: '100%', marginTop: '10px', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', color: BASE.muted }}>HH Meta</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700' }}>{fmt1(sumAntes.hhMeta)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: BASE.muted }}>HH Real</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700' }}>{fmt1(sumAntes.hhReal)}</td>
                </tr>
                <tr style={{ borderTop: `1px solid ${BASE.border}` }}>
                  <td style={{ padding: '6px 0 0', fontWeight: '800', color: BASE.muted }}>Desperdicio</td>
                  <td style={{ padding: '6px 0 0', textAlign: 'right', fontWeight: '900', color: sumAntes.desperdicio > 0 ? BASE.red : BASE.greenDark }}>
                    {sumAntes.desperdicio > 0 ? '+' : ''}{fmt1(sumAntes.desperdicio)} HH
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Etapa AHORA */}
          <div style={{
            background: cpiAhora >= cpiAntes ? BASE.greenLight : BASE.redLight,
            borderRadius: '12px', padding: '16px',
            border: `1.5px solid ${cpiAhora >= cpiAntes ? BASE.green : BASE.red}`,
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: cpiAhora >= cpiAntes ? BASE.greenDark : BASE.red, letterSpacing: '1px' }}>
              AHORA · S{ultimasSemanas[0]}–S{ultimasSemanas[ultimasSemanas.length - 1]}
            </p>
            <table style={{ width: '100%', marginTop: '10px', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', color: BASE.muted }}>HH Meta</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700' }}>{fmt1(sumAhora.hhMeta)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: BASE.muted }}>HH Real</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700' }}>{fmt1(sumAhora.hhReal)}</td>
                </tr>
                <tr style={{ borderTop: `1px solid ${cpiAhora >= cpiAntes ? BASE.green + '55' : BASE.red + '55'}` }}>
                  <td style={{ padding: '6px 0 0', fontWeight: '800', color: BASE.muted }}>Desperdicio</td>
                  <td style={{
                    padding: '6px 0 0', textAlign: 'right', fontWeight: '900',
                    color: sumAhora.desperdicio > 0 ? BASE.red : BASE.greenDark,
                  }}>
                    {sumAhora.desperdicio > 0 ? '+' : ''}{fmt1(sumAhora.desperdicio)} HH
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusión narrativa */}
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: `linear-gradient(135deg, ${BASE.gold}15, ${BASE.gold}05)`,
          border: `1px solid ${BASE.gold}55`,
          borderLeft: `4px solid ${BASE.goldDark}`,
          borderRadius: '10px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.goldDark, letterSpacing: '0.6px', marginBottom: '6px' }}>
            CONCLUSIÓN PARA SUSTENTACIÓN
          </p>
          <p style={{ fontSize: '13px', color: BASE.text, lineHeight: 1.6 }}>
            La implementación del sistema GRAPCO Produc-App generó una mejora del{' '}
            <strong style={{ color: colorMejora }}>{mejoraCpi !== null ? `${mejoraCpi >= 0 ? '+' : ''}${Math.round(mejoraCpi)}%` : '—'}</strong>{' '}
            en el CPI promedio entre las primeras y últimas semanas analizadas.
            {mejorando && (
              <> Esto representa un ahorro potencial de <strong style={{ color: BASE.gold }}>{fmt1(hhAhorrablesProyeccion)} HH</strong>{' '}
              equivalentes a <strong style={{ color: BASE.green }}>{fmtMoney(ahorroSoles)}</strong>{' '}
              si la productividad alcanzada se hubiera mantenido desde el inicio del proyecto.</>
            )}
          </p>
        </div>
      </div>

      {/* Nota metodológica */}
      <div style={{
        padding: '12px 16px',
        background: BASE.bgSoft,
        borderRadius: '10px',
        fontSize: '10px', color: BASE.muted, lineHeight: 1.6,
      }}>
        <strong style={{ color: BASE.navy }}>Nota metodológica:</strong> El análisis compara
        el primer cuarto de semanas registradas con el último cuarto. CPI = HH Meta ÷ HH Real
        (mayor es mejor). Las HH recuperables se calculan asumiendo que el ratio de eficiencia
        actual hubiera sido el de inicio del proyecto. La valorización en soles usa el promedio
        de tarifas configuradas (o defaults si no hay configuración).
      </div>
    </div>
  );
}
