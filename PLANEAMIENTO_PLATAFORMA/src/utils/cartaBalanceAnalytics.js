// src/utils/cartaBalanceAnalytics.js — Motor de analítica avanzada (Bloque 16)
//
// Funciones puras para calcular KPIs sobre datos históricos de Carta Balance.
// Basado en literatura de Crew Balance Chart (Kuprenas & Fakhouri),
// Work Sampling (Borcherding, O'Brien) y modelos de optimización
// con multiskilling (Hossain et al., 2015).
//
// Conceptos clave:
//   - LUF (Labor Utilization Factor) = TP + 0.5 × TC
//     Métrica agregada estándar de la industria. Rangos sanos: 60-80%.
//   - TP / TC / TNC: Trabajo Productivo / Contributorio / No Contributorio
//   - Crew Balance: idle time individual vs total time
//   - Pareto de TNC: 80/20 — pocas causas explican la mayoría del tiempo perdido

// ════════════════════════════════════════════════════════════════
// SUBCATEGORÍAS ESTÁNDAR DE CARTA BALANCE
// (basadas en literatura: Borcherding 1976, ICCI Lima 2016)
// ════════════════════════════════════════════════════════════════

export const SUBCATEGORIAS_TC = [
  { id: 'transporte',     label: 'Transporte de materiales',  icono: '🚚' },
  { id: 'mediciones',     label: 'Mediciones / replanteo',    icono: '📐' },
  { id: 'instrucciones',  label: 'Recibir instrucciones',     icono: '👂' },
  { id: 'limpieza',       label: 'Limpieza del frente',       icono: '🧹' },
  { id: 'preparacion',    label: 'Preparación / armado',      icono: '🔧' },
  { id: 'descanso_prog',  label: 'Descanso programado',       icono: '☕' },
];

export const SUBCATEGORIAS_TNC = [
  { id: 'espera_material',  label: 'Espera de material',       icono: '📦', critico: true  },
  { id: 'espera_equipo',    label: 'Espera de equipo',         icono: '🏗️', critico: true  },
  { id: 'espera_instrucc',  label: 'Espera de instrucciones',  icono: '⏳', critico: true  },
  { id: 'espera_otros',     label: 'Espera por otra cuadrilla', icono: '👥', critico: true  },
  { id: 'retrabajo',        label: 'Retrabajo / corrección',   icono: '🔄', critico: true  },
  { id: 'descanso_no_prog', label: 'Descanso no programado',   icono: '🪑', critico: false },
  { id: 'conversacion',     label: 'Conversación no laboral',  icono: '💬', critico: false },
  { id: 'traslado',         label: 'Traslado innecesario',     icono: '🚶', critico: false },
  { id: 'inactividad',      label: 'Inactividad sin causa',    icono: '❓', critico: false },
];

export const TODAS_SUBCATEGORIAS = {
  TC: SUBCATEGORIAS_TC,
  TNC: SUBCATEGORIAS_TNC,
};

// ════════════════════════════════════════════════════════════════
// MAPEO LEGACY → NUEVAS SUBCATEGORÍAS
// Para retrocompatibilidad con CartaBalance v1 (códigos cortos)
// ════════════════════════════════════════════════════════════════
const MAPEO_LEGACY_TC = {
  'AM': 'transporte', 'SA': 'transporte',
  'AP': 'mediciones', 'MD': 'mediciones',
  'COO': 'instrucciones',
  'CA': 'preparacion', 'AA': 'preparacion', 'CI': 'preparacion',
};
const MAPEO_LEGACY_TNC = {
  'ES': 'espera_material',
  'TR': 'retrabajo',
  'BA': 'descanso_no_prog', 'DE': 'descanso_no_prog',
  'CO': 'conversacion',
  'VI': 'traslado',
};

/**
 * Normaliza una subcategoría: si es código legacy lo mapea, si ya es ID nuevo lo devuelve tal cual.
 */
