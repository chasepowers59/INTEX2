import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type DonorRiskRow = {
  supporterId: number;
  displayName: string;
  email: string | null;
  supporterType: string;
  riskScore: number;
  riskBand: string | null;
};

type DonorUpgradeRow = {
  supporterId: number;
  displayName: string;
  email: string | null;
  predictedNextAmount: number | null;
  askTier: string | null;
  upgradeRatio: number | null;
  donationsSoFar: number | null;
};

type NextChannelRow = {
  supporterId: number;
  displayName: string;
  email: string | null;
  predictedChannel: string;
  confidence: number;
  campaignName: string | null;
};

type ResidentRiskRow = {
  residentId: number;
  displayName: string;
  safehouseId: number;
  assignedSocialWorker: string | null;
  riskScore: number;
  riskBand: string | null;
};

type ResidentReadinessRow = {
  residentId: number;
  displayName: string;
  safehouseId: number | null;
  assignedSocialWorker: string | null;
  readinessScore: number;
  readinessBand: string | null;
};

type SafehouseForecastRow = {
  safehouseId: number;
  name: string;
  city: string | null;
  currentOccupancy: number | null;
  capacityGirls: number | null;
  predictedIncidentsNextMonth: number;
  incidentsP10: number | null;
  incidentsP90: number | null;
  activeResidentsNext: number | null;
};

