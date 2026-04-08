from __future__ import annotations

import argparse
import json
from pathlib import Path

import pyodbc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Replace ML prediction batches directly in SQL Server.")
    parser.add_argument("--server", required=True)
    parser.add_argument("--database", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--odbc-driver", default="ODBC Driver 17 for SQL Server")
    return parser.parse_args()


def build_connection_string(args: argparse.Namespace) -> str:
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


def load_batches(input_dir: Path) -> list[tuple[str, list[dict]]]:
    batches: list[tuple[str, list[dict]]] = []
    for path in sorted(input_dir.glob("*.json")):
        items = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(items, list):
            raise ValueError(f"{path.name} is not a JSON array.")
        if len(items) <= 1:
            raise ValueError(f"{path.name} has {len(items)} row(s); refusing to import smoke data.")
        prediction_types = sorted({str(item.get("predictionType", "")).strip() for item in items})
        if len(prediction_types) != 1 or not prediction_types[0]:
            raise ValueError(f"{path.name} must contain exactly one non-empty predictionType.")
        batches.append((prediction_types[0], items))
    return batches


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    batches = load_batches(input_dir)
    if not batches:
        raise ValueError(f"No JSON batches found in {input_dir}.")

    cnx = pyodbc.connect(build_connection_string(args), timeout=120)
    try:
        cursor = cnx.cursor()
        for prediction_type, items in batches:
            print(f"Replacing {prediction_type} with {len(items)} row(s)...")
            cursor.execute("DELETE FROM dbo.MlPredictions WHERE PredictionType = ?", prediction_type)
            rows = [
                (
                    prediction_type,
                    str(item["entityType"]).strip(),
                    int(item["entityId"]),
                    float(item["score"]),
                    (None if item.get("label") in (None, "") else str(item["label"]).strip()),
                    ("{}" if item.get("payloadJson") in (None, "") else str(item["payloadJson"])),
                )
                for item in items
            ]
            cursor.fast_executemany = True
            cursor.executemany(
                """
                INSERT INTO dbo.MlPredictions
                    (PredictionType, EntityType, EntityId, Score, Label, PayloadJson, CreatedAtUtc)
                VALUES
                    (?, ?, ?, ?, ?, ?, SYSUTCDATETIME())
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
