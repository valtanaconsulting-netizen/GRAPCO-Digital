// src/hooks/usePresupuestoContractual.js
// FUENTE ÚNICA del presupuesto contractual del proyecto, compartida por el módulo
// Presupuesto (PresupuestoView) y por el RO (F06) → ambos "conversan" sobre los
// mismos montos por partida (taxonomía 1001-1018).
//
// Modelo: BASE de código (presupuestoMontosCreditex) para legacy CREDITEX +
// OVERRIDES de Firestore (PartidasContractuales) por código (lo real manda; editar
// o importar no borra el resto) + Presupuesto_Config para el pie comercial.

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { LEGACY_CREDITEX_IDS } from './useCatalogoWBS';
import { PRESUPUESTO_MONTOS_CREDITEX, PRESUPUESTO_MONTOS_CONFIG } from '../data/presupuestoMontosCreditex';
import { PCT_DEFAULT } from '../utils/presupuestoParser';

// Monto por frente con compatibilidad hacia el modelo antiguo (metrado × P.U. = F1).
export const montoF1De = (p) => Number(p.montoF1) || (Number(p.metradoContractual || 0) * Number(p.precioUnitario || 0)) || 0;
export const montoF2De = (p) => Number(p.montoF2) || 0;

export default function usePresupuestoContractual() {
  const { proyectoActivo } = useProyectoActivo();
  const proyId = proyectoActivo?.id;
  const isLegacy = LEGACY_CREDITEX_IDS.includes(proyId);

  const [reales, setReales] = useState([]);   // docs de Firestore del proyecto
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proyId) { setReales([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'PartidasContractuales'),
      (snap) => {
        const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReales(todas.filter((p) => p.proyectoId === proyId || (!p.proyectoId && isLegacy)));
        setLoading(false);
      },
      (e) => { console.warn('[usePresupuestoContractual]', e); setLoading(false); });
    return () => unsub();
  }, [proyId, isLegacy]);

  useEffect(() => {
    if (!proyId) { setConfig(null); return; }
    const unsub = onSnapshot(doc(db, 'Presupuesto_Config', proyId),
      (snap) => setConfig(snap.exists() ? snap.data() : null),
      (e) => console.warn('[Presupuesto_Config]', e));
    return () => unsub();
  }, [proyId]);

  return useMemo(() => {
    const realByCod = new Map(reales.map((p) => [String(p.codigo), p]));
    const base = isLegacy
      ? PRESUPUESTO_MONTOS_CREDITEX
          .filter((b) => !realByCod.has(String(b.codigo)))
          .map((b, i) => ({ id: `base-${b.codigo}`, unidad: 'GLB', orden: i, ...b, _base: true }))
      : [];
    const partidas = [...base, ...reales]
      .map((p) => ({
        ...p,
        montoF1: montoF1De(p),
        montoF2: montoF2De(p),
        _base: !!p._base || String(p.id || '').startsWith('base-'),
      }))
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }));

    const configEff = config || (isLegacy ? PRESUPUESTO_MONTOS_CONFIG : null);
    const mapaPorCodigo = new Map(
      partidas.map((p) => [String(p.codigo), { descripcion: p.descripcion, montoF1: p.montoF1, montoF2: p.montoF2 }])
    );

    const totF1 = partidas.reduce((s, p) => s + p.montoF1, 0);
    const totF2 = partidas.reduce((s, p) => s + p.montoF2, 0);
    const cd = configEff?.cd || +(totF1 + totF2).toFixed(2);
    const ggPct = configEff?.ggPct ?? PCT_DEFAULT.ggPct;
    const utilidadPct = configEff?.utilidadPct ?? PCT_DEFAULT.utilidadPct;
    const igvPct = configEff?.igvPct ?? PCT_DEFAULT.igvPct;
    const gg = configEff?.gg || +(cd * ggPct / 100).toFixed(2);
    const descuento = configEff?.descuento || 0;
    const utilidad = configEff?.utilidad || +(cd * utilidadPct / 100).toFixed(2);
    const subtotal = configEff?.subtotal || +(cd + gg - descuento + utilidad).toFixed(2);
    const igv = configEff?.igv || +(subtotal * igvPct / 100).toFixed(2);
    const total = configEff?.total || +(subtotal + igv).toFixed(2);
    const costoObra = configEff?.costoObra || +(cd + gg).toFixed(2);  // CD + GG = meta de control del RO

    return {
      loading, proyId, isLegacy,
      partidas, partidasReales: reales, config: configEff,
      usandoBase: base.length > 0,
      mapaPorCodigo,
      hayPresupuesto: partidas.some((p) => (p.montoF1 + p.montoF2) > 0.005),
      totales: { totF1, totF2, cd, ggPct, utilidadPct, igvPct, gg, descuento, utilidad, subtotal, igv, total, costoObra },
    };
  }, [reales, config, isLegacy, proyId, loading]);
}
