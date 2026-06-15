# 🗺️ MAPA DE LA INFORMACIÓN — GRAPCO 2026
### Cómo viaja un dato: de la obra al tablero (Producción · Planeamiento · Costos)

> **Para qué sirve este documento.** Es un mapa para *explicarle a cualquier trabajador* de dónde sale y a dónde
> llega cada número de la plataforma. No hace falta saber programar: cada módulo tiene una ficha
> **ENTRA → SE PROCESA → SALE** y se indica **de qué módulo/base de datos jala** cada dato.
> Los nombres en `código` son los módulos reales (archivos) y las **COLECCIONES** son las "carpetas" de la base de datos (Firestore).

> **Las 3 fuentes únicas de la verdad** (todo nace de aquí):
> | Qué | Colección | Quién la llena |
> |---|---|---|
> | Estructura de la obra + metas (WBS, metrado, IP meta) | `Catalogo_WBS` | Oficina Técnica / Planeamiento |
> | Lo que de verdad se hizo en el campo (tareo, metrado, horas) | `Registros_Campo` | Capataz (en obra) |
> | El plan de ejecución mensual y valorizado | `PlanMaestro` | Planeamiento / Costos |
>
> **Regla de oro:** un dato se escribe **una sola vez en su fuente** y todos los tableros lo **leen** de ahí. Así nunca hay dos verdades.

> **Cómo está organizado:** **PARTE A** = Producción & Planeamiento (cómo se planea y cómo el campo retroalimenta el avance).
> **PARTE B** = Costos, Resultado Operativo y Valorizaciones (de dónde jala cada sol).

---

# MAPA DEL FLUJO DE INFORMACIÓN — PARTE A
## PRODUCCIÓN & PLANEAMIENTO (Plataforma GRAPCO 2026)

> **¿Qué es esto?** Un mapa que muestra el "viaje" de un dato desde que el capataz lo escribe en la obra hasta que se convierte en un semáforo (verde/rojo) en el tablero del ingeniero. Está escrito para que cualquier trabajador entienda **de dónde sale** y **a dónde llega** cada número, sin perder los nombres reales de los módulos y las colecciones de la base de datos (Firestore).

---

## 0. LA IDEA EN UNA FRASE

La obra funciona como un **cuerpo humano**:
- El **cerebro que planifica** (Catálogo WBS + Cronograma) decide qué hacer y cuándo.
- Las **manos que trabajan** (Capataz + Marcador facial) registran lo que de verdad pasó.
- La **sangre** que lleva la información de las manos al cerebro es la colección **`Registros_Campo`** (los tareos).
- El **panel de control** (RO / Dashboard del Ingeniero) lee la sangre y enciende semáforos.

Hay dos sentidos de circulación:
1. **DE ARRIBA HACIA ABAJO (se planea):** Catálogo WBS → Cronograma CPM → Last Planner → Plan Diario.
2. **DE ABAJO HACIA ARRIBA (se retroalimenta):** Tareos del campo → avance % automático → Curva S → CPI/SPI → alertas.

---

## 1. DIAGRAMA DE FLUJO EN BLOQUES (ASCII)

### 1.1 Planificación (DE ARRIBA HACIA ABAJO)

```
   +-------------------------------+
   |  EditorWbsIsp.jsx             |   El ingeniero ingresa partidas,
   |  (Catálogo WBS - Editor)      |   subpartidas, actividades,
   |  ENTRA: nombres, metrados, IP |   metrados e IP meta.
   +---------------+---------------+
                   |  escribe
                   v
   +-------------------------------+
   |  COLECCIÓN: Catalogo_WBS/      |  <==== FUENTE ÚNICA de la estructura
   |  {proyectoId}                 |        (INFO_MAP, CATALOGO_MASTER)
   +---------------+---------------+
                   | lee (useCatalogoWBS hook)
                   v
   +-------------------------------+
   |  autoprograma.js              |   Convierte metrados -> HH ->
   |  (Generador automático)       |   duración por cuadrilla ->
   |  metrado x IP = HH            |   tren SS+lag
   +---------------+---------------+
                   |  genera tareas
                   v
   +-------------------------------+        +------------------------+
   |  CronogramaPro.jsx + cpm.js   |------->| Curva S (program. vs   |
   |  (CPM: ES/EF/LS/LF, ruta      |        | baseline vs real)      |
   |   crítica, holguras, baseline)|        +------------------------+
   +---------------+---------------+
                   |  escribe
                   v
   +-------------------------------+
   |  COLECCIÓN: Cronogramas/       |  <==== FUENTE ÚNICA del cronograma
   |  {proyectoId}                 |
   +-------+---------------+-------+
           | lee           | lee
           v               v
  +-----------------+   +-----------------------+
  | LastPlannerPro  |   | PlanDiario.jsx        |
  | (LOOKAHEAD 4sem,|   | (rubro-responsable:   |
  |  plan semanal,  |   |  metrado x IP = HH    |
  |  PPC, CNC)      |   |  programado)          |
  +--------+--------+   +-----------------------+
           | escribe
           v
  +-----------------+      +------------------------+
  | LPS/{proyectoId}|<---->| VDC.jsx                |
  | (compromisos,   |      | (VDC_Restricciones,    |
  |  PPC, causas)   |      |  cierre semanal,       |
  +-----------------+      |  Pareto RNC)           |
                          +------------------------+
```

### 1.2 Producción del campo y retroalimentación (DE ABAJO HACIA ARRIBA)

```
   +----------------------------+        +-----------------------------+
   | MarcadorAsistencia.jsx     |        | Capataz.jsx + EditorActividad|
   | (cámara, rostro -> HH)     |        | (cuadrilla, WBS, metrado,    |
   | ENTRA: rostro + hora       |        |  HN/HE por trabajador)       |
   +-------------+--------------+        +--------------+--------------+
                 | escribe                              | importa HH (match nombre)
                 v                                      |
   +----------------------------+                       |
   | COLECCIÓN: Asistencia_Diaria| <---------------------+
   | (entrada/salida real +     |
   |  normalizada, horasTrabaj.)|
   +----------------------------+
                                                        | escribe (UPSERT)
                                                        v
                                  +----------------------------------------+
                                  | COLECCIÓN: Registros_Campo             | <=== LA "SANGRE"
                                  | {fecha, semana, partida, actividad,    |      Fuente ÚNICA de
                                  |  metrado, totalHH, ipReal,             |      metrado + HH reales
                                  |  detalleTareo[], fotos[], proyectoId}  |
                                  +-----+------------------+---------------+
                                        | lee              | lee (onSnapshot)
                                        v                  v
              +--------------------------------+   +---------------------------+
              | CronogramaPro.sincronizarAvance|   | Ingeniero.jsx             |
              | % = metrado ejec / metrado tot |   | (auditoría, CPI/SPI sem., |
              | (RETROALIMENTA el cronograma)  |   |  IP real vs meta, fotos)  |
              +--------------------------------+   +-------------+-------------+
                                                                 |
                                                                 v
   +-----------------------------------------------------------------------------+
   | useRO.js (hook) carga 11 COLECCIONES en paralelo:                           |
   | PlanMaestro · APUs · Registros_Campo · Kardex_Movimientos ·                 |
   | ValorizacionesContractuales · Registro_Facturas ·                          |
   | ValorizacionesSubcontratistas · GG_Oficina · Adicionales · Deductivos      |
   +------------------------------------+----------------------------------------+
                                        | llama
                                        v
   +-----------------------------------------------------------------------------+
   | planMaestroAnalytics.js -> calcularROMensual() / calcularEVM()              |
   | AC = HHx25.5 + Kardex + Facturas + SC | EV = valorizado o avance x PU       |
   | BAC = metrado x PU | CPI = EV/AC | SPI = EV/PV | EAC = BAC/CPI              |
   +------------------------------------+----------------------------------------+
                                        | sube KPIs
                                        v
   +----------------------------+   +----------------------------+
   | Dashboard / RO Oficial     |   | WarRoomCuadrillas.jsx      |
   | (CPI/SPI, margen, severidad)|   | (lee Cartas_Balance ->     |
   +----------------------------+   |  LUF, Pareto TNC)          |
                                    +-------------+--------------+
                                                  v
                                    +----------------------------+
                                    | OptimizadorCuadrillas.jsx  |
                                    | (greedy -> cuadrilla óptima)|
                                    +----------------------------+
```

