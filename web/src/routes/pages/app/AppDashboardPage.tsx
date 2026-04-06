import React, { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { apiFetch } from "../../../lib/api";

type Summary = {
  activeResidents: number;
  recentDonations: number;
  upcomingConferences: number;
  bySafehouse: { safehouseId: number; activeResidents: number }[];
};

export function AppDashboardPage() {
  const auth = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<Summary>("/api/admin-dashboard/summary", { token: auth.token ?? undefined });
        setData(res);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>
        <p className="muted">
          Command center view for leadership: residents across safehouses, donation activity, and upcoming case
          conferences.
        </p>
        {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="row">
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div className="muted">Active residents</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.activeResidents ?? "—"}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div className="muted">Monetary donations (last 30d)</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.recentDonations ?? "—"}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div className="muted">Upcoming conferences (14d)</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.upcomingConferences ?? "—"}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>By safehouse (active residents)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Safehouse ID</th>
                <th>Active residents</th>
              </tr>
            </thead>
            <tbody>
              {(data?.bySafehouse ?? []).map((x) => (
                <tr key={x.safehouseId}>
                  <td data-label="Safehouse ID">{x.safehouseId}</td>
                  <td data-label="Active residents">{x.activeResidents}</td>
                </tr>
              ))}
              {data && data.bySafehouse.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    No data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
