import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type MlPred = {
  predictionId: number;
  predictionType: string;
  entityType: string;
  entityId: number;
  score: number;
  label: string | null;
  payloadJson: string;
  createdAtUtc: string;
};

export function MlInsightsPage() {
  const auth = useAuth();
  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState<string>("");
  const [items, setItems] = useState<MlPred[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canAdminImport = useMemo(() => auth.hasRole("Admin"), [auth]);

  const loadTypes = async () => {
    const t = await apiFetch<string[]>("/api/ml/types", { token: auth.token ?? undefined });
    setTypes(t);
    if (!type && t.length > 0) setType(t[0]);
  };

  const loadPreds = async (predictionType: string) => {
    const res = await apiFetch<MlPred[]>(`/api/ml/predictions?type=${encodeURIComponent(predictionType)}&take=100`, {
      token: auth.token ?? undefined,
    });
    setItems(res);
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await loadTypes();
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  useEffect(() => {
    (async () => {
      if (!type) return;
      try {
        setError(null);
        await loadPreds(type);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [type]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>ML Insights</h1>
        <p className="muted">
          This page displays model outputs imported from the IS455 notebooks. Import is admin-only.
        </p>
        {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}

        <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 260, flex: 1 }}>
            <span className="muted">Prediction type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="" disabled>
                Select…
              </option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <button className="btn" onClick={() => void loadPreds(type)} disabled={!type}>
            Refresh
          </button>

          <button
            className="btn primary"
            disabled={!canAdminImport}
            onClick={async () => {
              alert(
                "Admin import is done from notebooks:\n\n" +
                  "1) Run a notebook to export JSON predictions.\n" +
                  "2) POST to /api/ml/import?replace=true with the JSON array as the body.\n\n" +
                  "See ml-pipelines/ and PROJECT_CONTEXT.md for details."
              );
            }}
          >
            How to import
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Predictions</h2>
          <div className="muted" style={{ fontSize: 12 }}>
            Showing {items.length} rows
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Score</th>
                <th>Label</th>
                <th>Created (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.predictionId}>
                  <td data-label="Entity" className="muted">
                    {x.entityType}:{x.entityId}
                  </td>
                  <td data-label="Score">{x.score.toFixed(4)}</td>
                  <td data-label="Label" className="muted">
                    {x.label ?? "—"}
                  </td>
                  <td data-label="Created (UTC)" className="muted">
                    {x.createdAtUtc}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No predictions imported yet for this type.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary className="muted">Payload JSON (first row)</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{items[0]?.payloadJson ?? "{}"}</pre>
        </details>
      </div>
    </div>
  );
}

