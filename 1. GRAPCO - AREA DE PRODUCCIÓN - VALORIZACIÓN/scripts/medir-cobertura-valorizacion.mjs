// ============================================================================
// medir-cobertura-valorizacion.mjs — ¿cuánto metrado de campo NO llega a la
// valorización?
// ----------------------------------------------------------------------------
// El registro de campo guarda la actividad por NOMBRE; el presupuesto F07 se
// indexa por CÓDIGO. Para valorizar hay que emparejar ambos textos, y lo que no
// calza no se convierte en dinero. Este script replica EXACTAMENTE el cruce de
// src/hooks/useAvanceF07Vivo.js y reporta el tamaño real de la fuga.
//
// SOLO LECTURA: no escribe nada en Firestore.
//
// Convención scripts/: correr DESDE scripts/ con serviceAccount.json en la raíz
// del área (grapco secretos).
//     node medir-cobertura-valorizacion.mjs [--proyecto <id>]
// ============================================================================

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const valorDe = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const PROY_FILTRO = valorDe('--proyecto', '');

const credencial = JSON.parse(readFileSync('../serviceAccount.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(credencial) });
const db = admin.firestore();

// ── Normalizadores: COPIA FIEL de useAvanceF07Vivo.js y prefijos.js ──────────
// OJO: `norm` corta a 24 caracteres. Ese truncado es justo el origen de las
// colisiones/fallos de cruce que estamos midiendo.
const sinTildes = (s) => String(s || '').toUpperCase()
  .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
  .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N');
const norm = (s) => sinTildes(s).replace(/[^A-Z0-9]/g, '').slice(0, 24);   // con truncado
const normTxt = (s) => sinTildes(s).replace(/[^A-Z0-9]/g, '');             // sin truncado
const itemNorm = (c) => String(c || '').trim().split('.').map(x => String(parseInt(x, 10) || 0)).join('.');

// ── Diccionario de prefijos (mismo que src/utils/prefijos.js) ───────────────
const dict = JSON.parse(readFileSync('../src/data/prefijosActividades.json', 'utf8'));
const EXTRA = {
  IIEE: { tipo: 'actividad', familia: 'INSTALACIONES ELECTRICAS' },
  EMT: { tipo: 'actividad', familia: 'ESTRUCTURA METALICA' },
  CTP: { tipo: 'actividad', familia: 'CONTRAPISOS' },
  PIN: { tipo: 'actividad', familia: 'PINTURA' },
  IND: { tipo: 'actividad', familia: 'OTROS' },
};
const PREFIJOS_DICT = { ...dict.prefijos, ...EXTRA };
const byWbs = {}, byDesc = {}, famToPref = {};
(dict.actividades || []).forEach((a) => {
  if (a.tipo !== 'actividad') return;
  byWbs[itemNorm(a.wbs)] = a.prefijo;
  const d = normTxt(a.descripcion);
  if (d && !byDesc[d]) byDesc[d] = a.prefijo;
});
Object.entries(PREFIJOS_DICT).forEach(([cod, p]) => {
  if (p.familia && !famToPref[normTxt(p.familia)]) famToPref[normTxt(p.familia)] = cod;
});
const clavesDesc = Object.keys(byDesc);

function sugerirPrefijo({ codigo, descripcion, familia } = {}) {
  const c = itemNorm(codigo);
  if (c && byWbs[c]) return byWbs[c];
  const d = normTxt(descripcion);
  if (d && byDesc[d]) return byDesc[d];
  if (d.length > 8) {
    for (const k of clavesDesc) {
      if (k.length > 8 && (d.includes(k) || k.includes(d))) return byDesc[k];
    }
  }
  const f = normTxt(familia);
  if (f && famToPref[f]) return famToPref[f];
  return null;
}

const traer = async (col) => (await db.collection(col).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const num = (v) => Number(v) || 0;
const money = (n) => 'S/ ' + n.toLocaleString('es-PE', { maximumFractionDigits: 0 });

// ── Cruce por proyecto (misma cascada que el hook) ───────────────────────────
function medirProyecto(proyId, registros, presu, prefCat) {
  const ispMap = prefCat?.ispMap || {};
  const f07Map = prefCat?.f07Map || {};
  const partidas = (presu || []).filter(p => p.esPartida);
  if (!partidas.length) return null;

  const porDesc = {};
  partidas.forEach(p => { if (p.mkey && !porDesc[norm(p.descripcion)]) porDesc[norm(p.descripcion)] = p; });

  // prefijo por ítem F07 → familias con UN SOLO ítem valorizable (atribución conservadora)
  const itemsPorPref = {};
  partidas.forEach(p => {
    const pref = f07Map[p.mkey] || sugerirPrefijo({ codigo: p.item, descripcion: p.descripcion });
    if (pref) (itemsPorPref[pref] = itemsPorPref[pref] || []).push(p);
  });
  const unicoDePref = {};
  Object.entries(itemsPorPref).forEach(([pref, arr]) => {
    const valorizables = arr.filter(p => num(p.pu) > 0);
    if (valorizables.length === 1) unicoDePref[pref] = valorizables[0];
  });

  let qDesc = 0, qPref = 0, qSin = 0, nDesc = 0, nPref = 0, nSin = 0;
  let cdDesc = 0, cdPref = 0;
  const culpables = {};

  registros.forEach(r => {
    const q = num(r.metradoValidado ?? r.metradoReportado ?? r.metrado);
    if (q <= 0) return;
    const p = porDesc[norm(r.actividad)];
    if (p) { qDesc += q; nDesc++; cdDesc += q * num(p.pu); return; }
    const pref = ispMap[normTxt(r.actividad)] || sugerirPrefijo({ descripcion: r.actividad, familia: r.partida });
    const unico = pref && unicoDePref[pref];
    if (unico) { qPref += q; nPref++; cdPref += q * num(unico.pu); return; }
    qSin += q; nSin++;
    const k = r.actividad || '(sin actividad)';
    culpables[k] = (culpables[k] || 0) + q;
  });

  const qTotal = qDesc + qPref + qSin;
  const cdPresu = partidas.reduce((s, p) => s + num(p.cant) * num(p.pu), 0);
  return {
    proyId, qTotal, qDesc, qPref, qSin, nDesc, nPref, nSin,
    cdDesc, cdPref, cdPresu, nRegistros: registros.length, nPartidas: partidas.length,
    pctSin: qTotal > 0 ? (qSin / qTotal) * 100 : 0,
    culpables: Object.entries(culpables).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('Leyendo Firestore (solo lectura)…\n');
const [registros, presuF07, prefijos, proyectos] = await Promise.all([
  traer('Registros_Campo'), traer('PresupuestoF07'), traer('Prefijos_Catalogo'), traer('Proyectos'),
]);
const nombreProy = Object.fromEntries(proyectos.map(p => [p.id, p.nombre || p.codigo || p.id]));
const prefPorProy = Object.fromEntries(prefijos.map(p => [p.id, p]));

const proyIds = [...new Set([...registros, ...presuF07].map(x => x.proyectoId).filter(Boolean))]
  .filter(id => !PROY_FILTRO || id === PROY_FILTRO);

console.log(`Registros_Campo: ${registros.length}  ·  PresupuestoF07: ${presuF07.length}  ·  Proyectos con datos: ${proyIds.length}\n`);
console.log('='.repeat(78));

let hubo = false;
for (const id of proyIds) {
  const regs = registros.filter(r => r.proyectoId === id);
  const presu = presuF07.filter(p => p.proyectoId === id);
  const m = medirProyecto(id, regs, presu, prefPorProy[id]);
  if (!m) { console.log(`\n${nombreProy[id] || id}: sin presupuesto F07 cargado → no se puede valorizar.`); continue; }
  hubo = true;
  console.log(`\nPROYECTO: ${nombreProy[id] || id}`);
  console.log(`  ${m.nRegistros} registros de campo · ${m.nPartidas} partidas F07`);
  console.log(`  Metrado total con avance: ${m.qTotal.toLocaleString('es-PE', { maximumFractionDigits: 2 })}`);
  console.log('  ┌─ cómo cruza ───────────────────────────────────────────────');
  console.log(`  │ Por descripción exacta : ${m.qDesc.toFixed(2).padStart(12)}  (${m.nDesc} regs)  → ${money(m.cdDesc)}`);
  console.log(`  │ Por familia (prefijo)  : ${m.qPref.toFixed(2).padStart(12)}  (${m.nPref} regs)  → ${money(m.cdPref)}`);
  console.log(`  │ SIN CRUZAR (se pierde) : ${m.qSin.toFixed(2).padStart(12)}  (${m.nSin} regs)`);
  console.log('  └────────────────────────────────────────────────────────────');
  const sev = m.pctSin >= 30 ? '🔴' : m.pctSin >= 10 ? '🟡' : '🟢';
  console.log(`  ${sev} FUGA: ${m.pctSin.toFixed(1)}% del metrado de campo NO llega a la valorización`);
  if (m.culpables.length) {
    console.log('\n  Actividades que más metrado pierden:');
    m.culpables.forEach(([n, q]) => console.log(`    ${q.toFixed(2).padStart(10)}  ${n}`));
  }
}
if (!hubo) console.log('\nNingún proyecto tiene a la vez registros de campo y presupuesto F07.');
console.log('\n' + '='.repeat(78));
process.exit(0);
