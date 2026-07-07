// functions/arGlb.js — Conversión de modelos BIM a GLB para realidad aumentada (AR)
//
// Flujo (espejo del patrón APS existente: el cliente hace polling, el server es stateless):
//   1. apsGenerarGlb  → pide a APS Model Derivative un export OBJ del modelo (job asíncrono)
//   2. apsEstadoGlb   → consulta el manifest; cuando el OBJ está listo lo descarga,
//                       lo convierte a GLB (obj2gltf + compresión Draco) y lo sube a
//                       Firebase Storage en bim-ar/{urn}.glb. Idempotente: si el GLB
//                       ya existe en Storage, devuelve su URL sin reconvertir.
//
// El doc de BIM_Modelos lo actualiza el CLIENTE (patrón de la casa, ver apsClient.js):
// aquí solo devolvemos { status, glbUrl, glbPath } y el archivo queda en Storage.
//
// 2nd Gen (firebase-functions/v2): la conversión necesita memoria y timeout que
// 1st Gen no da (modelos OBJ de cientos de MB). Mismo host URL que las 1st Gen:
// https://us-central1-grapco-demo-2026.cloudfunctions.net/<nombre>

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

if (!admin.apps.length) admin.initializeApp();

const APS_CLIENT_ID     = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_BASE          = 'https://developer.api.autodesk.com';

