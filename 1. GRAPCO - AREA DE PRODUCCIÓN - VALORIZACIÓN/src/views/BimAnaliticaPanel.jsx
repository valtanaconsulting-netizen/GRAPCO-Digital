// src/views/BimAnaliticaPanel.jsx — Analítica BIM estilo Power BI / Speckle.
//
// Contrato universal (Power BI): "una selección filtra todo" — cada gráfico,
// fila y chip filtra a la vez la data y el modelo 3D (aislar + colorear con
// ghosting, convención Speckle: lo no filtrado queda fantasma, no oculto).
// Fuente de datos: el store de parámetros TOTALES (bimPropsStore) que llega
// vía ctx.store; sin store, opera con las quantities básicas (els) del shell.
//
// Piezas: KPIs → slicer por CUALQUIER parámetro Revit → barras/donut que
// filtran → tabla agrupada → export Excel (S10-friendly).

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie,
} from 'recharts';
import { db } from '../firebaseConfig';
import { fmt1 } from '../utils/helpers';
import { SIN_ANIM } from '../utils/chartKit';
import { calcularCostoAPU } from '../utils/planMaestroAnalytics';
import { D, PAL, RGB } from './BimShell';

const norm = (s) => (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const card = { background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, boxShadow: D.shadow };
const sec = { fontSize: '12px', fontWeight: 700, color: D.text, letterSpacing: '0.3px', textTransform: 'uppercase' };
const money = (n) => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });

const METRICAS = [
  { id: 'volumen', l: 'Volumen (m³)', fmt: v => `${fmt1(v)} m³` },
  { id: 'area',    l: 'Área (m²)',    fmt: v => `${fmt1(v)} m²` },
  { id: 'conteo',  l: 'Elementos',    fmt: v => `${v}` },
  { id: 'costo',   l: 'Costo (APU)',  fmt: money },
];

