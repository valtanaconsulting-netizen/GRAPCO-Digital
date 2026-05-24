// src/firebaseConfig.js — v3 unificado (Bloque 14)
//
// Mejoras:
//   1. Variables desde import.meta.env (no hardcodeadas) — más seguro para Git
//   2. Exports unificados: db, auth, storage (storage estaba en _NEW pero no en el actual)
//   3. Fallback a valores por defecto si no hay .env (modo desarrollo)

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Lee de variables de entorno (.env / .env.production) con fallback al proyecto demo.
// Para producción real apuntar VITE_FIREBASE_* en .env.production al projectId deseado.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAYHowG3nzJP3ceT5ckvBPzabZFHNYfd4A",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "grapco-demo-2026.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "grapco-demo-2026",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "grapco-demo-2026.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "144261762944",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:144261762944:web:03bd0e740b92f4319ebb65",
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
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
