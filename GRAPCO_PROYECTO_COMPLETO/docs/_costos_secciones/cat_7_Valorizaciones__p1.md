# Categoria 7 — Valorizaciones (Cliente) · PTARI · chunk p1

Proyecto: PTAR PLANTA 5 - CREDITEX. Contratista GRAPCO SAC. Supervision DISEÑOS RACIONALES (DIRAC). Proyectista HIGASHI INGENIEROS SAC. Ubicacion: Calle Los Hornos 185, Urb. Vulcano, Ate. Residente: Ing. Guido Gonzales. Plazo contractual 130 D.C.

Este chunk cubre las VALORIZACIONES MENSUALES/QUINCENALES AL CLIENTE de la PTARI (VAL 01 a VAL 06 + LIQUIDACION) con sus SUSTENTOS DE METRADO por partida. Hay dos tipos de archivo:
- **F07 (valorizacion al cliente)**: el formato oficial GP-GCE-FOR-F07 con caratula, cronograma de pagos, resumen, hoja VAL (formato cliente PRESUPUESTO/ACUM. ANT./ACTUAL/ACUM./SALDO) y hoja RO (cruce interno frente/partida vs valorizacion). Estos son la FUENTE PRINCIPAL de dato.
- **Sustentos de metrado (PRO-GCE-FOR-F03)**: memorias de metrado por partida (excavacion, calzadura, demolicion, concreto, acero, encofrado, etc.) con hojas Metrado / Sustento de campo / Reporte de Guias / Sustento Fotografico. Respaldan la cantidad valorizada; no traen montos S/, traen cantidades fisicas (m3, m2, kg, und).

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\1. PTAR-VAL 01\1. Sustento Metrado\01. Excavacion\01. Sustento_Eliminacion de Excavacion_Val01.xlsx (10332 KB)
- **Tipo / formato:** xlsx — sustento de metrado, codigo PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida
- **Contenido:**
  - *1. Metrado*: cabecera (obra, cliente CREDITEX/PRECOTEX, fecha 13/12/2025). Partida 3 MOVIMIENTO DE TIERRAS, columnas ITEM / DESCRIPCION / UND / CANT.
  - *2. Sustento Elim.*: sustento de salida de volquetes; Factor de esponjamiento 0.30; TOTAL ELIMINADO A LA FECHA = 1398 m3; TOTAL EXCAVADO MASIVO = 1075.38 m3 (rango hasta S997, ~36 filas de detalle por volquete).
  - *3. Guias de Salida*: control de guias por semana (26-11-2025 al 29-11-2025; 01-12-2025 al 05-12-2025).
- **Numeros clave:** eliminado 1398 m3; excavado masivo 1075.38 m3; factor esponj. 0.30.
- **Proposito:** sustentar metrado de eliminacion/excavacion valorizado en VAL01.
- **Origen -> Destino:** guias de salida de volquetes + medicion campo -> alimenta cantidad de la partida mov. tierras en F07 VAL01.
- **Automatizacion:** GAP de sustento de metrado fisico. Las cantidades validadas se ingieren al modulo Valorizaciones (cliente) como cantidad de partida; las guias podrian ir al importador generico in-app. No alimenta RO directamente (costo MO via ISP).

### \...\1. PTAR-VAL 01\1. Sustento Metrado\01. Excavacion\SUPERADO\01. Sustento_Eliminacion de Excavacion.xlsx (11048 KB)
- **Tipo / formato:** xlsx — sustento de metrado PRO-GCE-FOR-F03 (version SUPERADA/obsoleta).
- **Hojas:** 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida (identicas a la vigente).
- **Numeros clave:** TOTAL ELIMINADO 1530 m3; TOTAL EXCAVADO MASIVO 1176.92 m3 (cifras mayores que la version vigente -> fue corregida a la baja).
- **Proposito:** version anterior del sustento de excavacion VAL01.
- **Origen -> Destino:** reemplazada por la version en carpeta padre.
- **Automatizacion:** NO ingerir (carpeta SUPERADO = obsoleto). Util solo como traza de revision.

