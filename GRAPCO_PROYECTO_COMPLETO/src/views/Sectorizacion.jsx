// src/views/Sectorizacion.jsx
// Sectorización + Tren de Actividades (Lean Construction · Work Train).
// Divide el trabajo en N sectores y genera el tren: cada actividad fluye
// sector por sector con ritmo constante (patrón diagonal de Balfour/Ballard).

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';

const PALETA = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#4338ca', '#0f766e'];
const panel = {
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: '12px', padding: '14px 16px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
};
const titulo = { fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px', textTransform: 'uppercase' };

const ACT_DEFAULT = [
  { nombre: 'Trazo', dias: 1 },
  { nombre: 'Acero', dias: 1 },
  { nombre: 'Encofrado', dias: 1 },
  { nombre: 'Concreto', dias: 1 },
  { nombre: 'Desencofrado', dias: 1 },
];

const addDias = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDia = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return `${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
};

export default function Sectorizacion({ showToast }) {
  const { proyectoActivoId } = useProyectoActivo();
  const docId = proyectoActivoId || 'default';

  const [numSectores, setNumSectores] = useState(4);
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [metradoTotal, setMetradoTotal] = useState(0);
  const [unidad, setUnidad] = useState('m³');
  const [actividades, setActividades] = useState(ACT_DEFAULT.map(a => ({ ...a })));
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Cargar config persistida
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'LPS_Sectorizacion', docId), snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.numSectores) setNumSectores(d.numSectores);
        if (d.fechaInicio) setFechaInicio(d.fechaInicio);
        if (d.metradoTotal != null) setMetradoTotal(d.metradoTotal);
        if (d.unidad) setUnidad(d.unidad);
        if (Array.isArray(d.actividades) && d.actividades.length) setActividades(d.actividades);
      }
      setCargado(true);
    }, () => setCargado(true));
    return () => unsub();
  }, [docId]);

  const guardar = useCallback(async () => {
    setGuardando(true);
    try {
      await setDoc(doc(db, 'LPS_Sectorizacion', docId), {
        numSectores, fechaInicio, metradoTotal, unidad, actividades,
        actualizadoEn: new Date(),
      });
      showToast?.('✅ Sectorización guardada', 'success');
    } catch (e) {
      showToast?.('Error al guardar: ' + e.message, 'error');
    } finally { setGuardando(false); }
  }, [docId, numSectores, fechaInicio, metradoTotal, unidad, actividades, showToast]);

  // ── Cálculo del tren ──────────────────────────────────────────
  const tren = useMemo(() => {
    const sectores = Array.from({ length: numSectores }, (_, i) => i + 1);
    // offset acumulado en días de cada actividad (cuándo empieza en el sector 1)
    let offsets = [];
    let acc = 0;
    actividades.forEach(a => { offsets.push(acc); acc += (parseInt(a.dias) || 1); });
    const diasPorCiclo = actividades.reduce((s, a) => s + (parseInt(a.dias) || 1), 0);
    // Duración total: última actividad termina tras recorrer todos los sectores
    const totalDias = diasPorCiclo + (numSectores - 1) * (actividades.length ? Math.max(...actividades.map(a => parseInt(a.dias) || 1)) : 1);
    // Para ritmo simple asumimos 1 sector avanza por "paso" = max dias actividad
    const paso = actividades.length ? Math.max(...actividades.map(a => parseInt(a.dias) || 1)) : 1;
    const numPasos = actividades.length + numSectores - 1;
    const dias = Array.from({ length: numPasos }, (_, k) => ({
      idx: k,
      fecha: addDias(fechaInicio, k * paso),
    }));

    // matriz[actIdx][pasoIdx] = sector | null
    const matriz = actividades.map((a, ai) =>
      dias.map((_, k) => {
        const sector = k - ai + 1;
        return (sector >= 1 && sector <= numSectores) ? sector : null;
      })
    );

    // Cronograma por sector: cuándo empieza/termina cada actividad
    const porSector = sectores.map(s => ({
      sector: s,
      filas: actividades.map((a, ai) => {
        const pasoInicio = ai + (s - 1);
        return {
          actividad: a.nombre,
          fecha: addDias(fechaInicio, pasoInicio * paso),
        };
      }),
    }));

    return { sectores, dias, matriz, totalDias, paso, numPasos, diasPorCiclo };
  }, [numSectores, actividades, fechaInicio]);

  const metradoPorSector = numSectores > 0 ? metradoTotal / numSectores : 0;

  const colorAct = (i) => PALETA[i % PALETA.length];
  const updAct = (i, campo, val) => setActividades(prev => prev.map((a, idx) => idx === i ? { ...a, [campo]: val } : a));
  const addAct = () => setActividades(prev => [...prev, { nombre: 'Nueva actividad', dias: 1 }]);
  const delAct = (i) => setActividades(prev => prev.filter((_, idx) => idx !== i));
  const moveAct = (i, dir) => setActividades(prev => {
    const n = [...prev]; const j = i + dir;
    if (j < 0 || j >= n.length) return prev;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ ...panel, borderLeft: `4px solid ${BASE.gold}` }}>
        <p style={{ fontSize: '12px', color: BASE.text }}>
          <strong>SECTORIZACIÓN · Tren de Actividades.</strong> Divide el frente en sectores de carga equilibrada; cada actividad fluye sector por sector con ritmo constante. Base del Last Planner (flujo continuo, mínimo WIP).
        </p>
      </div>

      {/* Configuración */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
          <p style={titulo}>Configuración</p>
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '7px 14px', background: guardando ? BASE.muted : BASE.green, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
            {guardando ? '⏳ Guardando…' : '💾 Guardar'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '10px' }}>
          <Campo label="N° SECTORES">
            <input type="number" min={1} max={30} value={numSectores}
              onChange={e => setNumSectores(Math.max(1, parseInt(e.target.value) || 1))} style={inpS} />
          </Campo>
          <Campo label="FECHA INICIO">
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inpS} />
          </Campo>
          <Campo label="METRADO TOTAL">
            <input type="number" min={0} value={metradoTotal}
              onChange={e => setMetradoTotal(parseFloat(e.target.value) || 0)} style={inpS} />
          </Campo>
          <Campo label="UNIDAD">
            <input type="text" value={unidad} onChange={e => setUnidad(e.target.value)} style={inpS} />
          </Campo>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        {[
          { l: 'SECTORES', v: numSectores, c: '#2563eb' },
          { l: 'ACTIVIDADES (TREN)', v: actividades.length, c: '#7c3aed' },
          { l: 'DURACIÓN TOTAL', v: `${tren.numPasos * tren.paso} días`, c: BASE.navy, sub: `${tren.numPasos} pasos × ${tren.paso}d` },
          { l: `CARGA / SECTOR`, v: `${metradoPorSector.toFixed(1)} ${unidad}`, c: '#16a34a', sub: 'metrado equilibrado' },
        ].map(k => (
          <div key={k.l} style={{ ...panel, padding: '10px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{k.l}</p>
            <p style={{ fontSize: '19px', fontWeight: '900', color: k.c, marginTop: '2px', lineHeight: 1.15 }}>{k.v}</p>
            {k.sub && <p style={{ fontSize: '9px', color: BASE.muted }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Editor de actividades del tren */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={titulo}>Secuencia de Actividades del Tren</p>
          <button onClick={addAct} style={{ padding: '5px 12px', background: BASE.navy, color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>+ Actividad</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
          {actividades.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderLeft: `4px solid ${colorAct(i)}`, borderRadius: '8px', padding: '6px 10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: colorAct(i), fontFamily: 'monospace', width: '22px' }}>{i + 1}</span>
              <input value={a.nombre} onChange={e => updAct(i, 'nombre', e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '700' }} />
              <label style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>días/sector</label>
              <input type="number" min={1} value={a.dias} onChange={e => updAct(i, 'dias', parseInt(e.target.value) || 1)}
                style={{ width: '56px', padding: '6px 8px', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '12px', textAlign: 'center' }} />
              <button onClick={() => moveAct(i, -1)} disabled={i === 0} style={btnMini}>▲</button>
              <button onClick={() => moveAct(i, 1)} disabled={i === actividades.length - 1} style={btnMini}>▼</button>
              <button onClick={() => delAct(i)} style={{ ...btnMini, color: BASE.red }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz del tren (diagonal) */}
      <div style={panel}>
        <p style={titulo}>Tren de Actividades · Sector por día</p>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '11px', minWidth: `${160 + tren.dias.length * 70}px` }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', background: BASE.navy, color: '#fff', textAlign: 'left', position: 'sticky', left: 0, zIndex: 2, minWidth: '150px' }}>ACTIVIDAD</th>
                {tren.dias.map((d, k) => (
                  <th key={k} style={{ padding: '6px 8px', background: BASE.navy, color: '#fff', fontSize: '9.5px', whiteSpace: 'nowrap', minWidth: '64px' }}>
                    <div>Día {k + 1}</div>
                    <div style={{ fontSize: '8.5px', opacity: 0.7 }}>{fmtDia(d.fecha)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actividades.map((a, ai) => (
                <tr key={ai}>
                  <td style={{ padding: '7px 10px', fontWeight: '800', color: '#fff', background: colorAct(ai), position: 'sticky', left: 0, zIndex: 1, whiteSpace: 'nowrap' }}>{a.nombre}</td>
                  {tren.matriz[ai].map((sec, k) => (
                    <td key={k} style={{ padding: '4px', textAlign: 'center', border: `1px solid ${BASE.border}` }}>
                      {sec ? (
                        <div style={{ background: `${colorAct(ai)}22`, border: `1.5px solid ${colorAct(ai)}`, borderRadius: '6px', padding: '6px 4px', fontWeight: '900', color: colorAct(ai), fontSize: '11px' }}>
                          S{sec}
                        </div>
                      ) : <span style={{ color: '#e2e8f0' }}>·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '6px' }}>
          Cada celda indica qué <strong>sector</strong> trabaja esa actividad ese día. El patrón diagonal = flujo continuo de cuadrillas (Lean: una cuadrilla por actividad, sin esperas).
        </p>
      </div>

      {/* Cronograma por sector */}
      <div style={panel}>
        <p style={titulo}>Cronograma por Sector (fecha de inicio de cada actividad)</p>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: `${120 + actividades.length * 110}px` }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', background: BASE.bgSoft, color: BASE.navy, textAlign: 'left', borderBottom: `1px solid ${BASE.border}` }}>SECTOR</th>
                {actividades.map((a, i) => (
                  <th key={i} style={{ padding: '8px 10px', background: BASE.bgSoft, color: colorAct(i), borderBottom: `1px solid ${BASE.border}`, whiteSpace: 'nowrap' }}>{a.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tren.sectores.map((s, si) => (
                <tr key={s} style={{ borderBottom: `1px solid ${BASE.borderSoft}` }}>
                  <td style={{ padding: '7px 10px', fontWeight: '900', color: BASE.navy }}>Sector {s}</td>
                  {tren.porSector[si].filas.map((f, fi) => (
                    <td key={fi} style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '10.5px', color: BASE.text }}>{fmtDia(f.fecha)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inpS = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BASE.border}`, fontSize: '13px', fontWeight: '700', background: BASE.bgSoft, boxSizing: 'border-box' };
const btnMini = { padding: '4px 7px', background: 'transparent', border: `1px solid ${BASE.border}`, borderRadius: '5px', fontSize: '10px', cursor: 'pointer', color: BASE.muted };
function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px', display: 'block', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  );
}