export function MlActionCenterPage() {
  const auth = useAuth();
  const token = auth.token ?? undefined;

  const [donorRisk, setDonorRisk] = useState<DonorRiskRow[]>([]);
  const [donorUpgrade, setDonorUpgrade] = useState<DonorUpgradeRow[]>([]);
  const [nextChannel, setNextChannel] = useState<NextChannelRow[]>([]);
  const [residentRisk, setResidentRisk] = useState<ResidentRiskRow[]>([]);
  const [residentReadiness, setResidentReadiness] = useState<ResidentReadinessRow[]>([]);
  const [safehouseForecast, setSafehouseForecast] = useState<SafehouseForecastRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [riskRes, upgradeRes, channelRes, residentRiskRes, readinessRes, safehouseRes] = await Promise.allSettled([
        apiFetch<DonorRiskRow[]>("/api/ml/donor-lapse/top?take=12", { token }),
        apiFetch<DonorUpgradeRow[]>("/api/ml/donor-upgrade/top?take=12", { token }),
        apiFetch<NextChannelRow[]>("/api/ml/next-channel/top?take=12", { token }),
        apiFetch<ResidentRiskRow[]>("/api/ml/resident-risk/top?take=12", { token }),
        apiFetch<ResidentReadinessRow[]>("/api/ml/resident-readiness/top?take=12", { token }),
        apiFetch<SafehouseForecastRow[]>("/api/ml/safehouse-forecast/top?take=8", { token }),
      ]);

      const errs: string[] = [];
      if (riskRes.status === "fulfilled") setDonorRisk(riskRes.value);
      else errs.push(`Donor lapse: ${(riskRes.reason as Error).message}`);
      if (upgradeRes.status === "fulfilled") setDonorUpgrade(upgradeRes.value);
      else errs.push(`Donor upgrade: ${(upgradeRes.reason as Error).message}`);
      if (channelRes.status === "fulfilled") setNextChannel(channelRes.value);
      else errs.push(`Next channel: ${(channelRes.reason as Error).message}`);
      if (residentRiskRes.status === "fulfilled") setResidentRisk(residentRiskRes.value);
      else errs.push(`Resident risk: ${(residentRiskRes.reason as Error).message}`);
      if (readinessRes.status === "fulfilled") setResidentReadiness(readinessRes.value);
      else errs.push(`Readiness: ${(readinessRes.reason as Error).message}`);
      if (safehouseRes.status === "fulfilled") setSafehouseForecast(safehouseRes.value);
      else errs.push(`Safehouse forecast: ${(safehouseRes.reason as Error).message}`);

      setError(errs.length ? errs.join(" | ") : null);
    })();
  }, [token]);

  return (
    <div className="admin-page">
      <div className="card">
        <div className="admin-header-copy">
          <h1 style={{ marginTop: 0 }}>Action Center</h1>
          <p className="muted">Retention, growth, resident triage, and safehouse pressure.</p>
        </div>
        {error ? (
          <div className="badge danger" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="card tone-peach" style={{ flex: "1 1 220px" }}>
          <div className="muted">Donors needing retention review</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{donorRisk.length}</div>
        </div>
        <div className="card tone-aqua" style={{ flex: "1 1 220px" }}>
          <div className="muted">Upgrade opportunities</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{donorUpgrade.length}</div>
        </div>
        <div className="card tone-berry" style={{ flex: "1 1 220px" }}>
          <div className="muted">Residents flagged</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{residentRisk.length + residentReadiness.length}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Donor retention risk</h2>
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
              {donorRisk.map((row) => (
                <tr key={row.supporterId}>
                  <td data-label="Supporter" style={{ fontWeight: 700 }}>{row.displayName}</td>
                  <td data-label="Band"><span className="badge">{row.riskBand ?? "Unlabeled"}</span></td>
                  <td data-label="Score">{row.riskScore.toFixed(4)}</td>
                  <td data-label="Email" className="muted">{row.email ?? "-"}</td>
                </tr>
              ))}
              {donorRisk.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">No donor retention rows available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Upgrade asks and next-best channel</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Supporter</th>
                <th>Suggested ask</th>
                <th>Ask tier</th>
                <th>Next channel</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {donorUpgrade.map((row) => {
                const channel = nextChannel.find((item) => item.supporterId === row.supporterId);
                return (
                  <tr key={row.supporterId}>
                    <td data-label="Supporter" style={{ fontWeight: 700 }}>{row.displayName}</td>
                    <td data-label="Suggested ask">
                      {row.predictedNextAmount != null
                        ? `PHP ${row.predictedNextAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "-"}
                    </td>
                    <td data-label="Ask tier"><span className="badge">{row.askTier ?? "Review"}</span></td>
                    <td data-label="Next channel" className="muted">{channel?.predictedChannel ?? "-"}</td>
                    <td data-label="Confidence">
                      {channel?.confidence != null ? channel.confidence.toFixed(3) : "-"}
                    </td>
                  </tr>
                );
              })}
              {donorUpgrade.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No donor growth rows available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Resident risk and readiness</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Risk</th>
                <th>Readiness</th>
                <th>Safehouse</th>
                <th>Social worker</th>
              </tr>
            </thead>
            <tbody>
              {residentRisk.map((row) => {
                const readiness = residentReadiness.find((item) => item.residentId === row.residentId);
                return (
                  <tr key={row.residentId}>
                    <td data-label="Resident" style={{ fontWeight: 700 }}>{row.displayName}</td>
                    <td data-label="Risk">
                      <span className="badge">{row.riskBand ?? "Unlabeled"}</span> {row.riskScore.toFixed(3)}
                    </td>
                    <td data-label="Readiness">
                      {readiness ? (
                        <>
                          <span className="badge">{readiness.readinessBand ?? "Unlabeled"}</span> {readiness.readinessScore.toFixed(3)}
                        </>
                      ) : "-"}
                    </td>
                    <td data-label="Safehouse" className="muted">{row.safehouseId}</td>
                    <td data-label="Social worker" className="muted">{row.assignedSocialWorker ?? "-"}</td>
                  </tr>
                );
              })}
              {residentRisk.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No resident triage rows available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Safehouse incident forecast</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Safehouse</th>
                <th>Predicted incidents</th>
                <th>Range</th>
                <th>Current occupancy</th>
                <th>Projected residents</th>
              </tr>
            </thead>
            <tbody>
              {safehouseForecast.map((row) => (
                <tr key={row.safehouseId}>
                  <td data-label="Safehouse" style={{ fontWeight: 700 }}>
                    {row.name}
                    {row.city ? <span className="muted"> · {row.city}</span> : null}
                  </td>
                  <td data-label="Predicted incidents">{row.predictedIncidentsNextMonth.toFixed(2)}</td>
                  <td data-label="Range" className="muted">
                    {row.incidentsP10 != null && row.incidentsP90 != null
                      ? `${row.incidentsP10.toFixed(2)} to ${row.incidentsP90.toFixed(2)}`
                      : "-"}
                  </td>
                  <td data-label="Current occupancy" className="muted">
                    {row.currentOccupancy ?? "-"}
                    {row.capacityGirls != null ? ` / ${row.capacityGirls}` : ""}
                  </td>
                  <td data-label="Projected residents" className="muted">{row.activeResidentsNext ?? "-"}</td>
                </tr>
              ))}
              {safehouseForecast.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No safehouse forecast rows available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
