# Categoria 12 - Fisico Valorizado Semanal

Chunk de catalogo de costos (proyecto CREDITEX - PTAR PLANTA 5). Contiene 3 archivos: dos libros maestros de Curva S (formato GP-GCE-FOR-F07) y un borrador suelto. Los dos libros F07 son practicamente identicos en estructura (17 hojas cada uno): integran Presupuesto + APU + Curva S programada/ejecutada + Flujo de Caja + RO en un solo workbook. Son la fuente del fisico valorizado semanal.

---

### \05. Gestión Costos\12. Fisico Valorizado Semanal\1. Superado\Copia de GP-GCE-FOR-F07_CURVA S PTARI CREDITEX.xlsx
- Tipo / formato: xlsx. Codigo principal **GP-GCE-FOR-F07** (Curva S). Internamente reusa formatos GP-GCE-FOR-F01 (Presupuesto/APU) y PRO-GCE-FOR-F03 (Gastos Generales). Carpeta "1. Superado" = version antigua/reemplazada.
- Hojas (17): Curva S Resumen | Curva S Programado | Carátula | Flujo de Caja | Curva S | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 7. GG | Hoja 8 | APU Contractual | RO | A. Partidas | A. Recursos
- Contenido por hoja relevante:
  - **Curva S Resumen**: tabla semanal con columnas PROGRAMADO (CD Semanal, %, CD Acumulado, % Programado) y EJECUTADO (CD Semanal, %, CD Acumulado, % Ejecutado). Arranca en SEMANA 6 (CD acum 173,910.25 prog / 179,046.99 ejec, ambos 9%) y avanza hasta ~semana 18 (+11 filas). Es el corazon del avance fisico valorizado.
  - **Curva S Programado** y **Curva S** (detalle): matriz partida (ID, descripcion, UND, METRADO, PU) x dias calendario (col por dia, inicio Lun 03 Nov 2025), agrupada por meses 1-12 y semanas 1-57. Niveles N1 CISTERNA / N2 PRELIMINARES / N3 SEGURIDAD Y SALUD. Incluye sectorizacion (SECTORES, SECTOR, CONTROL) y valor diario por partida (ej. PRE1 alquiler andamios 199.60). ~228 / ~120 filas.
  - **Carátula**: PTAR PLANTA 5, AV. LOS HORNOS 185 ATE, "FLUJO DE CAJA PTAR PLANTA 5 - CREDITEX", Revision N°01, fecha 28 Dic 2025.
  - **Flujo de Caja**: cronograma de DESEMBOLSOS 1..8+ con FECHA DE PAGO, SIN IGV, ACUM TOTAL S/IGV, ACUM TOTAL C/IGV (+38 filas). Desembolso 1 = 222,159.95 (15 Dic 2025); acumulado a Desembolso 8 = 2,437,557.22 s/IGV / 2,876,317.52 c/IGV (31 Mar 2026).
  - **PPTO**: caratula de presupuesto (formato F01) + "1.- RESUMEN DEL PRESUPUESTO" con ITEM/DESCRIPCION/UND/CANT/PU/PARCIAL/TOTAL (+12 filas). Plazo 4.50 MESES.
  - **1. PRE / 2. PRO / 3. MOV / 4. EST / 5. ARQ**: presupuestos por especialidad (Preliminares, Obras Provisionales, Movimiento de Tierras, Estructuras, Arquitectura). Columnas: ITEM, DESCRIPCION, UND, CANT, PU, PARCIAL, SUBTOTAL, TOTAL + bloque INCIDENCIAS (MO/MAT/EQH/SC en %) + MONTOS (MO/MAT/EQH/SC en S/.). La hoja 4.EST agrega bloque MANO DE OBRA (IP, HH, MONTO, COSTO PROM) y plazo 130 dias calendario.
  - **7. GG**: Gastos Generales (formato PRO-GCE-FOR-F03), "4.- ANALISIS DE GASTOS GENERALES", A. Caracteristicas (+131 filas).
  - **Hoja 8**: matriz EGRESOS por semana (Sem 1..Sem 24) por concepto (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...); valores en 0 (plantilla de flujo no llenada).
  - **APU Contractual**: analisis de precios unitarios (formato F01) con ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL + columna ANALISIS DE DATA (+1916 filas). Fecha 24 Jun 2025, "PPTO PTAR CREDITEX".
  - **RO**: Resultado Operativo presupuestal por FRENTE/PARTIDA/Descripcion, columna "Ppto F1 PTARI S/." y "Control" (+62 filas). TOTAL COSTO DE OBRA = 2,276,183.77; COSTO DIRECTO = 1,793,038.35; PRE Trabajos Preliminares = 182,704.14; SSO = 51,152.49; Topografia = 41,113.36.
  - **A. Partidas**: analisis por partida CONTRACTUAL (1) vs FASEO (2) vs DELTA (1-2). Trabajos Preliminares 182,704.14 (delta 0), SSO 51,152.49, Topografia 41,113.36, Acarreo materiales 50,438.29, Diseño 40,000 (+36 filas).
  - **A. Recursos**: analisis por recurso CONTRACTUAL vs REAL con desglose MO/MAT/EQH/SC y DELTA. Incidencias globales MO 0.22 / MAT 0.47 / EQH 0.08 / SC 0.23. PPTO total: MO 386,627.58 / MAT 840,604.83 / EQH 144,961.11 / SC 420,844.82 = 1,793,038.35 (+37 filas).
