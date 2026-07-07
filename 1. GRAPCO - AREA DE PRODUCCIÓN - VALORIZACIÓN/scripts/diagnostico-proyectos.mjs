// scripts/diagnostico-proyectos.mjs — radiografía multi-proyecto
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

const proyectos = await db.collection('Proyectos').get();
console.log('═══ PROYECTOS ═══');
proyectos.forEach(d => {
  const p = d.data();
  console.log(`  [${d.id}] ${p.nombre || '—'} · cliente: ${p.cliente || '—'} · código: ${p.codigo || '—'} · activo: ${p.estado || p.activo || '—'}`);
});

console.log('\n═══ REGISTROS_CAMPO por proyectoId ═══');
const regs = await db.collection('Registros_Campo').get();
const porProy = {};
regs.forEach(d => { const pid = d.data().proyectoId || '(SIN proyectoId)'; porProy[pid] = (porProy[pid] || 0) + 1; });
Object.entries(porProy).forEach(([k, n]) => console.log(`  ${k}: ${n} registros`));

console.log('\n═══ PERSONAL por proyectoId ═══');
const pers = await db.collection('Personal').get();
const persPorProy = {};
pers.forEach(d => { const pid = d.data().proyectoId || '(SIN proyectoId)'; persPorProy[pid] = (persPorProy[pid] || 0) + 1; });
Object.entries(persPorProy).forEach(([k, n]) => console.log(`  ${k}: ${n} personas`));

console.log('\n═══ CUADRILLAS por proyectoId ═══');
const cuad = await db.collection('Cuadrillas').get();
cuad.forEach(d => console.log(`  [${d.id}] proyectoId: ${d.data().proyectoId || '(SIN)'} · capataz: ${d.data().capataz || d.data().nombre || '—'}`));

for (const col of ['Catalogo_WBS', 'Cronogramas', 'LPS', 'Planes_Diarios']) {
  const snap = await db.collection(col).limit(20).get();
  console.log(`\n═══ ${col} (docs) ═══`);
  snap.forEach(d => console.log(`  [${d.id}]`));
}
process.exit(0);
