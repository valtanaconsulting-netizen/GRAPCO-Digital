# Diccionario de Términos — GRAPCO

Definiciones canónicas según convención **S10 / construcción civil Perú**, mapeadas al uso actual en el código.

> **Estado:** este documento NO renombra nada todavía. Sirve para alinear el lenguaje. Una vez aprobado, se usa como guía para decidir qué renombrar y en qué orden.

> **Leyenda:**
> - ✅ término bien usado
> - ⚠️ uso ambiguo o inconsistente
> - ❌ término sobrecargado (significa varias cosas) o mal aplicado
> - 🔧 falta decidir nombre canónico

---

## 1. Estructura de la obra

### Proyecto
**Definición:** Contrato de construcción completo con un cliente. Tiene un código contractual, un presupuesto, un plazo, una sola moneda contractual. Ej: "PTARI Creditex".

**Uso actual:**
- Colección Firestore: `Proyectos` ✅
- Campo FK: `proyectoId` ✅
- Variable de contexto: `proyectoActivo`, `proyectoActivoId` ✅
- ❌ Pero en muchas vistas ([Capataz.jsx:19](src/views/Capataz.jsx#L19), [PlanDiario.jsx:19](src/views/PlanDiario.jsx#L19), [CartaBalance.jsx:20](src/views/CartaBalance.jsx#L20)) se usa el campo `obra` como **string libre** ("PRECOTEX LAS MORERAS") en vez de `proyectoId`.

### Frente (de trabajo)
**Definición:** Subdivisión física u organizativa dentro de un proyecto. Un proyecto puede tener varios frentes (ej: "Frente Estructuras", "Frente Acabados", "Frente PTARI Norte"). Cada frente tiene su propio capataz/ingeniero responsable.

**Uso actual:**
- Colección: `Frentes` ✅
- Campo FK: `frenteId` ✅
- Contexto: `frenteActivo`, `frenteActivoId` ✅
- ⚠️ Muchas colecciones históricas (`Registros_Campo`, `Borradores_Capataz`, `Cartas_Balance`, `Almacenes`, `Kardex_Movimientos`) **no tienen `frenteId`** → no se puede filtrar histórico por frente.

### Obra
**Definición en Perú:** Sinónimo coloquial de **Proyecto**. En S10 oficial se prefiere "Proyecto" o "Contrato". "Obra" se usa hablado, en oficio, etc.

**Uso actual:** ❌ usado como campo `obra` (string) en vez de FK a Proyectos. Confusión conceptual.

**🔧 DECIDIR:** ¿se elimina el campo `obra` (string libre) y se reemplaza por `proyectoId`? ¿O se mantiene `obra` como nombre legible derivado de `Proyectos[proyectoId].nombre`?

---

## 2. Estructura del trabajo (WBS / S10)

> **Hay un choque conceptual grave aquí.** El estándar peruano S10 usa `Partida → Subpartida` con presupuesto. La práctica de gestión moderna usa WBS (Work Breakdown Structure). El proyecto tiene **ambos** sin vínculo explícito.

### Partida (presupuestal S10)
**Definición S10:** Rúbrica de trabajo del presupuesto contractual con **código jerárquico** (ej: `02.01.03 - Concreto f'c=210 kg/cm² en columnas`), unidad (m³, m², kg, und), metrado contractual, precio unitario y monto. La estructura es `Título → Subtítulo → Partida → Subpartida`.

**Uso actual (verificado 2026-05-09):**
- Colección `Partidas` → **definida en `firestore.rules` pero CERO usos en el código** (colección fantasma)
- Colección `PartidasContractuales` → ✅ **única partida realmente usada**. Schema: `codigo`, `descripcion`, `unidad`, `metradoContractual`, `precioUnitario`, `partidaPadre` (jerarquía), `orden`, `subtotal`. Campo `partidaPadre` permite jerarquía Título→Partida→Subpartida en una sola tabla. Ver [PartidasContractuales.jsx:13-15](src/views/oficinatecnica/PartidasContractuales.jsx#L13-L15).
- Campo `partida` dentro de `PlanMaestro` ⚠️ (mezcla concepto WBS con S10)
- Campo `partida` en `Registros_Campo` ⚠️ (¿se refiere a la S10 o a un nodo WBS?)

**❌ Conflicto resuelto parcialmente:** "Partida" significa hoy 2 cosas reales (no 3 — la colección `Partidas` no se usa):
1. Documento en `PartidasContractuales` (presupuesto contractual S10)
2. Nodo del árbol en `PlanMaestro` (WBS+cronograma)

**🔧 DECIDIR:**
- Eliminar la colección fantasma `Partidas` de `firestore.rules` (no se usa en código)
- ¿Renombrar `PartidasContractuales` → `Partidas`? Es la única, el sufijo "Contractuales" es redundante porque no hay otra
- O dejarlo y aceptar que en GRAPCO toda partida es contractual

### Subpartida
**Definición S10:** Desglose de una partida cuando se necesita más detalle (ej: `02.01.03.01 - Acero de refuerzo en columnas`). Mismo modelo que partida.

**Uso actual:** Campo `subpartida` en varios sitios. ✅ El término está bien aplicado, pero comparte el problema de Partida (mezcla con WBS).

### Actividad
**Definición:** Unidad ejecutable de trabajo en obra. Es **lo que el capataz reporta diariamente**. Una actividad puede consumir parte del metrado de una partida (ej: actividad "Vaciado columnas eje A día 1" consume 5 m³ de la partida `02.01.03`).

**Uso actual:**
- Campo `actividad` en `Registros_Campo` ✅ (descripción de labor del día)
- Hojas del árbol en `PlanMaestro` (`actividades`) ⚠️ (es otra cosa: nodo del WBS)
- `CATALOGO_MASTER` provee lista de actividades estandarizadas ✅

**❌ Conflicto:** Igual que Partida. "Actividad" significa hoy:
1. Lo que reporta el capataz (instancia de trabajo en un día)
2. Hoja del WBS en `PlanMaestro` (definición planificada)

**🔧 DECIDIR:** Propuesta canónica:
- `ActividadPlan` = definición/hoja del WBS (lo planificado)
- `RegistroProduccion` o `ParteDiario` = lo que reporta el capataz (la instancia ejecutada)
- Nombre actual `Registros_Campo` es válido pero genérico.

### Metrado
**Definición S10:** Cantidad ejecutada o por ejecutar de una partida, en su unidad (m³, m², kg). Siempre va con su unidad.

**Uso actual:**
- Campo `metrado` ✅
- `metP` (metrado presupuestado), `metM` (metrado meta) ✅ S10 estándar
- ⚠️ A veces aparece `metrado` sin `und` (unidad) → ambiguo

### WBS / EDT
**Definición:** Work Breakdown Structure (Estructura de Descomposición del Trabajo). Árbol jerárquico del alcance del proyecto. **Es metodología PMI**, no S10.

**Uso actual:**
- Colección: `PlanMaestro` (es realmente un WBS) ⚠️ nombre no obvio
- Vista: `WbsExplorer.jsx` ✅

**🔧 DECIDIR:** ¿se renombra `PlanMaestro` → `WBS` o `EDT`? "Plan Maestro" en LPS/Lean es otra cosa (cronograma maestro), distinto de WBS.

---

## 3. Producción y productividad

> **Conflicto importante:** en S10/Perú **rendimiento** y **productividad** NO son sinónimos. Hoy el código solo usa "productividad".

### Rendimiento
**Definición S10:** Cantidad de obra ejecutable por una cuadrilla en una jornada (ej: 12 m³/día por una cuadrilla de 3 operarios). **Es lo presupuestado / lo esperado**. Aparece en el análisis de precios unitarios.

**Uso actual:** ❌ NO existe en el código. Sería `metrado / HH` esperado por partida.

### Productividad
**Definición:** Medida real de eficiencia: `metrado real / HH real`. Comparada contra el rendimiento da el **Índice de Productividad (IP)**.

**Uso actual:**
- Campo `produccion` (string libre, narrativo) en [PlanDiario.jsx:21](src/views/PlanDiario.jsx#L21) ❌ no es productividad, es texto descriptivo
- CartaBalance mide productividad real (TP/TC/TNC) ✅
- `IP`, `ipP`, `ipM`, `ipReal` calculados ad-hoc en `constants.js` y [CpiEac.jsx:73](src/views/CpiEac.jsx#L73) ⚠️ disperso

**🔧 DECIDIR:** Renombrar campo `produccion` (string libre) a `notasProduccion` o `observaciones` para no confundir con métrica de productividad.

### Producción
**Definición:** Trabajo ejecutado en un período (cantidad física). En S10 se mide en **metrado avanzado**.

**Uso actual:** ❌ usado como campo de notas, no como métrica.

### IP (Índice de Productividad)
**Definición:** `IP = HH consumidas reales / HH presupuestadas` para el mismo metrado avanzado. **IP < 1 es bueno** (consumiste menos HH de las presupuestadas).

**Uso actual:** ✅ definido en `constants.js`, pero cálculo disperso. No hay módulo central.

### Carta Balance
**Definición Lean:** Técnica de medición de productividad en sitio mediante muestreo de actividades del trabajador, clasificadas en TP / TC / TNC.
- **TP** = Trabajo Productivo (agrega valor directo: vaciar, encofrar, asentar ladrillo)
- **TC** = Trabajo Contributorio (apoya: traslado de material, replanteo, instrucción)
- **TNC** = Trabajo No Contributorio (no agrega valor: esperas, reproceso, ocio)

**Uso actual:** ✅ bien aplicado en [CartaBalance.jsx](src/views/CartaBalance.jsx). Colección `Cartas_Balance`. Códigos TP/TC/TNC consistentes.

**⚠️ Pendiente:** vista `Capataz.jsx` y `CartaBalance.jsx` no comparten el campo `obra` con el contexto de `proyectoActivo`.

---

## 4. Personal y horas

### Personal
**Definición:** Maestro de trabajadores con DNI, cargo, fecha de ingreso, etc. **Una persona física**.

**Uso actual:** Colección `Personal` ✅ singular es correcto (en Perú se dice "el personal de obra").

### Cargo
**Definición Perú:** Categoría laboral del trabajador según el régimen de construcción civil:
- **Operario** (especializado: albañil, fierrero, electricista, etc.)
- **Oficial** (semi-calificado, ayuda al operario)
- **Peón** (no calificado)
- **Capataz** (jefe de cuadrilla, puede ser operario calificado promovido)

**Uso actual:**
- ✅ `operario`, `oficial`, `ayudante` en `constants.js`
- ❌ Falta `peón` (relevante para cálculo de jornal)
- ⚠️ "ayudante" en jerga = "peón" en régimen oficial — decidir cuál usar

### Cuadrilla
**Definición:** Grupo de trabajadores asignado a una actividad/partida bajo un capataz. Tiene composición (1 capataz + 2 operarios + 1 oficial + 3 peones, p.ej.) y un rendimiento esperado.

**Uso actual:**
- Colección `Cuadrillas` ✅ (maestro)
- Mapa en memoria `CuadrillasActivas` ⚠️ no es una entidad, es una proyección. El nombre confunde.

**🔧 DECIDIR:** renombrar `CuadrillasActivas` → `cuadrillasIndexadas` o `cuadrillasPorCapataz` (es solo un índice derivado, no una entidad nueva).

### Capataz
**Definición:** Jefe de cuadrilla. **Es un cargo**, no un rol del sistema. Pero en GRAPCO también es un **rol de usuario** (el capataz reporta tareo desde la app).

**Uso actual:** ❌ "capataz" se usa para 4 cosas:
1. Cargo del trabajador en `Personal`
2. Campo `capataz` (nombre) y `capatazId` en `Cuadrillas`
3. Rol de usuario en `firestore.rules` (`isCapataz()`)
4. Vista `Capataz.jsx`

**Aceptable** porque en obra es la misma persona, pero **debe documentarse** que el rol de usuario "capataz" requiere que el `Usuario.uid` esté vinculado a un `Personal` con cargo capataz.

### Tareo
**Definición Perú:** Reporte diario de **horas trabajadas por trabajador** (hora entrada, salida, refrigerio, HN, HE). Es **el documento que mira hacia atrás** y es la base de la planilla. Lo registra el capataz al cierre del día.

**Uso actual:**
- Vista `Tareo.jsx` ✅
- Campo `detalleTareo` (array dentro de `Registros_Campo`) ⚠️ → tareo embebido dentro del reporte de producción
- ❌ No existe colección `Tareos` separada

**🔧 DECIDIR:** ¿se separa `Tareos` como colección o se mantiene embebido en `Registros_Campo`? S10 los maneja separados (planilla por un lado, producción por otro).

### Plan Diario
**Definición LPS:** **Lo que se planifica hacer mañana**. Mira hacia adelante. Es el último nivel del Last Planner System (después del lookahead).

**Uso actual:** Colección `Planes_Diarios`, vista `PlanDiario.jsx` ✅

**❌ Conflicto:** No confundir con Tareo. Hoy ambas vistas comparten estructura visual y eso confunde a usuarios.

### Asistencia
**Definición:** Presencia/ausencia del trabajador. Se deriva del tareo (si tiene HN > 0 ese día, asistió).

**Uso actual:** No existe como entidad. Se infiere de `detalleTareo`. ✅ aceptable.

### Jornada
**Definición:** Horario laboral (típicamente 8.5 h/día en construcción civil Perú). HN = jornada legal. HE = horas extras (sobre jornada legal).

**Uso actual:**
- ✅ Constante `JORNADA_LEGAL = 8.5`
- ⚠️ Hardcoded; no configurable por proyecto

### HH (Horas-Hombre)
**Definición:** Unidad de costo/esfuerzo de mano de obra. `HH = trabajadores × horas`. En S10 los presupuestos están en HH/und de metrado.

**Uso actual:**
- Campos `hn` (horas normales), `he` (horas extras) ✅
- `totalHH`, `hhEn`, `hhAcumuladasDia` ⚠️ disperso, sin definición central
- ❌ Falta documentar fórmulas: `totalHH = HN + HE × factor_HE` (¿1.25? ¿1.35?)

### Planilla
**Definición:** Documento de pago semanal/quincenal/mensual al trabajador. Calcula jornal × días + HE + bonificaciones - descuentos.

**Uso actual:** ❌ NO existe módulo de planilla. Solo se registra HH, no se calculan pagos.

---

## 5. Almacén / Inventario

### Almacén
**Definición:** Espacio físico de custodia de materiales en proyecto. Puede haber varios por proyecto (almacén central, almacén de frente).

**Uso actual:**
- Colección `Almacenes` ✅
- ⚠️ Sin `proyectoId` ni `frenteId` → almacén es global

### Material
**Definición:** Insumo consumible o herramienta. Tiene código S10 (obligatorio en GRAPCO), descripción, unidad de medida, categoría.

**Uso actual:**
- Colección `Materiales` ✅
- Campo `codigoS10` obligatorio ✅ (ya en memoria)

### Kardex
**Definición S10:** Registro **histórico append-only** de todos los movimientos (ingresos, salidas, transferencias) de un material en un almacén. Es la fuente de verdad. El stock actual se calcula sumando el kardex.

**Uso actual:**
- Colección `Kardex_Movimientos` ✅ append-only en rules
- Vista `KardexView.jsx` ✅

### Stock
**Definición:** Cantidad disponible **ahora** de un material en un almacén. Es un **caché derivado del kardex**, no fuente de verdad.

**Uso actual:**
- Colección `Stock_Actual` ✅ caché recalculado por Cloud Function
- Documentado claramente como caché ✅

### Ingreso / Entrada
**Definición S10:** Tipo de movimiento del kardex. Material que **entra** al almacén (compra, devolución, transferencia recibida).

**Uso actual (verificado 2026-05-09):**
- "Entrada" como tipo de movimiento ✅
- "Pecosa" aparece en [MaterialesPanel.jsx:28](src/views/MaterialesPanel.jsx#L28) en el tab **Salida** (`'Registrar vale o pecosa'`) ✅ correctamente clasificada como salida
- En Perú lo correcto y ya está bien aplicado:
  - **Guía de Remisión** o **Nota de Ingreso** = documento de entrada
  - **PECOSA** o **Vale de Salida** = documento de salida

### Salida
**Definición S10:** Material que **sale** del almacén (vale para uso en obra, transferencia enviada, devolución a proveedor).

**Uso actual:**
- "Salida" como tipo de movimiento ✅
- "Vale" usado como sinónimo de salida ✅ (es correcto)

### Pecosa
**Definición Perú:** Pedido-Comprobante de Salida. Es **un documento de salida**, no de entrada.

**🔧 DECIDIR:** Corregir uso en [MaterialesPanel.jsx:28](src/views/MaterialesPanel.jsx#L28) si efectivamente está clasificada como entrada.

### Vale
**Definición:** Documento físico/digital de entrega de material del almacén al solicitante (capataz). Es el comprobante de la salida.

**Uso actual:** ✅ término correcto.

### Requerimiento
**Definición:** Solicitud del campo (capataz/ingeniero) al almacén/logística pidiendo material. Es la **demanda**, no necesariamente implica salida (puede ser para compra).

**Uso actual:** Colección `Requerimientos` ✅

### Transferencia
**Definición:** Movimiento de material entre almacenes (sin compra, sin consumo).

**Uso actual:** ⚠️ no detectado como tipo formal del kardex. Verificar.

---

## 6. Compras y logística

### Orden de Compra (OC)
**Definición:** Documento formal a un proveedor para comprar materiales/servicios. Tiene código, fecha, proveedor, ítems, montos, condiciones de pago.

**Uso actual:** Colección `OrdenesCompra` ✅

### Orden de Servicio (OS)
**Definición:** Igual que OC pero para servicios contratados (no materiales).

**Uso actual:** Colección `OrdenesServicio` ✅

### Cotización
**Definición:** Propuesta de precio de un proveedor antes de emitir la OC. Se piden mínimo 3 cotizaciones.

**Uso actual:** ❌ no existe colección `Cotizaciones`.

### Proveedor
**Definición:** Empresa/persona que provee materiales o servicios.

**Uso actual:** ❌ no existe colección `Proveedores`. Probablemente sea string libre en OCs.

### Subcontrato / Subcontratista
**Definición:** Contratista externo que ejecuta una parte del alcance (instalaciones eléctricas, vidrios, etc.).

**Uso actual:** Colección `Subcontratos`, rol `subcontratista` ✅

---

## 7. Last Planner System (LPS)

### Plan Maestro
**Definición LPS:** Cronograma de alto nivel del proyecto (Gantt general, hitos contractuales). NO es el WBS.

**Uso actual (verificado 2026-05-09):** Colección `PlanMaestro` es un **híbrido WBS + Cronograma**. Cada documento es una actividad con:
- Código jerárquico (WBS): ver [WBSExplorer.jsx](src/views/modulos/planMaestro/WBSExplorer.jsx) que ordena por `codigo`
- Fechas para Gantt: ver [GanttPlanMaestro.jsx](src/views/modulos/planMaestro/GanttPlanMaestro.jsx)
- Vínculo a APUs y a `proyectoId`
- Wizard de carga masiva: [WizardPlanMaestro.jsx](src/views/modulos/planMaestro/WizardPlanMaestro.jsx)

Es decir, NO es solo WBS — es la representación combinada estructura + cronograma del proyecto, lo cual sí encaja con "Plan Maestro" en sentido amplio (no estricto LPS).

**🔧 DECIDIR:**
- Aceptar nombre actual `PlanMaestro` (es híbrido WBS+Gantt, no solo WBS) — recomendado
- O separar en `WBS` (estructura) + `Cronograma` (fechas) — refactor mayor, no recomendado
- Documentar claramente que "Plan Maestro" en GRAPCO ≠ "Plan Maestro" en LPS clásico (allá es solo cronograma)

### Lookahead
**Definición LPS:** Plan de **3-6 semanas adelante**. Identifica restricciones por liberar.

**Uso actual:** ❌ no existe.

### Plan Semanal
**Definición LPS:** Plan de la próxima semana, ya con compromisos asignados.

**Uso actual:** ❌ no existe como colección. Se infiere de `PPC_Compromisos`.

### Plan Diario
Ver sección 4.

### Compromiso
**Definición LPS:** Tarea acordada por el responsable para una semana. Tiene un responsable, una fecha de cumplimiento y un estado.

**Uso actual:** Colección `PPC_Compromisos` ✅

### PPC (Percent Plan Complete)
**Definición LPS:** Indicador `PPC = compromisos cumplidos / compromisos totales` por semana. Mide confiabilidad del plan.

**Uso actual:** ✅ correcto.

### Restricción
**Definición LPS:** Cualquier obstáculo que impide ejecutar una tarea (falta de material, falta de información, falta de cuadrilla, frente no liberado, RFI sin respuesta).

**Uso actual:** Colección `VDC_Restricciones` ⚠️ — el prefijo `VDC_` confunde, restricciones son de LPS, no necesariamente de VDC.

**🔧 DECIDIR:** Renombrar a `Restricciones` (o `LPS_Restricciones`).

---

## 8. Earned Value Management (EVM)

> **Conflicto serio con S10:** "Valorización" en EVM y "Valorización" en S10 son cosas distintas.

### EV (Earned Value) / Valor Ganado
**Definición PMI:** Valor monetario del trabajo **realmente ejecutado** a la fecha, medido al precio del presupuesto. `EV = % avance × BAC`.

**Uso actual:** Campo `valorEjecutado` en [DashboardPlanMaestro.jsx:27](src/views/admin/DashboardPlanMaestro.jsx#L27) ✅ pero el nombre `valorEjecutado` puede confundirse con valorización S10.

### AC (Actual Cost) / Costo Real
**Definición PMI:** Costo realmente incurrido en el período.

**Uso actual:** Implícito en cálculo de CPI. ❌ Sin campo dedicado.

### PV (Planned Value) / Valor Planeado
**Definición PMI:** Valor monetario del trabajo **planificado** a la fecha.

**Uso actual:** ❌ no encontrado.

### BAC (Budget at Completion)
**Definición:** Presupuesto total del proyecto.

**Uso actual:** ❌ no encontrado como campo.

### CPI (Cost Performance Index)
**Definición:** `CPI = EV / AC`. CPI > 1 = bajo presupuesto.

**Uso actual:** ✅ implementado en [CpiEac.jsx](src/views/CpiEac.jsx).

### SPI (Schedule Performance Index)
**Definición:** `SPI = EV / PV`. SPI > 1 = adelantado.

**Uso actual:** ❌ no encontrado.

### EAC (Estimate at Completion)
**Definición:** Estimación del costo total al final, basada en performance actual. `EAC = BAC / CPI` (varias fórmulas).

**Uso actual:** ✅ implementado en [CpiEac.jsx](src/views/CpiEac.jsx).

### ETC (Estimate to Complete)
**Definición:** `ETC = EAC - AC`. Lo que falta gastar.

**Uso actual:** ❌ no encontrado.

### Curva S
**Definición:** Gráfico de avance acumulado (planificado vs real) en el tiempo. Forma de "S" porque el avance es lento al inicio, rápido en medio, lento al cierre.

**Uso actual:** Vista `CurvaS.jsx` ✅

---

## 9. Valorización (S10) — distinto de EV

### Valorización contractual
**Definición S10:** Documento mensual de **cobro al cliente** por el avance ejecutado en el mes, valorizado a precios contractuales. Va con un calendario de valorizaciones.

**Uso actual (verificado 2026-05-09):**
- Colección `ValorizacionesContractuales` → ✅ **única valorización realmente usada**. Schema: `numeroValorizacion`, `periodo {desde, hasta}`, `total`, `estado` (borrador/aprobada/pagada), `fechaPago`. Calculada automáticamente desde `Historial` + `PartidasContractuales` con `factorReajuste` y `porcAdelanto`. Ver [ValorizacionesView.jsx:31, 80](src/views/oficinatecnica/ValorizacionesView.jsx#L31).
- Colección `Valorizaciones` → **definida en `firestore.rules` pero CERO usos en el código** (colección fantasma).

**🔧 DECIDIR:**
- Eliminar colección fantasma `Valorizaciones` de `firestore.rules`
- ¿Renombrar `ValorizacionesContractuales` → `Valorizaciones`? Sufijo redundante (no hay otra)
- O dejarlo, aceptando que toda valorización en GRAPCO es contractual

### Adicional (de obra)
**Definición S10:** Trabajo no contemplado en el contrato original, autorizado por el cliente, que se cobra extra.

**Uso actual:** Colección `Adicionales` ✅

### Deductivo
**Definición S10:** Trabajo del contrato original que ya **no se ejecuta**, se descuenta.

**Uso actual:** ❌ no encontrado.

### Reajuste / DS 011-79-VC
**Definición Perú:** Fórmula polinómica para reajustar precios contractuales por variación de insumos. Norma del Ministerio de Vivienda.

**Uso actual:** Mencionado en rules ([firestore.rules:398](firestore.rules#L398)) ✅ término correcto.

### Resultado Operativo (RO)
**Definición Perú/contratistas:** Estado financiero interno del proyecto: ingresos valorizados − costos reales = margen.

**Uso actual:** Colección `RO_Mensual` ✅

---

## 10. Calidad / Seguridad / Oficina Técnica

### Protocolo
**Definición:** Documento de liberación de un elemento ejecutado (ej: protocolo de vaciado de columna eje A-1). Lo firma el supervisor/cliente.

**Uso actual:** Colección `Protocolos` ✅

### No Conformidad (NC)
**Definición ISO 9001:** Incumplimiento de un requisito (defecto, error). Se registra y se trata con acción correctiva.

**Uso actual:** Colección `NoConformidades` ✅. Equivalente al "NCR" inglés.

### RFI (Request For Information)
**Definición:** **Consulta formal** del contratista al diseñador/cliente sobre un detalle no claro de los planos/especificaciones. Bloquea avance hasta tener respuesta.

**Uso actual:** ❌ no existe. Se confunde con NoConformidades, pero es distinto:
- RFI = falta de información (consulta abierta)
- NC = trabajo mal hecho (defecto)

### PETS (Procedimientos Escritos de Trabajo Seguro)
**Definición Perú/SSO:** Documento que describe paso a paso una actividad y sus controles de seguridad.

**Uso actual:** Colección `PETs` ✅

### ATS (Análisis de Trabajo Seguro)
**Definición:** Identificación de peligros antes de iniciar una tarea no rutinaria.

**Uso actual:** ✅ término correcto.

### RDO (Reporte Diario de Obra)
**Definición:** Reporte que el residente/oficina técnica entrega al cliente cada día con avance, clima, personal, equipos, observaciones.

**Uso actual:** Colección `RDO` ✅

### Ensayo
**Definición:** Resultado de prueba de laboratorio (rotura de probeta, granulometría, etc.).

**Uso actual:** Colección `Ensayos` ✅

---

## 11. BIM / VDC

### BIM (Building Information Modeling)
**Definición:** Modelo 3D paramétrico del proyecto con información (no solo geometría).

**Uso actual:** Colecciones `BIM_Modelos`, `BIM_Vinculos` ✅

### VDC (Virtual Design and Construction)
**Definición Stanford CIFE:** Metodología que integra BIM + Lean + gestión de proyecto. **No es solo el modelo BIM**, es el proceso integrado.

**Uso actual:** ⚠️ Prefijo `VDC_Restricciones`, `VDC_Lecciones` — el término está bien pero las "restricciones" son LPS, no exclusivas de VDC.

### APS (Autodesk Platform Services)
**Definición:** Plataforma de Autodesk (antes Forge) para visualizar modelos en navegador.

**Uso actual:** [BimViewerAPS.jsx](src/views/BimViewerAPS.jsx) ✅

---

## 12. Roles del sistema

| Rol | Definición | En `firestore.rules` | En `App.jsx` |
|-----|------------|----------------------|--------------|
| `admin` | Control total | ✅ | ✅ |
| `ingeniero` | Planificación, gestión | ✅ | ✅ |
| `capataz` | Reporta tareo y producción | ✅ | ✅ |
| `almacenero` | Custodia almacén, kardex | ✅ | ✅ |
| `logistica` | Compras, OCs (comparte vistas con almacenero) | ✅ | ✅ item "Logística" en [App.jsx:18](src/App.jsx#L18), comparte vistas con almacenero ([App.jsx:425, 452](src/App.jsx#L425)) |
| `calidad` | Protocolos, NCs, ensayos | ✅ | ✅ |
| `oficina_tecnica` | RDO, valorizaciones, planos | ✅ | ✅ |
| `seguridad` | PETs, ATS, inspecciones | ✅ | ✅ |
| `supervisor_cliente` | Lectura, aprobación protocolos | ✅ | ✅ |
| `subcontratista` | Reporta su alcance | ✅ | ✅ |
| `carta_balance` | Usuario que solo registra cartas balance (muestreo de productividad en sitio) | ⚠️ no listado como rol formal en `firestore.rules` (no tiene `isCartaBalance()`) | ✅ rol completo: opción en [Login.jsx:306](src/views/Login.jsx#L306), sidebar en [App.jsx:16](src/App.jsx#L16), vista propia ([App.jsx:424](src/App.jsx#L424)) |

**🔧 DECIDIR (verificado 2026-05-09):**
- `logistica` ya tiene navegación (comparte vistas con almacenero) — quedaba duda en el diccionario inicial, **resuelto**
- `carta_balance` SÍ es un rol del sistema: usuario externo (típicamente practicante/observador) que solo accede a la vista CartaBalance para registrar muestreos. Falta agregarlo formalmente a `firestore.rules` con `isCartaBalance()` y permisos de escritura solo en colección `Cartas_Balance`.

---

## 13. Convenciones de auditoría

### Campos de timestamp
**Convención propuesta:**
- `creadoEn` / `creadoPor` — al insertar
- `actualizadoEn` / `actualizadoPor` — al modificar

**Uso actual:** ⚠️ inconsistente. Algunos documentos usan `timestamp` solo, otros usan `creadoEn`/`actualizadoEn`.

**🔧 DECIDIR:** estandarizar a `creadoEn` + `actualizadoEn` (en español, alineado con el resto).

---

## Resumen de decisiones pendientes

Decisiones marcadas con 🔧 a lo largo del documento. Resumen ordenado por impacto, con verificación al 2026-05-09.

### ✅ Falsas alarmas (verificadas, todo OK)
- ~~PECOSA mal clasificada~~ → está bien, en tab Salida correcto
- ~~Rol `logistica` sin navegación~~ → SÍ tiene sidebar (comparte con almacenero)
- ~~Rol `carta_balance` ambiguo~~ → ES rol válido, solo falta formalizarlo en `firestore.rules`

### Alto impacto (afectan modelo de datos)
1. **Partida**: eliminar colección fantasma `Partidas` (cero usos en código). Decidir si renombrar `PartidasContractuales` → `Partidas` (única que se usa).
2. **Valorización**: eliminar colección fantasma `Valorizaciones` (cero usos en código). Decidir si renombrar `ValorizacionesContractuales` → `Valorizaciones`.
3. **PlanMaestro**: aceptar nombre actual (es híbrido WBS+Cronograma, no solo WBS) y documentarlo. NO renombrar.
4. **Tareo separado**: ¿colección `Tareos` propia o seguir embebido en `Registros_Campo`?
5. **proyectoId/frenteId** en colecciones huérfanas (Almacenes, Kardex, Cartas_Balance, Registros_Campo) — ya conocido en memoria

### Medio impacto (renombrar campos/vistas)
6. **`obra` (string libre)** → `proyectoId` (FK) en Capataz, PlanDiario, CartaBalance
7. **`produccion` (string libre)** → `notasProduccion` u `observaciones` para no chocar con métrica de productividad
8. **`CuadrillasActivas`** (variable en memoria) → `cuadrillasPorCapataz` (es índice derivado, no entidad)
9. **`VDC_Restricciones`** → `Restricciones` o `LPS_Restricciones` (las restricciones son LPS, no exclusivas de VDC)
10. **`hn`/`he`/`totalHH`/`hhEn`/`hhAcumuladasDia`** estandarizar y documentar fórmulas centralmente

### Bajo impacto (limpieza)
11. Formalizar rol `carta_balance` en `firestore.rules` con `isCartaBalance()` + permisos solo en `Cartas_Balance`
12. Estandarizar auditoría a `creadoEn`/`actualizadoEn` (eliminar usos sueltos de `timestamp`)
13. Agregar `peón` a lista de cargos (constants.js) — relevante para régimen construcción civil
14. Aclarar `Subcontratos` colección y su relación con rol `subcontratista`

### Conceptos faltantes (no es renombrar, es modelar — fuera del scope del diccionario)
- `Cotizaciones` y `Proveedores` (compras formales)
- `Lookahead` y `PlanSemanal` (LPS completo)
- `RFI` (calidad/oficina técnica)
- `Planilla` (RRHH — pago de jornales)
- `Rendimiento` por partida (presupuesto S10)
- `Deductivo` (S10)
- `SPI`, `BAC`, `PV`, `ETC` (EVM completo)
- Multi-moneda y configuración por proyecto (ya en memoria)

---

*Documento generado el 2026-05-09 a partir de auditoría del código. Verificaciones de campo el mismo día (PECOSA, carta_balance, logistica, PlanMaestro, Partidas/Valorizaciones fantasma).*
