// src/views/planeamiento/FlujoPlaneamiento.jsx
// FLUJO DE PLANEAMIENTO · Last Planner System + VDC — mapa de proceso premium del
// planeamiento de obra (PTARI CREDITEX), derivado del análisis de la carpeta
// "04. Gestión Cronograma". Hub navegable: cada etapa enlaza a su módulo.

import React from 'react';
import { BASE } from '../../utils/styles';

// estado: 'app' = ya en la plataforma · 'doc' = data del Excel disponible · 'pend' = vacío/pendiente
const EST = {
  app:  { bg: '#dcfce7', color: '#15803d', label: 'EN PLATAFORMA' },
  doc:  { bg: '#fef3c7', color: '#a16207', label: 'DATOS DEL EXCEL' },
  pend: { bg: '#eef2f6', color: '#64748b', label: 'PENDIENTE' },
};

const FASES = [
  {
    n: '1', fase: 'LÍNEA BASE', color: '#1e3a5f', icon: '📜',
    desc: 'El compromiso contractual de plazo e hitos — el patrón inmutable.',
    etapas: [
      { cod: 'F02', n: 'Cronograma Contractual', d: 'Baseline Rev.4 (MS Project). Plazo e hitos pactados con el cliente.', estado: 'doc', kpi: 'Rev.4 · 08/07/25' },
    ],
  },
  {
    n: '2', fase: 'PROGRAMACIÓN MAESTRA', color: '#0d9488', icon: '🗓️',
    desc: 'Del contrato al programa ejecutable: secuenciado y sectorizado.',
    etapas: [
      { cod: 'F02', n: 'Cronograma de Obra', d: 'Programa vigente por frente. Gantt NAVE; fin de obra 30/06/2026. (PTAR en MS Project).', estado: 'app', kpi: '53 act · 28 sem', modulo: 'cronogramaobra' },
      { cod: 'F08', n: 'Normal Tecnológica', d: 'Secuencia y precedencias constructivas (qué va antes de qué).', estado: 'app', kpi: '30 act · 7 fases', modulo: 'normaltec' },
      { cod: 'F09', n: 'Sectorización', d: 'Divide el frente en sectores balanceados (anillos/sectores/paños): base del tren de actividades.', estado: 'app', kpi: '18 sectores · 3 anillos', modulo: 'lps' },
    ],
  },
  {
    n: '3', fase: 'PLANIFICACIÓN COLABORATIVA', color: '#7c3aed', icon: '🤝',
    desc: 'Se "jala" desde la entrega: tren de actividades, alternativas e hitos.',
    etapas: [
      { cod: 'F14', n: 'Pull Planning', d: 'Planificación colaborativa de fases. Cerró el plazo en 4.4 meses (calzadura 2AC/2AM + grúa).', estado: 'app', kpi: '74 act · 4.4 meses', modulo: 'pullplanning' },
      { cod: 'F17', n: 'Plan de Vaciado', d: 'Tren de vaciado de concreto por sector (solado → cimentación → muros), con HH/MO meta.', estado: 'app', kpi: '39 act · 1.293 HH', modulo: 'planvaciado' },
    ],
  },
  {
    n: '4', fase: 'LAST PLANNER · CICLO SEMANAL', color: '#0ea5e9', icon: '🔄', ciclo: true,
    desc: 'El corazón del sistema. En la plataforma todo conversa: lo que pintas en el LAP arma el resto.',
    etapas: [
      { cod: 'F03', n: 'Lookahead (LAP)', d: 'Ventana móvil de 6 semanas, editable (pintar/borrar/Ctrl+Z/color).', estado: 'app', kpi: '28 semanas', modulo: 'lps' },
      { cod: 'F04', n: 'Análisis de Restricciones', d: 'Libera restricciones antes de comprometer: "trabajo que SÍ se puede hacer".', estado: 'app', kpi: '101 restric.', modulo: 'lps' },
      { cod: 'F05', n: 'Plan Semanal', d: 'Compromiso semanal: qué cuadrilla, qué sector, qué día (Lun–Dom).', estado: 'app', modulo: 'lps' },
      { cod: 'F06', n: 'Plan Diario', d: 'Bajada al día concreto. Hoy subsumido dentro del Plan Semanal.', estado: 'pend' },
      { cod: 'F07', n: 'PPC', d: '% del Plan Completado + causas de no cumplimiento (CNC). Cierra y retroalimenta el ciclo.', estado: 'app', kpi: '74% global', modulo: 'lps' },
    ],
  },
  {
    n: '5', fase: 'EJECUCIÓN & MANO DE OBRA', color: '#d97706', icon: '👷',
    desc: 'Lo que realmente pasa en campo: horas-hombre y flujo de cuadrillas.',
    etapas: [
      { cod: 'F13', n: 'Tareo / Movimiento Personal', d: 'HH reales por trabajador y actividad, altas/bajas, dotación por cargo (28+ semanas).', estado: 'doc', modulo: 'registro' },
      { cod: '—', n: 'Histograma de Personal', d: 'Curva de personal por tiempo para nivelar recursos. (Dato disperso en el tareo).', estado: 'pend' },
      { cod: '—', n: 'Circuito Fiel', d: 'Continuidad del tren: que ninguna cuadrilla quede parada esperando frente.', estado: 'pend' },
    ],
  },
  {
    n: '6', fase: 'CONTROL & PRODUCTIVIDAD', color: '#e11d48', icon: '📊',
    desc: 'Diagnóstico de desperdicio y desempeño del mando.',
    etapas: [
      { cod: 'CB', n: 'Carta Balance', d: 'Mide TP/TC/TNC por cuadrilla (muestreo instantáneo). Diagnóstico de desperdicio.', estado: 'app', modulo: 'carta' },
      { cod: '—', n: 'Nivel General de Obra', d: 'TP/TC/TNC a nivel global de obra (NGA), complemento de la Carta Balance.', estado: 'pend' },
      { cod: 'F16', n: 'Evaluación de Capataces', d: 'Desempeño del mando: seguridad, calidad, trabajo en equipo y productividad.', estado: 'doc' },
    ],
  },
  {
    n: '7', fase: 'MÉTRICAS VDC', color: '#0f172a', icon: '🎯',
    desc: 'El cuadro de mando: tendencia vs metas. Cierra el aprendizaje del proyecto.',
    etapas: [
      { cod: 'GCA-F13', n: 'Métricas VDC Cronograma', d: 'KPIs PPC, PLC (liberaciones), GPT y restricciones vs metas (≥90%). Familias OP/ICE/PPM/FC.', estado: 'app', kpi: '8/10 metas ✓', modulo: 'vdcmetricas' },
    ],
  },
];

