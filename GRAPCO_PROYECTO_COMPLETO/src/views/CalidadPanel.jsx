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
import PlanosView from './calidad/PlanosView';

const TABS = [
  { id: 'dashboard',  l: 'Dashboard',         icono: '📊', desc: 'KPIs ejecutivos',         color: '#ec4899' },
  { id: 'protocolos', l: 'Protocolos',        icono: '📋', desc: 'Pre-Vaciado y por elemento', color: '#7c3aed' },
  { id: 'archivo',    l: 'Archivo',           icono: '📁', desc: 'PDFs firmados por Frente y Semana',     color: '#0d9488' },
  { id: 'planos',     l: 'Planos',            icono: '📐', desc: 'Por frente · PDF/imágenes',  color: '#0284c7' },
  { id: 'calfor',     l: 'CAL-FOR',           icono: '📄', desc: 'Plantilla GRAPCO con firmas', color: '#a855f7' },
  { id: 'pets',       l: 'PETs',              icono: '📜', desc: 'PETs (10 secciones)',     color: '#0ea5e9' },
  { id: 'ncs',        l: 'No Conformidades',  icono: '🚨', desc: 'NCs abiertas y cerradas', color: '#dc2626' },
  { id: 'ensayos',    l: 'Ensayos',           icono: '🧪', desc: 'Resultados laboratorio',  color: '#f59e0b' },
  { id: 'bim',        l: 'Modelo BIM',        icono: '🏗️', desc: 'Vínculos por partida + visor', color: '#6366f1' },
];

// Mapa de keys del sidebar (calidad.dashboard, calidad.protocolos, ...) a tab interno
const KEY_TO_TAB = {
  'calidad.dashboard': 'dashboard',
  'calidad.prevaciado': 'protocolos',
  'calidad.archivo':    'archivo',
  'calidad.planos':     'planos',
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
  // Tipo activo dentro del tab 'protocolos' (selector). Default: pre-vaciado (CAL-FOR-006).
  const [tipoProtocolo, setTipoProtocolo] = useState('prevaciado');

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
          {tab === 'archivo' && (
            <ArchivoProtocolosView
              onEdit={(id) => { setTab('protocolos'); setTipoProtocolo('prevaciado'); setPvEdit({ id }); }}
            />
          )}

          {/* PROTOCOLOS: hub único con selector de tipo (Pre-Vaciado por defecto) */}
          {tab === 'protocolos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Selector de tipo — solo en modo lista, no dentro de un editor */}
              {!pvEdit && !protocoloEdit && (
                <div style={{
                  background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px',
                  padding: '10px 14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.5px' }}>
                    TIPO DE PROTOCOLO:
                  </span>
                  {[
                    { id: 'prevaciado', l: '🧱 Pre-Vaciado (CAL-FOR-006)' },
                    { id: 'elemento',   l: '📋 Por elemento (concreto, acero…)' },
                  ].map(t => {
                    const activo = tipoProtocolo === t.id;
                    return (
                      <button key={t.id}
                        onClick={() => { setTipoProtocolo(t.id); setPvEdit(null); setProtocoloEdit(null); }}
                        style={{
                          padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                          border: `1.5px solid ${activo ? '#7c3aed' : BASE.border}`,
                          background: activo ? '#7c3aed' : 'transparent',
                          color: activo ? '#fff' : BASE.muted,
                          fontSize: '12px', fontWeight: 800, transition: 'all 0.15s',
                        }}>
                        {t.l}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pre-Vaciado (CAL-FOR-006) */}
              {tipoProtocolo === 'prevaciado' && !pvEdit && (
                <ProtocolosPreVaciadoView
                  showToast={showToast}
                  onNuevo={() => setPvEdit({ id: null })}
                  onEdit={(id) => setPvEdit({ id })}
                />
              )}
              {tipoProtocolo === 'prevaciado' && pvEdit && (
                <ProtocoloPreVaciadoEditor
                  showToast={showToast}
                  protocoloId={pvEdit.id}
                  onClose={() => setPvEdit(null)}
                />
              )}

              {/* Por elemento (genérico) */}
              {tipoProtocolo === 'elemento' && !protocoloEdit && (
                <ProtocolosView showToast={showToast} onEdit={(id) => setProtocoloEdit({ id })} />
              )}
              {tipoProtocolo === 'elemento' && protocoloEdit && (
                <ProtocoloEditor
                  showToast={showToast}
                  protocoloId={protocoloEdit.id}
                  onClose={() => setProtocoloEdit(null)}
                />
              )}
            </div>
          )}
          {tab === 'calfor'     && <ProtocoloCALFOR showToast={showToast} />}
          {tab === 'pets'       && <PETsView showToast={showToast} />}
          {tab === 'ncs'        && <NoConformidadesView showToast={showToast} />}
          {tab === 'ensayos'    && <EnsayosView showToast={showToast} />}
          {tab === 'bim'        && <BIM showToast={showToast} />}
          {tab === 'planos'     && <PlanosView showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
