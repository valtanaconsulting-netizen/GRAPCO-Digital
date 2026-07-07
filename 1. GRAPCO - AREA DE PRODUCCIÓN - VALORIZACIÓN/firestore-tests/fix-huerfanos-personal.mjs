// firestore-tests/fix-huerfanos-personal.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Cierra el Gate 1: asigna proyectoId a los docs de /Personal que estén huérfanos.
// Por defecto DRY-RUN (no escribe). Con `--apply` actualiza (proyectoId + migradoEn).
// Inferencia: frenteId → /Frentes.proyectoId; si no, fallback legacy 'creditex-ptar'.
// PII (nombres) NUNCA va al stdout; el detalle se escribe a un archivo temporal.
//   node firestore-tests/fix-huerfanos-personal.mjs            (dry-run)
//   node firestore-tests/fix-huerfanos-personal.mjs --apply    (escribe)
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const APPLY = process.argv.includes('--apply');
const FALLBACK = 'creditex-ptar';
const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccount.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Universo de proyectos en /Personal (contexto, no-PII).
const todos = await db.collection('Personal').get();
const dist = {};
todos.forEach(d => { const p = d.get('proyectoId') || '∅(huérfano)'; dist[p] = (dist[p] || 0) + 1; });
console.log(`\n=== /Personal · distribución por proyectoId (${todos.size} docs) ===`);
for (const [p, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${n}`);

// Frentes → proyectoId (para inferir).
const frentesSnap = await db.collection('Frentes').get();
const frenteAProy = new Map();
frentesSnap.forEach(d => frenteAProy.set(d.id, d.get('proyectoId')));

const huerfanos = todos.docs.filter(d => { const p = d.get('proyectoId'); return p === undefined || p === null || p === ''; });
console.log(`\n=== Huérfanos a corregir: ${huerfanos.length} ===`);
const plan = [];
for (const d of huerfanos) {
  const data = d.data() || {};
  const viaFrente = data.frenteId && frenteAProy.get(data.frenteId);
  const destino = viaFrente || FALLBACK;
  const motivo = viaFrente ? `frenteId=${data.frenteId}` : 'fallback legacy';
  plan.push({ id: d.id, destino, motivo });
  // Solo metadatos NO-PII al stdout (docId + destino + cargo); nunca nombres/apellidos.
  console.log(`  · ${d.id}  →  ${destino}  (${motivo})  [cargo=${data.cargo || '—'}]`);
}

if (!APPLY) {
  console.log('\n(DRY-RUN — no se escribió nada. Re-correr con --apply para aplicar.)');
  process.exit(0);
}

console.log('\n=== APLICANDO ===');
let ok = 0;
for (const p of plan) {
  await db.collection('Personal').doc(p.id).update({
    proyectoId: p.destino,
    migradoEn: FieldValue.serverTimestamp(),
    migradoPor: 'fix-huerfanos-personal',
  });
  ok++;
  console.log(`  ✓ ${p.id} → ${p.destino}`);
}
console.log(`\n${ok}/${plan.length} docs actualizados. Verificá con: node firestore-tests/diagnostico-gates.mjs`);
process.exit(0);
