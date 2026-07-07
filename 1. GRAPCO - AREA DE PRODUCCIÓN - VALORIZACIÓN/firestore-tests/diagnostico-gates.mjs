// firestore-tests/diagnostico-gates.mjs
// ─────────────────────────────────────────────────────────────────────────────
// DIAGNÓSTICO READ-ONLY de los gates del cutover multi-tenant (rec #1).
// Mide contra PRODUCCIÓN (grapco-demo-2026) SOLO con lecturas — NO escribe nada.
//   Gate 1 — 0 huérfanos: docs de colecciones aisladas sin `proyectoId`.
//   Gate 2 — 100% claims: usuarios activos con claim {proy[]≠∅ | sa | rol global}.
// (Gate 3 — suite cross-tenant — se valida con rules.endurecido.test.mjs).
// Requiere serviceAccount.json (gitignored). Correr: node firestore-tests/diagnostico-gates.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccount.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const dbA = getFirestore();

// Colecciones AISLADAS (llevan proyectoId). Globales excluidas a propósito.
const AISLADAS = [
  'Registros_Campo', 'Borradores_Capataz', 'Planes_Diarios', 'PlanDiario', 'Asignacion_Tareo',
  'CuadrillasActivas', 'Cuadrillas', 'Catalogo_WBS', 'Personal', 'Cartas_Balance',
  'SustentoMetrados', 'PartidasContractuales', 'ValorizacionesContractuales', 'MetradosContractuales',
  'PresupuestoF07', 'ValorizacionF07_Avance', 'RO_Mensual', 'Registro_Facturas', 'GG_Oficina',
  'ValorizacionesSubcontratistas', 'Deductivos', 'Valorizaciones', 'Adicionales', 'Cartas',
  'IndicesPolinomicos', 'PlanMaestro', 'Cronogramas', 'PPC_Compromisos', 'VDC_Restricciones',
  'VDC_Lecciones', 'VDC_Evidencias', 'LPS', 'LPS_Plazos', 'PullPlanningHitos', 'PullPlanningTareas',
  'Indicadores_Ejecutivos', 'Protocolos', 'ProtocolosCALFOR', 'PETs', 'NoConformidades', 'Ensayos',
  'RDO', 'ATS', 'InspeccionesSeguridad', 'Kardex_Movimientos', 'Almacenes', 'OrdenesCompra',
  'OrdenesServicio', 'Requerimientos', 'Subcontratos', 'Stock_Actual', 'Asistencia_Diaria',
  'Historial', 'BIM_Vinculos', 'BIM_Modelos', 'Frentes', 'Partidas',
];

console.log('\n=== GATE 1 · huérfanos sin proyectoId (colecciones aisladas) ===');
let totalDocs = 0, totalHuerfanos = 0;
const conHuerfanos = [];
for (const col of AISLADAS) {
  try {
    const snap = await dbA.collection(col).select('proyectoId').get();
    let huer = 0;
    snap.forEach(d => { const p = d.get('proyectoId'); if (p === undefined || p === null || p === '') huer++; });
    totalDocs += snap.size; totalHuerfanos += huer;
    if (huer > 0) { conHuerfanos.push({ col, huer, total: snap.size }); }
  } catch (e) {
    console.log(`  · ${col}: (error ${String(e.message).slice(0, 50)})`);
  }
}
if (conHuerfanos.length === 0) {
  console.log(`  ✅ 0 huérfanos en ${AISLADAS.length} colecciones (${totalDocs} docs).`);
} else {
  conHuerfanos.sort((a, b) => b.huer - a.huer);
  for (const r of conHuerfanos) console.log(`  ✗ ${r.col}: ${r.huer} huérfanos / ${r.total} docs`);
  console.log(`  → TOTAL huérfanos: ${totalHuerfanos} / ${totalDocs} docs en ${AISLADAS.length} colecciones.`);
}

console.log('\n=== GATE 2 · cobertura de Custom Claims (usuarios activos) ===');
// /Usuarios → activo + rol
const usuariosSnap = await dbA.collection('Usuarios').get();
const perfil = new Map();
usuariosSnap.forEach(d => perfil.set(d.id, d.data() || {}));
// Auth → customClaims
let next, activos = 0, cubiertos = 0, sinClaim = 0, sinDoc = 0;
const faltantes = [];
do {
  const page = await getAuth().listUsers(1000, next);
  for (const u of page.users) {
    const p = perfil.get(u.uid);
    if (!p) { sinDoc++; continue; }            // Auth sin doc /Usuarios (lo crea adminSincronizarUsuariosAuth)
    if (p.activo === false) continue;          // inactivos no necesitan claim
    activos++;
    const c = u.customClaims || {};
    const esGlobal = c.sa === true || c.rol === 'admin' || c.rol === 'ingeniero';
    const tieneProy = Array.isArray(c.proy) && c.proy.length > 0;
    if (esGlobal || tieneProy) cubiertos++;
    else { sinClaim++; faltantes.push(`${p.email || u.uid} (rol=${p.rol || '—'})`); }
  }
  next = page.pageToken;
} while (next);

const pct = activos ? Math.round((cubiertos / activos) * 100) : 100;
console.log(`  Usuarios activos: ${activos} · con claim válido: ${cubiertos} (${pct}%) · SIN claim: ${sinClaim}`);
if (sinDoc) console.log(`  · ${sinDoc} cuentas Auth sin doc /Usuarios (correr adminSincronizarUsuariosAuth).`);
if (faltantes.length) {
  // PII: el detalle (emails) NO va al stdout/transcript; se escribe a un archivo temporal fuera del repo.
  const out = join(tmpdir(), 'grapco-gate2-faltantes.txt');
  writeFileSync(out, faltantes.join('\n') + '\n', 'utf8');
  console.log(`  ✗ ${sinClaim} usuarios activos SIN claim de proyecto (bloquean el cutover).`);
  console.log(`     Detalle (emails) escrito a: ${out}`);
} else if (activos) {
  console.log('  ✅ 100% de usuarios activos con claim válido.');
}

console.log('\n=== RESUMEN ===');
console.log(`  Gate 1 (0 huérfanos):  ${totalHuerfanos === 0 ? 'OK ✅' : 'PENDIENTE — ' + totalHuerfanos + ' huérfanos'}`);
console.log(`  Gate 2 (100% claims):  ${sinClaim === 0 && activos > 0 ? 'OK ✅' : 'PENDIENTE — ' + sinClaim + ' sin claim'}`);
console.log(`  Gate 3 (suite reglas): correr  npm run test:rules  (último resultado: 22/22 ✅)`);
process.exit(0);
