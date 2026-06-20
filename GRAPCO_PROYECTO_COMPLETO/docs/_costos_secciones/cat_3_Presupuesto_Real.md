# Categoría 3 · Presupuesto Real

Chunk de catálogo: `cat_3_Presupuesto_Real.txt` — carpeta `05. Gestión Costos\3. Presupuesto Real`.
Proyecto: CREDITEX — "PTAR PLANTA 5" (PTARI / F1), Av. Los Hornos 185, Ate. Área: 400 m2. Plazo: 4.50 meses (Estructuras: 130 días calendario). T.C. = 3.80. Contratista: GRAPCO SAC. Supervisión: Diseños Racionales. Revisión N°01, fecha base Sun Dec 28 2025.

---

### \05. Gestión Costos\3. Presupuesto Real\GP-GCE-FOR-F16-PPTO REAL_CREDITEX 2026.04.16.xlsx

- **Tipo / formato:** Excel (.xlsx, 1006 KB). Código de formato del archivo: **GP-GCE-FOR-F16** (Presupuesto Real). Internamente las hojas de presupuesto usan **GP-GCE-FOR-F01** (presupuesto/APU) y las de recursos/GG usan **PRO-GCE-FOR-F03** (recursos / gastos generales).
- **Hojas (18):** DATA CREDITEX | Carátula | A. Partidas | A. Recursos | PPTO Real | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. GG | 8. APU Real | 9. Recursos Real | Hoja 8 | PPTO Contr. | APU Contract. | Recursos Contr.

#### Contenido por hoja (a detalle)

**DATA CREDITEX** (B1:N1001) — Tabla maestra resumen del PTARI (F1), área 400 m2. Columnas: COD. | ITEM | DESCRIPCION | UND | CANT | TOTAL (S/.) | INCIDENCIA PPTO | INCIDENCIA ESTRUCTURA | FACTOR | RATIO. Lista las partidas de 1er nivel con su total, incidencias y ratio por m2. Ejemplos:
- 1 TRABAJOS PRELIMINARES — GLB 1 — **S/ 183,206.97** (inc. ppto 0.12 / inc. estruct 0.19 / factor 0.25 / ratio 229,008.71). Subpartidas: PRE1 Seguridad y Salud S/ 51,655.31; PRE2 Topografía S/ 41,113.36; PRE3 Acarreo de materiales S/ 50,438.29; PRE5 Calzaduras 0; PRE6 Demoliciones 0; PRE7 Seguros y tributos 0.
- 2 OBRAS PROVISIONALES — GLB 1 — **S/ 71,087.78** (inc. 0.05 / 0.07 / factor 0.25 / ratio 88,859.73). (+23 filas adicionales no volcadas.)

**Carátula** (B1:F1000) — Portada: "PTAR PLANTA 5"; Av. Los Hornos 185, Ate; "PPTO REAL PTAR PLANTA 5 - CREDITEX"; REVISION N°01; fecha Sun Dec 28 2025.

**A. Partidas** (C1:O969) — "ANÁLISIS DE PPTO REAL POR PARTIDAS". Compara CONTRACTUAL (metrados actuales) (1) vs REAL (2) y calcula DELTA (1-2), más ÁREA y RATIO X M2. Columnas: PARCIAL / TOTAL para contractual y real. Ejemplos por partida:
- 1 TRABAJOS PRELIMINARES — Contractual 142,704.14 / Real 183,206.97 / **Delta -40,502.83** (sobrecosto).
- 1.10 Seguridad y Salud — Contr 51,152.48 / Real 51,655.31.
- 1.20 Topografía — 41,113.36 / 41,113.36.
- 1.30 Acarreo — 50,438.29 / 50,438.29.
- 1.40 Diseño — Contr 0 / Real 40,000. (+56 filas.)

**A. Recursos** (C1:N952) — "ANÁLISIS DE PPTO REAL POR RECURSOS". Descompone cada partida por las 4 patas: MO | MAT | EQH | SC, contractual (1) vs real (2) y delta. Factores globales fila 5: MO 0.25 | MAT 0.26 | EQH 0.04 | SC 0.45 = 1.
- Total PPTO PTAR CREDITEX por recurso: **MO 378,167.33 | MAT 383,081.57 | EQH 58,838.58 | SC 667,170.36 | TOTAL S/ 1,487,257.83**.
- 1 Trabajos Preliminares: Contr 142,704.14 → MO 72,510.28 | MAT 23,579.49 | EQH 14,757.10 | SC 72,360.09 | Real 183,206.97 | Delta -40,502.83. (+37 filas.)

