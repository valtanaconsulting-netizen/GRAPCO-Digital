# CATEGORIA 9 — Flujo de Caja (CREDITEX PTARI / PTAR Planta 5)

Fichas detalladas por archivo del chunk `cat_9_Flujo_de_Caja.txt`.

---

### \05. Gestión Costos\9. Flujo de Caja\1. FC Banco BCP\Flujo de caja 14.01.26.xlsx
- **Tipo / formato:** Excel (.xlsx, 135 KB). Sin código GP/PRO en el volcado (flujo de caja "bancario" interno, no formato oficial).
- **Hojas:** `Hoja1` | `Hoja2`.
- **Contenido:**
  - **Hoja1 (A7:O34) — FLUJO DE CAJA (Soles):** matriz de EGRESOS por descripción y por quincena (1Q / 2Q) de ENERO a MAYO. Columnas: `Descripcion | Monto (total) | ENERO 1Q | ENERO 2Q | FEBRERO 1Q | 2Q | MARZO 1Q | 2Q | ABRIL 1Q | 2Q | MAYO 1Q | 2Q`. Líneas de egreso: `EGRESOS` (fila resumen), `Materiales / Proveedores / Subcontratistas`, `Planilla obreros`, `Planilla staff`, `Plame`, `IGV` (+12 filas no volcadas, presumiblemente más conceptos de egreso e ingresos/saldo de caja).
  - **Hoja2 (A3:H9) — comparativo Venta vs Costo por mes** (Enero–Mayo). Columnas: `Venta con IGV | Sin IGV | IGV` y `Costo con IGV | Sin IGV | IGV` y `Dif IGV`. Es un cuadre de IGV venta vs IGV costo (saldo a favor/pagar de IGV mensual).
- **Números clave:**
  - EGRESOS total: **S/ 2,673,937.29**.
  - Materiales/Proveedores/Subcontratistas: **S/ 1,530,000**.
  - Planilla obreros: **S/ 481,200** · Planilla staff: **S/ 245,800** · Plame: **S/ 184,700** · IGV: **S/ 194,000**.
  - Egreso quincenal mayor: ENERO 2Q **S/ 459,750** y FEBRERO 2Q **S/ 469,604.24**.
  - Hoja2 IGV: Venta con IGV mensual 728/830/640/610/190 (en miles, escala reducida); Dif IGV Enero 66.66, Feb 38.14, Mar 31.12, Abr 72.46, May 15.56.
- **Propósito:** Flujo de caja gerencial/bancario (BCP): proyección de egresos quincenales por naturaleza (materiales, planillas, PLAME, IGV) y cuadre IGV venta-costo para gestión de tesorería y liquidez.
- **Origen -> Destino:** Origen = presupuesto + cronograma de pagos a proveedores/planillas; cuadre IGV desde valorizaciones (venta) y compras (costo). Destino = planeación de tesorería / requerimiento de financiamiento bancario.
- **Automatización:** **GAP — Flujo de Caja** (no existe módulo). Ingerir vía importador genérico a un futuro módulo "Flujo de Caja / Tesorería": egresos por naturaleza x quincena, e IGV venta-costo. Parcialmente alimentable desde RO (costos por naturaleza MO/MAT/EQH/SC) e ISP (planillas HH x S/25.5).

---

