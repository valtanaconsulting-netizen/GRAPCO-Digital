// ============================================================================
// exportar-dataset-ml.mjs — Fase 0 de la dirección de ML (ml/README.md)
// ----------------------------------------------------------------------------
// Censo + snapshot de Firestore → ml/datasets/<AAAA-MM-DD>/
//   - _censo.json           conteo real de documentos por colección
//   - <Coleccion>.csv       documentos aplanados (1 nivel; anidados → JSON)
//
// Convención scripts/: correr DESDE scripts/ con serviceAccount.json en la
// raíz del área (grapco secretos). Uso vía CLI:  grapco ml exportar
//   --coleccion A,B   solo esas colecciones (por defecto: todas las raíz)
//   --limite N        máximo de docs por colección (por defecto 20000)
// ============================================================================

import admin from 'firebase-admin';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const valorDe = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const LIMITE = Number(valorDe('--limite', '20000'));
const FILTRO = valorDe('--coleccion', '').split(',').filter(Boolean);

const credencial = JSON.parse(readFileSync('../serviceAccount.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(credencial) });
const db = admin.firestore();

const hoy = new Date().toISOString().slice(0, 10);
const SALIDA = join('..', '..', 'ml', 'datasets', hoy);
mkdirSync(SALIDA, { recursive: true });

// Aplana un documento a un nivel: Timestamps → ISO, objetos/arrays → JSON
function aplanar(data) {
  const fila = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) fila[k] = '';
    else if (typeof v?.toDate === 'function') fila[k] = v.toDate().toISOString();
    else if (typeof v === 'object') fila[k] = JSON.stringify(v);
    else fila[k] = v;
  }
  return fila;
}

function celdaCsv(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escribirCsv(ruta, filas) {
  const columnas = [...new Set(filas.flatMap((f) => Object.keys(f)))].sort();
  const lineas = [columnas.join(',')];
  for (const f of filas) lineas.push(columnas.map((c) => celdaCsv(f[c])).join(','));
  // BOM (U+FEFF) para que Excel abra los CSV UTF-8 con tildes intactas
  writeFileSync(ruta, String.fromCharCode(0xfeff) + lineas.join('\n'), 'utf8');
  return columnas.length;
}

const censo = {};
const colecciones = (await db.listCollections()).map((c) => c.id).sort();
const elegidas = FILTRO.length ? colecciones.filter((c) => FILTRO.includes(c)) : colecciones;

console.log(`Colecciones raíz: ${colecciones.length} — exportando ${elegidas.length} (límite ${LIMITE} docs c/u)\n`);

for (const nombre of colecciones) {
  const cuenta = (await db.collection(nombre).count().get()).data().count;
  censo[nombre] = cuenta;
  if (!elegidas.includes(nombre)) {
    console.log(`  (censo) ${nombre}: ${cuenta} docs — no exportada por --coleccion`);
    continue;
  }
  const snap = await db.collection(nombre).limit(LIMITE).get();
  const filas = snap.docs.map((d) => ({ _id: d.id, ...aplanar(d.data()) }));
  if (!filas.length) {
    console.log(`  ${nombre}: ${cuenta} docs — vacía, sin CSV`);
    continue;
  }
  const cols = escribirCsv(join(SALIDA, `${nombre}.csv`), filas);
  const recorte = cuenta > filas.length ? ` (RECORTADA de ${cuenta}; sube --limite)` : '';
  console.log(`  ${nombre}: ${filas.length} filas × ${cols} columnas${recorte}`);
}

writeFileSync(join(SALIDA, '_censo.json'), JSON.stringify({ fecha: hoy, censo }, null, 2), 'utf8');
const total = Object.values(censo).reduce((a, b) => a + b, 0);
console.log(`\nCenso total: ${total} documentos en ${colecciones.length} colecciones.`);
console.log(`Dataset en: ml/datasets/${hoy}/  (gitignored — datos reales, NO subir)`);
