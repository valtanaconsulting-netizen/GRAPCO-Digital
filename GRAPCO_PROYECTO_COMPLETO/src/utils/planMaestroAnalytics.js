// src/utils/planMaestroAnalytics.js — Motor integrado del sistema (Bloque 21)
//
// Implementa:
//   1. Estructura WBS jerárquica (Last Planner System - Master Plan)
//   2. APUs teóricos y reales (4 categorías: MO, Mat, Eq, SC)
//   3. Resultado Operativo mensual (metodología Costos Perú)
//   4. EVM completo (PMI/PMBOK): PV, EV, AC, CPI, SPI, EAC, ETC, VAC
//   5. Identificación automática de partidas críticas
//   6. Curva S financiera (programada vs real)
//
// Estandar industrial usado por Cosapi, Graña, JJC, Aldesa.

// ════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════

export const CATEGORIAS_INSUMO = {
  MO:      { id: 'MO', label: 'Mano de Obra',   icono: '👷', color: '#7c3aed' },
  MAT:     { id: 'MAT', label: 'Materiales',     icono: '📦', color: '#f59e0b' },
  EQ:      { id: 'EQ', label: 'Equipos',         icono: '🚜', color: '#0d9488' },
  SC:      { id: 'SC', label: 'Subcontratos',    icono: '🤝', color: '#dc2626' },
};

export const CATEGORIAS_MO = [
  { id: 'CAPATAZ',  label: 'Capataz',  salarioBase: 28.00 },
  { id: 'OPERARIO', label: 'Operario', salarioBase: 22.50 },
  { id: 'OFICIAL',  label: 'Oficial',  salarioBase: 18.00 },
  { id: 'AYUDANTE', label: 'Ayudante', salarioBase: 15.00 },
];

// Factor de aportes legales Perú (CTS, vacaciones, ESSALUD, etc.) — usado en APUs.
export const FACTOR_APORTES_PE = 1.40;

// Costo-hora ÚNICO de mano de obra para el COSTO REAL del RO. Debe coincidir con
// helpers.COSTO_HORA_PROMEDIO (= 25.5). Toda la plataforma costea la MO a esta
// tarifa, NO por cargo (regla de gerencia; cuadra con la hoja CR del F06).
export const COSTO_HORA_RO = 25.5;

// Niveles WBS típicos en construcción civil peruana
export const NIVELES_WBS = [
  { nivel: 1, label: 'PARTIDA',     ejemplo: '02.00.00 ESTRUCTURAS' },
  { nivel: 2, label: 'SUB-PARTIDA', ejemplo: '02.01.00 CONCRETO ARMADO' },
  { nivel: 3, label: 'ACTIVIDAD',   ejemplo: '02.01.003 Vaciado columnas' },
];

export const ESTADOS_ACTIVIDAD = {
  no_iniciada:   { label: 'No iniciada',  color: '#94a3b8', icono: '⚪' },
  programada:    { label: 'Programada',   color: '#2563eb', icono: '🔵' },
  en_ejecucion:  { label: 'En ejecución', color: '#f59e0b', icono: '🟡' },
  completada:    { label: 'Completada',   color: '#16a34a', icono: '🟢' },
  suspendida:    { label: 'Suspendida',   color: '#dc2626', icono: '🔴' },
};

// ════════════════════════════════════════════════════════════════
// 1. ESTRUCTURA WBS — Jerarquía Plan Maestro
// ════════════════════════════════════════════════════════════════

/**
 * Construye un árbol jerárquico desde una lista plana de actividades.
 * Lee los códigos WBS (ej: "02.01.003") y arma la estructura tipo árbol.
 *
 * @param {Array} actividades - Lista plana del Plan Maestro
 * @returns {Array} - Árbol con nodos { codigo, nivel, hijos[], data }
 */
