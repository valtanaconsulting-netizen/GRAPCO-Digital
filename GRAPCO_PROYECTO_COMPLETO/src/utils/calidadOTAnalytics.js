// src/utils/calidadOTAnalytics.js — Motor de Calidad + Oficina Tecnica (Bloque 20)
//
// Funciones principales:
//   CALIDAD:
//     - generarChecklistDefault(tipoElemento) → checklist estandar segun elemento
//     - calcularEstadoProtocolo(protocolo) → estado y siguiente accion
//     - dashboardCalidad(protocolos, ncs, ensayos) → KPIs ejecutivos
//   OFICINA TECNICA:
//     - autogenerarRDOdesdeProduccion(historial, tareos, fecha) → borrador RDO
//     - calcularValorizacion(historial, partidasContractuales, periodo) → valorizacion
//     - calcularReajustePolinomico(indices, formula) → factor reajuste
//     - calcularCurvaSContractual(cronograma, historial) → datos para grafico

// ════════════════════════════════════════════════════════════════
// CONSTANTES Y CHECKLISTS
// ════════════════════════════════════════════════════════════════

export const TIPOS_PROTOCOLO = {
  prevaciado:  { label: 'Liberacion Pre-Vaciado', icono: '🧱', color: '#0F2A47', codigoFormato: 'CAL-FOR-006', prefijoRegistro: 'PV', plantilla: 'PreVaciado' },
  acero:       { label: 'Habilitacion de Acero',  icono: '🔩', color: '#dc2626' },
  encofrado:   { label: 'Encofrado',              icono: '📐', color: '#f59e0b' },
  concreto:    { label: 'Vaciado de Concreto',    icono: '🧱', color: '#7c3aed' },
  albanileria: { label: 'Albanileria',            icono: '🧱', color: '#0d9488' },
  acabados:    { label: 'Acabados',               icono: '🎨', color: '#ec4899' },
  iiee:        { label: 'Inst. Electricas',       icono: '⚡', color: '#eab308' },
  iis:         { label: 'Inst. Sanitarias',       icono: '🚰', color: '#06b6d4' },
};

export const ELEMENTOS_TIPO = [
  { id: 'columna',  label: 'Columna',  icono: '🏛️' },
  { id: 'viga',     label: 'Viga',     icono: '➖' },
  { id: 'losa',     label: 'Losa',     icono: '⬜' },
  { id: 'zapata',   label: 'Zapata',   icono: '⬛' },
  { id: 'muro',     label: 'Muro',     icono: '🧱' },
  { id: 'placa',    label: 'Placa',    icono: '▭' },
  { id: 'escalera', label: 'Escalera', icono: '🪜' },
  { id: 'cisterna', label: 'Cisterna', icono: '🛢️' },
  { id: 'otro',     label: 'Otro',     icono: '📦' },
];

export const ESTADOS_PROTOCOLO = {
  pendiente:           { label: 'Pendiente',           color: '#eab308', icono: '🟡', desc: 'Falta llenar checklist' },
  llenado:             { label: 'Llenado',             color: '#2563eb', icono: '🔵', desc: 'Espera firma residente' },
  firmado_residente:   { label: 'Firmado Residente',   color: '#7c3aed', icono: '🟣', desc: 'Espera supervisor cliente' },
  liberado:            { label: 'LIBERADO',            color: '#16a34a', icono: '🟢', desc: 'Listo para construir' },
  observado:           { label: 'Observado',           color: '#f97316', icono: '🟠', desc: 'Requiere correccion' },
  rechazado:           { label: 'Rechazado',           color: '#dc2626', icono: '🔴', desc: 'No paso liberacion' },
};

export const ESTADOS_NC = {
  abierta:     { label: 'Abierta',         color: '#dc2626', icono: '🔴' },
  tratamiento: { label: 'En tratamiento',  color: '#f59e0b', icono: '🟠' },
  cerrada:     { label: 'Cerrada',         color: '#2563eb', icono: '🔵' },
  verificada:  { label: 'Verificada',      color: '#16a34a', icono: '🟢' },
};

