import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { InlineBarChart } from "../../../components/ui/InlineBarChart";
import { InlineLineChart } from "../../../components/ui/InlineLineChart";

type DonationsByMonth = { year: number; month: number; totalAmount: number; count: number };
type ResidentStatus = { status: string; count: number };
type SafehousePerf = { safehouseId: number; activeResidents: number; reintegratedResidents: number };
type ReintegrationRate = { total: number; reintegrated: number; rate: number };
type SafehouseForecast = {
  safehouseId: number;
  name: string;
  city: string | null;
  currentOccupancy: number | null;
  capacityGirls: number | null;
  predictedIncidentsNextMonth: number;
};

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

type AarSummary = {
  year: number;
  pillars: { pillar: string; metric: string; value: number }[];
};

export function ReportsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 8;
  const resetSnapshotForm = () => {
    setEditingSnapshotId(null);
    setSnapDate(new Date().toISOString().slice(0, 10));
    setSnapHeadline("This month: progress and protection across safehouses");
    setSnapSummary("This snapshot is aggregated and anonymized to protect residents, staff, and partners.");
    setSnapMetricActiveResidents(0);
    setSnapMetricDonations30d(0);
    setSnapMetricCheckinsDue30d(0);
    setSnapMetricProcess7d(0);
    setSnapMetricNarrative("Anonymized and aggregate-only metrics.");
    setSnapPublish(true);
    setShowSnapshotForm(false);
  };
  const parseMetricPayload = (raw: string) => {
    try {
      const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
      return {
        activeResidents: Number(parsed.activeResidents ?? 0) || 0,
        donations30d: Number(parsed.donations30d ?? 0) || 0,
        checkInsDue30d: Number(parsed.checkInsDue30d ?? 0) || 0,
        processRecordings7d: Number(parsed.processRecordings7d ?? 0) || 0,
        note: typeof parsed.note === "string" ? parsed.note : "",
      };
    } catch {
      return {
        activeResidents: 0,
        donations30d: 0,
        checkInsDue30d: 0,
        processRecordings7d: 0,
        note: "",
      };
    }
  };
  const [donations, setDonations] = useState<DonationsByMonth[]>([]);
  const [statuses, setStatuses] = useState<ResidentStatus[]>([]);
  const [safehouses, setSafehouses] = useState<SafehousePerf[]>([]);
  const [safehouseForecast, setSafehouseForecast] = useState<SafehouseForecast[]>([]);
  const [reintegration, setReintegration] = useState<ReintegrationRate | null>(null);
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [aar, setAar] = useState<AarSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [snapDate, setSnapDate] = useState(new Date().toISOString().slice(0, 10));
  const [snapHeadline, setSnapHeadline] = useState("This month: progress and protection across safehouses");
  const [snapSummary, setSnapSummary] = useState(
    "This snapshot is aggregated and anonymized to protect residents, staff, and partners.",
  );
  const [snapMetricActiveResidents, setSnapMetricActiveResidents] = useState(0);
  const [snapMetricDonations30d, setSnapMetricDonations30d] = useState(0);
  const [snapMetricCheckinsDue30d, setSnapMetricCheckinsDue30d] = useState(0);
  const [snapMetricProcess7d, setSnapMetricProcess7d] = useState(0);
  const [snapMetricNarrative, setSnapMetricNarrative] = useState("Anonymized and aggregate-only metrics.");
  const [snapPublish, setSnapPublish] = useState(true);
  const [snapshotsPage, setSnapshotsPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [editingSnapshotId, setEditingSnapshotId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch<DonationsByMonth[]>("/api/reports/donations-by-month?months=12", {
          token: auth.token ?? undefined,
        });
        const s = await apiFetch<ResidentStatus[]>("/api/reports/resident-status", {
          token: auth.token ?? undefined,
        });
        const sh = await apiFetch<SafehousePerf[]>("/api/reports/safehouse-performance", {
          token: auth.token ?? undefined,
        });
        const forecast = await apiFetch<SafehouseForecast[]>("/api/ml/safehouse-forecast/top?take=8", {
          token: auth.token ?? undefined,
        });
        const rr = await apiFetch<ReintegrationRate>("/api/reports/reintegration-rate", {
          token: auth.token ?? undefined,
        });
        setDonations(d);
        setStatuses(s);
        setSafehouses(sh);
        setSafehouseForecast(forecast);
        setReintegration(rr);

        if (auth.hasRole("Admin")) {
          const snapshotList = await apiFetch<{ items: ImpactSnapshot[] }>("/api/impact-snapshots", {
            token: auth.token ?? undefined,
          });
          setSnapshots(snapshotList.items);

          const audit = await apiFetch<{ items: AuditItem[] }>("/api/reports/audit-activity?take=80", {
            token: auth.token ?? undefined,
          });
          setAuditItems(audit.items);

          const aarRes = await apiFetch<AarSummary>("/api/reports/annual-accomplishment", {
            token: auth.token ?? undefined,
          });
          setAar(aarRes);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token, auth]);

  const latestDonationMonth = [...donations].sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))[0];
  const activeResidentsTotal = safehouses.reduce((sum, item) => sum + item.activeResidents, 0);
  const publishedSnapshots = snapshots.filter((item) => item.isPublished).length;
  const draftSnapshots = snapshots.filter((item) => !item.isPublished).length;
  const latestPublished = [...snapshots]
    .filter((item) => item.isPublished)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
  const snapshotTotalPages = Math.max(1, Math.ceil(snapshots.length / PAGE_SIZE));
  const auditTotalPages = Math.max(1, Math.ceil(auditItems.length / PAGE_SIZE));
  const snapshotRows = snapshots.slice((snapshotsPage - 1) * PAGE_SIZE, snapshotsPage * PAGE_SIZE);
  const auditRows = auditItems.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);

  return (
    <div className="admin-page">
      <div className="card">
        <div className="admin-header">
          <div className="admin-header-copy">
            <h1 style={{ marginTop: 0 }}>Reports & Analytics</h1>
            <p className="muted">Donations, care operations, outcomes, and public reporting.</p>
          </div>
        </div>
        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="admin-kpi-grid">
        <div className="card admin-kpi tone-aqua">
          <div className="muted">Active residents</div>
          <div className="admin-kpi-value">{activeResidentsTotal}</div>
        </div>
        <div className="card admin-kpi tone-peach">
          <div className="muted">Most recent month gifts</div>
          <div className="admin-kpi-value">{latestDonationMonth?.count ?? 0}</div>
          <div className="muted">
            PHP {(latestDonationMonth?.totalAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="card admin-kpi tone-berry">
          <div className="muted">Reintegration rate</div>
          <div className="admin-kpi-value">
            {reintegration ? `${(reintegration.rate * 100).toFixed(1)}%` : "-"}
          </div>
        </div>
        <div className="card admin-kpi">
          <div className="muted">Published snapshots</div>
          <div className="admin-kpi-value">{publishedSnapshots}</div>
        </div>
      </div>

      <div className="admin-two-column">
        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Donation trends</h2>
            <p className="muted">Recent giving by month.</p>
          </div>
          <div style={{ marginTop: 10 }}>
            <InlineLineChart
              data={[...donations]
                .slice(-6)
                .map((item) => ({
                  label: `${String(item.month).padStart(2, "0")}/${String(item.year).slice(-2)}`,
                  value: item.totalAmount,
                }))}
              valueFormatter={(v) => `PHP ${Math.round(v).toLocaleString()}`}
              showLegend={false}
            />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gifts</th>
                  <th>Total amount</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((item) => (
                  <tr key={`${item.year}-${item.month}`}>
                    <td data-label="Month" className="muted">
                      {item.year}-{String(item.month).padStart(2, "0")}
                    </td>
                    <td data-label="Gifts">{item.count}</td>
                    <td data-label="Total amount">
                      PHP {item.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
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
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Safehouse attention outlook</h2>
            <p className="muted">Which safehouses may need the most staff attention next month.</p>
          </div>
          <div style={{ marginTop: 10 }}>
            <InlineBarChart
              data={safehouseForecast.map((item) => ({
                label: item.name,
                value: item.predictedIncidentsNextMonth,
              }))}
              valueFormatter={(v) => v.toFixed(1)}
            />
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Higher bars mean the system expects more staff attention may be needed at that safehouse next month.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Safehouse</th>
                  <th>Occupancy</th>
                  <th>Capacity</th>
                  <th>Available space</th>
                </tr>
              </thead>
              <tbody>
                {safehouseForecast.map((item) => (
                  <tr key={item.safehouseId}>
                    <td data-label="Safehouse" className="muted">
                      {item.name}
                    </td>
                    <td data-label="Occupancy">{item.currentOccupancy ?? "-"}</td>
                    <td data-label="Capacity">{item.capacityGirls ?? "-"}</td>
                    <td data-label="Available space">
                      {item.currentOccupancy !== null && item.capacityGirls !== null
                        ? Math.max(item.capacityGirls - item.currentOccupancy, 0)
                        : "-"}
                    </td>
                  </tr>
                ))}
                {safehouseForecast.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No safehouse forecast data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-two-column">
        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Resident care</h2>
            <p className="muted">Status mix and reintegration progress.</p>
          </div>
          <div className="reports-status-grid" style={{ marginTop: 12 }}>
            {statuses.map((item) => (
              <div key={item.status} className="card" style={{ boxShadow: "none" }}>
                <div className="muted">{item.status}</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{item.count}</div>
              </div>
            ))}
            {statuses.length === 0 ? <div className="muted">No resident data yet.</div> : null}
          </div>
          <div className="reports-summary-grid" style={{ marginTop: 14 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Total residents</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{reintegration?.total ?? "-"}</div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Reintegrated</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{reintegration?.reintegrated ?? "-"}</div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Rate</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>
                {reintegration ? `${(reintegration.rate * 100).toFixed(1)}%` : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Annual accomplishments</h2>
            <p className="muted">Program totals by pillar.</p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pillar</th>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {(aar?.pillars ?? []).map((item) => (
                  <tr key={`${item.pillar}-${item.metric}`}>
                    <td>
                      <span className="badge">{item.pillar}</span>
                    </td>
                    <td className="muted">{item.metric}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
                {(aar?.pillars ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No annual accomplishment data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {auth.hasRole("Admin") ? (
        <div className="card">
          <div className="admin-header">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Public impact updates</h2>
              <p className="muted">Create, edit, and publish the updates shown on the public impact page.</p>
            </div>
            <button className="btn primary" onClick={() => setShowSnapshotForm((open) => !open)}>
              {showSnapshotForm ? "Close" : "New update"}
            </button>
          </div>

          <div className="reports-summary-grid" style={{ marginTop: 12, marginBottom: 14 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Published</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{publishedSnapshots}</div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Drafts</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{draftSnapshots}</div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Latest published</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{latestPublished?.snapshotDate ?? "None"}</div>
            </div>
          </div>

          <div className={`process-collapsible ${showSnapshotForm ? "open" : ""}`} aria-hidden={!showSnapshotForm}>
            <div className="card process-form-card">
              <div className="process-header process-inline-header">
                <strong>{editingSnapshotId ? "Edit update" : "Update details"}</strong>
              </div>

              <div className="reports-snapshot-grid" style={{ marginTop: 10 }}>
                <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
                  <span className="muted">Snapshot date</span>
                  <input className="input" type="date" value={snapDate} onChange={(e) => setSnapDate(e.target.value)} />
                </label>

                <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 320 }}>
                  <span className="muted">Headline</span>
                  <input className="input" value={snapHeadline} onChange={(e) => setSnapHeadline(e.target.value)} />
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
                  <span className="muted">Status</span>
                  <select className="input" value={snapPublish ? "yes" : "no"} onChange={(e) => setSnapPublish(e.target.value === "yes")}>
                    <option value="yes">Publish now</option>
                    <option value="no">Save as draft</option>
                  </select>
                </label>
              </div>

              <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                <span className="muted">Summary</span>
                <textarea className="input" rows={3} value={snapSummary} onChange={(e) => setSnapSummary(e.target.value)} />
              </label>

              <div className="row" style={{ marginTop: 10 }}>
                <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
                  <span className="muted">Active residents</span>
                  <input className="input" value={snapMetricActiveResidents} onChange={(e) => setSnapMetricActiveResidents(Number(e.target.value) || 0)} />
                </label>
                <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
                  <span className="muted">Donations (30d)</span>
                  <input className="input" value={snapMetricDonations30d} onChange={(e) => setSnapMetricDonations30d(Number(e.target.value) || 0)} />
                </label>
                <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
                  <span className="muted">Check-ins due (30d)</span>
                  <input className="input" value={snapMetricCheckinsDue30d} onChange={(e) => setSnapMetricCheckinsDue30d(Number(e.target.value) || 0)} />
                </label>
                <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
                  <span className="muted">Process recordings (7d)</span>
                  <input className="input" value={snapMetricProcess7d} onChange={(e) => setSnapMetricProcess7d(Number(e.target.value) || 0)} />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                <span className="muted">Context note</span>
                <input className="input" value={snapMetricNarrative} onChange={(e) => setSnapMetricNarrative(e.target.value)} />
              </label>

              <div className="reports-actions-row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={resetSnapshotForm}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  onClick={async () => {
                    setError(null);
                    try {
                      const metricPayloadJson = JSON.stringify({
                        activeResidents: snapMetricActiveResidents,
                        donations30d: snapMetricDonations30d,
                        checkInsDue30d: snapMetricCheckinsDue30d,
                        processRecordings7d: snapMetricProcess7d,
                        note: snapMetricNarrative,
                      });
                      if (editingSnapshotId) {
                        await apiFetch<{ snapshotId: number }>(`/api/impact-snapshots/${editingSnapshotId}`, {
                          method: "PUT",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({
                            snapshotDate: snapDate,
                            headline: snapHeadline,
                            summaryText: snapSummary,
                            metricPayloadJson,
                          }),
                        });
                      } else {
                        await apiFetch<{ snapshotId: number }>("/api/impact-snapshots", {
                          method: "POST",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({
                            snapshotDate: snapDate,
                            headline: snapHeadline,
                            summaryText: snapSummary,
                            metricPayloadJson,
                            publish: snapPublish,
                          }),
                        });
                      }
                      const snapshotList = await apiFetch<{ items: ImpactSnapshot[] }>("/api/impact-snapshots", {
                        token: auth.token ?? undefined,
                      });
                      setSnapshots(snapshotList.items);
                      setSnapshotsPage(1);
                      resetSnapshotForm();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {editingSnapshotId ? "Save changes" : "Save update"}
                </button>
              </div>
            </div>
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
                {snapshotRows.map((item) => (
                  <tr key={item.snapshotId}>
                    <td data-label="Date" className="muted">
                      {item.snapshotDate}
                    </td>
                    <td data-label="Headline" style={{ fontWeight: 700 }}>
                      {item.headline}
                    </td>
                    <td data-label="Status">
                      {item.isPublished ? <span className="badge ok">Published</span> : <span className="badge warn">Draft</span>}
                    </td>
                    <td data-label="Actions">
                      <div className="row admin-compact-actions">
                        <button
                          className="btn admin-table-action"
                          onClick={() => {
                            const payload = parseMetricPayload(item.metricPayloadJson);
                            setEditingSnapshotId(item.snapshotId);
                            setSnapDate(item.snapshotDate);
                            setSnapHeadline(item.headline);
                            setSnapSummary(item.summaryText);
                            setSnapMetricActiveResidents(payload.activeResidents);
                            setSnapMetricDonations30d(payload.donations30d);
                            setSnapMetricCheckinsDue30d(payload.checkInsDue30d);
                            setSnapMetricProcess7d(payload.processRecordings7d);
                            setSnapMetricNarrative(payload.note);
                            setSnapPublish(item.isPublished);
                            setShowSnapshotForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn admin-table-action"
                          onClick={async () => {
                            setError(null);
                            try {
                              await apiFetch(`/api/impact-snapshots/${item.snapshotId}/publish`, {
                                method: "PUT",
                                token: auth.token ?? undefined,
                                body: JSON.stringify({ publish: !item.isPublished }),
                              });
                              const snapshotList = await apiFetch<{ items: ImpactSnapshot[] }>("/api/impact-snapshots", {
                                token: auth.token ?? undefined,
                              });
                              setSnapshots(snapshotList.items);
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          {item.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {snapshotRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No snapshots created yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {snapshots.length > PAGE_SIZE ? (
            <div className="reports-pagination">
              <button className="btn" type="button" disabled={snapshotsPage <= 1} onClick={() => setSnapshotsPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <span className="muted">
                Page {snapshotsPage} of {snapshotTotalPages}
              </span>
              <button className="btn" type="button" disabled={snapshotsPage >= snapshotTotalPages} onClick={() => setSnapshotsPage((p) => Math.min(snapshotTotalPages, p + 1))}>
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {auth.hasRole("Admin") ? (
        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Recent audit activity</h2>
            <p className="muted">Recent administrative changes and sensitive actions.</p>
          </div>
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
                {auditRows.map((item, idx) => (
                  <tr key={`${item.whenUtc}-${idx}`}>
                    <td data-label="When" className="muted">
                      {new Date(item.whenUtc).toLocaleString()}
                    </td>
                    <td data-label="Actor">{item.actor}</td>
                    <td data-label="Action">{item.action}</td>
                    <td data-label="Area" className="muted">{item.area}</td>
                    <td data-label="Target" className="muted">{item.target}</td>
                  </tr>
                ))}
                {auditRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No recent audit activity.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {auditItems.length > PAGE_SIZE ? (
            <div className="reports-pagination">
              <button className="btn" type="button" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <span className="muted">
                Page {auditPage} of {auditTotalPages}
              </span>
              <button className="btn" type="button" disabled={auditPage >= auditTotalPages} onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}>
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
