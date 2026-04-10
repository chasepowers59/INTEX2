import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { InlineBarChart } from "../../../components/ui/InlineBarChart";
import { StatCard } from "../../../components/ui/StatCard";
import { formatSiteCurrency } from "../../../lib/currency";

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

function formatPhp(value: number | null | undefined) {
  return formatSiteCurrency(value);
}

function formatStamp(value: string | null | undefined) {
  if (!value) return "Awaiting sync";
  return new Date(value).toLocaleString();
}

function formatCompact(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function describeSafehouseAttention(value: number | null | undefined) {
  if (value == null) return "Awaiting forecast";
  if (value >= 1.5) return "Needs review";
  if (value >= 0.5) return "Watch";
  return "Okay";
}

function describeDonorLapseBand(band: string | null | undefined, count: number | null | undefined) {
  const normalized = (band ?? "").trim().toLowerCase();
  const donorCount = count ?? 0;

  if (!normalized) return "Awaiting import";
  if (normalized.includes("low")) return `Mostly stable (${donorCount} donors)`;
  if (normalized.includes("medium")) return `Some follow-up needed (${donorCount} donors)`;
  if (normalized.includes("high")) return `Closer donor follow-up needed (${donorCount} donors)`;
  return donorCount > 0 ? `${band} (${donorCount} donors)` : band;
}

function summarizeReadinessMix(items: { label: string; value: number }[]) {
  if (!items.length) return "Awaiting import";

  const ordered = [...items]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(({ label, value }) => {
      const normalized = label.trim().toLowerCase();
      if (normalized.includes("high")) return `${value} may be ready soon`;
      if (normalized.includes("medium")) return `${value} are still in progress`;
      if (normalized.includes("low")) return `${value} need more support`;
      return `${value} ${label.toLowerCase()}`;
    });

  return ordered.join(" | ");
}

function mapResidentFollowUpLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("high")) return "Needs closer follow-up";
  if (normalized.includes("medium")) return "Watch";
  if (normalized.includes("low")) return "Stable";
  return label;
}

function mapReadinessLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("high")) return "May be ready soon";
  if (normalized.includes("medium")) return "In progress";
  if (normalized.includes("low")) return "Needs more support";
  return label;
}

function mapDonorRetentionLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("high")) return "Closer follow-up needed";
  if (normalized.includes("medium")) return "Some follow-up needed";
  if (normalized.includes("low")) return "Mostly stable";
  return label;
}

