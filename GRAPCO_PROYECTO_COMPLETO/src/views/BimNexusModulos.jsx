// src/views/BimNexusModulos.jsx
// Los 3 módulos BIM con el MISMO formato (BimShell), cada uno con su objetivo:
//   · CostoNexus        → Metrado & Presupuesto (modelo × APU)
//   · SectorizacionNexus→ Zonas/sectores y cuantificación por nivel/categoría
//   · PlazosNexus       → Cronograma 4D por nivel + simulación en el visor

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { db } from '../firebaseConfig';
import { fmt1, obtenerSemana, fmtFechaCorta } from '../utils/helpers';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';
import { calcularCostoAPU } from '../utils/planMaestroAnalytics';
import { clasificarAPU } from '../data/seed/apusCreditex';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import BimShell, { D, PAL } from './BimShell';

const norm = (s) => (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const macroDe = (c) => {
  const x = norm(c);
  if (/(MURO|PISO|TECHO|PUERTA|VENTANA|ACABAD|ALBA|TARRAJ|PINTURA|CIELO|MOBILIAR|ESCALER)/.test(x)) return 'Arquitectura';
  if (/(TUBER|ELECTR|SANITAR|MECANIC|DUCTO|BANDEJA|LUMINAR|CABLE|MEP|HVAC|PLOMER)/.test(x)) return 'MEP';
  return 'Estructuras';
};
const card = { background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, boxShadow: D.shadow };
const sec = { fontSize: '11.5px', fontWeight: 800, color: D.text, letterSpacing: '0.3px', textTransform: 'uppercase' };
const num = D.num;
const money = (n) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 });