---

## 2. MINI-FICHAS POR MÓDULO (ENTRA → SE PROCESA → SALE)

> Cada ficha dice qué **entra** (input), qué **cálculo** se hace, qué **sale** (output), y **de dónde jala** cada dato (colección Firestore).

### 2.1 PLANEAMIENTO (se define la obra)

---

#### 🧱 Catálogo WBS — Editor (`EditorWbsIsp.jsx`)
*Es el "plano maestro": aquí se define TODA la obra en pedacitos.*

| | |
|---|---|
| **ENTRA** | Partidas / subpartidas / actividades, unidades, **metrados por frente**, **IP de presupuesto**. Frentes del proyecto. |
| **SE PROCESA** | `HH contractual = Σ(metrado frente × IP frente)` · `HH meta = metrado × IP meta` · `IP contractual = HH contractual ÷ metrado` |
| **SALE** | Árbol WBS + **INFO_MAP** (nombre → {unidad, metrado, IP, terminada}) + **CATALOGO_MASTER** |

**De dónde jala cada dato:**
| Dato | De dónde | A dónde |
|---|---|---|
| Estructura/metrados | escribe en `Catalogo_WBS/{proyectoId}` | la lee TODO el sistema |
| Nombre/plazo/fechas | colección `Proyectos` | columnas del editor |
| Frentes | colección `Frentes` | columnas de oferta |
| Catálogo legacy | `CATALOGO_MASTER` (hardcoded) si el proyecto no tiene catálogo propio | respaldo CREDITEX |

---

#### 🔌 useCatalogoWBS (hook) (`src/hooks/useCatalogoWBS.js`)
*El "repartidor" que entrega el plano maestro a todos los módulos.*

| | |
|---|---|
| **ENTRA** | `proyectoId` del contexto activo |
| **SE PROCESA** | `arbolACatalogoMaster()` y `arbolAInfoMap()` (índice por nombre normalizado para cruzar tareo↔catálogo) |
| **SALE** | `{ loading, arbol, existe, catalogoMaster, infoMap }` |
| **Jala de** | `Catalogo_WBS/{proyectoId}` (snapshot en vivo); si no existe → catálogo hardcoded legacy |

---

#### 🤖 autoprograma.js (Generador automático)
*Convierte metrados en un cronograma listo, sin armarlo a mano.*

| | |
|---|---|
| **ENTRA** | Árbol WBS con metrados; opciones (`horasDia=8`, `cuadrillaDefault=4`, `ritmoFrac=0.5`, `duracionObjetivoDias`) |
| **SE PROCESA** | `HH = metrado × IP` · `Duración(días) = ceil(HH ÷ (nº obreros × horas/día))` · `Lag = round(duracionPrevia × ritmoFrac)` (tren SS+lag) · compresión a plazo objetivo |
| **SALE** | `{ tareas, resumen }` listo para CronogramaPro |
| **Jala de** | Catálogo WBS (HH), `SECTORIZACION` (cuadrillas reales por actividad), `CUADRILLA_POR_TIPO` (cuadrilla típica por patrón) |

---

#### 📅 CronogramaPro (`CronogramaPro.jsx`) + cpm.js
*El "MS Project" de GRAPCO: calcula fechas, ruta crítica y avance automático.*

| | |
|---|---|
| **ENTRA** | Tareas `{id, nombre, nivel, duracion, predecesoras, avance}`, fecha de inicio, `Registros_Campo` (para sincronizar avance), INFO_MAP del catálogo |
| **SE PROCESA** | **CPM Forward Pass** (ES/EF) · **Backward Pass** (LS/LF) · `Holgura = LS − ES` · `Ruta crítica = holgura ≤ 0` · Roll-up de resúmenes · **`sincronizarAvance`: % = (metrado ejecutado ÷ metrado total) × 100** |
| **SALE** | Cronograma editado, % de avance sincronizado **sin doble digitación**, Curva S, baseline congelada |

**De dónde jala cada dato:**
| Dato | De dónde | A dónde |
|---|---|---|
| Tareas/baseline | `Cronogramas/{proyectoId}` | el propio Gantt |
| Metrado ejecutado | `Registros_Campo` (filtro proyectoId) | sincronizar avance |
| Metrado total | `Catalogo_WBS` (vía useCatalogoWBS / infoMap) | regla de 3 del % |

---

#### 🎯 LastPlannerPro (`LastPlannerPro.jsx`)
*El "compromiso semanal": qué prometemos hacer y si lo cumplimos.*

| | |
|---|---|
| **ENTRA** | `Cronogramas/{proyectoId}` (para el LOOKAHEAD), `LPS/{proyectoId}` (restricciones, compromisos, PPC) |
| **SE PROCESA** | LOOKAHEAD = tareas CPM de las próximas 4 semanas · **`PPC = compromisos cumplidos ÷ compromisos totales × 100`** · Pareto de causas CNC |
| **SALE** | `LPS/{proyectoId}`: restricciones, compromisos (`cumplido` null/true/false), causa CNC · tendencia PPC · Pareto RNC |
| **Jala de** | `Cronogramas` (LOOKAHEAD) y `LPS` (estado de compromisos) |

---

#### 🗂️ PlanDiario (`PlanDiario.jsx`) — formato F06
*El parte del día: lo programado contra lo ejecutado.*

| | |
|---|---|
| **ENTRA** | Planes del día, cuadrillas activas, catálogo base (CATALOGO_MASTER / INFO_MAP) |
| **SE PROCESA** | `HH programado = metrado × IP` · `IP real = HH ejecutado ÷ metrado ejecutado` · `% avance = (metrado ejecutado ÷ metrado programado) × 100` |
| **SALE** | Plan diario guardado: grupos `[{titulo, items[]}]`, obra, residente, producción, fecha |
| **Jala de** | Planes diarios históricos + CATALOGO_MASTER/INFO_MAP (sugerencias de actividades) |

---

#### 🚦 VDC.jsx (Last Planner — ejecución de restricciones)
*El "destrabe": qué bloquea la obra y cómo se libera.*

| | |
|---|---|
| **ENTRA** | `VDC_Restricciones` (estados pendiente/en progreso/liberada), `VDC_Lecciones`, LAP base (`lapCreditex`), AR base (`arCreditex`) |
| **SE PROCESA** | Restricciones activas = AR base (menos borradas) + Firestore · lookup por actividad normalizada · PPC + Pareto RNC |
| **SALE** | `VDC_Restricciones` (crear/editar/eliminar), `Configuracion/arEdits_{proyectoId}` (overrides del usuario), tablero PPC/Pareto |
| **Jala de** | `VDC_Restricciones`, `VDC_Lecciones`, data hardcoded LAP/AR, `Configuracion/arEdits_{proyectoId}` |

---

#### 📐 PullPlanning (`PullPlanning.jsx`, F14) y SectorizacionTren (`SectorizacionTren.jsx`, F09)
*Vistas de "tren Lean" — solo lectura, data estática de CREDITEX.*

