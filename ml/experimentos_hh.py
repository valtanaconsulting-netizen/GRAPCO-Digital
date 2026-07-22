# ============================================================================
# experimentos_hh.py — Fase 1b: estimador de horas-hombre por actividad diaria
# ----------------------------------------------------------------------------
# Mejora sobre entrenar_baseline.py con tres reglas de honestidad extra:
#   1. Features CAUSALES: toda "historia" usa solo filas anteriores en el
#      tiempo (expanding + shift), nunca el presente ni el futuro.
#   2. Baseline DURO: media histórica por actividad (no solo media global).
#      Un modelo solo vale si le gana a ESO.
#   3. Métricas del KPI K3 de la tesis (R², MAPE) además de MAE/RMSE,
#      reportadas tal cual salgan.
#
# Uso:  python experimentos_hh.py --csv datasets/<fecha>/Registros_Campo.csv
# ============================================================================

import argparse
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

CORTES = 5
SEMILLA = 42


def cargar(ruta):
    df = pd.read_csv(ruta)
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha", "totalHH"])
    # Orden temporal estable (timestamp desempata registros del mismo día)
    # utc=True: la columna mezcla timestamps con y sin zona horaria
    df["_ts"] = pd.to_datetime(df.get("timestamp"), errors="coerce", format="mixed", utc=True)
    df = df.sort_values(["fecha", "_ts"], kind="stable").reset_index(drop=True)
    return df


def construir_features(df):
    X = pd.DataFrame(index=df.index)
    y = df["totalHH"].astype(float)

    # --- numéricas directas (sin futuro) ---
    X["metrado"] = pd.to_numeric(df["metrado"], errors="coerce").fillna(0.0)
    X["log_metrado"] = np.log1p(X["metrado"].clip(lower=0))
    X["semana"] = pd.to_numeric(df["semana"], errors="coerce").fillna(0)
    X["dia_semana"] = df["fecha"].dt.dayofweek
    X["dias_desde_inicio"] = (df["fecha"] - df["fecha"].min()).dt.days

    # --- historia causal a NIVEL DE FECHA: solo días ANTERIORES cuentan ---
    # (un lag por fila filtraría registros del mismo día — información que en
    #  despliegue real, prediciendo el plan de mañana, no existiría)
    def hist_por_fecha(clave, valores, nombre):
        tmp = pd.DataFrame({"k": clave.to_numpy(), "f": df["fecha"].to_numpy(),
                            "v": np.asarray(valores, float)})
        diario = (tmp.dropna(subset=["v"]).groupby(["k", "f"], sort=True)["v"]
                  .mean().reset_index().sort_values(["k", "f"]))
        g = diario.groupby("k")["v"]
        diario[f"{nombre}_media_hist"] = g.transform(lambda s: s.expanding().mean().shift(1))
        diario[f"{nombre}_rolling3"] = g.transform(
            lambda s: s.shift(1).rolling(3, min_periods=1).mean())
        diario[f"{nombre}_lag1"] = g.shift(1)
        diario[f"{nombre}_n_hist"] = g.cumcount()
        m = tmp.merge(diario.drop(columns="v"), on=["k", "f"], how="left")
        return m

    m_act = hist_por_fecha(df["actividad"], y, "act")
    for c in ["act_media_hist", "act_rolling3", "act_lag1", "act_n_hist"]:
        X[c] = m_act[c].to_numpy()
    m_sub = hist_por_fecha(df["subpartida"], y, "sub")
    X["sub_media_hist"] = m_sub["sub_media_hist"].to_numpy()
    X["sub_n_hist"] = m_sub["sub_n_hist"].to_numpy()
    m_par = hist_por_fecha(df["partida"], y, "par")
    X["par_media_hist"] = m_par["par_media_hist"].to_numpy()
    X["par_n_hist"] = m_par["par_n_hist"].to_numpy()
    m_met = hist_por_fecha(df["actividad"], pd.to_numeric(df["metrado"], errors="coerce"), "actm")
    X["act_metrado_hist"] = m_met["actm_media_hist"].to_numpy()

    # --- física del problema: HH ≈ productividad histórica × metrado de hoy ---
    ratio = (y / X["metrado"]).where(X["metrado"] > 0)
    m_ratio = hist_por_fecha(df["actividad"], ratio, "ratio")
    X["hh_x_metrado_hist"] = m_ratio["ratio_media_hist"].to_numpy()
    X["pred_fisica"] = (X["hh_x_metrado_hist"] * X["metrado"]).clip(0, 300)

    # media global causal (también por fecha) como respaldo
    m_glob = hist_por_fecha(pd.Series(0, index=df.index), y, "glob")
    global_hist = pd.Series(m_glob["glob_media_hist"].to_numpy(), index=df.index)
    for c in ["act_media_hist", "sub_media_hist", "par_media_hist",
              "act_lag1", "act_rolling3", "pred_fisica"]:
        X[c] = X[c].fillna(X["act_media_hist"]).fillna(global_hist)
    X["act_metrado_hist"] = X["act_metrado_hist"].fillna(0.0)
    X["hh_x_metrado_hist"] = X["hh_x_metrado_hist"].fillna(0.0)
    X = X.fillna(0.0)

    # --- categóricas ---
    cats = ["partida", "frenteId", "metodo_carga", "unidad"]
    X = pd.concat([X, pd.get_dummies(df[cats].astype(str), prefix=cats, dtype=float)], axis=1)
    # actividad (117 valores) como código para árboles; HGB la usa como
    # categórica nativa (el código es solo una etiqueta, sin información del objetivo)
    X["actividad_cod"] = df["actividad"].astype("category").cat.codes
    return X, y, global_hist


