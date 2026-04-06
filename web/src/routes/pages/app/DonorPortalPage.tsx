import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { InlineBarChart } from "../../../components/ui/InlineBarChart";

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
type Contribution = {
  contributionId: number;
  contributionType: string;
  amount: number;
  currency: string;
  contributionDate: string;
  campaignName: string | null;
  notes: string | null;
};

type AllocationAgg = {
  year: number;
  month: number;
  category: string;
  currency: string;
  totalAmount: number;
  count: number;
};

export function DonorPortalPage() {
  const auth = useAuth();
  const [data, setData] = useState<Paged<Contribution> | null>(null);
  const [allocations, setAllocations] = useState<AllocationAgg[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<Paged<Contribution>>("/api/donor/contributions", { token: auth.token ?? undefined });
        setData(res);
        const a = await apiFetch<{ months: number; items: AllocationAgg[] }>("/api/donor/allocations?months=12", {
          token: auth.token ?? undefined,
        });
        setAllocations(a.items);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token]);

  return (
    <RequireRole role="Donor">
      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Donor Portal</h1>
          <p className="muted">
            Your donation history and anonymized impact summaries. Resident-level data is never shown here.
          </p>
          {error ? (
            <div className="badge danger" style={{ marginTop: 10 }}>
              {error}
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your contributions</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Campaign</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((x) => (
                  <tr key={x.contributionId}>
                    <td data-label="Date" className="muted">
                      {x.contributionDate}
                    </td>
                    <td data-label="Type">
                      <span className="badge">{x.contributionType}</span>
                    </td>
                    <td data-label="Amount">
                      {x.amount} {x.currency}
                    </td>
                    <td data-label="Campaign" className="muted">
                      {x.campaignName ?? "—"}
                    </td>
                  </tr>
                ))}
                {data && data.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No linked contributions found for this account yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your allocations (where funds were used)</h2>
          <p className="muted">
            These allocations are recorded by staff and are always aggregated. They are never tied to resident identity.
          </p>

          {allocations.length ? (
            <>
              <div style={{ marginTop: 10 }}>
                <InlineBarChart
                  data={(() => {
                    const byCat = new Map<string, number>();
                    for (const x of allocations) {
                      byCat.set(x.category, (byCat.get(x.category) ?? 0) + x.totalAmount);
                    }
                    return [...byCat.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([label, value]) => ({ label, value }));
                  })()}
                  valueFormatter={(v) => `₱${v.toLocaleString()}`}
                />
              </div>

              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Category</th>
                      <th>Total</th>
                      <th>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((x, idx) => (
                      <tr key={`${x.year}-${x.month}-${x.category}-${idx}`}>
                        <td data-label="Month" className="muted">
                          {x.year}-{String(x.month).padStart(2, "0")}
                        </td>
                        <td data-label="Category">
                          <span className="badge">{x.category}</span>
                        </td>
                        <td data-label="Total">{x.totalAmount} {x.currency}</td>
                        <td data-label="Entries" className="muted">
                          {x.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              No allocations recorded yet for your account. Ask an admin to link your login to your Supporter record and record allocations.
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
