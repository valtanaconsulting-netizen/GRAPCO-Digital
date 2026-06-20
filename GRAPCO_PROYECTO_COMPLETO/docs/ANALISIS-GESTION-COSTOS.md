# Análisis del Sistema de Gestión de Costos — CREDITEX PTAR Planta 5 (PTARI + NAVE)

> Análisis de la carpeta **"05. Gestión Costos"** (sistema real de control de costos de GRAPCO para el proyecto CREDITEX) y su mapeo contra la plataforma digital GRAPCO 2026.
>
> Obra: **PTAR PLANTA 5** · Cliente: **CREDITEX S.A.A.** · Ubicación: Av. Los Hornos 185, Ate · Supervisión: Diseños Racionales
> Frentes: **F1 = PTARI** (obra civil, tanques de homogenización/oxidación) · **F2 = NAVE** (estructura metálica + losa colaborante)

---

## 1. Resumen ejecutivo

La carpeta "05. Gestión Costos" es el **sistema completo de control de costos** de la obra CREDITEX, organizado en 12 categorías que recorren el ciclo de vida económico del proyecto de principio a fin. Todos los formatos siguen la familia oficial **GP-GCE-FOR-Fxx** (F01 presupuesto/APU, F03 GG/recursos, F05 adicionales/APU, F06 Resultado Operativo, F07 registros/valorizaciones/curva S/flujo de caja, F10/F11 valorización de subcontratistas, F16 presupuesto real).

### El ciclo de control de costos, de principio a fin

1. **Presupuesto Venta** (oferta al cliente) → fija el precio contractual (CD + GG + Utilidad + IGV) y los metrados/PU ofertados. Dos linajes PTARI ("Venta Iván" jun-2025 → "Venta Grapco" dic-2025) + NAVE.
2. **Presupuesto (Contractual / BAC)** → línea base firmada; el alcance económico contra el que se mide todo.
3. **Presupuesto Real (F16)** → costo objetivo interno (lo que GRAPCO se compromete a gastar); línea base de costo del RO con las 4 patas MO/MAT/EQH/SC.
4. **Ejecución**: el costo real se construye desde **ISP** (HH de tareos × S/25.5/h = mano de obra) + **Almacén** (Kardex S10 = materiales/subcontratos) + **Registro de Facturas** + **GG de oficina**.
5. **Valorizaciones** (quincenales) → convierten el avance físico en dinero a cobrar al cliente (y registran el costo de los 12 subcontratistas).
6. **Adicionales/Deductivos (F05)** → trabajos no contractuales que ajustan el BAC y el valor ganado.
7. **RE-RO mensual (F06)** → núcleo EVM: compara BAC vs EV (valorizado/ganado) vs AC (costo real) → CPI/SPI/CV/EAC/VAC. 6 cierres (DIC25–MAY26).
8. **Físico Valorizado Semanal / Curva S (F07)** → avance programado vs ejecutado, % acumulado, SPI físico.
9. **Flujo de Caja (F07 + BCP)** → traduce avance y costo a timing de cobro/pago y saldo bancario; cierra el ciclo.

**Cifras macro del proyecto (con IGV):** Venta PTARI ≈ S/2.75–2.92 MM + Venta NAVE ≈ S/0.75–0.79 MM ≈ **S/3.5–3.7 MM**. Resultado final favorable: RO MAY26 cierra con **CPI 1.08**, CV +S/196,254.88 y utilidad estimada ~11 %.

---

## 2. Análisis por categoría

### Categoría 1 — Presupuesto (Contractual / BAC)

