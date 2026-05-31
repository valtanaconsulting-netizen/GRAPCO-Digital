import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import EmptyState from '../components/EmptyState';
import {
  calcularKPIs,
  clasificarLUF,
  agruparPorPersona,
  paretoTNC,
  causasCriticasTNC,
  rankingHistorico,
  generarRecomendaciones,
} from '../utils/cartaBalanceAnalytics';
import {
  tendenciaSemanal, compararPorActividad, evaluarMetas, METAS_CB_DEFAULT,
} from '../utils/cartaBalanceProductividad';

const TABS = [
  { id: 'tendencia', l: 'Tendencia',      desc: 'TP/TC/TNC en el tiempo' },
  { id: 'comparar',  l: 'Comparar',       desc: 'Productividad por actividad' },
  { id: 'ranking',   l: 'Ranking',        desc: 'Personas ordenadas por LUF' },
  { id: 'pareto',    l: 'Pareto TNC',     desc: 'Causas de tiempo perdido' },
  { id: 'crew',      l: 'Crew Balance',   desc: 'Visualizacion por persona' },
  { id: 'recoms',    l: 'Recomendaciones', desc: 'Acciones sugeridas' },
  { id: 'metas',     l: 'Metas',          desc: 'Objetivos de productividad' },
];

export default function CartaBalanceAnalisis() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tendencia');
  const [cbSel, setCbSel] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [metas, setMetas] = useState(METAS_CB_DEFAULT);

  useEffect(() => {
    const q = query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => {
        setCartas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // Metas de productividad (configurables, guardadas en Configuracion/metas_cb)
  useEffect(() => {
    return onSnapshot(doc(db, 'Configuracion', 'metas_cb'), (s) => {
      if (s.exists()) setMetas({ ...METAS_CB_DEFAULT, ...(s.data() || {}) });
    }, (e) => console.warn('[metas_cb]', e));
  }, []);

  const cartasFiltradas = useMemo(() => {
    return cartas.filter(cb => {
      if (!filtro) return true;
      return (cb.actividad || '').toLowerCase().includes(filtro.toLowerCase());
    });
  }, [cartas, filtro]);

  const ranking = useMemo(() => rankingHistorico(cartasFiltradas), [cartasFiltradas]);
  const tendencia = useMemo(() => tendenciaSemanal(cartasFiltradas), [cartasFiltradas]);
  const comparativa = useMemo(() => compararPorActividad(cartasFiltradas), [cartasFiltradas]);

  // Exportar a Excel: tendencia + comparación por actividad + ranking.
  const exportarExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        tendencia.map(t => ({ Periodo: t.periodo, 'TP %': t.tp, 'TC %': t.tc, 'TNC %': t.tnc, 'LUF %': t.luf, Sesiones: t.sesiones, Observaciones: t.totalObs }))
      ), 'Tendencia');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        comparativa.map(c => ({ Actividad: c.actividad, 'TP %': c.tp, 'TC %': c.tc, 'TNC %': c.tnc, 'LUF %': c.luf, Sesiones: c.sesiones, Estado: evaluarMetas(c, metas).label }))
      ), 'Por actividad');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        ranking.map((r, i) => ({ '#': i + 1, Persona: r.nombre, 'LUF %': r.lufPromedio, 'TP %': r.tpPromedio, 'TC %': r.tcPromedio, 'TNC %': r.tncPromedio, Sesiones: r.sesiones, Confianza: r.confianza }))
      ), 'Ranking');
      XLSX.writeFile(wb, `CartaBalance_Productividad_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error('[exportarExcel]', e); }
  }, [tendencia, comparativa, ranking, metas]);

  const guardarMetas = useCallback(async (nuevas) => {
    setMetas(nuevas);
    try {
      await setDoc(doc(db, 'Configuracion', 'metas_cb'), { ...nuevas, actualizadoEn: serverTimestamp() }, { merge: true });
    } catch (e) { console.warn('[guardarMetas]', e); }
  }, []);

  useEffect(() => {
    if (!cbSel && cartasFiltradas.length > 0) {
      setCbSel(cartasFiltradas[0]);
    }
  }, [cartasFiltradas, cbSel]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted }}>
        Cargando datos de Cartas Balance...
      </div>
    );
  }

  if (cartas.length === 0) {
    return (
      <EmptyState
        icono="CB"
        titulo="Sin Cartas Balance registradas"
        descripcion="Cuando los capataces hagan al menos una Carta Balance, aparecera aqui el analisis estadistico."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      <div style={{
        background: 'linear-gradient(135deg, ' + BASE.navy + ', ' + BASE.navyDark + ')',
        color: '#fff',
        borderRadius: '14px',
        padding: '18px 24px',
        borderLeft: '5px solid ' + BASE.gold,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
              ANALISIS DE CARTA BALANCE
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>
              Productividad y composicion de cuadrillas
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
              {cartasFiltradas.length} cartas balance, {ranking.length} personas en historial
            </p>
          </div>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por actividad..."
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              minWidth: '200px',
            }}
          />
          <button onClick={exportarExcel} title="Exportar a Excel" style={{
            padding: '10px 16px', borderRadius: '8px', border: `1px solid ${BASE.gold}`,
            background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff',
            fontSize: '12px', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>⬇ Exportar Excel</button>
        </div>
      </div>

      <div style={{
        background: BASE.white,
        border: '1px solid ' + BASE.border,
        borderRadius: '12px',
        padding: '6px',
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
      }}>
        {TABS.map((t) => {
          const activo = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px',
                flex: '1 1 auto',
                minWidth: '140px',
                background: activo
                  ? 'linear-gradient(135deg, ' + BASE.navy + ', ' + BASE.navyDark + ')'
                  : 'transparent',
                color: activo ? '#fff' : BASE.muted,
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {t.l}
            </button>
          );
        })}
      </div>

      {tab === 'tendencia' && <TabTendencia data={tendencia} metas={metas} />}
      {tab === 'comparar' && <TabComparar data={comparativa} metas={metas} />}
      {tab === 'ranking' && <TabRanking ranking={ranking} />}
      {tab === 'pareto' && cbSel && <TabPareto cb={cbSel} />}
      {tab === 'crew' && cbSel && <TabCrew cb={cbSel} />}
      {tab === 'recoms' && cbSel && <TabRecoms cb={cbSel} />}
      {tab === 'metas' && <TabMetas metas={metas} onGuardar={guardarMetas} />}
    </div>
  );
}

// ── Tendencia de TP/TC/TNC/LUF en el tiempo ──
function TabTendencia({ data, metas }) {
  if (!data || data.length < 2) {
    return <EmptyState icono="~" titulo="Faltan datos para la tendencia" descripcion="Se necesitan Cartas Balance de al menos 2 semanas distintas para ver la evolución." />;
  }
  const chart = data.map(d => ({ periodo: d.periodo.replace('-', ' '), TP: d.tp, TC: d.tc, TNC: d.tnc, LUF: d.luf }));
  const ult = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const deltaLuf = prev ? +(ult.luf - prev.luf).toFixed(1) : null;
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: BASE.navy }}>EVOLUCIÓN DE PRODUCTIVIDAD (por semana)</h3>
        {deltaLuf != null && (
          <span style={{ fontSize: 12, fontWeight: 900, color: deltaLuf >= 0 ? BASE.greenDark : BASE.red }}>
            LUF {deltaLuf >= 0 ? '▲ +' : '▼ '}{deltaLuf} pts vs semana anterior
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chart} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} />
          <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: BASE.muted }} />
          <YAxis tick={{ fontSize: 11, fill: BASE.muted }} unit="%" domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={metas.tpMin} stroke={BASE.green} strokeDasharray="5 4" label={{ value: `Meta TP ${metas.tpMin}%`, fontSize: 10, fill: BASE.greenDark, position: 'insideTopRight' }} />
          <ReferenceLine y={metas.tncMax} stroke={BASE.red} strokeDasharray="5 4" label={{ value: `Máx TNC ${metas.tncMax}%`, fontSize: 10, fill: BASE.red, position: 'insideBottomRight' }} />
          <Line type="monotone" dataKey="TP" stroke={BASE.green} strokeWidth={2.5} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="TC" stroke={BASE.gold} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="TNC" stroke={BASE.red} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="LUF" stroke={BASE.navy} strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 10.5, color: BASE.muted, marginTop: 8, fontStyle: 'italic' }}>
        TP = Trabajo Productivo · TC = Contributorio · TNC = No Contributorio · LUF = TP + ½·TC. Líneas punteadas = metas.
      </p>
    </div>
  );
}

// ── Comparación por actividad con semáforo de metas ──
function TabComparar({ data, metas }) {
  if (!data || data.length === 0) {
    return <EmptyState icono="-" titulo="Sin datos por actividad" descripcion="Aún no hay Cartas Balance con actividad registrada." />;
  }
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <h3 style={{ fontSize: 13, fontWeight: 900, color: BASE.navy, marginBottom: 4 }}>PRODUCTIVIDAD POR ACTIVIDAD</h3>
      <p style={{ fontSize: 11, color: BASE.muted, marginBottom: 14 }}>Ordenado por LUF. El semáforo evalúa TP ≥ {metas.tpMin}% y TNC ≤ {metas.tncMax}%.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d) => {
          const ev = evaluarMetas(d, metas);
          return (
            <div key={d.actividad} style={{ borderLeft: `5px solid ${ev.color}`, background: BASE.bgSoft, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: BASE.navy }}>{d.actividad}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: BASE.muted }}>{d.sesiones} ses · {d.totalObs} obs</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: ev.color, padding: '3px 10px', borderRadius: 999 }}>{ev.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: BASE.navy, fontFamily: 'monospace', minWidth: 56, textAlign: 'right' }}>LUF {Math.round(d.luf)}%</span>
                </span>
              </div>
              <div style={{ display: 'flex', height: 16, borderRadius: 5, overflow: 'hidden', marginTop: 8 }}>
                {d.tp > 0 && <div style={{ width: d.tp + '%', background: BASE.green }} title={`TP ${d.tp}%`} />}
                {d.tc > 0 && <div style={{ width: d.tc + '%', background: BASE.gold }} title={`TC ${d.tc}%`} />}
                {d.tnc > 0 && <div style={{ width: d.tnc + '%', background: BASE.red }} title={`TNC ${d.tnc}%`} />}
              </div>
              <p style={{ fontSize: 10, color: BASE.muted, marginTop: 4 }}>TP {Math.round(d.tp)}% · TC {Math.round(d.tc)}% · TNC {Math.round(d.tnc)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Configuración de metas de productividad ──
function TabMetas({ metas, onGuardar }) {
  const [tpMin, setTpMin] = useState(metas.tpMin);
  const [tncMax, setTncMax] = useState(metas.tncMax);
  const [lufObjetivo, setLufObjetivo] = useState(metas.lufObjetivo);
  useEffect(() => { setTpMin(metas.tpMin); setTncMax(metas.tncMax); setLufObjetivo(metas.lufObjetivo); }, [metas]);
  const [ok, setOk] = useState(false);
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '20px 22px', maxWidth: 520 }}>
      <h3 style={{ fontSize: 13, fontWeight: 900, color: BASE.navy, marginBottom: 4 }}>METAS DE PRODUCTIVIDAD</h3>
      <p style={{ fontSize: 11.5, color: BASE.muted, marginBottom: 16 }}>
        Estos objetivos definen el semáforo de la Tendencia y la Comparación. Aplican a toda la obra.
      </p>
      {[
        { l: 'TP mínimo (Trabajo Productivo) %', v: tpMin, set: setTpMin, hint: 'Estándar de obra: 60%' },
        { l: 'TNC máximo (Trabajo No Contributorio) %', v: tncMax, set: setTncMax, hint: 'Estándar: ≤ 15%' },
        { l: 'LUF objetivo %', v: lufObjetivo, set: setLufObjetivo, hint: 'Bueno ≥ 65%' },
      ].map((f) => (
        <div key={f.l} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: BASE.navy, display: 'block', marginBottom: 4 }}>{f.l}</label>
          <input type="number" value={f.v} onChange={(e) => f.set(e.target.value)} min={0} max={100}
            style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 14, fontWeight: 800, color: BASE.navy }} />
          <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 10 }}>{f.hint}</span>
        </div>
      ))}
      <button onClick={() => { onGuardar({ tpMin: num(tpMin, 60), tncMax: num(tncMax, 15), lufObjetivo: num(lufObjetivo, 65) }); setOk(true); setTimeout(() => setOk(false), 2500); }}
        style={{ marginTop: 6, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', fontSize: 13, fontWeight: 900 }}>
        {ok ? '✓ Metas guardadas' : 'Guardar metas'}
      </button>
    </div>
  );
}

function TabRanking({ ranking }) {
  if (ranking.length === 0) {
    return <EmptyState icono="-" titulo="Sin datos" descripcion="Necesitas Cartas Balance con observaciones por persona." />;
  }
  return (
    <div style={{
      background: BASE.white,
      border: '1px solid ' + BASE.border,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', background: BASE.bgSoft, borderBottom: '1px solid ' + BASE.border }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>
          RANKING DE PRODUCTIVIDAD INDIVIDUAL
        </h3>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px' }}>
          Ordenado por LUF (Labor Utilization Factor) = TP + 0.5 x TC
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: BASE.navy, color: '#fff' }}>
              <th style={th()}>#</th>
              <th style={th()}>Persona</th>
              <th style={th()}>LUF</th>
              <th style={th()}>TP</th>
              <th style={th()}>TC</th>
              <th style={th()}>TNC</th>
              <th style={th()}>Sesiones</th>
              <th style={th()}>Obs</th>
              <th style={th()}>Confianza</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.personaId} style={{
                background: i % 2 === 0 ? BASE.white : BASE.bgSoft,
                borderBottom: '1px solid ' + BASE.border,
              }}>
                <td style={{ ...td(), fontWeight: '900', color: BASE.gold }}>{i + 1}</td>
                <td style={{ ...td(), fontWeight: '800', color: BASE.navy }}>{r.nombre}</td>
                <td style={{ ...td(), fontWeight: '900', color: r.clasificacion.color }}>{Math.round(r.lufPromedio)}%</td>
                <td style={td()}>{Math.round(r.tpPromedio)}%</td>
                <td style={td()}>{Math.round(r.tcPromedio)}%</td>
                <td style={td()}>{Math.round(r.tncPromedio)}%</td>
                <td style={td()}>{r.sesiones}</td>
                <td style={td()}>{r.totalObs}</td>
                <td style={td()}>{Math.round(r.confianza)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabPareto({ cb }) {
  const pareto = useMemo(() => paretoTNC(cb.observaciones || []), [cb]);
  const criticas = useMemo(() => causasCriticasTNC(pareto), [pareto]);
  if (pareto.length === 0) {
    return <EmptyState icono="-" titulo="Sin TNC" descripcion="Esta carta balance no tiene tiempo no contributorio." />;
  }
  return (
    <div style={{ background: BASE.white, border: '1px solid ' + BASE.border, borderRadius: '12px', padding: '18px 20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '12px' }}>
        PARETO DE CAUSAS DE TIEMPO NO CONTRIBUTORIO
      </h3>
      {pareto.map((fila) => (
        <div key={fila.subcategoria} style={{
          padding: '10px 14px',
          marginBottom: '6px',
          background: BASE.bgSoft,
          borderRadius: '8px',
          borderLeft: '4px solid ' + (fila.critico ? BASE.red : BASE.gold),
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
        }}>
          <span style={{ fontWeight: '800', color: BASE.navy }}>{fila.label}</span>
          <span style={{ fontWeight: '900', color: BASE.navy }}>{Math.round(fila.porcentaje)}% (acum {Math.round(fila.acumulado)}%)</span>
        </div>
      ))}
    </div>
  );
}

function TabCrew({ cb }) {
  const grupos = useMemo(() => agruparPorPersona(cb), [cb]);
  if (grupos.length === 0) {
    return <EmptyState icono="-" titulo="Sin datos por persona" descripcion="Esta CB no tiene observaciones por persona individual." />;
  }
  return (
    <div style={{ background: BASE.white, border: '1px solid ' + BASE.border, borderRadius: '12px', padding: '18px 20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '12px' }}>
        CREW BALANCE CHART
      </h3>
      {grupos.map((g) => {
        const cls = clasificarLUF(g.kpis.luf);
        return (
          <div key={g.personaId} style={{
            padding: '12px 14px',
            marginBottom: '8px',
            background: BASE.bgSoft,
            borderRadius: '10px',
            borderLeft: '4px solid ' + cls.color,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>{g.nombre}</p>
              <span style={{ color: cls.color, fontWeight: '900' }}>LUF {Math.round(g.kpis.luf)}%</span>
            </div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden' }}>
              {g.kpis.tp > 0 && <div style={{ width: g.kpis.tp + '%', background: BASE.green }} />}
              {g.kpis.tc > 0 && <div style={{ width: g.kpis.tc + '%', background: BASE.gold }} />}
              {g.kpis.tnc > 0 && <div style={{ width: g.kpis.tnc + '%', background: BASE.red }} />}
            </div>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px' }}>
              TP {Math.round(g.kpis.tp)}% / TC {Math.round(g.kpis.tc)}% / TNC {Math.round(g.kpis.tnc)}% / {g.kpis.n} obs
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TabRecoms({ cb }) {
  const recs = useMemo(() => generarRecomendaciones(cb), [cb]);
  if (recs.length === 0) {
    return (
      <div style={{ background: BASE.greenLight, borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.greenDark }}>
          Sin recomendaciones para esta Carta Balance
        </p>
        <p style={{ fontSize: '12px', color: BASE.text, marginTop: '6px' }}>
          El equipo esta dentro de parametros sanos.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {recs.map((r, i) => (
        <div key={i} style={{
          background: BASE.white,
          border: '1px solid ' + BASE.border,
          borderRadius: '12px',
          padding: '14px 18px',
          borderLeft: '4px solid ' + (r.severidad === 'alta' ? BASE.red : r.severidad === 'positiva' ? BASE.green : BASE.gold),
        }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '4px' }}>{r.titulo}</p>
          <p style={{ fontSize: '12px', color: BASE.text, marginBottom: '6px' }}>{r.mensaje}</p>
          <p style={{ fontSize: '11px', color: BASE.muted }}>Accion: {r.accion}</p>
        </div>
      ))}
    </div>
  );
}

const th = () => ({ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '900' });
const td = () => ({ padding: '10px 12px', fontSize: '12px', color: BASE.text });
