// functions/bimProps.js — Extracción TOTAL de parámetros del modelo Revit (server-side)
//
// Problema que resuelve: el frontend extraía solo 4 propiedades desde el visor con
// regex frágiles (falsos positivos de volumen, unidades imperiales leídas como
// métricas). Aquí se leen TODOS los parámetros de TODOS los elementos vía la
// Model Derivative API (metadata/{guid}/properties + jerarquía para categorías),
// se compactan (diccionario de strings, formato columnar ~10-20× más chico) y se
// cachean en Storage como bim-props/{urn}-v1.json.gz. Inmutable por URN.
//
// apsExtraerPropiedades (POST { urn, force? } o GET ?urn=):
//   → { status: 'ready', url, stats }          GLB de datos listo (URL tokenizada)
//   → { status: 'procesando' }                 APS aún prepara el JSON (cliente reintenta)
//   → { status: 'sin_traduccion' | 'error' }
//
// Patrón de la casa: onRequest 2nd Gen + enableCors + requireAuth manual; el
// cliente hace polling (igual que la traducción SVF2 y el GLB de AR).

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const zlib = require('zlib');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

if (!admin.apps.length) admin.initializeApp();

const APS_CLIENT_ID     = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_BASE          = 'https://developer.api.autodesk.com';

// ── Helpers duplicados de index.js (convención: cada módulo es autónomo) ──
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
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'data:read' }),
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

// ── Parseo de valores: fidelidad primero ──
// Los valores llegan como strings ("336.94 ft²", "Concreto f'c=210", "2.5").
// Un número se guarda como número + unidad ORIGINAL (sin convertir: lo que dice
// Revit es lo real). Solo las quantities canónicas (q) se convierten a métrico.
const RX_NUM = /^(-?[\d.]+(?:e[+-]?\d+)?)\s*(.*)$/i;
const parseValor = (v) => {
  if (typeof v === 'number') return { num: v, unidad: '' };
  const s = String(v ?? '').trim();
  if (!s) return null;
  const m = s.match(RX_NUM);
  if (m && m[1] !== '' && !isNaN(+m[1]) && m[2].length <= 6) return { num: +m[1], unidad: m[2] };
  return { str: s };
};

// Conversión a métrico SOLO para quantities canónicas
const A_METRICO = {
  vol:  { 'm³': 1, 'm3': 1, 'ft³': 0.0283168, 'ft3': 0.0283168, 'CF': 0.0283168, 'cm³': 1e-6, 'mm³': 1e-9, 'l': 0.001, '': 1 },
  area: { 'm²': 1, 'm2': 1, 'ft²': 0.092903, 'ft2': 0.092903, 'SF': 0.092903, 'cm²': 1e-4, 'mm²': 1e-6, '': 1 },
  len:  { 'm': 1, 'ft': 0.3048, "'": 0.3048, 'in': 0.0254, '"': 0.0254, 'cm': 0.01, 'mm': 0.001, '': 1 },
};
const aMetrico = (tipo, num, unidad) => {
  const f = A_METRICO[tipo][unidad] ?? A_METRICO[tipo][unidad?.toLowerCase?.()] ?? null;
  return f == null ? null : num * f;
};

const RX_Q = {
  vol:   [/^volumen$/i, /^volume$/i],
  area:  [/^[áa]rea$/i, /^area$/i],
  len:   [/^longitud$/i, /^length$/i],
  nivel: [/^nivel$/i, /^level$/i, /^nivel base$/i, /^base level$/i, /^base constraint$/i, /^restricci[óo]n de base$/i, /^reference level$/i, /^nivel de referencia$/i, /^schedule level$/i],
};
// Grupos donde las quantities son confiables (evita "Área de sección" de refuerzos, etc.)
const RX_GRUPO_DIM = /cotas|dimension/i;

