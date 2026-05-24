// src/views/ComprasPanel.jsx — Wrapper del modulo Compras (Fase 3)
//
// Tabs: Ordenes Compra · Ordenes Servicio · Partidas · Tipo Cambio

import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import RoleGuard from '../components/RoleGuard';
import OrdenesListView from './compras/OrdenesListView';
import PartidasView from './compras/PartidasView';
import CotizacionesView from './compras/CotizacionesView';
import TipoCambioView from './materiales/TipoCambioView';

const TABS = [
  { id: 'cotiz',     l: 'Cotizaciones',     icono: '🔎', desc: 'Precios de mercado',         color: '#0ea5e9' },
  { id: 'oc',        l: 'Ordenes Compra',   icono: '🛒', desc: 'OC a proveedores',           color: '#2563eb' },
  { id: 'os',        l: 'Ordenes Servicio', icono: '🔧', desc: 'OS de servicios',            color: '#f59e0b' },
  { id: 'partidas',  l: 'Partidas',         icono: '📑', desc: 'Presupuesto por partidas',   color: '#7c3aed' },
  { id: 'tc',        l: 'Tipo Cambio',      icono: '💱', desc: 'TC SUNAT diario',            color: '#0d9488' },
];

export default function ComprasPanel({ showToast }) {
  const [tab, setTab] = useState('cotiz');

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'almacenero', 'logistica']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: `linear-gradient(135deg, #2563eb, #1d4ed8)`,
          borderRadius: '14px', padding: '20px 26px', color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.25)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            🛒 MODULO COMPRAS · WORKFLOW S10
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Ordenes de Compra y Servicio
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            Trazabilidad completa: OC/OS → almacen → consumo en partida. Multimoneda PEN/USD con TC SUNAT.
          </p>
        </div>

        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', padding: '6px',
          display: 'flex', gap: '4px', flexWrap: 'wrap',
        }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '12px 18px', flex: '1 1 auto', minWidth: '160px',
                background: activo ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)` : 'transparent',
                color: activo ? '#fff' : BASE.muted,
                border: 'none', borderRadius: '10px',
                fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                boxShadow: activo ? `0 4px 14px ${t.color}55` : 'none',
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

        <div className="anim-fade-in" key={tab}>
          {tab === 'cotiz'    && <CotizacionesView showToast={showToast} />}
          {tab === 'oc'       && <OrdenesListView tipoOrden="OC" showToast={showToast} />}
          {tab === 'os'       && <OrdenesListView tipoOrden="OS" showToast={showToast} />}
          {tab === 'partidas' && <PartidasView showToast={showToast} />}
          {tab === 'tc'       && <TipoCambioView showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
