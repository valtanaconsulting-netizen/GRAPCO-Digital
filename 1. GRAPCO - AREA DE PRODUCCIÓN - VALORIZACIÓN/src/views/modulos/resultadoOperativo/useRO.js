// src/views/modulos/resultadoOperativo/useRO.js — Hook compartido para calcular el RO (B21)

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import {
  calcularROMensual, CATEGORIAS_MO,
} from '../../../utils/planMaestroAnalytics';

// Colecciones que alimentan el RO. `key` = nombre del campo en el estado crudo.
// Una sola fuente de verdad para suscribir, filtrar y exponer las 11 colecciones.
const FUENTES_RO = [
  { key: 'actividades',      col: 'PlanMaestro',                   tag: '[PM]'       },
  { key: 'apus',             col: 'APUs',                          tag: '[APUs]'     },
  { key: 'tareos',           col: 'Registros_Campo',               tag: '[Tareos]'   },
  { key: 'kardexMov',        col: 'Kardex_Movimientos',            tag: '[Kardex]'   },
  { key: 'historial',        col: 'Historial',                     tag: '[Hist]'     },
  { key: 'valorizaciones',   col: 'ValorizacionesContractuales',   tag: '[Val]'      },
  { key: 'facturas',         col: 'Registro_Facturas',             tag: '[Facturas]' },
  { key: 'valorizacionesSC', col: 'ValorizacionesSubcontratistas', tag: '[ValSC]'    },
  { key: 'gastosGenerales',  col: 'GG_Oficina',                    tag: '[GG]'       },
  { key: 'adicionales',      col: 'Adicionales',                   tag: '[Adic]'     },
  { key: 'deductivos',       col: 'Deductivos',                    tag: '[Deduct]'   },
];
const RAW_INICIAL = Object.fromEntries(FUENTES_RO.map(f => [f.key, []]));

/**
 * Hook que carga TODOS los datos necesarios y calcula el RO completo.
 * Lo usan: RODashboard, ROporPartida, ROProyeccion, CurvaSFinanciera.
 */
export default function useRO({ margenMeta = 15, fechaActual: fechaActualProp = null, ignorarFrente = false } = {}) {
  // Aislamiento multi-proyecto: el RO usa SOLO la data del proyecto activo.
  // ignorarFrente: cargar TODOS los frentes (para el RO comparativo F1 vs F2).
  const { proyectoActivoId, filtrarPorContexto } = useProyectoActivo();
  // Fecha ESTABLE: sin esto el default new Date() recalcula TODO el RO en cada render.
  const fechaActual = useMemo(() => fechaActualProp || new Date(), [fechaActualProp]);

  // Datos CRUDOS por colección (sin filtrar por frente). La SUSCRIPCIÓN depende
  // SOLO de proyectoActivoId → cambiar de frente NO re-baja la red; solo recalcula
  // el filtrado en memoria (useMemo de abajo). El árbol ya se remonta al cambiar de
  // proyecto (key={proyectoActivoId} en App), así que esto suscribe una vez por obra.
  const [raw, setRaw] = useState(RAW_INICIAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pendientes = FUENTES_RO.length;
    const dec = () => { pendientes -= 1; if (pendientes <= 0) setLoading(false); };
    const unsubs = FUENTES_RO.map(({ key, col, tag }) =>
      onSnapshot(collection(db, col),
        (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRaw(prev => ({ ...prev, [key]: docs }));
          dec();
        },
        (e) => { console.warn(tag, e); dec(); }));
    return () => unsubs.forEach(u => u());
    // Solo proyectoActivoId: el frente se aplica en memoria, NO re-suscribe.
  }, [proyectoActivoId]);

  // Filtrado por frente EN MEMORIA (barato). HONRA el frente: con "Todos los frentes"
  // el RO es de toda la obra; al elegir F1 (PTARI) o F2 (NAVE) se recalcula para ese
  // frente. ignorarFrente: el RO comparativo F1/F2 ve todos los frentes.
  const filtrado = useMemo(() => {
    const opts = ignorarFrente ? { ignorarFrente: true } : {};
    return Object.fromEntries(
      FUENTES_RO.map(f => [f.key, filtrarPorContexto(raw[f.key], opts)])
    );
  }, [raw, filtrarPorContexto, ignorarFrente]);

  const {
    actividades, apus, tareos, kardexMov, historial, valorizaciones,
    facturas, valorizacionesSC, gastosGenerales, adicionales, deductivos,
  } = filtrado;

  // Map de salarios por categoría desde insumos (si existen) o desde defaults
  const salariosPorCategoria = useMemo(() => {
    const m = new Map();
    CATEGORIAS_MO.forEach(c => m.set(c.id, c.salarioBase));
    return m;
  }, []);

  // Calcular el RO
  const ro = useMemo(() => {
    if (loading) return null;
    return calcularROMensual({
      actividades, apus, tareos,
      kardexMovimientos: kardexMov,
      valorizaciones,
      facturas, valorizacionesSC, gastosGenerales,
      adicionales, deductivos,
      salariosPorCategoria,
      fechaActual, margenMeta,
    });
    // `filtrado` agrupa las 11 colecciones ya filtradas: su identidad cambia
    // cuando cambian los datos o el frente → cubre las 11 sin listarlas suelta.
  }, [loading, filtrado, salariosPorCategoria, fechaActual, margenMeta]);

  return {
    ro, loading,
    actividades, apus, tareos, kardexMov, historial, valorizaciones,
    facturas, valorizacionesSC, gastosGenerales, adicionales, deductivos,
  };
}