### \05. Gestión Costos\9. Flujo de Caja\GP-GCE-FOR-F07_FLUJO CAJA PTARI CREDITEX 2026.02.01.xlsx
- **Tipo / formato:** Excel (.xlsx, 1335 KB). Código oficial **GP-GCE-FOR-F07** (formato Flujo de Caja). Internamente las hojas de presupuesto/APU usan **GP-GCE-FOR-F01** y GG usa **PRO-GCE-FOR-F03**. Es el libro maestro de flujo de caja con todo el sustento (presupuesto + Curva S + APU + RO embebidos).
- **Hojas (15):** `Carátula` | `Flujo de Caja` | `Curva S` | `PPTO` | `1. PRE` | `2. PRO` | `3. MOV` | `4. EST` | `5. ARQ` | `7. GG` | `Hoja 8` | `APU Contractual` | `RO` | `A. Partidas` | `A. Recursos`.
- **Contenido:**
  - **Carátula:** "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; "FLUJO DE CAJA PTAR PLANTA 5 - CREDITEX"; Revisión N°01; fecha 28/12/2025.
  - **Flujo de Caja (B1:N65):** "FLUJO DE DESEMBOLSOS - PTAR PLANTA 5". Columnas: `ITEM (DESEMBOLSO n) | FECHA DE PAGO | SIN IGV | ACUM TOTAL S/IGV | ACUM TOTAL C/IGV`. Cronograma de desembolsos quincenales del 15/12/2025 al 31/03/2026 (+38 filas con más desembolsos).
  - **Curva S (C1:GJ968):** cronograma valorizado diario por partida. Columnas: `ID | CREDITEX (descripción) | UND | METRADO | PU | SECTORES | SECTOR | CONTROL` + columnas diarias desde lun 03/11/2025 (Sem 1..) hasta ~57+ días, con metrado/parcial distribuidos por día. Partidas nivel N1 CISTERNA, N2 PRELIMINARES, N3 SSO, y PRE1 (alquiler andamios) con distribución diaria.
  - **PPTO (B1:W1031):** "PPTO REAL", GP-GCE-FOR-F01 v0, OBRA "PTAR PLANTA 5", CLIENTE CREDITEX, CONTRATISTA GRAPCO SAC, SUPERVISIÓN DISEÑOS RACIONALES, PLAZO 4.50 MESES. "1.- RESUMEN DEL PRESUPUESTO": ITEM | DESCRIPCIÓN | UND | CANT | P.U. | PARCIAL | TOTAL.
  - **1. PRE / 2. PRO / 3. MOV / 4. EST / 5. ARQ:** presupuestos por especialidad (Preliminares, Provisionales, Movimiento de Tierras, Estructuras, Arquitectura), formato GP-GCE-FOR-F01. Columnas: `ITEM | DESCRIPCIÓN | UND | CANT | P.U. | PARCIAL | SUBTOTAL | TOTAL | INCIDENCIAS (MO/MAT/EQH/SC) | MONTOS (MO/MAT/EQH/SC)`. La hoja **4. EST** añade columnas MANO DE OBRA: `IP | HH | MONTO | COSTO PROM`. Plazo EST = 130 días calendario.
  - **7. GG (A1:M1038):** "ANÁLISIS DE GASTOS GENERALES", PRO-GCE-FOR-F03 v1, página 8 de 10 (+131 filas de detalle de GG).
  - **Hoja 8 (B5:AE30):** flujo por semanas. `Descripcion | Parcial | MESES (1..7) → Sem 1..Sem 24`. Filas: VIENEN, EGRESOS, Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori (+15 filas). Valores volcados en 0 (plantilla/parcialmente vacía en lo visible).
  - **APU Contractual (B1:S3325):** análisis de precios unitarios completo, GP-GCE-FOR-F01, "PPTO PTAR CREDITEX", fecha 24/06/2025. Columnas: `ITEM | DESCRIPCIÓN | UND | CUADRILLA | CANTIDAD | PRECIO | PARCIAL | SUB TOTAL` (+1916 filas — APU íntegro).
  - **RO (B1:J1000):** Resultado Operativo embebido. `FRENTE | PARTIDA | Descripción | Ppto F1 PTARI S/. | Control`. TOTAL COSTO DE OBRA, COSTO DIRECTO, y partidas PRE/PRE1/PRE2 (+62 filas).
  - **A. Partidas (C1:M952):** análisis por partidas CONTRACTUAL (1) vs FASEO (2) vs DELTA (1-2). Columnas PARCIAL/TOTAL por cada uno.
  - **A. Recursos (C1:N952):** análisis por recursos CONTRACTUAL vs REAL, desglose MO/MAT/EQH/SC con incidencias.
- **Números clave:**
  - Desembolsos (SIN IGV): D1 222,159.95 · D2 162,593.57 · D3 325,540.04 · D4 708,659.80 · D5 505,524.50 · D6 334,119.87 · D7 98,394.64 · D8 80,564.86.
  - ACUM TOTAL S/IGV al D8: **S/ 2,437,557.22**; ACUM TOTAL C/IGV al D8: **S/ 2,876,317.52**.
  - RO: TOTAL COSTO DE OBRA **S/ 2,276,183.77**; COSTO DIRECTO **S/ 1,793,038.35**.
  - Partidas: TRABAJOS PRELIMINARES 182,704.14 (SSO 51,152.49 · Topografía 41,113.36 · Acarreo 50,438.29 · Diseño 40,000); DELTA contractual-faseo = 0.
  - A. Recursos — incidencias CD: MO 0.22 / MAT 0.47 / EQH 0.08 / SC 0.23; montos MO 386,627.58 · MAT 840,604.83 · EQH 144,961.11 · SC 420,844.82 → CD 1,793,038.35.
  - Cisterna N1 = 1,793,038.35 (= costo directo, la cisterna es el grueso de la obra).
