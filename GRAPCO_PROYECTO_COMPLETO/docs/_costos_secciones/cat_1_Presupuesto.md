# Categoria 1 — Presupuesto (CREDITEX: PTARI + NAVE)

Fichas detalladas por archivo del chunk `cat_1_Presupuesto.txt`. Solo se documenta lo visible en el volcado de Excel.

---

### \05. Gestión Costos\1. Presupuesto\1. PTARI (S)\1. Superado\PPTTO GRAPCO Rev 2  30.06.xlsx
- **Tipo / formato:** xlsx (817 KB). Formato GRAPCO de presupuesto `GP-GCE-FOR-F01` (hojas de PPTO/partidas/APU) + `PRO-GCE-FOR-F03` (GG y Recursos). Marcado en carpeta "1. Superado" = version PREVIA/no vigente del presupuesto PTARI.
- **Hojas (12):** Carátula | PPTO | PRE | PRO | MOV | EST | ARQ | GG | APU | Hoja 8 | Recursos | Metrados
- **Contenido por hoja:**
  - **Carátula:** portada "PTAR CREDITEX", denominacion "PPTO PTAR CREDITEX", REVISION N°01, fecha 24-Jun-2025.
  - **PPTO** (GP-GCE-FOR-F01, pag 1 de 10): Resumen del presupuesto. Cabecera con OBRA "PTAR CREDITEX", CONTRATISTA GRAPCO SAC, SUPERVISION NA, PLAZO 4.50 meses. Tabla con columnas ITEM | DESCRIPCION | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.). (+15 filas).
  - **PRE** (pag 2): Presupuesto Trabajos Preliminares; misma estructura de columnas con SUBTOTAL/TOTAL. (+21 filas).
  - **PRO** (pag 3): Presupuesto Obras Provisionales. (+24 filas).
  - **MOV** (pag 4): Presupuesto Movimiento de Tierras. (+15 filas).
  - **EST** (pag 5): Presupuesto Estructuras (la mas extensa de las especialidades, +49 filas).
  - **ARQ** (pag 6): Presupuesto Arquitectura. (+13 filas).
  - **GG** (PRO-GCE-FOR-F03 v1, pag 8): "4.- ANALISIS DE GASTOS GENERALES", con seccion A. CARACTERISTICAS. (+132 filas) — desglose de gastos generales.
  - **APU** (GP-GCE-FOR-F01, pag 9): Analisis de Precios Unitarios. Columnas ITEM | DESCRIPCION | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.) | SUB TOTAL (S/.). Muy extensa (+1858 filas) = banco completo de APUs.
  - **Hoja 8:** cronograma valorizado / flujo de egresos por semana (Sem 1..Sem 24, en 7 meses). Filas: VIENEN, EGRESOS, Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori... En esta version los egresos figuran en 0 (plantilla sin llenar). (+15 filas).
  - **Recursos** (PRO-GCE-FOR-F03 v0, pag 10): listado de recursos. T.C. = 3.80. Columnas CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS (leyenda REALIZADO/EN PROCESO/PENDIENTE). Empieza 1.01 MANO DE OBRA. (+344 filas) = insumos de MO, materiales, equipos con precios SOL/USD.
  - **Metrados:** memoria de metrados manual (demolicion losa, calzaduras de cimientos, anillos con Long/altura/Prof -> m3/m2). Ej. Oxidacion 20x12=240 m2; subtotal 405.20 m2. (+52 filas).
- **Numeros clave:** PLAZO 4.50 meses; T.C. 3.80; metrado demolicion 405.20 m2. (Los totales en soles no aparecen explicitos en el volcado de esta version superada).
- **Proposito:** Presupuesto meta (BAC) original PTARI por especialidades, con su APU, GG, recursos y metrados. Es la linea base de costos.
- **Origen -> Destino:** Sale del area de costos GRAPCO (estimacion) -> alimenta la version Contractual y el Resultado Operativo.
- **Automatizacion:** Importar PPTO + hojas de especialidad al modulo **Presupuesto (BAC)**; APU al banco APU (hoy migrado a plataforma de Costos aparte); Recursos al catalogo de insumos; Hoja 8 a **Curva S (F07)**. Por ser version "Superado", NO se ingiere como vigente: solo referencia/historico. Usar **importador generico in-app**.

---

