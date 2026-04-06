#!/usr/bin/env python3
"""
Scaffold 6 IS455 ML pipeline notebooks into ./ml-pipelines/.

This script uses only the Python standard library so it can run without network access.
The notebooks themselves assume common DS packages (pandas, numpy, scikit-learn, statsmodels)
will be installed in the environment where the TA/team executes them.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PipelineSpec:
    filename: str
    title: str
    business_question: str
    who_cares: str
    why_it_matters: str
    prediction_target: str
    modeling_notes: str
    deployment_notes: str


def nb_cell_markdown(text: str) -> dict[str, Any]:
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip() + "\n"}


def nb_cell_code(code: str) -> dict[str, Any]:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": code.strip() + "\n",
    }


COMMON_SETUP = r"""
# Standard imports
import os
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, roc_auc_score,
    mean_absolute_error, mean_squared_error, r2_score
)
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor

try:
    import statsmodels.api as sm
except Exception as e:
    sm = None
    print("statsmodels not available (optional for causal model). You can `pip install statsmodels` if needed.")


REPO_ROOT = Path("..").resolve() if Path("data").exists() is False else Path(".").resolve()
DATA_DIR = (REPO_ROOT / "data" / "raw").resolve()

print("Repo root:", REPO_ROOT)
print("Data dir:", DATA_DIR)
"""


COMMON_DATA_LOAD = r"""
def require_csv(name: str) -> pd.DataFrame:
    path = DATA_DIR / f"{name}.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Place the provided INTEX CSVs under data/raw/ (e.g., data/raw/{name}.csv)."
        )
    return pd.read_csv(path)


# Load only what you need for this pipeline (add more tables as needed)
supporters = None
donations = None
social_media_posts = None
residents = None
education_records = None
health_wellbeing_records = None
incident_reports = None
safehouse_monthly_metrics = None

available = [p.stem for p in DATA_DIR.glob("*.csv")] if DATA_DIR.exists() else []
print("Available CSVs:", sorted(available)[:10], "..." if len(available) > 10 else "")
"""


COMMON_EVAL_SNIPPETS = r"""
def eval_classification(y_true, y_pred, y_proba=None):
    acc = accuracy_score(y_true, y_pred)
    pr, rc, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    out = {"accuracy": acc, "precision": pr, "recall": rc, "f1": f1}
    if y_proba is not None:
        try:
            out["roc_auc"] = roc_auc_score(y_true, y_proba)
        except Exception:
            pass
    return out


def eval_regression(y_true, y_pred):
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(mean_squared_error(y_true, y_pred, squared=False)),
        "r2": float(r2_score(y_true, y_pred)),
    }


def export_predictions_json(
    prediction_type: str,
    entity_type: str,
    entity_ids: pd.Series,
    scores: pd.Series,
    labels: pd.Series | None = None,
    payload_json: pd.Series | None = None,
    out_dir: Path | None = None,
):
    out_dir = out_dir or (REPO_ROOT / "output" / "ml-predictions")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{prediction_type}.json"

    rows = []
    for i in range(len(entity_ids)):
        rows.append(
            {
                "predictionType": prediction_type,
                "entityType": entity_type,
                "entityId": int(entity_ids.iloc[i]),
                "score": float(scores.iloc[i]),
                "label": None if labels is None else (None if pd.isna(labels.iloc[i]) else str(labels.iloc[i])),
                "payloadJson": None
                if payload_json is None
                else (None if pd.isna(payload_json.iloc[i]) else str(payload_json.iloc[i])),
            }
        )

    out_path.write_text(pd.Series(rows).to_json(orient="values", indent=2), encoding="utf-8")
    print("Wrote predictions:", out_path)
"""


def notebook_for(spec: PipelineSpec) -> dict[str, Any]:
    now = datetime.utcnow().isoformat() + "Z"

    md_intro = f"""
# {spec.title}

**Created:** {now}

This notebook is one complete ML pipeline for INTEX (IS455). It is written so a TA can run it top-to-bottom.

## Required sections included
1. Problem Framing
2. Data Acquisition, Preparation & Exploration
3. Modeling & Feature Selection
4. Evaluation & Interpretation
5. Causal and Relationship Analysis
6. Deployment Notes
"""

    md_problem = f"""
## 1) Problem Framing

**Business question:** {spec.business_question}

**Who cares:** {spec.who_cares}

**Why it matters:** {spec.why_it_matters}

**Prediction target:** {spec.prediction_target}

We will build:
- A **predictive model** optimized for out-of-sample performance (operational decision support).
- A **causal/explanatory model** optimized for interpretability to understand relationships (not causal proof unless assumptions hold).
"""

    md_data = r"""
## 2) Data Acquisition, Preparation & Exploration

Expected dataset location:
- Place CSVs under `data/raw/*.csv` (not committed with secrets).

This notebook is designed to be reproducible:
- All feature engineering is code-driven (no manual spreadsheet steps).
- All joins are documented in code.
"""

    md_modeling = f"""
## 3) Modeling & Feature Selection

Modeling approach notes:
{spec.modeling_notes}

