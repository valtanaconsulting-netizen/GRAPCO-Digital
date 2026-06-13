// scripts/restaurar-planmaestro-creditex.mjs
// Restaura las 105 actividades de PlanMaestro desde el respaldo JSON y las
// REASIGNA al proyecto CREDITEX (creditex-ptar): eran su Plan Maestro real,
// que quedó huérfano cuando el proyecto se recreó con otro ID. Así CREDITEX
// recupera su WBS y la plataforma puede analizarlo (CPI/RO/valorización).
//
// Uso: node scripts/restaurar-planmaestro-creditex.mjs <archivo-backup.json>
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

const DESTINO = 'creditex-ptar';
// Tomar el backup pasado por arg, o el más reciente de la carpeta scripts/
let archivo = process.argv[2];
if (!archivo) {
  const cands = readdirSync('.').filter(f => f.startsWith('backup-planmaestro-huerfano-') && f.endsWith('.json')).sort();
  archivo = cands[cands.length - 1];
}
if (!archivo) { console.error('No se encontró archivo de respaldo.'); process.exit(1); }
console.log('Restaurando desde:', archivo, '→ proyecto:', DESTINO);

const data = JSON.parse(readFileSync(archivo, 'utf8'));
let batch = db.batch(), n = 0, total = 0;
for (const item of data) {
  const { id, ...campos } = item;
  campos.proyectoId = DESTINO;       // reasignar a CREDITEX
  batch.set(db.collection('PlanMaestro').doc(id), campos, { merge: true });
  n++; total++;
  if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
}
if (n > 0) await batch.commit();
console.log('Restauradas y asignadas a CREDITEX:', total, 'actividades.');
process.exit(0);