export const SEVERIDADES_NC = {
  baja:     { label: 'Baja',     color: '#16a34a' },
  media:    { label: 'Media',    color: '#f59e0b' },
  alta:     { label: 'Alta',     color: '#dc2626' },
  critica:  { label: 'CRITICA',  color: '#991b1b' },
};

export const TIPOS_ENSAYO = [
  { id: 'compresion',    label: 'Compresion concreto (f\'c)', unidad: 'kg/cm2' },
  { id: 'slump',         label: 'Slump (asentamiento)',       unidad: 'pulg' },
  { id: 'granulometria', label: 'Granulometria',              unidad: '%' },
  { id: 'densidad',      label: 'Densidad',                   unidad: 'g/cm3' },
  { id: 'compactacion',  label: 'Compactacion (Proctor)',     unidad: '%' },
  { id: 'humedad',       label: 'Humedad',                    unidad: '%' },
  { id: 'absorcion',     label: 'Absorcion',                  unidad: '%' },
  { id: 'tension',       label: 'Tension acero',              unidad: 'kg/cm2' },
  { id: 'otros',         label: 'Otros',                      unidad: '—' },
];

// ════════════════════════════════════════════════════════════════
// CHECKLISTS DEFAULT POR TIPO DE PROTOCOLO + ELEMENTO
// ════════════════════════════════════════════════════════════════

// CAL-FOR-006 · Liberacion de Pre-Vaciado de Concreto.
// Los 10 items son LITERALES del formato corporativo GRAPCO y no se editan.
// (Si el cliente cambia el formato, se versiona aqui — nunca por usuario.)
export const CHECKLIST_PREVACIADO = [
  { item: 'Ubicacion del elemento segun ejes y dimensiones.',                                       critico: true  },
  { item: 'Topografia, cota de fondo y niveles de concreto.',                                        critico: true  },
  { item: 'Verificacion de la armadura segun check list.',                                           critico: true  },
  { item: 'Verificacion del encofrado segun check list.',                                            critico: true  },
  { item: 'IISS / ACI: Tendido de redes, ubicacion de puntos de salida y pases para tuberias, etc.', critico: true  },
  { item: 'IIEE: Redes de salidas (Interruptores, tomacorrientes, TV, telefono e intercomunicados, etc)', critico: true },
  { item: 'Pernos de anclaje y/o elementos embebidos',                                               critico: true  },
  { item: 'Limpieza del fondo del encofrado',                                                        critico: true  },
  { item: 'Humedad en toda la superficie de contacto',                                               critico: false },
  { item: 'Otros:',                                                                                  critico: false },
];

// Los 5 firmantes (Hold Point) del CAL-FOR-006.
export const FIRMANTES_PREVACIADO = [
  { rol: 'Calidad - Sector',     campo: 'firmaCalidad'     },
  { rol: 'Produccion - Sector',  campo: 'firmaProduccion'  },
  { rol: 'Seguridad - Sector',   campo: 'firmaSeguridad'   },
  { rol: 'Residente',            campo: 'firmaResidente'   },
  { rol: 'Supervision',          campo: 'firmaSupervisor'  },
];

