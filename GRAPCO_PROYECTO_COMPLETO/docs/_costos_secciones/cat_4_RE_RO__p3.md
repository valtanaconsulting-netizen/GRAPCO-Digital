# Catálogo de Costos — Categoría 4. RE-RO (parte 3)

Proyecto: CREDITEX (PTARI Planta 5 + Nave). Periodo principal: RO de MARZO 2026 (cierre 28/03/2026, semana 21) y arranque del RO de ABRIL 2026.
Fuente: volcado real de Excel (`scripts/_costos_catalog/cat_4_RE_RO__p3.txt`).

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Marzo.xls
- **Tipo / formato:** xls (libro contable/tesorería de GRAPCO S.A.C., no es un formato GP-GCE-FOR). Archivo grande (~15.8 MB).
- **Hojas (7):** Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen
- **Contenido:**
  - **Datos:** parámetros de la empresa y plan de cuentas bancarias. Fecha declaración (Mar 2023), RUC 20203071702 (GRAPCO S.A.C.), tasa retención honorarios 0.08, IGV 0.18, mes declarado 3. Catálogo de cuentas: Credito_Soles (104101, cta 193-2080045-0-54, monto inicial 92,839.39), Credito_Dolares (104102, cta 193-2186429-1-49, 25.75 USD a TC 3.37), Credito_Soles_Precotex (193-2495622-0-01, 2,000), Credito_Soles_Caja (193-9620930-0-09, 3,000), Nacion (104201, cta 00-048-099459). Total inicial bancos 97,926.12. (+355 filas).
  - **Ingresos_diario:** registro de ventas/facturación. Campos: Numero, flgPDT, F_Cargo, F_Emision, Documento, Tipo (Factura/Nota_Credito), Ingreso, Cliente, Cod_Cliente, Producto, Empresa, IGV, Detraccion, TC, Mes, RUC, etc. Clientes: UVI TECH PERU, PRECOTEX, CIA INDUSTRIAL ROMOSA. (+4075 filas).
  - **egresos_diario:** compras/egresos. Campos: Numero, Tipo (Doc_Extranjero, etc.), Monto, Producto, IGV, Detraccion, Retencion, Importacion, Proveedor, Concepto, cuenta banco, Tipo_Ventas. Proveedores ej. Facebook, Robbins Research. (+3002 filas).
  - **gastos:** gastos por rubro (Logistica, Renta_3era, Bancos, igv). Campos: Numero, Tipo, Egreso, Rubro, Proveedor (SUNAT, bancos, CTAS POR PAGAR ACCIONISTAS), IGV, Concepto, cuenta. (+1265 filas).
  - **RRHH:** obligaciones laborales/planilla. Campos: Numero, Documento, Monto, Concepto (Essalud, ONP, Renta_5ta, Renta_4ta, Habitat, Integra, Personal), Empresa (INTERCONTACT SAC), Retencion, Cod_Cta, Personal, Banco. (+996 filas).
  - **Bancos:** extracto/movimientos bancarios al detalle. Campos: Numero, Banco (Credito_soles, Credito_soles_Creditex), Moneda, fecha, Tipo (Transferencia), Cliente/beneficiario, Cargo, Abono, Saldo, Observaciones. Ej. comisiones bancarias, cuota sindical SEM 52 obra CREDITEX (150) y obra PRECOTEX (480), detracciones, compra dólares, pago a GESTION MADERERA SAC (F001-26637, 1,546.70). (+25,699 filas).
  - **Almacen:** kardex de existencias (mercadería: Polos, Libros, Kits). Campos: Numero, Tipo, Producto, Cod_Producto, Unidades, Precio Uni, Razon Social, T_Operacion (Compra/Venta), Monto_Egreso/Ingreso. (+1054 filas). Datos antiguos (2020), parece data heredada del giro editorial de GRAPCO, no de la obra.
