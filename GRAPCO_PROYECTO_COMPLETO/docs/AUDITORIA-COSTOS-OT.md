# Auditoría Costos · Oficina Técnica (Presupuesto · RO · Valorizaciones · Adicionales/Deductivos)

> Consolidado de 20 auditorías (8 de código + 12 de Excel CREDITEX) para construir/reaprovechar los módulos de Oficina Técnica replicando los formatos reales (PPTTO, GP-GCE-FOR-F06 RO, GP-GCE-FOR-F07 valorización, GP-GCE-FOR-F05 adicionales). Regla rectora: **auditar antes de construir** — no duplicar módulos ni archivos.
>
> Proyecto activo: `creditex-ptar`. Reglas de plataforma a respetar: paleta BASE (navy/gold/claro), porcentajes con `Math.round` (sin decimales), costo MO único **S/25.50/h** para el AC interno, aislamiento por proyecto vía `filtrarPorContexto`, offline-first.

---

## (a) Resumen ejecutivo

El módulo de costos en Oficina Técnica **YA existe y está vivo** (Olas 1-5 del RO desplegadas). El motor EVM (`calcularROMensual` en `planMaestroAnalytics.js:474-701`) calcula BAC/PV/EV/AC/CPI/SPI/EAC/VAC por partida hoja del WBS, con las 4 patas del AC (MO tareos×25.5 + Materiales Kardex + Facturas + Subcontratos), GG aparte y ajustes F05. El hook `useRO.js` carga 11 colecciones Firestore en tiempo real con filtrado por proyecto/frente. Las vistas `ResultadoOperativoOficial.jsx` (réplica del F06 con columnas F1/F2), `ROFrentes.jsx`, `CostoRealCR.jsx`, etc., ya consumen ese motor.

**Lo que falta es de organización y completitud, no de motor nuevo:**

1. **PRESUPUESTO** no tiene vista propia unificada: `PartidasContractuales` (Firestore plano) y `Catalogo_WBS` (jerárquico por proyecto) coexisten desvinculados. El CPI/RO toman el presupuesto SOLO del `Catalogo_WBS` (fuente única según memoria). Hay que construir una vista de lectura del presupuesto anclada al `Catalogo_WBS`, con los dos modos del Excel real (jerárquico por especialidad + por recurso canónico RO).
2. **RO**: hay confusión de navegación ("dos RO") y duplicidad funcional CR-vivo vs CR-desde-ISP. Se unifica navegación y se decide fuente única del CR.
3. **VALORIZACIONES**: `ValorizacionesView` existe pero no replica el detalle F07 (`4. VAL`: Presupuesto/Acum.Anterior/Actual/Acumulado/Saldo con Cant/%/Monto) ni la liquidación (adelanto, FG 5%, detracción 4%).
4. **ADICIONALES/DEDUCTIVOS**: el modelo PQ-01/PQ-02 de `PartidasExtras.jsx` es demasiado simple frente al F05 real (estados de ejecución/adicional/abono, N° AD correlativo, CD/GG/U, oferta comercial negativa, tipo cliente/contratista).
5. Importadores: ISP roto para el formato actual (85 columnas vs 65 del parser por índice fijo); faltan importadores in-app de Facturas, GG Oficina y del F07 de valorización al cliente.

La base canónica es el **presupuesto CONTRACTUAL** (no el "Superado"): es el firmado e incluye la hoja `RO` con la taxonomía de partidas 1001-1018 que el módulo RO ya consume.

---

## (b) Los "dos RO": diagnóstico exacto y unificación a UNO

### Diagnóstico (no son dos RO; son RDO ≠ RO)

El usuario percibe "dos RO" porque conviven dos conceptos con nombre parecido en Oficina Técnica:

| | RDO (Reporte Diario de Obra) | RO (Resultado Operativo) |
|---|---|---|
| Naturaleza | Táctico/campo, diario | Estratégico/financiero, EVM |
| Componente | `src/views/oficinatecnica/RDOView.jsx` | `src/views/modulos/resultadoOperativo/ROPanel.jsx` |
| Datos | colección `RDO` | hook `useRO` (11 colecciones) |
| Sidebar (`App.jsx`) | `OT_SIDEBAR['EJECUCIÓN'] → 'ot.rdo'` (`App.jsx:30`) | `OT_SIDEBAR['RESULTADO OPERATIVO'] → 'ot.ro'` (`App.jsx:40`) |
| Grupo en panel | `GRUPOS.ejecucion` (`OficinaTecnicaPanel.jsx:43-54`) | `GRUPOS.ro` (`OficinaTecnicaPanel.jsx:67-76`) |
| Render | `OficinaTecnicaPanel.jsx:236` → `<RDOView />` | `OficinaTecnicaPanel.jsx:230` → `<ROPanel />` |

