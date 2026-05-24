// scripts/rescatar-bim-modelos.mjs
// Migra docs de BIM_Modelos que quedaron en control-productividad-franklin
// (porque la Cloud Function antes escribía allí en vez del proyecto del caller).
//
// Uso:  node scripts/rescatar-bim-modelos.mjs
// Requiere: gcloud auth application-default login con permisos en ambos proyectos.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const SRC_PROJECT = 'control-productividad-franklin';
const DST_PROJECT = 'grapco-demo-2026';

const srcApp = admin.initializeApp({ projectId: SRC_PROJECT }, 'src');
const dstApp = admin.initializeApp({ projectId: DST_PROJECT }, 'dst');
const src = admin.firestore(srcApp);
const dst = admin.firestore(dstApp);

const main = async () => {
  console.log(`[rescate] Leyendo BIM_Modelos de ${SRC_PROJECT}...`);
  const snap = await src.collection('BIM_Modelos').get();
  console.log(`[rescate] ${snap.size} docs encontrados en origen.`);

  if (snap.empty) {
    console.log('[rescate] Nada que migrar.');
    process.exit(0);
  }

  // Traer los URNs que ya existen en destino para no duplicar
  const dstSnap = await dst.collection('BIM_Modelos').get();
  const urnsEnDestino = new Set(dstSnap.docs.map(d => d.data().urn).filter(Boolean));
  console.log(`[rescate] ${urnsEnDestino.size} ya existen en destino — los salto.`);

  let copiados = 0, saltados = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (urnsEnDestino.has(data.urn)) {
      saltados++;
      continue;
    }
    await dst.collection('BIM_Modelos').doc(d.id).set(data);
    console.log(`[rescate] ✓ ${data.nombreOriginal || d.id}`);
    copiados++;
  }

  console.log(`[rescate] Completado. Copiados: ${copiados} · Saltados: ${saltados}`);
  process.exit(0);
};

main().catch(err => {
  console.error('[rescate] ERROR:', err);
  process.exit(1);
});
