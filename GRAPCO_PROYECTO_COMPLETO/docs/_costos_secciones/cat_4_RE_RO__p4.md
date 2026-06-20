# Catálogo de Costos — Sección 4. RE-RO (parte 4)

Proyecto: CREDITEX — PTAR PLANTA 5 (PTARI F1) + NAVE (F2). Contratista GRAPCO SAC. Supervisión DISEÑOS RACIONALES SAC. Periodos RO ABRIL 2026 (cierre 02.05.2026, SEM 26) y RO MAYO 2026 (cierre 31.05.2026).
Costo MO promedio usado en todos los cálculos: S/. 25.50/h.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\OP_AL_02.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 (consulta «PARTIDACONTROLCONSULTA»). Insumo de almacén por partida de control (OP = Otras Partidas / Obras Provisionales).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: tabla A1:G57 (56 recursos). Columnas: Código (S10) | Recurso | Unidad | Cantidad Atendida | Valorizado (Principal) | Valorizado (Secundaria) | Recurso N1 (clasificación: MATERIALES / SUBCONTRATOS Y SERVICIOS). Ej.: ACERO CORRUGADO fy=4200 (var, 2, 42.37), ALAMBRE NEGRO N°8 x100kg (rll, 1, 348.52), ARENA GRUESA (bol, 60, 228.82), CABLE VULCANIZADO 3x12 (rll, 1, 796.61), CEMENTO PORTLAND TIPO I (bol, 15, 362.29).
- Números clave: ~56 líneas de recurso (no hay fila TOTAL visible en el extracto).
- Propósito: sustento del consumo de almacén valorizado de una partida de control para alimentar el Registro de Almacén del RO de abril.
- Origen -> Destino: export S10 (Cantidad Atendida x precio) -> hoja Data / pestaña por partida del «GP-GCE-FOR-F07_REGISTRO ALMACEN» -> RO F06 columna Actual Cost.
- Automatización: Almacén GRAPCO (importador Registro S10). Maestro acumulado por delta. Solo líneas MATERIALES alimentan el AC del RO.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\TP_AL_02.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (TP = Trabajos Preliminares / Topografía).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G9 (7 recursos + fila total). OCRE ROJO, PINTURA ESMALTE, PINTURA SPRAY, SC ALQUILER DE GRUA TELESCOPICA (hm, 141.50, 38205 — SUBCONTRATOS Y SERVICIOS), TIRALINEAS METALICO, WINCHA METALICA, YESO X 18KG.
- Números clave: TOTAL valorizado = 38,470.52. La grúa telescópica (38,205) domina el total.
- Propósito: consumo de almacén valorizado de Topografía/Preliminares; incluye el subcontrato de grúa.
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña 1. PRE) -> RO F06 AC.
- Automatización: Almacén GRAPCO (Registro S10). El renglón SUBCONTRATOS conviene marcarlo para no doblar con Valorización de Subcontratos.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\V.ESTRUCTURAS_AL_02.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Varios Estructuras).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G10 (8 recursos + total). AE BENTOBAR (m, 440, 11455.22), AMOLADORA 4.5, CINCEL SDS MAX, CLAVOS PARA CEMENTO 1", DISCO DE CORTE, PRIMER BENTOBAR (gal/l), SC ALQUILER DE MARTILLOS DEMOLEDORES (día, 9, 526.27 — SUBCONTRATOS).
- Números clave: TOTAL = 13,495.89. El waterstop AE BENTOBAR (11,455.22) domina.
- Propósito: consumo valorizado de la partida Varios Estructuras.
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña 6. VAR EST) -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Abril_.xls
- Tipo / formato: xls (15.8 MB) — libro contable/tesorería integral de GRAPCO SAC (no es por proyecto; es de toda la empresa).
- Hojas: Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen.
- Contenido a detalle:
  - **Datos**: parámetros (Fecha Declaración, RUC 20203071702, IGV 0.18, retención honorarios 0.08, empresa GRAPCO SAC), maestro de cuentas bancarias (Crédito Soles 193-2080045-0-54 saldo inicial 92,839.39; Crédito Dólares; Crédito Soles Precotex; Caja; Nación) con Total inicial = 97,926.12.
  - **Ingresos_diario** (~4,085 filas): facturas/NC de venta. Numero | Documento | Tipo | Ingreso | Cliente | Cod_Cliente | Producto(OBRAS) | IGV | Detraccion | Tipo_Cambio | Mes | RUC | tipo de venta. Clientes: UVI TECH PERU, PRECOTEX SAC, CIA INDUSTRIAL ROMOSA, etc.
  - **egresos_diario** (~3,012 filas): compras/egresos. Documento | Tipo | Monto | Producto | IGV | Detraccion | Retencion | Proveedor | Concepto | Tipo_Cambio | banco.
  - **gastos** (~1,275 filas): Egreso | Rubro (Logistica, Renta_3era, igv, Bancos) | Proveedor | IGV | Concepto | Tipo (Factura/Otros). Incluye pagos SUNAT.
  - **RRHH** (~1,006 filas): planilla/tributos laborales. Monto | Concepto (Essalud, ONP, Renta_5ta, Renta_4ta, Habitat, Integra, Personal) | Empresa (INTERCONTACT SAC) | banco.
  - **Bancos** (~25,709 filas): movimientos bancarios al detalle. Banco | Moneda | N_Operacion | Tipo | Cliente | Cargo | Abono | Saldo | Observaciones. Aparecen conceptos de obra: «CUOTA SINDICAL SEM 52 - OBRA CREDITEX», «DETRACCIONES», pagos a proveedores (GESTION MADERERA F001-26637), comisiones.
  - **Almacen** (~1,064 filas): kardex de mercadería corporativa (Polos, Libros, Kits) — legado del negocio editorial, no de obra.
