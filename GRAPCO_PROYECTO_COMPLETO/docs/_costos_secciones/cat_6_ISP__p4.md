# Categoria 6 · ISP (cont. 4) — Fichas detalladas

Chunk: `cat_6_ISP__p4.txt`. Contiene 3 archivos, todos cortes semanales sucesivos del MISMO libro maestro de ISP (Informe Semanal de Produccion) de CREDITEX (PTARI F1 + NAVE F2). Cada archivo es una "foto" acumulada del libro al cierre de su semana, con la misma estructura de hojas y agregando una hoja `ISP-SEMnn` nueva por semana.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM22.xlsx
- **Tipo / formato:** xlsx — Informe Semanal de Produccion. Codigo formato: **PRO-GCR-FOR-F01**.
- **Hojas (26):** PC | CR | CHH | CIP | ISP-SEM22 ... ISP-SEM01 (22 hojas semanales + 4 de control).
- **Contenido por hoja:**
  - **PC (Partidas Control):** catalogo maestro de partidas de control con su CODIGO (ej. 1=TRABAJOS PRELIMINARES cod 1001; SSO, alquiler andamios GLB, mitigacion polvo MES, limpieza MES, etc.) y unidad. Es la lista de partidas que estructura todo el ISP. (~70 filas)
  - **CR (Control de Recursos / costo MO):** por FRENTE + PARTIDA + Descripcion: HH | COSTO | ACUM S/IGV, con "Costo MO prom: 25.50". Cabecera SEMANA N° 22 (30/03–05/04/2026). Resume costo de obra desde tareos. (~70 filas)
  - **CHH (Control HH Variaciones):** comparativo semana a semana de HH ADMINISTRACION (planilla) vs CAMPO (tareos): HH PLANILLA / HH CAMPO semanal y acum, DELTA HH ADM VS CAMPO, HH META ACUM, HH VARIACION, CPI, y desglose de delta por partida (PRE/PRO/CON/ACE/CUR/VAE/TAB/BIT/CONT/PRH/VAA/IIEE). (~30 filas, S1..S22)
  - **CIP (Control de IP):** por partida: IP Contractual | IP Meta | IP Actual Acum por semana (SEM21, SEM22, SEM23...) | DELTA | COMENTARIO (ej. "ACTUALIZAR APU REAL"). Compara ratio de produccion real vs meta/contractual. (~220 filas)
  - **ISP-SEMnn:** la matriz grande de produccion (rango hasta col BM). Por partida y por dia (Lun–Dom): METRADO | HH | IP; bloques PREVISION (PPTO OFERTA PTAR F1+F2, ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2)), ACUMULADO ANTERIOR (4), META/VAR/CPI, PRESENTE semana y FORECAST. Una hoja por semana. (~190 filas c/u)
- **Numeros clave (SEM22, 30/03–05/04/2026):**
  - Costo MO prom: S/ 25.50/HH.
  - CR · TOTAL COSTO DE OBRA: 15,856 HH | S/ 286,798.50 costo | S/ 404,328 acum c/IGV.
  - CR · COSTO DIRECTO: 15,416 HH | S/ 275,578.50.
  - ISP-SEM22 cabecera: CONTROL 17,355.61; PPTO CONTRACTUAL (1) 17,355.61 HH (oferta 15,135.64 + adicionales 2,219.97); PPTO META (2) 14,248.58 HH; DELTA(1)-(2)=3,107.03; HH acum 15,171.50; HH meta 11,441.60; VAR -3,730.41; **CPI 0.75**. Semana presente 684.50 HH; CPI semanal 0.22.
- **Proposito:** medir productividad (IP = HH/metrado) vs meta y presupuesto, controlar HH ganadas/perdidas (EVM en HH), CPI por partida y global, y conciliar HH planilla vs campo.
- **Origen -> Destino:** Origen = tareos diarios de campo (HH x partida x dia) + metrados de avance + PPTO oferta/meta/adicionales. Destino = CR (costo MO), CHH (variaciones HH), CIP (IP), y al RO/Resultado Operativo como pata de mano de obra.
- **Automatizacion:** Modulo **ISP** de GRAPCO (tareos HH x S/25.5) + **Resultado Operativo (RO/CR + EVM)** + **Curva S (F07)**. La hoja ISP-SEMnn alimenta el motor EVM (CPI, VAR HH, forecast); CIP alimenta indicadores IP del catalogo WBS; CHH es comparativa planilla-vs-campo (parte cae en GAP Control Planilla). Ingesta via importador generico in-app mapeando partida->WBS.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM23.xlsx
- **Tipo / formato:** xlsx — ISP, codigo **PRO-GCR-FOR-F01**. Es el mismo libro al cierre de SEM23 (agrega hoja ISP-SEM23).
- **Hojas (27):** PC | CR | CHH | CIP | ISP-SEM23 ... ISP-SEM01.
- **Contenido:** identica estructura que SEM22. CIP ya muestra columna SEM23; CR y cabeceras de ISP-SEM22 conservan datos previos (la cabecera de CR aun rotula "SEMANA N° 22", dato heredado, pero ISP-SEM23 rotula la semana 23 06/04–12/04/2026).
- **Numeros clave (SEM23, 06/04–12/04/2026):**
  - CR · TOTAL COSTO DE OBRA: 16,464 HH | S/ 295,341 | acum S/ 419,832.
  - CR · COSTO DIRECTO: 16,024 HH | S/ 284,121 | acum S/ 408,612.
  - ISP-SEM23: CONTROL 17,355.61; PPTO CONTRACTUAL (1) 17,355.61 (oferta 15,135.64 + adic 2,219.97); META (2) 14,248.58; HH acum 15,856 / 16,464; HH meta 11,654.35; VAR -4,201.66; **CPI 0.74**. Semana presente 608 HH; CPI semanal 0.33. DELTA(1)-(3)=1,499.61.
  - CIP SEÑALIZACION TEMP SEGURIDAD IP: contractual 96 / meta 90 / actual SEM23 156.56 (sobre-consumo, "ACTUALIZAR APU REAL").
