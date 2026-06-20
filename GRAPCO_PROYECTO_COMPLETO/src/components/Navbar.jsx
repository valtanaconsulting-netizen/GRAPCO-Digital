// src/components/Navbar.jsx — v3 (Bloque 10 + Bloque 11 + ajustes 2026)
// Glow decorativo, indicador online/offline, badge multi-rol y botón "Cambiar perfil".
import React, { useEffect, useState } from 'react';
import { BASE, LOGO, LOGO_FALLBACK } from '../utils/styles';
import Icon from './Icon';
import UserProfileMenu from './UserProfileMenu';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { resolverCliente } from '../utils/clienteLogo';

// El título central es siempre "PLATAFORMA GRAPCO S.A.C." (branding consistente).
// El icono SVG + badge varían según el rol activo.
const ROL_META = {
  ingeniero:         { iconName: 'dashboard',  badge: 'PRODUCCIÓN',          color: BASE.gold },
  carta_balance:     { iconName: 'balance',    badge: 'CARTA BALANCE',       color: '#7c3aed' },
  capataz:           { iconName: 'hardhat',    badge: 'CAPATAZ DE OBRA',     color: BASE.green },
  calidad:           { iconName: 'shield',     badge: 'CALIDAD',             color: '#ec4899' },
  oficina_tecnica:   { iconName: 'fileText',   badge: 'OFICINA TÉCNICA',     color: '#6366f1' },
  almacenero:        { iconName: 'package',    badge: 'ALMACÉN',             color: '#7c3aed' },
  logistica:         { iconName: 'cart',       badge: 'LOGÍSTICA',           color: '#2563eb' },
  supervisor_cliente:{ iconName: 'shield',     badge: 'SUPERVISIÓN CLIENTE', color: '#0ea5e9' },
  planeamiento:      { iconName: 'tree',       badge: 'PLANEAMIENTO',        color: '#0d9488' },
  admin:             { iconName: 'shieldAdmin',badge: 'ADMINISTRADOR',       color: BASE.navy },
};

