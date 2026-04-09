from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


DEFAULT_NOTEBOOKS = [
    "donor-lapse-risk.ipynb",
    "donor-upgrade-propensity.ipynb",
    "next-best-campaign.ipynb",
    "social-post-donation-referrals.ipynb",
    "safehouse-capacity-forecast.ipynb",
    "resident-risk-and-readiness.ipynb",
]

DEFAULT_EXPORTS = [
    "donor_lapse_90d.json",
    "donor_upgrade_next_amount.json",
    "next_channel_source.json",
    "post_donation_value.json",
    "safehouse_incident_next_month.json",
    "resident_incident_30d.json",
    "resident_reintegration_readiness.json",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Execute committed ML notebooks and regenerate prediction exports.")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--timeout-sec", type=int, default=3600)
    parser.add_argument("--python-exe", default=sys.executable)
    parser.add_argument("--output-dir", default="tmp/executed-notebooks")
    parser.add_argument("--clean-exports", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    notebook_dir = repo_root / "ml-pipelines"
    export_dir = repo_root / "output" / "ml-predictions"
    executed_dir = (repo_root / args.output_dir).resolve()
    executed_dir.mkdir(parents=True, exist_ok=True)

    if args.clean_exports:
        for file_name in DEFAULT_EXPORTS:
            path = export_dir / file_name
            if path.exists():
                path.unlink()

    env = os.environ.copy()
    env.setdefault("MPLBACKEND", "Agg")

    for notebook_name in DEFAULT_NOTEBOOKS:
        notebook_path = notebook_dir / notebook_name
        if not notebook_path.exists():
            raise FileNotFoundError(f"Notebook not found: {notebook_path}")

        print(f"Executing {notebook_name}...")
        subprocess.run(
            [
                args.python_exe,
                "-m",
                "jupyter",
                "nbconvert",
                "--to",
                "notebook",
                "--execute",
                str(notebook_path),
                "--output-dir",
                str(executed_dir),
                f"--ExecutePreprocessor.timeout={args.timeout_sec}",
            ],
            check=True,
            cwd=repo_root,
            env=env,
        )

    missing = [file_name for file_name in DEFAULT_EXPORTS if not (export_dir / file_name).exists()]
    if missing:
        raise FileNotFoundError(f"Expected prediction export(s) were not generated: {', '.join(missing)}")

    print("Notebook execution complete. Prediction exports refreshed.")


if __name__ == "__main__":
    main()
