# Mejoras de la Plataforma GRAPCO — Auditoría priorizada

> Consolidado de 17 auditores (7 dimensiones + 10 áreas funcionales). Orden por prioridad = impacto / esfuerzo. Hallazgos duplicados entre agentes están fusionados (ver "Temas transversales"). Toda referencia es `archivo:línea` para localización directa.

---

## 1. Resumen ejecutivo

La plataforma tiene cimientos sólidos: bundle bien aislado (vendors pesados fuera del preload), offline-first real (IndexedDB + service worker), sistema de diseño maduro (tokens BASE navy/gold), un motor EVM bien estructurado y un círculo Presupuesto↔RO↔Valorización que cierra correctamente. El problema NO está en la arquitectura sino en **defectos de corrección y consistencia de datos que hacen que los números que ve la gerencia no cuadren entre sí**, más **un aislamiento por proyecto que es cosmético** (solo cliente, las reglas de Firestore dejan leer toda la data de todos los proyectos).

Cuatro patrones dominan y se repiten en casi todas las áreas:

1. **Campo de HH equivocado** (`horasHombre`/`hh` en vez de `totalHH`) → el Costo Real de mano de obra del RO, el KPI de HH del Panel de Gerencia y el F06 salen ≈0; AC, CPI y Margen quedan subestimados. La app reporta **falsa sobre-rentabilidad**.
2. **Enlace material→partida roto** → la pata de Materiales del AC casi nunca cruza (igualdad exacta contra namespace distinto: WBS vs nombre de grupo vs id de doc), reforzando el CPI inflado.
3. **Aislamiento por proyecto solo en cliente** → reglas Firestore con `allow read: if isAuth()` sin `proyectoId`; CREDITEX y TEXTIL son mutuamente legibles. Además decenas de vistas leen colecciones completas sin filtrar.
4. **Escalada de privilegios en cliente** → `RoleGuard` en bypass global, PIN `9999`→admin hardcodeado, self-register a roles privilegiados, auto-creación de perfil como `ingeniero`.

**Total de hallazgos consolidados: ~70** (8 de seguridad alta, ~15 de corrección de cálculo, ~20 de aislamiento/datos, resto rendimiento/UX/calidad). El camino recomendado: primero los **quick wins de corrección de cálculo** (1 línea, devuelven la confianza en el RO), luego **endurecer auth/aislamiento** (riesgo legal y de fuga entre clientes), después **consolidar duplicación** (formato, suscripciones, fuentes de datos).

---

## 2. QUICK WINS — alto impacto + bajo esfuerzo

