// src/utils/plantillas/plantillasPlanMaestro.js — Plantillas WBS por tipo de obra (B24)
//
// Estructura típica de un proyecto peruano según S10/Excel,
// con códigos jerárquicos compatibles con el motor del Bloque 21.

// Helper: estimar HH presupuestadas a partir de metrado y rendimiento típico.
const HH = (metrado, hhUnit) => Math.round((metrado || 0) * (hhUnit || 0) * 10) / 10;

// ════════════════════════════════════════════════════════════════
// PLANTILLA 1: EDIFICACIÓN (5 niveles típica)
// ════════════════════════════════════════════════════════════════
export const PLANTILLA_EDIFICACION = {
  id: 'edificacion',
  label: '🏢 Edificación (5 niveles)',
  descripcion: 'Edificio multifamiliar/oficina típico. Incluye obras provisionales, estructuras, arquitectura, IIEE e IIS.',
  icono: '🏢',
  color: '#7c3aed',
  duracionEstimadaMeses: 12,
  actividades: [
    // 01.00 OBRAS PROVISIONALES
    { codigo: '01.00.000', descripcion: 'OBRAS PROVISIONALES Y TRABAJOS PRELIMINARES' },
    { codigo: '01.01.000', descripcion: 'Obras provisionales' },
    { codigo: '01.01.001', descripcion: 'Cartel de obra 3.6x2.4m', unidad: 'und', metradoContractual: 1, precioUnitario: 850, hhTotalPresupuestado: HH(1, 8), rendimientoTeorico: 8 },
    { codigo: '01.01.002', descripcion: 'Caseta de oficina + almacén', unidad: 'm2', metradoContractual: 30, precioUnitario: 180, hhTotalPresupuestado: HH(30, 4), rendimientoTeorico: 4 },
    { codigo: '01.01.003', descripcion: 'Cerco perimétrico provisional', unidad: 'ml', metradoContractual: 80, precioUnitario: 45, hhTotalPresupuestado: HH(80, 1.5), rendimientoTeorico: 1.5 },
    { codigo: '01.02.000', descripcion: 'Trabajos preliminares' },
    { codigo: '01.02.001', descripcion: 'Trazo y replanteo', unidad: 'm2', metradoContractual: 800, precioUnitario: 3.5, hhTotalPresupuestado: HH(800, 0.05), rendimientoTeorico: 0.05 },
    { codigo: '01.02.002', descripcion: 'Demoliciones', unidad: 'm3', metradoContractual: 50, precioUnitario: 35, hhTotalPresupuestado: HH(50, 1.2), rendimientoTeorico: 1.2 },

    // 02.00 ESTRUCTURAS
    { codigo: '02.00.000', descripcion: 'ESTRUCTURAS' },
    { codigo: '02.01.000', descripcion: 'Movimiento de tierras' },
    { codigo: '02.01.001', descripcion: 'Excavación masiva', unidad: 'm3', metradoContractual: 1200, precioUnitario: 18, hhTotalPresupuestado: HH(1200, 0.5), rendimientoTeorico: 0.5 },
    { codigo: '02.01.002', descripcion: 'Eliminación de material excedente', unidad: 'm3', metradoContractual: 1500, precioUnitario: 22, hhTotalPresupuestado: HH(1500, 0.2), rendimientoTeorico: 0.2 },
    { codigo: '02.02.000', descripcion: 'Concreto armado · Cimentación' },
    { codigo: '02.02.001', descripcion: 'Concreto en zapatas f\'c=210', unidad: 'm3', metradoContractual: 145, precioUnitario: 480, hhTotalPresupuestado: HH(145, 1.0), rendimientoTeorico: 1.0 },
    { codigo: '02.02.002', descripcion: 'Acero de refuerzo en zapatas', unidad: 'kg', metradoContractual: 8500, precioUnitario: 4.5, hhTotalPresupuestado: HH(8500, 0.025), rendimientoTeorico: 0.025 },
    { codigo: '02.02.003', descripcion: 'Encofrado y desencofrado de zapatas', unidad: 'm2', metradoContractual: 320, precioUnitario: 38, hhTotalPresupuestado: HH(320, 1.2), rendimientoTeorico: 1.2 },
    { codigo: '02.03.000', descripcion: 'Concreto armado · Columnas y muros' },
    { codigo: '02.03.001', descripcion: 'Concreto en columnas f\'c=210', unidad: 'm3', metradoContractual: 85, precioUnitario: 520, hhTotalPresupuestado: HH(85, 1.5), rendimientoTeorico: 1.5 },
    { codigo: '02.03.002', descripcion: 'Acero en columnas', unidad: 'kg', metradoContractual: 12500, precioUnitario: 4.8, hhTotalPresupuestado: HH(12500, 0.025), rendimientoTeorico: 0.025 },
    { codigo: '02.03.003', descripcion: 'Encofrado de columnas', unidad: 'm2', metradoContractual: 480, precioUnitario: 52, hhTotalPresupuestado: HH(480, 1.4), rendimientoTeorico: 1.4 },
    { codigo: '02.04.000', descripcion: 'Concreto armado · Vigas y losas' },
    { codigo: '02.04.001', descripcion: 'Concreto en vigas y losa aligerada', unidad: 'm3', metradoContractual: 220, precioUnitario: 495, hhTotalPresupuestado: HH(220, 1.2), rendimientoTeorico: 1.2 },
    { codigo: '02.04.002', descripcion: 'Acero en vigas y losa', unidad: 'kg', metradoContractual: 18000, precioUnitario: 4.6, hhTotalPresupuestado: HH(18000, 0.025), rendimientoTeorico: 0.025 },
    { codigo: '02.04.003', descripcion: 'Encofrado de vigas y losa', unidad: 'm2', metradoContractual: 1800, precioUnitario: 48, hhTotalPresupuestado: HH(1800, 1.3), rendimientoTeorico: 1.3 },
    { codigo: '02.04.004', descripcion: 'Ladrillo de techo', unidad: 'und', metradoContractual: 12000, precioUnitario: 3.2, hhTotalPresupuestado: HH(12000, 0.04), rendimientoTeorico: 0.04 },

    // 03.00 ARQUITECTURA
    { codigo: '03.00.000', descripcion: 'ARQUITECTURA' },
    { codigo: '03.01.000', descripcion: 'Albañilería' },
    { codigo: '03.01.001', descripcion: 'Muro de ladrillo KK soga', unidad: 'm2', metradoContractual: 1200, precioUnitario: 78, hhTotalPresupuestado: HH(1200, 1.5), rendimientoTeorico: 1.5 },
    { codigo: '03.01.002', descripcion: 'Tarrajeo de muros interiores', unidad: 'm2', metradoContractual: 2400, precioUnitario: 28, hhTotalPresupuestado: HH(2400, 0.8), rendimientoTeorico: 0.8 },
    { codigo: '03.01.003', descripcion: 'Tarrajeo de cielo raso', unidad: 'm2', metradoContractual: 800, precioUnitario: 35, hhTotalPresupuestado: HH(800, 1.2), rendimientoTeorico: 1.2 },
    { codigo: '03.02.000', descripcion: 'Pisos y acabados' },
    { codigo: '03.02.001', descripcion: 'Contrapiso de 4cm', unidad: 'm2', metradoContractual: 800, precioUnitario: 32, hhTotalPresupuestado: HH(800, 0.6), rendimientoTeorico: 0.6 },
    { codigo: '03.02.002', descripcion: 'Piso porcelanato 60x60', unidad: 'm2', metradoContractual: 800, precioUnitario: 95, hhTotalPresupuestado: HH(800, 1.0), rendimientoTeorico: 1.0 },
    { codigo: '03.02.003', descripcion: 'Zócalos y contrazócalos', unidad: 'ml', metradoContractual: 600, precioUnitario: 42, hhTotalPresupuestado: HH(600, 0.4), rendimientoTeorico: 0.4 },
    { codigo: '03.03.000', descripcion: 'Carpintería y vidrios' },
    { codigo: '03.03.001', descripcion: 'Puertas contraplacadas', unidad: 'und', metradoContractual: 25, precioUnitario: 480, hhTotalPresupuestado: HH(25, 4), rendimientoTeorico: 4 },
    { codigo: '03.03.002', descripcion: 'Ventanas de aluminio + vidrio', unidad: 'm2', metradoContractual: 80, precioUnitario: 380, hhTotalPresupuestado: HH(80, 2), rendimientoTeorico: 2 },
    { codigo: '03.04.000', descripcion: 'Pintura' },
    { codigo: '03.04.001', descripcion: 'Pintura látex en muros', unidad: 'm2', metradoContractual: 2400, precioUnitario: 18, hhTotalPresupuestado: HH(2400, 0.3), rendimientoTeorico: 0.3 },
    { codigo: '03.04.002', descripcion: 'Pintura esmalte en metálicos', unidad: 'm2', metradoContractual: 120, precioUnitario: 25, hhTotalPresupuestado: HH(120, 0.4), rendimientoTeorico: 0.4 },

    // 04.00 INSTALACIONES ELÉCTRICAS
    { codigo: '04.00.000', descripcion: 'INSTALACIONES ELÉCTRICAS' },
    { codigo: '04.01.000', descripcion: 'Salidas y tuberías' },
    { codigo: '04.01.001', descripcion: 'Salida para alumbrado', unidad: 'pto', metradoContractual: 80, precioUnitario: 95, hhTotalPresupuestado: HH(80, 1.5), rendimientoTeorico: 1.5 },
    { codigo: '04.01.002', descripcion: 'Salida para tomacorriente', unidad: 'pto', metradoContractual: 120, precioUnitario: 95, hhTotalPresupuestado: HH(120, 1.2), rendimientoTeorico: 1.2 },
    { codigo: '04.02.000', descripcion: 'Tableros y artefactos' },
    { codigo: '04.02.001', descripcion: 'Tablero general', unidad: 'und', metradoContractual: 1, precioUnitario: 2800, hhTotalPresupuestado: HH(1, 16), rendimientoTeorico: 16 },
    { codigo: '04.02.002', descripcion: 'Artefacto de iluminación LED', unidad: 'und', metradoContractual: 60, precioUnitario: 180, hhTotalPresupuestado: HH(60, 0.5), rendimientoTeorico: 0.5 },

    // 05.00 INSTALACIONES SANITARIAS
    { codigo: '05.00.000', descripcion: 'INSTALACIONES SANITARIAS' },
    { codigo: '05.01.000', descripcion: 'Agua' },
    { codigo: '05.01.001', descripcion: 'Tubería PVC SAP 1/2"', unidad: 'ml', metradoContractual: 280, precioUnitario: 28, hhTotalPresupuestado: HH(280, 0.5), rendimientoTeorico: 0.5 },
    { codigo: '05.01.002', descripcion: 'Aparatos sanitarios', unidad: 'und', metradoContractual: 12, precioUnitario: 480, hhTotalPresupuestado: HH(12, 4), rendimientoTeorico: 4 },
    { codigo: '05.02.000', descripcion: 'Desagüe' },
    { codigo: '05.02.001', descripcion: 'Tubería PVC SAL 4"', unidad: 'ml', metradoContractual: 180, precioUnitario: 45, hhTotalPresupuestado: HH(180, 0.6), rendimientoTeorico: 0.6 },
  ],
};

