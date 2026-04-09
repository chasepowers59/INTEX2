from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Optional

import numpy as np
import pandas as pd

from sklearn.base import BaseEstimator
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    mean_absolute_error,
    mean_squared_error,
    precision_recall_fscore_support,
    r2_score,
    roc_auc_score,
    top_k_accuracy_score,
)


def top_features(pipe, n: int = 10) -> pd.DataFrame:
    """
    Extract top feature weights from a scikit-learn Pipeline with a `pre` step
    that supports `get_feature_names_out()` and a model with either
    `feature_importances_` or `coef_`.
    """
    if not hasattr(pipe, "named_steps") or "pre" not in pipe.named_steps:
        return pd.DataFrame()
    model = pipe.named_steps.get("model") or pipe.named_steps.get("m")
    if model is None:
        return pd.DataFrame()
    try:
        names = pipe.named_steps["pre"].get_feature_names_out()
    except Exception:
        return pd.DataFrame()

    if hasattr(model, "feature_importances_"):
        weights = np.asarray(model.feature_importances_)
    elif hasattr(model, "coef_"):
        coef = np.asarray(model.coef_)
        weights = np.abs(coef).mean(axis=0) if coef.ndim > 1 else np.abs(coef)
    else:
        return pd.DataFrame()
    return (
        pd.DataFrame({"feature": names, "importance": weights})
        .sort_values("importance", ascending=False)
        .head(int(n))
        .reset_index(drop=True)
    )


def rmse(y_true, y_pred) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def eval_classification(y_true, y_pred, y_proba: Optional[np.ndarray] = None) -> dict[str, float]:
    acc = accuracy_score(y_true, y_pred)
    pr, rc, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    out: dict[str, float] = {"accuracy": float(acc), "precision": float(pr), "recall": float(rc), "f1": float(f1)}
    if y_proba is not None and pd.Series(y_true).nunique() > 1:
        try:
            out["roc_auc"] = float(roc_auc_score(y_true, y_proba))
        except Exception:
            pass
        try:
            out["pr_auc"] = float(average_precision_score(y_true, y_proba))
        except Exception:
            pass
    return out


def eval_regression(y_true, y_pred) -> dict[str, float]:
    return {"mae": float(mean_absolute_error(y_true, y_pred)), "rmse": rmse(y_true, y_pred), "r2": float(r2_score(y_true, y_pred))}


def recall_at_top_fraction(y_true, y_score, top_fraction: float = 0.10) -> float:
    """
    Operational metric for triage: if staff can review only the top X%,
    how many true positives are captured?
    """
    # Reset index to avoid misalignment between y_true and y_score indices
    # (common when y_true is a sliced Series retaining original df index).
    y_true = pd.Series(y_true).astype(int).reset_index(drop=True)
    y_score = pd.Series(y_score).astype(float).reset_index(drop=True)
    if len(y_true) == 0:
        return float("nan")
    positives = int((y_true == 1).sum())
    if positives == 0:
        return 0.0
    k = max(1, int(np.ceil(len(y_true) * float(top_fraction))))
    # Use positional indexing to avoid any pandas index alignment surprises.
    order = np.argsort(-y_score.to_numpy())
    top_pos = order[:k]
    captured = int(y_true.to_numpy()[top_pos].sum())
    return float(captured / positives)


