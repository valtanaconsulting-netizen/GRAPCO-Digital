// src/utils/helpers.js — Funciones auxiliares V3
import { CATALOGO_MASTER, INFO_MAP } from './constants';

export const calcCPI = (hhM, hhR) => {
  if (!hhR && !hhM) return null;
  if (!hhR) return 1;
  return hhM / hhR;
};

// CPI en formato porcentaje (98%, 103%, ...)
export const fmtCPIPct = v => v === null || v === undefined ? '---' : `${Math.round(v * 100)}%`;
export const fmtCPI    = v => v === null || v === undefined ? '---' : v.toFixed(2);
export const fmt1   = v => isNaN(parseFloat(v)) ? '—' : parseFloat(v).toFixed(1);
export const fmt2   = v => isNaN(parseFloat(v)) ? '—' : parseFloat(v).toFixed(2);
export const fmt3   = v => isNaN(parseFloat(v)) ? '—' : parseFloat(v).toFixed(3);
export const fmtPct = v => isNaN(parseFloat(v)) ? '—' : `${Math.round(parseFloat(v) * 100)}%`;
export const fmtNum = v => isNaN(parseFloat(v)) ? '—' : parseFloat(v).toLocaleString('es-PE',{maximumFractionDigits:1});
export const fmtMoney = v => isNaN(parseFloat(v)) ? '—' : `S/ ${parseFloat(v).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export const getEstado = v => {
  if (v === null || v === undefined) return { color:'#64748b', bg:'#f8fafc', border:'#cbd5e1', label:'S/D' };
  if (v >= 1)     return { color:'#16a34a', bg:'#f0fdf4', border:'#16a34a', label:'ÓPTIMO' };
  if (v >= 0.85)  return { color:'#d97706', bg:'#fffbeb', border:'#d97706', label:'ALERTA' };
  return              { color:'#dc2626', bg:'#fef2f2', border:'#dc2626', label:'CRÍTICO' };
};

export const hoy = () => new Date().toISOString().split('T')[0];

export const fmtFecha = iso => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return `${DIAS[dt.getDay()]} ${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`;
};

export const fmtFechaCorta = iso => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

export const obtenerSemana = (f, fechaInicio) => {
  // Convertir a día calendario UTC para evitar desfase por zona horaria/DST
  const toUTCDay = (d) => {
    if (d instanceof Date) {
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  const dias = Math.floor((toUTCDay(f) - toUTCDay(fechaInicio)) / 86400000);
  return Math.max(1, Math.floor(dias / 7) + 1);
};

// ──────────────────────────────────────────────────────────────
// HORAS EXTRA: 60% / 100% (primeras 2h del día → 60%, resto → 100%)
// ──────────────────────────────────────────────────────────────

export const clasificarHE = (heTotal) => {
  const he = Math.max(0, parseFloat(heTotal) || 0);
  const he60  = Math.min(he, 2);
  const he100 = Math.max(0, he - 2);
  return { he60, he100, total: he };
};

export const calcularCostoTrabajador = (hn, heTotal, costoHora) => {
  const ch = parseFloat(costoHora) || 0;
  const hnF = Math.max(0, parseFloat(hn) || 0);
  const { he60, he100 } = clasificarHE(heTotal);
  const costoHN  = hnF * ch;
  const costoHE60  = he60  * ch * 1.60;
  const costoHE100 = he100 * ch * 2.00;
  return {
    hn: hnF, he60, he100, total: hnF + he60 + he100,
    costoHN, costoHE60, costoHE100,
    costoTotal: costoHN + costoHE60 + costoHE100,
  };
};

// COSTO MO PROMEDIO ÚNICO de la plataforma (S/. por hora). El usuario lo fijó en
// S/25.50/h para TODO (= el "Costo MO promedio" del RO/CR oficial del ISP). Cambiar
// SOLO este valor para reajustar el costeo de mano de obra en toda la app.
export const COSTO_HORA_PROMEDIO = 25.5;

// Costos por defecto por cargo (S/. por hora). Unificados a la tarifa promedio
// para que el costeo cuadre con el CR oficial. (Antes: 20/15/12.5/10.)
export const COSTO_HORA_DEFAULT = {
  'Capataz':  COSTO_HORA_PROMEDIO,
  'Operario': COSTO_HORA_PROMEDIO,
  'Oficial':  COSTO_HORA_PROMEDIO,
  'Ayudante': COSTO_HORA_PROMEDIO,
};

export const costoHoraDeTrabajador = (trabajador, costosCustomMap = {}) => {
  // 1) costo individual EXPLÍCITO en la ficha del trabajador (excepción puntual)
  if (trabajador && trabajador.costoHora && trabajador.costoHora > 0) return parseFloat(trabajador.costoHora);
  // 2) tarifa única de la plataforma (ignora tarifas por cargo para uniformar el costeo)
  return COSTO_HORA_PROMEDIO;
};

// ──────────────────────────────────────────────────────────────
// CÓDIGOS WBS jerárquicos
// ──────────────────────────────────────────────────────────────

export const WBS_CODES = (() => {
  const map = {};
  const partidas = Object.keys(CATALOGO_MASTER);
  partidas.forEach((p, pi) => {
    const codeP = String(pi + 1).padStart(2, '0');
    map[`P:${p}`] = codeP;
    const subs = Object.keys(CATALOGO_MASTER[p]);
    subs.forEach((sp, spi) => {
      const codeSP = `${codeP}.${String(spi + 1).padStart(2, '0')}`;
      map[`SP:${p}|${sp}`] = codeSP;
      CATALOGO_MASTER[p][sp].forEach((a, ai) => {
        const codeA = `${codeSP}.${String(ai + 1).padStart(2, '0')}`;
        map[`A:${p}|${sp}|${a.trim()}`] = codeA;
      });
    });
  });
  return map;
})();

export const codigoPartida    = (p)        => WBS_CODES[`P:${p}`] || '';
export const codigoSubpartida = (p, sp)    => WBS_CODES[`SP:${p}|${sp}`] || '';
export const codigoActividad  = (p, sp, a) => WBS_CODES[`A:${p}|${sp}|${a.trim()}`] || '';

export const borradorId = (fecha, capataz) => {
  if (!fecha || !capataz) return '';
  const safeCap = capataz.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
  return `borrador_${fecha}_${safeCap}`;
};

// ──────────────────────────────────────────────────────────────
// NORMALIZACIÓN DE ACTIVIDADES (matching difuso)
// ──────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'de','del','la','el','los','las','en','y','o','a','para','con','por','un','una',
  'al','sobre','desde','hasta','que','se','su','sus','este','esta','estos','estas',
  'ptari','ptar','sector','zona','area','área','nivel','planta','obra','tramo',
  'parte','pieza','und','ml','m2','m3','kg','tn','pza','glb',
]);

export const normalizeText = (s) => {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
};

export const getCoreTokens = (s) =>
  new Set(normalizeText(s).split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w)));

export const similitudActividad = (a, b) => {
  const A = getCoreTokens(a), B = getCoreTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0; A.forEach(w => { if (B.has(w)) inter++; });
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
};

export const mismaActividad = (cat, reg, umbral = 0.7) => {
  if (!cat || !reg) return false;
  const n1 = normalizeText(cat), n2 = normalizeText(reg);
  if (n1 === n2) return true;
  const A = getCoreTokens(cat), B = getCoreTokens(reg);
  if (A.size === 0 || B.size === 0) return false;
  let allInB = true; A.forEach(w => { if (!B.has(w)) allInB = false; });
  if (allInB && A.size >= 2) return true;
  let allInA = true; B.forEach(w => { if (!A.has(w)) allInA = false; });
  if (allInA && B.size >= 2) return true;
  return similitudActividad(cat, reg) >= umbral;
};

// Núcleo del matcher: escanea el catálogo (3 niveles) buscando la actividad canónica.
// Costoso (O(catálogo) por llamada), por eso se cachea en buscarActividadCanonica.
const _buscarActividadCanonicaNucleo = (txt) => {
  let mejor = null, mejorScore = 0;
  for (const partida of Object.keys(CATALOGO_MASTER)) {
    for (const subpartida of Object.keys(CATALOGO_MASTER[partida])) {
      for (const act of CATALOGO_MASTER[partida][subpartida]) {
        if (act.trim() === txt) return { partida, subpartida, actividad: act, score: 1 };
        if (normalizeText(act) === normalizeText(txt)) return { partida, subpartida, actividad: act, score: 0.99 };
        const score = similitudActividad(act, txt);
        if (score > mejorScore && mismaActividad(act, txt)) {
          mejor = { partida, subpartida, actividad: act, score };
          mejorScore = score;
        }
      }
    }
  }
  return mejor;
};

// Cache por texto: CATALOGO_MASTER es constante, así que el match de un mismo nombre
// nunca cambia. Los nombres de actividad se repiten masivamente entre los 1000+
// registros → escanear el catálogo solo una vez por nombre único, no por registro.
const _canonicaCache = new Map();

export const buscarActividadCanonica = (textoActividad) => {
  if (!textoActividad) return null;
  const txt = textoActividad.trim();
  if (_canonicaCache.has(txt)) return _canonicaCache.get(txt);
  const resultado = _buscarActividadCanonicaNucleo(txt);
  _canonicaCache.set(txt, resultado);
  return resultado;
};

// ──────────────────────────────────────────────────────────────
// IP RESOLVER
// ──────────────────────────────────────────────────────────────

let _ipPromediosCache = { historial: null, map: null };

const calcularPromediosIP = (historial) => {
  if (_ipPromediosCache.historial === historial) return _ipPromediosCache.map;
  const acc = {};
  (historial || []).forEach(r => {
    if (!r) return;
    const met = parseFloat(r.metrado) || 0;
    const hh  = parseFloat(r.totalHH) || 0;
    if (met <= 0 || hh <= 0) return;
    const canon = r._actividadCanonica || (r.actividad || '').trim();
    if (!canon) return;
    if (!acc[canon]) acc[canon] = { sumIP: 0, count: 0, sumMet: 0, sumHH: 0 };
    acc[canon].sumIP += hh / met;
    acc[canon].count += 1;
    acc[canon].sumMet += met;
    acc[canon].sumHH  += hh;
  });
  const map = {};
  Object.keys(acc).forEach(k => {
    const { sumIP, count, sumMet, sumHH } = acc[k];
    map[k] = {
      ipPromedio: count > 0 ? sumIP / count : null,
      ipReal:     sumMet > 0 ? sumHH / sumMet : null,
      count,
    };
  });
  _ipPromediosCache = { historial, map };
  return map;
};

export const resolverIP = (registro, historial = null) => {
  if (!registro) return { ipM: null, ipP: null, ipReal: null, fuente: 'sin_datos' };
  const met = parseFloat(registro.metrado) || 0;
  const hh  = parseFloat(registro.totalHH) || 0;
  if (met <= 0) return { ipM: null, ipP: null, ipReal: null, fuente: 'metrado_cero' };

  const ipReal = hh > 0 ? hh / met : null;
  const actCanon = registro._actividadCanonica || (registro.actividad || '').trim();
  const actUpper = actCanon.toUpperCase();

  if (registro.ipMeta && registro.ipPresupuesto && registro.ipMeta > 0 && registro.ipPresupuesto > 0)
    return { ipM: registro.ipMeta, ipP: registro.ipPresupuesto, ipReal, fuente: 'registro' };

  const infoCanon = INFO_MAP[actUpper];
  if (infoCanon && infoCanon.ipM && infoCanon.ipP)
    return { ipM: registro.ipMeta || infoCanon.ipM, ipP: registro.ipPresupuesto || infoCanon.ipP, ipReal, fuente: 'catalogo' };

  if (historial) {
    const promedios = calcularPromediosIP(historial);
    const promCanon = promedios[actCanon];
    if (promCanon && promCanon.ipReal) {
      const ipBase = promCanon.ipReal;
      return {
        ipM: registro.ipMeta || parseFloat((ipBase * 0.90).toFixed(3)),
        ipP: registro.ipPresupuesto || parseFloat((ipBase * 1.10).toFixed(3)),
        ipReal, fuente: 'promedio_historico',
      };
    }
  }
  if (ipReal) return { ipM: registro.ipMeta || ipReal, ipP: registro.ipPresupuesto || ipReal, ipReal, fuente: 'auto_real' };
  return { ipM: null, ipP: null, ipReal: null, fuente: 'sin_datos' };
};

// ──────────────────────────────────────────────────────────────
// AGREGACIÓN DE HH
// ──────────────────────────────────────────────────────────────

export const calcularHHPorSemana = (registros) => {
  const map = {};
  (registros || []).forEach(r => {
    if (!r) return;
    const sem = r.semana || 0;
    if (!map[sem]) map[sem] = { semana: sem, hn: 0, he: 0, total: 0, registros: 0 };
    let hn = 0, he = 0;
    (r.detalleTareo || []).forEach(t => {
      if (!t) return;
      hn += parseFloat(t.hn) || 0;
      he += parseFloat(t.he) || 0;
    });
    if (hn === 0 && he === 0 && r.totalHH) hn = parseFloat(r.totalHH) || 0;
    map[sem].hn += hn; map[sem].he += he;
    map[sem].total += hn + he; map[sem].registros += 1;
  });
  return Object.values(map).sort((a, b) => a.semana - b.semana);
};

export const calcularHHTotales = (registros) => {
  let hn = 0, he = 0;
  (registros || []).forEach(r => {
    if (!r) return;
    let rHn = 0, rHe = 0;
    (r.detalleTareo || []).forEach(t => {
      if (!t) return;
      rHn += parseFloat(t.hn) || 0;
      rHe += parseFloat(t.he) || 0;
    });
    if (rHn === 0 && rHe === 0 && r.totalHH) rHn = parseFloat(r.totalHH) || 0;
    hn += rHn; he += rHe;
  });
  return { hn, he, total: hn + he };
};

export const metradoEsHomogeneo = (registros, filtroAplicado = false) => {
  if (!filtroAplicado) return false;
  if (!registros || !registros.length) return false;
  const unidades = new Set();
  registros.forEach(r => { if (r && r.unidad) unidades.add(r.unidad.toUpperCase().trim()); });
  return unidades.size === 1;
};

// ──────────────────────────────────────────────────────────────
// TENDENCIAS — regresión lineal y media móvil
// ──────────────────────────────────────────────────────────────

export const calcularTendencia = (puntos) => {
  const datos = (puntos || []).filter(p => p && !isNaN(p.x) && !isNaN(p.y));
  const n = datos.length;
  if (n < 2) return { pendiente: 0, intercepto: 0, r2: 0, valido: false, sigma: 0 };

  const sumX  = datos.reduce((s, p) => s + p.x, 0);
  const sumY  = datos.reduce((s, p) => s + p.y, 0);
  const sumXY = datos.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = datos.reduce((s, p) => s + p.x * p.x, 0);
  const sumYY = datos.reduce((s, p) => s + p.y * p.y, 0);

  const den = n * sumXX - sumX * sumX;
  if (den === 0) return { pendiente: 0, intercepto: sumY / n, r2: 0, valido: false, sigma: 0 };

  const m = (n * sumXY - sumX * sumY) / den;
  const b = (sumY - m * sumX) / n;
  const numR2 = (n * sumXY - sumX * sumY);
  const denR2 = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const r2 = denR2 === 0 ? 0 : Math.pow(numR2 / denR2, 2);

  // Desviación estándar de los residuos para bandas de confianza
  let sumResiduos = 0;
  datos.forEach(p => {
    const yPred = m * p.x + b;
    sumResiduos += Math.pow(p.y - yPred, 2);
  });
  const sigma = n > 2 ? Math.sqrt(sumResiduos / (n - 2)) : 0;

  return { pendiente: m, intercepto: b, r2, valido: true, sigma };
};

export const mediaMovil = (valores, k = 3) => {
  if (!valores || valores.length === 0) return [];
  return valores.map((_, i) => {
    const inicio = Math.max(0, i - k + 1);
    const slice = valores.slice(inicio, i + 1);
    const sum = slice.reduce((s, v) => s + (v || 0), 0);
    return parseFloat((sum / slice.length).toFixed(3));
  });
};

// Regresión lineal PONDERADA POR RECENCIA.
// x usa el número de semana real (los huecos entre semanas SÍ pesan en la
// pendiente por semana). Cada punto recibe peso exponencial: las semanas
// recientes pesan más, así un mal arranque no contamina el pronóstico.
// `decay` ∈ (0,1]: 1 = sin ponderar (OLS clásico); 0.85 ≈ la última semana
// pesa ~2x respecto a 5 semanas atrás.
export const calcularTendenciaPond = (puntos, decay = 0.82) => {
  const datos = (puntos || []).filter(p => p && !isNaN(p.x) && !isNaN(p.y));
  const n = datos.length;
  if (n < 2) return { pendiente: 0, intercepto: 0, r2: 0, valido: false, sigma: 0 };

  // Peso por posición: el más reciente (último) tiene exponente 0 → peso 1.
  const ordenado = [...datos].sort((a, b) => a.x - b.x);
  const w = ordenado.map((_, i) => Math.pow(decay, (n - 1 - i)));
  const W = w.reduce((s, v) => s + v, 0);

  const sumWX  = ordenado.reduce((s, p, i) => s + w[i] * p.x, 0);
  const sumWY  = ordenado.reduce((s, p, i) => s + w[i] * p.y, 0);
  const mX = sumWX / W, mY = sumWY / W;

  let sxx = 0, sxy = 0;
  ordenado.forEach((p, i) => {
    sxx += w[i] * (p.x - mX) * (p.x - mX);
    sxy += w[i] * (p.x - mX) * (p.y - mY);
  });
  if (sxx === 0) return { pendiente: 0, intercepto: mY, r2: 0, valido: false, sigma: 0 };

  const m = sxy / sxx;
  const b = mY - m * mX;

  // R² ponderado y σ ponderada de residuos (para bandas de confianza)
  let ssRes = 0, ssTot = 0;
  ordenado.forEach((p, i) => {
    const yPred = m * p.x + b;
    ssRes += w[i] * Math.pow(p.y - yPred, 2);
    ssTot += w[i] * Math.pow(p.y - mY, 2);
  });
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  const sigma = n > 2 ? Math.sqrt(ssRes / (W * (n - 2) / n)) : 0;

  return { pendiente: m, intercepto: b, r2, valido: true, sigma };
};

// Proyectar puntos futuros usando una tendencia
export const proyectarFuturo = (tendencia, semanaInicio, nSemanas = 4) => {
  if (!tendencia.valido) return [];
  const { pendiente, intercepto, sigma } = tendencia;
  const out = [];
  for (let i = 1; i <= nSemanas; i++) {
    const x = semanaInicio + i;
    const y = pendiente * x + intercepto;
    out.push({
      x,
      semana: `S${x}`,
      proyeccion: parseFloat(y.toFixed(3)),
      bandaSup: parseFloat((y + sigma).toFixed(3)),
      bandaInf: parseFloat((y - sigma).toFixed(3)),
      esProyeccion: true,
    });
  }
  return out;
};

// ──────────────────────────────────────────────────────────────
// ALERTAS INTELIGENTES (Bloque D)
// Detecta automáticamente:
//  • CPI < 0.85 dos semanas seguidas (por actividad o cuadrilla)
//  • Sobrecostos: HH real > HH presupuesto (acumulado)
//  • Anomalías: registros con IP > 3σ del promedio
//  • Cuadrillas con baja productividad sostenida
// ──────────────────────────────────────────────────────────────

export const detectarAlertas = (historialEnriquecido) => {
  const alertas = [];
  if (!historialEnriquecido || historialEnriquecido.length === 0) return alertas;

  // ── 1. Anomalías (z-score por actividad) ──
  const ipsActividad = {};
  historialEnriquecido.forEach(r => {
    if (!r || !r._ipReal) return;
    const canon = r._actividadCanonica || r.actividad;
    if (!canon) return;
    if (!ipsActividad[canon]) ipsActividad[canon] = [];
    ipsActividad[canon].push({ ip: r._ipReal, registro: r });
  });

  Object.entries(ipsActividad).forEach(([canon, entries]) => {
    if (entries.length < 4) return;  // necesita histórico mínimo
    const ips = entries.map(e => e.ip);
    const mu = ips.reduce((s, v) => s + v, 0) / ips.length;
    const sigma = Math.sqrt(ips.reduce((s, v) => s + Math.pow(v - mu, 2), 0) / ips.length);
    if (sigma === 0) return;
    entries.forEach(({ ip, registro }) => {
      const z = (ip - mu) / sigma;
      if (Math.abs(z) > 2.5) {
        alertas.push({
          tipo: 'anomalia',
          severidad: Math.abs(z) > 3 ? 'alta' : 'media',
          icono: '🔍',
          titulo: 'Registro anómalo detectado',
          mensaje: `${canon.slice(0, 50)} — IP ${ip.toFixed(2)} se desvía ${z.toFixed(1)}σ del promedio (${mu.toFixed(2)})`,
          fecha: registro.fecha,
          capataz: registro.capataz,
          actividadId: canon,
          color: Math.abs(z) > 3 ? '#dc2626' : '#d97706',
        });
      }
    });
  });

  // ── 2. CPI < 0.85 dos semanas seguidas (por actividad) ──
  const cpiSemanaActividad = {};
  historialEnriquecido.forEach(r => {
    if (!r || !r._ipMeta || !r._ipReal) return;
    const canon = r._actividadCanonica || r.actividad;
    const sem = r.semana;
    if (!canon || !sem) return;
    const k = `${canon}|${sem}`;
    if (!cpiSemanaActividad[k]) cpiSemanaActividad[k] = { canon, sem, hhM: 0, hhR: 0 };
    const met = parseFloat(r.metrado) || 0;
    cpiSemanaActividad[k].hhM += met * r._ipMeta;
    cpiSemanaActividad[k].hhR += parseFloat(r.totalHH) || 0;
  });
  // Agrupar por actividad
  const byAct = {};
  Object.values(cpiSemanaActividad).forEach(({ canon, sem, hhM, hhR }) => {
    if (hhR === 0) return;
    const cpi = hhM / hhR;
    if (!byAct[canon]) byAct[canon] = [];
    byAct[canon].push({ sem, cpi });
  });
  Object.entries(byAct).forEach(([canon, semanas]) => {
    semanas.sort((a, b) => a.sem - b.sem);
    for (let i = 1; i < semanas.length; i++) {
      if (semanas[i].cpi < 0.85 && semanas[i - 1].cpi < 0.85 && semanas[i].sem === semanas[i - 1].sem + 1) {
        alertas.push({
          tipo: 'cpi_bajo_sostenido',
          severidad: 'alta',
          icono: '🔴',
          titulo: 'CPI crítico sostenido',
          mensaje: `${canon.slice(0, 50)} — CPI bajo en S${semanas[i-1].sem} (${Math.round(semanas[i-1].cpi*100)}%) y S${semanas[i].sem} (${Math.round(semanas[i].cpi*100)}%)`,
          actividadId: canon,
          color: '#dc2626',
        });
        break;
      }
    }
  });

  // ── 3. Sobrecostos: HH real > HH presupuesto (acumulado por actividad) ──
  const acumActividad = {};
  historialEnriquecido.forEach(r => {
    if (!r) return;
    const canon = r._actividadCanonica || r.actividad;
    if (!canon) return;
    if (!acumActividad[canon]) acumActividad[canon] = { hhR: 0, hhP: 0, met: 0 };
    const met = parseFloat(r.metrado) || 0;
    acumActividad[canon].hhR += parseFloat(r.totalHH) || 0;
    if (r._ipPpto && met > 0) acumActividad[canon].hhP += met * r._ipPpto;
    acumActividad[canon].met += met;
  });
  Object.entries(acumActividad).forEach(([canon, { hhR, hhP }]) => {
    if (hhP === 0 || hhR === 0) return;
    const sobrecosto = hhR - hhP;
    const pctSobrecosto = sobrecosto / hhP;
    if (pctSobrecosto > 0.20 && sobrecosto > 10) {
      alertas.push({
        tipo: 'sobrecosto',
        severidad: pctSobrecosto > 0.50 ? 'alta' : 'media',
        icono: '💸',
        titulo: 'Sobrecosto detectado',
        mensaje: `${canon.slice(0, 50)} — ${sobrecosto.toFixed(0)} HH sobre presupuesto (+${(pctSobrecosto * 100).toFixed(0)}%)`,
        actividadId: canon,
        color: pctSobrecosto > 0.50 ? '#dc2626' : '#d97706',
      });
    }
  });

  // ── 4. Cuadrillas con baja productividad sostenida ──
  const cpiSemanaCap = {};
  historialEnriquecido.forEach(r => {
    if (!r || !r.capataz || !r._ipMeta) return;
    const k = `${r.capataz}|${r.semana}`;
    if (!cpiSemanaCap[k]) cpiSemanaCap[k] = { capataz: r.capataz, sem: r.semana, hhM: 0, hhR: 0 };
    const met = parseFloat(r.metrado) || 0;
    cpiSemanaCap[k].hhM += met * r._ipMeta;
    cpiSemanaCap[k].hhR += parseFloat(r.totalHH) || 0;
  });
  const byCap = {};
  Object.values(cpiSemanaCap).forEach(({ capataz, sem, hhM, hhR }) => {
    if (hhR === 0) return;
    const cpi = hhM / hhR;
    if (!byCap[capataz]) byCap[capataz] = [];
    byCap[capataz].push({ sem, cpi });
  });
  Object.entries(byCap).forEach(([capataz, semanas]) => {
    semanas.sort((a, b) => a.sem - b.sem);
    if (semanas.length < 2) return;
    const ultimasDos = semanas.slice(-2);
    if (ultimasDos.every(s => s.cpi < 0.90)) {
      const promCpi = (ultimasDos[0].cpi + ultimasDos[1].cpi) / 2;
      alertas.push({
        tipo: 'cuadrilla_baja',
        severidad: promCpi < 0.75 ? 'alta' : 'media',
        icono: '👷',
        titulo: 'Cuadrilla con baja productividad',
        mensaje: `${capataz} — CPI promedio últimas 2 semanas: ${Math.round(promCpi * 100)}%`,
        capataz,
        color: promCpi < 0.75 ? '#dc2626' : '#d97706',
      });
    }
  });

  // Ordenar por severidad
  alertas.sort((a, b) => {
    if (a.severidad === b.severidad) return 0;
    return a.severidad === 'alta' ? -1 : 1;
  });
  return alertas;
};

// ──────────────────────────────────────────────────────────────
// RANKING COMPUESTO DE CUADRILLAS
//   score = CPI_promedio × consistencia × cumplimiento
//   - consistencia: 1 - desv_estandar (menos variación = mejor)
//   - cumplimiento: % de semanas con CPI >= 1.0
// ──────────────────────────────────────────────────────────────

export const rankingCuadrillas = (historialEnriquecido) => {
  if (!historialEnriquecido || historialEnriquecido.length === 0) return [];

  const cpiSemanaCap = {};
  historialEnriquecido.forEach(r => {
    if (!r || !r.capataz || !r._ipMeta) return;
    const k = `${r.capataz}|${r.semana}`;
    if (!cpiSemanaCap[k]) cpiSemanaCap[k] = { capataz: r.capataz, sem: r.semana, hhM: 0, hhR: 0, registros: 0 };
    const met = parseFloat(r.metrado) || 0;
    cpiSemanaCap[k].hhM += met * r._ipMeta;
    cpiSemanaCap[k].hhR += parseFloat(r.totalHH) || 0;
    cpiSemanaCap[k].registros++;
  });

  const byCap = {};
  Object.values(cpiSemanaCap).forEach(({ capataz, sem, hhM, hhR, registros }) => {
    if (hhR === 0) return;
    const cpi = hhM / hhR;
    if (!byCap[capataz]) byCap[capataz] = { capataz, semanas: [], totalHH: 0, totalReg: 0 };
    byCap[capataz].semanas.push({ sem, cpi });
    byCap[capataz].totalHH += hhR;
    byCap[capataz].totalReg += registros;
  });

  const result = Object.values(byCap).map(c => {
    const cpis = c.semanas.map(s => s.cpi);
    const cpiPromedio = cpis.reduce((s, v) => s + v, 0) / cpis.length;
    const sigma = cpis.length > 1
      ? Math.sqrt(cpis.reduce((s, v) => s + Math.pow(v - cpiPromedio, 2), 0) / cpis.length)
      : 0;
    const consistencia = Math.max(0, 1 - sigma);
    const semanasCumple = cpis.filter(v => v >= 1).length;
    const cumplimiento = semanasCumple / cpis.length;
    const score = cpiPromedio * consistencia * (0.5 + cumplimiento * 0.5);

    return {
      capataz: c.capataz,
      semanas: c.semanas.length,
      cpiPromedio,
      consistencia,
      cumplimiento,
      score,
      totalHH: c.totalHH,
      totalReg: c.totalReg,
    };
  });

  result.sort((a, b) => b.score - a.score);
  return result;
};

// ──────────────────────────────────────────────────────────────
// COSTOS HE — agrupado por trabajador en un período
// ──────────────────────────────────────────────────────────────

export const calcularCostosHEPorTrabajador = (registros, costosCustomMap = {}) => {
  // Agrupa HE por trabajador POR DÍA (necesario para el cálculo 60/100 correcto)
  const porTrabajadorPorDia = {};
  registros.forEach(r => {
    if (!r) return;
    (r.detalleTareo || []).forEach(t => {
      if (!t || !t.nombre) return;
      const k = `${t.nombre}|${r.fecha}`;
      if (!porTrabajadorPorDia[k]) {
        porTrabajadorPorDia[k] = {
          nombre: t.nombre, fecha: r.fecha, cargo: t.cargo || 'Operario', dni: t.dni || '',
          hn: 0, he: 0,
        };
      }
      porTrabajadorPorDia[k].hn += parseFloat(t.hn) || 0;
      porTrabajadorPorDia[k].he += parseFloat(t.he) || 0;
    });
  });

  // Aplicar 60/100 por día y luego agrupar por trabajador
  const porTrabajador = {};
  Object.values(porTrabajadorPorDia).forEach(d => {
    const ch = costoHoraDeTrabajador(d, costosCustomMap);
    const r = calcularCostoTrabajador(d.hn, d.he, ch);
    if (!porTrabajador[d.nombre]) {
      porTrabajador[d.nombre] = {
        nombre: d.nombre, cargo: d.cargo, dni: d.dni, costoHora: ch,
        diasTrabajados: 0,
        hn: 0, he60: 0, he100: 0, totalHH: 0,
        costoHN: 0, costoHE60: 0, costoHE100: 0, costoTotal: 0,
      };
    }
    porTrabajador[d.nombre].diasTrabajados += 1;
    porTrabajador[d.nombre].hn += r.hn;
    porTrabajador[d.nombre].he60 += r.he60;
    porTrabajador[d.nombre].he100 += r.he100;
    porTrabajador[d.nombre].totalHH += r.total;
    porTrabajador[d.nombre].costoHN += r.costoHN;
    porTrabajador[d.nombre].costoHE60 += r.costoHE60;
    porTrabajador[d.nombre].costoHE100 += r.costoHE100;
    porTrabajador[d.nombre].costoTotal += r.costoTotal;
  });

  return Object.values(porTrabajador).sort((a, b) => b.costoTotal - a.costoTotal);
};

// Colores Excel
export const XL_COLORS = {
  navy:'1E3A5F', green:'16A34A', greenL:'D1FAE5',
  orange:'EA580C', orangeL:'FED7AA', red:'DC2626', redL:'FEE2E2',
  yellow:'D97706', yellowL:'FEF3C7', blue:'1D4ED8', blueL:'DBEAFE',
  purple:'7C3AED', purpleL:'EDE9FE', gray:'64748B', grayL:'F1F5F9',
  white:'FFFFFF',
};

export const ACTIVITY_ORDER = (() => {
  const map = {};
  let idx = 0;
  Object.keys(CATALOGO_MASTER).forEach(p =>
    Object.keys(CATALOGO_MASTER[p]).forEach(sp =>
      CATALOGO_MASTER[p][sp].forEach(a => { map[a.trim()] = idx++; })
    )
  );
  return map;
})();

export const getActivityOrder = (actividad) => {
  if (!actividad) return 9999;
  const txt = actividad.trim();
  if (ACTIVITY_ORDER[txt] !== undefined) return ACTIVITY_ORDER[txt];
  const canonica = buscarActividadCanonica(txt);
  if (canonica && ACTIVITY_ORDER[canonica.actividad] !== undefined) {
    return ACTIVITY_ORDER[canonica.actividad];
  }
  return 9999;
};
// ──────────────────────────────────────────────────────────────
// EVM (Earned Value Management) — Curva-S según PMBOK
// PV = Planned Value (planeado), EV = Earned Value (ganado), AC = Actual Cost (real)
// CPI = EV/AC, SPI = EV/PV, EAC = BAC/CPI
// ──────────────────────────────────────────────────────────────

export const calcularEVM = (historialEnriquecido, fechaInicio = null) => {
  const regs = (historialEnriquecido || []).filter(r => r && r.semana && r._ipMeta);
  if (regs.length === 0) {
    return { puntos: [], totales: null, valido: false, motivo: 'Sin datos suficientes' };
  }

  // 1) Calcular EV y AC por semana
  const porSemana = {};
  regs.forEach(r => {
    const sem = r.semana;
    if (!porSemana[sem]) porSemana[sem] = { semana: sem, ev: 0, ac: 0, registros: 0 };
    const met = parseFloat(r.metrado) || 0;
    const ipMeta = parseFloat(r._ipMeta) || 0;
    // HH desde r.totalHH (MISMA fuente que el ISP: wbs.hhR y grafData.bySem usan
    // parseFloat(r.totalHH)). Antes se sumaba el detalleTareo (hn+he) y el acumulado
    // divergía del ISP cuando totalHH ≠ Σ(detalle). Detalle solo como respaldo.
    let hh = parseFloat(r.totalHH) || 0;
    if (hh === 0 && Array.isArray(r.detalleTareo)) {
      hh = r.detalleTareo.reduce((s, t) => s + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0), 0);
    }

    porSemana[sem].ev += met * ipMeta;  // EV = avance físico × ratio meta = "HH ganadas"
    porSemana[sem].ac += hh;            // AC = HH realmente trabajadas
    porSemana[sem].registros += 1;
  });

  const semanasOrdenadas = Object.values(porSemana).sort((a, b) => a.semana - b.semana);
  const semanaMin = semanasOrdenadas[0].semana;
  const semanaMax = semanasOrdenadas[semanasOrdenadas.length - 1].semana;
  const totalSemanas = semanaMax - semanaMin + 1;

  // 2) Calcular acumulados
  let evAcum = 0, acAcum = 0;
  const acumulados = semanasOrdenadas.map(s => {
    evAcum += s.ev;
    acAcum += s.ac;
    return { semana: s.semana, ev: s.ev, ac: s.ac, evAcum, acAcum };
  });

  const evTotalFinal = evAcum;  // BAC para la línea PV (asumimos EV final = BAC del ejecutado)

  // 3) PV: distribución lineal entre semana_inicio y semana_actual
  // (asunción: cronograma planeado = trabajo distribuido uniformemente, dado que no
  //  tenemos cronograma maestro digitalizado en GRAPCO)
  const pvPorSemana = (semIdx) => {
    const ratio = (semIdx + 1) / totalSemanas;
    return evTotalFinal * ratio;
  };

  // 4) Construir puntos de la curva con todos los indicadores EVM
  const puntos = acumulados.map((p, idx) => {
    const pvAcum = pvPorSemana(idx);
    const cpi = p.acAcum > 0 ? p.evAcum / p.acAcum : null;
    const spi = pvAcum > 0 ? p.evAcum / pvAcum : null;
    const cv = p.evAcum - p.acAcum;
    const sv = p.evAcum - pvAcum;
    return {
      semana: p.semana,
      semanaLabel: `S${p.semana}`,
      pv: parseFloat(pvAcum.toFixed(1)),
      ev: parseFloat(p.evAcum.toFixed(1)),
      ac: parseFloat(p.acAcum.toFixed(1)),
      cpi: cpi !== null ? parseFloat(cpi.toFixed(3)) : null,
      spi: spi !== null ? parseFloat(spi.toFixed(3)) : null,
      cv: parseFloat(cv.toFixed(1)),
      sv: parseFloat(sv.toFixed(1)),
    };
  });

  const ultimo = puntos[puntos.length - 1];
  const cpiActual = ultimo?.cpi || null;
  const spiActual = ultimo?.spi || null;
  // EAC = BAC / CPI (estimación al término basada en eficiencia actual)
  const bac = evTotalFinal;
  const eac = (cpiActual && cpiActual > 0) ? bac / cpiActual : null;
  const vac = eac !== null ? bac - eac : null;  // Variance at completion

  return {
    puntos,
    totales: {
      pv: ultimo?.pv || 0,
      ev: ultimo?.ev || 0,
      ac: ultimo?.ac || 0,
      cpi: cpiActual,
      spi: spiActual,
      cv: ultimo?.cv || 0,
      sv: ultimo?.sv || 0,
      bac,
      eac,
      vac,
      semanasAnalizadas: puntos.length,
    },
    valido: true,
  };
};

// ──────────────────────────────────────────────────────────────
// IMPACTO MEDIBLE — Comparación primer 25% vs último 25% del proyecto
// Para tesis: demuestra que la implementación del sistema mejoró indicadores
// ──────────────────────────────────────────────────────────────

export const calcularImpactoMedible = (historialEnriquecido) => {
  const regs = (historialEnriquecido || [])
    .filter(r => r && r.semana && r._ipMeta && r.metrado)
    .sort((a, b) => a.semana - b.semana);

  if (regs.length < 4) {
    return { valido: false, motivo: 'Se necesitan al menos 4 semanas de datos para comparación' };
  }

  // Agrupar por semana para CPI semanal
  const semanasMap = {};
  regs.forEach(r => {
    const sem = r.semana;
    if (!semanasMap[sem]) semanasMap[sem] = { hhMeta: 0, hhReal: 0 };
    const met = parseFloat(r.metrado) || 0;
    // HH desde r.totalHH (MISMA fuente que el ISP: wbs.hhR y grafData.bySem usan
    // parseFloat(r.totalHH)). Antes se sumaba el detalleTareo (hn+he) y el acumulado
    // divergía del ISP cuando totalHH ≠ Σ(detalle). Detalle solo como respaldo.
    let hh = parseFloat(r.totalHH) || 0;
    if (hh === 0 && Array.isArray(r.detalleTareo)) {
      hh = r.detalleTareo.reduce((s, t) => s + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0), 0);
    }
    semanasMap[sem].hhMeta += met * (parseFloat(r._ipMeta) || 0);
    semanasMap[sem].hhReal += hh;
  });

  const semanas = Object.keys(semanasMap).map(Number).sort((a, b) => a - b);
  const cuarto = Math.max(1, Math.floor(semanas.length / 4));

  const primerasN = semanas.slice(0, cuarto);
  const ultimasN  = semanas.slice(-cuarto);

  const promCPI = (lista) => {
    let hhM = 0, hhR = 0;
    lista.forEach(s => {
      hhM += semanasMap[s].hhMeta;
      hhR += semanasMap[s].hhReal;
    });
    return hhR > 0 ? hhM / hhR : null;
  };

  const sumHH = (lista) => {
    let hhM = 0, hhR = 0;
    lista.forEach(s => {
      hhM += semanasMap[s].hhMeta;
      hhR += semanasMap[s].hhReal;
    });
    return { hhMeta: hhM, hhReal: hhR, desperdicio: hhR - hhM };
  };

  const cpiAntes = promCPI(primerasN);
  const cpiAhora = promCPI(ultimasN);
  const sumAntes = sumHH(primerasN);
  const sumAhora = sumHH(ultimasN);

  // Total acumulado de "HH desperdiciadas" en todo el período
  let hhMetaTotal = 0, hhRealTotal = 0;
  semanas.forEach(s => {
    hhMetaTotal += semanasMap[s].hhMeta;
    hhRealTotal += semanasMap[s].hhReal;
  });
  const desperdicioTotal = Math.max(0, hhRealTotal - hhMetaTotal);

  // Mejora porcentual del CPI
  const mejoraCpi = (cpiAntes && cpiAhora && cpiAntes > 0)
    ? ((cpiAhora - cpiAntes) / cpiAntes) * 100
    : null;

  // HH potenciales ahorradas si CPI hubiera sido el de "ahora" desde el inicio
  const hhAhorrablesProyeccion = (cpiAhora && cpiAntes && cpiAhora > cpiAntes)
    ? sumAntes.hhReal - (sumAntes.hhMeta / cpiAhora)
    : 0;

  return {
    valido: true,
    semanasTotales: semanas.length,
    primerasSemanas: primerasN,
    ultimasSemanas: ultimasN,
    cpiAntes,
    cpiAhora,
    mejoraCpi,
    hhMetaTotal,
    hhRealTotal,
    desperdicioTotal,
    sumAntes,
    sumAhora,
    hhAhorrablesProyeccion: Math.max(0, hhAhorrablesProyeccion),
  };
};

// ──────────────────────────────────────────────────────────────
// VDC · Last Planner System (LPS)
// PPC = Percent Plan Complete = compromisos cumplidos / compromisos totales
// RNC = Razones de No Cumplimiento (8 categorías estándar)
// ──────────────────────────────────────────────────────────────

// Colores CATEGÓRICOS de GRAPCO (paleta CHART: tonos profundos armonizados, no
// arcoíris tailwind). Los íconos se mantienen como indicador funcional de categoría.
export const RNC_CATEGORIAS = [
  { id: 'materiales',    label: 'Materiales',         icon: '📦', color: '#B45309' },
  { id: 'equipos',       label: 'Equipos',            icon: '🔧', color: '#475569' },
  { id: 'mano_obra',     label: 'Mano de obra',       icon: '👷', color: '#E5A82F' },
  { id: 'informacion',   label: 'Información',        icon: '📋', color: '#1D4ED8' },
  { id: 'prerequisitos', label: 'Prerrequisitos',     icon: '🔗', color: '#7E22CE' },
  { id: 'clima',         label: 'Clima',              icon: '🌧️', color: '#0E7490' },
  { id: 'externos',      label: 'Cliente / Externos', icon: '🏢', color: '#0F2A47' },
  { id: 'reprocesos',    label: 'Reprocesos',         icon: '🔄', color: '#BE123C' },
];

export const RNC_LABELS = RNC_CATEGORIAS.reduce((m, c) => { m[c.id] = c.label; return m; }, {});
export const RNC_COLORS = RNC_CATEGORIAS.reduce((m, c) => { m[c.id] = c.color; return m; }, {});
export const RNC_ICONS  = RNC_CATEGORIAS.reduce((m, c) => { m[c.id] = c.icon;  return m; }, {});

// Calcula PPC semanal a partir de compromisos
// Cada compromiso = { id, semana, capataz, actividad, metradoComprometido,
//                     metradoEjecutado, cumplido (bool), rncCategoria }
export const calcularPPCSemanal = (compromisos) => {
  const map = {};
  (compromisos || []).forEach(c => {
    if (!c || !c.semana) return;
    const sem = c.semana;
    if (!map[sem]) map[sem] = { semana: sem, total: 0, cumplidos: 0, capatazes: new Set() };
    map[sem].total += 1;
    if (c.cumplido) map[sem].cumplidos += 1;
    if (c.capataz) map[sem].capatazes.add(c.capataz);
  });
  return Object.values(map)
    .map(s => ({
      semana: s.semana,
      total: s.total,
      cumplidos: s.cumplidos,
      ppc: s.total > 0 ? s.cumplidos / s.total : null,
      ppcPct: s.total > 0 ? Math.round((s.cumplidos / s.total) * 100) : null,
      cuadrillas: s.capatazes.size,
    }))
    .sort((a, b) => a.semana - b.semana);
};

// Pareto de RNC: agrupa por categoría, ordena descendente, calcula % acumulado
export const calcularParetoRNC = (compromisos) => {
  const incumplidos = (compromisos || []).filter(c => c && !c.cumplido && c.rncCategoria);
  if (incumplidos.length === 0) return { items: [], total: 0, top3Pct: 0 };

  const conteoPorCategoria = {};
  incumplidos.forEach(c => {
    conteoPorCategoria[c.rncCategoria] = (conteoPorCategoria[c.rncCategoria] || 0) + 1;
  });

  const total = incumplidos.length;
  const items = Object.entries(conteoPorCategoria)
    .map(([cat, count]) => ({
      categoria: cat,
      label: RNC_LABELS[cat] || cat,
      icon: RNC_ICONS[cat] || '📌',
      color: RNC_COLORS[cat] || '#64748b',
      count,
      pct: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // % acumulado
  let acum = 0;
  items.forEach(item => {
    acum += item.pct;
    item.acumPct = acum;
  });

  const top3 = items.slice(0, 3);
  const top3Pct = top3.reduce((s, i) => s + i.pct, 0);

  return { items, total, top3Pct };
};

// Calcula PPC promedio últimas N semanas y diagnóstico
export const diagnosticarPPC = (ppcSemanal, ultimasN = 4) => {
  const ultimas = (ppcSemanal || []).slice(-ultimasN).filter(s => s.ppc !== null);
  if (ultimas.length === 0) return { promedio: null, diagnostico: 'Sin datos', nivel: 'sin_datos' };

  const promedio = ultimas.reduce((s, p) => s + p.ppc, 0) / ultimas.length;
  let diagnostico, nivel, color;

  if (promedio >= 0.85) {
    diagnostico = 'Excelente. Equipo Lean maduro.'; nivel = 'excelente'; color = '#15803d';
  } else if (promedio >= 0.80) {
    diagnostico = 'Bueno. Cumple benchmark Lean Construction Institute (≥80%).';
    nivel = 'bueno'; color = '#16a34a';
  } else if (promedio >= 0.65) {
    diagnostico = 'Aceptable. Hay margen de mejora — revisar RNC top.'; nivel = 'aceptable'; color = '#d97706';
  } else if (promedio >= 0.50) {
    diagnostico = 'Bajo. Variabilidad alta, riesgo en cronograma.'; nivel = 'bajo'; color = '#ea580c';
  } else {
    diagnostico = 'Crítico. La planificación no se está ejecutando.'; nivel = 'critico'; color = '#dc2626';
  }

  return { promedio, promedioPct: Math.round(promedio * 100), diagnostico, nivel, color, semanasAnalizadas: ultimas.length };
};

// Genera ID único para compromiso LPS
export const compromisoId = (semana, capataz, actividad) => {
  const safe = s => String(s || '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  return `cpm_S${semana}_${safe(capataz)}_${safe(actividad)}_${Date.now().toString(36).slice(-4)}`;
};

// ──────────────────────────────────────────────────────────────
// CONTROL GERENCIAL · Helpers para los 3 reportes Excel maestros
// ──────────────────────────────────────────────────────────────

// Mapeo de partidas a códigos cortos (alineado con el Excel original GRAPCO)
export const PARTIDA_CODIGOS_CORTOS = {
  'TRABAJOS PRELIMINARES':      'PRE',
  'OBRAS PROVISIONALES':        'PRO',
  'CONCRETO':                   'CON',
  'ACERO':                      'ACE',
  'CURADO':                     'CUR',
  'VARIOS ESTRUCTURA':          'VAE',
  'VARIOS ESTRUCTURAS':         'VAE',
  'TABIQUERIA':                 'TAB',
  'BITUMEN':                    'BIT',
  'CONTRAPISOS':                'CONT',
  'CONTRAPISO':                 'CONT',
  'PRUEBA HIDRAULICA':          'PRH',
  'VARIOS ARQUITECTURA':        'VAA',
  'INSTALACIONES ELECTRICAS':   'IIEE',
  'INSTALACIONES SANITARIAS':   'IISS',
  'MOVIMIENTO DE TIERRAS':      'MOV',
  'ENCOFRADO':                  'ENC',
  'ESTRUCTURA METÁLICA':        'MET',
  'ESTRUCTURA METALICA':        'MET',
  'IMPERMEABILIZACION':         'IMP',
  'IMPERMEABILIZACIÓN':         'IMP',
  'PINTURA':                    'PIN',
  'OTROS':                      'OTR',
  'GASTOS GENERALES':           'GG',
};

export const codigoCortoPartida = (nombre) => {
  if (!nombre) return '???';
  const upper = String(nombre).toUpperCase().trim();
  if (PARTIDA_CODIGOS_CORTOS[upper]) return PARTIDA_CODIGOS_CORTOS[upper];
  // Fallback: primeras 3 letras significativas
  const limpio = upper.replace(/[^A-Z]/g, '');
  return limpio.slice(0, 3) || '???';
};

// ────────────────────────────────────────────
// REPORTE 1 · TAREOS POR COSTO (jerárquico)
// Replica el primer Excel: Partida → Subpartida → HH × tarifa = COSTO
// ────────────────────────────────────────────

export const calcularReporteTareos = (registros, tarifaPromedio = 25.50) => {
  const partidasMap = {};
  let totalHH = 0, totalCosto = 0;

  (registros || []).forEach(r => {
    if (!r) return;
    const partida = (r.partida || 'SIN_PARTIDA').toUpperCase().trim();
    const subpartida = (r.subpartida || 'SIN_SUBPARTIDA').toUpperCase().trim();

    // HH desde r.totalHH (MISMA fuente que el ISP: wbs.hhR y grafData.bySem usan
    // parseFloat(r.totalHH)). Antes se sumaba el detalleTareo (hn+he) y el acumulado
    // divergía del ISP cuando totalHH ≠ Σ(detalle). Detalle solo como respaldo.
    let hh = parseFloat(r.totalHH) || 0;
    if (hh === 0 && Array.isArray(r.detalleTareo)) {
      hh = r.detalleTareo.reduce((s, t) => s + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0), 0);
    }

    const costo = hh * tarifaPromedio;
    totalHH += hh;
    totalCosto += costo;

    if (!partidasMap[partida]) {
      partidasMap[partida] = {
        nombre: partida,
        codigo: codigoCortoPartida(partida),
        hh: 0,
        costo: 0,
        subpartidas: {},
      };
    }
    partidasMap[partida].hh += hh;
    partidasMap[partida].costo += costo;

    if (!partidasMap[partida].subpartidas[subpartida]) {
      partidasMap[partida].subpartidas[subpartida] = {
        nombre: subpartida,
        hh: 0,
        costo: 0,
      };
    }
    partidasMap[partida].subpartidas[subpartida].hh += hh;
    partidasMap[partida].subpartidas[subpartida].costo += costo;
  });

  // Ordenar partidas según ACTIVITY_ORDER del catálogo (primer item de cada partida)
  const partidasArr = Object.values(partidasMap).map((p, idx) => ({
    ...p,
    indice: idx + 1,
    subpartidas: Object.values(p.subpartidas).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }));

  return { partidas: partidasArr, totalHH, totalCosto };
};

// ────────────────────────────────────────────
// REPORTE 2 · CONTROL HH VARIACIONES + HEATMAP
// Replica el segundo Excel: HH planilla vs campo + matriz partida × semana
// ────────────────────────────────────────────

// HH planilla teóricas: trabajadores × jornada × días laborales por semana
// (asumimos 5 días laborales — ajustable si hay registro de días)
export const estimarHHPlanillaSemana = (numTrabajadores, jornadaLegal = 8.5, diasLaborales = 5) => {
  return numTrabajadores * jornadaLegal * diasLaborales;
};

// asistenciaPorSemana (opcional) — viene del hook useAsistenciaDiaria.
// Cuando una semana tiene asistencia real registrada, esa es la fuente oficial de hhPlanilla.
// Si no hay data, fallback al cálculo estimado por número de trabajadores.
export const calcularControlHHVariaciones = (registros, numTrabajadoresActivos = 0, jornadaLegal = 8.5, asistenciaPorSemana = null) => {
  const semanasMap = {};

  (registros || []).forEach(r => {
    // Solo registros que RESUELVEN al catálogo WBS (_matched), igual que el ISP: su total
    // (Σ TOTAL OBRA · wbs.hhR) solo cuenta actividades del catálogo. Antes se contaba TODO el
    // HH de campo (incluidas actividades fuera del WBS) y el acumulado quedaba por encima del ISP.
    if (!r || !r.semana || r._matched === false) return;
    const sem = r.semana;
    if (!semanasMap[sem]) {
      semanasMap[sem] = {
        semana: sem,
        hhCampo: 0,
        hhMeta: 0,
        partidas: {},  // codigo corto → { real, meta, delta }
      };
    }

    // HH desde r.totalHH (MISMA fuente que el ISP: wbs.hhR y grafData.bySem usan
    // parseFloat(r.totalHH)). Antes se sumaba el detalleTareo (hn+he) y el acumulado
    // divergía del ISP cuando totalHH ≠ Σ(detalle). Detalle solo como respaldo.
    let hh = parseFloat(r.totalHH) || 0;
    if (hh === 0 && Array.isArray(r.detalleTareo)) {
      hh = r.detalleTareo.reduce((s, t) => s + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0), 0);
    }

    const ipMeta = parseFloat(r._ipMeta) || 0;
    const met = parseFloat(r.metrado) || 0;
    const hhMeta = met * ipMeta;

    semanasMap[sem].hhCampo += hh;
    semanasMap[sem].hhMeta += hhMeta;

    const codigo = codigoCortoPartida(r.partida);
    if (!semanasMap[sem].partidas[codigo]) {
      semanasMap[sem].partidas[codigo] = { real: 0, meta: 0 };
    }
    semanasMap[sem].partidas[codigo].real += hh;
    semanasMap[sem].partidas[codigo].meta += hhMeta;
  });

  // Calcular deltas por partida y acumulados
  const semanasOrdenadas = Object.values(semanasMap).sort((a, b) => a.semana - b.semana);
  let hhCampoAcum = 0, hhMetaAcum = 0;
  const partidasAcum = {};  // por código

  semanasOrdenadas.forEach(s => {
    hhCampoAcum += s.hhCampo;
    hhMetaAcum += s.hhMeta;
    s.hhCampoAcum = hhCampoAcum;
    s.hhMetaAcum = hhMetaAcum;
    s.cpi = hhCampoAcum > 0 ? hhMetaAcum / hhCampoAcum : null;

    // HH planilla: prioridad a asistencia REAL (admin entrada/salida).
    // Si no hay data → estimación por número de trabajadores · jornada · días.
    // Marca origen para que la UI pueda mostrar badge.
    const asistRealSem = asistenciaPorSemana && asistenciaPorSemana[s.semana];
    if (asistRealSem && asistRealSem.total > 0) {
      s.hhPlanilla = asistRealSem.total;
      s.hhPlanillaFuente = 'admin-real';
    } else if (numTrabajadoresActivos > 0) {
      s.hhPlanilla = estimarHHPlanillaSemana(numTrabajadoresActivos, jornadaLegal);
      s.hhPlanillaFuente = 'estimado';
    } else {
      s.hhPlanilla = s.hhCampo;
      s.hhPlanillaFuente = 'proxy-campo';
    }

    // Delta por partida (real - meta = sobrecosto si positivo)
    Object.entries(s.partidas).forEach(([cod, datos]) => {
      datos.delta = Math.round(datos.real - datos.meta);
      if (!partidasAcum[cod]) partidasAcum[cod] = { real: 0, meta: 0, delta: 0 };
      partidasAcum[cod].real += datos.real;
      partidasAcum[cod].meta += datos.meta;
      partidasAcum[cod].delta = Math.round(partidasAcum[cod].real - partidasAcum[cod].meta);
    });
  });

  // Lista de códigos de partidas que aparecieron
  const codigosPartida = Array.from(new Set(
    semanasOrdenadas.flatMap(s => Object.keys(s.partidas))
  )).sort((a, b) => {
    // Orden según PARTIDA_CODIGOS_CORTOS
    const orden = Object.values(PARTIDA_CODIGOS_CORTOS);
    const ia = orden.indexOf(a);
    const ib = orden.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return {
    semanas: semanasOrdenadas,
    codigosPartida,
    partidasAcum,
    totales: {
      hhCampo: hhCampoAcum,
      hhMeta: hhMetaAcum,
      cpiGlobal: hhCampoAcum > 0 ? hhMetaAcum / hhCampoAcum : null,
      deltaTotal: Math.round(hhCampoAcum - hhMetaAcum),
    },
  };
};

// ────────────────────────────────────────────
// REPORTE 3 · CONTROL DE IP por actividad × semana
// Replica el tercer Excel: IP Contractual | IP Meta | SEM N | Delta
// ────────────────────────────────────────────

export const calcularMatrizIP = (registros) => {
  // Agrupar por actividad canónica
  const actividadesMap = {};

  (registros || []).forEach(r => {
    if (!r || !r.actividad) return;
    const act = r.actividad.toUpperCase().trim();

    if (!actividadesMap[act]) {
      actividadesMap[act] = {
        actividad: act,
        partida: r.partida || '',
        subpartida: r.subpartida || '',
        unidad: r.unidad || 'UND',
        ipContractual: r._ipPpto || r.ipPresupuesto || null,
        ipMeta: r._ipMeta || r.ipMeta || null,
        porSemana: {},  // semana → { hh, met }
      };
    }

    const sem = r.semana || 0;
    if (!actividadesMap[act].porSemana[sem]) {
      actividadesMap[act].porSemana[sem] = { hh: 0, met: 0 };
    }

    // HH desde r.totalHH (MISMA fuente que el ISP: wbs.hhR y grafData.bySem usan
    // parseFloat(r.totalHH)). Antes se sumaba el detalleTareo (hn+he) y el acumulado
    // divergía del ISP cuando totalHH ≠ Σ(detalle). Detalle solo como respaldo.
    let hh = parseFloat(r.totalHH) || 0;
    if (hh === 0 && Array.isArray(r.detalleTareo)) {
      hh = r.detalleTareo.reduce((s, t) => s + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0), 0);
    }

    actividadesMap[act].porSemana[sem].hh += hh;
    actividadesMap[act].porSemana[sem].met += parseFloat(r.metrado) || 0;

    // Si no teníamos ips, intentar obtenerlos del registro
    if (!actividadesMap[act].ipContractual && (r._ipPpto || r.ipPresupuesto)) {
      actividadesMap[act].ipContractual = r._ipPpto || r.ipPresupuesto;
    }
    if (!actividadesMap[act].ipMeta && (r._ipMeta || r.ipMeta)) {
      actividadesMap[act].ipMeta = r._ipMeta || r.ipMeta;
    }
  });

  // Calcular IP por semana (ip = hh / metrado, acumulado)
  const semanasSet = new Set();
  Object.values(actividadesMap).forEach(a => {
    Object.keys(a.porSemana).forEach(s => semanasSet.add(parseInt(s)));
  });
  const semanasOrdenadas = Array.from(semanasSet).sort((a, b) => a - b);

  const filas = Object.values(actividadesMap).map(a => {
    let hhAcum = 0, metAcum = 0;
    const ipAcumPorSemana = {};
    semanasOrdenadas.forEach(sem => {
      const data = a.porSemana[sem];
      if (data) {
        hhAcum += data.hh;
        metAcum += data.met;
      }
      ipAcumPorSemana[sem] = metAcum > 0 ? hhAcum / metAcum : null;
    });

    const ipFinal = ipAcumPorSemana[semanasOrdenadas[semanasOrdenadas.length - 1]] || null;
    const delta = (a.ipMeta && ipFinal) ? a.ipMeta - ipFinal : null;
    const necesitaActualizar = (delta !== null && delta < 0);  // ip real > ip meta = peor

    return {
      ...a,
      ipAcumPorSemana,
      ipFinal,
      delta,
      necesitaActualizar,
    };
  });

  // Ordenar por partida + actividad
  filas.sort((a, b) => {
    if (a.partida !== b.partida) return a.partida.localeCompare(b.partida);
    return a.actividad.localeCompare(b.actividad);
  });

  return { filas, semanas: semanasOrdenadas };
};

// ──────────────────────────────────────────────────────────────
// VDC Fase 2 · RESTRICCIONES (7 flujos Lean) + LECCIONES APRENDIDAS
// ──────────────────────────────────────────────────────────────

export const RESTRICCION_TIPOS = [
  { id: 'informacion',   label: 'Información',     icon: '📋', color: '#2563eb', desc: 'Planos, RFI, especificaciones técnicas' },
  { id: 'recursos',      label: 'Recursos $',      icon: '💰', color: '#16a34a', desc: 'Presupuesto, autorizaciones de compra' },
  { id: 'equipos',       label: 'Equipos',         icon: '🔧', color: '#ea580c', desc: 'Mezcladoras, andamios, herramientas' },
  { id: 'mano_obra',     label: 'Mano de obra',    icon: '👷', color: '#d97706', desc: 'Disponibilidad, capacitación, cuadrillas' },
  { id: 'materiales',    label: 'Materiales',      icon: '📦', color: '#dc2626', desc: 'Cemento, acero, agregados, encofrado' },
  { id: 'externos',      label: 'Externos',        icon: '🏢', color: '#7c3aed', desc: 'Cliente, municipalidad, subcontratistas' },
  { id: 'prerequisitos', label: 'Prerrequisitos',  icon: '🔗', color: '#0891b2', desc: 'Actividades previas, sectores liberados' },
];

export const RESTRICCION_TIPOS_MAP = RESTRICCION_TIPOS.reduce((m, t) => { m[t.id] = t; return m; }, {});

export const RESTRICCION_ESTADOS = {
  pendiente:  { label: 'Pendiente',   color: '#dc2626', bg: '#fee2e2' },
  en_proceso: { label: 'En proceso',  color: '#d97706', bg: '#fef3c7' },
  liberada:   { label: 'Liberada',    color: '#15803d', bg: '#dcfce7' },
  vencida:    { label: 'VENCIDA',     color: '#7f1d1d', bg: '#fecaca' },
};

export const diasEntre = (fechaA, fechaB) => {
  if (!fechaA || !fechaB) return null;
  const a = new Date(fechaA);
  const b = new Date(fechaB);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

export const calcularEstadoRestriccion = (restriccion) => {
  if (!restriccion) return 'pendiente';
  if (restriccion.estado === 'liberada') return 'liberada';
  // Si tiene fecha de compromiso pasada y no está liberada, está vencida
  if (restriccion.fechaCompromisoLiberacion) {
    const hoyStr = new Date().toISOString().split('T')[0];
    if (restriccion.fechaCompromisoLiberacion < hoyStr && restriccion.estado !== 'liberada') {
      return 'vencida';
    }
  }
  return restriccion.estado || 'pendiente';
};

export const calcularKPIRestricciones = (restricciones) => {
  const lista = (restricciones || []).map(r => ({ ...r, _estado: calcularEstadoRestriccion(r) }));
  const total = lista.length;
  const pendientes  = lista.filter(r => r._estado === 'pendiente').length;
  const enProceso   = lista.filter(r => r._estado === 'en_proceso').length;
  const liberadas   = lista.filter(r => r._estado === 'liberada').length;
  const vencidas    = lista.filter(r => r._estado === 'vencida').length;

  // % liberadas a tiempo (cerradas antes o el mismo día del compromiso)
  const liberadasConFechas = lista.filter(r => r._estado === 'liberada' && r.fechaLiberacionReal && r.fechaCompromisoLiberacion);
  const liberadasATiempo = liberadasConFechas.filter(r => r.fechaLiberacionReal <= r.fechaCompromisoLiberacion).length;
  const pctLiberadasATiempo = liberadasConFechas.length > 0
    ? (liberadasATiempo / liberadasConFechas.length) * 100
    : null;

  // Distribución por tipo de flujo
  const porTipo = {};
  RESTRICCION_TIPOS.forEach(t => { porTipo[t.id] = 0; });
  lista.forEach(r => { if (r.tipoFlujo && porTipo[r.tipoFlujo] !== undefined) porTipo[r.tipoFlujo] += 1; });

  // Próximas a vencer (7 días)
  const hoyStr = new Date().toISOString().split('T')[0];
  const en7dias = new Date();
  en7dias.setDate(en7dias.getDate() + 7);
  const en7Str = en7dias.toISOString().split('T')[0];
  const proximasAVencer = lista.filter(r =>
    r._estado !== 'liberada' && r._estado !== 'vencida' &&
    r.fechaCompromisoLiberacion &&
    r.fechaCompromisoLiberacion >= hoyStr && r.fechaCompromisoLiberacion <= en7Str
  );

  return {
    total, pendientes, enProceso, liberadas, vencidas,
    pctLiberadasATiempo,
    porTipo,
    proximasAVencer,
    lista,
  };
};

// Sugiere lecciones aprendidas: cuando una misma categoría RNC aparece ≥3 veces
// y no existe lección registrada para esa categoría
export const sugerirLecciones = (compromisos, leccionesExistentes) => {
  const rncCategorias = {};
  (compromisos || []).forEach(c => {
    if (c && !c.cumplido && c.rncCategoria) {
      if (!rncCategorias[c.rncCategoria]) rncCategorias[c.rncCategoria] = [];
      rncCategorias[c.rncCategoria].push(c);
    }
  });

  const yaConLeccion = new Set((leccionesExistentes || []).map(l => l.categoria));

  const sugerencias = [];
  Object.entries(rncCategorias).forEach(([cat, incidentes]) => {
    if (incidentes.length >= 3 && !yaConLeccion.has(cat)) {
      sugerencias.push({
        categoria: cat,
        incidentes: incidentes.length,
        ejemplos: incidentes.slice(-3).map(i => ({
          actividad: i.actividad,
          semana: i.semana,
          capataz: i.capataz,
          descripcion: i.rncDescripcion,
        })),
      });
    }
  });

  return sugerencias.sort((a, b) => b.incidentes - a.incidentes);
};

export const calcularKPILecciones = (lecciones) => {
  const total = (lecciones || []).length;
  const porCategoria = {};
  (lecciones || []).forEach(l => {
    if (l && l.categoria) porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + 1;
  });

  // Top categorías más documentadas
  const masAplicada = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => ({ categoria: cat, count }));

  return { total, porCategoria, masAplicada };
};

export const restriccionId = () => `rstr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
export const leccionId    = () => `lec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

// ──────────────────────────────────────────────────────────────
// LAP · LOOKAHEAD A 6 SEMANAS · Programación Semanal · Ejecución Diaria
// Helpers para módulo Last Planner System completo (replica Excel maestro)
// ──────────────────────────────────────────────────────────────

export const DIAS_SEMANA = [
  { id: 'lun', label: 'lun', full: 'Lunes' },
  { id: 'mar', label: 'mar', full: 'Martes' },
  { id: 'mie', label: 'mié', full: 'Miércoles' },
  { id: 'jue', label: 'jue', full: 'Jueves' },
  { id: 'vie', label: 'vie', full: 'Viernes' },
  { id: 'sab', label: 'sáb', full: 'Sábado' },
  { id: 'dom', label: 'dom', full: 'Domingo' },
];

// Niveles de prioridad/programación (S0/S1/S2 del Excel)
export const NIVELES_PROG = {
  S0: { label: 'S0', desc: 'Programado original',  color: '#67e8f9', text: '#0c4a6e' },
  S1: { label: 'S1', desc: 'Re-programado',        color: '#fde047', text: '#713f12' },
  S2: { label: 'S2', desc: 'Urgente / atrasado',   color: '#ef4444', text: '#7f1d1d' },
  C2: { label: 'C2', desc: 'Crítico',              color: '#9ca3af', text: '#1e293b' },
  C3: { label: 'C3', desc: 'Crítico nivel 3',      color: '#9ca3af', text: '#1e293b' },
};

// Cumplimiento por día
export const TIPOS_CUMPLIMIENTO = {
  SI: { label: 'SI', color: '#16a34a' },
  NO: { label: 'NO', color: '#dc2626' },
  SC: { label: 'SC', color: '#94a3b8', desc: 'Sin cumplir' },
  PA: { label: 'PA', color: '#d97706', desc: 'Parcial' },
};

// Convierte fecha YYYY-MM-DD a día de la semana (lun=0, dom=6)
export const fechaADiaSemana = (fechaStr) => {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T00:00:00');
  if (isNaN(d)) return null;
  const dow = d.getDay();  // 0=dom, 1=lun, ..., 6=sab
  return dow === 0 ? 6 : dow - 1;  // 0=lun, 6=dom
};

// Genera un array de 7 fechas (lun-dom) para una semana dada
export const fechasDeSemana = (semana, fechaInicioProyecto) => {
  const inicio = new Date(fechaInicioProyecto + 'T00:00:00');
  if (isNaN(inicio)) return [];
  // Encontrar el lunes de la semana de inicio
  const dowInicio = inicio.getDay();
  const desplazamientoLunes = dowInicio === 0 ? -6 : 1 - dowInicio;
  const lunesPrimeraSem = new Date(inicio);
  lunesPrimeraSem.setDate(inicio.getDate() + desplazamientoLunes);
  // Lunes de la semana solicitada
  const lunesSem = new Date(lunesPrimeraSem);
  lunesSem.setDate(lunesPrimeraSem.getDate() + (semana - 1) * 7);
  // Generar los 7 días
  return DIAS_SEMANA.map((d, idx) => {
    const fecha = new Date(lunesSem);
    fecha.setDate(lunesSem.getDate() + idx);
    return {
      ...d,
      fecha: fecha.toISOString().split('T')[0],
      dia: fecha.getDate(),
      mes: fecha.toLocaleDateString('es-PE', { month: 'short' }),
    };
  });
};

// Fechas de un Lookahead de N semanas a partir de la semana actual
export const generarLookahead = (semanaActual, numSemanas, fechaInicioProyecto) => {
  const semanas = [];
  for (let i = 0; i < numSemanas; i++) {
    const sem = semanaActual + i;
    semanas.push({
      numero: sem,
      label: `SEMANA ${sem}`,
      dias: fechasDeSemana(sem, fechaInicioProyecto),
    });
  }
  return semanas;
};

// Calcula el PPC global de una serie de compromisos diarios
// Ejemplo input: [{ planificado: true, ejecutado: 'SI' }, ...]
export const calcularPPCDiario = (compromisosDia) => {
  const planificados = (compromisosDia || []).filter(c => c.planificado);
  if (planificados.length === 0) return null;
  const cumplidos = planificados.filter(c => c.ejecutado === 'SI').length;
  return cumplidos / planificados.length;
};

// Construye estructura jerárquica para vista LAP / Programación / Ejecución
// Agrupa por: frente → partida → subpartida → actividad
export const construirJerarquiaLPS = (compromisos) => {
  const jerarquia = {};
  (compromisos || []).forEach(c => {
    if (!c) return;
    const frente = c.frente || 'PROYECTO';
    const partida = (c.partida || 'GENERAL').toUpperCase();
    const subpartida = (c.subpartida || 'GENERAL').toUpperCase();

    if (!jerarquia[frente]) jerarquia[frente] = { nombre: frente, nivel: 'N1', hijos: {} };
    if (!jerarquia[frente].hijos[partida]) jerarquia[frente].hijos[partida] = { nombre: partida, nivel: 'N2', hijos: {} };
    if (!jerarquia[frente].hijos[partida].hijos[subpartida]) jerarquia[frente].hijos[partida].hijos[subpartida] = { nombre: subpartida, nivel: 'N3', hijos: [] };

    jerarquia[frente].hijos[partida].hijos[subpartida].hijos.push(c);
  });

  // Aplanar a array ordenado para tabla
  const filas = [];
  Object.values(jerarquia).forEach(f => {
    filas.push({ tipo: 'frente', nivel: 'N1', nombre: f.nombre });
    Object.values(f.hijos).forEach(p => {
      filas.push({ tipo: 'partida', nivel: 'N2', nombre: p.nombre });
      Object.values(p.hijos).forEach(s => {
        filas.push({ tipo: 'subpartida', nivel: 'N3', nombre: s.nombre });
        s.hijos.forEach(act => {
          filas.push({ tipo: 'actividad', nivel: 'ACT', actividad: act });
        });
      });
    });
  });

  return filas;
};

// Filtros y agregaciones de restricciones por semana (matriz semana × restricción)
export const construirMatrizRestriccionesPorSemana = (restricciones, semanasMostrar = 4, semanaActual = 1) => {
  const semanas = [];
  for (let i = 0; i < semanasMostrar; i++) {
    semanas.push(semanaActual + i);
  }

  const filas = (restricciones || []).map(r => {
    const semanaCompromiso = r.fechaCompromisoLiberacion
      ? Math.ceil((new Date(r.fechaCompromisoLiberacion) - new Date('2025-12-01')) / (1000 * 60 * 60 * 24 * 7))
      : null;
    const matriz = {};
    semanas.forEach(s => {
      matriz[s] = (semanaCompromiso === s);
    });
    return { ...r, _matriz: matriz, _semanaCompromiso: semanaCompromiso };
  });

  return { filas, semanas };
};

// ──────────────────────────────────────────────────────────────
// BIM · Vinculación WBS ↔ Modelo BIM (Fase 1) + Visor (Fase 2)
// Estructura colección Firestore: BIM_Vinculos
// Documento: { id, partida, subpartida, actividad, bimGuids: [string],
//              comentario, creadoEn, actualizadoEn }
// ──────────────────────────────────────────────────────────────

export const BIM_ESTADO_VINCULO = {
  vinculado:    { label: 'Vinculado',    color: '#16a34a', icon: '✅' },
  parcial:      { label: 'Parcial',      color: '#d97706', icon: '⚠️' },
  sin_vincular: { label: 'Sin vincular', color: '#94a3b8', icon: '○'  },
};

// Calcula KPIs de adopción BIM
export const calcularKPIBim = (vinculos = [], totalActividadesWBS = 0) => {
  const conVinculo = vinculos.filter(v => (v.bimGuids || []).length > 0);
  const guidsTotal = conVinculo.reduce((acc, v) => acc + (v.bimGuids || []).length, 0);
  const cobertura = totalActividadesWBS > 0
    ? (conVinculo.length / totalActividadesWBS) * 100
    : 0;
  return {
    actividadesVinculadas: conVinculo.length,
    totalActividades: totalActividadesWBS,
    guidsTotal,
    cobertura: parseFloat(cobertura.toFixed(1)),
    promedioGuidsPorActividad: conVinculo.length > 0
      ? parseFloat((guidsTotal / conVinculo.length).toFixed(2))
      : 0,
  };
};

// Genera ID único para vínculo BIM
export const bimVinculoId = (partida, subpartida, actividad) =>
  `bim_${(partida || '').toLowerCase().replace(/\s+/g, '_')}_${(subpartida || '').toLowerCase().replace(/\s+/g, '_')}_${(actividad || '').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

// Valida formato de GUID BIM (acepta formatos comunes: Revit GUID, IFC GlobalId, custom IDs)
export const validarBimGuid = (guid) => {
  if (!guid || typeof guid !== 'string') return false;
  const trimmed = guid.trim();
  if (trimmed.length < 4 || trimmed.length > 100) return false;
  // Acepta: hex, alfanumérico con guiones, IFC GlobalIds (22 chars base64-like)
  return /^[a-zA-Z0-9_\-$]+$/.test(trimmed);
};