// ════════════════════════════════════════════════════════════════
// PLANTILLA 2: HIDRÁULICA (PTAR / PTAP)
// ════════════════════════════════════════════════════════════════
export const PLANTILLA_HIDRAULICA = {
  id: 'hidraulica',
  label: '💧 Hidráulica (PTAR/PTAP)',
  descripcion: 'Planta de tratamiento de aguas. Incluye obras civiles, equipamiento electromecánico y líneas hidráulicas.',
  icono: '💧',
  color: '#0d9488',
  duracionEstimadaMeses: 10,
  actividades: [
    { codigo: '01.00.000', descripcion: 'OBRAS PROVISIONALES' },
    { codigo: '01.01.001', descripcion: 'Cartel de obra', unidad: 'und', metradoContractual: 1, precioUnitario: 850 },
    { codigo: '01.01.002', descripcion: 'Caseta y almacén', unidad: 'm2', metradoContractual: 40, precioUnitario: 180 },
    { codigo: '01.01.003', descripcion: 'Cerco perimétrico', unidad: 'ml', metradoContractual: 200, precioUnitario: 45 },

    { codigo: '02.00.000', descripcion: 'OBRAS CIVILES' },
    { codigo: '02.01.000', descripcion: 'Movimiento de tierras' },
    { codigo: '02.01.001', descripcion: 'Excavación masiva', unidad: 'm3', metradoContractual: 3500, precioUnitario: 18 },
    { codigo: '02.01.002', descripcion: 'Excavación de zanjas', unidad: 'm3', metradoContractual: 1200, precioUnitario: 24 },
    { codigo: '02.01.003', descripcion: 'Relleno compactado', unidad: 'm3', metradoContractual: 1800, precioUnitario: 28 },
    { codigo: '02.02.000', descripcion: 'Concreto · Tanque sedimentación' },
    { codigo: '02.02.001', descripcion: 'Concreto en losa de fondo f\'c=280', unidad: 'm3', metradoContractual: 180, precioUnitario: 580 },
    { codigo: '02.02.002', descripcion: 'Concreto en muros f\'c=280', unidad: 'm3', metradoContractual: 240, precioUnitario: 620 },
    { codigo: '02.02.003', descripcion: 'Acero estructural', unidad: 'kg', metradoContractual: 28000, precioUnitario: 4.8 },
    { codigo: '02.02.004', descripcion: 'Encofrado de muros', unidad: 'm2', metradoContractual: 1200, precioUnitario: 58 },
    { codigo: '02.02.005', descripcion: 'Impermeabilización', unidad: 'm2', metradoContractual: 800, precioUnitario: 75 },
    { codigo: '02.03.000', descripcion: 'Concreto · Cámaras y estructuras' },
    { codigo: '02.03.001', descripcion: 'Concreto en cámaras', unidad: 'm3', metradoContractual: 95, precioUnitario: 540 },
    { codigo: '02.03.002', descripcion: 'Tapas de inspección', unidad: 'und', metradoContractual: 18, precioUnitario: 380 },

    { codigo: '03.00.000', descripcion: 'LÍNEAS HIDRÁULICAS' },
    { codigo: '03.01.000', descripcion: 'Línea de impulsión' },
    { codigo: '03.01.001', descripcion: 'Tubería HDPE 200mm', unidad: 'ml', metradoContractual: 850, precioUnitario: 145 },
    { codigo: '03.01.002', descripcion: 'Accesorios y válvulas', unidad: 'und', metradoContractual: 24, precioUnitario: 480 },
    { codigo: '03.02.000', descripcion: 'Línea de descarga' },
    { codigo: '03.02.001', descripcion: 'Tubería HDPE 250mm', unidad: 'ml', metradoContractual: 600, precioUnitario: 175 },

    { codigo: '04.00.000', descripcion: 'EQUIPAMIENTO ELECTROMECÁNICO' },
    { codigo: '04.01.001', descripcion: 'Bombas centrífugas + motores', unidad: 'und', metradoContractual: 4, precioUnitario: 18500 },
    { codigo: '04.01.002', descripcion: 'Aireadores superficiales', unidad: 'und', metradoContractual: 2, precioUnitario: 28000 },
    { codigo: '04.01.003', descripcion: 'Tablero general de control', unidad: 'und', metradoContractual: 1, precioUnitario: 45000 },
    { codigo: '04.01.004', descripcion: 'Tableros locales', unidad: 'und', metradoContractual: 4, precioUnitario: 8500 },
    { codigo: '04.01.005', descripcion: 'Rejas finas mecanizadas', unidad: 'und', metradoContractual: 2, precioUnitario: 22000 },

    { codigo: '05.00.000', descripcion: 'INSTRUMENTACIÓN Y CONTROL' },
    { codigo: '05.01.001', descripcion: 'Sensores de nivel', unidad: 'und', metradoContractual: 8, precioUnitario: 1800 },
    { codigo: '05.01.002', descripcion: 'Caudalímetros electromagnéticos', unidad: 'und', metradoContractual: 3, precioUnitario: 12500 },
    { codigo: '05.01.003', descripcion: 'Sistema SCADA', unidad: 'glb', metradoContractual: 1, precioUnitario: 85000 },
  ],
};