- **Números clave:** Total inicial cuentas bancarias 97,926.12; saldo cta Crédito Soles tras movimientos enero 2026 ~92,711.92.
- **Propósito:** contabilidad/tesorería integral de GRAPCO S.A.C. (toda la empresa, no solo la obra). Sustento financiero del RO (flujo de caja real, pagos a proveedores, planilla). Es la fuente de "caja banco" del proyecto.
- **Origen -> Destino:** sale del sistema contable de la empresa (registro diario manual). Alimenta el control financiero corporativo y, parcialmente, el sustento del RO de obra (cuotas sindicales, pagos a subcontratistas/proveedores identificados "OBRA CREDITEX").
- **Automatización:** GAP — Flujo de Caja no existe en GRAPCO. Es data corporativa multi-empresa/multi-proyecto, NO migrar entera. Útil filtrar movimientos etiquetados "CREDITEX/obra" para un futuro módulo Flujo de Caja. Por ahora fuera de alcance del importador genérico (estructura contable, no de obra).

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL N°08.xlsx
- **Tipo / formato:** xlsx — Valorización de obra. Código del formato visible: **GP-GCE-FOR-F07** (carátula de pagos/resumen) y **GP-GCE-FOR-F01** (APUs nuevos). Nota: el nombre del archivo usa "F07" pero internamente combina F07 (valorización) y F01 (APU).
- **Hojas (8):** Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- **Contenido:**
  - **Carátula:** "PTAR PLANTA 5", AV. LOS HORNOS 185 ATE, VALORIZACIÓN N°08, Rev N°01, Mes Marzo 2026 (periodo 16 al 31).
  - **1. RESUMEN:** datos del contrato. Obra "PTAR PLANTA 5", Cliente CREDITEX, Supervisión DISEÑOS RACIONALES SAC, Contratista GRAPCO SAC, Residente ING. GUIDO GONZALES, Presupuesto referencial 2,798,359.65, plazo 130 D.C.
  - **2. PAGOS:** cronograma de pagos (GP-GCE-FOR-F07 v0, pág 1 de 5). Valorización N°8, periodo Marzo (16-31).
  - **3. RES.VAL:** resumen de valorizaciones. Monto referencial 2,866,414.72 (inc. IGV) / 2,429,165.02 (no inc. IGV); Costo Directo 1,750,581.07.
  - **4. VAL:** detalle de valorización por partida. Columnas: ITEM, DESCRIPCIÓN, PRESUPUESTO (Und/Cant/P.U./Parcial), ACUMULADO ANTERIOR (Cant/%/Total), ACTUAL, ACUMULADO, SALDO REFERENCIAL. (+232 filas). Presupuesto = CONTRACTUAL (PTARI), plazo 130 días.
  - **5. APUs Nuevos / 6. APUs Nuevos.:** análisis de nuevos precios unitarios (GP-GCE-FOR-F01 v0). (+41 y +221 filas).
  - **5. RO:** vista RO de la valorización. Columnas Ppto F1 (PTARI), Valorización Quincenal, Valorización Acumulada. TOTAL COSTO DE OBRA 2,213,938.94 / quincenal 150,353.90 / acum 1,946,915.19. COSTO DIRECTO 1,750,581.07 / 118,886.16 / 1,539,443.03. Por partida con frente (PRE1, FA01, 1.01 SEGURIDAD Y SALUD OCUPACIONAL 43,225.26 / 6,763.60 / 34,967.15). (+64 filas).
