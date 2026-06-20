# Catálogo de Costos — 2. Presupuesto Venta (cont. 2)

Chunk: `cat_2_Presupuesto_Venta__p2`
Categoría: Presupuesto de Venta — PPTO NAVE (Frente F2: estructura metálica y losa), proyecto CREDITEX "PTAR PLANTA 5" / NAVE INDUSTRIAL, Ate / Huachipa, Lima.
Contratista GRAPCO SAC, supervisión DISEÑOS RACIONALES.

Nota general: el volcado muestra solo las primeras ~10 filas de cada hoja más un contador "(+N filas)". Los números clave fiables están en las cabeceras y en la hoja "12. RO" de cada presupuesto.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\6. PPTO Superado\PPTO GRAPCO-NAVE CREDITEX_Rev.02_2026.03.19.xlsx
- Tipo / formato: xlsx — Presupuesto de obra GRAPCO. Formato base GP-GCE-FOR-F01 (presupuesto) y PRO-GCE-FOR-F03 (recursos / GG). Revisión N°02, fecha 19/03/2026. Carpeta "6. PPTO Superado" (versión superada / archivada).
- Hojas (15): Carátula | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 10. Esquema | 11. Sectorizacion | 12. RO | 9. Pull
- Contenido por hoja:
  - **Carátula**: identificación — Obra "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; denominación "PPTO ESTRUCTURA METÁLICA Y LOSA"; presupuesto N°02.
  - **PPTO**: Resumen del presupuesto (GP-GCE-FOR-F01, pág 1 de 10). Plazo F2: 2.50 meses; traslape con F1: 0.30 meses. Tabla resumen con ITEM | DESCRIPCIÓN | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.). +48 filas (no visibles).
  - **1. PRE** Trabajos Preliminares: tabla de partidas ITEM/DESCRIPCIÓN/UND/CANT/P.U./PARCIAL/SUBTOTAL/TOTAL. +18 filas.
  - **2. PRO** Obras Provisionales: misma estructura de partidas. +23 filas.
  - **3. MOV** Movimiento de Tierras: partidas. +17 filas.
  - **4. EST** Estructuras (la más grande de especialidades): partidas. +101 filas.
  - **5. ARQ** Arquitectura: partidas. +32 filas.
  - **6. IISS** Instalaciones Sanitarias: partidas. +18 filas.
  - **7. APU** Análisis de Precios Unitarios: ITEM | DESCRIPCIÓN | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL | SUB TOTAL. +2477 filas (banco de APUs completo del frente).
  - **Hoja 8**: cronograma valorizado / flujo de egresos por semana (Sem 1..Sem 24, 7 meses). Filas por concepto: Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori... (+15 filas). En este dump las celdas de EGRESOS aparecen en 0 (plantilla sin valores volcados o sin llenar).
  - **8. Recursos** (PRO-GCE-FOR-F03, pág 10 de 10): listado de recursos con CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS; T.C. = 3.80; leyenda de estatus (REALIZADO/PROCESO/PENDIENTE). Empieza 1.01 MANO DE OBRA. +383 filas (mano de obra, materiales, equipos).
  - **10. Esquema**: hoja de esquema (cabecera GP-GCE-FOR-F01); PLAZO con #REF! (fórmula rota). Sin datos de detalle visibles.
  - **11. Sectorizacion**: layout de obra y sectorización de cimentación/excavación (zonas C1, C2, S1, S3, ACOPIO DE QUIMICOS, LAVANDERIA, TALUD A TANQUES EXISTENTES). Matriz gráfica, no numérica.
  - **12. RO** (Resultado Operativo / presupuesto meta por frente): FRENTE | PARTIDA | Descripción | Ppto F2 (NAVE) | SUBTOTAL. Lista las partidas con su costo meta.
  - **9. Pull** (Pull Planning): proyecto NAVE INDUSTRIAL, Lima-Huachipa; días Domingo 11, Feriados 0, Hábiles 64, Calendario 75 = 2.50 meses; jornada 8 HH/día; inicio 02/02/2026, fin 18/04/2026; elaborado Guido Gonzales, revisado Jose Teixeira. +36 filas de actividades.
