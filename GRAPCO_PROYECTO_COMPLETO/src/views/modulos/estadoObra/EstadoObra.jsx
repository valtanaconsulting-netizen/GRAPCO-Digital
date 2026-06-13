// src/views/modulos/estadoObra/EstadoObra.jsx
// TABLERO "ESTADO DE OBRA" — una sola pantalla que reúne TODO el proyecto:
//   · Avance físico y fin de obra (del Cronograma Pro / CPM)
//   · CPI y sobrecosto (MISMA función que el Dashboard Ejecutivo → cifras
//     idénticas en todos lados: calcularIndicadoresDiarios)
//   · PPC del Last Planner · Calidad (protocolos/NC) · Seguridad (SSOMA)
//   · Mini Curva S programada (del cronograma)
// Lee las MISMAS colecciones que cada módulo, filtradas por proyecto activo,
// así que ningún número "pelea" con el de su módulo de origen.
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { useCatalogoWBS } from '../../../hooks/useCatalogoWBS';
import { BASE } from '../../../utils/styles';
import { getEstado, fmtMoney, COSTO_HORA_PROMEDIO, hoy } from '../../../utils/helpers';
import { enriquecerHistorial, calcularIndicadoresDiarios } from '../../../utils/indicadoresEjecutivos';
import { calcularCPM, renumerarEDT, indiceDeFecha, isoDeFecha } from '../../../utils/cpm';
import VistaHeader from '../../../components/VistaHeader';
import Icon from '../../../components/Icon';
import SkeletonPantalla from '../../../components/SkeletonPantalla';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine,
} from 'recharts';
import { EJE, GRILLA, TOOLTIP_STYLE, degradado } from '../../../utils/chartKit';

const MONO = 'var(--grapco-font-mono, ui-monospace, monospace)';

