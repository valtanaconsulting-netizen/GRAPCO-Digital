# Categoria 6 — ISP (continuacion 6)

Chunk: `cat_6_ISP__p6.txt`. Contiene UN solo archivo Excel (libro maestro ISP del proyecto CREDITEX PTARI+NAVE), con 31 hojas.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM27.xlsx

- **Tipo / formato:** Excel (.xlsx), 7184 KB. Codigo de formato: **PRO-GCR-FOR-F01** (Informe Semanal de Produccion — ISP). Es el libro maestro de control de produccion/HH del proyecto, acumulado hasta la Semana 27.
- **Hojas (31):** `PC` | `CR` | `CHH` | `CIP` | y 27 hojas semanales `ISP-SEM27` ... `ISP-SEM01` (un ISP por semana del proyecto, S01 = 03/11/2025 a S27 = 04-10/05/2026).

#### Contenido por hoja

**PC — Partidas de Control (B1:L992)**
- Catalogo / arbol de partidas de control del presupuesto con su CODIGO. Encabezados: `PARTIDAS CONTROL | CODIGO`.
- Estructura tipo WBS: titulo "1 TRABAJOS PRELIMINARES" codigo 1001; sub-bloques "SEGURIDAD Y SALUD OCUPACIONAL", "TOPOGRAFIA", etc. con unidad (GLB, MES, ...). Ejemplos de partidas: ALQUILER DE ANDAMIOS PARA TRABAJOS (GLB), ALQUILER DE ANDAMIOS ESCALERAS PARA AC (GLB), SEÑALIZACION TEMPORAL DE SEGURIDAD (GLB), ILUMINACION DE ACCESOS Y FRENTES (GLB), MITIGACION DE POLVO (MES), LIMPIEZA GENERAL Y PERMANENTE (MES). (+69 filas mas).
- Es la lista maestra de partidas que alimenta todas las hojas semanales.

**CR — Control de Recursos / Reporte de Tareos (B1:J1019)**
- Cabecera fija: `Costo MO prom: 25.50` y `SEMANA N° 24 13/04/2026 19/04/2026` (la hoja CR esta enganchada a la semana de corte).
- Columnas: FRENTE | PARTIDA (codigo FA01, etc.) | codigo | Descripcion | **HH** | **COSTO** | **ACUM S/ IGV** | COMENTARIOS | (campo ING. DE PRODUCCION).
- Estructura de totales (semana 24):
  - TOTAL COSTO DE OBRA: HH 17059 | COSTO S/ 301,537.50 | ACUM S/ 435,004.50
  - COSTO DIRECTO: HH 16619 | COSTO S/ 290,317.50 | ACUM S/ 423,784.50
  - 1 TRABAJOS PRELIMINARES: HH 3940.25 | COSTO 18,570.38 | ACUM 100,476.38
  - PRE1 / FA01 / 1.01 SEGURIDAD Y SALUD OCUPACIONAL: HH 728.25 | 18,570.38 | 18,570.38
  - PRE2 / FA01 / 1.02 TOPOGRAFIA: HH 1058 | 26,979 | 26,979
- Es la valorizacion de HH a costo (HH x S/25.50) por frente y partida -> equivale al CR del RO.

**CHH — Control de HH / Variaciones (B2:AP45)**
- Compara HH ADMINISTRACION (planilla) vs HH CAMPO (tareos) por semana, y campo vs META.
- Bloques de columnas: ADMINISTRACION (HH PLANILLA, HH PLANILLA ACUM.), CAMPO (HH CAMPO semanal, HH CAMPO ACUM., CONTROL HH CAMPO ACUM., DELTA HH ACUM), COMPARATIVO (HH PLANILLA ACUM. vs HH CAMPO ACUM., DELTA HH ADM VS CAMPO), ACTUAL (HH CAMPO ACUM., HH META ACUM., HH VARIACION, **CPI**), y un desglose por familias de partida (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE).
- Datos por semana 1..27. Ejemplos:
  - Totales cabecera: HH PLANILLA 16,479.50 | HH CAMPO 16,464 | delta 16.
  - SEM1: planilla 238, campo 239, meta 109.03, variacion -129.97, CPI 0.46.
  - SEM6: campo acum 1670.50, meta 1244.95, variacion -425.55, CPI 0.75.