Son **vistas ortogonales**, no padre-hijo. La confusión la agrava que dentro de `ROPanel` hay **12 pestañas** (`ROPanel.jsx:20-35`), de las cuales 5 llevan "RO/CR" en el nombre. Además hay **duplicidad funcional real** dentro del RO:

- `crVivo` → `CostoRealCR.jsx`: CR desde tareos Firestore (`calcularReporteTareos`, HH×25.5). (`ROPanel.jsx:22, 93`)
- `roISP` → `RODesdeISP.jsx`: CR/CHH desde el Excel ISP subido (no Firestore). (`ROPanel.jsx:23, 94`)
- `crOficial` → `CostoRealOficial.jsx`: AC por partida EVM. (`ROPanel.jsx:26, 96`)

La nota de memoria (18/06) indicaba descartar el importador ISP por duplicar el CR vivo, pero **sigue enchufado** (`ROPanel.jsx:16,94`). Esta es la duda de producto #1.

### Unificación a UN solo RO

1. **Renombrar etiquetas en el sidebar** (`App.jsx:30` y `:40`) para que no se confundan:
   - `ot.rdo` → "Reporte Diario (RDO)" en grupo EJECUCIÓN.
   - `ot.ro` → "Resultado Operativo (RO · F06)" en grupo RESULTADO OPERATIVO.
2. **UN solo RO vivo y acumulado** por proyecto (confirmado por las auditorías DIC vs MAY: el F06 es la misma plantilla con cortes acumulados; no son 6 archivos). Mantener `ROPanel` como único contenedor.
3. **Reordenar las 12 pestañas de `ROPanel.jsx:20-35`** con jerarquía intuitiva: entrada = "RO Oficial (F06)" (la matriz EVM completa), luego Dashboard, luego sub-vistas (Por Partida, Por Frente, CR/Controles, Adicionales, Deductivos, Proyección, Curva S).
4. **Resolver el CR triple**: decidir fuente única del CR (recomendación: CR vivo desde `Registros_Campo`/tareos como verdad operativa; ISP solo si se arregla el parser y se usa como sustento/cruce, no como segunda verdad). Eliminar la pestaña duplicada que no se conserve.
5. No crear un módulo RO nuevo. La etiqueta del grupo `ro` ya está bien; el problema es de naming y orden, no de arquitectura.

---

## (c) Inventario de lo que YA existe (rutas) + duplicidades a evitar

### Motor y datos (reutilizar, NO duplicar)

- `src/utils/planMaestroAnalytics.js` — `calcularROMensual` (`:474-701`), `calcularEVM` (`:376-458`), `calcularCostoRealActividad` (4 patas, `:301-356`), `construirArbolWBS`, `calcularCurvaS` (`:707-761`). Constante `COSTO_HORA_RO=25.5`. Ajustes F05 en `:614-622` (`sumarPQ`, `bacContractual`, `evContractual`).
- `src/views/modulos/resultadoOperativo/useRO.js` — carga 11 colecciones + Historial en vivo, `filtrarPorContexto`, flag `ignorarFrente`.
- `src/contexts/ProyectoActivoContext.jsx` — `proyectoActivoId` (default `creditex-ptar`), `frenteActivoId`, `filtrarPorContexto`.
- `src/hooks/useCatalogoWBS.js` — fuente única de estructura/metrados/IP por proyecto; fallback a `CATALOGO_MASTER`.
- `src/utils/helpers.js` — `calcularReporteTareos`, `calcularControlHHVariaciones` (CR/CHH vivos).
- `src/utils/styles.js` — paleta BASE (navy `#0F2A47`, gold `#E5A82F`, claro), tokens, `cardStyle()`, `buttonStyle()`, `CHART_PALETTE`.
- `src/components/AreaSidebar.jsx`, `src/components/VistaHeader.jsx`, `src/components/Icon.jsx`, `RoleGuard`.

### Vistas RO existentes

`ROPanel.jsx`, `ResultadoOperativoOficial.jsx` (réplica F06 F1/F2), `ROFrentes.jsx`, `CostoRealCR.jsx`, `RODesdeISP.jsx`, `CostoRealOficial.jsx`, `RODashboard.jsx`, `ROporPartida.jsx`, `ROProyeccion.jsx`, `CurvaSFinanciera.jsx`, `ControlRegistros.jsx`, `Adicionales.jsx`/`Deductivos.jsx`/`PartidasExtras.jsx`.