export default function BimAnaliticaPanel({ els, elsF, secSel, catSel, setSecSel, setCatSel, viewerRef, store, propsEstado }) {
  const [metrica, setMetrica] = useState('volumen');
  const [agruparPor, setAgruparPor] = useState('categoria');   // categoria | nivel | tipo | p:<idx>
  const [grupoSel, setGrupoSel] = useState([]);                // filtro local para tipo/parámetros
  const [paramSlicer, setParamSlicer] = useState('');          // idx del parámetro del slicer libre
  const [exportando, setExportando] = useState(false);

  // ── Costo: mismo join modelo×APU del tab Costo ──
  const [apus, setApus] = useState([]);
  useEffect(() => {
    const u = onSnapshot(collection(db, 'APUs'), s => setApus(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => u();
  }, []);
  const idxApu = useMemo(() => apus.map(a => ({
    _n: norm(a.descripcion),
    _cu: (a.costoUnitarioTotal > 0) ? a.costoUnitarioTotal : (calcularCostoAPU(a)?.costoUnitarioTotal || 0),
  })), [apus]);
  const cuDe = useMemo(() => {
    const cache = new Map();
    return (cat) => {
      if (cache.has(cat)) return cache.get(cat);
      const n = norm(cat);
      const m = n && (idxApu.find(a => a._n === n) || idxApu.find(a => a._n && (a._n.includes(n) || n.includes(a._n))));
      const cu = m ? m._cu : 0;
      cache.set(cat, cu);
      return cu;
    };
  }, [idxApu]);
  const costoDe = (e) => cuDe(e.categoria) * (e.volumen > 0 ? e.volumen : e.area);

  // ── Accessor de agrupación (dimensión = color) ──
  const paramInvertido = useMemo(() => {
    if (!store || !agruparPor.startsWith('p:')) return null;
    const idx = +agruparPor.slice(2);
    const m = new Map();  // externalId → valor
    for (const [valor, ids] of store.valoresDe(idx)) ids.forEach(id => m.set(id, valor));
    return m;
  }, [store, agruparPor]);
  const valorDe = (e) => {
    if (agruparPor === 'categoria') return e.categoria;
    if (agruparPor === 'nivel') return e.nivel;
    if (agruparPor === 'tipo') return e.tipo || 'Sin tipo';
    return paramInvertido?.get(e.externalId) || 'Sin valor';
  };

  // ── Slicer libre por parámetro ──
  const [valoresSlicer, setValoresSlicer] = useState([]);   // valores elegidos del paramSlicer
  const slicerIds = useMemo(() => {
    if (!store || paramSlicer === '' || !valoresSlicer.length) return null;
    const mapa = store.valoresDe(+paramSlicer);
    const ids = new Set();
    valoresSlicer.forEach(v => mapa.get(v)?.forEach(id => ids.add(id)));
    return ids;
  }, [store, paramSlicer, valoresSlicer]);

  // ── Data final: filtros del shell (nivel/categoría) ∩ slicer ∩ grupo local ──
  const elemsA = useMemo(() => elsF.filter(e =>
    (!slicerIds || slicerIds.has(e.externalId)) &&
    (!grupoSel.length || grupoSel.includes(valorDe(e)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [elsF, slicerIds, grupoSel, agruparPor, paramInvertido]);

  const grupos = useMemo(() => {
    const m = {};
    elemsA.forEach(e => {
      const k = valorDe(e);
      if (!m[k]) m[k] = { valor: k, n: 0, vol: 0, area: 0, costo: 0, dbIds: [] };
      m[k].n++; m[k].vol += e.volumen; m[k].area += e.area; m[k].costo += costoDe(e); m[k].dbIds.push(e.dbId);
    });
    const key = metrica === 'conteo' ? 'n' : metrica === 'costo' ? 'costo' : metrica === 'area' ? 'area' : 'vol';
    return Object.values(m).sort((a, b) => b[key] - a[key])
      .map((g, i) => ({ ...g, medida: g[key], color: PAL[i % PAL.length] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elemsA, metrica, agruparPor, paramInvertido, cuDe]);

  // ── Efecto 3D: ghosting + aislar + colorear por grupo (convención Speckle) ──
  useEffect(() => {
    const v = viewerRef?.current;
    if (!v || !els.length) return;
    try {
      v.setGhosting?.(true);
      v.clearThemingColors?.(v.model);
      const hayFiltro = elemsA.length !== els.length || grupoSel.length;
      v.isolate?.(hayFiltro ? elemsA.map(e => e.dbId) : []);
      if (window.THREE) {
        grupos.forEach(g => {
          const rgb = RGB[g.color];
          if (!rgb) return;
          const c = new window.THREE.Vector4(rgb[0], rgb[1], rgb[2], 1);
          g.dbIds.forEach(id => v.setThemingColor(id, c, v.model));
        });
      }
      v.impl?.invalidate(true);
    } catch { /* visor aún no listo */ }
  }, [grupos, elemsA, els.length, viewerRef, grupoSel.length]);

  const toggleGrupo = (valor) => {
    if (agruparPor === 'categoria') return setCatSel(valor);
    if (agruparPor === 'nivel') return setSecSel(valor);
    setGrupoSel(prev => prev.includes(valor) ? prev.filter(x => x !== valor) : [...prev, valor]);
  };
  const grupoActivo = (valor) => {
    if (agruparPor === 'categoria') return (catSel || []).includes(valor);
    if (agruparPor === 'nivel') return (secSel || []).includes(valor);
    return grupoSel.includes(valor);
  };

  const kpis = useMemo(() => ({
    n: elemsA.length,
    vol: elemsA.reduce((s, e) => s + e.volumen, 0),
    area: elemsA.reduce((s, e) => s + e.area, 0),
    costo: elemsA.reduce((s, e) => s + costoDe(e), 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [elemsA, cuDe]);

  const chipsActivos = [
    ...(secSel || []).map(v => ({ l: `Nivel: ${v}`, quitar: () => setSecSel(v) })),
    ...(catSel || []).map(v => ({ l: `Categoría: ${v}`, quitar: () => setCatSel(v) })),
    ...grupoSel.map(v => ({ l: `${etiquetaAgrupar(agruparPor, store)}: ${v}`, quitar: () => toggleGrupo(v) })),
    ...valoresSlicer.map(v => ({ l: v, quitar: () => setValoresSlicer(prev => prev.filter(x => x !== v)) })),
  ];

  const exportar = async () => {
    setExportando(true);
    try {
      const { exportarAnaliticaExcel } = await import('../utils/bimExcel');
      await exportarAnaliticaExcel({ grupos, elems: elemsA, agruparPor: etiquetaAgrupar(agruparPor, store), metrica, cuDe });
    } catch (e) {
      console.error('[Analitica] export', e);
    } finally {
      setExportando(false);
    }
  };

  if (!els.length) {
    return (
      <div style={{ ...card, padding: '28px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 800, color: D.text }}>Sin datos del modelo</p>
        <p style={{ fontSize: '12px', color: D.muted, marginTop: '6px' }}>Selecciona un modelo arriba para analizar sus parámetros.</p>
      </div>
    );
  }

  const M = METRICAS.find(m => m.id === metrica);
  const barras = grupos.slice(0, 14).map(g => ({ name: g.valor, medida: +g.medida.toFixed(1), color: g.color }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Fuente de datos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: '11px', fontWeight: 700,
          background: store ? D.green + '1A' : D.gold + '1F',
          color: store ? '#047857' : '#8A6516', border: `1px solid ${store ? D.green : D.gold}44`,
        }}>
          {store
            ? `● Parámetros completos del modelo: ${store.stats.elems.toLocaleString('es-PE')} elementos · ${store.stats.params} parámetros Revit`
            : propsEstado === 'cargando' ? '◌ Extrayendo parámetros completos del modelo…' : '○ Datos básicos del visor (parámetros completos no disponibles)'}
        </span>
      </div>

      {/* Chips de filtros activos */}
      {chipsActivos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {chipsActivos.map((c, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 12px',
              background: D.soft, border: `1px solid ${D.border}`, borderRadius: 999,
              fontSize: '11.5px', fontWeight: 600, color: D.text,
            }}>
              {c.l}
              <button onClick={c.quitar} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: D.dim, fontSize: '12px', padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          ))}
          <button onClick={() => { setGrupoSel([]); setValoresSlicer([]); (secSel || []).forEach(setSecSel); (catSel || []).forEach(setCatSel); }}
            style={{ border: `1px solid ${D.red}44`, background: 'transparent', color: D.red, borderRadius: 999, padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
            Limpiar todo
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
        {[
          ['Elementos', `${kpis.n.toLocaleString('es-PE')}`, `de ${els.length.toLocaleString('es-PE')}`, D.accent],
          ['Volumen', fmt1(kpis.vol), 'm³', D.green],
          ['Área', fmt1(kpis.area), 'm²', '#1E4674'],
          ['Costo (modelo × APU)', money(kpis.costo), 'valorizable', D.gold],
        ].map(([l, v, sub, c]) => (
          <div key={l} style={{ ...card, padding: '14px 16px' }}>
            <p style={{ fontSize: '10.5px', color: D.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: c, marginTop: '4px', letterSpacing: '-0.5px', ...D.num }}>{v}</p>
            <p style={{ fontSize: '10.5px', color: D.dim, marginTop: '1px' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Controles: métrica · agrupar/colorear por · slicer libre */}
      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', background: D.soft, border: `1px solid ${D.border}`, borderRadius: 999, padding: 3 }}>
          {METRICAS.map(m => (
            <button key={m.id} onClick={() => setMetrica(m.id)} style={{
              padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: metrica === m.id ? D.accent : 'transparent',
              color: metrica === m.id ? '#fff' : D.muted, fontSize: '11.5px', fontWeight: 700,
            }}>{m.l}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11.5px', fontWeight: 700, color: D.muted }}>
          Agrupar y colorear por
          <select value={agruparPor} onChange={e => { setAgruparPor(e.target.value); setGrupoSel([]); }}
            style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.card, color: D.text, fontSize: '12px', fontWeight: 600, maxWidth: 260 }}>
            <option value="categoria">Categoría</option>
            <option value="nivel">Nivel</option>
            {store && <option value="tipo">Tipo (familia Revit)</option>}
            {store && (
              <optgroup label="Parámetros del modelo">
                {store.paramsString().slice(0, 200).map(p => (
                  <option key={p.idx} value={`p:${p.idx}`}>{p.clave}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {store && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11.5px', fontWeight: 700, color: D.muted }}>
            Filtro por parámetro
            <select value={paramSlicer} onChange={e => { setParamSlicer(e.target.value); setValoresSlicer([]); }}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.card, color: D.text, fontSize: '12px', fontWeight: 600, maxWidth: 240 }}>
              <option value="">— ninguno —</option>
              {store.paramsString().slice(0, 200).map(p => (
                <option key={p.idx} value={p.idx}>{p.clave}</option>
              ))}
            </select>
          </label>
        )}
        <button onClick={exportar} disabled={exportando} style={{
          marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#107C41', color: '#fff', fontSize: '11.5px', fontWeight: 700,
        }}>{exportando ? 'Generando…' : 'Exportar Excel'}</button>
      </div>

      {/* Valores del slicer libre */}
      {store && paramSlicer !== '' && (
        <div style={{ ...card, padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 120, overflowY: 'auto' }}>
          {[...store.valoresDe(+paramSlicer).entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 40).map(([valor, ids]) => {
            const on = valoresSlicer.includes(valor);
            return (
              <button key={valor} onClick={() => setValoresSlicer(prev => on ? prev.filter(x => x !== valor) : [...prev, valor])}
                style={{
                  padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                  border: `1px solid ${on ? D.accent : D.border}`,
                  background: on ? D.accent : D.card, color: on ? '#fff' : D.text,
                }}>
                {valor} <span style={{ opacity: 0.65, ...D.num }}>{ids.size}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Gráficos: todo gráfico filtra */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '12px' }}>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ ...sec, marginBottom: 8 }}>{M.l} por {etiquetaAgrupar(agruparPor, store)} <span style={{ color: D.dim, fontWeight: 500, textTransform: 'none' }}>· clic filtra</span></p>
          <div style={{ height: Math.max(160, barras.length * 26) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barras} layout="vertical" margin={{ top: 2, right: 56, bottom: 2, left: 6 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: D.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 10.5, fill: D.text }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [M.fmt(v), M.l]} contentStyle={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, fontSize: '11.5px', color: D.text, boxShadow: D.shadow }} cursor={{ fill: 'rgba(15,42,71,0.05)' }} />
                <Bar {...SIN_ANIM} dataKey="medida" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => toggleGrupo(d.name)}
                  label={{ position: 'right', formatter: M.fmt, fontSize: 9.5, fill: D.muted }}>
                  {barras.map((b, i) => {
                    const on = grupoActivo(b.name);
                    const hayGrupo = grupos.some(g => grupoActivo(g.valor));
                    return <Cell key={i} fill={b.color} opacity={hayGrupo && !on ? 0.3 : 1} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ ...card, padding: '14px 16px' }}>
          <p style={{ ...sec, marginBottom: 8 }}>Distribución</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie {...SIN_ANIM} data={barras} dataKey="medida" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2}
                  onClick={(d) => toggleGrupo(d.name)} style={{ cursor: 'pointer' }}>
                  {barras.map((b, i) => <Cell key={i} fill={b.color} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(v, n) => [M.fmt(v), n]} contentStyle={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, fontSize: '11.5px', color: D.text, boxShadow: D.shadow }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda propia (swatch + valor + medida) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto', marginTop: 6 }}>
            {grupos.slice(0, 10).map(g => (
              <button key={g.valor} onClick={() => toggleGrupo(g.valor)} style={{
                display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: grupoActivo(g.valor) ? D.soft : 'transparent',
                borderRadius: 6, padding: '3px 8px', cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '11.5px', color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.valor}</span>
                <span style={{ fontSize: '10.5px', color: D.muted, fontWeight: 700, ...D.num }}>{M.fmt(g.medida)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla agrupada */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}` }}>
          <p style={sec}>Resumen por {etiquetaAgrupar(agruparPor, store)}</p>
          <span style={{ fontSize: '12px', color: D.dim }}>{grupos.length} grupos · {elemsA.length} elementos</span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: 560 }}>
            <thead>
              <tr style={{ background: D.soft }}>
                {[etiquetaAgrupar(agruparPor, store), 'Elem.', 'Volumen m³', 'Área m²', 'Costo (APU)'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: i ? 'right' : 'left', fontSize: '10px', fontWeight: 700, color: D.muted, position: 'sticky', top: 0, background: D.soft, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => {
                const on = grupoActivo(g.valor);
                return (
                  <tr key={g.valor} onClick={() => toggleGrupo(g.valor)}
                    style={{ borderBottom: `1px solid ${D.borderSoft}`, cursor: 'pointer', background: on ? D.gold + '14' : 'transparent' }}>
                    <td style={{ padding: '9px 14px', fontWeight: on ? 700 : 500, color: D.text }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: g.color, marginRight: 8 }} />
                      {g.valor}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: D.muted, ...D.num }}>{g.n}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: D.text, ...D.num }}>{fmt1(g.vol)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: D.text, ...D.num }}>{fmt1(g.area)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: D.green, ...D.num }}>{money(g.costo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: D.soft, fontWeight: 700 }}>
                <td style={{ padding: '10px 14px', color: D.accent }}>TOTAL</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', ...D.num }}>{kpis.n}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', ...D.num }}>{fmt1(kpis.vol)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', ...D.num }}>{fmt1(kpis.area)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: D.green, ...D.num }}>{money(kpis.costo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{ fontSize: '11px', color: D.dim }}>
        Todo filtra todo: gráficos, tabla y chips actualizan el modelo 3D (lo filtrado se colorea, el resto queda fantasma).
        Toca un elemento en el 3D para ver TODOS sus parámetros Revit.
      </p>
    </div>
  );
}

function etiquetaAgrupar(agruparPor, store) {
  if (agruparPor === 'categoria') return 'Categoría';
  if (agruparPor === 'nivel') return 'Nivel';
  if (agruparPor === 'tipo') return 'Tipo';
  if (agruparPor.startsWith('p:') && store) {
    const p = store.listaParams[+agruparPor.slice(2)];
    return p ? p.nombre : 'Parámetro';
  }
  return 'Grupo';
}
