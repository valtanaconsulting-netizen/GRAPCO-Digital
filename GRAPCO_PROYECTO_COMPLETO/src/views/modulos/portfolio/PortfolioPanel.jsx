// src/views/modulos/portfolio/PortfolioPanel.jsx — Wrapper Portfolio (B24)

import React, { useState } from 'react';
import { BASE } from '../../../utils/styles';
import RoleGuard from '../../../components/RoleGuard';
import PortfolioDashboard from './PortfolioDashboard';
import MapaProyectosPeru from './MapaProyectosPeru';

const TABS = [
  { id: 'dashboard', l: 'Dashboard',  icono: '📊', desc: 'KPIs ejecutivos',     color: '#0f1a2e' },
  { id: 'mapa',      l: 'Mapa Perú',  icono: '🗺️', desc: 'Pins geográficos',    color: '#0d9488' },
];

export default function PortfolioPanel({ showToast }) {
  const [tab, setTab] = useState('dashboard');

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
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
                transition: 'all 0.18s',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>{t.icono}</span>{t.l}
                </span>
                <span style={{ fontSize: '9.5px', fontWeight: '600', opacity: activo ? 0.92 : 0.7 }}>{t.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="anim-fade-in" key={tab}>
          {tab === 'dashboard' && <PortfolioDashboard />}
          {tab === 'mapa'      && <MapaProyectosPeru />}
        </div>
      </div>
    </RoleGuard>
  );
}