def within_tolerance_rate(y_true, y_pred, tolerance: float, relative: bool = False) -> float:
    """
    Business-friendly regression metric.
    - absolute tolerance: |err| <= tolerance
    - relative tolerance: |err| <= tolerance * max(|y_true|, eps)
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    err = np.abs(y_true - y_pred)
    if relative:
        denom = np.maximum(np.abs(y_true), 1e-9)
        ok = err <= (tolerance * denom)
    else:
        ok = err <= tolerance
    return float(np.mean(ok)) if len(ok) else float("nan")


@dataclass
class CandidateResult:
    name: str
    metrics: dict[str, float]
    fit_seconds: float
    predict_seconds: float
    model_bytes: Optional[int]
    estimator: Any


def _pickle_size_bytes(obj: Any) -> Optional[int]:
    try:
        import pickle

        return len(pickle.dumps(obj))
    except Exception:
        return None


def evaluate_candidate(
    name: str,
    estimator: Any,
    X_train,
    y_train,
    X_test,
    y_test,
    task: str,
    *,
    top_fraction: float = 0.10,
    topk: int = 2,
) -> CandidateResult:
    t0 = time.perf_counter()
    estimator.fit(X_train, y_train)
    fit_s = float(time.perf_counter() - t0)

    t1 = time.perf_counter()
    if task == "binary":
        proba = estimator.predict_proba(X_test)[:, 1] if hasattr(estimator, "predict_proba") else None
        pred = (proba >= 0.5).astype(int) if proba is not None else estimator.predict(X_test)
        metrics = eval_classification(y_test, pred, proba)
        if proba is not None:
            metrics["recall_at_top10pct"] = recall_at_top_fraction(y_test, proba, top_fraction=top_fraction)
    elif task == "multiclass":
        pred = estimator.predict(X_test)
        metrics = {"accuracy": float(accuracy_score(y_test, pred))}
        if hasattr(estimator, "predict_proba"):
            proba = estimator.predict_proba(X_test)
            classes = getattr(estimator, "classes_", None)
            metrics[f"top{topk}_accuracy"] = float(top_k_accuracy_score(y_test, proba, k=topk, labels=classes))
    elif task == "regression":
        pred = estimator.predict(X_test)
        metrics = eval_regression(y_test, pred)
    else:
        raise ValueError(f"Unknown task: {task}")
    pred_s = float(time.perf_counter() - t1)

    return CandidateResult(
        name=name,
        metrics=metrics,
        fit_seconds=fit_s,
        predict_seconds=pred_s,
        model_bytes=_pickle_size_bytes(estimator),
        estimator=estimator,
    )


def evaluate_candidate_regression_transformed(
    name: str,
    estimator: Any,
    X_train,
    y_train,
    X_test,
    y_test,
    *,
    transform_y: Callable[[Any], Any],
    inverse_y: Callable[[Any], Any],
    clip_nonnegative: bool = False,
) -> CandidateResult:
    """
    Regression evaluation helper when the model trains on a transformed target
    (e.g., log1p), but metrics should be computed on the original scale.
    """
    t0 = time.perf_counter()
    estimator.fit(X_train, transform_y(y_train))
    fit_s = float(time.perf_counter() - t0)

    t1 = time.perf_counter()
    pred_t = estimator.predict(X_test)
    pred = inverse_y(pred_t)
    if clip_nonnegative:
        pred = np.maximum(0, pred)
    metrics = eval_regression(y_test, pred)
    pred_s = float(time.perf_counter() - t1)

    return CandidateResult(
        name=name,
        metrics=metrics,
        fit_seconds=fit_s,
        predict_seconds=pred_s,
        model_bytes=_pickle_size_bytes(estimator),
        estimator=estimator,
    )


def select_simplest_within_delta(
    results: list[CandidateResult],
    primary_metric: str,
    delta: float,
    *,
    higher_is_better: bool = True,
) -> CandidateResult:
    scored = [r for r in results if primary_metric in r.metrics and not np.isnan(r.metrics[primary_metric])]
    if not scored:
        raise ValueError(f"No candidates produced primary metric {primary_metric}")

    best_val = max(r.metrics[primary_metric] for r in scored) if higher_is_better else min(r.metrics[primary_metric] for r in scored)
    if higher_is_better:
        acceptable = [r for r in scored if r.metrics[primary_metric] >= (best_val - delta)]
        acceptable.sort(key=lambda r: (r.fit_seconds + r.predict_seconds))
    else:
        acceptable = [r for r in scored if r.metrics[primary_metric] <= (best_val + delta)]
        acceptable.sort(key=lambda r: (r.fit_seconds + r.predict_seconds))
    return acceptable[0]


def results_table(results: list[CandidateResult]) -> pd.DataFrame:
    rows = []
    for r in results:
        row = {
            "model": r.name,
            "fit_s": r.fit_seconds,
            "predict_s": r.predict_seconds,
            "model_kb": (r.model_bytes / 1024.0) if r.model_bytes is not None else np.nan,
            **r.metrics,
        }
        rows.append(row)
    return pd.DataFrame(rows)


def write_run_report_json(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return path


def bootstrap_prediction_intervals(
    y_true,
    y_pred,
    *,
    quantiles: tuple[float, float] = (0.10, 0.90),
    n_boot: int = 300,
    random_state: int = 42,
) -> dict[str, float]:
    """
    Very lightweight uncertainty estimate:
    - Bootstraps residuals on a holdout set
    - Returns additive residual quantiles, which can be turned into prediction intervals:
        lower = y_pred + q_low
        upper = y_pred + q_high

    This is not a full probabilistic model, but it is cheap and useful for planning.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return {"resid_q_low": float("nan"), "resid_q_high": float("nan")}
    resid = y_true - y_pred
    rng = np.random.default_rng(random_state)
    qs = []
    for _ in range(int(n_boot)):
        sample = rng.choice(resid, size=len(resid), replace=True)
        qs.append(np.quantile(sample, quantiles))
    qs = np.asarray(qs)
    return {"resid_q_low": float(np.median(qs[:, 0])), "resid_q_high": float(np.median(qs[:, 1]))}


