// src/utils/apsClient.js — Cliente APS (Bloque 9, refactor 14)
//
// Refactor: usa functionsClient.js para las llamadas autenticadas en lugar de
// duplicar lógica. Reduce código y centraliza el manejo de auth/errores/timeouts.
//
// IMPORTANTE: las escrituras a Firestore (BIM_Modelos) viven aquí en el cliente y
// NO en la Cloud Function. Razón: las Functions corren en
// control-productividad-franklin y su SA no tiene IAM sobre grapco-demo-2026 → si
// intentan tocar el Firestore del demo, PERMISSION_DENIED. El cliente sí está
// autenticado en el proyecto correcto y las rules permiten create/update/delete
// a ingeniero/admin.

import { callFunction } from './functionsClient';
import { db } from '../firebaseConfig';
import {
  collection, addDoc, doc, deleteDoc, getDocs, query, where, limit, updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Sube un archivo .rvt/.ifc/.dwg a APS.
 *
 * @param {File} file        Archivo del input <input type="file">
 * @param {Function} onProgress callback (porcentaje 0-100) durante subida
 * @returns {Promise<{urn, objectKey, status}>}
 */
export const subirModeloAPS = async (file, onProgress, metadata = {}) => {
  if (!file) throw new Error('No se seleccionó archivo');

  const extensionesValidas = ['.rvt', '.rfa', '.ifc', '.dwg', '.dwfx', '.nwd', '.nwc', '.3dm', '.skp'];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!extensionesValidas.includes(ext)) {
    throw new Error(`Formato no soportado. Usa: ${extensionesValidas.join(', ')}`);
  }

  const MAX_MB = 500;
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${MAX_MB} MB.`);
  }

  // 1) Pedir URL firmada al backend
  if (onProgress) onProgress(2);
  const { objectKey, uploadKey, urls } = await callFunction(
    'apsObtenerUrlSubida',
    { nombreArchivo: file.name },
    'POST',
    { timeout: 30_000 }
  );

  // 2) Subir al S3 firmado
  if (urls.length > 1) {
    // Multipart upload
    const partSize = Math.ceil(file.size / urls.length);
    for (let i = 0; i < urls.length; i++) {
      const start = i * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);
      const r = await fetch(urls[i], { method: 'PUT', body: blob });
      if (!r.ok) throw new Error(`Subida parte ${i + 1} falló: ${r.status}`);
      if (onProgress) onProgress(2 + ((i + 1) / urls.length) * 88);
    }
  } else {
    // Single PUT con XHR para tener evento de progreso real
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(2 + (e.loaded / e.total) * 88);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Subida S3 falló: ${xhr.status}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Error de red en subida S3')));
      xhr.addEventListener('timeout', () => reject(new Error('Timeout en subida S3')));
      xhr.open('PUT', urls[0]);
      xhr.timeout = 5 * 60 * 1000;  // 5 min máx
      xhr.send(file);
    });
  }

  // 3) Completar upload + arrancar traducción (server-side)
  if (onProgress) onProgress(92);
  const completado = await callFunction(
    'apsCompletarSubida',
    { objectKey, uploadKey, nombreOriginal: file.name },
    'POST',
    { timeout: 60_000 }
  );

  // 4) Escribir el doc en Firestore desde el CLIENTE (no desde la Function — ver header).
  try {
    await addDoc(collection(db, 'BIM_Modelos'), {
      nombreOriginal: completado.nombreOriginal,
      objectKey: completado.objectKey,
      urn: completado.urn,
      objectId: completado.objectId,
      bucketKey: completado.bucketKey,
      subidoPor: completado.subidoPor,
      subidoPorEmail: completado.subidoPorEmail,
      subidoEn: serverTimestamp(),
      traduccionStatus: 'pending',
      progreso: '0%',
      // Metadatos BIM para federación: especialidad + revisión
      especialidad: metadata.especialidad || 'ARQ',
      revision: metadata.revision || 'R0',
      // AISLAMIENTO POR PROYECTO: cada modelo pertenece al proyecto activo donde se
      // sube. Sin esto, los modelos de un proyecto (p.ej. CREDITEX) aparecían en
      // otro (TEXTIL). Los modelos legacy sin este campo solo se ven en el proyecto
      // default (creditex-ptar), vía filtrarPorContexto.
      proyectoId: metadata.proyectoActivoId || null,
    });
  } catch (err) {
    console.warn('[apsClient] No pude registrar BIM_Modelos en Firestore:', err);
    // No re-lanzamos: el archivo ya está en APS y traduciéndose. Solo no aparece en la lista.
  }

  if (onProgress) onProgress(100);
  return completado;
};

/**
 * Consulta estado de traducción de un URN.
 */
export const consultarTraduccion = (urn) =>
  callFunction(`apsConsultarManifest?urn=${encodeURIComponent(urn)}`, null, 'GET');

// Actualiza el doc Firestore del modelo (por URN) con el último estado del manifest.
// Lo hacemos en el cliente para evitar PERMISSION_DENIED de IAM cross-project.
const actualizarDocPorUrn = async (urn, data) => {
  try {
    const q = query(collection(db, 'BIM_Modelos'), where('urn', '==', urn), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return;
    await updateDoc(snap.docs[0].ref, {
      traduccionStatus: data.status,
      progreso: data.progress || '0%',
      actualizadoEn: serverTimestamp(),
      ...(data.status === 'success' && { completadoEn: serverTimestamp() }),
    });
  } catch (err) {
    console.warn('[apsClient] No pude actualizar status del modelo:', err);
  }
};

/**
 * Polling automático hasta que la traducción esté completa.
 * Cada tick actualiza Firestore con el último status (desde el cliente).
 */
export const esperarTraduccion = (urn, onUpdate, intervaloMs = 15_000, timeoutMs = 30 * 60 * 1000) => {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const tick = async () => {
      try {
        const data = await consultarTraduccion(urn);
        if (onUpdate) onUpdate(data);
        // Persistir el último status en Firestore (cliente, no Function)
        actualizarDocPorUrn(urn, data);
        if (data.status === 'success') return resolve(data);
        if (data.status === 'failed' || data.status === 'timeout') {
          return reject(new Error(`Traducción ${data.status}`));
        }
        if (Date.now() - inicio > timeoutMs) {
          return reject(new Error('Timeout esperando traducción'));
        }
        setTimeout(tick, intervaloMs);
      } catch (err) {
        reject(err);
      }
    };
    tick();
  });
};

export const obtenerTokenVisor = () =>
  callFunction('apsTokenViewer', null, 'POST');

// ── AR (realidad aumentada): export OBJ → GLB en Storage ──

/** Lanza (o relanza) el export OBJ del modelo en APS. Idempotente. */
export const iniciarExportGlb = (urn) =>
  callFunction('apsGenerarGlb', { urn }, 'POST', { timeout: 90_000 });

/**
 * Estado del GLB para AR. Cuando el export OBJ termina, ESTA llamada dispara la
 * conversión en el server (puede tardar 1-5 min en modelos grandes) → timeout amplio.
 */
export const consultarEstadoGlb = (urn) =>
  callFunction(`apsEstadoGlb?urn=${encodeURIComponent(urn)}`, null, 'GET', { timeout: 8 * 60_000 });

// Persiste la URL del GLB en el doc del modelo (cliente, no Function — ver header).
// Best-effort: si el rol no puede escribir, la URL se recupera igual vía apsEstadoGlb.
const registrarGlbEnDoc = async (urn, { glbUrl, glbPath, glbVersion, transformacion }) => {
  try {
    const q = query(collection(db, 'BIM_Modelos'), where('urn', '==', urn), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return;
    await updateDoc(snap.docs[0].ref, {
      glbStatus: 'success',
      glbUrl,
      glbPath,
      // v3 = GLB enderezado (Y-arriba), en metros, centrado y con dimensiones
      // en metadatos. El visor AR ignora versiones menores (v1 volteada; v2 sin
      // dimensiones verificables).
      glbVersion: glbVersion || 3,
      // Dimensiones reales y unidades detectadas — el visor las muestra para
      // poder verificar la escala de un vistazo.
      ...(transformacion && { glbInfo: transformacion }),
      glbGeneradoEn: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[apsClient] No pude registrar el GLB en Firestore:', err);
  }
};

/**
 * Polling hasta que el GLB esté listo (espejo de esperarTraduccion).
 * status del server: sin_traduccion | sin_export | exportando | failed | success
 */
export const esperarGlb = (urn, onUpdate, intervaloMs = 15_000, timeoutMs = 30 * 60 * 1000) => {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const tick = async () => {
      try {
        const data = await consultarEstadoGlb(urn);
        if (onUpdate) onUpdate(data);
        if (data.status === 'success') {
          registrarGlbEnDoc(urn, data);
          return resolve(data);
        }
        if (data.status === 'failed') return reject(new Error(data.error || 'Export OBJ falló'));
        if (data.status === 'sin_traduccion') return reject(new Error('El modelo aún no tiene traducción APS'));
        if (data.status === 'sin_export') return reject(new Error('Export no iniciado. Pulsa "Preparar modelo AR".'));
        if (Date.now() - inicio > timeoutMs) return reject(new Error('Timeout preparando el modelo AR'));
        setTimeout(tick, intervaloMs);
      } catch (err) {
        reject(err);
      }
    };
    tick();
  });
};

// Elimina el modelo del bucket APS (server) y del Firestore (cliente, en su proyecto).
export const eliminarModeloAPS = async (docId, objectKey) => {
  // 1) Borrar de APS bucket (server-side: requiere credenciales APS)
  await callFunction('apsEliminarModelo', { objectKey });
  // 2) Borrar el doc Firestore desde el cliente (rules: solo admin)
  await deleteDoc(doc(db, 'BIM_Modelos', docId));
};
