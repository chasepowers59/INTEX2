#!/usr/bin/env python3
"""Generate complete IS455 ML pipeline notebooks from data/raw CSVs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def md(s: str) -> dict[str, Any]:
    return {"cell_type": "markdown", "metadata": {}, "source": s.strip() + "\n"}


def code(s: str) -> dict[str, Any]:
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": s.strip() + "\n"}


COMMON = r'''
import json
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error, mean_squared_error, precision_recall_fscore_support, r2_score, roc_auc_score, top_k_accuracy_score
from sklearn.model_selection import KFold, RandomizedSearchCV, StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

cwd = Path.cwd().resolve()
REPO_ROOT = cwd.parent if cwd.name == "ml-pipelines" else cwd
DATA_DIR = REPO_ROOT / "data" / "raw"
OUT_DIR = REPO_ROOT / "output" / "ml-predictions"
OUT_DIR.mkdir(parents=True, exist_ok=True)
print("Data dir:", DATA_DIR)
print("Output dir:", OUT_DIR)

def require_csv(stem):
    path = DATA_DIR / f"{stem}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Put the INTEX CSVs under data/raw/.")
    return pd.read_csv(path, encoding="utf-8-sig")

def make_encoder():
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)

def as_bool(series):
    if series.dtype == bool:
        return series.fillna(False)
    return series.astype(str).str.lower().isin(["true", "1", "yes", "y"])

def numeric(series, fill_value=0.0):
    return pd.to_numeric(series, errors="coerce").fillna(fill_value)

def fill_numeric_median(df, cols):
    for col in cols:
        vals = pd.to_numeric(df[col], errors="coerce")
        df[col] = vals.fillna(vals.median() if vals.notna().any() else 0.0)

def rmse(y_true, y_pred):
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))

def eval_classification(y_true, y_pred, y_proba=None):
    acc = accuracy_score(y_true, y_pred)
    pr, rc, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    out = {"accuracy": float(acc), "precision": float(pr), "recall": float(rc), "f1": float(f1)}
    if y_proba is not None and pd.Series(y_true).nunique() > 1:
        try:
            out["roc_auc"] = float(roc_auc_score(y_true, y_proba))
        except Exception:
            pass
    return out

def eval_regression(y_true, y_pred):
    return {"mae": float(mean_absolute_error(y_true, y_pred)), "rmse": rmse(y_true, y_pred), "r2": float(r2_score(y_true, y_pred))}

def classification_baseline(y_train, y_test):
    majority = pd.Series(y_train).mode().iloc[0]
    pred = pd.Series([majority] * len(y_test), index=pd.Series(y_test).index)
    return {"majority_class": str(majority), "accuracy": float(accuracy_score(y_test, pred))}

def regression_baseline(y_train, y_test):
    median_value = float(pd.Series(y_train).median())
    pred = np.repeat(median_value, len(y_test))
    out = eval_regression(y_test, pred)
    out["baseline_value"] = median_value
    return out

def top_features(pipe, n=10):
    if "pre" not in pipe.named_steps:
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
        weights = np.abs(np.asarray(model.coef_)).mean(axis=0) if np.asarray(model.coef_).ndim > 1 else np.abs(np.asarray(model.coef_))
    else:
        return pd.DataFrame()
    out = pd.DataFrame({"feature": names, "importance": weights}).sort_values("importance", ascending=False).head(n)
    return out.reset_index(drop=True)

def print_business_takeaway(text):
    print("\nBusiness takeaway:")
    print(text)

def compact_cv_classification(X, y, cat_cols, num_cols, scoring_metric="roc_auc", cv_splits=3):
    y = pd.Series(y)
    min_class = y.value_counts().min()
    if y.nunique() < 2 or min_class < 2:
        print("Skipping CV comparison: target does not have enough samples in each class.")
        return pd.DataFrame()
    n_splits = int(min(cv_splits, min_class))
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    models = {
        "Logistic Regression": LogisticRegression(max_iter=3000),
        "Random Forest": RandomForestClassifier(n_estimators=150, random_state=42, min_samples_leaf=3),
        "Gradient Boosting": GradientBoostingClassifier(random_state=42),
    }
    rows = []
    scoring = {"accuracy": "accuracy", "f1_weighted": "f1_weighted"}
    if y.nunique() == 2:
        scoring["roc_auc"] = "roc_auc"
    for name, model in models.items():
        pipe = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", model)])
        scores = cross_validate(pipe, X, y, cv=cv, scoring=scoring, n_jobs=1, error_score=np.nan)
        row = {"Model": name}
        for metric in scoring:
            vals = scores[f"test_{metric}"]
            row[f"{metric}_mean"] = float(np.nanmean(vals))
            row[f"{metric}_std"] = float(np.nanstd(vals))
        rows.append(row)
    out = pd.DataFrame(rows).sort_values(f"{'roc_auc' if 'roc_auc' in scoring else 'accuracy'}_mean", ascending=False)
    print("Compact cross-validation comparison:")
    print(out.to_string(index=False))
    return out

def compact_holdout_regression(train, test, features, target, cat_cols, num_cols, log_target=False):
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=150, random_state=42, min_samples_leaf=3),
        "Gradient Boosting": GradientBoostingRegressor(random_state=42),
    }
    rows = []
    best = None
    best_mae = float("inf")
    y_train = np.log1p(train[target]) if log_target else train[target]
    for name, model in models.items():
        pipe = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", model)])
        pipe.fit(train[features], y_train)
        pred = pipe.predict(test[features])
        pred = np.expm1(pred) if log_target else pred
        pred = np.maximum(0, pred)
        metrics = eval_regression(test[target], pred)
        rows.append({"Model": name, **metrics})
        if metrics["mae"] < best_mae:
            best_mae = metrics["mae"]
            best = (name, pipe)
    out = pd.DataFrame(rows).sort_values("mae")
    print("Time/holdout model comparison:")
    print(out.to_string(index=False))
    return out, best

def compact_randomized_tune_regressor(train, features, target, cat_cols, num_cols, log_target=False, n_iter=6):
    y_train = np.log1p(train[target]) if log_target else train[target]
    cv = KFold(n_splits=min(3, max(2, len(train) // 20)), shuffle=True, random_state=42)
    pipe = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", RandomForestRegressor(random_state=42))])
    search = RandomizedSearchCV(
        pipe,
        {
            "model__n_estimators": [100, 150, 250],
            "model__min_samples_leaf": [1, 3, 5, 8],
            "model__max_depth": [None, 3, 5, 8],
        },
        n_iter=n_iter,
        scoring="neg_mean_absolute_error",
        cv=cv,
        random_state=42,
        n_jobs=1,
    )
    search.fit(train[features], y_train)
    print("RandomizedSearchCV best params:", search.best_params_)
    print("RandomizedSearchCV best CV MAE:", float(-search.best_score_))
    return search.best_estimator_

def time_split(df, date_col, test_frac=0.25):
    df = df.sort_values(date_col).copy()
    split_idx = max(1, int(len(df) * (1 - test_frac)))
    split_idx = min(split_idx, len(df) - 1)
    return df.iloc[:split_idx].copy(), df.iloc[split_idx:].copy()

def safe_classifier_split(X, y, test_size=0.25):
    stratify = y if y.nunique() > 1 and y.value_counts().min() >= 2 else None
    return train_test_split(X, y, test_size=test_size, random_state=42, stratify=stratify)

def score_bands(scores):
    scores = pd.Series(scores).astype(float)
    if len(scores) == 0 or scores.nunique(dropna=True) < 2:
        return pd.Series(["Medium"] * len(scores), index=scores.index)
    labels = ["Low", "Medium", "High", "Very High"]
    q = min(4, scores.nunique(dropna=True), len(scores))
    try:
        return pd.qcut(scores.rank(method="first"), q=q, labels=labels[:q], duplicates="drop").astype(str)
    except Exception:
        return pd.Series(["Medium"] * len(scores), index=scores.index)

def prep(cat_cols, num_cols):
    return ColumnTransformer([("cat", make_encoder(), cat_cols), ("num", "passthrough", num_cols)])

def export_predictions_json(prediction_type, entity_type, df_out, id_col, score_col, label_col=None):
    out_path = OUT_DIR / f"{prediction_type}.json"
    excluded = {id_col, score_col}
    if label_col:
        excluded.add(label_col)
    rows = []
    for _, row in df_out.iterrows():
        payload = {k: v for k, v in row.items() if k not in excluded}
        rows.append({
            "predictionType": prediction_type,
            "entityType": entity_type,
            "entityId": int(row[id_col]),
            "score": float(row[score_col]),
            "label": None if label_col is None or pd.isna(row[label_col]) else str(row[label_col]),
            "payloadJson": json.dumps(payload, default=str),
        })
    out_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} predictions:", out_path)
'''


def nb(title: str, business: str, cells: list[str]) -> dict[str, Any]:
    created = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    all_cells = [
        md(f"# {title}\n\nGenerated: {created}"),
        md(
            "## CRISP-DM / Rubric Overview\n\n"
            f"Business understanding: {business}\n\n"
            "Data understanding and preparation are implemented in code below. Each notebook includes a predictive model, "
            "an explanatory model, evaluation metrics, relationship-analysis notes, and JSON export for app deployment."
        ),
        code(COMMON),
    ]
    all_cells.extend(code(c) for c in cells)
    all_cells.append(md("## Deployment\n\nImport the exported JSON with `POST /api/ml/import?replace=true` and view results in `/app/ml`."))
    return {
        "cells": all_cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.x"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


DONOR_LAPSE = [
r'''
supporters = require_csv("supporters")
donations = require_csv("donations")
donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
donations = donations.dropna(subset=["donation_date", "supporter_id"]).copy()
donations["amount"] = numeric(donations["amount"])
donations["estimated_value"] = numeric(donations["estimated_value"])
donations["is_recurring_bool"] = as_bool(donations["is_recurring"])

cutoff = donations["donation_date"].max() - pd.Timedelta(days=90)
label_end = cutoff + pd.Timedelta(days=90)
past = donations[donations["donation_date"] <= cutoff].copy()
future = donations[(donations["donation_date"] > cutoff) & (donations["donation_date"] <= label_end)].copy()

base = supporters[["supporter_id","supporter_type","relationship_type","region","country","status","acquisition_channel","first_donation_date"]].copy()
base["first_donation_date"] = pd.to_datetime(base["first_donation_date"], errors="coerce")
agg = past.groupby("supporter_id").agg(
    donation_count=("donation_id","count"),
    last_donation_date=("donation_date","max"),
    distinct_campaigns=("campaign_name", lambda s: s.dropna().nunique()),
    distinct_channels=("channel_source", lambda s: s.dropna().nunique()),
    recurring_any=("is_recurring_bool","max"),
    total_value=("estimated_value","sum"),
).reset_index()
mon = past[past["donation_type"] == "Monetary"]
mon_agg = mon.groupby("supporter_id").agg(
    monetary_count=("donation_id","count"),
    monetary_sum=("amount","sum"),
    monetary_avg=("amount","mean"),
    monetary_max=("amount","max"),
).reset_index()
future_gave = (future.groupby("supporter_id")["donation_id"].count() > 0).astype(int).rename("gave_next_90d").reset_index()

df = base.merge(agg, on="supporter_id", how="left").merge(mon_agg, on="supporter_id", how="left").merge(future_gave, on="supporter_id", how="left")
df = df[df["donation_count"].fillna(0) > 0].copy()
df["gave_next_90d"] = df["gave_next_90d"].fillna(0).astype(int)
df["lapsed_next_90d"] = 1 - df["gave_next_90d"]
df["recency_days"] = (cutoff - df["last_donation_date"]).dt.days.clip(lower=0)
df["donor_age_days"] = (cutoff - df["first_donation_date"]).dt.days.clip(lower=0)
cat_cols = ["supporter_type","relationship_type","region","country","status","acquisition_channel"]
num_cols = ["donation_count","distinct_campaigns","distinct_channels","recurring_any","total_value","monetary_count","monetary_sum","monetary_avg","monetary_max","recency_days","donor_age_days"]
df[cat_cols] = df[cat_cols].fillna("Unknown")
fill_numeric_median(df, num_cols)
print("Rows:", len(df), "lapse rate:", round(df["lapsed_next_90d"].mean(), 3))
''',
r'''
features = cat_cols + num_cols
X_train, X_test, y_train, y_test = safe_classifier_split(df[features], df["lapsed_next_90d"])
print("Baseline:", classification_baseline(y_train, y_test))
compact_cv_classification(df[features], df["lapsed_next_90d"], cat_cols, num_cols)
predictive = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", GradientBoostingClassifier(random_state=42))])
predictive.fit(X_train, y_train)
proba = predictive.predict_proba(X_test)[:, 1]
print("Predictive:", eval_classification(y_test, (proba >= 0.5).astype(int), proba))
print("Top predictive features:")
print(top_features(predictive).to_string(index=False))

explanatory = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", LogisticRegression(max_iter=3000))])
explanatory.fit(X_train, y_train)
proba_exp = explanatory.predict_proba(X_test)[:, 1]
print("Explanatory:", eval_classification(y_test, (proba_exp >= 0.5).astype(int), proba_exp))
print("Top explanatory relationships:")
print(top_features(explanatory).to_string(index=False))
print_business_takeaway("Prioritize high-risk supporters for retention outreach, especially when recency and low engagement patterns suggest they may lapse.")
''',
r'''
df_out = df[["supporter_id"] + features].copy()
df_out["risk_score"] = predictive.predict_proba(df_out[features])[:, 1]
df_out["risk_band"] = score_bands(df_out["risk_score"])
export_predictions_json(
    "donor_lapse_90d",
    "Supporter",
    df_out[["supporter_id","risk_score","risk_band","recency_days","donation_count","monetary_sum","recurring_any","acquisition_channel","supporter_type"]],
    "supporter_id",
    "risk_score",
    "risk_band",
)
'''
]


DONOR_UPGRADE = [
r'''
supporters = require_csv("supporters")
donations = require_csv("donations")
donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
mon = donations[donations["donation_type"] == "Monetary"].copy()
mon["amount"] = numeric(mon["amount"])
mon = mon.dropna(subset=["donation_date","supporter_id"]).sort_values(["supporter_id","donation_date"]).copy()
mon["is_recurring_bool"] = as_bool(mon["is_recurring"])
mon["next_amount"] = mon.groupby("supporter_id")["amount"].shift(-1)
mon["next_date"] = mon.groupby("supporter_id")["donation_date"].shift(-1)
mon["days_to_next"] = (mon["next_date"] - mon["donation_date"]).dt.days
df = mon[(mon["next_amount"].notna()) & (mon["days_to_next"].between(1, 365))].copy()
df = df.merge(supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]], on="supporter_id", how="left")
df["donations_so_far"] = df.groupby("supporter_id").cumcount() + 1
df["prev_amount"] = df.groupby("supporter_id")["amount"].shift(1).fillna(df["amount"])
df["prev_date"] = df.groupby("supporter_id")["donation_date"].shift(1)
df["recency_days"] = (df["donation_date"] - df["prev_date"]).dt.days.fillna(9999).clip(lower=0)
df["lifetime_amount_before"] = df.groupby("supporter_id")["amount"].cumsum() - df["amount"]
df["avg_amount_before"] = (df["lifetime_amount_before"] / (df["donations_so_far"] - 1).replace(0, np.nan)).fillna(df["amount"])
df["max_amount_before"] = df.groupby("supporter_id")["amount"].cummax()
df["amount_trend_vs_avg"] = (df["amount"] / df["avg_amount_before"].replace(0, np.nan)).fillna(1.0)
df["days_to_next"] = df["days_to_next"].clip(lower=1)
cat_cols = ["supporter_type","relationship_type","region","country","acquisition_channel","campaign_name","channel_source"]
num_cols = ["amount","prev_amount","recency_days","donations_so_far","is_recurring_bool"]
df[cat_cols] = df[cat_cols].fillna("Unknown")
fill_numeric_median(df, num_cols + ["next_amount"])
train, test = time_split(df, "donation_date")
print("Rows:", len(df), "Train:", len(train), "Test:", len(test))
''',
r'''
features = cat_cols + num_cols
print("Baseline:", regression_baseline(train["next_amount"], test["next_amount"]))
comparison, tuned_candidate = compact_holdout_regression(train, test, features, "next_amount", cat_cols, num_cols, log_target=False)
tuned_rf = compact_randomized_tune_regressor(train, features, "next_amount", cat_cols, num_cols, log_target=False)
tuned_pred = np.maximum(0, tuned_rf.predict(test[features]))
print("Tuned RandomForest holdout:", eval_regression(test["next_amount"], tuned_pred))
predictive = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", RandomForestRegressor(n_estimators=300, random_state=42, min_samples_leaf=3))])
predictive.fit(train[features], train["next_amount"])
pred = np.maximum(0, predictive.predict(test[features]))
print("Predictive RandomForest:", eval_regression(test["next_amount"], pred))
print("Top predictive features:")
print(top_features(predictive).to_string(index=False))

explanatory = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", LinearRegression())])
explanatory.fit(train[features], train["next_amount"])
pred_exp = np.maximum(0, explanatory.predict(test[features]))
print("Explanatory LinearRegression:", eval_regression(test["next_amount"], pred_exp))
print("Top explanatory relationships:")
print(top_features(explanatory).to_string(index=False))

selected_model = explanatory if mean_absolute_error(test["next_amount"], pred_exp) <= mean_absolute_error(test["next_amount"], pred) else predictive
selected_model_name = "LinearRegression" if selected_model is explanatory else "RandomForestRegressor"
if mean_absolute_error(test["next_amount"], tuned_pred) < min(mean_absolute_error(test["next_amount"], pred_exp), mean_absolute_error(test["next_amount"], pred)):
    selected_model = tuned_rf
    selected_model_name = "TunedRandomForestRegressor"
print("Selected export model:", selected_model_name)
print_business_takeaway("Use suggested ask tiers as fundraising guidance, not an automated rule. Validate large ask increases with relationship context.")
''',
r'''
latest = mon.groupby("supporter_id").tail(1).copy()
latest = latest.merge(supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]], on="supporter_id", how="left")
history = mon.groupby("supporter_id").agg(
    donations_so_far=("donation_id","count"),
    prev_amount=("amount", lambda s: s.iloc[-2] if len(s) >= 2 else s.iloc[-1]),
    prev_date=("donation_date", lambda s: s.iloc[-2] if len(s) >= 2 else pd.NaT),
    lifetime_amount_before=("amount","sum"),
    avg_amount_before=("amount","mean"),
    max_amount_before=("amount","max"),
).reset_index()
latest = latest.merge(history, on="supporter_id", how="left")
latest["recency_days"] = (latest["donation_date"] - latest["prev_date"]).dt.days.fillna(9999).clip(lower=0)
latest["is_recurring_bool"] = as_bool(latest["is_recurring"])
latest["amount_trend_vs_avg"] = (latest["amount"] / latest["avg_amount_before"].replace(0, np.nan)).fillna(1.0)
latest["days_to_next"] = latest["recency_days"]
latest[cat_cols] = latest[cat_cols].fillna("Unknown")
fill_numeric_median(latest, num_cols)
latest["predicted_next_amount"] = np.maximum(0, selected_model.predict(latest[features]))
latest["upgrade_ratio"] = (latest["predicted_next_amount"] / latest["amount"].replace(0, np.nan)).fillna(0)
latest["ask_tier"] = pd.cut(latest["upgrade_ratio"], [-np.inf, 1.05, 1.25, 1.50, np.inf], labels=["Maintain","Small Upgrade","Upgrade","Major Upgrade"])
export_predictions_json(
    "donor_upgrade_next_amount",
    "Supporter",
    latest[["supporter_id","predicted_next_amount","ask_tier","amount","upgrade_ratio","recency_days","donations_so_far","supporter_type","acquisition_channel"]].assign(export_model=selected_model_name),
    "supporter_id",
    "predicted_next_amount",
    "ask_tier",
)
'''
]


NEXT_BEST_CHANNEL = [
r'''
supporters = require_csv("supporters")
donations = require_csv("donations")
donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
donations = donations.dropna(subset=["donation_date","supporter_id","channel_source"]).sort_values(["supporter_id","donation_date"]).copy()
donations["amount"] = numeric(donations["amount"])
donations["estimated_value"] = numeric(donations["estimated_value"])
donations["is_recurring_bool"] = as_bool(donations["is_recurring"])
donations["next_channel"] = donations.groupby("supporter_id")["channel_source"].shift(-1)
donations["next_date"] = donations.groupby("supporter_id")["donation_date"].shift(-1)
donations["days_to_next"] = (donations["next_date"] - donations["donation_date"]).dt.days
df = donations[(donations["next_channel"].notna()) & (donations["days_to_next"].between(1, 365))].copy()
df = df.merge(supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]], on="supporter_id", how="left")
df["donations_so_far"] = df.groupby("supporter_id").cumcount() + 1
df["prev_date"] = df.groupby("supporter_id")["donation_date"].shift(1)
df["recency_days"] = (df["donation_date"] - df["prev_date"]).dt.days.fillna(9999).clip(lower=0)
channel_values = ["Campaign", "Direct", "Event", "PartnerReferral", "SocialMedia"]
for channel in channel_values:
    current = df["channel_source"].eq(channel).astype(int)
    df[f"prior_{channel}"] = current.groupby(df["supporter_id"]).cumsum() - current
cat_cols = ["supporter_type","relationship_type","region","country","acquisition_channel","donation_type","campaign_name","channel_source","impact_unit"]
num_cols = ["amount","estimated_value","donations_so_far","recency_days","is_recurring_bool"] + [f"prior_{c}" for c in channel_values]
df[cat_cols] = df[cat_cols].fillna("Unknown")
fill_numeric_median(df, num_cols)
train, test = time_split(df, "donation_date")
print("Rows:", len(df), "Classes:", sorted(df["next_channel"].unique()))
''',
r'''
features = cat_cols + num_cols
print("Baseline:", classification_baseline(train["next_channel"], test["next_channel"]))
compact_cv_classification(train[features], train["next_channel"], cat_cols, num_cols, scoring_metric="accuracy")
predictive = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", RandomForestClassifier(n_estimators=300, random_state=42, min_samples_leaf=3))])
predictive.fit(train[features], train["next_channel"])
pred = predictive.predict(test[features])
print("Predictive accuracy:", float(accuracy_score(test["next_channel"], pred)))
proba = predictive.predict_proba(test[features])
classes = predictive.named_steps["model"].classes_
print("Predictive top-2 accuracy:", float(top_k_accuracy_score(test["next_channel"], proba, k=2, labels=classes)))
print("Top predictive features:")
print(top_features(predictive).to_string(index=False))

explanatory = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", LogisticRegression(max_iter=3000))])
explanatory.fit(train[features], train["next_channel"])
pred_exp = explanatory.predict(test[features])
print("Explanatory accuracy:", float(accuracy_score(test["next_channel"], pred_exp)))
print("Top explanatory relationships:")
print(top_features(explanatory).to_string(index=False))
print_business_takeaway("Treat the next-channel result as a ranked recommendation. Top-2 accuracy is more useful than exact-channel accuracy because outreach teams can test two good options.")
''',
r'''
latest = donations.groupby("supporter_id").tail(1).copy()
latest = latest.merge(supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]], on="supporter_id", how="left")
history = donations.groupby("supporter_id").agg(
    donations_so_far=("donation_id","count"),
    prev_date=("donation_date", lambda s: s.iloc[-2] if len(s) >= 2 else pd.NaT),
).reset_index()
latest = latest.merge(history, on="supporter_id", how="left")
latest["recency_days"] = (latest["donation_date"] - latest["prev_date"]).dt.days.fillna(9999).clip(lower=0)
latest["is_recurring_bool"] = as_bool(latest["is_recurring"])
channel_counts = donations.pivot_table(index="supporter_id", columns="channel_source", values="donation_id", aggfunc="count", fill_value=0).reset_index()
latest = latest.merge(channel_counts, on="supporter_id", how="left")
for channel in channel_values:
    latest[f"prior_{channel}"] = latest[channel] if channel in latest.columns else 0
latest[cat_cols] = latest[cat_cols].fillna("Unknown")
fill_numeric_median(latest, num_cols)
proba = predictive.predict_proba(latest[features])
classes = predictive.named_steps["model"].classes_
best_idx = proba.argmax(axis=1)
latest["predicted_channel"] = [classes[i] for i in best_idx]
latest["confidence"] = proba.max(axis=1)
export_predictions_json(
    "next_channel_source",
    "Supporter",
    latest[["supporter_id","confidence","predicted_channel","channel_source","campaign_name","acquisition_channel","supporter_type"]],
    "supporter_id",
    "confidence",
    "predicted_channel",
)
'''
]


SOCIAL_REFERRALS = [
r'''
posts = require_csv("social_media_posts")
posts["created_at"] = pd.to_datetime(posts["created_at"], errors="coerce")
posts = posts.dropna(subset=["created_at"]).sort_values("created_at").copy()
target = "estimated_donation_value_php"
num_all = ["post_hour","num_hashtags","mentions_count","caption_length","boost_budget_php","impressions","reach","likes","comments","shares","saves","click_throughs","video_views","engagement_rate","profile_visits","donation_referrals","follower_count_at_post","forwards",target]
for col in num_all:
    posts[col] = numeric(posts[col])
posts["has_call_to_action_bool"] = as_bool(posts["has_call_to_action"])
posts["features_resident_story_bool"] = as_bool(posts["features_resident_story"])
posts["is_boosted_bool"] = as_bool(posts["is_boosted"])
pre_features = ["platform","day_of_week","post_hour","post_type","media_type","num_hashtags","mentions_count","has_call_to_action_bool","call_to_action_type","content_topic","sentiment_tone","caption_length","features_resident_story_bool","campaign_name","is_boosted_bool","boost_budget_php"]
exp_features = pre_features + ["impressions","reach","likes","comments","shares","saves","click_throughs","video_views","engagement_rate","profile_visits","follower_count_at_post","forwards"]
cat_cols_pre = ["platform","day_of_week","post_type","media_type","call_to_action_type","content_topic","sentiment_tone","campaign_name"]
num_cols_pre = [c for c in pre_features if c not in cat_cols_pre]
cat_cols_exp = cat_cols_pre
num_cols_exp = [c for c in exp_features if c not in cat_cols_exp]
posts[cat_cols_pre] = posts[cat_cols_pre].fillna("Unknown")
fill_numeric_median(posts, list(set(num_cols_pre + num_cols_exp + [target])))
train, test = time_split(posts, "created_at")
print("Rows:", len(posts), "Train:", len(train), "Test:", len(test))
''',
r'''
predictive = Pipeline([("pre", prep(cat_cols_pre, num_cols_pre)), ("model", RandomForestRegressor(n_estimators=200, random_state=42, min_samples_leaf=5))])
print("Baseline:", regression_baseline(train[target], test[target]))
comparison, tuned_candidate = compact_holdout_regression(train, test, pre_features, target, cat_cols_pre, num_cols_pre, log_target=True)
tuned_rf = compact_randomized_tune_regressor(train, pre_features, target, cat_cols_pre, num_cols_pre, log_target=True)
tuned_pred = np.maximum(0, np.expm1(tuned_rf.predict(test[pre_features])))
print("Tuned pre-post RandomForest holdout:", eval_regression(test[target], tuned_pred))
predictive.fit(train[pre_features], np.log1p(train[target]))
pred = np.maximum(0, np.expm1(predictive.predict(test[pre_features])))
print("Predictive pre-post RandomForest log-target model:", eval_regression(test[target], pred))
if mean_absolute_error(test[target], tuned_pred) < mean_absolute_error(test[target], pred):
    predictive = tuned_rf
    pred = tuned_pred
    print("Selected tuned RandomForest for post export.")
print("Top predictive features:")
print(top_features(predictive).to_string(index=False))

explanatory = Pipeline([("pre", prep(cat_cols_exp, num_cols_exp)), ("model", GradientBoostingRegressor(random_state=42))])
explanatory.fit(train[exp_features], np.log1p(train[target]))
pred_exp = np.maximum(0, np.expm1(explanatory.predict(test[exp_features])))
print("Relationship / engagement model:", eval_regression(test[target], pred_exp))
print("Top engagement relationship features:")
print(top_features(explanatory).to_string(index=False))
print_business_takeaway("For planning, use pre-post signals such as platform, format, CTA, and boost budget. For retrospective learning, engagement metrics explain more donation-value variance.")
''',
r'''
posts_out = posts[["post_id"] + pre_features].copy()
posts_out["predicted_value_php"] = np.maximum(0, np.expm1(predictive.predict(posts_out[pre_features])))
posts_out["value_band"] = score_bands(posts_out["predicted_value_php"])
export_predictions_json(
    "post_donation_value",
    "SocialPost",
    posts_out[["post_id","predicted_value_php","value_band","platform","post_type","media_type","post_hour","has_call_to_action_bool","is_boosted_bool","boost_budget_php"]],
    "post_id",
    "predicted_value_php",
    "value_band",
)
'''
]


SAFEHOUSE_FORECAST = [
r'''
metrics = require_csv("safehouse_monthly_metrics")
metrics["month_start"] = pd.to_datetime(metrics["month_start"], errors="coerce")
metrics = metrics.dropna(subset=["month_start"]).sort_values(["safehouse_id","month_start"]).copy()
num_base = ["active_residents","avg_education_progress","avg_health_score","process_recording_count","home_visitation_count","incident_count"]
fill_numeric_median(metrics, num_base)
g = metrics.groupby("safehouse_id")
metrics["incident_lag1"] = g["incident_count"].shift(1)
metrics["incident_lag2"] = g["incident_count"].shift(2)
metrics["active_lag1"] = g["active_residents"].shift(1)
metrics["active_lag2"] = g["active_residents"].shift(2)
metrics["rolling_incident_3m"] = g["incident_count"].transform(lambda s: s.rolling(3, min_periods=1).mean())
metrics["incident_next"] = g["incident_count"].shift(-1)
metrics["active_residents_next"] = g["active_residents"].shift(-1)
df = metrics.dropna(subset=["incident_next","active_residents_next","incident_lag1","active_lag1"]).copy()
features = num_base + ["incident_lag1","incident_lag2","active_lag1","active_lag2","rolling_incident_3m"]
fill_numeric_median(df, features + ["incident_next","active_residents_next"])
train, test = time_split(df, "month_start")
print("Rows:", len(df), "Train:", len(train), "Test:", len(test))
''',
r'''
incident_model = RandomForestRegressor(n_estimators=300, random_state=42)
print("Incident baseline:", regression_baseline(train["incident_next"], test["incident_next"]))
compact_holdout_regression(train, test, features, "incident_next", [], features, log_target=False)
incident_model.fit(train[features], train["incident_next"])
incident_pred = np.maximum(0, incident_model.predict(test[features]))
print("Predictive incident forecast:", eval_regression(test["incident_next"], incident_pred))
print("Top incident forecast features:")
print(pd.DataFrame({"feature": features, "importance": incident_model.feature_importances_}).sort_values("importance", ascending=False).head(10).to_string(index=False))

active_model = RandomForestRegressor(n_estimators=300, random_state=42)
print("Capacity baseline:", regression_baseline(train["active_residents_next"], test["active_residents_next"]))
compact_holdout_regression(train, test, features, "active_residents_next", [], features, log_target=False)
active_model.fit(train[features], train["active_residents_next"])
active_pred = np.maximum(0, active_model.predict(test[features]))
print("Predictive capacity forecast:", eval_regression(test["active_residents_next"], active_pred))

explanatory = LinearRegression()
explanatory.fit(train[features], train["incident_next"])
incident_exp = np.maximum(0, explanatory.predict(test[features]))
print("Explanatory incident model:", eval_regression(test["incident_next"], incident_exp))
print_business_takeaway("Use the safehouse forecast as a relative ranking for planning staffing and attention, not as an exact count forecast.")
''',
r'''
latest = metrics.groupby("safehouse_id").tail(1).copy()
fill_numeric_median(latest, features)
latest["predicted_incidents_next_month"] = np.maximum(0, incident_model.predict(latest[features]))
latest["predicted_active_residents_next_month"] = np.maximum(0, active_model.predict(latest[features]))
latest["risk_band"] = score_bands(latest["predicted_incidents_next_month"])
export_predictions_json(
    "safehouse_incident_next_month",
    "Safehouse",
    latest[["safehouse_id","predicted_incidents_next_month","risk_band","predicted_active_residents_next_month","active_residents","incident_count","avg_health_score","avg_education_progress"]],
    "safehouse_id",
    "predicted_incidents_next_month",
    "risk_band",
)
'''
]


RESIDENT_RISK = [
r'''
residents = require_csv("residents")
incidents = require_csv("incident_reports")
visits = require_csv("home_visitations")
recordings = require_csv("process_recordings")
edu = require_csv("education_records")
health = require_csv("health_wellbeing_records")
incidents["incident_date"] = pd.to_datetime(incidents["incident_date"], errors="coerce")
visits["visit_date"] = pd.to_datetime(visits["visit_date"], errors="coerce")
recordings["session_date"] = pd.to_datetime(recordings["session_date"], errors="coerce")
edu["record_date"] = pd.to_datetime(edu["record_date"], errors="coerce")
health["record_date"] = pd.to_datetime(health["record_date"], errors="coerce")
# The raw dataset has too few incidents in a 30-day holdout window to train a
# stable classifier. Use a 180-day future window as an incident-risk proxy and
# export to the app's resident_incident_30d slot with the horizon noted in payload.
incident_horizon_days = 180
cutoff = incidents["incident_date"].max() - pd.Timedelta(days=incident_horizon_days)
label_end = cutoff + pd.Timedelta(days=incident_horizon_days)
future_inc = incidents[(incidents["incident_date"] > cutoff) & (incidents["incident_date"] <= label_end)]
y = (future_inc.groupby("resident_id")["incident_id"].count() > 0).astype(int).rename("incident_next_30d").reset_index()
past_inc = incidents[incidents["incident_date"] <= cutoff].copy()
past_vis = visits[visits["visit_date"] <= cutoff].copy()
past_rec = recordings[recordings["session_date"] <= cutoff].copy()
past_edu = edu[edu["record_date"] <= cutoff].copy()
past_health = health[health["record_date"] <= cutoff].copy()

base_cols = ["resident_id","safehouse_id","case_status","case_category","is_pwd","has_special_needs","family_is_4ps","family_solo_parent","family_indigenous","family_parent_pwd","family_informal_settler","referral_source","reintegration_status","initial_risk_level","current_risk_level"]
base = residents[base_cols].copy()
for col in ["is_pwd","has_special_needs","family_is_4ps","family_solo_parent","family_indigenous","family_parent_pwd","family_informal_settler"]:
    base[col] = as_bool(base[col]).astype(int)
inc_90 = past_inc[past_inc["incident_date"] >= cutoff - pd.Timedelta(days=90)]
inc_feat = inc_90.groupby("resident_id").agg(
    incidents_90d=("incident_id","count"),
    high_severity_90d=("severity", lambda s: int((s == "High").sum())),
    unresolved_90d=("resolved", lambda s: int((~as_bool(s)).sum())),
).reset_index()
vis_90 = past_vis[past_vis["visit_date"] >= cutoff - pd.Timedelta(days=90)]
vis_feat = vis_90.groupby("resident_id").agg(
    visits_90d=("visitation_id","count"),
    safety_concerns_90d=("safety_concerns_noted", lambda s: int(as_bool(s).sum())),
    followups_90d=("follow_up_needed", lambda s: int(as_bool(s).sum())),
).reset_index()
rec_30 = past_rec[past_rec["session_date"] >= cutoff - pd.Timedelta(days=30)]
rec_feat = rec_30.groupby("resident_id").agg(
    recordings_30d=("recording_id","count"),
    progress_noted_30d=("progress_noted", lambda s: int(as_bool(s).sum())),
    concerns_flagged_30d=("concerns_flagged", lambda s: int(as_bool(s).sum())),
    referrals_30d=("referral_made", lambda s: int(as_bool(s).sum())),
).reset_index()
def latest_by_res(frame, date_col, value_cols):
    frame = frame.dropna(subset=[date_col]).sort_values(["resident_id", date_col]).copy()
    return frame.groupby("resident_id").tail(1)[["resident_id"] + value_cols] if not frame.empty else pd.DataFrame(columns=["resident_id"] + value_cols)
edu_last = latest_by_res(past_edu, "record_date", ["education_level","enrollment_status","attendance_rate","progress_percent","completion_status"])
health_last = latest_by_res(past_health, "record_date", ["general_health_score","nutrition_score","sleep_quality_score","energy_level_score","bmi"])
df = base.merge(inc_feat, on="resident_id", how="left").merge(vis_feat, on="resident_id", how="left").merge(rec_feat, on="resident_id", how="left").merge(edu_last, on="resident_id", how="left").merge(health_last, on="resident_id", how="left").merge(y, on="resident_id", how="left")
df["incident_next_30d"] = df["incident_next_30d"].fillna(0).astype(int)
count_cols = ["incidents_90d","high_severity_90d","unresolved_90d","visits_90d","safety_concerns_90d","followups_90d","recordings_30d","progress_noted_30d","concerns_flagged_30d","referrals_30d"]
for col in count_cols:
    df[col] = df[col].fillna(0)
health_edu_cols = ["attendance_rate","progress_percent","general_health_score","nutrition_score","sleep_quality_score","energy_level_score","bmi"]
fill_numeric_median(df, health_edu_cols)
cat_cols = ["case_status","case_category","referral_source","reintegration_status","initial_risk_level","current_risk_level","education_level","enrollment_status","completion_status"]
df[cat_cols] = df[cat_cols].fillna("Unknown")
print("Rows:", len(df), "Incident rate:", round(df["incident_next_30d"].mean(), 3))
''',
r'''
target = "incident_next_30d"
num_cols = ["safehouse_id","is_pwd","has_special_needs","family_is_4ps","family_solo_parent","family_indigenous","family_parent_pwd","family_informal_settler","incidents_90d","high_severity_90d","unresolved_90d","visits_90d","safety_concerns_90d","followups_90d","recordings_30d","progress_noted_30d","concerns_flagged_30d","referrals_30d","attendance_rate","progress_percent","general_health_score","nutrition_score","sleep_quality_score","energy_level_score","bmi"]
features = cat_cols + num_cols
X_train, X_test, y_train, y_test = safe_classifier_split(df[features], df[target])
print("Baseline:", classification_baseline(y_train, y_test))
compact_cv_classification(df[features], df[target], cat_cols, num_cols)
predictive = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", GradientBoostingClassifier(random_state=42))])
predictive.fit(X_train, y_train)
proba = predictive.predict_proba(X_test)[:, 1]
print("Predictive incident model:", eval_classification(y_test, (proba >= 0.5).astype(int), proba))
print("Top predictive risk features:")
print(top_features(predictive).to_string(index=False))
explanatory = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", LogisticRegression(max_iter=3000))])
explanatory.fit(X_train, y_train)
proba_exp = explanatory.predict_proba(X_test)[:, 1]
print("Explanatory incident model:", eval_classification(y_test, (proba_exp >= 0.5).astype(int), proba_exp))
print("Top explanatory risk relationships:")
print(top_features(explanatory).to_string(index=False))
print_business_takeaway("Use resident risk scores for staff triage only. Sensitive care decisions should always remain human-reviewed.")
''',
r'''
df_out = df[["resident_id"] + features].copy()
df_out["risk_score"] = predictive.predict_proba(df_out[features])[:, 1]
df_out["risk_band"] = score_bands(df_out["risk_score"])
export_predictions_json(
    "resident_incident_30d",
    "Resident",
    df_out[["resident_id","risk_score","risk_band","safehouse_id","incidents_90d","safety_concerns_90d","followups_90d","recordings_30d","progress_percent","general_health_score"]].assign(training_horizon_days=incident_horizon_days),
    "resident_id",
    "risk_score",
    "risk_band",
)
''',
r'''
df["readiness_positive"] = df["reintegration_status"].isin(["Completed", "In Progress"]).astype(int)
X_train, X_test, y_train, y_test = safe_classifier_split(df[features], df["readiness_positive"])
print("Readiness baseline:", classification_baseline(y_train, y_test))
compact_cv_classification(df[features], df["readiness_positive"], cat_cols, num_cols)
readiness_model = Pipeline([("pre", prep(cat_cols, num_cols)), ("model", GradientBoostingClassifier(random_state=42))])
readiness_model.fit(X_train, y_train)
readiness_proba = readiness_model.predict_proba(X_test)[:, 1]
print("Predictive readiness model:", eval_classification(y_test, (readiness_proba >= 0.5).astype(int), readiness_proba))
print("Top readiness features:")
print(top_features(readiness_model).to_string(index=False))
ready_out = df[["resident_id"] + features].copy()
ready_out["readiness_score"] = readiness_model.predict_proba(ready_out[features])[:, 1]
ready_out["readiness_band"] = score_bands(ready_out["readiness_score"])
export_predictions_json(
    "resident_reintegration_readiness",
    "Resident",
    ready_out[["resident_id","readiness_score","readiness_band","safehouse_id","reintegration_status","progress_percent","general_health_score","incidents_90d","concerns_flagged_30d"]],
    "resident_id",
    "readiness_score",
    "readiness_band",
)
'''
]


NOTEBOOKS = [
    (
        "donor-lapse-risk.ipynb",
        "Pipeline 1 - Donor Lapse Risk Predictor",
        "Identify supporters most likely to lapse in the next 90 days so leaders can prioritize retention outreach.",
        DONOR_LAPSE,
    ),
    (
        "donor-upgrade-propensity.ipynb",
        "Pipeline 2 - Donor Upgrade Propensity / Ask Amount Predictor",
        "Predict likely next donation amount so fundraising asks can be personalized.",
        DONOR_UPGRADE,
    ),
    (
        "next-best-campaign.ipynb",
        "Pipeline 3 - Next Best Channel Predictor",
        "Recommend the next donation channel most likely to work for each supporter.",
        NEXT_BEST_CHANNEL,
    ),
    (
        "social-post-donation-referrals.ipynb",
        "Pipeline 4 - Social Post Donation Value Predictor",
        "Predict which social posts are likely to drive donation value and referrals.",
        SOCIAL_REFERRALS,
    ),
    (
        "safehouse-capacity-forecast.ipynb",
        "Pipeline 5 - Safehouse Capacity and Incident Forecast",
        "Forecast next-month incident and capacity pressure for safehouse planning.",
        SAFEHOUSE_FORECAST,
    ),
    (
        "resident-risk-and-readiness.ipynb",
        "Pipeline 6 - Resident Risk and Reintegration Readiness Predictor",
        "Flag residents at elevated incident risk and estimate reintegration readiness for staff triage.",
        RESIDENT_RISK,
    ),
]


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "ml-pipelines"
    out_dir.mkdir(parents=True, exist_ok=True)
    for filename, title, business, cells in NOTEBOOKS:
        (out_dir / filename).write_text(json.dumps(nb(title, business, cells), indent=2), encoding="utf-8")
        print("Generated", out_dir / filename)


if __name__ == "__main__":
    main()