- Números clave: saldo bancario inicial total 97,926.12 (al 01/2026); Crédito Soles saldo arranque 92,839.39.
- Propósito: tesorería y flujo de caja real de la empresa; fuente para conciliar pagos a proveedores/subcontratistas y egresos reales.
- Origen -> Destino: registro contable interno (CONCAR/manual) -> sustenta el RO (validación de pagos «PAGADO SI/NO» en Registro Facturas) y sería la fuente natural de un Flujo de Caja.
- Automatización: GAP — Flujo de Caja no existe en GRAPCO. El libro es corporativo (cruza CREDITEX + PRECOTEX + editorial), viola aislamiento por proyecto; requiere filtro por Observaciones/Cliente «CREDITEX» antes de ingerir. Candidato a importador de Flujo de Caja (futuro), o solo extraer movimientos etiquetados OBRA CREDITEX.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_LIQUIDACION.xlsx
- Tipo / formato: xlsx — Valorización de cliente, código **GP-GCE-FOR-F07** (con APUs nuevos GP-GCE-FOR-F01). Es la LIQUIDACIÓN (revisión N°01) de la obra PTAR PLANTA 5.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios.
- Contenido a detalle:
  - Carátula / 1. RESUMEN: PTAR PLANTA 5, AV. LOS HORNOS 185 ATE, periodo ABRIL 2026 (16 al 30/04), Residente ING. GUIDO GONZALES, plazo 130 D.C.
  - 2. PAGOS: cronograma de pagos (GP-GCE-FOR-F07, pág 1 de 5).
  - 3. RES.VAL: resumen de valorizaciones — MONTO REFERENCIAL 2,866,414.72 (inc. IGV) / 2,429,165.02 (sin IGV); COSTO DIRECTO 1,839,669.99.
  - 4. VAL: valorización por ítem (A1:AD1103). Columnas: ITEM | DESCRIPCIÓN | PRESUPUESTO (UND/CANT/P.U./PARCIAL) | ACUMULADO ANTERIOR (cant/%/total) | ACTUAL | ACUMULADO | SALDO REFERENCIAL. Presupuesto CONTRACTUAL (PTARI), 130 días.
  - 5. RO: vista por FRENTE/PARTIDA con Ppto F1 PTARI, Valorización Quincenal y Acumulada. TOTAL COSTO DE OBRA 2,326,608.63; COSTO DIRECTO 1,839,669.99; valorización quincenal 89,413.01; acumulada 2,326,608.63.
  - 5 y 6. APUs Nuevos: análisis de nuevos precios unitarios (GP-GCE-FOR-F01).
  - 6. Servicios: lista (ADICIONAL DE ARQUITECTURA, TRAMITE MUNICIPAL).
