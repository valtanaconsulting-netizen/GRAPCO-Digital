// src/components/SelectPremium.jsx
// Selector premium reutilizable — reemplaza al <select> nativo (que en Android
// abre una lista a pantalla completa con estética del sistema, fuera de marca).
//
//   • Móvil  → bottom-sheet deslizable desde abajo (no ocupa toda la pantalla).
//   • Desktop→ dropdown anclado bajo el campo, con scroll interno.
//   • Paleta BASE (navy/gold/claro), buscador automático si hay muchas opciones.
//
// API:  <SelectPremium value onChange options placeholder disabled isMobile title />
//   options: array de strings  ó  array de { value, label, sub? }
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BASE } from '../utils/styles';

const normalizar = (opts) => (opts || []).map(o =>
  (typeof o === 'string' || typeof o === 'number')
    ? { value: String(o), label: String(o) }
    : { value: o.value, label: o.label ?? String(o.value), sub: o.sub }
);

const Chevron = ({ color, abierto }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .18s', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BASE.gold}
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function SelectPremium({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  disabled = false,
  isMobile = false,
  title,
  fontSize = '13px',
  searchable,            // forzar buscador; por defecto auto (> 7 opciones)
}) {
  const opciones = useMemo(() => normalizar(options), [options]);
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState(null);   // posición del dropdown (desktop)
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const seleccion = opciones.find(o => o.value === value) || null;
  const conBuscador = searchable ?? (opciones.length > 7);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opciones;
    return opciones.filter(o => o.label.toLowerCase().includes(q));
  }, [opciones, query]);

  const calcularCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const abajo = vh - r.bottom;
    const arriba = r.top;
    const haciaArriba = abajo < 260 && arriba > abajo;
    const maxH = Math.min(320, Math.max(150, (haciaArriba ? arriba : abajo) - 16));
    setCoords({
      left: r.left,
      width: r.width,
      top: haciaArriba ? null : r.bottom + 6,
      bottom: haciaArriba ? (vh - r.top + 6) : null,
      maxH,
    });
  };

  const abrir = () => {
    if (disabled) return;
    setQuery('');
    if (!isMobile) calcularCoords();
    setAbierto(true);
  };
  const cerrar = () => setAbierto(false);
  const elegir = (v) => { onChange?.(v); setAbierto(false); };

  // ESC + bloqueo de scroll del body mientras está abierto
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto]);

  // Reposicionar (scroll de un contenedor interno) / cerrar al redimensionar — solo desktop
  useEffect(() => {
    if (!abierto || isMobile) return;
    const onScroll = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      calcularCoords();
    };
    const onResize = () => setAbierto(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [abierto, isMobile]);

  // ── Interior compartido (buscador + lista) ──
  const Interior = (
    <>
      {conBuscador && (
        <div style={{
          padding: '10px', borderBottom: `1px solid ${BASE.border}`,
          background: '#fff', flexShrink: 0,
        }}>
          <input
            autoFocus={!isMobile}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar…"
            style={{
              width: '100%', padding: '9px 11px', boxSizing: 'border-box',
              border: `1px solid ${BASE.border}`, borderRadius: '8px',
              fontSize: '13px', color: BASE.text, background: BASE.bgSoft,
              outline: 'none', fontFamily: BASE.font,
            }}
          />
        </div>
      )}
      <div role="listbox" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '6px' }}>
        {filtradas.length === 0 ? (
          <div style={{ padding: '22px', textAlign: 'center', color: BASE.muted, fontSize: '12.5px', fontStyle: 'italic' }}>
            Sin resultados
          </div>
        ) : filtradas.map(o => {
          const sel = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={sel}
              onClick={() => elegir(o.value)}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = BASE.bg; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
              style={{
                width: '100%', boxSizing: 'border-box', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                padding: isMobile ? '13px 14px' : '9px 12px',
                marginBottom: '2px',
                border: 'none', borderRadius: '9px',
                background: sel ? BASE.goldSoft : 'transparent',
                color: sel ? BASE.navy : BASE.text,
                fontSize: isMobile ? '14px' : '13px',
                fontWeight: sel ? 800 : 600,
                fontFamily: BASE.font, cursor: 'pointer',
                lineHeight: 1.3,
              }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {o.label}
                {o.sub && (
                  <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 500, color: BASE.muted, marginTop: '2px' }}>{o.sub}</span>
                )}
              </span>
              {sel && <Check />}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* TRIGGER */}
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (abierto ? cerrar() : abrir())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        style={{
          width: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          padding: '10px 12px', borderRadius: '8px',
          border: `1.5px solid ${abierto ? BASE.gold : '#e2e8f0'}`,
          background: disabled ? '#eef1f5' : '#f8fafc',
          color: seleccion ? BASE.text : BASE.mutedSoft,
          fontSize, fontWeight: seleccion ? 700 : 500,
          fontFamily: BASE.font, textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none', opacity: disabled ? 0.65 : 1,
          boxShadow: abierto ? BASE.shadowFocus : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seleccion ? seleccion.label : placeholder}
        </span>
        <Chevron color={abierto ? BASE.gold : BASE.muted} abierto={abierto} />
      </button>

      {/* DROPDOWN ANCLADO (desktop) */}
      {abierto && !isMobile && coords && createPortal(
        <>
          <div onClick={cerrar} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'transparent' }} />
          <div
            ref={panelRef}
            style={{
              position: 'fixed', left: coords.left, width: coords.width,
              top: coords.top ?? undefined, bottom: coords.bottom ?? undefined,
              maxHeight: coords.maxH, zIndex: 99999,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              background: '#fff', border: `1px solid ${BASE.border}`, borderRadius: '12px',
              boxShadow: BASE.shadowLg,
              animation: 'grapco-pop-in 0.16s cubic-bezier(0.16,1,0.3,1)',
            }}>
            {Interior}
          </div>
        </>,
        document.body
      )}

      {/* BOTTOM-SHEET (móvil) */}
      {abierto && isMobile && createPortal(
        <div
          role="presentation"
          onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            animation: 'grapco-fade-in 0.18s ease-out',
          }}>
          <div style={{
            background: '#fff',
            borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
            maxHeight: '72dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 -12px 40px rgba(15,23,42,0.25)',
            animation: 'gp-sheet-up 0.26s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* asa */}
            <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: '40px', height: '4px', borderRadius: '3px', background: BASE.border }} />
            </div>
            {/* cabecera */}
            <div style={{
              padding: '6px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${BASE.border}`, flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: BASE.navy, letterSpacing: '0.3px' }}>
                {title || 'Seleccionar'}
              </span>
              <button type="button" onClick={cerrar} style={{
                width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                background: BASE.bg, color: BASE.muted, fontSize: '15px', cursor: 'pointer', flexShrink: 0,
              }}>✕</button>
            </div>
            {Interior}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
