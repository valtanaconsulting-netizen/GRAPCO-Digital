# PERFORMANCE-AUDIT — GRAPCO 2026

> Consolidación de 13 auditorías de rendimiento → plan ejecutable.
> Fecha: 2026-06-18 · Modelo: obra en celular con señal variable · Costo $0 · Offline-first · Paleta BASE.
> **Verificado contra el estado VIVO del repo** (no se repiten hallazgos ya resueltos).

---

## 1. Resumen ejecutivo

La plataforma ya tiene una base de rendimiento **muy sólida**: 146 vistas en `React.lazy`, vendors pesados (pdf/faceapi/xlsx/exceljs/charts) aislados en chunks que no se precargan, persistencia Firestore IndexedDB, y preload inteligente por hover/idle.

**Hallazgos de los 13 auditores YA RESUELTOS en el código actual** (no requieren acción — se documentan para no reabrirlos):

- **Video hero**: `public/grapco-bg.mp4` ya pesa **1.89 MB** (no 22 MB), usa `preload="metadata"`, está **gateado por `conexionLenta()`** en `Login.jsx:777` y `SelectorPerfil.jsx:308`, y el SW ya lo cachea (regex incluye `mp4|webm|webp` en `public/sw.js:69`).
- **Fuentes**: ya **auto-hospedadas** vía `@fontsource` en `main.jsx:6-11` (no @import remoto, no render-blocking, offline-first OK).
- **AuthContext**: el `value` ya está en **`useMemo`** (`AuthContext.jsx:413`).
- **Resize `ww`**: ya usa **throttle con `requestAnimationFrame`** (`App.jsx:293`).

**El cuello de botella #1 que SIGUE VIVO**: el chunk de entrada `dist/assets/index-*.js` hace **import ESTÁTICO** de `vendor-pdf` (1.27 MB / 418 KB gz) y `vendor-html2pdf` (527 KB / 150 KB gz) → **~568 KB gz en la ruta crítica del arranque**, pese a que todo el uso de PDF es dinámico. Es un artefacto del `manualChunks` de Rolldown, no del código fuente. **Confirmado en el dist actual** (`grep 'from"./vendor-pdf'` → presente en `index-D7tDVTad.js`).

Los siguientes grandes ejes vivos son: **Firestore full-scan sin `where('proyectoId')`** (cada vista re-baja colecciones enteras de todas las obras), **0 `React.memo` / 0 `isAnimationActive` / 0 debounce** en toda la app (re-renders y jank en dashboards y búsquedas), y limpieza de assets muertos (`public/icons` 868 KB huérfano).

**Ganancia agregada estimada**: arranque −568 KB gz; sesión multi-vista −1 a 4 MB de Firestore; INP de búsquedas −100 a 300 ms; jank de gráficos eliminado.

---

## 2. Quick wins de velocidad (alto retorno, bajo esfuerzo)

| # | Quick win | Archivo:línea | Ganancia estimada |
|---|-----------|---------------|-------------------|
| 1 | Sacar `@react-pdf`/`yoga`/`fontkit`/`pdfkit` y `html2pdf`/`html2canvas`/`jspdf` del `manualChunks` manual (no devolver `vendor-pdf`/`vendor-html2pdf`); dejar que Rolldown los aísle por el `import()` dinámico sin crear arista al entry | `vite.config.js:49`, `vite.config.js:55-59` | **−568 KB gz** en el arranque (~3-6 s a interactivo en 3G) |
| 2 | Gate post-build: fallar el deploy si un pesado entra al entry | (script deploy) | Previene regresiones de 100-500 KB gz |
| 3 | Borrar `src/components/TareoPDF.jsx` (huérfano `@react-pdf`, 0 importadores) | `src/components/TareoPDF.jsx` | Quita arrastre de `@react-pdf` del grafo |
| 4 | Quitar `'recharts'` de `optimizeDeps.include` (es 100% lazy en prod) | `vite.config.js:20` | Cold-start dev más rápido; 0 impacto prod |
| 5 | Eliminar `public/icons/` (868 KB, 18 PNGs huérfanos; el manifest activo usa `/brand/`) + quitar `/icons/` del regex del SW | `public/icons`, `public/sw.js:69` | **−868 KB** en deploy de hosting |
| 6 | Excluir `vendor-charts` del `modulePreload` (añadir `charts` al regex) → no se precarga para perfiles sin gráficos (capataz/almacén) | `vite.config.js:31` | ~80-250 KB gz diferidos en arranque sin gráficos |
| 7 | `isAnimationActive={false}` en presets de series (un solo punto) | `src/utils/chartKit.js` | −200 a 1500 ms de animación por gráfico/cambio; quita jank "de crecimiento" |
| 8 | `firebase/storage` a init perezoso (`getStorageLazy`) — sale del chunk eager | `src/firebaseConfig.js:14,49` | ~15-40 KB gz + menos parse/eval en boot |
| 9 | Borrar `sw.js` raíz (código muerto; corre `public/sw.js`) | `sw.js` (raíz) | 0 runtime; elimina riesgo de editar el SW equivocado |