| | |
|---|---|
| **ENTRA** | `PULLPLANNING` / `SECTORIZACION` (estructuras hardcoded) |
| **SE PROCESA** | KPIs (actividades, días, HH, MO) · colorización por sector/anillo (A1→azul, A3→dorado, etc.) |
| **SALE** | Matriz visual del tren (no editable); la diagonal representa el flujo continuo |
| **Jala de** | `src/data/pullPlanningCreditex.js` y `src/data/sectorizacionCreditex.js` |

---

### 2.2 PRODUCCIÓN (el campo)

---

#### 👷 Capataz — Registro de Actividades (`Capataz.jsx`)
*La "puerta de entrada" del dato real. Aquí nace el tareo.*

| | |
|---|---|
| **ENTRA** | Cuadrillas, personal de la cuadrilla, catálogo WBS, asistencia facial del día, borradores guardados |
| **SE PROCESA** | `totalHH = Σ(hn + he)` del `detalleTareo` · `ipReal = metrado ÷ totalHH` · validación de jornada legal (L-V ≤ 8.5h, sábado sin tope, domingo 0h) · split HN/HE desde asistencia |
| **SALE** | Registro de actividad → **`Registros_Campo`** (UPSERT por actividad-capataz-fecha) · borrador → `Borradores_Capataz` · fotos → Firebase Storage |

**De dónde jala cada dato:**
| Dato | De dónde | A dónde |
|---|---|---|
| Cuadrilla / personas | `Cuadrillas`, `Personal` | selector del tareo |
| Lista de actividades | `Catalogo_WBS` / `Plan_Maestro` | WBS del registro |
| HH por persona | `Asistencia_Diaria` (botón "Importar HH desde Marcador Facial") | `detalleTareo[]` |
| Día anterior | `Borradores_Capataz` | reanudar |
| Resultado final | escribe en **`Registros_Campo`** | useRO / Ingeniero / Cronograma |

> **Payload de `Registros_Campo`:** `{fecha, semana, partida, subpartida, actividad, capataz, metrado, totalHH, ipReal, detalleTareo[{nombre,cargo,dni,hn,he}], fotos[], proyectoId, frenteId, timestamp}`

---

#### ✏️ EditorActividad (`capataz/secciones/EditorActividad.jsx`)
*La "lupa" sobre UNA actividad: WBS, metrado, fotos y HH persona por persona.*

| | |
|---|---|
| **ENTRA** | Actividad activa del plan, trabajadores de la cuadrilla, HH ya acumuladas del trabajador (para no pasar el límite) |
| **SE PROCESA** | Búsqueda WBS jerárquica (partida→subpartida→actividad) · unidad por defecto desde INFO_MAP · **regla: si `IP real > IP meta × 1.05` → obliga observación + foto** |
| **SALE** | Actividad con `{partida, subpartida, metrado, unidad, observación}` + `detalleTareo[]` actualizado + fotos a Storage |
| **Jala de** | Catálogo en memoria (CATALOGO_MASTER); escribe en estado local (`setActividades`) que luego sube Capataz.jsx |

---

#### 📷 MarcadorAsistencia (`MarcadorAsistencia.jsx`)
*El "reloj con cara": reconoce al trabajador y calcula sus horas.*

| | |
|---|---|
| **ENTRA** | Personal enrolado (con `faceDescriptors`), cámara en vivo, hora del sistema |
| **SE PROCESA** | **Entrada tareo = 07:30 fijo** (la real va en `entradaReal` para puntualidad) · **salida tareo = hora en punto hacia abajo** (17:35→17:00) · `horasTrabajadas = (salidaPiso − 07:30) − 60 min descanso` · similitud facial ≥ 75% · cooldown 12 s |
| **SALE** | `Asistencia_Diaria`: `{fecha, personalId, entrada, entradaReal, salida, salidaReal, horasTrabajadas}` |
| **Jala de** | `Personal` (solo con descriptores activos), `Asistencia_Diaria` del día (estado actual) |

---

#### 🔎 Ingeniero (`Ingeniero.jsx`)
*El "auditor": revisa, valida y mira los semáforos.*

| | |
|---|---|
| **ENTRA** | `Registros_Campo` (vía `onSnapshot`, filtrado proyecto+frente), Plan Maestro, Catálogo WBS, Planes Diarios, Configuración |
| **SE PROCESA** | `CPI semanal = ΣHH meta (PV) ÷ ΣHH real (AC)` · `IP real = HH real ÷ metrado` (comparado vs IP meta del catálogo) · `% avance físico = avanceMetradoAcum ÷ metradoContractual` · HE total por trabajador |
| **SALE** | Tabla de auditoría (estado, CPI, IP real vs meta), gráficos CPI/SPI semanal, alertas, reportes Excel, eliminación de registros |
| **Jala de** | `Registros_Campo`, `PlanMaestro`, `Catalogo_WBS`, `Planes_Diarios`, `Configuracion` |

---

#### 🧮 useRO (hook) (`modulos/resultadoOperativo/useRO.js`)
*El "mezclador": junta las 11 colecciones para sacar el Resultado Operativo.*

| | |
|---|---|
| **ENTRA (11 fuentes)** | Plan Maestro, APUs, `Registros_Campo`, `Kardex_Movimientos`, `ValorizacionesContractuales`, `Registro_Facturas`, `ValorizacionesSubcontratistas`, `GG_Oficina`, `Adicionales`, `Deductivos` |
| **SE PROCESA** | `AC = Σ(HH×25.5) + Materiales(Kardex) + Facturas + SC` · `EV = valorización al cliente, o avance×PU` · `BAC = metrado × PU` · `CPI = EV÷AC` · `SPI = EV÷PV` · `EAC = BAC÷CPI` · `Margen real % = (EV−AC)÷EV` |
| **SALE** | RO completo: `{detallePartidas, totales, indicadoresGlobales, gastosGenerales, ajustes, partidasCriticas}` |
| **Jala de** | las 11 colecciones listadas (no escribe nada — solo lee y calcula) |

---

#### ⚙️ planMaestroAnalytics.js (motor de cálculo)
*El "cerebro matemático": fórmulas EVM, RO, árbol WBS y Curva S.*

| | |
|---|---|
| **ENTRA** | Actividades del plan, APUs, tareos, Kardex/facturas, valorizaciones al cliente |
| **SE PROCESA** | `construirArbolWBS()` · `calcularEVM()` → {CPI, SPI, EAC, VAC} · `calcularROMensual()` · `calcularCurvaS()` · **Costo MO = HH × 25.5** (costo-hora ÚNICO) |
| **SALE** | Árbol jerárquico, EVM por actividad/partida, RO mensual, Curva S (programado vs real) |
| **Niveles WBS** | partida `01.00.00` → subpartida `01.01.00` → actividad hoja `01.01.001` |
| **Severidad** | crítica si margen<0 · alta si margen<meta×0.5 · media si margen<meta |

---

#### 📊 WarRoomCuadrillas (`WarRoomCuadrillas.jsx`)
*El "tablero de productividad": qué cuadrilla rinde y qué la frena.*

| | |
|---|---|
| **ENTRA** | `Cartas_Balance` (observaciones TNC, retrabajos, paros), `Cuadrillas`, IP meta del catálogo |
| **SE PROCESA** | `LUF = (horas trabajadas − horas observadas) ÷ horas trabajadas × 100` · `TNC % = (paros + retrabajos) ÷ total obs` · Pareto (causas que suman 80% del TNC) |
| **SALE** | KPIs por cuadrilla (LUF %, TNC %, ranking de causas), semáforo (rojo LUF<40%, naranja <50%, verde ≥50%), alertas, recomendaciones |
| **Jala de** | `Cartas_Balance`, `Cuadrillas` |

---

#### 🧩 OptimizadorCuadrillas (`OptimizadorCuadrillas.jsx`)
*El "armador de equipos": recomienda la mejor cuadrilla según el histórico.*