- **Números clave:** Ppto referencial 2,798,359.65; monto referencial 2,866,414.72 c/IGV (2,429,165.02 s/IGV); Costo Directo 1,750,581.07; Total costo de obra 2,213,938.94; valorización quincenal 150,353.90; valorización acumulada 1,946,915.19.
- **Propósito:** Valorización quincenal N°08 de Marzo presentada al cliente CREDITEX (avance ejecutado y a cobrar). Es la "pata" de ingreso valorizado del RO (PV/EV lado cliente).
- **Origen -> Destino:** sale de los metrados de avance vs presupuesto contractual + APUs nuevos aprobados; alimenta el RO (hoja 5. RO) y el cobro al cliente.
- **Automatización:** módulo **Valorizaciones (cliente)** de GRAPCO. La hoja 4. VAL (partida/cant/%/acumulado) y 5. RO mapean a Valorizaciones y al RO (Valorizado/EV). APUs nuevos → Adicionales/Deductivos o catálogo APU (recordar: APU salió a plataforma de Costos aparte; aquí solo entra el resultado valorizado). Ingestible por importador genérico in-app.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\4. ISP\1. Superado\Copia de PRO-GCR-FOR-F01_ISP CREDITEX SEM21.xlsx
- **Tipo / formato:** xlsx — Informe Semanal de Producción (ISP). Código **PRO-GCR-FOR-F01**. ~5.3 MB. (Versión "Superado"/anterior antes del cierre RO).
- **Hojas (25):** PC | CR | CHH | CIP | ISP-SEM21 … ISP-SEM01 (21 semanas + 4 hojas de control).
- **Contenido:**
  - **PC (Partidas Control):** catálogo de partidas de control con código (1 TRABAJOS PRELIMINARES = 1001) y unidad (GLB, MES). (+60 filas).
  - **CR (Control Reporte tareos):** costo MO promedio **25.50**, Semana 21 (23-29/03/2026). Por frente/partida: HH, COSTO, ACUM s/IGV. TOTAL COSTO DE OBRA 15,171.50 HH / 276,815.25 / 386,873.25; COSTO DIRECTO 14,740.50 / 265,824.75 / 375,882.75; TRABAJOS PRELIMINARES 3,568.75 HH. (+62 filas).
  - **CHH (Control HH variaciones):** comparativo HH Administración (planilla) vs Campo vs Meta por semana. Columnas: HH PLANILLA, HH CAMPO, CONTROL HH CAMPO ACUM, DELTA HH, HH META ACUM, HH VARIACIÓN, **CPI**, y desglose por partida (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). Ej. SEM1 CPI 0.46 → SEM6 CPI 0.75 (mejora progresiva). HH planilla total 15,187 vs HH campo 15,171.50 (delta 16). (+25 filas).
  - **CIP (Control de IP):** IP Contractual vs IP Meta vs IP Actual Acum (SEM21-23) y DELTA por partida. Detecta sobreconsumo (ej. SEÑALIZACION TEMPORAL: IP meta 90 vs real 178.93 → delta -82.93 "ACTUALIZAR APU REAL"). (+218 filas).
  - **ISP-SEM01..21:** una hoja por semana. Columnas: CODIGO, PARTIDA DE CONTROL, UND, bloques PREVISION (PPTO OFERTA PTAR-F1 / NAVE-F2 / ADICIONALES / TOTAL / META), ACUMULADO ANTERIOR, META/VAR/CPI, días LUNES-DOMINGO (METRADO/HH/IP cada uno), PRESENTE SEMANA, META/VAR, ACUMULADO ACTUAL, FORECAST. Cada fila = partida con metrado, HH y IP (índice de productividad).
