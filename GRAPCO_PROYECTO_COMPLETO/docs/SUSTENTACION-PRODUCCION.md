# Sustentación — Área de Producción y Recolección de Data (GRAPCO)

> Documento de apoyo para la defensa del proyecto. Aterriza cada pregunta y observación
> en lo que **realmente está implementado** en la plataforma (con cita de archivo:línea),
> y separa lo terminado de la hoja de ruta. Segmento objetivo: **medianas y pequeñas empresas constructoras**.
>
> Última actualización: 2026-06-18.

---

## 0. Conceptos base (hablar con propiedad)

De aquí cuelga todo lo demás. Usar este lenguaje de forma consistente en la sustentación.

| Concepto | Qué es en la plataforma | Cómo se calcula | Dónde vive |
|---|---|---|---|
| **IP (Índice de Productividad)** | HH que cuesta producir una unidad de obra | `IP = HH gastadas / Metrado` | `helpers.js:242` |
| **IP Meta** | El IP objetivo de la partida | Catálogo WBS / APU; si no existe, **promedio histórico** (×0.90) | `helpers.js:246-266`, `constants.js` |
| **ISP** | **Informe Semanal de Producción** (NO "saturación de personal") | Consolida por semana: metrado, HH real, HH meta, **CPI = HH Meta/HH Real**, varianza | `ispParser.js:2`, `CpiEac.jsx:208-260` |
| **CPI (= "el ISP" como KPI)** | Índice de desempeño en HH | `CPI = HH Meta / HH Real` (>1 = bien) | `Tendencias.jsx:393` lo etiqueta literal "(= ISP)" |

**La cadena de datos completa (el "Gran lenguaje de datos"):**

> El capataz entra **metrado + reparto de horas (tareo)** → de ahí sale el **IP real** →
> se agrega por semana en el **ISP/CPI** → alimenta el **RO** (margen, EAC, alertas predictivas).

**Punto crítico:** el dato que nadie puede calcular ni inferir es el **metrado ejecutado del día**
(y el **reparto de horas por persona entre actividades**). Las HH totales pueden venir del marcador
facial; el costo, del APU; la valorización, del contrato. Pero *cuánto se construyó hoy* y *quién lo hizo*
solo lo sabe quien está en el frente. Eso justifica el rol del capataz (ver §2.3).

---

## 1. Preguntas de la lista

### 1.1 Predicción del ISP *(Franklin)* — ✅ implementada

No es promedio simple: la plataforma hace **regresión lineal ponderada por recencia** sobre la serie semanal del CPI.

- **Motor:** `calcularTendenciaPond()` (`helpers.js:367`) + `proyectarFuturo()` (`helpers.js:405`).
- **Cómo funciona:**
  1. Toma la serie de CPI semana a semana.
  2. Pondera con decaimiento exponencial `decay = 0.82` → **las últimas semanas pesan ~2× más** (la obra de hoy se parece más a la de la semana pasada que a la del mes pasado).
  3. Proyecta **4 semanas hacia adelante** (`Tendencias.jsx:124`).
  4. Dibuja **bandas de confianza ±1σ** (`bandaSup` / `bandaInf`).
  5. **Solo proyecta si R² ≥ 0.40** (`Tendencias.jsx:119`) — si los datos son muy ruidosos, no inventa predicción.
- **Para qué sirve:** proyectar fecha de cierre, EAC, y disparar la alerta *"actividades rumbo a exceder presupuesto"* (`alertasPredictivas.js:152`).

> **Frase para la defensa:** *"Nuestra predicción no afirma un número exacto; entrega una tendencia
> con banda de confianza y se autocensura cuando R²<0.4. La honestidad estadística está en el código,
> no en el discurso."*

### 1.2 Validación de la solución — mostrar resultados *(María)*

KPIs **reales** que ya produce la plataforma:

- **EVM completo** por partida y global: **CPI, SPI, EAC, VAC** (`planMaestroAnalytics.js:386-394`).
- **Margen real vs aplicado** (control de costo, meta 15%).
- **CPI de productividad** (HH meta/real) — en CREDITEX salió ~1.11.
- **PPC** (cumplimiento Last Planner).
- **Carta Balance:** LUF, %TP/TC/TNC (trabajo productivo / contributorio / no contributorio).
- **Resultado-bandera:** el ISP que antes tomaba *días de Excel manual* ahora es **tiempo real**.

### 1.3 Interpretar y sintetizar resultados *(Franklin)*

La síntesis no es "el CPI es 1.11", es **qué decisión habilita**:

