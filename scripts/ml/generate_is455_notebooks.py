#!/usr/bin/env python3
"""
Generate 6 IS455 ML pipeline notebooks that:
- Use the real CSV schemas from data/raw/lighthouse_csv_v7 (or data/raw).
- Follow CRISP-DM headings while still satisfying the rubric-required sections.
- Include predictive + explanatory models per pipeline.
- Export predictions JSON for import into the app via POST /api/ml/import.

This script writes directly to ./ml-pipelines/*.ipynb.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def md(s: str) -> dict[str, Any]:
    return {"cell_type": "markdown", "metadata": {}, "source": s.strip() + "\n"}


def code(s: str) -> dict[str, Any]:
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": s.strip() + "\n"}


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


COMMON_SETUP = r"""
import json
import os
import re
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, roc_auc_score,
    mean_absolute_error, mean_squared_error, r2_score
)
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor


REPO_ROOT = Path("..").resolve()
RAW_DIR_A = (REPO_ROOT / "data" / "raw" / "lighthouse_csv_v7").resolve()
RAW_DIR_B = (REPO_ROOT / "data" / "raw").resolve()
DATA_DIR = RAW_DIR_A if RAW_DIR_A.exists() else RAW_DIR_B

OUT_DIR = (REPO_ROOT / "output" / "ml-predictions").resolve()
OUT_DIR.mkdir(parents=True, exist_ok=True)

print("Data dir:", DATA_DIR)
print("Out dir:", OUT_DIR)


def require_csv(stem: str) -> pd.DataFrame:
    path = DATA_DIR / f"{stem}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}.")
    return pd.read_csv(path, encoding="utf-8-sig")


