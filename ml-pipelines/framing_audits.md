## ML pipeline framing audits (v1)

This document audits each pipeline’s **problem framing** against the key questions needed to ensure the model supports correct business decisions.

### Pipeline 1 — `donor-lapse-risk.ipynb`
- **Decision & action**: Rank supporters for retention outreach; staff reviews highest-risk list first. (Avoid false negatives.)
- **Unit of prediction**: Supporter (`supporter_id`).
- **Target**: `lapsed_next_90d` derived from “no donation in the next 90 days after cutoff”.
- **Decision-time availability**: Features are aggregated from donation history **up to cutoff**; future window is used only for label.
- **Operational metric**: Recall@top10% (triage capacity proxy) + PR AUC as secondary.
- **Validation**: Currently uses a single holdout split; CV is used on the training portion for selection/tuning/ablation. (Next step: consider time-based splits if donor patterns drift strongly.)
- **Threshold/banding**: Exports risk score + quantile bands; operational policy should be “top X% gets reviewed”.
- **Key risks**: Capacity definition (10%) should be configurable; monitor base rate drift.

### Pipeline 2 — `donor-upgrade-propensity.ipynb`
- **Decision & action**: Suggest next ask amount tier; treat as guidance, not an automatic rule.
- **Unit of prediction**: Donation-event rows for training; export is per supporter (latest donation context).
- **Target**: `next_amount` = next monetary donation amount within 1–365 days.
- **Decision-time availability**: Uses features computed from history up to the current donation event.
- **Operational metric**: MAE (primary) + within-tolerance rate (relative).
- **Validation**: Time split on donation_date; CV on train portion; holdout touched once.
- **Key risks**: Leakage via repeated supporters across folds (mitigation: consider grouped CV by supporter when feasible).

### Pipeline 3 — `next-best-campaign.ipynb` (Next channel)
- **Decision & action**: Provide top-2 ranked channel recommendations for outreach testing.
- **Unit of prediction**: Donation-event rows for training; export is per supporter (latest context).
- **Target**: `next_channel` = next donation channel within 1–365 days.
- **Decision-time availability**: Features derived from current/past donation data only.
- **Operational metric**: Top-2 accuracy (primary) + accuracy (secondary).
- **Validation**: Time split; CV on train portion; holdout touched once.
- **Key risks**: Channel taxonomy drift (new channels); ensure unseen categories are handled (encoder uses `handle_unknown="ignore"`).

### Pipeline 4 — `social-post-donation-referrals.ipynb`
- **Decision & action**:
  - **Planning**: predict donation value using pre-post features (content/CTA/boost budget) before publishing.
  - **Learning**: post-hoc engagement model explains drivers after publishing.
- **Unit of prediction**: Social post (`post_id`).
- **Target**: `estimated_donation_value_php` (modeled on log1p, evaluated on original scale).
- **Decision-time availability**: Planning model explicitly excludes engagement features.
- **Operational metric**: MAE (PHP scale) + within-50% rate (secondary).
- **Validation**: Time split by created_at; CV on train portion; holdout touched once.
- **Key risks**: Ensure users don’t accidentally use engagement model for pre-post decisions (governance/UX).

### Pipeline 5 — `safehouse-capacity-forecast.ipynb`
- **Decision & action**: Planning guidance for next month incident/capacity pressure; communicate uncertainty.
- **Unit of prediction**: Safehouse-month rows; export per safehouse (latest month).
- **Targets**: `incident_next` and `active_residents_next` (next-month forecasts).
- **Decision-time availability**: Uses lag and rolling features; targets are future shifts.
- **Operational metric**: MAE (primary) + prediction intervals (P10/P90) for uncertainty.
- **Validation**: Time split by month_start; CV on train portion; holdout touched once.
- **Key risks**: Limited history per safehouse; intervals are residual-bootstrap (cheap heuristic).

### Pipeline 6 — `resident-risk-and-readiness.ipynb`
- **Decision & action**: Staff triage signal only; human review required; never automate sensitive decisions.
- **Unit of prediction**: Resident (`resident_id`).
- **Incident target**: Uses a future-window proxy due to low incident volume at 30d. Export is standardized to match horizon (`resident_incident_180d`).
- **Readiness target**: Derived from reintegration status.
- **Decision-time availability**: Features are from past windows only (90d incidents/visits, 30d recordings, latest edu/health).
- **Operational metric**: Recall@top10% + PR AUC secondary.
- **Validation**: CV on train portion; holdout touched once.
- **Key risks**: Governance + fairness; ensure access controls and staff training on interpretation; watch for base-rate drift and label definition changes.

