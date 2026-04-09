import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
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

export function AdminAllocationsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const [qSupporterId, setQSupporterId] = useState<string>("");
  const [qCategory, setQCategory] = useState<string>("");
  const [items, setItems] = useState<AllocationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [supporterId, setSupporterId] = useState<string>("");
  const [contributionId, setContributionId] = useState<string>("");
  const [allocationDate, setAllocationDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("Food");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("PHP");
  const [notes, setNotes] = useState<string>("");
  const [selectedAllocations, setSelectedAllocations] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [recentContributions, setRecentContributions] = useState<RecentContribution[]>([]);
  const [confirmation, setConfirmation] = useState<{
    allocationId: number;
    supporterId: number;
    category: string;
    amount: string;
  } | null>(null);

  const load = async () => {
    setError(null);
    const p = new URLSearchParams();
    if (qSupporterId.trim()) p.set("supporterId", qSupporterId.trim());
    if (qCategory.trim()) p.set("category", qCategory.trim());
    p.set("page", "1");
    p.set("pageSize", "50");
    const res = await apiFetch<AllocationListResponse>(`/api/impact-allocations?${p.toString()}`, {
      token: auth.token ?? undefined,
    });
    setItems(res.items);
  };

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
    void apiFetch<ContributionListResponse>("/api/contributions?page=1&pageSize=80", { token: auth.token ?? undefined })
      .then((res) => setRecentContributions(res.items ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const rows = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <RequireRole role="Admin">
      <div className="admin-page">
        <div className="card">
          <div className="admin-header">
            <div className="admin-header-copy">
              <h1 style={{ marginTop: 0 }}>Impact Allocations</h1>
              <p className="muted">Funding categories, donor visibility, and allocation history.</p>
            </div>
            <button className="btn primary" onClick={() => setShowCreate((open) => !open)}>
              {showCreate ? "Close" : "Add allocation"}
            </button>
          </div>
          {error ? <div className="badge danger" style={{ marginTop: 10 }}>{error}</div> : null}

          <div className="admin-inline-grid" style={{ marginTop: 10 }}>
            <label className="admin-form-label span-3">
              <span className="muted">Supporter ID</span>
              <input className="input" value={qSupporterId} onChange={(e) => setQSupporterId(e.target.value)} />
            </label>
            <label className="admin-form-label span-5">
              <span className="muted">Category</span>
              <input className="input" value={qCategory} onChange={(e) => setQCategory(e.target.value)} />
            </label>
            <button className="btn" onClick={() => void load()}>
              Apply
            </button>
          </div>

          <div className={`process-collapsible ${showCreate ? "open" : ""}`} aria-hidden={!showCreate}>
            <div className="card process-form-card">
              <div className="process-header process-inline-header">
                <div>
                  <strong>Allocation details</strong>
                </div>
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
                      const picked = recentContributions.find((c) => c.contributionId === Number(nextId));
                      if (picked) {
                        setSupporterId(String(picked.supporterId));
                        setAmount(picked.amount != null ? String(picked.amount) : "");
                      }
                    }}
                  >
                    <option value="">Select recent donation (optional)</option>
                    {recentContributions.map((c) => (
                      <option key={c.contributionId} value={c.contributionId}>
                        #{c.contributionId} | {c.supporterName} | {c.contributionDate} | {c.amount ?? "-"} {c.currency}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Supporter ID</span>
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
                  <span className="muted">Category</span>
                  <input className="input" list="allocation-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Amount</span>
                  <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <label className="admin-form-label span-6">
                  <span className="muted">Notes</span>
                  <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>
              <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                <button
                  className="btn primary"
                  onClick={async () => {
                    setError(null);
                    const sid = Number(supporterId.trim());
                    const amt = Number(amount.trim());
                    if (!Number.isFinite(sid)) {
                      setError("SupporterId must be a number.");
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
                          currency: currency.trim() || "PHP",
                          notes: notes.trim() || null,
                        }),
                      });
                      setConfirmation({
                        allocationId: res.impactAllocationId,
                        supporterId: sid,
                        category: category.trim(),
                        amount: `${amt} ${currency.trim() || "PHP"}`,
                      });
                      setAmount("");
                      setNotes("");
                      setShowCreate(false);
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Save allocation
                </button>
              </div>
              <datalist id="allocation-categories">
                <option value="Food" />
                <option value="Education" />
                <option value="Health" />
                <option value="Shelter" />
                <option value="Transport" />
                <option value="Clothing" />
              </datalist>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="admin-table-head">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Allocations</h2>
              <p className="muted">Allocation rows visible in donor-facing views.</p>
            </div>
            <button
              className="btn danger"
              disabled={selectedAllocations.length === 0}
              onClick={async () => {
                if (!confirm(`Delete ${selectedAllocations.length} allocations?`)) return;
                setError(null);
                try {
                  for (const id of selectedAllocations) {
                    await apiFetch(`/api/impact-allocations/${id}?confirm=true`, {
                      method: "DELETE",
                      token: auth.token ?? undefined,
                    });
                  }
                  setSelectedAllocations([]);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Bulk delete ({selectedAllocations.length})
            </button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Date</th>
                  <th>Supporter</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.impactAllocationId}>
                    <td data-label="Select">
                      <input
                        type="checkbox"
                        checked={selectedAllocations.includes(x.impactAllocationId)}
                        onChange={(e) =>
                          setSelectedAllocations((prev) =>
                            e.target.checked
                              ? [...prev, x.impactAllocationId]
                              : prev.filter((id) => id !== x.impactAllocationId)
                          )
                        }
                      />
                    </td>
                    <td data-label="Date" className="muted">{x.allocationDate}</td>
                    <td data-label="Supporter" style={{ fontWeight: 800 }}>
                      {x.supporterName} <span className="muted">#{x.supporterId}</span>
                    </td>
                    <td data-label="Category"><span className="badge">{x.category}</span></td>
                    <td data-label="Amount">{x.amount} {x.currency}</td>
                    <td data-label="Notes" className="muted">{x.notes ?? "-"}</td>
                    <td data-label="Actions">
                      <button
                        className="btn danger admin-table-action"
                        onClick={async () => {
                          if (!confirm("Delete this allocation?")) return;
                          setError(null);
                          try {
                            await apiFetch(`/api/impact-allocations/${x.impactAllocationId}?confirm=true`, {
                              method: "DELETE",
                              token: auth.token ?? undefined,
                            });
                            await load();
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
                    <td colSpan={7} className="muted">
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
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
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
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </RequireRole>
  );
}