- **Números clave (SEM21):** PPTO CONTRACTUAL (1) 17,525.91 HH; PPTO META (2) 17,069.47; ACUMULADO ANTERIOR 14,031.50; HH presente semana 1,140 (meta 535.51, VAR -604.49, CPI semana 0.47); CPI acumulado 0.73; control 15,171.50. Evolución CPI acumulado: SEM2 0.46 → SEM5 0.73 → SEM10 0.84 → SEM15 0.87 → SEM21 0.73.
- **Propósito:** medir productividad real (HH ejecutadas vs HH meta por metrado) semana a semana; fuente del costo de mano de obra del RO y del CPI/EVM de HH.
- **Origen -> Destino:** sale de los tareos diarios de campo (HH x partida) y metrados; alimenta el CR (costo MO), el CHH/CIP y, vía costo HH x 25.50, el RO (Actual Cost mano de obra) y la Curva S.
- **Automatización:** módulo **ISP (tareos HH x S/25.5)** + RO/EVM de GRAPCO. Cada hoja ISP-SEMxx es ingestible por el importador genérico; PC = catálogo partidas de control; CR/CHH/CIP alimentan CPI y control de HH. NOTA de memoria: "pendiente ISP_Semanal y frentes F1/F2" — este archivo es exactamente esa fuente.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM21_RO.xlsx
- **Tipo / formato:** xlsx — ISP código **PRO-GCR-FOR-F01**, versión final usada para el RO (sufijo _RO). Estructura idéntica al archivo anterior (mismas 25 hojas). ~5.3 MB.
- **Hojas (25):** PC | CR | CHH | CIP | ISP-SEM21 … ISP-SEM01.
- **Contenido:** igual estructura que la "Copia ...Superado" (PC, CR con costo MO 25.50, CHH, CIP, 21 hojas ISP semanales). Diferencias vs la versión Superado: la SEM21 muestra valores de control recalculados — CONTROL 17,462.16 (vs 17,525.91), PPTO CONTRACTUAL (1) 17,462.16, ACUMULADO ANTERIOR 14,355.12, DELTA(1)-(2) 3,107.03, presente semana HH 1,140 vs meta 435.32 (VAR -704.68, CPI 0.38), acumulado actual 11,441.09 (VAR -3,730.41, CPI 0.75). CR: TOTAL COSTO DE OBRA 15,171.50 HH / 276,815.25 / 386,873.25 (idéntico).
- **Números clave:** CPI acumulado SEM21 = 0.75; HH control 15,171.50; costo MO acumulado 386,873.25; CD 375,882.75.
- **Propósito:** versión "oficial RO" del ISP — la que cuadra con el F06 (RO) del cierre de marzo. Provee el Actual Cost de mano de obra y el CPI de HH del RO.
- **Origen -> Destino:** mismos tareos de campo, ajustados/conciliados para el cierre del RO de marzo; alimenta directamente la hoja CR y la columna "ANALISIS DE DATA DEL ISP" del F06 RO.
- **Automatización:** módulo **ISP + RO/EVM**. Mismo mapeo que el archivo anterior; éste es el que debe priorizarse para la ingesta (es el conciliado con el RO). Posible duplicidad: GRAPCO solo necesita un ISP por semana — al ingerir, usar la versión _RO y descartar la "Superado".

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.03.28.xlsx
- **Tipo / formato:** xlsx — Registro de Almacén. Código **GP-GCE-FOR-F07** (aquí en su variante "REGISTRO ALMACEN", maestro acumulado al 28/03/2026). ~406 KB.
- **Hojas (18):** CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 15. ENC | 13. IISS | 14. MT | GG
- **Contenido:**
  - **CR:** resumen por partida y por tipo-existencia. Columnas ACUM s/IGV (28.02 anterior y 31.03 actual) + MENSUAL + 16 columnas por categoría de existencia (PRELIMINAR, PROVISIONAL, CONCRETO, ACERO, CURADO, VARIOS EST, TABIQUERIA, BITUMEN, PRUEBA HIDR, VAR ARQ, IIEE, IISS, MOV TIERRA, ENCOFRADO, GASTOS GENERALES). Semana 17, nota "ANALIZAR LA DATA / REALIZAR ADECUADO FASEO". (+56 filas).
  - **Analisis:** detalle de costos por partida WBS (PARCIAL/TOTAL S/) + CONTROL y DELTA. (+109 filas).
  - **Data:** consumo valorizado a nivel recurso (la fuente atómica). Columnas: Código, Recurso, Unidad, Cantidad Atendida, Costo, Valorizado (Secundaria), Recurso N1 (MATERIALES / SUBCONTRATOS Y SERVICIOS), COMENTARIO 1 (categoría obra), COMENTARIO 2 (sub-partida). Ej. OCRE ROJO, PINTURA, SC ALQUILER GRUA TELESCOPICA (hm 141.50 = 38,205), ACERO CORRUGADO. Total 863,120.49. (+273 filas).
  - **Hojas por categoría (1.PRE..GG):** misma plantilla doble (REGISTRO DE ALMACEN izquierda con totales por partida WBS + ANALISIS-DETALLE con el listado de recursos a la derecha). Cada una filtra Data por su categoría.
