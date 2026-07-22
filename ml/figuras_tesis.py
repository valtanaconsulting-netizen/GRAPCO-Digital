# ============================================================================
# figuras_tesis.py — Figuras y resultados reales para el informe de tesis
# ----------------------------------------------------------------------------
# Genera figuras publicables (serif, paleta del documento) desde el dataset
# real Registros_Campo, reusando el pipeline validado de experimentos_hh.py
# para que cada gráfico coincida EXACTAMENTE con los números auditados.
#
# Uso:  python figuras_tesis.py --csv datasets/<fecha>/Registros_Campo.csv --out <carpeta>
# ============================================================================

import argparse
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.ticker import MaxNLocator
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

from experimentos_hh import cargar, construir_features, evaluar, SEMILLA

# --- Identidad visual del documento (serif + azul institucional) ---
NAVY = "#1F4E79"; RED = "#C0392B"; GREEN = "#2E7D46"; GOLD = "#C99A2E"; GREY = "#9AA3AD"
plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["DejaVu Serif", "Times New Roman"],
    "font.size": 10.5,
    "axes.edgecolor": "#33393F", "axes.linewidth": 0.8,
    "axes.grid": True, "grid.color": "#E3E6E9", "grid.linewidth": 0.7,
    "axes.axisbelow": True, "figure.dpi": 150, "savefig.dpi": 150,
    "savefig.bbox": "tight",
})


def guardar(fig, out, nombre):
    ruta = os.path.join(out, nombre)
    fig.savefig(ruta)
    plt.close(fig)
    print(f"  figura -> {nombre}")


def fig_cobertura_actividades(df, out):
    ac = df.groupby("actividad").size().sort_values(ascending=False)
    top = ac.head(18)
    fig, ax = plt.subplots(figsize=(8.2, 5.2))
    colores = [NAVY if v >= 20 else GREY for v in top.values]
    y = np.arange(len(top))[::-1]
    ax.barh(y, top.values, color=colores, edgecolor="white", linewidth=0.5)
    ax.set_yticks(y)
    ax.set_yticklabels([t[:34] for t in top.index], fontsize=8.4)
    ax.axvline(20, color=RED, lw=1.2, ls="--")
    ax.text(20.5, 0.5, "umbral mínimo\npara aprender (20)", color=RED, fontsize=8, va="bottom")
    ax.set_xlabel("Registros diarios disponibles")
    ax.set_title("Cobertura del dataset por actividad (18 más frecuentes)\n"
                 f"{(ac>=20).sum()} de {len(ac)} actividades superan el umbral; el resto es cola larga",
                 fontsize=10.5, color=NAVY, loc="left")
    fig.tight_layout()
    guardar(fig, out, "fig_cobertura_actividades.png")


def fig_completitud(df, out):
    campos = {"totalHH": "Horas-hombre", "metrado": "Metrado", "partida": "Partida",
              "actividad": "Actividad", "semana": "Semana", "ipReal": "IP real",
              "detalleTareo": "Detalle de tareo", "capataz": "Capataz",
              "observacion": "Observación (causa)"}
    vals = [(v, 100 * df[k].notna().mean()) for k, v in campos.items() if k in df.columns]
    vals.sort(key=lambda x: x[1])
    nombres = [v[0] for v in vals]; pct = [v[1] for v in vals]
    colores = [RED if p < 20 else (GOLD if p < 75 else NAVY) for p in pct]
    fig, ax = plt.subplots(figsize=(8.2, 4.6))
    y = np.arange(len(nombres))
    ax.barh(y, pct, color=colores, edgecolor="white", linewidth=0.5)
    for yi, p in zip(y, pct):
        ax.text(p + 1.5, yi, f"{p:.0f}%", va="center", fontsize=8.6, color="#33393F")
    ax.set_yticks(y); ax.set_yticklabels(nombres, fontsize=9)
    ax.set_xlim(0, 108); ax.set_xlabel("Registros con el campo poblado (%)")
    ax.set_title("Completitud de campos del dataset (n = 1 172)\n"
                 "El corpus de causas (observación) llega al 3 %: aún no alimenta el modelo",
                 fontsize=10.5, color=NAVY, loc="left")
    fig.tight_layout()
    guardar(fig, out, "fig_completitud_dataset.png")