- Números clave (hoja 12. RO):
  - TOTAL COSTO DE OBRA: **S/ 710,392.97**
  - COSTO DIRECTO: **S/ 545,588.27** ... el volcado muestra **561,714.00** en esta Rev.02 (Costo Directo 561,714.00; total obra 710,392.97). Diferencia Total−CD = S/ 148,678.97 (GG + utilidad).
  - Partida 1001 Trabajos Preliminares: S/ 14,797.89 (TOPOGRAFÍA 1.02 = 10,278.34; SSO 1.01 = 0).
  - T.C. = 3.80; plazo F2 = 2.50 meses + traslape 0.30 con F1.
- Propósito: presupuesto meta/venta del Frente 2 (nave: estructura metálica + losa); define costo directo, GG, APUs y recursos. Es la línea base de costo (BAC) contra la que se mide el RO.
- Origen -> Destino: lo elabora GRAPCO (área de costos) a partir de metrados + APUs + recursos -> alimenta el Resultado Operativo (hoja 12. RO), el cronograma valorizado (Hoja 8) y el Pull Planning.
- Automatización: importar a módulo **Presupuesto (BAC)** de GRAPCO. Hoja 12. RO y PPTO -> presupuesto meta por partida/frente; 7. APU -> banco de APUs (módulo APU/Costos, hoy fuera de GRAPCO); 8. Recursos -> catálogo de recursos; Hoja 8 -> Curva S/flujo (GAP de Flujo de Caja). Es una **versión superada**: usar la Rev.03 como vigente.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\PPTO GRAPCO-NAVE CREDITEX_GG.xlsx
- Tipo / formato: xlsx — Gastos Generales. Cabecera GG con código **PRO-GCE-FOR-F03 v1**; PPTO con GP-GCE-FOR-F01. Revisión N°01, fecha 01/12/2025.
- Hojas (4): Carátula | PPTO | GG | Hoja 8
- Contenido por hoja:
  - **Carátula**: "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; denominación GASTOS GENERALES; Revisión N°01; 01/12/2025.
  - **PPTO**: resumen del presupuesto de GG (GP-GCE-FOR-F01); plazo 2 meses; tabla ITEM/DESCRIPCIÓN/UND/CANT/P.U./PARCIAL/TOTAL. +11 filas.
  - **GG**: "4.- ANÁLISIS DE GASTOS GENERALES"; PLAZO 4.50 meses; estructura A. CARACTERÍSTICAS... +132 filas (detalle de GG: personal, equipos de obra, oficina, EPP, etc.).
  - **Hoja 8**: cronograma/flujo de egresos por semana (Sem 1..24), mismo formato que el PPTO base; EGRESOS en 0 en el dump.
- Números clave: no hay totales numéricos visibles en el volcado (las filas con montos están bajo el contador "+N filas"). Plazos: PPTO 2 meses; análisis GG 4.50 meses.
- Propósito: cálculo de los Gastos Generales del frente NAVE, que se suman al costo directo para el presupuesto de venta.
- Origen -> Destino: elaborado por GRAPCO -> alimenta el resumen del PPTO (la diferencia Total−CD del archivo de presupuesto) y el RO.
- Automatización: importar a módulo **Presupuesto (BAC) / componente GG** y al **Resultado Operativo (pata de Gastos Generales)**. Importador genérico in-app. El detalle del análisis GG no tiene módulo dedicado en GRAPCO -> GAP parcial (cargar como total de GG por ahora).

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\PPTO GRAPCO-NAVE CREDITEX_GGrEV JCT20.03.26.xlsx
- Tipo / formato: xlsx — Gastos Generales, revisión con observaciones de JCT (iniciales) del 20/03/2026. Misma plantilla que el _GG.xlsx (PRO-GCE-FOR-F03 v1 / GP-GCE-FOR-F01). Carátula sigue marcando Revisión N°01, 01/12/2025 (no actualizada).
- Hojas (4): Carátula | PPTO | GG | Hoja 8
- Contenido por hoja:
  - **Carátula / PPTO / Hoja 8**: idénticas estructuralmente al archivo _GG.xlsx (resumen GG, plazo 2 meses, cronograma de egresos por semana en 0).
  - **GG**: análisis de gastos generales; PLAZO 4.50 meses; +133 filas (una fila más que la versión _GG.xlsx → es una revisión incremental del mismo análisis, ajustada por JCT el 20/03/2026).
