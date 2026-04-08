import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { InlineBarChart } from "../../../components/ui/InlineBarChart";
import { StatCard } from "../../../components/ui/StatCard";

type Overview = {
  asOfUtc: string;
  activeResidents: number;
  donations30d: { count: number; totalAmount: number };
  processRecordings7d: number;
  upcomingConferences14d: number;
  checkInsDue30d: number;
  donorLapse: { asOfUtc: string | null; byBand: { band: string; count: number }[] };
  residentRisk: { asOfUtc: string | null; byBand: { band: string; count: number }[] };
};

type OpsAlerts = {
  asOfUtc: string;
  items: {
    residentId: number;
    displayName: string;
    safehouseId: number;
    assignedSocialWorker: string | null;
    riskBand: string | null;
    reasons: string[];
  }[];
};

type ProgramInsights = {
  asOfUtc: string;
  servicesPillarMentions: { caring: number; healing: number; teaching: number; legal: number; plansWithServicesText: number };
  donationAllocationsByProgram: { programArea: string; totalPhp: number }[];
  education: { avgProgressPercent: number | null; recordsCompleted: number };
  health: { avgGeneralHealthScore: number | null };
  incidents90d: { from: string; openFollowUps: number; byType: { incidentType: string; count: number }[] };
  socialRoi: {
    totalBoostSpendPhp: number;
    totalEstimatedDonationValuePhp: number;
    topPosts: {
      postId: number;
      platform: string;
      postType: string;
      campaignName: string | null;
      referrals: number;
      estimatedValuePhp: number;
    }[];
  };
};

type MlPredictionRow = {
  label: string | null;
};

type SafehouseForecast = {
  safehouseId: number;
  name: string;
  city: string | null;
  currentOccupancy: number | null;
  capacityGirls: number | null;
  predictedIncidentsNextMonth: number;
};