def correr_experimento(df):
    """Reproduce el escenario ex-ante (pronóstico puro) y devuelve todo lo graficable."""
    X, y, _ = construir_features(df)
    X = X.drop(columns=["metrado", "log_metrado", "pred_fisica"])  # solo ex-ante
    tss = TimeSeriesSplit(n_splits=5)
    # Configuración EXACTA de la Tabla 4.8 del informe (coherencia documento-figuras)
    rf = RandomForestRegressor(n_estimators=200, max_depth=10, min_samples_split=5,
                               min_samples_leaf=2, max_features="sqrt", random_state=SEMILLA)
    acc = {k: [[], []] for k in ["baseline_media", "baseline_act_hist", "bosque"]}
    r2_fold = {"bosque": [], "baseline_act_hist": []}
    idx_oot = []
    for tren, prueba in tss.split(X):
        Xtr, Xte = X.iloc[tren], X.iloc[prueba]
        ytr, yte = y.iloc[tren], y.iloc[prueba]
        rf.fit(Xtr, ytr)
        p_rf = rf.predict(Xte)
        p_bl = X["act_media_hist"].iloc[prueba].to_numpy()
        p_mg = np.full(len(yte), ytr.mean())
        for k, p in [("baseline_media", p_mg), ("baseline_act_hist", p_bl), ("bosque", p_rf)]:
            acc[k][0].extend(yte); acc[k][1].extend(p)
        r2_fold["bosque"].append(r2_score(yte, p_rf))
        r2_fold["baseline_act_hist"].append(r2_score(yte, p_bl))
        idx_oot.extend(list(prueba))
    return X, y, acc, r2_fold, np.array(idx_oot), rf


def fig_comparacion_modelos(acc, out):
    orden = [("baseline_media", "Media global\n(baseline trivial)", GREY),
             ("baseline_act_hist", "Media histórica\npor actividad\n(campeón)", NAVY),
             ("bosque", "Random Forest\n(ex-ante)", GOLD)]
    maes = [mean_absolute_error(*acc[k]) for k, _, _ in orden]
    r2s = [r2_score(*acc[k]) for k, _, _ in orden]
    etiquetas = [e for _, e, _ in orden]; colores = [c for _, _, c in orden]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.2, 4.6))
    x = np.arange(len(orden))
    a1.bar(x, maes, color=colores, edgecolor="white", width=0.62)
    for xi, m in zip(x, maes):
        a1.text(xi, m + 0.15, f"{m:.2f}", ha="center", fontsize=9.5, color="#33393F")
    a1.set_xticks(x); a1.set_xticklabels(etiquetas, fontsize=8.2)
    a1.set_ylabel("MAE  (horas-hombre)"); a1.set_ylim(0, max(maes) * 1.2)
    a1.set_title("Error medio absoluto  (menor es mejor)", fontsize=10, color=NAVY, loc="left")
    a2.bar(x, r2s, color=colores, edgecolor="white", width=0.62)
    for xi, r in zip(x, r2s):
        # etiquetas negativas justo sobre el eje cero para no chocar con los rótulos
        yy = r + 0.012 if r >= 0 else 0.012
        a2.text(xi, yy, f"{r:.2f}", ha="center", fontsize=9.5, color="#33393F", va="bottom")
    a2.set_xticks(x); a2.set_xticklabels(etiquetas, fontsize=8.2)
    a2.set_ylabel("R²"); a2.axhline(0, color="#33393F", lw=0.8)
    a2.set_ylim(min(r2s) - 0.06, max(r2s) * 1.18)
    a2.set_title("Poder explicativo R²  (mayor es mejor)", fontsize=10, color=NAVY, loc="left")
    fig.suptitle("Pronóstico puro de horas-hombre por actividad — 975 predicciones out-of-time (validación temporal)",
                 fontsize=10.8, color=NAVY, y=1.02, x=0.02, ha="left")
    fig.tight_layout()
    guardar(fig, out, "fig_comparacion_modelos.png")


