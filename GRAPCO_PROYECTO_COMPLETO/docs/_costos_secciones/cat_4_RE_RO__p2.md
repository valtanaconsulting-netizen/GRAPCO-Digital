# Catálogo de Costos — Categoría 4. RE-RO (cont. 2) — Chunk `cat_4_RE_RO__p2`

Proyecto: **CREDITEX (PTAR PLANTA 5 / "AMPLIACIÓN PRECOTEX LAS MORERAS")**, frentes F1 (PTARI) y F2 (Nave).
Cubre los meses de RO: **2026.01 (ENE)**, **2026.02 (FEB)** y **2026.03 (MAR, sólo sustento de Almacén)**.
Cargos MO costeados a **Costo MO prom: S/ 25** (= S/25.5 redondeado en la práctica GRAPCO). Semana rectora: SEM13 = enero, SEM17 = febrero.

---

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.01.31.xlsx
- **Tipo / formato:** xlsx — formato **GP-GCE-FOR-F07** (Registro de Almacén / consumo de materiales valorizado). Es la pata de Almacén del AC del RO.
- **Hojas (18):** CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. AC | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG
- **Contenido:**
  - **CR (Control/Resumen):** matriz por partida WBS (FA01, ítems 1..15 + GG) con columnas ACUM al 27.12.2025 (S/), MENSUAL, y desglose por grupo de material (1. PRELIMINAR, 2. PROVISIONAL, 3. CONCRETO, 4. ACERO, 5. CURADO, 6. VARIOS EST, 7. TABIQUERIA, 8 BITUMEN, 10 PRUEBA HIDR, 11 VAR ARQ, 12 IIEE, 13 IISS, 14 MOV TIERRA, 15 ENCOFRADO, GASTOS GENERALES) y ACUM al 31.01.2026. Nota interna "IMPORTANTE ANALIZAR LA DATA / REALIZAR UNA ADECUADO FASEO".
  - **Analisis:** detalle de costos por partida → COSTO DIRECTO / TOTAL COSTO DE OBRA, con columnas CONTROL y DELTA (cuadre). Sub-rubros: SEGURIDAD Y SALUD OCUPACIONAL, TOPOGRAFÍA, ACARREO DE MATERIALES, etc.
  - **Data:** padrón de recursos consumidos (Código S10, Recurso, Unidad, Cantidad Atendida, Costo, Valorizado (Secundaria), Recurso N1 = tipo MATERIALES/SUBCONTRATOS, COMENTARIO 1 = grupo, COMENTARIO 2 = sub-grupo). ~200 líneas.
  - **Hojas 1..15 + GG:** una hoja por grupo de material; cada una replica CR + Analisis + Data filtrada de ese grupo (columnas Valorizado Principal / Secundaria, doble valorización).
- **Números clave (ACUM al 31.01.2026, S/ sin IGV):**
  - TOTAL COSTO DE OBRA 532,503.99 (mensual 426,681.42; ACUM previo 27.12 = 105,822.57)
  - COSTO DIRECTO 507,364.67
  - Por grupo: PROVISIONAL 48,255.19 · CONCRETO 156,462.06 · ACERO 253,134.33 · MOV TIERRA 25,369.46 · GASTOS GENERALES 46,147.65 · ENCOFRADO 1,544.66 · VARIOS EST 1,095.22 · CURADO 264.07 · PRELIMINAR 231.35
  - Acero dimensionado 1" CyD: 37.79 ton → 117,075.40 (principal) / 34,765.88 (secundaria)
- **Propósito:** cuantificar el costo real de **materiales** consumidos (una de las 4 patas del AC). Maestros F07 son **acumulados**: se sube la cadena completa y la plataforma calcula deltas.
- **Origen → Destino:** sale de salidas de almacén S10 (Kardex) → alimenta la columna **Real / Actual Cost (AC)** del RO (F06) "ANALISIS DE DATA DE REGISTRO DE ALMACEN".
- **Automatización:** importador existente **Almacén → «Importar Registro S10»** (calcula deltas de acumulados; sólo líneas MATERIALES alimentan el RO). Mapeo directo, sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.01.31.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F07** (Registro de Facturas / valorización de subcontratistas).
- **Hojas (4):** RESUMEN | CR | 14. MT | 15. ENC
- **Contenido:**
  - **RESUMEN:** por rubro/proveedor (PROVEEDOR, MONTO SIN IGV, IGV, MONTO CON IGV). Proveedores: AMSA (PRE), SOLCONER SAC (IIEE), RECOSA (IISS), CONSTRUCTORA TINOZ SAC / RJ&H / CONSORCIO SA&ES EIRL (MT), A&CR / EFCO / NOPIN (ENC). Varios #N/A (sin factura cargada).
  - **CR:** matriz por partida WBS con ACUM 31.12.25, MENSUAL y ACUM 31.01.26.
  - **14. MT / 15. ENC:** "CUADRO RESUMEN DE VALORIZACIONES" por subcontrato (FACTURA, SUBCONTRATISTA, VAL, DESCRIPCION, MONTO SIN IGV, IGV, MONTO CON IGV, PAGADO SI/NO, FECHA). MT subcontratista **R PROYECTOS** (RUC 20483973951), servicio "SUBCONTRATO DE MOVIMIENTO DE TIERRAS"; ENC subcontratista **EFCO**, "ALQUILER Y CONSUMIBLES EFCO".
