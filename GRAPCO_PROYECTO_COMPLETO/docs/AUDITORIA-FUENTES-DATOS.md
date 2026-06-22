# AUDITORÍA DE INTEGRIDAD DE FUENTES DE DATOS

> Fecha: 2026-06-22 · Proyecto: grapco-demo-2026 · Método: cruce automático de cada
> `collection(db,'X')`/`doc(db,'X')` del código contra el conteo REAL en Firestore.
> Script: `scripts/scratch/audit-fuentes-datos.mjs` (one-shot).

## Resumen

De **52 colecciones** que el código lee, **24 tienen datos** y **28 están VACÍAS (0 docs)**.
No todas las vacías son bugs: muchas son features aún sin usar que muestran su empty-state
correctamente. La triada separa **bombas reales** (data migró a otra colección, el código
lee la legacy vacía) de **vacíos esperados**.

## 🔴 Bombas confirmadas (arreglar)

| Colección (vacía) | Dónde vive la data ahora | Archivos afectados | Síntoma |
|---|---|---|---|
| **PlanMaestro** | `Catalogo_WBS` (2) + `PresupuestoF07` (260) | 12 (useRO, PanelGerencia, Portfolio, ComparativoFrentes, PlanDiario, PETs, 6 del módulo planMaestro) | RO/Gerencia/Portfolio en cero (ver `DIAGNOSTICO-RO-PLANMAESTRO.md`) |
| **ValorizacionesContractuales** | `ValorizacionF07_Avance` (10) | 6 (useRO, PanelGerencia, ComparativoFrentes, DashboardOT, ValorizacionesView, SustentoMetrados/InformeSustento) | EV/Valorizado vacío en el RO Oficial F06, Gerencia y OT — misma familia que PlanMaestro |
| **PlanDiario** (typo) | Se escribe en `Planes_Diarios` | `PanelGerencia.jsx:58` lee `PlanDiario` (singular) | **Doble bug:** (1) nombre — nadie escribe `PlanDiario`; (2) forma — `Planes_Diarios` guarda `{grupos,totales}` pero Gerencia espera `dia.actividades` (`:100`). El PPC/LPS de Gerencia **siempre da 0** |

**Causa común de las dos primeras:** la plataforma migró su "gran lenguaje de datos"
(estructura→`Catalogo_WBS`, valorización→`ValorizacionF07`), pero los consumidores de costos
(RO, Gerencia, Portfolio, OT) siguen leyendo las colecciones legacy vacías. **Un solo
recableo del motor de RO + de los dashboards a las fuentes vivas arregla las tres familias.**

## 🟡 Módulos completos sin data (¿pendiente de importar? — verificar con el negocio)

| Colección | Archivos | Lectura |
|---|---|---|
| **Almacenes / Kardex_Movimientos / Materiales** | 11 / 11 / 9 | Módulo Almacén/Materiales completo sin data. El **costo de materiales del RO** sale 0. El flujo "Almacén → Importar Registro S10" (memoria del proyecto) no se ha ejecutado para creditex. |
| **Historial** | 3 (RDOView, PanelGerencia, SalidaMaterial) | Avance / Curva S real. Probable legacy (el avance hoy podría derivarse de tareos). |
| **Partidas** | 4 (OrdenEditor, PartidasView, EntradaMaterial, SalidaMaterial) | Catálogo de partidas para compras/almacén. Vacío. |

Estos NO son necesariamente bugs: si el negocio aún no cargó almacén/materiales para este
proyecto, el vacío es correcto. Pero conviene confirmar que se ESPERA vacío y no que el
módulo está roto por leer una colección equivocada.

## 🟡 Calidad / Seguridad sin registros (esperado si no se han creado)

`NoConformidades` (6 arch.), `Ensayos` (2), `InspeccionesSeguridad` (2), `ProtocolosCALFOR` (1).
Probablemente vacías porque no se han registrado NCs/ensayos/inspecciones aún — los empty-states
son correctos. Verificar que los dashboards de Calidad no muestren "0" como dato falso.

## ⚪ Features sin usar / empty-state correcto (NO son bugs)

`Planes_Diarios`, `PETs`, `BIM_Vinculos`, `VDC_Evidencias/Lecciones/Restricciones`,
`PullPlanningHitos/Tareas` (solo en el seeder), `OrdenesCompra`, `OrdenesServicio`,
`PreciosMercado`, `PPC_Compromisos`, `LPS_Plazos`, `CuadrillasActivas`.

**Con fallback que ya maneja el vacío (sanas):** `PartidasContractuales` (→ constantes base
en `usePresupuestoContractual`), `Presupuesto_Config` (→ config base).

## 🟢 Con datos (24)

`Registros_Campo` (1108), `Auditoria_Seguridad` (262), `PresupuestoF07` (260), `APUs` (44),
`Borradores_Capataz` (42), `Asistencia_Diaria` (25), `Personal` (18), `Cartas_Balance` (15),
`ValorizacionF07_Avance` (10), `Usuarios` (9), `MetradosContractuales` (7), `SustentoMetrados`
(7), `Protocolos` (6), `Configuracion` (4), `BIM_Modelos` (2), `Catalogo_WBS` (2), `Cronogramas`
(2), `Frentes` (2), `Proyectos` (2), `Bootstrap` (1), `Cuadrillas` (1), `LPS` (1), `RDO` (1),
`TipoCambio` (1).

## Recomendación

1. **Recableo central (arregla 🔴 #1 y #2 de golpe):** que `calcularROMensual`/`useRO` y los
   dashboards de Gerencia/Portfolio/OT deriven partidas y valorizaciones de las fuentes vivas
   (`Catalogo_WBS` + `PresupuestoF07` + `ValorizacionF07_Avance` + tareos), no de
   `PlanMaestro`/`ValorizacionesContractuales`. Patrón de referencia: `CostoRealCR` +
   `calcularReporteTareos`. Verificar con equivalencia/sanity sobre data real.
2. **PlanDiario (🔴 #3):** en `PanelGerencia.jsx:58` cambiar `'PlanDiario'`→`'Planes_Diarios'`
   Y reconciliar la forma (`grupos` vs `actividades`) para que el PPC de Gerencia funcione.
3. **Materiales/Almacén (🟡):** confirmar con el negocio si se espera cargar almacén para
   creditex; si sí, es flujo de importación pendiente, no código.
