// src/views/modulos/resultadoOperativo/ROFrentes.jsx
// RO comparativo por FRENTE (F1 PTARI vs F2 NAVE). Carga toda la obra (ignorarFrente)
// y corre el motor por frente: BAC/EV/AC/CPI/margen lado a lado + total de obra.
// GG es obra-level (no se reparte por frente). El EV se reparte por partida (cada
// frente gana solo lo valorizado de SUS partidas).

import React, { useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { calcularROMensual, fmtSoles, fmtPct, colorCPI } from '../../../utils/planMaestroAnalytics';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import useRO from './useRO';
import EmptyState from '../../../components/EmptyState';

export default function ROFrentes() {
  const { frentesDelProyecto, proyectoActivo } = useProyectoActivo();
  const {
    actividades, apus, tareos, kardexMov, valorizaciones,
    facturas, valorizacionesSC, adicionales, deductivos, loading,
  } = useRO({ ignorarFrente: true });

  const porFrente = useMemo(() => {
    if (loading) return [];
    const byFr = (arr, fid) => (arr || []).filter(x => !x.frenteId || x.frenteId === fid);
    return frentesDelProyecto.map(fr => {
      const actsF = (actividades || []).filter(a => a.frenteId === fr.id);
      const ro = calcularROMensual({
        actividades: actsF, apus,
        tareos: byFr(tareos, fr.id),
        kardexMovimientos: byFr(kardexMov, fr.id),
        valorizaciones,                       // EV se reparte por código de partida
        facturas: byFr(facturas, fr.id),
        valorizacionesSC: byFr(valorizacionesSC, fr.id),
        gastosGenerales: [],                  // GG obra-level: no se reparte por frente
        adicionales: byFr(adicionales, fr.id),
        deductivos: byFr(deductivos, fr.id),
        fechaActual: new Date(), margenMeta: 15,
      });
      return { frente: fr, ro, nPart: actsF.length };
    }).filter(x => x.nPart > 0);
  }, [loading, actividades, apus, tareos, kardexMov, valorizaciones, facturas, valorizacionesSC, adicionales, deductivos, frentesDelProyecto]);

  const total = useMemo(() => porFrente.reduce((a, { ro }) => ({
    BAC: a.BAC + ro.totales.BAC, EV: a.EV + ro.totales.EV, AC: a.AC + ro.totales.AC,
  }), { BAC: 0, EV: 0, AC: 0 }), [porFrente]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando el RO por frente…</p>;
  if (porFrente.length === 0) {
    return (
      <EmptyState
        icono="🎯" variante="bim"
        titulo="Aún no hay frentes con actividades"
        descripcion="Para comparar el RO por frente (F1 PTARI vs F2 NAVE), etiqueta cada actividad del Plan Maestro con su frente. En cuanto haya partidas por frente, aquí verás el BAC/EV/AC/CPI/margen lado a lado."
      />
    );
  }

  const margenPct = (ev, ac) => ev > 0 ? ((ev - (ac || 0)) / ev) * 100 : 0;
  const cpiOf = (ev, ac) => ac > 0 ? ev / ac : 0;
  const cv = (ev, ac) => ev - ac;

  const exportarPDF = async () => {
    try {
      const { exportarPDF: expPDF } = await import('../../../utils/pdfExport');
      const Sp = (n) => `S/ ${Math.round(n || 0).toLocaleString('es-PE')}`;
      const headers = [['Frente', 'Presupuesto (BAC)', 'Valorizado (EV)', 'Costo Real (AC)', 'Margen (CV)', 'CPI', 'Margen %']];
      const rows = porFrente.map(({ frente, ro, nPart }) => {
        const cpi = cpiOf(ro.totales.EV, ro.totales.AC), m = margenPct(ro.totales.EV, ro.totales.AC);
        return [`${frente.nombre} (${nPart} part.)`, Sp(ro.totales.BAC), Sp(ro.totales.EV), Sp(ro.totales.AC), Sp(cv(ro.totales.EV, ro.totales.AC)), cpi ? cpi.toFixed(2) : '—', `${Math.round(m)}%`];
      });
      const cpiT = cpiOf(total.EV, total.AC), mT = margenPct(total.EV, total.AC);
      rows.push(['TOTAL OBRA (sin GG)', Sp(total.BAC), Sp(total.EV), Sp(total.AC), Sp(cv(total.EV, total.AC)), cpiT ? cpiT.toFixed(2) : '—', `${Math.round(mT)}%`]);
      await expPDF({
        titulo: 'Resultado Operativo por Frente (F1/F2)',
        subtitulo: proyectoActivo?.nombre || 'Proyecto activo',
        headers, rows, orientacion: 'l',
        nombreArchivo: `RO_Frentes_${(proyectoActivo?.nombre || 'proyecto').replace(/\s+/g, '_')}.pdf`,
      });
    } catch (e) { console.error('[RO frentes PDF]', e); }
  };

  const fila = (label, sub, bac, ev, ac, destacado) => {
    const cpi = cpiOf(ev, ac), m = margenPct(ev, ac), cvv = cv(ev, ac);
    return (
      <tr style={{ background: destacado ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : BASE.white, color: destacado ? '#fff' : undefined, borderTop: destacado ? `3px solid ${BASE.gold}` : `1px solid ${BASE.border}` }}>
        <td style={{ padding: '10px 12px', fontWeight: 900, color: destacado ? '#fff' : BASE.navy }}>
          {label}{sub ? <span style={{ fontSize: 10, fontWeight: 600, color: destacado ? 'rgba(255,255,255,0.7)' : BASE.muted, marginLeft: 6 }}>{sub}</span> : null}
        </td>
        <td style={tdN(destacado)}>{fmtSoles(bac)}</td>
        <td style={tdN(destacado)}>{fmtSoles(ev)}</td>
        <td style={tdN(destacado)}>{fmtSoles(ac)}</td>
        <td style={{ ...tdN(destacado), color: destacado ? (cvv >= 0 ? '#4ade80' : '#fca5a5') : (cvv >= 0 ? '#16a34a' : '#dc2626'), fontWeight: 900 }}>{fmtSoles(cvv)}</td>
        <td style={{ ...tdN(destacado), color: destacado ? '#fbbf24' : colorCPI(cpi), fontWeight: 900 }}>{cpi ? cpi.toFixed(2) : '—'}</td>
        <td style={{ ...tdN(destacado), color: destacado ? '#fbbf24' : (m >= 15 ? '#16a34a' : m >= 0 ? '#d97706' : '#dc2626'), fontWeight: 900 }}>{fmtPct(m)}</td>
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 12, padding: '13px 16px', boxShadow: BASE.shadowMd }}>
        <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.4, color: BASE.gold }}>RESULTADO OPERATIVO POR FRENTE · EN VIVO</p>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>F1 vs F2 — comparativo de la obra</h2>
        <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{proyectoActivo?.nombre || 'Proyecto activo'} · {porFrente.length} frente{porFrente.length !== 1 ? 's' : ''} con actividades · GG no se reparte (es obra-level)</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={exportarPDF} style={{ fontSize: 11, fontWeight: 800, padding: '7px 14px', borderRadius: 9, border: `1px solid ${BASE.navy}`, background: BASE.navy, color: '#fff', cursor: 'pointer' }}>📄 Exportar PDF</button>
      </div>

      {/* KPIs comparativos rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 10 }}>
        {porFrente.map(({ frente, ro }) => {
          const cpi = cpiOf(ro.totales.EV, ro.totales.AC);
          return (
            <div key={frente.id} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `4px solid ${frente.color || BASE.gold}`, borderRadius: 12, padding: '12px 15px', boxShadow: BASE.shadowSm }}>
              <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy }}>{frente.codigo ? `${frente.codigo} · ` : ''}{frente.nombre}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, color: BASE.muted, letterSpacing: 0.4 }}>MARGEN (CV)</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: cv(ro.totales.EV, ro.totales.AC) >= 0 ? '#16a34a' : '#dc2626' }}>{fmtSoles(cv(ro.totales.EV, ro.totales.AC))}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: BASE.muted, letterSpacing: 0.4 }}>CPI</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: colorCPI(cpi) }}>{cpi ? cpi.toFixed(2) : '—'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla comparativa */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'auto', boxShadow: BASE.shadowSm }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 760 }}>
          <thead>
            <tr style={{ background: BASE.navy, color: '#fff' }}>
              <th style={{ ...th, textAlign: 'left' }}>Frente</th>
              <th style={th}>Presupuesto (BAC)</th>
              <th style={th}>Valorizado (EV)</th>
              <th style={th}>Costo Real (AC)</th>
              <th style={th}>Margen (CV)</th>
              <th style={th}>CPI</th>
              <th style={th}>Margen %</th>
            </tr>
          </thead>
          <tbody>
            {porFrente.map(({ frente, ro, nPart }) => fila(
              frente.nombre, `${nPart} part.`, ro.totales.BAC, ro.totales.EV, ro.totales.AC, false,
            ))}
            {fila('TOTAL OBRA', '(directo, sin GG)', total.BAC, total.EV, total.AC, true)}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 10.5, color: BASE.muted, textAlign: 'right' }}>
        El EV se reparte por partida (cada frente gana solo lo valorizado de sus partidas). Para abrir el detalle de un frente, elígelo en el selector de frentes de la barra superior.
      </p>
    </div>
  );
}

const th = { padding: '10px 10px', textAlign: 'right', fontSize: 10, fontWeight: 800, letterSpacing: 0.4, borderBottom: `2px solid ${BASE.gold}`, whiteSpace: 'nowrap' };
const tdN = (dark) => ({ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--grapco-font-mono, monospace)', whiteSpace: 'nowrap', color: dark ? '#fff' : BASE.text });