- Numeros clave: TOTAL COSTO DE OBRA 2,276,183.77 | COSTO DIRECTO 1,793,038.35 | Curva S CISTERNA (N1) 3,204,660.29 en esta version (difiere de la hoja "Curva S" interna 1,793,038.35) | Flujo de caja acum c/IGV 2,876,317.52 | Avance sem 6 = 9% prog / 9% ejec.
- Proposito: control integral del fisico valorizado semanal: compara avance programado vs ejecutado (Curva S), liga presupuesto-APU-RO y proyecta desembolsos (flujo de caja). Es el tablero semanal de costo directo de la PTARI.
- Origen -> Destino: sale del presupuesto contractual (F01/APU) + metrados de campo y tareos semanales; alimenta el RO, la Curva S de avance y el flujo de caja del proyecto / reporte a gerencia y cliente.
- Automatizacion: nucleo para GRAPCO. Curva S Resumen/Programado/Ejecutado -> modulo **Curva S (F07)**. Hojas PPTO/1-5/7.GG/APU -> **Presupuesto (BAC)** y motor de APU. Hoja RO + A.Partidas + A.Recursos -> modulo **Resultado Operativo (RO/CR/F06 + EVM)** con desglose 4 patas MO/MAT/EQH/SC. Flujo de Caja -> **GAP (Flujo de Caja no existe en plataforma)**. Ingesta via importador generico in-app por hoja; ojo: fechas almacenadas como strings "Mon Nov 03 2025..." requieren parseo.

---

### \05. Gestión Costos\12. Fisico Valorizado Semanal\1. Superado\Hoja de cálculo sin título.xlsx
- Tipo / formato: xlsx sin codigo de formato (borrador / notas sueltas). Carpeta "1. Superado".
- Hojas (1): Hoja 1 (rango B24:D36).
- Contenido: notas de diseño estructural de la NAVE, no datos de costo. Texto: "mayor detalle de losa colaborante", "dimensiones y caracteristicas de viga pr...", "diseño real considerando sobrecargas", "como se amarra en sismo (losa maciza)", "solicitar el diseño final de la nave", "sobrecarga considerado 200", "diseño de losa 200k/m2 | diseño | 5 a 6 ton", "union de fierro de construccion con vi...".
- Numeros clave: sobrecarga 200 k/m2; 5 a 6 ton (referencias de diseño, no montos).
- Proposito: apuntes tecnicos sueltos sobre el diseño de losa/nave; sin valor de control de costos.
- Origen -> Destino: notas manuales del equipo tecnico; no alimenta ningun calculo.
- Automatizacion: GAP / descartar. No corresponde a ningun importador (no es data estructurada de costos).

