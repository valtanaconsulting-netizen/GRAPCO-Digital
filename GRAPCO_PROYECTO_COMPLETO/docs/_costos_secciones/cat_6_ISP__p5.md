# CATEGORIA: 6. ISP (cont. 5) — Informe Semanal de Produccion CREDITEX (PTARI + NAVE)

Chunk `cat_6_ISP__p5` con 2 archivos. Ambos son el MISMO libro maestro de ISP (PRO-GCR-FOR-F01), capturado en dos cortes consecutivos: SEM25 (semana 25, corte 20–26/04/2026) y SEM26 (semana 26, corte 27/04–03/05/2026). Es el corazon del control de produccion/HH del proyecto: convierte tareos (HH x S/25.50) en IP real y lo compara contra IP Contractual e IP Meta partida por partida, semana por semana.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM25.xlsx
- **Tipo / formato:** xlsx — codigo **PRO-GCR-FOR-F01** (Informe Semanal de Produccion, ISP). 6498 KB. Corte = SEMANA N° 25 (20/04/2026 – 26/04/2026).
- **Hojas (29):** PC | CR | CHH | CIP | ISP-SEM25 ... ISP-SEM01 (una hoja-foto por cada semana, de la 25 hacia atras hasta la 01).
- **Contenido por hoja:**
  - **PC (Partidas Control):** catalogo/maestro de partidas de control con su CODIGO (TRABAJOS PRELIMINARES = 1001) y unidad. Estructura WBS: 1 TRABAJOS PRELIMINARES > 1.01 SEGURIDAD Y SALUD OCUPACIONAL, 1.02 TOPOGRAFIA, ALQUILER DE ANDAMIOS (GLB), SEÑALIZACION TEMPORAL (GLB), ILUMINACION DE ACCESOS (GLB), MITIGACION DE POLVO (MES), LIMPIEZA GENERAL (MES), etc. (~79 partidas). Es la lista rectora de partidas de control del proyecto.
  - **CR (Control de Recursos / Costo):** convierte HH en S/. Encabezado "Costo MO prom: 25.50" y "SEMANA N° 24 13/04/2026 – 19/04/2026". Columnas: FRENTE | PARTIDA | Descripcion | HH | COSTO | ACUM S/ IGV. Filas resumen: TOTAL COSTO DE OBRA, COSTO DIRECTO, y desglose por partida (PRE1 FA01 1.01 SEGURIDAD; PRE2 FA01 1.02 TOPOGRAFIA, etc.). Codigos de frente FA01, PRE1/PRE2.
  - **CHH (Control HH Variaciones):** comparativo HH ADMINISTRACION (planilla) vs CAMPO (tareo) vs META, semana a semana. Columnas: SEMANA, HH PLANILLA / HH PLANILLA ACUM., HH CAMPO semanal / acum / control / DELTA, COMPARATIVO (HH PLANILLA ACUM vs HH CAMPO ACUM, DELTA ADM VS CAMPO), ACTUAL (HH CAMPO ACUM, HH META ACUM, HH VARIACION, **CPI**), y desglose de variacion por agrupador (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). Trae el CPI por semana (S1 0.46 → S6 0.75, en ascenso). Incluye notas tipo "100m2 encofrado 60hr".
  - **CIP (Control de IP):** matriz IP por partida. Columnas: IP Contractual | IP Meta | IP Actual Acum por semana (SEM21, SEM22, SEM23, SEM24, SEM25) | DELTA | COMENTARIO. Ej: SEÑALIZACION IP Contractual 96 / Meta 90 / Actual ~147–178 (DELTA -82.93, comentario "ACTUALIZAR APU REAL"); ILUMINACION 16/12; ANDAMIOS 30/25. SEM25 muestra varios **#REF!** (formula rota). ~224 partidas.
  - **ISP-SEMnn (una por semana):** la matriz semanal completa de produccion. Por cada partida: METRADO/HH/IP para PPTO OFERTA PTAR (F1), PPTO OFERTA NAVE (F2), ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2); ACUMULADO ANTERIOR (4); META/VAR/CPI; metrado-HH-IP diario LUNES..DOMINGO; PRESENTE semana; bloques "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (forecast). ~190 filas de partidas por hoja.
- **Numeros clave (corte SEM25):**
  - Costo MO promedio: **S/ 25.50/HH** (cuadra con COSTO_HORA_PROMEDIO de GRAPCO).
  - HH Contractual total (PPTO CONTRACTUAL 1): **22 728.79 HH**; HH PPTO META: **17 577.26 HH**; HH ACUMULADO presente (control): **17 680.51 HH**; HH META acum: 12 909.23; VAR -4 181.78; **CPI 0.76** (sobre meta).
  - Reparto contractual HH por frente: PTAR/F1 = 17 160.53; NAVE/F2 = 798.34; ADICIONALES = 2 453.01.
  - HH semana presente SEM25 = 589.51; analisis respecto al ppto: control 17 680.51, VAR -83.24.
  - CR (hoja, corte sem24): TOTAL COSTO DE OBRA 17 059 HH / S/ 301 537.50 (acum S/ IGV S/ 435 004.50); COSTO DIRECTO 16 619 HH / S/ 290 317.50 (acum S/ 423 784.50); TRABAJOS PRELIMINARES 3 940.25 HH / S/ 18 570.38 (acum S/ 100 476.38).
  - Serie CPI semanal (CHH): S1 0.46, S2 0.56, S3 0.68, S4 0.69, S5 0.73, S6 0.75 (tendencia de mejora; sostenido < 1 = sobreconsumo de HH vs meta).
