// SIGMA · src/contexts/AuthContext.jsx
// Login REAL con Firebase Auth contra el backend compartido del ecosistema GRAPCO
// (grapco-demo-2026) → LAS MISMAS CUENTAS que GRAPCO / Planeamiento / Calidad.
// Las vistas SSOMA usan user.uid / user.email / user.nombre para sellar quién
// reportó cada registro; aquí esos campos salen de Firebase Auth + Usuarios/{uid}.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const Ctx = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { setUser(null); setLoading(false); return; }
      let nombre = fbUser.displayName || fbUser.email;
      let rol = null;
      try {
        const snap = await getDoc(doc(db, 'Usuarios', fbUser.uid));
        if (snap.exists()) { const d = snap.data() || {}; nombre = d.nombre || nombre; rol = d.rol || null; }
      } catch { /* sin doc de usuario: usamos el email */ }
      setUser({ uid: fbUser.uid, email: fbUser.email, nombre, rol });
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback((email, password) => signInWithEmailAndPassword(auth, (email || '').trim(), password), []);
  const salir = useCallback(() => signOut(auth), []);
  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, (email || '').trim()), []);

  const value = useMemo(() => ({ user, loading, login, salir, resetPassword }), [user, loading, login, salir, resetPassword]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return c;
}
