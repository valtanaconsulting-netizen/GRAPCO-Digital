// src/views/seguridad/SeguridadPanel.jsx
// Wrapper para el rol SSOMA / Seguridad.
// 3 áreas: reportar incidencia con foto, hacer inspección diaria con checklist,
// y consultar el historial de sus reportes/inspecciones.

import React, { useState } from 'react';
import { BASE } from '../../utils/styles';
import ReporteIncidencia from '../capataz/ReporteIncidencia';
import InspeccionSeguridad from './InspeccionSeguridad';
import HistorialSeguridad from './HistorialSeguridad';
import DashboardSeguridad from './DashboardSeguridad';
import ATSGaleria from './ATSGaleria';

const TABS = [
  { id: 'dashboard',   l: 'Dashboard',         icono: '📊', desc: 'KPIs SSOMA · tendencias',         color: BASE.navy },
  { id: 'reportar',    l: 'Reportar',          icono: '🚨', desc: 'Incidencia inmediata + fotos',    color: BASE.red },
  { id: 'inspeccion',  l: 'Inspección diaria', icono: '✅', desc: 'Checklist EPP · accesos · andamios', color: '#0ea5e9' },
  { id: 'ats',         l: 'ATS',               icono: '📋', desc: 'Análisis de trabajo seguro diario', color: '#0d9488' },
  { id: 'historial',   l: 'Mi historial',      icono: '🗂️', desc: 'Reportes e inspecciones',         color: '#7c3aed' },
];

export default function SeguridadPanel({ showToast }) {
  const [tab, setTab] = useState('reportar');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.red}, ${BASE.redDark})`,
        borderRadius: '14px',
        padding: '20px 26px',
        color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
        boxShadow: `0 4px 20px ${BASE.red}55`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
          ⚠️ SSOMA · SEGURIDAD · SALUD · MEDIO AMBIENTE
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
          Inspecciones y reporte de incidencias
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.92, marginTop: '4px' }}>
          Reporta cualquier riesgo con foto y geolocalización. Lo que reportes aquí llega de inmediato al residente y a Calidad.
        </p>
      </div>

      {/* SUB-TABS */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '6px',
        display: 'flex', gap: '4px', flexWrap: 'wrap',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        {TABS.map(t => {
          const activo = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '12px 18px', flex: '1 1 auto', minWidth: '160px',
              background: activo ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)` : 'transparent',
              color: activo ? '#fff' : BASE.muted,
              border: 'none', borderRadius: '10px',
              fontSize: '12px', fontWeight: '800', cursor: 'pointer',
              letterSpacing: '0.3px',
              boxShadow: activo ? `0 4px 14px ${t.color}55` : 'none',
              transition: 'all 0.18s ease',
              textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px' }}>{t.icono}</span>
                {t.l}
              </span>
              <span style={{ fontSize: '9.5px', fontWeight: '600', opacity: activo ? 0.92 : 0.7 }}>
                {t.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO */}
      <div className="anim-fade-in" key={tab}>
        {tab === 'dashboard'  && <DashboardSeguridad />}
        {tab === 'reportar'   && <ReporteIncidencia showToast={showToast} tipoDefault="seguridad" />}
        {tab === 'inspeccion' && <InspeccionSeguridad showToast={showToast} />}
        {tab === 'ats'        && <ATSGaleria showToast={showToast} />}
        {tab === 'historial'  && <HistorialSeguridad showToast={showToast} />}
      </div>
    </div>
  );
}
