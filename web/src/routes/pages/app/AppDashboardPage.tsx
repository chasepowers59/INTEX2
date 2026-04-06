import React, { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { apiFetch } from "../../../lib/api";
import { StatCard } from "../../../components/ui/StatCard";
import { Link, Navigate } from "react-router-dom";

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

export function AppDashboardPage() {
  const auth = useAuth();
  const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
  const [data, setData] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<OpsAlerts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token || !staff) return;
    (async () => {
      try {
        const res = await apiFetch<Overview>("/api/analytics/overview", { token: auth.token ?? undefined });
        setData(res);
        const ops = await apiFetch<OpsAlerts>("/api/analytics/ops-alerts?take=10", { token: auth.token ?? undefined });
        setAlerts(ops);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token, staff]);

  if (auth.hasRole("Donor") && !staff) {
    return <Navigate to="/app/donor" replace />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Leadership Dashboard</h1>
        <p className="muted">
          High-signal, privacy-first view of operations: follow-up health, donor momentum, and safety-critical alerts.
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
      </div>

      <div className="kpi-grid">
        <StatCard label="Active residents" value={data?.activeResidents ?? "—"} />
        <StatCard
          label="Donations (30d)"
          value={data ? `${data.donations30d.count}` : "—"}
          hint={data ? `₱${data.donations30d.totalAmount.toFixed(2)} total` : undefined}
          tone="brand"
        />
        <StatCard label="Check-ins due (30d)" value={data?.checkInsDue30d ?? "—"} tone="warn" />
        <StatCard label="Process recordings (7d)" value={data?.processRecordings7d ?? "—"} tone="ok" />
        <StatCard label="Case conferences (14d)" value={data?.upcomingConferences14d ?? "—"} />
        <StatCard
          label="Resident incident risk bands"
          value={data ? data.residentRisk.byBand.map((b) => `${b.band}:${b.count}`).slice(0, 3).join(" · ") || "—" : "—"}
          hint={data?.residentRisk.asOfUtc ? `As of ${new Date(data.residentRisk.asOfUtc).toLocaleString()}` : "No ML import yet"}
        />
      </div>

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
