import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";

type Supporter = {
  supporterId: number;
  fullName: string;
  email: string | null;
  supporterType: string;
  isActive: boolean;
};

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };

export function DonorsPage() {
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Paged<Supporter> | null>(null);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [contribs, setContribs] = useState<Paged<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const res = await apiFetch<Paged<Supporter>>(`/api/supporters?q=${encodeURIComponent(q)}`, {
      token: auth.token ?? undefined,
    });
    setData(res);
  };

  const loadContribs = async (supporterId: number) => {
    const res = await apiFetch<Paged<any>>(`/api/contributions?supporterId=${supporterId}`, {
      token: auth.token ?? undefined,
    });
    setContribs(res);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Donors & Contributions</h1>
        <p className="muted">Employees can view. Only admins can create/update/delete.</p>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="badge ok">Employee: view trends and histories</span>
          <span className="badge warn">Admin: full supporter and contribution CRUD</span>
        </div>
        {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supporters…" />
          <button className="btn" onClick={() => void load()}>
            Search
          </button>
          <RequireRole role="Admin">
            <button
              className="btn primary"
              onClick={async () => {
                const fullName = prompt("Supporter full name?");
                if (!fullName) return;
                try {
                  await apiFetch<Supporter>("/api/supporters", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      fullName,
                      email: null,
                      supporterType: "Monetary",
                      isActive: true,
                    }),
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Add supporter
            </button>
          </RequireRole>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((x) => (
                <tr key={x.supporterId}>
                  <td data-label="Name">
                    <button
                      className="btn"
                      style={{ padding: 6, borderRadius: 10, width: "auto" }}
                      onClick={async () => {
                        setSelectedSupporter(x);
                        try {
                          await loadContribs(x.supporterId);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      {x.fullName}
                    </button>
                  </td>
                  <td data-label="Email" className="muted">
                    {x.email ?? "—"}
                  </td>
                  <td data-label="Type">
                    <span className="badge">{x.supporterType}</span>
                  </td>
                  <td data-label="Status">
                    {x.isActive ? <span className="badge">Active</span> : <span className="badge">Inactive</span>}
                  </td>
                  <td data-label="Actions">
                    <RequireRole role="Admin">
                      <div className="row">
                        <button
                          className="btn"
                          onClick={async () => {
                            const nextName = prompt("New full name?", x.fullName);
                            if (!nextName) return;
                            try {
                              await apiFetch<void>(`/api/supporters/${x.supporterId}`, {
                                method: "PUT",
                                token: auth.token ?? undefined,
                                body: JSON.stringify({ ...x, fullName: nextName }),
                              });
                              await load();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (!confirm(`Delete ${x.fullName}?`)) return;
                            try {
                              await apiFetch<void>(`/api/supporters/${x.supporterId}?confirm=true`, {
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
                      </div>
                    </RequireRole>
                    {!auth.hasRole("Admin") ? <span className="muted">View only</span> : null}
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No supporters found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Contribution history</h2>
        {!selectedSupporter ? (
          <div className="muted">Select a supporter above to view their contribution history.</div>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{selectedSupporter.fullName}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Supporter ID: {selectedSupporter.supporterId}
                </div>
              </div>
              <RequireRole role="Admin">
                <button
                  className="btn primary"
                  onClick={async () => {
                    const amountStr = prompt("Monetary amount?");
                    if (!amountStr) return;
                    const amount = Number(amountStr);
                    if (!Number.isFinite(amount)) {
                      setError("Amount must be a number.");
                      return;
                    }
                    try {
                      await apiFetch<void>("/api/contributions", {
                        method: "POST",
                        token: auth.token ?? undefined,
                        body: JSON.stringify({
                          supporterId: selectedSupporter.supporterId,
                          contributionType: "Monetary",
                          amount,
                          currency: "PHP",
                          contributionDate: new Date().toISOString().slice(0, 10),
                          campaignName: null,
                          notes: null,
                        }),
                      });
                      await loadContribs(selectedSupporter.supporterId);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Add contribution
                </button>
              </RequireRole>
            </div>

            <div className="table-wrap">
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Campaign</th>
                    <th style={{ width: 160 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(contribs?.items ?? []).map((c: any) => (
                    <tr key={c.contributionId}>
                      <td data-label="Date" className="muted">
                        {c.contributionDate}
                      </td>
                      <td data-label="Type">
                        <span className="badge">{c.contributionType}</span>
                      </td>
                      <td data-label="Amount">
                        {c.amount} {c.currency}
                      </td>
                      <td data-label="Campaign" className="muted">
                        {c.campaignName ?? "—"}
                      </td>
                      <td data-label="Actions">
                        <RequireRole role="Admin">
                          <button
                            className="btn danger"
                            onClick={async () => {
                              if (!confirm("Delete this contribution?")) return;
                              try {
                                await apiFetch<void>(`/api/contributions/${c.contributionId}?confirm=true`, {
                                  method: "DELETE",
                                  token: auth.token ?? undefined,
                                });
                                await loadContribs(selectedSupporter.supporterId);
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </RequireRole>
                        {!auth.hasRole("Admin") ? <span className="muted">View only</span> : null}
                      </td>
                    </tr>
                  ))}
                  {contribs && contribs.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        No contributions found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
