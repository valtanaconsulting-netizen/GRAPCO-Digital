# Catálogo Costos — 6. ISP (cont. 3)

Chunk: `cat_6_ISP__p3` · Categoría: 6. ISP (Informe Semanal de Producción) — proyecto CREDITEX (PTARI F1 + NAVE F2).
Archivos fichados: 5 (3 libros ISP maestros semanales + 2 de Control de Planilla).

Nota transversal: los tres libros ISP (SEM19, SEM20, SEM21) son el MISMO formato `PRO-GCR-FOR-F01` versionado por semana de corte. Cada libro arrastra TODAS las hojas semanales anteriores (ISP-SEM01…ISP-SEMxx) más sus hojas resumen (PC, CR, Control HH, Control IP). Es decir, son snapshots acumulativos; el más reciente (SEM21) es el que contiene la cadena completa y la estructura más evolucionada.

---

### \05. Gestión Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM19 (revisando).xlsx
- Tipo / formato: xlsx · código **PRO-GCR-FOR-F01** (Informe Semanal de Producción). Marcado "(revisando)" y en carpeta "1. Superado" (versión histórica corte SEM19). 4793 KB.
- Hojas (23): PC | CR | Control HH | Control IP | ISP-SEM19 … ISP-SEM01 (19 hojas semanales).
- Contenido por hoja:
  - **PC (Partidas Control)**: maestro de partidas de control de presupuesto con CÓDIGO (1001 TRABAJOS PRELIMINARES…), descripción y unidad (GLB, MES…). Catálogo WBS de control de obra. ~70 filas.
  - **CR (Control de Resultado / Costo de obra)**: columnas FRENTE | PARTIDA | Descripción | HH | COSTO | ACUM S/ IGV; **Costo MO prom = 25** (S/25). Trae REPORTE TAREOS valorizado por partida. Totales al corte 01.12.25: TOTAL COSTO DE OBRA = HH 13153.50 / COSTO S/238,987.50 / ACUM S/328,837.50; COSTO DIRECTO = HH 12770.50 / S/229,412.50. Partida 1 Trabajos Preliminares HH 3213.25; SSO (FA01 1.01) HH 645.25 / S/16,131.25; Topografía (1.02) HH 882 / S/22,050.
  - **Control HH**: comparativo HH PLANILLA (administración) vs HH CAMPO (tareo) vs HH META, por semana 1..19; columnas DELTA HH ACUM, DELTA HH ADM VS CAMPO, HH VARIACIÓN, **CPI** y desglose de variaciones por frente/causa (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). HH planilla total 13169 vs campo 13153.50.
  - **Control IP**: matriz de Índice de Productividad (IP = HH/metrado) por partida, con IP Contractual, IP Meta y columnas SEM01..SEM21 (serie de IP real acumulado por partida). Ej: Señalización IP Meta 90, real subiendo 110→238→227.52 (sobreconsumo). ~190 filas.
  - **ISP-SEMnn (19 hojas)**: hoja semanal por semana. Encabezado "INFORME SEMANAL DE PRODUCCIÓN (ISP) CR — SEMANA N° nn fecha-ini fecha-fin". Por partida: PREVISIÓN desglosada en PPTO OFERTA PTAR-F1 / PPTO OFERTA NAVE-F2 / ADICIONALES / TOTAL (cada uno METRADO·HH·IP), ACUMULADO ANTERIOR, META (IP Meta), VAR, CPI; luego avance diario LUN..DOM (METRADO·HH·IP) y PRESENTE SEMANA. Línea de totales semana (fila 6): HH acumulado, HH meta, VAR HH, CPI.
- Números clave: Costo MO S/25/h; corte SEM19 (09–15/03/2026): HH acum total 13153.50 vs Meta 10219.01, VAR -2934.49, **CPI 0.78**; semana 19 HH 925 vs meta 620.22, CPI semanal 0.67. CPI por semana en Control HH va 0.46→0.56→0.68→0.69→0.73→0.75→0.74 (S1..S7).
- Propósito: control de productividad de mano de obra semana a semana — compara HH gastadas (tareo de campo) contra HH meta del presupuesto por partida, calcula IP y CPI, y concilia HH campo vs HH planilla.
- Origen -> Destino: Origen = tareos diarios de campo (HH x partida) + planilla de RRHH + metrados de avance + IP meta del presupuesto/APU. Destino = alimenta el Control de Resultado (CR) y el seguimiento de productividad / EVM del proyecto.
- Automatización: el ISP es el corazón del módulo **ISP de GRAPCO** (tareos HH x S/25.5). Importar a: módulo ISP/Curva S F07 (HH y CPI semanal por partida) + RO/CR para el costo MO valorizado. HH meta e IP meta vienen del catálogo WBS/Presupuesto. La conciliación HH planilla vs campo es un **GAP (Control Planilla)**. Nota: el costo MO aquí es S/25 — la plataforma estandariza S/25.50 (revisar al ingerir). Importador genérico in-app sirve para la hoja semanal, pero conviene un importador ISP dedicado.

