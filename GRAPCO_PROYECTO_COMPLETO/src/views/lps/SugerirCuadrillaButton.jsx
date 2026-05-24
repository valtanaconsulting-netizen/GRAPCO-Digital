// src/views/lps/SugerirCuadrillaButton.jsx — Integración LPS ↔ Optimizador (Bloque 17)
//
// Botón que se inserta en cualquier vista del LPS (Plan Diario, Programación Semanal, etc.)
// Al hacer click, abre un modal con el Optimizador pre-rellenado con la actividad.
// Cuando el ingeniero acepta una recomendación, llama el callback con las personas elegidas.
//
// USO:
//   <SugerirCuadrillaButton
//     actividad="Encofrado de muros"
//     tamano={4}
//     onAsignar={(personas, lufEstimado) => {
//       // Acá guardas la asignación en tu doc de Plan Diario
//       updateDoc(doc(db, 'Planes_Diarios', planId), {
//         cuadrillaAsignada: personas.map(p => p.nombre),
//         lufEstimado,
//         origenSugerencia: 'optimizador_v1',
//       });
//     }}
//   />

import React, { useState } from 'react';
import { BASE } from '../../utils/styles';
import OptimizadorCuadrillas from '../OptimizadorCuadrillas';

export default function SugerirCuadrillaButton({
  actividad,
  tamano = 4,
  onAsignar,
  estilo = 'normal',  // 'normal' | 'compacto' | 'icono'
  showToast,
}) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const manejarSeleccion = (recomendados, lufEstimado) => {
    if (onAsignar) {
      onAsignar(recomendados, lufEstimado);
    }
    showToast?.(`✅ Cuadrilla asignada: ${recomendados.length} personas (LUF est. ${lufEstimado}%)`, 'success');
    setModalAbierto(false);
  };

  // Tres estilos de botón
  let boton;
  if (estilo === 'icono') {
    boton = (
      <button
        onClick={() => setModalAbierto(true)}
        title="Sugerir cuadrilla óptima para esta actividad"
        style={{
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          color: '#fff', border: 'none',
          width: '32px', height: '32px',
          borderRadius: '50%', cursor: 'pointer',
          fontSize: '14px',
          boxShadow: `0 4px 12px ${BASE.gold}55`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>🤖</button>
    );
  } else if (estilo === 'compacto') {
    boton = (
      <button
        onClick={() => setModalAbierto(true)}
        style={{
          padding: '6px 12px',
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          color: '#fff', border: 'none', borderRadius: '6px',
          fontSize: '11px', fontWeight: '900', cursor: 'pointer',
          letterSpacing: '0.4px',
        }}>🤖 SUGERIR</button>
    );
  } else {
    boton = (
      <button
        onClick={() => setModalAbierto(true)}
        style={{
          padding: '10px 18px',
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          letterSpacing: '0.5px',
          boxShadow: `0 4px 12px ${BASE.gold}55`,
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}>
        🤖 SUGERIR CUADRILLA ÓPTIMA
      </button>
    );
  }

  return (
    <>
      {boton}
      {modalAbierto && (
        <div onClick={() => setModalAbierto(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.85)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: BASE.white,
            borderRadius: '14px',
            maxWidth: '900px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            padding: '20px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '14px',
            }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
                  🤖 OPTIMIZADOR INVOCADO DESDE LPS
                </p>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy }}>
                  Cuadrilla óptima para "{actividad}"
                </h2>
              </div>
              <button onClick={() => setModalAbierto(false)} style={{
                background: BASE.bgSoft, color: BASE.muted,
                border: 'none', width: '34px', height: '34px',
                borderRadius: '50%', cursor: 'pointer',
                fontSize: '18px', fontWeight: '900',
              }}>✕</button>
            </div>

            <OptimizadorCuadrillas
              showToast={showToast}
              actividadInicial={actividad}
              tamanoInicial={tamano}
              onCuadrillaSeleccionada={manejarSeleccion}
            />
          </div>
        </div>
      )}
    </>
  );
}