- **Propósito:** Línea base de costos (Budget At Completion). Presupuestos contractuales firmados de PTARI y NAVE; fuente de verdad para RO, valorizaciones y curva S.
- **Archivos/formatos clave (6):** `PPTTO GRAPCO Rev 30.06 vr Modif x Creditex 17.07.25.xlsx` (PTARI vigente), `PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx`, `PPTTO GRAPCO Rev 2 30.06.xlsx` (revisión superada), 2 PDF firmados. Formato **GP-GCE-FOR-F01** (v0).
- **Estructura:** Hojas Carátula, PPTO (resumen F01 con capítulos GLB), **RO** (desglose por partida 1001-1018 y sección CON/ACE/ENC/IMP, frente FA01), PRE/PRO/MOV/EST/ARQ (APU/metrados por especialidad), GG, APU, Recursos, Metrados. La hoja **RO es el puente** que convierte el presupuesto de venta en estructura de control por partida/frente.
- **Números clave:** PTARI Contractual — CD **S/1,825,339.08**; GG 26 % S/483,145.42; Utilidad 9 % S/164,280.52; Subtotal S/2,472,765.02; IGV S/445,097.70; **Costo Total S/2,917,862.72** (4.5 meses). Estructuras = 70 % del CD (Acero S/645,685.64 + Concreto S/402,704.26). NAVE Rev.03 — CD S/571,808.84; GG 26 %; Descuento comercial -12 %; **Costo Total S/791,908.58** (2.5 meses). PTARI superado: Costo Total S/2,924,057.72 (GG 27 %, +S/5,250 financieros).
- **Origen → destino:** Metrados + APU → hojas por especialidad → resumen F01 → hoja RO (partida/frente) → alimenta RE-RO, Valorizaciones, Curva S/F07 y CPI/SPI del EVM. BAC del proyecto ≈ S/2.40 MM de CD.

### Categoría 2 — Presupuesto Venta

- **Propósito:** Oferta económica que GRAPCO presenta a CREDITEX; punto de partida del control. Fija el precio contractual y alcance ofertado. Dos linajes PTARI (Iván → Grapco) + NAVE.
- **Archivos/formatos clave (21):** `PPTO GRAPCO-PTARI CREDITEX_Rev.01_2025-12-10.xlsx` (vigente F1), `Comparativo PPTO - PPTO VENTA.xlsx`, `PPTO GRAPCO-NAVE ...Rev.03`, `PPTTO GRAPCO-Creditex.xlsx` (Venta Iván jun-2025), cotización M&M (estructura metálica NAVE), versiones NAVE Opción A/B (3.5 vs 5.0 meses). Formatos **GP-GCE-FOR-F01** y **PRO-GCE-FOR-F03**.
- **Estructura:** Anatomía de ~10 páginas: Carátula → PPTO (6 títulos WBS) → 1.PRE…6.IISS (detalle por especialidad) → 7.GG → 8.APU (~1960 filas) → 9.Recursos (insumos S/ y USD, TC 3.80) → **10.RO** (reagrupa por frente FA01 + partida 1001-10xx). NAVE agrega Sectorización y Pull (Last Planner).
- **Números clave:** PTARI Venta Grapco — CD **S/1,692,825.73**; GG 29 %; Utilidad 9 %; **VENTA S/2,747,424.05** (50 obreros). PTARI Venta Iván CD S/1,519,610.12. NAVE Rev.03 — CD S/545,588.27; Descuento comercial -12 % (-S/103,513.63); **VENTA S/749,994.16**. PU MO oferta: Capataz 30.70, Operario 27.90, Oficial 22.03, Peón 19.93 S/HH (TC 3.80).
- **Origen → destino:** Entra metrados, planos DWG, normativa, cronograma .mpp, cotizaciones de terceros → sale el monto de venta (≈ S/3.50 MM c/IGV) = techo de ingreso; CD/APU → BAC del RE-RO; el comparativo Contractual-vs-Venta es origen de Adicionales/Deductivos.

### Categoría 3 — Presupuesto Real (F16)