- Números clave: Ref. 2,866,414.72 c/IGV; 2,429,165.02 s/IGV; CD 1,839,669.99; Total costo obra (5.RO) 2,326,608.63; val. quincenal 89,413.01.
- Propósito: valorización final (liquidación) presentada al cliente CREDITEX; cierra el avance contractual y la base del Earned Value en el RO.
- Origen -> Destino: metrados de obra x APU del presupuesto contractual -> alimenta columna Valorizado (EV/PV) del RO F06.
- Automatización: módulo Valorizaciones (cliente) de GRAPCO + Adicionales/Deductivos para Servicios. La hoja 5.RO mapea directo a Curva S / PV-EV. APUs nuevos -> Presupuesto (BAC) o Adicionales.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_Val N°09.xlsx
- Tipo / formato: xlsx — Valorización de cliente N°09 (GP-GCE-FOR-F07), misma estructura que la Liquidación.
- Hojas: idénticas (9): Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios.
- Contenido a detalle:
  - VALORIZACIÓN N°09, periodo ABRIL 2026 (1 al 15/04), rev N°01.
  - 1. RESUMEN: presupuesto referencial 2,922,876.02.
  - 3. RES.VAL: MONTO REFERENCIAL 2,866,414.72 (inc IGV) / 2,429,165.02 (sin IGV); COSTO DIRECTO 1,841,000.03.
  - 4. VAL: misma matriz Presupuesto/Acum. Anterior/Actual/Acumulado/Saldo (CONTRACTUAL PTARI, 130 días).
  - 5. RO: TOTAL COSTO DE OBRA 2,328,290.71; COSTO DIRECTO 1,841,000.03; Valorización Quincenal 115,269.95; Acumulada 2,237,195.62 (CD quincenal 91,144.97, acum 1,768,970.33).
- Números clave: ref. 2,922,876.02; CD 1,841,000.03; val. quincenal 115,269.95; acum. 2,237,195.62.
- Propósito: valorización quincenal N°09 al cliente (primera quincena de abril) — base del EV del RO de abril.
- Origen -> Destino: metrados x APU -> Valorizado (EV) del RO F06; cronograma de pagos -> Flujo de Caja.
- Automatización: módulo Valorizaciones (cliente). Es la fuente del Earned Value; importable como serie quincenal a Curva S / RO.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM26.xlsx
- Tipo / formato: xlsx (6.8 MB) — Informe Semanal de Producción (ISP), código **PRO-GCR-FOR-F01**. Motor de productividad HH/IP del proyecto.
- Hojas (30): PC | CR | CHH | CIP | ISP-SEM26 ... ISP-SEM01 (26 semanas + 4 maestras).
- Contenido a detalle:
  - **PC** (Partidas Control): catálogo de partidas de control con código (1001 TRABAJOS PRELIMINARES, etc.) y unidad (GLB/MES).
  - **CR** (Control Reporte tareos): por FRENTE/PARTIDA -> HH | COSTO | ACUM S/IGV. Costo MO prom 25.50. SEMANA 24 (13-19/04). TOTAL COSTO DE OBRA HH 17,680.51 / COSTO 310,475.51 / ACUM 450,853.01. COSTO DIRECTO HH 17,216.01 / 298,630.76 / 439,008.26.
  - **CHH** (Control HH Variaciones): por semana — HH PLANILLA vs HH CAMPO (admin vs campo) | DELTA | HH META ACUM | HH VARIACIÓN | CPI | desglose por partida (PRE/PRO/CON/ACE/CUR/...). Ej. SEM1 CPI 0.46 hasta SEM creciente; arranque HH planilla acum 16,479.50, campo 16,464.
  - **CIP** (Control de IP): IP Contractual | IP Meta | IP Actual Acum por SEM21..SEM25 | DELTA | COMENTARIO (p.ej. «ACTUALIZAR APU REAL»). Por partida.
  - **ISP-SEM01..26**: matriz semanal completa — CODIGO | PARTIDA DE CONTROL | UND | PREVISIÓN (METRADO/HH/IP) por PPTO OFERTA PTAR (F1), OFERTA NAVE (F2), ADICIONALES, CONTRACTUAL (1), META (2) | ACUMULADO ANTERIOR | META | VAR | CPI | reparto diario LUN..DOM (metrado/HH/IP) | PRESENTE | análisis vs META y vs PPTO. SEM26 (27/04-03/05): CONTROL 20,411.88; HH presente acum 17,680.51; META 14,911.33; VAR -2,749.19; **CPI 0.84**. SEM24: CPI 0.72. SEM23: CPI 0.74.