---

### \05. Gestión Costos\12. Fisico Valorizado Semanal\GP-GCE-FOR-F07_CURVA S PTARI CREDITEX.xlsx
- Tipo / formato: xlsx. Codigo **GP-GCE-FOR-F07** (Curva S). Reusa F01 (Presupuesto/APU) y PRO-GCE-FOR-F03 (GG). Version VIGENTE (raiz de la carpeta, no "Superado").
- Hojas (17): identicas a la version "Copia": Curva S Resumen | Curva S Programado | Carátula | Flujo de Caja | Curva S | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 7. GG | Hoja 8 | APU Contractual | RO | A. Partidas | A. Recursos.
- Contenido por hoja relevante (mismas estructuras que la version Copia; difieren los valores programados):
  - **Curva S Resumen**: columnas PROGRAMADO (CD Semanal/%/Acum/% Prog) y EJECUTADO (idem). Sem 6 prog 219,662.96 (12%) vs ejec 179,046.99 (10%); sem 12 prog acum 772,303.45 (42%) vs ejec acum 758,283.06 (41%) (+15 filas). Esta version reprograma la curva (sem 6 sube de 9% a 12%).
  - **Curva S Programado / Curva S**: misma matriz partida x dia x semana (inicio Lun 03 Nov 2025, meses 1-12, sem 1-57). En "Curva S Programado" N1 CISTERNA 1,796,214.57 / N2 PRELIMINARES 183,870.73 / N3 SSO 38,765.32; en "Curva S" N1 1,793,038.35 / N2 182,704.14 / N3 51,152.49 (+256 / +110 filas).
  - **Carátula / Flujo de Caja / PPTO / 1.PRE..5.ARQ / 7.GG / Hoja 8 / APU Contractual / RO / A.Partidas / A.Recursos**: identicas a la version Copia (mismos encabezados, mismos formatos F01/F03, mismo plazo 4.50 meses / EST 130 dias). Flujo de Caja con desembolsos 1..8+ iguales (acum 2,437,557.22 s/IGV). RO TOTAL COSTO DE OBRA 2,276,183.77 / CD 1,793,038.35. A.Recursos incidencias MO 0.22 / MAT 0.47 / EQH 0.08 / SC 0.23.
- Numeros clave: CD 1,793,038.35 | TOTAL OBRA 2,276,183.77 | Curva programada sem 6 = 219,662.96 (12%) | sem 12 acum prog 772,303.45 (42%) / ejec 758,283.06 (41%) | Flujo acum c/IGV 2,876,317.52.
- Proposito: version vigente del fisico valorizado semanal de la PTARI; tablero oficial de avance programado vs ejecutado + flujo de caja + RO contractual.
- Origen -> Destino: presupuesto contractual + APU + metrados/tareos semanales -> Curva S de avance, RO y flujo de caja para reporte a gerencia/cliente.
- Automatizacion: misma ruta que la version Copia (preferir ESTA como fuente). Curva S -> **Curva S (F07)**; PPTO/APU -> **Presupuesto (BAC)**; RO/A.Partidas/A.Recursos -> **Resultado Operativo (RO/CR/F06 + EVM)** con 4 patas; Flujo de Caja -> **GAP (Flujo de Caja)**. Importador generico in-app por hoja; parsear fechas string.

---

## Notas transversales del chunk
- Hay DOS versiones del F07 (vigente en raiz vs "Copia" en "1. Superado"): para ingesta usar la de la raiz; difieren los valores de la curva programada (la vigente reprograma sem 6 a 12% y muestra CISTERNA programada 1,796,214.57).
- El workbook F07 es un "todo en uno" que duplica info de las categorias Presupuesto, APU y RO: al automatizar conviene mapear cada hoja a su modulo destino y evitar doble carga de la misma data.
- GAP claro y recurrente: **Flujo de Caja / cronograma de desembolsos** (hojas Flujo de Caja y Hoja 8) no tiene modulo en GRAPCO.
- El tercer archivo ("Hoja de calculo sin titulo") es ruido (notas de diseño) y no debe automatizarse.
