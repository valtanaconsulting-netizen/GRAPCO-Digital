// functions/protocolosArchivado.js
// ════════════════════════════════════════════════════════════════
// Cloud Function: archivado de protocolos firmados en Google Drive.
//
// Trigger: onObjectFinalized en Firebase Storage,
//          path = protocolos-firmados/{tipo}/{frenteCodigo}/{semanaISO}/{numeroRegistro}.pdf
//
// Estructura destino en Drive (NOMENCLATURA NUMERADA GRAPCO):
//
//   1. PROTOCOLOS                              ← carpeta raíz (DRIVE_ROOT_FOLDER_ID)
//     └─ 1.{orden} FRENTE {orden} - {nombre}   ← p.ej. "1.1 FRENTE 1 - MEZANINE"
//          └─ 1.{orden}.{m} SEMANA {n}         ← p.ej. "1.1.1 SEMANA 40"
//               └─ {numeroRegistro}.pdf
//
//   • {orden} y {nombre} salen del doc Firestore del frente (colección "Frentes").
//   • {m} = orden de aparición de la semana dentro del frente (1, 2, 3…).
//   • {n} = número de semana ISO (de semanaISO, p.ej. "2026-W40" → 40).
//
// Idempotente: si la carpeta/archivo ya existen, los reutiliza/reemplaza.
//
// Secrets requeridos (firebase functions:secrets:set):
//   GOOGLE_SA_KEY        → JSON entero de la Service Account (protocolos-bot@…)
//   DRIVE_ROOT_FOLDER_ID → ID de la carpeta raíz "1. PROTOCOLOS" (compartida con la SA)
//
// NOTA: el índice en Google Sheets se hará en una 2ª fase (aquí solo Drive).
// ════════════════════════════════════════════════════════════════

const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const { Readable } = require('stream');

if (!admin.apps.length) admin.initializeApp();

const GOOGLE_SA_KEY        = defineSecret('GOOGLE_SA_KEY');
const DRIVE_ROOT_FOLDER_ID = defineSecret('DRIVE_ROOT_FOLDER_ID');

// Bucket explícito del proyecto (evita ambigüedad del bucket default en Functions v2).
const STORAGE_BUCKET = 'grapco-demo-2026.firebasestorage.app';

