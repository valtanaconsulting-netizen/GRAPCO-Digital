// src/views/ingeniero/Graficos.jsx — V4 visual upgrade + filtro Partida/Actividad
// Paleta semántica alineada al CPI · tooltip premium · bandas de referencia ·
// leyenda interactiva · ejes con formato compacto · filtro global.
import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea, AreaChart, Area, ComposedChart, Cell,
} from 'recharts';
import { BASE } from '../utils/styles';
import { EJE, GRILLA, BARRA, degradado } from '../utils/chartKit';
import VistaHeader from '../components/VistaHeader';

// === Builder de grafData a partir de registros — corre on-the-fly por filtro ===
const buildGrafData = (records) => {
  const bySem  = {};
  const byPart = {};
  records.forEach(r => {
    if (!r) return;
    const s = r.semana;
    const p = (r._partidaCanonica || r.partida || '').toUpperCase().trim();
    if (s == null) return;
    if (!bySem[s])  bySem[s]  = { semana:s, hhR:0, hhM:0, hhP:0, met:0 };
    if (p && !byPart[p]) byPart[p] = { partida:p, hhR:0, hhM:0, hhP:0 };
    const met = parseFloat(r.metrado) || 0;
    const hh  = parseFloat(r.totalHH) || 0;
    const hhM = (r._ipMeta && met > 0) ? met * r._ipMeta : 0;
    const hhP = (r._ipPpto && met > 0) ? met * r._ipPpto : 0;
    bySem[s].hhR += hh; bySem[s].met += met; bySem[s].hhM += hhM; bySem[s].hhP += hhP;
    if (p) { byPart[p].hhR += hh; byPart[p].hhM += hhM; byPart[p].hhP += hhP; }
  });
  const semanas = Object.values(bySem).sort((a,b)=>a.semana-b.semana).map(s => ({
    semana: `S${s.semana}`,
    'IP Real': s.met > 0 ? parseFloat((s.hhR / s.met).toFixed(3)) : 0,
    'HH Real': parseFloat(s.hhR.toFixed(1)),
    'HH Meta': parseFloat(s.hhM.toFixed(1)),
    'HH Ppto': parseFloat(s.hhP.toFixed(1)),
    CPI: s.hhR > 0 ? parseFloat((s.hhM / s.hhR).toFixed(2)) : 1,
  }));
  let aR = 0, aM = 0, aP = 0;
  const acumulado = semanas.map(s => {
    aR += s['HH Real']; aM += s['HH Meta']; aP += s['HH Ppto'];
    return {
      semana: s.semana,
      'HH Real Acum': parseFloat(aR.toFixed(1)),
      'HH Meta Acum': parseFloat(aM.toFixed(1)),
      'HH Ppto Acum': parseFloat(aP.toFixed(1)),
      'CPI Acum': aR > 0 ? parseFloat((aM / aR).toFixed(2)) : 1,
      'CPI Ppto': aR > 0 ? parseFloat((aP / aR).toFixed(2)) : 1,
    };
  });
  const porPartida = Object.values(byPart).map(d => ({
    partida: d.partida,
    'HH Real': parseFloat(d.hhR.toFixed(1)),
    'HH Meta': parseFloat(d.hhM.toFixed(1)),
    'HH Ppto': parseFloat(d.hhP.toFixed(1)),
  })).filter(d => d['HH Real'] > 0);
  return { semanas, acumulado, porPartida };
};

// === Paleta semántica unificada (mismas claves que CpiEac.jsx) ===
const PAL = {
  real:     { stroke: BASE.navy, fill: BASE.navy, name: 'REAL' },         // navy
  meta:     { stroke: '#10b981', fill: '#10b981', name: 'META' },          // verde
  ppt:      { stroke: BASE.gold, fill: BASE.gold, name: 'PRESUPUESTO' },   // ámbar
  cpi:      { stroke: '#4F46E5', fill: '#4F46E5', name: 'CPI' },           // indigo (marca)
  forecast: { stroke: '#0E7490', fill: '#0E7490', name: 'FORECAST' },      // cyan profundo (marca)
  // Bandas de estado (para CPI)
  optimo:   { fill: '#10b981', alpha: 0.06 },
  alerta:   { fill: '#f59e0b', alpha: 0.06 },
  critico:  { fill: '#ef4444', alpha: 0.06 },
};

