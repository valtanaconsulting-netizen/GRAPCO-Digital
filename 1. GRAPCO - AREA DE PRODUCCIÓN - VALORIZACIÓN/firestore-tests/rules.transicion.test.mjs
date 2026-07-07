// firestore-tests/rules.transicion.test.mjs
// ─────────────────────────────────────────────────────────────────────────────
// SUITE de la regla de TRANSICIÓN (F3) — contrato distinto al endurecido:
//   · READS ABIERTOS  (isAuth) → cero pantallas vacías; A SÍ puede leer docs de B.
//   · WRITES AISLADOS (escribeNuevo/escribeExist) → no se crea para otro tenant,
//     no se migra un doc de tenant, y un usuario no-legacy no puede crear huérfanos.
// Es el paso REVERSIBLE previo al endurecido. $0, local, NO toca producción.
//   Correr:  npm run test:rules:transicion
//      o:    firebase emulators:exec --only firestore --project demo-grapco \
//              "node firestore-tests/rules.transicion.test.mjs"
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(__dirname, '..', 'firestore.rules.transicion'), 'utf8');

const HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1';
const PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || 8080);

const testEnv = await initializeTestEnvironment({
  projectId: 'grapco-rules-transicion',
  firestore: { rules, host: HOST, port: PORT },
});

const A   = testEnv.authenticatedContext('userA', { rol: 'capataz',   proy: ['proj-A'] }).firestore();
const ENG = testEnv.authenticatedContext('eng',   { rol: 'ingeniero', proy: ['proj-A', 'proj-B'] }).firestore();
const ADM = testEnv.authenticatedContext('admin', { rol: 'admin',     sa: true }).firestore();
const LEG = testEnv.authenticatedContext('legU',  { rol: 'capataz',   proy: ['creditex-ptar'] }).firestore();
const ANON = testEnv.unauthenticatedContext().firestore();

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'Registros_Campo', 'rcA'), { proyectoId: 'proj-A', fecha: '2026-06-01', actividad: 'A' });
  await setDoc(doc(db, 'Registros_Campo', 'rcB'), { proyectoId: 'proj-B', fecha: '2026-06-01', actividad: 'B' });
  await setDoc(doc(db, 'Usuarios', 'userA'), { rol: 'capataz', email: 'a@x.com', activo: true });
  await setDoc(doc(db, 'Usuarios', 'userB'), { rol: 'capataz', email: 'b@x.com', activo: true });
  await setDoc(doc(db, 'Proyectos', 'proj-A'), { nombre: 'A' });
  await setDoc(doc(db, 'Proyectos', 'proj-B'), { nombre: 'B' });
  await setDoc(doc(db, 'Kardex_Movimientos', 'kA'), { proyectoId: 'proj-A', registradoPor: 'a@x.com' });
});

let pass = 0, fail = 0; const fallos = [];
async function check(nombre, modo, op) {
  try { await (modo === 'allow' ? assertSucceeds(op) : assertFails(op)); pass++; console.log(`  ✓ ${nombre}`); }
  catch (e) { fail++; fallos.push(nombre); console.log(`  ✗ ${nombre}  —  ${String(e.message || e).slice(0, 90)}`); }
}
const rc = (db, id) => doc(db, 'Registros_Campo', id);

console.log('\n== READS ABIERTOS (la diferencia clave de la transición) ==');
await check('A lee su Registros_Campo (proj-A)',                 'allow', getDoc(rc(A, 'rcA')));
await check('A SÍ lee Registros_Campo de proj-B (read abierto)', 'allow', getDoc(rc(A, 'rcB')));
await check('A SÍ lee /Usuarios de otro (read abierto)',         'allow', getDoc(doc(A, 'Usuarios', 'userB')));
await check('A SÍ lee Proyectos/proj-B (read abierto)',          'allow', getDoc(doc(A, 'Proyectos', 'proj-B')));
await check('Anónimo NO lee nada (sigue exigiendo auth)',        'deny',  getDoc(rc(ANON, 'rcA')));

console.log('\n== WRITES AISLADOS (ya cierran la fuga de escritura) ==');
await check('A crea Registros_Campo en proj-A',                  'allow', setDoc(rc(A, 'newA'), { proyectoId: 'proj-A', fecha: '2026-06-02', actividad: 'x' }));
await check('A NO crea Registros_Campo PARA proj-B',             'deny',  setDoc(rc(A, 'newB'), { proyectoId: 'proj-B', fecha: '2026-06-02', actividad: 'x' }));
await check('A NO crea Registros_Campo SIN proyectoId (anti-huérfano)', 'deny', setDoc(rc(A, 'noProy'), { fecha: '2026-06-02', actividad: 'x' }));
await check('Usuario legacy SÍ crea sin proyectoId (= creditex-ptar)',  'allow', setDoc(rc(LEG, 'legCreate'), { fecha: '2026-06-02', actividad: 'x' }));
await check('A NO migra su doc a proj-B',                        'deny',  updateDoc(rc(A, 'rcA'), { proyectoId: 'proj-B' }));
await check('A actualiza su doc dentro de proj-A',               'allow', updateDoc(rc(A, 'rcA'), { actividad: 'edit' }));
await check('Ingeniero(A,B) crea en proj-B',                     'allow', setDoc(rc(ENG, 'engB'), { proyectoId: 'proj-B', fecha: '2026-06-02', actividad: 'x' }));
await check('Admin/sa crea en cualquier proyecto',              'allow', setDoc(rc(ADM, 'admC'), { proyectoId: 'proj-C', fecha: '2026-06-02', actividad: 'x' }));

console.log('\n== Invariantes que se mantienen ==');
await check('A NO se auto-asciende a admin en /Usuarios',        'deny',  updateDoc(doc(A, 'Usuarios', 'userA'), { rol: 'admin', activo: true }));
await check('Kardex_Movimientos NO se actualiza (append-only)',  'deny',  updateDoc(doc(ADM, 'Kardex_Movimientos', 'kA'), { nota: 'x' }));

await testEnv.cleanup();

console.log(`\n──────────────────────────────────────────`);
console.log(`Resultado TRANSICIÓN: ${pass} OK · ${fail} FALLOS  (${pass + fail} casos)`);
if (fail) { console.log('FALLARON:\n - ' + fallos.join('\n - ')); process.exit(1); }
console.log('Regla de TRANSICIÓN ✅ — reads abiertos + writes aislados. Lista para F3 (deploy reversible).');
process.exit(0);
