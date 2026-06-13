// src/views/modulos/planMaestro/DashboardPlanMaestro.jsx — KPIs Plan Maestro (B21)
// Rediseño compacto: KPIs densos + Avance/Cronograma + Estado + Pareto de presupuesto.
// Sin banners vacíos ni datos repetidos.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { BASE } from '../../../utils/styles';
import {
  obtenerActividadesHoja, ESTADOS_ACTIVIDAD,
  fmtSoles, fmtNumero, fmtPct,
} from '../../../utils/planMaestroAnalytics';

// Fecha que puede venir como Timestamp de Firestore o como string/Date
const aFecha = (v) => {
  if (!v) return null;
  if (v.toDate) { try { return v.toDate(); } catch { return null; } }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const fmtDia = (d) => d ? d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtSolesCorto = (n) => {
  if (!n || isNaN(n)) return 'S/ 0';
  if (n >= 1e6) return 'S/ ' + (n / 1e6).toFixed(2) + ' M';
  if (n >= 1e3) return 'S/ ' + (n / 1e3).toFixed(0) + ' k';
  return 'S/ ' + Math.round(n);
};

export default function DashboardPlanMaestro() {
  const { proyectoActivoId } = useProyectoActivo();
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proyectoActivoId) { setActividades([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(query(collection(db, 'PlanMaestro'), where('proyectoId', '==', proyectoActivoId)),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true }));
        setActividades(docs); setLoading(false);
      },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, [proyectoActivoId]);

  const stats = useMemo(() => {
    const hojas = obtenerActividadesHoja(actividades);
    const presupuestoTotal = hojas.reduce((s, a) =>
      s + (a.metradoContractual || 0) * (a.precioUnitario || 0), 0);
    const valorEjecutado = hojas.reduce((s, a) =>
      s + (a.avanceMetradoAcum || 0) * (a.precioUnitario || 0), 0);
    const hhPresupuesto = hojas.reduce((s, a) => s + (a.hhTotalPresupuestado || 0), 0);
    const hhReal = hojas.reduce((s, a) => s + (a.hhAcumReal || 0), 0);
    const pctAvance = presupuestoTotal > 0 ? (valorEjecutado / presupuestoTotal) * 100 : 0;

    const porEstado = {};
    Object.keys(ESTADOS_ACTIVIDAD).forEach(k => { porEstado[k] = 0; });
    hojas.forEach(a => {
      const est = a.estado || 'no_iniciada';
      porEstado[est] = (porEstado[est] || 0) + 1;
    });

    // Plazo del proyecto (de las fechas programadas de las hojas)
    let fIni = null, fFin = null;
    hojas.forEach(a => {
      const fi = aFecha(a.fechaInicioProgramada);
      const ff = aFecha(a.fechaFinProgramada);
      if (fi && (!fIni || fi < fIni)) fIni = fi;
      if (ff && (!fFin || ff > fFin)) fFin = ff;
    });
    let plazo = null;
    if (fIni && fFin && fFin > fIni) {
      const hoy = new Date();
      const totalDias = Math.max(1, Math.round((fFin - fIni) / 86400000));
      const transcurridos = Math.round((hoy - fIni) / 86400000);
      plazo = {
        fIni, fFin, totalDias,
        transcurridos: Math.min(totalDias, Math.max(0, transcurridos)),
        pctTiempo: Math.min(100, Math.max(0, (transcurridos / totalDias) * 100)),
      };
    }

    // Concentración del presupuesto por partida nivel-1 (Pareto 80/20)
    //
    // El nombre de la partida raíz NO siempre vive en un documento aparte
    // (con código "01", "02"…). En la práctica, el importador guarda el
    // nombre humano de la partida directamente en cada hoja, en el campo
    // `partida`. Por eso aquí buscamos el nombre con varias estrategias en
    // orden: (1) campo `partida` de las hojas, (2) un doc raíz exacto,
    // (3) el ancestro intermedio de menor nivel. Si todo falla, fallback.
    const porPartida = {};
    hojas.forEach(a => {
      if (!a.codigo) return;
      const raiz = String(a.codigo).split('.')[0];
      if (!porPartida[raiz]) porPartida[raiz] = { codigo: raiz, descripcion: '', monto: 0 };
      porPartida[raiz].monto += (a.metradoContractual || 0) * (a.precioUnitario || 0);
      // (1) Nombre canónico que viene en el propio documento de la hoja
      if (!porPartida[raiz].descripcion) {
        const nombrePartida = a.partida || a.nombrePartida;
        if (nombrePartida) porPartida[raiz].descripcion = String(nombrePartida).trim();
      }
    });
    // (2) Si existe un documento "raíz" exacto (código sin puntos), su
    //     descripción/nombre tiene la palabra final sobre los nombres
    actividades.forEach(a => {
      if (a.codigo && !String(a.codigo).includes('.') && porPartida[a.codigo]) {
        const nombre = a.descripcion || a.nombre || a.partida;
        if (nombre) porPartida[a.codigo].descripcion = String(nombre).trim();
      }
    });
    // (3) Último recurso: tomar el nombre del nodo intermedio de menor nivel
    //     (ej. si solo existen hojas "01.02.03" y "01.02.04", usar la descripción
    //     de "01.02" o de la propia hoja si es lo único disponible).
    Object.keys(porPartida).forEach(raiz => {
      if (porPartida[raiz].descripcion) return;
      let mejor = null;
      actividades.forEach(a => {
        if (!a.codigo) return;
        const cod = String(a.codigo);
        if (!cod.startsWith(raiz + '.') && cod !== raiz) return;
        const desc = a.descripcion || a.nombre;
        if (!desc) return;
        const prof = cod.split('.').length;
        if (!mejor || prof < mejor.prof) mejor = { prof, desc };
      });
      if (mejor) porPartida[raiz].descripcion = String(mejor.desc).trim();
    });
    const partidas = Object.values(porPartida)
      .filter(p => p.monto > 0)
      .sort((a, b) => b.monto - a.monto);

    return {
      totalActividades: actividades.length,
      totalHojas: hojas.length,
      presupuestoTotal, valorEjecutado, hhPresupuesto, hhReal, pctAvance,
      porEstado, plazo, partidas,
    };
  }, [actividades]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando Plan Maestro...</p>;

  if (actividades.length === 0) {
    return (
      <div style={{
        background: BASE.white, border: `2px dashed ${BASE.border}`,
        borderRadius: '14px', padding: '54px 30px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '38px', marginBottom: '12px' }}>📐</p>
        <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy, marginBottom: '6px' }}>
          Sin Plan Maestro cargado
        </p>
        <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          El Plan Maestro es la columna vertebral del proyecto. Ve a "Estructura WBS" o "Importar Excel" para cargar partidas y actividades.
        </p>
      </div>
    );
  }

  const totalEstados = Object.values(stats.porEstado).reduce((s, n) => s + n, 0) || 1;
  const maxPartida = stats.partidas[0]?.monto || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── KPIs principales — fila compacta ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: '10px' }}>
        <KPI icono="📋" color={BASE.navy} label="ACTIVIDADES"
          valor={fmtNumero(stats.totalActividades, 0)}
          sub={`${stats.totalHojas} ejecutables en obra`} />
        <KPI icono="💰" color="#7c3aed" label="PRESUPUESTO META"
          valor={fmtSoles(stats.presupuestoTotal)}
          sub="Costo directo · metrado × P.U." />
        <KPI icono="✅" color={BASE.gold} label="VALOR EJECUTADO"
          valor={fmtSoles(stats.valorEjecutado)}
          sub={`${fmtPct(stats.pctAvance)} de avance valorizado`} />
        <KPI icono="👷" color="#0d9488" label="HORAS-HOMBRE META"
          valor={fmtNumero(stats.hhPresupuesto, 0) + ' HH'}
          sub={`${fmtNumero(stats.hhReal, 0)} HH consumidas`} />
      </div>

      {/* ── Avance + Estado, lado a lado ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '12px' }}>

        {/* Avance físico vs cronograma */}
        <Seccion titulo="AVANCE DEL PROYECTO" icono="📈">
          <Barra
            etiqueta="Avance físico (valorizado)"
            pct={stats.pctAvance}
            detalle={`${fmtSolesCorto(stats.valorEjecutado)} / ${fmtSolesCorto(stats.presupuestoTotal)}`}
            color={BASE.gold}
          />
          {stats.plazo ? (
            <>
              <Barra
                etiqueta="Avance de cronograma (tiempo)"
                pct={stats.plazo.pctTiempo}
                detalle={`Día ${stats.plazo.transcurridos} de ${stats.plazo.totalDias}`}
                color={BASE.navy}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px',
                marginTop: '4px', fontSize: '10.5px', color: BASE.muted,
              }}>
                <span>🟢 Inicio: <b style={{ color: BASE.navy }}>{fmtDia(stats.plazo.fIni)}</b></span>
                <span>🏁 Fin programado: <b style={{ color: BASE.navy }}>{fmtDia(stats.plazo.fFin)}</b></span>
              </div>
              <Diagnostico fisico={stats.pctAvance} tiempo={stats.plazo.pctTiempo} />
            </>
          ) : (
            <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
              ℹ️ Asigna fechas programadas a las actividades para ver el avance de cronograma.
            </p>
          )}
        </Seccion>

        {/* Estado de actividades — barra apilada + leyenda */}
        <Seccion titulo="ESTADO DE LAS ACTIVIDADES" icono="📊"
          extra={`${stats.totalHojas} ejecutables`}>
          <div style={{
            display: 'flex', height: '16px', borderRadius: '8px',
            overflow: 'hidden', background: BASE.bgSoft, marginTop: '2px',
          }}>
            {Object.entries(ESTADOS_ACTIVIDAD).map(([key, est]) => {
              const count = stats.porEstado[key] || 0;
              if (!count) return null;
              return (
                <div key={key} title={`${est.label}: ${count}`}
                  style={{ width: `${(count / totalEstados) * 100}%`, background: est.color }} />
              );
            })}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
            gap: '6px', marginTop: '10px',
          }}>
            {Object.entries(ESTADOS_ACTIVIDAD).map(([key, est]) => {
              const count = stats.porEstado[key] || 0;
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '6px 8px', borderRadius: '7px',
                  background: count ? est.color + '12' : 'transparent',
                  opacity: count ? 1 : 0.5,
                }}>
                  <span style={{
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: est.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: '700', flex: 1 }}>
                    {est.label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: est.color }}>{count}</span>
                </div>
              );
            })}
          </div>
        </Seccion>
      </div>

      {/* ── Concentración del presupuesto — Pareto ── */}
      {stats.partidas.length > 0 && (
        <Seccion titulo="CONCENTRACIÓN DEL PRESUPUESTO" icono="🏗️"
          extra="¿Dónde está el costo? — partidas nivel 1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
            {stats.partidas.slice(0, 7).map((p, i) => {
              const pctTotal = stats.presupuestoTotal > 0 ? (p.monto / stats.presupuestoTotal) * 100 : 0;
              return (
                <div key={p.codigo} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '900', color: BASE.navy,
                    minWidth: '26px', textAlign: 'center',
                    background: BASE.bgSoft, borderRadius: '5px', padding: '3px 0',
                  }}>{p.codigo}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', gap: '8px',
                      fontSize: '10.5px', marginBottom: '3px',
                    }}>
                      <span style={{
                        color: BASE.navy, fontWeight: '700', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{p.descripcion || `Partida ${p.codigo}`}</span>
                      <span style={{ color: BASE.muted, fontWeight: '700', flexShrink: 0 }}>
                        {fmtSolesCorto(p.monto)} · {fmtPct(pctTotal)}
                      </span>
                    </div>
                    <div style={{ height: '8px', background: BASE.bgSoft, borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.max(2, (p.monto / maxPartida) * 100)}%`,
                        background: i === 0
                          ? `linear-gradient(90deg, ${BASE.navy}, ${BASE.gold})`
                          : BASE.navy + 'cc',
                        borderRadius: '5px',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {stats.partidas.length > 7 && (
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '8px', textAlign: 'right' }}>
              + {stats.partidas.length - 7} partidas más
            </p>
          )}
        </Seccion>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────

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
        <p style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {valor}
        </p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>
      </div>
    </div>
  );
}

function Seccion({ titulo, icono, extra, children }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: '8px', marginBottom: '12px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
          {icono} {titulo}
        </p>
        {extra && (
          <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{extra}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Barra({ etiqueta, pct, detalle, color }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: '8px',
        fontSize: '10.5px', marginBottom: '4px',
      }}>
        <span style={{ color: BASE.muted, fontWeight: '700' }}>{etiqueta}</span>
        <span style={{ color: BASE.muted }}>{detalle}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '9px',
      }}>
        <div style={{ flex: 1, height: '14px', background: BASE.bgSoft, borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`,
            background: color, borderRadius: '8px', transition: 'width 0.6s ease',
          }} />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '900', color, minWidth: '46px', textAlign: 'right' }}>
          {fmtPct(pct)}
        </span>
      </div>
    </div>
  );
}

// Compara avance físico vs avance de cronograma → diagnóstico de obra
function Diagnostico({ fisico, tiempo }) {
  const delta = fisico - tiempo;
  let txt, color, bg;
  if (tiempo <= 0.5) { txt = 'El proyecto aún no arranca según cronograma.'; color = BASE.muted; bg = BASE.bgSoft; }
  else if (delta >= -3) { txt = `Obra al día — avance acorde al cronograma (${fmtPct(Math.abs(delta))} de holgura).`; color = '#16a34a'; bg = '#16a34a14'; }
  else if (delta >= -12) { txt = `Atraso leve — la obra va ${fmtPct(Math.abs(delta))} por debajo del cronograma.`; color = '#f59e0b'; bg = '#f59e0b14'; }
  else { txt = `Atraso crítico — la obra va ${fmtPct(Math.abs(delta))} por debajo del cronograma.`; color = '#dc2626'; bg = '#dc262614'; }
  return (
    <div style={{
      marginTop: '8px', padding: '8px 10px', borderRadius: '8px',
      background: bg, fontSize: '10.5px', fontWeight: '700', color,
    }}>
      {txt}
    </div>
  );
}
