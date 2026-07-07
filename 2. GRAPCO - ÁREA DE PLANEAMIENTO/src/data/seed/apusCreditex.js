// src/data/seed/apusCreditex.js
// Catálogo de APUs CREDITEX PTARI (obras provisionales + movimiento de tierras + concreto).
// RAW = estructura tal como la entregó el presupuesto. transformarAPU() la convierte
// al esquema Firestore que consume APUEditor / calcularCostoAPU.
//
// Reglas de mapeo:
//  - Items con unidad "HH"  → Mano de Obra (categoria = descripción).
//    Nota: PEON ya no es un cargo del sistema (solo Capataz/Operario/Oficial/Ayudante);
//    los items históricos cargados como PEON se mapean a AYUDANTE en CAT_MAP.
//  - Items con unidad "%MO" → Equipo (herramienta manual): hm=1, tarifa=precio.
//  - tipo Materiales        → Materiales { descripcion, cantidad, unidad, precio }.
//  - tipo Equipo(s)         → Equipos { descripcion, hm=cantidad, tarifa=precio }.
//  - tipo Subcontrato(s)    → Subcontratos { descripcion, subtotal = cantidad×precio }.
//  - aportes = 1.0 (los precios de MO ya vienen con leyes sociales incluidas).

export const APUS_CREDITEX_RAW = [
  { nombre: "MOVILIZACION Y DESMOVILIZACION DE MAQUINARIA, EQUIPOS Y HERRAMIENTAS", unidad: "GLB", precio_unitario: 16685.67, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "SC SERVICIO DE TRANSPORTE A OBRA GRAPCO", unidad: "VJE", cantidad: 2, precio: 1870.82 },
      { descripcion: "SC SERVICIO DE TRANSPORTE DE ENCOFRADO (FRENTE 1)", unidad: "VJE", cantidad: 4, precio: 2022.51 },
      { descripcion: "SC SERVICIO DE TRANSPORTE DE ANDAMIOS DE TERCEROS", unidad: "VJE", cantidad: 6, precio: 809.00 },
    ]},
  ]},
  { nombre: "CERCO PERIMETRICO CON PANELES METALICOS EN FACHADA H=2.40m y MALLA RASHEL", unidad: "ML", precio_unitario: 215.04, rendimiento_diario: 20, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.0400, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.8000, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 0.4000, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "SC CERCO PERIMETRICO PROVISIONAL", unidad: "ML", cantidad: 1, precio: 173.36 },
      { descripcion: "PALOS DE EUCALIPTO L=5 MTS", unidad: "UND", cantidad: 0.2000, precio: 30.34 },
      { descripcion: "MALLA RASCHELL 80% 4.2 X 100ML VERDE WERKEN", unidad: "ROLLO", cantidad: 0.0100, precio: 770.48 },
      { descripcion: "ALAMBRE N°8", unidad: "KG", cantidad: 1, precio: 3.39 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 1.58 },
    ]},
  ]},
  { nombre: "CASETA DE OFICINA (42 M2)", unidad: "GLB", precio_unitario: 7451.02, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 4, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 24, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 24, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "MODULO DE 42M2 DE MADERA EN OSB O BOLAINA CON TECHO DE FIBRAFORTE, PTAS, VENTANAS. INCLUYE INSTALACION", unidad: "M2", cantidad: 42, precio: 50.56 },
      { descripcion: "SALIDAS DE TOMACORRIENTES Y CENTROS DE LUZ", unidad: "UND", cantidad: 10, precio: 91.01 },
      { descripcion: "LUMINARIA TUBO LED 1x18W CON LAMPARA", unidad: "PTO", cantidad: 2, precio: 85.96 },
      { descripcion: "MOBILIARIO (ESCRITORIOS, ESTANTES, MESAS)", unidad: "UND", cantidad: 4, precio: 182.03 },
    ]},
    { tipo: "Subcontrato", items: [
      { descripcion: "SC SUMINISTRO E INSTALACION TABLERO ELECTICO 12P + 02 INT. TERMOMAGNETICO", unidad: "GLB", cantidad: 1, precio: 227.09 },
      { descripcion: "SC LOSA PROVISIONAL DE CONCRETO e=3\"", unidad: "M2", cantidad: 42, precio: 35.39 },
      { descripcion: "SC DEMOLICIÓN Y ELIMINACIÓN DE LOSA PROVISIONAL DE CONCRETO e=3\"", unidad: "M2", cantidad: 42, precio: 11.17 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 63.54 },
    ]},
  ]},
  { nombre: "CASETA DE SUPERVISIÓN (25M2)", unidad: "GLB", precio_unitario: 5253.72, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 4, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 24, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 24, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "MODULO DE 42M2 DE MADERA EN OSB O BOLAINA CON TECHO DE FIBRAFORTE, PTAS, VENTANAS. INCLUYE INSTALACION", unidad: "M2", cantidad: 25, precio: 50.56 },
      { descripcion: "SALIDAS DE TOMACORRIENTES Y CENTROS DE LUZ", unidad: "UND", cantidad: 6, precio: 91.01 },
      { descripcion: "LUMINARIA TUBO LED 1x18W CON LAMPARA", unidad: "PTO", cantidad: 2, precio: 85.96 },
      { descripcion: "MOBILIARIO (ESCRITORIOS, ESTANTES, MESAS)", unidad: "UND", cantidad: 3, precio: 182.03 },
    ]},
    { tipo: "Subcontrato", items: [
      { descripcion: "SC SUMINISTRO E INSTALACION TABLERO ELECTICO 12P + 02 INT. TERMOMAGNETICO", unidad: "GLB", cantidad: 1, precio: 227.09 },
      { descripcion: "SC LOSA PROVISIONAL DE CONCRETO e=3\"", unidad: "M2", cantidad: 25, precio: 35.39 },
      { descripcion: "SC DEMOLICION Y ELIMINACION DE LOSA PROVISIONAL DE CONCRETO", unidad: "M2", cantidad: 25, precio: 11.17 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 63.54 },
    ]},
  ]},
  { nombre: "CASETA PARA ALMACEN DE HERRAMIENTAS, EQUIPOS Y MATERIALES (25M2)", unidad: "GLB", precio_unitario: 2997.36, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 4, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 24, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 24, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "CASETA PARA ALMACEN", unidad: "M2", cantidad: 25, precio: 50.56 },
      { descripcion: "LUMINARIA TUBO LED 1x18W CON LAMPARA", unidad: "PTO", cantidad: 2, precio: 85.96 },
    ]},
    { tipo: "Subcontrato", items: [
      { descripcion: "SC SUMINISTRO E INSTALACION TABLERO ELECTICO 12P + 02 INT. TERMOMAGNETICO", unidad: "GLB", cantidad: 1, precio: 227.09 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 63.54 },
    ]},
  ]},
  { nombre: "COMEDOR PARA PERSONAL OBRERO (40 M2: 50 Personas)", unidad: "GLB", precio_unitario: 7403.39, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 4, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 24, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 24, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "COMEDOR PARA PERSONAL OBRERO", unidad: "M2", cantidad: 40, precio: 50.56 },
      { descripcion: "MESAS P/ COMEDOR", unidad: "UND", cantidad: 12, precio: 78.37 },
      { descripcion: "SILLAS P/ COMEDOR", unidad: "UND", cantidad: 50, precio: 15.17 },
      { descripcion: "LUMINARIA TUBO LED 1x18W CON LAMPARA", unidad: "PTO", cantidad: 3, precio: 85.96 },
    ]},
    { tipo: "Subcontrato", items: [
      { descripcion: "SC SUMINISTRO E INSTALACION TABLERO ELECTICO 12P + 02 INT. TERMOMAGNETICO", unidad: "GLB", cantidad: 1, precio: 227.09 },
      { descripcion: "SC LOSA PROVISIONAL DE CONCRETO e=3\"", unidad: "M2", cantidad: 40, precio: 35.39 },
      { descripcion: "SC DEMOLICION Y ELIMINACION DE LOSA PROVISIONAL DE CONCRETO", unidad: "M2", cantidad: 40, precio: 11.17 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 63.54 },
    ]},
  ]},
  { nombre: "VESTUARIO PARA PERSONAL OBRERO", unidad: "GLB", precio_unitario: 5899.07, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 4, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 32, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 24, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "VESTUARIO PARA PERSONAL OBRERO", unidad: "M2", cantidad: 30, precio: 50.56 },
      { descripcion: "LOCKERS DE 9 CASILLEROS (2DO USO)", unidad: "UND", cantidad: 5, precio: 252.81 },
    ]},
    { tipo: "Subcontrato", items: [
      { descripcion: "SC SUMINISTRO E INSTALACION TABLERO ELECTICO 12P + 02 INT. TERMOMAGNETICO", unidad: "GLB", cantidad: 1, precio: 227.09 },
      { descripcion: "SC LOSA PROVISIONAL DE CONCRETO e=3\"", unidad: "M2", cantidad: 30, precio: 35.39 },
      { descripcion: "SC DEMOLICION Y ELIMINACION DE LOSA PROVISIONAL DE CONCRETO", unidad: "M2", cantidad: 30, precio: 11.17 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 63.54 },
    ]},
  ]},
  { nombre: "INSTALACIONES PROVISIONALES DE IIEE", unidad: "GLB", precio_unitario: 4543.37, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.8000, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 8, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 8, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "TABLERO ELECTRICO GENERAL", unidad: "UND", cantidad: 1, precio: 455.06 },
      { descripcion: "TABLEROS ELECTRICOS SECUNDARIOS", unidad: "UND", cantidad: 3, precio: 353.94 },
      { descripcion: "CABLE VULCANIZADO ROLLO 100ML", unidad: "ROLL", cantidad: 4, precio: 485.40 },
      { descripcion: "ACCESORIOS ELECTRICOS", unidad: "GLB", cantidad: 1, precio: 657.31 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 20.36 },
    ]},
  ]},
  { nombre: "INSTALACIONES PROVISIONALES DE IISS", unidad: "GLB", precio_unitario: 1504.55, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.8000, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 8, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 8, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "CISTERNA ROTOPLAS 2.8M3", unidad: "UND", cantidad: 1, precio: 303.38 },
      { descripcion: "ELECTROBOMBA MONOFASICA 3/4 HP", unidad: "UND", cantidad: 1, precio: 202.25 },
      { descripcion: "MATERIALES PARA IISS", unidad: "UND", cantidad: 1, precio: 571.36 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 20.36 },
    ]},
  ]},
  { nombre: "BAÑOS QUÍMICOS, LAVAMANOS PORTÁTILES y DUCHAS PORTÁTILES", unidad: "GLB", precio_unitario: 4677.04, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontrato", items: [
      { descripcion: "SERVICIOS HIGIENICOS", unidad: "UND", cantidad: 2, precio: 328.66 },
      { descripcion: "SERVICIOS HIGIENICOS", unidad: "UND", cantidad: 3, precio: 328.66 },
      { descripcion: "DUCHAS PORTÁTILES", unidad: "UND", cantidad: 2, precio: 308.43 },
      { descripcion: "DUCHAS PORTÁTILES", unidad: "UND", cantidad: 3, precio: 308.43 },
      { descripcion: "SERVICIOS LAVAMANOS QUIMICO", unidad: "UND", cantidad: 2, precio: 298.32 },
      { descripcion: "SERVICIOS LAVAMANOS QUIMICO", unidad: "UND", cantidad: 3, precio: 298.32 },
    ]},
  ]},
  { nombre: "TRAZO Y REPLANTEO TOPOGRAFICO", unidad: "GLB", precio_unitario: 10278.34, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 207.8400, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 103.9200, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "ESTACION TOTAL", unidad: "MES", cantidad: 1, precio: 2407.75 },
    ]},
  ]},
  { nombre: "ALQUILER DE ANDAMIOS PARA TRABAJOS", unidad: "GLB", precio_unitario: 3992.02, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 15, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 15, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "ALQUILER DE ANDAMIOS GRAPCO (ACROW)", unidad: "CUERPO/MES", cantidad: 2, precio: 433.39 },
      { descripcion: "ALQUILER DE ANDAMIO COLGANTE I=3mts", unidad: "MES", cantidad: 1, precio: 2407.75 },
    ]},
  ]},
  { nombre: "ARMADO Y DESARMADO DE ANDAMIOS ESCALERAS Y PUENTE PARA ACCESOS", unidad: "GLB", precio_unitario: 3278.69, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.8500, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 68, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 68, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 163.93 },
    ]},
  ]},
  { nombre: "ALQUILER DE ANDAMIOS ESCALERAS PARA ACCESOS", unidad: "GLB", precio_unitario: 0, rendimiento_diario: 1, recursos: [] },
  { nombre: "SEÑALIZACION TEMPORAL DE SEGURIDAD", unidad: "GLB", precio_unitario: 3808.72, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 96, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "CINTAS DE SEGURIDAD", unidad: "ROLL", cantidad: 5, precio: 28.32 },
      { descripcion: "MALLA NARANJA DE SEGURIDAD", unidad: "ROLL", cantidad: 5, precio: 60.68 },
      { descripcion: "MANTA PLASTICA", unidad: "ROLL", cantidad: 1, precio: 394.39 },
      { descripcion: "SEÑALIZACIONES", unidad: "GLB", cantidad: 1, precio: 353.94 },
      { descripcion: "PALOS DE EUCALIPTO L=5 MTS", unidad: "UND", cantidad: 20, precio: 30.34 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 95.65 },
    ]},
  ]},
  { nombre: "ILUMINACION DE ACCESOS Y FRENTES DE TRABAJO", unidad: "GLB", precio_unitario: 2272.61, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 8, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 8, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "REFLECTOR DE 200 watts", unidad: "UND", cantidad: 2, precio: 404.50 },
      { descripcion: "CABLE VULCANIZADO ROLLO 100ML", unidad: "ROLL", cantidad: 2, precio: 485.40 },
      { descripcion: "PALOS DE EUCALIPTO L=5 MTS", unidad: "UND", cantidad: 3, precio: 30.34 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 19.13 },
    ]},
  ]},
  { nombre: "MITIGACION DE POLVO PARA EL PROYECTO", unidad: "MES", precio_unitario: 0, rendimiento_diario: 1, recursos: [] },
  { nombre: "LIMPIEZA GENERAL Y PERMANENTE EN OBRA", unidad: "MES", precio_unitario: 1192.01, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 55.2500, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 91.01 },
    ]},
  ]},
  { nombre: "ACARREO VERTICAL DE ENCOFRADO PETARI Y MATERIALES C/ CAMION GRUA", unidad: "GLB", precio_unitario: 2157.34, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "ALQUILER CAMION GRUA(dia 8 HM)", unidad: "DIA", cantidad: 1, precio: 2157.34 },
    ]},
  ]},
  { nombre: "ACARREO HORIZONTAL Y VERTICAL DE MATERIALES", unidad: "MES", precio_unitario: 4519.55, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 216, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 215.22 },
    ]},
  ]},
  { nombre: "DEMOLICION DE LOSA EXISTENTE", unidad: "M2", precio_unitario: 21.88, rendimiento_diario: 50, recursos: [
    { tipo: "Equipos", items: [
      { descripcion: "MINICARGADOR CON MARTILLO ROMPEPAV", unidad: "HM", cantidad: 0.1700, precio: 128.70 },
    ]},
  ]},
  { nombre: "DEMOLICION DE MUROS DE LADRILLO CONFINADOS", unidad: "M2", precio_unitario: 37.11, rendimiento_diario: 20, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.8000, precio: 27.90 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "MARTILLO ELECTRICO", unidad: "HM", cantidad: 0.8000, precio: 9.19 },
      { descripcion: "ALQUILER DE ANDAMIOS GRAPCO (ACRO)", unidad: "CUERPO/MES", cantidad: 0.0500, precio: 126.41 },
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 1.12 },
    ]},
  ]},
  { nombre: "DEMOLICION LOCALIZADA EN COLUMNAS", unidad: "M3", precio_unitario: 218.13, rendimiento_diario: 1.5, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 5.6667, precio: 27.90 },
    ]},
    { tipo: "Equipos", items: [
      { descripcion: "MARTILLO ELECTRICO", unidad: "HM", cantidad: 5.6667, precio: 9.19 },
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 7.91 },
    ]},
  ]},
  { nombre: "MOVILIZACION Y DESMOVILIZACIÓN DE EQUIPOS PARA MOV DE TIERRAS", unidad: "GLB", precio_unitario: 5874.90, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "MOVILIZACION Y DESMOVILIZACIÓN DE EXCAVADORA NEUM", unidad: "VEZ", cantidad: 3, precio: 1444.65 },
      { descripcion: "MOV. Y DESMOV. HIAB", unidad: "VEZ", cantidad: 1, precio: 770.48 },
      { descripcion: "MOV. Y DESMOV. MINIRETROEXCAV.", unidad: "VEZ", cantidad: 1, precio: 770.48 },
    ]},
  ]},
  { nombre: "EXCAVACION MASIVA", unidad: "M3", precio_unitario: 5.52, rendimiento_diario: 120, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "SC EXCAVACIÓN MASIVA CON EQUIPO PESADO", unidad: "M2", cantidad: 1, precio: 5.52 },
    ]},
  ]},
  { nombre: "EXCAVACIÓN LOCALIZADA C/ EQUIPO", unidad: "M3", precio_unitario: 21.47, rendimiento_diario: 3.5, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "SC EXCAVACIÓN LOCALIZADA C/ EQUIPO", unidad: "M3", cantidad: 1, precio: 21.47 },
    ]},
  ]},
  { nombre: "EXCAVACIÓN LOCALIZADA MANUAL", unidad: "M3", precio_unitario: 64.02, rendimiento_diario: 3, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.2667, precio: 30.70 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 2.6667, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 2.70 },
    ]},
  ]},
  { nombre: "ACARREO DE EXCAVACION", unidad: "M3", precio_unitario: 26.84, rendimiento_diario: 6.5, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 1.3077, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTAS MANUALES", unidad: "%MO", cantidad: 0.03, precio: 0.78 },
    ]},
  ]},
  { nombre: "NIVELACION Y COMPACTACION DE SUBRASANTE", unidad: "M2", precio_unitario: 4.85, rendimiento_diario: 150, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "SC NIVELACION Y COMPACTACION DE SUBRASANTE", unidad: "M2", cantidad: 1, precio: 4.85 },
    ]},
  ]},
  { nombre: "PERFILADO DE EXCAVACION LOCALIZADA C/EQUIPO", unidad: "M3", precio_unitario: 12.07, rendimiento_diario: 15, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 0.5667, precio: 19.93 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTAS MANUALES", unidad: "%MO", cantidad: 0.03, precio: 0.78 },
    ]},
  ]},
  { nombre: "RELLENO CON MATERIAL PROPIO", unidad: "M3", precio_unitario: 35.39, rendimiento_diario: 30, recursos: [
    { tipo: "Subcontratos", items: [
      { descripcion: "SC RELLENO MASIVO CON EQUIPO / MATERIAL PROPIO", unidad: "M3", cantidad: 1, precio: 35.39 },
    ]},
  ]},
  { nombre: "RELLENO CON MATERIAL DE PRESTAMO", unidad: "M3", precio_unitario: 76.42, rendimiento_diario: 30, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.2833, precio: 27.90 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "AFIRMADO", unidad: "M3", cantidad: 1.0500, precio: 55.00 },
      { descripcion: "GASOLINA", unidad: "GLN", cantidad: 0.1333, precio: 18.2026 },
    ]},
    { tipo: "Equipo", items: [
      { descripcion: "RODILLO CHUPETERO", unidad: "HM", cantidad: 0.2833, precio: 29.4118 },
    ]},
  ]},
  { nombre: "ELIMINACIÓN DE DESMONTE Y DESPERDICIOS", unidad: "M3", precio_unitario: 30.34, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontrato", items: [
      { descripcion: "SC ELIMINACION DE DESMONTE Y/O EXCEDENTES", unidad: "M3", cantidad: 1, precio: 30.34 },
    ]},
  ]},
  { nombre: "ELIMINACION DE EXCAVACION MASIVA (INCLUYE ESPOJAMIENTO 30%)", unidad: "M3", precio_unitario: 30.34, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontrato", items: [
      { descripcion: "SC ELIMINACION DE DESMONTE Y/O EXCEDENTES", unidad: "M3", cantidad: 1, precio: 30.34 },
    ]},
  ]},
  { nombre: "BARANDAS PARA VACIADO", unidad: "ML", precio_unitario: 27.43, rendimiento_diario: 1, recursos: [
    { tipo: "Subcontrato", items: [
      { descripcion: "SC DE BARANDAS PARA VACIADO", unidad: "ML", cantidad: 1, precio: 27.43 },
    ]},
  ]},
  { nombre: "HABILITADO Y COLOCADO DE ACERO", unidad: "KG", precio_unitario: 5.24, rendimiento_diario: 330, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.0024, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.0242, precio: 27.90 },
      { descripcion: "OFICIAL", unidad: "HH", cantidad: 0.0242, precio: 22.03 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "ACERO DE REFUERZO EN VARILLAS", unidad: "KG", cantidad: 1.0500, precio: 3.20 },
      { descripcion: "ALAMBRE N°16", unidad: "KG", cantidad: 0.0300, precio: 3.26 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "TRONSADORA", unidad: "HM", cantidad: 0.0242, precio: 9.29 },
      { descripcion: "DISCO DE CORTE DE ACERO 14\"", unidad: "UND", cantidad: 0.0121, precio: 17.14 },
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 0.06 },
    ]},
  ]},
  { nombre: "CONCRETO F'C= 100 KG/CM2 EN SOLADO (PREMECZCLADO) H=0.10 M", unidad: "M2", precio_unitario: 31.22, rendimiento_diario: 30, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.0037, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.0739, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 0.1848, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "CONCRETO PREMECZCLADO F'C=100 KG/CM2", unidad: "M3", cantidad: 0.1000, precio: 246.75 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 0.29 },
      { descripcion: "VIBRADOR PARA CONCRETO", unidad: "HM", cantidad: 0.0370, precio: 10.62 },
    ]},
  ]},
  { nombre: "CONCRETO CICLOPEO 1:10 PARA CALZADURAS (HECHO EN OBRA)", unidad: "M3", precio_unitario: 378.65, rendimiento_diario: 12, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.0708, precio: 29.56 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 2.8333, precio: 26.88 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 5.6667, precio: 19.19 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "PIEDRA CHANCADA 1\"", unidad: "M3", cantidad: 0.5250, precio: 69.54 },
      { descripcion: "ARENA GRUESA", unidad: "M3", cantidad: 0.3750, precio: 46.02 },
      { descripcion: "CEMENTO PORTLAND TIPO I (42.5KG)", unidad: "BLS", cantidad: 3.5000, precio: 29.22 },
      { descripcion: "PIEDRA GRANDE DE 6\"", unidad: "M3", cantidad: 0.2500, precio: 66.47 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 9.35 },
      { descripcion: "MEZCLADORA DE CONCRETO 20-35HP 16P3", unidad: "HM", cantidad: 0.7083, precio: 13.64 },
    ]},
  ]},
  { nombre: "CONCRETO F'C= 350 KG/CM2 EN LOSA (PREMECZCLADO)", unidad: "M3", precio_unitario: 448.78, rendimiento_diario: 40, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.0213, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.4250, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 0.8500, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "CONCRETO PREMECZCLADO F'C=350 KG/CM2 / P57 /4\"-6\" w/c: 0.4", unidad: "M3", cantidad: 1.0500, precio: 352.47 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 1.47 },
      { descripcion: "VIBRADOR PARA CONCRETO", unidad: "HM", cantidad: 0.2125, precio: 10.62 },
      { descripcion: "SERVICIO BOMBA", unidad: "M3", cantidad: 1, precio: 45.51 },
    ]},
  ]},
  { nombre: "CONCRETO F'C= 350 KG/CM2 EN VERTICALES (PREMECZCLADO)", unidad: "M3", precio_unitario: 453.91, rendimiento_diario: 30, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "CAPATAZ", unidad: "HH", cantidad: 0.0283, precio: 30.70 },
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.5667, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 0.8500, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "CONCRETO PREMECZCLADO F'C=350 KG/CM2 / P57 /4\"-6\" w/c: 0.4", unidad: "M3", cantidad: 1.0500, precio: 352.47 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 1.68 },
      { descripcion: "VIBRADOR PARA CONCRETO", unidad: "HM", cantidad: 0.2833, precio: 10.62 },
      { descripcion: "SERVICIO BOMBA", unidad: "M3", cantidad: 1, precio: 45.51 },
    ]},
  ]},
  { nombre: "CURADO DE CONCRETO", unidad: "M2", precio_unitario: 0, rendimiento_diario: 1, recursos: [] },
  { nombre: "ENCOFRADO Y DESENCOFRADO DE CIMIENTO", unidad: "M2", precio_unitario: 58.31, rendimiento_diario: 12, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 0.7083, precio: 26.88 },
      { descripcion: "OFICIAL", unidad: "HH", cantidad: 0.7083, precio: 21.21 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "ALAMBRE N°8", unidad: "KG", cantidad: 0.2600, precio: 3.39 },
      { descripcion: "CLAVOS", unidad: "KG", cantidad: 0.1300, precio: 3.32 },
      { descripcion: "CINTA MASKINTAPE PROFESIONAL 3/4\" 50M", unidad: "UND", cantidad: 0.0100, precio: 10.62 },
      { descripcion: "MADERA ANDAMIAJE", unidad: "P2", cantidad: 0.1000, precio: 9.91 },
      { descripcion: "DESMOLDANTE", unidad: "GLN", cantidad: 0.0025, precio: 156.74 },
    ]},
    { tipo: "Subcontrato", items: [
      { descripcion: "ALQUILER DE EQUIPO ENCOFRADO P/MUROS A DOBLE CARA", unidad: "M2", cantidad: 1, precio: 9.28 },
      { descripcion: "CONSUMIBLES EN MUROS (WATER STOP DE PASANTES)", unidad: "M2", cantidad: 1, precio: 12.17 },
    ]},
  ]},
  { nombre: "RECTIFICACION DE MUROS Y COLUMNAS", unidad: "M2", precio_unitario: 3524.67, rendimiento_diario: 1, recursos: [
    { tipo: "Mano de Obra", items: [
      { descripcion: "OPERARIO", unidad: "HH", cantidad: 51, precio: 27.90 },
      { descripcion: "AYUDANTE", unidad: "HH", cantidad: 51, precio: 19.93 },
    ]},
    { tipo: "Materiales", items: [
      { descripcion: "SIKAREP", unidad: "BLS", cantidad: 10, precio: 96.31 },
      { descripcion: "ARENA FINA", unidad: "M3", cantidad: 0.003346, precio: 46.01 },
    ]},
    { tipo: "Equipos y Herramientas", items: [
      { descripcion: "HERRAMIENTA MANUAL 5%", unidad: "%MO", cantidad: 5, precio: 121.97 },
    ]},
  ]},
];

