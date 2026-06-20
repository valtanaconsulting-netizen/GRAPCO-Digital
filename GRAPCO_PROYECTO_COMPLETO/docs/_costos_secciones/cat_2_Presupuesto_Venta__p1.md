# Catálogo de Costos — Categoría 2: Presupuesto Venta (chunk p1)

Proyecto: CREDITEX (PTARI "PTAR Planta 5" + NAVE Industrial). Contratista GRAPCO SAC. Supervisión Diseños Racionales. T.C. = 3.80. 18 archivos fichados (12 Excel/xlsm + 1 dwg + 1 mpp + 2 pdf, más 2 duplicados de comparativo). Costeo MO de la plataforma con COSTO_HORA_PROMEDIO = S/25.50.

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\1. Ppto PTARI Venta Ivan\1. Presupuesto\PPTTO GRAPCO-Creditex.xlsx
- **Tipo / formato:** xlsx (presupuesto base PTARI, versión Ivan). Formularios: PPTO/PRE/PRO/MOV/EST/ARQ/APU = **GP-GCE-FOR-F01**; GG y Recursos = **PRO-GCE-FOR-F03**.
- **Hojas (12):** Carátula | PPTO | PRE | PRO | MOV | EST | ARQ | GG | APU | Hoja 8 | Recursos | Metrados
- **Contenido:**
  - **Carátula:** "PTAR CREDITEX", revisión N°01, fecha 24-jun-2025.
  - **PPTO:** resumen del presupuesto (1 DE 10). Campos: ITEM, DESCRIPCIÓN, UND, CANT, P.U. (S/.), PARCIAL (S/.), TOTAL (S/.). Obra "PTAR CREDITEX", plazo 4.50 meses.
  - **PRE / PRO / MOV / EST / ARQ:** presupuestos por especialidad (Trabajos Preliminares, Obras Provisionales, Movimiento de Tierras, Estructuras, Arquitectura). Mismo encabezado ITEM/DESCRIPCIÓN/UND/CANT/P.U./PARCIAL/SUBTOTAL/TOTAL. EST es la más extensa (+59 filas).
  - **GG:** análisis de gastos generales (4.- ANÁLISIS DE GASTOS GENERALES, características A.) — +132 filas.
  - **APU:** análisis de precios unitarios (3.-), columnas ITEM, DESCRIPCIÓN, UND, CUADRILLA, CANTIDAD, PRECIO (S/.), PARCIAL (S/.), SUB TOTAL — +1858 filas (insumos MO/material/equipo por partida).
  - **Hoja 8:** flujo/cronograma valorizado por semanas (Sem 1–24, 7 meses), filas EGRESOS por partida (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...) — valores en cero en el volcado (plantilla).
  - **Recursos:** lista de recursos con CODIGO, TIPO, DESCRIPCION, UND, SOL, USD, COMENTARIO, ESTATUS (leyenda Realizado/En proceso/Pendiente). Empieza 1.01 MANO DE OBRA. +344 filas.
  - **Metrados:** sustento de metrados (demolición de losa, calzaduras de cimientos por anillo con Long/altura/Prof/m3/m2). Ej. oxidación 240 m2, total demolición 405.20.