// ════════════════════════════════════════════════════════════════
// PLANTILLA 3: VIAL (CARRETERA)
// ════════════════════════════════════════════════════════════════
export const PLANTILLA_VIAL = {
  id: 'vial',
  label: '🛣️ Vial (Carretera)',
  descripcion: 'Carretera asfaltada con obras de arte. Estructura típica de carretera rural/regional.',
  icono: '🛣️',
  color: '#f59e0b',
  duracionEstimadaMeses: 14,
  actividades: [
    { codigo: '01.00.000', descripcion: 'OBRAS PROVISIONALES Y CAMPAMENTO' },
    { codigo: '01.01.001', descripcion: 'Cartel de obra', unidad: 'und', metradoContractual: 2, precioUnitario: 1200 },
    { codigo: '01.01.002', descripcion: 'Campamento y oficinas', unidad: 'm2', metradoContractual: 200, precioUnitario: 220 },
    { codigo: '01.01.003', descripcion: 'Movilización y desmovilización', unidad: 'glb', metradoContractual: 1, precioUnitario: 85000 },

    { codigo: '02.00.000', descripcion: 'MOVIMIENTO DE TIERRAS' },
    { codigo: '02.01.001', descripcion: 'Desbroce y limpieza', unidad: 'ha', metradoContractual: 12, precioUnitario: 4800 },
    { codigo: '02.01.002', descripcion: 'Excavación en material suelto', unidad: 'm3', metradoContractual: 18000, precioUnitario: 12 },
    { codigo: '02.01.003', descripcion: 'Excavación en roca', unidad: 'm3', metradoContractual: 2400, precioUnitario: 38 },
    { codigo: '02.01.004', descripcion: 'Conformación de terraplenes', unidad: 'm3', metradoContractual: 22000, precioUnitario: 14 },
    { codigo: '02.01.005', descripcion: 'Mejoramiento de subrasante', unidad: 'm3', metradoContractual: 4500, precioUnitario: 42 },

    { codigo: '03.00.000', descripcion: 'PAVIMENTOS' },
    { codigo: '03.01.001', descripcion: 'Subbase granular e=0.30m', unidad: 'm3', metradoContractual: 6500, precioUnitario: 65 },
    { codigo: '03.01.002', descripcion: 'Base granular e=0.20m', unidad: 'm3', metradoContractual: 4200, precioUnitario: 78 },
    { codigo: '03.01.003', descripcion: 'Imprimación asfáltica', unidad: 'm2', metradoContractual: 24000, precioUnitario: 4.5 },
    { codigo: '03.01.004', descripcion: 'Carpeta asfáltica e=0.075m', unidad: 'm3', metradoContractual: 1800, precioUnitario: 380 },

    { codigo: '04.00.000', descripcion: 'OBRAS DE ARTE Y DRENAJE' },
    { codigo: '04.01.001', descripcion: 'Alcantarillas TMC', unidad: 'ml', metradoContractual: 240, precioUnitario: 580 },
    { codigo: '04.01.002', descripcion: 'Cunetas de concreto', unidad: 'ml', metradoContractual: 4800, precioUnitario: 85 },
    { codigo: '04.01.003', descripcion: 'Badenes', unidad: 'und', metradoContractual: 8, precioUnitario: 12500 },
    { codigo: '04.01.004', descripcion: 'Muros de contención', unidad: 'm3', metradoContractual: 280, precioUnitario: 680 },

    { codigo: '05.00.000', descripcion: 'SEÑALIZACIÓN Y SEGURIDAD VIAL' },
    { codigo: '05.01.001', descripcion: 'Señales preventivas', unidad: 'und', metradoContractual: 60, precioUnitario: 480 },
    { codigo: '05.01.002', descripcion: 'Señales reglamentarias', unidad: 'und', metradoContractual: 40, precioUnitario: 520 },
    { codigo: '05.01.003', descripcion: 'Marcas en pavimento', unidad: 'ml', metradoContractual: 24000, precioUnitario: 8 },
    { codigo: '05.01.004', descripcion: 'Postes delineadores', unidad: 'und', metradoContractual: 200, precioUnitario: 180 },
  ],
};