- **Propósito:** Costo objetivo / meta interno (el "deber-gastar"). Línea base de costo del RO; el delta Contractual-Real es el margen objetivo.
- **Archivos/formatos clave (1):** `GP-GCE-FOR-F16-PPTO REAL_CREDITEX 2026.04.16.xlsx`. Hojas analíticas: **A. Partidas** (Contractual vs Real vs Delta), **A. Recursos** (cruce por MO/MAT/EQH/SC), **DATA CREDITEX** (incidencias y ratios x m²/m³); detalle PPTO Real + 1.PRE…6.IISS, 7.GG, 8.APU Real, 9.Recursos Real; contraste PPTO/APU/Recursos Contr.
- **Estructura:** Rev.01, base 28/12/2025, TC 3.80, 4.5 meses, área 400 m². Incidencias del costo real: **MO 25 % · MAT 26 % · EQH 4 % · SC 45 %**. APU Real trae cuadrilla, rendimiento, **IP Real** y Capataz por partida.
- **Números clave:** CD Contractual S/1,548,554.93 vs **Real S/1,493,748.64** (delta +S/54,806). Por pata: MO S/378,167.33 · MAT S/383,081.57 · EQH S/58,838.58 · SC S/667,170.36. GG 31 % vs 29-30 %. **Costo Total** Contractual S/2,561,862.94 vs Real S/2,446,479.85. Estructuras = 66 % del CD (Muro de Contención S/615,424.93). Ratio S/731.34 x m³.
- **Origen → destino:** Del Contractual se recalcula con APU Real → línea base de costo del RO y de la Curva S de egresos. Hoja 8 (programación de egresos semanal) está vacía.

### Categoría 4 — RE-RO (Resultado Operativo mensual / EVM)

- **Propósito:** Núcleo del control. RO mensual compara **BAC vs EV vs AC** por partida y proyecta utilidad/pérdida al término (VAC). Metodología EVM. 6 cierres firmados (DIC25–MAY26) en formato F06 con carpeta de sustento.
- **Archivos/formatos clave (90):** `GP-GCE-FOR-F06_RO_CREDITEX 2026.05.31.xlsx` (hojas RO, CR, Adicionales, Deductivos, DASH, GG), `GP-GCE-FOR-F07_REGISTRO ALMACEN`, `...REGISTRO FACTURAS`, `PRO-GCR-FOR-F01_ISP ...SEM21_RO.xlsx`, valorizaciones PTARI/NAVE, `Bancos 2026_Mayo.xls`.
- **Estructura:** Hoja **RO** = matriz por frente/partida con bloques Presupuesto (BAC) | PV | EV | AC/CV/CPI | Saldo | EAC | VAC. Hoja **CR** = motor del AC sumando **4 fuentes**: Facturas + Almacén + Tareos/ISP + GG Oficina. Hoja **DASH** = KPIs + glosario EVM. Hoja **GG** = detalle de gastos generales.
- **Números clave (MAY26):** **BAC S/2,894,540.52 · EV S/2,711,267.87 · AC S/2,515,013.00 · CV +S/196,254.88 · CPI 1.08 · EAC S/2,689,180.59**. AC desglosado: Facturas S/633,554 + Almacén S/1,059,513.43 + Tareos/ISP S/479,578.76 + GG Oficina S/342,366.81. MO S/25.50/h. Ganadoras: Acero +S/117,932 (CPI 1.32), Estructura Metálica +S/93,404. Perdedoras: Preliminares -S/42,528, Obras Provisionales -S/30,253. Utilidad estimada ~11 %.
- **Origen → destino:** Entran las 4 patas (AC), valorizaciones (EV), avance programado (PV) y presupuesto ± adicionales/deductivos (BAC) → salen CPI/CV/SPI/VAC/EAC y ranking de partidas. Cada cierre hereda el acumulado anterior.

### Categoría 5 — APU Partidas Adicionales (F05)