export function AppDashboardPage() {
  const auth = useAuth();
  const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
  const token = auth.token ?? undefined;

  const [data, setData] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<OpsAlerts | null>(null);
  const [insights, setInsights] = useState<ProgramInsights | null>(null);
  const [safehouseForecast, setSafehouseForecast] = useState<SafehouseForecast[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readinessBands, setReadinessBands] = useState<string>("-");

  useEffect(() => {
    if (!token || !staff) return;

    (async () => {
      const [overviewRes, alertsRes, insightsRes, readinessRes, safehouseRes] = await Promise.allSettled([
        apiFetch<Overview>("/api/analytics/overview", { token }),
        apiFetch<OpsAlerts>("/api/analytics/ops-alerts?take=10", { token }),
        apiFetch<ProgramInsights>("/api/analytics/program-insights", { token }),
        apiFetch<MlPredictionRow[]>("/api/ml/predictions?type=resident_reintegration_readiness&take=200", { token }),
        apiFetch<SafehouseForecast[]>("/api/ml/safehouse-forecast/top?take=5", { token }),
      ]);

      const errs: string[] = [];

      if (overviewRes.status === "fulfilled") setData(overviewRes.value);
      else errs.push(`Overview: ${(overviewRes.reason as Error).message}`);

      if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value);
      else errs.push(`Operational alerts: ${(alertsRes.reason as Error).message}`);

      if (insightsRes.status === "fulfilled") setInsights(insightsRes.value);
      else errs.push(`Program insights: ${(insightsRes.reason as Error).message}`);

      if (safehouseRes.status === "fulfilled") setSafehouseForecast(safehouseRes.value);
      else errs.push(`Safehouse forecast: ${(safehouseRes.reason as Error).message}`);

      if (readinessRes.status === "fulfilled") {
        const counts = new Map<string, number>();
        for (const row of readinessRes.value) {
          const band = row.label ?? "Unknown";
          counts.set(band, (counts.get(band) ?? 0) + 1);
        }
        const summary = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([label, count]) => `${label}:${count}`)
          .join(" | ");
        setReadinessBands(summary || "-");
      } else {
        errs.push(`Readiness: ${(readinessRes.reason as Error).message}`);
      }

      setError(errs.length ? errs.join(" | ") : null);
    })();
  }, [staff, token]);

  const followUpCoveragePct =
    data && data.activeResidents > 0
      ? Math.max(0, ((data.activeResidents - data.checkInsDue30d) / data.activeResidents) * 100)
      : null;

  const readinessChart =
    readinessBands === "-"
      ? []
      : readinessBands.split(" | ").map((entry) => {
          const [label, raw] = entry.split(":");
          return { label: label ?? "Unknown", value: Number(raw ?? 0) || 0 };
        });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Operations Dashboard</h1>
        <p className="muted">
          Leadership view across resident follow-up health, donor momentum, social ROI, and the current ML triage layer.
        </p>
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <span className="badge ok">Observed metrics: dashboard KPIs, donations, visits, recordings, incidents</span>
          <span className="badge warn">Predicted metrics: resident risk, readiness, safehouse pressure</span>
          <span className="badge">Explanation details live in ML Insights and the notebooks</span>
        </div>
        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
        {data ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Updated {new Date(data.asOfUtc).toLocaleString()}
          </div>
        ) : null}
      </div>

      <div className="card panel2-bg">
        <h2 style={{ marginTop: 0 }}>Operational trend charts</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Daily triage view for resident risk, reintegration readiness, and workload.
        </p>
        <div className="row" style={{ marginTop: 12, alignItems: "stretch", gap: 12 }}>
          <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>Resident incident risk distribution</div>
            <div style={{ marginTop: 10 }}>
              <InlineBarChart data={(data?.residentRisk.byBand ?? []).map((x) => ({ label: x.band, value: x.count }))} />
            </div>
          </div>
          <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>Reintegration readiness distribution</div>
            <div style={{ marginTop: 10 }}>
              <InlineBarChart data={readinessChart} />
            </div>
          </div>
          <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>Current operations workload</div>
            <div style={{ marginTop: 10 }}>
              <InlineBarChart
                data={[
                  { label: "Check-ins due", value: data?.checkInsDue30d ?? 0 },
                  { label: "Process recordings", value: data?.processRecordings7d ?? 0 },
                  { label: "Conferences", value: data?.upcomingConferences14d ?? 0 },
                  { label: "Open alerts", value: alerts?.items.length ?? 0 },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-overview-grid">
        <div className="admin-overview-card">
          <div className="muted">Residents</div>
          <div className="admin-overview-kpi">{data?.activeResidents ?? "-"}</div>
          <div className="muted">Active caseload count</div>
        </div>
        <div className="admin-overview-card">
          <div className="muted">Donations 30d</div>
          <div className="admin-overview-kpi">{data?.donations30d.count ?? "-"}</div>
          <div className="muted">
            {data ? `PHP ${data.donations30d.totalAmount.toFixed(0)} total` : "-"}
          </div>
        </div>
        <div className="admin-overview-card">
          <div className="muted">Check-ins due</div>
          <div className="admin-overview-kpi">{data?.checkInsDue30d ?? "-"}</div>
          <div className="muted">30-day follow-up window</div>
        </div>
        <div className="admin-overview-card">
          <div className="muted">Follow-up coverage</div>
          <div className="admin-overview-kpi">{followUpCoveragePct == null ? "-" : `${followUpCoveragePct.toFixed(0)}%`}</div>
          <div className="muted">Residents not overdue</div>
        </div>
        <div className="admin-overview-card">
          <div className="muted">Readiness bands</div>
          <div className="admin-overview-kpi" style={{ fontSize: 20 }}>{readinessBands}</div>
          <div className="muted">Resident reintegration view</div>
        </div>
      </div>

      <div className="card panel2-bg">
        <div style={{ fontWeight: 800 }}>Executive note</div>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          The strongest north-star operational metric in the current app is follow-up coverage. If that number drops,
          residents are missing timely contact and the rest of the workflow quality follows it down.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn" to="/app/cases">Employee case workflow</Link>
          <Link className="btn" to="/app/action-center">ML action center</Link>
          <Link className="btn" to="/app/reports">Admin reporting and snapshots</Link>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard label="Active residents" value={data?.activeResidents ?? "-"} />
        <StatCard
          label="Donations in last 30 days"
          value={data ? `${data.donations30d.count}` : "-"}
          hint={data ? `PHP ${data.donations30d.totalAmount.toFixed(2)} total` : undefined}
          tone="brand"
        />
        <StatCard label="Check-ins due in 30 days" value={data?.checkInsDue30d ?? "-"} tone="warn" />
        <StatCard
          label="Follow-up coverage"
          value={followUpCoveragePct == null ? "-" : `${followUpCoveragePct.toFixed(0)}%`}
          hint="Share of active residents not overdue for a check-in"
          tone="ok"
        />
        <StatCard label="Process recordings in 7 days" value={data?.processRecordings7d ?? "-"} tone="ok" />
        <StatCard label="Case conferences in 14 days" value={data?.upcomingConferences14d ?? "-"} />
        <StatCard
          label="Resident incident risk bands"
          value={data ? data.residentRisk.byBand.map((b) => `${b.band}:${b.count}`).slice(0, 3).join(" | ") || "-" : "-"}
          hint={data?.residentRisk.asOfUtc ? `As of ${new Date(data.residentRisk.asOfUtc).toLocaleString()}` : "No ML import yet"}
        />
        <StatCard label="Reintegration readiness bands" value={readinessBands} hint="From resident readiness ML imports" tone="ok" />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Safehouse forecast</h2>
          <Link className="btn" to="/app/action-center">Full ML action center</Link>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Forward-looking incident pressure from the ML pipeline, surfaced for staffing and capacity planning.
        </p>
        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          This section is a prediction. It estimates next-month pressure. It does not explain why by itself and it is not a historical total.
        </p>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Safehouse</th>
                <th>Predicted incidents</th>
                <th>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {safehouseForecast.map((row) => (
                <tr key={row.safehouseId}>
                  <td data-label="Safehouse" style={{ fontWeight: 800 }}>
                    {row.name}
                    {row.city ? <span className="muted"> · {row.city}</span> : null}
                  </td>
                  <td data-label="Predicted incidents">{row.predictedIncidentsNextMonth.toFixed(2)}</td>
                  <td data-label="Occupancy" className="muted">
                    {row.currentOccupancy ?? "-"}
                    {row.capacityGirls != null ? ` / ${row.capacityGirls}` : ""}
                  </td>
                </tr>
              ))}
              {safehouseForecast.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No safehouse forecast imported yet. Import `safehouse_incident_next_month` to populate this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {insights ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Program outcomes and stewardship signals</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Pulled from intervention plans, allocations, education and health records, incidents, and social posts.
            Updated {new Date(insights.asOfUtc).toLocaleString()}.
          </p>

          <div className="row" style={{ marginTop: 14, alignItems: "stretch", flexWrap: "wrap", gap: 12 }}>
            <div className="card card-flat-panel2" style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800 }}>Program pillars</div>
              <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Caring: {insights.servicesPillarMentions.caring}</li>
                <li>Healing: {insights.servicesPillarMentions.healing}</li>
                <li>Teaching: {insights.servicesPillarMentions.teaching}</li>
                <li>Legal: {insights.servicesPillarMentions.legal}</li>
              </ul>
            </div>
            <div className="card card-flat-panel2" style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800 }}>Resident outcomes</div>
              <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Avg education progress: {insights.education.avgProgressPercent ?? "-"}%</li>
                <li>Completed education records: {insights.education.recordsCompleted}</li>
                <li>Avg general health score: {insights.health.avgGeneralHealthScore ?? "-"}</li>
              </ul>
            </div>
            <div className="card card-flat-panel2" style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800 }}>Safety in 90 days</div>
              <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Open follow-ups: {insights.incidents90d.openFollowUps}</li>
                {insights.incidents90d.byType.slice(0, 4).map((row) => (
                  <li key={row.incidentType}>
                    {row.incidentType}: {row.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, alignItems: "stretch", flexWrap: "wrap", gap: 12 }}>
            <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>Donation allocations by program</div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {insights.donationAllocationsByProgram.length === 0 ? <div className="muted">No allocation rows yet.</div> : null}
                {insights.donationAllocationsByProgram.map((row) => (
                  <div key={row.programArea}>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                      <span>{row.programArea}</span>
                      <span className="muted">PHP {row.totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="mini-track">
                      <div
                        style={{
                          width: `${Math.min(100, (row.totalPhp / Math.max(...insights.donationAllocationsByProgram.map((r) => r.totalPhp), 1)) * 100)}%`,
                          height: "100%",
                          background: "var(--brand)",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>Social ROI</div>
              <ul className="muted" style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Total boost spend: PHP {insights.socialRoi.totalBoostSpendPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
                <li>Estimated donation value: PHP {insights.socialRoi.totalEstimatedDonationValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
                {insights.socialRoi.topPosts.map((post) => (
                  <li key={post.postId}>
                    #{post.postId} {post.platform} {post.postType} - PHP {post.estimatedValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })} from {post.referrals} referrals
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, gap: 10 }}>
            <Link className="btn" to="/app/reports">Full reports and snapshots</Link>
            <Link className="btn" to="/impact">Preview public impact page</Link>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Operational alerts</h2>
          <Link className="btn" to="/app/action-center">View ML action center</Link>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Prioritize follow-ups without exposing sensitive details.
        </p>

        {alerts?.items?.length ? (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Safehouse</th>
                  <th>Worker</th>
                  <th>Risk</th>
                  <th>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {alerts.items.map((row) => (
                  <tr key={row.residentId}>
                    <td data-label="Resident" style={{ fontWeight: 800 }}>{row.displayName}</td>
                    <td data-label="Safehouse" className="muted">{row.safehouseId}</td>
                    <td data-label="Worker" className="muted">{row.assignedSocialWorker ?? "-"}</td>
                    <td data-label="Risk"><span className="badge">{row.riskBand ?? "Review"}</span></td>
                    <td data-label="Reasons">
                      <div className="row" style={{ gap: 8 }}>
                        {row.reasons.map((reason) => (
                          <span
                            key={reason}
                            className={`badge ${reason.includes("High incident risk") ? "danger" : reason.includes("due") ? "warn" : "ok"}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10 }}>
            No alerts yet. Add home visits and process recordings, or import `resident_incident_30d` predictions.
          </div>
        )}
      </div>
    </div>
  );
}
