// src/views/OficinaTecnicaPanel.jsx — Wrapper modulo Oficina Tecnica (Bloque 20)
// Navegación de 2 niveles: GRUPOS → SUB-TABS. Orden por flujo: Resumen → Contrato → Ejecución → Facturación.

import React, { useState, useMemo } from 'react';
import { BASE } from '../utils/styles';
import VistaHeader from '../components/VistaHeader';
import Icon from '../components/Icon';
import RoleGuard from '../components/RoleGuard';
import DashboardOT from './oficinatecnica/DashboardOT';
import RDOView from './oficinatecnica/RDOView';
import ValorizacionesView from './oficinatecnica/ValorizacionesView';
import PartidasContractuales from './oficinatecnica/PartidasContractuales';
import SustentoMetrados from './oficinatecnica/SustentoMetrados';
import RegistroFotografico from './oficinatecnica/RegistroFotografico';
import InformeSustento from './oficinatecnica/InformeSustento';
import ROPanel from './modulos/resultadoOperativo/ROPanel';
import BIM from './BIM';

// Definición de grupos en orden de flujo natural
// `icon` = nombre del SVG (Icon) — presentación formal GRAPCO; el campo `icono`
// (emoji) y `color` se conservan por compatibilidad pero la UI usa navy/gold.
const GRUPOS = {
  resumen: {
    label: 'RESUMEN',
    icono: '📊',
    icon: 'dashboard',
    color: '#6366f1',
    tagline: 'Vista ejecutiva del proyecto',
    items: [
      { id: 'dashboard', l: 'Dashboard', icono: '📊', icon: 'dashboard', desc: 'KPIs ejecutivos' },
    ],
  },
  contrato: {
    label: 'PARTIDA CONTROL',
    icono: '📋',
    icon: 'fileText',
    color: '#7c3aed',
    tagline: 'Presupuesto y control de partidas',
    items: [
      { id: 'partidas', l: 'Partidas Control',   icono: '📋', icon: 'fileText', desc: 'Presupuesto contractual' },
    ],
  },
  ejecucion: {
    label: 'EJECUCIÓN',
    icono: '🛠️',
    icon: 'hardhat',
    color: '#0d9488',
    tagline: 'Captura de campo: día a día en obra',
    items: [
      { id: 'rdo',         l: 'RDO',                  icono: '📅', icon: 'registro', desc: 'Reporte Diario de Obra' },
      { id: 'fotografico', l: 'Registro Fotográfico', icono: '🖼️', icon: 'layers',   desc: 'Fotos automáticas del capataz' },
      { id: 'bim',         l: 'Modelo BIM',           icono: '🏗️', icon: 'cube',     desc: 'Vínculos + visor 3D' },
    ],
  },
  facturacion: {
    label: 'VALORIZACIÓN',
    icono: '💰',
    icon: 'coins',
    color: '#f59e0b',
    tagline: 'Valorización y cobro al cliente',
    items: [
      { id: 'valoriz',  l: 'Valorizaciones', icono: '💰', icon: 'coins',    desc: 'Mensual al cliente (auto-calcula)' },
      { id: 'sustento', l: 'Sustento',       icono: '📸', icon: 'layers',   desc: 'Fotos manuales para PQ-XX' },
      { id: 'informe',  l: 'Informe PDF',    icono: '📑', icon: 'fileText', desc: 'Genera el sustento imprimible' },
    ],
  },
  ro: {
    label: 'RO',
    icono: '📈',
    icon: 'trendingUp',
    color: '#0ea5e9',
    tagline: 'Resultado operativo del proyecto',
    items: [
      { id: 'ro', l: 'Resultado Operativo', icono: '📈', icon: 'trendingUp', desc: 'RO · CR · Adicionales · Deductivos' },
    ],
  },
};

// Mapa inverso: tab → grupo (para auto-seleccionar el grupo al venir por deep-link)
const TAB_TO_GRUPO = {
  dashboard:  'resumen',
  partidas:   'contrato',
  ro:         'ro',
  rdo:        'ejecucion',
  fotografico:'ejecucion',
  bim:        'ejecucion',
  valoriz:    'facturacion',
  sustento:   'facturacion',
  informe:    'facturacion',
};

const KEY_TO_TAB_OT = {
  'ot.dashboard':   'dashboard',
  'ot.ro':          'ro',
  'ot.valoriz':     'valoriz',
  'ot.sustento':    'sustento',
  'ot.fotografico': 'fotografico',
  'ot.informe':     'informe',
  'ot.partidas':    'partidas',
  'ot.rdo':         'rdo',
  'ot.bim':         'bim',
};

