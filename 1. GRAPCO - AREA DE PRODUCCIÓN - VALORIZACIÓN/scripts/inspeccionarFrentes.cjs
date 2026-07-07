// scripts/inspeccionarFrentes.cjs — SOLO LECTURA.
// Diagnóstico para etiquetar CREDITEX por frente (F1 PTARI / F2 NAVE) sin adivinar.
// Requiere serviceAccount.json en la raíz (gitignored). Uso: node scripts/inspeccionarFrentes.cjs
//
// Imprime: los Frentes del proyecto, cómo están repartidas hoy las actividades del
// Plan Maestro y los tareos por frenteId, y una muestra de códigos/nombres con
// cualquier pista de frente en el texto «(F1-PTARI)», «(NAVE)», «DECANTADOR», etc.

const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'serviceAccount.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const CREDITEX = 'creditex-ptar';
const DEFAULT = 'creditex-ptar'; // el proyecto default (registros legacy sin proyectoId cuentan aquí)
const perteneceCreditex = (x) => x.proyectoId === CREDITEX || !x.proyectoId;

// Pistas de frente en el texto (para proponer la clasificación PTARI vs NAVE).
const PISTA = (txt) => {
  const t = String(txt || '').toUpperCase();
  if (/\b(F2|NAVE)\b/.test(t)) return 'F2/NAVE';
  if (/\b(F1|PTARI|PTAR)\b/.test(t)) return 'F1/PTARI';
  if (/DECANTADOR/.test(t)) return '?DECANTADOR';
  return '';
};

(async () => {
  // 1) Frentes definidos
  const frSnap = await db.collection('Frentes').get();
  const frentes = frSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.proyectoId === CREDITEX || !f.proyectoId);
  console.log('\n=== FRENTES (creditex) ===');
  console.table(frentes.map(f => ({ id: f.id, codigo: f.codigo, nombre: f.nombre, orden: f.orden })));

  // 2) Plan Maestro: reparto por frenteId + pistas en el nombre
  const pmSnap = await db.collection('PlanMaestro').get();
  const pm = pmSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(perteneceCreditex);
  const porFrente = {};
  const porPista = {};
  const muestra = [];
  pm.forEach(a => {
    const k = a.frenteId || '(sin frenteId)';
    porFrente[k] = (porFrente[k] || 0) + 1;
    const p = PISTA(`${a.codigo} ${a.descripcion}`);
    if (p) porPista[p] = (porPista[p] || 0) + 1;
    if (muestra.length < 40) muestra.push({ codigo: a.codigo, desc: String(a.descripcion || '').slice(0, 48), frenteId: a.frenteId || '', pista: p });
  });
  console.log(`\n=== PLAN MAESTRO (creditex): ${pm.length} actividades ===`);
  console.log('Reparto por frenteId:', porFrente);
  console.log('Pistas de frente en el texto:', porPista);
  console.table(muestra);

  // 3) Registros_Campo (tareos): reparto por frenteId
  const rcSnap = await db.collection('Registros_Campo').get();
  const rc = rcSnap.docs.map(d => d.data()).filter(perteneceCreditex);
  const rcPorFrente = {};
  rc.forEach(r => { const k = r.frenteId || '(sin frenteId)'; rcPorFrente[k] = (rcPorFrente[k] || 0) + 1; });
  console.log(`\n=== REGISTROS_CAMPO (creditex): ${rc.length} tareos ===`);
  console.log('Reparto por frenteId:', rcPorFrente);

  console.log('\n→ Con esto diseñamos la regla de etiquetado (por pista de texto / código) y se aplica con un script aparte (con dry-run).');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