// === Formato compacto para ejes (1500 → 1.5k, 1500000 → 1.5M) ===
const fmtK = (v) => {
  if (v === null || v === undefined) return '';
  const n = Math.abs(v);
  if (n >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return `${v}`;
};

// === Tooltip premium ===
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'#fff',
      border:'1px solid #e2e8f0',
      borderRadius:'10px',
      padding:'0',
      fontSize:'12px',
      boxShadow:'0 8px 24px rgba(15,23,42,0.18)',
      fontFamily: BASE.font || 'system-ui',
      minWidth:'180px',
      overflow:'hidden',
    }}>
      <div style={{
        background:BASE.navy,
        color:'#fff',
        padding:'8px 14px',
        fontSize:'11px',
        fontWeight:800,
        letterSpacing:'0.6px',
      }}>SEMANA {String(label).replace(/^S/,'')}</div>
      <div style={{padding:'10px 14px'}}>
        {payload.map((p,i)=>{
          const isCPI = (p.name||'').toLowerCase().includes('cpi');
          const valueDisplay = typeof p.value === 'number'
            ? (isCPI ? `${Math.round(p.value * 100)}%` : p.value.toLocaleString('es-PE',{maximumFractionDigits:1}))
            : p.value;
          return (
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'18px',padding:'3px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{width:'10px',height:'10px',borderRadius:'3px',background:p.color,flexShrink:0}}/>
                <span style={{color:'#475569',fontSize:'11px',fontWeight:600}}>{p.name}</span>
              </div>
              <strong style={{
                color:p.color,fontSize:'12px',
                fontFamily:'var(--grapco-font-mono, monospace)',
                fontFeatureSettings:'"tnum" 1',
              }}>{valueDisplay}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// === Tabla compacta con los DATOS detrás del gráfico (toggle on/off) ===
const TablaDatos = ({ data, cols }) => {
  if (!data || !data.length) return null;
  return (
    <div style={{ marginTop: '14px', borderTop: `1px dashed ${BASE.border}`, paddingTop: '12px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '800', color: BASE.muted,
        letterSpacing: '0.6px', marginBottom: '6px',
      }}>DATOS DEL GRÁFICO</div>
      <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto', border: `1px solid ${BASE.border}`, borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '320px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              {cols.map(c => (
                <th key={c.key} style={{
                  padding: '8px 10px', background: BASE.bgSoft, color: BASE.navy,
                  fontSize: '10px', fontWeight: '800', letterSpacing: '0.4px',
                  textAlign: c.align || 'right', borderBottom: `1.5px solid ${BASE.border}`,
                  whiteSpace: 'nowrap',
                }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{
                borderBottom: `1px solid ${BASE.border}`,
                background: i % 2 ? '#fafbfc' : '#fff',
              }}>
                {cols.map(c => {
                  const raw = row[c.key];
                  const v = c.fmt ? c.fmt(raw, row) : (raw ?? '—');
                  return (
                    <td key={c.key} style={{
                      padding: '6px 10px', textAlign: c.align || 'right',
                      fontFamily: c.mono === false ? 'inherit' : 'var(--grapco-font-mono, monospace)',
                      fontFeatureSettings: '"tnum" 1',
                      fontWeight: c.bold ? '700' : '500',
                      color: c.color || BASE.text,
                      whiteSpace: 'nowrap',
                    }}>{v}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// === Card contenedor con header refinado ===
const ChartCard = ({ title, subtitle, children, full, color = PAL.real.stroke, kpi = null, tabla = null }) => (
  <div style={{
    background:BASE.white,
    borderRadius:'14px',
    border:`1px solid ${BASE.border}`,
    padding:'18px 20px',
    gridColumn:full?'1/-1':'auto',
    boxShadow:'0 1px 3px rgba(15,23,42,0.04)',
    display:'flex',flexDirection:'column',
  }}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:'14px',paddingBottom:'12px',borderBottom:`1px solid ${BASE.border}`}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{width:'4px',height:'30px',background:color,borderRadius:'2px'}}/>
        <div>
          <h3 style={{fontSize:'13px',fontWeight:'800',color:BASE.navy,letterSpacing:'0.2px',textTransform:'uppercase',margin:0}}>{title}</h3>
          <p style={{fontSize:'11px',color:BASE.muted,marginTop:'3px',marginBottom:0}}>{subtitle}</p>
        </div>
      </div>
      {kpi && (
        <div style={{
          display:'flex',alignItems:'center',gap:'6px',
          background:`${kpi.color}15`,color:kpi.color,
          padding:'4px 10px',borderRadius:'999px',
          fontSize:'10px',fontWeight:800,letterSpacing:'0.4px',
          border:`1px solid ${kpi.color}33`,whiteSpace:'nowrap',
        }}>
          <span style={{fontFamily:'var(--grapco-font-mono, monospace)'}}>{kpi.value}</span>
          <span style={{opacity:0.75}}>{kpi.label}</span>
        </div>
      )}
    </div>
    {children}
    {tabla}
  </div>
);

// === Sin datos ===
const noData = (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px',color:BASE.muted}}>
    <span style={{fontSize:'28px',marginBottom:'8px',opacity:0.5}}>—</span>
    <p style={{fontSize:'12px',fontWeight:'600'}}>Sin datos para graficar</p>
  </div>
);

// === Leyenda interactiva (custom): click para toggle series ===
const renderLegend = (hidden, setHidden) => ({ payload }) => (
  <ul style={{display:'flex',justifyContent:'center',gap:'18px',padding:0,margin:'8px 0 0',listStyle:'none',flexWrap:'wrap'}}>
    {payload.map((entry, idx) => {
      const isOff = hidden.has(entry.dataKey);
      return (
        <li key={idx} onClick={() => {
            const next = new Set(hidden);
            if (next.has(entry.dataKey)) next.delete(entry.dataKey);
            else next.add(entry.dataKey);
            setHidden(next);
          }}
          style={{
            display:'inline-flex',alignItems:'center',gap:'6px',
            fontSize:'11px',fontWeight:700,color: isOff ? BASE.mutedSoft : BASE.text,
            cursor:'pointer',userSelect:'none',
            padding:'4px 10px',borderRadius:'6px',
            background: isOff ? 'transparent' : BASE.bgSoft,
            border:`1px solid ${isOff ? BASE.border : entry.color + '44'}`,
            transition:'all 0.15s',
          }}>
          <span style={{
            width:'10px',height:'10px',borderRadius:'2px',
            background: isOff ? BASE.mutedSoft : entry.color,
            opacity: isOff ? 0.4 : 1,
          }}/>
          <span style={{textDecoration: isOff ? 'line-through' : 'none'}}>{entry.value}</span>
        </li>
      );
    })}
  </ul>
);

// === Tick custom: parte el label en HASTA 3 líneas, horizontal, sin solape ===
// Trunca palabras > 13 chars y centra cada línea bajo el bar.
const wrapTexto = (txt, maxChars = 13) => {
  const palabras = String(txt || '').split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    // Trunca palabra si excede el máximo (no debería ocurrir mucho)
    const palabra = p.length > maxChars ? p.slice(0, maxChars - 1) + '…' : p;
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (tentativa.length <= maxChars) {
      actual = tentativa;
    } else {
      if (actual) lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  // Máximo 3 líneas — si queda más, la última con elipsis
  if (lineas.length > 3) {
    return [...lineas.slice(0, 2), lineas.slice(2).join(' ').slice(0, maxChars - 1) + '…'];
  }
  return lineas;
};

const TwoLineTick = ({ x, y, payload }) => {
  const txt = String(payload?.value ?? '');
  const lineas = wrapTexto(txt, 13);
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{txt}</title>
      <text textAnchor="middle" fill="#475569" fontSize={9.5} fontWeight={600}>
        {lineas.map((l, i) => (
          <tspan key={i} x="0" dy={i === 0 ? 12 : 11}>{l}</tspan>
        ))}
      </text>
    </g>
  );
};

export default function Graficos({ grafData: grafDataOriginal, filtrados = [], wbs = {} }) {
  // === FILTRO GLOBAL: aplica a todos los charts ===
  const [fPartida,   setFPartida]   = useState('');
  const [fActividad, setFActividad] = useState('');

  // Listas para los dropdowns derivadas de filtrados (lo que el usuario realmente tiene)
  const { partidasDisponibles, actividadesDisponibles } = useMemo(() => {
    const setP = new Set();
    const mapPA = {}; // partida → Set de actividades
    (filtrados || []).forEach(r => {
      const p = (r._partidaCanonica || r.partida || '').toUpperCase().trim();
      const a = (r._actividadCanonica || r.actividad || '').toUpperCase().trim();
      if (!p) return;
      setP.add(p);
      if (!mapPA[p]) mapPA[p] = new Set();
      if (a) mapPA[p].add(a);
    });
    const acts = fPartida && mapPA[fPartida]
      ? Array.from(mapPA[fPartida]).sort()
      : Array.from(new Set(Object.values(mapPA).flatMap(s => Array.from(s)))).sort();
    return {
      partidasDisponibles: Array.from(setP).sort(),
      actividadesDisponibles: acts,
    };
  }, [filtrados, fPartida]);

  // Registros filtrados por la selección global
  const registrosFiltrados = useMemo(() => {
    if (!fPartida && !fActividad) return filtrados;
    return (filtrados || []).filter(r => {
      const p = (r._partidaCanonica  || r.partida   || '').toUpperCase().trim();
      const a = (r._actividadCanonica || r.actividad || '').toUpperCase().trim();
      if (fPartida   && p !== fPartida)   return false;
      if (fActividad && a !== fActividad) return false;
      return true;
    });
  }, [filtrados, fPartida, fActividad]);

  // grafData recalculado on-the-fly según filtro. Si no hay filtrados (caso edge), usa el original.
  const grafData = useMemo(() => {
    if (!filtrados || !filtrados.length) return grafDataOriginal;
    return buildGrafData(registrosFiltrados);
  }, [registrosFiltrados, filtrados, grafDataOriginal]);

  // Estado de series ocultas (por chart)
  const [hidSem,    setHidSem]    = useState(new Set());
  const [hidCpi,    setHidCpi]    = useState(new Set());
  const [hidCurva,  setHidCurva]  = useState(new Set());
  const [hidPart,   setHidPart]   = useState(new Set());
  const [hidComp,   setHidComp]   = useState(new Set());

  // Toggle: mostrar la tabla con los datos crudos detrás de cada gráfico.
  // Útil para "leer los números" cuando la curva sola no basta.
  const [mostrarTabla, setMostrarTabla] = useState(false);

  // Formatos reutilizables para las tablas de datos
  const fmtHH = (v) => (v != null ? Number(v).toFixed(1) : '—');
  const fmtPct = (v) => (v != null ? `${Math.round(Number(v) * 100)}%` : '—');
  const fmtIP = (v) => (v != null ? Number(v).toFixed(3) : '—');
  const colorEstadoCPI = (v) => v == null ? BASE.muted : v >= 1 ? '#15803d' : v >= 0.85 ? '#b45309' : '#b91c1c';

  // KPIs derivados (mostrar último valor)
  const ultIP   = grafData.semanas?.[grafData.semanas.length-1]?.['IP Real'];
  const ultCPI  = grafData.acumulado?.[grafData.acumulado.length-1]?.['CPI Acum'];

  // Reset cascada: si cambia partida, limpiar actividad si no pertenece
  const onPartidaChange = (v) => {
    setFPartida(v);
    if (fActividad && v && !actividadesDisponibles.includes(fActividad)) setFActividad('');
  };
  const limpiarFiltros = () => { setFPartida(''); setFActividad(''); };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

      <VistaHeader icono="barChart3" eyebrow="Producción"
        titulo="Gráficos de Producción"
        subtitulo="HH real / meta / presupuesto y CPI por semana y acumulado" />

      {/* === BARRA DE FILTRO GLOBAL === */}
      <div style={{
        background:BASE.white,
        borderRadius:'12px',
        border:`1px solid ${BASE.border}`,
        padding:'12px 16px',
        display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',
      }}>
        <span style={{fontSize:'10px',fontWeight:'800',color:BASE.muted,letterSpacing:'0.6px'}}>
          FILTRAR GRÁFICOS:
        </span>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{fontSize:'10px',fontWeight:'700',color:BASE.muted}}>Partida</span>
          <select value={fPartida} onChange={e=>onPartidaChange(e.target.value)} style={{
            padding:'7px 12px',borderRadius:'8px',
            border:`1.5px solid ${fPartida ? BASE.navyLight : BASE.border}`,
            background: fPartida ? BASE.navySoft : '#fff',
            color: fPartida ? BASE.navy : BASE.muted,
            fontSize:'11.5px',fontWeight:'700',cursor:'pointer',outline:'none',
            minWidth:'180px',
          }}>
            <option value="">Todas las partidas</option>
            {partidasDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{fontSize:'10px',fontWeight:'700',color:BASE.muted}}>Actividad</span>
          <select value={fActividad} onChange={e=>setFActividad(e.target.value)} style={{
            padding:'7px 12px',borderRadius:'8px',
            border:`1.5px solid ${fActividad ? BASE.gold : BASE.border}`,
            background: fActividad ? BASE.goldLight : '#fff',
            color: fActividad ? BASE.goldDark : BASE.muted,
            fontSize:'11.5px',fontWeight:'700',cursor:'pointer',outline:'none',
            minWidth:'240px',maxWidth:'380px',
          }}>
            <option value="">Todas las actividades</option>
            {actividadesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {(fPartida || fActividad) && (
          <button onClick={limpiarFiltros} style={{
            padding:'7px 12px',borderRadius:'8px',
            background:'#fee2e2',color:'#b91c1c',border:'1.5px solid #fca5a5',
            fontSize:'10.5px',fontWeight:'800',cursor:'pointer',
            display:'flex',alignItems:'center',gap:'5px',
          }}>
            ✕ Limpiar
          </button>
        )}
        {(fPartida || fActividad) && (
          <span style={{
            fontSize:'10.5px',fontWeight:'700',
            color:BASE.navy,background:BASE.navySoft,
            padding:'5px 10px',borderRadius:'999px',
            border:`1px solid ${BASE.border}`,
          }}>
            {registrosFiltrados.length} registros · {grafData.semanas?.length || 0} semanas
          </span>
        )}

        {/* Toggle: ver/ocultar tablas de datos debajo de cada gráfico */}
        <button onClick={() => setMostrarTabla(v => !v)}
          title={mostrarTabla ? 'Ocultar las tablas de datos' : 'Ver las tablas con los números detrás de cada gráfico'}
          style={{
            marginLeft: 'auto',
            padding: '7px 14px', borderRadius: '8px',
            background: mostrarTabla ? BASE.navy : '#fff',
            color: mostrarTabla ? '#fff' : BASE.navy,
            border: `1.5px solid ${mostrarTabla ? BASE.navy : BASE.border}`,
            fontSize: '11px', fontWeight: '800', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            letterSpacing: '0.3px',
          }}>
          <span>{mostrarTabla ? '📊✕' : '📋'}</span>
          {mostrarTabla ? 'Ocultar datos' : 'Ver datos en tabla'}
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',gap:'14px'}}>

      {/* === PRIMER CHART: dinámico según filtro ===
          - Sin actividad filtrada → CPI Semanal (eficiencia HH, dimensional-independiente).
          - Con actividad filtrada → IP Real semanal de esa actividad (unidad consistente). */}
      <ChartCard
        full
        title={fActividad ? `IP Real por Semana — ${fActividad}` : 'CPI Semanal'}
        subtitle={fActividad
          ? 'HH/Metrado de la actividad seleccionada · bajar es mejor'
          : 'Eficiencia semanal HH Meta vs HH Real · ≥100% bajo presupuesto. (El IP agregado no es válido con unidades mixtas — filtra una actividad para verlo.)'}
        color={fActividad ? PAL.real.stroke : PAL.cpi.stroke}
        kpi={
          fActividad
            ? (ultIP != null ? { value: ultIP.toFixed(2), label: 'última', color: PAL.real.stroke } : null)
            : (ultCPI != null ? {
                value: `${Math.round(ultCPI*100)}%`,
                label: ultCPI >= 1 ? 'óptimo' : ultCPI >= 0.85 ? 'alerta' : 'crítico',
                color: ultCPI >= 1 ? '#16a34a' : ultCPI >= 0.85 ? '#d97706' : '#dc2626',
              } : null)
        }
        tabla={mostrarTabla ? (
          <TablaDatos data={grafData.semanas} cols={fActividad ? [
            { key: 'semana', label: 'Semana', align: 'left', bold: true, mono: false },
            { key: 'IP Real', label: 'IP Real', fmt: fmtIP },
            { key: 'HH Real', label: 'HH Real', fmt: fmtHH },
            { key: 'HH Meta', label: 'HH Meta', fmt: fmtHH, color: PAL.meta.stroke },
          ] : [
            { key: 'semana', label: 'Semana', align: 'left', bold: true, mono: false },
            { key: 'HH Real', label: 'HH Real', fmt: fmtHH },
            { key: 'HH Meta', label: 'HH Meta', fmt: fmtHH, color: PAL.meta.stroke },
            { key: 'HH Ppto', label: 'HH Ppto', fmt: fmtHH, color: PAL.ppt.stroke },
            { key: 'CPI', label: 'CPI %', fmt: fmtPct, bold: true, color: BASE.navy },
          ]}/>
        ) : null}
      >
        {!grafData.semanas.length ? noData : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={grafData.semanas} margin={{top:10,right:30,left:10,bottom:10}}>
              <CartesianGrid {...GRILLA}/>
              <XAxis {...EJE} dataKey="semana" tickMargin={8}/>
              {fActividad ? (
                <YAxis {...EJE} tickMargin={6} tickFormatter={fmtK}/>
              ) : (
                <YAxis {...EJE} domain={[0, 1.6]} tickMargin={6}
                  tickFormatter={v => `${Math.round(v * 100)}%`}/>
              )}
              <Tooltip content={<Tip/>} cursor={{stroke:'#cbd5e1',strokeWidth:1,strokeDasharray:'3 3'}}/>
              <Legend content={renderLegend(hidSem, setHidSem)} verticalAlign="bottom"/>
              {/* Bandas semafóricas solo cuando es CPI */}
              {!fActividad && <>
                <ReferenceArea y1={1} y2={1.6} fill={PAL.optimo.fill} fillOpacity={PAL.optimo.alpha} ifOverflow="hidden"/>
                <ReferenceArea y1={0.85} y2={1} fill={PAL.alerta.fill} fillOpacity={PAL.alerta.alpha} ifOverflow="hidden"/>
                <ReferenceArea y1={0} y2={0.85} fill={PAL.critico.fill} fillOpacity={PAL.critico.alpha} ifOverflow="hidden"/>
                <ReferenceLine y={1} stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1.5}/>
                <ReferenceLine y={0.85} stroke="#d97706" strokeDasharray="4 2" strokeWidth={1.5}/>
              </>}
              <Line type="monotone"
                dataKey={fActividad ? 'IP Real' : 'CPI'}
                stroke={fActividad ? PAL.real.stroke : PAL.cpi.stroke}
                strokeWidth={2.5}
                hide={hidSem.has(fActividad ? 'IP Real' : 'CPI')}
                dot={{r:4,fill:fActividad ? PAL.real.stroke : PAL.cpi.stroke,strokeWidth:2,stroke:'#fff'}}
                activeDot={{r:7,strokeWidth:2,stroke:'#fff'}}
                animationDuration={500}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* === CPI % ACUMULADO con bandas semafóricas === */}
      <ChartCard
        title="CPI % Acumulado"
        subtitle="Eficiencia acumulada · zona verde = óptimo, ámbar = alerta, roja = crítico"
        color={PAL.cpi.stroke}
        kpi={ultCPI != null ? {
          value: `${Math.round(ultCPI*100)}%`,
          label: ultCPI >= 1 ? 'óptimo' : ultCPI >= 0.85 ? 'alerta' : 'crítico',
          color: ultCPI >= 1 ? '#16a34a' : ultCPI >= 0.85 ? '#d97706' : '#dc2626',
        } : null}
        tabla={mostrarTabla ? (
          <TablaDatos data={grafData.acumulado} cols={[
            { key: 'semana', label: 'Semana', align: 'left', bold: true, mono: false },
            { key: 'HH Real Acum', label: 'Real Acum', fmt: fmtHH },
            { key: 'HH Meta Acum', label: 'Meta Acum', fmt: fmtHH, color: PAL.meta.stroke },
            { key: 'CPI Acum', label: 'CPI Acum', fmt: fmtPct, bold: true, color: BASE.navy },
            { key: 'CPI Ppto', label: 'CPI Ppto', fmt: fmtPct, color: PAL.ppt.stroke },
          ]}/>
        ) : null}
      >
        {!grafData.acumulado.length ? noData : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={grafData.acumulado} margin={{top:10,right:30,left:10,bottom:10}}>
              <CartesianGrid {...GRILLA}/>
              <XAxis {...EJE} dataKey="semana" tickMargin={8}/>
              <YAxis {...EJE} domain={[0,1.6]} tickMargin={6}
                tickFormatter={v => `${Math.round(v * 100)}%`}/>
              <Tooltip content={<Tip/>} cursor={{stroke:'#cbd5e1',strokeWidth:1,strokeDasharray:'3 3'}}/>
              <Legend content={renderLegend(hidCpi, setHidCpi)} verticalAlign="bottom"/>
              {/* Bandas semafóricas */}
              <ReferenceArea y1={1} y2={1.6} fill={PAL.optimo.fill} fillOpacity={PAL.optimo.alpha} ifOverflow="hidden"/>
              <ReferenceArea y1={0.85} y2={1} fill={PAL.alerta.fill} fillOpacity={PAL.alerta.alpha} ifOverflow="hidden"/>
              <ReferenceArea y1={0} y2={0.85} fill={PAL.critico.fill} fillOpacity={PAL.critico.alpha} ifOverflow="hidden"/>
              <ReferenceLine y={1} stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1.5}/>
              <ReferenceLine y={0.85} stroke="#d97706" strokeDasharray="4 2" strokeWidth={1.5}/>
              <Line type="monotone" dataKey="CPI Acum" stroke={PAL.real.stroke} strokeWidth={3}
                hide={hidCpi.has('CPI Acum')}
                dot={{r:4,fill:PAL.real.stroke,strokeWidth:2,stroke:'#fff'}}
                activeDot={{r:7,strokeWidth:2,stroke:'#fff'}}
                animationDuration={500}/>
              <Line type="monotone" dataKey="CPI Ppto" stroke={PAL.ppt.stroke} strokeWidth={2}
                hide={hidCpi.has('CPI Ppto')}
                dot={{r:3,fill:PAL.ppt.stroke,strokeWidth:2,stroke:'#fff'}}
                strokeDasharray="5 3" animationDuration={500}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* === CURVA S — HH REAL vs META ACUM === */}
      <ChartCard
        title="Curva S — HH Real vs Meta"
        subtitle="Avance acumulado del proyecto en horas hombre"
        color={PAL.meta.stroke}
        tabla={mostrarTabla ? (
          <TablaDatos data={grafData.acumulado} cols={[
            { key: 'semana', label: 'Semana', align: 'left', bold: true, mono: false },
            { key: 'HH Meta Acum', label: 'HH Meta Acum', fmt: fmtHH, color: PAL.meta.stroke },
            { key: 'HH Real Acum', label: 'HH Real Acum', fmt: fmtHH, bold: true },
            { key: 'HH Ppto Acum', label: 'HH Ppto Acum', fmt: fmtHH, color: PAL.ppt.stroke },
          ]}/>
        ) : null}
      >
        {!grafData.acumulado.length ? noData : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={grafData.acumulado} margin={{top:10,right:30,left:10,bottom:10}}>
              <defs>
                {degradado('grad_curvaMeta', PAL.meta.stroke)}
                {degradado('grad_curvaReal', PAL.real.stroke)}
              </defs>
              <CartesianGrid {...GRILLA}/>
              <XAxis {...EJE} dataKey="semana" tickMargin={8}/>
              <YAxis {...EJE} tickMargin={6} tickFormatter={fmtK}/>
              <Tooltip content={<Tip/>} cursor={{stroke:'#cbd5e1',strokeWidth:1,strokeDasharray:'3 3'}}/>
              <Legend content={renderLegend(hidCurva, setHidCurva)} verticalAlign="bottom"/>
              <Area type="monotone" dataKey="HH Meta Acum" stroke={PAL.meta.stroke} fill="url(#grad_curvaMeta)"
                strokeWidth={2.5} strokeDasharray="5 3" hide={hidCurva.has('HH Meta Acum')} animationDuration={500}/>
              <Area type="monotone" dataKey="HH Real Acum" stroke={PAL.real.stroke} fill="url(#grad_curvaReal)"
                strokeWidth={2.5} hide={hidCurva.has('HH Real Acum')} animationDuration={500}/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* === HH POR PARTIDA — REAL vs META vs PPT ===
          Cada partida necesita ~110px para que el label horizontal de 2-3 líneas no
          se solape con el vecino. Si la suma supera el ancho disponible, scroll horizontal. */}
      <ChartCard
        full
        title="HH por Partida"
        subtitle="Real vs Meta vs Presupuesto · barras agrupadas"
        color={PAL.ppt.stroke}
        tabla={mostrarTabla ? (
          <TablaDatos data={grafData.porPartida} cols={[
            { key: 'partida', label: 'Partida', align: 'left', bold: true, mono: false },
            { key: 'HH Real', label: 'HH Real', fmt: fmtHH, bold: true },
            { key: 'HH Meta', label: 'HH Meta', fmt: fmtHH, color: PAL.meta.stroke },
            { key: 'HH Ppto', label: 'HH Ppto', fmt: fmtHH, color: PAL.ppt.stroke },
          ]}/>
        ) : null}
      >
        {!grafData.porPartida.length ? noData : (() => {
          const ANCHO_POR_PARTIDA = 110;
          const minW = Math.max(600, grafData.porPartida.length * ANCHO_POR_PARTIDA);
          return (
            <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
              <div style={{ minWidth: `${minW}px`, height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafData.porPartida} margin={{top:10,right:20,left:10,bottom:60}} barCategoryGap="25%">
                    <CartesianGrid {...GRILLA}/>
                    <XAxis {...EJE} dataKey="partida" tick={<TwoLineTick/>} interval={0} height={65}/>
                    <YAxis {...EJE} tickMargin={6} tickFormatter={fmtK}/>
                    <Tooltip content={<Tip/>} cursor={{fill:'#0f1f3a08'}}/>
                    <Legend content={renderLegend(hidPart, setHidPart)} verticalAlign="top"/>
                    <Bar {...BARRA} dataKey="HH Meta" fill={PAL.meta.fill}
                      hide={hidPart.has('HH Meta')} animationDuration={500}/>
                    <Bar {...BARRA} dataKey="HH Real" fill={PAL.real.fill}
                      hide={hidPart.has('HH Real')} animationDuration={500}/>
                    <Bar {...BARRA} dataKey="HH Ppto" fill={PAL.ppt.fill}
                      hide={hidPart.has('HH Ppto')} animationDuration={500}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}
      </ChartCard>

      {/* === HH SEMANAL & CPI % (composed) === */}
      <ChartCard
        full
        title="HH Semanal & CPI"
        subtitle="Volumen de trabajo (barras) y eficiencia (línea) por semana"
        color={PAL.cpi.stroke}
        tabla={mostrarTabla ? (
          <TablaDatos data={grafData.semanas} cols={[
            { key: 'semana', label: 'Semana', align: 'left', bold: true, mono: false },
            { key: 'HH Real', label: 'HH Real', fmt: fmtHH, bold: true },
            { key: 'HH Meta', label: 'HH Meta', fmt: fmtHH, color: PAL.meta.stroke },
            { key: 'CPI', label: 'CPI %', fmt: fmtPct, bold: true, color: BASE.navy },
          ]}/>
        ) : null}
      >
        {!grafData.semanas.length ? noData : (
          <ResponsiveContainer width="100%" height={310}>
            <ComposedChart data={grafData.semanas} margin={{top:10,right:30,left:10,bottom:10}}>
              <CartesianGrid {...GRILLA}/>
              <XAxis {...EJE} dataKey="semana" tickMargin={8}/>
              <YAxis {...EJE} yAxisId="left" tickMargin={6} tickFormatter={fmtK}
                label={{value:'HH',angle:-90,position:'insideLeft',style:{fontSize:10,fill:'#64748b',fontWeight:700}}}/>
              <YAxis {...EJE} yAxisId="right" orientation="right" domain={[0, 1.6]} tickMargin={6}
                tickFormatter={v => `${Math.round(v * 100)}%`}
                label={{value:'CPI',angle:90,position:'insideRight',style:{fontSize:10,fill:'#64748b',fontWeight:700}}}/>
              <Tooltip content={<Tip/>} cursor={{fill:'#0f1f3a08'}}/>
              <Legend content={renderLegend(hidComp, setHidComp)} verticalAlign="top"/>
              <ReferenceLine yAxisId="right" y={1} stroke={PAL.meta.stroke} strokeDasharray="4 2" strokeWidth={1.5}/>
              <Bar {...BARRA} yAxisId="left" dataKey="HH Real" fill={PAL.real.fill}
                hide={hidComp.has('HH Real')} animationDuration={500}/>
              <Bar {...BARRA} yAxisId="left" dataKey="HH Meta" fill={PAL.meta.fill} opacity={0.65}
                hide={hidComp.has('HH Meta')} animationDuration={500}/>
              <Line yAxisId="right" type="monotone" dataKey="CPI" stroke={PAL.cpi.stroke} strokeWidth={3}
                hide={hidComp.has('CPI')}
                dot={{r:4,fill:PAL.cpi.stroke,strokeWidth:2,stroke:'#fff'}}
                activeDot={{r:7,strokeWidth:2,stroke:'#fff'}}
                animationDuration={500}/>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      </div>
    </div>
  );
}
