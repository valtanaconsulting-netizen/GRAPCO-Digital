# Auditoría total de la plataforma GRAPCO

**Fecha:** 22 de junio de 2026
**Objetivo:** ordenar y organizar todos los archivos del repositorio para facilitar el mantenimiento a largo plazo y la resolución rápida de incidencias.

> Este documento es el **mapa de referencia** de la plataforma. Manténlo vivo: cuando cambie la estructura, actualiza la sección correspondiente.

---

## 1. Resumen ejecutivo

El código de la aplicación está **sano** (solo ~4 % de código muerto, sin duplicados ni archivos `_old/_bak`). El desorden está sobre todo en la **periferia del repositorio**: scripts scratch sin clasificar, material de obra suelto, dos esquemas de carpetas de vistas conviviendo, y `.gitignore` incompletos.

| Área | Estado | Acción principal |
|---|---|---|
| Código `src/` (app) | 🟢 Sano | Borrar 13 archivos muertos confirmados |
| Organización `src/views` | 🟡 Dos esquemas en paralelo | Decidir esquema canónico; quitar andamio vacío |
| `src/components` (33 planos) | 🟡 Sin agrupar | Agrupar en subcarpetas por tipo |
| `scripts/` (111 archivos) | 🔴 Mezcla útil/scratch | Separar permanentes vs. diagnósticos; documentar |
| `.gitignore` (raíz + app) | 🟡 Incompletos | Añadir reglas faltantes |
| Material en raíz | 🟡 Suelto | Confirmar ignore explícito |
| `docs/` (10 .md + 28 .html) | 🟡 HTML sin clasificar | Archivar reportes históricos |
| `SIGMA_PLATAFORMA/` | 🟢 Ya extraído | Confirmar el borrado en git |

---

## 2. Mapa de la plataforma (estado actual)

```
PROYECTO GRAPCO 2026/                  ← raíz del repo (GRAPCO-Digital)
├── GRAPCO_PROYECTO_COMPLETO/          ← LA APP (React + Vite + Firebase)
│   ├── src/
│   │   ├── main.jsx (145 L) / App.jsx (1188 L)   ← entrada + routing
│   │   ├── components/   (33 archivos, todo plano)
│   │   ├── views/        (152 archivos) ← ver §4
│   │   ├── utils/        (49 archivos + import/ pdf/ plantillas/)
│   │   ├── hooks/ (4) · contexts/ (4) · data/ (15) · config/ (1)
│   │   └── styles/
│   ├── public/   (brand, icons, models, plantillas)
│   ├── functions/        ← Cloud Functions Firebase
│   ├── android/ · ios/   ← app nativa (Capacitor)
│   ├── scripts/  (111 archivos) ← ver §5
│   ├── docs/     (10 .md + 28 .html) ← ver §6
│   ├── .design-sync/     ← inputs durables design system (SÍ versionado)
│   ├── .ds-sync/ · ds-bundle/   ← artefactos design system (NO versionado)
│   ├── _scratch_costos/  ← scratch local (NO versionado)
│   └── dist/ · .firebase/       ← build/deploy (NO versionado)
├── 05. Gestión Costos/   ← material de obra real (~1 GB, NO versionado)
├── *.xlsx / *.pdf / *.mp4 sueltos   ← referencias (NO versionadas)
├── .venv/                ← virtualenv Python (NO versionado)
└── package-lock.json     ← HUÉRFANO vacío (versionado por error)
```

**Total versionado:** 606 archivos.

---

## 3. Código muerto (confirmado, sin referencias en todo `src/`)

Verificado por grep en todo el árbol de imports. **13 archivos** seguros para borrar:

### 3.1 Carpeta `src/views/seguridad/` — 5 archivos
SSOMA se movió a la plataforma independiente **SIGMA** (15/06/2026). Ya no se importa desde `App.jsx`.
- `SeguridadPanel.jsx`, `ATSGaleria.jsx`, `DashboardSeguridad.jsx`, `HistorialSeguridad.jsx`, `InspeccionSeguridad.jsx`

### 3.2 Carpeta `src/views/modulos/apus/` — 5 archivos
El APU (Análisis de Precios Unitarios) salió de GRAPCO: es costos y vive en plataforma aparte (15/06/2026).
- `APUsPanel.jsx`, `APUEditor.jsx`, `APUsList.jsx`, `CatalogoInsumos.jsx`, `ComparativoAPU.jsx`
- ⚠️ `utils/calcularCostoAPU` SÍ se conserva (lo usa el RO).

### 3.3 Archivos sueltos — 3 archivos
- `src/views/capataz/secciones/HeaderCapataz.jsx` — sin referencias
- `src/views/lps/SugerirCuadrillaButton.jsx` — sin referencias
- `src/utils/ispParser.js` — parser ISP sin uso (el ISP_Semanal sigue pendiente; reincorporar si se retoma)

> El resto de `src/` (hooks, contexts, data, config, components) está **100 % referenciado**. No hay duplicados ni archivos `_old/_viejo/Copy/.bak`.

---

## 4. Organización de `src/views` (152 archivos)

### Problema: dos esquemas en paralelo
1. **Legacy plano (vivo):** paneles raíz (`Capataz.jsx` 1217 L, `Ingeniero.jsx` 1123 L, `Almacenero.jsx`, `CalidadPanel.jsx`, `OficinaTecnicaPanel.jsx`) + carpetas planas por dominio (`admin/`, `capataz/`, `calidad/`, `materiales/`, `planeamiento/`, `oficinatecnica/`, …).
2. **`modulos/` (vivo):** 12 módulos con lazy-load (`planMaestro/`, `panelGerencia/`, `resultadoOperativo/` con 16 archivos, `portfolio/`, `radarProduccion/`, `estadoObra/`, `proyectos/`, …).
3. **`_paneles_por_rol/` (andamio vacío):** solo contiene `README.md` describiendo una migración futura por rol que **nunca se implementó**.

