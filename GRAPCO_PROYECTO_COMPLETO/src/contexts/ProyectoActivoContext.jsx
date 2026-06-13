// src/contexts/ProyectoActivoContext.jsx — Contexto global de Proyecto+Frente activo (B23)
//
// Este contexto guarda en localStorage qué proyecto y frente está mirando el usuario,
// y lo expone a TODAS las vistas para que filtren su data automáticamente.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LEGACY_CREDITEX_IDS, FECHA_INICIO_LEGACY } from '../config/proyecto';

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
    if (!id) return;
    let actual = null;
    try { actual = localStorage.getItem(KEY_PROY); } catch (e) {}
    if (actual === id) return; // mismo proyecto → nada que hacer
    try { localStorage.setItem(KEY_PROY, id || ''); } catch (e) {}
    try { localStorage.setItem(KEY_FRENTE, FRENTE_TODOS); } catch (e) {}
    // Cambio INSTANTÁNEO (sin recargar la página): actualizamos el estado y el
    // árbol autenticado se remonta vía key={proyectoActivoId} en App → cada
    // hook se reinicia limpio con el nuevo proyecto, igual que un reload pero
    // sin re-descargar/re-parsear el bundle ni la red. (Antes: location.reload)
    setFrenteActivoIdRaw(FRENTE_TODOS);
    setProyectoActivoIdRaw(id);
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

  // ── Fecha de inicio del proyecto activo (rige el cálculo de SEMANAS) ──
  // CREDITEX legacy mantiene su semana 1 = lunes 03/11/2025 (calendario LPS
  // confirmado). Un proyecto NUEVO usa su fecha de inicio contractual, ajustada
  // al LUNES de esa semana, para que su "Semana 1" sea la de su arranque real.
  const fechaInicioProyecto = useMemo(() => {
    if (LEGACY_CREDITEX_IDS.includes(proyectoActivoId)) return new Date(`${FECHA_INICIO_LEGACY}T00:00:00`);
    const raw = proyectoActivo?.fechaInicioContractual || proyectoActivo?.fechaInicio || null;
    let d = null;
    if (raw?.toDate) d = raw.toDate();
    else if (raw?._seconds != null) d = new Date(raw._seconds * 1000);
    else if (raw?.seconds != null) d = new Date(raw.seconds * 1000);
    else if (typeof raw === 'string') d = new Date(raw);
    else if (raw instanceof Date) d = raw;
    if (!d || isNaN(d)) return new Date('2025-11-03T00:00:00'); // respaldo seguro
    // Ajustar al lunes de la semana de inicio (corte lun-dom, igual que el LPS)
    const dow = (d.getDay() + 6) % 7; // 0 = lunes
    const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow, 0, 0, 0);
    return lunes;
  }, [proyectoActivo, proyectoActivoId]);

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
    fechaInicioProyecto,
    modoTodosFrentes, loadingProyectos,
    construirFiltros, filtrarPorContexto,
    PROYECTO_DEFAULT_ID, FRENTE_DEFAULT_ID, FRENTE_TODOS,
  }), [
    proyectos, frentes, frentesDelProyecto,
    proyectoActivoId, setProyectoActivoId,
    frenteActivoId, setFrenteActivoId,
    proyectoActivo, frenteActivo,
    fechaInicioProyecto,
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
