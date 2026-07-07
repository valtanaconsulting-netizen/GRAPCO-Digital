// functions/index.js — Backend GRAPCO para Autodesk Platform Services (APS)
//
// 5 funciones HTTP que el frontend GRAPCO consume:
//   1. apsToken         → obtiene access_token APS (válido 1h, cacheado en memoria)
//   2. apsCrearBucket   → crea bucket si no existe
//   3. apsObtenerUrlSubida → obtiene URL S3 firmada para subir directo
//   4. apsCompletarSubida → confirma upload y arranca traducción a SVF2
//   5. apsConsultarManifest → poll del estado de traducción (% completado)
//
// Configuración requerida (firebase functions:config:set):
//   aps.client_id     = "tu_client_id_de_https://aps.autodesk.com"
//   aps.client_secret = "tu_client_secret"
//   aps.bucket_key    = "grapco-models"  (debe ser único globalmente)
//
// Despliegue:
//   firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

if (!admin.apps.length) admin.initializeApp();

// ── CONFIG ──
// functions.config() ya NO existe en el runtime 2nd Gen (lanza error al llamarse).
// Como este index.js también lo carga la función 2nd Gen `protocoloPdfFirmadoSync`,
// envolvemos la llamada para que no rompa el arranque del contenedor. Las funciones
// APS (1st Gen) lo siguen leyendo igual en su propio runtime.
const _apsCfg = () => { try { return functions.config().aps || {}; } catch (_) { return {}; } };
const APS_CLIENT_ID     = process.env.APS_CLIENT_ID     || _apsCfg().client_id;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET || _apsCfg().client_secret;
const APS_BUCKET_KEY    = (process.env.APS_BUCKET_KEY  || _apsCfg().bucket_key || 'grapco-models').toLowerCase();
const APS_BASE          = 'https://developer.api.autodesk.com';

// ── CACHE TOKEN EN MEMORIA (cold-start friendly) ──
let _token = { value: null, expiresAt: 0 };

const getToken = async () => {
  if (_token.value && Date.now() < _token.expiresAt - 60_000) return _token.value;
  if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) throw new Error('Credenciales APS no configuradas');

  const f = await fetch;
  const res = await f(`${APS_BASE}/authentication/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'data:read data:write data:create bucket:create bucket:read viewables:read',
    }),
  });
  if (!res.ok) throw new Error(`APS auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  _token.value = data.access_token;
  _token.expiresAt = Date.now() + (data.expires_in * 1000);
  return _token.value;
};

// ── HELPER: crear bucket si no existe (idempotente) ──
const asegurarBucket = async (token) => {
  const f = await fetch;
  // 1. Intentar GET bucket
  const check = await f(`${APS_BASE}/oss/v2/buckets/${APS_BUCKET_KEY}/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (check.ok) return APS_BUCKET_KEY;
  // 2. Si no existe, crearlo
  const create = await f(`${APS_BASE}/oss/v2/buckets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketKey: APS_BUCKET_KEY,
      policyKey: 'persistent',  // persistent | transient | temporary
    }),
  });
  if (!create.ok && create.status !== 409) {
    throw new Error(`No se pudo crear bucket: ${create.status} ${await create.text()}`);
  }
  return APS_BUCKET_KEY;
};

// ── HELPER: validar autenticación multi-proyecto ──
// Estas Functions corren en control-productividad-franklin pero también atienden
// llamadas del proyecto demo (grapco-demo-2026). Detectamos el `aud` del JWT y
// usamos un Admin App secundario inicializado con ese projectId para verificar.
// Solo aceptamos proyectos explícitamente en la lista blanca.
const PROYECTOS_PERMITIDOS = ['control-productividad-franklin', 'grapco-demo-2026'];
const _adminApps = {}; // cache por projectId

const adminAppPara = (projectId) => {
  if (projectId === admin.app().options.projectId) return admin.app(); // default
  if (_adminApps[projectId]) return _adminApps[projectId];
  _adminApps[projectId] = admin.initializeApp({ projectId }, projectId);
  return _adminApps[projectId];
};

