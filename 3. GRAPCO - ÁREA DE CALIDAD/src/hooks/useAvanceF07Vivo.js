// useAvanceF07Vivo — calcula EN VIVO el avance del F07 desde el metrado que la
// plataforma registra (capataz/producción), agrupado por quincena → valorización.
//
// Fuentes de metrado vivo:
//   • SustentoMetrados → ya viene con codigoPartida = ítem F07 (alineado).
//   • Registros_Campo  → metrado por actividad (nombre); se cruza al ítem F07 por
//     DESCRIPCIÓN normalizada (el catálogo de tareo es más grueso, así que parte
//     no cruza: se reporta como "cobertura" para no ocultar la brecha).
//
// Quincena (LPS): semana 1-2 = Q1, 3-4 = Q2 … (Math.ceil(semana/2)). El "Actual"
// de cada quincena es la suma del periodo; el "Acumulado" es el acumulado de metrado.
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const norm = (s) => String(s || '').toUpperCase()
  .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
  .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N')
  .replace(/[^A-Z0-9]/g, '').slice(0, 24);
// "01.01.01" o "1.1.1" → "1.1.1" (sin ceros a la izquierda)
const itemNorm = (c) => String(c || '').trim().split('.').map(s => String(parseInt(s, 10) || 0)).join('.');
const pqNum = (ref) => { const m = String(ref || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : null; };
const r3 = (x) => Math.round(x * 1000) / 1000;
const r2 = (x) => Math.round(x * 100) / 100;

export default function useAvanceF07Vivo({ proyId, presu, enabled = true }) {
  const [registros, setRegistros] = useState([]);
  const [sustentos, setSustentos] = useState([]);

  useEffect(() => {
    if (!proyId || !enabled) { setRegistros([]); setSustentos([]); return; }
    const u1 = onSnapshot(collection(db, 'Registros_Campo'), (s) =>
      setRegistros(s.docs.map(d => d.data()).filter(r => (!r.proyectoId || r.proyectoId === proyId) && Number(r.metrado) > 0)));
    const u2 = onSnapshot(collection(db, 'SustentoMetrados'), (s) =>
      setSustentos(s.docs.map(d => d.data()).filter(r => (!r.proyectoId || r.proyectoId === proyId) && Number(r.metrado) > 0)));
    return () => { u1(); u2(); };
  }, [proyId, enabled]);

  return useMemo(() => {
    const partidas = (presu || []).filter(p => p.esPartida);
    // Índices del presupuesto F07: por descripción y por ítem → mkey + pu.
    const porDesc = {}; const porItem = {};
    partidas.forEach(p => {
      if (p.mkey && !porDesc[norm(p.descripcion)]) porDesc[norm(p.descripcion)] = p;
      const it = itemNorm(p.item); if (!porItem[it]) porItem[it] = p;
    });

    // metrado por quincena → mkey  (perVal[valN][mkey] = cantidad del periodo)
    const perVal = {}; const add = (valN, mkey, q) => {
      if (!valN || !mkey || !(q > 0)) return;
      (perVal[valN] = perVal[valN] || {}); perVal[valN][mkey] = (perVal[valN][mkey] || 0) + q;
    };
    let unmappedQ = 0; const sinCruce = {}; let cdVivo = 0;

    // 1) Registros_Campo → ítem por descripción de la actividad.
    registros.forEach(r => {
      const q = Number(r.metrado) || 0;
      const valN = r.semana ? Math.ceil(r.semana / 2) : null;
      const p = porDesc[norm(r.actividad)];
      if (p) { add(valN, p.mkey, q); cdVivo += q * (p.pu || 0); }
      else { unmappedQ += q; const k = r.actividad || '(sin actividad)'; sinCruce[k] = (sinCruce[k] || 0) + q; }
    });
    // 2) SustentoMetrados → ítem por codigoPartida (o descripción de respaldo).
    sustentos.forEach(s => {
      const q = Number(s.metrado) || 0;
      const valN = pqNum(s.valorizacionRef) || (s.semana ? Math.ceil(s.semana / 2) : null);
      const p = porItem[itemNorm(s.codigoPartida)] || porDesc[norm(s.descripcion)];
      if (p) { add(valN, p.mkey, q); cdVivo += q * (p.pu || 0); }
      else { unmappedQ += q; const k = s.descripcion || s.codigoPartida || '(sustento)'; sinCruce[k] = (sinCruce[k] || 0) + q; }
    });

    // Construye avances acumulados por quincena.
    const valNs = Object.keys(perVal).map(Number).sort((a, b) => a - b);
    const acumPrev = {}; const docs = [];
    valNs.forEach(n => {
      const periodo = perVal[n];
      const avances = Object.entries(periodo).map(([key, act]) => {
        const ant = acumPrev[key] || 0; const acum = ant + act;
        acumPrev[key] = acum;
        return { key, actual: r3(act), acum: r3(acum) };
      });
      // arrastra ítems sin movimiento este periodo (mantienen su acumulado)
      Object.keys(acumPrev).forEach(key => { if (!periodo[key]) avances.push({ key, actual: 0, acum: r3(acumPrev[key]) }); });
      docs.push({ valN: n, label: `Q-${String(n).padStart(2, '0')}`, avances });
    });

    const itemsVivo = Object.keys(acumPrev).length;
    const totalItems = partidas.length;
    const cdPresu = partidas.reduce((s, p) => s + (p.cant || 0) * (p.pu || 0), 0);
    const cobertura = {
      itemsVivo, totalItems, cdVivo: r2(cdVivo), cdPresu: r2(cdPresu),
      pctCD: cdPresu > 0 ? Math.round(cdVivo / cdPresu * 100) : 0,
      unmapped: r2(unmappedQ),
      registros: registros.length, sustentos: sustentos.length,
      sinCruce: Object.entries(sinCruce).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, q]) => ({ nombre: n, metrado: r2(q) })),
    };
    return { avancesVivo: docs, cobertura };
  }, [registros, sustentos, presu]);
}
