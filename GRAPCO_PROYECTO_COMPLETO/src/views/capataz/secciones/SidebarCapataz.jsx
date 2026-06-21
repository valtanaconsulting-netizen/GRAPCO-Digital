// src/views/capataz/secciones/SidebarCapataz.jsx
// Sidebar de configuración del día (fecha + capataz + herramientas + estado +
// buscador de trabajador). Es el panel izquierdo en desktop y la cabecera del
// scroll en móvil.
//
// IMPORTANTE — Foco/scroll en inputs: el comentario original en Capataz.jsx
// advertía que NO se podía definir este bloque como `const Sidebar = () => (…)`
// inline dentro del padre, porque React lo recreaba en cada tecleo y el input
// "buscar trabajador" perdía el foco letra por letra. Como ahora es un módulo
// separado con referencia estable, ese riesgo no aplica. NO lo vuelvas a meter
// inline dentro de Capataz.jsx.
import React from 'react';
import DateInput from '../../../components/DateInput';
import { BASE, inp } from '../../../utils/styles';
import { hoy } from '../../../utils/helpers';
import SelectorCapataz from './SelectorCapataz';

// Capataz solo puede tocar tareo de HOY o AYER. Se duplica aquí para no acoplar
// el sidebar al padre (es una fecha trivial de calcular).
const ayer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export default function SidebarCapataz({
  // Estado
  fecha,
  capataz,
  fechaLimitada,
  cuadrillasParaSelect,
  cuadrillaInfo,
  miembrosCuadrilla,
  actividades,
  estadoBorrador,
  ultSubida,
  buscarTrab,
  // Setters
  setFecha,
  setCapataz,
  setBuscarTrab,
  // Helpers
  obtenerSemana,
  showToast,
  // Acciones
  onAbrirCatalogoWbs,
  onAbrirHistorial,
  onAgregarActividad,
  onEliminarBorrador,
  onVerTareo,
  modo = 'tareo',
}) {
  // El catálogo y "Nueva actividad" pertenecen al PASO 1 (tareo): ahí se eligen
  // las actividades del día. En el paso de metrado no se agregan actividades —
  // solo se llena el metrado de las que ya se escogieron.
  const esTareo = modo === 'tareo';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Sección FECHA */}
      <div>
        <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.gold, letterSpacing: '1.2px', marginBottom: '8px' }}>
          📅 FECHA DE TRABAJO
        </p>
        <DateInput
          label=""
          value={fecha}
          onChange={(d) => {
            if (!fechaLimitada) {
              setFecha(d);
              return;
            }
            // Capataz: solo HOY o AYER
            if (d === hoy() || d === ayer()) setFecha(d);
            else showToast('Solo puedes editar el tareo de hoy o de ayer.', 'warning');
          }}
          getSemana={obtenerSemana}
          min={fechaLimitada ? ayer() : null}
          max={hoy()}
        />
      </div>

      {/* El capataz ya viene resuelto desde la pantalla de entrada — aquí solo se
          muestra una línea fina de contexto (sin el selector grande, que era
          redundante). */}
      {capataz && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', background: BASE.bgSoft,
          borderRadius: '8px', border: `1px solid ${BASE.border}`,
        }}>
          <span style={{ fontSize: '14px' }}>👷</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: BASE.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {capataz}
            </span>
            {miembrosCuadrilla?.length > 0 && (
              <span style={{ fontSize: '9.5px', color: BASE.muted }}>
                👥 {miembrosCuadrilla.length} en cuadrilla
              </span>
            )}
          </span>
        </div>
      )}

      {/* Acciones */}
      {capataz && (
        <>
          <div style={{ height: '1px', background: BASE.border }} />
          <div>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.gold, letterSpacing: '1.2px', marginBottom: '8px' }}>
              🛠️ HERRAMIENTAS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {esTareo && (
                <button type="button" onClick={onAbrirCatalogoWbs} style={{
                  padding: '10px 12px', background: BASE.bgSoft, color: BASE.navy,
                  border: `1px solid ${BASE.border}`, borderRadius: '8px',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '16px' }}>📚</span>
                  <span>Catálogo WBS</span>
                </button>
              )}
              <button type="button" onClick={onAbrirHistorial} style={{
                padding: '10px 12px', background: BASE.bgSoft, color: BASE.navy,
                border: `1px solid ${BASE.border}`, borderRadius: '8px',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <span>Editar día anterior</span>
              </button>
              {esTareo && (
                <button type="button" onClick={onAgregarActividad} style={{
                  padding: '10px 12px', background: BASE.green, color: '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: `0 2px 6px ${BASE.green}55`,
                }}>
                  <span style={{ fontSize: '16px' }}>➕</span>
                  <span>Nueva actividad</span>
                </button>
              )}
              {actividades.length > 0 && onVerTareo && (
                <button type="button" onClick={onVerTareo} style={{
                  padding: '10px 12px', background: BASE.navy, color: '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: `0 2px 6px ${BASE.navy}55`,
                }}>
                  <span style={{ fontSize: '16px' }}>📄</span>
                  <span>Ver Tareo (PDF)</span>
                </button>
              )}
              {/* "Limpiar borrador" eliminado: el día se gestiona por actividad (eliminar
                  cada una) — menos riesgo de borrado masivo accidental y UI más limpia. */}
            </div>
          </div>
        </>
      )}

      {/* Estado del borrador */}
      {capataz && (
        <>
          <div style={{ height: '1px', background: BASE.border }} />
          <div style={{
            padding: '10px 12px', borderRadius: '10px',
            background: ultSubida ? BASE.greenLight : estadoBorrador === 'cargado' && actividades.length > 0 ? BASE.goldLight : BASE.bgSoft,
            border: `1px solid ${ultSubida ? BASE.green + '55' : estadoBorrador === 'cargado' && actividades.length > 0 ? BASE.gold + '55' : BASE.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>
                {estadoBorrador === 'cargando' ? '⏳' :
                  estadoBorrador === 'guardando' ? '💾' :
                    estadoBorrador === 'subiendo' ? '☁️' :
                      ultSubida ? '✅' :
                        actividades.length > 0 ? '📝' : '📋'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '11px', fontWeight: '800',
                  color: ultSubida ? BASE.greenDark : estadoBorrador === 'cargado' && actividades.length > 0 ? BASE.goldDark : BASE.muted,
                }}>
                  {estadoBorrador === 'cargando' && 'Cargando...'}
                  {estadoBorrador === 'guardando' && 'Guardando...'}
                  {estadoBorrador === 'subiendo' && 'Subiendo...'}
                  {estadoBorrador === 'cargado' && ultSubida && `Subido (${ultSubida.n} act.)`}
                  {estadoBorrador === 'cargado' && !ultSubida && actividades.length > 0 && 'Sin subir aún'}
                  {estadoBorrador === 'vacio' && actividades.length === 0 && 'Sin borrador'}
                </p>
                {ultSubida && (
                  <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '1px' }}>
                    {new Date(ultSubida.ts).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Buscar trabajador por nombre — filtra el TAREO de personal */}
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
              🔎 BUSCAR TRABAJADOR
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={buscarTrab}
                onChange={e => setBuscarTrab(e.target.value)}
                placeholder="Nombre del trabajador…"
                style={{
                  width: '100%', padding: '9px 28px 9px 10px', borderRadius: '8px',
                  border: `1px solid ${BASE.border}`, fontSize: '12px', background: BASE.white,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              {buscarTrab && (
                <button type="button" onClick={() => setBuscarTrab('')}
                  style={{
                    position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: BASE.muted, fontSize: '13px', fontWeight: '800', padding: '2px 4px',
                  }} title="Limpiar">✕</button>
              )}
            </div>
            {buscarTrab && (
              <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '4px' }}>
                Mostrando solo trabajadores que coinciden con “{buscarTrab}”.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
