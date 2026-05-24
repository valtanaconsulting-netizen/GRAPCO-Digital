// src/views/MaterialesPanel.jsx — Wrapper del modulo Materiales (Bloque 19)
//
// 6 sub-tabs:
//   📊 Dashboard       → KPIs + alertas globales
//   📋 Catalogo        → CRUD de materiales
//   🏬 Almacenes       → CRUD de almacenes
//   📈 Kardex          → Movimientos historicos
//   ⬇️  Entrada        → Registrar nueva entrada
//   ⬆️  Salida         → Registrar nueva salida (vale)

import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import RoleGuard from '../components/RoleGuard';
import DashboardMateriales from './materiales/DashboardMateriales';
import CatalogoMateriales from './materiales/CatalogoMateriales';
import AlmacenesView from './materiales/AlmacenesView';
import KardexView from './materiales/KardexView';
import EntradaMaterial from './materiales/EntradaMaterial';
import SalidaMaterial from './materiales/SalidaMaterial';
import ReporteValorizadoS10 from './materiales/ReporteValorizadoS10';

const TABS = [
  { id: 'dashboard',  l: 'Dashboard',   icono: '📊', desc: 'KPIs y alertas globales',     color: '#7c3aed' },
  { id: 'catalogo',   l: 'Catalogo',    icono: '📋', desc: 'Maestro de materiales',       color: '#1e3a5f' },
  { id: 'almacenes',  l: 'Almacenes',   icono: '🏬', desc: 'Almacenes de empresa y obra', color: '#0d9488' },
  { id: 'kardex',     l: 'Kardex',      icono: '📈', desc: 'Movimientos e historial',     color: '#2563eb' },
  { id: 'entrada',    l: 'Entrada',     icono: '⬇️', desc: 'Registrar recepcion',          color: '#16a34a' },
  { id: 'salida',     l: 'Salida',      icono: '⬆️', desc: 'Registrar vale o pecosa',     color: '#dc2626' },
  { id: 'reporteS10', l: 'Reporte S10', icono: '📑', desc: 'Almacen valorizado a fecha',   color: '#7c3aed' },
];

const KEY_TO_TAB_MAT = {
  'materiales.dashboard':  'dashboard',
  'materiales.catalogo':   'catalogo',
  'materiales.almacenes':  'almacenes',
  'materiales.kardex':     'kardex',
  'materiales.entrada':    'entrada',
  'materiales.salida':     'salida',
  'materiales.reporteS10': 'reporteS10',
};

export default function MaterialesPanel({ showToast, tabExterna, onChangeTab }) {
  const [tabInterno, setTabInterno] = useState('dashboard');
  const tab = tabExterna ? (KEY_TO_TAB_MAT[tabExterna] || 'dashboard') : tabInterno;
  const setTab = (t) => {
    if (onChangeTab) onChangeTab(t);
    else setTabInterno(t);
  };

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'almacenero', 'logistica']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* HEADER */}
        <div style={{
          background: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
          borderRadius: '14px',
          padding: '20px 26px',
          color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.25)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            📦 MODULO MATERIALES · CONTROL DE ALMACEN
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Sistema integral de inventario y consumo
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            Trazabilidad completa: entradas, salidas, traslados, mermas. Integracion con APU para reconciliacion automatica.
          </p>
        </div>

        {/* SUB-TABS — solo si NO viene navegacion externa */}
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
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '12px 18px', flex: '1 1 auto', minWidth: '150px',
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
          {tab === 'dashboard' && <DashboardMateriales showToast={showToast} />}
          {tab === 'catalogo'  && <CatalogoMateriales showToast={showToast} />}
          {tab === 'almacenes' && <AlmacenesView showToast={showToast} />}
          {tab === 'kardex'    && <KardexView showToast={showToast} />}
          {tab === 'entrada'   && <EntradaMaterial showToast={showToast} onSaved={() => setTab('kardex')} />}
          {tab === 'salida'    && <SalidaMaterial showToast={showToast} onSaved={() => setTab('kardex')} />}
          {tab === 'reporteS10' && <ReporteValorizadoS10 showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
