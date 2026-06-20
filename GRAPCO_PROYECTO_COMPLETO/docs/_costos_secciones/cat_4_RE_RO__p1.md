# Catálogo Costos — Categoría 4. RE-RO (chunk p1)

Proyecto: CREDITEX — "PTAR PLANTA 5" (PTARI) + Nave. Contratista GRAPCO SAC, Supervisión Diseños Racionales SAC.
Cubre RO de DICIEMBRE 2025 y ENERO 2026, con todo su sustento (registros de almacén S10, valorizaciones de cliente F07, ISP semanales, registro de facturas/subcontratos, GG oficina, bancos).

Convención de partidas: frente `FA01`, código tipo `1001/1.01`, `Costo MO prom = 25` (S/25 por HH en estos archivos; la plataforma usa S/25.5).
Estructura típica registro almacén: `Código | Recurso | Unidad | Cantidad Atendida | Valorizado (Principal) | Valorizado (Secundaria) | Recurso N1/N2/N3` (Principal = costo real; Secundaria ≈ 29.7% — desdoble por frente/periodo).

---

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\ACERO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10 «PARTIDACONTROLCONSULTA» (insumo del F07). 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1).
- Contenido: consumo de almacén filtrado por la subcontrata/frente ACERO al corte 27.12.25. 10 líneas de recurso (acero corrugado fy=4200 grado 60, alambre negro N°16, arena gruesa, cemento Portland I APU, discos de corte, plástico azul, tiza). Columnas Código/Recurso/Unidad/Cantidad Atendida/Valorizado Principal/Valorizado Secundaria + jerarquía Recurso N1=MATERIALES, N2 (familia), N3 (subfamilia).
- Números clave: acero corrugado 5 var = 120.61; acero 30 var = 403.27; alambre N°16 1 rll = 305.77; cemento 10 bol = 241.53. (suma frente ACERO ≈ 1372.74 según RO).
- Propósito: sustento de costo de materiales del frente ACERO para armar el Registro de Almacén consolidado y el RO de diciembre.
- Origen -> Destino: S10 (almacén obra) -> hoja «4. ACE» del REGISTRO ALMACEN F07 -> CR/RO F06.
- Automatización: GRAPCO Almacén -> «Importar Registro S10» (líneas MATERIALES alimentan RO). Importador existente.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\CONCRETO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10 PARTIDACONTROLCONSULTA. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~19 filas).
- Contenido: consumo frente CONCRETO. Incluye concreto premezclado f'c=280 (4 m3) y f'c=100 (81 m3), cemento, clavos, discos, herramientas (boogie, lampa cuchara), mennekes.
- Números clave: CONCRETO PREMEZCLADO f'c=280 4 m3 = S/2,020; f'c=100 81 m3 = S/16,200; boogie 3 und = 597.46. (frente CONCRETO en RO ≈ 21,775.21).
- Propósito: sustento de materiales de concreto del mes.
- Origen -> Destino: S10 -> hoja «3. CON» del Registro Almacén -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\CURADO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, 4 filas).
- Contenido: frente CURADO. Mochila fumigadora (1 und = 144.07) y PER membrana curador 0.20 cil = 48. Fila de total al pie.
- Números clave: total frente CURADO = 192.07.
- Propósito: sustento materiales de curado.
- Origen -> Destino: S10 -> hoja «5. CUR» -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\ENCOFRADO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10. 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~7 filas).
- Contenido: frente ENCOFRADO. Clavos madera 3"/4", desmoldante metal (0.20 cil = 220), disco radial, escalera telescópica aluminio (669.49). Total al pie.
- Números clave: total frente ENCOFRADO = 1,118.30.
- Propósito: sustento materiales de encofrado.
- Origen -> Destino: S10 -> hoja «15. ENC» -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\GG.GG._AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10. 13 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~53 filas).
- Contenido: frente GASTOS GENERALES (EPP/seguridad y consumibles): caretas, barbiquejo, barra retráctil para cono, bloqueador, botas/botines PVC y cuero, cadena, etc. Recurso N2 mayormente SEGURIDAD INDUSTRIAL.
- Números clave: botines de cuero punta acero 17 par = 1,088; botas PVC 4 par = 158; barra retráctil 22 und = 275. (GG total en RO ≈ 15,060.87; CD del GG = 4,011.96).
- Propósito: sustento de consumos de GG de obra (seguridad/EPP).
- Origen -> Destino: S10 -> hoja «GG» del Registro Almacén -> RO (línea GASTOS GENERALES).
- Automatización: Almacén -> Importar Registro S10 (categoría GG).

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\MDT_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~18 filas).
- Contenido: frente Movimiento de Tierras (MDT/MT). Barreta lisa, boogie, cable vulcanizado 3x12, gasolina 90, lampa, manguera PVC, mennekes, pico, pulpo enchufe.
- Números clave: cable vulcanizado 1 rll = 796.61; boogie 3 = 597.46; pulpo 1 = 296.61. (frente MT en RO = 18,274.47).
- Propósito: sustento materiales/herramientas/combustible de movimiento de tierras.
- Origen -> Destino: S10 -> hoja «14. MT» -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\OP_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10. 13 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~44 filas).
- Contenido: «OP» = obras provisionales/operación general (campamento). Acero corrugado, adaptador PVC-SAP, alambre N°8, arenas fina/gruesa, bisagras, cable vulcanizado, cemento APU y SOL, etc.
- Números clave: cemento SOL 24 bol = 610.17; cemento APU 15 bol = 362.29; alambre N°8 1 rll = 348.52. (este consumo alimenta el frente PROVISIONALES = 47,833.15 del RO).
- Propósito: sustento materiales de obras provisionales/campamento.
- Origen -> Destino: S10 -> hoja «2. PRO» del Registro Almacén -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\RESUMEN_PC_AL_27_12_2025.png
- Tipo / formato: PNG (imagen) [.png - no-Excel]. 172 KB.
- Contenido: captura del resumen PartidaControl (RESUMEN_PC) al 27.12.25 — pantallazo de control de almacén S10. No legible por celdas en el volcado.
- Propósito: evidencia/respaldo visual del cierre de almacén.
- Origen -> Destino: pantallazo S10 -> carpeta sustento.
- Automatización: GAP (imagen). No se ingiere; archivado documental (Drive). El dato real va por los XLSX equivalentes.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de Almacén\DICIEMBRE\TP_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. Exportación S10. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~6 filas).
- Contenido: «TP» = topografía/trabajos preliminares. Ocre rojo, pintura esmalte 1/4, tiralíneas metálico, wincha metálica, yeso x18kg. Total al pie.
- Números clave: total = 195.76 (= frente PRELIMINAR del RO).
- Propósito: sustento materiales de topografía/preliminares.
- Origen -> Destino: S10 -> hoja «1. PRE» del Registro Almacén -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\3. Valorizaciones\1. Superado\GP-GCE-FOR-F07_VAL N°02 2025.12.30.xlsx
- Tipo / formato: xlsx — Valorización de cliente. Código GP-GCE-FOR-F07. 505 KB. (carpeta «1. Superado» = versión archivada/anterior).
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8.
- Contenido:
  - Carátula/RESUMEN: VAL N°02, mes DICIEMBRE 2025 (periodo 16–28 dic), obra PTAR PLANTA 5, cliente CREDITEX, residente Ing. Guido Gonzales, plazo 130 D.C.
  - 2. PAGOS: cronograma de pagos (5 págs).
  - 3. RES.VAL: resumen de valorizaciones con montos referenciales.
  - 4. VAL: detalle por ITEM/partida con PRESUPUESTO (und, cant, P.U., parcial), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL (cantidad/%/total). ~112 filas de partidas.
  - 5. RO: cruce con presupuesto F1 (PTARI): Total Costo de Obra, Costo Directo, valorización quincenal y acumulada por partida.
  - Hoja1: metrados auxiliares (longitud/alto/área). Hoja 8: cronograma de egresos por semana (con #REF!).
- Números clave: Presupuesto referencial 2,866,414.72 (inc IGV) / 2,429,165.02 (sin IGV); Costo Directo 1,785,339.08. RO: Total Costo de Obra Ppto F1 2,234,192.66; Val quincenal 90,573.50; Val acumulada 319,022.78; CD ppto 1,751,047.24 / val acum 250,033.92.
- Propósito: valorización contractual hacia el cliente (avance facturable) y su reflejo en el RO.
- Origen -> Destino: metrados de obra + presupuesto contractual -> VAL F07 -> hoja RO -> RO F06 (columnas EV/Valorizado).
- Automatización: GRAPCO Valorizaciones (cliente) + Curva S (F07). El bloque «5. RO» mapea a RO F06. Importador F07 existente.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL N°03 2025.12.30.xlsx
- Tipo / formato: xlsx — Valorización de cliente F07. 510 KB.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8 (misma plantilla que VAL N°02).
- Contenido: VAL N°03, mes ENERO 2026 (fecha doc 15-ene-2026), misma obra/cliente. 4. VAL ~133 filas. 5. RO con avance acumulado mayor.
- Números clave: Presupuesto referencial 2,866,414.72 (inc IGV); CD 1,785,339.08. RO: Total Costo de Obra Ppto F1 2,260,561.97; Val quincenal 33,537.13; Val acumulada 351,536.41; CD val acum 276,403.23.
- Propósito: valorización N°03 al cliente y actualización del RO.
- Origen -> Destino: presupuesto + metrados -> VAL F07 -> RO F06.
- Automatización: Valorizaciones + Curva S; bloque «5. RO» -> RO F06.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL-ADICIONALES N°01,02,03 2025.12.30.xlsx
- Tipo / formato: xlsx — Valorización de ADICIONALES F07. 472 KB.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8.
- Contenido: Valorización de Adicionales N°02 (mes DICIEMBRE), presupuestos «ADICIONALES N°06, N°07 y N°08». 4. VAL ~54 filas. 5. RO con columna PTARI.
- Números clave: Costo Directo adicionales = 12,769.22; RO Total Costo de Obra adicional = 16,149.07 (val acum 16,149.07); CD 12,769.22; partida 1001 Preliminares 263.96.
- Propósito: valorizar trabajos adicionales aprobados (PQ-01/PQ-02) hacia el cliente y reflejarlos en el RO.
- Origen -> Destino: presupuestos adicionales -> VAL Adicionales F07 -> RO F06 columnas Adicionales (PV/EV Adicionales).
- Automatización: GRAPCO Adicionales/Deductivos + Valorizaciones. Mapea a columnas «Adicionales» del RO F06.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM 08_RO REV.01.xlsx
- Tipo / formato: xlsx — Informe Semanal de Producción (ISP). Código PRO-GCR-FOR-F01. 1,950 KB. REV.01.
- Hojas: PARTIDAS CONTROL | CR | ISP-SEM08 ... ISP-SEM01 (10).
- Contenido:
  - PARTIDAS CONTROL: catálogo de partidas de control con código (1001 Trabajos Preliminares, SSO, andamios, señalización, etc.) y unidad. Fuente única de estructura del ISP.
  - CR: control de recursos por tareos. Encabezado «Costo MO prom: 25». Columnas HH | COSTO | ACUM S/IGV por partida/frente.
  - ISP-SEMnn (SEM01 a SEM08): por partida METRADO/HH/IP en bloques PREVISIÓN (PPTO oferta, adicionales, total, ppto meta), ACUMULADO ANTERIOR, día a día (Lun–Dom), PRESENTE SEMANA, y META/VAR/CPI. Semanas: S01=03–09 nov ... S08=22–28 dic 2025.
- Números clave: CR Total Costo de Obra HH 2,355 / costo 34,537.50 / acum 58,875; CD HH 2,251 / 31,937.50 / 56,275. Preliminares HH 593.25. ISP-SEM08 presente semana META 520.49 vs 493.50 HH (CPI 1.05); acumulado meta 2,282.96 vs 2,355 (CPI 0.97).
- Propósito: medir productividad (IP = HH/metrado) y CPI de mano de obra por partida y semana; fuente del costo de MO (HH x tarifa) que entra al RO.
- Origen -> Destino: tareos diarios de campo + metrados -> ISP semanal -> CR (HH y costo) -> RO F06 (Actual Cost de MO) y CPI.
- Automatización: GRAPCO ISP (tareos HH x S/25.5) + RO/CR + EVM. Tareos = fuente Registros_Campo. Importador ISP (pendiente ISP_Semanal según memoria).

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2025.12.27.xlsx
- Tipo / formato: xlsx — Registro de Almacén consolidado. Código GP-GCE-FOR-F07. 391 KB. Corte 27.12.25 / Semana 13.
- Hojas (18): CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG.
- Contenido:
  - CR: matriz partida x frente (ACUM S/IGV mensual y por categoría 1.PRELIMINAR..15 ENCOFRADO, GG). Es el consolidado madre.
  - Analisis: detalle de costos con CONTROL y DELTA (deltas acumulados, clave para importador F07 acumulado).
  - Data: ~573 filas — todos los recursos consolidados (Código/Recurso/Unidad/Cant/Costo/Valorizado Secundaria/Recurso N1 + COMENTARIO1/2). Algunas celdas con fórmulas (`+'1. PRE'!O7`).
  - Hojas 1.PRE..GG: cada frente con su sub-tabla de partidas + sub-tabla «Análisis detalle de costos» + listado de recursos del frente.
- Números clave: Total Costo de Obra 105,822.57 (mensual); Costo Directo 94,280.66. Por frente: PRELIMINAR 195.76, PROVISIONAL 47,833.15, CONCRETO 21,775.21, ACERO 1,372.74, CURADO 192.07, MT 18,274.47, ENCOFRADO 1,118.30, GG 15,060.87 (CD GG 4,011.96). Analisis: Total 117,237.37; delta Preliminares 42.37.
- Propósito: consolidar todo el consumo de almacén del mes por partida/frente; es la pata «materiales» del RO (Actual Cost).
- Origen -> Destino: XLSX por frente (S10) -> este consolidado F07 -> hoja CR -> RO F06 (columna REGISTRO ALMACEN).
- Automatización: GRAPCO Almacén -> «Importar Registro S10» (maestros F07 ACUMULADOS — calcula deltas; solo líneas MATERIALES al RO). Importador existente.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2025.12.31.xlsx
- Tipo / formato: xlsx — Registro de Facturas (subcontratos/proveedores). Código GP-GCE-FOR-F07. 77 KB. Corte 31.12.25.
- Hojas (3): RESUMEN | CR | 14. MT.
- Contenido:
  - RESUMEN: por frente y PROVEEDOR (AMSA, SOLCONER, RECOSA, CONSTRUCTORA TINOZ, RJ&H, CONSORCIO SA&ES, A&CR, EFCO, NOPIN) con MONTO SIN IGV/IGV/CON IGV (varios #N/A).
  - CR: matriz partida x frente, REGISTRO DE FACTURAS, ACUM/MENSUAL al 30.11 y 31.12.
  - 14. MT: cuadro de valorizaciones de subcontrato de movimiento de tierras (subcontratista R PROYECTOS, RUC 20483973951), con FACTURA/VAL/DESCRIPCION/MONTO/PAGADO/FECHA, amortización/deducción/saldo por deducir.
- Números clave: Total Costo de Obra = Costo Directo = 87,499.95 (mensual y acum, todo en MT). MT factura E001-684 R PROYECTOS VAL1 44,592.48 sin IGV / 52,619.13 con IGV (PAGADO SI); VAL2 42,907.47 / 50,630.82 (NO). Monto contractual MT 65,761.05 inc IGV / 55,729.70 sin IGV; saldo por deducir 12,822.
- Propósito: controlar costo real por facturas de proveedores/subcontratistas (pata «facturas» del AC en el RO) y valorización de subcontratos.
- Origen -> Destino: facturas/valorizaciones de subcontrato -> Registro Facturas -> hoja CR -> RO F06 (columna REGISTRO FACTURAS del AC).
- Automatización: Importador genérico in-app para el registro de facturas. Valorización de Subcontratistas (F10/F11) es GAP conocido — proponer módulo de subcontratos.

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO GG OFICINA_acumulado_31_12.xlsx
- Tipo / formato: xlsx — Registro de Gastos Generales de Oficina (acumulado). Código GP-GCE-FOR-F07. 41 KB.
- Hojas (1): REG. GG OFICINA_30.04.
- Contenido: matriz partida (FA01/1.01..) x mes (ACUM S/IGV y MENSUAL desde 31.12.24 hasta 31.12.25), con columnas finales separando PRECOTEX y CREDITEX. GG de oficina (no de obra) prorrateados al proyecto.
- Números clave: Total Costo de Obra acum (multiproyecto) 1,155,655.10; mensuales por mes (ej. 31.01.25 100,747.75; 30.04.25 72,414.28; etc.). En el RO de dic., el GG oficina aporta el resto de GG (RO CR Total GG oficina 46,324.76; CD 0).
- Propósito: distribuir gastos generales de oficina (indirectos) al RO del proyecto.
- Origen -> Destino: contabilidad/GG oficina GRAPCO -> este acumulado -> hoja CR del RO (columna GASTOS GENERALES - OFICINA).
- Automatización: GRAPCO RO — pata GG. Importador genérico (columna GG oficina del RO). Requiere prorrateo PRECOTEX/CREDITEX por proyecto (aislamiento).

### \05. Gestión Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2025.12.27.xlsx
- Tipo / formato: xlsx — RESULTADO OPERATIVO (RO). Código GP-GCE-FOR-F06. 599 KB. Rev 1, mes reporte 31-dic-2025.
- Hojas (6): RO | CR | Adicionales | Deductivos | Leyenda | GG.
- Contenido:
  - RO: tablero EVM por partida/frente. Presupuesto (Ppto F1 PTARI, Ppto F2 Nave, Deductivos, Adicionales, BAC), Avance Programado (PV F1/F2/Deduc/Adic = Plan Value), Valorizado (Val F1/F2/Deduc/Adic = Earned Value), Costo Real (AC), CV margen, CPI, Saldo teórico/costo por ejecutar, EAC, VAC, SPI.
  - CR: cuadro de control que cruza las 4 patas del AC — REGISTRO FACTURAS + REGISTRO ALMACEN + CONTROL TAREOS + GASTOS GENERALES = TOTAL REGISTRO; más HH F1/F2/Total. Encabezado «Costo MO prom: 25».
  - Adicionales / Deductivos: presupuesto y avance (programado/valorizado) PQ-01/PQ-02 por partida.
  - Leyenda: glosario EVM (PV, EV, AC, BAC, EAC, ETC, CV, SV, CPI, SPI con fórmulas).
  - GG: análisis de gastos generales (CD, GG variables/fijos, utilidad) — con #REF!.
- Números clave: BAC Total 2,264,073.57 (Ppto F1 2,247,877.45 + Adicionales 16,149.07; F2/Deduc 0). Plan Value 335,171.84; Earned Value 359,237.88; Actual Cost 298,522.28; CV 60,715.60; CPI 1.20; EAC 2,203,357.97; VAC 60,715.60; SPI 1.07. AC desglosado: Facturas 87,499.95 + Almacén 105,822.57 + Tareos 58,875 + GG 46,324.76 = 298,522.28. HH total 2,355. GG: variables 687,204.96; fijos 55,779.20; utilidad 0.11.
- Propósito: documento maestro de control de costos — resultado operativo del proyecto con EVM (margen, CPI, proyección EAC/VAC). Es el entregable final que consolida todo el sustento del chunk.
- Origen -> Destino: Registro Almacén F07 + Registro Facturas + ISP/CR (tareos) + GG oficina + Valorizaciones F07 -> RO F06 -> Dashboard RO.
- Automatización: GRAPCO Resultado Operativo (RO/CR/F06 + EVM) — núcleo ya vivo y automático (useRO). BAC desde Presupuesto; Val desde Valorizaciones; AC desde Almacén+Facturas+ISP+GG. Es el destino de prácticamente todos los demás archivos del chunk.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\ACERO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10 PARTIDACONTROLCONSULTA. 10 KB. (carpeta «ENERO 2025» — corte 31.01.2026).
- Hojas: PARTIDACONTROLCONSULTA (1, ~10 filas).
- Contenido: acumulado frente ACERO a enero. Incluye ACERO DIMENSIONADO corte y doblado por diámetros (1", 1/2", 3/4", 5/8", 3/8") en toneladas — gran salto vs diciembre.
- Números clave: acero dimensionado 1" 37.79 ton = 117,075.40; 5/8" 30.85 ton = 95,561.93; 1/2" 4.81 ton = 14,879.25; 3/4" 3.17 ton = 9,811.56; 3/8" 2.76 ton = 8,563.30. Acero corrugado 64 var = 1,540.99.
- Propósito: sustento materiales acero (mes enero, fuerte consumo de acero habilitado).
- Origen -> Destino: S10 -> Registro Almacén F07 enero -> RO enero.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\CONCRETO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~19 filas).
- Contenido: frente CONCRETO enero. Premezclados f'c=350 (108 m3), f'c=100 (57 + 193.50 m3), f'c=280 (4 m3), cemento, cincel SDS, clavos, arena.
- Números clave: f'c=350 108 m3 = 93,597.67; f'c=100 193.50 m3 = 38,700; f'c=100 57 m3 = 11,400; f'c=280 4 m3 = 2,020.
- Propósito: sustento materiales concreto enero.
- Origen -> Destino: S10 -> Registro Almacén F07 enero -> RO enero.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\CR_31.01.2026.png
- Tipo / formato: PNG (imagen) [.png - no-Excel]. 238 KB.
- Contenido: captura del cuadro de control (CR) de almacén al 31.01.2026. No legible por celdas.
- Propósito: evidencia visual del cierre de almacén de enero.
- Origen -> Destino: pantallazo S10/CR -> sustento.
- Automatización: GAP (imagen) — archivado documental; el dato va por los XLSX.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\CURADO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, 4 filas).
- Contenido: frente CURADO enero. Mochila fumigadora (144.07) + PER membrana 0.50 cil = 120. Total al pie.
- Números clave: total = 264.07.
- Propósito: sustento materiales curado enero.
- Origen -> Destino: S10 -> Registro Almacén F07 -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\ENCOFRADO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~11 filas).
- Contenido: frente ENCOFRADO enero. Alambre N°8, clavos madera 2"/3"/4", desmoldante (0.50 cil = 550), disco radial, escalera telescópica, lija, y línea SUBCONTRATOS Y SERVICIOS (SC alquiler de puntales metálicos 2.50 — Recurso N1 = SUBCONTRATOS).
- Números clave: desmoldante 0.50 cil = 550; escalera telescópica 669.49; SC puntales 81.36.
- Propósito: sustento materiales/SC encofrado enero.
- Origen -> Destino: S10 -> Registro Almacén F07 -> RO.
- Automatización: Almacén -> Importar Registro S10 (incluye líneas SUBCONTRATOS Y SERVICIOS).

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\GG.GG._AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 14 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~78 filas).
- Contenido: frente GG enero (EPP/seguridad, acumulado mayor que dic). Caretas, baldes, barbiquejo (39 und), barra retráctil, bloqueador, botas/botines (31 par), cadena, etc.
- Números clave: botines cuero 31 par = 1,984; botas PVC 10 par = 395; barbiquejo 39 = 74.10.
- Propósito: sustento consumos GG seguridad enero.
- Origen -> Destino: S10 -> Registro Almacén F07 -> RO (línea GG).
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2025.12.27.xlsx
- Tipo / formato: xlsx — Registro de Almacén consolidado F07. 391 KB. (NOTA: archivo con fecha 2025.12.27 ubicado en carpeta enero — parece copia de arrastre del consolidado de diciembre, mismos totales; aún no actualizado a enero).
- Hojas (18): CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG (idéntica estructura al de diciembre).
- Contenido: mismo consolidado que el F07 de diciembre (CR/Analisis/Data + hoja por frente). Corte 27.12.25, semana 13.
- Números clave: idénticos al consolidado de dic. — Total 105,822.57; CD 94,280.66; por frente PROVISIONAL 47,833.15, CONCRETO 21,775.21, MT 18,274.47, GG 15,060.87, etc. Analisis Total 117,237.37 (delta Preliminares 42.37).
- Propósito: base del Registro de Almacén para el RO de enero (pendiente de actualizar con consumos de enero).
- Origen -> Destino: S10 -> consolidado F07 -> RO enero.
- Automatización: Almacén -> Importar Registro S10 (acumulado, deltas). GAP de proceso: duplicado de archivo / falta refresco — el importador acumulado lo resolvería al subir la cadena completa.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\MT_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~20 filas).
- Contenido: frente MT enero. Barreta, boogie, cable vulcanizado, gasolina 90 (8.81 gal), lampa, manguera PVC, mennekes, pico, pulpo.
- Números clave: cable vulcanizado 796.61; boogie 597.46; pulpo 296.61; gasolina 8.81 gal = 109.21.
- Propósito: sustento materiales/combustible MT enero.
- Origen -> Destino: S10 -> Registro Almacén F07 -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\OP_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 12 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~50 filas).
- Contenido: frente OP/provisionales enero. Acero corrugado, adaptador PVC, alambre N°8, arenas, bisagras, cable vulcanizado, cemento APU/SOL, etc.
- Números clave: cable vulcanizado 796.61; cemento SOL 24 bol = 610.17; cemento APU 15 bol = 362.29.
- Propósito: sustento materiales obras provisionales/campamento enero.
- Origen -> Destino: S10 -> Registro Almacén F07 (2. PRO) -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\TP_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~6 filas).
- Contenido: frente topografía/preliminares enero. Ocre rojo (3 kg), pintura esmalte, tiralíneas, wincha, yeso. Total al pie.
- Números clave: total = 231.35.
- Propósito: sustento materiales topografía enero.
- Origen -> Destino: S10 -> Registro Almacén F07 (1. PRE) -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. Almacén\ENERO 2025\VESTRUCTURAS_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. Exportación S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, 4 filas).
- Contenido: frente VARIOS ESTRUCTURAS enero. AE Bentobar (30 m = 795.22) y Primer Bentobar (5 l = 300) — water stop / sello. Total al pie.
- Números clave: total = 1,095.22.
- Propósito: sustento materiales varios estructuras (water stop) enero.
- Origen -> Destino: S10 -> Registro Almacén F07 (6. VAR EST) -> RO.
- Automatización: Almacén -> Importar Registro S10.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Enero.xls
- Tipo / formato: xls (Excel binario, contable) — Registro de Bancos / movimientos financieros GRAPCO. 15,816 KB (muy pesado).
- Hojas (7): Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen.
- Contenido:
  - Datos: parámetros (RUC 20203071702 GRAPCO, IGV 0.18, tasa retención honorarios 0.08), cuentas bancarias (Crédito Soles 193-2080045-0-54 saldo 92,839.39; Crédito Dólares; Nación; cuentas Precotex/Caja/Creditex) y plan contable Concar.
  - Ingresos_diario (~4,075 filas, desde 2023): facturas/notas de crédito por cliente (UVI TECH, PRECOTEX, COMPAÑIA INDUSTRIAL ROMOSA, etc.), monto, IGV, detracción, mes.
  - egresos_diario (~3,002 filas): egresos por proveedor/concepto (publicidad, capacitación...), IGV/detracción/retención.
  - gastos (~1,265 filas): facturas de gasto por rubro (Logística, Renta_3era, Bancos, IGV) y proveedor (SUNAT, etc.).
  - RRHH (~996 filas): planilla/aportes (Essalud, ONP, AFP Habitat/Integra, Renta 4ta/5ta, Personal), proveedor INTERCONTACT SAC.
  - Bancos (~25,699 filas): extracto banco por banco (Cargo/Abono/Saldo, observaciones) — incl. cuotas sindicales, detracciones, compras de dólares, pagos a proveedores (ej. GESTION MADERERA F001-26637).
  - Almacen (~1,054 filas): kardex de mercadería antiguo (libros/polos/kits) — data legacy de otra línea de negocio.