# After POST /api/admin/lighthouse-import, train from Azure SQL by setting INTEX_ODBC to your ODBC connection string.
SQL_TABLE_BY_STEM = {
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


def load_df(stem: str) -> pd.DataFrame:
    odbc = os.environ.get("INTEX_ODBC")
    table = SQL_TABLE_BY_STEM.get(stem)
    if odbc and table:
        try:
            import pyodbc

            with pyodbc.connect(odbc, timeout=120) as cnx:
                df = pd.read_sql(f"SELECT * FROM [{table}]", cnx)
            print(f"DB [{table}] rows:", len(df))
            if len(df) > 0:

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
            print("INTEX_ODBC failed, using CSV:", ex)
    return require_csv(stem)


def to_date(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce").dt.date


def to_dt(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce", utc=True)


def eval_classification(y_true, y_pred, y_proba=None):
    acc = accuracy_score(y_true, y_pred)
    pr, rc, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    out = {"accuracy": float(acc), "precision": float(pr), "recall": float(rc), "f1": float(f1)}
    if y_proba is not None:
        try:
            out["roc_auc"] = float(roc_auc_score(y_true, y_proba))
        except Exception:
            pass
    return out


def eval_regression(y_true, y_pred):
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(mean_squared_error(y_true, y_pred, squared=False)),
        "r2": float(r2_score(y_true, y_pred)),
    }


def export_predictions_json(prediction_type: str, entity_type: str, df_out: pd.DataFrame, id_col: str, score_col: str, label_col: str | None = None):
    out_path = OUT_DIR / f"{prediction_type}.json"
    rows = []
    for _, r in df_out.iterrows():
        rows.append(
            {
                "predictionType": prediction_type,
                "entityType": entity_type,
                "entityId": int(r[id_col]),
                "score": float(r[score_col]),
                "label": None if label_col is None else (None if pd.isna(r[label_col]) else str(r[label_col])),
                "payloadJson": json.dumps({k: v for k, v in r.items() if k not in {id_col, score_col, label_col}}, default=str),
            }
        )
    out_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("Wrote:", out_path, "rows=", len(rows))
"""


@dataclass(frozen=True)
class NotebookSpec:
    filename: str
    title: str
    crispdm_business: str
    crispdm_data: str
    crispdm_prep: str
    crispdm_model: str
    crispdm_eval: str
    crispdm_deploy: str
    code_cells: list[str]


def build_notebook(spec: NotebookSpec) -> dict[str, Any]:
    created = now_utc()
    header = f"""
# {spec.title}

**Created:** {created}

This notebook follows **CRISP-DM** while also satisfying the IS455 rubric sections:
- Problem Framing
- Data Acquisition, Preparation & Exploration
- Modeling & Feature Selection
- Evaluation & Interpretation
- Causal and Relationship Analysis
- Deployment Notes
"""

    crispdm = f"""
## CRISP-DM Overview

### 1) Business Understanding
{spec.crispdm_business}

### 2) Data Understanding
{spec.crispdm_data}

### 3) Data Preparation
{spec.crispdm_prep}

### 4) Modeling
{spec.crispdm_model}

### 5) Evaluation
{spec.crispdm_eval}

### 6) Deployment
{spec.crispdm_deploy}
"""

    rubric_1 = """
## 1) Problem Framing (Rubric)

State:
- the business question,
- who cares,
- why it matters,
- predictive vs explanatory goals.

We build **two models**:
- Predictive (optimize out-of-sample performance)
- Explanatory (interpretability / relationship analysis)
"""

    rubric_2 = """
## 2) Data Acquisition, Preparation & Exploration (Rubric)

Rules to avoid leakage:
- Define an **as-of date** (cutoff).
- Build features using only data **on or before** the cutoff.
- Create labels using only data **after** the cutoff in a defined horizon.
"""

    rubric_3 = """
## 3) Modeling & Feature Selection (Rubric)

- Predictive model: tree/ensemble
- Explanatory model: linear/logistic regression
"""

    rubric_4_5 = """
## 4) Evaluation & Interpretation (Rubric)

Interpret in business terms, and discuss real-world costs of errors.

## 5) Causal and Relationship Analysis (Rubric)

Discuss relationships, confounding risks, and where correlation ≠ causation.
"""

    rubric_6 = """
## 6) Deployment Notes (Rubric)

Export predictions to JSON and import into the deployed app:
- `POST /api/ml/import?replace=true` (admin-only)
- View in `/app/ml` (Staff Portal → ML Insights)
"""

    cells: list[dict[str, Any]] = [
        md(header),
        md(crispdm),
        md(rubric_1),
        md(rubric_2),
        code(COMMON_SETUP),
    ]

    for c in spec.code_cells:
        cells.append(code(c))

    cells.extend([md(rubric_3), md(rubric_4_5), md(rubric_6)])

    return {
        "cells": cells,
        "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}},
        "nbformat": 4,
        "nbformat_minor": 5,
    }


PIPELINE_1 = [
    r"""
supporters = load_df("supporters")
        donations = load_df("donations")
donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")

max_date = donations["donation_date"].max()
cutoff = max_date - pd.Timedelta(days=90)
label_end = cutoff + pd.Timedelta(days=90)
print("Max donation_date:", max_date.date())
print("Cutoff:", cutoff.date(), "Label window end:", label_end.date())

# Donations split into past vs future window for labeling
past = donations[donations["donation_date"] <= cutoff].copy()
future = donations[(donations["donation_date"] > cutoff) & (donations["donation_date"] <= label_end)].copy()

# Label: did the supporter donate in the next 90 days?
y = future.groupby("supporter_id")["donation_id"].count().rename("donated_next_90d")
y = (y > 0).astype(int).reset_index()

# Features: supporter attributes
base = supporters[["supporter_id","supporter_type","relationship_type","region","country","status","acquisition_channel","first_donation_date"]].copy()
base["first_donation_date"] = pd.to_datetime(base["first_donation_date"], errors="coerce")

# Features: donation history aggregates as-of cutoff
past_monetary = past[past["donation_type"] == "Monetary"].copy()

agg = past.groupby("supporter_id").agg(
    donation_count=("donation_id","count"),
    last_donation_date=("donation_date","max"),
    distinct_campaigns=("campaign_name", lambda s: s.dropna().nunique()),
    distinct_channels=("channel_source", lambda s: s.dropna().nunique()),
    recurring_any=("is_recurring", lambda s: int((s == True).any())),
).reset_index()

agg_m = past_monetary.groupby("supporter_id").agg(
    monetary_count=("donation_id","count"),
    monetary_sum=("amount", "sum"),
    monetary_avg=("amount", "mean"),
    monetary_max=("amount", "max"),
).reset_index()

df = base.merge(agg, on="supporter_id", how="left").merge(agg_m, on="supporter_id", how="left").merge(y, on="supporter_id", how="left")
df["donated_next_90d"] = df["donated_next_90d"].fillna(0).astype(int)

df["recency_days"] = (cutoff - df["last_donation_date"]).dt.days
df["recency_days"] = df["recency_days"].fillna(9999).clip(lower=0)

for col in ["donation_count","distinct_campaigns","distinct_channels","recurring_any","monetary_count","monetary_sum","monetary_avg","monetary_max"]:
    df[col] = df[col].fillna(0)

df = df[df["status"].isin(["Active","Inactive"])].copy()

print("Rows:", len(df), "Pos rate:", df["donated_next_90d"].mean())
df.head()
""",
    r"""
# Train/test split
target = "donated_next_90d"
features = [
    "supporter_type","relationship_type","region","country","status","acquisition_channel",
    "donation_count","recency_days","distinct_campaigns","distinct_channels","recurring_any",
    "monetary_count","monetary_sum","monetary_avg","monetary_max"
]

X = df[features].copy()
y = df[target].copy()

cat_cols = ["supporter_type","relationship_type","region","country","status","acquisition_channel"]
num_cols = [c for c in features if c not in cat_cols]

pre = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ("num", "passthrough", num_cols),
    ]
)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
""",
    r"""
