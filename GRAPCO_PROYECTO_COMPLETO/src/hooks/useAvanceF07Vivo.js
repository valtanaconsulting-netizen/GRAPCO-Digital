// useAvanceF07Vivo — calcula EN VIVO el avance del F07 desde el metrado que la
// plataforma registra (capataz/producción), agrupado por quincena → valorización.
//
// Fuentes de metrado vivo:
//   • SustentoMetrados → ya viene con codigoPartida = ítem F07 (alineado, preciso).
//   • Registros_Campo  → metrado por actividad (nombre); se cruza al ítem F07 por
//     DESCRIPCIÓN normalizada. El catálogo de tareo es más grueso, así que parte no
//     cruza 1:1. Ahí entra el PREFIJO (familia): si la actividad no cruza por
//     descripción pero su familia tiene UN ÚNICO ítem valorizable, se atribuye ahí
//     (atribución conservadora). Además se reporta la cobertura POR PREFIJO para que
//     la brecha sea visible por familia (CON, ENC, ACE…).
//
// El prefijo es nivel FAMILIA: NO reemplaza al código para la valorización fina (un
// "CURADO DE CONCRETO" del tareo puede tocar muchos ítems de curado). Solo sube
// cobertura donde es inequívoco y agrupa la cobertura por familia.
//
// Quincena (LPS): semana 1-2 = Q1, 3-4 = Q2 … (Math.ceil(semana/2)). El "Actual"
// de cada quincena es la suma del periodo; el "Acumulado" es el acumulado de metrado.
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { sugerirPrefijo, normTxt, familiaDe } from '../utils/prefijos';
import { COSTO_HORA_PROMEDIO } from '../utils/helpers';

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
  const [prefMap, setPrefMap] = useState({ ispMap: {}, f07Map: {} }); // Prefijos_Catalogo

  useEffect(() => {
    if (!proyId || !enabled) { setRegistros([]); setSustentos([]); setPrefMap({ ispMap: {}, f07Map: {} }); return; }
    // Todos los tareos del proyecto (no solo metrado>0): el metrado alimenta el avance,
    // y las HH (totalHH) alimentan el Costo Real (CR = HH × S/25.5) por familia.
    const u1 = onSnapshot(collection(db, 'Registros_Campo'), (s) =>
      setRegistros(s.docs.map(d => d.data()).filter(r => (!r.proyectoId || r.proyectoId === proyId))));
    const u2 = onSnapshot(collection(db, 'SustentoMetrados'), (s) =>
      setSustentos(s.docs.map(d => d.data()).filter(r => (!r.proyectoId || r.proyectoId === proyId) && Number(r.metrado) > 0)));
    const u3 = onSnapshot(doc(db, 'Prefijos_Catalogo', proyId), (d) => {
      const data = d.data();
      setPrefMap({ ispMap: data?.ispMap || {}, f07Map: data?.f07Map || {} });
    });
    return () => { u1(); u2(); u3(); };
  }, [proyId, enabled]);

  return useMemo(() => {
    const { ispMap, f07Map } = prefMap;
    const partidas = (presu || []).filter(p => p.esPartida);
    // Índices del presupuesto F07: por descripción y por ítem → mkey + pu.
    const porDesc = {}; const porItem = {};
    partidas.forEach(p => {
      if (p.mkey && !porDesc[norm(p.descripcion)]) porDesc[norm(p.descripcion)] = p;
      const it = itemNorm(p.item); if (!porItem[it]) porItem[it] = p;
    });

    // Prefijo por ítem F07 (de Prefijos_Catalogo o auto-sugerido) + familia con ítem único.
    const itemPref = {}; const itemsPorPref = {};
    partidas.forEach(p => {
      const pref = f07Map[p.mkey] || sugerirPrefijo({ codigo: p.item, descripcion: p.descripcion }).prefijo || null;
      itemPref[p.mkey] = pref;
      if (pref) (itemsPorPref[pref] = itemsPorPref[pref] || []).push(p);
    });
    const unicoItemDePref = {}; // prefijo → partida, solo si la familia tiene exactamente 1 ítem valorizable
    Object.entries(itemsPorPref).forEach(([pref, arr]) => {
      const valorizables = arr.filter(p => (p.pu || 0) > 0);
      if (valorizables.length === 1) unicoItemDePref[pref] = valorizables[0];
    });

    // prefijo de un registro de campo / sustento (Prefijos_Catalogo ISP, o matcher).
    const prefDeReg = (actividad, familia) => ispMap[normTxt(actividad)] || sugerirPrefijo({ descripcion: actividad, familia }).prefijo || null;

    // Acumuladores de cobertura.
    const perVal = {};
    let unmappedQ = 0, cdVivo = 0;
    const sinCruce = {}, cdPorPref = {}, unmappedPorPref = {};
    const add = (valN, mkey, q) => {
      if (!valN || !mkey || !(q > 0)) return false;
      (perVal[valN] = perVal[valN] || {}); perVal[valN][mkey] = (perVal[valN][mkey] || 0) + q;
      return true;
    };
    const contarCD = (mkey, q, pu) => { cdVivo += q * (pu || 0); const pf = itemPref[mkey] || '(sin)'; cdPorPref[pf] = (cdPorPref[pf] || 0) + q * (pu || 0); };
    const contarUnmapped = (q, nombre, pref) => { unmappedQ += q; sinCruce[nombre] = (sinCruce[nombre] || 0) + q; const pf = pref || '(sin)'; unmappedPorPref[pf] = (unmappedPorPref[pf] || 0) + q; };

    // 1) Registros_Campo → ítem por descripción; si no cruza, intento por prefijo (familia con ítem único).
    registros.forEach(r => {
      const q = Number(r.metrado) || 0;
      if (q <= 0) return; // sin metrado no aporta avance (sus HH sí cuentan abajo en el CR)
      const valN = r.semana ? Math.ceil(r.semana / 2) : null;
      const p = porDesc[norm(r.actividad)];
      if (p) { if (add(valN, p.mkey, q)) contarCD(p.mkey, q, p.pu); return; }
      const pref = prefDeReg(r.actividad, r.partida);
      const unico = pref && unicoItemDePref[pref];
      if (unico) { if (add(valN, unico.mkey, q)) contarCD(unico.mkey, q, unico.pu); return; }
      contarUnmapped(q, r.actividad || '(sin actividad)', pref);
    });
    // 2) SustentoMetrados → ítem por codigoPartida (preciso) o descripción; fallback prefijo único.
    sustentos.forEach(s => {
      const q = Number(s.metrado) || 0;
      const valN = pqNum(s.valorizacionRef) || (s.semana ? Math.ceil(s.semana / 2) : null);
      const p = porItem[itemNorm(s.codigoPartida)] || porDesc[norm(s.descripcion)];
      if (p) { if (add(valN, p.mkey, q)) contarCD(p.mkey, q, p.pu); return; }
      const pref = prefDeReg(s.descripcion, s.partida);
      const unico = pref && unicoItemDePref[pref];
      if (unico) { if (add(valN, unico.mkey, q)) contarCD(unico.mkey, q, unico.pu); return; }
      contarUnmapped(q, s.descripcion || s.codigoPartida || '(sustento)', pref);
    });

    // HH reales por familia → Costo Real MO (CR = HH × S/25.5). Mismas HH (totalHH) de
    // los tareos que usa el RO, agrupadas por el mismo prefijo del avance (no duplica al RO).
    const hhPorPref = {}; let hhTotal = 0;
    registros.forEach(r => {
      const hh = Number(r.totalHH ?? r.horasHombre ?? r.hh ?? 0) || 0;
      if (hh <= 0) return;
      const pref = prefDeReg(r.actividad, r.partida) || '(sin)';
      hhPorPref[pref] = (hhPorPref[pref] || 0) + hh;
      hhTotal += hh;
    });
    const crPorPrefijo = {};
    Object.entries(hhPorPref).forEach(([p, hh]) => { crPorPrefijo[p] = { hh: r2(hh), cr: r2(hh * COSTO_HORA_PROMEDIO) }; });

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
      Object.keys(acumPrev).forEach(key => { if (!periodo[key]) avances.push({ key, actual: 0, acum: r3(acumPrev[key]) }); });
      docs.push({ valN: n, label: `Q-${String(n).padStart(2, '0')}`, avances });
    });

    // Cobertura por prefijo (familia): CD valorizado, CR (HH×25.5) y metrado sin cruzar.
    const prefs = new Set([...Object.keys(cdPorPref), ...Object.keys(unmappedPorPref), ...Object.keys(hhPorPref)]);
    const porPrefijo = [...prefs].map(pref => ({
      prefijo: pref,
      familia: pref === '(sin)' ? 'Sin prefijo' : familiaDe(pref),
      cd: r2(cdPorPref[pref] || 0),
      hh: r2(hhPorPref[pref] || 0),
      cr: r2((hhPorPref[pref] || 0) * COSTO_HORA_PROMEDIO),
      unmapped: r2(unmappedPorPref[pref] || 0),
      items: (itemsPorPref[pref] || []).length,
    })).sort((a, b) => b.cd - a.cd);

    const itemsVivo = Object.keys(acumPrev).length;
    const totalItems = partidas.length;
    const cdPresu = partidas.reduce((s, p) => s + (p.cant || 0) * (p.pu || 0), 0);
    const cobertura = {
      itemsVivo, totalItems, cdVivo: r2(cdVivo), cdPresu: r2(cdPresu),
      pctCD: cdPresu > 0 ? Math.round(cdVivo / cdPresu * 100) : 0,
      unmapped: r2(unmappedQ),
      registros: registros.length, sustentos: sustentos.length,
      conPrefijos: Object.keys(ispMap).length > 0 || Object.keys(f07Map).length > 0,
      porPrefijo, crPorPrefijo, crVivo: r2(hhTotal * COSTO_HORA_PROMEDIO), hhVivo: r2(hhTotal),
      sinCruce: Object.entries(sinCruce).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, q]) => ({ nombre: n, metrado: r2(q) })),
    };
    return { avancesVivo: docs, cobertura };
  }, [registros, sustentos, presu, prefMap]);
}
