import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InlineBarChart } from "../../../components/ui/InlineBarChart";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";

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

const outcomeMap: Record<string, { unitPhp: number; text: string }> = {
  Counseling: { unitPhp: 1200, text: "trauma-informed counseling sessions" },
  Education: { unitPhp: 900, text: "weeks of education support" },
  Health: { unitPhp: 700, text: "health and wellbeing check-ins" },
  Shelter: { unitPhp: 1500, text: "days of safe shelter coverage" },
  Food: { unitPhp: 450, text: "nutrition support packs" },
  Transport: { unitPhp: 300, text: "safe transport assists" },
};

export function DonorPortalPage() {
  const auth = useAuth();
  const [data, setData] = useState<Paged<Contribution> | null>(null);
  const [allocations, setAllocations] = useState<AllocationAgg[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const contributions = await apiFetch<Paged<Contribution>>("/api/donor/contributions", {
          token: auth.token ?? undefined,
        });
        setData(contributions);

        const allocationResponse = await apiFetch<{ months: number; items: AllocationAgg[] }>("/api/donor/allocations?months=12", {
          token: auth.token ?? undefined,
        });
        setAllocations(allocationResponse.items);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token]);

  const totalPhp = useMemo(
    () => (data?.items ?? []).reduce((sum, x) => sum + (Number.isFinite(x.amount) ? x.amount : 0), 0),
    [data],
  );
  const allocationPhp = useMemo(() => allocations.reduce((sum, x) => sum + x.totalAmount, 0), [allocations]);

  const allocationChartData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of allocations) {
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.totalAmount);
    }

    return [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  }, [allocations]);

  const outcomeNarratives = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of allocations) {
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.totalAmount);
    }

    return [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, total]) => {
        const definition = outcomeMap[category];
        if (!definition) {
          return `${category}: PHP ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} applied`;
        }

        const units = Math.floor(total / definition.unitPhp);
        return units > 0
          ? `${category}: around ${units.toLocaleString()} ${definition.text}`
          : `${category}: PHP ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} applied`;
      });
  }, [allocations]);

  return (
    <RequireRole role="Donor">
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card glow-donor" style={{ padding: 24 }}>
          <div className="badge donor-role-badge" style={{ marginBottom: 12 }}>
            Donor portal
          </div>
          <h1 style={{ marginTop: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Hello{auth.displayName ? `, ${auth.displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>
            Review your contribution history and see how funding has been applied through aggregated program allocations.
            Resident identities remain protected in the secure operations workspace.
          </p>
          <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
            <Link className="btn primary donor-primary-cta" to="/donate">
              Donate again
            </Link>
            <Link className="btn" to="/impact">
              Public impact
            </Link>
          </div>

          <div className="donor-hero-metrics">
            <div className="metric-tile">
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Contributions
              </span>
              <strong>{data ? data.total : "-"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Listed gift total (PHP)
              </span>
              <strong>{data ? `PHP ${totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Allocation window (12 mo)
              </span>
              <strong>{allocations.length ? `PHP ${allocationPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</strong>
            </div>
          </div>
          {error ? (
            <div className="badge danger" style={{ marginTop: 14 }}>
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
                {(data?.items ?? []).map((item) => (
                  <tr key={item.contributionId}>
                    <td data-label="Date" className="muted">
                      {item.contributionDate}
                    </td>
                    <td data-label="Type">
                      <span className="badge">{item.contributionType}</span>
                    </td>
                    <td data-label="Amount">
                      {item.amount} {item.currency}
                    </td>
                    <td data-label="Campaign" className="muted">
                      {item.campaignName ?? "-"}
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
          <h2 style={{ marginTop: 0 }}>Where funds were used</h2>
          <p className="muted">
            These allocations are recorded by staff and presented only as aggregated program activity.
          </p>

          {allocations.length ? (
            <>
              <div style={{ marginTop: 10 }}>
                <InlineBarChart data={allocationChartData} valueFormatter={(value) => `PHP ${value.toLocaleString()}`} />
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
                    {allocations.map((item, idx) => (
                      <tr key={`${item.year}-${item.month}-${item.category}-${idx}`}>
                        <td data-label="Month" className="muted">
                          {item.year}-{String(item.month).padStart(2, "0")}
                        </td>
                        <td data-label="Category">
                          <span className="badge">{item.category}</span>
                        </td>
                        <td data-label="Total">
                          {item.totalAmount} {item.currency}
                        </td>
                        <td data-label="Entries" className="muted">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              No allocations are available for this account yet. If you registered with the same email used in supporter
              records, they will appear after staff post allocation activity.
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your impact story</h2>
          <p className="muted">
            This narrative estimate translates recent allocation totals into understandable program outcomes.
          </p>
          {outcomeNarratives.length ? (
            <ul className="trust-list muted">
              {outcomeNarratives.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : (
            <div className="muted">Once allocations are posted, this section summarizes the program activity they supported.</div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
