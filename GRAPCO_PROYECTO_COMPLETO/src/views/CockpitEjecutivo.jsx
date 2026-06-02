// src/views/CockpitEjecutivo.jsx — Cockpit Ejecutivo en SOLES (talla mundial)
//
// Una sola pantalla de decisión para directorio: traduce la productividad (HH/CPI)
// a DINERO. CPI$, sobrecosto/ahorro S/., % avance físico, fecha y costo de cierre
// proyectado, semáforo y Top-5 actividades en rojo. Diseñado para proyectarse o
// verse en celular en 30 segundos. Respeta los filtros activos del dashboard.

import React, { useMemo } from 'react';
import { BASE } from '../utils/styles';
import { getEstado, fmtCPIPct, fmt1, COSTO_HORA_PROMEDIO } from '../utils/helpers';

const fmtS = (n) => 'S/ ' + Math.round(Number(n) || 0).toLocaleString('es-PE');
const num = (v) => parseFloat(v) || 0;

export default function CockpitEjecutivo({ historial = [], wbs = {}, filtrados = [], costosCustomMap = {}, isMobile }) {
  // Costo S/./HH único de la plataforma (fijado por el usuario en S/25.50/h)
  const costoHH = COSTO_HORA_PROMEDIO;

  const k = useMemo(() => {
    // Acumulados ejecutados (respeta filtros)
    let hhReal = 0, hhMeta = 0, metW = 0;
    const porSem = {};
    filtrados.forEach(r => {
      const met = num(r.metrado), hh = num(r.totalHH);
      hhReal += hh;
      if (r._ipMeta && met > 0) {
        hhMeta += met * r._ipMeta;
        porSem[r.semana] = (porSem[r.semana] || 0) + met * r._ipMeta;
      }
      metW += met;
    });

    // Presupuesto total (catálogo WBS): Σ metradoContractual × IP meta
    let hhMetaTotal = 0;
    Object.values(wbs).forEach(p => Object.values(p.subs || {}).forEach(s =>
      Object.values(s.acts || {}).forEach(a => {
        const mp = a._info?.metP || a.metP || 0;
        const ip = a._info?.ipM || 0;
        if (mp > 0 && ip > 0) hhMetaTotal += mp * ip;
      })));

    const cpi = hhReal > 0 ? hhMeta / hhReal : null;
    const hhSobre = hhReal - hhMeta;                 // + = pérdida, − = ahorro
    const costoSobre = hhSobre * costoHH;
    const avancePct = hhMetaTotal > 0 ? Math.min(100, (hhMeta / hhMetaTotal) * 100) : null;

    // Proyección de cierre al ritmo actual
    let cierre = null;
    if (hhMetaTotal > 0 && hhMeta > 0 && cpi) {
      const cpiRef = Math.max(0.25, Math.min(2, cpi));
      const hhMetaRest = Math.max(0, hhMetaTotal - hhMeta);
      const hhRealParaTerminar = hhMetaRest / cpiRef;
      const hhRealTotalProy = hhReal + hhRealParaTerminar;
      const costoFinalProy = hhRealTotalProy * costoHH;
      const costoMetaPresup = hhMetaTotal * costoHH;
      const sobreFinal = costoFinalProy - costoMetaPresup;
      const sems = Object.keys(porSem).map(Number).sort((a, b) => a - b);
      const ult4 = sems.slice(-4);
      const vel = ult4.length ? ult4.reduce((s, x) => s + porSem[x], 0) / ult4.length : 0;
      const semRest = vel > 0 ? Math.ceil(hhMetaRest / vel) : null;
      const semFin = semRest != null && sems.length ? sems[sems.length - 1] + semRest : null;
      cierre = { costoFinalProy, costoMetaPresup, sobreFinal, semRest, semFin, cpiRef };
    }

    // Top-5 actividades en rojo (peor CPI) con sobrecosto en S/.
    const acc = {};
    filtrados.forEach(r => {
      const a = r._actividadCanonica || r.actividad;
      const met = num(r.metrado), hh = num(r.totalHH);
      if (!a || hh <= 0) return;
      if (!acc[a]) acc[a] = { actividad: a, hhR: 0, hhM: 0 };
      acc[a].hhR += hh;
      if (r._ipMeta && met > 0) acc[a].hhM += met * r._ipMeta;
    });
    const top = Object.values(acc)
      .map(x => ({ ...x, cpi: x.hhR > 0 ? x.hhM / x.hhR : 1, perdida: (x.hhR - x.hhM) * costoHH }))
      .filter(x => x.hhM > 0 && x.cpi < 0.85)
      .sort((a, b) => b.perdida - a.perdida)
      .slice(0, 5);

    return { cpi, hhReal, hhMeta, hhSobre, costoSobre, avancePct, cierre, top, hhMetaTotal };
  }, [filtrados, wbs, costoHH]);

  const est = getEstado(k.cpi);
  const enRojo = (k.cpi || 1) < 0.85;
  const heroBg = !k.cpi ? '#475569'
    : k.cpi >= 1 ? 'linear-gradient(135deg,#15803d,#166534)'
    : k.cpi >= 0.85 ? 'linear-gradient(135deg,#b45309,#92400e)'
    : 'linear-gradient(135deg,#b91c1c,#7f1d1d)';

  if (!filtrados.length) {
    return (
      <div style={{ background: BASE.white, borderRadius: '14px', border: `1px solid ${BASE.border}`, padding: '48px', textAlign: 'center' }}>
        <p style={{ fontSize: '40px' }}>🎯</p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.muted, marginTop: '8px' }}>Sin registros para el Cockpit Ejecutivo</p>
      </div>
    );
  }

  const grid = (min) => `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* HERO — estado en una mirada (compacto) */}
      <div style={{ background: heroBg, borderRadius: '14px', padding: isMobile ? '14px 16px' : '16px 20px', color: '#fff', boxShadow: '0 6px 20px rgba(15,23,42,0.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1.6px', opacity: 0.85 }}>🎯 COCKPIT EJECUTIVO · ESTADO DE OBRA</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: grid(190), gap: '14px', alignItems: 'end' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, letterSpacing: '0.8px' }}>EFICIENCIA (CPI)</p>
            <p style={{ fontSize: isMobile ? '28px' : '34px', fontWeight: '900', lineHeight: 1.05, marginTop: '2px' }}>{fmtCPIPct(k.cpi)}</p>
            <p style={{ fontSize: '11px', fontWeight: '700', opacity: 0.92, marginTop: '2px' }}>
              {!k.cpi ? '—' : k.cpi >= 1 ? '✅ Bajo presupuesto' : k.cpi >= 0.85 ? '⚠️ En alerta' : '🔴 Sobrecosto crítico'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, letterSpacing: '0.8px' }}>
              {k.costoSobre >= 0 ? '💸 SOBRECOSTO ACUMULADO' : '💰 AHORRO ACUMULADO'}
            </p>
            <p style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', lineHeight: 1.05, marginTop: '2px' }}>
              {fmtS(Math.abs(k.costoSobre))}
            </p>
            <p style={{ fontSize: '11px', fontWeight: '700', opacity: 0.92, marginTop: '2px' }}>
              {fmt1(Math.abs(k.hhSobre))} HH {k.costoSobre >= 0 ? 'perdidas' : 'ahorradas'} · S/ {costoHH.toFixed(1)}/HH
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, letterSpacing: '0.8px' }}>AVANCE FÍSICO</p>
            <p style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', lineHeight: 1.05, marginTop: '2px' }}>
              {k.avancePct != null ? k.avancePct.toFixed(0) + '%' : '—'}
            </p>
            <div style={{ height: '7px', background: 'rgba(255,255,255,0.22)', borderRadius: '999px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${k.avancePct || 0}%`, height: '100%', background: '#fff', borderRadius: '999px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* PROYECCIÓN DE CIERRE en soles */}
      {k.cierre && (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '18px 22px', borderLeft: `5px solid ${enRojo ? '#b91c1c' : BASE.navy}` }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '1px', marginBottom: '12px' }}>🔮 PROYECCIÓN DE CIERRE (al ritmo actual)</p>
          <div style={{ display: 'grid', gridTemplateColumns: grid(180), gap: '12px' }}>
            <Kpi label="Costo MO proyectado" valor={fmtS(k.cierre.costoFinalProy)} sub={`meta ${fmtS(k.cierre.costoMetaPresup)}`} color={BASE.navy} />
            <Kpi label={k.cierre.sobreFinal >= 0 ? 'Sobrecosto final estimado' : 'Ahorro final estimado'}
              valor={fmtS(Math.abs(k.cierre.sobreFinal))}
              sub={`${((Math.abs(k.cierre.sobreFinal) / (k.cierre.costoMetaPresup || 1)) * 100).toFixed(0)}% vs presupuesto`}
              color={k.cierre.sobreFinal >= 0 ? '#b91c1c' : '#15803d'} />
            <Kpi label="Semanas para terminar" valor={k.cierre.semRest != null ? `${k.cierre.semRest}` : '—'}
              sub={k.cierre.semFin != null ? `fin ≈ S${k.cierre.semFin}` : 'sin ritmo'} color="#7c3aed" />
            <Kpi label="HH presupuestadas" valor={fmt1(k.hhMetaTotal)} sub={`ejecutado ${fmt1(k.hhMeta)} HH`} color="#0d9488" />
          </div>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '10px', fontStyle: 'italic' }}>
            Si el equipo mantiene el CPI actual ({fmtCPIPct(k.cierre.cpiRef)}), la obra cerrará con ese costo de mano de obra. Cifras de MO directa; no incluye materiales/equipos.
          </p>
        </div>
      )}

      {/* TOP-5 ACTIVIDADES EN ROJO */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BASE.border}`, background: BASE.bgSoft }}>
          <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.6px' }}>🔴 DÓNDE SE PIERDE EL DINERO · Top 5 actividades</p>
        </div>
        {k.top.length === 0 ? (
          <p style={{ padding: '28px', textAlign: 'center', color: '#15803d', fontWeight: '700', fontSize: '13px' }}>
            ✅ Ninguna actividad en rojo. Productividad bajo control.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {k.top.map((a, i) => {
              const c = getEstado(a.cpi);
              return (
                <div key={a.actividad} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < k.top.length - 1 ? `1px solid ${BASE.border}` : 'none', background: i % 2 ? BASE.bgSoft : BASE.white }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: BASE.muted, minWidth: '24px' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12.5px', fontWeight: '800', color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.actividad}>{a.actividad}</p>
                    <p style={{ fontSize: '10.5px', color: BASE.muted }}>{fmt1(a.hhR)} HH reales vs {fmt1(a.hhM)} meta</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: c.color, background: c.bg + '22', padding: '4px 10px', borderRadius: '999px', minWidth: '56px', textAlign: 'center' }}>{fmtCPIPct(a.cpi)}</span>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: '#b91c1c', minWidth: isMobile ? '90px' : '110px', textAlign: 'right' }}>−{fmtS(a.perdida)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Costo S/./HH = promedio de cargos (Capataz/Operario/Oficial/Ayudante), editable en Personal/Configuración. Respeta los filtros activos (partida, semana, frente, fechas).
      </p>
    </div>
  );
}

function Kpi({ label, valor, sub, color }) {
  return (
    <div style={{ background: color + '0F', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: '10px', padding: '12px 14px' }}>
      <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '20px', fontWeight: '900', color, marginTop: '3px', fontFamily: 'monospace' }}>{valor}</p>
      {sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{sub}</p>}
    </div>
  );
}