// ════════════════════════════════════════════════════════════════
// Cliente Drive autenticado con la Service Account.
// ════════════════════════════════════════════════════════════════
function driveClient() {
  const credentials = JSON.parse(GOOGLE_SA_KEY.value());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

// Lista las subcarpetas (no-trashed) de un parent.
async function listarSubcarpetas(drive, parentId) {
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q, fields: 'files(id,name)', pageSize: 1000,
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  return res.data.files || [];
}

async function crearCarpeta(drive, nombre, parentId) {
  const created = await drive.files.create({
    requestBody: { name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id,name', supportsAllDrives: true,
  });
  return created.data.id;
}

// ════════════════════════════════════════════════════════════════
// Asegura la carpeta del FRENTE: "1.{orden} FRENTE {orden} - {nombre}".
// La identifica por su etiqueta legible (ignora el prefijo numérico) para
// no duplicar si alguien la renombró o si cambia el prefijo.
// ════════════════════════════════════════════════════════════════
async function asegurarFrente(drive, rootId, ordenFrente, nombreFrente) {
  const etiqueta = `FRENTE ${ordenFrente} - ${nombreFrente}`.trim();
  const subs = await listarSubcarpetas(drive, rootId);
  const existe = subs.find(f => f.name.includes(etiqueta));
  if (existe) return existe.id;
  return crearCarpeta(drive, `1.${ordenFrente} ${etiqueta}`, rootId);
}

// ════════════════════════════════════════════════════════════════
// Asegura la carpeta de la SEMANA: "1.{orden}.{m} SEMANA {n}".
// m = orden de aparición (cantidad de semanas ya existentes + 1).
// Reutiliza si ya existe una carpeta para "SEMANA {n}".
// ════════════════════════════════════════════════════════════════
async function asegurarSemana(drive, frenteFolderId, ordenFrente, numSemana) {
  const etiqueta = `SEMANA ${numSemana}`;
  const subs = await listarSubcarpetas(drive, frenteFolderId);
  const existe = subs.find(f => f.name.includes(etiqueta));
  if (existe) return existe.id;
  const m = subs.length + 1;
  return crearCarpeta(drive, `1.${ordenFrente}.${m} ${etiqueta}`, frenteFolderId);
}

// Sube (o reemplaza si ya existe) un PDF dentro de parentId. Idempotente por nombre.
async function subirOSobrescribirPDF(drive, fileName, parentId, buffer) {
  const safe = fileName.replace(/'/g, "\\'");
  const q = `name='${safe}' and '${parentId}' in parents and trashed=false`;
  const list = await drive.files.list({
    q, fields: 'files(id)', supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  const media = { mimeType: 'application/pdf', body: Readable.from(buffer) };
  if (list.data.files?.length) {
    const fileId = list.data.files[0].id;
    const upd = await drive.files.update({ fileId, media, fields: 'id,webViewLink', supportsAllDrives: true });
    return upd.data;
  }
  const c = await drive.files.create({
    requestBody: { name: fileName, parents: [parentId] },
    media, fields: 'id,webViewLink', supportsAllDrives: true,
  });
  return c.data;
}

// Extrae el número de semana de un semanaISO ("2026-W40" → 40, "40" → 40).
function numeroDeSemana(semanaISO) {
  const m = String(semanaISO || '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : (semanaISO || '');
}

// ════════════════════════════════════════════════════════════════
// Main: trigger
// ════════════════════════════════════════════════════════════════
exports.protocoloPdfFirmadoSync = onObjectFinalized(
  {
    region: 'us-east1',  // DEBE coincidir con la región del bucket de Storage (us-east1)
    bucket: STORAGE_BUCKET,
    timeoutSeconds: 120,
    memory: '512MiB',
    retry: true,
    secrets: [GOOGLE_SA_KEY, DRIVE_ROOT_FOLDER_ID],
  },
  async (event) => {
    const obj = event.data;
    const path = obj.name;

    // 1. Filtrar: solo PDFs bajo protocolos-firmados/
    if (!path || !path.startsWith('protocolos-firmados/')) return;
    if (!path.endsWith('.pdf')) return;

    const parts = path.split('/');
    if (parts.length !== 5) {
      console.warn('[archivado] path inesperado, ignorando:', path);
      return;
    }
    const [, /* tipo */, frenteCodigo, semanaISO, fileName] = parts;
    const numeroRegistro = fileName.replace(/\.pdf$/i, '');

    console.log('[archivado] inicia', { numeroRegistro, frenteCodigo, semanaISO });

    const db = admin.firestore();
    const bucket = admin.storage().bucket(obj.bucket);

    // 2. Buscar el doc del protocolo por numeroRegistro
    const snap = await db.collection('Protocolos')
      .where('numeroRegistro', '==', numeroRegistro)
      .limit(1).get();
    if (snap.empty) {
      console.warn('[archivado] sin doc Firestore para', numeroRegistro);
      return; // el doc no existe → no reintentar
    }
    const docRef = snap.docs[0].ref;
    const data = snap.docs[0].data();

    try {
      const drive  = driveClient();
      const rootId = DRIVE_ROOT_FOLDER_ID.value();

      // 3. Resolver datos legibles del frente desde la colección "Frentes"
      let ordenFrente = 0;
      let nombreFrente = frenteCodigo;
      if (data.frenteId) {
        const fSnap = await db.collection('Frentes').doc(data.frenteId).get();
        if (fSnap.exists) {
          const f = fSnap.data();
          ordenFrente  = f.orden || 0;
          nombreFrente = f.nombre || frenteCodigo;
        }
      }
      const numSemana = numeroDeSemana(semanaISO);

      // 4. Asegurar jerarquía en Drive: 1. PROTOCOLOS / frente / semana
      const fFrente = await asegurarFrente(drive, rootId, ordenFrente, nombreFrente);
      const fSemana = await asegurarSemana(drive, fFrente, ordenFrente, numSemana);

      // 5. Descargar el PDF de Storage y subirlo a Drive
      const [pdfBuffer] = await bucket.file(path).download();
      const driveFile = await subirOSobrescribirPDF(drive, fileName, fSemana, pdfBuffer);
      const driveUrl  = driveFile.webViewLink
                     || `https://drive.google.com/file/d/${driveFile.id}/view`;

      // 6. Registrar el resultado en Firestore (archivado.drive)
      await docRef.update({
        'archivado.drive': {
          fileId: driveFile.id,
          url:    driveUrl,
          path:   `1. PROTOCOLOS/1.${ordenFrente} FRENTE ${ordenFrente} - ${nombreFrente}/1.${ordenFrente}.x SEMANA ${numSemana}/${fileName}`,
          fechaCargado: new Date().toISOString(),
        },
        'archivado.error': admin.firestore.FieldValue.delete(),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('[archivado] OK', { numeroRegistro, drive: driveUrl });
    } catch (e) {
      console.error('[archivado] ERROR', numeroRegistro, e);
      // Guardar el error en Firestore para que la UI de Calidad lo muestre.
      await docRef.update({
        'archivado.error': {
          mensaje: e.message || String(e),
          fecha:   new Date().toISOString(),
          paso:    e.step || 'drive',
        },
      }).catch(err2 => console.warn('[archivado] no pude escribir error', err2.message));
      throw e; // re-lanzar para que Firebase reintente
    }
  }
);