// ── Descarga con manejo de 202 (APS prepara el recurso en background) ──
const getJson202 = async (url, token) => {
  const f = await fetch;
  const r = await f(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 202) return { procesando: true };
  if (!r.ok) throw new Error(`${url.split('/designdata/')[1]?.slice(0, 40)} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return { data: await r.json() };
};

// ════════════════════════════════════════════════════════════════
// apsExtraerPropiedades
// ════════════════════════════════════════════════════════════════
exports.apsExtraerPropiedades = onRequest(
  { region: 'us-central1', timeoutSeconds: 300, memory: '2GiB', invoker: 'public' },
  async (req, res) => {
    if (enableCors(req, res)) return;
    try {
      await requireAuth(req);
      const urn = req.query.urn || req.body?.urn;
      const force = req.body?.force === true;
      if (!urn) return res.status(400).json({ error: 'Falta urn' });

      const bucket = admin.storage().bucket();
      const storagePath = `bim-props/${urn}-v1.json.gz`;
      const file = bucket.file(storagePath);

      // 1) Caché: inmutable por URN
      if (!force) {
        const [existe] = await file.exists();
        if (existe) {
          const [meta] = await file.getMetadata();
          const token = meta?.metadata?.firebaseStorageDownloadTokens;
          if (token) {
            return res.json({
              status: 'ready',
              url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
              stats: JSON.parse(meta?.metadata?.stats || '{}'),
            });
          }
        }
      }

      const token = await getToken();

      // 2) Vista 3D (master view = todos los elementos, si existe)
      const met = await getJson202(`${APS_BASE}/modelderivative/v2/designdata/${urn}/metadata`, token);
      if (met.procesando) return res.json({ status: 'procesando' });
      const vistas = met.data?.data?.metadata || [];
      if (!vistas.length) return res.json({ status: 'sin_traduccion' });
      const v3d = vistas.find(v => v.role === '3d' && v.isMasterView) || vistas.find(v => v.role === '3d') || vistas[0];
      const guid = v3d.guid;

      // 3) Jerarquía (para categoría/tipo reales) + propiedades (todo el modelo)
      const jer = await getJson202(`${APS_BASE}/modelderivative/v2/designdata/${urn}/metadata/${guid}?forceget=true`, token);
      if (jer.procesando) return res.json({ status: 'procesando' });
      const props = await getJson202(`${APS_BASE}/modelderivative/v2/designdata/${urn}/metadata/${guid}/properties?forceget=true`, token);
      if (props.procesando) return res.json({ status: 'procesando' });

      // 4) Categoría y tipo por objectid desde la jerarquía Revit:
      //    root → Categoría → Familia → Tipo → instancias (hojas)
      const catPorId = {};   // objectid → { cat, tipo }
      const hojas = new Set();
      const raiz = jer.data?.data?.objects?.[0];
      const caminar = (nodo, camino) => {
        const hijos = nodo.objects || [];
        if (!hijos.length) {
          hojas.add(nodo.objectid);
          catPorId[nodo.objectid] = {
            cat: camino[0] || 'Sin categoría',
            tipo: camino[camino.length - 1] || nodo.name || 'Sin tipo',
          };
          return;
        }
        hijos.forEach(h => caminar(h, [...camino, nodo.name]));
      };
      (raiz?.objects || []).forEach(catNodo => caminar(catNodo, []));

      // 5) Reducción columnar con diccionario de strings
      const strings = [];
      const strIdx = new Map();
      const S = (s) => {
        const k = String(s ?? '');
        let i = strIdx.get(k);
        if (i === undefined) { i = strings.length; strings.push(k); strIdx.set(k, i); }
        return i;
      };
      const params = [];            // [{ g, n, t, u }]
      const paramIdx = new Map();   // "grupo||nombre||t" → idx
      const P = (grupo, nombre, tipo, unidad) => {
        const k = `${grupo}||${nombre}||${tipo}`;
        let i = paramIdx.get(k);
        if (i === undefined) {
          i = params.length;
          params.push({ g: S(grupo), n: S(nombre), t: tipo, ...(unidad ? { u: unidad } : {}) });
          paramIdx.set(k, i);
        }
        return i;
      };

      const elems = [];
      const coleccion = props.data?.data?.collection || [];
      for (const obj of coleccion) {
        if (!hojas.has(obj.objectid)) continue;  // solo elementos reales
        const info = catPorId[obj.objectid] || { cat: 'Sin categoría', tipo: 'Sin tipo' };
        const q = { vol: 0, area: 0, len: 0, nivel: '' };
        const pares = [];
        for (const [grupo, propsGrupo] of Object.entries(obj.properties || {})) {
          for (const [nombre, valor] of Object.entries(propsGrupo || {})) {
            const v = parseValor(valor);
            if (!v) continue;
            if (v.num !== undefined) {
              pares.push([P(grupo, nombre, 'n', v.unidad), v.num]);
              // quantities canónicas: nombre exacto y, si aplica, grupo de cotas primero
              const esDim = RX_GRUPO_DIM.test(grupo);
              for (const [qk, rxs] of [['vol', RX_Q.vol], ['area', RX_Q.area], ['len', RX_Q.len]]) {
                if (rxs.some(rx => rx.test(nombre))) {
                  const metrico = aMetrico(qk, v.num, v.unidad);
                  if (metrico != null && (esDim || q[qk] === 0)) q[qk] = metrico;
                }
              }
            } else {
              pares.push([P(grupo, nombre, 's'), S(v.str)]);
              if (!q.nivel && RX_Q.nivel.some(rx => rx.test(nombre))) q.nivel = v.str;
            }
          }
        }
        elems.push({
          id: obj.objectid,
          x: obj.externalId || '',
          nm: S(obj.name || `#${obj.objectid}`),
          cat: S(info.cat),
          tipo: S(info.tipo),
          q: { vol: +q.vol.toFixed(4), area: +q.area.toFixed(4), len: +q.len.toFixed(4), nivel: S(q.nivel || 'Sin nivel') },
          p: pares,
        });
      }

      if (!elems.length) return res.json({ status: 'error', error: 'El modelo no devolvió elementos con propiedades' });

      // 6) Gzip + Storage con token de descarga
      const payload = {
        v: 1, urn, guid, extraidoEn: new Date().toISOString(),
        strings, params, elems,
      };
      const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 9 });
      const stats = { elems: elems.length, params: params.length, bytesGz: gz.length };
      const downloadToken = crypto.randomUUID();
      await file.save(gz, {
        contentType: 'application/json',
        metadata: {
          contentEncoding: 'gzip',   // el navegador descomprime transparente
          cacheControl: 'public, max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: downloadToken, stats: JSON.stringify(stats) },
        },
      });
      console.log(`[apsExtraerPropiedades] ${urn.slice(0, 20)}… → ${stats.elems} elems, ${stats.params} params, ${(gz.length / 1e6).toFixed(1)} MB gz`);

      res.json({
        status: 'ready',
        url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`,
        stats,
      });
    } catch (err) {
      console.error('[apsExtraerPropiedades]', err);
      res.status(500).json({ error: err.message });
    }
  }
);