---

### \05. Gestión Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM20 .xlsx
- Tipo / formato: xlsx · código **PRO-GCR-FOR-F01**. Corte SEM20, carpeta "1. Superado" (histórico). 5050 KB.
- Hojas (24): PC | CR | Control HH | Control IP | ISP-SEM20 … ISP-SEM01 (igual a SEM19 + hoja ISP-SEM20).
- Contenido: idéntico formato al SEM19. Aporta la semana 20 (16–22/03/2026). PC/Control IP/ISP-SEMnn iguales en estructura.
  - **CR**: Costo MO prom = 25. Totales al corte: TOTAL COSTO DE OBRA HH 14031.50 / S/249,562.50 / ACUM S/350,787.50; COSTO DIRECTO HH 13632.50 / S/239,587.50 / ACUM S/340,812.50; Trabajos Preliminares HH 3485.75; SSO S/16,881.25; Topografía S/22,787.50.
  - **Control HH**: HH planilla total 14047 vs campo 14031.50. Mismas series semanales que SEM19 + semana extra.
  - **ISP-SEM20**: SEMANA N° 20 (16–22/03/2026). Totales semana: HH acum 14031.50 vs Meta 10523.52, VAR -3482.48, **CPI 0.75**; semana 20 HH 878 vs meta 213.77, CPI semanal 0.24 (muy bajo — fuerte sobreconsumo esa semana).
- Números clave: CPI acumulado 0.75 al corte SEM20; HH campo acum 14031.50; costo acumulado obra S/350,787.50 c/IGV.
- Propósito: igual que SEM19 — snapshot semanal de productividad MO un corte más adelante.
- Origen -> Destino: igual que SEM19 (tareos + planilla + metrados + IP meta -> CR / EVM).
- Automatización: misma ruta que SEM19 (módulo ISP + RO/CR + Curva S F07). Por ser snapshot superado, sólo se ingiere para serie histórica; el vivo es SEM21.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM21.xlsx
- Tipo / formato: xlsx · código **PRO-GCR-FOR-F01**. Corte SEM21, en raíz de 6. ISP (versión VIGENTE / más reciente). 5288 KB.
- Hojas (25): PC | CR | CHH | CIP | ISP-SEM21 … ISP-SEM01 (21 hojas semanales). Las resumen se renombran a CHH/CIP.
- Contenido por hoja (estructura más evolucionada del chunk):
  - **PC**: igual maestro de partidas de control (códigos 1001…).
  - **CR**: **Costo MO prom = 25.50** (ya estandarizado), encabezado "SEMANA N° 21 23/03/2026 29/03/2026". Añade columnas COMENTARIOS / ING. DE PRODUCCIÓN y "Respecto al Meta (HH | MONTO)". Totales: TOTAL COSTO DE OBRA HH 15171.50 / S/276,815.25 / ACUM S/386,873.25; COSTO DIRECTO HH 14740.50 / S/265,824.75 / ACUM S/375,882.75; Trabajos Preliminares HH 3568.75 / S/17,665.13; SSO S/17,665.13; Topografía HH 991.50 / S/25,283.25. Comentario en SSO: "SEÑALIZACION: Sobreconsumo de HH".
  - **CHH (Control HH)**: HH planilla total 15187 vs campo 15171.50, DELTA ADM vs CAMPO 16. Series semanales 1..21 con CPI, deltas y variaciones por causa (PRE, PRO, CON…).
  - **CIP (Control IP)**: añade "IP Actual Acum." con SEM21/SEM22/SEM23, DELTA (IP meta − IP actual) y COMENTARIO. Ej: Señalización IP Meta 90 / IP actual 178.93 / DELTA -82.93 con comentario "ACTUALIZAR APU REAL"; Andamios DELTA 30; Armado/desarmado andamios DELTA 54.35.
  - **ISP-SEM21**: cabecera enriquecida con bloque CONTROL/DELTA y **FORECAST**: CONTROL 17525.91; DELTA(1)-(2)=2515.32; DELTA(1)-(3)=3494.41; DELTA(1)-(6)=2354.41; CONTROL 15171.50. Previsión ahora consolida **PPTO OFERTA PTAR-F1+F2** (no separa frentes): METRADO/HH/IP F1+F2 = 15193.61 HH; ADICIONALES 2332.30 HH; PPTO CONTRACTUAL (1) 17525.91 HH; PPTO META (2) 15010.59 HH; ANTERIOR (4) 14031.50. Totales semana 21: HH presente 1140 vs meta 465.68, CPI semanal 0.41; acumulado actual HH 15171.50 vs meta 14885.91, VAR -2993.00, **CPI 0.98**; FORECAST 5561.73.