- **Números clave:** plazo 4.50 meses; demolición losa 405.20 m2; calzadura anillo 1 = 31.92 m3 / 45.60 m2.
- **Propósito:** presupuesto de venta original (versión Ivan) del PTARI — base del costo directo, GG, APU y recursos.
- **Origen → Destino:** metrados (hoja Metrados + APU) → PPTO resumen → es la versión predecesora de la Rev.01 GRAPCO.
- **Automatización:** Presupuesto (BAC) vía importador genérico. APU → catálogo de precios unitarios (legacy `calcularCostoAPU` para RO). Hoja 8 → Curva S / Flujo de Caja (GAP). Recursos → maestro de insumos.

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\1. Ppto PTARI Venta Ivan\2. Metrado\Met.Est_PTAR Creditex-rev00.xlsx
- **Tipo / formato:** xlsx (metrado de estructuras PTARI, rev00). Sin código de formulario (hojas de cálculo de metrado).
- **Hojas (27):** consultas | Ratios | Resumen | MOV | EST | Pedestal | Columnas | zapatas | losa cimentacion | Muro Contencion | Vigas | Losa Maciza | falsa zapata | canaleta | Excavacion masiva | ACERO | LosaAligerada | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- **Contenido:**
  - **consultas:** notas de proyecto (losa de piso lámina E-02, f'c=28).
  - **Ratios:** ratios de acero kg/m3 (Zapatas 40-70, Columnas 100-350, Vigas 100-250, Aligerados 80-175, Losas macizas 50-200).
  - **Resumen:** comparativo metrado Oferta vs Nuevo por código/partida cliente (ESTRUCTURAS, AREA 1).
  - **MOV / EST:** presupuestos GP-GCE-FOR-F01. **OJO contaminación de plantilla:** MOV referencia "PRECOTEX LAS MORERAS"/PRECOTEX (fecha 28-oct-2024); EST referencia "PLANTA PTAR 5 - CREDITEX"/CREDITEX.
  - **Hojas por elemento estructural** (Pedestal, Columnas, zapatas, losa cimentacion, Muro Contencion, Vigas, Losa Maciza, falsa zapata, canaleta, Placas, Escalera, Camara, Sobrecimientos, Cimiento corridos, bases, pedestales, cimientos armados, relleno rampa, losa rampa): cómputo de Concreto (f'c, h, e, área, m3), Encofrado (m2), Acero (longitudes L1-L5, traslapes, peso Ø por diámetro 0.25–1.38, KG total) y Curado (m2). Excavacion masiva: prof/ancho/largo/area, Excavación m3, Eliminación.
  - **ACERO:** consolidado de acero por elemento. PEDESTAL total 1274.53 KG; COLUMNAS total 10521.64 KG.
- **Números clave:** acero PEDESTAL 1274.53 kg; COLUMNAS 10521.64 kg; ratios acero por elemento.
- **Propósito:** sustento de metrados de estructuras (concreto/encofrado/acero/curado) que alimenta las cantidades del presupuesto PTARI.
- **Origen → Destino:** planos/cálculo estructural → cómputo por elemento → totales m3/m2/kg → CANT del presupuesto (PPTO/EST).
- **Automatización:** GAP (no hay módulo de metrado en GRAPCO). Las cantidades resultantes alimentan Presupuesto (BAC) como CANT por partida. Ratios de acero podrían servir a validación de consumos en Almacén.

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\1. Ppto PTARI Venta Ivan\3. Comparativo\Comparativo PPTO - PPTO VENTA.xlsx
- **Tipo / formato:** xlsx (comparativo PPTO Contractual vs PPTO Venta). 15 KB.
- **Hojas (3):** MOV | EST | ARQ
- **Contenido:** tabla a dos bloques (PPTO CONTRACTUAL | PPTO VENTA) con UND, CANT, P.U. (S/.), PARCIAL (S/.) y columna **DELTA** por partida. Ej. MOV: Movilización/desmovilización equipos GLB 5874.90 (delta 0); Excavación masiva M3 1526.40→2350.70 (delta +824.30). EST: Calzaduras (Excavación localizada 72.96→83.35, delta -7.85; Concreto ciclópeo 1:10 = 27626.24 sin cambio). ARQ: impermeabilización Sikaguard 67344.90, impermeabilizado interior 52471.89, pintura bituminosa 8419.15 (deltas 0).
- **Números clave:** Concreto ciclópeo calzaduras 27626.24; impermeabilizado Sikaguard 67344.90; interior 52471.89.
- **Propósito:** controlar la variación de cantidades/montos entre presupuesto contractual y de venta (justificación de adicionales/deductivos).
- **Origen → Destino:** PPTO contractual del cliente + PPTO venta GRAPCO → tabla delta.
- **Automatización:** Adicionales/Deductivos (las DELTA son la base de adicionales/deductivos por partida). Cargable por importador genérico.

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\1. Presupuesto\1. Superado\PPTO GRAPCO-CREDITEX_Rev.01_2025-12-09.xlsx
- **Tipo / formato:** xlsx (presupuesto PTARI versión GRAPCO Rev.01, **superado**). Formularios GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (14):** Carátula | Análisis | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. GG | 8. APU | Hoja 8 | 9. Recursos | 10. RO
- **Contenido:**
  - **Carátula:** "PTAR PLANTA 5", AV. LOS HORNOS 185 ATE, PPTO PTARI, Rev N°01, dic-2025.
  - **Análisis:** comparativo CONTRACTUAL vs REVISIÓN con PARCIAL/TOTAL y DELTA por partida. Trab. Preliminares 182704.14 (delta 0); Obras Provisionales 103581.17→78113.38 (delta -25467.78); Diseño 40000.
  - **PPTO + 1.PRE..6.IISS:** presupuesto por especialidad (añade **IISS** Instalaciones Sanitarias vs versión Ivan). Cliente CREDITEX, supervisión Diseños Racionales, plazo 4.50 meses.
  - **7. GG:** gastos generales (PRO-GCE-FOR-F03 v1).
  - **8. APU:** +1983 filas de precios unitarios.
  - **Hoja 8:** cronograma valorizado semanal (plantilla en cero).
  - **9. Recursos:** +351 filas de recursos (MO/material/equipo), T.C.=3.80.
  - **10. RO:** **estructura del Resultado Operativo** — FRENTE, PARTIDA, Descripción, Ppto F1 (PTARI) S/., SUBTOTAL, CONTROL. **TOTAL COSTO DE OBRA 2,244,674.40 (subtotal/control 2,227,530.57); COSTO DIRECTO 1,761,528.98 (1,744,385.15).** Detalle por partida con código de frente (PRE1, PRE2...) y FA01.
- **Números clave:** Costo de Obra 2,244,674.40 / 2,227,530.57; Costo Directo 1,761,528.98 / 1,744,385.15; Trab. Preliminares 182,704.14; Obras Provisionales delta -25,467.78.
- **Propósito:** presupuesto de venta GRAPCO del PTARI (versión superada por la 2025-12-10) y plantilla del RO por frente F1.
- **Origen → Destino:** metrados Rev.01 + APU + recursos → PPTO → hoja 10.RO (mapeo frente/partida → presupuesto base del RO).
- **Automatización:** Presupuesto (BAC) y, sobre todo, **hoja 10.RO → Resultado Operativo (RO/CR/F06)** como BAC/línea base del frente F1-PTARI. Importador genérico; APU → catálogo PU.

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\1. Presupuesto\PPTO GRAPCO-PTARI CREDITEX_Rev.01_2025-12-10.xlsx
- **Tipo / formato:** xlsx (presupuesto PTARI GRAPCO Rev.01, **versión vigente** — supera a la del 12-09). GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (14):** idénticas a la anterior (Carátula | Análisis | PPTO | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | 7.GG | 8.APU | Hoja 8 | 9.Recursos | 10.RO).
- **Contenido:** misma estructura; cambio clave en **Análisis**: Trabajos Preliminares 182704.14→**142704.14 (delta -40000)** por eliminación del ítem **1.40 DISEÑO (40000 → 0, delta -40000)**; Obras Provisionales sigue -25467.78.
  - **10. RO:** **TOTAL COSTO DE OBRA 2,175,971.15 (2,158,827.33); COSTO DIRECTO 1,692,825.73 (1,675,681.91); Trab. Preliminares 142,704.14.**
- **Números clave:** Costo de Obra 2,175,971.15 / 2,158,827.33; Costo Directo 1,692,825.73 / 1,675,681.91; deductivo DISEÑO -40,000.
- **Propósito:** presupuesto de venta vigente del PTARI (frente F1) — fuente de la línea base del RO PTARI.
- **Origen → Destino:** versión 12-09 menos ítem DISEÑO → PPTO/RO actualizado.
- **Automatización:** **Presupuesto (BAC) + hoja 10.RO → Resultado Operativo (BAC F1-PTARI vigente).** La diferencia 12-09 vs 12-10 = deductivo registrable en Adicionales/Deductivos. Importador genérico.

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\2. Metrado\Met.Est_PTAR CREDITEX Rev.01_2025-12-09.xlsx
- **Tipo / formato:** xlsx (metrado PTARI Rev.01). Hojas de metrado sin código de formulario.
- **Hojas (33):** consultas | Ratios | Resumen | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | Met_ARQ | Met_MOV | Met_DEM | Met_CALZ | Met_FZ | Met_ZAP | Met_COL | Met_LCIM | Met_MC | Met_VIG | Met_Losa Maciza | Met_IISS | REV. ACERO | Placas | LosaAligerada | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- **Contenido:**
  - **consultas / Ratios / Resumen:** igual a metrado Ivan (notas, ratios acero, comparativo Oferta/Nuevo).
  - **1.PRE..6.IISS:** metrados por especialidad (ITEM/DESCRIPCIÓN/UND/CANT). **OJO contaminación:** PRE/PRO/MOV referencian "PRECOTEX LAS MORERAS"/PRECOTEX; EST/ARQ/IISS referencian "PLANTA PTAR 5 - CREDITEX"/CREDITEX (fecha 22-mar-2026).
  - **Met_xxx:** cómputos por elemento (Met_ARQ impermeabilización losa de fondo; Met_MOV excavaciones masivas Excavación 2605.30 / Eliminación 3386.89; Met_DEM demolición; Met_CALZ calzaduras por anillo: 1er anillo Tienda de Telas Excavación 28.43 m3, Concreto 28.43 m3, Encofrado 77.21 m2; Met_ZAP zapatas; Met_LCIM losa cimentación con juntas; Met_MC muros contención total acero 29832.60 kg, 58.82 kg/m2; Met_VIG vigas; etc.).
  - **REV. ACERO:** revisión consolidada de acero. COLUMNAS total 8394.46 KG; ZAPATA 432.13 KG.
- **Números clave:** Excavación masiva 2605.30 m3 / Eliminación 3386.89 m3; muro contención acero 29832.60 kg; columnas acero 8394.46 kg; zapata 432.13 kg.
- **Propósito:** sustento de cantidades del PPTO PTARI Rev.01 (concreto/encofrado/acero por elemento).
- **Origen → Destino:** planos estructurales → cómputo por elemento → CANT de PPTO/RO PTARI.
- **Automatización:** GAP (sin módulo metrado). Cantidades → Presupuesto (BAC). Ratios y consumos de acero → cruce con Almacén (Kardex S10).

---

### \05. Gestión Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\3. Comparativo\Comparativo PPTO - PPTO VENTA.xlsx
- **Tipo / formato:** xlsx (comparativo Contractual vs Venta, versión GRAPCO). 15 KB. **Contenido idéntico al comparativo de la sección Ivan** (mismas hojas MOV/EST/ARQ y mismos valores: excavación masiva delta +824.30, concreto ciclópeo 27626.24, Sikaguard 67344.90, interior 52471.89).
- **Hojas (3):** MOV | EST | ARQ
- **Propósito:** comparativo contractual vs venta por partida (delta) — base de adicionales/deductivos.
- **Origen → Destino:** PPTO contractual cliente + PPTO venta → DELTA.
- **Automatización:** Adicionales/Deductivos. Importador genérico. (Duplicado del comparativo Ivan — cargar una sola vez.)

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\1. Metrados\Met.Est_NAVE CREDITEX Rev.01_2026-01-08.xlsx
- **Tipo / formato:** xlsx (metrado NAVE Industrial Rev.01). Hojas de metrado sin código de formulario.
- **Hojas (34):** consultas | Ratios | Resumen | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | Met_ARQ | Met_MOV | Met_DEM | Met_CALZ | Met_FZ | Met_ZAP | Met_PED | Met_CANAL | Met_LCIM | Met_Losa Maciza | Met_COL | Met_VIG | LosaAligerada | Met_IISS | REV. ACERO | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- **Contenido:** misma arquitectura que el metrado PTARI (consultas, ratios acero, Resumen Oferta/Nuevo, metrados por especialidad y por elemento Met_xxx con concreto/encofrado/acero). **OJO contaminación:** 1.PRE referencia "PRECOTEX LAS MORERAS"/PRECOTEX. Añade Met_PED (pedestales) y Met_CANAL (canaleta) propios de la nave.
- **Números clave:** (cómputos por elemento; volcado muestra encabezados — sustento de cantidades de la cimentación de la nave).
- **Propósito:** sustento de metrados de la NAVE Industrial (frente F2), principalmente cimentación de concreto y acero para la estructura metálica.
- **Origen → Destino:** planos NAVE (dwg) → cómputo por elemento → CANT del PPTO NAVE (Opción A/B).
- **Automatización:** GAP (sin módulo metrado). Cantidades → Presupuesto (BAC) frente F2-NAVE.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\2. Planos\PL ESTR_CREDITEX_2025.12.09_GRAPCO.dwg
- **Tipo / formato:** **.dwg (AutoCAD, no-Excel)**, 2795 KB.
- **Propósito:** planos de estructuras de la NAVE (CREDITEX, rev 2025.12.09 GRAPCO) — fuente gráfica de los metrados de estructura metálica/cimentación.
- **Origen → Destino:** diseño estructural → metrados (Met.Est_NAVE) y cotización M&M.
- **Automatización:** No ingerible (documento técnico de referencia). Adjuntar como documento del proyecto. No alimenta costos directamente.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\3. Cronograma\Cronograma Nave Estruct. Metalica Rev 1.mpp
- **Tipo / formato:** **.mpp (MS Project, no-Excel)**, 398 KB.
- **Propósito:** cronograma de la estructura metálica de la nave (Rev 1) — secuencia de fabricación/montaje.
- **Origen → Destino:** plazos NAVE → cronograma; relacionado con escenarios A (3.5m) / B (5.0m).
- **Automatización:** GAP de importación directa de .mpp. Reaprovechable en Cronograma Pro (CPM) si se re-captura; por ahora documento de referencia.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\4. Normativa\3501r_01.pdf
- **Tipo / formato:** **.pdf (no-Excel)**, 144 KB.
- **Propósito:** documento normativo de referencia para el presupuesto de la nave (norma técnica, código 3501r).
- **Automatización:** No ingerible a costos. Documento de referencia del expediente.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\4. Normativa\Redes de aguas residuales - Norma OS-070.pdf
- **Tipo / formato:** **.pdf (no-Excel)**, 652 KB.
- **Propósito:** Norma OS-070 (Redes de aguas residuales) — sustento normativo de las instalaciones sanitarias (IISS) de la PTAR/nave.
- **Automatización:** No ingerible a costos. Documento de referencia.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\5. Cotización M&M\04. Creditex - Cotizacion General - Rev.04.1.xlsm
- **Tipo / formato:** xlsm (cotización del subcontratista **M&M Industria Metálica SAC**, Rev.04.1). RUC 20551531326, dirigido a Ing. Jose Teixeira (Creditex), fecha 18-mar-2026.
- **Hojas (4):** 00. Metrado REV.03 | 00. Metrado REV.04 | 01. Cotizacion M&M POL | 02. Cotizacion M&M PUR
- **Contenido:**
  - **Metrado REV.03 / REV.04:** despiece de estructura metálica por Item/Descripción/Unidad/ml/Kg/ml/Cantidad/Parcial/factor 0.09/Metrado. REV.04 añade columnas "METRADO REV.03" y "DECISION A TOMAR" (Se mantiene origen / Se cambia). Cimentación (plancha base 450x450x25mm 474.91 kg; pernos anclaje Ø1" 611.07→496.50 kg; cartela 135.09 kg); Columnas (CM1 HSS 10"x10"x1/4" 3379.99→3401.12 kg; CM2 HSS 8"x8"x3/16" 2042.08 kg).
  - **01/02 Cotizacion M&M POL / PUR:** cotización con cobertura POL (poliuretano) y PUR — Item/Descripción/Unidad/Metrado/Precio S/./Parcial S/. + columnas INCIDENCIA (0.04), PAZ, GG, PU Nuevo, PARCIAL (con incremento). Movilización GLB 9400 (mov/desmov herramientas 600→636→661.44; mov estructuras/cobertura 5000→5300→5512).
- **Números clave:** movilización total 9400; mov/desmov herramientas 661.44; mov estructuras/cobertura 5512; incidencia 0.04; factor 0.09.
- **Propósito:** cotización del subcontratista de estructura metálica (insumo de costo del frente F2-NAVE).
- **Origen → Destino:** metrado NAVE → cotización M&M → costo directo de estructuras en PPTO NAVE.
- **Automatización:** **Valorización de Subcontratistas (F10/F11) = GAP.** Hoy cargable como costo de partida vía importador genérico al Presupuesto/RO de la nave; comparativo de revisiones (REV.03 vs REV.04) → control de variaciones de SC.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\5. Cotización M&M\04. Creditex - Cotizacion General - Rev.04.2.xlsm
- **Tipo / formato:** xlsm (cotización M&M Rev.04.2), 188 KB. Variante de la anterior.
- **Hojas (3):** 00. Metrado REV.03 | 00. Metrado REV.04 | 01. Cotizacion M&M POL
- **Contenido:** mismos metrados REV.03/REV.04 (plancha base 474.91 kg, CM1 3401.12 kg, etc.). La hoja Cotizacion M&M POL es versión simple (sólo Item/Descripción/Unidad/Metrado/Precio/Parcial; movilización 9400). No incluye hoja PUR.
- **Números clave:** movilización 9400; mismos pesos de cimentación/columnas que Rev.04.1.
- **Propósito:** revisión 04.2 de la cotización M&M (variante POL).
- **Origen → Destino:** metrado NAVE → cotización M&M → costo SC estructura metálica.
- **Automatización:** Valorización de Subcontratistas (GAP); por ahora importador genérico → costo de partida NAVE.

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\5. Cotización M&M\1. Superado\04. Creditex - Cotizacion General - Rev.04.xlsm
- **Tipo / formato:** xlsm (cotización M&M Rev.04, **superada**), 267 KB.
- **Hojas (4):** 00. Metrado REV.03 | 00. Metrado REV.04 | 01. Cotizacion M&M POL | 02. Cotizacion M&M PUR
- **Contenido:** igual estructura que Rev.04.1 (metrados idénticos; cotizaciones POL y PUR en versión simple Item/Descripción/Unidad/Metrado/Precio/Parcial; movilización 9400).
- **Propósito:** versión origen (superada) de la cotización del SC M&M.
- **Origen → Destino:** metrado NAVE → cotización M&M → costo SC.
- **Automatización:** Valorización de Subcontratistas (GAP). Histórico de revisiones; cargar sólo la vigente (Rev.04.1/04.2).

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\6. PPTO Superado\PPTO GRAPCO-NAVE CREDITEX_Rev.01_2026.01.26_Opción A (3.5 meses).xlsx
- **Tipo / formato:** xlsx (presupuesto NAVE Rev.01, **Escenario A = 3.5 meses**, superado). GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (15):** Carátula | PPTO | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | 7.APU | Hoja 8 | 8.Recursos | 10.Esquema | 11.Sectorizacion | 12.RO | 9.Pull (Escenario A)
- **Contenido:**
  - **Carátula / PPTO:** "PTAR PLANTA 5", PPTO NAVE INDUSTRIAL - ESCENARIO A, N°02, 26-ene-2026. **PLAZO F2: 3.50 meses, TRASLAPE C/F1: 1 mes.**
  - **1.PRE..6.IISS:** presupuesto por especialidad (4.EST extensa +121 filas, estructura metálica).
  - **7. APU:** +2471 filas de precios unitarios.
  - **8. Recursos:** +381 filas (T.C.=3.80).
  - **10. Esquema:** esquema de obra (GP-GCE-FOR-F01), plazo #REF!.
  - **11. Sectorizacion:** LAYOUT DE OBRA / SECTORIZACION DE CIMENTACION (sectores C1, C2, S1, S3, acopio de químicos, lavandería, talud a tanques existentes).
  - **9. Pull (Escenario A):** Pull Planning NAVE F2. PROYECTO NAVE INDUSTRIAL, ubicación Lima-Huachipa, cliente CREDITEX, elaborado Guido Gonzales / revisado Jose Teixeira. **Jornada 8 HH/día; 90 días hábiles / 105 calendario (15 domingos); 3.50 meses; inicio 02-feb-2026, fin 18-may-2026.**
  - **12. RO:** Resultado Operativo frente F2-NAVE. **TOTAL COSTO DE OBRA 1,055,801.35; COSTO DIRECTO 834,831.45; Trab. Preliminares 35,075.26** (SSO 7739.26, Topografía 20556.68).
- **Números clave:** Costo de Obra 1,055,801.35; Costo Directo 834,831.45; plazo 3.50 meses; 90 HH-días; jornada 8 HH/día.
- **Propósito:** presupuesto de venta NAVE escenario rápido (3.5 meses) con sectorización y pull planning — base RO del frente F2 (opción A).
- **Origen → Destino:** metrado NAVE + cotización M&M + APU → PPTO → hoja 12.RO (BAC F2 opción A) y hoja 9.Pull (cronograma).
- **Automatización:** **Presupuesto (BAC) + 12.RO → Resultado Operativo (BAC F2-NAVE)**; 9.Pull → Cronograma / Last Planner (Pull Planning); 11.Sectorizacion → Sectorización (VDC). ISP: jornada 8 HH/día y HH-días → ISP (tareos HH × S/25.5).

---

### \05. Gestión Costos\2. Presupuesto Venta\2. PPTO NAVE\6. PPTO Superado\PPTO GRAPCO-NAVE CREDITEX_Rev.01_2026.01.26_Opción B (5.0 meses).xlsx
- **Tipo / formato:** xlsx (presupuesto NAVE Rev.01, **Escenario B = 5.0 meses**, superado). GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (15):** Carátula | PPTO | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | 7.APU | Hoja 8 | 8.Recursos | 9.Pull (Escenario B) | 10.Esquema | 11.Sectorizacion | 12.RO
- **Contenido:**
  - **Carátula / PPTO:** PPTO NAVE INDUSTRIAL - ESCENARIO B, N°02. **PLAZO F2: 5 meses, TRASLAPE C/F1: 1 mes.**
  - **1.PRE..6.IISS / 7.APU (+2472 filas, hoja arranca con celda "fFALSA") / 8.Recursos (+381) / 10.Esquema / 11.Sectorizacion:** misma estructura que Opción A.
  - **9. Pull (Escenario B):** Pull Planning F2 escenario lento. **127 días hábiles / 148 calendario (21 domingos); 5 meses; jornada 8 HH/día; inicio 02-feb-2026, fin 30-jun-2026.**
  - **12. RO:** Resultado Operativo F2-NAVE escenario B. **TOTAL COSTO DE OBRA 1,131,445.76; COSTO DIRECTO 894,644.15; Trab. Preliminares 94,887.96** (SSO 45355.12, Topografía 35974.19).
- **Números clave:** Costo de Obra 1,131,445.76; Costo Directo 894,644.15; plazo 5 meses; 127 HH-días. **Diferencia vs Opción A: +75,644.41 de costo de obra y +59,812.70 de trab. preliminares** (mayor SSO/topografía por mayor plazo).
- **Propósito:** presupuesto de venta NAVE escenario largo (5 meses) — alternativa de plazo para decisión comercial.
- **Origen → Destino:** mismos insumos que Opción A con plazo extendido → PPTO/RO/Pull escenario B.
- **Automatización:** **Presupuesto (BAC) + 12.RO → Resultado Operativo (BAC F2-NAVE opción B)**; 9.Pull → Cronograma/Last Planner; 11.Sectorizacion → Sectorización. La comparación A vs B alimenta un análisis de escenarios de plazo/costo (GAP de módulo de escenarios; se puede modelar como dos baselines).

---

## Notas transversales del chunk
- **Códigos de formulario:** GP-GCE-FOR-F01 (Presupuesto, PRE/PRO/MOV/EST/ARQ/IISS, APU, Esquema), PRO-GCE-FOR-F03 (Gastos Generales y Recursos).
- **Frentes RO:** F1 = PTARI (Ppto F1); F2 = NAVE (Ppto F2). Las hojas "10.RO"/"12.RO" son la estructura BAC del Resultado Operativo por frente.
- **Contaminación de plantilla:** varias hojas de metrado/PPTO de las versiones Ivan/Rev.01 arrastran encabezados "PRECOTEX LAS MORERAS" en PRE/PRO/MOV (la plantilla nació de otro proyecto); el cliente real es CREDITEX. Validar OBRA/CLIENTE al ingerir.
- **Histórico:** existen versiones superadas (PTARI 12-09, M&M Rev.04) y vigentes (PTARI 12-10, M&M Rev.04.1/04.2); cargar sólo la vigente por frente.