### Importadores existentes

- `src/views/modulos/resultadoOperativo/ImportadorRegistros.jsx` — genérico parametrizable (Facturas, GG, SC, Adicionales, Deductivos), detección flexible de columnas, batch 400, IDs idempotentes.
- `src/views/materiales/ImportarRegistroAlmacen.jsx` + `src/utils/registroAlmacenParser.js` — S10/F07 acumulado → deltas (YA vivo, commit `ac5f3a9`).
- `src/utils/ispParser.js` + `useISP.js` — parser ISP (ROTO para 85 columnas, ver gaps).
- `src/utils/cronogramaExcel.js`, `src/utils/import/csvParser.js`, `ImportadorPlanMaestro.jsx`.

### Presupuesto / Valorizaciones existentes

- `src/views/oficinatecnica/PartidasContractuales.jsx` (Firestore plano), `src/views/modulos/wbsEditor/EditorWbsIsp.jsx` (editor del Catalogo_WBS con import Excel), `src/views/oficinatecnica/ValorizacionesView.jsx`, `SustentoMetrados.jsx`, `InformeSustento.jsx`, `DashboardOT.jsx`. Motor `calcularValorizacion` en `calidadOTAnalytics.js:325-387`.

### Duplicidades a evitar

- **CR triple** dentro del RO (vivo vs ISP vs oficial): consolidar a una fuente.
- **`PartidasContractuales` vs `Catalogo_WBS`** desvinculados: anclar al `Catalogo_WBS` como fuente única (no inventar tercera estructura ni nuevos códigos de partida).
- **No crear parser de Presupuesto nuevo**: reutilizar la agrupación canónica RO (códigos 1001-1018) que la hoja `RO` del Excel ya comparte con `useRO`.
- **No crear módulo de valorización nuevo**: la hoja `5. RO` del F07 es el mismo formato RO que ya se ingesta.
- En disco CREDITEX hay versiones "Superado"/"Rev.NN": ingestar SOLO la vigente (contractual / mayor revisión fuera de "Superado").
- En `Adicionales.jsx`/`Deductivos.jsx`: ya comparten `PartidasExtras.jsx` correctamente — mantener ese patrón, no clonar.
- Scripts sueltos del git status (`_almacen_*.cjs`, `_consolidate_almacen.cjs`, `_test_deltas.cjs`, `_validate_fixed.cjs`) son del importador de almacén, no de costos: no confundir.

---

## (d) Diseño objetivo por módulo (con hojas/columnas reales del Excel)

### 1) PRESUPUESTO (vista de lectura anclada a `Catalogo_WBS`)

Fuente única: `Catalogo_WBS/{proyectoId}`. Base = presupuesto **Contractual** (`PPTTO GRAPCO Rev 30.06 vr Modif x Creditex 17.07.25.xlsx`). Dos modos sobre el MISMO costo directo (S/1,825,339.08):

**Modo A — Jerárquico por especialidad** (hojas `PPTO` + `PRE/PRO/MOV/EST/ARQ`):
Columnas: `ITEM | DESCRIPCIÓN | UND | CANT | P.U.(S/.) | PARCIAL | SUBTOTAL | TOTAL`. Jerarquía 3 niveles: Capítulo (1.0–5.0) > Subtítulo (4.5, 4.5.5) > Partida (4.5.5.1). Pie de resumen: Costo Directo → +GG (26.47%) → +Utilidad (9%) → Subtotal → +IGV (18%) → Costo Total (S/2,917,862.72).

**Modo B — Por recurso canónico (hoja `RO`)**:
Columnas: `FRENTE | PARTIDA (1001-1018) | Descripción | Ppto F1 (PTARI) | Ppto F2 (NAVE)`. Códigos: 1001 PRELIMINARES, 1002 PROVISIONALES, 1003 CONCRETO, 1004 ACERO, 1005 CURADO, 1011 VARIOS ARQ, 1014 MOV. TIERRAS, 1015 ENCOFRADO, 1016 ESTRUCTURA METÁLICA, 1017 IMPERMEABILIZACIÓN, etc. `TOTAL COSTO DE OBRA` = CD + GG (S/2,308,484.50, sin utilidad ni IGV) = meta de control del RO.