- **Proposito:** medir productividad real (IP = HH/metrado) por partida y semana, contra IP Contractual y Meta; calcular CPI de HH, valorizar HH en S/ (CR), y controlar la brecha HH planilla vs campo (CHH). Es el reporte que dispara los analisis de variacion del costo de mano de obra.
- **Origen → Destino:** ORIGEN = tareos diarios de campo (HH por partida/dia) + presupuesto oferta (F1 PTAR, F2 NAVE, adicionales) + APU/HH meta. DESTINO = alimenta el CPI y la pata de Mano de Obra del Resultado Operativo (CR/RO), el seguimiento de IP y los analisis de variacion del control de costos.
- **Automatizacion (GRAPCO):**
  - Las hojas ISP-SEMnn → modulo **ISP** (tareos HH x S/25.5) e **IP/CPI**; los HH diarios provienen de **Registros_Campo** (tareos), fuente unica.
  - PC → maestro de partidas, mapeable al **Catalogo_WBS** (codigo 1001, etc.).
  - CIP (IP Contractual / IP Meta) → debe nutrir el **CPI desde el catalogo WBS** (IP Meta/Ppto, fuente unica). Reemplaza esta hoja manual con celdas #REF!.
  - CR (HH→S/) → pata MO del **Resultado Operativo (RO/CR/F06 + EVM)**; el costeo ya usa S/25.50.
  - CHH (planilla vs campo) → mapea al **GAP "Control Planilla"** (no existe modulo): la columna HH PLANILLA viene de RR.HH., no de tareos. Importable via importador generico mientras tanto.
  - Mecanica de ingesta: importador generico in-app por hoja semanal, o derivar IP/CPI directo de tareos + WBS sin re-subir el libro de 6 MB.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM26.xlsx
- **Tipo / formato:** xlsx — codigo **PRO-GCR-FOR-F01** (ISP). 6841 KB. Corte = SEMANA N° 26 (27/04/2026 – 03/05/2026). Es la version mas reciente del libro (sucesor directo del SEM25).
- **Hojas (30):** PC | CR | CHH | CIP | ISP-SEM26 | ISP-SEM25 ... ISP-SEM01 (una hoja mas que SEM25: agrega ISP-SEM26).
- **Contenido por hoja:** identico al SEM25 (PC=maestro partidas; CR=HH→S/ MO 25.50; CHH=planilla vs campo + CPI semanal; CIP=IP por partida; ISP-SEMnn=matriz semanal F1/F2/adicionales/contractual/meta + diario + analisis). Diferencias frente a SEM25:
  - Se añade hoja **ISP-SEM26** (corte semana 26).
  - CIP en SEM26 ya **no muestra #REF!** en la columna de la ultima semana (formula corregida respecto a SEM25, que tenia #REF! en SEM25).
- **Numeros clave (corte SEM26):**
  - HH Contractual total 22 728.79; HH PPTO META 17 577.26 (mismos contractuales/meta que SEM25, no cambian).
  - HH ACUMULADO presente (control SEM26): **18 139.01 HH**; HH META acum 14 911.33; VAR -2 749.19; **CPI 0.84** (mejora frente al 0.76 de SEM25).
  - HH semana presente SEM26 = 458.50 (CPI semana 0.53); analisis respecto al ppto: control 18 139.01, VAR -561.75.
  - Reparto contractual por frente (igual): PTAR/F1 17 160.53; NAVE/F2 798.34; adicionales 2 453.01.
  - CR (hoja, mismo corte sem24 mostrado): TOTAL COSTO DE OBRA 17 059 HH / S/ 301 537.50 / acum S/ 435 004.50; COSTO DIRECTO 16 619 HH / S/ 290 317.50.
- **Proposito:** mismo que SEM25 — ISP semanal acumulado, ahora con la semana 26 cerrada; es la foto vigente del control de produccion y CPI de HH.
- **Origen → Destino:** mismo flujo que SEM25 (tareos + presupuesto oferta + IP meta → CPI / RO MO / analisis de variacion). Sucede a SEM25 como version viva.
- **Automatizacion (GRAPCO):** identica al SEM25. Recomendacion: ingerir SOLO la version mas reciente (SEM26) y, en adelante, generar el ISP/IP/CPI dinamicamente desde **Registros_Campo** (tareos) + **Catalogo_WBS** (IP Meta/Ppto) en lugar de importar libros de 6 MB que duplican todas las semanas previas.
