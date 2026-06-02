// src/views/modulos/resultadoOperativo/ROporPartida.jsx — Detalle por partida (B21)

import React, { useState, useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { fmtSoles, fmtPct, fmtNumero, colorMargen, colorCPI } from '../../../utils/planMaestroAnalytics';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

export default function ROporPartida() {
  const { ro, loading } = useRO();
  const [filtroSev, setFiltroSev] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const partidas = useMemo(() => {
    if (!ro?.detallePartidas) return [];
    return ro.detallePartidas.filter(p => {
      if (filtroSev && p.severidad !== filtroSev) return false;
      if (busqueda) {
        const b = busqueda.toLowerCase();
        return (p.codigo || '').toLowerCase().includes(b) ||
               (p.descripcion || '').toLowerCase().includes(b);
      }
      return true;
    });
  }, [ro, filtroSev, busqueda]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando RO por partida...</p>;
  if (!ro || partidas.length === 0) return <EmptyState icono="📋" titulo="Sin partidas" descripcion="Crea actividades en el Plan Maestro y registra avance." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>📋 RO por Partida</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {partidas.length} partidas · CPI/SPI/Margen calculados
            </p>
          </div>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar..." style={{ ...inpS, minWidth: '180px' }} />
          <select value={filtroSev} onChange={e => setFiltroSev(e.target.value)} style={{ ...selS, minWidth: '140px' }}>
            <option value="">Todas las severidades</option>
            <option value="ok">✅ OK</option>
            <option value="media">🟡 Media</option>
            <option value="alta">🟠 Alta</option>
            <option value="critica">🔴 Crítica</option>
          </select>
        </div>
      </div>

      <div style={{ background: BASE.white, border: `2px solid ${BASE.navy}`, borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '1300px', fontFamily: 'Calibri, Segoe UI, Arial, sans-serif' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th}>Código</th>
                <th style={th}>Descripción</th>
                <th style={{ ...th, textAlign: 'right' }}>%Av</th>
                <th style={{ ...th, textAlign: 'right' }}>Vendido</th>
                <th style={{ ...th, textAlign: 'right' }}>Aplicado</th>
                <th style={{ ...th, textAlign: 'right' }}>Real</th>
                <th style={{ ...th, textAlign: 'right' }}>M.Aplic.</th>
                <th style={{ ...th, textAlign: 'right' }}>M.Real</th>
                <th style={{ ...th, textAlign: 'right' }}>CPI</th>
                <th style={{ ...th, textAlign: 'right' }}>SPI</th>
                <th style={{ ...th, textAlign: 'right' }}>EAC</th>
                <th style={{ ...th, textAlign: 'center' }}>Sev.</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p, i) => {
                const cMargen = colorMargen(p.margenReal, ro.indicadoresGlobales.margenMeta);
                const cCPI = colorCPI(p.CPI);
                const cSPI = colorCPI(p.SPI);
                const sevColor = p.severidad === 'critica' ? BASE.red :
                                 p.severidad === 'alta' ? '#dc2626' :
                                 p.severidad === 'media' ? BASE.gold : BASE.green;
                const sevLabel = p.severidad === 'critica' ? '🔴' :
                                 p.severidad === 'alta' ? '🟠' :
                                 p.severidad === 'media' ? '🟡' : '🟢';
                return (
                  <tr key={`${p.codigo}-${i}`} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: '900', color: BASE.navy, background: BASE.bgSoft }}>{p.codigo}</td>
                    <td style={{ ...td, maxWidth: '180px' }}>{p.descripcion}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtPct(p.pctAvance, 1)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(p.vendido)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: BASE.muted }}>{fmtSoles(p.costoAplicado)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(p.costoReal)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtPct(p.margenAplicado)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cMargen }}>
                      {fmtPct(p.margenReal)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cCPI }}>{p.CPI?.toFixed(2) || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cSPI }}>{p.SPI?.toFixed(2) || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(p.EAC)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        background: sevColor, color: '#fff',
                        padding: '3px 9px', borderRadius: '10px',
                        fontSize: '10px', fontWeight: '900',
                      }}>{sevLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <td colSpan={3} style={{ padding: '12px 14px', fontWeight: '900', textAlign: 'right', fontSize: '11px' }}>
                  TOTALES:
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                  {fmtSoles(ro.totales.vendido)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                  {fmtSoles(ro.totales.costoAplicado)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                  {fmtSoles(ro.totales.costoReal)}
                </td>
                <td colSpan={1} style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.gold }}>
                  {fmtPct(ro.indicadoresGlobales.margenAplicado)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.gold }}>
                  {fmtPct(ro.indicadoresGlobales.margenReal)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                  {ro.indicadoresGlobales.CPI?.toFixed(2)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                  {ro.indicadoresGlobales.SPI?.toFixed(2)}
                </td>
                <td colSpan={2} style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.gold }}>
                  {fmtSoles(ro.indicadoresGlobales.EAC)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

const inpS = { padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const th = { padding: '9px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.18)', borderBottom: `2px solid ${BASE.gold}` };
const td = { padding: '6px 12px', fontSize: '11.5px', color: BASE.text, verticalAlign: 'top', borderRight: `1px solid ${BASE.border}`, borderBottom: `1px solid ${BASE.border}` };
