// src/views/modulos/proyectos/ProyectosPanel.jsx — Wrapper Proyectos (B23)

import React, { useState } from 'react';
import { BASE } from '../../../utils/styles';
import RoleGuard from '../../../components/RoleGuard';
import ProyectosListView from './ProyectosListView';
import ProyectoEditor from './ProyectoEditor';
import FrentesView from './FrentesView';
import ComparativoFrentes from './ComparativoFrentes';

const TABS = [
  { id: 'list',        l: 'Cartera',         icono: '🌎', desc: 'Todos los proyectos',     color: '#1e3a5f' },
  { id: 'frentes',     l: 'Frentes',         icono: '📍', desc: 'Del proyecto activo',     color: '#7c3aed' },
  { id: 'comparativo', l: 'Comparativo',     icono: '⚖️', desc: 'Frentes lado-a-lado',     color: '#f59e0b' },
];

export default function ProyectosPanel({ showToast }) {
  const [tab, setTab] = useState('list');
  const [editando, setEditando] = useState(null);

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'capataz', 'oficina_tecnica', 'subcontratista', 'calidad', 'almacenero']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f1a2e, #1e3a5f)',
          borderRadius: '14px', padding: '20px 26px', color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          boxShadow: '0 4px 20px rgba(15,23,42,0.25)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            🌎 GESTIÓN DE PROYECTOS · MULTI-PROYECTO MULTI-FRENTE
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Cartera empresarial de obras
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            Gestiona múltiples proyectos en simultáneo. Cada uno con sus frentes, RO independiente, y comparativo entre frentes.
          </p>
        </div>

        {/* Sub-tabs */}
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setEditando(null); }} style={{
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
                <span style={{ fontSize: '9.5px', fontWeight: '600', opacity: activo ? 0.92 : 0.7 }}>
                  {t.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="anim-fade-in" key={tab + (editando ? '-edit' : '')}>
          {tab === 'list' && !editando && (
            <ProyectosListView showToast={showToast}
              onEdit={(p) => setEditando(p)}
              onNuevo={() => setEditando('NUEVO')} />
          )}
          {tab === 'list' && editando && (
            <ProyectoEditor proyecto={editando} showToast={showToast}
              onClose={() => setEditando(null)} />
          )}
          {tab === 'frentes'     && <FrentesView showToast={showToast} />}
          {tab === 'comparativo' && <ComparativoFrentes showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