export default function EstadoObra({ irA }) {
  const { proyectoActivoId, proyectoActivo, filtrarPorContexto, fechaInicioProyecto } = useProyectoActivo();
  const { infoMap } = useCatalogoWBS(proyectoActivoId);

  const [registros, setRegistros] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  const [crono, setCrono] = useState(null);
  const [lps, setLps] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    const delProy = (arr) => arr.filter(d => d.proyectoId === proyectoActivoId);
    const subs = [
      onSnapshot(collection(db, 'Registros_Campo'), s => { if (vivo) { setRegistros(filtrarPorContexto(s.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })); setLoading(false); } }, () => setLoading(false)),
      onSnapshot(collection(db, 'Protocolos'), s => vivo && setProtocolos(delProy(s.docs.map(d => ({ id: d.id, ...d.data() }))))),
      onSnapshot(collection(db, 'NoConformidades'), s => vivo && setNcs(delProy(s.docs.map(d => ({ id: d.id, ...d.data() }))))),
      onSnapshot(collection(db, 'InspeccionesSeguridad'), s => vivo && setInspecciones(delProy(s.docs.map(d => ({ id: d.id, ...d.data() }))))),
    ];
    (async () => {
      try {
        const [c, l] = await Promise.all([
          getDoc(doc(db, 'Cronogramas', proyectoActivoId || '_')),
          getDoc(doc(db, 'LPS', proyectoActivoId || '_')),
        ]);
        if (!vivo) return;
        setCrono(c.exists() ? c.data() : false);
        setLps(l.exists() ? l.data() : false);
      } catch { if (vivo) { setCrono(false); setLps(false); } }
    })();
    return () => { vivo = false; subs.forEach(u => u()); };
  }, [proyectoActivoId, filtrarPorContexto]);

  // CPM del cronograma → avance físico, fin de obra, ruta crítica, curva S
  const cpm = useMemo(() => {
    if (!crono || !crono.tareas?.length) return null;
    return calcularCPM(renumerarEDT(crono.tareas), crono.fechaInicio || '2025-12-15');
  }, [crono]);

  // Indicadores ejecutivos — MISMA fuente que el Dashboard Ejecutivo (coherencia)
  const ind = useMemo(() => {
    const enr = enriquecerHistorial(registros, infoMap);
    const compromisos = lps && lps.semanas
      ? Object.values(lps.semanas).flatMap(s => s.compromisos || [])
      : [];
    return calcularIndicadoresDiarios({
      historialEnriquecido: enr, infoMap, protocolos, ncs,
      compromisos, inspecciones, costoHH: COSTO_HORA_PROMEDIO, fecha: hoy(),
    });
  }, [registros, infoMap, protocolos, ncs, inspecciones, lps]);

  // Curva S programada (del cronograma) + marca de HOY
  const curvaS = useMemo(() => {
    if (!cpm) return null;
    const hojas = cpm.tareas.filter(t => !t.resumen && t.duracion > 0);
    const total = hojas.reduce((s, t) => s + t.duracion, 0);
    if (!total) return null;
    const nSem = Math.ceil(cpm.duracionProyecto / 6) + 1;
    const pts = [];
    for (let w = 0; w <= nSem; w++) {
      const corte = w * 6;
      const prog = hojas.reduce((s, t) => s + (t.ef <= t.es ? 1 : Math.min(1, Math.max(0, (corte - t.es) / (t.ef - t.es)))) * t.duracion, 0) / total * 100;
      pts.push({ sem: `S${w}`, Programado: Math.round(prog) });
    }
    const semHoy = Math.max(0, Math.floor(indiceDeFecha(crono.fechaInicio || '2025-12-15', isoDeFecha(new Date())) / 6));
    return { pts, semHoy };
  }, [cpm, crono]);

  if (loading && !registros.length && crono === null) return <SkeletonPantalla titulo="Cargando estado de obra" />;

  const avanceFisico = cpm ? cpm.avanceGlobal : (ind.avancePct != null ? Math.round(ind.avancePct) : null);
  const cpi = ind.cpi;
  const cpiEstado = cpi != null ? getEstado(cpi) : null;
  const ppc = ind.ppcPct;
  const cal = ind.calidad || {};
  const ssoma = ind.ssoma || {};

  // ── Tarjetas KPI ──
  const card = (titulo, valor, sub, color, iconName, onClick) => (
    <div onClick={onClick} style={{
      flex: '1 1 180px', minWidth: '170px', background: BASE.white,
      border: `1px solid ${BASE.border}`, borderTop: `3px solid ${color || BASE.navy}`,
      borderRadius: '14px', padding: '14px 16px', boxShadow: BASE.shadowMd,
      cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s ease, box-shadow .15s ease',
    }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = BASE.shadowLg; } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = BASE.shadowMd; } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 800, color: BASE.mutedSoft, letterSpacing: '1.1px', textTransform: 'uppercase' }}>{titulo}</span>
        <Icon name={iconName} size={15} color={color || BASE.navy} strokeWidth={2} />
      </div>
      <p style={{ fontSize: '26px', fontWeight: 900, color: color || BASE.navy, fontFamily: MONO, lineHeight: 1 }}>{valor}</p>
      {sub && <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '5px', fontWeight: 600 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <VistaHeader icono="dashboard" eyebrow="Resumen ejecutivo"
        titulo="Estado de Obra"
        subtitulo={`${proyectoActivo?.nombre || 'Proyecto'} — avance, costo, plan, calidad y seguridad en una sola vista`} />

      {/* KPIs hero */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {card('Avance físico', avanceFisico != null ? `${avanceFisico}%` : '—',
          cpm ? `Fin de obra: ${cpm.finProyecto}` : 'Sin cronograma', BASE.navy, 'barChart3',
          irA && (() => irA('cronogramaobra')))}
        {card('CPI', cpi != null ? cpi.toFixed(2) : '—',
          cpiEstado ? cpiEstado.label : 'Sin registros', cpiEstado?.color || BASE.mutedSoft, 'target',
          irA && (() => irA('dashboard')))}
        {card('Sobrecosto MO', ind.sobrecosto != null ? fmtMoney(Math.abs(ind.sobrecosto)) : '—',
          ind.sobrecosto > 0 ? 'Pérdida acumulada' : ind.sobrecosto < 0 ? 'Ahorro acumulado' : 'En meta',
          ind.sobrecosto > 0 ? BASE.red : BASE.green, 'coins', irA && (() => irA('dashboard')))}
        {card('PPC (Last Planner)', ppc != null ? `${ppc}%` : '—',
          ppc != null ? (ppc >= 80 ? 'Cumple meta 80%' : 'Bajo meta') : 'Sin plan semanal',
          ppc == null ? BASE.mutedSoft : ppc >= 80 ? BASE.green : ppc >= 60 ? BASE.goldDark : BASE.red, 'checkSquare',
          irA && (() => irA('lps')))}
        {card('Calidad', cal.totalProt != null ? `${cal.pctLiberado ?? 0}%` : '—',
          `${cal.ncAbiertas ?? 0} NC abiertas · ${cal.totalProt ?? 0} protocolos`, BASE.navyLight, 'shield',
          irA && (() => irA('calidad')))}
        {card('Seguridad', ssoma.diasSinCritico != null ? `${ssoma.diasSinCritico} d` : '—',
          'sin incidente crítico', ssoma.criticosHoy > 0 ? BASE.red : BASE.green, 'alert',
          irA && (() => irA('seguridad')))}
      </div>

      {/* Curva S programada */}
      {curvaS ? (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', boxShadow: BASE.shadowMd, padding: '14px 12px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 6px 8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: BASE.navy, letterSpacing: '1.1px', textTransform: 'uppercase', borderLeft: `3px solid ${BASE.gold}`, paddingLeft: '8px' }}>Curva S programada</span>
            <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: 600 }}>
              Programado a hoy: <strong style={{ fontFamily: MONO, color: BASE.navy }}>{curvaS.pts[curvaS.semHoy]?.Programado ?? '—'}%</strong>
              {avanceFisico != null && <> · Real: <strong style={{ fontFamily: MONO, color: (curvaS.pts[curvaS.semHoy]?.Programado ?? 0) > avanceFisico ? BASE.red : BASE.green }}>{avanceFisico}%</strong></>}
            </span>
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curvaS.pts} margin={{ top: 6, right: 18, bottom: 0, left: -16 }}>
                <defs>{degradado('grad_estadoObra', BASE.navy)}</defs>
                <CartesianGrid {...GRILLA} />
                <XAxis {...EJE} dataKey="sem" interval="preserveStartEnd" />
                <YAxis {...EJE} domain={[0, 100]} unit="%" />
                <RTooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Programado']} />
                <ReferenceLine x={`S${curvaS.semHoy}`} stroke={BASE.red} strokeDasharray="4 3" label={{ value: 'HOY', fontSize: 9, fill: BASE.red, position: 'top' }} />
                <Area type="monotone" dataKey="Programado" stroke={BASE.navy} strokeWidth={2.5} fill="url(#grad_estadoObra)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '24px', textAlign: 'center', color: BASE.muted, fontSize: '12.5px' }}>
          Crea el cronograma del proyecto en <strong>Cronograma de Obra</strong> para ver la Curva S y el avance físico.
        </div>
      )}

      <p style={{ fontSize: '10.5px', color: BASE.mutedSoft, textAlign: 'center', lineHeight: 1.5 }}>
        Toca una tarjeta para ir al módulo de detalle. Todas las cifras se calculan de la misma fuente que cada módulo — sin números que se contradigan.
      </p>
    </div>
  );
}
