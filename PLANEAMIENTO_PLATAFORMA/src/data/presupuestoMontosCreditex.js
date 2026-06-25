// src/data/presupuestoMontosCreditex.js
// PRESUPUESTO CONTRACTUAL en SOLES de CREDITEX PTAR Planta 5 (montos por partida).
// Distinto de presupuestoCreditex.js (ese es la estructura WBS en HH/IP para el ISP).
// Es la base de código del módulo Presupuesto (fallback offline-first cuando el
// proyecto legacy CREDITEX no tiene presupuesto en Firestore). Misma taxonomía
// 1001-1018 que el motor del RO → ambas vistas conversan sobre los mismos códigos.
//
// Fuentes (extraídas con scripts/_extraer_presupuesto.cjs, verificadas):
//   F1 PTARI = "PPTTO GRAPCO Rev 30.06 vr Modif x Creditex 17.07.25.xlsx" (hoja RO)  → ΣF1 = 1,825,339.08
//   F2 NAVE  = "PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx" (hoja 12. RO)      → ΣF2 =   571,808.84

export const PRESUPUESTO_MONTOS_CREDITEX = [
  { codigo: '1001', descripcion: 'TRABAJOS PRELIMINARES',    montoF1: 182704.14, montoF2: 14797.89 },
  { codigo: '1002', descripcion: 'OBRAS PROVISIONALES',      montoF1: 103581.17, montoF2: 0 },
  { codigo: '1003', descripcion: 'CONCRETO',                 montoF1: 402704.26, montoF2: 13385.20 },
  { codigo: '1004', descripcion: 'ACERO',                    montoF1: 645685.64, montoF2: 10784.59 },
  { codigo: '1005', descripcion: 'CURADO',                   montoF1: 12030.03,  montoF2: 644.86 },
  { codigo: '1006', descripcion: 'VARIOS ESTRUCTURAS',       montoF1: 2525.14,   montoF2: 1515.71 },
  { codigo: '1007', descripcion: 'TABIQUERIA',               montoF1: 0,         montoF2: 0 },
  { codigo: '1008', descripcion: 'BITUMEN',                  montoF1: 8419.15,   montoF2: 0 },
  { codigo: '1009', descripcion: 'CONTRAPISO',               montoF1: 0,         montoF2: 0 },
  { codigo: '1010', descripcion: 'PRUEBA HIDRAULICA',        montoF1: 37947.76,  montoF2: 0 },
  { codigo: '1011', descripcion: 'VARIOS ARQUITECTURA',      montoF1: 12017.73,  montoF2: 26220.57 },
  { codigo: '1012', descripcion: 'INSTALACIONES ELECTRICAS', montoF1: 0,         montoF2: 0 },
  { codigo: '1013', descripcion: 'INSTALACIONES SANITARIAS', montoF1: 0,         montoF2: 0 },
  { codigo: '1014', descripcion: 'MOVIMIENTOS DE TIERRAS',   montoF1: 91286.04,  montoF2: 0 },
  { codigo: '1015', descripcion: 'ENCOFRADO',                montoF1: 206621.21, montoF2: 676.57 },
  { codigo: '1016', descripcion: 'ESTRUCTURA METÁLICA',      montoF1: 0,         montoF2: 503783.46 },
  { codigo: '1017', descripcion: 'IMPERMEABILIZACION',       montoF1: 119816.79, montoF2: 0 },
  { codigo: '1018', descripcion: 'PINTURA',                  montoF1: 0,         montoF2: 0 },
];

// Pie comercial COMBINADO (F1 PTARI + F2 NAVE), montos reales sumados de ambos PPTTO.
// La NAVE incluye un Descuento Comercial (S/-103,513.63) que aquí se refleja.
//   PTARI: CD 1,825,339.08 · GG 483,145.42 (26.47%) · Util 164,280.52 (9%) · IGV 445,097.70 · Total 2,917,862.72 · CostoObra 2,308,484.50
//   NAVE : CD   571,808.84 · GG 151,350.96 (26.47%) · Desc -103,513.63 · Util 51,462.80 (9%) · IGV 120,799.61 · Total 791,908.58 · CostoObra 723,159.80
export const PRESUPUESTO_MONTOS_CONFIG = {
  ggPct: 26.47, utilidadPct: 9, igvPct: 18,
  cd: 2397147.92,
  gg: 634496.38,
  descuento: 103513.63,
  utilidad: 215743.32,
  subtotal: 3143873.99,
  igv: 565897.31,
  total: 3709771.30,
  costoObra: 3031644.30,   // CD + GG = meta de control del RO
};

export const PRESUPUESTO_MONTOS_FRENTES = {
  F1: { nombre: 'PTARI', cd: 1825339.08, gg: 483145.42, utilidad: 164280.52, descuento: 0,         subtotal: 2472765.02, igv: 445097.70, total: 2917862.72, costoObra: 2308484.50 },
  F2: { nombre: 'NAVE',  cd: 571808.84,  gg: 151350.96, utilidad: 51462.80,  descuento: 103513.63, subtotal: 671108.97,  igv: 120799.61, total: 791908.58,  costoObra: 723159.80 },
};
