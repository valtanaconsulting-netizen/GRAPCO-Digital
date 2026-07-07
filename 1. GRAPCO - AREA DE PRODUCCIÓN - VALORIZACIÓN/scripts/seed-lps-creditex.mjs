// scripts/seed-lps-creditex.mjs
// Reconstruye el HISTÓRICO del Last Planner de CREDITEX en LPS/creditex-ptar
// a partir del PPC real (data/ppcCreditex.js): 26 semanas con realizadas /
// no cumplidas y las causas reales (CNC). Alineado a la semana 1 = lunes
// 03/11/2025 (calendario LPS de CREDITEX) para que "SEMANA N" cuadre.
//
// Uso: node scripts/seed-lps-creditex.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

const m = await import(pathToFileURL(resolve('../src/data/ppcCreditex.js')).href);
const SEMANAL = m.PPC_SEMANAL;
const CNC = m.PPC_CNC;

// Pool de causas reales expandido (Programación×48, Supervisión×25, ...) para
// repartir entre TODAS las no-cumplidas conservando la distribución del pareto.
const pool = [];
CNC.forEach(c => { for (let i = 0; i < c.n; i++) pool.push(c.cat); });
let pi = 0;
const sigCausa = () => pool[pi++ % pool.length] || 'Programación';

const SEM1_LUNES = new Date('2025-11-03T12:00:00'); // semana 1 CREDITEX
const isoLunes = (n) => { const d = new Date(SEM1_LUNES); d.setDate(d.getDate() + (n - 1) * 7); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

const semanas = {};
SEMANAL.forEach(s => {
  const iso = isoLunes(s.semana);
  const compromisos = [];
  for (let i = 0; i < (s.realizadas || 0); i++) {
    compromisos.push({ id: `h${s.semana}_r${i}`, tareaId: null, edt: '—', nombre: `Compromiso S${s.semana} · ${i + 1}`, responsable: '', cumplido: true, causa: '' });
  }
  for (let i = 0; i < (s.noCumplidas || 0); i++) {
    compromisos.push({ id: `h${s.semana}_n${i}`, tareaId: null, edt: '—', nombre: `Compromiso S${s.semana} · NC ${i + 1}`, responsable: '', cumplido: false, causa: sigCausa() });
  }
  semanas[iso] = { compromisos };
});

await db.collection('LPS').doc('creditex-ptar').set({
  proyectoId: 'creditex-ptar',
  restricciones: {},
  semanas,
  origen: 'seed-ppc-historico-creditex',
  actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
});

const totC = Object.values(semanas).reduce((a, s) => a + s.compromisos.length, 0);
console.log('OK LPS CREDITEX:', Object.keys(semanas).length, 'semanas,', totC, 'compromisos historicos. PPC y pareto reales.');
process.exit(0);
