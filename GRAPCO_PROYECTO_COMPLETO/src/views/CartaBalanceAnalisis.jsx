// src/views/CartaBalanceAnalisis.jsx
// Tablero gerencial de UNA SOLA PANTALLA (sin scroll) estilo Power BI.
// Enfoque: SOLO TP / TC / TNC (sin LUF). Cross-filter en todos los gráficos.
// Clasificación por CARGO (Capataz/Operario/Oficial/Ayudante). Recomendación y
// Conclusiones como paneles emergentes.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, LabelList,
} from 'recharts';
import { db } from '../firebaseConfig';
import { BASE, CB_COL } from '../utils/styles';
import EmptyState from '../components/EmptyState';
import { optimizarCuadrilla } from '../utils/cartaBalanceAnalytics';
import { METAS_CB_DEFAULT } from '../utils/cartaBalanceProductividad';
import { partidaDe } from '../data/partidasCartaBalance';
import { obtenerSemana } from '../utils/helpers';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';

const fmtCorta = (f) => (f && f.length >= 10) ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : (f || '—');
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const semanaProyecto = (fechaStr) => obtenerSemana(fechaStr, FECHA_INICIO_PROYECTO);
const diaNombre = (f) => DOW[new Date(`${f}T00:00:00`).getDay()];
const titleCase = (s) => String(s || '').toLowerCase().split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const partesNombre = (full) => {
  const s = String(full || '');
  if (s.includes(',')) { const [a, n] = s.split(','); return { nom: titleCase((n || '').trim().split(/\s+/)[0] || ''), ape: titleCase(a.trim().split(/\s+/)[0] || '') }; }
  const t = s.split(/\s+/); return { nom: titleCase(t[0] || ''), ape: titleCase(t[1] || '') };
};
const nombreCorto = (full) => { const { nom, ape } = partesNombre(full); return `${nom}${ape ? ` ${ape}` : ''}`.trim() || '—'; };
const corta = (s, n = 10) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ── Cargos ── normaliza códigos (CAP/OP/OFI/AY) y nombres a etiqueta + color ──
const CARGO_LABEL = { CAP: 'Capataz', OP: 'Operario', OF: 'Oficial', OFI: 'Oficial', AY: 'Ayudante', PE: 'Ayudante' };
const CARGO_ABBR = { Capataz: 'CAP', Operario: 'OP', Oficial: 'OFI', Ayudante: 'AY', 'Sin cargo': '—' };
const CARGO_COLOR = { Capataz: '#7c3aed', Operario: '#0ea5e9', Oficial: '#16a34a', Ayudante: '#f59e0b', 'Sin cargo': '#94a3b8' };
const CARGO_ORDEN = ['Capataz', 'Operario', 'Oficial', 'Ayudante', 'Sin cargo'];
const cargoNorm = (c) => {
  const s = String(c || '').trim();
  if (CARGO_LABEL[s]) return CARGO_LABEL[s];
  if (CARGO_ORDEN.includes(s)) return s;
  return s || 'Sin cargo';
};

