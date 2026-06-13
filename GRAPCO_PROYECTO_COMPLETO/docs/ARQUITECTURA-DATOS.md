# GRAPCO — El "gran lenguaje" de datos (fuentes únicas)

Referencia canónica de QUÉ colección manda sobre QUÉ. Si dos vistas muestran un mismo
número, deben sacarlo de la **misma** fuente de esta tabla. Actualizado en la consolidación
de coherencia (sesión "gran lenguaje").

## Matriz de fuentes únicas

| Dato | Fuente ÚNICA (canónica) | NO usar para esto |
|---|---|---|
| **Tareos / partes de campo** | `Registros_Campo` (1.103 docs) | ~~`Tareos`~~ (estaba vacía; ya repuntado) |
| **Estructura WBS + presupuesto** (partida/sub/actividad, metrado contractual, IP, HH) | `Catalogo_WBS/{proyectoId}` (árbol; HH = metrado × IP vía `calcActividad`) | `PlanMaestro` (no es fuente de estructura) |
| **Programación + ejecución por actividad** (fechas, predecesoras, estado, apuId/petId) | `PlanMaestro` (doc plano por actividad) | `Catalogo_WBS` (no tiene timeline) |
| **Avance real de obra** | `Registros_Campo` → sincronizado al **Cronograma** (`Cronogramas/{proyectoId}`) por nombre normalizado | `PlanMaestro.avanceMetradoAcum` (se inicializa pero NO se actualiza → stale) |
| **Cronograma / ruta crítica / Curva S** | `Cronogramas/{proyectoId}` (motor `cpm.js`) | — |
| **Last Planner / PPC / lookahead** | `LPS/{proyectoId}` | — |
| **Rendimiento (IP Meta/Presupuesto) para CPI** | `Catalogo_WBS` (catálogo manda) | — |
| **Costo de mano de obra** | `COSTO_HORA_PROMEDIO = S/25.50/h` (`utils/helpers.js`) — único, sin tarifas por cargo | overrides por cargo |
| **Semana del proyecto** | `obtenerSemana(fecha, fechaInicioProyecto)`; legacy CREDITEX = lunes 2025-11-03 | fechas ad-hoc |

## Reglas del idioma común

1. **Normalización de nombres de actividad**: SIEMPRE `normActividad` de `src/utils/normalizacion.js`
   (sin acentos + sin sufijo de frente «(F1-PTARI)» + MAYÚSCULAS). Es lo que hace que un tareo
   cruce con el catálogo, el cronograma y el CPI. (VDC usa un matcher de fase aparte, a propósito.)
2. **IDs legacy**: `LEGACY_CREDITEX_IDS` y `FECHA_INICIO_LEGACY` viven en `src/config/proyecto.js` (fuente única).
3. **Aislamiento multi-proyecto**: toda query filtra por `proyectoId` (o `filtrarPorContexto`). Legacy CREDITEX = `creditex-ptar` / `default-ptari`.
4. **% en UI**: `Math.round` (sin decimales). Dinero/HH/IP sí llevan decimales.
5. **Paleta**: tokens `BASE` (navy #0F2A47 + gold #E5A82F) / `CHART_PALETTE`. Nada de hex tailwind sueltos.

## Catalogo_WBS vs PlanMaestro — son CAPAS DISTINTAS (no duplicados)

- `Catalogo_WBS` = **estructura + presupuesto** (lo que se contrató/planificó). Lo edita **Editar WBS**. Alimenta CPI, Cronograma y la auto-programación.
- `PlanMaestro` = **programación + ejecución** por actividad. Lo editan ActividadEditor / EditorMasivo / Wizard / Importador.
- **NO** deprecar `PlanMaestro`: borraría las fechas/predecesoras/estado/APU-PET de su módulo.

> ✅ **Resuelto (jun-2026)**: `PlanMaestro/creditex-ptar` tenía **data demo/desincronizada** (actividades genéricas tipo "porcelanato", "ventanas de aluminio", "caudalímetros" que NO son del PTAR+NAVE real), con la capa de ejecución casi vacía. La obra **real** de CREDITEX vive en `Catalogo_WBS`. Se **respaldaron y eliminaron los 105 docs demo** (backup local en `scripts/backups/`, gitignored; restaurable). Ahora `PlanMaestro/creditex-ptar` está vacío → las vistas ya no muestran una WBS demo equivocada; el catálogo es la fuente real. Script: `scripts/limpiar-planmaestro-demo-creditex.mjs`.