# Predictive model (ensemble)
gb = Pipeline(steps=[
    ("pre", pre),
    ("model", GradientBoostingClassifier(random_state=42))
])
gb.fit(X_train, y_train)
proba = gb.predict_proba(X_test)[:,1]
pred = (proba >= 0.5).astype(int)
print("Predictive (GB):", eval_classification(y_test, pred, proba))

# Explanatory model (logistic regression)
lr = Pipeline(steps=[
    ("pre", pre),
    ("model", LogisticRegression(max_iter=2000))
])
lr.fit(X_train, y_train)
proba2 = lr.predict_proba(X_test)[:,1]
pred2 = (proba2 >= 0.5).astype(int)
print("Explanatory (LogReg):", eval_classification(y_test, pred2, proba2))
""",
    r"""
# Score all supporters as-of cutoff (use predictive model)
df_out = df[["supporter_id"] + features].copy()
df_out["risk_score"] = gb.predict_proba(df_out[features])[:,1]
df_out["risk_band"] = pd.qcut(df_out["risk_score"], q=4, labels=["Low","Medium","High","Very High"])

export_predictions_json(
    prediction_type="donor_lapse_90d",
    entity_type="Supporter",
    df_out=df_out[["supporter_id","risk_score","risk_band","recency_days","donation_count","monetary_sum","recurring_any","acquisition_channel","supporter_type"]],
    id_col="supporter_id",
    score_col="risk_score",
    label_col="risk_band"
)
""",
]

PIPELINE_2 = [
    r"""
supporters = load_df("supporters")
        donations = load_df("donations")
donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")

# Focus on monetary donations with numeric amount
mon = donations[(donations["donation_type"] == "Monetary") & donations["amount"].notna()].copy()
mon["amount"] = pd.to_numeric(mon["amount"], errors="coerce")
mon = mon.dropna(subset=["amount","donation_date"])

mon = mon.sort_values(["supporter_id","donation_date"]).copy()
mon["next_amount"] = mon.groupby("supporter_id")["amount"].shift(-1)
mon["next_date"] = mon.groupby("supporter_id")["donation_date"].shift(-1)
mon["days_to_next"] = (mon["next_date"] - mon["donation_date"]).dt.days

# Keep rows where a next donation exists within a reasonable horizon
df = mon[(mon["next_amount"].notna()) & (mon["days_to_next"].between(1, 180))].copy()

# Add supporter attributes
df = df.merge(
    supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]],
    on="supporter_id",
    how="left"
)

# Simple history features as of current donation
df["donations_so_far"] = df.groupby("supporter_id").cumcount() + 1
df["prev_amount"] = df.groupby("supporter_id")["amount"].shift(1)
df["prev_date"] = df.groupby("supporter_id")["donation_date"].shift(1)
df["recency_days"] = (df["donation_date"] - df["prev_date"]).dt.days
df["recency_days"] = df["recency_days"].fillna(9999).clip(lower=0)
df["prev_amount"] = df["prev_amount"].fillna(df["amount"])

# Target
df["y_next_amount"] = df["next_amount"]
df["y_upgrade_25pct"] = (df["next_amount"] >= (df["amount"] * 1.25)).astype(int)

print("Rows:", len(df))
df[["supporter_id","donation_date","amount","next_amount","days_to_next","y_upgrade_25pct"]].head()
""",
    r"""
# Time-based train/test split (avoid leakage across time)
cutoff_date = df["donation_date"].max() - pd.Timedelta(days=90)
train = df[df["donation_date"] <= cutoff_date].copy()
test = df[df["donation_date"] > cutoff_date].copy()
print("Train rows:", len(train), "Test rows:", len(test), "Cutoff:", cutoff_date.date())

features = [
    "supporter_type","relationship_type","region","country","acquisition_channel",
    "amount","prev_amount","recency_days","donations_so_far","is_recurring","campaign_name","channel_source"
]

cat_cols = ["supporter_type","relationship_type","region","country","acquisition_channel","campaign_name","channel_source"]
num_cols = [c for c in features if c not in cat_cols]

pre = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ("num", "passthrough", num_cols),
    ]
)

X_train, y_train = train[features], train["y_next_amount"]
X_test, y_test = test[features], test["y_next_amount"]
""",
    r"""
# Predictive model (regression)
gbr = Pipeline(steps=[
    ("pre", pre),
    ("model", GradientBoostingRegressor(random_state=42))
])
gbr.fit(X_train, y_train)
pred = gbr.predict(X_test)
print("Predictive (GBReg):", eval_regression(y_test, pred))

# Explanatory model (linear regression on log(amount))
lin = Pipeline(steps=[
    ("pre", pre),
    ("model", LinearRegression())
])
lin.fit(X_train, np.log1p(y_train))
pred2 = np.expm1(lin.predict(X_test))
print("Explanatory (Linear):", eval_regression(y_test, pred2))
""",
    r"""
