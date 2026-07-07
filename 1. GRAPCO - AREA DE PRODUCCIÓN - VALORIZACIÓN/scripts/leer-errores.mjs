// scripts/leer-errores.mjs — últimos errores registrados por el ErrorBoundary
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'grapco-demo-2026' });
const db = admin.firestore();

const snap = await db.collection('Auditoria_Seguridad').orderBy('timestamp', 'desc').limit(4).get();
snap.forEach(d => {
  const x = d.data();
  console.log('────────────────────────────');
  console.log('fecha:', x.timestamp?.toDate?.() || x.timestamp, '| tipo:', x.tipo || '');
  Object.entries(x).forEach(([k, v]) => {
    if (['timestamp'].includes(k)) return;
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (s) console.log(`${k}:`, s.slice(0, 700));
  });
});
process.exit(0);