export default function FlujoPlaneamiento({ setModuloIngeniero }) {
  const ir = (m) => { if (m && setModuloIngeniero) setModuloIngeniero(m); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: 1180, margin: '0 auto' }}>

      {/* HEADER PREMIUM */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy} 0%, #13243c 60%, #0b1727 100%)`,
        color: '#fff', borderRadius: '18px', padding: '24px 28px', position: 'relative', overflow: 'hidden',
        borderLeft: `6px solid ${BASE.gold}`, boxShadow: '0 18px 44px -22px rgba(8,26,46,0.85)',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(229,168,47,0.18), transparent 70%)' }} />
        <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '2px' }}>PLANEAMIENTO · LAST PLANNER SYSTEM + VDC</p>
        <h1 style={{ fontSize: '26px', fontWeight: 900, marginTop: '6px', lineHeight: 1.1 }}>Flujo de Planeamiento de Obra</h1>
        <p style={{ fontSize: '12.5px', opacity: 0.85, marginTop: '8px', maxWidth: 720, lineHeight: 1.5 }}>
          El proceso completo de planeamiento del proyecto, de la línea base contractual al control de productividad,
          automatizado y conversando entre sí. Haz tu LAP aquí y todo lo demás se actualiza.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
          {[['PROYECTO', 'PTARI CREDITEX'], ['FRENTES', 'PTAR + NAVE'], ['FIN DE OBRA', '30/06/2026'], ['MÉTODO', 'Lean · VDC · Ballard 2020']].map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '7px 14px' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.8px' }}>{l}</p>
              <p style={{ fontSize: '13px', fontWeight: 900, marginTop: '1px' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LEYENDA */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px', color: BASE.muted, padding: '0 4px' }}>
        <span style={{ fontWeight: 800, color: BASE.navy }}>Estado:</span>
        {Object.values(EST).map(e => (
          <span key={e.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 11, height: 11, borderRadius: '3px', background: e.color }} /> {e.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Clic en una etapa con módulo para abrirla →</span>
      </div>

      {/* FASES */}
      {FASES.map((f, fi) => (
        <React.Fragment key={f.n}>
          <div style={{
            background: BASE.white, borderRadius: '16px', border: `1px solid ${BASE.border}`,
            borderLeft: `6px solid ${f.color}`, overflow: 'hidden',
            boxShadow: f.ciclo ? `0 0 0 2px ${f.color}33, 0 12px 30px -18px ${f.color}88` : '0 1px 4px rgba(15,23,42,0.05)',
          }}>
            {/* cabecera de fase */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: `linear-gradient(90deg, ${f.color}14, transparent)` }}>
              <div style={{
                width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                background: `linear-gradient(135deg, ${f.color}, ${f.color}cc)`, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                boxShadow: `0 6px 16px -6px ${f.color}`,
              }}>{f.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#fff', background: f.color, borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.5px' }}>FASE {f.n}</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.3px' }}>{f.fase}</h3>
                  {f.ciclo && <span style={{ fontSize: '9.5px', fontWeight: 900, color: f.color, background: `${f.color}1a`, borderRadius: '999px', padding: '2px 10px' }}>↻ CICLO SEMANAL</span>}
                </div>
                <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '2px' }}>{f.desc}</p>
              </div>
            </div>
            {/* etapas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '10px', padding: '6px 16px 16px' }}>
              {f.etapas.map((e, ei) => {
                const st = EST[e.estado] || EST.pend;
                const clickable = !!e.modulo;
                return (
                  <div key={ei} onClick={() => ir(e.modulo)} style={{
                    background: BASE.white, border: `1px solid ${BASE.border}`, borderTop: `3px solid ${f.color}`,
                    borderRadius: '12px', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: '6px',
                    cursor: clickable ? 'pointer' : 'default', transition: 'transform .12s, box-shadow .12s',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
                  }}
                    onMouseEnter={ev => { if (clickable) { ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.boxShadow = `0 10px 22px -12px ${f.color}`; } }}
                    onMouseLeave={ev => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.05)'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 900, color: f.color, background: `${f.color}14`, borderRadius: '5px', padding: '2px 7px', letterSpacing: '0.5px' }}>{e.cod}</span>
                      <span style={{ fontSize: '8px', fontWeight: 900, color: st.color, background: st.bg, borderRadius: '999px', padding: '2px 8px', letterSpacing: '0.3px' }}>{st.label}</span>
                    </div>
                    <p style={{ fontSize: '12.5px', fontWeight: 900, color: BASE.navy, lineHeight: 1.15 }}>{e.n}</p>
                    <p style={{ fontSize: '10.5px', color: BASE.muted, lineHeight: 1.4, flex: 1 }}>{e.d}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
                      {e.kpi ? <span style={{ fontSize: '10px', fontWeight: 800, color: BASE.navy }}>📌 {e.kpi}</span> : <span />}
                      {clickable && <span style={{ fontSize: '10px', fontWeight: 900, color: f.color }}>Abrir →</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* conector entre fases */}
          {fi < FASES.length - 1 && (
            <div style={{ textAlign: 'center', margin: '-6px 0', color: BASE.border, lineHeight: 1 }}>
              <span style={{ fontSize: '20px', color: '#cbd5e1' }}>▼</span>
            </div>
          )}
        </React.Fragment>
      ))}

      {/* PIE — el ciclo de mejora */}
      <div style={{ background: BASE.bgSoft, borderRadius: '12px', padding: '14px 18px', fontSize: '11.5px', color: BASE.muted, lineHeight: 1.6, border: `1px solid ${BASE.border}` }}>
        <strong style={{ color: BASE.navy }}>🔁 El ciclo se cierra:</strong> el <strong>PPC</strong> y la <strong>Carta Balance</strong> miden lo ejecutado;
        sus causas de no cumplimiento y desperdicio retroalimentan el <strong>Lookahead</strong> y la <strong>Sectorización</strong> de la siguiente semana,
        y todo sube a las <strong>Métricas VDC</strong>. Hacer el LAP en la plataforma alimenta automáticamente el Plan Semanal, el PPC y el Power BI.
      </div>
    </div>
  );
}
