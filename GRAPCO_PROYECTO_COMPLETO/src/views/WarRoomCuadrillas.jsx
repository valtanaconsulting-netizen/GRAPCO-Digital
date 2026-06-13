// src/views/WarRoomCuadrillas.jsx — Vista ejecutiva de comando (Bloque 17)
//
// Dashboard ejecutivo para el ingeniero residente. Muestra:
//   - KPIs agregados de TODAS las cuadrillas (LUF promedio, cuántas activas)
//   - Lista de cuadrillas con status visual (🟢🟡🟠🔴)
//   - Alertas inteligentes (cuadrilla con LUF crítico, persona drag, Pareto crítico)
//   - Drill-down: click en cuadrilla → histórico + acciones recomendadas

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import EmptyState from '../components/EmptyState';
import {
  rankingHistorico, calcularKPIs, paretoTNC, causasCriticasTNC,
  clasificarLUF, agruparPorPersona, generarRecomendaciones,
} from '../utils/cartaBalanceAnalytics';

const VENTANAS = [
  { id: '7d',  label: 'Últimos 7 días',  dias: 7   },
  { id: '14d', label: 'Últimos 14 días', dias: 14  },
  { id: '30d', label: 'Últimos 30 días', dias: 30  },
  { id: 'all', label: 'Todo el histórico', dias: 9999 },
];