| # | Título | Archivo:línea | Por qué importa |
|---|--------|---------------|-----------------|
| 1 | RO lee HH de campo inexistente (`horasHombre`/`hh`); el real es `totalHH` → MO≈0, AC/CPI/Margen subestimados | `src/utils/planMaestroAnalytics.js:316` | El RO "oficial" muestra costo de MO ~0 y se contradice con el CR vivo; reporta sobre-rentabilidad falsa |
| 2 | PanelGerencia KPI "HH totales" usa `t.horasHombre\|\|t.hh` (≈0) en vez de `totalHH` | `src/views/modulos/panelGerencia/PanelGerencia.jsx:262` | Mismo bug; el KPI ejecutivo de HH muestra 0 con miles de HH registradas |
| 3 | `useRO` recalcula el RO completo en cada render por `fechaActual = new Date()` por defecto | `src/views/modulos/resultadoOperativo/useRO.js:15,97` | Recorre 11 colecciones en cada repintado; lo consumen 8 vistas |
| 4 | `calcularIndicadoresDiarios` usa `costoHH=14` por defecto, viola costo MO único S/25.50 | `src/utils/indicadoresEjecutivos.js:112` | Default trampa: subvalúa el sobrecosto ~45% |
| 5 | EAC/VAC global usan BAC sin ajustes mientras la UI muestra BAC ajustado (adic./deduct.) | `src/utils/planMaestroAnalytics.js:625-628` | Margen proyectado al cierre mal calculado al mezclar dos bases |
| 6 | `RoleGuard` en bypass global (`BYPASS_ROLES=true`): todos los muros de rol son no-ops | `src/components/RoleGuard.jsx:20` | Interruptor de dev en producción; ProyectosPanel queda abierto a todo rol |
| 7 | PINs de obra hardcodeados, incluido `9999`→admin sin validar escalada | `src/views/SelectorPerfil.jsx:27,187` | Puerta trasera de admin tecleando un PIN del bundle |
| 8 | Importador S10: pintar el LAP borra marcas PPC (`setDoc` sin `merge`) | `src/views/VDC.jsx:2074` | Pérdida de datos: borra el cierre de ejecución del último planificador |
| 9 | Selector de modelos BIM siempre muestra el id del doc, no `nombreOriginal` | `src/views/BimShell.jsx:247` | Lista de IDs ilegibles; inusable elegir modelo |
| 10 | Tabla de Auditoría (960px) sin `overflowX:auto` → columnas inalcanzables en móvil | `src/views/Auditoria.jsx:76-80` | Contenido cortado sin scroll, no solo apretado |
| 11 | `fmtPct` con decimales en 2 utils, viola regla "% sin decimales (Math.round)" | `src/utils/helpers.js:16`, `src/utils/planMaestroAnalytics.js:782` | Muestra `9.5%` en vez de `10%` |
| 12 | `index.css` muerto con paleta morada `#aa3bff` y `#root{width:1126px}` que rompería el layout | `src/index.css:1-67` | Trampa: si alguien lo re-importa rompe centrado y paleta |
| 13 | `sw.js` huérfano en la raíz del proyecto, duplicado del activo `public/sw.js` | `sw.js:1` | Confunde: dev puede editar el SW equivocado |
| 14 | DashboardOT lee campos de valorización que ya no existen (`v.subtotalBruto`/`v.total`) → KPIs en S/0 | `src/views/oficinatecnica/DashboardOT.jsx:31-34` | El tablero ejecutivo de OT siempre muestra S/0.00 |
| 15 | PIN/firebaseConfig: apiKey + projectId de prod hardcodeados como fallback | `src/firebaseConfig.js:18-19` | Cualquier build accidental apunta a la base real (sin separación demo/prod) |
| 16 | LastPlannerPro: fecha inicio CPM hardcodeada `'2025-12-15'` ≠ rector `03/11/2025` | `src/views/planeamiento/LastPlannerPro.jsx:90` | Lookahead y semanas dejan de conversar en proyecto nuevo |
| 17 | CronogramaPro fallback `'2025-12-15'` y deps incompletas → fecha stale al cambiar proyecto | `src/views/planeamiento/CronogramaPro.jsx:76,111-133` | CPM/Curva S de un proyecto nuevo se calculan con fecha de CREDITEX |
| 18 | `optimizeDeps.include` fuerza pre-bundle de `xlsx` (contradice su lazy-load) | `vite.config.js:18` | Ralentiza cold start del dev server |

---

## 3. ALTO IMPACTO — estratégicos (esfuerzo medio/alto)

