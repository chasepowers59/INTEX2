import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type DonationsByMonth = { year: number; month: number; totalAmount: number; count: number };
type ResidentStatus = { status: string; count: number };
type SafehousePerf = { safehouseId: number; activeResidents: number; reintegratedResidents: number };
type ReintegrationRate = { total: number; reintegrated: number; rate: number };

export function ReportsPage() {
  const auth = useAuth();
  const [donations, setDonations] = useState<DonationsByMonth[]>([]);
  const [statuses, setStatuses] = useState<ResidentStatus[]>([]);
  const [safehouses, setSafehouses] = useState<SafehousePerf[]>([]);
  const [reintegration, setReintegration] = useState<ReintegrationRate | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          Aggregated insights and trends to support decisions: donation trends, resident status breakdown, and more.
        </p>
        {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Donation trends (12 months)</h2>
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
    </div>
  );
}
