# DIAGNÓSTICO — El RO está vacío en producción (PlanMaestro sin datos)

> Fecha: 2026-06-22 · Proyecto: grapco-demo-2026 / creditex-ptar · Verificado contra Firestore vivo + código.

## 1. Causa raíz

`useRO` (`src/views/modulos/resultadoOperativo/useRO.js:14`) lee la colección **`PlanMaestro`
como `actividades`**. En grapco-demo-2026 esa colección tiene **0 documentos**.

La estructura real del proyecto migró a otras colecciones (confirmado por query admin):
- `Catalogo_WBS` — 1 doc/proyecto con `arbol` de 18 partidas (fuente única de estructura).
- `PresupuestoF07` — 260 filas (presupuesto contractual, item/descripcion/cant/pu).
- `MetradosContractuales` — 7 docs (metrado por código).
- `ValorizacionF07_Avance` — 10 valorizaciones (V-01…V-10).
- `Registros_Campo` — 1108 tareos (la única fuente "viva" que el RO sí podría usar).

**`PlanMaestro` quedó como modelo LEGACY** y nunca se pobló para creditex-ptar. Como
`calcularROMensual` itera SOLO `obtenerActividadesHoja(actividades)` y el costo real (AC),
facturas, almacén y subcontratos se calculan *dentro* de ese `.map` por partida, con 0
actividades **no se lee ningún tareo** y todo el RO sale en cero — aunque `Registros_Campo`
tenga 1108 docs. `ro` **no es null**: es un objeto con todo en 0, por eso los guards
`if (!ro)` no disparan; solo disparan los que miran `detallePartidas.length === 0`.

## 2. Impacto por módulo (qué ve el usuario hoy)

### Cluster Resultado Operativo
| Componente | Qué muestra con PlanMaestro vacío | Veredicto |
|---|---|---|
| **RODashboard** (pestaña por defecto) | EmptyState "Sin datos para calcular RO" (`RODashboard.jsx:17`) | 🔴 VACÍO |
| **ROporPartida** | EmptyState "Sin partidas" (`:28`) | 🔴 VACÍO |
| **CurvaSFinanciera** | EmptyState "Sin datos para curva S" (`:37-39`) | 🔴 VACÍO |
| **ROFrentes** | EmptyState "Aún no hay frentes con actividades" (`:39,47`) | 🔴 VACÍO |
| **CostoRealOficial** | EmptyState "aún no hay movimientos" (`:56`) — tiene lógica de tareos pero solo vía partidas del PM | 🔴 VACÍO |
| **ControlRegistros** | EmptyState "Sin costo real aún para cruzar" (`:132`) | 🔴 VACÍO |
| **ROProyeccion** | **NO** vacía: guard es `if (!ro)` y ro≠null → muestra "🟢 Cerrarías con **0%** margen, por encima de meta" + barras en S/0 | 🟡 CEROS ENGAÑOSOS |
| **ResultadoOperativoOficial (F06)** | Presupuesto ✓ (usePresupuestoContractual/base) + AC/HH ✓ (tareos), pero **PV/EV/CPI/SPI en 0** (motor con PM vacío) | 🟡 PARCIAL |
| **CostoRealCR ("En vivo")** | **FUNCIONA**: no usa useRO; `calcularReporteTareos(tareos)` arma partidas desde los tareos | 🟢 OK |

### Dashboards de gerencia / cartera
| Componente | Qué muestra | Veredicto | Severidad |
|---|---|---|---|
| **PanelGerencia** ("vista WOW" del Director) | HERO + KPIs en **Margen 0%, CPI 0.000, SPI 0.000, EAC S/0, Avance 0%**; pilares Calidad/Materiales/Tareos sí reales | 🔴 ROTO | **ALTA** |
| **PortfolioDashboard** | Cartera ejecutiva en **S/0, CPI 0, "(0 act.)"** por proyecto | 🔴 ROTO | **ALTA** |
| **ComparativoFrentes** | Tabla por frente en **0 act., BAC S/0, CPI —, Margen 0%** | 🔴 ROTO | Media |

### Módulos que degradan bien (no urgente)
| Componente | Comportamiento | Veredicto |
|---|---|---|
| **DashboardPlanMaestro** | EmptyState explícito "Sin Plan Maestro · Ve a Estructura WBS o Importar" | 🟢 IDEAL |
| **WBSExplorer** | EmptyState "Crea la primera partida" + botón | 🟢 IDEAL |
| **PlanDiario** | Cae a catálogo estático `CAT_BASE`; sigue funcional (pierde IP/metas finos) | 🟢 OK |
| **PETsView** | Solo pierde el chip de código WBS vinculado | 🟡 cosmético |
| **EditorMasivo / Wizard / Importador / ActividadEditor** | Son los EDITORES que escriben a PlanMaestro (vía de repoblado) | ⚙️ EDITORES |

## 3. El patrón de arreglo (la pista)

**`CostoRealCR` + `calcularReporteTareos` (`helpers.js:1090`) es el único que funciona sin
PlanMaestro**: construye el universo de partidas DESDE los propios tareos (`r.partida` /
`r.subpartida`) y costea `HH × S/25.5`. No mira PlanMaestro.

La corrección de fondo, alineada con "estructura = Catalogo_WBS" (fuente única):
- `calcularROMensual` debería construir su universo de códigos como la **unión** de
  (a) actividades hoja del PM (si existe) **y** (b) los códigos vivos que aparecen en
  tareos/kardex/facturas/SC/valorizaciones (los mismos `partida`/`codigoWBS`/`actividad`
  que ya indexa `indexarPorClavesWBS`).
- Para BAC/PU/metrado de cada código → tomar de **`Catalogo_WBS` + `PresupuestoF07` +
  `MetradosContractuales`** (lo que ya hace `Ingeniero`/`OficinaTecnicaPanel`/`ValorizacionF07`).
- El AC fluye siempre desde tareos (como `calcularReporteTareos`).

Así el RO mostraría costo real, EV y CPI aunque `PlanMaestro` esté vacío.

## 4. Recomendación de priorización

1. **PanelGerencia + PortfolioDashboard** (severidad ALTA, cara al cliente): como mínimo,
   un EmptyState cuando `ro.totales.BAC === 0` para NO mostrar S/0 y CPI 0 como si fueran
   reales. Arreglo de fondo: alimentar de Catalogo_WBS + PresupuestoF07 + tareos.
2. **Cluster RO** (RODashboard y compañía): recablear `useRO`/`calcularROMensual` al patrón
   de §3 — un solo cambio en el motor revive las ~8 vistas a la vez.
3. **Editores PlanMaestro**: decisión estratégica — si la estructura ya vive en Catalogo_WBS,
   estos escriben a una colección que el resto de costos ya no lee. No es bug, es arquitectura.

## 5. Verificación de la base

- `PlanMaestro` = 0 docs (query admin a grapco-demo-2026, 2026-06-22).
- `Registros_Campo` = 1108 docs (todos `proyectoId: creditex-ptar`).
- `Catalogo_WBS`, `PresupuestoF07` (260), `MetradosContractuales` (7), `ValorizacionF07_Avance` (10) — poblados.
- La optimización del motor RO (commit f2a2f70) es correcta y verificada; el problema es la
  FUENTE de datos (`actividades=[]`), no el cálculo.
