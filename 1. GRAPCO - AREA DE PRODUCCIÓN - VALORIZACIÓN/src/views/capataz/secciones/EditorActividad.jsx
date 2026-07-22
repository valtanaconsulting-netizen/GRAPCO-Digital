// src/views/capataz/secciones/EditorActividad.jsx
// Editor de la actividad activa, con DOS modos según el paso del capataz:
//   modo="tareo"   → identificación (partida/subpartida/actividad) + HN/HE por
//                    trabajador (incluye "Importar HH desde Marcador Facial").
//   modo="metrado" → identificación en SOLO LECTURA (ya viene del tareo) +
//                    metrado avanzado + observaciones + fotos del avance.
// El modelo de datos es el mismo `actividad`; solo cambia qué secciones se ven.
import React, { useState, useDeferredValue } from 'react';
import { BASE, inp } from '../../../utils/styles';
import { CATALOGO_MASTER, INFO_MAP, JORNADA_LEGAL, JORNADA_HORARIO, rangoCargo } from '../../../utils/constants';
import { normalizeText } from '../../../utils/helpers';
import FotoUploader from '../../../components/FotoUploader';
import SelectPremium from '../../../components/SelectPremium';
import TrabajadorCard from './TrabajadorCard';

export default function EditorActividad({
  actividadActiva,
  isMobile,
  buscarTrab,
  limiteHN,
  importandoFacial,
  fecha,
  showToast,
  hhAcumPorTrab,
  onUpdActividad,
  onImportarFacial,
  onUpdTareo,
  modo = 'tareo',
  actividadesPermitidas = null,
}) {
  const esTareo = modo === 'tareo';
  const esMetrado = modo === 'metrado';
  // Unidad y metrado contractual salen del catálogo por el nombre de la actividad;
  // al capataz no se le vuelve a preguntar qué mide ni en qué unidad. `unidad` ya
  // viene resuelta desde el tareo (Capataz.updActividad), y el catálogo es el
  // respaldo si ese registro es antiguo y no la trae.
  const infoActiva = INFO_MAP[String(actividadActiva.actividad || '').trim().toUpperCase()] || {};
  const unidadActiva = actividadActiva.unidad || infoActiva.un || '';
  // Búsqueda diferida: el input (controlado en Capataz) sigue respondiendo al
  // instante; el filtrado de la cuadrilla se recalcula con baja prioridad → sin
  // lag de teclado en cuadrillas grandes (móvil de obra).
  const buscarTrabDiferido = useDeferredValue(buscarTrab);
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
  // Gating por plan diario: si el capataz tiene actividades asignadas hoy, los
  // selectores se limitan a esas; sin asignación, el catálogo completo.
  const gated = !!(actividadesPermitidas && actividadesPermitidas.size);
  const permite = (act) => !gated || actividadesPermitidas.has(normalizeText(act));
  // Conserva SIEMPRE la selección actual del capataz aunque el gating llegue a media
  // sesión (borrador previo), para no dejar el selector con un valor huérfano.
  const conActual = (lista, actual) => (actual && !lista.includes(actual)) ? [actual, ...lista] : lista;
  const partidaOptions = gated
    ? conActual(Object.keys(CATALOGO_MASTER).filter(pt => Object.values(CATALOGO_MASTER[pt] || {}).some(acts => (acts || []).some(permite))), actividadActiva.partida)
    : Object.keys(CATALOGO_MASTER);
  const subpartidasDisponibles = actividadActiva.partida
    ? conActual(Object.keys(CATALOGO_MASTER[actividadActiva.partida] || {})
        .filter(sp => (CATALOGO_MASTER[actividadActiva.partida][sp] || []).some(permite)), actividadActiva.subpartida)
    : [];
  const actividadesDisponibles = (actividadActiva.partida && actividadActiva.subpartida)
    ? conActual((CATALOGO_MASTER[actividadActiva.partida]?.[actividadActiva.subpartida] || []).filter(permite), actividadActiva.actividad)
    : [];
  return (
    <div style={{
      background: BASE.white, borderRadius: '14px',
      border: `1px solid ${BASE.border}`,
      padding: isMobile ? '14px 12px' : '20px',
      marginBottom: '14px',
      boxShadow: BASE.shadowSm,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: isMobile ? '9px 11px' : '10px 13px',
                borderRadius: '12px',
                border: `1.5px solid ${identAbierta ? BASE.gold : BASE.border}`,
                background: identAbierta ? BASE.goldSoft : BASE.bgSoft,
                boxShadow: identAbierta ? BASE.shadowFocus : 'none',
                cursor: 'pointer', fontFamily: BASE.font,
                transition: 'border-color .15s, background .15s, box-shadow .15s',
              }}
            >
              <span style={{ fontSize: '14px', flexShrink: 0 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.6px' }}>
                  ACTIVIDAD
                </span>
                <span style={{
                  display: 'block', marginTop: '1px',
                  fontSize: '11.5px',
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
                      options={partidaOptions}
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

        {/* ── IDENTIFICACIÓN FIJA (solo en METRADO, viene del tareo) ──
            El capataz NO elige aquí qué metrar: ya quedó fijado en el tareo. Esta
            ficha responde "¿qué estoy midiendo?" sin preguntarlo, así que muestra
            la ACTIVIDAD completa (el elemento concreto), no solo su ruta, más la
            unidad y el metrado contractual como referencia de formato. */}
        {esMetrado && (
          <div style={{
            background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
            borderRadius: '10px', padding: '11px 13px',
            display: 'flex', flexDirection: 'column', gap: '5px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px' }}>
              ESTÁS METRANDO
            </p>
            {/* El elemento concreto: es el dato que identifica qué se mide. */}
            <p style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy, lineHeight: 1.3 }}>
              {actividadActiva.actividad || 'Actividad sin definir'}
            </p>
            {/* Ruta de la WBS en segundo plano: ubica sin competir con el elemento. */}
            <p style={{ fontSize: '11px', fontWeight: '600', color: BASE.mutedSoft, lineHeight: 1.35 }}>
              {actividadActiva.partida || '—'} › {actividadActiva.subpartida || '—'}
            </p>
            {(unidadActiva || infoActiva.metP > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                {unidadActiva && (
                  <span style={{
                    fontSize: '10px', fontWeight: '800', letterSpacing: '0.3px',
                    color: BASE.navy, background: BASE.navySoft,
                    padding: '3px 9px', borderRadius: '999px',
                  }}>
                    Se mide en {unidadActiva}
                  </span>
                )}
                {infoActiva.metP > 0 && (
                  <span style={{
                    fontSize: '10px', fontWeight: '700',
                    color: BASE.muted, background: BASE.white,
                    border: `1px solid ${BASE.border}`,
                    padding: '3px 9px', borderRadius: '999px',
                  }}>
                    Contractual: {infoActiva.metP.toLocaleString('es-PE')} {unidadActiva}
                  </span>
                )}
              </div>
            )}
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
            📏 METRADO AVANZADO EN {unidadActiva || 'UND'} · 3 DECIMALES
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
          // En móvil el bloque de tareo se separa de los selectores con una línea
          // divisoria arriba (se lee como su propio grupo) y respira con paddingTop;
          // las tarjetas quedan ligeramente embutidas, no pegadas al borde.
          background: isMobile ? 'transparent' : BASE.bgSoft,
          border: isMobile ? 'none' : `1px solid ${BASE.border}`,
          borderTop: isMobile ? `1px solid ${BASE.border}` : undefined,
          borderRadius: isMobile ? 0 : '12px',
          padding: isMobile ? '20px 0 0' : '14px',
          margin: 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px', flexWrap: 'wrap', gap: '6px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.6px', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              👷 TAREO DE PERSONAL
              <span style={{
                fontSize: '9px', fontWeight: '800', color: BASE.navy,
                background: BASE.navySoft, padding: '2px 8px', borderRadius: '999px',
              }}>
                {(() => {
                  const q = buscarTrabDiferido.trim().toLowerCase();
                  const tot = actividadActiva.detalleTareo.length;
                  if (!q) return tot;
                  const f = actividadActiva.detalleTareo.filter(t => (t.nombre || '').toLowerCase().includes(q)).length;
                  return `${f} de ${tot}`;
                })()}
              </span>
            </p>
            <span style={{
              fontSize: '9px', fontWeight: '700',
              color: limiteHN <= 0 ? BASE.goldDark : BASE.muted,
              background: limiteHN <= 0 ? BASE.goldSoft : BASE.bgSoft,
              border: `1px solid ${limiteHN <= 0 ? BASE.gold + '55' : BASE.border}`,
              padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap',
            }}>
              {limiteHN <= 0
                ? '🟡 Domingo · solo HE'
                /* En jornada completa se muestra el horario del que sale el tope:
                   07:30–17:00 menos 1 h de refrigerio = 8.5 h. El sábado es media
                   jornada y no le corresponde ese horario. */
                : limiteHN === JORNADA_LEGAL
                  ? `${JORNADA_HORARIO} · tope HN ${limiteHN}h · luego HE`
                  : `Media jornada · tope HN ${limiteHN}h · luego HE`}
            </span>
          </div>

          {(() => {
            const q = buscarTrabDiferido.trim().toLowerCase();
            const base = q
              ? actividadActiva.detalleTareo.filter(t => (t.nombre || '').toLowerCase().includes(q))
              : actividadActiva.detalleTareo;
            // Mismo orden que el tareo en papel: Capataz → Operario → Oficial →
            // Ayudante → Peón, y alfabético dentro de cada cargo. Copia antes de
            // ordenar: `detalleTareo` es estado y no se muta.
            const lista = [...base].sort((a, b) =>
              rangoCargo(a.cargo) - rangoCargo(b.cargo) ||
              String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lista.map((t, i) => (
                  <TrabajadorCard
                    key={t.nombre}
                    t={t}
                    idx={i}
                    isMobile={isMobile}
                    acumHN={hhAcumPorTrab[t.nombre]?.hn || 0}
                    acumHE={hhAcumPorTrab[t.nombre]?.he || 0}
                    limiteHN={limiteHN}
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