// ── Helpers duplicados de index.js (convención del repo: cada módulo es autónomo,
//    igual que admin.js duplica enableCors) ──
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
      scope: 'data:read data:write viewables:read',
    }),
  });
  if (!res.ok) throw new Error(`APS auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  _token.value = data.access_token;
  _token.expiresAt = Date.now() + (data.expires_in * 1000);
  return _token.value;
};

const PROYECTOS_PERMITIDOS = ['control-productividad-franklin', 'grapco-demo-2026'];

const adminAppPara = (projectId) => {
  if (projectId === admin.app().options.projectId) return admin.app();
  try { return admin.app(projectId); } catch { /* aún no existe */ }
  return admin.initializeApp({ projectId }, projectId);
};

const requireAuth = async (req) => {
  const authHeader = req.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) throw new Error('No autenticado');
  let payload;
  try {
    const partes = idToken.split('.');
    if (partes.length !== 3) throw new Error('Token con formato inválido');
    payload = JSON.parse(Buffer.from(partes[1], 'base64').toString('utf8'));
  } catch {
    throw new Error('Token mal formado');
  }
  const aud = payload.aud;
  if (!PROYECTOS_PERMITIDOS.includes(aud)) throw new Error(`Proyecto no permitido: ${aud}`);
  const app = adminAppPara(aud);
  const decoded = await app.auth().verifyIdToken(idToken);
  return { ...decoded, sourceProject: aud };
};

const enableCors = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
};

// ── Helpers propios del pipeline GLB ──

// Vista 3D principal del modelo (guid requerido por el export OBJ)
const obtenerGuid3d = async (urn, token) => {
  const f = await fetch;
  const r = await f(`${APS_BASE}/modelderivative/v2/designdata/${urn}/metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Metadata falló: ${r.status} ${await r.text()}`);
  const data = await r.json();
  const vistas = data?.data?.metadata || [];
  const v3d = vistas.find(v => v.role === '3d') || vistas[0];
  if (!v3d?.guid) throw new Error('El modelo no tiene vista 3D exportable');
  return v3d.guid;
};

// Derivative OBJ dentro del manifest (o null si no se ha pedido aún)
const buscarDerivativeObj = (manifest) =>
  (manifest.derivatives || []).find(d => d.outputType === 'obj') || null;

// Descarga un derivative por el flujo moderno de signed cookies de CloudFront
const descargarDerivative = async (urn, derivativeUrn, destino, token) => {
  const f = await fetch;
  const firmado = await f(
    `${APS_BASE}/modelderivative/v2/designdata/${urn}/manifest/${encodeURIComponent(derivativeUrn)}/signedcookies`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!firmado.ok) throw new Error(`signedcookies falló: ${firmado.status} ${await firmado.text()}`);
  const { url } = await firmado.json();
  const cookies = (firmado.headers.raw()['set-cookie'] || [])
    .map(c => c.split(';')[0]).join('; ');
  const archivo = await f(url, { headers: { Cookie: cookies } });
  if (!archivo.ok) throw new Error(`Descarga derivative falló: ${archivo.status}`);
  const buffer = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(destino, buffer);
  return buffer.length;
};

// URL pública estilo Firebase (token de descarga en query, no requiere header de auth
// → funciona como src de <model-viewer> y para Scene Viewer)
const subirGlbAStorage = async (glbBuffer, storagePath) => {
  const bucket = admin.storage().bucket();
  const downloadToken = crypto.randomUUID();
  await bucket.file(storagePath).save(glbBuffer, {
    contentType: 'model/gltf-binary',
    metadata: {
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
};

// Si el GLB ya existe en Storage devuelve su URL (reconstruida del token guardado)
const glbExistente = async (storagePath) => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const [existe] = await file.exists();
  if (!existe) return null;
  const [meta] = await file.getMetadata();
  const token = meta?.metadata?.firebaseStorageDownloadTokens;
  if (!token) return null;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
};

// OBJ (+MTL) → GLB. Compresión Draco best-effort: si falla, GLB plano.
const convertirObjAGlb = async (objPath) => {
  const obj2gltf = require('obj2gltf');
  let glb = await obj2gltf(objPath, { binary: true });
  try {
    const { processGlb } = require('gltf-pipeline');
    const r = await processGlb(glb, { dracoOptions: { compressionLevel: 7 } });
    glb = Buffer.from(r.glb);
  } catch (err) {
    console.warn('[arGlb] Draco falló, se usa GLB sin comprimir:', err.message);
  }
  return Buffer.isBuffer(glb) ? glb : Buffer.from(glb);
};

// ════════════════════════════════════════════════════════════════
// apsGenerarGlb — lanza el job de export OBJ del modelo completo.
// Body: { urn }. Idempotente: si el OBJ ya existe/está en curso, APS
// responde igual y el estado se lee por apsEstadoGlb.
// ════════════════════════════════════════════════════════════════
exports.apsGenerarGlb = onRequest(
  { region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', invoker: 'public' },
  async (req, res) => {
    if (enableCors(req, res)) return;
    try {
      await requireAuth(req);
      const { urn } = req.body || {};
      if (!urn) return res.status(400).json({ error: 'Falta urn' });

      const token = await getToken();
      const guid = await obtenerGuid3d(urn, token);

      const f = await fetch;
      const job = await f(`${APS_BASE}/modelderivative/v2/designdata/job`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { urn },
          output: {
            formats: [{
              type: 'obj',
              advanced: { modelGuid: guid, objectIds: [-1] },  // -1 = modelo completo
            }],
          },
        }),
      });
      // 409/"already" = el export ya existía: no es error, el estado lo dirá el manifest
      if (!job.ok && job.status !== 409) {
        throw new Error(`Export OBJ falló: ${job.status} ${await job.text()}`);
      }

      res.json({ status: 'exportando', progress: '0%' });
    } catch (err) {
      console.error('[apsGenerarGlb]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ════════════════════════════════════════════════════════════════
// apsEstadoGlb — GET ?urn=...
// Devuelve { status: 'success', glbUrl } si el GLB ya está en Storage.
// Si el export OBJ terminó, convierte aquí mismo (por eso 4GiB / 540s)
// y sube el GLB. Si sigue en curso: { status: 'exportando', progress }.
// ════════════════════════════════════════════════════════════════
exports.apsEstadoGlb = onRequest(
  { region: 'us-central1', timeoutSeconds: 540, memory: '4GiB', invoker: 'public' },
  async (req, res) => {
    if (enableCors(req, res)) return;
    try {
      await requireAuth(req);
      const urn = req.query.urn || req.body?.urn;
      if (!urn) return res.status(400).json({ error: 'Falta urn' });

      const storagePath = `bim-ar/${urn}.glb`;

      // 1) ¿Ya está convertido? (idempotencia sin estado en Firestore)
      const urlExistente = await glbExistente(storagePath);
      if (urlExistente) {
        return res.json({ status: 'success', glbUrl: urlExistente, glbPath: storagePath });
      }

      // 2) Estado del export OBJ en el manifest
      const token = await getToken();
      const f = await fetch;
      const r = await f(`${APS_BASE}/modelderivative/v2/designdata/${urn}/manifest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        if (r.status === 404) return res.json({ status: 'sin_traduccion' });
        throw new Error(`Manifest falló: ${r.status} ${await r.text()}`);
      }
      const manifest = await r.json();
      const derObj = buscarDerivativeObj(manifest);

      if (!derObj) return res.json({ status: 'sin_export' });
      if (derObj.status === 'failed') {
        return res.json({ status: 'failed', error: 'El export OBJ falló en APS' });
      }
      if (derObj.status !== 'success') {
        return res.json({ status: 'exportando', progress: derObj.progress || 'en curso' });
      }

      // 3) OBJ listo → descargar (.obj + .mtl), convertir y subir
      const hijos = derObj.children || [];
      const hijoObj = hijos.find(h => (h.urn || '').toLowerCase().endsWith('.obj'));
      const hijoMtl = hijos.find(h => (h.urn || '').toLowerCase().endsWith('.mtl'));
      if (!hijoObj) return res.json({ status: 'failed', error: 'Export OBJ sin archivo .obj en manifest' });

      const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bim-ar-'));
      const objPath = path.join(dirTmp, 'modelo.obj');
      try {
        const bytesObj = await descargarDerivative(urn, hijoObj.urn, objPath, token);
        console.log(`[apsEstadoGlb] OBJ descargado: ${(bytesObj / 1e6).toFixed(1)} MB`);
        if (hijoMtl) {
          // obj2gltf busca el .mtl por el nombre declarado dentro del .obj (mtllib)
          const declarado = (fs.readFileSync(objPath, 'utf8').match(/^mtllib\s+(.+)$/m) || [])[1];
          const mtlPath = path.join(dirTmp, (declarado || 'modelo.mtl').trim());
          await descargarDerivative(urn, hijoMtl.urn, mtlPath, token);
        }

        const glb = await convertirObjAGlb(objPath);
        console.log(`[apsEstadoGlb] GLB generado: ${(glb.length / 1e6).toFixed(1)} MB`);
        const glbUrl = await subirGlbAStorage(glb, storagePath);

        res.json({
          status: 'success',
          glbUrl,
          glbPath: storagePath,
          tamanoMB: +(glb.length / 1e6).toFixed(1),
        });
      } finally {
        fs.rmSync(dirTmp, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('[apsEstadoGlb]', err);
      res.status(500).json({ error: err.message });
    }
  }
);
