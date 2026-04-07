from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder


@dataclass(frozen=True)
class ProjectPaths:
    repo_root: Path
    data_dir: Path
    out_dir: Path
    eda_dir: Path
    reports_dir: Path


def get_project_paths(repo_root: Optional[Path] = None) -> ProjectPaths:
    """
    Resolve standard project paths.

    Assumptions:
    - This file lives under `<repo_root>/ml-pipelines/`.
    - Raw CSVs live under `<repo_root>/data/raw/`.
    - Outputs live under `<repo_root>/output/ml-predictions/`.
    """
    if repo_root is None:
        repo_root = Path(__file__).resolve().parents[1]
    # Raw CSVs are no longer part of the runtime contract; pipelines load from DB.
    # Keep `data_dir` for backwards-compatible printing/debugging only.
    data_dir = repo_root / "data" / "raw"
    out_dir = repo_root / "output" / "ml-predictions"
    eda_dir = out_dir / "eda-plots"
    reports_dir = out_dir / "run-reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    eda_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)
    return ProjectPaths(repo_root=repo_root, data_dir=data_dir, out_dir=out_dir, eda_dir=eda_dir, reports_dir=reports_dir)


def make_encoder() -> OneHotEncoder:
    # scikit-learn changed `sparse` -> `sparse_output`
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def as_bool(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series.fillna(False)
    return series.astype(str).str.lower().isin(["true", "1", "yes", "y"])


def numeric(series: pd.Series, fill_value: float = 0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(fill_value)


def fill_numeric_median(df: pd.DataFrame, cols: Iterable[str]) -> None:
    for col in cols:
        if col not in df.columns:
            continue
        vals = pd.to_numeric(df[col], errors="coerce")
        df[col] = vals.fillna(vals.median() if vals.notna().any() else 0.0)


def quick_eda(
    df: pd.DataFrame,
    name: str,
    *,
    target_col: Optional[str] = None,
    numeric_cols: Optional[list[str]] = None,
    categorical_cols: Optional[list[str]] = None,
    save_plots: bool = True,
    eda_dir: Optional[Path] = None,
) -> None:
    """
    Lightweight, consistent EDA used across pipelines.
    Avoids hard dependency on notebooks for correctness; plots are optional.
    """
    print(f"\nEDA: {name}")
    print("Shape:", df.shape)
    missing = df.isna().mean().sort_values(ascending=False).head(10)
    print("\nTop missing-value rates:")
    print(missing.to_string())

    if target_col and target_col in df.columns:
        print(f"\nTarget distribution / summary: {target_col}")
        if pd.api.types.is_numeric_dtype(df[target_col]):
            print(df[target_col].describe().to_string())
        else:
            print(df[target_col].value_counts(dropna=False).head(20).to_string())

        if save_plots:
            try:
                import matplotlib.pyplot as plt

                safe_name = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
                eda_dir = eda_dir or get_project_paths().eda_dir
                eda_dir.mkdir(parents=True, exist_ok=True)
                plt.figure(figsize=(7, 4))
                if pd.api.types.is_numeric_dtype(df[target_col]):
                    df[target_col].hist(bins=20)
                    plt.xlabel(target_col)
                    plt.ylabel("Count")
                else:
                    df[target_col].value_counts(dropna=False).head(10).plot(kind="bar")
                    plt.xlabel(target_col)
                    plt.ylabel("Count")
                plt.title(f"{name}: {target_col} distribution")
                plt.tight_layout()
                plot_path = eda_dir / f"{safe_name}_{target_col}_distribution.png"
                plt.savefig(plot_path, dpi=150, bbox_inches="tight")
                plt.close()
                print("Saved EDA plot:", plot_path)
            except Exception as ex:
                print("Plotting skipped:", ex)

    if numeric_cols:
        cols = [c for c in numeric_cols if c in df.columns]
        if cols:
            print("\nNumeric feature summary:")
            print(df[cols].describe().T[["mean", "std", "min", "50%", "max"]].round(3).to_string())

    if categorical_cols:
        cols = [c for c in categorical_cols if c in df.columns]
        for col in cols[:5]:
            print(f"\nTop values for {col}:")
            print(df[col].value_counts(dropna=False).head(10).to_string())


def time_split(df: pd.DataFrame, date_col: str, test_frac: float = 0.25) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = df.sort_values(date_col).copy()
    split_idx = max(1, int(len(df) * (1 - test_frac)))
    split_idx = min(split_idx, len(df) - 1)
    return df.iloc[:split_idx].copy(), df.iloc[split_idx:].copy()


def safe_classifier_split(X, y, test_size: float = 0.25):
    """
    Train/test split with best-effort stratification when classes are sufficient.
    """
    from sklearn.model_selection import train_test_split

    y = pd.Series(y)
    stratify = y if y.nunique() > 1 and y.value_counts().min() >= 2 else None
    return train_test_split(X, y, test_size=test_size, random_state=42, stratify=stratify)


def prep(cat_cols: list[str], num_cols: list[str]) -> ColumnTransformer:
    return ColumnTransformer([("cat", make_encoder(), cat_cols), ("num", "passthrough", num_cols)])


def score_bands(scores: pd.Series) -> pd.Series:
    scores = pd.Series(scores).astype(float)
    if len(scores) == 0 or scores.nunique(dropna=True) < 2:
        return pd.Series(["Medium"] * len(scores), index=scores.index)
    labels = ["Low", "Medium", "High", "Very High"]
    q = min(4, scores.nunique(dropna=True), len(scores))
    try:
        return pd.qcut(scores.rank(method="first"), q=q, labels=labels[:q], duplicates="drop").astype(str)
    except Exception:
        return pd.Series(["Medium"] * len(scores), index=scores.index)


def export_predictions_json(
    prediction_type: str,
    entity_type: str,
    df_out: pd.DataFrame,
    id_col: str,
    score_col: str,
    label_col: Optional[str] = None,
    out_dir: Optional[Path] = None,
) -> Path:
    out_dir = out_dir or get_project_paths().out_dir
    out_path = out_dir / f"{prediction_type}.json"

    excluded = {id_col, score_col}
    if label_col:
        excluded.add(label_col)

    rows = []
    for _, row in df_out.iterrows():
        payload = {k: v for k, v in row.items() if k not in excluded}
        rows.append(
            {
                "predictionType": prediction_type,
                "entityType": entity_type,
                "entityId": int(row[id_col]),
                "score": float(row[score_col]),
                "label": None if label_col is None or pd.isna(row[label_col]) else str(row[label_col]),
                "payloadJson": json.dumps(payload, default=str),
            }
        )
    out_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} predictions:", out_path)
    return out_path


def dataset_profile(
    df: pd.DataFrame,
    *,
    id_cols: Optional[list[str]] = None,
    categorical_cols: Optional[list[str]] = None,
    numeric_cols: Optional[list[str]] = None,
    top_cat_n: int = 20,
) -> dict:
    """
    Lightweight dataset profile for drift/schema checks.
    Intended to be cheap and safe to run on every pipeline execution.
    """
    id_cols = id_cols or []
    categorical_cols = [c for c in (categorical_cols or []) if c in df.columns and c not in id_cols]
    numeric_cols = [c for c in (numeric_cols or []) if c in df.columns and c not in id_cols]

    out: dict = {
        "n_rows": int(len(df)),
        "n_cols": int(df.shape[1]),
        "missing_rate_top": df.isna().mean().sort_values(ascending=False).head(20).to_dict(),
        "categorical": {},
        "numeric": {},
    }

    for c in categorical_cols:
        vc = df[c].astype("object").fillna("<<MISSING>>").value_counts(dropna=False).head(int(top_cat_n))
        out["categorical"][c] = {"top_values": vc.to_dict(), "n_unique": int(df[c].nunique(dropna=True))}

    for c in numeric_cols:
        s = pd.to_numeric(df[c], errors="coerce")
        desc = s.describe(percentiles=[0.1, 0.5, 0.9])
        out["numeric"][c] = {k: (None if pd.isna(v) else float(v)) for k, v in desc.to_dict().items()}

    return out


def compare_profiles(current: dict, previous: Optional[dict]) -> dict:
    """
    Compare two profiles and return a small drift summary.
    This is heuristic (not a formal statistical test) but catches common issues.
    """
    if not previous:
        return {"status": "no_previous_profile", "notes": "No prior profile available for drift comparison."}

    drift: dict = {"status": "ok", "row_count_change": None, "new_top_categories": {}, "missing_rate_increases": {}}
    drift["row_count_change"] = int(current.get("n_rows", 0) - previous.get("n_rows", 0))

    # Missingness increases
    cur_miss = current.get("missing_rate_top", {}) or {}
    prev_miss = previous.get("missing_rate_top", {}) or {}
    for col, cur in cur_miss.items():
        prev = float(prev_miss.get(col, 0.0))
        if float(cur) - prev >= 0.05:
            drift["missing_rate_increases"][col] = {"previous": prev, "current": float(cur)}

    # New top categories
    cur_cat = current.get("categorical", {}) or {}
    prev_cat = previous.get("categorical", {}) or {}
    for col, cur_info in cur_cat.items():
        prev_info = prev_cat.get(col, {}) or {}
        cur_vals = set((cur_info.get("top_values") or {}).keys())
        prev_vals = set((prev_info.get("top_values") or {}).keys())
        new_vals = sorted(list(cur_vals - prev_vals))[:25]
        if new_vals:
            drift["new_top_categories"][col] = new_vals

    if drift["missing_rate_increases"] or drift["new_top_categories"]:
        drift["status"] = "warning"
    return drift

# After POST /api/admin/lighthouse-import, train from Azure SQL by setting INTEX_ODBC to your ODBC connection string.
SQL_TABLE_BY_STEM: dict[str, str] = {
    "supporters": "Supporters",
    "donations": "Contributions",
    "social_media_posts": "SocialMediaPosts",
    "safehouse_monthly_metrics": "SafehouseMonthlyMetrics",
    "residents": "Residents",
    "incident_reports": "IncidentReports",
    "home_visitations": "HomeVisitations",
    "process_recordings": "ProcessRecordings",
    "education_records": "EducationRecords",
    "health_wellbeing_records": "HealthWellbeingRecords",
}


def load_df(stem: str, data_dir: Optional[Path] = None) -> pd.DataFrame:
    """
    Load a dataset by stem name from the seeded database.

    This project no longer treats local CSVs as a runtime dependency. If the DB
    connection is not configured, we fail fast with a clear error.
    """
    odbc = os.environ.get("INTEX_ODBC")
    table = SQL_TABLE_BY_STEM.get(stem)
    if not table:
        raise KeyError(f"Unknown dataset stem {stem!r}. Add it to SQL_TABLE_BY_STEM in data_prep.py.")
    if not odbc:
        raise RuntimeError(
            "Database connection not configured. Set INTEX_ODBC (ODBC connection string) "
            "so pipelines can load from the seeded database."
        )

    try:
        import pyodbc

        with pyodbc.connect(odbc, timeout=120) as cnx:
            df = pd.read_sql(f"SELECT * FROM [{table}]", cnx)
        print(f"DB [{table}] rows:", len(df))

        def pascal_to_snake(name: str) -> str:
            return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()

        df = df.rename(columns={c: pascal_to_snake(str(c)) for c in df.columns})
        if stem == "donations":
            df = df.rename(columns={"contribution_id": "donation_id"})
        if stem == "process_recordings":
            df = df.rename(columns={"process_recording_id": "recording_id"})
        if stem == "home_visitations":
            df = df.rename(columns={"home_visitation_id": "visitation_id"})
        return df
    except Exception as ex:
        raise RuntimeError(f"INTEX_ODBC load failed for table [{table}].") from ex

