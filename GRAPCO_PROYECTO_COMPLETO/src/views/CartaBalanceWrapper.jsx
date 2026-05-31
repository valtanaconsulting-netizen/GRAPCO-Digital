// src/views/CartaBalanceWrapper.jsx — Wrapper con sub-tabs (Bloque 16+18)
//
// 4 vistas:
//   1. ⚖️ Capturar    → CartaBalance.jsx (la captura existente)
//   2. 📊 Análisis    → CartaBalanceAnalisis.jsx (4 tabs internos)
//   3. 🤖 Optimizador → OptimizadorCuadrillas.jsx
//   4. 🧪 Validación  → ValidacionOptimizador.jsx (B18)

import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import CartaBalance from './CartaBalance';
import CartaBalanceAnalisis from './CartaBalanceAnalisis';
import OptimizadorCuadrillas from './OptimizadorCuadrillas';
import ValidacionOptimizador from './ValidacionOptimizador';
import ImportarCartaBalance from './ImportarCartaBalance';

const SUB_TABS = [
  { id: 'capturar',    l: '⚖️ Capturar',     desc: 'Realizar una nueva Carta Balance' },
  { id: 'importar',    l: '📥 Importar',     desc: 'Cargar carta por conteos (formato GP-GCR-FOR)' },
  { id: 'analisis',    l: '📊 Análisis',     desc: 'Ranking, Pareto, Crew Balance Chart' },
  { id: 'optimizador', l: '🤖 Optimizador',  desc: 'Generar cuadrilla óptima por actividad' },
  { id: 'validacion',  l: '🧪 Validación',   desc: 'Precisión del modelo (cross-validation)' },
];

export default function CartaBalanceWrapper({ cuadrillasActivas, personalDB, isMobile, showToast }) {
  const [tab, setTab] = useState('capturar');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Sub-navegación */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '6px',
        display: 'flex', gap: '4px', flexWrap: 'wrap',
      }}>
        {SUB_TABS.map(t => {
          const activo = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '11px 18px', flex: '1 1 auto', minWidth: '160px',
              background: activo
                ? `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`
                : 'transparent',
              color: activo ? '#fff' : BASE.muted,
              border: 'none', borderRadius: '8px',
              fontSize: '12px', fontWeight: '800', cursor: 'pointer',
              boxShadow: activo ? `0 4px 12px ${BASE.gold}55` : 'none',
              transition: 'all 0.18s ease',
              letterSpacing: '0.4px',
              textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <span>{t.l}</span>
              <span style={{
                fontSize: '10px', fontWeight: '600',
                opacity: activo ? 0.9 : 0.7,
              }}>{t.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div className="anim-fade-in" key={tab}>
        {tab === 'capturar' && (
          <CartaBalance
            cuadrillasActivas={cuadrillasActivas}
            personalDB={personalDB}
            isMobile={isMobile}
            showToast={showToast}
          />
        )}
        {tab === 'importar'    && <ImportarCartaBalance showToast={showToast} />}
        {tab === 'analisis'    && <CartaBalanceAnalisis />}
        {tab === 'optimizador' && <OptimizadorCuadrillas showToast={showToast} />}
        {tab === 'validacion'  && <ValidacionOptimizador />}
      </div>
    </div>
  );
}
