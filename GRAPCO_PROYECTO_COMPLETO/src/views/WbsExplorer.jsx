// src/components/WbsExplorer.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CATALOGO_MASTER, INFO_MAP } from '../utils/constants';
import { BASE } from '../utils/styles';
import {
  codigoPartida,
  codigoSubpartida,
  codigoActividad,
  normalizeText,
} from '../utils/helpers';

const busquedaCoincide = (texto, query) => {
  if (!query) return true;
  return normalizeText(texto).includes(normalizeText(query));
};

const CATALOGO_ENRIQUECIDO = Object.keys(CATALOGO_MASTER).map((partida) => ({
  partida,
  codigo: codigoPartida(partida),
  subpartidas: Object.keys(CATALOGO_MASTER[partida]).map((subpartida) => ({
    subpartida,
    codigo: codigoSubpartida(partida, subpartida),
    actividades: (CATALOGO_MASTER[partida][subpartida] || []).map((actividad) => {
      const info = INFO_MAP?.[actividad.trim().toUpperCase()] || {};
      return {
        actividad,
        codigo: codigoActividad(partida, subpartida, actividad),
        unidad: info.un || 'UND',
        ipMeta: info.ipM ?? null,
      };
    }),
  })),
}));

export default function WbsExplorer({ onClose, onSelect, isMobile }) {
  const [query,      setQuery]      = useState('');
  const [expandidos, setExpandidos] = useState(() => {
    const map = {};
    CATALOGO_ENRIQUECIDO.forEach(p => {
      map[`P:${p.partida}`] = true;
      p.subpartidas.forEach(sp => {
        map[`SP:${p.partida}|${sp.subpartida}`] = true;
      });
    });
    return map;
  });
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggle = (key) =>
    setExpandidos(prev => ({ ...prev, [key]: !prev[key] }));

  const expandirTodo = () => {
    const map = {};
    CATALOGO_ENRIQUECIDO.forEach(p => {
      map[`P:${p.partida}`] = true;
      p.subpartidas.forEach(sp => {
        map[`SP:${p.partida}|${sp.subpartida}`] = true;
      });
    });
    setExpandidos(map);
  };

  const colapsarTodo = () => setExpandidos({});

  const catalogoFiltrado = useMemo(() => {
    if (!query.trim()) return CATALOGO_ENRIQUECIDO;
    return CATALOGO_ENRIQUECIDO.map(p => {
      const matchP = busquedaCoincide(p.partida, query);
      const subsFiltradas = p.subpartidas.map(sp => {
        const matchSP = busquedaCoincide(sp.subpartida, query);
        const actsFiltradas = sp.actividades.filter(
          a => busquedaCoincide(a.actividad, query) || busquedaCoincide(a.codigo, query)
        );
        if (matchSP || actsFiltradas.length > 0)
          return { ...sp, actividades: matchSP ? sp.actividades : actsFiltradas };
        return null;
      }).filter(Boolean);
      if (matchP || subsFiltradas.length > 0)
        return { ...p, subpartidas: matchP ? p.subpartidas : subsFiltradas };
      return null;
    }).filter(Boolean);
  }, [query]);

  const estaExpandido = (key) => query.trim() ? true : !!expandidos[key];

  const totalActividades = useMemo(() =>
    catalogoFiltrado.reduce((s, p) =>
      s + p.subpartidas.reduce((s2, sp) => s2 + sp.actividades.length, 0), 0),
    [catalogoFiltrado]
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '620px',
        maxHeight: isMobile ? '92dvh' : '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>

        {/* HEADER */}
        <div style={{
          background: BASE.navy, padding: '16px 18px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#fff', margin: 0 }}>
              📚 CATÁLOGO DE PARTIDAS WBS
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
              {totalActividades} actividades · click para seleccionar
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            width: '34px', height: '34px', borderRadius: '8px',
            border: 'none', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* BÚSQUEDA */}
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BASE.border}`, flexShrink: 0 }}>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍  Buscar actividad, partida o código..."
            style={{
              width: '100%', padding: '10px 14px',
              border: `1.5px solid ${BASE.border}`,
              borderRadius: '10px', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box',
              background: '#f8fafc', fontFamily: BASE.font,
            }}
          />
        </div>

        {/* TOOLBAR */}
        {!query.trim() && (
          <div style={{
            padding: '8px 14px',
            display: 'flex', gap: '8px', alignItems: 'center',
            borderBottom: `1px solid ${BASE.border}`,
            flexShrink: 0, background: '#f8fafc',
          }}>
            <button type="button" onClick={expandirTodo} style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: '700',
              border: `1px solid ${BASE.border}`, borderRadius: '7px',
              cursor: 'pointer', background: '#fff', color: BASE.muted,
            }}>▼ Expandir todo</button>
            <button type="button" onClick={colapsarTodo} style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: '700',
              border: `1px solid ${BASE.border}`, borderRadius: '7px',
              cursor: 'pointer', background: '#fff', color: BASE.muted,
            }}>▶ Colapsar todo</button>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: BASE.muted }}>
              {CATALOGO_ENRIQUECIDO.length} partidas
            </span>
          </div>
        )}

        {/* CUERPO */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {catalogoFiltrado.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: BASE.muted }}>
              <p style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</p>
              <p style={{ fontWeight: '700', color: BASE.navy }}>Sin resultados para "{query}"</p>
              <p style={{ marginTop: '4px', fontSize: '12px' }}>Prueba con otras palabras clave</p>
            </div>
          ) : (
            catalogoFiltrado.map((p) => {
              const keyP = `P:${p.partida}`;
              const openP = estaExpandido(keyP);
              return (
                <div key={p.partida}>
                  {/* PARTIDA */}
                  <div
                    onClick={() => { if (!query.trim()) toggle(keyP); }}
                    style={{
                      padding: '11px 16px', background: BASE.navy,
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '10px',
                      userSelect: 'none', position: 'sticky', top: 0, zIndex: 2,
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                      {openP ? '▼' : '▶'}
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: '800',
                      background: 'rgba(255,255,255,0.18)', color: '#fff',
                      padding: '1px 7px', borderRadius: '4px',
                      fontFamily: 'monospace', flexShrink: 0,
                    }}>{p.codigo}</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', flex: 1 }}>
                      {p.partida}
                    </span>
                    <span style={{
                      fontSize: '10px', color: 'rgba(255,255,255,0.55)',
                      background: 'rgba(255,255,255,0.12)',
                      padding: '2px 8px', borderRadius: '10px', flexShrink: 0,
                    }}>
                      {p.subpartidas.reduce((s, sp) => s + sp.actividades.length, 0)} act.
                    </span>
                  </div>

                  {/* SUBPARTIDAS */}
                  {openP && p.subpartidas.map((sp) => {
                    const keySP = `SP:${p.partida}|${sp.subpartida}`;
                    const openSP = estaExpandido(keySP);
                    return (
                      <div key={sp.subpartida}>
                        {/* SUBPARTIDA */}
                        <div
                          onClick={() => { if (!query.trim()) toggle(keySP); }}
                          style={{
                            padding: '9px 16px 9px 28px',
                            background: '#dbeafe', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            userSelect: 'none', borderBottom: '1px solid #bfdbfe',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#1d4ed8', flexShrink: 0 }}>
                            {openSP ? '▼' : '▶'}
                          </span>
                          <span style={{
                            fontSize: '10px', fontWeight: '700', color: '#1d4ed8',
                            fontFamily: 'monospace', background: '#bfdbfe',
                            padding: '1px 6px', borderRadius: '3px', flexShrink: 0,
                          }}>{sp.codigo}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e3a5f', flex: 1 }}>
                            {sp.subpartida}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
                            {sp.actividades.length}
                          </span>
                        </div>

                        {/* ACTIVIDADES */}
                        {openSP && sp.actividades.map((a, ai) => {
                          const highlighted = query.trim() && busquedaCoincide(a.actividad, query);
                          return (
                            <div
                              key={a.actividad}
                              onClick={() => onSelect({
                                partida: p.partida,
                                subpartida: sp.subpartida,
                                actividad: a.actividad,
                              })}
                              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = highlighted
                                  ? '#fffbeb'
                                  : ai % 2 === 0 ? '#fff' : '#f8fafc';
                              }}
                              style={{
                                padding: '10px 16px 10px 48px',
                                background: highlighted ? '#fffbeb' : ai % 2 === 0 ? '#fff' : '#f8fafc',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                borderBottom: `1px solid ${BASE.border}`,
                                transition: '0.12s',
                              }}
                            >
                              <span style={{
                                fontSize: '10px', color: BASE.muted,
                                fontFamily: 'monospace', flexShrink: 0, minWidth: '52px',
                              }}>{a.codigo}</span>
                              <span style={{ fontSize: '12px', color: BASE.text, flex: 1, lineHeight: 1.3 }}>
                                └─ {a.actividad}
                              </span>
                              {a.unidad && (
                                <span style={{
                                  fontSize: '10px', fontWeight: '700',
                                  padding: '2px 7px', borderRadius: '4px',
                                  background: '#f0fdf4', color: '#16a34a', flexShrink: 0,
                                }}>{a.unidad}</span>
                              )}
                              {a.ipMeta && (
                                <span style={{
                                  fontSize: '10px', fontWeight: '700',
                                  padding: '2px 7px', borderRadius: '4px',
                                  background: '#f1f5f9', color: BASE.muted, flexShrink: 0,
                                }}>IP {a.ipMeta.toFixed(2)}</span>
                              )}
                              <span style={{ fontSize: '14px', color: BASE.green, flexShrink: 0 }}>→</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '10px 14px', background: '#f8fafc',
          borderTop: `1px solid ${BASE.border}`,
          fontSize: '10px', color: BASE.muted, lineHeight: 1.5, flexShrink: 0,
        }}>
          <strong>Click en una actividad</strong> para cargarla en el formulario.
          Presiona <strong>Esc</strong> para cerrar.
        </div>
      </div>
    </div>
  );
}