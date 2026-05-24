// src/views/modulos/apus/ComparativoAPU.jsx — APU teórico vs real (B21)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import {
  recalcularAPUReal, fmtSoles, fmtPct,
} from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

export default function ComparativoAPU() {
  const [apus, setApus] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [kardexMov, setKardexMov] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'APUs'), orderBy('codigo')),
        (snap) => { setApus(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'PlanMaestro'),
        (snap) => setActividades(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'Historial'),
        (snap) => setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'KardexMovimientos'),
        (snap) => setKardexMov(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (e) => console.warn('[Kardex]', e)),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Calcular precios reales del Kardex (último costo unitario por material)
  const preciosReales = useMemo(() => {
    const map = new Map();
    const entradas = kardexMov.filter(m => m.tipo === 'ENTRADA' || m.tipo === 'INGRESO');
    for (const e of entradas) {
      if (!e.materialId) continue;
      const actual = map.get(e.materialId);
      // Tomar el último (asumiendo orden por fecha desc)
      if (!actual || (e.fecha?.toDate && actual.fecha < e.fecha.toDate())) {
        map.set(e.materialId, { precio: e.costoUnitario || 0, fecha: e.fecha?.toDate ? e.fecha.toDate() : new Date() });
      }
    }
    const result = new Map();
    map.forEach((v, k) => result.set(k, v.precio));
    return result;
  }, [kardexMov]);

  // Calcular rendimiento real por actividad (avance / HH)
  const rendimientosReales = useMemo(() => {
    const map = new Map();
    for (const act of actividades) {
      if (!act.codigo) continue;
      if (!act.hhAcumReal || !act.avanceMetradoAcum) continue;
      // rendimiento = metrado / HH
      const rend = act.avanceMetradoAcum / act.hhAcumReal;
      // Convertir a unidades por día (asumiendo 8 HH/día/persona y cuadrilla)
      // Simplificación: rendimiento = unidades por HH
      map.set(act.codigo, rend);
    }
    return map;
  }, [actividades]);

  const comparativos = useMemo(() => {
    return apus.map(apu => {
      // Buscar actividad relacionada (por código WBS si APU-XX.XX.XX o por apuId)
      const codigoBase = (apu.codigo || '').replace(/^APU-/, '');
      const act = actividades.find(a => a.codigo === codigoBase || a.apuId === apu.id);
      const rendReal = rendimientosReales.get(act?.codigo);

      // Recalcular APU con datos reales
      const real = recalcularAPUReal(apu, {
        rendimientoReal: rendReal && apu.rendimientoBase ? rendReal * 8 : null, // convertir a und/día
        preciosMatReales: preciosReales,
      });

      return {
        apu, act, real,
      };
    });
  }, [apus, actividades, rendimientosReales, preciosReales]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando comparativos...</p>;

  if (apus.length === 0) {
    return <EmptyState icono="⚖️" titulo="Sin APUs"
      descripcion="Crea APUs primero. Esta vista compara el costo teórico vs el real cuando ya hay datos de Kardex y Tareos." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b22, #d9770622)',
        border: '1px solid #f59e0b55',
        borderLeft: `4px solid ${BASE.gold}`,
        borderRadius: '12px', padding: '14px 18px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.goldDark, letterSpacing: '0.5px' }}>
          ⚖️ ANÁLISIS DE DESVIACIONES APU TEÓRICO vs REAL
        </p>
        <p style={{ fontSize: '12px', color: BASE.text, marginTop: '4px', lineHeight: 1.5 }}>
          La plataforma recalcula los APUs usando precios reales del Kardex y rendimientos reales de Tareos. <strong>Verde:</strong> dentro de tolerancia (±5%). <strong>Naranja:</strong> desviación media (5-10%). <strong>Rojo:</strong> sobrecosto crítico (&gt;10%).
        </p>
      </div>

      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1100px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th}>Código</th>
                <th style={th}>Descripción</th>
                <th style={{ ...th, textAlign: 'right' }}>Costo Teórico</th>
                <th style={{ ...th, textAlign: 'right' }}>Costo Real</th>
                <th style={{ ...th, textAlign: 'right' }}>Δ Abs</th>
                <th style={{ ...th, textAlign: 'right' }}>Δ %</th>
                <th style={{ ...th, textAlign: 'center' }}>Severidad</th>
              </tr>
            </thead>
            <tbody>
              {comparativos.map(({ apu, real }, i) => {
                const colorSev = real.severidad === 'critica' ? BASE.red :
                                 real.severidad === 'alta' ? '#dc2626' :
                                 real.severidad === 'media' ? BASE.gold :
                                 real.severidad === 'positiva' ? '#0d9488' : BASE.green;
                const labelSev = real.severidad === 'positiva' ? '✅ Por debajo' :
                                 real.severidad === 'ok' ? '✓ OK' :
                                 real.severidad === 'media' ? '⚠️ Media' : '🔴 Alta';
                return (
                  <tr key={apu.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: '900', color: '#6366f1' }}>{apu.codigo}</td>
                    <td style={td}>{apu.descripcion}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(apu.costoUnitarioTotal)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900' }}>
                      {fmtSoles(real.costoUnitarioReal)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: real.deltaAbs > 0 ? BASE.red : BASE.green }}>
                      {real.deltaAbs > 0 ? '+' : ''}{fmtSoles(real.deltaAbs)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: colorSev }}>
                      {real.deltaPct > 0 ? '+' : ''}{fmtPct(real.deltaPct, 2)}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        background: colorSev, color: '#fff',
                        padding: '3px 10px', borderRadius: '10px',
                        fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                      }}>{labelSev}</span>
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

const th = { padding: '12px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: '12px', color: BASE.text };
