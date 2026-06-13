// src/views/modulos/apus/APUsPanel.jsx — Wrapper APUs (B21)

import React, { useState } from 'react';
import { BASE, CHART_PALETTE } from '../../../utils/styles';
import RoleGuard from '../../../components/RoleGuard';
import APUsList from './APUsList';
import APUEditor from './APUEditor';
import ComparativoAPU from './ComparativoAPU';
import CatalogoInsumos from './CatalogoInsumos';

const TABS = [
  { id: 'list',       l: 'Catálogo APUs',       icono: '💰', desc: 'Lista completa',       color: BASE.navy },
  { id: 'comparativo',l: 'Teórico vs Real',     icono: '⚖️', desc: 'Análisis desviación',  color: BASE.gold },
  { id: 'insumos',    l: 'Insumos',             icono: '🧱', desc: 'Maestro de recursos',  color: CHART_PALETTE[2] },
];

export default function APUsPanel({ showToast }) {
  const [tab, setTab] = useState('list');
  const [editando, setEditando] = useState(null);

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          borderRadius: '12px', padding: '12px 18px', color: '#fff',
          borderLeft: `4px solid ${BASE.gold}`,
          boxShadow: BASE.shadowMd,
          display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '900' }}>
            Análisis de Precios Unitarios
          </h2>
          <p style={{ fontSize: '11px', opacity: 0.8 }}>
            Teórico vs real · se recalcula con Kardex y rendimientos de Tareos
          </p>
        </div>

        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '10px', padding: '5px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setEditando(null); }} style={{
                padding: '8px 14px', flex: '1 1 auto', minWidth: '150px',
                background: activo ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)` : 'transparent',
                color: activo ? '#fff' : BASE.muted,
                border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                letterSpacing: '0.3px',
                boxShadow: activo ? `0 3px 10px ${t.color}55` : 'none',
                transition: 'all 0.18s',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '1px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>{t.icono}</span>{t.l}
                </span>
                <span style={{ fontSize: '9px', fontWeight: '600', opacity: activo ? 0.9 : 0.65 }}>{t.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="anim-fade-in" key={tab}>
          {tab === 'list' && !editando && (
            <APUsList showToast={showToast}
              onEdit={(apu) => setEditando(apu)}
              onNuevo={() => setEditando('NUEVO')} />
          )}
          {tab === 'list' && editando && (
            <APUEditor showToast={showToast} apu={editando}
              onClose={() => setEditando(null)} />
          )}
          {tab === 'comparativo' && <ComparativoAPU showToast={showToast} />}
          {tab === 'insumos'     && <CatalogoInsumos showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