- Números clave: Costo MO S/25.50; PPTO contractual total = 17525.91 HH; PPTO meta = 15010.59 HH; HH campo acum 15171.50; CPI acumulado 0.98; FORECAST HH al término 5561.73; costo acumulado obra S/386,873.25 c/IGV; adicionales 2332.30 HH.
- Propósito: informe de producción vigente — además de productividad semanal, añade pronóstico (Forecast/EAC en HH) y control de IP real vs APU para gatillar actualización de precios. Es la fuente de la curva de HH y CPI del proyecto.
- Origen -> Destino: Origen = tareos diarios (HH/metrado por partida) + planilla + metrados + presupuesto contractual y meta (F1+F2+adicionales) + APU para IP. Destino = CR (costo MO valorizado), EVM/Forecast, Curva S de HH, y disparador de actualización de APU.
- Automatización: importador ISP dedicado en módulo **ISP** (HH x S/25.50, IP/CPI por partida y semana). La sección PPTO CONTRACTUAL / META / ADICIONALES enlaza con **Presupuesto (BAC)** y **Adicionales/Deductivos**; el FORECAST alimenta el **EVM del RO**; el DELTA IP vs APU es entrada al módulo de actualización de precios (costos, fuera de GRAPCO). Curva S F07 toma HH meta vs real por semana.

---

### \05. Gestión Costos\6. ISP\2. Control Planilla\HH PLANILLA VS HH CAMPO.xlsx
- Tipo / formato: xlsx (sin código GP/PRO). Auxiliar de Control de Planilla. 12 KB.
- Hojas (2): Hoja 1 (con datos) | Hoja 2 (**vacía**).
- Contenido: Hoja 1 tabla simple de conciliación semanal — columnas SEMANA | HH PLANILLA | HH PLANILLA ACUMULADO | HH CAMPO | HH CAMPO ACUMULADO. Filas Semana 1..~13.
- Números clave: S1 plan 238 / campo 239; S2 plan 334.50 (acum 572.50) / campo 320 (acum 559); S8 plan 431.50 / campo 516; S9 plan 491 / campo 444. Muestra desviaciones HH administración vs HH realmente reportadas en tareo.
- Propósito: conciliar las horas pagadas por planilla (RRHH/administración) contra las horas registradas en el tareo de campo, para detectar HH pagadas no productivas o no tareadas.
- Origen -> Destino: Origen = planilla de RRHH (HH pagadas) + tareos de campo (HH reportadas). Destino = hoja Control HH / CHH de los libros ISP (es la fuente del bloque "ADMINISTRACIÓN vs CAMPO").
- Automatización: **GAP — Control de Planilla** (no existe módulo en GRAPCO). Requeriría un importador de planilla (HH pagadas por semana) para cruzar contra las HH de tareo del módulo ISP. Por ahora ingestable como tabla simple vía importador genérico hacia un reporte de conciliación HH.

---

### \05. Gestión Costos\6. ISP\2. Control Planilla\HORAS EXTRAS CREDITEX (24-01-2026).xlsx
- Tipo / formato: xlsx (sin código). Registro manual de horas extras de un trabajador. 16 KB.
- Hojas (1): "Horas Luis".
- Contenido: control diario de ingreso/salida/horas extra de un colaborador (Luis), por bloques semanales (HORAS CREDITEX NOVIEMBRE, DICIEMBRE…). Filas: Ingreso (07:15AM), Salida (17:00PM / 19:00PM en días con extra), Hrs. Extras por día y total. Incluye notas (ej. "PERMISO 6 HR. TRÁMITE").
- Números clave: semana 24–30 nov: extras MIÉ 2, JUE 2, VIE 2, SÁB 5 = **11 Hr.** extras. Ingreso fijo 07:15, salida normal 17:00.
- Propósito: soporte de horas extra individuales para liquidación/planilla; insumo de costo de MO adicional.
- Origen -> Destino: Origen = marcaje/registro manual de asistencia del trabajador. Destino = planilla (cálculo de sobretiempo) y, agregado, al control HH.
- Automatización: relacionado al **Marcador facial / asistencia** de GRAPCO (entrada 07:30 + salida real) para puntualidad y sobretiempo, y al **GAP Control de Planilla** para liquidar HH extra. La hora real ya se guarda en el marcador; las horas extra serían un cálculo derivado (salida real − jornada).
