# design-sync — notas del repo GRAPCO

Proyecto claude.ai/design: **GRAPCO Design System** (`dba27de2-d2c6-4520-a5ac-ff57f246d712`).

## Lo que hace especial a este repo

- **Es una APP Vite, no una librería.** No hay `dist/` de librería ni entry en `package.json` (`module`/`main`/`exports`). Si se deja a la auto-detección, el modo synth-entry empaquetaría TODO `src/` (arrastra Firebase, contextos, etc.). Por eso se usa una **entrada curada**: `.design-sync/ds-entry.jsx` re-exporta solo los componentes presentacionales reutilizables.
  - **Re-sync DEBE pasar `--entry ./.design-sync/ds-entry.jsx`** (igual que el primer sync). Sin eso, el bundle se infla con toda la app.
- **No hay TypeScript.** Los `.jsx` no tienen tipos → la extracción de `.d.ts` da 0. Los contratos de props son **escritos a mano** en `cfg.dtsPropsFor`. Para AGREGAR un componente: añadirlo a (1) `ds-entry.jsx`, (2) `cfg.componentSrcMap`, (3) `cfg.dtsPropsFor`.
- **Tokens** = `src/styles/global.css` (`:root { --grapco-* }` + IBM Plex por `@import` remoto de Google Fonts). `[FONT_REMOTE]` es **esperado** (no es un fallo): las fuentes cargan en runtime.
- **AreaSidebar es `position:fixed`** (vive bajo un topbar de 60px). Su preview lo envuelve en un contenedor con `transform: translateZ(0)` (crea bloque contenedor para el fixed). `cfg.overrides.AreaSidebar = { cardMode:'single', viewport:'240x580' }`.

## Componentes sincronizados (4)

`Icon`, `VistaHeader`, `EmptyState`, `AreaSidebar` — todos presentacionales, sin acoplamiento a Firebase/contextos. Previews propios en `.design-sync/previews/*.tsx` (graded por revisión humana, ver abajo).

## Comandos (re-sync)

```sh
cp -r "<skill-base>"/{package-build,package-validate,package-capture,resync}.mjs "<skill-base>"/{lib,storybook} .ds-sync/   # re-stage
node .ds-sync/package-build.mjs   --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/ds-entry.jsx --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle --no-render-check
```

## Known render warns

- `[RENDER_SKIPPED]` — esperado: se corre con `--no-render-check`.
- `[FONT_REMOTE]` IBM Plex — esperado (fuentes remotas).

## Re-sync risks (qué vigilar)

- **Render NUNCA se verifica por máquina.** El chromium cacheado del sistema (build 1223) no empata con el playwright instalado (1228), así que se eligió revisión humana (.review.html) + revisión en el panel DS de claude.ai/design. Si en el futuro hay un chromium que empate, se puede instalar `playwright` de esa versión y quitar `--no-render-check`.
- **Las 3 guías en `guidelines/docs/`** (ARQUITECTURA-DATOS, MAPA-PRODUCCION-PLANEAMIENTO-COSTOS, SETUP_GOOGLE_DRIVE_SHEETS) son docs internos del repo que el converter recogió de `docs/`. Revisar que no expongan nada sensible antes de re-subir.
- **Si la app agrega/renombra tokens** en `global.css`, actualizar la tabla en `.design-sync/conventions.md` (el header valida nombres contra los artefactos).
- Para ampliar el alcance ("Tokens + key components" → más componentes), repetir el trío entry+componentSrcMap+dtsPropsFor por cada componente nuevo, y crear su `previews/<Name>.tsx`.
