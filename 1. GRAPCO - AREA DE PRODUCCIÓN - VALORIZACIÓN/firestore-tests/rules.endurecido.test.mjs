// firestore-tests/rules.endurecido.test.mjs
// ─────────────────────────────────────────────────────────────────────────────
// SUITE CROSS-TENANT (Gate 3 del cutover multi-tenant, rec #1).
// Carga firestore.rules.endurecido en el emulador y prueba las invariantes
// anti-fuga del diseño (docs/DISENO-MULTITENANT-2026-06.md §Plan de pruebas A).
// $0, local, NO toca producción. Verde = el gate 3 de las REGLAS está cumplido
// (faltan los otros 2 gates: 0 huérfanos y 100% claims, que se miden contra datos).
//
// Correr:  npm run test:rules     (ver package.json)
//   o:     firebase emulators:exec --only firestore --project demo-grapco \
//            "node firestore-tests/rules.endurecido.test.mjs"
// Requiere: Java + @firebase/rules-unit-testing (ya instalados).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(__dirname, '..', 'firestore.rules.endurecido'), 'utf8');

const HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1';
const PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || 8080);

const testEnv = await initializeTestEnvironment({
  projectId: 'grapco-rules-test',
  firestore: { rules, host: HOST, port: PORT },
});

// ── Contextos (el 2º arg de authenticatedContext son los CUSTOM CLAIMS) ──
const A   = testEnv.authenticatedContext('userA', { rol: 'capataz',   proy: ['proj-A'] }).firestore();          // capataz tenant A
const B   = testEnv.authenticatedContext('userB', { rol: 'capataz',   proy: ['proj-B'] }).firestore();          // capataz tenant B
const ENG = testEnv.authenticatedContext('eng',   { rol: 'ingeniero', proy: ['proj-A', 'proj-B'] }).firestore(); // ingeniero multi-proyecto
const ADM = testEnv.authenticatedContext('admin', { rol: 'admin',     sa: true }).firestore();                   // superadmin
const LEG = testEnv.authenticatedContext('legU',  { rol: 'capataz',   proy: ['creditex-ptar'] }).firestore();    // usuario legacy
const ANON = testEnv.unauthenticatedContext().firestore();

// ── Semilla (con reglas DESACTIVADAS) ──
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'Registros_Campo', 'rcA'),      { proyectoId: 'proj-A', fecha: '2026-06-01', actividad: 'Acero A' });
  await setDoc(doc(db, 'Registros_Campo', 'rcB'),      { proyectoId: 'proj-B', fecha: '2026-06-01', actividad: 'Acero B' });
  await setDoc(doc(db, 'Registros_Campo', 'rcC'),      { proyectoId: 'proj-C', fecha: '2026-06-01', actividad: 'Acero C' });
  await setDoc(doc(db, 'Registros_Campo', 'rcLegacy'), { fecha: '2026-06-01', actividad: 'Legacy sin proyectoId' });
  await setDoc(doc(db, 'Cartas_Balance', 'cbA'),       { proyectoId: 'proj-A', uidAutor: 'userA' });
  await setDoc(doc(db, 'Usuarios', 'userA'),           { rol: 'capataz', email: 'a@x.com', activo: true, proyectoIdAsignado: 'proj-A' });
  await setDoc(doc(db, 'Usuarios', 'userB'),           { rol: 'capataz', email: 'b@x.com', activo: true, proyectoIdAsignado: 'proj-B' });
  await setDoc(doc(db, 'Proyectos', 'proj-A'),         { nombre: 'Proyecto A' });
  await setDoc(doc(db, 'Proyectos', 'proj-B'),         { nombre: 'Proyecto B' });
  await setDoc(doc(db, 'Frentes', 'fA'),               { proyectoId: 'proj-A' });
  await setDoc(doc(db, 'Kardex_Movimientos', 'kA'),    { proyectoId: 'proj-A', registradoPor: 'a@x.com' });
});

// ── Mini-runner ──
let pass = 0, fail = 0; const fallos = [];
async function check(nombre, modo, op) {
  try {
    await (modo === 'allow' ? assertSucceeds(op) : assertFails(op));
    pass++; console.log(`  ✓ ${nombre}`);
  } catch (e) {
    fail++; fallos.push(nombre);
    console.log(`  ✗ ${nombre}  —  ${String(e.message || e).slice(0, 90)}`);
  }
}
const rc = (db, id) => doc(db, 'Registros_Campo', id);