- **Propósito:** Sustenta el costo de partidas nuevas/adicionales con su APU propio (MAT/MO/Equipos → costo directo S/./und). Organizada por estado: 1. Superado · 2. Proceso · 3. APU Aprobados (S).
- **Archivos/formatos clave (16):** `GP-GCE-FOR-F05-APU N°01 Rev.02.xlsx` (Cerco Perimetrico, aprobado), `GP-GCE-FOR-F05-AD N°01 Rev.01` (superado), `ANALISIS DE APU - CALZADURAS Rev.01.xlsx`, `COMPARATIVO PERNOS.xlsx` (ingeniería de valor 5 alternativas), fichas técnicas/cotizaciones PDF (Hilti, Multipernos, Sika, EFCO).
- **Estructura:** 5 hojas: Carátula, Resumen/APU (escalera CD→GG→Utilidad→IGV), 1.MAT, 2.MO, 3.APU (rendimiento diario + cuadrilla + herramienta 5%MO). Tarifas por cargo: Operario 28.82/26.88, Peón 20.69/19.19, Capataz 29.56 S/HH.
- **Números clave:** AD-01 aprobado **164.43 S/./ML** (vs 176.24 superado, -7 % por optimizar rendimientos). Calzaduras: Contractual 378.65 vs Yireh premezclado 275.89 S/./M³. Comparativo anclajes: de Alt.1 Hilti S/21,079 (1.00) a Alt.5 Multipernos S/9,334.50 (0.44) → ahorro ~55 %.
- **Origen → destino:** Surge partida no contemplada → cotizaciones + ingeniería de valor → APU F05 evoluciona por revisiones → aprobado → inyecta el PU a Adicionales/Deductivos (cat. 8) → impacta Valorizaciones, RO y Flujo de Caja.

### Categoría 6 — ISP (Informe Semanal de Productividad)

- **Propósito:** Núcleo del control de productividad y costo de mano de obra. Mide IP real vs contractual vs meta por partida/semana y traduce HH a costo con tarifa única **S/25.5/h**. Detecta sobreconsumo (CPI<1), proyecta EAC/ETC y concilia HH campo vs HH planilla.
- **Archivos/formatos clave (28):** `PRO-GCR-FOR-F01_ISP CREDITEX SEM31.xlsx` (35 hojas: PC, CR, CHH, CIP + ISP-SEM01..31), versiones SEM21-30, superadas SEM04-20; subcarpeta **Control Planilla**: `HH PLANILLA VS HH CAMPO.xlsx`, `HORAS EXTRAS CREDITEX.xlsx`.
- **Estructura:** **PC** (catálogo WBS), **CR** (Costo MO prom 25.5; HH→costo por partida), **CHH** (Administración/Campo/Meta + CPI), **CIP** (IP Contractual/Meta/Actual + delta), **ISP-SEMxx** (previsión por frente PTAR/NAVE/Adicionales + metrado/HH/IP diario + CPI + forecast EAC/ETC).
- **Números clave:** Tarifa única S/25.5/h. CR (~SEM24): TOTAL OBRA 17,059 HH / S/301,537.5; CD 16,619 HH. Conciliación CHH (SEM23): Planilla 16,479.5 vs Campo 16,464 (delta solo 15.5 HH). CPI ascendente de 0.456 (SEM1) a ~0.81 (SEM28). ISP-SEM31: HH meta ~17,577 vs control ~20,412 (+5,151 HH).
- **Origen → destino:** De tareos de campo + metrado + IP de presupuesto/APU + HH planilla → costo MO semanal (HH × S/25.5) al RO (CR/F06) + CPI/EAC. Control Planilla legitima el costo MO; horas extras explican sobreconsumos.

### Categoría 7 — Valorizaciones (F07 cliente · F10/F11 subcontratistas)

- **Propósito:** Motor de facturación/cobranza. Avance físico → dinero (cantidad × PU contractual) → deducciones (amortización adelantos, fondo garantía 5 %, detracción 4 %) → monto a facturar. Dos caras: Cliente (ingresos) y 12 Subcontratistas (egresos).
- **Archivos/formatos clave (150):** `GP-GCE-FOR-F07_Val N°09.xlsx` (PTARI), liquidaciones PTARI/NAVE, `VAL-ADICIONALES N°06,07,08`, `GP-GCE-FOR-F10_NOPIN LIQUIDACION.xlsx` (SC), `GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL Nº06` (SSOMA, con hoja de ruta F11).
- **Estructura:** **(A) Cliente F07** — Carátula, 1.RESUMEN (VB → deducciones → LN → IGV → FG 5 % → Total a pagar), 2.PAGOS (cronograma factura/estado ABONADO/PENDIENTE), 3.RES.VAL, 4.VAL (partida × Presupuesto/Acum Ant/Actual/Acum/Saldo), 5.APUs Nuevos, **5.RO** (puente al RO). **(B) Subcontratistas F10/F11** — RESUMEN (trío CD VENTA / CD SC / CD VALORIZADO SC) + VAL; F11 SSOMA agrega ruta de aprobaciones (VB Campo/SSO/Calidad/Of.Técnica).
- **Números clave:** PTARI Val 09 (abr-2026): VB mes 123,473; LN 56,806.33; total a pagar 63,679.90; acum facturado 2,551,322.26 s/IGV; avance 96 %. NAVE liquidación: acumulado 541,991.85. Adicionales N°06/07/08: VB 35,722.19. SC NOPIN: contractual 10,992 / facturado 7,063.42. Constantes: IGV 18 %, FG 5 %, Detracción 4 %.
- **Origen → destino:** De sustento de metrados + PU contractual + APUs nuevos → factura al cliente (Flujo de Caja), hoja 5.RO inyecta el EV al RO, avance % a Curva S; las vals de SC son el costo (CD-SC vs CD-VENTA).

