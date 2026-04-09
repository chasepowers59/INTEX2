# ML Pipelines (IS455)

These notebooks are complete, generated ML pipelines.

They are also the grading-visible ML artifacts for the project. The nightly automation executes these committed notebooks headlessly; it does not remove or replace them.

- **Default:** place the provided CSVs under repo `data/raw/` and run top-to-bottom.
- **Database-backed:** set **`INTEX_ODBC`** to an ODBC connection string pointing at the INTEX SQL database (same data as after Lighthouse import). Install **`pyodbc`**. Regenerated notebooks use `load_df()` which reads from SQL when `INTEX_ODBC` is set, otherwise from CSV.

Regenerate notebook boilerplate from repo root:

```bash
python scripts/ml/generate_is455_notebooks.py
```

Pipelines:
- `donor-lapse-risk.ipynb` - Donor Lapse Risk Predictor
- `donor-upgrade-propensity.ipynb` - Donor Upgrade Propensity / Ask Amount Predictor
- `next-best-campaign.ipynb` - Next Best Channel Predictor
- `social-post-donation-referrals.ipynb` - Social Post Donation Value Predictor
- `safehouse-capacity-forecast.ipynb` - Safehouse Capacity and Incident Forecast
- `resident-risk-and-readiness.ipynb` - Resident Risk and Reintegration Readiness Predictor
- `donation-allocation-efficiency.ipynb` - Donation Allocation Efficiency Predictor

Notes:
- Each notebook exports app-compatible JSON to `output/ml-predictions/`.
- The resident incident-risk model uses a 180-day training horizon because the raw dataset has too few incidents in a 30-day holdout window for a stable classifier. The export still uses `resident_incident_30d` so the current app endpoint can display it, and the payload records the training horizon.
- The nightly GitHub Actions workflow at `.github/workflows/nightly-ml-predictions.yml` runs these notebooks, refreshes the prediction JSON files, and imports the results into `dbo.MlPredictions`.
