import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
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
type FilterCatalogRow = {
  residentId: number;
  caseCategory: string | null;
  safehouseId: number;
  safehouseName: string;
};
type CaseloadFilters = {
  status: string;
  q: string;
  safehouseId: string;
  category: string;
};

function milestoneBadge(label: string, value: string, tone: "danger" | "warn" | "ok" | "") {
  return (
    <span className={`badge ${tone}`.trim()}>
      {label}: {value}
    </span>
  );
}

function getMilestoneSummary(reasons: string[], readinessLabel: string, riskBand: string) {
  const joinedReasons = reasons.join(" ").toLowerCase();

  const homeVisit =
    joinedReasons.includes("check-in due")
      ? { value: "Due now", tone: "danger" as const }
      : reasons.length > 0
        ? { value: "Watch", tone: "warn" as const }
        : { value: "On track", tone: "ok" as const };

  const counseling = joinedReasons.includes("overdue")
    ? { value: "Note overdue", tone: "danger" as const }
    : { value: "Current", tone: "ok" as const };

  const readiness = readinessLabel.toLowerCase().includes("high")
    ? { value: "Ready soon", tone: "ok" as const }
    : readinessLabel.toLowerCase().includes("low")
      ? { value: "Needs support", tone: "danger" as const }
      : { value: readinessLabel === "Unknown" ? "Review needed" : "In progress", tone: "warn" as const };

  const risk =
    riskBand.toLowerCase() === "high" || riskBand.toLowerCase() === "very high"
      ? { value: riskBand, tone: "danger" as const }
      : riskBand.toLowerCase() === "medium"
        ? { value: riskBand, tone: "warn" as const }
        : { value: riskBand, tone: "ok" as const };

  return { homeVisit, counseling, readiness, risk };
}

