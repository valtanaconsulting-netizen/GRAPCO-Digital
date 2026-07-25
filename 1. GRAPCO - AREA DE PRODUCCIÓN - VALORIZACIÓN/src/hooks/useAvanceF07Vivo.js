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
import { resolverItemF07 } from '../utils/vinculoF07';

const norm = (s) => String(s || '').toUpperCase()
  .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
  .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N')
  .replace(/[^A-Z0-9]/g, '').slice(0, 24);
// "01.01.01" o "1.1.1" → "1.1.1" (sin ceros a la izquierda)
const itemNorm = (c) => String(c || '').trim().split('.').map(s => String(parseInt(s, 10) || 0)).join('.');
const pqNum = (ref) => { const m = String(ref || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : null; };
const r3 = (x) => Math.round(x * 1000) / 1000;
const r2 = (x) => Math.round(x * 100) / 100;
// Unidad normalizada (m² → M2, m³ → M3). Dos unidades son COMPATIBLES si alguna
// falta (registros antiguos sin unidad) o si son la misma.
// Este guardarraíl es lo que impide el vertedero que se detectó en CREDITEX-PTAR:
// metrado en M2/M3/KG de nueve actividades distintas caía sobre una partida GLB
// ("MOVILIZACIÓN Y DESMOVILIZACIÓN", P.U. S/16.685) y valorizaba S/9,7 MILLONES
// fantasma. Sumar kilos sobre una partida global no es un cruce: es un error.
const und = (u) => String(u || '').toUpperCase().replace('²', '2').replace('³', '3').replace(/[^A-Z0-9]/g, '');
const undCompatible = (a, b) => { const x = und(a), y = und(b); return !x || !y || x === y; };

export default function useAvanceF07Vivo({ proyId, presu, enabled = true }) {
  const [registros, setRegistros] = useState([]);
  const [sustentos, setSustentos] = useState([]);
  const [prefMap, setPrefMap] = useState({ ispMap: {}, f07Map: {} }); // Prefijos_Catalogo
  const [vinculos, setVinculos] = useState({});                       // Mapeo_Actividad_F07

  useEffect(() => {
    if (!proyId || !enabled) { setRegistros([]); setSustentos([]); setPrefMap({ ispMap: {}, f07Map: {} }); setVinculos({}); return; }
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
    // Diccionario explícito actividad→ítem F07 que llena Oficina Técnica. Es el
    // cruce de MÁXIMA precisión: manda por encima del emparejamiento por nombre.
    const u4 = onSnapshot(doc(db, 'Mapeo_Actividad_F07', proyId),
      (d) => setVinculos(d.data()?.mapa || {}),
      () => setVinculos({}));
    return () => { u1(); u2(); u3(); u4(); };
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

    // Índice por mkey para resolver la partida que designó el diccionario de OT.
    const porMkey = {};
    partidas.forEach(p => { if (p.mkey) porMkey[p.mkey] = p; });

    // ── ANTI DOBLE CONTEO ──────────────────────────────────────────────────
    // El sustento de OT y el tareo del capataz son DOS REGISTROS DEL MISMO
    // TRABAJO, no dos avances. El flujo que los duplica es el que la propia app
    // ofrece: en el ISP se pulsa "Metrar con formato" sobre una actividad que ya
    // viene de los tareos, y eso crea un doc en SustentoMetrados sin anular el
    // Registro_Campo de origen. Sin deduplicar, ese metrado se valoriza al 200%
    // — sobrefacturación que además se imprime en el PDF oficial del F07.
    //
    // Criterio: el SUSTENTO MANDA (es el cómputo formal, con planilla y ítem F07
    // exacto) y el tareo de esa misma actividad cede en ese periodo. La llave ya
    // estaba en el dato y no se usaba: `actividadISP` (o la descripción) del
    // sustento apunta a la actividad del tareo. Se compara por actividad+quincena
    // para no anular tareos de otras semanas de la misma partida.
    const sustentadoEnPeriodo = new Set();
    sustentos.forEach(s => {
      const q = Number(s.metrado) || 0;
      if (q <= 0) return;
      const valN = pqNum(s.valorizacionRef) || (s.semana ? Math.ceil(s.semana / 2) : null);
      const acts = [s.actividadISP, s.descripcion].filter(Boolean);
      acts.forEach(a => {
        const k = normTxt(a);
        if (!k) return;
        sustentadoEnPeriodo.add(`${k}|${valN ?? '*'}`);
        sustentadoEnPeriodo.add(`${k}|*`);   // sustento sin periodo → cubre toda la actividad
      });
    });
    const yaSustentado = (actividad, valN) => {
      const k = normTxt(actividad);
      if (!k) return false;
      return sustentadoEnPeriodo.has(`${k}|${valN ?? '*'}`) || sustentadoEnPeriodo.has(`${k}|*`);
    };
    let dupEvitados = 0, qDupEvitado = 0;

    // 1) Registros_Campo. Cascada de cruce, de más preciso a más difuso:
    //    a) DICCIONARIO explícito de OT (actividad[+frente] → ítem F07). Es el
    //       único capaz de desambiguar cuando varias partidas comparten
    //       descripción y solo difieren en código.
    //    b) Descripción normalizada (el cruce histórico, truncado a 24).
    //    c) Prefijo/familia, solo si esa familia tiene UN ítem valorizable.
    registros.forEach(r => {
      // El avance→valorización usa el metrado VALIDADO por el ingeniero (OT). Fallback a
      // metradoReportado (capataz) y al legacy `metrado` para registros antiguos.
      const q = Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0;
      if (q <= 0) return; // sin metrado no aporta avance (sus HH sí cuentan abajo en el CR)
      const valN = r.semana ? Math.ceil(r.semana / 2) : null;
      // Si OT ya sustentó formalmente esta actividad en este periodo, ese cómputo
      // es el bueno: este tareo NO se vuelve a acreditar (sus HH sí siguen
      // contando para el Costo Real más abajo, que es trabajo realmente pagado).
      if (yaSustentado(r.actividad, valN)) { dupEvitados++; qDupEvitado += q; return; }
      // Toda acreditación exige unidad compatible: el metrado del campo y la
      // partida deben medirse en lo mismo. Lo que no calza NO se inventa: cae a
      // "sin cruzar", que es visible y se resuelve vinculándolo a mano.
      const vin = resolverItemF07(vinculos, r.actividad, r.frenteId);
      const pv = vin && (porMkey[vin.mkey] || porItem[itemNorm(vin.item)]);
      if (pv && undCompatible(r.unidad, pv.und)) { if (add(valN, pv.mkey, q)) contarCD(pv.mkey, q, pv.pu); return; }
      const p = porDesc[norm(r.actividad)];
      if (p && undCompatible(r.unidad, p.und)) { if (add(valN, p.mkey, q)) contarCD(p.mkey, q, p.pu); return; }
      const pref = prefDeReg(r.actividad, r.partida);
      const unico = pref && unicoItemDePref[pref];
      if (unico && undCompatible(r.unidad, unico.und)) { if (add(valN, unico.mkey, q)) contarCD(unico.mkey, q, unico.pu); return; }
      contarUnmapped(q, r.actividad || '(sin actividad)', pref);
    });
    // 2) SustentoMetrados → ítem por codigoPartida (preciso) o descripción; fallback prefijo único.
    sustentos.forEach(s => {
      const q = Number(s.metrado) || 0;
      const valN = pqNum(s.valorizacionRef) || (s.semana ? Math.ceil(s.semana / 2) : null);
      const p = porItem[itemNorm(s.codigoPartida)] || porDesc[norm(s.descripcion)];
      // El cruce por codigoPartida es explícito (OT eligió el ítem): se respeta.
      // El cruce por descripción sí exige unidad compatible, como en los tareos.
      const pOk = p && (porItem[itemNorm(s.codigoPartida)] ? true : undCompatible(s.unidad, p.und));
      if (pOk) { if (add(valN, p.mkey, q)) contarCD(p.mkey, q, p.pu); return; }
      const pref = prefDeReg(s.descripcion, s.partida);
      const unico = pref && unicoItemDePref[pref];
      if (unico && undCompatible(s.unidad, unico.und)) { if (add(valN, unico.mkey, q)) contarCD(unico.mkey, q, unico.pu); return; }
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

    // Construye avances acumulados por quincena, TOPADOS a lo contratado.
    // Una partida no puede valorizar más de lo que tiene en contrato: sin este
    // tope se producían acumulados de 58.626% (ENCOFRADO DE GRADAS llegó a
    // 78.388%) que inflaban el Valor Ganado y falseaban el CPI. El exceso NO se
    // descarta en silencio: se guarda en `excesos` para revisarlo como adicional.
    const valNs = Object.keys(perVal).map(Number).sort((a, b) => a - b);
    const acumPrev = {}; const docs = [];
    const excesoPorMkey = {};
    valNs.forEach(n => {
      const periodo = perVal[n];
      const avances = Object.entries(periodo).map(([key, act]) => {
        const ant = acumPrev[key] || 0;
        const bruto = ant + act;
        const tope = Number(porMkey[key]?.cant) || 0;
        const acum = tope > 0 ? Math.min(bruto, tope) : bruto;
        if (bruto > acum) excesoPorMkey[key] = r3((excesoPorMkey[key] || 0) + (bruto - acum));
        acumPrev[key] = acum;
        // `actual` = lo que de verdad entra este periodo tras el tope, para que
        // la serie Actual/Acumulado siga cuadrando entre quincenas.
        return { key, actual: r3(acum - ant), acum: r3(acum) };
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
      vinculados: Object.keys(vinculos).length,   // actividades ya mapeadas al F07 por OT
      // Tareos que NO se acreditaron porque OT ya los sustentó formalmente: es la
      // sobrefacturación evitada. Se reporta para que se vea que el sistema
      // dedujo, no que perdió avance.
      dupEvitados, qDupEvitado: r2(qDupEvitado),
      // Metrado que superó lo contratado y quedó fuera de la valorización. Es
      // trabajo real: o es un adicional por aprobar, o hay un error de registro.
      // En cualquier caso debe verse, no desaparecer.
      excesos: Object.entries(excesoPorMkey)
        .map(([mkey, exceso]) => {
          const p = porMkey[mkey];
          return {
            item: p?.item || mkey, descripcion: p?.descripcion || '', und: p?.und || '',
            contratado: r2(Number(p?.cant) || 0), exceso: r2(exceso),
            soles: r2(exceso * (Number(p?.pu) || 0)),
          };
        })
        .sort((a, b) => b.soles - a.soles),
      porPrefijo, crPorPrefijo, crVivo: r2(hhTotal * COSTO_HORA_PROMEDIO), hhVivo: r2(hhTotal),
      sinCruce: Object.entries(sinCruce).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, q]) => ({ nombre: n, metrado: r2(q) })),
    };
    return { avancesVivo: docs, cobertura };
  }, [registros, sustentos, presu, prefMap, vinculos]);
}