### Categoría 8 — Adicionales y Deductivos (F05)

- **Propósito:** Gestiona trabajos no contractuales (mayores metrados, partidas nuevas, cambios de diseño, servicios). Cada AD/SE es un expediente F05 enviado a Supervisión. Solo los **APROBADOS** amplían el BAC; APROBADOS+EJECUTADOS suman al EV. (No hay deductivos formalizados, solo adicionales y servicios.)
- **Archivos/formatos clave (62):** `GP-GCE-FOR-F05_ESTATUS ADICIONALES CREDITEX.xlsx` (maestro AD-01..AD-19 + cartera AD-24..AD-44), `...ESTATUS SERVICIOS` (SE-01/02), `AD N°24 Rev.01` (expediente completo), `AD N°08 Rev.03` (aprobado+abonado, con cotización SURE/PETS), bandeja `00_Rechazados`.
- **Estructura:** **Maestro** = fila por AD con CD/GG(0.26)/U(0.09)/SUBTOTAL/REVISION SUP./ESTADO EJECUCIÓN/ESTADO ADICIONAL/FACTURADO/ABONO/TIPO/COMENTARIO. **Expediente F05** = Carátula, Resumen, 1.Metrados, 2.APU, 3.Registro Fotográfico. Carpetas por estado: 1.Proceso · 2.Enviados(S) · 00_Rechazados.
- **Números clave:** Maestro: Subtotal GRAPCO **S/359,414.17**; Revisión Supervisión S/198,830.24; Facturado S/124,862.49. Servicios S/8,165.64 (facturado S/0). Mayor aprobado: AD-06' falsa zapata S/71,842.01. Pendiente grande: AD-19 Losa Nave S/94,214.15. Factores: GG 26 %, U 9 %, Oferta Comercial -6 %, IGV 18 %.
- **Origen → destino:** Solicitud (cliente/contratista/RFI) → Of. Técnica arma F05 → Supervisión → Aprobado/Rechazado → Ejecutado → Facturado → Abonado. Aprobados → BAC; Aprobados+Ejecutados → EV; Facturado/Abono → cobranzas/flujo de caja.

### Categoría 9 — Flujo de Caja (Tesorería)

- **Propósito:** Control de tesorería/liquidez: proyecta cuándo entra plata (valorizaciones, adelanto, devoluciones) vs cuándo sale (proveedores, planillas, impuestos) para asegurar saldo positivo. Dos lecturas: desembolsos del cliente vs cronograma valorizado, y flujo bancario real (BCP).
- **Archivos/formatos clave (3):** `GP-GCE-FOR-F07_FLUJO CAJA PTARI CREDITEX 2026.03.12.xlsx` (vista DELTA semanal), `...2026.02.01.xlsx` (flujo de desembolsos + curva S + RO), `1. FC Banco BCP\Flujo de caja 14.01.26.xlsx` (EGRESOS vs INGRESOS + saldo acumulado + cuadre tributario).
- **Estructura:** F07 semanal (S18-S23): DELTA, egresos por naturaleza (Staff OC/Obra, MO con conteo obreros, Materiales por proveedor, SC por contrato), Adelanto/Amortización, Valorización (CD+GG), % Avance. **FC Banco BCP:** matriz Descripción × quincenas con bloques EGRESOS/INGRESOS y RESUMEN (saldo acumulado) + cuadre IGV/Renta mensual.
- **Números clave:** Venta s/IGV 2,437,557.22 / c/IGV 2,876,317.52. Adelanto 200,000 (amort. -66,666.67 ×3). DELTA semanal: +90,746 / -43,278 / -36,121 / -5,177 / -5,965 / +4,655. **BCP:** Egresos 2,673,937.29 · Ingresos 3,578,529 · Saldo final 904,591.71 (pico 985,345.95).
- **Origen → destino:** Monto contractual del Presupuesto + % avance/valorización de Curva S/RO + egresos reales de Almacén/planillas → DELTA semanal y SALDO bancario acumulado. Último eslabón del ciclo; cierra contra CREDITEX, Precotex y el banco BCP.

