// src/utils/adminClient.js — Cliente para Cloud Functions de admin (Bloque 13, refactor 14)
import { callFunction } from './functionsClient';

export const crearUsuarioAdmin = (email, password, nombre, rol, proyectoIdAsignado) =>
  callFunction('adminCrearUsuario', { email, password, nombre, rol, proyectoIdAsignado });

export const cambiarRolUsuario = (uid, nuevoRol) =>
  callFunction('adminCambiarRol', { uid, nuevoRol });

// Actualiza rol y/o proyecto asignado de un usuario (vía Cloud Function).
export const actualizarUsuarioAdmin = (uid, { nuevoRol, proyectoIdAsignado } = {}) =>
  callFunction('adminCambiarRol', { uid, nuevoRol, proyectoIdAsignado });

export const desactivarUsuario = (uid, activo) =>
  callFunction('adminDesactivarUsuario', { uid, activo });

export const eliminarUsuarioAdmin = (uid) =>
  callFunction('adminEliminarUsuario', { uid });

export const sincronizarUsuariosAuth = () =>
  callFunction('adminSincronizarUsuariosAuth', {});