- Sirve para conciliar planilla vs tareos y medir desviacion de HH contra meta.

**CIP — Control de IP / Indice de Productividad (B2:N230)**
- Compara IP Contractual vs IP Meta vs IP Actual Acumulado por semana (columnas SEM21..SEM25 visibles), con DELTA y COMENTARIO.
- Columnas: PARTIDA | IP Contractual | IP Meta | SEM21 | SEM22 | SEM23 | SEM24 | SEM25 | DELTA | COMENTARIO.
- Ejemplos:
  - ALQUILER DE ANDAMIOS PARA TRABAJOS: IP contractual 30, meta 25, delta 30.
  - ARMADO Y DESARMADO DE ANDAMIOS ESCALER: contractual 136.85, meta 130, actual ~82.50, delta 54.35.
  - SEÑALIZACION TEMPORAL DE SEGURIDAD: contractual 96, meta 90, actual 178.93->147.35, delta -82.93, comentario "ACTUALIZAR APU REAL".
  - ILUMINACION DE ACCESOS: contractual 16, meta 12, actual 11.26->7.65, delta 4.74.
- Mide la productividad real (HH/unidad) vs la prevista; (+218 filas).

**ISP-SEM01 ... ISP-SEM27 — Informe Semanal de Produccion (una hoja por semana)**
- Mismo formato repetido, con la matriz de presupuesto-meta-real por partida. Estructura tipica de columnas (rangos B1:CG... en semanas recientes, B1:BM/BP... en antiguas):
  - CODIGO | PARTIDA DE CONTROL PRESUPUESTO | UND
  - Bloques PREVISION (METRADO/HH/IP) para: PPTO OFERTA PTAR (F1), PPTO OFERTA NAVE (F2), ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2). En semanas antiguas (S01-S13) es "PPTO OFERTA PPTO 1" + ADICIONALES + TOTAL(0).
  - ACUMULADO ANTERIOR (4) (METRADO/HH/IP), META, VAR, **CPI** (2/1).
  - Detalle diario LUNES..DOMINGO (METRADO/HH/IP por dia) con fecha real en cabecera.
  - PRESENTE SEMANA (METRADO/HH/IP) y bloque META/VAR/CPI.
  - Bloques de cabecera "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (CONTROL, DELTA (1)-(2), DELTA (1)-(3), FORECAST-META).
- Cada hoja lleva su periodo: "SEMANA N° NN dd/mm/aaaa dd/mm/aaaa". Nota: varias hojas semanales (S06-S16) arrastran en la fila 2 el texto residual "SEMANA N° 06 08/12/2025 14/12/2025" (titulo no actualizado), pero la fila siguiente trae la semana correcta.
- Evolucion del HH meta acumulado (fila 6/7 "PRESENTE", CONTROL meta vs ppto):
  - SEM27: control meta 20,411.88; acumulado HH 18,139.01; meta 15,155.29; VAR -2,963.73; CPI 0.84. (vs ppto: control 18,394.01, meta 15,318.28, VAR -3,075.73, CPI 0.83).
  - SEM26: acum 17,680.51; meta 14,911.33; VAR -2,749.19; CPI 0.84.
  - SEM25: acum 17,091; meta 12,909.23; VAR -4,181.78; CPI 0.76.
  - SEM24: acum 16,464; meta 11,930.36; VAR -4,533.65; CPI 0.72.
  - SEM23: acum 15,856; meta 11,654.35; VAR -4,201.66; CPI 0.74.
  - SEM21: acum 14,031.50; meta 10,181.74; CPI 0.73.
  - SEM18: acum 12,228.50; meta 8,540.41; CPI 0.78.
  - SEM13: acum 6,477.50; meta 4,886.82; CPI 0.87.
  - SEM06: acum 1,670.50; meta 1,244.95; CPI 0.67.
  - SEM01: arranque, acum 239 HH; meta 0.