### Categoría 10 — Cuadro de Necesidades

- **Propósito (teórico):** Planificación de requerimientos: qué recursos, cuánto y cuándo, derivado del metrado y cronograma. Pata "PLAN de adquisiciones" que precede a la compra (factura) y al consumo (kardex).
- **Estado real:** **CARPETA VACÍA** (0 archivos, 0 bytes, verificado). No es problema de OneDrive: carpetas hermanas sí tienen contenido. Este eslabón de planificación nunca se documentó en el entregable CREDITEX.
- **Estructura esperada (ausente):** Matriz Item / Código WBS / Recurso / Unidad / Cantidad requerida / Semana de necesidad / Frente / Estado de atención. No existe un Fxx asignado a esta categoría.
- **Origen → destino (teórico):** Metrados del Presupuesto explotados vía APU → Logística/Procura → Facturas + Almacén → RO + Flujo de Caja. En CREDITEX el control saltó directo a ejecución.

### Categoría 11 — Caja Chica

- **Propósito (teórico):** Fondo fijo de obra para gastos menores en efectivo (combustible, fletes, copias, EPP urgente, ferretería, viáticos) que no pasan por OC ni Almacén. Cada vale se imputa a partida/centro de costo y se rinde periódicamente.
- **Estado real:** **CARPETA COMPLETAMENTE VACÍA** (0 archivos, 0 bytes, verificado). No es problema de sincronización. Probablemente los gastos menores se absorbieron dentro de los GG del presupuesto/RO sin desagregado.
- **Estructura esperada (ausente):** Planilla de rendición (cabecera fondo fijo + detalle de vales + saldo + solicitud de reposición). No hay formato presente.
- **Origen → destino (teórico):** Custodio paga en efectivo → vales → rendición → imputación a partida → costo real del RO (GG) y salida de Flujo de Caja. En CREDITEX: flujo roto/inexistente.

### Categoría 12 — Físico Valorizado Semanal (Curva S, F07)

- **Propósito:** Curva S del proyecto: avance físico-valorizado semanal, CD Programado (baseline) vs CD Ejecutado en S/ y % acumulado. Representación del SPI físico e insumo de reportes a gerencia/cliente.
- **Archivos/formatos clave (3):** `GP-GCE-FOR-F07_CURVA S PTARI CREDITEX.xlsx` (17 hojas), versión superada con baseline distinta (evidencia de re-baseline), hoja de trabajo descartable.
- **Estructura:** **Curva S Resumen** (semana 6-26: Programado [CD Sem/%/Acum/%] vs Ejecutado), **Curva S Programado/Curva S** (cronograma valorizado diario por partida/sector, calendario desde lun 03/11/2025), Carátula (Rev.01 28/12/2025), Flujo de Caja, APU Contractual F01, RO, A.Partidas/A.Recursos.
- **Números clave:** **CD Programado S/1,839,669.94 · CD Ejecutado S/1,839,670.20** (~100 % al cierre S26). Hitos %: S6 12 % vs 10 %; S14 50 % vs 53 %; S18 79 % vs 72 % (mayor atraso); S26 100 % vs 100 %. Costo total obra (RO) S/2,276,183.77. Versión superada: baseline CD S/3,204,660 → re-baselineada a S/1,839,670.
- **Origen → destino:** Línea base de cronograma valorizado (metrado × PU del APU F01 + sectorización LPS) → ejecutado con avance físico real → % acumulado alimenta reportes, Valorizaciones, desembolsos del Flujo de Caja; diferencia Prog vs Ejec = SPI; se cruza con RE-RO para EVM.