export default function Navbar({ rol, isMobile, onSalir, onCambiarArea, onMenu }) {
  const meta = ROL_META[rol] || { iconName: 'building', badge: (rol || '').toUpperCase(), color: BASE.gold };
  const { iconName, badge, color: colorBadge } = meta;
  const titulo = 'PLATAFORMA GRAPCO S.A.C.';

  // Cliente del proyecto activo → su logo va al lado del de GRAPCO (identifica la obra).
  const { proyectoActivo } = useProyectoActivo();
  const cliente = resolverCliente(proyectoActivo);

  // Indicador online/offline
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <nav style={{
      background: `linear-gradient(135deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
      borderBottom: `3px solid ${BASE.gold}`,
      padding: isMobile ? '0 10px' : '0 16px',
      // Edge-to-edge: el navy pinta bajo la barra de estado / notch (safe-area).
      // En PWA fullscreen el inset es 0 y queda igual; en navegador/iOS rellena
      // el hueco superior para que no quede una franja blanca.
      height: '60px',
      paddingTop: 'env(safe-area-inset-top)',
      boxSizing: 'content-box',
      display: 'flex',
      alignItems: 'center',
      // FIXED full-width — siempre visible arriba. El sidebar empieza debajo (top:60).
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 102,
      gap: isMobile ? '8px' : '14px',
      flexShrink: 0,
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
      overflow: 'hidden',
    }}>
      {/* Glow decorativo dorado en la esquina derecha */}
      <div style={{
        position: 'absolute',
        top: '-30px',
        right: '-30px',
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        background: BASE.gold,
        opacity: 0.08,
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }}/>

      {/* Hamburguesa — solo móvil: abre el menú lateral (drawer) */}
      {isMobile && onMenu && (
        <button
          onClick={onMenu}
          aria-label="Abrir menú"
          style={{
            flexShrink: 0,
            width: '38px', height: '38px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px', cursor: 'pointer', color: '#fff',
            position: 'relative',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Logo del CLIENTE del proyecto — al lado IZQUIERDO del de GRAPCO, mismo tamaño.
          Identifica de qué empresa/obra es el proyecto. Solo el logo (el nombre va en él);
          si no han subido logo, muestra su monograma de respaldo. */}
      {(cliente.logoUrl || cliente.nombre) && (
        <div title={cliente.nombre || 'Cliente'} style={{
          width: '40px', height: '40px', borderRadius: '10px', background: '#fff',
          padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', overflow: 'hidden', position: 'relative',
        }}>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: BASE.navy }}>{cliente.monograma}</span>
          {cliente.logoUrl && (
            <img src={cliente.logoUrl} alt={cliente.nombre || 'Cliente'}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px', background: '#fff' }} />
          )}
        </div>
      )}

      {/* Logo + branding del navbar — visible siempre (el sidebar empieza debajo).
          Card blanca con padding fino para que el logo (de fondo blanco) respire. */}
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '10px',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Solo el badge del PNG (anillo dorado + logo): recortamos el marco navy
            externo (scale) y quitamos el plafón blanco CSS → mismo tamaño que el cliente. */}
        <img
          src={LOGO}
          alt="GRAPCO"
          onError={(e) => { if (e.target.src !== window.location.origin + LOGO_FALLBACK) e.target.src = LOGO_FALLBACK; }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.42)' }}
        />
      </div>

      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <span style={{
            fontSize: '12px', fontWeight: '900', color: BASE.gold,
            letterSpacing: '1.6px', lineHeight: 1,
          }}>GRAPCO <span style={{ color: 'rgba(255,255,255,0.92)' }}>S.A.C.</span></span>
          <span style={{
            fontSize: '9.5px', color: 'rgba(255,255,255,0.72)',
            marginTop: '3px', letterSpacing: '0.8px', fontWeight: '700', textTransform: 'uppercase',
          }}>Gestión de Proyectos VDC</span>
        </div>
      )}

      {/* Título central con icono integrado — compacto en móvil para no romper a 2 líneas */}
      <span style={{
        flex: 1,
        minWidth: 0,
        fontSize: isMobile ? '14px' : '15px',
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        letterSpacing: isMobile ? '1px' : '0.4px',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}>
        <span style={{
          width: isMobile ? '24px' : '28px', height: isMobile ? '24px' : '28px',
          borderRadius: '7px',
          background: 'rgba(229, 168, 47, 0.12)',
          border: '1px solid rgba(229, 168, 47, 0.30)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: BASE.gold, flexShrink: 0,
        }}>
          <Icon name={iconName} size={isMobile ? 13 : 15} strokeWidth={2} />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isMobile ? 'GRAPCO S.A.C.' : titulo}
        </span>
      </span>

      {/* === Bloque derecho — refinado tono Stripe/Linear ===
           Reglas: altura uniforme 30px · borde 1px sutil · sin shadows pesadas ·
           pesos 600-700 (no 900) · letter-spacing reducido · colors menos saturados */}

      {/* Indicador online / offline */}
      {!isMobile && (
        <span title={online ? 'Conectado a Firebase' : 'Sin conexión'} style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          height: '30px', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          padding: '0 12px', borderRadius: '8px',
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.2px',
          color: online ? '#86efac' : '#fca5a5',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: online ? '#22c55e' : '#ef4444',
            flexShrink: 0,
          }} />
          {online ? 'En línea' : 'Sin red'}
        </span>
      )}

      {/* Badge de rol — oculto en móvil para dar espacio al nombre del usuario */}
      {!isMobile && (
      <span style={{
        display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        height: '30px', padding: '0 14px', boxSizing: 'border-box',
        fontSize: '10.5px', fontWeight: '700',
        letterSpacing: '0.6px',
        color: '#fff',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: '8px',
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: colorBadge,
          marginRight: '8px',
          flexShrink: 0,
        }} />
        {badge}
      </span>
      )}

      {/* CAMBIAR DE ÁREA — outline dorado fino */}
      <button
        onClick={onCambiarArea}
        className="btn-feedback"
        title="Volver al selector de área (sigues conectado)"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          height: '30px', padding: isMobile ? '0 9px' : '0 14px', boxSizing: 'border-box',
          background: 'transparent',
          color: '#FCEFC9',
          border: `1px solid rgba(229,168,47,0.45)`,
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '0.2px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(229,168,47,0.12)';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'rgba(229,168,47,0.80)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#FCEFC9';
          e.currentTarget.style.borderColor = 'rgba(229,168,47,0.45)';
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          <path d="M3 21v-5h5"/>
        </svg>
        {!isMobile && 'Cambiar de área'}
      </button>

      {/* NUEVA PESTAÑA — abre el selector de áreas en otra pestaña SIN salir de
          esta: permite trabajar Calidad y Planeamiento a la vez (multi-pestaña) */}
      <button
        onClick={() => window.open(`${window.location.pathname}#/elegir`, '_blank')}
        className="btn-feedback"
        title="Abrir otra área en una pestaña nueva (esta se queda como está)"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          height: '30px', padding: isMobile ? '0 9px' : '0 12px', boxSizing: 'border-box',
          background: 'transparent',
          color: '#FCEFC9',
          border: `1px solid rgba(229,168,47,0.45)`,
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '0.2px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(229,168,47,0.12)';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'rgba(229,168,47,0.80)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#FCEFC9';
          e.currentTarget.style.borderColor = 'rgba(229,168,47,0.45)';
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <path d="M15 3h6v6"/>
          <path d="M10 14L21 3"/>
        </svg>
        {!isMobile && 'Nueva pestaña'}
      </button>

      {/* MENÚ DE PERFIL — avatar + dropdown completo (también incluye "Cerrar sesión") */}
      <UserProfileMenu rol={rol} onSalir={onSalir} />
    </nav>
  );
}
