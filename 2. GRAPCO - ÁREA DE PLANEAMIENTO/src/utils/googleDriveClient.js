// src/utils/googleDriveClient.js
// ════════════════════════════════════════════════════════════════
// Subida de archivos a Google Drive DESDE EL NAVEGADOR, con la sesión
// del propio usuario (Google Identity Services — token flow).
//
// Costo $0: usa el espacio de Drive del usuario (no una Service Account,
// que no tiene cuota). El archivo queda como propiedad del usuario.
//
// Requiere un OAuth Client ID (tipo "Web") creado en Google Cloud Console,
// con los orígenes JS autorizados (grapco-demo-2026.web.app, localhost).
// Se configura en VITE_GOOGLE_OAUTH_CLIENT_ID.
//
// Scope: drive.file → la app SOLO ve/gestiona los archivos que ella misma crea
// (mínimo privilegio; no toca el resto del Drive del usuario).
// ════════════════════════════════════════════════════════════════

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
// Client ID OAuth (Web) — es PÚBLICO (va en el frontend), no es secreto.
// Reutiliza el "Web client (auto created by Google Service)" del proyecto,
// con grapco-demo-2026.web.app agregado a los orígenes JS autorizados.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID
  || '144261762944-o7kg2c862f02lv0her0rvrtgp1c7b12u.apps.googleusercontent.com';

let _tokenClient = null;
let _accessToken = null;
let _tokenExpira = 0;

// ── Carga la librería GIS una sola vez ──
function cargarGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(s);
  });
}

export function driveConfigurado() {
  return !!CLIENT_ID;
}

export function driveConectado() {
  return !!_accessToken && Date.now() < _tokenExpira - 60_000;
}

// ── Conecta con Drive: pide el token al usuario (popup la 1ª vez) ──
export async function conectarDrive({ interactivo = true } = {}) {
  if (!CLIENT_ID) throw new Error('Falta configurar el OAuth Client ID (VITE_GOOGLE_OAUTH_CLIENT_ID)');
  if (driveConectado()) return _accessToken;
  await cargarGIS();
  return new Promise((resolve, reject) => {
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        _accessToken = resp.access_token;
        _tokenExpira = Date.now() + (Number(resp.expires_in || 3600) * 1000);
        resolve(_accessToken);
      },
      error_callback: (err) => reject(new Error(err?.message || 'Autorización cancelada')),
    });
    // prompt:'' → no vuelve a molestar si el usuario ya autorizó en esta sesión
    _tokenClient.requestAccessToken({ prompt: interactivo ? 'consent' : '' });
  });
}

// ── Helpers de carpetas ──
async function driveFetch(token, path, opts = {}) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`Drive ${r.status}: ${await r.text()}`);
  return r.json();
}

async function buscarCarpeta(token, nombre, parentId) {
  const esc = nombre.replace(/'/g, "\\'");
  let q = `name='${esc}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const d = await driveFetch(token, `files?q=${encodeURIComponent(q)}&fields=files(id)`);
  return d.files?.[0]?.id || null;
}

async function crearCarpeta(token, nombre, parentId) {
  const body = { name: nombre, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const d = await driveFetch(token, 'files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return d.id;
}

// Asegura una jerarquía de carpetas (array de nombres) y devuelve el id de la última.
export async function asegurarRuta(token, nombres) {
  let parent = null;
  for (const n of nombres) {
    parent = (await buscarCarpeta(token, n, parent)) || (await crearCarpeta(token, n, parent));
  }
  return parent;
}

// ── Sube (o reemplaza) un PDF dentro de folderId. Devuelve {id, webViewLink} ──
export async function subirPdf(token, nombreArchivo, folderId, blob) {
  const esc = nombreArchivo.replace(/'/g, "\\'");
  const existe = await driveFetch(
    token, `files?q=${encodeURIComponent(`name='${esc}' and '${folderId}' in parents and trashed=false`)}&fields=files(id)`
  ).then(d => d.files?.[0]?.id || null).catch(() => null);

  const metadata = existe ? { name: nombreArchivo } : { name: nombreArchivo, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob, nombreArchivo);

  const base = 'https://www.googleapis.com/upload/drive/v3/files';
  const url = existe
    ? `${base}/${existe}?uploadType=multipart&fields=id,webViewLink`
    : `${base}?uploadType=multipart&fields=id,webViewLink`;
  const r = await fetch(url, {
    method: existe ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!r.ok) throw new Error(`Drive subir PDF ${r.status}: ${await r.text()}`);
  return r.json();
}

// ── Flujo completo: conectar (si hace falta) → asegurar ruta → subir PDF ──
// rutaNombres: p.ej. ['1. PROTOCOLOS', '1.1 FRENTE 1 - PTARI 5', '1.1.1 SEMANA 23']
export async function archivarPdfEnDrive({ rutaNombres, nombreArchivo, blob }) {
  const token = await conectarDrive({ interactivo: !driveConectado() });
  const folderId = await asegurarRuta(token, rutaNombres);
  const file = await subirPdf(token, nombreArchivo, folderId, blob);
  return { ...file, url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view` };
}
