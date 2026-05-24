// src/utils/materialesAnalytics.js — Motor de analitica del modulo Materiales (Bloque 19)
//
// Funciones principales:
//   - calcularStockActual(movimientos)     → stock por almacen+material
//   - valorizarStock(stock, materiales)    → valor en S/.
//   - costoPromedioPonderado(movs)         → CPP por material
//   - reconciliarAPU(consumoReal, teorico) → delta% vs merma estandar
//   - kardexPorMaterial(movs, materialId)  → linea de tiempo de un material
//   - alertasStockBajo(stock, materiales)  → lista de alertas
//   - analizarABC(materiales, movs)        → clasificacion ABC por costo
//   - rotacionStock(movs, periodo)         → veces que rota el inventario

// ════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════

export const TIPOS_MOVIMIENTO = {
  ENTRADA:    { label: 'Entrada',      icono: '⬇️', color: '#16a34a', signo: +1 },
  SALIDA:     { label: 'Salida',       icono: '⬆️', color: '#dc2626', signo: -1 },
  TRASLADO:   { label: 'Traslado',     icono: '🔄', color: '#2563eb', signo:  0 },
  AJUSTE:     { label: 'Ajuste',       icono: '⚙️', color: '#f59e0b', signo:  0 },
  DEVOLUCION: { label: 'Devolución',   icono: '↩️', color: '#7c3aed', signo: +1 },
};

export const CATEGORIAS_MATERIAL = [
  { id: 'CEMENTO',    label: 'Cemento',          icono: '🧱', mermaDefault: 5 },
  { id: 'ACERO',      label: 'Acero',            icono: '🔩', mermaDefault: 3 },
  { id: 'AGREGADO',   label: 'Agregados',        icono: '🪨', mermaDefault: 8 },
  { id: 'CONCRETO',   label: 'Concreto premix',  icono: '🚛', mermaDefault: 3 },
  { id: 'ENCOFRADO',  label: 'Encofrado',        icono: '📐', mermaDefault: 2 },
  { id: 'IIEE',       label: 'Inst. Eléctricas', icono: '⚡', mermaDefault: 4 },
  { id: 'IIS',        label: 'Inst. Sanitarias', icono: '🚰', mermaDefault: 4 },
  { id: 'EPP',        label: 'EPP',              icono: '🦺', mermaDefault: 0 },
  { id: 'EQUIPO',     label: 'Equipos/Herram.',  icono: '🔧', mermaDefault: 0 },
  { id: 'COMBUSTIBLE',label: 'Combustible',      icono: '⛽', mermaDefault: 2 },
  { id: 'CONSUMIBLE', label: 'Consumibles',      icono: '🛠️', mermaDefault: 5 },
  { id: 'OTRO',       label: 'Otro',             icono: '📦', mermaDefault: 5 },
];

export const UNIDADES_MEDIDA = [
  { id: 'BOL', label: 'Bolsa' },
  { id: 'KG',  label: 'Kilogramo' },
  { id: 'TN',  label: 'Tonelada' },
  { id: 'M3',  label: 'Metro cubico' },
  { id: 'M2',  label: 'Metro cuadrado' },
  { id: 'ML',  label: 'Metro lineal' },
  { id: 'UND', label: 'Unidad' },
  { id: 'GLN', label: 'Galon' },
  { id: 'L',   label: 'Litro' },
  { id: 'PAR', label: 'Par' },
  { id: 'JGO', label: 'Juego' },
  { id: 'PQT', label: 'Paquete' },
];

export const MERMA_DEFAULT_PCT = 5;

// ════════════════════════════════════════════════════════════════
// HELPERS BASE
// ════════════════════════════════════════════════════════════════

const round = (n, dec = 2) => Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);

const sumBy = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0);

// ════════════════════════════════════════════════════════════════
// CALCULAR STOCK ACTUAL
// ════════════════════════════════════════════════════════════════

/**
 * Calcula el stock actual por almacen+material a partir del kardex completo.
 *
 * @param {Array} movimientos - Lista de movimientos de Kardex
 * @returns {Map<string, {almacenId, materialId, cantidad, valor, costoPromedio}>}
 *          Key: "almacenId_materialId"
 */
