// src/views/modulos/proyectos/ComparativoFrentes.jsx — Comparativo entre frentes del proyecto (B23)
//
// Filtra el RO por cada frente y muestra una tabla comparativa.
// Permite identificar qué frente está rentable, atrasado, o necesita atención.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import {
  calcularROMensual, CATEGORIAS_MO,
  fmtSoles, fmtPct, colorMargen, colorCPI,
} from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

export default function ComparativoFrentes() {
  const { proyectoActivo, frentesDelProyecto } = useProyectoActivo();
  const [actividades, setActividades] = useState([]);
  const [apus, setApus] = useState([]);
  const [tareos, setTareos] = useState([]);
  const [kardex, setKardex] = useState([]);
  const [valorizaciones, setValorizaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pending = 5;
    const dec = () => { pending -= 1; if (pending <= 0) setLoading(false); };
    const cb = (setter) => (snap) => { setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dec(); };
    const errCb = (e) => { console.warn(e); dec(); };
    const unsubs = [
      onSnapshot(collection(db, 'PlanMaestro'), cb(setActividades), errCb),
      onSnapshot(collection(db, 'APUs'), cb(setApus), errCb),
      onSnapshot(collection(db, 'Registros_Campo'), cb(setTareos), errCb),
      onSnapshot(collection(db, 'Kardex_Movimientos'), cb(setKardex), errCb),
      onSnapshot(collection(db, 'ValorizacionesContractuales'), cb(setValorizaciones), errCb),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const salariosMap = useMemo(() => {
    const m = new Map();
    CATEGORIAS_MO.forEach(c => m.set(c.id, c.salarioBase));
    return m;
  }, []);

  // Calcular RO POR FRENTE
  const rosPorFrente = useMemo(() => {
    if (loading || !proyectoActivo) return [];

    return frentesDelProyecto.map(frente => {
      // Filtrar actividades del frente
      const actsDelFrente = actividades.filter(a =>
        a.frenteId === frente.id ||
        (a.proyectoId === proyectoActivo.id && !a.frenteId && frente.esDefault)
      );
      // Filtrar tareos del frente
      const tareosDelFrente = tareos.filter(t =>
        t.frenteId === frente.id ||
        (t.proyectoId === proyectoActivo.id && !t.frenteId && frente.esDefault)
      );
      // Filtrar kardex del frente
      const kardexDelFrente = kardex.filter(k =>
        k.frenteId === frente.id ||
        (k.proyectoId === proyectoActivo.id && !k.frenteId && frente.esDefault)
      );

      const ro = calcularROMensual({
        actividades: actsDelFrente,
        apus,
        tareos: tareosDelFrente,
        kardexMovimientos: kardexDelFrente,
        valorizaciones,
        salariosPorCategoria: salariosMap,
        margenMeta: proyectoActivo.margenMetaPct || 15,
        fechaActual: new Date(),
      });

      return {
        frente,
        ro,
        nActividades: actsDelFrente.length,
      };
    });
  }, [loading, proyectoActivo, frentesDelProyecto, actividades, apus, tareos, kardex, valorizaciones, salariosMap]);

  // Totales del proyecto
  const totalesProyecto = useMemo(() => {
    if (!rosPorFrente.length) return null;
    const t = rosPorFrente.reduce((acc, { ro }) => ({
      BAC: acc.BAC + ro.totales.BAC,
      EV: acc.EV + ro.totales.EV,
      AC: acc.AC + ro.totales.AC,
      vendido: acc.vendido + ro.totales.vendido,
      costoAplicado: acc.costoAplicado + ro.totales.costoAplicado,
      costoReal: acc.costoReal + ro.totales.costoReal,
    }), { BAC: 0, EV: 0, AC: 0, vendido: 0, costoAplicado: 0, costoReal: 0 });
    const CPI_g = t.AC > 0 ? t.EV / t.AC : 0;
    const margenReal_g = t.vendido > 0 ? ((t.vendido - t.costoReal) / t.vendido) * 100 : 0;
    return { ...t, CPI: CPI_g, margenReal: margenReal_g };
  }, [rosPorFrente]);

  if (!proyectoActivo) {
    return <EmptyState icono="🌎" titulo="Sin proyecto activo"
      descripcion="Selecciona un proyecto en la barra superior." />;
  }

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando comparativo...</p>;

  if (!frentesDelProyecto.length) {
    return <EmptyState icono="📍" titulo="Sin frentes en este proyecto"
      descripcion="Crea frentes en este proyecto para poder compararlos." />;
  }

  const margenMeta = proyectoActivo.margenMetaPct || 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${proyectoActivo.color || BASE.navy}, ${proyectoActivo.color || BASE.navy}dd)`,
        borderRadius: '14px', padding: '20px 26px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          ⚖️ COMPARATIVO ENTRE FRENTES
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
          {proyectoActivo.nombre}
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
          {frentesDelProyecto.length} frentes · KPIs por frente: avance, CPI, SPI, margen, EAC
        </p>
      </div>

      {/* Tabla comparativa */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1100px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th}>Frente</th>
                <th style={{ ...th, textAlign: 'right' }}>Actividades</th>
                <th style={{ ...th, textAlign: 'right' }}>BAC</th>
                <th style={{ ...th, textAlign: 'right' }}>EV (Vendido)</th>
                <th style={{ ...th, textAlign: 'right' }}>AC (Real)</th>
                <th style={{ ...th, textAlign: 'right' }}>%Avance</th>
                <th style={{ ...th, textAlign: 'right' }}>CPI</th>
                <th style={{ ...th, textAlign: 'right' }}>SPI</th>
                <th style={{ ...th, textAlign: 'right' }}>Margen Real</th>
                <th style={{ ...th, textAlign: 'right' }}>EAC</th>
              </tr>
            </thead>
            <tbody>
              {rosPorFrente.map(({ frente, ro, nActividades }, i) => {
                const ind = ro.indicadoresGlobales;
                const cMargen = colorMargen(ind.margenReal, margenMeta);
                const cCPI = colorCPI(ind.CPI);
                const cSPI = colorCPI(ind.SPI);
                return (
                  <tr key={frente.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: frente.color, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '11px', fontWeight: '900', color: frente.color, fontFamily: 'monospace' }}>{frente.codigo}</p>
                          <p style={{ fontSize: '12px', color: BASE.text, fontWeight: '700' }}>{frente.nombre}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{nActividades}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(ro.totales.BAC)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(ro.totales.vendido)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(ro.totales.costoReal)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtPct(ind.pctAvanceFisico)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cCPI }}>{ind.CPI?.toFixed(2) || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cSPI }}>{ind.SPI?.toFixed(2) || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: cMargen }}>
                      {fmtPct(ind.margenReal)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(ind.EAC)}</td>
                  </tr>
                );
              })}
            </tbody>
            {totalesProyecto && (
              <tfoot>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <td style={{ padding: '14px', fontWeight: '900', fontSize: '12px' }}>TOTAL PROYECTO</td>
                  <td colSpan={1} style={{ padding: '14px', textAlign: 'right' }}></td>
                  <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(totalesProyecto.BAC)}</td>
                  <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(totalesProyecto.vendido)}</td>
                  <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>{fmtSoles(totalesProyecto.costoReal)}</td>
                  <td colSpan={1}></td>
                  <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.gold }}>{totalesProyecto.CPI?.toFixed(2) || '—'}</td>
                  <td colSpan={1}></td>
                  <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.gold }}>{fmtPct(totalesProyecto.margenReal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Visualización por barras (avance comparativo) */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '18px 24px' }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '14px' }}>
          📊 AVANCE FÍSICO POR FRENTE (BARRAS COMPARATIVAS)
        </p>
        {rosPorFrente.map(({ frente, ro }) => {
          const pct = ro.indicadoresGlobales.pctAvanceFisico || 0;
          return (
            <div key={frente.id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: BASE.text }}>
                  <span style={{ color: frente.color, fontFamily: 'monospace', fontWeight: '900' }}>{frente.codigo}</span> · {frente.nombre}
                </span>
                <span style={{ fontSize: '12px', fontWeight: '900', color: frente.color, fontFamily: 'monospace' }}>
                  {fmtPct(pct)}
                </span>
              </div>
              <div style={{ background: BASE.bgSoft, height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  background: `linear-gradient(90deg, ${frente.color}, ${frente.color}dd)`,
                  height: '100%', width: `${Math.min(100, pct)}%`,
                  transition: 'width 0.6s ease',
                  boxShadow: `0 1px 4px ${frente.color}55`,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking de margen real */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '18px 24px' }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '14px' }}>
          🏆 RANKING DE FRENTES POR RENTABILIDAD
        </p>
        {[...rosPorFrente]
          .sort((a, b) => (b.ro.indicadoresGlobales.margenReal || 0) - (a.ro.indicadoresGlobales.margenReal || 0))
          .map(({ frente, ro }, idx) => {
            const margen = ro.indicadoresGlobales.margenReal || 0;
            const c = colorMargen(margen, margenMeta);
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅';
            return (
              <div key={frente.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                background: c + '12', border: `1px solid ${c}33`,
                borderLeft: `4px solid ${c}`,
                borderRadius: '10px', marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{medal}</span>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: '900', color: frente.color, fontFamily: 'monospace' }}>{frente.codigo}</p>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: BASE.text }}>{frente.nombre}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '18px', fontWeight: '900', color: c, fontFamily: 'monospace' }}>{fmtPct(margen)}</p>
                  <p style={{ fontSize: '10px', color: BASE.muted }}>Meta: {margenMeta}%</p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

const th = { padding: '11px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: '11.5px', color: BASE.text, verticalAlign: 'top' };
