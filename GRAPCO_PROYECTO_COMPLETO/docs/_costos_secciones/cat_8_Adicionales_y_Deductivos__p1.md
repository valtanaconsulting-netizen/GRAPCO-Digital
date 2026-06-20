# Categoría 8 — Adicionales y Deductivos (CHUNK p1)

Proyecto: CREDITEX (PTARI / "PTAR PLANTA 5") + NAVE de Recuperación · Cliente CREDITEX S.A.A. · Contratista GRAPCO S.A.C. · Supervisión: DISEÑOS RACIONALES (en los ADs estructurales) / NA o vigilancia · Ubicación AV. LOS HORNOS 185, ATE.

Patrón general del expediente de Adicional (formato GRAPCO):
- Cada Adicional usa la plantilla **GP-GCE-FOR-F05** (a veces el resumen interno cita PRO-GCE-FOR-F03 / GP-GCE-FOR-F01 / PRO-GCE-FOR-F05 según la hoja).
- Estructura típica de hojas: **Carátula** (obra, denominación, N° de adicional, revisión, fecha) · **Resumen** (presupuesto: ITEM, DESCRIPCIÓN, UND, CANT, P.U., PARCIAL, SUBTOTAL, TOTAL) · **Metrados** (planilla de metrados PRO-GCE-FOR-F05) · **APU** (análisis de precios unitarios MO) · **Registro Fotográfico** · a veces **Cotización** (sustento de proveedor) y/o **Esquema / Cronograma**.
- Los ADs grandes (N°12 Edificio de Recuperación) traen expediente completo tipo presupuesto BAC: PRE/PRO/MOV/EST/ARQ/IISS + APU + Recursos + Pull Planning + Sectorización + RO interno.
- Casi todos los montos/cantidades del Resumen y APU no quedan visibles en el volcado (celdas con fórmula y columnas truncadas); los pocos valores numéricos concretos se listan abajo.

---

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°24_Muro en Cisterna Externa\GP-GCE-FOR-F05-AD N°24 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°24 Rev.01, plantilla GP-GCE-FOR-F05 (resumen cita GP-GCE-FOR-F01; metrados/APU citan PRO-GCE-FOR-F05). 2245 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido:
  - Carátula: obra "PTAR PLANTA 5", denominación "MURO NUEVO Y CANALETA DE CONCRETO IMPE(rmeable)", Adicional N°24 Rev.01, fecha 29/12/2025.
  - Resumen: PRESUPUESTO con columnas ITEM | DESCRIPCIÓN | UND | CANT | P.U. (S/.) | PARCIAL | SUBTOTAL | TOTAL; PLAZO 15 DÍAS (+55 filas, partidas no volcadas).
  - 1. Metrados: planilla por CONCRETO / ACERO / TOTAL (factor 13.59 = peso varilla, +29 filas).
  - 2. APU: análisis de PU mano de obra; aparece "ALQUILER DE ANDAMIOS PARA TRABAJOS" UND MES P.U. 262.92 (+229 filas).
  - 3. Registro Fotográfico: solo cabecera (fotos no volcadas).