export function normalizarSubcategoria(subcategoria, categoria) {
  if (!subcategoria) return null;
  if (categoria === 'TC')  return MAPEO_LEGACY_TC[subcategoria]  || subcategoria;
  if (categoria === 'TNC') return MAPEO_LEGACY_TNC[subcategoria] || subcategoria;
  return subcategoria;
}

// ════════════════════════════════════════════════════════════════
// CÁLCULOS BÁSICOS
// ════════════════════════════════════════════════════════════════

/**
 * Calcula porcentajes TP/TC/TNC + LUF a partir de un array de observaciones.
 * @param {Array<{categoria: 'TP'|'TC'|'TNC', subcategoria?: string}>} observaciones
 * @returns {{tp, tc, tnc, total, luf, productividadTP}}
 */
export function calcularKPIs(observaciones) {
  if (!observaciones || observaciones.length === 0) {
    return { tp: 0, tc: 0, tnc: 0, total: 0, luf: 0, productividadTP: 0, n: 0 };
  }
  const total = observaciones.length;
  const tpN  = observaciones.filter(o => o.categoria === 'TP').length;
  const tcN  = observaciones.filter(o => o.categoria === 'TC').length;
  const tncN = observaciones.filter(o => o.categoria === 'TNC').length;

  const tp = (tpN / total) * 100;
  const tc = (tcN / total) * 100;
  const tnc = (tncN / total) * 100;
  // LUF (Labor Utilization Factor) = TP + 0.5 × TC
  const luf = tp + 0.5 * tc;

  return {
    tp: round(tp), tc: round(tc), tnc: round(tnc),
    luf: round(luf),
    productividadTP: round(tp),
    n: total,
    total,
  };
}

const round = (n) => Math.round(n * 10) / 10;

/**
 * Clasifica el LUF de una persona/cuadrilla según rangos estándar de la industria.
 */
export function clasificarLUF(luf) {
  if (luf >= 70) return { nivel: 'excelente', label: 'EXCELENTE', color: '#16a34a', emoji: '🟢' };
  if (luf >= 60) return { nivel: 'bueno',     label: 'BUENO',     color: '#65a30d', emoji: '🟢' };
  if (luf >= 50) return { nivel: 'aceptable', label: 'ACEPTABLE', color: '#f59e0b', emoji: '🟡' };
  if (luf >= 40) return { nivel: 'bajo',      label: 'BAJO',      color: '#ea580c', emoji: '🟠' };
  return                { nivel: 'critico',   label: 'CRÍTICO',   color: '#dc2626', emoji: '🔴' };
}

// ════════════════════════════════════════════════════════════════
// AGREGACIÓN POR PERSONA (Crew Balance Chart)
// ════════════════════════════════════════════════════════════════

/**
 * Toma una Carta Balance con observaciones por persona y devuelve un array de
 * objetos {personaId, nombre, kpis} ordenado por LUF descendente.
 * Es el insumo principal para el ranking individual.
 *
 * @param {{observaciones: Array<{personaId, categoria, subcategoria?}>, personas: Array<{id, nombre}>}} cb
 * @returns {Array<{personaId, nombre, kpis, observaciones}>}
 */
export function agruparPorPersona(cb) {
  if (!cb?.observaciones || !cb?.personas) return [];

  const porPersona = new Map();
  for (const p of cb.personas) {
    porPersona.set(p.id, { personaId: p.id, nombre: p.nombre || p.id, observaciones: [] });
  }
  for (const obs of cb.observaciones) {
    const slot = porPersona.get(obs.personaId);
    if (slot) slot.observaciones.push(obs);
  }

  return Array.from(porPersona.values())
    .map(p => ({ ...p, kpis: calcularKPIs(p.observaciones) }))
    .sort((a, b) => b.kpis.luf - a.kpis.luf);
}

// ════════════════════════════════════════════════════════════════
// PARETO DE CAUSAS DE TNC
// ════════════════════════════════════════════════════════════════