| | |
|---|---|
| **ENTRA** | `Cartas_Balance` (LUF histórico por persona/actividad), `Personal`, actividad objetivo + tamaño deseado |
| **SE PROCESA** | `optimizarCuadrilla()` greedy (elige N personas con mayor LUF promedio) · boost por parejas productivas · penalización a "drag performers" |
| **SALE** | Cuadrilla recomendada `{personas, lufEstimado}`, parejas productivas, ranking histórico (aviso si <10 observaciones) |
| **Jala de** | `Cartas_Balance`, `Personal` |

---

## 3. TABLAS RESUMEN DE TRAZABILIDAD

### 3.1 ¿De dónde sale cada costo del AC (Costo Real)?

| Dato | De dónde (colección) | Cómo se calcula |
|---|---|---|
| Costo MO (mano de obra) | `Registros_Campo.totalHH` | `Σ HH × 25.5 S/h` (costo-hora ÚNICO) |
| Costo Materiales | `Kardex_Movimientos` | `Σ(SALIDAS a la partida)` sin anuladas |
| Costo Subcontratos | `Registro_Facturas` + `ValorizacionesSubcontratistas` | `Σ(monto sin IGV)` no anulado |
| Gastos Generales | `GG_Oficina` | `Σ(monto)` no anulado → se suma aparte al AC total |

### 3.2 ¿De dónde sale cada indicador EVM?

| Indicador | Fórmula | Insumos (de dónde) |
|---|---|---|
| **BAC** | metrado contractual × PU | `PlanMaestro` (+ ajuste `Adicionales`/`Deductivos`) |
| **PV** | BAC × (días transcurridos ÷ días totales) | fechas programadas (`PlanMaestro`/Cronograma) |
| **EV** | valorización real al cliente, o avance × PU | `ValorizacionesContractuales` (o avance de `Registros_Campo`) |
| **AC** | MO + Mat + SC + GG | ver tabla 3.1 |
| **CPI** | EV ÷ AC | derivado |
| **SPI** | EV ÷ PV | derivado |
| **EAC** | BAC ÷ CPI | derivado |
| **VAC** | BAC − EAC | derivado |

### 3.3 Las "fuentes únicas" (una sola verdad por tema)

| Tema | Fuente ÚNICA | Quién ESCRIBE | Quién LEE |
|---|---|---|---|
| Estructura / metrados / IP meta | `Catalogo_WBS/{proyectoId}` | EditorWbsIsp | todo el sistema (useCatalogoWBS) |
| Plan / presupuesto WBS | `PlanMaestro` | Ingeniero | useRO, Cronograma, Analytics |
| Cronograma CPM + baseline | `Cronogramas/{proyectoId}` | CronogramaPro | LastPlannerPro, Curva S |
| Tareos / avance real | **`Registros_Campo`** | Capataz / Ingeniero | RO, Dashboard, Cronograma (sincronizar) |
| Asistencia real | `Asistencia_Diaria` | MarcadorAsistencia | Capataz (importar HH), dashboards |
| Plan semanal LPS | `LPS/{proyectoId}` | LastPlannerPro | VDC.jsx |
| Restricciones | `VDC_Restricciones` (+ `Configuracion/arEdits_*`) | VDC.jsx | LastPlannerPro (LOOKAHEAD) |
| Productividad/observaciones | `Cartas_Balance` | CartaBalance / Importar | WarRoom, Optimizador |

---

## 4. EL VIAJE DE UN DATO — PASO A PASO (versión corta)

1. **Capataz** abre `Capataz.jsx`, elige cuadrilla y fecha.
2. Crea actividades o carga un **borrador** (`Borradores_Capataz`).
3. Por actividad define **WBS + metrado**.
4. Ingresa **HH (HN/HE)** a mano **o** importa desde **`Asistencia_Diaria`**.
5. El **Marcador facial** ya había guardado entrada/salida en `Asistencia_Diaria`.
6. Capataz importa HH (match por nombre), sube **fotos** (Storage) y valida (IP bajo → observación + foto).
7. Pulsa **SUBIR** → se escribe en **`Registros_Campo`** (UPSERT).
8. **CronogramaPro** lee ese registro y **sincroniza el % de avance** automáticamente.
9. **Ingeniero** ve el historial en vivo (`onSnapshot`).
10. **useRO** carga las **11 colecciones** y `planMaestroAnalytics` calcula **CPI, SPI, EAC, margen**.
11. **WarRoom** y **Optimizador** leen `Cartas_Balance` para LUF, Pareto y cuadrilla óptima.
12. Los **semáforos** suben al Dashboard. El ciclo se repite cada día.

> **Aislamiento por proyecto:** `ProyectoActivoContext` guarda `proyectoActivoId` + `frenteActivoId`; `filtrarPorContexto()` filtra en el cliente (`data.proyectoId === proyectoActivoId`). Un capataz NO puede escribir a otro proyecto. Registros legacy sin `proyectoId` cuentan como del proyecto **`creditex-ptar`** (DEFAULT).

---

## 5. GLOSARIO DE SIGLAS

| Sigla | Significado | En criollo |
|---|---|---|
| **WBS** | Work Breakdown Structure | El árbol de la obra: partida → subpartida → actividad |
| **HH** | Horas Hombre | `metrado × IP`; el "tiempo de gente" que cuesta una tarea |
| **HN / HE** | Horas Normales / Horas Extra | Jornada legal (L-V ≤8.5h, sáb sin tope, dom 0h) / sobretiempo |
| **IP** | Índice de Productividad | `HH ÷ metrado`. **Menor es mejor** (1.5 HH/m² mejor que 2.0) |
| **CPM** | Critical Path Method | Algoritmo de fechas, holguras y ruta crítica |
| **LPS** | Last Planner System | Sistema de compromisos semanales (LOOKAHEAD, PPC, CNC) |
| **PPC** | Plan Percent Complete | % de compromisos de la semana que SÍ se cumplieron |
| **CNC / RNC** | Causa / Razón de No Cumplimiento | Por qué falló un compromiso (MO, MAT, EQ, ING, CLIMA…) |
| **LUF** | Labor Utilization Factor | % de horas productivas de una cuadrilla |
| **TNC** | Trabajo No Conforme | Paros, retrabajos, accidentes (de `Cartas_Balance`) |
| **EVM** | Earned Value Management | Sistema PMI que cruza plan físico ↔ dinero |
| **BAC** | Budget at Completion | Presupuesto total: `metrado × PU` |
| **PV** | Planned Value | Lo que **debería** estar avanzado según cronograma |
| **EV** | Earned Value | Lo **ganado/valorizado** (facturado al cliente o avance×PU) |
| **AC** | Actual Cost | Lo que **de verdad costó** (MO + Mat + SC + GG) |
| **CPI** | Cost Performance Index | `EV ÷ AC`. ≥1 dentro de presupuesto; <0.85 crítico |
| **SPI** | Schedule Performance Index | `EV ÷ PV`. ≥1 adelantado; <0.85 atrasado |
| **EAC** | Estimate at Completion | `BAC ÷ CPI`. Cuánto costará al final |
| **VAC** | Variance at Completion | `BAC − EAC`. Ganancia/pérdida proyectada |
| **APU** | Análisis de Precios Unitarios | Costo teórico por actividad (MO/Mat/Eq/SC), aportes 1.40 |
| **RO** | Resultado Operativo | Reporte mensual: vendido − costo aplicado − costo real = margen |
| **Curva S** | — | Gráfico de avance acumulado: programado vs baseline vs real |

---

## 6. CÓMO EXPLICARLO EN 1 MINUTO (analogía)