export default function OficinaTecnicaPanel({ showToast, tabExterna, onChangeTab }) {
  const [tabInterno, setTabInterno]   = useState('dashboard');
  const tab = tabExterna ? (KEY_TO_TAB_OT[tabExterna] || 'dashboard') : tabInterno;

  // El grupo activo se deriva del tab. Si el usuario hace click manual, se respeta.
  const grupoDelTab = TAB_TO_GRUPO[tab] || 'resumen';
  const [grupoManual, setGrupoManual] = useState(null);
  const grupoActivo = grupoManual || grupoDelTab;
  const grupoCfg = GRUPOS[grupoActivo] || GRUPOS.resumen;

  const setTab = (t) => {
    setGrupoManual(null); // al elegir un tab, el grupo se ajusta automáticamente
    if (onChangeTab) onChangeTab(t);
    else setTabInterno(t);
  };

  const cambiarGrupo = (gid) => {
    setGrupoManual(gid);
    // Al cambiar de grupo, saltar al primer sub-tab si el tab actual no pertenece
    if (TAB_TO_GRUPO[tab] !== gid) {
      const primerSubTab = GRUPOS[gid]?.items?.[0]?.id;
      if (primerSubTab) {
        if (onChangeTab) onChangeTab(primerSubTab);
        else setTabInterno(primerSubTab);
      }
    }
  };

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'oficina_tecnica']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* HEADER — cabecera unificada GRAPCO */}
        <VistaHeader
          icono="ruler"
          eyebrow="Oficina Técnica"
          titulo="Contrato · Ejecución · Facturación"
          subtitulo="RDO automático desde tareos+LPS. Valorización auto-calculada desde producción."
        />

        {!tabExterna && (
          <>
            {/* NIVEL 1 — GRUPOS (segmented / pills navy-gold) */}
            <div style={{
              background: BASE.bgSoft,
              border: `1px solid ${BASE.border}`,
              borderRadius: '12px',
              padding: '6px',
              boxShadow: BASE.shadowSm,
              display: 'flex', gap: '4px', flexWrap: 'wrap',
            }}>
              {Object.entries(GRUPOS).map(([gid, g]) => {
                const activo = grupoActivo === gid;
                return (
                  <button key={gid} onClick={() => cambiarGrupo(gid)} style={{
                    flex: '1 1 auto', minWidth: '130px',
                    padding: '10px 16px',
                    background: activo ? BASE.navy : 'transparent',
                    color: activo ? '#fff' : BASE.muted,
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: activo ? `0 4px 12px ${BASE.navy}33` : 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => { if (!activo) { e.currentTarget.style.background = BASE.white; e.currentTarget.style.color = BASE.navy; } }}
                  onMouseLeave={e => { if (!activo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.muted; } }}>
                    <Icon name={g.icon} size={15} color={activo ? BASE.gold : 'currentColor'} strokeWidth={2} />
                    {g.label}
                  </button>
                );
              })}
            </div>

            {/* NIVEL 2 — SUB-TABS DEL GRUPO ACTIVO */}
            <div style={{
              background: BASE.white,
              border: `1px solid ${BASE.border}`,
              borderRadius: '14px',
              padding: '12px 16px',
              boxShadow: BASE.shadowMd,
            }}>
              <p style={{ fontSize: '10px', color: BASE.muted, fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <span style={{ color: BASE.navy, fontWeight: 800, letterSpacing: '0.6px' }}>{grupoCfg.label}</span>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                {grupoCfg.tagline}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {grupoCfg.items.map(item => {
                  const activa = tab === item.id;
                  return (
                    <button key={item.id} onClick={() => setTab(item.id)} style={{
                      padding: '9px 14px',
                      background: activa ? BASE.navy : BASE.bgSoft,
                      color: activa ? '#fff' : BASE.muted,
                      border: `1px solid ${activa ? BASE.navy : BASE.border}`,
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: activa ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      letterSpacing: '0.2px',
                    }}
                    onMouseEnter={e => { if (!activa) { e.currentTarget.style.background = BASE.white; e.currentTarget.style.color = BASE.navy; e.currentTarget.style.borderColor = BASE.navyLight; } }}
                    onMouseLeave={e => { if (!activa) { e.currentTarget.style.background = BASE.bgSoft; e.currentTarget.style.color = BASE.muted; e.currentTarget.style.borderColor = BASE.border; } }}>
                      <Icon name={item.icon} size={14} color={activa ? BASE.gold : 'currentColor'} strokeWidth={2} />
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.l}</span>
                        <span style={{ fontSize: '9.5px', fontWeight: 600, opacity: 0.75, textTransform: 'none', letterSpacing: 0 }}>{item.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* CONTENIDO */}
        <div className="anim-fade-in" key={tab}>
          {tab === 'dashboard'   && <DashboardOT showToast={showToast} />}
          {tab === 'ro'          && <ROPanel showToast={showToast} />}
          {tab === 'valoriz'     && <ValorizacionesView showToast={showToast} />}
          {tab === 'sustento'    && <SustentoMetrados showToast={showToast} />}
          {tab === 'fotografico' && <RegistroFotografico />}
          {tab === 'informe'     && <InformeSustento />}
          {tab === 'partidas'    && <PartidasContractuales showToast={showToast} />}
          {tab === 'rdo'         && <RDOView showToast={showToast} />}
          {tab === 'bim'         && <BIM showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
