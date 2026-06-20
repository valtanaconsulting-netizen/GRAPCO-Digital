# 00 · RESUMEN Y FLUJO DE AUTOMATIZACIÓN — "05. Gestión Costos" (CREDITEX)

> Documento rector del sistema real de control de costos de CREDITEX (PTAR PLANTA 5).
> Frentes: **F1 = PTARI** (PTAR Planta 5) y **F2 = NAVE Industrial**.
> Consolida las fichas archivo-por-archivo de las 12 categorías (un `.md` por chunk en esta misma carpeta).

---

## 1) Resumen ejecutivo del universo de archivos

- **394 archivos** repartidos en **12 categorías** (`cat_1_*` … `cat_12_*`), un sistema vivo de control de costos de obra de CREDITEX.
- Nomenclatura corporativa de formatos (GRAPCO / Valtana):
  - **GP-GCE-FOR-F01** — Presupuesto / APU (banco de precios unitarios).
  - **PRO-GCE-FOR-F03** — Recursos / Gastos Generales / Sustento de metrados.
  - **PRO-GCE-FOR-F05 / GP-GCE-FOR-F05** — Adicionales (AD/SE), metrados, APU, cotizaciones.
  - **GP-GCE-FOR-F06** — Resultado Operativo (RO) + EVM (CR, Adicionales/Deductivos, DASH, GG).
  - **GP-GCE-FOR-F07** — multi-uso: Registro Almacén (Kardex S10), Registro Facturas, Registro GG Oficina, Valorización al cliente, Liquidación, Curva S, Flujo de Caja.
  - **GP-GCE-FOR-F10 / F11** — Valorización de Subcontratistas / hoja de ruta STANDARD.
  - **GP-GCE-FOR-F16** — Presupuesto Real (BAC / Meta vs Contractual).
  - **PRO-GCR-FOR-F01** — ISP (Informe Semanal de Producción / HH-IP-CPI).
  - **GP-GIN-FOR-F05** — Tablero de estatus de adicionales.
  - Exports S10 `*_AL_*.XLSX` (PARTIDACONTROLCONSULTA) por grupo de material.
  - Auxiliares no GP: `Bancos *.xls` (tesorería corporativa multi-empresa), `.mpp`, `.dwg`, `.pdf`, `.png`, `.jpeg`.
- **Categorías:** 1 Presupuesto · 2 Presupuesto Venta · 3 Presupuesto Real · 4 RE-RO (Resultado Operativo + sustentos, el corazón) · 5 APU Adicionales · 6 ISP · 7 Valorizaciones (cliente + subcontratistas) · 8 Adicionales y Deductivos · 9 Flujo de Caja · 12 Físico Valorizado Semanal (Curva S).
- **Números ancla vigentes (cierre mayo 2026):** BAC ≈ **S/ 2.31 M** (F1) + **S/ 0.69 M** (F2 NAVE Rev.03); AC TOTAL REGISTRO **S/ 2,515,013.00**; CPI global **0.93**; tarifa MO única **S/ 25.50/HH**; T.C. **3.80**.

---

## 2) Flujo de automatización end-to-end (en ORDEN, con dependencias)

La regla de oro (gran lenguaje de datos): **se ingiere primero lo que define la línea base** (catálogo + presupuesto), luego lo que aporta avance valorizado (valorizaciones), luego lo que aporta costo real (almacén, facturas, ISP, GG) y al final el RO **consolida** todo. El RO ya está vivo (`useRO`); es el espejo de validación de cada importación.