function combineBands(items: { band: string; count: number }[] | undefined, mapper: (label: string) => string) {
  const combined = new Map<string, number>();
  for (const item of items ?? []) {
    const label = mapper(item.band);
    combined.set(label, (combined.get(label) ?? 0) + item.count);
  }
  return [...combined.entries()].map(([label, count]) => ({ label, value: count }));
}

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
        apiFetch<SafehouseForecast[]>("/api/ml/safehouse-forecast/top?take=6", { token }),
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

  const readinessChart = useMemo(
    () =>
      readinessBands === "-"
        ? []
        : readinessBands.split(" | ").map((entry) => {
            const [label, raw] = entry.split(":");
            return { label: label ?? "Unknown", value: Number(raw ?? 0) || 0 };
          }),
    [readinessBands],
  );

  const topProgramArea = insights?.donationAllocationsByProgram?.length
    ? [...insights.donationAllocationsByProgram].sort((a, b) => b.totalPhp - a.totalPhp)[0]
    : null;

  const topForecast = safehouseForecast.length
    ? [...safehouseForecast].sort((a, b) => b.predictedIncidentsNextMonth - a.predictedIncidentsNextMonth)[0]
    : null;

  const socialRoiMultiple =
    insights && insights.socialRoi.totalBoostSpendPhp > 0
      ? insights.socialRoi.totalEstimatedDonationValuePhp / insights.socialRoi.totalBoostSpendPhp
      : null;
  const topDonorLapseBand = data?.donorLapse.byBand?.[0];
  const residentRiskChart = combineBands(data?.residentRisk.byBand, mapResidentFollowUpLabel);
  const donorLapseChart = combineBands(data?.donorLapse.byBand, mapDonorRetentionLabel);
  const readinessDisplayChart = combineBands(
    readinessChart.map((row) => ({ band: row.label, count: row.value })),
    mapReadinessLabel,
  );

  const workloadItems = [
    { label: "Check-ins due", value: data?.checkInsDue30d ?? 0 },
    { label: "Process recordings", value: data?.processRecordings7d ?? 0 },
    { label: "Conferences", value: data?.upcomingConferences14d ?? 0 },
    { label: "Open alerts", value: alerts?.items.length ?? 0 },
  ];

  const actionHeadline =
    (alerts?.items.length ?? 0) > 0
      ? `${alerts?.items.length ?? 0} residents need timely review`
      : followUpCoveragePct != null && followUpCoveragePct < 85
        ? "Follow-up coverage needs attention"
        : "Operations look stable today";

  return (
    <div className="admin-dashboard-page">
      <section className="card admin-command-hero">
        <div className="admin-command-copy">
          <h1>Operations at a Glance</h1>
          <div className="admin-command-meta">
            <span className="badge brand">Updated {formatStamp(data?.asOfUtc ?? alerts?.asOfUtc ?? insights?.asOfUtc)}</span>
          </div>
          {error ? <div className="badge danger">{error}</div> : null}
          <div className="admin-quick-action-grid">
            <Link className="btn primary" to="/app/action-center">
              Action Center
            </Link>
            <Link className="btn" to="/app/cases">
              Caseload
            </Link>
            <Link className="btn" to="/app/donors">
              Review Donors
            </Link>
            <Link className="btn" to="/app/reports">
              Analytics
            </Link>
          </div>
        </div>

        <aside className="admin-command-side">
          <div className="admin-command-status">
            <div className="admin-status-row">
              <span>Priority</span>
              <strong>{actionHeadline}</strong>
            </div>
            <div className="admin-status-row">
              <span>Follow-up coverage</span>
              <strong>{followUpCoveragePct == null ? "-" : `${followUpCoveragePct.toFixed(0)}%`}</strong>
            </div>
            <div className="admin-status-row">
              <span>Top funding area</span>
              <strong>{topProgramArea ? topProgramArea.programArea : "Awaiting allocations"}</strong>
            </div>
            <div className="admin-status-row">
              <span>Highest forecast pressure</span>
              <strong>{topForecast ? topForecast.name : "Awaiting forecast import"}</strong>
            </div>
          </div>
        </aside>
      </section>

      <div className="admin-dashboard-main">
          <div className="kpi-grid dashboard-kpi-grid">
            <StatCard label="Residents currently in care" value={data?.activeResidents ?? "-"} />
            <StatCard
              label="Gifts recorded in the last 30 days"
              value={data?.donations30d.count ?? "-"}
              hint={data ? `${formatPhp(data.donations30d.totalAmount)} total recorded` : "Awaiting donation data"}
              tone="brand"
            />
            <StatCard
              label="Residents currently flagged for review"
              value={alerts?.items.length ?? "-"}
              tone={(alerts?.items.length ?? 0) > 0 ? "danger" : "ok"}
            />
          </div>

          <div className="admin-two-column">
            <section className="card admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Immediate attention</h2>
                  <p className="muted">Residents and follow-ups that should be reviewed first.</p>
                </div>
                <Link className="btn" to="/app/action-center">
                  View ML triage
                </Link>
              </div>

              {alerts?.items?.length ? (
                <div className="admin-alert-list">
                  {alerts.items.slice(0, 4).map((row) => (
                    <article key={row.residentId} className="admin-alert-card">
                      <div className="admin-alert-head">
                        <div className="admin-alert-title">
                          <strong>{row.displayName}</strong>
                          <span className="muted">
                            Safehouse {row.safehouseId}
                            {row.assignedSocialWorker ? ` - ${row.assignedSocialWorker}` : ""}
                          </span>
                        </div>
                        <span className={`badge ${row.riskBand?.toLowerCase().includes("high") ? "danger" : "warn"}`}>
                          {row.riskBand?.toLowerCase().includes("high") ? "Needs closer follow-up" : row.riskBand ?? "Review"}
                        </span>
                      </div>
                      <div className="admin-alert-reasons">
                        {row.reasons
                          .filter(
                            (reason) =>
                              reason !== "Needs closer follow-up" &&
                              reason !== "High incident risk (30d)" &&
                              !reason.includes("High incident risk"),
                          )
                          .map((reason) => (
                          <span
                            key={reason}
                            className={`badge ${reason.includes("Needs closer follow-up") ? "danger" : reason.includes("due") ? "warn" : "ok"}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                      <div className="row admin-compact-actions" style={{ marginTop: 10 }}>
                        <Link className="btn admin-table-action" to={`/app/residents/${row.residentId}/process-recordings`}>
                          Open recordings
                        </Link>
                        <Link className="btn admin-table-action" to={`/app/residents/${row.residentId}/home-visits`}>
                          Open visits
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-empty-state">
                  No operational alerts right now.
                </div>
              )}
            </section>

            <section className="card admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Safehouse attention outlook</h2>
                  <p className="muted">Which safehouses may need closer staff attention next month.</p>
                </div>
              </div>

              {safehouseForecast.length ? (
                <div className="admin-forecast-list">
                  {safehouseForecast.map((row) => (
                    <div key={row.safehouseId} className="admin-forecast-item">
                      <div>
                        <strong>{row.name}</strong>
                        <span className="muted">
                          {row.city ?? "Location not set"}
                          {row.capacityGirls != null ? ` - ${row.currentOccupancy ?? "-"} / ${row.capacityGirls} occupied` : ""}
                        </span>
                      </div>
                      <div className="admin-forecast-metric">
                        <span>Status</span>
                        <strong>{describeSafehouseAttention(row.predictedIncidentsNextMonth)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty-state">
                  No safehouse attention forecast imported yet.
                </div>
              )}
            </section>
          </div>

          <section className="card admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Current outlook</h2>
                <p className="muted">Resident follow-up needs, reintegration progress, and donor retention.</p>
              </div>
              <Link className="btn" to="/app/ml">
                Open ML insights
              </Link>
            </div>

            <div className="admin-signal-grid">
              <div className="admin-signal-card">
                <h3>Residents by follow-up need</h3>
                {residentRiskChart.length ? (
                  <InlineBarChart data={residentRiskChart} />
                ) : (
                  <div className="admin-empty-state">Import `resident_incident_30d` predictions to populate this chart.</div>
                )}
              </div>

              <div className="admin-signal-card">
                <h3>Residents by reintegration stage</h3>
                {readinessDisplayChart.length ? (
                  <InlineBarChart data={readinessDisplayChart} />
                ) : (
                  <div className="admin-empty-state">Import `resident_reintegration_readiness` predictions to populate this chart.</div>
                )}
              </div>

              <div className="admin-signal-card">
                <h3>Donors by retention outlook</h3>
                {donorLapseChart.length ? (
                  <InlineBarChart data={donorLapseChart} />
                ) : (
                  <div className="admin-empty-state">Import `donor_lapse_90d` predictions to populate this chart.</div>
                )}
              </div>
            </div>
          </section>

          <div className="admin-two-column">
            <section className="card admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Workload and care pulse</h2>
                  <p className="muted">Check-ins, notes, conferences, and readiness.</p>
                </div>
              </div>

              <InlineBarChart data={workloadItems} />

              <div className="admin-mini-metrics">
                <div className="admin-mini-metric">
                  <span>Follow-up coverage</span>
                  <strong>{followUpCoveragePct == null ? "-" : `${followUpCoveragePct.toFixed(0)}%`}</strong>
                </div>
                <div className="admin-mini-metric">
                  <span>Reintegration planning outlook</span>
                  <strong>{summarizeReadinessMix(readinessChart)}</strong>
                </div>
                <div className="admin-mini-metric">
                  <span>Donor retention outlook</span>
                  <strong>{describeDonorLapseBand(topDonorLapseBand?.band, topDonorLapseBand?.count)}</strong>
                </div>
                <div className="admin-mini-metric">
                  <span>Care plans with service notes</span>
                  <strong>{insights?.servicesPillarMentions.plansWithServicesText ?? "-"}</strong>
                </div>
              </div>

              <div className="admin-inline-summary">
                {followUpCoveragePct == null
                  ? "Follow-up coverage will appear here once resident follow-up timing is available."
                  : `Current follow-up coverage is ${followUpCoveragePct.toFixed(0)}%. ${alerts?.items.length ?? 0} residents are currently surfaced for review, and ${data?.upcomingConferences14d ?? 0} case conferences are scheduled soon.`}
              </div>
            </section>

            <section className="card admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Funding and stewardship</h2>
                  <p className="muted">Allocations, recent donations, and ROI.</p>
                </div>
              </div>

              <div className="admin-program-bars">
                {insights?.donationAllocationsByProgram?.length ? (
                  [...insights.donationAllocationsByProgram]
                    .sort((a, b) => b.totalPhp - a.totalPhp)
                    .slice(0, 4)
                    .map((row) => {
                    const max = Math.max(...insights.donationAllocationsByProgram.map((item) => item.totalPhp), 1);
                    const width = `${Math.min(100, (row.totalPhp / max) * 100)}%`;
                    return (
                      <div key={row.programArea}>
                        <div className="admin-program-bar-label">
                          <span>{row.programArea}</span>
                          <span>{formatPhp(row.totalPhp)}</span>
                        </div>
                        <div className="admin-program-bar">
                          <span style={{ width }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="admin-empty-state">No allocation rows yet. Admin allocations will populate this panel.</div>
                )}
              </div>

              <div className="admin-mini-metrics">
                <div className="admin-mini-metric">
                  <span>Donations in last 30 days</span>
                  <strong>{formatPhp(data?.donations30d.totalAmount)}</strong>
                </div>
                <div className="admin-mini-metric">
                  <span>Top funding area</span>
                  <strong>{topProgramArea?.programArea ?? "-"}</strong>
                </div>
                <div className="admin-mini-metric">
                  <span>Return on ad spend</span>
                  <strong>{socialRoiMultiple == null ? "-" : `${socialRoiMultiple.toFixed(1)}x`}</strong>
                </div>
              </div>
            </section>
          </div>

          <section className="card admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Program outcomes</h2>
                <p className="muted">Education, health, and follow-up metrics.</p>
              </div>
              <Link className="btn" to="/app/reports">
                View detailed reports
              </Link>
            </div>

            <div className="admin-outcome-grid">
              <div className="admin-mini-metric">
                <span>Avg education progress</span>
                <strong>{insights?.education.avgProgressPercent == null ? "-" : `${insights.education.avgProgressPercent}%`}</strong>
              </div>
              <div className="admin-mini-metric">
                <span>Avg health score</span>
                <strong>{insights?.health.avgGeneralHealthScore ?? "-"}</strong>
              </div>
              <div className="admin-mini-metric">
                <span>Open incident follow-ups</span>
                <strong>{formatCompact(insights?.incidents90d.openFollowUps)}</strong>
              </div>
            </div>

            <div className="admin-service-pillars">
              <span>Caring: {insights?.servicesPillarMentions.caring ?? "-"}</span>
              <span>Healing: {insights?.servicesPillarMentions.healing ?? "-"}</span>
              <span>Teaching: {insights?.servicesPillarMentions.teaching ?? "-"}</span>
              <span>Legal: {insights?.servicesPillarMentions.legal ?? "-"}</span>
            </div>
          </section>
      </div>
    </div>
  );
}
