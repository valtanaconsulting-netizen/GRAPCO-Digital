# scripts/ — utilidades de datos y mantenimiento

Scripts Node/PowerShell que operan **fuera** de la app (extraer Excel, sembrar/migrar
Firestore, generar iconos, diagnosticar datos). No forman parte del bundle.

## Requisitos

- La mayoría usa **firebase-admin** y necesita `serviceAccount.json` en la raíz de la app
  (`1. GRAPCO - AREA DE PRODUCCIÓN - VALORIZACIÓN/serviceAccount.json`, **gitignored** — pídelo al admin).
- Proyecto Firebase: **grapco-demo-2026**.
- Correr **desde la carpeta `scripts/`** (las rutas relativas asumen ese directorio).
- `npm install` dentro de `scripts/` si falta `node_modules/`.

## Permanentes (versionados) — clasificados por propósito

### Extractores (Excel/fuentes legacy → JSON/Firestore)
`extraerAr.cjs`, `extraerCronogramaObra.cjs`, `extraerLap.cjs`, `extraerNormalTec.cjs`,
`extraerPlanVaciado.cjs`, `extraerPpc.cjs`, `extraerPullPlanning.cjs`,
`extraerSectorizacion.cjs`, `_extraer_presupuesto.cjs`, `_xlsx_dump.cjs`

### Seeds (siembran data de demo/prod en Firestore)
`seed-prod.mjs`, `seed-emulator.mjs`, `seed-cronograma-creditex.mjs`, `seed-lps-creditex.mjs`

### Migración y mantenimiento de datos
`_backfill_proyectoid.cjs` (backfill de `proyectoId`, herramienta del Gate 1),
`renombrar-apellidos-primero.mjs`, `restaurar-planmaestro-creditex.mjs`
(restaura desde `backups/`)

### Diagnóstico / inspección (reutilizables)
`diagnostico-proyectos.mjs`, `inspeccionarFrentes.cjs`,
`inspeccionarLap.mjs`, `inspeccionarLap2.cjs`, `verifLookahead.cjs`, `leer-errores.mjs`

### Generación de iconos PWA
`generar-iconos-pwa.mjs`

### Otros
`gcloud-adc-bridge.py` (puente ADC gcloud)

### Datos
`backups/` — respaldos JSON de Firestore (gitignored, **no borrar**): insumo de
`restaurar-planmaestro-creditex.mjs`.

## scratch/ — diagnósticos de un solo uso (gitignored)

**Convención:** todo script de un solo uso nace en `scripts/scratch/`. Si demuestra ser
reutilizable, se promueve a `scripts/` raíz y se documenta aquí. Los scripts nuevos en
`scratch/` deben cargar `serviceAccount.json` con ruta de dos niveles
(`../../serviceAccount.json`).

> Limpieza 2026-07-06: los one-shot ya ejecutados (migraciones puntuales, pipeline del
> catálogo de costos, suites de reglas reemplazadas por `firestore-tests/`,
> `generate-icons.mjs`, `extraerVdc.cjs`, `_costos_dump.cjs`, `_wf_watch.cjs`,
> `admin-user.json` y todo `scratch/` de esa época) se movieron a
> `../_ARCHIVO - PRODUCCION - VALORIZACION/scripts-one-shot/` en la raíz del proyecto.
