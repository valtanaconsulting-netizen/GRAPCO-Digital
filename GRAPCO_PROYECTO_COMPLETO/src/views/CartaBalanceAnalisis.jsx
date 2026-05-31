// src/views/CartaBalanceAnalisis.jsx
// Tablero gerencial ÚNICO e interactivo (Power BI) de Carta Balance.
// Barra de control: período (rango de fechas), actividad, trabajador (buscar),
// y conclusiones on/off. Cross-filter en todos los gráficos. Calificación,
// principales TP/TNC, y recomendación de cuadrilla por actividad.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Legend,
} from 'recharts';
import { db } from '../firebaseConfig';
import { BASE, CB_COL } from '../utils/styles';
import EmptyState from '../components/EmptyState';
import { clasificarLUF, optimizarCuadrilla } from '../utils/cartaBalanceAnalytics';
import { METAS_CB_DEFAULT } from '../utils/cartaBalanceProductividad';

const fmtCorta = (f) => (f && f.length >= 10) ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : (f || '—');
const cardBox = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: '14px 16px', boxShadow: BASE.shadowMd };
const titBox = { fontSize: 11, fontWeight: 900, color: BASE.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 };
const CAT_NOMBRE = { TP: 'Productivo', TC: 'Contributorio', TNC: 'No contributorio' };
const inpTop = { padding: '7px 10px', borderRadius: 8, border: `1px solid ${BASE.border}`, fontSize: 12, color: BASE.navy, background: BASE.white };

function kpisDe(obs) {
  const n = obs.length;
  const tp = obs.filter((o) => o.categoria === 'TP').length;
  const tc = obs.filter((o) => o.categoria === 'TC').length;
  const tnc = obs.filter((o) => o.categoria === 'TNC').length;
  const pTP = n ? tp / n * 100 : 0, pTC = n ? tc / n * 100 : 0, pTNC = n ? tnc / n * 100 : 0;
  return { n, tp, tc, tnc, pTP, pTC, pTNC, luf: pTP + 0.5 * pTC };
}
function compPorCodigo(obs, categoria) {
  const g = {};
  obs.filter((o) => o.categoria === categoria).forEach((o) => {
    const key = o.codigo || '—';
    if (!g[key]) g[key] = { codigo: key, name: o.descripcion || key, c: 0 };
    g[key].c++;
  });
  const tot = Object.values(g).reduce((s, e) => s + e.c, 0);
  return Object.values(g).map((e) => ({ codigo: e.codigo, name: e.name, value: tot ? Math.round(e.c / tot * 100) : 0 })).sort((a, b) => b.value - a.value);
}
const gradeDe = (luf) => luf >= 70 ? { g: 'A', l: 'Excelente', c: BASE.greenDark } : luf >= 60 ? { g: 'B', l: 'Bueno', c: '#65a30d' } : luf >= 50 ? { g: 'C', l: 'Aceptable', c: '#d97706' } : luf >= 40 ? { g: 'D', l: 'Bajo', c: '#ea580c' } : { g: 'E', l: 'Crítico', c: BASE.red };