| # | Título | Área | Esfuerzo | Por qué |
|---|--------|------|----------|---------|
| A | **Sin aislamiento por proyecto a nivel de reglas**: todo auth lee toda la data de todos los proyectos | Seguridad | Alto | `firestore.rules` usa `allow read: if isAuth()`; `proyectoId` solo aparece en comentarios. Fuga entre CREDITEX y TEXTIL (montos, márgenes, planillas). El `filtrarPorContexto` es solo cliente, se evade con la consola |
| B | **Self-register a roles privilegiados** (`logistica`/`calidad`/`planeamiento`…) con escritura sobre colecciones sensibles | Seguridad | Medio | `firestore.rules:76`; cualquier cuenta Auth se auto-asigna rol y escribe en Materiales/Protocolos/PlanMaestro |
| C | **La pata de Materiales del AC casi nunca cruza** (matcher asimétrico + namespace de partida distinto) | RO/Materiales | Medio | `planMaestroAnalytics.js:308 vs 323-325`; salidas escriben texto de grupo o id de doc, el RO cruza por WBS exacto. costoMat=0 silencioso |
| D | **Aislamiento por proyecto inconsistente en lecturas** (Materiales/Almacén/Kardex, RDOView, DashboardOT, useHistorial, Carta Balance, ValidacionOptimizador) | Datos | Medio | Decenas de vistas suscriben colecciones completas sin `where('proyectoId')`; el RDO contractual se genera con producción de otra obra |
| E | **El aislamiento depende de `localStorage` y `RoleGuard` off**, no de `proyectoIdAsignado` ni de queries acotadas | Auth | Alto | `ProyectoActivoContext.jsx:144`; cualquiera cambia el proyecto activo; auto-perfil como `ingeniero` ve todo |
| F | **Dos definiciones de Costo Real MO** (crVivo vs F06/crOficial) que no cuadran con la misma data | RO | Medio | `CostoRealCR.jsx:53-61` vs `planMaestroAnalytics.js:314-319`; fuentes y cruces distintos rompen el "CR triple que conversa" |
| G | **SPI y Curva S inválidos sin fechas programadas** (proxy `PV=BAC`) → "Atraso crítico" en partidas recién iniciadas | RO/EVM | Medio | `planMaestroAnalytics.js:404-407`; SPI=EV/BAC = % avance, no índice de cronograma. Curva S Programada plana |
| H | **Colección legacy `Historial` como segunda fuente de avance** (solo lectura, no documentada) alimenta EV/Curva S en paralelo a `Registros_Campo` | Datos | Medio | `useRO.js:53`; EV del RO puede divergir del avance real; fuente fantasma sin owner |
| I | **El marcador biométrico no alimenta pago ni tareo F13**: HH/tolerancia/salida-piso quedan huérfanos | Asistencia | Alto | `Asistencia_Diaria` nunca se consume; pago sale solo de `detalleTareo`. Las reglas de hora son decorativas |
| J | **Fotos de obra se pierden sin señal** (Storage no tiene cola offline; no hay fallback base64) | Resiliencia | Medio | `FotoUploader.jsx:102`, `MarcadorAsistencia.jsx:175`; rompe la promesa offline-first |
| K | **Arranque en frío sin señal cuelga la app para siempre** (`getDoc` de perfil sin fallback de cache ni timeout) | Resiliencia | Bajo | `AuthContext.jsx:125,203,272`; splash "Cargando plataforma…" infinito |
| L | **Escrituras críticas hacen `await batch.commit()`** que offline no resuelve → spinner colgado, capataz reintenta y duplica | Resiliencia | Medio | `Capataz.jsx:575,639`; el dato sí se encoló pero la UI cree que falló |
| M | **Doble archivado a Drive** (cliente + Cloud Function) duplica PDFs y se pisan `archivado.drive` | Calidad | Medio | `PdfFirmadoUploader.jsx:37` vs `functions/protocolosArchivado.js`; dos árboles que nunca coinciden |
| N | **Integridad de firmas: el cliente puede falsificar estado/firmas y liberar con ítems críticos NO_OK** | Calidad/Seg | Medio | `ProtocoloEditor.jsx:128-192`; checks de rol solo en UI, sin re-validación server-side |
| O | **Dos Last Planner paralelos que no conversan**: VDC (CREDITEX estático, rico) vs LastPlannerPro (vivo, pobre) | Arquitectura | Alto | El valor del LPS queda atrapado en el proyecto muerto; el proyecto nuevo arranca casi de cero |
| P | **Histórico de Carta Balance se mezcla por letra de columna (A-G)**, no por obrero real | Carta Balance | Alto | `cartaBalanceAnalytics.js:223-241`; ranking, parejas y optimizador sobre identidades falsas |
| Q | **Valorización de stock mezcla USD y PEN** (usa `costoUnitario` en vez de `costoUnitarioPEN`) | Materiales | Medio | `materialesAnalytics.js:104`; CPP, S10 valorizado y dashboard distorsionados |
| R | **Privacidad biométrica**: descriptores faciales y fotos sin consentimiento, sin cifrado, foto grupal con URL pública | Asistencia/Seg | Medio | Ley 29733 PE; dato biométrico sensible, fuga irreversible |
| S | **«Generar programación» sobrescribe el cronograma y borra tareas/baseline/avances sin confirmar** | Planeamiento | Bajo | `EditorWbsIsp.jsx:497-518`; `setDoc` con `baseline:null`, pérdida irreversible |
| T | **useRO suscribe 11 colecciones completas sin `where`/`limit`** y filtra en cliente | Rendimiento | Medio | `useRO.js:40-74`; descarga colecciones de todos los proyectos en cada apertura del RO |
| U | **Video de fondo de 22.5 MB con `preload="auto"`** en el Login (primera pantalla de todos) | Rendimiento | Bajo | `Login.jsx:776`; mayor costo de red de la app, choca con offline-first y obra en celular |

---

## 4. Hallazgos por área

