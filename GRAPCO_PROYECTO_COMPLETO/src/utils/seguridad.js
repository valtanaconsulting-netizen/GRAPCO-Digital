// src/utils/seguridad.js — Helpers de seguridad GRAPCO (Bloque 12)
//
// Provee:
//   - validarRegistroCampo() — validación cliente ANTES de escribir Firestore
//                              (las reglas también validan, pero esto da UX más rápida)
//   - validarCartaBalance()
//   - auditar() — registra operación crítica en Auditoria_Seguridad
//   - sanitizar() — limpia strings de caracteres peligrosos antes de mostrar/guardar

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ════════════════════════════════════════════════════════════════
// SANITIZACIÓN
// ════════════════════════════════════════════════════════════════

/**
 * Limpia un string para evitar XSS al renderizarlo y para evitar
 * tamaños descomunales antes de enviarlo a Firestore.
 */
export function sanitizar(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '')      // tags HTML
    .replace(/[\x00-\x1f]/g, '') // control chars
    .trim()
    .slice(0, maxLen);
}

/**
 * Valida y normaliza un número en un rango.
 * Devuelve `null` si no es válido.
 */
export function numSeguro(n, min = 0, max = 1e9) {
  const v = typeof n === 'string' ? parseFloat(n.replace(',', '.')) : Number(n);
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return v;
}

// ════════════════════════════════════════════════════════════════
// VALIDADORES DE SCHEMAS POR COLECCIÓN
// Devuelven { ok: true, data: {...sanitizado} } o { ok: false, error }
// ════════════════════════════════════════════════════════════════

export function validarRegistroCampo(input, uidCapataz) {
  const errores = [];

  if (!uidCapataz) errores.push('Sin sesión activa');
  if (!input.fecha) errores.push('Falta fecha');
  if (!input.partida) errores.push('Falta partida');
  if (!input.actividad) errores.push('Falta actividad');

  const metrado = numSeguro(input.metrado, 0, 100000);
  if (metrado === null) errores.push('Metrado inválido (0–100,000)');

  const hh = numSeguro(input.hh, 0, 1000);
  if (hh === null) errores.push('HH inválido (0–1000)');

  if (errores.length) return { ok: false, error: errores.join(' · ') };

  return {
    ok: true,
    data: {
      fecha:     sanitizar(input.fecha, 30),
      partida:   sanitizar(input.partida, 200),
      subpartida: sanitizar(input.subpartida || '', 200),
      actividad: sanitizar(input.actividad, 500),
      observaciones: sanitizar(input.observaciones || '', 1000),
      metrado,
      hh,
      he: numSeguro(input.he, 0, 100) ?? 0,
      cuadrilla: sanitizar(input.cuadrilla || '', 200),
      uidCapataz,
      // Cualquier otro campo aprobado puede pasar tal cual
      ...(input.fotos && Array.isArray(input.fotos) ? { fotos: input.fotos.slice(0, 20) } : {}),
      ...(input.tareo && typeof input.tareo === 'object' ? { tareo: input.tareo } : {}),
    }
  };
}

export function validarCartaBalance(input, uidAutor) {
  if (!uidAutor) return { ok: false, error: 'Sin sesión activa' };
  if (!input.fecha) return { ok: false, error: 'Falta fecha' };
  if (!input.actividad) return { ok: false, error: 'Falta actividad' };

  return {
    ok: true,
    data: {
      fecha:     sanitizar(input.fecha, 30),
      actividad: sanitizar(input.actividad, 500),
      observaciones: sanitizar(input.observaciones || '', 1000),
      mediciones: Array.isArray(input.mediciones) ? input.mediciones.slice(0, 1000) : [],
      uidAutor,
    }
  };
}

// ════════════════════════════════════════════════════════════════
// AUDIT LOG
// Registra operaciones críticas en Auditoria_Seguridad.
// Append-only — las reglas Firestore impiden borrar/modificar.
// ════════════════════════════════════════════════════════════════

const ACCIONES_AUDITABLES = [
  'login_exitoso', 'login_fallido', 'login_bloqueado_cuenta_inactiva', 'logout',
  'registro_usuario',
  'subida_modelo_bim', 'eliminacion_modelo_bim',
  'cambio_rol_usuario',
  'eliminacion_registro', 'eliminacion_cuadrilla',
  'export_datos_masivo',
  'error_no_capturado',  // ErrorBoundary v2 (Bloque 14)
];

export async function auditar(uid, accion, detalles = {}) {
  if (!ACCIONES_AUDITABLES.includes(accion)) {
    console.warn('[Audit] Acción no auditable:', accion);
    return;
  }
  try {
    await addDoc(collection(db, 'Auditoria_Seguridad'), {
      uid: uid || 'anon',
      accion,
      detalles,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch (e) {
    console.warn('[Audit] No se pudo registrar:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
// VERIFICACIÓN DE PERMISOS EN FRONTEND
// (las reglas son el guardian final, esto es UX)
// ════════════════════════════════════════════════════════════════

export const PUEDE = {
  borrarRegistro:    (rol) => rol === 'admin',
  editarConfiguracion: (rol) => rol === 'ingeniero' || rol === 'admin',
  subirModeloBIM:    (rol) => rol === 'ingeniero' || rol === 'admin',
  gestionarUsuarios: (rol) => rol === 'admin',
  verAuditoria:      (rol) => rol === 'admin',
  crearRegistro:     (rol) => rol === 'capataz' || rol === 'admin',
};
