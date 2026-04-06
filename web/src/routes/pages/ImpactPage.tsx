import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { KeyValueGrid } from "../../components/ui/KeyValueGrid";

type Snapshot = {
  snapshotId: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  metricPayloadJson: string;
};

export function ImpactPage() {
  const [items, setItems] = useState<Snapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<Snapshot[]>("/api/public/impact-snapshots");
        setItems(data);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Impact Dashboard (Public)</h1>
      <p className="muted">
        This page is intentionally anonymized and aggregated to protect residents, staff, and partners. It highlights
        trends and outcomes—not individuals.
      </p>

      {error ? (
        <div className="badge danger" style={{ marginTop: 10 }}>
          {error}
        </div>
      ) : null}

      {items.length === 0 && !error ? <div className="muted">No published snapshots yet.</div> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.map((x) => (
          <div key={x.snapshotId} className="card" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {x.snapshotDate}
            </div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{x.headline}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {x.summaryText}
            </div>
            {(() => {
              try {
                const obj = JSON.parse(x.metricPayloadJson) as Record<string, unknown>;
                const rows = Object.entries(obj)
                  .slice(0, 12)
                  .map(([k, v]) => ({ key: k, value: typeof v === "number" ? v.toLocaleString() : String(v) }));
                return rows.length ? <KeyValueGrid items={rows} /> : null;
              } catch {
                return (
                  <details style={{ marginTop: 10 }}>
                    <summary className="muted">Metrics (JSON)</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{x.metricPayloadJson}</pre>
                  </details>
                );
              }
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