- Números clave: Costo MO 25.50; HH total semana ~17,680.51; CPI rango 0.72-0.84; HH planilla vs campo delta ~14-16; META HH acum SEM26 14,911.33.
- Propósito: corazón del control de productividad — convierte tareos (HH) en costo de MO y compara IP real vs meta/presupuesto, genera CPI por partida que alimenta el RO.
- Origen -> Destino: tareos diarios de campo (HH) + metrados -> CR (HH x 25.50) -> RO F06 columna «ANALISIS DE DATA DEL ISP» y CPI. CIP toma IP Meta/Ppto del catálogo WBS.
- Automatización: módulo ISP de GRAPCO (tareos HH x S/25.5) ya existe -> esta es la fuente directa. CHH (planilla vs campo) es un GAP parcial (Control de Planilla). Semanas = obtenerSemana (LPS rector). CPI por partida -> RO/EVM.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.05.02.xlsx
- Tipo / formato: xlsx — Registro de Almacén consolidado (código GP-GCE-FOR-F07), cierre 02.05.2026 / SEM 26. Es el maestro ACUMULADO del consumo valorizado de almacén.
- Hojas (18): CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG.
- Contenido a detalle:
  - **CR**: cuadro acumulado por partida de control con desglose en 16 columnas (1.PRELIMINAR ... GASTO GENERALES). ACUM S/IGV 31.03.2026 = 936,317.23 -> mensual 102,516.63 -> ACUM 30.04.2026 = 1,038,833.86. COSTO DIRECTO 884,128.84 -> 971,638.38.
  - **Analisis**: detalle de costos por partida con PARCIAL/TOTAL y columna DELTA (CONTROL vs Data). TOTAL COSTO DE OBRA 938,904.21; CD 873,157.73; Data 941,389.21.
  - **Data**: base de recursos (~275 filas) Código | Recurso | Unidad | Cantidad Atendida | Costo | Valorizado (Secundaria) | Recurso N1 | COMENTARIO1 (partida) | COMENTARIO2 (subpartida). Total 941,389.21.
  - **Pestañas por partida** (cada una repite REGISTRO + ANALISIS + detalle S10). Totales acum 30.04.2026:
    - 1. PRE = 38,470.52
    - 2. PRO = 68,242.09 (CD 67,749.09)
    - 3. CON (Concreto) = 401,513.15
    - 4. ACE (Acero) = 298,029.02
    - 5. CUR (Curado) = 678.40
    - 6. VAR EST = 13,495.89
    - 7. TAB = 0; 8. BIT = 0; 10. PRH = 0; 11. VAR ARQ = 0; 12. IIEE = 0
    - 13. IISS = 6,590.93
    - 14. MT (Mov. Tierras) = 46,962.63
    - 15. ENC (Encofrado) = 33,133.58
    - GG (Gastos Generales) = 131,717.65 (CD parte 65,015.17)
