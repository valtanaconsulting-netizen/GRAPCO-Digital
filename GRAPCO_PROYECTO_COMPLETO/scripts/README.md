# scripts/ — utilidades de datos y mantenimiento

Scripts Node/PowerShell que operan **fuera** de la app (extraer Excel, sembrar/migrar
Firestore, generar iconos, diagnosticar datos). No forman parte del bundle.

## Requisitos

- La mayoría usa **firebase-admin** y necesita `serviceAccount.json` en la raíz de la app
  (`GRAPCO_PROYECTO_COMPLETO/serviceAccount.json`, **gitignored** — pídelo al admin).
- Proyecto Firebase: **grapco-demo-2026**.
- Correr **desde la carpeta `scripts/`** (las rutas relativas asumen ese directorio).
- `npm install` dentro de `scripts/` si falta `node_modules/`.

## Permanentes (versionados) — clasificados por propósito

### Extractores (Excel/fuentes legacy → JSON/Firestore)
`extraerAr.cjs`, `extraerCronogramaObra.cjs`, `extraerLap.cjs`, `extraerNormalTec.cjs`,
`extraerPlanVaciado.cjs`, `extraerPpc.cjs`, `extraerPullPlanning.cjs`,
`extraerSectorizacion.cjs`, `extraerVdc.cjs`, `_extraer_presupuesto.cjs`,
`_xlsx_dump.cjs`, `_costos_dump.cjs`

### Catálogo de costos
`_chunk_catalog.cjs`, `_split_catalog.cjs`, `_run_costos_catalog.ps1`

### Seeds (siembran data de demo/prod en Firestore)
`seed-prod.mjs`, `seed-emulator.mjs`, `seed-cronograma-creditex.mjs`, `seed-lps-creditex.mjs`

### Migración y mantenimiento de datos
`migrate-prod-to-demo.mjs`, `consolidar-en-ptari5.mjs`, `_backfill_proyectoid.cjs`,
`renombrar-apellidos-primero.mjs`, `limpiar-planmaestro-demo-creditex.mjs`,
`limpiar-planmaestro-huerfano.mjs`, `restaurar-planmaestro-creditex.mjs`,
`rescatar-bim-modelos.mjs`, `fix-dni-adrian.mjs`

### Diagnóstico / inspección (reutilizables)
`diagnostico-proyectos.mjs`, `inspeccionar-f13.cjs`, `inspeccionarFrentes.cjs`,
`inspeccionarLap.cjs`, `inspeccionarLap2.cjs`, `verifLookahead.cjs`, `leer-errores.mjs`

### Generación de iconos PWA
`generar-iconos-pwa.mjs`, `generate-icons.mjs`

### Otros
`gcloud-adc-bridge.py` (puente ADC gcloud), `_wf_watch.cjs` (watcher)

## scratch/ — diagnósticos de un solo uso (gitignored)

`scripts/scratch/` guarda volcados/sondas desechables (`_diag_*`, `_dump_*`, `_inspect_*`,
`_probe_*`, `_test_*`, etc.). **No se versionan** y pueden borrarse sin consecuencias.

**Convención:** todo script de un solo uso nace en `scripts/scratch/`. Si demuestra ser
reutilizable, se promueve a `scripts/` raíz y se documenta aquí.

> Nota: los scripts movidos a `scratch/` el 22/06/2026 ya tienen corregida la ruta a
> `serviceAccount.json` (`../../serviceAccount.json`). Un script nuevo en `scratch/` debe
> usar esa misma ruta de dos niveles.
