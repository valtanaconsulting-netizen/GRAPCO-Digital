# flujos/ — sistema de flujos de trabajo de la plataforma

Un solo punto de entrada para todas las tareas repetitivas de las 4 apps:
desarrollo, build, lint, despliegue, scripts de datos y diagnóstico del entorno.
Cero dependencias: solo Node.js.

## El ciclo de trabajo (filosofía cloud-only)

La plataforma vive **solo en GitHub**; la copia local es descartable.

```powershell
# 1. Empezar (clona/actualiza en C:\Users\fjros\gw, ruta corta fuera de OneDrive)
iwr -useb https://raw.githubusercontent.com/valtanaconsulting-netizen/GRAPCO-Digital/main/flujos/iniciar-trabajo.ps1 | iex

# 2. Trabajar (desde la raíz del clon)
.\grapco doctor                # revisar entorno
.\grapco instalar todas        # primera vez
.\grapco dev produccion        # servidor local

# 3. Terminar (commit + push; -Limpiar borra la copia local)
.\flujos\terminar-trabajo.ps1 -Limpiar
```

## Flujos disponibles

Corre `.\grapco` sin argumentos para ver la lista al día. Resumen:

| Flujo | Qué hace |
|---|---|
| `dev <area>` | Servidor de desarrollo (vite) |
| `instalar <area>\|todas` | `npm install` (en producción incluye `scripts/` y `functions/`) |
| `build <area>\|todas` | Compila el frontend |
| `lint <area>\|todas` | ESLint (omite áreas sin script `lint`) |
| `deploy <area>` | Build + Firebase Hosting. Con `--reglas` (rules + índices + storage), `--functions` o `--todo` despliega además esas piezas — solo las que el `firebase.json` del área tenga configuradas |
| `test-reglas` | Tests de reglas Firestore en el emulador (producción) |
| `datos [script]` | Ejecuta scripts de `produccion/scripts/`; sin argumento los lista |
| `secretos` | Copia `serviceAccount.json` desde `GRAPCO_SECRETS` (verifica que esté gitignored) |
| `web <area>` | Abre la app publicada en el navegador |
| `ml exportar` / `ml entrenar` | Dirección de Machine Learning: snapshot del dataset desde Firestore y entrenamiento de baselines — ver [ml/README.md](../ml/README.md) |
| `doctor` | Diagnóstico: node, firebase-tools, secretos, node_modules, git |

Áreas: `produccion`, `planeamiento`, `calidad`, `ssoma` (alias: `p`, `pl`, `c`, `s`, `1`–`4`).
Todo flujo acepta `--dry` para ver el plan sin ejecutar nada.

## Cómo agregar un flujo

Edita `flujos.config.mjs` y añade una entrada a `FLUJOS`:

```js
'mi-flujo': {
  descripcion: 'Qué hace',
  area: 'requerida',   // 'requerida' | 'produccion' | 'ninguna'
  multiArea: true,     // acepta "todas"
  pasos: ({ area }) => [
    { titulo: 'Paso 1', cmd: 'npm run algo', cwd: area.dir },
  ],
},
```

El motor (`grapco.mjs`) no se toca: resuelve el área, muestra el plan,
ejecuta paso a paso con tiempos y se detiene ante el primer fallo.

## Secretos

Los secretos viven **fuera del repo**, en `%USERPROFILE%\GRAPCO_SECRETS`
(configurable con la variable de entorno `GRAPCO_SECRETS`). El flujo `secretos`
copia `produccion\serviceAccount.json` al área de producción **solo si** git
confirma que lo ignora (`git check-ignore`), y `terminar-trabajo.ps1` aborta
si aparece un `serviceAccount` en el working tree **o en los commits por
subir** — doble barrera porque el repo es público.

## CI (GitHub Actions)

`.github/workflows/ci.yml` compila cada área en cada push a `main`,
**solo si esa área cambió**. El lint corre como paso informativo sin bloquear
(producción arrastra ~395 errores de lint preexistentes; limpiarlos es deuda
aparte). No despliega: el despliegue sigue siendo manual con `grapco deploy`
(automatizarlo requeriría guardar credenciales de Firebase como secretos del
repo; pendiente hasta que el repo sea privado).

## Proyectos Firebase por área

| Área | Proyecto | URL |
|---|---|---|
| Producción | `grapco-demo-2026` | https://grapco-produccion.web.app |
| Planeamiento | `grapco-planeamiento-2026` | https://grapco-planeamiento-2026.web.app |
| Calidad | `grapco-calidad-2026` | https://grapco-calidad-2026.web.app |
| SSOMA | `grapco-sigma-2026` | https://grapco-sigma-2026.web.app |

Nota: el ID de proyecto Firebase es inmutable; Producción usa un **sitio de
hosting adicional** (`grapco-produccion`, definido en su `firebase.json`) para
tener URL propia. La URL antigua https://grapco-demo-2026.web.app fue apagada
el 2026-07-09 y devuelve 404 (reversible re-desplegando a ese sitio).