@dataclass
class TuneResult:
    name: str
    best_estimator: Any
    best_params: dict[str, Any]
    best_cv_score: float
    cv_metric: str
    search_type: str


def _default_cv_for_task(task: str, y) -> Any:
    from sklearn.model_selection import KFold, StratifiedKFold

    y = pd.Series(y)
    if task in ("binary", "multiclass") and y.nunique() > 1 and y.value_counts().min() >= 2:
        return StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    return KFold(n_splits=3, shuffle=True, random_state=42)


@dataclass
class CVResult:
    name: str
    metrics_mean: dict[str, float]
    metrics_std: dict[str, float]
    fit_seconds_mean: float
    predict_seconds_mean: float
    estimator: Any


def cv_evaluate_candidate(
    name: str,
    estimator: Any,
    X,
    y,
    *,
    task: str,
    cv: Any = None,
    top_fraction: float = 0.10,
    topk: int = 2,
) -> CVResult:
    """
    Cross-validated evaluation without touching the final holdout set.
    """
    if cv is None:
        cv = _default_cv_for_task(task, y)

    X_df = X
    y_s = pd.Series(y).reset_index(drop=True)

    metrics_rows: list[dict[str, float]] = []
    fit_times: list[float] = []
    pred_times: list[float] = []

    for train_idx, test_idx in cv.split(X_df, y_s):
        X_tr = X_df.iloc[train_idx] if hasattr(X_df, "iloc") else X_df[train_idx]
        X_te = X_df.iloc[test_idx] if hasattr(X_df, "iloc") else X_df[test_idx]
        y_tr = y_s.iloc[train_idx]
        y_te = y_s.iloc[test_idx]

        # clone to avoid state leakage across folds
        from sklearn.base import clone

        est = clone(estimator)
        t0 = time.perf_counter()
        est.fit(X_tr, y_tr)
        fit_times.append(float(time.perf_counter() - t0))

        t1 = time.perf_counter()
        if task == "binary":
            proba = est.predict_proba(X_te)[:, 1] if hasattr(est, "predict_proba") else None
            pred = (proba >= 0.5).astype(int) if proba is not None else est.predict(X_te)
            m = eval_classification(y_te, pred, proba)
            if proba is not None:
                m["recall_at_top10pct"] = recall_at_top_fraction(y_te, proba, top_fraction=top_fraction)
        elif task == "multiclass":
            pred = est.predict(X_te)
            m = {"accuracy": float(accuracy_score(y_te, pred))}
            if hasattr(est, "predict_proba"):
                proba = est.predict_proba(X_te)
                classes = getattr(est, "classes_", None)
                m[f"top{topk}_accuracy"] = float(top_k_accuracy_score(y_te, proba, k=topk, labels=classes))
        elif task == "regression":
            pred = est.predict(X_te)
            m = eval_regression(y_te, pred)
        else:
            raise ValueError(f"Unknown task: {task}")
        pred_times.append(float(time.perf_counter() - t1))
        metrics_rows.append({k: float(v) for k, v in m.items() if v is not None and not np.isnan(v)})

    dfm = pd.DataFrame(metrics_rows)
    mean = dfm.mean(numeric_only=True).to_dict()
    std = dfm.std(numeric_only=True).to_dict()
    return CVResult(
        name=name,
        metrics_mean={k: float(v) for k, v in mean.items()},
        metrics_std={k: float(v) for k, v in std.items()},
        fit_seconds_mean=float(np.mean(fit_times)) if fit_times else float("nan"),
        predict_seconds_mean=float(np.mean(pred_times)) if pred_times else float("nan"),
        estimator=estimator,
    )