### 4.1 Bugs / Corrección — EVM/RO/HH, listeners, semanas
- RO: Costo Real MO lee campo inexistente → quick win #1.
- PanelGerencia HH totales ≈0 → quick win #2.
- **ControlGerencial: HH planilla nunca casa** — asistencia indexada por semana ISO del año, tareos por semana rector. `useFirebaseData.js:152-162` vs `helpers.js:1200`. Siempre cae al estimado. (medio)
- useRO recálculo por `new Date()` → quick win #3.
- EVM proxy `PV=BAC` → alto impacto G.
- Curva S Real lee `Historial` → alto impacto H.
- `costoHH=14` → quick win #4.

### 4.2 Rendimiento / Bundle
- Video 22.5 MB → alto impacto U.
- useRO 11 colecciones sin filtro → alto impacto T.
- `calcularROMensual` en cada render → quick win #3 (mismo bug).
- Hooks globales (`Personal`/`Cuadrillas`/`Planes_Diarios`) sin filtro server-side, `Planes_Diarios` sin `limit`. `useFirebaseData.js:55,76,93,24`. (medio)
- PanelGerencia/EstadoObra suscriben colecciones completas sin limit en pantallas de arranque. `EstadoObra.jsx:45`, `PanelGerencia.jsx:50`. (medio)
- `optimizeDeps.include` con `xlsx` → quick win #18.

### 4.3 Seguridad
- Sin aislamiento por reglas → alto impacto A.
- Self-register a roles privilegiados → alto impacto B.
- `PASSWORD_INGENIERIA="GRAPCO2025"` en el bundle (código muerto). `src/utils/styles.js:19`. (bajo) — eliminar.
- Secretos APS reales en `functions/.env` en disco (OneDrive). `functions/.env:3`. (bajo) — migrar a Functions Secrets + rotar.
- Kardex confía en `email` del request, no UID; sin validar proyecto. `firestore.rules:265`. (bajo)
- Storage: `Avatars` con `read: if true`; catch-all deja escribir PDFs en `protocolos-firmados/**`. `storage.rules:35,45`. (medio)
- Cloud Functions admin con CORS `*` y operan en el Firestore default, no el del caller. `functions/admin.js:32,80,291`. (medio)

### 4.4 Arquitectura de Datos
- Materiales/Almacén/Kardex sin aislar → alto impacto D.
- DashboardOT KPIs sobre todos los proyectos → ver 4.9 + quick win #14.
- Legacy `Historial` → alto impacto H.
- `useHistorial` sin filtrar por proyecto → alto impacto D.
- RDOView genera RDO con producción de todos los proyectos → alto impacto D (consecuencia legal/comercial).
- **Tres representaciones de "partida"** (`Catalogo_WBS` / `PartidasContractuales` / `Partidas`) sin puente formal. `usePresupuestoContractual.js:34`, `PartidasView.jsx:30`, `useCatalogoWBS.js:24`. (alto) — documentar clave de cruce.
- Maestros globales (Personal/Cuadrillas/Materiales/Configuracion) sin dimensión de proyecto, mezclados con data por-proyecto. Documentar columna "ámbito" en `ARQUITECTURA-DATOS.md`. (medio)

### 4.5 Calidad / Duplicación
- **Formateadores moneda triplicados y divergentes** (`S/ ` vs `S/. `): `calidadOTAnalytics.js:435`, `planMaestroAnalytics.js:772`, `materialesAnalytics.js:497`, `helpers.js:18`, `tipoCambioClient.js:169`. Crear `utils/formato.js` canónico. (alto valor, bajo esfuerzo)
- `fmtPct` con decimales → quick win #11.
- **Patrón de suscripción Firestore copiado en ~50 vistas** (88 ocurrencias del map): falta `useColeccion(nombre, opciones)` genérico en `useFirebaseData.js`. (medio)
- Parsers numéricos locale-aware reimplementados (~9); `parseNumero` de `ImportadorRegistros.jsx:23` es el robusto → mover a `utils/formato.js`. (bajo)
- `VDC.jsx` monolito ~2990 líneas (21 componentes); `fmtN` duplicado en `VDC.jsx:2358` y `2592`. Extraer a `views/lps/` y `utils/lps.js`. (alto)

### 4.6 Offline-first / Resiliencia
- Arranque en frío cuelga → alto impacto K.
- `await batch.commit()` offline → alto impacto L.
- Fotos sin cola offline → alto impacto J.
- `onSnapshot` sin callback de error en Almacenero; catch vacío en VDC. `Almacenero.jsx:29-33`, `VDC.jsx:159`. (bajo)
- Toast "guardado offline" tras el `await` → nunca aparece sin señal. `VDC.jsx:169,177`. (bajo) — UI optimista.
- `sw.js` huérfano → quick win #13.