// ════════════════════════════════════════════════════════════════
// PLANTILLA 4: INDUSTRIAL (PLANTA / NAVE)
// ════════════════════════════════════════════════════════════════
export const PLANTILLA_INDUSTRIAL = {
  id: 'industrial',
  label: '🏭 Industrial (Nave/Planta)',
  descripcion: 'Nave industrial con estructura metálica. Incluye obras civiles, montaje, IIEE industriales.',
  icono: '🏭',
  color: '#6366f1',
  duracionEstimadaMeses: 8,
  actividades: [
    { codigo: '01.00.000', descripcion: 'OBRAS PROVISIONALES' },
    { codigo: '01.01.001', descripcion: 'Cartel de obra', unidad: 'und', metradoContractual: 1, precioUnitario: 850 },
    { codigo: '01.01.002', descripcion: 'Caseta y almacén', unidad: 'm2', metradoContractual: 60, precioUnitario: 200 },

    { codigo: '02.00.000', descripcion: 'OBRAS CIVILES' },
    { codigo: '02.01.001', descripcion: 'Excavación masiva', unidad: 'm3', metradoContractual: 1800, precioUnitario: 18 },
    { codigo: '02.01.002', descripcion: 'Concreto en zapatas f\'c=280', unidad: 'm3', metradoContractual: 95, precioUnitario: 540 },
    { codigo: '02.01.003', descripcion: 'Acero en zapatas', unidad: 'kg', metradoContractual: 5800, precioUnitario: 4.6 },
    { codigo: '02.01.004', descripcion: 'Pedestales de concreto', unidad: 'm3', metradoContractual: 28, precioUnitario: 620 },
    { codigo: '02.02.001', descripcion: 'Losa de piso industrial e=15cm', unidad: 'm2', metradoContractual: 1800, precioUnitario: 145 },

    { codigo: '03.00.000', descripcion: 'ESTRUCTURA METÁLICA' },
    { codigo: '03.01.001', descripcion: 'Suministro de columnas metálicas', unidad: 'kg', metradoContractual: 18000, precioUnitario: 8.5 },
    { codigo: '03.01.002', descripcion: 'Suministro de tijerales', unidad: 'kg', metradoContractual: 24000, precioUnitario: 9.2 },
    { codigo: '03.01.003', descripcion: 'Montaje de estructura metálica', unidad: 'kg', metradoContractual: 42000, precioUnitario: 3.8 },
    { codigo: '03.01.004', descripcion: 'Pintura anticorrosiva', unidad: 'm2', metradoContractual: 1600, precioUnitario: 38 },

    { codigo: '04.00.000', descripcion: 'COBERTURA Y CERRAMIENTOS' },
    { codigo: '04.01.001', descripcion: 'Cobertura TR4 + aislante', unidad: 'm2', metradoContractual: 2400, precioUnitario: 95 },
    { codigo: '04.01.002', descripcion: 'Cerramiento lateral', unidad: 'm2', metradoContractual: 1200, precioUnitario: 85 },
    { codigo: '04.01.003', descripcion: 'Portones industriales', unidad: 'und', metradoContractual: 4, precioUnitario: 8500 },

    { codigo: '05.00.000', descripcion: 'INSTALACIONES ELÉCTRICAS INDUSTRIALES' },
    { codigo: '05.01.001', descripcion: 'Tablero general industrial', unidad: 'und', metradoContractual: 1, precioUnitario: 28000 },
    { codigo: '05.01.002', descripcion: 'Iluminación industrial LED', unidad: 'und', metradoContractual: 40, precioUnitario: 480 },
    { codigo: '05.01.003', descripcion: 'Tomacorrientes industriales', unidad: 'pto', metradoContractual: 24, precioUnitario: 280 },
  ],
};