- Números clave: ACUM almacén 30.04.2026 = 1,038,833.86 (TCO) / 971,638.38 (CD); mensual abril 102,516.63; Data 941,389.21; mayores: Concreto 401,513.15 y Acero 298,029.02.
- Propósito: consolida todos los AL_*.XLSX por partida en el costo real de materiales/subcontratos del proyecto (pata Almacén del Actual Cost del RO).
- Origen -> Destino: extractos S10 por partida (OP/TP/V.ESTRUCTURAS/ACERO/...) -> hoja Data -> CR acumulado -> RO F06 columna «ANALISIS DE DATA DE REGISTRO DE ALMACEN» (Actual Cost).
- Automatización: Almacén GRAPCO (Kardex S10) — maestro ACUMULADO con cálculo de deltas; solo líneas MATERIALES al RO. Es el consolidado destino del importador de almacén.

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.05.02.xlsx
- Tipo / formato: xlsx — Registro de Facturas de subcontratistas (código GP-GCE-FOR-F07), cierre 02.05.2026. Es la pata de Valorización de Subcontratos del AC.
- Hojas (8): RESUMEN | CR | 1. PRE | 13. IISS | 10. PHE | 14. MT | 15. ENC | 17. IMP.
- Contenido a detalle:
  - **RESUMEN**: por rubro -> PROVEEDOR | MONTO SIN IGV | IGV | MONTO CON IGV. PRE/AMSA 13,736.94; IISS/RECOSA 979; ENC/EFCO 44,161.42; ENC/NOPIN 5,147.06; varios con #N/A o #VALUE! (errores de fórmula).
  - **CR**: acumulado por partida. TOTAL COSTO DE OBRA = COSTO DIRECTO: ACUM 31.03.26 163,495.82 + mensual 179,691.98 = ACUM 02.05.26 **343,187.80**. Trabajos Preliminares 13,736.94.
  - **Pestañas por subcontrato** (cuadro resumen de valorización por proveedor con: PROYECTO «AMPLIACIÓN PRECOTEX LAS MORERAS», cliente GRAPCO, supervisor HIGASHI, RUC, MONTO CONTRACTUAL, FACTURADO, AMORTIZACIÓN, DEDUCCIÓN, SALDO POR DEDUCIR, y tabla de facturas FACTURA|SUBCONTRATISTA|VAL|DESCRIPCION|MONTO|IGV|PAGADO|FECHA):
    - 1. PRE — AMSA (subcontrato de andamios), contractual 9,257.50 s/IGV; facturas F001-1031/1103/... ALQUILER DE EQUIPOS. ACUM 13,736.94.
    - 13. IISS — RECOSA / MASESTRUMETALES, contractual 55,729.70; ACUM 1,679; saldo por deducir 12,822.
    - 10. PHE (Prueba Hidráulica) — ORANGE/RECOSA, ACUM 15,750 (PRUEBA DE LANZA SECA).
    - 14. MT — R PROYECTOS, contractual 90,611.28; ACUM 93,561.07; saldo 44,592.
    - 15. ENC — EFCO, ACUM 81,358.53 (arriendos de encofrado metálico ene-abr, ventas de equipo, NC de devolución -3,047.03).
    - 17. IMP — SURE (impermeabilización), contractual 137,102.26; ACUM 137,102.26; saldo por deducir 117,434.
