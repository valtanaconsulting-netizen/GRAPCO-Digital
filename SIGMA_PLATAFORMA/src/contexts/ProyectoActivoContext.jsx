// SIGMA · src/contexts/ProyectoActivoContext.jsx
// Versión SIMPLIFICADA (independiente de GRAPCO): solo expone lo que usan las vistas
// de SSOMA — proyectoActivoId + filtrarPorContexto — más un selector de obra/proyecto.
// SIGMA es una plataforma propia: aquí los proyectos viven en SU Firestore.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const Ctx = createContext({});
const KEY = 'sigma_proyecto_activo';
export const PROYECTO_DEFAULT_ID = 'sigma-general';

export function ProyectoActivoProvider({ children }) {
  const [proyectos, setProyectos] = useState([]);
  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [proyectoActivoId, setProyectoActivoIdRaw] = useState(() => {
    try { return localStorage.getItem(KEY) || PROYECTO_DEFAULT_ID; } catch { return PROYECTO_DEFAULT_ID; }
  });

  // Lista de obras/proyectos desde el Firestore de SIGMA (colección Proyectos).
  useEffect(() => {
    try {
      const unsub = onSnapshot(query(collection(db, 'Proyectos'), orderBy('nombre')),
        (snap) => { setProyectos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingProyectos(false); },
        () => setLoadingProyectos(false));
      return () => unsub();
    } catch { setLoadingProyectos(false); }
  }, []);

  const setProyectoActivoId = useCallback((id) => {
    if (!id) return;
    setProyectoActivoIdRaw(id);
    try { localStorage.setItem(KEY, id); } catch {}
  }, []);

  const proyectoActivo = useMemo(() => proyectos.find(p => p.id === proyectoActivoId) || null, [proyectos, proyectoActivoId]);

  // Aislamiento por obra: una observación/ATS/inspección solo se ve en su obra.
  // (En SIGMA toda la data nueva lleva proyectoId; los sin proyectoId se ven en cualquiera.)
  const filtrarPorContexto = useCallback((items /*, opts */) => {
    if (!Array.isArray(items)) return [];
    return items.filter(i => !i.proyectoId || i.proyectoId === proyectoActivoId);
  }, [proyectoActivoId]);

  const value = useMemo(() => ({
    proyectos, loadingProyectos,
    proyectoActivoId, setProyectoActivoId, proyectoActivo,
    // Campos de compatibilidad con las vistas SSOMA (frentes no se usan en SIGMA):
    frenteActivoId: null, modoTodosFrentes: true, frentesDelProyecto: [],
    filtrarPorContexto, PROYECTO_DEFAULT_ID,
  }), [proyectos, loadingProyectos, proyectoActivoId, setProyectoActivoId, proyectoActivo, filtrarPorContexto]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProyectoActivo() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useProyectoActivo debe usarse dentro de ProyectoActivoProvider');
  return c;
}
