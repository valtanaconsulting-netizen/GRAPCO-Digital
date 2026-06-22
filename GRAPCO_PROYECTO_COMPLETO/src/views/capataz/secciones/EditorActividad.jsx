// src/views/capataz/secciones/EditorActividad.jsx
// Editor de la actividad activa, con DOS modos según el paso del capataz:
//   modo="tareo"   → identificación (partida/subpartida/actividad) + HN/HE por
//                    trabajador (incluye "Importar HH desde Marcador Facial").
//   modo="metrado" → identificación en SOLO LECTURA (ya viene del tareo) +
//                    metrado avanzado + observaciones + fotos del avance.
// El modelo de datos es el mismo `actividad`; solo cambia qué secciones se ven.
import React, { useState } from 'react';
import { BASE, inp } from '../../../utils/styles';
import { CATALOGO_MASTER, JORNADA_LEGAL } from '../../../utils/constants';
import FotoUploader from '../../../components/FotoUploader';
import SelectPremium from '../../../components/SelectPremium';
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
  onImportarFacial,
  onUpdTareo,
  modo = 'tareo',
}) {
  const esTareo = modo === 'tareo';
  const esMetrado = modo === 'metrado';
  // Tokens para encadenar la apertura de selectores: al elegir Partida se abre
  // sola la Subpartida; al elegir Subpartida se abre sola la Actividad.
  const [openSubToken, setOpenSubToken] = useState(0);
  const [openActToken, setOpenActToken] = useState(0);
  // La sección Partida/Subpartida/Actividad va plegada; el capataz la despliega
  // con un toque y desde ahí corre la cadena de selectores.
  const [identAbierta, setIdentAbierta] = useState(false);
  // Solo subpartidas/actividades CON opciones reales: el catálogo tiene
  // subpartidas vacías (p. ej. "DISEÑO": []) que, si se ofrecieran, dejarían la
  // actividad sin poder completarse y bloquearían la subida del tareo.
  const subpartidasDisponibles = actividadActiva.partida
    ? Object.keys(CATALOGO_MASTER[actividadActiva.partida] || {})
        .filter(sp => (CATALOGO_MASTER[actividadActiva.partida][sp] || []).length > 0)
    : [];
  const actividadesDisponibles = (actividadActiva.partida && actividadActiva.subpartida)
    ? (CATALOGO_MASTER[actividadActiva.partida]?.[actividadActiva.subpartida] || [])
    : [];
  return (
    <div style={{
      background: BASE.white, borderRadius: '14px',
      border: `1px solid ${BASE.border}`,
      padding: isMobile ? '12px 4px' : '20px',
      marginBottom: '14px',
      boxShadow: BASE.shadowSm,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* ── IDENTIFICACIÓN (solo en TAREO; en metrado va fija) ──
            Toda la sección Partida/Subpartida/Actividad va PLEGADA tras una
            cabecera. El capataz la despliega con un toque y desde ahí corre la
            cadena (al elegir Partida se abre sola Subpartida, y luego Actividad).
            Al elegir la Actividad la sección se pliega mostrando el resumen. */}
        {esTareo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: identAbierta ? '12px' : 0 }}>
            {/* Cabecera plegable */}
            <button
              type="button"
              onClick={() => setIdentAbierta(o => !o)}
              aria-expanded={identAbierta}
              style={{
                width: '100%', boxSizing: 'border-box', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: isMobile ? '11px 12px' : '12px 14px',
                borderRadius: '12px',
                border: `1.5px solid ${identAbierta ? BASE.gold : BASE.border}`,
                background: identAbierta ? BASE.goldSoft : BASE.bgSoft,
                boxShadow: identAbierta ? BASE.shadowFocus : 'none',
                cursor: 'pointer', fontFamily: BASE.font,
                transition: 'border-color .15s, background .15s, box-shadow .15s',
              }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.6px' }}>
                  ACTIVIDAD
                </span>
                <span style={{
                  display: 'block', marginTop: '1px',
                  fontSize: '12.5px',
                  fontWeight: actividadActiva.actividad ? 700 : 600,
                  color: actividadActiva.actividad ? BASE.navy : BASE.mutedSoft,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {actividadActiva.actividad
                    || (actividadActiva.partida
                        ? `${actividadActiva.partida}${actividadActiva.subpartida ? ' › ' + actividadActiva.subpartida : ''}`
                        : (identAbierta ? 'Elige partida, subpartida y actividad' : 'Toca para definir la actividad'))}
                </span>
              </div>
              {/* Chip de estado a la derecha (flexShrink:0 → nunca lo trunca la elipsis). */}
              {actividadActiva.partida && !actividadActiva.actividad && (
                <span style={{
                  flexShrink: 0, fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.3px',
                  color: BASE.navy, background: BASE.goldSoft,
                  border: `1px solid ${BASE.gold}`,
                  padding: '3px 8px', borderRadius: '10px',
                }}>FALTA</span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={identAbierta ? BASE.gold : BASE.muted} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: identAbierta ? 'rotate(180deg)' : 'none', transition: 'transform .18s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Cuerpo: los 3 selectores (solo desplegado) */}
            {identAbierta && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>PARTIDA</label>
                    <SelectPremium
                      value={actividadActiva.partida}
                      onChange={v => {
                        onUpdActividad(actividadActiva.id, 'partida', v);
                        // Abrir sola la Subpartida si la partida elegida tiene subpartidas con opciones.
                        if (Object.keys(CATALOGO_MASTER[v] || {}).filter(sp => (CATALOGO_MASTER[v][sp] || []).length > 0).length > 0) {
                          setOpenSubToken(n => n + 1);
                        }
                      }}
                      options={Object.keys(CATALOGO_MASTER)}
                      isMobile={isMobile}
                      title="Partida"
                      fontSize="12px"
                      openOnMount={!actividadActiva.partida}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>SUBPARTIDA</label>
                    <SelectPremium
                      value={actividadActiva.subpartida}
                      onChange={v => {
                        onUpdActividad(actividadActiva.id, 'subpartida', v);
                        // Abrir sola la Actividad si la subpartida elegida tiene opciones.
                        if ((CATALOGO_MASTER[actividadActiva.partida]?.[v] || []).length > 0) {
                          setOpenActToken(n => n + 1);
                        }
                      }}
                      options={subpartidasDisponibles}
                      disabled={!actividadActiva.partida}
                      isMobile={isMobile}
                      title="Subpartida"
                      fontSize="12px"
                      openToken={openSubToken}
                      openOnMount={!!actividadActiva.partida && !actividadActiva.subpartida}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>ACTIVIDAD</label>
                  <SelectPremium
                    value={actividadActiva.actividad}
                    onChange={v => {
                      onUpdActividad(actividadActiva.id, 'actividad', v);
                      // Al elegir la actividad, la sección se pliega y muestra el resumen.
                      setIdentAbierta(false);
                    }}
                    options={actividadesDisponibles}
                    disabled={!actividadActiva.subpartida || actividadesDisponibles.length === 0}
                    isMobile={isMobile}
                    title="Actividad"
                    fontSize="12px"
                    openToken={openActToken}
                    openOnMount={!!actividadActiva.subpartida && !actividadActiva.actividad}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── IDENTIFICACIÓN FIJA (solo en METRADO, viene del tareo) ── */}
        {esMetrado && (
          <div style={{
            background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
            borderRadius: '10px', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: '2px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px' }}>
              ACTIVIDAD DEL TAREO
            </p>
            <p style={{ fontSize: '12px', fontWeight: '700', color: BASE.navy }}>
              {actividadActiva.partida || '—'} › {actividadActiva.subpartida || '—'}
            </p>
          </div>
        )}

        {/* ── METRADO + OBSERVACIONES + FOTOS (solo en METRADO) ── */}
        {esMetrado && (<>
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
        </>)}

        {/* ── TAREO DE PERSONAL (solo en TAREO) — siempre 1 columna ── */}
        {esTareo && (
        <div style={{
          // En móvil el bloque de tareo va A ANCHO COMPLETO: sin marco gris ni padding
          // lateral, y con margen negativo que cancela el padding del editor → las
          // tarjetas (nombre + cuadritos HN/HE) llegan de borde a borde de la pantalla.
          background: isMobile ? 'transparent' : BASE.bgSoft,
          border: isMobile ? 'none' : `1px solid ${BASE.border}`,
          borderRadius: '12px',
          padding: isMobile ? '2px 0 0' : '14px',
          margin: isMobile ? '0 -4px' : 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '10px', flexWrap: 'wrap', gap: '6px',
            padding: isMobile ? '0 4px' : 0,
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
        )}
      </div>
    </div>
  );
}
