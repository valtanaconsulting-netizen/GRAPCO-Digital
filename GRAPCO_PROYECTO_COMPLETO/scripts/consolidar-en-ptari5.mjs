// scripts/consolidar-en-ptari5.mjs
// Mueve TODOS los Registros_Campo / Planes_Diarios / Cuadrillas / Personal /
// Cartas_Balance del proyecto destino al frente "F-01 PTARI 5" (o el primer frente
// del primer proyecto activo si no existe ese código).
//
// Uso: node scripts/consolidar-en-ptari5.mjs

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const DST_PROJECT = 'grapco-demo-2026';
admin.initializeApp({ projectId: DST_PROJECT });
const db = admin.firestore();

const BATCH_SIZE = 400;

// Colecciones que llevan frenteId
const COL_CON_FRENTE = [
  'Registros_Campo',
  'Planes_Diarios',
  'Cuadrillas',
  'Personal',
  'Cartas_Balance',
];

(async () => {
  try {
    console.log(`Destino: ${DST_PROJECT}`);

    // 1. Buscar el frente F-01 PTARI 5
    const frentesSnap = await db.collection('Frentes').get();
    if (frentesSnap.empty) throw new Error('No hay frentes en el destino');

    console.log('\n=== Frentes disponibles ===');
    let target = null;
    // Prioridad 1: matchea "PTARI 5" (el 5 es discriminante en este Firebase)
    frentesSnap.docs.forEach(d => {
      const f = d.data();
      const codigo = f.codigo || '';
      const nombre = f.nombre || '';
      console.log(`  ${d.id}  codigo="${codigo}"  nombre="${nombre}"  proyecto=${f.proyectoId}  activo=${f.activo}`);
      const txt = `${codigo} ${nombre}`.toUpperCase();
      if (!target && (txt.includes('PTARI 5') || txt.includes('PTARI5'))) {
        target = { id: d.id, ...f };
      }
    });
    // Prioridad 2: fallback al primer F-01
    if (!target) {
      frentesSnap.docs.forEach(d => {
        const f = d.data();
        const codigo = (f.codigo || '').toUpperCase().replace(/\s/g, '');
        if (!target && codigo === 'F-01') target = { id: d.id, ...f };
      });
    }

    if (!target) {
      // Fallback: usar el primer frente
      target = { id: frentesSnap.docs[0].id, ...frentesSnap.docs[0].data() };
      console.log(`\n⚠️  No se encontró "F-01 PTARI 5". Uso el primer frente como destino: ${target.codigo || target.nombre}`);
    } else {
      console.log(`\n✓ Frente destino: ${target.codigo} - ${target.nombre} (id=${target.id})`);
    }

    const FRENTE_ID = target.id;
    const PROYECTO_ID = target.proyectoId;

    // 2. Para cada colección con frenteId, actualizar todos los docs
    console.log('\n=== Actualizando frenteId en colecciones ===');
    for (const col of COL_CON_FRENTE) {
      const snap = await db.collection(col).get();
      if (snap.empty) {
        console.log(`  ${col.padEnd(20)} (vacío)`);
        continue;
      }
      let n = 0, skipped = 0;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        let inBatch = 0;
        docs.slice(i, i + BATCH_SIZE).forEach(d => {
          const data = d.data();
          if (data.frenteId === FRENTE_ID) { skipped++; return; }
          batch.update(d.ref, {
            frenteId: FRENTE_ID,
            proyectoId: PROYECTO_ID, // también consolidamos el proyecto
          });
          inBatch++;
        });
        if (inBatch > 0) await batch.commit();
        n += inBatch;
      }
      console.log(`  ${col.padEnd(20)} ${n} docs actualizados, ${skipped} ya estaban OK`);
    }

    // 3. Desactivar los OTROS frentes y el OTROS proyectos para evitar confusión en la UI
    console.log('\n=== Marcando otros frentes/proyectos como inactivos ===');
    const batch2 = db.batch();
    let off = 0;
    frentesSnap.docs.forEach(d => {
      if (d.id !== FRENTE_ID) {
        batch2.update(d.ref, { activo: false });
        off++;
      }
    });
    if (off > 0) await batch2.commit();
    console.log(`  Frentes desactivados (activo:false): ${off}`);

    console.log(`\n✅ Listo. Todo consolidado en ${target.codigo} - ${target.nombre}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Falló:', e);
    process.exit(1);
  }
})();