const titBox = { fontSize: 10, fontWeight: 800, color: BASE.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 };
const chip = () => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: BASE.muted });
const dot = (c) => ({ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' });
const CAT_NOMBRE = { TP: 'Productivo', TC: 'Contributorio', TNC: 'No contributorio' };
const inpTop = { padding: '6px 9px', borderRadius: 8, border: `1px solid ${BASE.border}`, fontSize: 12, color: BASE.navy, background: BASE.white };
const panel = (extra = {}) => ({ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, boxShadow: BASE.shadowSm, padding: '10px 12px', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden', ...extra });

function kpisDe(obs) {
  const n = obs.length;
  const tp = obs.filter((o) => o.categoria === 'TP').length;
  const tc = obs.filter((o) => o.categoria === 'TC').length;
  const tnc = obs.filter((o) => o.categoria === 'TNC').length;
  const pTP = n ? tp / n * 100 : 0, pTC = n ? tc / n * 100 : 0, pTNC = n ? tnc / n * 100 : 0;
  return { n, tp, tc, tnc, pTP, pTC, pTNC };
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
// % TP/TC/TNC de un grupo {tp,tc,tnc,n} → etiquetas numéricas sobre las barras.
const pctDe = (e) => { const n = e.n || 0; return { tpPct: n ? Math.round(e.tp / n * 100) : 0, tcPct: n ? Math.round(e.tc / n * 100) : 0, tncPct: n ? Math.round(e.tnc / n * 100) : 0 }; };
// Calificación basada en TP (Productividad), no en LUF.
const tpGrade = (tp) => tp >= 55 ? { g: 'A', l: 'Excelente', c: BASE.greenDark, emoji: '🟢' }
  : tp >= 45 ? { g: 'B', l: 'Bueno', c: '#65a30d', emoji: '🟢' }
  : tp >= 35 ? { g: 'C', l: 'Aceptable', c: '#d97706', emoji: '🟡' }
  : tp >= 25 ? { g: 'D', l: 'Bajo', c: '#ea580c', emoji: '🟠' }
  : { g: 'E', l: 'Crítico', c: BASE.red, emoji: '🔴' };

// Barra 100% apilada TP/TC/TNC (reutilizable para "por fecha" y "por cargo")
function BarApilada({ data, onClick, filtroVal }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} stackOffset="expand" margin={{ top: 14, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: BASE.text }} interval={0} />
        <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 9, fill: BASE.muted }} domain={[0, 1]} width={32} />
        <Tooltip formatter={(v, n, p) => [`${Math.round(v / (p.payload.n || 1) * 100)}% (${v})`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        {[['tp', 'Productivo', CB_COL.TP, 'tpPct'], ['tc', 'Contributorio', CB_COL.TC, 'tcPct'], ['tnc', 'No contributorio', CB_COL.TNC, 'tncPct']].map(([key, nm, col, pk], bi) => (
          <Bar key={key} dataKey={key} stackId="a" name={nm} radius={bi === 2 ? [4, 4, 0, 0] : undefined} cursor="pointer" onClick={(d) => d && onClick && onClick(d.key)}>
            {data.map((e, i) => <Cell key={i} fill={col} opacity={filtroVal && filtroVal !== e.key ? 0.3 : 1} />)}
            <LabelList dataKey={pk} position="center" fill="#fff" fontSize={9} fontWeight={800} formatter={(v) => (v >= 8 ? `${v}%` : '')} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function imprimirTablero() {
  const src = document.getElementById('print-area');
  if (!src) { window.print(); return; }
  const w = src.scrollWidth, h = src.scrollHeight;
  const pageW = 1055, pageH = 700;
  const scale = Math.min(pageW / w, pageH / h, 1);
  const portal = document.createElement('div');
  portal.id = 'print-portal';
  const header = document.createElement('div');
  header.className = 'print-portal-header';
  header.innerHTML = '<span>GRAPCO S.A.C. · Carta Balance — Tablero de Productividad</span><small>Gestión Integral de Obra</small>';
  const wrap = document.createElement('div');
  wrap.style.transform = `scale(${scale})`;
  wrap.style.transformOrigin = 'top left';
  wrap.style.width = `${w}px`; wrap.style.height = `${h}px`;
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.style.width = `${w}px`; clone.style.height = `${h}px`; clone.style.flex = 'none';
  wrap.appendChild(clone);
  portal.appendChild(header); portal.appendChild(wrap);
  document.body.appendChild(portal);
  document.body.classList.add('printing');
  let done = false;
  const cleanup = () => { if (done) return; done = true; document.body.classList.remove('printing'); portal.remove(); };
  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(() => window.print(), 60);
  setTimeout(cleanup, 60000);
}

export default function CartaBalanceAnalisis() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);
  const [metas, setMetas] = useState(METAS_CB_DEFAULT);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [selAct, setSelAct] = useState('');
  const [semanaSel, setSemanaSel] = useState('');
  const [diaSel, setDiaSel] = useState('');
  const [filtros, setFiltros] = useState({});
  const [recoN, setRecoN] = useState(4);
  const [panelAbierto, setPanelAbierto] = useState(null);
  const [vistaMedio, setVistaMedio] = useState('fecha'); // 'fecha' | 'cargo'

  useEffect(() => {
    const q = query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc'));
    return onSnapshot(q, (s) => { setCartas(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, (e) => { console.error(e); setLoading(false); });
  }, []);
  useEffect(() => onSnapshot(doc(db, 'Configuracion', 'metas_cb'), (s) => { if (s.exists()) setMetas({ ...METAS_CB_DEFAULT, ...(s.data() || {}) }); }, (e) => console.warn(e)), []);

  const setF = (key, val) => setFiltros((f) => ({ ...f, [key]: f[key] === val ? undefined : val }));
  const clearF = (key) => setFiltros((f) => { const n = { ...f }; delete n[key]; return n; });
  const clearAll = () => { setFiltros({}); setDesde(''); setHasta(''); setSelAct(''); setSemanaSel(''); setDiaSel(''); };

  const actividades = useMemo(() => [...new Set(cartas.map((c) => c.actividad).filter(Boolean))].sort(), [cartas]);
  const partidaSel = useMemo(() => (selAct ? partidaDe(selAct, cartas.find((c) => c.actividad === selAct)?.tipoActividad) : null), [selAct, cartas]);
  const semanas = useMemo(() => {
    const g = {};
    const fuente = selAct ? cartas.filter((c) => c.actividad === selAct) : cartas;
    [...new Set(fuente.map((c) => c.fecha).filter(Boolean))].forEach((f) => {
      const week = semanaProyecto(f);
      const key = `S${String(week).padStart(2, '0')}`;
      (g[key] = g[key] || { key, week, dates: [] }).dates.push(f);
    });
    return Object.values(g).map((s) => {
      const ds = s.dates.slice().sort();
      return { ...s, min: ds[0], max: ds[ds.length - 1], label: `Sem ${s.week} · ${fmtCorta(ds[0])}–${fmtCorta(ds[ds.length - 1])}` };
    }).sort((a, b) => (a.min < b.min ? 1 : -1));
  }, [cartas, selAct]);
  const diasSemana = useMemo(() => {
    const s = semanas.find((x) => x.key === semanaSel);
    return s ? s.dates.slice().sort().map((f) => ({ fecha: f, label: `${diaNombre(f)} ${fmtCorta(f)}` })) : [];
  }, [semanas, semanaSel]);
  // Si la semana elegida ya no existe (p. ej. al filtrar por una actividad sin esa
  // semana), la limpiamos para no mostrar un periodo vacío (0 observaciones).
  useEffect(() => {
    if (semanaSel && !semanas.some((s) => s.key === semanaSel)) {
      setSemanaSel(''); setDiaSel(''); setDesde(''); setHasta('');
    }
  }, [semanas, semanaSel]);
  const elegirSemana = (key) => {
    setSemanaSel(key); setDiaSel('');
    const s = semanas.find((x) => x.key === key);
    if (s) { setDesde(s.min); setHasta(s.max); } else { setDesde(''); setHasta(''); }
  };
  const elegirDia = (f) => {
    setDiaSel(f);
    if (f) { setDesde(f); setHasta(f); }
    else { const s = semanas.find((x) => x.key === semanaSel); if (s) { setDesde(s.min); setHasta(s.max); } }
  };
  const obsAll = useMemo(() => {
    const out = [];
    cartas.forEach((c) => {
      if (desde && c.fecha < desde) return;
      if (hasta && c.fecha > hasta) return;
      if (selAct && c.actividad !== selAct) return;
      const nameById = {}, cargoById = {};
      (c.personas || []).forEach((p) => { nameById[p.id] = p.nombre || p.id; cargoById[p.id] = cargoNorm(p.cargo); });
      (c.observaciones || []).forEach((o) => out.push({
        fecha: c.fecha,
        persona: nameById[o.personaId] || o.personaId,
        cargo: cargoById[o.personaId] || 'Sin cargo',
        categoria: o.categoria, codigo: o.codigo, descripcion: o.descripcion || o.codigo,
      }));
    });
    return out;
  }, [cartas, desde, hasta, selAct]);
  const trabajadores = useMemo(() => [...new Set(obsAll.map((o) => o.persona))].sort(), [obsAll]);
  const cargos = useMemo(() => [...new Set(obsAll.map((o) => o.cargo))].sort((a, b) => CARGO_ORDEN.indexOf(a) - CARGO_ORDEN.indexOf(b)), [obsAll]);

  const pasa = useCallback((o, exc) =>
    (exc === 'fecha' || !filtros.fecha || o.fecha === filtros.fecha) &&
    (exc === 'persona' || !filtros.persona || o.persona === filtros.persona) &&
    (exc === 'cargo' || !filtros.cargo || o.cargo === filtros.cargo) &&
    (exc === 'categoria' || !filtros.categoria || o.categoria === filtros.categoria) &&
    (exc === 'codigo' || !filtros.codigo || o.codigo === filtros.codigo), [filtros]);
  const sets = useMemo(() => ({
    all: obsAll.filter((o) => pasa(o, null)),
    fecha: obsAll.filter((o) => pasa(o, 'fecha')),
    persona: obsAll.filter((o) => pasa(o, 'persona')),
    cargo: obsAll.filter((o) => pasa(o, 'cargo')),
    categoria: obsAll.filter((o) => pasa(o, 'categoria')),
    fp: obsAll.filter((o) => (!filtros.fecha || o.fecha === filtros.fecha) && (!filtros.persona || o.persona === filtros.persona) && (!filtros.cargo || o.cargo === filtros.cargo)),
  }), [obsAll, pasa, filtros]);

  const k = useMemo(() => kpisDe(sets.all), [sets.all]);
  const agrupar = (obs, campo) => {
    const g = {};
    obs.forEach((o) => { const e = g[o[campo]] || (g[o[campo]] = { key: o[campo], tp: 0, tc: 0, tnc: 0, n: 0 }); if (o.categoria === 'TP') e.tp++; else if (o.categoria === 'TC') e.tc++; else if (o.categoria === 'TNC') e.tnc++; e.n++; });
    return g;
  };
  const porFecha = useMemo(() => Object.values(agrupar(sets.fecha, 'fecha')).map((e) => ({ ...e, ...pctDe(e), label: fmtCorta(e.key) })).sort((a, b) => (a.key < b.key ? -1 : 1)), [sets.fecha]);
  const porCargo = useMemo(() => Object.values(agrupar(sets.cargo, 'cargo')).map((e) => ({ ...e, ...pctDe(e), label: e.key })).sort((a, b) => CARGO_ORDEN.indexOf(a.key) - CARGO_ORDEN.indexOf(b.key)), [sets.cargo]);
  const crew = useMemo(() => {
    const g = {}; const cargoDe = {};
    sets.persona.forEach((o) => { const e = g[o.persona] || (g[o.persona] = { nombre: o.persona, tp: 0, tc: 0, tnc: 0, n: 0 }); if (o.categoria === 'TP') e.tp++; else if (o.categoria === 'TC') e.tc++; else if (o.categoria === 'TNC') e.tnc++; e.n++; cargoDe[o.persona] = o.cargo; });
    const ordC = (c) => { const i = CARGO_ORDEN.indexOf(c); return i === -1 ? 99 : i; };
    return Object.values(g).map((e) => ({ ...e, cargo: cargoDe[e.nombre] || 'Sin cargo', ptp: e.n ? e.tp / e.n * 100 : 0, ...pctDe(e) }))
      .sort((a, b) => ordC(a.cargo) - ordC(b.cargo) || b.ptp - a.ptp);
  }, [sets.persona]);
  const cargoDeTrab = useMemo(() => { const m = {}; crew.forEach((c) => { m[c.nombre] = c.cargo; }); return m; }, [crew]);
  const donut = useMemo(() => { const kk = kpisDe(sets.categoria); return [{ cat: 'TP', name: 'Productivo', value: Math.round(kk.pTP), color: CB_COL.TP }, { cat: 'TC', name: 'Contributorio', value: Math.round(kk.pTC), color: CB_COL.TC }, { cat: 'TNC', name: 'No contributorio', value: Math.round(kk.pTNC), color: CB_COL.TNC }]; }, [sets.categoria]);
  const compTP = useMemo(() => compPorCodigo(sets.fp, 'TP'), [sets.fp]);
  const compTNC = useMemo(() => compPorCodigo(sets.fp, 'TNC'), [sets.fp]);

  const reco = useMemo(() => {
    const act = selAct || actividades[0];
    if (!act) return null;
    try { return { act, ...optimizarCuadrilla(act, recoN, cartas, []) }; } catch (e) { console.warn(e); return null; }
  }, [selAct, actividades, recoN, cartas]);
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porFecha.map((f) => ({ Fecha: f.key, 'TP %': Math.round(f.tp / (f.n || 1) * 100), 'TC %': Math.round(f.tc / (f.n || 1) * 100), 'TNC %': Math.round(f.tnc / (f.n || 1) * 100), Obs: f.n }))), 'Por fecha');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porCargo.map((c) => ({ Cargo: c.key, 'TP %': Math.round(c.tp / (c.n || 1) * 100), 'TC %': Math.round(c.tc / (c.n || 1) * 100), 'TNC %': Math.round(c.tnc / (c.n || 1) * 100), Obs: c.n }))), 'Por cargo');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(crew.map((c) => ({ Trabajador: c.nombre, Cargo: c.cargo, 'TP %': Math.round(c.ptp), Obs: c.n }))), 'Por trabajador');
      XLSX.writeFile(wb, `CartaBalance_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error(e); }
  }, [porFecha, porCargo, crew]);
  const guardarMetas = useCallback(async (nuevas) => { setMetas((m) => ({ ...m, ...nuevas })); try { await setDoc(doc(db, 'Configuracion', 'metas_cb'), { ...nuevas, actualizadoEn: serverTimestamp() }, { merge: true }); } catch (e) { console.warn(e); } }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando…</div>;
  if (cartas.length === 0) return <EmptyState icono="CB" titulo="Sin Cartas Balance" descripcion="Carga una carta en 📥 Importar." />;

  const tpMeta = metas.tpMin || 60;
  const chips = [];
  if (filtros.fecha) chips.push(['fecha', `📅 ${fmtCorta(filtros.fecha)}`]);
  if (filtros.persona) chips.push(['persona', `👷 ${filtros.persona}`]);
  if (filtros.cargo) chips.push(['cargo', `🏷️ ${filtros.cargo}`]);
  if (filtros.categoria) chips.push(['categoria', `🔵 ${CAT_NOMBRE[filtros.categoria]}`]);
  if (filtros.codigo) chips.push(['codigo', `🔖 ${filtros.codigo}`]);
  // Etiqueta de la fecha/rango que se está analizando (para el panel azul).
  const fechaLabel = filtros.fecha ? fmtCorta(filtros.fecha)
    : diaSel ? fmtCorta(diaSel)
    : semanaSel ? (semanas.find((x) => x.key === semanaSel)?.label || 'Semana')
    : (desde && hasta) ? (desde === hasta ? fmtCorta(desde) : `${fmtCorta(desde)} – ${fmtCorta(hasta)}`)
    : desde ? `desde ${fmtCorta(desde)}`
    : hasta ? `hasta ${fmtCorta(hasta)}`
    : 'Todas las fechas';
  const btn = (extra) => ({ ...inpTop, cursor: 'pointer', fontWeight: 900, ...extra });

  // Tick del Crew Balance: nombre + cargo (con color por cargo)
  const TickCrew = ({ x, y, payload }) => {
    const { nom } = partesNombre(payload?.value);
    const cg = cargoDeTrab[payload?.value] || 'Sin cargo';
    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" fontSize={9.5}>
          <tspan x={0} dy={12} fontWeight={800} fill={BASE.text}>{corta(nom, 9)}</tspan>
          <tspan x={0} dy={11} fontSize={8.5} fontWeight={800} fill={CARGO_COLOR[cg] || BASE.muted}>{CARGO_ABBR[cg] || cg}</tspan>
        </text>
      </g>
    );
  };

  if (tab === 'metas') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Tabs tab={tab} setTab={setTab} />
        <TabMetas metas={metas} onGuardar={guardarMetas} />
      </div>
    );
  }

  return (
    <div style={fullscreen
      ? { position: 'fixed', inset: 0, zIndex: 4000, background: BASE.bg, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, height: '100dvh' }
      : { display: 'flex', flexDirection: 'column', gap: 10, height: 'calc(100dvh - 150px)', minHeight: 460 }}>
      {!fullscreen && <Tabs tab={tab} setTab={setTab} />}

      {/* BARRA DE CONTROL */}
      <div className="no-print" style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, boxShadow: BASE.shadowSm, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select value={semanaSel} onChange={(e) => elegirSemana(e.target.value)} style={{ ...inpTop, minWidth: 160, fontWeight: 800 }}>
          <option value="">🗓️ Semana…</option>
          {semanas.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={diaSel} onChange={(e) => elegirDia(e.target.value)} disabled={!semanaSel} style={{ ...inpTop, minWidth: 110, opacity: semanaSel ? 1 : 0.45 }}>
          <option value="">Día…</option>
          {diasSemana.map((d) => <option key={d.fecha} value={d.fecha}>{d.label}</option>)}
        </select>
        <span style={{ width: 1, height: 22, background: BASE.border }} />
        <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setSemanaSel(''); setDiaSel(''); }} style={inpTop} />
        <span style={{ color: BASE.muted }}>–</span>
        <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setSemanaSel(''); setDiaSel(''); }} style={inpTop} />
        <select value={selAct} onChange={(e) => setSelAct(e.target.value)} style={{ ...inpTop, minWidth: 150 }}>
          <option value="">🏗️ Todas las actividades</option>
          {actividades.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtros.cargo || ''} onChange={(e) => setFiltros((f) => ({ ...f, cargo: e.target.value || undefined }))} style={{ ...inpTop, minWidth: 120, fontWeight: 800, color: filtros.cargo ? (CARGO_COLOR[filtros.cargo] || BASE.navy) : BASE.navy }}>
          <option value="">🏷️ Todos los cargos</option>
          {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input list="lista-trab" value={filtros.persona || ''} onChange={(e) => setFiltros((f) => ({ ...f, persona: e.target.value || undefined }))} placeholder="👷 Trabajador…" style={{ ...inpTop, minWidth: 140 }} />
        <datalist id="lista-trab">{trabajadores.map((t) => <option key={t} value={t} />)}</datalist>
        {partidaSel && (
          <span title={`Partida ISO: ${partidaSel.partida} › ${partidaSel.subpartida} › ${partidaSel.actividad}`}
            style={{ fontSize: 10.5, fontWeight: 800, color: BASE.navy, background: BASE.goldSoft, border: `1px solid ${BASE.gold}66`, borderRadius: 999, padding: '4px 11px', whiteSpace: 'nowrap' }}>
            📋 ISO · {partidaSel.partida} <span style={{ color: BASE.muted, fontWeight: 600 }}>· {partidaSel.un}, IP meta {partidaSel.ipMeta}</span>
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setPanelAbierto('reco')} style={btn({ background: BASE.bg, color: BASE.navy, border: `1px solid ${BASE.border}` })}>🤖 Recomendar</button>
        <button onClick={() => setPanelAbierto('conclu')} style={btn({ background: BASE.bg, color: BASE.navy, border: `1px solid ${BASE.border}` })}>📝 Conclusiones</button>
        <button onClick={exportarExcel} style={btn({ background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none' })}>⬇</button>
        <button onClick={imprimirTablero} style={btn({ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none' })}>🖨️</button>
        <button onClick={() => setFullscreen((v) => !v)} title="Solo filtros y gráficos, a pantalla completa (Esc para salir)" style={btn({ background: fullscreen ? BASE.red : `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none' })}>{fullscreen ? '✕ Salir' : '⛶ Pantalla completa'}</button>
        {chips.map(([key, label]) => <button key={key} onClick={() => clearF(key)} style={{ fontSize: 11, fontWeight: 800, color: BASE.navy, background: BASE.goldSoft, border: `1px solid ${BASE.gold}77`, borderRadius: 999, padding: '4px 9px', cursor: 'pointer' }}>{label} ✕</button>)}
        {(chips.length || desde || hasta || selAct) ? <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 800, color: BASE.red, background: 'transparent', border: 'none', cursor: 'pointer' }}>Limpiar</button> : null}
      </div>

      {/* GRID DE UNA PANTALLA */}
      <div id="print-area" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gridTemplateRows: 'auto 1fr 1.05fr', gap: 10 }}>
        {/* Hero — TP + medidores TP/TC/TNC */}
        <div style={{ gridColumn: '1 / 3', gridRow: '1', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: BASE.shadowMd, display: 'flex', alignItems: 'stretch', gap: 12, minWidth: 0 }}>
          {/* Cuadrito de contexto: actividad + fecha */}
          <div style={{ flexShrink: 0, minWidth: 0, maxWidth: 280, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.2, color: BASE.gold }}>ANÁLISIS DE PRODUCTIVIDAD {chips.length || selAct || desde || filtros.fecha ? '· FILTRADO' : '· GLOBAL'}</p>
            <p title={selAct || 'Todas las actividades'} style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏗️ {selAct || 'Todas las actividades'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '3px 10px' }}>📅 {fechaLabel}</span>
              <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '3px 10px' }}>👁️ {k.n} obs</span>
            </div>
            <p style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>Meta TP {tpMeta}%</p>
          </div>
          {/* Cuadritos de métricas TP / TC / TNC en fila */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, minWidth: 0 }}>
            {[
              { l: 'Productivo', sub: 'TP', v: k.pTP, c: CB_COL.TP, tx: '#4ade80' },
              { l: 'Contributorio', sub: 'TC', v: k.pTC, c: CB_COL.TC, tx: '#fbbf24' },
              { l: 'No contrib.', sub: 'TNC', v: k.pTNC, c: CB_COL.TNC, tx: '#f87171' },
            ].map((s) => (
              <div key={s.sub} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderTop: `3px solid ${s.c}`, borderRadius: 12, padding: '10px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.l} <span style={{ opacity: 0.55, fontWeight: 700 }}>· {s.sub}</span></span>
                  <span style={{ fontSize: 23, fontWeight: 900, color: s.tx, lineHeight: 1 }}>{Math.round(s.v)}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.14)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(s.v)}%`, height: '100%', background: s.c, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Conclusiones + Recomendación (reemplaza la calificación) — lo clave para los jefes */}
        <div style={{ ...panel({ borderRadius: 14 }), gridColumn: '3', gridRow: '1 / 3', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
            <p style={{ ...titBox, marginBottom: 0 }}>📋 Conclusiones y recomendación</p>
            {selAct && <span style={{ fontSize: 9, fontWeight: 800, color: BASE.gold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }} title={`${selAct} · ${fechaLabel}`}>{fechaLabel}</span>}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11, paddingRight: 2 }}>
            {/* Conclusiones del campo */}
            <div>
              <p style={{ fontSize: 9.5, fontWeight: 900, color: BASE.navy, letterSpacing: 0.6, marginBottom: 5 }}>📝 CONCLUSIONES</p>
              {cartasConclu.length === 0 ? (
                <p style={{ fontSize: 11.5, color: BASE.muted, fontStyle: 'italic', lineHeight: 1.45 }}>
                  {selAct && (filtros.fecha || diaSel || (desde && desde === hasta))
                    ? 'Sin conclusiones registradas para esta actividad y día.'
                    : 'Elige una actividad y un día específico para ver las conclusiones del campo.'}
                </p>
              ) : cartasConclu.map((c) => (
                <div key={c.id} style={{ borderLeft: `3px solid ${BASE.gold}`, background: BASE.bgSoft, borderRadius: 8, padding: '7px 10px', marginBottom: 6 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 900, color: BASE.navy }}>{fmtCorta(c.fecha)} · {c.actividad}</p>
                  <p style={{ fontSize: 11.5, color: BASE.text, lineHeight: 1.5, marginTop: 2, whiteSpace: 'pre-wrap' }}>{c.conclusiones}</p>
                </div>
              ))}
            </div>
            {/* Recomendación de cuadrilla */}
            <div>
              <p style={{ fontSize: 9.5, fontWeight: 900, color: CB_COL.TP, letterSpacing: 0.6, marginBottom: 5 }}>🤖 RECOMENDACIÓN DE CUADRILLA</p>
              {reco?.recomendados?.length ? (
                <>
                  <p style={{ fontSize: 11.5, color: BASE.text, lineHeight: 1.45, marginBottom: 6 }}>{reco.justificacion}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {reco.recomendados.map((r, i) => {
                      const w = crew.find((c) => c.nombre === r.nombre);
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: 8, padding: '5px 9px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: BASE.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rol ? `${r.rol}: ` : ''}{nombreCorto(r.nombre)}</span>
                          <span style={{ fontSize: 11, fontWeight: 900, color: CB_COL.TP, flexShrink: 0 }}>TP {w ? Math.round(w.ptp) : '—'}%</span>
                        </div>
                      );
                    })}
                  </div>
                  {reco.advertencias?.length > 0 && <p style={{ fontSize: 10.5, color: '#d97706', marginTop: 6, fontStyle: 'italic', lineHeight: 1.4 }}>⚠️ {reco.advertencias[0]}</p>}
                </>
              ) : (
                <p style={{ fontSize: 11.5, color: BASE.muted, fontStyle: 'italic', lineHeight: 1.45 }}>{reco?.justificacion || 'Selecciona una actividad para recomendar la mejor cuadrilla.'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dona */}
        <div style={{ ...panel(), gridColumn: '1', gridRow: '2' }}>
          <p style={titBox}>Distribución TP/TC/TNC · clic filtra</p>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="70%" outerRadius="96%" paddingAngle={2} cornerRadius={9} stroke="none" onClick={(d) => setF('categoria', d?.cat)} cursor="pointer">
                  {donut.map((d, i) => <Cell key={i} fill={d.color} opacity={filtros.categoria && filtros.categoria !== d.cat ? 0.3 : 1} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <p style={{ fontSize: 23, fontWeight: 900, color: CB_COL.TP, lineHeight: 1 }}>{Math.round(k.pTP)}%</p>
              <p style={{ fontSize: 7.5, fontWeight: 800, color: BASE.muted, letterSpacing: 0.5, marginTop: 2 }}>PRODUCTIVO</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            {donut.map((d) => (
              <span key={d.cat} onClick={() => setF('categoria', d.cat)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: BASE.text, cursor: 'pointer', opacity: filtros.categoria && filtros.categoria !== d.cat ? 0.4 : 1 }}>
                <i style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                {d.name} <b style={{ color: d.color }}>{d.value}%</b>
              </span>
            ))}
          </div>
        </div>

        {/* Composición por fecha / por cargo (toggle) */}
        <div style={{ ...panel(), gridColumn: '2', gridRow: '2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 6 }}>
            <p style={{ ...titBox, marginBottom: 0 }}>TP/TC/TNC {vistaMedio === 'fecha' ? 'por fecha' : 'por cargo'} · clic filtra</p>
            <div style={{ display: 'flex', gap: 3, background: BASE.bg, borderRadius: 7, padding: 2 }}>
              {[['fecha', '📅'], ['cargo', '🏷️']].map(([id, ic]) => (
                <button key={id} onClick={() => setVistaMedio(id)} style={{ border: 'none', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, background: vistaMedio === id ? BASE.navy : 'transparent', color: vistaMedio === id ? '#fff' : BASE.muted }}>{ic} {id === 'fecha' ? 'Fecha' : 'Cargo'}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {vistaMedio === 'fecha'
              ? <BarApilada data={porFecha} filtroVal={filtros.fecha} onClick={(key) => setF('fecha', key)} />
              : <BarApilada data={porCargo} filtroVal={filtros.cargo} onClick={(key) => setF('cargo', key)} />}
          </div>
        </div>

        {/* (Tarjetas clave eliminadas a pedido; "Causas de pérdida" ocupa col 3, filas 2–3) */}

        {/* Crew Balance — por trabajador (con cargo) */}
        <div style={{ ...panel(), gridColumn: '1 / 3', gridRow: '3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
            <p style={{ ...titBox, marginBottom: 0 }}>Crew Balance · por trabajador (nombre · cargo) · clic enfoca</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={chip()}><i style={dot(CB_COL.TP)} />Productivo</span>
              <span style={chip()}><i style={dot(CB_COL.TC)} />Contributorio</span>
              <span style={chip()}><i style={dot(CB_COL.TNC)} />No contributorio</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ width: '100%', minWidth: Math.max(0, crew.length * 56), height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={crew} stackOffset="expand" margin={{ top: 6, right: 6, left: -20, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} vertical={false} />
                  <XAxis dataKey="nombre" tick={<TickCrew />} interval={0} height={46} />
                  <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 9, fill: BASE.muted }} domain={[0, 1]} width={32} />
                  <Tooltip formatter={(v, n, p) => [`${Math.round(v / (p.payload.n || 1) * 100)}%`, n]} labelFormatter={(l) => `${nombreCorto(l)} · ${cargoDeTrab[l] || ''}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="tp" stackId="a" name="Productivo" cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)}>
                    {crew.map((e, i) => <Cell key={i} fill={CB_COL.TP} opacity={filtros.persona && filtros.persona !== e.nombre ? 0.3 : 1} />)}
                    <LabelList dataKey="tpPct" position="center" fill="#fff" fontSize={9} fontWeight={800} formatter={(v) => (v >= 8 ? `${v}%` : '')} />
                  </Bar>
                  <Bar dataKey="tc" stackId="a" name="Contributorio" cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)}>
                    {crew.map((e, i) => <Cell key={i} fill={CB_COL.TC} opacity={filtros.persona && filtros.persona !== e.nombre ? 0.3 : 1} />)}
                    <LabelList dataKey="tcPct" position="center" fill="#fff" fontSize={9} fontWeight={800} formatter={(v) => (v >= 8 ? `${v}%` : '')} />
                  </Bar>
                  <Bar dataKey="tnc" stackId="a" name="No contributorio" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => d && setF('persona', d.nombre)}>
                    {crew.map((e, i) => <Cell key={i} fill={CB_COL.TNC} opacity={filtros.persona && filtros.persona !== e.nombre ? 0.3 : 1} />)}
                    <LabelList dataKey="tncPct" position="center" fill="#fff" fontSize={9} fontWeight={800} formatter={(v) => (v >= 8 ? `${v}%` : '')} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Causas de pérdida TNC (col 3, fila 3) */}
        <div style={{ ...panel(), gridColumn: '3', gridRow: '3' }}>
          <p style={titBox}>Causas de pérdida (TNC) · clic filtra</p>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compTNC} layout="vertical" margin={{ top: 0, right: 34, left: 2, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 9.5, fill: BASE.text }} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} cursor="pointer" onClick={(d) => d && setF('codigo', d.codigo)} label={{ position: 'right', fontSize: 9.5, fontWeight: 800, fill: BASE.navy, formatter: (v) => `${v}%` }}>
                  {compTNC.map((e, i) => <Cell key={i} fill={filtros.codigo && filtros.codigo !== e.codigo ? `${CB_COL.TNC}44` : CB_COL.TNC} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Panel emergente: Recomendación / Conclusiones */}
      {panelAbierto && (
        <Overlay onClose={() => setPanelAbierto(null)} titulo={panelAbierto === 'reco' ? '🤖 Recomendación de cuadrilla' : '📝 Conclusiones'}>
          {panelAbierto === 'reco' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: BASE.text }}>Para <b style={{ color: BASE.navy }}>{reco?.act || '—'}</b> con</span>
                <input type="number" min={1} max={12} value={recoN} onChange={(e) => setRecoN(parseInt(e.target.value, 10) || 1)} style={{ ...inpTop, width: 60 }} />
                <span style={{ fontSize: 12.5, color: BASE.text }}>personas:</span>
              </div>
              {reco?.recomendados?.length ? (
                <>
                  <p style={{ fontSize: 12.5, color: BASE.text, marginBottom: 10 }}>{reco.justificacion}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {reco.recomendados.map((r, i) => {
                      const w = crew.find((c) => c.nombre === r.nombre);
                      return (
                        <div key={i} style={{ background: BASE.bg, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: '8px 12px', minWidth: 150 }}>
                          <p style={{ fontSize: 9.5, fontWeight: 900, color: BASE.gold, textTransform: 'uppercase' }}>{r.rol || `#${i + 1}`}</p>
                          <p style={{ fontSize: 12.5, fontWeight: 800, color: BASE.navy }}>{r.nombre}</p>
                          <p style={{ fontSize: 11, color: CB_COL.TP, fontWeight: 800 }}>TP {w ? Math.round(w.ptp) : '—'}%</p>
                        </div>
                      );
                    })}
                  </div>
                  {reco.advertencias?.length > 0 && <p style={{ fontSize: 10.5, color: '#d97706', marginTop: 8, fontStyle: 'italic' }}>⚠️ {reco.advertencias[0]}</p>}
                </>
              ) : <p style={{ fontSize: 12.5, color: BASE.muted }}>{reco?.justificacion || 'Carga cartas de esta actividad para recomendar.'}</p>}
            </>
          ) : (
            cartasConclu.length === 0
              ? <p style={{ fontSize: 12.5, color: BASE.muted, fontStyle: 'italic' }}>No hay conclusiones para esta selección. Agrégalas al importar la carta.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{cartasConclu.map((c) => (
                <div key={c.id} style={{ borderLeft: `4px solid ${BASE.gold}`, background: BASE.bgSoft, borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11.5, fontWeight: 900, color: BASE.navy }}>{c.fecha} · {c.actividad}</p>
                  <p style={{ fontSize: 12.5, color: BASE.text, lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.conclusiones}</p>
                </div>))}</div>
          )}
        </Overlay>
      )}
    </div>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <div className="no-print" style={{ display: 'flex', gap: 6, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: 5, alignSelf: 'flex-start' }}>
      {[['resumen', '📊 Tablero'], ['metas', '🎯 Metas']].map(([id, l]) => (
        <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 15px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, background: tab === id ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : 'transparent', color: tab === id ? '#fff' : BASE.muted }}>{l}</button>
      ))}
    </div>
  );
}