- Números clave: ACUM facturas subcontratos 02.05.26 = 343,187.80 (mensual 179,691.98); mayores: IMP/SURE 137,102.26, MT/R PROYECTOS 93,561.07, ENC/EFCO 81,358.53.
- Propósito: control de valorización y pago a subcontratistas (amortización/deducción/saldo) por partida; pata del Actual Cost del RO.
- Origen -> Destino: facturas de subcontratistas -> CR por partida -> RO F06 columna «REGISTRO FACTURAS» (Actual Cost).
- Automatización: GAP conocido — Valorización de Subcontratistas (F10/F11) no existe como módulo; hoy entra por Importador genérico / Almacén. Estructura contractual+amortización+saldo justifica un módulo Subcontratos dedicado. Estado PAGADO SI/NO cruza con Bancos (Flujo de Caja).

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.05.02.xlsx
- Tipo / formato: xlsx — **Resultado Operativo (RO) maestro**, código **GP-GCE-FOR-F06**, PTAR PLANTA 5 - CREDITEX, SEM 26, rev 1, fecha 02.05.2026. Documento integrador del control de costos (EVM).
- Hojas (6): RO | CR | Adicionales | Deductivos | DASH | GG.
- Contenido a detalle:
  - **RO** (A1:AI935): matriz EVM por FRENTE/PARTIDA. Presupuesto = Ppto F1 (PTARI) + Ppto F2 (Nave) + Deductivos (PQ-01/02) + Adicionales = Ppto Total (BAC). Avance Programado (PV F1/F2/Deduct/Adic = Plan Value). Valorizado (Val F1/F2/... = Earned Value EV). Costo Real (Actual Cost AC) con Margen y CV. CPI. Saldo teórico/costo por ejecutar. Estimado al término: EAC, VAC, SPI. Encabezado: factor 0.76. Columnas finales cruzan «ANALISIS DE DATA DE REGISTRO DE ALMACEN» y «ANALISIS DE DATA DEL ISP».
  - **CR** (consolidado de las 4 patas del AC + GG): TOTAL COSTO DE OBRA -> REGISTRO FACTURAS 343,187.80 | REGISTRO ALMACEN 450,853.01 (¿tareos?)… filas: Reg.Facturas ACUM 343,187.80; Reg.Almacen mensual 86,799.63 ACUM 1,023,116.86; Reporte Tareos HH 17,680.51 ACUM S/IGV 450,853.01; Gastos Generales ACUM 284,857.11; TOTAL REGISTRO 2,102,014.77. Costo MO 25.50.
  - **Adicionales**: matriz por partida PQ-01/PQ-02/Total con Programado y Valorizado (todo 0 en este periodo).
  - **Deductivos**: misma matriz (todo 0).
  - **DASH**: tablero — Margen 1.00 / 1.27, factor 0.76, SEM 26, ranking de PARTIDAS por CV y VAC.
  - **GG** (Análisis de Gastos Generales): Costo Directo (#REF!), GG Variables 687,204.96, GG Fijos 55,779.20, Utilidad 0.11. (Mezcla referencia a otro proyecto «reproducción clónica / Agromillora / Ica-Chincha» — plantilla heredada con #REF!).
- Números clave: Ppto Total BAC y factor 0.76; CR TOTAL REGISTRO (AC) 2,102,014.77; Reg.Almacen acum 1,023,116.86; Reg.Facturas 343,187.80; Tareos acum 450,853.01; GG acum 284,857.11; márgenes DASH 1.00/1.27; GG Variables 687,204.96 / Fijos 55,779.20 / Utilidad 0.11.
- Propósito: documento rector que cruza Presupuesto (BAC) vs PV vs EV (valorización) vs AC (almacén+facturas+tareos+GG) para CPI/CV/SPI/EAC/VAC por partida y frente.
- Origen -> Destino: integra Registro Almacén F07 + Registro Facturas F07 + ISP (tareos) + Valorizaciones F07 + Adicionales/Deductivos + GG -> KPIs RO/Curva S -> DASH gerencial.
- Automatización: módulo Resultado Operativo (RO/CR/F06 + EVM) de GRAPCO — YA VIVO con useRO (4 patas del AC + GG + EV valorizado + adicionales/deductivos). Este archivo es el espejo exacto del módulo. DASH -> Dashboard RO. GG con #REF! debe sanearse (no importar la plantilla Agromillora).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\ACERO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Acero), cierre mayo.
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G1000 (~20 recursos). ACERO CORRUGADO fy=4200 varios diámetros (var) y ACERO DIMENSIONADO 1"/1/2"/3/4"/5/8" (ton) cortado y doblado. Ej. dimensionado 1": ton 39.71, 123,015.93; 5/8": ton 32.18, 99,781.32.
- Números clave: el acero dimensionado domina (1" 123,015.93 + 5/8" 99,781.32 + 1/2" 29,998.70 + 3/4" 16,068.60).
- Propósito: consumo valorizado de acero (mayo) para el Registro de Almacén del RO de mayo.
- Origen -> Destino: S10 -> consolidado Registro Almacén F07 mayo -> RO F06 AC.
- Automatización: Almacén GRAPCO (Registro S10), maestro acumulado/delta, líneas MATERIALES.

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\BITUMEN_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Bitumen/impermeabilización).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G5 (3 recursos + total). ALQUITRAN (gal, 4, 128.81), BROCHA 2" (und, 24, 345.76), THINNER (gal, 10, 211.86).
- Números clave: TOTAL = 686.43.
- Propósito: consumo valorizado de la partida Bitumen (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 mayo -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\CONCRETO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Concreto).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G57 (~56 recursos). ARENA GRUESA (bol, 330, 1258.50), CEMENTO PORTLAND TIPO I (bol, 124, 3058.48), BOOGUIE, BRUÑA, CINCELES, CINTA MASKINGTAPE, CLAVOS, etc.
- Números clave: ~56 líneas; cemento 3,058.48 y arena gruesa 1,258.50 destacan (no hay fila total en el extracto).
- Propósito: consumo valorizado de Concreto (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 mayo -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\CR_AL_31.05.2026.png
- Tipo / formato: png (imagen, 240 KB) — [.png - no-Excel].
- Propósito: captura del cuadro CR (Control de Almacén) del cierre de mayo, presumiblemente pantallazo del consolidado/validación visual del Registro de Almacén. Sustento gráfico, no fuente de datos estructurada.
- Automatización: no ingerible como datos; sirve solo como evidencia adjunta. Sin destino de importador.

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\CURADO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Curado).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G7 (5 recursos + total). ARENA FINA (m3, 2, 194.92 / bol, 90, 343.23), MOCHILA FUMIGADORA, PER MEMBRANA X 55 GLN (cil, 0.75, 180), RODILLO 9".
- Números clave: TOTAL = 996.20.
- Propósito: consumo valorizado de Curado (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 mayo -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\ENCOFRADO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Encofrado).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G45 (~44 recursos). ADHESIVO QUIMICO HILTI RE 500 (jgo, 9, 6464.83), ALAMBRE NEGRO N°8 (rll, 10, 2988.04), BARRA ROSCADA 1"x1.80m (und, 88, 2871.44), arandelas, barras roscadas, balón de gas, WD-40.
- Números clave: ~44 líneas; Hilti RE 500 (6,464.83) y alambre (2,988.04) destacan.
- Propósito: consumo valorizado de Encofrado (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 mayo -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\GG.GG._AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Gastos Generales).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G113 (~112 recursos). EPP y consumibles de oficina/seguridad: ACEITE MULTIGRADO, ACIDO MURIATICO, ADAPTADOR CARETA, BARBIQUEJO (90, 174.24), BARRA RETRACTIL CONO, BLOQUEADOR SUGAR SUN, etc.
- Números clave: ~112 líneas (la lista más larga de los almacenes de mayo); sin total visible en extracto.
- Propósito: consumo valorizado de Gastos Generales en obra (mayo) — EPP, seguridad, campamento.
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña GG) -> RO F06 (GG).
- Automatización: Almacén GRAPCO (Registro S10); estos recursos van a GG del RO, no a CD de partidas.

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\II.SS._AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Instalaciones Sanitarias).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G8 (7 recursos + total). CODO PVC-SAL 8"x45°, PEGAMENTO PVC, SC SOLDADURA POR TERMOFUSION (glb, 1, 2485 — SUBCONTRATOS), SC SUMINISTRO E INSTALACION DE SOPORTE (glb, 1, 762.71), TUBERIA PVC-SAL 6" y 8".
- Números clave: TOTAL = 6,701.10. Soldadura termofusión (2,485) y tubería 6" (1,724.58) destacan.
- Propósito: consumo valorizado de IISS (mayo), incluye 2 subcontratos.
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña 13. IISS) -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10); marcar líneas SC para no duplicar con Registro Facturas/Subcontratos.

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\MT_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Movimiento de Tierras).
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G21 (~20 recursos). AFIRMADO (m3, 228, 10260), BARRETA LISA, BOOGUIE, CABLE VULCANIZADO, GASOLINA 90, LAMPA, MANGUERA PVC, MENNEKES, PICO.
- Números clave: ~20 líneas; AFIRMADO (10,260) domina.
- Propósito: consumo valorizado de Movimiento de Tierras (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña 14. MT) -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\OP_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Otras Partidas), cierre mayo.
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G60 (~59 recursos). ACERO CORRUGADO, ADAPTADOR PVC-SAP, ALAMBRE NEGRO, ARENA FINA/GRUESA, BARRETA, BISAGRA CAPUCHINA, CABLE VULCANIZADO, CAJA RECTANGULAR PVC.
- Números clave: ~59 líneas; sin total visible en extracto.
- Propósito: consumo valorizado de partidas varias (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 mayo -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\TP_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Trabajos Preliminares/Topografía), mayo.
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G11 (~10 recursos). OCRE ROJO, PINTURA ESMALTE/SPRAY, SC ALQUILER ESTACION TOTAL (día, 1, 100), SC ALQUILER DE GRUA TELESCOPICA (hm, 150, 40500 — SUBCONTRATOS), SC SERVICIO DE TOPOGRAFIA (glb, 1, 1141.41), TIRALINEAS, WINCHA, YESO.
- Números clave: la grúa telescópica (40,500) domina; servicio de topografía 1,141.41.
- Propósito: consumo valorizado de Topografía/Preliminares (mayo), con 3 subcontratos.
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña 1. PRE) -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10); separar líneas SC.

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. Almacén\V.ESTRUCTURAS_AL_31.05.2026.XLSX
- Tipo / formato: xlsx — extracto S10 PARTIDACONTROLCONSULTA (Varios Estructuras), mayo.
- Hojas: PARTIDACONTROLCONSULTA (única).
- Contenido: A1:G11 (~10 recursos). AE BENTOBAR (m, 440, 11455.22), AMOLADORA, CINCEL SDS MAX, CLAVOS CEMENTO 1", CUCHILLA, DISCO DE CORTE, PRIMER BENTOBAR (gal/l), SC ALQUILER DE MARTILLOS DEMOLEDORES (día, 9, 526.27).
- Números clave: AE BENTOBAR (11,455.22) domina.
- Propósito: consumo valorizado de Varios Estructuras (mayo).
- Origen -> Destino: S10 -> Registro Almacén F07 (pestaña 6. VAR EST) -> RO F06.
- Automatización: Almacén GRAPCO (Registro S10).