> **La obra es como cocinar en un restaurante grande.**
>
> - La **receta** es el **Catálogo WBS**: dice cuántos kilos (metrado) y cuántos minutos por kilo (IP) lleva cada plato. Es la única verdad; todos cocinan con ESA receta.
> - El **horario de la cocina** es el **Cronograma CPM**: qué plato va primero, cuál puede ir en paralelo, y cuáles son los platos que NO pueden atrasarse (la **ruta crítica**).
> - Cada noche, el **mozo jefe (capataz)** anota en una **comanda** (la colección **`Registros_Campo`**) qué se cocinó de verdad, cuántas horas tomó (HH) y le toma una **foto** al plato.
> - El **reloj con cámara (Marcador facial)** ya había fichado a cada cocinero al entrar y salir → eso llena las horas solo.
> - Esa comanda viaja sola: el **horario se actualiza** (avance %) sin que nadie lo reescriba, y el **contador (useRO)** suma lo que costó (`HH × 25.5` + materiales + facturas) contra lo que se vendió al cliente.
> - Al final, el **gerente (Ingeniero)** ve un **tablero de semáforos**: verde = ganamos plata y vamos a tiempo (CPI y SPI ≥ 1); rojo = un plato salió más caro o más lento de lo previsto.
>
> **En una frase:** el capataz escribe UNA comanda (`Registros_Campo`), y de esa sola comanda salen, automáticamente, el avance del cronograma, el costo real y los semáforos del jefe. **Una sola verdad, escrita una sola vez, leída por todos.**

---

*Fin de la PARTE A — Producción & Planeamiento. (Las áreas de Costos/RO en profundidad, Materiales/Kardex, Seguridad/Calidad y BIM se desarrollan en las partes siguientes del informe-mapa.)*

---

# PARTE B — COSTOS, RESULTADO OPERATIVO (RO) & VALORIZACIONES
### Mapa del viaje de la información: ¿de dónde sale cada número del RO?

> **Lee esto como un plano de tuberías.** El agua (los datos) entra por muchos caños (campo, almacén, contabilidad, cliente), todos desembocan en un tanque central (el motor `calcularROMensual`), y de ahí sale el "termómetro" del proyecto: **¿estamos ganando o perdiendo plata?**

---

## 0. EL VIAJE EN UNA SOLA IMAGEN (diagrama ASCII)

```
                          ┌──────────────────────────────────────────────┐
                          │   PASO 0: EL USUARIO ELIGE PROYECTO + FRENTE   │
                          │   (ProyectoActivoContext → localStorage)       │
                          │   filtrarPorContexto() = "solo veo lo MÍO"     │
                          └───────────────────────┬──────────────────────┘
                                                  │
   ====================== DATOS QUE ENTRAN (11 caños / colecciones) ======================
                                                  │
  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ PlanMaestro │  │    APUs     │  │ Registros_Campo  │  │ Kardex_Movimientos│
  │ (WBS, metr, │  │ (costo      │  │ (TAREOS = HH)    │  │ (SALIDA material)│
  │  PU, fechas)│  │  teórico)   │  │  → pata 1 del AC │  │  → pata 2 del AC │
  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘  └────────┬─────────┘
         │                │                  │                     │
  ┌──────┴───────┐  ┌─────┴──────────┐ ┌─────┴──────────────┐ ┌────┴─────────────┐
  │Valorizaciones│  │Registro_       │ │Valorizaciones      │ │  GG_Oficina      │
  │Contractuales │  │Facturas        │ │Subcontratistas(F10)│ │ (gastos generales│
  │ → EV REAL    │  │ → pata 3 AC    │ │ → pata 4 del AC    │ │  NO van a partida│
  └──────┬───────┘  └─────┬──────────┘ └─────┬──────────────┘ └────┬─────────────┘
         │                │                  │                     │
  ┌──────┴───────┐  ┌─────┴──────────┐       │                     │
  │ Adicionales  │  │  Deductivos    │       │                     │
  │ (F05 → +BAC) │  │ (F05 → −BAC)   │       │   (Historial: se carga, hoy NO se usa)
  └──────┬───────┘  └─────┬──────────┘       │                     │
         │                │                  │                     │
         └────────┬───────┴─────────┬────────┴──────────┬──────────┘
                  │                 │                    │
                  ▼                 ▼                    ▼
   ============== EL TANQUE CENTRAL: useRO() ==============
   ┌────────────────────────────────────────────────────────┐
   │ useRO.js                                                │
   │  • onSnapshot() en las 11 colecciones (EN VIVO)         │
   │  • contador 11 → 0 ; cuando llega a 0 → loading=false   │
   │  • entrega los 11 arrays YA FILTRADOS al motor          │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ============== EL MOTOR: calcularROMensual() ==============
   ┌────────────────────────────────────────────────────────┐
   │ planMaestroAnalytics.js  (líneas 474–701)               │
   │                                                         │
   │  Por CADA partida hoja (obtenerActividadesHoja):        │
   │   1) AC = Tareos×25.5 + Almacén + Facturas + Subcontr.  │
   │   2) BAC = metrado × PU                                  │
   │   3) EV  = valorizado real al cliente  Ó  avance×PU     │
   │   4) PV  = BAC × (tiempo transcurrido / tiempo total)   │
   │   5) CPI=EV÷AC  SPI=EV÷PV  EAC=BAC÷CPI  VAC=BAC−EAC      │
   │   6) Márgenes (aplicado, real, pendiente) + Severidad   │
   │                                                         │
   │  Luego SUMA todo + GG aparte + ajustes F05              │
   └───────────────────────────┬────────────────────────────┘
                               │ retorna el objeto "ro"
                               ▼
   ====================== LO QUE SALE (3 vistas) ======================
  ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
  │ResultadoOperativo    │ │ControlRegistros (CR) │ │ ROFrentes           │
  │Oficial (F06)         │ │ desglosa el AC en    │ │ compara F1 vs F2    │
  │ Tabla EVM 9 columnas │ │ sus 4 PATAS + importa│ │ lado a lado         │
  │ + KPIs globales + PDF│ │ Facturas/GG/Subcontr.│ │ (GG no se reparte)  │
  └──────────────────────┘ └──────────────────────┘ └─────────────────────┘
```

> **Clave del dibujo:** todo lo de la izquierda **suma plata que GANAMOS** (BAC/EV, lo que vendemos al cliente). Todo lo del centro-derecha **suma plata que GASTAMOS** (AC, las 4 patas + GG). El RO es simplemente: **lo que ganamos − lo que gastamos**.

---

## 1. LAS DOS PILAS DE PLATA (entender esto y entendiste el RO)

El Resultado Operativo es una balanza con **dos platillos**:

| Platillo | Qué es | De dónde sale |
|---|---|---|
| **Lo que GANAMOS** (la venta) | BAC, EV, valorizaciones al cliente | `PlanMaestro` (metrado×PU) + `ValorizacionesContractuales` + ajustes `Adicionales/Deductivos` |
| **Lo que GASTAMOS** (el costo real, AC) | Las **4 patas** + Gastos Generales | `Registros_Campo` + `Kardex_Movimientos` + `Registro_Facturas` + `ValorizacionesSubcontratistas` + `GG_Oficina` |

Si el platillo de "ganamos" pesa más que el de "gastamos" → **margen positivo, hay utilidad**.
Si pesa menos → **estamos perdiendo plata en esa partida** (severidad crítica).

---

## 2. EL COSTO REAL (AC) Y SUS 4 PATAS

> **Analogía:** el AC es como la cuenta total de una comida grupal. Tiene **4 platos** que pagaste por separado y se suman: la mano de obra (mozos), los materiales (la comida del almacén), las facturas (lo que pediste a proveedores) y los subcontratos (lo que pagaste a otro que cocinó por ti). **Los Gastos Generales son la propina y el cubierto** — no van en ningún plato específico, se suman aparte al final.

### Fórmula maestra
```
AC (Actual Cost) = Pata 1 (Tareos)  +  Pata 2 (Almacén)
                 + Pata 3 (Facturas) +  Pata 4 (Subcontratos)
                 (Equipos = 0 por ahora, fase siguiente)

Total Costo de Obra = AC directo  +  GG_Oficina
```

