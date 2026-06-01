// src/views/CalidadPanel.jsx — Wrapper modulo Calidad (Bloque 20)

import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import RoleGuard from '../components/RoleGuard';
import DashboardCalidad from './calidad/DashboardCalidad';
import ProtocolosView from './calidad/ProtocolosView';
import ProtocoloEditor from './calidad/ProtocoloEditor';
import ProtocoloCALFOR from './calidad/ProtocoloCALFOR';
import ProtocolosPreVaciadoView from './calidad/ProtocolosPreVaciadoView';
import ProtocoloPreVaciadoEditor from './calidad/ProtocoloPreVaciadoEditor';
import ArchivoProtocolosView from './calidad/ArchivoProtocolosView';
import NoConformidadesView from './calidad/NoConformidadesView';
import EnsayosView from './calidad/EnsayosView';
import PETsView from './modulos/petsWBS/PETsView';
import BIM from './BIM';

const TABS = [
  { id: 'dashboard',  l: 'Dashboard',         icono: '📊', desc: 'KPIs ejecutivos',         color: '#ec4899' },
  { id: 'prevaciado', l: 'Pre-Vaciado',       icono: '🧱', desc: 'CAL-FOR-006 · Liberación de concreto', color: '#0F2A47' },
  { id: 'archivo',    l: 'Archivo',           icono: '📁', desc: 'PDFs firmados por Frente y Semana',     color: '#0d9488' },
  { id: 'protocolos', l: 'Protocolos',        icono: '📋', desc: 'Liberación por elemento', color: '#7c3aed' },
  { id: 'calfor',     l: 'CAL-FOR',           icono: '📄', desc: 'Plantilla GRAPCO con firmas', color: '#a855f7' },
  { id: 'pets',       l: 'PETs',              icono: '📜', desc: 'PETs (10 secciones)',     color: '#0ea5e9' },
  { id: 'ncs',        l: 'No Conformidades',  icono: '🚨', desc: 'NCs abiertas y cerradas', color: '#dc2626' },
  { id: 'ensayos',    l: 'Ensayos',           icono: '🧪', desc: 'Resultados laboratorio',  color: '#f59e0b' },
  { id: 'bim',        l: 'Modelo BIM',        icono: '🏗️', desc: 'Vínculos por partida + visor', color: '#6366f1' },
];

// Mapa de keys del sidebar (calidad.dashboard, calidad.protocolos, ...) a tab interno
const KEY_TO_TAB = {
  'calidad.dashboard': 'dashboard',
  'calidad.prevaciado': 'prevaciado',
  'calidad.archivo':    'archivo',
  'calidad.protocolos': 'protocolos',
  'calidad.calfor': 'calfor',
  'calidad.pets': 'pets',
  'calidad.ncs': 'ncs',
  'calidad.ensayos': 'ensayos',
  'calidad.bim': 'bim',
};

export default function CalidadPanel({ showToast, tabExterna, onChangeTab }) {
  const [tabInterno, setTabInterno] = useState('dashboard');
  // Si recibimos tabExterna como key del sidebar (calidad.protocolos), la mapeamos.
  // Si no, usamos el state interno (modo standalone, retrocompatible).
  const tab = tabExterna ? (KEY_TO_TAB[tabExterna] || 'dashboard') : tabInterno;
  const setTab = (t) => {
    if (onChangeTab) onChangeTab(t);
    else setTabInterno(t);
  };
  const [protocoloEdit, setProtocoloEdit] = useState(null); // { id, modo } — para editar uno especifico
  const [pvEdit, setPvEdit] = useState(null); // { id } — null = lista; { id: null } = nuevo; { id: 'xxx' } = editar

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'calidad', 'supervisor_cliente']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* HEADER */}
        <div style={{
          background: `linear-gradient(135deg, #ec4899, #be185d)`,
          borderRadius: '14px',
          padding: '20px 26px',
          color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          boxShadow: '0 4px 20px rgba(236, 72, 153, 0.25)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            🦺 GESTIÓN DE CALIDAD · CONTROL Y LIBERACION
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Protocolos por elemento, PETs, No Conformidades, Ensayos
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            Sistema integral de calidad nivel grandes empresas. Replica formato GRAPCO con flujo digital y firmas.
          </p>
        </div>

        {/* SUB-TABS — solo cuando NO usamos sidebar externa */}
        {!tabExterna && (
        <div style={{
          background: BASE.white,
          border: `1px solid ${BASE.border}`,
          borderRadius: '14px',
          padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setProtocoloEdit(null); setPvEdit(null); }} style={{
                padding: '12px 18px', flex: '1 1 auto', minWidth: '160px',
                background: activo
                  ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)`
                  : 'transparent',
                color: activo ? '#fff' : BASE.muted,
                border: 'none',
                borderRadius: '10px',
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
        )}

        {/* CONTENIDO */}
        <div className="anim-fade-in" key={tab}>
          {tab === 'dashboard'  && <DashboardCalidad showToast={showToast} />}
          {tab === 'prevaciado' && !pvEdit && (
            <ProtocolosPreVaciadoView
              showToast={showToast}
              onNuevo={() => setPvEdit({ id: null })}
              onEdit={(id) => setPvEdit({ id })}
            />
          )}
          {tab === 'prevaciado' && pvEdit && (
            <ProtocoloPreVaciadoEditor
              showToast={showToast}
              protocoloId={pvEdit.id}
              onClose={() => setPvEdit(null)}
            />
          )}
          {tab === 'archivo' && (
            <ArchivoProtocolosView
              onEdit={(id) => { setTab('prevaciado'); setPvEdit({ id }); }}
            />
          )}
          {tab === 'protocolos' && !protocoloEdit && <ProtocolosView showToast={showToast} onEdit={(id) => setProtocoloEdit({ id })} />}
          {tab === 'protocolos' && protocoloEdit && (
            <ProtocoloEditor
              showToast={showToast}
              protocoloId={protocoloEdit.id}
              onClose={() => setProtocoloEdit(null)}
            />
          )}
          {tab === 'calfor'     && <ProtocoloCALFOR showToast={showToast} />}
          {tab === 'pets'       && <PETsView showToast={showToast} />}
          {tab === 'ncs'        && <NoConformidadesView showToast={showToast} />}
          {tab === 'ensayos'    && <EnsayosView showToast={showToast} />}
          {tab === 'bim'        && <BIM showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
