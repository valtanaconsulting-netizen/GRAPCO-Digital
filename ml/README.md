# ml/ — Dirección de Machine Learning

El informe de tesis señaló, con razón, que **todavía no se puede entrenar un
modelo de ML serio con la información disponible**. Esta carpeta es el camino
para que eso deje de ser cierto: mide cuántos datos hay de verdad, los
convierte en datasets entrenables, y solo entrena cuando los números lo
justifican. Nada de resultados inventados.

## Regla de honestidad (innegociable)

1. El tamaño del dataset **se mide** (censo del exportador), no se estima.
2. Todo modelo se compara contra **baselines tontos** (persistencia y media)
   con **validación temporal** (nunca aleatoria: el futuro no puede filtrarse
   al pasado). Un modelo que no supera al baseline **no se usa ni se reporta**
   como logro.
3. Los datasets contienen datos reales de obra y nombres de personal:
   **jamás se suben al repo** (gitignored aquí y en la raíz). Cualquier cifra
   que vaya a la tesis se genera desde estos scripts, reproducible.

## Qué datos reales existen hoy

Colecciones de Firestore del área de Producción (proyecto CREDITEX PTAR,
~36 semanas en curso). Las más relevantes para ML:

| Colección | Contenido | Granularidad |
|---|---|---|
| `Registros_Campo` | Reporte diario: partida, cuadrilla, avance, horas | **diaria** (tabla madre) |
| `Asistencia_Diaria` | Presencia de personal | diaria |
| `Cartas_Balance` | Muestreo de trabajo productivo/contributorio/no contributorio | por medición |
| `Planes_Diarios` / `PullPlanningTareas` | Compromisos LPS y su cumplimiento | diaria/semanal |
| `ValorizacionesContractuales`, `SustentoMetrados` | Avance valorizado | por periodo |
| `PlanMaestro`, `Partidas`, `APUs`, `Cuadrillas`, `Frentes` | Contexto/maestros | estática |
| `Kardex_Movimientos`, `Materiales`, `Almacenes` | Consumo de materiales | por movimiento |

La granularidad manda: los objetivos **diarios** acumulan muestras ~30× más
rápido que los semanales. Por eso la fase 1 apunta al rendimiento diario y no
al CPI semanal.

## Objetivos candidatos (de más viable a menos)

| Objetivo | Tipo | Muestras posibles hoy | Estado |
|---|---|---|---|
| Rendimiento diario por partida (avance/HH) | regresión | cientos (36 sem × partidas activas) | **Fase 1** |
| ¿Se cumplirá este compromiso LPS? | clasificación | cientos si se cuenta por tarea | Fase 1b |
| % trabajo productivo esperado (carta balance) | regresión | decenas | esperar |
| Desviación CPI/SPI semanal | regresión | ~36 | esperar (estadística sí, ML no) |

## Fases

**Fase 0 — Censo y dataset (ya ejecutable).**
`grapco ml exportar` saca un snapshot de Firestore a `ml/datasets/<fecha>/`
(un CSV por colección + `_censo.json` con los conteos reales). Correrlo
**semanalmente** para acumular historia versionada local.
Criterio de salida: saber el número exacto de filas útiles de `Registros_Campo`.

**Fase 1 — Baselines honestos (cuando Registros_Campo ≥ ~100 filas útiles).**
`grapco ml entrenar -- --csv datasets/<fecha>/Registros_Campo.csv --objetivo <col>`
entrena Ridge y RandomForest contra los baselines de persistencia y media,
con TimeSeriesSplit. El script **se niega** a entrenar por debajo del umbral
y dice cuánto falta. Salida: tabla MAE/RMSE con veredicto explícito
("supera al baseline en X%" o "NO supera al baseline — no usar").

**Resultado Fase 1 (2026-07-09, 1,172 registros, jueces adversariales incluidos):**
en pronóstico puro, el campeón es la **media histórica causal por actividad**
(MAE ±9.6 HH) — ningún ML la supera aún; el RandomForest con metrado del día
da MAE 8.9 pero es un *estimador condicional* con mejora no concluyente
(p≈0.13–0.45). Detalle completo y decisiones en el acta del dataset
(`datasets/<fecha>/entrenamiento_totalHH.md`). La palanca identificada:
**registrar el metrado planificado** (`metaMetrado`, hoy vacío) para habilitar
el estimador condicional legítimo. Escenario ex-ante reproducible con
`python experimentos_hh.py --csv ... --solo-exante`.

**Fase 2 — Modelos útiles (≥300–500 filas, idealmente 2.º proyecto).**
Gradient boosting, features de contexto (partida, cuadrilla, frente, clima si
se registra), predicción por rangos (cuantiles) para EAC/duración. Un segundo
proyecto en la plataforma es lo que más valor agrega: sin él, el modelo
aprende CREDITEX y no construcción.

**Fase 3 — Integración.** El modelo ganador se sirve desde una Cloud Function
y la app muestra la predicción junto al dato real (con su intervalo, nunca
como certeza). Solo se llega aquí con Fase 2 aprobada.

## Cómo correr

```powershell
.\grapco ml exportar                  # censo + CSVs en ml/datasets/<fecha>/
.\grapco ml exportar --coleccion Registros_Campo --limite 50000
.\grapco ml entrenar --csv datasets/<fecha>/Registros_Campo.csv --objetivo rendimiento
```

Requisitos: `grapco secretos` (el exportador lee Firestore con serviceAccount)
y para entrenar `pip install pandas scikit-learn`.