### 4.7 Oficina Técnica
- DashboardOT campos inexistentes → quick win #14.
- 4 vistas de OT (DashboardOT/RDOView/SustentoMetrados/InformeSustento) sin aislar → alto impacto D.
- `usePresupuestoContractual`/ValorizacionesView descargan colección entera y filtran en cliente. `usePresupuestoContractual.js:34`. (bajo) — usar `where('proyectoId')`.
- InformeSustento: Periodo vacío (`periodo.hasta` no existe, usar `periodoTexto`) y nomenclatura PQ-XX vs V-XX. `InformeSustento.jsx:124,34`. (bajo)
- Valorización permite avance acumulado menor al ya valorizado (período negativo) sin confirmación. `ValorizacionesView.jsx:240,258`. (bajo)
- FG y Detracción sobre total CON IGV (base discutible para FG). `ValorizacionesView.jsx:252-253`. (bajo) — confirmar base contractual.
- Parser PPTO descarta la 2ª columna numérica (montoF2). `presupuestoParser.js:62,71`. (medio)

### 4.8 Resultado Operativo + Motor EVM
- Pata Materiales no cruza → alto impacto C.
- Dos definiciones de CR MO → alto impacto F.
- SPI/Curva S sin fechas → alto impacto G.
- EAC/VAC ignoran adic./deduct. → quick win #5.
- F06 corre el motor 3 veces por render (toda obra + F1 + F2). `ResultadoOperativoOficial.jsx:97-121`, `ROFrentes.jsx:21-40`. (medio) — indexar costos por partida una vez.
- Total F06 no reconcilia (EV/PV de frentes vs total de cálculos distintos; `frenteId` nulo se duplica). `ResultadoOperativoOficial.jsx:172-193`. (medio)
- Curva S "Real" define EV distinto al resto (avance×PU desde Historial, ignora valorizaciones). `planMaestroAnalytics.js:745-758`. (bajo)

### 4.9 Materiales / Almacén / Compras
- Descarga directa nunca alimenta RO (`partidaDestino = id de doc`). `EntradaMaterial.jsx:245`. (medio) → parte de alto impacto C.
- Importador S10 por defecto no alimenta RO (mapea al nombre de grupo, no al WBS). `ImportarRegistroAlmacen.jsx:174`. (bajo)
- Valorización stock USD/PEN → alto impacto Q.
- Reclasificaciones distorsionan CPP (delta negativo como SALIDA positiva). `materialesAnalytics.js:102`. (medio)
- Catálogos Materiales/Almacenes sin `filtrarPorContexto`; importador escanea movimientos cross-proyecto. `DashboardMateriales.jsx:26`, `ImportarRegistroAlmacen.jsx:209`. (bajo)
- Doble conteo si conviven importador S10 y salidas manuales en la misma partida. `planMaestroAnalytics.js:323`. (medio)
- Cadena S10 parcial infla el primer mes (delta = acumulado completo). `registroAlmacenParser.js:166`. (bajo)

### 4.10 Plan Maestro / WBS / Cronograma
- Fecha inicio stale + `'2025-12-15'` hardcodeado → quick win #17.
- «Generar programación» borra cronograma → alto impacto S.
- CPM recalcula 2-3 veces; `sincronizarAvance` corre `calcularCPM` extra. `CronogramaPro.jsx:136,301`. (bajo) — reusar `cpm.tareas`.
- Rompe-ciclos del orden topológico puede dejar fechas incorrectas. `cpm.js:122-143`. (medio) — re-ejecutar Kahn tras sanear.
- Sincronización de avance falla en silencio si nombres no calzan con catálogo. `CronogramaPro.jsx:274-324`. (medio) — mostrar lista sin match.
- Línea HOY colapsa a día 0 si hoy < inicio de obra. `cpm.js:43-55`. (bajo)
- Gantt SVG redibuja todo el árbol en cada hover (setState en mouseenter). `CronogramaPro.jsx:680-738`. (medio) — highlight por CSS / React.memo.

