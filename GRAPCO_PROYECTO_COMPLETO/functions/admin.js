// functions/admin.js — Cloud Functions de gestión de admin (Bloque 13)
//
// 4 funciones HTTP que solo admins pueden invocar (verificadas server-side):
//   1. adminCrearUsuario    → crea cuenta + perfil con rol especificado
//   2. adminCambiarRol      → cambia el rol de un usuario existente
//   3. adminDesactivarUsuario → marca activo: false (no borra)
//   4. adminEliminarUsuario   → borra cuenta Auth + perfil Firestore (CUIDADO)
//
// Despliegue: firebase deploy --only functions
//
// IMPORTANTE: agregar estos exports a functions/index.js:
//   const admin = require('./admin');
//   exports.adminCrearUsuario = admin.adminCrearUsuario;
//   exports.adminCambiarRol = admin.adminCambiarRol;
//   exports.adminDesactivarUsuario = admin.adminDesactivarUsuario;
//   exports.adminEliminarUsuario = admin.adminEliminarUsuario;

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();

// Roles validos del sistema (debe coincidir con ROLES_INFO en GestionUsuarios.jsx)
const ROLES_VALIDOS = new Set([
  'admin', 'ingeniero', 'oficina_tecnica', 'calidad', 'seguridad',
  'almacenero', 'logistica', 'capataz', 'carta_balance',
  'supervisor_cliente', 'subcontratista',
]);

// Helper CORS
const enableCors = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
};

// Helper multi-proyecto: verifica token y rol admin desde cualquier proyecto autorizado
const PROYECTOS_PERMITIDOS_ADMIN = ['control-productividad-franklin', 'grapco-demo-2026'];
const _adminAppsX = {};
const adminAppParaProyecto = (projectId) => {
  if (projectId === admin.app().options.projectId) return admin.app();
  if (_adminAppsX[projectId]) return _adminAppsX[projectId];
  _adminAppsX[projectId] = admin.initializeApp({ projectId }, 'auth_' + projectId);
  return _adminAppsX[projectId];
};

// Super-admins por correo: SIEMPRE tienen acceso admin, sin importar su doc
// en /Usuarios. Son los dueños del sistema (failsafe de gobernanza).
const SUPER_ADMINS = new Set([
  'fjrosash@gmail.com',
  'abasurco@grapcosac.com',
]);

const requireAdmin = async (req) => {
  const authHeader = req.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) throw new Error('No autenticado');

  // Detectar proyecto origen del token
  let payload;
  try {
    payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));
  } catch { throw new Error('Token mal formado'); }
  if (!PROYECTOS_PERMITIDOS_ADMIN.includes(payload.aud)) {
    throw new Error(`Proyecto no permitido: ${payload.aud}`);
  }

  const app = adminAppParaProyecto(payload.aud);
  const decoded = await app.auth().verifyIdToken(idToken);

  // Failsafe: si el correo es super-admin, acceso garantizado.
  const email = (decoded.email || '').toLowerCase();
  if (SUPER_ADMINS.has(email)) {
    return { uid: decoded.uid, email, sourceProject: payload.aud };
  }

  // El perfil del usuario vive en /Usuarios del MISMO proyecto que emitió el token
  const perfil = await app.firestore().doc(`Usuarios/${decoded.uid}`).get();
  if (!perfil.exists) throw new Error('Usuario sin perfil');
  const data = perfil.data();
  if (data.rol !== 'admin' || data.activo === false) {
    throw new Error('Acceso denegado: solo admins');
  }
  return { uid: decoded.uid, email: decoded.email, sourceProject: payload.aud };
};

// Helper: registra acción en Auditoria_Seguridad
const auditar = async (uid, accion, detalles) => {
  await admin.firestore().collection('Auditoria_Seguridad').add({
    uid,
    accion,
    detalles,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    fuente: 'admin_panel',
  });
};

// ════════════════════════════════════════════════════════════════
// 1) adminCrearUsuario
// ════════════════════════════════════════════════════════════════
exports.adminCrearUsuario = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    const adminInfo = await requireAdmin(req);
    const { email, password, nombre, rol, proyectoIdAsignado } = req.body;

    if (!email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos: email, password, rol' });
    }
    if (!ROLES_VALIDOS.has(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password mínimo 8 caracteres' });
    }

    // Crear cuenta en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre || email.split('@')[0],
      emailVerified: false,
    });

    // Crear perfil en Firestore (incluye proyecto asignado si se envió)
    const perfil = {
      email,
      nombre: nombre || email.split('@')[0],
      rol,
      activo: true,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
      creadoPor: adminInfo.uid,
    };
    if (proyectoIdAsignado) perfil.proyectoIdAsignado = proyectoIdAsignado;
    await admin.firestore().doc(`Usuarios/${userRecord.uid}`).set(perfil);

    await auditar(adminInfo.uid, 'admin_crear_usuario', {
      nuevoUid: userRecord.uid, email, rol,
    });

    res.json({
      ok: true,
      uid: userRecord.uid,
      email,
      mensaje: `Usuario ${email} creado con rol ${rol}`,
    });
  } catch (err) {
    console.error('[adminCrearUsuario]', err);
    res.status(err.message.includes('denegado') ? 403 : 500)
       .json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 2) adminCambiarRol
