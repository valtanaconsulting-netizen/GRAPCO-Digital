# Categoria 6. ISP (continuacion 2) — Fichas detalladas

Chunk: `cat_6_ISP__p2`. Contiene 2 libros maestros del Informe Semanal de Produccion (ISP) del proyecto CREDITEX (PTARI F1 + NAVE F2). Cada libro es un xlsx grande (3.6–4.0 MB) con la misma arquitectura: hojas de configuracion (PARTIDAS CONTROL, CR, Control) + N hojas ISP-SEMxx que son fotos acumuladas por semana. SEM16 es la version mas reciente (incluye una semana mas que SEM15).

Codigo de formato: **PRO-GCR-FOR-F01** (formato ISP del area de Gestion de Costos / Control de Resultados, GCR).

---

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM15 .xlsx
- **Tipo / formato:** xlsx — `PRO-GCR-FOR-F01` (Informe Semanal de Produccion, ISP). Esta en subcarpeta "1. Superado" (version reemplazada por SEM16).
- **Hojas (18):** PARTIDAS CONTROL | CR | Control | ISP-SEM15 | ISP-SEM14 | ISP-SEM13 | ISP-SEM12 | ISP-SEM11 | ISP-SEM10 | ISP-SEM09 | ISP-SEM08 | ISP-SEM07 | ISP-SEM06 | ISP-SEM05 | ISP-SEM04 | ISP-SEM03 | ISP-SEM02 | ISP-SEM01.
- **Contenido por hoja:**
  - **PARTIDAS CONTROL** (B1:L992): catalogo de partidas de control con CODIGO (ej. 1001 = TRABAJOS PRELIMINARES) y UND. Estructura jerarquica: capitulo (1 TRABAJOS PRELIMINARES) -> subpartida (SEGURIDAD Y SALUD OCUPACIONAL) -> items con unidad (ALQUILER DE ANDAMIOS PARA TRABAJOS=GLB, MITIGACION DE POLVO=MES, LIMPIEZA GENERAL=MES, SEÑALIZACION TEMPORAL=GLB, ILUMINACION DE ACCESOS=GLB). Es la lista maestra de partidas (WBS de control) que alimenta validaciones de las hojas ISP.
  - **CR** (Control de Resultados, B1:H1019): tabla de costo de obra acumulado por partida. Encabezado "Costo MO prom: 25". Columnas: FRENTE (PRE1, PRE2, codigo FA01) | PARTIDA (1.01, 1.02) | Descripcion | REPORTE TAREOS: HH | COSTO | ACUM S/ IGV (con corte de fecha 01.12.25). Totales arriba: TOTAL COSTO DE OBRA y COSTO DIRECTO; luego desglose por capitulo y partida (1 TRABAJOS PRELIMINARES, 1.01 SEGURIDAD Y SALUD OCUPACIONAL, 1.02 TOPOGRAFIA...).
  - **Control** (B3:Q37): cuadro comparativo HH ADMINISTRACION (planilla) vs CAMPO vs ISP, semana a semana. Columnas: SEMANA | HH PLANILLA | HH PLANILLA ACUM. | HH CAMPO semanal | HH CAMPO ACUM. | CONTROL HH CAMPO ACUM. (isp) | DELTA HH ACUM | (bloque COMPARATIVO) HH PLANILLA ACUM. | HH CAMPO ACUM. | DELTA HH ADM VS CAMPO. Concilia las tres fuentes de HH.
  - **ISP-SEMxx (15 hojas, SEM01..SEM15)** (rangos ~B1:BMxxxx / BPxxxx): cada hoja es el ISP de una semana, ACUMULADO. Encabezados: "INFORME SEMANAL DE PRODUCCION (ISP) CR" con N° de semana y rango de fechas (SEM01 = 03/11/2025–09/11/2025 ... SEM05 = 01/12/2025–07/12/2025; las hojas SEM06+ arrastran un titulo "SEMANA N° 06 08/12/2025 14/12/2025" no actualizado). Columnas: CODIGO | PARTIDA DE CONTROL PRESUPUESTO | UND | bloques PREVISION (METRADO/HH/IP) para PPTO OFERTA PTAR-F1, PPTO OFERTA NAVE-F2, ADICIONALES, TOTAL, PPTO META | ACUMULADO ANTERIOR (METRADO/HH/IP) | META | VAR | CPI | luego columnas diarias LUNES..DOMINGO (METRADO/HH/IP por dia, con fecha real GMT-0500) | PRESENTE SEMANA (METRADO/HH/IP, HH meta, VAR, %) | META/VAR/CPI acumulado. Las primeras hojas (SEM01..SEM13) tienen un solo bloque "PPTO OFERTA PPTO 1"; a partir de SEM14/SEM15 se abre en dos frentes "PPTO OFERTA PTAR - F1" y "PPTO OFERTA NAVE - F2". IP = indice de productividad (HH/metrado), IP Meta = referencia presupuesto, CPI = ratio meta/real.