**PPTO Real** (B1:W1031) — Formato F01 "PPTO REAL", N°01, página 1 de 10. Cabecera oficial: Obra "PTAR PLANTA 5", Cliente CREDITEX, Contratista GRAPCO SAC, Supervisión Diseños Racionales, Plazo 4.50 meses, ubicación Av. Los Hornos 185 Ate. Sección "1.- RESUMEN DEL PRESUPUESTO" con columnas ITEM | DESCRIPCIÓN | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.). (+12 filas.)

**1. PRE** (A1:AH1000) — Presupuesto de TRABAJOS PRELIMINARES (F01, pág 2 de 10). Tabla con ITEM | DESCRIPCIÓN | UND | CANT | P.U. | PARCIAL | SUBTOTAL | TOTAL + bloques de INCIDENCIAS (MO/MAT/EQH/SC) y MONTOS (MO/MAT/EQH/SC). (+20 filas.)

**2. PRO** (A1:AH1006) — Presupuesto de OBRAS PROVISIONALES (F01, pág 3 de 10). Misma estructura de columnas (PU/Parcial/Subtotal/Total + incidencias y montos por recurso). (+22 filas.)

**3. MOV** (A1:AH975) — Presupuesto de MOVIMIENTO DE TIERRAS (F01, pág 4 de 10). Misma estructura. (+14 filas.)

**4. EST** (A1:AP908) — Presupuesto de ESTRUCTURAS (F01, pág 5 de 10), plazo 130 días calendario. Estructura ampliada: además de PU/Parcial/Subtotal/Total + incidencias/montos por recurso, agrega bloque MANO DE OBRA con columnas IP | HH | MONTO | COSTO PROM | CAPATAZ S/. | MONTO (análisis de mano de obra detallado por partida). (+50 filas — la partida más voluminosa.)

**5. ARQ** (A1:AH609) — Presupuesto de ARQUITECTURA (F01, pág 6 de 10). Estructura estándar PU/Parcial/Subtotal/Total + incidencias/montos. (+11 filas.)

**6. IISS** (A1:AH603) — Presupuesto de IISS (instalaciones sanitarias; el encabezado dice "ARQUITECTURA" por copia de plantilla, denominación correcta = IISS), F01 pág 6 de 10. Estructura estándar. (+5 filas — partida corta.)

**7. GG** (A1:M1038) — GASTOS GENERALES (PRO-GCE-FOR-F03, pág 8 de 10). Sección "4.- ANÁLISIS DE GASTOS GENERALES" con bloque A. CARACTERÍSTICAS. Plazo 4.50 meses. (+131 filas — desglose de gastos generales por concepto.)

**8. APU Real** (B1:V1301) — ANÁLISIS DE PRECIOS UNITARIOS reales (F01, pág 9 de 10). Denominación "PPTO REAL PTAR PLANTA 5". Columnas: ITEM | DESCRIPCIÓN | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.) | SUB TOTAL (S/.) + sección "ANALISIS DE DATA". (+821 filas — APU desagregado por insumo de cada partida.)

**9. Recursos Real** (B1:P1093) — RECURSOS reales (PRO-GCE-FOR-F03, pág 10 de 10). T.C. = 3.80. Leyenda de estatus: REALIZADO / EN PROCESO / PENDIENTE. Factores MAT/MO/EQH/SC = 0. Columnas: CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS | Precio | precio+Inc | Revisado. Bloques por tipo (1.01 MANO DE OBRA, etc.). (+347 filas — catálogo de recursos/insumos con precios.)

**Hoja 8** (B5:AE30) — Cronograma de EGRESOS / flujo por semanas (Curva S de costos). Columnas Descripcion | Parcial | MESES (1–7) desglosados en SEM 1..SEM 24. Filas: VIENEN; EGRESOS (todos en 0 en el volcado); Trabajos Preliminares; Obras Provisionales; SC Mov. de tierras; SC Encofrado Cori... (+15 filas). Valores mostrados = 0 (plantilla de programación de egresos, aparentemente sin valorizar en este volcado).

**PPTO Contr.** (A1:Q958) — PRESUPUESTO CONTRACTUAL (PTARI), ligado a VALORIZACIÓN N°06. Obra PTAR PLANTA 5, Cliente CREDITEX, Supervisión Diseños Racionales SAC. Columnas ITEM | DESCRIPCIÓN | UND | CANT | P.U. (S/.) | PARCIAL (S/.). Ejemplo: PRE1 1.1.1 ALQUILER DE ANDAMIOS — GLB 1 — PU 3,992.02 — Parcial **3,992.02**. (+109 filas — presupuesto contractual completo por partida.)