// ════════════════════════════════════════════════════════════════
exports.adminCambiarRol = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    const adminInfo = await requireAdmin(req);
    const { uid, nuevoRol, proyectoIdAsignado } = req.body;
    const tieneProy = proyectoIdAsignado !== undefined;

    if (!uid) return res.status(400).json({ error: 'Falta uid' });
    if (!nuevoRol && !tieneProy) return res.status(400).json({ error: 'Nada que actualizar' });
    if (nuevoRol && !ROLES_VALIDOS.has(nuevoRol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (uid === adminInfo.uid && nuevoRol && nuevoRol !== 'admin') {
      return res.status(400).json({ error: 'No puedes quitarte tu propio rol de admin' });
    }

    const ref = admin.firestore().doc(`Usuarios/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Usuario no existe' });

    const rolAnterior = snap.data().rol;
    const update = {
      modificadoEn: admin.firestore.FieldValue.serverTimestamp(),
      modificadoPor: adminInfo.uid,
    };
    if (nuevoRol) update.rol = nuevoRol;
    if (tieneProy) update.proyectoIdAsignado = proyectoIdAsignado || null;
    await ref.update(update);

    await auditar(adminInfo.uid, 'admin_actualizar_usuario', {
      uidAfectado: uid, rolAnterior, rolNuevo: nuevoRol || rolAnterior,
      proyectoIdAsignado: tieneProy ? (proyectoIdAsignado || null) : undefined,
    });

    res.json({ ok: true, mensaje: 'Usuario actualizado' });
  } catch (err) {
    console.error('[adminCambiarRol]', err);
    res.status(err.message.includes('denegado') ? 403 : 500)
       .json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 3) adminDesactivarUsuario  (soft delete: activo: false)
// ════════════════════════════════════════════════════════════════
exports.adminDesactivarUsuario = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    const adminInfo = await requireAdmin(req);
    const { uid, activo } = req.body;

    if (!uid) return res.status(400).json({ error: 'Falta uid' });
    if (uid === adminInfo.uid) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });

    await admin.firestore().doc(`Usuarios/${uid}`).update({
      activo: !!activo,
      modificadoEn: admin.firestore.FieldValue.serverTimestamp(),
      modificadoPor: adminInfo.uid,
    });

    // Si se desactiva, también revocar tokens (lo desloguea inmediatamente)
    if (!activo) {
      await admin.auth().revokeRefreshTokens(uid);
    }

    await auditar(adminInfo.uid, !activo ? 'admin_desactivar_usuario' : 'admin_reactivar_usuario', {
      uidAfectado: uid,
    });

    res.json({ ok: true, mensaje: activo ? 'Usuario reactivado' : 'Usuario desactivado y deslogueado' });
  } catch (err) {
    console.error('[adminDesactivarUsuario]', err);
    res.status(err.message.includes('denegado') ? 403 : 500)
       .json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 4) adminEliminarUsuario (HARD delete: borra todo)
// ════════════════════════════════════════════════════════════════
exports.adminEliminarUsuario = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    const adminInfo = await requireAdmin(req);
    const { uid } = req.body;

    if (!uid) return res.status(400).json({ error: 'Falta uid' });
    if (uid === adminInfo.uid) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

    // Borrar cuenta Auth
    await admin.auth().deleteUser(uid);
    // Borrar perfil Firestore
    await admin.firestore().doc(`Usuarios/${uid}`).delete();

    await auditar(adminInfo.uid, 'admin_eliminar_usuario', { uidEliminado: uid });

    res.json({ ok: true, mensaje: 'Usuario eliminado completamente' });
  } catch (err) {
    console.error('[adminEliminarUsuario]', err);
    res.status(err.message.includes('denegado') ? 403 : 500)
       .json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 5) adminSincronizarUsuariosAuth
// Lista todos los usuarios de Firebase Auth y crea el doc en /Usuarios
// para los que NO tengan uno. Los nuevos quedan con rol 'ingeniero',
// activo: true, autoCreado: true. El admin luego asigna rol y proyecto.
// ════════════════════════════════════════════════════════════════
exports.adminSincronizarUsuariosAuth = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    const adminInfo = await requireAdmin(req);

    // 1) listar todos los usuarios Auth (max 1000)
    const authList = await admin.auth().listUsers(1000);
    const authUsers = authList.users; // [{ uid, email, displayName, ... }]

    // 2) traer los uids que YA tienen doc
    const usuariosSnap = await admin.firestore().collection('Usuarios').get();
    const uidsConDoc = new Set(usuariosSnap.docs.map(d => d.id));

    // 3) crear doc para los que NO tienen
    const creados = [];
    const fallos = [];
    for (const u of authUsers) {
      if (uidsConDoc.has(u.uid)) continue;
      try {
        await admin.firestore().doc(`Usuarios/${u.uid}`).set({
          email: u.email || '',
          nombre: u.displayName || (u.email || '').split('@')[0] || 'Usuario',
          rol: 'ingeniero',
          activo: true,
          creadoEn: admin.firestore.FieldValue.serverTimestamp(),
          creadoPor: adminInfo.uid,
          autoCreado: true,
          sincronizadoDesdeAuth: true,
        });
        creados.push({ uid: u.uid, email: u.email });
      } catch (e) {
        console.error('[sincronizar]', u.email, e);
        fallos.push({ uid: u.uid, email: u.email, error: e.message });
      }
    }

    await auditar(adminInfo.uid, 'admin_sincronizar_usuarios_auth', {
      totalAuth: authUsers.length,
      yaExistian: uidsConDoc.size,
      creados: creados.length,
      fallos: fallos.length,
    });

    res.json({
      ok: true,
      totalAuth: authUsers.length,
      yaExistian: uidsConDoc.size,
      creados,
      fallos,
      mensaje: `${creados.length} usuarios sincronizados (${authUsers.length} total en Auth, ${uidsConDoc.size} ya tenian doc).`,
    });
  } catch (err) {
    console.error('[adminSincronizarUsuariosAuth]', err);
    res.status(err.message.includes('denegado') ? 403 : 500)
       .json({ error: err.message });
  }
});