export function construirArbolWBS(actividades = []) {
  if (!actividades.length) return [];

  // Ordenar por código WBS naturalmente
  const ordenadas = [...actividades].sort((a, b) =>
    (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true })
  );

  const raiz = [];
  const nodosPorCodigo = new Map();

  for (const act of ordenadas) {
    if (!act.codigo) continue;
    const partes = act.codigo.split('.');
    const nivel = partes.length;

    const nodo = {
      ...act,
      nivel,
      hijos: [],
      esActividadHoja: false, // se calcula al final
    };
    nodosPorCodigo.set(act.codigo, nodo);

    // Buscar padre: código con un nivel menos
    if (partes.length > 1) {
      const codigoPadre = partes.slice(0, -1).join('.');
      const padre = nodosPorCodigo.get(codigoPadre);
      if (padre) {
        padre.hijos.push(nodo);
      } else {
        // No tiene padre registrado — va a raíz
        raiz.push(nodo);
      }
    } else {
      raiz.push(nodo);
    }
  }

  // Marcar nodos hoja (sin hijos = actividades reales que se ejecutan)
  const marcarHojas = (nodos) => {
    for (const n of nodos) {
      n.esActividadHoja = n.hijos.length === 0;
      if (n.hijos.length) marcarHojas(n.hijos);
    }
  };
  marcarHojas(raiz);

  return raiz;
}

/**
 * Aplana el árbol WBS a una lista (manteniendo orden y nivel)
 */
export function aplanarArbolWBS(arbol) {
  const lista = [];
  const recorrer = (nodos) => {
    for (const n of nodos) {
      lista.push(n);
      if (n.hijos?.length) recorrer(n.hijos);
    }
  };
  recorrer(arbol);
  return lista;
}

/**
 * Obtiene solo las actividades hoja (las que se ejecutan en obra)
 */
export function obtenerActividadesHoja(actividades = []) {
  const arbol = construirArbolWBS(actividades);
  return aplanarArbolWBS(arbol).filter(n => n.esActividadHoja);
}

/**
 * Calcula el resumen agregado de un nodo padre (suma de sus hijos)
 */
export function agregarPorNodoPadre(nodo) {
  if (!nodo.hijos?.length) return nodo;

  let presupuestoTotal = 0;
  let avanceMetradoAcum = 0;
  let metradoContractualTotal = 0;
  let costoRealAcum = 0;
  let hhAcumReal = 0;
  let hhTotalPresupuestado = 0;

  for (const hijo of nodo.hijos) {
    const agg = agregarPorNodoPadre(hijo);
    presupuestoTotal += (agg.metradoContractual || 0) * (agg.precioUnitario || 0);
    avanceMetradoAcum += agg.avanceMetradoAcum || 0;
    metradoContractualTotal += agg.metradoContractual || 0;
    costoRealAcum += agg.costoRealAcum || 0;
    hhAcumReal += agg.hhAcumReal || 0;
    hhTotalPresupuestado += agg.hhTotalPresupuestado || 0;
  }

  return {
    ...nodo,
    presupuestoTotal,
    avanceMetradoAcum,
    metradoContractualTotal,
    costoRealAcum,
    hhAcumReal,
    hhTotalPresupuestado,
  };
}

// ════════════════════════════════════════════════════════════════
// 2. APUs — Análisis de Precios Unitarios
// ════════════════════════════════════════════════════════════════

/**
 * Calcula el costo unitario teórico de un APU sumando sus 4 componentes.
 *
 * @param {Object} apu - { manoDeObra[], materiales[], equipos[], subcontratos[], rendimientoBase }
 * @returns {Object} - { subtotalMO, subtotalMat, subtotalEq, subtotalSC, costoUnitarioTotal }
 */
export function calcularCostoAPU(apu) {
  if (!apu) return null;

  // Mano de obra: cantidad * salarioHH * factorAportes / rendimientoBase
  // (rendimientoBase es metrado por día de cuadrilla; se convierte a HH/unidad)
  const subtotalMO = (apu.manoDeObra || []).reduce((sum, m) => {
    const aportes = m.aportes || FACTOR_APORTES_PE;
    return sum + (m.cantidad || 0) * (m.salarioHH || 0) * aportes;
  }, 0);

  // Materiales: cantidad * precio
  const subtotalMat = (apu.materiales || []).reduce((sum, m) => {
    return sum + (m.cantidad || 0) * (m.precio || 0);
  }, 0);

  // Equipos: hm * tarifa
  const subtotalEq = (apu.equipos || []).reduce((sum, e) => {
    return sum + (e.hm || 0) * (e.tarifa || 0);
  }, 0);

  // Subcontratos: subtotal directo
  const subtotalSC = (apu.subcontratos || []).reduce((sum, s) => {
    return sum + (s.subtotal || 0);
  }, 0);

  const costoUnitarioTotal = subtotalMO + subtotalMat + subtotalEq + subtotalSC;

  return {
    subtotalMO: redondear(subtotalMO),
    subtotalMat: redondear(subtotalMat),
    subtotalEq: redondear(subtotalEq),
    subtotalSC: redondear(subtotalSC),
    costoUnitarioTotal: redondear(costoUnitarioTotal),
    incidenciaMO: costoUnitarioTotal > 0 ? redondear((subtotalMO / costoUnitarioTotal) * 100, 2) : 0,
    incidenciaMat: costoUnitarioTotal > 0 ? redondear((subtotalMat / costoUnitarioTotal) * 100, 2) : 0,
    incidenciaEq: costoUnitarioTotal > 0 ? redondear((subtotalEq / costoUnitarioTotal) * 100, 2) : 0,
    incidenciaSC: costoUnitarioTotal > 0 ? redondear((subtotalSC / costoUnitarioTotal) * 100, 2) : 0,
  };
}