# Score each supporter using their latest monetary donation (recommend next ask)
latest = mon.sort_values(["supporter_id","donation_date"]).groupby("supporter_id").tail(1).copy()
latest = latest.merge(
    supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]],
    on="supporter_id",
    how="left"
)
latest["donations_so_far"] = mon.groupby("supporter_id").size().reindex(latest["supporter_id"]).values
latest["prev_amount"] = mon.sort_values(["supporter_id","donation_date"]).groupby("supporter_id")["amount"].nth(-2).reindex(latest["supporter_id"]).values
latest["prev_amount"] = pd.to_numeric(latest["prev_amount"], errors="coerce").fillna(latest["amount"])

latest["prev_date"] = mon.sort_values(["supporter_id","donation_date"]).groupby("supporter_id")["donation_date"].nth(-2).reindex(latest["supporter_id"]).values
latest["recency_days"] = (latest["donation_date"] - latest["prev_date"]).dt.days
latest["recency_days"] = latest["recency_days"].fillna(9999).clip(lower=0)

for c in ["is_recurring","campaign_name","channel_source"]:
    if c not in latest.columns:
        latest[c] = None

latest["predicted_next_amount"] = gbr.predict(latest[features])
latest["upgrade_ratio"] = (latest["predicted_next_amount"] / latest["amount"]).replace([np.inf,-np.inf], np.nan).fillna(0)
latest["ask_tier"] = pd.cut(latest["upgrade_ratio"], bins=[-np.inf,1.05,1.25,1.5,np.inf], labels=["Maintain","Small Upgrade","Upgrade","Major Upgrade"])

export_predictions_json(
    prediction_type="donor_upgrade_next_amount",
    entity_type="Supporter",
    df_out=latest[["supporter_id","predicted_next_amount","ask_tier","amount","upgrade_ratio","recency_days","donations_so_far","acquisition_channel","supporter_type"]].rename(columns={"predicted_next_amount":"score"}),
    id_col="supporter_id",
    score_col="score",
    label_col="ask_tier"
)
""",
]

PIPELINE_3 = [
    r"""
supporters = load_df("supporters")
        donations = load_df("donations")
donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
donations = donations.dropna(subset=["donation_date"]).sort_values(["supporter_id","donation_date"]).copy()

# Label: next channel_source for each donation event
donations["next_channel"] = donations.groupby("supporter_id")["channel_source"].shift(-1)
donations["next_date"] = donations.groupby("supporter_id")["donation_date"].shift(-1)
donations["days_to_next"] = (donations["next_date"] - donations["donation_date"]).dt.days

df = donations[(donations["next_channel"].notna()) & (donations["days_to_next"].between(1, 365))].copy()
df = df.merge(
    supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]],
    on="supporter_id", how="left"
)

# Keep top channels, bucket the rest
top = df["next_channel"].value_counts().head(6).index.tolist()
df["y_next_channel"] = df["next_channel"].where(df["next_channel"].isin(top), other="Other")

df["donations_so_far"] = df.groupby("supporter_id").cumcount() + 1
df["prev_date"] = df.groupby("supporter_id")["donation_date"].shift(1)
df["recency_days"] = (df["donation_date"] - df["prev_date"]).dt.days
df["recency_days"] = df["recency_days"].fillna(9999).clip(lower=0)

features = [
    "supporter_type","relationship_type","region","country","acquisition_channel",
    "donation_type","is_recurring","campaign_name","channel_source",
    "amount","estimated_value","impact_unit",
    "donations_so_far","recency_days"
]
for c in ["amount","estimated_value"]:
    df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

cutoff_date = df["donation_date"].max() - pd.Timedelta(days=90)
train = df[df["donation_date"] <= cutoff_date].copy()
test = df[df["donation_date"] > cutoff_date].copy()
print("Train rows:", len(train), "Test rows:", len(test), "Cutoff:", cutoff_date.date())

cat_cols = [c for c in features if c not in ["amount","estimated_value","donations_so_far","recency_days"]]
num_cols = ["amount","estimated_value","donations_so_far","recency_days"]