export default function WarRoomCuadrillas({ historial = [] }) {
  const { proyectoActivoId } = useProyectoActivo();
  const [cartas, setCartas] = useState([]);
  const [cuadrillasDB, setCuadrillasDB] = useState({});
  const [loading, setLoading] = useState(true);
  const [ventana, setVentana] = useState('14d');
  const [cuadrillaDrilled, setCuadrillaDrilled] = useState(null);

  useEffect(() => {
    // Aislamiento por proyecto: filtra en cliente por proyectoId (sin índice
    // compuesto). Cada obra ve solo SUS cartas y cuadrillas.
    const unsub1 = onSnapshot(
      query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc')),
      (snap) => {
        setCartas(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.proyectoId === proyectoActivoId));
        setLoading(false);
      },
      (err) => { console.error('[WarRoom][cartas]', err); setLoading(false); }
    );
    const unsub2 = onSnapshot(
      collection(db, 'Cuadrillas'),
      (snap) => {
        const byName = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.nombre && data.proyectoId === proyectoActivoId) byName[data.nombre] = { id: d.id, ...data };
        });
        setCuadrillasDB(byName);
      }
    );
    return () => { unsub1(); unsub2(); };
  }, [proyectoActivoId]);

  // Filtrar por ventana
  const cartasEnVentana = useMemo(() => {
    const v = VENTANAS.find(x => x.id === ventana);
    if (!v) return cartas;
    if (v.id === 'all') return cartas;
    const limite = new Date();
    limite.setDate(limite.getDate() - v.dias);
    const limiteStr = limite.toISOString().split('T')[0];
    return cartas.filter(c => (c.fecha || '0000-00-00') >= limiteStr);
  }, [cartas, ventana]);

  // Agrupar Cartas Balance por cuadrilla (intentar inferir desde el nombre o trabajadores)
  const grupos = useMemo(() => {
    const buckets = new Map();
    for (const cb of cartasEnVentana) {
      // Identificar cuadrilla: si tiene cuadrillaOrigen, usar esa. Sino, agrupar por trabajadores
      const key = cb.cuadrillaOrigen ||
                  (cb.trabajadores?.map(t => t.nombre).filter(Boolean).join('+') || 'sin_identificar');
      const slot = buckets.get(key) || { nombre: key, cartas: [] };
      slot.cartas.push(cb);
      buckets.set(key, slot);
    }
    return Array.from(buckets.values()).map(g => {
      // Calcular KPIs agregados de la cuadrilla en esta ventana
      const todasObs = g.cartas.flatMap(c => c.observaciones || []);
      const kpis = calcularKPIs(todasObs);
      const pareto = paretoTNC(todasObs);
      const criticas = causasCriticasTNC(pareto);
      return {
        ...g,
        kpis,
        pareto,
        criticas,
        ultimaFecha: g.cartas.map(c => c.fecha).sort().reverse()[0],
        clasificacion: clasificarLUF(kpis.luf),
      };
    }).sort((a, b) => a.kpis.luf - b.kpis.luf);  // Peor primero (urgente arriba)
  }, [cartasEnVentana]);

  // KPIs globales
  const kpisGlobal = useMemo(() => {
    const todasObs = cartasEnVentana.flatMap(c => c.observaciones || []);
    return calcularKPIs(todasObs);
  }, [cartasEnVentana]);

  // Alertas
  const alertas = useMemo(() => {
    const lista = [];
    for (const g of grupos) {
      if (g.kpis.n < 10) continue;
      if (g.kpis.luf < 40) {
        lista.push({
          severidad: 'critica', emoji: '🔴',
          titulo: `Cuadrilla "${g.nombre}" en CRÍTICO`,
          mensaje: `LUF ${g.kpis.luf}% (${g.cartas.length} cartas analizadas).`,
          accion: g.criticas[0]
            ? `Causa principal: ${g.criticas[0].label} (${g.criticas[0].porcentaje}%).`
            : 'Revisar composición y planificación.',
        });
      } else if (g.kpis.luf < 50) {
        lista.push({
          severidad: 'alta', emoji: '🟠',
          titulo: `Cuadrilla "${g.nombre}" con bajo rendimiento`,
          mensaje: `LUF ${g.kpis.luf}%. Por debajo del rango aceptable.`,
          accion: g.criticas[0]
            ? `Atender: ${g.criticas[0].label}.`
            : 'Análisis individual por persona.',
        });
      }
      if (g.kpis.tnc > 35) {
        lista.push({
          severidad: 'media', emoji: '⚠️',
          titulo: `TNC alto en "${g.nombre}"`,
          mensaje: `TNC ${g.kpis.tnc}% supera el umbral de 35%.`,
          accion: 'Revisar Pareto de causas en detalle.',
        });
      }
    }
    return lista;
  }, [grupos]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted }}>⏳ Cargando War Room...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* HEADER compacto */}
      <div style={{
        background: BASE.white,
        borderRadius: '10px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
            Sala de Operaciones · Comando
          </span>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
            Estado en tiempo real por cuadrilla
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {VENTANAS.map(v => (
            <button key={v.id} onClick={() => setVentana(v.id)} style={{
              padding: '6px 12px', borderRadius: '7px',
              fontSize: '10.5px', fontWeight: '800', cursor: 'pointer',
              background: ventana === v.id ? BASE.gold : '#f1f5f9',
              color: ventana === v.id ? BASE.navyDark : BASE.muted,
              border: `1px solid ${ventana === v.id ? BASE.gold : BASE.border}`,
              letterSpacing: '0.3px',
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* RESTRICCIONES / CAUSAS — desde Registros_Campo del proyecto */}
      <PanelRestricciones historial={historial} />

      {/* KPIS GLOBALES */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        <KPIGrande
          label="Cuadrillas analizadas"
          valor={grupos.length}
          color={BASE.navy}
          desc={`${cartasEnVentana.length} cartas balance`}
        />
        <KPIGrande
          label="LUF agregado"
          valor={`${kpisGlobal.luf}%`}
          color={clasificarLUF(kpisGlobal.luf).color}
          desc={clasificarLUF(kpisGlobal.luf).label}
        />
        <KPIGrande
          label="TP global"
          valor={`${kpisGlobal.tp}%`}
          color={BASE.green}
          desc="Trabajo productivo"
        />
        <KPIGrande
          label="TNC global"
          valor={`${kpisGlobal.tnc}%`}
          color={kpisGlobal.tnc > 35 ? BASE.red : BASE.gold}
          desc={kpisGlobal.tnc > 35 ? '⚠️ Alto' : 'Aceptable'}
        />
        <KPIGrande
          label="Alertas activas"
          valor={alertas.length}
          color={alertas.length > 0 ? BASE.red : BASE.green}
          desc={alertas.length > 0 ? 'Requieren acción' : 'Todo OK'}
        />
      </div>

      {/* ALERTAS */}
      {alertas.length > 0 && (
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '12px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            color: '#fff',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.4px' }}>
              🚨 ALERTAS ACTIVAS · {alertas.length}
            </h3>
            <p style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
              Detectadas automáticamente analizando los KPIs de cada cuadrilla en la ventana seleccionada.
            </p>
          </div>
          <div>
            {alertas.map((a, i) => (
              <div key={i} style={{
                padding: '12px 20px',
                borderBottom: i < alertas.length - 1 ? `1px solid ${BASE.border}` : 'none',
                display: 'flex', gap: '14px', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '24px' }}>{a.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '2px' }}>
                    {a.titulo}
                  </p>
                  <p style={{ fontSize: '12px', color: BASE.text, marginBottom: '4px' }}>
                    {a.mensaje}
                  </p>
                  <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>
                    📌 {a.accion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRID DE CUADRILLAS */}
      {grupos.length === 0 ? (
        <EmptyState
          icono="🎯"
          titulo="Sin Cartas Balance en esta ventana"
          descripcion="No hay datos de cuadrillas para mostrar. Cambia la ventana de tiempo o pide a los capataces que registren mediciones."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '12px',
        }}>
          {grupos.map(g => (
            <CuadrillaCard
              key={g.nombre}
              grupo={g}
              cuadrillaInfo={cuadrillasDB[g.nombre]}
              onClick={() => setCuadrillaDrilled(g)}
            />
          ))}
        </div>
      )}

      {/* MODAL DRILL-DOWN */}
      {cuadrillaDrilled && (
        <ModalDrillDown
          grupo={cuadrillaDrilled}
          onClose={() => setCuadrillaDrilled(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CUADRILLA CARD
// ════════════════════════════════════════════════════════════════
function CuadrillaCard({ grupo, cuadrillaInfo, onClick }) {
  const cls = grupo.clasificacion;
  return (
    <div onClick={onClick} style={{
      background: BASE.white,
      border: `2px solid ${cls.color}`,
      borderRadius: '14px',
      padding: '18px 20px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      borderTop: `5px solid ${cls.color}`,
    }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
       onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy }}>
            {cls.emoji} {grupo.nombre}
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {grupo.cartas.length} carta{grupo.cartas.length > 1 ? 's' : ''} · última: {grupo.ultimaFecha}
          </p>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '6px 14px',
          background: cls.color + '22',
          borderRadius: '10px',
        }}>
          <p style={{ fontSize: '20px', fontWeight: '900', color: cls.color, lineHeight: 1 }}>
            {grupo.kpis.luf}%
          </p>
          <p style={{ fontSize: '8px', fontWeight: '900', color: cls.color, letterSpacing: '0.5px', marginTop: '2px' }}>
            LUF
          </p>
        </div>
      </div>

      {/* Mini barra TP/TC/TNC */}
      <div style={{
        display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden',
        background: BASE.bgSoft, marginBottom: '10px',
      }}>
        {grupo.kpis.tp > 0 && <div style={{ width: `${grupo.kpis.tp}%`, background: BASE.green }} />}
        {grupo.kpis.tc > 0 && <div style={{ width: `${grupo.kpis.tc}%`, background: BASE.gold }} />}
        {grupo.kpis.tnc > 0 && <div style={{ width: `${grupo.kpis.tnc}%`, background: BASE.red }} />}
      </div>

      {/* Mini KPIs */}
      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontWeight: '700', marginBottom: '10px' }}>
        <span style={{ color: BASE.green }}>TP {grupo.kpis.tp}%</span>
        <span style={{ color: BASE.goldDark }}>TC {grupo.kpis.tc}%</span>
        <span style={{ color: BASE.red }}>TNC {grupo.kpis.tnc}%</span>
        <span style={{ color: BASE.muted, marginLeft: 'auto' }}>{grupo.kpis.n} obs</span>
      </div>

      {/* Causa #1 si hay TNC */}
      {grupo.criticas.length > 0 && (
        <div style={{
          background: BASE.bgSoft, padding: '8px 12px',
          borderRadius: '8px', borderLeft: `3px solid ${grupo.criticas[0].critico ? BASE.red : BASE.gold}`,
          fontSize: '11px',
        }}>
          <strong style={{ color: BASE.navy }}>Causa #1 TNC:</strong>{' '}
          {grupo.criticas[0].icono} {grupo.criticas[0].label}
          <span style={{ color: BASE.muted, marginLeft: '6px' }}>
            ({grupo.criticas[0].porcentaje}%)
          </span>
        </div>
      )}

      {/* Footer cta */}
      <div style={{
        marginTop: '10px', textAlign: 'right',
        fontSize: '10px', color: BASE.gold, fontWeight: '900',
        letterSpacing: '0.5px',
      }}>
        VER DETALLE →
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MODAL DRILL-DOWN
// ════════════════════════════════════════════════════════════════
function ModalDrillDown({ grupo, onClose }) {
  const todasObs = grupo.cartas.flatMap(c => c.observaciones || []);
  const cbAgregada = {
    personas: Array.from(new Map(grupo.cartas.flatMap(c => c.personas || []).map(p => [p.id, p])).values()),
    observaciones: todasObs,
  };
  const personasRanking = agruparPorPersona(cbAgregada);
  const recomendaciones = grupo.cartas.length > 0
    ? generarRecomendaciones({ ...grupo.cartas[0], observaciones: todasObs })
    : [];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.85)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: BASE.white,
        borderRadius: '14px',
        maxWidth: '900px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: `linear-gradient(135deg, ${grupo.clasificacion.color}, ${grupo.clasificacion.color}dd)`,
          color: '#fff',
          borderRadius: '14px 14px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '900', opacity: 0.9, letterSpacing: '1.6px' }}>
              CUADRILLA · DETALLE
            </p>
            <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
              {grupo.clasificacion.emoji} {grupo.nombre}
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
              {grupo.cartas.length} cartas · LUF {grupo.kpis.luf}% · {grupo.kpis.n} observaciones
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            border: 'none', width: '36px', height: '36px',
            borderRadius: '50%', cursor: 'pointer',
            fontSize: '20px', fontWeight: '900',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Personas */}
          {personasRanking.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '8px' }}>
                👥 PERSONAS DE LA CUADRILLA (ordenadas por LUF individual)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: BASE.bgSoft }}>
                    <th style={th()}>Persona</th>
                    <th style={th()}>LUF</th>
                    <th style={th()}>TP</th>
                    <th style={th()}>TC</th>
                    <th style={th()}>TNC</th>
                    <th style={th()}>Observ.</th>
                  </tr>
                </thead>
                <tbody>
                  {personasRanking.map(p => {
                    const cls = clasificarLUF(p.kpis.luf);
                    return (
                      <tr key={p.personaId} style={{ borderBottom: `1px solid ${BASE.border}` }}>
                        <td style={{ ...td(), fontWeight: '800', color: BASE.navy }}>
                          {cls.emoji} {p.nombre}
                        </td>
                        <td style={{ ...td(), color: cls.color, fontWeight: '900' }}>{p.kpis.luf}%</td>
                        <td style={td()}>{p.kpis.tp}%</td>
                        <td style={td()}>{p.kpis.tc}%</td>
                        <td style={{ ...td(), color: p.kpis.tnc > 30 ? BASE.red : BASE.text }}>
                          {p.kpis.tnc}%
                        </td>
                        <td style={td()}>{p.kpis.n}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pareto resumido */}
          {grupo.criticas.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '8px' }}>
                📊 CAUSAS CRÍTICAS DE TNC (acumulan ≥70%)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {grupo.criticas.map(c => (
                  <div key={c.subcategoria} style={{
                    padding: '8px 12px',
                    background: c.critico ? '#fef2f2' : BASE.bgSoft,
                    borderRadius: '8px',
                    borderLeft: `3px solid ${c.critico ? BASE.red : BASE.gold}`,
                    display: 'flex', justifyContent: 'space-between', fontSize: '12px',
                  }}>
                    <span><strong>{c.icono} {c.label}</strong>{c.critico && (
                      <span style={{
                        marginLeft: '6px', fontSize: '8px',
                        background: BASE.red, color: '#fff',
                        padding: '1px 6px', borderRadius: '8px',
                        fontWeight: '900',
                      }}>CRÍTICA</span>
                    )}</span>
                    <span style={{ fontWeight: '900', color: c.critico ? BASE.red : BASE.navy }}>
                      {c.porcentaje}% (acum {c.acumulado}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {recomendaciones.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginBottom: '8px' }}>
                💡 ACCIONES RECOMENDADAS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recomendaciones.map((r, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    background: r.severidad === 'positiva' ? BASE.greenLight :
                                r.severidad === 'alta' ? '#fef2f2' : '#fef3c7',
                    borderRadius: '8px', fontSize: '12px',
                  }}>
                    <p style={{ fontWeight: '900', color: BASE.navy, marginBottom: '2px' }}>
                      {r.titulo}
                    </p>
                    <p style={{ color: BASE.text, marginBottom: '4px' }}>{r.mensaje}</p>
                    <p style={{ color: BASE.muted, fontSize: '11px' }}>📌 {r.accion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════
function KPIGrande({ label, valor, color, desc }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 18px',
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '1.2px' }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: '24px', fontWeight: '900', color, marginTop: '2px', lineHeight: 1.1 }}>
        {valor}
      </p>
      <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
        {desc}
      </p>
    </div>
  );
}

const th = () => ({ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px', color: BASE.navy });
const td = () => ({ padding: '8px 10px', fontSize: '12px', color: BASE.text });

// ── Panel de Restricciones / Causas (observaciones del capataz) ──
function PanelRestricciones({ historial = [] }) {
  const data = useMemo(() => {
    const conObs = (historial || []).filter(r => {
      const t = (r?.observacion || r?.observaciones || r?.causas || '').trim();
      return t.length > 0;
    });
    if (!conObs.length) return null;

    // Agrupar por partida canónica
    const porPartida = {};
    conObs.forEach(r => {
      const part = (r._partidaCanonica || r.partida || 'SIN PARTIDA').toUpperCase();
      const act = r._actividadCanonica || r.actividad || '—';
      const obs = (r.observacion || r.observaciones || r.causas || '').trim();
      if (!porPartida[part]) porPartida[part] = { partida: part, items: [], obsSet: new Set(), conFoto: 0 };
      porPartida[part].items.push({ fecha: r.fecha, actividad: act, obs, capataz: r.capataz || '', conFoto: !!(r.fotos && r.fotos.length) });
      porPartida[part].obsSet.add(obs.toLowerCase().slice(0, 80));
      if (r.fotos?.length) porPartida[part].conFoto++;
    });
    const partidas = Object.values(porPartida)
      .map(p => ({ ...p, total: p.items.length, distintas: p.obsSet.size }))
      .sort((a, b) => b.total - a.total);

    // Top textos (frecuencia simple)
    const freq = {};
    conObs.forEach(r => {
      const obs = (r.observacion || r.observaciones || r.causas || '').trim();
      const k = obs.toLowerCase().slice(0, 60);
      if (!k) return;
      if (!freq[k]) freq[k] = { texto: obs.slice(0, 80), count: 0 };
      freq[k].count++;
    });
    const topCausas = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total: conObs.length,
      nPartidas: partidas.length,
      conFoto: conObs.filter(r => r.fotos?.length).length,
      partidas,
      topCausas,
    };
  }, [historial]);

  const [partidaAbierta, setPartidaAbierta] = useState(null);

  if (!data) {
    return (
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '16px 18px' }}>
        <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.5px' }}>⚠️ RESTRICCIONES / CAUSAS REGISTRADAS</p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>Aún no hay observaciones registradas por los capataces en el Registro de Producción.</p>
      </div>
    );
  }

  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BASE.border}`, background: '#fffbeb', borderLeft: `4px solid #f59e0b` }}>
        <p style={{ fontSize: '12px', fontWeight: 900, color: '#b45309', letterSpacing: '0.5px' }}>
          ⚠️ RESTRICCIONES / CAUSAS REGISTRADAS · BALANCE
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px' }}>
          Observaciones que los capataces dejaron al cargar producción. Click en una partida para ver el detalle.
        </p>
      </div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px', padding: '14px 18px', borderBottom: `1px solid ${BASE.border}` }}>
        <KpiMini label="Registros con observación" valor={data.total} color="#b45309" />
        <KpiMini label="Partidas afectadas" valor={data.nPartidas} color={BASE.navy} />
        <KpiMini label="Con evidencia fotográfica" valor={`${data.conFoto} / ${data.total}`} color="#16a34a" />
        <KpiMini label="% partidas con restricción" valor={`${data.nPartidas > 0 ? '—' : '0'}`} color="#7c3aed" hidden />
      </div>

      {/* Top causas frecuentes */}
      {data.topCausas.length > 0 && (
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${BASE.border}`, background: '#fafbfc' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.7px', marginBottom: '8px' }}>
            🏆 TOP 5 CAUSAS MÁS FRECUENTES
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {data.topCausas.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: BASE.white, borderRadius: '8px', border: `1px solid ${BASE.border}` }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: BASE.muted, minWidth: '22px' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: '12px', color: BASE.text, lineHeight: 1.4 }}>{c.texto}</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#b91c1c', background: '#fee2e2', padding: '3px 9px', borderRadius: '999px' }}>×{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partidas con observaciones */}
      <div style={{ padding: '12px 18px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.7px', marginBottom: '8px' }}>
          📋 PARTIDAS CON RESTRICCIONES
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.partidas.map(p => {
            const abierta = partidaAbierta === p.partida;
            return (
              <div key={p.partida} style={{ background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                <button onClick={() => setPartidaAbierta(abierta ? null : p.partida)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: BASE.navy, flex: 1 }}>{p.partida}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '3px 9px', borderRadius: '999px' }}>{p.total} registros</span>
                  {p.conFoto > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 9px', borderRadius: '999px' }}>📷 {p.conFoto}</span>
                  )}
                  <span style={{ fontSize: '12px', color: BASE.muted }}>{abierta ? '▾' : '▸'}</span>
                </button>
                {abierta && (
                  <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {p.items.map((it, i) => (
                      <div key={i} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '8px', padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: BASE.navy, fontFamily: 'monospace' }}>{it.fecha}</span>
                          <span style={{ fontSize: '10.5px', color: BASE.muted }}>· {it.actividad}</span>
                          {it.capataz && <span style={{ fontSize: '10.5px', color: BASE.muted }}>· {it.capataz}</span>}
                          {it.conFoto && <span style={{ fontSize: '10px', color: '#15803d' }}>· 📷</span>}
                        </div>
                        <p style={{ fontSize: '12px', color: BASE.text, lineHeight: 1.45 }}>{it.obs}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiMini({ label, valor, color, hidden }) {
  if (hidden) return null;
  return (
    <div style={{ background: color + '10', border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, borderRadius: '10px', padding: '10px 12px' }}>
      <p style={{ fontSize: '9.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '20px', fontWeight: 900, color, marginTop: '2px' }}>{valor}</p>
    </div>
  );
}
