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
  const [facturas, setFacturas] = useState([]);                 // Registro de Facturas (→ AC)
  const [valorizacionesSC, setValorizacionesSC] = useState([]); // Valorizaciones subcontratistas F10 (→ AC)
  const [gastosGenerales, setGastosGenerales] = useState([]);   // GG Oficina (→ AC, sección aparte)
  const [adicionales, setAdicionales] = useState([]);           // Adicionales F05 (→ BAC/EV contractual)
  const [deductivos, setDeductivos] = useState([]);             // Deductivos F05 (→ BAC/EV contractual)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pendientes = 11;
    const dec = () => { pendientes -= 1; if (pendientes <= 0) setLoading(false); };
    // Aísla por proyecto activo y HONRA el frente seleccionado: con "Todos los
    // frentes" el RO es de toda la obra; al elegir F1 (PTARI) o F2 (NAVE) el RO se
    // recalcula para ese frente (filtrarPorContexto ignora el frente solo en modo Todos).
    const filt = (snap) => filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })));

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
      onSnapshot(collection(db, 'Registro_Facturas'),
        (snap) => { setFacturas(filt(snap)); dec(); },
        (e) => { console.warn('[Facturas]', e); dec(); }),
      onSnapshot(collection(db, 'ValorizacionesSubcontratistas'),
        (snap) => { setValorizacionesSC(filt(snap)); dec(); },
        (e) => { console.warn('[ValSC]', e); dec(); }),
      onSnapshot(collection(db, 'GG_Oficina'),
        (snap) => { setGastosGenerales(filt(snap)); dec(); },
        (e) => { console.warn('[GG]', e); dec(); }),
      onSnapshot(collection(db, 'Adicionales'),
        (snap) => { setAdicionales(filt(snap)); dec(); },
        (e) => { console.warn('[Adic]', e); dec(); }),
      onSnapshot(collection(db, 'Deductivos'),
        (snap) => { setDeductivos(filt(snap)); dec(); },
        (e) => { console.warn('[Deduct]', e); dec(); }),
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
      facturas, valorizacionesSC, gastosGenerales,
      adicionales, deductivos,
      salariosPorCategoria,
      fechaActual, margenMeta,
    });
  }, [loading, actividades, apus, tareos, kardexMov, valorizaciones, facturas, valorizacionesSC, gastosGenerales, adicionales, deductivos, salariosPorCategoria, fechaActual, margenMeta]);

  return {
    ro, loading,
    actividades, apus, tareos, kardexMov, historial, valorizaciones,
    facturas, valorizacionesSC, gastosGenerales, adicionales, deductivos,
  };
}
