// src/hooks/useColeccionAislada.js
// ════════════════════════════════════════════════════════════════════════════
// Hook de SUSCRIPCIÓN AISLADA POR PROYECTO — rec #1 (aislamiento multi-tenant).
// Trae del SERVIDOR solo los docs del proyecto activo (where('proyectoId')): corta
// la fuga visible entre proyectos y el costo de bajar colecciones completas. Es el
// patrón por defecto para suscripciones NUEVAS; complementa (no reemplaza) a
// filtrarPorContexto como segunda malla de defensa en profundidad.
//
// ⚠️  Andamiaje de la Fase F0 del rollout (ver docs/DISENO-MULTITENANT-2026-06.md).
//     Aún NO está cableado en ningún módulo: se migran incrementalmente los que hoy
//     bajan colecciones completas (PanelGerencia, PortfolioDashboard, EstadoObra…).
//
// Uso:
//   const { data, loading } = useColeccionAislada('Registros_Campo', {
//     filtros: [where('fecha', '==', hoy)],
//     orderByClause: orderBy('creadoEn', 'desc'),
//     porFrente: true,
//   });
//
// NOTA legacy: en el proyecto DEFAULT ('creditex-ptar') hay docs antiguos SIN
// proyectoId; where('==') no los devuelve. Mientras BACKFILL_COMPLETO sea false se
// hace una segunda suscripción que rescata esos huérfanos y se mergea. Tras el
// backfill (F2/F6) se pone BACKFILL_COMPLETO = true y queda 1 solo listener.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useProyectoActivo, PROYECTO_DEFAULT_ID } from '../contexts/ProyectoActivoContext';

// Se pone en true cuando el backfill de proyectoId esté al 100% (F6 del rollout).
// Mientras sea false, solo el proyecto DEFAULT paga la doble-suscripción legacy.
export const BACKFILL_COMPLETO = false;

const mergeDedupById = (a, b) => {
  const map = new Map();
  for (const x of a) map.set(x.id, x);
  for (const x of b) if (!map.has(x.id)) map.set(x.id, x);
  return Array.from(map.values());
};

export function useColeccionAislada(nombreColeccion, opts = {}) {
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes } = useProyectoActivo();
  const {
    filtros = [],
    orderByClause = null,
    incluirLegacy = true,
    porFrente = false,
  } = opts;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Clave estable para las deps (los filtros son objetos de query no serializables 1:1).
  const filtrosKey = `${filtros.length}|${porFrente}|${incluirLegacy}|${orderByClause ? 'ob' : ''}`;

  useEffect(() => {
    if (!proyectoActivoId) { setData([]); setLoading(false); return; }
    setLoading(true);

    const clauses = [where('proyectoId', '==', proyectoActivoId), ...filtros];
    if (porFrente && !modoTodosFrentes && frenteActivoId) clauses.push(where('frenteId', '==', frenteActivoId));
    if (orderByClause) clauses.push(orderByClause);

    const unsubs = [];
    let parte1 = [], parte2 = [];
    const emit = () => setData(mergeDedupById(parte1, parte2));
    const onErr = (e) => { console.warn('[useColeccionAislada]', nombreColeccion, e?.code || e); setLoading(false); };

    const qMain = query(collection(db, nombreColeccion), ...clauses);
    unsubs.push(onSnapshot(qMain, s => {
      parte1 = s.docs.map(d => ({ id: d.id, ...d.data() }));
      emit(); setLoading(false);
    }, onErr));

    // Rescate de huérfanos legacy: SOLO en el proyecto default y SOLO hasta el backfill.
    if (incluirLegacy && proyectoActivoId === PROYECTO_DEFAULT_ID && !BACKFILL_COMPLETO) {
      const qLegacy = query(collection(db, nombreColeccion));
      unsubs.push(onSnapshot(qLegacy, s => {
        parte2 = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.proyectoId);
        emit();
      }, onErr));
    }

    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombreColeccion, proyectoActivoId, frenteActivoId, modoTodosFrentes, filtrosKey]);

  return { data, loading };
}

// Helper de ESCRITURA aislada: estampa SIEMPRE proyectoId (y frenteId si aplica) en
// el payload, para que ningún doc nuevo nazca huérfano — cierra la FUENTE del problema
// (p. ej. los batch.set de Capataz.jsx que hoy crean Registros_Campo sin proyectoId).
export function construirDocAislado(data, proyectoActivoId, frenteActivoId) {
  const extra = { proyectoId: proyectoActivoId || PROYECTO_DEFAULT_ID };
  if (frenteActivoId) extra.frenteId = frenteActivoId;
  return { ...data, ...extra };
}

export default useColeccionAislada;