Notas: MO interna costea a 25.50 (no las tarifas por cargo del Excel: Capataz 30.70/Operario 27.90/Oficial 22.03/Peón 19.93). PEÓN del Excel → mapear a Ayudante (duda abierta). Soportes (APU, Recursos, Metrados, GG) NO se muestran como tabla principal; APU vive en plataforma de Costos aparte (memoria).

### 2) RESULTADO OPERATIVO (matriz F06 — único, vivo, acumulado)

Réplica de `GP-GCE-FOR-F06`. **35 columnas (A→AI)**, cabecera jerárquica de 6 filas (7-12), cuerpo filas 13-78. Ya implementada en `ResultadoOperativoOficial.jsx`; verificar 1:1 contra esta estructura:

`B=FRENTE | C=PARTIDA | D=Descripción` · **PRESUPUESTO**: `E=Ppto F1(PTARI) | F=Ppto F2(Nave) | G=Deductivos PQ01/02 | H=Adicionales PQ01/02 | I=Ppto Total(BAC)` · **PROGRAMADO/PV**: `J=PV F1 | K=PV F2 | L=PV Ded | M=PV Adic | N=Plan Value` · **VALORIZADO/EV**: `O=Val F1 | P=Val F2 | Q=Val Ded | R=Val Adic | S=Earn Value` · **COSTO**: `T=Actual Cost(AC) | U=Margen/CV | V=CPI%` · **ESTIMADO AL TÉRMINO**: `W=Saldo teórico | X=Saldo costo | Y=CPI% saldo | Z=EAC | AA=VAC | AB=CPI% proy` · **VARIACIÓN CRONOGRAMA**: `AC=SV | AD=SPI%` · `AF=COMENTARIOS | AH=ANÁLISIS ALMACÉN | AI=ANÁLISIS ISP`.

Filas: `TOTAL COSTO DE OBRA` (13) → `COSTO DIRECTO` (15) → agrupadores 1001-1018 (16-61) → fila %avance (62) → `GASTOS GENERALES` (63) con 10 subcuentas → `DESCUENTOS` (76: utilidad/comercial, negativos). Fórmulas confirmadas: `BAC=E+F+G+H`, `EV=O+P+Q+R`, `CV=EV-AC`, `CPI=EV/AC`, `SPI=EV/PV`, `VAC=BAC-EAC`. `#DIV/0!` (AC=0) → mostrar "—". % con `Math.round`.

Hoja `CR` (fuente del AC): 4 patas — `REGISTRO FACTURAS | REGISTRO ALMACEN | CONTROL TAREOS | GASTOS GENERALES → TOTAL REGISTRO`, cada una con `ACUM | MENSUAL | ACUM` (cortes que avanzan). Tareos = HH×25.50. `TOTAL REGISTRO` por partida = columna `Real (AC)` del RO. Hoja `DASH` (antes "Leyenda"): tablero CV/VAC por partida + glosario EVM.

### 3) VALORIZACIONES al cliente (réplica F07)

Réplica de `GP-GCE-FOR-F07`, 8-9 hojas. Hoja rectora `4. VAL`:
`ITEM | DESCRIPCIÓN | UND | CANT | P.U. | PARCIAL || ACUM.ANTERIOR(Cant/%/Total) | ACTUAL(Cant/%/Total) | ACUMULADO(Cant/%/Total) | SALDO REF.(Cant/%/Total) | Observación`. Regla: `ACUMULADO = ANTERIOR + ACTUAL`; valorización del mes = columna ACTUAL; `SALDO = CONTRACTUAL − ACUMULADO`; `%avance = Cant_bloque/Cant_contractual`.

Pie (3 filas espejo): `COSTO DIRECTO → GG(26.47%) → UTILIDAD(9%) → SUBTOTAL → (−)DESC.ADELANTO → (−)DESC.COMERCIAL DISEÑO → SUBTOTAL → IGV(18%) → TOTAL A FACTURAR`. Hoja `1. RESUMEN` (liquidación): Val Bruta − Amort. Adelanto Directo (S/200k en 3 cuotas) = Liq. Neta + IGV − Retención FG 5% = Total a Pagar; `2. PAGOS`/`3. RES.VAL` añaden Detracción 4%. Hoja `5. RO` = puente al módulo RO (Ppto F1 / Val Quincenal / Val Acumulada por partida 1001-1018).

NOTA: El F07 va a **P.U. contractuales con GG+Utilidad+IGV** (cara venta), NO al costo interno 25.50. NAVE (F2) usa el mismo F07 con presupuesto propio (S/749,994.16) y descuento comercial 12.47%.