---

## 3. Tabla de mapeo — Categoría → Módulo GRAPCO → Estado

| # | Categoría (sistema real) | Módulo / artefacto GRAPCO | Estado |
|---|--------------------------|----------------------------|--------|
| 1 | Presupuesto (Contractual / BAC) | Módulo **Presupuesto** + Catálogo_WBS; hoja RO ↔ esquema partida/frente del RO | **YA digitalizado** (BAC contractual). GAP: GG 26 % y MO no a S/25.5 (viene de APU originales) |
| 2 | Presupuesto Venta | Módulo **Presupuesto** (BAC); hoja 10.RO ↔ RO/CR; 9.Recursos ↔ costeo; venta ↔ Valorizaciones | **Parcial**. GAP: ~1960 filas de APU (módulo APU salió a Costos aparte), linaje Iván-vs-Grapco, descuento comercial -12 % |
| 3 | Presupuesto Real (F16) | Costo meta entra como **IP Meta + montos meta del Catálogo_WBS**; 4 patas ↔ RO (useRO) | **Parcial**. GAP: no hay editor de "Presupuesto Real" separado del contractual; programación de egresos (hoja vacía) |
| 4 | RE-RO (F06 / EVM) | Módulo **Resultado Operativo (RO/CR/F06 + EVM)**, useRO (Olas 1-5) | **YA digitalizado y automático**. GAP: ISP_Semanal automático, separación frentes F1/F2, conciliación Bancos |
| 5 | APU Partidas Adicionales (F05) | **Adicionales/Deductivos** (sustento del PU); `calcularCostoAPU` se conserva | **Parcial**. GAP: workflow por estados (Superado/Proceso/Aprobado + revisiones), cuadros comparativos/ingeniería de valor, repositorio de cotizaciones |
| 6 | ISP (productividad MO) | Módulo **ISP** (tareos HH × S/25.5); IP/CPI/EAC ↔ EVM; CIP ↔ IP del catálogo WBS | **YA digitalizado (núcleo)**. GAP: Control Planilla (HH planilla vs campo), horas extras, desglose previsión por frente |
| 7 | Valorizaciones (F07/F10/F11) | **Valorizaciones (cliente)** + Adicionales/Deductivos; hoja 5.RO ↔ RO | **Parcial**. GAP: valorización de **subcontratistas** (F10/F11, 12 SC), estado de cobranza por factura, workflow de aprobación F11 |
| 8 | Adicionales y Deductivos (F05) | **Adicionales/Deductivos** (PartidasExtras.jsx), defaults GG 26.47/U 9, frentes, estados | **YA digitalizado casi 1:1**. GAP: expediente F05 (metrados/APU/foto/PDF), cartera futura, servicios SE, bandejas Proceso/Enviados/Rechazados |
| 9 | Flujo de Caja (Tesorería) | Insumos vivos (Valorizaciones, RO/CR, Almacén, ISP) pero **sin módulo de flujo** | **GAP (no existe)**. Falta: cobranza con timing, saldo bancario BCP, cuadre tributario IGV/Renta |
| 10 | Cuadro de Necesidades | Derivable de Presupuesto/APU × CronogramaPro; Almacén maneja "requerimientos" operativos | **GAP (no existe como módulo)**. Carpeta vacía en CREDITEX → baja prioridad |
| 11 | Caja Chica | Ninguno; lo más cercano es la pata GG del RO | **GAP (no existe)**. Carpeta vacía → sin demanda real; baja prioridad |
| 12 | Físico Valorizado Semanal (Curva S) | Módulo **Curva S (F07)** + CronogramaPro/VDC (baseline CPM) | **YA digitalizado**. GAP: sectorización/cronograma valorizado diario en Excel; alinear F07 como baseline del CronogramaPro |