**APU Contract.** (B1:S3325) — APU CONTRACTUAL / META ("PPTO META PTAR PLANTA 5 - CREDITEX"), F01 pág 9 de 10. Columnas: ITEM | DESCRIPCIÓN | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.). (+1855 filas — el bloque más extenso del libro; APU meta desagregado por insumo.)

**Recursos Contr.** (B1:P1090) — RECURSOS contractuales (PRO-GCE-FOR-F03). T.C. 3.80. Factores MAT/MO/EQH/SC = 0.05 (vs 0 en la versión Real). Mismas columnas que Recursos Real (CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS | Precio | precio+Inc | Revisado). (+344 filas.)

#### Números clave del archivo
- Presupuesto Real total PTAR CREDITEX: **S/ 1,487,257.83**.
- Composición por recurso (Real): MO **378,167.33** | MAT **383,081.57** | EQH **58,838.58** | SC **667,170.36**.
- Incidencias globales de recursos: MO 25% | MAT 26% | EQH 4% | SC 45%.
- Trabajos Preliminares: Real 183,206.97 vs Contractual 142,704.14 → **Delta -40,502.83** (sobrecosto).
- Obras Provisionales: Real 71,087.78.
- Diseño: aparece S/ 40,000 en Real que no existía en contractual (delta -40,000).
- Subpartidas preliminares: Seguridad/Salud 51,655.31; Topografía 41,113.36; Acarreo 50,438.29.
- Ligado a Valorización N°06; ratio contractual ~229,008.71 (factor 0.25) para preliminares.

#### Propósito (control de costos)
Es el **núcleo del control de costos** del proyecto: documento del Presupuesto Meta/Real (BAC) frente al Contractual. Permite (a) fijar la línea base de costo por partida y por recurso (4 patas MO/MAT/EQH/SC), (b) comparar Contractual vs Real y obtener deltas (ahorro/sobrecosto = Resultado Operativo base), (c) soportar valorizaciones (vínculo a Valorización N°06), y (d) programar egresos por semana (Curva S de costos). Sostiene también el análisis de HH/IP de mano de obra en estructuras.

#### Origen -> Destino
- **Origen:** metrados actuales + APU contractuales (APU Contract.) y APU reales (8. APU Real), catálogo de recursos (Recursos Contr./Real con precios y T.C.), análisis de gastos generales (7. GG).
- **Destino interno:** alimenta A. Partidas y A. Recursos (comparativos delta), PPTO Real / PPTO Contr. (resúmenes), DATA CREDITEX (incidencias/ratios) y Hoja 8 (programación de egresos). El delta Contractual-Real es la base del Resultado Operativo y del CR del proyecto.

#### Automatización (ingesta a GRAPCO)
- **Presupuesto (BAC):** las hojas PPTO Contr. y PPTO Real → módulo Presupuesto/BAC de GRAPCO. Importador genérico in-app puede leer ITEM/DESCRIPCIÓN/UND/CANT/PU/PARCIAL/TOTAL. La estructura de partidas alimenta el Catálogo WBS (fuente única de estructura).
- **Resultado Operativo (RO/CR/F06 + EVM):** A. Partidas (delta Contractual-Real por partida) y A. Recursos (delta por MO/MAT/EQH/SC) → RO. El total S/ 1,487,257.83 y la composición por recurso son insumo directo del CR. La mano de obra de 4. EST (IP/HH/COSTO PROM) cruza con el ISP (tareos HH x S/25.5).
- **Curva S (F07):** Hoja 8 (egresos por semana SEM 1..24) → módulo Curva S; nota: en el volcado los egresos están en 0, requiere libro valorizado.
- **APU / Recursos:** 8. APU Real, APU Contract., 9. Recursos Real, Recursos Contr. → la plataforma de Costos/APU es módulo aparte de GRAPCO (APU salió de GRAPCO el 15/06/2026; `calcularCostoAPU` se mantiene solo para RO). **GAP parcial:** carga masiva de APU desagregados (cuadrilla/insumo) no tiene importador dedicado en GRAPCO.
- **Gastos Generales (7. GG):** → componente GG del RO (ya contemplado en las patas del AC). Mapear por concepto vía importador genérico.
- **GAP:** no hay módulo de programación/flujo de caja en GRAPCO para consumir Hoja 8 si llegara valorizada (Flujo de Caja es gap conocido).