// PEON ya no es un cargo del sistema. CAT_MAP se conserva como red de
// compatibilidad por si llegan datos legacy con PEON: se traducen a AYUDANTE.
const CAT_MAP = { PEON: 'AYUDANTE', CAPATAZ: 'CAPATAZ', OPERARIO: 'OPERARIO', OFICIAL: 'OFICIAL', AYUDANTE: 'AYUDANTE' };

const norm = (s) => (s || '').toString().trim().toUpperCase();

// ── Catálogo de categorías de APU (orden de obra civil peruana) ──
export const CATEGORIAS_APU = [
  { id: 'OBRAS_PROVISIONALES', label: 'Obras Provisionales', icono: '🏕️', color: '#0891b2' },
  { id: 'TRABAJOS_PRELIMINARES', label: 'Trabajos Preliminares', icono: '📐', color: '#6366f1' },
  { id: 'MOVIMIENTO_TIERRAS', label: 'Movimiento de Tierras', icono: '⛏️', color: '#a16207' },
  { id: 'DEMOLICIONES', label: 'Demoliciones', icono: '🔨', color: '#dc2626' },
  { id: 'CONCRETO', label: 'Obras de Concreto', icono: '🏛️', color: '#475569' },
  { id: 'ACERO', label: 'Acero de Refuerzo', icono: '🔩', color: '#7c3aed' },
  { id: 'ENCOFRADO', label: 'Encofrado', icono: '🪵', color: '#b45309' },
  { id: 'OTROS', label: 'Otros / Sin clasificar', icono: '📦', color: '#64748b' },
];

