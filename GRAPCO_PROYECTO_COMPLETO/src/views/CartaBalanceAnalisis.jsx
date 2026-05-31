// src/views/CartaBalanceAnalisis.jsx
// Tablero ejecutivo INTERACTIVO (estilo Power BI) de Carta Balance.
// Una sola página: tabla por fecha + barras TP/TC/TNC + dona + KPIs, todo
// enlazado por cross-filter (seleccionas una fecha y todo se filtra).
// Menos es más: pensado para gerencia.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Legend,
} from 'recharts';
import { db } from '../firebaseConfig';
import { BASE, CB_COL } from '../utils/styles';
import EmptyState from '../components/EmptyState';
import { calcularKPIs, clasificarLUF, paretoTNC, rankingHistorico } from '../utils/cartaBalanceAnalytics';
import { METAS_CB_DEFAULT } from '../utils/cartaBalanceProductividad';

const fmtCorta = (f) => (f && f.length >= 10) ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : (f || '—');
const cardBox = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: '14px 16px', boxShadow: BASE.shadowMd };
const titBox = { fontSize: 11, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 };

export default function CartaBalanceAnalisis() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [sel, setSel] = useState(null);     // fecha seleccionada (cross-filter) | null = todas
  const [filtro, setFiltro] = useState('');
  const [metas, setMetas] = useState(METAS_CB_DEFAULT);

  useEffect(() => {
    const q = query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc'));
    return onSnapshot(q, (s) => { setCartas(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
  }, []);
  useEffect(() => onSnapshot(doc(db, 'Configuracion', 'metas_cb'), (s) => {
    if (s.exists()) setMetas({ ...METAS_CB_DEFAULT, ...(s.data() || {}) });
  }, (e) => console.warn('[metas_cb]', e)), []);

  const cartasFiltradas = useMemo(
    () => cartas.filter((c) => !filtro || (c.actividad || '').toLowerCase().includes(filtro.toLowerCase())),
    [cartas, filtro],
  );

  // Agrupado por fecha → filas de tabla y barras
  const porFecha = useMemo(() => {
    const g = {};
    cartasFiltradas.forEach((c) => { if (c.fecha) (g[c.fecha] = g[c.fecha] || []).push(c); });
    return Object.entries(g).map(([fecha, cs]) => {
      const obs = []; cs.forEach((c) => (c.observaciones || []).forEach((o) => obs.push(o)));
      const k = calcularKPIs(obs);
      return { fecha, label: fmtCorta(fecha), tp: Math.round(k.tp), tc: Math.round(k.tc), tnc: Math.round(k.tnc), luf: Math.round(k.luf), n: k.n };
    }).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }, [cartasFiltradas]);

  // Selección (cross-filter): si hay fecha seleccionada, todo se calcula sobre ella.
  const cartasSel = useMemo(() => (sel ? cartasFiltradas.filter((c) => c.fecha === sel) : cartasFiltradas), [cartasFiltradas, sel]);
  const { k, pareto, ranking, nPersonas } = useMemo(() => {
    const obs = []; cartasSel.forEach((c) => (c.observaciones || []).forEach((o) => obs.push(o)));
    const ids = new Set(); cartasSel.forEach((c) => (c.personas || []).forEach((p) => ids.add(p.nombre || p.id)));
    return { k: calcularKPIs(obs), pareto: paretoTNC(obs), ranking: rankingHistorico(cartasSel), nPersonas: ids.size };
  }, [cartasSel]);

  const exportarExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        porFecha.map((f) => ({ Fecha: f.fecha, 'TP %': f.tp, 'TC %': f.tc, 'TNC %': f.tnc, 'LUF %': f.luf, Observaciones: f.n })),
      ), 'Por fecha');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        ranking.map((r, i) => ({ '#': i + 1, Persona: r.nombre, 'LUF %': Math.round(r.lufPromedio), 'TP %': Math.round(r.tpPromedio), 'TC %': Math.round(r.tcPromedio), 'TNC %': Math.round(r.tncPromedio), Sesiones: r.sesiones })),
      ), 'Ranking');
      XLSX.writeFile(wb, `CartaBalance_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error('[exportarExcel]', e); }
  }, [porFecha, ranking]);

  const guardarMetas = useCallback(async (nuevas) => {
    setMetas(nuevas);
    try { await setDoc(doc(db, 'Configuracion', 'metas_cb'), { ...nuevas, actualizadoEn: serverTimestamp() }, { merge: true }); }
    catch (e) { console.warn('[guardarMetas]', e); }
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando Cartas Balance…</div>;
  if (cartas.length === 0) {
    return <EmptyState icono="CB" titulo="Sin Cartas Balance registradas" descripcion="Carga una carta en la pestaña 📥 Importar y aquí verás el resumen." />;
  }

  const cls = clasificarLUF(k.luf);
  const cumpleMeta = k.luf >= metas.lufObjetivo;
  const best = ranking[0];
  const donut = [
    { name: 'Productivo (TP)', value: Math.round(k.tp), color: CB_COL.TP },
    { name: 'Contributorio (TC)', value: Math.round(k.tc), color: CB_COL.TC },
    { name: 'No contributorio (TNC)', value: Math.round(k.tnc), color: CB_COL.TNC },
  ];
  const causas = pareto.slice(0, 4).map((p) => ({ name: p.label, value: Math.round(p.porcentaje) }));
  const fechas = cartasFiltradas.map((c) => c.fecha).filter(Boolean).sort();
  const rango = fechas.length ? `${fmtCorta(fechas[0])} – ${fmtCorta(fechas[fechas.length - 1])}` : '—';
  const toggleSel = (fecha) => setSel((s) => (s === fecha ? null : fecha));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      {/* Barra superior: título, filtro, export, tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: 5 }}>
          {[['resumen', '📊 Resumen'], ['metas', '🎯 Metas']].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
              background: tab === id ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : 'transparent',
              color: tab === id ? '#fff' : BASE.muted,
            }}>{l}</button>
          ))}
        </div>
        {tab === 'resumen' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar actividad…"
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BASE.border}`, fontSize: 12, color: BASE.navy }} />
            <button onClick={exportarExcel} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>⬇ Excel</button>
          </div>
        )}
      </div>

      {tab === 'metas' && <TabMetas metas={metas} onGuardar={guardarMetas} />}

      {tab === 'resumen' && (
        <>
          {/* HERO: LUF de la selección + estado + selección activa */}
          <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 16, padding: '18px 22px', boxShadow: BASE.shadowMd, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: BASE.gold }}>
                PRODUCTIVIDAD · {sel ? `CARTA DEL ${fmtCorta(sel)}` : 'TODAS LAS CARTAS'}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                <span style={{ fontSize: 50, fontWeight: 900, lineHeight: 1 }}>{Math.round(k.luf)}%</span>
                <span style={{ fontSize: 13, fontWeight: 900, padding: '5px 12px', borderRadius: 999, background: cumpleMeta ? 'rgba(16,185,129,0.22)' : 'rgba(229,168,47,0.22)', border: `1px solid ${cumpleMeta ? '#10B981' : BASE.gold}` }}>
                  {cls.emoji} {cls.label}
                </span>
                {sel && (
                  <button onClick={() => setSel(null)} style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer' }}>✕ Ver todas</button>
                )}
              </div>
              <p style={{ fontSize: 11.5, opacity: 0.85, marginTop: 6 }}>Índice de uso de MO (LUF) · meta {metas.lufObjetivo}%</p>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {[['TP', Math.round(k.tp)], ['TC', Math.round(k.tc)], ['TNC', Math.round(k.tnc)], ['Obs.', k.n], ['Trab.', nPersonas]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 900 }}>{v}{l.startsWith('T') && l.length === 2 ? '%' : ''}</p>
                  <p style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Grid: izquierda (tabla + dona + claves) · derecha (3 barras por fecha) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 14 }}>
            {/* Columna izquierda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Tabla por fecha (clickable) */}
              <div style={cardBox}>
                <p style={titBox}>Resultados por fecha <span style={{ textTransform: 'none', fontWeight: 600 }}>· clic para filtrar</span></p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: BASE.navySoft, color: BASE.navy }}>
                        {['Fecha', 'TP', 'TC', 'TNC', 'LUF'].map((h, i) => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10.5, fontWeight: 900 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {porFecha.map((f) => {
                        const activo = sel === f.fecha;
                        return (
                          <tr key={f.fecha} onClick={() => toggleSel(f.fecha)} style={{
                            cursor: 'pointer', borderTop: `1px solid ${BASE.border}`,
                            background: activo ? BASE.gold + '22' : 'transparent',
                          }}>
                            <td style={{ padding: '8px 10px', fontWeight: 800, color: BASE.navy }}>{f.fecha.slice(8, 10)}/{f.fecha.slice(5, 7)}/{f.fecha.slice(2, 4)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: CB_COL.TP, fontWeight: 700 }}>{f.tp}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: CB_COL.TC, fontWeight: 700 }}>{f.tc}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: CB_COL.TNC, fontWeight: 700 }}>{f.tnc}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: BASE.navy }}>{f.luf}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 10, color: BASE.muted, marginTop: 8 }}>{porFecha.length} fecha(s) · período {rango}</p>
              </div>

              {/* Dona de distribución (de la selección) */}
              <div style={cardBox}>
                <p style={titBox}>Distribución del tiempo {sel ? `(${fmtCorta(sel)})` : '(global)'}</p>
                <div style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                        {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '36%', left: 0, right: 0, textAlign: 'center', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: CB_COL.TP, lineHeight: 1 }}>{Math.round(k.tp)}%</p>
                    <p style={{ fontSize: 9.5, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase' }}>Productivo</p>
                  </div>
                </div>
              </div>

              {/* Claves */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <CardResumen color={cumpleMeta ? BASE.greenDark : '#d97706'} titulo="🎯 Meta LUF" valor={`${Math.round(k.luf)}% / ${metas.lufObjetivo}%`} detalle={cumpleMeta ? 'Cumple' : `Faltan ${Math.round(metas.lufObjetivo - k.luf)} pts`} />
                {causas[0] && <CardResumen color={BASE.red} titulo="🔴 Dónde se pierde el tiempo" valor={causas[0].name} detalle={`${causas[0].value}% del TNC`} />}
                {best && <CardResumen color={BASE.greenDark} titulo="🏆 Mejor desempeño" valor={best.nombre} detalle={`LUF ${Math.round(best.lufPromedio)}%`} />}
              </div>
            </div>

            {/* Columna derecha: 3 barras por fecha (estilo del Excel) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <BarPorFecha titulo="Trabajo Productivo (TP)" data={porFecha} dk="tp" color={CB_COL.TP} sel={sel} onSel={toggleSel} />
              <BarPorFecha titulo="Trabajo Contributorio (TC)" data={porFecha} dk="tc" color={CB_COL.TC} sel={sel} onSel={toggleSel} />
              <BarPorFecha titulo="Trabajo No Contributorio (TNC)" data={porFecha} dk="tnc" color={CB_COL.TNC} sel={sel} onSel={toggleSel} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Barras por fecha con cross-filter (clic resalta/filtra esa fecha) ──
function BarPorFecha({ titulo, data, dk, color, sel, onSel }) {
  return (
    <div style={cardBox}>
      <p style={{ ...titBox, color }}>{titulo}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: BASE.muted }} />
          <YAxis tick={{ fontSize: 10, fill: BASE.muted }} unit="%" domain={[0, 'auto']} />
          <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: BASE.bg }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey={dk} radius={[6, 6, 0, 0]} cursor="pointer"
            onClick={(d) => d && d.fecha && onSel(d.fecha)}
            label={{ position: 'top', fontSize: 10, fontWeight: 800, fill: BASE.navy, formatter: (v) => `${v}%` }}>
            {data.map((e, i) => <Cell key={i} fill={sel && sel !== e.fecha ? `${color}44` : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CardResumen({ color, titulo, valor, detalle }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `5px solid ${color}`, borderRadius: 12, padding: '11px 14px', boxShadow: BASE.shadowSm }}>
      <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy }}>{titulo}</p>
      <p style={{ fontSize: 17, fontWeight: 900, color, marginTop: 2 }}>{valor}</p>
      {detalle && <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>{detalle}</p>}
    </div>
  );
}

// ── Metas de productividad (config) ──
function TabMetas({ metas, onGuardar }) {
  const [tpMin, setTpMin] = useState(metas.tpMin);
  const [tncMax, setTncMax] = useState(metas.tncMax);
  const [lufObjetivo, setLufObjetivo] = useState(metas.lufObjetivo);
  useEffect(() => { setTpMin(metas.tpMin); setTncMax(metas.tncMax); setLufObjetivo(metas.lufObjetivo); }, [metas]);
  const [ok, setOk] = useState(false);
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  return (
    <div style={{ ...cardBox, maxWidth: 520 }}>
      <p style={titBox}>Metas de productividad</p>
      <p style={{ fontSize: 11.5, color: BASE.muted, marginBottom: 14 }}>Definen el semáforo y la línea de meta del tablero. Aplican a toda la obra.</p>
      {[
        { l: 'TP mínimo (%)', v: tpMin, set: setTpMin, hint: 'Estándar: 60%' },
        { l: 'TNC máximo (%)', v: tncMax, set: setTncMax, hint: 'Estándar: ≤ 15%' },
        { l: 'LUF objetivo (%)', v: lufObjetivo, set: setLufObjetivo, hint: 'Bueno ≥ 65%' },
      ].map((f) => (
        <div key={f.l} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: BASE.navy, display: 'block', marginBottom: 4 }}>{f.l}</label>
          <input type="number" value={f.v} onChange={(e) => f.set(e.target.value)} min={0} max={100}
            style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 14, fontWeight: 800, color: BASE.navy }} />
          <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 10 }}>{f.hint}</span>
        </div>
      ))}
      <button onClick={() => { onGuardar({ tpMin: num(tpMin, 60), tncMax: num(tncMax, 15), lufObjetivo: num(lufObjetivo, 65) }); setOk(true); setTimeout(() => setOk(false), 2500); }}
        style={{ marginTop: 6, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', fontSize: 13, fontWeight: 900 }}>
        {ok ? '✓ Metas guardadas' : 'Guardar metas'}
      </button>
    </div>
  );
}