---

## 3. Alto impacto (mayor esfuerzo, mayor retorno)

### A. Bundle — vendor-pdf fuera del entry (Quick win #1, prioridad máxima)
El import estático entry→vendor-pdf es la causa #1 de arranque lento en celular. Tras el cambio, verificar con `grep -c 'from"./vendor-pdf' dist/assets/index-*.js` → debe dar **0**. Ganancia: ~568 KB gz menos en la ruta crítica.

### B. Firestore — filtro al SERVIDOR + suscripción compartida
`Registros_Campo` (1107+ docs), `Kardex_Movimientos`, `PlanMaestro`, `APUs`, `Protocolos`, etc. se leen con `onSnapshot(collection(...))` **sin `where('proyectoId')` ni `limit`**, descargando todas las obras y filtrando en cliente. El mismo full-scan se repite en 8+ vistas (`useRO.js`, `EstadoObra.jsx`, `RDOView.jsx`, `PanelGerencia.jsx`, `ComparativoFrentes.jsx`, etc.).
- Mover el filtro a servidor: `query(collection(db,'Registros_Campo'), where('proyectoId','==',activo), orderBy('fecha','desc'), limit(N))` (índice compuesto gratis en Spark). Para CREDITEX legacy (`creditex-ptar`, sin `proyectoId`) usar un `where` específico o migrar el campo.
- Centralizar `Registros_Campo`/`PlanMaestro`/`APUs`/`Kardex` en **un provider único** montado con `key={proyectoActivoId}` y que `useRO`/`EstadoObra`/dashboards consuman, en vez de 8-11 suscripciones duplicadas.
- Separar **suscripción** (depende solo de `proyectoActivoId`) del **filtrado** (`useMemo` con `filtrarPorContexto`): cambiar de frente NO debe re-suscribir la red.
- Ganancia: 1-4 MB y 1-4 s menos en 3G por sesión; sin re-descargas al navegar/cambiar frente.

### C. React — `React.memo` + extraer charts (0 memo hoy en todo src)
Sin `React.memo`, cualquier `setState` del padre re-renderiza y re-anima el chart completo. Aplicar `React.memo` a las hojas más caras primero: `Graficos`, `Tendencias`, `WarRoomCuadrillas`, `TrabajadorCard`, y extraer cada `<LineChart>` de `DashboardEjecutivo.jsx` a subcomponente memoizado que reciba solo su `data` memoizada. Combinar con `isAnimationActive={false}`. Ganancia: 50-200 ms por interacción (teclear/drag) en pantallas con gráficos.

### D. Gráficos — `Graficos.jsx` (11 ResponsiveContainer simultáneos)
Es el peor caso: monta 5-11 charts a la vez sin tabs, todos animando, con `dot` por punto. Acciones: `isAnimationActive={false}`, tabular/lazy-montar por sección, `dot={false}` cuando >20 puntos. Ganancia: 300-800 ms en primer render.

### E. INP — debounce de búsquedas (0 debounce hoy)
Decenas de inputs filtran listas grandes síncronamente por tecla (`AnalisisHHCross`, `CommandPalette`, `CatalogoMateriales`, `Almacenero`, `ProtocolosView`, etc.). Crear `useDebouncedValue(v,200)` o usar `useDeferredValue` y aplicarlo al término ANTES del `.filter`/`useMemo`. Ganancia: INP −100 a 300 ms; elimina el "lag" del teclado.