const requireAuth = async (req) => {
  const authHeader = req.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) throw new Error('No autenticado');

  // Decode payload SIN verificar firma todavía (solo para detectar el proyecto)
  let payload;
  try {
    const partes = idToken.split('.');
    if (partes.length !== 3) throw new Error('Token con formato inválido');
    payload = JSON.parse(Buffer.from(partes[1], 'base64').toString('utf8'));
  } catch {
    throw new Error('Token mal formado');
  }

  const aud = payload.aud;
  if (!PROYECTOS_PERMITIDOS.includes(aud)) {
    throw new Error(`Proyecto no permitido: ${aud}`);
  }

  const app = adminAppPara(aud);
  const decoded = await app.auth().verifyIdToken(idToken);
  return { ...decoded, sourceProject: aud };
};

// Devuelve el Firestore del proyecto que emitió el token del caller.
// Garantiza que los docs aterricen en el mismo proyecto desde el que se invocó.
const firestoreDelCaller = (user) => adminAppPara(user.sourceProject).firestore();

// ── HELPER: respuesta CORS ──
const enableCors = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
};

// ════════════════════════════════════════════════════════════════
// 1) apsObtenerUrlSubida
//    Genera una URL S3 firmada para que el frontend suba el .rvt
//    directo a Autodesk (sin pasar por nuestro servidor).
// ════════════════════════════════════════════════════════════════
exports.apsObtenerUrlSubida = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    await requireAuth(req);
    const { nombreArchivo } = req.body || req.query;
    if (!nombreArchivo) return res.status(400).json({ error: 'Falta nombreArchivo' });

    const token = await getToken();
    await asegurarBucket(token);

    // Object key únic: timestamp + nombre limpio
    const objectKey = `${Date.now()}_${nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const f = await fetch;
    const r = await f(
      `${APS_BASE}/oss/v2/buckets/${APS_BUCKET_KEY}/objects/${encodeURIComponent(objectKey)}/signeds3upload?minutesExpiration=60`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) throw new Error(`Signed URL failed: ${r.status} ${await r.text()}`);
    const data = await r.json();

    res.json({
      objectKey,
      bucketKey: APS_BUCKET_KEY,
      uploadKey: data.uploadKey,
      urls: data.urls,  // Array de URLs (1 o más para multipart)
    });
  } catch (err) {
    console.error('[apsObtenerUrlSubida]', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 2) apsCompletarSubida
//    El frontend ya subió las partes a S3. Aquí cerramos el upload
//    y arrancamos la traducción a SVF2 (formato del visor).
// ════════════════════════════════════════════════════════════════
exports.apsCompletarSubida = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    const user = await requireAuth(req);
    const { objectKey, uploadKey, nombreOriginal } = req.body;
    if (!objectKey || !uploadKey) return res.status(400).json({ error: 'Faltan objectKey o uploadKey' });

    const token = await getToken();
    const f = await fetch;

    // 1. Completar upload S3
    const completar = await f(
      `${APS_BASE}/oss/v2/buckets/${APS_BUCKET_KEY}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadKey }),
      }
    );
    if (!completar.ok) throw new Error(`Completar upload falló: ${completar.status} ${await completar.text()}`);
    const objData = await completar.json();
    const objectId = objData.objectId;  // urn:adsk.objects:os.object:bucket/object
    const urn = Buffer.from(objectId).toString('base64')
      .replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');

    // 2. Lanzar job de traducción a SVF2
    const job = await f(`${APS_BASE}/modelderivative/v2/designdata/job`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-ads-force': 'true',  // re-traducir si ya existía
      },
      body: JSON.stringify({
        input: { urn },
        output: {
          formats: [{ type: 'svf2', views: ['2d', '3d'] }],
        },
      }),
    });
    if (!job.ok) throw new Error(`Traducción falló: ${job.status} ${await job.text()}`);

    // 3. Devolver metadata al cliente para que ÉL escriba el doc en SU Firestore.
    //    Antes intentábamos escribir aquí con el Admin SDK, pero la SA de Functions vive
    //    en control-productividad-franklin y no tiene IAM sobre proyectos secundarios →
    //    PERMISSION_DENIED. El cliente sí está autenticado en el proyecto correcto y las
    //    rules permiten create a ingeniero/admin.
    res.json({
      urn,
      objectKey,
      objectId,
      bucketKey: APS_BUCKET_KEY,
      nombreOriginal,
      subidoPor: user.uid,
      subidoPorEmail: user.email || null,
      status: 'translation_started',
    });
  } catch (err) {
    console.error('[apsCompletarSubida]', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 3) apsConsultarManifest
//    Poll del estado de traducción. El frontend consulta cada
//    15-30 segundos hasta que el manifest esté "success".
// ════════════════════════════════════════════════════════════════
exports.apsConsultarManifest = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    await requireAuth(req);
    const urn = req.query.urn || req.body?.urn;
    if (!urn) return res.status(400).json({ error: 'Falta urn' });

    const token = await getToken();
    const f = await fetch;
    const r = await f(`${APS_BASE}/modelderivative/v2/designdata/${urn}/manifest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      if (r.status === 404) return res.json({ status: 'pending', progress: '0%' });
      throw new Error(`Manifest failed: ${r.status} ${await r.text()}`);
    }
    const data = await r.json();

    // Nota: ya NO actualizamos Firestore desde acá. El cliente lo hace con su credencial
    // en su propio proyecto (evita PERMISSION_DENIED por IAM entre proyectos).

    res.json({
      urn,
      status: data.status,    // pending | inprogress | success | failed | timeout
      progress: data.progress, // ej "complete" o "55% complete"
      derivatives: (data.derivatives || []).map(d => ({
        outputType: d.outputType, status: d.status, progress: d.progress,
      })),
    });
  } catch (err) {
    console.error('[apsConsultarManifest]', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 4) apsTokenViewer
//    Token público "viewables:read" para el SDK del visor en frontend.
//    Necesario porque el visor corre en el navegador del usuario.
// ════════════════════════════════════════════════════════════════
exports.apsTokenViewer = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    await requireAuth(req);
    if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) throw new Error('Credenciales APS no configuradas');

    const f = await fetch;
    const r = await f(`${APS_BASE}/authentication/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'viewables:read',  // alcance MÍNIMO solo para visor
      }),
    });
    if (!r.ok) throw new Error(`Token viewer falló: ${r.status} ${await r.text()}`);
    const data = await r.json();
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (err) {
    console.error('[apsTokenViewer]', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// ADMIN — gestion de usuarios (Bloque 13)
// ════════════════════════════════════════════════════════════════
const adminFns = require('./admin');
exports.adminCrearUsuario            = adminFns.adminCrearUsuario;
exports.adminCambiarRol              = adminFns.adminCambiarRol;
exports.adminDesactivarUsuario       = adminFns.adminDesactivarUsuario;
exports.adminEliminarUsuario         = adminFns.adminEliminarUsuario;
exports.adminSincronizarUsuariosAuth = adminFns.adminSincronizarUsuariosAuth;
exports.adminSincronizarClaims       = adminFns.adminSincronizarClaims;

// ════════════════════════════════════════════════════════════════
// 5) apsEliminarModelo
//    Borra el modelo del bucket APS y su entrada en Firestore.
// ════════════════════════════════════════════════════════════════
exports.apsEliminarModelo = functions.https.onRequest(async (req, res) => {
  if (enableCors(req, res)) return;
  try {
    await requireAuth(req);
    const { objectKey } = req.body;
    if (!objectKey) return res.status(400).json({ error: 'Falta objectKey' });

    const token = await getToken();
    const f = await fetch;
    // Borrar SOLO de APS bucket. El doc Firestore lo borra el cliente desde su proyecto.
    await f(`${APS_BASE}/oss/v2/buckets/${APS_BUCKET_KEY}/objects/${encodeURIComponent(objectKey)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[apsEliminarModelo]', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 6) protocoloPdfFirmadoSync (Storage trigger)
//    Cuando se sube un PDF firmado a protocolos-firmados/{tipo}/{frente}/{semana}/
//    lo sincroniza a Google Drive + Google Sheets de control.
//    Definido en módulo separado para no contaminar este archivo.
// ════════════════════════════════════════════════════════════════
const archivado = require('./protocolosArchivado');
exports.protocoloPdfFirmadoSync = archivado.protocoloPdfFirmadoSync;