/**
 * Recalcula un APU con datos REALES de obra (Kardex + Tareos).
 * Permite comparar APU teórico vs APU real para detectar desviaciones.
 *
 * @param {Object} apuTeorico - APU original
 * @param {Object} datosReales - { rendimientoReal, preciosMatReales: Map, ... }
 * @returns {Object} - APU recalculado con costos reales
 */
export function recalcularAPUReal(apuTeorico, datosReales = {}) {
  if (!apuTeorico) return null;

  const { rendimientoReal, preciosMatReales = new Map(), salariosReales = new Map() } = datosReales;

  // MO: si tenemos rendimiento real, recalculamos. Sino usamos el teórico.
  let subtotalMO_real = apuTeorico.subtotalMO || 0;
  if (rendimientoReal && apuTeorico.rendimientoBase && rendimientoReal > 0) {
    // Si productividad bajó (rendimiento real < teórico), MO sube proporcionalmente
    const factorRendimiento = apuTeorico.rendimientoBase / rendimientoReal;
    subtotalMO_real = (apuTeorico.subtotalMO || 0) * factorRendimiento;
  }

  // Aplicar salarios reales si están disponibles
  if (salariosReales.size > 0 && (apuTeorico.manoDeObra || []).length > 0) {
    let nuevoMO = 0;
    for (const m of apuTeorico.manoDeObra) {
      const salarioReal = salariosReales.get(m.categoria) || m.salarioHH;
      const aportes = m.aportes || FACTOR_APORTES_PE;
      nuevoMO += (m.cantidad || 0) * salarioReal * aportes;
    }
    if (rendimientoReal && apuTeorico.rendimientoBase) {
      nuevoMO *= (apuTeorico.rendimientoBase / rendimientoReal);
    }
    subtotalMO_real = nuevoMO;
  }

  // Materiales: usar precios reales del Kardex (costo promedio ponderado)
  const materialesReales = (apuTeorico.materiales || []).map(m => {
    const precioReal = preciosMatReales.get(m.materialId) || m.precio;
    return {
      ...m,
      precioReal,
      subtotalReal: (m.cantidad || 0) * precioReal,
    };
  });
  const subtotalMat_real = materialesReales.reduce((s, m) => s + m.subtotalReal, 0);

  // Equipos: por defecto se mantienen (futuro: integrar partes diarios)
  const subtotalEq_real = apuTeorico.subtotalEq || 0;

  // SC: por defecto se mantiene
  const subtotalSC_real = apuTeorico.subtotalSC || 0;

  const costoUnitarioReal = subtotalMO_real + subtotalMat_real + subtotalEq_real + subtotalSC_real;
  const costoUnitarioTeorico = apuTeorico.costoUnitarioTotal || 0;
  const deltaAbs = costoUnitarioReal - costoUnitarioTeorico;
  const deltaPct = costoUnitarioTeorico > 0 ? (deltaAbs / costoUnitarioTeorico) * 100 : 0;

  return {
    subtotalMO_real: redondear(subtotalMO_real),
    subtotalMat_real: redondear(subtotalMat_real),
    subtotalEq_real: redondear(subtotalEq_real),
    subtotalSC_real: redondear(subtotalSC_real),
    costoUnitarioReal: redondear(costoUnitarioReal),
    deltaAbs: redondear(deltaAbs),
    deltaPct: redondear(deltaPct),
    materialesReales,
    rendimientoUsado: rendimientoReal || apuTeorico.rendimientoBase,
    severidad: Math.abs(deltaPct) <= 5 ? 'ok' :
               Math.abs(deltaPct) <= 10 ? 'media' :
               deltaPct > 0 ? 'alta' : 'positiva',
  };
}