### \05. Gestión Costos\1. Presupuesto\1. PTARI (S)\2. Contractual\PPTTO GRAPCO Rev 30.06 vr Modif x Creditex 17.07.25.xlsx
- **Tipo / formato:** xlsx (835 KB). Mismo formato `GP-GCE-FOR-F01` / `PRO-GCE-FOR-F03`. Carpeta "2. Contractual" = version VIGENTE pactada con CREDITEX (modificada 17.07.25). Es el presupuesto base oficial PTARI (Frente F1).
- **Hojas (13):** Carátula | **RO** | PPTO | PRE | PRO | MOV | EST | ARQ | GG | APU | Hoja 8 | Recursos | Metrados (agrega hoja RO respecto a la version superada).
- **Contenido por hoja:**
  - **Carátula:** "PTAR CREDITEX", REVISION N°01.
  - **RO** (la clave nueva): mapa Presupuesto -> Resultado Operativo. Columnas FRENTE | PARTIDA | Descripción | Ppto F1 (PTARI, S/.). Filas con TOTAL COSTO DE OBRA y COSTO DIRECTO, y desglose por partida con codigo de frente (PRE1/PRE2...) + codigo FA01 + item (1.01, 1.02). Ej.: PRE TRABAJOS PRELIMINARES 182,704.14; PRE1/1.01 SEGURIDAD Y SALUD OCUPACIONAL 51,152.49; PRE2/1.02 TOPOGRAFIA 41,113.36. (+62 filas).
  - **PPTO..ARQ, GG, APU, Hoja 8, Recursos, Metrados:** idem estructura que la version superada (PPTO pag1, PRE +21, PRO +24, MOV +15, EST +49, ARQ +13, GG +131, APU +1859, Recursos +344 con T.C. 3.80, Metrados +52). APU es el banco completo de precios unitarios.
- **Numeros clave (PTARI / F1):**
  - **TOTAL COSTO DE OBRA = S/ 2,308,484.50**
  - **COSTO DIRECTO = S/ 1,825,339.08**
  - Trabajos Preliminares (partida 1001) = S/ 182,704.14
  - Seguridad y Salud Ocupacional = S/ 51,152.49; Topografia = S/ 41,113.36
  - PLAZO 4.50 meses; T.C. 3.80.
- **Proposito:** Presupuesto **contractual** (BAC oficial) del Frente 1 / PTARI. La hoja RO es la fuente directa del costo meta por partida que consume el Resultado Operativo.
- **Origen -> Destino:** Estimacion GRAPCO + negociacion CREDITEX -> alimenta el modulo RO/CR/F06 (meta vs real), Valorizaciones y Curva S.
- **Automatizacion:** **Importar la hoja RO** al modulo **Resultado Operativo (RO/CR/F06)** como costo meta por partida/frente F1 (mapeo FRENTE+PARTIDA = WBS). PPTO/especialidades al modulo **Presupuesto (BAC)**; APU al banco APU; Recursos al catalogo de insumos; Hoja 8 a **Curva S (F07)**. Importador generico in-app, marcando esta como version contractual vigente.

---

### \05. Gestión Costos\1. Presupuesto\2. NAVE (S)\Document_260323_153628.pdf
- **Tipo / formato:** PDF (870 KB) [no-Excel]. Nombre de escaneo generico (Document_260323 = 23-03-26).
- **Contenido:** no volcado (no-Excel). Por contexto = documento escaneado asociado al presupuesto NAVE (probable presupuesto firmado / acta / oferta escaneada de la misma fecha que el xlsx NAVE Rev.03).
- **Proposito:** respaldo documental del presupuesto de la NAVE (firma/aprobacion).
- **Origen -> Destino:** emitido/recibido en la negociacion NAVE -> respaldo del BAC NAVE.
- **Automatizacion:** adjuntar como documento de respaldo al presupuesto NAVE (gestor documental / adjunto en modulo Presupuesto). No es fuente de datos estructurada. **GAP** si se requiere extraer cifras del PDF.

---

