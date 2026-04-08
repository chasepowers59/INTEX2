import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

const PIPELINE_GUIDE: Record<string, {
  title: string;
  prediction: string;
  explanation: string;
  operationalUse: string;
}> = {
  donor_lapse_90d: {
    title: "Donor lapse risk",
    prediction: "Predicts which donors are most likely to stop giving in the near term.",
    explanation: "Helps explain which patterns such as recency, cadence, and donor history are associated with lapse risk.",
    operationalUse: "Use in the Action Center to prioritize stewardship and recovery outreach."
  },
  donor_upgrade_next_amount: {
    title: "Donor upgrade next amount",
    prediction: "Predicts the next likely gift amount or ask level for a donor.",
    explanation: "Helps explain what donor characteristics are associated with larger future gifts.",
    operationalUse: "Use to guide tailored ask amounts instead of generic fundraising appeals."
  },
  next_channel_source: {
    title: "Next best channel",
    prediction: "Predicts which outreach channel is most likely to work for a donor.",
    explanation: "Helps explain which past campaign and acquisition patterns are associated with successful channels.",
    operationalUse: "Use with donor upgrade guidance to choose both the ask and the contact method."
  },
  post_donation_value: {
    title: "Social post donation value",
    prediction: "Predicts the expected donation value of a social post before you spend more on it.",
    explanation: "Helps explain which content topics, platforms, and calls to action tend to convert better.",
    operationalUse: "Use in Social Strategy to choose what to post and what to boost."
  },
  safehouse_incident_next_month: {
    title: "Safehouse incident forecast",
    prediction: "Predicts next-month incident pressure at the safehouse level.",
    explanation: "Helps explain which site-level conditions are associated with future incident load.",
    operationalUse: "Use for staffing and capacity planning, not as a replacement for case judgment."
  },
  resident_incident_30d: {
    title: "Resident incident risk",
    prediction: "Predicts which residents are at higher near-term incident risk.",
    explanation: "Helps explain what patterns in recent activity and case context are associated with elevated risk.",
    operationalUse: "Use to escalate follow-up and safety planning earlier."
  },
  resident_reintegration_readiness: {
    title: "Resident reintegration readiness",
    prediction: "Predicts which residents appear more ready for reintegration planning.",
    explanation: "Helps explain which progress signals are associated with readiness, without claiming causation.",
    operationalUse: "Use to support conference planning and reintegration discussions."
  }
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
  const [showImportHelp, setShowImportHelp] = useState<boolean>(false);

  const canAdminImport = useMemo(() => auth.hasRole("Admin"), [auth]);
  const selectedGuide = type ? PIPELINE_GUIDE[type] : null;

  const loadTypes = async () => {
    const token = auth.token ?? undefined;
    const discoveredTypes = await apiFetch<string[]>("/api/ml/types", { token });
    setTypes(discoveredTypes);
    if (!type && discoveredTypes.length > 0) {
      setType(discoveredTypes[0]);
    }
    const currentCoverage = await apiFetch<MlCoverage>("/api/ml/coverage", { token });
    setCoverage(currentCoverage);
  };

  const loadPreds = async (predictionType: string) => {
    const token = auth.token ?? undefined;
    const res = await apiFetch<MlPred[]>(`/api/ml/predictions?type=${encodeURIComponent(predictionType)}&take=100`, {
      token,
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
    <div className="admin-page">
      <div className="card">
        <div className="admin-header">
          <div className="admin-header-copy">
            <h1 style={{ marginTop: 0 }}>Prediction Admin</h1>
            <p className="muted">Prediction coverage, upload status, and latest rows.</p>
          </div>
          <div className="admin-toolbar">
            <Link className="btn" to="/app/action-center">Action Center</Link>
            <Link className="btn" to="/app/social-media">Social strategy</Link>
            <Link className="btn" to="/app/dashboard">Dashboard</Link>
          </div>
        </div>

        <div className="admin-kpi-grid" style={{ marginTop: 12 }}>
          <div className="card admin-kpi tone-aqua">
            <div className="muted">Prediction types</div>
            <div className="admin-kpi-value">{types.length}</div>
          </div>
          <div className="card admin-kpi tone-peach">
            <div className="muted">Rows in selected type</div>
            <div className="admin-kpi-value">{items.length}</div>
          </div>
          <div className="card admin-kpi tone-berry">
            <div className="muted">Expected pipelines loaded</div>
            <div className="admin-kpi-value">{coverage ? `${coverage.expectedPresent}/${coverage.expectedTotal}` : "-"}</div>
          </div>
        </div>

        {coverage ? (
          <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Coverage</div>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Prediction</th>
                    <th>Relationship view</th>
                    <th>Status</th>
                    <th>Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.expected.map((row) => {
                    const guide = PIPELINE_GUIDE[row.predictionType];
                    return (
                      <tr key={row.predictionType}>
                        <td data-label="Model">
                          <div style={{ fontWeight: 700 }}>{guide?.title ?? row.predictionType}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{row.predictionType}</div>
                        </td>
                        <td data-label="Prediction">{guide?.prediction ?? row.purpose}</td>
                        <td data-label="Relationship view">{guide?.explanation ?? "Relationship analysis available in the supporting notebook."}</td>
                        <td data-label="Status">
                          {row.present ? <span className="badge ok">Imported</span> : <span className="badge warn">Missing</span>}
                        </td>
                        <td data-label="Rows">{row.rowCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}

        <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 260, flex: 1 }}>
            <span className="muted">Model</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="" disabled>
                Select...
              </option>
              {types.map((discoveredType) => (
                <option key={discoveredType} value={discoveredType}>
                  {PIPELINE_GUIDE[discoveredType]?.title ?? discoveredType}
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
            onClick={() => setShowImportHelp((current) => !current)}
          >
            {showImportHelp ? "Hide upload help" : "Upload help"}
          </button>
        </div>

        {showImportHelp ? (
          <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Upload steps</div>
            <ol className="admin-plain-list muted" style={{ marginTop: 8 }}>
              <li>Export a prediction JSON file from the analytics workflow.</li>
              <li>Upload the file below to refresh the selected model rows.</li>
              <li>Use replace mode when publishing a new batch for the same model.</li>
            </ol>
          </div>
        ) : null}

        {selectedGuide ? (
          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <div className="card tone-aqua" style={{ boxShadow: "none", flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>{selectedGuide.title}: prediction</div>
              <div className="muted" style={{ marginTop: 6 }}>{selectedGuide.prediction}</div>
            </div>
            <div className="card tone-peach" style={{ boxShadow: "none", flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>{selectedGuide.title}: explanation</div>
              <div className="muted" style={{ marginTop: 6 }}>{selectedGuide.explanation}</div>
            </div>
            <div className="card tone-berry" style={{ boxShadow: "none", flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>Operational use</div>
              <div className="muted" style={{ marginTop: 6 }}>{selectedGuide.operationalUse}</div>
            </div>
          </div>
        ) : null}

        {canAdminImport ? (
          <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Upload prediction file</div>

            <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
              <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
                <span className="muted">Replace existing rows</span>
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
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Latest prediction rows</h2>
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
              {items.map((row) => (
                <tr key={row.predictionId}>
                  <td data-label="Entity" className="muted">
                    {row.entityType}:{row.entityId}
                  </td>
                  <td data-label="Score">{row.score.toFixed(4)}</td>
                  <td data-label="Label" className="muted">
                    {row.label ?? "-"}
                  </td>
                  <td data-label="Created (UTC)" className="muted">
                    {row.createdAtUtc}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No rows available for this model.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <div className="card" style={{ boxShadow: "none", flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>Payload highlights</div>
            {items[0]?.payloadJson ? (
              (() => {
                try {
                  const payload = JSON.parse(items[0].payloadJson) as Record<string, unknown>;
                  const entries = Object.entries(payload).slice(0, 8);
                  return entries.length ? (
                    <ul className="muted mini-widget-list">
                      {entries.map(([key, value]) => (
                        <li key={key}>
                          {key.replaceAll("_", " ")}: {String(value)}
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
          <div className="card" style={{ boxShadow: "none", flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>Interpretation guardrail</div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Use these rows to support prioritization and planning. They should guide review, not replace staff judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