pre = ColumnTransformer(
    transformers=[("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols), ("num", "passthrough", num_cols)]
)

X_train, y_train = train[features], train["y_next_channel"]
X_test, y_test = test[features], test["y_next_channel"]
""",
    r"""
# Predictive model (multiclass)
clf = Pipeline(steps=[("pre", pre), ("model", GradientBoostingClassifier(random_state=42))])
clf.fit(X_train, y_train)
pred = clf.predict(X_test)
acc = float((pred == y_test).mean())
print("Predictive accuracy:", acc)

# Explanatory model (multinomial logistic regression)
lr = Pipeline(steps=[("pre", pre), ("model", LogisticRegression(max_iter=3000, multi_class="multinomial"))])
lr.fit(X_train, y_train)
pred2 = lr.predict(X_test)
acc2 = float((pred2 == y_test).mean())
print("Explanatory accuracy:", acc2)
""",
    r"""
# Score each supporter on their latest donation: predicted next channel + confidence
latest = donations.groupby("supporter_id").tail(1).copy()
latest = latest.merge(
    supporters[["supporter_id","supporter_type","relationship_type","region","country","acquisition_channel"]],
    on="supporter_id", how="left"
)
latest["donations_so_far"] = donations.groupby("supporter_id").size().reindex(latest["supporter_id"]).values
latest["prev_date"] = donations.groupby("supporter_id")["donation_date"].nth(-2).reindex(latest["supporter_id"]).values
latest["recency_days"] = (latest["donation_date"] - latest["prev_date"]).dt.days
latest["recency_days"] = latest["recency_days"].fillna(9999).clip(lower=0)

for c in ["amount","estimated_value"]:
    latest[c] = pd.to_numeric(latest[c], errors="coerce").fillna(0)

proba = clf.predict_proba(latest[features])
classes = clf.named_steps["model"].classes_
best_idx = proba.argmax(axis=1)
latest["predicted_channel"] = [classes[i] for i in best_idx]
latest["confidence"] = proba.max(axis=1)

export_predictions_json(
    prediction_type="next_channel_source",
    entity_type="Supporter",
    df_out=latest[["supporter_id","confidence","predicted_channel","channel_source","campaign_name","acquisition_channel","supporter_type"]].rename(columns={"confidence":"score"}),
    id_col="supporter_id",
    score_col="score",
    label_col="predicted_channel"
)
""",
]

PIPELINE_4 = [
    r"""
posts = load_df("social_media_posts")
posts["created_at"] = pd.to_datetime(posts["created_at"], errors="coerce")
posts = posts.dropna(subset=["created_at"]).sort_values("created_at").copy()

posts["estimated_donation_value_php"] = pd.to_numeric(posts["estimated_donation_value_php"], errors="coerce").fillna(0)
posts["donation_referrals"] = pd.to_numeric(posts["donation_referrals"], errors="coerce").fillna(0)

# Predictive features available at creation time (actionable)
pre_features = [
    "platform","day_of_week","post_hour","post_type","media_type",
    "num_hashtags","mentions_count","has_call_to_action","call_to_action_type",
    "content_topic","sentiment_tone","caption_length","features_resident_story",
    "campaign_name","is_boosted","boost_budget_php"
]
for c in ["num_hashtags","mentions_count","caption_length","boost_budget_php","post_hour"]:
    posts[c] = pd.to_numeric(posts[c], errors="coerce").fillna(0)

# Explanatory features (includes engagement metrics; not available before posting)
exp_features = pre_features + [
    "impressions","reach","likes","comments","shares","saves","click_throughs","video_views",
    "engagement_rate","profile_visits","follower_count_at_post","forwards"
]
for c in ["impressions","reach","likes","comments","shares","saves","click_throughs","video_views",
          "engagement_rate","profile_visits","follower_count_at_post","forwards"]:
    posts[c] = pd.to_numeric(posts[c], errors="coerce").fillna(0)

target = "estimated_donation_value_php"

# Time split
cutoff = posts["created_at"].quantile(0.8)
train = posts[posts["created_at"] <= cutoff].copy()
test = posts[posts["created_at"] > cutoff].copy()
print("Train:", len(train), "Test:", len(test), "Cutoff:", cutoff)
""",
    r"""
def fit_regression(df_train, df_test, features, model):
    cat_cols = [c for c in features if df_train[c].dtype == "object" or c in ["platform","day_of_week","post_type","media_type","call_to_action_type","content_topic","sentiment_tone","campaign_name"]]
    num_cols = [c for c in features if c not in cat_cols]
    pre = ColumnTransformer(
        transformers=[("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols), ("num", "passthrough", num_cols)]
    )
    pipe = Pipeline(steps=[("pre", pre), ("model", model)])
    pipe.fit(df_train[features], df_train[target])
    pred = pipe.predict(df_test[features])
    return pipe, pred

# Predictive (actionable) model
pred_model, pred_hat = fit_regression(train, test, pre_features, GradientBoostingRegressor(random_state=42))
print("Predictive (pre-post features):", eval_regression(test[target], pred_hat))

# Explanatory model (uses engagement metrics)
exp_model, exp_hat = fit_regression(train, test, exp_features, LinearRegression())
print("Explanatory (includes engagement):", eval_regression(test[target], exp_hat))
""",
    r"""
# Score each post (what we would have expected based on the plan)
posts_out = posts[["post_id"] + pre_features].copy()
posts_out["predicted_value_php"] = pred_model.predict(posts_out[pre_features])
posts_out["value_band"] = pd.qcut(posts_out["predicted_value_php"].rank(method="first"), q=4, labels=["Low","Medium","High","Very High"])

export_predictions_json(
    prediction_type="post_donation_value",
    entity_type="SocialPost",
    df_out=posts_out[["post_id","predicted_value_php","value_band","platform","post_type","media_type","post_hour","has_call_to_action","is_boosted","boost_budget_php"]].rename(columns={"post_id":"post_id","predicted_value_php":"score"}),
    id_col="post_id",
    score_col="score",
    label_col="value_band"
)
""",
]

PIPELINE_5 = [
    r"""
metrics = load_df("safehouse_monthly_metrics")
metrics["month_start"] = pd.to_datetime(metrics["month_start"], errors="coerce")
metrics = metrics.dropna(subset=["month_start"]).sort_values(["safehouse_id","month_start"]).copy()

for c in ["active_residents","avg_education_progress","avg_health_score","process_recording_count","home_visitation_count","incident_count"]:
    metrics[c] = pd.to_numeric(metrics[c], errors="coerce").fillna(0)

# Lag features
g = metrics.groupby("safehouse_id")
metrics["incident_lag1"] = g["incident_count"].shift(1)
metrics["incident_lag2"] = g["incident_count"].shift(2)
metrics["active_lag1"] = g["active_residents"].shift(1)
metrics["rolling_incident_3m"] = g["incident_count"].rolling(3).mean().reset_index(level=0, drop=True)

# Label: next month incident_count
metrics["incident_next"] = g["incident_count"].shift(-1)

df = metrics.dropna(subset=["incident_next","incident_lag1","active_lag1"]).copy()

features = ["active_residents","avg_education_progress","avg_health_score","process_recording_count","home_visitation_count","incident_count",
            "incident_lag1","incident_lag2","active_lag1","rolling_incident_3m"]

cutoff = df["month_start"].quantile(0.8)
train = df[df["month_start"] <= cutoff].copy()
test = df[df["month_start"] > cutoff].copy()

X_train, y_train = train[features], train["incident_next"]
X_test, y_test = test[features], test["incident_next"]
print("Train:", len(train), "Test:", len(test))
""",
    r"""
# Predictive model
rf = RandomForestRegressor(n_estimators=300, random_state=42)
rf.fit(X_train, y_train)
pred = rf.predict(X_test)
print("Predictive (RF):", eval_regression(y_test, pred))

# Explanatory model
lin = LinearRegression()
lin.fit(X_train, y_train)
pred2 = lin.predict(X_test)
print("Explanatory (Linear):", eval_regression(y_test, pred2))
""",
    r"""
# Score next-month incident risk for each safehouse (latest month per safehouse)
latest = metrics.groupby("safehouse_id").tail(1).copy()
latest = latest.dropna(subset=["incident_lag1","active_lag1"])
latest["predicted_incidents_next_month"] = rf.predict(latest[features])
latest["risk_band"] = pd.qcut(latest["predicted_incidents_next_month"].rank(method="first"), q=4, labels=["Low","Medium","High","Very High"])

export_predictions_json(
    prediction_type="safehouse_incident_next_month",
    entity_type="Safehouse",
    df_out=latest[["safehouse_id","predicted_incidents_next_month","risk_band","active_residents","incident_count","avg_health_score","avg_education_progress"]].rename(columns={"safehouse_id":"safehouse_id","predicted_incidents_next_month":"score"}),
    id_col="safehouse_id",
    score_col="score",
    label_col="risk_band"
)
""",
]

PIPELINE_6 = [
    r"""
residents = load_df("residents")
        incidents = load_df("incident_reports")
        visits = load_df("home_visitations")
        recordings = load_df("process_recordings")
        edu = load_df("education_records")
        health = load_df("health_wellbeing_records")

incidents["incident_date"] = pd.to_datetime(incidents["incident_date"], errors="coerce")
visits["visit_date"] = pd.to_datetime(visits["visit_date"], errors="coerce")
recordings["session_date"] = pd.to_datetime(recordings["session_date"], errors="coerce")
edu["record_date"] = pd.to_datetime(edu["record_date"], errors="coerce")
health["record_date"] = pd.to_datetime(health["record_date"], errors="coerce")

max_incident = incidents["incident_date"].max()
cutoff = max_incident - pd.Timedelta(days=30)
label_end = cutoff + pd.Timedelta(days=30)
print("Cutoff:", cutoff.date(), "Label end:", label_end.date())

# Label: any incident in next 30 days
future_inc = incidents[(incidents["incident_date"] > cutoff) & (incidents["incident_date"] <= label_end)]
y = (future_inc.groupby("resident_id")["incident_id"].count() > 0).astype(int).rename("incident_next_30d").reset_index()

past_inc = incidents[incidents["incident_date"] <= cutoff].copy()
past_vis = visits[visits["visit_date"] <= cutoff].copy()
past_rec = recordings[recordings["session_date"] <= cutoff].copy()
past_edu = edu[edu["record_date"] <= cutoff].copy()
past_h = health[health["record_date"] <= cutoff].copy()

base = residents[["resident_id","safehouse_id","case_status","case_category","is_pwd","family_is_4ps","family_solo_parent","family_indigenous","reintegration_status"]].copy()
for b in ["is_pwd","family_is_4ps","family_solo_parent","family_indigenous"]:
    base[b] = base[b].astype(int)

# Incident history features
inc_90 = past_inc[past_inc["incident_date"] >= (cutoff - pd.Timedelta(days=90))]
inc_feat = inc_90.groupby("resident_id").agg(
    incidents_90d=("incident_id","count"),
    high_sev_90d=("severity", lambda s: int((s == "High").sum()))
).reset_index()

# Home visit follow-up features
vis_90 = past_vis[past_vis["visit_date"] >= (cutoff - pd.Timedelta(days=90))]
vis_feat = vis_90.groupby("resident_id").agg(
    visits_90d=("visitation_id","count"),
    followups_90d=("follow_up_needed", lambda s: int((s == True).sum()))
).reset_index()

# Process recording volume features
rec_30 = past_rec[past_rec["session_date"] >= (cutoff - pd.Timedelta(days=30))]
rec_feat = rec_30.groupby("resident_id").agg(
    recordings_30d=("recording_id","count"),
    concerns_flagged_30d=("concerns_flagged", lambda s: int((s == True).sum()))
).reset_index()

def last_by_res(df, date_col, value_cols):
    df2 = df.dropna(subset=[date_col]).sort_values(["resident_id", date_col]).copy()
    last = df2.groupby("resident_id").tail(1)
    return last[["resident_id"] + value_cols]

edu_last = last_by_res(past_edu, "record_date", ["attendance_rate","progress_percent","completion_status","enrollment_status"])
h_last = last_by_res(past_h, "record_date", ["general_health_score","nutrition_score","sleep_quality_score","energy_level_score"])

df = base.merge(inc_feat, on="resident_id", how="left") \\\n+        .merge(vis_feat, on="resident_id", how="left") \\\n+        .merge(rec_feat, on="resident_id", how="left") \\\n+        .merge(edu_last, on="resident_id", how="left") \\\n+        .merge(h_last, on="resident_id", how="left") \\\n+        .merge(y, on="resident_id", how="left")

df["incident_next_30d"] = df["incident_next_30d"].fillna(0).astype(int)
for c in ["incidents_90d","high_sev_90d","visits_90d","followups_90d","recordings_30d","concerns_flagged_30d"]:
    df[c] = df[c].fillna(0)
for c in ["attendance_rate","progress_percent","general_health_score","nutrition_score","sleep_quality_score","energy_level_score"]:
    df[c] = pd.to_numeric(df[c], errors="coerce").fillna(df[c].median() if df[c].notna().any() else 0)

print("Rows:", len(df), "Pos rate:", df["incident_next_30d"].mean())
df.head()
""",
    r"""
target = "incident_next_30d"
features = [
    "safehouse_id","case_status","case_category",
    "is_pwd","family_is_4ps","family_solo_parent","family_indigenous",
    "incidents_90d","high_sev_90d","visits_90d","followups_90d","recordings_30d","concerns_flagged_30d",
    "attendance_rate","progress_percent","completion_status","enrollment_status",
    "general_health_score","nutrition_score","sleep_quality_score","energy_level_score"
]

X = df[features].copy()
y = df[target].copy()

cat_cols = ["case_status","case_category","completion_status","enrollment_status"]
num_cols = [c for c in features if c not in cat_cols and c != "safehouse_id"] + ["safehouse_id"]

pre = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ("num", "passthrough", num_cols),
    ]
)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
""",
    r"""
gb = Pipeline(steps=[("pre", pre), ("model", GradientBoostingClassifier(random_state=42))])
gb.fit(X_train, y_train)
proba = gb.predict_proba(X_test)[:,1]
pred = (proba >= 0.5).astype(int)
print("Predictive (GB):", eval_classification(y_test, pred, proba))

lr = Pipeline(steps=[("pre", pre), ("model", LogisticRegression(max_iter=2500))])
lr.fit(X_train, y_train)
proba2 = lr.predict_proba(X_test)[:,1]
pred2 = (proba2 >= 0.5).astype(int)
print("Explanatory (LogReg):", eval_classification(y_test, pred2, proba2))
""",
    r"""
# Score all residents
df_out = df[["resident_id"] + features].copy()
df_out["risk_score"] = gb.predict_proba(df_out[features])[:,1]
df_out["risk_band"] = pd.qcut(df_out["risk_score"], q=4, labels=["Low","Medium","High","Very High"])

export_predictions_json(
    prediction_type="resident_incident_30d",
    entity_type="Resident",
    df_out=df_out[["resident_id","risk_score","risk_band","safehouse_id","incidents_90d","followups_90d","recordings_30d","progress_percent","general_health_score"]].rename(columns={"risk_score":"score"}),
    id_col="resident_id",
    score_col="score",
    label_col="risk_band"
)

# Optional: readiness analysis (not exported; still useful for write-up)
df["ready"] = (df["reintegration_status"] == "Completed").astype(int)
print("Ready rate:", df["ready"].mean())
""",
]


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "ml-pipelines"
    out_dir.mkdir(parents=True, exist_ok=True)

    specs: list[NotebookSpec] = [
        NotebookSpec(
            filename="donor-lapse-risk.ipynb",
            title="Pipeline 1 — Donor Lapse Risk (Churn) Predictor",
            crispdm_business="Goal: identify supporters likely to stop giving soon so leadership can intervene with targeted outreach.",
            crispdm_data="Use supporters + donation history up to a cutoff date; label donation activity in the next 90 days.",
            crispdm_prep="Aggregate donation history to supporter-level features (RFM + mix features).",
            crispdm_model="Predictive: Gradient Boosting. Explanatory: Logistic Regression for interpretability.",
            crispdm_eval="Use ROC-AUC/F1 to handle imbalance. Discuss cost of false positives/negatives for fundraising operations.",
            crispdm_deploy="Export risk scores, import into `/api/ml/import`, display in `/app/ml` and (later) Donors page.",
            code_cells=PIPELINE_1,
        ),
        NotebookSpec(
            filename="donor-upgrade-propensity.ipynb",
            title="Pipeline 2 — Donor Upgrade Propensity (Next Ask Amount)",
            crispdm_business="Goal: predict next donation amount to personalize fundraising asks and increase donation growth.",
            crispdm_data="Use monetary donations per supporter in sequence; predict the next donation amount within 180 days.",
            crispdm_prep="Build per-donation training rows with history features; time-based split to avoid leakage.",
            crispdm_model="Predictive: Gradient Boosting Regressor. Explanatory: Linear Regression (log-scale).",
            crispdm_eval="Evaluate MAE/RMSE and discuss over/under-asking consequences for donors.",
            crispdm_deploy="Export predicted next amount and ask tier per supporter; import into `/api/ml/import`.",
            code_cells=PIPELINE_2,
        ),
        NotebookSpec(
            filename="next-best-campaign.ipynb",
            title="Pipeline 3 — Next Best Channel Predictor",
            crispdm_business="Goal: recommend the next most likely donation channel to improve outreach efficiency.",
            crispdm_data="Use donation sequences per supporter; label next donation channel within 365 days.",
            crispdm_prep="Create per-donation rows with recency and metadata; bucket rare classes into 'Other'.",
            crispdm_model="Predictive: Gradient Boosting (multiclass). Explanatory: Multinomial Logistic Regression.",
            crispdm_eval="Accuracy + discussion of class imbalance and implications for campaign strategy.",
            crispdm_deploy="Export predicted channel + confidence per supporter; import and view in `/app/ml`.",
            code_cells=PIPELINE_3,
        ),
        NotebookSpec(
            filename="social-post-donation-referrals.ipynb",
            title="Pipeline 4 — Social Post → Donation Value Predictor",
            crispdm_business="Goal: help leaders post strategically by predicting expected donation value from post characteristics.",
            crispdm_data="Use social_media_posts table. Target is estimated_donation_value_php.",
            crispdm_prep="Separate actionable pre-post features from post-performance engagement features (explanatory).",
            crispdm_model="Predictive: Gradient Boosting Regressor (pre-post features). Explanatory: Linear Regression with engagement metrics.",
            crispdm_eval="Evaluate MAE/RMSE; discuss what is controllable vs observed after posting.",
            crispdm_deploy="Export expected donation value per post; use results to guide posting guidelines.",
            code_cells=PIPELINE_4,
        ),
        NotebookSpec(
            filename="safehouse-capacity-forecast.ipynb",
            title="Pipeline 5 — Safehouse Incident Forecast (Next Month)",
            crispdm_business="Goal: forecast next-month incident risk to proactively allocate resources and staffing.",
            crispdm_data="Use safehouse_monthly_metrics time series per safehouse.",
            crispdm_prep="Create lag/rolling features and time-based split.",
            crispdm_model="Predictive: Random Forest Regressor. Explanatory: Linear Regression.",
            crispdm_eval="Evaluate forecast error and discuss operational consequences of underestimating risk.",
            crispdm_deploy="Export predicted incident forecast and risk band per safehouse; import into `/api/ml/import`.",
            code_cells=PIPELINE_5,
        ),
        NotebookSpec(
            filename="resident-risk-and-readiness.ipynb",
            title="Pipeline 6 — Resident Incident Risk (Next 30 Days)",
            crispdm_business="Goal: flag residents at higher incident risk so staff can intervene earlier.",
            crispdm_data="Join resident master data with incident reports, home visits, process recordings, education and health records.",
            crispdm_prep="Define cutoff date and compute recent-history features (30/90 days) with latest monthly records.",
            crispdm_model="Predictive: Gradient Boosting Classifier. Explanatory: Logistic Regression.",
            crispdm_eval="ROC-AUC/F1 and discuss false positives/negatives in a sensitive setting.",
            crispdm_deploy="Export resident risk scores and bands; import into `/api/ml/import` and view in `/app/ml`.",
            code_cells=PIPELINE_6,
        ),
    ]

    for spec in specs:
        nb = build_notebook(spec)
        (out_dir / spec.filename).write_text(json.dumps(nb, indent=2), encoding="utf-8")

    print("Generated:", [s.filename for s in specs])


if __name__ == "__main__":
    main()
