// src/views/admin/AdminPanel.jsx — Panel raíz de administración (Bloque 13)
// Solo accesible para usuarios con rol 'admin'.
// 5 sub-tabs: Resumen · Usuarios · Auditoría · Configuración · Salud sistema

import React, { useState, Suspense, lazy } from 'react';
import { BASE } from '../../utils/styles';
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

const TABS = [
  { id: 'resumen',     l: '📊 Resumen',          desc: 'Vista general del sistema' },
  { id: 'usuarios',    l: '👥 Usuarios',         desc: 'Gestión de cuentas y roles' },
  { id: 'asistencia',  l: '⏱️ Asistencia',       desc: 'Control de entrada/salida de obreros (fuente oficial de HH admin)' },
  { id: 'marcador',    l: '🎯 Marcador Facial',  desc: 'Reconocimiento facial en vivo para marcar entrada del día' },
  { id: 'enrolamiento',l: '🧬 Enrol. Facial',    desc: 'Registrar 3 fotos de cada obrero para reconocimiento posterior' },
  { id: 'auditoria',   l: '🕵️ Auditoría',        desc: 'Log de operaciones críticas' },
  { id: 'config',      l: '⚙️ Configuración',    desc: 'Tarifas y parámetros globales' },
  { id: 'salud',       l: '💚 Salud sistema',    desc: 'Estado de Firebase + APS' },
  { id: 'seed',        l: '🚀 Datos Demo',       desc: 'Cargar seed PTARI para sustentación' },
];

export default function AdminPanel({ showToast }) {
  const [tab, setTab] = useState('resumen');

  return (
    <RoleGuard roles={['admin']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>

        {/* Header compacto */}
        <div style={{
          background: BASE.white,
          borderRadius: '10px',
          border: `1px solid ${BASE.border}`,
          borderLeft: `4px solid ${BASE.gold}`,
          padding: '10px 16px',
          display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
            Panel de Administración GRAPCO
          </span>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
            {TABS.find(t => t.id === tab)?.desc}
          </span>
        </div>

        {/* Sub-tabs */}
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '12px', padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="btn-feedback"
                style={{
                  padding: '10px 18px', flex: '1 1 auto', minWidth: '140px',
                  background: activo ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : 'transparent',
                  color: activo ? '#fff' : BASE.muted,
                  border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                  boxShadow: activo ? `0 4px 12px ${BASE.navy}40` : 'none',
                  transition: 'all 0.18s ease',
                  letterSpacing: '0.3px',
                }}>{t.l}</button>
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