### 4.11 Last Planner / VDC
- LAP borra marcas PPC → quick win #8.
- Dos Last Planner paralelos → alto impacto O.
- LastPlannerPro fecha `'2025-12-15'` → quick win #16.
- SectorizacionTren/PullPlanning: paleta no-compacta (tarjetón + emoji) y data CREDITEX fija. `SectorizacionTren.jsx:11-42`. (medio) — migrar a VistaHeader BASE.
- Matrices LAP/ProgSemanal: miles de celdas DOM con handlers + recuento O(n·d) sin memoizar. `VDC.jsx:2350-2521`. (medio)
- PPCLap mezcla denominadores (cumplidos/planificados vs /evaluados), divergente de LastPlannerPro. `VDC.jsx:2794-2810`. (bajo) — unificar fórmula PPC.
- LastPlannerPro: `setDoc` completo sin merge ni `onSnapshot` vivo (pisa ediciones concurrentes). `LastPlannerPro.jsx:177-190`. (bajo)

### 4.12 Calidad / Protocolos
- Doble archivado Drive → alto impacto M.
- Firma digital nunca aparece en el Archivo (`ArchivoProtocolosView` filtra por `archivado.storage.url`). `ProtocoloEditor.jsx:159-192`, `ArchivoProtocolosView.jsx:30-48`. (medio) — agujero de trazabilidad.
- Integridad de firmas → alto impacto N.
- OAuth Client ID hardcodeado como fallback; SA pide scope `drive` completo (no `drive.file`). `googleDriveClient.js:19-23`, `protocolosArchivado.js:45-52`. (bajo)
- Cloud Function escribe path con `x` literal en vez del orden real de semana. `protocolosArchivado.js:201`. (bajo)
- ArchivoProtocolosView ordena por `fechaCreacion.seconds` sin fallback robusto; `frenteCodigo` no canónico (`F-01` vs `F01`). `ArchivoProtocolosView.jsx:36-71`. (bajo)
- Firma "vacía" detectada con heurística frágil (`dataUrl.length < 1000`); upload fallido deja estado avanzado sin firma. `ProtocoloEditor.jsx:113-157`. (bajo)

### 4.13 Asistencia / Tareo / Capataz
- Biométrico no alimenta pago/tareo → alto impacto I.
- Foto-evidencia rompe el lote offline → alto impacto J (mismo patrón Storage).
- Closure obsoleto de `hoy` puede inflar HH de salida. `MarcadorAsistencia.jsx:213-225`. (bajo)
- **Dos numeraciones de semana** (ISO del año en `useAsistenciaDiaria` vs rector LPS) → mismo bug que ControlGerencial (4.1). `useFirebaseData.js:152-163`. (bajo) — usar `obtenerSemana`.
- Privacidad biométrica → alto impacto R.
- Loop de reconocimiento a 608px cada ~260ms sin pausa/backoff (CPU/batería del kiosko). `MarcadorAsistencia.jsx:240-317`. (medio)
- PagoObreros: `useMemo` con deps incompletas (`registrosCanon`/`resolverNombre` fuera del array). `PagoObreros.jsx:87-114`. (bajo)

### 4.14 Cuadrillas / Carta Balance
- Histórico por letra de columna → alto impacto P.
- War Room rompe aislamiento (`===` estricto descarta legacy; cuadrillas por ventana equivocada). `WarRoomCuadrillas.jsx:42-65`. (bajo)
- "Precisión" del optimizador inflada (promedio simple de LUF vs LUF agregado real). `cartaBalanceAnalytics.js:452-455,620-641`. (medio)
- ValidacionOptimizador lee `Cartas_Balance` sin aislar (expone nombres entre clientes). `ValidacionOptimizador.jsx:22-51`. (bajo)
- Agrupamiento por `cuadrillaOrigen` nunca funciona (jamás se persiste). `CartaBalance.jsx:192-210`. (bajo)
- CartaBalance permite cargos Peón/Técnico, contra el estándar de 4 cargos. `CartaBalance.jsx:392-396`. (bajo) — restringir a `CAP/OP/OF/AY`.
- `onSnapshot` sin límite + recálculo O(n²) de parejas en cada cambio. `OptimizadorCuadrillas.jsx:39-68`. (medio)

### 4.15 Admin / Auth / Proyectos / Roles
- `RoleGuard` en bypass → quick win #6.
- PINs hardcodeados (`9999`→admin) → quick win #7.
- Aislamiento advisory por `localStorage` → alto impacto E.
- Auto-perfil como `ingeniero` ante cualquier cuenta y ante error de lectura. `AuthContext.jsx:121,152`. (medio) — auto-crear con rol mínimo.
- Rate-limit de login solo en `localStorage` (saltable). `Login.jsx:10,149`. (bajo) — documentar que la defensa real es Firebase Auth.
- apiKey/projectId de prod hardcodeados → quick win #15.
- ProyectosPanel (crear/eliminar proyectos) accesible a ingeniero/planeamiento, no solo admin. `App.jsx:642,675`. (medio).