def fig_error_por_partida(df, acc_reales, acc_pred, idx_oot, out):
    reales = np.array(acc_reales); pred = np.array(acc_pred)
    partidas = df["partida"].iloc[idx_oot].to_numpy()
    tab = pd.DataFrame({"p": partidas, "e": np.abs(reales - pred)})
    res = tab.groupby("p")["e"].agg(["mean", "count"]).sort_values("count", ascending=False).head(8)
    res = res.sort_values("mean")
    fig, ax = plt.subplots(figsize=(8.2, 4.6))
    y = np.arange(len(res))
    colores = [GREEN if m < 8 else (GOLD if m < 15 else RED) for m in res["mean"]]
    ax.barh(y, res["mean"], color=colores, edgecolor="white")
    for yi, (m, n) in zip(y, zip(res["mean"], res["count"])):
        ax.text(m + 0.3, yi, f"{m:.1f} HH  (n={int(n)})", va="center", fontsize=8.6, color="#33393F")
    ax.set_yticks(y); ax.set_yticklabels([p[:28] for p in res.index], fontsize=8.8)
    ax.set_xlabel("Error medio de predicción (horas-hombre)")
    ax.set_xlim(0, res["mean"].max() * 1.35)
    ax.set_title("Precisión del estimador por partida\n"
                 "Fiable en preliminares y concreto; degrada en acero y encofrado (alta variabilidad)",
                 fontsize=10.3, color=NAVY, loc="left")
    fig.tight_layout()
    guardar(fig, out, "fig_error_por_partida.png")


def fig_importancia(X, y, rf, out):
    from sklearn.inspection import permutation_importance
    rf.fit(X, y)
    imp = permutation_importance(rf, X, y, n_repeats=5, random_state=SEMILLA)
    orden = np.argsort(imp.importances_mean)[::-1][:8][::-1]
    nombres_legibles = {
        "act_rolling3": "Rendimiento reciente\nde la actividad (3 días)",
        "act_lag1": "Último valor\nde la actividad",
        "act_media_hist": "Media histórica\nde la actividad",
        "log_metrado": "Metrado (log)",
        "metrado": "Metrado del día",
        "dias_desde_inicio": "Días desde inicio",
        "semana": "Semana del proyecto",
        "sub_media_hist": "Media histórica\nde la subpartida",
        "dia_semana": "Día de la semana",
        "act_n_hist": "Veces vista antes",
        "actividad_cod": "Identidad de actividad",
    }
    cols = X.columns[orden]
    vals = imp.importances_mean[orden]
    etiquetas = [nombres_legibles.get(c, c) for c in cols]
    fig, ax = plt.subplots(figsize=(8.2, 4.8))
    yv = np.arange(len(cols))
    ax.barh(yv, vals, color=NAVY, edgecolor="white")
    ax.set_yticks(yv); ax.set_yticklabels(etiquetas, fontsize=8.4)
    ax.set_xlabel("Importancia por permutación (caída de desempeño al anular la variable)")
    ax.set_title("Qué señales gobiernan la predicción de horas-hombre\n"
                 "Domina la dinámica reciente de cada actividad, no el calendario",
                 fontsize=10.3, color=NAVY, loc="left")
    fig.tight_layout()
    guardar(fig, out, "fig_importancia_variables.png")


def fig_r2_por_corte(r2_fold, out):
    fig, ax = plt.subplots(figsize=(8.2, 4.4))
    x = np.arange(1, 6)
    ax.plot(x, r2_fold["bosque"], "-o", color=NAVY, lw=1.8, label="Random Forest", ms=6)
    ax.plot(x, r2_fold["baseline_act_hist"], "--s", color=GOLD, lw=1.6,
            label="Media histórica (campeón)", ms=5)
    ax.axhline(0, color=RED, lw=1.0, ls=":")
    ax.text(1.05, 0.02, "R² = 0: no mejor que la media del tramo", color=RED, fontsize=8)
    ax.set_xticks(x); ax.set_xlabel("Corte temporal (cronológico →)")
    ax.set_ylabel("R² del corte"); ax.legend(frameon=False, fontsize=9)
    ax.set_title("Desempeño por corte temporal — la honestidad del método\n"
                 "El último tramo (más reciente y difícil) cae por debajo de cero: se reporta tal cual",
                 fontsize=10.3, color=NAVY, loc="left")
    fig.tight_layout()
    guardar(fig, out, "fig_r2_por_corte.png")