| Pata | Dato | De dónde JALA (colección) | Fórmula |
|---|---|---|---|
| **1. MO (mano de obra)** | `costoMO` | `Registros_Campo` (tareos, HH) | `Σ(HH) × 25.5` (COSTO_HORA_RO) |
| **2. Materiales** | `costoMat` | `Kardex_Movimientos` (solo tipo=`SALIDA`) | `Σ(costoTotal)` por partida |
| **3. Facturas** | `costoFacturas` | `Registro_Facturas` | `Σ(montoSinIGV)` por partida (sin anuladas) |
| **4. Subcontratos** | `costoSC` | `ValorizacionesSubcontratistas` (F10) | `Σ(cdValorizado)` por partida |
| **(aparte) GG** | `ggTotal` | `GG_Oficina` | `Σ(monto)` vigentes — NO va a partida |

> **REGLA DE ORO (cuadratura):** las 4 patas **deben estar imputadas a la MISMA partida (código WBS hoja)** para que el AC cuadre. Si un tareo va a `02.01.003` y la factura va a `02.01.00` (el padre), **no se cruzan**. Siempre imputar a la **partida hoja**.

> **¿Por qué S/ 25.50 fijo para TODA la mano de obra?** Porque el RO costea con una **tarifa única** (`COSTO_HORA_RO = 25.5`, línea 37 de `planMaestroAnalytics.js`), igual para capataz, operario, oficial y ayudante. Esto cuadra con el Control de Tareos (hoja CR del F06). Las tarifas por cargo (capataz 28, operario 22.5, etc.) **solo se usan en el APU teórico**, nunca en el costo real.

---

## 3. MINI-FICHAS POR MÓDULO (ENTRA → SE PROCESA → SALE)

### 3.1 `useRO` — El tanque que junta todo
**Archivo:** `/src/views/modulos/resultadoOperativo/useRO.js`

| | |
|---|---|
| **ENTRA** | Proyecto activo (vía `filtrarPorContexto`), `ignorarFrente` (para comparar F1 vs F2), `margenMeta=15%`, `fechaActual` |
| **SE PROCESA** | Abre `onSnapshot()` en **11 colecciones** en vivo; cada cambio re-dispara; cuenta regresiva 11→0; al llegar a 0 corre el motor |
| **SALE** | Objeto `ro` completo + `loading` + las colecciones crudas (facturas, valorizacionesSC, gastosGenerales) para que CR las muestre |
| **De dónde jala** | PlanMaestro, APUs, Registros_Campo, Kardex_Movimientos, ValorizacionesContractuales, Registro_Facturas, ValorizacionesSubcontratistas, GG_Oficina, Adicionales, Deductivos, Historial |
| **Escribe** | Nada (solo lee) |

---

### 3.2 `calcularROMensual` — El motor (corazón del sistema)
**Archivo:** `/src/utils/planMaestroAnalytics.js` (líneas 474–701)

| | |
|---|---|
| **ENTRA** | Los 11 arrays ya filtrados + `salariosPorCategoria` (legacy, no se usa para AC) + `fechaActual` + `margenMeta` |
| **SE PROCESA** | Itera **solo partidas hoja** (`obtenerActividadesHoja`); por cada una calcula AC (4 patas), BAC, EV, PV, y los 11 indicadores EVM; luego totaliza, agrega GG aparte y aplica ajustes F05 |
| **SALE** | `detallePartidas[]`, `totales`, `indicadoresGlobales`, `gastosGenerales`, `ajustes`, `partidasCriticas`, `partidasEstrella`, flag `evReal` |
| **De dónde jala** | Recibe todo de `useRO` (no lee Firestore directo) |
| **Escribe** | Nada (es matemática pura) |

---

### 3.3 `ResultadoOperativoOficial` — La vista RO (F06)
**Archivo:** `/src/views/modulos/resultadoOperativo/ResultadoOperativoOficial.jsx`

| | |
|---|---|
| **ENTRA** | `useRO()` → `ro`, `loading`, proyecto/frente activo + `proyectoActivo.presupuestoContractual` |
| **SE PROCESA** | Renderiza tabla EVM de 9 columnas; calcula **% cobertura BAC** = (BAC partidas ÷ presupuesto contractual)×100; pinta colores por CPI/CV |
| **SALE** | Tabla EVM con fila azul **TOTAL COSTO DE OBRA** (KPIs), filas de partidas ordenadas por WBS, fila naranja **GASTOS GENERALES**, filas **ADICIONALES/DEDUCTIVOS** + **PDF (jsPDF)** |
| **De dónde jala** | `ro.detallePartidas`, `ro.indicadoresGlobales`, `ro.totales`, `ro.gastosGenerales`, `ro.ajustes`, `ro.evReal`, `proyectoActivo.presupuestoContractual` |

---

### 3.4 `ControlRegistros` (CR) — Desglose del AC + importador
**Archivo:** `/src/views/modulos/resultadoOperativo/ControlRegistros.jsx`

| | |
|---|---|
| **ENTRA** | `useRO()` → `ro`, `facturas`, `valorizacionesSC`, `gastosGenerales` |
| **SE PROCESA** | Por partida descompone el AC en sus 4 patas; `%MO = Tareos÷AC×100`; suma **Costo Directo**; añade GG; calcula **Total Costo de Obra** |
| **SALE** | Tabla `Partida \| Tareos \| Almacén \| Facturas \| Subcontr. \| AC \| %MO` + sub-vistas de **importación** (Excel/CSV) |
| **De dónde jala** | `ro.detallePartidas` (costoMORealAct, costoMatRealAct), `facturas` (no anuladas), `valorizacionesSC`, `gastosGenerales` |
| **Escribe** (vía hijo `ImportadorRegistros`) | `Registro_Facturas`, `ValorizacionesSubcontratistas`, `GG_Oficina` |

---

### 3.5 `ROFrentes` — Comparativa F1 PTARI vs F2 NAVE
**Archivo:** `/src/views/modulos/resultadoOperativo/ROFrentes.jsx`

| | |
|---|---|
| **ENTRA** | `useRO({ ignorarFrente: true })` (carga TODA la obra) + `frentesDelProyecto[]` + helper `byFr()` |
| **SE PROCESA** | Para CADA frente filtra actividades/datos y corre `calcularROMensual` por separado; **GG NO se reparte** (es nivel obra) |
| **SALE** | Cards comparativas por frente + tabla `Frente \| BAC \| EV \| AC \| CV \| CPI \| Margen%` + fila **TOTAL OBRA** + PDF |
| **De dónde jala** | `actividades` filtradas por `frenteId`; `apus/tareos/kardex/valorizaciones` sin filtro; `facturas/SC/adicionales/deductivos` por frente; `gastosGenerales = []` |

---

### 3.6 `planMaestroAnalytics` (líneas 1–463) — Librería matemática
**Archivo:** `/src/utils/planMaestroAnalytics.js`

| | |
|---|---|
| **ENTRA** | Actividades, APUs y arrays de datos reales |
| **SE PROCESA / SALE** | Funciones reutilizables: `construirArbolWBS`, `obtenerActividadesHoja`, `calcularCostoAPU`, `calcularCostoRealActividad`, `calcularEVM`, `calcularROMensual`, `calcularCurvaS` + constantes `COSTO_HORA_RO=25.5`, `FACTOR_APORTES_PE=1.40` |

---

## 4. CÓMO SE FORMAN LOS NÚMEROS GRANDES

### 4.1 BAC — el presupuesto total (lo vendido)
> **Analogía:** el BAC es el **precio cerrado** que el cliente aceptó pagar por todo el trabajo.

