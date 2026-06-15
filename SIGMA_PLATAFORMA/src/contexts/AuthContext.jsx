// SIGMA · src/contexts/AuthContext.jsx
// Identidad LIGERA (independiente de GRAPCO): las vistas SSOMA solo usan user.email /
// user.uid para sellar quién creó/reportó cada registro. Guardamos la identidad en
// localStorage (sin requerir login Firebase para arrancar). Para producción se puede
// cablear Firebase Auth real (getAuth/onAuthStateChanged) sin tocar las vistas.

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const Ctx = createContext({});
const KEY = 'sigma_identidad';

const cargar = () => {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => cargar());

  const identificarse = useCallback(({ nombre, email }) => {
    const u = { uid: (email || nombre || 'sigma').toLowerCase().replace(/[^\w@.-]+/g, '_'), email: email || '', nombre: nombre || email || 'Operador SIGMA' };
    setUser(u);
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {}
  }, []);

  const salir = useCallback(() => { setUser(null); try { localStorage.removeItem(KEY); } catch {} }, []);

  const value = useMemo(() => ({ user, identificarse, salir }), [user, identificarse, salir]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return c;
}
