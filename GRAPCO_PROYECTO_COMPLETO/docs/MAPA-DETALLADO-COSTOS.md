# MAPA DETALLADO — Gestión de Costos CREDITEX (PTARI + NAVE)

> Análisis archivo-por-archivo de los 394 archivos de `05. Gestión Costos` (305 Excel leídos a contenido) + flujo de automatización propuesto. Generado 2026-06-19.



---

# 00 Â· RESUMEN Y FLUJO DE AUTOMATIZACIÃ“N â€” "05. GestiÃ³n Costos" (CREDITEX)

> Documento rector del sistema real de control de costos de CREDITEX (PTAR PLANTA 5).
> Frentes: **F1 = PTARI** (PTAR Planta 5) y **F2 = NAVE Industrial**.
> Consolida las fichas archivo-por-archivo de las 12 categorÃ­as (un `.md` por chunk en esta misma carpeta).

---

## 1) Resumen ejecutivo del universo de archivos

- **394 archivos** repartidos en **12 categorÃ­as** (`cat_1_*` â€¦ `cat_12_*`), un sistema vivo de control de costos de obra de CREDITEX.
- Nomenclatura corporativa de formatos (GRAPCO / Valtana):
  - **GP-GCE-FOR-F01** â€” Presupuesto / APU (banco de precios unitarios).
  - **PRO-GCE-FOR-F03** â€” Recursos / Gastos Generales / Sustento de metrados.
  - **PRO-GCE-FOR-F05 / GP-GCE-FOR-F05** â€” Adicionales (AD/SE), metrados, APU, cotizaciones.
  - **GP-GCE-FOR-F06** â€” Resultado Operativo (RO) + EVM (CR, Adicionales/Deductivos, DASH, GG).
  - **GP-GCE-FOR-F07** â€” multi-uso: Registro AlmacÃ©n (Kardex S10), Registro Facturas, Registro GG Oficina, ValorizaciÃ³n al cliente, LiquidaciÃ³n, Curva S, Flujo de Caja.
  - **GP-GCE-FOR-F10 / F11** â€” ValorizaciÃ³n de Subcontratistas / hoja de ruta STANDARD.
  - **GP-GCE-FOR-F16** â€” Presupuesto Real (BAC / Meta vs Contractual).
  - **PRO-GCR-FOR-F01** â€” ISP (Informe Semanal de ProducciÃ³n / HH-IP-CPI).
  - **GP-GIN-FOR-F05** â€” Tablero de estatus de adicionales.
  - Exports S10 `*_AL_*.XLSX` (PARTIDACONTROLCONSULTA) por grupo de material.
  - Auxiliares no GP: `Bancos *.xls` (tesorerÃ­a corporativa multi-empresa), `.mpp`, `.dwg`, `.pdf`, `.png`, `.jpeg`.
- **CategorÃ­as:** 1 Presupuesto Â· 2 Presupuesto Venta Â· 3 Presupuesto Real Â· 4 RE-RO (Resultado Operativo + sustentos, el corazÃ³n) Â· 5 APU Adicionales Â· 6 ISP Â· 7 Valorizaciones (cliente + subcontratistas) Â· 8 Adicionales y Deductivos Â· 9 Flujo de Caja Â· 12 FÃ­sico Valorizado Semanal (Curva S).
- **NÃºmeros ancla vigentes (cierre mayo 2026):** BAC â‰ˆ **S/ 2.31 M** (F1) + **S/ 0.69 M** (F2 NAVE Rev.03); AC TOTAL REGISTRO **S/ 2,515,013.00**; CPI global **0.93**; tarifa MO Ãºnica **S/ 25.50/HH**; T.C. **3.80**.

---

## 2) Flujo de automatizaciÃ³n end-to-end (en ORDEN, con dependencias)

La regla de oro (gran lenguaje de datos): **se ingiere primero lo que define la lÃ­nea base** (catÃ¡logo + presupuesto), luego lo que aporta avance valorizado (valorizaciones), luego lo que aporta costo real (almacÃ©n, facturas, ISP, GG) y al final el RO **consolida** todo. El RO ya estÃ¡ vivo (`useRO`); es el espejo de validaciÃ³n de cada importaciÃ³n.

```
                     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FASE 0: ESTRUCTURA (una vez) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 (1) Presupuesto F01/F16  â”€â–º  Importador genÃ©rico  â”€â–º  PRESUPUESTO (BAC) + Catalogo_WBS  â”€â–º IP Meta/Ppto
 (2) Recursos F03         â”€â–º  Importador catÃ¡logo   â”€â–º  CatÃ¡logo de insumos + COSTO_HORA 25.5
 (3) Hoja RO / 12.RO      â”€â–º  Importador BAC        â”€â–º  Meta del RO por FRENTE(F1/F2)+PARTIDA(WBS)
                     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                              â”‚ (define partidas y meta)
                                              â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FASE 1: AVANCE VALORIZADO (EV) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 (4) ValorizaciÃ³n cliente F07 (4.VAL / 5.RO)  â”€â–º VALORIZACIONES  â”€â–º Earned Value + Curva S (F07)
 (5) Adicionales/Deductivos F05/F07 (estatus) â”€â–º ADICIONALES     â”€â–º ajusta BAC/EV (solo APROBADOS)
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                              â”‚
                                              â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FASE 2: COSTO REAL (AC = 4 patas) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 (6) AlmacÃ©n S10 *_AL_*.XLSX + F07 consolidado â”€â–º Â«Importar Registro S10Â» (acum/delta) â”€â–º ACÂ·Materiales
 (7) ISP PRO-GCR-FOR-F01 (CR/ISP-SEMxx)         â”€â–º ISP (HH Ã— S/25.5)  â”€â–º ACÂ·Mano de Obra + CPI/VAR
 (8) Registro Facturas F07 (CR/RESUMEN)         â”€â–º Import. genÃ©rico / F10-F11 â”€â–º ACÂ·Subcontratos+Compras
 (9) Registro GG Oficina F07 (acumulado)        â”€â–º Import. genÃ©rico (prorrateo) â”€â–º ACÂ·Gastos Generales
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                              â”‚ (4 patas + GG + EV + adic/deduc)
                                              â–¼
       (10) RESULTADO OPERATIVO  GP-GCE-FOR-F06 (useRO)  â”€â–º  RO/CR Â· EVM Â· DASH
                                              â”‚
                                              â–¼
       (11) FLUJO DE CAJA (FALTA)  â—„â”€â”€ egresos: ISP + AlmacÃ©n + Facturas + GG + IGV + adelantos
```

**Detalle por paso (fuente â†’ parser â†’ destino â†’ quÃ© calcula):**

1. **Presupuesto F01 / F16** (hojas PPTO, 1.PRE..6.IISS) â†’ importador genÃ©rico â†’ **Presupuesto (BAC) + Catalogo_WBS** â†’ lÃ­nea base de costo y partidas de control; el catÃ¡logo es la fuente Ãºnica de IP Meta/Ppto para el CPI.
2. **Recursos F03** (CÃ“DIGO/UND/SOL/USD, T.C. 3.80) â†’ importador de catÃ¡logo â†’ **catÃ¡logo de insumos / costo MO** â†’ normaliza a `COSTO_HORA_PROMEDIO = 25.5`.
3. **Hoja RO / 12.RO** â†’ importador BAC â†’ **meta del RO por FRENTE+PARTIDA** â†’ costo meta contra el cual se mide todo.
4. **ValorizaciÃ³n cliente F07** (hoja 4.VAL avance por partida, 5.RO costo por frente) â†’ **mÃ³dulo Valorizaciones** â†’ **Earned Value** y **Curva S (F07)**.
5. **Adicionales/Deductivos F05/F07 + tablero estatus** â†’ **mÃ³dulo Adicionales/Deductivos** â†’ ajusta BAC/EV; **solo entran los APROBADOS** (campo estado).
6. **AlmacÃ©n S10** (`*_AL_*.XLSX` por grupo + F07 consolidado hoja Data/CR) â†’ **Â«Importar Registro S10Â»** (maestro acumulado, calcula deltas) â†’ **AC pata Materiales** (solo lÃ­neas MATERIALES; subcontratos van a IISS/Facturas, no doble).
7. **ISP PRO-GCR-FOR-F01** (ISP-SEMxx matriz partidaÃ—dÃ­a, CR, CIP, PC) â†’ **mÃ³dulo ISP** (HH Ã— S/25.5, IP/CPI desde Catalogo_WBS) â†’ **AC pata Mano de Obra** + CPI/VAR. Fuente ideal = Registros_Campo (tareo facial), no el Excel.
8. **Registro Facturas F07** (CR/RESUMEN) â†’ importador genÃ©rico (o futuro F10/F11) â†’ **AC pata Subcontratos/compras facturadas**.
9. **Registro GG Oficina F07** (acumulado, multi-empresa) â†’ importador genÃ©rico con prorrateo por proyecto â†’ **AC pata Gastos Generales**.
10. **RO GP-GCE-FOR-F06** (RO/CR/Adicionales/Deductivos/DASH/GG) â†’ nÃºcleo **`useRO`** (ya vivo) â†’ consolida 4 patas + GG + EV + adic/deduc â†’ Dashboard RO. Se usa como **espejo de validaciÃ³n** de los importadores.
11. **Flujo de Caja** (FALTA mÃ³dulo) â†’ recibirÃ­a egresos derivados de ISP + AlmacÃ©n + Facturas + GG + IGV + adelantos/amortizaciones.

---

## 3) Tabla maestra â€” Formato â†’ aporte â†’ importador â†’ destino â†’ prioridad

| Formato (Fxx) | QuÃ© aporta | Importador en plataforma | MÃ³dulo destino | Prioridad |
|---|---|---|---|---|
| **F01** Presupuesto/APU | BAC, partidas, APU contractual | GenÃ©rico in-app (EXISTE); APU FUERA (plataforma Costos) | Presupuesto (BAC) / Catalogo_WBS | Alta |
| **F16** Presupuesto Real | BAC Meta vs Contractual, 4 patas | GenÃ©rico (EXISTE) | Presupuesto / RO (EVM) | Alta |
| **F03** Recursos / GG / Sustento metrados | Insumos, costo MO, GG, metrados fÃ­sicos | CatÃ¡logo (parcial); sustento metrados **FALTA** | CatÃ¡logo insumos / GG | Media |
| **F06** Resultado Operativo / EVM | RO/CR/DASH, 4 patas, adic/deduc | **EXISTE** (useRO, vivo) | Resultado Operativo | â€” (nÃºcleo) |
| **F07 Â· Registro AlmacÃ©n** (S10) | AC materiales (acum/delta) | **EXISTE** Â«Importar Registro S10Â» | AlmacÃ©n â†’ RO | Alta |
| **F07 Â· Registro Facturas** | AC subcontratos/compras | GenÃ©rico (EXISTE, parcial); detalle **FALTA** | RO pata Facturas | Alta |
| **F07 Â· Registro GG Oficina** | AC gastos generales (prorrateo) | GenÃ©rico (EXISTE); prorrateo **FALTA** | RO pata GG | Media |
| **F07 Â· ValorizaciÃ³n cliente / LiquidaciÃ³n** | EV, avance, Curva S | **FALTA** importador F07 dedicado | Valorizaciones / EV | Alta |
| **F07 Â· Curva S (fÃ­sico valorizado)** | Programado vs Ejecutado | **FALTA** (Hoja 8 viene en 0/#REF!) | Curva S (F07) | Alta |
| **F07 Â· Flujo de Caja / Bancos** | Egresos, IGV, adelantos | **FALTA** total | Flujo de Caja (nuevo) | Alta |
| **F10 / F11** Val. Subcontratistas | AC subcontratos (contrato/amort/saldo) | **FALTA** total | Val. Subcontratistas (nuevo) | Alta |
| **F05 / SE / GIN-F05** Adicionales/Deductivos + estatus | Adicionales, servicios, estado | GenÃ©rico (EXISTE); estado/versionado **FALTA** | Adicionales/Deductivos | Media |
| **PRO-GCR-FOR-F01** ISP | HH/IP/CPI, AC mano de obra | GenÃ©rico (parcial); **dedicado FALTA** | ISP / RO (EVM) | Alta |
| **Control Planilla** (CHH, RRHH, Horas Extra) | HH planilla vs HH campo, PLAME | **FALTA** total | Control Planilla (nuevo) | Media |
| **.mpp / .dwg / .pdf / .png / .jpeg** | Cronograma MS Project, planos, guÃ­as, capturas | **FALTA** (no ingerible / OCR) | GestiÃ³n documental | Baja |

---

## 4) Plan de importadores a construir (priorizado)

| # | Importador a construir | Fuente | Esfuerzo | JustificaciÃ³n |
|---|---|---|---|---|
| **P1** | **Importador F07 ValorizaciÃ³n cliente** (4.VAL + 5.RO, acumulados) | F07 VAL N01-09 + LiquidaciÃ³n + NAVE | **M (3-5 d)** | Cierra el EV del RO; hoy el avance valorizado no entra estructurado. |
| **P2** | **Importador ISP dedicado** (matriz partidaÃ—dÃ­a HH/IP/CPI, FORECAST/DELTA) | PRO-GCR-FOR-F01 | **M (3-5 d)** | El genÃ©rico no captura la matriz semanal; pata MO + CPI/VAR. Ideal: recalcular desde tareo facial. |
| **P3** | **MÃ³dulo ValorizaciÃ³n de Subcontratistas (F10/F11)** | F10/F11 + PRO-GCE-FOR-VAL | **L (1-2 sem)** | Gap central de cat_7_p3; 1 de las 4 patas del AC (MT/SURE/ENC/M&M/IISS). Maneja contrato, amortizaciÃ³n, deducciÃ³n, saldo. |
| **P4** | **MÃ³dulo Curva S / FÃ­sico Valorizado (F07)** | F07 Curva S + Hoja 8 | **M (3-5 d)** | Programado vs Ejecutado por semana; hoy Hoja 8 llega en 0/#REF! (re-baseline necesario). |
| **P5** | **MÃ³dulo Flujo de Caja** | Bancos *.xls + F07 FC + egresos derivados | **L (1-2 sem)** | Sin destino; tesorerÃ­a, IGV, adelantos/amortizaciÃ³n, egresos por quincena. Requiere filtro CREDITEX (multi-empresa). |
| **P6** | **MÃ³dulo Control de Planilla** | Hoja CHH ISP + RRHH + Horas Extra | **M (3-5 d)** | ConciliaciÃ³n HH planilla vs HH campo (delta ~16 HH constante) + PLAME para flujo de caja. |
| **P7** | **Prorrateo GG Oficina por proyecto** | F07 GG Oficina acumulado | **S (1-2 d)** | Multi-empresa; hoy se cargarÃ­a el total sin repartir a CREDITEX. |
| **P8** | **Importador sustento de metrados (F03)** | PRO-GCE-FOR-F03 (13 archivos) | **M (3-5 d)** | m3/m2/kg/ml por partida; hoy solo llega la cantidad final a Valorizaciones. |
| **P9** | **Control de versiones / estado (transversal)** | Todos (Rev/Superado/Aprobado) | **S (2-3 d)** | Elegir vigente vs histÃ³rico; descartar Superado; estado Aprobado/Rechazado no debe impactar RO. |
| **P10** | **OCR / adjuntos documentales** | PDF guÃ­as, SUNAT, .mpp, .dwg, .png | **L (opcional)** | Baja prioridad; evidencia, no dato de costo. |

**Total de importadores/mÃ³dulos faltantes para automatizar TODO: 10** (de los cuales **P1â€“P6 son los crÃ­ticos**; el RO, el AlmacÃ©n S10, el Presupuesto genÃ©rico y el genÃ©rico de facturas/GG ya existen).

---

## 5) Inconsistencias a conciliar (antes/durante la ingesta)

1. **Tarifa MO: S/25 (origen) vs S/25.50 (plataforma).** ISP SEM04-20 y Presupuesto Real usan **S/25**; SEM21+ ya usan **S/25.50**. APU Calzaduras usa tarifas por cargo (Capataz 29.56 / Operario 26.88 / PeÃ³n 19.19). **Regla: normalizar TODO a `COSTO_HORA_PROMEDIO = 25.5`** al importar; ignorar tarifas por cargo.
2. **Cargo PEÃ“N** (APU adicionales) no existe en GRAPCO â€” solo 4 cargos: Capataz/Operario/Oficial/Ayudante. **Mapear/descartar** al ingerir.
3. **Descuento comercial / deductivo DISEÃ‘O âˆ’S/40,000** (PTARI 12-09 â†’ 12-10) y deductivos puntuales (âˆ’S/2,790.40 en mayo) â†’ deben entrar por **Adicionales/Deductivos**, no perderse en el delta.
4. **Frentes F1 (PTARI) / F2 (NAVE) aÃºn pendientes de segregaciÃ³n en el RO.** Toda valorizaciÃ³n 5.RO trae dimensiÃ³n frente; el RO debe separarlas (formalizado reciÃ©n en ISP SEM24). **Pendiente estructural.**
5. **Re-baseline Curva S.** La Hoja 8 (cronograma valorizado/egresos por semana) **viene en 0 o con #REF! en casi todos los libros** â†’ la Curva S de costo no estÃ¡ cargada en origen; requiere reconstruir la lÃ­nea base programada antes de comparar contra ejecutado.
6. **Aislamiento por proyecto.** Bancos *.xls y GG Oficina **mezclan CREDITEX + PRECOTEX + editorial** â†’ filtrar por contexto CREDITEX (creditex-ptar) antes de ingerir.
7. **Higiene de plantillas heredadas.** Cabeceras "PRECOTEX LAS MORERAS", "Agromillora/Ica", hoja IISS rotulada "ARQUITECTURA", rÃ³tulos "SEMANA NÂ°06" arrastrados, y celdas #REF!/#DIV/0!/#N/A â†’ **validar OBRA/CLIENTE y sanear** al importar.
8. **Versionado / doble conteo.** Rev.xx vs "Superado", VAL NÂ°03 A&CR (_Continuidad y _Liquidacion), M&M VAL NÂº02 duplicada, ISP Superado vs _RO de la misma semana, libros ISP de ~6 MB que replican todas las semanas â†’ **deduplicar por semana/quedarse con el Ãºltimo** y nunca cargar Superado.
9. **Doble conteo subcontratos:** aparecen en AlmacÃ©n (lÃ­neas SC) **y** en Registro Facturas â†’ el importador S10 debe excluir SC (solo MATERIALES) para no contarlos dos veces.



---

# Categoria 1 â€” Presupuesto (CREDITEX: PTARI + NAVE)

Fichas detalladas por archivo del chunk `cat_1_Presupuesto.txt`. Solo se documenta lo visible en el volcado de Excel.

---

### \05. GestiÃ³n Costos\1. Presupuesto\1. PTARI (S)\1. Superado\PPTTO GRAPCO Rev 2  30.06.xlsx
- **Tipo / formato:** xlsx (817 KB). Formato GRAPCO de presupuesto `GP-GCE-FOR-F01` (hojas de PPTO/partidas/APU) + `PRO-GCE-FOR-F03` (GG y Recursos). Marcado en carpeta "1. Superado" = version PREVIA/no vigente del presupuesto PTARI.
- **Hojas (12):** CarÃ¡tula | PPTO | PRE | PRO | MOV | EST | ARQ | GG | APU | Hoja 8 | Recursos | Metrados
- **Contenido por hoja:**
  - **CarÃ¡tula:** portada "PTAR CREDITEX", denominacion "PPTO PTAR CREDITEX", REVISION NÂ°01, fecha 24-Jun-2025.
  - **PPTO** (GP-GCE-FOR-F01, pag 1 de 10): Resumen del presupuesto. Cabecera con OBRA "PTAR CREDITEX", CONTRATISTA GRAPCO SAC, SUPERVISION NA, PLAZO 4.50 meses. Tabla con columnas ITEM | DESCRIPCION | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.). (+15 filas).
  - **PRE** (pag 2): Presupuesto Trabajos Preliminares; misma estructura de columnas con SUBTOTAL/TOTAL. (+21 filas).
  - **PRO** (pag 3): Presupuesto Obras Provisionales. (+24 filas).
  - **MOV** (pag 4): Presupuesto Movimiento de Tierras. (+15 filas).
  - **EST** (pag 5): Presupuesto Estructuras (la mas extensa de las especialidades, +49 filas).
  - **ARQ** (pag 6): Presupuesto Arquitectura. (+13 filas).
  - **GG** (PRO-GCE-FOR-F03 v1, pag 8): "4.- ANALISIS DE GASTOS GENERALES", con seccion A. CARACTERISTICAS. (+132 filas) â€” desglose de gastos generales.
  - **APU** (GP-GCE-FOR-F01, pag 9): Analisis de Precios Unitarios. Columnas ITEM | DESCRIPCION | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.) | SUB TOTAL (S/.). Muy extensa (+1858 filas) = banco completo de APUs.
  - **Hoja 8:** cronograma valorizado / flujo de egresos por semana (Sem 1..Sem 24, en 7 meses). Filas: VIENEN, EGRESOS, Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori... En esta version los egresos figuran en 0 (plantilla sin llenar). (+15 filas).
  - **Recursos** (PRO-GCE-FOR-F03 v0, pag 10): listado de recursos. T.C. = 3.80. Columnas CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS (leyenda REALIZADO/EN PROCESO/PENDIENTE). Empieza 1.01 MANO DE OBRA. (+344 filas) = insumos de MO, materiales, equipos con precios SOL/USD.
  - **Metrados:** memoria de metrados manual (demolicion losa, calzaduras de cimientos, anillos con Long/altura/Prof -> m3/m2). Ej. Oxidacion 20x12=240 m2; subtotal 405.20 m2. (+52 filas).
- **Numeros clave:** PLAZO 4.50 meses; T.C. 3.80; metrado demolicion 405.20 m2. (Los totales en soles no aparecen explicitos en el volcado de esta version superada).
- **Proposito:** Presupuesto meta (BAC) original PTARI por especialidades, con su APU, GG, recursos y metrados. Es la linea base de costos.
- **Origen -> Destino:** Sale del area de costos GRAPCO (estimacion) -> alimenta la version Contractual y el Resultado Operativo.
- **Automatizacion:** Importar PPTO + hojas de especialidad al modulo **Presupuesto (BAC)**; APU al banco APU (hoy migrado a plataforma de Costos aparte); Recursos al catalogo de insumos; Hoja 8 a **Curva S (F07)**. Por ser version "Superado", NO se ingiere como vigente: solo referencia/historico. Usar **importador generico in-app**.

---

### \05. GestiÃ³n Costos\1. Presupuesto\1. PTARI (S)\2. Contractual\PPTTO GRAPCO Rev 30.06 vr Modif x Creditex 17.07.25.xlsx
- **Tipo / formato:** xlsx (835 KB). Mismo formato `GP-GCE-FOR-F01` / `PRO-GCE-FOR-F03`. Carpeta "2. Contractual" = version VIGENTE pactada con CREDITEX (modificada 17.07.25). Es el presupuesto base oficial PTARI (Frente F1).
- **Hojas (13):** CarÃ¡tula | **RO** | PPTO | PRE | PRO | MOV | EST | ARQ | GG | APU | Hoja 8 | Recursos | Metrados (agrega hoja RO respecto a la version superada).
- **Contenido por hoja:**
  - **CarÃ¡tula:** "PTAR CREDITEX", REVISION NÂ°01.
  - **RO** (la clave nueva): mapa Presupuesto -> Resultado Operativo. Columnas FRENTE | PARTIDA | DescripciÃ³n | Ppto F1 (PTARI, S/.). Filas con TOTAL COSTO DE OBRA y COSTO DIRECTO, y desglose por partida con codigo de frente (PRE1/PRE2...) + codigo FA01 + item (1.01, 1.02). Ej.: PRE TRABAJOS PRELIMINARES 182,704.14; PRE1/1.01 SEGURIDAD Y SALUD OCUPACIONAL 51,152.49; PRE2/1.02 TOPOGRAFIA 41,113.36. (+62 filas).
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

### \05. GestiÃ³n Costos\1. Presupuesto\2. NAVE (S)\Document_260323_153628.pdf
- **Tipo / formato:** PDF (870 KB) [no-Excel]. Nombre de escaneo generico (Document_260323 = 23-03-26).
- **Contenido:** no volcado (no-Excel). Por contexto = documento escaneado asociado al presupuesto NAVE (probable presupuesto firmado / acta / oferta escaneada de la misma fecha que el xlsx NAVE Rev.03).
- **Proposito:** respaldo documental del presupuesto de la NAVE (firma/aprobacion).
- **Origen -> Destino:** emitido/recibido en la negociacion NAVE -> respaldo del BAC NAVE.
- **Automatizacion:** adjuntar como documento de respaldo al presupuesto NAVE (gestor documental / adjunto en modulo Presupuesto). No es fuente de datos estructurada. **GAP** si se requiere extraer cifras del PDF.

---

### \05. GestiÃ³n Costos\1. Presupuesto\2. NAVE (S)\PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx
- **Tipo / formato:** xlsx (2450 KB). Formato `GP-GCE-FOR-F01` / `PRO-GCE-FOR-F03`. Presupuesto **NAVE** (Frente F2 â€” estructura metalica y losa), Rev.03 al 23-Mar-2026. Version mas completa: incluye Esquema, Sectorizacion, RO y Pull Planning.
- **Hojas (15):** CarÃ¡tula | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 10. Esquema | 11. Sectorizacion | 12. RO | 9. Pull
- **Contenido por hoja:**
  - **CarÃ¡tula:** "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; "PPTO ESTRUCTURA METALICA Y LOSA"; PRESUPUESTO NÂ°02; fecha 19-Mar-2026.
  - **PPTO** (pag1): Resumen. OBRA "PTAR PLANTA 5", CLIENTE CREDITEX, SUPERVISION DISEÃ‘OS RACIONALES, REVISION NÂ°02. PLAZO F2 = 2.50 meses; TRASLAPE C/ F1 = 0.30 meses. Tabla ITEM/DESCRIPCION/UND/CANT/P.U./PARCIAL/TOTAL (+48 filas).
  - **1. PRE** (pag2): Trabajos Preliminares (+18 filas).
  - **2. PRO** (pag3): Obras Provisionales (+23 filas).
  - **3. MOV** (pag4): Movimiento de Tierras (+17 filas).
  - **4. EST** (pag5): Estructuras â€” la mas grande (+101 filas; estructura metalica).
  - **5. ARQ** (pag6): Arquitectura (+39 filas).
  - **6. IISS** (pag7): Instalaciones Sanitarias (+18 filas) â€” especialidad nueva respecto a PTARI.
  - **7. APU** (pag9): Analisis de Precios Unitarios, columnas ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL. Banco enorme (+2477 filas).
  - **Hoja 8:** cronograma valorizado / egresos por semana (Sem 1..24); egresos en 0 en el volcado. (+15 filas).
  - **8. Recursos** (PRO-GCE-FOR-F03, pag10): recursos con T.C. 3.80; CODIGO/TIPO/DESCRIPCION/UND/SOL/USD/COMENTARIO/ESTATUS; arranca 1.01 MANO DE OBRA (+384 filas).
  - **10. Esquema** (pag7): hoja ESQUEMA (encabezado de obra; cuerpo no volcado).
  - **11. Sectorizacion:** LAYOUT DE OBRA / SECTORIZACION DE CIMENTACION; areas (ACOPIO DE QUIMICOS, LAVANDERIA, TALUD A TANQUES EXISTENTES) y sectores C1/C2/S1/S3; fase EXCAVACION. (+9 filas) â€” mapa de sectores LPS.
  - **12. RO:** mapa Presupuesto -> RO del Frente F2. Columnas FRENTE | PARTIDA | DescripciÃ³n | Ppto F2 (NAVE, S/.) | SUBTOTAL. Filas TOTAL COSTO DE OBRA, COSTO DIRECTO, y partidas (PRE1/1.01 Seguridad 0; PRE2/1.02 Topografia 10,278.34; 1001 Trabajos Preliminares 14,797.89). (+61 filas).
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

### \05. GestiÃ³n Costos\1. Presupuesto\2. NAVE (S)\Presupuesto NÂ°02 - Grapco SAC...pdf
- **Tipo / formato:** PDF (1573 KB) [no-Excel]. "Presupuesto NÂ°02 - Grapco SAC" = impresion/PDF oficial de la oferta NAVE Rev.03 (presupuesto NÂ°02).
- **Contenido:** no volcado (no-Excel). Corresponde a la version PDF presentable/firmable del presupuesto NAVE NÂ°02 (mismo dato que el xlsx NAVE Rev.03).
- **Proposito:** documento de presentacion/aprobacion del presupuesto NAVE al cliente.
- **Origen -> Destino:** generado del xlsx NAVE -> entregable al cliente / respaldo contractual.
- **Automatizacion:** adjuntar como respaldo del BAC NAVE en gestor documental. No es fuente estructurada (el dato vivo va del xlsx). **GAP** si se requiriera extraer cifras solo del PDF.

---

## Resumen del chunk
- 4 archivos fichados (2 xlsx de presupuesto, 2 PDF de respaldo).
- 2 frentes: **F1 / PTARI** (contractual S/ 2,308,484.50) y **F2 / NAVE** (S/ 723,159.80).
- Fuente de costo meta para el RO = hojas **RO / 12. RO** de los xlsx.
- Plantillas: `GP-GCE-FOR-F01` (PPTO/APU) y `PRO-GCE-FOR-F03` (GG/Recursos).



---

# CatÃ¡logo de Costos â€” CategorÃ­a 2: Presupuesto Venta (chunk p1)

Proyecto: CREDITEX (PTARI "PTAR Planta 5" + NAVE Industrial). Contratista GRAPCO SAC. SupervisiÃ³n DiseÃ±os Racionales. T.C. = 3.80. 18 archivos fichados (12 Excel/xlsm + 1 dwg + 1 mpp + 2 pdf, mÃ¡s 2 duplicados de comparativo). Costeo MO de la plataforma con COSTO_HORA_PROMEDIO = S/25.50.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\1. Ppto PTARI Venta Ivan\1. Presupuesto\PPTTO GRAPCO-Creditex.xlsx
- **Tipo / formato:** xlsx (presupuesto base PTARI, versiÃ³n Ivan). Formularios: PPTO/PRE/PRO/MOV/EST/ARQ/APU = **GP-GCE-FOR-F01**; GG y Recursos = **PRO-GCE-FOR-F03**.
- **Hojas (12):** CarÃ¡tula | PPTO | PRE | PRO | MOV | EST | ARQ | GG | APU | Hoja 8 | Recursos | Metrados
- **Contenido:**
  - **CarÃ¡tula:** "PTAR CREDITEX", revisiÃ³n NÂ°01, fecha 24-jun-2025.
  - **PPTO:** resumen del presupuesto (1 DE 10). Campos: ITEM, DESCRIPCIÃ“N, UND, CANT, P.U. (S/.), PARCIAL (S/.), TOTAL (S/.). Obra "PTAR CREDITEX", plazo 4.50 meses.
  - **PRE / PRO / MOV / EST / ARQ:** presupuestos por especialidad (Trabajos Preliminares, Obras Provisionales, Movimiento de Tierras, Estructuras, Arquitectura). Mismo encabezado ITEM/DESCRIPCIÃ“N/UND/CANT/P.U./PARCIAL/SUBTOTAL/TOTAL. EST es la mÃ¡s extensa (+59 filas).
  - **GG:** anÃ¡lisis de gastos generales (4.- ANÃLISIS DE GASTOS GENERALES, caracterÃ­sticas A.) â€” +132 filas.
  - **APU:** anÃ¡lisis de precios unitarios (3.-), columnas ITEM, DESCRIPCIÃ“N, UND, CUADRILLA, CANTIDAD, PRECIO (S/.), PARCIAL (S/.), SUB TOTAL â€” +1858 filas (insumos MO/material/equipo por partida).
  - **Hoja 8:** flujo/cronograma valorizado por semanas (Sem 1â€“24, 7 meses), filas EGRESOS por partida (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...) â€” valores en cero en el volcado (plantilla).
  - **Recursos:** lista de recursos con CODIGO, TIPO, DESCRIPCION, UND, SOL, USD, COMENTARIO, ESTATUS (leyenda Realizado/En proceso/Pendiente). Empieza 1.01 MANO DE OBRA. +344 filas.
  - **Metrados:** sustento de metrados (demoliciÃ³n de losa, calzaduras de cimientos por anillo con Long/altura/Prof/m3/m2). Ej. oxidaciÃ³n 240 m2, total demoliciÃ³n 405.20.
- **NÃºmeros clave:** plazo 4.50 meses; demoliciÃ³n losa 405.20 m2; calzadura anillo 1 = 31.92 m3 / 45.60 m2.
- **PropÃ³sito:** presupuesto de venta original (versiÃ³n Ivan) del PTARI â€” base del costo directo, GG, APU y recursos.
- **Origen â†’ Destino:** metrados (hoja Metrados + APU) â†’ PPTO resumen â†’ es la versiÃ³n predecesora de la Rev.01 GRAPCO.
- **AutomatizaciÃ³n:** Presupuesto (BAC) vÃ­a importador genÃ©rico. APU â†’ catÃ¡logo de precios unitarios (legacy `calcularCostoAPU` para RO). Hoja 8 â†’ Curva S / Flujo de Caja (GAP). Recursos â†’ maestro de insumos.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\1. Ppto PTARI Venta Ivan\2. Metrado\Met.Est_PTAR Creditex-rev00.xlsx
- **Tipo / formato:** xlsx (metrado de estructuras PTARI, rev00). Sin cÃ³digo de formulario (hojas de cÃ¡lculo de metrado).
- **Hojas (27):** consultas | Ratios | Resumen | MOV | EST | Pedestal | Columnas | zapatas | losa cimentacion | Muro Contencion | Vigas | Losa Maciza | falsa zapata | canaleta | Excavacion masiva | ACERO | LosaAligerada | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- **Contenido:**
  - **consultas:** notas de proyecto (losa de piso lÃ¡mina E-02, f'c=28).
  - **Ratios:** ratios de acero kg/m3 (Zapatas 40-70, Columnas 100-350, Vigas 100-250, Aligerados 80-175, Losas macizas 50-200).
  - **Resumen:** comparativo metrado Oferta vs Nuevo por cÃ³digo/partida cliente (ESTRUCTURAS, AREA 1).
  - **MOV / EST:** presupuestos GP-GCE-FOR-F01. **OJO contaminaciÃ³n de plantilla:** MOV referencia "PRECOTEX LAS MORERAS"/PRECOTEX (fecha 28-oct-2024); EST referencia "PLANTA PTAR 5 - CREDITEX"/CREDITEX.
  - **Hojas por elemento estructural** (Pedestal, Columnas, zapatas, losa cimentacion, Muro Contencion, Vigas, Losa Maciza, falsa zapata, canaleta, Placas, Escalera, Camara, Sobrecimientos, Cimiento corridos, bases, pedestales, cimientos armados, relleno rampa, losa rampa): cÃ³mputo de Concreto (f'c, h, e, Ã¡rea, m3), Encofrado (m2), Acero (longitudes L1-L5, traslapes, peso Ã˜ por diÃ¡metro 0.25â€“1.38, KG total) y Curado (m2). Excavacion masiva: prof/ancho/largo/area, ExcavaciÃ³n m3, EliminaciÃ³n.
  - **ACERO:** consolidado de acero por elemento. PEDESTAL total 1274.53 KG; COLUMNAS total 10521.64 KG.
- **NÃºmeros clave:** acero PEDESTAL 1274.53 kg; COLUMNAS 10521.64 kg; ratios acero por elemento.
- **PropÃ³sito:** sustento de metrados de estructuras (concreto/encofrado/acero/curado) que alimenta las cantidades del presupuesto PTARI.
- **Origen â†’ Destino:** planos/cÃ¡lculo estructural â†’ cÃ³mputo por elemento â†’ totales m3/m2/kg â†’ CANT del presupuesto (PPTO/EST).
- **AutomatizaciÃ³n:** GAP (no hay mÃ³dulo de metrado en GRAPCO). Las cantidades resultantes alimentan Presupuesto (BAC) como CANT por partida. Ratios de acero podrÃ­an servir a validaciÃ³n de consumos en AlmacÃ©n.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\1. Ppto PTARI Venta Ivan\3. Comparativo\Comparativo PPTO - PPTO VENTA.xlsx
- **Tipo / formato:** xlsx (comparativo PPTO Contractual vs PPTO Venta). 15 KB.
- **Hojas (3):** MOV | EST | ARQ
- **Contenido:** tabla a dos bloques (PPTO CONTRACTUAL | PPTO VENTA) con UND, CANT, P.U. (S/.), PARCIAL (S/.) y columna **DELTA** por partida. Ej. MOV: MovilizaciÃ³n/desmovilizaciÃ³n equipos GLB 5874.90 (delta 0); ExcavaciÃ³n masiva M3 1526.40â†’2350.70 (delta +824.30). EST: Calzaduras (ExcavaciÃ³n localizada 72.96â†’83.35, delta -7.85; Concreto ciclÃ³peo 1:10 = 27626.24 sin cambio). ARQ: impermeabilizaciÃ³n Sikaguard 67344.90, impermeabilizado interior 52471.89, pintura bituminosa 8419.15 (deltas 0).
- **NÃºmeros clave:** Concreto ciclÃ³peo calzaduras 27626.24; impermeabilizado Sikaguard 67344.90; interior 52471.89.
- **PropÃ³sito:** controlar la variaciÃ³n de cantidades/montos entre presupuesto contractual y de venta (justificaciÃ³n de adicionales/deductivos).
- **Origen â†’ Destino:** PPTO contractual del cliente + PPTO venta GRAPCO â†’ tabla delta.
- **AutomatizaciÃ³n:** Adicionales/Deductivos (las DELTA son la base de adicionales/deductivos por partida). Cargable por importador genÃ©rico.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\1. Presupuesto\1. Superado\PPTO GRAPCO-CREDITEX_Rev.01_2025-12-09.xlsx
- **Tipo / formato:** xlsx (presupuesto PTARI versiÃ³n GRAPCO Rev.01, **superado**). Formularios GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (14):** CarÃ¡tula | AnÃ¡lisis | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. GG | 8. APU | Hoja 8 | 9. Recursos | 10. RO
- **Contenido:**
  - **CarÃ¡tula:** "PTAR PLANTA 5", AV. LOS HORNOS 185 ATE, PPTO PTARI, Rev NÂ°01, dic-2025.
  - **AnÃ¡lisis:** comparativo CONTRACTUAL vs REVISIÃ“N con PARCIAL/TOTAL y DELTA por partida. Trab. Preliminares 182704.14 (delta 0); Obras Provisionales 103581.17â†’78113.38 (delta -25467.78); DiseÃ±o 40000.
  - **PPTO + 1.PRE..6.IISS:** presupuesto por especialidad (aÃ±ade **IISS** Instalaciones Sanitarias vs versiÃ³n Ivan). Cliente CREDITEX, supervisiÃ³n DiseÃ±os Racionales, plazo 4.50 meses.
  - **7. GG:** gastos generales (PRO-GCE-FOR-F03 v1).
  - **8. APU:** +1983 filas de precios unitarios.
  - **Hoja 8:** cronograma valorizado semanal (plantilla en cero).
  - **9. Recursos:** +351 filas de recursos (MO/material/equipo), T.C.=3.80.
  - **10. RO:** **estructura del Resultado Operativo** â€” FRENTE, PARTIDA, DescripciÃ³n, Ppto F1 (PTARI) S/., SUBTOTAL, CONTROL. **TOTAL COSTO DE OBRA 2,244,674.40 (subtotal/control 2,227,530.57); COSTO DIRECTO 1,761,528.98 (1,744,385.15).** Detalle por partida con cÃ³digo de frente (PRE1, PRE2...) y FA01.
- **NÃºmeros clave:** Costo de Obra 2,244,674.40 / 2,227,530.57; Costo Directo 1,761,528.98 / 1,744,385.15; Trab. Preliminares 182,704.14; Obras Provisionales delta -25,467.78.
- **PropÃ³sito:** presupuesto de venta GRAPCO del PTARI (versiÃ³n superada por la 2025-12-10) y plantilla del RO por frente F1.
- **Origen â†’ Destino:** metrados Rev.01 + APU + recursos â†’ PPTO â†’ hoja 10.RO (mapeo frente/partida â†’ presupuesto base del RO).
- **AutomatizaciÃ³n:** Presupuesto (BAC) y, sobre todo, **hoja 10.RO â†’ Resultado Operativo (RO/CR/F06)** como BAC/lÃ­nea base del frente F1-PTARI. Importador genÃ©rico; APU â†’ catÃ¡logo PU.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\1. Presupuesto\PPTO GRAPCO-PTARI CREDITEX_Rev.01_2025-12-10.xlsx
- **Tipo / formato:** xlsx (presupuesto PTARI GRAPCO Rev.01, **versiÃ³n vigente** â€” supera a la del 12-09). GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (14):** idÃ©nticas a la anterior (CarÃ¡tula | AnÃ¡lisis | PPTO | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | 7.GG | 8.APU | Hoja 8 | 9.Recursos | 10.RO).
- **Contenido:** misma estructura; cambio clave en **AnÃ¡lisis**: Trabajos Preliminares 182704.14â†’**142704.14 (delta -40000)** por eliminaciÃ³n del Ã­tem **1.40 DISEÃ‘O (40000 â†’ 0, delta -40000)**; Obras Provisionales sigue -25467.78.
  - **10. RO:** **TOTAL COSTO DE OBRA 2,175,971.15 (2,158,827.33); COSTO DIRECTO 1,692,825.73 (1,675,681.91); Trab. Preliminares 142,704.14.**
- **NÃºmeros clave:** Costo de Obra 2,175,971.15 / 2,158,827.33; Costo Directo 1,692,825.73 / 1,675,681.91; deductivo DISEÃ‘O -40,000.
- **PropÃ³sito:** presupuesto de venta vigente del PTARI (frente F1) â€” fuente de la lÃ­nea base del RO PTARI.
- **Origen â†’ Destino:** versiÃ³n 12-09 menos Ã­tem DISEÃ‘O â†’ PPTO/RO actualizado.
- **AutomatizaciÃ³n:** **Presupuesto (BAC) + hoja 10.RO â†’ Resultado Operativo (BAC F1-PTARI vigente).** La diferencia 12-09 vs 12-10 = deductivo registrable en Adicionales/Deductivos. Importador genÃ©rico.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\2. Metrado\Met.Est_PTAR CREDITEX Rev.01_2025-12-09.xlsx
- **Tipo / formato:** xlsx (metrado PTARI Rev.01). Hojas de metrado sin cÃ³digo de formulario.
- **Hojas (33):** consultas | Ratios | Resumen | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | Met_ARQ | Met_MOV | Met_DEM | Met_CALZ | Met_FZ | Met_ZAP | Met_COL | Met_LCIM | Met_MC | Met_VIG | Met_Losa Maciza | Met_IISS | REV. ACERO | Placas | LosaAligerada | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- **Contenido:**
  - **consultas / Ratios / Resumen:** igual a metrado Ivan (notas, ratios acero, comparativo Oferta/Nuevo).
  - **1.PRE..6.IISS:** metrados por especialidad (ITEM/DESCRIPCIÃ“N/UND/CANT). **OJO contaminaciÃ³n:** PRE/PRO/MOV referencian "PRECOTEX LAS MORERAS"/PRECOTEX; EST/ARQ/IISS referencian "PLANTA PTAR 5 - CREDITEX"/CREDITEX (fecha 22-mar-2026).
  - **Met_xxx:** cÃ³mputos por elemento (Met_ARQ impermeabilizaciÃ³n losa de fondo; Met_MOV excavaciones masivas ExcavaciÃ³n 2605.30 / EliminaciÃ³n 3386.89; Met_DEM demoliciÃ³n; Met_CALZ calzaduras por anillo: 1er anillo Tienda de Telas ExcavaciÃ³n 28.43 m3, Concreto 28.43 m3, Encofrado 77.21 m2; Met_ZAP zapatas; Met_LCIM losa cimentaciÃ³n con juntas; Met_MC muros contenciÃ³n total acero 29832.60 kg, 58.82 kg/m2; Met_VIG vigas; etc.).
  - **REV. ACERO:** revisiÃ³n consolidada de acero. COLUMNAS total 8394.46 KG; ZAPATA 432.13 KG.
- **NÃºmeros clave:** ExcavaciÃ³n masiva 2605.30 m3 / EliminaciÃ³n 3386.89 m3; muro contenciÃ³n acero 29832.60 kg; columnas acero 8394.46 kg; zapata 432.13 kg.
- **PropÃ³sito:** sustento de cantidades del PPTO PTARI Rev.01 (concreto/encofrado/acero por elemento).
- **Origen â†’ Destino:** planos estructurales â†’ cÃ³mputo por elemento â†’ CANT de PPTO/RO PTARI.
- **AutomatizaciÃ³n:** GAP (sin mÃ³dulo metrado). Cantidades â†’ Presupuesto (BAC). Ratios y consumos de acero â†’ cruce con AlmacÃ©n (Kardex S10).

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\1. PPTO PTARI\2. Ppto PTARI Venta Grapco\3. Comparativo\Comparativo PPTO - PPTO VENTA.xlsx
- **Tipo / formato:** xlsx (comparativo Contractual vs Venta, versiÃ³n GRAPCO). 15 KB. **Contenido idÃ©ntico al comparativo de la secciÃ³n Ivan** (mismas hojas MOV/EST/ARQ y mismos valores: excavaciÃ³n masiva delta +824.30, concreto ciclÃ³peo 27626.24, Sikaguard 67344.90, interior 52471.89).
- **Hojas (3):** MOV | EST | ARQ
- **PropÃ³sito:** comparativo contractual vs venta por partida (delta) â€” base de adicionales/deductivos.
- **Origen â†’ Destino:** PPTO contractual cliente + PPTO venta â†’ DELTA.
- **AutomatizaciÃ³n:** Adicionales/Deductivos. Importador genÃ©rico. (Duplicado del comparativo Ivan â€” cargar una sola vez.)

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\1. Metrados\Met.Est_NAVE CREDITEX Rev.01_2026-01-08.xlsx
- **Tipo / formato:** xlsx (metrado NAVE Industrial Rev.01). Hojas de metrado sin cÃ³digo de formulario.
- **Hojas (34):** consultas | Ratios | Resumen | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | Met_ARQ | Met_MOV | Met_DEM | Met_CALZ | Met_FZ | Met_ZAP | Met_PED | Met_CANAL | Met_LCIM | Met_Losa Maciza | Met_COL | Met_VIG | LosaAligerada | Met_IISS | REV. ACERO | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- **Contenido:** misma arquitectura que el metrado PTARI (consultas, ratios acero, Resumen Oferta/Nuevo, metrados por especialidad y por elemento Met_xxx con concreto/encofrado/acero). **OJO contaminaciÃ³n:** 1.PRE referencia "PRECOTEX LAS MORERAS"/PRECOTEX. AÃ±ade Met_PED (pedestales) y Met_CANAL (canaleta) propios de la nave.
- **NÃºmeros clave:** (cÃ³mputos por elemento; volcado muestra encabezados â€” sustento de cantidades de la cimentaciÃ³n de la nave).
- **PropÃ³sito:** sustento de metrados de la NAVE Industrial (frente F2), principalmente cimentaciÃ³n de concreto y acero para la estructura metÃ¡lica.
- **Origen â†’ Destino:** planos NAVE (dwg) â†’ cÃ³mputo por elemento â†’ CANT del PPTO NAVE (OpciÃ³n A/B).
- **AutomatizaciÃ³n:** GAP (sin mÃ³dulo metrado). Cantidades â†’ Presupuesto (BAC) frente F2-NAVE.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\2. Planos\PL ESTR_CREDITEX_2025.12.09_GRAPCO.dwg
- **Tipo / formato:** **.dwg (AutoCAD, no-Excel)**, 2795 KB.
- **PropÃ³sito:** planos de estructuras de la NAVE (CREDITEX, rev 2025.12.09 GRAPCO) â€” fuente grÃ¡fica de los metrados de estructura metÃ¡lica/cimentaciÃ³n.
- **Origen â†’ Destino:** diseÃ±o estructural â†’ metrados (Met.Est_NAVE) y cotizaciÃ³n M&M.
- **AutomatizaciÃ³n:** No ingerible (documento tÃ©cnico de referencia). Adjuntar como documento del proyecto. No alimenta costos directamente.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\3. Cronograma\Cronograma Nave Estruct. Metalica Rev 1.mpp
- **Tipo / formato:** **.mpp (MS Project, no-Excel)**, 398 KB.
- **PropÃ³sito:** cronograma de la estructura metÃ¡lica de la nave (Rev 1) â€” secuencia de fabricaciÃ³n/montaje.
- **Origen â†’ Destino:** plazos NAVE â†’ cronograma; relacionado con escenarios A (3.5m) / B (5.0m).
- **AutomatizaciÃ³n:** GAP de importaciÃ³n directa de .mpp. Reaprovechable en Cronograma Pro (CPM) si se re-captura; por ahora documento de referencia.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\4. Normativa\3501r_01.pdf
- **Tipo / formato:** **.pdf (no-Excel)**, 144 KB.
- **PropÃ³sito:** documento normativo de referencia para el presupuesto de la nave (norma tÃ©cnica, cÃ³digo 3501r).
- **AutomatizaciÃ³n:** No ingerible a costos. Documento de referencia del expediente.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\4. Normativa\Redes de aguas residuales - Norma OS-070.pdf
- **Tipo / formato:** **.pdf (no-Excel)**, 652 KB.
- **PropÃ³sito:** Norma OS-070 (Redes de aguas residuales) â€” sustento normativo de las instalaciones sanitarias (IISS) de la PTAR/nave.
- **AutomatizaciÃ³n:** No ingerible a costos. Documento de referencia.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\5. CotizaciÃ³n M&M\04. Creditex - Cotizacion General - Rev.04.1.xlsm
- **Tipo / formato:** xlsm (cotizaciÃ³n del subcontratista **M&M Industria MetÃ¡lica SAC**, Rev.04.1). RUC 20551531326, dirigido a Ing. Jose Teixeira (Creditex), fecha 18-mar-2026.
- **Hojas (4):** 00. Metrado REV.03 | 00. Metrado REV.04 | 01. Cotizacion M&M POL | 02. Cotizacion M&M PUR
- **Contenido:**
  - **Metrado REV.03 / REV.04:** despiece de estructura metÃ¡lica por Item/DescripciÃ³n/Unidad/ml/Kg/ml/Cantidad/Parcial/factor 0.09/Metrado. REV.04 aÃ±ade columnas "METRADO REV.03" y "DECISION A TOMAR" (Se mantiene origen / Se cambia). CimentaciÃ³n (plancha base 450x450x25mm 474.91 kg; pernos anclaje Ã˜1" 611.07â†’496.50 kg; cartela 135.09 kg); Columnas (CM1 HSS 10"x10"x1/4" 3379.99â†’3401.12 kg; CM2 HSS 8"x8"x3/16" 2042.08 kg).
  - **01/02 Cotizacion M&M POL / PUR:** cotizaciÃ³n con cobertura POL (poliuretano) y PUR â€” Item/DescripciÃ³n/Unidad/Metrado/Precio S/./Parcial S/. + columnas INCIDENCIA (0.04), PAZ, GG, PU Nuevo, PARCIAL (con incremento). MovilizaciÃ³n GLB 9400 (mov/desmov herramientas 600â†’636â†’661.44; mov estructuras/cobertura 5000â†’5300â†’5512).
- **NÃºmeros clave:** movilizaciÃ³n total 9400; mov/desmov herramientas 661.44; mov estructuras/cobertura 5512; incidencia 0.04; factor 0.09.
- **PropÃ³sito:** cotizaciÃ³n del subcontratista de estructura metÃ¡lica (insumo de costo del frente F2-NAVE).
- **Origen â†’ Destino:** metrado NAVE â†’ cotizaciÃ³n M&M â†’ costo directo de estructuras en PPTO NAVE.
- **AutomatizaciÃ³n:** **ValorizaciÃ³n de Subcontratistas (F10/F11) = GAP.** Hoy cargable como costo de partida vÃ­a importador genÃ©rico al Presupuesto/RO de la nave; comparativo de revisiones (REV.03 vs REV.04) â†’ control de variaciones de SC.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\5. CotizaciÃ³n M&M\04. Creditex - Cotizacion General - Rev.04.2.xlsm
- **Tipo / formato:** xlsm (cotizaciÃ³n M&M Rev.04.2), 188 KB. Variante de la anterior.
- **Hojas (3):** 00. Metrado REV.03 | 00. Metrado REV.04 | 01. Cotizacion M&M POL
- **Contenido:** mismos metrados REV.03/REV.04 (plancha base 474.91 kg, CM1 3401.12 kg, etc.). La hoja Cotizacion M&M POL es versiÃ³n simple (sÃ³lo Item/DescripciÃ³n/Unidad/Metrado/Precio/Parcial; movilizaciÃ³n 9400). No incluye hoja PUR.
- **NÃºmeros clave:** movilizaciÃ³n 9400; mismos pesos de cimentaciÃ³n/columnas que Rev.04.1.
- **PropÃ³sito:** revisiÃ³n 04.2 de la cotizaciÃ³n M&M (variante POL).
- **Origen â†’ Destino:** metrado NAVE â†’ cotizaciÃ³n M&M â†’ costo SC estructura metÃ¡lica.
- **AutomatizaciÃ³n:** ValorizaciÃ³n de Subcontratistas (GAP); por ahora importador genÃ©rico â†’ costo de partida NAVE.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\5. CotizaciÃ³n M&M\1. Superado\04. Creditex - Cotizacion General - Rev.04.xlsm
- **Tipo / formato:** xlsm (cotizaciÃ³n M&M Rev.04, **superada**), 267 KB.
- **Hojas (4):** 00. Metrado REV.03 | 00. Metrado REV.04 | 01. Cotizacion M&M POL | 02. Cotizacion M&M PUR
- **Contenido:** igual estructura que Rev.04.1 (metrados idÃ©nticos; cotizaciones POL y PUR en versiÃ³n simple Item/DescripciÃ³n/Unidad/Metrado/Precio/Parcial; movilizaciÃ³n 9400).
- **PropÃ³sito:** versiÃ³n origen (superada) de la cotizaciÃ³n del SC M&M.
- **Origen â†’ Destino:** metrado NAVE â†’ cotizaciÃ³n M&M â†’ costo SC.
- **AutomatizaciÃ³n:** ValorizaciÃ³n de Subcontratistas (GAP). HistÃ³rico de revisiones; cargar sÃ³lo la vigente (Rev.04.1/04.2).

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\6. PPTO Superado\PPTO GRAPCO-NAVE CREDITEX_Rev.01_2026.01.26_OpciÃ³n A (3.5 meses).xlsx
- **Tipo / formato:** xlsx (presupuesto NAVE Rev.01, **Escenario A = 3.5 meses**, superado). GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (15):** CarÃ¡tula | PPTO | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | 7.APU | Hoja 8 | 8.Recursos | 10.Esquema | 11.Sectorizacion | 12.RO | 9.Pull (Escenario A)
- **Contenido:**
  - **CarÃ¡tula / PPTO:** "PTAR PLANTA 5", PPTO NAVE INDUSTRIAL - ESCENARIO A, NÂ°02, 26-ene-2026. **PLAZO F2: 3.50 meses, TRASLAPE C/F1: 1 mes.**
  - **1.PRE..6.IISS:** presupuesto por especialidad (4.EST extensa +121 filas, estructura metÃ¡lica).
  - **7. APU:** +2471 filas de precios unitarios.
  - **8. Recursos:** +381 filas (T.C.=3.80).
  - **10. Esquema:** esquema de obra (GP-GCE-FOR-F01), plazo #REF!.
  - **11. Sectorizacion:** LAYOUT DE OBRA / SECTORIZACION DE CIMENTACION (sectores C1, C2, S1, S3, acopio de quÃ­micos, lavanderÃ­a, talud a tanques existentes).
  - **9. Pull (Escenario A):** Pull Planning NAVE F2. PROYECTO NAVE INDUSTRIAL, ubicaciÃ³n Lima-Huachipa, cliente CREDITEX, elaborado Guido Gonzales / revisado Jose Teixeira. **Jornada 8 HH/dÃ­a; 90 dÃ­as hÃ¡biles / 105 calendario (15 domingos); 3.50 meses; inicio 02-feb-2026, fin 18-may-2026.**
  - **12. RO:** Resultado Operativo frente F2-NAVE. **TOTAL COSTO DE OBRA 1,055,801.35; COSTO DIRECTO 834,831.45; Trab. Preliminares 35,075.26** (SSO 7739.26, TopografÃ­a 20556.68).
- **NÃºmeros clave:** Costo de Obra 1,055,801.35; Costo Directo 834,831.45; plazo 3.50 meses; 90 HH-dÃ­as; jornada 8 HH/dÃ­a.
- **PropÃ³sito:** presupuesto de venta NAVE escenario rÃ¡pido (3.5 meses) con sectorizaciÃ³n y pull planning â€” base RO del frente F2 (opciÃ³n A).
- **Origen â†’ Destino:** metrado NAVE + cotizaciÃ³n M&M + APU â†’ PPTO â†’ hoja 12.RO (BAC F2 opciÃ³n A) y hoja 9.Pull (cronograma).
- **AutomatizaciÃ³n:** **Presupuesto (BAC) + 12.RO â†’ Resultado Operativo (BAC F2-NAVE)**; 9.Pull â†’ Cronograma / Last Planner (Pull Planning); 11.Sectorizacion â†’ SectorizaciÃ³n (VDC). ISP: jornada 8 HH/dÃ­a y HH-dÃ­as â†’ ISP (tareos HH Ã— S/25.5).

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\6. PPTO Superado\PPTO GRAPCO-NAVE CREDITEX_Rev.01_2026.01.26_OpciÃ³n B (5.0 meses).xlsx
- **Tipo / formato:** xlsx (presupuesto NAVE Rev.01, **Escenario B = 5.0 meses**, superado). GP-GCE-FOR-F01 / PRO-GCE-FOR-F03.
- **Hojas (15):** CarÃ¡tula | PPTO | 1.PRE | 2.PRO | 3.MOV | 4.EST | 5.ARQ | 6.IISS | 7.APU | Hoja 8 | 8.Recursos | 9.Pull (Escenario B) | 10.Esquema | 11.Sectorizacion | 12.RO
- **Contenido:**
  - **CarÃ¡tula / PPTO:** PPTO NAVE INDUSTRIAL - ESCENARIO B, NÂ°02. **PLAZO F2: 5 meses, TRASLAPE C/F1: 1 mes.**
  - **1.PRE..6.IISS / 7.APU (+2472 filas, hoja arranca con celda "fFALSA") / 8.Recursos (+381) / 10.Esquema / 11.Sectorizacion:** misma estructura que OpciÃ³n A.
  - **9. Pull (Escenario B):** Pull Planning F2 escenario lento. **127 dÃ­as hÃ¡biles / 148 calendario (21 domingos); 5 meses; jornada 8 HH/dÃ­a; inicio 02-feb-2026, fin 30-jun-2026.**
  - **12. RO:** Resultado Operativo F2-NAVE escenario B. **TOTAL COSTO DE OBRA 1,131,445.76; COSTO DIRECTO 894,644.15; Trab. Preliminares 94,887.96** (SSO 45355.12, TopografÃ­a 35974.19).
- **NÃºmeros clave:** Costo de Obra 1,131,445.76; Costo Directo 894,644.15; plazo 5 meses; 127 HH-dÃ­as. **Diferencia vs OpciÃ³n A: +75,644.41 de costo de obra y +59,812.70 de trab. preliminares** (mayor SSO/topografÃ­a por mayor plazo).
- **PropÃ³sito:** presupuesto de venta NAVE escenario largo (5 meses) â€” alternativa de plazo para decisiÃ³n comercial.
- **Origen â†’ Destino:** mismos insumos que OpciÃ³n A con plazo extendido â†’ PPTO/RO/Pull escenario B.
- **AutomatizaciÃ³n:** **Presupuesto (BAC) + 12.RO â†’ Resultado Operativo (BAC F2-NAVE opciÃ³n B)**; 9.Pull â†’ Cronograma/Last Planner; 11.Sectorizacion â†’ SectorizaciÃ³n. La comparaciÃ³n A vs B alimenta un anÃ¡lisis de escenarios de plazo/costo (GAP de mÃ³dulo de escenarios; se puede modelar como dos baselines).

---

## Notas transversales del chunk
- **CÃ³digos de formulario:** GP-GCE-FOR-F01 (Presupuesto, PRE/PRO/MOV/EST/ARQ/IISS, APU, Esquema), PRO-GCE-FOR-F03 (Gastos Generales y Recursos).
- **Frentes RO:** F1 = PTARI (Ppto F1); F2 = NAVE (Ppto F2). Las hojas "10.RO"/"12.RO" son la estructura BAC del Resultado Operativo por frente.
- **ContaminaciÃ³n de plantilla:** varias hojas de metrado/PPTO de las versiones Ivan/Rev.01 arrastran encabezados "PRECOTEX LAS MORERAS" en PRE/PRO/MOV (la plantilla naciÃ³ de otro proyecto); el cliente real es CREDITEX. Validar OBRA/CLIENTE al ingerir.
- **HistÃ³rico:** existen versiones superadas (PTARI 12-09, M&M Rev.04) y vigentes (PTARI 12-10, M&M Rev.04.1/04.2); cargar sÃ³lo la vigente por frente.



---

# CatÃ¡logo de Costos â€” 2. Presupuesto Venta (cont. 2)

Chunk: `cat_2_Presupuesto_Venta__p2`
CategorÃ­a: Presupuesto de Venta â€” PPTO NAVE (Frente F2: estructura metÃ¡lica y losa), proyecto CREDITEX "PTAR PLANTA 5" / NAVE INDUSTRIAL, Ate / Huachipa, Lima.
Contratista GRAPCO SAC, supervisiÃ³n DISEÃ‘OS RACIONALES.

Nota general: el volcado muestra solo las primeras ~10 filas de cada hoja mÃ¡s un contador "(+N filas)". Los nÃºmeros clave fiables estÃ¡n en las cabeceras y en la hoja "12. RO" de cada presupuesto.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\6. PPTO Superado\PPTO GRAPCO-NAVE CREDITEX_Rev.02_2026.03.19.xlsx
- Tipo / formato: xlsx â€” Presupuesto de obra GRAPCO. Formato base GP-GCE-FOR-F01 (presupuesto) y PRO-GCE-FOR-F03 (recursos / GG). RevisiÃ³n NÂ°02, fecha 19/03/2026. Carpeta "6. PPTO Superado" (versiÃ³n superada / archivada).
- Hojas (15): CarÃ¡tula | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 10. Esquema | 11. Sectorizacion | 12. RO | 9. Pull
- Contenido por hoja:
  - **CarÃ¡tula**: identificaciÃ³n â€” Obra "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; denominaciÃ³n "PPTO ESTRUCTURA METÃLICA Y LOSA"; presupuesto NÂ°02.
  - **PPTO**: Resumen del presupuesto (GP-GCE-FOR-F01, pÃ¡g 1 de 10). Plazo F2: 2.50 meses; traslape con F1: 0.30 meses. Tabla resumen con ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.). +48 filas (no visibles).
  - **1. PRE** Trabajos Preliminares: tabla de partidas ITEM/DESCRIPCIÃ“N/UND/CANT/P.U./PARCIAL/SUBTOTAL/TOTAL. +18 filas.
  - **2. PRO** Obras Provisionales: misma estructura de partidas. +23 filas.
  - **3. MOV** Movimiento de Tierras: partidas. +17 filas.
  - **4. EST** Estructuras (la mÃ¡s grande de especialidades): partidas. +101 filas.
  - **5. ARQ** Arquitectura: partidas. +32 filas.
  - **6. IISS** Instalaciones Sanitarias: partidas. +18 filas.
  - **7. APU** AnÃ¡lisis de Precios Unitarios: ITEM | DESCRIPCIÃ“N | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL | SUB TOTAL. +2477 filas (banco de APUs completo del frente).
  - **Hoja 8**: cronograma valorizado / flujo de egresos por semana (Sem 1..Sem 24, 7 meses). Filas por concepto: Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori... (+15 filas). En este dump las celdas de EGRESOS aparecen en 0 (plantilla sin valores volcados o sin llenar).
  - **8. Recursos** (PRO-GCE-FOR-F03, pÃ¡g 10 de 10): listado de recursos con CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS; T.C. = 3.80; leyenda de estatus (REALIZADO/PROCESO/PENDIENTE). Empieza 1.01 MANO DE OBRA. +383 filas (mano de obra, materiales, equipos).
  - **10. Esquema**: hoja de esquema (cabecera GP-GCE-FOR-F01); PLAZO con #REF! (fÃ³rmula rota). Sin datos de detalle visibles.
  - **11. Sectorizacion**: layout de obra y sectorizaciÃ³n de cimentaciÃ³n/excavaciÃ³n (zonas C1, C2, S1, S3, ACOPIO DE QUIMICOS, LAVANDERIA, TALUD A TANQUES EXISTENTES). Matriz grÃ¡fica, no numÃ©rica.
  - **12. RO** (Resultado Operativo / presupuesto meta por frente): FRENTE | PARTIDA | DescripciÃ³n | Ppto F2 (NAVE) | SUBTOTAL. Lista las partidas con su costo meta.
  - **9. Pull** (Pull Planning): proyecto NAVE INDUSTRIAL, Lima-Huachipa; dÃ­as Domingo 11, Feriados 0, HÃ¡biles 64, Calendario 75 = 2.50 meses; jornada 8 HH/dÃ­a; inicio 02/02/2026, fin 18/04/2026; elaborado Guido Gonzales, revisado Jose Teixeira. +36 filas de actividades.
- NÃºmeros clave (hoja 12. RO):
  - TOTAL COSTO DE OBRA: **S/ 710,392.97**
  - COSTO DIRECTO: **S/ 545,588.27** ... el volcado muestra **561,714.00** en esta Rev.02 (Costo Directo 561,714.00; total obra 710,392.97). Diferencia Totalâˆ’CD = S/ 148,678.97 (GG + utilidad).
  - Partida 1001 Trabajos Preliminares: S/ 14,797.89 (TOPOGRAFÃA 1.02 = 10,278.34; SSO 1.01 = 0).
  - T.C. = 3.80; plazo F2 = 2.50 meses + traslape 0.30 con F1.
- PropÃ³sito: presupuesto meta/venta del Frente 2 (nave: estructura metÃ¡lica + losa); define costo directo, GG, APUs y recursos. Es la lÃ­nea base de costo (BAC) contra la que se mide el RO.
- Origen -> Destino: lo elabora GRAPCO (Ã¡rea de costos) a partir de metrados + APUs + recursos -> alimenta el Resultado Operativo (hoja 12. RO), el cronograma valorizado (Hoja 8) y el Pull Planning.
- AutomatizaciÃ³n: importar a mÃ³dulo **Presupuesto (BAC)** de GRAPCO. Hoja 12. RO y PPTO -> presupuesto meta por partida/frente; 7. APU -> banco de APUs (mÃ³dulo APU/Costos, hoy fuera de GRAPCO); 8. Recursos -> catÃ¡logo de recursos; Hoja 8 -> Curva S/flujo (GAP de Flujo de Caja). Es una **versiÃ³n superada**: usar la Rev.03 como vigente.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\PPTO GRAPCO-NAVE CREDITEX_GG.xlsx
- Tipo / formato: xlsx â€” Gastos Generales. Cabecera GG con cÃ³digo **PRO-GCE-FOR-F03 v1**; PPTO con GP-GCE-FOR-F01. RevisiÃ³n NÂ°01, fecha 01/12/2025.
- Hojas (4): CarÃ¡tula | PPTO | GG | Hoja 8
- Contenido por hoja:
  - **CarÃ¡tula**: "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; denominaciÃ³n GASTOS GENERALES; RevisiÃ³n NÂ°01; 01/12/2025.
  - **PPTO**: resumen del presupuesto de GG (GP-GCE-FOR-F01); plazo 2 meses; tabla ITEM/DESCRIPCIÃ“N/UND/CANT/P.U./PARCIAL/TOTAL. +11 filas.
  - **GG**: "4.- ANÃLISIS DE GASTOS GENERALES"; PLAZO 4.50 meses; estructura A. CARACTERÃSTICAS... +132 filas (detalle de GG: personal, equipos de obra, oficina, EPP, etc.).
  - **Hoja 8**: cronograma/flujo de egresos por semana (Sem 1..24), mismo formato que el PPTO base; EGRESOS en 0 en el dump.
- NÃºmeros clave: no hay totales numÃ©ricos visibles en el volcado (las filas con montos estÃ¡n bajo el contador "+N filas"). Plazos: PPTO 2 meses; anÃ¡lisis GG 4.50 meses.
- PropÃ³sito: cÃ¡lculo de los Gastos Generales del frente NAVE, que se suman al costo directo para el presupuesto de venta.
- Origen -> Destino: elaborado por GRAPCO -> alimenta el resumen del PPTO (la diferencia Totalâˆ’CD del archivo de presupuesto) y el RO.
- AutomatizaciÃ³n: importar a mÃ³dulo **Presupuesto (BAC) / componente GG** y al **Resultado Operativo (pata de Gastos Generales)**. Importador genÃ©rico in-app. El detalle del anÃ¡lisis GG no tiene mÃ³dulo dedicado en GRAPCO -> GAP parcial (cargar como total de GG por ahora).

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\PPTO GRAPCO-NAVE CREDITEX_GGrEV JCT20.03.26.xlsx
- Tipo / formato: xlsx â€” Gastos Generales, revisiÃ³n con observaciones de JCT (iniciales) del 20/03/2026. Misma plantilla que el _GG.xlsx (PRO-GCE-FOR-F03 v1 / GP-GCE-FOR-F01). CarÃ¡tula sigue marcando RevisiÃ³n NÂ°01, 01/12/2025 (no actualizada).
- Hojas (4): CarÃ¡tula | PPTO | GG | Hoja 8
- Contenido por hoja:
  - **CarÃ¡tula / PPTO / Hoja 8**: idÃ©nticas estructuralmente al archivo _GG.xlsx (resumen GG, plazo 2 meses, cronograma de egresos por semana en 0).
  - **GG**: anÃ¡lisis de gastos generales; PLAZO 4.50 meses; +133 filas (una fila mÃ¡s que la versiÃ³n _GG.xlsx â†’ es una revisiÃ³n incremental del mismo anÃ¡lisis, ajustada por JCT el 20/03/2026).
- NÃºmeros clave: sin totales numÃ©ricos visibles en el volcado (montos bajo "+N filas").
- PropÃ³sito: versiÃ³n revisada de los Gastos Generales del frente NAVE (revisiÃ³n 20/03/2026, alineada en fecha con la Rev.02/Rev.03 del presupuesto).
- Origen -> Destino: GRAPCO (con revisiÃ³n JCT) -> componente GG del presupuesto de venta y del RO.
- AutomatizaciÃ³n: misma ruta que _GG.xlsx â€” mÃ³dulo **Presupuesto (BAC)/GG** + **RO (pata GG)**. Tratar este como la versiÃ³n vigente de GG por su fecha (20/03/2026); el detalle fino del anÃ¡lisis es GAP parcial.

---

### \05. GestiÃ³n Costos\2. Presupuesto Venta\2. PPTO NAVE\PPTO GRAPCO-NAVE CREDITEX_Rev.03_2026.03.23.xlsx
- Tipo / formato: xlsx â€” Presupuesto de obra GRAPCO, **Rev.03, 23/03/2026** (versiÃ³n mÃ¡s reciente del frente NAVE; sucesora de la Rev.02 superada). Formatos GP-GCE-FOR-F01 y PRO-GCE-FOR-F03.
- Hojas (15): CarÃ¡tula | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 10. Esquema | 11. Sectorizacion | 12. RO | 9. Pull (idÃ©ntica estructura a la Rev.02).
- Contenido por hoja: igual a la Rev.02 (ver ficha de Rev.02 para el detalle de cada hoja: PPTO resumen, especialidades PRE/PRO/MOV/EST/ARQ/IISS, 7. APU con +2477 filas, 8. Recursos con +384 filas y T.C. 3.80, Hoja 8 cronograma de egresos, 11. Sectorizacion layout, 12. RO ppto meta por frente, 9. Pull con 2.50 meses / jornada 8 HH).
  - La carÃ¡tula sigue diciendo "PRESUPUESTO NÂ°02" (la rotulaciÃ³n de revisiÃ³n interna no se actualizÃ³, pero el nombre de archivo y la fecha son Rev.03 23/03/2026).
- NÃºmeros clave (hoja 12. RO â€” versiÃ³n vigente):
  - TOTAL COSTO DE OBRA: **S/ 689,998.96**
  - COSTO DIRECTO: **S/ 545,588.27**
  - Diferencia (GG + utilidad): S/ 144,410.69
  - Partida 1001 Trabajos Preliminares: S/ 14,797.89 (TOPOGRAFÃA = 10,278.34; SSO = 0)
  - Comparativo vs Rev.02: el costo total baja de **710,392.97 â†’ 689,998.96** (âˆ’S/ 20,394.01); el costo directo de la Rev.03 (545,588.27) es el que la Rev.02 mostraba en su cabecera de "COSTO DIRECTO".
- PropÃ³sito: **presupuesto meta vigente** del Frente 2 (nave estructura metÃ¡lica + losa) de CREDITEX. LÃ­nea base de costo (BAC) para medir desviaciones en el RO.
- Origen -> Destino: GRAPCO costos -> Resultado Operativo (12. RO), cronograma valorizado (Hoja 8), Pull Planning (9. Pull) y curva S.
- AutomatizaciÃ³n: importar a mÃ³dulo **Presupuesto (BAC)** como versiÃ³n vigente del frente NAVE/F2. 12. RO -> meta por partida/frente del **Resultado Operativo**; 7. APU -> banco de APUs; 8. Recursos -> catÃ¡logo de recursos/MO; Hoja 8 -> Curva S (F07) y Flujo de Caja (GAP). Usar esta Rev.03 (no la Rev.02 superada).

---

## Resumen del chunk
- Archivos fichados: 4 (2 presupuestos completos de 15 hojas: Rev.02 superada y Rev.03 vigente; 2 archivos de Gastos Generales: _GG y _GGrEV revisiÃ³n JCT).
- Todos pertenecen al frente **NAVE (F2)** de CREDITEX "PTAR PLANTA 5" / Nave Industrial Huachipa; plazo 2.50 meses (02/02/2026â€“18/04/2026); T.C. 3.80; jornada 8 HH/dÃ­a.
- Formatos detectados: GP-GCE-FOR-F01 (presupuesto), PRO-GCE-FOR-F03 (recursos / gastos generales).
- Versiones: la **Rev.03 (23/03/2026)** es la vigente; la Rev.02 estÃ¡ en "6. PPTO Superado". GG vigente = _GGrEV JCT 20/03/2026.
- GAPs en GRAPCO: Flujo de Caja (Hoja 8 â€” cronograma de egresos por semana), detalle de anÃ¡lisis de Gastos Generales (no hay mÃ³dulo dedicado), y banco de APUs (Costos saliÃ³ de GRAPCO â€” vive en plataforma de Costos aparte).



---

# CategorÃ­a 3 Â· Presupuesto Real

Chunk de catÃ¡logo: `cat_3_Presupuesto_Real.txt` â€” carpeta `05. GestiÃ³n Costos\3. Presupuesto Real`.
Proyecto: CREDITEX â€” "PTAR PLANTA 5" (PTARI / F1), Av. Los Hornos 185, Ate. Ãrea: 400 m2. Plazo: 4.50 meses (Estructuras: 130 dÃ­as calendario). T.C. = 3.80. Contratista: GRAPCO SAC. SupervisiÃ³n: DiseÃ±os Racionales. RevisiÃ³n NÂ°01, fecha base Sun Dec 28 2025.

---

### \05. GestiÃ³n Costos\3. Presupuesto Real\GP-GCE-FOR-F16-PPTO REAL_CREDITEX 2026.04.16.xlsx

- **Tipo / formato:** Excel (.xlsx, 1006 KB). CÃ³digo de formato del archivo: **GP-GCE-FOR-F16** (Presupuesto Real). Internamente las hojas de presupuesto usan **GP-GCE-FOR-F01** (presupuesto/APU) y las de recursos/GG usan **PRO-GCE-FOR-F03** (recursos / gastos generales).
- **Hojas (18):** DATA CREDITEX | CarÃ¡tula | A. Partidas | A. Recursos | PPTO Real | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. GG | 8. APU Real | 9. Recursos Real | Hoja 8 | PPTO Contr. | APU Contract. | Recursos Contr.

#### Contenido por hoja (a detalle)

**DATA CREDITEX** (B1:N1001) â€” Tabla maestra resumen del PTARI (F1), Ã¡rea 400 m2. Columnas: COD. | ITEM | DESCRIPCION | UND | CANT | TOTAL (S/.) | INCIDENCIA PPTO | INCIDENCIA ESTRUCTURA | FACTOR | RATIO. Lista las partidas de 1er nivel con su total, incidencias y ratio por m2. Ejemplos:
- 1 TRABAJOS PRELIMINARES â€” GLB 1 â€” **S/ 183,206.97** (inc. ppto 0.12 / inc. estruct 0.19 / factor 0.25 / ratio 229,008.71). Subpartidas: PRE1 Seguridad y Salud S/ 51,655.31; PRE2 TopografÃ­a S/ 41,113.36; PRE3 Acarreo de materiales S/ 50,438.29; PRE5 Calzaduras 0; PRE6 Demoliciones 0; PRE7 Seguros y tributos 0.
- 2 OBRAS PROVISIONALES â€” GLB 1 â€” **S/ 71,087.78** (inc. 0.05 / 0.07 / factor 0.25 / ratio 88,859.73). (+23 filas adicionales no volcadas.)

**CarÃ¡tula** (B1:F1000) â€” Portada: "PTAR PLANTA 5"; Av. Los Hornos 185, Ate; "PPTO REAL PTAR PLANTA 5 - CREDITEX"; REVISION NÂ°01; fecha Sun Dec 28 2025.

**A. Partidas** (C1:O969) â€” "ANÃLISIS DE PPTO REAL POR PARTIDAS". Compara CONTRACTUAL (metrados actuales) (1) vs REAL (2) y calcula DELTA (1-2), mÃ¡s ÃREA y RATIO X M2. Columnas: PARCIAL / TOTAL para contractual y real. Ejemplos por partida:
- 1 TRABAJOS PRELIMINARES â€” Contractual 142,704.14 / Real 183,206.97 / **Delta -40,502.83** (sobrecosto).
- 1.10 Seguridad y Salud â€” Contr 51,152.48 / Real 51,655.31.
- 1.20 TopografÃ­a â€” 41,113.36 / 41,113.36.
- 1.30 Acarreo â€” 50,438.29 / 50,438.29.
- 1.40 DiseÃ±o â€” Contr 0 / Real 40,000. (+56 filas.)

**A. Recursos** (C1:N952) â€” "ANÃLISIS DE PPTO REAL POR RECURSOS". Descompone cada partida por las 4 patas: MO | MAT | EQH | SC, contractual (1) vs real (2) y delta. Factores globales fila 5: MO 0.25 | MAT 0.26 | EQH 0.04 | SC 0.45 = 1.
- Total PPTO PTAR CREDITEX por recurso: **MO 378,167.33 | MAT 383,081.57 | EQH 58,838.58 | SC 667,170.36 | TOTAL S/ 1,487,257.83**.
- 1 Trabajos Preliminares: Contr 142,704.14 â†’ MO 72,510.28 | MAT 23,579.49 | EQH 14,757.10 | SC 72,360.09 | Real 183,206.97 | Delta -40,502.83. (+37 filas.)

**PPTO Real** (B1:W1031) â€” Formato F01 "PPTO REAL", NÂ°01, pÃ¡gina 1 de 10. Cabecera oficial: Obra "PTAR PLANTA 5", Cliente CREDITEX, Contratista GRAPCO SAC, SupervisiÃ³n DiseÃ±os Racionales, Plazo 4.50 meses, ubicaciÃ³n Av. Los Hornos 185 Ate. SecciÃ³n "1.- RESUMEN DEL PRESUPUESTO" con columnas ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.). (+12 filas.)

**1. PRE** (A1:AH1000) â€” Presupuesto de TRABAJOS PRELIMINARES (F01, pÃ¡g 2 de 10). Tabla con ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. | PARCIAL | SUBTOTAL | TOTAL + bloques de INCIDENCIAS (MO/MAT/EQH/SC) y MONTOS (MO/MAT/EQH/SC). (+20 filas.)

**2. PRO** (A1:AH1006) â€” Presupuesto de OBRAS PROVISIONALES (F01, pÃ¡g 3 de 10). Misma estructura de columnas (PU/Parcial/Subtotal/Total + incidencias y montos por recurso). (+22 filas.)

**3. MOV** (A1:AH975) â€” Presupuesto de MOVIMIENTO DE TIERRAS (F01, pÃ¡g 4 de 10). Misma estructura. (+14 filas.)

**4. EST** (A1:AP908) â€” Presupuesto de ESTRUCTURAS (F01, pÃ¡g 5 de 10), plazo 130 dÃ­as calendario. Estructura ampliada: ademÃ¡s de PU/Parcial/Subtotal/Total + incidencias/montos por recurso, agrega bloque MANO DE OBRA con columnas IP | HH | MONTO | COSTO PROM | CAPATAZ S/. | MONTO (anÃ¡lisis de mano de obra detallado por partida). (+50 filas â€” la partida mÃ¡s voluminosa.)

**5. ARQ** (A1:AH609) â€” Presupuesto de ARQUITECTURA (F01, pÃ¡g 6 de 10). Estructura estÃ¡ndar PU/Parcial/Subtotal/Total + incidencias/montos. (+11 filas.)

**6. IISS** (A1:AH603) â€” Presupuesto de IISS (instalaciones sanitarias; el encabezado dice "ARQUITECTURA" por copia de plantilla, denominaciÃ³n correcta = IISS), F01 pÃ¡g 6 de 10. Estructura estÃ¡ndar. (+5 filas â€” partida corta.)

**7. GG** (A1:M1038) â€” GASTOS GENERALES (PRO-GCE-FOR-F03, pÃ¡g 8 de 10). SecciÃ³n "4.- ANÃLISIS DE GASTOS GENERALES" con bloque A. CARACTERÃSTICAS. Plazo 4.50 meses. (+131 filas â€” desglose de gastos generales por concepto.)

**8. APU Real** (B1:V1301) â€” ANÃLISIS DE PRECIOS UNITARIOS reales (F01, pÃ¡g 9 de 10). DenominaciÃ³n "PPTO REAL PTAR PLANTA 5". Columnas: ITEM | DESCRIPCIÃ“N | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.) | SUB TOTAL (S/.) + secciÃ³n "ANALISIS DE DATA". (+821 filas â€” APU desagregado por insumo de cada partida.)

**9. Recursos Real** (B1:P1093) â€” RECURSOS reales (PRO-GCE-FOR-F03, pÃ¡g 10 de 10). T.C. = 3.80. Leyenda de estatus: REALIZADO / EN PROCESO / PENDIENTE. Factores MAT/MO/EQH/SC = 0. Columnas: CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS | Precio | precio+Inc | Revisado. Bloques por tipo (1.01 MANO DE OBRA, etc.). (+347 filas â€” catÃ¡logo de recursos/insumos con precios.)

**Hoja 8** (B5:AE30) â€” Cronograma de EGRESOS / flujo por semanas (Curva S de costos). Columnas Descripcion | Parcial | MESES (1â€“7) desglosados en SEM 1..SEM 24. Filas: VIENEN; EGRESOS (todos en 0 en el volcado); Trabajos Preliminares; Obras Provisionales; SC Mov. de tierras; SC Encofrado Cori... (+15 filas). Valores mostrados = 0 (plantilla de programaciÃ³n de egresos, aparentemente sin valorizar en este volcado).

**PPTO Contr.** (A1:Q958) â€” PRESUPUESTO CONTRACTUAL (PTARI), ligado a VALORIZACIÃ“N NÂ°06. Obra PTAR PLANTA 5, Cliente CREDITEX, SupervisiÃ³n DiseÃ±os Racionales SAC. Columnas ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. (S/.) | PARCIAL (S/.). Ejemplo: PRE1 1.1.1 ALQUILER DE ANDAMIOS â€” GLB 1 â€” PU 3,992.02 â€” Parcial **3,992.02**. (+109 filas â€” presupuesto contractual completo por partida.)

**APU Contract.** (B1:S3325) â€” APU CONTRACTUAL / META ("PPTO META PTAR PLANTA 5 - CREDITEX"), F01 pÃ¡g 9 de 10. Columnas: ITEM | DESCRIPCIÃ“N | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.). (+1855 filas â€” el bloque mÃ¡s extenso del libro; APU meta desagregado por insumo.)

**Recursos Contr.** (B1:P1090) â€” RECURSOS contractuales (PRO-GCE-FOR-F03). T.C. 3.80. Factores MAT/MO/EQH/SC = 0.05 (vs 0 en la versiÃ³n Real). Mismas columnas que Recursos Real (CODIGO | TIPO | DESCRIPCION | UND | SOL | USD | COMENTARIO | ESTATUS | Precio | precio+Inc | Revisado). (+344 filas.)

#### NÃºmeros clave del archivo
- Presupuesto Real total PTAR CREDITEX: **S/ 1,487,257.83**.
- ComposiciÃ³n por recurso (Real): MO **378,167.33** | MAT **383,081.57** | EQH **58,838.58** | SC **667,170.36**.
- Incidencias globales de recursos: MO 25% | MAT 26% | EQH 4% | SC 45%.
- Trabajos Preliminares: Real 183,206.97 vs Contractual 142,704.14 â†’ **Delta -40,502.83** (sobrecosto).
- Obras Provisionales: Real 71,087.78.
- DiseÃ±o: aparece S/ 40,000 en Real que no existÃ­a en contractual (delta -40,000).
- Subpartidas preliminares: Seguridad/Salud 51,655.31; TopografÃ­a 41,113.36; Acarreo 50,438.29.
- Ligado a ValorizaciÃ³n NÂ°06; ratio contractual ~229,008.71 (factor 0.25) para preliminares.

#### PropÃ³sito (control de costos)
Es el **nÃºcleo del control de costos** del proyecto: documento del Presupuesto Meta/Real (BAC) frente al Contractual. Permite (a) fijar la lÃ­nea base de costo por partida y por recurso (4 patas MO/MAT/EQH/SC), (b) comparar Contractual vs Real y obtener deltas (ahorro/sobrecosto = Resultado Operativo base), (c) soportar valorizaciones (vÃ­nculo a ValorizaciÃ³n NÂ°06), y (d) programar egresos por semana (Curva S de costos). Sostiene tambiÃ©n el anÃ¡lisis de HH/IP de mano de obra en estructuras.

#### Origen -> Destino
- **Origen:** metrados actuales + APU contractuales (APU Contract.) y APU reales (8. APU Real), catÃ¡logo de recursos (Recursos Contr./Real con precios y T.C.), anÃ¡lisis de gastos generales (7. GG).
- **Destino interno:** alimenta A. Partidas y A. Recursos (comparativos delta), PPTO Real / PPTO Contr. (resÃºmenes), DATA CREDITEX (incidencias/ratios) y Hoja 8 (programaciÃ³n de egresos). El delta Contractual-Real es la base del Resultado Operativo y del CR del proyecto.

#### AutomatizaciÃ³n (ingesta a GRAPCO)
- **Presupuesto (BAC):** las hojas PPTO Contr. y PPTO Real â†’ mÃ³dulo Presupuesto/BAC de GRAPCO. Importador genÃ©rico in-app puede leer ITEM/DESCRIPCIÃ“N/UND/CANT/PU/PARCIAL/TOTAL. La estructura de partidas alimenta el CatÃ¡logo WBS (fuente Ãºnica de estructura).
- **Resultado Operativo (RO/CR/F06 + EVM):** A. Partidas (delta Contractual-Real por partida) y A. Recursos (delta por MO/MAT/EQH/SC) â†’ RO. El total S/ 1,487,257.83 y la composiciÃ³n por recurso son insumo directo del CR. La mano de obra de 4. EST (IP/HH/COSTO PROM) cruza con el ISP (tareos HH x S/25.5).
- **Curva S (F07):** Hoja 8 (egresos por semana SEM 1..24) â†’ mÃ³dulo Curva S; nota: en el volcado los egresos estÃ¡n en 0, requiere libro valorizado.
- **APU / Recursos:** 8. APU Real, APU Contract., 9. Recursos Real, Recursos Contr. â†’ la plataforma de Costos/APU es mÃ³dulo aparte de GRAPCO (APU saliÃ³ de GRAPCO el 15/06/2026; `calcularCostoAPU` se mantiene solo para RO). **GAP parcial:** carga masiva de APU desagregados (cuadrilla/insumo) no tiene importador dedicado en GRAPCO.
- **Gastos Generales (7. GG):** â†’ componente GG del RO (ya contemplado en las patas del AC). Mapear por concepto vÃ­a importador genÃ©rico.
- **GAP:** no hay mÃ³dulo de programaciÃ³n/flujo de caja en GRAPCO para consumir Hoja 8 si llegara valorizada (Flujo de Caja es gap conocido).



---

# CatÃ¡logo Costos â€” CategorÃ­a 4. RE-RO (chunk p1)

Proyecto: CREDITEX â€” "PTAR PLANTA 5" (PTARI) + Nave. Contratista GRAPCO SAC, SupervisiÃ³n DiseÃ±os Racionales SAC.
Cubre RO de DICIEMBRE 2025 y ENERO 2026, con todo su sustento (registros de almacÃ©n S10, valorizaciones de cliente F07, ISP semanales, registro de facturas/subcontratos, GG oficina, bancos).

ConvenciÃ³n de partidas: frente `FA01`, cÃ³digo tipo `1001/1.01`, `Costo MO prom = 25` (S/25 por HH en estos archivos; la plataforma usa S/25.5).
Estructura tÃ­pica registro almacÃ©n: `CÃ³digo | Recurso | Unidad | Cantidad Atendida | Valorizado (Principal) | Valorizado (Secundaria) | Recurso N1/N2/N3` (Principal = costo real; Secundaria â‰ˆ 29.7% â€” desdoble por frente/periodo).

---

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\ACERO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10 Â«PARTIDACONTROLCONSULTAÂ» (insumo del F07). 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1).
- Contenido: consumo de almacÃ©n filtrado por la subcontrata/frente ACERO al corte 27.12.25. 10 lÃ­neas de recurso (acero corrugado fy=4200 grado 60, alambre negro NÂ°16, arena gruesa, cemento Portland I APU, discos de corte, plÃ¡stico azul, tiza). Columnas CÃ³digo/Recurso/Unidad/Cantidad Atendida/Valorizado Principal/Valorizado Secundaria + jerarquÃ­a Recurso N1=MATERIALES, N2 (familia), N3 (subfamilia).
- NÃºmeros clave: acero corrugado 5 var = 120.61; acero 30 var = 403.27; alambre NÂ°16 1 rll = 305.77; cemento 10 bol = 241.53. (suma frente ACERO â‰ˆ 1372.74 segÃºn RO).
- PropÃ³sito: sustento de costo de materiales del frente ACERO para armar el Registro de AlmacÃ©n consolidado y el RO de diciembre.
- Origen -> Destino: S10 (almacÃ©n obra) -> hoja Â«4. ACEÂ» del REGISTRO ALMACEN F07 -> CR/RO F06.
- AutomatizaciÃ³n: GRAPCO AlmacÃ©n -> Â«Importar Registro S10Â» (lÃ­neas MATERIALES alimentan RO). Importador existente.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\CONCRETO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10 PARTIDACONTROLCONSULTA. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~19 filas).
- Contenido: consumo frente CONCRETO. Incluye concreto premezclado f'c=280 (4 m3) y f'c=100 (81 m3), cemento, clavos, discos, herramientas (boogie, lampa cuchara), mennekes.
- NÃºmeros clave: CONCRETO PREMEZCLADO f'c=280 4 m3 = S/2,020; f'c=100 81 m3 = S/16,200; boogie 3 und = 597.46. (frente CONCRETO en RO â‰ˆ 21,775.21).
- PropÃ³sito: sustento de materiales de concreto del mes.
- Origen -> Destino: S10 -> hoja Â«3. CONÂ» del Registro AlmacÃ©n -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\CURADO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, 4 filas).
- Contenido: frente CURADO. Mochila fumigadora (1 und = 144.07) y PER membrana curador 0.20 cil = 48. Fila de total al pie.
- NÃºmeros clave: total frente CURADO = 192.07.
- PropÃ³sito: sustento materiales de curado.
- Origen -> Destino: S10 -> hoja Â«5. CURÂ» -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\ENCOFRADO_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~7 filas).
- Contenido: frente ENCOFRADO. Clavos madera 3"/4", desmoldante metal (0.20 cil = 220), disco radial, escalera telescÃ³pica aluminio (669.49). Total al pie.
- NÃºmeros clave: total frente ENCOFRADO = 1,118.30.
- PropÃ³sito: sustento materiales de encofrado.
- Origen -> Destino: S10 -> hoja Â«15. ENCÂ» -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\GG.GG._AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 13 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~53 filas).
- Contenido: frente GASTOS GENERALES (EPP/seguridad y consumibles): caretas, barbiquejo, barra retrÃ¡ctil para cono, bloqueador, botas/botines PVC y cuero, cadena, etc. Recurso N2 mayormente SEGURIDAD INDUSTRIAL.
- NÃºmeros clave: botines de cuero punta acero 17 par = 1,088; botas PVC 4 par = 158; barra retrÃ¡ctil 22 und = 275. (GG total en RO â‰ˆ 15,060.87; CD del GG = 4,011.96).
- PropÃ³sito: sustento de consumos de GG de obra (seguridad/EPP).
- Origen -> Destino: S10 -> hoja Â«GGÂ» del Registro AlmacÃ©n -> RO (lÃ­nea GASTOS GENERALES).
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10 (categorÃ­a GG).

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\MDT_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~18 filas).
- Contenido: frente Movimiento de Tierras (MDT/MT). Barreta lisa, boogie, cable vulcanizado 3x12, gasolina 90, lampa, manguera PVC, mennekes, pico, pulpo enchufe.
- NÃºmeros clave: cable vulcanizado 1 rll = 796.61; boogie 3 = 597.46; pulpo 1 = 296.61. (frente MT en RO = 18,274.47).
- PropÃ³sito: sustento materiales/herramientas/combustible de movimiento de tierras.
- Origen -> Destino: S10 -> hoja Â«14. MTÂ» -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\OP_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 13 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~44 filas).
- Contenido: Â«OPÂ» = obras provisionales/operaciÃ³n general (campamento). Acero corrugado, adaptador PVC-SAP, alambre NÂ°8, arenas fina/gruesa, bisagras, cable vulcanizado, cemento APU y SOL, etc.
- NÃºmeros clave: cemento SOL 24 bol = 610.17; cemento APU 15 bol = 362.29; alambre NÂ°8 1 rll = 348.52. (este consumo alimenta el frente PROVISIONALES = 47,833.15 del RO).
- PropÃ³sito: sustento materiales de obras provisionales/campamento.
- Origen -> Destino: S10 -> hoja Â«2. PROÂ» del Registro AlmacÃ©n -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\RESUMEN_PC_AL_27_12_2025.png
- Tipo / formato: PNG (imagen) [.png - no-Excel]. 172 KB.
- Contenido: captura del resumen PartidaControl (RESUMEN_PC) al 27.12.25 â€” pantallazo de control de almacÃ©n S10. No legible por celdas en el volcado.
- PropÃ³sito: evidencia/respaldo visual del cierre de almacÃ©n.
- Origen -> Destino: pantallazo S10 -> carpeta sustento.
- AutomatizaciÃ³n: GAP (imagen). No se ingiere; archivado documental (Drive). El dato real va por los XLSX equivalentes.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\1. Reg de AlmacÃ©n\DICIEMBRE\TP_AL_27_12_2025.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~6 filas).
- Contenido: Â«TPÂ» = topografÃ­a/trabajos preliminares. Ocre rojo, pintura esmalte 1/4, tiralÃ­neas metÃ¡lico, wincha metÃ¡lica, yeso x18kg. Total al pie.
- NÃºmeros clave: total = 195.76 (= frente PRELIMINAR del RO).
- PropÃ³sito: sustento materiales de topografÃ­a/preliminares.
- Origen -> Destino: S10 -> hoja Â«1. PREÂ» del Registro AlmacÃ©n -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\3. Valorizaciones\1. Superado\GP-GCE-FOR-F07_VAL NÂ°02 2025.12.30.xlsx
- Tipo / formato: xlsx â€” ValorizaciÃ³n de cliente. CÃ³digo GP-GCE-FOR-F07. 505 KB. (carpeta Â«1. SuperadoÂ» = versiÃ³n archivada/anterior).
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8.
- Contenido:
  - CarÃ¡tula/RESUMEN: VAL NÂ°02, mes DICIEMBRE 2025 (periodo 16â€“28 dic), obra PTAR PLANTA 5, cliente CREDITEX, residente Ing. Guido Gonzales, plazo 130 D.C.
  - 2. PAGOS: cronograma de pagos (5 pÃ¡gs).
  - 3. RES.VAL: resumen de valorizaciones con montos referenciales.
  - 4. VAL: detalle por ITEM/partida con PRESUPUESTO (und, cant, P.U., parcial), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL (cantidad/%/total). ~112 filas de partidas.
  - 5. RO: cruce con presupuesto F1 (PTARI): Total Costo de Obra, Costo Directo, valorizaciÃ³n quincenal y acumulada por partida.
  - Hoja1: metrados auxiliares (longitud/alto/Ã¡rea). Hoja 8: cronograma de egresos por semana (con #REF!).
- NÃºmeros clave: Presupuesto referencial 2,866,414.72 (inc IGV) / 2,429,165.02 (sin IGV); Costo Directo 1,785,339.08. RO: Total Costo de Obra Ppto F1 2,234,192.66; Val quincenal 90,573.50; Val acumulada 319,022.78; CD ppto 1,751,047.24 / val acum 250,033.92.
- PropÃ³sito: valorizaciÃ³n contractual hacia el cliente (avance facturable) y su reflejo en el RO.
- Origen -> Destino: metrados de obra + presupuesto contractual -> VAL F07 -> hoja RO -> RO F06 (columnas EV/Valorizado).
- AutomatizaciÃ³n: GRAPCO Valorizaciones (cliente) + Curva S (F07). El bloque Â«5. ROÂ» mapea a RO F06. Importador F07 existente.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL NÂ°03 2025.12.30.xlsx
- Tipo / formato: xlsx â€” ValorizaciÃ³n de cliente F07. 510 KB.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8 (misma plantilla que VAL NÂ°02).
- Contenido: VAL NÂ°03, mes ENERO 2026 (fecha doc 15-ene-2026), misma obra/cliente. 4. VAL ~133 filas. 5. RO con avance acumulado mayor.
- NÃºmeros clave: Presupuesto referencial 2,866,414.72 (inc IGV); CD 1,785,339.08. RO: Total Costo de Obra Ppto F1 2,260,561.97; Val quincenal 33,537.13; Val acumulada 351,536.41; CD val acum 276,403.23.
- PropÃ³sito: valorizaciÃ³n NÂ°03 al cliente y actualizaciÃ³n del RO.
- Origen -> Destino: presupuesto + metrados -> VAL F07 -> RO F06.
- AutomatizaciÃ³n: Valorizaciones + Curva S; bloque Â«5. ROÂ» -> RO F06.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL-ADICIONALES NÂ°01,02,03 2025.12.30.xlsx
- Tipo / formato: xlsx â€” ValorizaciÃ³n de ADICIONALES F07. 472 KB.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8.
- Contenido: ValorizaciÃ³n de Adicionales NÂ°02 (mes DICIEMBRE), presupuestos Â«ADICIONALES NÂ°06, NÂ°07 y NÂ°08Â». 4. VAL ~54 filas. 5. RO con columna PTARI.
- NÃºmeros clave: Costo Directo adicionales = 12,769.22; RO Total Costo de Obra adicional = 16,149.07 (val acum 16,149.07); CD 12,769.22; partida 1001 Preliminares 263.96.
- PropÃ³sito: valorizar trabajos adicionales aprobados (PQ-01/PQ-02) hacia el cliente y reflejarlos en el RO.
- Origen -> Destino: presupuestos adicionales -> VAL Adicionales F07 -> RO F06 columnas Adicionales (PV/EV Adicionales).
- AutomatizaciÃ³n: GRAPCO Adicionales/Deductivos + Valorizaciones. Mapea a columnas Â«AdicionalesÂ» del RO F06.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM 08_RO REV.01.xlsx
- Tipo / formato: xlsx â€” Informe Semanal de ProducciÃ³n (ISP). CÃ³digo PRO-GCR-FOR-F01. 1,950 KB. REV.01.
- Hojas: PARTIDAS CONTROL | CR | ISP-SEM08 ... ISP-SEM01 (10).
- Contenido:
  - PARTIDAS CONTROL: catÃ¡logo de partidas de control con cÃ³digo (1001 Trabajos Preliminares, SSO, andamios, seÃ±alizaciÃ³n, etc.) y unidad. Fuente Ãºnica de estructura del ISP.
  - CR: control de recursos por tareos. Encabezado Â«Costo MO prom: 25Â». Columnas HH | COSTO | ACUM S/IGV por partida/frente.
  - ISP-SEMnn (SEM01 a SEM08): por partida METRADO/HH/IP en bloques PREVISIÃ“N (PPTO oferta, adicionales, total, ppto meta), ACUMULADO ANTERIOR, dÃ­a a dÃ­a (Lunâ€“Dom), PRESENTE SEMANA, y META/VAR/CPI. Semanas: S01=03â€“09 nov ... S08=22â€“28 dic 2025.
- NÃºmeros clave: CR Total Costo de Obra HH 2,355 / costo 34,537.50 / acum 58,875; CD HH 2,251 / 31,937.50 / 56,275. Preliminares HH 593.25. ISP-SEM08 presente semana META 520.49 vs 493.50 HH (CPI 1.05); acumulado meta 2,282.96 vs 2,355 (CPI 0.97).
- PropÃ³sito: medir productividad (IP = HH/metrado) y CPI de mano de obra por partida y semana; fuente del costo de MO (HH x tarifa) que entra al RO.
- Origen -> Destino: tareos diarios de campo + metrados -> ISP semanal -> CR (HH y costo) -> RO F06 (Actual Cost de MO) y CPI.
- AutomatizaciÃ³n: GRAPCO ISP (tareos HH x S/25.5) + RO/CR + EVM. Tareos = fuente Registros_Campo. Importador ISP (pendiente ISP_Semanal segÃºn memoria).

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2025.12.27.xlsx
- Tipo / formato: xlsx â€” Registro de AlmacÃ©n consolidado. CÃ³digo GP-GCE-FOR-F07. 391 KB. Corte 27.12.25 / Semana 13.
- Hojas (18): CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG.
- Contenido:
  - CR: matriz partida x frente (ACUM S/IGV mensual y por categorÃ­a 1.PRELIMINAR..15 ENCOFRADO, GG). Es el consolidado madre.
  - Analisis: detalle de costos con CONTROL y DELTA (deltas acumulados, clave para importador F07 acumulado).
  - Data: ~573 filas â€” todos los recursos consolidados (CÃ³digo/Recurso/Unidad/Cant/Costo/Valorizado Secundaria/Recurso N1 + COMENTARIO1/2). Algunas celdas con fÃ³rmulas (`+'1. PRE'!O7`).
  - Hojas 1.PRE..GG: cada frente con su sub-tabla de partidas + sub-tabla Â«AnÃ¡lisis detalle de costosÂ» + listado de recursos del frente.
- NÃºmeros clave: Total Costo de Obra 105,822.57 (mensual); Costo Directo 94,280.66. Por frente: PRELIMINAR 195.76, PROVISIONAL 47,833.15, CONCRETO 21,775.21, ACERO 1,372.74, CURADO 192.07, MT 18,274.47, ENCOFRADO 1,118.30, GG 15,060.87 (CD GG 4,011.96). Analisis: Total 117,237.37; delta Preliminares 42.37.
- PropÃ³sito: consolidar todo el consumo de almacÃ©n del mes por partida/frente; es la pata Â«materialesÂ» del RO (Actual Cost).
- Origen -> Destino: XLSX por frente (S10) -> este consolidado F07 -> hoja CR -> RO F06 (columna REGISTRO ALMACEN).
- AutomatizaciÃ³n: GRAPCO AlmacÃ©n -> Â«Importar Registro S10Â» (maestros F07 ACUMULADOS â€” calcula deltas; solo lÃ­neas MATERIALES al RO). Importador existente.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2025.12.31.xlsx
- Tipo / formato: xlsx â€” Registro de Facturas (subcontratos/proveedores). CÃ³digo GP-GCE-FOR-F07. 77 KB. Corte 31.12.25.
- Hojas (3): RESUMEN | CR | 14. MT.
- Contenido:
  - RESUMEN: por frente y PROVEEDOR (AMSA, SOLCONER, RECOSA, CONSTRUCTORA TINOZ, RJ&H, CONSORCIO SA&ES, A&CR, EFCO, NOPIN) con MONTO SIN IGV/IGV/CON IGV (varios #N/A).
  - CR: matriz partida x frente, REGISTRO DE FACTURAS, ACUM/MENSUAL al 30.11 y 31.12.
  - 14. MT: cuadro de valorizaciones de subcontrato de movimiento de tierras (subcontratista R PROYECTOS, RUC 20483973951), con FACTURA/VAL/DESCRIPCION/MONTO/PAGADO/FECHA, amortizaciÃ³n/deducciÃ³n/saldo por deducir.
- NÃºmeros clave: Total Costo de Obra = Costo Directo = 87,499.95 (mensual y acum, todo en MT). MT factura E001-684 R PROYECTOS VAL1 44,592.48 sin IGV / 52,619.13 con IGV (PAGADO SI); VAL2 42,907.47 / 50,630.82 (NO). Monto contractual MT 65,761.05 inc IGV / 55,729.70 sin IGV; saldo por deducir 12,822.
- PropÃ³sito: controlar costo real por facturas de proveedores/subcontratistas (pata Â«facturasÂ» del AC en el RO) y valorizaciÃ³n de subcontratos.
- Origen -> Destino: facturas/valorizaciones de subcontrato -> Registro Facturas -> hoja CR -> RO F06 (columna REGISTRO FACTURAS del AC).
- AutomatizaciÃ³n: Importador genÃ©rico in-app para el registro de facturas. ValorizaciÃ³n de Subcontratistas (F10/F11) es GAP conocido â€” proponer mÃ³dulo de subcontratos.

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO GG OFICINA_acumulado_31_12.xlsx
- Tipo / formato: xlsx â€” Registro de Gastos Generales de Oficina (acumulado). CÃ³digo GP-GCE-FOR-F07. 41 KB.
- Hojas (1): REG. GG OFICINA_30.04.
- Contenido: matriz partida (FA01/1.01..) x mes (ACUM S/IGV y MENSUAL desde 31.12.24 hasta 31.12.25), con columnas finales separando PRECOTEX y CREDITEX. GG de oficina (no de obra) prorrateados al proyecto.
- NÃºmeros clave: Total Costo de Obra acum (multiproyecto) 1,155,655.10; mensuales por mes (ej. 31.01.25 100,747.75; 30.04.25 72,414.28; etc.). En el RO de dic., el GG oficina aporta el resto de GG (RO CR Total GG oficina 46,324.76; CD 0).
- PropÃ³sito: distribuir gastos generales de oficina (indirectos) al RO del proyecto.
- Origen -> Destino: contabilidad/GG oficina GRAPCO -> este acumulado -> hoja CR del RO (columna GASTOS GENERALES - OFICINA).
- AutomatizaciÃ³n: GRAPCO RO â€” pata GG. Importador genÃ©rico (columna GG oficina del RO). Requiere prorrateo PRECOTEX/CREDITEX por proyecto (aislamiento).

### \05. GestiÃ³n Costos\4. RE-RO\2025.12 RO_DIC CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2025.12.27.xlsx
- Tipo / formato: xlsx â€” RESULTADO OPERATIVO (RO). CÃ³digo GP-GCE-FOR-F06. 599 KB. Rev 1, mes reporte 31-dic-2025.
- Hojas (6): RO | CR | Adicionales | Deductivos | Leyenda | GG.
- Contenido:
  - RO: tablero EVM por partida/frente. Presupuesto (Ppto F1 PTARI, Ppto F2 Nave, Deductivos, Adicionales, BAC), Avance Programado (PV F1/F2/Deduc/Adic = Plan Value), Valorizado (Val F1/F2/Deduc/Adic = Earned Value), Costo Real (AC), CV margen, CPI, Saldo teÃ³rico/costo por ejecutar, EAC, VAC, SPI.
  - CR: cuadro de control que cruza las 4 patas del AC â€” REGISTRO FACTURAS + REGISTRO ALMACEN + CONTROL TAREOS + GASTOS GENERALES = TOTAL REGISTRO; mÃ¡s HH F1/F2/Total. Encabezado Â«Costo MO prom: 25Â».
  - Adicionales / Deductivos: presupuesto y avance (programado/valorizado) PQ-01/PQ-02 por partida.
  - Leyenda: glosario EVM (PV, EV, AC, BAC, EAC, ETC, CV, SV, CPI, SPI con fÃ³rmulas).
  - GG: anÃ¡lisis de gastos generales (CD, GG variables/fijos, utilidad) â€” con #REF!.
- NÃºmeros clave: BAC Total 2,264,073.57 (Ppto F1 2,247,877.45 + Adicionales 16,149.07; F2/Deduc 0). Plan Value 335,171.84; Earned Value 359,237.88; Actual Cost 298,522.28; CV 60,715.60; CPI 1.20; EAC 2,203,357.97; VAC 60,715.60; SPI 1.07. AC desglosado: Facturas 87,499.95 + AlmacÃ©n 105,822.57 + Tareos 58,875 + GG 46,324.76 = 298,522.28. HH total 2,355. GG: variables 687,204.96; fijos 55,779.20; utilidad 0.11.
- PropÃ³sito: documento maestro de control de costos â€” resultado operativo del proyecto con EVM (margen, CPI, proyecciÃ³n EAC/VAC). Es el entregable final que consolida todo el sustento del chunk.
- Origen -> Destino: Registro AlmacÃ©n F07 + Registro Facturas + ISP/CR (tareos) + GG oficina + Valorizaciones F07 -> RO F06 -> Dashboard RO.
- AutomatizaciÃ³n: GRAPCO Resultado Operativo (RO/CR/F06 + EVM) â€” nÃºcleo ya vivo y automÃ¡tico (useRO). BAC desde Presupuesto; Val desde Valorizaciones; AC desde AlmacÃ©n+Facturas+ISP+GG. Es el destino de prÃ¡cticamente todos los demÃ¡s archivos del chunk.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\ACERO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10 PARTIDACONTROLCONSULTA. 10 KB. (carpeta Â«ENERO 2025Â» â€” corte 31.01.2026).
- Hojas: PARTIDACONTROLCONSULTA (1, ~10 filas).
- Contenido: acumulado frente ACERO a enero. Incluye ACERO DIMENSIONADO corte y doblado por diÃ¡metros (1", 1/2", 3/4", 5/8", 3/8") en toneladas â€” gran salto vs diciembre.
- NÃºmeros clave: acero dimensionado 1" 37.79 ton = 117,075.40; 5/8" 30.85 ton = 95,561.93; 1/2" 4.81 ton = 14,879.25; 3/4" 3.17 ton = 9,811.56; 3/8" 2.76 ton = 8,563.30. Acero corrugado 64 var = 1,540.99.
- PropÃ³sito: sustento materiales acero (mes enero, fuerte consumo de acero habilitado).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 enero -> RO enero.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\CONCRETO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 11 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~19 filas).
- Contenido: frente CONCRETO enero. Premezclados f'c=350 (108 m3), f'c=100 (57 + 193.50 m3), f'c=280 (4 m3), cemento, cincel SDS, clavos, arena.
- NÃºmeros clave: f'c=350 108 m3 = 93,597.67; f'c=100 193.50 m3 = 38,700; f'c=100 57 m3 = 11,400; f'c=280 4 m3 = 2,020.
- PropÃ³sito: sustento materiales concreto enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 enero -> RO enero.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\CR_31.01.2026.png
- Tipo / formato: PNG (imagen) [.png - no-Excel]. 238 KB.
- Contenido: captura del cuadro de control (CR) de almacÃ©n al 31.01.2026. No legible por celdas.
- PropÃ³sito: evidencia visual del cierre de almacÃ©n de enero.
- Origen -> Destino: pantallazo S10/CR -> sustento.
- AutomatizaciÃ³n: GAP (imagen) â€” archivado documental; el dato va por los XLSX.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\CURADO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, 4 filas).
- Contenido: frente CURADO enero. Mochila fumigadora (144.07) + PER membrana 0.50 cil = 120. Total al pie.
- NÃºmeros clave: total = 264.07.
- PropÃ³sito: sustento materiales curado enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\ENCOFRADO_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~11 filas).
- Contenido: frente ENCOFRADO enero. Alambre NÂ°8, clavos madera 2"/3"/4", desmoldante (0.50 cil = 550), disco radial, escalera telescÃ³pica, lija, y lÃ­nea SUBCONTRATOS Y SERVICIOS (SC alquiler de puntales metÃ¡licos 2.50 â€” Recurso N1 = SUBCONTRATOS).
- NÃºmeros clave: desmoldante 0.50 cil = 550; escalera telescÃ³pica 669.49; SC puntales 81.36.
- PropÃ³sito: sustento materiales/SC encofrado enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10 (incluye lÃ­neas SUBCONTRATOS Y SERVICIOS).

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\GG.GG._AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 14 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~78 filas).
- Contenido: frente GG enero (EPP/seguridad, acumulado mayor que dic). Caretas, baldes, barbiquejo (39 und), barra retrÃ¡ctil, bloqueador, botas/botines (31 par), cadena, etc.
- NÃºmeros clave: botines cuero 31 par = 1,984; botas PVC 10 par = 395; barbiquejo 39 = 74.10.
- PropÃ³sito: sustento consumos GG seguridad enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 -> RO (lÃ­nea GG).
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2025.12.27.xlsx
- Tipo / formato: xlsx â€” Registro de AlmacÃ©n consolidado F07. 391 KB. (NOTA: archivo con fecha 2025.12.27 ubicado en carpeta enero â€” parece copia de arrastre del consolidado de diciembre, mismos totales; aÃºn no actualizado a enero).
- Hojas (18): CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG (idÃ©ntica estructura al de diciembre).
- Contenido: mismo consolidado que el F07 de diciembre (CR/Analisis/Data + hoja por frente). Corte 27.12.25, semana 13.
- NÃºmeros clave: idÃ©nticos al consolidado de dic. â€” Total 105,822.57; CD 94,280.66; por frente PROVISIONAL 47,833.15, CONCRETO 21,775.21, MT 18,274.47, GG 15,060.87, etc. Analisis Total 117,237.37 (delta Preliminares 42.37).
- PropÃ³sito: base del Registro de AlmacÃ©n para el RO de enero (pendiente de actualizar con consumos de enero).
- Origen -> Destino: S10 -> consolidado F07 -> RO enero.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10 (acumulado, deltas). GAP de proceso: duplicado de archivo / falta refresco â€” el importador acumulado lo resolverÃ­a al subir la cadena completa.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\MT_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 10 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~20 filas).
- Contenido: frente MT enero. Barreta, boogie, cable vulcanizado, gasolina 90 (8.81 gal), lampa, manguera PVC, mennekes, pico, pulpo.
- NÃºmeros clave: cable vulcanizado 796.61; boogie 597.46; pulpo 296.61; gasolina 8.81 gal = 109.21.
- PropÃ³sito: sustento materiales/combustible MT enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\OP_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 12 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~50 filas).
- Contenido: frente OP/provisionales enero. Acero corrugado, adaptador PVC, alambre NÂ°8, arenas, bisagras, cable vulcanizado, cemento APU/SOL, etc.
- NÃºmeros clave: cable vulcanizado 796.61; cemento SOL 24 bol = 610.17; cemento APU 15 bol = 362.29.
- PropÃ³sito: sustento materiales obras provisionales/campamento enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (2. PRO) -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\TP_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, ~6 filas).
- Contenido: frente topografÃ­a/preliminares enero. Ocre rojo (3 kg), pintura esmalte, tiralÃ­neas, wincha, yeso. Total al pie.
- NÃºmeros clave: total = 231.35.
- PropÃ³sito: sustento materiales topografÃ­a enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (1. PRE) -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENERO 2025\VESTRUCTURAS_AL_31_01_2026.XLSX
- Tipo / formato: xlsx. ExportaciÃ³n S10. 9 KB.
- Hojas: PARTIDACONTROLCONSULTA (1, 4 filas).
- Contenido: frente VARIOS ESTRUCTURAS enero. AE Bentobar (30 m = 795.22) y Primer Bentobar (5 l = 300) â€” water stop / sello. Total al pie.
- NÃºmeros clave: total = 1,095.22.
- PropÃ³sito: sustento materiales varios estructuras (water stop) enero.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (6. VAR EST) -> RO.
- AutomatizaciÃ³n: AlmacÃ©n -> Importar Registro S10.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Enero.xls
- Tipo / formato: xls (Excel binario, contable) â€” Registro de Bancos / movimientos financieros GRAPCO. 15,816 KB (muy pesado).
- Hojas (7): Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen.
- Contenido:
  - Datos: parÃ¡metros (RUC 20203071702 GRAPCO, IGV 0.18, tasa retenciÃ³n honorarios 0.08), cuentas bancarias (CrÃ©dito Soles 193-2080045-0-54 saldo 92,839.39; CrÃ©dito DÃ³lares; NaciÃ³n; cuentas Precotex/Caja/Creditex) y plan contable Concar.
  - Ingresos_diario (~4,075 filas, desde 2023): facturas/notas de crÃ©dito por cliente (UVI TECH, PRECOTEX, COMPAÃ‘IA INDUSTRIAL ROMOSA, etc.), monto, IGV, detracciÃ³n, mes.
  - egresos_diario (~3,002 filas): egresos por proveedor/concepto (publicidad, capacitaciÃ³n...), IGV/detracciÃ³n/retenciÃ³n.
  - gastos (~1,265 filas): facturas de gasto por rubro (LogÃ­stica, Renta_3era, Bancos, IGV) y proveedor (SUNAT, etc.).
  - RRHH (~996 filas): planilla/aportes (Essalud, ONP, AFP Habitat/Integra, Renta 4ta/5ta, Personal), proveedor INTERCONTACT SAC.
  - Bancos (~25,699 filas): extracto banco por banco (Cargo/Abono/Saldo, observaciones) â€” incl. cuotas sindicales, detracciones, compras de dÃ³lares, pagos a proveedores (ej. GESTION MADERERA F001-26637).
  - Almacen (~1,054 filas): kardex de mercaderÃ­a antiguo (libros/polos/kits) â€” data legacy de otra lÃ­nea de negocio.
- NÃºmeros clave: saldo inicial CrÃ©dito Soles 92,839.39; total cuentas iniciales 97,926.12. Ingresos ejemplo PRECOTEX E001-131 448,855.81; gasto Renta_3era 499,030; planilla INTERCONTACT 38,344.44. (Sin total global en el volcado).
- PropÃ³sito: contabilidad/tesorerÃ­a de GRAPCO (multiempresa/multiproyecto). Fuente para FLUJO DE CAJA, control de planilla y conciliaciÃ³n de pagos a proveedores/subcontratos.
- Origen -> Destino: sistema contable (Concar) / banca -> registro de bancos -> alimenta Flujo de Caja y validaciÃ³n de pagos del RO.
- AutomatizaciÃ³n: GAP â€” Flujo de Caja y Control de Planilla son gaps conocidos. RequerirÃ­a importadores especÃ­ficos (Ingresos/Egresos/Bancos/RRHH) y filtrado por proyecto (CREDITEX) ya que el archivo es multiempresa. No mapea a mÃ³dulos actuales; archivo muy pesado (.xls binario) â€” necesita pre-proceso.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL NÂ°04.xlsx
- Tipo / formato: xlsx â€” ValorizaciÃ³n de cliente F07. 524 KB.
- Hojas (8): CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8 (misma plantilla F07).
- Contenido: VAL NÂ°04, mes ENERO 2026 (periodo 16â€“31 ene, fecha 30-ene-2026). 4. VAL ~184 filas (mÃ¡s partidas activas). 5. RO con avance acumulado fuerte.
- NÃºmeros clave: Presupuesto referencial 3,061,736.74 (inc IGV) â€” subiÃ³ por adicionales; CD 1,915,342.93. RO: Total Costo de Obra Ppto F1 2,422,311.29; Val quincenal 548,394.09; Val acumulada 1,141,789.55; CD val acum 902,823.08. SSO acum 25,217.93.
- PropÃ³sito: valorizaciÃ³n NÂ°04 al cliente (gran avance de enero) y actualizaciÃ³n del RO.
- Origen -> Destino: presupuesto + metrados -> VAL F07 -> RO F06.
- AutomatizaciÃ³n: GRAPCO Valorizaciones + Curva S; bloque Â«5. ROÂ» -> RO F06.

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM13 .xlsx
- Tipo / formato: xlsx â€” Informe Semanal de ProducciÃ³n (ISP). CÃ³digo PRO-GCR-FOR-F01. 3,121 KB.
- Hojas (16): PARTIDAS CONTROL | CR | Control | ISP-SEM13 ... ISP-SEM01.
- Contenido:
  - PARTIDAS CONTROL: catÃ¡logo de partidas de control (igual que SEM08).
  - CR: HH/COSTO/ACUM por partida, corte 31-ene-2026. Â«Costo MO prom: 25Â».
  - Control: cuadro comparativo ADMINISTRACIÃ“N (HH planilla) vs CAMPO (HH campo/ISP) por SEMANA, con DELTA HH ADM vs CAMPO â€” cruce planilla vs tareos.
  - ISP-SEM01..SEM13: METRADO/HH/IP por partida y dÃ­a, META/VAR/CPI semanal y acumulado. S13 = 26 eneâ€“01 feb 2026.
- NÃºmeros clave: CR Total Costo de Obra HH 6,477.50 / costo 108,700 / acum 161,937.50; CD HH 6,282.50 / 103,825 / 157,062.50. Preliminares HH 1,772.75 (SSO 398.25 = 9,956.25; TopografÃ­a 451.50 = 11,287.50). Control: HH planilla acum 6,492.50 vs HH campo 6,477.50 (delta 15 â‰ˆ capataz/no productivo). ISP-SEM13 presente semana 875.54 meta vs 869 HH (CPI 1.01); acumulado meta 5,762.55 vs 6,477.50 HH (CPI 0.89).
- PropÃ³sito: productividad (IP/CPI) y costo de MO acumulado del proyecto; concilia HH planilla vs HH campo (Control) â€” base del AC de mano de obra del RO.
- Origen -> Destino: tareos diarios + planilla -> ISP semanal + hoja Control -> CR -> RO F06 (AC tareos / CPI).
- AutomatizaciÃ³n: GRAPCO ISP (tareos HH x S/25.5) + RO/CR + EVM. Hoja Control es insumo para conciliar con Control de Planilla (gap). Tareos = Registros_Campo. Importador ISP_Semanal pendiente.



---

# CatÃ¡logo de Costos â€” CategorÃ­a 4. RE-RO (cont. 2) â€” Chunk `cat_4_RE_RO__p2`

Proyecto: **CREDITEX (PTAR PLANTA 5 / "AMPLIACIÃ“N PRECOTEX LAS MORERAS")**, frentes F1 (PTARI) y F2 (Nave).
Cubre los meses de RO: **2026.01 (ENE)**, **2026.02 (FEB)** y **2026.03 (MAR, sÃ³lo sustento de AlmacÃ©n)**.
Cargos MO costeados a **Costo MO prom: S/ 25** (= S/25.5 redondeado en la prÃ¡ctica GRAPCO). Semana rectora: SEM13 = enero, SEM17 = febrero.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.01.31.xlsx
- **Tipo / formato:** xlsx â€” formato **GP-GCE-FOR-F07** (Registro de AlmacÃ©n / consumo de materiales valorizado). Es la pata de AlmacÃ©n del AC del RO.
- **Hojas (18):** CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. AC | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG
- **Contenido:**
  - **CR (Control/Resumen):** matriz por partida WBS (FA01, Ã­tems 1..15 + GG) con columnas ACUM al 27.12.2025 (S/), MENSUAL, y desglose por grupo de material (1. PRELIMINAR, 2. PROVISIONAL, 3. CONCRETO, 4. ACERO, 5. CURADO, 6. VARIOS EST, 7. TABIQUERIA, 8 BITUMEN, 10 PRUEBA HIDR, 11 VAR ARQ, 12 IIEE, 13 IISS, 14 MOV TIERRA, 15 ENCOFRADO, GASTOS GENERALES) y ACUM al 31.01.2026. Nota interna "IMPORTANTE ANALIZAR LA DATA / REALIZAR UNA ADECUADO FASEO".
  - **Analisis:** detalle de costos por partida â†’ COSTO DIRECTO / TOTAL COSTO DE OBRA, con columnas CONTROL y DELTA (cuadre). Sub-rubros: SEGURIDAD Y SALUD OCUPACIONAL, TOPOGRAFÃA, ACARREO DE MATERIALES, etc.
  - **Data:** padrÃ³n de recursos consumidos (CÃ³digo S10, Recurso, Unidad, Cantidad Atendida, Costo, Valorizado (Secundaria), Recurso N1 = tipo MATERIALES/SUBCONTRATOS, COMENTARIO 1 = grupo, COMENTARIO 2 = sub-grupo). ~200 lÃ­neas.
  - **Hojas 1..15 + GG:** una hoja por grupo de material; cada una replica CR + Analisis + Data filtrada de ese grupo (columnas Valorizado Principal / Secundaria, doble valorizaciÃ³n).
- **NÃºmeros clave (ACUM al 31.01.2026, S/ sin IGV):**
  - TOTAL COSTO DE OBRA 532,503.99 (mensual 426,681.42; ACUM previo 27.12 = 105,822.57)
  - COSTO DIRECTO 507,364.67
  - Por grupo: PROVISIONAL 48,255.19 Â· CONCRETO 156,462.06 Â· ACERO 253,134.33 Â· MOV TIERRA 25,369.46 Â· GASTOS GENERALES 46,147.65 Â· ENCOFRADO 1,544.66 Â· VARIOS EST 1,095.22 Â· CURADO 264.07 Â· PRELIMINAR 231.35
  - Acero dimensionado 1" CyD: 37.79 ton â†’ 117,075.40 (principal) / 34,765.88 (secundaria)
- **PropÃ³sito:** cuantificar el costo real de **materiales** consumidos (una de las 4 patas del AC). Maestros F07 son **acumulados**: se sube la cadena completa y la plataforma calcula deltas.
- **Origen â†’ Destino:** sale de salidas de almacÃ©n S10 (Kardex) â†’ alimenta la columna **Real / Actual Cost (AC)** del RO (F06) "ANALISIS DE DATA DE REGISTRO DE ALMACEN".
- **AutomatizaciÃ³n:** importador existente **AlmacÃ©n â†’ Â«Importar Registro S10Â»** (calcula deltas de acumulados; sÃ³lo lÃ­neas MATERIALES alimentan el RO). Mapeo directo, sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.01.31.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F07** (Registro de Facturas / valorizaciÃ³n de subcontratistas).
- **Hojas (4):** RESUMEN | CR | 14. MT | 15. ENC
- **Contenido:**
  - **RESUMEN:** por rubro/proveedor (PROVEEDOR, MONTO SIN IGV, IGV, MONTO CON IGV). Proveedores: AMSA (PRE), SOLCONER SAC (IIEE), RECOSA (IISS), CONSTRUCTORA TINOZ SAC / RJ&H / CONSORCIO SA&ES EIRL (MT), A&CR / EFCO / NOPIN (ENC). Varios #N/A (sin factura cargada).
  - **CR:** matriz por partida WBS con ACUM 31.12.25, MENSUAL y ACUM 31.01.26.
  - **14. MT / 15. ENC:** "CUADRO RESUMEN DE VALORIZACIONES" por subcontrato (FACTURA, SUBCONTRATISTA, VAL, DESCRIPCION, MONTO SIN IGV, IGV, MONTO CON IGV, PAGADO SI/NO, FECHA). MT subcontratista **R PROYECTOS** (RUC 20483973951), servicio "SUBCONTRATO DE MOVIMIENTO DE TIERRAS"; ENC subcontratista **EFCO**, "ALQUILER Y CONSUMIBLES EFCO".
- **NÃºmeros clave (S/ sin IGV):**
  - TOTAL COSTO DE OBRA ACUM 31.01.26 = 93,561.07 (mensual ene 6,061.12; ACUM 31.12 = 87,499.95)
  - MT: VAL1 44,592.48 + VAL2 46,018.79 + AD1 2,949.80 (R PROYECTOS, PAGADO SI). Monto contractual 65,761.05 (inc IGV) / 55,729.70 (no inc). Saldo por deducir 12,822.
- **PropÃ³sito:** capturar el costo real de **subcontratos/facturas** (pata de Facturas del AC) y controlar valorizaciones de subcontratistas.
- **Origen â†’ Destino:** facturas de proveedores/subcontratistas â†’ columna Real (AC) del RO, rubro "REGISTRO FACTURAS".
- **AutomatizaciÃ³n:** **GAP parcial** â€” no existe importador de ValorizaciÃ³n de Subcontratistas (F10/F11). La hoja CR sÃ­ puede ir por importador genÃ©rico a la pata Facturas del AC en RO; el detalle de valorizaciones de subcontratistas requiere mÃ³dulo nuevo. **GAP: ValorizaciÃ³n de Subcontratistas.**

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO GG OFICINA_acumulado_31_01_2026.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F07** (Gastos Generales de Oficina, acumulado).
- **Hojas (1):** REG. GG OFICINA_30.04
- **Contenido:** matriz por partida WBS con pares de columnas **ACUM S/ IGV + MENSUAL** mes a mes, desde 31.12.24 hasta 31.01.26 (serie histÃ³rica completa de ~14 cortes). Filas: partidas 1..n; las partidas de obra figuran en 0 (GG de oficina no se imputan a partidas productivas).
- **NÃºmeros clave (TOTAL COSTO DE OBRA acumulado mensual, S/):** 100,747.75 (ene-25) â†’ 165,576.81 â†’ 230,580.41 â†’ 302,994.69 â†’ 382,965.82 â†’ 465,168.58 â†’ 542,747.59 â†’ 674,242.92 â†’ 743,096.28 â†’ 821,137.40 â†’ 899,746.99 â†’ 973,303.46 (nov-25)â€¦ (continÃºa, valor ene-26 truncado en volcado).
- **PropÃ³sito:** llevar el costo real de **Gastos Generales de oficina** (estructura central, no de obra) como insumo del RO.
- **Origen â†’ Destino:** contabilidad de oficina GRAPCO â†’ columna GASTOS GENERALES del CR del RO.
- **AutomatizaciÃ³n:** importador genÃ©rico in-app â†’ pata GG del AC en RO. Es acumulado: subir cadena y calcular delta. Bajo riesgo de GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.01 RO_ENE CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.01.31.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F06** (Resultado Operativo, el documento maestro del RO). Rev 1.
- **Hojas (6):** RO | CR | Adicionales | Deductivos | Leyenda | GG
- **Contenido:**
  - **RO:** matriz EVM por FRENTE/PARTIDA/DescripciÃ³n. Columnas: Presupuesto [Ppto F1 (PTARI), Ppto F2 (Nave), Deductivos PQ-01/02, Adicionales PQ-01/02, **Ppto Total (BAC)**]; Avance [PV F1, PV F2, PV Deduct, PV Adic, **Plan Value (PV)**; Val F1, Val F2, Val Deduct, Val Adic, **Earn Value (EV)**]; Costo [**Actual Cost (AC)**, VariaciÃ³n CV, CPI]; Saldo teÃ³rico por ejecutar, Saldo costo por ejecutar; CPI; VariaciÃ³n del Cronograma (SPI); Estimado al tÃ©rmino [EAC, VAC]; columnas de cruce "ANALISIS DE DATA DE REGISTRO DE ALMACEN" y "ANALISIS DE DATA DEL ISP". Encabezado: MES SEMANA 13, % avance 0.51.
  - **CR (Control Registro):** consolida las 4 patas del AC â€” REGISTRO FACTURAS, REGISTRO ALMACEN, CONTROL TAREOS, GASTOS GENERALES = TOTAL REGISTRO; mÃ¡s HH F1/F2 (REPORTE TAREOS) y GG OFICINA. Costo MO prom: 25.
  - **Adicionales / Deductivos:** matriz por partida PQ-01/PQ-02 (Presupuesto / Programado / Valorizado). En ene todo 0.
  - **Leyenda:** glosario EVM (PV/EV/AC/BAC/EAC/ETC/CV/SV/CPI con fÃ³rmulas e interpretaciÃ³n en obra).
  - **GG:** "AnÃ¡lisis de Gastos Generales" (Costo Directo #REF!, GG Variables 687,204.96, GG Fijos 55,779.20, Utilidad 0.11 = 11%); contiene #REF!/#REF! (referencias rotas a otro libro).
- **NÃºmeros clave:** % avance 0.51 (SEM13). CR TOTAL REGISTRO = 897,534.59 (FACTURAS 93,561.07 + ALMACEN 532,503.99 + TAREOS 161,937.50 + GG 109,532.03). HH Total 6,477.50 (F1 6,477.50, F2 0) â†’ CONTROL TAREOS 161,937.50 (6,477.50 Ã— 25). GG Variables 687,204.96; GG Fijos 55,779.20; Utilidad 11%.
- **PropÃ³sito:** documento integrador del control de costos â€” EVM por partida y frente, consolidaciÃ³n del AC y proyecciÃ³n (EAC/VAC).
- **Origen â†’ Destino:** consume Registro AlmacÃ©n + Registro Facturas + Tareos (ISP) + GG Oficina (las 4 patas) y el BAC del presupuesto/catÃ¡logo WBS; produce el RO oficial.
- **AutomatizaciÃ³n:** **nÃºcleo del mÃ³dulo RO/CR/F06 + EVM (useRO), ya vivo y automÃ¡tico.** CPI toma IP Meta/Presupuesto del catÃ¡logo WBS (fuente Ãºnica). Sin GAP de motor; sÃ³lo asegurar carga de las 4 fuentes.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ACERO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export crudo de almacÃ©n S10 por grupo (hoja `PARTIDACONTROLCONSULTA`). Insumo del F07 Registro AlmacÃ©n de febrero.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** columnas CÃ³digo | Recurso | Unidad | Cantidad Atendida | Valorizado (Principal) | Valorizado (Secuandaira) | Recurso N1. Grupo ACERO (varillas y acero dimensionado CyD por diÃ¡metro).
- **NÃºmeros clave:** Acero dim. 1" CyD 39.71 ton â†’ 123,015.93; 5/8" 31.13 ton â†’ 96,442.92; 1/2" 8.67 ton â†’ 26,809.94; 3/4" 5.19 ton â†’ 16,068.60; 3/8" 4.48 ton â†’ 13,870.02.
- **PropÃ³sito:** detalle de consumo de acero al 28.02.2026 (sustento del grupo 4. ACERO del Registro AlmacÃ©n).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 4. ACE del F07 ALMACEN feb â†’ pata AlmacÃ©n del AC en RO.
- **AutomatizaciÃ³n:** importador **AlmacÃ©n â†’ Â«Importar Registro S10Â»** (lÃ­neas MATERIALES al RO). Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CONCRETO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CONCRETO.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** mismas columnas; insumos de concreto (arena, cemento, premezclado, herramientas/equipos).
- **NÃºmeros clave:** Concreto premezclado f'c=350 CyD 259 m3 â†’ 94,685; f'c=350 04 142.50 m3 â†’ 56,715; f'c=280 4 m3 â†’ 2,020.
- **PropÃ³sito:** detalle de consumo de concreto al 28.02.2026 (grupo 3. CONCRETO).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 3. CON del F07 ALMACEN feb â†’ AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CR_AL_28.02.2026.png
- **Tipo / formato:** **.png** (imagen, no-Excel). Captura de la hoja CR del Registro de AlmacÃ©n al 28.02.2026.
- **PropÃ³sito:** respaldo visual/snapshot del control de almacÃ©n del mes (evidencia de cuadre).
- **Origen â†’ Destino:** screenshot del libro F07 ALMACEN â†’ archivo de sustento.
- **AutomatizaciÃ³n:** no importable como dato (imagen). La data real entra por el .xlsx F07. Sin acciÃ³n.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CURADO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CURADO.
- **Hojas (1):** PARTIDACONTROLCONSULTA (sÃ³lo 4 lÃ­neas).
- **Contenido:** ARENA FINA 2 m3 â†’ 194.92; MOCHILA FUMIGADORA 1 â†’ 144.07; PER MEMBRANA X 55 GLN 0.50 cil â†’ 120.
- **NÃºmeros clave:** total grupo CURADO = **458.99**.
- **PropÃ³sito:** consumo de curado al 28.02.2026 (grupo 5. CUR).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 5. CUR del F07 ALMACEN feb â†’ AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENCOFRADO_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo ENCOFRADO.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** adhesivo quÃ­mico HILTI RE500 (9 jgo â†’ 6,464.83), alambre NÂ°8 (9 rll â†’ 2,689.77), brocas, clavos, desmoldante, etc.
- **PropÃ³sito:** consumo de encofrado al 28.02.2026 (grupo 15. ENC).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 15. ENC del F07 ALMACEN feb â†’ AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\GG.GG._AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo Gastos Generales de obra.
- **Hojas (1):** PARTIDACONTROLCONSULTA (~86 lÃ­neas, EPP y consumibles).
- **Contenido:** botines de cuero (52 par â†’ 3,320.76), barbiquejos, bloqueador, botas PVC, baldes, aceite, etc. â€” EPP y suministros de seguridad/obra.
- **PropÃ³sito:** consumo de GG de obra al 28.02.2026 (alimenta grupo GG del Registro AlmacÃ©n, NO el GG de oficina).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja GG del F07 ALMACEN feb â†’ pata AlmacÃ©n/GG del AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\MT_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo MOVIMIENTO DE TIERRAS.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** barreta, boogie, cable vulcanizado, gasolina, manguera PVC, mennekes, pulpo enchufe, pico â€” herramientas/insumos de MT.
- **PropÃ³sito:** consumo de movimiento de tierras al 28.02.2026 (grupo 14. MT).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 14. MT del F07 ALMACEN feb â†’ AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\OP_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo OP (obras provisionales / campamento).
- **Hojas (1):** PARTIDACONTROLCONSULTA (~55 lÃ­neas).
- **Contenido:** acero, alambre, arena, bisagras, cable vulcanizado, cemento, etc. asociados a PROVISIONALES/CAMPAMENTO.
- **PropÃ³sito:** consumo de obras provisionales al 28.02.2026 (grupo 2. PRO).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 2. PRO del F07 ALMACEN feb â†’ AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\TP_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo TP (trabajos preliminares / topografÃ­a).
- **Hojas (1):** PARTIDACONTROLCONSULTA (6 lÃ­neas).
- **Contenido:** OCRE ROJO, PINTURA ESMALTE, TIRALINEAS, WINCHA, YESO.
- **NÃºmeros clave:** total grupo = **251.52**.
- **PropÃ³sito:** consumo de preliminares al 28.02.2026 (grupo 1. PRE).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 1. PRE del F07 ALMACEN feb â†’ AC en RO.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\V.ESTRUCTURAS_AL_28.02.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo VARIOS ESTRUCTURAS.
- **Hojas (1):** PARTIDACONTROLCONSULTA (8 lÃ­neas).
- **Contenido:** AE BENTOBAR 30 m â†’ 795.22; PRIMER BENTOBAR; amoladora; cincel; clavos; disco; **SC ALQUILER DE MARTILLOS DEMOLEDORES** (9 dÃ­a â†’ 526.27, Recurso N1 = SUBCONTRATOS Y SERVICIOS).
- **NÃºmeros clave:** total grupo = **2,159.63**.
- **PropÃ³sito:** consumo de varios estructuras al 28.02.2026 (grupo 6. VAR EST).
- **Origen â†’ Destino:** Kardex S10 â†’ hoja 6. VAR EST del F07 ALMACEN feb â†’ AC en RO. NÃ³tese lÃ­nea SUBCONTRATOS (no es MATERIALES; sÃ³lo MATERIALES alimenta RO).
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10 (filtra Recurso N1 = MATERIALES). Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Febrero.xls
- **Tipo / formato:** **.xls** (15.8 MB) â€” libro contable/tesorerÃ­a de GRAPCO (multi-empresa, multi-proyecto). NO es un formato GP-GCE.
- **Hojas (7):** Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen
- **Contenido:**
  - **Datos:** parÃ¡metros (RUC 20203071702, EMPRESA GRAPCO S.A.C., IGV 0.18, retenciÃ³n honorarios 0.08), catÃ¡logo de cuentas bancarias (BCP Soles 193-2080045-0-54 saldo inicial 92,839.39; BCP DÃ³lares; CrÃ©dito Soles Precotex; CrÃ©dito Soles Caja; NaciÃ³n). Total inicial 97,926.12.
  - **Ingresos_diario (~4,077 filas):** facturas/NC de venta (Numero, F_Emision, Documento, Tipo, Ingreso, Cliente, IGV, RUCâ€¦). Clientes: UVI TECH, **PRECOTEX S.A.C** (C002), COMPAÃ‘IA INDUSTRIAL ROMOSA, etc. HistÃ³rico desde 2022/2023.
  - **egresos_diario (~3,012 filas):** egresos por proveedor/concepto (Monto, IGV, DetracciÃ³n, RetenciÃ³n, Tipo_Cambio, Concepto). Cuentas Interbank/CrÃ©dito.
  - **gastos (~1,275 filas):** facturas/otros de gasto (Egreso, Rubro = Logistica/Renta_3era/Bancos/igv, Proveedor, SUNAT). Tributos y logÃ­stica.
  - **RRHH (~1,006 filas):** planilla y aportes (Essalud, ONP, Renta 5ta/4ta, AFP Habitat/Integra, Personal) vÃ­a INTERCONTACT SAC.
  - **Bancos (~25,709 filas):** movimientos bancarios (Banco, Moneda, N_Operacion, Cargo, Abono, Saldo, Observaciones). Filas CREDITEX: comisiones, cuota sindical SEM52 obra CREDITEX/PRECOTEX, detracciones, pagos a proveedores (GESTION MADERERA F001-26637).
  - **Almacen (~1,064 filas):** kardex de mercaderÃ­a antigua (libros/polos/kits) â€” data legacy del negocio editorial, no de obra.
- **NÃºmeros clave:** saldo inicial BCP Soles 92,839.39; total cuentas 97,926.12. Factura PRECOTEX E001-131 448,855.81 (con NC E001-20 que la anula). RRHH personal ene-23 38,344.44.
- **PropÃ³sito:** tesorerÃ­a y **flujo de caja** real de GRAPCO; fuente para conciliar ingresos/egresos/bancos y planilla.
- **Origen â†’ Destino:** sistema contable (estilo CONCAR) â†’ control de caja y, parcialmente, sustento del AC (pagos a subcontratistas/proveedores) y Control de Planilla.
- **AutomatizaciÃ³n:** **GAP grande.** GRAPCO no tiene mÃ³dulo de **Flujo de Caja** ni **Control de Planilla**. Es multi-empresa/multi-proyecto y legacy â†’ requiere filtrado por proyecto (CREDITEX) antes de ingerir. Candidato a nuevos mÃ³dulos: Flujo de Caja (hojas Bancos/Ingresos/egresos/gastos) y Control Planilla (hoja RRHH). **GAP: Flujo de Caja, Control Planilla.**

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL NÂ°06.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F07** (ValorizaciÃ³n de obra al cliente) â€” ValorizaciÃ³n NÂ°06, FEBRERO 2026 (periodo 16-28 feb). Rev NÂ°01. Incluye APUs nuevos en formato **GP-GCE-FOR-F01**.
- **Hojas (8):** CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- **Contenido:**
  - **CarÃ¡tula / 1. RESUMEN:** OBRA "PTAR PLANTA 5", CLIENTE CREDITEX, SUPERVISIÃ“N DISEÃ‘OS RACIONALES SAC, CONTRATISTA GRAPCO SAC, RESIDENTE ING. GUIDO GONZALES, plazo 130 D.C.
  - **2. PAGOS:** cronograma de pagos (GP-GCE-FOR-F07, pÃ¡g 1 de 5).
  - **3. RES.VAL:** resumen de valorizaciones; MONTO REFERENCIAL 2,866,414.72 (inc IGV) / 2,429,165.02 (no inc IGV); COSTO DIRECTO 1,713,447.90.
  - **4. VAL:** valorizaciÃ³n detallada por Ã­tem (UND, CANT, P.U., PARCIAL; ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL â€” con CANTIDAD/%/TOTAL). Presupuesto CONTRACTUAL (PTARI).
  - **5. APUs Nuevos / 6. APUs Nuevos.:** anÃ¡lisis de nuevos precios unitarios (GP-GCE-FOR-F01).
  - **5. RO:** vista RO de la valorizaciÃ³n por partida (Ppto F1 PTARI, ValorizaciÃ³n Quincenal, ValorizaciÃ³n Acumulada).
- **NÃºmeros clave:** Presupuesto referencial 2,739,001.11. Monto referencial 2,866,414.72 (inc) / 2,429,165.02 (no inc). Costo Directo 1,713,447.90. **5. RO:** TOTAL COSTO DE OBRA Ppto 2,166,977.07; Val quincenal 249,629.66; Val acumulada 1,570,455.13. Costo directo Ppto 1,713,447.90 / quincenal 197,384.38 / acum 1,241,772.74.
- **PropÃ³sito:** valorizaciÃ³n mensual de avance facturable **al cliente** (CREDITEX) â†’ ingreso/EV del proyecto; sustenta Val F1/F2 del RO.
- **Origen â†’ Destino:** metrados de avance Ã— P.U. del presupuesto contractual â†’ columna **Valorizado / Earn Value (EV)** del RO (Val F1, Val F2) y al cronograma de cobros.
- **AutomatizaciÃ³n:** mÃ³dulo **Valorizaciones (cliente)** + **Adicionales/Deductivos** (PQ-01/02) ya existentes; APUs nuevos migran a la plataforma de Costos aparte (APU saliÃ³ de GRAPCO). Importador genÃ©rico para 4. VAL / 5. RO. Bajo GAP (APUs nuevos = fuera de alcance GRAPCO).

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM17 .xlsx
- **Tipo / formato:** xlsx (4.3 MB) â€” **PRO-GCR-FOR-F01** (Informe Semanal de ProducciÃ³n / ISP). Es la fuente de **HH (tareos)** y de la productividad IP. Libro acumulado SEM01â†’SEM17.
- **Hojas (21):** PC | CR | Control HH | Control IP | ISP-SEM17 â€¦ ISP-SEM01 (17 semanas).
- **Contenido:**
  - **PC (Partidas Control):** catÃ¡logo de partidas de control con cÃ³digo (1001 TRABAJOS PRELIMINARES, SSO, alquiler andamios, seÃ±alizaciÃ³n, mitigaciÃ³n de polvo, limpieza, etc.) y unidad.
  - **CR:** consolidado por partida â€” HH, COSTO (= HH Ã— S/25), ACUM S/ IGV al 01.12.25. Costo MO prom: 25.
  - **Control HH:** comparativo semanal **HH PLANILLA (administraciÃ³n) vs HH CAMPO (tareo)**, ACUM, DELTA HH, HH META, HH VARIACIÃ“N y **CPI**; desglose de variaciÃ³n por grupo (PRE/PRO/CON/ACE/CUR/VAE/TAB/BIT/CONT/PRH/VAA/IIEEâ€¦). Total HH ~10,949 planilla / 10,933.50 campo.
  - **Control IP:** IP Contractual, IP Meta e IP real por partida y por semana (SEM01..SEM19) â€” productividad (HH/unidad).
  - **ISP-SEMxx (17 hojas):** una por semana con METRADO/HH/IP por dÃ­a (lun-dom) y por frente (PPTO OFERTA PTAR-F1, PPTO OFERTA NAVE-F2, ADICIONALES, TOTAL), PREVISION, ACUMULADO ANTERIOR, META, VAR, CPI. SEM17 = 23-29/02/2026; semanas tempranas rotuladas "PRECOT(EX)".
- **NÃºmeros clave:**
  - CR (al 01.12.25): TOTAL COSTO DE OBRA HH 10,933.50 / COSTO 194,437.50 / ACUM 273,337.50; COSTO DIRECTO HH 10,617.50 / 186,537.50.
  - SEM17: HH presente semana 1,200.50; META 746.04; VAR âˆ’454.46; CPI 0.62. Acumulado HH 10,933.50; META 8,497.55; VAR âˆ’2,435.95; CPI 0.78.
  - Serie CPI acumulado por semana: S1 0.46 Â· S2 0.56 Â· S3 0.68 Â· S4 0.69 Â· S5 0.73 Â· S6 0.75 Â· S7 0.74 â€¦ (mejora progresiva).
- **PropÃ³sito:** medir productividad (IP real vs meta) y cuantificar el costo real de **mano de obra** (HH Ã— S/25.5) â€” pata Tareos del AC; insumo del SPI/CPI del RO.
- **Origen â†’ Destino:** tareos de campo (F13) + planilla â†’ CONTROL TAREOS del CR del RO y columna "ANALISIS DE DATA DEL ISP" del RO.
- **AutomatizaciÃ³n:** mÃ³dulo **ISP (tareos HH Ã— S/25.5)** existente; tareos desde Registros_Campo (fuente Ãºnica F13). El comparativo HH planilla vs campo (Control HH) toca **Control Planilla** (GAP). El cuerpo IP/HH del ISP es ingerible. **GAP parcial: cruce con Control Planilla.**

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.02.28.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F07** (Registro de AlmacÃ©n, corte 28.02.2026, acumulado).
- **Hojas (18):** CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG (idÃ©ntica estructura al de enero).
- **Contenido:** mismo esquema CR/Analisis/Data + 1 hoja por grupo. SEMANA 17. La hoja Analisis trae columnas CONTROL y DELTA para cuadre. Hojas vacÃ­as/en 0: 7. TAB, 8. BIT, 10. PRH, 11. VAR ARQ, 12. IIEE, 13. IISS.
- **NÃºmeros clave (ACUM al 28.02.2026, S/ sin IGV):**
  - TOTAL COSTO DE OBRA 708,373.07 (mensual feb 175,869.08; ACUM previo 31.01 = 532,503.99)
  - COSTO DIRECTO 669,822.93
  - Por grupo: PROVISIONAL 50,414.97 Â· CONCRETO 244,701.73 Â· ACERO 285,342.76 Â· CURADO 458.99 Â· VARIOS EST 2,159.63 Â· MOV TIERRA 28,839.46 Â· ENCOFRADO 27,240.02 Â· GASTOS GENERALES 68,963.99 Â· PRELIMINAR 251.52
- **PropÃ³sito:** costo real acumulado de materiales a feb (pata AlmacÃ©n del AC).
- **Origen â†’ Destino:** Kardex S10 (consolidado de los exports por grupo arriba) â†’ AC en RO feb.
- **AutomatizaciÃ³n:** importador **AlmacÃ©n â†’ Â«Importar Registro S10Â»** (acumulado, calcula deltas; sÃ³lo MATERIALES al RO). Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.02.28.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F07** (Registro de Facturas / valorizaciÃ³n de subcontratistas, corte 28.02.2026).
- **Hojas (6):** RESUMEN | CR | 1. PRE | 14. MT | 13. IISS | 15. ENC
- **Contenido:**
  - **RESUMEN:** por rubro/proveedor; aparece **EFCO (ENC) 32,150 / IGV 5,787 / 37,937**; AMSA, RECOSA, etc.
  - **CR:** por partida WBS, ACUM 31.01.26, MENSUAL feb, ACUM 28.02.26.
  - **1. PRE / 14. MT / 13. IISS / 15. ENC:** "CUADRO RESUMEN DE VALORIZACIONES" por subcontrato. PRE: **AMSA** "ALQUILER DE EQUIPOS / SUBCONTRATO DE ANDAMIOS" VAL1 4,628.75 (PAGADO SI). IISS: **RECOSA** VAL1 979 (PAGADO SI). ENC: **EFCO** 32,150 (PAGADO NO). MT: R PROYECTOS (igual a enero).
- **NÃºmeros clave (S/ sin IGV):** TOTAL COSTO DE OBRA ACUM 28.02.26 = 131,318.82 (mensual feb 37,757.75; ACUM 31.01 = 93,561.07). PRE/TRABAJOS PRELIMINARES mensual 4,628.75. ENC EFCO 32,150 (con IGV 37,937).
- **PropÃ³sito:** costo real de subcontratos/facturas a feb (pata Facturas del AC) y seguimiento de valorizaciones de subcontratistas (pagado/por pagar).
- **Origen â†’ Destino:** facturas proveedores/subcontratistas â†’ AC del RO feb (REGISTRO FACTURAS).
- **AutomatizaciÃ³n:** CR ingerible por importador genÃ©rico a la pata Facturas. **GAP: ValorizaciÃ³n de Subcontratistas (F10/F11)** para el detalle de las hojas por subcontrato.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO GG OFICINA_acumulado_28_02_2026.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F07** (GG de Oficina, acumulado, corte 28.02.2026).
- **Hojas (1):** REG. GG OFICINA_30.04
- **Contenido:** misma matriz mensual ACUM+MENSUAL desde 31.12.24, ahora extendida con columna 28.02.26. Partidas de obra en 0; serie de TOTAL COSTO DE OBRA acumulado mes a mes.
- **NÃºmeros clave:** misma serie histÃ³rica que enero (100,747.75 ene-25 â€¦ 973,303.46 nov-25 â€¦) con corte adicional al 28.02.26.
- **PropÃ³sito:** costo real de GG de oficina acumulado a feb.
- **Origen â†’ Destino:** contabilidad de oficina â†’ GASTOS GENERALES del CR del RO feb.
- **AutomatizaciÃ³n:** importador genÃ©rico (acumulado â†’ delta) â†’ pata GG del AC. Bajo GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.02 RO_FEB CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.02.28.xlsx
- **Tipo / formato:** xlsx â€” **GP-GCE-FOR-F06** (Resultado Operativo, corte 28.02.2026). Rev 1.
- **Hojas (6):** RO | CR | Adicionales | Deductivos | **DASH** | GG (vs enero: cambia "Leyenda" por **DASH**).
- **Contenido:**
  - **RO:** misma matriz EVM por frente/partida; encabezado SEMANA 17, % avance 0.72; columnas de cruce con Registro AlmacÃ©n e ISP.
  - **CR:** 4 patas del AC consolidadas + HH F1/F2 + GG oficina. Costo MO prom 25.
  - **Adicionales / Deductivos:** PQ-01/02 (en feb siguen en 0).
  - **DASH:** tablero del RO (Margen 1.01 / 1.16; tabla PARTIDAS Â· CV Â· VAC). Vista resumen para lectura tipo dashboard.
  - **GG:** AnÃ¡lisis de GG (mismos GG Variables 687,204.96 / Fijos 55,779.20 / Utilidad 11%, con #REF!).
- **NÃºmeros clave:** % avance 0.72 (SEM17). CR TOTAL REGISTRO 1,282,867.10 (FACTURAS 131,318.82 + ALMACEN 708,373.07 + TAREOS 273,337.50 + GG 169,837.71). HH Total 10,933.50 (F1 10,933.50, F2 0). Margen DASH 1.01 / 1.16.
- **PropÃ³sito:** RO oficial de febrero â€” EVM, consolidaciÃ³n del AC, dashboard de mÃ¡rgenes y proyecciÃ³n.
- **Origen â†’ Destino:** consume las 4 patas (AlmacÃ©n feb, Facturas feb, ISP/tareos, GG oficina feb) + BAC; produce RO y DASH.
- **AutomatizaciÃ³n:** mÃ³dulo **RO/CR/F06 + EVM (useRO)** + el DASH mapea a **Dashboard RO** ya desplegado. Sin GAP de motor.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ACERO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo ACERO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** acero corrugado y dimensionado CyD por diÃ¡metro (acumulado mar).
- **NÃºmeros clave:** Acero dim. 1" 39.71 ton â†’ 123,015.93; 1/2" 9.69 ton â†’ 29,998.70; 3/4" 5.19 ton â†’ 16,068.60.
- **PropÃ³sito:** consumo de acero al 28.03.2026 (sustento grupo 4. ACERO del F07 ALMACEN marzo, aÃºn en sustento).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CONCRETO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CONCRETO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** arena, cemento, premezclado, herramientas/equipos de concreto (acumulado mar).
- **PropÃ³sito:** consumo de concreto al 28.03.2026 (grupo 3. CONCRETO).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CR_AL_28.03.2026.png
- **Tipo / formato:** **.png** (imagen, no-Excel). Captura de la hoja CR del Registro de AlmacÃ©n al 28.03.2026.
- **PropÃ³sito:** snapshot/evidencia de cuadre del control de almacÃ©n de marzo.
- **Origen â†’ Destino:** screenshot del F07 ALMACEN mar â†’ sustento.
- **AutomatizaciÃ³n:** no importable (imagen); la data entra por los .xlsx. Sin acciÃ³n.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CURADO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo CURADO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** insumos de curado (arena fina, mochila fumigadora, per membrana).
- **PropÃ³sito:** consumo de curado al 28.03.2026 (grupo 5. CUR).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENCOFRADO_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo ENCOFRADO, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** adhesivo HILTI, alambre, brocas, clavos, desmoldante, etc. (acumulado mar).
- **PropÃ³sito:** consumo de encofrado al 28.03.2026 (grupo 15. ENC).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\GG.GG._AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo GG de obra, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** EPP y consumibles de obra (botines, barbiquejos, botas, baldes, aceiteâ€¦).
- **PropÃ³sito:** consumo de GG de obra al 28.03.2026 (grupo GG del Registro AlmacÃ©n).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\II.SS._AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo IISS (instalaciones sanitarias), corte 28.03.2026. **Nuevo grupo que aparece en marzo (no estaba en feb).**
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** materiales de instalaciones sanitarias (columnas estÃ¡ndar CÃ³digo/Recurso/Unidad/Cantidad/Valorizado).
- **PropÃ³sito:** consumo de IISS al 28.03.2026 (grupo 13. IISS).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\MT_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo MOVIMIENTO DE TIERRAS, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** herramientas/insumos de MT (barreta, boogie, cable, gasolina, manguera, picoâ€¦).
- **PropÃ³sito:** consumo de MT al 28.03.2026 (grupo 14. MT).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\OP_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo OP (obras provisionales/campamento), corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** materiales de provisionales/campamento (acumulado mar).
- **PropÃ³sito:** consumo de obras provisionales al 28.03.2026 (grupo 2. PRO).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10. Sin GAP.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\TP_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo TP (trabajos preliminares/topografÃ­a), corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA (8 lÃ­neas).
- **Contenido:** OCRE ROJO, PINTURA ESMALTE, PINTURA SPRAY, **SC ALQUILER DE GRUA TELESCOPICA** (141.50 hm â†’ 38,205, Recurso N1 = SUBCONTRATOS Y SERVICIOS), TIRALINEAS, WINCHA, YESO.
- **NÃºmeros clave:** total grupo = **38,470.52** (dominado por el alquiler de grÃºa telescÃ³pica 38,205).
- **PropÃ³sito:** consumo/servicios de preliminares al 28.03.2026 (grupo 1. PRE).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo. La grÃºa es SUBCONTRATO (no MATERIALES; sÃ³lo MATERIALES alimenta el RO por AlmacÃ©n).
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10 (filtra MATERIALES). El servicio de grÃºa deberÃ­a ir por Facturas/Subcontratos. Sin GAP nuevo.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\V.ESTRUCTURAS_AL_28.03.2026.XLSX
- **Tipo / formato:** xlsx â€” export S10 por grupo (`PARTIDACONTROLCONSULTA`). Grupo VARIOS ESTRUCTURAS, corte 28.03.2026.
- **Hojas (1):** PARTIDACONTROLCONSULTA (9 lÃ­neas).
- **Contenido:** AE BENTOBAR 440 m â†’ 11,455.22; PRIMER BENTOBAR (gal y l); amoladora; cincel; clavos; disco; **SC ALQUILER DE MARTILLOS DEMOLEDORES** 9 dÃ­a â†’ 526.27 (SUBCONTRATOS Y SERVICIOS).
- **NÃºmeros clave:** total grupo = **13,495.89** (BENTOBAR sube fuerte vs feb: 440 m vs 30 m).
- **PropÃ³sito:** consumo de varios estructuras al 28.03.2026 (grupo 6. VAR EST).
- **Origen â†’ Destino:** Kardex S10 â†’ F07 ALMACEN mar â†’ AC del RO marzo.
- **AutomatizaciÃ³n:** importador AlmacÃ©n S10 (filtra MATERIALES). Sin GAP nuevo.

---

## Notas transversales del chunk
- PatrÃ³n claro de **fuentes del AC**: F07 ALMACEN (materiales) + F07 FACTURAS (subcontratos) + ISP/tareos (MO HHÃ—25) + F07 GG OFICINA â†’ consolidados en el **F06 RO** (CR) por partida WBS (FA01, Ã­tems 1..15 + GG) y por frente F1 (PTARI) / F2 (Nave).
- Los exports `*_AL_28.xx.XLSX` (hoja `PARTIDACONTROLCONSULTA`) son el **insumo crudo S10** que se consolida en el F07 ALMACEN del mes; F2 (Nave) sigue en 0 HH (sin tareo) en ene/feb.
- **EVM oficial:** ene CPI/avance 0.51; feb avance 0.72, mÃ¡rgenes DASH 1.01/1.16; CPI de MO (ISP) acumulado feb 0.78 (mejora desde 0.46 en S1).
- **GAPs confirmados:** Flujo de Caja y Control de Planilla (libro Bancos .xls) y ValorizaciÃ³n de Subcontratistas F10/F11 (hojas por subcontrato del F07 FACTURAS).



---

# CatÃ¡logo de Costos â€” CategorÃ­a 4. RE-RO (parte 3)

Proyecto: CREDITEX (PTARI Planta 5 + Nave). Periodo principal: RO de MARZO 2026 (cierre 28/03/2026, semana 21) y arranque del RO de ABRIL 2026.
Fuente: volcado real de Excel (`scripts/_costos_catalog/cat_4_RE_RO__p3.txt`).

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Marzo.xls
- **Tipo / formato:** xls (libro contable/tesorerÃ­a de GRAPCO S.A.C., no es un formato GP-GCE-FOR). Archivo grande (~15.8 MB).
- **Hojas (7):** Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen
- **Contenido:**
  - **Datos:** parÃ¡metros de la empresa y plan de cuentas bancarias. Fecha declaraciÃ³n (Mar 2023), RUC 20203071702 (GRAPCO S.A.C.), tasa retenciÃ³n honorarios 0.08, IGV 0.18, mes declarado 3. CatÃ¡logo de cuentas: Credito_Soles (104101, cta 193-2080045-0-54, monto inicial 92,839.39), Credito_Dolares (104102, cta 193-2186429-1-49, 25.75 USD a TC 3.37), Credito_Soles_Precotex (193-2495622-0-01, 2,000), Credito_Soles_Caja (193-9620930-0-09, 3,000), Nacion (104201, cta 00-048-099459). Total inicial bancos 97,926.12. (+355 filas).
  - **Ingresos_diario:** registro de ventas/facturaciÃ³n. Campos: Numero, flgPDT, F_Cargo, F_Emision, Documento, Tipo (Factura/Nota_Credito), Ingreso, Cliente, Cod_Cliente, Producto, Empresa, IGV, Detraccion, TC, Mes, RUC, etc. Clientes: UVI TECH PERU, PRECOTEX, CIA INDUSTRIAL ROMOSA. (+4075 filas).
  - **egresos_diario:** compras/egresos. Campos: Numero, Tipo (Doc_Extranjero, etc.), Monto, Producto, IGV, Detraccion, Retencion, Importacion, Proveedor, Concepto, cuenta banco, Tipo_Ventas. Proveedores ej. Facebook, Robbins Research. (+3002 filas).
  - **gastos:** gastos por rubro (Logistica, Renta_3era, Bancos, igv). Campos: Numero, Tipo, Egreso, Rubro, Proveedor (SUNAT, bancos, CTAS POR PAGAR ACCIONISTAS), IGV, Concepto, cuenta. (+1265 filas).
  - **RRHH:** obligaciones laborales/planilla. Campos: Numero, Documento, Monto, Concepto (Essalud, ONP, Renta_5ta, Renta_4ta, Habitat, Integra, Personal), Empresa (INTERCONTACT SAC), Retencion, Cod_Cta, Personal, Banco. (+996 filas).
  - **Bancos:** extracto/movimientos bancarios al detalle. Campos: Numero, Banco (Credito_soles, Credito_soles_Creditex), Moneda, fecha, Tipo (Transferencia), Cliente/beneficiario, Cargo, Abono, Saldo, Observaciones. Ej. comisiones bancarias, cuota sindical SEM 52 obra CREDITEX (150) y obra PRECOTEX (480), detracciones, compra dÃ³lares, pago a GESTION MADERERA SAC (F001-26637, 1,546.70). (+25,699 filas).
  - **Almacen:** kardex de existencias (mercaderÃ­a: Polos, Libros, Kits). Campos: Numero, Tipo, Producto, Cod_Producto, Unidades, Precio Uni, Razon Social, T_Operacion (Compra/Venta), Monto_Egreso/Ingreso. (+1054 filas). Datos antiguos (2020), parece data heredada del giro editorial de GRAPCO, no de la obra.
- **NÃºmeros clave:** Total inicial cuentas bancarias 97,926.12; saldo cta CrÃ©dito Soles tras movimientos enero 2026 ~92,711.92.
- **PropÃ³sito:** contabilidad/tesorerÃ­a integral de GRAPCO S.A.C. (toda la empresa, no solo la obra). Sustento financiero del RO (flujo de caja real, pagos a proveedores, planilla). Es la fuente de "caja banco" del proyecto.
- **Origen -> Destino:** sale del sistema contable de la empresa (registro diario manual). Alimenta el control financiero corporativo y, parcialmente, el sustento del RO de obra (cuotas sindicales, pagos a subcontratistas/proveedores identificados "OBRA CREDITEX").
- **AutomatizaciÃ³n:** GAP â€” Flujo de Caja no existe en GRAPCO. Es data corporativa multi-empresa/multi-proyecto, NO migrar entera. Ãštil filtrar movimientos etiquetados "CREDITEX/obra" para un futuro mÃ³dulo Flujo de Caja. Por ahora fuera de alcance del importador genÃ©rico (estructura contable, no de obra).

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_VAL NÂ°08.xlsx
- **Tipo / formato:** xlsx â€” ValorizaciÃ³n de obra. CÃ³digo del formato visible: **GP-GCE-FOR-F07** (carÃ¡tula de pagos/resumen) y **GP-GCE-FOR-F01** (APUs nuevos). Nota: el nombre del archivo usa "F07" pero internamente combina F07 (valorizaciÃ³n) y F01 (APU).
- **Hojas (8):** CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- **Contenido:**
  - **CarÃ¡tula:** "PTAR PLANTA 5", AV. LOS HORNOS 185 ATE, VALORIZACIÃ“N NÂ°08, Rev NÂ°01, Mes Marzo 2026 (periodo 16 al 31).
  - **1. RESUMEN:** datos del contrato. Obra "PTAR PLANTA 5", Cliente CREDITEX, SupervisiÃ³n DISEÃ‘OS RACIONALES SAC, Contratista GRAPCO SAC, Residente ING. GUIDO GONZALES, Presupuesto referencial 2,798,359.65, plazo 130 D.C.
  - **2. PAGOS:** cronograma de pagos (GP-GCE-FOR-F07 v0, pÃ¡g 1 de 5). ValorizaciÃ³n NÂ°8, periodo Marzo (16-31).
  - **3. RES.VAL:** resumen de valorizaciones. Monto referencial 2,866,414.72 (inc. IGV) / 2,429,165.02 (no inc. IGV); Costo Directo 1,750,581.07.
  - **4. VAL:** detalle de valorizaciÃ³n por partida. Columnas: ITEM, DESCRIPCIÃ“N, PRESUPUESTO (Und/Cant/P.U./Parcial), ACUMULADO ANTERIOR (Cant/%/Total), ACTUAL, ACUMULADO, SALDO REFERENCIAL. (+232 filas). Presupuesto = CONTRACTUAL (PTARI), plazo 130 dÃ­as.
  - **5. APUs Nuevos / 6. APUs Nuevos.:** anÃ¡lisis de nuevos precios unitarios (GP-GCE-FOR-F01 v0). (+41 y +221 filas).
  - **5. RO:** vista RO de la valorizaciÃ³n. Columnas Ppto F1 (PTARI), ValorizaciÃ³n Quincenal, ValorizaciÃ³n Acumulada. TOTAL COSTO DE OBRA 2,213,938.94 / quincenal 150,353.90 / acum 1,946,915.19. COSTO DIRECTO 1,750,581.07 / 118,886.16 / 1,539,443.03. Por partida con frente (PRE1, FA01, 1.01 SEGURIDAD Y SALUD OCUPACIONAL 43,225.26 / 6,763.60 / 34,967.15). (+64 filas).
- **NÃºmeros clave:** Ppto referencial 2,798,359.65; monto referencial 2,866,414.72 c/IGV (2,429,165.02 s/IGV); Costo Directo 1,750,581.07; Total costo de obra 2,213,938.94; valorizaciÃ³n quincenal 150,353.90; valorizaciÃ³n acumulada 1,946,915.19.
- **PropÃ³sito:** ValorizaciÃ³n quincenal NÂ°08 de Marzo presentada al cliente CREDITEX (avance ejecutado y a cobrar). Es la "pata" de ingreso valorizado del RO (PV/EV lado cliente).
- **Origen -> Destino:** sale de los metrados de avance vs presupuesto contractual + APUs nuevos aprobados; alimenta el RO (hoja 5. RO) y el cobro al cliente.
- **AutomatizaciÃ³n:** mÃ³dulo **Valorizaciones (cliente)** de GRAPCO. La hoja 4. VAL (partida/cant/%/acumulado) y 5. RO mapean a Valorizaciones y al RO (Valorizado/EV). APUs nuevos â†’ Adicionales/Deductivos o catÃ¡logo APU (recordar: APU saliÃ³ a plataforma de Costos aparte; aquÃ­ solo entra el resultado valorizado). Ingestible por importador genÃ©rico in-app.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\4. ISP\1. Superado\Copia de PRO-GCR-FOR-F01_ISP CREDITEX SEM21.xlsx
- **Tipo / formato:** xlsx â€” Informe Semanal de ProducciÃ³n (ISP). CÃ³digo **PRO-GCR-FOR-F01**. ~5.3 MB. (VersiÃ³n "Superado"/anterior antes del cierre RO).
- **Hojas (25):** PC | CR | CHH | CIP | ISP-SEM21 â€¦ ISP-SEM01 (21 semanas + 4 hojas de control).
- **Contenido:**
  - **PC (Partidas Control):** catÃ¡logo de partidas de control con cÃ³digo (1 TRABAJOS PRELIMINARES = 1001) y unidad (GLB, MES). (+60 filas).
  - **CR (Control Reporte tareos):** costo MO promedio **25.50**, Semana 21 (23-29/03/2026). Por frente/partida: HH, COSTO, ACUM s/IGV. TOTAL COSTO DE OBRA 15,171.50 HH / 276,815.25 / 386,873.25; COSTO DIRECTO 14,740.50 / 265,824.75 / 375,882.75; TRABAJOS PRELIMINARES 3,568.75 HH. (+62 filas).
  - **CHH (Control HH variaciones):** comparativo HH AdministraciÃ³n (planilla) vs Campo vs Meta por semana. Columnas: HH PLANILLA, HH CAMPO, CONTROL HH CAMPO ACUM, DELTA HH, HH META ACUM, HH VARIACIÃ“N, **CPI**, y desglose por partida (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). Ej. SEM1 CPI 0.46 â†’ SEM6 CPI 0.75 (mejora progresiva). HH planilla total 15,187 vs HH campo 15,171.50 (delta 16). (+25 filas).
  - **CIP (Control de IP):** IP Contractual vs IP Meta vs IP Actual Acum (SEM21-23) y DELTA por partida. Detecta sobreconsumo (ej. SEÃ‘ALIZACION TEMPORAL: IP meta 90 vs real 178.93 â†’ delta -82.93 "ACTUALIZAR APU REAL"). (+218 filas).
  - **ISP-SEM01..21:** una hoja por semana. Columnas: CODIGO, PARTIDA DE CONTROL, UND, bloques PREVISION (PPTO OFERTA PTAR-F1 / NAVE-F2 / ADICIONALES / TOTAL / META), ACUMULADO ANTERIOR, META/VAR/CPI, dÃ­as LUNES-DOMINGO (METRADO/HH/IP cada uno), PRESENTE SEMANA, META/VAR, ACUMULADO ACTUAL, FORECAST. Cada fila = partida con metrado, HH y IP (Ã­ndice de productividad).
- **NÃºmeros clave (SEM21):** PPTO CONTRACTUAL (1) 17,525.91 HH; PPTO META (2) 17,069.47; ACUMULADO ANTERIOR 14,031.50; HH presente semana 1,140 (meta 535.51, VAR -604.49, CPI semana 0.47); CPI acumulado 0.73; control 15,171.50. EvoluciÃ³n CPI acumulado: SEM2 0.46 â†’ SEM5 0.73 â†’ SEM10 0.84 â†’ SEM15 0.87 â†’ SEM21 0.73.
- **PropÃ³sito:** medir productividad real (HH ejecutadas vs HH meta por metrado) semana a semana; fuente del costo de mano de obra del RO y del CPI/EVM de HH.
- **Origen -> Destino:** sale de los tareos diarios de campo (HH x partida) y metrados; alimenta el CR (costo MO), el CHH/CIP y, vÃ­a costo HH x 25.50, el RO (Actual Cost mano de obra) y la Curva S.
- **AutomatizaciÃ³n:** mÃ³dulo **ISP (tareos HH x S/25.5)** + RO/EVM de GRAPCO. Cada hoja ISP-SEMxx es ingestible por el importador genÃ©rico; PC = catÃ¡logo partidas de control; CR/CHH/CIP alimentan CPI y control de HH. NOTA de memoria: "pendiente ISP_Semanal y frentes F1/F2" â€” este archivo es exactamente esa fuente.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM21_RO.xlsx
- **Tipo / formato:** xlsx â€” ISP cÃ³digo **PRO-GCR-FOR-F01**, versiÃ³n final usada para el RO (sufijo _RO). Estructura idÃ©ntica al archivo anterior (mismas 25 hojas). ~5.3 MB.
- **Hojas (25):** PC | CR | CHH | CIP | ISP-SEM21 â€¦ ISP-SEM01.
- **Contenido:** igual estructura que la "Copia ...Superado" (PC, CR con costo MO 25.50, CHH, CIP, 21 hojas ISP semanales). Diferencias vs la versiÃ³n Superado: la SEM21 muestra valores de control recalculados â€” CONTROL 17,462.16 (vs 17,525.91), PPTO CONTRACTUAL (1) 17,462.16, ACUMULADO ANTERIOR 14,355.12, DELTA(1)-(2) 3,107.03, presente semana HH 1,140 vs meta 435.32 (VAR -704.68, CPI 0.38), acumulado actual 11,441.09 (VAR -3,730.41, CPI 0.75). CR: TOTAL COSTO DE OBRA 15,171.50 HH / 276,815.25 / 386,873.25 (idÃ©ntico).
- **NÃºmeros clave:** CPI acumulado SEM21 = 0.75; HH control 15,171.50; costo MO acumulado 386,873.25; CD 375,882.75.
- **PropÃ³sito:** versiÃ³n "oficial RO" del ISP â€” la que cuadra con el F06 (RO) del cierre de marzo. Provee el Actual Cost de mano de obra y el CPI de HH del RO.
- **Origen -> Destino:** mismos tareos de campo, ajustados/conciliados para el cierre del RO de marzo; alimenta directamente la hoja CR y la columna "ANALISIS DE DATA DEL ISP" del F06 RO.
- **AutomatizaciÃ³n:** mÃ³dulo **ISP + RO/EVM**. Mismo mapeo que el archivo anterior; Ã©ste es el que debe priorizarse para la ingesta (es el conciliado con el RO). Posible duplicidad: GRAPCO solo necesita un ISP por semana â€” al ingerir, usar la versiÃ³n _RO y descartar la "Superado".

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.03.28.xlsx
- **Tipo / formato:** xlsx â€” Registro de AlmacÃ©n. CÃ³digo **GP-GCE-FOR-F07** (aquÃ­ en su variante "REGISTRO ALMACEN", maestro acumulado al 28/03/2026). ~406 KB.
- **Hojas (18):** CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 15. ENC | 13. IISS | 14. MT | GG
- **Contenido:**
  - **CR:** resumen por partida y por tipo-existencia. Columnas ACUM s/IGV (28.02 anterior y 31.03 actual) + MENSUAL + 16 columnas por categorÃ­a de existencia (PRELIMINAR, PROVISIONAL, CONCRETO, ACERO, CURADO, VARIOS EST, TABIQUERIA, BITUMEN, PRUEBA HIDR, VAR ARQ, IIEE, IISS, MOV TIERRA, ENCOFRADO, GASTOS GENERALES). Semana 17, nota "ANALIZAR LA DATA / REALIZAR ADECUADO FASEO". (+56 filas).
  - **Analisis:** detalle de costos por partida WBS (PARCIAL/TOTAL S/) + CONTROL y DELTA. (+109 filas).
  - **Data:** consumo valorizado a nivel recurso (la fuente atÃ³mica). Columnas: CÃ³digo, Recurso, Unidad, Cantidad Atendida, Costo, Valorizado (Secundaria), Recurso N1 (MATERIALES / SUBCONTRATOS Y SERVICIOS), COMENTARIO 1 (categorÃ­a obra), COMENTARIO 2 (sub-partida). Ej. OCRE ROJO, PINTURA, SC ALQUILER GRUA TELESCOPICA (hm 141.50 = 38,205), ACERO CORRUGADO. Total 863,120.49. (+273 filas).
  - **Hojas por categorÃ­a (1.PRE..GG):** misma plantilla doble (REGISTRO DE ALMACEN izquierda con totales por partida WBS + ANALISIS-DETALLE con el listado de recursos a la derecha). Cada una filtra Data por su categorÃ­a.
- **NÃºmeros clave (acum 31.03.2026):** TOTAL COSTO DE OBRA 936,317.23 (CR) / 863,120.49 (Analisis-Data); COSTO DIRECTO 884,128.84. Por categorÃ­a: PRE 38,470.52 (mensual 27,655.02); PRO 63,142.09; **CONCRETO 384,200.95**; **ACERO 297,138.70**; CURADO 563.99; VAR EST 13,495.89; TAB 0; BIT 0; PRH 0; VAR ARQ 0; IIEE 0; IISS 2,485; MOV TIERRA 29,389.46; ENCOFRADO 22,743.16; GASTOS GENERALES 84,687.47 (CD 32,992.08). Mensual total 227,944.16.
- **PropÃ³sito:** kardex/consumo de almacÃ©n valorizado (materiales + subcontratos/servicios) por partida y categorÃ­a â€” es la "pata" de costo real de materiales del RO. Maestro ACUMULADO (subir cadena completa, se calculan deltas).
- **Origen -> Destino:** sale del sistema S10 de almacÃ©n (atenciones/salidas valorizadas); alimenta el F06 RO (columna "ANALISIS DE DATA DE REGISTRO DE ALMACEN" â†’ Actual Cost materiales) y el CR.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Kardex S10)** â†’ "Importar Registro S10". Conforme a memoria: maestros F07 son ACUMULADOS, solo lÃ­neas MATERIALES alimentan el RO (aquÃ­ tambiÃ©n hay SUBCONTRATOS Y SERVICIOS, separar). Hoja **Data** es la fuente atÃ³mica ideal para el importador.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.03.31.xlsx
- **Tipo / formato:** xlsx â€” Registro de Facturas de subcontratistas. CÃ³digo **GP-GCE-FOR-F07** (variante "REGISTRO FACTURAS"). Incluye cuadros de valorizaciÃ³n de subcontratos (similares a F10/F11). ~276 KB.
- **Hojas (7):** RESUMEN | CR | 1. PRE | 13. IISS | 14. MT | 15. ENC | 17. IMP
- **Contenido:**
  - **RESUMEN:** por partida y proveedor: MONTO SIN IGV / IGV / MONTO CON IGV. PRE-AMSA 9,257.50 / 1,666.35 / 10,923.85; IISS-RECOSA 979 / 176.22 / 1,155.22; MT (CONSTRUCTORA TINOZ, RJ&H, CONSORCIO SA&ES) 0; ENC-EFCO 22,501.14 / 4,050.21 / 26,551.35; ENC-NOPIN 5,147.06 / 926.47 / 6,073.53; IIEE-SOLCONER #N/A. (+2 filas).
  - **CR:** registro de facturas por partida WBS (ACUM s/IGV 28.02 + MENSUAL + 31.03). TOTAL COSTO DE OBRA 131,318.82 / 32,177 / 163,495.82. TRABAJOS PRELIMINARES 4,628.75 â†’ 9,257.50. (+54 filas).
  - **Hojas por partida (1.PRE, 13.IISS, 14.MT, 15.ENC, 17.IMP):** "CUADRO RESUMEN DE VALORIZACIONES" por subcontratista. Datos: PROYECTO (AMPLIACIÃ“N PRECOTEX LAS MORERAS), CLIENTE GRAPCO, SUPERVISOR HIGASHI, subcontratista, RUC, servicio, MONTO CONTRACTUAL (inc/no IGV), MONTO FACTURADO, AMORTIZACION, DEDUCCION, SALDO POR DEDUCIR, y listado de facturas (FACTURA, SUBCONTRATISTA, VAL, DESCRIPCION, MONTO SIN/CON IGV, PAGADO SI/NO, FECHA).
- **NÃºmeros clave:** Total registro facturas acum 163,495.82 (mensual 32,177). Subcontratos contractuales: PRE/AMSA 9,257.50; IISS/RECOSA contractual 55,729.70 (facturado acum 979; saldo 12,822... cuadro reusado); MT/R PROYECTOS contractual 90,611.28, facturado acum 93,561.07 (val1 44,592.48 + val2 46,018.79 + AD 2,949.80); ENC contractual 55,729.70, acum 59,698.25 (EFCO/CORI/NOPIN); IMP/SURE contractual 146,792.67, facturado 29,358.54 (adelanto), saldo 117,434.
- **PropÃ³sito:** controlar facturas y valorizaciones de subcontratistas (encofrado, mov. tierras, IISS, impermeabilizaciÃ³n); es la "pata" de costo real por facturas/subcontratos del RO.
- **Origen -> Destino:** sale de las facturas emitidas por subcontratistas y sus valorizaciones; alimenta el F06 RO (columna "REGISTRO FACTURAS" â†’ Actual Cost subcontratos) y el control de pagos/amortizaciones.
- **AutomatizaciÃ³n:** mÃ³dulo **RO (pata de facturas)** para el resumen; los cuadros por subcontratista corresponden a **ValorizaciÃ³n de Subcontratistas (F10/F11) â€” GAP conocido** en GRAPCO. Recomendado: importar la hoja CR/RESUMEN al RO ya, y desarrollar el mÃ³dulo de ValorizaciÃ³n de Subcontratistas para las hojas 1.PRE/13.IISS/14.MT/15.ENC/17.IMP (amortizaciÃ³n, deducciÃ³n, saldo por deducir).

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.03 RO_MAR CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.03.28.xlsx
- **Tipo / formato:** xlsx â€” **Resultado Operativo (RO)**. CÃ³digo **GP-GCE-FOR-F06**. El documento central de la categorÃ­a. ~647 KB. Cierre 28/03/2026, semana 21.
- **Hojas (6):** RO | CR | Adicionales | Deductivos | DASH | GG
- **Contenido:**
  - **RO:** matriz EVM por frente/partida. Columnas: Presupuesto (Ppto F1 PTARI, Ppto F2 Nave, Deductivos PQ-01/02, Adicionales PQ-01/02, **Ppto Total BAC**), Avance Programado (PV F1, PV F2, PV Deductivos, PV Adicionales, **Plan Value PV**), Valorizado (Val F1, Val F2, Val Deduct, Val Adic, **Earn Value EV**), **Costo (Actual Cost AC)**, Margen (CV), CPI, Saldo teÃ³rico/costo por ejecutar, Estimado al tÃ©rmino (Costo Total EAC, Margen VAC, CPI), VariaciÃ³n del Cronograma (SPI), columnas de "ANALISIS DE DATA DE REGISTRO DE ALMACEN" y "ANALISIS DE DATA DEL ISP". Margen global 0.88. (+63 filas).
  - **CR:** consolidado de las 4 patas del costo real. Columnas: REGISTRO FACTURAS, REGISTRO ALMACEN, CONTROL TAREOS, GASTOS GENERALES, TOTAL REGISTRO + HH tareos. Costo MO prom 25.50. (+58 filas).
  - **Adicionales / Deductivos:** por partida, PRESUPUESTO (PQ-01, PQ-02, Total), Programado y Valorizado. En este cierre todo 0. (+54 filas c/u).
  - **DASH:** dashboard del RO (Margen 1.00 / 1.12, tabla PARTIDAS / CV / VAC). (+43 filas).
  - **GG:** AnÃ¡lisis de Gastos Generales del presupuesto. GG Variables 687,204.96; GG Fijos 55,779.20; Utilidad 0.11; varios #REF!. (+138 filas).
- **NÃºmeros clave:** Margen RO 0.88; CR TOTAL COSTO DE OBRA registrado 1,714,033.71 = Facturas 163,495.82 + AlmacÃ©n 936,317.23 + Tareos 386,873.25 + GG 227,347.41; HH tareos 15,171.50. CD total 1,423,507.41. GG Variables 687,204.96; GG Fijos 55,779.20; utilidad 11%.
- **PropÃ³sito:** documento maestro de control de costos â€” integra presupuesto (BAC), valorizaciones (EV), costo real (AC = facturas + almacÃ©n + tareos + GG), y calcula CV/CPI/SPI/EAC/VAC por partida. Es el entregable de la categorÃ­a 4.
- **Origen -> Destino:** consolida F07 ValorizaciÃ³n (EV), F07 Registro AlmacÃ©n (AC materiales), F07 Registro Facturas (AC subcontratos), PRO-GCR-FOR-F01 ISP (AC mano de obra HH x 25.50) y GG; produce el RO/DASH para gerencia.
- **AutomatizaciÃ³n:** mÃ³dulo **Resultado Operativo (RO/CR/F06 + EVM)** de GRAPCO â€” YA VIVO Y AUTOMÃTICO (Olas 1-5, useRO). Este archivo es el espejo exacto del mÃ³dulo: ROâ†’F06, CRâ†’4 patas del AC, Adicionales/Deductivosâ†’mÃ³dulo homÃ³nimo, DASHâ†’Dashboard RO, GGâ†’Gastos Generales. Es la plantilla de referencia para validar nÃºmeros del mÃ³dulo.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ACERO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n por categorÃ­a (ACERO), corte 02.05.2026 (RO Abril). ~11 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** consulta de recursos consumidos. Columnas: CÃ³digo, Recurso, Unidad, Cantidad Atendida, Valorizado (Principal), Valorizado (Secundaria), Recurso N1 (MATERIALES). Recursos: ACERO CORRUGADO fy=4200 (varios), ACERO DIMENSIONADO 1"/1/2"/3/4"/5/8"/3/8" CORTE Y DOBLADO (ton). (+15 filas).
- **NÃºmeros clave:** ACERO DIMENSIONADO 1" 39.71 ton = 123,015.93; 5/8" 32.18 ton = 99,781.32; 1/2" 9.69 ton = 29,998.70; 3/4" 5.19 ton = 16,068.60; 3/8" 5.69 ton = 17,723.11.
- **PropÃ³sito:** insumo de almacÃ©n (acero) para armar el Registro de AlmacÃ©n F07 del RO de abril.
- **Origen -> Destino:** export crudo del S10 (consulta por partida-control); alimenta la consolidaciÃ³n del F07 Registro AlmacÃ©n de abril â†’ RO abril.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**. Formato plano ideal para el importador (mismas columnas que la hoja Data del F07). Solo MATERIALES â†’ RO. Es un archivo-fuente, no consolidado.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CONCRETO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n categorÃ­a CONCRETO, corte 02.05.2026. ~12 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** mismas columnas (CÃ³digo/Recurso/Unidad/Cant Atendida/Valorizado/Recurso N1). Recursos: ARENA GRUESA, CEMENTO PORTLAND TIPO I, CONCRETO PREMEZCLADO F'C=210, BOOGUIE, cinceles, clavos, etc. (+41 filas).
- **NÃºmeros clave:** CONCRETO PREMEZCLADO F'C=210 38 m3 = 8,720; CEMENTO PORTLAND TIPO I 46 bol = 1,100.86; ARENA GRUESA 120 bol = 457.64.
- **PropÃ³sito:** insumo de almacÃ©n (concreto) para el Registro de AlmacÃ©n F07 del RO de abril.
- **Origen -> Destino:** export S10 â†’ consolidaciÃ³n F07 AlmacÃ©n abril â†’ RO abril.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES â†’ RO.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CR_AL_02.05.2026.png
- **Tipo / formato:** **[.png - no-Excel]** â€” imagen (captura). ~237 KB.
- **Contenido:** no volcable (imagen). Por nombre, captura del "CR" (resumen/cuadro de control) del Registro de AlmacÃ©n corte 02.05.2026.
- **PropÃ³sito:** evidencia/pantallazo del consolidado de almacÃ©n de abril (probable captura del CR del S10 o del Excel CR).
- **Origen -> Destino:** captura manual de pantalla; sustento visual del RO abril.
- **AutomatizaciÃ³n:** GAP / no aplica al importador (imagen). No ingerible automÃ¡ticamente; archivar como adjunto del RO abril.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CURADO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n categorÃ­a CURADO, corte 02.05.2026. ~9 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** CÃ³digo/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos: ARENA FINA (m3 y bol), MOCHILA FUMIGADORA MANUAL, PER MEMBRANA X 55 GLN, RODILLO 9". 6 filas (set pequeÃ±o) con total al pie.
- **NÃºmeros clave:** total categorÃ­a CURADO 678.40. PER MEMBRANA 0.75 cil = 180; ARENA FINA 2 m3 = 194.92.
- **PropÃ³sito:** insumo de almacÃ©n (curado) para el Registro de AlmacÃ©n F07 del RO abril.
- **Origen -> Destino:** export S10 â†’ F07 AlmacÃ©n abril â†’ RO abril.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES â†’ RO.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENCOFRADO_AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n categorÃ­a ENCOFRADO, corte 02.05.2026. ~12 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** CÃ³digo/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos: ADHESIVO QUIMICO HILTI RE 500, ALAMBRE NEGRO RECOCIDO NÂ°8, ARANDELAS, BARRAS ROSCADAS 1"/1Â¼", BALON DE GAS, etc. (+32 filas).
- **NÃºmeros clave:** ADHESIVO HILTI RE 500 9 jgo = 6,464.83; ALAMBRE NEGRO NÂ°8 10 rll = 2,988.04; BARRA ROSCADA 1" 88 und = 2,871.44.
- **PropÃ³sito:** insumo de almacÃ©n (encofrado) para el Registro de AlmacÃ©n F07 del RO abril.
- **Origen -> Destino:** export S10 â†’ F07 AlmacÃ©n abril â†’ RO abril.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES â†’ RO.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\GG.GG._AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n categorÃ­a GASTOS GENERALES (GG.GG.), corte 02.05.2026. ~15 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** CÃ³digo/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos mayormente EPP/seguridad y consumibles: ACEITE MULTIGRADO, BARBIQUEJO, BOTAS/BOTINES, BLOQUEADOR SOLAR, BARRA RETRACTIL CONO, etc. (+89 filas â€” la categorÃ­a mÃ¡s extensa).
- **NÃºmeros clave:** BOTINES DE CUERO PUNTA ACERO 64 par = 3,866.97; BOTAS PVC PUNTA ACERO 10 par = 395; BLOQUEADOR SUGAR SUN 2 = 164; BARRA RETRACTIL CONO 30 = 375.
- **PropÃ³sito:** insumo de almacÃ©n (gastos generales / EPP) para el Registro de AlmacÃ©n F07 del RO abril.
- **Origen -> Destino:** export S10 â†’ F07 AlmacÃ©n abril (categorÃ­a GG) â†’ RO abril (pata GG/almacÃ©n).
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**; archivo-fuente plano. Estos consumos van a la categorÃ­a GASTOS GENERALES del RO.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\II.SS._AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n categorÃ­a IISS (instalaciones sanitarias), corte 02.05.2026. ~9 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** CÃ³digo/Recurso/Unidad/Cant/Valorizado/Recurso N1. Incluye SUBCONTRATOS Y SERVICIOS (SC SOLDADURA POR TERMOFUSION, SC SUMINISTRO E INSTALACION SOPORTE) y MATERIALES (CODO PVC-SAL 8", TUBERIA PVC-SAL 6"/8"). 6 filas + total.
- **NÃºmeros clave:** total categorÃ­a IISS 6,590.93. SC SOLDADURA TERMOFUSION 1 glb = 2,485; TUBERIA PVC-SAL 6" 11 und = 1,724.58; TUBERIA PVC-SAL 8" 4 und = 1,338.98.
- **PropÃ³sito:** insumo de almacÃ©n (IISS) para el Registro de AlmacÃ©n F07 del RO abril.
- **Origen -> Destino:** export S10 â†’ F07 AlmacÃ©n abril â†’ RO abril.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**; archivo-fuente plano. OJO: mezcla MATERIALES y SUBCONTRATOS â€” al ingerir separar (solo MATERIALES al RO vÃ­a almacÃ©n; SC va por la pata facturas/subcontratos).

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\M.T._AL_02.05.2026.XLSX
- **Tipo / formato:** xlsx â€” extracto de almacÃ©n categorÃ­a MOVIMIENTO DE TIERRAS (M.T.), corte 02.05.2026. ~10 KB.
- **Hojas (1):** PARTIDACONTROLCONSULTA
- **Contenido:** CÃ³digo/Recurso/Unidad/Cant/Valorizado/Recurso N1. Recursos: BARRETA LISA, BOOGUIE, AFIRMADO, CABLE VULCANIZADO, GASOLINA 90, LAMPA CUCHARA, MANGUERA PVC, MENNEKES, PICO. (+11 filas).
- **NÃºmeros clave:** AFIRMADO 200 m3 = 9,000; CABLE VULCANIZADO 3x12 1 rll = 796.61; GASOLINA 90 16.58 gal = 248.38.
- **PropÃ³sito:** insumo de almacÃ©n (movimiento de tierras) para el Registro de AlmacÃ©n F07 del RO abril.
- **Origen -> Destino:** export S10 â†’ F07 AlmacÃ©n abril â†’ RO abril.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n (Importar Registro S10)**; archivo-fuente plano. Solo MATERIALES â†’ RO.

---

## Resumen del chunk

- **16 archivos** fichados: 1 contable/tesorerÃ­a (xls), 1 valorizaciÃ³n F07/F01, 2 ISP (PRO-GCR-FOR-F01, una "superado" y una "_RO"), 1 Registro AlmacÃ©n F07 (marzo), 1 Registro Facturas F07 (marzo), 1 RO F06 (marzo), 7 extractos de almacÃ©n por categorÃ­a de abril (6 xlsx + 1 png).
- **Cadena de datos del RO marzo:** F07 ValorizaciÃ³n (EV) + F07 Reg. AlmacÃ©n (AC materiales 936,317.23) + F07 Reg. Facturas (AC subcontratos 163,495.82) + ISP tareos (AC MO 386,873.25) + GG (227,347.41) = F06 RO, costo total registrado 1,714,033.71, margen 0.88.
- **Para RO abril:** los 6 xlsx de almacÃ©n por categorÃ­a son las fuentes crudas S10 que se consolidan en el prÃ³ximo F07 Registro AlmacÃ©n.
- **CÃ³digos de formato detectados:** GP-GCE-FOR-F06 (RO), GP-GCE-FOR-F07 (ValorizaciÃ³n, Registro AlmacÃ©n, Registro Facturas), GP-GCE-FOR-F01 (APUs nuevos), PRO-GCR-FOR-F01 (ISP).



---

# CatÃ¡logo de Costos â€” SecciÃ³n 4. RE-RO (parte 4)

Proyecto: CREDITEX â€” PTAR PLANTA 5 (PTARI F1) + NAVE (F2). Contratista GRAPCO SAC. SupervisiÃ³n DISEÃ‘OS RACIONALES SAC. Periodos RO ABRIL 2026 (cierre 02.05.2026, SEM 26) y RO MAYO 2026 (cierre 31.05.2026).
Costo MO promedio usado en todos los cÃ¡lculos: S/. 25.50/h.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\OP_AL_02.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 (consulta Â«PARTIDACONTROLCONSULTAÂ»). Insumo de almacÃ©n por partida de control (OP = Otras Partidas / Obras Provisionales).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: tabla A1:G57 (56 recursos). Columnas: CÃ³digo (S10) | Recurso | Unidad | Cantidad Atendida | Valorizado (Principal) | Valorizado (Secundaria) | Recurso N1 (clasificaciÃ³n: MATERIALES / SUBCONTRATOS Y SERVICIOS). Ej.: ACERO CORRUGADO fy=4200 (var, 2, 42.37), ALAMBRE NEGRO NÂ°8 x100kg (rll, 1, 348.52), ARENA GRUESA (bol, 60, 228.82), CABLE VULCANIZADO 3x12 (rll, 1, 796.61), CEMENTO PORTLAND TIPO I (bol, 15, 362.29).
- NÃºmeros clave: ~56 lÃ­neas de recurso (no hay fila TOTAL visible en el extracto).
- PropÃ³sito: sustento del consumo de almacÃ©n valorizado de una partida de control para alimentar el Registro de AlmacÃ©n del RO de abril.
- Origen -> Destino: export S10 (Cantidad Atendida x precio) -> hoja Data / pestaÃ±a por partida del Â«GP-GCE-FOR-F07_REGISTRO ALMACENÂ» -> RO F06 columna Actual Cost.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (importador Registro S10). Maestro acumulado por delta. Solo lÃ­neas MATERIALES alimentan el AC del RO.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\TP_AL_02.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (TP = Trabajos Preliminares / TopografÃ­a).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G9 (7 recursos + fila total). OCRE ROJO, PINTURA ESMALTE, PINTURA SPRAY, SC ALQUILER DE GRUA TELESCOPICA (hm, 141.50, 38205 â€” SUBCONTRATOS Y SERVICIOS), TIRALINEAS METALICO, WINCHA METALICA, YESO X 18KG.
- NÃºmeros clave: TOTAL valorizado = 38,470.52. La grÃºa telescÃ³pica (38,205) domina el total.
- PropÃ³sito: consumo de almacÃ©n valorizado de TopografÃ­a/Preliminares; incluye el subcontrato de grÃºa.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a 1. PRE) -> RO F06 AC.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10). El renglÃ³n SUBCONTRATOS conviene marcarlo para no doblar con ValorizaciÃ³n de Subcontratos.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\V.ESTRUCTURAS_AL_02.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Varios Estructuras).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G10 (8 recursos + total). AE BENTOBAR (m, 440, 11455.22), AMOLADORA 4.5, CINCEL SDS MAX, CLAVOS PARA CEMENTO 1", DISCO DE CORTE, PRIMER BENTOBAR (gal/l), SC ALQUILER DE MARTILLOS DEMOLEDORES (dÃ­a, 9, 526.27 â€” SUBCONTRATOS).
- NÃºmeros clave: TOTAL = 13,495.89. El waterstop AE BENTOBAR (11,455.22) domina.
- PropÃ³sito: consumo valorizado de la partida Varios Estructuras.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a 6. VAR EST) -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Abril_.xls
- Tipo / formato: xls (15.8 MB) â€” libro contable/tesorerÃ­a integral de GRAPCO SAC (no es por proyecto; es de toda la empresa).
- Hojas: Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen.
- Contenido a detalle:
  - **Datos**: parÃ¡metros (Fecha DeclaraciÃ³n, RUC 20203071702, IGV 0.18, retenciÃ³n honorarios 0.08, empresa GRAPCO SAC), maestro de cuentas bancarias (CrÃ©dito Soles 193-2080045-0-54 saldo inicial 92,839.39; CrÃ©dito DÃ³lares; CrÃ©dito Soles Precotex; Caja; NaciÃ³n) con Total inicial = 97,926.12.
  - **Ingresos_diario** (~4,085 filas): facturas/NC de venta. Numero | Documento | Tipo | Ingreso | Cliente | Cod_Cliente | Producto(OBRAS) | IGV | Detraccion | Tipo_Cambio | Mes | RUC | tipo de venta. Clientes: UVI TECH PERU, PRECOTEX SAC, CIA INDUSTRIAL ROMOSA, etc.
  - **egresos_diario** (~3,012 filas): compras/egresos. Documento | Tipo | Monto | Producto | IGV | Detraccion | Retencion | Proveedor | Concepto | Tipo_Cambio | banco.
  - **gastos** (~1,275 filas): Egreso | Rubro (Logistica, Renta_3era, igv, Bancos) | Proveedor | IGV | Concepto | Tipo (Factura/Otros). Incluye pagos SUNAT.
  - **RRHH** (~1,006 filas): planilla/tributos laborales. Monto | Concepto (Essalud, ONP, Renta_5ta, Renta_4ta, Habitat, Integra, Personal) | Empresa (INTERCONTACT SAC) | banco.
  - **Bancos** (~25,709 filas): movimientos bancarios al detalle. Banco | Moneda | N_Operacion | Tipo | Cliente | Cargo | Abono | Saldo | Observaciones. Aparecen conceptos de obra: Â«CUOTA SINDICAL SEM 52 - OBRA CREDITEXÂ», Â«DETRACCIONESÂ», pagos a proveedores (GESTION MADERERA F001-26637), comisiones.
  - **Almacen** (~1,064 filas): kardex de mercaderÃ­a corporativa (Polos, Libros, Kits) â€” legado del negocio editorial, no de obra.
- NÃºmeros clave: saldo bancario inicial total 97,926.12 (al 01/2026); CrÃ©dito Soles saldo arranque 92,839.39.
- PropÃ³sito: tesorerÃ­a y flujo de caja real de la empresa; fuente para conciliar pagos a proveedores/subcontratistas y egresos reales.
- Origen -> Destino: registro contable interno (CONCAR/manual) -> sustenta el RO (validaciÃ³n de pagos Â«PAGADO SI/NOÂ» en Registro Facturas) y serÃ­a la fuente natural de un Flujo de Caja.
- AutomatizaciÃ³n: GAP â€” Flujo de Caja no existe en GRAPCO. El libro es corporativo (cruza CREDITEX + PRECOTEX + editorial), viola aislamiento por proyecto; requiere filtro por Observaciones/Cliente Â«CREDITEXÂ» antes de ingerir. Candidato a importador de Flujo de Caja (futuro), o solo extraer movimientos etiquetados OBRA CREDITEX.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_LIQUIDACION.xlsx
- Tipo / formato: xlsx â€” ValorizaciÃ³n de cliente, cÃ³digo **GP-GCE-FOR-F07** (con APUs nuevos GP-GCE-FOR-F01). Es la LIQUIDACIÃ“N (revisiÃ³n NÂ°01) de la obra PTAR PLANTA 5.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios.
- Contenido a detalle:
  - CarÃ¡tula / 1. RESUMEN: PTAR PLANTA 5, AV. LOS HORNOS 185 ATE, periodo ABRIL 2026 (16 al 30/04), Residente ING. GUIDO GONZALES, plazo 130 D.C.
  - 2. PAGOS: cronograma de pagos (GP-GCE-FOR-F07, pÃ¡g 1 de 5).
  - 3. RES.VAL: resumen de valorizaciones â€” MONTO REFERENCIAL 2,866,414.72 (inc. IGV) / 2,429,165.02 (sin IGV); COSTO DIRECTO 1,839,669.99.
  - 4. VAL: valorizaciÃ³n por Ã­tem (A1:AD1103). Columnas: ITEM | DESCRIPCIÃ“N | PRESUPUESTO (UND/CANT/P.U./PARCIAL) | ACUMULADO ANTERIOR (cant/%/total) | ACTUAL | ACUMULADO | SALDO REFERENCIAL. Presupuesto CONTRACTUAL (PTARI), 130 dÃ­as.
  - 5. RO: vista por FRENTE/PARTIDA con Ppto F1 PTARI, ValorizaciÃ³n Quincenal y Acumulada. TOTAL COSTO DE OBRA 2,326,608.63; COSTO DIRECTO 1,839,669.99; valorizaciÃ³n quincenal 89,413.01; acumulada 2,326,608.63.
  - 5 y 6. APUs Nuevos: anÃ¡lisis de nuevos precios unitarios (GP-GCE-FOR-F01).
  - 6. Servicios: lista (ADICIONAL DE ARQUITECTURA, TRAMITE MUNICIPAL).
- NÃºmeros clave: Ref. 2,866,414.72 c/IGV; 2,429,165.02 s/IGV; CD 1,839,669.99; Total costo obra (5.RO) 2,326,608.63; val. quincenal 89,413.01.
- PropÃ³sito: valorizaciÃ³n final (liquidaciÃ³n) presentada al cliente CREDITEX; cierra el avance contractual y la base del Earned Value en el RO.
- Origen -> Destino: metrados de obra x APU del presupuesto contractual -> alimenta columna Valorizado (EV/PV) del RO F06.
- AutomatizaciÃ³n: mÃ³dulo Valorizaciones (cliente) de GRAPCO + Adicionales/Deductivos para Servicios. La hoja 5.RO mapea directo a Curva S / PV-EV. APUs nuevos -> Presupuesto (BAC) o Adicionales.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_Val NÂ°09.xlsx
- Tipo / formato: xlsx â€” ValorizaciÃ³n de cliente NÂ°09 (GP-GCE-FOR-F07), misma estructura que la LiquidaciÃ³n.
- Hojas: idÃ©nticas (9): CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios.
- Contenido a detalle:
  - VALORIZACIÃ“N NÂ°09, periodo ABRIL 2026 (1 al 15/04), rev NÂ°01.
  - 1. RESUMEN: presupuesto referencial 2,922,876.02.
  - 3. RES.VAL: MONTO REFERENCIAL 2,866,414.72 (inc IGV) / 2,429,165.02 (sin IGV); COSTO DIRECTO 1,841,000.03.
  - 4. VAL: misma matriz Presupuesto/Acum. Anterior/Actual/Acumulado/Saldo (CONTRACTUAL PTARI, 130 dÃ­as).
  - 5. RO: TOTAL COSTO DE OBRA 2,328,290.71; COSTO DIRECTO 1,841,000.03; ValorizaciÃ³n Quincenal 115,269.95; Acumulada 2,237,195.62 (CD quincenal 91,144.97, acum 1,768,970.33).
- NÃºmeros clave: ref. 2,922,876.02; CD 1,841,000.03; val. quincenal 115,269.95; acum. 2,237,195.62.
- PropÃ³sito: valorizaciÃ³n quincenal NÂ°09 al cliente (primera quincena de abril) â€” base del EV del RO de abril.
- Origen -> Destino: metrados x APU -> Valorizado (EV) del RO F06; cronograma de pagos -> Flujo de Caja.
- AutomatizaciÃ³n: mÃ³dulo Valorizaciones (cliente). Es la fuente del Earned Value; importable como serie quincenal a Curva S / RO.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\4. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM26.xlsx
- Tipo / formato: xlsx (6.8 MB) â€” Informe Semanal de ProducciÃ³n (ISP), cÃ³digo **PRO-GCR-FOR-F01**. Motor de productividad HH/IP del proyecto.
- Hojas (30): PC | CR | CHH | CIP | ISP-SEM26 ... ISP-SEM01 (26 semanas + 4 maestras).
- Contenido a detalle:
  - **PC** (Partidas Control): catÃ¡logo de partidas de control con cÃ³digo (1001 TRABAJOS PRELIMINARES, etc.) y unidad (GLB/MES).
  - **CR** (Control Reporte tareos): por FRENTE/PARTIDA -> HH | COSTO | ACUM S/IGV. Costo MO prom 25.50. SEMANA 24 (13-19/04). TOTAL COSTO DE OBRA HH 17,680.51 / COSTO 310,475.51 / ACUM 450,853.01. COSTO DIRECTO HH 17,216.01 / 298,630.76 / 439,008.26.
  - **CHH** (Control HH Variaciones): por semana â€” HH PLANILLA vs HH CAMPO (admin vs campo) | DELTA | HH META ACUM | HH VARIACIÃ“N | CPI | desglose por partida (PRE/PRO/CON/ACE/CUR/...). Ej. SEM1 CPI 0.46 hasta SEM creciente; arranque HH planilla acum 16,479.50, campo 16,464.
  - **CIP** (Control de IP): IP Contractual | IP Meta | IP Actual Acum por SEM21..SEM25 | DELTA | COMENTARIO (p.ej. Â«ACTUALIZAR APU REALÂ»). Por partida.
  - **ISP-SEM01..26**: matriz semanal completa â€” CODIGO | PARTIDA DE CONTROL | UND | PREVISIÃ“N (METRADO/HH/IP) por PPTO OFERTA PTAR (F1), OFERTA NAVE (F2), ADICIONALES, CONTRACTUAL (1), META (2) | ACUMULADO ANTERIOR | META | VAR | CPI | reparto diario LUN..DOM (metrado/HH/IP) | PRESENTE | anÃ¡lisis vs META y vs PPTO. SEM26 (27/04-03/05): CONTROL 20,411.88; HH presente acum 17,680.51; META 14,911.33; VAR -2,749.19; **CPI 0.84**. SEM24: CPI 0.72. SEM23: CPI 0.74.
- NÃºmeros clave: Costo MO 25.50; HH total semana ~17,680.51; CPI rango 0.72-0.84; HH planilla vs campo delta ~14-16; META HH acum SEM26 14,911.33.
- PropÃ³sito: corazÃ³n del control de productividad â€” convierte tareos (HH) en costo de MO y compara IP real vs meta/presupuesto, genera CPI por partida que alimenta el RO.
- Origen -> Destino: tareos diarios de campo (HH) + metrados -> CR (HH x 25.50) -> RO F06 columna Â«ANALISIS DE DATA DEL ISPÂ» y CPI. CIP toma IP Meta/Ppto del catÃ¡logo WBS.
- AutomatizaciÃ³n: mÃ³dulo ISP de GRAPCO (tareos HH x S/25.5) ya existe -> esta es la fuente directa. CHH (planilla vs campo) es un GAP parcial (Control de Planilla). Semanas = obtenerSemana (LPS rector). CPI por partida -> RO/EVM.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.05.02.xlsx
- Tipo / formato: xlsx â€” Registro de AlmacÃ©n consolidado (cÃ³digo GP-GCE-FOR-F07), cierre 02.05.2026 / SEM 26. Es el maestro ACUMULADO del consumo valorizado de almacÃ©n.
- Hojas (18): CR | Analisis | Data | 1. PRE | 2. PRO | 3. CON | 4. ACE | 5. CUR | 6. VAR EST | 7. TAB | 8. BIT | 10. PRH | 11. VAR ARQ | 12. IIEE | 13. IISS | 14. MT | 15. ENC | GG.
- Contenido a detalle:
  - **CR**: cuadro acumulado por partida de control con desglose en 16 columnas (1.PRELIMINAR ... GASTO GENERALES). ACUM S/IGV 31.03.2026 = 936,317.23 -> mensual 102,516.63 -> ACUM 30.04.2026 = 1,038,833.86. COSTO DIRECTO 884,128.84 -> 971,638.38.
  - **Analisis**: detalle de costos por partida con PARCIAL/TOTAL y columna DELTA (CONTROL vs Data). TOTAL COSTO DE OBRA 938,904.21; CD 873,157.73; Data 941,389.21.
  - **Data**: base de recursos (~275 filas) CÃ³digo | Recurso | Unidad | Cantidad Atendida | Costo | Valorizado (Secundaria) | Recurso N1 | COMENTARIO1 (partida) | COMENTARIO2 (subpartida). Total 941,389.21.
  - **PestaÃ±as por partida** (cada una repite REGISTRO + ANALISIS + detalle S10). Totales acum 30.04.2026:
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
- NÃºmeros clave: ACUM almacÃ©n 30.04.2026 = 1,038,833.86 (TCO) / 971,638.38 (CD); mensual abril 102,516.63; Data 941,389.21; mayores: Concreto 401,513.15 y Acero 298,029.02.
- PropÃ³sito: consolida todos los AL_*.XLSX por partida en el costo real de materiales/subcontratos del proyecto (pata AlmacÃ©n del Actual Cost del RO).
- Origen -> Destino: extractos S10 por partida (OP/TP/V.ESTRUCTURAS/ACERO/...) -> hoja Data -> CR acumulado -> RO F06 columna Â«ANALISIS DE DATA DE REGISTRO DE ALMACENÂ» (Actual Cost).
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Kardex S10) â€” maestro ACUMULADO con cÃ¡lculo de deltas; solo lÃ­neas MATERIALES al RO. Es el consolidado destino del importador de almacÃ©n.

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.05.02.xlsx
- Tipo / formato: xlsx â€” Registro de Facturas de subcontratistas (cÃ³digo GP-GCE-FOR-F07), cierre 02.05.2026. Es la pata de ValorizaciÃ³n de Subcontratos del AC.
- Hojas (8): RESUMEN | CR | 1. PRE | 13. IISS | 10. PHE | 14. MT | 15. ENC | 17. IMP.
- Contenido a detalle:
  - **RESUMEN**: por rubro -> PROVEEDOR | MONTO SIN IGV | IGV | MONTO CON IGV. PRE/AMSA 13,736.94; IISS/RECOSA 979; ENC/EFCO 44,161.42; ENC/NOPIN 5,147.06; varios con #N/A o #VALUE! (errores de fÃ³rmula).
  - **CR**: acumulado por partida. TOTAL COSTO DE OBRA = COSTO DIRECTO: ACUM 31.03.26 163,495.82 + mensual 179,691.98 = ACUM 02.05.26 **343,187.80**. Trabajos Preliminares 13,736.94.
  - **PestaÃ±as por subcontrato** (cuadro resumen de valorizaciÃ³n por proveedor con: PROYECTO Â«AMPLIACIÃ“N PRECOTEX LAS MORERASÂ», cliente GRAPCO, supervisor HIGASHI, RUC, MONTO CONTRACTUAL, FACTURADO, AMORTIZACIÃ“N, DEDUCCIÃ“N, SALDO POR DEDUCIR, y tabla de facturas FACTURA|SUBCONTRATISTA|VAL|DESCRIPCION|MONTO|IGV|PAGADO|FECHA):
    - 1. PRE â€” AMSA (subcontrato de andamios), contractual 9,257.50 s/IGV; facturas F001-1031/1103/... ALQUILER DE EQUIPOS. ACUM 13,736.94.
    - 13. IISS â€” RECOSA / MASESTRUMETALES, contractual 55,729.70; ACUM 1,679; saldo por deducir 12,822.
    - 10. PHE (Prueba HidrÃ¡ulica) â€” ORANGE/RECOSA, ACUM 15,750 (PRUEBA DE LANZA SECA).
    - 14. MT â€” R PROYECTOS, contractual 90,611.28; ACUM 93,561.07; saldo 44,592.
    - 15. ENC â€” EFCO, ACUM 81,358.53 (arriendos de encofrado metÃ¡lico ene-abr, ventas de equipo, NC de devoluciÃ³n -3,047.03).
    - 17. IMP â€” SURE (impermeabilizaciÃ³n), contractual 137,102.26; ACUM 137,102.26; saldo por deducir 117,434.
- NÃºmeros clave: ACUM facturas subcontratos 02.05.26 = 343,187.80 (mensual 179,691.98); mayores: IMP/SURE 137,102.26, MT/R PROYECTOS 93,561.07, ENC/EFCO 81,358.53.
- PropÃ³sito: control de valorizaciÃ³n y pago a subcontratistas (amortizaciÃ³n/deducciÃ³n/saldo) por partida; pata del Actual Cost del RO.
- Origen -> Destino: facturas de subcontratistas -> CR por partida -> RO F06 columna Â«REGISTRO FACTURASÂ» (Actual Cost).
- AutomatizaciÃ³n: GAP conocido â€” ValorizaciÃ³n de Subcontratistas (F10/F11) no existe como mÃ³dulo; hoy entra por Importador genÃ©rico / AlmacÃ©n. Estructura contractual+amortizaciÃ³n+saldo justifica un mÃ³dulo Subcontratos dedicado. Estado PAGADO SI/NO cruza con Bancos (Flujo de Caja).

### \05. GestiÃ³n Costos\4. RE-RO\2026.04 RO_ABR CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.05.02.xlsx
- Tipo / formato: xlsx â€” **Resultado Operativo (RO) maestro**, cÃ³digo **GP-GCE-FOR-F06**, PTAR PLANTA 5 - CREDITEX, SEM 26, rev 1, fecha 02.05.2026. Documento integrador del control de costos (EVM).
- Hojas (6): RO | CR | Adicionales | Deductivos | DASH | GG.
- Contenido a detalle:
  - **RO** (A1:AI935): matriz EVM por FRENTE/PARTIDA. Presupuesto = Ppto F1 (PTARI) + Ppto F2 (Nave) + Deductivos (PQ-01/02) + Adicionales = Ppto Total (BAC). Avance Programado (PV F1/F2/Deduct/Adic = Plan Value). Valorizado (Val F1/F2/... = Earned Value EV). Costo Real (Actual Cost AC) con Margen y CV. CPI. Saldo teÃ³rico/costo por ejecutar. Estimado al tÃ©rmino: EAC, VAC, SPI. Encabezado: factor 0.76. Columnas finales cruzan Â«ANALISIS DE DATA DE REGISTRO DE ALMACENÂ» y Â«ANALISIS DE DATA DEL ISPÂ».
  - **CR** (consolidado de las 4 patas del AC + GG): TOTAL COSTO DE OBRA -> REGISTRO FACTURAS 343,187.80 | REGISTRO ALMACEN 450,853.01 (Â¿tareos?)â€¦ filas: Reg.Facturas ACUM 343,187.80; Reg.Almacen mensual 86,799.63 ACUM 1,023,116.86; Reporte Tareos HH 17,680.51 ACUM S/IGV 450,853.01; Gastos Generales ACUM 284,857.11; TOTAL REGISTRO 2,102,014.77. Costo MO 25.50.
  - **Adicionales**: matriz por partida PQ-01/PQ-02/Total con Programado y Valorizado (todo 0 en este periodo).
  - **Deductivos**: misma matriz (todo 0).
  - **DASH**: tablero â€” Margen 1.00 / 1.27, factor 0.76, SEM 26, ranking de PARTIDAS por CV y VAC.
  - **GG** (AnÃ¡lisis de Gastos Generales): Costo Directo (#REF!), GG Variables 687,204.96, GG Fijos 55,779.20, Utilidad 0.11. (Mezcla referencia a otro proyecto Â«reproducciÃ³n clÃ³nica / Agromillora / Ica-ChinchaÂ» â€” plantilla heredada con #REF!).
- NÃºmeros clave: Ppto Total BAC y factor 0.76; CR TOTAL REGISTRO (AC) 2,102,014.77; Reg.Almacen acum 1,023,116.86; Reg.Facturas 343,187.80; Tareos acum 450,853.01; GG acum 284,857.11; mÃ¡rgenes DASH 1.00/1.27; GG Variables 687,204.96 / Fijos 55,779.20 / Utilidad 0.11.
- PropÃ³sito: documento rector que cruza Presupuesto (BAC) vs PV vs EV (valorizaciÃ³n) vs AC (almacÃ©n+facturas+tareos+GG) para CPI/CV/SPI/EAC/VAC por partida y frente.
- Origen -> Destino: integra Registro AlmacÃ©n F07 + Registro Facturas F07 + ISP (tareos) + Valorizaciones F07 + Adicionales/Deductivos + GG -> KPIs RO/Curva S -> DASH gerencial.
- AutomatizaciÃ³n: mÃ³dulo Resultado Operativo (RO/CR/F06 + EVM) de GRAPCO â€” YA VIVO con useRO (4 patas del AC + GG + EV valorizado + adicionales/deductivos). Este archivo es el espejo exacto del mÃ³dulo. DASH -> Dashboard RO. GG con #REF! debe sanearse (no importar la plantilla Agromillora).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ACERO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Acero), cierre mayo.
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G1000 (~20 recursos). ACERO CORRUGADO fy=4200 varios diÃ¡metros (var) y ACERO DIMENSIONADO 1"/1/2"/3/4"/5/8" (ton) cortado y doblado. Ej. dimensionado 1": ton 39.71, 123,015.93; 5/8": ton 32.18, 99,781.32.
- NÃºmeros clave: el acero dimensionado domina (1" 123,015.93 + 5/8" 99,781.32 + 1/2" 29,998.70 + 3/4" 16,068.60).
- PropÃ³sito: consumo valorizado de acero (mayo) para el Registro de AlmacÃ©n del RO de mayo.
- Origen -> Destino: S10 -> consolidado Registro AlmacÃ©n F07 mayo -> RO F06 AC.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10), maestro acumulado/delta, lÃ­neas MATERIALES.

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\BITUMEN_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Bitumen/impermeabilizaciÃ³n).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G5 (3 recursos + total). ALQUITRAN (gal, 4, 128.81), BROCHA 2" (und, 24, 345.76), THINNER (gal, 10, 211.86).
- NÃºmeros clave: TOTAL = 686.43.
- PropÃ³sito: consumo valorizado de la partida Bitumen (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 mayo -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CONCRETO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Concreto).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G57 (~56 recursos). ARENA GRUESA (bol, 330, 1258.50), CEMENTO PORTLAND TIPO I (bol, 124, 3058.48), BOOGUIE, BRUÃ‘A, CINCELES, CINTA MASKINGTAPE, CLAVOS, etc.
- NÃºmeros clave: ~56 lÃ­neas; cemento 3,058.48 y arena gruesa 1,258.50 destacan (no hay fila total en el extracto).
- PropÃ³sito: consumo valorizado de Concreto (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 mayo -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CR_AL_31.05.2026.png
- Tipo / formato: png (imagen, 240 KB) â€” [.png - no-Excel].
- PropÃ³sito: captura del cuadro CR (Control de AlmacÃ©n) del cierre de mayo, presumiblemente pantallazo del consolidado/validaciÃ³n visual del Registro de AlmacÃ©n. Sustento grÃ¡fico, no fuente de datos estructurada.
- AutomatizaciÃ³n: no ingerible como datos; sirve solo como evidencia adjunta. Sin destino de importador.

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\CURADO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Curado).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G7 (5 recursos + total). ARENA FINA (m3, 2, 194.92 / bol, 90, 343.23), MOCHILA FUMIGADORA, PER MEMBRANA X 55 GLN (cil, 0.75, 180), RODILLO 9".
- NÃºmeros clave: TOTAL = 996.20.
- PropÃ³sito: consumo valorizado de Curado (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 mayo -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\ENCOFRADO_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Encofrado).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G45 (~44 recursos). ADHESIVO QUIMICO HILTI RE 500 (jgo, 9, 6464.83), ALAMBRE NEGRO NÂ°8 (rll, 10, 2988.04), BARRA ROSCADA 1"x1.80m (und, 88, 2871.44), arandelas, barras roscadas, balÃ³n de gas, WD-40.
- NÃºmeros clave: ~44 lÃ­neas; Hilti RE 500 (6,464.83) y alambre (2,988.04) destacan.
- PropÃ³sito: consumo valorizado de Encofrado (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 mayo -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\GG.GG._AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Gastos Generales).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G113 (~112 recursos). EPP y consumibles de oficina/seguridad: ACEITE MULTIGRADO, ACIDO MURIATICO, ADAPTADOR CARETA, BARBIQUEJO (90, 174.24), BARRA RETRACTIL CONO, BLOQUEADOR SUGAR SUN, etc.
- NÃºmeros clave: ~112 lÃ­neas (la lista mÃ¡s larga de los almacenes de mayo); sin total visible en extracto.
- PropÃ³sito: consumo valorizado de Gastos Generales en obra (mayo) â€” EPP, seguridad, campamento.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a GG) -> RO F06 (GG).
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10); estos recursos van a GG del RO, no a CD de partidas.

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\II.SS._AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Instalaciones Sanitarias).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G8 (7 recursos + total). CODO PVC-SAL 8"x45Â°, PEGAMENTO PVC, SC SOLDADURA POR TERMOFUSION (glb, 1, 2485 â€” SUBCONTRATOS), SC SUMINISTRO E INSTALACION DE SOPORTE (glb, 1, 762.71), TUBERIA PVC-SAL 6" y 8".
- NÃºmeros clave: TOTAL = 6,701.10. Soldadura termofusiÃ³n (2,485) y tuberÃ­a 6" (1,724.58) destacan.
- PropÃ³sito: consumo valorizado de IISS (mayo), incluye 2 subcontratos.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a 13. IISS) -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10); marcar lÃ­neas SC para no duplicar con Registro Facturas/Subcontratos.

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\MT_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Movimiento de Tierras).
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G21 (~20 recursos). AFIRMADO (m3, 228, 10260), BARRETA LISA, BOOGUIE, CABLE VULCANIZADO, GASOLINA 90, LAMPA, MANGUERA PVC, MENNEKES, PICO.
- NÃºmeros clave: ~20 lÃ­neas; AFIRMADO (10,260) domina.
- PropÃ³sito: consumo valorizado de Movimiento de Tierras (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a 14. MT) -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\OP_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Otras Partidas), cierre mayo.
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G60 (~59 recursos). ACERO CORRUGADO, ADAPTADOR PVC-SAP, ALAMBRE NEGRO, ARENA FINA/GRUESA, BARRETA, BISAGRA CAPUCHINA, CABLE VULCANIZADO, CAJA RECTANGULAR PVC.
- NÃºmeros clave: ~59 lÃ­neas; sin total visible en extracto.
- PropÃ³sito: consumo valorizado de partidas varias (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 mayo -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\TP_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Trabajos Preliminares/TopografÃ­a), mayo.
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G11 (~10 recursos). OCRE ROJO, PINTURA ESMALTE/SPRAY, SC ALQUILER ESTACION TOTAL (dÃ­a, 1, 100), SC ALQUILER DE GRUA TELESCOPICA (hm, 150, 40500 â€” SUBCONTRATOS), SC SERVICIO DE TOPOGRAFIA (glb, 1, 1141.41), TIRALINEAS, WINCHA, YESO.
- NÃºmeros clave: la grÃºa telescÃ³pica (40,500) domina; servicio de topografÃ­a 1,141.41.
- PropÃ³sito: consumo valorizado de TopografÃ­a/Preliminares (mayo), con 3 subcontratos.
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a 1. PRE) -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10); separar lÃ­neas SC.

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\1. Reg. AlmacÃ©n\V.ESTRUCTURAS_AL_31.05.2026.XLSX
- Tipo / formato: xlsx â€” extracto S10 PARTIDACONTROLCONSULTA (Varios Estructuras), mayo.
- Hojas: PARTIDACONTROLCONSULTA (Ãºnica).
- Contenido: A1:G11 (~10 recursos). AE BENTOBAR (m, 440, 11455.22), AMOLADORA, CINCEL SDS MAX, CLAVOS CEMENTO 1", CUCHILLA, DISCO DE CORTE, PRIMER BENTOBAR (gal/l), SC ALQUILER DE MARTILLOS DEMOLEDORES (dÃ­a, 9, 526.27).
- NÃºmeros clave: AE BENTOBAR (11,455.22) domina.
- PropÃ³sito: consumo valorizado de Varios Estructuras (mayo).
- Origen -> Destino: S10 -> Registro AlmacÃ©n F07 (pestaÃ±a 6. VAR EST) -> RO F06.
- AutomatizaciÃ³n: AlmacÃ©n GRAPCO (Registro S10).

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\2. Reg. Bancos\Bancos 2026_Mayo.xls
- Tipo / formato: xls (15.9 MB) â€” libro contable/tesorerÃ­a corporativo de GRAPCO SAC (versiÃ³n mayo; estructura idÃ©ntica al de abril).
- Hojas: Datos | Ingresos_diario | egresos_diario | gastos | RRHH | Bancos | Almacen.
- Contenido a detalle: igual que Â«Bancos 2026_Abril_.xlsÂ».
  - Datos: parÃ¡metros + cuentas bancarias (saldo inicial CrÃ©dito Soles 92,839.39; Total 97,926.12).
  - Ingresos_diario (~4,085): ventas a UVI TECH, PRECOTEX, ROMOSA, etc.
  - egresos_diario (~3,012): compras/egresos con detracciÃ³n/retenciÃ³n.
  - gastos (~1,275): Logistica, Renta_3era, igv, SUNAT.
  - RRHH (~1,006): Essalud/ONP/Renta/AFP, planilla INTERCONTACT SAC.
  - Bancos (~25,709): movimientos al detalle, conceptos OBRA CREDITEX / detracciones / cuota sindical.
  - Almacen (~1,064): kardex de mercaderÃ­a editorial (Polos/Libros/Kits), no de obra.
- NÃºmeros clave: saldo inicial total 97,926.12 (mismos saldos de arranque que abril â€” libro acumulativo).
- PropÃ³sito: tesorerÃ­a/flujo real de mayo; conciliaciÃ³n de pagos y base de Flujo de Caja.
- Origen -> Destino: registro contable interno -> sustenta pagos del RO (estado PAGADO) y Flujo de Caja.
- AutomatizaciÃ³n: GAP â€” Flujo de Caja. Libro corporativo cruza varios clientes/negocios (rompe aislamiento por proyecto); requiere filtro CREDITEX por Observaciones/Cliente antes de cualquier ingesta.



---

# CatÃ¡logo de Costos â€” CATEGORIA 4. RE-RO (cont. 5) â€” chunk `cat_4_RE_RO__p5`

Carpeta fuente: `05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX` (RO de MAYO 2026, proyecto CREDITEX = PTARI Planta 5 + NAVE estructura metÃ¡lica).
Periodo de reporte: SEMANA 26, corte 31.05.2026. Costo MO promedio usado: **S/ 25.50/HH**.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_CREDITEX NAVE-Val NÂ°02.xlsx
- **Tipo / formato:** Excel (.xlsx, 529 KB). Formato **GP-GCE-FOR-F07** (ValorizaciÃ³n de cliente). Incluye hojas con APUs nuevos en formato **GP-GCE-FOR-F01**.
- **Hojas (8):** `CarÃ¡tula` | `1. RESUMEN` | `2. PAGOS` | `3. RES.VAL` | `4. VAL` | `5. APUs Nuevos` | `5. RO` | `6. APUs Nuevos.`
- **Contenido por hoja:**
  - `CarÃ¡tula`: identificaciÃ³n. Obra = "ESTRUCTURA METALICA Y LOSA COLABORANTE", AV. LOS HORNOS 185 ATE, **ValorizaciÃ³n NÂ°02**, RevisiÃ³n NÂ°01, MES DE MAYO 2026 (periodo del 16 al 31).
  - `1. RESUMEN`: ficha de la valorizaciÃ³n. Cliente CREDITEX, SupervisiÃ³n DISEÃ‘OS RACIONALES SAC, Contratista GRAPCO SAC, Residente ING. GUIDO GONZALES. Presupuesto referencial **S/ 749,994.16**, plazo 75 D.C.
  - `2. PAGOS`: CRONOGRAMA DE PAGOS (GP-GCE-FOR-F07, pÃ¡g 1 de 5). Presupuesto "PPTO PTAR PLANTA 5", ValorizaciÃ³n NÂ°2, periodo MAYO.
  - `3. RES.VAL`: RESUMEN DE VALORIZACIONES (pÃ¡g 2 de 5). Monto referencial **S/ 749,994.16 (inc. IGV)**, **S/ 635,588.27 (no inc. IGV)**, Costo Directo **S/ 545,588.27**.
  - `4. VAL`: hoja de valorizaciÃ³n detallada por partida (pÃ¡g 3 de 5, ~89 filas). Columnas: ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. (S/.) | PARCIAL (S/.) | ACUMULADO ANTERIOR (cantidad/%/total) | ACTUAL (cantidad/%/total) | ACUMULADO (cantidad/%/total) | SALDO REFERENCIAL. Presupuesto = NAVE.
  - `5. APUs Nuevos` y `6. APUs Nuevos.`: AnÃ¡lisis de Nuevos Precios Unitarios (formato GP-GCE-FOR-F01, pÃ¡g 9 de 10). APUs creados para partidas no contempladas.
  - `5. RO`: tabla de avance econÃ³mico por FRENTE/PARTIDA con columnas Ppto F1 PTARI | ValorizaciÃ³n Quincenal | ValorizaciÃ³n Acumulada. TOTAL COSTO DE OBRA = 689,998.95 / 183,210.22 / 474,379.03; COSTO DIRECTO = 545,588.27 / 144,865.94 / 375,095.69.
- **NÃºmeros clave:** Ppto referencial S/ 749,994.16 (c/IGV); S/ 635,588.27 (s/IGV); Costo Directo S/ 545,588.27; Total costo de obra S/ 689,998.95; valorizaciÃ³n quincenal S/ 183,210.22; acumulada S/ 474,379.03.
- **PropÃ³sito:** valorizaciÃ³n contractual NÂ°02 del frente NAVE (estructura metÃ¡lica/losa colaborante) presentada al cliente CREDITEX, con su RO interno y APUs nuevos de respaldo.
- **Origen -> Destino:** sale de metrados de avance del frente NAVE + APUs del presupuesto NAVE; alimenta el RO consolidado (F06) columna Val F2 (Nave) y el cronograma de pagos del cliente.
- **AutomatizaciÃ³n:** mÃ³dulo **Valorizaciones (cliente)** de GRAPCO (cabecera + detalle por partida con acum. anterior/actual/acumulado/saldo); APUs nuevos -> mÃ³dulo Presupuesto (BAC) como precios nuevos. Importable con el importador genÃ©rico in-app mapeando hoja `4. VAL`.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\3. Valorizaciones\GP-GCE-FOR-F07_CREDITEX PTAR_LIQUIDACION.xlsx
- **Tipo / formato:** Excel (.xlsx, 1620 KB). Formato **GP-GCE-FOR-F07** â€” es la **LIQUIDACIÃ“N** del frente PTARI. APUs en GP-GCE-FOR-F01.
- **Hojas (9):** `CarÃ¡tula` | `1. RESUMEN` | `2. PAGOS` | `3. RES.VAL` | `4. VAL` | `5. APUs Nuevos` | `5. RO` | `6. APUs Nuevos.` | `6. Servicios`
- **Contenido por hoja:**
  - `CarÃ¡tula`: "PTAR PLANTA 5", LIQUIDACIÃ“N, Rev NÂ°01, MES DE ABRIL 2026 (periodo del 16 al 30).
  - `1. RESUMEN`: Cliente CREDITEX, Residente ING. GUIDO GONZALES, Presupuesto referencial **S/ 2,917,811.21**, plazo 130 D.C.
  - `2. PAGOS`: cronograma de pagos, ValorizaciÃ³n = LIQUIDACION, periodo ABRIL.
  - `3. RES.VAL`: Monto referencial **S/ 2,917,862.75 (inc. IGV)**, **S/ 2,472,765.04 (no inc. IGV)**, Costo Directo **S/ 1,840,622.06**.
  - `4. VAL`: valorizaciÃ³n detallada de liquidaciÃ³n (~279 filas), mismas columnas que el F07 NAVE (Presupuesto/Acum.anterior/Actual/Acumulado/Saldo). Presupuesto = CONTRACTUAL (PTARI), plazo 130 dÃ­as.
  - `5. APUs Nuevos` / `6. APUs Nuevos.`: APUs nuevos del PTARI (GP-GCE-FOR-F01).
  - `5. RO`: RO del frente PTARI. TOTAL COSTO DE OBRA = 2,327,812.70 / 90,617.08 (quincenal) / 2,327,812.70 (acum); COSTO DIRECTO = 1,840,622.06 / 71,651.73 / 1,840,622.06. (LiquidaciÃ³n = avance al 100%.)
  - `6. Servicios`: lista breve â€” "ADICIONAL DE ARQUITECTURA", "TRAMITE MUNICIPAL".
- **NÃºmeros clave:** Ppto referencial S/ 2,917,862.75 (c/IGV); S/ 2,472,765.04 (s/IGV); Costo Directo S/ 1,840,622.06; Total costo de obra (acum) S/ 2,327,812.70; Ãºltima valorizaciÃ³n quincenal S/ 90,617.08.
- **PropÃ³sito:** liquidaciÃ³n final del frente PTARI (cierre contractual con CREDITEX), con su RO al 100% y APUs nuevos.
- **Origen -> Destino:** sale del acumulado de valorizaciones del PTARI; alimenta el cierre/liquidaciÃ³n del frente F1 y el RO consolidado (columna Val F1 PTARI).
- **AutomatizaciÃ³n:** mÃ³dulo **Valorizaciones (cliente)** con estado "liquidaciÃ³n/cierre"; servicios adicionales -> **Adicionales/Deductivos**. GAP parcial: la plataforma maneja valorizaciones periÃ³dicas pero conviene un estado explÃ­cito de "liquidaciÃ³n final" por frente.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO ALMACEN_CREDITEX_2026.05.31.xlsx
- **Tipo / formato:** Excel (.xlsx, 417 KB). Formato **GP-GCE-FOR-F07** â€” REGISTRO DE ALMACEN (Kardex S10 valorizado por fase). Corte 31.05.2026, SEMANA 26.
- **Hojas (18):** `CR` | `Data` | `Analisis` | `1. PRE` | `2. PRO` | `3. CON` | `4. ACE` | `5. CUR` | `6. VAR EST` | `7. TAB` | `8. BIT` | `10. PRH` | `11. VAR ARQ` | `12. IIEE` | `13. IISS` | `14. MT` | `15. ENC` | `GG`
- **Contenido por hoja:**
  - `CR` (Control Resumen): consolidado por fase con columnas ACUM S/IGV inicial (02.05.2026), MENSUAL, y 17 columnas por fase (1.PRELIMINAR, 2.PROVISIONAL, 3.CONCRETO, 4.ACERO, 5.CURADO, 6.VARIOS EST, 7.TABIQUERIA, 8.BITUMEN, 10.PRUEBA HIDR, 11.VAR ARQ, 12.IIEE, 13.IISS, 14.MOV TIERRAS, 15.ENCOFRADO, GASTOS GENERALES) y ACUM S/IGV final (31.05.2026). Estructura por partida (FA01 1.01, etc.).
  - `Data`: detalle lÃ­nea a lÃ­nea del Kardex. Columnas: CÃ³digo | Recurso | Unidad | Cantidad Atendida | Costo | Valorizado (Secundaria) | Recurso N1 (MATERIALES / SUBCONTRATOS Y SERVICIOS) | COMENTARIO 1 (fase) | COMENTARIO 2 (sub-rubro). ~349 filas de recursos (cemento, acero, alquiler grÃºa, topografÃ­a, etc.).
  - `Analisis`: ANALISIS - DETALLE DE COSTOS con PARCIAL/TOTAL S/, columnas CONTROL y DELTA (cruza contra Data: 1,059,513.43 vs 1,052,812.33).
  - Hojas por fase (`1. PRE` ... `15. ENC`, `GG`): cada una replica REGISTRO DE ALMACEN + ANALISIS-DETALLE con el detalle de recursos (CÃ³digo/Recurso/Unidad/Cant Atendida/Valorizado Principal/Valorizado Secundaria/Recurso N1/Comentarios) filtrado por su fase.
- **NÃºmeros clave (acumulado al 31.05.2026, S/IGV):** TOTAL COSTO DE OBRA **S/ 1,059,513.43** (mensual S/ 36,396.57); COSTO DIRECTO **S/ 987,214.33**. Por fase: Preliminar 42,006.93; Provisional 69,799.98; Concreto 398,301.71; Acero 304,071.00; Curado 996.20; Varios Est 13,550.21; TabiquerÃ­a 0; Bitumen 686.43; Prueba Hidr 0; Var Arq 0; IIEE 0; IISS 6,701.10; Mov Tierras 49,156.53; Encofrado 34,663.10; Gastos Generales 139,580.24 (de los cuales C.Directo 67,774.14). Hito de costos: SC alquiler grÃºa telescÃ³pica S/ 40,500 (150 hm); afirmado mov tierras S/ 10,260 (228 m3).
- **PropÃ³sito:** registro/valorizaciÃ³n del consumo de almacÃ©n (materiales + subcontratos/servicios) por fase y partida; es la "pata AlmacÃ©n" del RO (Actual Cost de materiales).
- **Origen -> Destino:** sale del Kardex S10 (maestros F07 acumulados); alimenta la columna **REGISTRO ALMACEN** del CR (F06) y el Actual Cost (AC) del RO. Solo lÃ­neas MATERIALES alimentan el RO; los SUBCONTRATOS van por la pata de facturas.
- **AutomatizaciÃ³n:** mÃ³dulo **AlmacÃ©n â†’ Â«Importar Registro S10Â»** (ya existe). Los maestros son ACUMULADOS, calcula deltas. La hoja `Data` es la fuente canÃ³nica importable. La separaciÃ³n MATERIALES vs SUBCONTRATOS Y SERVICIOS (Recurso N1) determina quÃ© entra al RO.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\1. Sustento\GP-GCE-FOR-F07_REGISTRO FACTURAS_CREDITEX_2026.05.31.xlsx
- **Tipo / formato:** Excel (.xlsx, 375 KB). Formato **GP-GCE-FOR-F07** â€” REGISTRO DE FACTURAS de subcontratistas/proveedores. Corte 31.05.2026.
- **Hojas (9):** `RESUMEN` | `CR` | `1. PRE` | `13. IISS` | `10. PHE` | `14. MT` | `15. ENC` | `17. IMP` | `16. ESTM`
- **Contenido por hoja:**
  - `RESUMEN`: tabla por rubro/proveedor con MONTO SIN IGV | IGV | MONTO CON IGV. Filas: PRE/AMSA 23,445.35; IIEE/SOLCONER (#N/A); IISS/RECOSA 979; MT/CONSTRUCTORA TINOZ 0; MT/RJ&H 0; MT/CONSORCIO SA&ES 0; ENC/A&CR (#VALUE!); ENC/EFCO 44,161.42; ENC/NOPIN 11,699.14.
  - `CR` (Control Resumen): por partida, ACUM S/IGV inicial (02.05.26), MENSUAL, ACUM S/IGV final (31.05.26). TOTAL COSTO DE OBRA = 343,187.80 / 289,316.36 / **632,504.16**; COSTO DIRECTO igual (632,504.16). Tiene marcas OT/OK.
  - Hojas por rubro (`1. PRE`, `13. IISS`, `10. PHE`, `14. MT`, `15. ENC`, `17. IMP`, `16. ESTM`): cada una es un **CUADRO RESUMEN DE VALORIZACIONES de subcontrato** (cabecera: proyecto AMPLIACIÃ“N PRECOTEX LAS MORERAS, cliente GRAPCO, supervisor HIGASHI, subcontratista, RUC, servicio; control: monto contractual c/IGV y s/IGV, monto total facturado, amortizaciÃ³n, deducciÃ³n, saldo por deducir) + un detalle de facturas (FACTURA | SUBCONTRATISTA | VAL | DESCRIPCION | MONTO SIN IGV | IGV | MONTO CON IGV | PAGADO | FECHA).
- **NÃºmeros clave:** Total facturas acum S/IGV **S/ 632,504.16** (mensual S/ 289,316.36). Por rubro (acum s/IGV): PRE/AMSA 23,445.35; IISS 1,679 (RECOSA contractual 55,729.70, facturado 42,907.47, saldo 12,822); PHE/ORANGE 15,750 (contractual 4,500); MT/R PROYECTOS 93,561.07 (contractual 90,611.28, facturado 46,018.80, saldo 44,592); ENC/EFCO 87,910.61 (incluye NC -3,047.03 por devoluciÃ³n de equipo); IMP/SURE 137,102.26 (contractual 137,102.26, facturado 130,247.15, saldo 117,434); ESTM/M&M 0 mostrado pero contractual 460,734.73, facturado 317,700.02, **amortizaciÃ³n 58,296.95**, saldo por deducir 143,035.
- **PropÃ³sito:** control de facturas y valorizaciÃ³n de subcontratistas (avance, amortizaciÃ³n de adelanto, deducciones, saldo por deducir, estado de pago); es la "pata Facturas/Subcontratos" del RO (Actual Cost de subcontratos).
- **Origen -> Destino:** sale de las facturas/valorizaciones de cada subcontratista; alimenta la columna **REGISTRO FACTURAS** del CR (F06) y el AC de subcontratos del RO.
- **AutomatizaciÃ³n:** **GAP â€” ValorizaciÃ³n de Subcontratistas (F10/F11) y Control de Facturas no existen** en GRAPCO. Destino propuesto: nuevo mÃ³dulo de Subcontratos (contrato, amortizaciÃ³n, deducciÃ³n, saldo, facturas con estado pagado/fecha) que alimente el AC del RO. Mientras tanto, importador genÃ©rico in-app cargando la hoja `CR` para el AC por partida. Nota: la cabecera dice "PRECOTEX LAS MORERAS" / cliente GRAPCO (plantilla heredada de otro proyecto) â€” revisar consistencia de proyecto al ingerir.

---

### \05. GestiÃ³n Costos\4. RE-RO\2026.05 RO_MAY CREDITEX\GP-GCE-FOR-F06_RO_CREDITEX 2026.05.31.xlsx
- **Tipo / formato:** Excel (.xlsx, 647 KB). Formato **GP-GCE-FOR-F06** â€” RESULTADO OPERATIVO (RO) consolidado con EVM. Rev 1, corte 31.05.2026, SEMANA 26.
- **Hojas (6):** `RO` | `CR` | `Adicionales` | `Deductivos` | `DASH` | `GG`
- **Contenido por hoja:**
  - `RO`: matriz EVM completa por FRENTE/PARTIDA. Bloques de columnas: **Presupuesto** [Ppto F1 (PTARI) | Ppto F2 (Nave) | Deductivos PQ-01/02 | Adicionales PQ-01/02 | Ppto Total (BAC)]; **Avance Programado** [PV F1 | PV F2 | PV Deductivos | PV Adicionales | Plan Value (PV)]; **Avance Valorizado** [Val F1 | Val F2 | Val Deductivos | Val Adicionales | Earn Value (EV)]; **Costo** [Real = Actual Cost (AC) | Margen VariaciÃ³n (CV) | Indicador CPI]; **Saldo** [teÃ³rico por ejecutar | costo por ejecutar | CPI]; **Estimado al tÃ©rmino** [Costo Total (EAC) | Margen (VAC) | %]; **SPI** (VariaciÃ³n del cronograma); columnas de comentarios + "ANALISIS DE DATA DE REGISTRO DE ALMACEN" y "ANALISIS DE DATA DEL ISP".
  - `CR` (Control Resumen / 4 patas del AC): consolida las fuentes del Actual Cost por partida. Columnas: REGISTRO FACTURAS | REGISTRO ALMACEN | CONTROL TAREOS | GASTOS GENERALES | TOTAL REGISTRO; y por cada una ACUM S/IGV inicial (02.05) + MENSUAL + ACUM final (31.05). TAREOS expresado en HH y HH Total con Costo MO prom S/ 25.50.
  - `Adicionales`: matriz por partida con PRESUPUESTO (PQ-01/PQ-02/Total), AVANCE PROGRAMADO y AVANCE VALORIZADO. Totales = 0 en este corte.
  - `Deductivos`: misma estructura; TOTAL COSTO DE OBRA = **-2,790.40** (deductivo del costo directo).
  - `DASH`: tablero del RO (Margen 1.00 / 1.08; PARTIDAS, CV, VAC). Indicador global 0.93.
  - `GG`: AnÃ¡lisis de Gastos Generales (proyecto "Laboratorio reproducciÃ³n clÃ³nica / Agromillora", Ica-Chincha-Alto LarÃ¡n â€” plantilla heredada). Gastos Generales Variables S/ 687,204.96; Fijos S/ 55,779.20; Utilidad 0.11; varios campos #REF!.
- **NÃºmeros clave (CR, acum S/IGV al 31.05):** TOTAL REGISTRO (AC total) **S/ 2,515,013.00**; por pata: Facturas 633,554; AlmacÃ©n 1,059,513.43; Tareos 479,578.76; Gastos Generales 342,366.81. Tareos: 18,807.01 HH (18,787.01 HH total) a S/ 25.50. Mensual: Facturas 343,187.80â†’290,366.20; AlmacÃ©n acum mensual 36,396.57; GG 284,857.11â†’57,509.70. Costo directo total registro S/ 2,082,293.08. Deductivo S/ -2,790.40. Indicador costo global 0.93; mÃ¡rgenes DASH 1.00 / 1.08.
- **PropÃ³sito:** documento maestro de control de costos del proyecto â€” integra Presupuesto (BAC), Programado (PV), Valorizado (EV), Actual Cost (AC, 4 patas) y calcula CV/CPI/SPI/EAC/VAC por partida y total. Es el F06 oficial.
- **Origen -> Destino:** consolida F07 valorizaciones (EV: Val F1/F2/Adic/Deduct), F07 almacÃ©n (AC materiales), F07 facturas (AC subcontratos), ISP/tareos (AC mano de obra a S/25.50), y GG. Es el entregable de control de costos del RO mensual.
- **AutomatizaciÃ³n:** nÃºcleo del mÃ³dulo **Resultado Operativo (RO/CR/F06 + EVM)** â€” ya vivo y automÃ¡tico en GRAPCO (useRO, 4 patas del AC + GG + EV valorizado + adicionales/deductivos, export PDF). Las 4 patas mapean: Facturas->Subcontratos (GAP, ver arriba), AlmacÃ©n->importador S10, Tareos->ISP (HH x 25.5), GG->mÃ³dulo GG. Adicionales/Deductivos->mÃ³dulo Adicionales/Deductivos. DASH->Dashboard RO. Nota: la hoja `GG` trae datos de otra obra (Agromillora) y celdas #REF! â€” limpiar antes de ingerir.



---

# CategorÃ­a 5 â€” APU Partidas Adicionales (CREDITEX PTARI/NAVE)

Fichas detalladas por archivo del chunk `cat_5_APU_Partidas_Adicionales.txt`.
Carpeta origen: `\05. GestiÃ³n Costos\5. APU Partidas Adicionales\`

---

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\1. Superado\GP-GCE-FOR-F05-AD NÂ°01  Rev.01.xlsx
- **Tipo / formato:** xlsx. Formatos internos: el resumen es **PRO-GCE-FOR-F03** (Adicional de Obra / Presupuesto Adicional) y las hojas de detalle **PRO-GCE-FOR-F05** (MAT / MO / APU). El propio nombre de archivo es **GP-GCE-FOR-F05-AD NÂ°01 Rev.01**. Carpeta "1. Superado" = versiÃ³n descartada/obsoleta.
- **Hojas:** CarÃ¡tula | 1. Resumen | 1. MAT | 2. MO | 3. APU
- **Contenido:**
  - **CarÃ¡tula:** Obra "PTARI CREDITEX", ubicaciÃ³n AV. LOS HORNOS 185, ATE; denominaciÃ³n "CERCO PERIMÃ‰TRICO INTERIOR"; RevisiÃ³n NÂ°01; fecha 02-Nov-2025.
  - **1. Resumen (PRO-GCE-FOR-F03):** cabecera de Adicional de Obra NÂ° 1. Obra PTARI CREDITEX, Cliente CREDITEX, Contratista GRAPCO S.A.C., denominaciÃ³n "Cerco PerimÃ©trico Interior", plazo **7 dÃ­as**. Tabla "1.- PRESUPUESTO ADICIONAL" con columnas: ITEM | DESCRIPCIÃ“N | UND | CANTIDAD | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.) (+27 filas no volcadas con el detalle de partidas).
  - **1. MAT (PRO-GCE-FOR-F05):** despiece de MATERIALES del cerco perimÃ©trico (cerco de dos partes, parte superior de malla rashel). Columnas tipo recurso/unidad/cantidad/precio (+8 filas).
  - **2. MO (PRO-GCE-FOR-F05):** despiece de MANO DE OBRA del mismo cerco (+9 filas).
  - **3. APU (PRO-GCE-FOR-F05):** AnÃ¡lisis de Precio Unitario (Mano de Obra). Columnas: ITEM | DESCRIPCIÃ“N | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.) | SUB TOTAL (S/.). Primera partida visible "HABILITACION DE PANELES (MO)" UND MODULO, valor 33.99 (+33 filas).
- **NÃºmeros clave:** Plazo 7 dÃ­as; partida "HABILITACION DE PANELES (MO)" = 33.99 S/. por mÃ³dulo. Resto de totales del adicional en las +27 filas no volcadas.
- **PropÃ³sito:** sustento de costos (presupuesto + APU) del Adicional de Obra NÂ°01 "Cerco PerimÃ©trico Interior". VersiÃ³n SUPERADA (reemplazada por la aprobada de la carpeta "3. APU Aprobados").
- **Origen -> Destino:** datos de cantidades de obra y precios de recursos (MAT/MO) -> consolidan el Presupuesto Adicional NÂ°01 -> sustenta cobro adicional al cliente CREDITEX.
- **AutomatizaciÃ³n:** mÃ³dulo **Adicionales/Deductivos** de GRAPCO (cabecera Adicional NÂ°01) + mÃ³dulo **Presupuesto (BAC)** para el APU. Como es versiÃ³n superada, marcar histÃ³rico/no-vigente; la vigente es la Rev.02 aprobada (ver abajo). Ingesta vÃ­a importador genÃ©rico in-app mapeando hojas F03 (resumen) y F05 (MAT/MO/APU).

---

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\1. Hilti\119994 - Grapco opciÃ³n 2 (2).pdf
- **Tipo / formato:** pdf (no-Excel). CotizaciÃ³n HILTI a GRAPCO (oferta NÂ°119994, opciÃ³n 2).
- **PropÃ³sito:** sustento de precio de proveedor para anclajes de encofrado (alternativa HILTI). Insumo del comparativo de pernos.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\1. Hilti\119994 - Grapco.pdf
- **Tipo / formato:** pdf (no-Excel). CotizaciÃ³n HILTI a GRAPCO (oferta NÂ°119994, opciÃ³n base).
- **PropÃ³sito:** cotizaciÃ³n proveedor HILTI para anclajes/varillas, sustento de costo del APU de anclaje de encofrado.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\1. Hilti\Datos tÃ©cnicos de varillas de anclaje HILTI.pdf
- **Tipo / formato:** pdf (no-Excel). Ficha tÃ©cnica de varillas de anclaje HILTI.
- **PropÃ³sito:** soporte tÃ©cnico (resistencias, diÃ¡metros) para justificar la soluciÃ³n de anclaje. No es dato de costo directo.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\1. Hilti\Ficha TÃ©cnica HIT-RE 500 V3.pdf
- **Tipo / formato:** pdf (no-Excel, 4.4 MB). Ficha tÃ©cnica adhesivo epÃ³xico HILTI HIT-RE 500 V3.
- **PropÃ³sito:** sustento tÃ©cnico del adhesivo de inyecciÃ³n usado en el anclaje (consumo por perno). Apoya cantidades del APU.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\2. Multipernos PerÃº\COTIZACION DIAMETRO 1 1_2_.jpeg
- **Tipo / formato:** jpeg (imagen). CotizaciÃ³n Multipernos PerÃº, diÃ¡metro 1 1/2".
- **PropÃ³sito:** sustento de precio proveedor alternativo (Multipernos) por diÃ¡metro de espÃ¡rrago.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\2. Multipernos PerÃº\COTIZACION DIAMETRO 1 1_4_.jpeg
- **Tipo / formato:** jpeg (imagen). CotizaciÃ³n Multipernos PerÃº, diÃ¡metro 1 1/4".
- **PropÃ³sito:** sustento de precio proveedor por diÃ¡metro de perno.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\2. Multipernos PerÃº\COTIZACION DIAMETRO 1_.jpeg
- **Tipo / formato:** jpeg (imagen). CotizaciÃ³n Multipernos PerÃº, diÃ¡metro 1".
- **PropÃ³sito:** sustento de precio proveedor por diÃ¡metro de perno.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\2. Multipernos PerÃº\ESPARRAGO ASTM 193 B7 1-  8  X  3.66 MT..pdf
- **Tipo / formato:** pdf (no-Excel). CotizaciÃ³n/hoja de espÃ¡rrago ASTM A193 B7 1/8" x 3.66 m (Multipernos).
- **PropÃ³sito:** sustento de precio y especificaciÃ³n del espÃ¡rrago como alternativa de anclaje.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\2. Multipernos PerÃº\FICHA TECNICA ESPARRAGO ASTM A193 B7 1X3.66MT (2) (2).pdf
- **Tipo / formato:** pdf (no-Excel). Ficha tÃ©cnica espÃ¡rrago ASTM A193 B7 1" x 3.66 m.
- **PropÃ³sito:** soporte tÃ©cnico (resistencia) de la alternativa Multipernos.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\3. Sikadur\sikadur_-31_hi-modgel.pdf
- **Tipo / formato:** pdf (no-Excel). Ficha tÃ©cnica Sikadur 31 Hi-Mod Gel (adhesivo epÃ³xico).
- **PropÃ³sito:** sustento tÃ©cnico del adhesivo Sika usado como alternativa de fijaciÃ³n de pernos.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\4. ModulaciÃ³n EFCO\P360439 GRAPCO SAC - Encofrado de muro a una cara.pdf
- **Tipo / formato:** pdf (no-Excel). Propuesta/modulaciÃ³n EFCO (P360439) para encofrado de muro a una cara.
- **PropÃ³sito:** sustento tÃ©cnico-econÃ³mico del sistema de encofrado a una cara (cantidades/equipos) que origina la necesidad de anclajes.

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\4. ModulaciÃ³n EFCO\P360439 GRAPCO SAC - Encofrado de muros a dos caras.pdf
- **Tipo / formato:** pdf (no-Excel). Propuesta/modulaciÃ³n EFCO (P360439) para encofrado de muros a dos caras.
- **PropÃ³sito:** sustento tÃ©cnico de la modulaciÃ³n de encofrado a dos caras; insumo de cantidades para el comparativo de anclajes.

---

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Anclaje Encofrado\COMPARATIVO PERNOS.xlsx
- **Tipo / formato:** xlsx (2.9 MB). Sin cÃ³digo de formato GP/PRO (hoja de trabajo interna de anÃ¡lisis de costos).
- **Hojas:** Comparativo | ALTERNATIVA 5 | ALTERNATIVA 1 | MULTIPERNOS | HILTI | SIKA
- **Contenido:**
  - **Comparativo:** "COMPARATIVO PARA ANCLAJES DE ENCOFRADO". Cinco alternativas en columnas con su costo total y ratio relativo (T.C. 3.60):
    - ALT 1 â€” Anclajes HILTI L=16" (corte y tracciÃ³n): **S/ 21,079.30** (ratio 1.00 = base).
    - ALT 2 â€” Anclajes HILTI L=16" para corte + M(...): **S/ 13,814.03** (ratio 0.66).
    - ALT 3 â€” Anclajes Multipernos (corte y tracciÃ³n): **S/ 18,057.58** (ratio 0.86).
    - ALT 4 â€” Anclajes Multipernos (corte y tracciÃ³n ...): **S/ 9,985.58** (ratio 0.47).
    - ALT 5 â€” Anclajes Multipernos (tracciÃ³n) con pe(...): **S/ 9,334.50** (ratio 0.44, la mÃ¡s barata).
    - Despiece de la ALT 1: MARCA|LÃ­nea|Producto|DescripciÃ³n|CANT|UND|PU(S/.)|Subtotal(S/.)|PU(USD)|Subtotal(USD). Ej.: HILTI 2198013 "Varilla anclaje HAS-E-55 1-1/4"x16"" 35 PAQ x 514.69 = S/ 18,014.22 (USD 142.97 = 5,003.95); HILTI 2123404 "Adhesivo inyect. HIT-RE 500 V3/500/1" 10 UND x 223.09 = S/ 2,230.92 (+52 filas con el resto del despiece y demÃ¡s alternativas).
  - **ALTERNATIVA 5:** metrados de LISTONES y PUNTALES por muro (esquema modulaciÃ³n EFCO): MURO1 9/27, MURO2 9/24, MURO3 9/21; totales 27 listones / 72 puntales. Incluye detalle de elementos (poste metÃ¡lico, solera 3"x3").
  - **ALTERNATIVA 1:** misma estructura de metrado pero en cero (0 listones / 0 puntales) â€” alternativa que no usa listones/puntales.
  - **MULTIPERNOS:** metrado de barras para Multipernos al 100% y 50%. Al 100%: MURO1/2/3 con 26/24/20 barras de L=0.50 m, longitudes totales 14.30/13.20/11.00 ml, barra de 3.60 ml â†’ 4 barras c/u (total 12 barras). Al 50%: 13/12/10 barras (total reducido).
  - **HILTI:** metrado de barras HILTI al 100% y 50% por muro. 100%: MURO1/2/3 = 26/24/20 barras â†’ paquetes 13/12/10 = **35 paquetes**. 50%: 13/12/10 barras = 17.50 paquetes. Tabla resistencias: tracciÃ³n **404.10 kN**, corte **210.20 kN**.
  - **SIKA:** consumo de Sikadur 31: 0.04 kg por perno, 87 pernos â†’ cantidad 4 (kg/und de Sikadur necesario).
- **NÃºmeros clave:** Total alternativa mÃ¡s cara S/ 21,079.30 (ALT1 HILTI); mÃ¡s barata S/ 9,334.50 (ALT5 Multipernos). T.C. 3.60. 35 paquetes HILTI (100%). Resistencia HILTI tracciÃ³n 404.10 kN / corte 210.20 kN. Sikadur 0.04 kg/perno x 87 pernos.
- **PropÃ³sito:** anÃ¡lisis comparativo de costo (decisiÃ³n de compra/optimizaciÃ³n) entre proveedores y configuraciones de anclaje para encofrado; selecciona la alternativa mÃ¡s econÃ³mica que cumpla resistencias. Genera el costo de material que entra al APU de "Anclaje Encofrado".
- **Origen -> Destino:** cotizaciones de proveedores (HILTI / Multipernos / Sika PDFs+JPEGs) + metrados de modulaciÃ³n EFCO -> comparativo de costos -> precio de material del APU de anclaje -> sustento de partida adicional / control de costo de encofrado.
- **AutomatizaciÃ³n:** anÃ¡lisis de soporte, no transaccional. GAP â€” no hay mÃ³dulo de "comparativo de cotizaciones/decisiÃ³n de compra" en GRAPCO. El resultado (precio unitario elegido del material de anclaje) sÃ­ alimenta un **APU en Presupuesto (BAC)**. Recomendable: cargar solo el PU final seleccionado como recurso material; el comparativo queda como adjunto/documento de sustento (GAP de gestiÃ³n documental de costos).

---

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\2. Proceso\APU-Calzadura\ANALISIS DE APU - CALZADURAS Rev.01.xlsx
- **Tipo / formato:** xlsx. Hoja de trabajo de APU de calzaduras (Rev.01). Sin cÃ³digo GP/PRO visible.
- **Hojas:** APU | YIREH | UNICON | MIXERCON
- **Contenido:**
  - **APU:** AnÃ¡lisis de precio unitario de "CONCRETO CICLOPEO 1:10 PARA CALZADURAS", UND M3, **PU = S/ 378.65** (marcado "Contractual"). Rendimiento diario 12 M3. Estructura por recursos:
    - **Mano de Obra (subtotal S/ 187.00):** CAPATAZ HH cuadrilla 0.10 cant 0.07 x 29.56 = 2.09; OPERARIO HH 4.00 / 2.83 x 26.88 = 76.15; PEON HH 8.00 / 5.67 x 19.19 = 108.76.
    - **Materiales (subtotal S/ 172.65):** PIEDRA CHANCADA 1" 0.53 M3 x 69.54 = 36.51; ARENA GRUESA 0.38 M3 x 46.02 = 17.26 (+41 filas con cemento, agua, equipos y resto del despiece).
  - **YIREH:** vacÃ­a.
  - **UNICON:** vacÃ­a.
  - **MIXERCON:** vacÃ­a (las 3 hojas de proveedores de concreto estÃ¡n vacÃ­as; serÃ­an cotizaciones comparativas de concreto premezclado no llenadas).
- **NÃºmeros clave:** PU concreto ciclÃ³peo 1:10 calzaduras = **S/ 378.65/M3** (contractual); MO S/ 187.00, MAT S/ 172.65; rendimiento 12 M3/dÃ­a. Tarifas HH: Capataz 29.56, Operario 26.88, PeÃ³n 19.19. (Nota: estas tarifas por cargo difieren del costo MO Ãºnico S/25.50/h de la plataforma GRAPCO.)
- **PropÃ³sito:** sustento del precio unitario de la partida de calzaduras (concreto ciclÃ³peo) como APU adicional; comparar contra cotizaciones de concreto premezclado (YIREH/UNICON/MIXERCON).
- **Origen -> Destino:** rendimientos y tarifas de recursos + (cotizaciones de proveedores, pendientes) -> APU de calzaduras -> presupuesto/partida adicional -> sustento de cobro y control de costo.
- **AutomatizaciÃ³n:** mÃ³dulo **Presupuesto (BAC)** como APU de partida (recursos MO/MAT/EQ). Las hojas de proveedores vacÃ­as = GAP de comparativo de cotizaciones. Ingesta vÃ­a importador genÃ©rico mapeando la hoja APU (recurso, und, cuadrilla, cantidad, precio, parcial).

---

### \05. GestiÃ³n Costos\5. APU Partidas Adicionales\3. APU Aprobados (S)\APU NÂ°01 Cerramiento Cerco Interno\GP-GCE-FOR-F05-APU NÂ°01 Rev.02.xlsx
- **Tipo / formato:** xlsx. Formato **GP-GCE-FOR-F05-APU NÂ°01 Rev.02** (APU APROBADO, versiÃ³n vigente). Resumen interno PRO-GCE-FOR-F03, hojas detalle PRO-GCE-FOR-F05.
- **Hojas:** CarÃ¡tula | 1. APU_01 | 1. MAT | 2. MO | 3. MO_APU
- **Contenido:**
  - **CarÃ¡tula:** PTARI CREDITEX, AV. LOS HORNOS 185 ATE, "CERCO PERIMÃ‰TRICO INTERIOR", RevisiÃ³n NÂ°01, fecha 02-Nov-2025.
  - **1. APU_01 (PRO-GCE-FOR-F03):** "ANÃLISIS DE PRECIO UNITARIO DE OBRA NÂ° 1". Obra PTARI CREDITEX, Cliente CREDITEX, Contratista GRAPCO S.A.C., denominaciÃ³n Cerco PerimÃ©trico Interior, plazo **7 dÃ­as**. Tabla "1.- PRECIO UNITARIO": ITEM | DESCRIPCIÃ“N | UND | CANTIDAD | P.U. (S/.) | PARCIAL (S/.) | TOTAL (S/.) (+27 filas).
  - **1. MAT (PRO-GCE-FOR-F05):** materiales del cerco perimÃ©trico (dos partes, parte superior malla rashel) (+8 filas).
  - **2. MO (PRO-GCE-FOR-F05):** mano de obra del cerco (+9 filas).
  - **3. MO_APU (PRO-GCE-FOR-F05):** APU de mano de obra. Columnas ITEM | DESCRIPCIÃ“N | UND | CUADRILLA | CANTIDAD | PRECIO (S/.) | PARCIAL (S/.) | SUB TOTAL (S/.). Aparece valor 8.89 en cabecera (fila 6) y primera partida "HABILITACION DE PANELES (MO)" UND MODULO = 33.99 (+33 filas).
- **NÃºmeros clave:** Plazo 7 dÃ­as; "HABILITACION DE PANELES (MO)" = 33.99 S/./mÃ³dulo; valor 8.89 en cabecera del MO_APU. Totales del APU en las +27 filas no volcadas. Es la versiÃ³n **Rev.02 APROBADA** (vigente) frente a la Rev.01 superada.
- **PropÃ³sito:** APU NÂ°01 aprobado del "Cerramiento Cerco Interno" â€” sustento oficial de precio unitario de la partida adicional NÂ°01 ante CREDITEX. VersiÃ³n vigente para valorizaciÃ³n/cobro.
- **Origen -> Destino:** metrados y precios de recursos (MAT/MO) -> APU NÂ°01 aprobado -> partida del Adicional NÂ°01 -> valorizaciÃ³n de adicionales al cliente CREDITEX.
- **AutomatizaciÃ³n:** mÃ³dulo **Adicionales/Deductivos** (APU/partida NÂ°01 aprobada, estado "Aprobado") + **Presupuesto (BAC)** para el APU. Marcar como vigente (Rev.02) sustituyendo la Rev.01 de "1. Superado". Ingesta vÃ­a importador genÃ©rico mapeando F03 (precio unitario) y F05 (MAT/MO/APU). Una vez aprobado, su valorizaciÃ³n entra al **RO** como adicional valorizado.

---

## Resumen de la categorÃ­a
- **3 archivos Excel** (1 adicional superado, 1 comparativo de pernos, 1 APU calzaduras) + **1 APU aprobado** Excel = 4 Excel; **12 documentos no-Excel** (PDF/JPEG de cotizaciones y fichas tÃ©cnicas de proveedores).
- NÃºcleo: sustento de costos de **partidas adicionales** (Adicional NÂ°01 Cerco PerimÃ©trico Interior â€” vigente Rev.02 aprobada) y APU en proceso (Anclaje de Encofrado, Calzaduras).
- Las cotizaciones de proveedores (HILTI, Multipernos, Sika, EFCO, YIREH/UNICON/MIXERCON) alimentan los APU pero no tienen mÃ³dulo propio en GRAPCO (GAP comparativo de cotizaciones / decisiÃ³n de compra).



---

# CATALOGO COSTOS â€” Categoria 6. ISP (Informe Semanal de Produccion) â€” chunk cat_6_ISP__p1

Formato corporativo: **PRO-GCR-FOR-F01** (ISP / Control de Rendimientos). Proyecto CREDITEX (PTARI+NAVE).
Todos los archivos son la **misma cadena evolutiva** del ISP semana a semana (snapshots acumulados): cada libro nuevo agrega una hoja `ISP-SEMnn` y conserva las anteriores. Es decir, el archivo de la semana mas alta contiene toda la historia.

Estructura comun de cada libro:
- **PARTIDAS CONTROL**: maestro/catalogo de partidas de control con CODIGO (1001, ...) y UND (GLB, MES, M2, etc.). Es la lista WBS de control de rendimientos (â‰ˆ70 filas). Bloques: TRABAJOS PRELIMINARES (1001), SEGURIDAD Y SALUD, etc.
- **CR** (Control de Rendimientos / Costo Real): resumen de costo de obra a partir de tareos. Costo MO prom = **S/25** (no 25.5 en estos libros). Columnas: FRENTE | PARTIDA (FA01...) | codigo (1.01...) | Descripcion | HH | COSTO | ACUM S/ IGV. Filas TOTAL COSTO DE OBRA / COSTO DIRECTO + desglose por partida.
- **ISP-SEMnn** (una por semana): matriz ancha (B1:BM~1100). Por cada partida de control: PREVISION (PPTO OFERTA/PPTO1, ADICIONALES, TOTAL(0), PPTO META) con METRADO/HH/IP; ACUMULADO ANTERIOR; META/VAR/CPI; luego dia por dia (LUNES..DOMINGO) con METRADO/HH/REND(IP); cierre PRESENTE SEMANA + META/VAR/CPI. Indicador clave = **IP (Indice de Productividad / rendimiento) y CPI**. Encabezado "INFORME SEMANAL DE PRODUCCION".

> Nota: muchas celdas de las hojas ISP muestran `#DIV/0!` y `#REF!` (formulas sin datos / referencias rotas) en las filas de totales â€” son errores del Excel original, no datos.

---

### \05. Gestion Costos\6. ISP\1. Superado\10-12-2025\PRO-GCR-FOR-F01_ISP CREDITEX SEM04.xlsx
- Tipo / formato: xlsx â€” **PRO-GCR-FOR-F01** (ISP). Subcarpeta fechada 10-12-2025 (version de corte). 1072 KB.
- Hojas (6): PARTIDAS CONTROL | CR | ISP-SEM01 | ISP-SEM02 | ISP-SEM03 | ISP-SEM04
- Contenido:
  - PARTIDAS CONTROL: maestro WBS (~70 partidas), CODIGO 1001 TRABAJOS PRELIMINARES, UND.
  - CR: Costo MO prom S/25; TOTAL COSTO DE OBRA y COSTO DIRECTO = **221.50 HH / S/5 537.50** (acum al 01.12.25). Desglose: TRABAJOS PRELIMINARES 7 HH / S/175.
  - ISP-SEM01..04: semanas 03/11â€“30/11/2025. SEM01 base 879.52 (metrado/HH meta acumulada parcial); registros diarios METRADO/HH/REND por partida.
- Numeros clave: 221.50 HH; S/5 537.50 costo directo/obra; meta acum ISP referencia 27309 / 40711.88 (HH meta presupuesto).
- Proposito: control semanal de produccion y rendimiento (IP/CPI) vs presupuesto meta; base del Resultado Operativo de mano de obra.
- Origen -> Destino: tareos de campo (HH por partida/dia) + metrados -> CR (costo) e ISP (IP/CPI) -> insumo del RO/Curva S de avance fisico.
- Automatizacion: hojas ISP = fuente del **modulo ISP (tareos HH x S/25.5) + EVM** de GRAPCO; CR = alimenta **Resultado Operativo (CR/F06)**. PARTIDAS CONTROL = catalogo WBS. Importable via importador generico mapeando partida-codigo. (version fechada = duplicado historico de SEM04).

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM04.xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 1079 KB.
- Hojas (6): PARTIDAS CONTROL | CR | ISP-SEM01..SEM04
- Contenido: identico al anterior pero **CR en cero** (TOTAL COSTO DE OBRA = 0 HH / S/0 / S/0) â€” es la version sin costos cargados aun (ISP con metrados/HH diarios poblados pero CR no recalculado). ISP-SEM01 muestra PRESENTE SEMANA 239 HH, IP/CPI 0.51.
- Numeros clave: CR = 0; meta presupuesto HH 40711.88; SEM01 presente semana 239 HH, CPI 0.51.
- Proposito: ISP de produccion semanas 1â€“4; CR pendiente de costeo.
- Origen -> Destino: igual que arriba (tareos+metrados -> ISP/CR -> RO).
- Automatizacion: usar la version con CR poblado para el RO; esta sirve solo para metrados/HH del ISP.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM05.xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 1297 KB.
- Hojas (7): PARTIDAS CONTROL | CR | ISP-SEM01..SEM05
- Contenido: agrega ISP-SEM05 (01/12â€“07/12/2025). CR poblado: TOTAL COSTO DE OBRA **432.50 HH / S/25 775 / acum S/25 975**; COSTO DIRECTO 378.50 HH / S/24 425 / S/24 625. TRABAJOS PRELIMINARES 14 HH / S/350; TOPOGRAFIA 8 HH / S/200.
- Numeros clave: 432.50 HH; S/25 775 costo; S/25 975 acum; CD 378.50 HH / S/24 425.
- Proposito: control acumulado a SEM05 (costo real MO + IP/CPI por partida).
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM y Curva S.
- Automatizacion: CR -> Resultado Operativo; ISP-SEM05 -> modulo ISP/EVM (CPI por partida).

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM06.xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 1505 KB.
- Hojas (8): PARTIDAS CONTROL | CR | ISP-SEM06..SEM01 (orden descendente)
- Contenido: agrega ISP-SEM06 (08/12â€“14/12/2025). CR: TOTAL COSTO DE OBRA **565 HH / S/30 375 / acum S/30 725**; COSTO DIRECTO 498.50 HH / S/28 712.50 / S/29 062.50. SEM06 presente semana 265 HH; SEM05 acum ISP 1427.50 HH meta vs CPI ~5.39 (errores de formula presentes).
- Numeros clave: 565 HH; S/30 375; acum S/30 725; CD 498.50 HH / S/28 712.50.
- Proposito: ISP/CR acumulado a SEM06.
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM/Curva S.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM07.xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 1722 KB.
- Hojas (9): PARTIDAS CONTROL | CR | ISP-SEM07..SEM01
- Contenido: agrega ISP-SEM07. CR: TOTAL COSTO DE OBRA **610 HH / S/33 075 / acum S/34 675**; COSTO DIRECTO 522 HH / S/30 875 / S/32 475.
- Numeros clave: 610 HH; S/33 075; acum S/34 675; CD 522 HH / S/30 875.
- Proposito: ISP/CR acumulado a SEM07.
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM/Curva S.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM08.xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 1949 KB.
- Hojas (10): PARTIDAS CONTROL | CR | ISP-SEM08..SEM01
- Contenido: agrega ISP-SEM08. CR: TOTAL COSTO DE OBRA **1725 HH / S/43 125 / acum S/43 125**; COSTO DIRECTO 1621 HH / S/40 525 / S/40 525. (Salto grande de HH respecto a SEM07: pico de mano de obra.)
- Numeros clave: 1725 HH; S/43 125; CD 1621 HH / S/40 525.
- Proposito: ISP/CR acumulado a SEM08.
- Origen -> Destino: tareos+metrados -> CR/ISP -> RO/EVM/Curva S.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM12 .xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 2880 KB.
- Hojas (15): PARTIDAS CONTROL | CR | **Control** | ISP-SEM12..SEM01
- Contenido:
  - Aparece hoja nueva **Control** (B3:M27): conciliacion HH ADMINISTRACION (planilla) vs CAMPO (ISP). Columnas: SEMANA | HH PLANILLA | HH PLANILLA ACUM | HH CAMPO semanal | HH CAMPO ACUM | CONTROL HH CAMPO ACUM (isp) | DELTA HH ACUM | HH PLANILLA ACUM | HH CAMPO ACUM | DELTA HH ADM VS CAMPO. Ej: SEM1 238/239 (delta -1); SEM7 acum planilla 1961 vs campo 1946.50 (delta 14.50). Total HH planilla referencia 5624; campo 5608.50.
  - CR: TOTAL COSTO DE OBRA **5608.37 HH / S/92 375 / acum S/140 209.24**; COSTO DIRECTO 5439.37 HH / S/88 150 / S/135 984.24. TRABAJOS PRELIMINARES 1507.12 HH / S/8 743.75 / S/37 677.99; SS.OO 349.75 HH; TOPOGRAFIA 349 HH.
  - Salta de SEM08 a SEM12 (hoja SEM12 fechada con dias Jan 19â€“22 2026; las semanas 9â€“11 incluidas como hojas).
- Numeros clave: **5608.37 HH; S/92 375; acum S/140 209.24**; CD S/88 150 / S/135 984.24; HH planilla 5624 vs campo 5608.50.
- Proposito: control acumulado a SEM12 + conciliacion HH planilla vs campo (delta administrativo).
- Origen -> Destino: tareos campo + planilla RR.HH. -> hoja Control (delta) y CR (costo) -> RO/EVM. La conciliacion planilla-vs-campo es insumo de control de planilla.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM; **hoja Control = GAP (Control de Planilla / conciliacion HH administracion vs campo, no existe en GRAPCO)**.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM13 .xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 3121 KB.
- Hojas (16): PARTIDAS CONTROL | CR | Control | ISP-SEM13..SEM01
- Contenido: agrega ISP-SEM13. CR: TOTAL COSTO DE OBRA **6477.50 HH / S/108 700 / acum S/161 937.50**; COSTO DIRECTO 6282.50 HH / S/103 825 / S/157 062.50. Mantiene hoja Control (planilla vs campo).
- Numeros clave: **6477.50 HH; S/108 700; acum S/161 937.50**; CD S/103 825 / S/157 062.50.
- Proposito: ISP/CR + conciliacion acumulado a SEM13.
- Origen -> Destino: tareos+metrados+planilla -> CR/ISP/Control -> RO/EVM.
- Automatizacion: CR -> RO; ISP -> modulo ISP/EVM; Control -> GAP Control de Planilla.

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM14 .xlsx
- Tipo / formato: xlsx â€” PRO-GCR-FOR-F01 (ISP). 3405 KB. Libro mas reciente del chunk (historia completa S1â€“S14).
- Hojas (17): PARTIDAS CONTROL | CR | Control | ISP-SEM14..SEM01
- Contenido: agrega ISP-SEM14. CR identico a SEM13: TOTAL COSTO DE OBRA **6477.50 HH / S/108 700 / acum S/161 937.50**; CD 6282.50 HH / S/103 825 / S/157 062.50 (CR aun no recalculado para SEM14, repite SEM13). Algunas filas ISP muestran cierres negativos (-1008.51, -1000.23) = variaciones/errores de formula.
- Numeros clave: 6477.50 HH; acum S/161 937.50 (= valores de SEM13).
- Proposito: snapshot consolidado a SEM14 (contiene todo el historial semanal).
- Origen -> Destino: tareos+metrados+planilla -> CR/ISP/Control -> RO/EVM/Curva S.
- Automatizacion: **este libro es el recomendado para ingesta** (14 semanas en uno). CR -> RO; ISP-SEMnn -> modulo ISP/EVM (CPI por partida y semana); PARTIDAS CONTROL -> catalogo WBS; Control -> GAP Control de Planilla.

---

## Resumen del chunk
- 9 archivos, todos PRO-GCR-FOR-F01 (cadena ISP semanal acumulativa SEM04â†’SEM14 de CREDITEX). El de SEM14 es superconjunto.
- Indicadores clave: IP/CPI por partida y semana; HH y costo MO @ S/25; conciliacion HH planilla vs campo.
- Mapeo GRAPCO: ISP -> modulo ISP (tareos HH x S/25.5) + EVM; CR -> Resultado Operativo (CR/F06); PARTIDAS CONTROL -> catalogo WBS; Curva S desde avance.
- GAP detectado: hoja **Control** (Control de Planilla / conciliacion HH administracion vs campo) no tiene destino en GRAPCO.



---

# Categoria 6. ISP (continuacion 2) â€” Fichas detalladas

Chunk: `cat_6_ISP__p2`. Contiene 2 libros maestros del Informe Semanal de Produccion (ISP) del proyecto CREDITEX (PTARI F1 + NAVE F2). Cada libro es un xlsx grande (3.6â€“4.0 MB) con la misma arquitectura: hojas de configuracion (PARTIDAS CONTROL, CR, Control) + N hojas ISP-SEMxx que son fotos acumuladas por semana. SEM16 es la version mas reciente (incluye una semana mas que SEM15).

Codigo de formato: **PRO-GCR-FOR-F01** (formato ISP del area de Gestion de Costos / Control de Resultados, GCR).

---

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM15 .xlsx
- **Tipo / formato:** xlsx â€” `PRO-GCR-FOR-F01` (Informe Semanal de Produccion, ISP). Esta en subcarpeta "1. Superado" (version reemplazada por SEM16).
- **Hojas (18):** PARTIDAS CONTROL | CR | Control | ISP-SEM15 | ISP-SEM14 | ISP-SEM13 | ISP-SEM12 | ISP-SEM11 | ISP-SEM10 | ISP-SEM09 | ISP-SEM08 | ISP-SEM07 | ISP-SEM06 | ISP-SEM05 | ISP-SEM04 | ISP-SEM03 | ISP-SEM02 | ISP-SEM01.
- **Contenido por hoja:**
  - **PARTIDAS CONTROL** (B1:L992): catalogo de partidas de control con CODIGO (ej. 1001 = TRABAJOS PRELIMINARES) y UND. Estructura jerarquica: capitulo (1 TRABAJOS PRELIMINARES) -> subpartida (SEGURIDAD Y SALUD OCUPACIONAL) -> items con unidad (ALQUILER DE ANDAMIOS PARA TRABAJOS=GLB, MITIGACION DE POLVO=MES, LIMPIEZA GENERAL=MES, SEÃ‘ALIZACION TEMPORAL=GLB, ILUMINACION DE ACCESOS=GLB). Es la lista maestra de partidas (WBS de control) que alimenta validaciones de las hojas ISP.
  - **CR** (Control de Resultados, B1:H1019): tabla de costo de obra acumulado por partida. Encabezado "Costo MO prom: 25". Columnas: FRENTE (PRE1, PRE2, codigo FA01) | PARTIDA (1.01, 1.02) | Descripcion | REPORTE TAREOS: HH | COSTO | ACUM S/ IGV (con corte de fecha 01.12.25). Totales arriba: TOTAL COSTO DE OBRA y COSTO DIRECTO; luego desglose por capitulo y partida (1 TRABAJOS PRELIMINARES, 1.01 SEGURIDAD Y SALUD OCUPACIONAL, 1.02 TOPOGRAFIA...).
  - **Control** (B3:Q37): cuadro comparativo HH ADMINISTRACION (planilla) vs CAMPO vs ISP, semana a semana. Columnas: SEMANA | HH PLANILLA | HH PLANILLA ACUM. | HH CAMPO semanal | HH CAMPO ACUM. | CONTROL HH CAMPO ACUM. (isp) | DELTA HH ACUM | (bloque COMPARATIVO) HH PLANILLA ACUM. | HH CAMPO ACUM. | DELTA HH ADM VS CAMPO. Concilia las tres fuentes de HH.
  - **ISP-SEMxx (15 hojas, SEM01..SEM15)** (rangos ~B1:BMxxxx / BPxxxx): cada hoja es el ISP de una semana, ACUMULADO. Encabezados: "INFORME SEMANAL DE PRODUCCION (ISP) CR" con NÂ° de semana y rango de fechas (SEM01 = 03/11/2025â€“09/11/2025 ... SEM05 = 01/12/2025â€“07/12/2025; las hojas SEM06+ arrastran un titulo "SEMANA NÂ° 06 08/12/2025 14/12/2025" no actualizado). Columnas: CODIGO | PARTIDA DE CONTROL PRESUPUESTO | UND | bloques PREVISION (METRADO/HH/IP) para PPTO OFERTA PTAR-F1, PPTO OFERTA NAVE-F2, ADICIONALES, TOTAL, PPTO META | ACUMULADO ANTERIOR (METRADO/HH/IP) | META | VAR | CPI | luego columnas diarias LUNES..DOMINGO (METRADO/HH/IP por dia, con fecha real GMT-0500) | PRESENTE SEMANA (METRADO/HH/IP, HH meta, VAR, %) | META/VAR/CPI acumulado. Las primeras hojas (SEM01..SEM13) tienen un solo bloque "PPTO OFERTA PPTO 1"; a partir de SEM14/SEM15 se abre en dos frentes "PPTO OFERTA PTAR - F1" y "PPTO OFERTA NAVE - F2". IP = indice de productividad (HH/metrado), IP Meta = referencia presupuesto, CPI = ratio meta/real.
- **Numeros clave (de la hoja CR y filas 6 de cada ISP):**
  - CR a corte 01.12.25: TOTAL COSTO DE OBRA = 8,633.50 HH / S/148,737.50 (acum S/IGV S/215,837.50); COSTO DIRECTO = 8,395 HH / S/142,775 (acum S/209,875); TRABAJOS PRELIMINARES = 2,373.25 HH / S/14,381.25; SSO 575.25 HH; TOPOGRAFIA 608 HH / S/15,200.
  - HH acumulado por semana (campo/ISP): S1 239, S2 558.50, S3 702.50, S4 1,006, S5 1,405.50, S6 1,670.50, S7 1,946.50... hasta SEM15 ~8,633.50 HH (HH presente SEM15 = 1,045).
  - CPI acumulado deteriorandose y recuperandose: SEM01 0.46, SEM02 0.56, SEM03 0.68, SEM07 0.74, SEM10 0.84, SEM13 0.89, SEM14 0.87, SEM15 0.82. Metas HH acumuladas (col META): SEM15 meta 7,066.88 HH vs real 8,633.50 -> VAR -1,566.62 HH.
  - HH planilla total (hoja Control) ~8,648.50; delta planilla vs campo estable en ~14 HH desde SEM2.
- **Proposito:** medir productividad de mano de obra semana a semana (metrado ejecutado vs HH gastadas vs HH meta del presupuesto), calcular IP y CPI por partida y frente, y conciliar HH de planilla con HH de campo/ISP. Es el tablero de control de eficiencia de obra.
- **Origen -> Destino:** Origen = tareos de campo (HH por partida y dia) + metrados de avance + presupuesto meta (PPTO OFERTA por frente y ADICIONALES). Destino = hoja CR (costo de obra acumulado a S/25.50/HH) y hoja Control (conciliacion planilla/campo); alimenta los KPI de productividad y el CPI del proyecto.
- **Automatizacion:** Modulo **ISP** de GRAPCO (tareos HH x S/25.50) + **Resultado Operativo (RO/CR + EVM)**. Las HH diarias por partida -> importador de tareos (fuente Registros_Campo); el bloque PPTO META/PTAR-F1/NAVE-F2/ADICIONALES -> Presupuesto (BAC) y Adicionales/Deductivos; CPI/IP/VAR se calculan en el motor EVM. La hoja PARTIDAS CONTROL -> Catalogo_WBS (fuente unica de partidas). La hoja Control (planilla vs campo) toca el GAP **Control Planilla**. Importador generico in-app puede ingerir la matriz ISP semanal; el resto es calculo nativo del RO.

---

### \05. Gestion Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM16 .xlsx
- **Tipo / formato:** xlsx â€” `PRO-GCR-FOR-F01` (ISP). Version mas reciente del libro ISP (una semana mas que SEM15). Tambien en "1. Superado".
- **Hojas (19):** PARTIDAS CONTROL | CR | Control | ISP-SEM16 | ISP-SEM15 | ISP-SEM14 | ISP-SEM13 | ISP-SEM12 | ISP-SEM11 | ISP-SEM10 | ISP-SEM09 | ISP-SEM08 | ISP-SEM07 | ISP-SEM06 | ISP-SEM05 | ISP-SEM04 | ISP-SEM03 | ISP-SEM02 | ISP-SEM01.
- **Contenido por hoja:** identica estructura al libro SEM15 (PARTIDAS CONTROL = mismo catalogo; CR = costo de obra acumulado; Control = conciliacion planilla/campo/ISP; ISP-SEMxx = fotos acumuladas semanales con bloques de metrado/HH/IP por frente, dias y meta/VAR/CPI). La unica diferencia es la hoja adicional **ISP-SEM16** y la actualizacion de CR y Control con la semana 16.
  - **ISP-SEM16** (B1:BP1217): foto acumulada de la semana 16. Dos frentes PPTO OFERTA PTAR-F1 y NAVE-F2 + ADICIONALES + TOTAL + PPTO META. Dias con fechas reales (Mon Feb 16 2026...). Misma malla de columnas METRADO/HH/IP por dia y PRESENTE SEMANA + META/VAR/CPI acumulado.
- **Numeros clave:**
  - CR a corte 01.12.25 (actualizado): TOTAL COSTO DE OBRA = 9,733 HH / S/171,537.50 (acum S/IGV S/243,325); COSTO DIRECTO = 9,455 HH / S/164,587.50 (acum S/236,375); TRABAJOS PRELIMINARES = 2,573.25 HH / S/14,818.75; SSO 592.75 HH / S/14,818.75; TOPOGRAFIA 656.50 HH / S/16,412.50.
  - ISP-SEM16 fila resumen: HH acumulado real 9,733 vs META 7,668.95 HH -> VAR -2,064.05 HH, CPI 0.79; HH presente semana 1,100 vs meta 612.93 -> VAR -487.07, CPI 0.56.
  - ISP-SEM15 (dentro de este libro): acum 8,633 HH vs meta 7,066.88 -> VAR -1,566.12, CPI 0.82.
  - Hoja Control: HH planilla total 9,748.50 vs HH campo 9,733; deltas semanales planilla-vs-campo ~14 HH constantes.
- **Proposito:** mismo que SEM15 â€” control semanal de productividad de mano de obra, IP/CPI por partida y frente, y conciliacion HH planilla vs campo. Es la version vigente del tablero ISP (corte semana 16, ~mediados feb 2026 segun fechas diarias).
- **Origen -> Destino:** Origen = tareos de campo (HH/dia/partida) + metrados + presupuesto meta por frente (PTAR-F1, NAVE-F2) + adicionales. Destino = CR (costo acumulado S/25.50/HH) y Control (conciliacion); alimenta KPI de productividad y CPI del proyecto. Sustituye al libro SEM15.
- **Automatizacion:** identica al SEM15: HH diarias -> Modulo ISP / importador de tareos; PPTO META/PTAR-F1/NAVE-F2/ADICIONALES -> Presupuesto (BAC) + Adicionales/Deductivos; CPI/IP/VAR -> motor EVM del RO; PARTIDAS CONTROL -> Catalogo_WBS; hoja Control -> GAP Control Planilla. Tomar SEM16 como version canonica (no SEM15).

---

## Notas transversales del chunk
- Ambos archivos son **el mismo libro ISP en dos cortes** (SEM15 y SEM16); SEM16 es el superset. Para ingerir a GRAPCO basta procesar SEM16 (contiene SEM01..SEM16).
- Las hojas ISP arrastran un titulo "SEMANA NÂ° 06 08/12/2025 14/12/2025" copiado/no actualizado; la semana real se identifica por las fechas diarias (col LUNES..DOMINGO) y por el nombre de hoja, no por ese rotulo.
- Muchas celdas IP/CPI muestran `#DIV/0!` cuando el metrado es 0 (partidas no ejecutadas esa semana) â€” no son datos, son errores de formula a ignorar en la ingesta.
- Costo MO promediado a S/25 en el encabezado de CR (la plataforma usa S/25.50/h como estandar oficial).



---

# CatÃ¡logo Costos â€” 6. ISP (cont. 3)

Chunk: `cat_6_ISP__p3` Â· CategorÃ­a: 6. ISP (Informe Semanal de ProducciÃ³n) â€” proyecto CREDITEX (PTARI F1 + NAVE F2).
Archivos fichados: 5 (3 libros ISP maestros semanales + 2 de Control de Planilla).

Nota transversal: los tres libros ISP (SEM19, SEM20, SEM21) son el MISMO formato `PRO-GCR-FOR-F01` versionado por semana de corte. Cada libro arrastra TODAS las hojas semanales anteriores (ISP-SEM01â€¦ISP-SEMxx) mÃ¡s sus hojas resumen (PC, CR, Control HH, Control IP). Es decir, son snapshots acumulativos; el mÃ¡s reciente (SEM21) es el que contiene la cadena completa y la estructura mÃ¡s evolucionada.

---

### \05. GestiÃ³n Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM19 (revisando).xlsx
- Tipo / formato: xlsx Â· cÃ³digo **PRO-GCR-FOR-F01** (Informe Semanal de ProducciÃ³n). Marcado "(revisando)" y en carpeta "1. Superado" (versiÃ³n histÃ³rica corte SEM19). 4793 KB.
- Hojas (23): PC | CR | Control HH | Control IP | ISP-SEM19 â€¦ ISP-SEM01 (19 hojas semanales).
- Contenido por hoja:
  - **PC (Partidas Control)**: maestro de partidas de control de presupuesto con CÃ“DIGO (1001 TRABAJOS PRELIMINARESâ€¦), descripciÃ³n y unidad (GLB, MESâ€¦). CatÃ¡logo WBS de control de obra. ~70 filas.
  - **CR (Control de Resultado / Costo de obra)**: columnas FRENTE | PARTIDA | DescripciÃ³n | HH | COSTO | ACUM S/ IGV; **Costo MO prom = 25** (S/25). Trae REPORTE TAREOS valorizado por partida. Totales al corte 01.12.25: TOTAL COSTO DE OBRA = HH 13153.50 / COSTO S/238,987.50 / ACUM S/328,837.50; COSTO DIRECTO = HH 12770.50 / S/229,412.50. Partida 1 Trabajos Preliminares HH 3213.25; SSO (FA01 1.01) HH 645.25 / S/16,131.25; TopografÃ­a (1.02) HH 882 / S/22,050.
  - **Control HH**: comparativo HH PLANILLA (administraciÃ³n) vs HH CAMPO (tareo) vs HH META, por semana 1..19; columnas DELTA HH ACUM, DELTA HH ADM VS CAMPO, HH VARIACIÃ“N, **CPI** y desglose de variaciones por frente/causa (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). HH planilla total 13169 vs campo 13153.50.
  - **Control IP**: matriz de Ãndice de Productividad (IP = HH/metrado) por partida, con IP Contractual, IP Meta y columnas SEM01..SEM21 (serie de IP real acumulado por partida). Ej: SeÃ±alizaciÃ³n IP Meta 90, real subiendo 110â†’238â†’227.52 (sobreconsumo). ~190 filas.
  - **ISP-SEMnn (19 hojas)**: hoja semanal por semana. Encabezado "INFORME SEMANAL DE PRODUCCIÃ“N (ISP) CR â€” SEMANA NÂ° nn fecha-ini fecha-fin". Por partida: PREVISIÃ“N desglosada en PPTO OFERTA PTAR-F1 / PPTO OFERTA NAVE-F2 / ADICIONALES / TOTAL (cada uno METRADOÂ·HHÂ·IP), ACUMULADO ANTERIOR, META (IP Meta), VAR, CPI; luego avance diario LUN..DOM (METRADOÂ·HHÂ·IP) y PRESENTE SEMANA. LÃ­nea de totales semana (fila 6): HH acumulado, HH meta, VAR HH, CPI.
- NÃºmeros clave: Costo MO S/25/h; corte SEM19 (09â€“15/03/2026): HH acum total 13153.50 vs Meta 10219.01, VAR -2934.49, **CPI 0.78**; semana 19 HH 925 vs meta 620.22, CPI semanal 0.67. CPI por semana en Control HH va 0.46â†’0.56â†’0.68â†’0.69â†’0.73â†’0.75â†’0.74 (S1..S7).
- PropÃ³sito: control de productividad de mano de obra semana a semana â€” compara HH gastadas (tareo de campo) contra HH meta del presupuesto por partida, calcula IP y CPI, y concilia HH campo vs HH planilla.
- Origen -> Destino: Origen = tareos diarios de campo (HH x partida) + planilla de RRHH + metrados de avance + IP meta del presupuesto/APU. Destino = alimenta el Control de Resultado (CR) y el seguimiento de productividad / EVM del proyecto.
- AutomatizaciÃ³n: el ISP es el corazÃ³n del mÃ³dulo **ISP de GRAPCO** (tareos HH x S/25.5). Importar a: mÃ³dulo ISP/Curva S F07 (HH y CPI semanal por partida) + RO/CR para el costo MO valorizado. HH meta e IP meta vienen del catÃ¡logo WBS/Presupuesto. La conciliaciÃ³n HH planilla vs campo es un **GAP (Control Planilla)**. Nota: el costo MO aquÃ­ es S/25 â€” la plataforma estandariza S/25.50 (revisar al ingerir). Importador genÃ©rico in-app sirve para la hoja semanal, pero conviene un importador ISP dedicado.

---

### \05. GestiÃ³n Costos\6. ISP\1. Superado\PRO-GCR-FOR-F01_ISP CREDITEX SEM20 .xlsx
- Tipo / formato: xlsx Â· cÃ³digo **PRO-GCR-FOR-F01**. Corte SEM20, carpeta "1. Superado" (histÃ³rico). 5050 KB.
- Hojas (24): PC | CR | Control HH | Control IP | ISP-SEM20 â€¦ ISP-SEM01 (igual a SEM19 + hoja ISP-SEM20).
- Contenido: idÃ©ntico formato al SEM19. Aporta la semana 20 (16â€“22/03/2026). PC/Control IP/ISP-SEMnn iguales en estructura.
  - **CR**: Costo MO prom = 25. Totales al corte: TOTAL COSTO DE OBRA HH 14031.50 / S/249,562.50 / ACUM S/350,787.50; COSTO DIRECTO HH 13632.50 / S/239,587.50 / ACUM S/340,812.50; Trabajos Preliminares HH 3485.75; SSO S/16,881.25; TopografÃ­a S/22,787.50.
  - **Control HH**: HH planilla total 14047 vs campo 14031.50. Mismas series semanales que SEM19 + semana extra.
  - **ISP-SEM20**: SEMANA NÂ° 20 (16â€“22/03/2026). Totales semana: HH acum 14031.50 vs Meta 10523.52, VAR -3482.48, **CPI 0.75**; semana 20 HH 878 vs meta 213.77, CPI semanal 0.24 (muy bajo â€” fuerte sobreconsumo esa semana).
- NÃºmeros clave: CPI acumulado 0.75 al corte SEM20; HH campo acum 14031.50; costo acumulado obra S/350,787.50 c/IGV.
- PropÃ³sito: igual que SEM19 â€” snapshot semanal de productividad MO un corte mÃ¡s adelante.
- Origen -> Destino: igual que SEM19 (tareos + planilla + metrados + IP meta -> CR / EVM).
- AutomatizaciÃ³n: misma ruta que SEM19 (mÃ³dulo ISP + RO/CR + Curva S F07). Por ser snapshot superado, sÃ³lo se ingiere para serie histÃ³rica; el vivo es SEM21.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM21.xlsx
- Tipo / formato: xlsx Â· cÃ³digo **PRO-GCR-FOR-F01**. Corte SEM21, en raÃ­z de 6. ISP (versiÃ³n VIGENTE / mÃ¡s reciente). 5288 KB.
- Hojas (25): PC | CR | CHH | CIP | ISP-SEM21 â€¦ ISP-SEM01 (21 hojas semanales). Las resumen se renombran a CHH/CIP.
- Contenido por hoja (estructura mÃ¡s evolucionada del chunk):
  - **PC**: igual maestro de partidas de control (cÃ³digos 1001â€¦).
  - **CR**: **Costo MO prom = 25.50** (ya estandarizado), encabezado "SEMANA NÂ° 21 23/03/2026 29/03/2026". AÃ±ade columnas COMENTARIOS / ING. DE PRODUCCIÃ“N y "Respecto al Meta (HH | MONTO)". Totales: TOTAL COSTO DE OBRA HH 15171.50 / S/276,815.25 / ACUM S/386,873.25; COSTO DIRECTO HH 14740.50 / S/265,824.75 / ACUM S/375,882.75; Trabajos Preliminares HH 3568.75 / S/17,665.13; SSO S/17,665.13; TopografÃ­a HH 991.50 / S/25,283.25. Comentario en SSO: "SEÃ‘ALIZACION: Sobreconsumo de HH".
  - **CHH (Control HH)**: HH planilla total 15187 vs campo 15171.50, DELTA ADM vs CAMPO 16. Series semanales 1..21 con CPI, deltas y variaciones por causa (PRE, PRO, CONâ€¦).
  - **CIP (Control IP)**: aÃ±ade "IP Actual Acum." con SEM21/SEM22/SEM23, DELTA (IP meta âˆ’ IP actual) y COMENTARIO. Ej: SeÃ±alizaciÃ³n IP Meta 90 / IP actual 178.93 / DELTA -82.93 con comentario "ACTUALIZAR APU REAL"; Andamios DELTA 30; Armado/desarmado andamios DELTA 54.35.
  - **ISP-SEM21**: cabecera enriquecida con bloque CONTROL/DELTA y **FORECAST**: CONTROL 17525.91; DELTA(1)-(2)=2515.32; DELTA(1)-(3)=3494.41; DELTA(1)-(6)=2354.41; CONTROL 15171.50. PrevisiÃ³n ahora consolida **PPTO OFERTA PTAR-F1+F2** (no separa frentes): METRADO/HH/IP F1+F2 = 15193.61 HH; ADICIONALES 2332.30 HH; PPTO CONTRACTUAL (1) 17525.91 HH; PPTO META (2) 15010.59 HH; ANTERIOR (4) 14031.50. Totales semana 21: HH presente 1140 vs meta 465.68, CPI semanal 0.41; acumulado actual HH 15171.50 vs meta 14885.91, VAR -2993.00, **CPI 0.98**; FORECAST 5561.73.
- NÃºmeros clave: Costo MO S/25.50; PPTO contractual total = 17525.91 HH; PPTO meta = 15010.59 HH; HH campo acum 15171.50; CPI acumulado 0.98; FORECAST HH al tÃ©rmino 5561.73; costo acumulado obra S/386,873.25 c/IGV; adicionales 2332.30 HH.
- PropÃ³sito: informe de producciÃ³n vigente â€” ademÃ¡s de productividad semanal, aÃ±ade pronÃ³stico (Forecast/EAC en HH) y control de IP real vs APU para gatillar actualizaciÃ³n de precios. Es la fuente de la curva de HH y CPI del proyecto.
- Origen -> Destino: Origen = tareos diarios (HH/metrado por partida) + planilla + metrados + presupuesto contractual y meta (F1+F2+adicionales) + APU para IP. Destino = CR (costo MO valorizado), EVM/Forecast, Curva S de HH, y disparador de actualizaciÃ³n de APU.
- AutomatizaciÃ³n: importador ISP dedicado en mÃ³dulo **ISP** (HH x S/25.50, IP/CPI por partida y semana). La secciÃ³n PPTO CONTRACTUAL / META / ADICIONALES enlaza con **Presupuesto (BAC)** y **Adicionales/Deductivos**; el FORECAST alimenta el **EVM del RO**; el DELTA IP vs APU es entrada al mÃ³dulo de actualizaciÃ³n de precios (costos, fuera de GRAPCO). Curva S F07 toma HH meta vs real por semana.

---

### \05. GestiÃ³n Costos\6. ISP\2. Control Planilla\HH PLANILLA VS HH CAMPO.xlsx
- Tipo / formato: xlsx (sin cÃ³digo GP/PRO). Auxiliar de Control de Planilla. 12 KB.
- Hojas (2): Hoja 1 (con datos) | Hoja 2 (**vacÃ­a**).
- Contenido: Hoja 1 tabla simple de conciliaciÃ³n semanal â€” columnas SEMANA | HH PLANILLA | HH PLANILLA ACUMULADO | HH CAMPO | HH CAMPO ACUMULADO. Filas Semana 1..~13.
- NÃºmeros clave: S1 plan 238 / campo 239; S2 plan 334.50 (acum 572.50) / campo 320 (acum 559); S8 plan 431.50 / campo 516; S9 plan 491 / campo 444. Muestra desviaciones HH administraciÃ³n vs HH realmente reportadas en tareo.
- PropÃ³sito: conciliar las horas pagadas por planilla (RRHH/administraciÃ³n) contra las horas registradas en el tareo de campo, para detectar HH pagadas no productivas o no tareadas.
- Origen -> Destino: Origen = planilla de RRHH (HH pagadas) + tareos de campo (HH reportadas). Destino = hoja Control HH / CHH de los libros ISP (es la fuente del bloque "ADMINISTRACIÃ“N vs CAMPO").
- AutomatizaciÃ³n: **GAP â€” Control de Planilla** (no existe mÃ³dulo en GRAPCO). RequerirÃ­a un importador de planilla (HH pagadas por semana) para cruzar contra las HH de tareo del mÃ³dulo ISP. Por ahora ingestable como tabla simple vÃ­a importador genÃ©rico hacia un reporte de conciliaciÃ³n HH.

---

### \05. GestiÃ³n Costos\6. ISP\2. Control Planilla\HORAS EXTRAS CREDITEX (24-01-2026).xlsx
- Tipo / formato: xlsx (sin cÃ³digo). Registro manual de horas extras de un trabajador. 16 KB.
- Hojas (1): "Horas Luis".
- Contenido: control diario de ingreso/salida/horas extra de un colaborador (Luis), por bloques semanales (HORAS CREDITEX NOVIEMBRE, DICIEMBREâ€¦). Filas: Ingreso (07:15AM), Salida (17:00PM / 19:00PM en dÃ­as con extra), Hrs. Extras por dÃ­a y total. Incluye notas (ej. "PERMISO 6 HR. TRÃMITE").
- NÃºmeros clave: semana 24â€“30 nov: extras MIÃ‰ 2, JUE 2, VIE 2, SÃB 5 = **11 Hr.** extras. Ingreso fijo 07:15, salida normal 17:00.
- PropÃ³sito: soporte de horas extra individuales para liquidaciÃ³n/planilla; insumo de costo de MO adicional.
- Origen -> Destino: Origen = marcaje/registro manual de asistencia del trabajador. Destino = planilla (cÃ¡lculo de sobretiempo) y, agregado, al control HH.
- AutomatizaciÃ³n: relacionado al **Marcador facial / asistencia** de GRAPCO (entrada 07:30 + salida real) para puntualidad y sobretiempo, y al **GAP Control de Planilla** para liquidar HH extra. La hora real ya se guarda en el marcador; las horas extra serÃ­an un cÃ¡lculo derivado (salida real âˆ’ jornada).



---

# Categoria 6 Â· ISP (cont. 4) â€” Fichas detalladas

Chunk: `cat_6_ISP__p4.txt`. Contiene 3 archivos, todos cortes semanales sucesivos del MISMO libro maestro de ISP (Informe Semanal de Produccion) de CREDITEX (PTARI F1 + NAVE F2). Cada archivo es una "foto" acumulada del libro al cierre de su semana, con la misma estructura de hojas y agregando una hoja `ISP-SEMnn` nueva por semana.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM22.xlsx
- **Tipo / formato:** xlsx â€” Informe Semanal de Produccion. Codigo formato: **PRO-GCR-FOR-F01**.
- **Hojas (26):** PC | CR | CHH | CIP | ISP-SEM22 ... ISP-SEM01 (22 hojas semanales + 4 de control).
- **Contenido por hoja:**
  - **PC (Partidas Control):** catalogo maestro de partidas de control con su CODIGO (ej. 1=TRABAJOS PRELIMINARES cod 1001; SSO, alquiler andamios GLB, mitigacion polvo MES, limpieza MES, etc.) y unidad. Es la lista de partidas que estructura todo el ISP. (~70 filas)
  - **CR (Control de Recursos / costo MO):** por FRENTE + PARTIDA + Descripcion: HH | COSTO | ACUM S/IGV, con "Costo MO prom: 25.50". Cabecera SEMANA NÂ° 22 (30/03â€“05/04/2026). Resume costo de obra desde tareos. (~70 filas)
  - **CHH (Control HH Variaciones):** comparativo semana a semana de HH ADMINISTRACION (planilla) vs CAMPO (tareos): HH PLANILLA / HH CAMPO semanal y acum, DELTA HH ADM VS CAMPO, HH META ACUM, HH VARIACION, CPI, y desglose de delta por partida (PRE/PRO/CON/ACE/CUR/VAE/TAB/BIT/CONT/PRH/VAA/IIEE). (~30 filas, S1..S22)
  - **CIP (Control de IP):** por partida: IP Contractual | IP Meta | IP Actual Acum por semana (SEM21, SEM22, SEM23...) | DELTA | COMENTARIO (ej. "ACTUALIZAR APU REAL"). Compara ratio de produccion real vs meta/contractual. (~220 filas)
  - **ISP-SEMnn:** la matriz grande de produccion (rango hasta col BM). Por partida y por dia (Lunâ€“Dom): METRADO | HH | IP; bloques PREVISION (PPTO OFERTA PTAR F1+F2, ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2)), ACUMULADO ANTERIOR (4), META/VAR/CPI, PRESENTE semana y FORECAST. Una hoja por semana. (~190 filas c/u)
- **Numeros clave (SEM22, 30/03â€“05/04/2026):**
  - Costo MO prom: S/ 25.50/HH.
  - CR Â· TOTAL COSTO DE OBRA: 15,856 HH | S/ 286,798.50 costo | S/ 404,328 acum c/IGV.
  - CR Â· COSTO DIRECTO: 15,416 HH | S/ 275,578.50.
  - ISP-SEM22 cabecera: CONTROL 17,355.61; PPTO CONTRACTUAL (1) 17,355.61 HH (oferta 15,135.64 + adicionales 2,219.97); PPTO META (2) 14,248.58 HH; DELTA(1)-(2)=3,107.03; HH acum 15,171.50; HH meta 11,441.60; VAR -3,730.41; **CPI 0.75**. Semana presente 684.50 HH; CPI semanal 0.22.
- **Proposito:** medir productividad (IP = HH/metrado) vs meta y presupuesto, controlar HH ganadas/perdidas (EVM en HH), CPI por partida y global, y conciliar HH planilla vs campo.
- **Origen -> Destino:** Origen = tareos diarios de campo (HH x partida x dia) + metrados de avance + PPTO oferta/meta/adicionales. Destino = CR (costo MO), CHH (variaciones HH), CIP (IP), y al RO/Resultado Operativo como pata de mano de obra.
- **Automatizacion:** Modulo **ISP** de GRAPCO (tareos HH x S/25.5) + **Resultado Operativo (RO/CR + EVM)** + **Curva S (F07)**. La hoja ISP-SEMnn alimenta el motor EVM (CPI, VAR HH, forecast); CIP alimenta indicadores IP del catalogo WBS; CHH es comparativa planilla-vs-campo (parte cae en GAP Control Planilla). Ingesta via importador generico in-app mapeando partida->WBS.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM23.xlsx
- **Tipo / formato:** xlsx â€” ISP, codigo **PRO-GCR-FOR-F01**. Es el mismo libro al cierre de SEM23 (agrega hoja ISP-SEM23).
- **Hojas (27):** PC | CR | CHH | CIP | ISP-SEM23 ... ISP-SEM01.
- **Contenido:** identica estructura que SEM22. CIP ya muestra columna SEM23; CR y cabeceras de ISP-SEM22 conservan datos previos (la cabecera de CR aun rotula "SEMANA NÂ° 22", dato heredado, pero ISP-SEM23 rotula la semana 23 06/04â€“12/04/2026).
- **Numeros clave (SEM23, 06/04â€“12/04/2026):**
  - CR Â· TOTAL COSTO DE OBRA: 16,464 HH | S/ 295,341 | acum S/ 419,832.
  - CR Â· COSTO DIRECTO: 16,024 HH | S/ 284,121 | acum S/ 408,612.
  - ISP-SEM23: CONTROL 17,355.61; PPTO CONTRACTUAL (1) 17,355.61 (oferta 15,135.64 + adic 2,219.97); META (2) 14,248.58; HH acum 15,856 / 16,464; HH meta 11,654.35; VAR -4,201.66; **CPI 0.74**. Semana presente 608 HH; CPI semanal 0.33. DELTA(1)-(3)=1,499.61.
  - CIP SEÃ‘ALIZACION TEMP SEGURIDAD IP: contractual 96 / meta 90 / actual SEM23 156.56 (sobre-consumo, "ACTUALIZAR APU REAL").
- **Proposito:** mismo control de productividad/EVM en HH, actualizado a SEM23. Permite ver tendencia del CPI global (0.75 -> 0.74) y consumo acumulado de HH.
- **Origen -> Destino:** igual a SEM22.
- **Automatizacion:** igual a SEM22 (ISP + RO/EVM + Curva S). Al cargar la cadena de cortes, GRAPCO debe quedarse con la version mas reciente por semana (este libro reemplaza/extiende al de SEM22).

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM24.xlsx
- **Tipo / formato:** xlsx â€” ISP, codigo **PRO-GCR-FOR-F01**. Mismo libro al cierre de SEM24 (agrega ISP-SEM24); es el corte mas reciente del chunk.
- **Hojas (28):** PC | CR | CHH | CIP | ISP-SEM24 ... ISP-SEM01.
- **Contenido / cambios vs cortes previos:**
  - **CR:** cabecera SEMANA NÂ° 24 (13/04â€“19/04/2026), costo MO 25.50.
  - **CHH:** ahora hasta col AP; agrega notas de rendimiento por fila (ej. "100m2 | encofrado | 60hr").
  - **CIP:** hasta col N; agrega columnas SEM24 y SEM25 (SEM25 = #REF!, formula rota por extender el rango).
  - **ISP-SEM24:** ya separa la oferta en PPTO OFERTA PTAR (F1) y PPTO OFERTA NAVE (F2) como bloques distintos (antes "F1+F2"), mas ADICIONALES y PPTO CONTRACTUAL (1); incluye banda "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO", y "FORECAST - META". Rango hasta col CG (mas ancha que cortes previos).
- **Numeros clave (SEM24, 13/04â€“19/04/2026):**
  - CR Â· TOTAL COSTO DE OBRA: 17,059 HH | S/ 301,537.50 | acum S/ 435,004.50.
  - CR Â· COSTO DIRECTO: 16,619 HH | S/ 290,317.50 | acum S/ 423,784.50.
  - ISP-SEM24: CONTROL 18,136.93; PPTO CONTRACTUAL (1) 20,424.22 HH (oferta PTAR F1 14,943.66 + NAVE F2 798.34 + adicionales 2,394.92); PPTO META (2) 15,545.56; HH acum 16,464; HH meta 11,930.36; VAR -4,533.65; **CPI 0.72**. Semana presente 595 HH; CPI semanal 0.24. DELTA(1)-(2)=4,878.66; DELTA(1)-(3)=3,960.22; FORECAST META control -1,513.44.
- **Proposito:** corte mas completo del control de productividad/EVM (HH ganadas vs perdidas, CPI por partida y global, forecast de HH al cierre). Confirma tendencia: CPI global cae 0.75 (S22) -> 0.74 (S23) -> 0.72 (S24); sobre-consumo de HH acumulado ~ -4,500 HH vs meta.
- **Origen -> Destino:** tareos de campo + metrados + PPTO (oferta F1/F2 + adicionales + meta). Alimenta CR, CHH, CIP y el RO (pata MO) y la Curva S.
- **Automatizacion:** Modulo **ISP** (HH x 25.5) + **RO/CR + EVM** + **Curva S (F07)**; el split F1(PTAR)/F2(NAVE) mapea a frentes pendientes mencionados en memoria. Recomendado: ingerir SOLO este corte (SEM24) como ultimo estado y derivar la historia desde sus hojas ISP-SEMnn, evitando duplicar con SEM22/SEM23. GAPs: la comparativa HH planilla vs campo (CHH) requiere Control Planilla (GAP) para cerrar la conciliacion.

---

#### Nota de consolidacion
Los 3 archivos son cortes acumulados del mismo libro PRO-GCR-FOR-F01. Para GRAPCO basta el ultimo (SEM24); SEM22 y SEM23 sirven solo como historico/auditoria. El ISP es la fuente primaria de HH/IP/CPI para el RO; el split F1/F2 aparece formalizado recien en SEM24.



---

# CATEGORIA: 6. ISP (cont. 5) â€” Informe Semanal de Produccion CREDITEX (PTARI + NAVE)

Chunk `cat_6_ISP__p5` con 2 archivos. Ambos son el MISMO libro maestro de ISP (PRO-GCR-FOR-F01), capturado en dos cortes consecutivos: SEM25 (semana 25, corte 20â€“26/04/2026) y SEM26 (semana 26, corte 27/04â€“03/05/2026). Es el corazon del control de produccion/HH del proyecto: convierte tareos (HH x S/25.50) en IP real y lo compara contra IP Contractual e IP Meta partida por partida, semana por semana.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM25.xlsx
- **Tipo / formato:** xlsx â€” codigo **PRO-GCR-FOR-F01** (Informe Semanal de Produccion, ISP). 6498 KB. Corte = SEMANA NÂ° 25 (20/04/2026 â€“ 26/04/2026).
- **Hojas (29):** PC | CR | CHH | CIP | ISP-SEM25 ... ISP-SEM01 (una hoja-foto por cada semana, de la 25 hacia atras hasta la 01).
- **Contenido por hoja:**
  - **PC (Partidas Control):** catalogo/maestro de partidas de control con su CODIGO (TRABAJOS PRELIMINARES = 1001) y unidad. Estructura WBS: 1 TRABAJOS PRELIMINARES > 1.01 SEGURIDAD Y SALUD OCUPACIONAL, 1.02 TOPOGRAFIA, ALQUILER DE ANDAMIOS (GLB), SEÃ‘ALIZACION TEMPORAL (GLB), ILUMINACION DE ACCESOS (GLB), MITIGACION DE POLVO (MES), LIMPIEZA GENERAL (MES), etc. (~79 partidas). Es la lista rectora de partidas de control del proyecto.
  - **CR (Control de Recursos / Costo):** convierte HH en S/. Encabezado "Costo MO prom: 25.50" y "SEMANA NÂ° 24 13/04/2026 â€“ 19/04/2026". Columnas: FRENTE | PARTIDA | Descripcion | HH | COSTO | ACUM S/ IGV. Filas resumen: TOTAL COSTO DE OBRA, COSTO DIRECTO, y desglose por partida (PRE1 FA01 1.01 SEGURIDAD; PRE2 FA01 1.02 TOPOGRAFIA, etc.). Codigos de frente FA01, PRE1/PRE2.
  - **CHH (Control HH Variaciones):** comparativo HH ADMINISTRACION (planilla) vs CAMPO (tareo) vs META, semana a semana. Columnas: SEMANA, HH PLANILLA / HH PLANILLA ACUM., HH CAMPO semanal / acum / control / DELTA, COMPARATIVO (HH PLANILLA ACUM vs HH CAMPO ACUM, DELTA ADM VS CAMPO), ACTUAL (HH CAMPO ACUM, HH META ACUM, HH VARIACION, **CPI**), y desglose de variacion por agrupador (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). Trae el CPI por semana (S1 0.46 â†’ S6 0.75, en ascenso). Incluye notas tipo "100m2 encofrado 60hr".
  - **CIP (Control de IP):** matriz IP por partida. Columnas: IP Contractual | IP Meta | IP Actual Acum por semana (SEM21, SEM22, SEM23, SEM24, SEM25) | DELTA | COMENTARIO. Ej: SEÃ‘ALIZACION IP Contractual 96 / Meta 90 / Actual ~147â€“178 (DELTA -82.93, comentario "ACTUALIZAR APU REAL"); ILUMINACION 16/12; ANDAMIOS 30/25. SEM25 muestra varios **#REF!** (formula rota). ~224 partidas.
  - **ISP-SEMnn (una por semana):** la matriz semanal completa de produccion. Por cada partida: METRADO/HH/IP para PPTO OFERTA PTAR (F1), PPTO OFERTA NAVE (F2), ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2); ACUMULADO ANTERIOR (4); META/VAR/CPI; metrado-HH-IP diario LUNES..DOMINGO; PRESENTE semana; bloques "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (forecast). ~190 filas de partidas por hoja.
- **Numeros clave (corte SEM25):**
  - Costo MO promedio: **S/ 25.50/HH** (cuadra con COSTO_HORA_PROMEDIO de GRAPCO).
  - HH Contractual total (PPTO CONTRACTUAL 1): **22 728.79 HH**; HH PPTO META: **17 577.26 HH**; HH ACUMULADO presente (control): **17 680.51 HH**; HH META acum: 12 909.23; VAR -4 181.78; **CPI 0.76** (sobre meta).
  - Reparto contractual HH por frente: PTAR/F1 = 17 160.53; NAVE/F2 = 798.34; ADICIONALES = 2 453.01.
  - HH semana presente SEM25 = 589.51; analisis respecto al ppto: control 17 680.51, VAR -83.24.
  - CR (hoja, corte sem24): TOTAL COSTO DE OBRA 17 059 HH / S/ 301 537.50 (acum S/ IGV S/ 435 004.50); COSTO DIRECTO 16 619 HH / S/ 290 317.50 (acum S/ 423 784.50); TRABAJOS PRELIMINARES 3 940.25 HH / S/ 18 570.38 (acum S/ 100 476.38).
  - Serie CPI semanal (CHH): S1 0.46, S2 0.56, S3 0.68, S4 0.69, S5 0.73, S6 0.75 (tendencia de mejora; sostenido < 1 = sobreconsumo de HH vs meta).
- **Proposito:** medir productividad real (IP = HH/metrado) por partida y semana, contra IP Contractual y Meta; calcular CPI de HH, valorizar HH en S/ (CR), y controlar la brecha HH planilla vs campo (CHH). Es el reporte que dispara los analisis de variacion del costo de mano de obra.
- **Origen â†’ Destino:** ORIGEN = tareos diarios de campo (HH por partida/dia) + presupuesto oferta (F1 PTAR, F2 NAVE, adicionales) + APU/HH meta. DESTINO = alimenta el CPI y la pata de Mano de Obra del Resultado Operativo (CR/RO), el seguimiento de IP y los analisis de variacion del control de costos.
- **Automatizacion (GRAPCO):**
  - Las hojas ISP-SEMnn â†’ modulo **ISP** (tareos HH x S/25.5) e **IP/CPI**; los HH diarios provienen de **Registros_Campo** (tareos), fuente unica.
  - PC â†’ maestro de partidas, mapeable al **Catalogo_WBS** (codigo 1001, etc.).
  - CIP (IP Contractual / IP Meta) â†’ debe nutrir el **CPI desde el catalogo WBS** (IP Meta/Ppto, fuente unica). Reemplaza esta hoja manual con celdas #REF!.
  - CR (HHâ†’S/) â†’ pata MO del **Resultado Operativo (RO/CR/F06 + EVM)**; el costeo ya usa S/25.50.
  - CHH (planilla vs campo) â†’ mapea al **GAP "Control Planilla"** (no existe modulo): la columna HH PLANILLA viene de RR.HH., no de tareos. Importable via importador generico mientras tanto.
  - Mecanica de ingesta: importador generico in-app por hoja semanal, o derivar IP/CPI directo de tareos + WBS sin re-subir el libro de 6 MB.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM26.xlsx
- **Tipo / formato:** xlsx â€” codigo **PRO-GCR-FOR-F01** (ISP). 6841 KB. Corte = SEMANA NÂ° 26 (27/04/2026 â€“ 03/05/2026). Es la version mas reciente del libro (sucesor directo del SEM25).
- **Hojas (30):** PC | CR | CHH | CIP | ISP-SEM26 | ISP-SEM25 ... ISP-SEM01 (una hoja mas que SEM25: agrega ISP-SEM26).
- **Contenido por hoja:** identico al SEM25 (PC=maestro partidas; CR=HHâ†’S/ MO 25.50; CHH=planilla vs campo + CPI semanal; CIP=IP por partida; ISP-SEMnn=matriz semanal F1/F2/adicionales/contractual/meta + diario + analisis). Diferencias frente a SEM25:
  - Se aÃ±ade hoja **ISP-SEM26** (corte semana 26).
  - CIP en SEM26 ya **no muestra #REF!** en la columna de la ultima semana (formula corregida respecto a SEM25, que tenia #REF! en SEM25).
- **Numeros clave (corte SEM26):**
  - HH Contractual total 22 728.79; HH PPTO META 17 577.26 (mismos contractuales/meta que SEM25, no cambian).
  - HH ACUMULADO presente (control SEM26): **18 139.01 HH**; HH META acum 14 911.33; VAR -2 749.19; **CPI 0.84** (mejora frente al 0.76 de SEM25).
  - HH semana presente SEM26 = 458.50 (CPI semana 0.53); analisis respecto al ppto: control 18 139.01, VAR -561.75.
  - Reparto contractual por frente (igual): PTAR/F1 17 160.53; NAVE/F2 798.34; adicionales 2 453.01.
  - CR (hoja, mismo corte sem24 mostrado): TOTAL COSTO DE OBRA 17 059 HH / S/ 301 537.50 / acum S/ 435 004.50; COSTO DIRECTO 16 619 HH / S/ 290 317.50.
- **Proposito:** mismo que SEM25 â€” ISP semanal acumulado, ahora con la semana 26 cerrada; es la foto vigente del control de produccion y CPI de HH.
- **Origen â†’ Destino:** mismo flujo que SEM25 (tareos + presupuesto oferta + IP meta â†’ CPI / RO MO / analisis de variacion). Sucede a SEM25 como version viva.
- **Automatizacion (GRAPCO):** identica al SEM25. Recomendacion: ingerir SOLO la version mas reciente (SEM26) y, en adelante, generar el ISP/IP/CPI dinamicamente desde **Registros_Campo** (tareos) + **Catalogo_WBS** (IP Meta/Ppto) en lugar de importar libros de 6 MB que duplican todas las semanas previas.



---

# Categoria 6 â€” ISP (continuacion 6)

Chunk: `cat_6_ISP__p6.txt`. Contiene UN solo archivo Excel (libro maestro ISP del proyecto CREDITEX PTARI+NAVE), con 31 hojas.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM27.xlsx

- **Tipo / formato:** Excel (.xlsx), 7184 KB. Codigo de formato: **PRO-GCR-FOR-F01** (Informe Semanal de Produccion â€” ISP). Es el libro maestro de control de produccion/HH del proyecto, acumulado hasta la Semana 27.
- **Hojas (31):** `PC` | `CR` | `CHH` | `CIP` | y 27 hojas semanales `ISP-SEM27` ... `ISP-SEM01` (un ISP por semana del proyecto, S01 = 03/11/2025 a S27 = 04-10/05/2026).

#### Contenido por hoja

**PC â€” Partidas de Control (B1:L992)**
- Catalogo / arbol de partidas de control del presupuesto con su CODIGO. Encabezados: `PARTIDAS CONTROL | CODIGO`.
- Estructura tipo WBS: titulo "1 TRABAJOS PRELIMINARES" codigo 1001; sub-bloques "SEGURIDAD Y SALUD OCUPACIONAL", "TOPOGRAFIA", etc. con unidad (GLB, MES, ...). Ejemplos de partidas: ALQUILER DE ANDAMIOS PARA TRABAJOS (GLB), ALQUILER DE ANDAMIOS ESCALERAS PARA AC (GLB), SEÃ‘ALIZACION TEMPORAL DE SEGURIDAD (GLB), ILUMINACION DE ACCESOS Y FRENTES (GLB), MITIGACION DE POLVO (MES), LIMPIEZA GENERAL Y PERMANENTE (MES). (+69 filas mas).
- Es la lista maestra de partidas que alimenta todas las hojas semanales.

**CR â€” Control de Recursos / Reporte de Tareos (B1:J1019)**
- Cabecera fija: `Costo MO prom: 25.50` y `SEMANA NÂ° 24 13/04/2026 19/04/2026` (la hoja CR esta enganchada a la semana de corte).
- Columnas: FRENTE | PARTIDA (codigo FA01, etc.) | codigo | Descripcion | **HH** | **COSTO** | **ACUM S/ IGV** | COMENTARIOS | (campo ING. DE PRODUCCION).
- Estructura de totales (semana 24):
  - TOTAL COSTO DE OBRA: HH 17059 | COSTO S/ 301,537.50 | ACUM S/ 435,004.50
  - COSTO DIRECTO: HH 16619 | COSTO S/ 290,317.50 | ACUM S/ 423,784.50
  - 1 TRABAJOS PRELIMINARES: HH 3940.25 | COSTO 18,570.38 | ACUM 100,476.38
  - PRE1 / FA01 / 1.01 SEGURIDAD Y SALUD OCUPACIONAL: HH 728.25 | 18,570.38 | 18,570.38
  - PRE2 / FA01 / 1.02 TOPOGRAFIA: HH 1058 | 26,979 | 26,979
- Es la valorizacion de HH a costo (HH x S/25.50) por frente y partida -> equivale al CR del RO.

**CHH â€” Control de HH / Variaciones (B2:AP45)**
- Compara HH ADMINISTRACION (planilla) vs HH CAMPO (tareos) por semana, y campo vs META.
- Bloques de columnas: ADMINISTRACION (HH PLANILLA, HH PLANILLA ACUM.), CAMPO (HH CAMPO semanal, HH CAMPO ACUM., CONTROL HH CAMPO ACUM., DELTA HH ACUM), COMPARATIVO (HH PLANILLA ACUM. vs HH CAMPO ACUM., DELTA HH ADM VS CAMPO), ACTUAL (HH CAMPO ACUM., HH META ACUM., HH VARIACION, **CPI**), y un desglose por familias de partida (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE).
- Datos por semana 1..27. Ejemplos:
  - Totales cabecera: HH PLANILLA 16,479.50 | HH CAMPO 16,464 | delta 16.
  - SEM1: planilla 238, campo 239, meta 109.03, variacion -129.97, CPI 0.46.
  - SEM6: campo acum 1670.50, meta 1244.95, variacion -425.55, CPI 0.75.
- Sirve para conciliar planilla vs tareos y medir desviacion de HH contra meta.

**CIP â€” Control de IP / Indice de Productividad (B2:N230)**
- Compara IP Contractual vs IP Meta vs IP Actual Acumulado por semana (columnas SEM21..SEM25 visibles), con DELTA y COMENTARIO.
- Columnas: PARTIDA | IP Contractual | IP Meta | SEM21 | SEM22 | SEM23 | SEM24 | SEM25 | DELTA | COMENTARIO.
- Ejemplos:
  - ALQUILER DE ANDAMIOS PARA TRABAJOS: IP contractual 30, meta 25, delta 30.
  - ARMADO Y DESARMADO DE ANDAMIOS ESCALER: contractual 136.85, meta 130, actual ~82.50, delta 54.35.
  - SEÃ‘ALIZACION TEMPORAL DE SEGURIDAD: contractual 96, meta 90, actual 178.93->147.35, delta -82.93, comentario "ACTUALIZAR APU REAL".
  - ILUMINACION DE ACCESOS: contractual 16, meta 12, actual 11.26->7.65, delta 4.74.
- Mide la productividad real (HH/unidad) vs la prevista; (+218 filas).

**ISP-SEM01 ... ISP-SEM27 â€” Informe Semanal de Produccion (una hoja por semana)**
- Mismo formato repetido, con la matriz de presupuesto-meta-real por partida. Estructura tipica de columnas (rangos B1:CG... en semanas recientes, B1:BM/BP... en antiguas):
  - CODIGO | PARTIDA DE CONTROL PRESUPUESTO | UND
  - Bloques PREVISION (METRADO/HH/IP) para: PPTO OFERTA PTAR (F1), PPTO OFERTA NAVE (F2), ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2). En semanas antiguas (S01-S13) es "PPTO OFERTA PPTO 1" + ADICIONALES + TOTAL(0).
  - ACUMULADO ANTERIOR (4) (METRADO/HH/IP), META, VAR, **CPI** (2/1).
  - Detalle diario LUNES..DOMINGO (METRADO/HH/IP por dia) con fecha real en cabecera.
  - PRESENTE SEMANA (METRADO/HH/IP) y bloque META/VAR/CPI.
  - Bloques de cabecera "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (CONTROL, DELTA (1)-(2), DELTA (1)-(3), FORECAST-META).
- Cada hoja lleva su periodo: "SEMANA NÂ° NN dd/mm/aaaa dd/mm/aaaa". Nota: varias hojas semanales (S06-S16) arrastran en la fila 2 el texto residual "SEMANA NÂ° 06 08/12/2025 14/12/2025" (titulo no actualizado), pero la fila siguiente trae la semana correcta.
- Evolucion del HH meta acumulado (fila 6/7 "PRESENTE", CONTROL meta vs ppto):
  - SEM27: control meta 20,411.88; acumulado HH 18,139.01; meta 15,155.29; VAR -2,963.73; CPI 0.84. (vs ppto: control 18,394.01, meta 15,318.28, VAR -3,075.73, CPI 0.83).
  - SEM26: acum 17,680.51; meta 14,911.33; VAR -2,749.19; CPI 0.84.
  - SEM25: acum 17,091; meta 12,909.23; VAR -4,181.78; CPI 0.76.
  - SEM24: acum 16,464; meta 11,930.36; VAR -4,533.65; CPI 0.72.
  - SEM23: acum 15,856; meta 11,654.35; VAR -4,201.66; CPI 0.74.
  - SEM21: acum 14,031.50; meta 10,181.74; CPI 0.73.
  - SEM18: acum 12,228.50; meta 8,540.41; CPI 0.78.
  - SEM13: acum 6,477.50; meta 4,886.82; CPI 0.87.
  - SEM06: acum 1,670.50; meta 1,244.95; CPI 0.67.
  - SEM01: arranque, acum 239 HH; meta 0.
- Estructura de presupuesto cambia a mitad de obra: S01-S13 = "PPTO OFERTA PPTO 1"; S14-S20 = se separa "PPTO OFERTA PTAR - F1" y "PPTO OFERTA NAVE - F2"; S21-S27 = "PPTO OFERTA PTAR (F1)", "PPTO OFERTA NAVE (F2)", ADICIONALES, PPTO CONTRACTUAL (1), PPTO META (2). Refleja la incorporacion de la NAVE (F2) y adicionales al control.
- Filas de partida (ej. ALQUILER DE ANDAMIOS): muestran metrado/HH/IP previstos por presupuesto, meta, acumulado, produccion diaria y CPI por partida. Hojas antiguas tienen muchos #DIV/0! por celdas sin produccion.

#### Numeros clave
- Costo MO promedio: **S/ 25.50 / HH** (constante en todo el libro).
- Semana de corte del libro: **SEM27 (04-10/05/2026)**.
- TOTAL COSTO DE OBRA (CR, sem24): **HH 17,059** | **S/ 301,537.50** semanal | **ACUM S/ 435,004.50**.
- COSTO DIRECTO (CR, sem24): HH 16,619 | S/ 290,317.50 | ACUM S/ 423,784.50.
- HH campo acumulado final (SEM27): **18,139.01 HH**; HH META acumulado 15,155.29; VAR -2,963.73 HH; **CPI 0.84**.
- HH PLANILLA acum 16,479.50 vs HH CAMPO acum 16,464 (delta 16) â€” conciliacion CHH.
- CPI por semana se mueve entre 0.67 (SEM06) y 0.89 (SEM14), tendencia ~0.84 al cierre; CPI < 1 = sobreconsumo de HH vs meta toda la obra.

#### Proposito
- Nucleo del control de produccion y mano de obra del proyecto: convierte tareos (HH x frente x partida x dia) en metrado, IP (productividad), costo de MO (HH x S/25.5) y CPI, comparando contra presupuesto contractual (F1 PTAR + F2 NAVE + adicionales) y contra meta interna. Es el insumo de HH para el Resultado Operativo (pata de mano de obra).

#### Origen -> Destino
- **Origen:** tareos diarios de campo (registros por frente/partida/dia), planilla de administracion (HH planilla), y presupuesto oferta/meta (PTAR F1, NAVE F2, adicionales). El catalogo PC define las partidas.
- **Destino:** alimenta el CR (costo MO valorizado), el CHH (conciliacion planilla vs campo), el CIP (productividad) y los KPIs CPI/VAR que suben al Resultado Operativo y al reporte gerencial semanal.

#### Automatizacion (GRAPCO)
- Destino natural: **modulo ISP** de GRAPCO (tareos HH x S/25.5) + **Resultado Operativo (RO/CR + EVM)** para CPI/VAR + **Curva S (F07)** para la evolucion HH meta vs real por semana.
- Las hojas semanales ISP-SEMxx son acumulativos por semana del proyecto: ingerir via el **importador generico in-app** mapeando partida (codigo PC) + semana (obtenerSemana, S01=03/11/2025) + metrado/HH/IP/CPI. El detalle diario LUNES..DOMINGO ya se genera nativamente desde el tareo facial (entrada 07:30), por lo que GRAPCO puede RECALCULAR el ISP en vez de importarlo.
- PC -> catalogo de partidas de control (Catalogo_WBS / partidas de control del RO).
- CR -> CR del RO (HH x S/25.5 por frente/partida); CHH -> conciliacion planilla vs tareos (**GAP parcial: Control Planilla** no existe como modulo, hoy GRAPCO solo tiene HH de tareo, falta el lado planilla/administracion); CIP -> tablero de IP/productividad por partida (puede vivir en RO o ISP).
- GAP: la separacion presupuesto F1/F2/adicionales y la fila META requieren que Presupuesto (BAC) y Adicionales/Deductivos esten cargados para que el ISP cruce contra "control" y "meta".



---

# CatÃ¡logo Costos â€” SecciÃ³n 6. ISP (cont. 7) â€” cat_6_ISP__p7

Chunk con 2 archivos, ambos el **Informe Semanal de ProducciÃ³n (ISP)** del proyecto CREDITEX (PTARI F1 + NAVE F2), formato **PRO-GCR-FOR-F01**. Son libros "acumulativos vivos": cada nuevo libro = el anterior + una pestaÃ±a semanal nueva. SEM30 es el mÃ¡s reciente (corte semana 30) y contiene todo lo de SEM29.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM29.xlsx

- **Tipo / formato:** Excel (.xlsx), 7886 KB. CÃ³digo de formato: **PRO-GCR-FOR-F01** (ISP â€” Informe Semanal de ProducciÃ³n / Control de Resultado CR).
- **Hojas (33):** PC | CR | CHH | CIP | ISP-SEM29 ... ISP-SEM01 (4 hojas de control + 29 hojas semanales ISP-SEMxx, de la semana 29 hacia atrÃ¡s hasta la 01).
- **Contenido por hoja relevante (a detalle):**
  - **PC (Partidas Control)** â€” rango B1:L992. Maestro/catÃ¡logo de partidas de control con su CÃ“DIGO (ej. 1001) y unidad (GLB, MES, m2...). JerarquÃ­a: 1 TRABAJOS PRELIMINARES â†’ SEGURIDAD Y SALUD OCUPACIONAL â†’ Alquiler de andamios, SeÃ±alizaciÃ³n temporal, IluminaciÃ³n de accesos, MitigaciÃ³n de polvo, Limpieza general, etc. Es la lista madre de partidas que estructura todas las demÃ¡s hojas (~80 filas).
  - **CR (Control de Resultado)** â€” rango B1:J1019. Costo MO prom = **S/ 25.50**. Cabecera por semana (la del volcado muestra SEMANA NÂ° 24, 13/04â€“19/04/2026). Columnas: FRENTE (PRE1, PRE2...), PARTIDA (FA01...), cÃ³digo partida (1.01, 1.02), DescripciÃ³n, REPORTE TAREOS = **HH | COSTO | ACUM S/ IGV**, COMENTARIOS (ING. DE PRODUCCIÃ“N), arranque 01.12.25. Filas resumen: TOTAL COSTO DE OBRA = 17,059 HH / S/ 301,537.50 (acum S/ 435,004.50); COSTO DIRECTO = 16,619 HH / S/ 290,317.50 (acum S/ 423,784.50). Por partida: 1 Trabajos Preliminares 3,940.25 HH / S/ 18,570.38; 1.01 SSO (PRE1/FA01) 728.25 HH; 1.02 TopografÃ­a (PRE2/FA01) 1,058 HH / S/ 26,979 (~62 filas).
  - **CHH (Control HH Variaciones)** â€” rango B2:AP45. Tabla semana a semana (SEMANA 1..N) comparando 3 universos de HH: ADMINISTRACIÃ“N (HH planilla y acum), CAMPO (HH campo semanal/acum + control + DELTA HH acum), COMPARATIVO (planilla acum vs campo acum, DELTA ADM vs CAMPO), ACTUAL (HH campo acum vs HH META acum, HH variaciÃ³n, **CPI**). Encabezados de control: HH planilla 16,479.50 vs HH campo 16,464 (delta 16). Luego columnas de descomposiciÃ³n de la variaciÃ³n por causa: PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE (atribuciÃ³n de pÃ©rdida de HH). Ej. Sem1 CPI 0.46; Sem5 CPI 0.73; Sem6 CPI 0.75 (~30 filas semanales).
  - **CIP (Control de IP)** â€” rango B2:N230. Por partida: **IP Contractual | IP Meta | IP Actual Acum por semana (SEM21..SEM25...) | DELTA | COMENTARIO**. Ej. SeÃ±alizaciÃ³n temporal IP contractual 96 / meta 90 / actual ~147â€“179 â†’ delta -82.93 "ACTUALIZAR APU REAL"; IluminaciÃ³n 16/12 actual 7.65â€“11.26; Armado/desarmado andamios 136.85/130 actual 82.50. Es el seguimiento del Ãndice de Productividad real vs meta/contractual (~218 filas).
  - **ISP-SEMxx (29 hojas semanales)** â€” rango ~B1:CG1159 (las recientes) / B1:BM-BP (las antiguas, menos columnas). Cada hoja es el ISP de esa semana con esta matriz por partida de control:
    - PREVISIÃ“N por origen de presupuesto: **PPTO OFERTA PTAR (F1)**, **PPTO OFERTA NAVE (F2)**, **ADICIONALES**, **PPTO CONTRACTUAL (1)** = suma, **PPTO META (2)** â€” cada uno con METRADO | HH | IP.
    - **ACUMULADO ANTERIOR (4)** (METRADO/HH/IP) + columnas META, VAR, **CPI** (=2/1).
    - Detalle diario LUNES..DOMINGO (cada dÃ­a con METRADO | HH | IP y fecha real, ej. "Mon May 18 2026"), bloque **PRESENTE SEMANA** (METRADO/HH/IP) y comparaciÃ³n contra META (VAR).
    - Dos bloques de anÃ¡lisis: "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (CONTROL, DELTA (1)-(2), DELTA (1)-(3), FORECAST-META).
    - Filas = todas las partidas del catÃ¡logo PC (Trabajos Preliminares â†’ SSO â†’ andamios, etc.), ~181â€“237 filas por hoja.
- **NÃºmeros clave (de este volcado):**
  - Costo MO promedio Ãºnico: **S/ 25.50/HH**.
  - CR / corte Sem 24: TOTAL COSTO DE OBRA **17,059 HH** / S/ 301,537.50 sem, **S/ 435,004.50** acum IGV; COSTO DIRECTO 16,619 HH / S/ 423,784.50 acum.
  - ISP-SEM29: PPTO CONTRACTUAL HH = **22,728.79** (PTAR/F1 17,160.53 + NAVE/F2 798.34 + Adicionales 2,453.01); PPTO META HH = **17,577.26**; Acumulado actual **18,516.01 HH**; META acum 15,318.29; **VAR -3,075.73 HH**; **CPI 0.83**. HH presente semana 147.
  - HH planilla total 16,479.50 vs HH campo 16,464 (delta +16 HH a favor de campo).
- **PropÃ³sito:** documento rector de control de producciÃ³n/HH del proyecto: mide HH ganadas vs presupuesto contractual y meta, calcula IP y CPI por partida, valoriza la MO a S/25.5 y atribuye pÃ©rdidas de HH a causas raÃ­z. Es la base del Resultado Operativo de la pata de Mano de Obra.
- **Origen â†’ Destino:** Origen = tareos diarios de campo (reporte HH por partida/dÃ­a, ING. de ProducciÃ³n) + metrados ejecutados + presupuesto oferta (PTAR F1 + NAVE F2) + adicionales + APU para IP meta/contractual. Destino = alimenta CR (costo MO), CHH/CIP (variaciones e IP) y el informe semanal a gerencia/cliente; es insumo directo del RO/EVM.
- **AutomatizaciÃ³n (GRAPCO):** NÃºcleo del mÃ³dulo **ISP** (tareos HH Ã— S/25.5) + **Curva S / EVM** y la pata MO del **Resultado Operativo (RO/CR/F06)**. Ingesta: HH diarias por partida â†’ fuente Ãºnica `Registros_Campo` (tareos); presupuesto/metas (PTAR F1, NAVE F2, adicionales, IP meta/contractual) â†’ catÃ¡logo WBS / mÃ³dulo Presupuesto (BAC); CPI/IP/VAR se recalculan en la plataforma, no se importan. Importador genÃ©rico in-app puede cargar las pestaÃ±as ISP-SEMxx como histÃ³rico. GAP parcial: el desglose de variaciÃ³n por causa (PRE/PRO/CON/ACE/CUR/VAE/TAB/BIT/CONT/PRH/VAA/IIEE) de la hoja CHH no tiene equivalente actual.

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM30.xlsx

- **Tipo / formato:** Excel (.xlsx), 8226 KB. CÃ³digo de formato: **PRO-GCR-FOR-F01** (ISP). VersiÃ³n de corte mÃ¡s reciente.
- **Hojas (34):** PC | CR | CHH | CIP | **ISP-SEM30** | ISP-SEM29 ... ISP-SEM01 (mismas 4 hojas de control + 30 hojas semanales; aÃ±ade ISP-SEM30 respecto al libro anterior).
- **Contenido por hoja relevante:** estructura idÃ©ntica al SEM29 (mismas hojas PC, CR, CHH, CIP y la matriz ISP por semana). Diferencias por ser corte posterior:
  - **CR** â€” cabecera de cÃ¡lculo Sem 24 visible; valores actualizados: TOTAL COSTO DE OBRA **18,807.01 HH** / S/ 332,099.51 sem / **S/ 479,578.76** acum IGV; COSTO DIRECTO **18,099.01 HH** / S/ 314,045.51 / S/ 461,524.76 acum. Trabajos Preliminares 4,391.75 HH / S/ 22,867.13; 1.01 SSO 896.75 HH / S/ 22,867.13; 1.02 TopografÃ­a 1,071 HH / S/ 27,310.50.
  - **CHH y CIP** â€” misma estructura que SEM29 (control HH variaciones por causa y control de IP por partida con IP contractual/meta/actual por semana y delta).
  - **ISP-SEM30 (nueva)** â€” rango B1:CG1159, semana visible de cÃ¡lculo SEM 28 (11â€“17/05/2026) con dÃ­as Mon May 25..2026. PPTO CONTRACTUAL HH 22,728.79 (F1 17,160.53 + F2 798.34 + Adic 2,453.01); PPTO META 17,577.26; Acumulado **18,663.01 HH**; META acum 15,318.29; **VAR -3,075.73**; **CPI 0.82**; HH presente 144. Filas = catÃ¡logo PC completo (~181 filas).
  - **ISP-SEM29..SEM01** â€” histÃ³ricos heredados idÃ©nticos al libro SEM29.
- **NÃºmeros clave (de este volcado):**
  - CR acumulado: TOTAL COSTO DE OBRA **18,807.01 HH** / **S/ 479,578.76** acum IGV; COSTO DIRECTO 18,099.01 HH / **S/ 461,524.76** acum.
  - ISP-SEM30: Acumulado **18,663.01 HH** vs META 15,318.29 â†’ VAR **-3,075.73 HH**, **CPI 0.82** (sobreconsumo de HH ~20% vs meta).
  - Costo MO: **S/ 25.50/HH** (constante).
  - Forecast - Meta (anÃ¡lisis respecto al ppto) ~ 5,939.83 HH.
- **PropÃ³sito:** versiÃ³n vigente del ISP/CR del proyecto al corte semana 30; mismo rol de control que el SEM29 pero con la data mÃ¡s actual (es el archivo a usar como fuente).
- **Origen â†’ Destino:** igual que SEM29 (tareos de campo + metrados + presupuesto F1/F2 + adicionales + APU). Destino = informe semanal y Resultado Operativo. Reemplaza al SEM29 como corte vigente.
- **AutomatizaciÃ³n (GRAPCO):** mismo destino que SEM29 â†’ mÃ³dulo **ISP** + **Curva S/EVM** + pata MO del **RO**. Por ser acumulativo, basta ingerir SOLO el libro mÃ¡s reciente (SEM30) para tener todo el histÃ³rico de semanas; cargar HH por partida/semana a `Registros_Campo` y dejar que la plataforma recalcule IP/CPI/VAR contra el presupuesto WBS. GAP igual: anÃ¡lisis de variaciÃ³n por causa de CHH.

---

## Notas de consolidaciÃ³n del chunk
- Los 2 archivos son **el mismo documento en dos cortes** (SEM29 y SEM30). Para la migraciÃ³n usar Ãºnicamente **SEM30** (es superset). Esto evita duplicar el histÃ³rico de 30 semanas.
- Toda la valorizaciÃ³n usa **S/ 25.50/HH** (coherente con `COSTO_HORA_PROMEDIO`).
- Las tres lentes de control estÃ¡n separadas: **CR** (costo S/), **CHH** (variaciÃ³n de HH por causa), **CIP** (Ã­ndice de productividad), todas colgando del catÃ¡logo **PC**.



---

# Catalogo Costos â€” Seccion 6. ISP (cont. 8) â€” `cat_6_ISP__p8`

Chunk con **1 archivo** (workbook maestro del ISP CREDITEX, semana de corte SEM31).

---

### \05. GestiÃ³n Costos\6. ISP\PRO-GCR-FOR-F01_ISP CREDITEX SEM31.xlsx

- **Tipo / formato:** Excel (.xlsx), 8 577 KB. Codigo de formato: **PRO-GCR-FOR-F01** (Informe Semanal de Produccion â€” ISP). Es el archivo maestro acumulado del ISP del proyecto CREDITEX (PTAR/F1 + NAVE/F2 + Adicionales), con una hoja por semana ademas de las hojas de control.

- **Hojas (35):** `PC` | `CR` | `CHH` | `CIP` | y 31 hojas semanales `ISP-SEM31` ... `ISP-SEM01`.

- **Contenido a detalle por hoja:**

  - **PC (Partidas Control)** â€” rango B1:L992. Catalogo maestro de partidas de control con su CODIGO. Estructura jerarquica: titulos (1 = TRABAJOS PRELIMINARES, codigo 1001), sub-titulos (SEGURIDAD Y SALUD OCUPACIONAL, TOPOGRAFIA, etc.) y partidas con unidad (GLB, MES). Ej.: ALQUILER DE ANDAMIOS PARA TRABAJOS (GLB), SEÃ‘ALIZACION TEMPORAL DE SEGURIDAD (GLB), MITIGACION DE POLVO (MES), LIMPIEZA GENERAL Y PERMANENTE (MES). ~80 filas. Es la lista rectora de partidas que ordena todas las hojas semanales.

  - **CR (Control de Resultado / Reporte Tareos)** â€” rango B1:J1019. Resumen ejecutivo del costo de obra por partida. Costo MO promedio = **25.50** S/h. Columnas: FRENTE (PRE1, PRE2...) | codigo de FRENTE (FA01) | codigo partida (1.01, 1.02) | Descripcion | HH | COSTO | ACUM S/ IGV | COMENTARIOS (ING. DE PRODUCCION). Encabeza con la semana de corte (cabecera muestra SEMANA NÂ° 24 13/04/2026-19/04/2026). Totales de control: **TOTAL COSTO DE OBRA = 17 059 HH / S/ 301 537.50 / acum S/ 435 004.50**; **COSTO DIRECTO = 16 619 HH / S/ 290 317.50 / acum S/ 423 784.50**; **TRABAJOS PRELIMINARES = 3 940.25 HH / S/ 18 570.38 / acum S/ 100 476.38**; SSO (PRE1/FA01/1.01) = 728.25 HH; TOPOGRAFIA (PRE2/FA01/1.02) = 1 058 HH / S/ 26 979. ~70 filas.

  - **CHH (Control HH Variaciones)** â€” rango B2:AP45. Cuadro semana a semana de horas-hombre comparando ADMINISTRACION (planilla) vs CAMPO (tareo) vs META. Columnas: SEMANA | HH PLANILLA (semanal) | HH PLANILLA ACUM | HH CAMPO semanal | HH CAMPO ACUM | CONTROL HH CAMPO ACUM | DELTA HH ACUM | (comparativo) HH PLANILLA ACUM | HH CAMPO ACUM | DELTA HH ADM VS CAMPO | (actual) HH CAMPO ACUM | HH META ACUM | HH VARIACION | **CPI** | y desglose de variacion por partida/categoria (PRE, PRO, CON, ACE, CUR, VAE, TAB, BIT, CONT, PRH, VAA, IIEE). Datos por semana 1..N. Ej.: Sem1 CPI 0.46 (239 HH campo vs 109.03 meta, var -129.97); Sem2 CPI 0.56; Sem5 CPI 0.73; Sem6 CPI 0.75. Totales generales: HH PLANILLA = 16 479.50, HH CAMPO = 16 464, delta = 16.

  - **CIP (Control de IP)** â€” rango B2:N230. Control del Indice de Productividad por partida (IP = HH/metrado). Columnas: partida | IP Contractual | IP Meta | IP Actual Acum por semana (SEM21, SEM22, SEM23, SEM24, SEM25...) | DELTA | COMENTARIO. Ej.: ALQUILER ANDAMIOS (IP contractual 30 / meta 25); ARMADO/DESARMADO ANDAMIOS (contr 136.85 / meta 130 / actual 82.50, delta 54.35, IP 2.71); SEÃ‘ALIZACION (contr 96 / meta 90 / actual 178.93â†’147.35, delta -82.93, comentario "ACTUALIZAR APU REAL"); ILUMINACION (contr 16 / meta 12 / actual 11.26â†’7.65). ~220 filas.

  - **ISP-SEM31 ... ISP-SEM01 (31 hojas semanales)** â€” rango tipico B1:CG1159 (semanas recientes con frentes separados F1/F2) / B1:BM/BP en semanas anteriores (frentes consolidados). Cada hoja es el ISP de una semana con esta estructura de columnas: CODIGO | PARTIDA DE CONTROL PRESUPUESTO | UND | bloques PREVISION repetidos (METRADO/HH/IP) para: **PPTO OFERTA PTAR (F1)**, **PPTO OFERTA NAVE (F2)**, **ADICIONALES**, **PPTO CONTRACTUAL (1)**, **PPTO META (2)**, **ACUMULADO ANTERIOR (4)** | META | VAR | **CPI (2/1)** | luego avance diario LUNES..DOMINGO (METRADO/HH/IP por dia con fecha real) | **PRESENTE SEMANA** (METRADO/HH/IP) | META | VAR | ademas bloques "ANALISIS RESPECTO AL META" y "ANALISIS RESPECTO AL PPTO" (DELTA (1)-(2), DELTA (1)-(3), FORECAST-META). Cada hoja arrastra su periodo y los acumulados de la anterior. ~180-240 filas por hoja (todas las partidas del PC).
    - Evolucion clave en la fila de totales (HH acum vs META vs CPI):
      - SEM01 (03-09/11/2025): arranque, 239 HH presente.
      - SEM02 (10-16/11): acum 558.50 HH, meta 312.23, CPI 0.56.
      - SEM05 (01-07/12): acum 1 405.50 HH, CPI 0.73.
      - SEM06 (08-14/12): acum 1 670.50 HH, CPI 0.75.
      - SEM23 (06-12/04/2026): acum 16 464 HH, meta 11 930.36, CPI 0.72.
      - SEM24 (13-19/04): CONTROL 17 059 HH; acum 16 464; meta 11 930.36; VAR -4 533.65; CPI 0.72.
      - SEM25 (20-26/04): acum 17 091, meta 12 909.23, CPI 0.76; CONTROL 17 680.51.
      - SEM26 (27/04-03/05): acum 17 680.51, CPI 0.84; CONTROL 18 139.01.
      - SEM27 (04-10/05): acum 18 139.01, CPI 0.84; CONTROL 18 394.01.
      - SEM28 (11-17/05): acum 18 394.01, CPI 0.83; CONTROL 18 516.01.
      - SEM29/30/31 (mayo-jun): CONTROL escala 18 663 â†’ 18 807 â†’ 19 017.51; CPI ~0.81-0.83; metas ~15 318-15 379.
    - Nota: varias cabeceras de SEM10-SEM18 muestran el rotulo "SEMANA NÂ° 06 08/12/2025" como texto residual de plantilla, pero las fechas reales de los dias y los rangos de fecha del titulo corresponden a su semana (ej. SEM18 = 02-08/03/2026). SEM01-SEM03 usan el rotulo antiguo "INFORME SEMANAL DE PRODUCCION - PRECOT" y un solo PPTO ("PPTO 1"); a partir de SEM20 se separan F1/F2.
    - Se observan errores de formula (#DIV/0!, #VALUE!, #REF!) en columnas de IP/forecast de varias semanas cuando no hay metrado/HH.

- **Numeros clave (totales del proyecto, hoja CR y filas de total de cada ISP):**
  - Costo MO promedio: **S/ 25.50 / hora** (cuadra con la regla unica de la plataforma).
  - TOTAL COSTO DE OBRA (SEM24): **17 059 HH** = S/ 301 537.50 (acum S/ 435 004.50).
  - COSTO DIRECTO (SEM24): **16 619 HH** = S/ 290 317.50 (acum S/ 423 784.50).
  - HH META acum (SEM24): 11 930.36; VAR -4 533.65; **CPI 0.72**.
  - HH acumuladas CONTROL al corte mas reciente (SEM31): **~19 017.51 HH**; META ~15 318.29; VAR ~ -3 075.73; **CPI ~0.81**.
  - PPTO META (META total HH, fila 7): F1+F2 ~17 577.26 HH; PPTO CONTRACTUAL ~22 728.79 HH (semanas recientes con F1 17 160.53 + F2 798.34 + Adicionales 2 453.01).
  - CHH: HH PLANILLA total 16 479.50 vs HH CAMPO 16 464 (delta 16).

- **Proposito:** Es el corazon del control de produccion/costo de mano de obra del proyecto. Mide semana a semana el avance fisico (metrado), las HH consumidas y el Indice de Productividad (IP) por partida, comparando contra el presupuesto contractual y la meta, y calculando CPI, variaciones de HH y forecast. Traduce las HH a costo via S/25.50/h. Sirve para detectar partidas con sobreconsumo de HH (CPI < 1) y para alimentar el Resultado Operativo con las 4 patas de mano de obra.

- **Origen -> Destino:**
  - Origen: tareos diarios de campo (HH y metrado por partida y por dia) + presupuesto de oferta F1/F2 + adicionales + APU meta (IP meta). HH planilla viene de administracion (CHH).
  - Destino: alimenta el Reporte de Resultado (hoja CR), el Control de HH (CHH) y el Control de IP (CIP) del mismo libro; y aguas abajo es la fuente de la mano de obra valorizada para el RO/CR y para el seguimiento de Curva S / EVM del proyecto.

- **Automatizacion (mapeo GRAPCO):**
  - Destino natural: **modulo ISP** de GRAPCO (tareos HH x S/25.5). Las hojas semanales son exactamente el detalle diario METRADO/HH/IP por partida que el ISP de la plataforma ya modela; la fuente unica deben ser los Registros_Campo (tareos) y el Catalogo_WBS (partidas/IP meta), no este Excel.
  - Hoja CR -> alimenta el **Resultado Operativo (RO/CR + F06)** como la pata de mano de obra valorizada (HH x 25.5).
  - Hoja CHH (planilla vs campo) -> hoy es un GAP: **Control de Planilla** no existe en la plataforma; importar via importador generico in-app o crear vista de conciliacion HH planilla vs HH campo.
  - Hoja CIP (IP contractual/meta/actual por partida) -> el CPI de la plataforma ya toma IP Meta/Presupuesto del Catalogo WBS (fuente unica); CIP serviria para validar/cargar esos IP meta y para el seguimiento de productividad por partida.
  - Curva S: las HH acumuladas meta vs reales por semana (fila de totales de cada ISP + CHH) alimentan la **Curva S (F07)** y el EVM.
  - Ingesta recomendada: parser por hoja semanal (cabecera de semana + matriz partida x dia) -> normalizar a registros de tareo; las hojas PC/CR/CHH/CIP como tablas de control derivadas/calculadas en la plataforma, no importadas tal cual.



---

# Categoria 7 â€” Valorizaciones (Cliente) Â· PTARI Â· chunk p1

Proyecto: PTAR PLANTA 5 - CREDITEX. Contratista GRAPCO SAC. Supervision DISEÃ‘OS RACIONALES (DIRAC). Proyectista HIGASHI INGENIEROS SAC. Ubicacion: Calle Los Hornos 185, Urb. Vulcano, Ate. Residente: Ing. Guido Gonzales. Plazo contractual 130 D.C.

Este chunk cubre las VALORIZACIONES MENSUALES/QUINCENALES AL CLIENTE de la PTARI (VAL 01 a VAL 06 + LIQUIDACION) con sus SUSTENTOS DE METRADO por partida. Hay dos tipos de archivo:
- **F07 (valorizacion al cliente)**: el formato oficial GP-GCE-FOR-F07 con caratula, cronograma de pagos, resumen, hoja VAL (formato cliente PRESUPUESTO/ACUM. ANT./ACTUAL/ACUM./SALDO) y hoja RO (cruce interno frente/partida vs valorizacion). Estos son la FUENTE PRINCIPAL de dato.
- **Sustentos de metrado (PRO-GCE-FOR-F03)**: memorias de metrado por partida (excavacion, calzadura, demolicion, concreto, acero, encofrado, etc.) con hojas Metrado / Sustento de campo / Reporte de Guias / Sustento Fotografico. Respaldan la cantidad valorizada; no traen montos S/, traen cantidades fisicas (m3, m2, kg, und).

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\1. PTAR-VAL 01\1. Sustento Metrado\01. Excavacion\01. Sustento_Eliminacion de Excavacion_Val01.xlsx (10332 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado, codigo PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida
- **Contenido:**
  - *1. Metrado*: cabecera (obra, cliente CREDITEX/PRECOTEX, fecha 13/12/2025). Partida 3 MOVIMIENTO DE TIERRAS, columnas ITEM / DESCRIPCION / UND / CANT.
  - *2. Sustento Elim.*: sustento de salida de volquetes; Factor de esponjamiento 0.30; TOTAL ELIMINADO A LA FECHA = 1398 m3; TOTAL EXCAVADO MASIVO = 1075.38 m3 (rango hasta S997, ~36 filas de detalle por volquete).
  - *3. Guias de Salida*: control de guias por semana (26-11-2025 al 29-11-2025; 01-12-2025 al 05-12-2025).
- **Numeros clave:** eliminado 1398 m3; excavado masivo 1075.38 m3; factor esponj. 0.30.
- **Proposito:** sustentar metrado de eliminacion/excavacion valorizado en VAL01.
- **Origen -> Destino:** guias de salida de volquetes + medicion campo -> alimenta cantidad de la partida mov. tierras en F07 VAL01.
- **Automatizacion:** GAP de sustento de metrado fisico. Las cantidades validadas se ingieren al modulo Valorizaciones (cliente) como cantidad de partida; las guias podrian ir al importador generico in-app. No alimenta RO directamente (costo MO via ISP).

### \...\1. PTAR-VAL 01\1. Sustento Metrado\01. Excavacion\SUPERADO\01. Sustento_Eliminacion de Excavacion.xlsx (11048 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado PRO-GCE-FOR-F03 (version SUPERADA/obsoleta).
- **Hojas:** 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida (identicas a la vigente).
- **Numeros clave:** TOTAL ELIMINADO 1530 m3; TOTAL EXCAVADO MASIVO 1176.92 m3 (cifras mayores que la version vigente -> fue corregida a la baja).
- **Proposito:** version anterior del sustento de excavacion VAL01.
- **Origen -> Destino:** reemplazada por la version en carpeta padre.
- **Automatizacion:** NO ingerir (carpeta SUPERADO = obsoleto). Util solo como traza de revision.

### \...\1. PTAR-VAL 01\1. Sustento Metrado\02. Calzadura\01. Sustento_Calzaduras_Val01.xlsx (9927 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico
- **Contenido:**
  - *Metrado*: partida 4 ESTRUCTURAS (calzaduras), ITEM/DESCRIPCION/UND/CANT.
  - *Sustento*: tabla DATOS vs RESULTADOS por calzadura, con MOV. TIERRA, CONCRETO, ENCOFRADO (rango hasta S58, ~31 filas).
  - *Report. de Guias*: sustento de llegada de concreto + guias de eliminacion.
  - *Sust. Fotografico*: evidencia fotografica.
- **Numeros clave:** detalle por calzadura (no se ve total agregado en el volcado).
- **Proposito:** sustentar metrado de calzaduras (mov. tierra + concreto + encofrado) de VAL01.
- **Origen -> Destino:** medicion campo + guias concreto -> cantidad partida ESTRUCTURAS/calzaduras en F07 VAL01.
- **Automatizacion:** Valorizaciones (cliente) como cantidad; guias de concreto al importador generico (cruce con Almacen). GAP de sustento estructurado.

### \...\1. PTAR-VAL 01\1. Sustento Metrado\02. Calzadura\SUPERADO\01. Sustento_Calzaduras.xlsx (8982 KB)
- **Tipo / formato:** xlsx â€” sustento calzaduras PRO-GCE-FOR-F03 (SUPERADO/obsoleto).
- **Hojas:** 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico (mismo layout, menos filas: Sustento hasta S52 ~23 filas).
- **Proposito:** version anterior del sustento de calzaduras VAL01.
- **Automatizacion:** NO ingerir (SUPERADO).

### \...\1. PTAR-VAL 01\1. Sustento Metrado\03. Demolicion\01. Sustento_Demolicion_Val01.xlsx (10860 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico
- **Contenido:**
  - *Metrado*: partida 2 OBRAS PROVISIONALES (demolicion), ITEM/DESCRIPCION/UND/CANT.
  - *Sustento*: tabla DATOS/DEMOLICION/PARCIALES: TIPO DE ELEM., NÂ° DE REGISTRO, Area (m2), FECHA, PLACA (volquete), EXCAV., ELIM. (rango hasta Q65, ~27 filas).
  - *Report. de Guias*: sustento de salida de volquetes.
  - *Sust. Fotografico*: evidencia.
- **Proposito:** sustentar metrado de demolicion (area m2 + eliminacion) VAL01.
- **Origen -> Destino:** registros de campo + guias volquetes -> cantidad partida demolicion F07 VAL01.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento estructurado.

### \...\1. PTAR-VAL 01\1. Sustento Metrado\03. Demolicion\SUPERADO\01. Sustento_Demolicion.xlsx (10860 KB)
- **Tipo / formato:** xlsx â€” sustento demolicion PRO-GCE-FOR-F03 (SUPERADO, layout identico).
- **Automatizacion:** NO ingerir (SUPERADO).

### \...\1. PTAR-VAL 01\2. Superado\GP-GCE-FOR-F07_VAL NÂ°01 ACTUALIZADO 2025.12.13.xlsx (485 KB)
- **Tipo / formato:** xlsx â€” **VALORIZACION AL CLIENTE F07** (codigo GP-GCE-FOR-F07). Version SUPERADA (carpeta "2. Superado").
- **Hojas:** CarÃ¡tula | 1. PAGOS | 2. RESUMEN | 3. VAL | 4. RO | Hoja1 | Hoja 8
- **Contenido:**
  - *CarÃ¡tula*: VALORIZACION NÂ°01, revision NÂ°01, 13/12/2025.
  - *1. PAGOS*: cronograma de pagos (GP-GCE-FOR-F07 pag 1 de 5); periodo DICIEMBRE, del 01 al 13/12/2025.
  - *2. RESUMEN*: cuadro resumen de valorizaciones - PRE. MONTO CONTRATADO 2,747,424.05 (inc IGV); 2,328,325.47 (no IGV); COSTO DIRECTO 1,692,825.73.
  - *3. VAL*: hoja de valorizacion por ITEM/DESCRIPCION con columnas PRESUPUESTO (UND, CANT, P.U., PARCIAL), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL (cant/%/total). ~131 filas de partidas.
  - *4. RO*: cruce interno FRENTE/PARTIDA/Descripcion (Ppto F1 PTARI vs Valorizacion Quincenal vs Acumulada). TOTAL COSTO DE OBRA 2,175,971.15; COSTO DIRECTO 1,692,825.73; valorizacion actual 243,951.90 (costo obra) / 189,785.63 (CD). Partidas con codigo (FA01 1.01 SSO 51,152.49; 1.02 TOPOGRAFIA 41,113.36...).
  - *Hoja1*: tabla auxiliar de areas (LONGITUD/ALTO/AREA, total 286.80).
  - *Hoja 8*: cronograma EGRESOS por semana (Sem 1..24) por rubro (Trabajos Preliminares, Obras Provisionales, SC Mov tierras, SC Encofrado Cori...) â€” con #REF! (formula rota).
- **Numeros clave:** Contratado 2,747,424.05 c/IGV; CD 1,692,825.73; VAL01 actual 243,951.90 (TCO) / 189,785.63 (CD).
- **Proposito:** valorizacion NÂ°01 al cliente, version inicial superada.
- **Origen -> Destino:** sustentos de metrado (excavacion/calzadura/demolicion) + presupuesto contractual -> esta F07; la hoja RO cruza con el Resultado Operativo interno.
- **Automatizacion:** NO ingerir (superada). El layout F07 es la fuente del modulo Valorizaciones (cliente) y la hoja RO mapea al modulo RO/CR (frente+partida).

### \...\1. PTAR-VAL 01\GP-GCE-FOR-F07_VAL NÂ°01 2025.12.16.xlsx (487 KB)
- **Tipo / formato:** xlsx â€” **VALORIZACION AL CLIENTE F07 VAL NÂ°01 VIGENTE** (GP-GCE-FOR-F07), 16/12/2025.
- **Hojas:** CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8
- **Contenido:**
  - *1. RESUMEN*: VALORIZACION NÂ°01, mes DICIEMBRE 2025. PRESUPUESTO REFERENCIAL 2,866,414.72 inc/IGV; plazo 130 D.C.
  - *3. RES.VAL*: MONTO REFERENCIAL 2,866,414.72 (inc IGV) / 2,429,165.02 (no IGV); COSTO DIRECTO 1,785,339.08.
  - *4. VAL*: hoja valorizacion cliente (mismo layout PRESUPUESTO/ACUM ANT/ACTUAL/ACUM/SALDO), ~112 filas.
  - *5. RO*: TOTAL COSTO DE OBRA 2,234,192.66; COSTO DIRECTO 1,751,047.24; VAL01 actual 228,449.28 (TCO) / 179,046.99 (CD).
  - *Hoja1* areas (=286.80); *Hoja 8* cronograma egresos por semana (#REF!).
- **Numeros clave:** Referencial 2,866,414.72 c/IGV; CD 1,785,339.08; VAL01 actual 228,449.28 (TCO).
- **Proposito:** valorizacion NÂ°01 oficial entregada al cliente (diciembre 2025).
- **Origen -> Destino:** sustentos VAL01 + ppto -> F07; RO cruza con Resultado Operativo.
- **Automatizacion:** Modulo Valorizaciones (cliente): cargar hoja VAL (cantidades, %, acumulados). Hoja RO -> modulo RO/CR (F06) cruce frente/partida. Hoja PAGOS -> GAP Flujo de Caja. Importador F07 dedicado (acumulados por valorizacion).

### \...\1. PTARI\10. PTAR-LIQUIDACION\1. Sustento de metrados\1. Arquitectura\Sustento_Arquitectura_Liquidacion.xlsx (1920 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de liquidacion PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento | 3. Met_Bit | 3. Met_Imp | 4. Sust. Fotografico
- **Contenido:** hoja Metrado (rango B2:W992, gran detalle de partidas de arquitectura); hojas Met_Bit y Met_Imp (metrados auxiliares); Sustento y Sustento Fotografico. (Volcado mostro solo cabecera del Metrado.)
- **Proposito:** sustentar metrado de ARQUITECTURA para la LIQUIDACION del contrato.
- **Origen -> Destino:** medicion final campo -> cantidades partidas arquitectura en F07 LIQUIDACION.
- **Automatizacion:** Valorizaciones (cliente) - cierre/liquidacion. GAP sustento.

### \...\1. PTARI\10. PTAR-LIQUIDACION\GP-GCE-FOR-F07_CREDITEX PTAR_LIQUIDACION.xlsx (1620 KB)
- **Tipo / formato:** xlsx â€” **LIQUIDACION FINAL F07** (GP-GCE-FOR-F07), 30/04/2026.
- **Hojas:** CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios
- **Contenido:**
  - *1. RESUMEN*: LIQUIDACION, mes ABRIL 2026 (periodo 16 al 30). PRESUPUESTO REFERENCIAL 2,917,811.21; plazo 130 D.C.
  - *3. RES.VAL*: MONTO REFERENCIAL 2,917,862.75 (inc IGV) / 2,472,765.04 (no IGV); COSTO DIRECTO 1,840,622.06 (~48 filas resumen acumulado por valorizacion).
  - *4. VAL*: hoja valorizacion final (~269 filas de partidas, layout cliente).
  - *5. / 6. APUs Nuevos*: ANALISIS DE NUEVOS PRECIOS UNITARIOS (GP-GCE-FOR-F01) â€” APUs de partidas nuevas surgidas en obra (adicionales).
  - *5. RO*: TOTAL COSTO DE OBRA 2,327,812.70 (= acumulado final); COSTO DIRECTO 1,840,622.06; valorizacion del periodo 90,617.08 (TCO) / 71,651.73 (CD).
  - *6. Servicios*: ADICIONAL DE ARQUITECTURA, TRAMITE MUNICIPAL.
- **Numeros clave:** Referencial liquidacion 2,917,862.75 c/IGV; CD 1,840,622.06; **acumulado final de obra 2,327,812.70** (TCO) / 1,840,622.06 (CD).
- **Proposito:** liquidacion/cierre del contrato PTARI â€” cuadro final acumulado de todo lo valorizado + APUs nuevos + servicios adicionales.
- **Origen -> Destino:** suma de VAL01..06 + adicionales -> liquidacion; cruce final con RO.
- **Automatizacion:** Valorizaciones (cliente) cierre; APUs Nuevos -> modulo Adicionales/Deductivos (con APU F01); RO -> RO/CR; Servicios/adicionales -> Adicionales. Importador F07 (modo liquidacion = acumulado total).

### \...\1. PTARI\2. PTAR-VAL 02\1. Sustento Metrados\01. Excavacion\01. Sustento_Eliminacion de Excavacion_Val02.xlsx (10750 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado PRO-GCE-FOR-F03.
- **Hojas:** 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida | 4. Sustento Metrados | 5. Sustento Fotografico
- **Contenido:** metrado eliminacion/excavacion VAL02 (guias de salida de volquetes + factor esponjamiento + sustento fotografico). Detalle por volquete y semana.
- **Proposito:** sustentar metrado de excavacion/eliminacion de VAL02.
- **Origen -> Destino:** guias volquetes -> cantidad partida mov. tierras F07 VAL02.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

### \...\1. PTARI\2. PTAR-VAL 02\1. Sustento Metrados\02. Concreto\01. Sustento_Concreto_Val02.xlsx (7115 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de concreto PRO-GCE-FOR-F03.
- **Contenido:** metrado de concreto VAL02 (m3 por elemento) con guias de concreto y sustento fotografico.
- **Proposito:** sustentar concreto valorizado en VAL02.
- **Origen -> Destino:** guias de concreto (proveedor) -> cantidad partida concreto F07 VAL02; las guias cruzan con Almacen/insumos.
- **Automatizacion:** Valorizaciones (cliente); guias de concreto al importador generico (cruce Almacen/RO insumos). GAP.

### \...\1. PTARI\2. PTAR-VAL 02\GP-GCE-FOR-F07_VAL NÂ°02 2025.12.30.xlsx (505 KB)
- **Tipo / formato:** xlsx â€” **VALORIZACION AL CLIENTE F07 VAL NÂ°02** (GP-GCE-FOR-F07), 30/12/2025, periodo DICIEMBRE.
- **Hojas:** CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8 (layout estandar).
- **Contenido / Numeros clave:** MONTO REFERENCIAL 2,866,414.72 inc/IGV; 2,429,165.02 no IGV; COSTO DIRECTO 1,785,339.08. Hoja RO: TOTAL COSTO DE OBRA 2,234,192.66; CD 1,751,047.24; **VAL02 actual 90,573.50 (TCO) / 70,986.93 (CD); ACUMULADO 319,022.78 (TCO) / 250,033.92 (CD)**.
- **Proposito:** valorizacion NÂ°02 al cliente.
- **Origen -> Destino:** sustentos VAL02 (excavacion+concreto) -> F07; RO acumula sobre VAL01.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\1. Excavacion\01. Sustento_Eliminacion de Excavacion_Val03.xlsx (4123 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado excavacion/eliminacion PRO-GCE-FOR-F03 (VAL03).
- **Proposito / Origen -> Destino:** guias volquetes -> cantidad mov. tierras F07 VAL03.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\2. Concreto\01. Sustento_Concreto_Val03.xlsx (6844 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL03).
- **Proposito / Origen -> Destino:** guias de concreto -> cantidad partida concreto F07 VAL03.
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico (cruce Almacen). GAP.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\3. Acero\01. Sustento_Acero_Val03.xlsx (22034 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de ACERO PRO-GCE-FOR-F03 (VAL03). Archivo grande (~22 MB, con imagenes).
- **Contenido:** metrado de acero (kg) por elemento, respaldado por guias de remision de acero (PDF en subcarpeta "1. Guias Acero").
- **Proposito:** sustentar acero valorizado en VAL03.
- **Origen -> Destino:** guias de acero proveedor (PDFs) -> peso kg -> cantidad partida acero F07 VAL03.
- **Automatizacion:** Valorizaciones (cliente); guias de acero al importador generico (cruce Almacen/Kardex). GAP sustento.

### \...\1. PTARI\3. PTAR-VAL 03\1. Sustento Metrados\3. Acero\1. Guias Acero\09-0T073-0623829.pdf ... 09-0T073-0623871.pdf (43 PDFs, ~300-700 KB c/u)
- **Tipo / formato:** PDF [no-Excel] â€” GUIAS DE REMISION de acero del proveedor (serie 09-0T073-06238xx).
- **Proposito:** evidencia documental del ingreso de acero usado para sustentar el metrado de acero VAL03.
- **Origen -> Destino:** proveedor de acero -> sustento de la partida de acero VAL03 (y cruce con Almacen).
- **Automatizacion:** GAP â€” son PDFs escaneados. Adjuntar como evidencia en Almacen/Valorizaciones; OCR fuera de alcance del importador actual. Conservar como respaldo.

### \...\1. PTARI\3. PTAR-VAL 03\GP-GCE-FOR-F07_VAL NÂ°03.xlsx (521 KB)
- **Tipo / formato:** xlsx â€” **VALORIZACION AL CLIENTE F07 VAL NÂ°03** (GP-GCE-FOR-F07), 15/01/2026.
- **Hojas:** layout estandar (CarÃ¡tula, RESUMEN, PAGOS, RES.VAL, VAL, RO, Hoja1, Hoja 8).
- **Numeros clave:** MONTO REFERENCIAL 2,866,414.72 / 2,429,165.02; COSTO DIRECTO 1,876,958.15. Hoja RO: TOTAL COSTO DE OBRA 2,234,192.66; CD 1,751,047.24; **VAL03 actual 174,995.81 (TCO) / 137,152.87 (CD); ACUMULADO 494,018.59 (TCO) / 387,186.79 (CD)**.
- **Proposito:** valorizacion NÂ°03 al cliente (enero 2026, incluye excavacion+concreto+acero).
- **Origen -> Destino:** sustentos VAL03 -> F07; RO acumula.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\1. Concreto\01. Sustento_Bomba.xlsx (3963 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de servicio de BOMBA de concreto PRO-GCE-FOR-F03 (VAL04).
- **Proposito:** sustentar el uso/horas/m3 de bomba de concreto valorizados en VAL04.
- **Origen -> Destino:** registros de bombeo -> partida bomba/concreto F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\1. Concreto\01. Sustento_Concreto_Val04.xlsx (11448 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL04).
- **Proposito / Origen -> Destino:** guias de concreto -> cantidad partida concreto F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\1. Concreto\Copia de 01. Sustento_Puerta Cortafuegos1.xlsx (4812 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de PUERTA CORTAFUEGOS PRO-GCE-FOR-F03 (VAL04). (Nombre "Copia de", posible duplicado de trabajo.)
- **Proposito:** sustentar suministro/instalacion de puerta cortafuegos valorizada en VAL04.
- **Origen -> Destino:** sustento -> partida puerta cortafuegos F07 VAL04 (probable adicional).
- **Automatizacion:** Valorizaciones (cliente) / posible Adicionales. GAP.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\2. Acero\01. Sustento_Acero_Val04.xlsx (16954 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de ACERO PRO-GCE-FOR-F03 (VAL04), archivo grande con imagenes/guias.
- **Proposito / Origen -> Destino:** guias de acero -> kg -> partida acero F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico (cruce Almacen). GAP.

### \...\1. PTARI\4. PTAR-VAL 04\1. Sustento Metrados\3. Excavacion\01. Sustento_Eliminacion de Excavacion_Val04.xlsx (4190 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado excavacion/eliminacion PRO-GCE-FOR-F03 (VAL04).
- **Proposito / Origen -> Destino:** guias volquetes -> mov. tierras F07 VAL04.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\4. PTAR-VAL 04\GP-GCE-FOR-F07_VAL NÂ°04.xlsx (525 KB)
- **Tipo / formato:** xlsx â€” **VALORIZACION AL CLIENTE F07 VAL NÂ°04** (GP-GCE-FOR-F07), 30/01/2026.
- **Hojas:** layout estandar.
- **Numeros clave:** MONTO REFERENCIAL 2,866,414.72 / 2,429,165.02; COSTO DIRECTO 1,915,342.93. Hoja RO: **TOTAL COSTO DE OBRA 2,422,311.29; CD 1,915,342.93; VAL04 actual 548,394.09 (TCO) / 433,620.05 (CD); ACUMULADO 1,141,789.55 (TCO) / 902,823.08 (CD)** (salto fuerte por concreto+acero+adicionales).
- **Proposito:** valorizacion NÂ°04 al cliente (mayor avance del proyecto).
- **Origen -> Destino:** sustentos VAL04 (concreto, bomba, acero, excavacion, puerta cortafuegos) -> F07; RO acumula.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\1. Concreto\01. Sustento_Concreto_Val05.xlsx (10996 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL05).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\2. Encofrado\01. Sustento_Encofrado_Val05.xlsx (31643 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de ENCOFRADO PRO-GCE-FOR-F03 (VAL05). Archivo muy grande (~31 MB, fotografico).
- **Contenido:** metrado de encofrado (m2) por elemento + sustento fotografico.
- **Proposito / Origen -> Destino:** medicion campo -> cantidad partida encofrado F07 VAL05.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\3. Acero\01. Sustento_Acero_Val05.xlsx (2901 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de acero PRO-GCE-FOR-F03 (VAL05).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val05.xlsx (4375 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de ACARREO CON CAMION GRUA PRO-GCE-FOR-F03 (VAL05).
- **Proposito:** sustentar horas/viajes de camion grua valorizados en VAL05.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\4. Cordon BentonÃ­tico\01. Sustento_Cordon BentonÃ­tico_Val05.xlsx (25923 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de CORDON BENTONITICO / junta hidroexpansiva PRO-GCE-FOR-F03 (VAL05). Archivo grande (~25 MB).
- **Proposito:** sustentar ml de cordon bentonitico/junta valorizados en VAL05.
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\1. Sustentos Metrado\5. ExcavaciÃ³n\01. Sustento_ExcavaciÃ³n_Val05.xlsx (5365 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de excavacion PRO-GCE-FOR-F03 (VAL05).
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\5. PTAR-VAL 05\GP-GCE-FOR-F07_VAL NÂ°05.xlsx (590 KB)
- **Tipo / formato:** xlsx â€” **VALORIZACION AL CLIENTE F07 VAL NÂ°05** (GP-GCE-FOR-F07), 15/02/2026.
- **Hojas:** layout estandar.
- **Numeros clave:** MONTO REFERENCIAL 2,866,414.72 / 2,429,165.02; COSTO DIRECTO 1,826,881.62. Hoja RO: **TOTAL COSTO DE OBRA 2,310,435.34; CD 1,826,881.62; VAL05 actual 179,035.92 (TCO) / 141,565.28 (CD); ACUMULADO 1,320,825.47 (TCO) / 1,044,388.36 (CD)**.
- **Proposito:** valorizacion NÂ°05 al cliente (concreto, encofrado, acero, acarreo grua, cordon bentonitico, excavacion).
- **Origen -> Destino:** sustentos VAL05 -> F07; RO acumula.
- **Automatizacion:** Valorizaciones (cliente) + RO/CR; PAGOS -> GAP Flujo de Caja.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\1. Concreto\Sustento_Concreto_Val06.xlsx (28833 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de concreto PRO-GCE-FOR-F03 (VAL06). Archivo grande (~28 MB).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\2. Encofrado\01. Sustento_Encofrado_Val06.xlsx (32211 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de encofrado PRO-GCE-FOR-F03 (VAL06). Archivo muy grande (~32 MB).
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\3. Acero\01. Sustento_Acero_Val06.xlsx (550 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de acero PRO-GCE-FOR-F03 (VAL06).
- **Automatizacion:** Valorizaciones (cliente); guias al importador generico. GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val06.xlsx (11396 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de acarreo con camion grua PRO-GCE-FOR-F03 (VAL06).
- **Automatizacion:** Valorizaciones (cliente). GAP.

### \...\1. PTARI\6. PTAR-VAL 06\1. Sustento Metrado\5. Cordon BentonÃ­tico\01. Sustento_Cordon BentonÃ­tico_Val06.xlsx (26252 KB)
- **Tipo / formato:** xlsx â€” sustento de metrado de CORDON BENTONITICO PRO-GCE-FOR-F03 (VAL06), 29/12/2025.
- **Hojas:** 1. Metrado | Met_MC | 2. Sust. Fotografico
- **Contenido:**
  - *1. Metrado*: partida cordon bentonitico, ITEM/DESCRIPCION/UND/CANT (pag 01 de 04).
  - *Met_MC (Muros de Contencion)*: colocacion de junta hidroexpansiva. Item 1 COLOCACION DE JUNTA HIDRO EXPANSIVA = 338.14 (ml); 1.1 junta hidro expansiva 13" = 297.53; incluye TANQUE DE OXIDACION (~11 filas).
  - *2. Sust. Fotografico*: evidencia (13/02/2026).
- **Numeros clave:** junta hidroexpansiva total 338.14 ml (de los cuales 297.53 ml de 13").
- **Proposito:** sustentar ml de cordon bentonitico/junta hidroexpansiva valorizados en VAL06 (muros de contencion, tanque de oxidacion).
- **Origen -> Destino:** medicion campo muros/tanque -> cantidad partida cordon bentonitico F07 VAL06.
- **Automatizacion:** Valorizaciones (cliente). GAP sustento.

---

**Nota:** en este chunk (p1) las F07 presentes son VAL01 (vigente + superada), VAL02, VAL03, VAL04, VAL05 y la LIQUIDACION. La F07 de VAL06 NO esta en este chunk (solo sus sustentos de metrado); presumiblemente cae en el chunk p2.



---

# CATEGORIA 7 â€” Valorizaciones (cont. 2) â€” Fichas detalladas

Chunk: `cat_7_Valorizaciones__p2.txt`
Proyecto: CREDITEX (PTARI "PTAR Planta 5" + NAVE "Estructura MetÃ¡lica y Losa Colaborante").
Contratista: GRAPCO SAC Â· SupervisiÃ³n: DiseÃ±os Racionales SAC (DIRAC).
UbicaciÃ³n: Av. Los Hornos 185, URB. Vulcano, Ate.

Naturaleza del chunk: valorizaciones quincenales al CLIENTE (formato F07) por periodo, mÃ¡s sus carpetas de SUSTENTO DE METRADOS por especialidad (concreto, encofrado, acero, acarreo, cordÃ³n bentonÃ­tico, arquitectura, excavaciÃ³n/eliminaciÃ³n, nave industrial), y las valorizaciones de la NAVE + Adicionales.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\6. PTAR-VAL 06\GP-GCE-FOR-F07_VAL NÂ°06.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** (ValorizaciÃ³n Mensual/Quincenal de cliente). APUs nuevos internos usan **GP-GCE-FOR-F01**.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido:
  - **CarÃ¡tula / 1. RESUMEN**: Obra "PTAR Planta 5", Cliente CREDITEX, SupervisiÃ³n DIRAC, Residente Ing. Guido Gonzales, ValorizaciÃ³n NÂ°06, periodo FEBRERO 2026 (16â€“28 feb), plazo 130 D.C.
  - **2. PAGOS**: cronograma de pagos (F07, pÃ¡g 1 de 5).
  - **3. RES.VAL**: resumen de valorizaciones; montos referenciales y costo directo acumulado.
  - **4. VAL** (A1:AD1052, +196 filas): cuerpo de valorizaciÃ³n por ITEM/DESCRIPCIÃ“N con PRESUPUESTO (Und, Cant, P.U., Parcial), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO y SALDO REFERENCIAL (Cantidad / % / Total cada uno).
  - **5. APUs Nuevos / 6. APUs Nuevos.**: anÃ¡lisis de precios unitarios nuevos (F01).
  - **5. RO**: vista interna costo de obra por FRENTE/PARTIDA (Ppto F1 PTARI, ValorizaciÃ³n Quincenal, Acumulada).
- NÃºmeros clave: Monto referencial 2'866,414.72 (inc. IGV) / 2'429,165.02 (no inc. IGV); Costo Directo 1'713,447.90; Presupuesto referencial 2'739,001.11. RO: Total Costo Obra 2'166,977.07 / quincenal 249,629.66 / acumulado 1'570,455.13; Costo Directo 1'713,447.90 / 197,384.38 / 1'241,772.74.
- PropÃ³sito: valorizaciÃ³n oficial del avance al cliente del periodo (cobro) + control interno (RO).
- Origen -> Destino: metrados de campo (carpetas Sustento) + presupuesto contractual -> documento de cobro al cliente; la hoja "5. RO" alimenta control interno de avance vs presupuesto.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** de GRAPCO; importar hoja 4. VAL (partida, %, montos por periodo) + 5. RO al **RO/CR/F06 + EVM**. APUs nuevos (F01) -> Adicionales/Presupuesto. Importador genÃ©rico in-app sirve para 4. VAL y 5. RO.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\1. Concreto\Sustento_Concreto_Val07.xlsx
- Tipo / formato: xlsx Â· sustento de metrados, **PRO-GCE-FOR-F03** (Metrado/Sustento).
- Hojas: 1. Metrado | 2. Sustento | Met_COL | Met_MC | Met_VIG | 4. Report. de Guias | 5. Sust. Fotografico.
- Contenido: denominaciÃ³n CONCRETO. **1. Metrado** (ITEM/DESCRIPCIÃ“N/UND/CANT). **2. Sustento** (requerimiento de concreto, +62 filas). **Met_COL** (columnas: f'c 210/280/350/420, h, e, Ã¡rea, cant, m3 por resistencia). **Met_MC** (muros de contenciÃ³n: f'c, h, e, largo, m3). **Met_VIG** (vigas: a/h/l, mÂ³ por f'c). **4. Report. de Guias** (sustento de llegada de concreto, guÃ­as). **5. Sust. Fotografico** (evidencia).
- NÃºmeros clave: cabeceras de resistencia f'c 210/280/350/420; metrados por elemento (sin total global explÃ­cito en el volcado).
- PropÃ³sito: sustentar ante supervisiÃ³n el metrado de concreto valorizado en VAL07.
- Origen -> Destino: guÃ­as de remisiÃ³n de concreto + cÃ³mputo de elementos -> metrado que respalda partidas de concreto en GP-GCE-FOR-F07 VAL07.
- AutomatizaciÃ³n: GAP â€” sustentos de metrados detallados no tienen importador propio. Cargar como adjunto de respaldo de partida en Valorizaciones; las guÃ­as de concreto podrÃ­an alimentar AlmacÃ©n/consumos (GAP de ingestiÃ³n de guÃ­as).

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\2. Encofrado\01. Sustento_Encofrado_Val07.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_COL | Met_MC | Met_VIG | 5. Sust. Fotografico.
- Contenido: denominaciÃ³n ENCOFRADO. **2. Sustento** con columnas UND / METRADO ANTERIOR / METRADO ACUMULADO / METRADO ACTUAL. **Met_COL** (h, p, cara, cantidad, m2, curado; ej. C1 8.50/2.40 -> 40.80 m2). **Met_MC** (concreto+encofrado: 1 cara / 2 caras, curado, baranda; ej. muros perimetrales 793.48 m2). **Met_VIG** (encofrado simple/doble, curado; ej. V2 32.56 m2).
- NÃºmeros clave: muros perimetrales 793.48 m2 encofrado; V2 32.56 m2.
- PropÃ³sito: respaldo del metrado de encofrado de VAL07 (m2 ejecutados anterior/actual/acumulado).
- Origen -> Destino: cÃ³mputo de elementos en obra -> partidas de encofrado en F07 VAL07.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo. La estructura ANTERIOR/ACUMULADO/ACTUAL es la base del avance; podrÃ­a mapearse al RO si se normaliza por partida.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\3. Acero\01. Sustento_Acero_Val07.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico | Met_VIG.
- Contenido: denominaciÃ³n ACERO. **2. Sustento** (sustento de campo, descripciÃ³n/und/cantidad). **3. Report. de Guias** (sustento de guÃ­as de acero, A1:AJ1012). **Met_VIG** (tablas de habilitaciÃ³n: TRASLAPE y PESO Ã˜ por diÃ¡metro 0.25/0.40/0.56/0.99/1.55/2.24/3.97/7.91 kg/m; longitudes L1..L6, empalmes, KG totales).
- NÃºmeros clave: tabla de pesos por diÃ¡metro (kg/m) y traslapes; cantidades en KG.
- PropÃ³sito: respaldo del metrado de acero (kg) valorizado en VAL07.
- Origen -> Destino: guÃ­as de acero + planilla de fierros -> partidas de acero en F07 VAL07.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo. Las guÃ­as de acero podrÃ­an alimentar AlmacÃ©n (materiales) si se digitalizan.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val07.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento Metrados | 3. Report. de Guias | 4. Sust. Fotografico.
- Contenido: denominaciÃ³n ACARREO C/CAMIÃ“N GRÃšA. **2. Sustento Metrados** con FECHA / NÂ° GUIA / DESCRIPCION / NÂ° HORAS / UNIDAD / METRADO ANTERIOR / ACUMULADO / ACTUAL (mediciÃ³n por horas). **3. Report. de Guias** (guÃ­as de camiÃ³n grÃºa).
- NÃºmeros clave: mediciÃ³n en horas de servicio (no totales explÃ­citos en volcado).
- PropÃ³sito: respaldo de la partida de acarreo con camiÃ³n grÃºa (horas) en VAL07.
- Origen -> Destino: guÃ­as/partes de horas de equipo -> partida de acarreo en F07 VAL07.
- AutomatizaciÃ³n: GAP â€” adjunto. Horas de equipo podrÃ­an alimentar control de equipos/EV valorizado (no existe importador de equipos).

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\5. Cordon BentonÃ­tico\01. Sustento_Cordon BentonÃ­tico_Val07.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | Met_MC | 2. Sust. Fotografico.
- Contenido: denominaciÃ³n CORDÃ“N BENTONÃTICO (junta hidroexpansiva). **Met_MC**: ITEM / DESCRIPCIÃ“N / UND / NÂ° DE VECES / DIMENSIONES (altura/ancho/largo/anillos) / PARCIAL; ej. "COLOCACIÃ“N DE JUNTA HIDRO EXPANSIVA" 338.14; "JUNTA HIDRO EXPANSIVA 13" 297.53 (ml en tanque de oxidaciÃ³n).
- NÃºmeros clave: junta hidroexpansiva 338.14 (total) / 297.53 (parcial ml).
- PropÃ³sito: respaldo del metrado de cordÃ³n bentonÃ­tico/junta valorizado en VAL07.
- Origen -> Destino: cÃ³mputo de juntas -> partida correspondiente en F07 VAL07.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\6. Nave Industrial\01. Sustento_Nave Industrial_Val07.xlsx
- Tipo / formato: xlsx Â· sustento metrados (estructura completa Nave: MOV/EST + elementos).
- Hojas (16): 3. MOV | 4. EST | Met_MOV | Met_FZ | Met_ZAP | Met_PED | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa.
- Contenido: metrados de la NAVE INDUSTRIAL. **3. MOV** (movimiento de tierras; nota: cabecera dice "PRECOTEX LAS MORERAS" â€” plantilla reutilizada). **4. EST** (estructuras: concreto simple, etc.). **Met_MOV** (excavaciones masivas: perfilado/excavaciÃ³n/elim m3; ej. CM-01 0.94/3.04/3.95). **Met_ZAP/Met_FZ/Met_PED/Placas/Camara/Sobrecimientos/Cimiento corridos/bases/pedestales/cimientos armados** (concreto+encofrado+acero por elemento, con tablas TRASLAPE/PESO Ã˜). **Escalera**, **losa rampa**, **relleno rampa** (volÃºmenes/Ã¡reas).
- NÃºmeros clave: volÃºmenes por elemento (m3 excavaciÃ³n/concreto, m2 encofrado, KG acero); ej. escalera cisterna 37.58 KG, 5.40 m2.
- PropÃ³sito: respaldo de metrados de la NAVE para su valorizaciÃ³n.
- Origen -> Destino: cÃ³mputo de estructuras de la nave -> valorizaciones NAVE (frente F2).
- AutomatizaciÃ³n: GAP â€” sustento detallado. Frentes F1/F2 son pendiente conocido del RO.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\GP-GCE-FOR-F07_VAL NÂ°07.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** (valorizaciÃ³n cliente). APUs F01.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: igual estructura que VAL06. Periodo MARZO 2026 (01â€“15 mar), plazo 130 D.C. **4. VAL** (+218 filas), **5. RO** (+64 filas).
- NÃºmeros clave: Monto referencial 2'866,414.72 (inc. IGV) / 2'429,165.02 (no inc.); Costo Directo 1'725,572.43; Presupuesto referencial 2'758,382.55. RO: Total Costo Obra 2'182,310.81 / quincenal 226,106.16 / acumulado 1'796,561.29; Costo Directo 1'725,572.43 / 178,784.13 / 1'420,556.87.
- PropÃ³sito: valorizaciÃ³n quincenal de cobro VAL07 + RO interno.
- Origen -> Destino: sustentos de metrados VAL07 + presupuesto -> cobro al cliente; 5. RO -> control interno.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)**; 4. VAL y 5. RO al **RO/CR/F06 + EVM** vÃ­a importador genÃ©rico.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\1. Concreto\Sustento_Concreto_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_COL | Met_MC | Met_VIG | Met_LOSA | 4. Report. de Guias | 5. Sust. Fotografico.
- Contenido: CONCRETO de VAL08 (periodo marzo). Igual que VAL07 + hoja **Met_LOSA** (losas macizas: malla inf / inf-sup, f'c por columnas X/280/X, m3). **2. Sustento** +76 filas (requerimiento de concreto). **Met_VIG** con f'c 280.
- NÃºmeros clave: cabeceras f'c 280; metrados por elemento.
- PropÃ³sito: respaldo metrado concreto VAL08.
- Origen -> Destino: guÃ­as de concreto + cÃ³mputo -> partidas concreto F07 VAL08.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\2. Encofrado\01. Sustento_Encofrado_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_MC | Met_VIG | Met_Losa Maciza | 5. Sust. Fotografico.
- Contenido: ENCOFRADO VAL08. **2. Sustento** (ANTERIOR/ACUMULADO/ACTUAL). **Met_MC** (1 cara/2 caras, curado, baranda; muros perimetrales 793.48 m2). **Met_VIG** (simple/doble, curado; V1 23.86 m2). **Met_Losa Maciza** (encofrado losa, curado).
- NÃºmeros clave: muros perimetrales 793.48 m2; V1 23.86 m2.
- PropÃ³sito: respaldo metrado encofrado VAL08.
- Origen -> Destino: cÃ³mputo de elementos -> partidas encofrado F07 VAL08.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\3. Acero\01. Sustento_Acero_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Sust. Fotografico | Met_VIG | Met_Losa Maciza.
- Contenido: ACERO VAL08. **2. Sustento** (HABILITADO Y COLOCADO DE ACERO, KG; ej. 5.24). **Met_VIG** y **Met_Losa Maciza** con tablas TRASLAPE / PESO Ã˜ por diÃ¡metro y resultados en KG.
- NÃºmeros clave: mediciÃ³n en KG (habilitado y colocado); tabla de pesos por Ã˜.
- PropÃ³sito: respaldo metrado acero VAL08.
- Origen -> Destino: guÃ­as/planilla de fierros -> partidas acero F07 VAL08.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento Metrados | 3. Report. de Guias | 4. Sust. Fotografico.
- Contenido: ACARREO C/CAMIÃ“N GRÃšA VAL08. **2. Sustento Metrados** (FECHA/NÂ°GUIA/DESCRIPCION/NÂ° HORAS/UNIDAD/ANTERIOR/ACUMULADO/ACTUAL).
- NÃºmeros clave: mediciÃ³n por horas (sin total explÃ­cito en volcado).
- PropÃ³sito: respaldo partida acarreo camiÃ³n grÃºa VAL08.
- Origen -> Destino: partes de horas/guÃ­as -> partida acarreo F07 VAL08.
- AutomatizaciÃ³n: GAP â€” adjunto; horas de equipo (sin importador de equipos).

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\5. Arquitectura\Sustento_Arquitectura_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Met_ARQ | 5. Sust. Fotografico.
- Contenido: ARQUITECTURA VAL08 (etiquetada DENOMINACIÃ“N "CONCRETO" en cabecera). **3. Met_ARQ** (tipo/ubicaciÃ³n, # veces, ancho/largo/alto, Total mL/m2/m3; Ã­tems SOLAQUEO EXTERIOR, OXIDACIÃ“N, LOSA DE FONDO).
- NÃºmeros clave: cÃ³mputos de losa de fondo / solaqueo (m2/m3, sin total Ãºnico en volcado).
- PropÃ³sito: respaldo metrado de arquitectura (acabados/impermeabilizaciÃ³n) VAL08.
- Origen -> Destino: cÃ³mputo de arquitectura -> partidas de arquitectura F07 VAL08.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\6. ExcavaciÃ³n\01. Sustento_Eliminacion de Excavacion_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03** (5 pÃ¡ginas).
- Hojas: 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida | 5. Sustento Fotografico.
- Contenido: MOVIMIENTO DE TIERRAS / ELIMINACIÃ“N VAL08. **2. Sustento Elim.** (Fecha / Descripcion / Vol. m3 â€” salida de volquetes). **3. Guias de Salida** (guÃ­as de salida de desmonte; nota cliente "PRECOTEX SAC" por plantilla).
- NÃºmeros clave: volÃºmenes de eliminaciÃ³n en m3 (mediciÃ³n por volquetes).
- PropÃ³sito: respaldo metrado de eliminaciÃ³n de excavaciÃ³n VAL08.
- Origen -> Destino: guÃ­as de salida de volquetes -> partida de eliminaciÃ³n F07 VAL08.
- AutomatizaciÃ³n: GAP â€” adjunto; guÃ­as de salida (sin importador especÃ­fico).

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\7. Nave Industrial\01. Sustento_Nave Industrial_Val08.xlsx
- Tipo / formato: xlsx Â· sustento metrados Nave.
- Hojas (16): 3. MOV | 4. EST | Met_MOV | Met_FZ | Met_ZAP | Met_PED | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa.
- Contenido: igual estructura que el Nave de VAL07, esta vez con cabecera correcta "PTARI CREDITEX" y supervisiÃ³n DIRAC; las hojas 3.MOV/4.EST ahora incluyen columnas METRADO ANTERIOR / ACUM / ACTUAL.
- NÃºmeros clave: volÃºmenes por elemento (m3/m2/KG) â€” ej. CM-01 excavaciÃ³n 3.04 m3.
- PropÃ³sito: respaldo metrados de la NAVE para VAL08.
- Origen -> Destino: cÃ³mputo de estructuras nave -> valorizaciÃ³n nave/frente F2.
- AutomatizaciÃ³n: GAP â€” sustento detallado; frentes F1/F2 pendiente del RO.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\GP-GCE-FOR-F07_VAL NÂ°08.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07**. APUs F01.
- Hojas (9): CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | **6. Servicios**.
- Contenido: VAL08, periodo MARZO 2026 (16â€“31 mar), plazo 130 D.C. **4. VAL** (+235 filas). **6. Servicios** (lista: ADICIONAL DE ARQUITECTURA, TRÃMITE MUNICIPAL).
- NÃºmeros clave: Monto referencial 2'866,414.72 / 2'429,165.02; Costo Directo 1'798,417.87; Presupuesto referencial 2'864,748.61. RO: Total Costo Obra 2'274,437.57 / quincenal 325,364.38 / acumulado 2'121,925.67; Costo Directo 1'798,417.87 / 257,268.49 / 1'677,825.36.
- PropÃ³sito: valorizaciÃ³n quincenal de cobro VAL08 + RO interno + servicios/adicionales.
- Origen -> Destino: sustentos VAL08 -> cobro cliente; 5. RO -> control interno; 6. Servicios -> Adicionales.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** + **RO/CR/F06**; 6. Servicios -> **Adicionales/Deductivos**.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\1. Encofrado\01. Sustento_Encofrado_VAL09.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_VIG | Met_Losa Maciza | 5. Sust. Fotografico.
- Contenido: ENCOFRADO VAL09 (periodo abril). **2. Sustento** (ANTERIOR/ACUMULADO/ACTUAL, pocas filas). **Met_VIG** (simple/doble, curado; V1 23.86 m2). **Met_Losa Maciza** (encofrado + curado).
- NÃºmeros clave: V1 23.86 m2; pocos elementos (avance bajo en el periodo).
- PropÃ³sito: respaldo metrado encofrado VAL09.
- Origen -> Destino: cÃ³mputo de elementos -> partidas encofrado F07 VAL09.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\2. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val09.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento Metrados | 3. Report. de Guias | 4. Sust. Fotografico.
- Contenido: ACARREO C/CAMIÃ“N GRÃšA VAL09. **2. Sustento Metrados** (FECHA/NÂ°GUIA/NÂ° HORAS/ANTERIOR/ACUMULADO/ACTUAL).
- NÃºmeros clave: mediciÃ³n por horas.
- PropÃ³sito: respaldo partida acarreo camiÃ³n grÃºa VAL09.
- Origen -> Destino: partes de horas/guÃ­as -> partida acarreo F07 VAL09.
- AutomatizaciÃ³n: GAP â€” adjunto; horas de equipo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\3. Arquitectura\Sustento_Arquitectura_Val09.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Met_ARQ | 4. Sust. Fotografico.
- Contenido: ARQUITECTURA VAL09. **3. Met_ARQ** (+104 filas): IMPERMEABILIZACIÃ“N, LOSA DE FONDO; ej. LOSA OXIDACIÃ“N 13.75 x 18.62 -> 256.02 (m2). **2. Sustento** (UNIDAD/ANTERIOR/ACUMULADO/ACTUAL).
- NÃºmeros clave: losa oxidaciÃ³n 256.02 m2.
- PropÃ³sito: respaldo metrado arquitectura/impermeabilizaciÃ³n VAL09.
- Origen -> Destino: cÃ³mputo de arquitectura -> partidas F07 VAL09.
- AutomatizaciÃ³n: GAP â€” adjunto de respaldo.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\4. EliminaciÃ³n de desmonte\01. Sustento_Eliminacion de desmonte_Val09.xlsx
- Tipo / formato: xlsx Â· sustento metrados **PRO-GCE-FOR-F03** (5 pÃ¡ginas).
- Hojas: 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida | 4. Sustento Fotografico.
- Contenido: MOVIMIENTO DE TIERRAS / ELIMINACIÃ“N VAL09. **2. Sustento Elim.** (Fecha/Descripcion/Vol. m3). **3. Guias de Salida** (guÃ­as de salida; cliente "PRECOTEX SAC" por plantilla).
- NÃºmeros clave: volÃºmenes de eliminaciÃ³n m3 (por volquetes).
- PropÃ³sito: respaldo metrado de eliminaciÃ³n de desmonte VAL09.
- Origen -> Destino: guÃ­as de salida -> partida eliminaciÃ³n F07 VAL09.
- AutomatizaciÃ³n: GAP â€” adjunto.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\5. Nave industrial\01. Sustento_Nave Industrial_Val09.xlsx
- Tipo / formato: xlsx Â· sustento metrados Nave.
- Hojas (16): 3. MOV | 4. EST | Met_MOV | Met_FZ | Met_ZAP | Met_PED | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa.
- Contenido: estructura completa de metrados de la NAVE VAL09 (igual a VAL07/08), con columnas ANTERIOR/ACUM/ACTUAL en 3.MOV/4.EST; cabecera "PTARI CREDITEX" / DIRAC.
- NÃºmeros clave: volÃºmenes por elemento (m3/m2/KG); ej. CM-01 excavaciÃ³n 3.04 m3.
- PropÃ³sito: respaldo metrados de la NAVE para VAL09.
- Origen -> Destino: cÃ³mputo de estructuras nave -> valorizaciÃ³n nave/frente F2.
- AutomatizaciÃ³n: GAP â€” sustento detallado.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\GP-GCE-FOR-F07_Val NÂ°09.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07**. APUs F01.
- Hojas (9): CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios.
- Contenido: VAL09, periodo ABRIL 2026 (01â€“15 abr), plazo 130 D.C. **4. VAL** (+261 filas). **6. Servicios** (ADICIONAL DE ARQUITECTURA, TRÃMITE MUNICIPAL).
- NÃºmeros clave: RO: Total Costo Obra 2'328,290.71 / quincenal 115,269.95 / acumulado 2'237,195.62; Costo Directo 1'841,000.03 / 91,144.97 / 1'768,970.33.
- PropÃ³sito: valorizaciÃ³n quincenal de cobro VAL09 + RO interno + servicios.
- Origen -> Destino: sustentos VAL09 -> cobro cliente; 5. RO -> control interno.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** + **RO/CR/F06**; 6. Servicios -> **Adicionales**.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\1. NAVE-VAL 01\GP-GCE-FOR-F07_CREDITEX NAVE-Val NÂ°01.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** (valorizaciÃ³n NAVE â€” frente independiente).
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: Obra "ESTRUCTURA METÃLICA Y LOSA COLABORANTE", Cliente CREDITEX, VAL NÂ°01, periodo MAYO 2026 (01â€“15 may), plazo **75 D.C.**. **4. VAL** (+79 filas, presupuesto NAVE). **5. RO** vista interna.
- NÃºmeros clave: Monto referencial 749,994.16 (inc. IGV) / 635,588.27 (no inc.); Costo Directo 545,588.27. RO: Total Costo Obra 689,998.95 / quincenal 291,168.81 / acumulado 291,168.81; Costo Directo 545,588.27 / 230,229.75 / 230,229.75.
- PropÃ³sito: valorizaciÃ³n quincenal de cobro de la NAVE (frente F2), primer periodo.
- Origen -> Destino: metrados nave + presupuesto NAVE -> cobro al cliente; 5. RO -> control interno frente NAVE.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** segregado por frente (PTARI vs NAVE); 4. VAL y 5. RO -> **RO/CR/F06** con dimensiÃ³n Frente F1/F2.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\2. NAVE-VAL 02\GP-GCE-FOR-F07_CREDITEX NAVE-VAL NÂ°02 Rev.02.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** (NAVE), revisiÃ³n 02.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: NAVE VAL NÂ°02, periodo MAYO 2026 (16â€“31 may), plazo 75 D.C. **4. VAL** (+79 filas).
- NÃºmeros clave: Monto referencial 749,994.16 / 635,588.27; Costo Directo 545,588.27. RO: Total Costo Obra 689,998.95 / quincenal 186,648.65 / acumulado 477,817.46; Costo Directo 545,588.27 / 147,584.73 / 377,814.48.
- PropÃ³sito: valorizaciÃ³n quincenal de cobro de la NAVE, segundo periodo.
- Origen -> Destino: metrados nave -> cobro cliente; 5. RO -> control interno.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** (frente NAVE) + **RO/CR/F06**.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\3. NAVE-VAL 03\GP-GCE-FOR-F07_CREDITEX NAVE-VAL NÂ°03.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** (NAVE).
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: NAVE VAL NÂ°03, periodo JUNIO 2026 (01â€“15 jun), plazo 75 D.C. **4. VAL** (+79 filas).
- NÃºmeros clave: Monto referencial 749,994.16 / 635,588.27; Costo Directo 545,588.27. RO: Total Costo Obra 689,998.95 / quincenal 111,918.59 / acumulado 589,736.05; Costo Directo 545,588.27 / 88,495.02 / 466,309.50.
- PropÃ³sito: valorizaciÃ³n quincenal de cobro de la NAVE, tercer periodo.
- Origen -> Destino: metrados nave -> cobro cliente; 5. RO -> control interno.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** (frente NAVE) + **RO/CR/F06**.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\4. NAVE-LIQUIDACION\GP-GCE-FOR-F07_CREDITEX NAVE-LIQUIDACION.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** (LIQUIDACIÃ“N de la NAVE).
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: LIQUIDACIÃ“N NAVE, periodo JUNIO 2026 (16â€“30 jun), plazo 75 D.C. Cierre final del frente NAVE. **4. VAL** (+79 filas).
- NÃºmeros clave: Monto referencial **791,567.50** (inc. IGV) / 670,819.92 (no inc.); Costo Directo 580,819.91 (sube respecto a VAL01-03 por liquidaciÃ³n). RO: Total Costo Obra 734,556.00 / del periodo 100,262.90 / acumulado final 689,998.95; Costo Directo 580,819.91 / 79,278.76 / 545,588.27 (acumulado final = total CD ejecutado).
- PropÃ³sito: liquidaciÃ³n/cierre del contrato de la NAVE (saldo final a cobrar).
- Origen -> Destino: acumulado de VAL01-03 + saldos -> liquidaciÃ³n final al cliente; 5. RO -> resultado operativo final del frente NAVE.
- AutomatizaciÃ³n: mÃ³dulo **Valorizaciones (cliente)** estado "LiquidaciÃ³n"; alimenta cierre del **RO** frente NAVE.

---

### \05. GestiÃ³n Costos\7. Valorizaciones\1. Cliente\2. Adicionales\GP-GCE-FOR-F07_VAL-ADICIONALES NÂ°01,02,03 2025.12.15.xlsx
- Tipo / formato: xlsx Â· **GP-GCE-FOR-F07** aplicado a ADICIONALES.
- Hojas: CarÃ¡tula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8.
- Contenido: VALORIZACIÃ“N DE ADICIONALES NÂ°01 (engloba 01, 02, 03), periodo DICIEMBRE 2025 (01â€“13 dic), plazo 130 D.C., presupuesto "ADICIONALES NÂ°01, NÂ°02 Y NÂ°03". **4. VAL** (+54 filas, adicionales). **5. RO** (con errores #DIV/0! y costos directos en 0 â€” plantilla no consolidada para adicionales). **Hoja1** (cÃ³mputo de Ã¡reas: LONGITUD/ALTO/AREA; total 286.80 m2). **Hoja 8** (flujo por SEMANAS: VIENEN, EGRESOS por Sem 1..24 â€” esqueleto de **flujo de caja**; mayorÃ­a en 0 y #REF!).
- NÃºmeros clave: Costo Directo adicionales 12,769.22; presupuesto adicionales (referencial) 3,379.86 (RO, con error de cÃ¡lculo); Ã¡rea computada 286.80 m2.
- PropÃ³sito: valorizaciÃ³n de adicionales (mayores metrados/partidas nuevas) ante el cliente + esbozo de flujo de caja por semanas.
- Origen -> Destino: APUs nuevos/adicionales aprobados -> cobro de adicionales; Hoja 8 -> intento de flujo de caja semanal.
- AutomatizaciÃ³n: mÃ³dulo **Adicionales/Deductivos** (4. VAL y APUs). **Hoja 8 = GAP Flujo de Caja** (gap conocido): estructura semanal EGRESOS por rubro es candidata para el futuro importador de **Flujo de Caja**.

---

## Resumen de automatizaciÃ³n del chunk
- **A importador Valorizaciones (cliente) + RO/CR/F06 (EVM)**: las 7 valorizaciones GP-GCE-FOR-F07 (PTARI VAL06/07/08/09 + NAVE VAL01/02/03 + LiquidaciÃ³n). Hojas clave: "4. VAL" (avance por partida anterior/actual/acumulado) y "5. RO" (costo de obra por frente/partida quincenal y acumulado). Requiere dimensiÃ³n Frente F1 (PTARI) / F2 (NAVE) â€” pendiente conocido del RO.
- **A Adicionales/Deductivos**: archivo de Adicionales NÂ°01-03 + hojas "6. Servicios" de VAL08/09 (Adicional de Arquitectura, TrÃ¡mite Municipal) + APUs Nuevos (F01).
- **GAP Flujo de Caja**: "Hoja 8" del archivo de Adicionales (egresos semanales Sem 1..24).
- **GAP sustentos de metrados** (PRO-GCE-FOR-F03): 13 archivos de respaldo (concreto/encofrado/acero/acarreo/cordÃ³n/arquitectura/excavaciÃ³n/nave). No tienen importador; van como adjunto/evidencia de la partida valorizada. Las guÃ­as (concreto, acero, salida de volquetes, camiÃ³n grÃºa) son candidatas a futura ingestiÃ³n hacia AlmacÃ©n/control de equipos.



---

# CATALOGO 7. Valorizaciones (cont. 3) â€” Fichas detalladas

Proyecto: CREDITEX (PTARI Planta 5 + Nave Metalica / proyecto previo "Ampliacion Precotex Las Moreras").
Contratista: GRAPCO SAC. Supervisor: DIRAC (DISENOS RACIONALES SAC) / HIGASHI (en Moreras).
Este chunk reune valorizaciones de ADICIONALES al cliente y, sobre todo, valorizaciones de SUBCONTRATISTAS (formato F10/F11 + plantilla PRO-GCE-FOR-VAL).

---

### \05. Gestion Costos\7. Valorizaciones\1. Cliente\2. Adicionales\GP-GCE-FOR-F07_VAL-ADICIONALES NÂ°06,07,08 2025.12.30.xlsx
- Tipo / formato: xlsx â€” GP-GCE-FOR-F07 (cronograma de pagos / valorizacion al cliente). Es VALORIZACION DE ADICIONALES NÂ°02 (paquete que agrupa Adicionales NÂ°06, NÂ°07 y NÂ°08).
- Hojas (8): Caratula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8
- Contenido:
  - Caratula: identifica obra "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; "VALORIZACION DE ADICIONALES NÂ°02", Revision NÂ°01, fecha 02-ene-2026.
  - 1. RESUMEN: ficha del adicional NÂ°02, mes DICIEMBRE-2025; obra/cliente CREDITEX; supervision DISENOS RACIONALES SAC; contratista GRAPCO SAC; residente ING. GUIDO GONZALES; presupuesto referencial inc/IGV; plazo 130 D.C.
  - 2. PAGOS: cronograma de pagos (cod GP-GCE-FOR-F07, version 0, pag 1 de 5); presupuesto = ADICIONALES NÂ°06,07,08; valorizacion NÂ°2; periodo DICIEMBRE (del 16-dic al 31-dic-2025).
  - 3. RES.VAL: resumen de valorizaciones del adicional; monto referencial (inc/no IGV); COSTO DIRECTO 39138.52.
  - 4. VAL: detalle de valorizacion adicionales NÂ°02; partida CONTRACTUAL (PTARI), plazo 130 dias; columnas PRESUPUESTO (UND/CANT/P.U./PARCIAL), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO, SALDO REFERENCIAL (cada uno con CANTIDAD/%/TOTAL).
  - 5. RO: tabla de Resultado Operativo del adicional por FRENTE/PARTIDA/Descripcion (PRE1..., FA01, partidas 1.01 Seguridad, 1.02 Topografia...); columnas Ppto F1 PTARI / Valorizacion Quincenal / Valorizacion Acumulada (S/.). TOTAL COSTO DE OBRA 10359.50 (varias celdas #DIV/0! por divisor vacio).
  - Hoja1: metrados auxiliares (LONGITUD/ALTO/AREA) â€” area total 286.80 m2.
  - Hoja 8: cronograma/curva por SEMANAS (Sem 1..Sem 24) de EGRESOS por rubro (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...); en su mayoria 0 / #REF!.
- Numeros clave: COSTO DIRECTO adicional 39138.52; TOTAL COSTO DE OBRA (RO) 10359.50; area 286.80 m2; plazo 130 D.C.
- Proposito: valorizar al cliente CREDITEX el paquete de Adicionales NÂ°06/07/08 (deductivos/adicionales de obra) y su cronograma de pago.
- Origen -> Destino: sale del presupuesto de adicionales + metrados de obra; alimenta el cobro al cliente y el RO de adicionales.
- Automatizacion: modulo GRAPCO Adicionales/Deductivos + Valorizaciones (cliente). El F07 ya esta mapeado a Curva S/valorizacion. Ingerir via importador generico in-app (hojas 4.VAL y 5.RO).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\1. SC Mov Tierras_R Proyectos\RPROYECTOS_AD_VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” Val de subcontratista, F11 (hoja de ruta STANDARD) + plantilla PRO-GCE-FOR-VAL. SC Movimiento de Tierras, R PROYECTOS SAC (RUC 20483973951). Es la VAL NÂ°03 / Adicional.
- Hojas (6): STANDARD | RESUMEN | VAL | SUSTENTO | R PROYECTOSAdicional | Cantidades
- Contenido:
  - STANDARD: HOJA DE RUTA - SUBCONTRATO (GP-GCE-FOR-F11, Rev.01), VBs de campo/calidad/SSOMA, NÂ° valorizacion, OS.
  - RESUMEN: cuadro resumen de valorizaciones; proyecto "Ampliacion Precotex Las Moreras", cliente GRAPCO, supervisor HIGASHI, val 3, mes ENERO; MONTO CONTRACTUAL 3815.62 (inc IGV) / 3233.58 (no IGV); MONTO FACTURADO 2949.79; amortizacion 0; deduccion 0; saldo por deducir 284.
  - VAL: valorizacion de obra NÂ°3 (PRO-GCE-FOR-VAL v01); servicio SUBCONTRATO MOV TIERRAS; periodo ENERO; Costo Total Actualizado 3233.58.
  - SUSTENTO: sustento de salida de volquetes; factor esponj. 0.30; TOTAL ELIMINADO 2998 m3, TOTAL EXCAVADO MASIVO 2306.15 m3; detalle por viaje (NÂ°, fecha, placa ANJ-776, interna/externa, vol m3), separado por VAL1/VAL2.
  - R PROYECTOSAdicional: valorizacion de obra NÂ°03 "Mov. Tierras PTAR Creditex"; VALOR ORIGINAL/ACTUAL S/ 3233.44; columnas CONTRATO/ACUM ANTERIOR/PRESENTE PERIODO/ACUM ACTUAL/SALDO (UND/CANT/PU/%/MONTO); total 3079.47.
  - Cantidades: tabla de viajes (Item, Fecha, Volquete, Capacidad m3, NÂ° viajes, Descripcion, NÂ° reporte, total m3, CONDICION, observaciones).
- Numeros clave: contractual 3233.58 (no IGV); facturado 2949.79; saldo deducir 284; eliminado 2998 m3; excavado 2306.15 m3.
- Proposito: control y pago de la valorizacion de movimiento de tierras del SC R Proyectos, con sustento de m3 eliminados.
- Origen -> Destino: sale de reportes de volquetes/cantidades de campo; alimenta el costo real de la partida mov. tierras en el RO (pata Subcontratos) y el pago al SC.
- Automatizacion: GAP â€” Valorizacion de Subcontratistas (F10/F11) no existe como modulo. Por ahora ingerir hoja VAL/RESUMEN via importador generico hacia el RO como costo de subcontrato; el sustento de m3 podria validar metrado de mov. tierras.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\1. SC Mov Tierras_R Proyectos\RPROYECTOS_VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” Val de subcontratista F11 + PRO-GCE-FOR-VAL. SC Mov Tierras R PROYECTOS. VAL NÂ°01.
- Hojas (4): STANDARD | RESUMEN | VAL | Hoja 2
- Contenido:
  - STANDARD: hoja de ruta F11.
  - RESUMEN: proyecto Precotex Las Moreras, cliente GRAPCO, supervisor HIGASHI, val 1, mes DICIEMBRE; CONTRACTUAL 65761.05 (inc) / 55729.70 (no IGV); facturado 0; saldo por deducir 55730.
  - VAL: valorizacion NÂ°1, periodo DICIEMBRE; Costo Total Actualizado 55729.70.
  - Hoja 2: sustento de salida de volquetes; factor esponj 0.30; TOTAL ELIMINADO 1530 m3, TOTAL EXCAVADO MASIVO 1176.92 m3; detalle de viajes.
- Numeros clave: contractual 55729.70 (no IGV); facturado 0; saldo 55730; eliminado 1530 m3; excavado 1176.92 m3.
- Proposito: primera valorizacion del SC mov tierras (aun sin facturar).
- Origen -> Destino: reportes de volquetes -> costo real partida mov. tierras (RO) / pago SC.
- Automatizacion: GAP Valorizacion de Subcontratistas; ingerir via importador generico hacia RO (costo subcontratos).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\1. SC Mov Tierras_R Proyectos\RPROYECTOS_VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” Val de subcontratista F11 + PRO-GCE-FOR-VAL. SC Mov Tierras R PROYECTOS. VAL NÂ°02 (incluye hoja del Adicional/Val03).
- Hojas (7): STANDARD | RESUMEN | VAL | SUSTENTO | R PROYECTOS (Val NÂ° 02) | R PROYECTOS (Cantidades) | Adicional
- Contenido:
  - RESUMEN: val 2, mes ENERO; CONTRACTUAL 106921.31 (inc) / 90611.28 (no IGV); facturado 46018.80; saldo por deducir 44592.
  - VAL: valorizacion NÂ°2, periodo ENERO; Costo Total Actualizado 90611.28.
  - SUSTENTO: salida de volquetes; factor 0.30; ELIMINADO 2998 m3 / EXCAVADO 2306.15 m3; detalle VAL1/VAL2.
  - R PROYECTOS (Val NÂ° 02): valorizacion de obra NÂ°02; VALOR ORIGINAL/ACTUAL 55729.71; total contrato 53075.91; acum anterior 42469.03; presente 43827.43; acum actual 86296.46; saldo -33220.55 (sobre-valorizacion vs contrato base).
  - R PROYECTOS (Cantidades): viajes con columnas extra NÂ°VAL/DESCRIPCION (INTERNA/EXTERNA)/ESTADO (FALTA VERIFICAR / COMPROBADO).
  - Adicional: valorizacion NÂ°03 del adicional, valor 3233.44, total 3079.47.
- Numeros clave: contractual 90611.28; facturado 46018.80; saldo 44592; acum actual SC 86296.46; saldo vs contrato -33220.55; eliminado 2998 m3.
- Proposito: segunda valorizacion mov tierras + arrastre del adicional; control de m3 verificados.
- Origen -> Destino: reportes volquetes/campo -> costo subcontrato en RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\1. Superado\GP-GCE-FOR-F10_M&M NAVE VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” GP-GCE-FOR-F10 (Val Subcontratista) + PRO-GCE-FOR-VAL. SC Estructuras Metalicas, M&M (RUC 20551531326). Version en carpeta "Superado" (reemplazada).
- Hojas (2): RESUMEN | VAL
- Contenido:
  - RESUMEN: proyecto PTARI Planta 5 - CREDITEX, cliente GRAPCO, supervisor DIRAC, val 2, mes MAYO; CONTRACTUAL 543666.98 (inc) / 460734.73 (no IGV); facturado 338280.37; AMORTIZACION 48298.68; saldo por deducir 122454.
  - VAL: encabezado "ADELANTO NÂ°...1" + ESTADO DE PAGO NÂ°2; servicio estructuras metalicas; campos de Adelantos NÂ°01/02/03 y Tipo de Cambio.
- Numeros clave: contractual 460734.73 (no IGV); facturado 338280.37; amortizacion 48298.68; saldo 122454.
- Proposito: valorizar el SC de estructuras metalicas de la Nave (version superada de la val 2).
- Origen -> Destino: avance estructuras metalicas -> costo subcontrato RO (Nave) / pago SC con amortizacion de adelanto.
- Automatizacion: GAP Val Subcontratistas (incluye gestion de adelantos/amortizacion). Importador generico -> RO Nave. Marcar como version superada (no contar doble con la VAL final).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\GP-GCE-FOR-F10_M&M NAVE VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Estructuras Metalicas M&M. VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes MAYO; CONTRACTUAL 543666.98 (inc)/460734.73 (no IGV); facturado 198140.45; AMORTIZACION 117770.83; saldo por deducir 262594. VAL = ADELANTO/Estado de pago NÂ°1 con campos de adelantos.
- Numeros clave: contractual 460734.73; facturado 198140.45; amortizacion 117770.83; saldo 262594.
- Proposito: primera valorizacion del SC estructuras metalicas Nave.
- Origen -> Destino: avance estructuras -> costo subcontrato RO Nave / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO Nave.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\GP-GCE-FOR-F10_M&M NAVE VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Estructuras Metalicas M&M. VAL NÂ°02 (version vigente).
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MAYO; CONTRACTUAL 543666.98/460734.73; facturado 318635.48; AMORTIZACION 59232.41; saldo por deducir 142099. VAL = Estado de pago NÂ°2.
- Numeros clave: facturado 318635.48; amortizacion 59232.41; saldo 142099.
- Proposito: segunda valorizacion (vigente) del SC estructuras metalicas Nave.
- Origen -> Destino: avance estructuras -> costo subcontrato RO Nave / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO Nave.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\10. SC M&M NAVE METALICA\GP-GCE-FOR-F10_M&M NAVE VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Estructuras Metalicas M&M. VAL NÂ°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes JUNIO; CONTRACTUAL 543666.98/460734.73; facturado 391451.39; AMORTIZACION 22467.34; saldo por deducir 69283. VAL = VALORIZACION NÂ°3 (ya no "adelanto").
- Numeros clave: facturado acum 391451.39 (85% del contractual no IGV); amortizacion 22467.34; saldo 69283.
- Proposito: tercera valorizacion del SC estructuras metalicas Nave (avance acumulado alto).
- Origen -> Destino: avance estructuras -> costo subcontrato RO Nave / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO Nave.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\11. SC ORANGE\GP-GCE-FOR-F10_PRUEBA DE LANZA SECA VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Prueba de Lanza Seca, ORANGE INDUSTRIES (RUC 20608928431). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes MAYO; CONTRACTUAL 5310 (inc)/4500 (no IGV); facturado 4500; saldo 0; CD VENTA 6096.23 (compara costo SC vs venta -> margen). VAL = valorizacion NÂ°1.
- Numeros clave: contractual 4500 (no IGV); facturado 4500 (100%); CD VENTA 6096.23.
- Proposito: valorizar/pagar el servicio de prueba de lanza seca (proteccion contra incendios).
- Origen -> Destino: servicio prestado -> costo subcontrato RO / pago SC. CD VENTA = referencia de margen.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. El CD VENTA vs CD SC alimenta margen por partida.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC EFCO (alquiler de encofrados/andamios) (RUC 20604506388). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes FEBRERO; servicio "SUBCONTRATO DE ALQUILER DE ANDAMIOS"; CONTRACTUAL 1287.97 (inc)/1091.50 (no IGV); facturado 1091.50; saldo 0; CD VENTA 8258.11; periodo 27-feb a 28-mar. VAL Estado pago NÂ°1, Costo Directo 1091.50, Adelanto NÂ°01 4821.27.
- Numeros clave: facturado 1091.50; CD VENTA 8258.11; adelanto 4821.27.
- Proposito: valorizar alquiler de encofrados metalicos EFCO (mes feb).
- Origen -> Destino: dias de alquiler/despacho -> costo subcontrato RO encofrado / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO encofrado.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC EFCO. VAL NÂ°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes FEBRERO; CONTRACTUAL 23193.29 (inc)/19655.33 (no IGV); facturado 18727.14; saldo por deducir 928; CD VENTA 8258.11. VAL Costo Directo 19655.33, Adelanto NÂ°01 4821.27.
- Numeros clave: facturado 18727.14; contractual 19655.33; saldo 928.
- Proposito: segunda valorizacion alquiler encofrados EFCO.
- Origen -> Destino: dias de alquiler -> costo subcontrato RO encofrado / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC EFCO. VAL NÂ°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes FEBRERO; CONTRACTUAL 32227.42 (inc)/27311.37 (no IGV); facturado 27311.37; saldo 0; CD VENTA 8258.11. VAL Costo Directo 27311.37.
- Numeros clave: facturado 27311.37 (100% contractual); adelanto 4821.27.
- Proposito: tercera valorizacion alquiler encofrados EFCO.
- Origen -> Destino: dias de alquiler -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\GP-GCE-FOR-F10_EFCO VAL NÂº04.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC EFCO. VAL NÂ°04 (servicio ya como "ENCOFRADO"; RUC distinto 20212149145).
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 4, mes ABRIL; servicio SUBCONTRATO DE ENCOFRADO; CONTRACTUAL 48456.66 (inc)/41064.97 (no IGV); facturado 41064.97; saldo 0; CD VENTA 50274; periodo 01-mar a 31-mar. VAL Estado pago NÂ°4.
- Numeros clave: facturado 41064.97; CD VENTA 50274.
- Proposito: cuarta valorizacion EFCO (encofrado).
- Origen -> Destino: dias de alquiler/encofrado -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\12. SC EFCO\SUSTENTO FACTURAS CREDITEX ACTUALIZADO.xlsx
- Tipo / formato: xlsx â€” sustento/conciliacion de facturas y despachos del SC EFCO (no es una valorizacion estandar; es control de facturas vs alquiler).
- Hojas (7): RESUMEN FACTURAS EFCO | PPTO | COMPARATIVO | VENTA DE EQ CONSUMIBLE FEBRERO | LISTA DE DESPACHO FEBRERO | LISTA DE DESPACHO MARZO | LISTA
- Contenido:
  - RESUMEN FACTURAS EFCO: tabla MES/FECHA/NÂ°FACTURA/DESCRIPCION/IMPORTE/IGV/TOTAL/ESTADO. Facturas: F001-13524 arriendo 1091.50 (PAGADO); F001-13623 arriendo 18563.83 (PAGADO); F001-13648 venta equipo consumible 7656.04 (PAGADO); F001-13776 arriendo 13753.60 (PENDIENTE); F001-13722 venta consumible 611.46; F001-13755 venta equipo no devuelto 4991.97; F001-13776 devolucion -2582.23; F001-13802 reparacion/limpieza 162.80; F001-13803 venta equipo irreparable 1418.58.
  - PPTO: partidas presupuestadas de encofrado por frente (4.4.3.2 encofrado muro de contencion M2 308.03 x 61.84 = 19048.58; frente 3: 4.1.6.2 M2 548 x 19.91 = 10910.68; 4.2.5.1 M2 797 x 19.91 = 15868.27; 4.2.6.1 vigas M2 264 x 95.56 = 25227.84).
  - COMPARATIVO: cuadro comparativo PRESUPUESTO VENTA vs REAL EFCO (obra Precotex Las Moreras, residente Guido Gonzales, T.C 3.80); estructuras venta 71055.37.
  - VENTA DE EQ CONSUMIBLE FEBRERO: lista de consumibles vendidos (pernos, tensores, fundas) con cantidad/fecha/PU/total.
  - LISTA DE DESPACHO FEBRERO / MARZO: alquiler por rango de dias (dias, valor, tarifa diaria, cantidad); CD feb 18563.85; CD mar 13753.62 + IGV 2475.65 + TOTAL 16229.27; lista de devoluciones.
  - LISTA: catalogo de items EFCO con codigo, descripcion y P.U. (Super Stud, tornillos, esquineros, placas...).
- Numeros clave: factura mayor arriendo feb 18563.83; CD feb 18563.85; CD mar 13753.62 (TOTAL c/IGV 16229.27); venta equipo no devuelto 4991.97; T.C 3.80.
- Proposito: conciliar lo facturado por EFCO contra dias de alquiler, equipo no devuelto y consumibles; sustentar las valorizaciones y detectar penalidades por equipo no devuelto.
- Origen -> Destino: facturas EFCO + listas de despacho/devolucion -> sustento de las VAL EFCO -> costo real encofrado en RO. Tambien insumo para Flujo de Caja (estado PAGADO/PENDIENTE).
- Automatizacion: doble GAP â€” Val Subcontratistas y Flujo de Caja. La hoja RESUMEN FACTURAS (estado pagado/pendiente) es fuente directa para un futuro modulo de Flujo de Caja / cuentas por pagar. Por ahora importador generico para conciliacion.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” GP-GCE-FOR-F01 (en nombre) pero contenido es F11 (STANDARD) + PRO-GCE-FOR-VAL. SC SSOMA, INCENTIVA CONSULTORES SAC / INCENTIVA NEWCOW EIRL (RUC 20610836357), OS 001. VAL NÂ°01.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido:
  - STANDARD: hoja de ruta F11; SC SSOMA en obra; OS 001.
  - RESUMEN: proyecto Precotex Las Moreras, cliente GRAPCO, supervisor HIGASHI, val 1, mes NOVIEMBRE; CONTRACTUAL 30680 (inc)/26000 (no IGV); facturado 6066.67; CD SC 26000; periodo nov.
  - AD-03: valorizacion de obra (PRO-GCE-FOR-VAL), estado pago NÂ°1, servicio gestion SSOMA, contratista TOPCONTRERAS ONE; Costo Total Actualizado 26000.
- Numeros clave: contractual 26000 (no IGV); facturado 6066.67.
- Proposito: valorizar el servicio mensual de gestion SSOMA del SC Incentiva.
- Origen -> Destino: contrato mensual SSOMA -> costo subcontrato RO (Gastos Generales / SSOMA) / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO (rubro SSOMA/GG).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL NÂ°02.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN proyecto PTAR Planta 5 - CREDITEX, val 2, mes DICIEMBRE; CONTRACTUAL 30680/26000; facturado 12566.67; CD SC 26000. AD-03 estado pago NÂ°2, gestion SSOMA, Costo Total Actualizado 26000.
- Numeros clave: contractual 26000; facturado acum 12566.67.
- Proposito: segunda valorizacion SSOMA (dic).
- Origen -> Destino: contrato SSOMA -> RO (SSOMA/GG) / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL NÂ°03.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 3, mes ENERO; CONTRACTUAL 46610 (inc)/39500 (no IGV); facturado 20716.67; CD SC 39500. AD-03 estado pago NÂ°3.
- Numeros clave: contractual 39500; facturado acum 20716.67.
- Proposito: tercera valorizacion SSOMA (ene); el contractual sube a 39500.
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL NÂº04.xlsx
- Tipo / formato: xlsx â€” F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL NÂ°04.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 4, mes FEBRERO; CONTRACTUAL 46610/39500; facturado 31716.67; CD SC 39500. AD-03 estado pago NÂ°4.
- Numeros clave: facturado acum 31716.67.
- Proposito: cuarta valorizacion SSOMA (feb).
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL NÂº05.xlsx
- Tipo / formato: xlsx â€” F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL NÂ°05.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 5, mes MARZO; CONTRACTUAL 50380.10 (inc)/42695 (no IGV); facturado 42716.67; CD SC 42695. AD-03 estado pago NÂ°5.
- Numeros clave: contractual 42695; facturado acum 42716.67.
- Proposito: quinta valorizacion SSOMA (mar); contractual sube a 42695.
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\2. SC SSOMA_INCENTIVA\GP-GCE-FOR-F01_INCENTIVA CONSULTORES - VAL NÂº06.xlsx
- Tipo / formato: xlsx â€” F11 + PRO-GCE-FOR-VAL. SC SSOMA Incentiva. VAL NÂ°06.
- Hojas (3): STANDARD | RESUMEN | AD-03
- Contenido: RESUMEN val 6, mes ABRIL; CONTRACTUAL 60292.10 (inc)/51095 (no IGV); facturado 48516.67; CD SC 51095. AD-03 estado pago NÂ°6.
- Numeros clave: contractual 51095; facturado acum 48516.67.
- Proposito: sexta valorizacion SSOMA (abr).
- Origen -> Destino: contrato SSOMA -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\3. SC RECOSA\RECOSA_VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F11 (STANDARD) + PRO-GCE-FOR-VAL. SC Instalaciones Sanitarias, RECOSA (RUC 20483973951). VAL NÂ°01.
- Hojas (3): STANDARD | RESUMEN | VAL
- Contenido: STANDARD hoja de ruta F11. RESUMEN proyecto Precotex Las Moreras, val 1, mes ENERO; CONTRACTUAL 1156.28 (inc)/979.90 (no IGV); facturado 0; saldo por deducir 980. VAL valorizacion NÂ°1, servicio instalaciones sanitarias; Costo Total Actualizado 979.90.
- Numeros clave: contractual 979.90; facturado 0; saldo 980.
- Proposito: primera valorizacion del SC instalaciones sanitarias (aun sin facturar).
- Origen -> Destino: avance IISS -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Encofrado, A&CR CONSTRUCCIONES GENERALES SAC (RUC 20604506388). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN proyecto PTARI Planta 5 - CREDITEX, val 1, mes MARZO; CONTRACTUAL 22756.41 (inc)/19285.09 (no IGV); facturado 9703.50; AMORTIZACION 3077.62; saldo por deducir 9582. VAL Costo Directo 17531.90, Adelanto NÂ°01 4821.27.
- Numeros clave: contractual 19285.09; facturado 9703.50; amortizacion 3077.62; CD 17531.90.
- Proposito: primera valorizacion del SC encofrado A&CR (con amortizacion de adelanto).
- Origen -> Destino: avance encofrado -> costo subcontrato RO / pago SC.
- Automatizacion: GAP Val Subcontratistas (gestion adelanto/amortizacion); importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Encofrado A&CR. VAL NÂ°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MARZO; CONTRACTUAL 22756.41/19285.09; facturado 14223.43; AMORTIZACION 1687.22; saldo por deducir 5062. VAL Costo Directo 17531.90, Adelanto NÂ°01 4821.27.
- Numeros clave: facturado acum 14223.43; amortizacion 1687.22; saldo 5062.
- Proposito: segunda valorizacion encofrado A&CR.
- Origen -> Destino: avance encofrado -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL NÂº03_Continuidad.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Encofrado A&CR. VAL NÂ°03 (escenario "Continuidad").
- Hojas (3): RESUMEN | VAL | AD-HH
- Contenido:
  - RESUMEN val 3, mes MARZO (16 al 22-mar); CONTRACTUAL 23807.79 (inc)/20176.09 (no IGV); facturado 16406.74; AMORTIZACION 952.78; saldo por deducir 3769. VAL Costo Directo 18341.90.
  - AD-HH: adicional de HH (mano de obra) con CANT/DIAS/HH/PU/PARCIAL: OP 2x2 4.50h 23.90 = 430.20; PE 1x2 4.50h 17 = 153; OP 2x1 3.50h 23.90 = 167.30; PE 1x1 3.50h 17 = 59.50; total 810.
- Numeros clave: contractual 20176.09; facturado 16406.74; CD 18341.90; adicional HH 810.
- Proposito: tercera valorizacion encofrado A&CR (variante de continuidad del contrato), con adicional de HH.
- Origen -> Destino: avance encofrado + HH adicionales -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. AD-HH (HH x PU) podria cruzar con ISP/tareos.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\4. SC ENCOFRADO A&CR\GP-GCE-FOR-F10_A&CR ENC VAL NÂº03_Liquidacion.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Encofrado A&CR. VAL NÂ°03 (escenario "Liquidacion"; alternativa al Continuidad).
- Hojas (3): RESUMEN | VAL | AD-HH
- Contenido: RESUMEN val 3, mes MARZO; CONTRACTUAL 23807.79/20176.09; facturado 14978.52; AMORTIZACION 1551.31; saldo por deducir 5198. VAL Costo Directo 18341.90. AD-HH identico (total 810).
- Numeros clave: facturado 14978.52; amortizacion 1551.31; saldo 5198.
- Proposito: variante de LIQUIDACION de la VAL NÂ°03 A&CR (cierre del subcontrato). Es escenario alterno al "_Continuidad" â€” no sumar ambos.
- Origen -> Destino: avance/cierre encofrado -> RO / pago final SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. Tratar como una sola val (elegir Continuidad o Liquidacion).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\5. SC IMPERMEABILIZACION\GP-GCE-FOR-F10_SURE VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Impermeabilizacion, SURE (RUC 20600700040). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; CONTRACTUAL 173215.35 (inc)/146792.67 (no IGV); facturado 51377.44; AMORTIZACION 23486.83; saldo por deducir 95415; CD VENTA 144126.97. VAL valorizacion NÂ°1 impermeabilizacion.
- Numeros clave: contractual 146792.67; facturado 51377.44; amortizacion 23486.83; CD VENTA 144126.97.
- Proposito: primera valorizacion del SC impermeabilizacion (contrato grande, con amortizacion de adelanto).
- Origen -> Destino: avance impermeabilizacion -> costo subcontrato RO / pago SC. CD VENTA vs CD SC = margen.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\5. SC IMPERMEABILIZACION\GP-GCE-FOR-F10_SURE VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Impermeabilizacion SURE. VAL NÂ°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MAYO; CONTRACTUAL 161542.10 (inc)/136900.09 (no IGV); facturado 118765.68; AMORTIZACION 0; saldo por deducir 18134; CD VENTA 143804.45.
- Numeros clave: contractual 136900.09; facturado 118765.68; CD VENTA 143804.45.
- Proposito: segunda valorizacion impermeabilizacion SURE.
- Origen -> Destino: avance impermeabilizacion -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\5. SC IMPERMEABILIZACION\GP-GCE-FOR-F10_SURE VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Impermeabilizacion SURE. VAL NÂ°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes JUNIO; CONTRACTUAL 157263.75 (inc)/133274.37 (no IGV); facturado 126610.65; AMORTIZACION 0.00; saldo por deducir 6664; CD VENTA 140048.56. VAL valorizacion NÂ°3 (fila 1 con un "." aislado).
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

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\GP-GCE-FOR-F10_AMSA VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC AMSA ENCOFRADOS PERU (alquiler de andamios) (RUC 20604506388). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes FEBRERO; CONTRACTUAL 5461.93 (inc)/4628.75 (no IGV); facturado 4628.75; saldo 0; CD VENTA 8258.11; periodo feb. VAL Costo Directo 4628.75, Adelanto NÂ°01 4821.27.
- Numeros clave: facturado 4628.75; CD VENTA 8258.11.
- Proposito: primera valorizacion alquiler andamios AMSA.
- Origen -> Destino: dias de alquiler -> RO encofrado/andamios / pago SC. (PDFs de la subcarpeta son su respaldo.)
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\GP-GCE-FOR-F10_AMSA VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC AMSA. VAL NÂ°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MARZO; CONTRACTUAL 10923.85 (inc)/9257.50 (no IGV); facturado 9257.50; saldo 0; CD VENTA 16516.22. VAL Costo Directo 9257.50.
- Numeros clave: facturado 9257.50; CD VENTA 16516.22.
- Proposito: segunda valorizacion alquiler andamios AMSA.
- Origen -> Destino: dias de alquiler -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\6. SC AMSA\GP-GCE-FOR-F10_AMSA VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC AMSA. VAL NÂ°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes ABRIL; CONTRACTUAL 16209.59 (inc)/13736.94 (no IGV); facturado 13736.94; saldo 0; CD VENTA 16516.22. VAL Estado de pago NÂ°3 "SUBCONTRATO DE ANDAMIOS".
- Numeros clave: facturado 13736.94; CD VENTA 16516.22.
- Proposito: tercera valorizacion alquiler andamios AMSA.
- Origen -> Destino: dias de alquiler -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\ESTADILLO 26-0169 - VAL 02_04-30_04.pdf
- Tipo / formato: pdf [no-Excel]. Estadillo (parte de alquiler) NOPIN NÂ° 26-0169, periodo 02/04 a 30/04.
- Proposito: respaldo de dias/equipos de alquiler de encofrado NOPIN (sustento de la val).
- Automatizacion: GAP; adjunto a la VAL NOPIN correspondiente.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\ESTADILLO 26-0179 - VAL 08_04-20_04.pdf
- Tipo / formato: pdf [no-Excel]. Estadillo NOPIN NÂ° 26-0179, periodo 08/04 a 20/04.
- Proposito: respaldo de alquiler NOPIN.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\GRAPCO 26-0169 DEL 26-03 AL 27-04.pdf
- Tipo / formato: pdf [no-Excel]. Documento NOPIN/GRAPCO NÂ° 26-0169, periodo 26-03 a 27-04.
- Proposito: respaldo de alquiler/valorizacion NOPIN.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\GRAPCO 26-0169 DEL 27-02 AL 28-03.pdf
- Tipo / formato: pdf [no-Excel]. Documento NOPIN/GRAPCO NÂ° 26-0169, periodo 27-02 a 28-03.
- Proposito: respaldo de alquiler/valorizacion NOPIN.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\1. Valorizacion\VALORIZACION DEL 29-03-2026 AL 01-04-2026.pdf
- Tipo / formato: pdf [no-Excel]. Valorizacion NOPIN periodo 29-03 a 01-04-2026.
- Proposito: respaldo PDF de la valorizacion NOPIN de fin de marzo/inicio abril.
- Automatizacion: GAP; adjunto a la VAL NOPIN.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN LIQUIDACION.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Alquiler de Encofrado, NOPIN Y ENCOFRA SAC (RUC 20604506388). VAL = LIQUIDACION (cierre).
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val LIQUIDACION, mes JUNIO; CONTRACTUAL 12970.56 (inc)/10992.00 (no IGV); facturado 7063.42; saldo por deducir 3929; CD VENTA 13140.05. VAL estado de pago = LIQUIDACION.
- Numeros clave: contractual 10992.00; facturado 7063.42; saldo 3929; CD VENTA 13140.05.
- Proposito: liquidacion final del SC encofrado NOPIN.
- Origen -> Destino: estadillos de alquiler (PDFs) -> RO / pago/cierre SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO (marca liquidacion).

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC NOPIN (subcontratista en RESUMEN figura "AMSA ENCOFRADOS PERU" â€” posible error de plantilla heredada). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes MARZO; CONTRACTUAL 4307.61 (inc)/3650.52 (no IGV); facturado 3650.52; saldo 0; CD VENTA 8258.11. VAL Costo Directo 3650.52.
- Numeros clave: facturado 3650.52; CD VENTA 8258.11.
- Proposito: primera valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. (Validar nombre SC: RESUMEN dice AMSA, carpeta dice NOPIN.)

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL NÂº02.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC NOPIN Y ENCOFRA SAC. VAL NÂ°02.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 2, mes MARZO; CONTRACTUAL 6073.53 (inc)/5147.06 (no IGV); facturado 4660.32; saldo por deducir 487; CD VENTA 9359.19. VAL Estado pago NÂ°2.
- Numeros clave: facturado 4660.32; saldo 487; CD VENTA 9359.19.
- Proposito: segunda valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL NÂº03.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC NOPIN. VAL NÂ°03.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 3, mes ABRIL; CONTRACTUAL 6073.53/5147.06; facturado 5147.06; saldo 0; CD VENTA 9359.19.
- Numeros clave: facturado 5147.06 (100%); CD VENTA 9359.19.
- Proposito: tercera valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL NÂº04.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC NOPIN. VAL NÂ°04.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 4, mes ABRIL; CONTRACTUAL 6520.34 (inc)/5525.72 (no IGV); facturado 5525.72; saldo 0; CD VENTA 13140.05.
- Numeros clave: facturado 5525.72; CD VENTA 13140.05.
- Proposito: cuarta valorizacion alquiler encofrado NOPIN.
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\7. SC ENCOFRADOS NOPIN\GP-GCE-FOR-F10_NOPIN VAL NÂº05.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC NOPIN. VAL NÂ°05.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 5, mes ABRIL; CONTRACTUAL 8334.83 (inc)/7063.42 (no IGV); facturado 7063.42; saldo 0; CD VENTA 13140.05.
- Numeros clave: facturado 7063.42; CD VENTA 13140.05.
- Proposito: quinta valorizacion alquiler encofrado NOPIN (coincide con monto facturado de la liquidacion).
- Origen -> Destino: estadillos NOPIN -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\8. SC SOPORTE  DE 14_\GP-GCE-FOR-F10_ANGEL VELASQUEZ VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC Soporte de 14" en acero, ANGEL VELASQUEZ BOTONI (sin RUC en hoja). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; CONTRACTUAL 900.00 (inc)/762.71 (no IGV); facturado 762.71; saldo 0; CD VENTA vacio. VAL servicio "SUBCONTRATO DE SOPORTE DE 14" EN ACERO".
- Numeros clave: contractual 762.71; facturado 762.71.
- Proposito: valorizar el servicio de soporte de tuberia 14" en acero.
- Origen -> Destino: servicio prestado -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\9. SC MAS ESTRUMETALES\GP-GCE-FOR-F10_ABRAZADERAS VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC MASESTRUMETALES â€” fabricacion de soporte para tubo (abrazaderas). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; servicio "FABRICACION DE SOPORTE PARA TUBO TIPO..."; CONTRACTUAL 826 (inc)/700 (no IGV); facturado 700; saldo 0; CD VENTA vacio. VAL Estado pago NÂ°1.
- Numeros clave: contractual 700; facturado 700.
- Proposito: valorizar fabricacion de abrazaderas/soportes de tubo.
- Origen -> Destino: servicio fabricacion -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\9. SC MAS ESTRUMETALES\GP-GCE-FOR-F10_MASESTRUMETALES VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC MASESTRUMETALES (en RESUMEN figura subcontratista "ANGEL VELASQUEZ BOTONI", servicio soporte de 14" â€” posible plantilla copiada). VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; CONTRACTUAL 900.00 (inc)/762.71 (no IGV); facturado 762.71; saldo 0. VAL servicio "SUBCONTRATO DE SOPORTE DE 14" EN ACERO".
- Numeros clave: contractual 762.71; facturado 762.71.
- Proposito: valorizar servicio estructuras menores (datos identicos a Angel Velasquez VAL01 â€” revisar duplicidad).
- Origen -> Destino: servicio -> RO / pago SC.
- Automatizacion: GAP Val Subcontratistas; importador generico -> RO. Advertencia: posible duplicado de la val de Angel Velasquez.

---

### \05. Gestion Costos\7. Valorizaciones\2. Subcontratistas\9. SC MAS ESTRUMETALES\GP-GCE-FOR-F10_PLATINAS VAL NÂº01.xlsx
- Tipo / formato: xlsx â€” F10 + PRO-GCE-FOR-VAL. SC MASESTRUMETALES â€” servicio de 320 agujeros en platina. VAL NÂ°01.
- Hojas (2): RESUMEN | VAL
- Contenido: RESUMEN val 1, mes ABRIL; servicio "SERVICIO DE 320 AGUJEROS EN PLATINA"; CONTRACTUAL 1121 (inc)/950 (no IGV); facturado 950; saldo 0. VAL Estado pago NÂ°1.
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



---

# CategorÃ­a 8 â€” Adicionales y Deductivos (CHUNK p1)

Proyecto: CREDITEX (PTARI / "PTAR PLANTA 5") + NAVE de RecuperaciÃ³n Â· Cliente CREDITEX S.A.A. Â· Contratista GRAPCO S.A.C. Â· SupervisiÃ³n: DISEÃ‘OS RACIONALES (en los ADs estructurales) / NA o vigilancia Â· UbicaciÃ³n AV. LOS HORNOS 185, ATE.

PatrÃ³n general del expediente de Adicional (formato GRAPCO):
- Cada Adicional usa la plantilla **GP-GCE-FOR-F05** (a veces el resumen interno cita PRO-GCE-FOR-F03 / GP-GCE-FOR-F01 / PRO-GCE-FOR-F05 segÃºn la hoja).
- Estructura tÃ­pica de hojas: **CarÃ¡tula** (obra, denominaciÃ³n, NÂ° de adicional, revisiÃ³n, fecha) Â· **Resumen** (presupuesto: ITEM, DESCRIPCIÃ“N, UND, CANT, P.U., PARCIAL, SUBTOTAL, TOTAL) Â· **Metrados** (planilla de metrados PRO-GCE-FOR-F05) Â· **APU** (anÃ¡lisis de precios unitarios MO) Â· **Registro FotogrÃ¡fico** Â· a veces **CotizaciÃ³n** (sustento de proveedor) y/o **Esquema / Cronograma**.
- Los ADs grandes (NÂ°12 Edificio de RecuperaciÃ³n) traen expediente completo tipo presupuesto BAC: PRE/PRO/MOV/EST/ARQ/IISS + APU + Recursos + Pull Planning + SectorizaciÃ³n + RO interno.
- Casi todos los montos/cantidades del Resumen y APU no quedan visibles en el volcado (celdas con fÃ³rmula y columnas truncadas); los pocos valores numÃ©ricos concretos se listan abajo.

---

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°24_Muro en Cisterna Externa\GP-GCE-FOR-F05-AD NÂ°24 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°24 Rev.01, plantilla GP-GCE-FOR-F05 (resumen cita GP-GCE-FOR-F01; metrados/APU citan PRO-GCE-FOR-F05). 2245 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido:
  - CarÃ¡tula: obra "PTAR PLANTA 5", denominaciÃ³n "MURO NUEVO Y CANALETA DE CONCRETO IMPE(rmeable)", Adicional NÂ°24 Rev.01, fecha 29/12/2025.
  - Resumen: PRESUPUESTO con columnas ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. (S/.) | PARCIAL | SUBTOTAL | TOTAL; PLAZO 15 DÃAS (+55 filas, partidas no volcadas).
  - 1. Metrados: planilla por CONCRETO / ACERO / TOTAL (factor 13.59 = peso varilla, +29 filas).
  - 2. APU: anÃ¡lisis de PU mano de obra; aparece "ALQUILER DE ANDAMIOS PARA TRABAJOS" UND MES P.U. 262.92 (+229 filas).
  - 3. Registro FotogrÃ¡fico: solo cabecera (fotos no volcadas).
- NÃºmeros clave: alquiler andamios = S/ 262.92/mes; plazo 15 dÃ­as.
- PropÃ³sito: sustento de costo del adicional Muro + canaleta de concreto impermeable en cisterna externa, para cobro al cliente.
- Origen -> Destino: metrados de campo + APU GRAPCO -> presupuesto del adicional -> negociaciÃ³n/valorizaciÃ³n CREDITEX y RO (sobrecosto/mayor metrado).
- AutomatizaciÃ³n: importar Resumen como registro en mÃ³dulo Adicionales/Deductivos (cabecera + lÃ­neas de partida con PU/total); APU MO alimenta ISP/RO. GRAPCO ya tiene mÃ³dulo Adicionales/Deductivos -> destino directo.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°25_Media CaÃ±a en Decantador\GP-GCE-FOR-F05-AD NÂ°25 Rev.02.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°25 Rev.02, GP-GCE-FOR-F05. 693 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido: denominaciÃ³n "MEDIA CAÃ‘A EN DECANTADOR", fecha 15/06/2026, PLAZO 7 DÃAS. Resumen (+41 filas). Metrados CONCRETO/ACERO (+10 filas). APU: "ALQUILER DE ANDAMIOS PARA TRABAJOS" UND GLB P.U. 262.92 (+152 filas). Registro FotogrÃ¡fico solo cabecera.
- NÃºmeros clave: andamios S/ 262.92 (GLB); plazo 7 dÃ­as.
- PropÃ³sito: costo del adicional media caÃ±a (transiciÃ³n) en decantador.
- Origen -> Destino: metrados/APU -> presupuesto adicional -> valorizaciÃ³n CREDITEX / RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos (esta Rev.02 es la vigente; cargar como versiÃ³n actual).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°25_Media CaÃ±a en Decantador\SUPERADO\GP-GCE-FOR-F05-AD NÂ°25 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°25 Rev.01 (SUPERADO/obsoleta). 693 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico (idÃ©ntica estructura a Rev.02).
- Contenido: misma denominaciÃ³n "MEDIA CAÃ‘A EN DECANTADOR", Rev.01; APU andamios GLB 262.92 (+154 filas).
- NÃºmeros clave: andamios S/ 262.92.
- PropÃ³sito: versiÃ³n anterior superada por Rev.02; valor histÃ³rico/auditorÃ­a.
- Origen -> Destino: reemplazada por Rev.02.
- AutomatizaciÃ³n: NO cargar como vigente (carpeta SUPERADO); a lo sumo guardar como histÃ³rico de versiÃ³n en el mÃ³dulo Adicionales.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°26_Cambio de DiseÃ±o en Escalera de Nave\GP-GCE-FOR-F05-AD NÂ°26 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°26 Rev.01, GP-GCE-FOR-F05 (resumen cita PRO-GCE-FOR-F03). 727 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido: denominaciÃ³n "CAMBIO DE DISEÃ‘O EN ESCALERA DE NAVE", fecha 16/06/2026, PLAZO 7 DÃAS, supervisiÃ³n DISEÃ‘OS RACIONALES. Metrados con Ã­tem IMPERMEABILIZACIÃ“N (+19 filas). APU: "ESCALERA METALICA" UND KG P.U. 14.29 (+19 filas).
- NÃºmeros clave: PU escalera metÃ¡lica = S/ 14.29/kg.
- PropÃ³sito: sustento del sobrecosto por rediseÃ±o de escalera metÃ¡lica de la nave.
- Origen -> Destino: RFI 033 + cotizaciÃ³n M&M -> metrados/APU -> presupuesto adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; el insumo escalera metÃ¡lica (kg) puede ligarse a AlmacÃ©n/cotizaciÃ³n proveedor.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°26_Cambio de DiseÃ±o en Escalera de Nave\SUSTENTO\01_Creditex_Cotizacion Adicional Esc. Metalica_Rev.01.xlsm
- Tipo / formato: xlsm (Excel con macros) â€” cotizaciÃ³n de proveedor. 1 hoja. 216 KB.
- Hojas: 01. Cotizacion M&M
- Contenido: COTIZACIÃ“N de **M&M INDUSTRIA METÃLICA SAC** (RUC 20551531326), CotizaciÃ³n NÂ° 2026-00116, fecha 15/06/2026, dirigida a Grapco / proyecto Creditex, Rev.1. Tabla Item | DescripciÃ³n | Unidad | Cantidad | Precio | Parcial. Ãtem 1 "Escalera metÃ¡lica - Nuevo diseÃ±o" Parcial **S/ 4393.04** (+18 filas).
- NÃºmeros clave: Escalera metÃ¡lica nuevo diseÃ±o = **S/ 4,393.04**.
- PropÃ³sito: cotizaciÃ³n de subcontratista metÃ¡lico que sustenta el costo del AD-26.
- Origen -> Destino: proveedor M&M -> sustento del adicional NÂ°26 -> APU/Resumen del AD.
- AutomatizaciÃ³n: cotizaciÃ³n de proveedor -> AlmacÃ©n/compras o sustento del adicional (adjunto). GAP parcial: no hay mÃ³dulo de cotizaciones de proveedor estructurado; cargar como adjunto del adicional.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°26_Cambio de DiseÃ±o en Escalera de Nave\SUSTENTO\2026.06.16 Respt. Hiagshi_RFI 033.pdf
- Tipo / formato: PDF [no-Excel]. 354 KB.
- PropÃ³sito: respuesta a RFI 033 (consulta tÃ©cnica) que aprueba/sustenta el cambio de diseÃ±o de la escalera.
- Origen -> Destino: ingenierÃ­a (Hiagshi) -> sustento documental del AD-26.
- AutomatizaciÃ³n: adjunto documental del adicional (no genera datos numÃ©ricos). GAP: gestor de documentos/RFI no existe como mÃ³dulo.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\1. Proceso\AD-NÂ°26_Cambio de DiseÃ±o en Escalera de Nave\SUSTENTO\Creditex_Sustento escalera metalica_Rev.01.xlsx
- Tipo / formato: xlsx â€” hoja de cÃ¡lculo de peso/metrado de acero. 1 hoja. 61 KB.
- Hojas: Hoja1
- Contenido: despiece de escalera metÃ¡lica con Item | DescripciÃ³n | Unidad | ml | Kg/ml | Cantidad | Parcial | (factor 0.09) | Metrado. Dos diseÃ±os comparados:
  - Ãtem 8 "ESCALERA METALICA - APROBADO 18/03/26" total **1094.93 kg**; componentes: plancha base 300x450x10 (46.05), plancha e=12mm (60.12), anclaje Ã˜1/2" (20.51), VE viga 100x250x4.50 (602.39), pasos plancha estriada (365.86).
  - Ãtem 9 "ESCALERA METALICA - NUEVO MODELO" total **1443.58 kg** (+9 filas).
- NÃºmeros clave: escalera aprobada 1094.93 kg vs nuevo modelo 1443.58 kg (delta = +348.65 kg de acero, base del adicional).
- PropÃ³sito: cÃ¡lculo de peso de acero antes/despuÃ©s que justifica el mayor metrado del AD-26.
- Origen -> Destino: planos/diseÃ±o -> peso de acero -> APU/Resumen del adicional.
- AutomatizaciÃ³n: fuente de metrado de acero (kg) para el adicional; el delta kg alimenta el cobro y el RO (insumo acero). Cargar como metrado de sustento.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°00_Rechazados\AD-NÂ°05_Vigilancia Diurno\Propuesta EconÃ³mica_11_2025.pdf
- Tipo / formato: PDF [no-Excel]. 327 KB.
- PropÃ³sito: propuesta econÃ³mica (nov-2025) de servicio de vigilancia diurna; adicional RECHAZADO.
- Origen -> Destino: proveedor de vigilancia -> sustento del AD-05 (no aprobado).
- AutomatizaciÃ³n: adjunto; adicional rechazado -> no alimenta RO. Registrar estado "Rechazado" en mÃ³dulo Adicionales.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°00_Rechazados\AD-NÂ°05_Vigilancia Diurno\GP-GCE-FOR-F05-AD NÂ°05 Rev.00.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°05 Rev.00 (RECHAZADO), GP-GCE-FOR-F05. 435 KB.
- Hojas: CarÃ¡tula | Resumen | CotizaciÃ³n
- Contenido: CarÃ¡tula obra "PTARI CREDITEX", denominaciÃ³n "VIGILANCIA DIURNA", NÂ°05 Rev.01, fecha 18/11/2025. Resumen secciÃ³n "1.- PRECIO UNITARIO" con ITEM/DESCRIPCIÃ“N/UND/CANTIDAD/P.U./PARCIAL/TOTAL, PLAZO 7 DÃAS (+12 filas). **Hoja CotizaciÃ³n vacÃ­a.**
- NÃºmeros clave: ninguno legible (montos en celdas no volcadas).
- PropÃ³sito: adicional de vigilancia diurna (servicio); rechazado por el cliente.
- Origen -> Destino: GRAPCO -> CREDITEX (rechazado).
- AutomatizaciÃ³n: mÃ³dulo Adicionales con estado "Rechazado" (no impacta RO).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°01_Cerco Interior Campamento\GP-GCE-FOR-F05-AD NÂ°01 Rev.00.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°01 Rev.00, GP-GCE-FOR-F05. 360 KB.
- Hojas: CarÃ¡tula | Resumen | 1. MAT | 2. MO | 3. MO_APU
- Contenido: denominaciÃ³n "CERCO PERIMÃ‰TRICO INTERIOR" (PTARI CREDITEX), fecha 02/11/2025, PLAZO 7 DÃAS. Resumen "1.- PRECIO UNITARIO" (+28 filas). 1. MAT (materiales del cerco: triplay + malla rashel, +8 filas). 2. MO (mano de obra, +9 filas). 3. MO_APU: "HABILITACION DE PANELES (MO)" UND MODULO P.U. 33.99 (+33 filas; aparece valor 8.89).
- NÃºmeros clave: habilitaciÃ³n de paneles MO = S/ 33.99/mÃ³dulo.
- PropÃ³sito: costo del cerco perimÃ©trico interior del campamento (materiales + MO).
- Origen -> Destino: metrados de campo -> APU -> presupuesto adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; MAT puede ligarse a AlmacÃ©n y MO a ISP.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°02_Inst. de Puerta Metalica y Acceso\GP-GCE-FOR-F05-AD NÂ°02 _ REPOSICION DE LOSARev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°02 Rev.01 (variante "REPOSICION DE LOSA"), GP-GCE-FOR-F05. 5250 KB.
- Hojas: CarÃ¡tula | Resumen | 2. Metrados | 3. Registro FotogrÃ¡fico | 4. APU
- Contenido: CarÃ¡tula "REPOSICION DE LOSA" (PTAR PLANTA 5), NÂ°02 Rev.01, 20/11/2025. Resumen PRESUPUESTO (+45 filas). 2. Metrados con NÂ° DE VECES + DIMENSIONES Ancho/Largo/Alto (+42 filas). 4. APU: "CORTE DE LOSA EXISTENTE" UND M2 P.U. 119.53 marcado "Nuevo APU" (+221 filas).
- NÃºmeros clave: corte de losa existente = S/ 119.53/m2.
- PropÃ³sito: sustento del adicional de reposiciÃ³n de losa (variante del expediente puerta metÃ¡lica/acceso).
- Origen -> Destino: metrados/APU -> presupuesto adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; APU "Nuevo APU" marca partidas nuevas no presupuestadas (Ãºtil para clasificar en RO como adicional puro).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°02_Inst. de Puerta Metalica y Acceso\GP-GCE-FOR-F05-AD NÂ°02 Rev.00.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°02 Rev.00, GP-GCE-FOR-F05. 5250 KB.
- Hojas: CarÃ¡tula | Resumen | 2. Metrados | 3. Registro FotogrÃ¡fico | 4. APU
- Contenido: denominaciÃ³n "INST. DE PUERTA METALICA Y ACCESO" (PTAR PLANTA 5), NÂ°02 Rev.01, 20/11/2025. Resumen (+44 filas). 2. Metrados NÂ° DE VECES + DIMENSIONES (+42 filas). 4. APU: "CORTE DE LOSA EXISTENTE" M2 119.53 "Nuevo APU" (+221 filas).
- NÃºmeros clave: corte de losa = S/ 119.53/m2.
- PropÃ³sito: adicional instalaciÃ³n de puerta metÃ¡lica y acceso (versiÃ³n base; comparte APU con la variante reposiciÃ³n de losa).
- Origen -> Destino: metrados/APU -> presupuesto adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales; revisar contra la variante para evitar doble carga.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°03_Cerco Interno en T. Existentes\GP-GCE-FOR-F05-AD NÂ°03 Rev.00.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°03 Rev.00, GP-GCE-FOR-F05. 314 KB.
- Hojas: CarÃ¡tula | Resumen | 1. MAT | 2. MO | 3. MO_APU
- Contenido: denominaciÃ³n "CERCO PERIMÃ‰TRICO INTERIOR EN ZONA DE (tanques existentes)" (PTAR PLANTA 5), NÂ°03 Rev.01, 02/11/2025, PLAZO 7 DÃAS. Resumen (+25 filas). 1. MAT (paneles triplay 3.60m, +5 filas). 2. MO (cerco 32.26 ML, +5 filas). 3. MO_APU: "HABILITACION DE PANELES (MO)" UND ML P.U. 33.99 (+20 filas).
- NÃºmeros clave: habilitaciÃ³n paneles MO = S/ 33.99/ML; longitud cerco 32.26 ML.
- PropÃ³sito: costo cerco perimÃ©trico interior en zona de tanques existentes.
- Origen -> Destino: metrados de campo -> APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; MO -> ISP.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°06_Falsa Zapata\GP-GCE-FOR-F05-AD NÂ°06 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°06 Rev.01, GP-GCE-FOR-F05. 2253 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido: "FALSA ZAPATA" (PTAR PLANTA 5), NÂ°06 Rev.01, 27/12/2025, PLAZO 7 DÃAS, supervisiÃ³n DISEÃ‘OS RACIONALES. Resumen (+17 filas). 1. Metrados NÂ° DE VECES + DIMENSIONES Altura/Ancho/Largo (+7 filas). 2. APU: "EXCAVACION LOCALIZADA MANUAL" UND M3 P.U. 64.02 (+63 filas).
- NÃºmeros clave: excavaciÃ³n localizada manual = S/ 64.02/m3.
- PropÃ³sito: costo de falsa zapata (sobrecimentaciÃ³n por sobreexcavaciÃ³n / nivel de fundaciÃ³n).
- Origen -> Destino: metrados/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°07_Falso Muro\GP-GCE-FOR-F05-AD NÂ°07 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°07 Rev.01, GP-GCE-FOR-F05. 3025 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido: "FALSO MURO" (PTAR PLANTA 5), NÂ°07 Rev.01, 29/12/2025, PLAZO 7 DÃAS. Resumen (+16 filas). 1. Metrados CONCRETO/ACERO/TOTAL (factor 13.59, +14 filas). 2. APU: "ALQUILER DE ANDAMIOS PARA TRABAJOS LOC(alizados)" UND DIA P.U. 82.72 marcado "Nuevo APU" (+87 filas).
- NÃºmeros clave: alquiler andamios = S/ 82.72/dÃ­a.
- PropÃ³sito: costo de falso muro de concreto.
- Origen -> Destino: metrados/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°08_Sellado de Filtraciones\1. CotizaciÃ³n\SURE-882 filtracion sellos Creditex GRAPCO.pdf
- Tipo / formato: PDF [no-Excel]. 312 KB.
- PropÃ³sito: cotizaciÃ³n SURE-882 (proveedor SURE) para servicio de sellado de filtraciones.
- Origen -> Destino: proveedor -> sustento del AD-08.
- AutomatizaciÃ³n: adjunto/cotizaciÃ³n proveedor del adicional.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°08_Sellado de Filtraciones\2. Fichas Tecnica\204_lamposilex_es (2).pdf
- Tipo / formato: PDF [no-Excel] â€” ficha tÃ©cnica producto Lamposilex. 269 KB.
- PropÃ³sito: ficha tÃ©cnica de impermeabilizante (sustento tÃ©cnico del sellado).
- AutomatizaciÃ³n: adjunto documental (sin datos de costo).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°08_Sellado de Filtraciones\2. Fichas Tecnica\HT Poliuretano Expandible MG Classic (1).pdf
- Tipo / formato: PDF [no-Excel] â€” hoja tÃ©cnica poliuretano expandible. 149 KB.
- PropÃ³sito: ficha tÃ©cnica de insumo de sellado (sustento tÃ©cnico).
- AutomatizaciÃ³n: adjunto documental.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°08_Sellado de Filtraciones\3. PETS\Procedimiento de sellado x filtraciÃ³n.pdf
- Tipo / formato: PDF [no-Excel] â€” PETS (procedimiento de trabajo). 1661 KB.
- PropÃ³sito: procedimiento de ejecuciÃ³n del sellado por filtraciÃ³n (sustento de mÃ©todo).
- AutomatizaciÃ³n: adjunto documental (SSOMA/Calidad, fuera de GRAPCO costos).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°08_Sellado de Filtraciones\GP-GCE-FOR-F05-AD NÂ°08 Rev.03.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°08 Rev.03, GP-GCE-FOR-F05. 2191 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico | 4. CotizaciÃ³n
- Contenido: "SELLADO IMPERMEABILIZANTE DE TANQUE EX(istente)" (PTAR PLANTA 5), NÂ°08 Rev.01, 30/12/2025, PLAZO 7 DÃAS. Resumen (+16 filas). Metrados NÂ° DE VECES + DIMENSIONES (+4 filas). APU: "LIMPIEZA DE SUPERFICIE" UND M2 P.U. 33.39 (+32 filas). **4. CotizaciÃ³n: "PU Total 9900"**.
- NÃºmeros clave: **PU Total cotizaciÃ³n = S/ 9,900**; limpieza de superficie = S/ 33.39/m2.
- PropÃ³sito: costo del sellado impermeabilizante de tanque existente.
- Origen -> Destino: cotizaciÃ³n SURE + metrados/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; el valor 9900 (cotizaciÃ³n) es total cobrable.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°09_CordÃ³n bentÃ³nico y acabados\1. Superado\GP-GCE-FOR-F05-AD NÂ°09 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°09 Rev.01 (SUPERADO). 16311 KB (muy pesado, fotos embebidas).
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico | 4. CotizaciÃ³n
- Contenido: "COLOCACIÃ“N DE CORDÃ“N BENTONÃTICO Y ACA(bados)" (PTAR PLANTA 5), NÂ°09 Rev.01, 16/02/2026, PLAZO 7 DÃAS. Resumen (+14 filas). Metrados (+57 filas). APU: "COLOCACION DE JUNTA HIDRO EXPANSIVA 13(x..)" UND ML P.U. 73.49 (+58 filas). CotizaciÃ³n (cabecera).
- NÃºmeros clave: junta hidroexpansiva = S/ 73.49/ML (en esta Rev.01 superada).
- PropÃ³sito: versiÃ³n anterior del adicional cordÃ³n bentÃ³nico (superada por Rev.03).
- Origen -> Destino: reemplazada por Rev.03.
- AutomatizaciÃ³n: NO cargar como vigente (carpeta Superado); histÃ³rico de versiÃ³n.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°09_CordÃ³n bentÃ³nico y acabados\GP-GCE-FOR-F05-AD NÂ°09 Rev.03.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°09 Rev.03 (VIGENTE). 16314 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico | 4. CotizaciÃ³n
- Contenido: misma denominaciÃ³n "CORDÃ“N BENTONÃTICO Y ACABADOS", NÂ°09 Rev.01 (en hoja), 16/02/2026. Resumen (+12 filas). Metrados (+57 filas). APU: "COLOCACION DE JUNTA HIDRO EXPANSIVA 13" UND ML P.U. **16.33 marcado "Contratual"** (+85 filas; nÃ³tese cambio de precio vs Rev.01 que era 73.49 "nuevo APU").
- NÃºmeros clave: junta hidroexpansiva PU contractual = S/ 16.33/ML.
- PropÃ³sito: versiÃ³n vigente del adicional cordÃ³n bentÃ³nico + acabados; distingue partidas contractuales vs nuevas.
- Origen -> Destino: metrados/APU + cotizaciÃ³n -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos (cargar Rev.03 como vigente); el marcado "Contratual"/"Nuevo APU" ayuda a clasificar mayor metrado vs adicional puro en RO.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°10_InstalaciÃ³n Linea DN250 HDPE\GP-GCE-FOR-F05-AD NÂ°10 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°10 Rev.01, GP-GCE-FOR-F05. 2299 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico | 4. CotizaciÃ³n
- Contenido: "INSTALACION DE LINEA DN250 HDPE EN DEC(antador)" (PTAR PLANTA 5), NÂ°10 Rev.01, 16/02/2026, PLAZO 7 DÃAS. Resumen (+11 filas). Metrados (+2 filas). APU: "INSTALACION DE TUBERIA DN250 HDPE EN D(ecantador)" UND UND P.U. 576.55 (+24 filas). CotizaciÃ³n (cabecera).
- NÃºmeros clave: instalaciÃ³n tuberÃ­a DN250 HDPE = S/ 576.55/und.
- PropÃ³sito: costo de instalaciÃ³n de lÃ­nea HDPE DN250 en decantador.
- Origen -> Destino: cotizaciÃ³n proveedor + APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°11_Prueba de Estanqueidad Seca\CotizaciÃ³n - OI-2025-COT-03730.pdf
- Tipo / formato: PDF [no-Excel]. 111 KB.
- PropÃ³sito: cotizaciÃ³n OI-2025-COT-03730 (proveedor) para prueba de estanqueidad lanza seca.
- Origen -> Destino: proveedor -> sustento del AD-11.
- AutomatizaciÃ³n: adjunto/cotizaciÃ³n proveedor del adicional.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°11_Prueba de Estanqueidad Seca\GP-GCE-FOR-F05-AD NÂ°11 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°11 Rev.01, GP-GCE-FOR-F05. 496 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico | 4. CotizaciÃ³n
- Contenido: "PRUEBA DE ESTANQUEIDAD (LANZA SECA)" (PTAR PLANTA 5), NÂ°11 Rev.01, 02/03/2026, PLAZO 7 DÃAS. Resumen (+13 filas). Metrados (+2 filas). APU: "PRUEBA ESTANQUEIDAD (LANZA SECA)" UND DIA P.U. **4267.36** (+45 filas). CotizaciÃ³n (cabecera).
- NÃºmeros clave: prueba de estanqueidad = S/ 4,267.36/dÃ­a.
- PropÃ³sito: costo de prueba de estanqueidad (servicio especializado, alto PU diario).
- Origen -> Destino: cotizaciÃ³n OI-2025-COT-03730 + APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos (servicio subcontratado).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°12_Edificio de RecuperaciÃ³n\GP-GCE-FOR-F05-AD NÂ°12 Rev.00.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°12 Rev.00, plantilla presupuesto completo GP-GCE-FOR-F01 + PRO-GCE-FOR-F03. 2375 KB. **El mÃ¡s complejo del chunk (15 hojas).**
- Hojas: CarÃ¡tula | Resumen | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 9. Pull | 10. Esquema | 11. Sectorizacion | 12. RO
- Contenido:
  - CarÃ¡tula/Resumen: "EDIFICIO DE RECUPERACIÃ“N (S/ EST. MET.)" = Frente F2/NAVE, fecha 04/03/2026, PLAZO F2 2.80 MESES, TRASLAPE C/ F1 1 MES. Resumen del presupuesto (+38 filas).
  - 1. PRE/2. PRO/3. MOV/4. EST/5. ARQ/6. IISS: presupuesto por especialidad (ITEM/DESCRIPCIÃ“N/UND/CANT/P.U./PARCIAL/SUBTOTAL/TOTAL); EST con +76 filas (la mÃ¡s grande).
  - 7. APU: anÃ¡lisis de precios unitarios (+727 filas).
  - Hoja 8: flujo de egresos por semana (Sem1..Sem24) por partida (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...).
  - 8. Recursos: lista de recursos MO/MAT/EQ con UND/SOL/USD/ESTATUS (REALIZADO/PROCESO/PENDIENTE), T.C.=3.80 (+381 filas).
  - 9. Pull: Pull Planning / Lookahead diario, jornada 8 HH/dÃ­a, inicio 03/03/2026, fin 26/05/2026, 84 dÃ­as; columnas ID/UND/METRADO/SECTORES/SECTOR/IP/HH/MO/Cuadrilla + calendario (+77 filas). Frentes N1 NAVE DE RECUPERACION, N2 ESTRUCTURAS.
  - 10. Esquema / 11. SectorizaciÃ³n: layout de obra (cimentaciÃ³n, excavaciÃ³n, sectores S1/S3/C1/C2, acopio quÃ­micos, lavanderÃ­a).
  - **12. RO**: presupuesto del frente F2/NAVE â€” **TOTAL COSTO DE OBRA S/ 330,896.64; COSTO DIRECTO S/ 261,642.90**; partida 1001 TRABAJOS PRELIMINARES S/ 19,050.38 (PRE1 SSO 5147.98, PRE2 TOPOGRAFÃA 8026.98) (+61 filas).
- NÃºmeros clave (Rev.00): **Total costo obra S/ 330,896.64**; **Costo directo S/ 261,642.90**; Trabajos preliminares S/ 19,050.38; T.C. 3.80; plazo 2.80 meses; 84 dÃ­as; jornada 8 HH/dÃ­a.
- PropÃ³sito: presupuesto y planificaciÃ³n completa del adicional mayor "Edificio de RecuperaciÃ³n / Nave" (F2), con BAC + recursos + pull + RO.
- Origen -> Destino: ingenierÃ­a + metrados NAVE -> presupuesto/APU/recursos/pull -> RO interno -> oferta al cliente.
- AutomatizaciÃ³n: este expediente cruza varios mÃ³dulos: Resumen+1-6 -> Presupuesto (BAC); 7.APU -> APU/RO; 9.Pull -> Cronograma/Pull Planning (LPS, IP/HH); 12.RO -> Resultado Operativo. Importador genÃ©rico in-app para cada hoja; clave para alimentar BAC del frente NAVE.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°12_Edificio de RecuperaciÃ³n\GP-GCE-FOR-F05-AD NÂ°12 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°12 Rev.01 (versiÃ³n actualizada). 2375 KB. Misma estructura de 15 hojas.
- Hojas: CarÃ¡tula | Resumen | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | 7. APU | Hoja 8 | 8. Recursos | 9. Pull | 10. Esquema | 11. Sectorizacion | 12. RO
- Contenido: idÃ©ntico esquema a Rev.00; cambian montos. **12. RO: TOTAL COSTO DE OBRA S/ 235,236.10; COSTO DIRECTO S/ 186,003.26**; Trabajos preliminares S/ 19,050.38 (mismos PRE1/PRE2). APU +727 filas; Recursos +381 filas; Pull mismas fechas (03/03â€“26/05/2026, 84 dÃ­as).
- NÃºmeros clave (Rev.01): **Total costo obra S/ 235,236.10**; **Costo directo S/ 186,003.26** (reducciÃ³n ~S/ 95,660 vs Rev.00, probable ajuste de alcance/negociaciÃ³n).
- PropÃ³sito: versiÃ³n revisada del presupuesto del Edificio de RecuperaciÃ³n (NAVE) â€” la vigente entre las dos.
- Origen -> Destino: igual a Rev.00 (BAC/APU/Pull/RO).
- AutomatizaciÃ³n: cargar Rev.01 como vigente; misma ruta multi-mÃ³dulo. Comparar Rev.00 vs Rev.01 para trazabilidad del ajuste.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°12_Edificio de RecuperaciÃ³n\Met.Est_NAVE CREDITEX Rev.01_2026-01-08.xlsx
- Tipo / formato: xlsx â€” Metrado estructural detallado de la NAVE. 4297 KB. **33 hojas (planilla de metrados de acero/concreto/encofrado).**
- Hojas: Ratios | Resumen | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 6. IISS | Met_ARQ | Met_MOV | Met_DEM | Met_CALZ | Met_FZ | Met_ZAP | Met_PED | Met_CANAL | Met_LCIM | Met_Losa Maciza | Met_COL | Met_VIG | LosaAligerada | Met_IISS | REV. ACERO | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa
- Contenido:
  - Ratios: kg/m3 de acero por elemento (Zapatas 40-70, Columnas 100-350, Vigas 100-250, Aligerados 80-175, Losas macizas 50-200).
  - Resumen: "PRESUPUESTO OFERTA - COSTO", comparaciÃ³n Metrado Oferta vs Metrado Nuevo por partida cliente (+53 filas).
  - 1.PRE/2.PRO/3.MOV: ojo â€” cabeceras citan "PRECOTEX LAS MORERAS"/cliente PRECOTEX (plantilla reusada de otro proyecto) aunque el archivo es de NAVE CREDITEX; metrados por partida con UND/CANT.
  - 4.EST/5.ARQ/6.IISS: ya con "PLANTA PTAR 5 - CREDITEX", fecha 16/03/2026 (EST +67 filas).
  - Hojas Met_* y de elementos: planillas de cÃ³mputo de cantidades por elemento (excavaciÃ³n, relleno, solado, concreto f'c, encofrado, acero con traslapes y pesos por Ã˜). Ej. Met_CANAL/Met_LCIM: losa de cimentaciÃ³n con juntas, acero 16893.25 kg (m2 380.62, 44.38 kg/m2). REV.ACERO: columnas 1318.38 kg, zapata 470.16 kg, etc.
- NÃºmeros clave: ratios kg/m3; acero losa cimentaciÃ³n 16,893.25 kg (44.38 kg/m2); REV.ACERO columnas 1,318.38 kg, zapata 470.16 kg.
- PropÃ³sito: metrado base (concreto/acero/encofrado) que alimenta el presupuesto del AD-12 NAVE; sustenta cantidades del BAC.
- Origen -> Destino: planos NAVE -> cÃ³mputo metrados -> partidas/cantidades del AD-12 (Resumen 1-6) -> APU/RO.
- AutomatizaciÃ³n: fuente de metrado para Presupuesto (BAC) del frente NAVE; hoja Resumen "Oferta vs Nuevo" sirve para detectar mayores metrados (adicional/deductivo). Importar como metrados; cuidar el residuo de plantilla PRECOTEX (no es data del proyecto, es encabezado heredado).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°13_CODO HDPE REBOSE EN DECANTADOR\1. CotizaciÃ³n\SURE-929 cierre de pase de tuberÃ­a Creditex.pdf
- Tipo / formato: PDF [no-Excel]. 263 KB.
- PropÃ³sito: cotizaciÃ³n SURE-929 (cierre de pase de tuberÃ­a) â€” sustento del AD-13.
- AutomatizaciÃ³n: adjunto/cotizaciÃ³n proveedor.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°13_CODO HDPE REBOSE EN DECANTADOR\1. CotizaciÃ³n\Valorizacion_Servicio_Ejecutado (1).pdf
- Tipo / formato: PDF [no-Excel]. 96 KB.
- PropÃ³sito: valorizaciÃ³n de servicio ejecutado (proveedor) ligada al AD-13.
- Origen -> Destino: proveedor (subcontrato) -> sustento de pago/valorizaciÃ³n del adicional.
- AutomatizaciÃ³n: GAP â€” ValorizaciÃ³n de Subcontratistas (F10/F11) no existe como mÃ³dulo; cargar como adjunto. Candidato a futuro mÃ³dulo de subcontratos.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°13_CODO HDPE REBOSE EN DECANTADOR\GP-GCE-FOR-F05-AD NÂ°13 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°13 Rev.01, GP-GCE-FOR-F05. 4943 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico | 4. CotizaciÃ³n
- Contenido: "SUMINISTRO E INSTALACIÃ“N DE CODO HDPE (rebose en decantador)" (PTAR PLANTA 5), NÂ°13 Rev.01, 16/02/2026, PLAZO 7 DÃAS. Resumen (+13 filas). Metrados (+3 filas). APU: "INSTALACION DE TUBERIA DN250 HDPE EN D" UND UND P.U. **6884.33** (+30 filas). CotizaciÃ³n (cabecera).
- NÃºmeros clave: instalaciÃ³n codo/tuberÃ­a HDPE = S/ 6,884.33/und.
- PropÃ³sito: costo del suministro e instalaciÃ³n de codo HDPE de rebose en decantador.
- Origen -> Destino: cotizaciÃ³n SURE-929 + APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°14_Suministro e instalacion de Tuberia PVC para rebose\1. Cotizacion\COTIZACION-CT01-000347 (1).pdf
- Tipo / formato: PDF [no-Excel]. 53 KB.
- PropÃ³sito: cotizaciÃ³n CT01-000347 (proveedor) de tuberÃ­a PVC para rebose â€” sustento del AD-14.
- AutomatizaciÃ³n: adjunto/cotizaciÃ³n proveedor.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°14_Suministro e instalacion de Tuberia PVC para rebose\GP-GCE-FOR-F05-AD NÂ°14 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°14 Rev.01, GP-GCE-FOR-F01. 1508 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. CotizaciÃ³n
- Contenido: "SUMINISTRO E INSTALACIÃ“N DE TUBERIA PV(C para rebose)" (PTAR PLANTA 5), NÂ°14, 21/03/2026, PLAZO 7 DÃAS. Resumen (+19 filas). 1. Metrado con DIMENSIONES + Vol. (+11 filas). 2. APU (+58 filas). Hoja 8 flujo semanal de egresos. 3. Esquema. 4. CotizaciÃ³n (cabecera).
- NÃºmeros clave: ninguno legible en el volcado (montos en celdas no volcadas).
- PropÃ³sito: costo del suministro e instalaciÃ³n de tuberÃ­a PVC para rebose.
- Origen -> Destino: cotizaciÃ³n CT01-000347 + metrado/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; Hoja 8 (egresos semanales) -> insumo Flujo de Caja (GAP: mÃ³dulo Flujo de Caja no existe).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°15_Pernos de anclaje para pedestales - NAVE\1. Superado\GP-GCE-FOR-F05-AD NÂ°15 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°15 Rev.01 (SUPERADO). 749 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido: "PEDESTALES INC. ANCLAJES EN NAVE" (PTAR PLANTA 5), NÂ°15 Rev.01, 21/03/2026, PLAZO 7 DÃAS. Resumen (+18 filas). Metrados (+8 filas). APU: "ENCOFRADO Y DESENCOFRADO DE PEDESTALES" UND M2 P.U. 69.72 (+69 filas).
- NÃºmeros clave: encofrado pedestales = S/ 69.72/m2.
- PropÃ³sito: versiÃ³n superada del adicional pedestales/anclajes (incluye anclajes).
- Origen -> Destino: reemplazada por Rev.02.
- AutomatizaciÃ³n: NO cargar como vigente (carpeta Superado); histÃ³rico.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°15_Pernos de anclaje para pedestales - NAVE\GP-GCE-FOR-F05-AD NÂ°15 Rev.02.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°15 Rev.02 (VIGENTE). 771 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrados | 2. APU | 3. Registro FotogrÃ¡fico
- Contenido: denominaciÃ³n cambia a "PEDESTALES **S/ ANCLAJES** EN NAVE" (sin anclajes) (PTAR PLANTA 5), NÂ°15 Rev.01 (en hoja), 21/03/2026. Resumen (+18 filas). Metrados (+8 filas). APU: "ENCOFRADO Y DESENCOFRADO DE PEDESTALES" UND M2 P.U. 69.72 (+68 filas).
- NÃºmeros clave: encofrado pedestales = S/ 69.72/m2.
- PropÃ³sito: versiÃ³n vigente; cambia el alcance (pedestales SIN anclajes), por lo que el delta vs Rev.01 (con anclajes) es relevante.
- Origen -> Destino: metrados/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos (Rev.02 vigente).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°16_Rampa y vereda Nueva\GP-GCE-FOR-F05-AD NÂ°16 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°16 Rev.01, GP-GCE-FOR-F01/F03. 1719 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: "RAMPAS Y VEREDAS" (PTAR PLANTA 5), NÂ°16, 21/03/2026. Resumen (+25 filas). 1. Metrado con DIMENSIONES + AREA (+17 filas; varios #REF! en cabecera). 2. APU (+90 filas, #REF! en cabecera). Hoja 8 egresos semanales. 3. Esquema (PLAZO #REF!). 4. CotizaciÃ³n (+? filas).
- NÃºmeros clave: ninguno legible; varias celdas #REF! (fÃ³rmulas rotas en cabeceras de fecha/plazo).
- PropÃ³sito: costo del adicional de rampas y veredas nuevas.
- Origen -> Destino: metrado/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; revisar #REF! antes de importar (datos de plazo/fecha corruptos).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°17_Relleno de sobre excavaciÃ³n\1. Superado\GP-GCE-FOR-F05-AD NÂ°17 Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°17 Rev.01 (SUPERADO). 2986 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: "RELLENO LOCALIZADO EN SOBRE EXCAVACION" (PTAR PLANTA 5), NÂ°17, 21/03/2026. Resumen (+18 filas). 1. Metrado con Volumen/PARCIAL/TOTAL; Ã­tem 21 "REPARACION DE LOSA" (+15 filas; #REF! cabecera). 2. APU (+11 filas, #REF!). Hoja 8 egresos. Esquema (PLAZO #REF!). CotizaciÃ³n.
- NÃºmeros clave: ninguno legible; #REF! en cabeceras.
- PropÃ³sito: versiÃ³n superada del adicional relleno de sobreexcavaciÃ³n.
- Origen -> Destino: reemplazada por Rev.02.
- AutomatizaciÃ³n: NO cargar como vigente (Superado); histÃ³rico.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°17_Relleno de sobre excavaciÃ³n\GP-GCE-FOR-F05-AD NÂ°17 Rev.02.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°17 Rev.02 (VIGENTE), GP-GCE-FOR-F01/F03. 2400 KB. **Incluye hoja Cronograma.**
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion | 5. Cronograma
- Contenido: denominaciÃ³n cambia a "RELLENO Y COMPACTACION CON MATERIAL DE (prÃ©stamo)" (PTAR PLANTA 5), NÂ°17, 21/03/2026. Resumen (+19 filas). 1. Metrado Ã­tem 21 PTAR M3 (+8 filas, #REF!). 2. APU (+22 filas, #REF!). Hoja 8 egresos. Esquema. CotizaciÃ³n. **5. Cronograma**: calendario diario por dÃ­as (Sem 23-26, abr-2026; +20 filas).
- NÃºmeros clave: ninguno legible; #REF! en cabeceras.
- PropÃ³sito: versiÃ³n vigente; cambia alcance a relleno+compactaciÃ³n con material de prÃ©stamo; agrega cronograma.
- Origen -> Destino: metrado/APU/cronograma -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos; hoja Cronograma -> Cronograma Pro / Curva S; sanear #REF! antes de importar.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°18_ReposiciÃ³n TuberÃ­a PVC 8_\1. Superado\GP-GCE-FOR-F05-AD NÂ°18_ReposiciÃ³n TuberÃ­a PVC 8_Rev.01.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°18 Rev.01 (SUPERADO), GP-GCE-FOR-F01/F03. 1588 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: 'REPOSICION DE TUBERIA PVC 8"' (PTAR PLANTA 5), NÂ°18, 31/03/2026. Resumen (+25 filas). 1. Metrado DIMENSIONES + Vol. (+11 filas). 2. APU (+62 filas, #REF!). Hoja 8 egresos. Esquema. CotizaciÃ³n.
- NÃºmeros clave: ninguno legible; #REF! en APU.
- PropÃ³sito: versiÃ³n superada del adicional reposiciÃ³n de tuberÃ­a PVC 8".
- Origen -> Destino: reemplazada por Rev.02.
- AutomatizaciÃ³n: NO cargar como vigente (Superado); histÃ³rico.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°18_ReposiciÃ³n TuberÃ­a PVC 8_\GP-GCE-FOR-F05-AD NÂ°18_ReposiciÃ³n TuberÃ­a PVC 8_Rev.02.xlsx
- Tipo / formato: xlsx â€” Adicional NÂ°18 Rev.02 (VIGENTE), GP-GCE-FOR-F01/F03. 1599 KB.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido: misma denominaciÃ³n 'REPOSICION DE TUBERIA PVC 8"', NÂ°18, 31/03/2026. Resumen (+25 filas). Metrado (+12 filas). APU (+63 filas, #REF!). Hoja 8 egresos. Esquema. CotizaciÃ³n.
- NÃºmeros clave: ninguno legible; #REF! en APU.
- PropÃ³sito: versiÃ³n vigente del adicional reposiciÃ³n de tuberÃ­a PVC 8".
- Origen -> Destino: metrado/APU -> adicional -> CREDITEX/RO.
- AutomatizaciÃ³n: mÃ³dulo Adicionales/Deductivos (Rev.02 vigente); sanear #REF!.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°19_Losa en Nave de RecuperaciÃ³n\1. Cotizacion\1. Superado\Cotizacion_HDPE_GRAPCO_Detallada (1).pdf
- Tipo / formato: PDF [no-Excel] (carpeta Superado). 130 KB.
- PropÃ³sito: cotizaciÃ³n detallada HDPE (superada) para losa en nave de recuperaciÃ³n â€” sustento del AD-19.
- AutomatizaciÃ³n: adjunto/cotizaciÃ³n proveedor (versiÃ³n superada).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°19_Losa en Nave de RecuperaciÃ³n\1. Cotizacion\cotizacion hdpe.pdf
- Tipo / formato: PDF [no-Excel]. 130 KB.
- PropÃ³sito: cotizaciÃ³n HDPE (vigente) para losa en nave de recuperaciÃ³n â€” sustento del AD-19.
- Origen -> Destino: proveedor HDPE -> sustento del AD-19.
- AutomatizaciÃ³n: adjunto/cotizaciÃ³n proveedor. (En este chunk no aparece el .xlsx del AD-19, solo sus cotizaciones.)

---

## Resumen del chunk

- **CategorÃ­a:** Adicionales y Deductivos (CREDITEX PTARI + NAVE).
- **ADs cubiertos en este chunk:** NÂ°01, 02, 03, 05 (rechazado), 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 (solo cotiz.), 24, 25, 26. **No aparecen deductivos** en este chunk (todo son adicionales; "Deductivos" es solo el nombre de la carpeta).
- **Formatos detectados:** GP-GCE-FOR-F05 (plantilla del adicional), GP-GCE-FOR-F01 (resumen presupuesto/especialidades), PRO-GCE-FOR-F03 (resumen adicional/recursos), PRO-GCE-FOR-F05 (metrados/APU/registro fotogrÃ¡fico/cotizaciÃ³n).
- **Gaps clave para automatizaciÃ³n:** ValorizaciÃ³n de Subcontratistas (F10/F11) y Flujo de Caja (Hoja 8 de egresos semanales) no tienen mÃ³dulo; cotizaciones de proveedor y PDFs de sustento/RFI/PETS no tienen gestor estructurado (van como adjuntos); varios .xlsx tienen #REF! en cabeceras a sanear antes de importar.
- **Pieza mÃ¡s valiosa:** AD-NÂ°12 (Edificio de RecuperaciÃ³n / NAVE) â€” expediente BAC completo con RO interno (Rev.00 S/330,896.64; Rev.01 S/235,236.10) y su metrado estructural (Met.Est_NAVE, 33 hojas).



---

# Categoria 8 - Adicionales y Deductivos (parte 2)

Proyecto: CREDITEX - "PTAR PLANTA 5" / PTAR PLANTA 5 (AV. LOS HORNOS 185, ATE). Contratista GRAPCO SAC, Supervision DISEÃ‘OS RACIONALES. Cliente CREDITEX.

Fichas de los archivos del chunk `cat_8_Adicionales_y_Deductivos__p2.txt`. Los expedientes de adicional/servicio comparten la misma plantilla GP-GCE-FOR-F05 (caratula PRO-GCE-FOR-F03 / APU y esquema GP-GCE-FOR-F01). Por eso varias fichas son estructuralmente identicas y solo cambia la partida adicional.

---

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°19_Losa en Nave de RecuperaciÃ³n\GP-GCE-FOR-F05-AD NÂ°19 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional, plantilla GP-GCE-FOR-F05 (Resumen PRO-GCE-FOR-F03 v0; APU/Esquema/Cotizacion GP-GCE-FOR-F01).
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido:
  - Caratula: ADICIONAL NÂ°19 Rev.01, "LOSA EN NAVE DE RECUPERACION DE AGUAS", fecha 31/03/2026.
  - Resumen (1.- RESUMEN DEL PRESUPUESTO): tabla ITEM / DESCRIPCION / UND / CANT / P.U. (S/.) / PARCIAL (S/.) / TOTAL (S/.) (+47 filas; encabezado visible, totales en celdas no volcadas).
  - 1. Metrado: APU/metrado con factores (0.56, 0.99) por fecha; +16 filas.
  - 2. APU (3.- ANALISIS DE PRECIOS UNITARIOS): ITEM / DESCRIPCION / UND / CUADRILLA / CANTIDAD / PRECIO (S/.) / PARCIAL (S/.) / SUB TOTAL (S/.); +224 filas (APU extenso, partida de losa).
  - Hoja 8: cronograma valorizado de EGRESOS por semana (MESES 1-7, Sem 1 a Sem 24) con desagregado por rubro: Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori, etc. (+15 filas); valores volcados en 0 (formulas no resueltas / #REF!).
  - 3. Esquema: esquema/croquis del adicional (PLAZO #REF! MESES).
  - 4. Cotizacion: hoja de cotizacion de terceros (sin filas de datos volcadas).
- Numeros clave: factores 0.56 y 0.99 (Metrado). Totales del Resumen no aparecen en el volcado (filas resumidas con "+N filas"); varias celdas con #REF!. Plazo #REF!.
- Proposito: sustentar economicamente el adicional NÂ°19 (losa en nave de recuperacion de aguas) - metrado, APU, cronograma de egresos y cotizacion para presentar al cliente/supervision.
- Origen -> Destino: nace de metrado de campo + APU GRAPCO; alimenta el estatus de adicionales (GP-GCE-FOR-F05 ESTATUS) y, si se aprueba, la valorizacion al cliente y el RO.
- Automatizacion: modulo Adicionales/Deductivos de GRAPCO. Ingesta via importador generico in-app de la hoja Resumen (ITEM/UND/CANT/PU/Parcial/Total) como linea de adicional. El APU detallado mapea al concepto de Presupuesto (BAC) si el adicional se incorpora a la linea base; la Hoja 8 (egresos por semana) alimenta Curva S / Flujo de Caja (GAP de Flujo de Caja).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°19_Losa en Nave de RecuperaciÃ³n\GP-GCE-FOR-F05-AD NÂ°19 Rev.02_CANALETA EN ZONA DE RECUPERACION DE AGUAS.xlsx
- Tipo / formato: xlsx - Expediente de adicional, plantilla GP-GCE-FOR-F05 (Rev.02 del AD NÂ°19). Misma plantilla que Rev.01.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido:
  - Caratula: ADICIONAL NÂ°19 Rev.01 (rotulo interno), denominacion cambiada a "CANALETA EN ZONA DE RECUEPERACION DE A[GUAS]"; fecha 31/03/2026. Es la revision que reorienta el alcance de losa a canaleta.
  - Resumen: misma estructura ITEM/.../TOTAL (S/.); +35 filas.
  - 1. Metrado: factores 0.56 / 0.99; +16 filas.
  - 2. APU: ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL; +196 filas.
  - Hoja 8: cronograma de EGRESOS por semana (Sem 1-24), rubros igual al NÂ°19 Rev.01; valores 0/#REF!.
  - 3. Esquema y 4. Cotizacion: croquis y cotizacion (sin filas de datos volcadas).
- Numeros clave: factores 0.56 / 0.99. Totales no volcados (filas resumidas); #REF! en plazo y referencias.
- Proposito: revision 02 del adicional NÂ°19; redefine el alcance (canaleta en vez de losa). Sustento economico para reenvio al cliente.
- Origen -> Destino: metrado/APU GRAPCO revisado; alimenta estatus de adicionales y eventual valorizacion.
- Automatizacion: igual al NÂ°19 Rev.01. En el modulo Adicionales conviene versionar (Rev.01/Rev.02) y dejar solo la vigente como linea valida; importador generico sobre la hoja Resumen.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°20_Cobertura TR4\GP-GCE-FOR-F05-AD NÂ°20 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05.
- Hojas: CarÃ¡tula | Resumen | 1. APU | Hoja 8 | 2. Esquema
- Contenido:
  - Caratula: ADICIONAL NÂ°20 Rev.01, "ADICIONAL COBERTURA TR4", fecha 08/05/2026.
  - Resumen: tabla ITEM/.../TOTAL (S/.); +11 filas (adicional pequeÃ±o).
  - 1. APU: ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL; +5 filas (APU corto).
  - Hoja 8: cronograma de EGRESOS por semana (Sem 1-24), mismos rubros; valores 0/#REF!.
  - 2. Esquema: croquis (PLAZO #REF!).
- Numeros clave: no hay totales explicitos en el volcado (filas resumidas); plazo #REF!.
- Proposito: sustentar el adicional NÂ°20 (cobertura TR4).
- Origen -> Destino: APU GRAPCO; alimenta estatus de adicionales y valorizacion si se aprueba.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°20_Cobertura TR4\GP-GCE-FOR-F05-AD NÂ°20 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (Rev.02 del NÂ°20). Volcado identico a la Rev.01 (mismas hojas, mismos encabezados, misma fecha 08/05/2026, mismo +11 / +5 filas).
- Hojas: CarÃ¡tula | Resumen | 1. APU | Hoja 8 | 2. Esquema
- Contenido: igual al NÂ°20 Rev.01 (cobertura TR4). El rotulo interno sigue diciendo Rev.01 en algunas celdas; es la version controlada Rev.02 del expediente.
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: revision 02 del adicional NÂ°20 (cobertura TR4).
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; versionar y conservar solo la vigente; importador generico.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°21_Barandas en Techo\GP-GCE-FOR-F05-ADICIONAL NÂ°21 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05.
- Hojas: CarÃ¡tula | Resumen | 2. APU | 3. Esquema | Hoja 8
- Contenido:
  - Caratula: ADICIONAL NÂ°21 Rev.01, "ADICIONAL BARANDAS METALICAS EN LOSA D[E TECHO]", fecha 13/05/2026.
  - Resumen: ITEM/.../TOTAL (S/.); +16 filas.
  - 2. APU: ITEM/.../SUB TOTAL; +5 filas (APU corto, partida de barandas metalicas).
  - 3. Esquema: croquis (PLAZO #REF!).
  - Hoja 8: cronograma de EGRESOS por semana (Sem 1-24), rubros estandar; valores 0/#REF!.
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: sustentar el adicional NÂ°21 (barandas metalicas en losa de techo).
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°21_Barandas en Techo\GP-GCE-FOR-F05-ADICIONAL NÂ°21 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (Rev.02 del NÂ°21). Volcado identico a la Rev.01 (mismas hojas, fecha 13/05/2026, +16 / +5 filas).
- Hojas: CarÃ¡tula | Resumen | 2. APU | 3. Esquema | Hoja 8
- Contenido: igual al NÂ°21 Rev.01 (barandas metalicas en losa de techo). Archivo mas pesado (1285 KB vs 615 KB) por imagenes/croquis en el esquema.
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: revision 02 del adicional NÂ°21.
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; versionar; importador generico.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°22_Barandas en Nave\1. Superado\Copia de GP-GCE-FOR-F05-AD NÂ°21 Rev.01.2.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (copia de trabajo SUPERADA/obsoleta; carpeta "1. Superado"). Rotulo interno aun NÂ°21.
- Hojas: CarÃ¡tula | Resumen | 2. APU | Hoja 8 | 3. Esquema | 4. Cotizacion
- Contenido:
  - Caratula: ADICIONAL NÂ°21 Rev.01, "ADICIONAL BARANDAS", fecha 11/05/2026 (copia que dio origen al AD NÂ°22 Barandas en Nave).
  - Resumen: ITEM/.../TOTAL (S/.); +16 filas.
  - 2. APU: ITEM/.../SUB TOTAL; +5 filas.
  - Hoja 8: cronograma de EGRESOS por semana; valores 0/#REF!.
  - 3. Esquema y 4. Cotizacion: croquis y cotizacion (sin filas de datos volcadas).
- Numeros clave: sin totales explicitos; #REF! en plazo.
- Proposito: borrador/copia previa (superada) del adicional de barandas en nave; conservada como historico.
- Origen -> Destino: copia de trabajo; reemplazada por GP-GCE-FOR-F05-AD NÂ°22 Rev.01.
- Automatizacion: NO ingerir (esta en "1. Superado"). En GRAPCO marcar como version obsoleta; solo tomar la vigente (AD NÂ°22 Rev.01).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°22_Barandas en Nave\GP-GCE-FOR-F05-AD NÂ°22 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05 (vigente del NÂ°22).
- Hojas: CarÃ¡tula | Resumen | 2. APU | Hoja 8 | 3. Esquema
- Contenido:
  - Caratula: ADICIONAL NÂ°22 Rev.01, "ADICIONAL BARANDAS METALICAS", fecha 13/05/2026.
  - Resumen: ITEM/.../TOTAL (S/.); +16 filas.
  - 2. APU: ITEM/.../SUB TOTAL; +5 filas (partida barandas metalicas).
  - Hoja 8: cronograma de EGRESOS por semana; valores 0/#REF!.
  - 3. Esquema: croquis (PLAZO #REF!).
- Numeros clave: sin totales explicitos en el volcado; #REF! en plazo.
- Proposito: sustentar el adicional NÂ°22 (barandas metalicas en nave).
- Origen -> Destino: APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\1. Adicionales\AD-NÂ°23_Losa en Nave\GP-GCE-FOR-F05-AD NÂ°23 Rev.01.xlsx
- Tipo / formato: xlsx - Expediente de adicional GP-GCE-FOR-F05.
- Hojas: CarÃ¡tula | Resumen | 1. Metrado | 2. APU | Hoja 8 | 3. Esquema
- Contenido:
  - Caratula: ADICIONAL NÂ°23 Rev.01, "LOSA EN ZONA DE NAVE DE RECUPERACION", fecha 31/03/2026.
  - Resumen: ITEM/.../TOTAL (S/.); +14 filas.
  - 1. Metrado: hoja de metrado con factores 0.56 / 0.99; +6 filas (encabezados OBRA/CONTRATISTA vacios en este caso).
  - 2. APU: ITEM/.../SUB TOTAL; +224 filas (APU extenso, partida de losa - similar al NÂ°19 Rev.01).
  - Hoja 8: cronograma de EGRESOS por semana; valores 0/#REF!.
  - 3. Esquema: croquis (PLAZO en blanco / MESES).
- Numeros clave: factores 0.56 / 0.99 (Metrado). Sin totales explicitos en el volcado.
- Proposito: sustentar el adicional NÂ°23 (losa en zona de nave de recuperacion). Relacionado tematicamente con el NÂ°19 (misma zona).
- Origen -> Destino: metrado de campo + APU GRAPCO; estatus de adicionales / valorizacion.
- Automatizacion: modulo Adicionales/Deductivos; importador generico sobre Resumen; APU a Presupuesto si se incorpora.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-NÂ°01_Adicional de DiseÃ±o\20514824500-01-F001-5624.pdf
- Tipo / formato: PDF [no-Excel]. Nombre tipo comprobante electronico SUNAT (RUC 20514824500, serie F001, correlativo 5624).
- Proposito: factura/comprobante de respaldo del servicio SE-NÂ°01 (Adicional de DiseÃ±o Arquitectura). Sustento de gasto del servicio adicional.
- Origen -> Destino: emitido por proveedor de diseÃ±o; respalda el servicio enviado al cliente y el registro de costo real.
- Automatizacion: GAP de ingesta automatica de PDF. Adjuntar como soporte documental en el modulo Adicionales/Deductivos (servicios); el monto se carga manualmente desde el F05-SE NÂ°01.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-NÂ°01_Adicional de DiseÃ±o\GP-GCE-FOR-F05-SE NÂ°01 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de SERVICIO adicional GP-GCE-FOR-F05 (Resumen PRO-GCE-FOR-F03; APU/Cotizacion PRO-GCE-FOR-F05).
- Hojas: CarÃ¡tula | Resumen | 1. APU | 2. CotizaciÃ³n
- Contenido:
  - Caratula: SERVICIO NÂ°01 Rev.01, "ADICIONAL DE DISEÃ‘O ARQUITECTURA", fecha 09/12/2025.
  - Resumen (1.- PRECIO UNITARIO): ITEM/DESCRIPCION/UND/CANTIDAD/P.U. (S/.)/PARCIAL (S/.)/TOTAL (S/.); PLAZO 7 DIAS; +10 filas.
  - 1. APU (ANALISIS DE PRECIO UNITARIO - MANO DE OBRA): partida "ADICIONAL DE DISEÃ‘O ARQUITECTURA", UND GLB, sub total **3500** (S/.); +3 filas.
  - 2. CotizaciÃ³n: hoja de cotizacion del servicio (sin filas de datos volcadas).
- Numeros clave: **P.U. servicio S/ 3,500 (GLB)** (APU); plazo 7 dias. (Nota: el estatus de servicios registra SE-01 con subtotal 3675 = 3500 + ~5% u/gg).
- Proposito: sustentar el servicio adicional NÂ°01 (diseÃ±o de arquitectura) - monto y alcance para cobro al cliente.
- Origen -> Destino: cotizacion de diseÃ±o; alimenta el estatus de servicios (GP-GCE-FOR-F05 ESTATUS SERVICIOS) y valorizacion.
- Automatizacion: modulo Adicionales/Deductivos (sub-tipo Servicios); importador generico sobre Resumen/APU (linea GLB S/3500).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-NÂ°02_Derecho de tramite municipal por verificaciÃ³n tÃ©cnica\Carta municipalidad inicio obra.pdf
- Tipo / formato: PDF [no-Excel].
- Proposito: carta de la municipalidad de inicio de obra; sustento documental del derecho de tramite municipal por verificacion tecnica (servicio SE-NÂ°02).
- Origen -> Destino: municipalidad de Ate; respalda el servicio SE-NÂ°02 ante el cliente.
- Automatizacion: GAP de ingesta de PDF. Adjuntar como soporte en el modulo Adicionales/Deductivos (servicios).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\2. Enviados (S)\2. Servicios\SE-NÂ°02_Derecho de tramite municipal por verificaciÃ³n tÃ©cnica\GP-GCE-FOR-F05-SE NÂ°02 Rev.02.xlsx
- Tipo / formato: xlsx - Expediente de SERVICIO adicional GP-GCE-FOR-F05 (Resumen PRO-GCE-FOR-F03; APU/Cotizacion PRO-GCE-FOR-F05).
- Hojas: CarÃ¡tula | Resumen | 1. APU | 2. CotizaciÃ³n
- Contenido:
  - Caratula: SERVICIO NÂ°02 Rev.01, "ADICIONAL DE DERECHO DE TRAMITE MUNICI[PAL]", fecha 17/12/2025.
  - Resumen (1.- PRECIO UNITARIO): ITEM/DESCRIPCION/UND/CANTIDAD/P.U./PARCIAL/TOTAL (S/.); +10 filas.
  - 1. APU: partida "DERECHO DE TRAMITE MUNICIPAL POR VERIF[ICACION]", UND VISITA, sub total **356.40** (S/.); +3 filas.
  - 2. CotizaciÃ³n: hoja de cotizacion (sin filas de datos volcadas).
- Numeros clave: **P.U. S/ 356.40 por VISITA** (APU). (Nota: estatus de servicios registra SE-02 con subtotal 4490.64 -> implica varias visitas/cantidad.)
- Proposito: sustentar el servicio adicional NÂ°02 (derecho de tramite municipal por verificacion tecnica).
- Origen -> Destino: cotizacion/tarifa municipal; alimenta el estatus de servicios y valorizacion.
- Automatizacion: modulo Adicionales/Deductivos (Servicios); importador generico sobre Resumen/APU (linea VISITA S/356.40 x cantidad).

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\GP-GCE-FOR-F05_ESTATUS ADICIONALES CREDITEX.xlsx
- Tipo / formato: xlsx - REGISTRO DE CONTROL maestro de adicionales (formato GP-GIN-FOR-F05 Rev.01). Es el tablero de seguimiento de todos los adicionales.
- Hojas: Resumen | Aprobacion (vacia) | Leyenda (vacia) | Hoja 1
- Contenido:
  - Resumen (ESTATUS DE ADICIONALES, PTAR PLANTA 5 - CREDITEX): factores GG 0.26 y U 0.09. Columnas: COD. / FRENTE / CD / GG / U / SUBTOTAL GRAPCO (S/IGV) / REVISION SUP. (S/IGV) / ESTADO DE EJECUCION / ESTADO DEL ADICIONAL / FACTURADO A LA FECHA / ABONO / TIPO / COMENTARIO. Filas visibles:
    - AD-01 CERCO INTERIOR CAMPAMENTO: CD 5187.78, GG 1373.14, U 466.90, SUBTOTAL 7027.82, REV.SUP 7027.82, EJECUTADO/APROBADO, FACTURADO 7027.82, ABONADO.
    - AD-02 INST. PUERTA METALICA Y ACCESO: CD 3859.83, GG 1021.65, U 347.38, SUBTOTAL 5228.87, REV.SUP 5228.86, EJECUTADO/APROBADO, FACTURADO 5228.86, ABONADO.
    - AD-03 CERCO INTERNO EN T. EXISTENTES: CD 3721.61, GG 985.07, U 334.94, SUBTOTAL 5041.62, REV.SUP 5041.61, EJECUTADO/APROBADO, FACTURADO 5041.61, ABONADO.
    - AD-04 ADICIONAL DE DISEÃ‘O: ANULADO (montos 0). (+18 filas mas no volcadas).
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
- Origen -> Destino: consolida los expedientes individuales GP-GCE-FOR-F05-AD NÂ°xx; alimenta el RO (adicionales aprobados) y el control de cobranza/valorizaciones.
- Automatizacion: ALTA prioridad. Importar la hoja Resumen al modulo Adicionales/Deductivos como tabla maestra (COD/FRENTE/CD/GG/U/Subtotal/EstadoEjecucion/EstadoAdicional/Facturado/Abono). Vincular con RO (adicionales aprobados al precio de venta) y con seguimiento de cobranza (facturado vs abonado = GAP Flujo de Caja). Importador generico in-app aplicable.

### \05. GestiÃ³n Costos\8. Adicionales y Deductivos\GP-GCE-FOR-F05_ESTATUS SERVICIOS CREDITEX.xlsx
- Tipo / formato: xlsx - REGISTRO DE CONTROL maestro de servicios adicionales (formato GP-GIN-FOR-F05 Rev.01).
- Hojas: Resumen | Aprobacion (vacia) | Hoja 1
- Contenido:
  - Resumen (ESTATUS DE SERVICIOS, PTAR PLANTA 5 - CREDITEX): COD. / FRENTE / SUBTOTAL GRAPCO (S/IGV) / REVISION SUPERVISION (S/IGV) / ESTADO DE EJECUCION / ESTADO DEL ADICIONAL / FACTURADO A LA FECHA / ABONO / TIPO / COMENTARIO. Filas:
    - SE-01 ADICIONAL DE DISEÃ‘O: SUBTOTAL 3675, EJECUTADO / PENDIENTE, FACTURADO 0, ABONO PENDIENTE.
    - SE-02 DERECHO DE TRAMITE MUNICIPAL POR VERIF: SUBTOTAL 4490.64, EJECUTADO / PENDIENTE, FACTURADO 0, ABONO PENDIENTE.
    - Fila total: SUBTOTAL **8165.64**, REVISION SUPERVISION 0, FACTURADO 0.
  - Hoja 1: mismo listado de frentes/adicionales que el archivo ESTATUS ADICIONALES (AD-24..AD-43); aparenta ser hoja duplicada/heredada de la plantilla.
  - Aprobacion: vacia.
- Numeros clave: SE-01 S/ 3,675; SE-02 S/ 4,490.64; **TOTAL servicios S/ 8,165.64 (S/IGV)**; revision supervision S/ 0 y facturado S/ 0 (ambos servicios EJECUTADOS pero PENDIENTES de aprobacion/cobro).
- Proposito: control del estado de los servicios adicionales (diseÃ±o y tramites) - ejecutado, pendiente de aprobacion supervision, sin facturar ni abonar.
- Origen -> Destino: consolida los F05-SE NÂ°01/NÂ°02; alimenta RO (servicios aprobados) y cobranza.
- Automatizacion: ALTA prioridad. Importar Resumen al modulo Adicionales/Deductivos (sub-tipo Servicios); vincular SE-01/SE-02 con sus expedientes y con seguimiento facturado/abono (GAP Flujo de Caja). Importador generico in-app aplicable.

---

## Notas transversales
- Todos los expedientes AD NÂ°19..NÂ°23 y SE NÂ°01/NÂ°02 comparten la plantilla GP-GCE-FOR-F05 (caratula PRO-GCE-FOR-F03 v0; APU y esquema GP-GCE-FOR-F01; APU de servicios PRO-GCE-FOR-F05). Los formularios maestros de estatus usan GP-GIN-FOR-F05 Rev.01.
- Los totales por partida de cada expediente individual NO se ven en el volcado (filas resumidas como "+N filas" y abundantes #REF!). Los montos consolidados confiables estan en los dos archivos de ESTATUS (adicionales y servicios) y en la Hoja 1 (frentes).
- La "Hoja 8" de cada expediente es un cronograma valorizado de egresos por semana (Sem 1-24, 7 meses) por rubro (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori, etc.) -> insumo natural para Curva S / Flujo de Caja, pero en estos archivos sale en 0/#REF! (formulas sin resolver).
- Factores de markup usados: GG 0.26 y Utilidad 0.09 sobre CD (segun ESTATUS ADICIONALES).



---

# CATEGORIA 9 â€” Flujo de Caja (CREDITEX PTARI / PTAR Planta 5)

Fichas detalladas por archivo del chunk `cat_9_Flujo_de_Caja.txt`.

---

### \05. GestiÃ³n Costos\9. Flujo de Caja\1. FC Banco BCP\Flujo de caja 14.01.26.xlsx
- **Tipo / formato:** Excel (.xlsx, 135 KB). Sin cÃ³digo GP/PRO en el volcado (flujo de caja "bancario" interno, no formato oficial).
- **Hojas:** `Hoja1` | `Hoja2`.
- **Contenido:**
  - **Hoja1 (A7:O34) â€” FLUJO DE CAJA (Soles):** matriz de EGRESOS por descripciÃ³n y por quincena (1Q / 2Q) de ENERO a MAYO. Columnas: `Descripcion | Monto (total) | ENERO 1Q | ENERO 2Q | FEBRERO 1Q | 2Q | MARZO 1Q | 2Q | ABRIL 1Q | 2Q | MAYO 1Q | 2Q`. LÃ­neas de egreso: `EGRESOS` (fila resumen), `Materiales / Proveedores / Subcontratistas`, `Planilla obreros`, `Planilla staff`, `Plame`, `IGV` (+12 filas no volcadas, presumiblemente mÃ¡s conceptos de egreso e ingresos/saldo de caja).
  - **Hoja2 (A3:H9) â€” comparativo Venta vs Costo por mes** (Eneroâ€“Mayo). Columnas: `Venta con IGV | Sin IGV | IGV` y `Costo con IGV | Sin IGV | IGV` y `Dif IGV`. Es un cuadre de IGV venta vs IGV costo (saldo a favor/pagar de IGV mensual).
- **NÃºmeros clave:**
  - EGRESOS total: **S/ 2,673,937.29**.
  - Materiales/Proveedores/Subcontratistas: **S/ 1,530,000**.
  - Planilla obreros: **S/ 481,200** Â· Planilla staff: **S/ 245,800** Â· Plame: **S/ 184,700** Â· IGV: **S/ 194,000**.
  - Egreso quincenal mayor: ENERO 2Q **S/ 459,750** y FEBRERO 2Q **S/ 469,604.24**.
  - Hoja2 IGV: Venta con IGV mensual 728/830/640/610/190 (en miles, escala reducida); Dif IGV Enero 66.66, Feb 38.14, Mar 31.12, Abr 72.46, May 15.56.
- **PropÃ³sito:** Flujo de caja gerencial/bancario (BCP): proyecciÃ³n de egresos quincenales por naturaleza (materiales, planillas, PLAME, IGV) y cuadre IGV venta-costo para gestiÃ³n de tesorerÃ­a y liquidez.
- **Origen -> Destino:** Origen = presupuesto + cronograma de pagos a proveedores/planillas; cuadre IGV desde valorizaciones (venta) y compras (costo). Destino = planeaciÃ³n de tesorerÃ­a / requerimiento de financiamiento bancario.
- **AutomatizaciÃ³n:** **GAP â€” Flujo de Caja** (no existe mÃ³dulo). Ingerir vÃ­a importador genÃ©rico a un futuro mÃ³dulo "Flujo de Caja / TesorerÃ­a": egresos por naturaleza x quincena, e IGV venta-costo. Parcialmente alimentable desde RO (costos por naturaleza MO/MAT/EQH/SC) e ISP (planillas HH x S/25.5).

---

### \05. GestiÃ³n Costos\9. Flujo de Caja\GP-GCE-FOR-F07_FLUJO CAJA PTARI CREDITEX 2026.02.01.xlsx
- **Tipo / formato:** Excel (.xlsx, 1335 KB). CÃ³digo oficial **GP-GCE-FOR-F07** (formato Flujo de Caja). Internamente las hojas de presupuesto/APU usan **GP-GCE-FOR-F01** y GG usa **PRO-GCE-FOR-F03**. Es el libro maestro de flujo de caja con todo el sustento (presupuesto + Curva S + APU + RO embebidos).
- **Hojas (15):** `CarÃ¡tula` | `Flujo de Caja` | `Curva S` | `PPTO` | `1. PRE` | `2. PRO` | `3. MOV` | `4. EST` | `5. ARQ` | `7. GG` | `Hoja 8` | `APU Contractual` | `RO` | `A. Partidas` | `A. Recursos`.
- **Contenido:**
  - **CarÃ¡tula:** "PTAR PLANTA 5", AV. LOS HORNOS 185, ATE; "FLUJO DE CAJA PTAR PLANTA 5 - CREDITEX"; RevisiÃ³n NÂ°01; fecha 28/12/2025.
  - **Flujo de Caja (B1:N65):** "FLUJO DE DESEMBOLSOS - PTAR PLANTA 5". Columnas: `ITEM (DESEMBOLSO n) | FECHA DE PAGO | SIN IGV | ACUM TOTAL S/IGV | ACUM TOTAL C/IGV`. Cronograma de desembolsos quincenales del 15/12/2025 al 31/03/2026 (+38 filas con mÃ¡s desembolsos).
  - **Curva S (C1:GJ968):** cronograma valorizado diario por partida. Columnas: `ID | CREDITEX (descripciÃ³n) | UND | METRADO | PU | SECTORES | SECTOR | CONTROL` + columnas diarias desde lun 03/11/2025 (Sem 1..) hasta ~57+ dÃ­as, con metrado/parcial distribuidos por dÃ­a. Partidas nivel N1 CISTERNA, N2 PRELIMINARES, N3 SSO, y PRE1 (alquiler andamios) con distribuciÃ³n diaria.
  - **PPTO (B1:W1031):** "PPTO REAL", GP-GCE-FOR-F01 v0, OBRA "PTAR PLANTA 5", CLIENTE CREDITEX, CONTRATISTA GRAPCO SAC, SUPERVISIÃ“N DISEÃ‘OS RACIONALES, PLAZO 4.50 MESES. "1.- RESUMEN DEL PRESUPUESTO": ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. | PARCIAL | TOTAL.
  - **1. PRE / 2. PRO / 3. MOV / 4. EST / 5. ARQ:** presupuestos por especialidad (Preliminares, Provisionales, Movimiento de Tierras, Estructuras, Arquitectura), formato GP-GCE-FOR-F01. Columnas: `ITEM | DESCRIPCIÃ“N | UND | CANT | P.U. | PARCIAL | SUBTOTAL | TOTAL | INCIDENCIAS (MO/MAT/EQH/SC) | MONTOS (MO/MAT/EQH/SC)`. La hoja **4. EST** aÃ±ade columnas MANO DE OBRA: `IP | HH | MONTO | COSTO PROM`. Plazo EST = 130 dÃ­as calendario.
  - **7. GG (A1:M1038):** "ANÃLISIS DE GASTOS GENERALES", PRO-GCE-FOR-F03 v1, pÃ¡gina 8 de 10 (+131 filas de detalle de GG).
  - **Hoja 8 (B5:AE30):** flujo por semanas. `Descripcion | Parcial | MESES (1..7) â†’ Sem 1..Sem 24`. Filas: VIENEN, EGRESOS, Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori (+15 filas). Valores volcados en 0 (plantilla/parcialmente vacÃ­a en lo visible).
  - **APU Contractual (B1:S3325):** anÃ¡lisis de precios unitarios completo, GP-GCE-FOR-F01, "PPTO PTAR CREDITEX", fecha 24/06/2025. Columnas: `ITEM | DESCRIPCIÃ“N | UND | CUADRILLA | CANTIDAD | PRECIO | PARCIAL | SUB TOTAL` (+1916 filas â€” APU Ã­ntegro).
  - **RO (B1:J1000):** Resultado Operativo embebido. `FRENTE | PARTIDA | DescripciÃ³n | Ppto F1 PTARI S/. | Control`. TOTAL COSTO DE OBRA, COSTO DIRECTO, y partidas PRE/PRE1/PRE2 (+62 filas).
  - **A. Partidas (C1:M952):** anÃ¡lisis por partidas CONTRACTUAL (1) vs FASEO (2) vs DELTA (1-2). Columnas PARCIAL/TOTAL por cada uno.
  - **A. Recursos (C1:N952):** anÃ¡lisis por recursos CONTRACTUAL vs REAL, desglose MO/MAT/EQH/SC con incidencias.
- **NÃºmeros clave:**
  - Desembolsos (SIN IGV): D1 222,159.95 Â· D2 162,593.57 Â· D3 325,540.04 Â· D4 708,659.80 Â· D5 505,524.50 Â· D6 334,119.87 Â· D7 98,394.64 Â· D8 80,564.86.
  - ACUM TOTAL S/IGV al D8: **S/ 2,437,557.22**; ACUM TOTAL C/IGV al D8: **S/ 2,876,317.52**.
  - RO: TOTAL COSTO DE OBRA **S/ 2,276,183.77**; COSTO DIRECTO **S/ 1,793,038.35**.
  - Partidas: TRABAJOS PRELIMINARES 182,704.14 (SSO 51,152.49 Â· TopografÃ­a 41,113.36 Â· Acarreo 50,438.29 Â· DiseÃ±o 40,000); DELTA contractual-faseo = 0.
  - A. Recursos â€” incidencias CD: MO 0.22 / MAT 0.47 / EQH 0.08 / SC 0.23; montos MO 386,627.58 Â· MAT 840,604.83 Â· EQH 144,961.11 Â· SC 420,844.82 â†’ CD 1,793,038.35.
  - Cisterna N1 = 1,793,038.35 (= costo directo, la cisterna es el grueso de la obra).
- **PropÃ³sito:** Libro maestro de Flujo de Caja oficial (F07): cronograma de desembolsos (cobranza al cliente) con/ sin IGV, sustentado por presupuesto contractual, APU, Curva S, RO y anÃ¡lisis partidas/recursos. Base del control de liquidez y de la valorizaciÃ³n proyectada.
- **Origen -> Destino:** Origen = presupuesto contractual (F01) + APU + Curva S + RO. Destino = proyecciÃ³n de desembolsos/cobranzas y control de avance valorizado vs caja.
- **AutomatizaciÃ³n:** **GAP â€” Flujo de Caja** como mÃ³dulo dedicado. Sus insumos SÃ mapean a mÃ³dulos existentes: PPTO/1.PRE..5.ARQ â†’ **Presupuesto (BAC)**; APU Contractual â†’ plataforma Costos (APU fuera de GRAPCO); Curva S â†’ **Curva S (F07)**; RO/A.Partidas/A.Recursos â†’ **Resultado Operativo (RO/CR/F06 + EVM)**; 7. GG â†’ GG del RO. El cronograma de DESEMBOLSOS y la Hoja 8 (egresos por semana) son la pieza nueva a importar en un futuro importador de Flujo de Caja/TesorerÃ­a.

---

### \05. GestiÃ³n Costos\9. Flujo de Caja\GP-GCE-FOR-F07_FLUJO CAJA PTARI CREDITEX 2026.03.12.xlsx
- **Tipo / formato:** Excel (.xlsx, 39 KB). CÃ³digo oficial **GP-GCE-FOR-F07**. VersiÃ³n actualizada al 12/03/2026 (flujo real/seguimiento, mucho mÃ¡s liviano: solo la hoja de flujo).
- **Hojas (1):** `FLUJO DE CAJA`.
- **Contenido:**
  - **FLUJO DE CAJA (B1:O1014):** flujo de caja con seguimiento semanal real. Columnas: `Total | Control | Val. Acum al 28/02/26 | Semana 18 (07/03) | Sem 19 (14/03) | Sem 20 (21/03) | Sem 21 (28/03) | Sem 22 (04/04) | Sem 23 (11/04)`. Filas: `DELTA`, `Egresos`, `Adelanto de obra`, `AmortizaciÃ³n`, `ValorizaciÃ³n (CD + GG)`, `% Avance Acumulado`, `% Avance Semanal`, `CD` (+17 filas con mÃ¡s detalle de costo/avance).
- **NÃºmeros clave:**
  - ValorizaciÃ³n (CD + GG) Total: **S/ 2,166,997.56**; CD Total: **S/ 1,713,447.90**.
  - Val. Acum al 28/02/26: 1,570,423.13 (CD acum 1,241,735.69).
  - Adelanto de obra: **S/ 200,000**; AmortizaciÃ³n: -200,000 (en 3 cuotas de -66,666.67 en Sem 20-22).
  - % Avance Acumulado: 0.72 (28/02) â†’ 0.80 â†’ 0.86 â†’ 0.93 â†’ 0.98 â†’ 0.99 â†’ 1.00.
  - % Avance Semanal: 0.72 / 0.07 / 0.07 / 0.06 / 0.06 / 0.01 / 0.01.
  - DELTA semanal: +90,746.21 / -43,278.06 / -36,120.56 / -5,177.18 / -5,965.41 / +4,654.59.
  - Egresos semanales: 162,524.82 / 74,188.17 / 64,003.29 / 52,518.20 / 21,669.98 / 21,669.98.
- **PropÃ³sito:** Seguimiento real del flujo de caja por semana del proyecto (Sem 18â€“23): valorizaciÃ³n CD+GG vs egresos, adelanto y su amortizaciÃ³n, DELTA (caja neta) y % de avance acumulado/semanal. Control vivo de liquidez vs avance.
- **Origen -> Destino:** Origen = valorizaciones aprobadas (venta CD+GG) + egresos reales + cronograma de amortizaciÃ³n del adelanto. Destino = control de DELTA de caja semanal y cierre proyectado (avance llega a 100% en Sem 23 / 11-04-2026).
- **AutomatizaciÃ³n:** **GAP â€” Flujo de Caja** (mÃ³dulo dedicado). Insumos mapeables: ValorizaciÃ³n (CD+GG) â†’ **Valorizaciones (cliente)**; CD/avance â†’ **RO + Curva S (F07)** usando `obtenerSemana` (semanas del proyecto, S18=28/02..). La lÃ³gica nueva (adelanto, amortizaciÃ³n, DELTA de caja, egresos reales semanales) es lo que falta y deberÃ­a implementarse en el importador/mÃ³dulo de Flujo de Caja, ligado a la numeraciÃ³n de semanas LPS.



---

# Categoria 12 - Fisico Valorizado Semanal

Chunk de catalogo de costos (proyecto CREDITEX - PTAR PLANTA 5). Contiene 3 archivos: dos libros maestros de Curva S (formato GP-GCE-FOR-F07) y un borrador suelto. Los dos libros F07 son practicamente identicos en estructura (17 hojas cada uno): integran Presupuesto + APU + Curva S programada/ejecutada + Flujo de Caja + RO en un solo workbook. Son la fuente del fisico valorizado semanal.

---

### \05. GestiÃ³n Costos\12. Fisico Valorizado Semanal\1. Superado\Copia de GP-GCE-FOR-F07_CURVA S PTARI CREDITEX.xlsx
- Tipo / formato: xlsx. Codigo principal **GP-GCE-FOR-F07** (Curva S). Internamente reusa formatos GP-GCE-FOR-F01 (Presupuesto/APU) y PRO-GCE-FOR-F03 (Gastos Generales). Carpeta "1. Superado" = version antigua/reemplazada.
- Hojas (17): Curva S Resumen | Curva S Programado | CarÃ¡tula | Flujo de Caja | Curva S | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 7. GG | Hoja 8 | APU Contractual | RO | A. Partidas | A. Recursos
- Contenido por hoja relevante:
  - **Curva S Resumen**: tabla semanal con columnas PROGRAMADO (CD Semanal, %, CD Acumulado, % Programado) y EJECUTADO (CD Semanal, %, CD Acumulado, % Ejecutado). Arranca en SEMANA 6 (CD acum 173,910.25 prog / 179,046.99 ejec, ambos 9%) y avanza hasta ~semana 18 (+11 filas). Es el corazon del avance fisico valorizado.
  - **Curva S Programado** y **Curva S** (detalle): matriz partida (ID, descripcion, UND, METRADO, PU) x dias calendario (col por dia, inicio Lun 03 Nov 2025), agrupada por meses 1-12 y semanas 1-57. Niveles N1 CISTERNA / N2 PRELIMINARES / N3 SEGURIDAD Y SALUD. Incluye sectorizacion (SECTORES, SECTOR, CONTROL) y valor diario por partida (ej. PRE1 alquiler andamios 199.60). ~228 / ~120 filas.
  - **CarÃ¡tula**: PTAR PLANTA 5, AV. LOS HORNOS 185 ATE, "FLUJO DE CAJA PTAR PLANTA 5 - CREDITEX", Revision NÂ°01, fecha 28 Dic 2025.
  - **Flujo de Caja**: cronograma de DESEMBOLSOS 1..8+ con FECHA DE PAGO, SIN IGV, ACUM TOTAL S/IGV, ACUM TOTAL C/IGV (+38 filas). Desembolso 1 = 222,159.95 (15 Dic 2025); acumulado a Desembolso 8 = 2,437,557.22 s/IGV / 2,876,317.52 c/IGV (31 Mar 2026).
  - **PPTO**: caratula de presupuesto (formato F01) + "1.- RESUMEN DEL PRESUPUESTO" con ITEM/DESCRIPCION/UND/CANT/PU/PARCIAL/TOTAL (+12 filas). Plazo 4.50 MESES.
  - **1. PRE / 2. PRO / 3. MOV / 4. EST / 5. ARQ**: presupuestos por especialidad (Preliminares, Obras Provisionales, Movimiento de Tierras, Estructuras, Arquitectura). Columnas: ITEM, DESCRIPCION, UND, CANT, PU, PARCIAL, SUBTOTAL, TOTAL + bloque INCIDENCIAS (MO/MAT/EQH/SC en %) + MONTOS (MO/MAT/EQH/SC en S/.). La hoja 4.EST agrega bloque MANO DE OBRA (IP, HH, MONTO, COSTO PROM) y plazo 130 dias calendario.
  - **7. GG**: Gastos Generales (formato PRO-GCE-FOR-F03), "4.- ANALISIS DE GASTOS GENERALES", A. Caracteristicas (+131 filas).
  - **Hoja 8**: matriz EGRESOS por semana (Sem 1..Sem 24) por concepto (Trabajos Preliminares, Obras Provisionales, SC Mov. de tierras, SC Encofrado Cori...); valores en 0 (plantilla de flujo no llenada).
  - **APU Contractual**: analisis de precios unitarios (formato F01) con ITEM/DESCRIPCION/UND/CUADRILLA/CANTIDAD/PRECIO/PARCIAL/SUB TOTAL + columna ANALISIS DE DATA (+1916 filas). Fecha 24 Jun 2025, "PPTO PTAR CREDITEX".
  - **RO**: Resultado Operativo presupuestal por FRENTE/PARTIDA/Descripcion, columna "Ppto F1 PTARI S/." y "Control" (+62 filas). TOTAL COSTO DE OBRA = 2,276,183.77; COSTO DIRECTO = 1,793,038.35; PRE Trabajos Preliminares = 182,704.14; SSO = 51,152.49; Topografia = 41,113.36.
  - **A. Partidas**: analisis por partida CONTRACTUAL (1) vs FASEO (2) vs DELTA (1-2). Trabajos Preliminares 182,704.14 (delta 0), SSO 51,152.49, Topografia 41,113.36, Acarreo materiales 50,438.29, DiseÃ±o 40,000 (+36 filas).
  - **A. Recursos**: analisis por recurso CONTRACTUAL vs REAL con desglose MO/MAT/EQH/SC y DELTA. Incidencias globales MO 0.22 / MAT 0.47 / EQH 0.08 / SC 0.23. PPTO total: MO 386,627.58 / MAT 840,604.83 / EQH 144,961.11 / SC 420,844.82 = 1,793,038.35 (+37 filas).
- Numeros clave: TOTAL COSTO DE OBRA 2,276,183.77 | COSTO DIRECTO 1,793,038.35 | Curva S CISTERNA (N1) 3,204,660.29 en esta version (difiere de la hoja "Curva S" interna 1,793,038.35) | Flujo de caja acum c/IGV 2,876,317.52 | Avance sem 6 = 9% prog / 9% ejec.
- Proposito: control integral del fisico valorizado semanal: compara avance programado vs ejecutado (Curva S), liga presupuesto-APU-RO y proyecta desembolsos (flujo de caja). Es el tablero semanal de costo directo de la PTARI.
- Origen -> Destino: sale del presupuesto contractual (F01/APU) + metrados de campo y tareos semanales; alimenta el RO, la Curva S de avance y el flujo de caja del proyecto / reporte a gerencia y cliente.
- Automatizacion: nucleo para GRAPCO. Curva S Resumen/Programado/Ejecutado -> modulo **Curva S (F07)**. Hojas PPTO/1-5/7.GG/APU -> **Presupuesto (BAC)** y motor de APU. Hoja RO + A.Partidas + A.Recursos -> modulo **Resultado Operativo (RO/CR/F06 + EVM)** con desglose 4 patas MO/MAT/EQH/SC. Flujo de Caja -> **GAP (Flujo de Caja no existe en plataforma)**. Ingesta via importador generico in-app por hoja; ojo: fechas almacenadas como strings "Mon Nov 03 2025..." requieren parseo.

---

### \05. GestiÃ³n Costos\12. Fisico Valorizado Semanal\1. Superado\Hoja de cÃ¡lculo sin tÃ­tulo.xlsx
- Tipo / formato: xlsx sin codigo de formato (borrador / notas sueltas). Carpeta "1. Superado".
- Hojas (1): Hoja 1 (rango B24:D36).
- Contenido: notas de diseÃ±o estructural de la NAVE, no datos de costo. Texto: "mayor detalle de losa colaborante", "dimensiones y caracteristicas de viga pr...", "diseÃ±o real considerando sobrecargas", "como se amarra en sismo (losa maciza)", "solicitar el diseÃ±o final de la nave", "sobrecarga considerado 200", "diseÃ±o de losa 200k/m2 | diseÃ±o | 5 a 6 ton", "union de fierro de construccion con vi...".
- Numeros clave: sobrecarga 200 k/m2; 5 a 6 ton (referencias de diseÃ±o, no montos).
- Proposito: apuntes tecnicos sueltos sobre el diseÃ±o de losa/nave; sin valor de control de costos.
- Origen -> Destino: notas manuales del equipo tecnico; no alimenta ningun calculo.
- Automatizacion: GAP / descartar. No corresponde a ningun importador (no es data estructurada de costos).

---

### \05. GestiÃ³n Costos\12. Fisico Valorizado Semanal\GP-GCE-FOR-F07_CURVA S PTARI CREDITEX.xlsx
- Tipo / formato: xlsx. Codigo **GP-GCE-FOR-F07** (Curva S). Reusa F01 (Presupuesto/APU) y PRO-GCE-FOR-F03 (GG). Version VIGENTE (raiz de la carpeta, no "Superado").
- Hojas (17): identicas a la version "Copia": Curva S Resumen | Curva S Programado | CarÃ¡tula | Flujo de Caja | Curva S | PPTO | 1. PRE | 2. PRO | 3. MOV | 4. EST | 5. ARQ | 7. GG | Hoja 8 | APU Contractual | RO | A. Partidas | A. Recursos.
- Contenido por hoja relevante (mismas estructuras que la version Copia; difieren los valores programados):
  - **Curva S Resumen**: columnas PROGRAMADO (CD Semanal/%/Acum/% Prog) y EJECUTADO (idem). Sem 6 prog 219,662.96 (12%) vs ejec 179,046.99 (10%); sem 12 prog acum 772,303.45 (42%) vs ejec acum 758,283.06 (41%) (+15 filas). Esta version reprograma la curva (sem 6 sube de 9% a 12%).
  - **Curva S Programado / Curva S**: misma matriz partida x dia x semana (inicio Lun 03 Nov 2025, meses 1-12, sem 1-57). En "Curva S Programado" N1 CISTERNA 1,796,214.57 / N2 PRELIMINARES 183,870.73 / N3 SSO 38,765.32; en "Curva S" N1 1,793,038.35 / N2 182,704.14 / N3 51,152.49 (+256 / +110 filas).
  - **CarÃ¡tula / Flujo de Caja / PPTO / 1.PRE..5.ARQ / 7.GG / Hoja 8 / APU Contractual / RO / A.Partidas / A.Recursos**: identicas a la version Copia (mismos encabezados, mismos formatos F01/F03, mismo plazo 4.50 meses / EST 130 dias). Flujo de Caja con desembolsos 1..8+ iguales (acum 2,437,557.22 s/IGV). RO TOTAL COSTO DE OBRA 2,276,183.77 / CD 1,793,038.35. A.Recursos incidencias MO 0.22 / MAT 0.47 / EQH 0.08 / SC 0.23.
- Numeros clave: CD 1,793,038.35 | TOTAL OBRA 2,276,183.77 | Curva programada sem 6 = 219,662.96 (12%) | sem 12 acum prog 772,303.45 (42%) / ejec 758,283.06 (41%) | Flujo acum c/IGV 2,876,317.52.
- Proposito: version vigente del fisico valorizado semanal de la PTARI; tablero oficial de avance programado vs ejecutado + flujo de caja + RO contractual.
- Origen -> Destino: presupuesto contractual + APU + metrados/tareos semanales -> Curva S de avance, RO y flujo de caja para reporte a gerencia/cliente.
- Automatizacion: misma ruta que la version Copia (preferir ESTA como fuente). Curva S -> **Curva S (F07)**; PPTO/APU -> **Presupuesto (BAC)**; RO/A.Partidas/A.Recursos -> **Resultado Operativo (RO/CR/F06 + EVM)** con 4 patas; Flujo de Caja -> **GAP (Flujo de Caja)**. Importador generico in-app por hoja; parsear fechas string.

---

## Notas transversales del chunk
- Hay DOS versiones del F07 (vigente en raiz vs "Copia" en "1. Superado"): para ingesta usar la de la raiz; difieren los valores de la curva programada (la vigente reprograma sem 6 a 12% y muestra CISTERNA programada 1,796,214.57).
- El workbook F07 es un "todo en uno" que duplica info de las categorias Presupuesto, APU y RO: al automatizar conviene mapear cada hoja a su modulo destino y evitar doble carga de la misma data.
- GAP claro y recurrente: **Flujo de Caja / cronograma de desembolsos** (hojas Flujo de Caja y Hoja 8) no tiene modulo en GRAPCO.
- El tercer archivo ("Hoja de calculo sin titulo") es ruido (notas de diseÃ±o) y no debe automatizarse.