- Números clave: alquiler andamios = S/ 262.92/mes; plazo 15 días.
- Propósito: sustento de costo del adicional Muro + canaleta de concreto impermeable en cisterna externa, para cobro al cliente.
- Origen -> Destino: metrados de campo + APU GRAPCO -> presupuesto del adicional -> negociación/valorización CREDITEX y RO (sobrecosto/mayor metrado).
- Automatización: importar Resumen como registro en módulo Adicionales/Deductivos (cabecera + líneas de partida con PU/total); APU MO alimenta ISP/RO. GRAPCO ya tiene módulo Adicionales/Deductivos -> destino directo.

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°25_Media Caña en Decantador\GP-GCE-FOR-F05-AD N°25 Rev.02.xlsx
- Tipo / formato: xlsx — Adicional N°25 Rev.02, GP-GCE-FOR-F05. 693 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido: denominación "MEDIA CAÑA EN DECANTADOR", fecha 15/06/2026, PLAZO 7 DÍAS. Resumen (+41 filas). Metrados CONCRETO/ACERO (+10 filas). APU: "ALQUILER DE ANDAMIOS PARA TRABAJOS" UND GLB P.U. 262.92 (+152 filas). Registro Fotográfico solo cabecera.
- Números clave: andamios S/ 262.92 (GLB); plazo 7 días.
- Propósito: costo del adicional media caña (transición) en decantador.
- Origen -> Destino: metrados/APU -> presupuesto adicional -> valorización CREDITEX / RO.
- Automatización: módulo Adicionales/Deductivos (esta Rev.02 es la vigente; cargar como versión actual).

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°25_Media Caña en Decantador\SUPERADO\GP-GCE-FOR-F05-AD N°25 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°25 Rev.01 (SUPERADO/obsoleta). 693 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico (idéntica estructura a Rev.02).
- Contenido: misma denominación "MEDIA CAÑA EN DECANTADOR", Rev.01; APU andamios GLB 262.92 (+154 filas).
- Números clave: andamios S/ 262.92.
- Propósito: versión anterior superada por Rev.02; valor histórico/auditoría.
- Origen -> Destino: reemplazada por Rev.02.
- Automatización: NO cargar como vigente (carpeta SUPERADO); a lo sumo guardar como histórico de versión en el módulo Adicionales.

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°26_Cambio de Diseño en Escalera de Nave\GP-GCE-FOR-F05-AD N°26 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°26 Rev.01, GP-GCE-FOR-F05 (resumen cita PRO-GCE-FOR-F03). 727 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido: denominación "CAMBIO DE DISEÑO EN ESCALERA DE NAVE", fecha 16/06/2026, PLAZO 7 DÍAS, supervisión DISEÑOS RACIONALES. Metrados con ítem IMPERMEABILIZACIÓN (+19 filas). APU: "ESCALERA METALICA" UND KG P.U. 14.29 (+19 filas).
- Números clave: PU escalera metálica = S/ 14.29/kg.
- Propósito: sustento del sobrecosto por rediseño de escalera metálica de la nave.
- Origen -> Destino: RFI 033 + cotización M&M -> metrados/APU -> presupuesto adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; el insumo escalera metálica (kg) puede ligarse a Almacén/cotización proveedor.

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°26_Cambio de Diseño en Escalera de Nave\SUSTENTO\01_Creditex_Cotizacion Adicional Esc. Metalica_Rev.01.xlsm
- Tipo / formato: xlsm (Excel con macros) — cotización de proveedor. 1 hoja. 216 KB.
- Hojas: 01. Cotizacion M&M
- Contenido: COTIZACIÓN de **M&M INDUSTRIA METÁLICA SAC** (RUC 20551531326), Cotización N° 2026-00116, fecha 15/06/2026, dirigida a Grapco / proyecto Creditex, Rev.1. Tabla Item | Descripción | Unidad | Cantidad | Precio | Parcial. Ítem 1 "Escalera metálica - Nuevo diseño" Parcial **S/ 4393.04** (+18 filas).
- Números clave: Escalera metálica nuevo diseño = **S/ 4,393.04**.
- Propósito: cotización de subcontratista metálico que sustenta el costo del AD-26.
- Origen -> Destino: proveedor M&M -> sustento del adicional N°26 -> APU/Resumen del AD.
- Automatización: cotización de proveedor -> Almacén/compras o sustento del adicional (adjunto). GAP parcial: no hay módulo de cotizaciones de proveedor estructurado; cargar como adjunto del adicional.

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°26_Cambio de Diseño en Escalera de Nave\SUSTENTO\2026.06.16 Respt. Hiagshi_RFI 033.pdf
- Tipo / formato: PDF [no-Excel]. 354 KB.
- Propósito: respuesta a RFI 033 (consulta técnica) que aprueba/sustenta el cambio de diseño de la escalera.
- Origen -> Destino: ingeniería (Hiagshi) -> sustento documental del AD-26.
- Automatización: adjunto documental del adicional (no genera datos numéricos). GAP: gestor de documentos/RFI no existe como módulo.

### \05. Gestión Costos\8. Adicionales y Deductivos\1. Proceso\AD-N°26_Cambio de Diseño en Escalera de Nave\SUSTENTO\Creditex_Sustento escalera metalica_Rev.01.xlsx
- Tipo / formato: xlsx — hoja de cálculo de peso/metrado de acero. 1 hoja. 61 KB.
- Hojas: Hoja1
- Contenido: despiece de escalera metálica con Item | Descripción | Unidad | ml | Kg/ml | Cantidad | Parcial | (factor 0.09) | Metrado. Dos diseños comparados:
  - Ítem 8 "ESCALERA METALICA - APROBADO 18/03/26" total **1094.93 kg**; componentes: plancha base 300x450x10 (46.05), plancha e=12mm (60.12), anclaje Ø1/2" (20.51), VE viga 100x250x4.50 (602.39), pasos plancha estriada (365.86).
  - Ítem 9 "ESCALERA METALICA - NUEVO MODELO" total **1443.58 kg** (+9 filas).