- **Propósito:** Libro maestro de Flujo de Caja oficial (F07): cronograma de desembolsos (cobranza al cliente) con/ sin IGV, sustentado por presupuesto contractual, APU, Curva S, RO y análisis partidas/recursos. Base del control de liquidez y de la valorización proyectada.
- **Origen -> Destino:** Origen = presupuesto contractual (F01) + APU + Curva S + RO. Destino = proyección de desembolsos/cobranzas y control de avance valorizado vs caja.
- **Automatización:** **GAP — Flujo de Caja** como módulo dedicado. Sus insumos SÍ mapean a módulos existentes: PPTO/1.PRE..5.ARQ → **Presupuesto (BAC)**; APU Contractual → plataforma Costos (APU fuera de GRAPCO); Curva S → **Curva S (F07)**; RO/A.Partidas/A.Recursos → **Resultado Operativo (RO/CR/F06 + EVM)**; 7. GG → GG del RO. El cronograma de DESEMBOLSOS y la Hoja 8 (egresos por semana) son la pieza nueva a importar en un futuro importador de Flujo de Caja/Tesorería.

---

### \05. Gestión Costos\9. Flujo de Caja\GP-GCE-FOR-F07_FLUJO CAJA PTARI CREDITEX 2026.03.12.xlsx
- **Tipo / formato:** Excel (.xlsx, 39 KB). Código oficial **GP-GCE-FOR-F07**. Versión actualizada al 12/03/2026 (flujo real/seguimiento, mucho más liviano: solo la hoja de flujo).
- **Hojas (1):** `FLUJO DE CAJA`.
- **Contenido:**
  - **FLUJO DE CAJA (B1:O1014):** flujo de caja con seguimiento semanal real. Columnas: `Total | Control | Val. Acum al 28/02/26 | Semana 18 (07/03) | Sem 19 (14/03) | Sem 20 (21/03) | Sem 21 (28/03) | Sem 22 (04/04) | Sem 23 (11/04)`. Filas: `DELTA`, `Egresos`, `Adelanto de obra`, `Amortización`, `Valorización (CD + GG)`, `% Avance Acumulado`, `% Avance Semanal`, `CD` (+17 filas con más detalle de costo/avance).
- **Números clave:**
  - Valorización (CD + GG) Total: **S/ 2,166,997.56**; CD Total: **S/ 1,713,447.90**.
  - Val. Acum al 28/02/26: 1,570,423.13 (CD acum 1,241,735.69).
  - Adelanto de obra: **S/ 200,000**; Amortización: -200,000 (en 3 cuotas de -66,666.67 en Sem 20-22).
  - % Avance Acumulado: 0.72 (28/02) → 0.80 → 0.86 → 0.93 → 0.98 → 0.99 → 1.00.
  - % Avance Semanal: 0.72 / 0.07 / 0.07 / 0.06 / 0.06 / 0.01 / 0.01.
  - DELTA semanal: +90,746.21 / -43,278.06 / -36,120.56 / -5,177.18 / -5,965.41 / +4,654.59.
  - Egresos semanales: 162,524.82 / 74,188.17 / 64,003.29 / 52,518.20 / 21,669.98 / 21,669.98.
- **Propósito:** Seguimiento real del flujo de caja por semana del proyecto (Sem 18–23): valorización CD+GG vs egresos, adelanto y su amortización, DELTA (caja neta) y % de avance acumulado/semanal. Control vivo de liquidez vs avance.
- **Origen -> Destino:** Origen = valorizaciones aprobadas (venta CD+GG) + egresos reales + cronograma de amortización del adelanto. Destino = control de DELTA de caja semanal y cierre proyectado (avance llega a 100% en Sem 23 / 11-04-2026).
- **Automatización:** **GAP — Flujo de Caja** (módulo dedicado). Insumos mapeables: Valorización (CD+GG) → **Valorizaciones (cliente)**; CD/avance → **RO + Curva S (F07)** usando `obtenerSemana` (semanas del proyecto, S18=28/02..). La lógica nueva (adelanto, amortización, DELTA de caja, egresos reales semanales) es lo que falta y debería implementarse en el importador/módulo de Flujo de Caja, ligado a la numeración de semanas LPS.