We will implement at least:
- **Predictive**: Tree/ensemble (captures nonlinearities, interactions)
- **Explanatory**: Linear/Logistic regression with interpretable coefficients
"""

    md_eval = r"""
## 4) Evaluation & Interpretation

We evaluate using metrics appropriate to the problem type.
- Classification: accuracy, precision, recall, F1, ROC-AUC (when possible)
- Regression: MAE, RMSE, R²

We interpret results in business terms (what to do next) and highlight cost of errors.
"""

    md_causal = r"""
## 5) Causal and Relationship Analysis

We do **not** claim causality from predictive performance.

For explanatory modeling, we discuss:
- Which features appear most important
- Whether relationships make theoretical sense
- Where confounding / selection bias / leakage could exist
"""

    md_deploy = f"""
## 6) Deployment Notes

{spec.deployment_notes}

### Import into the deployed app (Admin-only)

After exporting predictions JSON, import into the API:
- Endpoint: `POST /api/ml/import?replace=true`
- Body: the JSON array written by `export_predictions_json(...)`

Then view results in the web app:
- Staff portal → **ML Insights** (`/app/ml`)
"""

    cells = [
        nb_cell_markdown(md_intro),
        nb_cell_markdown(md_problem),
        nb_cell_markdown(md_data),
        nb_cell_code(COMMON_SETUP),
        nb_cell_code(COMMON_DATA_LOAD),
        nb_cell_code(COMMON_EVAL_SNIPPETS),
        nb_cell_markdown(md_modeling),
        nb_cell_code(
            r"""
# TODO: Load the required tables for this pipeline.
# Example:
# donations = require_csv("donations")
# supporters = require_csv("supporters")
"""
        ),
        nb_cell_code(
            r"""
# TODO: Define an "as-of" date for labeling to avoid leakage.
# Use only information that would have been known at that time.
AS_OF_DATE = None  # e.g., pd.Timestamp("2026-03-01")
"""
        ),
        nb_cell_code(
            r"""
# TODO: Build a modeling dataframe at the correct grain (supporter / resident / safehouse / post).
# - Define the unit of analysis
# - Build features using only past data relative to AS_OF_DATE
# - Create label/target
df = None
"""
        ),
        nb_cell_code(
            r"""
# TODO: Basic EDA checks (distributions, missingness, leakage checks)
"""
        ),
        nb_cell_code(
            r"""
# TODO: Split data and build predictive model pipeline
# - Choose numeric/categorical features
# - Use ColumnTransformer for one-hot encoding
# - Fit and evaluate
"""
        ),
        nb_cell_code(
            r"""
# TODO: Fit explanatory model
# - Prefer logistic/linear regression
# - Discuss coefficients / feature importances
"""
        ),
        nb_cell_markdown(md_eval),
        nb_cell_code(
            r"""
# TODO: Evaluate and interpret results in business terms.
"""
        ),
        nb_cell_markdown(md_causal),
        nb_cell_code(
            r"""
# TODO: Relationship analysis and limitations.
"""
        ),
        nb_cell_markdown(md_deploy),
        nb_cell_code(
            r"""