def cv_evaluate_candidate_regression_transformed(
    name: str,
    estimator: Any,
    X,
    y,
    *,
    transform_y: Callable[[Any], Any],
    inverse_y: Callable[[Any], Any],
    clip_nonnegative: bool = False,
    cv: Any = None,
) -> CVResult:
    """
    CV evaluation for regression pipelines trained on transformed y (e.g., log1p),
    but scored on original scale.
    """
    if cv is None:
        cv = _default_cv_for_task("regression", y)

    X_df = X
    y_s = pd.Series(y).reset_index(drop=True)

    metrics_rows: list[dict[str, float]] = []
    fit_times: list[float] = []
    pred_times: list[float] = []

    from sklearn.base import clone

    for train_idx, test_idx in cv.split(X_df, y_s):
        X_tr = X_df.iloc[train_idx] if hasattr(X_df, "iloc") else X_df[train_idx]
        X_te = X_df.iloc[test_idx] if hasattr(X_df, "iloc") else X_df[test_idx]
        y_tr = y_s.iloc[train_idx]
        y_te = y_s.iloc[test_idx]

        est = clone(estimator)
        t0 = time.perf_counter()
        est.fit(X_tr, transform_y(y_tr))
        fit_times.append(float(time.perf_counter() - t0))

        t1 = time.perf_counter()
        pred_t = est.predict(X_te)
        pred = inverse_y(pred_t)
        if clip_nonnegative:
            pred = np.maximum(0, pred)
        m = eval_regression(y_te, pred)
        pred_times.append(float(time.perf_counter() - t1))
        metrics_rows.append({k: float(v) for k, v in m.items() if v is not None and not np.isnan(v)})

    dfm = pd.DataFrame(metrics_rows)
    mean = dfm.mean(numeric_only=True).to_dict()
    std = dfm.std(numeric_only=True).to_dict()
    return CVResult(
        name=name,
        metrics_mean={k: float(v) for k, v in mean.items()},
        metrics_std={k: float(v) for k, v in std.items()},
        fit_seconds_mean=float(np.mean(fit_times)) if fit_times else float("nan"),
        predict_seconds_mean=float(np.mean(pred_times)) if pred_times else float("nan"),
        estimator=estimator,
    )


def ablate_feature_groups_one_by_one_cv_regression_transformed(
    *,
    base_name: str,
    estimator: Any,
    X: pd.DataFrame,
    y,
    transform_y: Callable[[Any], Any],
    inverse_y: Callable[[Any], Any],
    clip_nonnegative: bool,
    feature_groups: list[list[str]],
    primary_metric: str,
    higher_is_better: bool,
    cv: Any = None,
) -> pd.DataFrame:
    base = cv_evaluate_candidate_regression_transformed(
        base_name,
        estimator,
        X,
        y,
        transform_y=transform_y,
        inverse_y=inverse_y,
        clip_nonnegative=clip_nonnegative,
        cv=cv,
    )
    base_val = float(base.metrics_mean.get(primary_metric, float("nan")))
    rows = []
    for group in feature_groups:
        cols_to_drop = [c for c in group if c in X.columns]
        X_drop = X.drop(columns=cols_to_drop) if cols_to_drop else X
        res = cv_evaluate_candidate_regression_transformed(
            f"drop:{'|'.join(group)}",
            estimator,
            X_drop,
            y,
            transform_y=transform_y,
            inverse_y=inverse_y,
            clip_nonnegative=clip_nonnegative,
            cv=cv,
        )
        val = float(res.metrics_mean.get(primary_metric, float("nan")))
        delta = (val - base_val) if higher_is_better else (base_val - val)
        rows.append(
            {
                "dropped_group": "|".join(group),
                "n_cols_dropped": int(len(cols_to_drop)),
                f"{primary_metric}_base": base_val,
                f"{primary_metric}_after": val,
                "delta_helpful": float(delta),
                "fit_s_mean_after": res.fit_seconds_mean,
                "predict_s_mean_after": res.predict_seconds_mean,
            }
        )
    return pd.DataFrame(rows).sort_values("delta_helpful", ascending=False)


def cv_results_table(results: list[CVResult]) -> pd.DataFrame:
    rows = []
    for r in results:
        row = {
            "model": r.name,
            "fit_s_mean": r.fit_seconds_mean,
            "predict_s_mean": r.predict_seconds_mean,
            **{f"{k}_mean": v for k, v in (r.metrics_mean or {}).items()},
            **{f"{k}_std": v for k, v in (r.metrics_std or {}).items()},
        }
        rows.append(row)
    return pd.DataFrame(rows)


