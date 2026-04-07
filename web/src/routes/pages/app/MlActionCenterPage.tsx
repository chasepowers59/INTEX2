import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type DonorRiskRow = {
  supporterId: number;
  displayName: string;
  email: string | null;
  supporterType: string;
  isActive: boolean;
  riskScore: number;
  riskBand: string | null;
  createdAtUtc: string;
};

type ResidentRiskRow = {
  residentId: number;
  displayName: string;
  caseStatus: string;
  caseCategory: string | null;
  safehouseId: number;
  assignedSocialWorker: string | null;
  riskScore: number;
  riskBand: string | null;
  createdAtUtc: string;
};

export function MlActionCenterPage() {
  const auth = useAuth();
  const [donors, setDonors] = useState<DonorRiskRow[]>([]);
  const [residents, setResidents] = useState<ResidentRiskRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const d = await apiFetch<DonorRiskRow[]>("/api/ml/donor-lapse/top?take=20", { token: auth.token ?? undefined });
        const r = await apiFetch<ResidentRiskRow[]>("/api/ml/resident-risk/top?take=20", { token: auth.token ?? undefined });
        setDonors(d);
        setResidents(r);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Action Center (ML)</h1>
        <p className="muted">
          Two staff views that align with the project goal: retain/grow donations and prevent residents from
          falling through the cracks.
        </p>
        {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Donor lapse risk (next 90 days)</h2>
        <p className="muted">
          Use this to prioritize outreach (thank-you, impact update, or tailored ask) to prevent lapses.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Supporter</th>
                <th>Band</th>
                <th>Score</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((x) => (
                <tr key={x.supporterId}>
                  <td data-label="Supporter" style={{ fontWeight: 700 }}>
                    {x.displayName}
                  </td>
                  <td data-label="Band">
                    <span className="badge">{x.riskBand ?? "—"}</span>
                  </td>
                  <td data-label="Score">{x.riskScore.toFixed(4)}</td>
                  <td data-label="Email" className="muted">
                    {x.email ?? "—"}
                  </td>
                </tr>
              ))}
              {donors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No donor risk predictions imported yet. Import `donor_lapse_90d` and refresh.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Resident incident risk (next 30 days)</h2>
        <p className="muted">
          Use this to triage follow-ups, safety planning, and case conference priorities.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Band</th>
                <th>Score</th>
                <th>Safehouse</th>
                <th>Worker</th>
              </tr>
            </thead>
            <tbody>
              {residents.map((x) => (
                <tr key={x.residentId}>
                  <td data-label="Resident" style={{ fontWeight: 700 }}>
                    {x.displayName}
                  </td>
                  <td data-label="Band">
                    <span className="badge">{x.riskBand ?? "—"}</span>
                  </td>
                  <td data-label="Score">{x.riskScore.toFixed(4)}</td>
                  <td data-label="Safehouse" className="muted">
                    {x.safehouseId}
                  </td>
                  <td data-label="Worker" className="muted">
                    {x.assignedSocialWorker ?? "—"}
                  </td>
                </tr>
              ))}
              {residents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No resident risk predictions imported yet. Import `resident_incident_30d` and refresh.
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

