// src/views/capataz/secciones/SelectorCapataz.jsx
// Selector premium de capataz (reemplaza el <select> nativo, que en móvil se veía
// pobre y con la letra apretada). Muestra un disparador con avatar + nombre legible
// y un panel desplegable con cada capataz como fila (avatar de iniciales + nombre
// en mayúsculas bien espaciado + cantidad de miembros). Buscador si hay muchos.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BASE } from '../../../utils/styles';

// Iniciales: toma la 1ª letra de las 2 primeras palabras (apellido + nombre).
function iniciales(nombre) {
  const ps = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!ps.length) return '–';
  if (ps.length === 1) return ps[0].slice(0, 2).toUpperCase();
  return (ps[0][0] + ps[ps.length - 1][0]).toUpperCase();
}

export default function SelectorCapataz({
  value,
  opciones = [],          // [{ nombre, miembros }] o [string]
  onChange,
  placeholder = 'Seleccione capataz…',
}) {
  const [abierto, setAbierto] = useState(false);
  const [buscar, setBuscar] = useState('');
  const ref = useRef(null);

  // Normaliza opciones a {nombre, miembros}
  const lista = useMemo(() => (opciones || []).map(o =>
    typeof o === 'string' ? { nombre: o, miembros: null } : o
  ), [opciones]);

  const filtradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(o => (o.nombre || '').toLowerCase().includes(q));
  }, [lista, buscar]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [abierto]);

  const elegir = (nombre) => {
    onChange?.(nombre);
    setAbierto(false);
    setBuscar('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Disparador */}
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '11px',
          padding: '11px 12px',
          background: value
            ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`
            : BASE.white,
          border: value ? '1.5px solid transparent' : `1.5px solid ${BASE.border}`,
          borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
          boxShadow: value ? `0 6px 18px ${BASE.navy}44` : BASE.shadowSm,
          transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: value ? `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})` : BASE.bgSoft,
          color: value ? BASE.navy : BASE.mutedSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '900', letterSpacing: '0.5px',
          boxShadow: value ? `0 2px 8px ${BASE.gold}55` : 'none',
        }}>{value ? iniciales(value) : '👷'}</span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: '9px', fontWeight: '800', letterSpacing: '1px',
            color: value ? BASE.gold : BASE.mutedSoft, marginBottom: '2px',
          }}>{value ? 'CAPATAZ DEL DÍA' : 'ELEGIR CAPATAZ'}</span>
          <span style={{
            display: 'block',
            fontSize: '13.5px', fontWeight: '800',
            color: value ? '#fff' : BASE.muted,
            lineHeight: 1.2, letterSpacing: '0.3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{value || placeholder}</span>
        </span>

        <span style={{
          flexShrink: 0, fontSize: '12px',
          color: value ? 'rgba(255,255,255,0.7)' : BASE.muted,
          transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s',
        }}>▾</span>
      </button>

      {/* Panel */}
      {abierto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: BASE.white, borderRadius: '12px',
          border: `1px solid ${BASE.border}`, boxShadow: BASE.shadowLg,
          zIndex: 200, overflow: 'hidden',
        }}>
          {lista.length > 6 && (
            <div style={{ padding: '8px', borderBottom: `1px solid ${BASE.border}` }}>
              <input
                autoFocus
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
                placeholder="Buscar capataz…"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: `1px solid ${BASE.border}`, fontSize: '12px',
                  outline: 'none', boxSizing: 'border-box', background: BASE.bgSoft,
                }}
              />
            </div>
          )}
          <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px' }}>
            {filtradas.length === 0 && (
              <p style={{ padding: '18px', textAlign: 'center', fontSize: '12px', color: BASE.muted, fontStyle: 'italic' }}>
                Sin capataces que coincidan
              </p>
            )}
            {filtradas.map((o) => {
              const activo = o.nombre === value;
              return (
                <button
                  key={o.nombre}
                  type="button"
                  onClick={() => elegir(o.nombre)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '11px',
                    padding: '10px 10px', borderRadius: '10px', cursor: 'pointer',
                    textAlign: 'left', border: 'none',
                    background: activo ? BASE.navySoft : 'transparent',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!activo) e.currentTarget.style.background = BASE.bgSoft; }}
                  onMouseLeave={e => { if (!activo) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: activo ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : BASE.bgSoft,
                    color: activo ? '#fff' : BASE.navy,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px',
                    border: activo ? 'none' : `1px solid ${BASE.border}`,
                  }}>{iniciales(o.nombre)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: '13px', fontWeight: activo ? '900' : '700',
                      color: BASE.text, lineHeight: 1.25, letterSpacing: '0.2px',
                      wordBreak: 'break-word',
                    }}>{o.nombre}</span>
                    {Number.isFinite(o.miembros) && (
                      <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>
                        👥 {o.miembros} en cuadrilla
                      </span>
                    )}
                  </span>
                  {activo && <span style={{ flexShrink: 0, color: BASE.green, fontSize: '15px', fontWeight: '900' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