function MiniCard({ color, t, v, d }) {
  return (
    <div style={{ flex: 1, minHeight: 0, background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `5px solid ${color}`, borderRadius: 10, padding: '9px 13px', boxShadow: BASE.shadowSm, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
      <p style={{ fontSize: 10.5, fontWeight: 800, color: BASE.muted, letterSpacing: 0.2 }}>{t}</p>
      <p style={{ fontSize: 15, fontWeight: 900, color, marginTop: 2, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
      {d && <p style={{ fontSize: 10.5, fontWeight: 600, color: BASE.muted, marginTop: 1 }}>{d}</p>}
    </div>
  );
}

function Overlay({ titulo, children, onClose }) {
  return (
    <div onClick={onClose} className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,18,34,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 620, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 30px 60px -15px rgba(8,18,34,0.5)' }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${BASE.gold}, ${BASE.goldDark})` }} />
        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: BASE.navy }}>{titulo}</p>
            <button onClick={onClose} style={{ border: 'none', background: BASE.bg, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontWeight: 900, color: BASE.muted }}>✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function TabMetas({ metas, onGuardar }) {
  const [tpMin, setTpMin] = useState(metas.tpMin);
  const [tncMax, setTncMax] = useState(metas.tncMax);
  useEffect(() => { setTpMin(metas.tpMin); setTncMax(metas.tncMax); }, [metas]);
  const [ok, setOk] = useState(false);
  const num = (v, d) => { const x = parseFloat(v); return isNaN(x) ? d : x; };
  return (
    <div style={{ ...panel({ maxWidth: 520, boxShadow: BASE.shadowMd }) }}>
      <p style={titBox}>Metas de productividad (TP / TNC)</p>
      {[
        { l: 'TP mínimo (%)', v: tpMin, set: setTpMin, hint: 'Estándar: 60% — define la calificación' },
        { l: 'TNC máximo (%)', v: tncMax, set: setTncMax, hint: 'Estándar: ≤ 15%' },
      ].map((f) => (
        <div key={f.l} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: BASE.navy, display: 'block', marginBottom: 4 }}>{f.l}</label>
          <input type="number" value={f.v} onChange={(e) => f.set(e.target.value)} min={0} max={100} style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 14, fontWeight: 800, color: BASE.navy }} />
          <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 10 }}>{f.hint}</span>
        </div>
      ))}
      <button onClick={() => { onGuardar({ tpMin: num(tpMin, 60), tncMax: num(tncMax, 15) }); setOk(true); setTimeout(() => setOk(false), 2500); }}
        style={{ marginTop: 6, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', fontSize: 13, fontWeight: 900 }}>
        {ok ? '✓ Guardado' : 'Guardar metas'}
      </button>
    </div>
  );
}
