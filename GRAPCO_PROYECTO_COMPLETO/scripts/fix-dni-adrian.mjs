// scripts/fix-dni-adrian.mjs
// Asigna el DNI 8308034 a Adrian Casapaico Martinez en la colección Personal.
// Busca por nombre (tolerante a orden/variantes), NO crea duplicados:
// si existe lo actualiza, si no existe lo reporta sin crear nada.
//
// Uso: node scripts/fix-dni-adrian.mjs

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

const DNI_NUEVO = '8308034';

(async () => {
  const snap = await db.collection('Personal').get();
  console.log(`Personal: ${snap.size} docs`);

  const matches = [];
  snap.forEach(d => {
    const nom = String(d.data().nombre || '').toUpperCase();
    if (nom.includes('CASAPAICO') && nom.includes('ADRIAN')) {
      matches.push({ id: d.id, ...d.data() });
    }
  });

  if (!matches.length) {
    console.log('❌ No se encontró a Adrian Casapaico en Personal. No se creó nada.');
    // Listar nombres parecidos para diagnóstico
    snap.forEach(d => {
      const nom = String(d.data().nombre || '').toUpperCase();
      if (nom.includes('CASAPAICO') || nom.includes('ADRIAN')) {
        console.log(`  Parecido: [${d.id}] ${d.data().nombre} (dni: ${d.data().dni || '—'})`);
      }
    });
    process.exit(1);
  }

  for (const m of matches) {
    console.log(`Encontrado: [${m.id}] ${m.nombre} | cargo: ${m.cargo || '—'} | dni actual: ${m.dni || '—'}`);
    await db.collection('Personal').doc(m.id).update({ dni: DNI_NUEVO });
    console.log(`✅ DNI actualizado a ${DNI_NUEVO}`);
  }
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
