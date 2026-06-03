// src/views/OficinaTecnicaPanel.jsx — Wrapper modulo Oficina Tecnica (Bloque 20)
// Navegación de 2 niveles: GRUPOS → SUB-TABS. Orden por flujo: Resumen → Contrato → Ejecución → Facturación.

import React, { useState, useMemo } from 'react';
import { BASE } from '../utils/styles';
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
const GRUPOS = {
  resumen: {
    label: 'RESUMEN',
    icono: '📊',
    color: '#6366f1',
    tagline: 'Vista ejecutiva del proyecto',
    items: [
      { id: 'dashboard', l: 'Dashboard', icono: '📊', desc: 'KPIs ejecutivos' },
    ],
  },
  contrato: {
    label: 'PARTIDA CONTROL',
    icono: '📋',
    color: '#7c3aed',
    tagline: 'Presupuesto y control de partidas',
    items: [
      { id: 'partidas', l: 'Partidas Control',   icono: '📋', desc: 'Presupuesto contractual' },
    ],
  },
  ejecucion: {
    label: 'EJECUCIÓN',
    icono: '🛠️',
    color: '#0d9488',
    tagline: 'Captura de campo: día a día en obra',
    items: [
      { id: 'rdo',         l: 'RDO',                  icono: '📅', desc: 'Reporte Diario de Obra' },
      { id: 'fotografico', l: 'Registro Fotográfico', icono: '🖼️', desc: 'Fotos automáticas del capataz' },
      { id: 'bim',         l: 'Modelo BIM',           icono: '🏗️', desc: 'Vínculos + visor 3D' },
    ],
  },
  facturacion: {
    label: 'VALORIZACIÓN',
    icono: '💰',
    color: '#f59e0b',
    tagline: 'Valorización y cobro al cliente',
    items: [
      { id: 'valoriz',  l: 'Valorizaciones', icono: '💰', desc: 'Mensual al cliente (auto-calcula)' },
      { id: 'sustento', l: 'Sustento',       icono: '📸', desc: 'Fotos manuales para PQ-XX' },
      { id: 'informe',  l: 'Informe PDF',    icono: '📑', desc: 'Genera el sustento imprimible' },
    ],
  },
  ro: {
    label: 'RO',
    icono: '📈',
    color: '#0ea5e9',
    tagline: 'Resultado operativo del proyecto',
    items: [
      { id: 'ro', l: 'Resultado Operativo', icono: '📈', desc: 'RO · CR · Adicionales · Deductivos' },
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
        {/* HEADER */}
        <div style={{
          background: `linear-gradient(135deg, #6366f1, #4338ca)`,
          borderRadius: '14px',
          padding: '20px 26px',
          color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.25)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            📊 MODULO OFICINA TÉCNICA · CONTRATO Y FACTURACIÓN
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Flujo: Contrato → Ejecución → Facturación
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            RDO automático desde tareos+LPS. Valorización auto-calculada desde producción.
          </p>
        </div>

        {!tabExterna && (
          <>
            {/* NIVEL 1 — GRUPOS */}
            <div style={{
              background: BASE.white,
              border: `1px solid ${BASE.border}`,
              borderRadius: '12px 12px 0 0',
              borderBottom: 'none',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {Object.entries(GRUPOS).map(([gid, g]) => {
                  const activo = grupoActivo === gid;
                  return (
                    <button key={gid} onClick={() => cambiarGrupo(gid)} style={{
                      flex: '1 1 auto', minWidth: '150px',
                      padding: '14px 18px',
                      background: 'transparent',
                      color: activo ? g.color : BASE.muted,
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: activo ? '900' : '700',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      borderBottom: activo ? `3px solid ${g.color}` : '3px solid transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    onMouseEnter={e => { if (!activo) e.currentTarget.style.color = BASE.navy; }}
                    onMouseLeave={e => { if (!activo) e.currentTarget.style.color = BASE.muted; }}>
                      <span style={{ fontSize: '15px' }}>{g.icono}</span>
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NIVEL 2 — SUB-TABS DEL GRUPO ACTIVO */}
            <div style={{
              background: BASE.white,
              border: `1px solid ${BASE.border}`,
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '12px 16px',
              marginTop: '-14px', // compensa el gap para que se vea pegado al nivel 1
            }}>
              <p style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: '600', marginBottom: '10px' }}>
                <span style={{ color: grupoCfg.color, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{grupoCfg.label}</span>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                {grupoCfg.tagline}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {grupoCfg.items.map(item => {
                  const activa = tab === item.id;
                  return (
                    <button key={item.id} onClick={() => setTab(item.id)} style={{
                      padding: '9px 14px',
                      background: activa ? `${grupoCfg.color}15` : 'transparent',
                      color: activa ? grupoCfg.color : BASE.muted,
                      border: `1px solid ${activa ? `${grupoCfg.color}55` : BASE.border}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: activa ? '800' : '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      letterSpacing: '0.2px',
                    }}
                    onMouseEnter={e => { if (!activa) { e.currentTarget.style.background = BASE.bgSoft; e.currentTarget.style.color = BASE.navy; } }}
                    onMouseLeave={e => { if (!activa) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.muted; } }}>
                      <span style={{ fontSize: '13px' }}>{item.icono}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                        <span>{item.l}</span>
                        <span style={{ fontSize: '9.5px', fontWeight: '600', opacity: 0.75 }}>{item.desc}</span>
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