- Números clave: saldo inicial Crédito Soles 92,839.39; total cuentas iniciales 97,926.12. Ingresos ejemplo PRECOTEX E001-131 448,855.81; gasto Renta_3era 499,030; planilla INTERCONTACT 38,344.44. (Sin total global en el volcado).
- Propósito: contabilidad/tesorería de GRAPCO (multiempresa/multiproyecto). Fuente para FLUJO DE CAJA, control de planilla y conciliación de pagos a proveedores/subcontratos.
- Origen -> Destino: sistema contable (Concar) / banca -> registro de bancos -> alimenta Flujo de Caja y validación de pagos del RO.
- Automatización: GAP — Flujo de Caja y Control de Planilla son gaps conocidos. Requeriría importadores específicos (Ingresos/Egresos/Bancos/RRHH) y filtrado por proyecto (CREDITEX) ya que el archivo es multiempresa. No mapea a módulos actuales; archivo muy pesado (.xls binario) — necesita pre-proceso.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL N°04.xlsx
- Tipo / formato: xlsx — Valorización de cliente F07. 524 KB.
- Hojas (8): Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8 (misma plantilla F07).
- Contenido: VAL N°04, mes ENERO 2026 (periodo 16–31 ene, fecha 30-ene-2026). 4. VAL ~184 filas (más partidas activas). 5. RO con avance acumulado fuerte.
- Números clave: Presupuesto referencial 3,061,736.74 (inc IGV) — subió por adicionales; CD 1,915,342.93. RO: Total Costo de Obra Ppto F1 2,422,311.29; Val quincenal 548,394.09; Val acumulada 1,141,789.55; CD val acum 902,823.08. SSO acum 25,217.93.
- Propósito: valorización N°04 al cliente (gran avance de enero) y actualización del RO.
- Origen -> Destino: presupuesto + metrados -> VAL F07 -> RO F06.
- Automatización: GRAPCO Valorizaciones + Curva S; bloque «5. RO» -> RO F06.

