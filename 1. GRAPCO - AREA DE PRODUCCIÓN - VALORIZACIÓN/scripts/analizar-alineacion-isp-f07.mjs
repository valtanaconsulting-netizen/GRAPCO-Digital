// ============================================================================
// analizar-alineacion-isp-f07.mjs — ¿hasta qué semana están alineados el ISP y
// la Valorización F07, y qué partidas?
// ----------------------------------------------------------------------------
// ISP          = producción real de campo (Registros_Campo: actividad + metrado
//                + semana), organizada por el Catálogo WBS.
// Valorización = PresupuestoF07 (ítem + código + cantidad contratada + P.U.).
//
// Están ALINEADOS en una semana si el metrado que el ISP registró esa semana
// llega a una partida del F07. Se rompe la alineación cuando:
//   • el metrado NO CRUZA  → trabajo ejecutado que no se cobra (fuga), o
//   • el acumulado SUPERA lo contratado → se valorizaría de más (sobrefacturación).
//
// Replica la MISMA cascada del hook useAvanceF07Vivo, con sus guardarraíles:
//   (a) diccionario Mapeo_Actividad_F07  (b) descripción normalizada
//   (c) prefijo/familia con ítem único   + unidad compatible + tope contractual
//
// SOLO LECTURA. Correr DESDE scripts/ con serviceAccount.json en la raíz del área:
//     node analizar-alineacion-isp-f07.mjs [--proyecto <id>]
// ============================================================================

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const valorDe = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const PROY_FILTRO = valorDe('--proyecto', '');

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('../serviceAccount.json', 'utf8'))) });
const db = admin.firestore();

// ── Normalizadores idénticos al hook ────────────────────────────────────────
const sinT = (s) => String(s || '').toUpperCase()
  .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
  .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N');
const norm = (s) => sinT(s).replace(/[^A-Z0-9]/g, '').slice(0, 24);   // con truncado (cruce por descripción)
const normTxt = (s) => sinT(s).replace(/[^A-Z0-9]/g, '');             // sin truncado
const itemNorm = (c) => String(c || '').trim().split('.').map(x => String(parseInt(x, 10) || 0)).join('.');
const und = (u) => String(u || '').toUpperCase().replace('²', '2').replace('³', '3').replace(/[^A-Z0-9]/g, '');
const undOk = (a, b) => { const x = und(a), y = und(b); return !x || !y || x === y; };
// Estricta para el cruce por familia (el más difuso): ambas unidades presentes e
// iguales. Igual que el guardarraíl de useAvanceF07Vivo.
const undEstricta = (a, b) => { const x = und(a), y = und(b); return !!x && !!y && x === y; };
const n = (v) => Number(v) || 0;
const S = (x) => 'S/ ' + x.toLocaleString('es-PE', { maximumFractionDigits: 0 });
const F = (x, d = 2) => x.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── Diccionario de prefijos (src/utils/prefijos.js) ─────────────────────────
const dict = JSON.parse(readFileSync('../src/data/prefijosActividades.json', 'utf8'));
const byWbs = {}, byDesc = {}, famToPref = {};
(dict.actividades || []).forEach(a => {
  if (a.tipo !== 'actividad') return;
  byWbs[itemNorm(a.wbs)] = a.prefijo;
  const d = normTxt(a.descripcion); if (d && !byDesc[d]) byDesc[d] = a.prefijo;
});
Object.entries(dict.prefijos || {}).forEach(([c, p]) => {
  if (p.familia && !famToPref[normTxt(p.familia)]) famToPref[normTxt(p.familia)] = c;
});
const keysDesc = Object.keys(byDesc);
const sugerir = ({ codigo, descripcion, familia } = {}) => {
  const c = itemNorm(codigo); if (c && byWbs[c]) return byWbs[c];
  const d = normTxt(descripcion); if (d && byDesc[d]) return byDesc[d];
  if (d.length > 8) for (const k of keysDesc) if (k.length > 8 && (d.includes(k) || k.includes(d))) return byDesc[k];
  const f = normTxt(familia); if (f && famToPref[f]) return famToPref[f];
  return null;
};

const traer = async (c) => (await db.collection(c).get()).docs.map(d => ({ id: d.id, ...d.data() }));

console.log('Leyendo Firestore (solo lectura)…\n');
const [registros, presuAll, prefsAll, mapeosAll, proyectos] = await Promise.all([
  traer('Registros_Campo'), traer('PresupuestoF07'), traer('Prefijos_Catalogo'),
  traer('Mapeo_Actividad_F07'), traer('Proyectos'),
]);
const nombreProy = Object.fromEntries(proyectos.map(p => [p.id, p.nombre || p.codigo || p.id]));

const proyIds = [...new Set([...registros, ...presuAll].map(x => x.proyectoId).filter(Boolean))]
  .filter(id => !PROY_FILTRO || id === PROY_FILTRO);