const CHECKLIST_TEMPLATES = {
  prevaciado: CHECKLIST_PREVACIADO,
  acero: [
    { item: 'Diametros y cantidades segun planos',           critico: true },
    { item: 'Distribucion correcta de estribos',             critico: true },
    { item: 'Recubrimiento minimo verificado',               critico: true },
    { item: 'Empalmes con longitud adecuada',                critico: true },
    { item: 'Limpieza del acero (sin oxido excesivo)',       critico: false },
    { item: 'Anclajes y dobleces segun planos',              critico: true },
    { item: 'Acero ligado en intersecciones',                critico: false },
    { item: 'Documentacion de probetas tomadas',             critico: false },
  ],
  encofrado: [
    { item: 'Geometria y dimensiones segun planos',          critico: true },
    { item: 'Plomos y niveles verificados',                  critico: true },
    { item: 'Apuntalamiento adecuado',                       critico: true },
    { item: 'Rigidez del encofrado (no deformaciones)',      critico: true },
    { item: 'Limpieza interior del encofrado',               critico: false },
    { item: 'Aplicacion de desmoldante',                     critico: false },
    { item: 'Sellado de juntas (sin filtraciones)',          critico: true },
    { item: 'Pases de instalaciones colocados',              critico: false },
  ],
  concreto: [
    { item: 'Verificacion de slump en obra',                 critico: true },
    { item: 'Probetas tomadas (minimo 3)',                   critico: true },
    { item: 'Vibrado uniforme del concreto',                 critico: true },
    { item: 'Control de tiempo de mezcla a colocacion',      critico: true },
    { item: 'Curado posterior previsto',                     critico: true },
    { item: 'Temperatura adecuada del concreto',             critico: false },
    { item: 'Documentacion de remisiones',                   critico: false },
    { item: 'Acabado superficial conforme',                  critico: false },
  ],
  albanileria: [
    { item: 'Aparejo correcto (soga/cabeza)',                critico: true },
    { item: 'Mortero conforme dosificacion',                 critico: true },
    { item: 'Plomos y niveles',                              critico: true },
    { item: 'Juntas uniformes',                              critico: false },
    { item: 'Anclajes a estructura',                         critico: true },
    { item: 'Limpieza de mocheta',                           critico: false },
  ],
  acabados: [
    { item: 'Superficie lista (sin polvo, sin grasa)',       critico: true },
    { item: 'Aplicacion uniforme',                           critico: true },
    { item: 'Color/textura segun especificacion',            critico: false },
    { item: 'Sin defectos visibles',                         critico: true },
    { item: 'Esquinas y encuentros bien rematados',          critico: false },
  ],
  iiee: [
    { item: 'Cables segun calibre especificado',             critico: true },
    { item: 'Tableros y subtableros conformes',              critico: true },
    { item: 'Pases protegidos',                              critico: false },
    { item: 'Megado (continuidad y aislamiento)',            critico: true },
    { item: 'Etiquetado de circuitos',                       critico: false },
    { item: 'Pruebas de funcionamiento',                     critico: true },
  ],
  iis: [
    { item: 'Tuberias segun diametro',                       critico: true },
    { item: 'Pendientes de desague correctas',               critico: true },
    { item: 'Pruebas hidrostatica (sin fugas)',              critico: true },
    { item: 'Conexiones bien selladas',                      critico: true },
    { item: 'Soporteria adecuada',                           critico: false },
  ],
};

export function generarChecklistDefault(tipoProtocolo) {
  const template = CHECKLIST_TEMPLATES[tipoProtocolo] || [];
  return template.map(t => ({
    item: t.item,
    critico: t.critico,
    valor: 'NO_LLENADO', // OK, NO_OK, NA, NO_LLENADO
    obs: '',
  }));
}

// ════════════════════════════════════════════════════════════════
// CALCULAR ESTADO Y SIGUIENTE ACCION DEL PROTOCOLO
// ════════════════════════════════════════════════════════════════

