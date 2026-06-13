// scripts/limpiar-planmaestro-huerfano.mjs
// Borra las actividades de PlanMaestro que pertenecen a proyectos que YA NO
// existen en la cartera (huérfanas). Hace RESPALDO a JSON antes de borrar
// (recuperable). Autorizado por el usuario el 12/06/2026.
//
// Uso: node scripts/limpiar-planmaestro-huerfano.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

// IDs de proyectos que SÍ existen en la cartera (sus actividades NO se tocan)
const proySnap = await db.collection('Proyectos').get();
const vivos = new Set(proySnap.docs.map(d => d.id));
console.log('Proyectos vivos:', [...vivos].join(', '));

const pm = await db.collection('PlanMaestro').get();
const huerfanas = pm.docs.filter(d => !vivos.has(d.data().proyectoId));
console.log('PlanMaestro total:', pm.size, '· huérfanas a borrar:', huerfanas.length);

if (!huerfanas.length) { console.log('Nada que borrar.'); process.exit(0); }

// Respaldo
const backup = huerfanas.map(d => ({ id: d.id, ...d.data() }));
const fname = `backup-planmaestro-huerfano-${Date.now()}.json`;
writeFileSync(fname, JSON.stringify(backup, null, 2));
console.log('Respaldo guardado en scripts/' + fname);

// Borrado en lotes
let batch = db.batch(), n = 0, total = 0;
for (const d of huerfanas) {
  batch.delete(d.ref); n++; total++;
  if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
}
if (n > 0) await batch.commit();
console.log('Borradas:', total, 'actividades huérfanas de PlanMaestro.');
process.exit(0);
