// src/components/RoleGuard.jsx
// Componente de control de acceso. Renderiza children solo si el rol
// del usuario actual está en la lista permitida.
//
// Uso:
//   <RoleGuard roles={['ingeniero', 'admin']}>
//     <PanelAdmin />
//   </RoleGuard>
//
//   <RoleGuard roles={['admin']} fallback={<MensajeNoAutorizado />}>
//     <BorrarTodo />
//   </RoleGuard>

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BASE } from '../utils/styles';

// ── BYPASS DE PERMISOS ──
// Por defecto bypass (acceso total) para no bloquear hasta tener TODOS los roles
// asignados. Para ENDURECER (enforce real por rol) poner VITE_ENFORCE_ROLES=true en
// .env. La defensa de fondo son las Firestore Rules, no este guard de UI.
const BYPASS_ROLES = String(import.meta.env.VITE_ENFORCE_ROLES).toLowerCase() !== 'true';

export default function RoleGuard({ roles, rolesPermitidos, children, fallback = null, silencioso = false }) {
  const { rol, loading } = useAuth();
  // Acepta `roles` o `rolesPermitidos` (alias usado en todo el codebase)
  const lista = rolesPermitidos || roles || [];

  if (BYPASS_ROLES) {
    return <>{children}</>;
  }

  if (loading) {
    return silencioso ? null : (
      <div style={{ padding: '20px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
        Verificando permisos...
      </div>
    );
  }

  if (!lista.includes(rol)) {
    if (fallback) return fallback;
    if (silencioso) return null;
    return (
      <div role="alert" style={{
        padding: '32px 24px',
        background: '#fef2f2',
        border: `2px solid ${BASE.red}`,
        borderRadius: '14px',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '20px auto',
      }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</p>
        <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.red, marginBottom: '6px' }}>
          Acceso restringido
        </p>
        <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.5 }}>
          Esta sección requiere un rol diferente. Si crees que es un error, contacta al administrador.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