- Números clave: escalera aprobada 1094.93 kg vs nuevo modelo 1443.58 kg (delta = +348.65 kg de acero, base del adicional).
- Propósito: cálculo de peso de acero antes/después que justifica el mayor metrado del AD-26.
- Origen -> Destino: planos/diseño -> peso de acero -> APU/Resumen del adicional.
- Automatización: fuente de metrado de acero (kg) para el adicional; el delta kg alimenta el cobro y el RO (insumo acero). Cargar como metrado de sustento.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°00_Rechazados\AD-N°05_Vigilancia Diurno\Propuesta Económica_11_2025.pdf
- Tipo / formato: PDF [no-Excel]. 327 KB.
- Propósito: propuesta económica (nov-2025) de servicio de vigilancia diurna; adicional RECHAZADO.
- Origen -> Destino: proveedor de vigilancia -> sustento del AD-05 (no aprobado).
- Automatización: adjunto; adicional rechazado -> no alimenta RO. Registrar estado "Rechazado" en módulo Adicionales.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°00_Rechazados\AD-N°05_Vigilancia Diurno\GP-GCE-FOR-F05-AD N°05 Rev.00.xlsx
- Tipo / formato: xlsx — Adicional N°05 Rev.00 (RECHAZADO), GP-GCE-FOR-F05. 435 KB.
- Hojas: Carátula | Resumen | Cotización
- Contenido: Carátula obra "PTARI CREDITEX", denominación "VIGILANCIA DIURNA", N°05 Rev.01, fecha 18/11/2025. Resumen sección "1.- PRECIO UNITARIO" con ITEM/DESCRIPCIÓN/UND/CANTIDAD/P.U./PARCIAL/TOTAL, PLAZO 7 DÍAS (+12 filas). **Hoja Cotización vacía.**
- Números clave: ninguno legible (montos en celdas no volcadas).
- Propósito: adicional de vigilancia diurna (servicio); rechazado por el cliente.
- Origen -> Destino: GRAPCO -> CREDITEX (rechazado).
- Automatización: módulo Adicionales con estado "Rechazado" (no impacta RO).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°01_Cerco Interior Campamento\GP-GCE-FOR-F05-AD N°01 Rev.00.xlsx
- Tipo / formato: xlsx — Adicional N°01 Rev.00, GP-GCE-FOR-F05. 360 KB.
- Hojas: Carátula | Resumen | 1. MAT | 2. MO | 3. MO_APU
- Contenido: denominación "CERCO PERIMÉTRICO INTERIOR" (PTARI CREDITEX), fecha 02/11/2025, PLAZO 7 DÍAS. Resumen "1.- PRECIO UNITARIO" (+28 filas). 1. MAT (materiales del cerco: triplay + malla rashel, +8 filas). 2. MO (mano de obra, +9 filas). 3. MO_APU: "HABILITACION DE PANELES (MO)" UND MODULO P.U. 33.99 (+33 filas; aparece valor 8.89).
- Números clave: habilitación de paneles MO = S/ 33.99/módulo.
- Propósito: costo del cerco perimétrico interior del campamento (materiales + MO).
- Origen -> Destino: metrados de campo -> APU -> presupuesto adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; MAT puede ligarse a Almacén y MO a ISP.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°02_Inst. de Puerta Metalica y Acceso\GP-GCE-FOR-F05-AD N°02 _ REPOSICION DE LOSARev.01.xlsx
- Tipo / formato: xlsx — Adicional N°02 Rev.01 (variante "REPOSICION DE LOSA"), GP-GCE-FOR-F05. 5250 KB.
- Hojas: Carátula | Resumen | 2. Metrados | 3. Registro Fotográfico | 4. APU
- Contenido: Carátula "REPOSICION DE LOSA" (PTAR PLANTA 5), N°02 Rev.01, 20/11/2025. Resumen PRESUPUESTO (+45 filas). 2. Metrados con N° DE VECES + DIMENSIONES Ancho/Largo/Alto (+42 filas). 4. APU: "CORTE DE LOSA EXISTENTE" UND M2 P.U. 119.53 marcado "Nuevo APU" (+221 filas).
- Números clave: corte de losa existente = S/ 119.53/m2.
- Propósito: sustento del adicional de reposición de losa (variante del expediente puerta metálica/acceso).
- Origen -> Destino: metrados/APU -> presupuesto adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; APU "Nuevo APU" marca partidas nuevas no presupuestadas (útil para clasificar en RO como adicional puro).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°02_Inst. de Puerta Metalica y Acceso\GP-GCE-FOR-F05-AD N°02 Rev.00.xlsx
- Tipo / formato: xlsx — Adicional N°02 Rev.00, GP-GCE-FOR-F05. 5250 KB.
- Hojas: Carátula | Resumen | 2. Metrados | 3. Registro Fotográfico | 4. APU
- Contenido: denominación "INST. DE PUERTA METALICA Y ACCESO" (PTAR PLANTA 5), N°02 Rev.01, 20/11/2025. Resumen (+44 filas). 2. Metrados N° DE VECES + DIMENSIONES (+42 filas). 4. APU: "CORTE DE LOSA EXISTENTE" M2 119.53 "Nuevo APU" (+221 filas).
- Números clave: corte de losa = S/ 119.53/m2.
- Propósito: adicional instalación de puerta metálica y acceso (versión base; comparte APU con la variante reposición de losa).
- Origen -> Destino: metrados/APU -> presupuesto adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales; revisar contra la variante para evitar doble carga.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°03_Cerco Interno en T. Existentes\GP-GCE-FOR-F05-AD N°03 Rev.00.xlsx
- Tipo / formato: xlsx — Adicional N°03 Rev.00, GP-GCE-FOR-F05. 314 KB.
- Hojas: Carátula | Resumen | 1. MAT | 2. MO | 3. MO_APU
- Contenido: denominación "CERCO PERIMÉTRICO INTERIOR EN ZONA DE (tanques existentes)" (PTAR PLANTA 5), N°03 Rev.01, 02/11/2025, PLAZO 7 DÍAS. Resumen (+25 filas). 1. MAT (paneles triplay 3.60m, +5 filas). 2. MO (cerco 32.26 ML, +5 filas). 3. MO_APU: "HABILITACION DE PANELES (MO)" UND ML P.U. 33.99 (+20 filas).
- Números clave: habilitación paneles MO = S/ 33.99/ML; longitud cerco 32.26 ML.
- Propósito: costo cerco perimétrico interior en zona de tanques existentes.
- Origen -> Destino: metrados de campo -> APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; MO -> ISP.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°06_Falsa Zapata\GP-GCE-FOR-F05-AD N°06 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°06 Rev.01, GP-GCE-FOR-F05. 2253 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido: "FALSA ZAPATA" (PTAR PLANTA 5), N°06 Rev.01, 27/12/2025, PLAZO 7 DÍAS, supervisión DISEÑOS RACIONALES. Resumen (+17 filas). 1. Metrados N° DE VECES + DIMENSIONES Altura/Ancho/Largo (+7 filas). 2. APU: "EXCAVACION LOCALIZADA MANUAL" UND M3 P.U. 64.02 (+63 filas).
- Números clave: excavación localizada manual = S/ 64.02/m3.
- Propósito: costo de falsa zapata (sobrecimentación por sobreexcavación / nivel de fundación).
- Origen -> Destino: metrados/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°07_Falso Muro\GP-GCE-FOR-F05-AD N°07 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°07 Rev.01, GP-GCE-FOR-F05. 3025 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido: "FALSO MURO" (PTAR PLANTA 5), N°07 Rev.01, 29/12/2025, PLAZO 7 DÍAS. Resumen (+16 filas). 1. Metrados CONCRETO/ACERO/TOTAL (factor 13.59, +14 filas). 2. APU: "ALQUILER DE ANDAMIOS PARA TRABAJOS LOC(alizados)" UND DIA P.U. 82.72 marcado "Nuevo APU" (+87 filas).
- Números clave: alquiler andamios = S/ 82.72/día.
- Propósito: costo de falso muro de concreto.
- Origen -> Destino: metrados/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°08_Sellado de Filtraciones\1. Cotización\SURE-882 filtracion sellos Creditex GRAPCO.pdf
- Tipo / formato: PDF [no-Excel]. 312 KB.
- Propósito: cotización SURE-882 (proveedor SURE) para servicio de sellado de filtraciones.
- Origen -> Destino: proveedor -> sustento del AD-08.
- Automatización: adjunto/cotización proveedor del adicional.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°08_Sellado de Filtraciones\2. Fichas Tecnica\204_lamposilex_es (2).pdf
- Tipo / formato: PDF [no-Excel] — ficha técnica producto Lamposilex. 269 KB.
- Propósito: ficha técnica de impermeabilizante (sustento técnico del sellado).
- Automatización: adjunto documental (sin datos de costo).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°08_Sellado de Filtraciones\2. Fichas Tecnica\HT Poliuretano Expandible MG Classic (1).pdf
- Tipo / formato: PDF [no-Excel] — hoja técnica poliuretano expandible. 149 KB.
- Propósito: ficha técnica de insumo de sellado (sustento técnico).
- Automatización: adjunto documental.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°08_Sellado de Filtraciones\3. PETS\Procedimiento de sellado x filtración.pdf
- Tipo / formato: PDF [no-Excel] — PETS (procedimiento de trabajo). 1661 KB.
- Propósito: procedimiento de ejecución del sellado por filtración (sustento de método).
- Automatización: adjunto documental (SSOMA/Calidad, fuera de GRAPCO costos).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°08_Sellado de Filtraciones\GP-GCE-FOR-F05-AD N°08 Rev.03.xlsx
- Tipo / formato: xlsx — Adicional N°08 Rev.03, GP-GCE-FOR-F05. 2191 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico | 4. Cotización
- Contenido: "SELLADO IMPERMEABILIZANTE DE TANQUE EX(istente)" (PTAR PLANTA 5), N°08 Rev.01, 30/12/2025, PLAZO 7 DÍAS. Resumen (+16 filas). Metrados N° DE VECES + DIMENSIONES (+4 filas). APU: "LIMPIEZA DE SUPERFICIE" UND M2 P.U. 33.39 (+32 filas). **4. Cotización: "PU Total 9900"**.
- Números clave: **PU Total cotización = S/ 9,900**; limpieza de superficie = S/ 33.39/m2.
- Propósito: costo del sellado impermeabilizante de tanque existente.
- Origen -> Destino: cotización SURE + metrados/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; el valor 9900 (cotización) es total cobrable.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°09_Cordón bentónico y acabados\1. Superado\GP-GCE-FOR-F05-AD N°09 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°09 Rev.01 (SUPERADO). 16311 KB (muy pesado, fotos embebidas).
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico | 4. Cotización
- Contenido: "COLOCACIÓN DE CORDÓN BENTONÍTICO Y ACA(bados)" (PTAR PLANTA 5), N°09 Rev.01, 16/02/2026, PLAZO 7 DÍAS. Resumen (+14 filas). Metrados (+57 filas). APU: "COLOCACION DE JUNTA HIDRO EXPANSIVA 13(x..)" UND ML P.U. 73.49 (+58 filas). Cotización (cabecera).
- Números clave: junta hidroexpansiva = S/ 73.49/ML (en esta Rev.01 superada).
- Propósito: versión anterior del adicional cordón bentónico (superada por Rev.03).
- Origen -> Destino: reemplazada por Rev.03.
- Automatización: NO cargar como vigente (carpeta Superado); histórico de versión.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°09_Cordón bentónico y acabados\GP-GCE-FOR-F05-AD N°09 Rev.03.xlsx
- Tipo / formato: xlsx — Adicional N°09 Rev.03 (VIGENTE). 16314 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico | 4. Cotización
- Contenido: misma denominación "CORDÓN BENTONÍTICO Y ACABADOS", N°09 Rev.01 (en hoja), 16/02/2026. Resumen (+12 filas). Metrados (+57 filas). APU: "COLOCACION DE JUNTA HIDRO EXPANSIVA 13" UND ML P.U. **16.33 marcado "Contratual"** (+85 filas; nótese cambio de precio vs Rev.01 que era 73.49 "nuevo APU").
- Números clave: junta hidroexpansiva PU contractual = S/ 16.33/ML.
- Propósito: versión vigente del adicional cordón bentónico + acabados; distingue partidas contractuales vs nuevas.
- Origen -> Destino: metrados/APU + cotización -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos (cargar Rev.03 como vigente); el marcado "Contratual"/"Nuevo APU" ayuda a clasificar mayor metrado vs adicional puro en RO.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°10_Instalación Linea DN250 HDPE\GP-GCE-FOR-F05-AD N°10 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°10 Rev.01, GP-GCE-FOR-F05. 2299 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico | 4. Cotización
- Contenido: "INSTALACION DE LINEA DN250 HDPE EN DEC(antador)" (PTAR PLANTA 5), N°10 Rev.01, 16/02/2026, PLAZO 7 DÍAS. Resumen (+11 filas). Metrados (+2 filas). APU: "INSTALACION DE TUBERIA DN250 HDPE EN D(ecantador)" UND UND P.U. 576.55 (+24 filas). Cotización (cabecera).
- Números clave: instalación tubería DN250 HDPE = S/ 576.55/und.
- Propósito: costo de instalación de línea HDPE DN250 en decantador.
- Origen -> Destino: cotización proveedor + APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°11_Prueba de Estanqueidad Seca\Cotización - OI-2025-COT-03730.pdf
- Tipo / formato: PDF [no-Excel]. 111 KB.
- Propósito: cotización OI-2025-COT-03730 (proveedor) para prueba de estanqueidad lanza seca.
- Origen -> Destino: proveedor -> sustento del AD-11.
- Automatización: adjunto/cotización proveedor del adicional.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°11_Prueba de Estanqueidad Seca\GP-GCE-FOR-F05-AD N°11 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°11 Rev.01, GP-GCE-FOR-F05. 496 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico | 4. Cotización
- Contenido: "PRUEBA DE ESTANQUEIDAD (LANZA SECA)" (PTAR PLANTA 5), N°11 Rev.01, 02/03/2026, PLAZO 7 DÍAS. Resumen (+13 filas). Metrados (+2 filas). APU: "PRUEBA ESTANQUEIDAD (LANZA SECA)" UND DIA P.U. **4267.36** (+45 filas). Cotización (cabecera).
- Números clave: prueba de estanqueidad = S/ 4,267.36/día.
- Propósito: costo de prueba de estanqueidad (servicio especializado, alto PU diario).
- Origen -> Destino: cotización OI-2025-COT-03730 + APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos (servicio subcontratado).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°12_Edificio de Recuperación\GP-GCE-FOR-F05-AD N°12 Rev.00.xlsx
- Tipo / formato: xlsx — Adicional N°12 Rev.00, plantilla presupuesto completo GP-GCE-FOR-F01 + PRO-GCE-FOR-F03. 2375 KB. **El más complejo del chunk (15 hojas).**
- Hojas: Carátula | Resumen | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 9. Pull | 10. Esquema | 11. Sectorizacion | 12. RO
- Contenido:
  - Carátula/Resumen: "EDIFICIO DE RECUPERACIÓN (S/ EST. MET.)" = Frente F2/NAVE, fecha 04/03/2026, PLAZO F2 2.80 MESES, TRASLAPE C/ F1 1 MES. Resumen del presupuesto (+38 filas).
  - 1. PRE/2. PRO/3. MOV/4. EST/5. ARQ/6. IISS: presupuesto por especialidad (ITEM/DESCRIPCIÓN/UND/CANT/P.U./PARCIAL/SUBTOTAL/TOTAL); EST con +76 filas (la más grande).
  - 7. APU: análisis de precios unitarios (+727 filas).
  - Hoja 8: flujo de egresos por semana (Sem1..Sem24) por partida (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...).
  - 8. Recursos: lista de recursos MO/MAT/EQ con UND/SOL/USD/ESTATUS (REALIZADO/PROCESO/PENDIENTE), T.C.=3.80 (+381 filas).
  - 9. Pull: Pull Planning / Lookahead diario, jornada 8 HH/día, inicio 03/03/2026, fin 26/05/2026, 84 días; columnas ID/UND/METRADO/SECTORES/SECTOR/IP/HH/MO/Cuadrilla + calendario (+77 filas). Frentes N1 NAVE DE RECUPERACION, N2 ESTRUCTURAS.
  - 10. Esquema / 11. Sectorización: layout de obra (cimentación, excavación, sectores S1/S3/C1/C2, acopio químicos, lavandería).
  - **12. RO**: presupuesto del frente F2/NAVE — **TOTAL COSTO DE OBRA S/ 330,896.64; COSTO DIRECTO S/ 261,642.90**; partida 1001 TRABAJOS PRELIMINARES S/ 19,050.38 (PRE1 SSO 5147.98, PRE2 TOPOGRAFÍA 8026.98) (+61 filas).
