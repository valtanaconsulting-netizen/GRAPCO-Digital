import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
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

const TABS = [
  { id: 'ranking', l: 'Ranking',         desc: 'Personas ordenadas por LUF' },
  { id: 'pareto',  l: 'Pareto TNC',      desc: 'Causas de tiempo perdido' },
  { id: 'crew',    l: 'Crew Balance',    desc: 'Visualizacion por persona' },
  { id: 'recoms',  l: 'Recomendaciones', desc: 'Acciones sugeridas' },
];

export default function CartaBalanceAnalisis() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ranking');
  const [cbSel, setCbSel] = useState(null);
  const [filtro, setFiltro] = useState('');

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

  const cartasFiltradas = useMemo(() => {
    return cartas.filter(cb => {
      if (!filtro) return true;
      return (cb.actividad || '').toLowerCase().includes(filtro.toLowerCase());
    });
  }, [cartas, filtro]);

  const ranking = useMemo(() => rankingHistorico(cartasFiltradas), [cartasFiltradas]);

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

      {tab === 'ranking' && <TabRanking ranking={ranking} />}
      {tab === 'pareto' && cbSel && <TabPareto cb={cbSel} />}
      {tab === 'crew' && cbSel && <TabCrew cb={cbSel} />}
      {tab === 'recoms' && cbSel && <TabRecoms cb={cbSel} />}
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
                <td style={{ ...td(), fontWeight: '900', color: r.clasificacion.color }}>{r.lufPromedio}%</td>
                <td style={td()}>{r.tpPromedio}%</td>
                <td style={td()}>{r.tcPromedio}%</td>
                <td style={td()}>{r.tncPromedio}%</td>
                <td style={td()}>{r.sesiones}</td>
                <td style={td()}>{r.totalObs}</td>
                <td style={td()}>{r.confianza}%</td>
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
          <span style={{ fontWeight: '900', color: BASE.navy }}>{fila.porcentaje}% (acum {fila.acumulado}%)</span>
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
              <span style={{ color: cls.color, fontWeight: '900' }}>LUF {g.kpis.luf}%</span>
            </div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden' }}>
              {g.kpis.tp > 0 && <div style={{ width: g.kpis.tp + '%', background: BASE.green }} />}
              {g.kpis.tc > 0 && <div style={{ width: g.kpis.tc + '%', background: BASE.gold }} />}
              {g.kpis.tnc > 0 && <div style={{ width: g.kpis.tnc + '%', background: BASE.red }} />}
            </div>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px' }}>
              TP {g.kpis.tp}% / TC {g.kpis.tc}% / TNC {g.kpis.tnc}% / {g.kpis.n} obs
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
