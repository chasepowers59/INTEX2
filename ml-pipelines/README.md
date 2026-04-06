# ML Pipelines (IS455)

These notebooks are scaffolded ML pipelines.

- **Default:** place the provided CSVs under repo `data/raw/` and run top-to-bottom.
- **Database-backed:** set **`INTEX_ODBC`** to an ODBC connection string pointing at the INTEX SQL database (same data as after Lighthouse import). Install **`pyodbc`**. Regenerated notebooks use `load_df()` which reads from SQL when `INTEX_ODBC` is set, otherwise from CSV.

Regenerate notebook boilerplate from repo root:

```bash
python scripts/ml/generate_is455_notebooks.py
```

Pipelines:
- `donor-lapse-risk.ipynb` — Donor Lapse Risk (Churn) Predictor
- `donor-upgrade-propensity.ipynb` — Donor Upgrade Propensity (Ask Amount) Predictor
- `next-best-campaign.ipynb` — Next-Best Campaign / Channel Predictor
- `social-post-donation-referrals.ipynb` — Social Media Post → Donation Referrals Predictor
- `safehouse-capacity-forecast.ipynb` — Safehouse Capacity / Incident Forecast
- `resident-risk-and-readiness.ipynb` — Resident Risk + Reintegration Readiness Predictor