export function calcularStockActual(movimientos) {
  const stock = new Map();

  // Ordenar movs por fecha asc (importante para costo promedio ponderado)
  const ordenados = [...(movimientos || [])]
    .filter(m => m.estado !== 'anulado')
    .sort((a, b) => {
      const fa = a.fecha?.toDate ? a.fecha.toDate().getTime() : new Date(a.fecha || 0).getTime();
      const fb = b.fecha?.toDate ? b.fecha.toDate().getTime() : new Date(b.fecha || 0).getTime();
      return fa - fb;
    });

  for (const m of ordenados) {
    const tipo = TIPOS_MOVIMIENTO[m.tipo];
    if (!tipo) continue;

    if (m.tipo === 'TRASLADO') {
      // Traslado: -cantidad en origen, +cantidad en destino
      _aplicarMov(stock, m.almacenId, m.materialId, -m.cantidad, m.costoUnitario || 0);
      if (m.almacenDestinoId) {
        _aplicarMov(stock, m.almacenDestinoId, m.materialId, +m.cantidad, m.costoUnitario || 0);
      }
    } else if (m.tipo === 'AJUSTE') {
      // Ajuste: cantidad puede ser positiva o negativa segun motivoAjuste
      const signo = (m.motivoAjuste === 'merma' || m.motivoAjuste === 'robo' || m.motivoAjuste === 'danio') ? -1 : +1;
      _aplicarMov(stock, m.almacenId, m.materialId, signo * Math.abs(m.cantidad), m.costoUnitario || 0);
    } else {
      // ENTRADA, SALIDA, DEVOLUCION
      _aplicarMov(stock, m.almacenId, m.materialId, tipo.signo * m.cantidad, m.costoUnitario || 0);
    }
  }

  return stock;
}

function _aplicarMov(stock, almacenId, materialId, deltaCantidad, costoUnitario) {
  if (!almacenId || !materialId) return;
  const key = `${almacenId}_${materialId}`;
  const slot = stock.get(key) || {
    almacenId,
    materialId,
    cantidad: 0,
    valorTotal: 0,
    costoPromedio: 0,
  };

  if (deltaCantidad > 0) {
    // Entrada: actualizar costo promedio ponderado
    const nuevoValor = slot.valorTotal + (deltaCantidad * costoUnitario);
    const nuevaCantidad = slot.cantidad + deltaCantidad;
    slot.cantidad = nuevaCantidad;
    slot.valorTotal = nuevoValor;
    slot.costoPromedio = nuevaCantidad > 0 ? round(nuevoValor / nuevaCantidad, 4) : 0;
  } else if (deltaCantidad < 0) {
    // Salida: descontar al costo promedio actual
    slot.cantidad += deltaCantidad;
    slot.valorTotal = slot.cantidad * slot.costoPromedio;
    if (slot.cantidad < 0) slot.cantidad = 0; // proteccion negativos
  }

  stock.set(key, slot);
}

// ════════════════════════════════════════════════════════════════
// AGREGADO POR MATERIAL (suma todos los almacenes)
// ════════════════════════════════════════════════════════════════

export function stockGlobalPorMaterial(stock) {
  const global = new Map();
  for (const slot of stock.values()) {
    const existing = global.get(slot.materialId) || {
      materialId: slot.materialId,
      cantidad: 0,
      valorTotal: 0,
      almacenes: [],
    };
    existing.cantidad += slot.cantidad;
    existing.valorTotal += slot.valorTotal;
    existing.almacenes.push({ almacenId: slot.almacenId, cantidad: slot.cantidad });
    global.set(slot.materialId, existing);
  }
  return global;
}

// ════════════════════════════════════════════════════════════════
// VALORIZACION DE INVENTARIO (TOTAL S/.)
// ════════════════════════════════════════════════════════════════

export function valorizarStock(stock) {
  let total = 0;
  for (const slot of stock.values()) {
    total += slot.valorTotal || 0;
  }
  return round(total, 2);
}

// ════════════════════════════════════════════════════════════════
// VALORIZACION A FECHA DE CORTE (Formato S10)
// ════════════════════════════════════════════════════════════════

/**
 * Reconstruye el stock cronologicamente hasta una fecha de corte (inclusive)
 * y devuelve el inventario valorizado al CPP de ese momento.
 *
 * Uso clasico S10: "saldos fisicos valorizados al 09/05/2026".
 *
 * @param {Array} movimientos
 * @param {string|Date} fechaCorte - Fecha tope inclusive (formato YYYY-MM-DD o Date)
 * @param {object} [opts] - { proyectoId, almacenId, fechaDesde }
 * @returns Map<string, slot> identico al de calcularStockActual
 */
