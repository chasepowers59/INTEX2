import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { formatSiteCurrency } from "../../../lib/currency";

type DonorRiskRow = {
  supporterId: number;
  displayName: string;
  email: string | null;
  phone?: string | null;
  supporterType: string;
  riskScore: number;
  riskBand: string | null;
};

type DonorUpgradeRow = {
  supporterId: number;
  displayName: string;
  email: string | null;
  phone?: string | null;
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

function splitDisplayLabel(value: string) {
  const match = value.match(/^(.*?)(?:\s+(\d{8}_\d{6}-\d+))$/);
  if (!match) return { primary: value };
  return { primary: match[1].trim() };
}

function donorFollowUpStep(row: DonorRiskRow) {
  const directContact = row.phone ? "Call or email this week" : "Email this week";
  if ((row.riskBand ?? "").toLowerCase().includes("high")) return directContact;
  if ((row.riskBand ?? "").toLowerCase().includes("medium")) return "Review recent giving and send follow-up";
  return "Keep in next outreach cycle";
}

function donorUpgradeStep(channel: string | null | undefined) {
  if (!channel) return "Prepare personalized ask";
  return `Use ${channel} for the next outreach`;
}

function residentNextStep(riskBand: string | null | undefined, readinessBand: string | null | undefined) {
  const risk = (riskBand ?? "").toLowerCase();
  const readiness = (readinessBand ?? "").toLowerCase();
  if (risk.includes("high")) return "Review case now and schedule follow-up";
  if (readiness.includes("low")) return "Focus on barriers before reintegration planning";
  if (readiness.includes("high")) return "Prepare reintegration review";
  return "Review in next case check";
}

function safehouseNextStep(row: SafehouseForecastRow) {
  const availableSpace =
    row.currentOccupancy !== null && row.capacityGirls !== null ? row.capacityGirls - row.currentOccupancy : null;
  if (availableSpace !== null && availableSpace <= 1) return "Review capacity and staffing";
  if (row.predictedIncidentsNextMonth >= 2) return "Monitor this safehouse closely next month";
  return "Keep on weekly operations review";
}

export function MlActionCenterPage() {
  const auth = useAuth();
  const token = auth.token ?? undefined;
  const DEFAULT_VISIBLE = 5;
  const [donorRisk, setDonorRisk] = useState<DonorRiskRow[]>([]);
  const [donorUpgrade, setDonorUpgrade] = useState<DonorUpgradeRow[]>([]);
  const [nextChannel, setNextChannel] = useState<NextChannelRow[]>([]);
  const [residentRisk, setResidentRisk] = useState<ResidentRiskRow[]>([]);
  const [residentReadiness, setResidentReadiness] = useState<ResidentReadinessRow[]>([]);
  const [safehouseForecast, setSafehouseForecast] = useState<SafehouseForecastRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAllResidents, setShowAllResidents] = useState(false);
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [showAllOutreach, setShowAllOutreach] = useState(false);
  const [showAllSafehouses, setShowAllSafehouses] = useState(false);

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
      else errs.push(`Donor retention: ${(riskRes.reason as Error).message}`);
      if (upgradeRes.status === "fulfilled") setDonorUpgrade(upgradeRes.value);
      else errs.push(`Donor outreach: ${(upgradeRes.reason as Error).message}`);
      if (channelRes.status === "fulfilled") setNextChannel(channelRes.value);
      else errs.push(`Channel recommendations: ${(channelRes.reason as Error).message}`);
      if (residentRiskRes.status === "fulfilled") setResidentRisk(residentRiskRes.value);
      else errs.push(`Resident review: ${(residentRiskRes.reason as Error).message}`);
      if (readinessRes.status === "fulfilled") setResidentReadiness(readinessRes.value);
      else errs.push(`Resident readiness: ${(readinessRes.reason as Error).message}`);
      if (safehouseRes.status === "fulfilled") setSafehouseForecast(safehouseRes.value);
      else errs.push(`Safehouse attention: ${(safehouseRes.reason as Error).message}`);

      setError(errs.length ? errs.join(" | ") : null);
    })();
  }, [token]);

  const readinessMap = useMemo(
    () => new Map(residentReadiness.map((row) => [row.residentId, row])),
    [residentReadiness],
  );
  const channelMap = useMemo(
    () => new Map(nextChannel.map((row) => [row.supporterId, row])),
    [nextChannel],
  );
  const visibleResidents = showAllResidents ? residentRisk : residentRisk.slice(0, DEFAULT_VISIBLE);
  const visibleDonors = showAllDonors ? donorRisk : donorRisk.slice(0, DEFAULT_VISIBLE);
  const visibleOutreach = showAllOutreach ? donorUpgrade : donorUpgrade.slice(0, DEFAULT_VISIBLE);
  const visibleSafehouses = showAllSafehouses ? safehouseForecast : safehouseForecast.slice(0, DEFAULT_VISIBLE);

  return (
    <div className="admin-page">
      <div className="card">
        <div className="admin-header-copy">
          <h1 style={{ marginTop: 0 }}>Action Center</h1>
          <p className="muted">A prioritized worklist for resident review, donor outreach, and safehouse planning.</p>
        </div>
        {error ? (
          <div className="badge danger" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="admin-kpi-grid">
        <div className="card admin-kpi tone-cream">
          <div className="muted">Residents needing review</div>
          <div className="admin-kpi-value">{residentRisk.length}</div>
          <a className="auth-link-subtle" href="#action-center-residents">See names</a>
        </div>
        <div className="card admin-kpi tone-cream">
          <div className="muted">Donors needing follow-up</div>
          <div className="admin-kpi-value">{donorRisk.length}</div>
          <a className="auth-link-subtle" href="#action-center-followup">See names</a>
        </div>
        <div className="card admin-kpi tone-cream">
          <div className="muted">Outreach opportunities</div>
          <div className="admin-kpi-value">{donorUpgrade.length}</div>
          <a className="auth-link-subtle" href="#action-center-outreach">See names</a>
        </div>
        <div className="card admin-kpi tone-cream">
          <div className="muted">Safehouses needing attention</div>
          <div className="admin-kpi-value">{safehouseForecast.length}</div>
          <a className="auth-link-subtle" href="#action-center-safehouses">See names</a>
        </div>
      </div>

      <div className="card" id="action-center-residents">
        <div className="admin-header-copy">
          <h2 style={{ marginTop: 0 }}>Residents needing review</h2>
          <p className="muted">Residents who may need a case review, follow-up, or reintegration check.</p>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table table-preserve-mobile">
            <thead>
                <tr>
                  <th>Resident</th>
                  <th>Risk</th>
                  <th>Readiness</th>
                  <th>Safehouse</th>
                  <th>Next step</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleResidents.map((row) => {
                  const readiness = readinessMap.get(row.residentId);
                  const name = splitDisplayLabel(row.displayName);
                  return (
                    <tr key={row.residentId}>
                      <td data-label="Resident" style={{ fontWeight: 700 }}>
                        {name.primary}
                        <div className="action-center-contact">
                          <span className="muted">{row.assignedSocialWorker ?? "-"}</span>
                        </div>
                      </td>
                    <td data-label="Risk">
                      <span className="badge">{row.riskBand ?? "Review"}</span>
                    </td>
                    <td data-label="Readiness">
                      {readiness ? <span className="badge">{readiness.readinessBand ?? "Review"}</span> : "-"}
                    </td>
                    <td data-label="Safehouse" className="muted">{row.safehouseId}</td>
                    <td data-label="Next step" className="muted">
                      {residentNextStep(row.riskBand, readiness?.readinessBand)}
                    </td>
                    <td data-label="Actions">
                      <div className="row admin-compact-actions">
                        <Link className="btn admin-table-action" to={`/app/residents/${row.residentId}/process-recordings`}>
                          Recordings
                        </Link>
                        <Link className="btn admin-table-action" to={`/app/residents/${row.residentId}/home-visits`}>
                          Visits
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {residentRisk.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">No residents need review right now.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {residentRisk.length > DEFAULT_VISIBLE ? (
          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => setShowAllResidents((open) => !open)}>
              {showAllResidents ? "Show fewer" : `Show all ${residentRisk.length}`}
            </button>
          </div>
        ) : null}
      </div>

      <div className="admin-two-column">
        <div className="card" id="action-center-followup">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Donors needing follow-up</h2>
            <p className="muted">Supporters who may need retention-focused outreach.</p>
          </div>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table table-preserve-mobile">
              <thead>
                <tr>
                  <th>Supporter</th>
                  <th>Risk</th>
                  <th>Type</th>
                  <th>Next step</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDonors.map((row) => (
                    <tr key={row.supporterId}>
                      {(() => {
                        const name = splitDisplayLabel(row.displayName);
                        return (
                          <>
                      <td data-label="Supporter" style={{ fontWeight: 700 }}>
                        {name.primary}
                        <div className="action-center-contact">
                          <span className="muted">{row.email ?? "-"}</span>
                          <span className="muted">{row.phone ?? row.supporterType}</span>
                        </div>
                      </td>
                      <td data-label="Risk">
                        <span className="badge">{row.riskBand ?? "Review"}</span>
                      </td>
                      <td data-label="Type" className="muted">{row.supporterType}</td>
                      <td data-label="Next step" className="muted">{donorFollowUpStep(row)}</td>
                      <td data-label="Actions">
                        <div className="row admin-compact-actions">
                          {row.email ? (
                            <a
                              className="btn admin-table-action"
                              href={`mailto:${row.email}?subject=${encodeURIComponent("Checking in from Steps of Hope")}`}
                            >
                              Email
                            </a>
                          ) : null}
                          <Link className="btn admin-table-action" to={`/app/donors?open=${row.supporterId}`}>
                            Open donor
                          </Link>
                        </div>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                {donorRisk.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">No donor follow-up rows available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {donorRisk.length > DEFAULT_VISIBLE ? (
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowAllDonors((open) => !open)}>
                {showAllDonors ? "Show fewer" : `Show all ${donorRisk.length}`}
              </button>
            </div>
          ) : null}
        </div>

        <div className="card" id="action-center-outreach">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Donor outreach opportunities</h2>
            <p className="muted">Suggested asks and the best next channel to use.</p>
          </div>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table table-preserve-mobile">
              <thead>
                <tr>
                  <th>Supporter</th>
                  <th>Suggested ask</th>
                  <th>Channel</th>
                  <th>Next step</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
            <tbody>
                {visibleOutreach.map((row) => {
                  const channel = channelMap.get(row.supporterId);
                  const name = splitDisplayLabel(row.displayName);
                  return (
                      <tr key={row.supporterId}>
                      <td data-label="Supporter" style={{ fontWeight: 700 }}>
                        {name.primary}
                        <div className="action-center-contact">
                          <span className="muted">{row.phone ?? row.email ?? "-"}</span>
                          <span className="muted">
                            {row.donationsSoFar != null ? `${row.donationsSoFar} gifts so far` : "Giving history pending"}
                          </span>
                      </div>
                    </td>
                      <td data-label="Suggested ask">
                        {row.predictedNextAmount != null
                          ? formatSiteCurrency(Math.round(row.predictedNextAmount))
                          : row.askTier ?? "-"}
                      </td>
                      <td data-label="Channel" className="muted">{channel?.predictedChannel ?? "-"}</td>
                      <td data-label="Next step" className="muted">
                        {donorUpgradeStep(channel?.predictedChannel)}
                      </td>
                      <td data-label="Actions">
                        <div className="row admin-compact-actions">
                          {row.email ? (
                            <a
                              className="btn admin-table-action"
                              href={`mailto:${row.email}?subject=${encodeURIComponent("Support opportunity from Steps of Hope")}`}
                            >
                              Email
                            </a>
                          ) : null}
                          <Link className="btn admin-table-action" to={`/app/donors?open=${row.supporterId}`}>
                            Open donor
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {donorUpgrade.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">No donor outreach rows available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {donorUpgrade.length > DEFAULT_VISIBLE ? (
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowAllOutreach((open) => !open)}>
                {showAllOutreach ? "Show fewer" : `Show all ${donorUpgrade.length}`}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card" id="action-center-safehouses">
        <div className="admin-header-copy">
          <h2 style={{ marginTop: 0 }}>Safehouses needing attention</h2>
          <p className="muted">Safehouses that may need closer operational review next month.</p>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table table-preserve-mobile">
            <thead>
                <tr>
                  <th>Safehouse</th>
                  <th>Current load</th>
                  <th>Expected attention</th>
                  <th>Next step</th>
                </tr>
              </thead>
            <tbody>
              {visibleSafehouses.map((row) => (
                <tr key={row.safehouseId}>
                  <td data-label="Safehouse" style={{ fontWeight: 700 }}>
                    {row.name}
                    <div className="muted" style={{ marginTop: 4 }}>{row.city ?? "-"}</div>
                  </td>
                  <td data-label="Current load" className="muted">
                    {row.currentOccupancy ?? "-"}
                    {row.capacityGirls != null ? ` / ${row.capacityGirls}` : ""}
                  </td>
                  <td data-label="Expected attention">{row.predictedIncidentsNextMonth.toFixed(1)}</td>
                  <td data-label="Next step" className="muted">{safehouseNextStep(row)}</td>
                </tr>
              ))}
              {safehouseForecast.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">No safehouse attention rows available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {safehouseForecast.length > DEFAULT_VISIBLE ? (
          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => setShowAllSafehouses((open) => !open)}>
              {showAllSafehouses ? "Show fewer" : `Show all ${safehouseForecast.length}`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