> *Dato crudo* (capataz: 30 m³, 240 HH) → *Indicador* (IP real 8 HH/m³ vs meta 7) →
> *Diagnóstico* (esta partida pierde 14% de productividad) → *Predicción* (a este ritmo cierra
> 12% sobre presupuesto en 4 sem) → **Decisión** (refuerzo de cuadrilla / cambio de método ESTA
> semana, no al final).

Propuesta de valor: **convertir registro en decisión temprana.** El manual da el resultado *después*;
la plataforma lo da *a tiempo para corregir*.

### 1.4 Acotar la solución a empresas medianas–pequeñas *(Franklin)*

La solución está **diseñada** para ese segmento (no adaptada). Evidencia en el código:

| Decisión de diseño | Por qué encaja en mediana/pequeña |
|---|---|
| **Costo S/0** (Firebase free, sin Blaze) | No pueden pagar S10/SAP ni licencias BIM |
| **Offline-first** (IndexedDB + Service Worker) | Obras sin señal; no dependen de internet en campo |
| **Costo MO único S/25.50/h** | No tienen planilla compleja por cargo; una tarifa = cuadra con su CR |
| **Capataz con celular** (no PC en obra) | No tienen oficina técnica desplegada en el frente |

El "techo" del segmento es lo que justifica la solución: **la oficina técnica es limitada (1–2 personas)**.
La plataforma automatiza lo que una empresa grande haría con un *cost controller* dedicado.

---

## 2. Comentarios de Vilcapoma (objeciones a blindar)

### 2.1 "Los resultados no son 100% exactos" (30 vs 30.024 m³) *(María-Franklin)*

No negarlo: convertirlo en **fortaleza metodológica**.

- El sistema entrega **estimaciones para decidir**, no mediciones topográficas. El metrado del capataz ya es una estimación de campo.
- El ejemplo 30 vs 30.024 demuestra que *incluso dos mediciones "reales" difieren* → la exactitud absoluta no existe ni en el método manual.
- Lo que importa para decidir es **tendencia y oportunidad**, no el tercer decimal. Un CPI 1.10 vs 1.09 no cambia ninguna acción.
- **El PMBOK respalda esto:** las estimaciones tienen rango (orden de magnitud −25%/+75% → definitiva −5%/+10%). Decir "no es 100% exacto" **alinea** la solución con el estándar.
- El código ya gestiona la imprecisión: bandas ±1σ, censura R²<0.4, tolerancia IP×1.05, **% sin decimales** en UI.

### 2.2 Medidas para minimizar error / valores incoherentes del capataz *(Franklin)*

**Lo que YA existe** (`Capataz.jsx`):

1. **Tope legal de horas** bloqueante: máx 8.5h L-V, sáb sin tope, dom solo HE (`:717-733`).
2. **Validación de datos básicos:** partida/subpartida/actividad/metrado/HH obligatorios, metrado ≥ 0 (`:685-694`).
3. **IP bajo → exige evidencia:** si `IP real > IP meta × 1.05`, no deja subir sin observación + foto (`:698-709`).
4. **Doble capa:** borrador (`Borradores_Capataz`) vs oficial (`Registros_Campo`).
5. **Fecha limitada a hoy/ayer** (no se puede "maquillar" el pasado).

**Hoja de ruta** (según la lista de Vilcapoma):

1. **Manual** → SOP de 1 página + capacitación.
2. **Plan Diario como base** → el capataz **confirma contra un plan precargado** en vez de llenar en blanco. Ya existe `PlanDiario.jsx` + `autocompletarEjecutado()`; falta enchufarlo al flujo del capataz.
3. **Límites duros de metrado** → tope máximo plausible por día = *cuadrilla × jornada / IP meta*. Si registra 300 m³ con 4 peones, alerta.
4. **★ IP diario vs banda histórica** (la de mayor valor y aún NO existe): comparar el IP de hoy contra el **IP histórico rodante** de esa partida con un margen (±X%). Hoy solo se compara contra IP meta fijo (×1.05), no contra el histórico real.
5. **★ Cuadre de horas por marcador** (ver §3): la suma de HH repartidas por persona debe igualar el total presente registrado por el marcador facial → atrapa valores incoherentes sin trabajo extra del capataz.

### 2.3 Justificar POR QUÉ el capataz llena el metrado *(María)*

**El metrado es el único dato no-derivable de la cadena** (junto con el reparto de horas, §3):

- Las HH totales salen del marcador; el costo, del APU; la venta, del contrato. **El metrado ejecutado del día y el reparto de horas por actividad solo existen en la cabeza de quien está en el frente.**
- Sin metrado **no hay:** IP real, avance físico (EV), CPI, valorización, predicción. *Todo* lo demás se cae.
- Subirlo a la oficina = retraso + "teléfono malogrado" (errores de transcripción).
- El capataz es quien **menor costo y mayor precisión** tiene para medirlo (ya está ahí).
- Es lo que convierte la plataforma de un *reloj de horas* en un *sistema de productividad*.