export function valorizarStockAFecha(movimientos, fechaCorte, opts = {}) {
  const { proyectoId, almacenId, fechaDesde } = opts;
  const corte = fechaCorte instanceof Date ? fechaCorte : new Date(fechaCorte);
  corte.setHours(23, 59, 59, 999);
  const desde = fechaDesde ? new Date(fechaDesde) : null;
  if (desde) desde.setHours(0, 0, 0, 0);

  const filtrados = (movimientos || []).filter(m => {
    if (m.estado === 'anulado') return false;
    const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
    if (f > corte) return false;
    if (desde && f < desde) return false;
    if (proyectoId && m.proyectoId && m.proyectoId !== proyectoId) return false;
    if (almacenId && m.almacenId !== almacenId && m.almacenDestinoId !== almacenId) return false;
    return true;
  });

  return calcularStockActual(filtrados);
}

/**
 * Genera las filas listas para tabla/Excel del reporte valorizado estilo S10.
 *
 * Cada fila: { codigoS10, codigoInterno, nombre, unidad, almacen, categoria,
 *              cantidad, precioUnitario, subtotal }
 */
export function reporteValorizadoS10({ movimientos, materiales, almacenes, fechaCorte, proyectoId, almacenId, fechaDesde }) {
  const stock = valorizarStockAFecha(movimientos, fechaCorte, { proyectoId, almacenId, fechaDesde });
  const matMap = new Map((materiales || []).map(m => [m.id, m]));
  const almMap = new Map((almacenes || []).map(a => [a.id, a]));

  const filas = [];
  let totalGeneral = 0;
  let materialesSinS10 = 0;

  for (const slot of stock.values()) {
    if (!slot.cantidad || slot.cantidad <= 0) continue;
    const mat = matMap.get(slot.materialId);
    if (!mat) continue;
    const alm = almMap.get(slot.almacenId);

    const subtotal = round(slot.cantidad * slot.costoPromedio, 2);
    if (!mat.codigoS10) materialesSinS10++;
    totalGeneral += subtotal;

    filas.push({
      codigoS10: mat.codigoS10 || '⚠ FALTA',
      codigoInterno: mat.codigo || '',
      nombre: mat.nombre || '',
      unidad: mat.unidad || '',
      categoria: mat.categoria || 'OTRO',
      almacen: alm ? `${alm.codigo} · ${alm.nombre}` : slot.almacenId,
      almacenId: slot.almacenId,
      materialId: slot.materialId,
      cantidad: round(slot.cantidad, 4),
      precioUnitario: round(slot.costoPromedio, 4),
      subtotal,
    });
  }

  filas.sort((a, b) => (a.codigoS10 || '').localeCompare(b.codigoS10 || ''));

  return {
    filas,
    totalGeneral: round(totalGeneral, 2),
    materialesSinS10,
    cantidadItems: filas.length,
  };
}

// ════════════════════════════════════════════════════════════════
// KARDEX DE UN MATERIAL ESPECIFICO
// ════════════════════════════════════════════════════════════════

/**
 * Devuelve la linea de tiempo de movimientos para un material, con saldo acumulado.
 */
export function kardexPorMaterial(movimientos, materialId, almacenId = null) {
  const filtrados = (movimientos || [])
    .filter(m => m.materialId === materialId && m.estado !== 'anulado')
    .filter(m => !almacenId || m.almacenId === almacenId || m.almacenDestinoId === almacenId)
    .sort((a, b) => {
      const fa = a.fecha?.toDate ? a.fecha.toDate().getTime() : new Date(a.fecha || 0).getTime();
      const fb = b.fecha?.toDate ? b.fecha.toDate().getTime() : new Date(b.fecha || 0).getTime();
      return fa - fb;
    });

  let saldo = 0;
  let valorAcumulado = 0;
  return filtrados.map(m => {
    const tipo = TIPOS_MOVIMIENTO[m.tipo];
    let signo = tipo?.signo || 0;
    if (m.tipo === 'AJUSTE') {
      signo = (m.motivoAjuste === 'merma' || m.motivoAjuste === 'robo' || m.motivoAjuste === 'danio') ? -1 : +1;
    }
    if (m.tipo === 'TRASLADO') {
      // Si el almacen es el origen → -, si es destino → +
      signo = m.almacenId === almacenId ? -1 : (m.almacenDestinoId === almacenId ? +1 : 0);
    }

    const delta = signo * m.cantidad;
    saldo += delta;
    valorAcumulado += delta * (m.costoUnitario || 0);

    return {
      ...m,
      delta,
      saldo: round(saldo, 4),
      valorAcumulado: round(valorAcumulado, 2),
    };
  });
}

