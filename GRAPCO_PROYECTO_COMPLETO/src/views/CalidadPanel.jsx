// src/views/CalidadPanel.jsx — Wrapper modulo Calidad (Bloque 20)

import React, { useState, lazy, Suspense } from 'react';
import { BASE } from '../utils/styles';
import VistaHeader from '../components/VistaHeader';
import Icon from '../components/Icon';
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
// BIM (visor 3D + vendor-charts) cargado SOLO al abrir la pestaña, no dentro del chunk del panel.
const BIM = lazy(() => import('./BIM'));
import PlanosView from './calidad/PlanosView';

const TABS = [
  { id: 'dashboard',  l: 'Dashboard',         ic: 'dashboard', desc: 'KPIs ejecutivos' },
  { id: 'protocolos', l: 'Protocolos',        ic: 'fileText',  desc: 'Pre-Vaciado y por elemento' },
  { id: 'archivo',    l: 'Archivo',           ic: 'package',   desc: 'PDFs firmados por Frente y Semana' },
  { id: 'planos',     l: 'Planos',            ic: 'ruler',     desc: 'Por frente · PDF/imágenes' },
  { id: 'calfor',     l: 'CAL-FOR',           ic: 'registro',  desc: 'Plantilla GRAPCO con firmas' },
  { id: 'pets',       l: 'PETs',              ic: 'fileText',  desc: 'PETs (10 secciones)' },
  { id: 'ncs',        l: 'No Conformidades',  ic: 'alert',     desc: 'NCs abiertas y cerradas' },
  { id: 'ensayos',    l: 'Ensayos',           ic: 'target',    desc: 'Resultados laboratorio' },
  { id: 'bim',        l: 'Modelo BIM',        ic: 'layers',    desc: 'Vínculos por partida + visor' },
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
        <VistaHeader
          icono="shield"
          eyebrow="Gestión de Calidad · Control y Liberación"
          titulo="Protocolos, PETs, No Conformidades y Ensayos"
          subtitulo="Sistema integral de calidad con flujo digital y firmas, alineado al formato GRAPCO."
        />

        {/* SUB-TABS — solo cuando NO usamos sidebar externa */}
        {!tabExterna && (
        <div style={{
          background: BASE.white,
          border: `1px solid ${BASE.border}`,
          borderRadius: '14px',
          padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
          boxShadow: BASE.shadowMd,
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setProtocoloEdit(null); setPvEdit(null); }} style={{
                padding: '9px 14px', flex: '1 1 auto', minWidth: '150px',
                background: activo ? BASE.navy : BASE.bgSoft,
                color: activo ? '#fff' : BASE.muted,
                border: `1px solid ${activo ? BASE.navy : BASE.border}`,
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: activo ? BASE.shadowSm : 'none',
                transition: 'all 0.18s ease',
                textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '9px',
              }}>
                <Icon name={t.ic} size={16} color={activo ? BASE.gold : BASE.mutedSoft} strokeWidth={2} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px',
                    textTransform: 'uppercase', color: activo ? '#fff' : BASE.navy,
                  }}>
                    {t.l}
                  </span>
                  <span style={{
                    fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.2px',
                    color: activo ? BASE.gold : BASE.muted, opacity: activo ? 0.9 : 0.85,
                  }}>
                    {t.desc}
                  </span>
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
                  background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px',
                  boxShadow: BASE.shadowMd,
                  padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, color: BASE.muted,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>
                    Tipo de protocolo
                  </span>
                  {[
                    { id: 'prevaciado', l: 'Pre-Vaciado (CAL-FOR-006)' },
                    { id: 'elemento',   l: 'Por elemento (concreto, acero…)' },
                  ].map(t => {
                    const activo = tipoProtocolo === t.id;
                    return (
                      <button key={t.id}
                        onClick={() => { setTipoProtocolo(t.id); setPvEdit(null); setProtocoloEdit(null); }}
                        style={{
                          padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                          border: `1px solid ${activo ? BASE.navy : BASE.border}`,
                          background: activo ? BASE.navy : BASE.bgSoft,
                          color: activo ? '#fff' : BASE.navy,
                          fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px',
                          textTransform: 'uppercase', transition: 'all 0.15s',
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
          {tab === 'bim'        && <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando visor BIM…</div>}><BIM showToast={showToast} /></Suspense>}
          {tab === 'planos'     && <PlanosView showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
