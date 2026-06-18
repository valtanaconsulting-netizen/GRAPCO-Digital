// src/views/modulos/resultadoOperativo/ROPanel.jsx — Wrapper RO (B21)

import React, { useState } from 'react';
import { BASE } from '../../../utils/styles';
import RoleGuard from '../../../components/RoleGuard';
import RODashboard from './RODashboard';
import ROporPartida from './ROporPartida';
import ROProyeccion from './ROProyeccion';
import CurvaSFinanciera from './CurvaSFinanciera';
import ControlRegistros from './ControlRegistros';
import Adicionales from './Adicionales';
import Deductivos from './Deductivos';
import ResultadoOperativoOficial from './ResultadoOperativoOficial';
import CostoRealOficial from './CostoRealOficial';
import CostoRealCR from './CostoRealCR';
import RODesdeISP from './RODesdeISP';
import ROFrentes from './ROFrentes';
import useTareosProyecto from './useTareosProyecto';

const TABS = [
  // Cuadros EN VIVO (los que ya jalan data de los tareos / ISP) — primero.
  { id: 'crVivo',     l: 'CR · Costo Real',    icono: '🧾', desc: 'HH × S/25.5 desde los tareos (en vivo)', color: '#0ea5e9' },
  { id: 'roISP',      l: 'RO desde ISP',       icono: '📥', desc: 'Sube el ISP → CR + CHH (HH Meta/Real/CPI)', color: '#0d9488' },
  // Formato oficial F06 (se llena cuando haya presupuesto/precios por partida).
  { id: 'oficial',    l: 'RO Oficial (F06)',   icono: '📑', desc: 'Formato Excel · EVM completo', color: '#0f1f3a' },
  { id: 'crOficial',  l: 'CR Costo Real (EVM)', icono: '🧾', desc: 'AC por partida · EVM', color: '#0ea5e9' },
  { id: 'frentes',    l: 'Por Frente (F1/F2)', icono: '🎯', desc: 'PTARI vs NAVE · comparativo', color: '#0d9488' },
  { id: 'dashboard',  l: 'Dashboard RO',     icono: '📊', desc: 'KPIs ejecutivos',     color: '#f59e0b' },
  { id: 'partidas',   l: 'Por Partida',      icono: '📋', desc: 'Detalle CPI/Margen',  color: '#7c3aed' },
  { id: 'cr',         l: 'CR · Controles',   icono: '🧾', desc: 'Facturas · Almacén · Tareos · GG', color: '#0ea5e9' },
  { id: 'adicionales',l: 'Adicionales',      icono: '➕', desc: 'PQ · Avance Prog/Val', color: '#16a34a' },
  { id: 'deductivos', l: 'Deductivos',       icono: '➖', desc: 'PQ · Avance Prog/Val', color: '#ef4444' },
  { id: 'proyeccion', l: 'Proyección',       icono: '🎯', desc: 'EAC + ETC + VAC',     color: '#dc2626' },
  { id: 'curvaS',     l: 'Curva S',          icono: '📈', desc: 'Programada vs Real',  color: '#0d9488' },
];

export default function ROPanel({ showToast }) {
  // Arranca en el CR EN VIVO: muestra los cuadros poblados al instante desde los
  // tareos del proyecto (sin esperar presupuesto ni subir nada).
  const [tab, setTab] = useState('crVivo');
  const { tareos } = useTareosProyecto();

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'oficina_tecnica']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          borderRadius: '14px', padding: '20px 26px', color: '#fff',
          borderLeft: `5px solid ${BASE.navy}`,
          boxShadow: `0 4px 20px ${BASE.gold}55`,
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: '#fff', letterSpacing: '1.6px', opacity: 0.9 }}>
            📊 RESULTADO OPERATIVO · METODOLOGÍA COSTOS PERÚ + EVM PMI
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            El Estado de Resultados de la Obra
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.92, marginTop: '4px' }}>
            Cruza Plan Maestro + APUs + Tareos + Kardex + Valorizaciones. Calcula CPI, SPI, EAC, VAC y margen real por partida. Identifica partidas críticas automáticamente.
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
                letterSpacing: '0.3px',
                boxShadow: activo ? `0 4px 14px ${t.color}55` : 'none',
                transition: 'all 0.18s',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>{t.icono}</span>{t.l}
                </span>
                <span style={{ fontSize: '9.5px', fontWeight: '600', opacity: activo ? 0.92 : 0.7 }}>{t.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="anim-fade-in" key={tab}>
          {tab === 'crVivo'      && <CostoRealCR historial={tareos} />}
          {tab === 'roISP'       && <RODesdeISP />}
          {tab === 'oficial'     && <ResultadoOperativoOficial showToast={showToast} />}
          {tab === 'crOficial'   && <CostoRealOficial showToast={showToast} />}
          {tab === 'frentes'     && <ROFrentes />}
          {tab === 'dashboard'   && <RODashboard showToast={showToast} />}
          {tab === 'partidas'    && <ROporPartida showToast={showToast} />}
          {tab === 'cr'          && <ControlRegistros showToast={showToast} />}
          {tab === 'adicionales' && <Adicionales showToast={showToast} />}
          {tab === 'deductivos'  && <Deductivos showToast={showToast} />}
          {tab === 'proyeccion'  && <ROProyeccion showToast={showToast} />}
          {tab === 'curvaS'      && <CurvaSFinanciera showToast={showToast} />}
        </div>
      </div>
    </RoleGuard>
  );
}