### 4.16 BIM
- Selector muestra id del doc → quick win #9.
- Selección de elemento (`onSeleccion` + `PanelElementoBIM`) es código muerto. `BimShell.jsx:273`, `BIM.jsx:232`. (medio) — cablear o eliminar.
- Token APS no se cachea: cada refresh dispara Cloud Function + ID token. `apsClient.js:176`. (bajo) — cachear respetando `expires_in`.
- `modelosDisponibles` incluye `'inprogress'` (sin SVF2) → el visor falla al cargarlos. `BIM.jsx:40`. (bajo) — dejar solo `'success'`.
- Federación `urns[]` implementada pero nunca cableada. `BimShell.jsx:273`. (medio) — exponer o eliminar.
- `onModelReady` cachea bajo `getSavedUrn()` (localStorage) en vez del urn cargado. `BimShell.jsx:102`. (bajo)
- Subida multipart a S3 sin reintentos ni abort. `apsClient.js:51`. (bajo).

---

## 5. Temas transversales (lo que se repite en varias áreas)

1. **Campo HH equivocado (`horasHombre`/`hh` vs `totalHH`)** — RO (4.1/4.8), PanelGerencia (4.1), F06 (4.8). Un solo grep y fix de patrón. La fuente única es `totalHH` en `Registros_Campo` (escrito por `Capataz.jsx:604-616`).
2. **Aislamiento por proyecto solo en cliente** — aparece en Seguridad (reglas), Datos, OT, Materiales, Carta Balance, Asistencia, Admin. La raíz es A (reglas Firestore) + E (`localStorage`); las decenas de lecturas sin `where('proyectoId')` son síntomas.
3. **Dos numeraciones de semana** (ISO del año vs rector LPS `03/11/2025`) — ControlGerencial (4.1) y Asistencia (4.13). Unificar con `obtenerSemana(fecha, FECHA_INICIO_PROYECTO)`.
4. **`await commit/addDoc/getDoc` que offline no resuelve** — Capataz, Protocolos, VDC, Marcador, AuthContext. Patrón: UI optimista + commit en background con `.catch`.
5. **Storage sin cola offline** — FotoUploader (Capataz) y Marcador facial pierden fotos. Patrón: fallback base64 en doc Firestore (como `VDC_Evidencias`).
6. **Enlace material↔partida por igualdad exacta contra namespaces distintos** — descarga directa (id de doc), importador S10 (nombre de grupo), RO (WBS). Unificar al código WBS canónico.
7. **Duplicación de formateadores y de parsers numéricos** — `fmtSoles`/`fmtNumero`/`fmtPct`/`fmtMoney`/`fmtN` y ~9 parsers. Crear `utils/formato.js` canónico (`S/ ` sin punto, % con `Math.round`).
8. **Patrón `onSnapshot` copiado ~50 veces** sin hook `useColeccion` ni callback de error consistente — Calidad, Materiales, Compras, OT, Almacenero.
9. **`new Date()` / fechas hardcodeadas (`2025-12-15`)** que rompen aislamiento y rendimiento — useRO, CronogramaPro, LastPlannerPro, EstadoObra.
10. **Credenciales/secretos en el bundle o disco** — `PASSWORD_INGENIERIA`, PINs, OAuth Client ID, apiKey, `functions/.env` en OneDrive.
11. **Escalada de privilegios en cliente** — RoleGuard off, PIN admin, self-register, auto-`ingeniero`. Las Firestore Rules deben ser la última línea.
12. **Funcionalidad a medio construir / código muerto** — federación BIM, `PanelElementoBIM`, `cuadrillaOrigen`, `index.css`, `sw.js` raíz, `PASSWORD_INGENIERIA`.

---

## 6. Riesgos de seguridad (prioridad)