- **Proposito:** mismo control de productividad/EVM en HH, actualizado a SEM23. Permite ver tendencia del CPI global (0.75 -> 0.74) y consumo acumulado de HH.
- **Origen -> Destino:** igual a SEM22.
- **Automatizacion:** igual a SEM22 (ISP + RO/EVM + Curva S). Al cargar la cadena de cortes, GRAPCO debe quedarse con la version mas reciente por semana (este libro reemplaza/extiende al de SEM22).

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM24.xlsx
- **Tipo / formato:** xlsx — ISP, codigo **PRO-GCR-FOR-F01**. Mismo libro al cierre de SEM24 (agrega ISP-SEM24); es el corte mas reciente del chunk.
- **Hojas (28):** PC | CR | CHH | CIP | ISP-SEM24 ... ISP-SEM01.
- **Contenido / cambios vs cortes previos:**
  - **CR:** cabecera SEMANA N° 24 (13/04–19/04/2026), costo MO 25.50.
  - **CHH:** ahora hasta col AP; agrega notas de rendimiento por fila (ej. "100m2 | encofrado | 60hr").
  - **CIP:** hasta col N; agrega columnas SEM24 y SEM25 (SEM25 = #REF!, formula rota por extender el rango).
  - **ISP-SEM24:** ya separa la oferta en PPTO OFERTA PTAR (F1) y PPTO OFERTA NAVE (F2) como bloques distintos (antes "F1+F2"), mas ADICIONALES y PPTO CONTRACTUAL (1); incluye banda "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO", y "FORECAST - META". Rango hasta col CG (mas ancha que cortes previos).
- **Numeros clave (SEM24, 13/04–19/04/2026):**
  - CR · TOTAL COSTO DE OBRA: 17,059 HH | S/ 301,537.50 | acum S/ 435,004.50.
  - CR · COSTO DIRECTO: 16,619 HH | S/ 290,317.50 | acum S/ 423,784.50.
  - ISP-SEM24: CONTROL 18,136.93; PPTO CONTRACTUAL (1) 20,424.22 HH (oferta PTAR F1 14,943.66 + NAVE F2 798.34 + adicionales 2,394.92); PPTO META (2) 15,545.56; HH acum 16,464; HH meta 11,930.36; VAR -4,533.65; **CPI 0.72**. Semana presente 595 HH; CPI semanal 0.24. DELTA(1)-(2)=4,878.66; DELTA(1)-(3)=3,960.22; FORECAST META control -1,513.44.
- **Proposito:** corte mas completo del control de productividad/EVM (HH ganadas vs perdidas, CPI por partida y global, forecast de HH al cierre). Confirma tendencia: CPI global cae 0.75 (S22) -> 0.74 (S23) -> 0.72 (S24); sobre-consumo de HH acumulado ~ -4,500 HH vs meta.
- **Origen -> Destino:** tareos de campo + metrados + PPTO (oferta F1/F2 + adicionales + meta). Alimenta CR, CHH, CIP y el RO (pata MO) y la Curva S.
- **Automatizacion:** Modulo **ISP** (HH x 25.5) + **RO/CR + EVM** + **Curva S (F07)**; el split F1(PTAR)/F2(NAVE) mapea a frentes pendientes mencionados en memoria. Recomendado: ingerir SOLO este corte (SEM24) como ultimo estado y derivar la historia desde sus hojas ISP-SEMnn, evitando duplicar con SEM22/SEM23. GAPs: la comparativa HH planilla vs campo (CHH) requiere Control Planilla (GAP) para cerrar la conciliacion.

---

#### Nota de consolidacion
Los 3 archivos son cortes acumulados del mismo libro PRO-GCR-FOR-F01. Para GRAPCO basta el ultimo (SEM24); SEM22 y SEM23 sirven solo como historico/auditoria. El ISP es la fuente primaria de HH/IP/CPI para el RO; el split F1/F2 aparece formalizado recien en SEM24.
