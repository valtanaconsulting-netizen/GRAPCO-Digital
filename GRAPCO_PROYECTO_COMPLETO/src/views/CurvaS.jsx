// src/views/ingeniero/CurvaS.jsx — Análisis de Valor Ganado (EVM / PMBOK)
import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BASE } from '../utils/styles';
import { calcularEVM, fmt1, fmtCPIPct, getEstado } from '../utils/helpers';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${BASE.border}`,
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '12px',
      boxShadow: BASE.shadowMd,
    }}>
      <p style={{ fontWeight: '800', color: BASE.navy, marginBottom: '6px', borderBottom: `1px solid ${BASE.border}`, paddingBottom: '4px' }}>
        Semana {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0', display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value.toLocaleString('es-PE', { maximumFractionDigits: 1 }) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({ icon, titulo, valor, sub, color, bg, hint }) => (
  <div style={{
    background: bg || BASE.white,
    borderRadius: '12px',
    border: `1px solid ${BASE.border}`,
    padding: '14px 16px',
    boxShadow: BASE.shadowSm,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>{titulo}</p>
    </div>
    <p style={{ fontSize: '22px', fontWeight: '900', color: color || BASE.navy, lineHeight: 1.1 }}>{valor}</p>
    {sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px' }}>{sub}</p>}
    {hint && (
      <p style={{
        fontSize: '9px', color: BASE.muted, marginTop: '6px',
        fontStyle: 'italic', lineHeight: 1.4,
      }}>{hint}</p>
    )}
  </div>
);

export default function CurvaS({ historialEnriquecido }) {
  const evm = useMemo(() => calcularEVM(historialEnriquecido), [historialEnriquecido]);

  if (!evm.valido) {
    return (
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `2px dashed ${BASE.border}`,
        padding: '60px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>📊</p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>
          Sin datos suficientes para análisis EVM
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
          {evm.motivo}
        </p>
      </div>
    );
  }

  const { puntos, totales } = evm;

  // Diagnóstico textual
  const cpiE = getEstado(totales.cpi);
  const spiE = getEstado(totales.spi);
  const cpiTexto = totales.cpi >= 1
    ? 'Bajo presupuesto (eficiente en costo)'
    : totales.cpi >= 0.85
    ? 'Sobre presupuesto controlado'
    : 'Sobrecosto crítico';
  const spiTexto = totales.spi >= 1
    ? 'Cronograma adelantado'
    : totales.spi >= 0.85
    ? 'Levemente atrasado'
    : 'Atraso significativo';

  // Pronóstico narrativo
  let pronosticoColor = BASE.navy;
  let pronosticoIcono = '🎯';
  let pronosticoTexto = '';
  if (totales.cpi !== null) {
    if (totales.cpi >= 1) {
      pronosticoColor = BASE.green;
      pronosticoIcono = '✅';
      pronosticoTexto = `El proyecto va eficiente. Si mantienes este CPI de ${fmtCPIPct(totales.cpi)}, terminarás con un ahorro estimado de ${fmt1(Math.abs(totales.vac || 0))} HH.`;
    } else if (totales.cpi >= 0.85) {
      pronosticoColor = BASE.gold;
      pronosticoIcono = '⚠️';
      pronosticoTexto = `Sobrecosto moderado. Al ritmo actual (CPI ${fmtCPIPct(totales.cpi)}), el proyecto cerrará con ${fmt1(Math.abs(totales.vac || 0))} HH de exceso sobre el presupuesto.`;
    } else {
      pronosticoColor = BASE.red;
      pronosticoIcono = '🚨';
      pronosticoTexto = `Sobrecosto crítico. Con CPI de ${fmtCPIPct(totales.cpi)}, se proyecta que el proyecto terminará gastando ${fmt1(Math.abs(totales.vac || 0))} HH adicionales (${Math.round(((totales.vac || 0) / totales.bac) * -100)}% sobre BAC).`;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* KPIs EVM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px' }}>
        <KpiCard
          icon="💰" titulo="CPI · COST INDEX"
          valor={fmtCPIPct(totales.cpi)}
          sub={cpiTexto}
          color={cpiE.color}
          bg={cpiE.bg}
          hint="EV ÷ AC. >100% = bajo presupuesto"
        />
        <KpiCard
          icon="📅" titulo="SPI · SCHEDULE INDEX"
          valor={fmtCPIPct(totales.spi)}
          sub={spiTexto}
          color={spiE.color}
          bg={spiE.bg}
          hint="EV ÷ PV. >100% = adelantado"
        />
        <KpiCard
          icon="📊" titulo="CV · COST VARIANCE"
          valor={`${totales.cv >= 0 ? '+' : ''}${fmt1(totales.cv)} HH`}
          sub={totales.cv >= 0 ? 'Ahorro acumulado' : 'Sobrecosto acumulado'}
          color={totales.cv >= 0 ? BASE.greenDark : BASE.red}
          hint="EV − AC"
        />
        <KpiCard
          icon="⏱️" titulo="SV · SCHEDULE VARIANCE"
          valor={`${totales.sv >= 0 ? '+' : ''}${fmt1(totales.sv)} HH`}
          sub={totales.sv >= 0 ? 'Adelanto' : 'Atraso vs cronograma'}
          color={totales.sv >= 0 ? BASE.greenDark : BASE.gold}
          hint="EV − PV"
        />
      </div>

      {/* CURVA-S PRINCIPAL */}
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `1px solid ${BASE.border}`,
        padding: '18px 22px',
        boxShadow: BASE.shadowSm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '20px', background: BASE.gold, borderRadius: '2px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
            CURVA-S · PV vs EV vs AC
          </h3>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px', marginLeft: '14px' }}>
          Comparativa acumulada de Valor Planeado, Ganado y Costo Real (en HH)
        </p>

        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={puntos} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BASE.green} stopOpacity={0.25} />
                <stop offset="100%" stopColor={BASE.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="semana"
              tick={{ fontSize: 11, fill: BASE.muted, fontWeight: 600 }}
              tickFormatter={v => `S${v}`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: BASE.muted }}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              label={{ value: 'HH acumuladas', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: BASE.muted } }}
            />
            <Tooltip content={<Tip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontWeight: 600 }}
              iconType="line"
            />
            {/* PV - Plan (línea punteada) */}
            <Line
              type="monotone" dataKey="pv" name="PV · Planeado"
              stroke={BASE.muted} strokeWidth={2} strokeDasharray="6 4"
              dot={false}
            />
            {/* EV - Earned Value (área verde) */}
            <Area
              type="monotone" dataKey="ev" name="EV · Ganado"
              stroke={BASE.green} fill="url(#evGrad)" strokeWidth={3}
              dot={{ r: 3, fill: BASE.green, strokeWidth: 0 }}
            />
            {/* AC - Actual Cost (línea navy) */}
            <Line
              type="monotone" dataKey="ac" name="AC · Real"
              stroke={BASE.navy} strokeWidth={3}
              dot={{ r: 3, fill: BASE.navy, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Leyenda interpretativa */}
        <div style={{
          marginTop: '14px', padding: '12px 14px',
          background: BASE.bgSoft, borderRadius: '10px',
          fontSize: '11px', color: BASE.muted, lineHeight: 1.6,
        }}>
          <p style={{ fontWeight: '700', color: BASE.navy, marginBottom: '4px' }}>📖 Cómo leer esta curva:</p>
          <p>• <strong style={{ color: BASE.muted }}>PV (gris punteado)</strong>: trabajo que debiste haber ejecutado a fecha (cronograma planeado).</p>
          <p>• <strong style={{ color: BASE.green }}>EV (verde)</strong>: trabajo realmente ganado según avance físico real × ratio meta.</p>
          <p>• <strong style={{ color: BASE.navy }}>AC (navy)</strong>: HH efectivamente consumidas. Si AC supera EV, hay sobrecosto.</p>
        </div>
      </div>

      {/* Proyección al término (EAC) */}
      {totales.eac !== null && (
        <div style={{
          background: BASE.white, borderRadius: '14px',
          border: `1px solid ${BASE.border}`,
          padding: '18px 22px',
          boxShadow: BASE.shadowSm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '4px', height: '20px', background: pronosticoColor, borderRadius: '2px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>
              🔮 PROYECCIÓN AL TÉRMINO (EAC)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '10px' }}>
            <div style={{ background: BASE.bgSoft, borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>BAC · BUDGET</p>
              <p style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
                {fmt1(totales.bac)} <span style={{ fontSize: '12px', fontWeight: '600', color: BASE.muted }}>HH</span>
              </p>
              <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
                Presupuesto al término según meta
              </p>
            </div>
            <div style={{ background: pronosticoColor + '15', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>EAC · ESTIMACIÓN</p>
              <p style={{ fontSize: '20px', fontWeight: '900', color: pronosticoColor, marginTop: '4px' }}>
                {fmt1(totales.eac)} <span style={{ fontSize: '12px', fontWeight: '600', color: BASE.muted }}>HH</span>
              </p>
              <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
                BAC ÷ CPI = costo proyectado al término
              </p>
            </div>
            <div style={{ background: (totales.vac || 0) >= 0 ? BASE.greenLight : BASE.redLight, borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>VAC · VARIANCE</p>
              <p style={{ fontSize: '20px', fontWeight: '900', color: (totales.vac || 0) >= 0 ? BASE.greenDark : BASE.red, marginTop: '4px' }}>
                {(totales.vac || 0) >= 0 ? '+' : ''}{fmt1(totales.vac)} <span style={{ fontSize: '12px', fontWeight: '600', color: BASE.muted }}>HH</span>
              </p>
              <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
                {(totales.vac || 0) >= 0 ? 'Ahorro proyectado' : 'Sobrecosto proyectado'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
