// src/views/CartaBalanceAnalisis.jsx
// Tablero INTERACTIVO estilo Power BI de Carta Balance.
// Cross-filter multidimensional: cada gráfico (fecha, trabajador, categoría,
// código) es a la vez FILTRO y reacciona a los demás. Chips de filtros activos.
// Menos pestañas, todo enlazado — para gerencia.

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
import { clasificarLUF } from '../utils/cartaBalanceAnalytics';
import { METAS_CB_DEFAULT } from '../utils/cartaBalanceProductividad';

const fmtCorta = (f) => (f && f.length >= 10) ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : (f || '—');
const cardBox = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: '14px 16px', boxShadow: BASE.shadowMd };
const titBox = { fontSize: 11, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 };
const CAT_NOMBRE = { TP: 'Productivo', TC: 'Contributorio', TNC: 'No contributorio' };

// KPIs (conteos→%) de un conjunto de observaciones {categoria}
function kpisDe(obs) {
  const n = obs.length;
  const tp = obs.filter((o) => o.categoria === 'TP').length;
  const tc = obs.filter((o) => o.categoria === 'TC').length;
  const tnc = obs.filter((o) => o.categoria === 'TNC').length;
  const pTP = n ? (tp / n) * 100 : 0, pTC = n ? (tc / n) * 100 : 0, pTNC = n ? (tnc / n) * 100 : 0;
  return { n, tp, tc, tnc, pTP, pTC, pTNC, luf: pTP + 0.5 * pTC };
}
// Composición por código dentro de una categoría → [{codigo,name,value%}]
function compPorCodigo(obs, categoria) {
  const g = {};
  obs.filter((o) => o.categoria === categoria).forEach((o) => {
    const key = o.codigo || '—';
    if (!g[key]) g[key] = { codigo: key, name: o.descripcion || key, c: 0 };
    g[key].c++;
  });
  const tot = Object.values(g).reduce((s, e) => s + e.c, 0);
  return Object.values(g).map((e) => ({ codigo: e.codigo, name: e.name, value: tot ? Math.round((e.c / tot) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
}

export default function CartaBalanceAnalisis() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [filtros, setFiltros] = useState({});   // { fecha, persona, categoria, codigo }
  const [texto, setTexto] = useState('');
  const [metas, setMetas] = useState(METAS_CB_DEFAULT);

  useEffect(() => {
    const q = query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc'));
    return onSnapshot(q, (s) => { setCartas(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
  }, []);
  useEffect(() => onSnapshot(doc(db, 'Configuracion', 'metas_cb'), (s) => {
    if (s.exists()) setMetas({ ...METAS_CB_DEFAULT, ...(s.data() || {}) });
  }, (e) => console.warn('[metas_cb]', e)), []);

  const setF = (key, val) => setFiltros((f) => ({ ...f, [key]: f[key] === val ? undefined : val }));
  const clearF = (key) => setFiltros((f) => { const n = { ...f }; delete n[key]; return n; });
  const clearAll = () => setFiltros({});

  // Observaciones aplanadas y enriquecidas (fecha + persona real + categoría + código).
  const obsAll = useMemo(() => {
    const out = [];
    cartas.forEach((c) => {
      if (texto && !(c.actividad || '').toLowerCase().includes(texto.toLowerCase())) return;
      const nameById = {}; (c.personas || []).forEach((p) => { nameById[p.id] = p.nombre || p.id; });
      (c.observaciones || []).forEach((o) => out.push({
        fecha: c.fecha, persona: nameById[o.personaId] || o.personaId,
        categoria: o.categoria, codigo: o.codigo, descripcion: o.descripcion || o.codigo,
      }));
    });
    return out;
  }, [cartas, texto]);

  // ¿pasa una observación los filtros, ignorando la dimensión `exc`?
  const pasa = useCallback((o, exc) =>
    (exc === 'fecha' || !filtros.fecha || o.fecha === filtros.fecha) &&
    (exc === 'persona' || !filtros.persona || o.persona === filtros.persona) &&
    (exc === 'categoria' || !filtros.categoria || o.categoria === filtros.categoria) &&
    (exc === 'codigo' || !filtros.codigo || o.codigo === filtros.codigo), [filtros]);

  // Conjuntos por dimensión (Power BI: cada gráfico ignora su propio filtro).
  const sets = useMemo(() => ({
    all: obsAll.filter((o) => pasa(o, null)),
    fecha: obsAll.filter((o) => pasa(o, 'fecha')),
    persona: obsAll.filter((o) => pasa(o, 'persona')),
    categoria: obsAll.filter((o) => pasa(o, 'categoria')),
    // Para composición por código: aplica fecha+persona, ignora categoria y código.
    fp: obsAll.filter((o) =>
      (!filtros.fecha || o.fecha === filtros.fecha) && (!filtros.persona || o.persona === filtros.persona)),
  }), [obsAll, pasa, filtros]);

  const k = useMemo(() => kpisDe(sets.all), [sets.all]);

  // Por fecha (tabla + barras)
  const porFecha = useMemo(() => {
    const g = {};
    sets.fecha.forEach((o) => { (g[o.fecha] = g[o.fecha] || []).push(o); });
    return Object.entries(g).map(([fecha, obs]) => {
      const kk = kpisDe(obs);
      return { fecha, label: fmtCorta(fecha), tp: Math.round(kk.pTP), tc: Math.round(kk.pTC), tnc: Math.round(kk.pTNC), luf: Math.round(kk.luf), n: kk.n };
    }).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }, [sets.fecha]);

  // Crew Balance por trabajador
  const crew = useMemo(() => {
    const g = {};
    sets.persona.forEach((o) => {
      const e = g[o.persona] || (g[o.persona] = { nombre: o.persona, tp: 0, tc: 0, tnc: 0, n: 0 });
      if (o.categoria === 'TP') e.tp++; else if (o.categoria === 'TC') e.tc++; else if (o.categoria === 'TNC') e.tnc++;
      e.n++;
    });
    return Object.values(g).map((e) => ({ ...e, luf: e.n ? (e.tp + 0.5 * e.tc) / e.n * 100 : 0 })).sort((a, b) => b.luf - a.luf);
  }, [sets.persona]);

  // Donut TP/TC/TNC (categoría)
  const donut = useMemo(() => {
    const kk = kpisDe(sets.categoria);
    return [
      { cat: 'TP', name: 'Productivo', value: Math.round(kk.pTP), color: CB_COL.TP },
      { cat: 'TC', name: 'Contributorio', value: Math.round(kk.pTC), color: CB_COL.TC },
      { cat: 'TNC', name: 'No contributorio', value: Math.round(kk.pTNC), color: CB_COL.TNC },
    ];
  }, [sets.categoria]);

  const compTP = useMemo(() => compPorCodigo(sets.fp, 'TP'), [sets.fp]);
  const compTC = useMemo(() => compPorCodigo(sets.fp, 'TC'), [sets.fp]);
  const compTNC = useMemo(() => compPorCodigo(sets.fp, 'TNC'), [sets.fp]);

  const exportarExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porFecha.map((f) => ({ Fecha: f.fecha, 'TP %': f.tp, 'TC %': f.tc, 'TNC %': f.tnc, 'LUF %': f.luf, Obs: f.n }))), 'Por fecha');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(crew.map((c) => ({ Trabajador: c.nombre, 'LUF %': Math.round(c.luf), Obs: c.n }))), 'Por trabajador');
      XLSX.writeFile(wb, `CartaBalance_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error('[exportarExcel]', e); }
  }, [porFecha, crew]);

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
  const best = crew[0];
  const deltaLuf = porFecha.length >= 2 ? porFecha[porFecha.length - 1].luf - porFecha[porFecha.length - 2].luf : null;
  const causaTop = compTNC[0];
  // Chips de filtros activos
  const chips = [];
  if (filtros.fecha) chips.push(['fecha', `📅 ${fmtCorta(filtros.fecha)}`]);
  if (filtros.persona) chips.push(['persona', `👷 ${filtros.persona}`]);
  if (filtros.categoria) chips.push(['categoria', `🔵 ${CAT_NOMBRE[filtros.categoria]}`]);
  if (filtros.codigo) chips.push(['codigo', `🏷️ ${filtros.codigo}`]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      {/* Tabs + filtro texto + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: 5 }}>
          {[['resumen', '📊 Resumen'], ['metas', '🎯 Metas']].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, background: tab === id ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : 'transparent', color: tab === id ? '#fff' : BASE.muted }}>{l}</button>
          ))}
        </div>
        {tab === 'resumen' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Filtrar actividad…" style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BASE.border}`, fontSize: 12, color: BASE.navy }} />
            <button onClick={exportarExcel} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>⬇ Excel</button>
          </div>
        )}
      </div>

      {tab === 'metas' && <TabMetas metas={metas} onGuardar={guardarMetas} />}

      {tab === 'resumen' && (
        <>
          {/* Barra de FILTROS activos (Power BI) */}
          {chips.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: BASE.goldSoft, border: `1px dashed ${BASE.gold}`, borderRadius: 10, padding: '8px 12px' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BASE.goldDark }}>FILTROS:</span>
              {chips.map(([key, label]) => (
                <button key={key} onClick={() => clearF(key)} style={{ fontSize: 11.5, fontWeight: 800, color: BASE.navy, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 999, padding: '4px 10px', cursor: 'pointer' }}>{label} ✕</button>
              ))}
              <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 800, color: BASE.red, background: 'transparent', border: 'none', cursor: 'pointer' }}>Limpiar todo</button>
            </div>
          )}

          {/* HERO */}
          <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 16, padding: '18px 22px', boxShadow: BASE.shadowMd, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: BASE.gold }}>PRODUCTIVIDAD {chips.length ? '· FILTRADO' : '· GLOBAL'}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                <span style={{ fontSize: 50, fontWeight: 900, lineHeight: 1 }}>{Math.round(k.luf)}%</span>
                <span style={{ fontSize: 13, fontWeight: 900, padding: '5px 12px', borderRadius: 999, background: cumpleMeta ? 'rgba(16,185,129,0.22)' : 'rgba(229,168,47,0.22)', border: `1px solid ${cumpleMeta ? '#10B981' : BASE.gold}` }}>{cls.emoji} {cls.label}</span>
                {!chips.length && deltaLuf != null && (
                  <span style={{ fontSize: 12, fontWeight: 900, color: deltaLuf >= 0 ? '#86efac' : '#fca5a5' }}>{deltaLuf >= 0 ? '▲ +' : '▼ '}{Math.round(deltaLuf)} pts vs anterior</span>
                )}
              </div>
              <p style={{ fontSize: 11.5, opacity: 0.85, marginTop: 6 }}>LUF · meta {metas.lufObjetivo}% · clic en cualquier gráfico para filtrar</p>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {[['TP', `${Math.round(k.pTP)}%`], ['TC', `${Math.round(k.pTC)}%`], ['TNC', `${Math.round(k.pTNC)}%`], ['Obs.', k.n]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 900 }}>{v}</p>
                  <p style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fila 1: tabla por fecha + dona clicable + barras por fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
            {/* Tabla por fecha */}
            <div style={cardBox}>
              <p style={titBox}>Por fecha <span style={{ textTransform: 'none', fontWeight: 600 }}>· clic para filtrar</span></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ background: BASE.navySoft, color: BASE.navy }}>{['Fecha', 'TP', 'TC', 'TNC', 'LUF'].map((h, i) => <th key={h} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10.5, fontWeight: 900 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {porFecha.map((f) => (
                      <tr key={f.fecha} onClick={() => setF('fecha', f.fecha)} style={{ cursor: 'pointer', borderTop: `1px solid ${BASE.border}`, background: filtros.fecha === f.fecha ? BASE.gold + '22' : 'transparent' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: BASE.navy }}>{f.fecha.slice(8, 10)}/{f.fecha.slice(5, 7)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: CB_COL.TP, fontWeight: 700 }}>{f.tp}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: CB_COL.TC, fontWeight: 700 }}>{f.tc}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: CB_COL.TNC, fontWeight: 700 }}>{f.tnc}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: BASE.navy }}>{f.luf}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dona clicable */}
            <div style={cardBox}>
              <p style={titBox}>Distribución del tiempo · clic para filtrar</p>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none" onClick={(d) => setF('categoria', d?.cat)} cursor="pointer">
                      {donut.map((d, i) => <Cell key={i} fill={d.color} opacity={filtros.categoria && filtros.categoria !== d.cat ? 0.35 : 1} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, textAlign: 'center', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <p style={{ fontSize: 26, fontWeight: 900, color: CB_COL.TP, lineHeight: 1 }}>{Math.round(k.pTP)}%</p>
                  <p style={{ fontSize: 9.5, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase' }}>Productivo</p>
                </div>
              </div>
            </div>

            {/* Claves */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CardResumen color={cumpleMeta ? BASE.greenDark : '#d97706'} titulo="🎯 Meta LUF" valor={`${Math.round(k.luf)}% / ${metas.lufObjetivo}%`} detalle={cumpleMeta ? 'Cumple' : `Faltan ${Math.round(metas.lufObjetivo - k.luf)} pts`} />
              {causaTop && <CardResumen color={BASE.red} titulo="🔴 Mayor pérdida (TNC)" valor={causaTop.name} detalle={`${causaTop.value}% del TNC`} />}
              {best && <CardResumen color={BASE.greenDark} titulo="🏆 Mejor desempeño" valor={best.nombre} detalle={`LUF ${Math.round(best.luf)}%`} />}
            </div>
          </div>

          {/* Fila 2: barras TP/TC/TNC por fecha (clicables) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
            <BarPorClave titulo="TP por fecha" data={porFecha} dk="tp" xk="label" idk="fecha" color={CB_COL.TP} activo={filtros.fecha} onSel={(v) => setF('fecha', v)} />
            <BarPorClave titulo="TC por fecha" data={porFecha} dk="tc" xk="label" idk="fecha" color={CB_COL.TC} activo={filtros.fecha} onSel={(v) => setF('fecha', v)} />
            <BarPorClave titulo="TNC por fecha" data={porFecha} dk="tnc" xk="label" idk="fecha" color={CB_COL.TNC} activo={filtros.fecha} onSel={(v) => setF('fecha', v)} />
          </div>

          {/* Fila 3: Crew Balance (clic = filtrar persona) */}
          {crew.length > 0 && (
            <div style={cardBox}>
              <p style={titBox}>Crew Balance · productividad por trabajador · clic para filtrar</p>
              <ResponsiveContainer width="100%" height={Math.max(150, crew.length * 38)}>
                <BarChart data={crew} layout="vertical" stackOffset="expand" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 10.5, fill: BASE.text }} />
                  <Tooltip formatter={(v, n, p) => [`${Math.round((v / (p.payload.n || 1)) * 100)}%`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tp" stackId="a" name="Productivo" fill={CB_COL.TP} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)} />
                  <Bar dataKey="tc" stackId="a" name="Contributorio" fill={CB_COL.TC} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)} />
                  <Bar dataKey="tnc" stackId="a" name="No contributorio" fill={CB_COL.TNC} radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Fila 4: composición TP / TC / TNC (clic = filtrar código) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
            <CompCard titulo="¿Qué es el Productivo?" data={compTP} color={CB_COL.TP} activo={filtros.codigo} onSel={(v) => setF('codigo', v)} />
            <CompCard titulo="¿En qué se va el Soporte?" data={compTC} color={CB_COL.TC} activo={filtros.codigo} onSel={(v) => setF('codigo', v)} />
            <CompCard titulo="Causas de pérdida (TNC)" data={compTNC} color={CB_COL.TNC} activo={filtros.codigo} onSel={(v) => setF('codigo', v)} />
          </div>
        </>
      )}
    </div>
  );
}

// Barras verticales clicables (por fecha)
function BarPorClave({ titulo, data, dk, xk, idk, color, activo, onSel }) {
  return (
    <div style={cardBox}>
      <p style={{ ...titBox, color }}>{titulo}</p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} vertical={false} />
          <XAxis dataKey={xk} tick={{ fontSize: 11, fill: BASE.muted }} />
          <YAxis tick={{ fontSize: 10, fill: BASE.muted }} unit="%" domain={[0, 'auto']} />
          <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: BASE.bg }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey={dk} radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => d && onSel(d[idk])}
            label={{ position: 'top', fontSize: 10, fontWeight: 800, fill: BASE.navy, formatter: (v) => `${v}%` }}>
            {data.map((e, i) => <Cell key={i} fill={activo && activo !== e[idk] ? `${color}44` : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Barras horizontales de composición por código (clic = filtrar código)
function CompCard({ titulo, data, color, activo, onSel }) {
  if (!data.length) return null;
  return (
    <div style={cardBox}>
      <p style={{ ...titBox, color }}>{titulo}</p>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 30)}>
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 34, left: 4, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: BASE.text }} />
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => d && onSel(d.codigo)}
            label={{ position: 'right', fontSize: 10, fontWeight: 800, fill: BASE.navy, formatter: (v) => `${v}%` }}>
            {data.map((e, i) => <Cell key={i} fill={activo && activo !== e.codigo ? `${color}44` : color} />)}
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

