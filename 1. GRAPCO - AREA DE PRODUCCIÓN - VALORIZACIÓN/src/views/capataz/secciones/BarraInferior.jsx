// src/views/capataz/secciones/BarraInferior.jsx
// Barra sticky inferior con 3 acciones (en tareo y en metrado):
//   🗑️ Basura  → elimina la actividad activa (solo si hay una seleccionada).
//   💾 GUARDAR → SOLO guarda el borrador y se queda en la pantalla (no navega).
//   ☁️ ENVIAR  → sube los registros a la nube / oficina técnica (publica).
// Para volver a los módulos está el botón "‹ Volver" de la cabecera.
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
  totales = null,     // { hn, he, total } del día — se cierra el tareo viéndolo
  bloqueo = null,     // motivo por el que no se puede enviar (null = se puede)
}) {
  const ocupado = estadoBorrador === 'guardando' || estadoBorrador === 'subiendo';
  const esTareo = modo === 'tareo';
  const hh = (n) => (Math.round((n || 0) * 10) / 10).toFixed(1);
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: isMobile ? 0 : '210px',
      right: 0,
      background: BASE.white,
      borderTop: `1px solid ${BASE.border}`,
      boxShadow: '0 -4px 16px rgba(15,23,42,0.08)',
      padding: '10px 16px calc(12px + env(safe-area-inset-bottom)) 16px',
      zIndex: 50,
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      {/* Cierre del día en una línea: el capataz envía habiendo visto el total,
          y la oficina técnica recibe la misma cifra que él revisó. */}
      {totales?.total > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          fontSize: '11px', fontWeight: 700, color: BASE.muted,
        }}>
          <span>{hh(totales.hn)} HN</span>
          <span style={{ color: BASE.border }}>·</span>
          <span>{hh(totales.he)} HE</span>
          <span style={{ color: BASE.border }}>·</span>
          <span style={{ color: BASE.navy, fontWeight: 800 }}>{hh(totales.total)} HH del día</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
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

        {/* GUARDAR (secundario): solo guarda el borrador y se queda en pantalla. */}
        <button type="button" onClick={onGuardar} disabled={ocupado}
          style={{
            flex: 1, maxWidth: '150px',
            padding: '14px 16px',
            background: '#fff', color: BASE.navy,
            border: `2px solid ${BASE.navy}`, borderRadius: '12px',
            fontSize: '13px', fontWeight: '800', cursor: 'pointer',
            opacity: estadoBorrador === 'guardando' ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
          {estadoBorrador === 'guardando' ? '⏳' : '💾'} GUARDAR
        </button>

        {/* ENVIAR (principal): sube a la nube / oficina técnica y publica.
            Con `bloqueo` se deshabilita y dice qué falta, en vez de dejar pulsar
            para luego responder con una lista de errores. */}
        <button type="button" onClick={onSubir} disabled={ocupado || !!bloqueo}
          title={bloqueo || undefined}
          style={{
            flex: 2,
            padding: '14px 18px',
            background: estadoBorrador === 'subiendo' ? '#94a3b8'
              : bloqueo ? BASE.bgSoft
              : `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
            color: bloqueo ? BASE.muted : '#fff',
            border: bloqueo ? `1.5px solid ${BASE.border}` : 'none',
            borderRadius: '12px',
            fontSize: '14px', fontWeight: '800',
            cursor: bloqueo ? 'not-allowed' : 'pointer',
            boxShadow: bloqueo ? 'none' : `0 4px 16px ${BASE.green}55`,
            opacity: estadoBorrador === 'subiendo' ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          {estadoBorrador === 'subiendo' ? '☁️ Enviando...'
            : bloqueo ? bloqueo
            : <>☁️ ENVIAR{actividadesCount ? <> <strong>{actividadesCount}</strong></> : ''}</>}
        </button>
      </div>
    </div>
  );
}
