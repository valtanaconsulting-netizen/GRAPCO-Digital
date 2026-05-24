// src/contexts/ProyectoActivoContext.jsx — Contexto global de Proyecto+Frente activo (B23)
//
// Este contexto guarda en localStorage qué proyecto y frente está mirando el usuario,
// y lo expone a TODAS las vistas para que filtren su data automáticamente.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const ProyectoActivoContext = createContext({});

const KEY_PROY = 'grapco_proyecto_activo';
const KEY_FRENTE = 'grapco_frente_activo';

export const PROYECTO_DEFAULT_ID = 'default-ptari';
export const FRENTE_DEFAULT_ID = 'frente-general';
export const FRENTE_TODOS = '__TODOS__';

export function ProyectoActivoProvider({ children }) {
  const [proyectos, setProyectos] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [loadingProyectos, setLoadingProyectos] = useState(true);

  const [proyectoActivoId, setProyectoActivoIdRaw] = useState(() => {
    try { return localStorage.getItem(KEY_PROY) || PROYECTO_DEFAULT_ID; }
    catch { return PROYECTO_DEFAULT_ID; }
  });

  const [frenteActivoId, setFrenteActivoIdRaw] = useState(() => {
    try { return localStorage.getItem(KEY_FRENTE) || FRENTE_TODOS; }
    catch { return FRENTE_TODOS; }
  });

  // Setters envueltos en useCallback para que sean estables (no causan loops en useEffect deps).
  // Al cambiar de PROYECTO se hace un reload limpio para evitar problemas de re-render
  // entre componentes que tienen hooks dependientes del contexto de proyecto.
  // Trade-off intencional: cambiar de proyecto recarga la página (UX un instante de blanco)
  // pero garantiza estabilidad para roles que pasan entre proyectos (admins).
  const setProyectoActivoId = useCallback((id) => {
    // Si el nuevo id es el mismo que el actual, no hacer nada (evita reload innecesario)
    let actual = null;
    try { actual = localStorage.getItem(KEY_PROY); } catch (e) {}
    if (actual === id) return;
    try { localStorage.setItem(KEY_PROY, id || ''); } catch (e) {}
    try { localStorage.setItem(KEY_FRENTE, FRENTE_TODOS); } catch (e) {}
    // Reload completo para reiniciar todos los hooks con el nuevo contexto.
    // Evita Error #300 / #310 al cambiar entre proyectos.
    window.location.reload();
  }, []);

  const setFrenteActivoId = useCallback((id) => {
    setFrenteActivoIdRaw(id);
    try { localStorage.setItem(KEY_FRENTE, id || ''); } catch (e) {}
  }, []);

  useEffect(() => {
    let pending = 2;
    const dec = () => { pending -= 1; if (pending <= 0) setLoadingProyectos(false); };

    const unsubP = onSnapshot(query(collection(db, 'Proyectos'), orderBy('nombre')),
      (snap) => {
        setProyectos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        dec();
      },
      (e) => { console.warn('[Proyectos]', e); dec(); });

    const unsubF = onSnapshot(query(collection(db, 'Frentes'), orderBy('orden')),
      (snap) => {
        setFrentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        dec();
      },
      (e) => { console.warn('[Frentes]', e); dec(); });

    return () => { unsubP(); unsubF(); };
  }, []);

  // Auto-asignar proyecto al usuario nuevo: si el proyectoActivoId guardado
  // no corresponde a ningún proyecto real (ej. usuario por primera vez en
  // este dispositivo → queda en PROYECTO_DEFAULT_ID), saltamos al primer
  // proyecto real disponible. Así evita que vea "Capataz 1/2/3" genéricos.
  useEffect(() => {
    if (loadingProyectos) return;
    if (!Array.isArray(proyectos) || proyectos.length === 0) return;
    const existe = proyectos.some(p => p.id === proyectoActivoId);
    if (existe) return;
    // Sin localStorage previo o apuntando al default legacy → auto-pick.
    const elegido = proyectos[0].id;
    setProyectoActivoIdRaw(elegido);
    try { localStorage.setItem(KEY_PROY, elegido); } catch (e) {}
  }, [loadingProyectos, proyectos, proyectoActivoId]);

  const frentesDelProyecto = useMemo(() => {
    return frentes.filter(f => f.proyectoId === proyectoActivoId);
  }, [frentes, proyectoActivoId]);

  const proyectoActivo = useMemo(() => {
    return proyectos.find(p => p.id === proyectoActivoId) || null;
  }, [proyectos, proyectoActivoId]);

  const frenteActivo = useMemo(() => {
    if (frenteActivoId === FRENTE_TODOS) return null;
    return frentes.find(f => f.id === frenteActivoId) || null;
  }, [frentes, frenteActivoId]);

  const modoTodosFrentes = frenteActivoId === FRENTE_TODOS;

  const construirFiltros = useCallback(() => {
    const f = { proyectoId: proyectoActivoId };
    if (!modoTodosFrentes && frenteActivoId) f.frenteId = frenteActivoId;
    return f;
  }, [proyectoActivoId, frenteActivoId, modoTodosFrentes]);

  // Filtrado por contexto activo (cada proyecto tiene su propia data, no se mezclan).
  // - Items con proyectoId que NO coincida con el activo → ocultos
  // - Items SIN proyectoId (legacy/huerfanos): visibles solo cuando el proyecto activo es el DEFAULT
  //   (donde vive la data historica original). En proyectos creados nuevos, no aparecen.
  //
  // Envuelto en useCallback para que sea estable y no dispare re-suscripciones infinitas
  // en los useEffect que lo tienen como dependencia (causaria React error #300 / loop).
  const filtrarPorContexto = useCallback((items, opts = {}) => {
    if (!Array.isArray(items)) return [];
    const { ignorarProyecto = false, ignorarFrente = false } = opts;
    return items.filter(i => {
      if (!ignorarProyecto) {
        if (i.proyectoId && i.proyectoId !== proyectoActivoId) return false;
        if (!i.proyectoId && proyectoActivoId !== PROYECTO_DEFAULT_ID) return false;
      }
      if (!ignorarFrente && !modoTodosFrentes && i.frenteId && i.frenteId !== frenteActivoId) return false;
      return true;
    });
  }, [proyectoActivoId, frenteActivoId, modoTodosFrentes]);

  // Memorizar value para evitar re-renders innecesarios en todos los consumidores.
  const value = useMemo(() => ({
    proyectos, frentes, frentesDelProyecto,
    proyectoActivoId, setProyectoActivoId,
    frenteActivoId, setFrenteActivoId,
    proyectoActivo, frenteActivo,
    modoTodosFrentes, loadingProyectos,
    construirFiltros, filtrarPorContexto,
    PROYECTO_DEFAULT_ID, FRENTE_DEFAULT_ID, FRENTE_TODOS,
  }), [
    proyectos, frentes, frentesDelProyecto,
    proyectoActivoId, setProyectoActivoId,
    frenteActivoId, setFrenteActivoId,
    proyectoActivo, frenteActivo,
    modoTodosFrentes, loadingProyectos,
    construirFiltros, filtrarPorContexto,
  ]);

  return (
    <ProyectoActivoContext.Provider value={value}>
      {children}
    </ProyectoActivoContext.Provider>
  );
}

export function useProyectoActivo() {
  const ctx = useContext(ProyectoActivoContext);
  if (!ctx) throw new Error('useProyectoActivo debe usarse dentro de ProyectoActivoProvider');
  return ctx;
}