# TODO: Export predictions for app integration (example).
# Replace entity_ids/scores with your real outputs.
#
# export_predictions_json(
#     prediction_type="donor_lapse_90d",
#     entity_type="Supporter",
#     entity_ids=df["supporter_id"],
#     scores=df["risk_score"],
#     labels=df.get("risk_band"),
#     payload_json=df.get("explanations_json"),
# )
"""
        ),
    ]

    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.x"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


SPECS: list[PipelineSpec] = [
    PipelineSpec(
        filename="donor-lapse-risk.ipynb",
        title="Pipeline 1 — Donor Lapse Risk (Churn) Predictor",
        business_question="Which supporters are most likely to lapse (stop giving) in the next 90 days?",
        who_cares="Admin leadership and fundraising staff.",
        why_it_matters="Retention is cheaper than acquisition; early outreach can prevent lapses and stabilize funding.",
        prediction_target="Binary label: lapsed_in_next_90d at supporter level (RFM + campaign/channel features).",
        modeling_notes="Use supporter-level RFM features and donation mix features. Predictive model: Gradient Boosting / Random Forest. Explanatory model: Logistic regression to interpret drivers (recency, recurring, acquisition channel).",
        deployment_notes="Deploy as a nightly batch score producing `supporter_id`, `risk_score`, `risk_band`. Surface in Admin Dashboard and Donors page as an outreach priority list. Add an API endpoint like `GET /api/ml/donor-lapse` returning top risk donors.",
    ),
    PipelineSpec(
        filename="donor-upgrade-propensity.ipynb",
        title="Pipeline 2 — Donor Upgrade Propensity (Ask Amount) Predictor",
        business_question="Which supporters are likely to increase their giving amount if asked (and by how much)?",
        who_cares="Admin leadership and fundraising outreach.",
        why_it_matters="Helps tailor asks (right donor, right time, right amount) without a full marketing team.",
        prediction_target="Regression: predicted_next_donation_amount (conditional on next donation) or classification: upgrade_next_donation (>= X% increase).",
        modeling_notes="Engineer features from donation history (trend in amounts, campaign preferences, recurring status). Predictive model: GradientBoostingRegressor / RandomForestRegressor. Explanatory: Linear regression on log(amount) with clear coefficient interpretation.",
        deployment_notes="Use score to recommend an ask tier (e.g., +10%, +25%, +50%) and prioritize outreach. Integrate into Donors & Contributions page as 'Suggested Ask' and into donor comms planning.",
    ),
    PipelineSpec(
        filename="next-best-campaign.ipynb",
        title="Pipeline 3 — Next-Best Campaign / Channel Predictor",
        business_question="What campaign or channel is most likely to trigger a donation from each supporter next?",
        who_cares="Admin leadership and outreach planning.",
        why_it_matters="Improves campaign efficiency by focusing on what actually converts to donations, not vanity metrics.",
        prediction_target="Multi-class: next_donation_channel_source or next_campaign_name at supporter level.",
        modeling_notes="Create sequences of donations per supporter; label as the channel/campaign of the next donation. Predictive model: multinomial logistic regression or GradientBoostingClassifier (one-vs-rest). Explanatory: multinomial logistic regression coefficients by class for interpretability.",
        deployment_notes="Expose as 'Recommended channel/campaign' per supporter and as aggregate guidance ('best times/channels'). Pair with social media analytics to align posting strategy with expected donor conversions.",
    ),
    PipelineSpec(
        filename="social-post-donation-referrals.ipynb",
        title="Pipeline 4 — Social Media Post → Donation Referrals Predictor",
        business_question="Which social post characteristics drive donation referrals and higher donation value?",
        who_cares="Admin leadership and outreach/content planning.",
        why_it_matters="Social media is the primary channel; this prevents random posting and supports ROI-based strategy.",
        prediction_target="Regression: donation_referrals or estimated_donation_value_php at post level.",
        modeling_notes="Use post metadata (platform, post_type, media_type, hour/day, CTA, hashtags, sentiment, boosted budget). Predictive: GradientBoostingRegressor. Explanatory: linear regression (or statsmodels) to interpret effect of CTA/boosting controlling for platform/content topic.",
        deployment_notes="Deploy as recommendations for posting strategy (best post types, CTA usage, times). Integrate into Reports & Analytics as an 'Optimization' section and into a content calendar tool (future).",
    ),
    PipelineSpec(
        filename="safehouse-capacity-forecast.ipynb",
        title="Pipeline 5 — Safehouse Capacity / Incident Forecast",
        business_question="Which safehouses are likely to face capacity strain or incident spikes next month?",
        who_cares="Leadership operations and safety oversight.",
        why_it_matters="Prevents overload and safety failures by reallocating resources and planning staffing proactively.",
        prediction_target="Regression: next_month_active_residents and/or next_month_incident_count at safehouse-month level.",
        modeling_notes="Use safehouse_monthly_metrics with lag features (t-1, t-2) and trend features. Predictive: RandomForestRegressor/GradientBoostingRegressor. Explanatory: linear regression on incident_count vs load + education/health aggregates.",
        deployment_notes="Deploy as a monthly forecast feeding the Admin Dashboard: safehouses flagged for intervention. Add an endpoint `GET /api/ml/safehouse-forecast` returning risk/forecast bands.",
    ),
    PipelineSpec(
        filename="resident-risk-and-readiness.ipynb",
        title="Pipeline 6 — Resident Risk + Reintegration Readiness Predictor",
        business_question="Which residents are at risk of regression/incidents, and which may be ready for reintegration soon?",
        who_cares="Leadership and case management staff.",
        why_it_matters="Ensures girls don’t fall through the cracks; helps target interventions and plan reintegration safely.",
        prediction_target="Two targets (two models): (1) incident_risk_next_30d (classification) and (2) reintegration_readiness_score (regression or classification).",
        modeling_notes="Join resident-level features from education_records, health_wellbeing_records, incident_reports, home_visitations, process_recordings. Predictive: GradientBoostingClassifier/Regressor. Explanatory: logistic/linear regression with careful leakage prevention (only prior months).",
        deployment_notes="Deploy as a staff-facing triage list (top risk, top readiness) with explanations (top features). Integrate into Caseload Inventory sorting and a 'Needs attention' dashboard widget.",
    ),
]


def write_notebook(path: Path, nb: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(nb, indent=2), encoding="utf-8")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "ml-pipelines"
    out_dir.mkdir(parents=True, exist_ok=True)

    for spec in SPECS:
        nb = notebook_for(spec)
        write_notebook(out_dir / spec.filename, nb)

    readme = out_dir / "README.md"
    if not readme.exists():
        readme.write_text(
            "# ML Pipelines (IS455)\n\n"
            "These notebooks are scaffolded ML pipelines. Place the provided CSVs under `data/raw/` and run notebooks top-to-bottom.\n\n"
            "Pipelines:\n"
            + "\n".join([f"- `{s.filename}` — {s.title.split('—', 1)[-1].strip()}" for s in SPECS])
            + "\n",
            encoding="utf-8",
        )

    print(f"Wrote {len(SPECS)} notebooks to {out_dir}")


if __name__ == "__main__":
    main()