- Números clave (Rev.00): **Total costo obra S/ 330,896.64**; **Costo directo S/ 261,642.90**; Trabajos preliminares S/ 19,050.38; T.C. 3.80; plazo 2.80 meses; 84 días; jornada 8 HH/día.
- Propósito: presupuesto y planificación completa del adicional mayor "Edificio de Recuperación / Nave" (F2), con BAC + recursos + pull + RO.
- Origen -> Destino: ingeniería + metrados NAVE -> presupuesto/APU/recursos/pull -> RO interno -> oferta al cliente.
- Automatización: este expediente cruza varios módulos: Resumen+1-6 -> Presupuesto (BAC); 7.APU -> APU/RO; 9.Pull -> Cronograma/Pull Planning (LPS, IP/HH); 12.RO -> Resultado Operativo. Importador genérico in-app para cada hoja; clave para alimentar BAC del frente NAVE.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°12_Edificio de Recuperación\GP-GCE-FOR-F05-AD N°12 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°12 Rev.01 (versión actualizada). 2375 KB. Misma estructura de 15 hojas.
- Hojas: Carátula | Resumen | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 9. Pull | 10. Esquema | 11. Sectorizacion | 12. RO
- Contenido: idéntico esquema a Rev.00; cambian montos. **12. RO: TOTAL COSTO DE OBRA S/ 235,236.10; COSTO DIRECTO S/ 186,003.26**; Trabajos preliminares S/ 19,050.38 (mismos PRE1/PRE2). APU +727 filas; Recursos +381 filas; Pull mismas fechas (03/03–26/05/2026, 84 días).
- Números clave (Rev.01): **Total costo obra S/ 235,236.10**; **Costo directo S/ 186,003.26** (reducción ~S/ 95,660 vs Rev.00, probable ajuste de alcance/negociación).
- Propósito: versión revisada del presupuesto del Edificio de Recuperación (NAVE) — la vigente entre las dos.
- Origen -> Destino: igual a Rev.00 (BAC/APU/Pull/RO).
- Automatización: cargar Rev.01 como vigente; misma ruta multi-módulo. Comparar Rev.00 vs Rev.01 para trazabilidad del ajuste.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°12_Edificio de Recuperación\Met.Est_NAVE CREDITEX Rev.01_2026-01-08.xlsx
- Tipo / formato: xlsx — Metrado estructural detallado de la NAVE. 4297 KB. **33 hojas (planilla de metrados de acero/concreto/encofrado).**
- Hojas: Ratios | Resumen | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | Met_ARQ | Met_MOV | Met_DEM | Met_CALZ | Met_FZ | Met_ZAP | Met_PED | Met_CANAL | Met_LCIM | Met_Losa Maciza | Met_COL | Met_VIG | LosaAligerada | Met_IISS | REV. ACERO | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- Contenido:
  - Ratios: kg/m3 de acero por elemento (Zapatas 40-70, Columnas 100-350, Vigas 100-250, Aligerados 80-175, Losas macizas 50-200).
  - Resumen: "PRESUPUESTO OFERTA - COSTO", comparación Metrado Oferta vs Metrado Nuevo por partida cliente (+53 filas).
  - 1.PRE/2.PRO/3.MOV: ojo — cabeceras citan "PRECOTEX LAS MORERAS"/cliente PRECOTEX (plantilla reusada de otro proyecto) aunque el archivo es de NAVE CREDITEX; metrados por partida con UND/CANT.
  - 4.EST/5.ARQ/6.IISS: ya con "PLANTA PTAR 5 - CREDITEX", fecha 16/03/2026 (EST +67 filas).
  - Hojas Met_* y de elementos: planillas de cómputo de cantidades por elemento (excavación, relleno, solado, concreto f'c, encofrado, acero con traslapes y pesos por Ø). Ej. Met_CANAL/Met_LCIM: losa de cimentación con juntas, acero 16893.25 kg (m2 380.62, 44.38 kg/m2). REV.ACERO: columnas 1318.38 kg, zapata 470.16 kg, etc.
- Números clave: ratios kg/m3; acero losa cimentación 16,893.25 kg (44.38 kg/m2); REV.ACERO columnas 1,318.38 kg, zapata 470.16 kg.
- Propósito: metrado base (concreto/acero/encofrado) que alimenta el presupuesto del AD-12 NAVE; sustenta cantidades del BAC.
- Origen -> Destino: planos NAVE -> cómputo metrados -> partidas/cantidades del AD-12 (Resumen 1-6) -> APU/RO.
- Automatización: fuente de metrado para Presupuesto (BAC) del frente NAVE; hoja Resumen "Oferta vs Nuevo" sirve para detectar mayores metrados (adicional/deductivo). Importar como metrados; cuidar el residuo de plantilla PRECOTEX (no es data del proyecto, es encabezado heredado).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°13_CODO HDPE REBOSE EN DECANTADOR\1. Cotización\SURE-929 cierre de pase de tubería Creditex.pdf
- Tipo / formato: PDF [no-Excel]. 263 KB.
- Propósito: cotización SURE-929 (cierre de pase de tubería) — sustento del AD-13.
- Automatización: adjunto/cotización proveedor.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°13_CODO HDPE REBOSE EN DECANTADOR\1. Cotización\Valorizacion_Servicio_Ejecutado (1).pdf
- Tipo / formato: PDF [no-Excel]. 96 KB.
- Propósito: valorización de servicio ejecutado (proveedor) ligada al AD-13.
- Origen -> Destino: proveedor (subcontrato) -> sustento de pago/valorización del adicional.
- Automatización: GAP — Valorización de Subcontratistas (F10/F11) no existe como módulo; cargar como adjunto. Candidato a futuro módulo de subcontratos.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°13_CODO HDPE REBOSE EN DECANTADOR\GP-GCE-FOR-F05-AD N°13 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°13 Rev.01, GP-GCE-FOR-F05. 4943 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico | 4. Cotización
- Contenido: "SUMINISTRO E INSTALACIÓN DE CODO HDPE (rebose en decantador)" (PTAR PLANTA 5), N°13 Rev.01, 16/02/2026, PLAZO 7 DÍAS. Resumen (+13 filas). Metrados (+3 filas). APU: "INSTALACION DE TUBERIA DN250 HDPE EN D" UND UND P.U. **6884.33** (+30 filas). Cotización (cabecera).
- Números clave: instalación codo/tubería HDPE = S/ 6,884.33/und.
- Propósito: costo del suministro e instalación de codo HDPE de rebose en decantador.
- Origen -> Destino: cotización SURE-929 + APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°14_Suministro e instalacion de Tuberia PVC para rebose\1. Cotizacion\COTIZACION-CT01-000347 (1).pdf
- Tipo / formato: PDF [no-Excel]. 53 KB.
- Propósito: cotización CT01-000347 (proveedor) de tubería PVC para rebose — sustento del AD-14.
- Automatización: adjunto/cotización proveedor.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°14_Suministro e instalacion de Tuberia PVC para rebose\GP-GCE-FOR-F05-AD N°14 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°14 Rev.01, GP-GCE-FOR-F01. 1508 KB.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotización
- Contenido: "SUMINISTRO E INSTALACIÓN DE TUBERIA PV(C para rebose)" (PTAR PLANTA 5), N°14, 21/03/2026, PLAZO 7 DÍAS. Resumen (+19 filas). 1. Metrado con DIMENSIONES + Vol. (+11 filas). 2. APU (+58 filas). Hoja 8 flujo semanal de egresos. 3. Esquema. 4. Cotización (cabecera).
- Números clave: ninguno legible en el volcado (montos en celdas no volcadas).
- Propósito: costo del suministro e instalación de tubería PVC para rebose.
- Origen -> Destino: cotización CT01-000347 + metrado/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; Hoja 8 (egresos semanales) -> insumo Flujo de Caja (GAP: módulo Flujo de Caja no existe).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°15_Pernos de anclaje para pedestales - NAVE\1. Superado\GP-GCE-FOR-F05-AD N°15 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°15 Rev.01 (SUPERADO). 749 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido: "PEDESTALES INC. ANCLAJES EN NAVE" (PTAR PLANTA 5), N°15 Rev.01, 21/03/2026, PLAZO 7 DÍAS. Resumen (+18 filas). Metrados (+8 filas). APU: "ENCOFRADO Y DESENCOFRADO DE PEDESTALES" UND M2 P.U. 69.72 (+69 filas).
- Números clave: encofrado pedestales = S/ 69.72/m2.
- Propósito: versión superada del adicional pedestales/anclajes (incluye anclajes).
- Origen -> Destino: reemplazada por Rev.02.
- Automatización: NO cargar como vigente (carpeta Superado); histórico.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°15_Pernos de anclaje para pedestales - NAVE\GP-GCE-FOR-F05-AD N°15 Rev.02.xlsx
- Tipo / formato: xlsx — Adicional N°15 Rev.02 (VIGENTE). 771 KB.
- Hojas: Carátula | Resumen | 1. Metrados | 2. APU | 3. Registro Fotográfico
- Contenido: denominación cambia a "PEDESTALES **S/ ANCLAJES** EN NAVE" (sin anclajes) (PTAR PLANTA 5), N°15 Rev.01 (en hoja), 21/03/2026. Resumen (+18 filas). Metrados (+8 filas). APU: "ENCOFRADO Y DESENCOFRADO DE PEDESTALES" UND M2 P.U. 69.72 (+68 filas).
- Números clave: encofrado pedestales = S/ 69.72/m2.
- Propósito: versión vigente; cambia el alcance (pedestales SIN anclajes), por lo que el delta vs Rev.01 (con anclajes) es relevante.
- Origen -> Destino: metrados/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos (Rev.02 vigente).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°16_Rampa y vereda Nueva\GP-GCE-FOR-F05-AD N°16 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°16 Rev.01, GP-GCE-FOR-F01/F03. 1719 KB.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: "RAMPAS Y VEREDAS" (PTAR PLANTA 5), N°16, 21/03/2026. Resumen (+25 filas). 1. Metrado con DIMENSIONES + AREA (+17 filas; varios #REF! en cabecera). 2. APU (+90 filas, #REF! en cabecera). Hoja 8 egresos semanales. 3. Esquema (PLAZO #REF!). 4. Cotización (+? filas).
- Números clave: ninguno legible; varias celdas #REF! (fórmulas rotas en cabeceras de fecha/plazo).
- Propósito: costo del adicional de rampas y veredas nuevas.
- Origen -> Destino: metrado/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; revisar #REF! antes de importar (datos de plazo/fecha corruptos).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°17_Relleno de sobre excavación\1. Superado\GP-GCE-FOR-F05-AD N°17 Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°17 Rev.01 (SUPERADO). 2986 KB.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: "RELLENO LOCALIZADO EN SOBRE EXCAVACION" (PTAR PLANTA 5), N°17, 21/03/2026. Resumen (+18 filas). 1. Metrado con Volumen/PARCIAL/TOTAL; ítem 21 "REPARACION DE LOSA" (+15 filas; #REF! cabecera). 2. APU (+11 filas, #REF!). Hoja 8 egresos. Esquema (PLAZO #REF!). Cotización.
- Números clave: ninguno legible; #REF! en cabeceras.
- Propósito: versión superada del adicional relleno de sobreexcavación.
- Origen -> Destino: reemplazada por Rev.02.
- Automatización: NO cargar como vigente (Superado); histórico.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°17_Relleno de sobre excavación\GP-GCE-FOR-F05-AD N°17 Rev.02.xlsx
- Tipo / formato: xlsx — Adicional N°17 Rev.02 (VIGENTE), GP-GCE-FOR-F01/F03. 2400 KB. **Incluye hoja Cronograma.**
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion | 5. Cronograma
- Contenido: denominación cambia a "RELLENO Y COMPACTACION CON MATERIAL DE (préstamo)" (PTAR PLANTA 5), N°17, 21/03/2026. Resumen (+19 filas). 1. Metrado ítem 21 PTAR M3 (+8 filas, #REF!). 2. APU (+22 filas, #REF!). Hoja 8 egresos. Esquema. Cotización. **5. Cronograma**: calendario diario por días (Sem 23-26, abr-2026; +20 filas).
- Números clave: ninguno legible; #REF! en cabeceras.
- Propósito: versión vigente; cambia alcance a relleno+compactación con material de préstamo; agrega cronograma.
- Origen -> Destino: metrado/APU/cronograma -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos; hoja Cronograma -> Cronograma Pro / Curva S; sanear #REF! antes de importar.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°18_Reposición Tubería PVC 8_\1. Superado\GP-GCE-FOR-F05-AD N°18_Reposición Tubería PVC 8_Rev.01.xlsx
- Tipo / formato: xlsx — Adicional N°18 Rev.01 (SUPERADO), GP-GCE-FOR-F01/F03. 1588 KB.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: 'REPOSICION DE TUBERIA PVC 8"' (PTAR PLANTA 5), N°18, 31/03/2026. Resumen (+25 filas). 1. Metrado DIMENSIONES + Vol. (+11 filas). 2. APU (+62 filas, #REF!). Hoja 8 egresos. Esquema. Cotización.
- Números clave: ninguno legible; #REF! en APU.
- Propósito: versión superada del adicional reposición de tubería PVC 8".
- Origen -> Destino: reemplazada por Rev.02.
- Automatización: NO cargar como vigente (Superado); histórico.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°18_Reposición Tubería PVC 8_\GP-GCE-FOR-F05-AD N°18_Reposición Tubería PVC 8_Rev.02.xlsx
- Tipo / formato: xlsx — Adicional N°18 Rev.02 (VIGENTE), GP-GCE-FOR-F01/F03. 1599 KB.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: misma denominación 'REPOSICION DE TUBERIA PVC 8"', N°18, 31/03/2026. Resumen (+25 filas). Metrado (+12 filas). APU (+63 filas, #REF!). Hoja 8 egresos. Esquema. Cotización.
- Números clave: ninguno legible; #REF! en APU.
- Propósito: versión vigente del adicional reposición de tubería PVC 8".
- Origen -> Destino: metrado/APU -> adicional -> CREDITEX/RO.
- Automatización: módulo Adicionales/Deductivos (Rev.02 vigente); sanear #REF!.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°19_Losa en Nave de Recuperación\1. Cotizacion\1. Superado\Cotizacion_HDPE_GRAPCO_Detallada (1).pdf
- Tipo / formato: PDF [no-Excel] (carpeta Superado). 130 KB.
- Propósito: cotización detallada HDPE (superada) para losa en nave de recuperación — sustento del AD-19.
- Automatización: adjunto/cotización proveedor (versión superada).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°19_Losa en Nave de Recuperación\1. Cotizacion\cotizacion hdpe.pdf
- Tipo / formato: PDF [no-Excel]. 130 KB.
- Propósito: cotización HDPE (vigente) para losa en nave de recuperación — sustento del AD-19.
- Origen -> Destino: proveedor HDPE -> sustento del AD-19.
- Automatización: adjunto/cotización proveedor. (En este chunk no aparece el .xlsx del AD-19, solo sus cotizaciones.)

---

## Resumen del chunk

- **Categoría:** Adicionales y Deductivos (CREDITEX PTARI + NAVE).
- **ADs cubiertos en este chunk:** N°01, 02, 03, 05 (rechazado), 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 (solo cotiz.), 24, 25, 26. **No aparecen deductivos** en este chunk (todo son adicionales; "Deductivos" es solo el nombre de la carpeta).
- **Formatos detectados:** GP-GCE-FOR-F05 (plantilla del adicional), GP-GCE-FOR-F01 (resumen presupuesto/especialidades), PRO-GCE-FOR-F03 (resumen adicional/recursos), PRO-GCE-FOR-F05 (metrados/APU/registro fotográfico/cotización).
- **Gaps clave para automatización:** Valorización de Subcontratistas (F10/F11) y Flujo de Caja (Hoja 8 de egresos semanales) no tienen módulo; cotizaciones de proveedor y PDFs de sustento/RFI/PETS no tienen gestor estructurado (van como adjuntos); varios .xlsx tienen #REF! en cabeceras a sanear antes de importar.
- **Pieza más valiosa:** AD-N°12 (Edificio de Recuperación / NAVE) — expediente BAC completo con RO interno (Rev.00 S/330,896.64; Rev.01 S/235,236.10) y su metrado estructural (Met.Est_NAVE, 33 hojas).
