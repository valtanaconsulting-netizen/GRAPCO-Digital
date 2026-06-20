# CATALOGO COSTOS — Categoria 6. ISP (Informe Semanal de Produccion) — chunk cat_6_ISP__p1

Formato corporativo: **PRO-GCR-FOR-F01** (ISP / Control de Rendimientos). Proyecto CREDITEX (PTARI+NAVE).
Todos los archivos son la **misma cadena evolutiva** del ISP semana a semana (snapshots acumulados): cada libro nuevo agrega una hoja `ISP-SEMnn` y conserva las anteriores. Es decir, el archivo de la semana mas alta contiene toda la historia.

Estructura comun de cada libro:
- **PARTIDAS CONTROL**: maestro/catalogo de partidas de control con CODIGO (1001, ...) y UND (GLB, MES, M2, etc.). Es la lista WBS de control de rendimientos (≈70 filas). Bloques: TRABAJOS PRELIMINARES (1001), SEGURIDAD Y SALUD, etc.
- **CR** (Control de Rendimientos / Costo Real): resumen de costo de obra a partir de tareos. Costo MO prom = **S/25** (no 25.5 en estos libros). Columnas: FRENTE | PARTIDA (FA01...) | codigo (1.01...) | Descripcion | HH | COSTO | ACUM S/ IGV. Filas TOTAL COSTO DE OBRA / COSTO DIRECTO + desglose por partida.
- **ISP-SEMnn** (una por semana): matriz ancha (B1:BM~1100). Por cada partida de control: PREVISION (PPTO OFERTA/PPTO1, ADICIONALES, TOTAL(0), PPTO META) con METRADO/HH/IP; ACUMULADO ANTERIOR; META/VAR/CPI; luego dia por dia (LUNES..DOMINGO) con METRADO/HH/REND(IP); cierre PRESENTE SEMANA + META/VAR/CPI. Indicador clave = **IP (Indice de Productividad / rendimiento) y CPI**. Encabezado "INFORME SEMANAL DE PRODUCCION".

> Nota: muchas celdas de las hojas ISP muestran `#DIV/0!` y `#REF!` (formulas sin datos / referencias rotas) en las filas de totales — son errores del Excel original, no datos.

---

### \05. Gestion Costos\6. ISP\1. Superado\10-12-2025\PRO-GCR-FOR-F01_ISP CREDITEX SEM04.xlsx
- Tipo / formato: xlsx — **PRO-GCR-FOR-F01** (ISP). Subcarpeta fechada 10-12-2025 (version de corte). 1072 KB.
- Hojas (6): PARTIDAS CONTROL | CR | ISP-SEM01 | ISP-SEM02 | ISP-SEM03 | ISP-SEM04
- Contenido:
  - PARTIDAS CONTROL: maestro WBS (~70 partidas), CODIGO 1001 TRABAJOS PRELIMINARES, UND.
  - CR: Costo MO prom S/25; TOTAL COSTO DE OBRA y COSTO DIRECTO = **221.50 HH / S/5 537.50** (acum al 01.12.25). Desglose: TRABAJOS PRELIMINARES 7 HH / S/175.
  - ISP-SEM01..04: semanas 03/11–30/11/2025. SEM01 base 879.52 (metrado/HH meta acumulada parcial); registros diarios METRADO/HH/REND por partida.
