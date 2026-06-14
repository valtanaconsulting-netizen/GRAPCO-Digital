// src/components/AppShell.jsx — Layout principal con sidebar lateral + topbar (Bloque 26)
//
// Estructura:
//   +----------------------------------------------------------+
//   | LOGO + TITULO   ··· status   ··· UserProfile (dropdown)   |
//   +--------+--------------------------------------------------+
//   |        | (slot superior: selector proyecto/frente)        |
//   |        |--------------------------------------------------|
//   | SIDE   |                                                  |
//   | NAV    |          MAIN CONTENT (children)                 |
//   |        |                                                  |
//   |        |                                                  |
//   |[Cambiar area]                                             |
//   |[Salir]                                                    |
//   +--------+--------------------------------------------------+

import React, { useEffect, useState } from 'react';
import { BASE, LOGO } from '../utils/styles';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import Icon from './Icon';

const SIDEBAR_W_DESKTOP = 240;
const SIDEBAR_W_COLLAPSED = 64;
const TOPBAR_H = 56;

const ROL_META = {
  ingeniero:        { titulo: 'Producción',           icono: '📊', badge: 'INGENIERIA',  color: BASE.gold },
  carta_balance:    { titulo: 'Carta Balance',        icono: '⚖️', badge: 'C.BALANCE',  color: '#7c3aed' },
  capataz:          { titulo: 'Registro de Produccion', icono: '👷', badge: 'CAPATAZ',   color: BASE.green },
  calidad:          { titulo: 'Gestión de Calidad',   icono: '🦺', badge: 'CALIDAD',    color: '#ec4899' },
  oficina_tecnica:  { titulo: 'Oficina Tecnica',      icono: '📐', badge: 'OT',         color: '#6366f1' },
  seguridad:        { titulo: 'Seguridad SSOMA',      icono: '⚠️', badge: 'SSOMA',      color: BASE.red },
  almacenero:       { titulo: 'Almacen',              icono: '📦', badge: 'ALMACEN',    color: '#7c3aed' },
  logistica:        { titulo: 'Logistica',            icono: '🚛', badge: 'LOGISTICA',  color: '#7c3aed' },
  supervisor_cliente:{ titulo: 'Supervision',         icono: '🔍', badge: 'SUPERVISION', color: '#0ea5e9' },
  admin:            { titulo: 'Acceso Completo',      icono: '🛡️', badge: 'ADMIN',      color: BASE.navy },
};

