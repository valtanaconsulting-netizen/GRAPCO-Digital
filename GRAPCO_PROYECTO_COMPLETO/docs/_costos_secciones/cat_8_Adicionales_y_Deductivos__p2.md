# Categoria 8 - Adicionales y Deductivos (parte 2)

Proyecto: CREDITEX - "PTAR PLANTA 5" / PTAR PLANTA 5 (AV. LOS HORNOS 185, ATE). Contratista GRAPCO SAC, Supervision DISEÑOS RACIONALES. Cliente CREDITEX.

Fichas de los archivos del chunk `cat_8_Adicionales_y_Deductivos__p2.txt`. Los expedientes de adicional/servicio comparten la misma plantilla GP-GCE-FOR-F05 (caratula PRO-GCE-FOR-F03 / APU y esquema GP-GCE-FOR-F01). Por eso varias fichas son estructuralmente identicas y solo cambia la partida adicional.

---

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°19_Losa en Nave de Recuperación\GP-GCE-FOR-F05-AD N°19 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional, plantilla GP-GCE-FOR-F05 (Resumen PRO-GCE-FOR-F03 v0; APU/Esquema/Cotizacion GP-GCE-FOR-F01).
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido:
  - Caratula: ADICIONAL N°19 Rev.01, "LOSA EN NAVE DE RECUPERACION DE AGUAS", fecha 31/03/2026.
  - Resumen (1.- RESUMEN DEL PRESUPUESTO): tabla ITEM / DESCRIPCION / UND / CANT / P.U. (S/.) / PARCIAL (S/.) / TOTAL (S/.) (+47 filas; encabezado visible, totales en celdas no volcadas).
  - 1. Metrado: APU/metrado con factores (0.56, 0.99) por fecha; +16 filas.
  - 2. APU (3.- ANALISIS DE PRECIOS UNITARIOS): ITEM / DESCRIPCION / UND / CUADRILLA / CANTIDAD / PRECIO (S/.) / PARCIAL (S/.) / SUB TOTAL (S/.); +224 filas (APU extenso, partida de losa).
  - Hoja 8: cronograma valorizado de EGRESOS por semana (MESES 1-7, Sem 1 a Sem 24) con desagregado por rubro: Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori, etc. (+15 filas); valores volcados en 0 (formulas no resueltas / #REF!).
  - 3. Esquema: esquema/croquis del adicional (PLAZO #REF! MESES).
  - 4. Cotizacion: hoja de cotizacion de terceros (sin filas de datos volcadas).
- Numeros clave: factores 0.56 y 0.99 (Metrado). Totales del Resumen no aparecen en el volcado (filas resumidas con "+N filas"); varias celdas con #REF!. Plazo #REF!.
- Proposito: sustentar economicamente el adicional N°19 (losa en nave de recuperacion de aguas) - metrado, APU, cronograma de egresos y cotizacion para presentar al cliente/supervision.
- Origen -> Destino: nace de metrado de campo + APU GRAPCO; alimenta el estatus de adicionales (GP-GCE-FOR-F05 ESTATUS) y, si se aprueba, la valorizacion al cliente y el RO.
- Automatizacion: modulo Adicionales/Deductivos de GRAPCO. Ingesta via importador generico in-app de la hoja Resumen (ITEM/UND/CANT/PU/Parcial/Total) como linea de adicional. El APU detallado mapea al concepto de Presupuesto (BAC) si el adicional se incorpora a la linea base; la Hoja 8 (egresos por semana) alimenta Curva S / Flujo de Caja (GAP de Flujo de Caja).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°19_Losa en Nave de Recuperación\GP-GCE-FOR-F05-AD N°19 Rev.02_CANALETA EN ZONA DE RECUPERACION DE AGUAS.xlsx
- Tipo / formato: xlsx - Expediente de adicional, plantilla GP-GCE-FOR-F05 (Rev.02 del AD N°19). Misma plantilla que Rev.01.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido:
  - Caratula: ADICIONAL N°19 Rev.01 (rotulo interno), denominacion cambiada a "CANALETA EN ZONA DE RECUEPERACION DE A[GUAS]"; fecha 31/03/2026. Es la revision que reorienta el alcance de losa a canaleta.
  - Resumen: misma estructura ITEM/.../TOTAL (S/.); +35 filas.
  - 1. Metrado: factores 0.56 / 0.99; +16 filas.
  - 2. APU: ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL; +196 filas.
  - Hoja 8: cronograma de EGRESOS por semana (Sem 1-24), rubros igual al N°19 Rev.01; valores 0/#REF!.
  - 3. Esquema y 4. Cotizacion: croquis y cotizacion (sin filas de datos volcadas).
- Numeros clave: factores 0.56 / 0.99. Totales no volcados (filas resumidas); #REF! en plazo y referencias.
- Proposito: revision 02 del adicional N°19; redefine el alcance (canaleta en vez de losa). Sustento economico para reenvio al cliente.
- Origen -> Destino: metrado/APU GRAPCO revisado; alimenta estatus de adicionales y eventual valorizacion.
- Automatizacion: igual al N°19 Rev.01. En el modulo Adicionales conviene versionar (Rev.01/Rev.02) y dejar solo la vigente como linea valida; importador generico sobre la hoja Resumen.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°20_Cobertura TR4\GP-GCE-FOR-F05-AD N°20 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05.
- Hojas: Carátula | Resumen | 1. APU | Hoja 8 | 2. Esquema
- Contenido:
  - Caratula: ADICIONAL N°20 Rev.01, "ADICIONAL COBERTURA TR4", fecha 08/05/2026.
  - Resumen: tabla ITEM/.../TOTAL (S/.); +11 filas (adicional pequeño).
  - 1. APU: ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL; +5 filas (APU corto).
  - Hoja 8: cronograma de EGRESOS por semana (Sem 1-24), mismos rubros; valores 0/#REF!.
  - 2. Esquema: croquis (PLAZO #REF!).
- Numeros clave: no hay totales explicitos en el volcado (filas resumidas); plazo #REF!.
- Proposito: sustentar el adicional N°20 (cobertura TR4).
- Origen -> Destino: APU GRAPCO; alimenta estatus de adicionales y valorizacion si se aprueba.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°20_Cobertura TR4\GP-GCE-FOR-F05-AD N°20 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (Rev.02 del N°20). Volcado identico a la Rev.01 (mismas hojas, mismos encabezados, misma fecha 08/05/2026, mismo +11 / +5 filas).
- Hojas: Carátula | Resumen | 1. APU | Hoja 8 | 2. Esquema
- Contenido: igual al N°20 Rev.01 (cobertura TR4). El rotulo interno sigue diciendo Rev.01 en algunas celdas; es la version controlada Rev.02 del expediente.
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: revision 02 del adicional N°20 (cobertura TR4).
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; versionar y conservar solo la vigente; importador generico.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°21_Barandas en Techo\GP-GCE-FOR-F05-ADICIONAL N°21 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05.
- Hojas: Carátula | Resumen | 2. APU | 3. Esquema | Hoja 8
- Contenido:
  - Caratula: ADICIONAL N°21 Rev.01, "ADICIONAL BARANDAS METALICAS EN LOSA D[E TECHO]", fecha 13/05/2026.
  - Resumen: ITEM/.../TOTAL (S/.); +16 filas.
  - 2. APU: ITEM/.../SUB TOTAL; +5 filas (APU corto, partida de barandas metalicas).
  - 3. Esquema: croquis (PLAZO #REF!).
  - Hoja 8: cronograma de EGRESOS por semana (Sem 1-24), rubros estandar; valores 0/#REF!.
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: sustentar el adicional N°21 (barandas metalicas en losa de techo).
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°21_Barandas en Techo\GP-GCE-FOR-F05-ADICIONAL N°21 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (Rev.02 del N°21). Volcado identico a la Rev.01 (mismas hojas, fecha 13/05/2026, +16 / +5 filas).
- Hojas: Carátula | Resumen | 2. APU | 3. Esquema | Hoja 8
- Contenido: igual al N°21 Rev.01 (barandas metalicas en losa de techo). Archivo mas pesado (1285 KB vs 615 KB) por imagenes/croquis en el esquema.
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: revision 02 del adicional N°21.
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; versionar; importador generico.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°22_Barandas en Nave\1. Superado\Copia de GP-GCE-FOR-F05-AD N°21 Rev.01.2.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (copia de trabajo SUPERADA/obsoleta; carpeta "1. Superado"). Rotulo interno aun N°21.
- Hojas: Carátula | Resumen | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido:
  - Caratula: ADICIONAL N°21 Rev.01, "ADICIONAL BARANDAS", fecha 11/05/2026 (copia que dio origen al AD N°22 Barandas en Nave).
  - Resumen: ITEM/.../TOTAL (S/.); +16 filas.
  - 2. APU: ITEM/.../SUB TOTAL; +5 filas.
  - Hoja 8: cronograma de EGRESOS por semana; valores 0/#REF!.
  - 3. Esquema y 4. Cotizacion: croquis y cotizacion (sin filas de datos volcadas).
- Numeros clave: sin totales explicitos; #REF! en plazo.
- Proposito: borrador/copia previa (superada) del adicional de barandas en nave; conservada como historico.
- Origen -> Destino: copia de trabajo; reemplazada por GP-GCE-FOR-F05-AD N°22 Rev.01.
- Automatizacion: NO ingerir (esta en "1. Superado"). En GRAPCO marcar como version obsoleta; solo tomar la vigente (AD N°22 Rev.01).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°22_Barandas en Nave\GP-GCE-FOR-F05-AD N°22 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (vigente del N°22).
- Hojas: Carátula | Resumen | 2. APU | Hoja 8 | 3. Esquema
- Contenido:
  - Caratula: ADICIONAL N°22 Rev.01, "ADICIONAL BARANDAS METALICAS", fecha 13/05/2026.
  - Resumen: ITEM/.../TOTAL (S/.); +16 filas.
  - 2. APU: ITEM/.../SUB TOTAL; +5 filas (partida barandas metalicas).
  - Hoja 8: cronograma de EGRESOS por semana; valores 0/#REF!.
  - 3. Esquema: croquis (PLAZO #REF!).
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: sustentar el adicional N°22 (barandas metalicas en nave).
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-N°23_Losa en Nave\GP-GCE-FOR-F05-AD N°23 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05.
- Hojas: Carátula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema
- Contenido:
  - Caratula: ADICIONAL N°23 Rev.01, "LOSA EN ZONA DE NAVE DE RECUPERACION", fecha 31/03/2026.
  - Resumen: ITEM/.../TOTAL (S/.); +14 filas.
  - 1. Metrado: hoja de metrado con factores 0.56 / 0.99; +6 filas (encabezados OBRA/CONTRATISTA vacios en este caso).
  - 2. APU: ITEM/.../SUB TOTAL; +224 filas (APU extenso, partida de losa - similar al N°19 Rev.01).
  - Hoja 8: cronograma de EGRESOS por semana; valores 0/#REF!.
  - 3. Esquema: croquis (PLAZO en blanco / MESES).
- Numeros clave: factores 0.56 / 0.99 (Metrado). Sin totales explicitos en el volcado.
- Proposito: sustentar el adicional N°23 (losa en zona de nave de recuperacion). Relacionado tematicamente con el N°19 (misma zona).
- Origen -> Destino: metrado de campo + APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen; APU a Presupuesto si se incorpora.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-N°01_Adicional de Diseño\20514824500-01-F001-5624.pdf
- Tipo / formato: PDF [no-Excel]. Nombre tipo comprobante electronico SUNAT (RUC 20514824500, serie F001, correlativo 5624).
- Proposito: factura/comprobante de respaldo del servicio SE-N°01 (Adicional de Diseño Arquitectura). Sustento de gasto del servicio adicional.
- Origen -> Destino: emitido por proveedor de diseño; respalda el servicio enviado al cliente y el registro de costo real.
- Automatizacion: GAP de ingesta automatica de PDF. Adjuntar como soporte documental en el modulo Adicionales/Deductivos (servicios); el monto se carga manualmente desde el F05-SE N°01.

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-N°01_Adicional de Diseño\GP-GCE-FOR-F05-SE N°01 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de SERVICIO adicional GP-GCE-FOR-F05 (Resumen PRO-GCE-FOR-F03; APU/Cotizacion PRO-GCE-FOR-F05).
- Hojas: Carátula | Resumen | 1. APU | 2. Cotización
- Contenido:
  - Caratula: SERVICIO N°01 Rev.01, "ADICIONAL DE DISEÑO ARQUITECTURA", fecha 09/12/2025.
  - Resumen (1.- PRECIO UNITARIO): ITEM/DESCRIPCION/UND/CANTIDAD/P.U. (S/.)/PARCIAL (S/.)/TOTAL (S/.); PLAZO 7 DIAS; +10 filas.
  - 1. APU (ANALISIS DE PRECIO UNITARIO - MANO DE OBRA): partida "ADICIONAL DE DISEÑO ARQUITECTURA", UND GLB, sub total **3500** (S/.); +3 filas.
  - 2. Cotización: hoja de cotizacion del servicio (sin filas de datos volcadas).
- Numeros clave: **P.U. servicio S/ 3,500 (GLB)** (APU); plazo 7 dias. (Nota: el estatus de servicios registra SE-01 con subtotal 3675 = 3500 + ~5% u/gg).
- Proposito: sustentar el servicio adicional N°01 (diseño de arquitectura) - monto y alcance para cobro al cliente.
- Origen -> Destino: cotizacion de diseño; alimenta el estatus de servicios (GP-GCE-FOR-F05 ESTATUS SERVICIOS) y valorizacion.
- Automatizacion: modulo Adicionales/Deductivos (sub-tipo Servicios); importador generico sobre Resumen/APU (linea GLB S/3500).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-N°02_Derecho de tramite municipal por verificación técnica\Carta municipalidad inicio obra.pdf
- Tipo / formato: PDF [no-Excel].
- Proposito: carta de la municipalidad de inicio de obra; sustento documental del derecho de tramite municipal por verificacion tecnica (servicio SE-N°02).
- Origen -> Destino: municipalidad de Ate; respalda el servicio SE-N°02 ante el cliente.
- Automatizacion: GAP de ingesta de PDF. Adjuntar como soporte en el modulo Adicionales/Deductivos (servicios).

### \05. Gestión Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-N°02_Derecho de tramite municipal por verificación técnica\GP-GCE-FOR-F05-SE N°02 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de SERVICIO adicional GP-GCE-FOR-F05 (Resumen PRO-GCE-FOR-F03; APU/Cotizacion PRO-GCE-FOR-F05).
- Hojas: Carátula | Resumen | 1. APU | 2. Cotización
- Contenido:
  - Caratula: SERVICIO N°02 Rev.01, "ADICIONAL DE DERECHO DE TRAMITE MUNICI[PAL]", fecha 17/12/2025.
  - Resumen (1.- PRECIO UNITARIO): ITEM/DESCRIPCION/UND/CANTIDAD/P.U./PARCIAL/TOTAL (S/.); +10 filas.
  - 1. APU: partida "DERECHO DE TRAMITE MUNICIPAL POR VERIF[ICACION]", UND VISITA, sub total **356.40** (S/.); +3 filas.
  - 2. Cotización: hoja de cotizacion (sin filas de datos volcadas).
- Numeros clave: **P.U. S/ 356.40 por VISITA** (APU). (Nota: estatus de servicios registra SE-02 con subtotal 4490.64 -> implica varias visitas/cantidad.)
- Proposito: sustentar el servicio adicional N°02 (derecho de tramite municipal por verificacion tecnica).
- Origen -> Destino: cotizacion/tarifa municipal; alimenta el estatus de servicios y valorizacion.
- Automatizacion: modulo Adicionales/Deductivos (Servicios); importador generico sobre Resumen/APU (linea VISITA S/356.40 x cantidad).

### \05. Gestión Costos\8. Adicionales y Deductivos\GP-GCE-FOR-F05_ESTATUS ADICIONALES CREDITEX.xlsx
- Tipo / formato: xlsx - REGISTRO DE CONTROL maestro de adicionales (formato GP-GIN-FOR-F05 Rev.01). Es el tablero de seguimiento de todos los adicionales.
- Hojas: Resumen | Aprobacion (vacia) | Leyenda (vacia) | Hoja 1
- Contenido:
  - Resumen (ESTATUS DE ADICIONALES, PTAR PLANTA 5 - CREDITEX): factores GG 0.26 y U 0.09. Columnas: COD. / FRENTE / CD / GG / U / SUBTOTAL GRAPCO (S/IGV) / REVISION SUP. (S/IGV) / ESTADO DE EJECUCION / ESTADO DEL ADICIONAL / FACTURADO A LA FECHA / ABONO / TIPO / COMENTARIO. Filas visibles:
    - AD-01 CERCO INTERIOR CAMPAMENTO: CD 5187.78, GG 1373.14, U 466.90, SUBTOTAL 7027.82, REV.SUP 7027.82, EJECUTADO/APROBADO, FACTURADO 7027.82, ABONADO.
    - AD-02 INST. PUERTA METALICA Y ACCESO: CD 3859.83, GG 1021.65, U 347.38, SUBTOTAL 5228.87, REV.SUP 5228.86, EJECUTADO/APROBADO, FACTURADO 5228.86, ABONADO.
    - AD-03 CERCO INTERNO EN T. EXISTENTES: CD 3721.61, GG 985.07, U 334.94, SUBTOTAL 5041.62, REV.SUP 5041.61, EJECUTADO/APROBADO, FACTURADO 5041.61, ABONADO.
    - AD-04 ADICIONAL DE DISEÑO: ANULADO (montos 0). (+18 filas mas no volcadas).
  - Hoja 1 (frentes F3/F5/F10/F1Y2): listado por FRENTE con AD-24..AD-43, ej.:
    - F3 AD-24 AUMENTO ALTURA H=0.55m EN ALMACENES S/ 46,365.59 EJECUTADO/APROBADO, FACTURADO S/0.00, PENDIENTE.
    - F3 AD-36 PUERTAS ENROLLABLES CON MOTOR ELECTRICO S/ 7,284.51 PENDIENTE/APROBADO.
    - F3 AD-37 ENDURECEDOR DE PISOS S/ 6,420.35 EJECUTADO/APROBADO.
    - F5 AD-38 MODULO OFICINA PREFABRICADA S/ 11,118.43 PENDIENTE / EN PROCESO.
    - F5 AD-39 BRIDAS EN CISTERNA S/ 4,623.78 EN EJECUCION / EN PROCESO.
    - F10 AD-40 LADRILLO PASTELERO; F3 AD-41 PUERTA METALICA; F1Y2 AD-42 BARANDAS ADICIONALES; F3 AD-43 PUERTAS CORTAFUEGO F3 (sin monto, EN EJECUCION) (+3 filas).
  - Aprobacion y Leyenda: vacias.
- Numeros clave: factores GG 0.26 / U 0.09 sobre CD. AD-01..AD-03 facturados y abonados: 7027.82 + 5228.86 + 5041.61 = **S/ 17,298.29** (S/IGV) facturado/abonado de los 3 primeros. AD-24 S/ 46,365.59 (mayor monto listado, EJECUTADO/APROBADO pero NO facturado). Varios EJECUTADO/APROBADO con FACTURADO S/0.00 (pendiente de cobro).
- Proposito: control central del ciclo de vida de cada adicional (CD/GG/U -> subtotal -> revision supervision -> estado ejecucion -> estado aprobacion -> facturado -> abonado). Es la fuente de verdad del avance economico de adicionales.
- Origen -> Destino: consolida los expedientes individuales GP-GCE-FOR-F05-AD N°xx; alimenta el RO (adicionales aprobados) y el control de cobranza/valorizaciones.
- Automatizacion: ALTA prioridad. Importar la hoja Resumen al modulo Adicionales/Deductivos como tabla maestra (COD/FRENTE/CD/GG/U/Subtotal/EstadoEjecucion/EstadoAdicional/Facturado/Abono). Vincular con RO (adicionales aprobados al precio de venta) y con seguimiento de cobranza (facturado vs abonado = GAP Flujo de Caja). Importador generico in-app aplicable.

### \05. Gestión Costos\8. Adicionales y Deductivos\GP-GCE-FOR-F05_ESTATUS SERVICIOS CREDITEX.xlsx
- Tipo / formato: xlsx - REGISTRO DE CONTROL maestro de servicios adicionales (formato GP-GIN-FOR-F05 Rev.01).
- Hojas: Resumen | Aprobacion (vacia) | Hoja 1
- Contenido:
  - Resumen (ESTATUS DE SERVICIOS, PTAR PLANTA 5 - CREDITEX): COD. / FRENTE / SUBTOTAL GRAPCO (S/IGV) / REVISION SUPERVISION (S/IGV) / ESTADO DE EJECUCION / ESTADO DEL ADICIONAL / FACTURADO A LA FECHA / ABONO / TIPO / COMENTARIO. Filas:
    - SE-01 ADICIONAL DE DISEÑO: SUBTOTAL 3675, EJECUTADO / PENDIENTE, FACTURADO 0, ABONO PENDIENTE.
    - SE-02 DERECHO DE TRAMITE MUNICIPAL POR VERIF: SUBTOTAL 4490.64, EJECUTADO / PENDIENTE, FACTURADO 0, ABONO PENDIENTE.
    - Fila total: SUBTOTAL **8165.64**, REVISION SUPERVISION 0, FACTURADO 0.
  - Hoja 1: mismo listado de frentes/adicionales que el archivo ESTATUS ADICIONALES (AD-24..AD-43); aparenta ser hoja duplicada/heredada de la plantilla.
  - Aprobacion: vacia.
- Numeros clave: SE-01 S/ 3,675; SE-02 S/ 4,490.64; **TOTAL servicios S/ 8,165.64 (S/IGV)**; revision supervision S/ 0 y facturado S/ 0 (ambos servicios EJECUTADOS pero PENDIENTES de aprobacion/cobro).
- Proposito: control del estado de los servicios adicionales (diseño y tramites) - ejecutado, pendiente de aprobacion supervision, sin facturar ni abonar.
- Origen -> Destino: consolida los F05-SE N°01/N°02; alimenta RO (servicios aprobados) y cobranza.
- Automatizacion: ALTA prioridad. Importar Resumen al modulo Adicionales/Deductivos (sub-tipo Servicios); vincular SE-01/SE-02 con sus expedientes y con seguimiento facturado/abono (GAP Flujo de Caja). Importador generico in-app aplicable.

---

## Notas transversales
- Todos los expedientes AD N°19..N°23 y SE N°01/N°02 comparten la plantilla GP-GCE-FOR-F05 (caratula PRO-GCE-FOR-F03 v0; APU y esquema GP-GCE-FOR-F01; APU de servicios PRO-GCE-FOR-F05). Los formularios maestros de estatus usan GP-GIN-FOR-F05 Rev.01.
- Los totales por partida de cada expediente individual NO se ven en el volcado (filas resumidas como "+N filas" y abundantes #REF!). Los montos consolidados confiables estan en los dos archivos de ESTATUS (adicionales y servicios) y en la Hoja 1 (frentes).
- La "Hoja 8" de cada expediente es un cronograma valorizado de egresos por semana (Sem 1-24, 7 meses) por rubro (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori, etc.) -> insumo natural para Curva S / Flujo de Caja, pero en estos archivos sale en 0/#REF! (formulas sin resolver).
- Factores de markup usados: GG 0.26 y Utilidad 0.09 sobre CD (segun ESTATUS ADICIONALES).
