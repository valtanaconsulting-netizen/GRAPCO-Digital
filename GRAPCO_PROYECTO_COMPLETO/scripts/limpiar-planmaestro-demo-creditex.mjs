// scripts/limpiar-planmaestro-demo-creditex.mjs
// RESPALDA y luego ELIMINA la data DEMO de PlanMaestro/creditex-ptar (actividades
// genéricas que NO son el PTAR+NAVE real; la obra real vive en Catalogo_WBS).
// 100% reversible: el backup queda en scripts/backups/. Para restaurar, re-insertar.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();
const PID = 'creditex-ptar';

const snap = await db.collection('PlanMaestro').where('proyectoId', '==', PID).get();
console.log(`PlanMaestro/${PID}: ${snap.size} docs a respaldar y eliminar.`);
if (snap.empty) { console.log('Nada que limpiar.'); process.exit(0); }

// 1) Respaldo
const backup = snap.docs.map(d => ({ id: d.id, data: d.data() }));
mkdirSync('scripts/backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = `scripts/backups/planmaestro-${PID}-demo-${stamp}.backup.json`;
writeFileSync(file, JSON.stringify(backup, null, 2));
console.log(`✓ Respaldo: ${file} (${backup.length} docs)`);

// 2) Borrado en lotes (≤400)
let borrados = 0;
for (let i = 0; i < snap.docs.length; i += 400) {
  const batch = db.batch();
  snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
  await batch.commit();
  borrados += Math.min(400, snap.docs.length - i);
}
console.log(`✓ Eliminados ${borrados} docs demo de PlanMaestro/${PID}.`);
console.log(`Para RESTAURAR: re-insertar cada {id,data} del backup en la colección PlanMaestro.`);
process.exit(0);