// ════════════════════════════════════════════════════════════════
// 3. CÁLCULO DE COSTO REAL POR ACTIVIDAD
//    Cruza Tareos + Kardex + Subcontratos con la actividad WBS
// ════════════════════════════════════════════════════════════════

export function calcularCostoRealActividad({
  codigoWBS, tareos = [], kardexMovimientos = [],
  facturas = [], valorizacionesSC = [],
  salariosPorCategoria = new Map(),   // legacy: el costo real usa el costo-hora único
}) {
  if (!codigoWBS) return null;
  // Coincide la partida por cualquiera de los campos de enlace al Catálogo WBS.
  const esDeEstaPartida = (x) => x?.partida === codigoWBS || x?.codigoWBS === codigoWBS || x?.actividad === codigoWBS;

  // 1. Costo MO — Tareos × costo-hora ÚNICO (S/25.5). Cuadra con "CONTROL TAREOS"
  //    de la hoja CR del F06. No se usa tarifa por cargo.
  let costoMO = 0;
  let hhAcum = 0;
  for (const t of tareos) {
    if (!esDeEstaPartida(t)) continue;
    const hh = t.horasHombre || t.hh || 0;
    costoMO += hh * COSTO_HORA_RO;
    hhAcum += hh;
  }

  // 2. Costo Materiales — salidas de Kardex / Registro de Almacén a esta partida.
  let costoMat = 0;
  for (const m of kardexMovimientos) {
    if (m.tipo !== 'SALIDA') continue;
    if (m.partidaDestino !== codigoWBS && m.actividadDestino !== codigoWBS) continue;
    if (m.estado === 'anulado') continue;
    costoMat += m.costoTotal || (m.cantidad * (m.costoUnitario || 0));
  }

  // 3. Facturas — subcontratos/proveedores devengados (sin IGV) a esta partida.
  let costoFacturas = 0;
  for (const f of facturas) {
    if (!esDeEstaPartida(f) || f.estado === 'anulado') continue;
    costoFacturas += Number(f.montoSinIGV ?? f.costoDirecto ?? f.monto ?? 0) || 0;
  }

  // 4. Subcontratos valorizados (F10) a esta partida/categoría.
  let costoSC = 0;
  for (const v of valorizacionesSC) {
    if (!esDeEstaPartida(v) || v.estado === 'anulado') continue;
    costoSC += Number(v.cdValorizado ?? v.montoSinIGV ?? v.monto ?? 0) || 0;
  }

  const costoEq = 0; // equipos: fase siguiente
  const costoTotal = costoMO + costoMat + costoFacturas + costoSC + costoEq;

  return {
    costoMO: redondear(costoMO),
    costoMat: redondear(costoMat),
    costoFacturas: redondear(costoFacturas),
    costoSC: redondear(costoSC),
    costoEq: redondear(costoEq),
    costoTotal: redondear(costoTotal),
    hhAcum: redondear(hhAcum, 2),
  };
}

// ════════════════════════════════════════════════════════════════
// 4. EVM — Earned Value Management (PMI/PMBOK estándar)
// ════════════════════════════════════════════════════════════════

/**
 * Calcula los indicadores EVM completos de una actividad o conjunto.
 *
 * @param {Object} args
 * @param {number} args.metradoContractual - cantidad total contratada
 * @param {number} args.precioUnitario - PU de la partida
 * @param {number} args.avanceMetradoAcum - cuánto se ha ejecutado realmente
 * @param {number} args.costoRealAcum - costo real acumulado (AC)
 * @param {Date} args.fechaInicioProgramada
 * @param {Date} args.fechaFinProgramada
 * @param {Date} args.fechaActual
 *
 * @returns {Object} - PV, EV, AC, CPI, SPI, EAC, ETC, VAC + interpretaciones
 */
