// scripts/renombrar-apellidos-primero.mjs
// El formato oficial GRAPCO en el tareo es "APELLIDOS NOMBRES" (como el
// F13_MPO). Este script renombra las fichas de Personal que estén guardadas
// como "NOMBRES APELLIDOS" y replica el cambio en Cuadrillas (miembros).
// NO toca Registros_Campo: el resolver de nombres canónicos agrupa las
// variantes con palabras reordenadas hacia la ficha oficial.
//
// Uso: node scripts/renombrar-apellidos-primero.mjs

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

// viejo (nombre-primero) → nuevo (APELLIDOS NOMBRES, según F13 oficial)
const RENOMBRES = {
  'ADRIAN MARTINEZ CASAPAICO': 'CASAPAICO MARTINEZ ADRIAN',
  'CARLOS MARTINEZ CARVAJAL': 'CARVAJAL MARTINEZ CARLOS',
  'JUAN VICTOR CABEZAS AGUILAR': 'CABEZAS AGUILAR JUAN VICTOR',
  'QUISPE FERNANDEZ, EDWIN YONY': 'QUISPE FERNANDEZ EDWIN YONY',
};

const aplicar = (nombre) => RENOMBRES[String(nombre || '').trim().toUpperCase().replace(/\s+/g, ' ')] || null;

(async () => {
  // ── Personal ──
  const personal = await db.collection('Personal').get();
  console.log(`Personal (${personal.size} docs):`);
  for (const d of personal.docs) {
    const nom = d.data().nombre || '';
    const nuevo = aplicar(nom);
    if (nuevo) {
      await d.ref.update({ nombre: nuevo });
      console.log(`  ✏️  [${d.id}] "${nom}" → "${nuevo}"`);
    } else {
      console.log(`  ✓  [${d.id}] "${nom}" (sin cambio)`);
    }
  }

  // ── Cuadrillas: miembros por nombre (string o {nombre}) ──
  const cuadrillas = await db.collection('Cuadrillas').get();
  console.log(`\nCuadrillas (${cuadrillas.size} docs):`);
  for (const d of cuadrillas.docs) {
    const data = d.data();
    let cambio = false;
    const nuevoData = {};
    Object.entries(data).forEach(([campo, valor]) => {
      if (Array.isArray(valor)) {
        const arr = valor.map(item => {
          if (typeof item === 'string') {
            const nuevo = aplicar(item);
            if (nuevo) { cambio = true; return nuevo; }
            return item;
          }
          if (item && typeof item === 'object' && item.nombre) {
            const nuevo = aplicar(item.nombre);
            if (nuevo) { cambio = true; return { ...item, nombre: nuevo }; }
          }
          return item;
        });
        if (cambio) nuevoData[campo] = arr;
      } else if (typeof valor === 'string') {
        const nuevo = aplicar(valor);
        if (nuevo) { cambio = true; nuevoData[campo] = nuevo; }
      }
    });
    if (cambio) {
      await d.ref.update(nuevoData);
      console.log(`  ✏️  [${d.id}] campos actualizados: ${Object.keys(nuevoData).join(', ')}`);
    } else {
      console.log(`  ✓  [${d.id}] ${data.capataz || data.nombre || ''} (sin cambio)`);
    }
  }

  console.log('\n✅ Listo. Formato oficial: APELLIDOS NOMBRES.');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