### 4) ADICIONALES / DEDUCTIVOS (enriquecer modelo F05)

El modelo actual (PQ-01/PQ-02 + presupuesto/programado/valorizado en `PartidasExtras.jsx`) alimenta el RO correctamente (`planMaestroAnalytics.js:614-622`), pero NO captura el estatus real F05. Campos a añadir al schema `Adicionales`/`Deductivos`:
`nro (AD-NN correlativo) | tipo (adicional|deductivo|servicio) | frente (F1/F2/F3...) | cd | gg | ggPct | ofertaComercialPct (descuento negativo) | utilidad | utilidadPct | subtotalGrapco | revisionSupervision | facturadoFecha | estadoEjecucion {EJECUTADO|EN PROCESO|NO EJECUTADO} | estadoAdicional {APROBADO|EN PROCESO|PENDIENTE|ANULADO} | estadoAbono {ABONADO|PENDIENTE|ANULADO} | tipoSolicitud {cliente|contratista} | comentario | revision`.

Vista doble: (1) tabla ESTATUS (réplica `GP-GCE-FOR-F05_ESTATUS`: COD | FRENTE | CD | GG | U | SUBTOTAL | REVISIÓN SUP | estados | FACTURADO | ABONO | TIPO); (2) AD individual (Carátula/Resumen/Metrados/APU). Servicios (SE) = subcontrato a precio cerrado, GG/U a 0%.

---

## (e) Cómo conversan los datos (Presupuesto → RO → Valorización → Adicionales)

Todo se aísla por proyecto/frente con `filtrarPorContexto` (`ProyectoActivoContext.jsx`), proyecto activo `creditex-ptar`. Colecciones Firestore y flujo:

```
Catalogo_WBS/{proyectoId}  ── estructura+metrado+P.U.+IP (FUENTE ÚNICA del presupuesto)
        │  (BAC base por partida = Σ metradoContractual × precioUnitario)
        ▼
PlanMaestro (actividades WBS planas con frenteId) ──┐
APUs (costos teóricos) ─────────────────────────────┤
                                                    ▼
                                      calcularROMensual()  ◄── useRO (11 colecciones)
   ┌─ AC (4 patas) ◄── Registros_Campo (tareos×25.5) + Kardex_Movimientos (SALIDA mat)
   │                   + Registro_Facturas (sin IGV) + ValorizacionesSubcontratistas (F10)
   ├─ GG ◄── GG_Oficina (bolsa obra-level)
   ├─ EV ◄── ValorizacionesContractuales.partidasValorizadas[{codigo, montoBruto}]
   │          (si no hay valorización → EV = avance × P.U.)
   └─ AJUSTES F05 ◄── Adicionales / Deductivos (sumarPQ PQ01+PQ02, estado≠anulado)
                       bacContractual = BAC + adic − deduct  (planMaestroAnalytics.js:621)
                       evContractual  = EV  + adic − deduct  (:622)
        │
        ▼
   RO (F06) → Valorización al cliente (F07 hoja 5.RO) es la CARA VENTA del mismo dato
```

Puntos clave de conversación:
1. **Presupuesto → RO**: el BAC del RO se computa desde `Catalogo_WBS` (no desde `PartidasContractuales`). Si `Σ(metrado×P.U.) < presupuestoContractual` → alerta de cobertura.
2. **Valorización → RO**: `ValorizacionesContractuales` provee el EV real por partida (`evReal=true`); su columna ACUMULADO = "Valorización Acumulada" de la hoja 5.RO. La valorización es la cara venta (con GG+Util+IGV); el RO interno cruza ese EV contra el AC (costo 25.50).
3. **Adicionales/Deductivos → RO**: ajustan BAC y EV contractuales globalmente hoy; pendiente desglose por partida/frente.
4. **Almacén/Facturas/GG/SC → CR → AC del RO**: cada `TOTAL REGISTRO` por partida = columna Real del RO. Solo líneas MATERIALES del almacén alimentan el costo directo.
5. **Frentes F1/F2**: se separan corriendo el motor por `frenteId` (requiere que las actividades del PlanMaestro tengan frenteId asignado — verificar para NAVE/F2).

---

## (f) Plan por fases