export function calcularEVM({
  metradoContractual = 0, precioUnitario = 0,
  avanceMetradoAcum = 0, costoRealAcum = 0,
  evValorizado = null,   // EV REAL valorizado al cliente (si existe, manda sobre avance×PU)
  fechaInicioProgramada = null, fechaFinProgramada = null, fechaActual = new Date(),
}) {
  const BAC = metradoContractual * precioUnitario; // Budget at Completion
  // Earned Value: si hay valorización real al cliente para la partida, esa es la
  // venta ganada (EV); si no, se aproxima con avance físico × PU.
  const EV = (evValorizado != null && Number.isFinite(evValorizado)) ? evValorizado : avanceMetradoAcum * precioUnitario;
  const AC = costoRealAcum;                          // Actual Cost

  // Calcular PV (Planned Value) según fechas programadas
  let PV = 0;
  if (fechaInicioProgramada && fechaFinProgramada && fechaActual) {
    const ini = new Date(fechaInicioProgramada);
    const fin = new Date(fechaFinProgramada);
    const ahora = new Date(fechaActual);

    if (ahora >= fin) {
      PV = BAC; // ya debería estar terminado
    } else if (ahora <= ini) {
      PV = 0; // todavía no debería haber empezado
    } else {
      const total = fin.getTime() - ini.getTime();
      const transcurrido = ahora.getTime() - ini.getTime();
      PV = BAC * (transcurrido / total);
    }
  } else {
    // Sin fechas, asumimos PV = BAC * (avance teórico desde inicio del proyecto)
    PV = BAC; // proxy
  }

  // Indicadores
  const CPI = AC > 0 ? EV / AC : 0;
  const SPI = PV > 0 ? EV / PV : 0;
  const CV = EV - AC;  // Cost Variance
  const SV = EV - PV;  // Schedule Variance

  // Proyecciones
  const EAC = CPI > 0 ? BAC / CPI : BAC; // Estimate at Completion
  const ETC = EAC - AC;                    // Estimate to Complete
  const VAC = BAC - EAC;                   // Variance at Completion
  const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 0; // To-Complete Performance Index

  // Avance %
  const pctAvanceFisico = metradoContractual > 0 ? (avanceMetradoAcum / metradoContractual) * 100 : 0;
  const pctAvanceCronograma = BAC > 0 ? (PV / BAC) * 100 : 0;

  // Interpretaciones
  let interpretacionCPI = '';
  if (CPI === 0) interpretacionCPI = 'Sin datos suficientes';
  else if (CPI > 1.05) interpretacionCPI = `✅ Por debajo del presupuesto (${redondear((CPI - 1) * 100, 1)}% mejor)`;
  else if (CPI >= 0.95) interpretacionCPI = '✓ Conforme al presupuesto';
  else if (CPI >= 0.85) interpretacionCPI = `⚠️ Sobrecosto leve (${redondear((1 - CPI) * 100, 1)}%)`;
  else interpretacionCPI = `🔴 Sobrecosto crítico (${redondear((1 - CPI) * 100, 1)}%)`;

  let interpretacionSPI = '';
  if (SPI === 0) interpretacionSPI = 'Sin datos suficientes';
  else if (SPI > 1.05) interpretacionSPI = `✅ Adelantado (${redondear((SPI - 1) * 100, 1)}%)`;
  else if (SPI >= 0.95) interpretacionSPI = '✓ Conforme al cronograma';
  else if (SPI >= 0.85) interpretacionSPI = `⚠️ Atraso leve (${redondear((1 - SPI) * 100, 1)}%)`;
  else interpretacionSPI = `🔴 Atraso crítico (${redondear((1 - SPI) * 100, 1)}%)`;

  return {
    BAC: redondear(BAC),
    PV: redondear(PV),
    EV: redondear(EV),
    AC: redondear(AC),
    CPI: redondear(CPI, 3),
    SPI: redondear(SPI, 3),
    CV: redondear(CV),
    SV: redondear(SV),
    EAC: redondear(EAC),
    ETC: redondear(ETC),
    VAC: redondear(VAC),
    TCPI: redondear(TCPI, 3),
    pctAvanceFisico: redondear(pctAvanceFisico, 2),
    pctAvanceCronograma: redondear(pctAvanceCronograma, 2),
    interpretacionCPI,
    interpretacionSPI,
  };
}

// ════════════════════════════════════════════════════════════════
// 5. RESULTADO OPERATIVO MENSUAL
// ════════════════════════════════════════════════════════════════

/**
 * Genera el RO completo de un mes.
 * Cruza: Plan Maestro + APUs + Tareos + Kardex + Valorizaciones.
 *
 * Implementa los 4 conceptos clave de la metodología Costos Perú:
 *   - Vendido (lo facturado al cliente = EV en EVM)
 *   - Costo Aplicado (avance real × costo APU teórico)
 *   - Costo Real (AC en EVM)
 *   - Resultado Pendiente (análisis combinado)
 */