### \...\1. PTAR-VAL 01\1. Sustento Metrado\02. Calzadura\01. Sustento_Calzaduras_Val01.xlsx (9927 KB)
- **Tipo / formato:** xlsx — sustento de metrado PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico
- **Contenido:**
  - *Metrado*: partida 4 ESTRUCTURAS (calzaduras), ITEM/DESCRIPCION/UND/CANT.
  - *Sustento*: tabla DATOS vs RESULTADOS por calzadura, con MOV. TIERRA, CONCRETO, ENCOFRADO (rango hasta S58, ~31 filas).
  - *Report. de Guias*: sustento de llegada de concreto + guias de eliminacion.
  - *Sust. Fotografico*: evidencia fotografica.
- **Numeros clave:** detalle por calzadura (no se ve total agregado en el volcado).
- **Proposito:** sustentar metrado de calzaduras (mov. tierra + concreto + encofrado) de VAL01.
- **Origen -> Destino:** medicion campo + guias concreto -> cantidad partida ESTRUCTURAS/calzaduras en F07 VAL01.
- **Automatizacion:** Valorizaciones (cliente) como cantidad; guias de concreto al importador generico (cruce con Almacen). GAP de sustento estructurado.

### \...\1. PTAR-VAL 01\1. Sustento Metrado\02. Calzadura\SUPERADO\01. Sustento_Calzaduras.xlsx (8982 KB)
- **Tipo / formato:** xlsx — sustento calzaduras PRO-GCE-FOR-F03 (SUPERADO/obsoleto).
- **Hojas:** 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico (mismo layout, menos filas: Sustento hasta S52 ~23 filas).
- **Proposito:** version anterior del sustento de calzaduras VAL01.
- **Automatizacion:** NO ingerir (SUPERADO).

### \...\1. PTAR-VAL 01\1. Sustento Metrado\03. Demolicion\01. Sustento_Demolicion_Val01.xlsx (10860 KB)
- **Tipo / formato:** xlsx — sustento de metrado PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico
- **Contenido:**
  - *Metrado*: partida 2 OBRAS PROVISIONALES (demolicion), ITEM/DESCRIPCION/UND/CANT.
  - *Sustento*: tabla DATOS/DEMOLICION/PARCIALES: TIPO DE ELEM., N° DE REGISTRO, Area (m2), FECHA, PLACA (volquete), EXCAV., ELIM. (rango hasta Q65, ~27 filas).
  - *Report. de Guias*: sustento de salida de volquetes.
  - *Sust. Fotografico*: evidencia.
- **Proposito:** sustentar metrado de demolicion (area m2 + eliminacion) VAL01.
- **Origen -> Destino:** registros de campo + guias volquetes -> cantidad partida demolicion F07 VAL01.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento estructurado.

### \...\1. PTAR-VAL 01\1. Sustento Metrado\03. Demolicion\SUPERADO\01. Sustento_Demolicion.xlsx (10860 KB)
- **Tipo / formato:** xlsx — sustento demolicion PRO-GCE-FOR-F03 (SUPERADO, layout identico).
- **Automatizacion:** NO ingerir (SUPERADO).

### \...\1. PTAR-VAL 01\2. Superado\GP-GCE-FOR-F07_VAL N°01 ACTUALIZADO 2025.12.13.xlsx (485 KB)
- **Tipo / formato:** xlsx — **VALORIZACION AL CLIENTE F07** (codigo GP-GCE-FOR-F07). Version SUPERADA (carpeta "2. Superado").
- **Hojas:** Carátula | 1. PAGOS | 2. RESUMEN | 3. VAL | 4. RO | Hoja1 | Hoja 8
- **Contenido:**
  - *Carátula*: VALORIZACION N°01, revision N°01, 13/12/2025.
  - *1. PAGOS*: cronograma de pagos (GP-GCE-FOR-F07 pag 1 de 5); periodo DICIEMBRE, del 01 al 13/12/2025.
  - *2. RESUMEN*: cuadro resumen de valorizaciones - PRE. MONTO CONTRATADO 2,747,424.05 (inc IGV); 2,328,325.47 (no IGV); COSTO DIRECTO 1,692,825.73.
  - *3. VAL*: hoja de valorizacion por ITEM/DESCRIPCION con columnas PRESUPUESTO (UND, CANT, P.U., PARCIAL), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL (cant/%/total). ~131 filas de partidas.
  - *4. RO*: cruce interno FRENTE/PARTIDA/Descripcion (Ppto F1 PTARI vs Valorizacion Quincenal vs Acumulada). TOTAL COSTO DE OBRA 2,175,971.15; COSTO DIRECTO 1,692,825.73; valorizacion actual 243,951.90 (costo obra) / 189,785.63 (CD). Partidas con codigo (FA01 1.01 SSO 51,152.49; 1.02 TOPOGRAFIA 41,113.36...).
  - *Hoja1*: tabla auxiliar de areas (LONGITUD/ALTO/AREA, total 286.80).
  - *Hoja 8*: cronograma EGRESOS por semana (Sem 1..24) por rubro (Trabajos Preliminares, Obras Provisionales, SC Mov tierras, SC Encofrado Cori...) — con #REF! (formula rota).