**Resumen de estados:** 5 categorías YA digitalizadas (1, 4, 6, 8, 12) · 4 parciales (2, 3, 5, 7) · 3 gaps totales (9, 10, 11).

---

## 4. GAPS y oportunidades

### Gaps de alto impacto (data viva, sin módulo o incompletos)

1. **Flujo de Caja / Tesorería — NO existe (PRIORIDAD ALTA).**
   Hay 3 archivos con data real y el ciclo de costos queda abierto sin él. Todos los insumos ya viven en la plataforma (Valorizaciones = ingresos; RO/CR + Curva S = CD+GG y % avance; Almacén + ISP = egresos; Adicionales + adelanto/amortización).
   *Recomendación:* nuevo módulo **Flujo de Caja** que reúse `useRO` y Valorizaciones, agregue la capa de **timing de cobro/pago + saldo bancario** y el cuadre tributario, alineado a las **Semanas LPS** (S1 = 03/11/2025; `obtenerSemana()`). El F07 03.12 ya está en clave semanal LPS (S18-S23), lo que facilita el calce.

2. **Valorización de Subcontratistas (F10/F11) — sin módulo dedicado (PRIORIDAD ALTA).**
   150 archivos, 12 SC, y son una pata del costo (CD-SC vs CD-VENTA). Hoy entran al RO de forma implícita pero sin importador/vista propia.
   *Recomendación:* importador/módulo de valorización de subcontratistas que vuelque el CD-SC al AC del RO y controle el margen del subcontrato + estado de cobranza/abono.

3. **Control Planilla (HH planilla vs HH campo + horas extras) — no digitalizado (PRIORIDAD MEDIA).**
   La plataforma costea con tarifa única S/25.5 sin distinguir planilla vs campo ni sobretiempo. La conciliación legitima el costo MO usado en el RO.
   *Recomendación:* vista "Control Planilla" anexa al ISP (delta planilla-campo + horas extras por trabajador).

4. **Expediente F05 de Adicionales (metrados + APU + foto + sustento PDF) — no digitalizado (PRIORIDAD MEDIA).**
   La app guarda solo la fila-resumen; no genera el documento de envío a Supervisión ni el workflow de bandejas (Proceso/Enviados/Rechazados), ni los Servicios (SE), ni la cartera futura.
   *Recomendación:* generador de expediente F05 + workflow de estados (reusa el módulo Adicionales existente).

### Gaps menores / decisión de no digitalizar

5. **Cuadro de Necesidades (cat. 10):** vacío en CREDITEX; derivable de Presupuesto/APU × CronogramaPro. Baja prioridad — generar automáticamente solo si surge demanda.
6. **Caja Chica (cat. 11):** vacío; gastos menores absorbidos en GG. Por principio "auditar antes de construir": **no digitalizar** salvo demanda real (mini-módulo de rendición que impute vales a partida).
7. **Conciliación de Bancos (cat. 4, `Bancos 2026_Mayo.xls`, 15.9 MB):** tesorería no digitalizada; encaja con el módulo Flujo de Caja propuesto.

### Inconsistencias transversales a conciliar

- **Costeo de MO:** el sistema real ofertó/APU con **tarifas por cargo** (Capataz 30.70/29.56, Operario 27.90/28.82, Oficial 22.03, Peón 19.93/20.69 S/HH) mientras la plataforma estandariza a **S/25.5/h único**. Cuadra para el RO/CR pero genera diferencias en Presupuesto Venta y APU de Adicionales — conviene documentar/conciliar.
- **Descuento comercial NAVE (-12 %) y Oferta Comercial (-6 % en AD):** no tienen campo propio en el modelo de Presupuesto/Adicionales.
- **Módulo APU:** salió de GRAPCO a la plataforma de Costos aparte; `calcularCostoAPU` se conserva solo para RO/adicionales. Las ~1960 filas de APU y la ingeniería de valor no tienen módulo en GRAPCO.

---

*Documento generado a partir del análisis de las 12 categorías de "05. Gestión Costos" (entregable CREDITEX PTAR Planta 5 — PTARI F1 + NAVE F2).*
