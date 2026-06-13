// src/views/admin/AdminPanel.jsx — Panel raíz de administración (Bloque 13)
// Solo accesible para usuarios con rol 'admin'.
// 5 sub-tabs: Resumen · Usuarios · Auditoría · Configuración · Salud sistema

import React, { useState, Suspense, lazy } from 'react';
import { BASE } from '../../utils/styles';
import VistaHeader from '../../components/VistaHeader';
import Icon from '../../components/Icon';
import RoleGuard from '../../components/RoleGuard';

import ResumenAdmin    from './ResumenAdmin';
import GestionUsuarios from './GestionUsuarios';
import VisorAuditoria  from './VisorAuditoria';
import ConfigSistema   from '../ConfigSistema';
import SaludSistema    from './SaludSistema';
import SeedDemoView    from '../modulos/admin/SeedDemoView';
import AsistenciaDiaria from '../asistencia/AsistenciaDiaria';
// Lazy: face-api.js (~1 MB+) fuera del bundle inicial; carga al abrir la tab.
const EnrolamientoFacial = lazy(() => import('../asistencia/EnrolamientoFacial'));
const MarcadorAsistencia = lazy(() => import('../asistencia/MarcadorAsistencia'));

// `t` = etiqueta limpia (sin emoji), `icon` = nombre SVG (Icon) para look formal GRAPCO.
// `l` se conserva por compatibilidad pero la UI ya no lo usa.
const TABS = [
  { id: 'resumen',     l: '📊 Resumen',          t: 'Resumen',         icon: 'dashboard',   desc: 'Vista general del sistema' },
  { id: 'usuarios',    l: '👥 Usuarios',         t: 'Usuarios',        icon: 'users',       desc: 'Gestión de cuentas y roles' },
  { id: 'asistencia',  l: '⏱️ Asistencia',       t: 'Asistencia',      icon: 'clock',       desc: 'Control de entrada/salida de obreros (fuente oficial de HH admin)' },
  { id: 'marcador',    l: '🎯 Marcador Facial',  t: 'Marcador Facial', icon: 'target',      desc: 'Reconocimiento facial en vivo para marcar entrada del día' },
  { id: 'enrolamiento',l: '🧬 Enrol. Facial',    t: 'Enrol. Facial',   icon: 'user',        desc: 'Registrar 3 fotos de cada obrero para reconocimiento posterior' },
  { id: 'auditoria',   l: '🕵️ Auditoría',        t: 'Auditoría',       icon: 'fileText',    desc: 'Log de operaciones críticas' },
  { id: 'config',      l: '⚙️ Configuración',    t: 'Configuración',   icon: 'settings',    desc: 'Tarifas y parámetros globales' },
  { id: 'salud',       l: '💚 Salud sistema',    t: 'Salud sistema',   icon: 'pulse',       desc: 'Estado de Firebase + APS' },
  { id: 'seed',        l: '🚀 Datos Demo',       t: 'Datos Demo',      icon: 'package',     desc: 'Cargar seed PTARI para sustentación' },
];

export default function AdminPanel({ showToast }) {
  const [tab, setTab] = useState('resumen');

  return (
    <RoleGuard roles={['admin']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>

        {/* Header — cabecera unificada GRAPCO */}
        <VistaHeader
          icono="shieldAdmin"
          eyebrow="Administración del Sistema"
          titulo="Panel de Administración GRAPCO"
          subtitulo={TABS.find(t => t.id === tab)?.desc}
        />

        {/* Sub-tabs — segmented / pills navy-gold */}
        <div style={{
          background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
          borderRadius: '12px', padding: '6px',
          boxShadow: BASE.shadowSm,
          display: 'flex', gap: '4px', flexWrap: 'wrap',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="btn-feedback"
                style={{
                  padding: '9px 16px', flex: '1 1 auto', minWidth: '140px',
                  background: activo ? BASE.navy : 'transparent',
                  color: activo ? '#fff' : BASE.muted,
                  border: 'none', borderRadius: '10px',
                  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                  boxShadow: activo ? `0 4px 12px ${BASE.navy}33` : 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (!activo) { e.currentTarget.style.background = BASE.white; e.currentTarget.style.color = BASE.navy; } }}
                onMouseLeave={e => { if (!activo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BASE.muted; } }}>
                <Icon name={t.icon} size={15} color={activo ? BASE.gold : 'currentColor'} strokeWidth={2} />
                {t.t}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="anim-fade-in" key={tab}>
          {tab === 'resumen'      && <ResumenAdmin showToast={showToast} />}
          {tab === 'usuarios'     && <GestionUsuarios showToast={showToast} />}
          {tab === 'asistencia'   && <AsistenciaDiaria showToast={showToast} />}
          {tab === 'marcador'     && <Suspense fallback={<p style={{padding:30,textAlign:'center',color:BASE.muted}}>⏳ Cargando reconocimiento facial…</p>}><MarcadorAsistencia showToast={showToast} /></Suspense>}
          {tab === 'enrolamiento' && <Suspense fallback={<p style={{padding:30,textAlign:'center',color:BASE.muted}}>⏳ Cargando reconocimiento facial…</p>}><EnrolamientoFacial showToast={showToast} /></Suspense>}
          {tab === 'auditoria'    && <VisorAuditoria showToast={showToast} />}
          {tab === 'config'       && <ConfigSistema showToast={showToast} />}
          {tab === 'salud'        && <SaludSistema showToast={showToast} />}
          {tab === 'seed'         && <SeedDemoView showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