- **Numeros clave (de la hoja CR y filas 6 de cada ISP):**
  - CR a corte 01.12.25: TOTAL COSTO DE OBRA = 8,633.50 HH / S/148,737.50 (acum S/IGV S/215,837.50); COSTO DIRECTO = 8,395 HH / S/142,775 (acum S/209,875); TRABAJOS PRELIMINARES = 2,373.25 HH / S/14,381.25; SSO 575.25 HH; TOPOGRAFIA 608 HH / S/15,200.
  - HH acumulado por semana (campo/ISP): S1 239, S2 558.50, S3 702.50, S4 1,006, S5 1,405.50, S6 1,670.50, S7 1,946.50... hasta SEM15 ~8,633.50 HH (HH presente SEM15 = 1,045).
  - CPI acumulado deteriorandose y recuperandose: SEM01 0.46, SEM02 0.56, SEM03 0.68, SEM07 0.74, SEM10 0.84, SEM13 0.89, SEM14 0.87, SEM15 0.82. Metas HH acumuladas (col META): SEM15 meta 7,066.88 HH vs real 8,633.50 -> VAR -1,566.62 HH.
  - HH planilla total (hoja Control) ~8,648.50; delta planilla vs campo estable en ~14 HH desde SEM2.
- **Proposito:** medir productividad de mano de obra semana a semana (metrado ejecutado vs HH gastadas vs HH meta del presupuesto), calcular IP y CPI por partida y frente, y conciliar HH de planilla con HH de campo/ISP. Es el tablero de control de eficiencia de obra.
- **Origen -> Destino:** Origen = tareos de campo (HH por partida y dia) + metrados de avance + presupuesto meta (PPTO OFERTA por frente y ADICIONALES). Destino = hoja CR (costo de obra acumulado a S/25.50/HH) y hoja Control (conciliacion planilla/campo); alimenta los KPI de productividad y el CPI del proyecto.
- **Automatizacion:** Modulo **ISP** de GRAPCO (tareos HH x S/25.50) + **Resultado Operativo (RO/CR + EVM)**. Las HH diarias por partida -> importador de tareos (fuente Registros_Campo); el bloque PPTO META/PTAR-F1/NAVE-F2/ADICIONALES -> Presupuesto (BAC) y Adicionales/Deductivos; CPI/IP/VAR se calculan en el motor EVM. La hoja PARTIDAS CONTROL -> Catalogo_WBS (fuente unica de partidas). La hoja Control (planilla vs campo) toca el GAP **Control Planilla**. Importador generico in-app puede ingerir la matriz ISP semanal; el resto es calculo nativo del RO.

