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
type AllocationLink = {
  impactAllocationId: number;
  allocationDate: string;
  category: string;
  allocationAmount: number;
  allocationCurrency: string;
  notes: string | null;
  contributionId: number;
  contributionDate: string;
  contributionType: string;
  contributionAmount: number | null;
  contributionCurrency: string;
  campaignName: string | null;
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
  const [allocationLinks, setAllocationLinks] = useState<AllocationLink[]>([]);
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
        const links = await apiFetch<{ months: number; items: AllocationLink[] }>("/api/donor/allocation-links?months=12", {
          token: auth.token ?? undefined,
        });
        setAllocationLinks(links.items);
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
  const monthlyAllocationSeries = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const x of allocations) {
      const key = `${x.year}-${String(x.month).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + x.totalAmount);
    }
    return [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }, [allocations]);
  const topCampaigns = useMemo(() => {
    const byCampaign = new Map<string, number>();
    for (const x of data?.items ?? []) {
      const key = (x.campaignName ?? "General").trim() || "General";
      byCampaign.set(key, (byCampaign.get(key) ?? 0) + x.amount);
    }
    return [...byCampaign.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [data]);
  const outcomeNarratives = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const x of allocations) byCat.set(x.category, (byCat.get(x.category) ?? 0) + x.totalAmount);
    return [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, total]) => {
        const map = outcomeMap[category];
        if (!map) return `${category}: ₱${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} applied`;
        const units = Math.floor(total / map.unitPhp);
        return units > 0
          ? `${category}: around ${units.toLocaleString()} ${map.text}`
          : `${category}: ₱${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} applied`;
      });
  }, [allocations]);

  const latestContributionDate = useMemo(() => {
    if (!data?.items.length) return null;
    return data.items[0].contributionDate;
  }, [data]);

  return (
    <RequireRole role="Donor">
<<<<<<< jaewon-dev
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card glow-donor" style={{ padding: 24 }}>
          <div className="badge donor-role-badge" style={{ marginBottom: 12 }}>
            Donor role · Your personal view
          </div>
          <h1 style={{ marginTop: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Hello{auth.displayName ? `, ${auth.displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 680 }}>
            This page shows your donation history, where funds were allocated, and an easy-to-read impact summary.
            Data is always aggregated to protect resident identity while keeping transparency for donors.
          </p>
          <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
            <Link className="btn primary" to="/give">
              Give again
=======
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
>>>>>>> local
            </Link>
            <Link className="btn" to="/impact">
              Public impact
            </Link>
            <Link className="btn" to="/about">
              Program overview
            </Link>
          </div>

          <div className="donor-impact-metrics">
            <div className="metric-tile">
<<<<<<< jaewon-dev
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Contributions (total rows)
=======
              <span className="muted donor-impact-label">
                Contributions
>>>>>>> local
              </span>
              <strong>{data ? data.total : "—"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted donor-impact-label">
                Listed gift total (PHP)
              </span>
              <strong>{data ? `₱${totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</strong>
            </div>
            <div className="metric-tile">
              <span className="muted donor-impact-label">
                Allocation window (12 mo)
              </span>
              <strong>{allocations.length ? `₱${allocationPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</strong>
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

<<<<<<< jaewon-dev
        <div className="row">
          <div className="card tone-aqua soft-pulse" style={{ flex: "1 1 300px" }}>
            <div style={{ fontWeight: 800 }}>Your giving focus</div>
            {topCampaigns.length ? (
              <ul className="trust-list muted">
                {topCampaigns.map(([campaign, amount]) => (
                  <li key={campaign}>
                    {campaign}: ₱{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>
                Your top campaign mix appears here once contributions are linked.
              </div>
            )}
          </div>
          <div className="card tone-peach" style={{ flex: "1 1 300px" }}>
            <div style={{ fontWeight: 800 }}>Transparency commitment</div>
            <ul className="trust-list muted">
              <li>Every allocation shown here is recorded through staff-controlled workflows.</li>
              <li>Resident identities and case details remain staff-only.</li>
              <li>Totals and trends are updated from the same operational data used internally.</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Allocation trend (last 12 months)</h2>
          <p className="muted">Monthly total allocations linked to your donor history.</p>
          {monthlyAllocationSeries.length ? (
            <InlineBarChart data={monthlyAllocationSeries} valueFormatter={(v) => `₱${v.toLocaleString()}`} />
          ) : (
            <div className="muted" style={{ marginTop: 6 }}>
              No monthly allocation trend yet.
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your contributions</h2>
=======
        <section className="card donor-impact-history">
          <h2 className="donor-impact-section-title">Contribution history</h2>
>>>>>>> local
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
<<<<<<< jaewon-dev
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

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Allocation mapping by donation</h2>
          <p className="muted">Each row shows which donation was used for a specific allocation entry.</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Donation</th>
                  <th>Allocation date</th>
                  <th>Category</th>
                  <th>Allocated</th>
                  <th>Campaign</th>
                </tr>
              </thead>
              <tbody>
                {allocationLinks.map((x) => (
                  <tr key={x.impactAllocationId}>
                    <td data-label="Donation" className="muted">
                      #{x.contributionId} · {x.contributionDate} · {x.contributionType} · {x.contributionAmount ?? "—"} {x.contributionCurrency}
                    </td>
                    <td data-label="Allocation date" className="muted">{x.allocationDate}</td>
                    <td data-label="Category"><span className="badge">{x.category}</span></td>
                    <td data-label="Allocated">{x.allocationAmount} {x.allocationCurrency}</td>
                    <td data-label="Campaign" className="muted">{x.campaignName ?? "—"}</td>
                  </tr>
                ))}
                {allocationLinks.length === 0 ? (
                  <tr><td colSpan={5} className="muted">No donation-linked allocations recorded yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your impact story from allocations</h2>
          <p className="muted">A donor-friendly narrative estimate based on aggregated category allocations in your account window.</p>
          {outcomeNarratives.length ? (
            <ul className="trust-list muted">
              {outcomeNarratives.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <div className="muted">Once allocations are posted by staff, this section turns your totals into understandable outcomes.</div>
          )}
        </div>

        <div className="photo-grid" style={{ marginTop: 12 }}>
          <div className="photo-placeholder" role="img" aria-label="Impact activities and donor-backed services">
            <img src="/photos/community-support.jpg" alt="Donor-backed support and community aid." />
            <div className="caption">Your support in action</div>
          </div>
          <div className="photo-placeholder" role="img" aria-label="Trauma-informed support services">
            <img src="/photos/counseling-support.jpg" alt="Trauma-informed counseling and support session." />
            <div className="caption">Trauma-informed support services</div>
          </div>
          <div className="photo-placeholder" role="img" aria-label="Recovery milestones and hope">
            <img src="/photos/education-support.jpg" alt="Education and reintegration support milestones." />
            <div className="caption">Recovery milestones and hope</div>
          </div>
        </div>
=======
        </section>
>>>>>>> local
      </div>
    </RequireRole>
  );
}