def evaluar(y_real, y_pred):
    y_real, y_pred = np.asarray(y_real, float), np.asarray(y_pred, float)
    mae = mean_absolute_error(y_real, y_pred)
    rmse = mean_squared_error(y_real, y_pred) ** 0.5
    r2 = r2_score(y_real, y_pred)
    # MAPE solo donde el real es material (>=1 HH): con ceros el MAPE explota
    m = y_real >= 1.0
    mape = float(np.mean(np.abs((y_pred[m] - y_real[m]) / y_real[m])) * 100) if m.any() else float("nan")
    return mae, rmse, r2, mape


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--solo-exante", action="store_true", dest="solo_exante",
                    help="excluye el metrado ejecutado del mismo día: solo señales "
                         "conocibles ANTES del día (escenario de pronóstico puro)")
    args = ap.parse_args()

    df = cargar(args.csv)
    X, y, global_hist = construir_features(df)
    if args.solo_exante:
        # El metrado real del día se registra JUNTO con las HH (mismo tareo):
        # en pronóstico puro no se conoce. Veredicto adversarial 2026-07-09.
        X = X.drop(columns=["metrado", "log_metrado", "pred_fisica"])
        print("MODO SOLO-EXANTE: sin metrado del día ni predicción física")
    print(f"Dataset: {len(df)} filas | features: {X.shape[1]} columnas | "
          f"{df['fecha'].min().date()} -> {df['fecha'].max().date()}")

    modelos = {
        "ridge": Ridge(alpha=1.0),
        "bosque": RandomForestRegressor(
            n_estimators=400, min_samples_leaf=3, max_features=0.5, random_state=SEMILLA),
        "hgb": HistGradientBoostingRegressor(
            max_iter=400, learning_rate=0.06, max_leaf_nodes=31,
            l2_regularization=1.0, random_state=SEMILLA,
            categorical_features=["actividad_cod"]),
        "hgb_log": HistGradientBoostingRegressor(
            max_iter=400, learning_rate=0.06, max_leaf_nodes=31,
            l2_regularization=1.0, random_state=SEMILLA,
            categorical_features=["actividad_cod"]),
    }
    bases = ["baseline_media", "baseline_persistencia", "baseline_act_hist"]
    if not args.solo_exante:
        bases.append("baseline_fisico")
    nombres = bases + list(modelos) + ["ensamble"]
    acumulado = {n: [[], []] for n in nombres}  # [reales, predichos]

    tss = TimeSeriesSplit(n_splits=CORTES)
    for tren, prueba in tss.split(X):
        Xtr, Xte = X.iloc[tren], X.iloc[prueba]
        ytr, yte = y.iloc[tren], y.iloc[prueba]
        preds = {
            "baseline_media": np.full(len(yte), ytr.mean()),
            "baseline_persistencia": np.full(len(yte), ytr.iloc[-1]),
            # el baseline duro: media histórica causal de la actividad
            "baseline_act_hist": X["act_media_hist"].iloc[prueba].to_numpy(),
        }
        if not args.solo_exante:
            # la física sola: productividad histórica × metrado de hoy
            preds["baseline_fisico"] = X["pred_fisica"].iloc[prueba].to_numpy()
        for nombre, modelo in modelos.items():
            if nombre.endswith("_log"):
                modelo.fit(Xtr, np.log1p(ytr))
                preds[nombre] = np.expm1(modelo.predict(Xte))
            else:
                modelo.fit(Xtr, ytr)
                preds[nombre] = modelo.predict(Xte)
        # ensamble simple de los dos mejores enfoques (bosque + boosting en log)
        preds["ensamble"] = (preds["bosque"] + preds["hgb_log"]) / 2
        for nombre, p in preds.items():
            acumulado[nombre][0].extend(yte)
            acumulado[nombre][1].extend(p)

    print(f"\nResultados agregados sobre los {CORTES} cortes temporales "
          f"({len(acumulado['ridge'][0])} predicciones out-of-time):")
    print(f"{'modelo':<24}{'MAE':>8}{'RMSE':>8}{'R2':>8}{'MAPE%*':>9}")
    filas = []
    for nombre in nombres:
        met = evaluar(*acumulado[nombre])
        filas.append((nombre, *met))
        print(f"{nombre:<24}{met[0]:>8.3f}{met[1]:>8.3f}{met[2]:>8.3f}{met[3]:>9.1f}")
    print("* MAPE calculado sobre registros con HH real >= 1 (con ceros explota)")

    mejor_base = min((f for f in filas if f[0].startswith("baseline")), key=lambda f: f[1])
    print(f"\nBaseline a vencer: {mejor_base[0]} (MAE {mejor_base[1]:.3f})")
    print("Veredicto:")
    for f in filas:
        if f[0].startswith("baseline"):
            continue
        mejora = (mejor_base[1] - f[1]) / mejor_base[1] * 100
        marca = "SUPERA" if mejora > 5 else "NO supera"
        print(f"  {f[0]}: {marca} al baseline duro ({mejora:+.1f}% MAE)")

    # --- interpretabilidad del mejor no-baseline ---
    candidatos = [f for f in filas if not f[0].startswith("baseline")]
    ganador = min(candidatos, key=lambda f: f[1])[0]
    # el ensamble no tiene importancias propias: se interpretan las del bosque
    interpretado = ganador if ganador in modelos else "bosque"
    modelo = modelos[interpretado]
    objetivo = np.log1p(y) if interpretado.endswith("_log") else y
    modelo.fit(X, objetivo)
    print(f"\nSeñales más importantes ({interpretado}, permutación sobre todo el set):")
    from sklearn.inspection import permutation_importance
    imp = permutation_importance(modelo, X, objetivo, n_repeats=5, random_state=SEMILLA)
    orden = np.argsort(imp.importances_mean)[::-1][:10]
    for i in orden:
        print(f"  {X.columns[i]:<28} {imp.importances_mean[i]:.4f}")

    # --- error por partida (para saber dónde confiar) ---
    print(f"\nMAE por partida ({ganador}, sobre las predicciones out-of-time):")
    reales = np.array(acumulado[ganador][0])
    predichos = np.array(acumulado[ganador][1])
    # las predicciones out-of-time corresponden a las últimas filas de cada corte
    idx_oot = np.concatenate([prueba for _, prueba in TimeSeriesSplit(n_splits=CORTES).split(X)])
    partidas = df["partida"].iloc[idx_oot].to_numpy()
    tabla = pd.DataFrame({"partida": partidas, "err": np.abs(reales - predichos)})
    resumen = tabla.groupby("partida")["err"].agg(["mean", "count"]).sort_values("count", ascending=False)
    for p, fila in resumen.head(8).iterrows():
        print(f"  {p[:44]:<46} MAE {fila['mean']:>6.2f}  (n={int(fila['count'])})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
