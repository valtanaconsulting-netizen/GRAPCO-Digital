// src/utils/functionsClient.js — Cliente HTTP unificado para Cloud Functions (Bloque 14)
//
// Centraliza:
//   - URL base configurable por env vars
//   - Autenticación con Firebase ID token
//   - Manejo de errores estandarizado
//   - Timeout configurable
//
// Reemplaza el código duplicado de apsClient.js y adminClient.js.

import { auth } from '../firebaseConfig';

const FUNCTIONS_REGION  = import.meta.env.VITE_FUNCTIONS_REGION  || 'us-central1';
const FUNCTIONS_PROJECT = import.meta.env.VITE_FUNCTIONS_PROJECT || 'grapco-demo-2026';

export const FUNCTIONS_BASE_URL =
  `https://${FUNCTIONS_REGION}-${FUNCTIONS_PROJECT}.cloudfunctions.net`;

/**
 * Llama a una Cloud Function con autenticación Firebase.
 *
 * @param {string} nombre   Nombre de la función (sin URL)
 * @param {object} payload  Body JSON (opcional)
 * @param {string} method   POST | GET | DELETE (default POST)
 * @param {object} opts     { timeout: ms, requireAuth: bool }
 * @returns {Promise<any>}  Respuesta JSON parseada
 * @throws  {Error}         Con .message del error servidor
 */
export async function callFunction(nombre, payload = null, method = 'POST', opts = {}) {
  const { timeout = 60_000, requireAuth = true } = opts;

  const headers = { 'Content-Type': 'application/json' };

  if (requireAuth) {
    const user = auth.currentUser;
    if (!user) throw new Error('Sin sesión activa. Vuelve a iniciar sesión.');
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/${nombre}`, {
      method,
      headers,
      ...(method !== 'GET' && payload !== null ? { body: JSON.stringify(payload) } : {}),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let mensaje = `${nombre} falló (${res.status})`;
      try {
        const j = await res.json();
        if (j.error) mensaje = j.error;
      } catch (_) {}
      throw new Error(mensaje);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`${nombre} tardó más de ${timeout}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