- Estructura de presupuesto cambia a mitad de obra: S01-S13 = "PPTO OFERTA PPTO 1"; S14-S20 = se separa "PPTO OFERTA PTAR - F1" y "PPTO OFERTA NAVE - F2"; S21-S27 = "PPTO OFERTA PTAR (F1)", "PPTO OFERTA NAVE (F2)", ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2). Refleja la incorporacion de la NAVE (F2) y adicionales al control.
- Filas de partida (ej. ALQUILER DE ANDAMIOS): muestran metrado/HH/IP previstos por presupuesto, meta, acumulado, produccion diaria y CPI por partida. Hojas antiguas tienen muchos #DIV/0! por celdas sin produccion.

#### Numeros clave
- Costo MO promedio: **S/ 25.50 / HH** (constante en todo el libro).
- Semana de corte del libro: **SEM27 (04-10/05/2026)**.
- TOTAL COSTO DE OBRA (CR, sem24): **HH 17,059** | **S/ 301,537.50** semanal | **ACUM S/ 435,004.50**.
- COSTO DIRECTO (CR, sem24): HH 16,619 | S/ 290,317.50 | ACUM S/ 423,784.50.
- HH campo acumulado final (SEM27): **18,139.01 HH**; HH META acumulado 15,155.29; VAR -2,963.73 HH; **CPI 0.84**.
- HH PLANILLA acum 16,479.50 vs HH CAMPO acum 16,464 (delta 16) — conciliacion CHH.
- CPI por semana se mueve entre 0.67 (SEM06) y 0.89 (SEM14), tendencia ~0.84 al cierre; CPI < 1 = sobreconsumo de HH vs meta toda la obra.

#### Proposito
- Nucleo del control de produccion y mano de obra del proyecto: convierte tareos (HH x frente x partida x dia) en metrado, IP (productividad), costo de MO (HH x S/25.5) y CPI, comparando contra presupuesto contractual (F1 PTAR + F2 NAVE + adicionales) y contra meta interna. Es el insumo de HH para el Resultado Operativo (pata de mano de obra).

#### Origen -> Destino
- **Origen:** tareos diarios de campo (registros por frente/partida/dia), planilla de administracion (HH planilla), y presupuesto oferta/meta (PTAR F1, NAVE F2, adicionales). El catalogo PC define las partidas.
- **Destino:** alimenta el CR (costo MO valorizado), el CHH (conciliacion planilla vs campo), el CIP (productividad) y los KPIs CPI/VAR que suben al Resultado Operativo y al reporte gerencial semanal.

#### Automatizacion (GRAPCO)
- Destino natural: **modulo ISP** de GRAPCO (tareos HH x S/25.5) + **Resultado Operativo (RO/CR + EVM)** para CPI/VAR + **Curva S (F07)** para la evolucion HH meta vs real por semana.
- Las hojas semanales ISP-SEMxx son acumulativos por semana del proyecto: ingerir via el **importador generico in-app** mapeando partida (codigo PC) + semana (obtenerSemana, S01=03/11/2025) + metrado/HH/IP/CPI. El detalle diario LUNES..DOMINGO ya se genera nativamente desde el tareo facial (entrada 07:30), por lo que GRAPCO puede RECALCULAR el ISP en vez de importarlo.
- PC -> catalogo de partidas de control (Catalogo_WBS / partidas de control del RO).
- CR -> CR del RO (HH x S/25.5 por frente/partida); CHH -> conciliacion planilla vs tareos (**GAP parcial: Control Planilla** no existe como modulo, hoy GRAPCO solo tiene HH de tareo, falta el lado planilla/administracion); CIP -> tablero de IP/productividad por partida (puede vivir en RO o ISP).
- GAP: la separacion presupuesto F1/F2/adicionales y la fila META requieren que Presupuesto (BAC) y Adicionales/Deductivos esten cargados para que el ISP cruce contra "control" y "meta".