for (const proyId of proyIds) {
  const R = registros.filter(r => r.proyectoId === proyId);
  const P = presuAll.filter(p => p.proyectoId === proyId && p.esPartida && p.mkey);
  if (!P.length) { console.log(`\n${nombreProy[proyId] || proyId}: sin Presupuesto F07 → no hay con qué alinear.\n`); continue; }

  const pref = prefsAll.find(x => x.id === proyId) || {};
  const ispMap = pref.ispMap || {}, f07Map = pref.f07Map || {};
  const vinculos = (mapeosAll.find(x => x.id === proyId) || {}).mapa || {};

  // Índices del presupuesto
  const porDesc = {}, porItem = {}, porMkey = {};
  P.forEach(p => {
    if (!porDesc[norm(p.descripcion)]) porDesc[norm(p.descripcion)] = p;
    const it = itemNorm(p.item); if (!porItem[it]) porItem[it] = p;
    porMkey[p.mkey] = p;
  });
  const itemsPorPref = {};
  P.forEach(p => { const pf = f07Map[p.mkey] || sugerir({ codigo: p.item, descripcion: p.descripcion }); if (pf) (itemsPorPref[pf] = itemsPorPref[pf] || []).push(p); });
  const unicoDePref = {};
  Object.entries(itemsPorPref).forEach(([pf, arr]) => { const v = arr.filter(x => n(x.pu) > 0); if (v.length === 1) unicoDePref[pf] = v[0]; });

  // Resolver del diccionario explícito (igual que vinculoF07.js)
  const claveV = (act, frente) => { const a = normTxt(act); if (!a) return ''; const f = normTxt(frente); return f ? `${a}@${f}` : a; };
  const resolverVinculo = (act, frente) => {
    if (!act) return null;
    if (frente) { const e = vinculos[claveV(act, frente)]; if (e) return e; }
    return vinculos[claveV(act)] || null;
  };

  // ── Clasifica cada registro y lo agrupa por SEMANA ────────────────────────
  const porSemana = {};
  const partidaOk = {};      // mkey → { q, p }
  const actSinCruzar = {};   // actividad → { q, semanas:Set, und:Set }
  R.forEach(r => {
    const q = n(r.metradoValidado ?? r.metradoReportado ?? r.metrado);
    if (q <= 0) return;
    const sem = Number(r.semana) || 0;
    porSemana[sem] = porSemana[sem] || { qTotal: 0, qCruza: 0, qNo: 0, nRegs: 0, nNo: 0, via: { dic: 0, desc: 0, pref: 0 }, sinCruce: {} };
    const B = porSemana[sem];
    B.qTotal += q; B.nRegs++;

    let p = null, via = null;
    const vin = resolverVinculo(r.actividad, r.frenteId);
    const pv = vin && (porMkey[vin.mkey] || porItem[itemNorm(vin.item)]);
    if (pv && undOk(r.unidad, pv.und)) { p = pv; via = 'dic'; }
    if (!p) { const c = porDesc[norm(r.actividad)]; if (c && undOk(r.unidad, c.und)) { p = c; via = 'desc'; } }
    if (!p) { const pf = ispMap[normTxt(r.actividad)] || sugerir({ descripcion: r.actividad, familia: r.partida }); const u = pf && unicoDePref[pf]; if (u && undEstricta(r.unidad, u.und)) { p = u; via = 'pref'; } }

    if (p) {
      B.qCruza += q; B.via[via]++;
      partidaOk[p.mkey] = partidaOk[p.mkey] || { q: 0, p };
      partidaOk[p.mkey].q += q;
    } else {
      B.qNo += q; B.nNo++;
      const k = r.actividad || '(sin actividad)';
      B.sinCruce[k] = (B.sinCruce[k] || 0) + q;
      actSinCruzar[k] = actSinCruzar[k] || { q: 0, semanas: new Set(), und: new Set(), nregs: 0 };
      actSinCruzar[k].q += q; actSinCruzar[k].semanas.add(sem); actSinCruzar[k].nregs++;
      if (r.unidad) actSinCruzar[k].und.add(r.unidad);
    }
  });

  const sems = Object.keys(porSemana).map(Number).sort((a, b) => a - b);

  console.log('='.repeat(92));
  console.log(`PROYECTO: ${nombreProy[proyId] || proyId}`);
  console.log(`  ${R.length} registros de campo (ISP) · ${P.length} partidas del F07 · ${Object.keys(vinculos).length} vínculos manuales`);
  console.log('='.repeat(92));

  // ── Tabla semana por semana ──────────────────────────────────────────────
  console.log('\n▌ ALINEACIÓN SEMANA POR SEMANA');
  console.log('  Sem │  Metrado ISP │      Cruza │  No cruza │ Alin. │ Estado');
  console.log('  ────┼──────────────┼────────────┼───────────┼───────┼────────────────────────────');
  let ultimaOk = null, primeraRota = null;
  sems.forEach(s => {
    const B = porSemana[s];
    const pctA = B.qTotal > 0 ? (B.qCruza / B.qTotal) * 100 : 100;
    const ok = pctA >= 99.5;
    if (ok && primeraRota === null) ultimaOk = s;
    if (!ok && primeraRota === null) primeraRota = s;
    const marca = ok ? '✔ alineada' : pctA >= 50 ? '⚠ parcial' : '✘ ROTA';
    const det = B.nNo ? ` (${B.nNo} reg. sin cruzar)` : '';
    console.log(`  ${String(s).padStart(3)} │ ${F(B.qTotal).padStart(12)} │ ${F(B.qCruza).padStart(10)} │ ${F(B.qNo).padStart(9)} │ ${(pctA.toFixed(0) + '%').padStart(5)} │ ${marca}${det}`);
  });

  console.log('\n▌ RESPUESTA');
  if (primeraRota === null) {
    console.log(`  ✔ ISP y Valorización están alineados en TODAS las semanas con registro (${sems[0]}–${sems[sems.length - 1]}).`);
  } else if (ultimaOk === null) {
    console.log(`  ✘ NO hay ninguna semana alineada al 100%. La primera con registro (sem ${sems[0]}) ya viene rota.`);
  } else {
    console.log(`  ✔ Alineadas hasta la SEMANA ${ultimaOk} (inclusive).`);
    console.log(`  ✘ Se rompe en la SEMANA ${primeraRota}.`);
  }

  // ── Partidas alineadas / desalineadas ────────────────────────────────────
  const alineadas = [], excedidas = [];
  Object.values(partidaOk).forEach(({ q, p }) => {
    const c = n(p.cant);
    if (c > 0 && q > c * 1.001) excedidas.push({ p, q, c, exceso: q - c });
    else alineadas.push({ p, q, c });
  });

  console.log(`\n▌ PARTIDAS ALINEADAS — el metrado del ISP cruza y cabe en el contrato (${alineadas.length})`);
  if (!alineadas.length) console.log('  (ninguna)');
  alineadas.sort((a, b) => b.q * n(b.p.pu) - a.q * n(a.p.pu)).slice(0, 25).forEach(({ p, q, c }) => {
    const pctAv = c > 0 ? (q / c) * 100 : 0;
    console.log(`  ${String(p.item).padEnd(11)} ${String(p.und || '').padEnd(4)} ${F(q).padStart(11)} / ${F(c).padStart(11)}  ${(pctAv.toFixed(0) + '%').padStart(5)}  ${S(q * n(p.pu)).padStart(13)}  ${p.descripcion}`);
  });
  if (alineadas.length > 25) console.log(`  … y ${alineadas.length - 25} más`);

  console.log(`\n▌ PARTIDAS DESALINEADAS POR EXCESO — el acumulado supera lo contratado (${excedidas.length})`);
  if (!excedidas.length) console.log('  (ninguna)');
  excedidas.sort((a, b) => b.exceso * n(b.p.pu) - a.exceso * n(a.p.pu)).forEach(({ p, q, c, exceso }) => {
    console.log(`  ${String(p.item).padEnd(11)} ${String(p.und || '').padEnd(4)} contratado ${F(c).padStart(10)} → ISP ${F(q).padStart(11)}  (${((q / c) * 100).toFixed(0)}%)  exceso ${S(exceso * n(p.pu))}`);
    console.log(`              ${p.descripcion}`);
  });

  console.log(`\n▌ ACTIVIDADES DEL ISP QUE NO LLEGAN AL F07 — fuga (${Object.keys(actSinCruzar).length})`);
  if (!Object.keys(actSinCruzar).length) console.log('  (ninguna)');
  Object.entries(actSinCruzar).sort((a, b) => b[1].q - a[1].q).forEach(([k, v]) => {
    const ss = [...v.semanas].sort((a, b) => a - b);
    const rango = ss.length > 3 ? `S${ss[0]}–S${ss[ss.length - 1]}` : ss.map(x => 'S' + x).join(',');
    console.log(`  ${F(v.q).padStart(12)} ${[...v.und].join('/').padEnd(5)} ${String(v.nregs).padStart(3)} reg. ${rango.padEnd(11)} ${k}`);
  });

  // ── Cobertura económica ──────────────────────────────────────────────────
  const cdPresu = P.reduce((s, p) => s + n(p.cant) * n(p.pu), 0);
  const cdAlin = alineadas.reduce((s, x) => s + x.q * n(x.p.pu), 0);
  const cdExc = excedidas.reduce((s, x) => s + x.c * n(x.p.pu), 0);
  console.log('\n▌ RESUMEN ECONÓMICO');
  console.log(`  Contrato total (F07)            ${S(cdPresu).padStart(16)}`);
  console.log(`  Valorizable ya alineado         ${S(cdAlin + cdExc).padStart(16)}   (${((cdAlin + cdExc) / cdPresu * 100).toFixed(1)}% del contrato)`);
  console.log(`  Partidas del F07 con avance     ${String(alineadas.length + excedidas.length).padStart(16)}   de ${P.length}`);
  console.log(`  Partidas del F07 SIN avance     ${String(P.length - alineadas.length - excedidas.length).padStart(16)}`);
  console.log('');
}
process.exit(0);
