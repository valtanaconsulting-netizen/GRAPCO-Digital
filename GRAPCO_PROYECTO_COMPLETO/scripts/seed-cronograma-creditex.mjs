// scripts/seed-cronograma-creditex.mjs
// Siembra el Cronograma de CREDITEX en Firestore (Cronogramas/creditex-ptar)
// a partir de los datos estáticos del Excel (data/cronogramaObraCreditex.js),
// con el MISMO formato editable que usa CronogramaPro (seedDesdeCreditex).
// Así CREDITEX recupera su cronograma y, como el Last Planner toma su
// lookahead del cronograma, el LPS también queda operativo.
//
// Uso: node scripts/seed-cronograma-creditex.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

// Importar el dataset estático del cronograma (ES module)
const mod = await import(pathToFileURL(resolve('../src/data/cronogramaObraCreditex.js')).href);
const CRONOGRAMAOBRA = mod.CRONOGRAMAOBRA || mod.default;

const parseFecha = (txt) => {
  const m = String(txt || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
};

const tareas = CRONOGRAMAOBRA.tareas.map((t, i) => ({
  id: String(i + 1),
  nombre: t.nombre,
  nivel: Math.max(1, t.nivel || 1),
  duracion: Math.max(0, Math.round(t.duracionDias || 0)),
  predecesoras: '',
  avance: 0,
  inicioManual: parseFecha(t.comienzo),
}));

await db.collection('Cronogramas').doc('creditex-ptar').set({
  proyectoId: 'creditex-ptar',
  fechaInicio: '2025-12-15', // comienzo del cronograma NAVE (Excel)
  tareas,
  origen: 'seed-excel-creditex',
  actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
});

console.log('OK Cronograma CREDITEX sembrado:', tareas.length, 'tareas. El Last Planner tomará su lookahead de aquí.');
process.exit(0);
