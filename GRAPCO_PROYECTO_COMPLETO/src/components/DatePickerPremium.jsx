// src/components/DatePickerPremium.jsx
//
// Selector de fecha con CALENDARIO PROPIO (no el nativo del navegador, que no se puede
// estilizar). Look GRAPCO: navy + gold, esquinas redondeadas, sobrio y formal.
// API: <DatePickerPremium value="YYYY-MM-DD" onChange={(iso)=>...} activo isMobile max min />
//   · value: cadena ISO (YYYY-MM-DD) o '' .
//   · onChange: recibe la ISO seleccionada, o '' al limpiar.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BASE } from '../utils/styles';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS  = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']; // semana inicia lunes (convención local)

const pad = (n) => String(n).padStart(2, '0');
const toISO = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
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

export default function DatePickerPremium({ value = '', onChange, activo = false, isMobile = false, max = null, min = null }) {
  const [open, setOpen] = useState(false);
  // Hacia dónde se abre el popover para no salirse de la pantalla (se calcula al abrir).
  const [placement, setPlacement] = useState({ drop: 'down', align: 'left' });
  const rootRef = useRef(null);

  // Mes/año visibles en el calendario: arrancan en el valor seleccionado o en hoy.
  const hoy = new Date();
  const sel = parseISO(value);
  const [cursor, setCursor] = useState(() => new Date((sel || hoy).getFullYear(), (sel || hoy).getMonth(), 1));

  // Al abrir: reposiciona el mes en el valor seleccionado y decide la dirección de
  // apertura según el espacio disponible (evita que el calendario se tape/recorte).
  useEffect(() => {
    if (!open) return;
    const base = parseISO(value) || new Date();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));

    const el = rootRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const CAL_H = 372;                          // alto aprox. del calendario
      const CAL_W = Math.min(288, vw * 0.9);      // ancho real del popover
      const espacioAbajo = vh - rect.bottom;
      const espacioArriba = rect.top;
      // Si abajo no cabe y arriba hay más sitio, se abre hacia arriba.
      const drop = espacioAbajo < CAL_H + 12 && espacioArriba > espacioAbajo ? 'up' : 'down';
      // Si alineado a la izquierda se sale por la derecha, se ancla a la derecha.
      const align = rect.left + CAL_W > vw - 8 ? 'right' : 'left';
      setPlacement({ drop, align });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
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

  // Campo (botón) — mismo lenguaje visual que los selects del dashboard.
  const campoStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box',
    fontSize: '13px', fontWeight: activo ? '700' : '500', cursor: 'pointer',
    color: value ? BASE.text : BASE.muted,
    background: BASE.white, textAlign: 'left',
    border: activo ? `1.5px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
    boxShadow: activo ? `0 0 0 3px ${BASE.gold}1f` : 'none',
    outline: 'none', transition: 'all 0.15s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
  };

  const navBtn = {
    width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${BASE.border}`,
    background: BASE.white, color: BASE.navy, cursor: 'pointer', fontSize: '15px', fontWeight: '800',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={campoStyle}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? fmtCorto(value) : 'dd/mm/aaaa'}
        </span>
        <span style={{ fontSize: '15px', flexShrink: 0, opacity: 0.8 }}>📅</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 1000,
          ...(placement.drop === 'up' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          ...(placement.align === 'right' ? { right: 0 } : { left: 0 }),
          width: '288px', maxWidth: '90vw',
          background: BASE.white, borderRadius: '14px',
          border: `1px solid ${BASE.border}`, borderTop: `3px solid ${BASE.navy}`,
          boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
          padding: '14px', userSelect: 'none',
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
              const esHoy = iso === todayISO;
              const deshabilitado = (maxISO && iso > maxISO) || (minISO && iso < minISO);
              return (
                <button key={i} type="button" disabled={deshabilitado}
                  onClick={() => seleccionar(d)}
                  style={{
                    height: '34px', borderRadius: '8px', border: 'none', cursor: deshabilitado ? 'not-allowed' : 'pointer',
                    fontSize: '12.5px', fontFamily: 'var(--grapco-font-mono, monospace)',
                    fontWeight: seleccionado ? '800' : (esHoy ? '800' : '600'),
                    background: seleccionado ? BASE.navy : 'transparent',
                    color: deshabilitado ? '#cbd5e1' : seleccionado ? '#fff' : esMes ? BASE.text : '#cbd5e1',
                    boxShadow: !seleccionado && esHoy ? `inset 0 0 0 1.5px ${BASE.gold}` : 'none',
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
        </div>
      )}
    </div>
  );
}