### F. Lazy — BIM dentro de paneles (descarga sin abrir la pestaña)
`CalidadPanel.jsx:18` y `OficinaTecnicaPanel.jsx:17` importan `BIM` **estático**; el condicional `tab==='bim'` solo retrasa el montaje, no la descarga → todo el árbol BIM (~942 líneas + visor 3D) viaja en esos chunks. Convertir a `React.lazy(() => import('./BIM'))` + `<Suspense>` en ambos paneles. Ganancia: ~150-300 KB menos en cada chunk de Calidad/OT.

---

## 4. Plan por iteraciones (ordenado por impacto/esfuerzo; cada una desplegable de forma segura)

> Tras cada iteración: `fetch+rebase origin/main` → `build` → `deploy hosting grapco-demo-2026` → `push`. Verificación objetiva indicada en cada paso.

**Iteración 1 — Sacar vendor-pdf/html2pdf del entry (la palanca #1).**
En `vite.config.js`, quitar las ramas `manualChunks` que devuelven `'vendor-pdf'` (líneas 55-59) y `'vendor-html2pdf'` (línea 49); dejar que Rolldown aísle esos paquetes por el `import()` dinámico. Build y verificar `grep -c 'from"./vendor-pdf' dist/assets/index-*.js` → **0**. Riesgo bajo: el PDF se sigue cargando bajo demanda. Ganancia −568 KB gz.

**Iteración 2 — Gate anti-regresión en el deploy.**
Añadir al script de deploy: `grep -lE 'from"\./vendor-(pdf|html2pdf|xlsx|exceljs|faceapi|charts)-' dist/assets/index-*.js && { echo "ALERTA: pesado en entry"; exit 1; }`. Garantiza que la Iteración 1 no se revierta sola. Sin impacto runtime.

**Iteración 3 — Limpieza de assets muertos.**
Borrar `public/icons/` (868 KB huérfano), `manifest.json` raíz duplicado, `sw.js` raíz (código muerto), `src/components/TareoPDF.jsx` (huérfano), `src/App.css` y `src/index.css` (restos plantilla Vite, no importados), `public/hero.png` y `public/grapco-logo-square.jpeg` (no usados en runtime). Quitar `/icons/` del regex de `public/sw.js:69`. Verificar build OK y que ninguna `import` apunte a ellos. **−~890 KB** en deploy.

**Iteración 4 — Excluir vendor-charts del modulePreload + isAnimationActive global.**
En `vite.config.js:31` añadir `charts` al regex de `resolveDependencies`. En `src/utils/chartKit.js` exportar preset `SERIE_BASE = { isAnimationActive: false }` (o `!isMobile`) y esparcirlo en las series. Quitar `'recharts'` de `optimizeDeps.include`. Verificar que `vendor-charts` no aparece en `index.html` como modulepreload. Ganancia: gráficos sin jank + ~80-250 KB diferidos para perfiles sin gráficos.

**Iteración 5 — `firebase/storage` perezoso.**
En `firebaseConfig.js` reemplazar `getStorage(app)` a nivel módulo por `export const getStorageLazy = () => import('firebase/storage').then(m => m.getStorage(app))`; actualizar los 12+ uploaders (FotoUploader, EntradaMaterial, etc.) a consumirlo. NO tocar Firestore/Auth (boot-críticos, offline-first). Verificar que `firebase/storage` sale del chunk eager. Ganancia ~15-40 KB gz + menos parse en boot.

**Iteración 6 — Lazy de BIM en los dos paneles.**
`const BIM = React.lazy(() => import('./BIM'))` + `<Suspense fallback={<SkeletonPantalla/>}>` en `CalidadPanel.jsx` y `OficinaTecnicaPanel.jsx`. Reusa el chunk BIM ya definido en `App.jsx`. Verificar que abrir Calidad/OT sin tocar la pestaña BIM no descarga el chunk BIM (Network tab). −150-300 KB por chunk.

**Iteración 7 — `where('proyectoId')` + limit en las colecciones calientes.**
Añadir `where('proyectoId','==',proyectoActivoId)` + `orderBy('fecha','desc')` + `limit(N)` a `Registros_Campo` y `Kardex_Movimientos` en `useRO.js`, `EstadoObra.jsx`, `RDOView.jsx`, `useHistorial` (`useFirebaseData.js`), `Almacenero.jsx`. Manejar el caso legacy `creditex-ptar`. Crear los índices compuestos (Spark, gratis). Desplegar reglas/índices ANTES del código. Verificar que la query no rompe (consola sin "needs index"). Ganancia 0.5-2 MB por vista en 3G.

**Iteración 8 — Provider único para colecciones compartidas.**
Crear `RegistrosCampoProvider` (y opcional `KardexProvider`) montado con `key={proyectoActivoId}` que mantenga UNA suscripción; `useRO`/`EstadoObra`/`PanelGerencia`/`ComparativoFrentes` la consumen en vez de re-suscribir. Separar suscripción (por `proyectoActivoId`) del filtrado (`useMemo` con `filtrarPorContexto`) para que cambiar de frente NO re-lea la red. Verificar que navegar RO→EstadoObra→RDO no re-descarga `Registros_Campo` (Network). Elimina re-descargas duplicadas.

**Iteración 9 — `React.memo` en hojas caras de gráficos.**
Envolver en `React.memo`: `Graficos`, `Tendencias`, `WarRoomCuadrillas`, `CpiEac`, `TrabajadorCard`. En `DashboardEjecutivo.jsx` extraer el `<LineChart>` a `<TendenciaChart serie={serie} />` memoizado (props ya memoizadas con `useMemo`). Verificar que teclear/arrastrar en el dashboard no re-anima el chart. 50-200 ms por interacción.

**Iteración 10 — `Graficos.jsx`: tabular + reducir nodos SVG.**
`isAnimationActive={false}` en todas las series; tabular/lazy-montar por sección (no 11 charts a la vez); `dot={false}` para series >20 puntos + `slice(-30)` en históricas (patrón ya correcto en `DashboardEjecutivo.jsx:286`). 300-800 ms en primer render.

**Iteración 11 — Debounce de búsquedas (INP).**
Crear `src/hooks/useDebouncedValue.js` (o usar `useDeferredValue`). Aplicar el término diferido al `.filter`/`useMemo` en `AnalisisHHCross`, `CommandPalette`, `CatalogoMateriales`, `Almacenero`, `ProtocolosView`, `OrdenesListView`, `GestionUsuarios`, `PagoObreros`. Input controlado para feedback inmediato. INP −100 a 300 ms.

**Iteración 12 — Barras de progreso a `transform:scaleX` + reset global reduce-motion.**
Cambiar las ~30 barras que animan `width` a `transform:scaleX(pct/100)` con `transformOrigin:left` (compositor, sin reflow) — priorizar las que re-animan por tick (importador almacén, uploaders). Añadir a `global.css` el bloque `@media (prefers-reduced-motion: reduce)` universal (`*,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important }`) y acotar `buttonStyle` (`utils/styles.js:236`) de `transition:'all'` a propiedades baratas explícitas. 60 fps en dashboards densos + accesibilidad WCAG en toda la app.

**Iteración 13 — SW: cache-first persistente para assets hasheados.**
En `public/sw.js`, no versionar la caché de `/assets/*-HASH.*` (cache-first persistente; los hashes garantizan frescura) y servir el app-shell con stale-while-revalidate en vez de network-first. Validar `fresh.ok && status===200 && type!=='opaque'` antes de `cache.put`. Coordinar el `skipWaiting` con un único reload (quitar des-registro+borrado total de caches de `verificarVersion` en `main.jsx`). 200-600 KB menos por deploy (vendor-chunks no se re-bajan) + FCP repeat-visit <100 ms.

---

## 5. Notas de seguridad de despliegue

- Toda iteración es **independiente y reversible**; desplegar de a una y verificar en Network/Lighthouse.
- Iteración 7 requiere **desplegar índices de Firestore ANTES** del código (si no, la query falla con "needs index").
- Respetar **offline-first**: no tocar `initializeFirestore`/`getAuth` eager ni la persistencia IndexedDB; el SW debe seguir cacheando el shell.
- **Costo $0**: índices compuestos y todo lo anterior caben en plan Spark; sin Blaze/Vertex/Cloud Run.
- **Paleta BASE**: cualquier fallback de fondo (sin video) usa el gradiente navy/gold ya presente en los overlays.