> **Tensión real:** "es lo más necesario" choca con "es lo más difícil de conseguir". La solución no
> es quitar el metrado, es **quitarle al capataz TODO lo demás** para que ese (y el reparto de horas)
> sea su único trabajo (ver §3).

### 2.4 Factores que validan la solución

- **Económico [ISP]:** la detección temprana de sobrecostos (alerta predictiva) protege el margen *antes* de perderlo. En mediana/pequeña, la oficina técnica no alcanza a hacerlo a mano y a tiempo. Infraestructura: **S/0**.
- **Personal profesional limitado:** la solución **sustituye mano de obra calificada escasa** (un controlador de costos) por automatización. Ese es el corazón de la propuesta de valor para el segmento.

---

## 3. Recolección de data del capataz: lo insustituible vs lo automatizable

### El marcador facial da el TOTAL, no el reparto

El marcador facial sabe que **Juan estuvo presente 7.5h hoy**. Lo que **no sabe** —y nunca podrá saber—
es que Juan hizo *4h en vaciado y 3.5h en encofrado*. Esa **repartición de HH por persona entre
actividades** es conocimiento de campo que solo tiene el capataz... **igual que el metrado.**

**El capataz captura DOS datos insustituibles, no uno:**

| Dato irreemplazable | Responde a | Por qué no se puede automatizar |
|---|---|---|
| **Metrado por actividad** | ¿Qué se construyó? | Solo lo mide quien está en el frente |
| **Reparto de HH por persona × actividad** | ¿Quién hizo qué? | El marcador da el total, no en qué se gastó |

Todo lo demás (presencia, horas totales, puntualidad, costo, valorización, predicción) lo hace la plataforma.
Esto **refuerza** la respuesta a Vilcapoma #3.

### La automatización no se cae — cambia de forma

El marcador **no elimina** el tareo; lo convierte de *teclear* a *repartir un presupuesto fijo*:

- **Antes:** el capataz teclea horas absolutas por persona por actividad → puede inventar, equivocarse, exceder (asignar 12h a alguien que estuvo 7.5h).
- **Después:** el marcador **fija el total real de cada persona** (Juan = 7.5h). El capataz solo **distribuye ese total** entre las actividades del día.

Lo que se gana:

- **Menos digitación** → el total ya viene dado.
- **Auto-validación dura** → la suma repartida **debe** igualar el total presente. Imposible asignar más horas de las que la persona estuvo. *Mata los "valores incoherentes" de Vilcapoma #2 sin pedirle nada extra al capataz.*
- **HN/HE automático** → el total se parte solo en normal + extra según el tope legal existente (`Capataz.jsx:717`).
- **Alerta de residuo** → "Juan tiene 2h sin asignar a ninguna actividad" → atrapa olvidos.

### Default inteligente para bajar la fricción

La mayoría de trabajadores hace **1 sola actividad al día**. Entonces:

- Si una persona aparece en **una** actividad → se le asigna su total **automáticamente** (el capataz no toca nada).
- El capataz **solo interviene** cuando un trabajador tocó **2+ actividades** (la minoría) → reparte con slider/% en vez de teclear.

> **Alcance redefinido de la mejora #1:** no es "quitar el tareo". Es: *el marcador fija el total por
> persona → el capataz solo reparte ese total entre actividades (con default automático si es una sola)
> → el sistema valida que cuadre.* El reparto sigue siendo del capataz (insustituible), pero pasa de
> **inventar números** a **distribuir una bolsa cerrada y verificada**.

---

## 4. Matrices

### 4.1 Matriz de Stakeholders (Poder × Interés)

| Stakeholder | Poder | Interés | Estrategia | Rol en la solución |
|---|---|---|---|---|
| **Ing. Producción / Residente** | Alto | Alto | **Gestionar de cerca** | Beneficiario principal (decide con la data) |
| **Gerencia / Dueño** | Alto | Medio-Alto | **Gestionar de cerca** | Quiere margen y predictibilidad |
| **Cliente / Mandante** | Alto | Bajo-Medio | Mantener satisfecho | Recibe valorizaciones |
| **Oficina Técnica** | Medio | Alto | Mantener informado | Deja de hacer Excel manual |
| **Capataz** | Bajo | Alto | **Crítico para el éxito** | **Fuente del dato** (metrado / reparto de horas) |
| **Obreros** | Bajo | Bajo | Monitorear | Sujetos del dato (tareo) |
| **Valtana (proveedor)** | — | Alto | Ejecutor | Desarrolla / sostiene la plataforma |

