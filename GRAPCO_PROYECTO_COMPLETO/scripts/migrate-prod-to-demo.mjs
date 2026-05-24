// scripts/migrate-prod-to-demo.mjs
// Migra colecciones de Producción de control-productividad-franklin → grapco-demo-2026.
// Preserva IDs de documento. NO toca subcolecciones (este proyecto no tiene en Producción).
//
// Pasos:
//   1. Limpia data demo previa en destino (filtra por _seedTag = SEED_PTARI_DEMO_2026)
//   2. Copia las colecciones de Producción una por una preservando doc IDs
//
// Uso:  node scripts/migrate-prod-to-demo.mjs
// Requiere: ADC (gcloud auth application-default login) con permisos en ambos proyectos.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const SRC_PROJECT = 'control-productividad-franklin';
const DST_PROJECT = 'grapco-demo-2026';
const SEED_TAG    = 'SEED_PTARI_DEMO_2026';

const srcApp = admin.initializeApp({ projectId: SRC_PROJECT }, 'src');
const dstApp = admin.initializeApp({ projectId: DST_PROJECT }, 'dst');
const src = admin.firestore(srcApp);
const dst = admin.firestore(dstApp);

// Colecciones que viajan al destino (foco Producción).
// Usuarios viene para preservar roles. Materiales/Compras/Calidad/OT/Pull NO (fuera de alcance).
const COLECCIONES = [
  'Usuarios',
  'Bootstrap',
  'Proyectos',
  'Frentes',
  'Configuracion',
  'Cuadrillas',
  'Personal',
  'Planes_Diarios',
  'Cartas_Balance',
  'Registros_Campo',
];

const BATCH_SIZE = 400;

async function limpiarDemo() {
  console.log(`\n=== PASO 1: Limpieza de data demo (tag=${SEED_TAG}) en destino ===`);
  for (const col of COLECCIONES) {
    try {
      const snap = await dst.collection(col).where('_seedTag', '==', SEED_TAG).get();
      if (snap.empty) {
        console.log(`  ${col.padEnd(20)} 0 docs demo`);
        continue;
      }
      let n = 0;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = dst.batch();
        docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
        await batch.commit();
        n += Math.min(BATCH_SIZE, docs.length - i);
      }
      console.log(`  ${col.padEnd(20)} ${n} docs demo BORRADOS`);
    } catch (e) {
      console.warn(`  ${col.padEnd(20)} skip (${e.code || e.message})`);
    }
  }
  // Limpia también admin@grapco.pe / Bootstrap/done sembrados anteriormente
  try {
    await dst.collection('Bootstrap').doc('done').delete();
    console.log('  Bootstrap/done borrado (volverá del origen si existe)');
  } catch {}
}

async function copiarColeccion(nombre) {
  const start = Date.now();
  const snap = await src.collection(nombre).get();
  if (snap.empty) {
    console.log(`  ${nombre.padEnd(20)} (vacío en origen)`);
    return 0;
  }
  let n = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = dst.batch();
    docs.slice(i, i + BATCH_SIZE).forEach(d => {
      const data = d.data();
      // Reescribimos sin el _seedTag (esta data es REAL, no demo)
      delete data._seedTag;
      batch.set(dst.collection(nombre).doc(d.id), data, { merge: false });
    });
    await batch.commit();
    n += Math.min(BATCH_SIZE, docs.length - i);
    if (docs.length > 1000) {
      process.stdout.write(`\r  ${nombre.padEnd(20)} ${n}/${docs.length}...`);
    }
  }
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\r  ${nombre.padEnd(20)} ${n} docs copiados (${sec}s)`);
  return n;
}

async function copiarTodo() {
  console.log(`\n=== PASO 2: Copia ${SRC_PROJECT} → ${DST_PROJECT} ===`);
  let total = 0;
  for (const col of COLECCIONES) {
    try {
      total += await copiarColeccion(col);
    } catch (e) {
      console.error(`  ${col.padEnd(20)} ERROR: ${e.message}`);
    }
  }
  return total;
}

(async () => {
  try {
    console.log(`Origen:  ${SRC_PROJECT}`);
    console.log(`Destino: ${DST_PROJECT}`);
    await limpiarDemo();
    const total = await copiarTodo();
    console.log(`\n✅ Migración completa. ${total} documentos copiados.`);
    console.log(`   Consola: https://console.firebase.google.com/project/${DST_PROJECT}/firestore`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Migración falló:', e);
    process.exit(1);
  }
})();