// ════════════════════════════════════════════════════════════════
// RECONCILIACION APU (TEORICO VS REAL)
// ════════════════════════════════════════════════════════════════

/**
 * Compara el consumo teorico (segun APU) con el real (segun salidas).
 *
 * @param {Object} args
 * @param {Object} args.material - Documento de material con ratioConsumoTeorico
 * @param {number} args.cantidadEjecutada - Cantidad de partida ejecutada (ej: 50 m3 concreto)
 * @param {number} args.consumoReal - Total salidas registradas en kardex (ej: 410 BOL)
 * @returns {{teorico, real, deltaAbs, deltaPct, dentroDeMerma, severidad, mensaje}}
 */
export function reconciliarAPU({ material, cantidadEjecutada, consumoReal }) {
  if (!material?.ratioConsumoTeorico || cantidadEjecutada == null) {
    return null;
  }

  const teorico = material.ratioConsumoTeorico * cantidadEjecutada;
  const deltaAbs = consumoReal - teorico;
  const deltaPct = teorico > 0 ? round((deltaAbs / teorico) * 100, 2) : 0;

  const mermaTolerada = material.mermaEstandarPct ?? MERMA_DEFAULT_PCT;
  const dentroDeMerma = Math.abs(deltaPct) <= mermaTolerada;

  let severidad = 'ok';
  let mensaje = `Consumo dentro de tolerancia de merma (±${mermaTolerada}%)`;

  if (deltaPct > mermaTolerada * 2) {
    severidad = 'alta';
    mensaje = `🚨 Sobreconsumo crítico: +${deltaPct}% sobre lo teórico. Investigar urgente.`;
  } else if (deltaPct > mermaTolerada) {
    severidad = 'media';
    mensaje = `⚠️ Sobreconsumo: +${deltaPct}% (tolerancia: ${mermaTolerada}%). Revisar.`;
  } else if (deltaPct < -mermaTolerada) {
    severidad = 'positiva';
    mensaje = `✅ Sub-consumo: ${deltaPct}%. Mejor que lo esperado, documentar buena practica.`;
  }

  return {
    teorico: round(teorico, 2),
    real: round(consumoReal, 2),
    deltaAbs: round(deltaAbs, 2),
    deltaPct,
    mermaTolerada,
    dentroDeMerma,
    severidad,
    mensaje,
  };
}

// ════════════════════════════════════════════════════════════════
// ALERTAS DE STOCK
// ════════════════════════════════════════════════════════════════

export function alertasStockBajo(stockGlobal, materiales) {
  const materialesMap = new Map((materiales || []).map(m => [m.id, m]));
  const alertas = [];

  for (const [matId, slot] of stockGlobal.entries()) {
    const mat = materialesMap.get(matId);
    if (!mat || !mat.activo) continue;
    const stockMin = mat.stockMinimo || 0;
    if (stockMin === 0) continue;

    if (slot.cantidad <= 0) {
      alertas.push({
        materialId: matId,
        material: mat.nombre,
        codigo: mat.codigo,
        stockActual: slot.cantidad,
        stockMinimo: stockMin,
        severidad: 'critica',
        icono: '🚨',
        mensaje: `Sin stock`,
      });
    } else if (slot.cantidad < stockMin * 0.5) {
      alertas.push({
        materialId: matId,
        material: mat.nombre,
        codigo: mat.codigo,
        stockActual: slot.cantidad,
        stockMinimo: stockMin,
        severidad: 'alta',
        icono: '⚠️',
        mensaje: `Stock crítico: ${slot.cantidad} ${mat.unidad} (mínimo ${stockMin})`,
      });
    } else if (slot.cantidad < stockMin) {
      alertas.push({
        materialId: matId,
        material: mat.nombre,
        codigo: mat.codigo,
        stockActual: slot.cantidad,
        stockMinimo: stockMin,
        severidad: 'media',
        icono: '🟡',
        mensaje: `Stock bajo: ${slot.cantidad} ${mat.unidad} (mínimo ${stockMin})`,
      });
    }
  }

  // Ordenar por severidad
  const ordenSev = { critica: 0, alta: 1, media: 2 };
  return alertas.sort((a, b) => ordenSev[a.severidad] - ordenSev[b.severidad]);
}