function TabMetas({ metas, onGuardar }) {
  const [tpMin, setTpMin] = useState(metas.tpMin);
  const [tncMax, setTncMax] = useState(metas.tncMax);
  const [lufObjetivo, setLufObjetivo] = useState(metas.lufObjetivo);
  useEffect(() => { setTpMin(metas.tpMin); setTncMax(metas.tncMax); setLufObjetivo(metas.lufObjetivo); }, [metas]);
  const [ok, setOk] = useState(false);
  const num = (v, d) => { const x = parseFloat(v); return isNaN(x) ? d : x; };
  return (
    <div style={{ ...cardBox, maxWidth: 520 }}>
      <p style={titBox}>Metas de productividad</p>
      <p style={{ fontSize: 11.5, color: BASE.muted, marginBottom: 14 }}>Definen el semáforo y la línea de meta del tablero.</p>
      {[
        { l: 'TP mínimo (%)', v: tpMin, set: setTpMin, hint: 'Estándar: 60%' },
        { l: 'TNC máximo (%)', v: tncMax, set: setTncMax, hint: 'Estándar: ≤ 15%' },
        { l: 'LUF objetivo (%)', v: lufObjetivo, set: setLufObjetivo, hint: 'Bueno ≥ 65%' },
      ].map((f) => (
        <div key={f.l} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: BASE.navy, display: 'block', marginBottom: 4 }}>{f.l}</label>
          <input type="number" value={f.v} onChange={(e) => f.set(e.target.value)} min={0} max={100} style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 14, fontWeight: 800, color: BASE.navy }} />
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
