// src/views/capataz/secciones/EditorActividad.jsx
// Editor de la actividad activa, con DOS modos según el paso del capataz:
//   modo="tareo"   → identificación (partida/subpartida/actividad) + HN/HE por
//                    trabajador (incluye "Importar HH desde Marcador Facial").
//   modo="metrado" → identificación en SOLO LECTURA (ya viene del tareo) +
//                    metrado avanzado + observaciones + fotos del avance.
// El modelo de datos es el mismo `actividad`; solo cambia qué secciones se ven.
import React, { useState, useDeferredValue } from 'react';
import { BASE, inp } from '../../../utils/styles';
import { CATALOGO_MASTER, INFO_MAP, rangoCargo } from '../../../utils/constants';
import FotoUploader from '../../../components/FotoUploader';
import SelectPremium from '../../../components/SelectPremium';
import Modal from '../../../components/Modal';
import TrabajadorCard from './TrabajadorCard';

export default function EditorActividad({
  actividadActiva,
  isMobile,
  buscarTrab,
  onBuscarTrab = null,
  limiteHN,
  importandoFacial,
  fecha,
  showToast,
  hhAcumPorTrab,
  onUpdActividad,
  onImportarFacial,
  onUpdTareo,
  modo = 'tareo',
  // Contador que sube cada vez que el capataz toca la tarjeta azul de una
  // actividad ya activa: es la señal para abrir los selectores y cambiarla.
  abrirSelectorToken = 0,
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
  // La sección Partida/Subpartida/Actividad se abre SOLA cuando la actividad aún
  // no está definida: al pulsar «Agregar otra actividad» y tocar la tarjeta «Sin
  // definir», el capataz cae directamente en los selectores de partida →
  // subpartida → actividad. Antes hacían falta dos toques (la tarjeta y luego
  // esta cabecera), y el segundo no se adivinaba.
  // Si la actividad YA está definida, la sección arranca plegada: ahí la
  // cabecera solo sirve para cambiarla, y el nombre ya se ve en la tarjeta.
  // Capataz.jsx monta este editor con `key={actividadActiva.id}`, así que el
  // estado inicial se recalcula al cambiar de actividad. Sin efectos.
  // Arranca CERRADO siempre: el diálogo solo se abre cuando el capataz toca la
  // tarjeta azul. Nada de selectores ocupando la pantalla por su cuenta.
  const [identAbierta, setIdentAbierta] = useState(false);
  // Abrir los selectores cuando el capataz vuelve a tocar la tarjeta ya activa.
  // Se ajusta durante el render comparando el token con el último visto (patrón
  // de React para reaccionar a un cambio de props) en lugar de un efecto, que
  // provocaría un render extra.
  const [tokenVisto, setTokenVisto] = useState(abrirSelectorToken);
  if (tokenVisto !== abrirSelectorToken) {
    setTokenVisto(abrirSelectorToken);
    setIdentAbierta(true);
  }
  // CATÁLOGO COMPLETO. Antes, si el capataz tenía plan asignado, los selectores
  // se limitaban a las actividades de ese plan; ahora las del plan no se tocan
  // (no son editables) y las que él añade a mano pueden ser CUALQUIER partida:
  // en obra aparece trabajo no programado y hay que poder registrarlo.
  // Solo se descartan las subpartidas vacías del catálogo (p. ej. "DISEÑO": []),
  // que dejarían la actividad sin poder completarse y bloquearían la subida.
  // `conActual` conserva SIEMPRE la selección ya guardada aunque no esté en la
  // lista, para no dejar el selector con un valor huérfano.
  const conActual = (lista, actual) => (actual && !lista.includes(actual)) ? [actual, ...lista] : lista;
  const partidaOptions = Object.keys(CATALOGO_MASTER);
  const subpartidasDisponibles = actividadActiva.partida
    ? conActual(Object.keys(CATALOGO_MASTER[actividadActiva.partida] || {})
        .filter(sp => (CATALOGO_MASTER[actividadActiva.partida][sp] || []).length > 0), actividadActiva.subpartida)
    : [];
  const actividadesDisponibles = (actividadActiva.partida && actividadActiva.subpartida)
    ? conActual(CATALOGO_MASTER[actividadActiva.partida]?.[actividadActiva.subpartida] || [], actividadActiva.actividad)
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
            Partida, Subpartida y Actividad YA NO OCUPAN SITIO EN LA PANTALLA:
            salen en un diálogo que se abre al tocar la tarjeta azul de la
            actividad. Las que vienen del Plan Diario no lo abren: las programó
            el ingeniero y no se cambian.
            La cadena se mantiene: al elegir Partida se abre sola Subpartida, y
            luego Actividad; al elegir Actividad el diálogo se cierra solo. */}
        {esTareo && identAbierta && (
          <Modal title="Elegir actividad" onClose={() => setIdentAbierta(false)} maxW="520px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  fontSize="13px"
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
                  fontSize="13px"
                  openToken={openSubToken}
                  openOnMount={!!actividadActiva.partida && !actividadActiva.subpartida}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>ACTIVIDAD</label>
                <SelectPremium
                  value={actividadActiva.actividad}
                  onChange={v => {
                    onUpdActividad(actividadActiva.id, 'actividad', v);
                    // Elegida la actividad, el diálogo ya cumplió: se cierra.
                    setIdentAbierta(false);
                  }}
                  options={actividadesDisponibles}
                  disabled={!actividadActiva.subpartida || actividadesDisponibles.length === 0}
                  isMobile={isMobile}
                  title="Actividad"
                  fontSize="13px"
                  openToken={openActToken}
                  openOnMount={!!actividadActiva.subpartida && !actividadActiva.actividad}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* La ficha «ESTÁS METRANDO» se retiró: repetía el nombre de la actividad
            que ya se lee en su tarjeta, justo encima, y ocupaba media pantalla
            en el móvil. La unidad y el metrado contractual siguen a la vista en
            la propia caja del metrado («METRADO AVANZADO EN <unidad>»). */}

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
          {/* Encima de la lista va SOLO el buscador. Se quitaron el rótulo
              «TAREO DE PERSONAL» (las tarjetas de abajo ya llevan nombre y cargo)
              y la píldora de jornada: ese mismo aviso —«Domingo · solo HE» o el
              tope de HN— ya sale dentro de la tarjeta de cada trabajador, que es
              donde se escriben las horas. Aquí solo era ruido repetido. */}

          {/* Buscador de trabajador, JUNTO a la lista que filtra. En el móvil el
              buscador del panel lateral queda detrás del botón «Opciones»: con
              una cuadrilla de 8 personas había que abrir el cajón para buscar a
              uno. Aquí está a la vista, sobre la propia lista. En escritorio el
              panel lateral ya lo tiene siempre visible, así que no se duplica. */}
          {isMobile && onBuscarTrab && actividadActiva.detalleTareo.length > 4 && (
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              {/* Posición fija, no centrada al 50%: bajo el campo puede aparecer
                  el recuento de coincidencias y el centro del contenedor cambia. */}
              <span style={{
                position: 'absolute', left: '11px', top: '12px',
                fontSize: '13px', opacity: 0.55, pointerEvents: 'none',
              }}>🔎</span>
              <input
                type="text"
                value={buscarTrab}
                onChange={e => onBuscarTrab(e.target.value)}
                placeholder="Buscar trabajador..."
                aria-label="Buscar trabajador en la cuadrilla"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 34px 10px 32px', borderRadius: '10px',
                  border: `1.5px solid ${buscarTrab ? BASE.gold : BASE.border}`,
                  background: buscarTrab ? BASE.goldSoft : BASE.white,
                  fontSize: '13px', fontWeight: 600, color: BASE.text,
                  fontFamily: BASE.font, outline: 'none',
                }}
              />
              {buscarTrab && (
                <button
                  type="button"
                  onClick={() => onBuscarTrab('')}
                  aria-label="Limpiar búsqueda"
                  style={{
                    position: 'absolute', right: '6px', top: '9px',
                    width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                    background: 'transparent', color: BASE.muted, cursor: 'pointer',
                    fontSize: '15px', lineHeight: 1,
                  }}>×</button>
              )}
              {/* Cuántos coinciden — solo mientras se busca. */}
              {buscarTrab.trim() && (
                <p style={{ margin: '5px 0 0 2px', fontSize: '10.5px', fontWeight: 700, color: BASE.muted }}>
                  {actividadActiva.detalleTareo.filter(t => (t.nombre || '').toLowerCase().includes(buscarTrabDiferido.trim().toLowerCase())).length}
                  {' de '}{actividadActiva.detalleTareo.length} trabajadores
                </p>
              )}
            </div>
          )}

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