- **Números clave (S/ sin IGV):**
  - TOTAL COSTO DE OBRA ACUM 31.01.26 = 93,561.07 (mensual ene 6,061.12; ACUM 31.12 = 87,499.95)
  - MT: VAL1 44,592.48 + VAL2 46,018.79 + AD1 2,949.80 (R PROYECTOS, PAGADO SI). Monto contractual 65,761.05 (inc IGV) / 55,729.70 (no inc). Saldo por deducir 12,822.
- **Propósito:** capturar el costo real de **subcontratos/facturas** (pata de Facturas del AC) y controlar valorizaciones de subcontratistas.
- **Origen → Destino:** facturas de proveedores/subcontratistas → columna Real (AC) del RO, rubro "REGISTRO FACTURAS".
- **Automatización:** **GAP parcial** — no existe importador de Valorización de Subcontratistas (F10/F11). La hoja CR sí puede ir por importador genérico a la pata Facturas del AC en RO; el detalle de valorizaciones de subcontratistas requiere módulo nuevo. **GAP: Valorización de Subcontratistas.**

---

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO GG OFICINA_acumulado_31_01_2026.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F07** (Gastos Generales de Oficina, acumulado).
- **Hojas (1):** REG. GG OFICINA_30.04
- **Contenido:** matriz por partida WBS con pares de columnas **ACUM S/ IGV + MENSUAL** mes a mes, desde 31.12.24 hasta 31.01.26 (serie histórica completa de ~14 cortes). Filas: partidas 1..n; las partidas de obra figuran en 0 (GG de oficina no se imputan a partidas productivas).
- **Números clave (TOTAL COSTO DE OBRA acumulado mensual, S/):** 100,747.75 (ene-25) → 165,576.81 → 230,580.41 → 302,994.69 → 382,965.82 → 465,168.58 → 542,747.59 → 674,242.92 → 743,096.28 → 821,137.40 → 899,746.99 → 973,303.46 (nov-25)… (continúa, valor ene-26 truncado en volcado).
- **Propósito:** llevar el costo real de **Gastos Generales de oficina** (estructura central, no de obra) como insumo del RO.
- **Origen → Destino:** contabilidad de oficina GRAPCO → columna GASTOS GENERALES del CR del RO.
- **Automatización:** importador genérico in-app → pata GG del AC en RO. Es acumulado: subir cadena y calcular delta. Bajo riesgo de GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.01.31.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F06** (Resultado Operativo, el documento maestro del RO). Rev 1.
- **Hojas (6):** RO | CR | Adicionales | Deductivos | Leyenda | GG
- **Contenido:**
  - **RO:** matriz EVM por FRENTE/PARTIDA/Descripción. Columnas: Presupuesto [Ppto F1 (PTARI), Ppto F2 (Nave), Deductivos PQ-01/02, Adicionales PQ-01/02, **Ppto Total (BAC)**]; Avance [PV F1, PV F2, PV Deduct, PV Adic, **Plan Value (PV)**; Val F1, Val F2, Val Deduct, Val Adic, **Earn Value (EV)**]; Costo [**Actual Cost (AC)**, Variación CV, CPI]; Saldo teórico por ejecutar, Saldo costo por ejecutar; CPI; Variación del Cronograma (SPI); Estimado al término [EAC, VAC]; columnas de cruce "ANALISIS DE DATA DE REGISTRO DE ALMACEN" y "ANALISIS DE DATA DEL ISP". Encabezado: MES SEMANA 13, % avance 0.51.
  - **CR (Control Registro):** consolida las 4 patas del AC — REGISTRO FACTURAS, REGISTRO ALMACEN, CONTROL TAREOS, GASTOS GENERALES = TOTAL REGISTRO; más HH F1/F2 (REPORTE TAREOS) y GG OFICINA. Costo MO prom: 25.
  - **Adicionales / Deductivos:** matriz por partida PQ-01/PQ-02 (Presupuesto / Programado / Valorizado). En ene todo 0.
  - **Leyenda:** glosario EVM (PV/EV/AC/BAC/EAC/ETC/CV/SV/CPI con fórmulas e interpretación en obra).
  - **GG:** "Análisis de Gastos Generales" (Costo Directo #REF!, GG Variables 687,204.96, GG Fijos 55,779.20, Utilidad 0.11 = 11%); contiene #REF!/#REF! (referencias rotas a otro libro).
- **Números clave:** % avance 0.51 (SEM13). CR TOTAL REGISTRO = 897,534.59 (FACTURAS 93,561.07 + ALMACEN 532,503.99 + TAREOS 161,937.50 + GG 109,532.03). HH Total 6,477.50 (F1 6,477.50, F2 0) → CONTROL TAREOS 161,937.50 (6,477.50 × 25). GG Variables 687,204.96; GG Fijos 55,779.20; Utilidad 11%.
- **Propósito:** documento integrador del control de costos — EVM por partida y frente, consolidación del AC y proyección (EAC/VAC).
- **Origen → Destino:** consume Registro Almacén + Registro Facturas + Tareos (ISP) + GG Oficina (las 4 patas) y el BAC del presupuesto/catálogo WBS; produce el RO oficial.
- **Automatización:** **núcleo del módulo RO/CR/F06 + EVM (useRO), ya vivo y automático.** CPI toma IP Meta/Presupuesto del catálogo WBS (fuente única). Sin GAP de motor; sólo asegurar carga de las 4 fuentes.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\ACERO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export crudo de almacén S10 por grupo (hoja `PARTIDACONTROLCONSULTA`). Insumo del F07 Registro Almacén de febrero.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** columnas Código | Recurso | Unidad | Cantidad Atendida | Valorizado (Principal) | Valorizado (Secuandaira) | Recurso N1. Grupo ACERO (varillas y acero dimensionado CyD por diámetro).
- **Números clave:** Acero dim. 1" CyD 39.71 ton → 123,015.93; 5/8" 31.13 ton → 96,442.92; 1/2" 8.67 ton → 26,809.94; 3/4" 5.19 ton → 16,068.60; 3/8" 4.48 ton → 13,870.02.
- **Propósito:** detalle de consumo de acero al 28.02.2026 (sustento del grupo 4. ACERO del Registro Almacén).
- **Origen → Destino:** Kardex S10 → hoja 4. ACE del F07 ALMACEN feb → pata Almacén del AC en RO.
- **Automatización:** importador **Almacén → «Importar Registro S10»** (líneas MATERIALES al RO). Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\CONCRETO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CONCRETO.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** mismas columnas; insumos de concreto (arena, cemento, premezclado, herramientas/equipos).
- **Números clave:** Concreto premezclado f'c=350 CyD 259 m3 → 94,685; f'c=350 04 142.50 m3 → 56,715; f'c=280 4 m3 → 2,020.
- **Propósito:** detalle de consumo de concreto al 28.02.2026 (grupo 3. CONCRETO).
- **Origen → Destino:** Kardex S10 → hoja 3. CON del F07 ALMACEN feb → AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\CR_AL_28.02.2026.png
- **Tipo / formato:** **.png** (imagen, no-Excel). Captura de la hoja CR del Registro de Almacén al 28.02.2026.
- **Propósito:** respaldo visual/snapshot del control de almacén del mes (evidencia de cuadre).
- **Origen → Destino:** screenshot del libro F07 ALMACEN → archivo de sustento.
- **Automatización:** no importable como dato (imagen). La data real entra por el .xlsx F07. Sin acción.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\CURADO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CURADO.
- **Hojas (1):** PARTIDACONTROLCONSULTA (sólo 4 líneas).
- **Contenido:** ARENA FINA 2 m3 → 194.92; MOCHILA FUMIGADORA 1 → 144.07; PER MEMBRANA X 55 GLN 0.50 cil → 120.
- **Números clave:** total grupo CURADO = **458.99**.
- **Propósito:** consumo de curado al 28.02.2026 (grupo 5. CUR).
- **Origen → Destino:** Kardex S10 → hoja 5. CUR del F07 ALMACEN feb → AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\ENCOFRADO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo ENCOFRADO.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** adhesivo químico HILTI RE500 (9 jgo → 6,464.83), alambre N°8 (9 rll → 2,689.77), brocas, clavos, desmoldante, etc.
- **Propósito:** consumo de encofrado al 28.02.2026 (grupo 15. ENC).
- **Origen → Destino:** Kardex S10 → hoja 15. ENC del F07 ALMACEN feb → AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\GG.GG._AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo Gastos Generales de obra.
- **Hojas (1):** PARTIDACONTROLCONSULTA (~86 líneas, EPP y consumibles).
- **Contenido:** botines de cuero (52 par → 3,320.76), barbiquejos, bloqueador, botas PVC, baldes, aceite, etc. — EPP y suministros de seguridad/obra.
- **Propósito:** consumo de GG de obra al 28.02.2026 (alimenta grupo GG del Registro Almacén, NO el GG de oficina).
- **Origen → Destino:** Kardex S10 → hoja GG del F07 ALMACEN feb → pata Almacén/GG del AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\MT_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo MOVIMIENTO DE TIERRAS.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** barreta, boogie, cable vulcanizado, gasolina, manguera PVC, mennekes, pulpo enchufe, pico — herramientas/insumos de MT.
- **Propósito:** consumo de movimiento de tierras al 28.02.2026 (grupo 14. MT).
- **Origen → Destino:** Kardex S10 → hoja 14. MT del F07 ALMACEN feb → AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\OP_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo OP (obras provisionales / campamento).
- **Hojas (1):** PARTIDACONTROLCONSULTA (~55 líneas).
- **Contenido:** acero, alambre, arena, bisagras, cable vulcanizado, cemento, etc. asociados a PROVISIONALES/CAMPAMENTO.
- **Propósito:** consumo de obras provisionales al 28.02.2026 (grupo 2. PRO).
- **Origen → Destino:** Kardex S10 → hoja 2. PRO del F07 ALMACEN feb → AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\TP_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo TP (trabajos preliminares / topografía).
- **Hojas (1):** PARTIDACONTROLCONSULTA (6 líneas).
- **Contenido:** OCRE ROJO, PINTURA ESMALTE, TIRALINEAS, WINCHA, YESO.
- **Números clave:** total grupo = **251.52**.
- **Propósito:** consumo de preliminares al 28.02.2026 (grupo 1. PRE).
- **Origen → Destino:** Kardex S10 → hoja 1. PRE del F07 ALMACEN feb → AC en RO.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. Almacén\V.ESTRUCTURAS_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo VARIOS ESTRUCTURAS.
- **Hojas (1):** PARTIDACONTROLCONSULTA (8 líneas).
- **Contenido:** AE BENTOBAR 30 m → 795.22; PRIMER BENTOBAR; amoladora; cincel; clavos; disco; **SC ALQUILER DE MARTILLOS DEMOLEDORES** (9 día → 526.27, Recurso N1 = SUBCONTRATOS Y SERVICIOS).
- **Números clave:** total grupo = **2,159.63**.
- **Propósito:** consumo de varios estructuras al 28.02.2026 (grupo 6. VAR EST).
- **Origen → Destino:** Kardex S10 → hoja 6. VAR EST del F07 ALMACEN feb → AC en RO. Nótese línea SUBCONTRATOS (no es MATERIALES; sólo MATERIALES alimenta RO).
- **Automatización:** importador Almacén S10 (filtra Recurso N1 = MATERIALES). Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Febrero.xls
- **Tipo / formato:** **.xls** (15.8 MB) — libro contable/tesorería de GRAPCO (multi-empresa, multi-proyecto). NO es un formato GP-GCE.
- **Hojas (7):** Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen
- **Contenido:**
  - **Datos:** parámetros (RUC 20203071702, EMPRESA GRAPCO S.A.C., IGV 0.18, retención honorarios 0.08), catálogo de cuentas bancarias (BCP Soles 193-2080045-0-54 saldo inicial 92,839.39; BCP Dólares; Crédito Soles Precotex; Crédito Soles Caja; Nación). Total inicial 97,926.12.
  - **Ingresos_diario (~4,077 filas):** facturas/NC de venta (Numero, F_Emision, Documento, Tipo, Ingreso, Cliente, IGV, RUC…). Clientes: UVI TECH, **PRECOTEX S.A.C** (C002), COMPAÑIA INDUSTRIAL ROMOSA, etc. Histórico desde 2022/2023.
  - **egresos_diario (~3,012 filas):** egresos por proveedor/concepto (Monto, IGV, Detracción, Retención, Tipo_Cambio, Concepto). Cuentas Interbank/Crédito.
  - **gastos (~1,275 filas):** facturas/otros de gasto (Egreso, Rubro = Logistica/Renta_3era/Bancos/igv, Proveedor, SUNAT). Tributos y logística.
  - **RRHH (~1,006 filas):** planilla y aportes (Essalud, ONP, Renta 5ta/4ta, AFP Habitat/Integra, Personal) vía INTERCONTACT SAC.
  - **Bancos (~25,709 filas):** movimientos bancarios (Banco, Moneda, N_Operacion, Cargo, Abono, Saldo, Observaciones). Filas CREDITEX: comisiones, cuota sindical SEM52 obra CREDITEX/PRECOTEX, detracciones, pagos a proveedores (GESTION MADERERA F001-26637).
  - **Almacen (~1,064 filas):** kardex de mercadería antigua (libros/polos/kits) — data legacy del negocio editorial, no de obra.
- **Números clave:** saldo inicial BCP Soles 92,839.39; total cuentas 97,926.12. Factura PRECOTEX E001-131 448,855.81 (con NC E001-20 que la anula). RRHH personal ene-23 38,344.44.
- **Propósito:** tesorería y **flujo de caja** real de GRAPCO; fuente para conciliar ingresos/egresos/bancos y planilla.
- **Origen → Destino:** sistema contable (estilo CONCAR) → control de caja y, parcialmente, sustento del AC (pagos a subcontratistas/proveedores) y Control de Planilla.
- **Automatización:** **GAP grande.** GRAPCO no tiene módulo de **Flujo de Caja** ni **Control de Planilla**. Es multi-empresa/multi-proyecto y legacy → requiere filtrado por proyecto (CREDITEX) antes de ingerir. Candidato a nuevos módulos: Flujo de Caja (hojas Bancos/Ingresos/egresos/gastos) y Control Planilla (hoja RRHH). **GAP: Flujo de Caja, Control Planilla.**

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL N°06.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F07** (Valorización de obra al cliente) — Valorización N°06, FEBRERO 2026 (periodo 16-28 feb). Rev N°01. Incluye APUs nuevos en formato **GP-GCE-FOR-F01**.
- **Hojas (8):** Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- **Contenido:**
  - **Carátula / 1. RESUMEN:** OBRA "PTAR PLANTA 5", CLIENTE CREDITEX, SUPERVISIÓN DISEÑOS RACIONALES SAC, CONTRATISTA GRAPCO SAC, RESIDENTE ING. GUIDO GONZALES, plazo 130 D.C.
  - **2. PAGOS:** cronograma de pagos (GP-GCE-FOR-F07, pág 1 de 5).
  - **3. RES.VAL:** resumen de valorizaciones; MONTO REFERENCIAL 2,866,414.72 (inc IGV) / 2,429,165.02 (no inc IGV); COSTO DIRECTO 1,713,447.90.
  - **4. VAL:** valorización detallada por ítem (UND, CANT, P.U., PARCIAL; ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL — con CANTIDAD/%/TOTAL). Presupuesto CONTRACTUAL (PTARI).
  - **5. APUs Nuevos / 6. APUs Nuevos.:** análisis de nuevos precios unitarios (GP-GCE-FOR-F01).
  - **5. RO:** vista RO de la valorización por partida (Ppto F1 PTARI, Valorización Quincenal, Valorización Acumulada).
- **Números clave:** Presupuesto referencial 2,739,001.11. Monto referencial 2,866,414.72 (inc) / 2,429,165.02 (no inc). Costo Directo 1,713,447.90. **5. RO:** TOTAL COSTO DE OBRA Ppto 2,166,977.07; Val quincenal 249,629.66; Val acumulada 1,570,455.13. Costo directo Ppto 1,713,447.90 / quincenal 197,384.38 / acum 1,241,772.74.
- **Propósito:** valorización mensual de avance facturable **al cliente** (CREDITEX) → ingreso/EV del proyecto; sustenta Val F1/F2 del RO.
- **Origen → Destino:** metrados de avance × P.U. del presupuesto contractual → columna **Valorizado / Earn Value (EV)** del RO (Val F1, Val F2) y al cronograma de cobros.
- **Automatización:** módulo **Valorizaciones (cliente)** + **Adicionales/Deductivos** (PQ-01/02) ya existentes; APUs nuevos migran a la plataforma de Costos aparte (APU salió de GRAPCO). Importador genérico para 4. VAL / 5. RO. Bajo GAP (APUs nuevos = fuera de alcance GRAPCO).

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM17 .xlsx
- **Tipo / formato:** xlsx (4.3 MB) — **PRO-GCR-FOR-F01** (Informe Semanal de Producción / ISP). Es la fuente de **HH (tareos)** y de la productividad IP. Libro acumulado SEM01→SEM17.
- **Hojas (21):** PC | CR | Control HH | Control IP | ISP-SEM17 … ISP-SEM01 (17 semanas).
- **Contenido:**
  - **PC (Partidas Control):** catálogo de partidas de control con código (1001 TRABAJOS PRELIMINARES, SSO, alquiler andamios, señalización, mitigación de polvo, limpieza, etc.) y unidad.
  - **CR:** consolidado por partida — HH, COSTO (= HH × S/25), ACUM S/ IGV al 01.12.25. Costo MO prom: 25.
  - **Control HH:** comparativo semanal **HH PLANILLA (administración) vs HH CAMPO (tareo)**, ACUM, DELTA HH, HH META, HH VARIACIÓN y **CPI**; desglose de variación por grupo (PRE/PRO/CON/ACE/CUR/VAE/TAB/BIT/CONT/PRH/VAA/IIEE…). Total HH ~10,949 planilla / 10,933.50 campo.
  - **Control IP:** IP Contractual, IP Meta e IP real por partida y por semana (SEM01..SEM19) — productividad (HH/unidad).
  - **ISP-SEMxx (17 hojas):** una por semana con METRADO/HH/IP por día (lun-dom) y por frente (PPTO OFERTA PTAR-F1, PPTO OFERTA NAVE-F2, ADICIONALES, TOTAL), PREVISION, ACUMULADO ANTERIOR, META, VAR, CPI. SEM17 = 23-29/02/2026; semanas tempranas rotuladas "PRECOT(EX)".
- **Números clave:**
  - CR (al 01.12.25): TOTAL COSTO DE OBRA HH 10,933.50 / COSTO 194,437.50 / ACUM 273,337.50; COSTO DIRECTO HH 10,617.50 / 186,537.50.
  - SEM17: HH presente semana 1,200.50; META 746.04; VAR −454.46; CPI 0.62. Acumulado HH 10,933.50; META 8,497.55; VAR −2,435.95; CPI 0.78.
  - Serie CPI acumulado por semana: S1 0.46 · S2 0.56 · S3 0.68 · S4 0.69 · S5 0.73 · S6 0.75 · S7 0.74 … (mejora progresiva).
- **Propósito:** medir productividad (IP real vs meta) y cuantificar el costo real de **mano de obra** (HH × S/25.5) — pata Tareos del AC; insumo del SPI/CPI del RO.
- **Origen → Destino:** tareos de campo (F13) + planilla → CONTROL TAREOS del CR del RO y columna "ANALISIS DE DATA DEL ISP" del RO.
- **Automatización:** módulo **ISP (tareos HH × S/25.5)** existente; tareos desde Registros_Campo (fuente única F13). El comparativo HH planilla vs campo (Control HH) toca **Control Planilla** (GAP). El cuerpo IP/HH del ISP es ingerible. **GAP parcial: cruce con Control Planilla.**

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.02.28.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F07** (Registro de Almacén, corte 28.02.2026, acumulado).
- **Hojas (18):** CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG (idéntica estructura al de enero).
- **Contenido:** mismo esquema CR/Analisis/Data + 1 hoja por grupo. SEMANA 17. La hoja Analisis trae columnas CONTROL y DELTA para cuadre. Hojas vacías/en 0: 7. TAB, 8. BIT, 10. PRH, 11. VAR ARQ, 12. IIEE, 13. IISS.
- **Números clave (ACUM al 28.02.2026, S/ sin IGV):**
  - TOTAL COSTO DE OBRA 708,373.07 (mensual feb 175,869.08; ACUM previo 31.01 = 532,503.99)
  - COSTO DIRECTO 669,822.93
  - Por grupo: PROVISIONAL 50,414.97 · CONCRETO 244,701.73 · ACERO 285,342.76 · CURADO 458.99 · VARIOS EST 2,159.63 · MOV TIERRA 28,839.46 · ENCOFRADO 27,240.02 · GASTOS GENERALES 68,963.99 · PRELIMINAR 251.52
- **Propósito:** costo real acumulado de materiales a feb (pata Almacén del AC).
- **Origen → Destino:** Kardex S10 (consolidado de los exports por grupo arriba) → AC en RO feb.
- **Automatización:** importador **Almacén → «Importar Registro S10»** (acumulado, calcula deltas; sólo MATERIALES al RO). Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.02.28.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F07** (Registro de Facturas / valorización de subcontratistas, corte 28.02.2026).
- **Hojas (6):** RESUMEN | CR | 1. PRE | 14. MT | 13. IISS | 15. ENC
- **Contenido:**
  - **RESUMEN:** por rubro/proveedor; aparece **EFCO (ENC) 32,150 / IGV 5,787 / 37,937**; AMSA, RECOSA, etc.
  - **CR:** por partida WBS, ACUM 31.01.26, MENSUAL feb, ACUM 28.02.26.
  - **1. PRE / 14. MT / 13. IISS / 15. ENC:** "CUADRO RESUMEN DE VALORIZACIONES" por subcontrato. PRE: **AMSA** "ALQUILER DE EQUIPOS / SUBCONTRATO DE ANDAMIOS" VAL1 4,628.75 (PAGADO SI). IISS: **RECOSA** VAL1 979 (PAGADO SI). ENC: **EFCO** 32,150 (PAGADO NO). MT: R PROYECTOS (igual a enero).
- **Números clave (S/ sin IGV):** TOTAL COSTO DE OBRA ACUM 28.02.26 = 131,318.82 (mensual feb 37,757.75; ACUM 31.01 = 93,561.07). PRE/TRABAJOS PRELIMINARES mensual 4,628.75. ENC EFCO 32,150 (con IGV 37,937).
- **Propósito:** costo real de subcontratos/facturas a feb (pata Facturas del AC) y seguimiento de valorizaciones de subcontratistas (pagado/por pagar).
- **Origen → Destino:** facturas proveedores/subcontratistas → AC del RO feb (REGISTRO FACTURAS).
- **Automatización:** CR ingerible por importador genérico a la pata Facturas. **GAP: Valorización de Subcontratistas (F10/F11)** para el detalle de las hojas por subcontrato.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO GG OFICINA_acumulado_28_02_2026.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F07** (GG de Oficina, acumulado, corte 28.02.2026).
- **Hojas (1):** REG. GG OFICINA_30.04
- **Contenido:** misma matriz mensual ACUM+MENSUAL desde 31.12.24, ahora extendida con columna 28.02.26. Partidas de obra en 0; serie de TOTAL COSTO DE OBRA acumulado mes a mes.
- **Números clave:** misma serie histórica que enero (100,747.75 ene-25 … 973,303.46 nov-25 …) con corte adicional al 28.02.26.
- **Propósito:** costo real de GG de oficina acumulado a feb.
- **Origen → Destino:** contabilidad de oficina → GASTOS GENERALES del CR del RO feb.
- **Automatización:** importador genérico (acumulado → delta) → pata GG del AC. Bajo GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.02.28.xlsx
- **Tipo / formato:** xlsx — **GP-GCE-FOR-F06** (Resultado Operativo, corte 28.02.2026). Rev 1.
- **Hojas (6):** RO | CR | Adicionales | Deductivos | **DASH** | GG (vs enero: cambia "Leyenda" por **DASH**).
- **Contenido:**
  - **RO:** misma matriz EVM por frente/partida; encabezado SEMANA 17, % avance 0.72; columnas de cruce con Registro Almacén e ISP.
  - **CR:** 4 patas del AC consolidadas + HH F1/F2 + GG oficina. Costo MO prom 25.
  - **Adicionales / Deductivos:** PQ-01/02 (en feb siguen en 0).
  - **DASH:** tablero del RO (Margen 1.01 / 1.16; tabla PARTIDAS · CV · VAC). Vista resumen para lectura tipo dashboard.
  - **GG:** Análisis de GG (mismos GG Variables 687,204.96 / Fijos 55,779.20 / Utilidad 11%, con #REF!).
- **Números clave:** % avance 0.72 (SEM17). CR TOTAL REGISTRO 1,282,867.10 (FACTURAS 131,318.82 + ALMACEN 708,373.07 + TAREOS 273,337.50 + GG 169,837.71). HH Total 10,933.50 (F1 10,933.50, F2 0). Margen DASH 1.01 / 1.16.
- **Propósito:** RO oficial de febrero — EVM, consolidación del AC, dashboard de márgenes y proyección.
- **Origen → Destino:** consume las 4 patas (Almacén feb, Facturas feb, ISP/tareos, GG oficina feb) + BAC; produce RO y DASH.
- **Automatización:** módulo **RO/CR/F06 + EVM (useRO)** + el DASH mapea a **Dashboard RO** ya desplegado. Sin GAP de motor.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\ACERO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo ACERO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** acero corrugado y dimensionado CyD por diámetro (acumulado mar).
- **Números clave:** Acero dim. 1" 39.71 ton → 123,015.93; 1/2" 9.69 ton → 29,998.70; 3/4" 5.19 ton → 16,068.60.
- **Propósito:** consumo de acero al 28.03.2026 (sustento grupo 4. ACERO del F07 ALMACEN marzo, aún en sustento).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\CONCRETO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CONCRETO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** arena, cemento, premezclado, herramientas/equipos de concreto (acumulado mar).
- **Propósito:** consumo de concreto al 28.03.2026 (grupo 3. CONCRETO).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\CR_AL_28.03.2026.png
- **Tipo / formato:** **.png** (imagen, no-Excel). Captura de la hoja CR del Registro de Almacén al 28.03.2026.
- **Propósito:** snapshot/evidencia de cuadre del control de almacén de marzo.
- **Origen → Destino:** screenshot del F07 ALMACEN mar → sustento.
- **Automatización:** no importable (imagen); la data entra por los .xlsx. Sin acción.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\CURADO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CURADO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** insumos de curado (arena fina, mochila fumigadora, per membrana).
- **Propósito:** consumo de curado al 28.03.2026 (grupo 5. CUR).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\ENCOFRADO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo ENCOFRADO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** adhesivo HILTI, alambre, brocas, clavos, desmoldante, etc. (acumulado mar).
- **Propósito:** consumo de encofrado al 28.03.2026 (grupo 15. ENC).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\GG.GG._AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo GG de obra, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** EPP y consumibles de obra (botines, barbiquejos, botas, baldes, aceite…).
- **Propósito:** consumo de GG de obra al 28.03.2026 (grupo GG del Registro Almacén).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\II.SS._AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo IISS (instalaciones sanitarias), corte 28.03.2026. **Nuevo grupo que aparece en marzo (no estaba en feb).**
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** materiales de instalaciones sanitarias (columnas estándar Código/Recurso/Unidad/Cantidad/Valorizado).
- **Propósito:** consumo de IISS al 28.03.2026 (grupo 13. IISS).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\MT_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo MOVIMIENTO DE TIERRAS, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** herramientas/insumos de MT (barreta, boogie, cable, gasolina, manguera, pico…).
- **Propósito:** consumo de MT al 28.03.2026 (grupo 14. MT).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\OP_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo OP (obras provisionales/campamento), corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** materiales de provisionales/campamento (acumulado mar).
- **Propósito:** consumo de obras provisionales al 28.03.2026 (grupo 2. PRO).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10. Sin GAP.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\TP_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo TP (trabajos preliminares/topografía), corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA (8 líneas).
- **Contenido:** OCRE ROJO, PINTURA ESMALTE, PINTURA SPRAY, **SC ALQUILER DE GRUA TELESCOPICA** (141.50 hm → 38,205, Recurso N1 = SUBCONTRATOS Y SERVICIOS), TIRALINEAS, WINCHA, YESO.
- **Números clave:** total grupo = **38,470.52** (dominado por el alquiler de grúa telescópica 38,205).
- **Propósito:** consumo/servicios de preliminares al 28.03.2026 (grupo 1. PRE).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo. La grúa es SUBCONTRATO (no MATERIALES; sólo MATERIALES alimenta el RO por Almacén).
- **Automatización:** importador Almacén S10 (filtra MATERIALES). El servicio de grúa debería ir por Facturas/Subcontratos. Sin GAP nuevo.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. Almacén\V.ESTRUCTURAS_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx — export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo VARIOS ESTRUCTURAS, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA (9 líneas).
- **Contenido:** AE BENTOBAR 440 m → 11,455.22; PRIMER BENTOBAR (gal y l); amoladora; cincel; clavos; disco; **SC ALQUILER DE MARTILLOS DEMOLEDORES** 9 día → 526.27 (SUBCONTRATOS Y SERVICIOS).
- **Números clave:** total grupo = **13,495.89** (BENTOBAR sube fuerte vs feb: 440 m vs 30 m).
- **Propósito:** consumo de varios estructuras al 28.03.2026 (grupo 6. VAR EST).
- **Origen → Destino:** Kardex S10 → F07 ALMACEN mar → AC del RO marzo.
- **Automatización:** importador Almacén S10 (filtra MATERIALES). Sin GAP nuevo.

---

## Notas transversales del chunk
- Patrón claro de **fuentes del AC**: F07 ALMACEN (materiales) + F07 FACTURAS (subcontratos) + ISP/tareos (MO HH×25) + F07 GG OFICINA → consolidados en el **F06 RO** (CR) por partida WBS (FA01, ítems 1..15 + GG) y por frente F1 (PTARI) / F2 (Nave).
- Los exports `*_AL_28.xx.XLSX` (hoja `PARTIDACONTROLCONSULTA`) son el **insumo crudo S10** que se consolida en el F07 ALMACEN del mes; F2 (Nave) sigue en 0 HH (sin tareo) en ene/feb.
- **EVM oficial:** ene CPI/avance 0.51; feb avance 0.72, márgenes DASH 1.01/1.16; CPI de MO (ISP) acumulado feb 0.78 (mejora desde 0.46 en S1).
- **GAPs confirmados:** Flujo de Caja y Control de Planilla (libro Bancos .xls) y Valorización de Subcontratistas F10/F11 (hojas por subcontrato del F07 FACTURAS).