// ════════════════════════════════════════════════════════════════
// ANALISIS ABC (Pareto por costo)
// ════════════════════════════════════════════════════════════════

/**
 * Clasifica los materiales en A (top 80% del costo), B (siguiente 15%), C (resto).
 * Permite enfocar control en pocos pero costosos materiales.
 */
export function analizarABC(stockGlobal, materiales) {
  const materialesMap = new Map((materiales || []).map(m => [m.id, m]));

  const consolidado = [];
  for (const [matId, slot] of stockGlobal.entries()) {
    const mat = materialesMap.get(matId);
    if (!mat) continue;
    consolidado.push({
      materialId: matId,
      material: mat.nombre,
      codigo: mat.codigo,
      categoria: mat.categoria,
      cantidad: slot.cantidad,
      valor: slot.valorTotal,
    });
  }

  consolidado.sort((a, b) => b.valor - a.valor);

  const totalValor = sumBy(consolidado, x => x.valor);
  let acum = 0;
  return consolidado.map(c => {
    acum += c.valor;
    const pctAcum = totalValor > 0 ? (acum / totalValor) * 100 : 0;
    let clase = 'C';
    if (pctAcum <= 80) clase = 'A';
    else if (pctAcum <= 95) clase = 'B';
    return {
      ...c,
      pctAcum: round(pctAcum, 2),
      pctIndividual: totalValor > 0 ? round((c.valor / totalValor) * 100, 2) : 0,
      claseABC: clase,
    };
  });
}

// ════════════════════════════════════════════════════════════════
// FLUJO MENSUAL (entradas vs salidas)
// ════════════════════════════════════════════════════════════════

export function flujoMensual(movimientos, mesesAtras = 6) {
  const ahora = new Date();
  const meses = [];
  for (let i = mesesAtras - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    meses.push({ key, label: key, entradas: 0, salidas: 0, valorEntradas: 0, valorSalidas: 0 });
  }

  const idx = new Map(meses.map((m, i) => [m.key, i]));

  for (const m of (movimientos || [])) {
    if (m.estado === 'anulado') continue;
    const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
    const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    const i = idx.get(key);
    if (i == null) continue;
    if (m.tipo === 'ENTRADA') {
      meses[i].entradas += 1;
      meses[i].valorEntradas += (m.costoTotal || m.cantidad * (m.costoUnitario || 0));
    } else if (m.tipo === 'SALIDA') {
      meses[i].salidas += 1;
      meses[i].valorSalidas += (m.costoTotal || m.cantidad * (m.costoUnitario || 0));
    }
  }

  return meses.map(m => ({
    ...m,
    valorEntradas: round(m.valorEntradas, 2),
    valorSalidas: round(m.valorSalidas, 2),
  }));
}

// ════════════════════════════════════════════════════════════════
// HELPERS DE FORMATO
// ════════════════════════════════════════════════════════════════

export const fmtCantidad = (n, unidad = '') => {
  if (n == null || isNaN(n)) return '—';
  const formatted = Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 });
  return unidad ? `${formatted} ${unidad}` : formatted;
};

export const fmtSoles = (n) => {
  if (n == null || isNaN(n)) return 'S/. —';
  return 'S/. ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generarNumero = (prefijo, secuencial) => {
  const year = new Date().getFullYear();
  return `${prefijo}-${year}-${String(secuencial).padStart(4, '0')}`;
};

export const claseABCColor = (clase) => {
  if (clase === 'A') return '#dc2626';  // rojo (mas critico)
  if (clase === 'B') return '#f59e0b';  // ambar
  return '#16a34a';                      // verde (resto)
};

export const severidadColor = (sev) => {
  const map = {
    critica: '#dc2626', alta: '#dc2626', media: '#f59e0b',
    ok: '#16a34a', positiva: '#16a34a',
  };
  return map[sev] || '#64748b';
};
