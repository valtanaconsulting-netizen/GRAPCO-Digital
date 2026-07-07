// src/views/MaterialesPanel.jsx — Wrapper del modulo Materiales (Bloque 19)
//
// 7 sub-tabs:
//   Dashboard    → KPIs + alertas globales
//   Catalogo     → CRUD de materiales
//   Almacenes    → CRUD de almacenes
//   Kardex       → Movimientos historicos
//   Entrada      → Registrar nueva entrada
//   Salida       → Registrar nueva salida (vale)
//   Reporte S10  → Almacen valorizado a fecha

import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import RoleGuard from '../components/RoleGuard';
import VistaHeader from '../components/VistaHeader';
import Icon from '../components/Icon';
import DashboardMateriales from './materiales/DashboardMateriales';
import CatalogoMateriales from './materiales/CatalogoMateriales';
import AlmacenesView from './materiales/AlmacenesView';
import KardexView from './materiales/KardexView';
import EntradaMaterial from './materiales/EntradaMaterial';
import SalidaMaterial from './materiales/SalidaMaterial';
import ReporteValorizadoS10 from './materiales/ReporteValorizadoS10';
import ImportarRegistroAlmacen from './materiales/ImportarRegistroAlmacen';

const TABS = [
  { id: 'dashboard',  l: 'Dashboard',   ic: 'dashboard' },
  { id: 'catalogo',   l: 'Catalogo',    ic: 'fileText' },
  { id: 'almacenes',  l: 'Almacenes',   ic: 'building' },
  { id: 'kardex',     l: 'Kardex',      ic: 'barChart3' },
  { id: 'entrada',    l: 'Entrada',     ic: 'package' },
  { id: 'salida',     l: 'Salida',      ic: 'truck' },
  { id: 'reporteS10', l: 'Reporte S10', ic: 'fileText' },
  { id: 'importar',   l: 'Importar Registro', ic: 'package' },
];

const KEY_TO_TAB_MAT = {
  'materiales.dashboard':  'dashboard',
  'materiales.catalogo':   'catalogo',
  'materiales.almacenes':  'almacenes',
  'materiales.kardex':     'kardex',
  'materiales.entrada':    'entrada',
  'materiales.salida':     'salida',
  'materiales.reporteS10': 'reporteS10',
  'materiales.importar':   'importar',
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
        <VistaHeader
          icono="boxes"
          eyebrow="Almacén · Materiales"
          titulo="Control de almacén e inventario"
          subtitulo="Trazabilidad completa: entradas, salidas, traslados y mermas — integración con APU."
        />

        {/* SUB-TABS — solo si NO viene navegacion externa */}
        {!tabExterna && (
        <div style={{
          background: BASE.bgSoft,
          border: `1px solid ${BASE.border}`,
          borderRadius: '14px',
          padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
          boxShadow: BASE.shadowSm,
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '9px 16px', flex: '1 1 auto', minWidth: '120px',
                background: activo ? BASE.navy : 'transparent',
                color: activo ? '#fff' : BASE.muted,
                border: 'none',
                borderRadius: '10px',
                fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                boxShadow: activo ? BASE.shadowSm : 'none',
                transition: 'all 0.18s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              }}>
                <Icon name={t.ic} size={14} color={activo ? BASE.gold : BASE.muted} strokeWidth={2} />
                {t.l}
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
          {tab === 'importar'  && <ImportarRegistroAlmacen showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
