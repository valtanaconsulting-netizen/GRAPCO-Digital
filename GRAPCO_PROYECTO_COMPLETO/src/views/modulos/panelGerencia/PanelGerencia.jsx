// src/views/modulos/panelGerencia/PanelGerencia.jsx — Panel Ejecutivo Integrado (B22)
//
// LA VISTA WOW para sustentación. Integra todo en una sola pantalla:
//   - KPIs RO (margen, CPI, EAC)
//   - Estado de avance del proyecto
//   - Calidad (% liberación, NCs)
//   - LPS (PPC, lookahead)
//   - Materiales (consumo, alertas stock)
//   - Alertas críticas (partidas en pérdida)
// Es el dashboard que ve el Director de Operaciones.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import RoleGuard from '../../../components/RoleGuard';
import {
  calcularROMensual, CATEGORIAS_MO, obtenerActividadesHoja,
  fmtSoles, fmtPct, fmtNumero, colorMargen, colorCPI,
  ESTADOS_ACTIVIDAD,
} from '../../../utils/planMaestroAnalytics';

export default function PanelGerencia({ showToast }) {
  const { proyectoActivoId } = useProyectoActivo();
  // Cargar TODO (filtrado por proyecto activo)
  const [actividades, setActividades] = useState([]);
  const [apus, setApus] = useState([]);
  const [tareos, setTareos] = useState([]);
  const [kardex, setKardex] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [ncs, setNCs] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [valorizaciones, setValorizaciones] = useState([]);
  const [planDiario, setPlanDiario] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pendientes = 9;
    const dec = () => { pendientes -= 1; if (pendientes <= 0) setLoading(false); };
    // Aislamiento por proyecto: cada colección se filtra en cliente por
    // proyectoId === proyecto activo (sin índices compuestos). El panel
    // ejecutivo de gerencia ve SOLO la obra seleccionada.
    const cb = (setter) => (snap) => {
      setter(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.proyectoId === proyectoActivoId));
      dec();
    };
    const errCb = (e) => { console.warn(e); dec(); };
    const unsubs = [
      onSnapshot(collection(db, 'PlanMaestro'), cb(setActividades), errCb),
      onSnapshot(collection(db, 'APUs'), cb(setApus), errCb),
      onSnapshot(collection(db, 'Registros_Campo'), cb(setTareos), errCb),
      onSnapshot(collection(db, 'Kardex_Movimientos'), cb(setKardex), errCb),
      onSnapshot(collection(db, 'Protocolos'), cb(setProtocolos), errCb),
      onSnapshot(collection(db, 'NoConformidades'), cb(setNCs), errCb),
      onSnapshot(collection(db, 'Historial'), cb(setHistorial), errCb),
      onSnapshot(collection(db, 'ValorizacionesContractuales'), cb(setValorizaciones), errCb),
      onSnapshot(query(collection(db, 'PlanDiario'), orderBy('fecha', 'desc'), limit(60)), cb(setPlanDiario), errCb),
    ];
    return () => unsubs.forEach(u => u());
  }, [proyectoActivoId]);

  // Calcular RO
  const salariosMap = useMemo(() => {
    const m = new Map();
    CATEGORIAS_MO.forEach(c => m.set(c.id, c.salarioBase));
    return m;
  }, []);

  const ro = useMemo(() => {
    if (loading) return null;
    return calcularROMensual({
      actividades, apus, tareos,
      kardexMovimientos: kardex,
      valorizaciones,
      salariosPorCategoria: salariosMap,
      fechaActual: new Date(),
      margenMeta: 15,
    });
  }, [loading, actividades, apus, tareos, kardex, valorizaciones, salariosMap]);

  // Indicadores de Calidad
  const calidadStats = useMemo(() => {
    const total = protocolos.length;
    const liberados = protocolos.filter(p => p.estado === 'liberado').length;
    const observados = protocolos.filter(p => p.estado === 'observado' || p.estado === 'rechazado').length;
    const ncsAbiertas = ncs.filter(n => n.estado === 'abierta' || n.estado === 'tratamiento').length;
    const ncsCriticas = ncs.filter(n => (n.estado === 'abierta' || n.estado === 'tratamiento') && n.severidad === 'critica').length;
    return {
      total, liberados, observados, ncsAbiertas, ncsCriticas,
      pctLiberacion: total > 0 ? (liberados / total) * 100 : 0,
    };
  }, [protocolos, ncs]);

  // Indicadores LPS — PPC promedio últimos 30 días
  const lpsStats = useMemo(() => {
    if (!planDiario.length) return null;
    let totalCompromisos = 0, totalCumplidos = 0;
    for (const dia of planDiario) {
      if (Array.isArray(dia.actividades)) {
        for (const act of dia.actividades) {
          totalCompromisos += 1;
          if (act.cumplido === true || act.estado === 'cumplido') totalCumplidos += 1;
        }
      }
    }
    return {
      ppc: totalCompromisos > 0 ? (totalCumplidos / totalCompromisos) * 100 : 0,
      totalDias: planDiario.length,
      totalCompromisos,
    };
  }, [planDiario]);

  // Avance global del proyecto
  const avanceGlobal = useMemo(() => {
    const hojas = obtenerActividadesHoja(actividades);
    const presupuesto = hojas.reduce((s, a) => s + (a.metradoContractual || 0) * (a.precioUnitario || 0), 0);
    const ejecutado = hojas.reduce((s, a) => s + (a.avanceMetradoAcum || 0) * (a.precioUnitario || 0), 0);
    const enEjec = hojas.filter(a => a.estado === 'en_ejecucion').length;
    const completas = hojas.filter(a => a.estado === 'completada').length;
    return {
      presupuesto, ejecutado,
      pct: presupuesto > 0 ? (ejecutado / presupuesto) * 100 : 0,
      total: hojas.length, enEjec, completas,
    };
  }, [actividades]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando panel ejecutivo...</p>;

  return (
    <RoleGuard rolesPermitidos={['admin']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* HERO slim */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #0f1a2e)',
          borderRadius: '12px', padding: '14px 20px', color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '10px',
        }}>
          <div>
            <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
              🏛️ PANEL EJECUTIVO DE GERENCIA · DIRECTOR DE OPERACIONES
            </p>
            <h2 style={{ fontSize: '19px', fontWeight: '900', marginTop: '3px', letterSpacing: '-0.3px' }}>
              Vista integral del proyecto en tiempo real
            </h2>
          </div>
          <span style={{ fontSize: '10px', opacity: 0.7, maxWidth: '330px', textAlign: 'right' }}>
            Datos cruzados: Plan Maestro · APUs · Tareos · Kardex · Calidad · LPS · Valorizaciones
          </span>
        </div>

        {/* KPIs FINANCIEROS */}
        {ro && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <KPI label="MARGEN REAL ACTUAL" valor={fmtPct(ro.indicadoresGlobales.margenReal)}
              color={colorMargen(ro.indicadoresGlobales.margenReal, 15)}
              sub={`Meta: ${ro.indicadoresGlobales.margenMeta}%`}
              icono={ro.indicadoresGlobales.margenReal >= 15 ? '✅' : '⚠️'} grande />
            <KPI label="CPI · COSTO" valor={ro.indicadoresGlobales.CPI?.toFixed(3) || '—'}
              color={colorCPI(ro.indicadoresGlobales.CPI)}
              sub={ro.indicadoresGlobales.CPI >= 1 ? 'Bajo presupuesto' : 'Sobrecosto'}
              icono="💰" grande />
            <KPI label="SPI · CRONOGRAMA" valor={ro.indicadoresGlobales.SPI?.toFixed(3) || '—'}
              color={colorCPI(ro.indicadoresGlobales.SPI)}
              sub={ro.indicadoresGlobales.SPI >= 1 ? 'Adelantado' : 'Atrasado'}
              icono="⏱️" grande />
            <KPI label="EAC · PROYECCIÓN AL CIERRE" valor={fmtSoles(ro.indicadoresGlobales.EAC)}
              color={ro.indicadoresGlobales.EAC > ro.totales.BAC ? BASE.red : BASE.green}
              sub={ro.indicadoresGlobales.EAC > ro.totales.BAC
                ? `+${fmtSoles(ro.indicadoresGlobales.EAC - ro.totales.BAC)}`
                : 'Dentro de presupuesto'}
              icono="🎯" grande />
          </div>
        )}

        {/* AVANCE FÍSICO + GRÁFICA EVM */}
        {ro && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
            <Card titulo="📈 AVANCE FÍSICO DEL PROYECTO" color={BASE.gold}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.4px' }}>
                  {fmtPct(avanceGlobal.pct)}
                </span>
                <span style={{ fontSize: '11px', color: BASE.muted }}>
                  {fmtSoles(avanceGlobal.ejecutado)} / {fmtSoles(avanceGlobal.presupuesto)}
                </span>
              </div>
              <div style={{ background: BASE.bgSoft, height: '12px', borderRadius: '7px', overflow: 'hidden', marginTop: '8px' }}>
                <div style={{
                  background: `linear-gradient(90deg, ${BASE.navy}, ${BASE.gold})`,
                  height: '100%', width: `${Math.min(100, avanceGlobal.pct)}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                <Mini label="Total" valor={avanceGlobal.total} color={BASE.navy} />
                <Mini label="En ejec." valor={avanceGlobal.enEjec} color="#f59e0b" />
                <Mini label="Completas" valor={avanceGlobal.completas} color={BASE.green} />
              </div>
            </Card>

            <Card titulo="📊 EVM · VALORES PRINCIPALES" color={BASE.navy}>
              <EVMRow label="BAC" valor={fmtSoles(ro.totales.BAC)} desc="Presupuesto contractual" />
              <EVMRow label="PV" valor={fmtSoles(ro.totales.PV)} desc="Valor planificado" />
              <EVMRow label="EV" valor={fmtSoles(ro.totales.EV)} desc="Valor ganado" highlight />
              <EVMRow label="AC" valor={fmtSoles(ro.totales.AC)} desc="Costo real" />
              <EVMRow label="VAC" valor={fmtSoles(ro.indicadoresGlobales.VAC)}
                color={ro.indicadoresGlobales.VAC >= 0 ? BASE.green : BASE.red}
                desc="Margen final proyectado" highlight />
            </Card>
          </div>
        )}

        {/* INDICADORES POR PILAR (5 columnas: LPS, Materiales, Calidad, OT, BIM) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <Pillar titulo="🦺 CALIDAD" color="#ec4899">
            <PillarKPI label="% Liberación" valor={fmtPct(calidadStats.pctLiberacion, 0)}
              color={calidadStats.pctLiberacion >= 80 ? BASE.green : '#f59e0b'} />
            <PillarKPI label="Protocolos" valor={`${calidadStats.liberados}/${calidadStats.total}`}
              color={BASE.navy} />
            <PillarKPI label="NCs abiertas" valor={calidadStats.ncsAbiertas}
              color={calidadStats.ncsCriticas > 0 ? BASE.red : calidadStats.ncsAbiertas > 0 ? '#f59e0b' : BASE.green} />
          </Pillar>

          <Pillar titulo="📅 LPS · ÚLTIMOS 30D" color="#7c3aed">
            <PillarKPI label="PPC promedio" valor={lpsStats ? fmtPct(lpsStats.ppc, 0) : '—'}
              color={lpsStats?.ppc >= 70 ? BASE.green : '#f59e0b'} />
            <PillarKPI label="Días registrados" valor={lpsStats?.totalDias || 0}
              color={BASE.navy} />
            <PillarKPI label="Compromisos" valor={lpsStats?.totalCompromisos || 0}
              color={BASE.navy} />
          </Pillar>

          <Pillar titulo="📦 MATERIALES" color="#0d9488">
            <PillarKPI label="Movimientos" valor={kardex.length} color={BASE.navy} />
            <PillarKPI label="Salidas hoy"
              valor={kardex.filter(m => {
                if (m.tipo !== 'SALIDA') return false;
                const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
                return f.toDateString() === new Date().toDateString();
              }).length}
              color={BASE.gold} />
            <PillarKPI label="Vinculadas WBS"
              valor={kardex.filter(m => m.partidaDestino).length}
              color={BASE.green} />
          </Pillar>

          <Pillar titulo="📊 OFICINA TÉCNICA" color="#6366f1">
            <PillarKPI label="Valorizaciones" valor={valorizaciones.length} color={BASE.navy} />
            <PillarKPI label="Cobrado"
              valor={fmtSoles(valorizaciones.filter(v => v.estado === 'pagada').reduce((s, v) => s + (v.total || 0), 0))}
              color={BASE.green} chico />
            <PillarKPI label="Pendientes"
              valor={valorizaciones.filter(v => v.estado === 'borrador' || v.estado === 'enviada').length}
              color="#f59e0b" />
          </Pillar>

          <Pillar titulo="👷 TAREOS · HH" color="#dc2626">
            <PillarKPI label="HH acumuladas"
              valor={fmtNumero(tareos.reduce((s, t) => s + (t.horasHombre || t.hh || 0), 0), 0)}
              color={BASE.navy} chico />
            <PillarKPI label="Personas-día" valor={tareos.length} color={BASE.gold} />
            <PillarKPI label="Vinculadas WBS"
              valor={tareos.filter(t => t.partida || t.actividad).length}
              color={BASE.green} />
          </Pillar>
        </div>

        {/* ALERTAS CRÍTICAS */}
        {ro && (ro.partidasCriticas.length > 0 || calidadStats.ncsCriticas > 0) && (
          <Card titulo={`🚨 ALERTAS CRÍTICAS DEL PROYECTO`} color={BASE.red}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {calidadStats.ncsCriticas > 0 && (
                <Alerta nivel="CRITICO" tipo="CALIDAD"
                  mensaje={`${calidadStats.ncsCriticas} No Conformidades CRÍTICAS abiertas requieren atención inmediata`} />
              )}
              {ro.indicadoresGlobales.margenReal < 0 && (
                <Alerta nivel="CRITICO" tipo="FINANCIERO"
                  mensaje={`Margen real negativo: ${fmtPct(ro.indicadoresGlobales.margenReal)}. Pérdida proyectada: ${fmtSoles(Math.abs(ro.indicadoresGlobales.VAC))}`} />
              )}
              {ro.indicadoresGlobales.CPI < 0.85 && (
                <Alerta nivel="ALTO" tipo="COSTO"
                  mensaje={`CPI = ${ro.indicadoresGlobales.CPI?.toFixed(3)} indica sobrecosto crítico (${fmtPct((1 - ro.indicadoresGlobales.CPI) * 100)} sobre presupuesto)`} />
              )}
              {ro.indicadoresGlobales.SPI < 0.85 && (
                <Alerta nivel="ALTO" tipo="CRONOGRAMA"
                  mensaje={`SPI = ${ro.indicadoresGlobales.SPI?.toFixed(3)} indica atraso crítico de ${fmtPct((1 - ro.indicadoresGlobales.SPI) * 100)}`} />
              )}
              {ro.partidasCriticas.slice(0, 5).map(p => (
                <Alerta key={p.codigo} nivel={p.severidad === 'critica' ? 'CRITICO' : 'ALTO'} tipo="PARTIDA"
                  mensaje={`${p.codigo} - ${p.descripcion}: margen ${fmtPct(p.margenReal)} (vendido ${fmtSoles(p.vendido)}, real ${fmtSoles(p.costoReal)})`} />
              ))}
            </div>
          </Card>
        )}

        {/* PARTIDAS ESTRELLA */}
        {ro && ro.partidasEstrella.length > 0 && (
          <Card titulo={`⭐ PARTIDAS ESTRELLA (Margen sobre meta)`} color={BASE.green}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {ro.partidasEstrella.slice(0, 6).map(p => (
                <div key={p.codigo} style={{
                  background: '#dcfce7', border: '1px solid #16a34a55',
                  borderLeft: `4px solid ${BASE.green}`,
                  borderRadius: '10px', padding: '10px 14px',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.greenDark, fontFamily: 'monospace' }}>{p.codigo}</p>
                  <p style={{ fontSize: '12px', color: BASE.text, marginTop: '2px' }}>{p.descripcion}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px' }}>
                    <span style={{ color: BASE.muted }}>Margen: </span>
                    <span style={{ fontWeight: '900', color: BASE.greenDark }}>{fmtPct(p.margenReal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}

function KPI({ label, valor, color, sub, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '10px', padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: '11px',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
        background: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>{icono}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{label}</p>
        <p style={{ fontSize: '18px', fontWeight: '900', color, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{valor}</p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>
      </div>
    </div>
  );
}

function Card({ titulo, color, children }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ background: BASE.bgSoft, padding: '12px 18px', borderBottom: `1px solid ${BASE.border}`, borderLeft: `4px solid ${color}` }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>{titulo}</p>
      </div>
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  );
}

function Mini({ label, valor, color }) {
  return (
    <div style={{
      background: color + '12', border: `1px solid ${color}33`,
      borderRadius: '8px', padding: '8px 10px', textAlign: 'center',
    }}>
      <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '18px', fontWeight: '900', color, marginTop: '2px' }}>{valor}</p>
    </div>
  );
}

function EVMRow({ label, valor, desc, highlight, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${BASE.border}`,
      ...(highlight ? { background: BASE.bgSoft, padding: '8px 12px', borderRadius: '6px', margin: '4px 0', borderBottom: 'none' } : {}),
    }}>
      <div>
        <p style={{ fontSize: '11px', fontWeight: '900', color: color || BASE.navy, fontFamily: 'monospace' }}>{label}</p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{desc}</p>
      </div>
      <p style={{ fontSize: '14px', fontWeight: '900', color: color || BASE.navy, fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}

function Pillar({ titulo, color, children }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 16px',
      borderTop: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: '10.5px', fontWeight: '900', color, letterSpacing: '0.6px', marginBottom: '10px' }}>{titulo}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {children}
      </div>
    </div>
  );
}

function PillarKPI({ label, valor, color, chico }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: '700' }}>{label}</span>
      <span style={{
        fontSize: chico ? '11.5px' : '14px',
        fontWeight: '900', color,
        fontFamily: 'monospace',
      }}>{valor}</span>
    </div>
  );
}

function Alerta({ nivel, tipo, mensaje }) {
  const c = nivel === 'CRITICO' ? BASE.red : '#f59e0b';
  return (
    <div style={{
      background: c + '12', border: `1px solid ${c}55`,
      borderLeft: `4px solid ${c}`, borderRadius: '8px',
      padding: '10px 14px',
      display: 'flex', gap: '10px', alignItems: 'center',
    }}>
      <span style={{
        background: c, color: '#fff',
        padding: '3px 8px', borderRadius: '6px',
        fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
        flexShrink: 0,
      }}>{nivel}</span>
      <span style={{
        fontSize: '10px', fontWeight: '900', color: c, letterSpacing: '0.4px',
        flexShrink: 0,
      }}>{tipo}</span>
      <span style={{ fontSize: '12px', color: BASE.text, flex: 1 }}>{mensaje}</span>
    </div>
  );
}
