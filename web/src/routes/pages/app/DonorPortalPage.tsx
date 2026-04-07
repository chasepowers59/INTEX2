import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { Link } from "react-router-dom";
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

  const totalPhp = useMemo(
    () => (data?.items ?? []).reduce((sum, x) => sum + (Number.isFinite(x.amount) ? x.amount : 0), 0),
    [data],
  );
  const allocationPhp = useMemo(() => allocations.reduce((s, x) => s + x.totalAmount, 0), [allocations]);

  return (
    <RequireRole role="Donor">
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card glow-donor" style={{ padding: 24 }}>
          <div className="badge donor-role-badge" style={{ marginBottom: 12 }}>
            Donor role · Your personal view
          </div>
          <h1 style={{ marginTop: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Hello{auth.displayName ? `, ${auth.displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>
            Your receipts and where funds were applied—always aggregated. You are supporting South Korean victims through
            safe shelter, counseling, and reintegration support while resident identities stay in the staff-only portal.
          </p>
          <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
            <Link className="btn primary" to="/give">
              Give again
            </Link>
            <Link className="btn" to="/impact">
              Public impact
            </Link>
            <Link className="btn" to="/app/ml">
              View ML transparency
            </Link>
          </div>

          <div className="donor-hero-metrics">
            <div className="metric-tile">
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Contributions (total rows)
              </span>
              <strong>{data ? data.total : "—"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Listed gift total (PHP)
              </span>
              <strong>{data ? `₱${totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Allocation window (12 mo)
              </span>
              <strong>{allocations.length ? `₱${allocationPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</strong>
            </div>
          </div>
          {error ? (
            <div className="badge danger" style={{ marginTop: 14 }}>
              {error}
            </div>
          ) : null}
        </div>

        <div className="row">
          <div className="card tone-aqua soft-pulse" style={{ flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>What donors can do here</div>
            <ul className="trust-list muted">
              <li>Review contribution history and allocation trends.</li>
              <li>Understand anonymized impact without exposing survivor identity.</li>
              <li>Use public impact and giving pages for next donation actions.</li>
            </ul>
          </div>
          <div className="card tone-peach" style={{ flex: "1 1 280px" }}>
            <div style={{ fontWeight: 800 }}>What staff/admin do elsewhere</div>
            <ul className="trust-list muted">
              <li>Staff: manage cases, check-ins, and intervention workflows.</li>
              <li>Admin: CRUD users, allocations, imports, and published snapshots.</li>
              <li>ML workflows remain role-gated to protect sensitive operations.</li>
            </ul>
          </div>
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
              No allocations recorded yet for your account. If you registered with the same email as your supporter
              record, allocations will appear once staff record them—or use Register with your CRM email after import.
            </div>
          )}
        </div>

        <div className="photo-grid" style={{ marginTop: 12 }}>
          <div className="photo-placeholder" role="img" aria-label="Reference image showing impact activities and donor-backed services">
            <img src="/reference/programs-services.png" alt="Donor impact collage reference." />
            <div className="caption">Your support in action</div>
          </div>
          <div className="photo-placeholder" role="img" aria-label="Reference image showing hero mission call to action">
            <img src="/reference/hero-ribbon.png" alt="Mission hero banner reference." />
            <div className="caption">Trauma-informed support services</div>
          </div>
          <div className="photo-placeholder" role="img" aria-label="Reference image showing recent post storytelling cards">
            <img src="/reference/recent-posts.png" alt="Recent posts storytelling reference." />
            <div className="caption">Recovery milestones and hope</div>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
