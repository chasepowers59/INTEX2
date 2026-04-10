import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { displayCurrencyCode, SITE_CURRENCY } from "../../../lib/currency";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type AllocationRow = {
  impactAllocationId: number;
  supporterId: number;
  supporterName: string;
  contributionId: number | null;
  snapshotId: number | null;
  allocationDate: string;
  category: string;
  amount: number;
  currency: string;
  notes: string | null;
  createdAtUtc: string;
};

type RecentContribution = {
  contributionId: number;
  supporterId: number;
  supporterName: string;
  contributionType: string;
  amount: number | null;
  currency: string;
  contributionDate: string;
  campaignName: string | null;
};

type ContributionListResponse = {
  items: RecentContribution[];
};

type AllocationListResponse = {
  items: AllocationRow[];
};

type ContributionWorkItem = RecentContribution & {
  allocated: number;
  remaining: number | null;
  status: string;
};

const FUNDING_AREAS = [
  "Safe Shelter",
  "Counseling and Wellbeing",
  "Education Support",
  "Reintegration Planning",
  "Health Services",
  "Emergency Essentials",
] as const;

function renderContributionSummary(contribution: ContributionWorkItem) {
  return (
    <>
      <strong>{contribution.supporterName}</strong> | Donation #{contribution.contributionId}
      <br />
      {contribution.contributionDate} | {contribution.amount ?? "-"} {displayCurrencyCode(contribution.currency)}
      {contribution.campaignName ? ` | ${contribution.campaignName}` : ""}
      <br />
      Allocated so far: {contribution.allocated.toFixed(2)} {displayCurrencyCode(contribution.currency)}
      {contribution.remaining != null
        ? ` | Remaining: ${contribution.remaining.toFixed(2)} ${displayCurrencyCode(contribution.currency)}`
        : ""}
    </>
  );
}

