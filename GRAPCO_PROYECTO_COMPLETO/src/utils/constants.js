// src/constants.js
// ══════════════════════════════════════════════════════════════════
// REGLA DE ORO: Nombres en CATALOGO_MASTER y DATA_ACTIVIDADES = IDÉNTICOS
// metP = Metrado Presupuesto total de la actividad en el proyecto
// metM = Metrado Meta total de la actividad en el proyecto
// ipP  = IP Presupuesto (HH ppto / metrado ppto)
// ipM  = IP Meta        (HH meta  / metrado meta)
// ══════════════════════════════════════════════════════════════════

export const CATALOGO_MASTER = {
  "TRABAJOS PRELIMINARES": {
    "SEGURIDAD Y SALUD OCUPACIONAL": [
      "ALQUILER DE ANDAMIOS PARA TRABAJOS",
      "ALQUILER DE ANDAMIOS ESCALERAS PARA ACCESOS",
      "ARMADO Y DESARMADO DE ANDAMIOS ESCALERAS PARA ACCESOS",
      "SEÑALIZACION TEMPORAL DE SEGURIDAD",
      "ILUMINACION DE ACCESOS Y FRENTES DE TRABAJO",
      "LIMPIEZA GENERAL Y PERMANENTE EN OBRA"
    ],
    "TOPOGRAFÍA": ["TRAZO Y REPLANTEO TOPOGRAFICO"],
    "ACARREO DE MATERIALES": [
      "ACARREO VERTICAL DE ENCOFRADO PETARI Y MATERIALES C/ CAMION GRUA",
      "ACARREO HORIZONTAL Y VERTICAL DE MATERIALES"
    ],
    "DISEÑO": []
  },
  "OBRAS PROVISIONALES": {
    "MOVILIZACIÓN": ["MOVILIZACION Y DESMOVILIZACION DE MAQUINARIA, EQUIPOS Y HERRAMIENTAS"],
    "CAMPAMENTO": [
      "CASETA DE OFICINA (42 M2)",
      "CASETA DE SUPERVISIÓN (25M2)",
      "CASETA PARA ALMACEN DE HERRAMIENTAS, EQUIPOS Y MATERIALES(25M2)",
      "COMEDOR PARA PERSONAL OBRERO (60 M2: 50 Personas)",
      "VESTUARIO PARA PERSONAL OBRERO (30M2)",
      "INSTALACIONES PROVISIONALES DE IIEE",
      "INSTALACIONES PROVISIONALES DE IISS",
      "BAÑOS QUÍMICOS, LAVAMANOS PORTÁTILES y DUCHAS PORTÁTILES"
    ],
    "CERRAMIENTO": [
      "CERCO PERIMETRICO INTERIOR",
      "CERCO PERIMETRICO ZONA DE TANQUES",
      "PUERTA DE INGRESO Y ACCESO"
    ],
    "ADECUACION DE TERRENO": [
      "DEMOLICION DE LOSA EXISTENTE",
      "DEMOLICION DE MUROS DE LADRILLO CONFINADO",
      "DEMOLICION LOCALIZADA EN COLUMNAS",
      "ELIMINACIÓN DE DESMONTE Y DESPERDICIOS"
    ],
    "OTRAS ACTIVIDADES": [
      "LIMPIEZA EN INTERIOR DE TANQUES",
      "COLOCADO DE LECHADA Y MALLA RASCHELL EN ZONA EXCAVADA",
      "CALIDAD",
      "APOYO A OTRAS OBRAS - PRECOTEX",
      "EXCAVACION DE CALICATAS",
      "CORTE DE LOSA CON EQUIPO",
      "LIMPIEZA Y AMOLADO EN MURO DE TANQUE",
      "HABILITADO DE TACOS DE CONCRETO"
    ]
  },
  "CONCRETO": {
    "CONCRETO SIMPLE": [
      "CONCRETO CICLOPEO 1:10 PARA CALZADURAS (HECHO EN OBRA)",
      "CONCRETO F'C= 100 KG/CM2 EN SOLADO (PREMEZCLADO) H=0.10 M",
      "CONCRETO FC=100kG/CM2 + 25 % PM FALSA ZAPATA",
      "COLOCACION DE CONCRETO EN FALSO MURO ENTRE TANQUES"
    ],
    "CONCRETO ARMADO": [
      "CONCRETO F'C= 350 KG/CM2 EN LOSA (PREMEZCLADO)",
      "CONCRETO F'C= 350 KG/CM2 EN VERTICALES (PREMEZCLADO)",
      "CONCRETO F'C= 280 KG/CM2 EN VIGAS (PREMEZCLADO)",
      "CONCRETO F'C= 280 KG/CM2 EN LOSA (PREMEZCLADO)",
      "CONCRETO F'C=210 KG/CM2 (HECHO EN OBRA)",
      "CONCRETO F'C= 280 KG/CM2 EN LOSA (PREMEZCLADO) (F2 - NAVE)",
      "CONCRETO F'C= 280 KG/CM2 EN LOSA MACISA (PREMEZCLADO) (F2 - NAVE)",
      "CONCRETO F'C= 210 KG/CM2 (PREMEZCLADO) EN ZAPATAS Y PEDESTALES (F2 - NAVE)",
      "CONCRETO F'C= 210 KG/CM2 EN VERTICALES (PREMEZCLADO) (F2 - NAVE CTE)",
      "CONCRETO F'C= 210 KG/CM2 EN VIGAS (PREMEZCLADO) (F2 - NAVE CTE)",
      "CONCRETO F'C= 210 KG/CM2 EN LOSA (PREMEZCLADO) (F2 - NAVE CTE)"
    ]
  },
  "ACERO": { "GENERAL": ["HABILITADO DE ACERO", "COLOCADO DE ACERO"] },
  "CURADO": { "CURADO TOTAL": ["CURADO"] },
  "VARIOS ESTRUCTURA": {
    "JUNTAS": [
      "COLOCACION DE JUNTA HIDRO EXPANSIVA 13X10 MM",
      "JUNTAS DE RETRACCION (JR) (F2 - NAVE)",
      "JUNTAS DE AISLAMIENTO(JA) (F2 - NAVE)"
    ]
  },
  "TABIQUERIA":       { "GENERAL": [] },
  "BITUMEN":          { "GENERAL": ["IMPERMEABILIZACION CON PINTURA BITUMINOSA"] },
  "CONTRAPISOS":      { "GENERAL": ["CONTRAPISOS"] },
  "PRUEBA HIDRAULICA":{ "GENERAL": ["PRUEBA HIDRAULICA DE ESTANQUEIDAD"] },
  "VARIOS ARQUITECTURA": {
    "TARRAJEO":            [],
    "SOLAQUEO":            ["RECTIFICACIONES EN MUROS Y COLUMNAS", "SOLAQUEO EXTERIOR"],
    "FALSO PISO":          [],
    "FORJADO ESCALERAS":   [],
    "DERRAME":             [],
    "CONTRAZOCALO":        ["CONTRAZOCALO"],
    "ZOCALO CERAMICO":     [],
    "PISO DE CERAMICO":    [],
    "VARIOS (PUERTAS, ETC)": []
  },
  "INSTALACIONES ELECTRICAS":  { "GENERAL": ["IIEE"] },
  "INSTALACIONES SANITARIAS":  { "GENERAL": ["IISS"] },
  "MOVIMIENTO DE TIERRAS": {
    "MOVILIZACION Y FACILIDADES": [
      "MOVILIZACION Y DESMOVILIZACIÓN DE EQUIPOS PARA MOV DE TIERRAS",
      "MITIGACIÓN DE POLVO DURANTE EL MOVIMIENTO DE TIERRAS"
    ],
    "MOVIMIENTO DE TIERRAS PTARI": [
      "EXCAVACION MASIVA",
      "EXCAVACIÓN LOCALIZADA C/ EQUIPO",
      "NIVELACION Y COMPACTACION DE SUBRASANTE",
      "NIVELACION Y COMPACTACION DE SUBRASANTE (DECANTADOR)",
      "PERFILADO DE EXCAVACION LOCALIZADA C/EQUIPO",
      "PERFILADO DE TALUD",
      "ACARREO DE EXCAVACION",
      "EXCAVACION LOCALIZADA MANUAL",
      "RELLENO CON MATERIAL PROPIO",
      "RELLENO CON MATERIAL DE PRESTAMO",
      "ELIMINACIÓN DE DESMONTE Y DESPERDICIOS",
      "SARANDEO DE MATERIAL PROPIO"
    ]
  },
  "ENCOFRADO": {
    "ENCOFRADO": [
      "ENCOFRADO Y DESENCOFRADO DE CALZADURA (F1-PTARI)",
      "ENCOFRADO Y DESENCOFRADO DE FALSA ZAPATA",
      "ENCOFRADO Y DESENCOFRADO DE FALSA ZAPATA (DECANTADOR)",
      "ENCOFRADO Y DESENCOFRADO DE CIMIENTO (F1-PTARI)",
      "ENCOFRADO Y DESENCOFRADO DE COLUMNA H>3.5M (F1-PTARI)",
      "ENCOFRADO Y DESENCOFRADO DE PLACAS A DOBLE CARA (F1-PTARI)",
      "ENCOFRADO Y DESENCOFRADO DE PLACAS A UNA CARA (F1-PTARI)",
      "ENCOFRADO Y DESENCOFRADO DE VIGAS H=7.0mts (F1-PTARI)",
      "ENCOFRADO Y DESENCOFRADO DE LOSA MACIZA H=7.30M (F1-PTARI)",
      "ENCOFRADO DE FRISOS DE LOSA (F2 - NAVE)",
      "ENCOFRADO Y DESENCOFRADO DE MURO P/CANALETA (F2 - NAVE)",
      "ENCOFRADO Y DESENCOFRADO DE COLUMNA AMARRE CA1 (F2 - NAVE CTE)",
      "ENCOFRADO Y DESENCOFRADO DE VIGAS AMARRE (F2 - NAVE CTE)",
      "ENCOFRADO DE LOSAS ALIGERADAS (F2 - NAVE CTE)",
      "ENCOFRADO Y DESENCOFRADO DE PEDESTALES (F2)",
      "ENCOFRADO Y DESENCOFRADO DE BOZONES DE REBOSE"
    ],
    "APUNTALAMIENTO": []
  },
  "ESTRUCTURA METÁLICA": { "GENERAL": ["ESTRUCTURA METÁLICA"] },
  "IMPERMEABILIZACION": {
    "GENERAL": [
      "APLICACIÓN IMPERMEABILIZADO SIKAGUARD 63 CL",
      "APLICACIÓN DE IMPERMEABILIZADO INTERIOR MAPELASTIC - PLANISEAL",
      "COLOCACION DE MAPEBAND EN JUNTAS Y FISURAS"
    ]
  },
  "PINTURA": { "GENERAL": ["PINTURA"] },
  "OTROS": {
    "GENERAL": [
      "CHARLA DE INDUCCION", "DESCANSO", "SALIDA SINDICAL",
      "HORAS FERIADAS", "VIGIA", "MAESTRO"
    ]
  }
};

