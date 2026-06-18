// src/components/AreaSidebar.jsx — Sidebar lateral navy reutilizable por área.
// Mismo lenguaje visual que el menú de "Producción y Planeamiento" (App.jsx): aside
// fijo navy con grupos en oro, items numerados por grupo, item activo con barra
// lateral de color, modo colapsado (solo iconos) y footer de marca.
//
// Se parametriza con `grupos` ({ GRUPO: [ {key,label,iconName,color} ] }), la key
// activa y los callbacks. Así una nueva área (p.ej. Oficina Técnica) obtiene un menú
// lateral idéntico al de Producción sin duplicar el markup.

import React from 'react';
import { BASE } from '../utils/styles';
import Icon from './Icon';

export default function AreaSidebar({
  grupos,                  // { [grupo: string]: Array<{ key, label, iconName, color }> }
  activeKey,
  onSelect,
  collapsed = false,
  onToggleCollapse,
  sidebarWidth = 210,
  topSlot = null,          // ej. <SelectorFrenteLateral collapsed={collapsed} />
  onHoverItem,             // opcional: preload del módulo al hover/focus
}) {
  return (
    <aside style={{
      width: `${sidebarWidth}px`,
      background: `linear-gradient(180deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
      borderRight: `1px solid rgba(255,255,255,0.08)`,
      padding: '0',
      position: 'fixed',
      top: '60px',
      left: '0',
      height: 'calc(100dvh - 60px)',
      overflowY: 'visible',
      zIndex: 101,
      boxShadow: '2px 0 12px rgba(15,23,42,0.18)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s ease',
    }}>
      {/* Toggle colapsar/expandir — botón flotante en el borde derecho */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          style={{
            position: 'absolute', top: '14px', right: '-12px',
            width: '24px', height: '24px', borderRadius: '50%',
            background: BASE.gold, color: BASE.navy,
            border: `2px solid ${BASE.navyDark}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '900', lineHeight: 1, padding: 0,
            zIndex: 102, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      )}

      <div style={{ flex: 1, minHeight: 0, padding: collapsed ? '12px 6px' : '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {topSlot}
        {Object.entries(grupos).map(([grupo, lista]) => (
          <div key={grupo} style={{ marginBottom: '8px' }}>
            {collapsed ? (
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '6px 8px' }} />
            ) : (
              <div style={{
                fontSize: '9px', fontWeight: '900', color: BASE.gold,
                letterSpacing: '1.2px', padding: '2px 8px 4px',
                textTransform: 'uppercase', opacity: 0.85,
              }}>{grupo}</div>
            )}
            {lista.map((it, i) => {
              const activo = activeKey === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => onSelect(it.key)}
                  onFocus={() => onHoverItem?.(it.key)}
                  title={collapsed ? it.label : ''}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : '9px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '8px 0' : '6px 9px',
                    marginBottom: '1px', borderRadius: '7px',
                    background: activo ? `${it.color}22` : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${activo ? it.color : 'transparent'}`,
                    paddingLeft: collapsed ? 0 : '6px',
                    color: activo ? '#fff' : 'rgba(255,255,255,0.82)',
                    fontWeight: activo ? '700' : '600',
                    fontSize: '11.5px', lineHeight: 1.25, cursor: 'pointer',
                    textAlign: 'left', transition: '0.15s',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { onHoverItem?.(it.key); if (!activo) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={e => { if (!activo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.82)'; } }}
                >
                  {!collapsed && (
                    <span style={{
                      minWidth: '14px', fontSize: '9.5px', fontWeight: '900',
                      color: activo ? it.color : 'rgba(255,255,255,0.45)',
                    }}>{i + 1}</span>
                  )}
                  <Icon name={it.iconName} size={collapsed ? 18 : 15} color={it.color} strokeWidth={1.85} />
                  {!collapsed && <span style={{ flex: 1 }}>{it.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer GRAPCO */}
      {!collapsed && (
        <div style={{
          padding: '10px 14px 14px',
          borderTop: `1px solid rgba(255,255,255,0.08)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.55)' }}>
            GRAPCO S.A.C. © {new Date().getFullYear()}
          </span>
          <span style={{ fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)' }}>
            Gestión Integral de Obra
          </span>
        </div>
      )}
    </aside>
  );
}