- **Numeros clave:** Contratado 2,747,424.05 c/IGV; CD 1,692,825.73; VAL01 actual 243,951.90 (TCO) / 189,785.63 (CD).
- **Proposito:** valorizacion N°01 al cliente, version inicial superada.
- **Origen -> Destino:** sustentos de metrado (excavacion/calzadura/demolicion) + presupuesto contractual -> esta F07; la hoja RO cruza con el Resultado Operativo interno.
- **Automatizacion:** NO ingerir (superada). El layout F07 es la fuente del modulo Valorizaciones (cliente) y la hoja RO mapea al modulo RO/CR (frente+partida).

### \...\1. PTAR-VAL 01\GP-GCE-FOR-F07_VAL N°01 2025.12.16.xlsx (487 KB)
- **Tipo / formato:** xlsx — **VALORIZACION AL CLIENTE F07 VAL N°01 VIGENTE** (GP-GCE-FOR-F07), 16/12/2025.
- **Hojas:** Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8
- **Contenido:**
  - *1. RESUMEN*: VALORIZACION N°01, mes DICIEMBRE 2025. PRESUPUESTO REFERENCIAL 2,866,414.72 inc/IGV; plazo 130 D.C.
  - *3. RES.VAL*: MONTO REFERENCIAL 2,866,414.72 (inc IGV) / 2,429,165.02 (no IGV); COSTO DIRECTO 1,785,339.08.
  - *4. VAL*: hoja valorizacion cliente (mismo layout PRESUPUESTO/ACUM ANT/ACTUAL/ACUM/SALDO), ~112 filas.
  - *5. RO*: TOTAL COSTO DE OBRA 2,234,192.66; COSTO DIRECTO 1,751,047.24; VAL01 actual 228,449.28 (TCO) / 179,046.99 (CD).
  - *Hoja1* areas (=286.80); *Hoja 8* cronograma egresos por semana (#REF!).
- **Numeros clave:** Referencial 2,866,414.72 c/IGV; CD 1,785,339.08; VAL01 actual 228,449.28 (TCO).
- **Proposito:** valorizacion N°01 oficial entregada al cliente (diciembre 2025).
- **Origen -> Destino:** sustentos VAL01 + ppto -> F07; RO cruza con Resultado Operativo.
- **Automatizacion:** Modulo Valorizaciones (cliente): cargar hoja VAL (cantidades, %, acumulados). Hoja RO -> modulo RO/CR (F06) cruce frente/partida. Hoja PAGOS -> GAP Flujo de Caja. Importador F07 dedicado (acumulados por valorizacion).

### \...\1. PTARI\10. PTAR-LIQUIDACION\1. Sustento de metrados\1. Arquitectura\Sustento_Arquitectura_Liquidacion.xlsx (1920 KB)
- **Tipo / formato:** xlsx — sustento de metrado de liquidacion PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento | 3. Met_Bit | 3. Met_Imp | 4. Sust. Fotografico
- **Contenido:** hoja Metrado (rango B2:W992, gran detalle de partidas de arquitectura); hojas Met_Bit y Met_Imp (metrados auxiliares); Sustento y Sustento Fotografico. (Volcado mostro solo cabecera del Metrado.)
- **Proposito:** sustentar metrado de ARQUITECTURA para la LIQUIDACION del contrato.
- **Origen -> Destino:** medicion final campo -> cantidades partidas arquitectura en F07 LIQUIDACION.
- **Automatizacion:** Valorizaciones (cliente) - cierre/liquidacion. GAP sustento.

### \...\1. PTARI\10. PTAR-LIQUIDACION\GP-GCE-FOR-F07_CREDITEX PTAR_LIQUIDACION.xlsx (1620 KB)
- **Tipo / formato:** xlsx — **LIQUIDACION FINAL F07** (GP-GCE-FOR-F07), 30/04/2026.
- **Hojas:** Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios
- **Contenido:**
  - *1. RESUMEN*: LIQUIDACION, mes ABRIL 2026 (periodo 16 al 30). PRESUPUESTO REFERENCIAL 2,917,811.21; plazo 130 D.C.
  - *3. RES.VAL*: MONTO REFERENCIAL 2,917,862.75 (inc IGV) / 2,472,765.04 (no IGV); COSTO DIRECTO 1,840,622.06 (~48 filas resumen acumulado por valorizacion).
  - *4. VAL*: hoja valorizacion final (~269 filas de partidas, layout cliente).
  - *5. / 6. APUs Nuevos*: ANALISIS DE NUEVOS PRECIOS UNITARIOS (GP-GCE-FOR-F01) — APUs de partidas nuevas surgidas en obra (adicionales).
  - *5. RO*: TOTAL COSTO DE OBRA 2,327,812.70 (= acumulado final); COSTO DIRECTO 1,840,622.06; valorizacion del periodo 90,617.08 (TCO) / 71,651.73 (CD).
  - *6. Servicios*: ADICIONAL DE ARQUITECTURA, TRAMITE MUNICIPAL.
- **Numeros clave:** Referencial liquidacion 2,917,862.75 c/IGV; CD 1,840,622.06; **acumulado final de obra 2,327,812.70** (TCO) / 1,840,622.06 (CD).
- **Proposito:** liquidacion/cierre del contrato PTARI — cuadro final acumulado de todo lo valorizado + APUs nuevos + servicios adicionales.
- **Origen -> Destino:** suma de VAL01..06 + adicionales -> liquidacion; cruce final con RO.
- **Automatizacion:** Valorizaciones (cliente) cierre; APUs Nuevos -> modulo Adicionales/Deductivos (con APU F01); RO -> RO/CR; Servicios/adicionales -> Adicionales. Importador F07 (modo liquidacion = acumulado total).

### \...\1. PTARI\2. PTAR-VAL 02\1. Sustento Metrados\01. Excavacion\01. Sustento_Eliminacion de Excavacion_Val02.xlsx (10750 KB)
- **Tipo / formato:** xlsx — sustento de metrado PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida | 4. Sustento Metrados | 5. Sustento Fotografico
- **Contenido:** metrado eliminacion/excavacion VAL02 (guias de salida de volquetes + factor esponjamiento + sustento fotografico). Detalle por volquete y semana.
- **Proposito:** sustentar metrado de excavacion/eliminacion de VAL02.
- **Origen -> Destino:** guias volquetes -> cantidad partida mov. tierras F07 VAL02.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

### \...\1. PTARI\2. PTAR-VAL 02\1. Sustento Metrados\02. Concreto\01. Sustento_Concreto_Val02.xlsx (7115 KB)
- **Tipo / formato:** xlsx — sustento de metrado de concreto PRO-GCE-FOR-F03.
- **Contenido:** metrado de concreto VAL02 (m3 por elemento) con guias de concreto y sustento fotografico.
- **Proposito:** sustentar concreto valorizado en VAL02.
- **Origen -> Destino:** guias de concreto (proveedor) -> cantidad partida concreto F07 VAL02; las guias cruzan con Almacen/insumos.
- **Automatizacion:** Valorizaciones (cliente); guias de concreto al importador generico (cruce Almacen/RO insumos). GAP.

### \...\1. PTARI\2. PTAR-VAL 02\GP-GCE-FOR-F07_VAL N°02 2025.12.30.xlsx (505 KB)
- **Tipo / formato:** xlsx — **VALORIZACION AL CLIENTE F07 VAL N°02** (GP-GCE-FOR-F07), 30/12/2025, periodo DICIEMBRE.
- **Hojas:** Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8 (layout estandar).
- **Contenido / Numeros clave:** MONTO REFERENCIAL 2,866,414.72 inc/IGV; 2,429,165.02 no IGV; COSTO DIRECTO 1,785,339.08. Hoja RO: TOTAL COSTO DE OBRA 2,234,192.66; CD 1,751,047.24; **VAL02 actual 90,573.50 (TCO) / 70,986.93 (CD); ACUMULADO 319,022.78 (TCO) / 250,033.92 (CD)**.
- **Proposito:** valorizacion N°02 al cliente.
- **Origen -> Destino:** sustentos VAL02 (excavacion+concreto) -> F07; RO acumula sobre VAL01.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\1. Excavacion\01. Sustento_Eliminacion de Excavacion_Val03.xlsx (4123 KB)
- **Tipo / formato:** xlsx — sustento de metrado excavacion/eliminacion PRO-GCE-FOR-F03 (VAL03).
- **Proposito / Origen -> Destino:** guias volquetes -> cantidad mov. tierras F07 VAL03.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\2. Concreto\01. Sustento_Concreto_Val03.xlsx (6844 KB)
- **Tipo / formato:** xlsx — sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL03).
- **Proposito / Origen -> Destino:** guias de concreto -> cantidad partida concreto F07 VAL03.
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico (cruce Almacen). GAP.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\3. Acero\01. Sustento_Acero_Val03.xlsx (22034 KB)
- **Tipo / formato:** xlsx — sustento de metrado de ACERO PRO-GCE-FOR-F03 (VAL03). Archivo grande (~22 MB, con imagenes).
- **Contenido:** metrado de acero (kg) por elemento, respaldado por guias de remision de acero (PDF en subcarpeta "1. Guias Acero").
- **Proposito:** sustentar acero valorizado en VAL03.
- **Origen -> Destino:** guias de acero proveedor (PDFs) -> peso kg -> cantidad partida acero F07 VAL03.
- **Automatizacion:** Valorizaciones (cliente); guias de acero al importador generico (cruce Almacen/Kardex). GAP sustento.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\3. Acero\1. Guias Acero\09-0T073-0623829.pdf ... 09-0T073-0623871.pdf (43 PDFs, ~300-700 KB c/u)
- **Tipo / formato:** PDF [no-Excel] — GUIAS DE REMISION de acero del proveedor (serie 09-0T073-06238xx).
- **Proposito:** evidencia documental del ingreso de acero usado para sustentar el metrado de acero VAL03.
- **Origen -> Destino:** proveedor de acero -> sustento de la partida de acero VAL03 (y cruce con Almacen).
- **Automatizacion:** GAP — son PDFs escaneados. Adjuntar como evidencia en Almacen/Valorizaciones; OCR fuera de alcance del importador actual. Conservar como respaldo.

