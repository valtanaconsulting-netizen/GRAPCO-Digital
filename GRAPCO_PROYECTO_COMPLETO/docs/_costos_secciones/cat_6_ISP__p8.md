# Catalogo Costos — Seccion 6. ISP (cont. 8) — `cat_6_ISP__p8`

Chunk con **1 archivo** (workbook maestro del ISP CREDITEX, semana de corte SEM31).

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM31.xlsx

- **Tipo / formato:** Excel (.xlsx), 8 577 KB. Codigo de formato: **PRO-GCR-FOR-F01** (Informe Semanal de Produccion — ISP). Es el archivo maestro acumulado del ISP del proyecto CREDITEX (PTAR/F1 + NAVE/F2 + Adicionales), con una hoja por semana ademas de las hojas de control.

- **Hojas (35):** `PC` | `CR` | `CHH` | `CIP` | y 31 hojas semanales `ISP-SEM31` ... `ISP-SEM01`.

- **Contenido a detalle por hoja:**

  - **PC (Partidas Control)** — rango B1:L992. Catalogo maestro de partidas de control con su CODIGO. Estructura jerarquica: titulos (1 = TRABAJOS PRELIMINARES, codigo 1001), sub-titulos (SEGURIDAD Y SALUD OCUPACIONAL, TOPOGRAFIA, etc.) y partidas con unidad (GLB, MES). Ej.: ALQUILER DE ANDAMIOS PARA TRABAJOS (GLB), SEÑALIZACION TEMPORAL DE SEGURIDAD (GLB), MITIGACION DE POLVO (MES), LIMPIEZA GENERAL Y PERMANENTE (MES). ~80 filas. Es la lista rectora de partidas que ordena todas las hojas semanales.

  - **CR (Control de Resultado / Reporte Tareos)** — rango B1:J1019. Resumen ejecutivo del costo de obra por partida. Costo MO promedio = **25.50** S/h. Columnas: FRENTE (PRE1, PRE2...) | codigo de FRENTE (FA01) | codigo partida (1.01, 1.02) | Descripcion | HH | COSTO | ACUM S/ IGV | COMENTARIOS (ING. DE PRODUCCION). Encabeza con la semana de corte (cabecera muestra SEMANA N° 24 13/04/2026-19/04/2026). Totales de control: **TOTAL COSTO DE OBRA = 17 059 HH / S/ 301 537.50 / acum S/ 435 004.50**; **COSTO DIRECTO = 16 619 HH / S/ 290 317.50 / acum S/ 423 784.50**; **TRABAJOS PRELIMINARES = 3 940.25 HH / S/ 18 570.38 / acum S/ 100 476.38**; SSO (PRE1/FA01/1.01) = 728.25 HH; TOPOGRAFIA (PRE2/FA01/1.02) = 1 058 HH / S/ 26 979. ~70 filas.

  - **CHH (Control HH Variaciones)** — rango B2:AP45. Cuadro semana a semana de horas-hombre comparando ADMINISTRACION (planilla) vs CAMPO (tareo) vs META. Columnas: SEMANA | HH PLANILLA (semanal) | HH PLANILLA ACUM | HH CAMPO semanal | HH CAMPO ACUM | CONTROL HH CAMPO ACUM | DELTA HH ACUM | (comparativo) HH PLANILLA ACUM | HH CAMPO ACUM | DELTA HH ADM VS CAMPO | (actual) HH CAMPO ACUM | HH META ACUM | HH VARIACION | **CPI** | y desglose de variacion por partida/categoria (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). Datos por semana 1..N. Ej.: Sem1 CPI 0.46 (239 HH campo vs 109.03 meta, var -129.97); Sem2 CPI 0.56; Sem5 CPI 0.73; Sem6 CPI 0.75. Totales generales: HH PLANILLA = 16 479.50, HH CAMPO = 16 464, delta = 16.

  - **CIP (Control de IP)** — rango B2:N230. Control del Indice de Productividad por partida (IP = HH/metrado). Columnas: partida | IP Contractual | IP Meta | IP Actual Acum por semana (SEM21, SEM22, SEM23, SEM24, SEM25...) | DELTA | COMENTARIO. Ej.: ALQUILER ANDAMIOS (IP contractual 30 / meta 25); ARMADO/DESARMADO ANDAMIOS (contr 136.85 / meta 130 / actual 82.50, delta 54.35, IP 2.71); SEÑALIZACION (contr 96 / meta 90 / actual 178.93→147.35, delta -82.93, comentario "ACTUALIZAR APU REAL"); ILUMINACION (contr 16 / meta 12 / actual 11.26→7.65). ~220 filas.

  - **ISP-SEM31 ... ISP-SEM01 (31 hojas semanales)** — rango tipico B1:CG1159 (semanas recientes con frentes separados F1/F2) / B1:BM/BP en semanas anteriores (frentes consolidados). Cada hoja es el ISP de una semana con esta estructura de columnas: CODIGO | PARTIDA DE CONTROL PRESUPUESTO | UND | bloques PREVISION repetidos (METRADO/HH/IP) para: **PPTO OFERTA PTAR (F1)**, **PPTO OFERTA NAVE (F2)**, **ADICIONALES**, **PPTO CONTRACTUAL (1)**, **PPTO META (2)**, **ACUMULADO ANTERIOR (4)** | META | VAR | **CPI (2/1)** | luego avance diario LUNES..DOMINGO (METRADO/HH/IP por dia con fecha real) | **PRESENTE SEMANA** (METRADO/HH/IP) | META | VAR | ademas bloques "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (DELTA (1)-(2), DELTA (1)-(3), FORECAST-META). Cada hoja arrastra su periodo y los acumulados de la anterior. ~180-240 filas por hoja (todas las partidas del PC).
    - Evolucion clave en la fila de totales (HH acum vs META vs CPI):
      - SEM01 (03-09/11/2025): arranque, 239 HH presente.
      - SEM02 (10-16/11): acum 558.50 HH, meta 312.23, CPI 0.56.
      - SEM05 (01-07/12): acum 1 405.50 HH, CPI 0.73.
      - SEM06 (08-14/12): acum 1 670.50 HH, CPI 0.75.
      - SEM23 (06-12/04/2026): acum 16 464 HH, meta 11 930.36, CPI 0.72.
      - SEM24 (13-19/04): CONTROL 17 059 HH; acum 16 464; meta 11 930.36; VAR -4 533.65; CPI 0.72.
      - SEM25 (20-26/04): acum 17 091, meta 12 909.23, CPI 0.76; CONTROL 17 680.51.
      - SEM26 (27/04-03/05): acum 17 680.51, CPI 0.84; CONTROL 18 139.01.
      - SEM27 (04-10/05): acum 18 139.01, CPI 0.84; CONTROL 18 394.01.
      - SEM28 (11-17/05): acum 18 394.01, CPI 0.83; CONTROL 18 516.01.
      - SEM29/30/31 (mayo-jun): CONTROL escala 18 663 → 18 807 → 19 017.51; CPI ~0.81-0.83; metas ~15 318-15 379.
    - Nota: varias cabeceras de SEM10-SEM18 muestran el rotulo "SEMANA N° 06 08/12/2025" como texto residual de plantilla, pero las fechas reales de los dias y los rangos de fecha del titulo corresponden a su semana (ej. SEM18 = 02-08/03/2026). SEM01-SEM03 usan el rotulo antiguo "INFORME SEMANAL DE PRODUCCION - PRECOT" y un solo PPTO ("PPTO 1"); a partir de SEM20 se separan F1/F2.
    - Se observan errores de formula (#DIV/0!, #VALUE!, #REF!) en columnas de IP/forecast de varias semanas cuando no hay metrado/HH.

- **Numeros clave (totales del proyecto, hoja CR y filas de total de cada ISP):**
  - Costo MO promedio: **S/ 25.50 / hora** (cuadra con la regla unica de la plataforma).
  - TOTAL COSTO DE OBRA (SEM24): **17 059 HH** = S/ 301 537.50 (acum S/ 435 004.50).
  - COSTO DIRECTO (SEM24): **16 619 HH** = S/ 290 317.50 (acum S/ 423 784.50).
  - HH META acum (SEM24): 11 930.36; VAR -4 533.65; **CPI 0.72**.
  - HH acumuladas CONTROL al corte mas reciente (SEM31): **~19 017.51 HH**; META ~15 318.29; VAR ~ -3 075.73; **CPI ~0.81**.
  - PPTO META (META total HH, fila 7): F1+F2 ~17 577.26 HH; PPTO CONTRACTUAL ~22 728.79 HH (semanas recientes con F1 17 160.53 + F2 798.34 + Adicionales 2 453.01).
  - CHH: HH PLANILLA total 16 479.50 vs HH CAMPO 16 464 (delta 16).

- **Proposito:** Es el corazon del control de produccion/costo de mano de obra del proyecto. Mide semana a semana el avance fisico (metrado), las HH consumidas y el Indice de Productividad (IP) por partida, comparando contra el presupuesto contractual y la meta, y calculando CPI, variaciones de HH y forecast. Traduce las HH a costo via S/25.50/h. Sirve para detectar partidas con sobreconsumo de HH (CPI < 1) y para alimentar el Resultado Operativo con las 4 patas de mano de obra.

- **Origen -> Destino:**
  - Origen: tareos diarios de campo (HH y metrado por partida y por dia) + presupuesto de oferta F1/F2 + adicionales + APU meta (IP meta). HH planilla viene de administracion (CHH).
  - Destino: alimenta el Reporte de Resultado (hoja CR), el Control de HH (CHH) y el Control de IP (CIP) del mismo libro; y aguas abajo es la fuente de la mano de obra valorizada para el RO/CR y para el seguimiento de Curva S / EVM del proyecto.

- **Automatizacion (mapeo GRAPCO):**
  - Destino natural: **modulo ISP** de GRAPCO (tareos HH x S/25.5). Las hojas semanales son exactamente el detalle diario METRADO/HH/IP por partida que el ISP de la plataforma ya modela; la fuente unica deben ser los Registros_Campo (tareos) y el Catalogo_WBS (partidas/IP meta), no este Excel.
  - Hoja CR -> alimenta el **Resultado Operativo (RO/CR + F06)** como la pata de mano de obra valorizada (HH x 25.5).
  - Hoja CHH (planilla vs campo) -> hoy es un GAP: **Control de Planilla** no existe en la plataforma; importar via importador generico in-app o crear vista de conciliacion HH planilla vs HH campo.
  - Hoja CIP (IP contractual/meta/actual por partida) -> el CPI de la plataforma ya toma IP Meta/Presupuesto del Catalogo WBS (fuente unica); CIP serviria para validar/cargar esos IP meta y para el seguimiento de productividad por partida.
  - Curva S: las HH acumuladas meta vs reales por semana (fila de totales de cada ISP + CHH) alimentan la **Curva S (F07)** y el EVM.
  - Ingesta recomendada: parser por hoja semanal (cabecera de semana + matriz partida x dia) -> normalizar a registros de tareo; las hojas PC/CR/CHH/CIP como tablas de control derivadas/calculadas en la plataforma, no importadas tal cual.
