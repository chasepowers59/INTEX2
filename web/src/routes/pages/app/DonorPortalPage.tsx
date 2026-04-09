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

  const latestContributionDate = useMemo(() => {
    if (!data?.items.length) return null;
    return data.items[0].contributionDate;
  }, [data]);

  return (
    <RequireRole role="Donor">
      <div className="donor-impact-page">
        <section className="card glow-donor donor-impact-hero">
          <div className="badge donor-role-badge">My impact</div>
          <h1 className="donor-impact-title">Welcome back{auth.displayName ? `, ${auth.displayName.split(" ")[0]}` : ""}</h1>
          <p className="muted donor-impact-subtitle">
            This page shows how your giving is being translated into support across programs while keeping resident
            identities protected.
          </p>
          <div className="row donor-impact-actions">
            <Link className="btn primary donor-primary-cta" to="/donate">
              Donate again
            </Link>
            <Link className="btn" to="/impact">
              Public impact
            </Link>
          </div>

          <div className="donor-impact-metrics">
            <div className="metric-tile">
              <span className="muted donor-impact-label">
                Contributions
              </span>
              <strong>{data ? data.total : "-"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted donor-impact-label">
                Listed gift total (PHP)
              </span>
              <strong>{data ? `PHP ${totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted donor-impact-label">
                Allocation window (12 mo)
              </span>
              <strong>{allocations.length ? `PHP ${allocationPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted donor-impact-label">Last contribution</span>
              <strong>{latestContributionDate ?? "-"}</strong>
            </div>
          </div>
          {error ? (
            <div className="badge danger donor-impact-error">
              {error}
            </div>
          ) : null}
        </section>

        <div className="donor-impact-grid">
          <section className="card donor-impact-primary">
            <h2 className="donor-impact-section-title">Where your support went</h2>
            <p className="muted donor-impact-section-copy">
              These records are posted by staff and shown as aggregate program activity.
            </p>
            {allocations.length ? (
              <>
                <div className="donor-impact-chart">
                  <InlineBarChart data={allocationChartData} valueFormatter={(value) => `PHP ${value.toLocaleString()}`} />
                </div>

                <div className="table-wrap donor-impact-table-wrap">
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
              <div className="muted donor-impact-empty">
                No allocations are available yet. If your account email matches supporter records, this section updates
                after staff post activity.
              </div>
            )}
          </section>

          <section className="card donor-impact-side">
            <h2 className="donor-impact-section-title">Your impact story</h2>
            <p className="muted donor-impact-section-copy">
              A plain-language estimate based on your latest allocation totals.
            </p>
            {outcomeNarratives.length ? (
              <ul className="trust-list muted donor-impact-story-list">
                {outcomeNarratives.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : (
              <div className="muted donor-impact-empty">
                Once allocations are posted, this section summarizes the outcomes they supported.
              </div>
            )}
          </section>
        </div>

        <section className="card donor-impact-history">
          <h2 className="donor-impact-section-title">Contribution history</h2>
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
        </section>
      </div>
    </RequireRole>
  );
}
