import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { Link } from "react-router-dom";

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

type MlCoverage = {
  expectedTotal: number;
  expectedPresent: number;
  expectedMissing: number;
  expected: {
    predictionType: string;
    entityType: string;
    purpose: string;
    present: boolean;
    rowCount: number;
    latestCreatedAtUtc: string | null;
  }[];
  additional: {
    predictionType: string;
    entityTypes: string[];
    rowCount: number;
    latestCreatedAtUtc: string | null;
  }[];
};

export function MlInsightsPage() {
  const auth = useAuth();
  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState<string>("");
  const [items, setItems] = useState<MlPred[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<MlCoverage | null>(null);
  const [importBusy, setImportBusy] = useState<boolean>(false);
  const [importReplace, setImportReplace] = useState<boolean>(true);

  const canAdminImport = useMemo(() => auth.hasRole("Admin"), [auth]);

  const loadTypes = async () => {
    const t = await apiFetch<string[]>("/api/ml/types", { token: auth.token ?? undefined });
    setTypes(t);
    if (!type && t.length > 0) setType(t[0]);
    const c = await apiFetch<MlCoverage>("/api/ml/coverage", { token: auth.token ?? undefined });
    setCoverage(c);
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
        <div className="staff-ml-grid" style={{ marginTop: 12 }}>
          <div className="card tone-aqua" style={{ boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Integration status</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              ML prediction types discovered: <strong>{types.length}</strong>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Loaded rows for selected type: <strong>{items.length}</strong></div>
            <div className="muted" style={{ fontSize: 13 }}>
              Expected pipelines loaded: <strong>{coverage ? `${coverage.expectedPresent}/${coverage.expectedTotal}` : "—"}</strong>
            </div>
          </div>
          <div className="card tone-berry" style={{ boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Who should use this</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Employees triage via Action Center; admins import/validate models; donors view anonymized impact only.
            </div>
          </div>
          <div className="card tone-peach" style={{ boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Operational links</div>
            <div className="row" style={{ marginTop: 8 }}>
              <Link className="btn" to="/app/action-center">Action Center</Link>
              <Link className="btn" to="/app/social-media">Social strategy</Link>
            </div>
          </div>
        </div>

        {coverage ? (
          <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Expected ML pipeline coverage</div>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Prediction type</th>
                    <th>Entity</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.expected.map((x) => (
                    <tr key={x.predictionType}>
                      <td data-label="Prediction type" className="muted">{x.predictionType}</td>
                      <td data-label="Entity">{x.entityType}</td>
                      <td data-label="Purpose">{x.purpose}</td>
                      <td data-label="Status">{x.present ? <span className="badge ok">Imported</span> : <span className="badge warn">Missing</span>}</td>
                      <td data-label="Rows">{x.rowCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        <div className="row" style={{ marginTop: 10 }}>
          <div className="card tone-peach" style={{ boxShadow: "none", flex: "1 1 230px" }}>
            <div style={{ fontWeight: 800 }}>Risk pipelines</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Resident incident risk and donor lapse detection guide proactive interventions.
            </div>
          </div>
          <div className="card tone-aqua" style={{ boxShadow: "none", flex: "1 1 230px" }}>
            <div style={{ fontWeight: 800 }}>Growth pipelines</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Donor upgrade and next-best campaign outputs improve outreach conversion.
            </div>
          </div>
          <div className="card tone-berry" style={{ boxShadow: "none", flex: "1 1 230px" }}>
            <div style={{ fontWeight: 800 }}>Social media pipelines</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Social post referral prediction helps prioritize content themes and channels.
            </div>
          </div>
        </div>
        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}

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

        {canAdminImport ? (
          <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Admin import (in-browser)</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Upload a JSON array exported by the notebooks. This sends it to <code>/api/ml/import</code>.
            </div>

            <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
              <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
                <span className="muted">Replace existing type</span>
                <select
                  className="input"
                  value={importReplace ? "yes" : "no"}
                  onChange={(e) => setImportReplace(e.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No (append)</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 260 }}>
                <span className="muted">JSON file</span>
                <input
                  className="input"
                  type="file"
                  accept="application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setError(null);
                    setImportBusy(true);
                    try {
                      const text = await file.text();
                      const parsed = JSON.parse(text);
                      if (!Array.isArray(parsed)) throw new Error("Import file must be a JSON array.");
                      if (parsed.length === 0) throw new Error("Import file is empty.");

                      const predictionType = String(parsed[0]?.predictionType ?? parsed[0]?.PredictionType ?? "").trim();
                      if (!predictionType) throw new Error("Missing PredictionType in the import payload.");

                      await apiFetch(`/api/ml/import?replace=${importReplace ? "true" : "false"}`, {
                        method: "POST",
                        token: auth.token ?? undefined,
                        body: JSON.stringify(
                          parsed.map((x: any) => ({
                            predictionType: x.predictionType ?? x.PredictionType,
                            entityType: x.entityType ?? x.EntityType,
                            entityId: x.entityId ?? x.EntityId,
                            score: x.score ?? x.Score,
                            label: x.label ?? x.Label ?? null,
                            payloadJson: x.payloadJson ?? x.PayloadJson ?? x.payload_json ?? null,
                          }))
                        ),
                      });

                      await loadTypes();
                      setType(predictionType);
                      await loadPreds(predictionType);
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      setImportBusy(false);
                      e.target.value = "";
                    }
                  }}
                  disabled={importBusy}
                />
              </label>

              <button className="btn" onClick={() => void loadPreds(type)} disabled={!type || importBusy}>
                {importBusy ? "Importing..." : "Reload type"}
              </button>
            </div>
          </div>
        ) : null}
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

        <div className="card" style={{ marginTop: 12, boxShadow: "none" }}>
          <div style={{ fontWeight: 800 }}>Payload highlights</div>
          {items[0]?.payloadJson ? (
            (() => {
              try {
                const payload = JSON.parse(items[0].payloadJson) as Record<string, unknown>;
                const entries = Object.entries(payload).slice(0, 8);
                return entries.length ? (
                  <ul className="muted mini-widget-list">
                    {entries.map(([k, v]) => (
                      <li key={k}>
                        {k.replaceAll("_", " ")}: {String(v)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted" style={{ marginTop: 8 }}>No payload attributes in first row.</div>
                );
              } catch {
                return <div className="muted" style={{ marginTop: 8 }}>Payload details are available after the next model export.</div>;
              }
            })()
          ) : (
            <div className="muted" style={{ marginTop: 8 }}>No payload details available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
