# CATALOGO 7. Valorizaciones (cont. 3) — Fichas detalladas

Proyecto: CREDITEX (PTARI Planta 5 + Nave Metalica / proyecto previo "Ampliacion Precotex Las Moreras").
Contratista: GRAPCO SAC. Supervisor: DIRAC (DISENOS RACIONALES SAC) / HIGASHI (en Moreras).
Este chunk reune valorizaciones de ADICIONALES al cliente y, sobre todo, valorizaciones de SUBCONTRATISTAS (formato F10/F11 + plantilla PRO-GCE-FOR-VAL).

---

### \05. Gestion Costos\7. Valorizaciones\1. Cliente\2. Adicionales\GP-GCE-FOR-F07_VAL-ADICIONALES N°06,07,08 2025.12.30.xlsx
- Tipo / formato: xlsx — GP-GCE-FOR-F07 (cronograma de pagos / valorizacion al cliente). Es VALORIZACION DE ADICIONALES N°02 (paquete que agrupa Adicionales N°06, N°07 y N°08).
- Hojas (8): Caratula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8
- Contenido:
  - Caratula: identifica obra "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; "VALORIZACION DE ADICIONALES N°02", Revision N°01, fecha 02-ene-2026.
  - 1. RESUMEN: ficha del adicional N°02, mes DICIEMBRE-2025; obra/cliente CREDITEX; supervision DISENOS RACIONALES SAC; contratista GRAPCO SAC; residente ING. GUIDO GONZALES; presupuesto referencial inc/IGV; plazo 130 D.C.
  - 2. PAGOS: cronograma de pagos (cod GP-GCE-FOR-F07, version 0, pag 1 de 5); presupuesto = ADICIONALES N°06,07,08; valorizacion N°2; periodo DICIEMBRE (del 16-dic al 31-dic-2025).
  - 3. RES.VAL: resumen de valorizaciones del adicional; monto referencial (inc/no IGV); COSTO DIRECTO 39138.52.
  - 4. VAL: detalle de valorizacion adicionales N°02; partida CONTRACTUAL (PTARI), plazo 130 dias; columnas PRESUPUESTO (UND/CANT/P.U./PARCIAL), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL (cada uno con CANTIDAD/%/TOTAL).
  - 5. RO: tabla de Resultado Operativo del adicional por FRENTE/PARTIDA/Descripcion (PRE1..., FA01, partidas 1.01 Seguridad, 1.02 Topografia...); columnas Ppto F1 PTARI / Valorizacion Quincenal / Valorizacion Acumulada (S/.). TOTAL COSTO DE OBRA 10359.50 (varias celdas #DIV/0! por divisor vacio).
  - Hoja1: metrados auxiliares (LONGITUD/ALTO/AREA) — area total 286.80 m2.
  - Hoja 8: cronograma/curva por SEMANAS (Sem 1..Sem 24) de EGRESOS por rubro (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...); en su mayoria 0 / #REF!.
- Numeros clave: COSTO DIRECTO adicional 39138.52; TOTAL COSTO DE OBRA (RO) 10359.50; area 286.80 m2; plazo 130 D.C.
- Proposito: valorizar al cliente CREDITEX el paquete de Adicionales N°06/07/08 (deductivos/adicionales de obra) y su cronograma de pago.
- Origen -> Destino: sale del presupuesto de adicionales + metrados de obra; alimenta el cobro al cliente y el RO de adicionales.
- Automatizacion: modulo GRAPCO Adicionales/Deductivos + Valorizaciones (cliente). El F07 ya esta mapeado a Curva S/valorizacion. Ingerir via importador generico in-app (hojas 4.VAL y 5.RO).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\1. SC Mov Tierras_R Proyectos\RPROYECTOS_AD_VAL Nº03.xlsx
- Tipo / formato: xlsx — Val de subcontratista, F11 (hoja de ruta STANDARD) + plantilla PRO-GCE-FOR-VAL. SC Movimiento de Tierras, R PROYECTOS SAC (RUC 20483973951). Es la VAL N°03 / Adicional.
- Hojas (6): STANDARD | RESUMEN | VAL | SUSTENTO | R PROYECTOSAdicional | Cantidades
- Contenido:
  - STANDARD: HOJA DE RUTA - SUBCONTRATO (GP-GCE-FOR-F11, Rev.01), VBs de campo/calidad/SSOMA, N° valorizacion, OS.
  - RESUMEN: cuadro resumen de valorizaciones; proyecto "Ampliacion Precotex Las Moreras", cliente GRAPCO, supervisor HIGASHI, val 3, mes ENERO; MONTO CONTRACTUAL 3815.62 (inc IGV) / 3233.58 (no IGV); MONTO FACTURADO 2949.79; amortizacion 0; deduccion 0; saldo por deducir 284.
  - VAL: valorizacion de obra N°3 (PRO-GCE-FOR-VAL v01); servicio SUBCONTRATO MOV TIERRAS; periodo ENERO; Costo Total Actualizado 3233.58.
  - SUSTENTO: sustento de salida de volquetes; factor esponj. 0.30; TOTAL ELIMINADO 2998 m3, TOTAL EXCAVADO MASIVO 2306.15 m3; detalle por viaje (N°, fecha, placa ANJ-776, interna/externa, vol m3), separado por VAL1/VAL2.
  - R PROYECTOSAdicional: valorizacion de obra N°03 "Mov. Tierras PTAR Creditex"; VALOR ORIGINAL/ACTUAL S/ 3233.44; columnas CONTRATO/ACUM ANTERIOR/PRESENTE PERIODO/ACUM ACTUAL/SALDO (UND/CANT/PU/%/MONTO); total 3079.47.
  - Cantidades: tabla de viajes (Item, Fecha, Volquete, Capacidad m3, N° viajes, Descripcion, N° reporte, total m3, CONDICION, observaciones).
- Numeros clave: contractual 3233.58 (no IGV); facturado 2949.79; saldo deducir 284; eliminado 2998 m3; excavado 2306.15 m3.
- Proposito: control y pago de la valorizacion de movimiento de tierras del SC R Proyectos, con sustento de m3 eliminados.
- Origen -> Destino: sale de reportes de volquetes/cantidades de campo; alimenta el costo real de la partida mov. tierras en el RO (pata Subcontratos) y el pago al SC.
- Automatizacion: GAP — Valorizacion de Subcontratistas (F10/F11) no existe como modulo. Por ahora ingerir hoja VAL/RESUMEN via importador generico hacia el RO como costo de subcontrato; el sustento de m3 podria validar metrado de mov. tierras.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\1. SC Mov Tierras_R Proyectos\RPROYECTOS_VAL Nº01.xlsx
- Tipo / formato: xlsx — Val de subcontratista F11 + PRO-GCE-FOR-VAL. SC Mov Tierras R PROYECTOS. VAL N°01.
- Hojas (4): STANDARD | RESUMEN | VAL | Hoja 2
- Contenido:
  - STANDARD: hoja de ruta F11.
  - RESUMEN: proyecto Precotex Las Moreras, cliente GRAPCO, supervisor HIGASHI, val 1, mes DICIEMBRE; CONTRACTUAL 65761.05 (inc) / 55729.70 (no IGV); facturado 0; saldo por deducir 55730.
  - VAL: valorizacion N°1, periodo DICIEMBRE; Costo Total Actualizado 55729.70.
  - Hoja 2: sustento de salida de volquetes; factor esponj 0.30; TOTAL ELIMINADO 1530 m3, TOTAL EXCAVADO MASIVO 1176.92 m3; detalle de viajes.
- Numeros clave: contractual 55729.70 (no IGV); facturado 0; saldo 55730; eliminado 1530 m3; excavado 1176.92 m3.
- Proposito: primera valorizacion del SC mov tierras (aun sin facturar).
- Origen -> Destino: reportes de volquetes -> costo real partida mov. tierras (RO) / pago SC.
- Automatizacion: GAP Valorizacion de Subcontratistas; ingerir via importador generico hacia RO (costo subcontratos).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\1. SC Mov Tierras_R Proyectos\RPROYECTOS_VAL Nº02.xlsx
- Tipo / formato: xlsx — Val de subcontratista F11 + PRO-GCE-FOR-VAL. SC Mov Tierras R PROYECTOS. VAL N°02 (incluye hoja del Adicional/Val03).
- Hojas (7): STANDARD | RESUMEN | VAL | SUSTENTO | R PROYECTOS (Val N° 02) | R PROYECTOS (Cantidades) | Adicional
- Contenido:
  - RESUMEN: val 2, mes ENERO; CONTRACTUAL 106921.31 (inc) / 90611.28 (no IGV); facturado 46018.80; saldo por deducir 44592.
  - VAL: valorizacion N°2, periodo ENERO; Costo Total Actualizado 90611.28.
  - SUSTENTO: salida de volquetes; factor 0.30; ELIMINADO 2998 m3 / EXCAVADO 2306.15 m3; detalle VAL1/VAL2.
  - R PROYECTOS (Val N° 02): valorizacion de obra N°02; VALOR ORIGINAL/ACTUAL 55729.71; total contrato 53075.91; acum anterior 42469.03; presente 43827.43; acum actual 86296.46; saldo -33220.55 (sobre-valorizacion vs contrato base).
  - R PROYECTOS (Cantidades): viajes con columnas extra N°VAL/DESCRIPCION (INTERNA/EXTERNA)/ESTADO (FALTA VERIFICAR / COMPROBADO).
  - Adicional: valorizacion N°03 del adicional, valor 3233.44, total 3079.47.
- Numeros clave: contractual 90611.28; facturado 46018.80; saldo 44592; acum actual SC 86296.46; saldo vs contrato -33220.55; eliminado 2998 m3.
- Proposito: segunda valorizacion mov tierras + arrastre del adicional; control de m3 verificados.
- Origen -> Destino: reportes volquetes/campo -> costo subcontrato en RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\1. Superado\GP-GCE-FOR-F10_M&M NAVE VAL Nº02.xlsx
- Tipo / formato: xlsx — GP-GCE-FOR-F10 (Val Subcontratista) + PRO-GCE-FOR-VAL. SC Estructuras Metalicas, M&M (RUC 20551531326). Version en carpeta "Superado" (reemplazada).
- Hojas (2): RESUMEN | VAL
- Contenido:
  - RESUMEN: proyecto PTARI Planta 5 - CREDITEX, cliente GRAPCO, supervisor DIRAC, val 2, mes MAYO; CONTRACTUAL 543666.98 (inc) / 460734.73 (no IGV); facturado 338280.37; AMORTIZACION 48298.68; saldo por deducir 122454.
  - VAL: encabezado "ADELANTO N°...1" + ESTADO DE PAGO N°2; servicio estructuras metalicas; campos de Adelantos N°01/02/03 y Tipo de Cambio.
- Numeros clave: contractual 460734.73 (no IGV); facturado 338280.37; amortizacion 48298.68; saldo 122454.
- Proposito: valorizar el SC de estructuras metalicas de la Nave (version superada de la val 2).
- Origen -> Destino: avance estructuras metalicas -> costo subcontrato RO (Nave) / pago SC con amortizacion de adelanto.
- Automatizacion: GAP Val Subcontratistas (incluye gestion de adelantos/amortizacion). Importador generico -> RO Nave. Marcar como version superada (no contar doble con la VAL final).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\GP-GCE-FOR-F10_M&M NAVE VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Estructuras Metalicas M&M. VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes MAYO; CONTRACTUAL 543666.98 (inc)/460734.73 (no IGV); facturado 198140.45; AMORTIZACION 117770.83; saldo por deducir 262594. VAL = ADELANTO/Estado de pago N°1 con campos de adelantos.
- Numeros clave: contractual 460734.73; facturado 198140.45; amortizacion 117770.83; saldo 262594.
- Proposito: primera valorizacion del SC estructuras metalicas Nave.
- Origen -> Destino: avance estructuras -> costo subcontrato RO Nave / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO Nave.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\GP-GCE-FOR-F10_M&M NAVE VAL Nº02.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Estructuras Metalicas M&M. VAL N°02 (version vigente).
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MAYO; CONTRACTUAL 543666.98/460734.73; facturado 318635.48; AMORTIZACION 59232.41; saldo por deducir 142099. VAL = Estado de pago N°2.
- Numeros clave: facturado 318635.48; amortizacion 59232.41; saldo 142099.
- Proposito: segunda valorizacion (vigente) del SC estructuras metalicas Nave.
- Origen -> Destino: avance estructuras -> costo subcontrato RO Nave / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO Nave.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\GP-GCE-FOR-F10_M&M NAVE VAL Nº03.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Estructuras Metalicas M&M. VAL N°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes JUNIO; CONTRACTUAL 543666.98/460734.73; facturado 391451.39; AMORTIZACION 22467.34; saldo por deducir 69283. VAL = VALORIZACION N°3 (ya no "adelanto").
- Numeros clave: facturado acum 391451.39 (85% del contractual no IGV); amortizacion 22467.34; saldo 69283.
- Proposito: tercera valorizacion del SC estructuras metalicas Nave (avance acumulado alto).
- Origen -> Destino: avance estructuras -> costo subcontrato RO Nave / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO Nave.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\11. SC ORANGE\GP-GCE-FOR-F10_PRUEBA DE LANZA SECA VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Prueba de Lanza Seca, ORANGE INDUSTRIES (RUC 20608928431). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes MAYO; CONTRACTUAL 5310 (inc)/4500 (no IGV); facturado 4500; saldo 0; CD VENTA 6096.23 (compara costo SC vs venta -> margen). VAL = valorizacion N°1.
- Numeros clave: contractual 4500 (no IGV); facturado 4500 (100%); CD VENTA 6096.23.
- Proposito: valorizar/pagar el servicio de prueba de lanza seca (proteccion contra incendios).
- Origen -> Destino: servicio prestado -> costo subcontrato RO / pago SC. CD VENTA = referencia de margen.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. El CD VENTA vs CD SC alimenta margen por partida.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC EFCO (alquiler de encofrados/andamios) (RUC 20604506388). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes FEBRERO; servicio "SUBCONTRATO DE ALQUILER DE ANDAMIOS"; CONTRACTUAL 1287.97 (inc)/1091.50 (no IGV); facturado 1091.50; saldo 0; CD VENTA 8258.11; periodo 27-feb a 28-mar. VAL Estado pago N°1, Costo Directo 1091.50, Adelanto N°01 4821.27.
- Numeros clave: facturado 1091.50; CD VENTA 8258.11; adelanto 4821.27.
- Proposito: valorizar alquiler de encofrados metalicos EFCO (mes feb).
- Origen -> Destino: dias de alquiler/despacho -> costo subcontrato RO encofrado / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO encofrado.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL Nº02.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC EFCO. VAL N°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes FEBRERO; CONTRACTUAL 23193.29 (inc)/19655.33 (no IGV); facturado 18727.14; saldo por deducir 928; CD VENTA 8258.11. VAL Costo Directo 19655.33, Adelanto N°01 4821.27.
- Numeros clave: facturado 18727.14; contractual 19655.33; saldo 928.
- Proposito: segunda valorizacion alquiler encofrados EFCO.
- Origen -> Destino: dias de alquiler -> costo subcontrato RO encofrado / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL Nº03.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC EFCO. VAL N°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes FEBRERO; CONTRACTUAL 32227.42 (inc)/27311.37 (no IGV); facturado 27311.37; saldo 0; CD VENTA 8258.11. VAL Costo Directo 27311.37.
- Numeros clave: facturado 27311.37 (100% contractual); adelanto 4821.27.
- Proposito: tercera valorizacion alquiler encofrados EFCO.
- Origen -> Destino: dias de alquiler -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL Nº04.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC EFCO. VAL N°04 (servicio ya como "ENCOFRADO"; RUC distinto 20212149145).
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 4, mes ABRIL; servicio SUBCONTRATO DE ENCOFRADO; CONTRACTUAL 48456.66 (inc)/41064.97 (no IGV); facturado 41064.97; saldo 0; CD VENTA 50274; periodo 01-mar a 31-mar. VAL Estado pago N°4.
- Numeros clave: facturado 41064.97; CD VENTA 50274.
- Proposito: cuarta valorizacion EFCO (encofrado).
- Origen -> Destino: dias de alquiler/encofrado -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\SUSTENTO FACTURAS CREDITEX ACTUALIZADO.xlsx
- Tipo / formato: xlsx — sustento/conciliacion de facturas y despachos del SC EFCO (no es una valorizacion estandar; es control de facturas vs alquiler).
- Hojas (7): RESUMEN FACTURAS EFCO | PPTO | COMPARATIVO | VENTA DE EQ CONSUMIBLE FEBRERO | LISTA DE DESPACHO FEBRERO | LISTA DE DESPACHO MARZO | LISTA
- Contenido:
  - RESUMEN FACTURAS EFCO: tabla MES/FECHA/N°FACTURA/DESCRIPCION/IMPORTE/IGV/TOTAL/ESTADO. Facturas: F001-13524 arriendo 1091.50 (PAGADO); F001-13623 arriendo 18563.83 (PAGADO); F001-13648 venta equipo consumible 7656.04 (PAGADO); F001-13776 arriendo 13753.60 (PENDIENTE); F001-13722 venta consumible 611.46; F001-13755 venta equipo no devuelto 4991.97; F001-13776 devolucion -2582.23; F001-13802 reparacion/limpieza 162.80; F001-13803 venta equipo irreparable 1418.58.
  - PPTO: partidas presupuestadas de encofrado por frente (4.4.3.2 encofrado muro de contencion M2 308.03 x 61.84 = 19048.58; frente 3: 4.1.6.2 M2 548 x 19.91 = 10910.68; 4.2.5.1 M2 797 x 19.91 = 15868.27; 4.2.6.1 vigas M2 264 x 95.56 = 25227.84).
  - COMPARATIVO: cuadro comparativo PRESUPUESTO VENTA vs REAL EFCO (obra Precotex Las Moreras, residente Guido Gonzales, T.C 3.80); estructuras venta 71055.37.
  - VENTA DE EQ CONSUMIBLE FEBRERO: lista de consumibles vendidos (pernos, tensores, fundas) con cantidad/fecha/PU/total.
  - LISTA DE DESPACHO FEBRERO / MARZO: alquiler por rango de dias (dias, valor, tarifa diaria, cantidad); CD feb 18563.85; CD mar 13753.62 + IGV 2475.65 + TOTAL 16229.27; lista de devoluciones.
  - LISTA: catalogo de items EFCO con codigo, descripcion y P.U. (Super Stud, tornillos, esquineros, placas...).
- Numeros clave: factura mayor arriendo feb 18563.83; CD feb 18563.85; CD mar 13753.62 (TOTAL c/IGV 16229.27); venta equipo no devuelto 4991.97; T.C 3.80.
- Proposito: conciliar lo facturado por EFCO contra dias de alquiler, equipo no devuelto y consumibles; sustentar las valorizaciones y detectar penalidades por equipo no devuelto.
- Origen -> Destino: facturas EFCO + listas de despacho/devolucion -> sustento de las VAL EFCO -> costo real encofrado en RO. Tambien insumo para Flujo de Caja (estado PAGADO/PENDIENTE).
- Automatizacion: doble GAP — Val Subcontratistas y Flujo de Caja. La hoja RESUMEN FACTURAS (estado pagado/pendiente) es fuente directa para un futuro modulo de Flujo de Caja / cuentas por pagar. Por ahora importador generico para conciliacion.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº01.xlsx
- Tipo / formato: xlsx — GP-GCE-FOR-F01 (en nombre) pero contenido es F11 (STANDARD) + PRO-GCE-FOR-VAL. SC SSOMA, INCENTIVA CONSULTORES SAC / INCENTIVA NEWCOW EIRL (RUC 20610836357), OS 001. VAL N°01.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido:
  - STANDARD: hoja de ruta F11; SC SSOMA en obra; OS 001.
  - RESUMEN: proyecto Precotex Las Moreras, cliente GRAPCO, supervisor HIGASHI, val 1, mes NOVIEMBRE; CONTRACTUAL 30680 (inc)/26000 (no IGV); facturado 6066.67; CD SC 26000; periodo nov.
  - AD-03: valorizacion de obra (PRO-GCE-FOR-VAL), estado pago N°1, servicio gestion SSOMA, contratista TOPCONTRERAS ONE; Costo Total Actualizado 26000.
- Numeros clave: contractual 26000 (no IGV); facturado 6066.67.
- Proposito: valorizar el servicio mensual de gestion SSOMA del SC Incentiva.
- Origen -> Destino: contrato mensual SSOMA -> costo subcontrato RO (Gastos Generales / SSOMA) / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO (rubro SSOMA/GG).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº02.xlsx
- Tipo / formato: xlsx — F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL N°02.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN proyecto PTAR Planta 5 - CREDITEX, val 2, mes DICIEMBRE; CONTRACTUAL 30680/26000; facturado 12566.67; CD SC 26000. AD-03 estado pago N°2, gestion SSOMA, Costo Total Actualizado 26000.
- Numeros clave: contractual 26000; facturado acum 12566.67.
- Proposito: segunda valorizacion SSOMA (dic).
- Origen -> Destino: contrato SSOMA -> RO (SSOMA/GG) / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº03.xlsx
- Tipo / formato: xlsx — F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL N°03.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 3, mes ENERO; CONTRACTUAL 46610 (inc)/39500 (no IGV); facturado 20716.67; CD SC 39500. AD-03 estado pago N°3.
- Numeros clave: contractual 39500; facturado acum 20716.67.
- Proposito: tercera valorizacion SSOMA (ene); el contractual sube a 39500.
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº04.xlsx
- Tipo / formato: xlsx — F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL N°04.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 4, mes FEBRERO; CONTRACTUAL 46610/39500; facturado 31716.67; CD SC 39500. AD-03 estado pago N°4.
- Numeros clave: facturado acum 31716.67.
- Proposito: cuarta valorizacion SSOMA (feb).
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº05.xlsx
- Tipo / formato: xlsx — F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL N°05.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 5, mes MARZO; CONTRACTUAL 50380.10 (inc)/42695 (no IGV); facturado 42716.67; CD SC 42695. AD-03 estado pago N°5.
- Numeros clave: contractual 42695; facturado acum 42716.67.
- Proposito: quinta valorizacion SSOMA (mar); contractual sube a 42695.
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº06.xlsx
- Tipo / formato: xlsx — F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL N°06.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 6, mes ABRIL; CONTRACTUAL 60292.10 (inc)/51095 (no IGV); facturado 48516.67; CD SC 51095. AD-03 estado pago N°6.
- Numeros clave: contractual 51095; facturado acum 48516.67.
- Proposito: sexta valorizacion SSOMA (abr).
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\3. SC RECOSA\RECOSA_VAL Nº01.xlsx
- Tipo / formato: xlsx — F11 (STANDARD) + PRO-GCE-FOR-VAL. SC Instalaciones Sanitarias, RECOSA (RUC 20483973951). VAL N°01.
- Hojas (3): STANDARD | RESUMEN | VAL
- Contenido: STANDARD hoja de ruta F11. RESUMEN proyecto Precotex Las Moreras, val 1, mes ENERO; CONTRACTUAL 1156.28 (inc)/979.90 (no IGV); facturado 0; saldo por deducir 980. VAL valorizacion N°1, servicio instalaciones sanitarias; Costo Total Actualizado 979.90.
- Numeros clave: contractual 979.90; facturado 0; saldo 980.
- Proposito: primera valorizacion del SC instalaciones sanitarias (aun sin facturar).
- Origen -> Destino: avance IISS -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Encofrado, A&CR CONSTRUCCIONES GENERALES SAC (RUC 20604506388). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN proyecto PTARI Planta 5 - CREDITEX, val 1, mes MARZO; CONTRACTUAL 22756.41 (inc)/19285.09 (no IGV); facturado 9703.50; AMORTIZACION 3077.62; saldo por deducir 9582. VAL Costo Directo 17531.90, Adelanto N°01 4821.27.
- Numeros clave: contractual 19285.09; facturado 9703.50; amortizacion 3077.62; CD 17531.90.
- Proposito: primera valorizacion del SC encofrado A&CR (con amortizacion de adelanto).
- Origen -> Destino: avance encofrado -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas (gestion adelanto/amortizacion); importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL Nº02.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Encofrado A&CR. VAL N°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MARZO; CONTRACTUAL 22756.41/19285.09; facturado 14223.43; AMORTIZACION 1687.22; saldo por deducir 5062. VAL Costo Directo 17531.90, Adelanto N°01 4821.27.
- Numeros clave: facturado acum 14223.43; amortizacion 1687.22; saldo 5062.
- Proposito: segunda valorizacion encofrado A&CR.
- Origen -> Destino: avance encofrado -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL Nº03_Continuidad.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Encofrado A&CR. VAL N°03 (escenario "Continuidad").
- Hojas (3): RESUMEN | VAL | AD-HH
- Contenido:
  - RESUMEN val 3, mes MARZO (16 al 22-mar); CONTRACTUAL 23807.79 (inc)/20176.09 (no IGV); facturado 16406.74; AMORTIZACION 952.78; saldo por deducir 3769. VAL Costo Directo 18341.90.
  - AD-HH: adicional de HH (mano de obra) con CANT/DIAS/HH/PU/PARCIAL: OP 2x2 4.50h 23.90 = 430.20; PE 1x2 4.50h 17 = 153; OP 2x1 3.50h 23.90 = 167.30; PE 1x1 3.50h 17 = 59.50; total 810.
- Numeros clave: contractual 20176.09; facturado 16406.74; CD 18341.90; adicional HH 810.
- Proposito: tercera valorizacion encofrado A&CR (variante de continuidad del contrato), con adicional de HH.
- Origen -> Destino: avance encofrado + HH adicionales -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. AD-HH (HH x PU) podria cruzar con ISP/tareos.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL Nº03_Liquidacion.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Encofrado A&CR. VAL N°03 (escenario "Liquidacion"; alternativa al Continuidad).
- Hojas (3): RESUMEN | VAL | AD-HH
- Contenido: RESUMEN val 3, mes MARZO; CONTRACTUAL 23807.79/20176.09; facturado 14978.52; AMORTIZACION 1551.31; saldo por deducir 5198. VAL Costo Directo 18341.90. AD-HH identico (total 810).
- Numeros clave: facturado 14978.52; amortizacion 1551.31; saldo 5198.
- Proposito: variante de LIQUIDACION de la VAL N°03 A&CR (cierre del subcontrato). Es escenario alterno al "_Continuidad" — no sumar ambos.
- Origen -> Destino: avance/cierre encofrado -> RO / pago final SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. Tratar como una sola val (elegir Continuidad o Liquidacion).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\5. SC IMPERMEABILIZACION\GP-GCE-FOR-F10_SURE VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Impermeabilizacion, SURE (RUC 20600700040). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; CONTRACTUAL 173215.35 (inc)/146792.67 (no IGV); facturado 51377.44; AMORTIZACION 23486.83; saldo por deducir 95415; CD VENTA 144126.97. VAL valorizacion N°1 impermeabilizacion.
- Numeros clave: contractual 146792.67; facturado 51377.44; amortizacion 23486.83; CD VENTA 144126.97.
- Proposito: primera valorizacion del SC impermeabilizacion (contrato grande, con amortizacion de adelanto).
- Origen -> Destino: avance impermeabilizacion -> costo subcontrato RO / pago SC. CD VENTA vs CD SC = margen.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\5. SC IMPERMEABILIZACION\GP-GCE-FOR-F10_SURE VAL Nº02.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Impermeabilizacion SURE. VAL N°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MAYO; CONTRACTUAL 161542.10 (inc)/136900.09 (no IGV); facturado 118765.68; AMORTIZACION 0; saldo por deducir 18134; CD VENTA 143804.45.
- Numeros clave: contractual 136900.09; facturado 118765.68; CD VENTA 143804.45.
- Proposito: segunda valorizacion impermeabilizacion SURE.
- Origen -> Destino: avance impermeabilizacion -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\5. SC IMPERMEABILIZACION\GP-GCE-FOR-F10_SURE VAL Nº03.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Impermeabilizacion SURE. VAL N°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes JUNIO; CONTRACTUAL 157263.75 (inc)/133274.37 (no IGV); facturado 126610.65; AMORTIZACION 0.00; saldo por deducir 6664; CD VENTA 140048.56. VAL valorizacion N°3 (fila 1 con un "." aislado).
- Numeros clave: contractual 133274.37; facturado acum 126610.65; CD VENTA 140048.56.
- Proposito: tercera valorizacion impermeabilizacion SURE (avance casi total).
- Origen -> Destino: avance impermeabilizacion -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\1. Valorizaciones\VAL-AMSA_GRAPCO S.A.C._PTARI CREDITEX_02 FEBRERO.pdf
- Tipo / formato: pdf [no-Excel]. Valorizacion del SC AMSA (encofrados/andamios) emitida por AMSA a GRAPCO, periodo 02 FEBRERO, PTARI Creditex.
- Proposito: respaldo PDF de la valorizacion AMSA de febrero (documento del proveedor).
- Automatizacion: GAP. Archivar adjunto a la VAL AMSA correspondiente; no estructurable directo (OCR/manual).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\1. Valorizaciones\VAL-AMSA_GRAPCO S.A.C._PTARI CREDITEX_03 MARZO.pdf
- Tipo / formato: pdf [no-Excel]. Valorizacion AMSA periodo 03 MARZO.
- Proposito: respaldo PDF de la valorizacion AMSA de marzo.
- Automatizacion: GAP; adjunto a la VAL AMSA.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\1. Valorizaciones\VAL-AMSA_GRAPCO S.A.C._PTARI CREDITEX_04 ABRIL.pdf
- Tipo / formato: pdf [no-Excel]. Valorizacion AMSA periodo 04 ABRIL.
- Proposito: respaldo PDF de la valorizacion AMSA de abril.
- Automatizacion: GAP; adjunto a la VAL AMSA.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\GP-GCE-FOR-F10_AMSA VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC AMSA ENCOFRADOS PERU (alquiler de andamios) (RUC 20604506388). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes FEBRERO; CONTRACTUAL 5461.93 (inc)/4628.75 (no IGV); facturado 4628.75; saldo 0; CD VENTA 8258.11; periodo feb. VAL Costo Directo 4628.75, Adelanto N°01 4821.27.
- Numeros clave: facturado 4628.75; CD VENTA 8258.11.
- Proposito: primera valorizacion alquiler andamios AMSA.
- Origen -> Destino: dias de alquiler -> RO encofrado/andamios / pago SC. (PDFs de la subcarpeta son su respaldo.)
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\GP-GCE-FOR-F10_AMSA VAL Nº02.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC AMSA. VAL N°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MARZO; CONTRACTUAL 10923.85 (inc)/9257.50 (no IGV); facturado 9257.50; saldo 0; CD VENTA 16516.22. VAL Costo Directo 9257.50.
- Numeros clave: facturado 9257.50; CD VENTA 16516.22.
- Proposito: segunda valorizacion alquiler andamios AMSA.
- Origen -> Destino: dias de alquiler -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\GP-GCE-FOR-F10_AMSA VAL Nº03.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC AMSA. VAL N°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes ABRIL; CONTRACTUAL 16209.59 (inc)/13736.94 (no IGV); facturado 13736.94; saldo 0; CD VENTA 16516.22. VAL Estado de pago N°3 "SUBCONTRATO DE ANDAMIOS".
- Numeros clave: facturado 13736.94; CD VENTA 16516.22.
- Proposito: tercera valorizacion alquiler andamios AMSA.
- Origen -> Destino: dias de alquiler -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\ESTADILLO 26-0169 - VAL 02_04-30_04.pdf
- Tipo / formato: pdf [no-Excel]. Estadillo (parte de alquiler) NOPIN N° 26-0169, periodo 02/04 a 30/04.
- Proposito: respaldo de dias/equipos de alquiler de encofrado NOPIN (sustento de la val).
- Automatizacion: GAP; adjunto a la VAL NOPIN correspondiente.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\ESTADILLO 26-0179 - VAL 08_04-20_04.pdf
- Tipo / formato: pdf [no-Excel]. Estadillo NOPIN N° 26-0179, periodo 08/04 a 20/04.
- Proposito: respaldo de alquiler NOPIN.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\GRAPCO 26-0169 DEL 26-03 AL 27-04.pdf
- Tipo / formato: pdf [no-Excel]. Documento NOPIN/GRAPCO N° 26-0169, periodo 26-03 a 27-04.
- Proposito: respaldo de alquiler/valorizacion NOPIN.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\GRAPCO 26-0169 DEL 27-02 AL 28-03.pdf
- Tipo / formato: pdf [no-Excel]. Documento NOPIN/GRAPCO N° 26-0169, periodo 27-02 a 28-03.
- Proposito: respaldo de alquiler/valorizacion NOPIN.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\VALORIZACION DEL 29-03-2026 AL 01-04-2026.pdf
- Tipo / formato: pdf [no-Excel]. Valorizacion NOPIN periodo 29-03 a 01-04-2026.
- Proposito: respaldo PDF de la valorizacion NOPIN de fin de marzo/inicio abril.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN LIQUIDACION.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Alquiler de Encofrado, NOPIN Y ENCOFRA SAC (RUC 20604506388). VAL = LIQUIDACION (cierre).
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val LIQUIDACION, mes JUNIO; CONTRACTUAL 12970.56 (inc)/10992.00 (no IGV); facturado 7063.42; saldo por deducir 3929; CD VENTA 13140.05. VAL estado de pago = LIQUIDACION.
- Numeros clave: contractual 10992.00; facturado 7063.42; saldo 3929; CD VENTA 13140.05.
- Proposito: liquidacion final del SC encofrado NOPIN.
- Origen -> Destino: estadillos de alquiler (PDFs) -> RO / pago/cierre SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO (marca liquidacion).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC NOPIN (subcontratista en RESUMEN figura "AMSA ENCOFRADOS PERU" — posible error de plantilla heredada). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes MARZO; CONTRACTUAL 4307.61 (inc)/3650.52 (no IGV); facturado 3650.52; saldo 0; CD VENTA 8258.11. VAL Costo Directo 3650.52.
- Numeros clave: facturado 3650.52; CD VENTA 8258.11.
- Proposito: primera valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. (Validar nombre SC: RESUMEN dice AMSA, carpeta dice NOPIN.)

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL Nº02.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC NOPIN Y ENCOFRA SAC. VAL N°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MARZO; CONTRACTUAL 6073.53 (inc)/5147.06 (no IGV); facturado 4660.32; saldo por deducir 487; CD VENTA 9359.19. VAL Estado pago N°2.
- Numeros clave: facturado 4660.32; saldo 487; CD VENTA 9359.19.
- Proposito: segunda valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL Nº03.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC NOPIN. VAL N°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes ABRIL; CONTRACTUAL 6073.53/5147.06; facturado 5147.06; saldo 0; CD VENTA 9359.19.
- Numeros clave: facturado 5147.06 (100%); CD VENTA 9359.19.
- Proposito: tercera valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL Nº04.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC NOPIN. VAL N°04.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 4, mes ABRIL; CONTRACTUAL 6520.34 (inc)/5525.72 (no IGV); facturado 5525.72; saldo 0; CD VENTA 13140.05.
- Numeros clave: facturado 5525.72; CD VENTA 13140.05.
- Proposito: cuarta valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL Nº05.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC NOPIN. VAL N°05.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 5, mes ABRIL; CONTRACTUAL 8334.83 (inc)/7063.42 (no IGV); facturado 7063.42; saldo 0; CD VENTA 13140.05.
- Numeros clave: facturado 7063.42; CD VENTA 13140.05.
- Proposito: quinta valorizacion alquiler encofrado NOPIN (coincide con monto facturado de la liquidacion).
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\8. SC SOPORTE  DE 14_\GP-GCE-FOR-F10_ANGEL VELASQUEZ VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC Soporte de 14" en acero, ANGEL VELASQUEZ BOTONI (sin RUC en hoja). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; CONTRACTUAL 900.00 (inc)/762.71 (no IGV); facturado 762.71; saldo 0; CD VENTA vacio. VAL servicio "SUBCONTRATO DE SOPORTE DE 14" EN ACERO".
- Numeros clave: contractual 762.71; facturado 762.71.
- Proposito: valorizar el servicio de soporte de tuberia 14" en acero.
- Origen -> Destino: servicio prestado -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\9. SC MAS ESTRUMETALES\GP-GCE-FOR-F10_ABRAZADERAS VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC MASESTRUMETALES — fabricacion de soporte para tubo (abrazaderas). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; servicio "FABRICACION DE SOPORTE PARA TUBO TIPO..."; CONTRACTUAL 826 (inc)/700 (no IGV); facturado 700; saldo 0; CD VENTA vacio. VAL Estado pago N°1.
- Numeros clave: contractual 700; facturado 700.
- Proposito: valorizar fabricacion de abrazaderas/soportes de tubo.
- Origen -> Destino: servicio fabricacion -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\9. SC MAS ESTRUMETALES\GP-GCE-FOR-F10_MASESTRUMETALES VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC MASESTRUMETALES (en RESUMEN figura subcontratista "ANGEL VELASQUEZ BOTONI", servicio soporte de 14" — posible plantilla copiada). VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; CONTRACTUAL 900.00 (inc)/762.71 (no IGV); facturado 762.71; saldo 0. VAL servicio "SUBCONTRATO DE SOPORTE DE 14" EN ACERO".
- Numeros clave: contractual 762.71; facturado 762.71.
- Proposito: valorizar servicio estructuras menores (datos identicos a Angel Velasquez VAL01 — revisar duplicidad).
- Origen -> Destino: servicio -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. Advertencia: posible duplicado de la val de Angel Velasquez.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\9. SC MAS ESTRUMETALES\GP-GCE-FOR-F10_PLATINAS VAL Nº01.xlsx
- Tipo / formato: xlsx — F10 + PRO-GCE-FOR-VAL. SC MASESTRUMETALES — servicio de 320 agujeros en platina. VAL N°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; servicio "SERVICIO DE 320 AGUJEROS EN PLATINA"; CONTRACTUAL 1121 (inc)/950 (no IGV); facturado 950; saldo 0. VAL Estado pago N°1.
- Numeros clave: contractual 950; facturado 950.
- Proposito: valorizar servicio de perforacion (320 agujeros) en platinas.
- Origen -> Destino: servicio fabricacion -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

## Sintesis del chunk
- Patron dominante: valorizaciones de SUBCONTRATISTAS con plantilla unica (hoja RESUMEN "CUADRO RESUMEN DE VALORIZACIONES" con MONTO CONTRACTUAL inc/no IGV, MONTO TOTAL FACTURADO, AMORTIZACION, DEDUCCION, SALDO POR DEDUCIR, CD VENTA, CD SC) + hoja VAL (codigo PRO-GCE-FOR-VAL) + en algunos casos hoja de ruta STANDARD (GP-GCE-FOR-F11). Codigo de carpeta/archivo GP-GCE-FOR-F10 (o F01/F11 segun caso).
- Cubre todos los frentes: mov. tierras (R Proyectos), estructuras metalicas Nave (M&M), impermeabilizacion (SURE), encofrado/andamios (EFCO, A&CR, AMSA, NOPIN), SSOMA (Incentiva), prueba lanza seca (Orange), estructuras menores (Angel Velasquez, Masestrumetales).
- Tambien 1 valorizacion de ADICIONALES al cliente (F07) y 1 sustento de facturas (EFCO) util para flujo de caja.
- Gaps principales: modulo de Valorizacion de Subcontratistas (F10/F11) y Flujo de Caja no existen; CD VENTA vs CD SC ya es insumo de margen para el RO.
