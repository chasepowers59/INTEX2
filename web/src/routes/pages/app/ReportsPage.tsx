import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { InlineBarChart } from "../../../components/ui/InlineBarChart";

type DonationsByMonth = { year: number; month: number; totalAmount: number; count: number };
type ResidentStatus = { status: string; count: number };
type SafehousePerf = { safehouseId: number; activeResidents: number; reintegratedResidents: number };
type ReintegrationRate = { total: number; reintegrated: number; rate: number };

type ImpactSnapshot = {
  snapshotId: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  metricPayloadJson: string;
  isPublished: boolean;
  publishedAt: string | null;
};
type AuditItem = {
  whenUtc: string;
  actor: string;
  action: string;
  area: string;
  target: string;
};

export function ReportsPage() {
  const auth = useAuth();
  const [donations, setDonations] = useState<DonationsByMonth[]>([]);
  const [statuses, setStatuses] = useState<ResidentStatus[]>([]);
  const [safehouses, setSafehouses] = useState<SafehousePerf[]>([]);
  const [reintegration, setReintegration] = useState<ReintegrationRate | null>(null);
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [snapDate, setSnapDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [snapHeadline, setSnapHeadline] = useState<string>("This month: progress and protection across safehouses");
  const [snapSummary, setSnapSummary] = useState<string>(
    "This snapshot is aggregated and anonymized to protect residents, staff, and partners."
  );
  const [snapMetrics, setSnapMetrics] = useState<string>("{}");
  const [snapPublish, setSnapPublish] = useState<boolean>(true);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch<DonationsByMonth[]>("/api/reports/donations-by-month?months=12", { token: auth.token ?? undefined });
        const s = await apiFetch<ResidentStatus[]>("/api/reports/resident-status", { token: auth.token ?? undefined });
        const sh = await apiFetch<SafehousePerf[]>("/api/reports/safehouse-performance", { token: auth.token ?? undefined });
        const rr = await apiFetch<ReintegrationRate>("/api/reports/reintegration-rate", { token: auth.token ?? undefined });
        setDonations(d);
        setStatuses(s);
        setSafehouses(sh);
        setReintegration(rr);

        if (auth.hasRole("Admin")) {
          const list = await apiFetch<{ items: ImpactSnapshot[] }>("/api/impact-snapshots", { token: auth.token ?? undefined });
          setSnapshots(list.items);
          const audit = await apiFetch<{ items: AuditItem[] }>("/api/reports/audit-activity?take=80", { token: auth.token ?? undefined });
          setAuditItems(audit.items);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Reports & Analytics</h1>
        <p className="muted">
          Aggregated insights and trends to support decisions: donations, resident operations, safehouse load, and public
          impact reporting.
        </p>
        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Donation trends (12 months)</h2>
        <div style={{ marginTop: 10 }}>
          <InlineBarChart
            data={[...donations]
              .slice(-6)
              .map((x) => ({ label: `${String(x.month).padStart(2, "0")}/${String(x.year).slice(-2)}`, value: x.count }))}
            valueFormatter={(v) => `${v}`}
          />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Count</th>
                <th>Total amount</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((x) => (
                <tr key={`${x.year}-${x.month}`}>
                  <td data-label="Month" className="muted">
                    {x.year}-{String(x.month).padStart(2, "0")}
                  </td>
                  <td data-label="Count">{x.count}</td>
                  <td data-label="Total amount">{x.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No donation data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Resident status</h2>
        <div className="row">
          {statuses.map((x) => (
            <div key={x.status} className="card" style={{ boxShadow: "none", flex: 1, minWidth: 200 }}>
              <div className="muted">{x.status}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{x.count}</div>
            </div>
          ))}
          {statuses.length === 0 ? <div className="muted">No resident data yet.</div> : null}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Safehouse performance</h2>
        <div style={{ marginTop: 10 }}>
          <InlineBarChart
            data={safehouses.map((x) => ({ label: `Safehouse ${x.safehouseId}`, value: x.activeResidents }))}
            valueFormatter={(v) => `${v}`}
          />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Safehouse ID</th>
                <th>Active residents</th>
                <th>Reintegrated</th>
              </tr>
            </thead>
            <tbody>
              {safehouses.map((x) => (
                <tr key={x.safehouseId}>
                  <td data-label="Safehouse ID" className="muted">
                    {x.safehouseId}
                  </td>
                  <td data-label="Active residents">{x.activeResidents}</td>
                  <td data-label="Reintegrated">{x.reintegratedResidents}</td>
                </tr>
              ))}
              {safehouses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No safehouse data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Reintegration success rate</h2>
        <div className="row">
          <div className="card" style={{ boxShadow: "none", flex: 1, minWidth: 240 }}>
            <div className="muted">Total residents</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{reintegration?.total ?? "—"}</div>
          </div>
          <div className="card" style={{ boxShadow: "none", flex: 1, minWidth: 240 }}>
            <div className="muted">Reintegrated</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{reintegration?.reintegrated ?? "—"}</div>
          </div>
          <div className="card" style={{ boxShadow: "none", flex: 1, minWidth: 240 }}>
            <div className="muted">Rate</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>
              {reintegration ? `${(reintegration.rate * 100).toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {auth.hasRole("Admin") ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Public impact snapshots (admin)</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Publish aggregated, anonymized snapshots to the public Impact page. Never include resident-level details.
          </p>
          <div className="badge ok">Privacy boundary: this tool outputs identity-stripped aggregate metrics only.</div>

          <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
              <span className="muted">Snapshot date</span>
              <input className="input" type="date" value={snapDate} onChange={(e) => setSnapDate(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 320 }}>
              <span className="muted">Headline</span>
              <input className="input" value={snapHeadline} onChange={(e) => setSnapHeadline(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
              <span className="muted">Publish now</span>
              <select className="input" value={snapPublish ? "yes" : "no"} onChange={(e) => setSnapPublish(e.target.value === "yes")}>
                <option value="yes">Yes</option>
                <option value="no">No (draft)</option>
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span className="muted">Summary</span>
            <textarea className="input" rows={3} value={snapSummary} onChange={(e) => setSnapSummary(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span className="muted">Metrics (JSON)</span>
            <textarea className="input" rows={5} value={snapMetrics} onChange={(e) => setSnapMetrics(e.target.value)} />
          </label>

          <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <button
              className="btn"
              onClick={() => {
                setSnapHeadline("Anonymized operations summary for donor stewardship");
                setSnapSummary(
                  "This snapshot intentionally excludes resident names, addresses, direct identifiers, and case-level narratives while summarizing outcomes at aggregate level."
                );
              }}
            >
              Use anonymized donor preset
            </button>
            <button
              className="btn"
              onClick={() => {
                setSnapHeadline("Anonymized executive safety and service snapshot");
                setSnapSummary(
                  "This report is prepared for governance review using aggregate trend indicators with strict privacy-safe language and no direct minor identifiers."
                );
              }}
            >
              Use anonymized board preset
            </button>
            <button
              className="btn"
              onClick={async () => {
                setError(null);
                try {
                  const overview = await apiFetch<any>("/api/analytics/overview", { token: auth.token ?? undefined });
                  const payload = {
                    asOfUtc: overview.asOfUtc,
                    activeResidents: overview.activeResidents,
                    checkInsDue30d: overview.checkInsDue30d,
                    processRecordings7d: overview.processRecordings7d,
                    donations30d: overview.donations30d,
                    reintegration,
                  };
                  setSnapMetrics(JSON.stringify(payload, null, 2));
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Generate metrics from live data
            </button>

            <button
              className="btn primary"
              onClick={async () => {
                setError(null);
                try {
                  await apiFetch<{ snapshotId: number }>("/api/impact-snapshots", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      snapshotDate: snapDate,
                      headline: snapHeadline,
                      summaryText: snapSummary,
                      metricPayloadJson: snapMetrics,
                      publish: snapPublish,
                    }),
                  });
                  const list = await apiFetch<{ items: ImpactSnapshot[] }>("/api/impact-snapshots", { token: auth.token ?? undefined });
                  setSnapshots(list.items);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Create snapshot
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Headline</th>
                  <th>Status</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.snapshotId}>
                    <td data-label="Date" className="muted">
                      {s.snapshotDate}
                    </td>
                    <td data-label="Headline" style={{ fontWeight: 700 }}>
                      {s.headline}
                    </td>
                    <td data-label="Status">
                      {s.isPublished ? <span className="badge ok">Published</span> : <span className="badge warn">Draft</span>}
                    </td>
                    <td data-label="Actions">
                      <div className="row">
                        <button
                          className="btn"
                          onClick={async () => {
                            setError(null);
                            try {
                              await apiFetch(`/api/impact-snapshots/${s.snapshotId}/publish`, {
                                method: "PUT",
                                token: auth.token ?? undefined,
                                body: JSON.stringify({ publish: !s.isPublished }),
                              });
                              const list = await apiFetch<{ items: ImpactSnapshot[] }>("/api/impact-snapshots", { token: auth.token ?? undefined });
                              setSnapshots(list.items);
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          {s.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {snapshots.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No snapshots created yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {auth.hasRole("Admin") ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Audit activity</h2>
          <p className="muted">Recent sensitive operations activity feed for accountability and privacy governance.</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Area</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {auditItems.map((x, idx) => (
                  <tr key={`${x.whenUtc}-${idx}`}>
                    <td data-label="When" className="muted">{new Date(x.whenUtc).toLocaleString()}</td>
                    <td data-label="Actor">{x.actor}</td>
                    <td data-label="Action">{x.action}</td>
                    <td data-label="Area" className="muted">{x.area}</td>
                    <td data-label="Target" className="muted">{x.target}</td>
                  </tr>
                ))}
                {auditItems.length === 0 ? (
                  <tr><td colSpan={5} className="muted">No recent audit activity rows.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