export function calcularEstadoProtocolo(protocolo) {
  if (!protocolo) return null;

  const tieneChecklistCompleto = protocolo.checklist?.every(c => c.valor !== 'NO_LLENADO') || false;
  const tieneFirmaResidente = !!protocolo.firmaResidente?.uid;
  const tieneFirmaSupervisor = !!protocolo.firmaSupervisor?.uid;
  const itemsCriticosNoOk = protocolo.checklist?.filter(c => c.critico && c.valor === 'NO_OK') || [];

  let estado = protocolo.estado || 'pendiente';
  let siguienteAccion = '';

  if (itemsCriticosNoOk.length > 0 && estado !== 'rechazado' && estado !== 'observado') {
    estado = 'observado';
    siguienteAccion = `Hay ${itemsCriticosNoOk.length} items criticos no conformes`;
  } else if (!tieneChecklistCompleto) {
    estado = 'pendiente';
    siguienteAccion = 'Calidad debe llenar el checklist';
  } else if (!tieneFirmaResidente) {
    estado = 'llenado';
    siguienteAccion = 'Residente debe revisar y firmar';
  } else if (!tieneFirmaSupervisor) {
    estado = 'firmado_residente';
    siguienteAccion = 'Supervisor del cliente debe firmar';
  } else {
    estado = 'liberado';
    siguienteAccion = 'Listo para construir/vaciar';
  }

  return { estado, siguienteAccion, itemsCriticosNoOk: itemsCriticosNoOk.length };
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD CALIDAD
// ════════════════════════════════════════════════════════════════

export function dashboardCalidad(protocolos = [], ncs = [], ensayos = []) {
  const total = protocolos.length;
  const liberados = protocolos.filter(p => p.estado === 'liberado').length;
  const pendientes = protocolos.filter(p => p.estado === 'pendiente' || p.estado === 'llenado').length;
  const observados = protocolos.filter(p => p.estado === 'observado').length;
  const rechazados = protocolos.filter(p => p.estado === 'rechazado').length;

  const ncsAbiertas = ncs.filter(n => n.estado === 'abierta' || n.estado === 'tratamiento').length;
  const ncsCriticas = ncs.filter(n => (n.estado === 'abierta' || n.estado === 'tratamiento') && n.severidad === 'critica').length;

  const ensayosCumplen = ensayos.filter(e => e.cumple === true).length;
  const ensayosNoCumplen = ensayos.filter(e => e.cumple === false).length;

  return {
    protocolos: { total, liberados, pendientes, observados, rechazados,
      pctLiberacion: total > 0 ? Math.round((liberados / total) * 100) : 0 },
    ncs: { total: ncs.length, abiertas: ncsAbiertas, criticas: ncsCriticas },
    ensayos: { total: ensayos.length, cumplen: ensayosCumplen, noCumplen: ensayosNoCumplen,
      pctCumplimiento: ensayos.length > 0 ? Math.round((ensayosCumplen / ensayos.length) * 100) : 100 },
  };
}

// ════════════════════════════════════════════════════════════════
// AUTOGENERAR RDO DESDE PRODUCCION
// ════════════════════════════════════════════════════════════════

/**
 * Genera el borrador del RDO automaticamente desde los datos de produccion del dia.
 *
 * @param {Object} args
 * @param {Array} args.historial - Registros del dia
 * @param {Array} args.tareos - Tareos del dia (personal en obra)
 * @param {Array} args.cuadrillasActivas - Cuadrillas asignadas hoy
 * @param {Date} args.fecha - Fecha del RDO
 * @returns {Object} - Borrador del RDO listo para revision
 */
export function autogenerarRDOdesdeProduccion({ historial = [], tareos = [], cuadrillasActivas = [], fecha = new Date() }) {
  const fechaStr = fecha.toISOString().split('T')[0];

  // Filtrar registros del dia
  const registrosHoy = historial.filter(h => {
    const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha);
    return f.toISOString().split('T')[0] === fechaStr;
  });

  // Personal en obra (de tareos del dia)
  const tareosHoy = tareos.filter(t => t.fecha === fechaStr);
  const obreros = tareosHoy.filter(t => (t.cargo || '').toLowerCase().includes('obrero')).length;
  const tecnicos = tareosHoy.filter(t => {
    const c = (t.cargo || '').toLowerCase();
    return c.includes('tecnico') || c.includes('operario') || c.includes('oficial');
  }).length;
  const administrativos = tareosHoy.filter(t => {
    const c = (t.cargo || '').toLowerCase();
    return c.includes('admin') || c.includes('residente') || c.includes('ingeniero') || c.includes('capataz');
  }).length;

  // Actividades ejecutadas
  const actividadesEjecutadas = registrosHoy.map(r => ({
    partida: r.partida || 'Sin partida',
    actividad: r.actividad || r.descripcion || 'Sin descripcion',
    avance: r.metrado || 0,
    unidad: r.unidad || 'und',
    cuadrilla: r.cuadrilla || '—',
    horasHombre: r.horasHombre || 0,
  }));

  // Cuadrillas en obra
  const cuadrillasEnObra = cuadrillasActivas.filter(c => c.activa !== false);

  // Equipos (heuristica: contar herramientas mencionadas)
  const equipos = []; // Plantilla — el residente lo completa

  return {
    fecha,
    numero: `RDO-${fecha.getFullYear()}-${String(fecha.getDate()).padStart(2, '0')}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
    clima: { manana: '', tarde: '', temperaturaMin: null, temperaturaMax: null },
    personal: { obreros, tecnicos, administrativos, total: obreros + tecnicos + administrativos },
    equipos,
    cuadrillasEnObra: cuadrillasEnObra.map(c => ({ id: c.id, nombre: c.nombre || 'Sin nombre', cantidad: c.cantidad || 0 })),
    actividadesEjecutadas,
    avanceFisicoAcumulado: null, // se calcula al integrar con presupuesto
    observaciones: '',
    incidentes: [],
    visitas: [],
    fotos: [],
    pdfGenerado: null,
    estado: 'borrador',
    autogenerado: true,
  };
}

// ════════════════════════════════════════════════════════════════
// CALCULAR VALORIZACION CONTRACTUAL
// ════════════════════════════════════════════════════════════════

/**
 * Calcula la valorizacion mensual al cliente desde produccion + presupuesto contractual.
 *
 * @param {Object} args
 * @param {Array} args.historial - Todos los registros de produccion
 * @param {Array} args.partidasContractuales - Partidas con metrado y precio unitario
 * @param {Object} args.periodo - { desde, hasta } fechas
 * @param {number} args.porcAdelanto - % de adelanto a amortizar (default 0)
 * @param {number} args.factorReajuste - Factor polinomico (default 1.0)
 * @param {number} args.numeroValorizacion - N° de valorizacion (1, 2, 3...)
 */
export function calcularValorizacion({
  historial = [], partidasContractuales = [],
  periodo = { desde: null, hasta: null },
  porcAdelanto = 0, factorReajuste = 1.0,
  numeroValorizacion = 1,
}) {
  const desde = periodo.desde ? new Date(periodo.desde) : null;
  const hasta = periodo.hasta ? new Date(periodo.hasta) : new Date();

  const partidasValorizadas = partidasContractuales.map(pc => {
    // Avance acumulado HASTA el fin del periodo
    const registrosHasta = historial.filter(h => {
      if (h.partida !== pc.codigo && h.actividad !== pc.codigo) return false;
      const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha);
      return f <= hasta;
    });
    const avanceAcumActual = registrosHasta.reduce((s, h) => s + (h.metrado || 0), 0);

    // Avance acumulado HASTA el inicio del periodo (es decir, lo del periodo anterior)
    const registrosHastaAntes = desde ? historial.filter(h => {
      if (h.partida !== pc.codigo && h.actividad !== pc.codigo) return false;
      const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha);
      return f < desde;
    }) : [];
    const avanceAcumAnterior = registrosHastaAntes.reduce((s, h) => s + (h.metrado || 0), 0);

    const avancePeriodo = Math.max(0, avanceAcumActual - avanceAcumAnterior);
    const montoBruto = avancePeriodo * (pc.precioUnitario || 0);

    return {
      codigo: pc.codigo,
      descripcion: pc.descripcion,
      unidad: pc.unidad,
      metradoContractual: pc.metradoContractual || 0,
      precioUnitario: pc.precioUnitario || 0,
      avanceAcumAnterior,
      avanceAcumActual,
      avancePeriodo,
      montoBruto,
    };
  });

  const subtotalBruto = partidasValorizadas.reduce((s, p) => s + p.montoBruto, 0);
  const montoReajustado = subtotalBruto * factorReajuste;
  const amortizacionAdelanto = subtotalBruto * (porcAdelanto / 100);
  const subtotalNeto = montoReajustado - amortizacionAdelanto;
  const igv = subtotalNeto * 0.18;
  const total = subtotalNeto + igv;

  return {
    numeroValorizacion,
    periodo,
    partidasValorizadas,
    subtotalBruto: redondear(subtotalBruto),
    factorReajuste,
    montoReajustado: redondear(montoReajustado),
    amortizacionAdelanto: redondear(amortizacionAdelanto),
    multas: 0,
    subtotalNeto: redondear(subtotalNeto),
    igv: redondear(igv),
    total: redondear(total),
  };
}

// ════════════════════════════════════════════════════════════════
// REAJUSTE POLINOMICO DS 011-79-VC
// ════════════════════════════════════════════════════════════════

/**
 * Calcula el factor de reajuste segun el DS 011-79-VC.
 *
 * Formula: K = a*(Mr/Mo) + b*(Sr/So) + c*(Cr/Co) + ... + (1-a-b-c-...)
 * donde Mr=indice mes valorizacion, Mo=indice mes contrato
 *
 * @param {Object} formula - { a: 0.30, b: 0.25, c: 0.20, ... } (coeficientes)
 * @param {Object} indicesActual - { M: 235.4, S: 312.1, C: 198.3, ... } (mes valorizacion)
 * @param {Object} indicesBase - Indices del mes del contrato
 */
export function calcularReajustePolinomico(formula = {}, indicesActual = {}, indicesBase = {}) {
  let factor = 0;
  const componentes = [];
  let sumaCoef = 0;

  for (const [key, coef] of Object.entries(formula)) {
    const ratio = indicesBase[key] && indicesActual[key]
      ? indicesActual[key] / indicesBase[key]
      : 1;
    const aporte = coef * ratio;
    factor += aporte;
    sumaCoef += coef;
    componentes.push({ componente: key, coef, indiceBase: indicesBase[key], indiceActual: indicesActual[key], ratio, aporte });
  }

  // Constante (1 - sumaCoef) para completar
  const constante = 1 - sumaCoef;
  factor += constante;

  return {
    factor: redondear(factor, 6),
    componentes,
    constante: redondear(constante, 4),
  };
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

const redondear = (n, dec = 2) => Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);

export const fmtSoles = (n) => {
  if (n == null || isNaN(n)) return 'S/. —';
  return 'S/. ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtNumero = (n, dec = 2) => {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

export const generarCodigoProtocolo = (tipo, elementoTipo, elementoCodigo, anio = new Date().getFullYear()) => {
  const tipoAbrev = (tipo || 'GEN').substring(0, 3).toUpperCase();
  const elemAbrev = (elementoTipo || 'ELM').substring(0, 3).toUpperCase();
  return `PC-${tipoAbrev}-${elemAbrev}-${elementoCodigo || 'NN'}-${anio}`;
};

export const colorEstadoProtocolo = (estado) => ESTADOS_PROTOCOLO[estado]?.color || '#64748b';
export const iconoEstadoProtocolo = (estado) => ESTADOS_PROTOCOLO[estado]?.icono || '⚪';

// ════════════════════════════════════════════════════════════════
// SEMANA ISO 8601 — para clasificar protocolos en Drive/Sheets
// ════════════════════════════════════════════════════════════════

// Devuelve { anio, semana } según ISO 8601 (lunes = inicio de semana).
// Ej. 28-mayo-2026 → { anio: 2026, semana: 22 }.
export function getSemanaISO(fecha = new Date()) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { anio: d.getUTCFullYear(), semana };
}

export const formatSemanaISO = (fecha = new Date()) => {
  const { anio, semana } = getSemanaISO(fecha);
  return `${anio}-W${String(semana).padStart(2, '0')}`;
};

// ════════════════════════════════════════════════════════════════
// N° DE REGISTRO — la "llave única" del workflow del PDF
// ════════════════════════════════════════════════════════════════

// Formato: {PREFIJO}-{FRENTE}-{NNN}
//   PV-F03-001  → Pre-vaciado, Frente 03, registro 1
//   EX-F02-014  → Excavación, Frente 02, registro 14
// `secuencia` es un número entero que la vista calcula (max + 1 en la lista filtrada).
// `frenteCodigo` puede venir del Frente activo (preferido) o derivarse del nombre.
export function generarNumeroRegistro(tipo, frenteCodigo, secuencia) {
  const t = TIPOS_PROTOCOLO[tipo];
  const prefijo = (t?.prefijoRegistro || (tipo || 'GEN').substring(0, 2)).toUpperCase();
  const fr = String(frenteCodigo || 'F00').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5) || 'F00';
  const seq = String(secuencia || 1).padStart(3, '0');
  return `${prefijo}-${fr}-${seq}`;
}

// Deriva un código corto del Frente desde su nombre (ej. "Frente 03" → "F03").
export function codigoFrente(frente) {
  if (!frente) return 'F00';
  if (frente.codigo) return String(frente.codigo).toUpperCase();
  const m = String(frente.nombre || '').match(/(\d+)/);
  return m ? `F${m[1].padStart(2, '0')}` : 'F00';
}