### \05. Gestión Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM13 .xlsx
- Tipo / formato: xlsx — Informe Semanal de Producción (ISP). Código PRO-GCR-FOR-F01. 3,121 KB.
- Hojas (16): PARTIDAS CONTROL | CR | Control | ISP-SEM13 ... ISP-SEM01.
- Contenido:
  - PARTIDAS CONTROL: catálogo de partidas de control (igual que SEM08).
  - CR: HH/COSTO/ACUM por partida, corte 31-ene-2026. «Costo MO prom: 25».
  - Control: cuadro comparativo ADMINISTRACIÓN (HH planilla) vs CAMPO (HH campo/ISP) por SEMANA, con DELTA HH ADM vs CAMPO — cruce planilla vs tareos.
  - ISP-SEM01..SEM13: METRADO/HH/IP por partida y día, META/VAR/CPI semanal y acumulado. S13 = 26 ene–01 feb 2026.
- Números clave: CR Total Costo de Obra HH 6,477.50 / costo 108,700 / acum 161,937.50; CD HH 6,282.50 / 103,825 / 157,062.50. Preliminares HH 1,772.75 (SSO 398.25 = 9,956.25; Topografía 451.50 = 11,287.50). Control: HH planilla acum 6,492.50 vs HH campo 6,477.50 (delta 15 ≈ capataz/no productivo). ISP-SEM13 presente semana 875.54 meta vs 869 HH (CPI 1.01); acumulado meta 5,762.55 vs 6,477.50 HH (CPI 0.89).
- Propósito: productividad (IP/CPI) y costo de MO acumulado del proyecto; concilia HH planilla vs HH campo (Control) — base del AC de mano de obra del RO.
- Origen -> Destino: tareos diarios + planilla -> ISP semanal + hoja Control -> CR -> RO F06 (AC tareos / CPI).
- Automatización: GRAPCO ISP (tareos HH x S/25.5) + RO/CR + EVM. Hoja Control es insumo para conciliar con Control de Planilla (gap). Tareos = Registros_Campo. Importador ISP_Semanal pendiente.