### Inconsistencias de nombres
- `oficinatecnica/` (carpeta, minúsculas) vs `OficinaTecnicaPanel.jsx` vs `oficinaTecnica` (en el README del andamio). **Normalizar a `oficinaTecnica`.**
- Mezcla ES/EN entre módulos (`planeamiento` vs `portfolio` vs `radarProduccion`). Tolerable, pero documentar el criterio.
- Los módulos no tienen patrón interno consistente (`resultadoOperativo/` tiene 16 archivos sin subcarpetas; otros tienen 1).

### Recomendación (conservadora)
- **Decisión a tomar:** o se adopta `_paneles_por_rol/` como destino y se migra, o se **borra el andamio vacío** para no confundir. Recomendado: **borrarlo** (la migración masiva de paneles de 1000+ líneas es riesgosa y no aporta valor inmediato).
- Adoptar como convención que **cada módulo nuevo** viva bajo `modulos/<nombre>/` con `components/` y `utils/` internos cuando crezca (patrón de `resultadoOperativo/`).
- Normalizar `oficinatecnica/` → `oficinaTecnica/` en una pasada dedicada (toca imports).

---

## 5. `scripts/` (111 archivos: 42 versionados + 69 sin trackear)

### 5.1 Permanentes — CONSERVAR (~27 versionados)
Extractores (`extraer*.cjs`), seeds (`seed-*.mjs`), migraciones (`migrate-prod-to-demo`, `consolidar-en-ptari5`), reparaciones puntuales documentadas (`fix-dni-adrian`, `renombrar-apellidos-primero`), generadores de íconos PWA. Nombres semánticos claros.

### 5.2 Diagnósticos scratch — ARCHIVAR / IGNORAR (~88 entre `_diag_*`, `_dump_*`, `_inspect_*`, `_probe_*`, `_test_*`, `_count_*`, `_drift_*`, etc.)
69 sin trackear + ~19 versionados. Son auditorías de un solo uso. **No deberían contaminar `scripts/`.**

### 5.3 Artefactos derivados — IGNORAR
- `scripts/_costos_catalog/` y `scripts/_almacen_normalized.json` son **salida** de extractores (regenerables), no fuente.

### Recomendación
- Mover diagnósticos a `scripts/scratch/` y añadir `scripts/scratch/` a `.gitignore` (o ignorar `scripts/_*.cjs`).
- Crear `scripts/README.md` clasificando: **permanentes** (cómo correrlos) vs **scratch** (desechables).

---

## 6. `docs/` (10 .md vivos + 28 .html sin clasificar)

- **`.md` (vivos, conservar):** ARQUITECTURA-DATOS, ANALISIS-GESTION-COSTOS, AUDITORIA-COSTOS-OT, MAPA-*, MEJORAS-PLATAFORMA, PERFORMANCE-AUDIT, APP-NATIVA, SETUP_GOOGLE_DRIVE_SHEETS, SUSTENTACION-PRODUCCION, y esta auditoría.
- **`.html` (28):** reportes/informes históricos generados (títulos tipo "Bloque 8", "War Room", "Plan VDC"). Conservan valor de archivo pero ensucian. **Mover a `docs/archived/`** y dejar un índice.
- **Subcarpetas:** `docs/_costos_secciones/` (análisis CREDITEX) y `docs/congreso/` (paper/póster) → conservar como referencia.

---

## 7. Higiene de Git / `.gitignore`

| Item | Estado | Acción |
|---|---|---|
| `package-lock.json` (raíz) | Versionado, huérfano vacío | **`git rm`** |
| `SIGMA_PLATAFORMA/` | Marcado `D` en status | **Confirmar borrado** (`git rm -r`) |
| `.venv/` (raíz) | No versionado, no en ignore | Añadir a `.gitignore` raíz |
| `05. Gestión Costos/` | No versionado (~1 GB) | Añadir a `.gitignore` raíz (explícito) |
| `android/build/`, `android/.gradle/` | No versionado | Confirmar en `.gitignore` app |
| `scripts/_costos_catalog/`, `scripts/_almacen_normalized.json` | Versionados (derivados) | Mover a ignore |
| `.design-sync/` vs `.ds-sync/`/`ds-bundle/` | Correcto (durables sí, build no) | Sin cambios |

---

## 8. Plan de acción por fases

### Fase 1 — Limpieza segura (bajo riesgo, sin tocar lógica)
1. `git rm` del `package-lock.json` huérfano de la raíz.
2. Confirmar el borrado de `SIGMA_PLATAFORMA/`.
3. Borrar 13 archivos de código muerto (§3).
4. Borrar el andamio vacío `_paneles_por_rol/` (§4).
5. Completar `.gitignore` (raíz y app) (§7).
6. Mover diagnósticos a `scripts/scratch/` (ignorado) y crear `scripts/README.md`.
7. Mover los `.html` históricos a `docs/archived/`.

### Fase 2 — Reorganización estructural (riesgo medio, toca imports)
8. Normalizar `oficinatecnica/` → `oficinaTecnica/`.
9. Agrupar `src/components/` en subcarpetas (`primitives/`, `layout/`, `banners/`, `uploads/`, `reports/`, `guards/`, …).
10. Estandarizar la estructura interna de `modulos/` grandes (`components/`, `utils/`).

### Fase 3 — Mantenimiento continuo
11. Convención: módulo nuevo siempre bajo `modulos/<nombre>/`.
12. Mantener este documento actualizado.
13. Regla: scripts de un solo uso nacen en `scripts/scratch/`.

---

*Generado durante la auditoría del 22/06/2026.*