export default function CartaBalanceAnalisis() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [metas, setMetas] = useState(METAS_CB_DEFAULT);
  // Filtros superiores (globales)
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [selAct, setSelAct] = useState('');
  const [verConclu, setVerConclu] = useState(false);
  // Filtros de cross-filter (clic en gráficos)
  const [filtros, setFiltros] = useState({});   // { fecha, persona, categoria, codigo }
  // Recomendación
  const [recoN, setRecoN] = useState(4);

  useEffect(() => {
    const q = query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc'));
    return onSnapshot(q, (s) => { setCartas(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, (e) => { console.error(e); setLoading(false); });
  }, []);
  useEffect(() => onSnapshot(doc(db, 'Configuracion', 'metas_cb'), (s) => { if (s.exists()) setMetas({ ...METAS_CB_DEFAULT, ...(s.data() || {}) }); }, (e) => console.warn(e)), []);

  const setF = (key, val) => setFiltros((f) => ({ ...f, [key]: f[key] === val ? undefined : val }));
  const clearF = (key) => setFiltros((f) => { const n = { ...f }; delete n[key]; return n; });
  const clearAll = () => { setFiltros({}); setDesde(''); setHasta(''); setSelAct(''); };

  const actividades = useMemo(() => [...new Set(cartas.map((c) => c.actividad).filter(Boolean))].sort(), [cartas]);

  // Observaciones aplanadas (con contexto)
  const obsAll = useMemo(() => {
    const out = [];
    cartas.forEach((c) => {
      if (desde && c.fecha < desde) return;
      if (hasta && c.fecha > hasta) return;
      if (selAct && c.actividad !== selAct) return;
      const nameById = {}; (c.personas || []).forEach((p) => { nameById[p.id] = p.nombre || p.id; });
      (c.observaciones || []).forEach((o) => out.push({ fecha: c.fecha, persona: nameById[o.personaId] || o.personaId, categoria: o.categoria, codigo: o.codigo, descripcion: o.descripcion || o.codigo }));
    });
    return out;
  }, [cartas, desde, hasta, selAct]);

  const trabajadores = useMemo(() => [...new Set(obsAll.map((o) => o.persona))].sort(), [obsAll]);

  const pasa = useCallback((o, exc) =>
    (exc === 'fecha' || !filtros.fecha || o.fecha === filtros.fecha) &&
    (exc === 'persona' || !filtros.persona || o.persona === filtros.persona) &&
    (exc === 'categoria' || !filtros.categoria || o.categoria === filtros.categoria) &&
    (exc === 'codigo' || !filtros.codigo || o.codigo === filtros.codigo), [filtros]);

  const sets = useMemo(() => ({
    all: obsAll.filter((o) => pasa(o, null)),
    fecha: obsAll.filter((o) => pasa(o, 'fecha')),
    persona: obsAll.filter((o) => pasa(o, 'persona')),
    categoria: obsAll.filter((o) => pasa(o, 'categoria')),
    fp: obsAll.filter((o) => (!filtros.fecha || o.fecha === filtros.fecha) && (!filtros.persona || o.persona === filtros.persona)),
  }), [obsAll, pasa, filtros]);

  const k = useMemo(() => kpisDe(sets.all), [sets.all]);
  const porFecha = useMemo(() => {
    const g = {}; sets.fecha.forEach((o) => { (g[o.fecha] = g[o.fecha] || []).push(o); });
    return Object.entries(g).map(([fecha, obs]) => { const kk = kpisDe(obs); return { fecha, label: fmtCorta(fecha), tp: Math.round(kk.pTP), tc: Math.round(kk.pTC), tnc: Math.round(kk.pTNC), luf: Math.round(kk.luf), n: kk.n }; }).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }, [sets.fecha]);
  const crew = useMemo(() => {
    const g = {}; sets.persona.forEach((o) => { const e = g[o.persona] || (g[o.persona] = { nombre: o.persona, tp: 0, tc: 0, tnc: 0, n: 0 }); if (o.categoria === 'TP') e.tp++; else if (o.categoria === 'TC') e.tc++; else if (o.categoria === 'TNC') e.tnc++; e.n++; });
    return Object.values(g).map((e) => ({ ...e, luf: e.n ? (e.tp + 0.5 * e.tc) / e.n * 100 : 0 })).sort((a, b) => b.luf - a.luf);
  }, [sets.persona]);
  const donut = useMemo(() => { const kk = kpisDe(sets.categoria); return [{ cat: 'TP', name: 'Productivo', value: Math.round(kk.pTP), color: CB_COL.TP }, { cat: 'TC', name: 'Contributorio', value: Math.round(kk.pTC), color: CB_COL.TC }, { cat: 'TNC', name: 'No contributorio', value: Math.round(kk.pTNC), color: CB_COL.TNC }]; }, [sets.categoria]);
  const compTP = useMemo(() => compPorCodigo(sets.fp, 'TP'), [sets.fp]);
  const compTC = useMemo(() => compPorCodigo(sets.fp, 'TC'), [sets.fp]);
  const compTNC = useMemo(() => compPorCodigo(sets.fp, 'TNC'), [sets.fp]);

  // Recomendación de cuadrilla (optimizador) por actividad
  const reco = useMemo(() => {
    const act = selAct || actividades[0];
    if (!act) return null;
    try { return { act, ...optimizarCuadrilla(act, recoN, cartas, []) }; } catch (e) { console.warn('[reco]', e); return null; }
  }, [selAct, actividades, recoN, cartas]);

  // Conclusiones de las cartas visibles (según período/actividad/fecha)
  const cartasConclu = useMemo(() => cartas.filter((c) => {
    if (desde && c.fecha < desde) return false;
    if (hasta && c.fecha > hasta) return false;
    if (selAct && c.actividad !== selAct) return false;
    if (filtros.fecha && c.fecha !== filtros.fecha) return false;
    return (c.conclusiones || '').trim().length > 0;
  }), [cartas, desde, hasta, selAct, filtros.fecha]);

  const exportarExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porFecha.map((f) => ({ Fecha: f.fecha, 'TP %': f.tp, 'TC %': f.tc, 'TNC %': f.tnc, 'LUF %': f.luf, Obs: f.n }))), 'Por fecha');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(crew.map((c) => ({ Trabajador: c.nombre, 'LUF %': Math.round(c.luf), Obs: c.n }))), 'Por trabajador');
      XLSX.writeFile(wb, `CartaBalance_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error(e); }
  }, [porFecha, crew]);
  const guardarMetas = useCallback(async (nuevas) => { setMetas(nuevas); try { await setDoc(doc(db, 'Configuracion', 'metas_cb'), { ...nuevas, actualizadoEn: serverTimestamp() }, { merge: true }); } catch (e) { console.warn(e); } }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando…</div>;
  if (cartas.length === 0) return <EmptyState icono="CB" titulo="Sin Cartas Balance" descripcion="Carga una carta en 📥 Importar." />;

  const cls = clasificarLUF(k.luf);
  const grade = gradeDe(k.luf);
  const cumpleMeta = k.luf >= metas.lufObjetivo;
  const best = crew[0];
  const chips = [];
  if (filtros.fecha) chips.push(['fecha', `📅 ${fmtCorta(filtros.fecha)}`]);
  if (filtros.persona) chips.push(['persona', `👷 ${filtros.persona}`]);
  if (filtros.categoria) chips.push(['categoria', `🔵 ${CAT_NOMBRE[filtros.categoria]}`]);
  if (filtros.codigo) chips.push(['codigo', `🏷️ ${filtros.codigo}`]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: 6, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: 5, alignSelf: 'flex-start' }}>
        {[['resumen', '📊 Tablero'], ['metas', '🎯 Metas']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, background: tab === id ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : 'transparent', color: tab === id ? '#fff' : BASE.muted }}>{l}</button>
        ))}
      </div>

      {tab === 'metas' && <TabMetas metas={metas} onGuardar={guardarMetas} />}

      {tab === 'resumen' && (
        <div id="print-area" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Encabezado solo visible en el PDF impreso */}
          <div className="solo-print" style={{ display: 'none' }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: BASE.navy }}>GRAPCO S.A.C. · Resumen Carta Balance</p>
          </div>
          {/* ── BARRA DE CONTROL ── */}
          <div className="no-print" style={{ ...cardBox, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BASE.muted }}>📅 PERÍODO</span>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inpTop} title="Desde" />
              <span style={{ color: BASE.muted }}>–</span>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inpTop} title="Hasta" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BASE.muted }}>🏗️ ACTIVIDAD</span>
              <select value={selAct} onChange={(e) => setSelAct(e.target.value)} style={{ ...inpTop, minWidth: 170 }}>
                <option value="">Todas</option>
                {actividades.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BASE.muted }}>👷 TRABAJADOR</span>
              <input list="lista-trab" value={filtros.persona || ''} onChange={(e) => setFiltros((f) => ({ ...f, persona: e.target.value || undefined }))} placeholder="Todos / buscar…" style={{ ...inpTop, minWidth: 180 }} />
              <datalist id="lista-trab">{trabajadores.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <button onClick={() => setVerConclu((v) => !v)} style={{ ...inpTop, cursor: 'pointer', fontWeight: 800, background: verConclu ? BASE.navy : BASE.white, color: verConclu ? '#fff' : BASE.navy, border: `1px solid ${verConclu ? BASE.navy : BASE.border}` }}>📝 Conclusiones: {verConclu ? 'ON' : 'OFF'}</button>
            <button onClick={exportarExcel} style={{ ...inpTop, cursor: 'pointer', fontWeight: 900, background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none' }}>⬇ Excel</button>
            <button onClick={() => window.print()} style={{ ...inpTop, cursor: 'pointer', fontWeight: 900, background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none' }}>🖨️ PDF</button>
            {(chips.length > 0 || desde || hasta || selAct) && (
              <button onClick={clearAll} style={{ ...inpTop, cursor: 'pointer', fontWeight: 800, color: BASE.red, border: `1px solid ${BASE.red}55` }}>Limpiar todo</button>
            )}
          </div>

          {/* Chips de cross-filter activos */}
          {chips.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BASE.goldDark }}>FILTRO ACTIVO:</span>
              {chips.map(([key, label]) => <button key={key} onClick={() => clearF(key)} style={{ fontSize: 11.5, fontWeight: 800, color: BASE.navy, background: BASE.goldSoft, border: `1px solid ${BASE.gold}77`, borderRadius: 999, padding: '4px 10px', cursor: 'pointer' }}>{label} ✕</button>)}
            </div>
          )}

          {/* HERO + CALIFICACIÓN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
            <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: BASE.shadowMd, gridColumn: 'span 2', minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.6, color: BASE.gold }}>PRODUCTIVIDAD {chips.length || selAct || desde ? '· FILTRADO' : '· GLOBAL'}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{Math.round(k.luf)}%</span>
                <span style={{ fontSize: 13, fontWeight: 900, padding: '5px 12px', borderRadius: 999, background: cumpleMeta ? 'rgba(16,185,129,0.22)' : 'rgba(229,168,47,0.22)', border: `1px solid ${cumpleMeta ? '#10B981' : BASE.gold}` }}>{cls.emoji} {cls.label}</span>
              </div>
              <p style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>
                TP {Math.round(k.pTP)}% · TC {Math.round(k.pTC)}% · TNC {Math.round(k.pTNC)}% · {k.n} obs · meta {metas.lufObjetivo}%
              </p>
            </div>
            {/* Calificación / score */}
            <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={titBox}>Calificación</p>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: grade.c + '18', border: `3px solid ${grade.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: grade.c }}>{grade.g}</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 900, color: grade.c, marginTop: 6 }}>{grade.l}</p>
            </div>
          </div>

          {/* Fila: dona + principales TP/TNC + mejor */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
            <div style={cardBox}>
              <p style={titBox}>Distribución · clic para filtrar</p>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={2} stroke="none" onClick={(d) => setF('categoria', d?.cat)} cursor="pointer">
                      {donut.map((d, i) => <Cell key={i} fill={d.color} opacity={filtros.categoria && filtros.categoria !== d.cat ? 0.35 : 1} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '37%', left: 0, right: 0, textAlign: 'center', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: CB_COL.TP, lineHeight: 1 }}>{Math.round(k.pTP)}%</p>
                  <p style={{ fontSize: 9, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase' }}>Productivo</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {compTP[0] && <CardResumen color={CB_COL.TP} titulo="🟢 Principal Productivo" valor={compTP[0].name} detalle={`${compTP[0].value}% del TP`} />}
              {compTNC[0] && <CardResumen color={CB_COL.TNC} titulo="🔴 Principal pérdida (TNC)" valor={compTNC[0].name} detalle={`${compTNC[0].value}% del TNC`} />}
              {best && <CardResumen color={BASE.greenDark} titulo="🏆 Mejor desempeño" valor={best.nombre} detalle={`LUF ${Math.round(best.luf)}%`} />}
            </div>
            {/* barras por fecha apiladas en una sola card compacta */}
            <div style={cardBox}>
              <p style={titBox}>LUF por fecha · clic para filtrar</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porFecha} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: BASE.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: BASE.muted }} unit="%" domain={[0, 'auto']} />
                  <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: BASE.bg }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="luf" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => d && setF('fecha', d.fecha)} label={{ position: 'top', fontSize: 10, fontWeight: 800, fill: BASE.navy, formatter: (v) => `${v}%` }}>
                    {porFecha.map((e, i) => <Cell key={i} fill={filtros.fecha && filtros.fecha !== e.fecha ? `${BASE.navy}44` : BASE.navy} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Crew Balance */}
          {crew.length > 0 && (
            <div style={cardBox}>
              <p style={titBox}>Crew Balance · clic en un trabajador para enfocarlo</p>
              <ResponsiveContainer width="100%" height={Math.max(140, crew.length * 34)}>
                <BarChart data={crew} layout="vertical" stackOffset="expand" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 10.5, fill: BASE.text }} />
                  <Tooltip formatter={(v, n, p) => [`${Math.round(v / (p.payload.n || 1) * 100)}%`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tp" stackId="a" name="Productivo" fill={CB_COL.TP} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)} />
                  <Bar dataKey="tc" stackId="a" name="Contributorio" fill={CB_COL.TC} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)} />
                  <Bar dataKey="tnc" stackId="a" name="No contributorio" fill={CB_COL.TNC} radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Composiciones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
            <CompCard titulo="¿Qué es el Productivo?" data={compTP} color={CB_COL.TP} activo={filtros.codigo} onSel={(v) => setF('codigo', v)} />
            <CompCard titulo="¿En qué se va el Soporte (TC)?" data={compTC} color={CB_COL.TC} activo={filtros.codigo} onSel={(v) => setF('codigo', v)} />
            <CompCard titulo="Causas de pérdida (TNC)" data={compTNC} color={CB_COL.TNC} activo={filtros.codigo} onSel={(v) => setF('codigo', v)} />
          </div>

          {/* Recomendación de cuadrilla */}
          <div style={{ ...cardBox, borderLeft: `5px solid ${BASE.gold}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <p style={{ ...titBox, marginBottom: 0 }}>🤖 Recomendación de cuadrilla</p>
              <span style={{ fontSize: 12, color: BASE.muted }}>para <b style={{ color: BASE.navy }}>{reco?.act || '—'}</b> con</span>
              <input type="number" min={1} max={12} value={recoN} onChange={(e) => setRecoN(parseInt(e.target.value, 10) || 1)} style={{ ...inpTop, width: 60 }} />
              <span style={{ fontSize: 12, color: BASE.muted }}>personas {selAct ? '' : '(elige una actividad arriba para más precisión)'}</span>
            </div>
            {reco && reco.recomendados && reco.recomendados.length > 0 ? (
              <>
                <p style={{ fontSize: 12.5, color: BASE.text, marginBottom: 10 }}>{reco.justificacion}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {reco.recomendados.map((r, i) => (
                    <div key={i} style={{ background: BASE.bg, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: '8px 12px', minWidth: 150 }}>
                      <p style={{ fontSize: 9.5, fontWeight: 900, color: BASE.gold, textTransform: 'uppercase' }}>{r.rol || `#${i + 1}`}</p>
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: BASE.navy }}>{r.nombre}</p>
                      <p style={{ fontSize: 11, color: BASE.greenDark, fontWeight: 800 }}>LUF {Math.round(r.luf)}%</p>
                    </div>
                  ))}
                </div>
                {reco.advertencias?.length > 0 && <p style={{ fontSize: 10.5, color: '#d97706', marginTop: 8, fontStyle: 'italic' }}>⚠️ {reco.advertencias[0]}</p>}
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: BASE.muted }}>{reco?.justificacion || 'Carga cartas de esta actividad para recomendar la cuadrilla.'}</p>
            )}
          </div>

          {/* Conclusiones (on/off) */}
          {verConclu && (
            <div style={cardBox}>
              <p style={titBox}>📝 Conclusiones {filtros.fecha ? `· ${fmtCorta(filtros.fecha)}` : selAct ? `· ${selAct}` : ''}</p>
              {cartasConclu.length === 0 ? (
                <p style={{ fontSize: 12, color: BASE.muted, fontStyle: 'italic' }}>No hay conclusiones registradas para esta selección. Puedes agregarlas al importar la carta.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cartasConclu.map((c) => (
                    <div key={c.id} style={{ borderLeft: `4px solid ${BASE.gold}`, background: BASE.bgSoft, borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontSize: 11.5, fontWeight: 900, color: BASE.navy }}>{c.fecha} · {c.actividad}</p>
                      <p style={{ fontSize: 12, color: BASE.text, lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.conclusiones}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompCard({ titulo, data, color, activo, onSel }) {
  if (!data.length) return null;
  return (
    <div style={cardBox}>
      <p style={{ ...titBox, color }}>{titulo}</p>
      <ResponsiveContainer width="100%" height={Math.max(110, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 34, left: 4, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: BASE.text }} />
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => d && onSel(d.codigo)} label={{ position: 'right', fontSize: 10, fontWeight: 800, fill: BASE.navy, formatter: (v) => `${v}%` }}>
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
      <p style={{ fontSize: 16, fontWeight: 900, color, marginTop: 2 }}>{valor}</p>
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
        {ok ? '✓ Guardado' : 'Guardar metas'}
      </button>
    </div>
  );
}
