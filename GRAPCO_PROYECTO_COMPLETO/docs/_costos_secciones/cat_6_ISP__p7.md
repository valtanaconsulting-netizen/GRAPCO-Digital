# Catálogo Costos — Sección 6. ISP (cont. 7) — cat_6_ISP__p7

Chunk con 2 archivos, ambos el **Informe Semanal de Producción (ISP)** del proyecto CREDITEX (PTARI F1 + NAVE F2), formato **PRO-GCR-FOR-F01**. Son libros "acumulativos vivos": cada nuevo libro = el anterior + una pestaña semanal nueva. SEM30 es el más reciente (corte semana 30) y contiene todo lo de SEM29.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM29.xlsx

- **Tipo / formato:** Excel (.xlsx), 7886 KB. Código de formato: **PRO-GCR-FOR-F01** (ISP — Informe Semanal de Producción / Control de Resultado CR).
- **Hojas (33):** PC | CR | CHH | CIP | ISP-SEM29 ... ISP-SEM01 (4 hojas de control + 29 hojas semanales ISP-SEMxx, de la semana 29 hacia atrás hasta la 01).
- **Contenido por hoja relevante (a detalle):**
  - **PC (Partidas Control)** — rango B1:L992. Maestro/catálogo de partidas de control con su CÓDIGO (ej. 1001) y unidad (GLB, MES, m2...). Jerarquía: 1 TRABAJOS PRELIMINARES → SEGURIDAD Y SALUD OCUPACIONAL → Alquiler de andamios, Señalización temporal, Iluminación de accesos, Mitigación de polvo, Limpieza general, etc. Es la lista madre de partidas que estructura todas las demás hojas (~80 filas).
  - **CR (Control de Resultado)** — rango B1:J1019. Costo MO prom = **S/ 25.50**. Cabecera por semana (la del volcado muestra SEMANA N° 24, 13/04–19/04/2026). Columnas: FRENTE (PRE1, PRE2...), PARTIDA (FA01...), código partida (1.01, 1.02), Descripción, REPORTE TAREOS = **HH | COSTO | ACUM S/ IGV**, COMENTARIOS (ING. DE PRODUCCIÓN), arranque 01.12.25. Filas resumen: TOTAL COSTO DE OBRA = 17,059 HH / S/ 301,537.50 (acum S/ 435,004.50); COSTO DIRECTO = 16,619 HH / S/ 290,317.50 (acum S/ 423,784.50). Por partida: 1 Trabajos Preliminares 3,940.25 HH / S/ 18,570.38; 1.01 SSO (PRE1/FA01) 728.25 HH; 1.02 Topografía (PRE2/FA01) 1,058 HH / S/ 26,979 (~62 filas).
  - **CHH (Control HH Variaciones)** — rango B2:AP45. Tabla semana a semana (SEMANA 1..N) comparando 3 universos de HH: ADMINISTRACIÓN (HH planilla y acum), CAMPO (HH campo semanal/acum + control + DELTA HH acum), COMPARATIVO (planilla acum vs campo acum, DELTA ADM vs CAMPO), ACTUAL (HH campo acum vs HH META acum, HH variación, **CPI**). Encabezados de control: HH planilla 16,479.50 vs HH campo 16,464 (delta 16). Luego columnas de descomposición de la variación por causa: PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE (atribución de pérdida de HH). Ej. Sem1 CPI 0.46; Sem5 CPI 0.73; Sem6 CPI 0.75 (~30 filas semanales).
  - **CIP (Control de IP)** — rango B2:N230. Por partida: **IP Contractual | IP Meta | IP Actual Acum por semana (SEM21..SEM25...) | DELTA | COMENTARIO**. Ej. Señalización temporal IP contractual 96 / meta 90 / actual ~147–179 → delta -82.93 "ACTUALIZAR APU REAL"; Iluminación 16/12 actual 7.65–11.26; Armado/desarmado andamios 136.85/130 actual 82.50. Es el seguimiento del Índice de Productividad real vs meta/contractual (~218 filas).
  - **ISP-SEMxx (29 hojas semanales)** — rango ~B1:CG1159 (las recientes) / B1:BM-BP (las antiguas, menos columnas). Cada hoja es el ISP de esa semana con esta matriz por partida de control:
    - PREVISIÓN por origen de presupuesto: **PPTO OFERTA PTAR (F1)**, **PPTO OFERTA NAVE (F2)**, **ADICIONALES**, **PPTO CONTRACTUAL (1)** = suma, **PPTO META (2)** — cada uno con METRADO | HH | IP.
    - **ACUMULADO ANTERIOR (4)** (METRADO/HH/IP) + columnas META, VAR, **CPI** (=2/1).
    - Detalle diario LUNES..DOMINGO (cada día con METRADO | HH | IP y fecha real, ej. "Mon May 18 2026"), bloque **PRESENTE SEMANA** (METRADO/HH/IP) y comparación contra META (VAR).
    - Dos bloques de análisis: "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (CONTROL, DELTA (1)-(2), DELTA (1)-(3), FORECAST-META).
    - Filas = todas las partidas del catálogo PC (Trabajos Preliminares → SSO → andamios, etc.), ~181–237 filas por hoja.
- **Números clave (de este volcado):**
  - Costo MO promedio único: **S/ 25.50/HH**.
  - CR / corte Sem 24: TOTAL COSTO DE OBRA **17,059 HH** / S/ 301,537.50 sem, **S/ 435,004.50** acum IGV; COSTO DIRECTO 16,619 HH / S/ 423,784.50 acum.
  - ISP-SEM29: PPTO CONTRACTUAL HH = **22,728.79** (PTAR/F1 17,160.53 + NAVE/F2 798.34 + Adicionales 2,453.01); PPTO META HH = **17,577.26**; Acumulado actual **18,516.01 HH**; META acum 15,318.29; **VAR -3,075.73 HH**; **CPI 0.83**. HH presente semana 147.
  - HH planilla total 16,479.50 vs HH campo 16,464 (delta +16 HH a favor de campo).