```
                     ┌──────────────────────── FASE 0: ESTRUCTURA (una vez) ───────────────────────┐
 (1) Presupuesto F01/F16  ─►  Importador genérico  ─►  PRESUPUESTO (BAC) + Catalogo_WBS  ─► IP Meta/Ppto
 (2) Recursos F03         ─►  Importador catálogo   ─►  Catálogo de insumos + COSTO_HORA 25.5
 (3) Hoja RO / 12.RO      ─►  Importador BAC        ─►  Meta del RO por FRENTE(F1/F2)+PARTIDA(WBS)
                     └─────────────────────────────────────────────────────────────────────────────┘
                                              │ (define partidas y meta)
                                              ▼
        ┌──────────────────────── FASE 1: AVANCE VALORIZADO (EV) ───────────────────────┐
 (4) Valorización cliente F07 (4.VAL / 5.RO)  ─► VALORIZACIONES  ─► Earned Value + Curva S (F07)
 (5) Adicionales/Deductivos F05/F07 (estatus) ─► ADICIONALES     ─► ajusta BAC/EV (solo APROBADOS)
        └──────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
        ┌──────────────────────── FASE 2: COSTO REAL (AC = 4 patas) ────────────────────┐
 (6) Almacén S10 *_AL_*.XLSX + F07 consolidado ─► «Importar Registro S10» (acum/delta) ─► AC·Materiales
 (7) ISP PRO-GCR-FOR-F01 (CR/ISP-SEMxx)         ─► ISP (HH × S/25.5)  ─► AC·Mano de Obra + CPI/VAR
 (8) Registro Facturas F07 (CR/RESUMEN)         ─► Import. genérico / F10-F11 ─► AC·Subcontratos+Compras
 (9) Registro GG Oficina F07 (acumulado)        ─► Import. genérico (prorrateo) ─► AC·Gastos Generales
        └──────────────────────────────────────────────────────────────────────────────┘
                                              │ (4 patas + GG + EV + adic/deduc)
                                              ▼
       (10) RESULTADO OPERATIVO  GP-GCE-FOR-F06 (useRO)  ─►  RO/CR · EVM · DASH
                                              │
                                              ▼
       (11) FLUJO DE CAJA (FALTA)  ◄── egresos: ISP + Almacén + Facturas + GG + IGV + adelantos
```

**Detalle por paso (fuente → parser → destino → qué calcula):**

1. **Presupuesto F01 / F16** (hojas PPTO, 1.PRE..6.IISS) → importador genérico → **Presupuesto (BAC) + Catalogo_WBS** → línea base de costo y partidas de control; el catálogo es la fuente única de IP Meta/Ppto para el CPI.
2. **Recursos F03** (CÓDIGO/UND/SOL/USD, T.C. 3.80) → importador de catálogo → **catálogo de insumos / costo MO** → normaliza a `COSTO_HORA_PROMEDIO = 25.5`.
3. **Hoja RO / 12.RO** → importador BAC → **meta del RO por FRENTE+PARTIDA** → costo meta contra el cual se mide todo.
4. **Valorización cliente F07** (hoja 4.VAL avance por partida, 5.RO costo por frente) → **módulo Valorizaciones** → **Earned Value** y **Curva S (F07)**.
5. **Adicionales/Deductivos F05/F07 + tablero estatus** → **módulo Adicionales/Deductivos** → ajusta BAC/EV; **solo entran los APROBADOS** (campo estado).
6. **Almacén S10** (`*_AL_*.XLSX` por grupo + F07 consolidado hoja Data/CR) → **«Importar Registro S10»** (maestro acumulado, calcula deltas) → **AC pata Materiales** (solo líneas MATERIALES; subcontratos van a IISS/Facturas, no doble).
7. **ISP PRO-GCR-FOR-F01** (ISP-SEMxx matriz partida×día, CR, CIP, PC) → **módulo ISP** (HH × S/25.5, IP/CPI desde Catalogo_WBS) → **AC pata Mano de Obra** + CPI/VAR. Fuente ideal = Registros_Campo (tareo facial), no el Excel.
8. **Registro Facturas F07** (CR/RESUMEN) → importador genérico (o futuro F10/F11) → **AC pata Subcontratos/compras facturadas**.
9. **Registro GG Oficina F07** (acumulado, multi-empresa) → importador genérico con prorrateo por proyecto → **AC pata Gastos Generales**.
10. **RO GP-GCE-FOR-F06** (RO/CR/Adicionales/Deductivos/DASH/GG) → núcleo **`useRO`** (ya vivo) → consolida 4 patas + GG + EV + adic/deduc → Dashboard RO. Se usa como **espejo de validación** de los importadores.
11. **Flujo de Caja** (FALTA módulo) → recibiría egresos derivados de ISP + Almacén + Facturas + GG + IGV + adelantos/amortizaciones.

---

## 3) Tabla maestra — Formato → aporte → importador → destino → prioridad

