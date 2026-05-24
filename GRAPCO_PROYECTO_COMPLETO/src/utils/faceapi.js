// src/utils/faceapi.js
// Wrapper sobre face-api.js — carga de modelos, detección y matching.

import * as faceapi from 'face-api.js';

// CDN público con los modelos pre-entrenados (~7MB total, cacheable).
// Apunta al repo principal de face-api.js (carpeta /weights/), no al repo
// face-api.js-models que jsDelivr bloquea con 403.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';

let cargados = false;
let cargando = null;

/** Carga los modelos necesarios la primera vez (idempotente). */
export async function cargarModelos() {
  if (cargados) return true;
  if (cargando) return cargando;
  cargando = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),     // ~190 KB
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),    // ~350 KB
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),   // ~6 MB
      ]);
      cargados = true;
      return true;
    } catch (e) {
      console.error('[faceapi] error cargando modelos', e);
      cargando = null;
      throw e;
    }
  })();
  return cargando;
}

/** Detecta una sola cara y retorna su descriptor (Float32Array de 128 floats). */
export async function obtenerDescriptor(input) {
  await cargarModelos();
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection || null;
}

/**
 * Busca al obrero cuyo descriptor más se acerca al de la cara detectada.
 * obreros: [{ id, nombre, faceDescriptors: [Float32Array, Float32Array, ...] }]
 * Retorna { obrero, distancia } o null si nada match.
 * Threshold típico: 0.55 (más permisivo) — 0.45 (más estricto).
 */
export function buscarMatch(descriptorTest, obreros, threshold = 0.55) {
  if (!descriptorTest || !obreros?.length) return null;
  let mejor = { obrero: null, distancia: Infinity };
  for (const o of obreros) {
    const descs = o.faceDescriptors || [];
    for (const d of descs) {
      // Si viene como array plano, convertir
      const arr = d instanceof Float32Array ? d : Float32Array.from(d);
      const dist = faceapi.euclideanDistance(descriptorTest, arr);
      if (dist < mejor.distancia) mejor = { obrero: o, distancia: dist };
    }
  }
  if (mejor.distancia <= threshold) return mejor;
  return null;
}

/** Convierte descriptor a array de JS plano para guardar en Firestore. */
export const descriptorToArray = (d) => Array.from(d);

/** Convierte un array plano a Float32Array para usar en matching. */
export const arrayToDescriptor = (a) => Float32Array.from(a);

export { faceapi };