- **Números clave (acum 31.03.2026):** TOTAL COSTO DE OBRA 936,317.23 (CR) / 863,120.49 (Analisis-Data); COSTO DIRECTO 884,128.84. Por categoría: PRE 38,470.52 (mensual 27,655.02); PRO 63,142.09; **CONCRETO 384,200.95**; **ACERO 297,138.70**; CURADO 563.99; VAR EST 13,495.89; TAB 0; BIT 0; PRH 0; VAR ARQ 0; IIEE 0; IISS 2,485; MOV TIERRA 29,389.46; ENCOFRADO 22,743.16; GASTOS GENERALES 84,687.47 (CD 32,992.08). Mensual total 227,944.16.
- **Propósito:** kardex/consumo de almacén valorizado (materiales + subcontratos/servicios) por partida y categoría — es la "pata" de costo real de materiales del RO. Maestro ACUMULADO (subir cadena completa, se calculan deltas).
- **Origen -> Destino:** sale del sistema S10 de almacén (atenciones/salidas valorizadas); alimenta el F06 RO (columna "ANALISIS DE DATA DE REGISTRO DE ALMACEN" → Actual Cost materiales) y el CR.
- **Automatización:** módulo **Almacén (Kardex S10)** → "Importar Registro S10". Conforme a memoria: maestros F07 son ACUMULADOS, solo líneas MATERIALES alimentan el RO (aquí también hay SUBCONTRATOS Y SERVICIOS, separar). Hoja **Data** es la fuente atómica ideal para el importador.

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.03.31.xlsx
- **Tipo / formato:** xlsx — Registro de Facturas de subcontratistas. Código **GP-GCE-FOR-F07** (variante "REGISTRO FACTURAS"). Incluye cuadros de valorización de subcontratos (similares a F10/F11). ~276 KB.
- **Hojas (7):** RESUMEN | CR | 1. PRE | 13. IISS | 14. MT | 15. ENC | 17. IMP
- **Contenido:**
  - **RESUMEN:** por partida y proveedor: MONTO SIN IGV / IGV / MONTO CON IGV. PRE-AMSA 9,257.50 / 1,666.35 / 10,923.85; IISS-RECOSA 979 / 176.22 / 1,155.22; MT (CONSTRUCTORA TINOZ, RJ&H, CONSORCIO SA&ES) 0; ENC-EFCO 22,501.14 / 4,050.21 / 26,551.35; ENC-NOPIN 5,147.06 / 926.47 / 6,073.53; IIEE-SOLCONER #N/A. (+2 filas).
  - **CR:** registro de facturas por partida WBS (ACUM s/IGV 28.02 + MENSUAL + 31.03). TOTAL COSTO DE OBRA 131,318.82 / 32,177 / 163,495.82. TRABAJOS PRELIMINARES 4,628.75 → 9,257.50. (+54 filas).
  - **Hojas por partida (1.PRE, 13.IISS, 14.MT, 15.ENC, 17.IMP):** "CUADRO RESUMEN DE VALORIZACIONES" por subcontratista. Datos: PROYECTO (AMPLIACIÓN PRECOTEX LAS MORERAS), CLIENTE GRAPCO, SUPERVISOR HIGASHI, subcontratista, RUC, servicio, MONTO CONTRACTUAL (inc/no IGV), MONTO FACTURADO, AMORTIZACION, DEDUCCION, SALDO POR DEDUCIR, y listado de facturas (FACTURA, SUBCONTRATISTA, VAL, DESCRIPCION, MONTO SIN/CON IGV, PAGADO SI/NO, FECHA).
- **Números clave:** Total registro facturas acum 163,495.82 (mensual 32,177). Subcontratos contractuales: PRE/AMSA 9,257.50; IISS/RECOSA contractual 55,729.70 (facturado acum 979; saldo 12,822... cuadro reusado); MT/R PROYECTOS contractual 90,611.28, facturado acum 93,561.07 (val1 44,592.48 + val2 46,018.79 + AD 2,949.80); ENC contractual 55,729.70, acum 59,698.25 (EFCO/CORI/NOPIN); IMP/SURE contractual 146,792.67, facturado 29,358.54 (adelanto), saldo 117,434.
- **Propósito:** controlar facturas y valorizaciones de subcontratistas (encofrado, mov. tierras, IISS, impermeabilización); es la "pata" de costo real por facturas/subcontratos del RO.
- **Origen -> Destino:** sale de las facturas emitidas por subcontratistas y sus valorizaciones; alimenta el F06 RO (columna "REGISTRO FACTURAS" → Actual Cost subcontratos) y el control de pagos/amortizaciones.
- **Automatización:** módulo **RO (pata de facturas)** para el resumen; los cuadros por subcontratista corresponden a **Valorización de Subcontratistas (F10/F11) — GAP conocido** en GRAPCO. Recomendado: importar la hoja CR/RESUMEN al RO ya, y desarrollar el módulo de Valorización de Subcontratistas para las hojas 1.PRE/13.IISS/14.MT/15.ENC/17.IMP (amortización, deducción, saldo por deducir).