### \05. Gestión Costos\1. Presupuesto\2. NAVE (S)\PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx
- **Tipo / formato:** xlsx (2450 KB). Formato `GP-GCE-FOR-F01` / `PRO-GCE-FOR-F03`. Presupuesto **NAVE** (Frente F2 — estructura metalica y losa), Rev.03 al 23-Mar-2026. Version mas completa: incluye Esquema, Sectorizacion, RO y Pull Planning.
- **Hojas (15):** Carátula | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 10. Esquema | 11. Sectorizacion | 12. RO | 9. Pull
- **Contenido por hoja:**
  - **Carátula:** "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; "PPTO ESTRUCTURA METALICA Y LOSA"; PRESUPUESTO N°02; fecha 19-Mar-2026.
  - **PPTO** (pag1): Resumen. OBRA "PTAR PLANTA 5", CLIENTE CREDITEX, SUPERVISION DISEÑOS RACIONALES, REVISION N°02. PLAZO F2 = 2.50 meses; TRASLAPE C/ F1 = 0.30 meses. Tabla ITEM/DESCRIPCION/UND/CANT/P.U./PARCIAL/TOTAL (+48 filas).
  - **1. PRE** (pag2): Trabajos Preliminares (+18 filas).
  - **2. PRO** (pag3): Obras Provisionales (+23 filas).
  - **3. MOV** (pag4): Movimiento de Tierras (+17 filas).
  - **4. EST** (pag5): Estructuras — la mas grande (+101 filas; estructura metalica).
  - **5. ARQ** (pag6): Arquitectura (+39 filas).
  - **6. IISS** (pag7): Instalaciones Sanitarias (+18 filas) — especialidad nueva respecto a PTARI.
  - **7. APU** (pag9): Analisis de Precios Unitarios, columnas ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL. Banco enorme (+2477 filas).
  - **Hoja 8:** cronograma valorizado / egresos por semana (Sem 1..24); egresos en 0 en el volcado. (+15 filas).
  - **8. Recursos** (PRO-GCE-FOR-F03, pag10): recursos con T.C. 3.80; CODIGO/TIPO/DESCRIPCION/UND/SOL/USD/COMENTARIO/ESTATUS; arranca 1.01 MANO DE OBRA (+384 filas).
  - **10. Esquema** (pag7): hoja ESQUEMA (encabezado de obra; cuerpo no volcado).
  - **11. Sectorizacion:** LAYOUT DE OBRA / SECTORIZACION DE CIMENTACION; areas (ACOPIO DE QUIMICOS, LAVANDERIA, TALUD A TANQUES EXISTENTES) y sectores C1/C2/S1/S3; fase EXCAVACION. (+9 filas) — mapa de sectores LPS.
  - **12. RO:** mapa Presupuesto -> RO del Frente F2. Columnas FRENTE | PARTIDA | Descripción | Ppto F2 (NAVE, S/.) | SUBTOTAL. Filas TOTAL COSTO DE OBRA, COSTO DIRECTO, y partidas (PRE1/1.01 Seguridad 0; PRE2/1.02 Topografia 10,278.34; 1001 Trabajos Preliminares 14,797.89). (+61 filas).
  - **9. Pull:** Pull Planning NAVE (F2). PROYECTO NAVE INDUSTRIAL, UBICACION LIMA - HUACHIPA, CLIENTE CREDITEX. Elaborado GUIDO GONZALES, revisado JOSE TEIXEIRA. JORNADA 8 HH/DIA. Calendario: 11 domingos, 0 feriados, 64 habiles, 75 calendario, 2.50 meses. INICIO 02-Feb-2026, FIN 18-Abr-2026. (+36 filas).
- **Numeros clave (NAVE / F2):**
  - **TOTAL COSTO DE OBRA = S/ 723,159.80**
  - **COSTO DIRECTO = S/ 571,808.84**
  - Trabajos Preliminares (1001) = S/ 14,797.89; Topografia = S/ 10,278.34
  - PLAZO F2 = 2.50 meses (traslape 0.30 con F1); T.C. 3.80
  - Calendario Pull: 64 dias habiles / 75 calendario; jornada 8 HH/dia; 02-Feb a 18-Abr-2026.
- **Proposito:** Presupuesto base (BAC) del Frente 2 / NAVE (estructura metalica + losa), con su RO, sectorizacion y pull planning integrados. Es la meta de costo y plan de produccion de la NAVE.
- **Origen -> Destino:** Estimacion GRAPCO (Rev.03) aprobada con CREDITEX -> alimenta RO F2, Valorizaciones NAVE, Curva S y planificacion LPS (sectores + pull).
- **Automatizacion:** Hoja **12. RO** -> modulo **Resultado Operativo (RO/CR/F06)** como meta por partida frente F2. PPTO/especialidades -> **Presupuesto (BAC)**; **7. APU** -> banco APU; **8. Recursos** -> catalogo insumos; **Hoja 8** -> **Curva S (F07)**; **9. Pull** + **11. Sectorizacion** -> modulos **Cronograma/LPS y Pull Planning/Sectorizacion** (ya existen en VDC.jsx). Importador generico in-app por hoja.

---

### \05. Gestión Costos\1. Presupuesto\2. NAVE (S)\Presupuesto N°02 - Grapco SAC...pdf
- **Tipo / formato:** PDF (1573 KB) [no-Excel]. "Presupuesto N°02 - Grapco SAC" = impresion/PDF oficial de la oferta NAVE Rev.03 (presupuesto N°02).
- **Contenido:** no volcado (no-Excel). Corresponde a la version PDF presentable/firmable del presupuesto NAVE N°02 (mismo dato que el xlsx NAVE Rev.03).
- **Proposito:** documento de presentacion/aprobacion del presupuesto NAVE al cliente.
- **Origen -> Destino:** generado del xlsx NAVE -> entregable al cliente / respaldo contractual.
- **Automatizacion:** adjuntar como respaldo del BAC NAVE en gestor documental. No es fuente estructurada (el dato vivo va del xlsx). **GAP** si se requiriera extraer cifras solo del PDF.

---

## Resumen del chunk
- 4 archivos fichados (2 xlsx de presupuesto, 2 PDF de respaldo).
- 2 frentes: **F1 / PTARI** (contractual S/ 2,308,484.50) y **F2 / NAVE** (S/ 723,159.80).
- Fuente de costo meta para el RO = hojas **RO / 12. RO** de los xlsx.
- Plantillas: `GP-GCE-FOR-F01` (PPTO/APU) y `PRO-GCE-FOR-F03` (GG/Recursos).