// Clasifica un APU por su descripción usando palabras clave.
export function clasificarAPU(descripcion) {
  const d = norm(descripcion);
  if (!d) return 'OTROS';
  if (/(ENCOFRADO|DESENCOFRADO)/.test(d)) return 'ENCOFRADO';
  if (/(\bACERO\b|HABILITADO Y COLOCADO DE ACERO|REFUERZO)/.test(d)) return 'ACERO';
  if (/(DEMOLICION|DEMOLICIÓN)/.test(d)) return 'DEMOLICIONES';
  if (/(EXCAVAC|RELLENO|NIVELACION|NIVELACIÓN|COMPACTACION|PERFILADO|SUBRASANTE|ELIMINACION DE|ELIMINACIÓN DE|ACARREO DE EXCAVACION|MOV DE TIERRAS|MOVIMIENTO DE TIERRAS)/.test(d)) return 'MOVIMIENTO_TIERRAS';
  if (/(CONCRETO|SOLADO|CALZADURA|CURADO|RECTIFICACION|RECTIFICACIÓN|BARANDA)/.test(d)) return 'CONCRETO';
  if (/(TRAZO|REPLANTEO|TOPOGRAF|ANDAMIO)/.test(d)) return 'TRABAJOS_PRELIMINARES';
  if (/(MOVILIZACION|MOVILIZACIÓN|CASETA|CERCO|COMEDOR|VESTUARIO|BAÑO|BANO|INSTALACIONES PROVISIONALES|SEÑALIZACION|SEÑALIZACIÓN|SENALIZACION|ILUMINACION|ILUMINACIÓN|LIMPIEZA|MITIGACION|MITIGACIÓN|ACARREO)/.test(d)) return 'OBRAS_PROVISIONALES';
  return 'OTROS';
}