console.log('\n== Lectura aislada por proyecto ==');
await check('A lee su Registros_Campo (proj-A)',           'allow', getDoc(rc(A, 'rcA')));
await check('A NO lee Registros_Campo de proj-B',          'deny',  getDoc(rc(A, 'rcB')));
await check('Anónimo NO lee nada',                          'deny',  getDoc(rc(ANON, 'rcA')));

console.log('\n== Escritura: anti-suplantación de tenant ==');
await check('A crea Registros_Campo en proj-A',            'allow', setDoc(rc(A, 'newA'), { proyectoId: 'proj-A', fecha: '2026-06-02', actividad: 'nuevo' }));
await check('A NO crea Registros_Campo PARA proj-B',       'deny',  setDoc(rc(A, 'newB'), { proyectoId: 'proj-B', fecha: '2026-06-02', actividad: 'nuevo' }));
await check('A NO migra su doc a proj-B',                  'deny',  updateDoc(rc(A, 'rcA'), { proyectoId: 'proj-B' }));
await check('A actualiza su doc dentro de proj-A',         'allow', updateDoc(rc(A, 'rcA'), { actividad: 'editado' }));

console.log('\n== Fallback legacy (doc sin proyectoId == creditex-ptar) ==');
await check('A NO lee doc legacy',                          'deny',  getDoc(rc(A, 'rcLegacy')));
await check('Usuario legacy (creditex-ptar) SÍ lee legacy', 'allow', getDoc(rc(LEG, 'rcLegacy')));

console.log('\n== Multi-proyecto (ingeniero) y superadmin ==');
await check('Ingeniero(A,B) lee proj-A',                   'allow', getDoc(rc(ENG, 'rcA')));
await check('Ingeniero(A,B) lee proj-B',                   'allow', getDoc(rc(ENG, 'rcB')));
await check('Ingeniero(A,B) NO lee proj-C',               'deny',  getDoc(rc(ENG, 'rcC')));
await check('Admin/sa lee cualquier proyecto (proj-B)',   'allow', getDoc(rc(ADM, 'rcB')));

console.log('\n== Cartas_Balance: autoría ==');
await check('A crea Carta Balance propia en proj-A',      'allow', setDoc(doc(A, 'Cartas_Balance', 'cbNew'), { proyectoId: 'proj-A', uidAutor: 'userA' }));
await check('A NO crea Carta Balance con autor ajeno',    'deny',  setDoc(doc(A, 'Cartas_Balance', 'cbX'),   { proyectoId: 'proj-A', uidAutor: 'otro' }));

console.log('\n== Globales: /Usuarios self-or-admin, /Proyectos por claim ==');
await check('A lee su propio /Usuarios',                  'allow', getDoc(doc(A, 'Usuarios', 'userA')));
await check('A NO lee /Usuarios de otro',                 'deny',  getDoc(doc(A, 'Usuarios', 'userB')));
await check('Admin lee /Usuarios de cualquiera',          'allow', getDoc(doc(ADM, 'Usuarios', 'userB')));
await check('A NO se auto-asciende a admin',              'deny',  updateDoc(doc(A, 'Usuarios', 'userA'), { rol: 'admin', activo: true }));
await check('A lee Proyectos/proj-A (en su claim)',       'allow', getDoc(doc(A, 'Proyectos', 'proj-A')));
await check('A NO lee Proyectos/proj-B (cartera ajena)',  'deny',  getDoc(doc(A, 'Proyectos', 'proj-B')));

console.log('\n== Append-only ==');
await check('Kardex_Movimientos NO se actualiza (ni admin)', 'deny', updateDoc(doc(ADM, 'Kardex_Movimientos', 'kA'), { nota: 'x' }));

await testEnv.cleanup();

console.log(`\n──────────────────────────────────────────`);
console.log(`Resultado: ${pass} OK · ${fail} FALLOS  (${pass + fail} casos)`);
if (fail) { console.log('FALLARON:\n - ' + fallos.join('\n - ')); process.exit(1); }
console.log('GATE 3 (reglas) ✅ — sin fugas cross-tenant en la suite.');
process.exit(0);