export default function AppShell({
  items = [],            // [{ key, label, icon, color, group? }]
  activeKey,
  onSelectItem,
  children,
  topSlot = null,        // ej: <SelectorProyectoFrente />
  rol,
  onCambiarArea,         // logout / cambiar perfil
  onSalir,               // salir total
  isMobile = false,
}) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Cerrar sidebar movil al cambiar item
  const handleSelect = (key) => {
    onSelectItem?.(key);
    if (isMobile) setMobileOpen(false);
  };

  const meta = ROL_META[rol] || { titulo: 'GRAPCO', icono: '🏗️', badge: (rol || '').toUpperCase(), color: BASE.gold };
  const sidebarW = isMobile ? 280 : (collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_DESKTOP);

  // Agrupar items
  const itemsAgrupados = {};
  items.forEach(it => {
    const g = it.group || 'Modulos';
    if (!itemsAgrupados[g]) itemsAgrupados[g] = [];
    itemsAgrupados[g].push(it);
  });

  const userInitials = (user?.email || '?').slice(0, 2).toUpperCase();
  const userLabel = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      background: BASE.bg,
      fontFamily: BASE.font,
    }}>
      {/* ========= TOPBAR ========= */}
      <header style={{
        height: `${TOPBAR_H}px`,
        background: `linear-gradient(135deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
        borderBottom: `2px solid ${BASE.gold}`,
        display: 'flex',
        alignItems: 'stretch',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(15,23,42,0.18)',
      }}>
        {/* Zona izquierda del topbar: ancho = sidebar, marca GRAPCO fija */}
        <div style={{
          width: isMobile ? 'auto' : `${sidebarW}px`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 14px',
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.12)',
          transition: 'width 0.22s ease',
        }}>
          {/* Hamburguesa mobile */}
          {isMobile && (
            <button onClick={() => setMobileOpen(v => !v)} style={iconBtnTop}>
              ☰
            </button>
          )}
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: `0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px ${BASE.gold}55`,
            overflow: 'hidden',
          }}>
            <img src={LOGO} alt="GRAPCO" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.25)' }} />
          </div>
          {!isMobile && (!collapsed) && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '15px', fontWeight: '900', color: BASE.gold, letterSpacing: '2px', lineHeight: 1 }}>GRAPCO</span>
              <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', fontWeight: '700', letterSpacing: '0.6px' }}>Control de Productividad</span>
            </div>
          )}
        </div>

        {/* Zona derecha: contenido principal del topbar */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 14px',
        }}>
          <div style={{ flex: 1 }} />

        {/* Status online */}
        {!isMobile && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: online ? 'rgba(22,163,74,0.20)' : 'rgba(220,38,38,0.22)',
            border: `1px solid ${online ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.6)'}`,
            padding: '4px 9px', borderRadius: '999px',
            fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.4px',
            color: online ? '#bbf7d0' : '#fecaca',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: online ? '#22c55e' : '#ef4444',
              boxShadow: online ? '0 0 5px #22c55e' : '0 0 5px #ef4444',
            }} />
            {online ? 'EN LINEA' : 'SIN RED'}
          </span>
        )}

        {/* Botón TESIS — atajo al dashboard de impacto académico */}
        {(rol === 'ingeniero' || rol === 'admin') && (
          <button
            onClick={() => {
              // Persistir intención (por si Ingeniero aún no está montado) + evento (si ya lo está)
              try { sessionStorage.setItem('grapco_nav_tesis', '1'); } catch (e) {}
              // Si el módulo activo no es 'dashboard', llevamos al usuario allí
              if (typeof onSelectItem === 'function' && activeKey !== 'dashboard') {
                onSelectItem('dashboard');
              }
              try { window.dispatchEvent(new CustomEvent('grapco:nav-tesis')); } catch (e) {}
            }}
            title="Impacto Tesis"
            style={{
              width: '34px', height: '34px',
              borderRadius: '999px',
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark || '#d97706'})`,
              border: `1px solid ${BASE.gold}88`,
              color: BASE.navy, fontSize: '15px',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 2px 8px ${BASE.gold}55`,
              padding: 0,
            }}>
            🎓
          </button>
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Profile chip con dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setProfileOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 12px 5px 5px', borderRadius: '999px',
            background: 'rgba(245,158,11,0.18)', border: `1px solid ${BASE.gold}88`,
            color: '#fff', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark || '#d97706'})`,
              color: BASE.navy, fontSize: '11px', fontWeight: '900',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '0.3px',
            }}>{userInitials}</span>
            {!isMobile && (
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>{userLabel}</span>
                <span style={{ fontSize: '8.5px', fontWeight: '700', color: BASE.gold, letterSpacing: '0.5px' }}>
                  {meta.badge}
                </span>
              </span>
            )}
            <span style={{ fontSize: '10px', opacity: 0.8 }}>▾</span>
          </button>

          {profileOpen && (
            <>
              <div onClick={() => setProfileOpen(false)} style={{
                position: 'fixed', inset: 0, zIndex: 50,
              }} />
              <div style={{
                position: 'absolute', top: '110%', right: 0,
                background: '#fff', borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15,23,42,0.22)',
                minWidth: '240px', zIndex: 60,
                overflow: 'hidden',
                border: `1px solid ${BASE.border}`,
              }}>
                <div style={{ padding: '14px 16px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                  <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy }}>{userLabel}</p>
                  <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>{user?.email || '—'}</p>
                  <span style={{
                    display: 'inline-block', marginTop: '6px',
                    background: meta.color, color: '#fff',
                    padding: '2px 8px', borderRadius: '8px',
                    fontSize: '9px', fontWeight: '900', letterSpacing: '0.5px',
                  }}>{meta.badge}</span>
                </div>
                <button onClick={() => { setProfileOpen(false); onCambiarArea?.(); }} style={ddItem}>
                  🔄 Cambiar de area
                </button>
                <button onClick={() => { setProfileOpen(false); onSalir?.(); }} style={{ ...ddItem, color: BASE.red, borderTop: `1px solid ${BASE.border}` }}>
                  🚪 Cerrar sesion
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </header>

      {/* ========= CUERPO: SIDEBAR + MAIN ========= */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Backdrop mobile */}
        {isMobile && mobileOpen && (
          <div onClick={() => setMobileOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 80,
          }} />
        )}

        {/* Sidebar — siempre fijo al viewport para que NO desaparezca al scrollear */}
        <aside style={{
          width: `${sidebarW}px`,
          flexShrink: 0,
          background: BASE.white,
          borderRight: `1px solid ${BASE.border}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: `${TOPBAR_H}px`,
          left: isMobile ? (mobileOpen ? 0 : `-${sidebarW + 10}px`) : 0,
          height: `calc(100dvh - ${TOPBAR_H}px)`,
          zIndex: isMobile ? 90 : 50,
          transition: 'left 0.22s ease',
          boxShadow: isMobile ? '4px 0 20px rgba(15,23,42,0.2)' : '2px 0 6px rgba(15,23,42,0.04)',
        }}>
          {/* Header del sidebar (cambiar area / salir arriba).
              Cuando hay AMBOS botones, padding normal. Cuando solo hay SALIR (rol operativo),
              header compacto para no dejar espacio en blanco encima del menu. */}
          {(() => {
            const tieneCambiarArea = typeof onCambiarArea === 'function';
            return (
              <div style={{
                padding: tieneCambiarArea ? '10px 12px' : '6px 12px',
                borderBottom: `1px solid ${BASE.border}`,
                background: BASE.bgSoft,
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                {tieneCambiarArea && (
                  <button onClick={onCambiarArea} title="Cambiar de area" style={{
                    padding: collapsed && !isMobile ? '8px' : '8px 12px',
                    borderRadius: '8px',
                    background: BASE.navy, color: '#fff', border: 'none',
                    fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                    textAlign: collapsed && !isMobile ? 'center' : 'left',
                    letterSpacing: '0.3px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                  }}>
                    <span>🔄</span>
                    {(!collapsed || isMobile) && <span>CAMBIAR DE AREA</span>}
                  </button>
                )}
                <button onClick={onSalir} title="Cerrar sesion" style={{
                  padding: collapsed && !isMobile ? '8px' : (tieneCambiarArea ? '8px 12px' : '7px 12px'),
                  borderRadius: '8px',
                  background: '#fff', color: BASE.red,
                  border: `1.5px solid ${BASE.red}`,
                  fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                  letterSpacing: '0.3px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                }}>
                  <span>🚪</span>
                  {(!collapsed || isMobile) && <span>SALIR</span>}
                </button>
              </div>
            );
          })()}

          {/* Items navegables (con soporte de sub-items jerarquicos) */}
          <nav style={{
            flex: 1, overflowY: 'auto', padding: '6px 8px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {Object.entries(itemsAgrupados).map(([grupo, itemsGrupo]) => {
              // Numeracion 1, 2, 3... por grupo (solo cuando expandido)
              return (
                <div key={grupo}>
                  {(!collapsed || isMobile) && (
                    <p style={{
                      fontSize: '9px', fontWeight: '900', color: BASE.muted,
                      letterSpacing: '0.8px', padding: '0 8px 6px',
                    }}>{grupo.toUpperCase()}</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {itemsGrupo.map((it, idxGrupo) => {
                      const activo = it.key === activeKey;
                      const subActiva = it.children?.some(c => c.key === activeKey);
                      const debeExpandir = activo || subActiva;
                      const numero = `${idxGrupo + 1}`;
                      return (
                        <React.Fragment key={it.key}>
                          <button onClick={() => handleSelect(it.key)}
                            title={it.label}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: collapsed && !isMobile ? '10px' : '9px 12px',
                              borderRadius: '8px',
                              background: (activo || subActiva) ? (it.color || BASE.navy) : 'transparent',
                              color: (activo || subActiva) ? '#fff' : BASE.text,
                              border: 'none',
                              fontSize: '12px', fontWeight: (activo || subActiva) ? '800' : '600',
                              cursor: 'pointer',
                              textAlign: 'left',
                              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                              transition: 'all 0.15s',
                              letterSpacing: '0.2px',
                              boxShadow: (activo || subActiva) ? `0 4px 10px ${(it.color || BASE.navy)}55` : 'none',
                            }}
                            onMouseEnter={e => {
                              if (!activo && !subActiva) e.currentTarget.style.background = BASE.bgSoft;
                            }}
                            onMouseLeave={e => {
                              if (!activo && !subActiva) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            {(!collapsed || isMobile) && (
                              <span style={{
                                fontSize: '9.5px', fontWeight: '900',
                                background: (activo || subActiva) ? 'rgba(255,255,255,0.25)' : BASE.bgSoft,
                                color: (activo || subActiva) ? '#fff' : BASE.muted,
                                padding: '2px 6px', borderRadius: '6px',
                                minWidth: '20px', textAlign: 'center',
                                fontFamily: 'var(--grapco-font-mono, monospace)',
                                letterSpacing: '0',
                              }}>{numero}</span>
                            )}
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '18px', height: '18px', flexShrink: 0,
                              fontSize: '15px',
                              color: activo ? '#fff' : (it.color || BASE.navy),
                            }}>
                              {it.iconName
                                ? <Icon name={it.iconName} size={16} color={activo ? '#fff' : (it.color || BASE.navy)} strokeWidth={1.85} />
                                : (it.icon || null)}
                            </span>
                            {(!collapsed || isMobile) && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>}
                            {(!collapsed || isMobile) && it.children?.length > 0 && (
                              <span style={{
                                fontSize: '10px', opacity: 0.7,
                                transform: debeExpandir ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.18s',
                              }}>▸</span>
                            )}
                          </button>

                          {/* Sub-items jerarquicos (1.1, 1.2, ...) */}
                          {debeExpandir && it.children?.length > 0 && (!collapsed || isMobile) && (
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: '1px',
                              marginLeft: '14px', paddingLeft: '8px',
                              borderLeft: `2px solid ${it.color || BASE.navy}33`,
                              marginTop: '2px', marginBottom: '6px',
                            }}>
                              {it.children.map((child, idxChild) => {
                                const childActivo = child.key === activeKey;
                                return (
                                  <button key={child.key} onClick={() => handleSelect(child.key)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '7px 10px',
                                      borderRadius: '6px',
                                      background: childActivo ? `${(it.color || BASE.navy)}18` : 'transparent',
                                      color: childActivo ? (it.color || BASE.navy) : BASE.text,
                                      border: 'none',
                                      fontSize: '11.5px',
                                      fontWeight: childActivo ? '800' : '600',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                      if (!childActivo) e.currentTarget.style.background = BASE.bgSoft;
                                    }}
                                    onMouseLeave={e => {
                                      if (!childActivo) e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <span style={{
                                      fontSize: '9px', fontWeight: '900',
                                      color: childActivo ? (it.color || BASE.navy) : BASE.muted,
                                      fontFamily: 'var(--grapco-font-mono, monospace)',
                                      minWidth: '26px',
                                    }}>{numero}.{idxChild + 1}</span>
                                    {(child.iconName || child.icon) && (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '14px', height: '14px', fontSize: '13px',
                                        color: childActivo ? (it.color || BASE.navy) : BASE.muted,
                                      }}>
                                        {child.iconName
                                          ? <Icon name={child.iconName} size={13} color={childActivo ? (it.color || BASE.navy) : BASE.muted} strokeWidth={1.85} />
                                          : child.icon}
                                      </span>
                                    )}
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Toggle collapse (solo desktop) */}
          {!isMobile && (
            <div style={{ padding: '8px', borderTop: `1px solid ${BASE.border}` }}>
              <button onClick={() => setCollapsed(v => !v)} style={{
                width: '100%', padding: '8px',
                background: 'transparent', color: BASE.muted, border: `1px dashed ${BASE.border}`,
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px',
              }} title={collapsed ? 'Expandir' : 'Colapsar'}>
                {collapsed ? '»' : '«'}
              </button>
            </div>
          )}
        </aside>

        {/* Main — con marginLeft para compensar el sidebar fixed (solo desktop) */}
        <main style={{
          flex: 1,
          minWidth: 0,
          padding: isMobile ? '10px 12px' : '14px 18px',
          marginLeft: isMobile ? 0 : `${sidebarW}px`,
          overflowX: 'hidden',
          transition: 'margin-left 0.22s ease',
        }}>
          {topSlot && <div style={{ marginBottom: '12px' }}>{topSlot}</div>}
          <div className="anim-fade-in" key={activeKey}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const iconBtnTop = {
  background: 'rgba(255,255,255,0.12)', color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
  width: '36px', height: '36px',
  fontSize: '18px', cursor: 'pointer', flexShrink: 0,
};

const ddItem = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '12px 16px', background: '#fff', color: BASE.navy,
  border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
};
