// src/views/modulos/resultadoOperativo/ROPanel.jsx — Wrapper RO (B21)
//
// Navegación:
//  • Desde el MENÚ LATERAL de Oficina Técnica → recibe `seccionExterna` (una sección
//    por entrada del sidebar) y NO muestra banner ni chips (el sidebar ya organiza).
//  • Suelto (área Ingeniero / móvil) → muestra su propio banner + barra de secciones.
//
// Las 3 vistas de "Costo Real" (En vivo / EVM / Controles) se CONSOLIDAN en una sola
// sección "Costo Real (CR)" con sub-tabs internos, para no repetir 3 entradas casi iguales.

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
import CRValorizacion from './CRValorizacion';
import ROFrentes from './ROFrentes';
import useTareosProyecto from './useTareosProyecto';

// Secciones de primer nivel (las claves coinciden con el menú lateral: ot.ro.<id>).
const SECCIONES = [
  { id: 'dashboard',   l: 'Dashboard RO',      icono: '📊', desc: 'KPIs ejecutivos',             color: '#f59e0b' },
  { id: 'costoReal',   l: 'Costo Real (CR · HH)', icono: '🧾', desc: 'HH × S/25.5 · EVM · Controles', color: '#0ea5e9' },
  { id: 'crVal',       l: 'CR Valorización',   icono: '💰', desc: 'Vendido vs CR · margen por familia', color: '#16a34a' },
  { id: 'oficial',     l: 'RO Oficial (F06)',  icono: '📑', desc: 'Formato Excel · EVM completo', color: '#0f1f3a' },
  { id: 'partidas',    l: 'Por Partida',       icono: '📋', desc: 'Detalle CPI / Margen',        color: '#7c3aed' },
  { id: 'frentes',     l: 'Por Frente (F1/F2)', icono: '🎯', desc: 'PTARI vs NAVE · comparativo', color: '#0d9488' },
  { id: 'proyeccion',  l: 'Proyección',        icono: '🔮', desc: 'EAC + ETC + VAC',             color: '#dc2626' },
  { id: 'curvaS',      l: 'Curva S',           icono: '📈', desc: 'Programada vs Real',          color: '#0d9488' },
  { id: 'adicionales', l: 'Adicionales',       icono: '➕', desc: 'PQ · Avance Prog/Val',        color: '#16a34a' },
  { id: 'deductivos',  l: 'Deductivos',        icono: '➖', desc: 'PQ · Avance Prog/Val',        color: '#ef4444' },
];

// Sub-tabs internos de "Costo Real" (consolidan las 3 vistas CR que antes iban sueltas).
const CR_SUBTABS = [
  { id: 'crVivo',    l: 'En vivo',   desc: 'HH × S/25.5 desde los tareos' },
  { id: 'crOficial', l: 'EVM',       desc: 'AC por partida · EVM' },
  { id: 'cr',        l: 'Controles', desc: 'Facturas · Almacén · Tareos · GG' },
];

export default function ROPanel({ showToast, seccionExterna = null }) {
  const externo = !!seccionExterna;
  const [seccionInterna, setSeccionInterna] = useState('dashboard');
  const seccion = externo ? seccionExterna : seccionInterna;
  const [crSub, setCrSub] = useState('crVivo');
  const { tareos } = useTareosProyecto();

  // Sección "Costo Real" con sus 3 sub-tabs internos.
  const renderCostoReal = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '5px', display: 'flex', gap: '4px', flexWrap: 'wrap',
      }}>
        {CR_SUBTABS.map(s => {
          const activo = crSub === s.id;
          return (
            <button key={s.id} onClick={() => setCrSub(s.id)} style={{
              padding: '9px 16px', flex: '1 1 auto', minWidth: '140px',
              background: activo ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'transparent',
              color: activo ? '#fff' : BASE.muted,
              border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: '800',
              cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1px',
              boxShadow: activo ? '0 4px 12px #0ea5e955' : 'none', transition: 'all 0.18s',
            }}>
              <span>{s.l}</span>
              <span style={{ fontSize: '9.5px', fontWeight: 600, opacity: activo ? 0.92 : 0.7 }}>{s.desc}</span>
            </button>
          );
        })}
      </div>
      <div className="anim-fade-in" key={crSub}>
        {crSub === 'crVivo'    && <CostoRealCR historial={tareos} />}
        {crSub === 'crOficial' && <CostoRealOficial showToast={showToast} />}
        {crSub === 'cr'        && <ControlRegistros showToast={showToast} />}
      </div>
    </div>
  );

  const renderSeccion = () => {
    switch (seccion) {
      case 'dashboard':   return <RODashboard showToast={showToast} />;
      case 'costoReal':   return renderCostoReal();
      case 'crVal':       return <CRValorizacion />;
      case 'oficial':     return <ResultadoOperativoOficial showToast={showToast} />;
      case 'partidas':    return <ROporPartida showToast={showToast} />;
      case 'frentes':     return <ROFrentes />;
      case 'proyeccion':  return <ROProyeccion showToast={showToast} />;
      case 'curvaS':      return <CurvaSFinanciera showToast={showToast} />;
      case 'adicionales': return <Adicionales showToast={showToast} />;
      case 'deductivos':  return <Deductivos showToast={showToast} />;
      default:            return <RODashboard showToast={showToast} />;
    }
  };

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'oficina_tecnica']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Banner + chips SOLO cuando NO viene del menú lateral (área Ingeniero / móvil). */}
        {!externo && (
          <>
            <div style={{
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
              borderRadius: '14px', padding: '13px 16px', color: '#fff',
              borderLeft: `5px solid ${BASE.navy}`, boxShadow: `0 4px 20px ${BASE.gold}55`,
            }}>
              <p style={{ fontSize: '10px', fontWeight: '900', color: '#fff', letterSpacing: '1.6px', opacity: 0.9 }}>
                📊 RESULTADO OPERATIVO · METODOLOGÍA COSTOS PERÚ + EVM PMI
              </p>
              <h2 style={{ fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>
                El Estado de Resultados de la Obra
              </h2>
              <p style={{ fontSize: '12px', opacity: 0.92, marginTop: '4px' }}>
                Cruza Plan Maestro + APUs + Tareos + Kardex + Valorizaciones. Calcula CPI, SPI, EAC, VAC y margen real por partida. Identifica partidas críticas automáticamente.
              </p>
            </div>

            <div style={{
              background: BASE.white, border: `1px solid ${BASE.border}`,
              borderRadius: '14px', padding: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap',
            }}>
              {SECCIONES.map(t => {
                const activo = seccion === t.id;
                return (
                  <button key={t.id} onClick={() => setSeccionInterna(t.id)} style={{
                    padding: '12px 18px', flex: '1 1 auto', minWidth: '160px',
                    background: activo ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)` : 'transparent',
                    color: activo ? '#fff' : BASE.muted,
                    border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                    cursor: 'pointer', letterSpacing: '0.3px',
                    boxShadow: activo ? `0 4px 14px ${t.color}55` : 'none', transition: 'all 0.18s',
                    textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>{t.icono}</span>{t.l}
                    </span>
                    <span style={{ fontSize: '9.5px', fontWeight: '600', opacity: activo ? 0.92 : 0.7 }}>{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="anim-fade-in" key={seccion}>
          {renderSeccion()}
        </div>
      </div>
    </RoleGuard>
  );
}
