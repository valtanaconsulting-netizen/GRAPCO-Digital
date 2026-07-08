// src/views/ingeniero/CpiEac.jsx — V2 con CPI % y badges
import React, { useState, useMemo, useRef } from 'react';
import { INFO_MAP } from '../utils/constants';
import { BASE } from '../utils/styles';
import { calcCPI, fmtCPIPct, fmt1, fmt2, getEstado } from '../utils/helpers';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { num, COLUMNAS_PLANTILLA } from '../utils/catalogoWbs';
import { normActividad as normAct } from '../utils/normalizacion';
import MetradoSustentoModal from './oficinatecnica/MetradoSustentoModal';

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

export default function CpiEac({ wbs, historial = [], filtrados = null, infoMap, onModificarWBS, onActualizarFlags, showToast }) {
  // Catálogo de datos: el editable del proyecto, o el fijo del código como respaldo.
  const INFO = infoMap || INFO_MAP;
  const { proyectoActivo, frenteActivo, modoTodosFrentes } = useProyectoActivo();
  // "Metrar con formato" desde el ISP → guarda en Sustento OT → alimenta la valorización.
  const [metrando, setMetrando] = useState(null); // { actividad, familia, unidad }

  // Exportar Excel de rendimientos (WBS · presupuesto · real) para cierre de obra.
  const exportarRendimientos = async () => {
    try {
      const { exportarRendimientosWBS } = await import('../utils/exportRendimientos');
      await exportarRendimientosWBS({ wbs, infoMap: INFO, proyectoNombre: proyectoActivo?.nombre || 'Proyecto' });
    } catch (e) {
      console.error('[exportarRendimientos]', e);
      alert('No se pudo exportar: ' + e.message);
    }
  };

  // Exportar el IP REAL del CPI como DATA re-importable. La columna IP = rendimiento
  // REAL logrado en obra (ΣHH ÷ Σmetrado); si una actividad no tiene avance, usa el
  // IP del presupuesto para no dejarla vacía. Mismas columnas que lee el importador
  // (filasAArbol) → se sube en «Importar Excel» de OTRO proyecto para reusar la
  // productividad real probada como rendimiento base. IP Meta = el mismo IP real.
  const exportarIPRealData = async () => {
    try {
      const XLSX = await import('xlsx');
      const infoNorm = {};
      Object.keys(INFO || {}).forEach(k => { infoNorm[normAct(k)] = INFO[k]; });
      const filas = [];
      Object.keys(wbs || {}).forEach(partida => {
        const subs = (wbs[partida] && wbs[partida].subs) || {};
        Object.keys(subs).forEach(subN => {
          const acts = (subs[subN] && subs[subN].acts) || {};
          Object.keys(acts).forEach(actN => {
            const act = acts[actN] || {};
            const info = infoNorm[normAct(actN)] || {};
            const un = info.un || 'UND';
            const ipPpto = (info.ipP != null && info.ipP !== '') ? +Number(info.ipP).toFixed(4) : 0;
            const conAvance = num(act.met) > 0;
            const ipReal = conAvance ? +(num(act.hhR) / num(act.met)).toFixed(4) : ipPpto;
            const metrado = +(num(info.metP) || num(act.met) || 0).toFixed(2);
            filas.push({
              'Partida': partida, 'Subpartida': subN, 'Actividad': actN, 'Unidad': un,
              'Frente': 'F1', 'Metrado': metrado, 'IP': ipReal, 'IP Meta': ipReal,
            });
          });
        });
      });
      if (!filas.length) { alert('No hay actividades para exportar.'); return; }
      const ws = XLSX.utils.json_to_sheet(filas, { header: COLUMNAS_PLANTILLA });
      ws['!cols'] = COLUMNAS_PLANTILLA.map(c => ({ wch: Math.max(13, c.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'WBS');
      const nombre = (proyectoActivo?.nombre || 'Proyecto').replace(/\s+/g, '_');
      XLSX.writeFile(wb, `IP_Real_WBS_${nombre}.xlsx`);
    } catch (e) {
      console.error('[exportarIPRealData]', e);
      alert('No se pudo exportar el IP real: ' + e.message);
    }
  };

  // ISP SEMANAL (Excel): Informe Semanal de Producción — por semana HH real/meta/ppto,
  // metrado, IP real y CPI, con acumulados. Misma agregación que la Curva S del CPI.
  const exportarISPSemanal = async () => {
    try {
      const XLSX = await import('xlsx');
      const bySem = {};
      // Usa el set FILTRADO (lo que el usuario ve: partida/semana/fechas activas);
      // si no llega el prop, cae al historial completo del proyecto.
      const fuente = filtrados || historial || [];
      fuente.forEach(r => {
        const s = parseInt(r.semana);
        if (!Number.isFinite(s) || s <= 0) return;
        if (!bySem[s]) bySem[s] = { semana: s, hhR: 0, hhM: 0, hhP: 0, met: 0 };
        const met = Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0;
        bySem[s].hhR += parseFloat(r.totalHH) || 0;
        bySem[s].met += met;
        if (r._ipMeta && met > 0) bySem[s].hhM += met * r._ipMeta;
        if (r._ipPpto && met > 0) bySem[s].hhP += met * r._ipPpto;
      });
      const semanas = Object.values(bySem).sort((a, b) => a.semana - b.semana);
      if (!semanas.length) { alert('No hay registros semanales para el ISP.'); return; }
      const COLS = ['Semana', 'Metrado', 'HH Real', 'HH Meta', 'HH Ppto', 'IP Real', 'CPI (meta)', 'Var HH (Meta-Real)', 'HH Real Acum', 'HH Meta Acum', 'CPI Acum'];
      let aR = 0, aM = 0, aP = 0, aMet = 0;
      const filas = semanas.map(s => {
        aR += s.hhR; aM += s.hhM; aP += s.hhP; aMet += s.met;
        return {
          'Semana': `S${s.semana}`,
          'Metrado': +s.met.toFixed(2),
          'HH Real': +s.hhR.toFixed(1),
          'HH Meta': +s.hhM.toFixed(1),
          'HH Ppto': +s.hhP.toFixed(1),
          'IP Real': s.met > 0 ? +(s.hhR / s.met).toFixed(3) : 0,
          'CPI (meta)': s.hhR > 0 ? +(s.hhM / s.hhR).toFixed(2) : '',
          'Var HH (Meta-Real)': +(s.hhM - s.hhR).toFixed(1),
          'HH Real Acum': +aR.toFixed(1),
          'HH Meta Acum': +aM.toFixed(1),
          'CPI Acum': aR > 0 ? +(aM / aR).toFixed(2) : '',
        };
      });
      filas.push({
        'Semana': 'TOTAL', 'Metrado': +aMet.toFixed(2), 'HH Real': +aR.toFixed(1), 'HH Meta': +aM.toFixed(1), 'HH Ppto': +aP.toFixed(1),
        'IP Real': aMet > 0 ? +(aR / aMet).toFixed(3) : 0, 'CPI (meta)': aR > 0 ? +(aM / aR).toFixed(2) : '',
        'Var HH (Meta-Real)': +(aM - aR).toFixed(1), 'HH Real Acum': +aR.toFixed(1), 'HH Meta Acum': +aM.toFixed(1), 'CPI Acum': aR > 0 ? +(aM / aR).toFixed(2) : '',
      });
      const ws = XLSX.utils.json_to_sheet(filas, { header: COLS });
      ws['!cols'] = COLS.map(c => ({ wch: Math.max(10, c.length + 1) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ISP Semanal');
      const nombre = (proyectoActivo?.nombre || 'Proyecto').replace(/\s+/g, '_');
      const fr = (!modoTodosFrentes && frenteActivo) ? `_${(frenteActivo.nombre || 'frente').replace(/\s+/g, '_')}` : '';
      XLSX.writeFile(wb, `ISP_Semanal_${nombre}${fr}.xlsx`);
    } catch (e) {
      console.error('[ISP semanal]', e);
      alert('No se pudo exportar el ISP semanal: ' + e.message);
    }
  };
  // Multi-abierto: se pueden expandir varias partidas/subpartidas a la vez (no acordeón).
  // Las subpartidas se llavean por `${partida}::${sub}` para no chocar entre partidas homónimas.
  const [openP, setOpenP] = useState(() => new Set());
  const [openS, setOpenS] = useState(() => new Set());
  const toggleEn = (set, key) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  };
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

  // Encabezado pegado a la VENTANA al hacer scroll de página: los controles de arriba se van
  // hacia arriba y el encabezado de la tabla (+ la fila TOTAL) queda fijo bajo el navbar fijo.
  // El recuadro usa overflow-y:clip para NO crear un contenedor de scroll vertical (así el
  // sticky escapa hasta la ventana) y overflow-x:auto para el scroll horizontal de columnas.
  // Mido el alto real del thead para pegar la fila TOTAL justo debajo del encabezado.
  const NAV_H = 0; // el contenedor de scroll de Ingeniero ya empieza bajo el navbar → offset 0
  const scrollWrapRef = useRef(null);
  // Alturas FIJAS del encabezado (deterministas). Antes se medía thead.offsetHeight con
  // useLayoutEffect, pero con border-collapse el alto pintado redondeaba y NO coincidía con
  // el `top` de la fila Σ TOTAL → quedaba una banda donde se asomaba una fila de datos
  // ("TRABAJOS PRELIMINARES") al hacer scroll. Con alturas fijas la suma es EXACTA y la
  // fila TOTAL pega justo bajo el head, sin medir nada.
  const GROUP_H = 36;              // fila de grupos (1 línea)
  const COL_H   = 38;              // sub-cabecera (2 líneas: "Var Act. HH" caben, lineHeight 1.15)
  const theadH  = GROUP_H + COL_H; // 74 px exactos — constante, no medido

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
        map[canon].metP += Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0;
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
  // Separadores entre secciones: sobrios (sin "rejas"). En el head, hairline blanco casi
  // invisible sobre el navy; en el cuerpo, acero claro de 1px. La separación real la dan el
  // acento del grupo + el tinte de celda, no una regla gruesa.
  // Jerarquía de líneas (pedido del usuario): los separadores de SECCIÓN pesan más que las
  // líneas de fila. SECCIÓN = 2px; fila = 1px (BASE.border). En el head el separador es un
  // tono frío/navy translúcido (NUNCA blanco → no se ven «huecos» en la zona fijada).
  const SEP_HEAD = '2px solid rgba(150,182,216,0.32)';
  const SEP_BODY = '2px solid #C2CDDC';
  const SEP = SEP_BODY;                       // compat: usos existentes en celdas del cuerpo
  const sepRight = { borderRight: SEP_BODY };

  // === SISTEMA DE COLOR INSTITUCIONAL (navy + gold) ===
  // Una sola rampa fría navy→acero→teal-apagado recorre las 6 secciones (matiz 200-215°,
  // saturación baja) → diferenciación SUTIL pero real, sin "arcoíris". El gold GRAPCO es el
  // ÚNICO acento fuerte y se reserva a ACUMULADO ACTUAL (el "ahora") y a la fila Σ TOTAL.
  // accent = barra de 3px bajo el grupo + color del rótulo de la sub-cabecera.
  // bgCell  = tinte casi imperceptible (los DATOS destacan).
  const SEC = {
    ppt:      { accent: '#6E86A6', bgCell: '#FAFBFD', text: '#3C5170' }, // acero claro — presupuesto
    meta:     { accent: '#4E6E8C', bgCell: '#F8FAFC', text: '#2F4A66' }, // acero medio — meta
    acum:     { accent: BASE.gold, bgCell: '#FFFFFF', text: '#0F2A47' }, // GOLD — el "ahora" (único acento fuerte)
    saldo:    { accent: '#5C7E8C', bgCell: '#F7FAFB', text: '#33545F' }, // teal-acero — saldo
    estimado: { accent: '#46728F', bgCell: '#F7FAFC', text: '#284E68' }, // azul-acero — estimado
    forecast: { accent: '#7C8DA3', bgCell: '#FAFBFC', text: '#46586E' }, // azul-niebla — forecast
  };
  const HEAD_BG = '#0F2A47';      // navy GRAPCO (BASE.navy) — fila de grupos, WBS, Estado
  const HEAD_BG2 = '#15314F';     // navy sub-header (un punto más claro) — sub-cabecera y Σ TOTAL

  // Header de grupo (primera fila): navy + barra de acento abajo.
  // sticky top:NAV_H (bajo el navbar fijo) + altura fija (border-box) → offset exacto para la 2ª.
  const thGroup = (color, extra={}) => ({
    padding: '0 10px',
    background: HEAD_BG,
    color: '#fff',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderBottom: `3px solid ${color}`,
    textAlign: 'center',
    position: 'sticky',
    top: NAV_H,
    zIndex: 5,
    boxSizing: 'border-box',
    height: GROUP_H,                 // altura FIJA → offset exacto para la 2ª fila
    lineHeight: `${GROUP_H - 3}px`,  // centra vertical (descontando la barra de 3px)
    ...extra,
  });
  // Sub-header (segunda fila): navy más claro, texto en el accent del grupo.
  // sticky top:NAV_H+36 (justo debajo de la 1ª fila). Altura NATURAL: estos rótulos
  // ("Var Act. HH", "META Act. HH") se parten en 2 líneas y no deben recortarse.
  const thCol = (color, extra={}) => ({
    padding: '4px 8px',
    background: HEAD_BG2,
    color,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 1.15,
    whiteSpace: 'normal',            // NO recortar: "Var Act. HH" / "META Act. HH" en 2 líneas
    wordBreak: 'keep-all',
    verticalAlign: 'middle',
    position: 'sticky',
    top: NAV_H + GROUP_H,            // anclaje EXACTO bajo la 1ª fila
    zIndex: 5,
    boxSizing: 'border-box',
    height: COL_H,                   // altura FIJA → la suma con GROUP_H da theadH exacto
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
  // Estilo de celda para la fila de TOTALES (navy, números claros).
  // sticky top: NAV_H + alto del encabezado → la fila TOTAL queda pegada justo debajo del
  // encabezado al hacer scroll de página (junto con él, como un bloque fijo).
  // top = theadH - 1: solapa 1px bajo el borde gold de 2px (cinturón); evita que en zoom/subpíxel
  // se asome una fila de datos en el límite. El -1 queda oculto bajo el borderTop gold.
  const TT = (extra = {}) => ({ background: HEAD_BG2, color: '#fff', fontWeight: 800, borderTop: `2px solid ${BASE.gold}`, borderBottom: `2px solid ${BASE.gold}`, position:'sticky', top: NAV_H + theadH - 1, zIndex: 4, boxSizing:'border-box', height:40, ...extra });
  const vcD = (n) => { const v = parseFloat(n); if (!v || isNaN(v)) return 'rgba(255,255,255,0.55)'; return v > 0 ? '#86efac' : '#fca5a5'; };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

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

          {/* EXPORTAR RENDIMIENTOS — Excel limpio de 3 columnas (WBS · IP
              presupuesto · IP real). Pedido para el cierre de obra. */}
          <button onClick={exportarRendimientos}
            title="Excel: WBS (partida/subpartida/actividad) · rendimiento del presupuesto · rendimiento real en obra"
            style={{
              padding:'6px 14px',
              background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark || '#0f1a2e'})`,
              color:'#fff', border:'none', borderRadius:'8px',
              fontSize:'10.5px', fontWeight:'800', letterSpacing:'0.3px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto',
              boxShadow:`0 4px 12px -4px ${BASE.navy}99`,
            }}>
            <span style={{ fontSize:'12px' }}>⬇</span>
            Exportar rendimientos (Excel)
          </button>

          {/* EXPORTAR IP REAL como DATA re-importable: la columna IP = rendimiento
              REAL del CPI. Se sube en «Importar Excel» de otro proyecto para reusar
              la productividad real probada como rendimiento base. */}
          <button onClick={exportarIPRealData}
            title="Excel re-importable: por actividad lleva el IP REAL del CPI (HH real ÷ metrado real). Súbelo en «Importar Excel» de otro proyecto para reusar los rendimientos reales como base."
            style={{
              padding:'6px 14px',
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark || '#b9831f'})`,
              color: BASE.navy, border:'none', borderRadius:'8px',
              fontSize:'10.5px', fontWeight:'800', letterSpacing:'0.3px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'6px',
              boxShadow:`0 4px 12px -4px ${BASE.gold}99`,
            }}>
            <span style={{ fontSize:'12px' }}>🔁</span>
            Exportar IP real (re-importable)
          </button>

          {/* ISP SEMANAL: Informe Semanal de Producción (HH/IP/CPI por semana, con acumulados). */}
          <button onClick={exportarISPSemanal}
            title="Excel del Informe Semanal de Producción: por semana HH real/meta/ppto, metrado, IP real y CPI, con acumulados."
            style={{
              padding:'6px 14px',
              background: `linear-gradient(135deg, #0e7490, #155e75)`,
              color:'#fff', border:'none', borderRadius:'8px',
              fontSize:'10.5px', fontWeight:'800', letterSpacing:'0.3px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'6px',
              boxShadow:`0 4px 12px -4px #0e749099`,
            }}>
            <span style={{ fontSize:'12px' }}>📅</span>
            ISP semanal (Excel)
          </button>
        </div>
      </div>

      {/* TABLA — overflow:visible para NO ser contenedor de scroll: el scroll (vertical y
          horizontal) lo maneja el contenedor único de Ingeniero, y así el encabezado sticky se
          ancla a ÉL (queda fijo arriba) y la columna WBS a la izquierda. */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,overflow:'visible'}}>
        {/* overflow:visible (NO 'auto'): cualquier overflow:auto/scroll convierte a este div en
            contenedor de scroll y "captura" el sticky, impidiendo que el encabezado se ancle a la
            ventana. Sin contenedor de scroll, el encabezado + la fila TOTAL se pegan de verdad bajo
            el navbar al hacer scroll de página. La tabla entra completa en pantalla. */}
        <div ref={scrollWrapRef} className="tabla-desborda" style={{overflow:'visible'}}>
          {/* borderCollapse:'separate' + borderSpacing:0 → cada celda fija (sticky) pinta su
              propio fondo opaco; elimina los «huecos» blancos por donde se asomaba el cuerpo
              en la zona fijada (bug clásico de sticky + border-collapse:collapse en Chrome). */}
          <table style={{width:'100%',borderCollapse:'separate',borderSpacing:0,fontSize:'11px',minWidth:'900px'}}>
            <thead>
              <tr style={{height:GROUP_H}}>
                <th rowSpan="2" style={{position:'sticky',left:0,top:NAV_H,zIndex:7,height:theadH,boxSizing:'border-box',padding:'0 12px',verticalAlign:'middle',background:HEAD_BG,color:'#fff',textAlign:'left',fontWeight:'800',fontSize:'11px',letterSpacing:'0.6px',minWidth:'240px',borderRight:SEP_HEAD,borderBottom:`3px solid ${BASE.gold}`,boxShadow:'4px 0 8px -4px rgba(8,26,46,0.28)'}}>WBS</th>
                {chipPpt && (
                  <th colSpan="3" style={thGroup(SEC.ppt.accent,{borderRight:SEP_HEAD})}>PRESUPUESTO (contractual)</th>
                )}
                {chipMeta && (
                  <th colSpan="3" style={thGroup(SEC.meta.accent,{borderRight:SEP_HEAD})}>META (objetivo)</th>
                )}
                <th colSpan="6" style={thGroup(SEC.acum.accent,{borderRight:SEP_HEAD})}>ACUMULADO ACTUAL</th>
                <th colSpan="3" style={thGroup(SEC.saldo.accent,{borderRight:SEP_HEAD})}>SALDO ACTUAL</th>
                <th colSpan="3" style={thGroup(SEC.estimado.accent,{borderRight:SEP_HEAD})}>ESTIMADO AL TÉRMINO</th>
                <th colSpan="3" style={thGroup(SEC.forecast.accent,{borderRight:SEP_HEAD})}>FORECAST {REF.etiqueta}</th>
                <th rowSpan="2" style={{position:'sticky',top:NAV_H,zIndex:5,height:theadH,boxSizing:'border-box',padding:'0 10px',verticalAlign:'middle',textAlign:'center',background:HEAD_BG,color:'#fff',fontSize:'10px',fontWeight:'800',letterSpacing:'0.6px',borderLeft:SEP_HEAD,borderBottom:`3px solid ${BASE.gold}`}}>Estado</th>
              </tr>
              <tr style={{height:COL_H}}>
                {chipPpt && <>
                  <th style={thCol(SEC.ppt.accent)}>Metrado</th>
                  <th style={thCol(SEC.ppt.accent)}>HH</th>
                  <th style={thCol(SEC.ppt.accent,{borderRight:SEP_HEAD})}>IP</th>
                </>}
                {chipMeta && <>
                  <th style={thCol(SEC.meta.accent)}>Metrado</th>
                  <th style={thCol(SEC.meta.accent)}>HH</th>
                  <th style={thCol(SEC.meta.accent,{borderRight:SEP_HEAD})}>IP</th>
                </>}
                <th style={thCol(SEC.acum.accent)}>Metrado</th>
                <th style={thCol(SEC.acum.accent)}>HH</th>
                <th style={thCol(SEC.acum.accent,{borderRight:SEP_HEAD})}>IP Real</th>
                <th style={thCol(SEC.acum.accent)}>{REF.etiqueta} Act. HH</th>
                <th style={thCol(SEC.acum.accent)}>Var Act. HH</th>
                <th style={thCol(SEC.acum.accent,{borderRight:SEP_HEAD})}>CPI %</th>
                <th style={thCol(SEC.saldo.accent)}>Metrado</th>
                <th style={thCol(SEC.saldo.accent)}>HH</th>
                <th style={thCol(SEC.saldo.accent,{borderRight:SEP_HEAD})}>IP</th>
                <th style={thCol(SEC.estimado.accent)}>Metrado</th>
                <th style={thCol(SEC.estimado.accent)}>HH</th>
                <th style={thCol(SEC.estimado.accent,{borderRight:SEP_HEAD})}>IP</th>
                <th style={thCol(SEC.forecast.accent)}>TOT HH</th>
                <th style={thCol(SEC.forecast.accent)}>Var {REF.etiqueta} HH</th>
                <th style={thCol(SEC.forecast.accent,{borderRight:SEP_HEAD})}>CPI %</th>
              </tr>
            </thead>
            <tbody>
              {/* ── FILA DE TOTALES DE OBRA (suma de HH de todas las partidas) ── */}
              <tr>
                <td style={{ position:'sticky', left:0, top:NAV_H + theadH - 1, zIndex:6, padding:'10px 14px', background:HEAD_BG, color:'#fff', fontWeight:900, fontSize:'12px', letterSpacing:'0.5px', borderRight:SEP_HEAD, borderTop:`2px solid ${BASE.gold}`, borderBottom:`2px solid ${BASE.gold}`, whiteSpace:'nowrap', boxShadow:'4px 0 8px -4px rgba(8,26,46,0.28)' }}>Σ TOTAL OBRA · HH</td>
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
                <td style={{ position:'sticky', top:NAV_H + theadH - 1, zIndex:4, background:HEAD_BG, borderTop:`2px solid ${BASE.gold}`, borderBottom:`2px solid ${BASE.gold}` }} />
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

                // Resaltado "estoy aquí": la partida abierta se pinta más oscura que las cerradas.
                const pAbierta = openP.has(pN);
                const pBg      = pAbierta ? '#d4dfee' : '#f1f5f9';
                const pBgHover = pAbierta ? '#c3d2e7' : '#e2e8f0';
                // Cuando está abierta, TODA la fila se oscurece (hasta el final): el wrapper
                // fuerza el fondo en cada celda y tapa los tintes por sección (saldo/estimado/forecast).
                const pCell = pAbierta ? (v, ex = {}) => td(v, { ...ex, background: pBg }) : td;

                return (
                  <React.Fragment key={pN}>
                    <tr onClick={()=>setOpenP(prev=>toggleEn(prev,pN))} style={{cursor:'pointer',background:pBg,transition:'background 0.12s',borderTop:`2px solid #cbd5e1`}}
                        onMouseEnter={e=>e.currentTarget.style.background=pBgHover}
                        onMouseLeave={e=>e.currentTarget.style.background=pBg}>
                      <td style={{position:'sticky',left:0,zIndex:3,background:pBg,padding:'0',color:BASE.navy,borderBottom:`1px solid ${BASE.border}`,borderRight:SEP,textAlign:'left',verticalAlign:'middle',height:'44px',boxShadow:pAbierta?'4px 0 8px -4px rgba(15,23,42,0.28)':'4px 0 8px -4px rgba(15,23,42,0.18)'}}>
                        <div style={{display:'flex',alignItems:'stretch',height:'100%'}}>
                          {/* Indicador lateral sólido (chip vertical) */}
                          <div style={{width:'6px',background:cc.color,flexShrink:0}}/>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px',flex:1}}>
                            <span style={{color:cc.color,fontSize:'10px',fontWeight:'900',width:'12px',flexShrink:0}}>{pAbierta?'▼':'▶'}</span>
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
                        {pCell('—',{background:SEC.ppt.bgCell,color:BASE.muted})}
                        {pCell(fmt1(pHHP_tot),{background:SEC.ppt.bgCell,color:SEC.ppt.text})}
                        {pCell('—',{background:SEC.ppt.bgCell,color:BASE.muted,...sepRight})}
                      </>}
                      {chipMeta && <>
                        {pCell('—',{background:SEC.meta.bgCell,color:BASE.muted})}
                        {pCell(fmt1(pHHM_tot),{background:SEC.meta.bgCell,color:SEC.meta.text})}
                        {pCell('—',{background:SEC.meta.bgCell,color:BASE.muted,...sepRight})}
                      </>}
                      {pCell('—',{color:BASE.muted})}
                      {pCell(fmt1(p.hhR))}
                      {pCell('—',{color:BASE.muted,...sepRight})}
                      {pCell(fmt1(hhRef))}
                      {pCell(fmtVar(diff),{color:colorVar(diff),fontWeight:'800'})}
                      {pCell(fmtCPIPct(cpiV),{color:cc.color,fontWeight:'800',background:`${cc.color}10`,...sepRight})}
                      {pCell('—',{background:SEC.saldo.bgCell,color:BASE.muted})}
                      {pCell(fmt1(pSaldoRef),{background:SEC.saldo.bgCell,color:SEC.saldo.text})}
                      {pCell('—',{background:SEC.saldo.bgCell,color:BASE.muted,...sepRight})}
                      {pCell('—',{background:SEC.estimado.bgCell,color:BASE.muted})}
                      {pCell(fmt1(pEAC),{background:SEC.estimado.bgCell,color:SEC.estimado.text})}
                      {pCell('—',{background:SEC.estimado.bgCell,color:BASE.muted,...sepRight})}
                      {pCell(fmt1(pRefTot),{background:SEC.forecast.bgCell,color:SEC.forecast.text})}
                      {pCell(fmtVar(pVarFct),{background:SEC.forecast.bgCell,color:colorVar(pVarFct),fontWeight:'800'})}
                      {pCell(fmtCPIPct(cpiEAC),{background:`${ccEAC.color}10`,color:ccEAC.color,fontWeight:'800',...sepRight})}
                      <td style={{padding:'8px 10px',textAlign:'center',verticalAlign:'middle',borderBottom:`1px solid ${BASE.border}`,background:pAbierta?pBg:undefined}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:'5px',background:cc.color,color:'#fff',padding:'4px 11px',borderRadius:'999px',fontSize:'9.5px',fontWeight:'800',letterSpacing:'0.5px',boxShadow:`0 1px 3px ${cc.color}55`,whiteSpace:'nowrap'}}>
                          {cc.label==='ÓPTIMO'?'✓':cc.label==='ALERTA'?'⚠':'✕'} {cc.label}
                        </span>
                      </td>
                    </tr>

                    {pAbierta && Object.keys(p.subs).map(sN=>{
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

                      // Llave compuesta partida::sub para no colisionar entre partidas con
                      // subpartidas de igual nombre. La abierta se pinta más oscura.
                      const sKey      = `${pN}::${sN}`;
                      const sAbierta  = openS.has(sKey);
                      const sBg       = sAbierta ? '#e6ecf4' : '#fafbfc';
                      const sBgHover  = sAbierta ? '#d9e2ee' : '#f1f5f9';
                      const sCell     = sAbierta ? (v, ex = {}) => td(v, { ...ex, background: sBg }) : td;

                      return (
                        <React.Fragment key={sN}>
                          <tr onClick={e=>{e.stopPropagation();setOpenS(prev=>toggleEn(prev,sKey));}} style={{cursor:'pointer',background:sBg,transition:'background 0.12s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background=sBgHover;}}
                              onMouseLeave={e=>{e.currentTarget.style.background=sBg;}}>
                            <td style={{position:'sticky',left:0,zIndex:3,background:sBg,padding:'0',color:'#1e293b',borderBottom:`1px solid ${BASE.border}`,borderRight:SEP,textAlign:'left',verticalAlign:'middle',height:'40px',boxShadow:sAbierta?'4px 0 8px -4px rgba(15,23,42,0.24)':'4px 0 8px -4px rgba(15,23,42,0.15)'}}>
                              <div style={{display:'flex',alignItems:'stretch',height:'100%'}}>
                                <div style={{width:'6px',flexShrink:0}}/>
                                <div style={{width:'3px',background:scc.color,flexShrink:0,opacity:0.7}}/>
                                <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 14px 0 22px',flex:1}}>
                                  <span style={{color:scc.color,fontSize:'9px',fontWeight:'700',width:'10px',flexShrink:0}}>{sAbierta?'▼':'▶'}</span>
                                  <span style={{
                                    fontSize:'11px',fontWeight:'700',letterSpacing:'0.2px',color:'#1e293b',
                                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                                  }}>{sN}</span>
                                </div>
                              </div>
                            </td>
                            {chipPpt && <>
                              {sCell('—',{background:SEC.ppt.bgCell,color:BASE.muted})}
                              {sCell(fmt1(spHHP_tot),{background:SEC.ppt.bgCell,color:SEC.ppt.text})}
                              {sCell('—',{background:SEC.ppt.bgCell,color:BASE.muted,...sepRight})}
                            </>}
                            {chipMeta && <>
                              {sCell('—',{background:SEC.meta.bgCell,color:BASE.muted})}
                              {sCell(fmt1(spHHM_tot),{background:SEC.meta.bgCell,color:SEC.meta.text})}
                              {sCell('—',{background:SEC.meta.bgCell,color:BASE.muted,...sepRight})}
                            </>}
                            {sCell('—',{color:BASE.muted})}
                            {sCell(fmt1(sub.hhR))}
                            {sCell('—',{color:BASE.muted,...sepRight})}
                            {sCell(fmt1(sHhRef))}
                            {sCell(fmtVar(sdiff),{color:colorVar(sdiff),fontWeight:'700'})}
                            {sCell(fmtCPIPct(scpi),{color:scc.color,fontWeight:'700',background:`${scc.color}10`,...sepRight})}
                            {sCell('—',{background:SEC.saldo.bgCell,color:BASE.muted})}
                            {sCell(fmt1(spSaldoRef),{background:SEC.saldo.bgCell,color:SEC.saldo.text})}
                            {sCell('—',{background:SEC.saldo.bgCell,color:BASE.muted,...sepRight})}
                            {sCell('—',{background:SEC.estimado.bgCell,color:BASE.muted})}
                            {sCell(fmt1(spEAC),{background:SEC.estimado.bgCell,color:SEC.estimado.text})}
                            {sCell('—',{background:SEC.estimado.bgCell,color:BASE.muted,...sepRight})}
                            {sCell(fmt1(spRefTot),{background:SEC.forecast.bgCell,color:SEC.forecast.text})}
                            {sCell(fmtVar(spVarFct),{background:SEC.forecast.bgCell,color:colorVar(spVarFct),fontWeight:'700'})}
                            {sCell(fmtCPIPct(spCpiEAC),{background:`${getEstado(spCpiEAC).color}10`,color:getEstado(spCpiEAC).color,fontWeight:'700',...sepRight})}
                            <td style={{padding:'8px 10px',textAlign:'center',verticalAlign:'middle',borderBottom:`1px solid ${BASE.border}`,background:sAbierta?sBg:undefined}}>
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

                          {sAbierta && Object.keys(sub.acts).map((aN, aIdx)=>{
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
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setMetrando({ actividad: aN, familia: pN, unidad: ad.un || 'UND' }); }}
                                        title="Metrar con formato → guarda en el Sustento (OT) y alimenta la valorización"
                                        style={{
                                          flexShrink:0, width:'24px', height:'24px',
                                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                                          background:'transparent', border:`1px solid ${BASE.border}`,
                                          borderRadius:'6px', color:BASE.muted, cursor:'pointer',
                                          fontSize:'12px', padding:0,
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = BASE.gold; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.muted; }}
                                      >📐</button>
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
            {c:SEC.saldo.accent,t:'SALDO = HH proyectada para metrado restante'},
            {c:SEC.estimado.accent,t:'ESTIMADO = HH actual + saldo @real (al ritmo actual)'},
            {c:SEC.forecast.accent,t:'FORECAST = comparación Meta TOT vs Estimado'},
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

      {metrando && (
        <MetradoSustentoModal
          actividad={metrando.actividad}
          familia={metrando.familia}
          unidad={metrando.unidad}
          showToast={showToast}
          onClose={() => setMetrando(null)}
        />
      )}
    </div>
  );
}