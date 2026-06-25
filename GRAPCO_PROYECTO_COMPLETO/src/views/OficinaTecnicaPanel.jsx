// src/views/OficinaTecnicaPanel.jsx — Wrapper modulo Oficina Tecnica (Bloque 20)
// Navegación de 2 niveles: GRUPOS → SUB-TABS. Orden por flujo: Resumen → Contrato → Ejecución → Facturación.

import React, { useState, useMemo, lazy, Suspense } from 'react';
import { BASE } from '../utils/styles';
import Icon from '../components/Icon';
import RoleGuard from '../components/RoleGuard';
import DashboardOT from './oficinatecnica/DashboardOT';
import RDOView from './oficinatecnica/RDOView';
import ValorizacionesView from './oficinatecnica/ValorizacionesView';
import ValorizacionF07 from './oficinatecnica/ValorizacionF07';
import PresupuestoView from './oficinatecnica/PresupuestoView';
import PrefijosCodigos from './oficinatecnica/PrefijosCodigos';
import SustentoMetrados from './oficinatecnica/SustentoMetrados';
import RegistroFotografico from './oficinatecnica/RegistroFotografico';
import InformeSustento from './oficinatecnica/InformeSustento';
import ROPanel from './modulos/resultadoOperativo/ROPanel';
// BIM (visor 3D + vendor-charts) cargado SOLO al abrir la pestaña, no dentro del chunk del panel.
const BIM = lazy(() => import('./BIM'));

// Definición de grupos en orden de flujo natural
// `icon` = nombre del SVG (Icon) — presentación formal GRAPCO; el campo `icono`
// (emoji) y `color` se conservan por compatibilidad pero la UI usa navy/gold.
const GRUPOS = {
  contrato: {
    label: 'PRESUPUESTO',
    icono: '📋',
    icon: 'fileText',
    color: '#7c3aed',
    tagline: 'Presupuesto contractual y control de partidas',
    items: [
      { id: 'partidas', l: 'Presupuesto',   icono: '📋', icon: 'fileText', desc: 'PPTTO · CD · GG · Utilidad · IGV' },
    ],
  },
  codigos: {
    label: 'CÓDIGOS',
    icono: '🔑',
    icon: 'layers',
    color: '#0891b2',
    tagline: 'Prefijos que unen ISP, Valorización y RO',
    items: [
      { id: 'prefijos', l: 'Prefijos / Códigos', icono: '🔑', icon: 'layers', desc: 'Designa el prefijo de cada actividad · ISP ↔ Valorización' },
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
      { id: 'valoriz',  l: 'Valorización F07 (ISP)', icono: '📄', icon: 'fileText', desc: 'Formato oficial F07 por cantidad · metrado del ISP (item/und/cant/PU)' },
      { id: 'liquidacion', l: 'Valorización anterior', icono: '💰', icon: 'coins', desc: 'Vista previa: % por partida + IGV/FG/detracción' },
      { id: 'sustento', l: 'Metrados / Sustento', icono: '📐', icon: 'layers', desc: 'Planilla de metrados (concreto/acero/encofrado) + fotos' },
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
  partidas:   'contrato',
  prefijos:   'codigos',
  ro:         'ro',
  rdo:        'ejecucion',
  fotografico:'ejecucion',
  bim:        'ejecucion',
  valoriz:    'facturacion',
  liquidacion:'facturacion',
  sustento:   'facturacion',
  informe:    'facturacion',
};

const KEY_TO_TAB_OT = {
  'ot.dashboard':   'dashboard',
  'ot.ro':          'ro',
  // Las secciones del RO viven ahora como entradas del menú lateral (ot.ro.<seccion>);
  // todas renderizan el ROPanel, que abre la sección indicada por KEY_TO_RO_SECCION.
  'ot.ro.dashboard':   'ro',
  'ot.ro.costoReal':   'ro',
  'ot.ro.oficial':     'ro',
  'ot.ro.partidas':    'ro',
  'ot.ro.frentes':     'ro',
  'ot.ro.proyeccion':  'ro',
  'ot.ro.curvaS':      'ro',
  'ot.ro.adicionales': 'ro',
  'ot.ro.deductivos':  'ro',
  'ot.valoriz':     'valoriz',
  'ot.liquidacion': 'liquidacion',
  'ot.sustento':    'sustento',
  'ot.fotografico': 'fotografico',
  'ot.informe':     'informe',
  'ot.partidas':    'partidas',
  'ot.prefijos':    'prefijos',
  'ot.rdo':         'rdo',
  'ot.bim':         'bim',
};

// Cada entrada ot.ro.<x> del menú lateral abre el ROPanel en esa sección.
const KEY_TO_RO_SECCION = {
  'ot.ro':             'dashboard',  // compat: clave antigua → arranca en el dashboard del RO
  'ot.ro.dashboard':   'dashboard',
  'ot.ro.costoReal':   'costoReal',
  'ot.ro.oficial':     'oficial',
  'ot.ro.partidas':    'partidas',
  'ot.ro.frentes':     'frentes',
  'ot.ro.proyeccion':  'proyeccion',
  'ot.ro.curvaS':      'curvaS',
  'ot.ro.adicionales': 'adicionales',
  'ot.ro.deductivos':  'deductivos',
};

export default function OficinaTecnicaPanel({ showToast, tabExterna, onChangeTab, tabInicial }) {
  // tabInicial: deep-link móvil desde el SelectorPerfil (key 'ot.valoriz' o id 'valoriz'). Siembra inicial.
  const [tabInterno, setTabInterno]   = useState(() => KEY_TO_TAB_OT[tabInicial] || tabInicial || 'valoriz');
  const tab = tabExterna ? (KEY_TO_TAB_OT[tabExterna] || 'valoriz') : tabInterno;
  // Sección del RO a abrir cuando la entrada del sidebar es ot.ro.<x> (null = ROPanel con sus chips).
  const roSeccion = tabExterna ? (KEY_TO_RO_SECCION[tabExterna] || null) : null;

  // El grupo activo se deriva del tab. Si el usuario hace click manual, se respeta.
  const grupoDelTab = TAB_TO_GRUPO[tab] || 'facturacion';
  const [grupoManual, setGrupoManual] = useState(null);
  const grupoActivo = grupoManual || grupoDelTab;
  const grupoCfg = GRUPOS[grupoActivo] || GRUPOS.facturacion;

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
        {/* Cabecera retirada por pedido del usuario (2026-06-25): el shell ya rotula el área. */}
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
          {tab === 'ro'          && <ROPanel showToast={showToast} seccionExterna={roSeccion} />}
          {tab === 'valoriz'     && <ValorizacionF07 showToast={showToast} />}
          {tab === 'liquidacion' && <ValorizacionesView showToast={showToast} />}
          {tab === 'sustento'    && <SustentoMetrados showToast={showToast} />}
          {tab === 'fotografico' && <RegistroFotografico />}
          {tab === 'informe'     && <InformeSustento />}
          {tab === 'partidas'    && <PresupuestoView showToast={showToast} />}
          {tab === 'prefijos'    && <PrefijosCodigos showToast={showToast} />}
          {tab === 'rdo'         && <RDOView showToast={showToast} />}
          {tab === 'bim'         && <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: BASE.muted }}>Cargando visor BIM…</div>}><BIM showToast={showToast} /></Suspense>}
        </div>
      </div>
    </RoleGuard>
  );
}