- Números clave: sin totales numéricos visibles en el volcado (montos bajo "+N filas").
- Propósito: versión revisada de los Gastos Generales del frente NAVE (revisión 20/03/2026, alineada en fecha con la Rev.02/Rev.03 del presupuesto).
- Origen -> Destino: GRAPCO (con revisión JCT) -> componente GG del presupuesto de venta y del RO.
- Automatización: misma ruta que _GG.xlsx — módulo **Presupuesto (BAC)/GG** + **RO (pata GG)**. Tratar este como la versión vigente de GG por su fecha (20/03/2026); el detalle fino del análisis es GAP parcial.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx
- Tipo / formato: xlsx — Presupuesto de obra GRAPCO, **Rev.03, 23/03/2026** (versión más reciente del frente NAVE; sucesora de la Rev.02 superada). Formatos GP-GCE-FOR-F01 y PRO-GCE-FOR-F03.
- Hojas (15): Carátula | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 10. Esquema | 11. Sectorizacion | 12. RO | 9. Pull (idéntica estructura a la Rev.02).
- Contenido por hoja: igual a la Rev.02 (ver ficha de Rev.02 para el detalle de cada hoja: PPTO resumen, especialidades PRE/PRO/MOV/EST/ARQ/IISS, 7. APU con +2477 filas, 8. Recursos con +384 filas y T.C. 3.80, Hoja 8 cronograma de egresos, 11. Sectorizacion layout, 12. RO ppto meta por frente, 9. Pull con 2.50 meses / jornada 8 HH).
  - La carátula sigue diciendo "PRESUPUESTO N°02" (la rotulación de revisión interna no se actualizó, pero el nombre de archivo y la fecha son Rev.03 23/03/2026).
- Números clave (hoja 12. RO — versión vigente):
  - TOTAL COSTO DE OBRA: **S/ 689,998.96**
  - COSTO DIRECTO: **S/ 545,588.27**
  - Diferencia (GG + utilidad): S/ 144,410.69
  - Partida 1001 Trabajos Preliminares: S/ 14,797.89 (TOPOGRAFÍA = 10,278.34; SSO = 0)
  - Comparativo vs Rev.02: el costo total baja de **710,392.97 → 689,998.96** (−S/ 20,394.01); el costo directo de la Rev.03 (545,588.27) es el que la Rev.02 mostraba en su cabecera de "COSTO DIRECTO".
- Propósito: **presupuesto meta vigente** del Frente 2 (nave estructura metálica + losa) de CREDITEX. Línea base de costo (BAC) para medir desviaciones en el RO.
- Origen -> Destino: GRAPCO costos -> Resultado Operativo (12. RO), cronograma valorizado (Hoja 8), Pull Planning (9. Pull) y curva S.
- Automatización: importar a módulo **Presupuesto (BAC)** como versión vigente del frente NAVE/F2. 12. RO -> meta por partida/frente del **Resultado Operativo**; 7. APU -> banco de APUs; 8. Recursos -> catálogo de recursos/MO; Hoja 8 -> Curva S (F07) y Flujo de Caja (GAP). Usar esta Rev.03 (no la Rev.02 superada).

---

## Resumen del chunk
- Archivos fichados: 4 (2 presupuestos completos de 15 hojas: Rev.02 superada y Rev.03 vigente; 2 archivos de Gastos Generales: _GG y _GGrEV revisión JCT).
- Todos pertenecen al frente **NAVE (F2)** de CREDITEX "PTAR PLANTA 5" / Nave Industrial Huachipa; plazo 2.50 meses (02/02/2026–18/04/2026); T.C. 3.80; jornada 8 HH/día.
- Formatos detectados: GP-GCE-FOR-F01 (presupuesto), PRO-GCE-FOR-F03 (recursos / gastos generales).
- Versiones: la **Rev.03 (23/03/2026)** es la vigente; la Rev.02 está en "6. PPTO Superado". GG vigente = _GGrEV JCT 20/03/2026.
- GAPs en GRAPCO: Flujo de Caja (Hoja 8 — cronograma de egresos por semana), detalle de análisis de Gastos Generales (no hay módulo dedicado), y banco de APUs (Costos salió de GRAPCO — vive en plataforma de Costos aparte).
