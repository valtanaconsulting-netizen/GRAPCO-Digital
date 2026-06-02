// src/utils/faceapi.js
// Wrapper sobre face-api.js — carga de modelos, detección, promediado y matching.
// Motor de reconocimiento "premium": detección de alta resolución, promediado de
// descriptores (anti-ruido) y una calibración distancia↔similitud realista.

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

// Detección a mayor resolución (inputSize 512, múltiplo de 32) → el recorte y los
// 68 landmarks quedan mejor alineados, y el descriptor de 128 floats es más estable.
const DETECT_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });

/** Detecta una sola cara y retorna { detection, landmarks, descriptor } o null. */
export async function obtenerDescriptor(input) {
  await cargarModelos();
  const detection = await faceapi
    .detectSingleFace(input, DETECT_OPTS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection || null;
}

/**
 * Promedio (media aritmética elemento a elemento) de N descriptores de 128 floats.
 * Promediar varias capturas del MISMO rostro cancela el ruido del modelo y produce
 * un descriptor mucho más representativo → menos error y % de similitud estable.
 * Es la técnica estándar (dlib / face-recognition) para huellas faciales robustas.
 */
export function promediarDescriptores(lista) {
  const arrs = (lista || [])
    .filter(Boolean)
    .map(d => (d instanceof Float32Array ? d : Float32Array.from(d)));
  if (!arrs.length) return null;
  const n = arrs[0].length;
  const out = new Float32Array(n);
  for (const a of arrs) for (let i = 0; i < n; i++) out[i] += a[i];
  for (let i = 0; i < n; i++) out[i] /= arrs.length;
  return out;
}

/**
 * Busca al obrero cuyo descriptor más se acerca al de la cara detectada.
 * obreros: [{ id, nombre, faceDescriptors: [Float32Array, ...] }]
 * Retorna { obrero, distancia } o null si nada alcanza el threshold.
 */
export function buscarMatch(descriptorTest, obreros, threshold = 0.55) {
  if (!descriptorTest || !obreros?.length) return null;
  let mejor = { obrero: null, distancia: Infinity };
  for (const o of obreros) {
    const descs = o.faceDescriptors || [];
    for (const d of descs) {
      const arr = d instanceof Float32Array ? d : Float32Array.from(d);
      const dist = faceapi.euclideanDistance(descriptorTest, arr);
      if (dist < mejor.distancia) mejor = { obrero: o, distancia: dist };
    }
  }
  if (mejor.distancia <= threshold) return mejor;
  return null;
}

// ── Calibración distancia euclidiana ↔ similitud (%) ──
// En face-api la MISMA persona en vivo da distancias ≈ 0.30–0.45 y personas
// DISTINTAS ≈ 0.50–0.80+. La frontera de decisión del modelo está en ~0.50.
//
// La fórmula lineal antigua (1-dist)*100 era el bug: un match real a 0.40 salía
// 60% y NUNCA superaba el piso de 75% (que exigía dist ≤ 0.25, casi idéntico).
//
// Usamos una curva logística centrada en 0.50 (= 50%) con pendiente firme:
//   dist 0.25→95% · 0.30→92% · 0.35→86% · 0.40→77% · 0.45→65% · 0.50→50% · 0.60→23%
// Resultado: un trabajador real supera 75% con holgura; un desconocido (>0.5)
// queda por debajo. El piso de seguridad de 75% se mantiene, pero ahora SÍ es
// alcanzable por la persona correcta.
const SIM_D0 = 0.50;   // distancia donde la confianza es 50% (frontera de decisión)
const SIM_K  = 12;     // pendiente de la curva (mayor = transición más nítida)

export const similitudPct = (dist) => {
  const p = 100 / (1 + Math.exp(SIM_K * (dist - SIM_D0)));
  return Math.max(0, Math.min(100, Math.round(p)));
};

// Inversa exacta de similitudPct: % → distancia. Se usa para derivar los umbrales
// DIST_MAX / DIST_AUTO a partir de los % de seguridad, manteniendo todo consistente.
export const distanciaDeSimilitud = (pct) => {
  const p = Math.max(0.01, Math.min(99.99, pct));
  return Math.max(0, SIM_D0 + Math.log(100 / p - 1) / SIM_K);
};

/** Convierte descriptor a array de JS plano para guardar en Firestore. */
export const descriptorToArray = (d) => Array.from(d);

/** Convierte un array plano a Float32Array para usar en matching. */
export const arrayToDescriptor = (a) => Float32Array.from(a);

export { faceapi };
