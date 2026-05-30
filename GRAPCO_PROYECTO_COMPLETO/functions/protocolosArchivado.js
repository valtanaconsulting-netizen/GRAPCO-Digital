// functions/protocolosArchivado.js
// ════════════════════════════════════════════════════════════════
// Cloud Function: triple archivado de protocolos firmados.
//
// Trigger: onObjectFinalized en Firebase Storage,
//          path = protocolos-firmados/{tipo}/{frente}/{semana}/{numeroRegistro}.pdf
//
// Acciones:
//   1. Busca el doc del protocolo en Firestore por `numeroRegistro`
//   2. Sube el mismo PDF a Google Drive (crea jerarquía Tipo/Frente/Semana)
//   3. Hace append de una fila al Google Sheet de control
//   4. Actualiza Firestore con `archivado.drive` y `archivado.sheet`
//
// Reintentos:
//   - Firebase v2 hace 3 reintentos automáticos (configurado con retry: true)
//   - Si Drive falla pero Sheets ya pasó, no se duplica (idempotente por numeroRegistro)
//   - Si todo falla, se escribe `archivado.error` en Firestore para que la
//     UI de Calidad pueda mostrar la alerta
//
// Secrets requeridos (firebase functions:secrets:set):
//   GOOGLE_SA_KEY            → JSON entero de la Service Account
//   DRIVE_ROOT_FOLDER_ID     → ID de la carpeta raíz en Drive (compartida con la SA)
//   SHEET_CONTROL_ID         → ID del Google Sheet de control (compartido con la SA)
// ════════════════════════════════════════════════════════════════

const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');

if (!admin.apps.length) admin.initializeApp();

const GOOGLE_SA_KEY        = defineSecret('GOOGLE_SA_KEY');
const DRIVE_ROOT_FOLDER_ID = defineSecret('DRIVE_ROOT_FOLDER_ID');
const SHEET_CONTROL_ID     = defineSecret('SHEET_CONTROL_ID');

// Nombre del rango en el Sheet (la pestaña + columnas A..N).
// Si tu pestaña se llama distinto, ajustar aquí.
const SHEET_RANGE = 'Protocolos!A:N';

// Etiquetas amigables por tipo (para nombre de carpeta en Drive)
const TIPO_NOMBRE = {
  prevaciado: 'Pre-Vaciado',
  acero:      'Acero',
  encofrado:  'Encofrado',
  concreto:   'Vaciado de Concreto',
  trazo:      'Trazo y Replanteo',
  excavacion: 'Excavacion',
};

