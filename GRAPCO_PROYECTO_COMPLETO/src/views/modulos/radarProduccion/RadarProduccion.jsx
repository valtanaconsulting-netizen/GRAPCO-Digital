// src/views/modulos/radarProduccion/RadarProduccion.jsx
// ════════════════════════════════════════════════════════════════
// RADAR DE PRODUCCIÓN · ALERTAS PREDICTIVAS
// ════════════════════════════════════════════════════════════════
// Anticipa riesgos de producción ANTES de que ocurran, proyectando la tendencia
// de la data (CPI, HH, avance). Costo $0: todo se calcula en el cliente con el
// motor de tendencia ponderada que ya existe en la plataforma.

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { BASE } from '../../../utils/styles';
import { COSTO_HORA_DEFAULT } from '../../../utils/helpers';
import Icon from '../../../components/Icon';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { useHistorial, useConfiguracion } from '../../../hooks/useFirebaseData';
import { useCatalogoWBS } from '../../../hooks/useCatalogoWBS';
import { enriquecerHistorial } from '../../../utils/indicadoresEjecutivos';
import { analizarProduccion, COLORES_SEVERIDAD as SEV } from '../../../utils/alertasPredictivas';

const fmtS = (n) => 'S/ ' + Math.round(Number(n) || 0).toLocaleString('es-PE');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hoyLocal = () => {
  const d = new Date(); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export default function RadarProduccion({ isMobile }) {
  const fecha = useMemo(() => hoyLocal(), []);
  const { proyectoActivoId, proyectoActivo, filtrarPorContexto } = useProyectoActivo();
  const { historial } = useHistorial(fecha);
  const configuracion = useConfiguracion();
  const { infoMap } = useCatalogoWBS(proyectoActivoId);

  const costoHH = useMemo(() => {
    const map = { ...COSTO_HORA_DEFAULT };
    Object.entries(configuracion?.tarifas || {}).forEach(([c, v]) => {
      const n = parseFloat(v); if (!isNaN(n) && n > 0) map[c] = n;
    });
    const cargos = ['Capataz', 'Operario', 'Oficial', 'Ayudante'];
    const vals = cargos.map((c) => parseFloat(map[c]) || 0).filter((v) => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 14;
  }, [configuracion]);

  const hist = useMemo(() => {
    const delProyecto = filtrarPorContexto(historial || [], { ignorarFrente: true });
    return enriquecerHistorial(delProyecto, infoMap);
  }, [historial, filtrarPorContexto, infoMap]);

  const { resumen, alertas, serie, proyeccionCpi } = useMemo(
    () => analizarProduccion({ hist, infoMap, costoHH }),
    [hist, infoMap, costoHH],
  );

  // Datos del gráfico: CPI histórico + proyección a 4 semanas + umbral.
  const chart = useMemo(() => {
    const ultSem = serie.length ? serie[serie.length - 1].x : 0;
    const data = serie.map((s) => ({ sem: `S${s.x}`, CPI: +(s.y * 100).toFixed(0), Proyección: null }));
    if (proyeccionCpi && data.length) {
      data[data.length - 1].Proyección = data[data.length - 1].CPI; // conectar
      for (let i = 1; i <= 4; i++) {
        const y = clamp(proyeccionCpi.cpiHoy + proyeccionCpi.pendSemana * i, 0.2, 2);
        data.push({ sem: `S${ultSem + i}`, CPI: null, Proyección: +(y * 100).toFixed(0) });
      }
    }
    return data;
  }, [serie, proyeccionCpi]);

  const cierre = resumen.cierre;
  const sinDatos = !hist.length;

  // Color del hero según proyección de cierre
  const heroSev = !cierre ? 'baja' : cierre.pct > 0.15 ? 'alta' : cierre.pct > 0.05 ? 'media' : cierre.pct < -0.03 ? 'ok' : 'baja';
  const heroBg = {
    alta: 'linear-gradient(135deg,#b91c1c,#7f1d1d)',
    media: 'linear-gradient(135deg,#b45309,#92400e)',
    ok: 'linear-gradient(135deg,#15803d,#166534)',
    baja: `linear-gradient(135deg,${BASE.navy},${BASE.navyDark})`,
  }[heroSev];

  const grid = (min) => `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`;

  if (sinDatos) {
    return (
      <div style={{ background: BASE.white, borderRadius: 14, border: `1px solid ${BASE.border}`, padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 40 }}>📡</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: BASE.muted, marginTop: 8 }}>
          Sin registros de producción para analizar todavía.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* HERO — proyección de cierre */}
      <div style={{ background: heroBg, borderRadius: 16, padding: isMobile ? '16px' : '18px 22px', color: '#fff', boxShadow: BASE.shadowMd }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Icon name="target" size={20} color={BASE.gold} strokeWidth={2.2} />
          <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.6, opacity: 0.9 }}>
            RADAR DE PRODUCCIÓN · ALERTAS PREDICTIVAS · {proyectoActivo?.nombre || 'Proyecto'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: grid(190), gap: 14, alignItems: 'end' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>PROYECCIÓN DE CIERRE (MO)</p>
            <p style={{ fontSize: isMobile ? 26 : 32, fontWeight: 900, lineHeight: 1.05, marginTop: 2 }}>
              {cierre ? `${cierre.sobreFinal >= 0 ? '+' : '−'}${fmtS(Math.abs(cierre.sobreFinal))}` : '—'}
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.92, marginTop: 2 }}>
              {cierre ? `${cierre.sobreFinal >= 0 ? 'Sobrecosto' : 'Ahorro'} estimado · ${cierre.pct >= 0 ? '+' : ''}${(cierre.pct * 100).toFixed(1)}% vs presupuesto` : 'Sin datos suficientes'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>CPI RECIENTE → PROYECTADO</p>
            <p style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, lineHeight: 1.05, marginTop: 2 }}>
              {resumen.cpiReciente ? (resumen.cpiReciente * 100).toFixed(1) : '—'}%
              <span style={{ fontSize: 16, opacity: 0.85 }}> → {resumen.cpiProyectado ? (resumen.cpiProyectado * 100).toFixed(1) : '—'}%</span>
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.92, marginTop: 2 }}>
              {proyeccionCpi ? (proyeccionCpi.pendSemana < -0.002 ? '📉 Tendencia a la baja' : proyeccionCpi.pendSemana > 0.002 ? '📈 Tendencia al alza' : '➡️ Estable') : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, opacity: 0.8, letterSpacing: 0.8 }}>AVANCE / CIERRE PROYECTADO</p>
            <p style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, lineHeight: 1.05, marginTop: 2 }}>
              {cierre ? cierre.avancePct.toFixed(1) : '—'}%
              {resumen.plazo?.semFin != null && <span style={{ fontSize: 16, opacity: 0.85 }}> · ≈ S{resumen.plazo.semFin}</span>}
            </p>
            <div style={{ height: 7, background: 'rgba(255,255,255,0.22)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${cierre?.avancePct || 0}%`, height: '100%', background: '#fff', borderRadius: 999 }} />
            </div>
          </div>
        </div>
      </div>

      {/* RESUMEN de conteo */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Chip color={SEV.alta} label="Riesgos altos" valor={resumen.conteo.alta} />
        <Chip color={SEV.media} label="Atención" valor={resumen.conteo.media} />
        <Chip color={SEV.ok} label="Total alertas" valor={alertas.length} />
      </div>

      {/* LISTA DE ALERTAS PREDICTIVAS */}
      <div style={{ display: 'grid', gridTemplateColumns: grid(330), gap: 12 }}>
        {alertas.length === 0 ? (
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: 28, textAlign: 'center', color: BASE.greenDark, fontWeight: 700, fontSize: 13 }}>
            ✅ Sin riesgos predictivos. La producción está en trayectoria sana.
          </div>
        ) : alertas.map((a, i) => {
          const col = SEV[a.severidad] || BASE.muted;
          return (
            <div key={i} style={{
              background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `5px solid ${col}`,
              borderRadius: 14, padding: '14px 16px', boxShadow: BASE.shadowSm,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{a.icono}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 900, color: BASE.navy }}>{a.titulo}</span>
                {a.valor && (
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', background: col, padding: '3px 10px', borderRadius: 999 }}>{a.valor}</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: BASE.text, lineHeight: 1.5, margin: 0 }}>{a.mensaje}</p>
              {a.accion && (
                <p style={{ fontSize: 11, color: BASE.muted, lineHeight: 1.45, margin: 0, fontStyle: 'italic' }}>
                  💡 {a.accion}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* GRÁFICO — CPI histórico + proyección */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: '16px 18px', boxShadow: BASE.shadowSm }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: BASE.navy, letterSpacing: 0.6, marginBottom: 12 }}>
          📈 TENDENCIA DE CPI Y PROYECCIÓN (próximas 4 semanas)
        </p>
        {chart.length < 2 ? (
          <p style={{ padding: 24, textAlign: 'center', color: BASE.muted, fontSize: 13 }}>
            Se necesitan al menos 2 semanas de registros para proyectar la tendencia.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chart} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BASE.border} />
              <XAxis dataKey="sem" tick={{ fontSize: 11, fill: BASE.muted }} />
              <YAxis tick={{ fontSize: 11, fill: BASE.muted }} domain={[0, 'auto']} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${BASE.border}` }} formatter={(v) => v == null ? '—' : `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={85} stroke={BASE.red} strokeDasharray="5 4" label={{ value: 'Umbral 85%', fontSize: 10, fill: BASE.red, position: 'insideTopRight' }} />
              <ReferenceLine y={100} stroke={BASE.greenDark} strokeDasharray="2 4" />
              <Line type="monotone" dataKey="CPI" stroke={BASE.navy} strokeWidth={2.5} dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="Proyección" stroke={BASE.gold} strokeWidth={2.5} strokeDasharray="6 5" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p style={{ fontSize: 10.5, color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Proyecciones basadas en la tendencia ponderada por recencia de tu propia data (las semanas recientes pesan más). Son estimaciones para anticipar decisiones, no cifras contractuales. Costo MO directa.
      </p>
    </div>
  );
}

function Chip({ color, label, valor }) {
  return (
    <div style={{
      background: color + '14', border: `1px solid ${color}40`, borderRadius: 12,
      padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'monospace' }}>{valor}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: BASE.navy, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
    </div>
  );
}
