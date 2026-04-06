# ML Pipelines (IS455)

These notebooks are complete, generated ML pipelines. Place the provided CSVs under `data/raw/` and run notebooks top-to-bottom.

To regenerate them after editing the pipeline source, run:

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

Notes:
- Each notebook exports app-compatible JSON to `output/ml-predictions/`.
- The resident incident-risk model uses a 180-day training horizon because the raw dataset has too few incidents in a 30-day holdout window for a stable classifier. The export still uses `resident_incident_30d` so the current app endpoint can display it, and the payload records the training horizon.