def select_simplest_within_delta_cv(
    results: list[CVResult],
    primary_metric: str,
    delta: float,
    *,
    higher_is_better: bool = True,
) -> CVResult:
    scored = [r for r in results if primary_metric in (r.metrics_mean or {}) and not np.isnan(r.metrics_mean[primary_metric])]
    if not scored:
        raise ValueError(f"No candidates produced primary metric {primary_metric}")
    best_val = max(r.metrics_mean[primary_metric] for r in scored) if higher_is_better else min(r.metrics_mean[primary_metric] for r in scored)
    if higher_is_better:
        acceptable = [r for r in scored if r.metrics_mean[primary_metric] >= (best_val - delta)]
    else:
        acceptable = [r for r in scored if r.metrics_mean[primary_metric] <= (best_val + delta)]
    acceptable.sort(key=lambda r: (r.fit_seconds_mean + r.predict_seconds_mean))
    return acceptable[0]


def write_ablation_report_json(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return path


def _prune_pipeline_preprocessor_columns(estimator: Any, *, allowed_columns: list[str]) -> Any:
    """
    When doing raw-column ablations, the input X may be missing columns that the
    estimator's ColumnTransformer was originally configured to expect.

    If `estimator` is a sklearn Pipeline with a `pre` ColumnTransformer step,
    rebuild that ColumnTransformer so each transformer only references columns
    that are present in `allowed_columns` (dropping transformers that would get
    zero columns).

    If we can't safely introspect/rebuild, return the estimator unchanged.
    """
    try:
        from sklearn.pipeline import Pipeline
        from sklearn.compose import ColumnTransformer
        from sklearn.base import clone
    except Exception:
        return estimator

    try:
        est = clone(estimator)
    except Exception:
        est = estimator

    if not isinstance(est, Pipeline) or not hasattr(est, "named_steps") or "pre" not in est.named_steps:
        return est

    pre = est.named_steps.get("pre")
    if not isinstance(pre, ColumnTransformer):
        return est

    allowed = set(map(str, allowed_columns))
    new_transformers = []
    for name, transformer, cols in list(pre.transformers):
        # drop stays as-is
        if transformer == "drop":
            new_transformers.append((name, transformer, cols))
            continue

        if isinstance(cols, (list, tuple, np.ndarray, pd.Index)):
            cols_list = [str(c) for c in list(cols)]
            kept = [c for c in cols_list if c in allowed]
            if len(kept) == 0:
                new_transformers.append((name, "drop", cols_list))
            else:
                new_transformers.append((name, transformer, kept))
        else:
            # callable selectors / slices etc — leave unchanged
            new_transformers.append((name, transformer, cols))

    try:
        rebuilt = ColumnTransformer(
            transformers=new_transformers,
            remainder=pre.remainder,
            sparse_threshold=getattr(pre, "sparse_threshold", 0.3),
            transformer_weights=getattr(pre, "transformer_weights", None),
            verbose_feature_names_out=getattr(pre, "verbose_feature_names_out", True),
        )
        est.set_params(pre=rebuilt)
        return est
    except Exception:
        return est


def ablate_feature_groups_one_by_one_cv(
    *,
    base_name: str,
    estimator: Any,
    X: pd.DataFrame,
    y,
    task: str,
    feature_groups: list[list[str]],
    primary_metric: str,
    higher_is_better: bool,
    cv: Any = None,
    top_fraction: float = 0.10,
    topk: int = 2,
) -> pd.DataFrame:
    """
    One-at-a-time ablation report (CV-scored) without modifying the chosen model yet.
    Each group is a list of raw columns to drop together (categorical grouping).
    """
    base_est = _prune_pipeline_preprocessor_columns(estimator, allowed_columns=list(X.columns))
    base = cv_evaluate_candidate(base_name, base_est, X, y, task=task, cv=cv, top_fraction=top_fraction, topk=topk)
    base_val = float(base.metrics_mean.get(primary_metric, float("nan")))

    rows = []
    for group in feature_groups:
        cols_to_drop = [c for c in group if c in X.columns]
        X_drop = X.drop(columns=cols_to_drop) if cols_to_drop else X
        est_drop = _prune_pipeline_preprocessor_columns(estimator, allowed_columns=list(X_drop.columns))
        res = cv_evaluate_candidate(
            f"drop:{'|'.join(group)}", est_drop, X_drop, y, task=task, cv=cv, top_fraction=top_fraction, topk=topk
        )
        val = float(res.metrics_mean.get(primary_metric, float("nan")))
        delta = (val - base_val) if higher_is_better else (base_val - val)
        rows.append(
            {
                "dropped_group": "|".join(group),
                "n_cols_dropped": int(len(cols_to_drop)),
                f"{primary_metric}_base": base_val,
                f"{primary_metric}_after": val,
                "delta_helpful": float(delta),
                "fit_s_mean_after": res.fit_seconds_mean,
                "predict_s_mean_after": res.predict_seconds_mean,
            }
        )
    return pd.DataFrame(rows).sort_values("delta_helpful", ascending=False)


def read_json_if_exists(path: Path) -> Optional[dict[str, Any]]:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return None


def should_export_by_guardrail(
    *,
    previous_report: Optional[dict[str, Any]],
    current_holdout: dict[str, Any],
    primary_metric: str,
    min_delta_allowed: float,
    higher_is_better: bool = True,
) -> tuple[bool, dict[str, Any]]:
    """
    Very lightweight export guardrail:
    - If no previous report, export.
    - Otherwise, compare current holdout primary metric to previous holdout metric and block export
      if it regresses beyond min_delta_allowed.
    """
    decision = {"status": "allow", "reason": "no_previous_report"}
    if not previous_report:
        return True, decision
    prev_holdout = previous_report.get("holdout") or {}
    if primary_metric not in prev_holdout or primary_metric not in current_holdout:
        decision = {"status": "allow", "reason": "missing_metric_in_previous_or_current"}
        return True, decision
    prev_val = float(prev_holdout.get(primary_metric))
    cur_val = float(current_holdout.get(primary_metric))
    if higher_is_better:
        regressed = (prev_val - cur_val) > float(min_delta_allowed)
        delta = cur_val - prev_val
    else:
        regressed = (cur_val - prev_val) > float(min_delta_allowed)
        delta = prev_val - cur_val
    if regressed:
        return False, {"status": "block", "reason": "metric_regression", "previous": prev_val, "current": cur_val, "delta": delta}
    return True, {"status": "allow", "reason": "within_tolerance", "previous": prev_val, "current": cur_val, "delta": delta}

def tune_model_randomized(
    name: str,
    estimator: Any,
    X,
    y,
    *,
    param_distributions: dict[str, Any],
    task: str,
    cv_metric: str,
    n_iter: int = 20,
    cv: Any = None,
    random_state: int = 42,
    n_jobs: int = 1,
) -> TuneResult:
    """
    Lightweight, compute-conscious tuning wrapper.
    Returns the best estimator found by RandomizedSearchCV.
    """
    if cv is None:
        cv = _default_cv_for_task(task, y)

    search = RandomizedSearchCV(
        estimator,
        param_distributions=param_distributions,
        n_iter=int(n_iter),
        scoring=cv_metric,
        cv=cv,
        random_state=int(random_state),
        n_jobs=int(n_jobs),
        error_score=np.nan,
    )
    search.fit(X, y)
    return TuneResult(
        name=name,
        best_estimator=search.best_estimator_,
        best_params=dict(search.best_params_),
        best_cv_score=float(search.best_score_),
        cv_metric=str(cv_metric),
        search_type="randomized",
    )


def tune_model_halving(
    name: str,
    estimator: Any,
    X,
    y,
    *,
    param_distributions: dict[str, Any],
    task: str,
    cv_metric: str,
    factor: int = 3,
    cv: Any = None,
    n_jobs: int = 1,
) -> TuneResult:
    """
    Successive-halving randomized search (often cheaper than plain randomized).
    Uses scikit-learn's experimental HalvingRandomSearchCV.
    """
    if cv is None:
        cv = _default_cv_for_task(task, y)

    # scikit-learn marks this experimental.
    from sklearn.experimental import enable_halving_search_cv  # noqa: F401
    from sklearn.model_selection import HalvingRandomSearchCV

    search = HalvingRandomSearchCV(
        estimator,
        param_distributions=param_distributions,
        scoring=cv_metric,
        cv=cv,
        factor=int(factor),
        n_jobs=int(n_jobs),
        error_score=np.nan,
    )
    search.fit(X, y)
    return TuneResult(
        name=name,
        best_estimator=search.best_estimator_,
        best_params=dict(search.best_params_),
        best_cv_score=float(search.best_score_),
        cv_metric=str(cv_metric),
        search_type="halving_random",
    )

