// src/views/modulos/resultadoOperativo/RODashboard.jsx — KPIs ejecutivos RO (B21)

import React from 'react';
import { BASE } from '../../../utils/styles';
import { fmtSoles, fmtPct, colorMargen, colorCPI } from '../../../utils/planMaestroAnalytics';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

export default function RODashboard() {
  const { ro, loading } = useRO();

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando Resultado Operativo...</p>;

  if (!ro || ro.detallePartidas.length === 0) {
    return (
      <EmptyState icono="📊" titulo="Sin datos para calcular RO"
        descripcion="El RO se calcula desde Plan Maestro + APUs + Tareos + Kardex. Crea actividades en el Plan Maestro, asigna APUs y registra avance/consumo." />
    );
  }

  const { totales, indicadoresGlobales, partidasCriticas, partidasEstrella } = ro;
  const colorCPIGlobal = colorCPI(indicadoresGlobales.CPI);
  const colorMargenReal = colorMargen(indicadoresGlobales.margenReal, indicadoresGlobales.margenMeta);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* KPIs financieros principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
        <KPI label="VENDIDO (EV)" valor={fmtSoles(totales.vendido)}
          color={BASE.gold} sub={`${fmtPct(indicadoresGlobales.pctAvanceFisico)} avance físico`} icono="💵" />
        <KPI label="COSTO APLICADO" valor={fmtSoles(totales.costoAplicado)}
          color="#7c3aed" sub="Lo que DEBERÍA costar (APU)" icono="📋" />
        <KPI label="COSTO REAL (AC)" valor={fmtSoles(totales.costoReal)}
          color={BASE.red} sub="Lo que SÍ costó (Tareos+Kardex)" icono="💸" />
        <KPI label="MARGEN REAL ACTUAL" valor={fmtPct(indicadoresGlobales.margenReal)}
          color={colorMargenReal}
          sub={`Meta: ${indicadoresGlobales.margenMeta}%`} icono={indicadoresGlobales.margenReal >= indicadoresGlobales.margenMeta ? '✅' : '⚠️'} />
      </div>

      {/* EVM PMI */}
      <div style={{
        background: BASE.navy,
        borderRadius: '12px', padding: '14px 20px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px', marginBottom: '12px' }}>
          🎯 EVM · EARNED VALUE MANAGEMENT (PMI/PMBOK)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <EVMCard label="BAC" valor={fmtSoles(totales.BAC)} desc="Presupuesto total" />
          <EVMCard label="PV" valor={fmtSoles(totales.PV)} desc="Valor planificado" />
          <EVMCard label="EV" valor={fmtSoles(totales.EV)} desc="Valor ganado" />
          <EVMCard label="AC" valor={fmtSoles(totales.AC)} desc="Costo real" />
          <EVMCard label="CPI" valor={indicadoresGlobales.CPI.toFixed(3)} desc={indicadoresGlobales.CPI >= 1 ? 'Bajo presupuesto' : 'Sobrecosto'}
            highlight={colorCPIGlobal} />
          <EVMCard label="SPI" valor={indicadoresGlobales.SPI.toFixed(3)} desc={indicadoresGlobales.SPI >= 1 ? 'Adelantado' : 'Atrasado'}
            highlight={indicadoresGlobales.SPI >= 0.95 ? BASE.green : BASE.red} />
        </div>
      </div>

      {/* Proyecciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
        <KPI label="EAC (Proyección al cierre)" valor={fmtSoles(indicadoresGlobales.EAC)}
          color={indicadoresGlobales.EAC > totales.BAC ? BASE.red : BASE.green}
          sub={indicadoresGlobales.EAC > totales.BAC
            ? `+${fmtSoles(indicadoresGlobales.EAC - totales.BAC)} sobre presupuesto`
            : 'Dentro del presupuesto'}
          icono="🎯" />
        <KPI label="VAC (Margen Final Proyectado)" valor={fmtSoles(indicadoresGlobales.VAC)}
          color={indicadoresGlobales.VAC >= 0 ? BASE.green : BASE.red}
          sub={`${fmtPct(indicadoresGlobales.margenProyectadoCierre)} proyectado`}
          icono={indicadoresGlobales.VAC >= 0 ? '🟢' : '🔴'} />
        <KPI label="VENTA SALDO POR EJECUTAR" valor={fmtSoles(totales.ventaSaldo)}
          color={BASE.gold} sub="Pendiente de valorización" icono="📅" />
      </div>

      {/* Layout 2 columnas: Críticas + Estrella */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '12px' }}>
        {/* Partidas críticas */}
        <Card titulo={`🔴 PARTIDAS CRÍTICAS (${partidasCriticas.length})`} color={BASE.red}>
          {partidasCriticas.length === 0 ? (
            <p style={{ padding: '16px', textAlign: 'center', color: BASE.green, fontSize: '13px', fontWeight: '700' }}>
              ✅ Sin partidas críticas. Todas dentro del rango.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {partidasCriticas.slice(0, 7).map(p => {
                const c = colorMargen(p.margenReal, indicadoresGlobales.margenMeta);
                return (
                  <div key={p.codigo} style={{
                    background: c + '12', border: `1px solid ${c}33`,
                    borderLeft: `4px solid ${c}`,
                    borderRadius: '10px', padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '11px', fontWeight: '900', color: c, fontFamily: 'monospace' }}>{p.codigo}</p>
                        <p style={{ fontSize: '12px', color: BASE.text, marginTop: '2px', lineHeight: 1.3 }}>
                          {p.descripcion}
                        </p>
                      </div>
                      <span style={{
                        background: c, color: '#fff',
                        padding: '3px 9px', borderRadius: '10px',
                        fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px',
                      }}>{fmtPct(p.margenReal)}</span>
                    </div>
                    <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '6px' }}>
                      Vendido: {fmtSoles(p.vendido)} · Real: {fmtSoles(p.costoReal)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Partidas estrella */}
        <Card titulo={`⭐ PARTIDAS ESTRELLA (${partidasEstrella.length})`} color={BASE.green}>
          {partidasEstrella.length === 0 ? (
            <p style={{ padding: '16px', textAlign: 'center', color: BASE.muted, fontSize: '13px' }}>
              Aún no hay partidas con margen sobre la meta.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {partidasEstrella.map(p => (
                <div key={p.codigo} style={{
                  background: '#dcfce7', border: '1px solid #16a34a33',
                  borderLeft: `4px solid ${BASE.green}`,
                  borderRadius: '10px', padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.greenDark, fontFamily: 'monospace' }}>{p.codigo}</p>
                      <p style={{ fontSize: '12px', color: BASE.text, marginTop: '2px', lineHeight: 1.3 }}>
                        {p.descripcion}
                      </p>
                    </div>
                    <span style={{
                      background: BASE.green, color: '#fff',
                      padding: '3px 9px', borderRadius: '10px',
                      fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px',
                    }}>{fmtPct(p.margenReal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, valor, color, sub, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '10px', padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: '11px',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
        background: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>{icono}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{label}</p>
        <p style={{ fontSize: '18px', fontWeight: '900', color, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{valor}</p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>
      </div>
    </div>
  );
}

function EVMCard({ label, valor, desc, highlight }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: `1px solid ${highlight || 'rgba(255,255,255,0.18)'}`,
      borderRadius: '9px', padding: '10px 12px',
    }}>
      <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.gold, letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: '900', color: highlight || '#fff', marginTop: '3px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{valor}</p>
      <p style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{desc}</p>
    </div>
  );
}

function Card({ titulo, color, children }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: BASE.bgSoft, padding: '10px 16px', borderBottom: `1px solid ${BASE.border}`, borderLeft: `4px solid ${color}` }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>{titulo}</p>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}