/**
 * Calcula el Pareto de razones de TNC: qué subcategorías acumulan
 * la mayor parte del tiempo perdido.
 *
 * @param {Array<{categoria, subcategoria}>} observaciones
 * @returns {Array<{subcategoria, label, count, porcentaje, acumulado, critico}>}
 */
export function paretoTNC(observaciones) {
  const tncObs = observaciones.filter(o => o.categoria === 'TNC');
  if (tncObs.length === 0) return [];

  const counts = new Map();
  for (const o of tncObs) {
    // Normalizar código legacy a subcategoría nueva
    const key = normalizarSubcategoria(o.subcategoria, 'TNC') || 'sin_clasificar';
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const total = tncObs.length;
  const filas = Array.from(counts.entries())
    .map(([subcategoria, count]) => {
      const meta = SUBCATEGORIAS_TNC.find(s => s.id === subcategoria);
      return {
        subcategoria,
        label:   meta?.label || subcategoria,
        icono:   meta?.icono || '❓',
        critico: meta?.critico ?? false,
        count,
        porcentaje: round((count / total) * 100),
      };
    })
    .sort((a, b) => b.count - a.count);

  // Acumulado (para detectar el 80/20)
  let acum = 0;
  for (const fila of filas) {
    acum += fila.porcentaje;
    fila.acumulado = round(acum);
  }
  return filas;
}

/**
 * Detecta si hay un patrón Pareto: ¿pocas causas explican >= 70% del TNC?
 * Devuelve las causas que acumulan ese 70%.
 */
export function causasCriticasTNC(pareto) {
  const criticas = [];
  let acum = 0;
  for (const fila of pareto) {
    criticas.push(fila);
    acum += fila.porcentaje;
    if (acum >= 70) break;
  }
  return criticas;
}

// ════════════════════════════════════════════════════════════════
// HISTORICO POR PERSONA (varias Cartas Balance)
// ════════════════════════════════════════════════════════════════

/**
 * Dado un array de Cartas Balance, calcula el desempeño histórico de cada persona.
 * Pondera por número de observaciones (más obs = más confianza).
 *
 * @returns {Array<{personaId, nombre, lufPromedio, tpPromedio, tncPromedio, sesiones, totalObs, score, confianza}>}
 */
export function rankingHistorico(cartasBalance) {
  if (!cartasBalance || cartasBalance.length === 0) return [];

  const porPersona = new Map();
  for (const cb of cartasBalance) {
    const grupos = agruparPorPersona(cb);
    for (const g of grupos) {
      if (g.kpis.n === 0) continue;
      const slot = porPersona.get(g.personaId) || {
        personaId: g.personaId,
        nombre: g.nombre,
        sesiones: [],
      };
      slot.sesiones.push({
        cbId:     cb.id,
        actividad: cb.actividad,
        fecha:    cb.fecha,
        kpis:     g.kpis,
      });
      porPersona.set(g.personaId, slot);
    }
  }

  return Array.from(porPersona.values()).map(p => {
    let totalObs = 0, sumTP = 0, sumTC = 0, sumTNC = 0;
    for (const s of p.sesiones) {
      totalObs += s.kpis.n;
      sumTP   += s.kpis.tp  * s.kpis.n;
      sumTC   += s.kpis.tc  * s.kpis.n;
      sumTNC  += s.kpis.tnc * s.kpis.n;
    }
    const tp  = totalObs > 0 ? sumTP / totalObs : 0;
    const tc  = totalObs > 0 ? sumTC / totalObs : 0;
    const tnc = totalObs > 0 ? sumTNC / totalObs : 0;
    const luf = tp + 0.5 * tc;

    // Score = LUF × √(n) — penaliza pocas observaciones
    const score = luf * Math.sqrt(Math.min(totalObs / 30, 3));
    // Confianza: 0-100 según cuánta data tenemos (>=90 obs = 100%)
    const confianza = round(Math.min((totalObs / 90) * 100, 100));

    return {
      personaId: p.personaId,
      nombre:    p.nombre,
      sesiones:  p.sesiones.length,
      totalObs,
      tpPromedio:  round(tp),
      tcPromedio:  round(tc),
      tncPromedio: round(tnc),
      lufPromedio: round(luf),
      score:       round(score),
      confianza,
      clasificacion: clasificarLUF(luf),
    };
  }).sort((a, b) => b.score - a.score);
}

// ════════════════════════════════════════════════════════════════
// DETECCIÓN DE PAREJAS PRODUCTIVAS / "DRAG" PERFORMERS
// ════════════════════════════════════════════════════════════════

/**
 * Detecta combinaciones de personas que históricamente trabajan bien juntas.
 * Una pareja es "productiva" si la cuadrilla con ambos tiene LUF mayor que
 * el promedio individual de cada uno.
 *
 * @returns {Array<{personaA, personaB, sesiones, lufJuntos, sinergia}>}
 */
export function parejasProductivas(cartasBalance, ranking) {
  const pares = new Map();
  const lufMap = new Map(ranking.map(r => [r.personaId, r.lufPromedio]));

  for (const cb of cartasBalance) {
    const grupos = agruparPorPersona(cb);
    if (grupos.length < 2) continue;

    const lufCB = grupos.reduce((sum, g) => sum + g.kpis.luf * g.kpis.n, 0) /
                  grupos.reduce((sum, g) => sum + g.kpis.n, 0);

    for (let i = 0; i < grupos.length; i++) {
      for (let j = i + 1; j < grupos.length; j++) {
        const a = grupos[i].personaId;
        const b = grupos[j].personaId;
        const key = [a, b].sort().join('|');
        const slot = pares.get(key) || {
          personaA: grupos[i].nombre,
          personaB: grupos[j].nombre,
          personaIdA: a,
          personaIdB: b,
          sesiones: 0,
          lufSesiones: [],
        };
        slot.sesiones++;
        slot.lufSesiones.push(lufCB);
        pares.set(key, slot);
      }
    }
  }

  return Array.from(pares.values())
    .filter(p => p.sesiones >= 2)  // mínimo 2 sesiones juntos para considerar
    .map(p => {
      const lufJuntos = p.lufSesiones.reduce((s, x) => s + x, 0) / p.lufSesiones.length;
      const lufA = lufMap.get(p.personaIdA) || 0;
      const lufB = lufMap.get(p.personaIdB) || 0;
      const lufIndividualPromedio = (lufA + lufB) / 2;
      const sinergia = lufJuntos - lufIndividualPromedio;
      return {
        personaA: p.personaA,
        personaB: p.personaB,
        personaIdA: p.personaIdA,
        personaIdB: p.personaIdB,
        sesiones: p.sesiones,
        lufJuntos: round(lufJuntos),
        lufIndividualPromedio: round(lufIndividualPromedio),
        sinergia: round(sinergia),
      };
    })
    .sort((a, b) => b.sinergia - a.sinergia);
}

// ════════════════════════════════════════════════════════════════
// OPTIMIZADOR DE CUADRILLAS
// ════════════════════════════════════════════════════════════════

/**
 * Sugiere una composición óptima de cuadrilla para una actividad,
 * basándose en datos históricos.
 *
 * Algoritmo:
 *   1. Filtra Cartas Balance históricas de la actividad objetivo
 *   2. Calcula LUF por persona EN ESA actividad específica
 *   3. Ordena descendente por score
 *   4. Toma top N donde N = tamaño objetivo
 *   5. Aplica boost por parejas productivas conocidas
 *   6. Identifica skills mix (senior + helpers)
 *
 * @param {string} actividad        Actividad objetivo (ej. "Encofrado de muros")
 * @param {number} tamanoObjetivo   Cantidad de personas deseada
 * @param {Array} cartasBalance     Historial completo
 * @param {Array} personalDB        Maestro de personal (con experiencia/oficio)
 * @returns {{recomendados, justificacion, alternativas, advertencias}}
 */
export function optimizarCuadrilla(actividad, tamanoObjetivo, cartasBalance, personalDB = []) {
  // 1. Filtrar Cartas Balance de esa actividad
  const cbActividad = cartasBalance.filter(cb =>
    (cb.actividad || '').toLowerCase().includes(actividad.toLowerCase())
  );

  if (cbActividad.length === 0) {
    return {
      recomendados: [],
      justificacion: `Sin datos históricos para "${actividad}". Realiza al menos 2-3 Cartas Balance de esta actividad para obtener recomendaciones.`,
      alternativas: [],
      advertencias: ['Sin historial de la actividad específica.'],
      datosInsuficientes: true,
    };
  }

  // 2. Ranking de personas EN esta actividad específica
  const ranking = rankingHistorico(cbActividad);
  const parejas = parejasProductivas(cbActividad, ranking);

  // 3. Diccionario de oficio/experiencia desde personalDB
  const personalMap = new Map(personalDB.map(p => [p.id || p.uid, p]));

  // 4. Greedy con boost por parejas
  const recomendados = [];
  const yaIncluidos = new Set();
  const advertencias = [];

  // 4a. Primero el mejor performer absoluto
  if (ranking.length > 0) {
    const mejor = ranking[0];
    recomendados.push({
      personaId: mejor.personaId,
      nombre:    mejor.nombre,
      luf:       mejor.lufPromedio,
      rol:       'líder',
      razon:     `Top performer en "${actividad}" (LUF ${mejor.lufPromedio}%, ${mejor.totalObs} observaciones).`,
      confianza: mejor.confianza,
    });
    yaIncluidos.add(mejor.personaId);
  }

  // 4b. Buscar pareja productiva del líder
  while (recomendados.length < tamanoObjetivo && yaIncluidos.size < ranking.length) {
    const ultimoIncluido = recomendados[recomendados.length - 1];

    // Buscar pareja productiva con el último incluido
    let mejorPareja = null;
    for (const pareja of parejas) {
      const otroId =
        pareja.personaIdA === ultimoIncluido.personaId ? pareja.personaIdB :
        pareja.personaIdB === ultimoIncluido.personaId ? pareja.personaIdA : null;
      if (otroId && !yaIncluidos.has(otroId) && pareja.sinergia > 0) {
        if (!mejorPareja || pareja.sinergia > mejorPareja.sinergia) {
          mejorPareja = { ...pareja, otroId };
        }
      }
    }

    if (mejorPareja) {
      const otroRank = ranking.find(r => r.personaId === mejorPareja.otroId);
      if (otroRank) {
        recomendados.push({
          personaId: mejorPareja.otroId,
          nombre: otroRank.nombre,
          luf: otroRank.lufPromedio,
          rol: 'pareja productiva',
          razon: `Sinergia +${mejorPareja.sinergia.toFixed(1)} con ${ultimoIncluido.nombre} en ${mejorPareja.sesiones} sesiones previas.`,
          confianza: otroRank.confianza,
        });
        yaIncluidos.add(mejorPareja.otroId);
        continue;
      }
    }

    // Si no hay pareja, tomar siguiente top performer
    const siguiente = ranking.find(r => !yaIncluidos.has(r.personaId));
    if (!siguiente) break;
    recomendados.push({
      personaId: siguiente.personaId,
      nombre:    siguiente.nombre,
      luf:       siguiente.lufPromedio,
      rol:       'top performer',
      razon:     `Top ${recomendados.length + 1} en "${actividad}" (LUF ${siguiente.lufPromedio}%).`,
      confianza: siguiente.confianza,
    });
    yaIncluidos.add(siguiente.personaId);
  }

  // 5. Calcular LUF estimado de la cuadrilla recomendada
  const lufEstimado = recomendados.length > 0
    ? recomendados.reduce((s, r) => s + r.luf, 0) / recomendados.length
    : 0;

  // 6. Alternativas (siguientes en el ranking)
  const alternativas = ranking
    .filter(r => !yaIncluidos.has(r.personaId))
    .slice(0, 5)
    .map(r => ({
      personaId: r.personaId,
      nombre: r.nombre,
      luf: r.lufPromedio,
      sesiones: r.sesiones,
    }));

  // 7. Advertencias
  if (recomendados.length < tamanoObjetivo) {
    advertencias.push(`Solo se encontraron ${recomendados.length} personas con historial en esta actividad (pediste ${tamanoObjetivo}).`);
  }
  for (const r of recomendados) {
    if (r.confianza < 50) {
      advertencias.push(`Confianza baja en ${r.nombre} (${r.confianza}%): pocos datos históricos.`);
    }
  }
  if (cbActividad.length < 3) {
    advertencias.push(`Solo hay ${cbActividad.length} Carta(s) Balance histórica(s) de esta actividad. Recomendaciones tienen baja confianza.`);
  }

  return {
    recomendados,
    lufEstimado: round(lufEstimado),
    clasificacionEstimada: clasificarLUF(lufEstimado),
    justificacion: `Cuadrilla recomendada de ${recomendados.length} personas con LUF estimado de ${round(lufEstimado)}% basado en ${cbActividad.length} medición(es) histórica(s) de "${actividad}".`,
    alternativas,
    advertencias,
    datosInsuficientes: false,
  };
}

// ════════════════════════════════════════════════════════════════
// DETECCIÓN DE PROBLEMAS PARA RECOMENDACIONES AUTOMÁTICAS
// ════════════════════════════════════════════════════════════════

/**
 * Genera recomendaciones automáticas a partir de los KPIs de una Carta Balance.
 * @returns {Array<{tipo, severidad, mensaje, accion}>}
 */
export function generarRecomendaciones(cb) {
  const recomendaciones = [];
  if (!cb?.observaciones?.length) return recomendaciones;

  const kpis = calcularKPIs(cb.observaciones);
  const pareto = paretoTNC(cb.observaciones);
  const porPersona = agruparPorPersona(cb);

  // 1. TNC alto agregado
  if (kpis.tnc > 30) {
    const causa = pareto[0];
    recomendaciones.push({
      tipo: 'tnc_alto',
      severidad: kpis.tnc > 40 ? 'alta' : 'media',
      titulo: `TNC del ${kpis.tnc}% es elevado`,
      mensaje: causa
        ? `La causa principal es "${causa.label}" con ${causa.porcentaje}% del tiempo perdido.`
        : `El TNC supera el umbral del 30%.`,
      accion: causa?.critico
        ? `Atacar urgentemente "${causa.label}". Esto requiere coordinación con logística/oficina técnica.`
        : `Revisar disciplina del frente de trabajo y la planificación de descansos.`,
    });
  }

  // 2. Personas con bajo LUF (drags)
  const lufPromedio = kpis.luf;
  for (const p of porPersona) {
    if (p.kpis.n >= 5 && p.kpis.luf < lufPromedio - 15) {
      recomendaciones.push({
        tipo: 'persona_bajo_rendimiento',
        severidad: 'media',
        titulo: `${p.nombre}: rendimiento por debajo del equipo`,
        mensaje: `LUF individual de ${p.nombre}: ${p.kpis.luf}% vs cuadrilla ${lufPromedio}%.`,
        accion: `Considerar: (a) reasignar a otra cuadrilla más afín, (b) entrenamiento o pareja con mentor, (c) verificar si hay causa específica (lesión, equipo defectuoso).`,
      });
    }
  }

  // 3. Causas críticas concentradas
  const criticas = causasCriticasTNC(pareto).filter(c => c.critico);
  if (criticas.length > 0) {
    recomendaciones.push({
      tipo: 'pareto_criticas',
      severidad: 'alta',
      titulo: `${criticas.length} causa(s) crítica(s) explican mayoría del TNC`,
      mensaje: criticas.map(c => `${c.icono} ${c.label} (${c.porcentaje}%)`).join(' · '),
      accion: `Estas son causas estructurales (no de los obreros). Requieren acción de planificación, logística o supervisión.`,
    });
  }

  // 4. TP excelente
  if (kpis.tp > 45) {
    recomendaciones.push({
      tipo: 'logro',
      severidad: 'positiva',
      titulo: `🎉 Trabajo productivo excepcional: ${kpis.tp}%`,
      mensaje: `Esta cuadrilla supera el promedio de la industria (~30%).`,
      accion: `Documentar buenas prácticas. Replicar esta composición en otras actividades similares.`,
    });
  }

  return recomendaciones;
}

// ════════════════════════════════════════════════════════════════
// VALIDACIÓN RETROSPECTIVA DEL MODELO (Bloque 18)
// ════════════════════════════════════════════════════════════════

/**
 * Valida el modelo del optimizador usando cross-validation leave-one-out.
 *
 * Para cada Carta Balance histórica N:
 *   1. Toma todas las cartas anteriores a N como "histórico"
 *   2. Simula: "si hubiera invocado optimizarCuadrilla con esa actividad
 *      y ese tamaño usando solo el histórico, ¿qué hubiera recomendado?"
 *   3. Compara con la cuadrilla real que ejecutó la actividad N:
 *      - delta_LUF = |luf_predicho - luf_real|
 *      - acierto_personas = % de personas recomendadas que efectivamente trabajaron
 *
 * @param {Array} cartasBalance — todas las cartas, ordenadas por fecha asc.
 * @returns {{
 *   validaciones: Array<{cbId, fecha, actividad, lufReal, lufPredicho, deltaLuf,
 *     personasReales, personasPredichas, aciertoPersonas, ...}>,
 *   metricas: {
 *     n: number,                       // cuántas validaciones se pudieron hacer
 *     precisionLUF: number,            // 100 - error% promedio normalizado
 *     deltaLufPromedio: number,        // delta absoluto promedio
 *     aciertoPersonasPromedio: number, // % promedio de aciertos en personas
 *     bias: number,                    // positivo = sobre-estima, negativo = sub-estima
 *     desviacionEstandar: number,      // dispersión del error
 *   }
 * }}
 */
export function validarModeloOptimizador(cartasBalance) {
  if (!cartasBalance || cartasBalance.length < 3) {
    return {
      validaciones: [],
      metricas: null,
      mensaje: 'Se necesitan al menos 3 Cartas Balance históricas para validar el modelo.',
    };
  }

  // Ordenar por fecha ascendente (los primeros entrenan, los últimos validan)
  const ordenadas = [...cartasBalance]
    .filter(cb => cb.fecha && cb.actividad && cb.observaciones?.length > 0)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const validaciones = [];

  for (let i = 1; i < ordenadas.length; i++) {
    const cbObjetivo = ordenadas[i];
    const historico = ordenadas.slice(0, i);

    // Verificar que tengamos al menos 1 carta previa con la misma actividad
    const previasMismaActividad = historico.filter(cb =>
      (cb.actividad || '').toLowerCase().includes((cbObjetivo.actividad || '').toLowerCase()) ||
      (cbObjetivo.actividad || '').toLowerCase().includes((cb.actividad || '').toLowerCase())
    );
    if (previasMismaActividad.length === 0) continue;

    // KPIs reales de la cuadrilla que ejecutó cbObjetivo
    const kpisReal = calcularKPIs(cbObjetivo.observaciones);
    const personasReales = (cbObjetivo.personas || []).map(p => p.nombre || p.id);
    const tamano = personasReales.length || 4;

    // Simular: ¿qué hubiera recomendado el optimizador?
    const recomendacion = optimizarCuadrilla(
      cbObjetivo.actividad,
      tamano,
      historico,
      []
    );

    if (recomendacion.datosInsuficientes) continue;

    const personasPredichas = recomendacion.recomendados.map(r => r.nombre);
    const lufPredicho = recomendacion.lufEstimado;

    // Delta y acierto
    const deltaLuf = Math.abs(lufPredicho - kpisReal.luf);
    const errorRelativo = kpisReal.luf > 0 ? (deltaLuf / kpisReal.luf) * 100 : 0;
    const sesgo = lufPredicho - kpisReal.luf;  // + = sobre-estima, - = sub-estima

    // ¿Cuántas de las personas recomendadas realmente trabajaron?
    const interseccion = personasPredichas.filter(p =>
      personasReales.some(r => r.toLowerCase() === p.toLowerCase())
    );
    const aciertoPersonas = personasPredichas.length > 0
      ? round((interseccion.length / personasPredichas.length) * 100)
      : 0;

    validaciones.push({
      cbId: cbObjetivo.id,
      fecha: cbObjetivo.fecha,
      actividad: cbObjetivo.actividad,
      lufReal: kpisReal.luf,
      lufPredicho,
      deltaLuf: round(deltaLuf),
      errorRelativo: round(errorRelativo),
      sesgo: round(sesgo),
      personasReales,
      personasPredichas,
      personasCoincidentes: interseccion.length,
      aciertoPersonas,
      previasUsadas: previasMismaActividad.length,
    });
  }

  if (validaciones.length === 0) {
    return {
      validaciones: [],
      metricas: null,
      mensaje: 'No hay suficientes datos repetidos en las mismas actividades para validar.',
    };
  }

  // Métricas agregadas
  const sumaDelta = validaciones.reduce((s, v) => s + v.deltaLuf, 0);
  const sumaSesgo = validaciones.reduce((s, v) => s + v.sesgo, 0);
  const sumaAcierto = validaciones.reduce((s, v) => s + v.aciertoPersonas, 0);
  const sumaErrorRel = validaciones.reduce((s, v) => s + v.errorRelativo, 0);

  const deltaLufPromedio = sumaDelta / validaciones.length;
  const sesgo = sumaSesgo / validaciones.length;
  const aciertoPersonasPromedio = sumaAcierto / validaciones.length;
  const errorRelativoPromedio = sumaErrorRel / validaciones.length;
  const precisionLUF = Math.max(0, 100 - errorRelativoPromedio);

  // Desviación estándar del error
  const mean = sumaDelta / validaciones.length;
  const varianza = validaciones.reduce((s, v) => s + Math.pow(v.deltaLuf - mean, 2), 0) / validaciones.length;
  const desviacionEstandar = Math.sqrt(varianza);

  return {
    validaciones,
    metricas: {
      n: validaciones.length,
      precisionLUF: round(precisionLUF),
      deltaLufPromedio: round(deltaLufPromedio),
      aciertoPersonasPromedio: round(aciertoPersonasPromedio),
      sesgo: round(sesgo),
      desviacionEstandar: round(desviacionEstandar),
      sesgoTipo: sesgo > 1 ? 'sobre-estima' : sesgo < -1 ? 'sub-estima' : 'neutral',
    },
    mensaje: null,
  };
}

/**
 * Helper: clasifica la precisión del modelo en categorías.
 */
export function clasificarPrecision(precisionLUF) {
  if (precisionLUF >= 85) return { nivel: 'excelente', label: 'EXCELENTE',  color: '#16a34a', emoji: '🎯' };
  if (precisionLUF >= 70) return { nivel: 'bueno',     label: 'BUENO',      color: '#65a30d', emoji: '✅' };
  if (precisionLUF >= 55) return { nivel: 'aceptable', label: 'ACEPTABLE',  color: '#f59e0b', emoji: '⚠️' };
  if (precisionLUF >= 40) return { nivel: 'bajo',      label: 'BAJO',       color: '#ea580c', emoji: '❌' };
  return                  { nivel: 'critico',   label: 'CRÍTICO',    color: '#dc2626', emoji: '🚨' };
}
