// src/views/ingeniero/CpiEac.jsx — V2 con CPI % y badges
import React, { useState, useMemo } from 'react';
import { INFO_MAP } from '../utils/constants';
import { BASE } from '../utils/styles';
import { calcCPI, fmtCPIPct, fmt1, fmt2, getEstado } from '../utils/helpers';
import VistaHeader from '../components/VistaHeader';

// Badge para etiquetas de tipo de dato
const Badge = ({ tipo }) => {
  const cfg = {
    REAL:        { bg: BASE.navy,    color: '#fff' },
    META:        { bg: BASE.green,   color: '#fff' },
    PPT:         { bg: BASE.orange,  color: '#fff' },
    PROYECTADO:  { bg: '#7c3aed',    color: '#fff' },
  }[tipo] || { bg: '#94a3b8', color: '#fff' };
  return (
    <span style={{
      display:'inline-block',
      background: cfg.bg, color: cfg.color,
      padding:'2px 8px', borderRadius:'4px',
      fontSize:'9px', fontWeight:'800', letterSpacing:'0.5px',
      marginLeft:'6px', verticalAlign:'middle',
    }}>{tipo}</span>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Modal: ajustar saldo / marcar terminada para UNA actividad. Solo se permite
// editar el saldo manualmente cuando el metrado actual ya superó al contractual
// (regla del usuario).
// ────────────────────────────────────────────────────────────────────────────
function ModalAjustarSaldo({ datos, onCerrar, onGuardar }) {
  const { act, ad, aMetRef, partida, subpartida, actividad } = datos;
  const [terminada, setTerminada] = useState(!!ad.terminada);
  const [override, setOverride] = useState(ad.saldoOverride != null ? String(ad.saldoOverride) : '');
  const [guardando, setGuardando] = useState(false);
  const sobrepasado = act.met > aMetRef;
  const puedeOverride = !terminada && sobrepasado;

  const guardar = async () => {
    setGuardando(true);
    try {
      await onGuardar({
        terminada,
        saldoOverride: (puedeOverride && override.trim() !== '') ? parseFloat(override) : null,
      });
      onCerrar();
    } finally { setGuardando(false); }
  };

  return (
    <div onClick={onCerrar} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:'14px', maxWidth:'440px', width:'100%',
        boxShadow:'0 24px 64px rgba(0,0,0,0.25)', overflow:'hidden',
      }}>
        <div style={{padding:'14px 18px', background:BASE.navy, color:'#fff'}}>
          <p style={{fontSize:'11px', fontWeight:'700', letterSpacing:'1px', opacity:0.7, margin:0}}>AJUSTAR ACTIVIDAD</p>
          <p style={{fontSize:'14px', fontWeight:'800', margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{actividad}</p>
          <p style={{fontSize:'10px', opacity:0.6, margin:'2px 0 0'}}>{partida} · {subpartida}</p>
        </div>
        <div style={{padding:'18px'}}>
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px',
            background:BASE.bgSoft, border:`1px solid ${BASE.border}`,
            borderRadius:'8px', padding:'10px 12px', marginBottom:'16px',
          }}>
            <div>
              <p style={{fontSize:'9.5px', color:BASE.muted, fontWeight:'800', letterSpacing:'0.5px', margin:0}}>METRADO ACTUAL</p>
              <p style={{fontSize:'16px', fontWeight:'900', color:BASE.navy, margin:'2px 0 0', fontFamily:'var(--grapco-font-mono, monospace)'}}>
                {act.met.toFixed(2)} <span style={{fontSize:'10px', color:BASE.muted}}>{ad.un||'UND'}</span>
              </p>
            </div>
            <div>
              <p style={{fontSize:'9.5px', color:BASE.muted, fontWeight:'800', letterSpacing:'0.5px', margin:0}}>METRADO CONTRACTUAL</p>
              <p style={{fontSize:'16px', fontWeight:'900', color:BASE.navy, margin:'2px 0 0', fontFamily:'var(--grapco-font-mono, monospace)'}}>
                {aMetRef.toFixed(2)} <span style={{fontSize:'10px', color:BASE.muted}}>{ad.un||'UND'}</span>
              </p>
            </div>
          </div>

          <label style={{
            display:'flex', alignItems:'center', gap:'12px',
            padding:'12px 14px', borderRadius:'10px',
            background: terminada ? '#dcfce7' : '#f8fafc',
            border:`1.5px solid ${terminada ? '#22c55e' : BASE.border}`,
            cursor:'pointer', marginBottom:'14px',
          }}>
            <input type="checkbox" checked={terminada} onChange={e => setTerminada(e.target.checked)} style={{width:'18px', height:'18px', cursor:'pointer', accentColor:'#22c55e'}}/>
            <div style={{flex:1}}>
              <p style={{fontSize:'13px', fontWeight:'800', color:BASE.navy, margin:0}}>Marcar como terminada</p>
              <p style={{fontSize:'11px', color:BASE.muted, margin:'2px 0 0'}}>El saldo queda en 0 y deja de proyectarse HH pendientes.</p>
            </div>
          </label>

          <div style={{
            padding:'12px 14px', borderRadius:'10px',
            background: puedeOverride ? '#fffaf2' : '#f8fafc',
            border:`1.5px solid ${puedeOverride ? '#fcd34d' : BASE.border}`,
            opacity: puedeOverride ? 1 : 0.6,
          }}>
            <p style={{fontSize:'13px', fontWeight:'800', color:BASE.navy, margin:0}}>Saldo de metrado manual</p>
            <p style={{fontSize:'11px', color:BASE.muted, margin:'2px 0 8px'}}>
              {sobrepasado
                ? 'El metrado actual ya superó al contractual. Define cuánto saldo de metrado queda realmente por ejecutar.'
                : 'Solo se habilita cuando el metrado actual supera al contractual.'}
            </p>
            <input
              type="number" min="0" step="0.01"
              value={override}
              disabled={!puedeOverride}
              onChange={e => setOverride(e.target.value)}
              placeholder={puedeOverride ? '0.00' : '—'}
              style={{
                width:'100%', padding:'10px 12px', borderRadius:'8px',
                border:`1.5px solid ${puedeOverride ? '#fcd34d' : BASE.border}`,
                fontSize:'14px', fontWeight:'700', fontFamily:'var(--grapco-font-mono, monospace)',
                background: puedeOverride ? '#fff' : BASE.bgSoft, outline:'none',
              }}
            />
          </div>
        </div>
        <div style={{
          padding:'12px 18px', background:BASE.bgSoft, borderTop:`1px solid ${BASE.border}`,
          display:'flex', gap:'10px', justifyContent:'flex-end',
        }}>
          <button onClick={onCerrar} disabled={guardando} style={{
            padding:'10px 18px', borderRadius:'8px', background:'#fff', color:BASE.navy,
            border:`1.5px solid ${BASE.border}`, fontSize:'12px', fontWeight:'700', cursor:'pointer',
          }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{
            padding:'10px 18px', borderRadius:'8px', background:BASE.navy, color:'#fff',
            border:'none', fontSize:'12px', fontWeight:'800', cursor:'pointer', letterSpacing:'0.4px',
            opacity: guardando ? 0.6 : 1,
          }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function CpiEac({ wbs, historial = [], infoMap, onModificarWBS, onActualizarFlags }) {
  // Catálogo de datos: el editable del proyecto, o el fijo del código como respaldo.
  const INFO = infoMap || INFO_MAP;
  const [openP, setOpenP] = useState(null);
  const [openS, setOpenS] = useState(null);
  // Estado del modal "ajustar saldo / terminada" — guarda qué actividad se está editando.
  const [edicion, setEdicion] = useState(null);  // { partida, subpartida, actividad, act, ad }
  // Vista única: META o PPT (no se pueden mezclar; replica el Excel ISP CREDITEX que tiene
  // dos secciones simétricas — una contra meta y otra contra presupuesto).
  const [vista, setVista] = useState('meta');  // 'meta' | 'ppt'
  const esMeta = vista === 'meta';
  // Toggles para mostrar Metrado/HH/IP de PPT y META al lado del nombre de la actividad
  const [chipPpt,  setChipPpt]  = useState(false);
  const [chipMeta, setChipMeta] = useState(false);
  // Mostrar partidas/sub/actividades sin avance (HH=0, metrado=0). Default: true (todo visible).
  const [mostrarVacias, setMostrarVacias] = useState(true);

  // Referencias y colores según vista
  const REF = esMeta
    ? { etiqueta: 'META', color: BASE.green,  bgSoft: '#f0fdf4', tonoSec: '#15803d', hhKey: 'hhM', ipKey: 'ipM', metKey: 'metM' }
    : { etiqueta: 'PPT',  color: BASE.orange, bgSoft: '#fff7ed', tonoSec: '#c2410c', hhKey: 'hhP', ipKey: 'ipP', metKey: 'metP' };

  const ipPorActividad = useMemo(() => {
    const map = {};
    (historial || []).forEach(r => {
      if (!r) return;
      const canon = r._actividadCanonica || (r.actividad || '').trim();
      if (!canon) return;
      if (r._ipMeta && r._ipPpto) {
        if (!map[canon]) map[canon] = { ipM: r._ipMeta, ipP: r._ipPpto, metP: 0 };
        map[canon].metP += parseFloat(r.metrado) || 0;
      }
    });
    return map;
  }, [historial]);

  const obtenerDatosActividad = (aN, met) => {
    const upper = aN.toUpperCase();
    const fromCatalogo = INFO[upper];
    if (fromCatalogo && fromCatalogo.ipM && fromCatalogo.ipP) return fromCatalogo;
    const fromHist = ipPorActividad[aN];
    if (fromHist) {
      return {
        ipM: fromHist.ipM, ipP: fromHist.ipP,
        metP: fromCatalogo?.metP || fromHist.metP || met || 0,
        un:  fromCatalogo?.un   || 'UND',
        terminada: !!fromCatalogo?.terminada,
        saldoOverride: fromCatalogo?.saldoOverride ?? null,
      };
    }
    return {
      ipM: 1, ipP: 1, metP: 0, un: 'UND',
      terminada: !!fromCatalogo?.terminada,
      saldoOverride: fromCatalogo?.saldoOverride ?? null,
    };
  };

  // HH de PRESUPUESTO y META = SIEMPRE del catálogo (metrado × IP del presupuesto),
  // nunca el IP histórico de campo. Si el IP del catálogo es 0 (p.ej. movimiento de
  // tierras subcontratado), el HH presupuestado es 0 — igual que en el ISP del Excel.
  const hhPptDe  = (aN) => { const d = INFO[String(aN).trim().toUpperCase()]; return d ? (parseFloat(d.metP) || 0) * (parseFloat(d.ipP) || 0) : 0; };
  const hhMetaDe = (aN) => { const d = INFO[String(aN).trim().toUpperCase()]; return d ? (parseFloat(d.metM) || 0) * (parseFloat(d.ipM) || 0) : 0; };

  // Calcula el saldo de una actividad respetando los flags:
  //  · terminada:     saldo = 0 (no proyecta más HH); metFinal = lo realmente
  //                   ejecutado (act.met).
  //  · saldoOverride: solo aplica cuando el metrado actual ya superó al
  //                   contractual; saldo = valor manual, metFinal = act.met + sm.
  //  · normal:        saldo = max(0, contractual − actual) (nunca negativo).
  //                   metFinal = max(act.met, contractual) — si el avance
  //                   ya pasó el presupuesto, el ESTIMADO refleja AL MENOS
  //                   lo ejecutado, nunca menos.
  const calcSaldo = (act, ad) => {
    const aMetRef = ad[REF.metKey] || 0;
    const aIpRef  = ad[REF.ipKey]  || 1;
    const terminada = !!ad.terminada;
    const overActual = !terminada && act.met > aMetRef && ad.saldoOverride != null;
    const sm = terminada
      ? 0
      : overActual
        ? Math.max(0, parseFloat(ad.saldoOverride) || 0)
        : Math.max(0, aMetRef - act.met);
    const metFinal = terminada
      ? act.met
      : overActual
        ? act.met + sm
        : Math.max(act.met, aMetRef);
    return { aMetRef, aIpRef, terminada, overActual, sm, metFinal };
  };

  // Celda numérica: alineada a la DERECHA (estándar para datos), monoespaciada tabular.
  // Altura uniforme via padding consistente y vertical-align middle.
  const td = (v, extra={}) => <td style={{
    padding:'10px 8px',
    textAlign:'center',
    minWidth:'62px',
    verticalAlign:'middle',
    borderBottom:`1px solid ${BASE.border}`,
    fontSize:'11px',
    fontFamily:'var(--grapco-font-mono, monospace)',
    fontFeatureSettings:'"tnum" 1',
    whiteSpace:'nowrap',
    ...extra,
  }}>{v}</td>;
  // Separadores entre secciones de columnas (más distintivos para guiar la lectura)
  const SEP = '2px solid #94a3b8';
  const sepRight = { borderRight: SEP };

  // === SISTEMA DE COLOR UNIFICADO ===
  // Headers: todos en navy oscuro + barra de acento por sección (legible y profesional).
  // Tintes de celda muy sutiles (apenas perceptibles) para que los DATOS destaquen.
  const SEC = {
    ppt:      { accent: '#f59e0b', bgCell: '#fffaf2', text: '#92400e' }, // ámbar (presupuesto)
    meta:     { accent: '#10b981', bgCell: '#f3fbf6', text: '#047857' }, // verde (objetivo)
    acum:     { accent: '#eab308', bgCell: '#ffffff', text: '#111827' }, // amarillo (lo actual = blanco)
    saldo:    { accent: '#8b5cf6', bgCell: '#faf8ff', text: '#5b21b6' }, // violeta (pendiente)
    estimado: { accent: '#06b6d4', bgCell: '#f3fbfd', text: '#155e75' }, // cian (proyección)
    forecast: { accent: '#ec4899', bgCell: '#fef5fa', text: '#9d174d' }, // magenta (forecast meta)
  };
  const HEAD_BG = '#0f1f3a';      // navy profundo, igual para todos los headers
  const HEAD_BG2 = '#1a2c4d';     // navy sub-header (un poco más claro)

  // Header de grupo (primera fila): navy + barra de acento abajo
  const thGroup = (color, extra={}) => ({
    padding: '10px 10px',
    background: HEAD_BG,
    color: '#fff',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    borderBottom: `3px solid ${color}`,
    textAlign: 'center',
    ...extra,
  });
  // Sub-header (segunda fila): navy más claro, texto en el accent del grupo
  const thCol = (color, extra={}) => ({
    padding: '9px 10px',
    background: HEAD_BG2,
    color,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    textAlign: 'center',
    textTransform: 'uppercase',
    ...extra,
  });

  // Var (diferencia) con flecha direccional. Útil cuando "+positivo es bueno" (HH ahorradas).
  const fmtVar = (n, { signoPositivoEsBueno = true } = {}) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const v = parseFloat(n);
    if (v === 0) return '0.0';
    const good = signoPositivoEsBueno ? v > 0 : v < 0;
    const arrow = v > 0 ? '▲' : '▼';
    return `${arrow} ${v > 0 ? '+' : ''}${v.toFixed(1)}`;
  };
  const colorVar = (n, { signoPositivoEsBueno = true } = {}) => {
    if (n === null || n === undefined || isNaN(n) || parseFloat(n) === 0) return BASE.muted;
    const good = signoPositivoEsBueno ? parseFloat(n) > 0 : parseFloat(n) < 0;
    return good ? '#15803d' : '#b91c1c';
  };

  const totalSaldo = useMemo(() => {
    let saldoMet = 0, hhSaldoRef = 0, hhSaldoReal = 0, hhEAC = 0, hhRefTotal = 0, hhReal = 0, hhRefAct = 0, hhP = 0, hhM = 0;
    Object.keys(wbs).forEach(pN => {
      const p = wbs[pN];
      hhReal += p.hhR;
      hhRefAct += (p[REF.hhKey] || 0);
      Object.keys(p.subs).forEach(sN => Object.keys(p.subs[sN].acts).forEach(aN => {
        const act = p.subs[sN].acts[aN];
        const ad = obtenerDatosActividad(aN, act.met);
        const { aIpRef: ipRef, sm, metFinal } = calcSaldo(act, ad);
        const ipReal = act.met > 0 ? act.hhR / act.met : ipRef;
        saldoMet    += sm;
        hhSaldoRef  += sm * ipRef;
        hhSaldoReal += sm * ipReal;
        hhEAC       += act.hhR + sm * ipReal;
        hhRefTotal  += metFinal * ipRef;
        hhP += hhPptDe(aN);
        hhM += hhMetaDe(aN);
      }));
    });
    return { saldoMet, hhSaldoRef, hhSaldoReal, hhEAC, hhRefTotal, hhReal, hhRefAct, hhP, hhM };
  }, [wbs, REF.metKey, REF.ipKey, REF.hhKey, INFO]);
  // Estilo de celda para la fila de TOTALES (navy, números claros)
  const TT = (extra = {}) => ({ background: HEAD_BG2, color: '#fff', fontWeight: 800, borderTop: `2px solid ${BASE.gold}`, borderBottom: `2px solid ${BASE.gold}`, ...extra });
  const vcD = (n) => { const v = parseFloat(n); if (!v || isNaN(v)) return 'rgba(255,255,255,0.55)'; return v > 0 ? '#86efac' : '#fca5a5'; };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      <VistaHeader icono="chartBars" eyebrow="Producción"
        titulo="CPI + EAC · Desempeño"
        subtitulo="Eficiencia (CPI) por actividad, valor ganado y proyección de cierre (EAC)" />

      {/* CONTROLES DE VISTA — META o PPT + chips inline */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'12px 16px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
            <span style={{fontSize:'12px',fontWeight:'700',color:BASE.navy}}>📊 ANÁLISIS DE DESEMPEÑO — Informe Semanal de Producción (ISP)</span>
            {onModificarWBS && (
              <button onClick={onModificarWBS} title="Editar partidas, subpartidas, metrados, HH e IP del WBS"
                style={{display:'inline-flex',alignItems:'center',gap:'5px',background:BASE.navy,color:'#fff',border:'none',borderRadius:'8px',padding:'6px 12px',fontSize:'11px',fontWeight:'800',cursor:'pointer',whiteSpace:'nowrap'}}>
                ✏️ Modificar WBS
              </button>
            )}
          </div>
          <div style={{display:'inline-flex',background:'#f1f5f9',borderRadius:'10px',padding:'4px',gap:'4px'}}>
            {[
              {key:'meta', label:'Solo META', icono:'🎯', color:BASE.green,  activeBg:'#fff', activeBorder:'#22c55e'},
              {key:'ppt',  label:'Solo PPT',  icono:'📋', color:BASE.orange, activeBg:'#fff', activeBorder:'#f97316'},
            ].map(b => {
              const activo = vista === b.key;
              return (
                <button key={b.key} onClick={()=>setVista(b.key)}
                  style={{
                    padding:'8px 18px',
                    background: activo ? b.activeBg : 'transparent',
                    color:      activo ? b.color    : BASE.muted,
                    border: `2px solid ${activo ? b.activeBorder : 'transparent'}`,
                    borderRadius:'8px',
                    fontSize:'12px',
                    fontWeight:'800',
                    cursor:'pointer',
                    display:'flex',alignItems:'center',gap:'8px',
                    boxShadow: activo ? `0 2px 6px ${b.activeBorder}33` : 'none',
                    transition:'all 0.15s',
                  }}>
                  <span style={{fontSize:'14px'}}>{b.icono}</span>{b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chips inline: mostrar Metrado/HH/IP de PPT y META al lado del nombre de cada actividad */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'10px',flexWrap:'wrap'}}>
          <span style={{fontSize:'10px',fontWeight:'800',color:BASE.muted,letterSpacing:'0.6px'}}>
            MOSTRAR JUNTO AL NOMBRE DE LA ACTIVIDAD:
          </span>
          {[
            {key:'ppt',  label:'Metrado · HH · IP de Presupuesto', icono:'📋', active:chipPpt,  setter:setChipPpt,  color:BASE.orange, bg:'#fff7ed', border:'#fdba74'},
            {key:'meta', label:'Metrado · HH · IP de Meta',        icono:'🎯', active:chipMeta, setter:setChipMeta, color:BASE.green,  bg:'#f0fdf4', border:'#86efac'},
          ].map(b => (
            <button key={b.key} onClick={()=>b.setter(!b.active)}
              style={{
                padding:'6px 12px',
                background: b.active ? b.bg : '#fff',
                color:      b.active ? b.color : BASE.muted,
                border: `1.5px solid ${b.active ? b.border : BASE.border}`,
                borderRadius:'8px',
                fontSize:'10px',
                fontWeight:'700',
                cursor:'pointer',
                display:'flex',alignItems:'center',gap:'6px',
              }}>
              <span>{b.active?'✓':'○'}</span>
              <span style={{fontSize:'12px'}}>{b.icono}</span>
              {b.label}
            </button>
          ))}

          {/* Separador vertical */}
          <span style={{width:'1px',height:'24px',background:BASE.border,margin:'0 4px'}}/>

          {/* Toggle: mostrar partidas/sub/actividades sin avance */}
          <button onClick={()=>setMostrarVacias(v=>!v)}
            title={mostrarVacias ? 'Ocultar partidas sin avance (HH=0)' : 'Mostrar todas las partidas del catálogo (incluyendo las que aún no tienen avance)'}
            style={{
              padding:'6px 12px',
              background: mostrarVacias ? '#eff6ff' : '#fff',
              color:      mostrarVacias ? BASE.navy : BASE.muted,
              border: `1.5px solid ${mostrarVacias ? '#93c5fd' : BASE.border}`,
              borderRadius:'8px',
              fontSize:'10px',
              fontWeight:'700',
              cursor:'pointer',
              display:'flex',alignItems:'center',gap:'6px',
            }}>
            <span>{mostrarVacias ? '✓' : '○'}</span>
            <span style={{fontSize:'12px'}}>👁️</span>
            Mostrar sin avance
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'900px'}}>
            <thead>
              <tr>
                <th rowSpan="2" style={{position:'sticky',left:0,zIndex:5,padding:'8px 12px',background:HEAD_BG,color:'#fff',textAlign:'left',fontWeight:'800',fontSize:'11px',letterSpacing:'0.6px',minWidth:'240px',borderRight:SEP,borderBottom:`3px solid ${BASE.gold}`,boxShadow:'4px 0 8px -4px rgba(15,23,42,0.25)'}}>WBS</th>
                {chipPpt && (
                  <th colSpan="3" style={thGroup(SEC.ppt.accent,{borderRight:SEP})}>PRESUPUESTO (contractual)</th>
                )}
                {chipMeta && (
                  <th colSpan="3" style={thGroup(SEC.meta.accent,{borderRight:SEP})}>META (objetivo)</th>
                )}
                <th colSpan="6" style={thGroup(SEC.acum.accent,{borderRight:SEP})}>ACUMULADO ACTUAL</th>
                <th colSpan="3" style={thGroup(SEC.saldo.accent,{borderRight:SEP})}>SALDO ACTUAL</th>
                <th colSpan="3" style={thGroup(SEC.estimado.accent,{borderRight:SEP})}>ESTIMADO AL TÉRMINO</th>
                <th colSpan="3" style={thGroup(SEC.forecast.accent,{borderRight:SEP})}>FORECAST {REF.etiqueta}</th>
                <th rowSpan="2" style={{padding:'8px 10px',background:HEAD_BG,color:'#fff',fontSize:'10px',fontWeight:'800',letterSpacing:'0.6px',borderBottom:`3px solid ${BASE.gold}`}}>Estado</th>
              </tr>
              <tr>
                {chipPpt && <>
                  <th style={thCol(SEC.ppt.accent)}>Metrado</th>
                  <th style={thCol(SEC.ppt.accent)}>HH</th>
                  <th style={thCol(SEC.ppt.accent,{borderRight:SEP})}>IP</th>
                </>}
                {chipMeta && <>
                  <th style={thCol(SEC.meta.accent)}>Metrado</th>
                  <th style={thCol(SEC.meta.accent)}>HH</th>
                  <th style={thCol(SEC.meta.accent,{borderRight:SEP})}>IP</th>
                </>}
                <th style={thCol(SEC.acum.accent)}>Metrado</th>
                <th style={thCol(SEC.acum.accent)}>HH</th>
                <th style={thCol(SEC.acum.accent,{borderRight:SEP})}>IP Real</th>
                <th style={thCol(SEC.acum.accent)}>{REF.etiqueta} Act. HH</th>
                <th style={thCol(SEC.acum.accent)}>Var Act. HH</th>
                <th style={thCol(SEC.acum.accent,{borderRight:SEP})}>CPI %</th>
                <th style={thCol(SEC.saldo.accent)}>Metrado</th>
                <th style={thCol(SEC.saldo.accent)}>HH</th>
                <th style={thCol(SEC.saldo.accent,{borderRight:SEP})}>IP</th>
                <th style={thCol(SEC.estimado.accent)}>Metrado</th>
                <th style={thCol(SEC.estimado.accent)}>HH</th>
                <th style={thCol(SEC.estimado.accent,{borderRight:SEP})}>IP</th>
                <th style={thCol(SEC.forecast.accent)}>TOT HH</th>
                <th style={thCol(SEC.forecast.accent)}>Var {REF.etiqueta} HH</th>
                <th style={thCol(SEC.forecast.accent,{borderRight:SEP})}>CPI %</th>
              </tr>
            </thead>
            <tbody>
              {/* ── FILA DE TOTALES DE OBRA (suma de HH de todas las partidas) ── */}
              <tr>
                <td style={{ position:'sticky', left:0, zIndex:4, padding:'10px 14px', background:HEAD_BG, color:'#fff', fontWeight:900, fontSize:'12px', letterSpacing:'0.5px', borderRight:SEP, borderTop:`2px solid ${BASE.gold}`, borderBottom:`2px solid ${BASE.gold}`, whiteSpace:'nowrap', boxShadow:'4px 0 8px -4px rgba(15,23,42,0.25)' }}>Σ TOTAL OBRA · HH</td>
                {chipPpt && <>
                  {td('—', TT({ color:'rgba(255,255,255,0.45)' }))}
                  {td(fmt1(totalSaldo.hhP), TT())}
                  {td('—', TT({ color:'rgba(255,255,255,0.45)', ...sepRight }))}
                </>}
                {chipMeta && <>
                  {td('—', TT({ color:'rgba(255,255,255,0.45)' }))}
                  {td(fmt1(totalSaldo.hhM), TT())}
                  {td('—', TT({ color:'rgba(255,255,255,0.45)', ...sepRight }))}
                </>}
                {td('—', TT({ color:'rgba(255,255,255,0.45)' }))}
                {td(fmt1(totalSaldo.hhReal), TT({ color:BASE.gold }))}
                {td('—', TT({ color:'rgba(255,255,255,0.45)', ...sepRight }))}
                {td(fmt1(totalSaldo.hhRefAct), TT())}
                {td(fmtVar(totalSaldo.hhRefAct - totalSaldo.hhReal), TT({ color: vcD(totalSaldo.hhRefAct - totalSaldo.hhReal) }))}
                {td(fmtCPIPct(calcCPI(totalSaldo.hhRefAct, totalSaldo.hhReal)), TT({ ...sepRight }))}
                {td('—', TT({ color:'rgba(255,255,255,0.45)' }))}
                {td(fmt1(totalSaldo.hhSaldoRef), TT())}
                {td('—', TT({ color:'rgba(255,255,255,0.45)', ...sepRight }))}
                {td('—', TT({ color:'rgba(255,255,255,0.45)' }))}
                {td(fmt1(totalSaldo.hhEAC), TT())}
                {td('—', TT({ color:'rgba(255,255,255,0.45)', ...sepRight }))}
                {td(fmt1(totalSaldo.hhRefTotal), TT())}
                {td(fmtVar(totalSaldo.hhRefTotal - totalSaldo.hhEAC), TT({ color: vcD(totalSaldo.hhRefTotal - totalSaldo.hhEAC) }))}
                {td(fmtCPIPct(totalSaldo.hhEAC > 0 ? totalSaldo.hhRefTotal / totalSaldo.hhEAC : null), TT({ ...sepRight }))}
                <td style={{ background:HEAD_BG, borderTop:`2px solid ${BASE.gold}`, borderBottom:`2px solid ${BASE.gold}` }} />
              </tr>
              {Object.keys(wbs).map(pN=>{
                const p=wbs[pN];
                if (!mostrarVacias && p.hhR === 0 && p.hhM === 0 && p.hhP === 0) return null;
                const hhRef = p[REF.hhKey];
                const cpiV=calcCPI(hhRef, p.hhR), diff=(hhRef - p.hhR).toFixed(1), cc=getEstado(cpiV);
                let pSaldoMet = 0, pSaldoRef = 0, pSaldoReal = 0, pEAC = 0, pRefTot = 0, pMetTot = 0;
                // Acumuladores para chips PPT/META (contractual): suma metP/metM y HH presupuesto/meta
                let pMetP_tot = 0, pHHP_tot = 0, pMetM_tot = 0, pHHM_tot = 0;
                Object.keys(p.subs).forEach(sN=>Object.keys(p.subs[sN].acts).forEach(aN=>{
                  const act=p.subs[sN].acts[aN];
                  const ad = obtenerDatosActividad(aN, act.met);
                  const { aIpRef: ipRef, sm, metFinal } = calcSaldo(act, ad);
                  const ipReal = act.met > 0 ? act.hhR/act.met : ipRef;
                  pSaldoMet  += sm;
                  pSaldoRef  += sm * ipRef;
                  pSaldoReal += sm * ipReal;
                  pEAC    += act.hhR + sm * ipReal;
                  pRefTot += metFinal * ipRef;
                  pMetTot += metFinal;
                  // Chips
                  pMetP_tot += (ad.metP || 0);
                  pHHP_tot  += hhPptDe(aN);
                  pMetM_tot += (ad.metM || 0);
                  pHHM_tot  += hhMetaDe(aN);
                }));
                const pIPP_avg = pMetP_tot > 0 ? pHHP_tot / pMetP_tot : 0;
                const pIPM_avg = pMetM_tot > 0 ? pHHM_tot / pMetM_tot : 0;
                const cpiEAC = pEAC > 0 ? pRefTot / pEAC : null;
                const ccEAC = getEstado(cpiEAC);
                const pEstIP   = pMetTot > 0 ? pEAC / pMetTot : 0;
                const pVarFct  = pRefTot - pEAC;
                let totalMet = 0;
                Object.keys(p.subs).forEach(sN=>Object.keys(p.subs[sN].acts).forEach(aN=>{
                  totalMet += p.subs[sN].acts[aN].met;
                }));

                return (
                  <React.Fragment key={pN}>
                    <tr onClick={()=>setOpenP(openP===pN?null:pN)} style={{cursor:'pointer',background:'#f1f5f9',transition:'background 0.12s',borderTop:`2px solid #cbd5e1`}}
                        onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                        onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
                      <td style={{position:'sticky',left:0,zIndex:3,background:'#f1f5f9',padding:'0',color:BASE.navy,borderBottom:`1px solid ${BASE.border}`,borderRight:SEP,textAlign:'left',verticalAlign:'middle',height:'44px',boxShadow:'4px 0 8px -4px rgba(15,23,42,0.18)'}}>
                        <div style={{display:'flex',alignItems:'stretch',height:'100%'}}>
                          {/* Indicador lateral sólido (chip vertical) */}
                          <div style={{width:'6px',background:cc.color,flexShrink:0}}/>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px',flex:1}}>
                            <span style={{color:cc.color,fontSize:'10px',fontWeight:'900',width:'12px',flexShrink:0}}>{openP===pN?'▼':'▶'}</span>
                            <span style={{
                              fontSize:'12px',fontWeight:'800',letterSpacing:'0.3px',
                              textTransform:'uppercase',color:BASE.navy,
                              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                            }}>{pN}</span>
                          </div>
                        </div>
                      </td>
                      {/* Metrado e IP NO se muestran en partida/subpartida: no se pueden
                          sumar unidades distintas (m2, m3, mes, ml…). Solo HH se suma. */}
                      {chipPpt && <>
                        {td('—',{background:SEC.ppt.bgCell,color:BASE.muted})}
                        {td(fmt1(pHHP_tot),{background:SEC.ppt.bgCell,color:SEC.ppt.text})}
                        {td('—',{background:SEC.ppt.bgCell,color:BASE.muted,...sepRight})}
                      </>}
                      {chipMeta && <>
                        {td('—',{background:SEC.meta.bgCell,color:BASE.muted})}
                        {td(fmt1(pHHM_tot),{background:SEC.meta.bgCell,color:SEC.meta.text})}
                        {td('—',{background:SEC.meta.bgCell,color:BASE.muted,...sepRight})}
                      </>}
                      {td('—',{color:BASE.muted})}
                      {td(fmt1(p.hhR))}
                      {td('—',{color:BASE.muted,...sepRight})}
                      {td(fmt1(hhRef))}
                      {td(fmtVar(diff),{color:colorVar(diff),fontWeight:'800'})}
                      {td(fmtCPIPct(cpiV),{color:cc.color,fontWeight:'800',background:`${cc.color}10`,...sepRight})}
                      {td('—',{background:SEC.saldo.bgCell,color:BASE.muted})}
                      {td(fmt1(pSaldoRef),{background:SEC.saldo.bgCell,color:SEC.saldo.text})}
                      {td('—',{background:SEC.saldo.bgCell,color:BASE.muted,...sepRight})}
                      {td('—',{background:SEC.estimado.bgCell,color:BASE.muted})}
                      {td(fmt1(pEAC),{background:SEC.estimado.bgCell,color:SEC.estimado.text})}
                      {td('—',{background:SEC.estimado.bgCell,color:BASE.muted,...sepRight})}
                      {td(fmt1(pRefTot),{background:SEC.forecast.bgCell,color:SEC.forecast.text})}
                      {td(fmtVar(pVarFct),{background:SEC.forecast.bgCell,color:colorVar(pVarFct),fontWeight:'800'})}
                      {td(fmtCPIPct(cpiEAC),{background:`${ccEAC.color}10`,color:ccEAC.color,fontWeight:'800',...sepRight})}
                      <td style={{padding:'8px 10px',textAlign:'center',verticalAlign:'middle',borderBottom:`1px solid ${BASE.border}`}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:'5px',background:cc.color,color:'#fff',padding:'4px 11px',borderRadius:'999px',fontSize:'9.5px',fontWeight:'800',letterSpacing:'0.5px',boxShadow:`0 1px 3px ${cc.color}55`,whiteSpace:'nowrap'}}>
                          {cc.label==='ÓPTIMO'?'✓':cc.label==='ALERTA'?'⚠':'✕'} {cc.label}
                        </span>
                      </td>
                    </tr>

                    {openP===pN && Object.keys(p.subs).map(sN=>{
                      const sub=p.subs[sN];
                      if (!mostrarVacias && sub.hhR === 0 && sub.hhM === 0 && sub.hhP === 0) return null;
                      const sHhRef = sub[REF.hhKey];
                      const scpi=calcCPI(sHhRef, sub.hhR), scc=getEstado(scpi), sdiff=(sHhRef - sub.hhR).toFixed(1);
                      let spSaldoMet = 0, spSaldoRef = 0, spSaldoReal = 0, spEAC = 0, spRefTot = 0, spMetTot = 0;
                      let spMetP_tot = 0, spHHP_tot = 0, spMetM_tot = 0, spHHM_tot = 0;
                      Object.keys(sub.acts).forEach(aN=>{
                        const act = sub.acts[aN];
                        const ad = obtenerDatosActividad(aN, act.met);
                        const { aIpRef: ipRef, sm, metFinal } = calcSaldo(act, ad);
                        const ipReal = act.met > 0 ? act.hhR/act.met : ipRef;
                        spSaldoMet  += sm;
                        spSaldoRef  += sm * ipRef;
                        spSaldoReal += sm * ipReal;
                        spEAC    += act.hhR + sm * ipReal;
                        spRefTot += metFinal * ipRef;
                        spMetTot += metFinal;
                        spMetP_tot += (ad.metP || 0);
                        spHHP_tot  += hhPptDe(aN);
                        spMetM_tot += (ad.metM || 0);
                        spHHM_tot  += hhMetaDe(aN);
                      });
                      const spIPP_avg = spMetP_tot > 0 ? spHHP_tot / spMetP_tot : 0;
                      const spIPM_avg = spMetM_tot > 0 ? spHHM_tot / spMetM_tot : 0;
                      const spCpiEAC = spEAC > 0 ? spRefTot / spEAC : null;
                      const spEstIP  = spMetTot > 0 ? spEAC / spMetTot : 0;
                      const spVarFct = spRefTot - spEAC;
                      let spMet = 0;
                      Object.keys(sub.acts).forEach(aN=>{ spMet += sub.acts[aN].met; });

                      return (
                        <React.Fragment key={sN}>
                          <tr onClick={e=>{e.stopPropagation();setOpenS(openS===sN?null:sN);}} style={{cursor:'pointer',background:'#fafbfc',transition:'background 0.12s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='#fafbfc';}}>
                            <td style={{position:'sticky',left:0,zIndex:3,background:'#fafbfc',padding:'0',color:'#1e293b',borderBottom:`1px solid ${BASE.border}`,borderRight:SEP,textAlign:'left',verticalAlign:'middle',height:'40px',boxShadow:'4px 0 8px -4px rgba(15,23,42,0.15)'}}>
                              <div style={{display:'flex',alignItems:'stretch',height:'100%'}}>
                                <div style={{width:'6px',flexShrink:0}}/>
                                <div style={{width:'3px',background:scc.color,flexShrink:0,opacity:0.7}}/>
                                <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 14px 0 22px',flex:1}}>
                                  <span style={{color:scc.color,fontSize:'9px',fontWeight:'700',width:'10px',flexShrink:0}}>{openS===sN?'▼':'▶'}</span>
                                  <span style={{
                                    fontSize:'11px',fontWeight:'700',letterSpacing:'0.2px',color:'#1e293b',
                                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                                  }}>{sN}</span>
                                </div>
                              </div>
                            </td>
                            {chipPpt && <>
                              {td('—',{background:SEC.ppt.bgCell,color:BASE.muted})}
                              {td(fmt1(spHHP_tot),{background:SEC.ppt.bgCell,color:SEC.ppt.text})}
                              {td('—',{background:SEC.ppt.bgCell,color:BASE.muted,...sepRight})}
                            </>}
                            {chipMeta && <>
                              {td('—',{background:SEC.meta.bgCell,color:BASE.muted})}
                              {td(fmt1(spHHM_tot),{background:SEC.meta.bgCell,color:SEC.meta.text})}
                              {td('—',{background:SEC.meta.bgCell,color:BASE.muted,...sepRight})}
                            </>}
                            {td('—',{color:BASE.muted})}
                            {td(fmt1(sub.hhR))}
                            {td('—',{color:BASE.muted,...sepRight})}
                            {td(fmt1(sHhRef))}
                            {td(fmtVar(sdiff),{color:colorVar(sdiff),fontWeight:'700'})}
                            {td(fmtCPIPct(scpi),{color:scc.color,fontWeight:'700',background:`${scc.color}10`,...sepRight})}
                            {td('—',{background:SEC.saldo.bgCell,color:BASE.muted})}
                            {td(fmt1(spSaldoRef),{background:SEC.saldo.bgCell,color:SEC.saldo.text})}
                            {td('—',{background:SEC.saldo.bgCell,color:BASE.muted,...sepRight})}
                            {td('—',{background:SEC.estimado.bgCell,color:BASE.muted})}
                            {td(fmt1(spEAC),{background:SEC.estimado.bgCell,color:SEC.estimado.text})}
                            {td('—',{background:SEC.estimado.bgCell,color:BASE.muted,...sepRight})}
                            {td(fmt1(spRefTot),{background:SEC.forecast.bgCell,color:SEC.forecast.text})}
                            {td(fmtVar(spVarFct),{background:SEC.forecast.bgCell,color:colorVar(spVarFct),fontWeight:'700'})}
                            {td(fmtCPIPct(spCpiEAC),{background:`${getEstado(spCpiEAC).color}10`,color:getEstado(spCpiEAC).color,fontWeight:'700',...sepRight})}
                            <td style={{padding:'8px 10px',textAlign:'center',verticalAlign:'middle',borderBottom:`1px solid ${BASE.border}`}}>
                              <span style={{
                                display:'inline-flex',alignItems:'center',justifyContent:'center',
                                background:`${scc.color}1a`,color:scc.color,
                                width:'26px',height:'22px',borderRadius:'999px',
                                fontSize:'11px',fontWeight:'900',
                                border:`1.5px solid ${scc.color}66`,
                              }}>
                                {scc.label==='ÓPTIMO'?'✓':scc.label==='ALERTA'?'⚠':'✕'}
                              </span>
                            </td>
                          </tr>

                          {openS===sN && Object.keys(sub.acts).map((aN, aIdx)=>{
                            const act=sub.acts[aN];
                            if (!mostrarVacias && act.hhR === 0 && act.met === 0) return null;
                            const ad = obtenerDatosActividad(aN, act.met);
                            const aHhRef = act[REF.hhKey];
                            const { aMetRef, aIpRef, terminada, overActual, sm, metFinal } = calcSaldo(act, ad);
                            const acpi=calcCPI(aHhRef, act.hhR), acc=getEstado(acpi);
                            const ipReal = act.met > 0 ? act.hhR/act.met : aIpRef;
                            const hhSRef = sm * aIpRef;
                            const hhSReal = sm * ipReal;
                            const hhEAC = act.hhR + hhSReal;
                            const hhRefTot = metFinal * aIpRef;
                            const cpiEACa = hhEAC > 0 ? hhRefTot / hhEAC : null;
                            const accEAC = getEstado(cpiEACa);
                            const adiff = (aHhRef - act.hhR).toFixed(1);
                            const aEstIP = metFinal > 0 ? hhEAC / metFinal : 0;
                            const aVarFct = hhRefTot - hhEAC;
                            const zebraBg = aIdx % 2 === 0 ? BASE.white : '#fbfcfd';

                            return (
                              <tr key={aN} style={{background:zebraBg,fontSize:'10px',transition:'background 0.12s'}}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#eef2f7';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background=zebraBg;}}>
                                <td title={aN} style={{position:'sticky',left:0,zIndex:3,background:zebraBg,padding:'0',color:'#475569',borderBottom:`1px solid ${BASE.border}`,borderRight:SEP,textAlign:'left',verticalAlign:'middle',height:'36px',boxShadow:'4px 0 8px -4px rgba(15,23,42,0.12)'}}>
                                  <div style={{display:'flex',alignItems:'stretch',height:'100%'}}>
                                    <div style={{width:'9px',flexShrink:0}}/>
                                    <div style={{width:'1px',background:`${acc.color}55`,flexShrink:0}}/>
                                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',padding:'0 8px 0 24px',flex:1,minWidth:0}}>
                                      <span style={{
                                        color: terminada ? BASE.muted : '#334155',
                                        fontWeight:'500',fontSize:'10.5px',
                                        textDecoration: terminada ? 'line-through' : 'none',
                                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                                        flex:1,minWidth:0,
                                      }}>{aN}</span>
                                      {terminada && (
                                        <span title="Actividad marcada como terminada" style={{
                                          display:'inline-flex',alignItems:'center',gap:'3px',
                                          background:'#dcfce7',color:'#15803d',
                                          padding:'2px 6px',borderRadius:'4px',
                                          fontSize:'8.5px',fontWeight:'900',letterSpacing:'0.5px',
                                          border:'1px solid #86efac',flexShrink:0,
                                        }}>✓ TERMINADA</span>
                                      )}
                                      {overActual && !terminada && (
                                        <span title="Saldo manual (metrado actual supera al contractual)" style={{
                                          display:'inline-flex',alignItems:'center',
                                          background:'#fef3c7',color:'#92400e',
                                          padding:'2px 6px',borderRadius:'4px',
                                          fontSize:'8.5px',fontWeight:'900',letterSpacing:'0.5px',
                                          border:'1px solid #fcd34d',flexShrink:0,
                                        }}>SALDO MANUAL</span>
                                      )}
                                      {act.met > 0 && (
                                        <span style={{
                                          display:'inline-flex',alignItems:'center',
                                          background:`${acc.color}12`,color:acc.color,
                                          padding:'2px 7px',borderRadius:'4px',
                                          fontSize:'9px',fontWeight:'800',letterSpacing:'0.4px',
                                          fontFamily:'var(--grapco-font-mono, monospace)',
                                          border:`1px solid ${acc.color}33`,
                                          flexShrink:0,
                                        }}>
                                          {act.met.toFixed(2)} {ad.un||'UND'}
                                        </span>
                                      )}
                                      {onActualizarFlags && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEdicion({ partida: pN, subpartida: sN, actividad: aN, act, ad, aMetRef }); }}
                                          title="Ajustar saldo / marcar como terminada"
                                          style={{
                                            flexShrink:0, width:'24px', height:'24px',
                                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                                            background:'transparent', border:`1px solid ${BASE.border}`,
                                            borderRadius:'6px', color:BASE.muted, cursor:'pointer',
                                            fontSize:'12px', padding:0,
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = BASE.navy; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.muted; }}
                                        >⚙</button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {chipPpt && <>
                                  {td(fmt2(ad.metP||0),{background:SEC.ppt.bgCell,color:SEC.ppt.text})}
                                  {td(fmt1(hhPptDe(aN)),{background:SEC.ppt.bgCell,color:SEC.ppt.text})}
                                  {td((ad.ipP||0).toFixed(2),{background:SEC.ppt.bgCell,color:SEC.ppt.text,...sepRight})}
                                </>}
                                {chipMeta && <>
                                  {td(fmt2(ad.metM||0),{background:SEC.meta.bgCell,color:SEC.meta.text})}
                                  {td(fmt1(hhMetaDe(aN)),{background:SEC.meta.bgCell,color:SEC.meta.text})}
                                  {td((ad.ipM||0).toFixed(2),{background:SEC.meta.bgCell,color:SEC.meta.text,...sepRight})}
                                </>}
                                {td(act.met>0?fmt2(act.met):'0')}
                                {td(fmt1(act.hhR))}
                                {td(act.met>0?ipReal.toFixed(3):'—',{color:BASE.muted,...sepRight})}
                                {td(fmt1(aHhRef))}
                                {td(fmtVar(adiff),{color:colorVar(adiff),fontWeight:'700'})}
                                {td(fmtCPIPct(acpi),{color:acc.color,fontWeight:'700',background:`${acc.color}10`,...sepRight})}
                                {td(sm>0?fmt2(sm):'✓',{background:SEC.saldo.bgCell,color:SEC.saldo.text})}
                                {td(hhSRef>0?fmt1(hhSRef):'✓',{background:SEC.saldo.bgCell,color:SEC.saldo.text})}
                                {td(sm>0?aIpRef.toFixed(2):'—',{background:SEC.saldo.bgCell,color:SEC.saldo.text,...sepRight})}
                                {td(fmt2(metFinal),{background:SEC.estimado.bgCell,color:SEC.estimado.text})}
                                {td(fmt1(hhEAC),{background:SEC.estimado.bgCell,color:SEC.estimado.text})}
                                {td(metFinal>0?aEstIP.toFixed(3):'—',{background:SEC.estimado.bgCell,color:SEC.estimado.text,...sepRight})}
                                {td(fmt1(hhRefTot),{background:SEC.forecast.bgCell,color:SEC.forecast.text})}
                                {td(fmtVar(aVarFct),{background:SEC.forecast.bgCell,color:colorVar(aVarFct),fontWeight:'700'})}
                                {td(cpiEACa!==null?fmtCPIPct(cpiEACa):'—',{background:`${accEAC.color}10`,color:accEAC.color,fontWeight:'700',...sepRight})}
                                <td style={{padding:'8px 10px',textAlign:'center',verticalAlign:'middle',borderBottom:`1px solid ${BASE.border}`}}>
                                  {act.hhR>0 && (
                                    <span style={{
                                      display:'inline-flex',alignItems:'center',justifyContent:'center',
                                      background:acc.color,color:'#fff',
                                      width:'24px',height:'20px',borderRadius:'999px',
                                      fontSize:'10px',fontWeight:'900',
                                      boxShadow:`0 1px 2px ${acc.color}55`,
                                    }}>{acc.label==='ÓPTIMO'?'✓':acc.label==='ALERTA'?'⚠':'✕'}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:'10px 14px',display:'flex',gap:'14px',flexWrap:'wrap',borderTop:`1px solid ${BASE.border}`,background:'#f8fafc'}}>
          {[
            {c:BASE.green,t:'CPI ≥ 100% → Óptimo'},
            {c:'#d97706',t:'85% ≤ CPI < 100% → Alerta'},
            {c:'#dc2626',t:'CPI < 85% → Crítico'},
            {c:'#7c3aed',t:'SALDO = HH proyectada para metrado restante'},
            {c:'#0d9488',t:'ESTIMADO = HH actual + saldo @real (al ritmo actual)'},
            {c:'#ec4899',t:'FORECAST = comparación Meta TOT vs Estimado'},
          ].map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <div style={{width:'10px',height:'10px',borderRadius:'50%',background:l.c}}/>
              <span style={{fontSize:'10px',color:BASE.muted}}>{l.t}</span>
            </div>
          ))}
        </div>
      </div>

      {edicion && onActualizarFlags && (
        <ModalAjustarSaldo
          datos={edicion}
          onCerrar={() => setEdicion(null)}
          onGuardar={(flags) => onActualizarFlags(edicion.partida, edicion.subpartida, edicion.actividad, flags)}
        />
      )}
    </div>
  );
}