// ════════════════════════════════════════════════════════════════
// 1 · COSTO — Metrado & Presupuesto (modelo × APU)
// ════════════════════════════════════════════════════════════════
export function CostoNexus({ modelosDisponibles, showToast }) {
  return (
    <BimShell titulo="BIM · Costo & Metrado" objetivo="Presupuesto real: cantidades del modelo × APU"
      accent="#E5A82F" modelosDisponibles={modelosDisponibles} showToast={showToast}
      renderPanel={(ctx) => <CostoPanel {...ctx} />} />
  );
}
function CostoPanel({ elsF, catSel, setCatSel, toggleCats }) {
  const [apus, setApus] = useState([]);
  useEffect(() => {
    const u = onSnapshot(collection(db, 'APUs'), s => setApus(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => u();
  }, []);
  const idx = useMemo(() => apus.map(a => ({
    _n: norm(a.descripcion),
    _cu: (a.costoUnitarioTotal > 0) ? a.costoUnitarioTotal : (calcularCostoAPU(a)?.costoUnitarioTotal || 0),
  })), [apus]);
  const cuDe = (t) => { const n = norm(t); if (!n) return 0; const m = idx.find(a => a._n === n) || idx.find(a => a._n && (a._n.includes(n) || n.includes(a._n))); return m ? m._cu : 0; };

  const data = useMemo(() => {
    const pc = {};
    elsF.forEach(e => { const k = e.categoria || 'Sin categoría'; (pc[k] = pc[k] || { cat: k, vol: 0, area: 0, n: 0 }); pc[k].vol += e.volumen; pc[k].area += e.area; pc[k].n++; });
    const M = { Estructuras: [], Arquitectura: [], MEP: [] };
    Object.values(pc).forEach(c => {
      const cu = cuDe(c.cat); const metrado = c.vol > 0 ? c.vol : c.area; const und = c.vol > 0 ? 'm³' : 'm²';
      M[macroDe(c.cat)].push({ ...c, cu, und, metrado: +metrado.toFixed(2), total: metrado * cu });
    });
    let gran = 0;
    const cats = Object.entries(M).filter(([, v]) => v.length).map(([cat, items]) => { const sub = items.reduce((s, x) => s + x.total, 0); gran += sub; return { cat, items: items.sort((a, b) => b.total - a.total), subtotal: sub }; });
    return { cats, gran };
  }, [elsF, idx]);

  const kVol = elsF.reduce((s, e) => s + e.volumen, 0);
  const topCats = useMemo(() => {
    const all = data.cats.flatMap(c => c.items);
    return all.sort((a, b) => b.total - a.total).slice(0, 8).map(x => ({ cat: x.cat, Costo: +x.total.toFixed(0) }));
  }, [data]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
        {[['Costo total (modelo × APU)', 'S/ ' + money(data.gran), D.green], ['Volumen', fmt1(kVol) + ' m³', D.accent], ['Elementos', elsF.length, D.gold]].map(([l, v, c]) => (
          <div key={l} style={{ ...card, padding: '14px' }}><p style={{ fontSize: '9.5px', color: D.muted, fontWeight: 700 }}>{l}</p><p style={{ fontSize: '22px', fontWeight: 900, color: c, marginTop: '4px', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings }}>{v}</p></div>
        ))}
      </div>
      {/* Gráfico que conversa: clic en barra = clasifica por esa categoría */}
      <div style={{ ...card, padding: '12px 16px' }}>
        <p style={{ ...sec, marginBottom: '8px' }}>Costo por Categoría <span style={{ color: D.dim, fontWeight: 600 }}>· clic para clasificar</span></p>
        <div style={{ height: `${Math.max(150, topCats.length * 30)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCats} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: D.muted }} tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="cat" width={140} tick={{ fontSize: 9.5, fill: D.text }} />
              <Tooltip formatter={(v) => ['S/ ' + money(v), 'Costo']} contentStyle={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '8px', fontSize: '11px', color: D.text }} cursor={{ fill: 'rgba(15,42,71,0.05)' }} />
              <Bar dataKey="Costo" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => setCatSel(d.cat)}
                label={{ position: 'right', formatter: v => 'S/ ' + money(v), fontSize: 9, fill: D.muted }}>
                {topCats.map((e, i) => { const on = (catSel || []).includes(e.cat); return <Cell key={i} fill={on ? D.gold : D.accent} opacity={(catSel || []).length && !on ? 0.35 : 1} />; })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}` }}>
          <p style={sec}>Metrado & Presupuesto <span style={{ color: D.dim, fontWeight: 600 }}>· del modelo × APU</span></p>
          <span style={{ fontSize: '13px', fontWeight: 900, fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings, color: D.green }}>S/ {money(data.gran)}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '540px' }}>
            <thead><tr style={{ background: D.soft }}>{['Categoría (modelo)', 'Und', 'Metrado', 'C.U. (APU)', 'Costo'].map((h, i) => <th key={i} style={{ padding: '9px 14px', textAlign: i > 1 ? 'right' : 'left', fontSize: '9.5px', fontWeight: 800, color: D.muted, borderBottom: `1px solid ${D.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {data.cats.map(c => {
                const cats = c.items.map(i => i.cat);
                const grpOn = cats.length > 0 && cats.every(x => (catSel || []).includes(x));
                return (
                <React.Fragment key={c.cat}>
                  <tr onClick={() => toggleCats(cats)} title="Clic: seleccionar/quitar todo el grupo"
                    style={{ background: grpOn ? D.accent + '24' : D.accent + '14', cursor: 'pointer' }}>
                    <td colSpan={4} style={{ padding: '9px 14px', fontWeight: 900, color: D.accent }}>
                      <span style={{ marginRight: '7px' }}>{grpOn ? '☑' : '☐'}</span>{c.cat.toUpperCase()}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 900, fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings }}>S/ {money(c.subtotal)}</td>
                  </tr>
                  {c.items.map((it, i) => {
                    const on = (catSel || []).includes(it.cat);
                    return (
                    <tr key={i} onClick={() => setCatSel(it.cat)} title="Clic: filtrar por esta categoría"
                      style={{ borderBottom: `1px solid ${D.border}`, cursor: 'pointer', background: on ? D.gold + '1A' : 'transparent', transition: 'background .12s' }}
                      onMouseEnter={e => { if (!on) e.currentTarget.style.background = D.soft; }}
                      onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '8px 14px 8px 26px', fontWeight: on ? 800 : 400, color: on ? D.gold : D.text }}>
                        <span style={{ marginRight: '7px', opacity: on ? 1 : 0.35 }}>{on ? '☑' : '☐'}</span>{it.cat} <span style={{ color: D.dim, fontWeight: 400 }}>· {it.n} elem.</span>
                      </td>
                      <td style={{ padding: '8px 14px', color: D.muted }}>{it.und}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings, color: D.muted }}>{fmt1(it.metrado)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings, color: it.cu ? D.muted : D.red }}>{it.cu ? it.cu.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : 'sin APU'}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings, fontWeight: 700, color: D.green }}>S/ {money(it.total)}</td>
                    </tr>
                    );
                  })}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2 · SECTORIZACIÓN — zonas y cuantificación por nivel/categoría
// ════════════════════════════════════════════════════════════════
export function SectorizacionNexus({ modelosDisponibles, showToast }) {
  return (
    <BimShell titulo="BIM · Sectorización" objetivo="Zonas del modelo: cuantificación y aislamiento 3D por nivel"
      accent="#10B981" modelosDisponibles={modelosDisponibles} showToast={showToast}
      renderPanel={(ctx) => <SectorPanel {...ctx} />} />
  );
}
function SectorPanel({ elsF, niveles, secSel, catSel, setSecSel, setCatSel }) {
  const porCat = useMemo(() => {
    const m = {};
    elsF.forEach(e => { const k = e.categoria || 'Sin categoría'; (m[k] = m[k] || { cat: k, vol: 0, n: 0 }); m[k].vol += e.volumen; m[k].n++; });
    return Object.values(m).map(x => ({ ...x, vol: +x.vol.toFixed(1) })).sort((a, b) => b.vol - a.vol);
  }, [elsF]);
  const distrib = useMemo(() => niveles.map(n => ({ name: n.nivel, value: n.vol })), [niveles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
        {[['Sectores (niveles)', niveles.length, D.green], ['Niveles activos', (secSel || []).length || 'Todos', D.accent], ['Elementos', elsF.length, D.gold]].map(([l, v, c]) => (
          <div key={l} style={{ ...card, padding: '14px' }}><p style={{ fontSize: '9.5px', color: D.muted, fontWeight: 700 }}>{l}</p><p style={{ fontSize: '20px', fontWeight: 900, color: c, marginTop: '4px', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings }}>{v}</p></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ ...sec, marginBottom: '8px' }}>Distribución de Volumen por Sector</p>
          <div style={{ height: '230px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distrib} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}
                  onClick={(d) => setSecSel(d.name)} style={{ cursor: 'pointer' }}>
                  {distrib.map((e, i) => { const on = (secSel || []).includes(e.name); return <Cell key={i} fill={niveles[i]?.color || PAL[i % PAL.length]} stroke={on ? D.text : 'none'} strokeWidth={on ? 2 : 0} opacity={(secSel || []).length && !on ? 0.4 : 1} />; })}
                </Pie>
                <Tooltip contentStyle={{ background: D.soft, border: `1px solid ${D.border}`, borderRadius: '8px', fontSize: '11px', color: D.text }} formatter={(v, n) => [`${fmt1(v)} m³`, n]} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ ...card, overflow: 'hidden' }}>
          <p style={{ ...sec, padding: '12px 16px 6px' }}>Cantidades por Categoría {(secSel || []).length ? `· ${secSel.join(', ')}` : ''}</p>
          <div style={{ overflowY: 'auto', maxHeight: '220px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead><tr style={{ background: D.soft }}>{['Categoría', 'Elem.', 'Vol m³'].map((h, i) => <th key={i} style={{ padding: '7px 12px', textAlign: i ? 'right' : 'left', fontSize: '9px', fontWeight: 800, color: D.muted, position: 'sticky', top: 0, background: D.soft }}>{h}</th>)}</tr></thead>
              <tbody>
                {porCat.map((c, i) => (
                  <tr key={i} onClick={() => setCatSel(c.cat)} style={{ borderBottom: `1px solid ${D.border}`, cursor: 'pointer', background: (catSel || []).includes(c.cat) ? D.gold + '1A' : 'transparent' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>{c.cat}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings, color: D.muted }}>{c.n}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings, fontWeight: 700, color: D.green }}>{fmt1(c.vol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p style={{ fontSize: '10px', color: D.dim }}>Conversan: clic en el donut filtra por nivel · clic en la tabla clasifica por categoría · ambos aíslan y colorean el modelo 3D.</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 3 · PLAZOS — Cronograma 4D por nivel + simulación
// ════════════════════════════════════════════════════════════════
export function PlazosNexus({ modelosDisponibles, showToast }) {
  return (
    <BimShell titulo="BIM · Plazos 4D" objetivo="Cronograma por nivel + simulación de avance en el modelo"
      accent="#3B82F6" modelosDisponibles={modelosDisponibles} showToast={showToast}
      renderPanel={(ctx) => <PlazosPanel {...ctx} showToast={showToast} />} />
  );
}
const fechaDe = (iso) => { try { return fmtFechaCorta(iso); } catch (_) { return iso; } };

function PlazosPanel({ els, niveles, isolate, showToast }) {
  const { proyectoActivoId, filtrarPorContexto } = useProyectoActivo();
  const docId = proyectoActivoId || 'default';
  const [registros, setRegistros] = useState([]);
  const [idx, setIdx] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const u = onSnapshot(collection(db, 'Registros_Campo'),
      s => setRegistros(filtrarPorContexto(s.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })),
      e => console.error('[Plazos registros]', e));
    return () => u();
  }, [filtrarPorContexto]);

  const semanas = useMemo(() => {
    const m = {};
    (registros || []).forEach(r => {
      if (!r || !r.fecha) return;
      const sem = r.semana || obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO);
      if (!sem) return;
      if (!m[sem]) m[sem] = { sem, ini: r.fecha, fin: r.fecha, n: 0 };
      m[sem].n++;
      if (r.fecha < m[sem].ini) m[sem].ini = r.fecha;
      if (r.fecha > m[sem].fin) m[sem].fin = r.fecha;
    });
    return Object.values(m).sort((a, b) => a.sem - b.sem);
  }, [registros]);

  useEffect(() => { if (semanas.length) setIdx(semanas.length - 1); }, [semanas.length]);

  const nW = semanas.length;
  const plan = useMemo(() => {
    if (!nW || !niveles.length) return [];
    return niveles.map((nv, i) => {
      const wk = Math.min(nW - 1, Math.floor((i * nW) / niveles.length));
      return { ...nv, wk, sem: semanas[wk].sem };
    });
  }, [niveles, semanas, nW]);

  const volTotal = useMemo(() => niveles.reduce((s, n) => s + n.vol, 0), [niveles]);
  const semActual = semanas[idx] || null;

  const construido = useMemo(() => {
    const ids = []; let vol = 0;
    plan.forEach(p => { if (p.wk <= idx) { ids.push(...p.dbIds); vol += p.vol; } });
    return { ids, vol, pct: volTotal > 0 ? Math.round((vol / volTotal) * 100) : 0 };
  }, [plan, idx, volTotal]);

  const porSemana = useMemo(() => semanas.map((w, k) => {
    const vol = plan.filter(p => p.wk === k).reduce((s, p) => s + p.vol, 0);
    return { k, label: `S${w.sem}`, sem: w.sem, ini: w.ini, fin: w.fin, vol: +vol.toFixed(1) };
  }), [semanas, plan]);

  useEffect(() => {
    if (!els.length || !plan.length) return;
    isolate(construido.ids.length ? construido.ids : [0]);
  }, [idx, construido.ids.length, els.length, plan.length]); // eslint-disable-line

  const guardar = async () => {
    setGuardando(true);
    try {
      await setDoc(doc(db, 'LPS_Plazos', docId), {
        origen: 'registro', semanas: semanas.map(w => w.sem),
        plan: Object.fromEntries(plan.map(p => [p.nivel, { semana: p.sem }])),
        actualizadoEn: new Date(),
      });
      showToast?.('Plazos (por semanas del registro) guardados', 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
    finally { setGuardando(false); }
  };

  if (!nW) {
    return (
      <div style={{ ...card, padding: '28px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 800, color: D.text }}>Sin semanas en el registro</p>
        <p style={{ fontSize: '11.5px', color: D.muted, marginTop: '6px', lineHeight: 1.5 }}>
          Aun no hay partes de produccion cargados. El cronograma 4D usa las <strong>semanas reales</strong> que existan en Registros de Campo.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', color: D.muted, fontWeight: 800, letterSpacing: '0.5px' }}>SEMANA DEL REGISTRO</span>
        <select value={idx} onChange={e => setIdx(+e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${D.border}`, background: D.soft, color: D.text, fontSize: '12px', fontWeight: 700, flex: '1 1 280px' }}>
          {semanas.map((w, k) => (
            <option key={w.sem} value={k}>Semana {w.sem} - {fechaDe(w.ini)} a {fechaDe(w.fin)} - {w.n} partes</option>
          ))}
        </select>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ padding: '7px 12px', borderRadius: '7px', border: `1px solid ${D.border}`, background: D.card, color: D.text, fontSize: '12px', fontWeight: 800, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>Anterior</button>
        <button onClick={() => setIdx(i => Math.min(nW - 1, i + 1))} disabled={idx === nW - 1}
          style={{ padding: '7px 12px', borderRadius: '7px', border: `1px solid ${D.border}`, background: D.card, color: D.text, fontSize: '12px', fontWeight: 800, cursor: idx === nW - 1 ? 'not-allowed' : 'pointer', opacity: idx === nW - 1 ? 0.4 : 1 }}>Siguiente</button>
        <button onClick={guardar} disabled={guardando} style={{ padding: '7px 14px', background: D.green, color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>{guardando ? '...' : 'Guardar'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '10px' }}>
        {[
          ['AVANCE FISICO', `${construido.pct}%`, D.green],
          ['SEMANA', semActual ? `S${semActual.sem}` : '-', D.accent],
          ['RANGO', semActual ? `${fechaDe(semActual.ini)} a ${fechaDe(semActual.fin)}` : '-', D.gold],
          ['SEMANAS REG.', `${idx + 1} / ${nW}`, D.text],
        ].map(([l, v, c]) => (
          <div key={l} style={{ ...card, padding: '12px 14px' }}>
            <p style={{ fontSize: '9px', color: D.muted, fontWeight: 800 }}>{l}</p>
            <p style={{ fontSize: '16px', fontWeight: 900, color: c, marginTop: '3px', fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={sec}>Simulacion 4D - semanas del registro</p>
          <span style={{ fontSize: '12px', fontWeight: 900, color: D.accent, fontFamily: num.fontFamily, fontFeatureSettings: num.fontFeatureSettings }}>
            {semActual ? `S${semActual.sem}` : ''} - {construido.pct}%
          </span>
        </div>
        <input type="range" min={0} max={nW - 1} step={1} value={idx} onChange={e => setIdx(+e.target.value)} style={{ width: '100%', accentColor: D.accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: D.dim, marginTop: '2px' }}>
          <span>S{semanas[0].sem}</span><span>{nW} semanas registradas</span><span>S{semanas[nW - 1].sem}</span>
        </div>
      </div>

      <div style={{ ...card, padding: '12px 16px' }}>
        <p style={{ ...sec, marginBottom: '8px' }}>Lo que se avanza por semana <span style={{ color: D.dim, fontWeight: 600 }}>- clic para ir a esa semana</span></p>
        <div style={{ height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porSemana} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: D.muted }} interval={0} angle={-18} textAnchor="end" height={42} />
              <YAxis tick={{ fontSize: 9, fill: D.muted }} />
              <Tooltip formatter={(v) => [`${fmt1(v)} m3`, 'Avance']} labelFormatter={(_, pl) => pl && pl[0] ? `Semana ${pl[0].payload.sem} - ${fechaDe(pl[0].payload.ini)} a ${fechaDe(pl[0].payload.fin)}` : ''} contentStyle={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '8px', fontSize: '11px', color: D.text }} cursor={{ fill: 'rgba(15,42,71,0.05)' }} />
              <Bar dataKey="vol" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => setIdx(d.k)}>
                {porSemana.map((e, k) => <Cell key={k} fill={k === idx ? D.gold : k < idx ? D.green : D.accent} opacity={k <= idx ? 1 : 0.45} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...card, padding: '12px 16px' }}>
        <p style={{ ...sec, marginBottom: '10px' }}>Cronograma por Nivel <span style={{ color: D.dim, fontWeight: 600 }}>- asignado a semanas del registro</span></p>
        {plan.map((p) => {
          const off = nW > 1 ? (p.wk / nW) * 100 : 0;
          const w = nW > 0 ? (1 / nW) * 100 : 100;
          const activo = p.wk <= idx;
          return (
            <div key={p.nivel} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
              <span style={{ width: '120px', fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nivel}</span>
              <div style={{ flex: 1, position: 'relative', height: '20px', background: D.soft, borderRadius: '6px' }}>
                <div style={{ position: 'absolute', left: `${off}%`, width: `${Math.max(4, w)}%`, top: 0, bottom: 0, borderRadius: '6px', background: activo ? p.color : `${p.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#fff' }}>S{p.sem}</div>
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: '10px', color: D.dim, marginTop: '8px' }}>Cada nivel se asigna a una semana real del registro. Mueve el selector o slider: el visor 3D aisla lo construido hasta esa semana.</p>
      </div>
    </div>
  );
}
