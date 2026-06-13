// src/views/ingeniero/Tendencias.jsx — V2 con proyección futura
import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, ComposedChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Area,
} from 'recharts';
import { BASE } from '../utils/styles';
import { EJE, GRILLA, TOOLTIP_STYLE, LEYENDA, degradado } from '../utils/chartKit';
import VistaHeader from '../components/VistaHeader';
import {
  calcularTendencia, calcularTendenciaPond, mediaMovil, fmt1, fmtCPI, fmtCPIPct,
  getEstado, resolverIP, proyectarFuturo,
} from '../utils/helpers';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'12px 16px',fontSize:'12px',boxShadow:'0 6px 20px rgba(0,0,0,0.12)'}}>
      <p style={{fontWeight:'800',color:BASE.text,marginBottom:'8px',borderBottom:`1px solid ${BASE.border}`,paddingBottom:'4px'}}>{label}</p>
      {payload.filter(p => p.value !== null && p.value !== undefined).map((p,i)=>(
        <p key={i} style={{color:p.color,margin:'3px 0',display:'flex',justifyContent:'space-between',gap:'20px'}}>
          <span>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value.toLocaleString('es-PE',{maximumFractionDigits:3}) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const Card = ({ children, full, color = BASE.navy }) => (
  <div style={{
    background:BASE.white,borderRadius:'14px',border:`1px solid ${BASE.border}`,
    padding:'18px 20px',gridColumn:full?'1/-1':'auto',
    boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
  }}>{children}</div>
);

const SectionTitle = ({ icon, title, subtitle, color = BASE.green }) => (
  <div style={{marginBottom:'14px'}}>
    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
      <div style={{width:'4px',height:'18px',background:color,borderRadius:'2px'}}/>
      <h3 style={{fontSize:'13px',fontWeight:'800',color:BASE.navy,letterSpacing:'-0.2px'}}>{icon} {title}</h3>
    </div>
    <p style={{fontSize:'11px',color:BASE.muted,marginLeft:'14px'}}>{subtitle}</p>
  </div>
);

const Kpi = ({ icon, titulo, valor, sub, color }) => (
  <div style={{
    background: BASE.white, border: `1px solid ${BASE.border}`,
    borderRadius: '10px', padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: '11px',
  }}>
    <div style={{
      width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
      background: color + '18', color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
    }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{titulo}</p>
      <p style={{ fontSize: '18px', fontWeight: '900', color, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{valor}</p>
      {sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>}
    </div>
  </div>
);

export default function Tendencias({ filtrados, historial, wbs }) {
  const [actSel, setActSel] = useState('');
  const [horizonteProy, setHorizonteProy] = useState(4); // semanas a proyectar
  const [ponderar, setPonderar] = useState(true); // recencia: pesa más lo reciente

  // ── 1. Serie semanal con CPI, IP, HH ──
  const serieSemanal = useMemo(() => {
    const bySem = {};
    filtrados.forEach(r => {
      if (!r) return;
      const sem = r.semana;
      if (!bySem[sem]) bySem[sem] = { semana: sem, hhR: 0, hhM: 0, met: 0, registros: 0 };
      const ipDatos = resolverIP(r, historial);
      const met = parseFloat(r.metrado) || 0;
      const hh = parseFloat(r.totalHH) || 0;
      bySem[sem].hhR += hh;
      bySem[sem].met += met;
      if (ipDatos.ipM && met > 0) bySem[sem].hhM += met * ipDatos.ipM;
      bySem[sem].registros += 1;
    });

    const arr = Object.values(bySem).sort((a, b) => a.semana - b.semana);
    if (!arr.length) return { datos: [], tendencia: null, ultimaSemana: 0 };

    const datos = arr.map(s => ({
      x: s.semana,
      semana: `S${s.semana}`,
      'CPI': s.hhR > 0 ? parseFloat((s.hhM / s.hhR).toFixed(3)) : null,
      'IP Real': s.met > 0 ? parseFloat((s.hhR / s.met).toFixed(3)) : null,
      'HH Real': parseFloat(s.hhR.toFixed(1)),
      'Registros': s.registros,
      esProyeccion: false,
    }));

    const puntosCPI = datos.filter(d => d.CPI !== null).map(d => ({ x: d.x, y: d.CPI }));
    const tendencia = ponderar
      ? calcularTendenciaPond(puntosCPI)
      : calcularTendencia(puntosCPI);

    const cpiVals = datos.map(d => d.CPI);
    const mm3 = mediaMovil(cpiVals, 3);
    datos.forEach((d, i) => {
      if (tendencia.valido) {
        d['Tendencia CPI'] = parseFloat((tendencia.pendiente * d.x + tendencia.intercepto).toFixed(3));
      }
      d['Media móvil (3)'] = mm3[i];
    });

    return { datos, tendencia, ultimaSemana: arr[arr.length - 1].semana };
  }, [filtrados, historial, ponderar]);

  const confiable = (serieSemanal.tendencia?.r2 || 0) >= 0.4;

  // ── PROYECCIÓN FUTURA ──
  const serieConProyeccion = useMemo(() => {
    if (!serieSemanal.tendencia?.valido) return serieSemanal.datos;
    const futuras = proyectarFuturo(serieSemanal.tendencia, serieSemanal.ultimaSemana, horizonteProy);
    // Convertir las futuras al mismo formato que las históricas
    const futurasFmt = futuras.map(f => ({
      x: f.x,
      semana: f.semana,
      'CPI': null,
      'Proyección CPI': f.proyeccion,
      'Banda Sup': f.bandaSup,
      'Banda Inf': Math.max(0, f.bandaInf),
      esProyeccion: true,
    }));
    return [...serieSemanal.datos, ...futurasFmt];
  }, [serieSemanal, horizonteProy]);

  // ── PRONÓSTICO PARA PANEL NARRATIVO ──
  const pronostico = useMemo(() => {
    if (!serieSemanal.tendencia?.valido || serieSemanal.datos.length < 2) return null;
    const { pendiente, intercepto } = serieSemanal.tendencia;

    // Estimar HH totales necesarias para terminar el proyecto
    let hhAcumulada = 0, metAcum = 0, hhMetaAcum = 0;
    filtrados.forEach(r => {
      hhAcumulada += parseFloat(r.totalHH) || 0;
      const met = parseFloat(r.metrado) || 0;
      if (r._ipMeta && met > 0) hhMetaAcum += met * r._ipMeta;
      metAcum += met;
    });
    const sobrecostoActual = hhAcumulada - hhMetaAcum;

    // Proyección a futuro: 4 semanas más con tendencia actual
    const cpiActual = serieSemanal.datos.at(-1)?.CPI || 1;
    const cpiFuturo4Sem = pendiente * (serieSemanal.ultimaSemana + 4) + intercepto;
    const dirTexto = pendiente > 0.005 ? 'mejora' : pendiente < -0.005 ? 'deterioro' : 'estabilidad';

    return {
      cpiActual,
      cpiFuturo4Sem,
      sobrecostoActual,
      dirTexto,
      pendiente,
      r2: serieSemanal.tendencia.r2,
    };
  }, [serieSemanal, filtrados]);

  // ── PROYECCIÓN DE CIERRE DE OBRA ──
  // Usa el presupuesto del WBS (metrado contractual × IP meta) para estimar
  // a qué CPx/HH/fecha terminará la obra si se mantiene el ritmo reciente.
  const cierre = useMemo(() => {
    if (!wbs) return null;
    let hhMetaTotalPresup = 0;
    Object.values(wbs).forEach(p =>
      Object.values(p.subs || {}).forEach(s =>
        Object.values(s.acts || {}).forEach(a => {
          const metP = a._info?.metP || a.metP || 0;
          const ipM  = a._info?.ipM || 0;
          if (metP > 0 && ipM > 0) hhMetaTotalPresup += metP * ipM;
        })));
    if (hhMetaTotalPresup <= 0) return null;

    let hhRealAcum = 0, hhMetaAcum = 0;
    filtrados.forEach(r => {
      hhRealAcum += parseFloat(r.totalHH) || 0;
      const met = parseFloat(r.metrado) || 0;
      if (r._ipMeta && met > 0) hhMetaAcum += met * r._ipMeta;
    });
    if (hhMetaAcum <= 0) return null;

    const avancePct = Math.min(100, (hhMetaAcum / hhMetaTotalPresup) * 100);
    const hhMetaRestante = Math.max(0, hhMetaTotalPresup - hhMetaAcum);

    // CPI de referencia para el trabajo restante:
    // si la tendencia es confiable, el valor ajustado en la semana actual;
    // si no, el promedio histórico (más conservador).
    const t = serieSemanal.tendencia;
    let cpiRef;
    if (t?.valido && confiable) {
      cpiRef = t.pendiente * serieSemanal.ultimaSemana + t.intercepto;
    } else {
      cpiRef = hhMetaAcum / hhRealAcum; // CPI acumulado real
    }
    cpiRef = Math.max(0.25, Math.min(2, cpiRef || 1));

    const hhRealParaTerminar = hhMetaRestante / cpiRef;
    const hhRealTotalProy = hhRealAcum + hhRealParaTerminar;
    const sobrecostoFinal = hhRealTotalProy - hhMetaTotalPresup;
    const cpiFinalProy = hhRealTotalProy > 0 ? hhMetaTotalPresup / hhRealTotalProy : null;

    // Velocidad: HH-meta ganadas por semana en las últimas 4 semanas activas
    const semanas = {};
    filtrados.forEach(r => {
      const met = parseFloat(r.metrado) || 0;
      if (r._ipMeta && met > 0) semanas[r.semana] = (semanas[r.semana] || 0) + met * r._ipMeta;
    });
    const semOrden = Object.keys(semanas).map(Number).sort((a, b) => a - b);
    const ult4 = semOrden.slice(-4);
    const velHHMetaSem = ult4.length
      ? ult4.reduce((s, k) => s + semanas[k], 0) / ult4.length
      : 0;
    const semanasRestantes = velHHMetaSem > 0 ? Math.ceil(hhMetaRestante / velHHMetaSem) : null;
    const semanaFin = semanasRestantes != null ? serieSemanal.ultimaSemana + semanasRestantes : null;

    return {
      hhMetaTotalPresup, hhMetaAcum, hhRealAcum, avancePct, hhMetaRestante,
      cpiRef, hhRealTotalProy, sobrecostoFinal, cpiFinalProy,
      velHHMetaSem, semanasRestantes, semanaFin,
    };
  }, [wbs, filtrados, serieSemanal, confiable]);

  // ── CPI ACUMULADO vs % AVANCE FÍSICO (por semana) ──
  const serieAvance = useMemo(() => {
    if (!cierre) return [];
    const bySem = {};
    filtrados.forEach(r => {
      const met = parseFloat(r.metrado) || 0;
      const hh = parseFloat(r.totalHH) || 0;
      const s = r.semana;
      if (!bySem[s]) bySem[s] = { semana: s, hhR: 0, hhM: 0 };
      bySem[s].hhR += hh;
      if (r._ipMeta && met > 0) bySem[s].hhM += met * r._ipMeta;
    });
    const arr = Object.values(bySem).sort((a, b) => a.semana - b.semana);
    let accR = 0, accM = 0;
    return arr.map(s => {
      accR += s.hhR; accM += s.hhM;
      return {
        semana: `S${s.semana}`,
        'CPI acum': accR > 0 ? parseFloat((accM / accR).toFixed(3)) : null,
        '% Avance': parseFloat(Math.min(100, (accM / cierre.hhMetaTotalPresup) * 100).toFixed(1)),
      };
    });
  }, [filtrados, cierre]);

  // ── 2. Tendencia DIARIA (nuevo) ──
  const serieDiaria = useMemo(() => {
    const byDate = {};
    filtrados.forEach(r => {
      if (!r) return;
      const f = r.fecha;
      const ipDatos = resolverIP(r, historial);
      const met = parseFloat(r.metrado) || 0;
      const hh = parseFloat(r.totalHH) || 0;
      if (!byDate[f]) byDate[f] = { fecha: f, hhR: 0, hhM: 0, met: 0, registros: 0 };
      byDate[f].hhR += hh;
      byDate[f].met += met;
      if (ipDatos.ipM && met > 0) byDate[f].hhM += met * ipDatos.ipM;
      byDate[f].registros += 1;
    });
    const arr = Object.values(byDate).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    return arr.map(d => {
      const cpi = d.hhR > 0 ? d.hhM / d.hhR : null;
      const ipReal = d.met > 0 ? d.hhR / d.met : null;
      return {
        fecha: d.fecha.slice(5),
        'CPI día': cpi !== null ? parseFloat(cpi.toFixed(3)) : null,
        'HH día': parseFloat(d.hhR.toFixed(1)),
        'Metrado': parseFloat(d.met.toFixed(2)),
        'Registros': d.registros,
      };
    });
  }, [filtrados, historial]);

  // ── 3. Ranking de actividades por CPI ──
  const rankingActividades = useMemo(() => {
    const acc = {};
    filtrados.forEach(r => {
      if (!r) return;
      const ipDatos = resolverIP(r, historial);
      const met = parseFloat(r.metrado) || 0;
      const hh = parseFloat(r.totalHH) || 0;
      if (met <= 0 || !ipDatos.ipM) return;
      const canon = r._actividadCanonica || (r.actividad || '').trim();
      if (!canon) return;
      if (!acc[canon]) acc[canon] = { actividad: canon, hhR: 0, hhM: 0, met: 0, count: 0 };
      acc[canon].hhR += hh;
      acc[canon].hhM += met * ipDatos.ipM;
      acc[canon].met += met;
      acc[canon].count += 1;
    });
    return Object.values(acc)
      .map(a => ({
        ...a,
        cpi: a.hhR > 0 ? a.hhM / a.hhR : null,
        ipReal: a.met > 0 ? a.hhR / a.met : null,
        nombre: a.actividad.length > 38 ? a.actividad.slice(0, 36) + '…' : a.actividad,
      }))
      .filter(a => a.cpi !== null && a.count >= 1)
      .sort((a, b) => a.cpi - b.cpi);
  }, [filtrados, historial]);

  const evolucionActividad = useMemo(() => {
    if (!actSel) return [];
    return filtrados
      .filter(r => (r._actividadCanonica || r.actividad) === actSel)
      .sort((a, b) => a.fecha < b.fecha ? -1 : 1)
      .map(r => {
        const ipDatos = resolverIP(r, historial);
        const met = parseFloat(r.metrado) || 0;
        const hh = parseFloat(r.totalHH) || 0;
        return {
          fecha: r.fecha,
          'IP Real': ipDatos.ipReal ? parseFloat(ipDatos.ipReal.toFixed(3)) : null,
          'IP Meta': ipDatos.ipM ? parseFloat(ipDatos.ipM.toFixed(3)) : null,
          'Metrado': met,
          'HH': hh,
        };
      });
  }, [actSel, filtrados, historial]);

  const diagnostico = useMemo(() => {
    if (!serieSemanal.tendencia?.valido) {
      return { icon: '📊', texto: 'Datos insuficientes para análisis (mínimo 2 semanas)', color: BASE.muted, bg: '#f8fafc' };
    }
    const { pendiente, r2 } = serieSemanal.tendencia;
    if (Math.abs(pendiente) < 0.01) {
      return { icon: '➡️', texto: `Tendencia ESTABLE (R²=${r2.toFixed(2)}). El CPI se mantiene constante.`, color: '#1d4ed8', bg: '#eff6ff' };
    }
    if (pendiente > 0.05) {
      return { icon: '📈', texto: `Tendencia POSITIVA fuerte (+${pendiente.toFixed(3)}/sem, R²=${r2.toFixed(2)}). Mejora cada semana.`, color: BASE.green, bg: '#f0fdf4' };
    }
    if (pendiente > 0) {
      return { icon: '📈', texto: `Tendencia POSITIVA leve (+${pendiente.toFixed(3)}/sem, R²=${r2.toFixed(2)}). Mejora gradual.`, color: BASE.green, bg: '#f0fdf4' };
    }
    if (pendiente < -0.05) {
      return { icon: '📉', texto: `Tendencia NEGATIVA fuerte (${pendiente.toFixed(3)}/sem, R²=${r2.toFixed(2)}). ¡Investigar causas raíz!`, color: '#dc2626', bg: '#fef2f2' };
    }
    return { icon: '📉', texto: `Tendencia NEGATIVA leve (${pendiente.toFixed(3)}/sem, R²=${r2.toFixed(2)}). Vigilar el desempeño.`, color: '#d97706', bg: '#fffbeb' };
  }, [serieSemanal.tendencia]);

  const actividadesDisponibles = useMemo(() => {
    const set = new Set();
    filtrados.forEach(r => {
      const canon = r._actividadCanonica || r.actividad;
      if (canon && parseFloat(r.metrado) > 0) set.add(canon);
    });
    return [...set].sort();
  }, [filtrados]);

  if (!filtrados.length) {
    return (
      <div style={{background:BASE.white,borderRadius:'14px',border:`1px solid ${BASE.border}`,padding:'48px',textAlign:'center'}}>
        <p style={{fontSize:'40px',marginBottom:'8px'}}>📈</p>
        <p style={{fontSize:'13px',fontWeight:'600',color:BASE.muted}}>Sin registros para analizar tendencias</p>
      </div>
    );
  }

  const cpiActual = serieSemanal.datos.at(-1)?.CPI;
  const cpiPromedio = serieSemanal.datos.length > 0
    ? serieSemanal.datos.reduce((s,d)=>s+(d.CPI||0),0) / (serieSemanal.datos.filter(d=>d.CPI).length || 1)
    : null;

  // CPI GLOBAL acumulado — mismo cálculo que el ISP (Σ HH-meta ÷ Σ HH-real)
  let _ghM = 0, _ghR = 0;
  filtrados.forEach(r => {
    const met = parseFloat(r.metrado) || 0;
    _ghR += parseFloat(r.totalHH) || 0;
    if (r._ipMeta && met > 0) _ghM += met * r._ipMeta;
  });
  const cpiGlobal = _ghR > 0 ? _ghM / _ghR : null;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      <VistaHeader icono="trendingUp" eyebrow="Producción"
        titulo="Tendencias"
        subtitulo="Evolución del CPI con tendencia ponderada y proyección a futuro" />

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(216px,1fr))',gap:'10px'}}>
        <Kpi icon="🌐" titulo="CPI GLOBAL" color={getEstado(cpiGlobal).color}
          valor={fmtCPIPct(cpiGlobal)} sub="Acumulado (= ISP)"/>
        <Kpi icon="🎯" titulo="CPI ÚLTIMA SEMANA" color={getEstado(cpiActual).color}
          valor={fmtCPIPct(cpiActual)} sub={`S${serieSemanal.ultimaSemana} solamente`}/>
        <Kpi icon="📊" titulo="CPI PROMEDIO" color={getEstado(cpiPromedio).color}
          valor={fmtCPIPct(cpiPromedio)} sub={`${serieSemanal.datos.length} semanas`}/>
        <Kpi icon="📈" titulo="PENDIENTE" color={serieSemanal.tendencia?.pendiente >= 0 ? BASE.green : '#dc2626'}
          valor={serieSemanal.tendencia?.valido ? `${serieSemanal.tendencia.pendiente >= 0 ? '+' : ''}${(serieSemanal.tendencia.pendiente * 100).toFixed(1)}%` : '—'}
          sub="Δ CPI por semana"/>
        <Kpi icon="🎲" titulo="CONFIANZA (R²)" color="#7c3aed"
          valor={serieSemanal.tendencia?.valido ? serieSemanal.tendencia.r2.toFixed(2) : '—'}
          sub={serieSemanal.tendencia?.r2 >= 0.7 ? 'Alta confianza' : serieSemanal.tendencia?.r2 >= 0.4 ? 'Confianza media' : 'Baja confianza'}/>
      </div>

      {/* PROYECCIÓN DE CIERRE DE OBRA */}
      {cierre && (
        <Card full color="#0d9488">
          <SectionTitle icon="🏁" title="PROYECCIÓN DE CIERRE DE OBRA"
            subtitle={`A este ritmo${confiable ? ' (tendencia reciente)' : ' (CPI acumulado — tendencia poco fiable)'}: HH y semana estimadas de término`}
            color="#0d9488"/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(216px,1fr))',gap:'10px',marginBottom:'14px'}}>
            <Kpi icon="📐" titulo="AVANCE FÍSICO" color={BASE.navy}
              valor={`${cierre.avancePct.toFixed(1)}%`} sub="ponderado por HH-meta"/>
            <Kpi icon="🗓️" titulo="SEMANA FIN EST." color="#7c3aed"
              valor={cierre.semanaFin != null ? `S${cierre.semanaFin}` : '—'}
              sub={cierre.semanasRestantes != null ? `faltan ~${cierre.semanasRestantes} sem` : 'sin velocidad'}/>
            <Kpi icon="⏱️" titulo="HH TOTAL PROYECTADAS" color={BASE.navy}
              valor={fmt1(cierre.hhRealTotalProy)} sub={`meta ${fmt1(cierre.hhMetaTotalPresup)} HH`}/>
            <Kpi icon={cierre.sobrecostoFinal > 0 ? '🔴' : '🟢'}
              titulo={cierre.sobrecostoFinal > 0 ? 'SOBRECOSTO FINAL' : 'AHORRO FINAL'}
              color={cierre.sobrecostoFinal > 0 ? '#dc2626' : BASE.green}
              valor={`${fmt1(Math.abs(cierre.sobrecostoFinal))} HH`}
              sub={`${((Math.abs(cierre.sobrecostoFinal)/cierre.hhMetaTotalPresup)*100).toFixed(1)}% vs presupuesto`}/>
            <Kpi icon="🎯" titulo="CPI FINAL ESPERADO" color={getEstado(cierre.cpiFinalProy).color}
              valor={fmtCPIPct(cierre.cpiFinalProy)} sub={`ritmo ${cierre.velHHMetaSem ? fmt1(cierre.velHHMetaSem)+' HH-meta/sem' : '—'}`}/>
          </div>
          {/* Barra de avance físico */}
          <div style={{background:'#f1f5f9',borderRadius:'8px',height:'14px',overflow:'hidden',position:'relative'}}>
            <div style={{width:`${cierre.avancePct}%`,height:'100%',background:`linear-gradient(90deg, ${BASE.navy}, #0d9488)`,borderRadius:'8px',transition:'width 0.4s'}}/>
          </div>
          <p style={{fontSize:'10.5px',color:BASE.muted,marginTop:'8px',fontStyle:'italic'}}>
            Cálculo: HH-meta restantes ÷ CPI de referencia ({fmtCPI(cierre.cpiRef)}) = HH reales para terminar; semana fin = ritmo de HH-meta ganadas/semana (últimas 4).
          </p>
        </Card>
      )}

      {/* GRÁFICO ÚNICO — EVOLUCIÓN + TENDENCIA + PROYECCIÓN (consolidado) */}
      <Card full color="#7c3aed">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
          <SectionTitle icon="📈" title="EVOLUCIÓN Y PROYECCIÓN DEL CPI"
            subtitle="CPI semanal · media móvil · tendencia · proyección punteada ±1σ" color="#7c3aed"/>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <button onClick={()=>setPonderar(p=>!p)} title="Da más peso a las semanas recientes para que un mal arranque no contamine la proyección"
              style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'5px 10px',background:ponderar?'#0d9488':'#f1f5f9',color:ponderar?'#fff':BASE.muted,border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>
              {ponderar ? '⚖️ Ponderado' : '➖ OLS'}
            </button>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <small style={{fontSize:'11px',color:BASE.muted,fontWeight:'600'}}>Horizonte:</small>
              {[2, 4, 6, 8].map(n => (
                <button key={n} onClick={()=>setHorizonteProy(n)}
                  style={{padding:'5px 9px',background:horizonteProy===n?'#7c3aed':'#f1f5f9',color:horizonteProy===n?'#fff':BASE.muted,border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>
                  {n}s
                </button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={serieConProyeccion} margin={{top:10,right:30,left:10,bottom:10}}>
            <defs>{degradado('grad_bandaSup', '#7c3aed')}</defs>
            <CartesianGrid {...GRILLA}/>
            <XAxis {...EJE} dataKey="semana" tickMargin={8}/>
            <YAxis {...EJE} domain={[0, 1.8]} tickMargin={6}
              tickFormatter={v => `${Math.round(v * 100)}%`}/>
            <Tooltip {...TOOLTIP_STYLE} content={<Tip/>}/>
            <Legend {...LEYENDA}/>
            <ReferenceLine y={1} stroke={BASE.green} strokeDasharray="5 3" label={{value:'META 100%',fill:BASE.green,fontSize:10,position:'right'}}/>
            <ReferenceLine y={0.85} stroke="#d97706" strokeDasharray="5 3" label={{value:'ALERTA 85%',fill:'#d97706',fontSize:10,position:'right'}}/>
            <ReferenceLine x={`S${serieSemanal.ultimaSemana}`} stroke={BASE.muted} strokeWidth={1.5} label={{value:'AHORA',fill:BASE.muted,fontSize:10,position:'top'}}/>

            <Area type="monotone" dataKey="Banda Sup" stroke="none" fill="url(#grad_bandaSup)" fillOpacity={confiable ? 1 : 0.4} legendType="none"/>
            <Area type="monotone" dataKey="Banda Inf" stroke="none" fill="#fff" fillOpacity={1} legendType="none"/>

            <Line type="monotone" dataKey="CPI" stroke={BASE.navy} strokeWidth={2.5} dot={{r:3,fill:BASE.navy,strokeWidth:2,stroke:'#fff'}} activeDot={{r:5}} connectNulls={false}/>
            <Line type="monotone" dataKey="Media móvil (3)" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="4 4" dot={false} activeDot={{r:5}}/>
            <Line type="monotone" dataKey="Tendencia CPI" stroke="#dc2626" strokeWidth={2.5} strokeDasharray="6 3" dot={false} activeDot={{r:5}}/>
            <Line type="monotone" dataKey="Proyección CPI" stroke="#7c3aed" strokeWidth={confiable ? 2.5 : 1.5} strokeOpacity={confiable ? 1 : 0.45} strokeDasharray="6 3" dot={confiable ? {r:3,fill:'#7c3aed',strokeWidth:2,stroke:'#fff'} : false} activeDot={{r:5}} connectNulls={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </Card>


      {/* RANKING ACTIVIDADES */}
      {rankingActividades.length > 0 && (
        <Card>
          <SectionTitle icon="🏆" title="RANKING POR CPI" subtitle="Actividades de peor a mejor — foco en las primeras (top 10)" color="#dc2626"/>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {rankingActividades.slice(0, 10).map((a, i) => {
              const cc = getEstado(a.cpi);
              return (
                <div key={a.actividad} onClick={() => setActSel(a.actividad)}
                  style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:i % 2 === 0 ? '#f8fafc' : BASE.white,borderRadius:'8px',cursor:'pointer',border:actSel === a.actividad ? `2px solid ${BASE.navy}` : `1px solid ${BASE.border}`,transition:'0.2s'}}>
                  <span style={{fontSize:'13px',fontWeight:'800',color:BASE.muted,minWidth:'28px'}}>#{i + 1}</span>
                  <span style={{flex:1,fontSize:'12px',fontWeight:'600',color:BASE.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={a.actividad}>{a.nombre}</span>
                  <span style={{fontSize:'10px',color:BASE.muted,whiteSpace:'nowrap'}}>{a.count} reg.</span>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'70px',height:'6px',background:'#e2e8f0',borderRadius:'3px',overflow:'hidden'}}>
                      <div style={{width:`${Math.min(100, (a.cpi / 1.5) * 100)}%`,height:'100%',background:cc.color,borderRadius:'3px'}}/>
                    </div>
                    <span style={{fontSize:'13px',fontWeight:'800',color:cc.color,minWidth:'42px',textAlign:'right'}}>{fmtCPIPct(a.cpi)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{fontSize:'10px',color:BASE.muted,marginTop:'10px',fontStyle:'italic'}}>
            💡 Click en una actividad para ver su evolución
          </p>
        </Card>
      )}

      {/* EVOLUCIÓN POR ACTIVIDAD */}
      <Card full>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',marginBottom:'14px'}}>
          <SectionTitle icon="🔍" title="EVOLUCIÓN POR ACTIVIDAD" subtitle="IP Real vs IP Meta a lo largo del tiempo" color="#7c3aed"/>
          <select value={actSel} onChange={e => setActSel(e.target.value)}
            style={{padding:'10px 14px',borderRadius:'8px',border:`1.5px solid ${BASE.border}`,fontSize:'12px',background:'#f8fafc',minWidth:'220px',maxWidth:'360px',fontWeight:'600'}}>
            <option value="">— Selecciona una actividad —</option>
            {actividadesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {!actSel ? (
          <p style={{textAlign:'center',color:BASE.muted,padding:'30px',fontSize:'13px'}}>
            Elige una actividad o haz click en el ranking para ver su evolución
          </p>
        ) : evolucionActividad.length < 2 ? (
          <p style={{textAlign:'center',color:BASE.muted,padding:'30px',fontSize:'13px'}}>
            Solo hay {evolucionActividad.length} registro(s) — se necesitan al menos 2
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucionActividad} margin={{top:10,right:30,left:10,bottom:50}}>
              <CartesianGrid {...GRILLA}/>
              <XAxis {...EJE} dataKey="fecha" angle={-30} textAnchor="end" height={50}/>
              <YAxis {...EJE} tickMargin={6}/>
              <Tooltip {...TOOLTIP_STYLE} content={<Tip/>}/>
              <Legend {...LEYENDA}/>
              <Line type="monotone" dataKey="IP Real" stroke={BASE.navy} strokeWidth={2.5} dot={{r:3,fill:BASE.navy,strokeWidth:2,stroke:'#fff'}} activeDot={{r:5}}/>
              <Line type="monotone" dataKey="IP Meta" stroke={BASE.green} strokeWidth={2.5} strokeDasharray="5 3" dot={{r:3,fill:BASE.green,strokeWidth:2,stroke:'#fff'}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}