// ════════════════════════════════════════════════════════════════
// PLANTILLA 5: VACÍA (estructura mínima)
// ════════════════════════════════════════════════════════════════
export const PLANTILLA_VACIA = {
  id: 'vacia',
  label: '⚪ Vacía (estructura mínima)',
  descripcion: 'Solo crea las partidas raíz. Tú agregas el detalle manualmente.',
  icono: '📋',
  color: '#64748b',
  duracionEstimadaMeses: 0,
  actividades: [
    { codigo: '01.00.000', descripcion: 'OBRAS PROVISIONALES' },
    { codigo: '02.00.000', descripcion: 'ESTRUCTURAS' },
    { codigo: '03.00.000', descripcion: 'ARQUITECTURA / OBRA GRUESA' },
    { codigo: '04.00.000', descripcion: 'INSTALACIONES ELÉCTRICAS' },
    { codigo: '05.00.000', descripcion: 'INSTALACIONES SANITARIAS' },
  ],
};

export const PLANTILLAS = [
  PLANTILLA_EDIFICACION,
  PLANTILLA_HIDRAULICA,
  PLANTILLA_VIAL,
  PLANTILLA_INDUSTRIAL,
  PLANTILLA_VACIA,
];

// Helper: aplicar plantilla. Devuelve actividades enriquecidas con proyectoId, frenteId y default values.
export function aplicarPlantilla(plantilla, { proyectoId, frenteId, fechaInicio = null, escalaPresupuesto = 1 } = {}) {
  if (!plantilla) return [];

  const ini = fechaInicio ? new Date(fechaInicio) : new Date();
  const totalActs = plantilla.actividades.length;
  const duracionDias = (plantilla.duracionEstimadaMeses || 6) * 30;

  return plantilla.actividades.map((a, idx) => {
    const partes = (a.codigo || '').split('.');
    const esHoja = a.metradoContractual != null && a.precioUnitario != null;

    let fechaIni = null, fechaFin = null;
    if (esHoja && totalActs > 0) {
      const offsetIni = Math.round((idx / totalActs) * duracionDias);
      const offsetFin = Math.round(((idx + 1) / totalActs) * duracionDias);
      fechaIni = new Date(ini.getTime() + offsetIni * 24 * 60 * 60 * 1000);
      fechaFin = new Date(ini.getTime() + offsetFin * 24 * 60 * 60 * 1000);
    }

    return {
      codigo: a.codigo,
      descripcion: a.descripcion,
      unidad: a.unidad || null,
      metradoContractual: a.metradoContractual ? a.metradoContractual * escalaPresupuesto : 0,
      precioUnitario: a.precioUnitario || 0,
      hhTotalPresupuestado: a.hhTotalPresupuestado || 0,
      rendimientoTeorico: a.rendimientoTeorico || 0,
      cuadrillaTeorica: a.cuadrillaTeorica || null,
      fechaInicioProgramada: fechaIni,
      fechaFinProgramada: fechaFin,
      predecesoras: [],
      estado: 'no_iniciada',
      proyectoId: proyectoId || null,
      frenteId: frenteId || null,
      avanceMetradoAcum: 0,
      hhAcumReal: 0,
      costoRealAcum: 0,
    };
  });
}
