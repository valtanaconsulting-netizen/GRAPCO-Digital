// src/firebaseConfig.js — v3 unificado (Bloque 14)
//
// Mejoras:
//   1. Variables desde import.meta.env (no hardcodeadas) — más seguro para Git
//   2. Exports unificados: db, auth, storage (storage estaba en _NEW pero no en el actual)
//   3. Fallback a valores por defecto si no hay .env (modo desarrollo)

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, getFirestore, connectFirestoreEmulator,
  persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Backend COMPARTIDO con GRAPCO: grapco-demo-2026 (Auth + Firestore + Storage).
// Todas las plataformas del ecosistema usan LAS MISMAS CUENTAS y la misma data;
// cada app es una UI especializada (Planeamiento) sobre ese backend único.
// Las VITE_FIREBASE_* (de .env.production) pueden sobreescribir estos defaults.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAYHowG3nzJP3ceT5ckvBPzabZFHNYfd4A",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "grapco-demo-2026.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "grapco-demo-2026",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "grapco-demo-2026.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "144261762944",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:144261762944:web:03bd0e740b92f4319ebb65",
};

const app = initializeApp(firebaseConfig);

// ── Firestore OFFLINE-FIRST (a prueba de "cerro sin señal") ──
// Cache persistente en IndexedDB: la app lee del cache sin conexión y las
// escrituras (setDoc/addDoc/updateDoc) se ENCOLAN localmente y se sincronizan
// solas al volver la señal (last-write-wins por timestamp del servidor).
// persistentMultipleTabManager → seguro con varias pestañas abiertas.
// Si el navegador no soporta IndexedDB, cae a Firestore en memoria (sin romper).
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  });
} catch (e) {
  console.warn('[firebase] persistencia offline no disponible, usando memoria:', e?.message || e);
  _db = getFirestore(app);
}
export const db      = _db;
export const auth    = getAuth(app);
export const storage = getStorage(app);

// Conexión a emulators locales en dev.
// Para usar Firebase real, definir VITE_USE_EMULATOR=false en .env.local.
const USE_EMULATOR =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_EMULATOR !== 'false' &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

if (USE_EMULATOR && !globalThis.__GRAPCO_EMULATORS_WIRED__) {
  globalThis.__GRAPCO_EMULATORS_WIRED__ = true;
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.info('[firebase] Conectado a emulators locales (Auth 9099, Firestore 8080, Storage 9199)');
  } catch (e) {
    console.warn('[firebase] No se pudo conectar a emulators:', e?.message || e);
  }
}

export default app;
