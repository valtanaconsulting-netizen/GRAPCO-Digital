// src/components/DatePickerPremium.jsx
//
// Selector de fecha con CALENDARIO PROPIO (no el nativo del navegador, que no se puede
// estilizar). Look GRAPCO: navy + gold, esquinas redondeadas, sobrio y formal.
// FUENTE ÚNICA del calendario premium de TODO el ecosistema (Producción/Planeamiento/
// Calidad/SIGMA). Sin dependencias externas (solo BASE) → se copia tal cual entre apps.
//
// Dos presentaciones del CAMPO, ambas abren el MISMO popover premium:
//   · variant="compact" (def.) → botón tipo «select» (filtros, celdas de tabla).
//   · variant="rich"           → tarjeta con label + badge «Sem. N» + atajo HOY
//                                (formularios prominentes; reemplaza a DateInput).
//
// API:
//   <DatePickerPremium value="YYYY-MM-DD" onChange={(iso)=>...} activo isMobile max min disabled />
//   <DatePickerPremium variant="rich" label="FECHA" getSemana={fn} large value=.. onChange=.. />
//   · value:    cadena ISO (YYYY-MM-DD) o '' .
//   · onChange: recibe la ISO seleccionada, o '' al limpiar.
//   · getSemana(iso) → número de semana (solo variant rich; pinta badge + subtítulo).
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BASE } from '../utils/styles';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS  = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']; // semana inicia lunes (convención local)
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const hoyISO = () => toISO(new Date());
const parseISO = (s) => {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const fmtCorto = (s) => {
  const dt = parseISO(s);
  if (!dt) return '';
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};
// «Lun 29 Jun 2026» — mismo formato que utils/helpers.fmtFecha (inline para no depender de él).
const fmtLargo = (s) => {
  const dt = parseISO(s);
  if (!dt) return '';
  return `${DIAS_CORTO[dt.getDay()]} ${dt.getDate()} ${MESES_CORTO[dt.getMonth()]} ${dt.getFullYear()}`;
};

export default function DatePickerPremium({
  value = '', onChange, activo = false, isMobile = false, max = null, min = null,
  disabled = false, variant = 'compact', label = null, getSemana = null, large = false,
}) {
  const [open, setOpen] = useState(false);
  // Posición del calendario EN COORDENADAS DE PANTALLA. Antes se posicionaba en
  // `absolute` dentro del campo: en la barra lateral del capataz (más estrecha
  // que los 288px del calendario) el contenedor con scroll lo RECORTABA — se
  // perdían la columna del domingo y el botón «Hoy». Ahora se dibuja en una capa
  // propia sobre la página (portal) y se ancla siempre dentro de la pantalla.
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const popRef = useRef(null);
  const rich = variant === 'rich';

  // Mes/año visibles en el calendario: arrancan en el valor seleccionado o en hoy.
  const hoy = new Date();
  const sel = parseISO(value);
  const [cursor, setCursor] = useState(() => new Date((sel || hoy).getFullYear(), (sel || hoy).getMonth(), 1));

  // Calcula dónde dibujar el calendario para que SIEMPRE quepa entero en pantalla:
  // debajo del campo si hay sitio, arriba si no; alineado al campo pero empujado
  // hacia dentro si se saldría por un borde. Si no cabe ni arriba ni abajo, se
  // limita el alto y el calendario hace scroll por dentro.
  const CAL_ANCHO = 288;
  const CAL_ALTO = 372;
  const MARGEN = 8;

  const calcularPos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const width = Math.min(CAL_ANCHO, vw - MARGEN * 2);
    const espacioAbajo = vh - rect.bottom - MARGEN - 6;
    const espacioArriba = rect.top - MARGEN - 6;
    const abajo = espacioAbajo >= CAL_ALTO || espacioAbajo >= espacioArriba;
    const maxHeight = Math.max(240, Math.min(CAL_ALTO, abajo ? espacioAbajo : espacioArriba));

    // Alineado al borde izquierdo del campo; si se sale, se ancla a su derecha;
    // y en cualquier caso nunca sobrepasa los bordes de la pantalla.
    let left = rect.left;
    if (left + width > vw - MARGEN) left = rect.right - width;
    left = Math.min(Math.max(MARGEN, left), Math.max(MARGEN, vw - width - MARGEN));

    const top = abajo
      ? rect.bottom + 6
      : Math.max(MARGEN, rect.top - 6 - maxHeight);

    setPos({ top, left, width, maxHeight });
  }, []);

  // Al abrir: reposiciona el mes en el valor seleccionado y calcula la posición
  // ANTES de pintar (useLayoutEffect) para que no se vea un salto.
  useLayoutEffect(() => {
    if (!open) return;
    const base = parseISO(value) || new Date();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    calcularPos();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras está abierto, seguir al campo si la página o un panel hace scroll,
  // o si cambia el tamaño de la ventana. El `true` captura también el scroll de
  // contenedores internos (la barra lateral del capataz es uno de ellos).
  useEffect(() => {
    if (!open) return;
    const recalcular = () => calcularPos();
    window.addEventListener('scroll', recalcular, true);
    window.addEventListener('resize', recalcular);
    return () => {
      window.removeEventListener('scroll', recalcular, true);
      window.removeEventListener('resize', recalcular);
    };
  }, [open, calcularPos]);

  // Cerrar al hacer click fuera. Se comprueban el campo Y el calendario: al vivir
  // en una capa aparte, el calendario ya no está dentro del campo, y sin esto
  // pulsar «‹ mes anterior» lo cerraría.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const dentroCampo = rootRef.current && rootRef.current.contains(e.target);
      const dentroCal   = popRef.current && popRef.current.contains(e.target);
      if (!dentroCampo && !dentroCal) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayISO = toISO(hoy);
  const maxISO = max || null;
  const minISO = min || null;
  const esHoy = value && value === todayISO;
  const semana = (rich && getSemana && value) ? getSemana(value) : null;

  // Rejilla de 42 celdas (6 semanas), iniciando el lunes anterior al día 1.
  const celdas = useMemo(() => {
    const primero = new Date(year, month, 1);
    let offset = (primero.getDay() + 6) % 7; // 0=lunes
    const inicio = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      return d;
    });
  }, [year, month]);

  const cambiarMes = (delta) => setCursor(new Date(year, month + delta, 1));
  const seleccionar = (d) => {
    const iso = toISO(d);
    if (maxISO && iso > maxISO) return;
    if (minISO && iso < minISO) return;
    onChange?.(iso);
    setOpen(false);
  };
  const abrir = () => { if (!disabled) setOpen(o => !o); };

  // Campo COMPACTO (botón) — mismo lenguaje visual que los selects del dashboard.
  const campoStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box',
    fontSize: '13px', fontWeight: activo ? '700' : '500', cursor: disabled ? 'not-allowed' : 'pointer',
    color: value ? BASE.text : BASE.muted,
    background: disabled ? BASE.bgSoft : BASE.white, textAlign: 'left',
    border: activo ? `1.5px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
    boxShadow: activo ? `0 0 0 3px ${BASE.gold}1f` : 'none',
    outline: 'none', transition: 'all 0.15s ease', opacity: disabled ? 0.6 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
  };

  const navBtn = {
    width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${BASE.border}`,
    background: BASE.white, color: BASE.navy, cursor: 'pointer', fontSize: '15px', fontWeight: '800',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  };

  // ── Disparador del campo ───────────────────────────────────────────────────
  const trigger = rich ? (
    <>
      {(label || getSemana || true) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', minHeight: '18px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.6px' }}>{label}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {semana && (
              <span style={{ fontSize: '10px', fontWeight: '800', color: BASE.navy, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 9px', borderRadius: '20px' }}>
                Sem. {semana}
              </span>
            )}
            {!disabled && !esHoy && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange?.(todayISO); }}
                style={{ fontSize: '11px', fontWeight: '700', color: BASE.green, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '20px', padding: '3px 10px', cursor: 'pointer' }}>
                HOY
              </button>
            )}
            {esHoy && <span style={{ fontSize: '11px', color: BASE.green, fontWeight: '700' }}>✓ Hoy</span>}
          </div>
        </div>
      )}
      <button type="button" onClick={abrir} disabled={disabled} style={{
        width: '100%', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', boxSizing: 'border-box',
        background: large ? BASE.white : '#f8fafc',
        border: `2px solid ${esHoy ? BASE.green : BASE.border}`,
        borderRadius: '10px', padding: large ? '14px 16px' : '10px 14px',
        transition: 'border-color 0.2s', opacity: disabled ? 0.6 : 1,
        boxShadow: esHoy ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: large ? '20px' : '15px', fontWeight: '800', color: BASE.navy, letterSpacing: '-0.3px', margin: 0 }}>
            {value ? fmtLargo(value) : 'Seleccionar fecha...'}
          </p>
          {semana && (
            <p style={{ fontSize: '11px', color: BASE.muted, margin: '2px 0 0' }}>
              Semana {semana} del proyecto
            </p>
          )}
        </div>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>📅</span>
      </button>
    </>
  ) : (
    <button type="button" onClick={abrir} disabled={disabled} style={campoStyle}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value ? fmtCorto(value) : 'dd/mm/aaaa'}
      </span>
      <span style={{ fontSize: '15px', flexShrink: 0, opacity: 0.8 }}>📅</span>
    </button>
  );

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      {trigger}

      {open && pos && createPortal(
        <div ref={popRef} style={{
          position: 'fixed', zIndex: 9999,
          top: `${pos.top}px`, left: `${pos.left}px`, width: `${pos.width}px`,
          maxHeight: `${pos.maxHeight}px`, overflowY: 'auto',
          background: BASE.white, borderRadius: '14px',
          border: `1px solid ${BASE.border}`, borderTop: `3px solid ${BASE.navy}`,
          boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
          padding: '14px', userSelect: 'none', boxSizing: 'border-box',
        }}>
          {/* Cabecera: mes/año + navegación */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button type="button" onClick={() => cambiarMes(-1)} style={navBtn} title="Mes anterior">‹</button>
            <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
              {MESES[month]} {year}
            </span>
            <button type="button" onClick={() => cambiarMes(1)} style={navBtn} title="Mes siguiente">›</button>
          </div>

          {/* Días de la semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DIAS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '800', color: BASE.mutedSoft || BASE.muted, padding: '4px 0', letterSpacing: '0.3px' }}>{d}</div>
            ))}
          </div>

          {/* Rejilla de días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {celdas.map((d, i) => {
              const iso = toISO(d);
              const esMes = d.getMonth() === month;
              const seleccionado = value && iso === value;
              const esDiaHoy = iso === todayISO;
              const deshabilitado = (maxISO && iso > maxISO) || (minISO && iso < minISO);
              return (
                <button key={i} type="button" disabled={deshabilitado}
                  onClick={() => seleccionar(d)}
                  style={{
                    height: '34px', borderRadius: '8px', border: 'none', cursor: deshabilitado ? 'not-allowed' : 'pointer',
                    fontSize: '12.5px', fontFamily: 'var(--grapco-font-mono, monospace)',
                    fontWeight: seleccionado ? '800' : (esDiaHoy ? '800' : '600'),
                    background: seleccionado ? BASE.navy : 'transparent',
                    color: deshabilitado ? '#cbd5e1' : seleccionado ? '#fff' : esMes ? BASE.text : '#cbd5e1',
                    boxShadow: !seleccionado && esDiaHoy ? `inset 0 0 0 1.5px ${BASE.gold}` : 'none',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => { if (!seleccionado && !deshabilitado) e.currentTarget.style.background = BASE.bgSoft; }}
                  onMouseLeave={e => { if (!seleccionado && !deshabilitado) e.currentTarget.style.background = 'transparent'; }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Pie: Limpiar / Hoy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${BASE.border}` }}>
            <button type="button" onClick={() => { onChange?.(''); setOpen(false); }}
              style={{ background: 'transparent', border: 'none', color: BASE.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: '4px 6px' }}>
              Limpiar
            </button>
            <button type="button" onClick={() => seleccionar(hoy)}
              style={{ background: `${BASE.navy}10`, border: `1px solid ${BASE.navy}30`, color: BASE.navy, fontSize: '12px', fontWeight: '800', cursor: 'pointer', padding: '5px 14px', borderRadius: '8px' }}>
              Hoy
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