// Convierte un RAW → documento Firestore (sin scope/proyectoId; los pone el importador)
export function transformarAPU(raw, index) {
  const manoDeObra = [];
  const materiales = [];
  const equipos = [];
  const subcontratos = [];

  (raw.recursos || []).forEach((grupo) => {
    const tipo = norm(grupo.tipo);
    (grupo.items || []).forEach((it) => {
      const unidad = norm(it.unidad);
      const cant = parseFloat(it.cantidad) || 0;
      const prec = parseFloat(it.precio) || 0;

      if (unidad === 'HH') {
        // Mano de obra (sin importar la etiqueta del grupo)
        manoDeObra.push({
          categoria: CAT_MAP[norm(it.descripcion)] || 'OPERARIO',
          cantidad: cant,
          salarioHH: prec,
          aportes: 1.0, // precios ya incluyen leyes sociales
        });
      } else if (unidad === '%MO') {
        // Herramienta manual → equipo (el precio ya es el monto en soles)
        equipos.push({ descripcion: it.descripcion, hm: 1, tarifa: prec });
      } else if (tipo.startsWith('SUBCONTRAT')) {
        subcontratos.push({ descripcion: it.descripcion, subtotal: +(cant * prec).toFixed(4) });
      } else if (tipo.startsWith('EQUIPO')) {
        equipos.push({ descripcion: it.descripcion, hm: cant, tarifa: prec });
      } else {
        // Materiales (default)
        materiales.push({ materialId: '', descripcion: it.descripcion, cantidad: cant, unidad: it.unidad || '', precio: prec });
      }
    });
  });

  const codigo = `CRX-${String(index + 1).padStart(3, '0')}`;
  return {
    codigo,
    descripcion: raw.nombre,
    unidad: raw.unidad || 'GLB',
    rendimientoBase: parseFloat(raw.rendimiento_diario) || 1,
    manoDeObra,
    materiales,
    equipos,
    subcontratos,
    categoria: clasificarAPU(raw.nombre),
    precioUnitarioReferencia: parseFloat(raw.precio_unitario) || 0,
    origen: 'CREDITEX_PTARI',
  };
}
