# ============================================================================
# entrenar_baseline.py — Fase 1 de la dirección de ML (ml/README.md)
# ----------------------------------------------------------------------------
# Entrena baselines honestos sobre un CSV exportado por exportar-dataset-ml:
#   - Baselines: media del train, persistencia (último valor observado)
#   - Modelos:   Ridge, RandomForest
#   - Validación TEMPORAL (TimeSeriesSplit) — nunca aleatoria
# Se NIEGA a entrenar por debajo del umbral de muestras y emite un veredicto
# explícito: un modelo que no supera al baseline NO se usa ni se reporta.
#
# Uso (desde ml/, o vía "grapco ml entrenar"):
#   python entrenar_baseline.py --csv datasets/2026-07-09/Registros_Campo.csv \
#       --objetivo rendimiento [--fecha fecha] [--min-muestras 100]
# ============================================================================

import argparse
import sys

# Consolas Windows en cp1252 no soportan todos los caracteres: forzar UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    ap = argparse.ArgumentParser(description="Baselines honestos GRAPCO-ML")
    ap.add_argument("--csv", required=True, help="CSV del dataset (ml/datasets/...)")
    ap.add_argument("--objetivo", required=True, help="Columna a predecir (numérica)")
    ap.add_argument("--fecha", default="fecha", help="Columna de fecha para el orden temporal")
    ap.add_argument("--min-muestras", type=int, default=100, dest="min_muestras")
    ap.add_argument("--max-categorias", type=int, default=20, dest="max_categorias",
                    help="Cardinalidad máxima para one-hot de columnas de texto")
    args = ap.parse_args()

    try:
        import numpy as np
        import pandas as pd
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.linear_model import Ridge
        from sklearn.metrics import mean_absolute_error, mean_squared_error
        from sklearn.model_selection import TimeSeriesSplit
    except ImportError as exc:
        print(f"Falta una dependencia ({exc.name}). Instala con: pip install pandas scikit-learn")
        return 2

    df = pd.read_csv(args.csv)
    print(f"Dataset: {args.csv} — {len(df)} filas x {len(df.columns)} columnas")

    if args.objetivo not in df.columns:
        print(f"La columna objetivo '{args.objetivo}' no existe. Columnas: {sorted(df.columns)}")
        return 2

    # Orden temporal obligatorio: sin él la validación se contamina
    if args.fecha in df.columns:
        df[args.fecha] = pd.to_datetime(df[args.fecha], errors="coerce")
        df = df.sort_values(args.fecha).reset_index(drop=True)
    else:
        print(f"AVISO: no hay columna '{args.fecha}'; asumo que el CSV ya viene en orden temporal.")

    y = pd.to_numeric(df[args.objetivo], errors="coerce")
    filas_utiles = y.notna()
    df, y = df[filas_utiles], y[filas_utiles]
    n = len(df)
    print(f"Filas con objetivo numérico válido: {n}")

    # ------ El guardián de honestidad ------
    if n < args.min_muestras:
        print(f"\nNO ENTRENO: hay {n} muestras y el umbral honesto es {args.min_muestras}.")
        print("Con menos datos, cualquier métrica sería ruido presentable como logro.")
        print("Sigue acumulando con 'grapco ml exportar' (semanal) y vuelve a intentar.")
        return 1

    # Features: numéricas directas + one-hot de categóricas de baja cardinalidad
    descartar = {args.objetivo, args.fecha, "_id"}
    numericas = [c for c in df.columns if c not in descartar
                 and pd.to_numeric(df[c], errors="coerce").notna().mean() > 0.9]
    categoricas = [c for c in df.columns if c not in descartar and c not in numericas
                   and df[c].nunique() <= args.max_categorias]
    X = pd.concat(
        [df[numericas].apply(pd.to_numeric, errors="coerce"),
         pd.get_dummies(df[categoricas].astype(str), prefix=categoricas, dtype=float)],
        axis=1,
    ).fillna(0.0)
    print(f"Features: {len(numericas)} numéricas + {len(categoricas)} categóricas "
          f"(one-hot -> {X.shape[1]} columnas)")
    if X.shape[1] == 0:
        print("No hay features utilizables; revisa el CSV.")
        return 2

    # Validación temporal: train siempre antes que test
    cortes = max(2, min(5, n // 30))
    tss = TimeSeriesSplit(n_splits=cortes)
    modelos = {
        "baseline_media": None,
        "baseline_persistencia": None,
        "ridge": Ridge(alpha=1.0),
        "bosque": RandomForestRegressor(n_estimators=200, min_samples_leaf=3, random_state=42),
    }
    mae = {k: [] for k in modelos}
    rmse = {k: [] for k in modelos}

    for tren, prueba in tss.split(X):
        Xtr, Xte = X.iloc[tren], X.iloc[prueba]
        ytr, yte = y.iloc[tren], y.iloc[prueba]
        predicciones = {
            "baseline_media": np.full(len(yte), ytr.mean()),
            "baseline_persistencia": np.full(len(yte), ytr.iloc[-1]),
        }
        for nombre in ("ridge", "bosque"):
            modelos[nombre].fit(Xtr, ytr)
            predicciones[nombre] = modelos[nombre].predict(Xte)
        for nombre, pred in predicciones.items():
            mae[nombre].append(mean_absolute_error(yte, pred))
            rmse[nombre].append(mean_squared_error(yte, pred) ** 0.5)

    print(f"\nResultados ({cortes} cortes temporales) — objetivo: {args.objetivo}")
    print(f"{'modelo':<24}{'MAE':>10}{'RMSE':>10}")
    for nombre in modelos:
        print(f"{nombre:<24}{np.mean(mae[nombre]):>10.4f}{np.mean(rmse[nombre]):>10.4f}")

    # ------ Veredicto explícito ------
    mejor_baseline = min(np.mean(mae["baseline_media"]), np.mean(mae["baseline_persistencia"]))
    veredictos = []
    for nombre in ("ridge", "bosque"):
        m = np.mean(mae[nombre])
        mejora = (mejor_baseline - m) / mejor_baseline * 100
        if mejora > 5:
            veredictos.append(f"  {nombre}: SUPERA al mejor baseline en {mejora:.1f}% (MAE) — candidato utilizable.")
        else:
            veredictos.append(f"  {nombre}: NO supera al baseline ({mejora:+.1f}%) — no usar ni reportar como logro.")
    print("\nVeredicto:")
    print("\n".join(veredictos))
    print("\nRegla: solo pasa a la tesis un modelo con veredicto positivo, citando este script y el dataset exacto.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