| Formato (Fxx) | Qué aporta | Importador en plataforma | Módulo destino | Prioridad |
|---|---|---|---|---|
| **F01** Presupuesto/APU | BAC, partidas, APU contractual | Genérico in-app (EXISTE); APU FUERA (plataforma Costos) | Presupuesto (BAC) / Catalogo_WBS | Alta |
| **F16** Presupuesto Real | BAC Meta vs Contractual, 4 patas | Genérico (EXISTE) | Presupuesto / RO (EVM) | Alta |
| **F03** Recursos / GG / Sustento metrados | Insumos, costo MO, GG, metrados físicos | Catálogo (parcial); sustento metrados **FALTA** | Catálogo insumos / GG | Media |
| **F06** Resultado Operativo / EVM | RO/CR/DASH, 4 patas, adic/deduc | **EXISTE** (useRO, vivo) | Resultado Operativo | — (núcleo) |
| **F07 · Registro Almacén** (S10) | AC materiales (acum/delta) | **EXISTE** «Importar Registro S10» | Almacén → RO | Alta |
| **F07 · Registro Facturas** | AC subcontratos/compras | Genérico (EXISTE, parcial); detalle **FALTA** | RO pata Facturas | Alta |
| **F07 · Registro GG Oficina** | AC gastos generales (prorrateo) | Genérico (EXISTE); prorrateo **FALTA** | RO pata GG | Media |
| **F07 · Valorización cliente / Liquidación** | EV, avance, Curva S | **FALTA** importador F07 dedicado | Valorizaciones / EV | Alta |
| **F07 · Curva S (físico valorizado)** | Programado vs Ejecutado | **FALTA** (Hoja 8 viene en 0/#REF!) | Curva S (F07) | Alta |
| **F07 · Flujo de Caja / Bancos** | Egresos, IGV, adelantos | **FALTA** total | Flujo de Caja (nuevo) | Alta |
| **F10 / F11** Val. Subcontratistas | AC subcontratos (contrato/amort/saldo) | **FALTA** total | Val. Subcontratistas (nuevo) | Alta |
| **F05 / SE / GIN-F05** Adicionales/Deductivos + estatus | Adicionales, servicios, estado | Genérico (EXISTE); estado/versionado **FALTA** | Adicionales/Deductivos | Media |
| **PRO-GCR-FOR-F01** ISP | HH/IP/CPI, AC mano de obra | Genérico (parcial); **dedicado FALTA** | ISP / RO (EVM) | Alta |
| **Control Planilla** (CHH, RRHH, Horas Extra) | HH planilla vs HH campo, PLAME | **FALTA** total | Control Planilla (nuevo) | Media |
| **.mpp / .dwg / .pdf / .png / .jpeg** | Cronograma MS Project, planos, guías, capturas | **FALTA** (no ingerible / OCR) | Gestión documental | Baja |

---

## 4) Plan de importadores a construir (priorizado)

| # | Importador a construir | Fuente | Esfuerzo | Justificación |
|---|---|---|---|---|
| **P1** | **Importador F07 Valorización cliente** (4.VAL + 5.RO, acumulados) | F07 VAL N01-09 + Liquidación + NAVE | **M (3-5 d)** | Cierra el EV del RO; hoy el avance valorizado no entra estructurado. |
| **P2** | **Importador ISP dedicado** (matriz partida×día HH/IP/CPI, FORECAST/DELTA) | PRO-GCR-FOR-F01 | **M (3-5 d)** | El genérico no captura la matriz semanal; pata MO + CPI/VAR. Ideal: recalcular desde tareo facial. |
| **P3** | **Módulo Valorización de Subcontratistas (F10/F11)** | F10/F11 + PRO-GCE-FOR-VAL | **L (1-2 sem)** | Gap central de cat_7_p3; 1 de las 4 patas del AC (MT/SURE/ENC/M&M/IISS). Maneja contrato, amortización, deducción, saldo. |
| **P4** | **Módulo Curva S / Físico Valorizado (F07)** | F07 Curva S + Hoja 8 | **M (3-5 d)** | Programado vs Ejecutado por semana; hoy Hoja 8 llega en 0/#REF! (re-baseline necesario). |
| **P5** | **Módulo Flujo de Caja** | Bancos *.xls + F07 FC + egresos derivados | **L (1-2 sem)** | Sin destino; tesorería, IGV, adelantos/amortización, egresos por quincena. Requiere filtro CREDITEX (multi-empresa). |
| **P6** | **Módulo Control de Planilla** | Hoja CHH ISP + RRHH + Horas Extra | **M (3-5 d)** | Conciliación HH planilla vs HH campo (delta ~16 HH constante) + PLAME para flujo de caja. |
| **P7** | **Prorrateo GG Oficina por proyecto** | F07 GG Oficina acumulado | **S (1-2 d)** | Multi-empresa; hoy se cargaría el total sin repartir a CREDITEX. |
| **P8** | **Importador sustento de metrados (F03)** | PRO-GCE-FOR-F03 (13 archivos) | **M (3-5 d)** | m3/m2/kg/ml por partida; hoy solo llega la cantidad final a Valorizaciones. |
| **P9** | **Control de versiones / estado (transversal)** | Todos (Rev/Superado/Aprobado) | **S (2-3 d)** | Elegir vigente vs histórico; descartar Superado; estado Aprobado/Rechazado no debe impactar RO. |
| **P10** | **OCR / adjuntos documentales** | PDF guías, SUNAT, .mpp, .dwg, .png | **L (opcional)** | Baja prioridad; evidencia, no dato de costo. |

**Total de importadores/módulos faltantes para automatizar TODO: 10** (de los cuales **P1–P6 son los críticos**; el RO, el Almacén S10, el Presupuesto genérico y el genérico de facturas/GG ya existen).

---

## 5) Inconsistencias a conciliar (antes/durante la ingesta)

1. **Tarifa MO: S/25 (origen) vs S/25.50 (plataforma).** ISP SEM04-20 y Presupuesto Real usan **S/25**; SEM21+ ya usan **S/25.50**. APU Calzaduras usa tarifas por cargo (Capataz 29.56 / Operario 26.88 / Peón 19.19). **Regla: normalizar TODO a `COSTO_HORA_PROMEDIO = 25.5`** al importar; ignorar tarifas por cargo.
2. **Cargo PEÓN** (APU adicionales) no existe en GRAPCO — solo 4 cargos: Capataz/Operario/Oficial/Ayudante. **Mapear/descartar** al ingerir.
3. **Descuento comercial / deductivo DISEÑO −S/40,000** (PTARI 12-09 → 12-10) y deductivos puntuales (−S/2,790.40 en mayo) → deben entrar por **Adicionales/Deductivos**, no perderse en el delta.
4. **Frentes F1 (PTARI) / F2 (NAVE) aún pendientes de segregación en el RO.** Toda valorización 5.RO trae dimensión frente; el RO debe separarlas (formalizado recién en ISP SEM24). **Pendiente estructural.**
5. **Re-baseline Curva S.** La Hoja 8 (cronograma valorizado/egresos por semana) **viene en 0 o con #REF! en casi todos los libros** → la Curva S de costo no está cargada en origen; requiere reconstruir la línea base programada antes de comparar contra ejecutado.
6. **Aislamiento por proyecto.** Bancos *.xls y GG Oficina **mezclan CREDITEX + PRECOTEX + editorial** → filtrar por contexto CREDITEX (creditex-ptar) antes de ingerir.
7. **Higiene de plantillas heredadas.** Cabeceras "PRECOTEX LAS MORERAS", "Agromillora/Ica", hoja IISS rotulada "ARQUITECTURA", rótulos "SEMANA N°06" arrastrados, y celdas #REF!/#DIV/0!/#N/A → **validar OBRA/CLIENTE y sanear** al importar.
8. **Versionado / doble conteo.** Rev.xx vs "Superado", VAL N°03 A&CR (_Continuidad y _Liquidacion), M&M VAL Nº02 duplicada, ISP Superado vs _RO de la misma semana, libros ISP de ~6 MB que replican todas las semanas → **deduplicar por semana/quedarse con el último** y nunca cargar Superado.
9. **Doble conteo subcontratos:** aparecen en Almacén (líneas SC) **y** en Registro Facturas → el importador S10 debe excluir SC (solo MATERIALES) para no contarlos dos veces.
