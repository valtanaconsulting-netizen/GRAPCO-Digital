// src/views/modulos/resultadoOperativo/useRO.js — Hook compartido para calcular el RO (B21)

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import {
  calcularROMensual, CATEGORIAS_MO,
} from '../../../utils/planMaestroAnalytics';

/**
 * Hook que carga TODOS los datos necesarios y calcula el RO completo.
 * Lo usan: RODashboard, ROporPartida, ROProyeccion, CurvaSFinanciera.
 */
export default function useRO({ margenMeta = 15, fechaActual = new Date() } = {}) {
  // Aislamiento multi-proyecto: el RO usa SOLO la data del proyecto activo.
  const { filtrarPorContexto } = useProyectoActivo();
  const [actividades, setActividades] = useState([]);
  const [apus, setApus] = useState([]);
  const [tareos, setTareos] = useState([]);
  const [kardexMov, setKardexMov] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [valorizaciones, setValorizaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pendientes = 6;
    const dec = () => { pendientes -= 1; if (pendientes <= 0) setLoading(false); };
    // Mapea el snapshot y aísla por proyecto activo (ignora frente: el RO es por obra).
    const filt = (snap) => filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true });

    const unsubs = [
      onSnapshot(collection(db, 'PlanMaestro'),
        (snap) => { setActividades(filt(snap)); dec(); },
        (e) => { console.error('[PM]', e); dec(); }),
      onSnapshot(collection(db, 'APUs'),
        (snap) => { setApus(filt(snap)); dec(); },
        (e) => { console.error('[APUs]', e); dec(); }),
      onSnapshot(collection(db, 'Registros_Campo'),
        (snap) => { setTareos(filt(snap)); dec(); },
        (e) => { console.warn('[Tareos]', e); dec(); }),
      onSnapshot(collection(db, 'Kardex_Movimientos'),
        (snap) => { setKardexMov(filt(snap)); dec(); },
        (e) => { console.warn('[Kardex]', e); dec(); }),
      onSnapshot(collection(db, 'Historial'),
        (snap) => { setHistorial(filt(snap)); dec(); },
        (e) => { console.warn('[Hist]', e); dec(); }),
      onSnapshot(collection(db, 'ValorizacionesContractuales'),
        (snap) => { setValorizaciones(filt(snap)); dec(); },
        (e) => { console.warn('[Val]', e); dec(); }),
    ];
    return () => unsubs.forEach(u => u());
  }, [filtrarPorContexto]);

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
      salariosPorCategoria,
      fechaActual, margenMeta,
    });
  }, [loading, actividades, apus, tareos, kardexMov, valorizaciones, salariosPorCategoria, fechaActual, margenMeta]);

  return {
    ro, loading,
    actividades, apus, tareos, kardexMov, historial, valorizaciones,
  };
}
