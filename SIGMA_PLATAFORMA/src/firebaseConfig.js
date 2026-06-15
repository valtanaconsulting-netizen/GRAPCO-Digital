// SIGMA · src/firebaseConfig.js
// Firebase PROPIO de SIGMA (totalmente independiente de GRAPCO).
// 1) Crea un proyecto Firebase gratis (plan Spark, sin tarjeta) en https://console.firebase.google.com
// 2) Agrega una app Web y copia sus credenciales a un archivo .env (ver .env.example).
//    VITE_SIGMA_FIREBASE_API_KEY, ..._AUTH_DOMAIN, ..._PROJECT_ID, ..._STORAGE_BUCKET,
//    ..._MESSAGING_SENDER_ID, ..._APP_ID
// 3) Activa Firestore (modo producción) y Storage.

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, getFirestore,
  persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;
const firebaseConfig = {
  apiKey:            env.VITE_SIGMA_FIREBASE_API_KEY            || 'PEGA_TU_API_KEY',
  authDomain:        env.VITE_SIGMA_FIREBASE_AUTH_DOMAIN        || 'TU-PROYECTO-SIGMA.firebaseapp.com',
  projectId:         env.VITE_SIGMA_FIREBASE_PROJECT_ID         || 'tu-proyecto-sigma',
  storageBucket:     env.VITE_SIGMA_FIREBASE_STORAGE_BUCKET     || 'tu-proyecto-sigma.appspot.com',
  messagingSenderId: env.VITE_SIGMA_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId:             env.VITE_SIGMA_FIREBASE_APP_ID             || '1:000000000000:web:000000000000',
};

if (firebaseConfig.apiKey === 'PEGA_TU_API_KEY') {
  console.warn('[SIGMA] Firebase NO configurado: copia .env.example a .env y pega las credenciales de TU proyecto Firebase.');
}

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
