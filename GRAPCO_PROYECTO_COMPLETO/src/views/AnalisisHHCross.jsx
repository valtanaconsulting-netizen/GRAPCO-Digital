// src/views/AnalisisHHCross.jsx
// Dashboard estilo Power BI: cross-filtering entre trabajadores/cuadrillas, actividades, días.
// Click en cualquier elemento → filtra todos los demás componentes en tiempo real.

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { BASE, CHART_PALETTE } from '../utils/styles';
import { EJE, GRILLA, TOOLTIP_STYLE, LEYENDA, BARRA, SIN_ANIM } from '../utils/chartKit';
import { fmt1 } from '../utils/helpers';
import { crearResolverNombre } from '../utils/nombresCanonicos';
import VistaHeader from '../components/VistaHeader';

// Paleta categórica armonizada de marca (antes era un arcoíris saturado).
const PALETTE = CHART_PALETTE;

const card = {
  background: BASE.white,
  borderRadius: '12px',
  border: `1px solid ${BASE.border}`,
  boxShadow: BASE.shadowMd,
};

const sectionTitle = {
  fontSize: '11px',
  fontWeight: '800',
  color: BASE.navy,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
};

export default function AnalisisHHCross({ filtrados = [], personalDB = [] }) {
  // ── Estado cross-filter ────────────────────────────────────────
  const [selPersona,   setSelPersona]   = useState(null);
  const [selActividad, setSelActividad] = useState(null);
  const [selFecha,     setSelFecha]     = useState(null);
  const [viewMode,     setViewMode]     = useState('trabajadores'); // | 'cuadrillas'
  const [search,       setSearch]       = useState('');

  // ── Flat: cada (trabajador × actividad × día) es una fila ────
  const flat = useMemo(() => {
    // Resolver de nombres compartido (lo mismo que usa Tareo y PagoObreros)
    // para que el MISMO obrero escrito distinto cuente como UNA persona en
    // todos los módulos al mismo tiempo.
    const resolverNombre = crearResolverNombre(filtrados, personalDB);
    const rows = [];
    (filtrados || []).forEach(r => {
      if (!r || !r.fecha) return;
      const actividad = r._actividadCanonica || r.actividad || '—';
      const capataz   = resolverNombre(r.capataz);
      (r.detalleTareo || []).forEach(t => {
        if (!t || !t.nombre) return;
        const hn = parseFloat(t.hn) || 0;
        const he = parseFloat(t.he) || 0;
        if (hn + he === 0) return;
        rows.push({
          fecha: r.fecha,
          actividad,
          capataz,
          trabajador: resolverNombre(t.nombre),
          cargo: t.cargo || 'Operario',
          hn, he, hh: hn + he,
        });
      });
    });
    return rows;
  }, [filtrados, personalDB]);

  // ── Helpers de cross-filter ────────────────────────────────────
  const personaKey = (r) => (viewMode === 'cuadrillas' ? r.capataz : r.trabajador);

  const matchPersona   = (r) => !selPersona   || personaKey(r) === selPersona;
  const matchActividad = (r) => !selActividad || r.actividad === selActividad;
  const matchFecha     = (r) => !selFecha     || r.fecha === selFecha;

  const crossFiltered = useMemo(
    () => flat.filter(r => matchPersona(r) && matchActividad(r) && matchFecha(r)),
    [flat, selPersona, selActividad, selFecha, viewMode]
  );

  // ── KPIs (sobre crossFiltered) ────────────────────────────────
  const kpis = useMemo(() => {
    let hh = 0, hn = 0, he = 0;
    const dias = new Set(), acts = new Set(), pers = new Set();
    crossFiltered.forEach(r => {
      hh += r.hh; hn += r.hn; he += r.he;
      dias.add(r.fecha); acts.add(r.actividad); pers.add(personaKey(r));
    });
    return { hh, hn, he, dias: dias.size, acts: acts.size, pers: pers.size };
  }, [crossFiltered, viewMode]);

  // ── Side panel: trabajadores/cuadrillas (filtrado inverso) ────
  const sideList = useMemo(() => {
    const rows = flat.filter(r => matchActividad(r) && matchFecha(r));
    const map = {};
    rows.forEach(r => {
      const k = personaKey(r);
      if (!map[k]) map[k] = { nombre: k, hh: 0, hn: 0, he: 0, dias: new Set(), actividades: new Set() };
      map[k].hh += r.hh;
      map[k].hn += r.hn;
      map[k].he += r.he;
      map[k].dias.add(r.fecha);
      map[k].actividades.add(r.actividad);
    });
    let list = Object.values(map).map(x => ({
      nombre: x.nombre,
      hh: +x.hh.toFixed(1),
      hn: +x.hn.toFixed(1),
      he: +x.he.toFixed(1),
      dias: x.dias.size,
      actividades: x.actividades.size,
    })).sort((a, b) => b.hh - a.hh);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(x => x.nombre.toLowerCase().includes(q));
    return list;
  }, [flat, selActividad, selFecha, viewMode, search]);

  // ── Donut por actividad (filtrado por persona + fecha) ────────
  const porActividad = useMemo(() => {
    const rows = flat.filter(r => matchPersona(r) && matchFecha(r));
    const map = {};
    rows.forEach(r => { map[r.actividad] = (map[r.actividad] || 0) + r.hh; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: +value.toFixed(1) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [flat, selPersona, selFecha, viewMode]);

  // ── Barras por día (filtrado por persona + actividad) ─────────
  const porDia = useMemo(() => {
    const rows = flat.filter(r => matchPersona(r) && matchActividad(r));
    const map = {};
    rows.forEach(r => {
      if (!map[r.fecha]) map[r.fecha] = { fecha: r.fecha, HN: 0, HE: 0 };
      map[r.fecha].HN += r.hn;
      map[r.fecha].HE += r.he;
    });
    return Object.values(map)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(d => ({
        fechaFull: d.fecha,
        fecha: d.fecha.slice(5), // MM-DD
        HN: +d.HN.toFixed(1),
        HE: +d.HE.toFixed(1),
      }));
  }, [flat, selPersona, selActividad, viewMode]);

  // ── Timeline: días trabajados con intensidad de HH ────────────
  const timeline = useMemo(() => {
    const rows = flat.filter(r => matchPersona(r) && matchActividad(r));
    const map = {};
    rows.forEach(r => { map[r.fecha] = (map[r.fecha] || 0) + r.hh; });
    const arr = Object.entries(map)
      .map(([fecha, hh]) => ({ fecha, hh: +hh.toFixed(1) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const maxHh = Math.max(1, ...arr.map(d => d.hh));
    return { arr, maxHh };
  }, [flat, selPersona, selActividad, viewMode]);

  // ── Chips de filtros activos ───────────────────────────────────
  const filtrosActivos = [
    selPersona   && { label: `${viewMode === 'cuadrillas' ? '👷‍♂️' : '👤'} ${selPersona}`, clear: () => setSelPersona(null) },
    selActividad && { label: `🔨 ${selActividad}`,                                          clear: () => setSelActividad(null) },
    selFecha     && { label: `📅 ${selFecha}`,                                              clear: () => setSelFecha(null) },
  ].filter(Boolean);

  const hayDatos = flat.length > 0;

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      <VistaHeader icono="users" eyebrow="Análisis"
        titulo="Análisis de Cuadrillas"
        subtitulo="HH cruzadas por cuadrilla, persona, actividad y día (cross-filtering)" />

      {/* ── BARRA SUPERIOR: modo + búsqueda + chips ───────────── */}
      <div style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: BASE.bgSoft, borderRadius: '8px', padding: '3px', border: `1px solid ${BASE.border}` }}>
          {['trabajadores', 'cuadrillas'].map(m => (
            <button key={m} onClick={() => { setViewMode(m); setSelPersona(null); }}
              style={{
                padding: '6px 14px', fontSize: '11px', fontWeight: '700',
                background: viewMode === m ? BASE.navy : 'transparent',
                color: viewMode === m ? '#fff' : BASE.muted,
                border: 'none', borderRadius: '6px', cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {m === 'trabajadores' ? '👤 Trabajadores' : '👷‍♂️ Cuadrillas'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder={`Buscar ${viewMode}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px', minWidth: '160px', padding: '8px 12px',
            border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '12px', background: BASE.bgSoft, outline: 'none',
          }}
        />

        {filtrosActivos.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {filtrosActivos.map((f, i) => (
              <span key={i} onClick={f.clear} title="Quitar filtro"
                style={{
                  padding: '4px 10px', background: `${BASE.gold}20`, color: BASE.goldDark,
                  fontSize: '11px', fontWeight: '700', borderRadius: '999px', cursor: 'pointer',
                  border: `1px solid ${BASE.gold}55`, display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}>
                {f.label} <span style={{ opacity: 0.6 }}>✕</span>
              </span>
            ))}
            <button onClick={() => { setSelPersona(null); setSelActividad(null); setSelFecha(null); }}
              style={{
                padding: '4px 10px', fontSize: '11px', fontWeight: '700',
                background: '#fee2e2', color: '#dc2626', border: 'none',
                borderRadius: '999px', cursor: 'pointer',
              }}>
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        {[
          { l: 'HH TOTAL',     v: fmt1(kpis.hh),  c: BASE.navy,    sub: `${fmt1(kpis.hn)} HN + ${fmt1(kpis.he)} HE` },
          { l: viewMode === 'cuadrillas' ? 'CUADRILLAS' : 'PERSONAS', v: kpis.pers, c: BASE.gold },
          { l: 'DÍAS',         v: kpis.dias,      c: PALETTE[2] },
          { l: 'ACTIVIDADES',  v: kpis.acts,      c: BASE.green },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: '10px 14px' }}>
            <p style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>{k.l}</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color: k.c, marginTop: '2px', lineHeight: 1.15 }}>{k.v}</p>
            {k.sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {!hayDatos && (
        <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
          <p style={{ fontSize: '13px', color: BASE.muted, fontWeight: '600' }}>
            Sin registros para los filtros del dashboard.
          </p>
        </div>
      )}

      {hayDatos && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>

          {/* ── SIDE PANEL ──────────────────────────────────── */}
          <div style={{ ...card, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <p style={sectionTitle}>{viewMode === 'cuadrillas' ? 'Cuadrillas' : 'Trabajadores'}</p>
              <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{sideList.length}</span>
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
              {sideList.length === 0 && (
                <p style={{ fontSize: '11px', color: BASE.muted, padding: '8px', textAlign: 'center' }}>Sin coincidencias</p>
              )}
              {sideList.map((p, i) => {
                const activo = selPersona === p.nombre;
                const maxHh = sideList[0]?.hh || 1;
                const pct = Math.round((p.hh / maxHh) * 100);
                return (
                  <button key={p.nombre + i} onClick={() => setSelPersona(activo ? null : p.nombre)}
                    style={{
                      textAlign: 'left', padding: '8px 10px',
                      background: activo ? `${BASE.navy}` : BASE.bgSoft,
                      color: activo ? '#fff' : BASE.text,
                      border: `1px solid ${activo ? BASE.navy : BASE.border}`,
                      borderRadius: '8px', cursor: 'pointer', position: 'relative',
                      overflow: 'hidden',
                    }}>
                    {/* barra de proporción al fondo */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: activo ? 'rgba(255,255,255,0.12)' : `${BASE.gold}18`,
                      width: `${pct}%`, transition: 'width 0.2s',
                    }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nombre}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '900', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {fmt1(p.hh)}h
                      </span>
                    </div>
                    <div style={{ position: 'relative', fontSize: '9.5px', color: activo ? 'rgba(255,255,255,0.75)' : BASE.muted, marginTop: '2px', fontWeight: '600' }}>
                      {p.dias} día{p.dias === 1 ? '' : 's'} · {p.actividades} act.
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CONTENIDO DERECHO ──────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Distribución por actividad — DONUT */}
            <div style={{ ...card, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <p style={sectionTitle}>Distribución por Actividad</p>
                <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>Click para filtrar · {porActividad.length} actividades</span>
              </div>
              {porActividad.length === 0 ? (
                <p style={{ fontSize: '11px', color: BASE.muted, padding: '20px', textAlign: 'center' }}>Sin datos</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px', alignItems: 'center' }}>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={porActividad}
                          dataKey="value" nameKey="name"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                          paddingAngle={2}
                          onClick={(d) => setSelActividad(selActividad === d.name ? null : d.name)}
                        >
                          {porActividad.map((entry, i) => (
                            <Cell key={i}
                              fill={PALETTE[i % PALETTE.length]}
                              stroke={selActividad === entry.name ? BASE.navy : '#fff'}
                              strokeWidth={selActividad === entry.name ? 3 : 2}
                              style={{ cursor: 'pointer', opacity: selActividad && selActividad !== entry.name ? 0.35 : 1 }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(v) => [`${fmt1(v)} HH`, 'Horas']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                    {porActividad.map((a, i) => {
                      const activa = selActividad === a.name;
                      const total = porActividad.reduce((s, x) => s + x.value, 0) || 1;
                      const pct = Math.round(a.value / total * 100);
                      return (
                        <button key={a.name} onClick={() => setSelActividad(activa ? null : a.name)}
                          style={{
                            textAlign: 'left', padding: '6px 10px',
                            background: activa ? `${PALETTE[i % PALETTE.length]}25` : 'transparent',
                            border: `1px solid ${activa ? PALETTE[i % PALETTE.length] : 'transparent'}`,
                            borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            opacity: selActividad && !activa ? 0.5 : 1,
                          }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: '600', color: BASE.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.name}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'monospace', color: BASE.navy }}>
                            {fmt1(a.value)}h
                          </span>
                          <span style={{ fontSize: '10px', color: BASE.muted, fontFamily: 'monospace', minWidth: '38px', textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Detalle diario — BARRAS */}
            <div style={{ ...card, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <p style={sectionTitle}>Detalle Diario (HN + HE)</p>
                <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>{porDia.length} día{porDia.length === 1 ? '' : 's'}</span>
              </div>
              {porDia.length === 0 ? (
                <p style={{ fontSize: '11px', color: BASE.muted, padding: '20px', textAlign: 'center' }}>Sin datos</p>
              ) : (
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={porDia}
                      onClick={(e) => {
                        if (e?.activePayload?.[0]?.payload?.fechaFull) {
                          const f = e.activePayload[0].payload.fechaFull;
                          setSelFecha(selFecha === f ? null : f);
                        }
                      }}
                      margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
                    >
                      <CartesianGrid {...GRILLA} />
                      <XAxis {...EJE} dataKey="fecha" />
                      <YAxis {...EJE} />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v, name) => [`${fmt1(v)} h`, name]}
                        labelFormatter={(_, p) => p?.[0]?.payload?.fechaFull || ''}
                      />
                      <Legend {...LEYENDA} />
                      <Bar {...SIN_ANIM} {...BARRA} dataKey="HN" stackId="a" fill={BASE.navy} cursor="pointer" />
                      <Bar {...SIN_ANIM} {...BARRA} dataKey="HE" stackId="a" fill={BASE.gold} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Timeline de días trabajados */}
            <div style={{ ...card, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <p style={sectionTitle}>Timeline · Días trabajados</p>
                <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>Click para filtrar por día</span>
              </div>
              {timeline.arr.length === 0 ? (
                <p style={{ fontSize: '11px', color: BASE.muted, padding: '20px', textAlign: 'center' }}>Sin datos</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {timeline.arr.map(d => {
                    const intensidad = d.hh / timeline.maxHh;
                    const activo = selFecha === d.fecha;
                    return (
                      <button key={d.fecha} onClick={() => setSelFecha(activo ? null : d.fecha)}
                        title={`${d.fecha} · ${fmt1(d.hh)} HH`}
                        style={{
                          padding: '6px 8px',
                          background: activo ? BASE.navy : `rgba(15, 42, 71, ${0.12 + intensidad * 0.55})`,
                          color: activo ? '#fff' : intensidad > 0.55 ? '#fff' : BASE.navy,
                          border: `1px solid ${activo ? BASE.navy : 'transparent'}`,
                          borderRadius: '6px', cursor: 'pointer',
                          fontSize: '10px', fontWeight: '700', fontFamily: 'monospace',
                          minWidth: '56px',
                        }}>
                        <div>{d.fecha.slice(5)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '1px' }}>{fmt1(d.hh)}h</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