### \...\1. PTARI\3. PTAR-VAL 03\GP-GCE-FOR-F07_VAL N°03.xlsx (521 KB)
- **Tipo / formato:** xlsx — **VALORIZACION AL CLIENTE F07 VAL N°03** (GP-GCE-FOR-F07), 15/01/2026.
- **Hojas:** layout estandar (Carátula, RESUMEN, PAGOS, RES.VAL, VAL, RO, Hoja1, Hoja 8).
- **Numeros clave:** MONTO REFERENCIAL 2,866,414.72 / 2,429,165.02; COSTO DIRECTO 1,876,958.15. Hoja RO: TOTAL COSTO DE OBRA 2,234,192.66; CD 1,751,047.24; **VAL03 actual 174,995.81 (TCO) / 137,152.87 (CD); ACUMULADO 494,018.59 (TCO) / 387,186.79 (CD)**.
- **Proposito:** valorizacion N°03 al cliente (enero 2026, incluye excavacion+concreto+acero).
- **Origen -> Destino:** sustentos VAL03 -> F07; RO acumula.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\1. Concreto\01. Sustento_Bomba.xlsx (3963 KB)
- **Tipo / formato:** xlsx — sustento de metrado de servicio de BOMBA de concreto PRO-GCE-FOR-F03 (VAL04).
- **Proposito:** sustentar el uso/horas/m3 de bomba de concreto valorizados en VAL04.
- **Origen -> Destino:** registros de bombeo -> partida bomba/concreto F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\1. Concreto\01. Sustento_Concreto_Val04.xlsx (11448 KB)
- **Tipo / formato:** xlsx — sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL04).
- **Proposito / Origen -> Destino:** guias de concreto -> cantidad partida concreto F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\1. Concreto\Copia de 01. Sustento_Puerta Cortafuegos1.xlsx (4812 KB)
- **Tipo / formato:** xlsx — sustento de metrado de PUERTA CORTAFUEGOS PRO-GCE-FOR-F03 (VAL04). (Nombre "Copia de", posible duplicado de trabajo.)
- **Proposito:** sustentar suministro/instalacion de puerta cortafuegos valorizada en VAL04.
- **Origen -> Destino:** sustento -> partida puerta cortafuegos F07 VAL04 (probable adicional).
- **Automatizacion:** Valorizaciones (cliente) / posible Adicionales. GAP.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\2. Acero\01. Sustento_Acero_Val04.xlsx (16954 KB)
- **Tipo / formato:** xlsx — sustento de metrado de ACERO PRO-GCE-FOR-F03 (VAL04), archivo grande con imagenes/guias.
- **Proposito / Origen -> Destino:** guias de acero -> kg -> partida acero F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico (cruce Almacen). GAP.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\3. Excavacion\01. Sustento_Eliminacion de Excavacion_Val04.xlsx (4190 KB)
- **Tipo / formato:** xlsx — sustento de metrado excavacion/eliminacion PRO-GCE-FOR-F03 (VAL04).
- **Proposito / Origen -> Destino:** guias volquetes -> mov. tierras F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\4. PTAR-VAL 04\GP-GCE-FOR-F07_VAL N°04.xlsx (525 KB)
- **Tipo / formato:** xlsx — **VALORIZACION AL CLIENTE F07 VAL N°04** (GP-GCE-FOR-F07), 30/01/2026.
- **Hojas:** layout estandar.
- **Numeros clave:** MONTO REFERENCIAL 2,866,414.72 / 2,429,165.02; COSTO DIRECTO 1,915,342.93. Hoja RO: **TOTAL COSTO DE OBRA 2,422,311.29; CD 1,915,342.93; VAL04 actual 548,394.09 (TCO) / 433,620.05 (CD); ACUMULADO 1,141,789.55 (TCO) / 902,823.08 (CD)** (salto fuerte por concreto+acero+adicionales).
- **Proposito:** valorizacion N°04 al cliente (mayor avance del proyecto).
- **Origen -> Destino:** sustentos VAL04 (concreto, bomba, acero, excavacion, puerta cortafuegos) -> F07; RO acumula.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\1. Concreto\01. Sustento_Concreto_Val05.xlsx (10996 KB)
- **Tipo / formato:** xlsx — sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL05).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\2. Encofrado\01. Sustento_Encofrado_Val05.xlsx (31643 KB)
- **Tipo / formato:** xlsx — sustento de metrado de ENCOFRADO PRO-GCE-FOR-F03 (VAL05). Archivo muy grande (~31 MB, fotografico).
- **Contenido:** metrado de encofrado (m2) por elemento + sustento fotografico.
- **Proposito / Origen -> Destino:** medicion campo -> cantidad partida encofrado F07 VAL05.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\3. Acero\01. Sustento_Acero_Val05.xlsx (2901 KB)
- **Tipo / formato:** xlsx — sustento de metrado de acero PRO-GCE-FOR-F03 (VAL05).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val05.xlsx (4375 KB)
- **Tipo / formato:** xlsx — sustento de metrado de ACARREO CON CAMION GRUA PRO-GCE-FOR-F03 (VAL05).
- **Proposito:** sustentar horas/viajes de camion grua valorizados en VAL05.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\4. Cordon Bentonítico\01. Sustento_Cordon Bentonítico_Val05.xlsx (25923 KB)
- **Tipo / formato:** xlsx — sustento de metrado de CORDON BENTONITICO / junta hidroexpansiva PRO-GCE-FOR-F03 (VAL05). Archivo grande (~25 MB).
- **Proposito:** sustentar ml de cordon bentonitico/junta valorizados en VAL05.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\5. Excavación\01. Sustento_Excavación_Val05.xlsx (5365 KB)
- **Tipo / formato:** xlsx — sustento de metrado de excavacion PRO-GCE-FOR-F03 (VAL05).
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\GP-GCE-FOR-F07_VAL N°05.xlsx (590 KB)
- **Tipo / formato:** xlsx — **VALORIZACION AL CLIENTE F07 VAL N°05** (GP-GCE-FOR-F07), 15/02/2026.
- **Hojas:** layout estandar.
- **Numeros clave:** MONTO REFERENCIAL 2,866,414.72 / 2,429,165.02; COSTO DIRECTO 1,826,881.62. Hoja RO: **TOTAL COSTO DE OBRA 2,310,435.34; CD 1,826,881.62; VAL05 actual 179,035.92 (TCO) / 141,565.28 (CD); ACUMULADO 1,320,825.47 (TCO) / 1,044,388.36 (CD)**.
- **Proposito:** valorizacion N°05 al cliente (concreto, encofrado, acero, acarreo grua, cordon bentonitico, excavacion).
- **Origen -> Destino:** sustentos VAL05 -> F07; RO acumula.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\1. Concreto\Sustento_Concreto_Val06.xlsx (28833 KB)
- **Tipo / formato:** xlsx — sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL06). Archivo grande (~28 MB).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\2. Encofrado\01. Sustento_Encofrado_Val06.xlsx (32211 KB)
- **Tipo / formato:** xlsx — sustento de metrado de encofrado PRO-GCE-FOR-F03 (VAL06). Archivo muy grande (~32 MB).
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\3. Acero\01. Sustento_Acero_Val06.xlsx (550 KB)
- **Tipo / formato:** xlsx — sustento de metrado de acero PRO-GCE-FOR-F03 (VAL06).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val06.xlsx (11396 KB)
- **Tipo / formato:** xlsx — sustento de metrado de acarreo con camion grua PRO-GCE-FOR-F03 (VAL06).
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\5. Cordon Bentonítico\01. Sustento_Cordon Bentonítico_Val06.xlsx (26252 KB)
- **Tipo / formato:** xlsx — sustento de metrado de CORDON BENTONITICO PRO-GCE-FOR-F03 (VAL06), 29/12/2025.
- **Hojas:** 1. Metrado | Met_MC | 2. Sust. Fotografico
- **Contenido:**
  - *1. Metrado*: partida cordon bentonitico, ITEM/DESCRIPCION/UND/CANT (pag 01 de 04).
  - *Met_MC (Muros de Contencion)*: colocacion de junta hidroexpansiva. Item 1 COLOCACION DE JUNTA HIDRO EXPANSIVA = 338.14 (ml); 1.1 junta hidro expansiva 13" = 297.53; incluye TANQUE DE OXIDACION (~11 filas).
  - *2. Sust. Fotografico*: evidencia (13/02/2026).
- **Numeros clave:** junta hidroexpansiva total 338.14 ml (de los cuales 297.53 ml de 13").
- **Proposito:** sustentar ml de cordon bentonitico/junta hidroexpansiva valorizados en VAL06 (muros de contencion, tanque de oxidacion).
- **Origen -> Destino:** medicion campo muros/tanque -> cantidad partida cordon bentonitico F07 VAL06.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

---

**Nota:** en este chunk (p1) las F07 presentes son VAL01 (vigente + superada), VAL02, VAL03, VAL04, VAL05 y la LIQUIDACION. La F07 de VAL06 NO esta en este chunk (solo sus sustentos de metrado); presumiblemente cae en el chunk p2.
