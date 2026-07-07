// SIGMA · src/firebaseConfig.js
// Backend COMPARTIDO con GRAPCO: grapco-demo-2026 (Auth + Firestore + Storage).
// Todas las plataformas del ecosistema (GRAPCO, Planeamiento, Calidad, SIGMA) usan
// LAS MISMAS CUENTAS y la misma data; SIGMA es la UI especializada en SSOMA
// (seguridad y salud ocupacional). Las VITE_SIGMA_FIREBASE_* sobreescriben estos defaults.

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, getFirestore,
  persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;
const firebaseConfig = {
  apiKey:            env.VITE_SIGMA_FIREBASE_API_KEY            || 'AIzaSyAYHowG3nzJP3ceT5ckvBPzabZFHNYfd4A',
  authDomain:        env.VITE_SIGMA_FIREBASE_AUTH_DOMAIN        || 'grapco-demo-2026.firebaseapp.com',
  projectId:         env.VITE_SIGMA_FIREBASE_PROJECT_ID         || 'grapco-demo-2026',
  storageBucket:     env.VITE_SIGMA_FIREBASE_STORAGE_BUCKET     || 'grapco-demo-2026.firebasestorage.app',
  messagingSenderId: env.VITE_SIGMA_FIREBASE_MESSAGING_SENDER_ID || '144261762944',
  appId:             env.VITE_SIGMA_FIREBASE_APP_ID             || '1:144261762944:web:03bd0e740b92f4319ebb65',
};

const app = initializeApp(firebaseConfig);

// Firestore offline-first (cache IndexedDB; cae a memoria si no hay soporte).
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
  });
} catch (e) {
  console.warn('[SIGMA] persistencia offline no disponible, usando memoria:', e?.message || e);
  _db = getFirestore(app);
}
export const db = _db;
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