- Numeros clave: 221.50 HH; S/5 537.50 costo directo/obra; meta acum ISP referencia 27309 / 40711.88 (HH meta presupuesto).
- Proposito: control semanal de produccion y rendimiento (IP/CPI) vs presupuesto meta; base del Resultado Operativo de mano de obra.
- Origen -> Destino: tareos de campo (HH por partida/dia) + metrados -> CR (costo) e ISP (IP/CPI) -> insumo del RO/Curva S de avance fisico.
- Automatizacion: hojas ISP = fuente del **modulo ISP (tareos HH x S/25.5) + EVM** de GRAPCO; CR = alimenta **Resultado Operativo (CR/F06)**. PARTIDAS CONTROL = catalogo WBS. Importable via importador generico mapeando partida-codigo. (version fechada = duplicado historico de SEM04).

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM04.xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 1079 KB.
- Hojas (6): PARTIDAS CONTROL | CR | ISP-SEM01..SEM04
- Contenido: identico al anterior pero **CR en cero** (TOTAL COSTO DE OBRA = 0 HH / S/0 / S/0) — es la version sin costos cargados aun (ISP con metrados/HH diarios poblados pero CR no recalculado). ISP-SEM01 muestra PRESENTE SEMANA 239 HH, IP/CPI 0.51.
- Numeros clave: CR = 0; meta presupuesto HH 40711.88; SEM01 presente semana 239 HH, CPI 0.51.
- Proposito: ISP de produccion semanas 1–4; CR pendiente de costeo.
- Origen -> Destino: igual que arriba (tareos+metrados -> ISP/CR -> RO).
- Automatizacion: usar la version con CR poblado para el RO; esta sirve solo para metrados/HH del ISP.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM05.xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 1297 KB.
- Hojas (7): PARTIDAS CONTROL | CR | ISP-SEM01..SEM05
- Contenido: agrega ISP-SEM05 (01/12–07/12/2025). CR poblado: TOTAL COSTO DE OBRA **432.50 HH / S/25 775 / acum S/25 975**; COSTO DIRECTO 378.50 HH / S/24 425 / S/24 625. TRABAJOS PRELIMINARES 14 HH / S/350; TOPOGRAFIA 8 HH / S/200.
- Numeros clave: 432.50 HH; S/25 775 costo; S/25 975 acum; CD 378.50 HH / S/24 425.
- Proposito: control acumulado a SEM05 (costo real MO + IP/CPI por partida).
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM y Curva S.
- Automatizacion: CR -> Resultado Operativo; ISP-SEM05 -> modulo ISP/EVM (CPI por partida).

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM06.xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 1505 KB.
- Hojas (8): PARTIDAS CONTROL | CR | ISP-SEM06..SEM01 (orden descendente)
- Contenido: agrega ISP-SEM06 (08/12–14/12/2025). CR: TOTAL COSTO DE OBRA **565 HH / S/30 375 / acum S/30 725**; COSTO DIRECTO 498.50 HH / S/28 712.50 / S/29 062.50. SEM06 presente semana 265 HH; SEM05 acum ISP 1427.50 HH meta vs CPI ~5.39 (errores de formula presentes).
- Numeros clave: 565 HH; S/30 375; acum S/30 725; CD 498.50 HH / S/28 712.50.
- Proposito: ISP/CR acumulado a SEM06.
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM/Curva S.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM07.xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 1722 KB.
- Hojas (9): PARTIDAS CONTROL | CR | ISP-SEM07..SEM01
- Contenido: agrega ISP-SEM07. CR: TOTAL COSTO DE OBRA **610 HH / S/33 075 / acum S/34 675**; COSTO DIRECTO 522 HH / S/30 875 / S/32 475.
- Numeros clave: 610 HH; S/33 075; acum S/34 675; CD 522 HH / S/30 875.
- Proposito: ISP/CR acumulado a SEM07.
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM/Curva S.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM08.xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 1949 KB.
- Hojas (10): PARTIDAS CONTROL | CR | ISP-SEM08..SEM01
- Contenido: agrega ISP-SEM08. CR: TOTAL COSTO DE OBRA **1725 HH / S/43 125 / acum S/43 125**; COSTO DIRECTO 1621 HH / S/40 525 / S/40 525. (Salto grande de HH respecto a SEM07: pico de mano de obra.)
- Numeros clave: 1725 HH; S/43 125; CD 1621 HH / S/40 525.
- Proposito: ISP/CR acumulado a SEM08.
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM/Curva S.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM12 .xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 2880 KB.
- Hojas (15): PARTIDAS CONTROL | CR | **Control** | ISP-SEM12..SEM01
- Contenido:
  - Aparece hoja nueva **Control** (B3:M27): conciliacion HH ADMINISTRACION (planilla) vs CAMPO (ISP). Columnas: SEMANA | HH PLANILLA | HH PLANILLA ACUM | HH CAMPO semanal | HH CAMPO ACUM | CONTROL HH CAMPO ACUM (isp) | DELTA HH ACUM | HH PLANILLA ACUM | HH CAMPO ACUM | DELTA HH ADM VS CAMPO. Ej: SEM1 238/239 (delta -1); SEM7 acum planilla 1961 vs campo 1946.50 (delta 14.50). Total HH planilla referencia 5624; campo 5608.50.
  - CR: TOTAL COSTO DE OBRA **5608.37 HH / S/92 375 / acum S/140 209.24**; COSTO DIRECTO 5439.37 HH / S/88 150 / S/135 984.24. TRABAJOS PRELIMINARES 1507.12 HH / S/8 743.75 / S/37 677.99; SS.OO 349.75 HH; TOPOGRAFIA 349 HH.
  - Salta de SEM08 a SEM12 (hoja SEM12 fechada con dias Jan 19–22 2026; las semanas 9–11 incluidas como hojas).
