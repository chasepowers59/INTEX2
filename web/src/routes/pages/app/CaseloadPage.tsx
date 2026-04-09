import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type ResidentRow = {
  residentId: number;
  displayName: string;
  caseStatus: string;
  caseCategory: string | null;
  safehouseId: number;
  safehouseName: string;
  assignedSocialWorker: string | null;
};

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
type MlPred = { entityId: number; label: string | null };
type OpsAlerts = { items: { residentId: number; reasons: string[] }[] };
type ResidentFull = {
  residentId: number;
  displayName: string;
  caseStatus: string;
  caseCategory: string | null;
  subCategory: string | null;
  safehouseId: number;
  admissionDate: string | null;
  assignedSocialWorker: string | null;
  isReintegrated: boolean;
};

export function CaseloadPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const [status, setStatus] = useState<string>("Active");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Paged<ResidentRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [riskByResident, setRiskByResident] = useState<Map<number, string>>(new Map());
  const [readinessByResident, setReadinessByResident] = useState<Map<number, string>>(new Map());
  const [opsByResident, setOpsByResident] = useState<Map<number, string[]>>(new Map());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("OnHold");
  const [page, setPage] = useState(1);
  const [newResident, setNewResident] = useState({
    displayName: "",
    caseCategory: "",
    referralSource: "",
    referringAgencyPerson: "",
    assignedSocialWorker: "",
    initialRiskLevel: "Medium",
    currentRiskLevel: "Medium",
    familyIs4ps: false,
    familySoloParent: false,
    familyIndigenous: false,
    familyInformalSettler: false,
  });

  const load = async () => {
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await apiFetch<Paged<ResidentRow>>(`/api/residents?${params.toString()}`, { token: auth.token ?? undefined });
    setData(res);
  };

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const [risk, readiness, ops] = await Promise.all([
          apiFetch<MlPred[]>("/api/ml/predictions?type=resident_incident_30d&take=200", { token: auth.token ?? undefined }),
          apiFetch<MlPred[]>("/api/ml/predictions?type=resident_reintegration_readiness&take=200", { token: auth.token ?? undefined }),
          apiFetch<OpsAlerts>("/api/analytics/ops-alerts?take=100", { token: auth.token ?? undefined }),
        ]);
        setRiskByResident(new Map(risk.map((x) => [x.entityId, x.label ?? "Unknown"])));
        setReadinessByResident(new Map(readiness.map((x) => [x.entityId, x.label ?? "Unknown"])));
        setOpsByResident(new Map(ops.items.map((x) => [x.residentId, x.reasons])));
      } catch {
        // non-blocking enhancements
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));
  const pageRows = (data?.items ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Caseload Inventory</h1>
        <p className="muted">Filter and search residents by status, safehouse, category, and more.</p>

        {error ? <div className="badge danger">{error}</div> : null}

        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span className="muted">Case status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="OnHold">OnHold</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 220 }}>
            <span className="muted">Search</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Resident name or social worker…" />
          </label>
          <button className="btn" style={{ alignSelf: "end" }} onClick={() => void load()}>
            Apply
          </button>
          <RequireRole role="Admin">
            <button className="btn primary" style={{ alignSelf: "end" }} onClick={async () => {
              if (!newResident.displayName.trim()) return setError("Display name required.");
              try {
                await apiFetch<void>("/api/residents", {
                  method: "POST",
                  token: auth.token ?? undefined,
                  body: JSON.stringify({
                    displayName: newResident.displayName.trim(),
                    caseStatus: "Active",
                    caseCategory: newResident.caseCategory.trim() || null,
                    subCategory: null,
                    safehouseId: 1,
                    admissionDate: null,
                    assignedSocialWorker: newResident.assignedSocialWorker.trim() || null,
                    referralSource: newResident.referralSource.trim() || null,
                    referringAgencyPerson: newResident.referringAgencyPerson.trim() || null,
                    initialRiskLevel: newResident.initialRiskLevel,
                    currentRiskLevel: newResident.currentRiskLevel,
                    familyIs4ps: newResident.familyIs4ps,
                    familySoloParent: newResident.familySoloParent,
                    familyIndigenous: newResident.familyIndigenous,
                    familyInformalSettler: newResident.familyInformalSettler,
                    isReintegrated: false,
                  }),
                });
                await load();
              } catch (e) { setError((e as Error).message); }
            }}>Add resident</button>
          </RequireRole>
        </div>
        <RequireRole role="Admin">
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" placeholder="Display name" value={newResident.displayName} onChange={(e) => setNewResident((p) => ({ ...p, displayName: e.target.value }))} />
            <input className="input" placeholder="Case category" value={newResident.caseCategory} onChange={(e) => setNewResident((p) => ({ ...p, caseCategory: e.target.value }))} />
            <input className="input" placeholder="Referral source" value={newResident.referralSource} onChange={(e) => setNewResident((p) => ({ ...p, referralSource: e.target.value }))} />
            <input className="input" placeholder="Referring agency/person" value={newResident.referringAgencyPerson} onChange={(e) => setNewResident((p) => ({ ...p, referringAgencyPerson: e.target.value }))} />
            <input className="input" placeholder="Assigned social worker" value={newResident.assignedSocialWorker} onChange={(e) => setNewResident((p) => ({ ...p, assignedSocialWorker: e.target.value }))} />
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <select className="input" value={newResident.initialRiskLevel} onChange={(e) => setNewResident((p) => ({ ...p, initialRiskLevel: e.target.value }))}>
              <option value="Low">Initial risk: Low</option><option value="Medium">Initial risk: Medium</option><option value="High">Initial risk: High</option>
            </select>
            <select className="input" value={newResident.currentRiskLevel} onChange={(e) => setNewResident((p) => ({ ...p, currentRiskLevel: e.target.value }))}>
              <option value="Low">Current risk: Low</option><option value="Medium">Current risk: Medium</option><option value="High">Current risk: High</option>
            </select>
            <label className="row"><input type="checkbox" checked={newResident.familyIs4ps} onChange={(e) => setNewResident((p) => ({ ...p, familyIs4ps: e.target.checked }))} /> 4Ps</label>
            <label className="row"><input type="checkbox" checked={newResident.familySoloParent} onChange={(e) => setNewResident((p) => ({ ...p, familySoloParent: e.target.checked }))} /> Solo parent</label>
            <label className="row"><input type="checkbox" checked={newResident.familyIndigenous} onChange={(e) => setNewResident((p) => ({ ...p, familyIndigenous: e.target.checked }))} /> Indigenous</label>
            <label className="row"><input type="checkbox" checked={newResident.familyInformalSettler} onChange={(e) => setNewResident((p) => ({ ...p, familyInformalSettler: e.target.checked }))} /> Informal settler</label>
          </div>
        </RequireRole>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Resident</th>
                <th>Status</th>
                <th>Category</th>
                <th>Milestones</th>
                <th>Safehouse</th>
                <th>Social worker</th>
                <th style={{ width: 260 }}>Quick links</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((x) => (
                <tr key={x.residentId}>
                  <td data-label="Select">
                    <RequireRole role="Admin">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(x.residentId)}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked ? [...prev, x.residentId] : prev.filter((id) => id !== x.residentId)
                          );
                        }}
                      />
                    </RequireRole>
                  </td>
                  <td data-label="Resident" style={{ fontWeight: 700 }}>
                    {x.displayName}
                  </td>
                  <td data-label="Status">
                    <span className="badge">{x.caseStatus}</span>
                  </td>
                  <td data-label="Category" className="muted">
                    {x.caseCategory ?? "—"}
                  </td>
                  <td data-label="Milestones">
                    {(() => {
                      const risks = (opsByResident.get(x.residentId) ?? []).join(" ").toLowerCase();
                      const health: "Red" | "Yellow" | "Green" = risks.includes("check-in due")
                        ? "Red"
                        : risks.length > 0
                          ? "Yellow"
                          : "Green";
                      const counseling: "Red" | "Yellow" | "Green" = risks.includes("overdue") ? "Red" : "Green";
                      const readiness = readinessByResident.get(x.residentId) ?? "Unknown";
                      const reintegration = readiness.toLowerCase().includes("high") ? "Green" : readiness.toLowerCase().includes("low") ? "Red" : "Yellow";
                      const riskBand = riskByResident.get(x.residentId) ?? "Unknown";
                      return (
                        <div className="row" style={{ gap: 6 }}>
                          <span className={`badge ${health === "Red" ? "danger" : health === "Green" ? "ok" : "warn"}`}>Health {health}</span>
                          <span className={`badge ${counseling === "Red" ? "danger" : counseling === "Green" ? "ok" : "warn"}`}>Counseling {counseling}</span>
                          <span className={`badge ${reintegration === "Red" ? "danger" : reintegration === "Green" ? "ok" : "warn"}`}>Reintegration {reintegration}</span>
                          <span className="badge">Risk {riskBand}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td data-label="Safehouse" className="muted">
                    {x.safehouseName}
                  </td>
                  <td data-label="Social worker" className="muted">
                    {x.assignedSocialWorker ?? "—"}
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
              {data && pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    No residents found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
        <RequireRole role="Admin">
          <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
              <span className="muted">Bulk status update</span>
              <select className="input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="OnHold">OnHold</option>
                <option value="Closed">Closed</option>
                <option value="Active">Active</option>
              </select>
            </label>
            <button
              className="btn"
              disabled={selectedIds.length === 0}
              onClick={async () => {
                setError(null);
                try {
                  for (const id of selectedIds) {
                    const resident = await apiFetch<ResidentFull>(`/api/residents/${id}`, { token: auth.token ?? undefined });
                    await apiFetch(`/api/residents/${id}`, {
                      method: "PUT",
                      token: auth.token ?? undefined,
                      body: JSON.stringify({ ...resident, caseStatus: bulkStatus }),
                    });
                  }
                  setSelectedIds([]);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Apply to {selectedIds.length} selected
            </button>
          </div>
        </RequireRole>
      </div>
    </div>
  );
}