def fig_significancia(df, acc, idx_oot, out, n_boot=2000):
    """Intervalos de confianza bootstrap (remuestreo por DÍA) del MAE de cada
    enfoque. Visualiza el hallazgo de los jueces: los intervalos se solapan,
    la ventaja no es estadísticamente concluyente con los datos actuales."""
    fechas = pd.to_datetime(df["fecha"].iloc[idx_oot].to_numpy())
    dias = pd.Series(fechas).dt.strftime("%Y-%m-%d").to_numpy()
    err = {
        "Media histórica\npor actividad": np.abs(np.array(acc["baseline_act_hist"][0]) - np.array(acc["baseline_act_hist"][1])),
        "Random Forest": np.abs(np.array(acc["bosque"][0]) - np.array(acc["bosque"][1])),
    }
    dias_unicos = np.unique(dias)
    idx_por_dia = {d: np.where(dias == d)[0] for d in dias_unicos}
    rng = np.random.default_rng(SEMILLA)
    resultados = {}
    for nombre, e in err.items():
        muestras = []
        for _ in range(n_boot):
            elegidos = rng.choice(dias_unicos, size=len(dias_unicos), replace=True)
            filas = np.concatenate([idx_por_dia[d] for d in elegidos])
            muestras.append(e[filas].mean())
        muestras = np.array(muestras)
        resultados[nombre] = (e.mean(), np.percentile(muestras, 2.5), np.percentile(muestras, 97.5))
    # diferencia pareada por día
    ea, eb = err["Media histórica\npor actividad"], err["Random Forest"]
    difs = []
    for _ in range(n_boot):
        elegidos = rng.choice(dias_unicos, size=len(dias_unicos), replace=True)
        filas = np.concatenate([idx_por_dia[d] for d in elegidos])
        difs.append(ea[filas].mean() - eb[filas].mean())
    difs = np.array(difs)
    lo, hi = np.percentile(difs, 2.5), np.percentile(difs, 97.5)

    fig, ax = plt.subplots(figsize=(8.4, 4.7))
    nombres = list(resultados.keys())
    y = np.arange(len(nombres))[::-1]
    colores = {"Media histórica\npor actividad": NAVY, "Random Forest": GOLD}
    for yi, nom in zip(y, nombres):
        m, l, h = resultados[nom]
        ax.errorbar(m, yi, xerr=[[m - l], [h - m]], fmt="o", color=colores[nom],
                    ms=9, capsize=6, lw=2.2, mec="white")
        ax.text(h + 0.12, yi, f"{m:.2f} HH  [{l:.2f}, {h:.2f}]", va="center", fontsize=9, color="#33393F")
    ax.set_yticks(y); ax.set_yticklabels(nombres, fontsize=9.5)
    ax.set_ylim(-0.6, len(nombres) - 0.4)
    ax.set_xlabel("MAE con intervalo de confianza al 95 % (bootstrap por día)")
    signo = "incluye 0" if lo <= 0 <= hi else "no incluye 0"
    ax.set_title("¿Es real la ventaja del Random Forest? Prueba de significancia honesta\n"
                 f"Los intervalos se solapan; la diferencia media es {ea.mean()-eb.mean():+.2f} HH, "
                 f"IC 95 % [{lo:+.2f}, {hi:+.2f}] ({signo}): no concluyente",
                 fontsize=10.0, color=NAVY, loc="left")
    fig.tight_layout()
    guardar(fig, out, "fig_significancia_bootstrap.png")
    return resultados, (ea.mean() - eb.mean(), lo, hi)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    df = cargar(args.csv)
    print(f"Dataset: {len(df)} registros | {df['fecha'].min().date()} -> {df['fecha'].max().date()}")
    print(f"Figuras -> {args.out}\n")

    fig_cobertura_actividades(df, args.out)
    fig_completitud(df, args.out)
    X, y, acc, r2_fold, idx_oot, rf = correr_experimento(df)
    fig_comparacion_modelos(acc, args.out)
    fig_error_por_partida(df, acc["bosque"][0], acc["bosque"][1], idx_oot, args.out)
    fig_importancia(X, y, rf, args.out)
    fig_r2_por_corte(r2_fold, args.out)
    _, dif_ic = fig_significancia(df, acc, idx_oot, args.out)

    print("\n=== Números clave para el texto (ex-ante, 975 predicciones out-of-time) ===")
    for k, nom in [("baseline_media", "Media global"),
                   ("baseline_act_hist", "Media histórica por actividad (campeón)"),
                   ("bosque", "Random Forest")]:
        mae, rmse, r2, mape = evaluar(*acc[k])
        print(f"  {nom:42} MAE {mae:6.2f} | R2 {r2:6.3f} | MAPE {mape:5.1f}%")
    print(f"  R2 por corte (RF): {[round(v,3) for v in r2_fold['bosque']]}")
    print(f"  Diferencia baseline-RF: {dif_ic[0]:+.2f} HH, IC95% [{dif_ic[1]:+.2f}, {dif_ic[2]:+.2f}]")
    print("\nListo.")


if __name__ == "__main__":
    sys.exit(main())