---

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM16 .xlsx
- **Tipo / formato:** xlsx — `PRO-GCR-FOR-F01` (ISP). Version mas reciente del libro ISP (una semana mas que SEM15). Tambien en "1. Superado".
- **Hojas (19):** PARTIDAS CONTROL | CR | Control | ISP-SEM16 | ISP-SEM15 | ISP-SEM14 | ISP-SEM13 | ISP-SEM12 | ISP-SEM11 | ISP-SEM10 | ISP-SEM09 | ISP-SEM08 | ISP-SEM07 | ISP-SEM06 | ISP-SEM05 | ISP-SEM04 | ISP-SEM03 | ISP-SEM02 | ISP-SEM01.
- **Contenido por hoja:** identica estructura al libro SEM15 (PARTIDAS CONTROL = mismo catalogo; CR = costo de obra acumulado; Control = conciliacion planilla/campo/ISP; ISP-SEMxx = fotos acumuladas semanales con bloques de metrado/HH/IP por frente, dias y meta/VAR/CPI). La unica diferencia es la hoja adicional **ISP-SEM16** y la actualizacion de CR y Control con la semana 16.
  - **ISP-SEM16** (B1:BP1217): foto acumulada de la semana 16. Dos frentes PPTO OFERTA PTAR-F1 y NAVE-F2 + ADICIONALES + TOTAL + PPTO META. Dias con fechas reales (Mon Feb 16 2026...). Misma malla de columnas METRADO/HH/IP por dia y PRESENTE SEMANA + META/VAR/CPI acumulado.
- **Numeros clave:**
  - CR a corte 01.12.25 (actualizado): TOTAL COSTO DE OBRA = 9,733 HH / S/171,537.50 (acum S/IGV S/243,325); COSTO DIRECTO = 9,455 HH / S/164,587.50 (acum S/236,375); TRABAJOS PRELIMINARES = 2,573.25 HH / S/14,818.75; SSO 592.75 HH / S/14,818.75; TOPOGRAFIA 656.50 HH / S/16,412.50.
  - ISP-SEM16 fila resumen: HH acumulado real 9,733 vs META 7,668.95 HH -> VAR -2,064.05 HH, CPI 0.79; HH presente semana 1,100 vs meta 612.93 -> VAR -487.07, CPI 0.56.
  - ISP-SEM15 (dentro de este libro): acum 8,633 HH vs meta 7,066.88 -> VAR -1,566.12, CPI 0.82.
  - Hoja Control: HH planilla total 9,748.50 vs HH campo 9,733; deltas semanales planilla-vs-campo ~14 HH constantes.
- **Proposito:** mismo que SEM15 — control semanal de productividad de mano de obra, IP/CPI por partida y frente, y conciliacion HH planilla vs campo. Es la version vigente del tablero ISP (corte semana 16, ~mediados feb 2026 segun fechas diarias).
- **Origen -> Destino:** Origen = tareos de campo (HH/dia/partida) + metrados + presupuesto meta por frente (PTAR-F1, NAVE-F2) + adicionales. Destino = CR (costo acumulado S/25.50/HH) y Control (conciliacion); alimenta KPI de productividad y CPI del proyecto. Sustituye al libro SEM15.
- **Automatizacion:** identica al SEM15: HH diarias -> Modulo ISP / importador de tareos; PPTO META/PTAR-F1/NAVE-F2/ADICIONALES -> Presupuesto (BAC) + Adicionales/Deductivos; CPI/IP/VAR -> motor EVM del RO; PARTIDAS CONTROL -> Catalogo_WBS; hoja Control -> GAP Control Planilla. Tomar SEM16 como version canonica (no SEM15).

---

## Notas transversales del chunk
- Ambos archivos son **el mismo libro ISP en dos cortes** (SEM15 y SEM16); SEM16 es el superset. Para ingerir a GRAPCO basta procesar SEM16 (contiene SEM01..SEM16).
- Las hojas ISP arrastran un titulo "SEMANA N° 06 08/12/2025 14/12/2025" copiado/no actualizado; la semana real se identifica por las fechas diarias (col LUNES..DOMINGO) y por el nombre de hoja, no por ese rotulo.
- Muchas celdas IP/CPI muestran `#DIV/0!` cuando el metrado es 0 (partidas no ejecutadas esa semana) — no son datos, son errores de formula a ignorar en la ingesta.
- Costo MO promediado a S/25 en el encabezado de CR (la plataforma usa S/25.50/h como estandar oficial).