export function CaseloadPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const isAdmin = auth.hasRole("Admin");
  const [status, setStatus] = useState<string>("Active");
  const [q, setQ] = useState("");
  const [safehouseId, setSafehouseId] = useState("");
  const [category, setCategory] = useState("");
  const [data, setData] = useState<Paged<ResidentRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [riskByResident, setRiskByResident] = useState<Map<number, string>>(new Map());
  const [readinessByResident, setReadinessByResident] = useState<Map<number, string>>(new Map());
  const [opsByResident, setOpsByResident] = useState<Map<number, string[]>>(new Map());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("OnHold");
  const [page, setPage] = useState(1);
  const [filterCatalog, setFilterCatalog] = useState<FilterCatalogRow[]>([]);
  const [showNewResidentForm, setShowNewResidentForm] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<CaseloadFilters>({
    status: "Active",
    q: "",
    safehouseId: "",
    category: "",
  });
  const [newResident, setNewResident] = useState({
    displayName: "",
    caseCategory: "",
    safehouseId: "1",
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

  const load = async (requestedPage = page, filters = appliedFilters) => {
    setError(null);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (filters.safehouseId) params.set("safehouseId", filters.safehouseId);
    if (filters.category) params.set("category", filters.category);
    params.set("page", String(requestedPage));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await apiFetch<Paged<ResidentRow>>(`/api/residents?${params.toString()}`, { token: auth.token ?? undefined });
    setData(res);
  };

  const loadFilterCatalog = async () => {
    const catalog = await apiFetch<Paged<FilterCatalogRow>>("/api/residents?page=1&pageSize=300", {
      token: auth.token ?? undefined,
    });
    setFilterCatalog(catalog.items);
    const firstSafehouseId = catalog.items[0]?.safehouseId;
    if (firstSafehouseId != null) {
      setNewResident((prev) => ({
        ...prev,
        safehouseId: prev.safehouseId || String(firstSafehouseId),
      }));
    }
  };

  useEffect(() => {
    void load(1, appliedFilters);
    void loadFilterCatalog();
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

  useEffect(() => {
    void load(page, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const pageRows = data?.items ?? [];
  const dueNowCount = pageRows.filter((row) => (opsByResident.get(row.residentId) ?? []).some((reason) => reason.toLowerCase().includes("check-in due"))).length;
  const highRiskCount = pageRows.filter((row) => {
    const riskBand = (riskByResident.get(row.residentId) ?? "").toLowerCase();
    return riskBand === "high" || riskBand === "very high";
  }).length;
  const readinessWatchCount = pageRows.filter((row) => {
    const readiness = (readinessByResident.get(row.residentId) ?? "").toLowerCase();
    return readiness.includes("low") || readiness.includes("unknown");
  }).length;
  const safehouseOptions = [...new Map(filterCatalog.map((row) => [row.safehouseId, row.safehouseName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const categoryOptions = [...new Set(filterCatalog.map((row) => row.caseCategory).filter(Boolean) as string[])]
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="caseload-page">
      <div className="card">
        <div className="caseload-header">
          <div>
            <h1 style={{ marginTop: 0 }}>Caseload Inventory</h1>
            <p className="muted">Residents, milestones, and case activity.</p>
          </div>
          {isAdmin ? (
            <button className="btn primary" onClick={() => setShowNewResidentForm((open) => !open)}>
              {showNewResidentForm ? "Cancel" : "Add resident"}
            </button>
          ) : null}
        </div>
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {milestoneBadge("Home visit", "Due now", "danger")}
          {milestoneBadge("Counseling", "Current", "ok")}
          {milestoneBadge("Reintegration", "In progress", "warn")}
          {milestoneBadge("Risk", "High", "danger")}
        </div>
        <p className="muted caseload-helper-copy">
          Due now, current, in progress, and needs support.
        </p>

        {error ? <div className="badge danger">{error}</div> : null}

        <div className="card caseload-filter-card">
          <div style={{ fontWeight: 800 }}>Resident filters</div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>Status, search, safehouse, and category.</p>
        <div className="caseload-filter-grid">
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">Case status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="OnHold">OnHold</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">Search</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Resident name or social worker..." />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">Safehouse</span>
            <select className="input" value={safehouseId} onChange={(e) => setSafehouseId(e.target.value)}>
              <option value="">All safehouses</option>
              {safehouseOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">Case category</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="caseload-filter-actions">
          <button
            className="btn"
            onClick={() => {
              setPage(1);
              setAppliedFilters({ status, q, safehouseId, category });
            }}
          >
            Apply
          </button>
          <button
            className="btn"
            onClick={() => {
              setStatus("Active");
              setQ("");
              setSafehouseId("");
              setCategory("");
              setPage(1);
              setAppliedFilters({ status: "Active", q: "", safehouseId: "", category: "" });
            }}
          >
            Reset
          </button>
        </div>
        </div>
        <div className="caseload-summary-strip">
          <div className="caseload-summary-chip">
            <span>Residents shown</span>
            <strong>{pageRows.length}</strong>
          </div>
          <div className="caseload-summary-chip">
            <span>Due now</span>
            <strong>{dueNowCount}</strong>
          </div>
          <div className="caseload-summary-chip">
            <span>High risk</span>
            <strong>{highRiskCount}</strong>
          </div>
          <div className="caseload-summary-chip">
            <span>Needs support</span>
            <strong>{readinessWatchCount}</strong>
          </div>
        </div>
        {isAdmin && showNewResidentForm ? (
          <div className="caseload-modal-backdrop" onClick={() => setShowNewResidentForm(false)}>
          <div
            className="card caseload-intake-card caseload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="caseload-intake-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="caseload-intake-header">
              <div>
                <strong id="caseload-intake-title">Resident details</strong>
              </div>
              <button className="btn" onClick={() => setShowNewResidentForm(false)}>
                Cancel
              </button>
            </div>
            <div className="caseload-intake-grid">
              <input className="input" placeholder="Display name" value={newResident.displayName} onChange={(e) => setNewResident((p) => ({ ...p, displayName: e.target.value }))} />
              <input className="input" placeholder="Case category" value={newResident.caseCategory} onChange={(e) => setNewResident((p) => ({ ...p, caseCategory: e.target.value }))} />
              <select className="input" value={newResident.safehouseId} onChange={(e) => setNewResident((p) => ({ ...p, safehouseId: e.target.value }))}>
                <option value="">Select safehouse</option>
                {safehouseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <input className="input" placeholder="Referral source" value={newResident.referralSource} onChange={(e) => setNewResident((p) => ({ ...p, referralSource: e.target.value }))} />
              <input className="input" placeholder="Referring agency/person" value={newResident.referringAgencyPerson} onChange={(e) => setNewResident((p) => ({ ...p, referringAgencyPerson: e.target.value }))} />
              <input className="input" placeholder="Assigned social worker" value={newResident.assignedSocialWorker} onChange={(e) => setNewResident((p) => ({ ...p, assignedSocialWorker: e.target.value }))} />
            </div>
            <div className="caseload-intake-grid caseload-intake-grid--compact">
              <select className="input" value={newResident.initialRiskLevel} onChange={(e) => setNewResident((p) => ({ ...p, initialRiskLevel: e.target.value }))}>
                <option value="Low">Initial risk: Low</option>
                <option value="Medium">Initial risk: Medium</option>
                <option value="High">Initial risk: High</option>
              </select>
              <select className="input" value={newResident.currentRiskLevel} onChange={(e) => setNewResident((p) => ({ ...p, currentRiskLevel: e.target.value }))}>
                <option value="Low">Current risk: Low</option>
                <option value="Medium">Current risk: Medium</option>
                <option value="High">Current risk: High</option>
              </select>
            </div>
            <div className="caseload-flag-row">
              <label className="row"><input type="checkbox" checked={newResident.familyIs4ps} onChange={(e) => setNewResident((p) => ({ ...p, familyIs4ps: e.target.checked }))} /> 4Ps</label>
              <label className="row"><input type="checkbox" checked={newResident.familySoloParent} onChange={(e) => setNewResident((p) => ({ ...p, familySoloParent: e.target.checked }))} /> Solo parent</label>
              <label className="row"><input type="checkbox" checked={newResident.familyIndigenous} onChange={(e) => setNewResident((p) => ({ ...p, familyIndigenous: e.target.checked }))} /> Indigenous</label>
              <label className="row"><input type="checkbox" checked={newResident.familyInformalSettler} onChange={(e) => setNewResident((p) => ({ ...p, familyInformalSettler: e.target.checked }))} /> Informal settler</label>
            </div>
            <div className="caseload-intake-actions" style={{ justifyContent: "space-between" }}>
              <button className="btn" onClick={() => setShowNewResidentForm(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  if (!newResident.displayName.trim()) return setError("Display name required.");
                  const parsedSafehouseId = Number(newResident.safehouseId);
                  if (!Number.isFinite(parsedSafehouseId)) return setError("Select a safehouse for the resident.");
                  try {
                    await apiFetch<void>("/api/residents", {
                      method: "POST",
                      token: auth.token ?? undefined,
                      body: JSON.stringify({
                        displayName: newResident.displayName.trim(),
                        caseStatus: "Active",
                        caseCategory: newResident.caseCategory.trim() || null,
                        subCategory: null,
                        safehouseId: parsedSafehouseId,
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
                    await loadFilterCatalog();
                    await load(page, appliedFilters);
                    setShowNewResidentForm(false);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Add resident
              </button>
            </div>
          </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table caseload-table">
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
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(x.residentId)}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked ? [...prev, x.residentId] : prev.filter((id) => id !== x.residentId)
                          );
                        }}
                      />
                    ) : null}
                  </td>
                  <td data-label="Resident" style={{ fontWeight: 700 }}>
                    {x.displayName}
                  </td>
                  <td data-label="Status">
                    <span className="badge">{x.caseStatus}</span>
                  </td>
                  <td data-label="Category" className="muted">
                    {x.caseCategory ?? "-"}
                  </td>
                  <td data-label="Milestones">
                    {(() => {
                      const reasons = opsByResident.get(x.residentId) ?? [];
                      const readiness = readinessByResident.get(x.residentId) ?? "Unknown";
                      const riskBand = riskByResident.get(x.residentId) ?? "Unknown";
                      const summary = getMilestoneSummary(reasons, readiness, riskBand);
                      return (
                        <div className="row caseload-milestone-row" style={{ gap: 6 }}>
                          {milestoneBadge("Home visit", summary.homeVisit.value, summary.homeVisit.tone)}
                          {milestoneBadge("Counseling", summary.counseling.value, summary.counseling.tone)}
                          {milestoneBadge("Reintegration", summary.readiness.value, summary.readiness.tone)}
                          {milestoneBadge("Risk", summary.risk.value, summary.risk.tone)}
                        </div>
                      );
                    })()}
                  </td>
                  <td data-label="Safehouse" className="muted">
                    {x.safehouseName}
                  </td>
                  <td data-label="Social worker" className="muted">
                    {x.assignedSocialWorker ?? "-"}
                  </td>
                  <td data-label="Quick links">
                    <div className="row caseload-action-row">
                      <Link className="btn primary" to={`/app/residents/${x.residentId}/process-recordings`}>
                        Open case
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
        {isAdmin ? (
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
                  await load(page, appliedFilters);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Apply to {selectedIds.length} selected
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