// ════════════════════════════════════════════════════════════════
// Helper: autentica con la Service Account y devuelve clientes Drive + Sheets
// ════════════════════════════════════════════════════════════════
function googleClients() {
  const credentials = JSON.parse(GOOGLE_SA_KEY.value());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
  return {
    drive:  google.drive({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
  };
}

// ════════════════════════════════════════════════════════════════
// Helper: asegura que exista una subcarpeta en Drive bajo parentId.
// Si no existe la crea. Devuelve el folderId.
// Idempotente — perfecto para reintentos.
// ════════════════════════════════════════════════════════════════
async function asegurarCarpeta(drive, nombre, parentId) {
  const q = `name='${nombre.replace(/'/g, "\\'")}' and '${parentId}' in parents `
          + `and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({
    q, fields: 'files(id,name)',
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  if (list.data.files?.length) return list.data.files[0].id;

  const created = await drive.files.create({
    requestBody: {
      name: nombre, mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return created.data.id;
}

// ════════════════════════════════════════════════════════════════
// Helper: sube (o reemplaza) un PDF en Drive bajo folderId.
// Si ya existe un archivo con el mismo nombre, lo actualiza (idempotente).
// ════════════════════════════════════════════════════════════════
async function subirOSobrescribirPDF(drive, fileName, parentId, buffer) {
  const safeName = fileName.replace(/'/g, "\\'");
  const q = `name='${safeName}' and '${parentId}' in parents and trashed=false`;
  const list = await drive.files.list({
    q, fields: 'files(id,name)',
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });

  // node Buffer → stream para drive.files
  const { Readable } = require('stream');
  const media = { mimeType: 'application/pdf', body: Readable.from(buffer) };

  if (list.data.files?.length) {
    const fileId = list.data.files[0].id;
    const updated = await drive.files.update({
      fileId, media,
      fields: 'id,webViewLink,webContentLink',
      supportsAllDrives: true,
    });
    return { id: fileId, ...updated.data };
  }
  const created = await drive.files.create({
    requestBody: { name: fileName, parents: [parentId] },
    media,
    fields: 'id,webViewLink,webContentLink',
    supportsAllDrives: true,
  });
  return { id: created.data.id, ...created.data };
}

// ════════════════════════════════════════════════════════════════
// Helper: busca una fila existente en el Sheet por N° Registro (columna A).
// Devuelve el rowIndex (1-based) o null.
// Idempotente: si la fila ya existe, hacemos UPDATE en vez de APPEND.
// ════════════════════════════════════════════════════════════════
async function buscarFilaPorRegistro(sheets, sheetId, numeroRegistro) {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Protocolos!A:A',
    majorDimension: 'COLUMNS',
  });
  const col = r.data.values?.[0] || [];
  const idx = col.findIndex(v => v === numeroRegistro);
  return idx >= 0 ? idx + 1 : null; // 1-based
}

// ════════════════════════════════════════════════════════════════
// Helper: filaDesdeProtocolo — convierte un doc Firestore en array de columnas
// para el Sheet. Ajustar el orden si el cliente tiene otra estructura.
// ════════════════════════════════════════════════════════════════
function filaDesdeProtocolo(data, urlDrive, urlStorage) {
  return [
    data.numeroRegistro || '',          // A: N° Registro
    TIPO_NOMBRE[data.tipo] || data.tipo,// B: Tipo
    data.frenteCodigo || '',            // C: Frente
    data.semanaISO || '',               // D: Semana ISO
    data.estructuraElemento || '',      // E: Elemento
    data.ejes || '',                    // F: Ejes
    data.nivel || '',                   // G: Nivel
    data.sectorSubSector || '',         // H: Sector
    data.fc || '',                      // I: f'c
    data.volumen || '',                 // J: Volumen
    data.fechaVaciado || '',            // K: Fecha vaciado
    'SUBIDO',                           // L: Estado
    urlStorage || '',                   // M: URL Firebase Storage
    urlDrive || '',                     // N: URL Drive
  ];
}

// ════════════════════════════════════════════════════════════════
// Main: Cloud Function trigger
// ════════════════════════════════════════════════════════════════
exports.protocoloPdfFirmadoSync = onObjectFinalized(
  {
    // Si tu bucket es otro, ajustar. Default es el bucket por defecto del proyecto.
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
    retry: true,  // reintentos automáticos de Firebase (~3 veces con backoff)
    secrets: [GOOGLE_SA_KEY, DRIVE_ROOT_FOLDER_ID, SHEET_CONTROL_ID],
  },
  async (event) => {
    const obj = event.data;
    const path = obj.name;

    // 1. Filtrar: solo PDFs en protocolos-firmados/
    if (!path || !path.startsWith('protocolos-firmados/')) return;
    if (!path.endsWith('.pdf')) return;

    const parts = path.split('/');
    if (parts.length !== 5) {
      console.warn('[protocoloPdfFirmadoSync] path inesperado, ignorando:', path);
      return;
    }
    const [, tipo, frente, semana, fileName] = parts;
    const numeroRegistro = fileName.replace(/\.pdf$/i, '');

    console.log('[archivado] inicia', { numeroRegistro, tipo, frente, semana });

    const db = admin.firestore();
    const bucket = admin.storage().bucket(obj.bucket);

    // 2. Buscar doc Firestore por numeroRegistro
    const snap = await db.collection('Protocolos')
      .where('numeroRegistro', '==', numeroRegistro)
      .limit(1).get();

    if (snap.empty) {
      console.warn('[archivado] sin doc Firestore para', numeroRegistro);
      return; // no reintentar — el doc no existe, nunca va a aparecer
    }
    const docRef = snap.docs[0].ref;
    const data = snap.docs[0].data();

    try {
      const { drive, sheets } = googleClients();

      // 3. Drive: asegurar jerarquía Tipo/Frente/Semana
      const rootId   = DRIVE_ROOT_FOLDER_ID.value();
      const fTipo    = await asegurarCarpeta(drive, TIPO_NOMBRE[tipo] || tipo, rootId);
      const fFrente  = await asegurarCarpeta(drive, frente, fTipo);
      const fSemana  = await asegurarCarpeta(drive, semana, fFrente);

      // 4. Descargar PDF de Firebase Storage a buffer
      const [pdfBuffer] = await bucket.file(path).download();

      // 5. Subir/reemplazar en Drive
      const driveFile = await subirOSobrescribirPDF(drive, fileName, fSemana, pdfBuffer);
      const driveUrl  = driveFile.webViewLink
                     || `https://drive.google.com/file/d/${driveFile.id}/view`;

      // 6. Sheets: upsert por N° Registro
      const sheetId = SHEET_CONTROL_ID.value();
      const fila = filaDesdeProtocolo(data, driveUrl, data.archivado?.storage?.url);
      const rowExistente = await buscarFilaPorRegistro(sheets, sheetId, numeroRegistro);
      if (rowExistente) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Protocolos!A${rowExistente}:N${rowExistente}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [fila] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: SHEET_RANGE,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [fila] },
        });
      }

      // 7. Actualizar Firestore — bloque archivado completo
      await docRef.update({
        'archivado.drive': {
          fileId: driveFile.id,
          url:    driveUrl,
          path:   `${TIPO_NOMBRE[tipo] || tipo}/${frente}/${semana}/${fileName}`,
          fechaCargado: new Date().toISOString(),
        },
        'archivado.sheet': {
          row: rowExistente || 'append',
          fechaCargado: new Date().toISOString(),
        },
        'archivado.error': admin.firestore.FieldValue.delete(), // limpia error anterior si reintenta
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('[archivado] OK', { numeroRegistro, drive: driveUrl });
    } catch (e) {
      console.error('[archivado] ERROR', numeroRegistro, e);

      // Escribir el error a Firestore para que la UI lo muestre.
      // El attempt cuenta vidas: tras 3 intentos fallidos, Firebase deja de
      // reintentar y queda el error visible para el operador.
      await docRef.update({
        'archivado.error': {
          mensaje: e.message || String(e),
          fecha:   new Date().toISOString(),
          paso:    e.step || 'desconocido',
        },
      }).catch(err2 => console.warn('No pude escribir error', err2.message));

      // Re-throw para que Firebase reintente automáticamente
      throw e;
    }
  }
);