```
BAC (por partida) = metradoContractual × precioUnitario
BAC (proyecto)    = Σ BAC de todas las partidas hoja
```
- **De dónde jala:** `PlanMaestro` (metrado y PU contractual).
- **Verificación:** `% cobertura BAC = BAC partidas ÷ proyectoActivo.presupuestoContractual × 100`. Sano si ≥ ~98%. Si es muy bajo, faltan partidas para cubrir la venta del contrato.

### 4.2 EV — lo que REALMENTE ganamos (Earned Value)
> **Analogía:** el EV es **lo que ya te ganaste de verdad** porque el cliente reconoció (valorizó) el avance.

```
SI hay ValorizacionesContractuales con esa partida:
   EV = valorizado REAL al cliente (montoBruto)      → flag evReal=true
SI NO:
   EV = avanceMetradoAcum × precioUnitario (estimado) → flag evReal=false
```
- **De dónde jala:** `ValorizacionesContractuales` (real) o `PlanMaestro` (avance×PU, proxy).
- **Por qué importa el flag `evReal`:** si es estimado, el número es aproximado. Lo ideal es tener la valorización real al cliente.

### 4.3 AC — lo que gastamos (ver sección 2). 4 patas + GG aparte.

### 4.4 PV — lo que DEBERÍAMOS llevar gastado según el calendario
> **Analogía:** si la obra dura 10 meses y van 3, "deberías" llevar el 30% del presupuesto ejecutado. Eso es el PV.

```
PV = BAC × (tiempo transcurrido ÷ tiempo total)   [si hay fechas]
PV = BAC                                            [si NO hay fechas]
```
- **De dónde jala:** fechas de `PlanMaestro` (`fechaInicioProgramada`/`fechaFinProgramada`) + `fechaActual`.

---

## 5. LOS ÍNDICES (CPI, SPI, EAC, VAC) — el termómetro

> **Analogía del taxímetro:** el **CPI** te dice si gastas más o menos de lo que cobras por cada metro de avance. El **SPI** te dice si vas adelantado o atrasado en el calendario. El **EAC** proyecta cuánto costará al final si sigues a este ritmo. El **VAC** dice cuánta plata ganarás o perderás al cierre.

| Sigla | Fórmula | Cómo se lee | De dónde salen los ingredientes |
|---|---|---|---|
| **CPI** | `EV ÷ AC` | **>1** dentro de presupuesto (ahorro) · **<1** sobrecosto | EV (valoriz./avance) · AC (4 patas) |
| **SPI** | `EV ÷ PV` | **>1** adelantado · **<1** atrasado | EV · PV (fechas PlanMaestro) |
| **EAC** | `BAC ÷ CPI` | Costo final proyectado | BAC (metrado×PU) · CPI |
| **VAC** | `BAC − EAC` | **+** ganancia al cierre · **−** pérdida al cierre | BAC · EAC |
| **CV** | `EV − AC` | Ganancia en efectivo HOY | EV · AC |
| **SV** | `EV − PV` | Adelanto/atraso en dinero HOY | EV · PV |

**KPIs globales (todo el proyecto):**
```
CPI_global = EV total ÷ AC total
SPI_global = EV total ÷ PV total
VAC_global = BAC − (BAC ÷ CPI_global)
margenProyectadoCierre = VAC ÷ BAC × 100
```

**Colores en la tabla:** CPI ≥ 1 verde · 0.9–1 naranja · < 0.9 rojo · CV positivo verde · negativo rojo.

---

## 6. LOS MÁRGENES (¿estamos ganando?)

> **Analogía:** vendes un pan a S/1. El **margen aplicado** es lo que GANARÍAS si el pan te costara lo del recetario (APU teórico). El **margen real** es lo que GANAS de verdad después de pagar harina cara, mano de obra lenta, etc. (el costo real, AC).

| Margen | Fórmula | Qué compara |
|---|---|---|
| **Costo Aplicado** | `avanceMetradoAcum × costoUnitarioTeórico (APU)` | Lo que DEBERÍA costar |
| **Margen Aplicado** | `(Vendido − Aplicado) ÷ Vendido × 100` | Ganancia teórica (ideal) |
| **Margen Real** | `(Vendido − CostoReal) ÷ Vendido × 100` | Ganancia REAL (la que cuenta) |
| **Margen Pendiente** | `(VentaSaldo − CostoTeóricoSaldo) ÷ VentaSaldo × 100` | Margen por ganar en lo que falta |

**Margen Real con GG:** `(EV − (AC + GG)) ÷ EV × 100` — el de verdad de verdad, incluyendo oficina.

**Severidad (semáforo de salud por partida):**
| Condición | Severidad |
|---|---|
| `margenReal < 0` | **crítica** (perdiendo plata) |
| `margenReal < 50% de la meta` | **alta** |
| `margenReal < meta (15%)` | **media** |
| Resto | **ok** (partida sana / estrella) |

---

## 7. AJUSTES CONTRACTUALES (Adicionales / Deductivos F05)

> **Analogía:** el cliente te pidió "hazme además este muro extra" (**Adicional** → sube el presupuesto y la venta) o "ya no hagas esa loza" (**Deductivo** → baja el presupuesto y la venta). Son cambios de orden formalizados (formato F05, con PQ-01 y PQ-02).

```
bacContractual = BAC base + Σ(adicionales.presupuesto) − Σ(deductivos.presupuesto)
evContractual  = EV base  + Σ(adicionales.valorizado)  − Σ(deductivos.valorizado)

donde sumarPQ = Σ(camposPQ01 + camposPQ02)
```

| Dato | De dónde | A dónde |
|---|---|---|
| `presupuestoPQ01/PQ02` | `Adicionales` / `Deductivos` | ajusta **BAC contractual** |
| `valorizadoPQ01/PQ02` | `Adicionales` / `Deductivos` | ajusta **EV contractual** |

- **Escribe:** `PartidasExtras.jsx` (formulario in-app) → colecciones `Adicionales` y `Deductivos`.

---

## 8. ¿QUIÉN ALIMENTA EL RO? (valorizaciones, facturas, subcontratos)

### 8.1 Valorizaciones Contractuales (al cliente) → define el **EV REAL**
**Archivo:** `src/views/oficinatecnica/ValorizacionesView.jsx`

| | |
|---|---|
| **ENTRA** | `Historial` (producción real) + `PartidasContractuales` (metrado/PU) + período + factor reajuste + % adelanto |
| **SE PROCESA** | `EV = avance del periodo × PU × Factor Reajuste`; `Neto = EV − adelanto amortizado`; `Total = Neto + IGV 18%` |
| **SALE** | `ValorizacionesContractuales` con `partidasValorizadas[].montoBruto` → esto **manda** como EV real en el motor |
| **Estado** | borrador → enviada → aprobada → pagada |

### 8.2 Registro de Facturas (proveedores) → pata 3 del **AC**
**Importa vía:** `ImportadorRegistros.jsx` (Excel/CSV) → `Registro_Facturas`
- Campos: partida (WBS), proveedor, documento, fecha, glosa, `montoSinIGV`, estado.
- Cálculo: `Costo Facturas por partida = Σ(montoSinIGV)` donde `partida = códigoWBS` y `estado ≠ anulado`.

### 8.3 Valorizaciones a Subcontratistas (F10) → pata 4 del **AC**
**Importa vía:** `ImportadorRegistros.jsx` → `ValorizacionesSubcontratistas`
- Campos: partida, subcontratista, valorización (nro), `cdValorizado` (costo directo).
- Cálculo: `Costo SC por partida = Σ(cdValorizado)` por partida.

### 8.4 Gastos Generales (GG) → **sección aparte**, NO va a partida
**Importa vía:** `ImportadorRegistros.jsx` → `GG_Oficina`
- Campos: concepto, categoría, fecha, monto.
- Cálculo: `GG Total = Σ(monto)` vigentes → se suma DESPUÉS de los márgenes por partida.

