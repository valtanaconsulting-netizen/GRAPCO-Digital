// src/views/capataz/secciones/BarraInferior.jsx
// Barra sticky inferior. Su acción principal depende del MÓDULO del capataz:
//   modo="tareo"   → un solo GUARDAR (verde) que SOLO guarda y se queda en la
//                    pantalla (no te bota a los módulos). Para volver a los
//                    módulos está el botón "‹ Volver" de la cabecera.
//   modo="metrado" → GUARDAR + SUBIR (sube los registros a la oficina técnica).
// Respeta el "home indicator" del iPhone (safe-area-inset-bottom). En desktop
// arranca en left:210px para no taparse con el sidebar fixed del shell.
import React from 'react';
import { BASE } from '../../../utils/styles';

export default function BarraInferior({
  isMobile,
  estadoBorrador,
  actividadesCount,
  onGuardar,
  onSubir,
  onEliminar,
  puedeEliminar,
  modo = 'metrado',
}) {
  const ocupado = estadoBorrador === 'guardando' || estadoBorrador === 'subiendo';
  const esTareo = modo === 'tareo';
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: isMobile ? 0 : '210px',
      right: 0,
      background: BASE.white,
      borderTop: `1px solid ${BASE.border}`,
      boxShadow: '0 -4px 16px rgba(15,23,42,0.08)',
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom)) 16px',
      zIndex: 50,
      display: 'flex', gap: '10px',
    }}>
      {esTareo && puedeEliminar && (
        <button type="button" onClick={onEliminar} disabled={ocupado}
          title="Eliminar actividad"
          style={{
            flexShrink: 0,
            padding: '14px 16px',
            background: BASE.redLight, color: BASE.red,
            border: 'none', borderRadius: '12px',
            fontSize: '18px', fontWeight: '800', cursor: 'pointer',
            opacity: ocupado ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🗑️</button>
      )}

      {/* En METRADO el GUARDAR es secundario (blanco) porque la acción
          principal es SUBIR. En TAREO no se muestra aquí: el único botón es el
          GUARDAR verde de abajo (guarda y se queda). */}
      {!esTareo && (
        <button type="button" onClick={onGuardar} disabled={ocupado}
          style={{
            flex: 1, maxWidth: '160px',
            padding: '14px 16px',
            background: '#fff', color: BASE.navy,
            border: `2px solid ${BASE.navy}`, borderRadius: '12px',
            fontSize: '13px', fontWeight: '800', cursor: 'pointer',
            opacity: estadoBorrador === 'guardando' ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
          {estadoBorrador === 'guardando' ? '⏳' : '💾'} GUARDAR
        </button>
      )}

      {esTareo ? (
        <button type="button" onClick={onGuardar} disabled={ocupado}
          style={{
            flex: 1,
            padding: '14px 18px',
            background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '15px', fontWeight: '800', cursor: 'pointer',
            boxShadow: `0 4px 16px ${BASE.green}55`,
            opacity: ocupado ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          {estadoBorrador === 'guardando' ? '⏳ Guardando...' : <>💾 GUARDAR</>}
        </button>
      ) : (
        <button type="button" onClick={onSubir} disabled={ocupado}
          style={{
            flex: 2,
            padding: '14px 18px',
            background: estadoBorrador === 'subiendo'
              ? '#94a3b8'
              : `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '14px', fontWeight: '800', cursor: 'pointer',
            boxShadow: `0 4px 16px ${BASE.green}55`,
            opacity: estadoBorrador === 'subiendo' ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          {estadoBorrador === 'subiendo'
            ? '☁️ Subiendo...'
            : <>☁️ SUBIR <strong>{actividadesCount}</strong> ACT.</>}
        </button>
      )}
    </div>
  );
}
