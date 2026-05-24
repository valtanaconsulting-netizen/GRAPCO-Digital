// src/views/capataz/secciones/EditorActividad.jsx
// Editor de la actividad activa: identificación (partida/subpartida/actividad),
// metrado, observaciones, fotos del avance e ingreso de HN/HE por trabajador.
// Incluye el botón "Importar HH desde Marcador Facial" para autocompletar HN/HE
// desde Asistencia_Diaria.
import React from 'react';
import { BASE, inp } from '../../../utils/styles';
import { CATALOGO_MASTER, JORNADA_LEGAL } from '../../../utils/constants';
import { codigoActividad } from '../../../utils/helpers';
import FotoUploader from '../../../components/FotoUploader';
import TrabajadorCard from './TrabajadorCard';

export default function EditorActividad({
  actividadActiva,
  isMobile,
  buscarTrab,
  sinTopeHN,
  importandoFacial,
  fecha,
  showToast,
  hhAcumPorTrab,
  onUpdActividad,
  onEliminarActividad,
  onAbrirCatalogoWbs,
  onImportarFacial,
  onUpdTareo,
}) {
  return (
    <div style={{
      background: BASE.white, borderRadius: '14px',
      border: `1px solid ${BASE.border}`,
      padding: isMobile ? '14px' : '20px',
      marginBottom: '14px',
      boxShadow: BASE.shadowSm,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', paddingBottom: '12px',
        borderBottom: `1px solid ${BASE.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <span style={{
            background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
            color: '#fff', padding: '4px 10px',
            borderRadius: '6px', fontFamily: 'monospace',
            fontSize: '11px', fontWeight: '900', flexShrink: 0,
            boxShadow: `0 2px 6px ${BASE.gold}55`,
          }}>
            {actividadActiva.partida && actividadActiva.subpartida && actividadActiva.actividad
              ? codigoActividad(actividadActiva.partida, actividadActiva.subpartida, actividadActiva.actividad) || 'XX.XX.XX'
              : 'XX.XX.XX'}
          </span>
          <span style={{
            fontSize: '13px', fontWeight: '800', color: BASE.navy,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {actividadActiva.actividad || 'EDITAR ACTIVIDAD'}
          </span>
          {actividadActiva._registroExistenteId && (
            <span style={{
              background: BASE.greenLight, color: BASE.greenDark, padding: '3px 9px',
              borderRadius: '12px', fontSize: '10px', fontWeight: '800', flexShrink: 0,
            }}>✓ SUBIDO</span>
          )}
        </div>
        <button type="button" onClick={() => onEliminarActividad(actividadActiva.id)} style={{
          padding: '6px 10px', background: BASE.redLight, color: BASE.red,
          border: 'none', borderRadius: '7px', fontSize: '11px',
          fontWeight: '700', cursor: 'pointer', flexShrink: 0,
        }}>🗑️</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Botón catálogo */}
        <button type="button" onClick={onAbrirCatalogoWbs} style={{
          padding: '12px 16px',
          background: `linear-gradient(135deg, ${BASE.goldLight} 0%, #fff 100%)`,
          color: BASE.navy,
          border: `1.5px dashed ${BASE.gold}`, borderRadius: '10px',
          fontSize: '12px', fontWeight: '800', cursor: 'pointer', textAlign: 'center',
        }}>📚 Buscar en catálogo (toda la WBS)</button>

        {/* Selectores Partida / Subpartida */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>PARTIDA</label>
            <select value={actividadActiva.partida} style={inp({ fontSize: '12px' })}
              onChange={e => onUpdActividad(actividadActiva.id, 'partida', e.target.value)}>
              <option value="">Seleccionar...</option>
              {Object.keys(CATALOGO_MASTER).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>SUBPARTIDA</label>
            <select value={actividadActiva.subpartida} style={inp({ fontSize: '12px' })}
              onChange={e => onUpdActividad(actividadActiva.id, 'subpartida', e.target.value)}
              disabled={!actividadActiva.partida}>
              <option value="">Seleccionar...</option>
              {actividadActiva.partida && Object.keys(CATALOGO_MASTER[actividadActiva.partida] || {}).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>ACTIVIDAD</label>
          <select value={actividadActiva.actividad} style={inp({ fontSize: '12px' })}
            onChange={e => onUpdActividad(actividadActiva.id, 'actividad', e.target.value)}
            disabled={!actividadActiva.subpartida}>
            <option value="">Seleccionar...</option>
            {actividadActiva.partida && actividadActiva.subpartida &&
              (CATALOGO_MASTER[actividadActiva.partida]?.[actividadActiva.subpartida] || []).map(a =>
                <option key={a} value={a}>{a}</option>
              )}
          </select>
        </div>

        {/* Metrado destacado */}
        <div style={{
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          borderRadius: '12px',
          padding: '14px 18px',
          color: '#fff',
        }}>
          <label style={{
            fontSize: '10px', fontWeight: '800', color: BASE.gold,
            letterSpacing: '1px', display: 'block', marginBottom: '6px',
          }}>
            📏 METRADO AVANZADO ({actividadActiva.unidad || 'UND'})
          </label>
          <input
            type="number" step="0.001" min="0"
            value={actividadActiva.metrado}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'rgba(255,255,255,0.1)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              fontSize: '24px', fontWeight: '900', color: '#fff',
              textAlign: 'center', outline: 'none', boxSizing: 'border-box',
            }}
            onChange={e => onUpdActividad(actividadActiva.id, 'metrado', e.target.value)}
            inputMode="decimal" placeholder="0.000"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>
            OBSERVACIONES (opcional)
          </label>
          <textarea
            value={actividadActiva.observacion}
            onChange={e => onUpdActividad(actividadActiva.id, 'observacion', e.target.value)}
            style={inp({ height: '52px', resize: 'vertical', fontSize: '12px' })}
            placeholder="Restricciones, causas, comentarios..."
          />
        </div>

        {/* FOTOS DEL AVANCE — opcionales (no se valida en backend) */}
        <div>
          <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>
            📷 FOTOS DEL AVANCE (opcional)
          </label>
          <FotoUploader
            fotos={actividadActiva.fotos || []}
            onChange={(fotos) => onUpdActividad(actividadActiva.id, 'fotos', fotos)}
            ruta={`registros/${actividadActiva.id}`}
            actividadId={actividadActiva.id}
            fecha={fecha}
            maxArchivos={5}
            showToast={showToast}
          />
        </div>

        {/* TAREO DE PERSONAL — siempre 1 columna */}
        <div style={{
          background: BASE.bgSoft,
          border: `1px solid ${BASE.border}`,
          borderRadius: '12px',
          padding: '14px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px', flexWrap: 'wrap', gap: '6px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.6px' }}>
              👷 TAREO DE PERSONAL · {(() => {
                const q = buscarTrab.trim().toLowerCase();
                const tot = actividadActiva.detalleTareo.length;
                if (!q) return tot;
                const f = actividadActiva.detalleTareo.filter(t => (t.nombre || '').toLowerCase().includes(q)).length;
                return `${f} de ${tot}`;
              })()}
            </p>
            <p style={{ fontSize: '10px', color: BASE.muted }}>
              {sinTopeHN ? 'Sábado · HN sin tope' : `Saldo = ${JORNADA_LEGAL}h − HN del día`}
            </p>
          </div>

          {/* Importar HH desde marcador facial */}
          <button
            onClick={() => onImportarFacial(actividadActiva.id)}
            disabled={importandoFacial}
            title="Lee Asistencia_Diaria del día y completa HN/HE de los miembros que marcaron entrada y salida"
            style={{
              width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 14px', marginBottom: '12px',
              background: importandoFacial ? '#94a3b8' : 'linear-gradient(135deg,#0d9488,#0f766e)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '12px', fontWeight: 900, letterSpacing: '0.4px',
              cursor: importandoFacial ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(13,148,136,0.35)',
            }}>
            <span style={{ fontSize: '15px' }}>📷</span>
            {importandoFacial ? 'Importando…' : 'Importar HH desde Marcador Facial'}
          </button>

          {(() => {
            const q = buscarTrab.trim().toLowerCase();
            const lista = q
              ? actividadActiva.detalleTareo.filter(t => (t.nombre || '').toLowerCase().includes(q))
              : actividadActiva.detalleTareo;
            if (actividadActiva.detalleTareo.length === 0) {
              return (
                <p style={{ textAlign: 'center', padding: '24px', color: BASE.muted, fontSize: '12px', fontStyle: 'italic' }}>
                  La cuadrilla no tiene miembros — ve a Personal/Cuadrillas
                </p>
              );
            }
            if (lista.length === 0) {
              return (
                <p style={{ textAlign: 'center', padding: '24px', color: BASE.muted, fontSize: '12px', fontStyle: 'italic' }}>
                  Ningún trabajador coincide con “{buscarTrab}”.
                </p>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lista.map((t, i) => (
                  <TrabajadorCard
                    key={t.nombre}
                    t={t}
                    idx={i}
                    isMobile={isMobile}
                    acumHN={hhAcumPorTrab[t.nombre]?.hn || 0}
                    acumHE={hhAcumPorTrab[t.nombre]?.he || 0}
                    sinTopeHN={sinTopeHN}
                    actividadActivaId={actividadActiva.id}
                    updTareo={onUpdTareo}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
