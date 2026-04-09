from __future__ import annotations

import argparse
import json
from datetime import datetime, UTC
from pathlib import Path
from typing import Sequence

import pyodbc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Replace ML prediction batches directly in SQL Server.")
    parser.add_argument("--server")
    parser.add_argument("--database")
    parser.add_argument("--user")
    parser.add_argument("--password")
    parser.add_argument("--connection-string")
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--odbc-driver", default="ODBC Driver 17 for SQL Server")
    parser.add_argument("--expected-types", nargs="*")
    return parser.parse_args()


def build_connection_string(args: argparse.Namespace) -> str:
    if args.connection_string:
        return args.connection_string

    required = {
        "--server": args.server,
        "--database": args.database,
        "--user": args.user,
        "--password": args.password,
    }
    missing = [flag for flag, value in required.items() if not value]
    if missing:
        raise ValueError(f"Provide --connection-string or all of: {', '.join(required)}. Missing: {', '.join(missing)}.")

    return (
        f"Driver={{{args.odbc_driver}}};"
        f"Server=tcp:{args.server},1433;"
        f"Database={args.database};"
        f"Uid={args.user};"
        f"Pwd={args.password};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=120;"
    )


def load_batches(input_dir: Path, expected_types: Sequence[str] | None = None) -> list[tuple[str, list[dict]]]:
    batches: list[tuple[str, list[dict]]] = []
    normalized_expected = {value.strip() for value in (expected_types or []) if value and value.strip()}
    for path in sorted(input_dir.glob("*.json")):
        items = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(items, list):
            raise ValueError(f"{path.name} is not a JSON array.")
        if len(items) <= 1:
            raise ValueError(f"{path.name} has {len(items)} row(s); refusing to import smoke data.")
        prediction_types = sorted({str(item.get("predictionType", "")).strip() for item in items})
        if len(prediction_types) != 1 or not prediction_types[0]:
            raise ValueError(f"{path.name} must contain exactly one non-empty predictionType.")

        prediction_type = prediction_types[0]
        if normalized_expected and prediction_type not in normalized_expected:
            continue

        batches.append((prediction_type, items))

    if normalized_expected:
        found = {prediction_type for prediction_type, _ in batches}
        missing = sorted(normalized_expected - found)
        if missing:
            raise ValueError(f"Missing expected prediction export(s): {', '.join(missing)}")

    return batches


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    batches = load_batches(input_dir, expected_types=args.expected_types)
    if not batches:
        raise ValueError(f"No JSON batches found in {input_dir}.")

    cnx = pyodbc.connect(build_connection_string(args), timeout=120)
    try:
        cursor = cnx.cursor()
        for prediction_type, items in batches:
            print(f"Replacing {prediction_type} with {len(items)} row(s)...")
            cursor.execute("DELETE FROM dbo.MlPredictions WHERE PredictionType = ?", prediction_type)
            batch_created_at = datetime.now(UTC).replace(tzinfo=None)
            rows = [
                (
                    prediction_type,
                    str(item["entityType"]).strip(),
                    int(item["entityId"]),
                    float(item["score"]),
                    (None if item.get("label") in (None, "") else str(item["label"]).strip()),
                    ("{}" if item.get("payloadJson") in (None, "") else str(item["payloadJson"])),
                    batch_created_at,
                )
                for item in items
            ]
            cursor.fast_executemany = True
            cursor.executemany(
                """
                INSERT INTO dbo.MlPredictions
                    (PredictionType, EntityType, EntityId, Score, Label, PayloadJson, CreatedAtUtc)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
        cnx.commit()
    except Exception:
        cnx.rollback()
        raise
    finally:
        cnx.close()


if __name__ == "__main__":
    main()
