import React, { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { apiFetch } from "../../../lib/api";
import { StatCard } from "../../../components/ui/StatCard";
import { Link } from "react-router-dom";

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
    lastHomeVisitDate: string | null;
    lastProcessRecordingDate: string | null;
    riskScore: number | null;
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
      isBoosted: boolean;
      boostPhp: number;
    }[];
  };
};

export function AppDashboardPage() {
  const auth = useAuth();
  const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
  const [data, setData] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<OpsAlerts | null>(null);
  const [insights, setInsights] = useState<ProgramInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readinessBands, setReadinessBands] = useState<string>("—");

  useEffect(() => {
    if (!auth.token || !staff) return;
    (async () => {
      const [res, ops, prog, readiness] = await Promise.allSettled([
        apiFetch<Overview>("/api/analytics/overview", { token: auth.token ?? undefined }),
        apiFetch<OpsAlerts>("/api/analytics/ops-alerts?take=10", { token: auth.token ?? undefined }),
        apiFetch<ProgramInsights>("/api/analytics/program-insights", { token: auth.token ?? undefined }),
        apiFetch<any[]>("/api/ml/predictions?type=resident_reintegration_readiness&take=200", { token: auth.token ?? undefined }),
      ]);

      if (res.status === "fulfilled") setData(res.value);
      if (ops.status === "fulfilled") setAlerts(ops.value);
      if (prog.status === "fulfilled") setInsights(prog.value);
      if (readiness.status === "fulfilled") {
        const counts = new Map<string, number>();
        for (const row of readiness.value) {
          const band = (row.label ?? "Unknown") as string;
          counts.set(band, (counts.get(band) ?? 0) + 1);
        }
        const txt = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k, v]) => `${k}:${v}`)
          .join(" · ");
        setReadinessBands(txt || "—");
      }

      const errs: string[] = [];
      if (res.status === "rejected") errs.push(`Overview: ${(res.reason as Error)?.message ?? "failed"}`);
      if (ops.status === "rejected") errs.push(`Operational alerts: ${(ops.reason as Error)?.message ?? "failed"}`);
      if (prog.status === "rejected") errs.push(`Program insights: ${(prog.reason as Error)?.message ?? "failed"}`);
      if (readiness.status === "rejected") errs.push(`Readiness: ${(readiness.reason as Error)?.message ?? "failed"}`);
      if (errs.length > 0) {
        setError(errs.join(" | "));
      }
    })();
  }, [auth.token, staff]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Operations Dashboard</h1>
        <p className="muted">
          High-signal, privacy-first view of operations supporting South Korean victims: follow-up health, donor momentum,
          and safety-critical alerts.
        </p>
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
        <div className="image-frame" style={{ marginTop: 12, maxHeight: 210 }}>
          <img src="/photos/team-collaboration.jpg" alt="Operations staff collaboration and dashboard context." />
        </div>
      </div>

      <div className="admin-overview-grid">
        <div className="admin-overview-card">
          <div className="muted">Residents</div>
          <div className="admin-overview-kpi">{data?.activeResidents ?? "—"}</div>
          <div className="muted">Active caseload count</div>
        </div>
        <div className="admin-overview-card">
          <div className="muted">Donations 30d</div>
          <div className="admin-overview-kpi">{data?.donations30d.count ?? "—"}</div>
          <div className="muted">{data ? `₱${data.donations30d.totalAmount.toFixed(0)} total` : "—"}</div>
        </div>
        <div className="admin-overview-card">
          <div className="muted">Check-ins due</div>
          <div className="admin-overview-kpi">{data?.checkInsDue30d ?? "—"}</div>
          <div className="muted">30-day follow-up window</div>
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
          Use this dashboard to brief staff and partners on outcomes, risks, and stewardship while preserving survivor
          privacy. Data shown here is operational and staff-only.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn" to="/app/cases">Employee case workflow</Link>
          <Link className="btn" to="/app/reports">Admin reporting and snapshots</Link>
          <Link className="btn" to="/app/admin/users">Admin user CRUD</Link>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard label="Active residents" value={data?.activeResidents ?? "—"} />
        <StatCard
          label="Donations in last 30 days"
          value={data ? `${data.donations30d.count}` : "—"}
          hint={data ? `₱${data.donations30d.totalAmount.toFixed(2)} total` : undefined}
          tone="brand"
        />
        <StatCard label="Check-ins due in 30 days" value={data?.checkInsDue30d ?? "—"} tone="warn" />
        <StatCard label="Process recordings in 7 days" value={data?.processRecordings7d ?? "—"} tone="ok" />
        <StatCard label="Case conferences in 14 days" value={data?.upcomingConferences14d ?? "—"} />
        <StatCard
          label="Resident incident risk bands"
          value={data ? data.residentRisk.byBand.map((b) => `${b.band}:${b.count}`).slice(0, 3).join(" · ") || "—" : "—"}
          hint={data?.residentRisk.asOfUtc ? `As of ${new Date(data.residentRisk.asOfUtc).toLocaleString()}` : "No ML import yet"}
        />
        <StatCard label="Reintegration readiness bands" value={readinessBands} hint="From resident readiness ML imports" tone="ok" />
      </div>

      {insights ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Program outcomes &amp; stewardship signals</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Pulled from intervention plans, allocations, education/health records, incidents, and social posts—use this to
            brief teams and tune campaigns. Updated {new Date(insights.asOfUtc).toLocaleString()}.
          </p>

          <div className="row" style={{ marginTop: 14, alignItems: "stretch", flexWrap: "wrap", gap: 12 }}>
            <div className="card card-flat-panel2" style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800 }}>Annual-report style pillars</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Mentions in services provided, plans can match multiple pillars.
              </p>
              <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Caring: {insights.servicesPillarMentions.caring}</li>
                <li>Healing: {insights.servicesPillarMentions.healing}</li>
                <li>Teaching: {insights.servicesPillarMentions.teaching}</li>
                <li>Legal: {insights.servicesPillarMentions.legal}</li>
              </ul>
            </div>
            <div className="card card-flat-panel2" style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800 }}>Resident outcomes (records)</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Education progress &amp; health scores across all monthly rows.
              </p>
              <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Avg education progress: {insights.education.avgProgressPercent ?? "—"}%</li>
                <li>Completed education records: {insights.education.recordsCompleted}</li>
                <li>Avg general health score: {insights.health.avgGeneralHealthScore ?? "—"}</li>
              </ul>
            </div>
            <div className="card card-flat-panel2" style={{ flex: "1 1 240px" }}>
              <div style={{ fontWeight: 800 }}>Safety in 90 days</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Open follow-ups: {insights.incidents90d.openFollowUps}
              </p>
              <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                {insights.incidents90d.byType.slice(0, 5).map((r) => (
                  <li key={r.incidentType}>
                    {r.incidentType}: {r.count}
                  </li>
                ))}
                {insights.incidents90d.byType.length === 0 ? <li>No incidents in window</li> : null}
              </ul>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, alignItems: "stretch", flexWrap: "wrap", gap: 12 }}>
            <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>Donation allocations by program area</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Where pledged value is directed—helps explain impact to donors.
              </p>
              {(() => {
                const rows = insights.donationAllocationsByProgram;
                const max = Math.max(...rows.map((r) => r.totalPhp), 1);
                return (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {rows.length === 0 ? <div className="muted">No allocation rows yet.</div> : null}
                    {rows.map((r) => (
                      <div key={r.programArea}>
                        <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                          <span>{r.programArea}</span>
                          <span className="muted">₱{r.totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="mini-track">
                          <div
                            style={{
                              width: `${Math.min(100, (r.totalPhp / max) * 100)}%`,
                              height: "100%",
                              background: "var(--brand)",
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="card card-flat-panel2" style={{ flex: "1 1 280px" }}>
              <div style={{ fontWeight: 800 }}>Outreach ROI, dataset estimates</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Boost spend vs. modeled donation value from social posts.
              </p>
              <ul className="muted" style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Total boost spend: ₱{insights.socialRoi.totalBoostSpendPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
                <li>Est. donation value: ₱{insights.socialRoi.totalEstimatedDonationValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
              </ul>
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700 }}>Top referral posts</div>
              <ul className="muted" style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                {insights.socialRoi.topPosts.length === 0 ? <li>None yet</li> : null}
                {insights.socialRoi.topPosts.map((p) => (
                  <li key={p.postId}>
                    #{p.postId} {p.platform} · {p.postType}
                    {p.campaignName ? ` · ${p.campaignName}` : ""} — ₱{p.estimatedValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                    {p.referrals} referrals
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, gap: 10 }}>
            <Link className="btn" to="/app/reports">
              Full reports &amp; publish snapshots
            </Link>
            <Link className="btn" to="/impact">
              Preview public impact page
            </Link>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Operational alerts</h2>
          <Link className="btn" to="/app/action-center">
            View ML Action Center
          </Link>
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
                  <th>Reasons</th>
                  <th style={{ width: 260 }}>Quick links</th>
                </tr>
              </thead>
              <tbody>
                {alerts.items.map((x) => (
                  <tr key={x.residentId}>
                    <td data-label="Resident" style={{ fontWeight: 800 }}>
                      {x.displayName}
                    </td>
                    <td data-label="Safehouse" className="muted">
                      {x.safehouseId}
                    </td>
                    <td data-label="Worker" className="muted">
                      {x.assignedSocialWorker ?? "—"}
                    </td>
                    <td data-label="Reasons">
                      <div className="row" style={{ gap: 8 }}>
                        {x.reasons.map((r) => (
                          <span
                            key={r}
                            className={`badge ${
                              r.includes("High incident risk") ? "danger" : r.includes("due") ? "warn" : "ok"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Quick links">
                      <div className="row">
                        <Link className="btn" to={`/app/residents/${x.residentId}/process-recordings`}>
                          Process recordings
                        </Link>
                        <Link className="btn" to={`/app/residents/${x.residentId}/home-visits`}>
                          Home visits
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10 }}>
            No alerts yet. Add home visits/process recordings, or import `resident_incident_30d` predictions.
          </div>
        )}
      </div>
    </div>
  );
}
