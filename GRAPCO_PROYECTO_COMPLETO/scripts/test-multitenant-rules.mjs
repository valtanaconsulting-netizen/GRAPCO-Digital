// scripts/test-multitenant-rules.mjs
// ════════════════════════════════════════════════════════════════════════════
// Suite cross-tenant (GATE #3 del aislamiento multi-tenant, rec #1).
// Demuestra que `firestore.rules.endurecido` IMPIDE que un proyecto lea/escriba
// datos de otro — ANTES de tocar producción. Corre 100% en el emulator ($0).
//
// REQUIERE:  npm i -D @firebase/rules-unit-testing
// CORRER:    firebase emulators:exec --only firestore "node scripts/test-multitenant-rules.mjs"
//            (carga firestore.rules.endurecido como reglas bajo prueba)
//
// Gate: si TODO pasa (✅), las reglas endurecidas son seguras para el cutover (F5).
// ════════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules.endurecido'), 'utf8');
const PROJECT_ID = 'grapco-rules-test';

const A = 'proj-A', B = 'proj-B', LEGACY = 'creditex-ptar';

let pass = 0, fail = 0;
async function check(nombre, promesa) {
  try { await promesa; console.log('  ✅', nombre); pass++; }
  catch (e) { console.log('  ❌', nombre, '→', e?.message || e); fail++; }
}

const main = async () => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES },
  });

  // Contextos por tenant (Custom Claims simulados: { rol, proy:[...], sa }).
  const capA   = env.authenticatedContext('uA',   { rol: 'capataz', proy: [A] }).firestore();
  const capB   = env.authenticatedContext('uB',   { rol: 'capataz', proy: [B] }).firestore();
  const ingAB  = env.authenticatedContext('uAB',  { rol: 'ingeniero', proy: [A, B] }).firestore();
  const adminG = env.authenticatedContext('uADM', { rol: 'admin', sa: true }).firestore();
  const legacy = env.authenticatedContext('uLEG', { rol: 'capataz', proy: [LEGACY] }).firestore();

  // Sembrar docs con reglas DESACTIVADAS (estado inicial).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'Registros_Campo', 'rcA'),  { proyectoId: A, fecha: '2026-01-01', actividad: 'x' });
    await setDoc(doc(db, 'Registros_Campo', 'rcB'),  { proyectoId: B, fecha: '2026-01-01', actividad: 'y' });
    await setDoc(doc(db, 'Registros_Campo', 'rcLeg'),{ fecha: '2025-01-01', actividad: 'legacy' }); // SIN proyectoId
    await setDoc(doc(db, 'PresupuestoF07', 'pA'),    { proyectoId: A, monto: 100 });
    await setDoc(doc(db, 'PresupuestoF07', 'pB'),    { proyectoId: B, monto: 200 });
    await setDoc(doc(db, 'Usuarios', 'uA'), { rol: 'capataz', activo: true });
    await setDoc(doc(db, 'Usuarios', 'uB'), { rol: 'capataz', activo: true });
  });

  console.log('\n— Lectura aislada —');
  await check('A lee su propio doc (proj-A)',            assertSucceeds(getDoc(doc(capA, 'Registros_Campo', 'rcA'))));
  await check('A NO lee doc de proj-B (núcleo anti-fuga)', assertFails(getDoc(doc(capA, 'Registros_Campo', 'rcB'))));
  await check('A NO lee PresupuestoF07 de proj-B',       assertFails(getDoc(doc(capA, 'PresupuestoF07', 'pB'))));
  await check('B NO lee doc de proj-A',                  assertFails(getDoc(doc(capB, 'Registros_Campo', 'rcA'))));

  console.log('\n— Escritura anti-suplantación —');
  await check('A NO crea doc con proyectoId=proj-B',     assertFails(setDoc(doc(capA, 'Registros_Campo', 'nuevoB'), { proyectoId: B, fecha: '2026-02-01', actividad: 'z' })));
  await check('A SÍ crea doc en su proyecto',            assertSucceeds(setDoc(doc(capA, 'Registros_Campo', 'nuevoA'), { proyectoId: A, fecha: '2026-02-01', actividad: 'z' })));
  await check('A NO reasigna su doc a proj-B (update)',  assertFails(updateDoc(doc(capA, 'Registros_Campo', 'rcA'), { proyectoId: B })));

  console.log('\n— Fallback legacy (creditex-ptar) —');
  await check('A NO lee doc legacy sin proyectoId',      assertFails(getDoc(doc(capA, 'Registros_Campo', 'rcLeg'))));
  await check('Usuario legacy SÍ lee el doc legacy',     assertSucceeds(getDoc(doc(legacy, 'Registros_Campo', 'rcLeg'))));

  console.log('\n— Roles multi-proyecto / admin global —');
  await check('Ingeniero [A,B] lee proj-A',              assertSucceeds(getDoc(doc(ingAB, 'Registros_Campo', 'rcA'))));
  await check('Ingeniero [A,B] lee proj-B',              assertSucceeds(getDoc(doc(ingAB, 'Registros_Campo', 'rcB'))));
  await check('Admin/sa lee cualquier proyecto',         assertSucceeds(getDoc(doc(adminG, 'Registros_Campo', 'rcB'))));

  console.log('\n— /Usuarios endurecido —');
  await check('A lee su propio /Usuarios',               assertSucceeds(getDoc(doc(capA, 'Usuarios', 'uA'))));
  await check('A NO lee /Usuarios de B (no fuga de roles/emails)', assertFails(getDoc(doc(capA, 'Usuarios', 'uB'))));

  await env.cleanup();
  console.log(`\n══ RESULTADO: ${pass} ✅ / ${fail} ❌ ══`);
  if (fail > 0) { console.log('GATE #3 ROJO — NO desplegar el endurecido.\n'); process.exit(1); }
  console.log('GATE #3 VERDE — las reglas endurecidas bloquean cross-tenant.\n');
  process.exit(0);
};

main().catch(e => { console.error(e); process.exit(1); });