- Numeros clave: **5608.37 HH; S/92 375; acum S/140 209.24**; CD S/88 150 / S/135 984.24; HH planilla 5624 vs campo 5608.50.
- Proposito: control acumulado a SEM12 + conciliacion HH planilla vs campo (delta administrativo).
- Origen -> Destino: tareos campo + planilla RR.HH. -> hoja Control (delta) y CR (costo) -> RO/EVM. La conciliacion planilla-vs-campo es insumo de control de planilla.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM; **hoja Control = GAP (Control de Planilla / conciliacion HH administracion vs campo, no existe en GRAPCO)**.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM13 .xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 3121 KB.
- Hojas (16): PARTIDAS CONTROL | CR | Control | ISP-SEM13..SEM01
- Contenido: agrega ISP-SEM13. CR: TOTAL COSTO DE OBRA **6477.50 HH / S/108 700 / acum S/161 937.50**; COSTO DIRECTO 6282.50 HH / S/103 825 / S/157 062.50. Mantiene hoja Control (planilla vs campo).
- Numeros clave: **6477.50 HH; S/108 700; acum S/161 937.50**; CD S/103 825 / S/157 062.50.
- Proposito: ISP/CR + conciliacion acumulado a SEM13.
- Origen -> Destino: tareos+metrados+planilla -> CR/ISP/Control -> RO/EVM.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM; Control -> GAP Control de Planilla.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM14 .xlsx
- Tipo / formato: xlsx — PRO-GCR-FOR-F01 (ISP). 3405 KB. Libro mas reciente del chunk (historia completa S1–S14).
- Hojas (17): PARTIDAS CONTROL | CR | Control | ISP-SEM14..SEM01
- Contenido: agrega ISP-SEM14. CR identico a SEM13: TOTAL COSTO DE OBRA **6477.50 HH / S/108 700 / acum S/161 937.50**; CD 6282.50 HH / S/103 825 / S/157 062.50 (CR aun no recalculado para SEM14, repite SEM13). Algunas filas ISP muestran cierres negativos (-1008.51, -1000.23) = variaciones/errores de formula.
- Numeros clave: 6477.50 HH; acum S/161 937.50 (= valores de SEM13).
- Proposito: snapshot consolidado a SEM14 (contiene todo el historial semanal).
- Origen -> Destino: tareos+metrados+planilla -> CR/ISP/Control -> RO/EVM/Curva S.
- Automatizacion: **este libro es el recomendado para ingesta** (14 semanas en uno). CR -> RO; ISP-SEMnn -> modulo ISP/EVM (CPI por partida y semana); PARTIDAS CONTROL -> catalogo WBS; Control -> GAP Control de Planilla.

---

## Resumen del chunk
- 9 archivos, todos PRO-GCR-FOR-F01 (cadena ISP semanal acumulativa SEM04→SEM14 de CREDITEX). El de SEM14 es superconjunto.
- Indicadores clave: IP/CPI por partida y semana; HH y costo MO @ S/25; conciliacion HH planilla vs campo.
- Mapeo GRAPCO: ISP -> modulo ISP (tareos HH x S/25.5) + EVM; CR -> Resultado Operativo (CR/F06); PARTIDAS CONTROL -> catalogo WBS; Curva S desde avance.
- GAP detectado: hoja **Control** (Control de Planilla / conciliacion HH administracion vs campo) no tiene destino en GRAPCO.