- **Propósito:** documento rector de control de producción/HH del proyecto: mide HH ganadas vs presupuesto contractual y meta, calcula IP y CPI por partida, valoriza la MO a S/25.5 y atribuye pérdidas de HH a causas raíz. Es la base del Resultado Operativo de la pata de Mano de Obra.
- **Origen → Destino:** Origen = tareos diarios de campo (reporte HH por partida/día, ING. de Producción) + metrados ejecutados + presupuesto oferta (PTAR F1 + NAVE F2) + adicionales + APU para IP meta/contractual. Destino = alimenta CR (costo MO), CHH/CIP (variaciones e IP) y el informe semanal a gerencia/cliente; es insumo directo del RO/EVM.
- **Automatización (GRAPCO):** Núcleo del módulo **ISP** (tareos HH × S/25.5) + **Curva S / EVM** y la pata MO del **Resultado Operativo (RO/CR/F06)**. Ingesta: HH diarias por partida → fuente única `Registros_Campo` (tareos); presupuesto/metas (PTAR F1, NAVE F2, adicionales, IP meta/contractual) → catálogo WBS / módulo Presupuesto (BAC); CPI/IP/VAR se recalculan en la plataforma, no se importan. Importador genérico in-app puede cargar las pestañas ISP-SEMxx como histórico. GAP parcial: el desglose de variación por causa (PRE/PRO/CON/ACE/CUR/VAE/TAB/BIT/CONT/PRH/VAA/IIEE) de la hoja CHH no tiene equivalente actual.

---

### \05. Gestión Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM30.xlsx

- **Tipo / formato:** Excel (.xlsx), 8226 KB. Código de formato: **PRO-GCR-FOR-F01** (ISP). Versión de corte más reciente.
- **Hojas (34):** PC | CR | CHH | CIP | **ISP-SEM30** | ISP-SEM29 ... ISP-SEM01 (mismas 4 hojas de control + 30 hojas semanales; añade ISP-SEM30 respecto al libro anterior).
- **Contenido por hoja relevante:** estructura idéntica al SEM29 (mismas hojas PC, CR, CHH, CIP y la matriz ISP por semana). Diferencias por ser corte posterior:
  - **CR** — cabecera de cálculo Sem 24 visible; valores actualizados: TOTAL COSTO DE OBRA **18,807.01 HH** / S/ 332,099.51 sem / **S/ 479,578.76** acum IGV; COSTO DIRECTO **18,099.01 HH** / S/ 314,045.51 / S/ 461,524.76 acum. Trabajos Preliminares 4,391.75 HH / S/ 22,867.13; 1.01 SSO 896.75 HH / S/ 22,867.13; 1.02 Topografía 1,071 HH / S/ 27,310.50.
  - **CHH y CIP** — misma estructura que SEM29 (control HH variaciones por causa y control de IP por partida con IP contractual/meta/actual por semana y delta).
  - **ISP-SEM30 (nueva)** — rango B1:CG1159, semana visible de cálculo SEM 28 (11–17/05/2026) con días Mon May 25..2026. PPTO CONTRACTUAL HH 22,728.79 (F1 17,160.53 + F2 798.34 + Adic 2,453.01); PPTO META 17,577.26; Acumulado **18,663.01 HH**; META acum 15,318.29; **VAR -3,075.73**; **CPI 0.82**; HH presente 144. Filas = catálogo PC completo (~181 filas).
  - **ISP-SEM29..SEM01** — históricos heredados idénticos al libro SEM29.
- **Números clave (de este volcado):**
  - CR acumulado: TOTAL COSTO DE OBRA **18,807.01 HH** / **S/ 479,578.76** acum IGV; COSTO DIRECTO 18,099.01 HH / **S/ 461,524.76** acum.
  - ISP-SEM30: Acumulado **18,663.01 HH** vs META 15,318.29 → VAR **-3,075.73 HH**, **CPI 0.82** (sobreconsumo de HH ~20% vs meta).
  - Costo MO: **S/ 25.50/HH** (constante).
  - Forecast - Meta (análisis respecto al ppto) ~ 5,939.83 HH.
- **Propósito:** versión vigente del ISP/CR del proyecto al corte semana 30; mismo rol de control que el SEM29 pero con la data más actual (es el archivo a usar como fuente).
- **Origen → Destino:** igual que SEM29 (tareos de campo + metrados + presupuesto F1/F2 + adicionales + APU). Destino = informe semanal y Resultado Operativo. Reemplaza al SEM29 como corte vigente.
- **Automatización (GRAPCO):** mismo destino que SEM29 → módulo **ISP** + **Curva S/EVM** + pata MO del **RO**. Por ser acumulativo, basta ingerir SOLO el libro más reciente (SEM30) para tener todo el histórico de semanas; cargar HH por partida/semana a `Registros_Campo` y dejar que la plataforma recalcule IP/CPI/VAR contra el presupuesto WBS. GAP igual: análisis de variación por causa de CHH.

---

## Notas de consolidación del chunk
- Los 2 archivos son **el mismo documento en dos cortes** (SEM29 y SEM30). Para la migración usar únicamente **SEM30** (es superset). Esto evita duplicar el histórico de 30 semanas.
- Toda la valorización usa **S/ 25.50/HH** (coherente con `COSTO_HORA_PROMEDIO`).
- Las tres lentes de control están separadas: **CR** (costo S/), **CHH** (variación de HH por causa), **CIP** (índice de productividad), todas colgando del catálogo **PC**.
