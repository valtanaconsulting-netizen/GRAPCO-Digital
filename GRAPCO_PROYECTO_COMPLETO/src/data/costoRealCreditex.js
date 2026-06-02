// src/data/costoRealCreditex.js — CR (Costo Real / Reporte de Tareos) importado del ISP CREDITEX, tal cual valores y fórmulas.
// Generado automáticamente; no editar a mano.

export const CR_CREDITEX = {
 "meta": {
  "titulo": "CR · COSTO REAL (Reporte de Tareos)",
  "fuente": "ISP CREDITEX — hoja CR (base Semana 24)",
  "costoMOprom": 25.5,
  "nota": "Costo = HH × Costo MO promedio. Alimenta el Actual Cost (AC) del RO."
 },
 "columnas": {
  "hh": "F",
  "costo": "G",
  "acum": "H",
  "comentario": "J"
 },
 "filas": [
  {
   "fila": 7,
   "tipo": "total",
   "frenteCod": null,
   "frente": null,
   "codigo": null,
   "descripcion": "TOTAL COSTO DE OBRA",
   "v": {
    "hh": 17059,
    "costo": 301537.5,
    "acum": 435004.5
   },
   "f": {
    "hh": "=F9+F64",
    "costo": "=G9+G64",
    "acum": "=H9+H64"
   }
  },
  {
   "fila": 9,
   "tipo": "seccion",
   "frenteCod": null,
   "frente": null,
   "codigo": null,
   "descripcion": "COSTO DIRECTO",
   "v": {
    "hh": 16619,
    "costo": 290317.5,
    "acum": 423784.5
   },
   "f": {
    "hh": "=+F10+F15+F20+F22+F24+F26+F28+F30+F32+F34+F36+F46+F48+F50+F53+F57+F59+F61",
    "costo": "=+G10+G15+G20+G22+G24+G26+G28+G30+G32+G34+G36+G46+G48+G50+G53+G57+G59+G61",
    "acum": "=+H10+H15+H20+H22+H24+H26+H28+H30+H32+H34+H36+H46+H48+H50+H53+H57+H59+H61"
   }
  },
  {
   "fila": 10,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "1",
   "descripcion": "TRABAJOS PRELIMINARES",
   "v": {
    "hh": 3940.25,
    "costo": 18570.38,
    "acum": 100476.38
   },
   "f": {
    "hh": "=+SUM(F11:F14)",
    "costo": "=+SUM(G11)",
    "acum": "=SUM(H11:H14)"
   }
  },
  {
   "fila": 11,
   "tipo": "sub",
   "frenteCod": "PRE1",
   "frente": "FA01",
   "codigo": "1.01",
   "descripcion": "SEGURIDAD Y SALUD OCUPACIONAL",
   "v": {
    "hh": 728.25,
    "costo": 18570.38,
    "acum": 18570.38,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD19",
    "costo": "=+F11*$H$2",
    "acum": "=+G11",
    "comentario": "=+I11"
   }
  },
  {
   "fila": 12,
   "tipo": "sub",
   "frenteCod": "PRE2",
   "frente": "FA01",
   "codigo": "1.02",
   "descripcion": "TOPOGRAFÍA",
   "v": {
    "hh": 1058,
    "costo": 26979,
    "acum": 26979,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD22",
    "costo": "=+F12*$H$2",
    "acum": "=+G12",
    "comentario": "=+I12"
   }
  },
  {
   "fila": 13,
   "tipo": "sub",
   "frenteCod": "PRE3",
   "frente": "FA01",
   "codigo": "1.03",
   "descripcion": "ACARREO DE MATERIALES",
   "v": {
    "hh": 1793,
    "costo": 45721.5,
    "acum": 45721.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD26",
    "costo": "=+F13*$H$2",
    "acum": "=+G13",
    "comentario": "=+I13"
   }
  },
  {
   "fila": 14,
   "tipo": "sub",
   "frenteCod": "PRE4",
   "frente": "FA01",
   "codigo": "1.04",
   "descripcion": "OTRAS ACTIVIDADES",
   "v": {
    "hh": 361,
    "costo": 9205.5,
    "acum": 9205.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD66",
    "costo": "=+F14*$H$2",
    "acum": "=+G14",
    "comentario": "=+I14"
   }
  },
  {
   "fila": 15,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "2",
   "descripcion": "OBRAS PROVISIONALES",
   "v": {
    "hh": 723.75,
    "costo": 18455.63,
    "acum": 18455.63,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F16:F19)",
    "costo": "=SUM(G16:G19)",
    "acum": "=SUM(H16:H19)",
    "comentario": "=+I15"
   }
  },
  {
   "fila": 16,
   "tipo": "sub",
   "frenteCod": "PRO1",
   "frente": "FA01",
   "codigo": "2.01",
   "descripcion": "MOVILIZACIÓN",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD35",
    "costo": "=+F16*$H$2",
    "acum": "=+G16",
    "comentario": "=+I16"
   }
  },
  {
   "fila": 17,
   "tipo": "sub",
   "frenteCod": "PRO2",
   "frente": "FA01",
   "codigo": "2.02",
   "descripcion": "CAMPAMENTO",
   "v": {
    "hh": 452.75,
    "costo": 11545.13,
    "acum": 11545.13,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD45",
    "costo": "=+F17*$H$2",
    "acum": "=+G17",
    "comentario": "=+I17"
   }
  },
  {
   "fila": 18,
   "tipo": "sub",
   "frenteCod": "PRO3",
   "frente": "FA01",
   "codigo": "2.03",
   "descripcion": "CERRAMIENTO",
   "v": {
    "hh": 168.5,
    "costo": 4296.75,
    "acum": 4296.75,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD50",
    "costo": "=+F18*$H$2",
    "acum": "=+G18",
    "comentario": "=+I18"
   }
  },
  {
   "fila": 19,
   "tipo": "sub",
   "frenteCod": "PRO4",
   "frente": "FA01",
   "codigo": "2.04",
   "descripcion": "ADECUACION DE TERRENO",
   "v": {
    "hh": 102.5,
    "costo": 2613.75,
    "acum": 2613.75,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD56",
    "costo": "=+F19*$H$2",
    "acum": "=+G19",
    "comentario": "=+I19"
   }
  },
  {
   "fila": 20,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "3",
   "descripcion": "CONCRETO",
   "v": {
    "hh": 1697,
    "costo": 43273.5,
    "acum": 43273.5,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F21)",
    "costo": "=+SUM(G21)",
    "acum": "=SUM(H21)",
    "comentario": "=+I20"
   }
  },
  {
   "fila": 21,
   "tipo": "sub",
   "frenteCod": "CON",
   "frente": "FA01",
   "codigo": "3.01",
   "descripcion": "CONCRETO",
   "v": {
    "hh": 1697,
    "costo": 43273.5,
    "acum": 43273.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD91",
    "costo": "=+F21*$H$2",
    "acum": "=+G21",
    "comentario": "=+I21"
   }
  },
  {
   "fila": 22,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "4",
   "descripcion": "ACERO",
   "v": {
    "hh": 2620.5,
    "costo": 66822.75,
    "acum": 66822.75,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F23)",
    "costo": "=+SUM(G23)",
    "acum": "=SUM(H23)",
    "comentario": "=+I22"
   }
  },
  {
   "fila": 23,
   "tipo": "sub",
   "frenteCod": "ACE",
   "frente": "FA01",
   "codigo": "4.01",
   "descripcion": "ACERO",
   "v": {
    "hh": 2620.5,
    "costo": 66822.75,
    "acum": 66822.75,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD98",
    "costo": "=+F23*$H$2",
    "acum": "=+G23",
    "comentario": "=+I23"
   }
  },
  {
   "fila": 24,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "5",
   "descripcion": "CURADO",
   "v": {
    "hh": 56,
    "costo": 1428,
    "acum": 1428,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F25)",
    "costo": "=+SUM(G25)",
    "acum": "=SUM(H25)",
    "comentario": "=+I24"
   }
  },
  {
   "fila": 25,
   "tipo": "sub",
   "frenteCod": "CUR",
   "frente": "FA01",
   "codigo": "5.01",
   "descripcion": "CURADO",
   "v": {
    "hh": 56,
    "costo": 1428,
    "acum": 1428,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD104",
    "costo": "=+F25*$H$2",
    "acum": "=+G25",
    "comentario": "=+I25"
   }
  },
  {
   "fila": 26,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "6",
   "descripcion": "VARIOS ESTRUCTURAS",
   "v": {
    "hh": 348,
    "costo": 8874,
    "acum": 8874,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F27)",
    "costo": "=+SUM(G27)",
    "acum": "=SUM(H27)",
    "comentario": "=+I26"
   }
  },
  {
   "fila": 27,
   "tipo": "sub",
   "frenteCod": "VAE",
   "frente": "FA01",
   "codigo": "6.01",
   "descripcion": "VARIOS",
   "v": {
    "hh": 348,
    "costo": 8874,
    "acum": 8874,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD112",
    "costo": "=+F27*$H$2",
    "acum": "=+G27",
    "comentario": "=+I27"
   }
  },
  {
   "fila": 28,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "7",
   "descripcion": "TABIQUERIA",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F29)",
    "costo": "=+SUM(G29)",
    "acum": "=SUM(H29)",
    "comentario": "=+I28"
   }
  },
  {
   "fila": 29,
   "tipo": "sub",
   "frenteCod": "TAB",
   "frente": "FA01",
   "codigo": "7.01",
   "descripcion": "TABIQUERIA",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD118",
    "costo": "=+F29*$H$2",
    "acum": "=+G29",
    "comentario": "=+I29"
   }
  },
  {
   "fila": 30,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "8",
   "descripcion": "BITUMEN",
   "v": {
    "hh": 78.5,
    "costo": 2001.75,
    "acum": 2001.75,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F31)",
    "costo": "=+SUM(G31)",
    "acum": "=SUM(H31)",
    "comentario": "=+I30"
   }
  },
  {
   "fila": 31,
   "tipo": "sub",
   "frenteCod": "BIT",
   "frente": "FA01",
   "codigo": "8.01",
   "descripcion": "BITUMEN",
   "v": {
    "hh": 78.5,
    "costo": 2001.75,
    "acum": 2001.75,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD123",
    "costo": "=+F31*$H$2",
    "acum": "=+G31",
    "comentario": "=+I31"
   }
  },
  {
   "fila": 32,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "9",
   "descripcion": "CONTRAPISO",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F33)",
    "costo": "=+SUM(G33)",
    "acum": "=SUM(H33)",
    "comentario": "=+I32"
   }
  },
  {
   "fila": 33,
   "tipo": "sub",
   "frenteCod": "CONT",
   "frente": "FA01",
   "codigo": "9.01",
   "descripcion": "CONTRAPISO",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD128",
    "costo": "=+F33*$H$2",
    "acum": "=+G33",
    "comentario": "=+I33"
   }
  },
  {
   "fila": 34,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "10",
   "descripcion": "PRUEBA HIDRAULICA",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F35)",
    "costo": "=+SUM(G35)",
    "acum": "=SUM(H35)",
    "comentario": "=+I34"
   }
  },
  {
   "fila": 35,
   "tipo": "sub",
   "frenteCod": "PRH",
   "frente": "FA01",
   "codigo": "10.1",
   "descripcion": "PRUEBA HIDRAULICA",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD133",
    "costo": "=+F35*$H$2",
    "acum": "=+G35",
    "comentario": "=+I35"
   }
  },
  {
   "fila": 36,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "11",
   "descripcion": "VARIOS ARQUITECTURA",
   "v": {
    "hh": 702.5,
    "costo": 17913.75,
    "acum": 17913.75,
    "comentario": 0
   },
   "f": {
    "hh": "=SUM(F37:F45)",
    "costo": "=SUM(G37:G45)",
    "acum": "=+SUM(H37:H45)",
    "comentario": "=+I36"
   }
  },
  {
   "fila": 37,
   "tipo": "sub",
   "frenteCod": "TAR",
   "frente": "FA01",
   "codigo": "11.01",
   "descripcion": "TARRAJEO",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F37*$H$2",
    "acum": "=+G37",
    "comentario": "=+I37"
   }
  },
  {
   "fila": 38,
   "tipo": "sub",
   "frenteCod": "SLQ",
   "frente": "FA01",
   "codigo": "11.02",
   "descripcion": "SOLAQUEO",
   "v": {
    "hh": 621.5,
    "costo": 15848.25,
    "acum": 15848.25,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD140",
    "costo": "=+F38*$H$2",
    "acum": "=+G38",
    "comentario": "=+I38"
   }
  },
  {
   "fila": 39,
   "tipo": "sub",
   "frenteCod": "FPI",
   "frente": "FA01",
   "codigo": "11.03",
   "descripcion": "FALSO PISO",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F39*$H$2",
    "acum": "=+G39",
    "comentario": "=+I39"
   }
  },
  {
   "fila": 40,
   "tipo": "sub",
   "frenteCod": "FOR",
   "frente": "FA01",
   "codigo": "11.04",
   "descripcion": "FORJADO ESCALERAS",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F40*$H$2",
    "acum": "=+G40",
    "comentario": "=+I40"
   }
  },
  {
   "fila": 41,
   "tipo": "sub",
   "frenteCod": "DER",
   "frente": "FA01",
   "codigo": "11.05",
   "descripcion": "DERRAME",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F41*$H$2",
    "acum": "=+G41",
    "comentario": "=+I41"
   }
  },
  {
   "fila": 42,
   "tipo": "sub",
   "frenteCod": "CZO",
   "frente": "FA01",
   "codigo": "11.06",
   "descripcion": "CONTRAZOCALO",
   "v": {
    "hh": 81,
    "costo": 2065.5,
    "acum": 2065.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD146",
    "costo": "=+F42*$H$2",
    "acum": "=+G42",
    "comentario": "=+I42"
   }
  },
  {
   "fila": 43,
   "tipo": "sub",
   "frenteCod": "ZOC",
   "frente": "FA01",
   "codigo": "11.07",
   "descripcion": "ZOCALO CERAMICO",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F43*$H$2",
    "acum": "=+G43",
    "comentario": "=+I43"
   }
  },
  {
   "fila": 44,
   "tipo": "sub",
   "frenteCod": "PCE",
   "frente": "FA01",
   "codigo": "11.08",
   "descripcion": "PISO DE CERAMICO",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F44*$H$2",
    "acum": "=+G44",
    "comentario": "=+I44"
   }
  },
  {
   "fila": 45,
   "tipo": "sub",
   "frenteCod": "VAA",
   "frente": "FA01",
   "codigo": "11.09",
   "descripcion": "VARIOS (PUERTAS, ETC)",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F45*$H$2",
    "acum": "=+G45",
    "comentario": "=+I45"
   }
  },
  {
   "fila": 46,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "12",
   "descripcion": "INSTALACIONES ELECTRICAS",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "=F47",
    "costo": "=+SUM(G47)",
    "acum": "=SUM(H47)",
    "comentario": "=+I46"
   }
  },
  {
   "fila": 47,
   "tipo": "sub",
   "frenteCod": "IIEE",
   "frente": "FA01",
   "codigo": "12.1",
   "descripcion": "IIEE",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD156",
    "costo": "=+F47*$H$2",
    "acum": "=+G47",
    "comentario": "=+I47"
   }
  },
  {
   "fila": 48,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "13",
   "descripcion": "INSTALACIONES SANITARIAS",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "=F49",
    "costo": "=+SUM(G49)",
    "acum": "=SUM(H49)",
    "comentario": "=+I48"
   }
  },
  {
   "fila": 49,
   "tipo": "sub",
   "frenteCod": "IISS",
   "frente": "FA01",
   "codigo": "13,1",
   "descripcion": "IISS",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD161",
    "costo": "=+F49*$H$2",
    "acum": "=+G49",
    "comentario": "=+I49"
   }
  },
  {
   "fila": 50,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "1014",
   "descripcion": "MOVIMIENTOS DE TIERRAS",
   "v": {
    "hh": 2022,
    "acum": 51561,
    "comentario": 0
   },
   "f": {
    "hh": "=SUM(F51:F52)",
    "acum": "=SUM(H51:H52)",
    "comentario": "=+I50"
   }
  },
  {
   "fila": 51,
   "tipo": "sub",
   "frenteCod": "MOV1",
   "frente": "FA01",
   "codigo": "14.1",
   "descripcion": "MOVILIZACION Y FACILIDADES",
   "v": {
    "hh": 9,
    "costo": 229.5,
    "acum": 229.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD167",
    "costo": "=+F51*$H$2",
    "acum": "=+G51",
    "comentario": "=+I51"
   }
  },
  {
   "fila": 52,
   "tipo": "sub",
   "frenteCod": "MOV2",
   "frente": "FA01",
   "codigo": "14.1",
   "descripcion": "MOVIMIENTO DE TIERRAS",
   "v": {
    "hh": 2013,
    "costo": 51331.5,
    "acum": 51331.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD181",
    "costo": "=+F52*$H$2",
    "acum": "=+G52",
    "comentario": "=+I52"
   }
  },
  {
   "fila": 53,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "15",
   "descripcion": "ENCOFRADO",
   "v": {
    "hh": 4363,
    "costo": 111256.5,
    "acum": 111256.5,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F54:F56)",
    "costo": "=+SUM(G54:G56)",
    "acum": "=+SUM(H54:H56)",
    "comentario": "=+I53"
   }
  },
  {
   "fila": 54,
   "tipo": "sub",
   "frenteCod": "PRF",
   "frente": "FA01",
   "codigo": "15.01",
   "descripcion": "PREFABRICADO",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F54*$H$2",
    "acum": "=+G54",
    "comentario": "=+I54"
   }
  },
  {
   "fila": 55,
   "tipo": "sub",
   "frenteCod": "SIS",
   "frente": "FA01",
   "codigo": "15.02",
   "descripcion": "APUNTALAMIENTO",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD205",
    "costo": "=+F55*$H$2",
    "acum": "=+G55",
    "comentario": "=+I55"
   }
  },
  {
   "fila": 56,
   "tipo": "sub",
   "frenteCod": "ENC",
   "frente": "FA01",
   "codigo": "15.03",
   "descripcion": "ENCOFRADO",
   "v": {
    "hh": 4363,
    "costo": 111256.5,
    "acum": 111256.5,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD203",
    "costo": "=+F56*$H$2",
    "acum": "=+G56",
    "comentario": "=+I56"
   }
  },
  {
   "fila": 57,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "16",
   "descripcion": "ESTRUCTURA METÁLICA",
   "v": {
    "hh": 42,
    "costo": 1071,
    "acum": 1071,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F58)",
    "costo": "=+SUM(G58)",
    "acum": "=SUM(H58)",
    "comentario": "=+I57"
   }
  },
  {
   "fila": 58,
   "tipo": "sub",
   "frenteCod": "MET",
   "frente": "FA01",
   "codigo": "16.01",
   "descripcion": "ESTRUCTURA METÁLICA",
   "v": {
    "hh": 42,
    "costo": 1071,
    "acum": 1071,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD213",
    "costo": "=+F58*$H$2",
    "acum": "=+G58",
    "comentario": "=+I58"
   }
  },
  {
   "fila": 59,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "17",
   "descripcion": "IMPERMEABILIZACION",
   "v": {
    "hh": 25.5,
    "costo": 650.25,
    "acum": 650.25,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F60)",
    "costo": "=+SUM(G60)",
    "acum": "=SUM(H60)",
    "comentario": "=+I59"
   }
  },
  {
   "fila": 60,
   "tipo": "sub",
   "frenteCod": "IMP",
   "frente": "FA01",
   "codigo": "17.01",
   "descripcion": "IMPERMEABILIZACION",
   "v": {
    "hh": 25.5,
    "costo": 650.25,
    "acum": 650.25,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD220",
    "costo": "=+F60*$H$2",
    "acum": "=+G60",
    "comentario": "=+I60"
   }
  },
  {
   "fila": 61,
   "tipo": "partida",
   "frenteCod": null,
   "frente": null,
   "codigo": "18",
   "descripcion": "PINTURA",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "=+SUM(F62)",
    "costo": "=+SUM(G62)",
    "acum": "=SUM(H62)",
    "comentario": "=+I61"
   }
  },
  {
   "fila": 62,
   "tipo": "sub",
   "frenteCod": "PIN",
   "frente": "FA01",
   "codigo": "18.01",
   "descripcion": "PINTURA",
   "v": {
    "hh": 0,
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD222",
    "costo": "=+F62*$H$2",
    "acum": "=+G62",
    "comentario": "=+I62"
   }
  },
  {
   "fila": 64,
   "tipo": "seccion",
   "frenteCod": null,
   "frente": null,
   "codigo": null,
   "descripcion": "GASTOS GENERALES",
   "v": {
    "hh": 440,
    "costo": 11220,
    "acum": 11220,
    "comentario": 0
   },
   "f": {
    "hh": "=SUM(F65:F74)",
    "costo": "=+SUM(G65:G74)",
    "acum": "=+SUM(H65:H74)",
    "comentario": "=+I64"
   }
  },
  {
   "fila": 65,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "19.01",
   "descripcion": "ADMINISTRACIÓN Y GENERALES DE OBRA",
   "v": {
    "hh": 440,
    "costo": 11220,
    "acum": 11220,
    "comentario": 0
   },
   "f": {
    "hh": "='ISP-SEM24'!BD235",
    "costo": "=+F65*$H$2",
    "acum": "=+G65",
    "comentario": "=+I65"
   }
  },
  {
   "fila": 66,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "2.00",
   "descripcion": "ADMINISTRACIÓN Y GENERALES DE OFICINA CENTRAL",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F66*$H$2",
    "acum": "=+G66",
    "comentario": "=+I66"
   }
  },
  {
   "fila": 67,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "3.00",
   "descripcion": "GASTOS FINANCIEROS",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F67*$H$2",
    "acum": "=+G67",
    "comentario": "=+I67"
   }
  },
  {
   "fila": 68,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "4.00",
   "descripcion": "SERVICIOS Y OTROS EN OBRA",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F68*$H$2",
    "acum": "=+G68",
    "comentario": "=+I68"
   }
  },
  {
   "fila": 69,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "5.00",
   "descripcion": "LICITACIÓN Y CONTRATACIÓN",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F69*$H$2",
    "acum": "=+G69",
    "comentario": "=+I69"
   }
  },
  {
   "fila": 70,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "6.00",
   "descripcion": "GASTOS DE MOVILIZACION",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F70*$H$2",
    "acum": "=+G70",
    "comentario": "=+I70"
   }
  },
  {
   "fila": 71,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "7.00",
   "descripcion": "GASTOS ADMINISTRATIVOS",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F71*$H$2",
    "acum": "=+G71",
    "comentario": "=+I71"
   }
  },
  {
   "fila": 72,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "8.00",
   "descripcion": "PRUEBAS Y ENSAYOS",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F72*$H$2",
    "acum": "=+G72",
    "comentario": "=+I72"
   }
  },
  {
   "fila": 73,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "9.00",
   "descripcion": "SEGUROS",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F73*$H$2",
    "acum": "=+G73",
    "comentario": "=+I73"
   }
  },
  {
   "fila": 74,
   "tipo": "otro",
   "frenteCod": null,
   "frente": "FA01",
   "codigo": "10.00",
   "descripcion": "VARIOS",
   "v": {
    "costo": 0,
    "acum": 0,
    "comentario": 0
   },
   "f": {
    "costo": "=+F74*$H$2",
    "acum": "=+G74",
    "comentario": "=+I74"
   }
  }
 ]
};