---

### \05. Gestión Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.03.28.xlsx
- **Tipo / formato:** xlsx — **Resultado Operativo (RO)**. Código **GP-GCE-FOR-F06**. El documento central de la categoría. ~647 KB. Cierre 28/03/2026, semana 21.
- **Hojas (6):** RO | CR | Adicionales | Deductivos | DASH | GG
- **Contenido:**
  - **RO:** matriz EVM por frente/partida. Columnas: Presupuesto (Ppto F1 PTARI, Ppto F2 Nave, Deductivos PQ-01/02, Adicionales PQ-01/02, **Ppto Total BAC**), Avance Programado (PV F1, PV F2, PV Deductivos, PV Adicionales, **Plan Value PV**), Valorizado (Val F1, Val F2, Val Deduct, Val Adic, **Earn Value EV**), **Costo (Actual Cost AC)**, Margen (CV), CPI, Saldo teórico/costo por ejecutar, Estimado al término (Costo Total EAC, Margen VAC, CPI), Variación del Cronograma (SPI), columnas de "ANALISIS DE DATA DE REGISTRO DE ALMACEN" y "ANALISIS DE DATA DEL ISP". Margen global 0.88. (+63 filas).
  - **CR:** consolidado de las 4 patas del costo real. Columnas: REGISTRO FACTURAS, REGISTRO ALMACEN, CONTROL TAREOS, GASTOS GENERALES, TOTAL REGISTRO + HH tareos. Costo MO prom 25.50. (+58 filas).
  - **Adicionales / Deductivos:** por partida, PRESUPUESTO (PQ-01, PQ-02, Total), Programado y Valorizado. En este cierre todo 0. (+54 filas c/u).
  - **DASH:** dashboard del RO (Margen 1.00 / 1.12, tabla PARTIDAS / CV / VAC). (+43 filas).
  - **GG:** Análisis de Gastos Generales del presupuesto. GG Variables 687,204.96; GG Fijos 55,779.20; Utilidad 0.11; varios #REF!. (+138 filas).