export function calcularROMensual({
  actividades = [],          // Plan Maestro
  apus = [],                 // APUs por actividad
  tareos = [],               // Tareos del mes
  kardexMovimientos = [],    // Movimientos materiales
  valorizaciones = [],       // Valorizaciones contractuales (cliente → EV)
  facturas = [],             // Registro de Facturas (subcontratos/proveedores → AC)
  valorizacionesSC = [],     // Valorizaciones a subcontratistas F10 (→ AC)
  gastosGenerales = [],      // GG Oficina (→ AC, sección aparte; fase siguiente)
  salariosPorCategoria = new Map(),
  fechaActual = new Date(),
  margenMeta = 15,           // % margen meta del proyecto
}) {

  const apuMap = new Map(apus.map(a => [a.codigo || a.actividadId, a]));

  // EV REAL: acumular lo valorizado al cliente por código de partida desde
  // ValorizacionesContractuales (cada valorización lista sus partidasValorizadas).
  // Si una partida tiene valorizado real, ese monto es su EV; si no, cae a avance×PU.
  const valorizadoPorPartida = new Map();
  for (const v of valorizaciones) {
    if (v?.estado === 'anulada') continue;
    const items = v?.partidasValorizadas || v?.partidas || [];
    for (const it of items) {
      const cod = it.codigo || it.codigoWBS || it.partida;
      if (!cod) continue;
      const monto = Number(it.montoBruto ?? it.monto ?? it.valorizado ?? 0) || 0;
      valorizadoPorPartida.set(cod, (valorizadoPorPartida.get(cod) || 0) + monto);
    }
  }
  const hayValorizacionReal = valorizadoPorPartida.size > 0;

  // Filtrar solo actividades hoja
  const actividadesHoja = obtenerActividadesHoja(actividades);

  // Por cada actividad, calcular indicadores
  const detallePartidas = actividadesHoja.map(act => {
    const codigoWBS = act.codigo;
    const apuKey = `APU-${codigoWBS}`;
    const apu = apuMap.get(codigoWBS) || apuMap.get(apuKey) || apuMap.get(act.apuId);

    const metradoContractual = act.metradoContractual || 0;
    const precioUnitario = act.precioUnitario || 0;
    const avanceMetradoAcum = act.avanceMetradoAcum || 0;

    // Costo real (AC)
    const costoReal = calcularCostoRealActividad({
      codigoWBS,
      tareos,
      kardexMovimientos,
      facturas,
      valorizacionesSC,
      salariosPorCategoria,
    });

    // EVM — usa el EV valorizado real si la partida fue valorizada al cliente.
    const evValorizado = valorizadoPorPartida.has(codigoWBS) ? valorizadoPorPartida.get(codigoWBS) : null;
    const evm = calcularEVM({
      metradoContractual, precioUnitario,
      avanceMetradoAcum,
      costoRealAcum: costoReal.costoTotal,
      evValorizado,
      fechaInicioProgramada: act.fechaInicioProgramada,
      fechaFinProgramada: act.fechaFinProgramada,
      fechaActual,
    });

    // Costo Aplicado (lo que DEBERÍA costar según APU teórico)
    const costoUnitarioTeorico = apu?.costoUnitarioTotal || 0;
    const costoAplicado = avanceMetradoAcum * costoUnitarioTeorico;

    // Vendido (EV — lo valorizado al cliente para esta partida)
    const vendido = evm.EV;

    // Margenes
    const margenAplicado = vendido > 0 ? ((vendido - costoAplicado) / vendido) * 100 : 0;
    const margenReal = vendido > 0 ? ((vendido - costoReal.costoTotal) / vendido) * 100 : 0;

    // Resultado pendiente (saldo por ejecutar)
    const metradoSaldo = metradoContractual - avanceMetradoAcum;
    const ventaSaldo = metradoSaldo * precioUnitario;
    const costoSaldoTeorico = metradoSaldo * costoUnitarioTeorico;
    const margenSaldoTeorico = ventaSaldo - costoSaldoTeorico;

    // Severidad
    let severidad = 'ok';
    if (margenReal < 0) severidad = 'critica';
    else if (margenReal < margenMeta * 0.5) severidad = 'alta';
    else if (margenReal < margenMeta) severidad = 'media';

    return {
      codigo: codigoWBS,
      descripcion: act.descripcion,
      unidad: act.unidad,
      metradoContractual,
      precioUnitario,
      avanceMetradoAcum,
      pctAvance: evm.pctAvanceFisico,
      // Vendido / Aplicado / Real
      vendido: redondear(vendido),
      costoAplicado: redondear(costoAplicado),
      costoReal: costoReal.costoTotal,
      costoMORealAct: costoReal.costoMO,
      costoMatRealAct: costoReal.costoMat,
      // Márgenes
      margenAplicado: redondear(margenAplicado, 2),
      margenReal: redondear(margenReal, 2),
      // Resultado pendiente
      metradoSaldo: redondear(metradoSaldo, 2),
      ventaSaldo: redondear(ventaSaldo),
      margenSaldoTeorico: redondear(margenSaldoTeorico),
      // EVM
      ...evm,
      // Diagnóstico
      severidad,
      tieneAPU: !!apu,
    };
  });

  // Totalizar
  const totales = detallePartidas.reduce((acc, p) => ({
    BAC: acc.BAC + p.BAC,
    PV: acc.PV + p.PV,
    EV: acc.EV + p.EV,
    AC: acc.AC + p.AC,
    vendido: acc.vendido + p.vendido,
    costoAplicado: acc.costoAplicado + p.costoAplicado,
    costoReal: acc.costoReal + p.costoReal,
    ventaSaldo: acc.ventaSaldo + p.ventaSaldo,
  }), { BAC: 0, PV: 0, EV: 0, AC: 0, vendido: 0, costoAplicado: 0, costoReal: 0, ventaSaldo: 0 });

  // Gastos Generales de oficina (sección aparte del F06: NO se imputan a una
  // partida; se suman al Total Costo de Obra). El motor solo los totaliza aquí.
  const ggItems = gastosGenerales.filter(g => g?.estado !== 'anulado');
  const ggTotal = ggItems.reduce((s, g) => s + (Number(g.monto ?? g.costo ?? g.importe ?? 0) || 0), 0);

  // KPIs globales (COSTO DIRECTO — por partidas, sin GG; retro-compatible)
  const CPI_global = totales.AC > 0 ? totales.EV / totales.AC : 0;
  const SPI_global = totales.PV > 0 ? totales.EV / totales.PV : 0;
  const EAC_global = CPI_global > 0 ? totales.BAC / CPI_global : totales.BAC;
  const VAC_global = totales.BAC - EAC_global;
  const margenAplicadoGlobal = totales.vendido > 0 ? ((totales.vendido - totales.costoAplicado) / totales.vendido) * 100 : 0;
  const margenRealGlobal = totales.vendido > 0 ? ((totales.vendido - totales.costoReal) / totales.vendido) * 100 : 0;
  const margenProyectadoCierre = totales.BAC > 0 ? (VAC_global / totales.BAC) * 100 : 0;

  // KPIs CON GG (Total Costo de Obra = Costo Directo + Gastos Generales).
  // Es el "resultado operativo" completo del F06: AC y CPI incluyen GG.
  const acConGG = totales.AC + ggTotal;
  const cpiConGG = acConGG > 0 ? totales.EV / acConGG : 0;
  const eacConGG = cpiConGG > 0 ? totales.BAC / cpiConGG : totales.BAC;
  const margenRealConGG = totales.vendido > 0 ? ((totales.vendido - (totales.costoReal + ggTotal)) / totales.vendido) * 100 : 0;

  // Identificar partidas críticas
  const partidasCriticas = detallePartidas
    .filter(p => p.severidad === 'critica' || p.severidad === 'alta')
    .sort((a, b) => (a.margenReal || 0) - (b.margenReal || 0))
    .slice(0, 10);

  // Partidas estrella (mayor aporte al margen)
  const partidasEstrella = detallePartidas
    .filter(p => p.margenReal > margenMeta)
    .sort((a, b) => ((b.vendido || 0) * (b.margenReal || 0)) - ((a.vendido || 0) * (a.margenReal || 0)))
    .slice(0, 5);

  return {
    detallePartidas,
    totales: {
      ...totales,
      BAC: redondear(totales.BAC),
      PV: redondear(totales.PV),
      EV: redondear(totales.EV),
      AC: redondear(totales.AC),
      vendido: redondear(totales.vendido),
      costoAplicado: redondear(totales.costoAplicado),
      costoReal: redondear(totales.costoReal),
      ventaSaldo: redondear(totales.ventaSaldo),
    },
    indicadoresGlobales: {
      CPI: redondear(CPI_global, 3),
      SPI: redondear(SPI_global, 3),
      EAC: redondear(EAC_global),
      VAC: redondear(VAC_global),
      margenAplicado: redondear(margenAplicadoGlobal, 2),
      margenReal: redondear(margenRealGlobal, 2),
      margenProyectadoCierre: redondear(margenProyectadoCierre, 2),
      margenMeta,
      pctAvanceFisico: totales.BAC > 0 ? redondear((totales.EV / totales.BAC) * 100, 2) : 0,
    },
    // Gastos Generales (sección aparte) + roll-up del Total Costo de Obra con GG.
    gastosGenerales: {
      total: redondear(ggTotal),
      items: ggItems,
      // Total Costo de Obra = Costo Directo + GG, con sus indicadores ya con GG.
      acConGG: redondear(acConGG),
      costoRealConGG: redondear(totales.costoReal + ggTotal),
      CPI: redondear(cpiConGG, 3),
      EAC: redondear(eacConGG),
      VAC: redondear(totales.BAC - eacConGG),
      margenReal: redondear(margenRealConGG, 2),
    },
    partidasCriticas,
    partidasEstrella,
    evReal: hayValorizacionReal,   // true si el EV viene de valorizaciones al cliente
    fechaCalculo: fechaActual,
  };
}

