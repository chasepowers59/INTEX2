import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";

type AllocationRow = {
  impactAllocationId: number;
  supporterId: number;
  supporterName: string;
  snapshotId: number | null;
  allocationDate: string;
  category: string;
  amount: number;
  currency: string;
  notes: string | null;
  createdAtUtc: string;
};

export function AdminAllocationsPage() {
  const auth = useAuth();
  const [qSupporterId, setQSupporterId] = useState<string>("");
  const [qCategory, setQCategory] = useState<string>("");
  const [items, setItems] = useState<AllocationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [supporterId, setSupporterId] = useState<string>("");
  const [allocationDate, setAllocationDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("Food");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("PHP");
  const [notes, setNotes] = useState<string>("");

  const load = async () => {
    setError(null);
    const p = new URLSearchParams();
    if (qSupporterId.trim()) p.set("supporterId", qSupporterId.trim());
    if (qCategory.trim()) p.set("category", qCategory.trim());
    p.set("page", "1");
    p.set("pageSize", "50");
    const res = await apiFetch<{ items: AllocationRow[] }>(`/api/impact-allocations?${p.toString()}`, {
      token: auth.token ?? undefined,
    });
    setItems(res.items as any);
  };

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  return (
    <RequireRole role="Admin">
      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Impact Allocations (Admin)</h1>
          <p className="muted">
            Record how funds were used (categories like food, clothing, transport, education). Donors can then view their
            allocations in the donor portal.
          </p>
          {error ? (
            <div className="badge danger" style={{ marginTop: 10 }}>
              {error}
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Add allocation</h2>
          <div className="row" style={{ alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
              <span className="muted">SupporterId</span>
              <input className="input" value={supporterId} onChange={(e) => setSupporterId(e.target.value)} placeholder="e.g. 123" />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
              <span className="muted">Date</span>
              <input className="input" type="date" value={allocationDate} onChange={(e) => setAllocationDate(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
              <span className="muted">Category</span>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
              <span className="muted">Amount</span>
              <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 15000" />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 140 }}>
              <span className="muted">Currency</span>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span className="muted">Notes (optional)</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Receipt reference, vendor, program…" />
          </label>

          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
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
                  await apiFetch("/api/impact-allocations", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      supporterId: sid,
                      snapshotId: null,
                      allocationDate,
                      category: category.trim(),
                      amount: amt,
                      currency: currency.trim() || "PHP",
                      notes: notes.trim() || null,
                    }),
                  });
                  setAmount("");
                  setNotes("");
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Add allocation
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Browse allocations</h2>
          <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
              <span className="muted">Filter SupporterId</span>
              <input className="input" value={qSupporterId} onChange={(e) => setQSupporterId(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
              <span className="muted">Filter category</span>
              <input className="input" value={qCategory} onChange={(e) => setQCategory(e.target.value)} />
            </label>
            <button className="btn" onClick={() => void load()}>
              Apply
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supporter</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.impactAllocationId}>
                    <td data-label="Date" className="muted">
                      {x.allocationDate}
                    </td>
                    <td data-label="Supporter" style={{ fontWeight: 800 }}>
                      {x.supporterName} <span className="muted">#{x.supporterId}</span>
                    </td>
                    <td data-label="Category">
                      <span className="badge">{x.category}</span>
                    </td>
                    <td data-label="Amount">
                      {x.amount} {x.currency}
                    </td>
                    <td data-label="Notes" className="muted">
                      {x.notes ?? "—"}
                    </td>
                    <td data-label="Actions">
                      <button
                        className="btn danger"
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
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No allocations found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}

