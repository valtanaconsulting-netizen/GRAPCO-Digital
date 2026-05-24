// src/views/modulos/planMaestro/PlanMaestroPanel.jsx — Wrapper Plan Maestro (B21)

import React, { useState, Suspense, lazy } from 'react';
import { BASE } from '../../../utils/styles';
import RoleGuard from '../../../components/RoleGuard';
import WBSExplorer from './WBSExplorer';
import ActividadEditor from './ActividadEditor';
import DashboardPlanMaestro from './DashboardPlanMaestro';
import GanttPlanMaestro from './GanttPlanMaestro';
import WizardPlanMaestro from './WizardPlanMaestro';
import EditorMasivoActividades from './EditorMasivoActividades';
const ImportadorPlanMaestro = lazy(() => import('./ImportadorPlanMaestro'));
import PullPlanningView from '../pullPlanning/PullPlanningView';

const TABS = [
  { id: 'dashboard', l: 'Dashboard',     icono: '📊', desc: 'KPIs del plan',           color: '#1e3a5f' },
  { id: 'wbs',       l: 'Estructura WBS', icono: '🌳', desc: 'Árbol jerárquico',        color: '#7c3aed' },
  { id: 'masivo',    l: 'Editor Masivo',  icono: '📝', desc: 'CRUD tipo Excel',         color: '#16a34a' },
  { id: 'gantt',     l: 'Gantt',          icono: '📊', desc: 'Línea de tiempo',         color: '#0d9488' },
  { id: 'pull',      l: 'Pull Planning',  icono: '🎯', desc: 'LCI fase 2',              color: '#5b21b6' },
  { id: 'wizard',    l: 'Wizard',         icono: '🚀', desc: 'Plantillas predefinidas', color: '#f59e0b' },
  { id: 'importar',  l: 'Importar Excel', icono: '📥', desc: 'CSV/Excel/S10',           color: '#15803d' },
];

export default function PlanMaestroPanel({ showToast }) {
  const [tab, setTab] = useState('dashboard');
  const [actividadEdit, setActividadEdit] = useState(null);

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* HEADER compacto */}
        <div style={{
          background: BASE.white,
          borderRadius: '10px',
          border: `1px solid ${BASE.border}`,
          borderLeft: `4px solid ${BASE.gold}`,
          padding: '10px 16px',
          display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
            Plan Maestro (WBS) · Last Planner System
          </span>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
            Estructura jerárquica de partidas con metrado, HH, fechas, APU y PET
          </span>
        </div>

        {/* SUB-TABS */}
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setActividadEdit(null); }} style={{
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

        {/* CONTENIDO */}
        <div className="anim-fade-in" key={tab}>
          {tab === 'dashboard' && <DashboardPlanMaestro showToast={showToast} />}
          {tab === 'wbs' && !actividadEdit && (
            <WBSExplorer
              showToast={showToast}
              onEdit={(act) => setActividadEdit(act)}
              onNuevo={() => setActividadEdit('NUEVO')}
            />
          )}
          {tab === 'wbs' && actividadEdit && (
            <ActividadEditor
              showToast={showToast}
              actividad={actividadEdit}
              onClose={() => setActividadEdit(null)}
            />
          )}
          {tab === 'gantt' && <GanttPlanMaestro showToast={showToast} />}
          {tab === 'masivo' && <EditorMasivoActividades showToast={showToast} />}
          {tab === 'pull' && <PullPlanningView showToast={showToast} />}
          {tab === 'wizard' && <WizardPlanMaestro showToast={showToast} onClose={() => setTab('wbs')} />}
          {tab === 'importar' && (
            <Suspense fallback={<div style={{ padding: 30, textAlign: 'center', color: BASE.muted, fontSize: '13px', fontWeight: '700' }}>⏳ Cargando importador…</div>}>
              <ImportadorPlanMaestro showToast={showToast} />
            </Suspense>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