### \05. Gestión Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Mayo.xls
- Tipo / formato: xls (15.9 MB) — libro contable/tesorería corporativo de GRAPCO SAC (versión mayo; estructura idéntica al de abril).
- Hojas: Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen.
- Contenido a detalle: igual que «Bancos 2026_Abril_.xls».
  - Datos: parámetros + cuentas bancarias (saldo inicial Crédito Soles 92,839.39; Total 97,926.12).
  - Ingresos_diario (~4,085): ventas a UVI TECH, PRECOTEX, ROMOSA, etc.
  - egresos_diario (~3,012): compras/egresos con detracción/retención.
  - gastos (~1,275): Logistica, Renta_3era, igv, SUNAT.
  - RRHH (~1,006): Essalud/ONP/Renta/AFP, planilla INTERCONTACT SAC.
  - Bancos (~25,709): movimientos al detalle, conceptos OBRA CREDITEX / detracciones / cuota sindical.
  - Almacen (~1,064): kardex de mercadería editorial (Polos/Libros/Kits), no de obra.
- Números clave: saldo inicial total 97,926.12 (mismos saldos de arranque que abril — libro acumulativo).
- Propósito: tesorería/flujo real de mayo; conciliación de pagos y base de Flujo de Caja.
- Origen -> Destino: registro contable interno -> sustenta pagos del RO (estado PAGADO) y Flujo de Caja.
- Automatización: GAP — Flujo de Caja. Libro corporativo cruza varios clientes/negocios (rompe aislamiento por proyecto); requiere filtro CREDITEX por Observaciones/Cliente antes de cualquier ingesta.