export function AdminAllocationsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const allocationFormRef = useRef<HTMLDivElement | null>(null);

  const [qDonorId, setQDonorId] = useState("");
  const [qDonorName, setQDonorName] = useState("");
  const [qCategory, setQCategory] = useState("");
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState({
    donorId: "",
    donorName: "",
    category: "",
  });

  const [allAllocations, setAllAllocations] = useState<AllocationRow[]>([]);
  const [recentContributions, setRecentContributions] = useState<RecentContribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const [supporterId, setSupporterId] = useState("");
  const [contributionId, setContributionId] = useState("");
  const [allocationDate, setAllocationDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("Safe Shelter");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(SITE_CURRENCY);
  const [notes, setNotes] = useState("");
  const [selectedContribution, setSelectedContribution] = useState<ContributionWorkItem | null>(null);
  const [confirmation, setConfirmation] = useState<{
    allocationId: number;
    supporterId: number;
    category: string;
    amount: string;
  } | null>(null);

  const loadAllAllocations = async () => {
    const res = await apiFetch<AllocationListResponse>("/api/impact-allocations?page=1&pageSize=500", {
      token: auth.token ?? undefined,
    });
    setAllAllocations(res.items);
  };

  const loadRecentContributions = async () => {
    const res = await apiFetch<ContributionListResponse>("/api/contributions?page=1&pageSize=80", {
      token: auth.token ?? undefined,
    });
    setRecentContributions(res.items ?? []);
  };

  useEffect(() => {
    void loadAllAllocations().catch((e) => setError((e as Error).message));
    void loadRecentContributions().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  useEffect(() => {
    if (!showCreate) return;
    allocationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showCreate]);

  const allocationsByContribution = useMemo(() => {
    const totals = new Map<number, number>();
    for (const item of allAllocations) {
      if (!item.contributionId) continue;
      totals.set(item.contributionId, (totals.get(item.contributionId) ?? 0) + item.amount);
    }
    return totals;
  }, [allAllocations]);

  const contributionWorklist = useMemo<ContributionWorkItem[]>(() => {
    return recentContributions
      .map((contribution) => {
        const allocated = allocationsByContribution.get(contribution.contributionId) ?? 0;
        const total = contribution.amount ?? 0;
        const remaining = contribution.amount == null ? null : Math.max(total - allocated, 0);
        const status =
          contribution.amount == null
            ? "Amount needed"
            : (remaining ?? 0) <= 0.009
              ? "Fully allocated"
              : allocated > 0
                ? "Partially allocated"
                : "Not yet allocated";
        return {
          ...contribution,
          allocated,
          remaining,
          status,
        };
      })
      .sort((a, b) => {
        const aRank = a.status === "Not yet allocated" ? 0 : a.status === "Partially allocated" ? 1 : 2;
        const bRank = b.status === "Not yet allocated" ? 0 : b.status === "Partially allocated" ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;
        return b.contributionDate.localeCompare(a.contributionDate);
      });
  }, [allocationsByContribution, recentContributions]);

  const needsAllocation = contributionWorklist.filter(
    (contribution) =>
      contribution.status === "Not yet allocated" ||
      contribution.status === "Partially allocated" ||
      contribution.status === "Amount needed",
  );

  const filteredAllocationHistory = useMemo(() => {
    const donorId = appliedHistoryFilters.donorId.trim();
    const donorName = appliedHistoryFilters.donorName.trim().toLowerCase();
    const categoryTerm = appliedHistoryFilters.category.trim().toLowerCase();

    return allAllocations.filter((item) => {
      if (donorId && String(item.supporterId) !== donorId) return false;
      if (donorName && !item.supporterName.toLowerCase().includes(donorName)) return false;
      if (categoryTerm && !item.category.toLowerCase().includes(categoryTerm)) return false;
      return true;
    });
  }, [allAllocations, appliedHistoryFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredAllocationHistory.length / PAGE_SIZE));
  const rows = filteredAllocationHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAllocationForm = () => {
    setSelectedContribution(null);
    setContributionId("");
    setSupporterId("");
    setAllocationDate(new Date().toISOString().slice(0, 10));
    setCategory("Safe Shelter");
    setAmount("");
    setCurrency(SITE_CURRENCY);
    setNotes("");
    setShowCreate(false);
  };

  const prepareContributionAllocation = (contribution: ContributionWorkItem) => {
    setSelectedContribution(contribution);
    setShowCreate(false);
    setContributionId(String(contribution.contributionId));
    setSupporterId(String(contribution.supporterId));
    setAmount(
      contribution.remaining != null
        ? String(contribution.remaining)
        : contribution.amount != null
          ? String(contribution.amount)
          : "",
    );
    setCurrency(contribution.currency || SITE_CURRENCY);
    setNotes("");
  };

  const openAllocationForm = (contribution?: ContributionWorkItem | null) => {
    const picked = contribution ?? null;
    if (picked) {
      if (selectedContribution?.contributionId === picked.contributionId) {
        clearAllocationForm();
        return;
      }
      prepareContributionAllocation(picked);
      return;
    }
    clearAllocationForm();
    setShowCreate(true);
  };

  const saveAllocation = async () => {
    setError(null);
    const sid = Number(supporterId.trim());
    const amt = Number(amount.trim());
    if (!Number.isFinite(sid)) {
      setError("Donor ID must be a number.");
      return;
    }
    if (!Number.isFinite(amt)) {
      setError("Amount must be a number.");
      return;
    }
    try {
      const res = await apiFetch<{ impactAllocationId: number }>("/api/impact-allocations", {
        method: "POST",
        token: auth.token ?? undefined,
        body: JSON.stringify({
          supporterId: sid,
          contributionId: contributionId.trim() ? Number(contributionId) : null,
          snapshotId: null,
          allocationDate,
          category: category.trim(),
          amount: amt,
          currency: currency.trim() || SITE_CURRENCY,
          notes: notes.trim() || null,
        }),
      });
      setConfirmation({
        allocationId: res.impactAllocationId,
        supporterId: sid,
        category: category.trim(),
        amount: `${amt} ${currency.trim() || SITE_CURRENCY}`,
      });
      clearAllocationForm();
      await loadAllAllocations();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const applyHistoryFilters = () => {
    setAppliedHistoryFilters({
      donorId: qDonorId.trim(),
      donorName: qDonorName.trim(),
      category: qCategory.trim(),
    });
    setPage(1);
  };

  const clearHistoryFilters = () => {
    setQDonorId("");
    setQDonorName("");
    setQCategory("");
    setAppliedHistoryFilters({ donorId: "", donorName: "", category: "" });
    setPage(1);
  };

  const handleHistoryEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyHistoryFilters();
  };

  return (
    <RequireRole role="Admin">
      <div className="admin-page">
        <div className="card">
          <div className="admin-header">
            <div className="admin-header-copy">
              <h1 style={{ marginTop: 0 }}>Funding allocations</h1>
              <p className="muted">Assign recorded donations to the work they support.</p>
            </div>
            <button className="btn primary" onClick={() => (showCreate ? clearAllocationForm() : openAllocationForm(null))}>
              {showCreate ? "Cancel" : "Add allocation"}
            </button>
          </div>
          {error ? <div className="badge danger" style={{ marginTop: 10 }}>{error}</div> : null}

          <div className="admin-kpi-grid" style={{ marginTop: 12 }}>
            <div className="card admin-kpi tone-cream">
              <div className="muted">Donations needing allocation</div>
              <div className="admin-kpi-value">{needsAllocation.length}</div>
            </div>
            <div className="card admin-kpi tone-cream">
              <div className="muted">Recent gifts</div>
              <div className="admin-kpi-value">{recentContributions.length}</div>
            </div>
            <div className="card admin-kpi tone-cream">
              <div className="muted">Saved allocations</div>
              <div className="admin-kpi-value">{allAllocations.length}</div>
            </div>
          </div>

          <div
            ref={allocationFormRef}
            className={`process-collapsible allocation-form-wrap ${showCreate ? "open" : ""}`}
            aria-hidden={!showCreate}
          >
            <div className="card process-form-card allocation-form-panel">
              <div className="process-header process-inline-header">
                <strong>New allocation</strong>
              </div>
              <div className="admin-inline-grid">
                <label className="admin-form-label span-6">
                  <span className="muted">Recent donation</span>
                  <select
                    className="input"
                    value={contributionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setContributionId(nextId);
                      const picked = contributionWorklist.find((c) => c.contributionId === Number(nextId));
                      if (picked) {
                        setSupporterId(String(picked.supporterId));
                        setAmount(
                          picked.remaining != null
                            ? String(picked.remaining)
                            : picked.amount != null
                              ? String(picked.amount)
                              : "",
                        );
                        setCurrency(picked.currency || SITE_CURRENCY);
                      }
                    }}
                  >
                    <option value="">Select recent donation</option>
                    {recentContributions.map((contribution) => (
                      <option key={contribution.contributionId} value={contribution.contributionId}>
                        #{contribution.contributionId} | {contribution.supporterName} | {contribution.contributionDate} |{" "}
                        {contribution.amount ?? "-"} {displayCurrencyCode(contribution.currency)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Donor ID</span>
                  <input className="input" value={supporterId} onChange={(e) => setSupporterId(e.target.value)} />
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Date</span>
                  <input className="input" type="date" value={allocationDate} onChange={(e) => setAllocationDate(e.target.value)} />
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Currency</span>
                  <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </label>
                <label className="admin-form-label span-4">
                  <span className="muted">Funding area</span>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {FUNDING_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Amount</span>
                  <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <label className="admin-form-label span-6">
                  <span className="muted">Notes</span>
                  <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </label>
              </div>
              <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                <button className="btn" onClick={clearAllocationForm}>
                  Cancel
                </button>
                <button className="btn primary" onClick={() => void saveAllocation()}>
                  Save allocation
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="admin-table-head">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Donations needing allocation</h2>
              <p className="muted">Start with donations that are not yet fully assigned.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Date</th>
                  <th>Gift</th>
                  <th>Allocated</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {needsAllocation.slice(0, 12).map((contribution) => {
                  const isSelected = selectedContribution?.contributionId === contribution.contributionId;
                  return (
                    <React.Fragment key={contribution.contributionId}>
                      <tr className={isSelected ? "donor-row-selected" : undefined}>
                        <td data-label="Donor" style={{ fontWeight: 800 }}>
                          <button
                            className="auth-link-subtle"
                            style={{ padding: 0, border: 0, background: "transparent", fontWeight: 800 }}
                            onClick={() => openAllocationForm(contribution)}
                          >
                            {contribution.supporterName}
                          </button>{" "}
                          <span className="muted">#{contribution.supporterId}</span>
                        </td>
                        <td data-label="Date" className="muted">{contribution.contributionDate}</td>
                        <td data-label="Gift">
                          {(contribution.amount ?? "-")} {displayCurrencyCode(contribution.currency)}
                          {contribution.campaignName ? <div className="muted">{contribution.campaignName}</div> : null}
                        </td>
                        <td data-label="Allocated">
                          {contribution.allocated.toFixed(2)} {displayCurrencyCode(contribution.currency)}
                        </td>
                        <td data-label="Remaining">
                          {contribution.remaining == null
                            ? "-"
                            : `${contribution.remaining.toFixed(2)} ${displayCurrencyCode(contribution.currency)}`}
                        </td>
                        <td data-label="Status">
                          <span
                            className={`badge ${
                              contribution.status === "Fully allocated"
                                ? "ok"
                                : contribution.status === "Partially allocated"
                                  ? "warn"
                                  : ""
                            }`}
                          >
                            {contribution.status}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <button
                            className={`btn admin-table-action ${isSelected ? "donor-row-selected-action" : ""}`}
                            onClick={() => openAllocationForm(contribution)}
                          >
                            {isSelected ? "Cancel" : "Allocate"}
                          </button>
                        </td>
                      </tr>
                      {isSelected ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div className="donor-inline-panel open">
                              <div style={{ padding: 16, display: "grid", gap: 14 }}>
                                <div className="admin-inline-summary">{renderContributionSummary(contribution)}</div>
                                <div className="admin-inline-grid">
                                  <label className="admin-form-label span-4">
                                    <span className="muted">Funding area</span>
                                    <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                                      {FUNDING_AREAS.map((area) => (
                                        <option key={area} value={area}>
                                          {area}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="admin-form-label span-2">
                                    <span className="muted">Amount</span>
                                    <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                                  </label>
                                  <label className="admin-form-label span-6">
                                    <span className="muted">Notes</span>
                                    <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                                  </label>
                                </div>
                                <div className="row process-form-actions" style={{ justifyContent: "space-between" }}>
                                  <button className="btn" onClick={clearAllocationForm}>
                                    Cancel
                                  </button>
                                  <button className="btn primary" onClick={() => void saveAllocation()}>
                                    Save allocation
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                {needsAllocation.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      Recent gifts are already assigned.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="admin-table-head">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Allocation history</h2>
              <p className="muted">Search previous allocations.</p>
            </div>
          </div>

          <div className="admin-inline-grid" style={{ marginTop: 10 }}>
            <label className="admin-form-label span-3">
              <span className="muted">Donor ID</span>
              <input className="input" value={qDonorId} onChange={(e) => setQDonorId(e.target.value)} onKeyDown={handleHistoryEnter} />
            </label>
            <label className="admin-form-label span-4">
              <span className="muted">Donor name</span>
              <input className="input" value={qDonorName} onChange={(e) => setQDonorName(e.target.value)} onKeyDown={handleHistoryEnter} />
            </label>
            <label className="admin-form-label span-3">
              <span className="muted">Funding area</span>
              <input className="input" value={qCategory} onChange={(e) => setQCategory(e.target.value)} onKeyDown={handleHistoryEnter} />
            </label>
            <button className="btn" onClick={applyHistoryFilters}>
              Apply
            </button>
            <button className="btn" onClick={clearHistoryFilters}>
              Clear
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Funding area</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((allocation) => (
                  <tr key={allocation.impactAllocationId}>
                    <td data-label="Date" className="muted">{allocation.allocationDate}</td>
                    <td data-label="Donor" style={{ fontWeight: 800 }}>
                      {allocation.supporterName} <span className="muted">#{allocation.supporterId}</span>
                    </td>
                    <td data-label="Funding area"><span className="badge">{allocation.category}</span></td>
                    <td data-label="Amount">{allocation.amount} {displayCurrencyCode(allocation.currency)}</td>
                    <td data-label="Notes" className="muted">{allocation.notes ?? "-"}</td>
                    <td data-label="Actions">
                      <button
                        className="btn danger admin-table-action"
                        onClick={async () => {
                          if (!confirm("Delete this allocation?")) return;
                          setError(null);
                          try {
                            await apiFetch(`/api/impact-allocations/${allocation.impactAllocationId}?confirm=true`, {
                              method: "DELETE",
                              token: auth.token ?? undefined,
                            });
                            await loadAllAllocations();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No allocations found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </div>
      </div>
      {confirmation ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5,8,20,0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 520, width: "100%" }}>
            <h2 style={{ marginTop: 0 }}>Allocation saved</h2>
            <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
              <span className="badge ok">Allocation ID: {confirmation.allocationId}</span>
              <span className="badge">Supporter #{confirmation.supporterId}</span>
              <span className="badge">{confirmation.category}</span>
              <span className="badge">{confirmation.amount}</span>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn primary" onClick={() => setConfirmation(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </RequireRole>
  );
}