### 8.5 Importador Genérico (el "traductor" de Excel)
**Archivo:** `src/views/modulos/resultadoOperativo/ImportadorRegistros.jsx`
- `parseNumero`: entiende `S/ 1.234,56`, `1,234.56`, `1234` → número.
- `detectarColumnas`: match exacto, luego parcial, de las etiquetas.
- Escribe en lotes de 400 con `proyectoId + frenteId + estado:'vigente' + creadoEn + origenImport`.
- Al escribir → `onSnapshot` dispara → el RO **se recalcula solo** (sin recargar).

---

## 9. TABLA RESUMEN: DATO → DE DÓNDE → A DÓNDE

| Dato | De dónde JALA (colección) | A dónde va (en el RO) |
|---|---|---|
| Metrado + PU contractual | `PlanMaestro` | **BAC** = metrado × PU |
| Costo teórico (4 comp.) | `APUs` | **Costo Aplicado** = avance × costo APU |
| Tareos (HH) | `Registros_Campo` | **AC pata 1** = HH × 25.5 |
| Salidas de almacén | `Kardex_Movimientos` (SALIDA) | **AC pata 2** = Σ costoTotal |
| Facturas proveedores | `Registro_Facturas` | **AC pata 3** = Σ montoSinIGV |
| Valorización a SC (F10) | `ValorizacionesSubcontratistas` | **AC pata 4** = Σ cdValorizado |
| Gastos de oficina | `GG_Oficina` | **GG** (aparte) → Total Costo Obra |
| Valorización al cliente | `ValorizacionesContractuales` | **EV real** (montoBruto) |
| Avance metrado | `PlanMaestro` / `Historial` | **EV estimado** (si no hay valoriz.) |
| Fechas programadas | `PlanMaestro` (Cronograma) | **PV** = BAC × (t transcurrido / t total) |
| Adicionales F05 | `Adicionales` | **+BAC contractual / +EV contractual** |
| Deductivos F05 | `Deductivos` | **−BAC contractual / −EV contractual** |
| Presupuesto del contrato | `Proyectos.presupuestoContractual` | **% cobertura BAC** (verificación) |
| Frentes | `Frentes` | filtra datos en comparativa F1/F2 |

---

## 10. GLOSARIO DE SIGLAS

| Sigla | Significado | Fórmula / Definición |
|---|---|---|
| **RO** | Resultado Operativo | Estado financiero mensual: márgenes, costos y rendimiento (formato GP-GCE-FOR-**F06**) |
| **CR** | Control de Registros | Tabla que desglosa el AC en sus 4 patas por partida |
| **WBS** | Work Breakdown Structure | Jerarquía de partidas: `02.00.00` → `02.01.00` → `02.01.003` |
| **BAC** | Budget At Completion | Presupuesto total = **metrado × PU** |
| **PV** | Planned Value | Lo que "debería" ir gastado = **BAC × (t transcurrido / t total)** |
| **EV** | Earned Value | Lo realmente ganado = **valorizado real** o **avance × PU** |
| **AC** | Actual Cost | Costo real = **Tareos×25.5 + Almacén + Facturas + Subcontratos** (sin GG) |
| **CPI** | Cost Performance Index | **EV ÷ AC** (>1 ahorro, <1 sobrecosto) |
| **SPI** | Schedule Performance Index | **EV ÷ PV** (>1 adelantado, <1 atrasado) |
| **EAC** | Estimate At Completion | Costo final proyectado = **BAC ÷ CPI** |
| **VAC** | Variance At Completion | Ganancia/pérdida al cierre = **BAC − EAC** |
| **CV** | Cost Variance | Margen en dinero HOY = **EV − AC** |
| **SV** | Schedule Variance | Adelanto/atraso en dinero HOY = **EV − PV** |
| **APU** | Análisis de Precio Unitario | Costo teórico en 4 patas: MO, MAT (materiales), EQ (equipos), SC (subcontratos) |
| **HH** | Horas-Hombre | Tiempo de mano de obra trabajado (de los tareos) |
| **MO** | Mano de Obra | Pata 1 del costo |
| **SC** | Subcontratos | Pata 4 del costo (F10) |
| **GG** | Gastos Generales | Administración, seguros, financieros; NO van a partida |
| **IP** | Índice de Productividad | **HH ÷ metrado** (menor es mejor) |
| **PQ** | Presupuesto de Obra | Adicional/Deductivo aprobado (trae PQ-01 y PQ-02) |
| **F05** | Formato Adicionales/Deductivos | Cambios de orden |
| **F06** | Formato RO | Resultado Operativo mensual |
| **F10** | Formato Valorización a SC | Lo devengado al subcontratista |
| **IGV** | Impuesto General a las Ventas | 18% (en valorizaciones al cliente) |
| **Curva S** | — | Gráfico acumulado PV vs EV en el tiempo |
| **Costo Aplicado** | — | **avance × costo APU** (lo que DEBERÍA costar) |
| **COSTO_HORA_RO** | — | **S/ 25.50/h** — tarifa única de MO para todo el RO |
| **FACTOR_APORTES_PE** | — | **1.40** — aportes legales (CTS, vacaciones, ESSALUD) en el APU teórico |

---

## 11. CÓMO EXPLICARLO EN 1 MINUTO

> **"Imagina que la obra es un puesto de comida en una feria.**
>
> El **BAC** es el precio cerrado que acordaste cobrar por todos los platos del día (lo que vendes).
>
> El **EV** es lo que ya te ganaste de verdad, porque ya serviste esos platos y el cliente los aceptó (las valorizaciones).
>
> El **AC** es lo que te costó cocinar: el sueldo de los cocineros (**Tareos × S/25.50**), la comida del almacén (**Kardex**), lo que pediste a proveedores (**Facturas**) y lo que pagaste al de la parrilla de al lado que cocinó por ti (**Subcontratos**). La luz y el alquiler del puesto son los **Gastos Generales**, que pagas aparte.
>
> El **CPI** es tu termómetro: si por cada sol que cobras gastaste menos de un sol, vas bien (CPI mayor que 1). Si gastaste más, estás perdiendo (CPI menor que 1).
>
> Cada vez que alguien anota un tareo, registra una salida de almacén o sube una factura, **el sistema recalcula todo solito** (`onSnapshot` en vivo) y te dice, partida por partida, **dónde estás ganando (partidas estrella) y dónde se te está yendo la plata (partidas críticas, en rojo)** — para apagar el incendio antes de que sea tarde."**

---

### Archivos clave referenciados (rutas absolutas dentro del repo)
- Motor y librería: `/src/utils/planMaestroAnalytics.js` (líneas 474–701 = `calcularROMensual`; 1–463 = helpers; línea 37 = `COSTO_HORA_RO=25.5`)
- Hook orquestador: `/src/views/modulos/resultadoOperativo/useRO.js`
- Vista RO oficial (F06): `/src/views/modulos/resultadoOperativo/ResultadoOperativoOficial.jsx`
- Control de Registros (CR): `/src/views/modulos/resultadoOperativo/ControlRegistros.jsx`
- Comparativa por frente: `/src/views/modulos/resultadoOperativo/ROFrentes.jsx`
- Importador Excel/CSV: `/src/views/modulos/resultadoOperativo/ImportadorRegistros.jsx`
- Adicionales/Deductivos (F05): `/src/views/modulos/resultadoOperativo/PartidasExtras.jsx`
- Valorizaciones al cliente: `/src/views/oficinatecnica/ValorizacionesView.jsx`

---

> *Documento generado trazando el código real de la plataforma (módulos, hooks y colecciones Firestore) — 2026-06-15.*
> *Si un módulo cambia, este mapa debe re-generarse para seguir siendo la única verdad.*
