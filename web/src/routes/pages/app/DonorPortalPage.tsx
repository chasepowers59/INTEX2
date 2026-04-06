import React, { useEffect, useState } from "react";
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

export function DonorPortalPage() {
  const auth = useAuth();
  const [data, setData] = useState<Paged<Contribution> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<Paged<Contribution>>("/api/donor/contributions", { token: auth.token ?? undefined });
        setData(res);
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
          {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}
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
          <h2 style={{ marginTop: 0 }}>Impact snapshot (anonymized)</h2>
          <p className="muted">
            Next step: tie donation allocations to public impact snapshots so donors can see where support was applied
            (education, wellbeing, operations, transport, maintenance, outreach).
          </p>
        </div>
      </div>
    </RequireRole>
  );
}