| Riesgo | Severidad | Acción mínima |
|--------|-----------|---------------|
| Sin aislamiento por reglas: fuga CREDITEX↔TEXTIL | **Alta** | Persistir `proyectoId` en docs y exigirlo en reglas (lectura contra `proyectoIdAsignado`). Empezar por RO/Valorizaciones/Facturas/Personal/PlanMaestro |
| Self-register a roles privilegiados | **Alta** | Restringir create a rol mínimo (capataz/invitado read-only); promoción solo por admin |
| RoleGuard en bypass global | **Alta** | `BYPASS_ROLES=false` (o derivar de `DEV && localhost`) |
| PIN `9999`→admin en el bundle | **Alta** | Eliminar el atajo PIN→admin/ingeniero; PIN solo abre kiosko de marcador |
| Auto-perfil como `ingeniero` ante cualquier cuenta/error | **Alta** | Auto-crear con rol mínimo; fallback de error NO concede ingeniero |
| Firmas de calidad falsificables desde cliente; liberar con críticos NO_OK | **Alta** | Mover transición de estado/firma a Cloud Function que valide rol y críticos server-side |
| Privacidad biométrica (descriptores/fotos sin consentimiento, foto grupal pública) | **Alta** | Consentimiento por trabajador, retención/borrado, endurecer Storage Rules de `Asistencia/**` |
| Storage: `Avatars` read público; catch-all escribe `protocolos-firmados/**` | Media | `read: if request.auth != null`; restringir ruta de protocolos a rol calidad/admin |
| Cloud Functions admin: CORS `*` + operan en Firestore default | Media | CORS a orígenes conocidos; `firestoreDelCaller(user)` en todas las funciones admin |
| Secretos APS en `functions/.env` (OneDrive) | Media | Migrar a Functions Secrets + rotar `client_secret` |
| Kardex confía en `email` del request | Media | Anclar autor a `request.auth.uid` + validar `proyectoId` |
| apiKey/projectId/OAuth/`PASSWORD_INGENIERIA` hardcodeados | Media-baja | Quitar fallbacks literales; fallar ruidoso si falta el `.env`; eliminar constantes muertas |

---

## 7. Roadmap por fases

**Fase 0 — Confianza en los números (1-2 días, casi todo 1 línea).**
Corregir el campo HH (`totalHH`) en RO, PanelGerencia y F06; estabilizar `fechaActual` en useRO; `costoHH=COSTO_HORA_PROMEDIO`; EAC/VAC sobre BAC ajustado; `fmtPct` con `Math.round`; DashboardOT a campos F07 reales. Cierra los quick wins 1-5, 11, 14.

**Fase 1 — Cerrar la puerta (seguridad de cliente, 2-3 días).**
`RoleGuard` off; eliminar PIN admin; quitar `PASSWORD_INGENIERIA`, apiKey/OAuth hardcodeados; migrar `functions/.env` a Secrets + rotar; auto-perfil con rol mínimo. Quick wins 6, 7, 15.

**Fase 2 — Aislamiento por proyecto real (1-2 semanas).**
Persistir `proyectoId` y exigirlo en Firestore Rules (colecciones sensibles primero); `ProyectoActivoContext` lee `proyectoIdAsignado` para no-admin; añadir `where('proyectoId')`+`limit` en las lecturas (Materiales/Almacén, RDOView, useHistorial, DashboardOT, useRO, Carta Balance, ValidacionOptimizador). Resuelve A, B, D, E, T.

**Fase 3 — Datos del RO que cuadran (1-2 semanas).**
Unificar enlace material→partida al código WBS canónico (C); una sola definición de CR MO (F); SPI/Curva S desde cronograma con fechas, sin proxy PV=BAC (G); decidir el destino de `Historial` (H); USD/PEN en stock (Q); indexar costos por partida una vez (F06 ×3). 

**Fase 4 — Offline-first robusto (1 semana).**
Arranque en frío con timeout/cache (K); UI optimista en escrituras (L); fallback base64 para fotos (J); callbacks de error en `onSnapshot`; toasts antes del await.

**Fase 5 — Consolidación y reuso (continuo).**
`utils/formato.js` y `toNumeroSeguro` canónicos; hook `useColeccion`; unificar los dos Last Planner (O) y la identidad real en Carta Balance (P); extraer subcomponentes de VDC; biométrico↔pago/tareo (I); doble archivado Drive (M); firmas server-side (N); privacidad biométrica (R); limpieza de código muerto (BIM, `index.css`, `sw.js`).

---

*Generado a partir del consolidado de 17 auditores. Ruta: `GRAPCO_PROYECTO_COMPLETO/docs/MEJORAS-PLATAFORMA.md`.*