- **Números clave:** Margen RO 0.88; CR TOTAL COSTO DE OBRA registrado 1,714,033.71 = Facturas 163,495.82 + Almacén 936,317.23 + Tareos 386,873.25 + GG 227,347.41; HH tareos 15,171.50. CD total 1,423,507.41. GG Variables 687,204.96; GG Fijos 55,779.20; utilidad 11%.
- **Propósito:** documento maestro de control de costos — integra presupuesto (BAC), valorizaciones (EV), costo real (AC = facturas + almacén + tareos + GG), y calcula CV/CPI/SPI/EAC/VAC por partida. Es el entregable de la categoría 4.
- **Origen -> Destino:** consolida F07 Valorización (EV), F07 Registro Almacén (AC materiales), F07 Registro Facturas (AC subcontratos), PRO-GCR-FOR-F01 ISP (AC mano de obra HH x 25.50) y GG; produce el RO/DASH para gerencia.
- **Automatización:** módulo **Resultado Operativo (RO/CR/F06 + EVM)** de GRAPCO — YA VIVO Y AUTOMÁTICO (Olas 1-5, useRO). Este archivo es el espejo exacto del módulo: RO→F06, CR→4 patas del AC, Adicionales/Deductivos→módulo homónimo, DASH→Dashboard RO, GG→Gastos Generales. Es la plantilla de referencia para validar números del módulo.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\ACERO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén por categoría (ACERO), corte 02.05.2026 (RO Abril). ~11 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** consulta de recursos consumidos. Columnas: Código, Recurso, Unidad, Cantidad Atendida, Valorizado (Principal), Valorizado (Secundaria), Recurso N1 (MATERIALES). Recursos: ACERO CORRUGADO fy=4200 (varios), ACERO DIMENSIONADO 1"/1/2"/3/4"/5/8"/3/8" CORTE Y DOBLADO (ton). (+15 filas).
- **Números clave:** ACERO DIMENSIONADO 1" 39.71 ton = 123,015.93; 5/8" 32.18 ton = 99,781.32; 1/2" 9.69 ton = 29,998.70; 3/4" 5.19 ton = 16,068.60; 3/8" 5.69 ton = 17,723.11.
- **Propósito:** insumo de almacén (acero) para armar el Registro de Almacén F07 del RO de abril.
- **Origen -> Destino:** export crudo del S10 (consulta por partida-control); alimenta la consolidación del F07 Registro Almacén de abril → RO abril.
- **Automatización:** módulo **Almacén (Importar Registro S10)**. Formato plano ideal para el importador (mismas columnas que la hoja Data del F07). Solo MATERIALES → RO. Es un archivo-fuente, no consolidado.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\CONCRETO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén categoría CONCRETO, corte 02.05.2026. ~12 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** mismas columnas (Código/Recurso/Unidad/Cant Atendida/Valorizado/Recurso N1). Recursos: ARENA GRUESA, CEMENTO PORTLAND TIPO I, CONCRETO PREMEZCLADO F'C=210, BOOGUIE, cinceles, clavos, etc. (+41 filas).
- **Números clave:** CONCRETO PREMEZCLADO F'C=210 38 m3 = 8,720; CEMENTO PORTLAND TIPO I 46 bol = 1,100.86; ARENA GRUESA 120 bol = 457.64.
- **Propósito:** insumo de almacén (concreto) para el Registro de Almacén F07 del RO de abril.
- **Origen -> Destino:** export S10 → consolidación F07 Almacén abril → RO abril.
- **Automatización:** módulo **Almacén (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES → RO.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\CR_AL_02.05.2026.png
- **Tipo / formato:** **[.png - no-Excel]** — imagen (captura). ~237 KB.
- **Contenido:** no volcable (imagen). Por nombre, captura del "CR" (resumen/cuadro de control) del Registro de Almacén corte 02.05.2026.
- **Propósito:** evidencia/pantallazo del consolidado de almacén de abril (probable captura del CR del S10 o del Excel CR).
- **Origen -> Destino:** captura manual de pantalla; sustento visual del RO abril.
- **Automatización:** GAP / no aplica al importador (imagen). No ingerible automáticamente; archivar como adjunto del RO abril.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\CURADO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén categoría CURADO, corte 02.05.2026. ~9 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** Código/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos: ARENA FINA (m3 y bol), MOCHILA FUMIGADORA MANUAL, PER MEMBRANA X 55 GLN, RODILLO 9". 6 filas (set pequeño) con total al pie.
- **Números clave:** total categoría CURADO 678.40. PER MEMBRANA 0.75 cil = 180; ARENA FINA 2 m3 = 194.92.
- **Propósito:** insumo de almacén (curado) para el Registro de Almacén F07 del RO abril.
- **Origen -> Destino:** export S10 → F07 Almacén abril → RO abril.
- **Automatización:** módulo **Almacén (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES → RO.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\ENCOFRADO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén categoría ENCOFRADO, corte 02.05.2026. ~12 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** Código/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos: ADHESIVO QUIMICO HILTI RE 500, ALAMBRE NEGRO RECOCIDO N°8, ARANDELAS, BARRAS ROSCADAS 1"/1¼", BALON DE GAS, etc. (+32 filas).
- **Números clave:** ADHESIVO HILTI RE 500 9 jgo = 6,464.83; ALAMBRE NEGRO N°8 10 rll = 2,988.04; BARRA ROSCADA 1" 88 und = 2,871.44.
- **Propósito:** insumo de almacén (encofrado) para el Registro de Almacén F07 del RO abril.
- **Origen -> Destino:** export S10 → F07 Almacén abril → RO abril.
- **Automatización:** módulo **Almacén (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES → RO.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\GG.GG._AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén categoría GASTOS GENERALES (GG.GG.), corte 02.05.2026. ~15 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** Código/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos mayormente EPP/seguridad y consumibles: ACEITE MULTIGRADO, BARBIQUEJO, BOTAS/BOTINES, BLOQUEADOR SOLAR, BARRA RETRACTIL CONO, etc. (+89 filas — la categoría más extensa).
- **Números clave:** BOTINES DE CUERO PUNTA ACERO 64 par = 3,866.97; BOTAS PVC PUNTA ACERO 10 par = 395; BLOQUEADOR SUGAR SUN 2 = 164; BARRA RETRACTIL CONO 30 = 375.
- **Propósito:** insumo de almacén (gastos generales / EPP) para el Registro de Almacén F07 del RO abril.
- **Origen -> Destino:** export S10 → F07 Almacén abril (categoría GG) → RO abril (pata GG/almacén).
- **Automatización:** módulo **Almacén (Importar Registro S10)**; archivo-fuente plano. Estos consumos van a la categoría GASTOS GENERALES del RO.

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\II.SS._AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén categoría IISS (instalaciones sanitarias), corte 02.05.2026. ~9 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** Código/Recurso/Unidad/Cant/Valorizado/Recurso N1. Incluye SUBCONTRATOS Y SERVICIOS (SC SOLDADURA POR TERMOFUSION, SC SUMINISTRO E INSTALACION SOPORTE) y MATERIALES (CODO PVC-SAL 8", TUBERIA PVC-SAL 6"/8"). 6 filas + total.
- **Números clave:** total categoría IISS 6,590.93. SC SOLDADURA TERMOFUSION 1 glb = 2,485; TUBERIA PVC-SAL 6" 11 und = 1,724.58; TUBERIA PVC-SAL 8" 4 und = 1,338.98.
- **Propósito:** insumo de almacén (IISS) para el Registro de Almacén F07 del RO abril.
- **Origen -> Destino:** export S10 → F07 Almacén abril → RO abril.
- **Automatización:** módulo **Almacén (Importar Registro S10)**; archivo-fuente plano. OJO: mezcla MATERIALES y SUBCONTRATOS — al ingerir separar (solo MATERIALES al RO vía almacén; SC va por la pata facturas/subcontratos).

---

### \05. Gestión Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. Almacén\M.T._AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx — extracto de almacén categoría MOVIMIENTO DE TIERRAS (M.T.), corte 02.05.2026. ~10 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** Código/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos: BARRETA LISA, BOOGUIE, AFIRMADO, CABLE VULCANIZADO, GASOLINA 90, LAMPA CUCHARA, MANGUERA PVC, MENNEKES, PICO. (+11 filas).
- **Números clave:** AFIRMADO 200 m3 = 9,000; CABLE VULCANIZADO 3x12 1 rll = 796.61; GASOLINA 90 16.58 gal = 248.38.
- **Propósito:** insumo de almacén (movimiento de tierras) para el Registro de Almacén F07 del RO abril.
- **Origen -> Destino:** export S10 → F07 Almacén abril → RO abril.
- **Automatización:** módulo **Almacén (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES → RO.

---

## Resumen del chunk

- **16 archivos** fichados: 1 contable/tesorería (xls), 1 valorización F07/F01, 2 ISP (PRO-GCR-FOR-F01, una "superado" y una "_RO"), 1 Registro Almacén F07 (marzo), 1 Registro Facturas F07 (marzo), 1 RO F06 (marzo), 7 extractos de almacén por categoría de abril (6 xlsx + 1 png).
- **Cadena de datos del RO marzo:** F07 Valorización (EV) + F07 Reg. Almacén (AC materiales 936,317.23) + F07 Reg. Facturas (AC subcontratos 163,495.82) + ISP tareos (AC MO 386,873.25) + GG (227,347.41) = F06 RO, costo total registrado 1,714,033.71, margen 0.88.
- **Para RO abril:** los 6 xlsx de almacén por categoría son las fuentes crudas S10 que se consolidan en el próximo F07 Registro Almacén.
- **Códigos de formato detectados:** GP-GCE-FOR-F06 (RO), GP-GCE-FOR-F07 (Valorización, Registro Almacén, Registro Facturas), GP-GCE-FOR-F01 (APUs nuevos), PRO-GCR-FOR-F01 (ISP).