// ════════════════════════════════════════════════════════════════
// 6. CURVA S FINANCIERA (Programada vs Real)
// ════════════════════════════════════════════════════════════════

export function calcularCurvaS({ actividades = [], historial = [], fechaInicio, fechaFin, granularidad = 'mensual' }) {
  if (!fechaInicio || !fechaFin) return null;

  const ini = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  // Generar puntos del eje X según granularidad
  const puntos = [];
  let cursor = new Date(ini);
  while (cursor <= fin) {
    puntos.push(new Date(cursor));
    if (granularidad === 'semanal') cursor.setDate(cursor.getDate() + 7);
    else if (granularidad === 'mensual') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }

  const actividadesHoja = obtenerActividadesHoja(actividades);

  // Curva S Programada (PV acumulado en el tiempo)
  const curvaProgramada = puntos.map(p => {
    let pvAcum = 0;
    for (const act of actividadesHoja) {
      const PU = act.precioUnitario || 0;
      const metrado = act.metradoContractual || 0;
      const BAC = PU * metrado;
      const iniAct = act.fechaInicioProgramada ? new Date(act.fechaInicioProgramada) : null;
      const finAct = act.fechaFinProgramada ? new Date(act.fechaFinProgramada) : null;

      if (!iniAct || !finAct) continue;
      if (p < iniAct) continue;
      if (p >= finAct) { pvAcum += BAC; continue; }
      const total = finAct - iniAct;
      const trans = p - iniAct;
      pvAcum += BAC * (trans / total);
    }
    return { fecha: p, valor: redondear(pvAcum) };
  });

  // Curva S Real (EV acumulado desde Historial)
  const curvaReal = puntos.map(p => {
    let evAcum = 0;
    for (const act of actividadesHoja) {
      const PU = act.precioUnitario || 0;
      const metradoEjecutadoHasta = (historial || []).filter(h => {
        if (h.partida !== act.codigo && h.actividad !== act.codigo) return false;
        const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha);
        return f <= p;
      }).reduce((s, h) => s + (h.metrado || 0), 0);
      evAcum += metradoEjecutadoHasta * PU;
    }
    return { fecha: p, valor: redondear(evAcum) };
  });

  return { curvaProgramada, curvaReal, puntos };
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

const redondear = (n, dec = 2) => {
  if (n == null || isNaN(n)) return 0;
  return Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
};

export const fmtSoles = (n) => {
  if (n == null || isNaN(n)) return 'S/. —';
  return 'S/. ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtNumero = (n, dec = 2) => {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

export const fmtPct = (n, dec = 1) => {
  if (n == null || isNaN(n)) return '—';
  return `${redondear(n, dec)}%`;
};

export const colorMargen = (margen, meta = 15) => {
  if (margen == null) return '#94a3b8';
  if (margen < 0) return '#dc2626';
  if (margen < meta * 0.5) return '#ea580c';
  if (margen < meta) return '#f59e0b';
  return '#16a34a';
};

export const colorCPI = (cpi) => {
  if (cpi === 0) return '#94a3b8';
  if (cpi < 0.85) return '#dc2626';
  if (cpi < 0.95) return '#f59e0b';
  if (cpi <= 1.05) return '#16a34a';
  return '#0d9488';
};