// ─────────────────────────────────────────────────────────────────
// DATA DE ACTIVIDADES
// un   = unidad | ipP = IP presupuesto | ipM = IP meta
// metP = metrado presupuesto total | metM = metrado meta total
// ─────────────────────────────────────────────────────────────────
export const DATA_ACTIVIDADES = {
  // ── TRABAJOS PRELIMINARES ─────────────────────────────────────
  "ALQUILER DE ANDAMIOS PARA TRABAJOS":
    { un:"GLB", ipP:30.00, ipM:25.00, metP:1,     metM:1     },
  "ALQUILER DE ANDAMIOS ESCALERAS PARA ACCESOS":
    { un:"MES", ipP:137.00,ipM:130.00,metP:3,     metM:3     },
  "ARMADO Y DESARMADO DE ANDAMIOS ESCALERAS PARA ACCESOS":
    { un:"GLB", ipP:137.00,ipM:130.00,metP:1,     metM:1     },
  "SEÑALIZACION TEMPORAL DE SEGURIDAD":
    { un:"GLB", ipP:96.00, ipM:90.00, metP:1,     metM:1     },
  "ILUMINACION DE ACCESOS Y FRENTES DE TRABAJO":
    { un:"GLB", ipP:16.00, ipM:12.00, metP:1,     metM:1     },
  "LIMPIEZA GENERAL Y PERMANENTE EN OBRA":
    { un:"MES", ipP:55.25, ipM:50.00, metP:4,     metM:4     },
  "TRAZO Y REPLANTEO TOPOGRAFICO":
    { un:"MES", ipP:311.76,  ipM:280,  metP:4,     metM:4     },
  "ACARREO VERTICAL DE ENCOFRADO PETARI Y MATERIALES C/ CAMION GRUA":
    { un:"DIA", ipP:0.00,  ipM:0.00,  metP:15,    metM:15    },
  "ACARREO HORIZONTAL Y VERTICAL DE MATERIALES":
    { un:"MES", ipP:172.80,ipM:180.00,metP:5,     metM:5     },

  // ── OBRAS PROVISIONALES ───────────────────────────────────────
  "MOVILIZACION Y DESMOVILIZACION DE MAQUINARIA, EQUIPOS Y HERRAMIENTAS":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:2,     metM:2     },
  "CASETA DE OFICINA (42 M2)":
    { un:"GLB", ipP:51.96, ipM:50.00, metP:1.02,  metM:1.02  },
  "CASETA DE SUPERVISIÓN (25M2)":
    { un:"GLB", ipP:51.43, ipM:51.43, metP:0.35,  metM:0.35  },
  "CASETA PARA ALMACEN DE HERRAMIENTAS, EQUIPOS Y MATERIALES(25M2)":
    { un:"GLB", ipP:51.75, ipM:50.00, metP:1.14,  metM:1.14  },
  "COMEDOR PARA PERSONAL OBRERO (60 M2: 50 Personas)":
    { un:"GLB", ipP:52.83, ipM:50.94, metP:0.53,  metM:0.53  },
  "VESTUARIO PARA PERSONAL OBRERO (30M2)":
    { un:"GLB", ipP:59.55, ipM:50.56, metP:0.89,  metM:0.89  },
  "INSTALACIONES PROVISIONALES DE IIEE":
    { un:"GLB", ipP:17.00, ipM:16.00, metP:1,     metM:1     },
  "INSTALACIONES PROVISIONALES DE IISS":
    { un:"GLB", ipP:17.00, ipM:16.00, metP:1,     metM:1     },
  "BAÑOS QUÍMICOS, LAVAMANOS PORTÁTILES y DUCHAS PORTÁTILES":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:1,     metM:1     },
  "CERCO PERIMETRICO INTERIOR":
    { un:"ML",  ipP:2.51,  ipM:2.51,  metP:31.5,  metM:31.5  },
  "CERCO PERIMETRICO ZONA DE TANQUES":
    { un:"M2",  ipP:1.36,  ipM:1.36,  metP:32.26, metM:32.26 },
  "PUERTA DE INGRESO Y ACCESO":
    { un:"M2",  ipP:58.00, ipM:58.00, metP:1,     metM:1     },
  "DEMOLICION DE LOSA EXISTENTE":
    { un:"M2",  ipP:0.00,  ipM:0.80,  metP:646.04,metM:646.04},
  "DEMOLICION DE MUROS DE LADRILLO CONFINADO":
    { un:"M2",  ipP:0.80,  ipM:0.80,  metP:240,   metM:240   },
  "DEMOLICION LOCALIZADA EN COLUMNAS":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:3.24,  metM:3.24  },
  "ELIMINACIÓN DE DESMONTE Y DESPERDICIOS":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:42.34, metM:42.34 },
  "LIMPIEZA EN INTERIOR DE TANQUES":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "COLOCADO DE LECHADA Y MALLA RASCHELL EN ZONA EXCAVADA":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "CALIDAD":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "APOYO A OTRAS OBRAS - PRECOTEX":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "EXCAVACION DE CALICATAS":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "CORTE DE LOSA CON EQUIPO":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "LIMPIEZA Y AMOLADO EN MURO DE TANQUE":
    { un:"M2",  ipP:0.53,  ipM:0.53,  metP:24.56, metM:24.56 },
  "HABILITADO DE TACOS DE CONCRETO":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },

  // ── CONCRETO SIMPLE ───────────────────────────────────────────
  "CONCRETO CICLOPEO 1:10 PARA CALZADURAS (HECHO EN OBRA)":
    { un:"M3",  ipP:8.57,  ipM:2.10,  metP:103.19,metM:103.19},
  "CONCRETO F'C= 100 KG/CM2 EN SOLADO (PREMEZCLADO) H=0.10 M":
    { un:"M3",  ipP:0.26,  ipM:0.27,  metP:380,   metM:380   },
  "CONCRETO FC=100kG/CM2 + 25 % PM FALSA ZAPATA":
    { un:"M3",  ipP:0.01,  ipM:2.10,  metP:174.97,metM:174.97},
  "COLOCACION DE CONCRETO EN FALSO MURO ENTRE TANQUES":
    { un:"M3",  ipP:2.23,  ipM:2.23,  metP:13.47, metM:13.47 },

  // ── CONCRETO ARMADO ───────────────────────────────────────────
  "CONCRETO F'C= 350 KG/CM2 EN LOSA (PREMEZCLADO)":
    { un:"M3",  ipP:1.30,  ipM:1.00,  metP:175.7, metM:175.7 },
  "CONCRETO F'C= 350 KG/CM2 EN VERTICALES (PREMEZCLADO)":
    { un:"M3",  ipP:1.45,  ipM:1.20,  metP:445.36,metM:445.36},
  "CONCRETO F'C= 280 KG/CM2 EN VIGAS (PREMEZCLADO)":
    { un:"M3",  ipP:1.29,  ipM:1.29,  metP:30.19, metM:30.19 },
  "CONCRETO F'C= 280 KG/CM2 EN LOSA (PREMEZCLADO)":
    { un:"M3",  ipP:1.32,  ipM:1.32,  metP:10.6,  metM:10.6  },
  "CONCRETO F'C=210 KG/CM2 (HECHO EN OBRA)":
    { un:"M3",  ipP:1.69,  ipM:1.69,  metP:1.18,  metM:1.18  },
  "CONCRETO F'C= 280 KG/CM2 EN LOSA (PREMEZCLADO) (F2 - NAVE)":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "CONCRETO F'C= 280 KG/CM2 EN LOSA MACISA (PREMEZCLADO) (F2 - NAVE)":
    { un:"M2",  ipP:0.00,  ipM:0.26,  metP:178.77,metM:178.77},
  "CONCRETO F'C= 210 KG/CM2 (PREMEZCLADO) EN ZAPATAS Y PEDESTALES (F2 - NAVE)":
    { un:"M3",  ipP:2.73,  ipM:0.26,  metP:15.38, metM:15.38 },
  "CONCRETO F'C= 210 KG/CM2 EN VERTICALES (PREMEZCLADO) (F2 - NAVE CTE)":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "CONCRETO F'C= 210 KG/CM2 EN VIGAS (PREMEZCLADO) (F2 - NAVE CTE)":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "CONCRETO F'C= 210 KG/CM2 EN LOSA (PREMEZCLADO) (F2 - NAVE CTE)":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },

  // ── ACERO ─────────────────────────────────────────────────────
  "HABILITADO DE ACERO":
    { un:"KG",  ipP:0.01,  ipM:0.01,  metP:94371.13, metM:94371.13 },
  "COLOCADO DE ACERO":
    { un:"KG",  ipP:0.02,  ipM:0.03,  metP:94371.13,metM:94371.13},

  // ── CURADO ────────────────────────────────────────────────────
  "CURADO":
    { un:"M2",  ipP:0.04,  ipM:0.02,  metP:3377.91,metM:3377.91 },

  // ── VARIOS ESTRUCTURA ─────────────────────────────────────────
  "COLOCACION DE JUNTA HIDRO EXPANSIVA 13X10 MM":
    { un:"ML",  ipP:0.03,  ipM:0.27,  metP:498.58,metM:498.58},
  "JUNTAS DE RETRACCION (JR) (F2 - NAVE)":
    { un:"ML",  ipP:0.00,  ipM:0.30,  metP:83.79, metM:83.79 },
  "JUNTAS DE AISLAMIENTO(JA) (F2 - NAVE)":
    { un:"ML",  ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },

  // ── BITUMEN ───────────────────────────────────────────────────
  "IMPERMEABILIZACION CON PINTURA BITUMINOSA":
    { un:"M2",  ipP:0.89,  ipM:0.55,  metP:394.06,metM:394.06},

  // ── CONTRAPISOS / PRUEBA ──────────────────────────────────────
  "CONTRAPISOS":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0,     metM:0     },
  "PRUEBA HIDRAULICA DE ESTANQUEIDAD":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:2000,  metM:2000  },

  // ── VARIOS ARQUITECTURA ───────────────────────────────────────
  "RECTIFICACIONES EN MUROS Y COLUMNAS":
    { un:"GLB", ipP:102.00,ipM:80.00, metP:1,     metM:1     },
  "SOLAQUEO EXTERIOR":
    { un:"M2",  ipP:0.57,  ipM:0.45,  metP:668.44,metM:668.44},
  "CONTRAZOCALO":
    { un:"ML",  ipP:0.81,  ipM:0.00,  metP:337.92,metM:337.92},

  // ── INSTALACIONES ─────────────────────────────────────────────
  "IIEE": { un:"M2",  ipP:0.00, ipM:0.00, metP:0, metM:0 },
  "IISS": { un:"M2",  ipP:0.00, ipM:0.00, metP:0, metM:0 },

  // ── MOVIMIENTO DE TIERRAS ─────────────────────────────────────
  "MOVILIZACION Y DESMOVILIZACIÓN DE EQUIPOS PARA MOV DE TIERRAS":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:1,      metM:1      },
  "MITIGACIÓN DE POLVO DURANTE EL MOVIMIENTO DE TIERRAS":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:1,      metM:1      },
  "EXCAVACION MASIVA":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:2854.40,metM:2854.40},
  "EXCAVACIÓN LOCALIZADA C/ EQUIPO":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:42.52,  metM:42.52  },
  "NIVELACION Y COMPACTACION DE SUBRASANTE":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:400,    metM:400    },
  "NIVELACION Y COMPACTACION DE SUBRASANTE (DECANTADOR)":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:47.8,   metM:47.8   },
  "PERFILADO DE EXCAVACION LOCALIZADA C/EQUIPO":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:191.55, metM:191.55 },
  "PERFILADO DE TALUD":
    { un:"M2",  ipP:0.40,  ipM:0.40,  metP:77,     metM:77     },
  "ACARREO DE EXCAVACION":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:134.15, metM:134.15 },
  "EXCAVACION LOCALIZADA MANUAL":
    { un:"M3",  ipP:2.70,  ipM:2.70,  metP:138.74, metM:138.74 },
  "RELLENO CON MATERIAL PROPIO":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:158.4,  metM:158.4  },
  "RELLENO CON MATERIAL DE PRESTAMO":
    { un:"M3",  ipP:0.28,  ipM:0.00,  metP:528.14, metM:528.14 },
  "SARANDEO DE MATERIAL PROPIO":
    { un:"M3",  ipP:0.00,  ipM:0.00,  metP:0,      metM:0      },

  // ── ENCOFRADO ─────────────────────────────────────────────────
  "ENCOFRADO Y DESENCOFRADO DE CALZADURA (F1-PTARI)":
    { un:"M2",  ipP:2.50,  ipM:0.50,  metP:243.46, metM:243.46 },
  "ENCOFRADO Y DESENCOFRADO DE FALSA ZAPATA":
    { un:"M2",  ipP:1.39,  ipM:1.28,  metP:64.23,  metM:64.23  },
  "ENCOFRADO Y DESENCOFRADO DE FALSA ZAPATA (DECANTADOR)":
    { un:"M2",  ipP:1.38,  ipM:1.27,  metP:86.79,  metM:86.79  },
  "ENCOFRADO Y DESENCOFRADO DE CIMIENTO (F1-PTARI)":
    { un:"M2",  ipP:0.99,  ipM:1.43,  metP:68.43,  metM:68.43  },
  "ENCOFRADO Y DESENCOFRADO DE COLUMNA H>3.5M (F1-PTARI)":
    { un:"M2",  ipP:1.15,  ipM:1.00,  metP:82.8,   metM:82.8   },
  "ENCOFRADO Y DESENCOFRADO DE PLACAS A DOBLE CARA (F1-PTARI)":
    { un:"M2",  ipP:1.42,  ipM:1.15,  metP:1892.64,metM:1892.64},
  "ENCOFRADO Y DESENCOFRADO DE PLACAS A UNA CARA (F1-PTARI)":
    { un:"M2",  ipP:1.42,  ipM:1.42,  metP:499.66, metM:499.66 },
  "ENCOFRADO Y DESENCOFRADO DE VIGAS H=7.0mts (F1-PTARI)":
    { un:"M2",  ipP:2.25,  ipM:1.85,  metP:192,    metM:192    },
  "ENCOFRADO Y DESENCOFRADO DE LOSA MACIZA H=7.30M (F1-PTARI)":
    { un:"M2",  ipP:1.09,  ipM:1.00,  metP:53,     metM:53     },
  "ENCOFRADO DE FRISOS DE LOSA (F2 - NAVE)":
    { un:"ML",  ipP:0.00,  ipM:0.00,  metP:26.88,  metM:26.88  },
  "ENCOFRADO Y DESENCOFRADO DE MURO P/CANALETA (F2 - NAVE)":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0,      metM:0      },
  "ENCOFRADO Y DESENCOFRADO DE COLUMNA AMARRE CA1 (F2 - NAVE CTE)":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0,      metM:0      },
  "ENCOFRADO Y DESENCOFRADO DE VIGAS AMARRE (F2 - NAVE CTE)":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0,      metM:0      },
  "ENCOFRADO DE LOSAS ALIGERADAS (F2 - NAVE CTE)":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0,      metM:0      },
  "ENCOFRADO Y DESENCOFRADO DE PEDESTALES (F2)":
    { un:"M2",  ipP:1.13,  ipM:1.13,  metP:36.31,  metM:36.31  },
  "ENCOFRADO Y DESENCOFRADO DE BOZONES DE REBOSE":
    { un:"M2",  ipP:1.16,  ipM:1.16,  metP:14.64,  metM:14.64  },

  // ── ESTRUCTURA METÁLICA / IMPERMEABILIZACION / PINTURA ────────
  "ESTRUCTURA METÁLICA":
    { un:"GLB", ipP:0.00,  ipM:0.00,  metP:0, metM:0 },
  "APLICACIÓN IMPERMEABILIZADO SIKAGUARD 63 CL":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0, metM:0 },
  "APLICACIÓN DE IMPERMEABILIZADO INTERIOR MAPELASTIC - PLANISEAL":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0, metM:0 },
  "COLOCACION DE MAPEBAND EN JUNTAS Y FISURAS":
    { un:"ML",  ipP:0.00,  ipM:0.00,  metP:0, metM:0 },
  "PINTURA":
    { un:"M2",  ipP:0.00,  ipM:0.00,  metP:0, metM:0 },

  // ── OTROS ─────────────────────────────────────────────────────
  "CHARLA DE INDUCCION": { un:"GLB", ipP:0, ipM:0, metP:0, metM:0 },
  "DESCANSO":            { un:"GLB", ipP:0, ipM:0, metP:0, metM:0 },
  "SALIDA SINDICAL":     { un:"GLB", ipP:0, ipM:0, metP:0, metM:0 },
  "HORAS FERIADAS":      { un:"GLB", ipP:0, ipM:0, metP:0, metM:0 },
  "VIGIA":               { un:"GLB", ipP:0, ipM:0, metP:0, metM:0 },
  "MAESTRO":             { un:"GLB", ipP:0, ipM:0, metP:0, metM:0 },

  // ── FALLBACK ──────────────────────────────────────────────────
  "DEFAULT": { un:"UND", ipP:1.00, ipM:1.00, metP:0, metM:0 }
};

// ─────────────────────────────────────────────────────────────────
// INFO_MAP: acceso O(1) — evita recalcular en App.jsx
// ─────────────────────────────────────────────────────────────────
export const INFO_MAP = Object.keys(DATA_ACTIVIDADES).reduce((acc, k) => {
  acc[k.trim().toUpperCase()] = DATA_ACTIVIDADES[k];
  return acc;
}, {});

// ─────────────────────────────────────────────────────────────────
// CUADRILLAS MAESTRAS
// ─────────────────────────────────────────────────────────────────
export const CUADRILLAS_MAESTRAS = {
  "Capataz 1": ["Oficial 1", "Operario 1", "Ayudante 1", "Ayudante 2"],
  "Capataz 2": ["Oficial 2", "Operario 2", "Ayudante 3", "Ayudante 4"],
  "Capataz 3": ["Oficial 3", "Operario 3", "Ayudante 5", "Ayudante 6"]
};

export const JORNADA_LEGAL         = 8.5;   // tope de HN lun-vie
export const JORNADA_SABADO        = 5.5;   // tope de HN el sábado (media jornada)
export const FECHA_INICIO_PROYECTO = new Date("2025-11-03T00:00:00");