> **Lección:** el capataz tiene **poco poder pero es el cuello de botella del éxito**. La adopción
> depende de bajarle la fricción, no de imponerle más trabajo.

### 4.2 Matriz Trade-off (qué sacrificamos)

| Dimensión | GRAPCO (la solución) | ERP comercial (S10/SAP) | Excel/Manual (status quo) | **Qué se sacrifica** |
|---|---|---|---|---|
| **Costo** | S/0 | S/ miles + licencias | "Gratis" (caro en horas) | Nada — se gana aquí |
| **Tiempo a dato** | Tiempo real | Tiempo real | Días | Nada — se gana aquí |
| **Precisión costo MO** | 1 tarifa (S/25.50/h) | Planilla por cargo | Variable | **Granularidad de planilla** |
| **Precisión metrado** | Estimación del capataz | Igual (depende de campo) | Igual | **Exactitud topográfica** |
| **Funciones avanzadas** | EVM + predicción | BIM 4D, takeoff automático | Ninguna | **BIM / takeoff automático** |
| **Soporte/escala** | Free tier (límites) | Soporte enterprise | N/A | **Escalabilidad enterprise** |
| **Adopción** | Celular, offline | Capacitación pesada | Inmediata pero frágil | Nada — se gana aquí |

> **Síntesis del trade-off:** *"Sacrificamos granularidad de planilla, exactitud topográfica y funciones
> BIM —que la mediana/pequeña empresa no necesita ni puede costear— a cambio de costo cero, tiempo real
> y adopción en campo. Es el trade-off correcto para el segmento."*

---

## 5. Hoja de ruta de mejoras (adopción del capataz)

Riesgo #1 del proyecto: **si el capataz no llena, no hay nada.** La estrategia no es "obligarlo más",
es **reducir su trabajo a lo insustituible** (metrado + reparto de horas).

| Mejora | Esfuerzo | Impacto en adopción |
|---|---|---|
| Total de HH desde marcador facial → capataz solo reparte (default automático si es 1 actividad) | Medio | 🔥🔥🔥 |
| Plan Diario precargado → confirmar en vez de llenar en blanco | Medio | 🔥🔥🔥 |
| Banda de IP histórico → atrapa el error sin trabajo extra del capataz | Medio | 🔥🔥 |
| Cuadre de horas (Σ repartido = total presente) + alerta de residuo | Bajo | 🔥🔥 |
| Captura por voz / 1-tap para metrado | Alto | 🔥🔥 |
| Campo "Premio" (ya existe en Plan Diario) como incentivo de cumplimiento | Bajo | 🔥 |

---

## 6. Autorreflexión *(Franklin–María)* — marco sugerido

Es personal de los autores; marco propuesto:

- **Técnico:** Firebase, EVM/PMI, Lean Construction, predicción estadística.
- **Gestión:** el dato muere si el usuario de campo no lo adopta → diseñar para la fricción del capataz, no para el ingeniero.
- **Qué haría distinto:** validar la adopción en campo *antes* de construir features.

---

## Anexo — Estado de implementación (terminado vs pendiente)

| Componente | Estado | Cita |
|---|---|---|
| Definición y cálculo ISP/CPI | ✅ Funciona | `ispParser.js:2,128-129`, `CpiEac.jsx:237-242` |
| Predicción del ISP (regresión ponderada) | ✅ Funciona | `helpers.js:367-422`, `Tendencias.jsx:119-124` |
| Alertas predictivas | ✅ Funciona | `alertasPredictivas.js:60-196` |
| Exportación ISP semanal (Excel) | ✅ Funciona | `CpiEac.jsx:208-260` |
| RO / EVM (CPI, SPI, EAC, VAC) | ✅ Funciona | `planMaestroAnalytics.js:386-606`, `useRO.js` |
| Validaciones del capataz (4 niveles) | ✅ Funciona | `Capataz.jsx:685-733` |
| Importador ISP desde Excel | ❌ Roto (85 cols vs 65 del parser) | `AUDITORIA-COSTOS-OT.md:19,178` |
| Integración columna ISP del F06 | ⚠️ Pendiente | `AUDITORIA-COSTOS-OT.md:201` |
| Total HH desde marcador → reparto del capataz | ⚠️ Por implementar | §3 |
| Banda de IP histórico diario | ⚠️ Por implementar | §2.2 #4 |
| Plan Diario precargado al flujo del capataz | ⚠️ Por implementar | §2.2 #2 |