- **Fase 0 — Unificar navegación RO**: renombrar sidebar (`App.jsx:30,40`), reordenar pestañas de `ROPanel.jsx:20-35`, decidir y consolidar el CR único (vivo vs ISP). Sin tocar el motor. Bajo riesgo.
- **Fase 1 — Arreglar importador ISP**: reescribir `ispParser.js` para detectar columnas por NOMBRE de cabecera (META=`PPTO META`, REAL=`ACUMULADO ACTUAL`) en vez de índices fijos; tolerar 65 y 85 columnas; soportar SEM01..SEM26+.
- **Fase 2 — Vista PRESUPUESTO**: nueva pestaña en `GRUPOS.contrato` anclada a `Catalogo_WBS`, dos modos (jerárquico + por recurso RO 1001-1018), KPIs compactos (CD/GG/Util/Total). Reutiliza `EditorWbsIsp`/`useCatalogoWBS`. Importador in-app del Contractual (subir, no escribir directo).
- **Fase 3 — VALORIZACIONES F07**: extender `ValorizacionesView` con el detalle `4. VAL` (Cant/%/Monto por bloque), liquidación (`1. RESUMEN`: adelanto, FG 5%, detracción 4%) e importador in-app del F07. Reutiliza `calcularValorizacion`.
- **Fase 4 — ADICIONALES/DEDUCTIVOS F05**: ampliar schema y `PartidasExtras.jsx` con campos de estatus; vista tablero ESTATUS; importador del F05 (estatus + AD individual) siguiendo patrón Almacén. Filtrar suma al BAC por `estadoAdicional='APROBADO'` (duda abierta).
- **Fase 5 — Importadores CR restantes**: Facturas (hoja CR agregada o detalle factura), GG Oficina (delta mensual desde columna MENSUAL), siguiendo el patrón acumulado→deltas del almacén.
- **Fase 6 — Frentes F1/F2 + GG por frente + AC por tipo**: verificar/asignar `frenteId` en PlanMaestro NAVE; reparto de GG por frente; columnas AC_MO/AC_MAT/AC_SC; equipos (4ª pata, `planMaestroAnalytics.js:344`).

Tras cada cambio aprobado: fetch+rebase `origin/main`, build, deploy hosting `grapco-demo-2026`, push (regla "publicar siempre").

---

## (g) Preguntas abiertas (dudas no resueltas por los hallazgos)

1. **CR único**: ¿se mantiene el importador ISP (`RODesdeISP`) o se elimina por duplicar el CR vivo (como indicaba la nota del 18/06)? Si se mantiene, ¿se arregla el parser por cabecera?
2. **Fuente del presupuesto**: confirmado `Catalogo_WBS` como verdad. ¿El import del PPTTO debe actualizar también `PartidasContractuales`, o esa colección se deprecia?
3. **Línea base del RO**: ¿meta de control = `TOTAL COSTO DE OBRA` (CD+GG, S/2,308,484.50) o el costo de venta con IGV (S/2,917,862.72)?
4. **Costeo MO**: ¿siempre 25.50 para el AC interno (sí, por memoria) y P.U. contractuales por cargo solo para Presupuesto/Valorización? Mapeo PEÓN→Ayudante: ¿se aplica?
5. **Adicionales en el RO**: ¿suman al BAC solo si `estadoAdicional='APROBADO'`, o también 'EN PROCESO'? Hoy `sumarPQ` suma todo lo no anulado.
6. **Adicionales/Deductivos por frente**: ¿añadir `frenteId` al schema para separar F1/F2 en `ROFrentes`, o quedan obra-level?
7. **Modelo de cambios contractuales**: ¿unificar Adicionales/Deductivos/Servicios en una colección con `tipo`+signo, o mantener 3 separadas?
8. **GG por frente**: ¿se reparte (¿% del BAC?) o permanece obra-level no repartible?
9. **Valorizaciones**: ¿solo-lectura importando F07 mensual, o se recalcula desde Catalogo_WBS + tareos? ¿Importar columna ACTUAL directa o derivar ACUMULADO−anterior almacenado?
10. **GG Oficina pendiente**: el F07 GG más reciente cierra en feb-2026; ¿de dónde sale el GG para el RO de mayo?
11. **Columna ANÁLISIS ISP** (AI del F06): ¿de qué fuente se llena, dado que ISP_Semanal figura pendiente?
12. **NAVE versión oficial**: ¿Rev.03 (CD S/571,808.84) o N°02 firmado de los PDFs (CD S/545,588.27)? Difieren en las barandas FRP (+S/26,220.57).
13. **NAVE/PTARI**: ¿dos contratos separados (adelanto/FG por frente) o un contrato con dos frentes? Hoja `5.RO` de NAVE arrastra rótulo "F1/PTARI" del template: ¿corregir a "F2/NAVE"?
